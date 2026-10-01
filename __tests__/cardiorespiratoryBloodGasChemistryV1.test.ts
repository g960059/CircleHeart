import { describe, expect, it } from 'vitest';
import {
  DEFAULT_BLOOD_GAS_CHEMISTRY_V1,
  bloodGasAmountsFromPressuresV1,
  bloodGasCo2PressureBoundsV1,
  bloodGasContentsFromPressuresV1,
  bloodGasPressuresFromAmountsV1,
  bloodGasPressuresFromContentsV1,
  oxygenSaturationFromPressureAndPHV1,
  validateBloodGasContentsV1,
} from '../engine/cardiorespiratory/BloodGasChemistryV1';

describe('reduced fixed-buffer blood chemistry', () => {
  it('matches the independent standard Severinghaus anchors and whole-blood unit scale', () => {
    expect(oxygenSaturationFromPressureAndPHV1(26.86, 7.4)).toBeCloseTo(0.5, 3);
    expect(oxygenSaturationFromPressureAndPHV1(100, 7.4)).toBeCloseTo(0.9775, 4);
    const value = bloodGasContentsFromPressuresV1({ o2MmHg: 100, co2MmHg: 40 });
    expect(value.pH).toBeCloseTo(7.4, 3);
    expect(value.o2MolPerL).toBeGreaterThan(0.0088);
    expect(value.o2MolPerL).toBeLessThan(0.009);
    expect(value.co2MolPerL).toBeGreaterThan(0.019);
    expect(value.co2MolPerL).toBeLessThan(0.022);
  });
  it('derives respiratory acidosis and a Bohr right shift without changing metabolic BE', () => {
    const normal = bloodGasContentsFromPressuresV1({ o2MmHg: 40, co2MmHg: 40 });
    const hypercapnic = bloodGasContentsFromPressuresV1({ o2MmHg: 40, co2MmHg: 80 });
    expect(hypercapnic.pH).toBeLessThan(normal.pH);
    expect(hypercapnic.saturation01).toBeLessThan(normal.saturation01);
    expect(hypercapnic.bicarbonateMmolPerL).toBeGreaterThan(normal.bicarbonateMmolPerL);
  });
  it('has a Haldane effect at the same PCO2 and buffer condition', () => {
    const oxygenated = bloodGasContentsFromPressuresV1({ o2MmHg: 100, co2MmHg: 40 });
    const deoxygenated = bloodGasContentsFromPressuresV1({ o2MmHg: 10, co2MmHg: 40 });
    expect(deoxygenated.co2MolPerL).toBeGreaterThan(oxygenated.co2MolPerL);
  });
  it('round-trips coupled O2/totalCO2 including low saturation, anemia and high oxygen', () => {
    for (const hemoglobinGPerDl of [3, 15, 22]) for (const baseExcessMmolPerL of [-10, 0, 10]) {
      for (const o2MmHg of [0, 3, 30, 100, 600, 2000]) for (const co2MmHg of [25, 40, 90]) {
        const parameters = { hemoglobinGPerDl, baseExcessMmolPerL };
        const forward = bloodGasContentsFromPressuresV1({ o2MmHg, co2MmHg }, parameters);
        const inverse = bloodGasPressuresFromContentsV1(forward, parameters);
        expect(inverse.o2MmHg).toBeCloseTo(o2MmHg, 5);
        expect(inverse.co2MmHg).toBeCloseTo(co2MmHg, 6);
      }
    }
  });
  it('preserves inversion accuracy across the complete buffer domain and near both pressure bounds', () => {
    // Includes initial Newton guesses outside the feasible interval and O2 values
    // requiring the safeguarded search near either end of its pressure bracket.
    for (const hemoglobinGPerDl of [3, 7.5, 15, 22]) for (const baseExcessMmolPerL of [-10, 0, 10]) {
      const parameters = { hemoglobinGPerDl, baseExcessMmolPerL };
      const bounds = bloodGasCo2PressureBoundsV1(parameters);
      for (const fraction of [0, 1e-12, 1e-7, 0.001, 0.25, 0.75, 1 - 1e-12, 1]) {
        const co2MmHg = bounds.minimumMmHg + fraction * (bounds.maximumMmHg - bounds.minimumMmHg);
        for (const o2MmHg of [0, 1e-12, 1e-8, 0.0001, 3, 40, 100, 1000, 2000 - 1e-8, 2000]) {
          const forward = bloodGasContentsFromPressuresV1({ o2MmHg, co2MmHg }, parameters);
          const inverse = bloodGasPressuresFromContentsV1(forward, parameters);
          expect(Math.abs(inverse.o2MmHg - o2MmHg)).toBeLessThanOrEqual(8e-9);
          expect(Math.abs(inverse.co2MmHg - co2MmHg)).toBeLessThanOrEqual(2e-7);
          expect(Math.abs(inverse.o2MolPerL - forward.o2MolPerL)).toBeLessThanOrEqual(1.01e-14);
          expect(Math.abs(inverse.co2MolPerL - forward.co2MolPerL)).toBeLessThanOrEqual(1.01e-14);
        }
      }
    }
  });
  it('restricts the inverse search at the O2 ceiling without admitting or clipping impossible inventories', () => {
    for (const hemoglobinGPerDl of [3, 15, 22]) for (const baseExcessMmolPerL of [-10, 0, 10]) {
      const parameters = { hemoglobinGPerDl, baseExcessMmolPerL };
      const bounded = bloodGasContentsFromPressuresV1({ o2MmHg: 2000, co2MmHg: 40 }, parameters);
      const inverse = bloodGasPressuresFromContentsV1(bounded, parameters);
      expect(inverse.o2MmHg).toBe(2000);
      expect(inverse.co2MmHg).toBeCloseTo(40, 7);
      const withinResidualTolerance = { o2MolPerL: bounded.o2MolPerL, co2MolPerL: bounded.co2MolPerL + 5e-15 };
      expect(() => validateBloodGasContentsV1(withinResidualTolerance, parameters)).not.toThrow();
      const near = bloodGasPressuresFromContentsV1(withinResidualTolerance, parameters);
      expect(near.o2MmHg).toBe(2000);
      expect(near.co2MmHg).toBeCloseTo(40, 6);
      // At saturation the representable maximum-O2 content is a small plateau;
      // stay beyond it as well as beyond the existing CO2 residual tolerance.
      const impossible = { o2MolPerL: bounded.o2MolPerL, co2MolPerL: bounded.co2MolPerL + 1e-9 };
      expect(() => validateBloodGasContentsV1(impossible, parameters)).toThrow(RangeError);
      expect(() => bloodGasPressuresFromContentsV1(impossible, parameters)).toThrow(RangeError);
      // The global O2 ceiling remains strict, even inside the O2 solver's residual tolerance.
      const maximum = bloodGasContentsFromPressuresV1({ o2MmHg: 2000, co2MmHg: bloodGasCo2PressureBoundsV1(parameters).minimumMmHg }, parameters);
      expect(() => bloodGasPressuresFromContentsV1({ o2MolPerL: maximum.o2MolPerL + 5e-15, co2MolPerL: maximum.co2MolPerL }, parameters)).toThrow(RangeError);
    }
  });
  it('retains the declared CO2 endpoint residual tolerance and strict finite-input checks', () => {
    const parameters = DEFAULT_BLOOD_GAS_CHEMISTRY_V1;
    const bounds = bloodGasCo2PressureBoundsV1(parameters);
    for (const [co2MmHg, direction] of [[bounds.minimumMmHg, -1], [bounds.maximumMmHg, 1]]) {
      const endpoint = bloodGasContentsFromPressuresV1({ o2MmHg: 0, co2MmHg }, parameters);
      const near = { o2MolPerL: 0, co2MolPerL: endpoint.co2MolPerL + direction * 5e-15 };
      expect(bloodGasPressuresFromContentsV1(near, parameters)).toEqual(endpoint);
      const outside = { o2MolPerL: 0, co2MolPerL: endpoint.co2MolPerL + direction * 2e-14 };
      expect(() => bloodGasPressuresFromContentsV1(outside, parameters)).toThrow(RangeError);
      expect(() => validateBloodGasContentsV1(outside, parameters)).toThrow(RangeError);
    }
    for (const invalid of [-1, NaN, Infinity, -Infinity]) {
      for (const contents of [{ o2MolPerL: invalid, co2MolPerL: 0.02 }, { o2MolPerL: 0.008, co2MolPerL: invalid }]) {
        expect(() => bloodGasPressuresFromContentsV1(contents)).toThrow(RangeError);
        expect(() => validateBloodGasContentsV1(contents)).toThrow(RangeError);
      }
    }
  });
  it('uses physical mL blood only at the amount/content boundary', () => {
    const a = bloodGasAmountsFromPressuresV1(100, { o2MmHg: 100, co2MmHg: 40 });
    const b = bloodGasAmountsFromPressuresV1(200, { o2MmHg: 100, co2MmHg: 40 });
    expect(b.o2Mol).toBe(a.o2Mol * 2);
    expect(b.co2Mol).toBe(a.co2Mol * 2);
    expect(bloodGasPressuresFromAmountsV1(b, 200).o2MmHg).toBeCloseTo(100, 6);
  });
  it('rejects invalid or chemically unsupported input instead of clipping', () => {
    expect(() => bloodGasContentsFromPressuresV1({ o2MmHg: -1, co2MmHg: 40 })).toThrow();
    expect(() => bloodGasPressuresFromContentsV1({ o2MolPerL: 0.008, co2MolPerL: 0 })).toThrow();
    expect(() => bloodGasAmountsFromPressuresV1(0, { o2MmHg: 100, co2MmHg: 40 })).toThrow();
    expect(() => bloodGasContentsFromPressuresV1({ o2MmHg: 100, co2MmHg: 40 }, { ...DEFAULT_BLOOD_GAS_CHEMISTRY_V1, hemoglobinGPerDl: NaN })).toThrow();
  });
});

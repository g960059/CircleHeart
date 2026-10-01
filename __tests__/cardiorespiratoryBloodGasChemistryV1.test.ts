import { describe, expect, it } from 'vitest';
import {
  DEFAULT_BLOOD_GAS_CHEMISTRY_V1,
  bloodGasAmountsFromPressuresV1,
  bloodGasContentsFromPressuresV1,
  bloodGasPressuresFromAmountsV1,
  bloodGasPressuresFromContentsV1,
  oxygenSaturationFromPressureAndPHV1,
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

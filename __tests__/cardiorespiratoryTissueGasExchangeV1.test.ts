import { describe, expect, it } from 'vitest';
import { DEFAULT_BLOOD_GAS_CHEMISTRY_V1, bloodGasAmountsFromPressuresV1 } from '../engine/cardiorespiratory/BloodGasChemistryV1';
import { DEFAULT_TISSUE_GAS_PARAMETERS_V1, advanceTissueGasExchangeV1, initializeTissueGasStateV1, oxygenDemandMolPerSecFromMlPerMinV1 } from '../engine/cardiorespiratory/TissueGasExchangeV1';

const parameters = DEFAULT_TISSUE_GAS_PARAMETERS_V1.systemic;
const base = () => ({
  parameters,
  state: initializeTissueGasStateV1(parameters, 20, 46),
  bloodAmount: bloodGasAmountsFromPressuresV1(1000, { o2MmHg: 40, co2MmHg: 45 }),
  bloodVolumeMl: 1000,
  chemistry: DEFAULT_BLOOD_GAS_CHEMISTRY_V1,
  demandO2MolPerSec: oxygenDemandMolPerSecFromMlPerMinV1(220),
  dtSec: 0.01,
});
describe('separate effective systemic and myocardial gas pools', () => {
  it('closes each gas ledger including actual aerobic consumption and production', () => {
    const input = base();
    const result = advanceTissueGasExchangeV1(input);
    expect(result.bloodAmount.o2Mol + result.state.amount.o2Mol + result.consumedO2Mol)
      .toBeCloseTo(input.bloodAmount.o2Mol + input.state.amount.o2Mol, 14);
    expect(result.bloodAmount.co2Mol + result.state.amount.co2Mol - result.producedCo2Mol)
      .toBeCloseTo(input.bloodAmount.co2Mol + input.state.amount.co2Mol, 14);
    expect(result.producedCo2Mol).toBe(result.consumedO2Mol * 0.8);
  });
  it('exactly fulfills healthy demand without accumulating a fictitious deficit', () => {
    const result = advanceTissueGasExchangeV1(base());
    expect(result.consumedO2Mol).toBe(result.demandO2Mol);
    expect(result.unmetDemandO2Mol).toBe(0);
    expect(result.state.cumulativeUnmetO2Mol).toBe(0);
    expect(result.demandFulfillment01).toBe(1);
  });
  it('falls below demand without negative oxygen when an isolated tissue store is exhausted', () => {
    const input = base();
    const isolated = { ...parameters, o2ConductanceMolPerSecPerMmHg: 0, co2ConductanceMolPerSecPerMmHg: 0 };
    const result = advanceTissueGasExchangeV1({ ...input, parameters: isolated, state: initializeTissueGasStateV1(isolated, 0.1, 46), dtSec: 60 });
    expect(result.state.amount.o2Mol).toBeGreaterThanOrEqual(0);
    expect(result.demandFulfillment01).toBeLessThan(0.01);
    expect(result.unmetDemandO2Mol).toBeGreaterThan(0);
    expect(result.consumedO2Mol).toBeLessThanOrEqual(0.1 * parameters.o2CapacityMolPerMmHg);
  });
  it('has zero actual oxygen consumption at zero oxygen and avoids a zero-demand ratio', () => {
    const input = base();
    const isolated = { ...parameters, o2ConductanceMolPerSecPerMmHg: 0, co2ConductanceMolPerSecPerMmHg: 0 };
    const result = advanceTissueGasExchangeV1({ ...input, parameters: isolated, state: initializeTissueGasStateV1(isolated, 0, 46) });
    expect(result.consumedO2Mol).toBe(0);
    expect(advanceTissueGasExchangeV1({ ...input, demandO2MolPerSec: 0 }).demandFulfillment01).toBeNull();
  });
  it('preserves demand and inventory bounds at floating-point transitions to the healthy plateau', () => {
    const p = { ...DEFAULT_TISSUE_GAS_PARAMETERS_V1.myocardium,
      o2ConductanceMolPerSecPerMmHg: 0, co2ConductanceMolPerSecPerMmHg: 0 };
    const demandO2MolPerSec = oxygenDemandMolPerSecFromMlPerMinV1(25);
    for (const dtSec of [0.002, 0.001, 0.0005, 0.0000625]) for (const belowPlateauMol of [1e-13, 1e-15, 1e-17, 1e-20]) {
      const availableO2 = p.o2CapacityMolPerMmHg * p.fullDemandO2PressureMmHg + dtSec * demandO2MolPerSec - belowPlateauMol;
      const initial = initializeTissueGasStateV1(p, 3, 48);
      const state = { ...initial, amount: { ...initial.amount, o2Mol: availableO2 } };
      const result = advanceTissueGasExchangeV1({ ...base(), parameters: p, state, demandO2MolPerSec, dtSec });
      expect(result.consumedO2Mol).toBeLessThanOrEqual(result.demandO2Mol);
      expect(result.unmetDemandO2Mol).toBeGreaterThanOrEqual(0);
      expect(result.state.amount.o2Mol).toBeGreaterThanOrEqual(0);
      expect(result.state.amount.o2Mol + result.consumedO2Mol).toBeCloseTo(availableO2, 18);
    }
  });
  it('keeps myocardial and systemic stores distinct and rejects bed mismatches', () => {
    const heart = DEFAULT_TISSUE_GAS_PARAMETERS_V1.myocardium;
    expect(initializeTissueGasStateV1(heart, 20, 46).amount.o2Mol).not.toBe(base().state.amount.o2Mol);
    expect(() => advanceTissueGasExchangeV1({ ...base(), parameters: heart })).toThrow(/mismatch/);
  });
  it('sustains prescribed resting myocardial uptake at a maintained CV PO2 of 15 mmHg', () => {
    const parameters = DEFAULT_TISSUE_GAS_PARAMETERS_V1.myocardium;
    const bloodAmount = bloodGasAmountsFromPressuresV1(100, { o2MmHg: 15, co2MmHg: 60 });
    const run = (dtSec: number) => {
      let state = initializeTissueGasStateV1(parameters, 5, 60);
      for (let i = 0; i < Math.round(10 / dtSec); i += 1) {
        const result = advanceTissueGasExchangeV1({ parameters, state, bloodAmount, bloodVolumeMl: 100,
          chemistry: DEFAULT_BLOOD_GAS_CHEMISTRY_V1, demandO2MolPerSec: oxygenDemandMolPerSecFromMlPerMinV1(25), dtSec });
        expect(result.consumedO2Mol).toBe(result.demandO2Mol);
        state = result.state;
      }
      return state;
    };
    const coarse = run(0.02), fine = run(0.01);
    const pressure = fine.amount.o2Mol / parameters.o2CapacityMolPerMmHg;
    expect(pressure).toBeGreaterThan(5);
    expect(pressure).toBeLessThan(6);
    expect(fine.cumulativeUnmetO2Mol).toBe(0);
    expect(Math.abs(fine.amount.o2Mol - coarse.amount.o2Mol)).toBeLessThan(1e-10);
  });
  it('converges under step halving for finite closed blood/tissue exchange', () => {
    const run = (dtSec: number) => {
      let input = { ...base(), demandO2MolPerSec: 0, dtSec };
      for (let i = 0; i < Math.round(2 / dtSec); i += 1) {
        const result = advanceTissueGasExchangeV1(input);
        input = { ...input, state: result.state, bloodAmount: result.bloodAmount };
      }
      return input;
    };
    const coarse = run(0.2);
    const fine = run(0.1);
    const reference = run(0.00625);
    const error = (value: typeof coarse) => Math.abs(value.state.amount.o2Mol - reference.state.amount.o2Mol)
      + Math.abs(value.state.amount.co2Mol - reference.state.amount.co2Mol);
    expect(error(fine)).toBeLessThan(error(coarse) * 0.6);
    expect(fine.bloodAmount.o2Mol + fine.state.amount.o2Mol).toBeCloseTo(base().bloodAmount.o2Mol + base().state.amount.o2Mol, 13);
    expect(fine.bloodAmount.co2Mol + fine.state.amount.co2Mol).toBeCloseTo(base().bloodAmount.co2Mol + base().state.amount.co2Mol, 13);
  });
  it('rejects an excessive exchange trial without mutating the accepted state', () => {
    const input = base();
    const before = JSON.stringify(input);
    expect(() => advanceTissueGasExchangeV1({ ...input, dtSec: 100_000 })).toThrow(/depletes/);
    expect(JSON.stringify(input)).toBe(before);
  });
});

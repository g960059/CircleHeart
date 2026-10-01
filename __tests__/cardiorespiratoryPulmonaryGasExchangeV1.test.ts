import { describe, expect, it } from 'vitest';
import { bloodGasContentsFromPressuresV1, bloodGasAmountsFromPressuresV1, DEFAULT_BLOOD_GAS_CHEMISTRY_V1 } from '../engine/cardiorespiratory/BloodGasChemistryV1';
import { exchangePerfusedBloodWithAlveolarGasV1 } from '../engine/cardiorespiratory/PulmonaryGasExchangeV1';
const base = () => ({
  throughVolumeMl: 1,
  upstreamContent: bloodGasContentsFromPressuresV1({ o2MmHg: 40, co2MmHg: 46 }),
  alveolarPressures: { o2MmHg: 100, co2MmHg: 40 },
  alveolarAvailable: { o2Mol: 0.01, co2Mol: 0.005 },
  receivingBloodAvailable: bloodGasAmountsFromPressuresV1(100, { o2MmHg: 40, co2MmHg: 46 }),
  equilibrationFraction01: 1,
  chemistry: DEFAULT_BLOOD_GAS_CHEMISTRY_V1,
});
describe('through-flow pulmonary exchange', () => {
  it('adds O2 and removes CO2 in exact opposite amounts across the interface', () => {
    const result = exchangePerfusedBloodWithAlveolarGasV1(base());
    expect(result.bloodDeltaMol.o2Mol).toBeGreaterThan(0);
    expect(result.bloodDeltaMol.co2Mol).toBeLessThan(0);
    expect(result.bloodDeltaMol.o2Mol + result.alveolarDeltaMol.o2Mol).toBe(0);
    expect(result.bloodDeltaMol.co2Mol + result.alveolarDeltaMol.co2Mol).toBe(0);
    expect(result.equilibratedOutflowContent.o2MolPerL).toBe(bloodGasContentsFromPressuresV1({ o2MmHg: 100, co2MmHg: 40 }).o2MolPerL);
  });
  it('scales by actual through-volume and fractional equilibration, with no exchange at zero flow', () => {
    const whole = exchangePerfusedBloodWithAlveolarGasV1(base());
    const half = exchangePerfusedBloodWithAlveolarGasV1({ ...base(), equilibrationFraction01: 0.5 });
    expect(half.bloodDeltaMol.o2Mol).toBeCloseTo(whole.bloodDeltaMol.o2Mol / 2, 15);
    expect(exchangePerfusedBloodWithAlveolarGasV1({ ...base(), throughVolumeMl: 0 }).bloodDeltaMol.o2Mol).toBe(0);
  });
  it('rejects depleted alveolar or blood donors and negative through-volume', () => {
    expect(() => exchangePerfusedBloodWithAlveolarGasV1({ ...base(), alveolarAvailable: { o2Mol: 0, co2Mol: 0.005 } })).toThrow(/deplete/);
    expect(() => exchangePerfusedBloodWithAlveolarGasV1({ ...base(), receivingBloodAvailable: { o2Mol: 1, co2Mol: 0 } })).toThrow(/deplete/);
    expect(() => exchangePerfusedBloodWithAlveolarGasV1({ ...base(), throughVolumeMl: -1 })).toThrow();
  });
});

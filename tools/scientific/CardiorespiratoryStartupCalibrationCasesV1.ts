import { DEFAULT_CARDIORESPIRATORY_FIXTURE_V1 as baseline, validateAndOwnCardiorespiratoryFixtureV1 as own,
  type CardiorespiratoryFixtureV1 as Fixture } from "@/engine/cardiorespiratory/CardiorespiratoryFixtureV1";
import type { CardiorespiratorySettlementSeedV1 } from "@/engine/cardiorespiratory/CardiorespiratorySettlementStateV1";
import { cardiorespiratoryStartupPresetCasesV1 } from "./CardiorespiratoryStartupCasesV1";

export type CardiorespiratoryStartupCalibrationCaseV1 = Readonly<{
  caseId: string; coverage: string; sourcePresetId: string | null;
  fixture: Fixture; seed?: CardiorespiratorySettlementSeedV1;
}>;
type Mutable<T> = { -readonly [K in keyof T]: Mutable<T[K]> };

/** A fixed, inspectable coverage matrix, not a sample of patients or a fitted
 * physiological distribution. Production cases contribute parameters only;
 * their immutable checkpoints, publication and teaching claims are unchanged. */
export async function cardiorespiratoryStartupCalibrationCasesV1(root: string): Promise<readonly CardiorespiratoryStartupCalibrationCaseV1[]> {
  const cases: CardiorespiratoryStartupCalibrationCaseV1[] = (await cardiorespiratoryStartupPresetCasesV1(root)).map(c => ({ ...c,
    coverage: c.sourcePresetId ? "inherited-production-parameters-cold-dev-gases" : "default-pcv" }));
  const add = (caseId: string, coverage: string, change: (fixture: Mutable<Fixture>) => void, seed?: CardiorespiratorySettlementSeedV1) => {
    const fixture = structuredClone(baseline) as Mutable<Fixture>; change(fixture);
    cases.push({ caseId, coverage, sourcePresetId: null, fixture: own(fixture), ...(seed ? { seed } : {}) });
  };
  add("pcv-hr83.3-rr13.7", "fractional-cardiac-respiratory-forcing", f => {
    f.hemodynamicResearchInputs.heartRateBpm = 83.3; f.cardiorespiratory.respiratory.ventilator.respiratoryRatePerMin = 13.7;
  });
  add("vcv-baseline", "volume-controlled-ventilation", f => { f.cardiorespiratory.respiratory.ventilator.mode = "vcv"; });
  add("vcv-hr91-rr17", "volume-control-noncommensurate-forcing", f => {
    f.hemodynamicResearchInputs.heartRateBpm = 91;
    f.cardiorespiratory.respiratory.ventilator.mode = "vcv"; f.cardiorespiratory.respiratory.ventilator.respiratoryRatePerMin = 17;
  });
  add("spontaneous-hr83-rr13", "muscle-driven-breathing", f => {
    f.hemodynamicResearchInputs.heartRateBpm = 83;
    const r = f.cardiorespiratory.respiratory;
    r.ventilator.mode = "spontaneous"; r.ventilator.peepCmH2O = 0; f.hemodynamicResearchInputs.peepCmH2O = 0;
    r.muscle.amplitudeCmH2O = 7; r.muscle.respiratoryRatePerMin = 13;
  });
  add("pcv-plus-effort-rr12-15.3", "independent-controlled-and-muscle-forcing", f => {
    f.cardiorespiratory.respiratory.muscle.amplitudeCmH2O = 3;
    f.cardiorespiratory.respiratory.muscle.respiratoryRatePerMin = 15.3;
  });
  add("fio2-0.4", "inspired-gas-construction", f => { f.cardiorespiratory.respiratory.inspiredGasFractions = { o2: .4, co2: 0, inert: .6 }; });
  add("hemoglobin-7.5", "blood-oxygen-capacity", f => { f.cardiorespiratory.bloodGas.hemoglobinGPerDl = 7.5; });
  add("heterogeneous-lung", "unequal-regional-mechanics", f => {
    const unit = f.cardiorespiratory.respiratory.units[1]; unit.elastanceCmH2OPerL = 30; unit.resistanceCmH2OSPerL = 40;
  });
  for (const sign of [-1, 1]) add(`cold-gas-${sign < 0 ? "lower" : "upper"}`, "initial-gas-inventory-offset", () => {}, {
    systemicGasPressureOffsetMmHg: { o2: 5 * sign, co2: 10 * sign },
    myocardialGasPressureOffsetMmHg: { o2: 5 * sign, co2: 10 * sign },
    bloodGasPressureOffsetMmHg: { o2: 2 * sign, co2: 2 * sign },
  });
  return cases;
}

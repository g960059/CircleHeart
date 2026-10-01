import { DEFAULT_RESPIRATORY_MECHANICS_CONFIG_V1, validateRespiratoryMechanicsConfigV1,
  type RespiratoryMechanicsConfigV1 } from "./RespiratoryMechanicsV1";
import { DEFAULT_BLOOD_GAS_CHEMISTRY_V1, validateBloodGasChemistryV1,
  type BloodGasChemistryParametersV1 } from "./BloodGasChemistryV1";
import { MAIN_WIRE_STANDARD71_BASELINE_HEMODYNAMIC_INPUTS_V1, MAIN_WIRE_STANDARD71_BASELINE_MECHANISM_INPUTS_V1 }
  from "@/engine/myocardium/experiments/MainWireIntegratedModelStandard71FixtureV1";
import { validateAndOwnMainWireIntegratedModelHemodynamicResearchInputsV3,
  type MainWireIntegratedModelHemodynamicResearchInputsV3 } from "@/engine/myocardium/MainWireIntegratedModelHemodynamicResearchInputsV3";
import { validateAndOwnMainWireIntegratedModelMechanismResearchInputsV3,
  type MainWireIntegratedModelMechanismResearchInputsV3 } from "@/engine/myocardium/MainWireIntegratedModelMechanismResearchInputsV3";
import { resolveMainWireStaticCaseAnatomyV1, type MainWireStaticCaseAnatomyIdV1 }
  from "@/engine/myocardium/mechanics/MainWireStaticCaseAnatomyV1";

import { CARDIORESPIRATORY_FIXTURE_SCHEMA_ID_V1 } from "@/domain/model/CardiorespiratoryIdentityV1";
export { CARDIORESPIRATORY_DEV_MODEL_ID_V1, CARDIORESPIRATORY_FIXTURE_SCHEMA_ID_V1 } from "@/domain/model/CardiorespiratoryIdentityV1";
export type CardiorespiratoryConfigurationV1 = Readonly<{
  respiratory: RespiratoryMechanicsConfigV1;
  bloodGas: BloodGasChemistryParametersV1;
  systemicDemandMlMin: number;
  myocardialDemandMlMin: number;
  respiratoryQuotient: number;
  /** Per-path resistance; identical 0.06 paths give 0.03 in parallel. */
  pulmonaryReferenceResistanceMmHgSecPerMl: readonly [number, number];
  pulmonaryVolumeResistanceGain: number;
  pulmonaryEquilibrationFraction01: readonly [number, number];
}>;
export type CardiorespiratoryFixtureV1 = Readonly<{
  schemaId: typeof CARDIORESPIRATORY_FIXTURE_SCHEMA_ID_V1;
  anatomyId: MainWireStaticCaseAnatomyIdV1;
  rhythm: Readonly<{ mode: "regular-sinus-v3" }>;
  coronary: Readonly<{ topologyProfile: "coronary-network-v2" }>;
  dynamicMechanicalSupport: Readonly<{ mode: "all-off-zero-inertance-v3" }>;
  hemodynamicResearchInputs: MainWireIntegratedModelHemodynamicResearchInputsV3;
  mechanismResearchInputs: MainWireIntegratedModelMechanismResearchInputsV3;
  cardiorespiratory: CardiorespiratoryConfigurationV1;
}>;
export const CARDIORESPIRATORY_DEMAND_LIMITS_ML_MIN_V1 = Object.freeze({ systemic: 2000, myocardium: 250 });
export const DEFAULT_CARDIORESPIRATORY_FIXTURE_V1: CardiorespiratoryFixtureV1 = {
  schemaId: CARDIORESPIRATORY_FIXTURE_SCHEMA_ID_V1, anatomyId: "baseline-v1",
  rhythm: { mode: "regular-sinus-v3" }, coronary: { topologyProfile: "coronary-network-v2" },
  dynamicMechanicalSupport: { mode: "all-off-zero-inertance-v3" },
  hemodynamicResearchInputs: { ...MAIN_WIRE_STANDARD71_BASELINE_HEMODYNAMIC_INPUTS_V1,
    peepCmH2O: DEFAULT_RESPIRATORY_MECHANICS_CONFIG_V1.ventilator.peepCmH2O },
  mechanismResearchInputs: MAIN_WIRE_STANDARD71_BASELINE_MECHANISM_INPUTS_V1,
  cardiorespiratory: { respiratory: DEFAULT_RESPIRATORY_MECHANICS_CONFIG_V1,
    bloodGas: DEFAULT_BLOOD_GAS_CHEMISTRY_V1, systemicDemandMlMin: 225,
    myocardialDemandMlMin: 25, respiratoryQuotient: 0.8,
    pulmonaryReferenceResistanceMmHgSecPerMl: [0.06, 0.06],
    pulmonaryVolumeResistanceGain: 1, pulmonaryEquilibrationFraction01: [1, 1] },
};

function finiteRange(x: number, lo: number, hi: number, name: string) {
  if (!Number.isFinite(x) || x < lo || x > hi) throw new Error(`Invalid ${name}`);
}
export function validateAndOwnCardiorespiratoryFixtureV1(value: unknown): CardiorespiratoryFixtureV1 {
  const f = structuredClone(value) as CardiorespiratoryFixtureV1;
  if (!f || f.schemaId !== CARDIORESPIRATORY_FIXTURE_SCHEMA_ID_V1
    || f.rhythm?.mode !== "regular-sinus-v3" || f.coronary?.topologyProfile !== "coronary-network-v2"
    || f.dynamicMechanicalSupport?.mode !== "all-off-zero-inertance-v3") throw new Error("Invalid cardiorespiratory fixture");
  const keys = ["schemaId", "anatomyId", "rhythm", "coronary", "dynamicMechanicalSupport", "hemodynamicResearchInputs", "mechanismResearchInputs", "cardiorespiratory"];
  if (Object.keys(f).length !== keys.length || keys.some(k => !Object.hasOwn(f, k))) throw new Error("Cardiorespiratory fixture keys differ");
  resolveMainWireStaticCaseAnatomyV1(f.anatomyId);
  validateAndOwnMainWireIntegratedModelHemodynamicResearchInputsV3(f.hemodynamicResearchInputs);
  validateAndOwnMainWireIntegratedModelMechanismResearchInputsV3(f.mechanismResearchInputs);
  const c = f.cardiorespiratory;
  validateRespiratoryMechanicsConfigV1(c.respiratory);
  validateBloodGasChemistryV1(c.bloodGas);
  finiteRange(c.systemicDemandMlMin, 0, CARDIORESPIRATORY_DEMAND_LIMITS_ML_MIN_V1.systemic, "systemic demand");
  finiteRange(c.myocardialDemandMlMin, 0, CARDIORESPIRATORY_DEMAND_LIMITS_ML_MIN_V1.myocardium, "myocardial demand");
  finiteRange(c.respiratoryQuotient, 0.5, 1.2, "respiratory quotient");
  finiteRange(c.pulmonaryVolumeResistanceGain, 0, 20, "lung volume resistance gain");
  if (c.pulmonaryReferenceResistanceMmHgSecPerMl.length !== 2 || c.pulmonaryEquilibrationFraction01.length !== 2) throw new Error("Exactly two pulmonary paths required");
  c.pulmonaryReferenceResistanceMmHgSecPerMl.forEach(x => finiteRange(x, 0.001, 10, "pulmonary path resistance"));
  c.pulmonaryEquilibrationFraction01.forEach(x => finiteRange(x, 0, 1, "equilibration fraction"));
  if (f.hemodynamicResearchInputs.peepCmH2O !== c.respiratory.ventilator.peepCmH2O) throw new Error("PEEP aliases disagree");
  return deepFreeze(f);
}
function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object") { Object.values(value).forEach(deepFreeze); Object.freeze(value); }
  return value;
}

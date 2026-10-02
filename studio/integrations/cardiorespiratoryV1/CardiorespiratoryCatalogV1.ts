import type { ControlDefinitionV2, SignalOutputDefinitionV2 } from "@/studio/contracts/v2/model";

export { CARDIORESPIRATORY_DEV_MODEL_ID_V1, CARDIORESPIRATORY_FIXTURE_SCHEMA_ID_V1 as CARDIORESPIRATORY_DEV_FIXTURE_SCHEMA_ID_V1 } from "@/domain/model/CardiorespiratoryIdentityV1";
const prefix = "cardiorespiratory";
export const CARDIORESPIRATORY_OUTPUT_IDS_V1 = Object.freeze({
  phase: `${prefix}.phase`, breathIndex: `${prefix}.breath-index`,
  airwayPressure: `${prefix}.pressure.airway`, pleuralPressure: `${prefix}.pressure.pleural`, musclePressure: `${prefix}.pressure.muscle`,
  alveolarPressure1: `${prefix}.pressure.alveolar.1`, alveolarPressure2: `${prefix}.pressure.alveolar.2`,
  transpulmonaryPressure1: `${prefix}.pressure.transpulmonary.1`, transpulmonaryPressure2: `${prefix}.pressure.transpulmonary.2`,
  lungVolume: `${prefix}.volume.lung`, unitVolume1: `${prefix}.volume.unit.1`, unitVolume2: `${prefix}.volume.unit.2`,
  airwayFlow: `${prefix}.flow.airway`, unitFlow1: `${prefix}.flow.unit.1`, unitFlow2: `${prefix}.flow.unit.2`,
  alveolarO21: `${prefix}.gas.pressure.alveolar-o2.1`, alveolarO22: `${prefix}.gas.pressure.alveolar-o2.2`,
  alveolarCo21: `${prefix}.gas.pressure.alveolar-co2.1`, alveolarCo22: `${prefix}.gas.pressure.alveolar-co2.2`,
  arterialO2: `${prefix}.gas.pressure.arterial-o2`, arterialCo2: `${prefix}.gas.pressure.arterial-co2`,
  venousO2: `${prefix}.gas.pressure.mixed-venous-o2`, venousCo2: `${prefix}.gas.pressure.mixed-venous-co2`,
  arterialSaturation: `${prefix}.gas.saturation.arterial-o2`, venousSaturation: `${prefix}.gas.saturation.mixed-venous-o2`,
  arterialPh: `${prefix}.gas.ph.arterial`, venousPh: `${prefix}.gas.ph.mixed-venous`,
  oxygenDelivery: `${prefix}.oxygen.delivery`, oxygenDemand: `${prefix}.oxygen.demand`, oxygenConsumption: `${prefix}.oxygen.consumption`,
  demandMetFraction: `${prefix}.oxygen.demand-met-fraction`, myocardialDemand: `${prefix}.oxygen.myocardial-demand`,
  myocardialConsumption: `${prefix}.oxygen.myocardial-consumption`, pressureLimited: `${prefix}.ventilator.pressure-limited`,
  pulmonaryFlow1: `${prefix}.flow.perfusion.1`, pulmonaryFlow2: `${prefix}.flow.perfusion.2`,
  recruitmentOpen1: `${prefix}.lung.open.1`, recruitmentOpen2: `${prefix}.lung.open.2`,
  systemicTissueO2: `${prefix}.tissue.oxygen-pressure.systemic`, myocardialTissueO2: `${prefix}.tissue.oxygen-pressure.myocardium`,
  totalO2Store: `${prefix}.inventory.oxygen`, totalCo2Store: `${prefix}.inventory.carbon-dioxide`,
  oxygenBalanceResidual: `${prefix}.balance.oxygen`, co2BalanceResidual: `${prefix}.balance.carbon-dioxide`,
  arterialContent: `${prefix}.gas.content.arterial-o2`, venousContent: `${prefix}.gas.content.mixed-venous-o2`,
  controlledVentilation: `${prefix}.ventilator.controlled`, muscleActive: `${prefix}.muscle.active`,
});
export type CardiorespiratoryOutputKeyV1 = keyof typeof CARDIORESPIRATORY_OUTPUT_IDS_V1;
const unit = (key: CardiorespiratoryOutputKeyV1): string => {
  if (key.endsWith("Pressure") || key.startsWith("alveolarPressure") || key.startsWith("transpulmonaryPressure")) return "cmH2O";
  if (key.includes("Volume")) return "L";
  if (key.startsWith("pulmonaryFlow")) return "mL/s";
  if (key.endsWith("TissueO2")) return "mmHg";
  if (key.endsWith("Store") || key.endsWith("Residual")) return "mol";
  if (key.endsWith("Content")) return "mL/dL";
  if (key.includes("Flow")) return "L/s";
  if (["arterialO2", "arterialCo2", "venousO2", "venousCo2", "alveolarO21", "alveolarO22", "alveolarCo21", "alveolarCo22"].includes(key)) return "mmHg";
  if (["oxygenDelivery", "oxygenDemand", "oxygenConsumption", "myocardialDemand", "myocardialConsumption"].includes(key)) return "mL O2/min";
  return "1";
};
export const CARDIORESPIRATORY_PRIMITIVE_SIGNALS_V1: readonly SignalOutputDefinitionV2[] = Object.freeze(
  Object.entries(CARDIORESPIRATORY_OUTPUT_IDS_V1).map(([key, outputId]) => Object.freeze({
    outputId, kind: "signal" as const, unit: unit(key as CardiorespiratoryOutputKeyV1), significantDigits: 3,
    shape: "scalar" as const, sampling: "accepted-step" as const,
  })),
);

export type CardiorespiratoryControlBindingV1 = Readonly<{
  definition: ControlDefinitionV2;
  /** Path relative to fixture.cardiorespiratory. */
  path: readonly (string | number)[];
  transform?: "ventilator-mode" | "inspired-o2-and-inert" | "recruitment-preset";
}>;
function control(id: string, path: readonly (string | number)[], unit: string, minimum: number, maximum: number, step: number,
  defaultValue: number, options: { cold?: boolean; transform?: CardiorespiratoryControlBindingV1["transform"] } = {}): CardiorespiratoryControlBindingV1 {
  return Object.freeze({ definition: Object.freeze({ controlId: `${prefix}.${id}`, valueType: "number", unit, minimum, maximum, step, defaultValue,
    changeSemantics: options.cold ? "cold-restart" : "accepted-state-warm-start" }), path: Object.freeze(path),
    ...(options.transform ? { transform: options.transform } : {}) });
}
export const CARDIORESPIRATORY_CONTROL_BINDINGS_V1 = Object.freeze([
  control("ventilator.mode", ["respiratory", "ventilator", "mode"], "1", 0, 2, 1, 1, { transform: "ventilator-mode" }),
  control("ventilator.rate", ["respiratory", "ventilator", "respiratoryRatePerMin"], "1/min", 4, 40, 1, 12),
  control("ventilator.inspiratory-time", ["respiratory", "ventilator", "inspiratoryTimeSec"], "s", .2, 3, .1, 1),
  control("ventilator.peep", ["respiratory", "ventilator", "peepCmH2O"], "cmH2O", 0, 20, 1, 5),
  control("ventilator.pressure-control", ["respiratory", "ventilator", "pressureControlAbovePeepCmH2O"], "cmH2O", 0, 30, 1, 10),
  control("ventilator.tidal-volume", ["respiratory", "ventilator", "tidalVolumeL"], "L", .1, 1, .025, .5),
  control("ventilator.pressure-limit", ["respiratory", "ventilator", "pressureLimitCmH2O"], "cmH2O", 10, 60, 1, 40),
  control("ventilator.inspiratory-hold", ["respiratory", "ventilator", "inspiratoryHoldSec"], "s", 0, 2, .1, 0),
  control("muscle.pressure", ["respiratory", "muscle", "amplitudeCmH2O"], "cmH2O", 0, 20, 1, 0),
  control("muscle.rate", ["respiratory", "muscle", "respiratoryRatePerMin"], "1/min", 4, 40, 1, 12),
  control("airway.deadspace", ["respiratory", "conductingDeadspaceVolumeL"], "L", 0, .5, .01, .15, { cold: true }),
  control("chest-wall.elastance", ["respiratory", "chestWall", "elastanceCmH2OPerL"], "cmH2O/L", 1, 30, 1, 5),
  ...[0, 1].flatMap(index => [
    control(`lung.${index + 1}.elastance`, ["respiratory", "units", index, "elastanceCmH2OPerL"], "cmH2O/L", 2, 60, 1, 10),
    control(`lung.${index + 1}.overdistension`, ["respiratory", "units", index, "overdistensionCmH2O"], "cmH2O", 0, 50, 1, 0),
    control(`lung.${index + 1}.recruitment-preset`, ["respiratory", "units", index, "recruitment"], "1", 0, 2, 1, 0, { transform: "recruitment-preset" }),
    control(`lung.${index + 1}.perfusion-resistance`, ["pulmonaryReferenceResistanceMmHgSecPerMl", index], "mmHg s/mL", .001, .5, .001, .06),
    control(`lung.${index + 1}.equilibration`, ["pulmonaryEquilibrationFraction01", index], "1", 0, 1, .05, 1),
    control(`lung.${index + 1}.resistance`, ["respiratory", "units", index, "resistanceCmH2OSPerL"], "cmH2O s/L", 1, 100, 1, 10),
  ]),
  control("lung.volume-resistance-gain", ["pulmonaryVolumeResistanceGain"], "1", 0, 20, .1, 1),
  control("gas.respiratory-quotient", ["respiratoryQuotient"], "1", .5, 1.2, .05, .8),
  control("gas.inspired-o2", ["respiratory", "inspiredGasFractions", "o2"], "1", .21, 1, .01, .21, { transform: "inspired-o2-and-inert" }),
  control("gas.hemoglobin", ["bloodGas", "hemoglobinGPerDl"], "g/dL", 3, 22, .1, 15, { cold: true }),
  control("oxygen.systemic-demand", ["systemicDemandMlMin"], "mL O2/min", 0, 600, 5, 225),
  control("oxygen.myocardial-demand", ["myocardialDemandMlMin"], "mL O2/min", 0, 100, 1, 25),
]);
export const CARDIORESPIRATORY_PRIMITIVE_CONTROLS_V1 = Object.freeze(CARDIORESPIRATORY_CONTROL_BINDINGS_V1.map(binding => binding.definition));

/** Detached fixture patch; the exact owner validates the complete edited tuple
 * and accounts for material interventions before accepting it. */
export function patchCardiorespiratoryControlV1<T extends object>(config: T, controlId: string, value: number): T {
  const binding = CARDIORESPIRATORY_CONTROL_BINDINGS_V1.find(b => b.definition.controlId === controlId);
  if (!binding) throw new Error(`Unknown cardiorespiratory control ${controlId}`);
  const d = binding.definition;
  if (!Number.isFinite(value) || value < d.minimum || value > d.maximum) throw new RangeError(`Invalid value for ${controlId}`);
  if ((binding.transform === "ventilator-mode" || binding.transform === "recruitment-preset") && !Number.isInteger(value)) throw new RangeError("Ventilator mode must be an integer");
  const result = structuredClone(config), keys = binding.path;
  let record = result as Record<string | number, unknown>;
  for (const key of keys.slice(0, -1)) {
    const next = record[key]; if (!next || typeof next !== "object") throw new Error(`Missing control path ${controlId}`);
    record = next as typeof record;
  }
  record[keys.at(-1)!] = binding.transform === "ventilator-mode" ? ["spontaneous", "pcv", "vcv"][value] : value;
  if (binding.transform === "recruitment-preset") record[keys.at(-1)!] = value === 0 ? null : { openingTranspulmonaryPressureCmH2O: value === 1 ? 10 : 15, closingTranspulmonaryPressureCmH2O: value === 1 ? 3 : 5, openingTimeSec: .3, closingTimeSec: .3 };
  if (binding.transform === "inspired-o2-and-inert") record.inert = 1 - value - Number(record.co2 ?? 0);
  return result;
}

/** UI projection of the same semantic bindings used by the exact reducer. */
export function readCardiorespiratoryControlValueV1(config: unknown, controlId: string): number | undefined {
  const binding = CARDIORESPIRATORY_CONTROL_BINDINGS_V1.find(b => b.definition.controlId === controlId);
  if (!binding) return undefined;
  let value: unknown = config;
  for (const key of binding.path) {
    if (value === null || typeof value !== "object") return undefined;
    value = (value as Record<string | number, unknown>)[key];
  }
  if (binding.transform === "ventilator-mode") return value === "spontaneous" ? 0 : value === "pcv" ? 1 : value === "vcv" ? 2 : undefined;
  if (binding.transform === "recruitment-preset") {
    if (value === null) return 0;
    if (!value || typeof value !== "object") return undefined;
    const v = value as Record<string, unknown>;
    if (v.openingTimeSec !== .3 || v.closingTimeSec !== .3) return undefined;
    return v.openingTranspulmonaryPressureCmH2O === 10 && v.closingTranspulmonaryPressureCmH2O === 3 ? 1
      : v.openingTranspulmonaryPressureCmH2O === 15 && v.closingTranspulmonaryPressureCmH2O === 5 ? 2 : undefined;
  }
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

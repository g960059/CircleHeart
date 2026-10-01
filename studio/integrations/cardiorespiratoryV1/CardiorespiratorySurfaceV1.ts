import { CARDIORESPIRATORY_BREATH_DERIVATION_V1 as breathMetrics } from "@/analysis/methods/cardiorespiratory/CardiorespiratoryBreathMetricsV1";
import inherited from "@/studio/integrations/mainWireIntegratedV3/MainWireIntegratedStudioStaticCaseSurfaceV5";
import { CARDIORESPIRATORY_OUTPUT_IDS_V1 as outputs, CARDIORESPIRATORY_PRIMITIVE_SIGNALS_V1, CARDIORESPIRATORY_PRIMITIVE_CONTROLS_V1 } from "./CardiorespiratoryCatalogV1";
import { CARDIORESPIRATORY_VARIATION_DERIVATION_V1 as variation } from "@/analysis/methods/cardiorespiratory/CardiorespiratoryVariationV1";
import { controlCapabilityV1, derivationCapabilityV1, outputCapabilityV1, type ModelSurfaceGraphDefinitionV1,
  type ModelSurfaceReleaseManifestV1 } from "@/studio/contracts/v2/modelSurface";

function sweep(graphId: string, series: Readonly<Record<string, string>>): ModelSurfaceGraphDefinitionV1 {
  return Object.freeze({ graphId: `cardiorespiratory.${graphId}`, renderer: "sweep", seriesCatalog: Object.freeze(Object.entries(series).map(([seriesId, outputId]) =>
    Object.freeze({ kind: "scalar" as const, seriesId, outputId }))), defaultSeriesIds: Object.freeze(Object.keys(series)),
    requiredCapabilities: Object.freeze(Object.values(series).map(outputCapabilityV1)) });
}
function xy(graphId: string, series: readonly [string, string, string][]): ModelSurfaceGraphDefinitionV1 {
  return Object.freeze({ graphId: `cardiorespiratory.${graphId}`, renderer: "xy", seriesCatalog: Object.freeze(series.map(([seriesId, xOutputId, yOutputId]) =>
    Object.freeze({ kind: "xy" as const, seriesId, xOutputId, yOutputId, cyclePhaseOutputId: outputs.phase }))), defaultSeriesIds: Object.freeze(series.map(s => s[0])),
    requiredCapabilities: Object.freeze([...new Set([outputs.phase, ...series.flatMap(s => s.slice(1))])].map(outputCapabilityV1)) });
}
export const CARDIORESPIRATORY_GRAPHS_V1 = Object.freeze([
  sweep("pressures", { Paw: outputs.airwayPressure, Ppl: outputs.pleuralPressure, Palv1: outputs.alveolarPressure1, Palv2: outputs.alveolarPressure2 }),
  sweep("airflow", { Airway: outputs.airwayFlow, Unit1: outputs.unitFlow1, Unit2: outputs.unitFlow2 }),
  sweep("lung-volumes", { Lung: outputs.lungVolume, Unit1: outputs.unitVolume1, Unit2: outputs.unitVolume2 }),
  sweep("blood-gas-pressures", { PaO2: outputs.arterialO2, PaCO2: outputs.arterialCo2, PvO2: outputs.venousO2, PvCO2: outputs.venousCo2 }),
  sweep("oxygen-saturations", { SaO2: outputs.arterialSaturation, SvO2: outputs.venousSaturation }),
  sweep("oxygen-supply-demand", { DO2: outputs.oxygenDelivery, Demand: outputs.oxygenDemand, Consumption: outputs.oxygenConsumption }),
  sweep("pulmonary-perfusion", { Unit1: outputs.pulmonaryFlow1, Unit2: outputs.pulmonaryFlow2 }),
  sweep("tissue-oxygen-pressure", { Systemic: outputs.systemicTissueO2, Myocardium: outputs.myocardialTissueO2 }),
  sweep("gas-inventory", { O2: outputs.totalO2Store, CO2: outputs.totalCo2Store }),
  sweep("gas-balance", { O2: outputs.oxygenBalanceResidual, CO2: outputs.co2BalanceResidual }),
  sweep("myocardial-demand-consumption", { Demand: outputs.myocardialDemand, Consumption: outputs.myocardialConsumption }),
  xy("lung-pressure-volume", [["Lung", outputs.lungVolume, outputs.airwayPressure]]),
  xy("unit-transpulmonary-pressure-volume", [["Unit1", outputs.unitVolume1, outputs.transpulmonaryPressure1], ["Unit2", outputs.unitVolume2, outputs.transpulmonaryPressure2]]),
  xy("flow-volume", [["Airway", outputs.lungVolume, outputs.airwayFlow]]),
]);

/** Local development projection. Production remains immutable. The exact
 * adapter must report explicit ineligibility for inherited periodic-PVA
 * requests under respiration; their pinned semantics are never relaxed. */
export const CARDIORESPIRATORY_SURFACE_COMPATIBILITY_V1 = Object.freeze({
  inheritedSurfaceReleaseId: inherited.surfaceReleaseId,
  inheritedCatalogs: "all-existing-items-and-analysis-pins-retained",
  periodicPva: "unsupported-under-breathing-return-explicit-unavailable",
  inheritedOxygen: "legacy-steady-fick-estimate-distinct-from-dynamic-gas-state",
  inheritedPeep: "alias-to-ventilator-peep-with-both-fixture-values-updated-atomically",
});
export default Object.freeze({ ...inherited,
  surfaceReleaseId: "circleheart.cardiorespiratory-dev.surface-v1",
  surfaceSeriesId: "circleheart.cardiorespiratory-dev.surface",
  predecessorSurfaceReleaseId: null, displayName: "Cardiorespiratory development",
  exposedExactOutputIds: Object.freeze([...inherited.exposedExactOutputIds, ...CARDIORESPIRATORY_PRIMITIVE_SIGNALS_V1.map(output => output.outputId)]),
  controlCatalog: Object.freeze([...inherited.controlCatalog, ...CARDIORESPIRATORY_PRIMITIVE_CONTROLS_V1.map(control => Object.freeze({
    controlId: control.controlId, preferredPresentation: (control.controlId.endsWith(".mode") || control.controlId.endsWith(".recruitment-preset")) ? "buttons" as const : "slider" as const,
    requiredCapabilities: Object.freeze([controlCapabilityV1(control.controlId)]),
  }))]),
  derivedOutputCatalog: Object.freeze([...inherited.derivedOutputCatalog, ...[variation, breathMetrics].flatMap(method => method.outputs.map(output => Object.freeze({ ...output,
    derivationId: method.derivationId, significantDigits: 3,
    requiredCapabilities: Object.freeze([derivationCapabilityV1(method.derivationId), ...output.dependencies.map(outputCapabilityV1)]),
  })))]),
  graphCatalog: Object.freeze([...inherited.graphCatalog, ...CARDIORESPIRATORY_GRAPHS_V1]),
}) satisfies ModelSurfaceReleaseManifestV1;

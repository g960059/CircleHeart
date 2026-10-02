import { CARDIORESPIRATORY_BREATH_DERIVATION_V1 as breathMetrics } from "@/analysis/methods/cardiorespiratory/CardiorespiratoryBreathMetricsV1";
import inherited from "@/studio/integrations/mainWireIntegratedV3/MainWireIntegratedStudioStaticCaseSurfaceV5";
import { CARDIORESPIRATORY_MECHANICAL_ANALYSIS_V1_ID as mechanicalAnalysis, CARDIORESPIRATORY_MECHANICAL_PVA_V1_ID as mechanicalPva } from "@/analysis/methods/cardiorespiratory/CardiorespiratoryMechanicalAnalysisV1";
import { MAIN_WIRE_PERIODIC_PVA_METHOD_V16_ID as inheritedPva } from "@/analysis/methods/mainWire/MainWirePeriodicPvaV1";
import { MAIN_WIRE_PRESSURE_CROSSING_PV_ANALYSIS_V1_ID as inheritedAnalysis } from "@/analysis/methods/mainWire/MainWireStructuralAnalysisContractV3";
import { CARDIORESPIRATORY_OUTPUT_IDS_V1 as outputs, CARDIORESPIRATORY_PRIMITIVE_SIGNALS_V1, CARDIORESPIRATORY_PRIMITIVE_CONTROLS_V1 } from "./CardiorespiratoryCatalogV1";
import { CARDIORESPIRATORY_VARIATION_DERIVATION_V1 as variation } from "@/analysis/methods/cardiorespiratory/CardiorespiratoryVariationV1";
import { analysisCapabilityV1, controlCapabilityV1, derivationCapabilityV1, outputCapabilityV1, type ModelSurfaceGraphDefinitionV1,
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

/** The catalog is inherited; the resting-only source/PVA pins are explicitly
 * replaced by a fixed respiratory mechanical experiment with the same outputs.
 * Production and breathing-continuation semantics remain separate. */
export const CARDIORESPIRATORY_SURFACE_COMPATIBILITY_V1 = Object.freeze({
  inheritedSurfaceReleaseId: inherited.surfaceReleaseId,
  inheritedCatalogs: "all-existing-items-retained",
  periodicPva: "explicit-fixed-respiratory-mechanical-protocol-and-pva-substitution",
  inheritedOxygen: "legacy-steady-fick-estimate-distinct-from-dynamic-gas-state",
  inheritedPeep: "alias-to-ventilator-peep-with-both-fixture-values-updated-atomically",
});
const mechanicalCapability = (capability: string) => capability === analysisCapabilityV1(inheritedAnalysis)
  ? analysisCapabilityV1(mechanicalAnalysis) : capability === derivationCapabilityV1(inheritedPva)
    ? derivationCapabilityV1(mechanicalPva) : capability;
export default Object.freeze({ ...inherited,
  surfaceReleaseId: "circleheart.cardiorespiratory-dev.surface-v1",
  surfaceSeriesId: "circleheart.cardiorespiratory-dev.surface",
  predecessorSurfaceReleaseId: null, displayName: "Cardiorespiratory development",
  exposedExactOutputIds: Object.freeze([...inherited.exposedExactOutputIds, ...CARDIORESPIRATORY_PRIMITIVE_SIGNALS_V1.map(output => output.outputId)]),
  controlCatalog: Object.freeze([...inherited.controlCatalog, ...CARDIORESPIRATORY_PRIMITIVE_CONTROLS_V1.map(control => Object.freeze({
    controlId: control.controlId, preferredPresentation: (control.controlId.endsWith(".mode") || control.controlId.endsWith(".recruitment-preset")) ? "buttons" as const : "slider" as const,
    requiredCapabilities: Object.freeze([controlCapabilityV1(control.controlId)]),
  }))]),
  derivedOutputCatalog: Object.freeze([...inherited.derivedOutputCatalog.map(output => Object.freeze({ ...output,
    derivationId: output.derivationId === inheritedPva ? mechanicalPva : output.derivationId,
    requiredCapabilities: Object.freeze(output.requiredCapabilities.map(mechanicalCapability)),
  })), ...[variation, breathMetrics].flatMap(method => method.outputs.map(output => Object.freeze({ ...output,
    derivationId: method.derivationId, significantDigits: 3,
    requiredCapabilities: Object.freeze([derivationCapabilityV1(method.derivationId), ...output.dependencies.map(outputCapabilityV1)]),
  })))]),
  graphCatalog: Object.freeze([...inherited.graphCatalog.map(graph => Object.freeze({ ...graph,
    ...(graph.renderer === "structural-return" ? { analysisId: mechanicalAnalysis } : {}),
    requiredCapabilities: Object.freeze(graph.requiredCapabilities.map(mechanicalCapability)),
  })), ...CARDIORESPIRATORY_GRAPHS_V1]),
}) satisfies ModelSurfaceReleaseManifestV1;

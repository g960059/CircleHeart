import { CARDIORESPIRATORY_BREATH_DERIVATION_V1 } from "@/analysis/methods/cardiorespiratory/CardiorespiratoryBreathMetricsV1";
import { CARDIORESPIRATORY_MECHANICAL_ANALYSIS_V1_ID, CARDIORESPIRATORY_MECHANICAL_PVA_V1_ID } from "../cardiorespiratory/CardiorespiratoryMechanicalAnalysisV1";
import { CARDIORESPIRATORY_VARIATION_DERIVATION_V1 } from "@/analysis/methods/cardiorespiratory/CardiorespiratoryVariationV1";
import {
  defineAnalysisMethodRegistryV1,
  resolveAnalysisMethodsForSurfaceV1,
  type AnalysisDerivationRegistrationV1,
} from "@/analysis/contracts/AnalysisMethodRegistryV1";
import type { PresentationAnalysisMethodV1 } from "@/analysis/contracts/PresentationAnalysisV1";
import { MainWireCardiacCycleCollectorV1 } from "./MainWireCardiacCycleCollectorV1";
import { MainWireFillingFlowCollectorV1 } from "./MainWireFillingFlowCollectorV1";
import { MAIN_WIRE_PRESSURE_CROSSING_PV_ANALYSIS_V1_ID } from "./MainWireStructuralAnalysisContractV3";
import { MAIN_WIRE_AORTIC_JET_PRESENTATION_V1_ID as jetMethodId, MAIN_WIRE_AORTIC_JET_PRESENTATION_INPUTS_V1 as jetInputs,
  MAIN_WIRE_AORTIC_JET_PRESENTATION_OUTPUTS_V1 as jetOutputs, buildMainWireAorticJetPresentationV1 as jetBuild } from "./MainWireAorticJetPresentationV1";
import { MAIN_WIRE_FILLING_FLOW_METHOD_V1_ID, MAIN_WIRE_FILLING_FLOW_OUTPUT_IDS_V1,
  MAIN_WIRE_FILLING_FLOW_REQUIRED_EXACT_OUTPUT_IDS_V1 } from "./MainWireFillingFlowMetricsV1";
import {
  MAIN_WIRE_CARDIAC_CYCLE_METRICS_METHOD_V1_ID,
  MAIN_WIRE_CARDIAC_CYCLE_OUTPUT_IDS_V1,
  MAIN_WIRE_CARDIAC_CYCLE_REQUIRED_EXACT_OUTPUT_IDS_V1,
} from "./MainWireCardiacCycleMetricsV1";
import {
  MAIN_WIRE_INTEGRATED_MODEL_FORMAL_PRESSURE_VOLUME_RELATIONS_V3_ID,
  MAIN_WIRE_INTEGRATED_MODEL_GUYTON_STARLING_ORIENTATION_V3_ID,
  resolveMainWireStructuralAnalysisExecutionPlanV1,
} from "@/analysis/methods/mainWire/MainWireStructuralAnalysisExecutionV1";
import {
  MAIN_WIRE_PERIODIC_PVA_METHOD_V8_ID,
  MAIN_WIRE_PERIODIC_PVA_METHOD_V9_ID,
  MAIN_WIRE_PERIODIC_PVA_METHOD_V10_ID,
  MAIN_WIRE_PERIODIC_PVA_METHOD_V13_ID,
  MAIN_WIRE_PERIODIC_PVA_METHOD_V14_ID,
  MAIN_WIRE_PERIODIC_PVA_METHOD_V15_ID,
  MAIN_WIRE_PERIODIC_PVA_METHOD_V16_ID,
  buildMainWirePeriodicPvaMethodV8,
  buildMainWirePeriodicPvaMethodV9,
  buildMainWirePeriodicPvaMethodV10,
  buildMainWirePeriodicPvaMethodV13,
  buildMainWirePeriodicPvaMethodV14,
  buildMainWirePeriodicPvaMethodV15,
  buildMainWirePeriodicPvaMethodV16,
  buildCardiorespiratoryMechanicalPvaV1,
} from "@/analysis/methods/mainWire/MainWirePeriodicPvaV1";
import type {
  StudioSimulationAnalysisExecutionPlanResolverV2,
} from "@/studio/contracts/v2/simulation";

export const MAIN_WIRE_PERIODIC_PVA_OUTPUT_IDS_V1 =
  Object.freeze({
    potentialEnergyMilliJoule:
      "myocardium.energy.potential.LV-pressure-volume-area" as const,
    pressureVolumeAreaMilliJoule:
      "myocardium.energy.pressure-volume-area.LV" as const,
    estimatedMvo2PerBeatPer100G:
      "oxygen.consumption.estimated-myocardial.LV-per-beat-per-100g" as const,
    estimatedMvo2PerMinPer100G:
      "oxygen.consumption.estimated-myocardial.LV-per-min-per-100g" as const,
  });

export const MAIN_WIRE_PERIODIC_PVA_ANALYSIS_OUTPUT_IDS_V1 =
  Object.freeze([
    MAIN_WIRE_PERIODIC_PVA_OUTPUT_IDS_V1
      .potentialEnergyMilliJoule,
    MAIN_WIRE_PERIODIC_PVA_OUTPUT_IDS_V1
      .pressureVolumeAreaMilliJoule,
    MAIN_WIRE_PERIODIC_PVA_OUTPUT_IDS_V1
      .estimatedMvo2PerBeatPer100G,
    MAIN_WIRE_PERIODIC_PVA_OUTPUT_IDS_V1
      .estimatedMvo2PerMinPer100G,
  ] as const);

export type MainWirePeriodicPvaDerivationV1 = Readonly<{
  methodId: string;
  sourceAnalysisId?: string;
  build: typeof buildMainWirePeriodicPvaMethodV8;
}>;

type MainWireAnalysisDerivationRuntimeV1 = Readonly<{
  kind: "periodic-pva";
  derivation: MainWirePeriodicPvaDerivationV1;
}> | Readonly<{ kind: "presentation"; method: PresentationAnalysisMethodV1 }>;

export type ResolvedMainWireAnalysisMethodsV1 = Readonly<{
  capabilities: readonly string[];
  periodicPvaDerivation: MainWirePeriodicPvaDerivationV1 | null;
  presentationMethods: readonly PresentationAnalysisMethodV1[];
  resolveExecutionPlan: StudioSimulationAnalysisExecutionPlanResolverV2;
}>;

const MAIN_WIRE_PERIODIC_PVA_DERIVATION_V1 = Object.freeze({
  derivationId: MAIN_WIRE_PERIODIC_PVA_METHOD_V8_ID,
  outputs: Object.freeze([
    Object.freeze({
      outputId: MAIN_WIRE_PERIODIC_PVA_OUTPUT_IDS_V1
        .potentialEnergyMilliJoule,
      kind: "metric" as const,
      unit: "mJ",
      shape: "scalar" as const,
      scope: "window" as const,
      dependencies: Object.freeze([
        "hemodynamics.volume.LV",
        "hemodynamics.pressure.transmural.LV",
      ]),
    }),
    Object.freeze({
      outputId: MAIN_WIRE_PERIODIC_PVA_OUTPUT_IDS_V1
        .pressureVolumeAreaMilliJoule,
      kind: "metric" as const,
      unit: "mJ",
      shape: "scalar" as const,
      scope: "window" as const,
      dependencies: Object.freeze([
        "myocardium.work.stroke.LV",
        MAIN_WIRE_PERIODIC_PVA_OUTPUT_IDS_V1
          .potentialEnergyMilliJoule,
      ]),
    }),
    Object.freeze({
      outputId: MAIN_WIRE_PERIODIC_PVA_OUTPUT_IDS_V1
        .estimatedMvo2PerBeatPer100G,
      kind: "metric" as const,
      unit: "mL O2/beat/100g",
      shape: "scalar" as const,
      scope: "window" as const,
      dependencies: Object.freeze([
        MAIN_WIRE_PERIODIC_PVA_OUTPUT_IDS_V1
          .pressureVolumeAreaMilliJoule,
      ]),
    }),
    Object.freeze({
      outputId: MAIN_WIRE_PERIODIC_PVA_OUTPUT_IDS_V1
        .estimatedMvo2PerMinPer100G,
      kind: "metric" as const,
      unit: "mL O2/min/100g",
      shape: "scalar" as const,
      scope: "window" as const,
      dependencies: Object.freeze([
        MAIN_WIRE_PERIODIC_PVA_OUTPUT_IDS_V1
          .estimatedMvo2PerBeatPer100G,
        "rhythm.heart-rate.instantaneous",
      ]),
    }),
  ]),
  requiredAnalysisIds: Object.freeze([
    MAIN_WIRE_INTEGRATED_MODEL_FORMAL_PRESSURE_VOLUME_RELATIONS_V3_ID,
  ]),
  runtime: Object.freeze({
    kind: "periodic-pva" as const,
    derivation: Object.freeze({
      methodId: MAIN_WIRE_PERIODIC_PVA_METHOD_V8_ID,
      build: buildMainWirePeriodicPvaMethodV8,
    }),
  }),
}) satisfies AnalysisDerivationRegistrationV1<
  MainWireAnalysisDerivationRuntimeV1
>;

const MAIN_WIRE_PERIODIC_PVA_DERIVATION_V9 = Object.freeze({
  ...MAIN_WIRE_PERIODIC_PVA_DERIVATION_V1,
  derivationId: MAIN_WIRE_PERIODIC_PVA_METHOD_V9_ID,
  runtime: Object.freeze({
    kind: "periodic-pva" as const,
    derivation: Object.freeze({
      methodId: MAIN_WIRE_PERIODIC_PVA_METHOD_V9_ID,
      build: buildMainWirePeriodicPvaMethodV9,
    }),
  }),
}) satisfies AnalysisDerivationRegistrationV1<
  MainWireAnalysisDerivationRuntimeV1
>;

const MAIN_WIRE_PERIODIC_PVA_DERIVATION_V10 = Object.freeze({
  ...MAIN_WIRE_PERIODIC_PVA_DERIVATION_V1,
  derivationId: MAIN_WIRE_PERIODIC_PVA_METHOD_V10_ID,
  runtime: Object.freeze({
    kind: "periodic-pva" as const,
    derivation: Object.freeze({
      methodId: MAIN_WIRE_PERIODIC_PVA_METHOD_V10_ID,
      build: buildMainWirePeriodicPvaMethodV10,
    }),
  }),
}) satisfies AnalysisDerivationRegistrationV1<MainWireAnalysisDerivationRuntimeV1>;

const MAIN_WIRE_PERIODIC_PVA_DERIVATION_V13 = Object.freeze({
  ...MAIN_WIRE_PERIODIC_PVA_DERIVATION_V1,
  derivationId: MAIN_WIRE_PERIODIC_PVA_METHOD_V13_ID,
  runtime: Object.freeze({
    kind: "periodic-pva" as const,
    derivation: Object.freeze({
      methodId: MAIN_WIRE_PERIODIC_PVA_METHOD_V13_ID,
      build: buildMainWirePeriodicPvaMethodV13,
    }),
  }),
}) satisfies AnalysisDerivationRegistrationV1<MainWireAnalysisDerivationRuntimeV1>;

export const MAIN_WIRE_CARDIAC_CYCLE_DERIVATION_V1 = Object.freeze({
  derivationId: MAIN_WIRE_CARDIAC_CYCLE_METRICS_METHOD_V1_ID,
  outputs: Object.freeze(Object.entries(MAIN_WIRE_CARDIAC_CYCLE_OUTPUT_IDS_V1)
    .map(([name, outputId]) => Object.freeze({
      outputId, kind: "metric" as const, unit: name.includes("PressureRate") ? "mmHg/s" : name.endsWith("TimeMs") ? "ms" : "1",
      shape: "scalar" as const, scope: "beat" as const,
      dependencies: MAIN_WIRE_CARDIAC_CYCLE_REQUIRED_EXACT_OUTPUT_IDS_V1,
    }))),
  requiredAnalysisIds: Object.freeze([]),
  runtime: Object.freeze({
    kind: "presentation" as const,
    method: Object.freeze({
      methodId: MAIN_WIRE_CARDIAC_CYCLE_METRICS_METHOD_V1_ID,
      requiredExactOutputIds: MAIN_WIRE_CARDIAC_CYCLE_REQUIRED_EXACT_OUTPUT_IDS_V1,
      create: () => new MainWireCardiacCycleCollectorV1(),
    }),
  }),
}) satisfies AnalysisDerivationRegistrationV1<MainWireAnalysisDerivationRuntimeV1>;

export const MAIN_WIRE_FILLING_FLOW_DERIVATION_V1 = Object.freeze({
  derivationId: MAIN_WIRE_FILLING_FLOW_METHOD_V1_ID,
  outputs: Object.freeze(Object.entries(MAIN_WIRE_FILLING_FLOW_OUTPUT_IDS_V1).map(([name, outputId]) => Object.freeze({
    outputId, kind: "metric" as const, unit: name.endsWith("MlPerSec") ? "mL/s" : name.endsWith("Ms") ? "ms" : "1",
    shape: "scalar" as const, scope: "beat" as const, dependencies: MAIN_WIRE_FILLING_FLOW_REQUIRED_EXACT_OUTPUT_IDS_V1,
  }))),
  requiredAnalysisIds: Object.freeze([]),
  runtime: Object.freeze({ kind: "presentation" as const, method: Object.freeze({
    methodId: MAIN_WIRE_FILLING_FLOW_METHOD_V1_ID, requiredExactOutputIds: MAIN_WIRE_FILLING_FLOW_REQUIRED_EXACT_OUTPUT_IDS_V1,
    create: () => new MainWireFillingFlowCollectorV1(),
  }) }),
}) satisfies AnalysisDerivationRegistrationV1<MainWireAnalysisDerivationRuntimeV1>;

export const MAIN_WIRE_AORTIC_JET_DERIVATION_V1 = Object.freeze({
  derivationId: jetMethodId,
  outputs: Object.freeze(jetOutputs.map(({ outputId, unit }) => Object.freeze({ outputId, unit,
    kind: "metric" as const, shape: "scalar" as const, scope: "beat" as const, dependencies: jetInputs }))),
  requiredAnalysisIds: Object.freeze([]), runtime: Object.freeze({ kind: "presentation" as const, method: Object.freeze({
    methodId: jetMethodId, requiredExactOutputIds: jetInputs,
    create: () => new MainWireCardiacCycleCollectorV1({ methodId: jetMethodId, requiredIds: jetInputs, build: jetBuild }),
  }) }),
}) satisfies AnalysisDerivationRegistrationV1<MainWireAnalysisDerivationRuntimeV1>;

export const MAIN_WIRE_ANALYSIS_METHOD_REGISTRY_V1 =
  defineAnalysisMethodRegistryV1<MainWireAnalysisDerivationRuntimeV1>({
    analysisRequestIds: Object.freeze([
      CARDIORESPIRATORY_MECHANICAL_ANALYSIS_V1_ID,
      MAIN_WIRE_INTEGRATED_MODEL_GUYTON_STARLING_ORIENTATION_V3_ID,
      MAIN_WIRE_INTEGRATED_MODEL_FORMAL_PRESSURE_VOLUME_RELATIONS_V3_ID,
      MAIN_WIRE_PRESSURE_CROSSING_PV_ANALYSIS_V1_ID,
    ]),
    derivations: Object.freeze([
      Object.freeze({ ...MAIN_WIRE_PERIODIC_PVA_DERIVATION_V1,
        derivationId: CARDIORESPIRATORY_MECHANICAL_PVA_V1_ID,
        requiredAnalysisIds: Object.freeze([CARDIORESPIRATORY_MECHANICAL_ANALYSIS_V1_ID]),
        runtime: Object.freeze({ kind: "periodic-pva" as const,
          derivation: Object.freeze({ methodId: CARDIORESPIRATORY_MECHANICAL_PVA_V1_ID, build: buildCardiorespiratoryMechanicalPvaV1 }) }),
      }),
      CARDIORESPIRATORY_VARIATION_DERIVATION_V1,
      CARDIORESPIRATORY_BREATH_DERIVATION_V1,
      Object.freeze({ ...MAIN_WIRE_PERIODIC_PVA_DERIVATION_V1,
        derivationId: MAIN_WIRE_PERIODIC_PVA_METHOD_V16_ID,
        requiredAnalysisIds: Object.freeze([MAIN_WIRE_PRESSURE_CROSSING_PV_ANALYSIS_V1_ID]),
        runtime: Object.freeze({ kind: "periodic-pva" as const,
          derivation: Object.freeze({ methodId: MAIN_WIRE_PERIODIC_PVA_METHOD_V16_ID, build: buildMainWirePeriodicPvaMethodV16 }) }),
      }),
      Object.freeze({ ...MAIN_WIRE_PERIODIC_PVA_DERIVATION_V1,
        derivationId: MAIN_WIRE_PERIODIC_PVA_METHOD_V15_ID,
        requiredAnalysisIds: Object.freeze([MAIN_WIRE_PRESSURE_CROSSING_PV_ANALYSIS_V1_ID]),
        runtime: Object.freeze({ kind: "periodic-pva" as const,
          derivation: Object.freeze({ methodId: MAIN_WIRE_PERIODIC_PVA_METHOD_V15_ID, build: buildMainWirePeriodicPvaMethodV15 }) }),
      }),
      MAIN_WIRE_AORTIC_JET_DERIVATION_V1,
      MAIN_WIRE_CARDIAC_CYCLE_DERIVATION_V1,
      MAIN_WIRE_FILLING_FLOW_DERIVATION_V1,
      MAIN_WIRE_PERIODIC_PVA_DERIVATION_V1,
      MAIN_WIRE_PERIODIC_PVA_DERIVATION_V9,
      MAIN_WIRE_PERIODIC_PVA_DERIVATION_V10,
      MAIN_WIRE_PERIODIC_PVA_DERIVATION_V13,
      Object.freeze({ ...MAIN_WIRE_PERIODIC_PVA_DERIVATION_V1,
        derivationId: MAIN_WIRE_PERIODIC_PVA_METHOD_V14_ID,
        runtime: Object.freeze({ kind: "periodic-pva" as const,
          derivation: Object.freeze({ methodId: MAIN_WIRE_PERIODIC_PVA_METHOD_V14_ID, build: buildMainWirePeriodicPvaMethodV14 }) }),
      }),
    ]),
    resolveExecutionPlan:
      resolveMainWireStructuralAnalysisExecutionPlanV1,
  });

const PERIODIC_PVA_BINDINGS_V1 = new WeakMap<MainWirePeriodicPvaDerivationV1, MainWirePeriodicPvaDerivationV1>();

/** Main Wire composition wrapper over the model-independent registry. */
export function resolveMainWireAnalysisMethodsForSurfaceV1(
  surfaceValue: unknown,
): ResolvedMainWireAnalysisMethodsV1 {
  const resolved = resolveAnalysisMethodsForSurfaceV1({
    registry: MAIN_WIRE_ANALYSIS_METHOD_REGISTRY_V1,
    surfaceValue,
  });
  const periodicPvaRuntimes = resolved.derivations.filter(
    ({ runtime }) => runtime.kind === "periodic-pva",
  );
  if (periodicPvaRuntimes.length > 1) {
    throw new Error(
      "Surface must pin exactly one periodic PVA derivation generation",
    );
  }
  const periodicPvaRegistration = periodicPvaRuntimes[0];
  const periodicPvaRuntime = periodicPvaRegistration?.runtime;
  const sourceAnalysisIds = MAIN_WIRE_ANALYSIS_METHOD_REGISTRY_V1.derivations.find(
    r => r.derivationId === periodicPvaRegistration?.derivationId)?.requiredAnalysisIds;
  if (periodicPvaRegistration && sourceAnalysisIds?.length !== 1)
    throw new Error("PVA must pin one structural source analysis");
  let periodicPvaDerivation: MainWirePeriodicPvaDerivationV1 | null = null;
  if (periodicPvaRuntime?.kind === "periodic-pva") {
    const definition = periodicPvaRuntime.derivation;
    periodicPvaDerivation = PERIODIC_PVA_BINDINGS_V1.get(definition)
      ?? Object.freeze({ ...definition, sourceAnalysisId: sourceAnalysisIds![0]! });
    PERIODIC_PVA_BINDINGS_V1.set(definition, periodicPvaDerivation);
  }
  return Object.freeze({
    capabilities: resolved.capabilities,
    presentationMethods: Object.freeze(resolved.derivations.flatMap(({ runtime }) =>
      runtime.kind === "presentation" ? [runtime.method] : [])),
    periodicPvaDerivation,
    resolveExecutionPlan: resolved.resolveExecutionPlan,
  });
}

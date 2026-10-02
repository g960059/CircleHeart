import type {
  ExperimentCapturePortV2,
  ExperimentSnapshotAdmissionPortV2,
} from "./authoring";
import type {
  ModelIdV2,
} from "./ids";
import type {
  ModelContractV2,
  RegisteredModelCaptureAdapterV2,
} from "./model";
import type {
  StudioModelFixtureAdapterV2,
} from "./runtime";
import type {
  RegisteredModelSimulationAdapterV2,
  StudioSimulationScenarioInputV2,
} from "./simulation";
import type {
  BoundExecutionPlanV1,
} from "@/runtime/executionPlan/BoundExecutionPlanV1";

export type RegisteredModelExperimentCaptureAdapterV2 =
  ExperimentCapturePortV2 & Readonly<{
    modelId: ModelIdV2;
    fixtureSchemaId: string;
    checkpointCodecId: string;
  }>;

export type RegisteredModelSnapshotGateAdapterV2 =
  ExperimentSnapshotAdmissionPortV2 & Readonly<{
    modelId: ModelIdV2;
    snapshotGateId: string;
  }>;

export const REGISTERED_MODEL_EXECUTION_PLAN_ADAPTER_V1_SCHEMA_ID =
  "circleheart-registered-model-execution-plan-adapter-v1" as const;

export type RegisteredModelExecutionPlanAdapterV1 = Readonly<{
  schemaId: typeof REGISTERED_MODEL_EXECUTION_PLAN_ADAPTER_V1_SCHEMA_ID;
  modelId: ModelIdV2;
  /** Immutable generated descriptor data bundled in the exact artifact. */
  descriptor: unknown;
  /** Binds and allocates one Worker-local plan. */
  bind(): unknown;
  /** Creates one exact session with every Scenario plan already installed. */
  createSession(input: Readonly<{
    runtimeSessionId: string;
    scenarios: readonly StudioSimulationScenarioInputV2[];
    boundExecutionPlans: ReadonlyMap<string, BoundExecutionPlanV1>;
  }>): Promise<void>;
}>;

/** Executable functions admitted atomically with one exact package artifact. */
export type RegisteredModelExecutableBundleV2 = Readonly<{
  modelId: ModelIdV2;
  fixtureSchemaId: string;
  checkpointCodecId: string;
  snapshotGateId: string;
  captureAdapter: RegisteredModelCaptureAdapterV2;
  experimentCapture: RegisteredModelExperimentCaptureAdapterV2;
  snapshotGate: RegisteredModelSnapshotGateAdapterV2;
  fixtureAdapter: StudioModelFixtureAdapterV2;
  simulationAdapter: RegisteredModelSimulationAdapterV2;
  executionPlan: RegisteredModelExecutionPlanAdapterV1;
}>;

/** Hash-free exact runtime projection. Artifact bytes and digest stay private. */
export type ResolvedExactModelRuntimeV2 = Readonly<{
  /** Worker-local artifact exports for detached, analysis-owned protocols. */
  exactNumericalExports?: Readonly<Record<string, unknown>>;
  /** Surface-composed contract used for durable Studio content. */
  contract: ModelContractV2;
  /** Exact-only contract used to admit numerical executable adapters. */
  exactContract: ModelContractV2;
  captureAdapter: RegisteredModelCaptureAdapterV2;
  experimentCapture: RegisteredModelExperimentCaptureAdapterV2;
  snapshotGate: RegisteredModelSnapshotGateAdapterV2;
  fixtureAdapter: StudioModelFixtureAdapterV2;
  simulationAdapter: RegisteredModelSimulationAdapterV2;
  executionPlan: RegisteredModelExecutionPlanAdapterV1;
}>;

/** Worker-local cold-load timings; never part of exact model identity. */
export type ExactModelRuntimeLoadTimingV2 = Readonly<{
  cacheHit: boolean;
  artifactBytes: number;
  artifactFetchMs: number;
  moduleImportAndFactoryMs: number;
  contractValidationMs: number;
  totalMs: number;
}>;

export interface ExactModelRuntimeResolverPortV2 {
  resolveExactRuntime(modelId: ModelIdV2): ResolvedExactModelRuntimeV2;
}

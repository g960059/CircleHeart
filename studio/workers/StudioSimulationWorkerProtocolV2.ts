import type {
  ExactModelRuntimeLoadTimingV2,
} from "@/studio/contracts/v2/executable";
import type {
  ExperimentContentV2,
  ExperimentScenarioV2,
  ExperimentSnapshotV2,
  ExperimentSurfaceV2,
  ExperimentV2,
  ScenarioCheckpointV2,
  ScenarioCaptureV2,
  ScenarioPresetV2,
} from "@/studio/contracts/v2/content";
import {
  STUDIO_EXPERIMENT_V2_SCHEMA_ID,
} from "@/studio/contracts/v2/content";
import {
  validateScenarioCaptureV2,
  validateScenarioPresetV2,
  validateExperimentSnapshotV2,
  validateExperimentV2,
} from "@/studio/application/authoring/StudioExperimentDataV2";
import type {
  StudioJsonValueV2,
} from "@/studio/contracts/v2/json";
import type {
  StudioModelWorkerReleaseTicketV2,
} from "@/studio/contracts/v2/release";
import {
  validateStudioModelWorkerReleaseTicketV2,
} from "@/studio/contracts/v2/release";
import type {
  StudioSimulationAnalysisV2,
  StudioSimulationFrameV2,
} from "@/studio/contracts/v2/simulation";
import {
  validateStudioSimulationAnalysisV2,
  validateStudioSimulationFrameV2,
  validateStudioSimulationPortableIdV2,
  validateStudioSimulationScenarioInputV2,
  validateAndOwnStudioSimulationPortableJsonV2,
} from "@/studio/contracts/v2/simulation";
import type {
  StudioSimulationPresentationBatchV2,
} from "@/studio/workers/StudioSimulationPresentationBatchV2";
import {
  STUDIO_SIMULATION_PRESENTATION_OUTPUT_STATE_COUNT_V2,
  studioSimulationPresentationOutputStateCodeV2,
} from "@/studio/workers/StudioSimulationPresentationBatchV2";

export const STUDIO_SIMULATION_WORKER_PROTOCOL_V2 =
  "circleheart-studio-simulation-worker-protocol-v2" as const;
export const STUDIO_SIMULATION_WORKER_MAX_ADVANCE_STEPS_V2 = 16;

export type StudioPreparedAnalysisValidationV1 = Readonly<{
  record: StudioJsonValueV2;
  capture: ScenarioCaptureV2;
  releaseTicket: StudioModelWorkerReleaseTicketV2;
}>;
export type StudioValidatedPreparedAnalysisV1 = Readonly<{
  analysis: StudioSimulationAnalysisV2;
  recordSha256: string;
  captureSha256: string;
  preparationSourceSha256: string;
}>;

export type StudioSimulationWorkerInitializationTimingV2 = Readonly<{
  exactRuntimeLoad: ExactModelRuntimeLoadTimingV2 | null;
  authoringSetupMs: number;
  sessionCreateMs: number;
  initialFrameMs: number;
  /** Exact kernel binding and plan-owned allocation. */
  executionPlanBindMs: number;
  totalWorkerInitializeMs: number;
}>;

export type StudioSimulationWorkerAuthoringSeedV2 = Readonly<{
  experiment?: ExperimentV2;
}>;

export type StudioSimulationWorkerInitializeInputV2 = Readonly<{
  expectedModelId: string;
  runtimeSessionId: string;
  scenarioId: string;
  scenarioLabel: string;
  fixture: StudioJsonValueV2;
  releaseTicket: StudioModelWorkerReleaseTicketV2;
  checkpoint?: ScenarioCheckpointV2;
  authoringSeed?: StudioSimulationWorkerAuthoringSeedV2;
}>;

export type StudioSimulationWorkerAdvanceInputV2 = Readonly<{
  runtimeSessionId: string;
  scenarioId: string;
  stepCount: number;
}>;

export type StudioSimulationWorkerAdvancePresentationInputV2 = Readonly<{
  runtimeSessionId: string;
  scenarioId: string;
  stepCount: number;
  presentationOutputIds: readonly string[];
  presentationAnalysisIds?: readonly string[];
}>;

export type StudioSimulationWorkerApplyControlInputV2 = Readonly<{
  runtimeSessionId: string;
  scenarioId: string;
  controlId: string;
  value: number;
  expectedInputEpoch: number;
}>;

/** The exact reducer's accepted fixture, correlated with the committed frame. */
export type StudioSimulationWorkerControlResultV2 = Readonly<{
  frame: StudioSimulationFrameV2;
  fixture: StudioJsonValueV2;
}>;

export type StudioSimulationWorkerRequestAnalysisInputV2 = Readonly<{
  runtimeSessionId: string;
  scenarioId: string;
  analysisId: string;
  expectedInputEpoch: number;
  expectedAcceptedRevision: number;
  expectedAcceptedTimeSec: number;
  analysisPartition?: string;
  sharePreparation?: boolean;
  preparedAnalysis?: StudioJsonValueV2;
}>;

export type StudioSimulationWorkerSaveExperimentInputV2 = Readonly<{
  runtimeSessionId: string;
  scenarioId: string;
  experimentId: string;
  surface: ExperimentSurfaceV2;
  surfaceSeriesId: string;
  expectedVersion: number | null;
}>;

export type StudioSimulationWorkerScenarioDescriptorV2 = Readonly<{
  scenarioId: string;
  label: string;
}>;

export type StudioSimulationWorkerScenarioStateV2 = Readonly<{
  activeScenarioId: string;
  scenarios: readonly StudioSimulationWorkerScenarioDescriptorV2[];
  frame: StudioSimulationFrameV2;
}>;

export type StudioSimulationWorkerScenarioCapturesV2 = Readonly<{
  activeScenarioId: string;
  scenarios: readonly ExperimentScenarioV2[];
}>;

export type StudioSimulationWorkerAddScenarioFromPresetInputV2 = Readonly<{
  runtimeSessionId: string;
  scenarioId: string;
  label: string;
  preset: ScenarioPresetV2;
}>;

export type StudioSimulationWorkerDuplicateScenarioInputV2 = Readonly<{
  runtimeSessionId: string;
  sourceScenarioId: string;
  scenarioId: string;
  label: string;
}>;

export type StudioSimulationWorkerRenameScenarioInputV2 = Readonly<{
  runtimeSessionId: string;
  scenarioId: string;
  label: string;
}>;

export type StudioSimulationWorkerDeleteScenarioInputV2 = Readonly<{
  runtimeSessionId: string;
  scenarioId: string;
}>;

export type StudioSimulationWorkerSelectScenarioInputV2 = Readonly<{
  runtimeSessionId: string;
  scenarioId: string;
}>;

export type StudioSimulationWorkerReadScenariosInputV2 = Readonly<{
  runtimeSessionId: string;
}>;

type StudioSimulationWorkerCreateSnapshotBaseInputV2 = Readonly<{
  runtimeSessionId: string;
  scenarioId: string;
  surface: ExperimentSurfaceV2;
  surfaceSeriesId: string;
  surfaceReleaseId: string;
}>;

export type StudioSimulationWorkerCreateSnapshotInputV2 =
  StudioSimulationWorkerCreateSnapshotBaseInputV2 & Readonly<{
    /** Transient workflow constraint; never persisted in the Snapshot. */
    snapshotSource: "saved-experiment" | "session";
  }>;

export type StudioSimulationWorkerRequestV2 =
  | (StudioPreparedAnalysisValidationV1 & Readonly<{
      protocol: typeof STUDIO_SIMULATION_WORKER_PROTOCOL_V2;
      requestId: number;
      kind: "validate-prepared-analysis";
    }>)
  | Readonly<{
      protocol: typeof STUDIO_SIMULATION_WORKER_PROTOCOL_V2;
      requestId: number;
      kind: "initialize";
      expectedModelId: string;
      runtimeSessionId: string;
      scenarioId: string;
      scenarioLabel: string;
      fixture: StudioJsonValueV2;
      releaseTicket: StudioModelWorkerReleaseTicketV2;
      checkpoint?: ScenarioCheckpointV2;
      authoringSeed?: StudioSimulationWorkerAuthoringSeedV2;
    }>
  | Readonly<{
      protocol: typeof STUDIO_SIMULATION_WORKER_PROTOCOL_V2;
      requestId: number;
      kind: "advance";
      runtimeSessionId: string;
      scenarioId: string;
      stepCount: number;
    }>
  | Readonly<{
      protocol: typeof STUDIO_SIMULATION_WORKER_PROTOCOL_V2;
      requestId: number;
      kind: "advance-presentation";
      runtimeSessionId: string;
      scenarioId: string;
      stepCount: number;
      presentationOutputIds: readonly string[];
      presentationAnalysisIds?: readonly string[];
    }>
  | Readonly<{
      protocol: typeof STUDIO_SIMULATION_WORKER_PROTOCOL_V2;
      requestId: number;
      kind: "apply-control";
      runtimeSessionId: string;
      scenarioId: string;
      controlId: string;
      value: number;
      expectedInputEpoch: number;
    }>
  | Readonly<{
      protocol: typeof STUDIO_SIMULATION_WORKER_PROTOCOL_V2;
      requestId: number;
      kind: "request-analysis";
      runtimeSessionId: string;
      scenarioId: string;
      analysisId: string;
      expectedInputEpoch: number;
      expectedAcceptedRevision: number;
      expectedAcceptedTimeSec: number;
      analysisPartition?: string;
      sharePreparation?: boolean;
      preparedAnalysis?: StudioJsonValueV2;
    }>
  | Readonly<{
      protocol: typeof STUDIO_SIMULATION_WORKER_PROTOCOL_V2;
      requestId: number;
      kind: "save-experiment";
      runtimeSessionId: string;
      scenarioId: string;
      experimentId: string;
      surface: ExperimentSurfaceV2;
      surfaceSeriesId: string;
      /** Complete Experiment Scenario identity set used to validate Surface refs. */
      scenarioIds: readonly string[];
      expectedVersion: number | null;
      expectedInputEpoch: number;
      expectedAcceptedRevision: number;
      expectedAcceptedTimeSec: number;
    }>
  | Readonly<{
      protocol: typeof STUDIO_SIMULATION_WORKER_PROTOCOL_V2;
      requestId: number;
      kind: "read-scenarios";
      runtimeSessionId: string;
      expectedActiveScenarioId: string;
      expectedInputEpoch: number;
      expectedAcceptedRevision: number;
      expectedAcceptedTimeSec: number;
    }>
  | Readonly<{
      protocol: typeof STUDIO_SIMULATION_WORKER_PROTOCOL_V2;
      requestId: number;
      kind: "select-scenario";
      runtimeSessionId: string;
      scenarioId: string;
      expectedActiveScenarioId: string;
      expectedInputEpoch: number;
      expectedAcceptedRevision: number;
      expectedAcceptedTimeSec: number;
    }>
  | Readonly<{
      protocol: typeof STUDIO_SIMULATION_WORKER_PROTOCOL_V2;
      requestId: number;
      kind: "add-scenario-from-preset";
      runtimeSessionId: string;
      scenarioId: string;
      label: string;
      preset: ScenarioPresetV2;
      expectedActiveScenarioId: string;
      expectedInputEpoch: number;
      expectedAcceptedRevision: number;
      expectedAcceptedTimeSec: number;
    }>
  | Readonly<{
      protocol: typeof STUDIO_SIMULATION_WORKER_PROTOCOL_V2;
      requestId: number;
      kind: "duplicate-scenario";
      runtimeSessionId: string;
      sourceScenarioId: string;
      scenarioId: string;
      label: string;
      expectedActiveScenarioId: string;
      expectedInputEpoch: number;
      expectedAcceptedRevision: number;
      expectedAcceptedTimeSec: number;
    }>
  | Readonly<{
      protocol: typeof STUDIO_SIMULATION_WORKER_PROTOCOL_V2;
      requestId: number;
      kind: "rename-scenario";
      runtimeSessionId: string;
      scenarioId: string;
      label: string;
    }>
  | Readonly<{
      protocol: typeof STUDIO_SIMULATION_WORKER_PROTOCOL_V2;
      requestId: number;
      kind: "delete-scenario";
      runtimeSessionId: string;
      scenarioId: string;
      expectedActiveScenarioId: string;
      expectedInputEpoch: number;
      expectedAcceptedRevision: number;
      expectedAcceptedTimeSec: number;
    }>
  | Readonly<{
      protocol: typeof STUDIO_SIMULATION_WORKER_PROTOCOL_V2;
      requestId: number;
      kind: "create-snapshot";
      runtimeSessionId: string;
      scenarioId: string;
      surface: ExperimentSurfaceV2;
      surfaceSeriesId: string;
      surfaceReleaseId: string;
      /** Complete Scenario identity set used to validate Surface refs. */
      scenarioIds: readonly string[];
      snapshotSource: "saved-experiment" | "session";
      expectedInputEpoch: number;
      expectedAcceptedRevision: number;
      expectedAcceptedTimeSec: number;
    }>
  | Readonly<{
      protocol: typeof STUDIO_SIMULATION_WORKER_PROTOCOL_V2;
      requestId: number;
      kind: "dispose";
      runtimeSessionId: string;
    }>;

export type StudioSimulationWorkerResponseV2 =
  | Readonly<{
      protocol: typeof STUDIO_SIMULATION_WORKER_PROTOCOL_V2;
      requestId: number;
      status: "ok";
      kind: "prepared-analysis-validated";
      prepared: StudioValidatedPreparedAnalysisV1;
    }>
  | Readonly<{
      protocol: typeof STUDIO_SIMULATION_WORKER_PROTOCOL_V2;
      requestId: number;
      status: "ok";
      kind: "initialized";
      frame: StudioSimulationFrameV2;
      initializationTiming?: StudioSimulationWorkerInitializationTimingV2;
    }>
  | Readonly<{
      protocol: typeof STUDIO_SIMULATION_WORKER_PROTOCOL_V2;
      requestId: number;
      status: "ok";
      kind: "advanced";
      frames: readonly StudioSimulationFrameV2[];
    }>
  | Readonly<{
      protocol: typeof STUDIO_SIMULATION_WORKER_PROTOCOL_V2;
      requestId: number;
      status: "ok";
      kind: "presentation-advanced";
      batch: StudioSimulationPresentationBatchV2;
      analyses?: readonly StudioSimulationAnalysisV2[];
    }>
  | Readonly<{
      protocol: typeof STUDIO_SIMULATION_WORKER_PROTOCOL_V2;
      requestId: number;
      status: "ok";
      kind: "control-applied";
      frame: StudioSimulationFrameV2;
      fixture: StudioJsonValueV2;
    }>
  | Readonly<{
      protocol: typeof STUDIO_SIMULATION_WORKER_PROTOCOL_V2;
      requestId: number;
      status: "ok";
      kind: "analysis-progress";
      analysis: StudioSimulationAnalysisV2;
      preparation?: StudioJsonValueV2;
    }>
  | Readonly<{
      protocol: typeof STUDIO_SIMULATION_WORKER_PROTOCOL_V2;
      requestId: number;
      status: "ok";
      kind: "analysis-result";
      analysis: StudioSimulationAnalysisV2;
    }>
  | Readonly<{
      protocol: typeof STUDIO_SIMULATION_WORKER_PROTOCOL_V2;
      requestId: number;
      status: "ok";
      kind: "scenario-state";
      state: StudioSimulationWorkerScenarioStateV2;
    }>
  | Readonly<{
      protocol: typeof STUDIO_SIMULATION_WORKER_PROTOCOL_V2;
      requestId: number;
      status: "ok";
      kind: "scenarios-captured";
      captures: StudioSimulationWorkerScenarioCapturesV2;
    }>
  | Readonly<{
      protocol: typeof STUDIO_SIMULATION_WORKER_PROTOCOL_V2;
      requestId: number;
      status: "ok";
      kind: "experiment-saved";
      experiment: ExperimentV2;
    }>
  | Readonly<{
      protocol: typeof STUDIO_SIMULATION_WORKER_PROTOCOL_V2;
      requestId: number;
      status: "ok";
      kind: "snapshot-created";
      snapshot: ExperimentSnapshotV2;
    }>
  | Readonly<{
      protocol: typeof STUDIO_SIMULATION_WORKER_PROTOCOL_V2;
      requestId: number;
      status: "ok";
      kind: "disposed";
    }>
  | Readonly<{
      protocol: typeof STUDIO_SIMULATION_WORKER_PROTOCOL_V2;
      requestId: number;
      status: "error";
      fatal: boolean;
      message: string;
    }>;

export class StudioSimulationWorkerProtocolErrorV2 extends Error {
  constructor(path: string, message: string) {
    super(`Studio simulation worker V2 rejected ${path}: ${message}`);
    this.name = "StudioSimulationWorkerProtocolErrorV2";
  }
}

export function createStudioSimulationInitializeRequestV2(
  requestId: number,
  value: unknown,
): Extract<StudioSimulationWorkerRequestV2, { kind: "initialize" }> {
  const input = exactDataRecordV2(value, [
    "expectedModelId",
    "fixture",
    "releaseTicket",
    "runtimeSessionId",
    "scenarioId",
    "scenarioLabel",
  ], ["authoringSeed", "checkpoint"], "$.initialize");
  return validateStudioSimulationWorkerRequestV2({
    protocol: STUDIO_SIMULATION_WORKER_PROTOCOL_V2,
    requestId,
    kind: "initialize",
    expectedModelId: input.expectedModelId,
    runtimeSessionId: input.runtimeSessionId,
    scenarioId: input.scenarioId,
    scenarioLabel: input.scenarioLabel,
    fixture: input.fixture,
    releaseTicket: input.releaseTicket,
    ...(Object.prototype.hasOwnProperty.call(input, "checkpoint")
      ? { checkpoint: input.checkpoint }
      : {}),
    ...(Object.prototype.hasOwnProperty.call(input, "authoringSeed")
      ? { authoringSeed: input.authoringSeed }
      : {}),
  }) as Extract<StudioSimulationWorkerRequestV2, { kind: "initialize" }>;
}

export function createStudioSimulationAdvanceRequestV2(
  requestId: number,
  value: unknown,
): Extract<StudioSimulationWorkerRequestV2, { kind: "advance" }> {
  const input = exactDataRecordV2(value, [
    "runtimeSessionId",
    "scenarioId",
    "stepCount",
  ], [], "$.advance");
  return validateStudioSimulationWorkerRequestV2({
    protocol: STUDIO_SIMULATION_WORKER_PROTOCOL_V2,
    requestId,
    kind: "advance",
    runtimeSessionId: input.runtimeSessionId,
    scenarioId: input.scenarioId,
    stepCount: input.stepCount,
  }) as Extract<StudioSimulationWorkerRequestV2, { kind: "advance" }>;
}

export function createStudioSimulationAdvancePresentationRequestV2(
  requestId: number,
  value: unknown,
): Extract<StudioSimulationWorkerRequestV2, { kind: "advance-presentation" }> {
  const input = exactDataRecordV2(value, [
    "presentationOutputIds",
    "runtimeSessionId",
    "scenarioId",
    "stepCount",
  ], ["presentationAnalysisIds"], "$.advancePresentation");
  return validateStudioSimulationWorkerRequestV2({
    protocol: STUDIO_SIMULATION_WORKER_PROTOCOL_V2,
    requestId,
    kind: "advance-presentation",
    runtimeSessionId: input.runtimeSessionId,
    scenarioId: input.scenarioId,
    stepCount: input.stepCount,
    presentationOutputIds: input.presentationOutputIds,
    ...(input.presentationAnalysisIds === undefined ? {} : { presentationAnalysisIds: input.presentationAnalysisIds }),
  }) as Extract<
    StudioSimulationWorkerRequestV2,
    { kind: "advance-presentation" }
  >;
}

export function createStudioSimulationApplyControlRequestV2(
  requestId: number,
  value: unknown,
): Extract<StudioSimulationWorkerRequestV2, { kind: "apply-control" }> {
  const input = exactDataRecordV2(value, [
    "controlId",
    "expectedInputEpoch",
    "runtimeSessionId",
    "scenarioId",
    "value",
  ], [], "$.applyControl");
  return validateStudioSimulationWorkerRequestV2({
    protocol: STUDIO_SIMULATION_WORKER_PROTOCOL_V2,
    requestId,
    kind: "apply-control",
    runtimeSessionId: input.runtimeSessionId,
    scenarioId: input.scenarioId,
    controlId: input.controlId,
    value: input.value,
    expectedInputEpoch: input.expectedInputEpoch,
  }) as Extract<
    StudioSimulationWorkerRequestV2,
    { kind: "apply-control" }
  >;
}

export function createStudioSimulationRequestAnalysisRequestV2(
  requestId: number,
  value: unknown,
): Extract<StudioSimulationWorkerRequestV2, { kind: "request-analysis" }> {
  const input = exactDataRecordV2(value, [
    "analysisId",
    "expectedAcceptedRevision",
    "expectedAcceptedTimeSec",
    "expectedInputEpoch",
    "runtimeSessionId",
    "scenarioId",
  ], ["analysisPartition", "sharePreparation", "preparedAnalysis"], "$.requestAnalysis");
  return validateStudioSimulationWorkerRequestV2({
    protocol: STUDIO_SIMULATION_WORKER_PROTOCOL_V2,
    requestId,
    kind: "request-analysis",
    runtimeSessionId: input.runtimeSessionId,
    scenarioId: input.scenarioId,
    analysisId: input.analysisId,
    expectedInputEpoch: input.expectedInputEpoch,
    expectedAcceptedRevision: input.expectedAcceptedRevision,
    expectedAcceptedTimeSec: input.expectedAcceptedTimeSec,
    ...(input.analysisPartition === undefined
      ? {}
      : { analysisPartition: input.analysisPartition }),
    ...(input.sharePreparation === undefined ? {} : { sharePreparation: input.sharePreparation }),
    ...(input.preparedAnalysis === undefined ? {} : { preparedAnalysis: input.preparedAnalysis }),
  }) as Extract<
    StudioSimulationWorkerRequestV2,
    { kind: "request-analysis" }
  >;
}

export function createStudioSimulationSaveExperimentRequestV2(
  requestId: number,
  value: unknown,
): Extract<StudioSimulationWorkerRequestV2, { kind: "save-experiment" }> {
  const input = exactDataRecordV2(value, [
    "expectedAcceptedRevision",
    "expectedAcceptedTimeSec",
    "expectedVersion",
    "expectedInputEpoch",
    "experimentId",
    "runtimeSessionId",
    "scenarioId",
    "surfaceSeriesId",
    "surface",
  ], ["scenarioIds"], "$.saveExperiment");
  const scenarioIds = input.scenarioIds === undefined
    ? [input.scenarioId]
    : input.scenarioIds;
  return validateStudioSimulationWorkerRequestV2({
    protocol: STUDIO_SIMULATION_WORKER_PROTOCOL_V2,
    requestId,
    kind: "save-experiment",
    runtimeSessionId: input.runtimeSessionId,
    scenarioId: input.scenarioId,
    experimentId: input.experimentId,
    surface: input.surface,
    surfaceSeriesId: input.surfaceSeriesId,
    scenarioIds,
    expectedVersion: input.expectedVersion,
    expectedInputEpoch: input.expectedInputEpoch,
    expectedAcceptedRevision: input.expectedAcceptedRevision,
    expectedAcceptedTimeSec: input.expectedAcceptedTimeSec,
  }) as Extract<StudioSimulationWorkerRequestV2, { kind: "save-experiment" }>;
}

function activeBoundaryCorrelationFieldsV2(
  input: Record<string, unknown>,
): Record<string, unknown> {
  return {
    expectedActiveScenarioId: input.expectedActiveScenarioId,
    expectedInputEpoch: input.expectedInputEpoch,
    expectedAcceptedRevision: input.expectedAcceptedRevision,
    expectedAcceptedTimeSec: input.expectedAcceptedTimeSec,
  };
}

export function createStudioSimulationReadScenariosRequestV2(
  requestId: number,
  value: unknown,
): Extract<StudioSimulationWorkerRequestV2, { kind: "read-scenarios" }> {
  const input = exactDataRecordV2(value, [
    "expectedAcceptedRevision",
    "expectedAcceptedTimeSec",
    "expectedActiveScenarioId",
    "expectedInputEpoch",
    "runtimeSessionId",
  ], [], "$.readScenarios");
  return validateStudioSimulationWorkerRequestV2({
    protocol: STUDIO_SIMULATION_WORKER_PROTOCOL_V2,
    requestId,
    kind: "read-scenarios",
    runtimeSessionId: input.runtimeSessionId,
    ...activeBoundaryCorrelationFieldsV2(input),
  }) as Extract<StudioSimulationWorkerRequestV2, { kind: "read-scenarios" }>;
}

export function createStudioSimulationSelectScenarioRequestV2(
  requestId: number,
  value: unknown,
): Extract<StudioSimulationWorkerRequestV2, { kind: "select-scenario" }> {
  const input = exactDataRecordV2(value, [
    "expectedAcceptedRevision",
    "expectedAcceptedTimeSec",
    "expectedActiveScenarioId",
    "expectedInputEpoch",
    "runtimeSessionId",
    "scenarioId",
  ], [], "$.selectScenario");
  return validateStudioSimulationWorkerRequestV2({
    protocol: STUDIO_SIMULATION_WORKER_PROTOCOL_V2,
    requestId,
    kind: "select-scenario",
    runtimeSessionId: input.runtimeSessionId,
    scenarioId: input.scenarioId,
    ...activeBoundaryCorrelationFieldsV2(input),
  }) as Extract<StudioSimulationWorkerRequestV2, { kind: "select-scenario" }>;
}

export function createStudioSimulationAddScenarioFromPresetRequestV2(
  requestId: number,
  value: unknown,
): Extract<StudioSimulationWorkerRequestV2, { kind: "add-scenario-from-preset" }> {
  const input = exactDataRecordV2(value, [
    "expectedAcceptedRevision",
    "expectedAcceptedTimeSec",
    "expectedActiveScenarioId",
    "expectedInputEpoch",
    "label",
    "preset",
    "runtimeSessionId",
    "scenarioId",
  ], [], "$.addScenarioFromPreset");
  return validateStudioSimulationWorkerRequestV2({
    protocol: STUDIO_SIMULATION_WORKER_PROTOCOL_V2,
    requestId,
    kind: "add-scenario-from-preset",
    runtimeSessionId: input.runtimeSessionId,
    scenarioId: input.scenarioId,
    label: input.label,
    preset: input.preset,
    ...activeBoundaryCorrelationFieldsV2(input),
  }) as Extract<StudioSimulationWorkerRequestV2, { kind: "add-scenario-from-preset" }>;
}

export function createStudioSimulationDuplicateScenarioRequestV2(
  requestId: number,
  value: unknown,
): Extract<StudioSimulationWorkerRequestV2, { kind: "duplicate-scenario" }> {
  const input = exactDataRecordV2(value, [
    "expectedAcceptedRevision",
    "expectedAcceptedTimeSec",
    "expectedActiveScenarioId",
    "expectedInputEpoch",
    "label",
    "runtimeSessionId",
    "scenarioId",
    "sourceScenarioId",
  ], [], "$.duplicateScenario");
  return validateStudioSimulationWorkerRequestV2({
    protocol: STUDIO_SIMULATION_WORKER_PROTOCOL_V2,
    requestId,
    kind: "duplicate-scenario",
    runtimeSessionId: input.runtimeSessionId,
    sourceScenarioId: input.sourceScenarioId,
    scenarioId: input.scenarioId,
    label: input.label,
    ...activeBoundaryCorrelationFieldsV2(input),
  }) as Extract<StudioSimulationWorkerRequestV2, { kind: "duplicate-scenario" }>;
}

export function createStudioSimulationRenameScenarioRequestV2(
  requestId: number,
  value: unknown,
): Extract<StudioSimulationWorkerRequestV2, { kind: "rename-scenario" }> {
  const input = exactDataRecordV2(value, [
    "label",
    "runtimeSessionId",
    "scenarioId",
  ], [], "$.renameScenario");
  return validateStudioSimulationWorkerRequestV2({
    protocol: STUDIO_SIMULATION_WORKER_PROTOCOL_V2,
    requestId,
    kind: "rename-scenario",
    runtimeSessionId: input.runtimeSessionId,
    scenarioId: input.scenarioId,
    label: input.label,
  }) as Extract<StudioSimulationWorkerRequestV2, { kind: "rename-scenario" }>;
}

export function createStudioSimulationDeleteScenarioRequestV2(
  requestId: number,
  value: unknown,
): Extract<StudioSimulationWorkerRequestV2, { kind: "delete-scenario" }> {
  const input = exactDataRecordV2(value, [
    "expectedAcceptedRevision",
    "expectedAcceptedTimeSec",
    "expectedActiveScenarioId",
    "expectedInputEpoch",
    "runtimeSessionId",
    "scenarioId",
  ], [], "$.deleteScenario");
  return validateStudioSimulationWorkerRequestV2({
    protocol: STUDIO_SIMULATION_WORKER_PROTOCOL_V2,
    requestId,
    kind: "delete-scenario",
    runtimeSessionId: input.runtimeSessionId,
    scenarioId: input.scenarioId,
    ...activeBoundaryCorrelationFieldsV2(input),
  }) as Extract<StudioSimulationWorkerRequestV2, { kind: "delete-scenario" }>;
}

export function createStudioSimulationCreateSnapshotRequestV2(
  requestId: number,
  value: unknown,
): Extract<StudioSimulationWorkerRequestV2, { kind: "create-snapshot" }> {
  const input = exactDataRecordV2(value, [
    "expectedAcceptedRevision",
    "expectedAcceptedTimeSec",
    "expectedInputEpoch",
    "runtimeSessionId",
    "scenarioId",
    "scenarioIds",
    "snapshotSource",
    "surface",
    "surfaceReleaseId",
    "surfaceSeriesId",
  ], [], "$.createSnapshot");
  return validateStudioSimulationWorkerRequestV2({
    protocol: STUDIO_SIMULATION_WORKER_PROTOCOL_V2,
    requestId,
    kind: "create-snapshot",
    runtimeSessionId: input.runtimeSessionId,
    scenarioId: input.scenarioId,
    scenarioIds: input.scenarioIds,
    surface: input.surface,
    surfaceSeriesId: input.surfaceSeriesId,
    surfaceReleaseId: input.surfaceReleaseId,
    snapshotSource: input.snapshotSource,
    expectedInputEpoch: input.expectedInputEpoch,
    expectedAcceptedRevision: input.expectedAcceptedRevision,
    expectedAcceptedTimeSec: input.expectedAcceptedTimeSec,
  }) as Extract<
    StudioSimulationWorkerRequestV2,
    { kind: "create-snapshot" }
  >;
}

export function createStudioSimulationDisposeRequestV2(
  requestId: number,
  runtimeSessionId: unknown,
): Extract<StudioSimulationWorkerRequestV2, { kind: "dispose" }> {
  return validateStudioSimulationWorkerRequestV2({
    protocol: STUDIO_SIMULATION_WORKER_PROTOCOL_V2,
    requestId,
    kind: "dispose",
    runtimeSessionId,
  }) as Extract<StudioSimulationWorkerRequestV2, { kind: "dispose" }>;
}

/** Decodes and detaches an untrusted message before any adapter is invoked. */
export function validateStudioSimulationWorkerRequestV2(
  value: unknown,
): StudioSimulationWorkerRequestV2 {
  const envelope = dataRecordV2(value, "$.request");
  assertProtocolV2(envelope.protocol, "$.request.protocol");
  const requestId = positiveRequestIdV2(
    envelope.requestId,
    "$.request.requestId",
  );

  if (envelope.kind === "validate-prepared-analysis") {
    const request = exactDataRecordV2(envelope, ["protocol", "requestId", "kind", "record", "capture", "releaseTicket"], [], "$.request");
    return Object.freeze({ protocol: STUDIO_SIMULATION_WORKER_PROTOCOL_V2, requestId, kind: "validate-prepared-analysis",
      record: validateAndOwnStudioSimulationPortableJsonV2(request.record, "$.request.record"),
      capture: validateScenarioCaptureV2(request.capture),
      releaseTicket: validateStudioModelWorkerReleaseTicketV2(request.releaseTicket),
    });
  }
  if (envelope.kind === "initialize") {
    const request = exactDataRecordV2(envelope, [
      "expectedModelId",
      "fixture",
      "kind",
      "protocol",
      "releaseTicket",
      "requestId",
      "runtimeSessionId",
      "scenarioId",
      "scenarioLabel",
    ], ["authoringSeed", "checkpoint"], "$.request");
    const scenario = validateStudioSimulationScenarioInputV2({
      scenarioId: request.scenarioId,
      fixture: request.fixture,
      ...(Object.prototype.hasOwnProperty.call(request, "checkpoint")
        ? { checkpoint: request.checkpoint }
        : {}),
    });
    return Object.freeze({
      protocol: STUDIO_SIMULATION_WORKER_PROTOCOL_V2,
      requestId,
      kind: "initialize",
      expectedModelId: validateStudioSimulationPortableIdV2(
        request.expectedModelId,
        "$.request.expectedModelId",
      ),
      runtimeSessionId: validateStudioSimulationPortableIdV2(
        request.runtimeSessionId,
        "$.request.runtimeSessionId",
      ),
      scenarioId: scenario.scenarioId,
      scenarioLabel: nonemptyTrimmedStringV2(
        request.scenarioLabel,
        "$.request.scenarioLabel",
      ),
      fixture: scenario.fixture,
      releaseTicket: validateStudioModelWorkerReleaseTicketV2(
        request.releaseTicket,
      ),
      ...(scenario.checkpoint === undefined
        ? {}
        : { checkpoint: scenario.checkpoint }),
      ...(Object.prototype.hasOwnProperty.call(request, "authoringSeed")
        ? {
            authoringSeed: validateAuthoringSeedV2(
              request.authoringSeed,
              "$.request.authoringSeed",
            ),
          }
        : {}),
    });
  }

  if (envelope.kind === "advance") {
    const request = exactDataRecordV2(envelope, [
      "kind",
      "protocol",
      "requestId",
      "runtimeSessionId",
      "scenarioId",
      "stepCount",
    ], [], "$.request");
    const stepCount = request.stepCount;
    if (
      typeof stepCount !== "number"
      || !Number.isSafeInteger(stepCount)
      || stepCount < 1
      || stepCount > STUDIO_SIMULATION_WORKER_MAX_ADVANCE_STEPS_V2
    ) {
      throw protocolErrorV2(
        "$.request.stepCount",
        `must be an integer within [1, ${STUDIO_SIMULATION_WORKER_MAX_ADVANCE_STEPS_V2}]`,
      );
    }
    return Object.freeze({
      protocol: STUDIO_SIMULATION_WORKER_PROTOCOL_V2,
      requestId,
      kind: "advance",
      runtimeSessionId: validateStudioSimulationPortableIdV2(
        request.runtimeSessionId,
        "$.request.runtimeSessionId",
      ),
      scenarioId: validateStudioSimulationPortableIdV2(
        request.scenarioId,
        "$.request.scenarioId",
      ),
      stepCount,
    });
  }

  if (envelope.kind === "advance-presentation") {
    const request = exactDataRecordV2(envelope, [
      "kind",
      "presentationOutputIds",
      "protocol",
      "requestId",
      "runtimeSessionId",
      "scenarioId",
      "stepCount",
    ], ["presentationAnalysisIds"], "$.request");
    const stepCount = request.stepCount;
    if (
      typeof stepCount !== "number"
      || !Number.isSafeInteger(stepCount)
      || stepCount < 1
      || stepCount > STUDIO_SIMULATION_WORKER_MAX_ADVANCE_STEPS_V2
    ) {
      throw protocolErrorV2(
        "$.request.stepCount",
        `must be an integer within [1, ${STUDIO_SIMULATION_WORKER_MAX_ADVANCE_STEPS_V2}]`,
      );
    }
    return Object.freeze({
      protocol: STUDIO_SIMULATION_WORKER_PROTOCOL_V2,
      requestId,
      kind: "advance-presentation",
      runtimeSessionId: validateStudioSimulationPortableIdV2(
        request.runtimeSessionId,
        "$.request.runtimeSessionId",
      ),
      scenarioId: validateStudioSimulationPortableIdV2(
        request.scenarioId,
        "$.request.scenarioId",
      ),
      stepCount,
      presentationOutputIds: validatePresentationOutputIdsV2(
        request.presentationOutputIds,
        "$.request.presentationOutputIds",
      ),
      ...(request.presentationAnalysisIds === undefined ? {} : {
        presentationAnalysisIds: validatePresentationAnalysisIdsV2(request.presentationAnalysisIds),
      }),
    });
  }

  if (envelope.kind === "apply-control") {
    const request = exactDataRecordV2(envelope, [
      "controlId",
      "expectedInputEpoch",
      "kind",
      "protocol",
      "requestId",
      "runtimeSessionId",
      "scenarioId",
      "value",
    ], [], "$.request");
    return Object.freeze({
      protocol: STUDIO_SIMULATION_WORKER_PROTOCOL_V2,
      requestId,
      kind: "apply-control",
      runtimeSessionId: validateStudioSimulationPortableIdV2(
        request.runtimeSessionId,
        "$.request.runtimeSessionId",
      ),
      scenarioId: validateStudioSimulationPortableIdV2(
        request.scenarioId,
        "$.request.scenarioId",
      ),
      controlId: validateStudioSimulationPortableIdV2(
        request.controlId,
        "$.request.controlId",
      ),
      value: finiteScalarV2(request.value, "$.request.value"),
      expectedInputEpoch: nonnegativeSafeIntegerV2(
        request.expectedInputEpoch,
        "$.request.expectedInputEpoch",
      ),
    });
  }

  if (envelope.kind === "request-analysis") {
    const request = exactDataRecordV2(envelope, [
      "analysisId",
      "expectedAcceptedRevision",
      "expectedAcceptedTimeSec",
      "expectedInputEpoch",
      "kind",
      "protocol",
      "requestId",
      "runtimeSessionId",
      "scenarioId",
    ], ["analysisPartition", "sharePreparation", "preparedAnalysis"], "$.request");
    if (request.sharePreparation !== undefined && typeof request.sharePreparation !== "boolean")
      throw protocolErrorV2("$.request.sharePreparation", "must be a boolean");
    if (request.sharePreparation === true && request.preparedAnalysis !== undefined)
      throw protocolErrorV2("$.request", "cannot prepare and consume preparation together");
    return Object.freeze({
      protocol: STUDIO_SIMULATION_WORKER_PROTOCOL_V2,
      requestId,
      kind: "request-analysis",
      runtimeSessionId: validateStudioSimulationPortableIdV2(
        request.runtimeSessionId,
        "$.request.runtimeSessionId",
      ),
      scenarioId: validateStudioSimulationPortableIdV2(
        request.scenarioId,
        "$.request.scenarioId",
      ),
      analysisId: validateStudioSimulationPortableIdV2(
        request.analysisId,
        "$.request.analysisId",
      ),
      ...(request.sharePreparation === undefined ? {} : { sharePreparation: request.sharePreparation as boolean }),
      ...(request.preparedAnalysis === undefined ? {} : {
        preparedAnalysis: validateAndOwnStudioSimulationPortableJsonV2(request.preparedAnalysis, "$.request.preparedAnalysis"),
      }),
      ...(request.analysisPartition === undefined
        ? {}
        : {
            analysisPartition: validateStudioSimulationPortableIdV2(
              request.analysisPartition,
              "$.request.analysisPartition",
            ),
          }),
      expectedInputEpoch: nonnegativeSafeIntegerV2(
        request.expectedInputEpoch,
        "$.request.expectedInputEpoch",
      ),
      expectedAcceptedRevision: nonnegativeSafeIntegerV2(
        request.expectedAcceptedRevision,
        "$.request.expectedAcceptedRevision",
      ),
      expectedAcceptedTimeSec: nonnegativeFiniteNumberV2(
        request.expectedAcceptedTimeSec,
        "$.request.expectedAcceptedTimeSec",
      ),
    });
  }

  if (envelope.kind === "save-experiment") {
    const request = exactDataRecordV2(envelope, [
      "expectedAcceptedRevision",
      "expectedAcceptedTimeSec",
      "expectedVersion",
      "expectedInputEpoch",
      "experimentId",
      "kind",
      "protocol",
      "requestId",
      "runtimeSessionId",
      "scenarioId",
      "scenarioIds",
      "surface",
      "surfaceSeriesId",
    ], [], "$.request");
    const runtimeSessionId = validateStudioSimulationPortableIdV2(
      request.runtimeSessionId,
      "$.request.runtimeSessionId",
    );
    const scenarioId = validateStudioSimulationPortableIdV2(
      request.scenarioId,
      "$.request.scenarioId",
    );
    const scenarioIds = validateScenarioIdsV2(
      request.scenarioIds,
      scenarioId,
      "$.request.scenarioIds",
    );
    return Object.freeze({
      protocol: STUDIO_SIMULATION_WORKER_PROTOCOL_V2,
      requestId,
      kind: "save-experiment",
      runtimeSessionId,
      scenarioId,
      experimentId: validateStudioSimulationPortableIdV2(
        request.experimentId,
        "$.request.experimentId",
      ),
      surface: validateSurfaceV2(
        request.surface,
        scenarioIds,
        "$.request.surface",
      ),
      surfaceSeriesId: validateStudioSimulationPortableIdV2(
        request.surfaceSeriesId,
        "$.request.surfaceSeriesId",
      ),
      scenarioIds,
      expectedVersion: nullableNonnegativeSafeIntegerV2(
        request.expectedVersion,
        "$.request.expectedVersion",
      ),
      expectedInputEpoch: nonnegativeSafeIntegerV2(
        request.expectedInputEpoch,
        "$.request.expectedInputEpoch",
      ),
      expectedAcceptedRevision: nonnegativeSafeIntegerV2(
        request.expectedAcceptedRevision,
        "$.request.expectedAcceptedRevision",
      ),
      expectedAcceptedTimeSec: nonnegativeFiniteNumberV2(
        request.expectedAcceptedTimeSec,
        "$.request.expectedAcceptedTimeSec",
      ),
    });
  }

  if (envelope.kind === "read-scenarios") {
    const request = exactDataRecordV2(envelope, [
      "expectedAcceptedRevision",
      "expectedAcceptedTimeSec",
      "expectedActiveScenarioId",
      "expectedInputEpoch",
      "kind",
      "protocol",
      "requestId",
      "runtimeSessionId",
    ], [], "$.request");
    return Object.freeze({
      protocol: STUDIO_SIMULATION_WORKER_PROTOCOL_V2,
      requestId,
      kind: "read-scenarios",
      runtimeSessionId: validateStudioSimulationPortableIdV2(
        request.runtimeSessionId,
        "$.request.runtimeSessionId",
      ),
      ...validateActiveBoundaryCorrelationV2(request, "$.request"),
    });
  }

  if (envelope.kind === "select-scenario") {
    const request = exactDataRecordV2(envelope, [
      "expectedAcceptedRevision",
      "expectedAcceptedTimeSec",
      "expectedActiveScenarioId",
      "expectedInputEpoch",
      "kind",
      "protocol",
      "requestId",
      "runtimeSessionId",
      "scenarioId",
    ], [], "$.request");
    return Object.freeze({
      protocol: STUDIO_SIMULATION_WORKER_PROTOCOL_V2,
      requestId,
      kind: "select-scenario",
      runtimeSessionId: validateStudioSimulationPortableIdV2(
        request.runtimeSessionId,
        "$.request.runtimeSessionId",
      ),
      scenarioId: validateStudioSimulationPortableIdV2(
        request.scenarioId,
        "$.request.scenarioId",
      ),
      ...validateActiveBoundaryCorrelationV2(request, "$.request"),
    });
  }

  if (envelope.kind === "add-scenario-from-preset") {
    const request = exactDataRecordV2(envelope, [
      "expectedAcceptedRevision",
      "expectedAcceptedTimeSec",
      "expectedActiveScenarioId",
      "expectedInputEpoch",
      "kind",
      "label",
      "preset",
      "protocol",
      "requestId",
      "runtimeSessionId",
      "scenarioId",
    ], [], "$.request");
    let preset: ScenarioPresetV2;
    try {
      preset = validateScenarioPresetV2(request.preset);
    } catch (error) {
      throw protocolErrorV2(
        "$.request.preset",
        errorMessageForProtocolV2(error),
      );
    }
    return Object.freeze({
      protocol: STUDIO_SIMULATION_WORKER_PROTOCOL_V2,
      requestId,
      kind: "add-scenario-from-preset",
      runtimeSessionId: validateStudioSimulationPortableIdV2(
        request.runtimeSessionId,
        "$.request.runtimeSessionId",
      ),
      scenarioId: validateStudioSimulationPortableIdV2(
        request.scenarioId,
        "$.request.scenarioId",
      ),
      label: nonemptyTrimmedStringV2(request.label, "$.request.label"),
      preset,
      ...validateActiveBoundaryCorrelationV2(request, "$.request"),
    });
  }

  if (envelope.kind === "duplicate-scenario") {
    const request = exactDataRecordV2(envelope, [
      "expectedAcceptedRevision",
      "expectedAcceptedTimeSec",
      "expectedActiveScenarioId",
      "expectedInputEpoch",
      "kind",
      "label",
      "protocol",
      "requestId",
      "runtimeSessionId",
      "scenarioId",
      "sourceScenarioId",
    ], [], "$.request");
    return Object.freeze({
      protocol: STUDIO_SIMULATION_WORKER_PROTOCOL_V2,
      requestId,
      kind: "duplicate-scenario",
      runtimeSessionId: validateStudioSimulationPortableIdV2(
        request.runtimeSessionId,
        "$.request.runtimeSessionId",
      ),
      sourceScenarioId: validateStudioSimulationPortableIdV2(
        request.sourceScenarioId,
        "$.request.sourceScenarioId",
      ),
      scenarioId: validateStudioSimulationPortableIdV2(
        request.scenarioId,
        "$.request.scenarioId",
      ),
      label: nonemptyTrimmedStringV2(request.label, "$.request.label"),
      ...validateActiveBoundaryCorrelationV2(request, "$.request"),
    });
  }

  if (envelope.kind === "rename-scenario") {
    const request = exactDataRecordV2(envelope, [
      "kind",
      "label",
      "protocol",
      "requestId",
      "runtimeSessionId",
      "scenarioId",
    ], [], "$.request");
    return Object.freeze({
      protocol: STUDIO_SIMULATION_WORKER_PROTOCOL_V2,
      requestId,
      kind: "rename-scenario",
      runtimeSessionId: validateStudioSimulationPortableIdV2(
        request.runtimeSessionId,
        "$.request.runtimeSessionId",
      ),
      scenarioId: validateStudioSimulationPortableIdV2(
        request.scenarioId,
        "$.request.scenarioId",
      ),
      label: nonemptyTrimmedStringV2(request.label, "$.request.label"),
    });
  }

  if (envelope.kind === "delete-scenario") {
    const request = exactDataRecordV2(envelope, [
      "expectedAcceptedRevision",
      "expectedAcceptedTimeSec",
      "expectedActiveScenarioId",
      "expectedInputEpoch",
      "kind",
      "protocol",
      "requestId",
      "runtimeSessionId",
      "scenarioId",
    ], [], "$.request");
    return Object.freeze({
      protocol: STUDIO_SIMULATION_WORKER_PROTOCOL_V2,
      requestId,
      kind: "delete-scenario",
      runtimeSessionId: validateStudioSimulationPortableIdV2(
        request.runtimeSessionId,
        "$.request.runtimeSessionId",
      ),
      scenarioId: validateStudioSimulationPortableIdV2(
        request.scenarioId,
        "$.request.scenarioId",
      ),
      ...validateActiveBoundaryCorrelationV2(request, "$.request"),
    });
  }

  if (envelope.kind === "create-snapshot") {
    const request = exactDataRecordV2(envelope, [
      "expectedAcceptedRevision",
      "expectedAcceptedTimeSec",
      "expectedInputEpoch",
      "kind",
      "protocol",
      "requestId",
      "runtimeSessionId",
      "scenarioId",
      "scenarioIds",
      "snapshotSource",
      "surface",
      "surfaceReleaseId",
      "surfaceSeriesId",
    ], [], "$.request");
    const runtimeSessionId = validateStudioSimulationPortableIdV2(
      request.runtimeSessionId,
      "$.request.runtimeSessionId",
    );
    const scenarioId = validateStudioSimulationPortableIdV2(
      request.scenarioId,
      "$.request.scenarioId",
    );
    const scenarioIds = validateScenarioIdsV2(
      request.scenarioIds,
      scenarioId,
      "$.request.scenarioIds",
    );
    const surface = validateSurfaceV2(
      request.surface,
      scenarioIds,
      "$.request.surface",
    );
    const snapshotSource = snapshotSourceV2(
      request.snapshotSource,
      "$.request.snapshotSource",
    );
    return Object.freeze({
      protocol: STUDIO_SIMULATION_WORKER_PROTOCOL_V2,
      requestId,
      kind: "create-snapshot",
      runtimeSessionId,
      scenarioId,
      scenarioIds,
      surface,
      surfaceSeriesId: validateStudioSimulationPortableIdV2(
        request.surfaceSeriesId,
        "$.request.surfaceSeriesId",
      ),
      surfaceReleaseId: validateStudioSimulationPortableIdV2(
        request.surfaceReleaseId,
        "$.request.surfaceReleaseId",
      ),
      snapshotSource,
      expectedInputEpoch: nonnegativeSafeIntegerV2(
        request.expectedInputEpoch,
        "$.request.expectedInputEpoch",
      ),
      expectedAcceptedRevision: nonnegativeSafeIntegerV2(
        request.expectedAcceptedRevision,
        "$.request.expectedAcceptedRevision",
      ),
      expectedAcceptedTimeSec: nonnegativeFiniteNumberV2(
        request.expectedAcceptedTimeSec,
        "$.request.expectedAcceptedTimeSec",
      ),
    });
  }

  if (envelope.kind === "dispose") {
    const request = exactDataRecordV2(envelope, [
      "kind",
      "protocol",
      "requestId",
      "runtimeSessionId",
    ], [], "$.request");
    return Object.freeze({
      protocol: STUDIO_SIMULATION_WORKER_PROTOCOL_V2,
      requestId,
      kind: "dispose",
      runtimeSessionId: validateStudioSimulationPortableIdV2(
        request.runtimeSessionId,
        "$.request.runtimeSessionId",
      ),
    });
  }
  throw protocolErrorV2("$.request.kind", "has an invalid request kind");
}

/** Decodes and detaches an untrusted response before resolving a caller. */
export function validateStudioSimulationWorkerResponseV2(
  value: unknown,
): StudioSimulationWorkerResponseV2 {
  const envelope = dataRecordV2(value, "$.response");
  assertProtocolV2(envelope.protocol, "$.response.protocol");
  const requestId = responseRequestIdV2(
    envelope.requestId,
    "$.response.requestId",
  );

  if (envelope.status === "error") {
    const response = exactDataRecordV2(envelope, [
      "fatal",
      "message",
      "protocol",
      "requestId",
      "status",
    ], [], "$.response");
    if (typeof response.fatal !== "boolean") {
      throw protocolErrorV2("$.response.fatal", "must be a boolean");
    }
    return Object.freeze({
      protocol: STUDIO_SIMULATION_WORKER_PROTOCOL_V2,
      requestId,
      status: "error",
      fatal: response.fatal,
      message: portableErrorMessageV2(
        response.message,
        "$.response.message",
      ),
    });
  }
  if (envelope.status !== "ok") {
    throw protocolErrorV2("$.response.status", "has an invalid status");
  }

  if (envelope.kind === "prepared-analysis-validated") {
    const response = exactDataRecordV2(envelope, ["protocol", "requestId", "status", "kind", "prepared"], [], "$.response");
    const prepared = exactDataRecordV2(response.prepared, ["analysis", "recordSha256", "captureSha256", "preparationSourceSha256"], [], "$.response.prepared");
    const digest = (key: string) => {
      const value = prepared[key];
      if (typeof value !== "string" || !/^[a-f0-9]{64}$/.test(value)) throw protocolErrorV2(`$.response.prepared.${key}`, "must be a SHA-256 digest");
      return value;
    };
    return Object.freeze({ protocol: STUDIO_SIMULATION_WORKER_PROTOCOL_V2, requestId, status: "ok", kind: "prepared-analysis-validated",
      prepared: Object.freeze({ analysis: validateStudioSimulationAnalysisV2(prepared.analysis), recordSha256: digest("recordSha256"),
        captureSha256: digest("captureSha256"), preparationSourceSha256: digest("preparationSourceSha256") }),
    });
  }
  if (envelope.kind === "initialized") {
    const response = exactDataRecordV2(envelope, [
      "frame",
      "kind",
      "protocol",
      "requestId",
      "status",
    ], ["initializationTiming"], "$.response");
    return Object.freeze({
      protocol: STUDIO_SIMULATION_WORKER_PROTOCOL_V2,
      requestId,
      status: "ok",
      kind: "initialized",
      frame: validateStudioSimulationFrameV2(response.frame),
      ...(response.initializationTiming === undefined
        ? {}
        : {
            initializationTiming: validateInitializationTimingV2(
              response.initializationTiming,
              "$.response.initializationTiming",
            ),
          }),
    });
  }
  if (envelope.kind === "advanced") {
    const response = exactDataRecordV2(envelope, [
      "frames",
      "kind",
      "protocol",
      "requestId",
      "status",
    ], [], "$.response");
    const frameValues = arrayDataValuesV2(
      response.frames,
      "$.response.frames",
    );
    if (
      frameValues.length < 1
      || frameValues.length > STUDIO_SIMULATION_WORKER_MAX_ADVANCE_STEPS_V2
    ) {
      throw protocolErrorV2(
        "$.response.frames",
        `must contain 1-${STUDIO_SIMULATION_WORKER_MAX_ADVANCE_STEPS_V2} frames`,
      );
    }
    const frames: StudioSimulationFrameV2[] = [];
    for (let index = 0; index < frameValues.length; index += 1) {
      frames.push(validateStudioSimulationFrameV2(
        frameValues[index],
        `$.response.frames[${index}]`,
      ));
    }
    return Object.freeze({
      protocol: STUDIO_SIMULATION_WORKER_PROTOCOL_V2,
      requestId,
      status: "ok",
      kind: "advanced",
      frames: Object.freeze(frames),
    });
  }
  if (envelope.kind === "presentation-advanced") {
    const response = exactDataRecordV2(envelope, [
      "batch",
      "kind",
      "protocol",
      "requestId",
      "status",
    ], ["analyses"], "$.response");
    return Object.freeze({
      protocol: STUDIO_SIMULATION_WORKER_PROTOCOL_V2,
      requestId,
      status: "ok",
      kind: "presentation-advanced",
      ...(response.analyses === undefined ? {} : { analyses: validatePresentationAnalysesV2(response.analyses) }),
      batch: validatePresentationBatchV2(
        response.batch,
        "$.response.batch",
        "own",
      ),
    });
  }
  if (envelope.kind === "control-applied") {
    const response = exactDataRecordV2(envelope, [
      "frame",
      "fixture",
      "kind",
      "protocol",
      "requestId",
      "status",
    ], [], "$.response");
    return Object.freeze({
      protocol: STUDIO_SIMULATION_WORKER_PROTOCOL_V2,
      requestId,
      status: "ok",
      kind: "control-applied",
      frame: validateStudioSimulationFrameV2(response.frame),
      fixture: validateAndOwnStudioSimulationPortableJsonV2(response.fixture, "$.response.fixture"),
    });
  }
  if (
    envelope.kind === "analysis-progress"
    || envelope.kind === "analysis-result"
  ) {
    const response = exactDataRecordV2(envelope, [
      "analysis",
      "kind",
      "protocol",
      "requestId",
      "status",
    ], envelope.kind === "analysis-progress" ? ["preparation"] : [], "$.response");
    return Object.freeze({
      protocol: STUDIO_SIMULATION_WORKER_PROTOCOL_V2,
      requestId,
      status: "ok",
      kind: envelope.kind,
      analysis: validateStudioSimulationAnalysisV2(response.analysis),
      ...(response.preparation === undefined ? {} : { preparation:
        validateAndOwnStudioSimulationPortableJsonV2(response.preparation, "$.response.preparation") }),
    });
  }
  if (envelope.kind === "scenario-state") {
    const response = exactDataRecordV2(envelope, [
      "kind",
      "protocol",
      "requestId",
      "state",
      "status",
    ], [], "$.response");
    return Object.freeze({
      protocol: STUDIO_SIMULATION_WORKER_PROTOCOL_V2,
      requestId,
      status: "ok",
      kind: "scenario-state",
      state: validateScenarioStateV2(response.state, "$.response.state"),
    });
  }
  if (envelope.kind === "scenarios-captured") {
    const response = exactDataRecordV2(envelope, [
      "captures",
      "kind",
      "protocol",
      "requestId",
      "status",
    ], [], "$.response");
    return Object.freeze({
      protocol: STUDIO_SIMULATION_WORKER_PROTOCOL_V2,
      requestId,
      status: "ok",
      kind: "scenarios-captured",
      captures: validateScenarioCapturesV2(
        response.captures,
        "$.response.captures",
      ),
    });
  }
  if (envelope.kind === "experiment-saved") {
    const response = exactDataRecordV2(envelope, [
      "kind",
      "protocol",
      "requestId",
      "status",
      "experiment",
    ], [], "$.response");
    return Object.freeze({
      protocol: STUDIO_SIMULATION_WORKER_PROTOCOL_V2,
      requestId,
      status: "ok",
      kind: "experiment-saved",
      experiment: validateExperimentV2(response.experiment),
    });
  }
  if (envelope.kind === "snapshot-created") {
    const response = exactDataRecordV2(envelope, [
      "kind",
      "protocol",
      "requestId",
      "snapshot",
      "status",
    ], [], "$.response");
    return Object.freeze({
      protocol: STUDIO_SIMULATION_WORKER_PROTOCOL_V2,
      requestId,
      status: "ok",
      kind: "snapshot-created",
      snapshot: validateExperimentSnapshotV2(response.snapshot),
    });
  }
  if (envelope.kind === "disposed") {
    exactDataRecordV2(envelope, [
      "kind",
      "protocol",
      "requestId",
      "status",
    ], [], "$.response");
    return Object.freeze({
      protocol: STUDIO_SIMULATION_WORKER_PROTOCOL_V2,
      requestId,
      status: "ok",
      kind: "disposed",
    });
  }
  throw protocolErrorV2("$.response.kind", "has an invalid response kind");
}

/**
 * Decodes the hot `advanced` response emitted by the bundled dedicated
 * simulation Worker without re-walking every already-validated output.
 *
 * The Worker runtime fully validates each adapter frame before constructing
 * this response. The main thread therefore needs transport shape, identity,
 * clock and request correlation checks, not another deep ownership pass over
 * all output records. Progressive analysis messages receive the same treatment:
 * the Worker has already validated the growing payload and the final analysis
 * result still crosses the full decoder. Authoring, capture, lifecycle and
 * final-analysis responses continue to use the full decoder.
 */
export function validateStudioSimulationWorkerResponseFromTrustedRuntimeV2(
  value: unknown,
): StudioSimulationWorkerResponseV2 {
  const envelope = dataRecordV2(value, "$.response");
  if (
    envelope.status === "ok"
    && envelope.kind === "analysis-progress"
  ) {
    const response = exactDataRecordV2(envelope, [
      "analysis",
      "kind",
      "protocol",
      "requestId",
      "status",
    ], ["preparation"], "$.response");
    assertProtocolV2(response.protocol, "$.response.protocol");
    return Object.freeze({
      protocol: STUDIO_SIMULATION_WORKER_PROTOCOL_V2,
      requestId: responseRequestIdV2(
        response.requestId,
        "$.response.requestId",
      ),
      status: "ok",
      kind: "analysis-progress",
      analysis: validateTrustedRuntimeAnalysisHeaderV2(
        response.analysis,
        "$.response.analysis",
      ),
      ...(response.preparation === undefined ? {} : { preparation:
        validateAndOwnStudioSimulationPortableJsonV2(response.preparation, "$.response.preparation") }),
    });
  }
  if (
    envelope.status === "ok"
    && envelope.kind === "presentation-advanced"
  ) {
    const response = exactDataRecordV2(envelope, [
      "batch",
      "kind",
      "protocol",
      "requestId",
      "status",
    ], ["analyses"], "$.response");
    assertProtocolV2(response.protocol, "$.response.protocol");
    return Object.freeze({
      protocol: STUDIO_SIMULATION_WORKER_PROTOCOL_V2,
      requestId: responseRequestIdV2(
        response.requestId,
        "$.response.requestId",
      ),
      status: "ok",
      kind: "presentation-advanced",
      ...(response.analyses === undefined ? {} : { analyses: validatePresentationAnalysesV2(response.analyses) }),
      batch: validatePresentationBatchV2(
        response.batch,
        "$.response.batch",
        "trusted",
      ),
    });
  }
  if (
    envelope.status !== "ok"
    || envelope.kind !== "advanced"
  ) {
    return validateStudioSimulationWorkerResponseV2(value);
  }
  const response = exactDataRecordV2(envelope, [
    "frames",
    "kind",
    "protocol",
    "requestId",
    "status",
  ], [], "$.response");
  assertProtocolV2(response.protocol, "$.response.protocol");
  const requestId = responseRequestIdV2(
    response.requestId,
    "$.response.requestId",
  );
  const frameValues = arrayDataValuesV2(
    response.frames,
    "$.response.frames",
  );
  if (
    frameValues.length < 1
    || frameValues.length > STUDIO_SIMULATION_WORKER_MAX_ADVANCE_STEPS_V2
  ) {
    throw protocolErrorV2(
      "$.response.frames",
      `must contain 1-${STUDIO_SIMULATION_WORKER_MAX_ADVANCE_STEPS_V2} frames`,
    );
  }
  const frames = frameValues.map((frame, index) =>
    validateTrustedRuntimeFrameHeaderV2(
      frame,
      `$.response.frames[${index}]`,
    ));
  return Object.freeze({
    protocol: STUDIO_SIMULATION_WORKER_PROTOCOL_V2,
    requestId,
    status: "ok",
    kind: "advanced",
    frames: Object.freeze(frames),
  });
}

/** Extracts correlation without invoking accessors on an invalid message. */
export function studioSimulationWorkerRequestIdFromUnknownV2(
  value: unknown,
): number {
  try {
    if (
      value === null
      || typeof value !== "object"
      || Array.isArray(value)
    ) {
      return 0;
    }
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return 0;
    const descriptor = Object.getOwnPropertyDescriptor(value, "requestId");
    if (
      descriptor === undefined
      || !descriptor.enumerable
      || !("value" in descriptor)
      || typeof descriptor.value !== "number"
      || !Number.isSafeInteger(descriptor.value)
      || descriptor.value < 1
    ) {
      return 0;
    }
    return descriptor.value;
  } catch {
    // Revoked or hostile proxies cannot supply trustworthy correlation.
    return 0;
  }
}

function assertProtocolV2(value: unknown, path: string): void {
  if (value !== STUDIO_SIMULATION_WORKER_PROTOCOL_V2) {
    throw protocolErrorV2(path, "protocol identity mismatch");
  }
}

function positiveRequestIdV2(value: unknown, path: string): number {
  if (
    typeof value !== "number"
    || !Number.isSafeInteger(value)
    || value < 1
  ) {
    throw protocolErrorV2(path, "must be a positive safe integer");
  }
  return value;
}

function responseRequestIdV2(value: unknown, path: string): number {
  if (
    typeof value !== "number"
    || !Number.isSafeInteger(value)
    || value < 0
    || Object.is(value, -0)
  ) {
    throw protocolErrorV2(path, "must be a nonnegative safe integer");
  }
  return value;
}

function nonnegativeSafeIntegerV2(value: unknown, path: string): number {
  if (
    typeof value !== "number"
    || !Number.isSafeInteger(value)
    || value < 0
    || Object.is(value, -0)
  ) {
    throw protocolErrorV2(path, "must be a nonnegative safe integer");
  }
  return value;
}

function validateActiveBoundaryCorrelationV2(
  value: Record<string, unknown>,
  path: string,
): Readonly<{
  expectedActiveScenarioId: string;
  expectedInputEpoch: number;
  expectedAcceptedRevision: number;
  expectedAcceptedTimeSec: number;
}> {
  return Object.freeze({
    expectedActiveScenarioId: validateStudioSimulationPortableIdV2(
      value.expectedActiveScenarioId,
      `${path}.expectedActiveScenarioId`,
    ),
    expectedInputEpoch: nonnegativeSafeIntegerV2(
      value.expectedInputEpoch,
      `${path}.expectedInputEpoch`,
    ),
    expectedAcceptedRevision: nonnegativeSafeIntegerV2(
      value.expectedAcceptedRevision,
      `${path}.expectedAcceptedRevision`,
    ),
    expectedAcceptedTimeSec: nonnegativeFiniteNumberV2(
      value.expectedAcceptedTimeSec,
      `${path}.expectedAcceptedTimeSec`,
    ),
  });
}

function validateScenarioDescriptorsV2(
  value: unknown,
  path: string,
): readonly StudioSimulationWorkerScenarioDescriptorV2[] {
  const values = arrayDataValuesV2(value, path);
  if (values.length === 0) {
    throw protocolErrorV2(path, "must contain at least one Scenario");
  }
  const ids = new Set<string>();
  return Object.freeze(values.map((entry, index) => {
    const itemPath = `${path}[${index}]`;
    const descriptor = exactDataRecordV2(
      entry,
      ["label", "scenarioId"],
      [],
      itemPath,
    );
    const scenarioId = validateStudioSimulationPortableIdV2(
      descriptor.scenarioId,
      `${itemPath}.scenarioId`,
    );
    if (ids.has(scenarioId)) {
      throw protocolErrorV2(`${itemPath}.scenarioId`, "must be unique");
    }
    ids.add(scenarioId);
    return Object.freeze({
      scenarioId,
      label: nonemptyTrimmedStringV2(
        descriptor.label,
        `${itemPath}.label`,
      ),
    });
  }));
}

function validateScenarioStateV2(
  value: unknown,
  path: string,
): StudioSimulationWorkerScenarioStateV2 {
  const state = exactDataRecordV2(
    value,
    ["activeScenarioId", "frame", "scenarios"],
    [],
    path,
  );
  const activeScenarioId = validateStudioSimulationPortableIdV2(
    state.activeScenarioId,
    `${path}.activeScenarioId`,
  );
  const scenarios = validateScenarioDescriptorsV2(
    state.scenarios,
    `${path}.scenarios`,
  );
  if (!scenarios.some(({ scenarioId }) => scenarioId === activeScenarioId)) {
    throw protocolErrorV2(
      `${path}.activeScenarioId`,
      "must identify one returned Scenario",
    );
  }
  const frame = validateStudioSimulationFrameV2(
    state.frame,
    `${path}.frame`,
  );
  if (frame.scenarioId !== activeScenarioId) {
    throw protocolErrorV2(
      `${path}.frame.scenarioId`,
      "must match activeScenarioId",
    );
  }
  return Object.freeze({ activeScenarioId, scenarios, frame });
}

function validateScenarioCapturesV2(
  value: unknown,
  path: string,
): StudioSimulationWorkerScenarioCapturesV2 {
  const captures = exactDataRecordV2(
    value,
    ["activeScenarioId", "scenarios"],
    [],
    path,
  );
  const activeScenarioId = validateStudioSimulationPortableIdV2(
    captures.activeScenarioId,
    `${path}.activeScenarioId`,
  );
  const values = arrayDataValuesV2(captures.scenarios, `${path}.scenarios`);
  if (values.length === 0) {
    throw protocolErrorV2(`${path}.scenarios`, "must not be empty");
  }
  const ids = new Set<string>();
  const scenarios = values.map((entry, index) => {
    const itemPath = `${path}.scenarios[${index}]`;
    const scenario = exactDataRecordV2(
      entry,
      ["capture", "label", "scenarioId"],
      [],
      itemPath,
    );
    const scenarioId = validateStudioSimulationPortableIdV2(
      scenario.scenarioId,
      `${itemPath}.scenarioId`,
    );
    if (ids.has(scenarioId)) {
      throw protocolErrorV2(`${itemPath}.scenarioId`, "must be unique");
    }
    ids.add(scenarioId);
    let capture;
    try {
      capture = validateScenarioCaptureV2(scenario.capture);
    } catch (error) {
      throw protocolErrorV2(
        `${itemPath}.capture`,
        errorMessageForProtocolV2(error),
      );
    }
    return Object.freeze({
      scenarioId,
      label: nonemptyTrimmedStringV2(scenario.label, `${itemPath}.label`),
      capture,
    });
  });
  if (!ids.has(activeScenarioId)) {
    throw protocolErrorV2(
      `${path}.activeScenarioId`,
      "must identify one captured Scenario",
    );
  }
  return Object.freeze({
    activeScenarioId,
    scenarios: Object.freeze(scenarios),
  });
}

function nullableNonnegativeSafeIntegerV2(
  value: unknown,
  path: string,
): number | null {
  return value === null ? null : nonnegativeSafeIntegerV2(value, path);
}

function nonemptyTrimmedStringV2(value: unknown, path: string): string {
  if (
    typeof value !== "string"
    || value.length === 0
    || value.length > 4_096
    || value.trim() !== value
  ) {
    throw protocolErrorV2(
      path,
      "must be a nonempty trimmed string of at most 4096 characters",
    );
  }
  assertUnicodeScalarSequenceV2(value, path);
  return value;
}

function validateAuthoringSeedV2(
  value: unknown,
  path: string,
): StudioSimulationWorkerAuthoringSeedV2 {
  const seed = exactDataRecordV2(
    value,
    [],
    ["experiment"],
    path,
  );
  let experiment: ExperimentV2 | undefined;
  if (Object.prototype.hasOwnProperty.call(seed, "experiment")) {
    try {
      experiment = validateExperimentV2(seed.experiment);
    } catch (error) {
      throw protocolErrorV2(path, errorMessageForProtocolV2(error));
    }
  }
  return Object.freeze({
    ...(experiment === undefined ? {} : { experiment }),
  });
}

function validateSurfaceV2(
  value: unknown,
  scenarioIds: readonly string[],
  path: string,
): ExperimentSurfaceV2 {
  try {
    return validateExperimentV2({
      schemaId: STUDIO_EXPERIMENT_V2_SCHEMA_ID,
      experimentId: "experiment/protocol-validation",
      version: 0,
      content: protocolValidationContentV2(
        value as ExperimentSurfaceV2,
        scenarioIds,
      ),
    }).content.surface;
  } catch (error) {
    throw protocolErrorV2(path, errorMessageForProtocolV2(error));
  }
}

function protocolValidationContentV2(
  surface: ExperimentSurfaceV2,
  scenarioIds: readonly string[],
): ExperimentContentV2 {
  return {
    modelId: "model/protocol-validation",
    surfaceSeriesId: "surface-series/protocol-validation",
    scenarios: scenarioIds.map((scenarioId, index) => ({
      scenarioId,
      label: `Protocol validation ${index + 1}`,
      capture: {
        fixture: null,
        checkpoint: {
          acceptedRevision: 0,
          acceptedTimeSec: 0,
          payload: null,
        },
      },
    })),
    surface,
  };
}

function snapshotSourceV2(
  value: unknown,
  path: string,
): "saved-experiment" | "session" {
  if (value !== "saved-experiment" && value !== "session") {
    throw protocolErrorV2(path, "must be saved-experiment or session");
  }
  return value;
}

function validateScenarioIdsV2(
  value: unknown,
  activeScenarioId: string,
  path: string,
): readonly string[] {
  const values = arrayDataValuesV2(value, path);
  if (values.length === 0) {
    throw protocolErrorV2(path, "must contain at least one Scenario ID");
  }
  const seen = new Set<string>();
  const scenarioIds = values.map((candidate, index) => {
    const scenarioId = validateStudioSimulationPortableIdV2(
      candidate,
      `${path}[${index}]`,
    );
    if (seen.has(scenarioId)) {
      throw protocolErrorV2(`${path}[${index}]`, "duplicates a Scenario ID");
    }
    seen.add(scenarioId);
    return scenarioId;
  });
  if (!seen.has(activeScenarioId)) {
    throw protocolErrorV2(path, "must include the active Scenario ID");
  }
  return Object.freeze(scenarioIds);
}

function errorMessageForProtocolV2(error: unknown): string {
  try {
    if (error instanceof Error && error.message.length > 0) {
      return error.message;
    }
    if (typeof error === "string" && error.length > 0) return error;
  } catch {
    // Hostile thrown values are reduced to one portable protocol message.
  }
  return "contains invalid authoring data";
}

function finiteScalarV2(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw protocolErrorV2(path, "must be a finite scalar number");
  }
  return value;
}

function nonnegativeFiniteNumberV2(value: unknown, path: string): number {
  const number = finiteScalarV2(value, path);
  if (number < 0 || Object.is(number, -0)) {
    throw protocolErrorV2(path, "must be a nonnegative finite number");
  }
  return number;
}

function validateInitializationTimingV2(
  value: unknown,
  path: string,
): StudioSimulationWorkerInitializationTimingV2 {
  const timing = exactDataRecordV2(value, [
    "authoringSetupMs",
    "exactRuntimeLoad",
    "executionPlanBindMs",
    "initialFrameMs",
    "sessionCreateMs",
    "totalWorkerInitializeMs",
  ], [], path);
  const exactRuntimeLoad = timing.exactRuntimeLoad === null
    ? null
    : validateExactRuntimeLoadTimingV2(
        timing.exactRuntimeLoad,
        `${path}.exactRuntimeLoad`,
      );
  const executionPlanBindMs = nonnegativeFiniteNumberV2(
    timing.executionPlanBindMs,
    `${path}.executionPlanBindMs`,
  );
  return Object.freeze({
    exactRuntimeLoad,
    authoringSetupMs: nonnegativeFiniteNumberV2(
      timing.authoringSetupMs,
      `${path}.authoringSetupMs`,
    ),
    sessionCreateMs: nonnegativeFiniteNumberV2(
      timing.sessionCreateMs,
      `${path}.sessionCreateMs`,
    ),
    initialFrameMs: nonnegativeFiniteNumberV2(
      timing.initialFrameMs,
      `${path}.initialFrameMs`,
    ),
    executionPlanBindMs,
    totalWorkerInitializeMs: nonnegativeFiniteNumberV2(
      timing.totalWorkerInitializeMs,
      `${path}.totalWorkerInitializeMs`,
    ),
  });
}

function validateExactRuntimeLoadTimingV2(
  value: unknown,
  path: string,
): ExactModelRuntimeLoadTimingV2 {
  const timing = exactDataRecordV2(value, [
    "artifactBytes",
    "artifactFetchMs",
    "cacheHit",
    "contractValidationMs",
    "moduleImportAndFactoryMs",
    "totalMs",
  ], [], path);
  if (typeof timing.cacheHit !== "boolean") {
    throw protocolErrorV2(`${path}.cacheHit`, "must be a boolean");
  }
  const artifactBytes = nonnegativeFiniteNumberV2(
    timing.artifactBytes,
    `${path}.artifactBytes`,
  );
  if (!Number.isSafeInteger(artifactBytes)) {
    throw protocolErrorV2(`${path}.artifactBytes`, "must be a safe integer");
  }
  return Object.freeze({
    cacheHit: timing.cacheHit,
    artifactBytes,
    artifactFetchMs: nonnegativeFiniteNumberV2(
      timing.artifactFetchMs,
      `${path}.artifactFetchMs`,
    ),
    moduleImportAndFactoryMs: nonnegativeFiniteNumberV2(
      timing.moduleImportAndFactoryMs,
      `${path}.moduleImportAndFactoryMs`,
    ),
    contractValidationMs: nonnegativeFiniteNumberV2(
      timing.contractValidationMs,
      `${path}.contractValidationMs`,
    ),
    totalMs: nonnegativeFiniteNumberV2(timing.totalMs, `${path}.totalMs`),
  });
}

function portableErrorMessageV2(value: unknown, path: string): string {
  if (
    typeof value !== "string"
    || value.length === 0
    || value.length > 4_096
  ) {
    throw protocolErrorV2(path, "must be a 1-4096 character string");
  }
  assertUnicodeScalarSequenceV2(value, path);
  return value;
}

const MAXIMUM_PRESENTATION_OUTPUT_COUNT_V2 = 512;

function validatePresentationAnalysisIdsV2(value: unknown): readonly string[] {
  const ids = validatePresentationOutputIdsV2(value, "$.request.presentationAnalysisIds");
  if (ids.length > 8) throw protocolErrorV2("$.request.presentationAnalysisIds", "at most eight methods are supported");
  return ids;
}

function validatePresentationAnalysesV2(value: unknown): readonly StudioSimulationAnalysisV2[] {
  const values = arrayDataValuesV2(value, "$.response.analyses");
  if (values.length > 8) throw protocolErrorV2("$.response.analyses", "at most eight methods are supported");
  const seen = new Set<string>();
  return Object.freeze(values.map((entry, index) => {
    const result = validateStudioSimulationAnalysisV2(entry, `$.response.analyses[${index}]`);
    if (seen.has(result.analysisId)) throw protocolErrorV2("$.response.analyses", "duplicate method result");
    seen.add(result.analysisId);
    return result;
  }));
}

function validatePresentationOutputIdsV2(
  value: unknown,
  path: string,
): readonly string[] {
  const values = arrayDataValuesV2(value, path);
  if (values.length > MAXIMUM_PRESENTATION_OUTPUT_COUNT_V2) {
    throw protocolErrorV2(
      path,
      `must contain at most ${MAXIMUM_PRESENTATION_OUTPUT_COUNT_V2} outputs`,
    );
  }
  const ids = new Set<string>();
  const result = values.map((entry, index) => {
    const outputId = validateStudioSimulationPortableIdV2(
      entry,
      `${path}[${index}]`,
    );
    if (ids.has(outputId)) {
      throw protocolErrorV2(`${path}[${index}]`, "must be unique");
    }
    ids.add(outputId);
    return outputId;
  });
  return Object.freeze(result);
}

function validatePresentationBatchV2(
  value: unknown,
  path: string,
  ownership: "own" | "trusted",
): StudioSimulationPresentationBatchV2 {
  const batch = exactDataRecordV2(value, [
    "acceptedRevisions",
    "acceptedTimesSec",
    "outputIds",
    "outputStates",
    "outputValues",
    "terminalFrame",
    "workerAdvanceMs",
    "workerPrepareMs",
  ], [], path);
  const outputIds = validatePresentationOutputIdsV2(
    batch.outputIds,
    `${path}.outputIds`,
  );
  const receivedAcceptedRevisions = typedArrayV2(
    batch.acceptedRevisions,
    Float64Array,
    `${path}.acceptedRevisions`,
  );
  const receivedAcceptedTimesSec = typedArrayV2(
    batch.acceptedTimesSec,
    Float64Array,
    `${path}.acceptedTimesSec`,
  );
  const receivedOutputStates = typedArrayV2(
    batch.outputStates,
    Uint8Array,
    `${path}.outputStates`,
  );
  const receivedOutputValues = typedArrayV2(
    batch.outputValues,
    Float64Array,
    `${path}.outputValues`,
  );
  // The public decoder owns its result. Copy before inspecting scalar content
  // so a caller cannot mutate a shared or otherwise aliased view between
  // validation and ownership transfer. Trusted Worker responses retain their
  // zero-copy path after the structured-clone boundary.
  const acceptedRevisions = ownership === "own"
    ? new Float64Array(receivedAcceptedRevisions)
    : receivedAcceptedRevisions;
  const acceptedTimesSec = ownership === "own"
    ? new Float64Array(receivedAcceptedTimesSec)
    : receivedAcceptedTimesSec;
  const outputStates = ownership === "own"
    ? new Uint8Array(receivedOutputStates)
    : receivedOutputStates;
  const outputValues = ownership === "own"
    ? new Float64Array(receivedOutputValues)
    : receivedOutputValues;
  const frameCount = acceptedRevisions.length;
  if (
    frameCount < 1
    || frameCount > STUDIO_SIMULATION_WORKER_MAX_ADVANCE_STEPS_V2
    || acceptedTimesSec.length !== frameCount
  ) {
    throw protocolErrorV2(
      path,
      `must contain 1-${STUDIO_SIMULATION_WORKER_MAX_ADVANCE_STEPS_V2} aligned clocks`,
    );
  }
  const scalarCount = frameCount * outputIds.length;
  if (
    outputStates.length !== scalarCount
    || outputValues.length !== scalarCount
  ) {
    throw protocolErrorV2(
      path,
      "scalar matrix dimensions must match clocks and outputIds",
    );
  }
  let priorRevision = -1;
  let priorTimeSec = -1;
  for (let index = 0; index < frameCount; index += 1) {
    const revision = acceptedRevisions[index]!;
    const timeSec = acceptedTimesSec[index]!;
    nonnegativeSafeIntegerV2(revision, `${path}.acceptedRevisions[${index}]`);
    nonnegativeFiniteNumberV2(timeSec, `${path}.acceptedTimesSec[${index}]`);
    if (revision < priorRevision || timeSec < priorTimeSec) {
      throw protocolErrorV2(path, "accepted clocks must not regress");
    }
    priorRevision = revision;
    priorTimeSec = timeSec;
  }
  for (let index = 0; index < scalarCount; index += 1) {
    const state = outputStates[index]!;
    if (state >= STUDIO_SIMULATION_PRESENTATION_OUTPUT_STATE_COUNT_V2) {
      throw protocolErrorV2(
        `${path}.outputStates[${index}]`,
        "has an invalid output state",
      );
    }
    const scalar = outputValues[index]!;
    if (
      (!Number.isFinite(scalar) && !Number.isNaN(scalar))
      || Object.is(scalar, -0)
    ) {
      throw protocolErrorV2(
        `${path}.outputValues[${index}]`,
        "must be a finite number or the null sentinel",
      );
    }
  }

  const terminalFrame = ownership === "own"
    ? validateStudioSimulationFrameV2(
        batch.terminalFrame,
        `${path}.terminalFrame`,
      )
    : validateTrustedRuntimeFrameHeaderV2(
        batch.terminalFrame,
        `${path}.terminalFrame`,
      );
  if (
    terminalFrame.acceptedRevision !== acceptedRevisions[frameCount - 1]
    || terminalFrame.acceptedTimeSec !== acceptedTimesSec[frameCount - 1]
  ) {
    throw protocolErrorV2(path, "terminal frame must match the final clock");
  }
  for (let outputIndex = 0; outputIndex < outputIds.length; outputIndex += 1) {
    const outputId = outputIds[outputIndex]!;
    const output = terminalFrame.outputs[outputId];
    if (output === undefined || Array.isArray(output.value)) {
      throw protocolErrorV2(
        `${path}.terminalFrame.outputs[${JSON.stringify(outputId)}]`,
        "must contain the selected scalar output",
      );
    }
    const matrixIndex = (frameCount - 1) * outputIds.length + outputIndex;
    const encodedValue = outputValues[matrixIndex]!;
    if (
      studioSimulationPresentationOutputStateCodeV2(output)
        !== outputStates[matrixIndex]
      || (output.value === null
        ? !Number.isNaN(encodedValue)
        : output.value !== encodedValue)
    ) {
      throw protocolErrorV2(
        `${path}.terminalFrame.outputs[${JSON.stringify(outputId)}]`,
        "must match the final scalar row",
      );
    }
  }

  const workerAdvanceMs = nonnegativeFiniteNumberV2(
    batch.workerAdvanceMs,
    `${path}.workerAdvanceMs`,
  );
  const workerPrepareMs = nonnegativeFiniteNumberV2(
    batch.workerPrepareMs,
    `${path}.workerPrepareMs`,
  );

  return Object.freeze({
    outputIds,
    acceptedRevisions,
    acceptedTimesSec,
    outputStates,
    outputValues,
    terminalFrame,
    workerAdvanceMs,
    workerPrepareMs,
  });
}

function typedArrayV2(
  value: unknown,
  constructor: Float64ArrayConstructor,
  path: string,
): Float64Array;
function typedArrayV2(
  value: unknown,
  constructor: Uint8ArrayConstructor,
  path: string,
): Uint8Array;
function typedArrayV2(
  value: unknown,
  constructor: Float64ArrayConstructor | Uint8ArrayConstructor,
  path: string,
): Float64Array | Uint8Array {
  if (!(value instanceof constructor)) {
    throw protocolErrorV2(path, `must be a ${constructor.name}`);
  }
  if (Object.getPrototypeOf(value) !== constructor.prototype) {
    throw protocolErrorV2(path, "must not use a custom prototype");
  }
  if (!(value.buffer instanceof ArrayBuffer)) {
    throw protocolErrorV2(path, "must use an owned ArrayBuffer");
  }
  if (
    "resizable" in value.buffer
    && (value.buffer as ArrayBuffer & { readonly resizable: boolean }).resizable
  ) {
    throw protocolErrorV2(path, "must not use a resizable ArrayBuffer");
  }
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== "string" || !/^(0|[1-9][0-9]*)$/.test(key)) {
      throw protocolErrorV2(path, "must not have custom properties");
    }
  }
  return value as Float64Array | Uint8Array;
}

function validateTrustedRuntimeFrameHeaderV2(
  value: unknown,
  path: string,
): StudioSimulationFrameV2 {
  const frame = exactDataRecordV2(value, [
    "acceptedRevision",
    "acceptedTimeSec",
    "inputEpoch",
    "modelId",
    "outputs",
    "runtimeSessionId",
    "scenarioId",
  ], [], path);
  validateStudioSimulationPortableIdV2(frame.modelId, `${path}.modelId`);
  validateStudioSimulationPortableIdV2(
    frame.runtimeSessionId,
    `${path}.runtimeSessionId`,
  );
  validateStudioSimulationPortableIdV2(
    frame.scenarioId,
    `${path}.scenarioId`,
  );
  nonnegativeSafeIntegerV2(frame.inputEpoch, `${path}.inputEpoch`);
  nonnegativeSafeIntegerV2(
    frame.acceptedRevision,
    `${path}.acceptedRevision`,
  );
  nonnegativeFiniteNumberV2(
    frame.acceptedTimeSec,
    `${path}.acceptedTimeSec`,
  );
  trustedPlainDataRecordV2(frame.outputs, `${path}.outputs`);
  return frame as unknown as StudioSimulationFrameV2;
}

function validateTrustedRuntimeAnalysisHeaderV2(
  value: unknown,
  path: string,
): StudioSimulationAnalysisV2 {
  const analysis = exactDataRecordV2(value, [
    "analysisId",
    "inputEpoch",
    "modelId",
    "payload",
    "runtimeSessionId",
    "scenarioId",
    "sourceAcceptedRevision",
    "sourceAcceptedTimeSec",
  ], [], path);
  validateStudioSimulationPortableIdV2(analysis.modelId, `${path}.modelId`);
  validateStudioSimulationPortableIdV2(
    analysis.runtimeSessionId,
    `${path}.runtimeSessionId`,
  );
  validateStudioSimulationPortableIdV2(
    analysis.scenarioId,
    `${path}.scenarioId`,
  );
  validateStudioSimulationPortableIdV2(
    analysis.analysisId,
    `${path}.analysisId`,
  );
  nonnegativeSafeIntegerV2(analysis.inputEpoch, `${path}.inputEpoch`);
  nonnegativeSafeIntegerV2(
    analysis.sourceAcceptedRevision,
    `${path}.sourceAcceptedRevision`,
  );
  nonnegativeFiniteNumberV2(
    analysis.sourceAcceptedTimeSec,
    `${path}.sourceAcceptedTimeSec`,
  );
  return analysis as unknown as StudioSimulationAnalysisV2;
}

function trustedPlainDataRecordV2(
  value: unknown,
  path: string,
): Record<string, unknown> {
  if (
    value === null
    || typeof value !== "object"
    || Array.isArray(value)
  ) {
    throw protocolErrorV2(path, "must be a plain data object");
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw protocolErrorV2(path, "must not use a custom prototype");
  }
  return value as Record<string, unknown>;
}

function dataRecordV2(value: unknown, path: string): Record<string, unknown> {
  if (
    value === null
    || typeof value !== "object"
    || Array.isArray(value)
  ) {
    throw protocolErrorV2(path, "must be a plain data object");
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw protocolErrorV2(path, "must not use a custom prototype");
  }
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== "string") {
      throw protocolErrorV2(path, "must not contain symbol fields");
    }
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (
      descriptor === undefined
      || !descriptor.enumerable
      || !("value" in descriptor)
    ) {
      throw protocolErrorV2(
        `${path}[${JSON.stringify(key)}]`,
        "must be an enumerable data property",
      );
    }
  }
  return value as Record<string, unknown>;
}

function exactDataRecordV2(
  value: unknown,
  required: readonly string[],
  optional: readonly string[],
  path: string,
): Record<string, unknown> {
  const record = dataRecordV2(value, path);
  const allowed = new Set<string>();
  for (const key of required) allowed.add(key);
  for (const key of optional) allowed.add(key);
  const missing: string[] = [];
  for (const key of required) {
    if (!Object.prototype.hasOwnProperty.call(record, key)) missing.push(key);
  }
  const unknown: string[] = [];
  for (const key of Object.keys(record)) {
    if (!allowed.has(key)) unknown.push(key);
  }
  if (missing.length > 0 || unknown.length > 0) {
    throw protocolErrorV2(
      path,
      `fields must match exactly (missing: ${missing.join(", ") || "none"}; `
        + `unknown: ${unknown.join(", ") || "none"})`,
    );
  }
  return record;
}

function arrayDataValuesV2(value: unknown, path: string): readonly unknown[] {
  if (!Array.isArray(value)) {
    throw protocolErrorV2(path, "must be an array");
  }
  if (Object.getPrototypeOf(value) !== Array.prototype) {
    throw protocolErrorV2(path, "array must not use a custom prototype");
  }
  const expected = new Set<string>(["length"]);
  for (let index = 0; index < value.length; index += 1) {
    expected.add(String(index));
  }
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== "string" || !expected.has(key)) {
      throw protocolErrorV2(path, "array must not have custom properties");
    }
  }
  const result: unknown[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (
      descriptor === undefined
      || !descriptor.enumerable
      || !("value" in descriptor)
    ) {
      throw protocolErrorV2(
        `${path}[${index}]`,
        "must be a dense enumerable data property",
      );
    }
    result.push(descriptor.value);
  }
  return Object.freeze(result);
}

function assertUnicodeScalarSequenceV2(value: string, path: string): void {
  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);
    if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) {
        throw protocolErrorV2(path, "contains an unpaired high surrogate");
      }
      index += 1;
    } else if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) {
      throw protocolErrorV2(path, "contains an unpaired low surrogate");
    }
  }
}

function protocolErrorV2(
  path: string,
  message: string,
): StudioSimulationWorkerProtocolErrorV2 {
  return new StudioSimulationWorkerProtocolErrorV2(path, message);
}

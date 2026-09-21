import type {
  ExperimentSurfaceV2,
  ExperimentSnapshotV2,
  ExperimentV2,
  ScenarioCheckpointV2,
} from "@/studio/contracts/v2/content";
import type {
  StudioSimulationAnalysisV2,
  StudioSimulationFrameV2,
} from "@/studio/contracts/v2/simulation";
import type { StudioJsonValueV2 } from "@/studio/contracts/v2/json";
import {
  STUDIO_SIMULATION_WORKER_PROTOCOL_V2,
  validateStudioSimulationWorkerRequestV2,
  type StudioPreparedAnalysisValidationV1,
  type StudioValidatedPreparedAnalysisV1,
  type StudioSimulationWorkerAddScenarioFromPresetInputV2,
  type StudioSimulationWorkerAdvancePresentationInputV2,
  type StudioSimulationWorkerApplyControlInputV2,
  type StudioSimulationWorkerControlResultV2,
  type StudioSimulationWorkerCreateSnapshotInputV2,
  type StudioSimulationWorkerDeleteScenarioInputV2,
  type StudioSimulationWorkerDuplicateScenarioInputV2,
  type StudioSimulationWorkerInitializeInputV2,
  type StudioSimulationWorkerInitializationTimingV2,
  type StudioSimulationWorkerReadScenariosInputV2,
  type StudioSimulationWorkerRenameScenarioInputV2,
  type StudioSimulationWorkerRequestAnalysisInputV2,
  type StudioSimulationWorkerRequestV2,
  type StudioSimulationWorkerResponseV2,
  type StudioSimulationWorkerSaveExperimentInputV2,
  type StudioSimulationWorkerScenarioCapturesV2,
  type StudioSimulationWorkerScenarioStateV2,
  type StudioSimulationWorkerSelectScenarioInputV2,
  createStudioSimulationAddScenarioFromPresetRequestV2,
  createStudioSimulationApplyControlRequestV2,
  createStudioSimulationAdvancePresentationRequestV2,
  createStudioSimulationAdvanceRequestV2,
  createStudioSimulationCreateSnapshotRequestV2,
  createStudioSimulationDeleteScenarioRequestV2,
  createStudioSimulationDisposeRequestV2,
  createStudioSimulationDuplicateScenarioRequestV2,
  createStudioSimulationInitializeRequestV2,
  createStudioSimulationReadScenariosRequestV2,
  createStudioSimulationRenameScenarioRequestV2,
  createStudioSimulationRequestAnalysisRequestV2,
  createStudioSimulationSaveExperimentRequestV2,
  createStudioSimulationSelectScenarioRequestV2,
  validateStudioSimulationWorkerResponseFromTrustedRuntimeV2,
} from "@/studio/workers/StudioSimulationWorkerProtocolV2";
import {
  materializeStudioSimulationPresentationFramesV2,
} from "@/studio/workers/StudioSimulationPresentationBatchV2";

const WORKER_RESPONSE_TIMEOUT_MS_V2 = 30_000;
// A settled analysis may spend longer than an interactive request inside one
// load point. This is an idle deadline and validated progress refreshes it.
const WORKER_ANALYSIS_IDLE_TIMEOUT_MS_V2 = 5 * 60_000;
/**
 * Snapshot admission executes a bounded public-executable protocol for every
 * Scenario. It therefore has a separate, user-configurable deadline instead
 * of inheriting the interactive RPC budget. A finite deadline ensures a wedged
 * admission always terminates the
 * Worker and rejects every pending request deterministically.
 */
const WORKER_SNAPSHOT_ADMISSION_TIMEOUT_MS_V2 = 15 * 60_000;

const ADMITTED_SNAPSHOT_COMMIT_V2 = Symbol(
  "StudioSimulationWorkerAdmittedSnapshotCommitV2",
);
const admittedSnapshotCommitsV2 = new WeakSet<object>();

/**
 * Runtime authority minted only after one correlated response from the
 * persistent Worker's sealed Snapshot authoring path.
 *
 * The private symbol prevents ordinary structural construction in TypeScript;
 * the private WeakSet makes casts, clones, and hand-built JavaScript objects
 * fail at the browser persistence boundary as well.
 */
export type StudioSimulationWorkerAdmittedSnapshotCommitV2 = Readonly<{
  snapshot: ExperimentSnapshotV2;
  [ADMITTED_SNAPSHOT_COMMIT_V2]: true;
}>;

export function assertStudioSimulationWorkerAdmittedSnapshotCommitV2(
  value: unknown,
): asserts value is StudioSimulationWorkerAdmittedSnapshotCommitV2 {
  if (
    value === null
    || typeof value !== "object"
    || !admittedSnapshotCommitsV2.has(value)
  ) {
    throw new Error(
      "Browser Snapshot persistence requires a sealed admitted Worker result",
    );
  }
}

export interface StudioSimulationWorkerTransportV2 {
  postMessage(message: unknown): void;
  terminate(): void;
  addEventListener(
    type: "message",
    listener: (event: MessageEvent<unknown>) => void,
  ): void;
  addEventListener(
    type: "error",
    listener: (event: ErrorEvent) => void,
  ): void;
  removeEventListener(
    type: "message",
    listener: (event: MessageEvent<unknown>) => void,
  ): void;
  removeEventListener(
    type: "error",
    listener: (event: ErrorEvent) => void,
  ): void;
}

export type StudioSimulationWorkerClientOptionsV2 = Readonly<{
  responseTimeoutMs?: number;
  analysisIdleTimeoutMs?: number;
  snapshotAdmissionTimeoutMs?: number;
}>;

/**
 * Correlated Worker rejection with the runtime's failure classification intact.
 *
 * A non-fatal response means the Worker proved that the rejected request left
 * its accepted exact authority unchanged. Callers may therefore keep using the
 * same client. A fatal response has already revoked that authority.
 */
export class StudioSimulationWorkerRequestErrorV2 extends Error {
  readonly fatal: boolean;

  constructor(message: string, fatal: boolean) {
    super(message);
    this.name = "StudioSimulationWorkerRequestErrorV2";
    this.fatal = fatal;
  }
}

export function isRecoverableStudioSimulationWorkerRequestErrorV2(
  error: unknown,
): error is StudioSimulationWorkerRequestErrorV2 {
  return error instanceof StudioSimulationWorkerRequestErrorV2
    && !error.fatal;
}

export type StudioSimulationWorkerPresentationTimingV2 = Readonly<{
  workerAdvanceMs: number;
  workerPrepareMs: number;
}>;

type StudioSimulationWorkerClientTestOptionsV2 = Readonly<{
  transport: StudioSimulationWorkerTransportV2;
  responseTimeoutMs?: number;
  analysisIdleTimeoutMs?: number;
  snapshotAdmissionTimeoutMs?: number;
}>;

const TEST_CLIENT_CONSTRUCTION_AUTHORITY_V2 = Symbol(
  "StudioSimulationWorkerClientTestConstructionV2",
);

type TestClientConstructionV2 = Readonly<{
  authority: typeof TEST_CLIENT_CONSTRUCTION_AUTHORITY_V2;
  transport: StudioSimulationWorkerTransportV2;
}>;

type InternalClientConstructorV2 = new (
  options: StudioSimulationWorkerClientOptionsV2,
  construction: TestClientConstructionV2,
) => StudioSimulationWorkerClientV2;

type ExpectedResponseV2 =
  | Readonly<{ kind: "prepared-analysis-validated"; modelId: string; checkpoint: ScenarioCheckpointV2 }>
  | Readonly<{
      kind: "initialized";
      modelId: string;
      runtimeSessionId: string;
      scenarioId: string;
    }>
  | Readonly<{
      kind: "advanced";
      modelId: string;
      runtimeSessionId: string;
      scenarioId: string;
      inputEpoch: number;
      minimumAcceptedRevision: number;
      minimumAcceptedTimeSec: number;
      stepCount: number;
    }>
  | Readonly<{
      kind: "presentation-advanced";
      modelId: string;
      runtimeSessionId: string;
      scenarioId: string;
      inputEpoch: number;
      minimumAcceptedRevision: number;
      minimumAcceptedTimeSec: number;
      stepCount: number;
      presentationOutputIds: readonly string[];
      presentationAnalysisIds: readonly string[];
    }>
  | Readonly<{
      kind: "control-applied";
      modelId: string;
      runtimeSessionId: string;
      scenarioId: string;
      expectedInputEpoch: number;
    }>
  | Readonly<{
      kind: "analysis-result";
      modelId: string;
      runtimeSessionId: string;
      scenarioId: string;
      analysisId: string;
      inputEpoch: number;
      sourceAcceptedRevision: number;
      sourceAcceptedTimeSec: number;
    }>
  | Readonly<{
      kind: "scenario-state";
      modelId: string;
      runtimeSessionId: string;
    }>
  | Readonly<{
      kind: "scenarios-captured";
      modelId: string;
      runtimeSessionId: string;
    }>
  | Readonly<{
      kind: "experiment-saved";
      modelId: string;
      runtimeSessionId: string;
      experimentId: string;
      surface: ExperimentSurfaceV2;
      surfaceSeriesId: string;
      expectedVersion: number | null;
      priorExperiment: ExperimentV2 | undefined;
    }>
  | Readonly<{
      kind: "snapshot-created";
      modelId: string;
      surface: ExperimentSurfaceV2;
      surfaceSeriesId: string;
      surfaceReleaseId: string;
      scenarioIds: readonly string[];
    }>
  | Readonly<{
      kind: "disposed";
    }>;

type PendingRequestV2 = {
  resolve(response: StudioSimulationWorkerResponseV2): void;
  reject(error: Error): void;
  timeout: ReturnType<typeof setTimeout>;
  timeoutMs: number;
  expected: ExpectedResponseV2;
  onAnalysisProgress?: (analysis: StudioSimulationAnalysisV2, preparation?: StudioJsonValueV2) => void;
};

export type StudioSimulationWorkerRequestAnalysisClientInputV2 =
  StudioSimulationWorkerRequestAnalysisInputV2 & Readonly<{
    onProgress?: (analysis: StudioSimulationAnalysisV2, preparation?: StudioJsonValueV2) => void;
  }>;

type ClientStateV2 =
  | "new"
  | "initializing"
  | "active"
  | "disposing"
  | "terminated";

type ScenarioOperationV2 =
  | "read-scenarios"
  | "select-scenario"
  | "add-scenario-from-preset"
  | "duplicate-scenario"
  | "rename-scenario"
  | "delete-scenario";

export class StudioSimulationWorkerClientV2 {
  readonly #worker: StudioSimulationWorkerTransportV2;
  readonly #responseTimeoutMs: number;
  readonly #analysisIdleTimeoutMs: number;
  readonly #snapshotAdmissionTimeoutMs: number;
  readonly #pending = new Map<number, PendingRequestV2>();
  #nextRequestId = 1;
  #state: ClientStateV2 = "new";
  #runtimeSessionId: string | undefined;
  #scenarioId: string | undefined;
  #scenarioIds: readonly string[] | undefined;
  #modelId: string | undefined;
  #inputEpoch: number | undefined;
  #acceptedRevision: number | undefined;
  #acceptedTimeSec: number | undefined;
  #lastPresentationTiming:
    StudioSimulationWorkerPresentationTimingV2 | undefined;
  readonly #presentationAnalyses = new Map<string, StudioSimulationAnalysisV2>();
  #lastInitializationTiming:
    StudioSimulationWorkerInitializationTimingV2 | undefined;
  #operationInFlight:
    | "validate-prepared-analysis"
    | "advance"
    | "advance-presentation"
    | "apply-control"
    | "request-analysis"
    | "read-scenarios"
    | "select-scenario"
    | "add-scenario-from-preset"
    | "duplicate-scenario"
    | "rename-scenario"
    | "delete-scenario"
    | "save-experiment"
    | "create-snapshot"
    | undefined;
  #experiment: ExperimentV2 | undefined;
  #disposePromise: Promise<void> | undefined;
  #terminationReason: string | undefined;

  /** Production construction always owns the real module Worker. */
  constructor(options?: StudioSimulationWorkerClientOptionsV2);
  constructor(
    options: StudioSimulationWorkerClientOptionsV2 = {},
    testConstruction?: TestClientConstructionV2,
  ) {
    const responseTimeoutMs = options.responseTimeoutMs
      ?? WORKER_RESPONSE_TIMEOUT_MS_V2;
    if (
      !Number.isSafeInteger(responseTimeoutMs)
      || responseTimeoutMs < 1
      || responseTimeoutMs > 300_000
    ) {
      throw new Error("simulation worker response timeout must be within [1, 300000]");
    }
    this.#responseTimeoutMs = responseTimeoutMs;
    const analysisIdleTimeoutMs = options.analysisIdleTimeoutMs
      ?? WORKER_ANALYSIS_IDLE_TIMEOUT_MS_V2;
    if (
      !Number.isSafeInteger(analysisIdleTimeoutMs)
      || analysisIdleTimeoutMs < 1
      || analysisIdleTimeoutMs > 300_000
    ) {
      throw new Error(
        "simulation worker analysis idle timeout must be within [1, 300000]",
      );
    }
    this.#analysisIdleTimeoutMs = analysisIdleTimeoutMs;
    const snapshotAdmissionTimeoutMs =
      options.snapshotAdmissionTimeoutMs
      ?? WORKER_SNAPSHOT_ADMISSION_TIMEOUT_MS_V2;
    if (
      !Number.isSafeInteger(snapshotAdmissionTimeoutMs)
      || snapshotAdmissionTimeoutMs < 1
      || snapshotAdmissionTimeoutMs > 86_400_000
    ) {
      throw new Error(
        "simulation worker Snapshot admission timeout must be within [1, 86400000]",
      );
    }
    this.#snapshotAdmissionTimeoutMs = snapshotAdmissionTimeoutMs;
    if (import.meta.env.PROD) {
      if (testConstruction !== undefined) {
        throw new Error(
          "production simulation worker construction rejects injected transport",
        );
      }
      this.#worker = new Worker(
        new URL("./StudioSimulationWorkerV2.ts", import.meta.url),
        { type: "module", name: "circleheart-studio-v2-simulation" },
      );
    } else {
      if (
        testConstruction !== undefined
        && testConstruction.authority !== TEST_CLIENT_CONSTRUCTION_AUTHORITY_V2
      ) {
        throw new Error("simulation worker test construction authority is invalid");
      }
      this.#worker = testConstruction?.transport ?? new Worker(
          new URL("./StudioSimulationWorkerV2.ts", import.meta.url),
          { type: "module", name: "circleheart-studio-v2-simulation" },
        );
    }
    this.#worker.addEventListener("message", this.#onMessage);
    this.#worker.addEventListener("error", this.#onWorkerError);
  }

  async initialize(
    input: StudioSimulationWorkerInitializeInputV2,
  ): Promise<StudioSimulationFrameV2> {
    if (this.#state !== "new") {
      throw new Error("simulation worker client cannot initialize twice");
    }
    const request = createStudioSimulationInitializeRequestV2(
      this.#allocateRequestId(),
      input,
    );
    this.#state = "initializing";
    try {
      const response = await this.#postRequest(request, {
        kind: "initialized",
        modelId: request.expectedModelId,
        runtimeSessionId: request.runtimeSessionId,
        scenarioId: request.scenarioId,
      });
      if (response.status !== "ok" || response.kind !== "initialized") {
        throw new Error("simulation worker returned another initialize response");
      }
      this.#runtimeSessionId = request.runtimeSessionId;
      this.#scenarioId = request.scenarioId;
      this.#scenarioIds = Object.freeze(
        request.authoringSeed?.experiment?.content.scenarios.map(
          ({ scenarioId }) => scenarioId,
        ) ?? [request.scenarioId],
      );
      this.#modelId = request.expectedModelId;
      this.#inputEpoch = response.frame.inputEpoch;
      this.#acceptedRevision = response.frame.acceptedRevision;
      this.#acceptedTimeSec = response.frame.acceptedTimeSec;
      this.#experiment = request.authoringSeed?.experiment;
      this.#lastInitializationTiming = response.initializationTiming;
      this.#state = "active";
      return response.frame;
    } catch (error) {
      this.#terminateWith(errorAsErrorV2(error));
      throw error;
    }
  }

  async advance(input: Readonly<{
    runtimeSessionId: string;
    scenarioId: string;
    stepCount: number;
  }>): Promise<readonly StudioSimulationFrameV2[]> {
    if (
      this.#state !== "active"
      || this.#runtimeSessionId === undefined
      || this.#scenarioId === undefined
      || this.#scenarioIds === undefined
      || this.#modelId === undefined
      || this.#inputEpoch === undefined
      || this.#acceptedRevision === undefined
      || this.#acceptedTimeSec === undefined
    ) {
      throw new Error(this.#inactiveBoundaryMessage(input.runtimeSessionId));
    }
    if (this.#operationInFlight !== undefined) {
      throw new Error("simulation worker client already has an operation in flight");
    }
    const request = createStudioSimulationAdvanceRequestV2(
      this.#allocateRequestId(),
      input,
    );
    if (
      request.runtimeSessionId !== this.#runtimeSessionId
      || request.scenarioId !== this.#scenarioId
    ) {
      throw new Error("simulation worker client session identity mismatch");
    }

    this.#operationInFlight = "advance";
    try {
      const response = await this.#postRequest(request, {
        kind: "advanced",
        modelId: this.#modelId,
        runtimeSessionId: this.#runtimeSessionId,
        scenarioId: this.#scenarioId,
        inputEpoch: this.#inputEpoch,
        minimumAcceptedRevision: this.#acceptedRevision,
        minimumAcceptedTimeSec: this.#acceptedTimeSec,
        stepCount: request.stepCount,
      });
      if (response.status !== "ok" || response.kind !== "advanced") {
        throw new Error("simulation worker returned another advance response");
      }
      const last = response.frames[response.frames.length - 1]!;
      this.#inputEpoch = last.inputEpoch;
      this.#acceptedRevision = last.acceptedRevision;
      this.#acceptedTimeSec = last.acceptedTimeSec;
      return response.frames;
    } catch (error) {
      this.#terminateWith(errorAsErrorV2(error));
      throw error;
    } finally {
      this.#operationInFlight = undefined;
    }
  }

  async advancePresentation(
    input: StudioSimulationWorkerAdvancePresentationInputV2,
  ): Promise<readonly StudioSimulationFrameV2[]> {
    if (
      this.#state !== "active"
      || this.#runtimeSessionId === undefined
      || this.#scenarioId === undefined
      || this.#scenarioIds === undefined
      || this.#modelId === undefined
      || this.#inputEpoch === undefined
      || this.#acceptedRevision === undefined
      || this.#acceptedTimeSec === undefined
    ) {
      throw new Error(this.#inactiveBoundaryMessage(input.runtimeSessionId));
    }
    if (this.#operationInFlight !== undefined) {
      throw new Error("simulation worker client already has an operation in flight");
    }
    const request = createStudioSimulationAdvancePresentationRequestV2(
      this.#allocateRequestId(),
      input,
    );
    if (
      request.runtimeSessionId !== this.#runtimeSessionId
      || request.scenarioId !== this.#scenarioId
    ) {
      throw new Error("simulation worker client session identity mismatch");
    }

    this.#operationInFlight = "advance-presentation";
    this.#lastPresentationTiming = undefined;
    try {
      const response = await this.#postRequest(request, {
        kind: "presentation-advanced",
        modelId: this.#modelId,
        runtimeSessionId: this.#runtimeSessionId,
        scenarioId: this.#scenarioId,
        inputEpoch: this.#inputEpoch,
        minimumAcceptedRevision: this.#acceptedRevision,
        minimumAcceptedTimeSec: this.#acceptedTimeSec,
        stepCount: request.stepCount,
        presentationOutputIds: request.presentationOutputIds,
        presentationAnalysisIds: request.presentationAnalysisIds ?? [],
      });
      if (response.status !== "ok" || response.kind !== "presentation-advanced") {
        throw new Error(
          "simulation worker returned another presentation advance response",
        );
      }
      const frames = materializeStudioSimulationPresentationFramesV2(
        response.batch,
      );
      this.#lastPresentationTiming = Object.freeze({
        workerAdvanceMs: response.batch.workerAdvanceMs,
        workerPrepareMs: response.batch.workerPrepareMs,
      });
      const last = frames[frames.length - 1]!;
      this.#inputEpoch = last.inputEpoch;
      this.#acceptedRevision = last.acceptedRevision;
      this.#acceptedTimeSec = last.acceptedTimeSec;
      for (const id of this.#presentationAnalyses.keys()) {
        if (!request.presentationAnalysisIds?.includes(id)) this.#presentationAnalyses.delete(id);
      }
      for (const analysis of response.analyses ?? []) this.#presentationAnalyses.set(analysis.analysisId, analysis);
      return frames;
    } catch (error) {
      this.#terminateWith(errorAsErrorV2(error));
      throw error;
    } finally {
      this.#operationInFlight = undefined;
    }
  }

  /** Latest beat summaries in the current Scenario/input epoch; never exact frame fields. */
  presentationAnalyses(): readonly StudioSimulationAnalysisV2[] {
    return Object.freeze([...this.#presentationAnalyses.values()].filter(analysis =>
      this.#state === "active" && analysis.modelId === this.#modelId
      && analysis.runtimeSessionId === this.#runtimeSessionId && analysis.scenarioId === this.#scenarioId
      && analysis.inputEpoch === this.#inputEpoch));
  }

  /** Last correlated Worker-side timing, retained only for opt-in diagnostics. */
  presentationTiming():
    StudioSimulationWorkerPresentationTimingV2 | undefined {
    return this.#lastPresentationTiming;
  }

  /** Cold initialization phases reported by the correlated Worker response. */
  initializationTiming():
    StudioSimulationWorkerInitializationTimingV2 | undefined {
    return this.#lastInitializationTiming;
  }

  async applyControl(
    input: StudioSimulationWorkerApplyControlInputV2,
  ): Promise<StudioSimulationWorkerControlResultV2> {
    if (
      this.#state !== "active"
      || this.#runtimeSessionId === undefined
      || this.#scenarioId === undefined
      || this.#modelId === undefined
      || this.#inputEpoch === undefined
      || this.#acceptedRevision === undefined
      || this.#acceptedTimeSec === undefined
    ) {
      throw new Error("simulation worker client is not active");
    }
    if (this.#operationInFlight !== undefined) {
      throw new Error("simulation worker client already has an operation in flight");
    }
    const request = createStudioSimulationApplyControlRequestV2(
      this.#allocateRequestId(),
      input,
    );
    if (
      request.runtimeSessionId !== this.#runtimeSessionId
      || request.scenarioId !== this.#scenarioId
    ) {
      throw new Error("simulation worker client session identity mismatch");
    }
    if (request.expectedInputEpoch !== this.#inputEpoch) {
      throw new Error("simulation worker client input epoch is stale");
    }

    this.#operationInFlight = "apply-control";
    try {
      const response = await this.#postRequest(request, {
        kind: "control-applied",
        modelId: this.#modelId,
        runtimeSessionId: this.#runtimeSessionId,
        scenarioId: this.#scenarioId,
        expectedInputEpoch: request.expectedInputEpoch,
      });
      if (response.status !== "ok" || response.kind !== "control-applied") {
        throw new Error("simulation worker returned another control response");
      }
      this.#inputEpoch = response.frame.inputEpoch;
      this.#acceptedRevision = response.frame.acceptedRevision;
      this.#acceptedTimeSec = response.frame.acceptedTimeSec;
      return Object.freeze({ frame: response.frame, fixture: response.fixture });
    } finally {
      this.#operationInFlight = undefined;
    }
  }

  async requestAnalysis(
    input: StudioSimulationWorkerRequestAnalysisClientInputV2,
  ): Promise<StudioSimulationAnalysisV2> {
    if (
      this.#state !== "active"
      || this.#runtimeSessionId === undefined
      || this.#scenarioId === undefined
      || this.#modelId === undefined
      || this.#inputEpoch === undefined
      || this.#acceptedRevision === undefined
      || this.#acceptedTimeSec === undefined
    ) {
      throw new Error("simulation worker client is not active");
    }
    if (this.#operationInFlight !== undefined) {
      throw new Error("simulation worker client already has an operation in flight");
    }
    const { onProgress, ...requestInput } = input;
    const request = createStudioSimulationRequestAnalysisRequestV2(
      this.#allocateRequestId(),
      requestInput,
    );
    if (
      request.runtimeSessionId !== this.#runtimeSessionId
      || request.scenarioId !== this.#scenarioId
    ) {
      throw new Error("simulation worker client session identity mismatch");
    }
    if (
      request.expectedInputEpoch !== this.#inputEpoch
      || request.expectedAcceptedRevision !== this.#acceptedRevision
      || request.expectedAcceptedTimeSec !== this.#acceptedTimeSec
    ) {
      throw new Error("simulation worker client analysis clocks are stale");
    }

    this.#operationInFlight = "request-analysis";
    try {
      const response = await this.#postRequest(request, {
        kind: "analysis-result",
        modelId: this.#modelId,
        runtimeSessionId: this.#runtimeSessionId,
        scenarioId: this.#scenarioId,
        analysisId: request.analysisId,
        inputEpoch: this.#inputEpoch,
        sourceAcceptedRevision: this.#acceptedRevision,
        sourceAcceptedTimeSec: this.#acceptedTimeSec,
      }, this.#analysisIdleTimeoutMs, onProgress);
      if (response.status !== "ok" || response.kind !== "analysis-result") {
        throw new Error("simulation worker returned another analysis response");
      }
      return response.analysis;
    } finally {
      this.#operationInFlight = undefined;
    }
  }

  async readScenarios(
    input: StudioSimulationWorkerReadScenariosInputV2,
  ): Promise<StudioSimulationWorkerScenarioCapturesV2> {
    const boundary = this.#requiredActiveBoundary(input.runtimeSessionId);
    const request = createStudioSimulationReadScenariosRequestV2(
      this.#allocateRequestId(),
      { runtimeSessionId: input.runtimeSessionId, ...boundary },
    );
    return this.#runScenarioOperation(
      "read-scenarios",
      request,
      "scenarios-captured",
    );
  }

  async selectScenario(
    input: StudioSimulationWorkerSelectScenarioInputV2,
  ): Promise<StudioSimulationWorkerScenarioStateV2> {
    const boundary = this.#requiredActiveBoundary(input.runtimeSessionId);
    const request = createStudioSimulationSelectScenarioRequestV2(
      this.#allocateRequestId(),
      { ...input, ...boundary },
    );
    return this.#runScenarioOperation(
      "select-scenario",
      request,
      "scenario-state",
    );
  }

  async addScenarioFromPreset(
    input: StudioSimulationWorkerAddScenarioFromPresetInputV2,
  ): Promise<StudioSimulationWorkerScenarioStateV2> {
    const boundary = this.#requiredActiveBoundary(input.runtimeSessionId);
    const request = createStudioSimulationAddScenarioFromPresetRequestV2(
      this.#allocateRequestId(),
      { ...input, ...boundary },
    );
    return this.#runScenarioOperation(
      "add-scenario-from-preset",
      request,
      "scenario-state",
    );
  }

  async duplicateScenario(
    input: StudioSimulationWorkerDuplicateScenarioInputV2,
  ): Promise<StudioSimulationWorkerScenarioStateV2> {
    const boundary = this.#requiredActiveBoundary(input.runtimeSessionId);
    const request = createStudioSimulationDuplicateScenarioRequestV2(
      this.#allocateRequestId(),
      { ...input, ...boundary },
    );
    return this.#runScenarioOperation(
      "duplicate-scenario",
      request,
      "scenario-state",
    );
  }

  async renameScenario(
    input: StudioSimulationWorkerRenameScenarioInputV2,
  ): Promise<StudioSimulationWorkerScenarioStateV2> {
    this.#requiredActiveBoundary(input.runtimeSessionId);
    const request = createStudioSimulationRenameScenarioRequestV2(
      this.#allocateRequestId(),
      input,
    );
    return this.#runScenarioOperation(
      "rename-scenario",
      request,
      "scenario-state",
    );
  }

  async deleteScenario(
    input: StudioSimulationWorkerDeleteScenarioInputV2,
  ): Promise<StudioSimulationWorkerScenarioStateV2> {
    const boundary = this.#requiredActiveBoundary(input.runtimeSessionId);
    const request = createStudioSimulationDeleteScenarioRequestV2(
      this.#allocateRequestId(),
      { ...input, ...boundary },
    );
    return this.#runScenarioOperation(
      "delete-scenario",
      request,
      "scenario-state",
    );
  }

  async saveExperiment(
    input: StudioSimulationWorkerSaveExperimentInputV2,
  ): Promise<ExperimentV2> {
    if (
      this.#state !== "active"
      || this.#runtimeSessionId === undefined
      || this.#scenarioId === undefined
      || this.#scenarioIds === undefined
      || this.#modelId === undefined
    ) {
      throw new Error("simulation worker client is not active");
    }
    if (this.#operationInFlight !== undefined) {
      throw new Error("simulation worker client already has an operation in flight");
    }
    const boundary = this.#requiredActiveBoundary(input.runtimeSessionId);
    const request = createStudioSimulationSaveExperimentRequestV2(
      this.#allocateRequestId(),
      {
        ...input,
        scenarioIds: this.#scenarioIds,
        expectedInputEpoch: boundary.expectedInputEpoch,
        expectedAcceptedRevision: boundary.expectedAcceptedRevision,
        expectedAcceptedTimeSec: boundary.expectedAcceptedTimeSec,
      },
    );
    if (
      request.runtimeSessionId !== this.#runtimeSessionId
      || request.scenarioId !== this.#scenarioId
    ) {
      throw new Error("simulation worker client session identity mismatch");
    }
    const priorExperiment = this.#experiment;
    if (priorExperiment === undefined) {
      if (request.expectedVersion !== null) {
        throw new Error(
          "simulation worker client first Save requires a null version",
        );
      }
    } else if (
      request.experimentId !== priorExperiment.experimentId
      || request.expectedVersion !== priorExperiment.version
    ) {
      throw new Error(
        "simulation worker client Experiment identity or version is stale",
      );
    }

    this.#operationInFlight = "save-experiment";
    try {
      const response = await this.#postRequest(request, {
        kind: "experiment-saved",
        modelId: this.#modelId,
        runtimeSessionId: this.#runtimeSessionId,
        experimentId: request.experimentId,
        surface: request.surface,
        surfaceSeriesId: request.surfaceSeriesId,
        expectedVersion: request.expectedVersion,
        priorExperiment,
      });
      if (response.status !== "ok" || response.kind !== "experiment-saved") {
        throw new Error("simulation worker returned another Experiment response");
      }
      this.#experiment = response.experiment;
      return response.experiment;
    } finally {
      this.#operationInFlight = undefined;
    }
  }

  #requiredActiveBoundary(runtimeSessionId: string): Readonly<{
    expectedActiveScenarioId: string;
    expectedInputEpoch: number;
    expectedAcceptedRevision: number;
    expectedAcceptedTimeSec: number;
  }> {
    if (
      this.#state !== "active"
      || this.#runtimeSessionId !== runtimeSessionId
      || this.#scenarioId === undefined
      || this.#inputEpoch === undefined
      || this.#acceptedRevision === undefined
      || this.#acceptedTimeSec === undefined
    ) {
      throw new Error(this.#inactiveBoundaryMessage(runtimeSessionId));
    }
    if (this.#operationInFlight !== undefined) {
      throw new Error("simulation worker client already has an operation in flight");
    }
    return Object.freeze({
      expectedActiveScenarioId: this.#scenarioId,
      expectedInputEpoch: this.#inputEpoch,
      expectedAcceptedRevision: this.#acceptedRevision,
      expectedAcceptedTimeSec: this.#acceptedTimeSec,
    });
  }

  async #runScenarioOperation(
    operation: ScenarioOperationV2,
    request: StudioSimulationWorkerRequestV2,
    expectedKind: "scenario-state",
  ): Promise<StudioSimulationWorkerScenarioStateV2>;
  async #runScenarioOperation(
    operation: ScenarioOperationV2,
    request: StudioSimulationWorkerRequestV2,
    expectedKind: "scenarios-captured",
  ): Promise<StudioSimulationWorkerScenarioCapturesV2>;
  async #runScenarioOperation(
    operation: ScenarioOperationV2,
    request: StudioSimulationWorkerRequestV2,
    expectedKind: "scenario-state" | "scenarios-captured",
  ): Promise<StudioSimulationWorkerScenarioStateV2 | StudioSimulationWorkerScenarioCapturesV2> {
    if (this.#modelId === undefined || this.#runtimeSessionId === undefined) {
      throw new Error("simulation worker client is not active");
    }
    this.#operationInFlight = operation;
    try {
      const response = await this.#postRequest(request, {
        kind: expectedKind,
        modelId: this.#modelId,
        runtimeSessionId: this.#runtimeSessionId,
      });
      if (response.status !== "ok" || response.kind !== expectedKind) {
        throw new Error("simulation worker returned another Scenario response");
      }
      if (response.kind === "scenario-state") {
        this.#scenarioId = response.state.activeScenarioId;
        this.#scenarioIds = Object.freeze(response.state.scenarios.map(
          ({ scenarioId }) => scenarioId,
        ));
        this.#inputEpoch = response.state.frame.inputEpoch;
        this.#acceptedRevision = response.state.frame.acceptedRevision;
        this.#acceptedTimeSec = response.state.frame.acceptedTimeSec;
        return response.state;
      }
      return response.captures;
    } finally {
      this.#operationInFlight = undefined;
    }
  }

  /** Pure background validation; requires no numerical session or model load. */
  async validatePreparedAnalysis(input: StudioPreparedAnalysisValidationV1): Promise<StudioValidatedPreparedAnalysisV1> {
    if (this.#operationInFlight !== undefined || (this.#state !== "new" && this.#state !== "active")) {
      throw new Error("simulation worker client is unavailable for preparation validation");
    }
    this.#operationInFlight = "validate-prepared-analysis";
    try {
      const request = validateStudioSimulationWorkerRequestV2({ ...input, protocol: STUDIO_SIMULATION_WORKER_PROTOCOL_V2,
        requestId: this.#allocateRequestId(), kind: "validate-prepared-analysis" });
      const response = await this.#postRequest(request, { kind: "prepared-analysis-validated",
        modelId: input.releaseTicket.modelId, checkpoint: input.capture.checkpoint });
      if (response.status !== "ok" || response.kind !== "prepared-analysis-validated") throw new Error("Unexpected preparation validation response");
      return response.prepared;
    } finally { this.#operationInFlight = undefined; }
  }

  async createSnapshot(
    input: StudioSimulationWorkerCreateSnapshotInputV2,
  ): Promise<StudioSimulationWorkerAdmittedSnapshotCommitV2> {
    if (
      this.#state !== "active"
      || this.#runtimeSessionId === undefined
      || this.#scenarioId === undefined
      || this.#scenarioIds === undefined
      || this.#modelId === undefined
    ) {
      throw new Error("simulation worker client is not active");
    }
    if (this.#operationInFlight !== undefined) {
      throw new Error("simulation worker client already has an operation in flight");
    }
    const boundary = this.#requiredActiveBoundary(input.runtimeSessionId);
    const request = createStudioSimulationCreateSnapshotRequestV2(
      this.#allocateRequestId(),
      {
        ...input,
        scenarioIds: this.#scenarioIds,
        expectedInputEpoch: boundary.expectedInputEpoch,
        expectedAcceptedRevision: boundary.expectedAcceptedRevision,
        expectedAcceptedTimeSec: boundary.expectedAcceptedTimeSec,
      },
    );
    if (
      request.runtimeSessionId !== this.#runtimeSessionId
      || request.scenarioId !== this.#scenarioId
    ) {
      throw new Error("simulation worker client session identity mismatch");
    }
    this.#operationInFlight = "create-snapshot";
    try {
      const response = await this.#postRequest(request, {
        kind: "snapshot-created",
        modelId: this.#modelId,
        surface: request.surface,
        surfaceSeriesId: request.surfaceSeriesId,
        surfaceReleaseId: request.surfaceReleaseId,
        scenarioIds: request.scenarioIds,
      }, this.#snapshotAdmissionTimeoutMs);
      if (response.status !== "ok" || response.kind !== "snapshot-created") {
        throw new Error("simulation worker returned another Snapshot response");
      }
      const admittedCommit = {
        snapshot: response.snapshot,
      } as StudioSimulationWorkerAdmittedSnapshotCommitV2;
      Object.defineProperty(admittedCommit, ADMITTED_SNAPSHOT_COMMIT_V2, {
        value: true,
        enumerable: false,
        configurable: false,
        writable: false,
      });
      Object.freeze(admittedCommit);
      admittedSnapshotCommitsV2.add(admittedCommit);
      return admittedCommit;
    } finally {
      this.#operationInFlight = undefined;
    }
  }

  dispose(runtimeSessionId: string): Promise<void> {
    if (this.#disposePromise !== undefined) return this.#disposePromise;
    if (this.#state === "terminated") return Promise.resolve();
    if (this.#state === "new" || this.#state === "initializing") {
      this.#terminateWith(new Error("simulation worker client disposed before activation"));
      return Promise.resolve();
    }
    if (this.#operationInFlight !== undefined) {
      this.#terminateWith(new Error("simulation worker client disposed during an operation"));
      return Promise.resolve();
    }
    if (
      this.#state !== "active"
      || this.#runtimeSessionId !== runtimeSessionId
    ) {
      return Promise.reject(
        new Error("simulation worker client dispose identity mismatch"),
      );
    }
    const request = createStudioSimulationDisposeRequestV2(
      this.#allocateRequestId(),
      runtimeSessionId,
    );
    this.#state = "disposing";
    const disposePromise = this.#postRequest(request, { kind: "disposed" })
      .then((response) => {
        if (response.status !== "ok" || response.kind !== "disposed") {
          throw new Error("simulation worker returned another dispose response");
        }
      })
      .finally(() => {
        this.#terminateWith(new Error("simulation worker client disposed"));
      });
    this.#disposePromise = disposePromise;
    return disposePromise;
  }

  terminate(): void {
    this.#terminateWith(new Error("simulation worker client terminated"));
  }

  #allocateRequestId(): number {
    if (!Number.isSafeInteger(this.#nextRequestId)) {
      this.#terminateWith(new Error("simulation worker requestId space exhausted"));
      throw new Error("simulation worker requestId space exhausted");
    }
    const requestId = this.#nextRequestId;
    this.#nextRequestId += 1;
    return requestId;
  }

  #postRequest(
    request: StudioSimulationWorkerRequestV2,
    expected: ExpectedResponseV2,
    timeoutMs = this.#responseTimeoutMs,
    onAnalysisProgress?: (analysis: StudioSimulationAnalysisV2, preparation?: StudioJsonValueV2) => void,
  ): Promise<StudioSimulationWorkerResponseV2> {
    if (this.#state === "terminated") {
      return Promise.reject(new Error("simulation worker client is terminated"));
    }
    return new Promise((resolve, reject) => {
      const timeout = this.#scheduleRequestTimeout(request.requestId, timeoutMs);
      this.#pending.set(request.requestId, {
        resolve,
        reject,
        timeout,
        timeoutMs,
        expected,
        onAnalysisProgress,
      });
      try {
        this.#worker.postMessage(request);
      } catch (error) {
        this.#terminateWith(errorAsErrorV2(error));
      }
    });
  }

  readonly #onMessage = (event: MessageEvent<unknown>): void => {
    let response: StudioSimulationWorkerResponseV2;
    try {
      response = validateStudioSimulationWorkerResponseFromTrustedRuntimeV2(
        event.data,
      );
    } catch (error) {
      this.#terminateWith(errorAsErrorV2(error));
      return;
    }
    const pending = this.#pending.get(response.requestId);
    if (pending === undefined) {
      this.#terminateWith(new Error(
        `simulation worker response ${response.requestId} has no pending request`,
      ));
      return;
    }
    if (response.status === "error") {
      const error = new StudioSimulationWorkerRequestErrorV2(
        response.message,
        response.fatal,
      );
      this.#settlePending(response.requestId);
      pending.reject(error);
      if (response.fatal) this.#terminateWith(error);
      return;
    }
    if (response.kind === "analysis-progress") {
      try {
        if (pending.expected.kind !== "analysis-result") {
          throw new Error(
            "simulation worker emitted analysis progress for another request",
          );
        }
        assertExpectedAnalysisV2(response.analysis, pending.expected);
        this.#refreshPendingTimeout(response.requestId, pending);
        if (response.preparation === undefined) pending.onAnalysisProgress?.(response.analysis);
        else pending.onAnalysisProgress?.(response.analysis, response.preparation);
      } catch (error) {
        this.#terminateWith(errorAsErrorV2(error));
      }
      return;
    }
    try {
      assertExpectedResponseV2(response, pending.expected);
    } catch (error) {
      this.#terminateWith(errorAsErrorV2(error));
      return;
    }
    this.#settlePending(response.requestId);
    pending.resolve(response);
  };

  #scheduleRequestTimeout(
    requestId: number,
    timeoutMs: number,
  ): ReturnType<typeof setTimeout> {
    return setTimeout(() => {
      if (!this.#pending.has(requestId)) return;
      this.#terminateWith(new Error(
        `simulation worker request ${requestId} timed out`,
      ));
    }, timeoutMs);
  }

  #refreshPendingTimeout(
    requestId: number,
    pending: PendingRequestV2,
  ): void {
    clearTimeout(pending.timeout);
    pending.timeout = this.#scheduleRequestTimeout(
      requestId,
      pending.timeoutMs,
    );
  }

  readonly #onWorkerError = (event: ErrorEvent): void => {
    let message = "simulation worker terminated with an error";
    try {
      if (typeof event.message === "string" && event.message.length > 0) {
        message = event.message;
      }
    } catch {
      // An invalid transport event is still terminal.
    }
    this.#terminateWith(new Error(message));
  };

  #settlePending(requestId: number): void {
    const pending = this.#pending.get(requestId);
    if (pending === undefined) return;
    this.#pending.delete(requestId);
    clearTimeout(pending.timeout);
  }

  #terminateWith(error: Error): void {
    if (this.#state === "terminated") return;
    this.#terminationReason = error.message;
    this.#state = "terminated";
    this.#lastPresentationTiming = undefined;
    this.#lastInitializationTiming = undefined;
    this.#presentationAnalyses.clear();
    try {
      this.#worker.removeEventListener("message", this.#onMessage);
    } catch {
      // Continue terminal cleanup even if an injected transport is malformed.
    }
    try {
      this.#worker.removeEventListener("error", this.#onWorkerError);
    } catch {
      // Continue terminal cleanup even if an injected transport is malformed.
    }
    try {
      this.#worker.terminate();
    } finally {
      for (const pending of this.#pending.values()) {
        clearTimeout(pending.timeout);
        pending.reject(error);
      }
      this.#pending.clear();
    }
  }

  #inactiveBoundaryMessage(runtimeSessionId: string): string {
    const missing = [
      this.#scenarioId === undefined ? "scenarioId" : null,
      this.#inputEpoch === undefined ? "inputEpoch" : null,
      this.#acceptedRevision === undefined ? "acceptedRevision" : null,
      this.#acceptedTimeSec === undefined ? "acceptedTimeSec" : null,
    ].filter((field): field is string => field !== null);
    const reason = this.#terminationReason === undefined
      ? "none"
      : this.#terminationReason;
    return "simulation worker client is not active"
      + ` (state=${this.#state}, sessionMatch=${
        this.#runtimeSessionId === runtimeSessionId
      }, missing=${missing.join(",") || "none"}, termination=${reason})`;
  }
}

/**
 * Test-only composition seam for protocol/client adversarial tests. Production
 * builds replace these environment values with constants. Requiring test mode
 * and a non-production build also fails closed for an accidental
 * `vite build --mode test` release.
 */
export function createStudioSimulationWorkerClientForTestV2(
  options: StudioSimulationWorkerClientTestOptionsV2,
): StudioSimulationWorkerClientV2 {
  if (import.meta.env.MODE !== "test" || import.meta.env.PROD) {
    throw new Error(
      "simulation worker transport injection is available only in test mode",
    );
  }
  const { transport, ...timeouts } = options;
  return new (
    StudioSimulationWorkerClientV2 as unknown as InternalClientConstructorV2
  )(timeouts, {
    authority: TEST_CLIENT_CONSTRUCTION_AUTHORITY_V2,
    transport,
  });
}

function assertExpectedResponseV2(
  response: Exclude<StudioSimulationWorkerResponseV2, { status: "error" }>,
  expected: ExpectedResponseV2,
): void {
  if (response.kind !== expected.kind) {
    throw new Error(
      `simulation worker response kind mismatch: expected ${expected.kind}`,
    );
  }
  if (response.kind === "prepared-analysis-validated" && expected.kind === "prepared-analysis-validated") {
    const analysis = response.prepared.analysis;
    if (analysis.modelId !== expected.modelId || analysis.inputEpoch !== 0
      || analysis.sourceAcceptedRevision !== expected.checkpoint.acceptedRevision
      || analysis.sourceAcceptedTimeSec !== expected.checkpoint.acceptedTimeSec) {
      throw new Error("Prepared analysis source mismatch");
    }
    return;
  }
  if (response.kind === "initialized" && expected.kind === "initialized") {
    assertFrameIdentityV2(
      response.frame,
      expected.runtimeSessionId,
      expected.scenarioId,
      expected.modelId,
    );
    return;
  }
  if (response.kind === "advanced" && expected.kind === "advanced") {
    if (response.frames.length !== expected.stepCount) {
      throw new Error("simulation worker advance frame count mismatch");
    }
    let acceptedRevision = expected.minimumAcceptedRevision;
    let acceptedTimeSec = expected.minimumAcceptedTimeSec;
    for (const frame of response.frames) {
      assertFrameIdentityV2(
        frame,
        expected.runtimeSessionId,
        expected.scenarioId,
        expected.modelId,
      );
      if (
        frame.inputEpoch !== expected.inputEpoch
        || frame.acceptedRevision < acceptedRevision
        || frame.acceptedTimeSec < acceptedTimeSec
      ) {
        throw new Error("simulation worker advance frame sequence regressed");
      }
      acceptedRevision = frame.acceptedRevision;
      acceptedTimeSec = frame.acceptedTimeSec;
    }
    return;
  }
  if (
    response.kind === "presentation-advanced"
    && expected.kind === "presentation-advanced"
  ) {
    const { batch } = response;
    if (
      batch.acceptedRevisions.length !== expected.stepCount
      || batch.acceptedTimesSec.length !== expected.stepCount
      || batch.outputIds.length !== expected.presentationOutputIds.length
      || batch.outputIds.some(
        (outputId, index) =>
          outputId !== expected.presentationOutputIds[index],
      )
    ) {
      throw new Error("simulation worker presentation batch shape mismatch");
    }
    assertFrameIdentityV2(
      batch.terminalFrame,
      expected.runtimeSessionId,
      expected.scenarioId,
      expected.modelId,
    );
    let acceptedRevision = expected.minimumAcceptedRevision;
    let acceptedTimeSec = expected.minimumAcceptedTimeSec;
    for (let index = 0; index < expected.stepCount; index += 1) {
      const revision = batch.acceptedRevisions[index]!;
      const timeSec = batch.acceptedTimesSec[index]!;
      if (
        revision < acceptedRevision
        || timeSec < acceptedTimeSec
      ) {
        throw new Error(
          "simulation worker presentation batch sequence regressed",
        );
      }
      acceptedRevision = revision;
      acceptedTimeSec = timeSec;
    }
    if (batch.terminalFrame.inputEpoch !== expected.inputEpoch) {
      throw new Error("simulation worker presentation input epoch changed");
    }
    for (const analysis of response.analyses ?? []) {
      if (!expected.presentationAnalysisIds.includes(analysis.analysisId)
        || analysis.modelId !== expected.modelId || analysis.runtimeSessionId !== expected.runtimeSessionId
        || analysis.scenarioId !== expected.scenarioId || analysis.inputEpoch !== expected.inputEpoch
        || analysis.sourceAcceptedRevision < expected.minimumAcceptedRevision
        || analysis.sourceAcceptedRevision > batch.terminalFrame.acceptedRevision
        || analysis.sourceAcceptedTimeSec < expected.minimumAcceptedTimeSec
        || analysis.sourceAcceptedTimeSec > batch.terminalFrame.acceptedTimeSec) {
        throw new Error("simulation worker presentation analysis correlation mismatch");
      }
    }
    return;
  }
  if (
    response.kind === "control-applied"
    && expected.kind === "control-applied"
  ) {
    assertFrameIdentityV2(
      response.frame,
      expected.runtimeSessionId,
      expected.scenarioId,
      expected.modelId,
    );
    if (
      response.frame.inputEpoch !== expected.expectedInputEpoch + 1
    ) {
      throw new Error("simulation worker control frame sequence is invalid");
    }
    return;
  }
  if (
    response.kind === "analysis-result"
    && expected.kind === "analysis-result"
  ) {
    assertExpectedAnalysisV2(response.analysis, expected);
    return;
  }
  if (
    response.kind === "experiment-saved"
    && expected.kind === "experiment-saved"
  ) {
    const experiment = response.experiment;
    const expectedVersion = expected.expectedVersion === null
      ? 0
      : expected.expectedVersion + 1;
    if (
      experiment.experimentId !== expected.experimentId
      || experiment.version !== expectedVersion
      || experiment.content.modelId !== expected.modelId
      || experiment.content.surfaceSeriesId !== expected.surfaceSeriesId
      || experiment.content.scenarios.length < 1
      || !samePortableValueV2(experiment.content.surface, expected.surface)
    ) {
      throw new Error(
        "simulation worker saved Experiment response correlation mismatch",
      );
    }
    if (
      expected.priorExperiment !== undefined
      && experiment.content.modelId
        !== expected.priorExperiment.content.modelId
    ) {
      throw new Error(
        "simulation worker saved Experiment response changed modelId",
      );
    }
    return;
  }
  if (
    response.kind === "scenario-state"
    && expected.kind === "scenario-state"
  ) {
    assertFrameIdentityV2(
      response.state.frame,
      expected.runtimeSessionId,
      response.state.activeScenarioId,
      expected.modelId,
    );
    return;
  }
  if (
    response.kind === "scenarios-captured"
    && expected.kind === "scenarios-captured"
  ) {
    if (
      response.captures.scenarios.length < 1
      || !response.captures.scenarios.some(
        ({ scenarioId }) =>
          scenarioId === response.captures.activeScenarioId,
      )
    ) {
      throw new Error(
        "simulation worker captured Scenario response correlation mismatch",
      );
    }
    return;
  }
  if (
    response.kind === "snapshot-created"
    && expected.kind === "snapshot-created"
  ) {
    const { snapshot } = response;
    const snapshotScenarioIds = snapshot.content.scenarios.map(
      ({ scenarioId }) => scenarioId,
    );
    if (
      snapshot.content.modelId !== expected.modelId
      || snapshot.content.surfaceSeriesId !== expected.surfaceSeriesId
      || snapshot.surfaceReleaseId !== expected.surfaceReleaseId
      || !samePortableValueV2(snapshot.content.surface, expected.surface)
      || !samePortableValueV2(snapshotScenarioIds, expected.scenarioIds)
    ) {
      throw new Error(
        "simulation worker Snapshot response correlation mismatch",
      );
    }
  }
}

function assertExpectedAnalysisV2(
  analysis: StudioSimulationAnalysisV2,
  expected: Extract<ExpectedResponseV2, { kind: "analysis-result" }>,
): void {
  if (
    analysis.modelId !== expected.modelId
    || analysis.runtimeSessionId !== expected.runtimeSessionId
    || analysis.scenarioId !== expected.scenarioId
    || analysis.analysisId !== expected.analysisId
    || analysis.inputEpoch !== expected.inputEpoch
    || analysis.sourceAcceptedRevision !== expected.sourceAcceptedRevision
    || analysis.sourceAcceptedTimeSec !== expected.sourceAcceptedTimeSec
  ) {
    throw new Error(
      "simulation worker analysis result identity or clocks mismatch",
    );
  }
}

function assertFrameIdentityV2(
  frame: StudioSimulationFrameV2,
  runtimeSessionId: string,
  scenarioId: string,
  modelId?: string,
): void {
  if (
    frame.runtimeSessionId !== runtimeSessionId
    || frame.scenarioId !== scenarioId
    || (modelId !== undefined && frame.modelId !== modelId)
  ) {
    throw new Error("simulation worker response frame identity mismatch");
  }
}

function samePortableValueV2(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (
    left === null
    || right === null
    || typeof left !== "object"
    || typeof right !== "object"
  ) {
    return false;
  }
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left)
      && Array.isArray(right)
      && left.length === right.length
      && left.every((value, index) =>
        samePortableValueV2(value, right[index]));
  }
  const leftRecord = left as Record<string, unknown>;
  const rightRecord = right as Record<string, unknown>;
  const leftKeys = Object.keys(leftRecord).sort();
  const rightKeys = Object.keys(rightRecord).sort();
  return leftKeys.length === rightKeys.length
    && leftKeys.every((key, index) =>
      key === rightKeys[index]
      && samePortableValueV2(leftRecord[key], rightRecord[key]));
}

function errorAsErrorV2(error: unknown): Error {
  try {
    if (error instanceof Error) return error;
    if (typeof error === "string") return new Error(error);
  } catch {
    // Hostile thrown values must not interrupt terminal cleanup.
  }
  return new Error("simulation worker request failed");
}

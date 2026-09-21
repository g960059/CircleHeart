import type {
  ExperimentScenarioV2,
  ScenarioCheckpointV2,
} from "@/studio/contracts/v2/content";
import type { StudioJsonValueV2 } from "@/studio/contracts/v2/json";
import type {
  StudioModelWorkerReleaseTicketV2,
} from "@/studio/contracts/v2/release";
import {
  validateStudioSimulationAnalysisV2,
  validateStudioSimulationPortableIdV2,
  validateStudioSimulationScenarioInputV2,
  type StudioSimulationAnalysisExecutionPlanResolverV2,
  type StudioSimulationAnalysisV2,
  type StudioSimulationFrameV2,
} from "@/studio/contracts/v2/simulation";
import { StudioSimulationWorkerClientV2 } from
  "@/studio/workers/StudioSimulationWorkerClientV2";
import type {
  StudioSimulationWorkerApplyControlInputV2,
  StudioSimulationWorkerControlResultV2,
  StudioSimulationWorkerInitializationTimingV2,
  StudioSimulationWorkerRequestAnalysisInputV2,
  StudioSimulationWorkerScenarioCapturesV2,
  StudioSimulationWorkerScenarioDescriptorV2,
  StudioSimulationWorkerScenarioStateV2,
} from "@/studio/workers/StudioSimulationWorkerProtocolV2";

import {
  WorkbenchGroupTimeConductorV3,
  type WorkbenchGroupPlaybackRateStateV3,
  type WorkbenchGroupTimeConductorDependenciesV3,
} from "./WorkbenchGroupTimeConductorV3";
import {
  incrementWorkbenchPerformanceCounterV3,
  recordWorkbenchPerformanceDurationV3,
  recordWorkbenchPerformanceEventIntervalV3,
  recordWorkbenchPerformanceValueV3,
  workbenchPerformanceDiagnosticsEnabledV3,
  workbenchPerformanceNowV3,
} from "./WorkbenchPerformanceDiagnosticsV3";
import {
  resolveWorkbenchPresentationProfileV3,
  type WorkbenchPresentationProfileV3,
} from "../presentation/WorkbenchPresentationProfileV3";
import type {
  WorkbenchBackgroundJobHandleV3,
  WorkbenchBackgroundWorkerPoolPortV3,
} from "./WorkbenchBackgroundWorkerPoolV3";
import {
  WorkbenchScenarioSteadyCandidateCoordinatorV3,
  type WorkbenchSteadyCandidateSourceV3,
} from "./WorkbenchScenarioSteadyCandidateCoordinatorV3";
import { randomPortableTokenV3 } from "./randomPortableTokenV3";

export type WorkbenchParallelScenarioSeedV3 = Readonly<{
  scenarioId: string;
  label: string;
  fixture: StudioJsonValueV2;
  checkpoint?: ScenarioCheckpointV2;
}>;

export type WorkbenchParallelScenarioRuntimeClientV3 = Pick<
  StudioSimulationWorkerClientV2,
  | "advance"
  | "advancePresentation"
  | "applyControl"
  | "initialize"
  | "readScenarios"
  | "requestAnalysis"
  | "terminate"
> & Readonly<{
  initializationTiming?: StudioSimulationWorkerClientV2[
    "initializationTiming"
  ];
  presentationTiming?: StudioSimulationWorkerClientV2["presentationTiming"];
  presentationAnalyses?: StudioSimulationWorkerClientV2["presentationAnalyses"];
}>;

type WorkbenchParallelScenarioTimeConductorV3 = Pick<
  WorkbenchGroupTimeConductorV3<StudioSimulationFrameV2>,
  | "dispose"
  | "lanesChanged"
  | "pause"
  | "play"
  | "playbackRateState"
  | "running"
  | "setPlaybackRate"
  | "terminate"
>;

type WorkbenchParallelScenarioLaneV3 = {
  descriptor: StudioSimulationWorkerScenarioDescriptorV2;
  runtimeSessionId: string;
  client: WorkbenchParallelScenarioRuntimeClientV3;
  latestFrame: StudioSimulationFrameV2;
  completeOutputIds: ReadonlySet<string>;
  preparedAnalysis: Promise<StudioSimulationAnalysisV2 | null>;
  initialInputEpoch: number;
  capturedBoundary?: Readonly<{
    frame: StudioSimulationFrameV2;
    promise: Promise<ExperimentScenarioV2["capture"]>;
  }>;
};

export type WorkbenchParallelScenarioRuntimeDependenciesV3 = Readonly<{
  expectedModelId: string;
  releaseTicket: StudioModelWorkerReleaseTicketV2;
  onFrames(frames: readonly StudioSimulationFrameV2[]): void;
  onError(error: Error): void;
  createClient?: (
    scenarioId: string,
  ) => WorkbenchParallelScenarioRuntimeClientV3;
  createAnalysisClient?: (
    scenarioId: string,
    analysisPartition?: string,
  ) => WorkbenchParallelScenarioRuntimeClientV3;
  backgroundWorkerPool?: WorkbenchBackgroundWorkerPoolPortV3;
  resolveAnalysisExecutionPlan?:
    StudioSimulationAnalysisExecutionPlanResolverV2;
  createTimeConductor?: (
    dependencies:
      WorkbenchGroupTimeConductorDependenciesV3<StudioSimulationFrameV2>,
  ) => WorkbenchParallelScenarioTimeConductorV3;
  createRuntimeSessionId?: (scenarioId: string) => string;
  presentationProfile?: WorkbenchPresentationProfileV3;
  /** Current authored scalar signals needed between complete terminal frames. */
  presentationOutputIds?: () => ReadonlySet<string> | readonly string[];
  presentationAnalysisIds?: () => readonly string[];
  /** Only qualified, exact-launch-bound packages may be supplied here. */
  loadPreparedAnalysis?: (seed: WorkbenchParallelScenarioSeedV3) => Promise<StudioSimulationAnalysisV2 | null>;
  onPlaybackRateChange?(state: WorkbenchGroupPlaybackRateStateV3): void;
}>;

type ParallelRuntimeStateV3 =
  | "new"
  | "initializing"
  | "active"
  | "terminated";

/**
 * Runtime-only pool with one persistent numerical Worker per Scenario.
 *
 * No lane identity or playback status crosses the durable boundary. Exact
 * captures are gathered only on an explicit authoring command and are then
 * handed to the short-lived authoring/qualification coordinator.
 */
export class WorkbenchParallelScenarioRuntimeV3 {
  readonly #expectedModelId: string;
  readonly #releaseTicket: StudioModelWorkerReleaseTicketV2;
  readonly #onFrames: (frames: readonly StudioSimulationFrameV2[]) => void;
  readonly #onError: (error: Error) => void;
  readonly #createClient: (
    scenarioId: string,
  ) => WorkbenchParallelScenarioRuntimeClientV3;
  readonly #createAnalysisClient: (
    scenarioId: string,
    analysisPartition?: string,
  ) => WorkbenchParallelScenarioRuntimeClientV3;
  readonly #backgroundWorkerPool:
    WorkbenchBackgroundWorkerPoolPortV3 | undefined;
  readonly #steadyCandidates:
    WorkbenchScenarioSteadyCandidateCoordinatorV3 | undefined;
  readonly #resolveAnalysisExecutionPlan:
    StudioSimulationAnalysisExecutionPlanResolverV2;
  readonly #timeConductor: WorkbenchParallelScenarioTimeConductorV3;
  readonly #createRuntimeSessionId: (scenarioId: string) => string;
  readonly #presentationProfile: WorkbenchPresentationProfileV3;
  readonly #presentationOutputIds:
    () => ReadonlySet<string> | readonly string[];
  readonly #presentationAnalysisIds: () => readonly string[];
  readonly #loadPreparedAnalysis: WorkbenchParallelScenarioRuntimeDependenciesV3["loadPreparedAnalysis"];
  readonly #lanes = new Map<string, WorkbenchParallelScenarioLaneV3>();
  readonly #analysisClients = new Set<
    WorkbenchParallelScenarioRuntimeClientV3
  >();
  readonly #analysisJobsByScenario = new Map<
    string,
    Set<WorkbenchBackgroundJobHandleV3<unknown>>
  >();
  readonly #pendingScenarioIds = new Set<string>();
  readonly #scenarioPauseLeaseCounts = new Map<string, number>();
  readonly #pendingControlPresentation = new Map<string, StudioSimulationFrameV2>();
  readonly #controlPresentationWaiters = new Set<() => void>();
  #state: ParallelRuntimeStateV3 = "new";
  #activeScenarioId: string | null = null;
  #playing = false;
  #foregroundCapacityLeases = 0;
  #failed = false;

  constructor(dependencies: WorkbenchParallelScenarioRuntimeDependenciesV3) {
    this.#expectedModelId = dependencies.expectedModelId;
    this.#releaseTicket = dependencies.releaseTicket;
    this.#onFrames = dependencies.onFrames;
    this.#onError = dependencies.onError;
    this.#createClient = dependencies.createClient
      ?? (() => new StudioSimulationWorkerClientV2());
    this.#createAnalysisClient = dependencies.createAnalysisClient
      ?? (() => new StudioSimulationWorkerClientV2());
    this.#backgroundWorkerPool = dependencies.backgroundWorkerPool;
    this.#steadyCandidates = dependencies.backgroundWorkerPool === undefined
      ? undefined
      : new WorkbenchScenarioSteadyCandidateCoordinatorV3(
          dependencies.backgroundWorkerPool,
        );
    this.#resolveAnalysisExecutionPlan = dependencies.resolveAnalysisExecutionPlan
      ?? (() => null);
    this.#createRuntimeSessionId = dependencies.createRuntimeSessionId
      ?? (() => `workbench-lane-${randomPortableTokenV3()}`);
    this.#presentationProfile = dependencies.presentationProfile
      ?? resolveWorkbenchPresentationProfileV3();
    this.#presentationOutputIds = dependencies.presentationOutputIds
      ?? (() => Object.freeze([]));
    this.#presentationAnalysisIds = dependencies.presentationAnalysisIds
      ?? (() => Object.freeze([]));
    this.#loadPreparedAnalysis = dependencies.loadPreparedAnalysis;
    const createTimeConductor = dependencies.createTimeConductor
      ?? ((conductorDependencies) =>
        new WorkbenchGroupTimeConductorV3(conductorDependencies));
    this.#timeConductor = createTimeConductor({
      lanes: () => [...this.#lanes.values()].map((lane) => Object.freeze({
        laneId: lane.descriptor.scenarioId,
        acceptedTimeSec: lane.latestFrame.acceptedTimeSec,
        advance: (stepCount) => this.#advanceLane(lane, stepCount),
        frameAcceptedTimeSec: (frame) => frame.acceptedTimeSec,
      })),
      onFrames: (frames) => this.#publishFrames(frames),
      onError: (error) => this.#fail(error),
      onPlaybackRateChange: (state) => {
        this.#backgroundWorkerPool?.setForegroundPlaybackState(state);
        dependencies.onPlaybackRateChange?.(state);
      },
      // Measure the pace this visible Workbench can actually sustain, including
      // its background load. Existing analysis can survive a Scenario addition;
      // waiting for an idle pool would hide available acceleration for minutes.
      capacityMeasurementEligible: foregroundDocumentVisibleV3,
      batchSteps: this.#presentationProfile.maximumBatchSteps,
      presentationIntervalMs:
        this.#presentationProfile.presentationIntervalMs,
      maximumPresentationFramesPerLane:
        this.#presentationProfile.maximumPresentationBatchFrames,
    });
    this.#backgroundWorkerPool?.setForegroundPlaybackState(
      this.#timeConductor.playbackRateState(),
    );
  }

  async initialize(input: Readonly<{
    scenarios: readonly WorkbenchParallelScenarioSeedV3[];
    activeScenarioId: string;
  }>): Promise<StudioSimulationWorkerScenarioStateV2> {
    if (this.#state !== "new") {
      throw new Error("parallel Scenario runtime cannot initialize twice");
    }
    validateScenarioSeedsV3(input.scenarios, input.activeScenarioId);
    this.#state = "initializing";
    // Reserve the live-lane budget before module Workers start. This prevents
    // speculative settlement from filling the device while initial Scenario
    // lanes are coming online.
    this.#syncBackgroundWorkerBudget(input.scenarios.length);
    const results = await Promise.allSettled(input.scenarios.map((seed) =>
      this.#createLane(seed)));
    const failures = results.filter(
      (result): result is PromiseRejectedResult => result.status === "rejected",
    );
    if (failures.length > 0 || this.#isTerminated()) {
      for (const result of results) {
        if (result.status === "fulfilled") terminateLaneV3(result.value);
      }
      this.#state = "terminated";
      this.#syncBackgroundWorkerBudget(0);
      const reason = failures[0]?.reason;
      throw errorAsErrorV3(
        reason ?? "parallel Scenario runtime was terminated during initialization",
      );
    }
    for (const result of results) {
      if (result.status === "fulfilled") {
        this.#lanes.set(result.value.descriptor.scenarioId, result.value);
      }
    }
    this.#timeConductor.lanesChanged();
    this.#syncBackgroundWorkerBudget();
    this.#activeScenarioId = input.activeScenarioId;
    this.#state = "active";
    return this.currentState();
  }

  get playing(): boolean {
    return this.#playing;
  }

  get scenarioCount(): number {
    return this.#lanes.size;
  }

  playbackRateState(): WorkbenchGroupPlaybackRateStateV3 {
    return this.#timeConductor.playbackRateState();
  }

  setPlaybackRate(
    rate: number,
  ): WorkbenchGroupPlaybackRateStateV3 {
    this.#requireActive();
    return this.#timeConductor.setPlaybackRate(rate);
  }

  descriptors(): readonly StudioSimulationWorkerScenarioDescriptorV2[] {
    this.#requireActive();
    return Object.freeze([...this.#lanes.values()].map(({ descriptor }) =>
      descriptor));
  }

  activeFrame(): StudioSimulationFrameV2 {
    const activeScenarioId = this.#requiredActiveScenarioId();
    return this.#requiredLane(activeScenarioId).latestFrame;
  }

  latestFrame(scenarioId: string): StudioSimulationFrameV2 {
    this.#requireActive();
    return this.#requiredLane(scenarioId).latestFrame;
  }

  /**
   * Non-throwing frame lookup for asynchronous presentation callbacks.
   * A queued visual slice may arrive after its Scenario was deleted; that is
   * normal cancellation, not a runtime failure.
   */
  maybeLatestFrame(scenarioId: string): StudioSimulationFrameV2 | undefined {
    if (this.#state !== "active") return undefined;
    return this.#lanes.get(scenarioId)?.latestFrame;
  }

  currentState(): StudioSimulationWorkerScenarioStateV2 {
    return Object.freeze({
      activeScenarioId: this.#requiredActiveScenarioId(),
      scenarios: this.descriptors(),
      frame: this.activeFrame(),
    });
  }

  selectScenario(scenarioId: string): StudioSimulationWorkerScenarioStateV2 {
    this.#requireActive();
    this.#requiredLane(scenarioId);
    this.#activeScenarioId = scenarioId;
    return this.currentState();
  }

  async addScenario(
    seed: WorkbenchParallelScenarioSeedV3,
  ): Promise<StudioSimulationWorkerScenarioStateV2> {
    this.#requireActive();
    if (
      this.#lanes.has(seed.scenarioId)
      || this.#pendingScenarioIds.has(seed.scenarioId)
    ) {
      throw new Error(`parallel Scenario already exists: ${seed.scenarioId}`);
    }
    this.#pendingScenarioIds.add(seed.scenarioId);
    this.#syncBackgroundWorkerBudget();
    let lane: WorkbenchParallelScenarioLaneV3 | undefined;
    let adopted = false;
    try {
      lane = await this.#createLane(seed);
      if (this.#state !== "active") {
        throw new Error("parallel Scenario runtime was terminated during add");
      }
      if (this.#lanes.has(seed.scenarioId)) {
        throw new Error(`parallel Scenario already exists: ${seed.scenarioId}`);
      }
      const shouldResume = this.#timeConductor.running;
      if (shouldResume) await this.#timeConductor.pause();
      this.#lanes.set(seed.scenarioId, lane);
      adopted = true;
      this.#activeScenarioId = seed.scenarioId;
      this.#timeConductor.lanesChanged();
      if (shouldResume && this.#canRunGroup()) this.#timeConductor.play();
      return this.currentState();
    } catch (error) {
      if (!adopted && lane !== undefined) terminateLaneV3(lane);
      else if (adopted && this.#state === "active") {
        this.#fail(errorAsErrorV3(error));
      }
      throw error;
    } finally {
      this.#pendingScenarioIds.delete(seed.scenarioId);
      this.#syncBackgroundWorkerBudget();
    }
  }

  async duplicateScenario(input: Readonly<{
    sourceScenarioId: string;
    scenarioId: string;
    label: string;
  }>): Promise<StudioSimulationWorkerScenarioStateV2> {
    const source = await this.captureScenario(input.sourceScenarioId);
    const ownedCapture = validateStudioSimulationScenarioInputV2({
      scenarioId: input.scenarioId,
      fixture: source.capture.fixture,
      checkpoint: source.capture.checkpoint,
    }, "$.duplicateScenario");
    return this.addScenario({
      scenarioId: input.scenarioId,
      label: input.label,
      fixture: ownedCapture.fixture,
      checkpoint: ownedCapture.checkpoint,
    });
  }

  renameScenario(input: Readonly<{
    scenarioId: string;
    label: string;
  }>): StudioSimulationWorkerScenarioStateV2 {
    this.#requireActive();
    const lane = this.#requiredLane(input.scenarioId);
    requireScenarioLabelV3(input.label);
    lane.descriptor = Object.freeze({
      scenarioId: input.scenarioId,
      label: input.label,
    });
    return this.currentState();
  }

  async deleteScenario(
    scenarioId: string,
  ): Promise<StudioSimulationWorkerScenarioStateV2> {
    this.#requireActive();
    if (this.#lanes.size <= 1) {
      throw new Error("parallel Scenario runtime cannot delete its last Scenario");
    }
    const lane = this.#requiredLane(scenarioId);
    const shouldResume = this.#timeConductor.running;
    if (shouldResume) await this.#timeConductor.pause();
    this.#cancelScenarioAnalysisJobs(scenarioId);
    this.#lanes.delete(scenarioId);
    this.#pendingControlPresentation.delete(scenarioId);
    if (this.#pendingControlPresentation.size === 0) this.#releaseControlPresentationWaiters();
    this.#scenarioPauseLeaseCounts.delete(scenarioId);
    this.#timeConductor.lanesChanged();
    this.#syncBackgroundWorkerBudget();
    this.#steadyCandidates?.invalidateScenario(scenarioId);
    if (this.#activeScenarioId === scenarioId) {
      this.#activeScenarioId = this.#lanes.keys().next().value ?? null;
    }
    lane.client.terminate();
    if (shouldResume && this.#canRunGroup()) this.#timeConductor.play();
    this.#syncBackgroundWorkerBudget();
    return this.currentState();
  }

  async applyControl(
    input: Omit<StudioSimulationWorkerApplyControlInputV2, "runtimeSessionId">,
  ): Promise<StudioSimulationWorkerControlResultV2> {
    this.#requireActive();
    const lane = this.#requiredLane(input.scenarioId);
    // A control is foreground numerical work even while playback is paused.
    // Yield only speculative settlement; a rejected edit must leave explicit
    // analysis/Save/Snapshot work and the accepted live authority intact.
    this.#steadyCandidates?.yieldPrewarm(input.scenarioId);
    lane.capturedBoundary = undefined;
    const controlStartedAtMs = workbenchPerformanceNowV3();
    const result = await lane.client.applyControl({
      ...input,
      runtimeSessionId: lane.runtimeSessionId,
    });
    recordWorkbenchPerformanceDurationV3(
      "runtime.control.worker-round-trip",
      workbenchPerformanceNowV3() - controlStartedAtMs,
    );
    lane.latestFrame = result.frame;
    this.#pendingControlPresentation.set(input.scenarioId, result.frame);
    // Every queued/running analysis was forked from the old input epoch. Letting
    // it finish cannot produce an admissible result and, on a one-slot device,
    // can keep the current PV/Starling request behind minutes of stale work.
    // Cancel only after the control was accepted: a rejected edit leaves the
    // old input (and its analysis) valid. Unrelated Scenario work and explicit
    // Save/Snapshot jobs retain their normal QoS contract.
    this.#cancelScenarioAnalysisJobs(input.scenarioId);
    this.#steadyCandidates?.invalidateScenario(input.scenarioId);
    return result;
  }

  /**
   * Yields detached analysis Workers to an explicit foreground operation.
   *
   * The live Scenario lanes and their exact accepted state are unaffected.
   * Callers may request the analysis again after Save/Snapshot completes.
   */
  cancelAnalysisJobs(): void {
    this.#requireActive();
    this.#cancelAllAnalysisJobs();
  }

  async requestAnalysis(
    input: Omit<StudioSimulationWorkerRequestAnalysisInputV2, "runtimeSessionId">
      & Readonly<{
        onProgress?: (analysis: StudioSimulationAnalysisV2) => void;
        onLiveLaneReleased?: () => void;
        /** Transfers one pauseScenario lease already owned by the caller. */
        sourceAlreadyPaused?: boolean;
      }>,
  ): Promise<StudioSimulationAnalysisV2> {
    let sourcePauseLeaseOwned = false;
    try {
      if (input.sourceAlreadyPaused === true) {
        if (!this.#scenarioPauseLeaseCounts.has(input.scenarioId)) {
          throw new Error(
            "parallel Scenario analysis was not given its declared pause lease",
          );
        }
        sourcePauseLeaseOwned = true;
      }
      this.#requireActive();
      const lane = this.#requiredLane(input.scenarioId);
      const executionPlan = input.analysisPartition === undefined
        ? this.#resolveAnalysisExecutionPlan(input.analysisId)
        : null;
      const partitions = executionPlan === null
        ? Object.freeze([input.analysisPartition])
        : validatedAnalysisPartitionsV3(executionPlan.partitions);
      if (!sourcePauseLeaseOwned) {
        await this.pauseScenario(input.scenarioId);
        sourcePauseLeaseOwned = true;
      }
      const sourceFrame = lane.latestFrame;
      if (
        sourceFrame.inputEpoch !== input.expectedInputEpoch
        || sourceFrame.acceptedRevision !== input.expectedAcceptedRevision
        || sourceFrame.acceptedTimeSec !== input.expectedAcceptedTimeSec
      ) throw new Error("parallel Scenario analysis source clocks are stale");

      const source = await this.captureScenario(input.scenarioId);
      if (
        source.capture.checkpoint.acceptedRevision
          !== input.expectedAcceptedRevision
        || source.capture.checkpoint.acceptedTimeSec
          !== input.expectedAcceptedTimeSec
      ) throw new Error("parallel Scenario analysis capture clocks differ");

      // The exact source tuple is now detached from the live lane. Resume it
      // before the shared steady candidate is awaited or another Worker is
      // leased; queueing and numerical work must never extend the visible pause.
      this.resumeScenario(input.scenarioId);
      sourcePauseLeaseOwned = false;
      input.onLiveLaneReleased?.();

      if (sourceFrame.inputEpoch === lane.initialInputEpoch && input.analysisPartition === undefined) {
        const prepared = await lane.preparedAnalysis;
        if (this.#state !== "active" || this.#lanes.get(input.scenarioId) !== lane
          || lane.latestFrame.inputEpoch !== sourceFrame.inputEpoch)
          throw new Error("Prepared analysis target changed during loading");
        if (prepared && prepared.modelId === sourceFrame.modelId && prepared.analysisId === input.analysisId
          && prepared.sourceAcceptedRevision <= sourceFrame.acceptedRevision
          && prepared.sourceAcceptedTimeSec <= sourceFrame.acceptedTimeSec) {
          recordWorkbenchPerformanceValueV3("runtime.analysis.prepared-reuse", 1);
          // Preserve the offline source clock and payload provenance. Only the
          // ephemeral Scenario binding changes; this is not a new measurement.
          return validateStudioSimulationAnalysisV2({ ...prepared, scenarioId: input.scenarioId,
            runtimeSessionId: lane.runtimeSessionId, inputEpoch: sourceFrame.inputEpoch });
        }
      }

      const sourceForAnalysis = this.#bestAvailableSteadyCandidate(
        source,
        sourceFrame.inputEpoch,
      );
      const checkpoint = sourceForAnalysis.capture.checkpoint;

      const remap = (analysis: StudioSimulationAnalysisV2) =>
        validateStudioSimulationAnalysisV2({
          ...analysis,
          runtimeSessionId: lane.runtimeSessionId,
          inputEpoch: input.expectedInputEpoch,
          sourceAcceptedRevision: checkpoint.acceptedRevision,
          sourceAcceptedTimeSec: checkpoint.acceptedTimeSec,
        }, "$.parallelScenarioAnalysis");
      const latestByPartition = new Map<string | undefined,
        StudioSimulationAnalysisV2>();
      const publishProgress = (
        analysisPartition: string | undefined,
        progress: StudioSimulationAnalysisV2,
      ) => {
        const remapped = remap(progress);
        latestByPartition.set(analysisPartition, remapped);
        input.onProgress?.(
          executionPlan === null
            ? remapped
            : executionPlan.merge([...latestByPartition.values()]),
        );
      };
      const sharePreparation = executionPlan?.sharedPreparation === true && partitions.length > 1;
      let preparationSent = false;
      let resolvePreparation!: (value: StudioJsonValueV2) => void;
      let rejectPreparation!: (error: unknown) => void;
      const preparation = new Promise<StudioJsonValueV2>((resolve, reject) => {
        resolvePreparation = resolve; rejectPreparation = reject;
      });
      // A failed/cancelled first Worker must release all waiting partitions.
      void preparation.catch(() => undefined);
      const analyses = await Promise.all(partitions.map(async (analysisPartition, index) => {
        const preparedAnalysis = sharePreparation && index > 0 ? await preparation : undefined;
        // Wait outside the pool: a one-slot device must never hold a lease
        // waiting for the first partition to produce its shared anchor.
        return this.#withAnalysisClient(
          input.scenarioId,
          analysisPartition,
          async (client) => {
            if (this.#state !== "active" || this.#lanes.get(input.scenarioId) !== lane
              || lane.latestFrame.inputEpoch !== input.expectedInputEpoch) {
              throw new Error("parallel Scenario analysis target changed");
            }
            this.#analysisClients.add(client);
            try {
              const runtimeSessionId =
                `workbench-analysis-${randomPortableTokenV3()}`;
              const initialFrame = await client.initialize({
                expectedModelId: this.#expectedModelId,
                releaseTicket: this.#releaseTicket,
                runtimeSessionId,
                scenarioId: input.scenarioId,
                scenarioLabel: sourceForAnalysis.label,
                fixture: sourceForAnalysis.capture.fixture,
                checkpoint,
              });
              const analysis = await client.requestAnalysis({
                runtimeSessionId,
                scenarioId: input.scenarioId,
                analysisId: input.analysisId,
                expectedInputEpoch: initialFrame.inputEpoch,
                expectedAcceptedRevision: initialFrame.acceptedRevision,
                expectedAcceptedTimeSec: initialFrame.acceptedTimeSec,
                ...(analysisPartition === undefined
                  ? {}
                  : { analysisPartition }),
                ...(sharePreparation && index === 0 ? { sharePreparation: true } : {}),
                ...(preparedAnalysis === undefined ? {} : { preparedAnalysis }),
                ...(input.onProgress === undefined && !sharePreparation
                  ? {}
                  : {
                      onProgress: (progress, shared) => {
                        if (shared !== undefined) {
                          if (!sharePreparation || index !== 0 || preparationSent)
                            throw new Error("Unexpected shared analysis preparation");
                          preparationSent = true;
                          resolvePreparation(shared);
                        }
                        publishProgress(analysisPartition, progress);
                      },
                    }),
              });
              if (sharePreparation && index === 0 && !preparationSent)
                throw new Error("Analysis did not provide its shared preparation");
              return remap(analysis);
            } finally {
              this.#analysisClients.delete(client);
            }
          },
        ).catch(error => {
          if (sharePreparation && index === 0) rejectPreparation(error);
          throw error;
        });
      }));
      return executionPlan === null
        ? analyses[0]!
        : executionPlan.merge(analyses);
    } finally {
      if (sourcePauseLeaseOwned) this.resumeScenario(input.scenarioId);
    }
  }

  async #withAnalysisClient<T>(
    scenarioId: string,
    analysisPartition: string | undefined,
    operation: (client: WorkbenchParallelScenarioRuntimeClientV3) => Promise<T>,
  ): Promise<T> {
    if (this.#backgroundWorkerPool !== undefined) {
      const handle = this.#backgroundWorkerPool.schedule("analysis", operation);
      this.#trackScenarioAnalysisJob(scenarioId, handle);
      try {
        return await handle.promise;
      } finally {
        this.#untrackScenarioAnalysisJob(scenarioId, handle);
      }
    }
    const client = this.#createAnalysisClient(scenarioId, analysisPartition);
    try {
      return await operation(client);
    } finally {
      client.terminate();
    }
  }

  async captureScenarios(): Promise<StudioSimulationWorkerScenarioCapturesV2> {
    this.#requireActive();
    const scenarios = await Promise.all([...this.#lanes.keys()].map(
      scenarioId => this.captureScenario(scenarioId),
    ));
    return Object.freeze({
      activeScenarioId: this.#requiredActiveScenarioId(),
      scenarios: Object.freeze(scenarios),
    });
  }

  /**
   * Selects the newest already-produced cycle-boundary candidate for each
   * detached intent target. It never waits for speculative convergence. When
   * no candidate is ready, the click-time exact capture remains authoritative
   * and a low-priority candidate is started only for a later request.
   */
  selectBestAvailableScenarioCaptures(
    captures: StudioSimulationWorkerScenarioCapturesV2,
  ): StudioSimulationWorkerScenarioCapturesV2 {
    this.#requireActive();
    if (this.#steadyCandidates === undefined) return captures;
    const scenarios = captures.scenarios.map((scenario) => {
      const lane = this.#requiredLane(scenario.scenarioId);
      const source = {
        modelId: this.#expectedModelId,
        releaseTicket: this.#releaseTicket,
        inputEpoch: lane.latestFrame.inputEpoch,
        scenario,
      } satisfies WorkbenchSteadyCandidateSourceV3;
      const candidate = this.#steadyCandidates!.bestAvailable(source);
      if (candidate === null) {
        this.#steadyCandidates!.prewarm(source);
        return scenario;
      }
      return Object.freeze({
        ...candidate.scenario,
        // Labels are authored presentation metadata, not numerical candidate
        // identity. Preserve a rename without recomputing the same state.
        label: scenario.label,
      });
    });
    return Object.freeze({
      activeScenarioId: captures.activeScenarioId,
      scenarios: Object.freeze(scenarios),
    });
  }

  playAll(): void {
    // Async UI continuations may still hold this pool after a lane failure has
    // already fail-closed it. Resuming a discarded authority is intentionally
    // a no-op; new/initializing misuse remains an error.
    if (this.#state === "terminated") return;
    this.#requireActive();
    if (this.#playing) return;
    this.#playing = true;
    // Reserve foreground capacity before the conductor starts requesting batches;
    // otherwise paused-time speculation can briefly overfill the device.
    this.#syncBackgroundWorkerBudget(
      this.#lanes.size + this.#pendingScenarioIds.size,
    );
    try {
      if (this.#scenarioPauseLeaseCounts.size === 0) {
        this.#timeConductor.play();
      }
      this.#syncBackgroundWorkerBudget();
    } catch (error) {
      this.#fail(errorAsErrorV3(error));
    }
  }

  /** Reserve live-lane capacity across a short, paused foreground transaction. */
  reserveForegroundCapacity(): () => void {
    this.#requireActive();
    this.#foregroundCapacityLeases += 1;
    this.#syncBackgroundWorkerBudget();
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.#foregroundCapacityLeases -= 1;
      // A retired runtime must never change the shared pool's new owner budget.
      if (this.#state === "active") this.#syncBackgroundWorkerBudget();
    };
  }

  /**
   * Let changed live data reach the display before an automatic analysis takes
   * its source capture. Call once for the whole group, before any pause lease:
   * waiting per target would let an unchanged sibling freeze the changed lane.
   * A user pause releases the wait; a retired runtime rejects the continuation.
   */
  async waitForControlPresentation(): Promise<void> {
    this.#requireActive();
    if (!this.#playing || this.#pendingControlPresentation.size === 0) return;
    await new Promise<void>(resolve => this.#controlPresentationWaiters.add(resolve));
    this.#requireActive();
  }

  #releaseControlPresentationWaiters(): void {
    for (const resolve of this.#controlPresentationWaiters) resolve();
    this.#controlPresentationWaiters.clear();
  }

  async pauseAll(): Promise<void> {
    if (this.#state === "terminated") return;
    this.#requireActive();
    this.#playing = false;
    this.#releaseControlPresentationWaiters();
    try {
      await this.#timeConductor.pause();
    } finally {
      // A genuine user pause releases idle cores. Short control transactions
      // retain their reservation while capturing and applying accepted state.
      this.#syncBackgroundWorkerBudget();
    }
  }

  /**
   * Acquires a short group-pause lease for one Scenario operation.
   *
   * Comparative lanes share one model-time clock, so a source capture cannot
   * advance its siblings independently. The group resumes as soon as all
   * outstanding Scenario leases are released.
   */
  async pauseScenario(
    scenarioId: string,
  ): Promise<StudioSimulationFrameV2> {
    if (this.#state === "terminated") {
      throw new Error("parallel Scenario runtime is not active");
    }
    this.#requireActive();
    const lane = this.#requiredLane(scenarioId);
    this.#scenarioPauseLeaseCounts.set(
      scenarioId,
      (this.#scenarioPauseLeaseCounts.get(scenarioId) ?? 0) + 1,
    );
    try {
      await this.#timeConductor.pause();
    } catch (error) {
      this.#releaseScenarioPauseLease(scenarioId);
      throw error;
    }
    this.#syncBackgroundWorkerBudget();
    return lane.latestFrame;
  }

  /** Releases one group-pause lease without changing global playback intent. */
  resumeScenario(scenarioId: string): void {
    if (this.#state === "terminated") return;
    this.#requireActive();
    this.#requiredLane(scenarioId);
    if (!this.#releaseScenarioPauseLease(scenarioId)) return;
    // Global pause changes playback intent, not operation ownership. Release
    // the lease even while paused so a later playAll() is not held forever by
    // an operation that already completed.
    if (!this.#playing) {
      this.#syncBackgroundWorkerBudget();
      return;
    }
    if (
      this.#scenarioPauseLeaseCounts.size > 0
      || this.#timeConductor.running
    ) return;
    this.#syncBackgroundWorkerBudget(
      this.#lanes.size + this.#pendingScenarioIds.size,
    );
    try {
      this.#timeConductor.play();
    } finally {
      this.#syncBackgroundWorkerBudget();
    }
  }

  terminate(): void {
    if (this.#state === "terminated") return;
    this.#state = "terminated";
    this.#playing = false;
    this.#releaseControlPresentationWaiters();
    this.#pendingControlPresentation.clear();
    this.#timeConductor.terminate();
    this.#steadyCandidates?.dispose();
    this.#cancelAllAnalysisJobs();
    for (const client of this.#analysisClients) client.terminate();
    this.#analysisClients.clear();
    for (const lane of this.#lanes.values()) terminateLaneV3(lane);
    this.#lanes.clear();
    this.#pendingScenarioIds.clear();
    this.#scenarioPauseLeaseCounts.clear();
    this.#syncBackgroundWorkerBudget(0);
    this.#activeScenarioId = null;
  }

  async dispose(): Promise<void> {
    if (this.#state === "terminated") return;
    this.#state = "terminated";
    this.#playing = false;
    this.#releaseControlPresentationWaiters();
    this.#pendingControlPresentation.clear();
    this.#steadyCandidates?.dispose();
    this.#cancelAllAnalysisJobs();
    for (const client of this.#analysisClients) client.terminate();
    this.#analysisClients.clear();
    const lanes = [...this.#lanes.values()];
    this.#lanes.clear();
    this.#pendingScenarioIds.clear();
    this.#scenarioPauseLeaseCounts.clear();
    this.#syncBackgroundWorkerBudget(0);
    this.#activeScenarioId = null;
    await this.#timeConductor.dispose();
    for (const { client } of lanes) client.terminate();
  }

  async #createLane(
    seed: WorkbenchParallelScenarioSeedV3,
  ): Promise<WorkbenchParallelScenarioLaneV3> {
    const runtimeSessionId = this.#createRuntimeSessionId(seed.scenarioId);
    const client = this.#createClient(seed.scenarioId);
    const diagnosticsEnabled = workbenchPerformanceDiagnosticsEnabledV3();
    const initializeStartedAtMs = diagnosticsEnabled
      ? workbenchPerformanceNowV3()
      : 0;
    // Optional presentation analysis can load alongside initialization. Its
    // capture/epoch validation still runs before use; never advance the live model.
    const preparedAnalysis = seed.checkpoint === undefined || this.#loadPreparedAnalysis === undefined
      ? Promise.resolve(null)
      : Promise.resolve().then(() => this.#loadPreparedAnalysis!(seed)).catch(() => null);
    try {
      const initialFrame = await client.initialize({
        expectedModelId: this.#expectedModelId,
        releaseTicket: this.#releaseTicket,
        runtimeSessionId,
        scenarioId: seed.scenarioId,
        scenarioLabel: seed.label,
        fixture: seed.fixture,
        ...(seed.checkpoint === undefined
          ? {}
          : { checkpoint: seed.checkpoint }),
      });
      if (diagnosticsEnabled) {
        recordWorkbenchPerformanceDurationV3(
          "worker.initialization-round-trip",
          workbenchPerformanceNowV3() - initializeStartedAtMs,
        );
        recordWorkerInitializationTimingV3(
          seed.scenarioId,
          client.initializationTiming?.(),
        );
      }
      const lane = {
        descriptor: Object.freeze({
          scenarioId: seed.scenarioId,
          label: seed.label,
        }),
        runtimeSessionId,
        client,
        latestFrame: initialFrame,
        completeOutputIds: new Set(Object.keys(initialFrame.outputs)),
        initialInputEpoch: initialFrame.inputEpoch,
        preparedAnalysis,
      };
      return lane;
    } catch (error) {
      client.terminate();
      throw error;
    }
  }

  async captureScenario(
    scenarioId: string,
  ): Promise<ExperimentScenarioV2> {
    this.#requireActive();
    const lane = this.#requiredLane(scenarioId);
    const startedAtMs = workbenchPerformanceNowV3();
    // Recovery, analysis forks, and authoring can ask for the same accepted
    // boundary back-to-back. Share the fully validated exact capture,
    // never a capture from merely the same parameter epoch or an earlier tick.
    if (lane.capturedBoundary?.frame !== lane.latestFrame) {
      const frame = lane.latestFrame;
      const promise = (async () => {
        const captures = await lane.client.readScenarios({
          runtimeSessionId: lane.runtimeSessionId,
        });
        const scenario = captures.scenarios.find(candidate =>
          candidate.scenarioId === scenarioId);
        if (captures.scenarios.length !== 1 || scenario === undefined) {
          throw new Error("parallel Scenario lane returned another capture");
        }
        if (scenario.capture.checkpoint.acceptedRevision !== frame.acceptedRevision
          || scenario.capture.checkpoint.acceptedTimeSec !== frame.acceptedTimeSec) {
          throw new Error("parallel Scenario capture clocks differ from its accepted boundary");
        }
        return scenario.capture;
      })();
      const boundary = { frame, promise };
      lane.capturedBoundary = boundary;
      void promise.catch(() => {
        if (lane.capturedBoundary === boundary) lane.capturedBoundary = undefined;
      });
    } else {
      incrementWorkbenchPerformanceCounterV3("runtime.capture.accepted-boundary-reuse");
    }
    const capture = await lane.capturedBoundary.promise;
    const captured = Object.freeze({
      scenarioId,
      label: lane.descriptor.label,
      capture,
    });
    recordWorkbenchPerformanceDurationV3(
      "runtime.capture.scenario",
      workbenchPerformanceNowV3() - startedAtMs,
    );
    return captured;
  }

  #bestAvailableSteadyCandidate(
    scenario: ExperimentScenarioV2,
    inputEpoch: number,
  ): ExperimentScenarioV2 {
    if (this.#steadyCandidates === undefined) return scenario;
    const lane = this.#requiredLane(scenario.scenarioId);
    const candidate = this.#steadyCandidates.bestAvailable(
      this.#steadyCandidateSource(lane, scenario, inputEpoch),
    );
    if (candidate === null) return scenario;
    return Object.freeze({
      ...candidate.scenario,
      label: scenario.label,
    });
  }

  #steadyCandidateSource(
    lane: WorkbenchParallelScenarioLaneV3,
    scenario: ExperimentScenarioV2,
    inputEpoch = lane.latestFrame.inputEpoch,
  ): WorkbenchSteadyCandidateSourceV3 {
    return Object.freeze({
      modelId: this.#expectedModelId,
      releaseTicket: this.#releaseTicket,
      inputEpoch,
      scenario,
    });
  }

  presentationAnalyses(scenarioId: string): readonly StudioSimulationAnalysisV2[] {
    const lane = this.#lanes.get(scenarioId);
    if (this.#state !== "active" || lane === undefined) return Object.freeze([]);
    return Object.freeze((lane.client.presentationAnalyses?.() ?? []).filter(analysis =>
      analysis.inputEpoch === lane.latestFrame.inputEpoch
      && analysis.scenarioId === scenarioId
      && analysis.sourceAcceptedRevision <= lane.latestFrame.acceptedRevision
      && analysis.sourceAcceptedTimeSec <= lane.latestFrame.acceptedTimeSec));
  }

  async #advanceLane(
    lane: WorkbenchParallelScenarioLaneV3,
    stepCount: number,
  ): Promise<readonly StudioSimulationFrameV2[]> {
    // Invalidate before dispatch, not just after the reply: a concurrent read
    // must not receive the cached previous tick while a new tick is in flight.
    lane.capturedBoundary = undefined;
    const presentationOutputIds = Object.freeze([
      ...new Set(this.#presentationOutputIds()),
    ]);
    if (workbenchPerformanceDiagnosticsEnabledV3()) {
      const typedArrayBytes = stepCount * 16
        + stepCount * presentationOutputIds.length * 9;
      recordWorkbenchPerformanceValueV3(
        "worker.presentation-selected-output-count",
        presentationOutputIds.length,
      );
      recordWorkbenchPerformanceValueV3(
        "worker.presentation-typed-array-bytes",
        typedArrayBytes,
      );
      recordWorkbenchPerformanceValueV3(
        `worker.lane.${lane.descriptor.scenarioId}.presentation-typed-array-bytes`,
        typedArrayBytes,
      );
    }
    const presentationAnalysisIds = this.#presentationAnalysisIds();
    const frames = await lane.client.advancePresentation({
      runtimeSessionId: lane.runtimeSessionId,
      scenarioId: lane.descriptor.scenarioId,
      stepCount,
      presentationOutputIds,
      ...(presentationAnalysisIds.length === 0 ? {} : { presentationAnalysisIds }),
    });
    if (workbenchPerformanceDiagnosticsEnabledV3()) {
      const timing = lane.client.presentationTiming?.();
      if (timing !== undefined) {
        recordWorkbenchPerformanceDurationV3(
          "worker.presentation-advance",
          timing.workerAdvanceMs,
        );
        recordWorkbenchPerformanceDurationV3(
          "worker.presentation-prepare",
          timing.workerPrepareMs,
        );
        recordWorkbenchPerformanceDurationV3(
          `worker.lane.${lane.descriptor.scenarioId}.presentation-advance`,
          timing.workerAdvanceMs,
        );
        recordWorkbenchPerformanceDurationV3(
          `worker.lane.${lane.descriptor.scenarioId}.presentation-prepare`,
          timing.workerPrepareMs,
        );
      }
    }
    const complete = frames.at(-1);
    if (
      complete === undefined
      || ![...lane.completeOutputIds].every((outputId) =>
        Object.prototype.hasOwnProperty.call(complete.outputs, outputId),
      )
    ) {
      throw new Error(
        `parallel Scenario ${lane.descriptor.scenarioId} presentation batch `
          + "did not end in a complete exact frame",
      );
    }
    // The packed Worker contract makes its terminal row the complete frame.
    // Advance the lane authority before the next group request; visual slices
    // may still drain the preceding exact prefix independently.
    lane.latestFrame = complete;
    return frames;
  }

  #publishFrames(frames: readonly StudioSimulationFrameV2[]): void {
    if (frames.length === 0 || this.#state !== "active") return;
    for (const frame of frames) {
      const controlFrame = this.#pendingControlPresentation.get(frame.scenarioId);
      if (controlFrame !== undefined && frame.inputEpoch >= controlFrame.inputEpoch
        && frame.acceptedTimeSec > controlFrame.acceptedTimeSec) {
        this.#pendingControlPresentation.delete(frame.scenarioId);
      }
      const lane = this.#lanes.get(frame.scenarioId);
      if (
        lane !== undefined
        && frame.inputEpoch >= lane.latestFrame.inputEpoch
        && frame.acceptedRevision >= lane.latestFrame.acceptedRevision
        && frame.acceptedTimeSec >= lane.latestFrame.acceptedTimeSec
        && [...lane.completeOutputIds].every((outputId) =>
          Object.prototype.hasOwnProperty.call(frame.outputs, outputId),
        )
      ) lane.latestFrame = frame;
    }
    if (workbenchPerformanceDiagnosticsEnabledV3()) {
      const framesByScenario = new Map<string, StudioSimulationFrameV2[]>();
      for (const frame of frames) {
        const scenarioFrames = framesByScenario.get(frame.scenarioId) ?? [];
        scenarioFrames.push(frame);
        framesByScenario.set(frame.scenarioId, scenarioFrames);
      }
      for (const [scenarioId, scenarioFrames] of framesByScenario) {
        const terminal = scenarioFrames.at(-1)!;
        const outputs = Object.values(terminal.outputs);
        const valueCount = outputs.reduce((count, output) =>
          count + (Array.isArray(output.value) ? output.value.length : 1), 0);
        recordWorkbenchPerformanceValueV3(
          `runtime.${scenarioId}.batch-frame-count`,
          scenarioFrames.length,
        );
        recordWorkbenchPerformanceValueV3(
          `runtime.${scenarioId}.outputs-per-frame`,
          outputs.length,
        );
        recordWorkbenchPerformanceValueV3(
          `runtime.${scenarioId}.values-per-frame`,
          valueCount,
        );
      }
    }
    this.#onFrames(Object.freeze([...frames]));
    if (this.#pendingControlPresentation.size === 0) this.#releaseControlPresentationWaiters();
    recordWorkbenchPerformanceEventIntervalV3(
      "runtime.presentation-commit-interval",
    );
  }

  #syncBackgroundWorkerBudget(
    // A short Scenario lease is not a global pause. Keep capacity reserved
    // across capture/control boundaries so analysis cannot start through that
    // gap and prevent initial foreground calibration. Foreground transactions
    // also reserve capacity even while global playback is paused.
    liveScenarioCount = (this.#playing || this.#foregroundCapacityLeases > 0 ? this.#lanes.size : 0)
      + this.#pendingScenarioIds.size,
  ): void {
    this.#backgroundWorkerPool?.setLiveScenarioCount(liveScenarioCount);
  }

  #trackScenarioAnalysisJob<T>(
    scenarioId: string,
    handle: WorkbenchBackgroundJobHandleV3<T>,
  ): void {
    const jobs = this.#analysisJobsByScenario.get(scenarioId) ?? new Set();
    jobs.add(handle as WorkbenchBackgroundJobHandleV3<unknown>);
    this.#analysisJobsByScenario.set(scenarioId, jobs);
  }

  #untrackScenarioAnalysisJob<T>(
    scenarioId: string,
    handle: WorkbenchBackgroundJobHandleV3<T>,
  ): void {
    const jobs = this.#analysisJobsByScenario.get(scenarioId);
    if (jobs === undefined) return;
    jobs.delete(handle as WorkbenchBackgroundJobHandleV3<unknown>);
    if (jobs.size === 0) this.#analysisJobsByScenario.delete(scenarioId);
  }

  #cancelScenarioAnalysisJobs(scenarioId: string): void {
    const jobs = this.#analysisJobsByScenario.get(scenarioId);
    if (jobs === undefined) return;
    this.#analysisJobsByScenario.delete(scenarioId);
    for (const job of jobs) job.cancel();
  }

  #cancelAllAnalysisJobs(): void {
    const scenarioIds = [...this.#analysisJobsByScenario.keys()];
    for (const scenarioId of scenarioIds) {
      this.#cancelScenarioAnalysisJobs(scenarioId);
    }
  }

  #canRunGroup(): boolean {
    return this.#playing && this.#scenarioPauseLeaseCounts.size === 0;
  }

  /** Returns true only when one owned lease was actually released. */
  #releaseScenarioPauseLease(scenarioId: string): boolean {
    const count = this.#scenarioPauseLeaseCounts.get(scenarioId);
    if (count === undefined) return false;
    if (count <= 1) this.#scenarioPauseLeaseCounts.delete(scenarioId);
    else this.#scenarioPauseLeaseCounts.set(scenarioId, count - 1);
    return true;
  }

  #fail(error: Error): void {
    if (this.#failed || this.#state === "terminated") return;
    this.#failed = true;
    const normalized = errorAsErrorV3(error);
    this.terminate();
    this.#onError(normalized);
  }

  #requireActive(): void {
    if (this.#state !== "active") {
      throw new Error("parallel Scenario runtime is not active");
    }
  }

  #isTerminated(): boolean {
    return this.#state === "terminated";
  }

  #requiredActiveScenarioId(): string {
    this.#requireActive();
    if (this.#activeScenarioId === null) {
      throw new Error("parallel Scenario runtime has no active Scenario");
    }
    return this.#activeScenarioId;
  }

  #requiredLane(scenarioId: string): WorkbenchParallelScenarioLaneV3 {
    const lane = this.#lanes.get(scenarioId);
    if (lane === undefined) {
      throw new Error(`parallel Scenario not found: ${scenarioId}`);
    }
    return lane;
  }
}

function validateScenarioSeedsV3(
  scenarios: readonly WorkbenchParallelScenarioSeedV3[],
  activeScenarioId: string,
): void {
  if (scenarios.length < 1) {
    throw new Error(
      "parallel Scenario runtime requires at least one Scenario",
    );
  }
  const ids = new Set<string>();
  for (const scenario of scenarios) {
    requireScenarioLabelV3(scenario.label);
    if (ids.has(scenario.scenarioId)) {
      throw new Error(`parallel Scenario is duplicated: ${scenario.scenarioId}`);
    }
    ids.add(scenario.scenarioId);
  }
  if (!ids.has(activeScenarioId)) {
    throw new Error("parallel active Scenario is not in the seed set");
  }
}

function validatedAnalysisPartitionsV3(
  partitions: readonly string[],
): readonly string[] {
  if (partitions.length < 1 || partitions.length > 4) {
    throw new Error("parallel analysis requires 1-4 Worker partitions");
  }
  const validated = partitions.map((partition, index) =>
    validateStudioSimulationPortableIdV2(
      partition,
      `$.analysisExecutionPlan.partitions[${index}]`,
    ));
  if (new Set(validated).size !== validated.length) {
    throw new Error("parallel analysis Worker partitions must be unique");
  }
  return Object.freeze(validated);
}

function requireScenarioLabelV3(label: string): void {
  if (
    label.length === 0
    || label.length > 4_096
    || label.trim() !== label
  ) {
    throw new Error(
      "parallel Scenario label must be a nonempty trimmed string of at most 4096 characters",
    );
  }
}

function recordWorkerInitializationTimingV3(
  scenarioId: string,
  timing: StudioSimulationWorkerInitializationTimingV2 | undefined,
): void {
  if (timing === undefined) return;
  recordWorkbenchPerformanceDurationV3(
    "worker.initialization-total",
    timing.totalWorkerInitializeMs,
  );
  recordWorkbenchPerformanceDurationV3(
    `worker.lane.${scenarioId}.initialization-total`,
    timing.totalWorkerInitializeMs,
  );
  recordWorkbenchPerformanceDurationV3(
    "worker.initialization-authoring-setup",
    timing.authoringSetupMs,
  );
  recordWorkbenchPerformanceDurationV3(
    "worker.initialization-session-create",
    timing.sessionCreateMs,
  );
  recordWorkbenchPerformanceDurationV3(
    "worker.initialization-first-frame",
    timing.initialFrameMs,
  );
  recordWorkbenchPerformanceDurationV3(
    "worker.initialization-execution-plan-bind",
    timing.executionPlanBindMs,
  );
  if (timing.exactRuntimeLoad !== null) {
    recordWorkbenchPerformanceDurationV3(
      "worker.initialization-exact-runtime-load",
      timing.exactRuntimeLoad.totalMs,
    );
    recordWorkbenchPerformanceDurationV3(
      "worker.initialization-artifact-fetch",
      timing.exactRuntimeLoad.artifactFetchMs,
    );
    recordWorkbenchPerformanceDurationV3(
      "worker.initialization-module-import-and-factory",
      timing.exactRuntimeLoad.moduleImportAndFactoryMs,
    );
    recordWorkbenchPerformanceDurationV3(
      "worker.initialization-contract-validation",
      timing.exactRuntimeLoad.contractValidationMs,
    );
    recordWorkbenchPerformanceValueV3(
      "worker.initialization-artifact-bytes",
      timing.exactRuntimeLoad.artifactBytes,
    );
    recordWorkbenchPerformanceValueV3(
      "worker.initialization-runtime-cache-hit",
      timing.exactRuntimeLoad.cacheHit ? 1 : 0,
    );
  }
}

function terminateLaneV3(lane: WorkbenchParallelScenarioLaneV3): void {
  lane.client.terminate();
}

function errorAsErrorV3(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

function foregroundDocumentVisibleV3(): boolean {
  return typeof document === "undefined"
    || document.visibilityState === "visible";
}

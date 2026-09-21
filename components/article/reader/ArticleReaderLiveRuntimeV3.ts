import type { ExperimentScenarioV2, ExperimentSnapshotV2 } from
  "@/studio/contracts/v2/content";
import type { StudioReaderContinuationV3 } from "@/studio/infrastructure/browser/StudioExperimentSessionHandoffV3";
import { loadArticleReaderPreparedAnalysisV1 } from "./ArticleReaderPreparedAnalysisV1";
import { mainWireCardiacCycleOutputValueV1, mainWireFillingFlowOutputValueV1, mainWireAorticJetOutputValueV1 } from "@/analysis/methods/mainWire/MainWireCardiacCyclePresentationV1";
import type {
  StudioSimulationAnalysisExecutionPlanResolverV2,
  StudioSimulationAnalysisV2,
  StudioSimulationFrameV2,
} from
  "@/studio/contracts/v2/simulation";
import type {
  StudioModelWorkerReleaseTicketV2,
} from "@/studio/contracts/v2/release";
import {
  WorkbenchParallelScenarioRuntimeV3,
  type WorkbenchParallelScenarioSeedV3,
} from "@/components/workbench/runtime/WorkbenchParallelScenarioRuntimeV3";
import type {
  WorkbenchGroupPlaybackRateStateV3,
} from "@/components/workbench/runtime/WorkbenchGroupTimeConductorV3";
import {
  WorkbenchScenarioPresentationSampleStoreV3,
} from "@/components/workbench/presentation/WorkbenchPresentationSampleStoreV3";
import {
  WorkbenchBackgroundWorkerPoolV3,
  resolveWorkbenchBackgroundWorkerBudgetV3,
  type WorkbenchBackgroundWorkerPoolPortV3,
} from "@/components/workbench/runtime/WorkbenchBackgroundWorkerPoolV3";
import {
  recordWorkbenchPerformanceDurationV3,
  recordWorkbenchPerformanceValueV3,
  workbenchPerformanceDiagnosticsEnabledV3,
  workbenchPerformanceNowV3,
} from "@/components/workbench/runtime/WorkbenchPerformanceDiagnosticsV3";

export type ArticleReaderLiveRuntimeStateV3 = Readonly<{
  status:
    | "idle"
    | "starting"
    | "playing"
    | "paused"
    | "applying-control"
    | "failed"
    | "disposed";
  snapshotId: string;
  scenarioIds: readonly string[];
  activeScenarioId: string;
  /** Composite Briefing identity (`sourcePaneId` + `controlId`). */
  pendingControlInstanceId: string | null;
  pendingAnalysisKeys: readonly string[];
  fixtureByScenario: Readonly<
    Record<string, ExperimentScenarioV2["capture"]["fixture"]>
  >;
  /**
   * Scenarios whose inputs a reader control has changed since this runtime
   * started. Sealed-state analyses (prepared or measured once at open) are
   * valid only for Scenarios outside this set; the reading policy decides
   * whether a changed Scenario is re-measured automatically or on request.
   */
  changedScenarioIds: readonly string[];
  analysisByKey: Readonly<Record<string, StudioSimulationAnalysisV2>>;
  analysisHistoryByKey: Readonly<
    Record<string, readonly StudioSimulationAnalysisV2[]>
  >;
  analysisErrorByKey: Readonly<Record<string, string>>;
  controlErrorByInstanceId: Readonly<Record<string, string>>;
  error: Error | null;
  playbackRate: WorkbenchGroupPlaybackRateStateV3;
}>;

export type ArticleReaderStructuralAnalysisRequestV3 = Readonly<{
  analysisId: string;
  historyDepth: number;
}>;

export type ArticleReaderParallelRuntimeV3 = Pick<
  WorkbenchParallelScenarioRuntimeV3,
  | "dispose"
  | "applyControl"
  | "captureScenario"
  | "initialize"
  | "latestFrame"
  | "pauseAll"
  | "pauseScenario"
  | "playAll"
  | "requestAnalysis"
  | "reserveForegroundCapacity"
  | "resumeScenario"
  | "selectScenario"
  | "setPlaybackRate"
  | "terminate"
  | "waitForControlPresentation"
> & Partial<Pick<WorkbenchParallelScenarioRuntimeV3, "presentationAnalyses">>;

export type ArticleReaderParallelRuntimeFactoryInputV3 = Readonly<{
  expectedModelId: string;
  onFrames(frames: readonly StudioSimulationFrameV2[]): void;
  onError(error: Error): void;
  onPlaybackRateChange(state: WorkbenchGroupPlaybackRateStateV3): void;
}>;

type ArticleReaderLiveRuntimeCommonDependenciesV3 = Readonly<{
  continuation?: StudioReaderContinuationV3;
  initialPlaybackPreference?: ArticleReaderPlaybackPreferenceV3;
  initialActiveScenarioId?: string;
  visibleScenarioIds?: readonly string[];
  structuralAnalyses?: readonly ArticleReaderStructuralAnalysisRequestV3[];
  sampleStore?: WorkbenchScenarioPresentationSampleStoreV3;
  backgroundWorkerPool?: WorkbenchBackgroundWorkerPoolPortV3;
  resolveAnalysisExecutionPlan?:
    StudioSimulationAnalysisExecutionPlanResolverV2;
  presentationOutputIds?: ReadonlySet<string>;
  presentationAnalysisIds?: readonly string[];
}>;

export type ArticleReaderPlaybackPreferenceV3 = Readonly<{ playing: boolean; rate: number }>;

export type ArticleReaderLiveRuntimeDependenciesV3 =
  ArticleReaderLiveRuntimeCommonDependenciesV3 & (
    | Readonly<{
        createRuntime?: undefined;
        releaseTicket: StudioModelWorkerReleaseTicketV2;
      }>
    | Readonly<{
        createRuntime(
          input: ArticleReaderParallelRuntimeFactoryInputV3,
        ): ArticleReaderParallelRuntimeV3;
        releaseTicket?: never;
      }>
  );

/**
 * Ephemeral live owner for one focused Article Placement.
 *
 * Every Briefing-visible Snapshot Scenario receives one existing Workbench
 * numerical lane. This controller owns only lifecycle, active-inspector
 * identity, and presentation projection. It never mutates the Snapshot or
 * duplicates numerical behavior.
 */
export class ArticleReaderLiveRuntimeV3 {
  readonly sampleStore: WorkbenchScenarioPresentationSampleStoreV3;
  readonly #snapshot: ExperimentSnapshotV2;
  readonly #scenarioIds: readonly string[];
  readonly #createRuntime: NonNullable<
    ArticleReaderLiveRuntimeDependenciesV3["createRuntime"]
  >;
  readonly #ownedBackgroundWorkerPool: WorkbenchBackgroundWorkerPoolV3 | null;
  readonly #listeners = new Set<() => void>();
  readonly #structuralHistoryDepthByAnalysisId: ReadonlyMap<string, number>;
  readonly #presentationOutputIds: ReadonlySet<string> | undefined;
  readonly #presentationEpochOffsets = new Map<string, number>();
  readonly #analysisPresentationEpochs = new WeakMap<StudioSimulationAnalysisV2, number>();
  #state: ArticleReaderLiveRuntimeStateV3;
  #runtime: ArticleReaderParallelRuntimeV3 | null = null;
  #startPromise: Promise<void> | null = null;
  #playIntent = true;
  #documentVisible = true;
  #presentationVisible = true;
  readonly #analysisOperations = new Map<string, { token: symbol; promise: Promise<void> }>();
  #controlOperation: Promise<void> | null = null;
  #parked: StudioReaderContinuationV3 | null = null;
  #parkOperation: Promise<boolean> | null = null;
  readonly #parkedPresentation = new Map<string, {
    frame: StudioSimulationFrameV2;
    analyses: readonly StudioSimulationAnalysisV2[];
    restoredEpoch?: number;
  }>();
  #capturing = false;
  #retiring = false;
  #captureOperation: Promise<StudioReaderContinuationV3> | null = null;

  constructor(
    snapshot: ExperimentSnapshotV2,
    dependencies: ArticleReaderLiveRuntimeDependenciesV3,
  ) {
    if (snapshot.content.scenarios.length === 0) {
      throw new Error("Article Reader live runtime requires at least one Scenario");
    }
    const scenarioIds = validatedArticleReaderVisibleScenarioIdsV3(
      snapshot,
      dependencies.visibleScenarioIds,
    );
    const continuation = dependencies.continuation;
    if (continuation && (continuation.content.modelId !== snapshot.content.modelId
      || continuation.content.surfaceSeriesId !== snapshot.content.surfaceSeriesId
      || continuation.surfaceReleaseId !== snapshot.surfaceReleaseId)) {
      throw new Error("Reader continuation does not match its pinned model and Surface");
    }
    const activeScenarioId = continuation?.activeScenarioId ?? dependencies.initialActiveScenarioId
      ?? scenarioIds[0]!;
    if (!scenarioIds.includes(activeScenarioId)) {
      throw new Error(
        "Article Reader active Scenario is not in the visible Scenario scope",
      );
    }
    this.#snapshot = continuation ? { ...snapshot, content: continuation.content } : snapshot;
    this.#playIntent = continuation?.playing ?? dependencies.initialPlaybackPreference?.playing ?? true;
    this.#scenarioIds = scenarioIds;
    this.#structuralHistoryDepthByAnalysisId =
      normalizedArticleReaderStructuralAnalysesV3(
        dependencies.structuralAnalyses ?? [],
      );
    this.#presentationOutputIds = dependencies.presentationOutputIds;
    this.sampleStore = dependencies.sampleStore
      ?? new WorkbenchScenarioPresentationSampleStoreV3();
    if (dependencies.createRuntime === undefined) {
      // Retained, paused readers must not each reserve idle analysis Workers.
      this.#ownedBackgroundWorkerPool =
        dependencies.backgroundWorkerPool === undefined
          ? new WorkbenchBackgroundWorkerPoolV3({ ...resolveWorkbenchBackgroundWorkerBudgetV3(), warmSize: 0 })
          : null;
      const backgroundWorkerPool = dependencies.backgroundWorkerPool
        ?? this.#ownedBackgroundWorkerPool!;
      this.#createRuntime = (input) =>
        new WorkbenchParallelScenarioRuntimeV3({
          ...input,
          releaseTicket: dependencies.releaseTicket,
          backgroundWorkerPool,
          // Sealed-state analyses (registry preparations, then Snapshot-carried
          // preparations in this browser) replace the first measurement only.
          loadPreparedAnalysis: seed => seed.checkpoint === undefined
            ? Promise.resolve(null)
            : loadArticleReaderPreparedAnalysisV1(dependencies.releaseTicket, {
                fixture: seed.fixture, checkpoint: seed.checkpoint,
              }, undefined, backgroundWorkerPool),
          presentationOutputIds: () =>
            this.#presentationOutputIds ?? Object.freeze([]),
          presentationAnalysisIds: () => dependencies.presentationAnalysisIds ?? [],
          resolveAnalysisExecutionPlan:
            dependencies.resolveAnalysisExecutionPlan ?? (() => null),
        });
    } else {
      this.#ownedBackgroundWorkerPool = null;
      this.#createRuntime = dependencies.createRuntime;
    }
    this.#state = Object.freeze({
      status: "idle",
      snapshotId: snapshot.snapshotId,
      scenarioIds,
      activeScenarioId,
      pendingControlInstanceId: null,
      pendingAnalysisKeys: EMPTY_ARTICLE_READER_ANALYSIS_KEYS_V3,
      fixtureByScenario: articleReaderFixtureByScenarioV3(
        this.#snapshot,
        scenarioIds,
      ),
      changedScenarioIds: EMPTY_ARTICLE_READER_ANALYSIS_KEYS_V3,
      analysisByKey: EMPTY_ARTICLE_READER_ANALYSES_V3,
      analysisHistoryByKey: EMPTY_ARTICLE_READER_ANALYSIS_HISTORY_V3,
      analysisErrorByKey: EMPTY_ARTICLE_READER_ANALYSIS_ERRORS_V3,
      controlErrorByInstanceId: EMPTY_ARTICLE_READER_CONTROL_ERRORS_V3,
      error: null,
      playbackRate: { ...INITIAL_ARTICLE_PLAYBACK_RATE_STATE_V3, playbackRate: continuation?.playbackRate ?? dependencies.initialPlaybackPreference?.rate ?? 1 },
    });
  }

  readonly getSnapshot = (): ArticleReaderLiveRuntimeStateV3 => this.#state;

  presentationTrace(scenarioId: string) {
    if (!this.#scenarioIds.includes(scenarioId) || !this.#acceptsFrames()) return undefined;
    const saved = this.#parkedPresentation.get(scenarioId);
    const runtime = this.#runtime;
    if (!runtime || this.#state.status === "starting") return saved;
    const frame = runtime.latestFrame(scenarioId);
    const analyses = runtime.presentationAnalyses?.(scenarioId) ?? [];
    if (saved && frame.inputEpoch === saved.restoredEpoch && analyses.length === 0) return saved;
    return { analyses, frame };
  }

  presentationOutput(scenarioId: string, outputId: string) {
    const trace = this.presentationTrace(scenarioId);
    return mainWireCardiacCycleOutputValueV1(trace?.analyses, trace?.frame ?? null, outputId)
      ?? mainWireFillingFlowOutputValueV1(trace?.analyses, trace?.frame ?? null, outputId)
      ?? mainWireAorticJetOutputValueV1(trace?.analyses, trace?.frame ?? null, outputId);
  }

  presentationAnalysisEpoch(analysis: StudioSimulationAnalysisV2): number {
    return this.#analysisPresentationEpochs.get(analysis) ?? analysis.inputEpoch;
  }

  #publishAnalysis(key: string, analysis: StudioSimulationAnalysisV2): void {
    this.#analysisPresentationEpochs.set(analysis,
      analysis.inputEpoch + (this.#presentationEpochOffsets.get(analysis.scenarioId) ?? 0));
    this.#publish({ analysisByKey: Object.freeze({ ...this.#state.analysisByKey, [key]: analysis }) });
  }

  readonly subscribe = (listener: () => void): (() => void) => {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  };

  start(): Promise<void> {
    if (this.#startPromise !== null) return this.#startPromise;
    if (this.#state.status === "disposed") return Promise.resolve();
    if (this.#state.status !== "idle" && this.#parked === null) return Promise.resolve();
    const restored = this.#parked;

    this.#publish({ status: "starting", error: null });
    let runtime: ArticleReaderParallelRuntimeV3;
    try {
      runtime = this.#createRuntime({
        expectedModelId: this.#snapshot.content.modelId,
        onFrames: (frames) => {
          if (this.#runtime !== runtime || !this.#acceptsFrames()) return;
          try {
            appendArticleReaderFramesV3(
              frames,
              this.sampleStore,
              this.#presentationOutputIds,
              this.#presentationEpochOffsets,
            );
          } catch (error) {
            this.#fail(errorAsErrorV3(error), runtime);
          }
        },
        onError: (error) => this.#fail(errorAsErrorV3(error), runtime),
        onPlaybackRateChange: (playbackRate) => {
          if (this.#runtime === runtime && this.#acceptsFrames() && this.#state.status !== "starting") {
            this.#publish({ playbackRate });
          }
        },
      });
    } catch (error) {
      this.#publish({ status: "failed", error: errorAsErrorV3(error) });
      return Promise.resolve();
    }
    this.#runtime = runtime;
    const visibleScenarioIds = new Set(this.#scenarioIds);
    const scenarios: readonly WorkbenchParallelScenarioSeedV3[] =
      (restored?.content ?? this.#snapshot.content).scenarios
        .filter(({ scenarioId }) => visibleScenarioIds.has(scenarioId))
        .map((scenario) => Object.freeze({
          scenarioId: scenario.scenarioId,
          label: scenario.label,
          fixture: scenario.capture.fixture,
          checkpoint: scenario.capture.checkpoint,
        }));

    const operation = Promise.resolve().then(() => runtime.initialize({
      scenarios,
      activeScenarioId: this.#state.activeScenarioId,
    })).then(() => {
      if (this.#runtime !== runtime || this.#state.status !== "starting") return;
      runtime.selectScenario(this.#state.activeScenarioId);
      if (restored) {
        const analysisByKey = { ...this.#state.analysisByKey };
        for (const scenarioId of this.#scenarioIds) {
          const frame = runtime.latestFrame(scenarioId);
          const saved = this.#parkedPresentation.get(scenarioId);
          // Exact input epochs restart with a Worker. Visual history keeps its
          // monotonic sequence so distinct prior conditions cannot alias.
          const visualEpoch = this.sampleStore.getScenarioSnapshot(scenarioId).at(-1)?.inputEpoch
            ?? (saved?.frame.inputEpoch ?? frame.inputEpoch) + (this.#presentationEpochOffsets.get(scenarioId) ?? 0);
          this.#presentationEpochOffsets.set(scenarioId, visualEpoch - frame.inputEpoch);
          if (saved) saved.restoredEpoch = frame.inputEpoch;
          for (const [key, analysis] of Object.entries(analysisByKey)) {
            if (analysis.scenarioId !== scenarioId) continue;
            // These results belong to the checkpoint just restored. Keep the
            // measured source clock and payload; only the runtime binding moves.
            const rebound = Object.freeze({ ...analysis,
              runtimeSessionId: frame.runtimeSessionId, inputEpoch: frame.inputEpoch });
            this.#analysisPresentationEpochs.set(rebound, this.presentationAnalysisEpoch(analysis));
            analysisByKey[key] = rebound;
          }
        }
        this.#parked = null;
        this.#publish({ analysisByKey: Object.freeze(analysisByKey) });
      }
      // Article playback has an explicit reading pace, independent of calibration defaults.
      this.#publish({ playbackRate: runtime.setPlaybackRate(this.#state.playbackRate.playbackRate) });
      appendArticleReaderFramesV3(
        scenarios.map(({ scenarioId }) => runtime.latestFrame(scenarioId)),
        this.sampleStore,
        this.#presentationOutputIds,
        this.#presentationEpochOffsets,
      );
      if (this.#shouldPlayV3()) {
        runtime.playAll();
        if (this.#runtime === runtime && this.#state.status === "starting") {
          this.#publish({ status: "playing", error: null });
        }
      } else {
        this.#publish({ status: "paused", error: null });
      }
    }).catch((error) => {
      if (this.#runtime === runtime && this.#state.status !== "disposed") {
        this.#fail(errorAsErrorV3(error), runtime);
      }
    }).finally(() => {
      if (this.#startPromise === operation) this.#startPromise = null;
    });
    this.#startPromise = operation;
    return operation;
  }

  play(): void {
    this.#playIntent = true;
    const runtime = this.#runtime;
    if (
      runtime === null
      || this.#state.status !== "paused"
      || !this.#shouldPlayV3()
    ) return;
    try {
      runtime.playAll();
      if (this.#runtime === runtime) {
        this.#publish({ status: "playing", error: null });
      }
    } catch (error) {
      this.#fail(errorAsErrorV3(error), runtime);
    }
  }

  playbackPreference(): ArticleReaderPlaybackPreferenceV3 {
    return { playing: this.#playIntent, rate: this.#state.playbackRate.playbackRate };
  }

  setPlaybackRate(rate: number): void {
    const runtime = this.#runtime;
    if (runtime === null || !this.#acceptsFrames()) return;
    try {
      const playbackRate = runtime.setPlaybackRate(rate);
      if (this.#runtime === runtime) this.#publish({ playbackRate });
    } catch (error) {
      this.#fail(errorAsErrorV3(error), runtime);
    }
  }

  async pause(): Promise<void> {
    this.#playIntent = false;
    const runtime = this.#runtime;
    if (runtime === null || this.#state.status === "starting") return;
    if (this.#state.status !== "playing") return;
    try {
      await runtime.pauseAll();
      if (this.#runtime !== runtime) return;
      if (this.#shouldPlayV3()) {
        runtime.playAll();
        if (this.#runtime === runtime) {
          this.#publish({ status: "playing", error: null });
        }
      } else {
        this.#publish({ status: "paused", error: null });
      }
    } catch (error) {
      if (this.#runtime === runtime) this.#fail(errorAsErrorV3(error), runtime);
    }
  }

  /** Pauses hidden article simulations without changing user play intent. */
  async setDocumentVisible(visible: boolean): Promise<void> {
    this.#documentVisible = visible;
    await this.#reconcileVisibilityV3();
  }

  /** A collapsed Peek is not a visible simulation, even when its anchor is on screen. */
  async setPresentationVisible(visible: boolean): Promise<void> {
    this.#presentationVisible = visible;
    if (visible) {
      await this.#parkOperation;
      if (this.#presentationVisible && this.#parked && this.#state.status !== "disposed") await this.start();
    }
    await this.#reconcileVisibilityV3();
  }

  /** Release idle exact Workers after a reading grace period, never interrupt
   * an explicit measurement just to save memory. Completed results stay here. */
  parkIfHidden(): Promise<boolean> {
    if (this.#parkOperation) return this.#parkOperation;
    const runtime = this.#runtime;
    if (!runtime || this.#presentationVisible || this.#capturing
      || this.#state.status !== "paused" || this.#analysisOperations.size > 0) return Promise.resolve(false);
    const operation = (async () => {
      const continuation = await this.captureContinuation(false);
      if (runtime !== this.#runtime) return false;
      for (const scenarioId of this.#scenarioIds) {
        // A paused restored Worker has not produced a new complete beat yet.
        // Preserve the visible trace, including its retained measured result,
        // across repeated parks. presentationTrace also rejects old inputs.
        const trace = this.presentationTrace(scenarioId);
        if (trace) this.#parkedPresentation.set(scenarioId, { frame: trace.frame, analyses: trace.analyses });
      }
      this.#parked = continuation;
      this.#runtime = null;
      await runtime.dispose();
      if (this.#state.status !== "disposed") {
        this.#retiring = false;
        this.#capturing = false;
      }
      return true;
    })().catch(async () => {
      // Parking is optional. A failed capture leaves the current authority
      // intact, so restore its visibility policy instead of losing the reader.
      if (runtime === this.#runtime) {
        this.#retiring = false;
        this.#capturing = false;
        await this.#reconcileVisibilityV3();
      }
      return false;
    }).finally(() => { if (this.#parkOperation === operation) this.#parkOperation = null; });
    this.#parkOperation = operation;
    return operation;
  }

  async #reconcileVisibilityV3(): Promise<void> {
    const runtime = this.#runtime;
    if (runtime === null) return;
    if (this.#shouldPlayV3()) {
      if (this.#state.status === "paused") {
        runtime.playAll();
        if (this.#runtime === runtime && this.#state.status === "paused") {
          this.#publish({ status: "playing", error: null });
        }
      }
      return;
    }
    if (this.#state.status !== "playing") return;
    try {
      await runtime.pauseAll();
      if (this.#runtime !== runtime) return;
      if (this.#shouldPlayV3()) {
        runtime.playAll();
        if (this.#runtime === runtime && this.#state.status === "playing") {
          this.#publish({ status: "playing", error: null });
        }
      } else if (this.#state.status === "playing") {
        this.#publish({ status: "paused", error: null });
      }
    } catch (error) {
      if (this.#runtime === runtime) this.#fail(errorAsErrorV3(error), runtime);
    }
  }

  selectScenario(scenarioId: string): void {
    if (!this.#state.scenarioIds.includes(scenarioId)) {
      throw new Error("Article Reader selected an unknown Scenario");
    }
    const runtime = this.#runtime;
    if (this.#state.status === "idle" || this.#state.status === "starting" || this.#parked !== null) {
      this.#publish({ activeScenarioId: scenarioId });
      return;
    }
    if (runtime === null || !this.#acceptsFrames()) return;
    try {
      runtime.selectScenario(scenarioId);
      if (this.#runtime === runtime) this.#publish({ activeScenarioId: scenarioId });
    } catch (error) {
      this.#fail(errorAsErrorV3(error), runtime);
    }
  }

  /**
   * Requests one exact, read-only analysis for every requested visible
   * Scenario. Each runtime lane captures one accepted checkpoint and delegates
   * the expensive continuation to an isolated analysis Worker, so unrelated
   * and source live lanes keep animating while partial points arrive.
   */
  async requestAnalysis(input: Readonly<{
    analysisId: string;
    scenarioIds: readonly string[];
  }>): Promise<void> {
    const analysisKeys = validatedArticleReaderAnalysisTargetsV3(
      this.#scenarioIds,
      input.analysisId,
      input.scenarioIds,
    );
    if (this.#parkOperation) await this.#parkOperation;
    if (this.#parked) await this.start();
    const runtime = this.#runtime;
    if (
      runtime === null || this.#capturing
      || (this.#state.status !== "playing" && this.#state.status !== "paused")
    ) {
      return Promise.reject(new Error("Article Reader analysis requires an active live runtime"));
    }
    const operations = input.scenarioIds.map((scenarioId, index) => {
      const key = analysisKeys[index]!;
      const existing = this.#analysisOperations.get(key);
      if (existing) return existing.promise;
      const token = Symbol(key);
      const inputEpoch = runtime.latestFrame(scenarioId).inputEpoch;
      const current = () => this.#runtime === runtime
        && this.#analysisOperations.get(key)?.token === token
        && runtime.latestFrame(scenarioId).inputEpoch === inputEpoch;
      // Install the operation before publishing pending state. Different panes
      // may request the same result in the same commit; they join this promise.
      const promise = Promise.resolve().then(async () => {
        let frame: StudioSimulationFrameV2 | null = null;
        let ownsPause = false;
        try {
          await runtime.waitForControlPresentation();
          if (!current()) return;
          frame = await runtime.pauseScenario(scenarioId);
          ownsPause = true;
          if (!current()) return;
          // The runtime owns this lease from here and releases it after capture,
          // including on failure. A second finally-release could steal another
          // concurrent analysis's pause lease.
          ownsPause = false;
          const analysis = await runtime.requestAnalysis({
            scenarioId,
            analysisId: input.analysisId,
            expectedInputEpoch: frame.inputEpoch,
            expectedAcceptedRevision: frame.acceptedRevision,
            expectedAcceptedTimeSec: frame.acceptedTimeSec,
            sourceAlreadyPaused: true,
            onProgress: (progress) => {
              if (!current() || !articleReaderAnalysisMatchesInputTargetV3(progress, frame, input.analysisId)) return;
              this.#publishAnalysis(key, progress);
            },
          });
          if (!current()) return;
          if (!articleReaderAnalysisMatchesInputTargetV3(analysis, frame, input.analysisId)) {
            throw new Error("Article Reader analysis did not match the requested input target");
          }
          this.#publishAnalysis(key, analysis);
        } catch (error) {
          // A changed input revokes this result, including late errors. Other
          // Scenarios' jobs remain independently useful and continue normally.
          if (current()) this.#publish({ analysisErrorByKey: Object.freeze({
            ...this.#state.analysisErrorByKey, [key]: errorAsErrorV3(error).message,
          }) });
        } finally {
          if (ownsPause) runtime.resumeScenario(scenarioId);
          if (this.#analysisOperations.get(key)?.token === token) {
            this.#analysisOperations.delete(key);
            if (this.#runtime === runtime) this.#publish({
              pendingAnalysisKeys: Object.freeze([...this.#analysisOperations.keys()]),
            });
          }
        }
      });
      this.#analysisOperations.set(key, { token, promise });
      return promise;
    });
    this.#publish({
      pendingAnalysisKeys: Object.freeze([...this.#analysisOperations.keys()]),
      analysisErrorByKey: withoutArticleReaderRecordKeysV3(this.#state.analysisErrorByKey, analysisKeys),
    });
    return Promise.all(operations).then(() => undefined);
  }

  async applyControl(input: Readonly<{
    controlInstanceId: string;
    controlId: string;
    scenarioIds: readonly string[];
    value: number;
  }>): Promise<void> {
    if (this.#parkOperation) await this.#parkOperation;
    if (this.#parked) await this.start();
    if (this.#capturing) throw new Error("Reader is capturing its state");
    if (this.#controlOperation) throw new Error("Reader is applying another control");
    const operation = this.#applyControl(input).finally(() => {
      if (this.#controlOperation === operation) this.#controlOperation = null;
    });
    this.#controlOperation = operation;
    return operation;
  }

  async #applyControl(input: Readonly<{
    controlInstanceId: string;
    controlId: string;
    scenarioIds: readonly string[];
    value: number;
  }>): Promise<void> {
    const runtime = this.#runtime;
    if (
      runtime === null
      || (this.#state.status !== "playing" && this.#state.status !== "paused")
    ) {
      throw new Error("Article Reader control requires an active live runtime");
    }
    if (input.scenarioIds.length === 0) {
      throw new Error("Article Reader control requires at least one Scenario");
    }
    for (const scenarioId of input.scenarioIds) {
      if (!this.#state.scenarioIds.includes(scenarioId)) {
        throw new Error("Article Reader control targets an unknown Scenario");
      }
    }
    if (!Number.isFinite(input.value)) {
      throw new Error("Article Reader control value must be finite");
    }
    this.#publish({
      status: "applying-control",
      pendingControlInstanceId: input.controlInstanceId,
      controlErrorByInstanceId: withoutArticleReaderRecordKeysV3(
        this.#state.controlErrorByInstanceId,
        [input.controlInstanceId],
      ),
      error: null,
    });
    let mutationDispatched = false;
    let releaseForegroundCapacity: (() => void) | undefined;
    try {
      releaseForegroundCapacity = runtime.reserveForegroundCapacity();
      await runtime.pauseAll();
      if (this.#runtime !== runtime) return;
      const boundaryFrames = input.scenarioIds.map((scenarioId) =>
        runtime.latestFrame(scenarioId));
      const historicalAnalyses = boundaryFrames.flatMap((frame) =>
        [...this.#structuralHistoryDepthByAnalysisId]
          .filter(([, historyDepth]) => historyDepth > 0)
          .map(([analysisId]) => this.#state.analysisByKey[
            articleReaderAnalysisKeyV3(frame.scenarioId, analysisId)
          ])
          .filter((analysis): analysis is StudioSimulationAnalysisV2 =>
            analysis !== undefined
            && analysis.inputEpoch === frame.inputEpoch));
      mutationDispatched = true;
      const controlResults = await Promise.all(input.scenarioIds.map((scenarioId) => {
        const current = runtime.latestFrame(scenarioId);
        return runtime.applyControl({
          scenarioId,
          controlId: input.controlId,
          value: input.value,
          expectedInputEpoch: current.inputEpoch,
        });
      }));
      if (this.#runtime !== runtime) return;
      const frames = controlResults.map(({ frame }) => frame);
      appendArticleReaderFramesV3(
        frames,
        this.sampleStore,
        this.#presentationOutputIds,
        this.#presentationEpochOffsets,
      );
      const fixtureByScenario = Object.freeze({
        ...this.#state.fixtureByScenario,
        ...Object.fromEntries(controlResults.map(({ frame, fixture }) => [
          frame.scenarioId,
          fixture,
        ])),
      });
      const analysisHistoryByKey = archiveArticleReaderAnalysesV3(
        clearZeroDepthArticleReaderAnalysisHistoryV3(
          this.#state.analysisHistoryByKey,
          input.scenarioIds,
          this.#structuralHistoryDepthByAnalysisId,
        ),
        historicalAnalyses,
        this.#structuralHistoryDepthByAnalysisId,
        analysis => this.presentationAnalysisEpoch(analysis),
      );
      const targets = new Set(input.scenarioIds);
      const clearedAnalysisKeys = [...new Set([
        ...Object.keys(this.#state.analysisByKey), ...Object.keys(this.#state.analysisErrorByKey),
        ...this.#analysisOperations.keys(),
      ])].filter(key => targets.has((JSON.parse(key) as [string, string])[0]));
      for (const key of clearedAnalysisKeys) this.#analysisOperations.delete(key);
      this.#resumeAfterExclusiveOperationV3(runtime, {
        pendingControlInstanceId: null,
        pendingAnalysisKeys: Object.freeze([...this.#analysisOperations.keys()]),
        fixtureByScenario,
        changedScenarioIds: Object.freeze([...new Set([
          ...this.#state.changedScenarioIds, ...input.scenarioIds,
        ])]),
        analysisByKey: withoutArticleReaderRecordKeysV3(
          this.#state.analysisByKey,
          clearedAnalysisKeys,
        ),
        analysisHistoryByKey,
        analysisErrorByKey: withoutArticleReaderRecordKeysV3(
          this.#state.analysisErrorByKey,
          clearedAnalysisKeys,
        ),
        controlErrorByInstanceId: withoutArticleReaderRecordKeysV3(
          this.#state.controlErrorByInstanceId,
          [input.controlInstanceId],
        ),
        error: null,
      });
    } catch (error) {
      const normalized = errorAsErrorV3(error);
      if (this.#runtime === runtime) {
        if (mutationDispatched) {
          // Dispatch is the mutation boundary. Applying or receiving a control
          // result may fail after accepted state has already changed,
          // even for one lane. Without rollback, the controller must discard
          // the numerical authority rather than resume stale projected state.
          this.#fail(normalized, runtime);
        } else {
          this.#resumeAfterExclusiveOperationV3(runtime, {
            pendingControlInstanceId: null,
            controlErrorByInstanceId: Object.freeze({
              ...this.#state.controlErrorByInstanceId,
              [input.controlInstanceId]: normalized.message,
            }),
            error: null,
          });
        }
      }
      throw normalized;
    } finally {
      releaseForegroundCapacity?.();
    }
  }

  async dispose(): Promise<void> {
    if (this.#state.status === "disposed") return;
    this.#playIntent = false;
    const runtime = this.#runtime;
    this.#runtime = null;
    this.#analysisOperations.clear();
    this.#publish({ status: "disposed", pendingAnalysisKeys: EMPTY_ARTICLE_READER_ANALYSIS_KEYS_V3, error: null });
    if (runtime !== null) {
      try {
        await runtime.dispose();
      } catch {
        // Disposal has already revoked the controller's numerical authority.
        // Cleanup failure must not resurrect it or become an unhandled React
        // effect-cleanup rejection.
      }
    }
    this.#ownedBackgroundWorkerPool?.dispose();
  }

  /** Capture visible lanes at a drained boundary; retain saved hidden scenarios. */
  captureContinuation(resume = true): Promise<StudioReaderContinuationV3> {
    if (this.#parked) return Promise.resolve({ ...this.#parked,
      activeScenarioId: this.#state.activeScenarioId, playing: this.#playIntent,
      playbackRate: this.#state.playbackRate.playbackRate });
    this.#retiring ||= !resume;
    if (this.#captureOperation) return this.#captureOperation;
    this.#capturing = true;
    const operation = this.#captureContinuation().finally(() => {
      if (this.#captureOperation === operation) this.#captureOperation = null;
    });
    this.#captureOperation = operation;
    return operation;
  }

  async #captureContinuation(): Promise<StudioReaderContinuationV3> {
    try {
      await this.#startPromise;
      await this.#controlOperation;
      const runtime = this.#runtime;
      if (!runtime || !this.#acceptsFrames()) throw this.#state.error ?? new Error("Reader capture is unavailable");
      await runtime.pauseAll();
      if (this.#state.status === "playing") this.#publish({ status: "paused" });
      const captures = await Promise.all(this.#scenarioIds.map(id => runtime.captureScenario(id)));
      if (runtime !== this.#runtime) throw new Error("Reader changed while capturing");
      return {
        content: { ...this.#snapshot.content, scenarios: this.#snapshot.content.scenarios.map(source =>
          captures.find(item => item.scenarioId === source.scenarioId) ?? source) },
        surfaceReleaseId: this.#snapshot.surfaceReleaseId,
        activeScenarioId: this.#state.activeScenarioId,
        playing: this.#playIntent,
        playbackRate: this.#state.playbackRate.playbackRate,
      };
    } finally {
      // A retiring controller remains gated until dispose has revoked it.
      this.#capturing = this.#retiring;
      if (!this.#retiring && this.#runtime
        && (this.#state.status === "playing" || this.#state.status === "paused")) {
        this.#resumeAfterExclusiveOperationV3(this.#runtime, {});
      }
    }
  }

  #acceptsFrames(): boolean {
    return this.#state.status === "starting"
      || this.#state.status === "playing"
      || this.#state.status === "paused"
      || this.#state.status === "applying-control";
  }

  #resumeAfterExclusiveOperationV3(
    runtime: ArticleReaderParallelRuntimeV3,
    patch: Partial<ArticleReaderLiveRuntimeStateV3>,
  ): void {
    if (this.#runtime !== runtime || this.#state.status === "disposed") return;
    if (this.#shouldPlayV3()) {
      runtime.playAll();
      if (this.#runtime === runtime) {
        this.#publish({ ...patch, status: "playing" });
      }
    } else {
      this.#publish({ ...patch, status: "paused" });
    }
  }

  #shouldPlayV3(): boolean {
    return !this.#capturing && this.#playIntent && this.#documentVisible && this.#presentationVisible;
  }

  #fail(error: Error, authority: ArticleReaderParallelRuntimeV3): void {
    if (this.#runtime !== authority || this.#state.status === "disposed") return;
    this.#runtime = null;
    try {
      authority.terminate();
    } catch {
      // Numerical authority was already revoked above. Cleanup failure must
      // not replace the causal error or make the failed runtime observable.
    }
    this.#publish({
      status: "failed",
      pendingControlInstanceId: null,
      pendingAnalysisKeys: EMPTY_ARTICLE_READER_ANALYSIS_KEYS_V3,
      error,
    });
  }

  #publish(
    patch: Partial<ArticleReaderLiveRuntimeStateV3>,
  ): void {
    this.#state = Object.freeze({ ...this.#state, ...patch });
    for (const listener of this.#listeners) listener();
  }
}

const EMPTY_ARTICLE_READER_ANALYSIS_KEYS_V3 = Object.freeze([]) as
  readonly string[];
const EMPTY_ARTICLE_READER_ANALYSES_V3 = Object.freeze(
  Object.create(null),
) as Readonly<Record<string, StudioSimulationAnalysisV2>>;
const EMPTY_ARTICLE_READER_ANALYSIS_HISTORY_V3 = Object.freeze(
  Object.create(null),
) as Readonly<Record<string, readonly StudioSimulationAnalysisV2[]>>;
const EMPTY_ARTICLE_READER_ANALYSIS_ERRORS_V3 = Object.freeze(
  Object.create(null),
) as Readonly<Record<string, string>>;
const EMPTY_ARTICLE_READER_CONTROL_ERRORS_V3 = Object.freeze(
  Object.create(null),
) as Readonly<Record<string, string>>;
export const INITIAL_ARTICLE_PLAYBACK_RATE_STATE_V3:
  WorkbenchGroupPlaybackRateStateV3 = Object.freeze({
    playbackRate: 1,
    maximumRate: null,
    calibrating: true,
    userSelected: true,
    performanceLimited: false,
  });

export function articleReaderAnalysisKeyV3(
  scenarioId: string,
  analysisId: string,
): string {
  return JSON.stringify([scenarioId, analysisId]);
}

export function articleReaderAnalysisMatchesInputTargetV3(
  analysis: StudioSimulationAnalysisV2,
  frame: StudioSimulationFrameV2,
  analysisId: string,
): boolean {
  return analysis.analysisId === analysisId
    && analysis.modelId === frame.modelId
    && analysis.runtimeSessionId === frame.runtimeSessionId
    && analysis.scenarioId === frame.scenarioId
    && analysis.inputEpoch === frame.inputEpoch;
}

export function archiveArticleReaderAnalysesV3(
  current: Readonly<Record<string, readonly StudioSimulationAnalysisV2[]>>,
  analyses: readonly StudioSimulationAnalysisV2[],
  historyDepthByAnalysisId: ReadonlyMap<string, number>,
  presentationEpoch: (analysis: StudioSimulationAnalysisV2) => number = analysis => analysis.inputEpoch,
): Readonly<Record<string, readonly StudioSimulationAnalysisV2[]>> {
  if (analyses.length === 0) return current;
  const next: Record<string, readonly StudioSimulationAnalysisV2[]> = {
    ...current,
  };
  let changed = false;
  for (const analysis of analyses) {
    const historyDepth = historyDepthByAnalysisId.get(analysis.analysisId) ?? 0;
    const key = articleReaderAnalysisKeyV3(
      analysis.scenarioId,
      analysis.analysisId,
    );
    if (historyDepth <= 0) {
      if (key in next) {
        delete next[key];
        changed = true;
      }
      continue;
    }
    const withoutSameEpoch = (next[key] ?? []).filter((candidate) =>
      presentationEpoch(candidate) !== presentationEpoch(analysis));
    next[key] = Object.freeze(
      [...withoutSameEpoch, analysis].slice(-historyDepth),
    );
    changed = true;
  }
  return changed ? Object.freeze(next) : current;
}

function normalizedArticleReaderStructuralAnalysesV3(
  analyses: readonly ArticleReaderStructuralAnalysisRequestV3[],
): ReadonlyMap<string, number> {
  const depths = new Map<string, number>();
  for (const { analysisId, historyDepth } of analyses) {
    const normalizedDepth = Number.isSafeInteger(historyDepth)
      ? Math.max(0, Math.min(3, historyDepth))
      : 0;
    depths.set(
      analysisId,
      Math.max(depths.get(analysisId) ?? 0, normalizedDepth),
    );
  }
  return depths;
}

function validatedArticleReaderAnalysisTargetsV3(
  visibleScenarioIds: readonly string[],
  analysisId: string,
  requestedScenarioIds: readonly string[],
): readonly string[] {
  if (requestedScenarioIds.length === 0) {
    throw new Error("Article Reader analysis requires at least one Scenario");
  }
  const visible = new Set(visibleScenarioIds);
  const requested = new Set<string>();
  for (const scenarioId of requestedScenarioIds) {
    if (!visible.has(scenarioId)) {
      throw new Error("Article Reader analysis targets an unknown Scenario");
    }
    if (requested.has(scenarioId)) {
      throw new Error("Article Reader analysis targets a duplicate Scenario");
    }
    requested.add(scenarioId);
  }
  return Object.freeze(requestedScenarioIds.map((scenarioId) =>
    articleReaderAnalysisKeyV3(scenarioId, analysisId)));
}

function clearZeroDepthArticleReaderAnalysisHistoryV3(
  current: Readonly<Record<string, readonly StudioSimulationAnalysisV2[]>>,
  scenarioIds: readonly string[],
  historyDepthByAnalysisId: ReadonlyMap<string, number>,
): Readonly<Record<string, readonly StudioSimulationAnalysisV2[]>> {
  const keys = scenarioIds.flatMap((scenarioId) =>
    [...historyDepthByAnalysisId]
      .filter(([, historyDepth]) => historyDepth <= 0)
      .map(([analysisId]) => articleReaderAnalysisKeyV3(
        scenarioId,
        analysisId,
      )));
  return withoutArticleReaderRecordKeysV3(current, keys);
}

function withoutArticleReaderRecordKeysV3<T>(
  current: Readonly<Record<string, T>>,
  keys: readonly string[],
): Readonly<Record<string, T>> {
  const removed = new Set(keys);
  if (![...removed].some((key) => key in current)) return current;
  return Object.freeze(Object.fromEntries(Object.entries(current).filter(
    ([key]) => !removed.has(key),
  ))) as Readonly<Record<string, T>>;
}

export function validatedArticleReaderVisibleScenarioIdsV3(
  snapshot: ExperimentSnapshotV2,
  requestedScenarioIds: readonly string[] | undefined,
): readonly string[] {
  const snapshotScenarioIds = snapshot.content.scenarios.map(
    ({ scenarioId }) => scenarioId,
  );
  const visibleScenarioIds = requestedScenarioIds ?? snapshotScenarioIds;
  if (visibleScenarioIds.length === 0) {
    throw new Error("Article Reader requires at least one visible Scenario");
  }
  const requested = new Set<string>();
  const available = new Set(snapshotScenarioIds);
  for (const scenarioId of visibleScenarioIds) {
    if (requested.has(scenarioId)) {
      throw new Error("Article Reader visible Scenario scope contains a duplicate");
    }
    if (!available.has(scenarioId)) {
      throw new Error(
        "Article Reader visible Scenario is not in the pinned Snapshot",
      );
    }
    requested.add(scenarioId);
  }
  return Object.freeze(snapshotScenarioIds.filter((scenarioId) =>
    requested.has(scenarioId)));
}

function articleReaderFixtureByScenarioV3(
  snapshot: ExperimentSnapshotV2,
  scenarioIds: readonly string[],
): ArticleReaderLiveRuntimeStateV3["fixtureByScenario"] {
  const visibleScenarioIds = new Set(scenarioIds);
  return Object.freeze(Object.fromEntries(
    snapshot.content.scenarios.flatMap((scenario) =>
      visibleScenarioIds.has(scenario.scenarioId)
        ? [[scenario.scenarioId, scenario.capture.fixture] as const]
        : []),
  ));
}

export function appendArticleReaderFramesV3(
  frames: readonly StudioSimulationFrameV2[],
  sampleStore: WorkbenchScenarioPresentationSampleStoreV3,
  selectedOutputIds?: ReadonlySet<string>,
  presentationEpochOffsets?: ReadonlyMap<string, number>,
): void {
  if (selectedOutputIds?.size === 0) return;
  const diagnosticsEnabled = workbenchPerformanceDiagnosticsEnabledV3();
  const startedAtMs = diagnosticsEnabled ? workbenchPerformanceNowV3() : 0;
  const framesByScenarioId = new Map<string, StudioSimulationFrameV2[]>();
  for (const frame of frames) {
    const grouped = framesByScenarioId.get(frame.scenarioId) ?? [];
    grouped.push(frame);
    framesByScenarioId.set(frame.scenarioId, grouped);
  }
  sampleStore.appendMany([...framesByScenarioId].map(([
    scenarioId,
    scenarioFrames,
  ]) => ({
    scenarioId,
    samples: scenarioFrames.map((frame) => Object.freeze({
      inputEpoch: frame.inputEpoch + (presentationEpochOffsets?.get(scenarioId) ?? 0),
      acceptedRevision: frame.acceptedRevision,
      acceptedTimeSec: frame.acceptedTimeSec,
      values: Object.freeze(Object.fromEntries(
        (selectedOutputIds === undefined
          ? Object.keys(frame.outputs)
          : [...selectedOutputIds]
        ).map((outputId) => {
          const output = frame.outputs[outputId];
          return [
          outputId,
          output?.availability === "available"
            && output.quality !== "not-assessed"
            && typeof output.value === "number"
            && Number.isFinite(output.value)
            ? output.value
            : null,
          ];
        }),
      )),
    })),
  })));
  if (diagnosticsEnabled) {
    recordWorkbenchPerformanceDurationV3(
      "article.presentation.frame-materialization",
      workbenchPerformanceNowV3() - startedAtMs,
    );
    recordWorkbenchPerformanceValueV3(
      "article.presentation.retained-output-count",
      selectedOutputIds?.size ?? Object.keys(frames[0]?.outputs ?? {}).length,
    );
  }
}

function errorAsErrorV3(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

import React from "react";
import { useArticleReaderWorkerResourcesV1 } from "./ArticleReaderWorkerResourcesV1";
import {
  WorkbenchBackgroundWorkerPoolV3,
  resolveWorkbenchBackgroundWorkerBudgetV3,
} from "@/components/workbench/runtime/WorkbenchBackgroundWorkerPoolV3";
import type { StudioReaderContinuationV3 } from "@/studio/infrastructure/browser/StudioExperimentSessionHandoffV3";

export type ArticleReaderSessionMemoryV3 = {
  pending: Promise<StudioReaderContinuationV3 | null> | null;
  error: Error | null;
};

import type { ExperimentSnapshotV2 } from
  "@/studio/contracts/v2/content";
import type {
  StudioModelWorkerReleaseTicketV2,
} from "@/studio/contracts/v2/release";
import type {
  StudioSimulationAnalysisExecutionPlanResolverV2,
  StudioSimulationAnalysisV2,
} from "@/studio/contracts/v2/simulation";
import type {
  MainWirePeriodicPvaDerivationV1,
} from "@/analysis/methods/mainWire/MainWireAnalysisMethodRegistryV1";
import type { ExactModelFixtureProjectionV1 } from
  "@/studio/application/model/ExactModelFixtureProjectionV1";
import {
  WorkbenchScenarioPresentationSampleStoreV3,
} from "@/components/workbench/presentation/WorkbenchPresentationSampleStoreV3";
import {
  ArticleReaderLiveRuntimeV3,
  INITIAL_ARTICLE_PLAYBACK_RATE_STATE_V3,
  type ArticleReaderLiveRuntimeStateV3,
  type ArticleReaderPlaybackPreferenceV3,
  type ArticleReaderStructuralAnalysisRequestV3,
  validatedArticleReaderVisibleScenarioIdsV3,
} from "./ArticleReaderLiveRuntimeV3";

export type UseArticleReaderLiveRuntimeResultV3 = Readonly<{
  state: ArticleReaderLiveRuntimeStateV3;
  sampleStore: WorkbenchScenarioPresentationSampleStoreV3;
  /** Read-only opening figure; never ingested into the live runtime. */
  previewSampleStore?: WorkbenchScenarioPresentationSampleStoreV3;
  fixtureProjection: ExactModelFixtureProjectionV1;
  periodicPvaDerivation: MainWirePeriodicPvaDerivationV1 | null;
  presentationOutput?: ArticleReaderLiveRuntimeV3["presentationOutput"];
  presentationTrace?: ArticleReaderLiveRuntimeV3["presentationTrace"];
  presentationAnalysisEpoch?: ArticleReaderLiveRuntimeV3["presentationAnalysisEpoch"];
  captureContinuation(): Promise<StudioReaderContinuationV3>;
  play(): void;
  pause(): Promise<void>;
  setPlaybackRate(rate: number): void;
  selectScenario(scenarioId: string): void;
  requestAnalysis(input: Readonly<{
    analysisId: string;
    scenarioIds: readonly string[];
  }>): Promise<void>;
  applyControl(input: Readonly<{
    controlInstanceId: string;
    controlId: string;
    scenarioIds: readonly string[];
    value: number;
  }>): Promise<void>;
}>;

/**
 * React ownership boundary for the one Article Placement allowed to be live.
 * A fresh controller is created inside every effect lifetime, including the
 * development StrictMode setup/cleanup replay.
 */
export function useArticleReaderLiveRuntimeV3(
  snapshot: ExperimentSnapshotV2,
  exactModel: Readonly<{
    releaseTicket: StudioModelWorkerReleaseTicketV2;
    fixtureProjection: ExactModelFixtureProjectionV1;
    periodicPvaDerivation: MainWirePeriodicPvaDerivationV1 | null;
    resolveAnalysisExecutionPlan?:
      StudioSimulationAnalysisExecutionPlanResolverV2;
  }>,
  initialActiveScenarioId?: string,
  visibleScenarioIds?: readonly string[],
  structuralAnalyses: readonly ArticleReaderStructuralAnalysisRequestV3[] = [],
  presentationOutputIds?: ReadonlySet<string>,
  presentationAnalysisIds: readonly string[] = [],
  presentationVisible = true,
  playbackPreference?: { current: ArticleReaderPlaybackPreferenceV3 },
  sessionMemory?: ArticleReaderSessionMemoryV3,
  cyclePhaseOutputId?: string,
  sweepWindowSec = 6,
  enabled = true,
): UseArticleReaderLiveRuntimeResultV3 {
  const workerResources = useArticleReaderWorkerResourcesV1();
  const requestedScopeKey = JSON.stringify(visibleScenarioIds ?? null);
  const validatedVisibleScenarioIds = React.useMemo(
    () => validatedArticleReaderVisibleScenarioIdsV3(
      snapshot,
      visibleScenarioIds,
    ),
    [requestedScopeKey, snapshot],
  );
  const visibleScopeKey = JSON.stringify(validatedVisibleScenarioIds);
  const structuralAnalysisKey = JSON.stringify(structuralAnalyses);
  const presentationAnalysisKey = JSON.stringify(presentationAnalysisIds);
  const presentationOutputKey = JSON.stringify(
    presentationOutputIds === undefined
      ? null
      : [...presentationOutputIds].sort(),
  );
  const sampleStore = React.useMemo(
    () => {
      const store = new WorkbenchScenarioPresentationSampleStoreV3();
      store.setCyclePhaseOutputId(cyclePhaseOutputId);
      return store;
    },
    [presentationOutputKey, snapshot.snapshotId, visibleScopeKey, cyclePhaseOutputId],
  );
  React.useEffect(() => sampleStore.setSweepWindowSec(sweepWindowSec), [sampleStore, sweepWindowSec]);
  const controllerRef = React.useRef<ArticleReaderLiveRuntimeV3 | null>(null);
  const presentationVisibleRef = React.useRef(presentationVisible);
  presentationVisibleRef.current = presentationVisible;
  const [state, setState] = React.useState<ArticleReaderLiveRuntimeStateV3>(() =>
    initialStateV3(
      snapshot,
      initialActiveScenarioId,
      validatedVisibleScenarioIds,
    ));

  React.useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let cleanup: (() => void) | undefined;
    const initialize = async () => {
      const continuation = sessionMemory?.pending ? await sessionMemory.pending : null;
      if (cancelled) return;
      if (sessionMemory?.error) throw sessionMemory.error;
      // Epochs belong to a runtime session. A restored checkpoint starts a new
      // authority and must not archive the prior session as a changed condition.
      sampleStore.reset();
      const resourceLease = workerResources?.acquire(() => new WorkbenchBackgroundWorkerPoolV3({
        ...resolveWorkbenchBackgroundWorkerBudgetV3(), warmSize: 0,
      }));
      let controller: ArticleReaderLiveRuntimeV3;
      try {
        controller = new ArticleReaderLiveRuntimeV3(snapshot, {
          ...(resourceLease ? { backgroundWorkerPool: resourceLease } : {}),
          ...(continuation ? { continuation } : {}),
          initialPlaybackPreference: playbackPreference?.current,
          ...(initialActiveScenarioId === undefined
            ? {}
            : { initialActiveScenarioId }),
          visibleScenarioIds: validatedVisibleScenarioIds,
          structuralAnalyses,
          presentationAnalysisIds,
          ...(presentationOutputIds === undefined
            ? {}
            : { presentationOutputIds }),
          sampleStore,
          releaseTicket: exactModel.releaseTicket,
          ...(exactModel?.resolveAnalysisExecutionPlan === undefined
            ? {}
            : {
                resolveAnalysisExecutionPlan:
                  exactModel.resolveAnalysisExecutionPlan,
              }),
        });
      } catch (error) {
        resourceLease?.release();
        throw error;
      }
      controllerRef.current = controller;
      setState(controller.getSnapshot());
      const unsubscribe = controller.subscribe(() => {
        if (controllerRef.current === controller) {
          setState(controller.getSnapshot());
        }
      });
      const onVisibilityChange = () => {
        void controller.setDocumentVisible(!document.hidden);
      };
      if (typeof document !== "undefined") {
        void controller.setDocumentVisible(!document.hidden);
        document.addEventListener("visibilitychange", onVisibilityChange);
      }
      // Visibility gates autoplay without overwriting an explicit reader pause.
      void controller.setPresentationVisible(presentationVisibleRef.current);
      void controller.start();
      cleanup = () => {
        if (typeof document !== "undefined") {
          document.removeEventListener("visibilitychange", onVisibilityChange);
        }
        unsubscribe();
        if (playbackPreference) playbackPreference.current = controller.playbackPreference();
        if (controllerRef.current === controller) controllerRef.current = null;
        if (sessionMemory) {
          sessionMemory.pending = controller.captureContinuation(false)
            .catch(error => { sessionMemory.error = error instanceof Error ? error : new Error(String(error)); return null; })
            .finally(() => controller.dispose()).finally(() => resourceLease?.release());
        } else void controller.dispose().finally(() => resourceLease?.release());
      };
    };
    void initialize().catch(error => {
      if (!cancelled) setState(previous => ({ ...previous, status: "failed", error: error instanceof Error ? error : new Error(String(error)) }));
    });
    return () => { cancelled = true; cleanup?.(); };
  }, [
    enabled,
    initialActiveScenarioId,
    workerResources,
    sampleStore,
    snapshot,
    structuralAnalysisKey,
    presentationAnalysisKey,
    presentationOutputKey,
    visibleScopeKey,
    exactModel?.releaseTicket,
    exactModel?.resolveAnalysisExecutionPlan,
    playbackPreference,
    sessionMemory,
  ]);

  React.useEffect(() => {
    void controllerRef.current?.setPresentationVisible(presentationVisible);
  }, [presentationVisible]);

  React.useEffect(() => {
    if (presentationVisible || state.status !== "paused" || state.pendingAnalysisKeys.length > 0) return;
    const controller = controllerRef.current;
    // Keep quick back-and-forth reading warm; a long article must not retain
    // one numerical Worker for every Scenario ever visited.
    const timer = setTimeout(() => {
      void controller?.parkIfHidden().catch(error => {
        if (controllerRef.current === controller) setState(previous => ({ ...previous,
          status: "failed", error: error instanceof Error ? error : new Error(String(error)) }));
      });
    }, 2000);
    return () => clearTimeout(timer);
  }, [presentationVisible, state.status, state.pendingAnalysisKeys.length]);

  const captureContinuation = React.useCallback(async () => {
    const controller = controllerRef.current;
    if (!controller) throw new Error("Reader capture is unavailable");
    return controller.captureContinuation();
  }, []);
  const play = React.useCallback(() => controllerRef.current?.play(), []);
  const pause = React.useCallback(async () => {
    await controllerRef.current?.pause();
  }, []);
  const setPlaybackRate = React.useCallback((rate: number) => {
    controllerRef.current?.setPlaybackRate(rate);
  }, []);
  const selectScenario = React.useCallback((scenarioId: string) => {
    controllerRef.current?.selectScenario(scenarioId);
  }, []);
  const requestAnalysis = React.useCallback(async (input: Readonly<{
    analysisId: string;
    scenarioIds: readonly string[];
  }>) => {
    const controller = controllerRef.current;
    if (controller === null) {
      throw new Error("Article Reader live runtime is unavailable");
    }
    await controller.requestAnalysis(input);
  }, []);
  const applyControl = React.useCallback(async (input: Readonly<{
    controlInstanceId: string;
    controlId: string;
    scenarioIds: readonly string[];
    value: number;
  }>) => {
    const controller = controllerRef.current;
    if (controller === null) {
      throw new Error("Article Reader live runtime is unavailable");
    }
    await controller.applyControl(input);
  }, []);

  const presentationOutput = React.useCallback((scenarioId: string, outputId: string) =>
    controllerRef.current?.presentationOutput(scenarioId, outputId), []);
  const presentationTrace = React.useCallback((scenarioId: string) => controllerRef.current?.presentationTrace(scenarioId), []);
  const presentationAnalysisEpoch = React.useCallback((analysis: StudioSimulationAnalysisV2) =>
    controllerRef.current?.presentationAnalysisEpoch(analysis) ?? analysis.inputEpoch, []);
  return React.useMemo(() => Object.freeze({
    state,
    sampleStore,
    fixtureProjection: exactModel.fixtureProjection,
    periodicPvaDerivation: exactModel.periodicPvaDerivation,
    presentationOutput,
    presentationTrace,
    presentationAnalysisEpoch,
    applyControl,
    captureContinuation,
    play,
    pause,
    setPlaybackRate,
    requestAnalysis,
    selectScenario,
  }), [
    applyControl,
    captureContinuation,
    exactModel.fixtureProjection,
    exactModel.periodicPvaDerivation,
    presentationOutput,
    presentationTrace,
    presentationAnalysisEpoch,
    pause,
    play,
    requestAnalysis,
    sampleStore,
    selectScenario,
    setPlaybackRate,
    state,
  ]);
}

function initialStateV3(
  snapshot: ExperimentSnapshotV2,
  requestedScenarioId: string | undefined,
  visibleScenarioIds: readonly string[],
): ArticleReaderLiveRuntimeStateV3 {
  const activeScenarioId = requestedScenarioId ?? visibleScenarioIds[0] ?? "";
  if (!visibleScenarioIds.includes(activeScenarioId)) {
    throw new Error(
      "Article Reader active Scenario is not in the visible Scenario scope",
    );
  }
  return Object.freeze({
    status: "idle",
    snapshotId: snapshot.snapshotId,
    scenarioIds: visibleScenarioIds,
    activeScenarioId,
    pendingControlInstanceId: null,
    pendingAnalysisKeys: Object.freeze([]),
    fixtureByScenario: Object.freeze(Object.fromEntries(
      snapshot.content.scenarios.flatMap((scenario) =>
        visibleScenarioIds.includes(scenario.scenarioId)
          ? [[scenario.scenarioId, scenario.capture.fixture] as const]
          : []),
    )),
    changedScenarioIds: Object.freeze([]),
    analysisByKey: Object.freeze(Object.create(null)) as Readonly<
      Record<string, never>
    >,
    analysisHistoryByKey: Object.freeze(Object.create(null)) as Readonly<
      Record<string, readonly never[]>
    >,
    analysisErrorByKey: Object.freeze(Object.create(null)) as Readonly<
      Record<string, string>
    >,
    controlErrorByInstanceId: Object.freeze(Object.create(null)) as Readonly<
      Record<string, string>
    >,
    error: null,
    playbackRate: INITIAL_ARTICLE_PLAYBACK_RATE_STATE_V3,
  });
}

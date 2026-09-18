import { WorkbenchPaneSettingsButtonV3 } from "./WorkbenchPaneSettingsButtonV3";
import { ResourceAuthorV1 } from "@/components/site/PublicAuthorV1";
import React from "react";
import { loadPreparedScenarioAnalysisV1 } from "./runtime/PreparedModelAnalysisRegistryV1";
import type { StudioJsonObjectV2 } from "@/studio/contracts/v2/json";
import { workbenchPresentationAnalysisSelectionV1, workbenchModelCyclePhaseOutputIdV3 } from "./presentation/WorkbenchPresentationOutputSelectionV3";
import { WorkbenchLastMeasuredOutputsV1 } from "./presentation/WorkbenchLastMeasuredOutputsV1";
import { registeredCurrentBaselinePresentationV1 } from "@/studio/presentation/CurrentBaselinePresentationV1";
import { REGISTERED_CURRENT_MODEL_BASELINE_V1 } from "@/studio/registry/RegisteredCurrentModelBaselineV1";
import { workbenchReferencePresetsV1 } from "./WorkbenchReferencePresetsV1";
import type { StudioJsonValueV2 } from "@/studio/contracts/v2/json";
import {
  ArrowLeft,
  ClipboardList,
  Home,
  Moon,
  LoaderCircle,
  Sun,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Link,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import { useAppTheme } from "@/appTheme";
import { useUnsavedChangesGuardV3 } from "@/components/useUnsavedChangesGuardV3";
import { usePreviousPageV1 } from "@/components/usePreviousPageV1";
import { useSiteAccountSessionV3 } from "@/components/site/SiteAccountSessionV3";

import {
  WorkbenchDockview,
  type WorkbenchPaneDefinitionV3,
  type WorkbenchPaneSplitDirectionV3,
} from "@/components/workbench/WorkbenchDockview";
import { periodicPvaFromAnalysisV3 } from "./presentation/WorkbenchPeriodicPvaProjectionV3";
import { WorkbenchAreaLayoutV3 } from "@/components/workbench/WorkbenchAreaLayoutV3";
import {
  WorkbenchMobileStageDeckV3,
  useMobileWorkbenchShellV3,
} from "@/components/workbench/WorkbenchMobileStageDeckV3";
import { WorkbenchBriefingComposerV3 } from "@/components/workbench/WorkbenchBriefingComposerV3";
import {
  GraphPaneBodyV3,
} from "@/components/workbench/WorkbenchGraphPaneBodyV3";
import {
  ControlPaneBodyV3,
  OutputPaneBodyV3,
  PaneLoadingV3,
  RuntimeStatusV3,
  type WorkbenchStatusV3,
} from "@/components/workbench/WorkbenchPaneBodiesV3";
import { WorkbenchSimulationInfoV3, workbenchAnalysisLimitationsV3 } from "@/components/workbench/WorkbenchSimulationInfoV3";
import { WorkbenchPlaybackControlV3 } from "@/components/workbench/WorkbenchPlaybackControlV3";
import { WorkbenchPublishMenuV3, type WorkbenchPublicationStageV3 } from "./WorkbenchPublishMenuV3";
import {
  WorkbenchRuntimeErrorV3,
  WorkbenchSaveErrorBannerV3,
  WorkbenchSnapshotErrorBannerV3,
  WorkbenchUnavailableModelV3,
} from "@/components/workbench/WorkbenchSessionFeedbackV3";
import {
  type WorkbenchPaneEditorItemIntentV3,
  type WorkbenchPaneEditorSectionV3,
} from "@/components/workbench/WorkbenchPaneEditorV3";
import { WorkbenchPanePickerV3, type WorkbenchPanePickerRequestV3 } from "./WorkbenchPanePickerV3";
import { workbenchPopoverAnchorV3 } from "./WorkbenchAnchoredDialogV3";
import {
  compareWorkbenchOutputPaneByScenarioV3,
  deleteWorkbenchSurfacePaneV3,
  duplicateWorkbenchSurfacePaneV3,
  updateWorkbenchSurfacePaneV3,
} from "@/components/workbench/WorkbenchSurfacePaneOperationsV3";
import {
  WorkbenchScenarioManagerV3,
  scenarioIdentityColorV3,
  type WorkbenchScenarioAddIntentV3,
  type WorkbenchScenarioDeleteIntentV3,
  type WorkbenchScenarioDuplicateIntentV3,
  type WorkbenchScenarioRenameIntentV3,
} from "@/components/workbench/WorkbenchScenarioManagerV3";
import {
  WORKBENCH_SCENARIO_ID_V3,
  createDefaultExperimentSurfaceV3,
  reconcileWorkbenchPressureVolumeCapabilityV3,
  reconcileWorkbenchSurfaceScenariosV3,
  resolveWorkbenchOutputPaneScenarioIdV3,
  workbenchGraphPaneOptionsForContractV3,
} from "@/components/workbench/WorkbenchSurfaceV3";
import {
  allocateOpaqueExperimentIdV3,
} from "@/studio/infrastructure/browser/StudioExperimentIdentityV3";
import {
  devDashboardHref,
  articleEditorHref,
  experimentDetailHref,
  experimentSnapshotHref,
  publishedExperimentHref,
  homeHref,
  loginHref,
  modelDocumentationHref,
  myExperimentsHref,
  newExperimentHref,
} from "@/homeLinks";
import { isLocale } from "@/localeRouting";
import {
  resolveRegisteredModelDisclosureV1,
  resolveRegisteredPresetDocumentationV1,
} from "@/studio/presentation/modelDocumentation/RegisteredModelDocumentationV1";
import {
  loadStudioDefaultClientCompositionV2,
  loadStudioExperimentClientCompositionV2,
  loadStudioLocalCurrentClientCompositionV1,
  loadStudioSnapshotClientCompositionV2,
  type StudioClientCompositionV2,
} from "@/studio/composition/StudioDefaultCompositionV2";
import { StudioExactModelUnavailableErrorV1 } from "@/studio/infrastructure/model/StudioSupabaseModelReleaseResolverV1";
import type { StudioModelWorkerReleaseTicketV2 } from "@/studio/contracts/v2/release";
import type {
  ExperimentContentV2,
  ExperimentSurfaceControlPaneV2,
  ExperimentSurfaceGraphPaneV2,
  ExperimentSurfaceOutputPaneV2,
  ExperimentSurfaceV2,
  ExperimentSnapshotV2,
  ExperimentPlacementBriefingV2,
  ExperimentV2,
  ScenarioPresetV2,
} from "@/studio/contracts/v2/content";
import {
  STUDIO_SCENARIO_PRESET_V2_SCHEMA_ID,
} from "@/studio/contracts/v2/content";
import { validateExperimentPlacementBriefingV2 } from "@/studio/application/authoring/StudioExperimentDataV2";
import type { ModelContractV2 } from "@/studio/contracts/v2/model";
import type { StudioReleaseStageV1 } from "@/studio/contracts/v2/modelSurface";
import type {
  StudioSimulationAnalysisV2,
  StudioSimulationFrameV2,
} from "@/studio/contracts/v2/simulation";
import type {
  StudioSimulationWorkerScenarioCapturesV2,
  StudioSimulationWorkerScenarioDescriptorV2,
  StudioSimulationWorkerScenarioStateV2,
} from "@/studio/workers/StudioSimulationWorkerProtocolV2";
import { BrowserContentStore } from "@/studio/infrastructure/browser/BrowserContentStore";
import { studioCanonicalJsonStringify } from "@/domain/json/CanonicalJson";
import {
  BrowserExperimentIndex,
  BROWSER_EXPERIMENT_RECORD_SCHEMA_ID,
  type BrowserExperimentRecord,
} from "@/studio/infrastructure/browser/BrowserExperimentIndex";
import {
  createStudioSupabaseContentRepositoryV1,
  type StudioRemoteExperimentResourceV1,
} from "@/studio/infrastructure/supabase/StudioSupabaseContentRepositoryV1";
import { StudioArticleExperimentAuthoringHandoffStoreV3 } from "@/studio/infrastructure/browser/StudioArticleExperimentAuthoringHandoffV3";
import { StudioExperimentSessionHandoffStoreV3 } from "@/studio/infrastructure/browser/StudioExperimentSessionHandoffV3";
import type { ExactModelFixtureProjectionV1 } from "@/studio/application/model/ExactModelFixtureProjectionV1";
import {
  materializeExactModelControlValuesV1,
  type ExactModelControlValuesV1,
} from
  "@/studio/application/model/ExactModelControlValuesV1";
import {
  WorkbenchScenarioPresentationSampleStoreV3,
  reconcileWorkbenchGraphColorsV3,
  updateWorkbenchScenarioBaseColorV3,
  workbenchPresentationOutputSelectionV3,
} from "@/components/workbench/presentation";
import {
  WorkbenchBackgroundWorkerPoolV3,
  WORKBENCH_DEFAULT_PLAYBACK_RATE_V3,
  WorkbenchBackgroundJobCancelledErrorV3,
  resolveWorkbenchBackgroundWorkerBudgetV3,
  recordWorkbenchPerformanceDurationV3,
  recordWorkbenchPerformanceEventIntervalV3,
  type WorkbenchGroupPlaybackRateStateV3,
  workbenchPerformanceDiagnosticsEnabledV3,
  workbenchPerformanceNowV3,
} from "@/components/workbench/runtime";
import { WorkbenchParallelAuthoringCoordinatorV3 } from "@/components/workbench/runtime/WorkbenchParallelAuthoringCoordinatorV3";
import {
  WorkbenchParallelScenarioRuntimeV3,
  type WorkbenchParallelScenarioSeedV3,
} from "@/components/workbench/runtime/WorkbenchParallelScenarioRuntimeV3";
import { randomPortableTokenV3 } from "@/components/workbench/runtime/randomPortableTokenV3";
import {
  archiveWorkbenchAnalysesV3,
  cloneWorkbenchAnalysisForScenarioV3,
  cloneWorkbenchScenarioAnalysesV3,
  filterWorkbenchAnalysesByScenarioIdsV3,
  filterWorkbenchAnalysisErrorsByScenarioIdsV3,
  filterWorkbenchAnalysisHistoryByScenarioIdsV3,
  invalidateWorkbenchScenarioAnalysisEquivalenceV3,
  structuralReturnComparisonRequestKeyV3,
  withoutWorkbenchScenarioAnalysisHistoryV3,
  workbenchAnalysisHistoryKeyV3,
  workbenchAnalysisMatchesFrameEpochV3,
  workbenchScenarioIdFromAnalysisKeyV3,
  workbenchStructuralAnalysisRenderableV3,
  workbenchStructuralHistoryAnalysisIdsV3,
} from "@/components/workbench/WorkbenchAnalysisState";
import {
  createWorkbenchBriefingSnapshotV3,
  reconcileWorkbenchBriefingV3,
  resolveWorkbenchBriefingEditorChangeV3,
  resolveWorkbenchInitialBriefingV3,
  workbenchBriefingSourceScenariosMatchV3,
} from "@/components/workbench/WorkbenchBriefingPolicy";
import {
  cloneWorkbenchControlValuesV3,
  resolveWorkbenchInitialSaveStateV3,
  resolveWorkbenchSurfaceAfterCommitV3,
  shouldConfirmWorkbenchDiscardV3,
  shouldPublishWorkbenchRootFrameV3,
  workbenchInputMutationReplacedAcceptedClockV3,
  workbenchRejectedControlCanResumeRuntimeV3,
  workbenchDurableContentAvailableV3,
  workbenchPaneIdentityForIdV3,
  workbenchPublicationAvailableV3,
  workbenchPublicationIsStaleV3,
  workbenchSaveAvailableV3,
  type WorkbenchSaveStateV3,
  type WorkbenchPaneSettingsV3,
} from "@/components/workbench/WorkbenchSessionPolicy";
import {
  isRecoverableStudioSimulationWorkerRequestErrorV2,
} from "@/studio/workers/StudioSimulationWorkerClientV2";
import {
  scalarAvailableOutputV3,
} from "@/components/workbench/WorkbenchItemPresentation";
import { mainWireFormalPvAnalysisIdV1 } from "@/analysis/methods/mainWire/MainWireStructuralAnalysisContractV3";
import {
  MAIN_WIRE_PERIODIC_PVA_ANALYSIS_OUTPUT_IDS_V1,
  type MainWirePeriodicPvaDerivationV1,
} from "@/analysis/methods/mainWire/MainWireAnalysisMethodRegistryV1";

type WorkbenchScenarioOperationV3 =
  "select" | "add" | "duplicate" | "rename" | "delete";

type WorkbenchRuntimeRestartFeedbackV3 = Readonly<{
  saveState: "pristine" | "clean" | "dirty" | "error";
  saveError: string | null;
  snapshotState: "idle" | "created" | "error";
  snapshotError: string | null;
}>;

const WORKBENCH_ANALYSIS_PROGRESS_COMMIT_INTERVAL_MS_V3 = 400;
const INITIAL_WORKBENCH_PLAYBACK_RATE_STATE_V3: WorkbenchGroupPlaybackRateStateV3 =
  Object.freeze({
    playbackRate: WORKBENCH_DEFAULT_PLAYBACK_RATE_V3,
    maximumRate: null,
    calibrating: true,
    userSelected: false,
    performanceLimited: false,
  });

const recordWorkbenchReactCommitV3: React.ProfilerOnRenderCallback = (
  _id,
  _phase,
  actualDuration,
) => {
  recordWorkbenchPerformanceDurationV3(
    "react.workbench-area-commit",
    actualDuration,
  );
  recordWorkbenchPerformanceEventIntervalV3(
    "react.workbench-area-commit-interval",
  );
};

function WorkbenchPerformanceProfilerV3({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return workbenchPerformanceDiagnosticsEnabledV3() ? (
    <React.Profiler
      id="workbench-area-v3"
      onRender={recordWorkbenchReactCommitV3}
    >
      {children}
    </React.Profiler>
  ) : (
    children
  );
}
export const WorkbenchSession = ({
  initialExperimentId,
  sourceSnapshotId,
  modelLab = false,
}: Readonly<{
  initialExperimentId: string | null;
  sourceSnapshotId?: string;
  modelLab?: boolean;
}>) => {
  const { t } = useTranslation();
  const { appTheme, setAppTheme } = useAppTheme();
  const { authIdentity } = useSiteAccountSessionV3();
  const { locale } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  // First-save URL replacement changes useNavigate's identity. That must not
  // restart the runtime and discard edits made while a save was in flight.
  const navigateRef = React.useRef(navigate);
  navigateRef.current = navigate;
  const mobileWorkbenchShell = useMobileWorkbenchShellV3();
  const resolvedLocale = locale === "ja" || locale === "en" ? locale : "ja";
  const experimentIdRef = React.useRef<string | null>(initialExperimentId);
  const savedRoutePendingRef = React.useRef(false);
  const [sessionToken] = React.useState(() => {
    const queryToken = new URLSearchParams(location.search).get("sessionToken");
    return queryToken ?? `session-${randomPortableTokenV3()}`;
  });
  const experimentIndex = React.useMemo(
    () => new BrowserExperimentIndex(),
    [],
  );
  const remoteContentRepository = React.useMemo(
    createStudioSupabaseContentRepositoryV1,
    [],
  );
  const articleExperimentHandoff = React.useMemo(
    () => new StudioArticleExperimentAuthoringHandoffStoreV3(),
    [],
  );
  const experimentSessionHandoff = React.useMemo(
    () => new StudioExperimentSessionHandoffStoreV3(),
    [],
  );
  const articleAuthoringContext = React.useMemo(() => {
    const search = new URLSearchParams(location.search);
    const queryArticleId = search.get("articleId");
    const querySessionToken = search.get("sessionToken");
    const pending = articleExperimentHandoff.read();
    return queryArticleId !== null &&
      querySessionToken !== null &&
      pending !== null &&
      pending.snapshotId === null &&
      pending.articleId === queryArticleId &&
      pending.sessionToken === querySessionToken &&
      pending.sessionToken === sessionToken
      ? pending
      : null;
  }, [articleExperimentHandoff, location.search, sessionToken]);
  const experimentSessionContext = React.useMemo(() => {
    const search = new URLSearchParams(location.search);
    const snapshotId = search.get("snapshotId");
    const querySessionToken = search.get("sessionToken");
    const pending = experimentSessionHandoff.read();
    return snapshotId !== null &&
      querySessionToken !== null &&
      pending !== null &&
      pending.snapshotId === snapshotId &&
      pending.sessionToken === querySessionToken &&
      pending.sessionToken === sessionToken
      ? pending
      : null;
  }, [experimentSessionHandoff, location.search, sessionToken]);
  const [experimentRecord, setExperimentRecord] =
    React.useState<BrowserExperimentRecord | null>(null);
  const [experimentTitle, setExperimentTitle] = React.useState("");
  const [status, setStatus] = React.useState<WorkbenchStatusV3>({
    kind: "loading",
  });
  const [releaseStage, setReleaseStage] =
    React.useState<StudioReleaseStageV1>("stable");
  const [presentationSampleStore] = React.useState(
    () => new WorkbenchScenarioPresentationSampleStoreV3(),
  );
  const [surface, setSurface] = React.useState<ExperimentSurfaceV2 | null>(
    null,
  );
  const [experiment, setExperiment] = React.useState<ExperimentV2 | null>(null);
  const [snapshotCount, setSnapshotCount] = React.useState(0);
  const [saveState, setSaveStateValue] = React.useState<WorkbenchSaveStateV3>("pristine");
  const saveStateRef = React.useRef<WorkbenchSaveStateV3>("pristine");
  const setSaveState = React.useCallback((value: WorkbenchSaveStateV3) => {
    saveStateRef.current = value;
    setSaveStateValue(value);
  }, []);
  const savedTitleRef = React.useRef("");
  const [saveJustFinished, setSaveJustFinished] = React.useState(false);
  React.useEffect(() => {
    if (!saveJustFinished) return;
    const timer = window.setTimeout(() => setSaveJustFinished(false), 1600);
    return () => window.clearTimeout(timer);
  }, [saveJustFinished]);
  const [publicationStage, setPublicationStage] = React.useState<WorkbenchPublicationStageV3>(null);
  const [hasUnsavedContentChanges, setHasUnsavedContentChanges] =
    React.useState(false);
  const [hasUncommittedTitleChanges, setHasUncommittedTitleChanges] =
    React.useState(false);
  const [hasUncapturedBriefingChanges, setHasUncapturedBriefingChanges] =
    React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [snapshotState, setSnapshotState] = React.useState<
    "idle" | "creating" | "created" | "error"
  >("idle");
  const [snapshotPurpose, setSnapshotPurpose] = React.useState<
    "article" | "publication" | null
  >(null);
  const [snapshotError, setSnapshotErrorValue] = React.useState<string | null>(null);
  const [snapshotErrorFromArticle, setSnapshotErrorFromArticle] = React.useState(false);
  const snapshotErrorRef = React.useRef<string | null>(null);
  const inheritedPublicationErrorRef = React.useRef<string | null>(null);
  const setSnapshotError = React.useCallback((error: string | null) => {
    snapshotErrorRef.current = error;
    if (error === null) inheritedPublicationErrorRef.current = null;
    setSnapshotErrorValue(error);
  }, []);
  React.useEffect(() => {
    const inherited = location.state?.workbenchPublicationError;
    if (typeof inherited !== "string") return;
    inheritedPublicationErrorRef.current = inherited;
    setSnapshotErrorFromArticle(false);
    setSnapshotError(inherited);
    const state = { ...location.state };
    delete state.workbenchPublicationError;
    navigateRef.current(`${location.pathname}${location.search}`, { replace: true, state });
  }, [location.key]);
  const [recoveryError, setRecoveryError] = React.useState<string | null>(null);
  const [briefingOpen, setBriefingOpen] = React.useState(false);
  const [articleLinked, setArticleLinked] = React.useState(false);
  const [briefing, setBriefing] =
    React.useState<ExperimentPlacementBriefingV2 | null>(null);
  const [briefingCaptureSnapshot, setBriefingCaptureSnapshot] =
    React.useState<ExperimentSnapshotV2 | null>(null);
  const [
    briefingCaptureSurfaceMutationRevision,
    setBriefingCaptureSurfaceMutationRevision,
  ] = React.useState<number | null>(null);
  const [paneSettings, setPaneSettings] =
    React.useState<WorkbenchPanePickerRequestV3 | null>(null);
  const [isPlaying, setIsPlaying] = React.useState(true);
  const [playbackRate, setPlaybackRate] = React.useState(
    INITIAL_WORKBENCH_PLAYBACK_RATE_STATE_V3,
  );
  const [backgroundWorkerPool, setBackgroundWorkerPool] =
    React.useState<WorkbenchBackgroundWorkerPoolV3 | null>(null);
  const [runtimeGeneration, setRuntimeGeneration] = React.useState(0);
  const [, setControlValues] = React.useState<ExactModelControlValuesV1>(
    {},
  );
  const [pendingControlId, setPendingControlId] = React.useState<string | null>(
    null,
  );
  const [controlError, setControlError] = React.useState<string | null>(null);
  const [scenarios, setScenarios] = React.useState<
    readonly StudioSimulationWorkerScenarioDescriptorV2[]
  >([]);
  const [activeScenarioId, setActiveScenarioId] = React.useState<string | null>(
    null,
  );
  const [hiddenScenarioIds, setHiddenScenarioIds] = React.useState<
    readonly string[]
  >([]);
  const [scenarioPresets, setScenarioPresets] = React.useState<
    readonly ScenarioPresetV2[]
  >([]);
  const [scenarioOperation, setScenarioOperation] =
    React.useState<WorkbenchScenarioOperationV3 | null>(null);
  const [scenarioError, setScenarioError] = React.useState<string | null>(null);
  const [analysisByKey, setAnalysisByKey] = React.useState<
    Readonly<Record<string, StudioSimulationAnalysisV2>>
  >({});
  const [analysisHistoryByKey, setAnalysisHistoryByKey] = React.useState<
    Readonly<Record<string, readonly StudioSimulationAnalysisV2[]>>
  >({});
  const [pendingAnalysisKeys, setPendingAnalysisKeys] = React.useState<
    readonly string[]
  >([]);
  const [analysisCapturePending, setAnalysisCapturePending] =
    React.useState(false);
  const [analysisErrorByKey, setAnalysisErrorByKey] = React.useState<
    Readonly<Record<string, string>>
  >({});
  const runtimeRef = React.useRef<WorkbenchParallelScenarioRuntimeV3 | null>(
    null,
  );
  const workerReleaseTicketRef = React.useRef<
    StudioModelWorkerReleaseTicketV2 | undefined
  >(undefined);
  const periodicPvaDerivationRef = React.useRef<
    MainWirePeriodicPvaDerivationV1 | null
  >(null);
  const fixtureProjectionRef =
    React.useRef<ExactModelFixtureProjectionV1 | null>(null);
  const surfaceSeriesIdRef = React.useRef<string | undefined>(undefined);
  const surfaceReleaseIdRef = React.useRef<string | undefined>(undefined);
  const initialBaselineFixtureRef = React.useRef<StudioJsonValueV2 | null>(null);
  const translationRef = React.useRef(t);
  const analysisByKeyRef = React.useRef<
    Readonly<Record<string, StudioSimulationAnalysisV2>>
  >({});
  const equivalentAnalysisSourceByScenarioRef = React.useRef(
    new Map<string, string>(),
  );
  const queuedAnalysisProgressByKeyRef = React.useRef(
    new Map<string, StudioSimulationAnalysisV2>(),
  );
  const analysisProgressCommitTimerRef = React.useRef<number | null>(null);
  const contentStoreRef = React.useRef<BrowserContentStore | null>(
    null,
  );
  const experimentRef = React.useRef<ExperimentV2 | null>(null);
  const experimentTitleRef = React.useRef("");
  const latestFrameRef = React.useRef<StudioSimulationFrameV2 | null>(null);
  const retainedPresentationRef = React.useRef(new Map<string, {
    frame: StudioSimulationFrameV2;
    analyses: readonly StudioSimulationAnalysisV2[];
  }>());
  const controlRecoveryRef = React.useRef<{
    content: ExperimentContentV2;
    beforeControl: boolean;
  } | null>(null);
  const pendingRecoveryRef = React.useRef<ExperimentContentV2 | null>(null);
  const stopRuntimeRef = React.useRef<(error: unknown) => void>(() => undefined);
  const lastRootFrameTimeSecRef = React.useRef(Number.NEGATIVE_INFINITY);
  const activeScenarioIdRef = React.useRef<string | null>(null);
  const controlValuesByScenarioRef = React.useRef<
    Record<string, ExactModelControlValuesV1>
  >({});
  const playingIntentRef = React.useRef(true);
  const appliedReaderPlaybackTokenRef = React.useRef<string | null>(null);
  const exclusiveOperationRef = React.useRef<
    "control" | "analysis" | "scenario" | "save" | "snapshot" | "publication" | null
  >(null);
  const analysisCaptureTokenRef = React.useRef<symbol | null>(null);
  const analysisCaptureReleaseRef = React.useRef<Readonly<{
    token: symbol;
    promise: Promise<void>;
    resolve: () => void;
  }> | null>(null);
  const surfaceRef = React.useRef<ExperimentSurfaceV2 | null>(null);
  const briefingRef = React.useRef<ExperimentPlacementBriefingV2 | null>(null);
  const briefingMutationRevisionRef = React.useRef(0);
  const scenarioDescriptorsRef = React.useRef<
    readonly StudioSimulationWorkerScenarioDescriptorV2[]
  >([]);
  const surfaceMutationRevisionRef = React.useRef(0);
  const pendingSurfaceAfterRuntimeRestartRef =
    React.useRef<ExperimentSurfaceV2 | null>(null);
  const pendingFeedbackAfterRuntimeRestartRef =
    React.useRef<WorkbenchRuntimeRestartFeedbackV3 | null>(null);
  const contract = status.kind === "live" ? status.contract : null;
  // Mobile task tabs unmount their panes. Keep display memory in the Session,
  // isolated by pane and Scenario; restart/model/Surface changes clear it.
  const lastMeasurementsByScope = React.useMemo(() => new Map<string, {
    paneId: string; scenarioId: string | null; memory: WorkbenchLastMeasuredOutputsV1;
  }>(), [contract, runtimeGeneration]);
  React.useEffect(() => {
    for (const [key, scope] of lastMeasurementsByScope) {
      if (!surface?.outputPanes.some(pane => pane.paneId === scope.paneId)
        || !scenarios.some(scenario => scenario.scenarioId === scope.scenarioId)) {
        lastMeasurementsByScope.delete(key);
      }
    }
  }, [lastMeasurementsByScope, surface?.outputPanes, scenarios]);
  const surfaceReleaseId = surfaceReleaseIdRef.current;
  const modelDisclosure = React.useMemo(() => resolveRegisteredModelDisclosureV1(
    contract?.modelId, surfaceReleaseId,
  ), [contract?.modelId, surfaceReleaseId]);
  const modelDocumentation = modelDisclosure.documentation;
  const modelDocumentationLink = modelDocumentation === null
    ? undefined
    : modelDocumentationHref({
        locale: isLocale(locale) ? locale : undefined,
        modelId: modelDocumentation.modelId,
        surfaceReleaseId: modelDocumentation.surfaceReleaseId,
        documentId: modelDocumentation.documentId,
      });
  const modelLimitationsKey = modelDisclosure.limitationsTranslationKey;
  const baselineFixture = initialBaselineFixtureRef.current;
  const baselineValidationPresentation = React.useMemo(() => registeredCurrentBaselinePresentationV1(
    contract?.modelId, baselineFixture, resolvedLocale,
  ), [contract?.modelId, baselineFixture, resolvedLocale]);

  React.useEffect(() => {
    translationRef.current = t;
  }, [t]);

  React.useEffect(() => {
    const pool = new WorkbenchBackgroundWorkerPoolV3(
      resolveWorkbenchBackgroundWorkerBudgetV3(),
    );
    setBackgroundWorkerPool(pool);
    return () => pool.dispose();
  }, []);

  const replaceAnalysisByKeyV3 = React.useCallback(
    (next: Readonly<Record<string, StudioSimulationAnalysisV2>>) => {
      analysisByKeyRef.current = next;
      setAnalysisByKey(next);
    },
    [],
  );

  const commitAnalysesV3 = React.useCallback(
    (analyses: readonly StudioSimulationAnalysisV2[]) => {
      const runtime = runtimeRef.current;
      const accepted: Array<readonly [string, StudioSimulationAnalysisV2]> = [];
      for (const analysis of analyses) {
        let frame: StudioSimulationFrameV2 | null = null;
        if (runtime !== null) {
          try {
            frame = runtime.latestFrame(analysis.scenarioId);
          } catch {
            continue;
          }
        }
        if (workbenchAnalysisMatchesFrameEpochV3(analysis, frame)) {
          accepted.push(
            Object.freeze([
              workbenchAnalysisHistoryKeyV3(
                analysis.scenarioId,
                analysis.analysisId,
              ),
              analysis,
            ]),
          );
          if (runtime !== null) {
            for (const [
              targetScenarioId,
              sourceScenarioId,
            ] of equivalentAnalysisSourceByScenarioRef.current) {
              if (sourceScenarioId !== analysis.scenarioId) continue;
              let targetFrame: StudioSimulationFrameV2;
              try {
                targetFrame = runtime.latestFrame(targetScenarioId);
              } catch {
                continue;
              }
              const cloned = cloneWorkbenchAnalysisForScenarioV3(
                analysis,
                targetFrame,
              );
              accepted.push(
                Object.freeze([
                  workbenchAnalysisHistoryKeyV3(
                    cloned.scenarioId,
                    cloned.analysisId,
                  ),
                  cloned,
                ]),
              );
            }
          }
        }
      }
      if (accepted.length === 0) return;
      replaceAnalysisByKeyV3(
        Object.freeze({
          ...analysisByKeyRef.current,
          ...Object.fromEntries(accepted),
        }),
      );
    },
    [replaceAnalysisByKeyV3],
  );

  const commitAnalysisV3 = React.useCallback(
    (analysis: StudioSimulationAnalysisV2) => {
      queuedAnalysisProgressByKeyRef.current.delete(
        workbenchAnalysisHistoryKeyV3(analysis.scenarioId, analysis.analysisId),
      );
      commitAnalysesV3([analysis]);
    },
    [commitAnalysesV3],
  );

  const queueAnalysisProgressV3 = React.useCallback(
    (analysis: StudioSimulationAnalysisV2) => {
      queuedAnalysisProgressByKeyRef.current.set(
        workbenchAnalysisHistoryKeyV3(analysis.scenarioId, analysis.analysisId),
        analysis,
      );
      if (analysisProgressCommitTimerRef.current !== null) return;
      analysisProgressCommitTimerRef.current = window.setTimeout(() => {
        analysisProgressCommitTimerRef.current = null;
        const pending = Object.freeze([
          ...queuedAnalysisProgressByKeyRef.current.values(),
        ]);
        queuedAnalysisProgressByKeyRef.current.clear();
        commitAnalysesV3(pending);
      }, WORKBENCH_ANALYSIS_PROGRESS_COMMIT_INTERVAL_MS_V3);
    },
    [commitAnalysesV3],
  );

  React.useEffect(
    () => () => {
      if (analysisProgressCommitTimerRef.current !== null) {
        window.clearTimeout(analysisProgressCommitTimerRef.current);
        analysisProgressCommitTimerRef.current = null;
      }
      queuedAnalysisProgressByKeyRef.current.clear();
    },
    [],
  );

  const updateWorkbenchBriefingV3 = React.useCallback(
    (next: ExperimentPlacementBriefingV2) => {
      briefingMutationRevisionRef.current += 1;
      briefingRef.current = next;
      setBriefing(next);
    },
    [],
  );

  React.useEffect(() => {
    if (articleAuthoringContext !== null) setArticleLinked(true);
  }, [articleAuthoringContext]);

  React.useEffect(() => {
    if (briefingOpen || briefingCaptureSnapshot === null) return undefined;
    const timeout = window.setTimeout(() => {
      setBriefingCaptureSnapshot(null);
      setBriefingCaptureSurfaceMutationRevision(null);
    }, 180);
    return () => window.clearTimeout(timeout);
  }, [briefingCaptureSnapshot, briefingOpen]);

  React.useEffect(() => {
    if (backgroundWorkerPool === null) return undefined;
    let cancelled = false;
    let runtime: WorkbenchParallelScenarioRuntimeV3 | undefined;

    const failRuntime = (error: unknown) => {
      if (cancelled) return;
      playingIntentRef.current = false;
      setIsPlaying(false);
      runtime?.terminate();
      runtime = undefined;
      runtimeRef.current = null;
      exclusiveOperationRef.current = null;
      analysisCaptureTokenRef.current = null;
      analysisCaptureReleaseRef.current?.resolve();
      analysisCaptureReleaseRef.current = null;
      setAnalysisCapturePending(false);
      setPendingAnalysisKeys([]);
      const message = error instanceof Error ? error.message : String(error);
      setStatus(current => current.kind === "live"
        ? { ...current, halted: message }
        : { kind: "error", message });
    };
    stopRuntimeRef.current = failRuntime;

    const start = async () => {
      const contentStore =
        remoteContentRepository === null
          ? new BrowserContentStore()
          : null;
      contentStoreRef.current = contentStore;
      const durableExperimentId = experimentIdRef.current;
      const remoteExperimentResource =
        durableExperimentId === null || remoteContentRepository === null
          ? null
          : await remoteContentRepository.readMyExperiment(durableExperimentId);
      const storedExperiment =
        durableExperimentId === null
          ? null
          : remoteContentRepository === null
            ? contentStore!.readExperiment(durableExperimentId)
            : (remoteExperimentResource?.experiment ?? null);
      if (durableExperimentId !== null && storedExperiment === null) {
        navigateRef.current(myExperimentsHref(resolvedLocale), { replace: true });
        return;
      }
      const requestedSnapshotId = sourceSnapshotId ?? new URLSearchParams(location.search).get(
        "snapshotId",
      );
      const sourceSnapshot =
        storedExperiment === null && requestedSnapshotId !== null
          ? remoteContentRepository === null
            ? contentStore!.readSnapshot(requestedSnapshotId)
            : await remoteContentRepository.readSnapshot(requestedSnapshotId)
          : null;
      if (requestedSnapshotId !== null && storedExperiment === null && sourceSnapshot === null) {
        throw new Error(translationRef.current("snapshotReader.missingTitle"));
      }
      const snapshotTitle = sourceSnapshot === null ? null
        : remoteContentRepository === null
          ? experimentIndex.list().find(record => record.publishedSnapshotId === sourceSnapshot.snapshotId)?.title ?? null
          : await remoteContentRepository.readPublicSnapshotTitle(sourceSnapshot.snapshotId);
      const sourceBriefing =
        sourceSnapshot === null ||
        articleAuthoringContext?.briefing === null ||
        articleAuthoringContext?.briefing === undefined
          ? null
          : validateExperimentPlacementBriefingV2(
              articleAuthoringContext.briefing,
              sourceSnapshot.content,
            );
      const continuation = sourceSnapshot ? experimentSessionContext?.continuation : undefined;
      if (continuation && (continuation.content.modelId !== sourceSnapshot!.content.modelId
        || continuation.content.surfaceSeriesId !== sourceSnapshot!.content.surfaceSeriesId
        || continuation.surfaceReleaseId !== sourceSnapshot!.surfaceReleaseId)) {
        throw new Error("Reader continuation does not match the saved model and Surface");
      }
      const recoveryContent = pendingRecoveryRef.current;
      const initialContent = recoveryContent ?? storedExperiment?.content ?? continuation?.content ?? sourceSnapshot?.content;
      const initializeReaderPlayback = continuation !== undefined
        && experimentSessionContext?.sessionToken !== appliedReaderPlaybackTokenRef.current;
      if (initializeReaderPlayback) playingIntentRef.current = continuation.playing;
      let composition: StudioClientCompositionV2;
      try {
        composition =
          storedExperiment !== null
            ? await loadStudioExperimentClientCompositionV2(
                storedExperiment.content.modelId,
                storedExperiment.content.surfaceSeriesId,
              )
            : sourceSnapshot !== null
              ? await loadStudioSnapshotClientCompositionV2(
                  sourceSnapshot.content.modelId,
                  sourceSnapshot.content.surfaceSeriesId,
                  sourceSnapshot.surfaceReleaseId,
                )
              : modelLab
                ? await loadStudioLocalCurrentClientCompositionV1()
                : await loadStudioDefaultClientCompositionV2();
      } catch (error) {
        if (
          initialContent !== undefined &&
          error instanceof StudioExactModelUnavailableErrorV1
        ) {
          playingIntentRef.current = false;
          setIsPlaying(false);
          setStatus({
            kind: "unavailable-model",
            savedModelId: initialContent.modelId,
          });
          return;
        }
        throw error;
      }
      if (cancelled) return;
      if (recoveryContent && (recoveryContent.modelId !== composition.exactModel.modelId
        || recoveryContent.surfaceSeriesId !== composition.modelSurface.identity.surfaceSeriesId)) {
        throw new Error("Recovery requires the same exact model and Surface");
      }
      setReleaseStage(composition.exactModel.stage);
      workerReleaseTicketRef.current = composition.exactModel.workerReleaseTicket;
      fixtureProjectionRef.current = composition.exactModel.fixtureProjection;
      periodicPvaDerivationRef.current = composition.modelSurface.analysis.periodicPvaDerivation;
      surfaceSeriesIdRef.current = composition.modelSurface.identity.surfaceSeriesId;
      surfaceReleaseIdRef.current = composition.modelSurface.identity.surfaceReleaseId;
      const record =
        storedExperiment === null
          ? null
          : remoteExperimentResource === null
            ? experimentIndex.ensure({
                experimentId: durableExperimentId!,
                title:
                  storedExperiment.content.scenarios[0]?.label ??
                  translationRef.current("workbench.selector.untitled"),
                nowIso: new Date().toISOString(),
              })
            : remoteExperimentRecordV3(remoteExperimentResource);
      setExperimentRecord(record);
      const initialTitle =
        (recoveryContent ? experimentTitleRef.current : null) ?? record?.title ??
        snapshotTitle ??
        sourceBriefing?.defaultTitle ??
        sourceSnapshot?.content.scenarios[0]?.label ??
        translationRef.current("workbench.selector.untitled");
      setExperimentTitle(initialTitle);
      experimentTitleRef.current = initialTitle;
      savedTitleRef.current = initialTitle;
      setArticleLinked(articleAuthoringContext !== null);
      const preferredScenarioId = activeScenarioIdRef.current ?? continuation?.activeScenarioId;
      const initialScenarioId =
        preferredScenarioId != null &&
        initialContent?.scenarios.some(
          ({ scenarioId }) => scenarioId === preferredScenarioId,
        )
          ? preferredScenarioId
          : (initialContent?.scenarios[0]?.scenarioId ??
            WORKBENCH_SCENARIO_ID_V3);
      const storedScenario = initialContent?.scenarios.find(
        ({ scenarioId }) => scenarioId === initialScenarioId,
      );
      // Show evidence for the actual starting fixture, never relabel a saved
      // scenario with the selected baseline's report merely by model ID.
      initialBaselineFixtureRef.current = storedScenario?.capture.fixture
        ?? composition.exactModel.defaultFixture;
      const pendingSurface = pendingSurfaceAfterRuntimeRestartRef.current;
      const pendingFeedback = pendingFeedbackAfterRuntimeRestartRef.current;
      const candidateSurface =
        pendingSurface ??
        initialContent?.surface ??
        createDefaultExperimentSurfaceV3(
          composition.modelSurface.contract,
          initialScenarioId,
          {
            periodicPvaSupported:
              composition.modelSurface.analysis.periodicPvaDerivation !== null,
          },
        );
      const baselineLabel = translationRef.current(
        "workbench.editor.scenarioManager.baselinePresetTitle",
      );
      const candidateScenarioDescriptors =
        initialContent === undefined
          ? Object.freeze([
              Object.freeze({
                scenarioId: initialScenarioId,
                label: baselineLabel,
              }),
            ])
          : Object.freeze(
              initialContent.scenarios.map((scenario) =>
                Object.freeze({
                  scenarioId: scenario.scenarioId,
                  label: scenario.label,
                }),
              ),
            );
      const capabilitySurface = reconcileWorkbenchPressureVolumeCapabilityV3(
        candidateSurface,
        composition.modelSurface.contract,
        composition.modelSurface.analysis.periodicPvaDerivation !== null,
      );
      const nextSurface = reconcileWorkbenchSurfaceScenariosV3(
        capabilitySurface,
        candidateScenarioDescriptors,
      );
      surfaceRef.current = nextSurface;
      setSurface(nextSurface);
      experimentRef.current = storedExperiment;
      setExperiment(storedExperiment);
      setSnapshotCount(0);
      scenarioDescriptorsRef.current = candidateScenarioDescriptors;
      const nextBriefing = reconcileWorkbenchBriefingV3({
        briefing: resolveWorkbenchInitialBriefingV3({
          current: briefingRef.current,
          sourceBriefing,
        }),
        preferredFocusScenarioId: initialScenarioId,
        defaultTitle: experimentTitleRef.current,
        snapshot: createWorkbenchBriefingSnapshotV3({
          defaultTitle: experimentTitleRef.current,
          modelId: composition.exactModel.modelId,
          surfaceSeriesId: composition.modelSurface.identity.surfaceSeriesId,
          surfaceReleaseId: composition.modelSurface.identity.surfaceReleaseId,
          scenarios: candidateScenarioDescriptors,
          surface: nextSurface,
        }),
      });
      briefingRef.current = nextBriefing;
      setBriefing(nextBriefing);
      setSaveState(
        resolveWorkbenchInitialSaveStateV3({
          hasStoredExperiment: storedExperiment !== null,
          hasSourceSnapshot: sourceSnapshot !== null,
          hasPendingSurface: pendingSurface !== null,
          pendingSaveState: pendingFeedback?.saveState ?? null,
        }),
      );
      setHasUnsavedContentChanges(
        pendingSurface !== null ||
          pendingFeedback?.saveState === "dirty" ||
          pendingFeedback?.saveState === "error",
      );
      setHasUncommittedTitleChanges(false);
      setHasUncapturedBriefingChanges(false);
      setSaveError(pendingFeedback?.saveError ?? null);
      setSnapshotState(pendingFeedback?.snapshotState ?? "idle");
      setSnapshotPurpose(null);
      setSnapshotError(pendingFeedback?.snapshotError ?? inheritedPublicationErrorRef.current);
      inheritedPublicationErrorRef.current = null;
      setScenarios([]);
      setActiveScenarioId(null);
      setScenarioPresets([]);
      setScenarioOperation(null);
      setScenarioError(null);
      controlValuesByScenarioRef.current = {};
      setControlValues(
        materializeExactModelControlValuesV1(
          composition.modelSurface.contract,
          storedScenario?.capture.fixture ?? composition.exactModel.defaultFixture,
          composition.exactModel.fixtureProjection,
        ),
      );
      setControlError(null);
      setPendingControlId(null);
      setPlaybackRate(INITIAL_WORKBENCH_PLAYBACK_RATE_STATE_V3);
      replaceAnalysisByKeyV3({});
      equivalentAnalysisSourceByScenarioRef.current.clear();
      setAnalysisHistoryByKey({});
      setPendingAnalysisKeys([]);
      setAnalysisCapturePending(false);
      setAnalysisErrorByKey({});
      exclusiveOperationRef.current = null;
      analysisCaptureTokenRef.current = null;
      analysisCaptureReleaseRef.current?.resolve();
      analysisCaptureReleaseRef.current = null;
      presentationSampleStore.reset();
      presentationSampleStore.setCyclePhaseOutputId(workbenchModelCyclePhaseOutputIdV3(composition.modelSurface.contract));
      retainedPresentationRef.current.clear();

      const runtimeSeeds: readonly WorkbenchParallelScenarioSeedV3[] =
        initialContent === undefined
          ? [
              Object.freeze({
                scenarioId: initialScenarioId,
                label: baselineLabel,
                fixture: composition.exactModel.defaultFixture,
                ...(composition.exactModel.defaultCheckpoint === undefined
                  ? {} : { checkpoint: composition.exactModel.defaultCheckpoint }),
              }),
            ]
          : initialContent.scenarios.map((scenario) =>
              Object.freeze({
                scenarioId: scenario.scenarioId,
                label: scenario.label,
                fixture: scenario.capture.fixture,
                checkpoint: scenario.capture.checkpoint,
              }),
            );
      runtime = new WorkbenchParallelScenarioRuntimeV3({
        expectedModelId: composition.exactModel.modelId,
        releaseTicket: composition.exactModel.workerReleaseTicket,
        backgroundWorkerPool,
        resolveAnalysisExecutionPlan: composition.modelSurface.analysis.resolveExecutionPlan,
        loadPreparedAnalysis: async seed => {
          if (!seed.checkpoint) return null;
          return loadPreparedScenarioAnalysisV1(composition.exactModel.workerReleaseTicket,
            { fixture: seed.fixture, checkpoint: seed.checkpoint });
        },
        presentationAnalysisIds: () => surfaceRef.current === null ? []
          : workbenchPresentationAnalysisSelectionV1(surfaceRef.current, composition.modelSurface.catalog,
            composition.modelSurface.analysis.presentationMethods),
        presentationOutputIds: () =>
          surfaceRef.current === null
            ? Object.freeze([])
            : workbenchPresentationOutputSelectionV3(
                composition.modelSurface.contract,
                surfaceRef.current,
              ),
        onFrames: (frames) => {
          if (cancelled) return;
          for (const frame of frames) {
            const previous = retainedPresentationRef.current.get(frame.scenarioId);
            // Only retain complete frames actually released to the display.
            if (!previous || Object.keys(frame.outputs).length >= Object.keys(previous.frame.outputs).length) {
              retainedPresentationRef.current.set(frame.scenarioId, {
                frame, analyses: runtime?.presentationAnalyses(frame.scenarioId) ?? [],
              });
            }
          }
          appendFramesV3(
            frames,
            presentationSampleStore,
            surfaceRef.current === null
              ? undefined
              : workbenchPresentationOutputSelectionV3(
                  composition.modelSurface.contract,
                  surfaceRef.current,
                ),
          );
          const activeId = activeScenarioIdRef.current;
          const frame =
            activeId === null || runtime === undefined
              ? undefined
              : runtime.maybeLatestFrame(activeId);
          if (frame === undefined) return;
          latestFrameRef.current = frame;
          if (
            shouldPublishWorkbenchRootFrameV3({
              acceptedTimeSec: frame.acceptedTimeSec,
              lastPublishedTimeSec: lastRootFrameTimeSecRef.current,
              schedulerRunning: runtime?.playing ?? false,
            })
          ) {
            lastRootFrameTimeSecRef.current = frame.acceptedTimeSec;
            setStatus((current) =>
              current.kind === "live" ? { ...current, frame } : current,
            );
          }
        },
        onPlaybackRateChange: setPlaybackRate,
        onError: failRuntime,
      });
      const initialState = await runtime.initialize({
        scenarios: runtimeSeeds,
        activeScenarioId: initialScenarioId,
      });
      if (cancelled) {
        runtime.terminate();
        return;
      }
      const capturedScenarios = await runtime.captureScenarios();
      if (cancelled) {
        runtime.terminate();
        return;
      }
      controlRecoveryRef.current = {
        content: { modelId: composition.exactModel.modelId,
          surfaceSeriesId: composition.modelSurface.identity.surfaceSeriesId,
          scenarios: capturedScenarios.scenarios, surface: nextSurface },
        beforeControl: false,
      };
      const descriptors = Object.freeze(
        capturedScenarios.scenarios.map(({ scenarioId, label }) =>
          Object.freeze({ scenarioId, label }),
        ),
      );
      scenarioDescriptorsRef.current = descriptors;
      const controlValuesByScenario = Object.fromEntries(
        capturedScenarios.scenarios.map((scenario) => [
          scenario.scenarioId,
          materializeExactModelControlValuesV1(
            composition.modelSurface.contract,
            scenario.capture.fixture,
            composition.exactModel.fixtureProjection,
          ),
        ]),
      );
      controlValuesByScenarioRef.current = controlValuesByScenario;
      activeScenarioIdRef.current = capturedScenarios.activeScenarioId;
      setScenarios(descriptors);
      setActiveScenarioId(capturedScenarios.activeScenarioId);
      setControlValues(
        controlValuesByScenario[capturedScenarios.activeScenarioId] ??
          materializeExactModelControlValuesV1(
            composition.modelSurface.contract,
            composition.exactModel.defaultFixture,
            composition.exactModel.fixtureProjection,
          ),
      );
      const baseline = capturedScenarios.scenarios.find(
        ({ scenarioId }) => scenarioId === capturedScenarios.activeScenarioId,
      );
      const registered = REGISTERED_CURRENT_MODEL_BASELINE_V1;
      setScenarioPresets(workbenchReferencePresetsV1({
        modelId: composition.exactModel.modelId, startup: baseline?.capture,
        supplied: composition.presets ?? [],
        baseline: composition.exactModel.modelId === registered.modelId ? {
          schemaId: STUDIO_SCENARIO_PRESET_V2_SCHEMA_ID, presetId: registered.baselineId,
          modelId: registered.modelId, title: "baseline",
          description: translationRef.current("workbench.editor.scenarioManager.baselinePresetDescription"),
          capture: { fixture: registered.fixture, checkpoint: registered.checkpoint },
        } : undefined,
        loadedLabel: translationRef.current("workbench.editor.scenarioManager.loadedStateTitle"),
        loadedDescription: translationRef.current("workbench.editor.scenarioManager.loadedStateDescription"),
      }));
      const initial = initialState.frame;
      const initialFrames = runtimeSeeds.map(({ scenarioId }) =>
        runtime!.latestFrame(scenarioId),
      );
      for (const frame of initialFrames) retainedPresentationRef.current.set(frame.scenarioId, { frame, analyses: [] });
      latestFrameRef.current = initial;
      lastRootFrameTimeSecRef.current = initial.acceptedTimeSec;
      appendFramesV3(initialFrames, presentationSampleStore);
      // Publish the runtime authority only after every lane is active. Toolbar
      // and visibility handlers must never observe an initializing pool.
      runtimeRef.current = runtime;
      setStatus({
        kind: "live",
        contract: composition.modelSurface.contract,
        frame: initial,
      });
      if (initializeReaderPlayback) {
        setPlaybackRate(runtime.setPlaybackRate(continuation.playbackRate));
        appliedReaderPlaybackTokenRef.current = experimentSessionContext!.sessionToken;
      } else if (sourceSnapshot !== null) {
        setPlaybackRate(runtime.setPlaybackRate(1));
      }
      const playbackIntent = playingIntentRef.current;
      setIsPlaying(playbackIntent);
      if (playbackIntent && !document.hidden) {
        runtime.playAll();
      }
      // Consume restart handoff only after every Scenario Worker and live
      // scheduler lane has been reconstructed successfully.
      pendingSurfaceAfterRuntimeRestartRef.current = null;
      pendingFeedbackAfterRuntimeRestartRef.current = null;
      pendingRecoveryRef.current = null;
    };

    void start().catch(failRuntime);

    return () => {
      cancelled = true;
      runtimeRef.current = null;
      analysisCaptureReleaseRef.current?.resolve();
      analysisCaptureReleaseRef.current = null;
      void runtime?.dispose();
    };
  }, [
    backgroundWorkerPool,
    location.search,
    presentationSampleStore,
    replaceAnalysisByKeyV3,
    remoteContentRepository,
    resolvedLocale,
    runtimeGeneration,
  ]);

  React.useEffect(() => {
    if (
      initialExperimentId === null ||
      experimentIdRef.current === initialExperimentId
    )
      return;
    experimentIdRef.current = initialExperimentId;
    playingIntentRef.current = true;
    setIsPlaying(true);
    setStatus({ kind: "loading" });
    setRuntimeGeneration((generation) => generation + 1);
  }, [initialExperimentId]);

  React.useEffect(() => {
    const handleVisibility = () => {
      const runtime = runtimeRef.current;
      if (runtime === null) return;
      if (document.hidden) {
        void runtime.pauseAll();
      } else if (
        exclusiveOperationRef.current === null &&
        playingIntentRef.current
      ) {
        runtime.playAll();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  const graphPanes = surface?.graphPanes ?? [];
  React.useEffect(() => {
    presentationSampleStore.setSweepWindowSec(Math.max(0, ...graphPanes.map(pane => pane.windowSec ?? 0)));
  }, [surface, presentationSampleStore]);
  const outputPanes = surface?.outputPanes ?? [];
  const controlPanes = surface?.controlPanes ?? [];
  const visibleScenarioIds = React.useMemo(() => {
    const hidden = new Set(hiddenScenarioIds);
    return Object.freeze(
      scenarios
        .map(({ scenarioId }) => scenarioId)
        .filter((scenarioId) => !hidden.has(scenarioId)),
    );
  }, [hiddenScenarioIds, scenarios]);
  React.useEffect(() => {
    const available = new Set(scenarios.map(({ scenarioId }) => scenarioId));
    setHiddenScenarioIds((current) => {
      const next = current.filter((scenarioId) => available.has(scenarioId));
      return next.length === current.length ? current : Object.freeze(next);
    });
  }, [scenarios]);
  const toggleScenarioVisibilityV3 = React.useCallback((scenarioId: string) => {
    setHiddenScenarioIds((current) =>
      current.includes(scenarioId)
        ? Object.freeze(current.filter((candidate) => candidate !== scenarioId))
        : Object.freeze([...current, scenarioId]),
    );
  }, []);
  const markExperimentDirtyV3 = React.useCallback(() => {
    setSaveState("dirty");
    setHasUnsavedContentChanges(true);
    setSaveError(null);
    // A Surface mutation may arrive while the frozen Snapshot candidate is
    // qualifying. Preserve that operation's visible status; the edit remains
    // dirty and belongs only to the continuing Session.
    if (exclusiveOperationRef.current !== "snapshot") {
      setSnapshotState("idle");
      setSnapshotPurpose(null);
      setSnapshotError(null);
    }
  }, []);
  const updateSurface = React.useCallback(
    (update: (current: ExperimentSurfaceV2) => ExperimentSurfaceV2) => {
      const current = surfaceRef.current;
      if (current === null) return;
      const next = update(current);
      if (next === current) return;
      surfaceRef.current = next;
      surfaceMutationRevisionRef.current += 1;
      setSurface(next);
      const durableOperation = exclusiveOperationRef.current;
      if (durableOperation !== "save") {
        markExperimentDirtyV3();
      }
    },
    [markExperimentDirtyV3],
  );

  const openPaneSettings = React.useCallback(
    (
      paneId: string,
      section?: WorkbenchPaneEditorSectionV3,
      itemIntent?: WorkbenchPaneEditorItemIntentV3,
      anchor?: HTMLElement,
    ) => {
      const current = surfaceRef.current;
      const identity = current && workbenchPaneIdentityForIdV3(current, paneId);
      if (identity) setPaneSettings({ kind: identity.kind, paneId, initialSection: section, initialItemIntent: itemIntent, anchor: workbenchPopoverAnchorV3(anchor) });
    },
    [],
  );

  const paneSettingsActions = React.useMemo(() => new Map(
    [...(surface?.graphPanes ?? []), ...(surface?.outputPanes ?? []), ...(surface?.controlPanes ?? [])].map(pane => [
      pane.paneId,
      <WorkbenchPaneSettingsButtonV3 key={pane.paneId} compact title={pane.label}
        onOpen={anchor => openPaneSettings(pane.paneId, "items", "manage", anchor)} />,
    ]),
  ), [surface, openPaneSettings]);

  const addPaneToRoleArea = React.useCallback(
    (
      kind: WorkbenchPaneSettingsV3["kind"],
      anchor: HTMLElement,
      onCreated: (paneId: string) => void,
    ): void => {
      if (surfaceRef.current === null || contract === null) return;
      setPaneSettings({ kind, anchor: workbenchPopoverAnchorV3(anchor), onCreated });
    },
    [contract],
  );

  const renamePaneV3 = React.useCallback(
    (paneId: string, title: string) => {
      const current = surfaceRef.current;
      if (current === null) return;
      const identity = workbenchPaneIdentityForIdV3(current, paneId);
      if (identity === null) return;
      updateSurface((candidate) =>
        updateWorkbenchSurfacePaneV3(candidate, identity, (pane) => ({
          ...pane,
          label: title,
        })),
      );
    },
    [updateSurface],
  );

  const deletePaneV3 = React.useCallback(
    (paneId: string) => {
      const current = surfaceRef.current;
      if (current === null) return;
      const identity = workbenchPaneIdentityForIdV3(current, paneId);
      if (identity === null) return;
      updateSurface(
        (candidate) =>
          deleteWorkbenchSurfacePaneV3(candidate, identity).surface,
      );
      setPaneSettings((selected) =>
        selected?.paneId === paneId ? null : selected,
      );
    },
    [updateSurface],
  );

  const splitPaneV3 = React.useCallback(
    (
      paneId: string,
      _direction: WorkbenchPaneSplitDirectionV3,
    ): string | undefined => {
      const current = surfaceRef.current;
      if (current === null) return undefined;
      const identity = workbenchPaneIdentityForIdV3(current, paneId);
      if (identity === null) return undefined;
      const result = duplicateWorkbenchSurfacePaneV3(current, identity);
      if (result.paneId === null || result.surface === current)
        return undefined;
      updateSurface(() => result.surface);
      return result.paneId;
    },
    [updateSurface],
  );

  const compareOutputPaneByScenarioV3 = React.useCallback(
    (paneId: string): string | undefined => {
      const current = surfaceRef.current;
      if (current === null || scenarios.length < 2) return undefined;
      const result = compareWorkbenchOutputPaneByScenarioV3(current, {
        paneId,
        activeScenarioId: activeScenarioIdRef.current,
        scenarios,
      });
      if (result.paneId === null || result.surface === current)
        return undefined;
      updateSurface(() => result.surface);
      return result.paneId;
    },
    [scenarios, updateSurface],
  );

  const togglePlayback = React.useCallback(() => {
    const runtime = runtimeRef.current;
    const frame = latestFrameRef.current;
    if (
      runtime === null ||
      frame === null ||
      exclusiveOperationRef.current !== null
    )
      return;
    if (playingIntentRef.current) {
      playingIntentRef.current = false;
      setIsPlaying(false);
      void runtime.pauseAll().then(() => {
        const latest = latestFrameRef.current;
        if (latest === null) return;
        lastRootFrameTimeSecRef.current = latest.acceptedTimeSec;
        setStatus((current) =>
          current.kind === "live" ? { ...current, frame: latest } : current,
        );
      });
      return;
    }
    playingIntentRef.current = true;
    setIsPlaying(true);
    runtime.playAll();
  }, []);

  const changePlaybackRate = React.useCallback((rate: number) => {
    const runtime = runtimeRef.current;
    if (runtime === null) return;
    setPlaybackRate(runtime.setPlaybackRate(rate));
  }, []);

  const restartRuntime = React.useCallback((playbackIntent = true) => {
    playingIntentRef.current = playbackIntent;
    setIsPlaying(playbackIntent);
    setStatus({ kind: "loading" });
    setRuntimeGeneration((generation) => generation + 1);
  }, []);

  const restoreControlRecovery = React.useCallback(() => {
    const point = controlRecoveryRef.current;
    const currentSurface = surfaceRef.current;
    if (!point || !currentSurface) return;
    const captured = new Map(point.content.scenarios.map(scenario => [scenario.scenarioId, scenario]));
    const descriptors = scenarioDescriptorsRef.current;
    // Never resurrect deleted scenarios or drop newly added, uncaptured ones.
    if (!descriptors.every(descriptor => captured.has(descriptor.scenarioId))) return;
    pendingRecoveryRef.current = { ...point.content, surface: currentSurface,
      scenarios: descriptors.map(descriptor => ({ ...captured.get(descriptor.scenarioId)!, label: descriptor.label })) };
    pendingSurfaceAfterRuntimeRestartRef.current = currentSurface;
    pendingFeedbackAfterRuntimeRestartRef.current = {
      saveState: "dirty", saveError: null, snapshotState: "idle", snapshotError: null,
    };
    // A deliberate new runtime/clock. Never silently decrement an epoch or
    // splice a restored past into the already-published waveform history.
    restartRuntime(false);
  }, [restartRuntime]);

  const startLatestWorkbenchV3 = React.useCallback(() => {
    setRecoveryError(null);
    navigate(newExperimentHref(isLocale(locale) ? locale : undefined));
  }, [locale, navigate]);

  const applyControl = React.useCallback(
    async (
      scenarioIds: readonly string[],
      controlId: string,
      value: number,
    ): Promise<boolean> => {
      const runtime = runtimeRef.current;
      const operation = exclusiveOperationRef.current;
      if (
        runtime === null ||
        contract === null ||
        latestFrameRef.current === null ||
        scenarioIds.length === 0 ||
        (operation !== null && operation !== "analysis")
      )
        return false;
      setPendingControlId(controlId);
      setControlError(null);
      let ownsControlOperation = false;
      let mutationDispatched = false;
      let rejectedControlCanResumeRuntime = false;
      let releaseForegroundCapacity: (() => void) | undefined;
      const controlStartedAtMs = workbenchPerformanceNowV3();
      let phaseStartedAtMs = controlStartedAtMs;
      const recordControlPhase = (phase: string): void => {
        const now = workbenchPerformanceNowV3();
        recordWorkbenchPerformanceDurationV3(`runtime.control.${phase}`, now - phaseStartedAtMs);
        phaseStartedAtMs = now;
      };
      try {
        if (operation === "analysis") {
          // A user edit outranks an automatically requested structural
          // analysis. Let its exact source capture release the live lane, then
          // cancel any detached work before applying the new input epoch.
          runtime.cancelAnalysisJobs();
          await analysisCaptureReleaseRef.current?.promise;
          runtime.cancelAnalysisJobs();
        }
        if (
          runtimeRef.current !== runtime ||
          latestFrameRef.current === null ||
          exclusiveOperationRef.current !== null
        ) {
          return false;
        }
        exclusiveOperationRef.current = "control";
        ownsControlOperation = true;
        releaseForegroundCapacity = runtime.reserveForegroundCapacity();
        recordControlPhase("acquire-operation");
        await runtime.pauseAll();
        recordControlPhase("pause-group");
        const uniqueScenarioIds = [...new Set(scenarioIds)];
        const changeSemantics =
          contract.controlCatalog.find(
            (definition) => definition.controlId === controlId,
          )?.changeSemantics ?? "accepted-state-warm-start";
        const acceptedFrames = uniqueScenarioIds.map((scenarioId) =>
          runtime.latestFrame(scenarioId),
        );
        const recoveryCaptures = await runtime.captureScenarios();
        recordControlPhase("capture-recovery-group");
        controlRecoveryRef.current = {
          content: { modelId: contract.modelId, surfaceSeriesId: surfaceSeriesIdRef.current!,
            scenarios: recoveryCaptures.scenarios, surface: surfaceRef.current! },
          beforeControl: true,
        };
        const structuralAnalysisIds = new Set(
          workbenchStructuralHistoryAnalysisIdsV3(surfaceRef.current, contract, mainWireFormalPvAnalysisIdV1(periodicPvaDerivationRef.current)),
        );
        // History is visual comparison context, not a qualification result.
        // Preserve the latest curve that was actually renderable for the old
        // input epoch, including an accepted progressive preview. Requiring a
        // fully exhausted adaptive sweep here makes the curve disappear on
        // slower clients even though it was visible immediately before the
        // control change. Recomputing a full sweep would also hold every live
        // Scenario for tens of seconds before the slider visibly moved.
        const analysesToArchive = Object.freeze(
          Object.values(analysisByKeyRef.current).filter((analysis) => {
            const acceptedFrame = acceptedFrames.find(
              ({ scenarioId }) => scenarioId === analysis.scenarioId,
            );
            return (
              acceptedFrame !== undefined &&
              structuralAnalysisIds.has(analysis.analysisId) &&
              analysis.inputEpoch === acceptedFrame.inputEpoch &&
              workbenchStructuralAnalysisRenderableV3(analysis)
            );
          }),
        );
        mutationDispatched = true;
        const controlResults = await Promise.allSettled(
          acceptedFrames.map((acceptedFrame) =>
            runtime.applyControl({
              scenarioId: acceptedFrame.scenarioId,
              controlId,
              value,
              expectedInputEpoch: acceptedFrame.inputEpoch,
            }),
          ),
        );
        recordControlPhase("apply-group");
        const acceptedControls = controlResults.flatMap((result) =>
          result.status === "fulfilled" ? [result.value] : []
        );
        const nextFrames = acceptedControls.map(({ frame }) => frame);
        const rejectedControls = controlResults.flatMap((result) =>
          result.status === "rejected" ? [result.reason] : []
        );
        if (rejectedControls.length > 0) {
          rejectedControlCanResumeRuntime =
            workbenchRejectedControlCanResumeRuntimeV3({
              dispatchedCount: controlResults.length,
              acceptedCount: nextFrames.length,
              everyRejectionRecoverable: rejectedControls.every(
                isRecoverableStudioSimulationWorkerRequestErrorV2,
              ),
            });
          throw rejectedControls[0];
        }
        const activeId = activeScenarioIdRef.current;
        const nextRootFrame =
          activeId === null ? nextFrames[0]! : runtime.latestFrame(activeId);
        const projection = requiredWorkbenchFixtureProjectionV1(
          fixtureProjectionRef.current,
        );
        // Read settings from the exact reducer's committed result. A numerical
        // checkpoint is needed for recovery/analysis/authoring, not to display
        // the already accepted settings. Keep the pre-edit group capture above.
        const projectedControlValues = Object.fromEntries(
          acceptedControls.map(({ frame, fixture }) => [
            frame.scenarioId,
            materializeExactModelControlValuesV1(
              contract,
              fixture,
              projection,
            ),
          ]),
        );
        recordControlPhase("project-controls");
        latestFrameRef.current = nextRootFrame;
        lastRootFrameTimeSecRef.current = nextRootFrame.acceptedTimeSec;
        if (analysesToArchive.length > 0) {
          setAnalysisHistoryByKey((current) =>
            archiveWorkbenchAnalysesV3(current, analysesToArchive),
          );
        }
        const targetScenarioIds = new Set(uniqueScenarioIds);
        invalidateWorkbenchScenarioAnalysisEquivalenceV3(
          equivalentAnalysisSourceByScenarioRef.current,
          targetScenarioIds,
        );
        replaceAnalysisByKeyV3(
          filterWorkbenchAnalysesByScenarioIdsV3(
            analysisByKeyRef.current,
            new Set(
              scenarios
                .map(({ scenarioId }) => scenarioId)
                .filter((scenarioId) => !targetScenarioIds.has(scenarioId)),
            ),
          ),
        );
        setAnalysisErrorByKey((current) =>
          filterWorkbenchAnalysisErrorsByScenarioIdsV3(
            current,
            new Set(
              scenarios
                .map(({ scenarioId }) => scenarioId)
                .filter((scenarioId) => !targetScenarioIds.has(scenarioId)),
            ),
          ),
        );
        for (const nextFrame of nextFrames) {
          const previousFrame = acceptedFrames.find(
            ({ scenarioId }) => scenarioId === nextFrame.scenarioId,
          );
          if (
            previousFrame !== undefined &&
            workbenchInputMutationReplacedAcceptedClockV3(
              previousFrame,
              nextFrame,
              changeSemantics,
            )
          ) {
            presentationSampleStore.resetScenario(nextFrame.scenarioId);
          }
        }
        appendFramesV3(nextFrames, presentationSampleStore);
        for (const frame of nextFrames) retainedPresentationRef.current.set(frame.scenarioId, { frame, analyses: [] });
        setStatus((current) =>
          current.kind === "live"
            ? { ...current, frame: nextRootFrame }
            : current,
        );
        controlValuesByScenarioRef.current = Object.freeze({
          ...controlValuesByScenarioRef.current,
          ...Object.fromEntries(
            uniqueScenarioIds.map((scenarioId) => [
              scenarioId,
              projectedControlValues[scenarioId]!,
            ]),
          ),
        });
        if (activeId !== null) {
          setControlValues(controlValuesByScenarioRef.current[activeId] ?? {});
        }
        markExperimentDirtyV3();
        if (playingIntentRef.current && !document.hidden) {
          runtime.playAll();
        }
        recordControlPhase("publish-and-resume");
        return true;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setControlError(message);
        if (
          mutationDispatched
          && !rejectedControlCanResumeRuntime
          && runtimeRef.current === runtime
        ) {
          // Do not publish a partially accepted group edit. Retain the visible
          // state and the pre-edit group capture for an explicit recovery.
          stopRuntimeRef.current(error);
          return false;
        }
        const latest = latestFrameRef.current;
        if (
          ownsControlOperation &&
          playingIntentRef.current &&
          !document.hidden &&
          latest !== null
        ) {
          runtime.playAll();
        }
        return false;
      } finally {
        releaseForegroundCapacity?.();
        recordWorkbenchPerformanceDurationV3(
          "runtime.control.total-operation",
          workbenchPerformanceNowV3() - controlStartedAtMs,
        );
        if (
          ownsControlOperation &&
          exclusiveOperationRef.current === "control"
        ) {
          exclusiveOperationRef.current = null;
        }
        setPendingControlId(null);
      }
    },
    [
      contract,
      markExperimentDirtyV3,
      presentationSampleStore,
      replaceAnalysisByKeyV3,
      scenarios,
    ],
  );

  const requestAnalysis = React.useCallback(
    (analysisId: string, requestedScenarioIds: readonly string[]): boolean => {
      const runtime = runtimeRef.current;
      const availableScenarioIds = new Set(
        scenarioDescriptorsRef.current.map(({ scenarioId }) => scenarioId),
      );
      const requestedAvailableScenarioIds = Object.freeze(
        [...new Set(requestedScenarioIds)].filter((scenarioId) =>
          availableScenarioIds.has(scenarioId),
        ),
      );
      const scenarioIds = Object.freeze(
        [
          ...new Set(
            requestedAvailableScenarioIds.map(
              (scenarioId) =>
                equivalentAnalysisSourceByScenarioRef.current.get(scenarioId) ??
                scenarioId,
            ),
          ),
        ].filter((scenarioId) => {
          const key = workbenchAnalysisHistoryKeyV3(scenarioId, analysisId);
          return !pendingAnalysisKeys.includes(key);
        }),
      );
      if (
        runtime === null ||
        scenarioIds.length === 0 ||
        exclusiveOperationRef.current !== null
      )
        return false;
      const captureToken = Symbol("structural-analysis-capture");
      let resolveCaptureRelease!: () => void;
      const captureReleasePromise = new Promise<void>((resolve) => {
        resolveCaptureRelease = resolve;
      });
      analysisCaptureTokenRef.current = captureToken;
      analysisCaptureReleaseRef.current = Object.freeze({
        token: captureToken,
        promise: captureReleasePromise,
        resolve: resolveCaptureRelease,
      });
      exclusiveOperationRef.current = "analysis";
      setAnalysisCapturePending(true);
      const pendingKeys = Object.freeze(
        scenarioIds.map((scenarioId) =>
          workbenchAnalysisHistoryKeyV3(scenarioId, analysisId),
        ),
      );
      const pendingKeySet = new Set(pendingKeys);
      setPendingAnalysisKeys((current) =>
        Object.freeze([...new Set([...current, ...pendingKeys])]),
      );
      setAnalysisErrorByKey((current) =>
        withoutRecordKeysV3(current, pendingKeys),
      );
      void (async () => {
        let releasedLaneCount = 0;
        const finishCaptureLock = () => {
          if (analysisCaptureTokenRef.current !== captureToken) return;
          analysisCaptureTokenRef.current = null;
          if (exclusiveOperationRef.current === "analysis") {
            exclusiveOperationRef.current = null;
          }
          const release = analysisCaptureReleaseRef.current;
          if (release?.token === captureToken) {
            analysisCaptureReleaseRef.current = null;
            release.resolve();
          }
          setAnalysisCapturePending(false);
        };
        const releaseCaptureLock = () => {
          releasedLaneCount += 1;
          if (
            releasedLaneCount >= scenarioIds.length &&
            analysisCaptureTokenRef.current === captureToken
          ) {
            finishCaptureLock();
          }
        };
        try {
          await runtime.waitForControlPresentation();
          const acceptedFrames = await Promise.all(
            scenarioIds.map((scenarioId) => runtime.pauseScenario(scenarioId)),
          );
          const activeId = activeScenarioIdRef.current;
          const activeFrame = acceptedFrames.find(
            ({ scenarioId }) => scenarioId === activeId,
          );
          if (activeFrame !== undefined) {
            latestFrameRef.current = activeFrame;
            lastRootFrameTimeSecRef.current = activeFrame.acceptedTimeSec;
            setStatus((current) =>
              current.kind === "live"
                ? { ...current, frame: activeFrame }
                : current,
            );
          }
          await Promise.all(
            acceptedFrames.map(async (acceptedFrame) => {
              const key = workbenchAnalysisHistoryKeyV3(
                acceptedFrame.scenarioId,
                analysisId,
              );
              let liveLaneReleased = false;
              const markLiveLaneReleased = () => {
                if (liveLaneReleased) return;
                liveLaneReleased = true;
                releaseCaptureLock();
              };
              try {
                const analysis = await runtime.requestAnalysis({
                  scenarioId: acceptedFrame.scenarioId,
                  analysisId,
                  expectedInputEpoch: acceptedFrame.inputEpoch,
                  expectedAcceptedRevision: acceptedFrame.acceptedRevision,
                  expectedAcceptedTimeSec: acceptedFrame.acceptedTimeSec,
                  sourceAlreadyPaused: true,
                  onProgress: queueAnalysisProgressV3,
                  onLiveLaneReleased: markLiveLaneReleased,
                });
                commitAnalysisV3(analysis);
              } catch (error) {
                if (error instanceof WorkbenchBackgroundJobCancelledErrorV3) {
                  const cancelledScenarioIds = Object.freeze([
                    acceptedFrame.scenarioId,
                    ...[...equivalentAnalysisSourceByScenarioRef.current]
                      .filter(
                        ([, sourceScenarioId]) =>
                          sourceScenarioId === acceptedFrame.scenarioId,
                      )
                      .map(([targetScenarioId]) => targetScenarioId),
                  ]);
                  const cancelledKeys = cancelledScenarioIds.map((scenarioId) =>
                    workbenchAnalysisHistoryKeyV3(scenarioId, analysisId),
                  );
                  cancelledKeys.forEach((cancelledKey) =>
                    queuedAnalysisProgressByKeyRef.current.delete(cancelledKey),
                  );
                  replaceAnalysisByKeyV3(
                    withoutRecordKeysV3(
                      analysisByKeyRef.current,
                      cancelledKeys,
                    ),
                  );
                  setAnalysisErrorByKey((current) =>
                    withoutRecordKeysV3(current, cancelledKeys),
                  );
                  return;
                }
                let currentFrame: StudioSimulationFrameV2 | null = null;
                try {
                  currentFrame = runtime.latestFrame(acceptedFrame.scenarioId);
                } catch {
                  // A deleted Scenario has no recoverable analysis error surface.
                }
                if (
                  currentFrame !== null &&
                  currentFrame.inputEpoch === acceptedFrame.inputEpoch
                ) {
                  setAnalysisErrorByKey((current) =>
                    Object.freeze({
                      ...current,
                      [key]:
                        error instanceof Error ? error.message : String(error),
                    }),
                  );
                }
              } finally {
                markLiveLaneReleased();
              }
            }),
          );
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          setAnalysisErrorByKey((current) =>
            Object.freeze({
              ...current,
              ...Object.fromEntries(pendingKeys.map((key) => [key, message])),
            }),
          );
        } finally {
          if (
            analysisCaptureTokenRef.current === captureToken &&
            playingIntentRef.current &&
            !document.hidden
          ) {
            scenarioIds.forEach((scenarioId) => {
              try {
                runtime.resumeScenario(scenarioId);
              } catch {
                // The Scenario may have been deleted after its analysis forked.
              }
            });
          }
          finishCaptureLock();
          setPendingAnalysisKeys((current) =>
            Object.freeze(current.filter((key) => !pendingKeySet.has(key))),
          );
        }
      })();
      return true;
    },
    [
      commitAnalysisV3,
      pendingAnalysisKeys,
      queueAnalysisProgressV3,
      replaceAnalysisByKeyV3,
    ],
  );

  const adoptScenarioStateV3 = React.useCallback(
    (next: StudioSimulationWorkerScenarioStateV2) => {
      scenarioDescriptorsRef.current = next.scenarios;
      activeScenarioIdRef.current = next.activeScenarioId;
      setActiveScenarioId(next.activeScenarioId);
      setScenarios(next.scenarios);
      latestFrameRef.current = next.frame;
      lastRootFrameTimeSecRef.current = next.frame.acceptedTimeSec;
      appendFramesV3([next.frame], presentationSampleStore);
      const retainedScenarioIds = new Set(
        next.scenarios.map(({ scenarioId }) => scenarioId),
      );
      for (const scenarioId of retainedPresentationRef.current.keys()) {
        if (!retainedScenarioIds.has(scenarioId)) retainedPresentationRef.current.delete(scenarioId);
      }
      for (const [
        targetScenarioId,
        sourceScenarioId,
      ] of equivalentAnalysisSourceByScenarioRef.current) {
        if (
          !retainedScenarioIds.has(targetScenarioId) ||
          !retainedScenarioIds.has(sourceScenarioId)
        )
          equivalentAnalysisSourceByScenarioRef.current.delete(
            targetScenarioId,
          );
      }
      replaceAnalysisByKeyV3(
        filterWorkbenchAnalysesByScenarioIdsV3(
          analysisByKeyRef.current,
          retainedScenarioIds,
        ),
      );
      setAnalysisErrorByKey((current) =>
        filterWorkbenchAnalysisErrorsByScenarioIdsV3(
          current,
          retainedScenarioIds,
        ),
      );
      setAnalysisHistoryByKey((current) =>
        filterWorkbenchAnalysisHistoryByScenarioIdsV3(
          current,
          retainedScenarioIds,
        ),
      );
      setControlError(null);
      setControlValues(
        controlValuesByScenarioRef.current[next.activeScenarioId] ??
          {},
      );
      setStatus((current) =>
        current.kind === "live" ? { ...current, frame: next.frame } : current,
      );
    },
    [contract, presentationSampleStore, replaceAnalysisByKeyV3],
  );

  const runScenarioOperationV3 = React.useCallback(
    async (
      kind: WorkbenchScenarioOperationV3,
      operation: (
        runtime: WorkbenchParallelScenarioRuntimeV3,
      ) =>
        | Promise<StudioSimulationWorkerScenarioStateV2>
        | StudioSimulationWorkerScenarioStateV2,
      beforeAdopt?: (state: StudioSimulationWorkerScenarioStateV2) => void,
    ): Promise<boolean> => {
      const runtime = runtimeRef.current;
      const frame = latestFrameRef.current;
      const exclusiveOperation = exclusiveOperationRef.current;
      if (
        runtime === null ||
        frame === null ||
        (exclusiveOperation !== null && exclusiveOperation !== "analysis")
      )
        return false;
      if (exclusiveOperation === "analysis") {
        // Scenario edits are explicit foreground actions. Revoke detached
        // structural work and wait only for its exact-source capture to
        // release the live lane before changing the Scenario set.
        runtime.cancelAnalysisJobs();
        await analysisCaptureReleaseRef.current?.promise;
        runtime.cancelAnalysisJobs();
      }
      if (
        runtimeRef.current !== runtime ||
        latestFrameRef.current === null ||
        exclusiveOperationRef.current !== null
      )
        return false;
      exclusiveOperationRef.current = "scenario";
      setScenarioOperation(kind);
      setScenarioError(null);
      try {
        await runtime.pauseAll();
        const next = await operation(runtime);
        beforeAdopt?.(next);
        adoptScenarioStateV3(next);
        if ((kind === "add" || kind === "duplicate" || kind === "delete") && contract !== null && surfaceRef.current !== null) {
          const captured = await runtime.captureScenarios();
          controlRecoveryRef.current = {
            content: { modelId: contract.modelId, surfaceSeriesId: surfaceSeriesIdRef.current!,
              scenarios: captured.scenarios, surface: surfaceRef.current },
            beforeControl: false,
          };
          for (const scenario of captured.scenarios) retainedPresentationRef.current.set(scenario.scenarioId, {
            frame: runtime.latestFrame(scenario.scenarioId), analyses: runtime.presentationAnalyses(scenario.scenarioId),
          });
        }
        return true;
      } catch (error) {
        setScenarioError(
          error instanceof Error ? error.message : String(error),
        );
        return false;
      } finally {
        exclusiveOperationRef.current = null;
        setScenarioOperation(null);
        const latest = latestFrameRef.current;
        if (playingIntentRef.current && !document.hidden && latest !== null) {
          runtime.playAll();
        }
      }
    },
    [adoptScenarioStateV3, contract],
  );

  const selectScenarioV3 = React.useCallback(
    (scenarioId: string) => {
      if (scenarioId === activeScenarioIdRef.current) return;
      void runScenarioOperationV3("select", (runtime) =>
        runtime.selectScenario(scenarioId),
      );
    },
    [runScenarioOperationV3],
  );

  const addScenarioFromPresetV3 = React.useCallback(
    (intent: WorkbenchScenarioAddIntentV3) => {
      void runScenarioOperationV3(
        "add",
        (runtime) =>
          runtime.addScenario({
            scenarioId: intent.scenarioId,
            label: intent.label,
            fixture: intent.preset.capture.fixture,
            checkpoint: intent.preset.capture.checkpoint,
          }),
        (next) => {
          updateSurface((current) =>
            reconcileWorkbenchSurfaceScenariosV3(current, next.scenarios),
          );
          if (contract !== null) {
            controlValuesByScenarioRef.current = {
              ...controlValuesByScenarioRef.current,
              [intent.scenarioId]: materializeExactModelControlValuesV1(
                contract,
                intent.preset.capture.fixture,
                requiredWorkbenchFixtureProjectionV1(
                  fixtureProjectionRef.current,
                ),
              ),
            };
          }
          markExperimentDirtyV3();
        },
      );
    },
    [contract, markExperimentDirtyV3, runScenarioOperationV3, updateSurface],
  );

  const duplicateScenarioV3 = React.useCallback(
    (intent: WorkbenchScenarioDuplicateIntentV3) => {
      const sourceValues =
        controlValuesByScenarioRef.current[intent.sourceScenarioId];
      void runScenarioOperationV3(
        "duplicate",
        (runtime) =>
          runtime.duplicateScenario({
            sourceScenarioId: intent.sourceScenarioId,
            scenarioId: intent.scenarioId,
            label: intent.label,
          }),
        (next) => {
          updateSurface((current) =>
            reconcileWorkbenchSurfaceScenariosV3(current, next.scenarios),
          );
          // A duplicate has the same exact fixture + checkpoint and therefore
          // the same model-owned structural result at creation time. Reuse the
          // immutable analysis payload under the duplicate lane identity. A
          // later parameter edit archives this result as visible history while
          // the changed target is recomputed, instead of forcing low-core
          // devices to serialize an identical analysis before first paint.
          replaceAnalysisByKeyV3(
            cloneWorkbenchScenarioAnalysesV3(
              analysisByKeyRef.current,
              intent.sourceScenarioId,
              next.frame,
            ),
          );
          const sourceScenarioId =
            equivalentAnalysisSourceByScenarioRef.current.get(
              intent.sourceScenarioId,
            ) ?? intent.sourceScenarioId;
          equivalentAnalysisSourceByScenarioRef.current.set(
            intent.scenarioId,
            sourceScenarioId,
          );
          if (sourceValues !== undefined) {
            controlValuesByScenarioRef.current = {
              ...controlValuesByScenarioRef.current,
              [intent.scenarioId]: cloneWorkbenchControlValuesV3(sourceValues),
            };
          }
          presentationSampleStore.cloneScenario(
            intent.sourceScenarioId,
            intent.scenarioId,
          );
          markExperimentDirtyV3();
        },
      );
    },
    [
      markExperimentDirtyV3,
      presentationSampleStore,
      replaceAnalysisByKeyV3,
      runScenarioOperationV3,
      updateSurface,
    ],
  );

  const renameScenarioV3 = React.useCallback(
    (intent: WorkbenchScenarioRenameIntentV3) => {
      void runScenarioOperationV3(
        "rename",
        (runtime) =>
          runtime.renameScenario({
            scenarioId: intent.scenarioId,
            label: intent.label,
          }),
        () => {
          markExperimentDirtyV3();
        },
      );
    },
    [markExperimentDirtyV3, runScenarioOperationV3],
  );

  const deleteScenarioV3 = React.useCallback(
    (intent: WorkbenchScenarioDeleteIntentV3) => {
      void runScenarioOperationV3(
        "delete",
        (runtime) => runtime.deleteScenario(intent.scenarioId),
        (next) => {
          updateSurface((current) =>
            reconcileWorkbenchSurfaceScenariosV3(current, next.scenarios),
          );
          const { [intent.scenarioId]: _deleted, ...retained } =
            controlValuesByScenarioRef.current;
          controlValuesByScenarioRef.current = retained;
          presentationSampleStore.removeScenario(intent.scenarioId);
          setAnalysisHistoryByKey((current) =>
            withoutWorkbenchScenarioAnalysisHistoryV3(
              current,
              intent.scenarioId,
            ),
          );
          markExperimentDirtyV3();
        },
      );
    },
    [
      markExperimentDirtyV3,
      presentationSampleStore,
      runScenarioOperationV3,
      updateSurface,
    ],
  );

  const saveExperimentV3 = React.useCallback(async (options?: { deferNavigation?: boolean }): Promise<boolean> => {
    if (!workbenchDurableContentAvailableV3({ modelLab })) return false;
    const titleChanged = (experimentTitleRef.current.trim() || savedTitleRef.current) !== savedTitleRef.current;
    if (!workbenchSaveAvailableV3(saveStateRef.current, titleChanged)) return false;
    const runtime = runtimeRef.current;
    const frame = latestFrameRef.current;
    const contentStore = contentStoreRef.current;
    if (
      runtime === null ||
      frame === null ||
      surface === null ||
      (remoteContentRepository === null && contentStore === null) ||
      backgroundWorkerPool === null
    )
      return false;
    if (exclusiveOperationRef.current === "analysis") {
      // Save is a foreground action. Revoke the detached analysis and wait only
      // for its exact-source capture to release the live lane.
      runtime.cancelAnalysisJobs();
      await analysisCaptureReleaseRef.current?.promise;
      runtime.cancelAnalysisJobs();
    }
    if (
      runtimeRef.current !== runtime
      || latestFrameRef.current === null
      || exclusiveOperationRef.current !== null
    ) return false;
    const currentSurface = surfaceRef.current;
    if (currentSurface === null) return false;
    const submittedSurface = reconcileWorkbenchSurfaceScenariosV3(
      currentSurface,
      scenarioDescriptorsRef.current,
    );
    const submittedSurfaceMutationRevision = surfaceMutationRevisionRef.current;
    const submittedTitle =
      experimentTitleRef.current.trim() || t("workbench.selector.untitled");
    exclusiveOperationRef.current = "save";
    setSaveState("saving");
    setSaveJustFinished(false);
    setSaveError(null);
    try {
      // Persistence is an explicit foreground action. Detached relation
      // refinement is restartable and must never make Save wait for the long
      // adaptive sweep to exhaust its Worker partitions.
      runtime.cancelAnalysisJobs();
      await runtime.pauseAll();
      let captures: StudioSimulationWorkerScenarioCapturesV2;
      try {
        captures = await runtime.captureScenarios();
      } finally {
        if (playingIntentRef.current && !document.hidden) runtime.playAll();
      }
      const currentExperiment = experimentRef.current;
      const submittedCandidateContent = {
        modelId: frame.modelId,
        surfaceSeriesId: requiredWorkbenchSurfaceSeriesIdV3(
          surfaceSeriesIdRef.current,
        ),
        scenarios: captures.scenarios,
        surface: submittedSurface,
      };
      const currentExperimentId = experimentIdRef.current;
      let saved: ExperimentV2;
      let remoteSavedResource: StudioRemoteExperimentResourceV1 | null = null;
      if (remoteContentRepository !== null) {
        saved = await remoteContentRepository.saveExperiment({
          experimentId: currentExperiment?.experimentId ?? currentExperimentId,
          expectedVersion: currentExperiment?.version ?? null,
          title: submittedTitle,
          content: submittedCandidateContent,
        });
        remoteSavedResource = await remoteContentRepository.readMyExperiment(
          saved.experimentId,
        );
        if (remoteSavedResource === null) {
          throw new Error("Saved Experiment could not be read back");
        }
      } else {
        const targetExperimentId =
          currentExperiment?.experimentId ??
          currentExperimentId ??
          allocateOpaqueExperimentIdV3([
            ...contentStore!
              .listExperiments()
              .map(({ experimentId }) => experimentId),
            ...experimentIndex.list().map(({ experimentId }) => experimentId),
          ]);
        const coordinator = new WorkbenchParallelAuthoringCoordinatorV3(
          undefined,
          backgroundWorkerPool,
        );
        const assembled = await coordinator.saveExperiment({
          modelId: frame.modelId,
          surfaceSeriesId: requiredWorkbenchSurfaceSeriesIdV3(
            surfaceSeriesIdRef.current,
          ),
          releaseTicket: requiredWorkbenchReleaseTicketV3(
            workerReleaseTicketRef.current,
          ),
          scenarios: captures.scenarios,
          activeScenarioId: captures.activeScenarioId,
          experiment: currentExperiment,
          experimentId: targetExperimentId,
          surface: submittedSurface,
          runtimeSessionId: `workbench-authoring-${randomPortableTokenV3()}`,
        });
        saved = contentStore!.saveExperiment(
          assembled,
          submittedCandidateContent,
        );
      }
      const targetExperimentId = saved.experimentId;
      const durableExperiment = saved;
      const surfaceResolution = resolveWorkbenchSurfaceAfterCommitV3({
        currentMutationRevision: surfaceMutationRevisionRef.current,
        currentSurface: surfaceRef.current,
        durableSurface: durableExperiment.content.surface,
        submittedMutationRevision: submittedSurfaceMutationRevision,
      });
      experimentRef.current = durableExperiment;
      setExperiment(durableExperiment);
      const nowIso = new Date().toISOString();
      const existingRecord =
        experimentRecord?.experimentId === targetExperimentId
          ? experimentRecord
          : null;
      const touchedRecord =
        remoteContentRepository === null
          ? existingRecord === null
            ? experimentIndex.ensure({
                experimentId: targetExperimentId,
                title: submittedTitle,
                nowIso,
              })
            : experimentIndex.rename({
                experimentId: targetExperimentId,
                title: submittedTitle,
                nowIso,
              })
          : remoteExperimentRecordV3(remoteSavedResource!);
      const isFirstSave = experimentIdRef.current === null;
      if (isFirstSave) savedRoutePendingRef.current = true;
      experimentIdRef.current = targetExperimentId;
      setExperimentRecord(touchedRecord);
      savedTitleRef.current = touchedRecord.title;
      surfaceRef.current = surfaceResolution.surface;
      setSurface(surfaceResolution.surface);
      setScenarios(
        Object.freeze(
          durableExperiment.content.scenarios.map(({ scenarioId, label }) =>
            Object.freeze({ scenarioId, label }),
          ),
        ),
      );
      if (contract !== null) {
        controlValuesByScenarioRef.current = Object.fromEntries(
          durableExperiment.content.scenarios.map((scenario) => [
            scenario.scenarioId,
            materializeExactModelControlValuesV1(
              contract,
              scenario.capture.fixture,
              requiredWorkbenchFixtureProjectionV1(
                fixtureProjectionRef.current,
              ),
            ),
          ]),
        );
        const activeId = activeScenarioIdRef.current;
        if (activeId !== null) {
          setControlValues(
            controlValuesByScenarioRef.current[activeId] ??
              {},
          );
        }
      }
      setSaveState(surfaceResolution.hasNewerMutations ? "dirty" : "clean");
      setHasUnsavedContentChanges(surfaceResolution.hasNewerMutations);
      const hasNewerTitle = (experimentTitleRef.current.trim() || t("workbench.selector.untitled")) !== touchedRecord.title;
      setHasUncommittedTitleChanges(hasNewerTitle);
      setSaveJustFinished(!surfaceResolution.hasNewerMutations && !hasNewerTitle);
      setSnapshotState("idle");
      setSnapshotPurpose(null);
      if (savedRoutePendingRef.current && !options?.deferNavigation && !surfaceResolution.hasNewerMutations && !hasNewerTitle) {
        savedRoutePendingRef.current = false;
        navigate(
          `${experimentDetailHref({
            experimentId: targetExperimentId,
            locale: resolvedLocale,
          })}${location.search}`,
          { replace: true },
        );
      }
      return !surfaceResolution.hasNewerMutations && !hasNewerTitle;
    } catch (error) {
      const message = workbenchAuthoringErrorMessageV3(error);
      // Never adopt another tab's newer version as an implicit retry base:
      // doing so would let a second Save overwrite that tab without an
      // explicit conflict decision. Keep this Session dirty and fail closed;
      // reload or a future backend conflict UI is the recovery boundary.
      setSaveError(message);
      setSaveState("error");
      setHasUnsavedContentChanges(true);
      return false;
    } finally {
      exclusiveOperationRef.current = null;
      const latest = latestFrameRef.current;
      if (playingIntentRef.current && !document.hidden && latest !== null) {
        runtime.playAll();
      }
    }
  }, [
    backgroundWorkerPool,
    contract,
    experimentIndex,
    experimentRecord,
    experimentTitle,
    location.search,
    modelLab,
    navigate,
    remoteContentRepository,
    resolvedLocale,
    surface,
    t,
  ]);

  const createSnapshotV3 = React.useCallback(
    async (
      options:
        | Readonly<{ kind: "publication" }>
        | Readonly<{
            kind: "article";
            sourceSnapshot: ExperimentSnapshotV2;
            sourceSurfaceMutationRevision: number;
            sourceBriefingMutationRevision: number;
          }>,
    ): Promise<ExperimentSnapshotV2 | null> => {
      if (!workbenchDurableContentAvailableV3({ modelLab })) return null;
      setSnapshotErrorFromArticle(options.kind === "article");
      setSnapshotPurpose(options.kind);
      setSnapshotState("idle");
      if (
        options.kind === "publication" &&
        remoteContentRepository !== null &&
        authIdentity.kind !== "account"
      ) {
        setSnapshotError(t("workbench.editor.publishRequiresLinkedAccount"));
        setSnapshotState("error");
        return null;
      }
      if (
        options.kind === "publication" &&
        (experimentRef.current === null || saveStateRef.current !== "clean" ||
          (experimentTitleRef.current.trim() || savedTitleRef.current) !== savedTitleRef.current)
      ) {
        setSnapshotError(
          t(
            experimentRef.current === null
              ? "workbench.editor.publishRequiresSave"
              : "workbench.editor.publishRequiresClean",
          ),
        );
        setSnapshotState("error");
        return null;
      }
      const runtime = runtimeRef.current;
      const frame = latestFrameRef.current;
      const contentStore = contentStoreRef.current;
      const submittedSurface =
        options.kind === "article"
          ? options.sourceSnapshot.content.surface
          : surfaceRef.current;
      const publicationExperiment =
        options.kind === "publication" ? experimentRef.current : null;
      if (
        options.kind === "article" &&
        surfaceMutationRevisionRef.current !==
          options.sourceSurfaceMutationRevision
      ) {
        setSnapshotError(t("workbench.editor.briefingSourceChanged"));
        setSnapshotState("error");
        return null;
      }
      if (
        runtime === null ||
        frame === null ||
        submittedSurface === null ||
        (remoteContentRepository === null && contentStore === null) ||
        backgroundWorkerPool === null
      ) {
        setSnapshotError(t("workbench.editor.snapshotNotReady"));
        setSnapshotState("error");
        return null;
      }
      if (exclusiveOperationRef.current !== null) {
        setSnapshotError(t("workbench.editor.snapshotBusy"));
        setSnapshotState("error");
        return null;
      }
      exclusiveOperationRef.current = "snapshot";
      setSnapshotState("creating");
      if (options.kind === "publication") setPublicationStage("checking");
      setSnapshotError(null);
      try {
        await runtime.pauseAll();
        let captures: StudioSimulationWorkerScenarioCapturesV2;
        try {
          captures = await runtime.captureScenarios();
        } finally {
          // The exact fixture + checkpoint tuple is now owned by the background
          // job. Resume every live lane before bounded admission so Snapshot
          // creation never freezes the visible simulation for that work.
          if (playingIntentRef.current && !document.hidden) runtime.playAll();
        }
        // Freeze authored intent at the click boundary, then opportunistically
        // reuse an exact cycle-boundary candidate already produced for the same
        // input epoch. Candidate convergence is never awaited here: the exact
        // click capture is the fallback and common Snapshot admission remains
        // the safety authority before persistence.
        captures = runtime.selectBestAvailableScenarioCaptures(captures);
        if (
          options.kind === "article" &&
          !workbenchBriefingSourceScenariosMatchV3(
            options.sourceSnapshot,
            captures.scenarios,
          )
        ) {
          throw new Error(t("workbench.editor.briefingSourceChanged"));
        }
        const coordinator = new WorkbenchParallelAuthoringCoordinatorV3(
          undefined,
          backgroundWorkerPool,
        );
        const authoringInput = {
          modelId: frame.modelId,
          surfaceSeriesId: requiredWorkbenchSurfaceSeriesIdV3(
            surfaceSeriesIdRef.current,
          ),
          surfaceReleaseId: requiredWorkbenchSurfaceReleaseIdV3(
            surfaceReleaseIdRef.current,
          ),
          releaseTicket: requiredWorkbenchReleaseTicketV3(
            workerReleaseTicketRef.current,
          ),
          scenarios: captures.scenarios,
          activeScenarioId: captures.activeScenarioId,
          surface: submittedSurface,
          experiment: publicationExperiment,
          experimentId: publicationExperiment?.experimentId ?? null,
          runtimeSessionId: `workbench-admission-${randomPortableTokenV3()}`,
        };
        const created =
          options.kind === "article"
            ? await coordinator.createSnapshot({
                ...authoringInput,
                snapshotSource: "session",
              })
            : await coordinator.createSnapshot({
                ...authoringInput,
                snapshotSource: "saved-experiment",
              });
        if (
          options.kind === "article" &&
          surfaceMutationRevisionRef.current !==
            options.sourceSurfaceMutationRevision
        ) {
          throw new Error(t("workbench.editor.briefingSourceChanged"));
        }
        if (
          options.kind === "article" &&
          briefingMutationRevisionRef.current !==
            options.sourceBriefingMutationRevision
        ) {
          throw new Error(t("workbench.editor.briefingChangedDuringSnapshot"));
        }
        const persistedSnapshot =
          remoteContentRepository === null
            ? contentStore!.saveSnapshotCommit(
                created,
                {
                  modelId: authoringInput.modelId,
                  surfaceSeriesId: authoringInput.surfaceSeriesId,
                  scenarios: authoringInput.scenarios,
                  surface: authoringInput.surface,
                },
                options.kind === "publication" && publicationExperiment !== null
                  ? {
                      experimentId: publicationExperiment.experimentId,
                      expectedVersion: publicationExperiment.version,
                    }
                  : undefined,
              ).snapshot
            : await remoteContentRepository.commitSnapshot({
                admitted: created,
                ...(options.kind === "publication" &&
                publicationExperiment !== null
                  ? {
                      sourceExperiment: {
                        experimentId: publicationExperiment.experimentId,
                        expectedVersion: publicationExperiment.version,
                      },
                    }
                  : {}),
              });
        if (options.kind === "publication" && experimentRef.current !== null) {
          setPublicationStage("publishing");
          if (remoteContentRepository !== null) {
            await remoteContentRepository.publishExperiment({
              experimentId: experimentRef.current.experimentId,
              expectedVersion: experimentRef.current.version,
              snapshotId: persistedSnapshot.snapshotId,
              publicSlug: publicExperimentSlugV3(
                experimentRef.current.experimentId,
              ),
            });
          }
          const nowIso = new Date().toISOString();
          const remotePublishedResource =
            remoteContentRepository === null
              ? null
              : await remoteContentRepository.readMyExperiment(
                  experimentRef.current.experimentId,
                );
          if (
            remoteContentRepository !== null &&
            remotePublishedResource === null
          ) {
            throw new Error("Published Experiment could not be read back");
          }
          const nextRecord =
            remoteContentRepository === null
              ? experimentIndex.publish({
                  experimentId: experimentRef.current.experimentId,
                  snapshotId: persistedSnapshot.snapshotId,
                  version: publicationExperiment!.version,
                  nowIso,
                })
              : remoteExperimentRecordV3(remotePublishedResource!);
          setExperimentRecord(nextRecord);
        }
        setSnapshotCount((count) => count + 1);
        setSnapshotState("created");
        return persistedSnapshot;
      } catch (error) {
        const message = workbenchAuthoringErrorMessageV3(error);
        setSnapshotError(message);
        setSnapshotState("error");
        return null;
      } finally {
        exclusiveOperationRef.current = null;
        if (options.kind === "publication") setPublicationStage(null);
        const latest = latestFrameRef.current;
        if (playingIntentRef.current && !document.hidden && latest !== null) {
          runtime.playAll();
        }
      }
    },
    [
      authIdentity.kind,
      backgroundWorkerPool,
      experimentIndex,
      experimentRecord,
      modelLab,
      remoteContentRepository,
      saveState,
      t,
    ],
  );

  const publishExperimentV3 = React.useCallback(async () => {
    if (publicationStage !== null) return;
    setSnapshotErrorFromArticle(false);
    if (exclusiveOperationRef.current !== null) {
      setSnapshotError(t("workbench.editor.snapshotBusy"));
      return;
    }
    setSnapshotError(null);
    if (remoteContentRepository !== null && authIdentity.kind !== "account") {
      setSnapshotError(t("workbench.editor.publishRequiresLinkedAccount"));
      return;
    }
    try {
      const titleChanged = (experimentTitleRef.current.trim() || savedTitleRef.current) !== savedTitleRef.current;
      if (workbenchSaveAvailableV3(saveStateRef.current, titleChanged)) {
        setPublicationStage("saving");
        if (!await saveExperimentV3({ deferNavigation: true })) {
          if (saveStateRef.current !== "error") setSnapshotError(t("workbench.editor.publication.changedDuringSave"));
          return;
        }
      }
      await createSnapshotV3({ kind: "publication" });
    } finally {
      setPublicationStage(null);
      // Keep a first-save Session mounted until the entire save/publish chain
      // finishes. A Snapshot-reader route would otherwise unmount its runtime.
      if (savedRoutePendingRef.current && experimentIdRef.current !== null &&
        saveStateRef.current === "clean" && (experimentTitleRef.current.trim() || savedTitleRef.current) === savedTitleRef.current) {
        savedRoutePendingRef.current = false;
        navigate(`${experimentDetailHref({ experimentId: experimentIdRef.current, locale: resolvedLocale })}${location.search}`, {
          replace: true,
          state: snapshotErrorRef.current ? { workbenchPublicationError: snapshotErrorRef.current } : null,
        });
      }
    }
  }, [authIdentity.kind, createSnapshotV3, location.search, navigate, publicationStage, remoteContentRepository, resolvedLocale, saveExperimentV3, t]);

  const unpublishExperimentV3 = React.useCallback(async () => {
    const current = experimentRef.current;
    if (!current || exclusiveOperationRef.current !== null || publicationStage !== null) return;
    setSnapshotErrorFromArticle(false);
    exclusiveOperationRef.current = "publication";
    setPublicationStage("unpublishing");
    setSnapshotError(null);
    try {
      if (remoteContentRepository) {
        await remoteContentRepository.unpublishExperiment(current.experimentId, current.version);
        const resource = await remoteContentRepository.readMyExperiment(current.experimentId);
        if (!resource) throw new Error("Experiment could not be read back");
        setExperimentRecord(remoteExperimentRecordV3(resource));
      } else {
        setExperimentRecord(experimentIndex.unpublish(current.experimentId, new Date().toISOString()));
      }
    } catch (error) {
      setSnapshotError(workbenchAuthoringErrorMessageV3(error));
    } finally {
      exclusiveOperationRef.current = null;
      setPublicationStage(null);
    }
  }, [experimentIndex, publicationStage, remoteContentRepository]);

  const createArticleSnapshotV3 = React.useCallback(async () => {
    const currentBriefing = briefingRef.current;
    const sourceSnapshot = briefingCaptureSnapshot;
    const sourceSurfaceMutationRevision =
      briefingCaptureSurfaceMutationRevision;
    if (
      currentBriefing === null ||
      sourceSnapshot === null ||
      sourceSurfaceMutationRevision === null
    )
      return;
    const snapshot = await createSnapshotV3({
      kind: "article",
      sourceSnapshot,
      sourceSurfaceMutationRevision,
      sourceBriefingMutationRevision: briefingMutationRevisionRef.current,
    });
    if (snapshot !== null) {
      setHasUncapturedBriefingChanges(false);
    }
    if (snapshot === null || articleAuthoringContext === null) return;
    const completed = articleExperimentHandoff.complete({
      sessionToken,
      snapshotId: snapshot.snapshotId,
      briefing: currentBriefing,
    });
    if (completed === null) return;
    // Returning to the Article completes only the single-use handoff. The
    // neutral Snapshot exists independently; saving the Article persists its
    // Placement-owned Briefing even when this Session was never an Experiment.
    setHasUnsavedContentChanges(false);
    setHasUncommittedTitleChanges(false);
    setHasUncapturedBriefingChanges(false);
    navigate(
      articleEditorHref({
        articleId: completed.articleId,
        locale: resolvedLocale,
      }),
    );
  }, [
    articleAuthoringContext,
    articleExperimentHandoff,
    briefingCaptureSnapshot,
    briefingCaptureSurfaceMutationRevision,
    createSnapshotV3,
    navigate,
    resolvedLocale,
    sessionToken,
  ]);

  React.useEffect(() => {
    if (!workbenchDurableContentAvailableV3({ modelLab })) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void saveExperimentV3();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [modelLab, saveExperimentV3]);

  const discardArticleHandoffV3 = React.useCallback(() => {
    if (articleAuthoringContext !== null) articleExperimentHandoff.clear();
    if (experimentSessionContext !== null) experimentSessionHandoff.clear();
  }, [
    articleAuthoringContext,
    articleExperimentHandoff,
    experimentSessionContext,
    experimentSessionHandoff,
  ]);
  const confirmNavigation = useUnsavedChangesGuardV3({
    enabled:
      workbenchDurableContentAvailableV3({ modelLab }) &&
      shouldConfirmWorkbenchDiscardV3({
        hasUnsavedContentChanges,
        hasUncommittedTitleChanges,
        hasUncapturedBriefingChanges,
      }),
    message: t("common.unsavedChanges"),
    onConfirmedDiscard: discardArticleHandoffV3,
  });
  const returnToPreviousPage = usePreviousPageV1(
    articleAuthoringContext !== null
      ? articleEditorHref({ articleId: articleAuthoringContext.articleId, locale: resolvedLocale })
      : experimentSessionContext?.returnHref
        ?? (initialExperimentId !== null ? myExperimentsHref(resolvedLocale) : homeHref(resolvedLocale)),
  );

  const latestFrame = status.kind === "live" ? status.frame : null;
  const formalPvAnalysisId = mainWireFormalPvAnalysisIdV1(periodicPvaDerivationRef.current);
  const rootRuntimeData =
    status.kind === "live"
      ? {
          "data-accepted-revision": status.frame.acceptedRevision,
          "data-input-epoch": status.frame.inputEpoch,
          "data-model-id": status.frame.modelId,
          "data-model-time-sec": status.frame.acceptedTimeSec,
        }
      : {};
  const runtimeOperationPending =
    (status.kind === "live" && status.halted !== undefined) ||
    pendingControlId !== null ||
    analysisCapturePending ||
    scenarioOperation !== null ||
    saveState === "saving" || publicationStage !== null ||
    snapshotState === "creating";
  const periodicPvaOutputScenarioIds = React.useMemo(() => {
    if (periodicPvaDerivationRef.current === null) return Object.freeze([]);
    const analysisOutputIds = new Set<string>(
      MAIN_WIRE_PERIODIC_PVA_ANALYSIS_OUTPUT_IDS_V1,
    );
    return Object.freeze([
      ...new Set(
        outputPanes.flatMap((pane) => {
          if (
            !pane.items.some(({ outputId }) => analysisOutputIds.has(outputId))
          )
            return [];
          const scenarioId = resolveWorkbenchOutputPaneScenarioIdV3(
            pane,
            activeScenarioId,
            scenarios,
          );
          return scenarioId === null ? [] : [scenarioId];
        }),
      ),
    ]);
  }, [activeScenarioId, outputPanes, scenarios]);
  const missingPeriodicPvaOutputScenarioIds =
    periodicPvaOutputScenarioIds.filter((scenarioId) => {
      const key = workbenchAnalysisHistoryKeyV3(
        scenarioId,
        formalPvAnalysisId,
      );
      return (
        analysisByKey[key] === undefined &&
        analysisErrorByKey[key] === undefined &&
        !pendingAnalysisKeys.includes(key)
      );
    });
  const periodicPvaOutputRequestKey = structuralReturnComparisonRequestKeyV3(
    formalPvAnalysisId,
    missingPeriodicPvaOutputScenarioIds,
  );
  const lastPeriodicPvaOutputRequestKeyRef = React.useRef<string | null>(null);
  const [periodicPvaOutputRetryNonce, setPeriodicPvaOutputRetryNonce] =
    React.useState(0);
  React.useEffect(() => {
    if (periodicPvaOutputRequestKey === null) {
      lastPeriodicPvaOutputRequestKeyRef.current = null;
      return;
    }
    if (
      (latestFrame?.acceptedRevision ?? 0) <= 0 ||
      runtimeOperationPending ||
      lastPeriodicPvaOutputRequestKeyRef.current === periodicPvaOutputRequestKey
    )
      return;
    if (
      requestAnalysis(
        formalPvAnalysisId,
        missingPeriodicPvaOutputScenarioIds,
      )
    ) {
      lastPeriodicPvaOutputRequestKeyRef.current = periodicPvaOutputRequestKey;
      return;
    }
    const retryTimer = window.setTimeout(() => {
      setPeriodicPvaOutputRetryNonce((nonce) => nonce + 1);
    }, 250);
    return () => window.clearTimeout(retryTimer);
  }, [
    latestFrame?.acceptedRevision,
    formalPvAnalysisId,
    missingPeriodicPvaOutputScenarioIds,
    periodicPvaOutputRequestKey,
    periodicPvaOutputRetryNonce,
    requestAnalysis,
    runtimeOperationPending,
  ]);
  const pendingAnalysisScenarioIds = new Set(
    pendingAnalysisKeys.flatMap((key) => {
      const scenarioId = workbenchScenarioIdFromAnalysisKeyV3(key);
      return scenarioId === null ? [] : [scenarioId];
    }),
  );
  const unavailableAnalysisScenarioIds = new Set(
    Object.keys(analysisErrorByKey).flatMap((key) => {
      const scenarioId = workbenchScenarioIdFromAnalysisKeyV3(key);
      return scenarioId === null ? [] : [scenarioId];
    }),
  );
  const simulationInfoScenarios = Object.freeze(
    scenarios.map((scenario, index) => {
      const authoredColor = surface?.scenarioColorSeeds?.find(
        ({ scenarioId }) => scenarioId === scenario.scenarioId,
      )?.colorHex;
      return Object.freeze({
        scenarioId: scenario.scenarioId,
        label: scenario.label,
        colorHex: authoredColor ?? scenarioIdentityColorV3(index),
        active: scenario.scenarioId === activeScenarioId,
        runtime: isPlaying ? ("live" as const) : ("paused" as const),
        settlement:
          snapshotPurpose === "publication" && snapshotState === "created"
            ? ("settled" as const)
            : snapshotPurpose === "publication" && snapshotState === "creating"
              ? ("checking" as const)
              : ("not-assessed" as const),
        numericalSafety:
          snapshotPurpose !== null && snapshotState === "created"
            ? ("passed" as const)
            : snapshotPurpose !== null && snapshotState === "creating"
              ? ("checking" as const)
              : snapshotPurpose !== null && snapshotState === "error"
                ? ("unavailable" as const)
                : ("not-checked" as const),
        analysis: pendingAnalysisScenarioIds.has(scenario.scenarioId)
          ? ("checking" as const)
          : unavailableAnalysisScenarioIds.has(scenario.scenarioId)
            ? ("unavailable" as const)
            : ("idle" as const),
      });
    }),
  );
  const openBriefingComposerV3 = React.useCallback(() => {
    const currentSurface = surfaceRef.current;
    const currentScenarios = scenarioDescriptorsRef.current;
    if (
      currentSurface === null ||
      contract === null ||
      currentScenarios.length === 0
    )
      return;
    const capture = createWorkbenchBriefingSnapshotV3({
      defaultTitle: experimentTitleRef.current,
      modelId: contract.modelId,
      surfaceSeriesId: surfaceSeriesIdRef.current,
      surfaceReleaseId: surfaceReleaseIdRef.current,
      scenarios: currentScenarios,
      surface: currentSurface,
    });
    const activeId =
      activeScenarioIdRef.current ?? currentScenarios[0]!.scenarioId;
    const nextBriefing = reconcileWorkbenchBriefingV3({
      briefing: briefingRef.current,
      preferredFocusScenarioId: activeId,
      defaultTitle: experimentTitleRef.current,
      snapshot: capture,
    });
    setBriefingCaptureSnapshot(capture);
    setBriefingCaptureSurfaceMutationRevision(
      surfaceMutationRevisionRef.current,
    );
    updateWorkbenchBriefingV3(nextBriefing);
    setBriefingOpen(true);
  }, [contract, updateWorkbenchBriefingV3]);
  const briefingSnapshot = briefingCaptureSnapshot;
  const commitExperimentTitleV3 = React.useCallback(() => {
    const nextTitle = experimentTitleRef.current.trim() || savedTitleRef.current || t("workbench.selector.untitled");
    experimentTitleRef.current = nextTitle;
    setExperimentTitle(nextTitle);
    setHasUncommittedTitleChanges(nextTitle !== savedTitleRef.current);
  }, [t]);
  const canSave = workbenchSaveAvailableV3(saveState, hasUncommittedTitleChanges);
  const effectiveSaveState = hasUncommittedTitleChanges && saveState !== "saving" && saveState !== "error" ? "dirty" : saveState;
  const isPublished = experimentRecord?.publishedSnapshotId != null;
  const publicationStale = workbenchPublicationIsStaleV3({
    publishedSnapshotId: experimentRecord?.publishedSnapshotId ?? null,
    publishedVersion: experimentRecord?.publishedVersion,
    savedVersion: experiment?.version ?? null,
    hasChanges: canSave || hasUnsavedContentChanges || hasUncommittedTitleChanges,
  });
  const durableContentAvailable = workbenchDurableContentAvailableV3({
    modelLab,
  });
  const publicationAvailable = workbenchPublicationAvailableV3({
    modelLab,
    releaseStage,
  });
  const briefingAvailable = !modelLab && articleLinked;
  const authoringActionsAvailable =
    briefingAvailable || durableContentAvailable || publicationAvailable;

  const graphPaneDefinitions: readonly WorkbenchPaneDefinitionV3[] =
    graphPanes.map((pane) => ({
      paneId: pane.paneId,
      role: pane.role,
      title: pane.label,
    }));
  const outputPaneDefinitions: readonly WorkbenchPaneDefinitionV3[] =
    outputPanes.map((pane) => ({
      paneId: pane.paneId,
      role: pane.role,
      title: pane.label,
    }));
  const controlPaneDefinitions: readonly WorkbenchPaneDefinitionV3[] =
    controlPanes.map((pane) => ({
      paneId: pane.paneId,
      role: pane.role,
      title: pane.label,
    }));
  const graphAddOptions =
    contract === null
      ? []
      : workbenchGraphPaneOptionsForContractV3(contract).map((option) => ({
          id: option.optionId,
          label: t(`workbench.editor.graphPaneKinds.${option.kind}`),
        }));
  const renderGraphPaneV3 = (paneDefinition: WorkbenchPaneDefinitionV3) => {
    const graphPane = graphPanes.find(
      ({ paneId }) => paneId === paneDefinition.paneId,
    );
    return graphPane === undefined || contract === null ? (
      <PaneLoadingV3 />
    ) : (
      <GraphPaneBodyV3
        legendActions={paneSettingsActions.get(graphPane.paneId)}
        activeScenarioId={activeScenarioId}
        playbackRunning={isPlaying}
        analysisByKey={analysisByKey}
        analysisHistoryByKey={analysisHistoryByKey}
        analysisErrorByKey={analysisErrorByKey}
        contract={contract}
        frame={latestFrame}
        onRequestAnalysis={requestAnalysis}
        operationPending={runtimeOperationPending}
        pane={graphPane}
        pendingAnalysisKeys={pendingAnalysisKeys}
        periodicPvaDerivation={periodicPvaDerivationRef.current}
        sampleStore={presentationSampleStore}
        scenarios={scenarios}
        surface={surface}
        visibleScenarioIds={visibleScenarioIds}
        readPresentation={id => ({ analyses: runtimeRef.current?.presentationAnalyses(id) ?? retainedPresentationRef.current.get(id)?.analyses ?? [], frame: runtimeRef.current?.maybeLatestFrame(id) ?? retainedPresentationRef.current.get(id)?.frame })}
      />
    );
  };
  const renderOutputPaneV3 = (
    paneDefinition: WorkbenchPaneDefinitionV3,
    scrollMode: "contained" | "parent" | "section" = "contained",
  ) => {
    const pane = outputPanes.find(
      ({ paneId }) => paneId === paneDefinition.paneId,
    );
    if (pane === undefined || contract === null) return <PaneLoadingV3 kind="output" itemCount={pane?.items.length} />;
    const scenarioId = resolveWorkbenchOutputPaneScenarioIdV3(
      pane,
      activeScenarioId,
      scenarios,
    );
    const scopeKey = JSON.stringify([pane.paneId, scenarioId]);
    let scope = lastMeasurementsByScope.get(scopeKey);
    if (scope === undefined) {
      scope = { paneId: pane.paneId, scenarioId, memory: new WorkbenchLastMeasuredOutputsV1() };
      lastMeasurementsByScope.set(scopeKey, scope);
    }
    const frame =
      scenarioId === null
        ? null
        : (runtimeRef.current?.maybeLatestFrame(scenarioId) ??
          retainedPresentationRef.current.get(scenarioId)?.frame ??
          (latestFrame?.scenarioId === scenarioId ? latestFrame : null));
    const periodicPvaAnalysisKey =
      scenarioId === null
        ? null
        : workbenchAnalysisHistoryKeyV3(
            scenarioId,
            formalPvAnalysisId,
          );
    const periodicPva =
      periodicPvaAnalysisKey === null
        ? undefined
        : periodicPvaFromAnalysisV3(
            analysisByKey[periodicPvaAnalysisKey],
            "left",
            periodicPvaDerivationRef.current,
          );
    return (
      <OutputPaneBodyV3
        contract={contract}
        lastMeasurements={scope.memory}
        presentationAnalyses={scenarioId === null ? undefined : runtimeRef.current?.presentationAnalyses(scenarioId) ?? retainedPresentationRef.current.get(scenarioId)?.analyses}
        frame={frame}
        locale={resolvedLocale}
        onAddItem={() => openPaneSettings(pane.paneId, "items", "add")}
        onOpenBindingSettings={() => openPaneSettings(pane.paneId, "binding")}
        settingsAction={paneSettingsActions.get(pane.paneId)}
        pane={pane}
        periodicPva={periodicPva}
        periodicPvaAnalysisError={
          periodicPvaAnalysisKey === null
            ? undefined
            : analysisErrorByKey[periodicPvaAnalysisKey]
        }
        scrollMode={scrollMode}
        showBinding={scenarios.length > 1}
        scenarioLabel={
          scenarios.find((scenario) => scenario.scenarioId === scenarioId)
            ?.label ?? "—"
        }
      />
    );
  };
  const renderControlPaneV3 = (
    paneDefinition: WorkbenchPaneDefinitionV3,
    scrollMode: "contained" | "parent" | "section" = "contained",
  ) => {
    const pane = controlPanes.find(
      ({ paneId }) => paneId === paneDefinition.paneId,
    );
    return pane === undefined || contract === null ? (
      <PaneLoadingV3 kind="control" itemCount={pane?.items.length} />
    ) : (
      <ControlPaneBodyV3
        activeScenarioId={activeScenarioId}
        contract={contract}
        controlError={controlError}
        controlValuesByScenario={controlValuesByScenarioRef.current}
        disabledByAnalysis={scenarioOperation !== null || (status.kind === "live" && status.halted !== undefined)}
        locale={resolvedLocale}
        onApplyControl={applyControl}
        onOpenSettings={openPaneSettings}
        settingsAction={paneSettingsActions.get(pane.paneId)}
        pane={pane}
        pendingControlId={pendingControlId}
        scenarios={scenarios}
        scrollMode={scrollMode}
      />
    );
  };
  const scenarioManagerPendingIds =
    contract === null
      ? []
      : scenarios.flatMap(({ scenarioId }) =>
          contract.graphCatalog.some(
            (graph) =>
              graph.renderer === "structural-return" &&
              pendingAnalysisKeys.includes(
                workbenchAnalysisHistoryKeyV3(
                  scenarioId,
                  formalPvAnalysisId,
                ),
              ),
          )
            ? [scenarioId]
            : [],
        );
  const renderScenarioManagerV3 = (variant: "embedded" | "embedded-mobile") =>
    contract === null ? null : (
      <WorkbenchScenarioManagerV3
        variant={variant}
        modelId={contract.modelId}
        scenarios={scenarios}
        activeScenarioId={activeScenarioId}
        pendingScenarioIds={scenarioManagerPendingIds}
        visibleScenarioIds={visibleScenarioIds}
        scenarioBaseColors={surface?.scenarioColorSeeds ?? []}
        presets={scenarioPresets}
        presetDocumentationLinks={Object.fromEntries(scenarioPresets.flatMap(preset => {
          const entry = resolveRegisteredPresetDocumentationV1(preset.modelId, surfaceReleaseIdRef.current, preset.presetId);
          return entry ? [[preset.presetId, { href: modelDocumentationHref({ locale: resolvedLocale,
            ...entry, view: "presets" }), label: resolvedLocale === "ja" ? "設定と検証" : "Settings & checks" }]] : [];
        }))}
        actionDisabledReasons={
          scenarioOperation === null && !(status.kind === "live" && status.halted !== undefined)
            ? undefined
            : {
                add: t("workbench.editor.scenarioManager.busy"),
                delete: t("workbench.editor.scenarioManager.busy"),
                duplicate: t("workbench.editor.scenarioManager.busy"),
                rename: t("workbench.editor.scenarioManager.busy"),
              }
        }
        onSelectScenario={selectScenarioV3}
        onToggleScenarioVisibility={toggleScenarioVisibilityV3}
        onChangeScenarioBaseColor={(scenarioId, colorHex) => {
          updateSurface((current) =>
            updateWorkbenchScenarioBaseColorV3(current, scenarioId, colorHex),
          );
        }}
        onAddFromPreset={addScenarioFromPresetV3}
        onDuplicateScenario={duplicateScenarioV3}
        onRenameScenario={renameScenarioV3}
        onDeleteScenario={deleteScenarioV3}
        strings={{
          addFromPreset: t("workbench.editor.scenarioManager.addFromPreset"),
          analysisRunning: t("workbench.live.analysisRecalculating"),
          baseColor: t("workbench.editor.scenarioManager.baseColor"),
          close: t("workbench.editor.scenarioManager.close"),
          copySuffix: t("workbench.editor.scenarioManager.copySuffix"),
          delete: t("workbench.editor.scenarioManager.delete"),
          deleteLastScenario: t(
            "workbench.editor.scenarioManager.deleteLastScenario",
          ),
          duplicate: t("workbench.editor.scenarioManager.duplicate"),
          emptyScenarios: t("workbench.editor.scenarioManager.emptyScenarios"),
          hideScenario: t("workbench.editor.scenarioManager.hideScenario"),
          rename: t("workbench.editor.scenarioManager.rename"),
          scenarioMenu: t("workbench.editor.scenarioManager.scenarioMenu"),
          scenarioName: t("workbench.editor.scenarioManager.scenarioName"),
          scenarios: t("workbench.editor.scenarioManager.scenarios"),
          showScenario: t("workbench.editor.scenarioManager.showScenario"),
          title: t("workbench.editor.scenarioManager.title"),
        }}
      />
    );
  const scenarioErrorNotice =
    scenarioError === null ? null : (
      <p
        className="mx-2 mt-2 shrink-0 rounded-lg bg-wb-danger-soft p-2 text-[10px] text-wb-danger"
        role="alert"
      >
        {scenarioError}
      </p>
    );

  return (
    <div
      className={`workbench-root relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-wb-app text-wb-text transition-[padding-right] duration-200 ease-out motion-reduce:transition-none ${
        briefingOpen ? "lg:pr-[min(42rem,45vw)]" : ""
      }`}
      data-testid="v3-dockview-workbench"
      data-playback={isPlaying ? "playing" : "paused"}
      data-calculation-stopped={status.kind === "live" && status.halted !== undefined ? "true" : undefined}
      data-model-lab={modelLab ? "true" : undefined}
      {...rootRuntimeData}
    >
      <header className="workbench-app-header flex min-h-12 shrink-0 items-center gap-2 px-2.5 py-1.5 sm:px-3">
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          {modelLab ? (
            <Link
              to={devDashboardHref(resolvedLocale)}
              className="workbench-header-action inline-flex h-9 w-9 shrink-0 items-center justify-center"
              aria-label={t("devDashboard.returnFromModelLab")}
            >
              <Home className="h-4 w-4" aria-hidden="true" />
            </Link>
          ) : (
            <button
              type="button"
              className="workbench-header-action inline-flex h-9 w-9 shrink-0 items-center justify-center"
              aria-label={t("common.back")}
              title={t("common.back")}
              onClick={() => {
                if (confirmNavigation()) returnToPreviousPage();
              }}
              data-testid="workbench-back-v1"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
          <input
            type="text"
            value={experimentTitle}
            maxLength={240}
            aria-label={t("workbench.editor.experimentTitle")}
            data-testid="workbench-experiment-title-v3"
            className="workbench-app-title min-w-0 w-full max-w-[30rem] flex-1 truncate border-0 bg-transparent p-0 text-left outline-none ring-0 selection:bg-wb-accent/25 focus:outline-none focus:ring-0"
            style={{ caretColor: "var(--wb-accent)" }}
            onChange={(event) => {
              const nextTitle = event.currentTarget.value;
              const fallback =
                savedTitleRef.current || t("workbench.selector.untitled");
              experimentTitleRef.current = nextTitle;
              setExperimentTitle(nextTitle);
              setHasUncommittedTitleChanges(
                (nextTitle.trim() || fallback) !== fallback,
              );
            }}
            onBlur={commitExperimentTitleV3}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                event.currentTarget.blur();
              } else if (event.key === "Escape") {
                event.preventDefault();
                setExperimentTitle(
                  savedTitleRef.current || t("workbench.selector.untitled"),
                );
                experimentTitleRef.current =
                  savedTitleRef.current || t("workbench.selector.untitled");
                setHasUncommittedTitleChanges(false);
                event.currentTarget.blur();
              }
            }}
          />
            {sourceSnapshotId && <span className="[&_.public-author]:text-[10px] [&_.public-author-badge]:text-[9px]"><ResourceAuthorV1 kind="snapshot" resourceId={sourceSnapshotId} locale={resolvedLocale} /></span>}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          {modelLab && (
            <span
              className="hidden rounded-full bg-wb-accent/10 px-2 py-1 text-[11px] font-semibold text-wb-accent sm:inline"
              data-testid="workbench-model-lab-label-v3"
            >
              Model Lab
            </span>
          )}
          {contract !== null && (
            <WorkbenchSimulationInfoV3
              currentModelId={contract.modelId}
              limitations={[
                ...(t(modelLimitationsKey, {
                  returnObjects: true,
                }) as string[]),
                ...workbenchAnalysisLimitationsV3(formalPvAnalysisId, resolvedLocale),
              ]}
              note={{
                value: surface?.note.text ?? "",
                placeholder: t("workbench.editor.notePlaceholder"),
                onChange: (text) =>
                  updateSurface((current) => ({
                    ...current,
                    note: { text },
                  })),
              }}
              models={[
                {
                  contract,
                  publicName: t(
                    "workbench.editor.simulationInfo.integratedModelName",
                  ),
                  shortLabel: modelDisclosure.shortLabel ?? t(
                    "workbench.editor.simulationInfo.integratedModelVersion",
                  ),
                  description: t(
                    "workbench.editor.simulationInfo.integratedModelDescription",
                  ),
                  ...(baselineValidationPresentation === undefined
                    ? {}
                    : {
                        baselineValidation:
                          baselineValidationPresentation,
                      }),
                  ...(modelDocumentationLink === undefined
                    ? {}
                    : { documentationHref: modelDocumentationLink }),
                },
              ]}
              scenarios={simulationInfoScenarios}
            />
          )}
          <button
            type="button"
            className="workbench-header-action hidden h-9 w-9 items-center justify-center sm:inline-flex"
            aria-label={t("common.theme.toggle")}
            title={t("common.theme.toggle")}
            data-testid="workbench-theme-toggle"
            onClick={() => setAppTheme(appTheme === "dark" ? "light" : "dark")}
          >
            {appTheme === "dark" ? (
              <Sun className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <Moon className="h-3.5 w-3.5" aria-hidden="true" />
            )}
          </button>
          {status.kind === "live" && (
            <>
              <span
                className="mx-0.5 h-5 w-px shrink-0 bg-wb-line"
                aria-hidden="true"
                data-testid="v3-header-information-playback-separator"
              />
              <WorkbenchPlaybackControlV3
                disabled={runtimeOperationPending}
                playing={isPlaying}
                rate={playbackRate}
                onPlaybackToggle={togglePlayback}
                onRateChange={changePlaybackRate}
              />
            </>
          )}
          {status.kind === "live" && authoringActionsAvailable && (
            <span
              className="mx-0.5 h-5 w-px shrink-0 bg-wb-line"
              aria-hidden="true"
              data-testid="v3-header-playback-authoring-separator"
            />
          )}
          {briefingAvailable && (
            <button
              type="button"
              className="workbench-header-action inline-flex min-h-9 items-center gap-1.5 px-2.5 disabled:opacity-40"
              disabled={surface === null}
              onClick={openBriefingComposerV3}
              aria-label={t("workbench.editor.briefing")}
            >
              <ClipboardList className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden md:inline">
                {t("workbench.editor.briefing")}
              </span>
            </button>
          )}
          {durableContentAvailable && (
            <button
              type="button"
              className="workbench-header-action workbench-save-action"
              data-state={effectiveSaveState === "clean" && saveJustFinished ? "just-saved" : effectiveSaveState}
              disabled={status.kind !== "live" || runtimeOperationPending || !canSave}
              onClick={() => void saveExperimentV3()}
              aria-label={t(effectiveSaveState === "saving" ? "workbench.editor.saving" : effectiveSaveState === "clean" ? "workbench.editor.saved" : "workbench.editor.save")}
              title={saveError ?? (effectiveSaveState === "pristine" ? t("workbench.editor.publication.noChanges") : undefined)}
              data-testid="v3-save-experiment"
            >
              {saveState === "saving" && <LoaderCircle className="h-3 w-3 shrink-0 animate-spin" aria-hidden="true" />}
              <span>{t(effectiveSaveState === "saving" ? "workbench.editor.saving" : effectiveSaveState === "clean" ? "workbench.editor.saved" : "workbench.editor.save")}</span>
            </button>
          )}
          <span className="sr-only" role="status">{effectiveSaveState === "clean" ? t("workbench.editor.saved") : ""}</span>
          {publicationAvailable && (
            <WorkbenchPublishMenuV3
              published={isPublished}
              stale={publicationStale}
              comparisonKnown={experimentRecord?.publishedVersion != null}
              dirty={canSave}
              disabled={status.kind !== "live" || runtimeOperationPending || effectiveSaveState === "pristine"}
              stage={publicationStage}
              publishedAt={experimentRecord?.publishedAt ?? null}
              publicHref={experimentRecord?.publicSlug ? publishedExperimentHref({ publicSlug: experimentRecord.publicSlug, locale: resolvedLocale }) : experimentRecord?.publishedSnapshotId ? experimentSnapshotHref({ snapshotId: experimentRecord.publishedSnapshotId, locale: resolvedLocale }) : null}
              error={snapshotErrorFromArticle ? saveError : snapshotError ?? saveError}
              loginHref={remoteContentRepository !== null && authIdentity.kind !== "account" ? loginHref(resolvedLocale) : null}
              onPublish={publishExperimentV3}
              onUnpublish={unpublishExperimentV3}
            />
          )}
        </div>
      </header>
      <RuntimeStatusV3 key={runtimeGeneration} status={status} onRetry={() => restartRuntime(playingIntentRef.current)} />
      {status.kind === "live" && status.halted !== undefined && (
        <section role="alert" data-testid="workbench-calculation-stopped"
          className="flex flex-wrap items-center gap-3 border-b border-wb-line bg-wb-panel px-4 py-2 text-sm text-wb-text">
          <span>{t("workbench.live.calculationStopped")}</span>
          {controlRecoveryRef.current && scenarios.every(scenario => controlRecoveryRef.current!.content.scenarios.some(saved => saved.scenarioId === scenario.scenarioId)) && (
            <button type="button" className="rounded border border-wb-line px-3 py-1 hover:bg-wb-hover"
              onClick={restoreControlRecovery}>{t(controlRecoveryRef.current.beforeControl
                ? "workbench.live.restoreBeforeControl" : "workbench.live.restoreLaunch")}</button>
          )}
          <details className="text-xs text-wb-subtle"><summary>{t("workbench.live.failureDetails")}</summary>{status.halted}</details>
        </section>
      )}

      {saveError !== null && (
        <WorkbenchSaveErrorBannerV3
          message={`${t("workbench.editor.saveError")}: ${saveError}`}
          retryLabel={t("workbench.editor.publication.retry")}
          onRetry={() => void saveExperimentV3()}
          retryDisabled={runtimeOperationPending}
        />
      )}

      {snapshotError !== null && !briefingOpen && (
        <WorkbenchSnapshotErrorBannerV3
          closeLabel={t("common.close")}
          login={
            snapshotError ===
            t("workbench.editor.publishRequiresLinkedAccount")
              ? {
                  href: loginHref(resolvedLocale),
                  label: t("siteHeader.login"),
                }
              : null
          }
          message={`${t("workbench.editor.snapshotError")}: ${snapshotError}`}
          onClose={() => setSnapshotError(null)}
        />
      )}

      {status.kind === "unavailable-model" ? (
        <WorkbenchUnavailableModelV3
          back={{
            href: myExperimentsHref(isLocale(locale) ? locale : undefined),
            label: t("workbench.unavailable.back"),
          }}
          description={t("workbench.unavailable.description")}
          onStartLatest={startLatestWorkbenchV3}
          preservedNotice={t("workbench.unavailable.preserved")}
          recoveryError={recoveryError}
          startLatestLabel={t("workbench.unavailable.startLatest")}
          title={t("workbench.unavailable.title")}
        />
      ) : status.kind === "error" ? (
        <WorkbenchRuntimeErrorV3
          message={status.message}
          onRestart={() => restartRuntime()}
          restartLabel={t("workbench.live.restart")}
          title={t("workbench.live.errorTitle")}
        />
      ) : status.kind === "loading" && surface === null ? (
        <WorkbenchAreaLayoutV3
          className="min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(240px,1fr)_160px] overflow-hidden"
          inspectorResizeLabel={t("workbench.live.resizeInspectorArea")}
          outputResizeLabel={t("workbench.live.resizeOutputArea")}
        >
          <div className="min-h-0 border-b border-wb-line bg-wb-canvas lg:col-start-1 lg:row-start-1"><PaneLoadingV3 /></div>
          <div className="min-h-0 bg-wb-aux lg:col-start-1 lg:row-start-2"><PaneLoadingV3 kind="output" /></div>
          <div className="hidden min-h-0 border-l border-wb-line bg-wb-aux lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:block"><PaneLoadingV3 kind="control" /></div>
        </WorkbenchAreaLayoutV3>
      ) : (
        <WorkbenchPerformanceProfilerV3>
          {mobileWorkbenchShell ? (
            <WorkbenchMobileStageDeckV3
              graphPanes={graphPaneDefinitions}
              outputPanes={outputPaneDefinitions}
              controlPanes={controlPaneDefinitions}
              graphAddOptions={graphAddOptions}
              scenarioContent={renderScenarioManagerV3("embedded-mobile")}
              scenarioError={scenarioErrorNotice}
              renderGraphPane={renderGraphPaneV3}
              renderOutputPane={(pane) => renderOutputPaneV3(pane, "section")}
              renderControlPane={(pane) => renderControlPaneV3(pane, "section")}
              onOpenPaneSettings={openPaneSettings}
              onAddGraphPane={(anchor, onCreated) =>
                addPaneToRoleArea("graph", anchor, onCreated)
              }
              onAddOutputPane={(anchor, onCreated) => addPaneToRoleArea("output", anchor, onCreated)}
              onAddControlPane={(anchor, onCreated) => addPaneToRoleArea("control", anchor, onCreated)}
            />
          ) : (
            <WorkbenchAreaLayoutV3
              className="min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(420px,55vh)_260px_minmax(560px,70vh)] overflow-y-auto lg:overflow-hidden"
              inspectorResizeLabel={t("workbench.live.resizeInspectorArea")}
              outputResizeLabel={t("workbench.live.resizeOutputArea")}
            >
              <WorkbenchDockview
                ariaLabel={t("workbench.live.graphArea")}
                className="workbench-dockview-main workbench-workspace lg:col-start-1 lg:row-start-1"
                panes={graphPaneDefinitions}
                role="graph"
                onOpenPaneSettings={openPaneSettings}
                onRenamePane={renamePaneV3}
                onDeletePane={deletePaneV3}
                onSplitPane={splitPaneV3}
                onAddPane={(anchor, onCreated) =>
                  addPaneToRoleArea("graph", anchor, onCreated)
                }
                addPaneLabel={t("workbench.editor.addPane")}
                renamePaneLabel={t("workbench.editor.renamePane")}
                deletePaneLabel={t("workbench.editor.deletePane")}
                splitRightLabel={t("workbench.editor.splitRight")}
                splitDownLabel={t("workbench.editor.splitDown")}
                emptyPaneLabel={t("workbench.editor.emptyPaneArea")}
                paneSettingsLabel={t("workbench.live.paneSettings")}
                renderPane={renderGraphPaneV3}
              />
              <WorkbenchDockview
                ariaLabel={t("workbench.live.outputArea")}
                className="workbench-bottom-drawer lg:col-start-1 lg:row-start-2"
                panes={outputPaneDefinitions}
                role="output"
                onOpenPaneSettings={openPaneSettings}
                onRenamePane={renamePaneV3}
                onDeletePane={deletePaneV3}
                onSplitPane={splitPaneV3}
                onComparePane={
                  scenarios.length > 1
                    ? compareOutputPaneByScenarioV3
                    : undefined
                }
                onAddPane={(anchor, onCreated) => addPaneToRoleArea("output", anchor, onCreated)}
                addPaneLabel={t("workbench.editor.addPane")}
                renamePaneLabel={t("workbench.editor.renamePane")}
                deletePaneLabel={t("workbench.editor.deletePane")}
                splitRightLabel={t("workbench.editor.splitRight")}
                comparePaneLabel={t("workbench.editor.compareScenarios")}
                emptyPaneLabel={t("workbench.editor.emptyPaneArea")}
                paneSettingsLabel={t("workbench.live.paneSettings")}
                renderPane={renderOutputPaneV3}
              />
              <div className="workbench-right-drawer flex min-h-0 flex-col bg-wb-aux lg:col-start-2 lg:row-span-2 lg:row-start-1">
                {contract !== null && (
                  <div className="shrink-0 border-b border-wb-line">
                    {renderScenarioManagerV3("embedded")}
                  </div>
                )}
                {scenarioErrorNotice}
                <WorkbenchDockview
                  ariaLabel={t("workbench.live.controlArea")}
                  className="min-h-0 flex-1"
                  panes={controlPaneDefinitions}
                  role="control"
                  onOpenPaneSettings={openPaneSettings}
                  onRenamePane={renamePaneV3}
                  onDeletePane={deletePaneV3}
                  onSplitPane={splitPaneV3}
                  onAddPane={(anchor, onCreated) => addPaneToRoleArea("control", anchor, onCreated)}
                  addPaneLabel={t("workbench.editor.addPane")}
                  renamePaneLabel={t("workbench.editor.renamePane")}
                  deletePaneLabel={t("workbench.editor.deletePane")}
                  splitDownLabel={t("workbench.editor.splitDown")}
                  emptyPaneLabel={t("workbench.editor.emptyPaneArea")}
                  paneSettingsLabel={t("workbench.live.paneSettings")}
                  renderPane={renderControlPaneV3}
                />
              </div>
            </WorkbenchAreaLayoutV3>
          )}
        </WorkbenchPerformanceProfilerV3>
      )}

      {contract !== null && surface !== null && paneSettings !== null && (
        <WorkbenchPanePickerV3
          key={`${paneSettings.kind}:${paneSettings.paneId ?? "new"}`}
          request={paneSettings}
          locale={resolvedLocale}
          periodicPvaSupported={periodicPvaDerivationRef.current !== null}
          contract={contract}
          surface={surface}
          scenarios={scenarios.map(scenario => ({ ...scenario, visible: visibleScenarioIds.includes(scenario.scenarioId) }))}
          onClose={() => setPaneSettings(null)}
          onCommit={(pane, creating) => {
            updateSurface(current => {
              const next = creating
                ? pane.role === "graph" ? { ...current, graphPanes: [...current.graphPanes, pane] }
                  : pane.role === "output" ? { ...current, outputPanes: [...current.outputPanes, pane] }
                    : { ...current, controlPanes: [...current.controlPanes, pane] }
                : updateWorkbenchSurfacePaneV3(current, { kind: pane.role, paneId: pane.paneId }, () => pane);
              return reconcileWorkbenchGraphColorsV3(next, scenarios);
            });
          }}
          strings={{
            addCatalogItem: t("workbench.editor.addCatalogItem"),
            backToCatalog: t("workbench.editor.backToCatalog"),
            availableItems: t("workbench.editor.availableItems"),
            cancel: t("workbench.editor.cancel"),
            activeSlotBinding: t("workbench.editor.activeSlotBinding"),
            activeSlotBindingHint: t("workbench.editor.activeSlotBindingHint"),
            outputActiveSlotBindingHint: t(
              "workbench.editor.outputActiveSlotBindingHint",
            ),
            bindingSection: t("workbench.editor.bindingSection"),
            close: t("workbench.editor.close"),
            chooseItem: t("workbench.editor.chooseItem"),
            controlPresentation: t("workbench.editor.controlPresentation"),
            sliderPresentation: t("workbench.editor.sliderPresentation"),
            buttonsPresentation: t("workbench.editor.buttonsPresentation"),
            buttonLabel: t("workbench.editor.buttonLabel"),
            buttonValue: t("workbench.editor.buttonValue"),
            addButtonOption: t("workbench.editor.addButtonOption"),
            removeButtonOption: t("workbench.editor.removeButtonOption"),
            controlCatalog: t("workbench.live.registeredControls"),
            catalogAdded: t("workbench.editor.catalogAdded"),
            catalogCategories: {
              advanced: t("workbench.editor.catalogCategories.advanced"),
              coronary: t("workbench.editor.catalogCategories.coronary"),
              hemodynamics: t(
                "workbench.editor.catalogCategories.hemodynamics",
              ),
              mechanicalSupport: t(
                "workbench.editor.catalogCategories.mechanicalSupport",
              ),
              myocardium: t("workbench.editor.catalogCategories.myocardium"),
              oxygen: t("workbench.editor.catalogCategories.oxygen"),
              pericardium: t("workbench.editor.catalogCategories.pericardium"),
              rhythm: t("workbench.editor.catalogCategories.rhythm"),
              valves: t("workbench.editor.catalogCategories.valves"),
              ventilation: t("workbench.editor.catalogCategories.ventilation"),
            },
            catalogDrawerTitle: t("workbench.editor.catalogDrawerTitle"),
            closeDrawer: t("workbench.editor.closeDrawer"),
            dataSection: t("workbench.editor.settingsSections.data"),
            displaySection: t("workbench.editor.settingsSections.display"),
            done: t("workbench.editor.done"),
            emptyCatalog: t("workbench.editor.emptyCatalog"),
            editItem: t("workbench.editor.editItem"),
            generalSection: t("workbench.editor.settingsSections.general"),
            pressureEnvelopeOverlay: t(
              "workbench.editor.pressureEnvelopeOverlay",
            ),
            pressureEnvelopeOverlayHint: t(
              "workbench.editor.pressureEnvelopeOverlayHint",
            ),
            pvaBoundaryView: t("workbench.editor.pvaBoundaryView"),
            pvaBoundaryViewHint: t("workbench.editor.pvaBoundaryViewHint"),
            previousResults: t("workbench.editor.previousResults"),
            previousResultsHint: t("workbench.editor.previousResultsHint"),
            noPreviousResults: t("workbench.editor.noPreviousResults"),
            fixedBinding: t("workbench.editor.fixedBinding"),
            fixedBindingHint: t("workbench.editor.fixedBindingHint"),
            outputFixedBindingHint: t(
              "workbench.editor.outputFixedBindingHint",
            ),
            label: t("workbench.editor.label"),
            itemsSection: t("workbench.editor.items"),
            moveDown: t("workbench.editor.moveDown"),
            moveUp: t("workbench.editor.moveUp"),
            manageItems: t("workbench.editor.manageItems"),
            noCatalogMatches: t("workbench.editor.noCatalogMatches"),
            noConfigurableSeries: t("workbench.editor.noConfigurableSeries"),
            outputCatalog: t("workbench.live.registeredOutputs"),
            paneKinds: {
              graph: t("workbench.editor.paneKinds.graph"),
              output: t("workbench.editor.paneKinds.output"),
              control: t("workbench.editor.paneKinds.control"),
            },
            seriesCatalog: t("workbench.editor.series"),
            scenarioColors: t("workbench.editor.scenarioColors"),
            scenarioColorsHint: t("workbench.editor.scenarioColorsHint"),
            traceVisibility: t("workbench.editor.traceVisibility"),
            traceVisibilityHint: t("workbench.editor.traceVisibilityHint"),
            resetColor: t("workbench.editor.resetColor"),
            removeItem: t("workbench.editor.removeItem"),
            preview: t("workbench.editor.preview"),
            reorderItem: t("workbench.editor.reorderItem"),
            searchCatalog: t("workbench.editor.searchCatalog"),
            selectedItems: t("workbench.editor.selectedItems"),
            title: t("workbench.live.paneSettings"),
            windowSec: t("workbench.editor.windowSec"),
            windowSecHint: t("workbench.editor.windowSecHint"),
          }}
        />
      )}
      {articleLinked && briefingSnapshot !== null && briefing !== null && (
        <WorkbenchBriefingComposerV3
          open={briefingOpen}
          briefing={briefing}
          captureScenarioId={
            activeScenarioId ?? briefing.scenarioScope.initialFocusScenarioId
          }
          contract={contract}
          snapshot={briefingSnapshot}
          onChange={(next) => {
            const resolved = resolveWorkbenchBriefingEditorChangeV3({
              activeScenarioId:
                activeScenarioId ?? next.scenarioScope.initialFocusScenarioId,
              current: briefing,
              next,
              snapshot: briefingSnapshot,
            });
            if (
              studioCanonicalJsonStringify(resolved) ===
              studioCanonicalJsonStringify(briefing)
            )
              return;
            setHasUncapturedBriefingChanges(true);
            updateWorkbenchBriefingV3(resolved);
          }}
          onClose={() => {
            setBriefingOpen(false);
          }}
          snapshotAction={{
            disabled: status.kind !== "live" || runtimeOperationPending,
            disabledReason:
              status.kind !== "live"
                ? t("workbench.editor.snapshotNotReady")
                : runtimeOperationPending && snapshotState !== "creating"
                  ? t("workbench.editor.snapshotBusy")
                  : undefined,
            label:
              snapshotState === "creating"
                ? t("workbench.editor.creatingSnapshot")
                : articleAuthoringContext === null
                  ? t("workbench.editor.createSnapshot")
                  : t("workbench.editor.createSnapshotForArticle"),
            pending: snapshotState === "creating",
            onCreate: () => void createArticleSnapshotV3(),
          }}
          strings={{
            close: t("workbench.editor.close"),
            description: t("workbench.editor.briefingDescription"),
            snapshotNotice:
              snapshotError ??
              (snapshotState === "created"
                ? t("workbench.editor.snapshotCreated", {
                    count: snapshotCount,
                  })
                : t("workbench.editor.briefingSnapshotNotice")),
            title: t("workbench.editor.briefingTitle"),
          }}
        />
      )}
    </div>
  );
};

function appendFramesV3(
  frames: readonly StudioSimulationFrameV2[],
  sampleStore: WorkbenchScenarioPresentationSampleStoreV3,
  selectedOutputIds?: ReadonlySet<string>,
): void {
  const diagnosticsEnabled = workbenchPerformanceDiagnosticsEnabledV3();
  const startedAtMs = diagnosticsEnabled ? workbenchPerformanceNowV3() : 0;
  const framesByScenarioId = new Map<string, StudioSimulationFrameV2[]>();
  for (const frame of frames) {
    const grouped = framesByScenarioId.get(frame.scenarioId) ?? [];
    grouped.push(frame);
    framesByScenarioId.set(frame.scenarioId, grouped);
  }
  const entries = [...framesByScenarioId].map(
    ([scenarioId, scenarioFrames]) => ({
      scenarioId,
      samples: scenarioFrames.map((frame) =>
        Object.freeze({
          inputEpoch: frame.inputEpoch,
          acceptedRevision: frame.acceptedRevision,
          acceptedTimeSec: frame.acceptedTimeSec,
          values: Object.freeze(
            Object.fromEntries(
              (selectedOutputIds === undefined
                ? Object.keys(frame.outputs)
                : [...selectedOutputIds]
              ).map((outputId) => [
                outputId,
                scalarAvailableOutputV3(frame.outputs[outputId]),
              ]),
            ),
          ),
        }),
      ),
    }),
  );
  if (diagnosticsEnabled) {
    recordWorkbenchPerformanceDurationV3(
      "presentation.frame-materialization",
      workbenchPerformanceNowV3() - startedAtMs,
    );
  }
  sampleStore.appendMany(entries);
}

function withoutRecordKeysV3<T>(
  record: Readonly<Record<string, T>>,
  keys: readonly string[],
): Readonly<Record<string, T>> {
  const removed = new Set(keys);
  if (!keys.some((key) => key in record)) return record;
  return Object.freeze(
    Object.fromEntries(
      Object.entries(record).filter(([candidate]) => !removed.has(candidate)),
    ),
  );
}

function remoteExperimentRecordV3(
  resource: StudioRemoteExperimentResourceV1,
): BrowserExperimentRecord {
  return Object.freeze({
    schemaId: BROWSER_EXPERIMENT_RECORD_SCHEMA_ID,
    experimentId: resource.experiment.experimentId,
    title: resource.title,
    createdAt: resource.createdAt,
    updatedAt: resource.updatedAt,
    publishedSnapshotId: resource.publishedSnapshotId,
    publicSlug: resource.publicSlug,
    publishedVersion: resource.publishedVersion ?? null,
    publishedAt: resource.publishedAt ?? null,
  });
}

function publicExperimentSlugV3(experimentId: string): string {
  return `simulation-${experimentId.toLocaleLowerCase()}`;
}

function workbenchAuthoringErrorMessageV3(error: unknown): string {
  // PostgREST returns structured errors rather than Error instances.
  return error !== null && typeof error === "object" && "message" in error && typeof error.message === "string"
    ? error.message
    : String(error);
}

function requiredWorkbenchSurfaceSeriesIdV3(value: string | undefined): string {
  if (value === undefined) {
    throw new Error("Workbench Standard Surface series is unavailable");
  }
  return value;
}

function requiredWorkbenchSurfaceReleaseIdV3(
  value: string | undefined,
): string {
  if (value === undefined) {
    throw new Error("Workbench Standard Surface release is unavailable");
  }
  return value;
}

function requiredWorkbenchReleaseTicketV3(
  value: StudioModelWorkerReleaseTicketV2 | undefined,
): StudioModelWorkerReleaseTicketV2 {
  if (value === undefined) {
    throw new Error("Workbench Standard Worker release ticket is unavailable");
  }
  return value;
}

function requiredWorkbenchFixtureProjectionV1(
  value: ExactModelFixtureProjectionV1 | null,
): ExactModelFixtureProjectionV1 {
  if (value === null) {
    throw new Error("Workbench exact fixture projection is unavailable");
  }
  return value;
}

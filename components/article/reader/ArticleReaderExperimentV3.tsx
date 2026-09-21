import React from "react";
import { ArticleReaderOutputDisclosureV3, type ArticleReaderOutputViewV3 } from "./ArticleReaderOutputDisclosureV3";
import { ArticleReaderPendingExperimentV1 } from "./ArticleReaderPendingExperimentV1";
import { articleBriefingInflowContentV3 } from "@/studio/application/authoring/StudioArticleBriefingPresentationV3";
import type { ArticleReaderPlaybackPreferenceV3 } from "./ArticleReaderLiveRuntimeV3";
import { selectPresentationAnalysisIdsV1, workbenchModelCyclePhaseOutputIdV3 } from "@/components/workbench/presentation/WorkbenchPresentationOutputSelectionV3";
import { CompletedEjectionWaveformV1 } from "@/components/workbench/presentation/CompletedEjectionWaveformV1";
import { createPortal } from "react-dom";
import type { ExperimentReaderPreviewV1 } from "@/studio/contracts/v2/readerPreview";
import { articleReaderSampledPresentationV1, useArticleReaderPreviewV1 } from "./useArticleReaderPreviewV1";
import {
  ChevronRight,
  MoreHorizontal,
  LoaderCircle,
  CircleAlert,
  Maximize2,
  Minimize2,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAppTheme } from "@/appTheme";
import { WorkbenchSimulationInfoV3 } from "@/components/workbench/WorkbenchSimulationInfoV3";
import { SimulationIconButtonV3 } from "@/components/ui/SimulationIconButtonV3";
import { SimulationLegendPlaceholderV1, SimulationPanePlaceholderV1 } from "@/components/simulation/SimulationPreparationV1";
import { WorkbenchChartLegendRowV3 } from "@/components/workbench/presentation/WorkbenchChartTraceStyleV3";
import type { StudioReaderContinuationV3 } from "@/studio/infrastructure/browser/StudioExperimentSessionHandoffV3";
import { modelDocumentationHref } from "@/homeLinks";
import { isLocale } from "@/localeRouting";
import { WorkbenchPlaybackControlV3 } from "@/components/workbench/WorkbenchPlaybackControlV3";
import type { StudioClientCompositionV2 } from "@/studio/composition/StudioDefaultCompositionV2";
import {
  resolveRegisteredModelDisclosureV1,
} from "@/studio/presentation/modelDocumentation/RegisteredModelDocumentationV1";

import {
  articleBriefingPresentationV3,
  resolveArticlePlacementBriefingV3,
  resolveArticlePlacementTitleV3,
} from "@/studio/application/article/ArticleExperimentPlacementV3";
import {
  isWorkbenchGraphTraceExcludedV3,
  resolveWorkbenchGraphScenarioIdsV3,
} from "@/components/workbench/WorkbenchSurfaceV3";
import {
  ExperimentGraphPresentationV3,
  ExperimentNumericControlV3,
  ExperimentObservationV3,
} from "@/components/workbench/ExperimentPanePresentationV3";
import {
  resolveWorkbenchControlPresentationV3,
  resolveWorkbenchGraphSeriesPresentationV3,
  resolveWorkbenchOutputPresentationV3,
} from "@/components/workbench/WorkbenchItemPresentation";
import {
  PressureVolumeLoopCanvasV3,
  SweepingWaveformCanvasV3,
  GuytonStarlingComparisonCanvasV3,
  resolveWorkbenchAutomaticGraphColorV3,
  resolveWorkbenchGraphTraceStyleV3,
  structuralReturnOrientationFromPayloadV3,
  useWorkbenchOptionalSampledGraphPresentationSamplesV3,
  useWorkbenchScenarioPresentationSamplesV3,
  type WorkbenchPressureVolumeTraceV3,
} from "@/components/workbench/presentation";
import { periodicPvaFromAnalysisV3 } from "@/components/workbench/presentation/WorkbenchPeriodicPvaProjectionV3";
import { mainWireFormalPvAnalysisIdV1 } from "@/analysis/methods/mainWire/MainWireStructuralAnalysisContractV3";
import {
  type MainWirePeriodicPvaV1,
} from "@/analysis/methods/mainWire/MainWirePeriodicPvaV1";
import {
  MAIN_WIRE_PERIODIC_PVA_ANALYSIS_OUTPUT_IDS_V1,
  MAIN_WIRE_PERIODIC_PVA_OUTPUT_IDS_V1,
} from "@/analysis/methods/mainWire/MainWireAnalysisMethodRegistryV1";
import type { StudioArticleExperimentBlockV2 } from "@/studio/contracts/v2/article";
import type {
  ExperimentPlacementBriefingControlV2,
  ExperimentPlacementBriefingGraphOverridesV2,
  ExperimentPlacementBriefingGraphSeriesV2,
  ExperimentPlacementBriefingGraphV2,
  ExperimentPlacementBriefingV2,
  ExperimentScenarioV2,
  ExperimentSnapshotV2,
  ExperimentSurfaceGraphPaneV2,
} from "@/studio/contracts/v2/content";
import type {
  ControlDefinitionV2,
  ModelContractV2,
  StructuralReturnGraphDefinitionV2,
  SweepGraphDefinitionV2,
} from "@/studio/contracts/v2/model";
import type { ExactModelFixtureProjectionV1 } from
  "@/studio/application/model/ExactModelFixtureProjectionV1";
import {
  resolveExactModelControlValueV1,
  type ExactModelResolvedControlValueV1,
} from
  "@/studio/application/model/ExactModelControlValuesV1";
import {
  articleReaderAnalysisKeyV3,
  type ArticleReaderStructuralAnalysisRequestV3,
} from "./ArticleReaderLiveRuntimeV3";
import { articleReaderPresentationOutputSelectionV3 } from "./ArticleReaderPresentationOutputSelectionV3";
import { type ArticleReaderSessionMemoryV3, useArticleReaderLiveRuntimeV3 } from "./useArticleReaderLiveRuntimeV3";
import {
  ArticleReaderObservationMemoryContextV3,
  ArticleReaderScenarioSelectorV3,
  ArticleReaderSectionsV3,
  ArticleReaderStageV3,
  ArticleReaderWorkbenchLayoutV3,
  createArticleReaderObservationMemoryV3,
  openArticleReaderToOperateV3,
  useArticleReaderObservationMemoryV3,
  type ArticleReaderEmbedLayoutV3,
  type ArticleReaderSectionV3,
} from "./ArticleReaderEmbedV3";
import {
  articleBriefingAnalysisRecomputeV3,
  articleBriefingViewsV3,
  type ArticleBriefingAnalysisRecomputeV3,
} from "@/studio/application/authoring/StudioArticleBriefingPresentationV3";
import {
  articleBriefingControlKeyV3,
  articleBriefingInitialOpenControlPaneIdsV3,
  articleBriefingOutputKeyV3,
  articleBriefingPrimaryControlKeysV3,
  articleBriefingPrimaryOutputKeysV3,
} from "@/studio/application/article/ArticleBriefingObservationV3";
import { workbenchScenarioColorSeedV3 } from "@/components/workbench/presentation/WorkbenchGraphColorV3";
import { articleReaderNeedsScenarioLabelsV3, articleReaderObservationGroupsV3, type ArticleReaderOutputItemV3 } from "./ArticleReaderObservationV3";

export type ArticleReaderExperimentV3Props = Readonly<{
  block: StudioArticleExperimentBlockV2;
  snapshot: ExperimentSnapshotV2 | null;
  contract: ModelContractV2 | null;
  contractAvailability?: "loading" | "ready" | "unavailable";
  runtimeComposition?: StudioClientCompositionV2 | null;
  live: boolean;
  readerPreview?: ExperimentReaderPreviewV1 | null;
  onViewportVisibilityChange?(visible: boolean): void;
  expandedPresentation: ArticleReaderExpandedPresentationV3 | null;
  peekPortalHost?: HTMLElement | null;
  peekMaximized?: boolean;
  forceInline?: boolean;
  onActivate(): void;
  onDeactivate(): void;
  onExpand(presentation: ArticleReaderExpandedPresentationV3): void;
  onClose(): void;
  onOpenExperimentSession?(continuation?: StudioReaderContinuationV3): void;
  onPeekMaximizedChange?(maximized: boolean): void;
  onTitleCommit?(title: string): void;
}>;

type ArticleReaderPresentationV3 = "inflow" | "peek" | "fullscreen";
const ARTICLE_READER_PERIODIC_PVA_OUTPUT_ID_SET_V3 = new Set<string>(
  MAIN_WIRE_PERIODIC_PVA_ANALYSIS_OUTPUT_IDS_V1,
);
export type ArticleReaderExpandedPresentationV3 = Exclude<
  ArticleReaderPresentationV3,
  "inflow"
>;

/**
 * Borderless article anchor. A started owner retains its exact reading session
 * until the article closes. Only the placement in the reading area advances;
 * paused owners keep measured analyses, conditions, and samples intact.
 */
export function ArticleReaderExperimentV3({
  block,
  snapshot,
  contract,
  contractAvailability = contract === null ? "unavailable" : "ready",
  runtimeComposition = null,
  readerPreview = null,
  live,
  expandedPresentation,
  peekPortalHost = null,
  peekMaximized = false,
  forceInline = false,
  onActivate,
  onDeactivate,
  onViewportVisibilityChange,
  onExpand,
  onClose,
  onOpenExperimentSession,
  onPeekMaximizedChange,
  onTitleCommit,
}: ArticleReaderExperimentV3Props) {
  const { t } = useTranslation();
  const rootRef = React.useRef<HTMLElement>(null);
  const onActivateRef = React.useRef(onActivate);
  const onDeactivateRef = React.useRef(onDeactivate);
  const viewportVisibilityRef = React.useRef(onViewportVisibilityChange);
  viewportVisibilityRef.current = onViewportVisibilityChange;
  // Keep this reading session and its measured analyses while the article is
  // open. Briefly offscreen owners pause; distant owners park at an exact checkpoint.
  const [started, setStarted] = React.useState(false);
  React.useEffect(() => { if (live) setStarted(true); }, [live]);
  const inlinePresentation = forceInline || articleBriefingPresentationV3(block.placement.briefing) === "inflow";
  const [restartGeneration, setRestartGeneration] = React.useState(0);
  // The reader's observation (selected graph, observed outputs, open
  // reference) follows the placement through inline, Peek, sheet and full.
  const observationMemory = React.useMemo(createArticleReaderObservationMemoryV3, [snapshot?.snapshotId, restartGeneration]);
  const playbackPreference = React.useMemo(() => ({ current: { playing: true, rate: 1 } }), [snapshot?.snapshotId, restartGeneration]);
  const sessionMemory = React.useMemo<ArticleReaderSessionMemoryV3>(() => ({ pending: null, error: null }), [snapshot?.snapshotId, restartGeneration]);
  const [inlineHeight, setInlineHeight] = React.useState(0);
  const previousExpanded = React.useRef(expandedPresentation);
  React.useEffect(() => {
    const closed = previousExpanded.current !== null && expandedPresentation === null;
    previousExpanded.current = expandedPresentation;
    if (!closed) return;
    const frame = requestAnimationFrame(() => {
      const root = rootRef.current;
      (root?.querySelector<HTMLElement>("[data-reader-return-focus]") ?? root?.querySelector<HTMLElement>("button"))?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [expandedPresentation]);

  React.useEffect(() => {
    const root = rootRef.current;
    if (!root || !inlinePresentation || !live || expandedPresentation !== null) return;
    const measure = () => setInlineHeight(root.getBoundingClientRect().height);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    return () => observer.disconnect();
  }, [inlinePresentation, live, expandedPresentation]);

  React.useEffect(() => {
    onActivateRef.current = onActivate;
    onDeactivateRef.current = onDeactivate;
  }, [onActivate, onDeactivate]);

  React.useEffect(() => {
    const element = rootRef.current;
    if (element === null || !inlinePresentation) return undefined;
    if (typeof IntersectionObserver === "undefined") {
      if (viewportVisibilityRef.current) viewportVisibilityRef.current(true);
      else onActivateRef.current();
      return () => viewportVisibilityRef.current ? viewportVisibilityRef.current(false) : onDeactivateRef.current();
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (viewportVisibilityRef.current) {
          viewportVisibilityRef.current(entries.some(entry => entry.isIntersecting));
        } else if (entries.some((entry) => entry.isIntersecting)) {
          onActivateRef.current();
        } else {
          onDeactivateRef.current();
        }
      },
      {
        rootMargin: "0px",
        threshold: 0,
      },
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
      if (viewportVisibilityRef.current) viewportVisibilityRef.current(false);
      else onDeactivateRef.current();
    };
  }, [inlinePresentation]);

  if (snapshot === null) {
    return (
      <section
        ref={rootRef}
        id={`placement-${block.placement.placementId}`}
        className="my-12"
        data-reader-placement-id={block.placement.placementId}
      >
        <p
          className="flex items-center gap-2 text-sm text-wb-danger"
          role="alert"
        >
          <CircleAlert className="h-4 w-4" aria-hidden="true" />
          {t("articleReader.unavailableSnapshot")}
        </p>
      </section>
    );
  }

  let briefing: ExperimentPlacementBriefingV2;
  try {
    briefing = resolveArticlePlacementBriefingV3(block.placement, snapshot);
  } catch {
    return (
      <section
        ref={rootRef}
        id={`placement-${block.placement.placementId}`}
        className="my-12"
        data-reader-placement-id={block.placement.placementId}
      >
        <p
          className="flex items-center gap-2 text-sm text-wb-danger"
          role="alert"
        >
          <CircleAlert className="h-4 w-4" aria-hidden="true" />
          {t("articleReader.invalidBriefing")}
        </p>
      </section>
    );
  }
  const presentation = articleBriefingPresentationV3(briefing);
  const title = resolveArticlePlacementTitleV3(block.placement, briefing);

  return (
    <section
      ref={rootRef}
      id={`placement-${block.placement.placementId}`}
      className={`article-reader-placement my-12 min-w-0 scroll-mt-24 ${
        presentation === "inflow" ? "article-reader-inflow-placement" : ""
      }`}
      data-reader-placement-id={block.placement.placementId}
      data-reader-placement-live={live}
      data-reader-presentation={forceInline ? undefined : presentation}
      onPointerDownCapture={() => { if (inlinePresentation) onActivate(); }}
      onFocusCapture={() => { if (inlinePresentation) onActivate(); }}
      style={inlinePresentation && !live && inlineHeight > 0 ? { minHeight: inlineHeight } : undefined}
    >
      {(live || started || (readerPreview !== null && inlinePresentation)) && contract !== null ? (
        <ArticleReaderObservationMemoryContextV3.Provider value={observationMemory}>
          <ArticleReaderLiveOwnerV3
            active={live}
            startRuntime={live || started}
            readerPreview={readerPreview}
            key={restartGeneration}
            onRestart={() => setRestartGeneration(value => value + 1)}
            briefing={briefing}
            contract={contract}
            runtimeComposition={runtimeComposition}
            playbackPreference={playbackPreference}
            sessionMemory={sessionMemory}
            expandedPresentation={expandedPresentation}
            forceInline={forceInline}
            peekPortalHost={peekPortalHost}
            peekMaximized={peekMaximized}
            presentation={presentation}
            snapshot={snapshot}
            title={title}
            onTitleCommit={onTitleCommit}
            onExpand={onExpand}
            onClose={onClose}
            onOpenExperimentSession={onOpenExperimentSession}
            onPeekMaximizedChange={onPeekMaximizedChange}
          />
        </ArticleReaderObservationMemoryContextV3.Provider>
      ) : (
        <ArticleReaderStaticExperimentV3
          availability={contractAvailability}
          presentation={presentation}
          title={title}
          onActivate={onActivate}
          onOpen={() => {
            onExpand(presentation === "fullscreen" ? "fullscreen" : "peek");
          }}
        />
      )}

      {block.placement.caption !== null &&
        block.placement.caption.trim().length > 0 && (
          <p className="article-experiment-caption">
            {block.placement.caption}
          </p>
        )}
    </section>
  );
}

function ArticleReaderStaticExperimentV3({
  availability,
  presentation,
  title,
  onActivate,
  onOpen,
}: Readonly<{
  availability: "loading" | "ready" | "unavailable";
  presentation: ArticleReaderPresentationV3;
  title: string;
  onActivate(): void;
  onOpen(): void;
}>) {
  const { t } = useTranslation();
  if (availability === "loading") {
    return <ArticleReaderPendingExperimentV1 title={title} preparing />;
  }
  if (availability === "unavailable") {
    return (
      <div className="py-5" data-reader-model-unavailable="true">
        <p className="text-sm font-semibold tracking-tight text-wb-text">{title}</p>
        <p className="mt-2 text-xs leading-5 text-wb-subtle">{t("articleReader.unavailableModel")}</p>
      </div>
    );
  }
  if (presentation !== "inflow") {
    return <ArticleReaderPeekAnchorV3 presentation={presentation} title={title} onOpen={onOpen} />;
  }
  return <ArticleReaderPendingExperimentV1 title={title} preparing={false} onShow={onActivate} />;
}

function ArticleReaderLiveOwnerV3({
  active,
  startRuntime,
  readerPreview,
  onRestart,
  briefing,
  contract,
  runtimeComposition,
  playbackPreference,
  sessionMemory,
  expandedPresentation,
  forceInline,
  peekPortalHost,
  peekMaximized,
  presentation,
  snapshot,
  title,
  onExpand,
  onClose,
  onOpenExperimentSession,
  onPeekMaximizedChange,
  onTitleCommit,
}: Readonly<{
  active: boolean;
  startRuntime: boolean;
  readerPreview: ExperimentReaderPreviewV1 | null;
  onRestart(): void;
  briefing: ExperimentPlacementBriefingV2;
  contract: ModelContractV2;
  runtimeComposition: StudioClientCompositionV2 | null;
  playbackPreference: { current: ArticleReaderPlaybackPreferenceV3 };
  sessionMemory: ArticleReaderSessionMemoryV3;
  expandedPresentation: ArticleReaderExpandedPresentationV3 | null;
  forceInline: boolean;
  peekPortalHost: HTMLElement | null;
  peekMaximized: boolean;
  presentation: ArticleReaderPresentationV3;
  snapshot: ExperimentSnapshotV2;
  title: string;
  onExpand(presentation: ArticleReaderExpandedPresentationV3): void;
  onClose(): void;
  onOpenExperimentSession?(continuation?: StudioReaderContinuationV3): void;
  onPeekMaximizedChange?(maximized: boolean): void;
  onTitleCommit?(title: string): void;
}>) {
  const { t } = useTranslation();
  const narrow = useReaderNarrowScreenV3();
  const structuralAnalyses = readerStructuralAnalysisRequestsV3(
    briefing,
    snapshot,
    contract,
    mainWireFormalPvAnalysisIdV1(runtimeComposition?.modelSurface.analysis.periodicPvaDerivation),
  );
  const presentationOutputIds = React.useMemo(
    () =>
      articleReaderPresentationOutputSelectionV3(contract, snapshot, briefing,
        runtimeComposition === null ? undefined : new Set(runtimeComposition.modelSurface.catalog.exposedExactOutputIds)),
    [briefing, contract, snapshot, runtimeComposition],
  );
  const presentationAnalysisIds = React.useMemo(() => runtimeComposition === null ? []
    : selectPresentationAnalysisIdsV1(briefing.outputs.map(output => output.outputId),
      runtimeComposition.modelSurface.catalog, runtimeComposition.modelSurface.analysis.presentationMethods,
      snapshot.content.surface.graphPanes.filter(pane => briefing.graphs.some(g => g.paneId === pane.paneId)).map(pane => pane.graphId)),
  [briefing, runtimeComposition, snapshot]);
  const liveRuntime = useArticleReaderLiveRuntimeV3(
    snapshot,
    requiredArticleReaderRuntimeCompositionV3(runtimeComposition),
    briefing.scenarioScope.initialFocusScenarioId,
    briefing.scenarioScope.visibleScenarioIds,
    structuralAnalyses,
    presentationOutputIds,
    presentationAnalysisIds,
    active && (forceInline || presentation === "inflow" || expandedPresentation !== null),
    playbackPreference,
    sessionMemory,
    workbenchModelCyclePhaseOutputIdV3(contract),
    Math.max(0, ...briefing.graphs.map(graph => graph.overrides?.windowSec
      ?? snapshot.content.surface.graphPanes.find(pane => pane.paneId === graph.paneId)?.windowSec ?? 0)),
    startRuntime,
  );
  const runtime = useArticleReaderPreviewV1(liveRuntime, snapshot, sessionMemory.pending === null ? readerPreview : null,
    workbenchModelCyclePhaseOutputIdV3(contract), presentationAnalysisIds);
  const inline = (forceInline || presentation === "inflow") && expandedPresentation === null;
  const readingBriefing = inline && !forceInline ? articleBriefingInflowContentV3(briefing) : briefing;
  const analysisRecompute = articleBriefingAnalysisRecomputeV3(briefing);
  const [handoffPending, setHandoffPending] = React.useState(false);
  const [handoffError, setHandoffError] = React.useState<string | null>(null);
  const openWorkbench = onOpenExperimentSession === undefined ? undefined : async () => {
    setHandoffPending(true); setHandoffError(null);
    try { onOpenExperimentSession(await runtime.captureContinuation()); }
    catch { setHandoffError(t("articleReader.handoffFailed")); }
    finally { setHandoffPending(false); }
  };
  const toolbar = <ArticleReaderExperimentToolbarV3 runtime={runtime} contract={contract} snapshot={snapshot} />;
  React.useEffect(() => {
    if (expandedPresentation === null) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      if (peekMaximized && onPeekMaximizedChange !== undefined) {
        onPeekMaximizedChange(false);
        return;
      }
      onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [expandedPresentation, onClose, onPeekMaximizedChange, peekMaximized]);

  if (expandedPresentation === null) {
    if (forceInline || presentation === "inflow") {
      // Inline is the author's first screen: title, stage, primary observation
      // and primary controls at every width. Playback pace, model disclosure
      // and the rest of the sealed content wait until the reader opens the panel.
      return (
        <ArticleReaderEmbedSurfaceV3
          layout="inline"
          analysisRecompute={analysisRecompute}
          briefing={readingBriefing}
          contract={contract}
          runtime={runtime}
          snapshot={snapshot}
          onRestart={onRestart}
          onOpen={forceInline ? undefined : () => onExpand("peek")}
          header={
            <div className="article-reader-inflow-header">
              <p className="reader-experiment-title min-w-0 flex-1">{title}</p>
              {!forceInline && (
                <button type="button" className="article-reader-open"
                  aria-label={`${title}：${t("articleReader.open")}`}
                  title={t(narrow ? "articleReader.openMobile" : "articleReader.openBeside")}
                  onClick={() => onExpand("peek")}
                  data-reader-return-focus
                  data-reader-open-details
                >
                  {t("articleReader.open")}
                  <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              )}
            </div>
          }
        />
      );
    }
    return (
      <ArticleReaderPeekAnchorV3
        presentation={presentation}
        title={title}
        onOpen={() =>
          onExpand(presentation === "fullscreen" ? "fullscreen" : "peek")
        }
      />
    );
  }
  if (typeof document === "undefined" || peekPortalHost === null) return null;
  // One panel serves every opened form. Phones read it as a full-screen sheet
  // (the smartphone Workbench shell); a maximized desktop panel uses the
  // Workbench area arrangement; otherwise it sits beside the Article.
  const layout: ArticleReaderEmbedLayoutV3 = narrow ? "sheet" : peekMaximized ? "workbench" : "peek";
  return (
    <>
      <ArticleReaderPeekAnchorV3
        active
        presentation={presentation === "fullscreen" ? "fullscreen" : "peek"}
        title={title}
        onOpen={onClose}
      />
      {createPortal(
        <ArticleReaderExperimentPeekPanelV3
          maximized={peekMaximized}
          title={title}
          onClose={onClose}
          onOpenExperimentSession={openWorkbench}
          toolbar={toolbar}
          handoffPending={handoffPending}
          onToggleMaximized={
            onPeekMaximizedChange === undefined
              ? undefined
              : () => onPeekMaximizedChange(!peekMaximized)
          }
          onTitleCommit={onTitleCommit}
        >
          {handoffError && <p role="alert" className="px-4 text-sm text-wb-danger">{handoffError}</p>}
          <ArticleReaderEmbedSurfaceV3
            layout={layout}
            analysisRecompute={analysisRecompute}
            briefing={briefing}
            contract={contract}
            runtime={runtime}
            snapshot={snapshot}
            onRestart={onRestart}
          />
        </ArticleReaderExperimentPeekPanelV3>,
        peekPortalHost,
      )}
    </>
  );
}

// Match the Workbench phone shell on wide, short touch screens as well.
const READER_SHEET_QUERY_V3 =
  "(max-width: 899px), ((pointer: coarse) and (max-width: 1023px) and (max-height: 520px))";

function useReaderNarrowScreenV3() {
  const [narrow, setNarrow] = React.useState(false);
  React.useEffect(() => {
    const media = window.matchMedia(READER_SHEET_QUERY_V3);
    const update = () => setNarrow(media.matches);
    update(); media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return narrow;
}

function ArticleReaderPeekAnchorV3({ active = false, title, onOpen }: Readonly<{
  active?: boolean;
  presentation: ArticleReaderPresentationV3;
  title: string;
  onOpen(): void;
}>) {
  const { t } = useTranslation();
  const narrow = useReaderNarrowScreenV3();
  return <button type="button" onClick={onOpen}
    className="article-reader-peek-anchor flex w-full items-center gap-3 rounded-xl border border-wb-line px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wb-accent"
    data-reader-peek-active={active} data-reader-return-focus
    aria-expanded={active} aria-controls={active ? "article-reader-experiment-companion-v3" : undefined}
    title={t(active ? "articleReader.returnInline" : narrow ? "articleReader.openMobile" : "articleReader.openBeside")}
    aria-label={`${title}：${t(active ? "common.close" : "articleReader.open")}`}>
    <span className="reader-experiment-title min-w-0 flex-1">{title}</span>
    <span className="article-reader-peek-action" aria-hidden="true">
      {t(active ? "common.close" : "articleReader.open")}
      {active ? <X className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
    </span>
  </button>;
}

type ArticleReaderRuntimeHookV3 = ReturnType<
  typeof useArticleReaderLiveRuntimeV3
>;

function ArticleReaderExperimentToolbarV3({ runtime, contract, snapshot }: Readonly<{
  runtime: ArticleReaderRuntimeHookV3; contract: ModelContractV2; snapshot: ExperimentSnapshotV2;
}>) {
  const { i18n, t } = useTranslation();
  const modelDisclosure = resolveRegisteredModelDisclosureV1(
    contract.modelId,
    snapshot.surfaceReleaseId,
  );
  const documentation = modelDisclosure.documentation;
  const language = (i18n.resolvedLanguage ?? i18n.language)
    .toLowerCase()
    .split("-")[0];
  const documentationHref = documentation === null
    ? undefined
    : modelDocumentationHref({
        locale: isLocale(language) ? language : undefined,
        modelId: documentation.modelId,
        surfaceReleaseId: documentation.surfaceReleaseId,
        documentId: documentation.documentId,
      });
  const modelLimitations = t(modelDisclosure.limitationsTranslationKey, {
    returnObjects: true,
  }) as string[];
  const unavailable = ["idle", "starting", "failed", "disposed"].includes(runtime.state.status);
  const busy = ["idle", "starting", "applying-control"].includes(runtime.state.status);
  return <div className="flex shrink-0 items-center gap-0.5" data-reader-toolbar>
    {busy && <span role="status" aria-label={t("articleReader.preparingSimulation")}><LoaderCircle className="h-3.5 w-3.5 animate-spin text-wb-subtle" aria-hidden="true" /></span>}
    <WorkbenchPlaybackControlV3 disabled={unavailable || busy} playing={runtime.state.status === "playing"}
      rate={runtime.state.playbackRate} onPlaybackToggle={() => runtime.state.status === "playing" ? void runtime.pause() : runtime.play()}
      onRateChange={runtime.setPlaybackRate} />
    <WorkbenchSimulationInfoV3 currentModelId={contract.modelId} initialTab="model" showStatus={false}
      limitations={modelLimitations} scenarios={[]} models={[{
        contract, publicName: modelDisclosure.badgeLabel, shortLabel: modelDisclosure.badgeLabel,
        description: "", documentationHref,
      }]} />
  </div>;
}

/**
 * The one reading surface behind every extent: a graph stage (sealed views,
 * one or two graphs at a time), the observation (outputs kept beside the
 * graph), then the author's primary controls (inline) or sealed controllers
 * by pane in an opened form. Opened outputs expand in one measurement area. `layout` changes density and scroll ownership;
 * view memory follows opened forms; the Article column always reads the
 * author's first screen.
 */
export function ArticleReaderEmbedSurfaceV3({
  analysisRecompute,
  briefing,
  contract,
  header,
  layout,
  onOpen,
  onRestart,
  runtime,
  snapshot,
}: Readonly<{
  analysisRecompute: ArticleBriefingAnalysisRecomputeV3;
  briefing: ExperimentPlacementBriefingV2;
  contract: ModelContractV2;
  header?: React.ReactNode;
  layout: ArticleReaderEmbedLayoutV3;
  /** Opens the panel; an inline instrument without primary controls offers it beneath the graph. */
  onOpen?(): void;
  onRestart?(): void;
  runtime: ArticleReaderRuntimeHookV3;
  snapshot: ExperimentSnapshotV2;
}>) {
  const { t, i18n } = useTranslation();
  const { appTheme } = useAppTheme();
  const memory = useArticleReaderObservationMemoryV3();
  // The selection is a pane, not a view index: pairs split and rejoin with width.
  const [activePaneId, setActivePaneIdState] = React.useState<string | null>(memory.activePaneId);
  const setActivePaneId = (paneId: string) => { memory.activePaneId = paneId; setActivePaneIdState(paneId); };
  const [outputView, setOutputViewState] = React.useState<ArticleReaderOutputViewV3 | null>(memory.outputView);
  const setOutputView = (view: ArticleReaderOutputViewV3 | null) => { memory.outputView = view; setOutputViewState(view); };
  const [spaceForAllControls, setSpaceForAllControls] = React.useState(false);
  const [collapsedSelection, setCollapsedSelectionState] = React.useState<readonly string[] | null>(memory.collapsedControlPaneIds);
  const setCollapsedSelection = (paneIds: readonly string[]) => { memory.collapsedControlPaneIds = paneIds; setCollapsedSelectionState(paneIds); };
  const views = React.useMemo(() => articleBriefingViewsV3(briefing), [briefing]);
  const graphs = [...briefing.graphs].sort(compareOrderV3);
  const labelForPane = (paneId: string) => {
    const graph = graphs.find((candidate) => candidate.paneId === paneId);
    return graph === undefined ? paneId : resolveArticleReaderGraphPresentationV3(snapshot, graph)?.label ?? paneId;
  };
  const scenarioColor = (scenarioId: string) => articleReaderScenarioColorV3(snapshot, scenarioId, appTheme);
  const analysisAutoScenarioIds = React.useMemo(() => new Set(
    analysisRecompute === "automatic"
      ? briefing.scenarioScope.visibleScenarioIds
      : briefing.scenarioScope.visibleScenarioIds.filter((scenarioId) => !runtime.state.changedScenarioIds.includes(scenarioId)),
  ), [analysisRecompute, briefing.scenarioScope.visibleScenarioIds, runtime.state.changedScenarioIds]);
  const renderGraph = (paneId: string) => {
    const graph = graphs.find((candidate) => candidate.paneId === paneId);
    if (graph === undefined) return null;
    return (
      <ArticleReaderLiveGraphViewportV3
        key={graph.paneId}
        className="min-w-0"
        activeScenarioId={runtime.state.activeScenarioId}
        analysisAutoScenarioIds={analysisAutoScenarioIds}
        briefing={graph}
        contract={contract}
        inline={layout === "inline"}
        playbackRunning={runtime.state.status === "playing"}
        runtime={runtime}
        snapshot={snapshot}
        visibleScenarioIds={briefing.scenarioScope.visibleScenarioIds}
      />
    );
  };
  const status = (
    <ArticleReaderAnalysisStatusV3
      analysisAutoScenarioIds={analysisAutoScenarioIds}
      briefing={briefing}
      contract={contract}
      runtime={runtime}
      snapshot={snapshot}
    />
  );
  const scenarioLabels = Object.fromEntries(snapshot.content.scenarios.map(scenario => [scenario.scenarioId, scenario.label]));
  const inline = layout === "inline";
  const authoredKeys = articleBriefingPrimaryOutputKeysV3(briefing);
  // The author defines the primary set; opened forms may reveal the rest.
  const observedKeys = authoredKeys;
  const primaryControlKeys = new Set(articleBriefingPrimaryControlKeysV3(briefing));
  const primaryControls = briefing.controls.filter((control) => primaryControlKeys.has(articleBriefingControlKeyV3(control)));
  const controlPaneIds = [...new Set([...briefing.controls].sort(compareOrderV3).map(({ sourcePaneId }) => sourcePaneId))];
  const initialOpenPaneIds = new Set(articleBriefingInitialOpenControlPaneIdsV3(briefing));
  const showAllControlPanes = layout === "workbench" || (layout === "peek" && spaceForAllControls);
  const collapsedPaneIds = new Set(collapsedSelection ?? (showAllControlPanes ? [] : controlPaneIds.filter((paneId) => !initialOpenPaneIds.has(paneId))));
  const togglePane = (paneId: string) => setCollapsedSelection(collapsedPaneIds.has(paneId)
    ? [...collapsedPaneIds].filter((candidate) => candidate !== paneId)
    : [...collapsedPaneIds, paneId]);
  const singlePv = graphs.length === 1 && contract.graphCatalog.find(graph => graph.graphId === snapshot.content.surface.graphPanes.find(pane => pane.paneId === graphs[0]?.paneId)?.graphId)?.renderer === "pressure-volume";
  const controlProps = { briefing, contract, runtime, scenarioColor, snapshot } as const;
  useArticleReaderOutputAnalysisRequestsV3(briefing, runtime);
  const observation = observedKeys.length > 0 ? (
    <ArticleReaderObservationV3
      briefing={briefing}
      contract={contract}
      runtime={runtime}
      observedKeys={observedKeys}
      scenarioColor={scenarioColor}
      scenarioLabels={scenarioLabels}
      snapshot={snapshot}
    />
  ) : null;
  const rootProps = {
    "data-reader-runtime-status": runtime.state.status,
    "data-reader-playback-rate": runtime.state.playbackRate.playbackRate,
    "data-reader-layout": layout,
    "data-reader-analysis-recompute": analysisRecompute,
    "data-reader-observed-count": observedKeys.length,
    className: `article-reader-embed min-w-0 ${inline ? "article-reader-inflow" : "article-reader-live"}`,
  } as const;

  if (runtime.state.status === "failed") {
    return (
      <div {...rootProps}>
        {header}
        <div className="my-8 space-y-3 px-3">
          <p className="text-sm text-wb-danger" role="alert">{runtime.state.error?.message ?? t("articleReader.failed")}</p>
          {onRestart && <button type="button" onClick={onRestart} className="rounded-lg border border-wb-line px-3 py-2 text-sm hover:bg-wb-hover focus-visible:ring-2 focus-visible:ring-wb-accent">{t("articleReader.restartSavedState")}</button>}
        </div>
      </div>
    );
  }
  if (graphs.length === 0 && briefing.controls.length === 0 && briefing.outputs.length === 0) {
    return <div {...rootProps}>{header}<p className="py-12 text-sm text-wb-subtle">{t("articleReader.noGraphs")}</p></div>;
  }
  if (inline) {
    // Inline is the author's first screen: graph, primary observation, primary
    // controls. Nothing folds here; the header button opens the rest. When no
    // controller is primary but some are sealed, one row says where they are.
    const controls = primaryControls.length > 0 ? (
      <ArticleReaderControlsV3 {...controlProps} controls={primaryControls} />
    ) : null;
    const openToOperate = primaryControls.length === 0 && briefing.controls.length > 0 && onOpen !== undefined ? (
      <button type="button" className="article-reader-open-operate" onClick={() => openArticleReaderToOperateV3(memory, onOpen)} data-reader-open-operate>
        {t("articleReader.openToOperate")}
        <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    ) : null;
    const stage = graphs.length === 0 ? status : (
      <ArticleReaderStageV3
        layout={layout}
        views={views}
        activePaneId={activePaneId}
        onActivePaneChange={setActivePaneId}
        labelForPane={labelForPane}
        renderGraph={renderGraph}
        status={status}
      />
    );
    return (
      <div {...rootProps}>
        {header}
        {/* Graph above, values beneath, controls last, at every width: one
            column reads the same on a phone and in a wide article. */}
        <div className="article-reader-inline-figure" data-reader-single-graph={singlePv ? "pressure-volume" : undefined}>
          {stage}
          <div className="article-reader-deck">{observation}{controls}{openToOperate}</div>
        </div>
      </div>
    );
  }
  // A single measurement area reveals the author-sealed values in place.
  // Controllers stay available while readers expand or fold the values.
  const controlsNode = briefing.controls.length > 0 ? (
    <ArticleReaderControlsV3
      {...controlProps}
      controls={briefing.controls}
      collapsedPaneIds={collapsedPaneIds}
      onTogglePane={togglePane}
    />
  ) : null;
  const outputGroups = articleReaderObservationGroupsV3([...briefing.outputs].sort(compareOrderV3).map(output => ({
    itemId: articleBriefingOutputKeyV3(output), outputId: output.outputId,
    sourcePaneId: output.sourcePaneId, scenarioId: output.scenarioId,
    label: resolveWorkbenchOutputPresentationV3({ locale: i18n.language.startsWith("ja") ? "ja" : "en",
      outputId: output.outputId, storedLabel: output.label }).label,
    unit: contract.outputCatalog.find(candidate => candidate.outputId === output.outputId)?.unit ?? "",
    value: null,
  })), {
    multiScenario: articleReaderNeedsScenarioLabelsV3(briefing),
    paneLabel: paneId => snapshot.content.surface.outputPanes.find(pane => pane.paneId === paneId)?.label?.trim() || undefined,
    scenarioLabel: scenarioId => scenarioLabels[scenarioId] ?? scenarioId,
    scenarioColor,
    genericTitles: [t("articleReader.outputs"), t("workbench.live.mobilePaneAreas.output")],
  });
  const outputsNode = <ArticleReaderOutputDisclosureV3
    groups={outputGroups} layout={layout} primaryKeys={authoredKeys} view={outputView}
    onViewChange={setOutputView}
    fullControlsHeight={briefing.controls.length * 64 + controlPaneIds.length * 40}
    onSpaceForAllControls={setSpaceForAllControls}
    renderOutputs={keys => <ArticleReaderObservationV3 briefing={briefing} contract={contract} runtime={runtime}
      observedKeys={keys} scenarioColor={scenarioColor} scenarioLabels={scenarioLabels} snapshot={snapshot} />}
  />;
  if (layout === "workbench") {
    return (
      <div {...rootProps}>
        <ArticleReaderWorkbenchLayoutV3
          graphs={graphs.map((graph) => ({ paneId: graph.paneId, node: renderGraph(graph.paneId) }))}
          outputs={outputsNode}
          controls={controlsNode}
          status={status}
        />
      </div>
    );
  }
  const stage = graphs.length === 0 ? status : (
    <ArticleReaderStageV3
      layout={layout}
      views={views}
      activePaneId={activePaneId}
      onActivePaneChange={setActivePaneId}
      labelForPane={labelForPane}
      renderGraph={renderGraph}
      status={status}
    />
  );
  // Revealing more measurements never replaces the controllers.
  return (
    <div {...rootProps}>
      {stage}
      {outputsNode}
      {controlsNode && <div className="article-reader-deck" data-reader-deck>
        <div className="article-reader-deck-panel" role="region" aria-label={t("articleReader.controls")}>
          <div className="article-reader-controls-content">{controlsNode}</div>
        </div>
      </div>}
    </div>
  );
}

/**
 * Surface-pinned outputs (PVA energetics) read a settled analysis. Missing
 * measurements of the sealed state are requested once; changed Scenarios wait
 * for the reader's request unless the Placement re-measures automatically.
 */
function useArticleReaderOutputAnalysisRequestsV3(
  briefing: ExperimentPlacementBriefingV2,
  runtime: ArticleReaderRuntimeHookV3,
): void {
  const analysisScenarioIds = React.useMemo(
    () => Object.freeze([...new Set(briefing.outputs.flatMap(({ outputId, scenarioId }) =>
      ARTICLE_READER_PERIODIC_PVA_OUTPUT_ID_SET_V3.has(outputId) ? [scenarioId] : []))]),
    [briefing.outputs],
  );
  const analysisId = mainWireFormalPvAnalysisIdV1(runtime.periodicPvaDerivation);
  const automatic = articleBriefingAnalysisRecomputeV3(briefing) === "automatic";
  const missingScenarioIds = analysisScenarioIds.filter((scenarioId) => {
    if (runtime.state.changedScenarioIds.includes(scenarioId) && !automatic) return false;
    const key = articleReaderAnalysisKeyV3(scenarioId, analysisId);
    return runtime.state.analysisByKey[key] === undefined
      && runtime.state.analysisErrorByKey[key] === undefined
      && !runtime.state.pendingAnalysisKeys.includes(key);
  });
  const missingKey = JSON.stringify(missingScenarioIds);
  const canRequest = runtime.state.status === "playing" || runtime.state.status === "paused";
  React.useEffect(() => {
    if (!canRequest || missingScenarioIds.length === 0) return;
    void runtime.requestAnalysis({ analysisId, scenarioIds: missingScenarioIds }).catch(() => {
      // Per-Scenario errors are rendered as unavailable outputs.
    });
  }, [analysisId, canRequest, missingKey, runtime.requestAnalysis]);
}

/**
 * The observation: outputs the reader keeps beside the graph, grouped by
 * source pane and sealed Scenario. The group heading names the pane once and
 * its Scenario when several are open; tiles keep to label and value.
 * An omitted selection reads all sealed outputs in the same component.
 * Values never also appear in a second picker or observation copy.
 */
export function ArticleReaderObservationV3({
  briefing,
  contract,
  observedKeys,
  runtime,
  sampleStore,
  scenarioColor,
  scenarioLabels,
  snapshot,
}: Readonly<{
  briefing: ExperimentPlacementBriefingV2;
  contract: ModelContractV2;
  observedKeys?: readonly string[];
  runtime?: ArticleReaderRuntimeHookV3;
  sampleStore?: ArticleReaderRuntimeHookV3["sampleStore"];
  scenarioColor?: (scenarioId: string) => string;
  scenarioLabels?: Readonly<Record<string, string>>;
  /** Source pane labels become group headings when provided. */
  snapshot?: Pick<ExperimentSnapshotV2, "content">;
}>) {
  const { t } = useTranslation();
  const observed = new Set(observedKeys ?? briefing.outputs.map(articleBriefingOutputKeyV3));
  const outputs = briefing.outputs.filter((output) => observed.has(articleBriefingOutputKeyV3(output)));
  const items = useArticleReaderOutputItemsV3(outputs, contract, runtime, sampleStore);
  const groups = articleReaderObservationGroupsV3(items, {
    multiScenario: articleReaderNeedsScenarioLabelsV3(briefing),
    paneLabel: (paneId) => snapshot?.content.surface.outputPanes.find((pane) => pane.paneId === paneId)?.label?.trim() || undefined,
    scenarioLabel: (scenarioId) => scenarioLabels?.[scenarioId] ?? scenarioId,
    scenarioColor: (scenarioId) => scenarioColor?.(scenarioId) ?? "#64748b",
    genericTitles: [t("articleReader.outputs"), t("workbench.live.mobilePaneAreas.output")],
  });
  if (items.length === 0) return null;
  return (
    <ExperimentObservationV3
      className="article-reader-observation"
      groups={groups}
      label={t("articleReader.observation")}
      data-reader-observation
      data-reader-observed-count={items.length}
    />
  );
}

/** Live values for sealed outputs, keyed by their Article-local identity. */
function useArticleReaderOutputItemsV3(
  outputs: readonly ExperimentPlacementBriefingV2["outputs"][number][],
  contract: ModelContractV2,
  runtime: ArticleReaderRuntimeHookV3 | undefined,
  sampleStore: ArticleReaderRuntimeHookV3["sampleStore"] | undefined,
): readonly ArticleReaderOutputItemV3[] {
  const { i18n } = useTranslation();
  const locale = i18n.language.startsWith("ja") ? "ja" : "en";
  const ownedSampleStore = runtime?.sampleStore ?? sampleStore;
  if (ownedSampleStore === undefined) {
    throw new Error("Article Reader outputs require a sample store");
  }
  const samples = useWorkbenchScenarioPresentationSamplesV3(ownedSampleStore);
  const analysisId = mainWireFormalPvAnalysisIdV1(runtime?.periodicPvaDerivation);
  return [...outputs].sort(compareOrderV3).map((output): ArticleReaderOutputItemV3 => {
    const definition = contract.outputCatalog.find(
      ({ outputId }) => outputId === output.outputId,
    );
    const latest = samples[output.scenarioId]?.at(-1);
    const analysisKey = articleReaderAnalysisKeyV3(output.scenarioId, analysisId);
    const periodicPva =
      runtime !== undefined &&
      ARTICLE_READER_PERIODIC_PVA_OUTPUT_ID_SET_V3.has(output.outputId)
        ? periodicPvaFromAnalysisV3(
            runtime.state.analysisByKey[analysisKey],
            "left",
            runtime.periodicPvaDerivation,
          )
        : undefined;
    const presentationOutput = runtime?.presentationOutput?.(output.scenarioId, output.outputId);
    const value = ARTICLE_READER_PERIODIC_PVA_OUTPUT_ID_SET_V3.has(output.outputId)
      ? articleReaderPeriodicPvaScalarV3(periodicPva, output.outputId)
      : presentationOutput === undefined ? latest?.values[output.outputId] : presentationOutput.value;
    const scalar = typeof value === "number" && Number.isFinite(value) ? value : null;
    const presentation = resolveWorkbenchOutputPresentationV3({
      locale,
      outputId: output.outputId,
      outputKind: definition?.kind,
      storedLabel: output.label,
    });
    return {
      itemId: articleBriefingOutputKeyV3(output),
      outputId: output.outputId,
      scenarioId: output.scenarioId,
      sourcePaneId: output.sourcePaneId,
      label: presentation.label,
      ...(presentation.description
        ? {
            description: presentation.description,
            descriptionAriaLabel:
              locale === "ja"
                ? `${presentation.label}の説明`
                : `About ${presentation.label}`,
          }
        : {}),
      value: scalar,
      unit: definition?.unit ?? "",
      significantDigits: definition?.significantDigits,
      availability: scalar === null ? "unavailable" : "available",
      quality: scalar === null ? "not-assessed" : "assessed",
    };
  });
}

/** Scenario colour as the graphs allocate it, for section swatches. */
export function articleReaderScenarioColorV3(
  snapshot: ExperimentSnapshotV2,
  scenarioId: string,
  appTheme: "light" | "dark",
): string {
  const scenarioIndex = snapshot.content.scenarios.findIndex((scenario) => scenario.scenarioId === scenarioId);
  return resolveWorkbenchAutomaticGraphColorV3({
    colorHex: workbenchScenarioColorSeedV3({
      surface: snapshot.content.surface, scenarioId, scenarioIndex: Math.max(0, scenarioIndex),
    }),
    appTheme,
  });
}

/**
 * Scenarios whose Surface-pinned analysis this Briefing displays: structural
 * graphs, analysis-backed PV panes, and PVA outputs.
 */
export function articleReaderAnalysisScenarioIdsV3(
  briefing: ExperimentPlacementBriefingV2,
  snapshot: ExperimentSnapshotV2,
  contract: ModelContractV2,
  derivationAvailable: boolean,
): readonly string[] {
  const scenarioIds = new Set<string>();
  for (const selected of briefing.graphs) {
    const resolved = resolveArticleReaderGraphPresentationV3(snapshot, selected);
    if (resolved === null) continue;
    const graph = contract.graphCatalog.find(({ graphId }) => graphId === resolved.pane.graphId);
    const analysisBacked = graph?.renderer === "structural-return"
      || (graph?.renderer === "pressure-volume"
        && articleReaderPeriodicPvaEnabledV3(derivationAvailable, resolved.pane.pressureVolumeAnalysisMode)
        && resolved.series.some(({ seriesId }) => seriesId === "LV" || seriesId === "RV"));
    if (!analysisBacked) continue;
    for (const scenarioId of resolveWorkbenchGraphScenarioIdsV3(resolved.pane, briefing.scenarioScope.visibleScenarioIds)) {
      if (!isWorkbenchGraphTraceExcludedV3(resolved.pane, scenarioId, null)) scenarioIds.add(scenarioId);
    }
  }
  for (const output of briefing.outputs) {
    if (ARTICLE_READER_PERIODIC_PVA_OUTPUT_ID_SET_V3.has(output.outputId)) scenarioIds.add(output.scenarioId);
  }
  return Object.freeze(briefing.scenarioScope.visibleScenarioIds.filter((scenarioId) => scenarioIds.has(scenarioId)));
}

/** An explicit update for derived results; live waveforms and ordinary outputs keep running. */
export function ArticleReaderAnalysisStatusV3({
  analysisAutoScenarioIds,
  briefing,
  contract,
  runtime,
  snapshot,
}: Readonly<{
  analysisAutoScenarioIds: ReadonlySet<string>;
  briefing: ExperimentPlacementBriefingV2;
  contract: ModelContractV2;
  runtime: ArticleReaderRuntimeHookV3;
  snapshot: ExperimentSnapshotV2;
}>) {
  const { t } = useTranslation();
  const descriptionId = React.useId();
  const analysisId = mainWireFormalPvAnalysisIdV1(runtime.periodicPvaDerivation);
  const scenarioIds = articleReaderAnalysisScenarioIdsV3(briefing, snapshot, contract, runtime.periodicPvaDerivation !== null);
  if (scenarioIds.length === 0) return null;
  const state = runtime.state;
  const keyed = scenarioIds.map((scenarioId) => {
    const key = articleReaderAnalysisKeyV3(scenarioId, analysisId);
    return {
      scenarioId, key,
      pending: state.pendingAnalysisKeys.includes(key),
      error: state.analysisErrorByKey[key],
      present: state.analysisByKey[key] !== undefined,
      auto: analysisAutoScenarioIds.has(scenarioId),
    };
  });
  const pending = keyed.filter(({ pending }) => pending);
  const failed = keyed.filter(({ error, pending }) => error !== undefined && !pending);
  const stale = keyed.filter(({ present, pending, error, auto }) => !present && !pending && error === undefined && !auto);
  const canRequest = state.status === "playing" || state.status === "paused";
  const request = (targets: readonly string[]) => {
    void runtime.requestAnalysis({ analysisId, scenarioIds: targets }).catch(() => {
      // Per-Scenario errors are published by the runtime and rendered below.
    });
  };
  if (pending.length > 0) {
    // Graph legends already carry progress. Preserve one screen-reader status
    // without adding another visible row or pushing the observations down.
    return <span className="sr-only" data-reader-analysis-state="pending" role="status">{t("articleReader.analysisRunning")}</span>;
  }
  const targets = failed.length > 0 ? failed : stale;
  if (targets.length > 0) {
    const graphScenarioIds = articleReaderAnalysisScenarioIdsV3({ ...briefing, outputs: [] }, snapshot, contract, runtime.periodicPvaDerivation !== null);
    const hasCurves = targets.some(({ scenarioId }) => graphScenarioIds.includes(scenarioId));
    const hasValues = briefing.outputs.some(output => ARTICLE_READER_PERIODIC_PVA_OUTPUT_ID_SET_V3.has(output.outputId)
      && targets.some(({ scenarioId }) => scenarioId === output.scenarioId));
    const failedUpdate = failed.length > 0;
    const actionLabel = t(failedUpdate ? "articleReader.retryAnalysis"
      : hasCurves && hasValues ? "articleReader.refreshCurvesAndValues"
      : hasCurves ? "articleReader.refreshCurves" : "articleReader.refreshAnalysisValues");
    return (
      <div className="article-reader-analysis-status" data-reader-analysis-state={failedUpdate ? "error" : "stale"}
        data-reader-analysis-stale-scenarios={failedUpdate ? undefined : stale.map(({ scenarioId }) => scenarioId).join(" ")}>
        {failedUpdate && <span>{t("articleReader.analysisError")}</span>}
        <button type="button" disabled={!canRequest} onClick={() => request(targets.map(({ scenarioId }) => scenarioId))}
          data-reader-recompute-analysis aria-describedby={descriptionId} title={t("articleReader.analysisStaleHint")}>
          {actionLabel}
        </button>
        <span id={descriptionId} className="sr-only">{t("articleReader.analysisStaleHint")}</span>
      </div>
    );
  }
  return null;
}

function ArticleReaderLiveGraphViewportV3({
  activeScenarioId,
  analysisAutoScenarioIds,
  briefing,
  className,
  contract,
  inline,
  playbackRunning,
  runtime,
  snapshot,
  visibleScenarioIds,
}: Readonly<{
  activeScenarioId: string;
  analysisAutoScenarioIds?: ReadonlySet<string>;
  briefing: ExperimentPlacementBriefingGraphV2;
  className: string;
  contract: ModelContractV2;
  inline: boolean;
  playbackRunning: boolean;
  runtime: ArticleReaderRuntimeHookV3;
  snapshot: ExperimentSnapshotV2;
  visibleScenarioIds: readonly string[];
}>) {
  const rootRef = React.useRef<HTMLDivElement>(null);
  const observerAvailable = typeof IntersectionObserver !== "undefined";
  const [renderActive, setRenderActive] = React.useState(!observerAvailable);

  React.useEffect(() => {
    if (typeof IntersectionObserver === "undefined") {
      setRenderActive(true);
      return undefined;
    }
    const element = rootRef.current;
    if (element === null) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        const active = entries.some(
          (entry) => entry.isIntersecting && entry.intersectionRatio >= 0.12,
        );
        setRenderActive((current) => (current === active ? current : active));
      },
      {
        rootMargin: "80px 0px",
        threshold: [0, 0.12],
      },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const label =
    resolveArticleReaderGraphPresentationV3(snapshot, briefing)?.label ??
    "Graph";
  return (
    <div
      ref={rootRef}
      className={`${className} h-full min-h-0`}
      data-reader-graph-render-active={renderActive ? "true" : "false"}
      data-reader-graph-renderer={contract.graphCatalog.find(graph => graph.graphId === snapshot.content.surface.graphPanes.find(pane => pane.paneId === briefing.paneId)?.graphId)?.renderer}
    >
      {renderActive ? (
        <ArticleReaderLiveGraphV3
          activeScenarioId={activeScenarioId}
          analysisAutoScenarioIds={analysisAutoScenarioIds}
          briefing={briefing}
          contract={contract}
          inline={inline}
          playbackRunning={playbackRunning}
          runtime={runtime}
          snapshot={snapshot}
          visibleScenarioIds={visibleScenarioIds}
        />
      ) : (
        <div
          className="h-full min-h-40"
          aria-label={label}
          data-reader-graph-placeholder="true"
        />
      )}
    </div>
  );
}

function ArticleReaderLiveGraphV3({
  activeScenarioId,
  analysisAutoScenarioIds,
  briefing,
  contract,
  inline,
  playbackRunning,
  runtime,
  snapshot,
  visibleScenarioIds,
}: Readonly<{
  activeScenarioId: string;
  analysisAutoScenarioIds?: ReadonlySet<string>;
  briefing: ExperimentPlacementBriefingGraphV2;
  contract: ModelContractV2;
  inline: boolean;
  playbackRunning: boolean;
  runtime: ArticleReaderRuntimeHookV3;
  snapshot: ExperimentSnapshotV2;
  visibleScenarioIds: readonly string[];
}>) {
  const { i18n } = useTranslation();
  const { appTheme } = useAppTheme();
  const locale = i18n.language.startsWith("ja") ? "ja" : "en";
  const sampleStore = runtime.sampleStore;
  const resolved = resolveArticleReaderGraphPresentationV3(snapshot, briefing);
  const pane = resolved?.pane;
  const graph =
    pane === undefined
      ? undefined
      : contract.graphCatalog.find(({ graphId }) => graphId === pane.graphId);
  const livePresentation =
    useWorkbenchOptionalSampledGraphPresentationSamplesV3(
      sampleStore,
      // Completed-waveform observers arrive with scalar batches too. Their
      // memoized canvas only redraws when the completed analysis changes.
      graph?.renderer === "cycle-waveform"
        ? "sweep"
        : graph?.renderer === "sweep" || graph?.renderer === "pressure-volume"
          ? graph.renderer
          : null,
    );
  const sampledPresentation = React.useMemo(
    () => articleReaderSampledPresentationV1(livePresentation, runtime.previewSampleStore),
    [livePresentation, runtime.previewSampleStore],
  );
  if (resolved === null || pane === undefined || graph === undefined)
    return null;
  const series = resolved.series;
  const paneScenarioIds = resolveWorkbenchGraphScenarioIdsV3(
    pane,
    visibleScenarioIds,
  );
  const visibleScenarios = snapshot.content.scenarios.filter(({ scenarioId }) =>
    paneScenarioIds.includes(scenarioId),
  );

  if (graph.renderer === "cycle-waveform") return <div className="h-full min-h-40"><CompletedEjectionWaveformV1 traces={visibleScenarios.flatMap((scenario, index) => {
    if (isWorkbenchGraphTraceExcludedV3(pane, scenario.scenarioId, null)) return [];
    const source = runtime.presentationTrace?.(scenario.scenarioId);
    return [{ scenarioId: scenario.scenarioId, label: scenario.label, frame: source?.frame,
      analysis: source?.analyses.find(a => a.analysisId === graph.derivationId),
      color: resolveWorkbenchGraphTraceStyleV3({ pane, surface: snapshot.content.surface, renderer: graph.renderer,
        authoredScenarioCount: snapshot.content.scenarios.length, scenarioId: scenario.scenarioId, scenarioIndex: index,
        seriesId: null, seriesIndex: 0, appTheme }).color }];
  })} /></div>;
  if (graph.renderer === "structural-return") {
    const structuralVisibleScenarios = visibleScenarios.filter(
      ({ scenarioId }) =>
        !isWorkbenchGraphTraceExcludedV3(pane, scenarioId, null),
    );
    return (
      <ExperimentGraphPresentationV3
        variant="article"
        label={resolved.label}
        data-reader-legend={resolved.legend}
        className="flex h-full flex-col"
        canvasClassName="min-h-0 min-w-0 flex-1"
      >
        <ArticleReaderStructuralReturnGraphV3
          analysisAutoScenarioIds={analysisAutoScenarioIds}
          authoredScenarios={snapshot.content.scenarios}
          graph={graph}
          historyDepth={resolved.historyDepth}
          inline={inline}
          runtime={runtime}
          pane={pane}
          surface={snapshot.content.surface}
          traceColorOverrides={briefing.overrides?.traceColors}
          structuralSide={
            pane.structuralSide ?? (graph.side === "left" ? "left" : "right")
          }
          visibleScenarios={structuralVisibleScenarios}
        />
      </ExperimentGraphPresentationV3>
    );
  }

  const authoredScenarioCount = snapshot.content.scenarios.length;
  const cyclePhaseOutputId = articleReaderModelCyclePhaseOutputIdV3(contract);
  const scenarioIndexV3 = (scenarioId: string) =>
    snapshot.content.scenarios.findIndex(
      (scenario) => scenario.scenarioId === scenarioId,
    );
  if (graph.renderer === "pressure-volume") {
    if (sampledPresentation?.renderer !== "pressure-volume") return null;
    const exactOrbits = sampledPresentation.exactOrbitSamplesByScenarioId;
    const orbitHistory = sampledPresentation.orbitHistoryByScenarioId;
    const bindings = series.flatMap((selectedSeries) => {
      const binding = graph.seriesCatalog.find(
        ({ seriesId }) => seriesId === selectedSeries.seriesId,
      );
      return binding === undefined ? [] : [{ binding, selectedSeries }];
    });
    const tracesForBindings = (selected: typeof bindings) =>
      visibleScenarios.flatMap((scenario) => {
        const scenarioStyleIndex = scenarioIndexV3(scenario.scenarioId);
        const scenarioSamples = exactOrbits[scenario.scenarioId] ?? [];
        if (scenarioStyleIndex < 0 || scenarioSamples.length === 0) return [];
        return selected.flatMap(({ binding, selectedSeries }) => {
          if (
            isWorkbenchGraphTraceExcludedV3(
              pane,
              scenario.scenarioId,
              selectedSeries.seriesId,
            )
          )
            return [];
          const style = resolveWorkbenchGraphTraceStyleV3({
            pane,
            surface: snapshot.content.surface,
            renderer: graph.renderer,
            authoredScenarioCount,
            scenarioId: scenario.scenarioId,
            scenarioIndex: scenarioStyleIndex,
            seriesId: selectedSeries.seriesId,
            seriesIndex: series.findIndex(
              ({ seriesId }) => seriesId === selectedSeries.seriesId,
            ),
            appTheme,
          });
          const color =
            articleBriefingTraceColorV3(
              briefing,
              scenario.scenarioId,
              selectedSeries.seriesId,
            ) ?? style.color;
          return [
            {
              scenarioId: scenario.scenarioId,
              scenarioLabel: scenario.label,
              scenarioStatus: playbackRunning ? "Live" : "Paused",
              scenarioStyleIndex,
              samples: scenarioSamples,
              currentCycleSamples: sampledPresentation.currentCycleSamplesByScenarioId[scenario.scenarioId],
              cyclePosition: sampledPresentation.cyclePositionByScenarioId[scenario.scenarioId],
              completedCycleSampleSets: sampledPresentation.completedCyclesByScenarioId[scenario.scenarioId],
              historyEpochs: articleReaderBoundedHistoryV3(
                orbitHistory[scenario.scenarioId] ?? [],
                resolved.historyDepth,
              ),
              volumeOutputId: binding.volumeOutputId,
              pressureOutputId: binding.pressureOutputId,
              pressureBasis: binding.pressureBasis,
              cyclePhaseOutputId: binding.cyclePhaseOutputId,
              chamberId: binding.seriesId,
              chamberLabel: selectedSeries.label,
              chamberColor: color,
            },
          ];
        });
      });
    const traces = tracesForBindings(bindings);
    return (
      <ExperimentGraphPresentationV3
        variant="article"
        label={resolved.label}
        data-reader-legend={resolved.legend}
        className="flex h-full flex-col"
        canvasClassName="min-h-0 min-w-0 flex-1"
      >
        <ArticleReaderPressureVolumeCanvasV3
          analysisAutoScenarioIds={analysisAutoScenarioIds}
          axisRanges={pane.axisRanges}
          pvTrailBeats={resolved.pvTrailBeats}
          historyDepth={resolved.historyDepth}
          analysisId={
            mainWireFormalPvAnalysisIdV1(runtime.periodicPvaDerivation)
          }
          pressureVolumeAnalysisMode={pane.pressureVolumeAnalysisMode}
          runtime={runtime}
          traces={traces}
          showPressureEnvelope={pane.showPressureEnvelope}
          showPvaBoundary={pane.showPvaBoundary}
        />
      </ExperimentGraphPresentationV3>
    );
  }
  if (graph.renderer !== "sweep") return null;
  if (sampledPresentation?.renderer !== "sweep") return null;
  const samples = sampledPresentation.samplesByScenarioId;
  const bindings = series.flatMap((selectedSeries) => {
    const binding = graph.seriesCatalog.find(
      ({ seriesId }) => seriesId === selectedSeries.seriesId,
    );
    return binding === undefined ? [] : [{ binding, selectedSeries }];
  });
  const tracesForScenarios = (selected: readonly ExperimentScenarioV2[]) =>
    selected.flatMap((scenario) => {
      const scenarioStyleIndex = scenarioIndexV3(scenario.scenarioId);
      const scenarioSamples = samples[scenario.scenarioId] ?? [];
      if (scenarioStyleIndex < 0 || scenarioSamples.length === 0) return [];
      return bindings.flatMap(({ binding, selectedSeries }) => {
        if (
          isWorkbenchGraphTraceExcludedV3(
            pane,
            scenario.scenarioId,
            selectedSeries.seriesId,
          )
        )
          return [];
        const style = resolveWorkbenchGraphTraceStyleV3({
          pane,
          surface: snapshot.content.surface,
          renderer: graph.renderer,
          authoredScenarioCount,
          scenarioId: scenario.scenarioId,
          scenarioIndex: scenarioStyleIndex,
          seriesId: selectedSeries.seriesId,
          seriesIndex: series.findIndex(
            ({ seriesId }) => seriesId === selectedSeries.seriesId,
          ),
          appTheme,
        });
        const color =
          articleBriefingTraceColorV3(
            briefing,
            scenario.scenarioId,
            selectedSeries.seriesId,
          ) ?? style.color;
        const presentation = resolveWorkbenchGraphSeriesPresentationV3({
          definition: contract.outputCatalog.find(
            ({ outputId }) => outputId === binding.outputId,
          ),
          locale,
          outputId: binding.outputId,
          seriesId: selectedSeries.seriesId,
          storedLabel: selectedSeries.label,
        });
        const signalLabel = presentation.label;
        return [
          {
            scenarioId: scenario.scenarioId,
            scenarioLabel: scenario.label,
            scenarioStatus: playbackRunning ? "Live" : "Paused",
            scenarioStyleIndex,
            samples: scenarioSamples,
            outputId: binding.outputId,
            signalLabel,
            ...(presentation.description
              ? {
                  signalDescription: presentation.description,
                  signalDescriptionLabel:
                    locale === "ja"
                      ? `${signalLabel}の説明`
                      : `About ${signalLabel}`,
                }
              : {}),
            signalColor: color,
            ...(cyclePhaseOutputId === undefined ? {} : { cyclePhaseOutputId }),
          },
        ];
      });
    });
  const selectedOutputIds = selectedSweepOutputIdsV3(graph, series);
  const selectedOutputs = contract.outputCatalog.filter(({ outputId }) =>
    selectedOutputIds.includes(outputId),
  );
  const unitLabel = commonGraphUnitV3(contract, selectedOutputIds);
  const includeZero = selectedOutputs.every(
    ({ outputId }) => outputId.includes(".flow.") || outputId.endsWith(".flow"),
  );
  const windowSec = resolved.windowSec ?? 2;
  const traces = tracesForScenarios(visibleScenarios);
  return (
    <ExperimentGraphPresentationV3
      variant="article"
      label={resolved.label}
      data-reader-legend={resolved.legend}
      className="flex h-full flex-col"
      canvasClassName="min-h-0 min-w-0 flex-1"
    >
      <SweepingWaveformCanvasV3
        axisRanges={pane.axisRanges}
        activeScenarioId={activeScenarioId}
        includeZero={includeZero}
        traces={traces}
        unitLabel={unitLabel}
        windowSec={windowSec}
      />
    </ExperimentGraphPresentationV3>
  );
}

function ArticleReaderPressureVolumeCanvasV3({
  analysisAutoScenarioIds,
  axisRanges,
  pvTrailBeats,
  analysisId,
  historyDepth,
  pressureVolumeAnalysisMode,
  showPressureEnvelope,
  showPvaBoundary,
  runtime,
  traces,
}: Readonly<{
  /** Scenarios whose missing analysis is requested without asking the reader. */
  analysisAutoScenarioIds?: ReadonlySet<string>;
  analysisId: string;
  historyDepth: number;
  axisRanges?: ExperimentSurfaceGraphPaneV2["axisRanges"];
  pvTrailBeats?: number;
  pressureVolumeAnalysisMode:
    ExperimentSurfaceGraphPaneV2["pressureVolumeAnalysisMode"];
  showPressureEnvelope: ExperimentSurfaceGraphPaneV2["showPressureEnvelope"];
  showPvaBoundary: ExperimentSurfaceGraphPaneV2["showPvaBoundary"];
  runtime: ArticleReaderRuntimeHookV3;
  traces: readonly WorkbenchPressureVolumeTraceV3[];
}>) {
  const periodicPvaEnabled = articleReaderPeriodicPvaEnabledV3(
    runtime.periodicPvaDerivation !== null,
    pressureVolumeAnalysisMode,
  );
  const scenarioIds = React.useMemo(
    () =>
      !periodicPvaEnabled
        ? Object.freeze([])
        : Object.freeze([
            ...new Set(
              traces
                .filter(
                  ({ chamberId }) => chamberId === "LV" || chamberId === "RV",
                )
                .map(({ scenarioId }) => scenarioId),
            ),
          ]),
    [periodicPvaEnabled, traces],
  );
  const missingScenarioIds = scenarioIds.filter((scenarioId) => {
    if (analysisAutoScenarioIds !== undefined && !analysisAutoScenarioIds.has(scenarioId)) return false;
    const key = articleReaderAnalysisKeyV3(scenarioId, analysisId);
    return (
      runtime.state.analysisByKey[key] === undefined &&
      runtime.state.analysisErrorByKey[key] === undefined &&
      !runtime.state.pendingAnalysisKeys.includes(key)
    );
  });
  const missingKey = JSON.stringify(missingScenarioIds);
  const canRequest =
    runtime.state.status === "playing" || runtime.state.status === "paused";
  React.useEffect(() => {
    if (
      !periodicPvaEnabled ||
      !canRequest ||
      missingScenarioIds.length === 0
    ) return;
    void runtime
      .requestAnalysis({
        analysisId,
        scenarioIds: missingScenarioIds,
      })
      .catch(() => {
        // The runtime publishes recoverable per-Scenario analysis errors.
      });
  }, [
    analysisId,
    canRequest,
    missingKey,
    periodicPvaEnabled,
    runtime.periodicPvaDerivation,
    runtime.requestAnalysis,
  ]);

  const enrichedTraces = React.useMemo(
    () =>
      Object.freeze(
        traces.map((trace) => {
          if (!periodicPvaEnabled) return trace;
          const side = pressureVolumeRelationSideV3(trace.chamberId);
          if (side === null) return trace;
          const key = articleReaderAnalysisKeyV3(trace.scenarioId, analysisId);
          const periodicPva = periodicPvaFromAnalysisV3(
            runtime.state.analysisByKey[key],
            side,
            runtime.periodicPvaDerivation,
          );
          return Object.freeze({
            ...trace,
            ...(periodicPva === undefined ? {} : { periodicPva }),
            periodicPvaHistory: articleReaderBoundedHistoryV3(runtime.state.analysisHistoryByKey[key] ?? [], historyDepth)
              .flatMap(analysis => {
                const prior = periodicPvaFromAnalysisV3(analysis, side, runtime.periodicPvaDerivation);
                return prior === undefined ? [] : [{ value: prior, inputEpoch: runtime.presentationAnalysisEpoch?.(analysis) ?? analysis.inputEpoch }];
              }),
            ...(runtime.state.analysisErrorByKey[key] === undefined
              ? {}
              : {
                  periodicPvaAnalysisError:
                    runtime.state.analysisErrorByKey[key],
                }),
            periodicPvaAnalysisPending:
              runtime.state.pendingAnalysisKeys.includes(key),
          });
        }),
      ),
    [
      analysisId,
      historyDepth,
      periodicPvaEnabled,
      runtime.periodicPvaDerivation,
      runtime.state.analysisHistoryByKey,
      runtime.state.analysisByKey,
      runtime.state.analysisErrorByKey,
      runtime.state.pendingAnalysisKeys,
      traces,
    ],
  );
  return (
    <PressureVolumeLoopCanvasV3
      axisRanges={axisRanges}
      pvTrailBeats={pvTrailBeats}
      playbackRunning={runtime.state.status === "playing"}
      periodicPvaSupported={periodicPvaEnabled}
      traces={enrichedTraces}
      showPressureEnvelope={periodicPvaEnabled ? showPressureEnvelope : false}
      showPvaBoundary={periodicPvaEnabled ? showPvaBoundary : false}
    />
  );
}

export function articleReaderPeriodicPvaEnabledV3(
  derivationAvailable: boolean,
  pressureVolumeAnalysisMode:
    ExperimentSurfaceGraphPaneV2["pressureVolumeAnalysisMode"],
): boolean {
  return derivationAvailable && pressureVolumeAnalysisMode !== "raw-exact-orbit";
}

function pressureVolumeRelationSideV3(
  chamberId: string,
): "left" | "right" | null {
  if (chamberId === "LV") return "left";
  if (chamberId === "RV") return "right";
  return null;
}

function articleReaderModelCyclePhaseOutputIdV3(
  contract: ModelContractV2,
): string | undefined {
  for (const graph of contract.graphCatalog) {
    if (graph.renderer !== "pressure-volume") continue;
    const cyclePhaseOutputId = graph.seriesCatalog[0]?.cyclePhaseOutputId;
    if (cyclePhaseOutputId !== undefined) return cyclePhaseOutputId;
  }
  return undefined;
}

export function ArticleReaderStructuralReturnGraphV3({
  analysisAutoScenarioIds,
  authoredScenarios,
  graph,
  historyDepth,
  inline = false,
  pane,
  runtime,
  surface,
  traceColorOverrides,
  structuralSide,
  visibleScenarios,
}: Readonly<{
  /** Scenarios whose missing analysis is requested without asking the reader. */
  analysisAutoScenarioIds?: ReadonlySet<string>;
  authoredScenarios: readonly ExperimentScenarioV2[];
  graph: StructuralReturnGraphDefinitionV2;
  historyDepth: number;
  inline?: boolean;
  pane: ExperimentSurfaceGraphPaneV2;
  runtime: ArticleReaderRuntimeHookV3;
  surface: ExperimentSnapshotV2["content"]["surface"];
  traceColorOverrides?: ExperimentPlacementBriefingGraphOverridesV2["traceColors"];
  structuralSide: "left" | "right";
  visibleScenarios: readonly ExperimentScenarioV2[];
}>) {
  const { t } = useTranslation();
  const { appTheme } = useAppTheme();
  const analysisId =
    mainWireFormalPvAnalysisIdV1(runtime.periodicPvaDerivation);
  const scenarioIds = visibleScenarios.map(({ scenarioId }) => scenarioId);
  const analysisKeys = scenarioIds.map((scenarioId) =>
    articleReaderAnalysisKeyV3(scenarioId, analysisId),
  );
  const missingScenarioIds = scenarioIds.filter((scenarioId, index) => {
    if (analysisAutoScenarioIds !== undefined && !analysisAutoScenarioIds.has(scenarioId)) return false;
    const key = analysisKeys[index]!;
    return (
      runtime.state.analysisByKey[key] === undefined &&
      runtime.state.analysisErrorByKey[key] === undefined &&
      !runtime.state.pendingAnalysisKeys.includes(key)
    );
  });
  const canRequest =
    runtime.state.status === "playing" || runtime.state.status === "paused";
  const missingScenarioKey = JSON.stringify(missingScenarioIds);

  React.useEffect(() => {
    if (!canRequest || missingScenarioIds.length === 0) return;
    void runtime
      .requestAnalysis({
        analysisId,
        scenarioIds: missingScenarioIds,
      })
      .catch(() => {
        // The runtime publishes a per-Scenario recoverable error for the graph.
      });
  }, [canRequest, analysisId, missingScenarioKey, runtime.requestAnalysis]);

  const pending = analysisKeys.some((key) =>
    runtime.state.pendingAnalysisKeys.includes(key),
  );
  const traces = visibleScenarios.map((scenario) => {
    const key = articleReaderAnalysisKeyV3(scenario.scenarioId, analysisId);
    const scenarioIndex = authoredScenarios.findIndex(
      ({ scenarioId }) => scenarioId === scenario.scenarioId,
    );
    const traceStyle = resolveWorkbenchGraphTraceStyleV3({
      pane,
      surface,
      renderer: graph.renderer,
      authoredScenarioCount: authoredScenarios.length,
      scenarioId: scenario.scenarioId,
      scenarioIndex,
      seriesId: null,
      appTheme,
    });
    const articleColor = traceColorOverrides?.find(
      (trace) =>
        trace.scenarioId === scenario.scenarioId && trace.seriesId === null,
    )?.colorHex;
    const analysisPending = runtime.state.pendingAnalysisKeys.includes(key);
    return Object.freeze({
      scenario,
      key,
      color: articleColor ?? traceStyle.color,
      analysis: runtime.state.analysisByKey[key],
      history: articleReaderBoundedHistoryV3(
        runtime.state.analysisHistoryByKey[key] ?? [],
        historyDepth,
      ),
      pending: analysisPending,
      error: runtime.state.analysisErrorByKey[key] ?? null,
    });
  });
  const comparisonTraces = Object.freeze(
    traces.flatMap((trace) => {
      const currentOrientation = structuralReturnOrientationFromPayloadV3(
        trace.analysis?.payload,
        structuralSide,
      );
      const historyOrientations = Object.freeze(
        trace.history.flatMap((historical) => {
          const candidate = structuralReturnOrientationFromPayloadV3(
            historical.payload,
            structuralSide,
          );
          return candidate === null ? [] : [candidate];
        }),
      );
      const fallbackOrientation =
        currentOrientation === null
          ? (historyOrientations.at(-1) ?? null)
          : null;
      const orientation = currentOrientation ?? fallbackOrientation;
      if (orientation === null) return [];
      return [
        Object.freeze({
          scenarioId: trace.scenario.scenarioId,
          scenarioLabel: trace.scenario.label,
          color: trace.color,
          orientation,
          orientationAlpha: fallbackOrientation === null ? 1 : 0.34,
          stale: fallbackOrientation !== null,
          error: trace.error,
          pending: trace.pending,
          historyOrientations:
            fallbackOrientation === null
              ? historyOrientations
              : Object.freeze(historyOrientations.slice(0, -1)),
        }),
      ];
    }),
  );
  const firstError = traces.find(({ error }) => error !== null)?.error ?? null;
  return (
    <div
      className={`grid h-full min-h-40 min-w-0 ${inline ? "article-reader-inflow-structural" : ""}`}
      data-reader-structural-scenario-count={visibleScenarios.length}
    >
      {comparisonTraces.length === 0 ? (
        pending || firstError === null ? <div className="flex h-full min-h-56 flex-col">
          <WorkbenchChartLegendRowV3 updatingLabel={t("workbench.live.analysisRunning")}>
            <SimulationLegendPlaceholderV1 />
          </WorkbenchChartLegendRowV3>
          <div className="min-h-0 flex-1"><SimulationPanePlaceholderV1 showLegend={false} /></div>
        </div> : <div
          className="flex h-full min-h-56 items-center justify-center px-5 text-center text-xs leading-6 text-wb-subtle"
          role="alert"
        >
          {firstError}
        </div>
      ) : (
        <GuytonStarlingComparisonCanvasV3
          axisRanges={pane.axisRanges}
          recalculatingLabel={t("workbench.live.analysisRecalculating")}
          traces={comparisonTraces}
        />
      )}
      <div className="sr-only">
        {traces.map(({ analysis, scenario }) =>
          analysis === undefined ? null : (
            <span
              key={scenario.scenarioId}
              data-reader-analysis-input-epoch={analysis.inputEpoch}
              data-reader-structural-scenario-id={scenario.scenarioId}
            >
              {scenario.label}: {analysis.sourceAcceptedRevision}@
              {analysis.sourceAcceptedTimeSec.toFixed(3)}
            </span>
          ),
        )}
      </div>
    </div>
  );
}

function articleReaderPeriodicPvaScalarV3(
  periodicPva: MainWirePeriodicPvaV1 | undefined,
  outputId: string,
): number | null {
  const projection =
    periodicPva?.status === "available"
      ? periodicPva
      : periodicPva?.status === "collecting"
        ? periodicPva.preview
        : null;
  if (projection === null) return null;
  switch (outputId) {
    case MAIN_WIRE_PERIODIC_PVA_OUTPUT_IDS_V1.potentialEnergyMilliJoule:
      return projection.potentialEnergy?.joule === undefined
        ? null
        : projection.potentialEnergy.joule * 1e3;
    case MAIN_WIRE_PERIODIC_PVA_OUTPUT_IDS_V1.pressureVolumeAreaMilliJoule:
      return projection.pva?.joule === undefined
        ? null
        : projection.pva.joule * 1e3;
    case MAIN_WIRE_PERIODIC_PVA_OUTPUT_IDS_V1.estimatedMvo2PerBeatPer100G:
      return projection.estimatedMvo2?.status === "available"
        ? projection.estimatedMvo2.oxygenDemand.totalMlO2PerBeatPer100G
        : null;
    case MAIN_WIRE_PERIODIC_PVA_OUTPUT_IDS_V1.estimatedMvo2PerMinPer100G:
      return projection.estimatedMvo2?.status === "available"
        ? projection.estimatedMvo2.oxygenDemand.totalMlO2PerMinPer100G
        : null;
    default:
      return null;
  }
}

/**
 * Controls grouped by source pane. The pane's sealed Scenario binding is the
 * section heading, never a reader choice; when a section drives several
 * different bindings, each row identifies the target when the selector or
 * section heading cannot do so unambiguously.
 * In an opened form each pane folds; the caller decides which start open.
 */
function ArticleReaderControlsV3({
  briefing,
  controls: selectedControls,
  contract,
  collapsedPaneIds,
  onTogglePane,
  runtime,
  scenarioColor,
  snapshot,
}: Readonly<{
  briefing: ExperimentPlacementBriefingV2;
  controls: readonly ExperimentPlacementBriefingControlV2[];
  contract: ModelContractV2;
  /** Panes currently folded; present only where panes may fold. */
  collapsedPaneIds?: ReadonlySet<string>;
  onTogglePane?: (paneId: string) => void;
  runtime: ArticleReaderRuntimeHookV3;
  scenarioColor: (scenarioId: string) => string;
  snapshot: ExperimentSnapshotV2;
}>) {
  const { t } = useTranslation();
  const visibleScenarios = snapshot.content.scenarios.filter(({ scenarioId }) =>
    briefing.scenarioScope.visibleScenarioIds.includes(scenarioId));
  const multiScenario = articleReaderNeedsScenarioLabelsV3(briefing);
  const scenarioLabel = (scenarioId: string) =>
    snapshot.content.scenarios.find((scenario) => scenario.scenarioId === scenarioId)?.label ?? scenarioId;
  const selectionDisabled = runtime.state.status !== "playing" && runtime.state.status !== "paused";
  const sourcePaneIds = [...new Set([...selectedControls].sort(compareOrderV3).map(({ sourcePaneId }) => sourcePaneId))];
  const sections: ArticleReaderSectionV3[] = sourcePaneIds.map((sourcePaneId) => {
    const controls = [...selectedControls].filter((control) => control.sourcePaneId === sourcePaneId).sort(compareOrderV3);
    const pane = snapshot.content.surface.controlPanes.find((candidate) => candidate.paneId === sourcePaneId);
    const readerFocusBindings = controls.flatMap(({ binding }) => binding.mode === "reader-focus" ? [binding] : []);
    // One heading names the target only when every control in the pane
    // shares the same sealed binding; otherwise each row names its own.
    const bindingSignatures = new Set(controls.map((control) => articleReaderControlBindingSignatureV3(control, briefing.scenarioScope.visibleScenarioIds)));
    const sharedFixedTargets = bindingSignatures.size === 1 && controls[0]?.binding.mode === "fixed"
      ? controls[0].binding.scenarioIds.filter((scenarioId) => briefing.scenarioScope.visibleScenarioIds.includes(scenarioId))
      : [];
    const allowed = visibleScenarios.filter(({ scenarioId }) =>
      readerFocusBindings.some((binding) => binding.allowedScenarioIds.includes(scenarioId)));
    const showFocusSelector = allowed.length > 1
      || (allowed.length === 1 && allowed[0]!.scenarioId !== runtime.state.activeScenarioId);
    const headingTargets = sharedFixedTargets.length > 0 ? sharedFixedTargets
      : bindingSignatures.size === 1 && !showFocusSelector && allowed.length === 1
        ? [allowed[0]!.scenarioId] : [];
    return {
      key: sourcePaneId,
      title: pane?.label?.trim() || t("articleReader.controls"),
      ...(onTogglePane === undefined ? {} : { collapsed: collapsedPaneIds?.has(sourcePaneId) === true, onToggle: () => onTogglePane(sourcePaneId) }),
      ...(multiScenario && headingTargets.length > 0
        ? { scenario: { label: headingTargets.map(scenarioLabel).join(", "), colorHex: scenarioColor(headingTargets[0]!) } }
        : {}),
      ...(showFocusSelector ? {
        lead: (
          <ArticleReaderScenarioSelectorV3
            label={t("articleReader.scenarioFocus")}
            activeScenarioId={runtime.state.activeScenarioId}
            disabled={selectionDisabled}
            scenarios={allowed.map(({ scenarioId, label }) => ({ scenarioId, label, colorHex: scenarioColor(scenarioId) }))}
            onSelect={runtime.selectScenario}
          />
        ),
      } : {}),
      body: (
        <div className="workbench-control-list">
          {controls.map((control) => {
            const definition = contract.controlCatalog.find(
              ({ controlId }) => controlId === control.controlId,
            );
            if (definition === undefined) return null;
            return (
              <ArticleReaderControlV3
                key={`${control.sourcePaneId}:${control.controlId}`}
                briefing={briefing}
                control={control}
                definition={definition}
                runtime={runtime}
                scenarioColor={scenarioColor}
                showTarget={multiScenario && bindingSignatures.size > 1}
                snapshot={snapshot}
              />
            );
          })}
        </div>
      ),
    };
  });
  return (
    <ArticleReaderSectionsV3
      kind="controls"
      label={t("articleReader.controls")}
      sections={sections}
      showHeaders={sections.length > 1 || multiScenario}
    />
  );
}

/** Two controls share a heading only when they read and drive the same Scenarios the same way. */
export function articleReaderControlBindingSignatureV3(
  control: Pick<ExperimentPlacementBriefingControlV2, "binding">,
  visibleScenarioIds: readonly string[],
): string {
  const scenarioIds = (control.binding.mode === "fixed" ? control.binding.scenarioIds : control.binding.allowedScenarioIds)
    .filter((scenarioId) => visibleScenarioIds.includes(scenarioId));
  return `${control.binding.mode}\u001f${[...scenarioIds].sort().join("\u001e")}`;
}

export function ArticleReaderControlV3({
  briefing,
  control,
  definition,
  runtime,
  scenarioColor,
  showTarget = true,
  snapshot,
}: Readonly<{
  briefing: ExperimentPlacementBriefingV2;
  control: ExperimentPlacementBriefingControlV2;
  definition: ControlDefinitionV2;
  runtime: ArticleReaderRuntimeHookV3;
  scenarioColor?: (scenarioId: string) => string;
  /** The section heading already names the target when false. */
  showTarget?: boolean;
  snapshot: ExperimentSnapshotV2;
}>) {
  const { i18n, t } = useTranslation();
  const locale = i18n.language.startsWith("ja") ? "ja" : "en";
  const presentation = resolveWorkbenchControlPresentationV3({
    definition,
    storedLabel: control.label,
    locale,
  });
  const targetIds = controlTargetScenarioIdsV3(
    control,
    runtime.state.activeScenarioId,
  );
  const primaryTargetId =
    targetIds[0] ?? briefing.scenarioScope.initialFocusScenarioId;
  const targetValues = targetIds.map((scenarioId) =>
    readerControlInitialValueV3(
      snapshot,
      scenarioId,
      definition,
      runtime.fixtureProjection,
      runtime.state.fixtureByScenario[scenarioId],
    ));
  const initialProjected = readerControlInitialValueV3(
    snapshot,
    primaryTargetId,
    definition,
    runtime.fixtureProjection,
    runtime.state.fixtureByScenario[primaryTargetId],
  );
  const initialValue = initialProjected.status === "value"
    ? initialProjected.value
    : definition.defaultValue;
  const [value, setValue] = React.useState(initialValue);
  const [error, setError] = React.useState<string | null>(null);
  const committedRef = React.useRef(initialValue);
  const commitInFlightRef = React.useRef(false);
  const controlInstanceId = articleReaderControlInstanceIdV3(control);
  const mixed = targetValues.some((candidate) =>
    candidate.status === "mixed" ||
    (candidate.status === "value" && candidate.value !== initialValue));

  React.useEffect(() => {
    const nextProjected = readerControlInitialValueV3(
      snapshot,
      primaryTargetId,
      definition,
      runtime.fixtureProjection,
      runtime.state.fixtureByScenario[primaryTargetId],
    );
    const next = nextProjected.status === "value"
      ? nextProjected.value
      : definition.defaultValue;
    setValue(next);
    committedRef.current = next;
  }, [
    definition,
    primaryTargetId,
    runtime.fixtureProjection,
    runtime.state.fixtureByScenario,
    snapshot,
  ]);

  const commit = async (next: number) => {
    if (
      (!mixed && next === committedRef.current) || commitInFlightRef.current
    ) return;
    commitInFlightRef.current = true;
    setError(null);
    try {
      await runtime.applyControl({
        controlInstanceId,
        controlId: control.controlId,
        scenarioIds: targetIds,
        value: next,
      });
      committedRef.current = next;
    } catch (cause) {
      setValue(committedRef.current);
      throw cause;
    } finally {
      commitInFlightRef.current = false;
    }
  };
  const pending = runtime.state.pendingControlInstanceId === controlInstanceId;
  const controlsDisabled =
    runtime.state.status === "idle" ||
    runtime.state.status === "starting" ||
    runtime.state.status === "applying-control" ||
    runtime.state.status === "failed" ||
    runtime.state.status === "disposed" ||
    targetIds.length === 0;
  const targetLabels = targetIds.flatMap((scenarioId) => {
    const scenario = snapshot.content.scenarios.find(
      (candidate) => candidate.scenarioId === scenarioId,
    );
    return scenario === undefined ? [] : [scenario.label];
  });
  const contextLabel =
    targetLabels.length > 0
      ? showTarget ? t("articleReader.controlTarget", { scenarios: targetLabels.join(", ") }) : undefined
      : control.binding.mode === "reader-focus"
        ? t("articleReader.noControlTarget")
        : undefined;
  const controlError =
    runtime.state.controlErrorByInstanceId[controlInstanceId] ?? error;

  return (
    <ExperimentNumericControlV3
      contextLabel={contextLabel}
      contextColorHex={showTarget && targetIds[0] !== undefined ? scenarioColor?.(targetIds[0]) : undefined}
      control={definition}
      {...(presentation.description
        ? {
            description: presentation.description,
            descriptionAriaLabel:
              locale === "ja"
                ? `${presentation.label}の説明`
                : `About ${presentation.label}`,
          }
        : {})}
      disabled={controlsDisabled || pending}
      error={controlError}
      label={presentation.label}
      mixed={mixed}
      pending={pending}
      presentation={control.presentation}
      value={value}
      onCommit={async (next) => {
        try {
          await commit(next);
          setValue(next);
          return true;
        } catch (cause) {
          setError(readerErrorMessageV3(cause));
          return false;
        }
      }}
    />
  );
}

export function articleReaderControlInstanceIdV3(
  control: Pick<
    ExperimentPlacementBriefingControlV2,
    "sourcePaneId" | "controlId"
  >,
): string {
  return `${control.sourcePaneId}\u001f${control.controlId}`;
}

/**
 * Non-modal Reader companion surface. The page owns its width and motion so
 * opening Peek changes the available article measure instead of covering it.
 */
export function ArticleReaderExperimentPeekPanelV3({
  children,
  maximized,
  title,
  onClose,
  onOpenExperimentSession,
  onToggleMaximized,
  onTitleCommit,
  toolbar,
  handoffPending = false,
}: Readonly<{
  children: React.ReactNode;
  toolbar?: React.ReactNode;
  handoffPending?: boolean;
  maximized: boolean;
  title: string;
  onClose(): void;
  onOpenExperimentSession?(continuation?: StudioReaderContinuationV3): void;
  onToggleMaximized?(): void;
  onTitleCommit?(title: string): void;
}>) {
  const { t } = useTranslation();
  const panelRef = React.useRef<HTMLElement>(null);
  const titleInputRef = React.useRef<HTMLInputElement>(null);
  const [draftTitle, setDraftTitle] = React.useState(title);
  const [mobile, setMobile] = React.useState(false);
  React.useEffect(() => {
    const media = window.matchMedia(READER_SHEET_QUERY_V3);
    const update = () => setMobile(media.matches);
    update(); media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  React.useEffect(() => {
    if (!mobile) return;
    const article = document.querySelector<HTMLElement>(".article-reader-article-pane");
    const previous = article?.inert ?? false;
    if (article) article.inert = true;
    const trap = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || !panelRef.current?.contains(document.activeElement)) return;
      const elements = [...panelRef.current.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select, summary, [tabindex="0"]')].filter(el => el.getClientRects().length > 0);
      const first = elements[0], last = elements.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", trap);
    return () => { if (article) article.inert = previous; document.removeEventListener("keydown", trap); };
  }, [mobile]);
  React.useEffect(() => {
    if (document.activeElement !== titleInputRef.current) setDraftTitle(title);
  }, [title]);
  React.useEffect(() => {
    const panel = panelRef.current;
    if (panel === null) return undefined;
    const opener =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    panel.querySelector<HTMLElement>("[data-reader-peek-close]")?.focus();
    return () => {
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);
  return (
    <section
      ref={panelRef}
      id="article-reader-experiment-companion-v3"
      role={mobile ? "dialog" : "region"}
      aria-modal={mobile ? true : undefined}
      aria-labelledby="article-reader-peek-title-v3"
      className="article-reader-companion flex h-full min-w-0 flex-col bg-wb-floating text-wb-text"
      data-testid="article-reader-experiment-peek-v3"
      data-reader-presentation="peek"
      data-peek-maximized={maximized ? "true" : "false"}
    >
      <header className="reader-experiment-header flex min-h-12 shrink-0 flex-wrap items-center gap-1 px-3 py-1.5">
        {onTitleCommit === undefined ? (
          <h2
            id="article-reader-peek-title-v3"
            className="reader-experiment-title min-w-0 flex-1 truncate"
          >
            {title}
          </h2>
        ) : (
          <input
            ref={titleInputRef}
            id="article-reader-peek-title-v3"
            value={draftTitle}
            maxLength={240}
            aria-label={t("articleReader.drawerTitle")}
            className="reader-experiment-title min-w-0 flex-1 truncate border-0 bg-transparent p-0 outline-none ring-0 selection:bg-wb-accent/25 focus:outline-none focus:ring-0"
            style={{ caretColor: "var(--wb-accent)" }}
            onChange={(event) => setDraftTitle(event.currentTarget.value)}
            onBlur={() => {
              const normalized = draftTitle.trim();
              onTitleCommit(normalized);
              setDraftTitle(normalized.length > 0 ? normalized : title);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                event.currentTarget.blur();
              } else if (event.key === "Escape") {
                event.preventDefault();
                setDraftTitle(title);
                event.currentTarget.blur();
              }
            }}
          />
        )}
        {toolbar}
        {onOpenExperimentSession && <ReaderExperimentMenuV3 onOpen={onOpenExperimentSession} pending={handoffPending}
          label={t(onTitleCommit ? "articleReader.editBriefing" : "articleReader.openExperimentSession")} />}
        {onToggleMaximized && !mobile && <SimulationIconButtonV3 onClick={onToggleMaximized} aria-pressed={maximized}
          label={t(maximized ? "articleReader.restoreSplitView" : "articleReader.openFullscreen")}>
          {maximized ? <Minimize2 className="h-4 w-4" aria-hidden="true" /> : <Maximize2 className="h-4 w-4" aria-hidden="true" />}
        </SimulationIconButtonV3>}
        <SimulationIconButtonV3 onClick={onClose} data-reader-peek-close label={t("articleReader.closeDrawer")}>
          <X className="h-4 w-4" aria-hidden="true" />
        </SimulationIconButtonV3>
      </header>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
    </section>
  );
}

function ReaderExperimentMenuV3({ onOpen, pending, label }: Readonly<{
  onOpen(): void; pending: boolean; label: string;
}>) {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const escape = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); setOpen(false); ref.current?.querySelector('button')?.focus({ preventScroll: true }); } };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [open]);
  return <div ref={ref} className="relative shrink-0">
    <SimulationIconButtonV3 label={t("articleReader.moreActions")} aria-expanded={open} disabled={pending} onClick={() => setOpen(!open)}>
      {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
    </SimulationIconButtonV3>
    {open && <div className="absolute right-0 top-full z-30 mt-1 w-56 rounded-lg border border-wb-line bg-wb-panel p-1 shadow-xl">
      <button type="button" className="w-full rounded-md px-3 py-2.5 text-left text-sm hover:bg-wb-hover focus-visible:ring-2 focus-visible:ring-wb-accent"
        onClick={() => { setOpen(false); onOpen(); }}>{label}</button>
    </div>}
  </div>;
}

export type ArticleReaderResolvedGraphPresentationV3 = Readonly<{
  /** Exact graph pane pinned by the Snapshot and Placement Briefing. */
  pane: ExperimentSurfaceGraphPaneV2;
  label: string;
  legend: "auto" | "hidden" | "compact" | "full";
  series: readonly ExperimentPlacementBriefingGraphSeriesV2[];
  windowSec: number | undefined;
  historyDepth: number;
  pvTrailBeats: number | undefined;
}>;

/**
 * Materializes the single graph contract consumed by inflow, Peek, and
 * fullscreen. Presentation extent may change, but renderer semantics never do.
 */
export function resolveArticleReaderGraphPresentationV3(
  snapshot: ExperimentSnapshotV2,
  briefing: ExperimentPlacementBriefingGraphV2,
): ArticleReaderResolvedGraphPresentationV3 | null {
  const pane = graphPaneForBriefingV3(snapshot, briefing);
  if (pane === null) return null;
  return Object.freeze({
    pane,
    label: briefing.overrides?.label ?? pane.label,
    legend: briefing.overrides?.legend ?? "auto",
    series: briefingGraphSeriesV3(pane, briefing),
    windowSec: briefing.overrides?.windowSec ?? pane.windowSec,
    historyDepth: briefing.overrides?.historyDepth ?? pane.historyDepth ?? 1,
    pvTrailBeats: briefing.overrides?.pvTrailBeats ?? pane.pvTrailBeats,
  });
}

function graphPaneForBriefingV3(
  snapshot: ExperimentSnapshotV2,
  briefing: ExperimentPlacementBriefingGraphV2,
): ExperimentSurfaceGraphPaneV2 | null {
  return (
    snapshot.content.surface.graphPanes.find(
      ({ paneId }) => paneId === briefing.paneId,
    ) ?? null
  );
}

export function readerStructuralAnalysisRequestsV3(
  briefing: ExperimentPlacementBriefingV2,
  snapshot: ExperimentSnapshotV2,
  contract: ModelContractV2,
  sourceAnalysisId: string = mainWireFormalPvAnalysisIdV1(),
): readonly ArticleReaderStructuralAnalysisRequestV3[] {
  const historyDepthByAnalysisId = new Map<string, number>();
  for (const pickedGraph of briefing.graphs) {
    const resolved = resolveArticleReaderGraphPresentationV3(
      snapshot,
      pickedGraph,
    );
    if (resolved === null) continue;
    const { pane } = resolved;
    const graph = contract.graphCatalog.find(
      ({ graphId }) => graphId === pane.graphId,
    );
    const { historyDepth } = resolved;
    const analysisId =
      graph?.renderer === "structural-return"
        ? sourceAnalysisId
        : graph?.renderer === "pressure-volume" &&
            pane.pressureVolumeAnalysisMode !== "raw-exact-orbit"
          ? sourceAnalysisId
          : null;
    if (analysisId === null) continue;
    historyDepthByAnalysisId.set(
      analysisId,
      Math.max(historyDepthByAnalysisId.get(analysisId) ?? 0, historyDepth),
    );
  }
  if (
    briefing.outputs.some(({ outputId }) =>
      ARTICLE_READER_PERIODIC_PVA_OUTPUT_ID_SET_V3.has(outputId),
    )
  ) {
    historyDepthByAnalysisId.set(
      sourceAnalysisId,
      historyDepthByAnalysisId.get(
        sourceAnalysisId,
      ) ?? 0,
    );
  }
  return Object.freeze(
    [...historyDepthByAnalysisId].map(([analysisId, historyDepth]) =>
      Object.freeze({ analysisId, historyDepth }),
    ),
  );
}

function briefingGraphSeriesV3(
  pane: ExperimentSurfaceGraphPaneV2,
  briefing: ExperimentPlacementBriefingGraphV2,
) {
  return Object.freeze(
    [...(briefing.overrides?.series ?? pane.series)].sort(compareOrderV3),
  );
}

function articleBriefingTraceColorV3(
  briefing: ExperimentPlacementBriefingGraphV2,
  scenarioId: string,
  seriesId: string | null,
): string | null {
  return (
    briefing.overrides?.traceColors?.find(
      (trace) => trace.scenarioId === scenarioId && trace.seriesId === seriesId,
    )?.colorHex ?? null
  );
}

function controlTargetScenarioIdsV3(
  control: ExperimentPlacementBriefingControlV2,
  activeScenarioId: string,
): readonly string[] {
  if (control.binding.mode === "fixed") return control.binding.scenarioIds;
  return control.binding.allowedScenarioIds.includes(activeScenarioId)
    ? [activeScenarioId]
    : [];
}

function readerControlInitialValueV3(
  snapshot: ExperimentSnapshotV2,
  scenarioId: string,
  definition: ControlDefinitionV2,
  projection: ExactModelFixtureProjectionV1,
  currentFixture?: unknown,
): ExactModelResolvedControlValueV1 {
  const fixture = currentFixture ?? snapshot.content.scenarios.find(
    (scenario) => scenario.scenarioId === scenarioId,
  )?.capture.fixture;
  return resolveExactModelControlValueV1(definition, fixture, projection);
}

export function selectedSweepOutputIdsV3(
  graph: SweepGraphDefinitionV2,
  selectedSeries: readonly Readonly<{ seriesId: string }>[],
): readonly string[] {
  const selectedIds = new Set(selectedSeries.map(({ seriesId }) => seriesId));
  return Object.freeze(
    graph.seriesCatalog.flatMap((series) =>
      selectedIds.has(series.seriesId) ? [series.outputId] : [],
    ),
  );
}

export function commonGraphUnitV3(
  contract: ModelContractV2,
  outputIds: readonly string[],
): string | undefined {
  const units = outputIds.flatMap((outputId) => {
    const output = contract.outputCatalog.find(
      (candidate) => candidate.outputId === outputId,
    );
    return output === undefined ? [] : [output.unit];
  });
  return units.length > 0 && units.every((unit) => unit === units[0])
    ? units[0]
    : undefined;
}

function compareOrderV3(
  left: Readonly<{ order: number }>,
  right: Readonly<{ order: number }>,
): number {
  return left.order - right.order;
}

function readerErrorMessageV3(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

function requiredArticleReaderRuntimeCompositionV3(
  composition: StudioClientCompositionV2 | null,
): Readonly<{
  releaseTicket:
    StudioClientCompositionV2["exactModel"]["workerReleaseTicket"];
  fixtureProjection:
    StudioClientCompositionV2["exactModel"]["fixtureProjection"];
  resolveAnalysisExecutionPlan:
    StudioClientCompositionV2["modelSurface"]["analysis"]["resolveExecutionPlan"];
  periodicPvaDerivation:
    StudioClientCompositionV2["modelSurface"]["analysis"]["periodicPvaDerivation"];
}> {
  if (composition === null) {
    throw new Error(
      "Article Reader Standard runtime composition is unavailable",
    );
  }
  return Object.freeze({
    releaseTicket: composition.exactModel.workerReleaseTicket,
    fixtureProjection: composition.exactModel.fixtureProjection,
    resolveAnalysisExecutionPlan: composition.modelSurface.analysis.resolveExecutionPlan,
    periodicPvaDerivation: composition.modelSurface.analysis.periodicPvaDerivation,
  });
}

export function articleReaderBoundedHistoryV3<T>(
  history: readonly T[],
  depth: number,
): readonly T[] {
  if (depth <= 0) return [];
  return history.slice(-depth);
}

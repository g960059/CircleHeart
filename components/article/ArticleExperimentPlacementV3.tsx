import React from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  GripVertical,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAppTheme, type AppThemeId } from "@/appTheme";
import type {
  StudioArticleExperimentBlockV2,
} from "@/studio/contracts/v2/article";
import {
  STUDIO_GRAPH_HISTORY_MAX_DEPTH_V2,
  STUDIO_GRAPH_HISTORY_MIN_DEPTH_V2,
  STUDIO_PV_TRAIL_DEFAULT_BEATS_V2,
  STUDIO_PV_TRAIL_MAX_BEATS_V2,
  STUDIO_SWEEP_WINDOW_MAX_SEC_V2,
  STUDIO_SWEEP_WINDOW_MIN_SEC_V2,
  STUDIO_SWEEP_WINDOW_STEP_SEC_V2,
  type ExperimentPlacementBriefingV2,
  type ExperimentPlacementBriefingControlV2,
  type ExperimentPlacementBriefingGraphSeriesV2,
  type ExperimentPlacementBriefingGraphV2,
  type ExperimentPlacementBriefingOutputV2,
  type ExperimentPlacementBriefingPresentationV2,
  type ExperimentPlacementV2,
  type ExperimentSnapshotV2,
  type ExperimentSurfaceControlItemV2,
  type ExperimentSurfaceControlPaneV2,
  type ExperimentSurfaceGraphPaneV2,
  type ExperimentSurfaceOutputItemV2,
  type ExperimentSurfaceOutputPaneV2,
} from "@/studio/contracts/v2/content";
import type {
  ControlDefinitionV2,
  ModelContractV2,
} from "@/studio/contracts/v2/model";
import {
  resolveWorkbenchAutomaticGraphColorV3,
  workbenchDefaultScenarioColorV3,
} from
  "@/components/workbench/presentation/WorkbenchGraphColorV3";
import {
  articleBriefingPresentationV3,
  defaultArticleBriefingV3,
  materializeSurfaceControlPaneBindingV3,
  materializeSurfaceOutputPaneBindingV3,
  resolveArticlePlacementBriefingV3,
  resolveArticlePlacementTitleV3,
} from "@/studio/application/article/ArticleExperimentPlacementV3";
import {
  articleBriefingViewsV3,
  defaultArticleBriefingPresentationV3,
  suggestedArticleBriefingPresentationV3,
} from "@/studio/application/authoring/StudioArticleBriefingPresentationV3";

export type ArticleExperimentPlacementV3Props = Readonly<{
  block: StudioArticleExperimentBlockV2;
  snapshot: ExperimentSnapshotV2 | null;
  contract?: ModelContractV2 | null;
  index: number;
  total: number;
  showBlockActions?: boolean;
  blockEditorLayout?: boolean;
  onChange: (block: StudioArticleExperimentBlockV2) => void;
  onEdit: () => void;
  onRemove: () => void;
  onMove: (direction: -1 | 1) => void;
}>;

export function ArticleExperimentPlacementV3({
  block,
  snapshot,
  contract = null,
  index,
  total,
  showBlockActions = true,
  blockEditorLayout = false,
  onChange,
  onEdit,
  onRemove,
  onMove,
}: ArticleExperimentPlacementV3Props) {
  const { t } = useTranslation();
  const placement = block.placement;

  const updatePlacement = React.useCallback((next: ExperimentPlacementV2) => {
    onChange(Object.freeze({ ...block, placement: next }));
  }, [block, onChange]);

  if (snapshot === null) {
    return (
      <section
        className={`group rounded-xl bg-wb-danger-soft px-4 py-4 ${blockEditorLayout ? "my-0" : "my-8"}`}
        data-testid="article-experiment-placement-v3"
      >
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-wb-danger">
              {t("articleEditor.missingSnapshot.title")}
            </p>
            <p className="mt-1 break-all font-mono text-[10px] text-wb-muted">
              {placement.snapshotId}
            </p>
          </div>
          {showBlockActions && (
            <PlacementBlockActionsV3
              index={index}
              total={total}
              onMove={onMove}
              onRemove={onRemove}
            />
          )}
        </div>
      </section>
    );
  }

  let briefing: ExperimentPlacementBriefingV2;
  try {
    briefing = resolveArticlePlacementBriefingV3(placement, snapshot);
  } catch {
    return (
      <section
        className={`group rounded-xl bg-wb-danger-soft px-4 py-4 ${blockEditorLayout ? "my-0" : "my-8"}`}
        data-testid="article-experiment-placement-v3"
      >
        <div className="flex items-start gap-3">
          <p className="min-w-0 flex-1 text-sm font-medium text-wb-danger" role="alert">
            {t("articleEditor.invalidBriefing")}
          </p>
          {showBlockActions && (
            <PlacementBlockActionsV3
              index={index}
              total={total}
              onMove={onMove}
              onRemove={onRemove}
            />
          )}
        </div>
      </section>
    );
  }
  const graphPanesById = new Map(
    snapshot.content.surface.graphPanes.map((pane) => [pane.paneId, pane]),
  );
  const selectedCardCount = briefing.graphs.length
    + (briefing.outputs.length > 0 ? 1 : 0)
    + (briefing.controls.length > 0 ? 1 : 0);
  const presentation = articleBriefingPresentationV3(briefing);
  const placementTitle = resolveArticlePlacementTitleV3(placement, briefing);
  if (blockEditorLayout && presentation !== "inflow") {
    return (
      <section
        className="group my-0"
        data-testid="article-experiment-placement-v3"
        data-snapshot-id={snapshot.snapshotId}
        data-static-preview="true"
        data-reader-presentation={presentation}
      >
        <button
          type="button"
          onClick={onEdit}
          aria-label={t("articleEditor.briefing.edit")}
          className="article-reader-peek-anchor article-reader-peek-surface group/anchor flex min-h-20 w-full items-center gap-4 rounded-xl px-4 py-4 text-left outline-none active:scale-[0.995] focus-visible:ring-2 focus-visible:ring-wb-accent sm:px-5"
        >
          <span className="min-w-0 flex-1 truncate text-sm font-semibold tracking-[-0.012em] text-wb-text">
            {placementTitle}
          </span>
          <ChevronRight
            className="h-4 w-4 shrink-0 text-wb-subtle transition-transform duration-150 group-hover/anchor:translate-x-0.5 group-hover/anchor:text-wb-text"
            aria-hidden="true"
          />
        </button>
        <ArticlePlacementCaptionInputV3
          caption={placement.caption}
          onChange={(caption) => updatePlacement(Object.freeze({
            ...placement,
            caption,
          }))}
        />
      </section>
    );
  }

  return (
    <section
      className={`article-editor-inflow-preview group relative rounded-2xl border border-wb-line/60 bg-wb-soft/45 px-3 py-3 sm:px-4 sm:py-4 ${blockEditorLayout ? "my-0" : "my-8"}`}
      data-testid="article-experiment-placement-v3"
      data-snapshot-id={snapshot.snapshotId}
      data-static-preview="true"
      data-reader-presentation={presentation}
    >
      {showBlockActions && (
        <div className="mb-3 flex justify-end">
          <PlacementBlockActionsV3
            index={index}
            total={total}
            onMove={onMove}
            onRemove={onRemove}
          />
        </div>
      )}

      <div
        className="grid grid-cols-1 gap-2.5 md:grid-cols-2"
        aria-label={t("articleEditor.previewLabel")}
      >
        {[...briefing.graphs]
          .sort(compareSemanticOrderV3)
          .map((graph) => {
            const pane = graphPanesById.get(graph.paneId);
            return pane === undefined ? null : (
              <ArticleStaticGraphPreviewV3
                key={graph.paneId}
                graph={graph}
                pane={pane}
                scenarioId={briefing.scenarioScope.initialFocusScenarioId}
                snapshot={snapshot}
              />
            );
          })}
        {briefing.outputs.length > 0 && (
          <ArticleStaticOutputPreviewV3 outputs={briefing.outputs} />
        )}
        {briefing.controls.length > 0 && (
          <ArticleStaticControlPreviewV3 controls={briefing.controls} />
        )}
        {selectedCardCount === 0 && (
          <p className="col-span-full py-8 text-center text-xs text-wb-subtle">
            {t("articleEditor.emptyBriefing")}
          </p>
        )}
      </div>

      {snapshot.content.surface.note.text.length > 0 && (
        <p className="mt-4 whitespace-pre-wrap text-xs leading-6 text-wb-muted">
          {snapshot.content.surface.note.text}
        </p>
      )}

      <ArticlePlacementCaptionInputV3
        caption={placement.caption}
        onChange={(caption) => updatePlacement(Object.freeze({
          ...placement,
          caption,
        }))}
      />

      <button
        type="button"
        onClick={onEdit}
        className="mt-3 inline-flex min-h-8 items-center gap-1.5 rounded-lg px-2 text-[11px] font-medium text-wb-muted transition-[color,background-color,transform] duration-150 hover:bg-wb-hover hover:text-wb-text active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wb-accent"
      >
        <SlidersHorizontal className="h-3.5 w-3.5" />
        {t("articleEditor.briefing.edit")}
      </button>
    </section>
  );
}

function ArticlePlacementCaptionInputV3({
  caption,
  onChange,
}: Readonly<{
  caption: string | null;
  onChange(caption: string): void;
}>) {
  const { t } = useTranslation();
  return (
    <label className="mt-3 block">
      <span className="sr-only">{t("articleEditor.caption")}</span>
      <input
        type="text"
        value={caption ?? ""}
        onChange={(event) => onChange(event.currentTarget.value)}
        placeholder={t("articleEditor.captionPlaceholder")}
        className="w-full bg-transparent py-1 text-xs leading-5 text-wb-muted outline-none placeholder:text-wb-subtle focus:text-wb-text"
      />
    </label>
  );
}

function ArticleStaticGraphPreviewV3({
  graph,
  pane,
  scenarioId,
  snapshot,
}: Readonly<{
  graph: ExperimentPlacementBriefingGraphV2;
  pane: ExperimentSurfaceGraphPaneV2;
  scenarioId: string;
  snapshot: ExperimentSnapshotV2;
}>) {
  const { t } = useTranslation();
  const { appTheme } = useAppTheme();
  const label = graph.overrides?.label ?? pane.label;
  const series = graph.overrides?.series ?? pane.series;
  const legend = graph.overrides?.legend ?? "auto";
  const previewScenarioId = snapshot.content.scenarios.some((scenario) =>
    scenario.scenarioId === scenarioId)
    ? scenarioId
    : snapshot.content.scenarios[0]?.scenarioId;
  return (
    <article
      className={`min-w-0 rounded-xl bg-wb-canvas p-3.5 ${graph.emphasis === "primary" ? "md:col-span-2" : ""}`}
      data-pane-id={pane.paneId}
      data-pane-role="graph"
      data-graph-emphasis={graph.emphasis}
    >
      <header className="flex items-center gap-2">
        <h3 className="min-w-0 flex-1 truncate text-[11px] font-semibold">
          {label}
        </h3>
        <span className="text-[11px] tabular-nums text-wb-subtle">
          {t("articleEditor.role.graph")}
        </span>
      </header>

      <div className="mt-3 rounded-lg bg-transparent px-3 py-4">
        {legend !== "hidden" && (
          <div className="flex min-h-12 flex-wrap content-center gap-x-3 gap-y-2">
            {[...series].sort(compareSemanticOrderV3).map((item) => (
              <span
                key={item.seriesId}
                className="inline-flex items-center gap-1.5 text-[11px] text-wb-muted"
              >
                <span
                  className="h-px w-4"
                  style={{
                    backgroundColor: articlePreviewTraceColorV3(
                      graph,
                      pane,
                      previewScenarioId,
                      item.seriesId,
                      appTheme,
                    ),
                  }}
                  aria-hidden="true"
                />
                {item.label}
              </span>
            ))}
          </div>
        )}
        <p className="mt-2 text-[11px] text-wb-subtle">
          {t("articleEditor.staticDataNotice")}
        </p>
      </div>
    </article>
  );
}

function articlePreviewTraceColorV3(
  graph: ExperimentPlacementBriefingGraphV2,
  pane: ExperimentSurfaceGraphPaneV2,
  scenarioId: string | undefined,
  seriesId: string | null,
  appTheme: AppThemeId,
): string {
  if (scenarioId === undefined) return "#64748b";
  const custom = graph.overrides?.traceColors?.find((trace) =>
    trace.scenarioId === scenarioId && trace.seriesId === seriesId
  )?.colorHex
    ?? pane.traceColors?.find((trace) =>
      trace.scenarioId === scenarioId && trace.seriesId === seriesId
    )?.customColorHex;
  if (custom !== undefined) return custom;
  const automatic = pane.traceColors?.find((trace) =>
    trace.scenarioId === scenarioId && trace.seriesId === seriesId
  )?.automaticColorHex ?? "#64748b";
  return resolveWorkbenchAutomaticGraphColorV3({
    colorHex: automatic,
    appTheme,
  });
}

function ArticleStaticOutputPreviewV3({
  outputs,
}: Readonly<{
  outputs: readonly ExperimentPlacementBriefingOutputV2[];
}>) {
  const { t } = useTranslation();
  return (
    <article className="min-w-0 rounded-xl bg-wb-inspector p-3.5" data-pane-role="output">
      <h3 className="text-[11px] font-semibold">{t("articleEditor.role.output")}</h3>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
        {[...outputs].sort(compareSemanticOrderV3).map((item) => (
          <div
            key={`${item.sourcePaneId}:${item.outputId}:${item.scenarioId}`}
            className="min-w-0"
          >
            <dt className="truncate text-[11px] text-wb-muted">{item.label}</dt>
            <dd className="mt-0.5 font-mono text-sm text-wb-subtle">—</dd>
          </div>
        ))}
      </dl>
    </article>
  );
}

function ArticleStaticControlPreviewV3({
  controls,
}: Readonly<{
  controls: readonly ExperimentPlacementBriefingControlV2[];
}>) {
  const { t } = useTranslation();
  return (
    <article className="min-w-0 rounded-xl bg-wb-inspector p-3.5" data-pane-role="control">
      <h3 className="text-[11px] font-semibold">{t("articleEditor.role.control")}</h3>
      <ul className="mt-3 grid gap-3">
        {[...controls].sort(compareSemanticOrderV3).map((item) => (
          <li
            key={`${item.sourcePaneId}:${item.controlId}`}
            className="min-w-0 text-[11px] text-wb-muted"
          >
            <span className="block truncate">{item.label}</span>
            {item.presentation.kind === "buttons" ? (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {item.presentation.options.map((option) => (
                  <span
                    key={`${option.label}:${option.value}`}
                    className="rounded-md bg-wb-soft px-2 py-1 text-[11px] text-wb-subtle"
                  >
                    {option.label}
                  </span>
                ))}
              </div>
            ) : (
              <span className="mt-2 block h-1 rounded-full bg-wb-soft" aria-hidden="true" />
            )}
          </li>
        ))}
      </ul>
    </article>
  );
}

export type ArticleBriefingEditorV3Props = Readonly<{
  snapshot: ExperimentSnapshotV2;
  briefing?: ExperimentPlacementBriefingV2 | null;
  contract?: ModelContractV2 | null;
  showIntro?: boolean;
  testId?: string;
  /** Active Workbench Scenario used only when a new active-slot control is picked. */
  captureScenarioId?: string;
  onChange: (briefing: ExperimentPlacementBriefingV2) => void;
}>;

/**
 * Edits one role-specific Article Briefing against an immutable Snapshot.
 *
 * The editor intentionally owns neither an Article Placement nor persistence.
 * Article and Workbench callers can therefore share exactly the same Briefing
 * semantics while adapting the returned value to their own storage boundary.
 */
export function ArticleBriefingEditorV3({
  captureScenarioId,
  contract = null,
  briefing: authoredBriefing = null,
  showIntro = true,
  snapshot,
  testId = "article-briefing-editor-v3",
  onChange,
}: ArticleBriefingEditorV3Props) {
  const { t } = useTranslation();
  const briefing = authoredBriefing ?? defaultArticleBriefingV3(snapshot);
  const graphPanes = [...snapshot.content.surface.graphPanes]
    .sort(compareSemanticOrderV3);
  const outputItems = collectSurfaceOutputItemsV3(snapshot);
  const controlItems = collectSurfaceControlItemsV3(snapshot);
  const graphByPaneId = new Map(
    briefing.graphs.map((graph) => [graph.paneId, graph]),
  );
  const outputById = new Map(
    briefing.outputs.map((output) => [
      briefingOutputKeyV3(output.sourcePaneId, output.outputId),
      output,
    ]),
  );
  const controlById = new Map(
    briefing.controls.map((control) => [
      briefingControlKeyV3(control.sourcePaneId, control.controlId),
      control,
    ]),
  );

  const updateBriefing = (next: ExperimentPlacementBriefingV2) => {
    onChange(Object.freeze(next));
  };

  const updateScenarioScope = (
    visibleScenarioIds: readonly string[],
    preferredFocusScenarioId: string,
  ) => {
    if (visibleScenarioIds.length === 0) return;
    const initialFocusScenarioId = visibleScenarioIds.includes(
      preferredFocusScenarioId,
    )
      ? preferredFocusScenarioId
      : visibleScenarioIds[0]!;
    updateBriefing({
      ...briefing,
      scenarioScope: { visibleScenarioIds, initialFocusScenarioId },
      outputs: briefing.outputs.filter((output) =>
        visibleScenarioIds.includes(output.scenarioId)),
      controls: briefing.controls.map((control) => ({
        ...control,
        binding: reconcileControlBindingScopeV3(
          control.binding,
          visibleScenarioIds,
          initialFocusScenarioId,
        ),
      })),
    });
  };

  const toggleGraph = (pane: ExperimentSurfaceGraphPaneV2, enabled: boolean) => {
    const next = enabled
      ? [...briefing.graphs, {
        paneId: pane.paneId,
        order: briefing.graphs.length,
        emphasis: briefing.graphs.length === 0
          ? "primary" as const
          : "supporting" as const,
      }]
      : briefing.graphs.filter(({ paneId }) => paneId !== pane.paneId);
    const graphs = normalizeGraphOrderV3(next);
    updateBriefing({
      ...briefing,
      graphs,
      ...reconcilePresentationViewsV3(briefing.presentation, graphs),
    });
  };

  const updatePresentation = (
    patch: Partial<ExperimentPlacementBriefingPresentationV2>,
  ) => {
    updateBriefing({
      ...briefing,
      presentation: {
        ...(briefing.presentation ?? defaultArticleBriefingPresentationV3(briefing)),
        ...patch,
      },
    });
  };

  const updateGraph = (next: ExperimentPlacementBriefingGraphV2) => {
    updateBriefing({
      ...briefing,
      graphs: normalizeGraphOrderV3(briefing.graphs.map((graph) =>
        graph.paneId === next.paneId
          ? next
          : next.emphasis === "primary"
            ? { ...graph, emphasis: "supporting" as const }
            : graph)),
    });
  };

  const moveGraph = (paneId: string, direction: -1 | 1) => {
    updateBriefing({
      ...briefing,
      graphs: moveOrderedItemV3(briefing.graphs, paneId, direction, "paneId"),
    });
  };

  const toggleOutput = (source: SurfaceOutputItemV3, enabled: boolean) => {
    const sourceKey = briefingOutputKeyV3(
      source.pane.paneId,
      source.item.outputId,
    );
    const bindingCaptureScenarioId = captureScenarioId !== undefined &&
      snapshot.content.scenarios.some(({ scenarioId }) =>
        scenarioId === captureScenarioId)
      ? captureScenarioId
      : briefing.scenarioScope.initialFocusScenarioId;
    updateBriefing({
      ...briefing,
      outputs: enabled
        ? normalizeSemanticOrderV3([...briefing.outputs, {
          sourcePaneId: source.pane.paneId,
          outputId: source.item.outputId,
          scenarioId: materializeSurfaceOutputPaneBindingV3(
            source.pane.binding,
            bindingCaptureScenarioId,
            briefing.scenarioScope.visibleScenarioIds,
          ),
          label: source.item.label,
          order: briefing.outputs.length,
        }])
        : normalizeSemanticOrderV3(
          briefing.outputs.filter((output) =>
            briefingOutputKeyV3(output.sourcePaneId, output.outputId)
              !== sourceKey),
        ),
    });
  };

  const toggleControl = (
    source: SurfaceControlItemV3,
    enabled: boolean,
  ) => {
    const sourceKey = briefingControlKeyV3(
      source.pane.paneId,
      source.item.controlId,
    );
    const bindingCaptureScenarioId = captureScenarioId !== undefined &&
      snapshot.content.scenarios.some(({ scenarioId }) =>
        scenarioId === captureScenarioId)
      ? captureScenarioId
      : briefing.scenarioScope.initialFocusScenarioId;
    updateBriefing({
      ...briefing,
      controls: enabled
        ? normalizeSemanticOrderV3([...briefing.controls, {
          sourcePaneId: source.pane.paneId,
          controlId: source.item.controlId,
          label: source.item.label,
          order: briefing.controls.length,
          presentation: source.item.presentation.kind === "buttons"
            ? {
                kind: "buttons" as const,
                options: source.item.presentation.options.map((option) => ({
                  ...option,
                })),
              }
            : { kind: "slider" as const },
          binding: materializeSurfaceControlPaneBindingV3(
            source.pane.binding,
            bindingCaptureScenarioId,
            briefing.scenarioScope.visibleScenarioIds,
          ),
        }])
        : normalizeSemanticOrderV3(
          briefing.controls.filter((control) =>
            briefingControlKeyV3(control.sourcePaneId, control.controlId)
              !== sourceKey),
        ),
    });
  };

  const selectedCount = briefing.graphs.length
    + briefing.outputs.length
    + briefing.controls.length;

  return (
    <div
      className="mt-3 rounded-xl bg-wb-floating px-3 py-3.5 sm:px-4"
      data-testid={testId}
    >
      {showIntro && (
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold">{t("articleEditor.briefing.title")}</p>
            <p className="mt-1 text-[10px] leading-4 text-wb-subtle">
              {t("articleEditor.briefing.description")}
            </p>
          </div>
          <span className="shrink-0 text-[10px] tabular-nums text-wb-subtle">
            {t("articleEditor.briefing.selected", { count: selectedCount })}
          </span>
        </div>
      )}

      <fieldset className="mt-4">
        <legend className="text-[10px] font-semibold uppercase tracking-[0.12em] text-wb-subtle">
          {t("articleEditor.briefing.scenarios")}
        </legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {snapshot.content.scenarios.map((scenario) => {
            const selected = briefing.scenarioScope.visibleScenarioIds.includes(
              scenario.scenarioId,
            );
            return (
              <label
                key={scenario.scenarioId}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-wb-soft px-2.5 py-1.5 text-[10px] text-wb-muted"
              >
                <input
                  type="checkbox"
                  checked={selected}
                  disabled={selected && briefing.scenarioScope.visibleScenarioIds.length === 1}
                  onChange={(event) => {
                    const selectedSet = new Set(
                      briefing.scenarioScope.visibleScenarioIds,
                    );
                    if (event.currentTarget.checked) {
                      selectedSet.add(scenario.scenarioId);
                    } else {
                      selectedSet.delete(scenario.scenarioId);
                    }
                    const nextVisible = snapshot.content.scenarios
                      .map(({ scenarioId }) => scenarioId)
                      .filter((scenarioId) => selectedSet.has(scenarioId));
                    updateScenarioScope(
                      nextVisible,
                      briefing.scenarioScope.initialFocusScenarioId,
                    );
                  }}
                  className="h-3 w-3 accent-wb-accent"
                />
                {scenario.label}
              </label>
            );
          })}
        </div>
        <label className="mt-2 flex items-center gap-2 text-[10px] text-wb-muted">
          <span>{t("articleEditor.briefing.initialFocus")}</span>
          <select
            value={briefing.scenarioScope.initialFocusScenarioId}
            onChange={(event) => updateScenarioScope(
              briefing.scenarioScope.visibleScenarioIds,
              event.currentTarget.value,
            )}
            className="h-8 min-w-0 rounded-md bg-wb-input px-2 text-[10px] outline-none focus:ring-2 focus:ring-wb-accent"
          >
            {snapshot.content.scenarios
              .filter(({ scenarioId }) =>
                briefing.scenarioScope.visibleScenarioIds.includes(scenarioId))
              .map((scenario) => (
                <option key={scenario.scenarioId} value={scenario.scenarioId}>
                  {scenario.label}
                </option>
              ))}
          </select>
        </label>
      </fieldset>

      <BriefingReadingFormV3
        briefing={briefing}
        graphLabel={(paneId) => graphPanes.find((pane) => pane.paneId === paneId)?.label ?? paneId}
        onChange={updatePresentation}
      />

      <BriefingSectionV3 label={t("articleEditor.role.graph")}>
        {graphPanes.map((pane) => (
          <GraphBriefingRowV3
            key={pane.paneId}
            pane={pane}
            graph={graphByPaneId.get(pane.paneId)}
            scenarios={snapshot.content.scenarios.filter(({ scenarioId }) =>
              briefing.scenarioScope.visibleScenarioIds.includes(scenarioId))}
            selectedGraphs={briefing.graphs}
            onToggle={(enabled) => toggleGraph(pane, enabled)}
            onChange={updateGraph}
            onMove={(direction) => moveGraph(pane.paneId, direction)}
          />
        ))}
      </BriefingSectionV3>

      <BriefingSectionV3 label={t("articleEditor.role.output")}>
        {outputItems.map((source) => {
          const sourceKey = briefingOutputKeyV3(
            source.pane.paneId,
            source.item.outputId,
          );
          const selected = outputById.get(sourceKey);
          const scenarioId = selected?.scenarioId
            ?? materializeSurfaceOutputPaneBindingV3(
              source.pane.binding,
              captureScenarioId ?? briefing.scenarioScope.initialFocusScenarioId,
              briefing.scenarioScope.visibleScenarioIds,
            );
          const scenarioLabel = snapshot.content.scenarios.find((scenario) =>
            scenario.scenarioId === scenarioId)?.label ?? scenarioId;
          return <OutputBriefingRowV3
            key={sourceKey}
            label={source.item.label}
            scenarioLabel={scenarioLabel}
            selected={selected}
            selectedItems={briefing.outputs}
            onToggle={(enabled) => toggleOutput(source, enabled)}
            onChange={(next) => updateBriefing({
              ...briefing,
              outputs: briefing.outputs.map((output) =>
                briefingOutputKeyV3(output.sourcePaneId, output.outputId)
                    === sourceKey
                  ? next
                  : output),
            })}
            onMove={(direction) => updateBriefing({
              ...briefing,
              outputs: moveBriefingOutputV3(
                briefing.outputs,
                source.pane.paneId,
                source.item.outputId,
                direction,
              ),
            })}
          />
        })}
      </BriefingSectionV3>

      <BriefingSectionV3 label={t("articleEditor.role.control")}>
        {controlItems.map((source) => {
          const sourceKey = briefingControlKeyV3(
            source.pane.paneId,
            source.item.controlId,
          );
          return (
          <ControlBriefingRowV3
            key={sourceKey}
            item={source.item}
            sourcePaneId={source.pane.paneId}
            definition={contract?.controlCatalog.find(({ controlId }) =>
              controlId === source.item.controlId)}
            control={controlById.get(sourceKey)}
            selectedControls={briefing.controls}
            scenarios={snapshot.content.scenarios}
            visibleScenarioIds={briefing.scenarioScope.visibleScenarioIds}
            initialFocusScenarioId={briefing.scenarioScope.initialFocusScenarioId}
            onToggle={(enabled) => toggleControl(source, enabled)}
            onChange={(next) => updateBriefing({
              ...briefing,
              controls: briefing.controls.map((control) =>
                briefingControlKeyV3(
                  control.sourcePaneId,
                  control.controlId,
                ) === briefingControlKeyV3(
                  next.sourcePaneId,
                  next.controlId,
                ) ? next : control),
            })}
            onMove={(direction) => updateBriefing({
              ...briefing,
              controls: moveBriefingControlV3(
                briefing.controls,
                source.pane.paneId,
                source.item.controlId,
                direction,
              ),
            })}
          />
          );
        })}
      </BriefingSectionV3>
    </div>
  );
}

/** Sealed views may only name selected graphs; dropping a graph drops it from its view. */
function reconcilePresentationViewsV3(
  presentation: ExperimentPlacementBriefingPresentationV2 | undefined,
  graphs: readonly ExperimentPlacementBriefingGraphV2[],
): Pick<ExperimentPlacementBriefingV2, "presentation"> {
  if (presentation?.views === undefined) return presentation === undefined ? {} : { presentation };
  const selected = new Set(graphs.map(({ paneId }) => paneId));
  const views = presentation.views
    .map((view) => ({ paneIds: view.paneIds.filter((paneId) => selected.has(paneId)) }))
    .filter((view) => view.paneIds.length > 0);
  return { presentation: { ...presentation, views } };
}

/**
 * The author seals how the Placement reads: where it rests, which graphs
 * share a view, and whether expensive analyses re-run on every control change.
 */
function BriefingReadingFormV3({
  briefing,
  graphLabel,
  onChange,
}: Readonly<{
  briefing: ExperimentPlacementBriefingV2;
  graphLabel: (paneId: string) => string;
  onChange: (patch: Partial<ExperimentPlacementBriefingPresentationV2>) => void;
}>) {
  const { t } = useTranslation();
  const effective = briefing.presentation ?? defaultArticleBriefingPresentationV3(briefing);
  const suggested = suggestedArticleBriefingPresentationV3(briefing) === "inflow" ? "inline" : "peek";
  const extentLabel = (extent: ExperimentPlacementBriefingPresentationV2["extent"]) =>
    t(extent === "inline" ? "articleEditor.briefing.extentInline"
      : extent === "peek" ? "articleEditor.briefing.extentPeek" : "articleEditor.briefing.extentFull");
  const ordered = [...briefing.graphs].sort(compareSemanticOrderV3);
  const views = articleBriefingViewsV3(briefing);
  const viewIndexOf = (paneId: string) => views.findIndex((view) => view.paneIds.includes(paneId));
  const paired = (index: number) => index > 0
    && viewIndexOf(ordered[index]!.paneId) === viewIndexOf(ordered[index - 1]!.paneId);
  const setPaired = (index: number, on: boolean) => {
    const flags = ordered.map((_, candidate) => candidate === index ? on : paired(candidate));
    const next: string[][] = [];
    ordered.forEach((graph, candidate) => {
      const current = next.at(-1);
      if (candidate > 0 && flags[candidate] && current !== undefined && current.length === 1) current.push(graph.paneId);
      else next.push([graph.paneId]);
    });
    onChange({ views: next.map((paneIds) => ({ paneIds })) });
  };
  const segment = <T extends string>(
    groupLabel: string,
    value: T,
    options: readonly Readonly<{ value: T; label: string }>[],
    select: (value: T) => void,
  ) => (
    <div className="workbench-control-segments article-briefing-segments" role="radiogroup" aria-label={groupLabel}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          data-active={option.value === value ? "true" : "false"}
          className="workbench-control-segment text-[10px]"
          onClick={() => select(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
  return (
    <fieldset className="mt-4 border-t border-wb-line/60 pt-3" data-testid="article-briefing-reading-form-v3">
      <legend className="px-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-wb-subtle">
        {t("articleEditor.briefing.reading")}
      </legend>
      <div className="grid gap-3 px-1 text-[10px] text-wb-muted">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span>{t("articleEditor.briefing.extent")}</span>
          {segment(t("articleEditor.briefing.extent"), effective.extent, [
            { value: "inline" as const, label: extentLabel("inline") },
            { value: "peek" as const, label: extentLabel("peek") },
            { value: "full" as const, label: extentLabel("full") },
          ], (extent) => onChange({ extent }))}
          <span className="text-wb-subtle">
            {t("articleEditor.briefing.extentSuggested", { extent: extentLabel(suggested) })}
          </span>
        </div>
        {ordered.length > 1 && (
          <div>
            <p>{t("articleEditor.briefing.views")}</p>
            <p className="text-wb-subtle">{t("articleEditor.briefing.viewsHint")}</p>
            <div className="mt-1 grid gap-1">
              {ordered.map((graph, index) => index === 0 ? null : (
                <label key={graph.paneId} className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-3 w-3 accent-wb-accent"
                    checked={paired(index)}
                    disabled={index > 1 && paired(index - 1)}
                    onChange={(event) => setPaired(index, event.currentTarget.checked)}
                  />
                  <span className="truncate">
                    {t("articleReader.viewPair", {
                      first: graphLabel(ordered[index - 1]!.paneId),
                      second: graphLabel(graph.paneId),
                    })}
                    {" · "}
                    {t(paired(index) ? "articleEditor.briefing.viewPairWithPrevious" : "articleEditor.briefing.viewSingle")}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span>{t("articleEditor.briefing.analysisRecompute")}</span>
          {segment(t("articleEditor.briefing.analysisRecompute"), effective.analysisRecompute ?? "on-request", [
            { value: "on-request" as const, label: t("articleEditor.briefing.analysisOnRequest") },
            { value: "automatic" as const, label: t("articleEditor.briefing.analysisAutomatic") },
          ], (analysisRecompute) => onChange({ analysisRecompute }))}
          <span className="basis-full text-wb-subtle">{t("articleEditor.briefing.analysisRecomputeHint")}</span>
        </div>
      </div>
    </fieldset>
  );
}

function BriefingSectionV3({
  label,
  children,
}: Readonly<{
  label: string;
  children: React.ReactNode;
}>) {
  return (
    <fieldset className="mt-4 border-t border-wb-line/60 pt-3">
      <legend className="px-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-wb-subtle">
        {label}
      </legend>
      <div className="grid gap-1.5">{children}</div>
    </fieldset>
  );
}

function GraphBriefingRowV3({
  pane,
  graph,
  scenarios,
  selectedGraphs,
  onToggle,
  onChange,
  onMove,
}: Readonly<{
  pane: ExperimentSurfaceGraphPaneV2;
  graph: ExperimentPlacementBriefingGraphV2 | undefined;
  scenarios: ExperimentSnapshotV2["content"]["scenarios"];
  selectedGraphs: readonly ExperimentPlacementBriefingGraphV2[];
  onToggle: (enabled: boolean) => void;
  onChange: (graph: ExperimentPlacementBriefingGraphV2) => void;
  onMove: (direction: -1 | 1) => void;
}>) {
  const { t } = useTranslation();
  const effectiveSeries = graph?.overrides?.series ?? pane.series;
  const updateOverrides = (
    patch: Partial<NonNullable<ExperimentPlacementBriefingGraphV2["overrides"]>>,
  ) => {
    if (graph === undefined) return;
    onChange({
      ...graph,
      overrides: { ...graph.overrides, ...patch },
    });
  };
  const materializedSeries = (): ExperimentPlacementBriefingGraphSeriesV2[] =>
    effectiveSeries.map((series) => ({ ...series }));
  const updateSeries = (
    next: readonly ExperimentPlacementBriefingGraphSeriesV2[],
  ) => updateOverrides({ series: normalizeSemanticOrderV3(next) });
  const updateTraceColor = (
    scenarioId: string,
    seriesId: string | null,
    colorHex: string | null,
  ) => {
    const retained = (graph?.overrides?.traceColors ?? []).filter((trace) =>
      trace.scenarioId !== scenarioId || trace.seriesId !== seriesId);
    updateOverrides({
      traceColors: colorHex === null
        ? retained
        : [...retained, { scenarioId, seriesId, colorHex }],
    });
  };

  return (
    <div className="rounded-lg px-2 py-1.5 hover:bg-wb-hover">
      <div className="flex min-h-8 items-center gap-2">
        <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={graph !== undefined}
            onChange={(event) => onToggle(event.currentTarget.checked)}
            className="h-3.5 w-3.5 accent-wb-accent"
          />
          <span className="truncate text-[11px] font-medium">{pane.label}</span>
        </label>
        {graph !== undefined && (
          <OrderControlsV3
            order={graph.order}
            count={selectedGraphs.length}
            onMove={onMove}
          />
        )}
      </div>

      {graph !== undefined && (
        <details className="ml-5 mt-1 rounded-md bg-wb-soft/60 px-2.5 py-2 text-[10px] text-wb-muted">
          <summary className="cursor-pointer select-none font-medium">
            {t("articleEditor.briefing.settings")}
          </summary>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <LabeledTextInputV3
              label={t("articleEditor.briefing.label")}
              value={graph.overrides?.label ?? pane.label}
              onCommit={(label) => updateOverrides({ label: label || pane.label })}
            />
            <label className="grid gap-1">
              <span>{t("articleEditor.briefing.emphasis")}</span>
              <select
                value={graph.emphasis}
                onChange={(event) => onChange({
                  ...graph,
                  emphasis: event.currentTarget.value === "primary"
                    ? "primary"
                    : "supporting",
                })}
                className="h-8 rounded-md bg-wb-input px-2 outline-none focus:ring-2 focus:ring-wb-accent"
              >
                <option value="primary">{t("articleEditor.briefing.primary")}</option>
                <option value="supporting">{t("articleEditor.briefing.supporting")}</option>
              </select>
            </label>
            <label className="grid gap-1">
              <span>{t("articleEditor.briefing.legend")}</span>
              <select
                value={graph.overrides?.legend ?? "auto"}
                onChange={(event) => updateOverrides({
                  legend: event.currentTarget.value as "auto" | "hidden" | "compact" | "full",
                })}
                className="h-8 rounded-md bg-wb-input px-2 outline-none focus:ring-2 focus:ring-wb-accent"
              >
                <option value="auto">{t("articleEditor.briefing.auto")}</option>
                <option value="compact">{t("articleEditor.briefing.compact")}</option>
                <option value="full">{t("articleEditor.briefing.full")}</option>
                <option value="hidden">{t("articleEditor.briefing.hidden")}</option>
              </select>
            </label>
            {pane.windowSec !== undefined && (
              <LabeledNumberInputV3
                label={t("articleEditor.briefing.window")}
                value={graph.overrides?.windowSec ?? pane.windowSec}
                min={STUDIO_SWEEP_WINDOW_MIN_SEC_V2}
                max={STUDIO_SWEEP_WINDOW_MAX_SEC_V2}
                step={STUDIO_SWEEP_WINDOW_STEP_SEC_V2}
                onCommit={(windowSec) => updateOverrides({ windowSec })}
              />
            )}
            {pane.historyDepth !== undefined && (
              <LabeledNumberInputV3
                label={t("articleEditor.briefing.history")}
                value={graph.overrides?.historyDepth ?? pane.historyDepth}
                min={STUDIO_GRAPH_HISTORY_MIN_DEPTH_V2}
                max={STUDIO_GRAPH_HISTORY_MAX_DEPTH_V2}
                step={1}
                onCommit={(historyDepth) => updateOverrides({ historyDepth })}
              />
            )}
            {pane.pressureVolumeAnalysisMode !== undefined && <LabeledNumberInputV3
              label={t("workbench.editor.pvTrailBeats")}
              value={graph.overrides?.pvTrailBeats ?? pane.pvTrailBeats ?? STUDIO_PV_TRAIL_DEFAULT_BEATS_V2}
              min={0} max={STUDIO_PV_TRAIL_MAX_BEATS_V2} step={1}
              onCommit={pvTrailBeats => updateOverrides({ pvTrailBeats })}
            />}
          </div>

          {pane.series.length > 0 && (
            <div className="mt-3 grid gap-2">
              <span className="font-medium">{t("articleEditor.briefing.series")}</span>
              {pane.series.map((sourceSeries) => {
                const selectedSeries = effectiveSeries.find(({ seriesId }) =>
                  seriesId === sourceSeries.seriesId);
                return (
                  <div
                    key={sourceSeries.seriesId}
                    className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2"
                  >
                    <input
                      type="checkbox"
                      checked={selectedSeries !== undefined}
                      disabled={selectedSeries !== undefined && effectiveSeries.length === 1}
                      onChange={(event) => {
                        const nextIds = new Set(
                          effectiveSeries.map(({ seriesId }) => seriesId),
                        );
                        if (event.currentTarget.checked) {
                          nextIds.add(sourceSeries.seriesId);
                        } else {
                          nextIds.delete(sourceSeries.seriesId);
                        }
                        const currentById = new Map(
                          materializedSeries().map((series) => [series.seriesId, series]),
                        );
                        updateSeries(pane.series
                          .filter(({ seriesId }) => nextIds.has(seriesId))
                          .map((series) => currentById.get(series.seriesId) ?? { ...series }));
                      }}
                      aria-label={sourceSeries.label}
                      className="h-3.5 w-3.5 accent-wb-accent"
                    />
                    <input
                      key={`${sourceSeries.seriesId}:${selectedSeries?.label ?? sourceSeries.label}`}
                      type="text"
                      disabled={selectedSeries === undefined}
                      defaultValue={selectedSeries?.label ?? sourceSeries.label}
                      onBlur={(event) => {
                        if (selectedSeries === undefined) return;
                        const label = event.currentTarget.value.trim()
                          || sourceSeries.label;
                        updateSeries(materializedSeries().map((series) =>
                          series.seriesId === sourceSeries.seriesId
                            ? { ...series, label }
                            : series));
                      }}
                      className="h-8 min-w-0 rounded-md bg-wb-input px-2 outline-none disabled:opacity-40 focus:ring-2 focus:ring-wb-accent"
                    />
                  </div>
                );
              })}
            </div>
          )}

          {scenarios.length > 0 && (
            <div className="mt-3 grid gap-2">
              <span className="font-medium">
                {t("articleEditor.briefing.color")}
              </span>
              {scenarios.map((scenario, scenarioIndex) => {
                const items = pane.series.length === 0
                  ? [{ seriesId: null, label: "Guyton / Starling" }]
                  : effectiveSeries;
                return (
                  <div
                    key={scenario.scenarioId}
                    className="rounded-md bg-wb-inspector/70 px-2.5 py-2"
                  >
                    {scenarios.length > 1 && (
                      <p className="mb-2 truncate font-medium text-wb-text">
                        {scenario.label}
                      </p>
                    )}
                    <div className="grid gap-1.5 sm:grid-cols-2">
                      {items.map((item, itemIndex) => {
                        const source = pane.traceColors?.find((trace) =>
                          trace.scenarioId === scenario.scenarioId
                          && trace.seriesId === item.seriesId);
                        const override = graph.overrides?.traceColors?.find(
                          (trace) =>
                            trace.scenarioId === scenario.scenarioId
                            && trace.seriesId === item.seriesId,
                        );
                        const fallback = source?.customColorHex
                          ?? source?.automaticColorHex
                          ?? workbenchDefaultScenarioColorV3(scenarioIndex);
                        return (
                          <label
                            key={item.seriesId ?? `structural-${itemIndex}`}
                            className="grid grid-cols-[minmax(0,1fr)_2rem_2rem] items-center gap-1.5"
                          >
                            <span className="truncate">{item.label}</span>
                            <input
                              type="color"
                              value={override?.colorHex ?? fallback}
                              onChange={(event) => updateTraceColor(
                                scenario.scenarioId,
                                item.seriesId,
                                event.currentTarget.value,
                              )}
                              aria-label={`${scenario.label} ${item.label} ${t("articleEditor.briefing.color")}`}
                              className="h-7 w-8 cursor-pointer rounded border-0 bg-transparent p-0"
                            />
                            <button
                              type="button"
                              disabled={override === undefined}
                              aria-label={t("workbench.editor.resetColor")}
                              title={t("workbench.editor.resetColor")}
                              className="inline-flex h-7 w-7 items-center justify-center rounded text-wb-subtle hover:bg-wb-hover hover:text-wb-text disabled:invisible"
                              onClick={() => updateTraceColor(
                                scenario.scenarioId,
                                item.seriesId,
                                null,
                              )}
                            >
                              <X className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </details>
      )}
    </div>
  );
}

function OutputBriefingRowV3({
  label,
  scenarioLabel,
  selected,
  selectedItems,
  onToggle,
  onChange,
  onMove,
}: Readonly<{
  label: string;
  scenarioLabel: string;
  selected: ExperimentPlacementBriefingOutputV2 | undefined;
  selectedItems: readonly ExperimentPlacementBriefingOutputV2[];
  onToggle: (enabled: boolean) => void;
  onChange: (item: ExperimentPlacementBriefingOutputV2) => void;
  onMove: (direction: -1 | 1) => void;
}>) {
  const { t } = useTranslation();
  return (
    <div className="rounded-lg px-2 py-1.5 hover:bg-wb-hover">
      <div className="flex min-h-8 items-center gap-2">
        <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={selected !== undefined}
            onChange={(event) => onToggle(event.currentTarget.checked)}
            className="h-3.5 w-3.5 accent-wb-accent"
          />
          <span className="min-w-0">
            <span className="block truncate text-[11px] font-medium">
              {label}
            </span>
            <span className="block truncate text-[9px] text-wb-subtle">
              {scenarioLabel}
            </span>
          </span>
        </label>
        {selected !== undefined && (
          <OrderControlsV3
            order={selected.order}
            count={selectedItems.length}
            onMove={onMove}
          />
        )}
      </div>
      {selected !== undefined && (
        <div className="ml-5 mt-1 max-w-xs">
          <LabeledTextInputV3
            label={t("articleEditor.briefing.label")}
            value={selected.label}
            onCommit={(nextLabel) => onChange({
              ...selected,
              label: nextLabel || label,
            })}
          />
        </div>
      )}
    </div>
  );
}

function ControlBriefingRowV3({
  definition,
  item,
  sourcePaneId,
  control,
  selectedControls,
  scenarios,
  visibleScenarioIds,
  initialFocusScenarioId,
  onToggle,
  onChange,
  onMove,
}: Readonly<{
  definition: ControlDefinitionV2 | undefined;
  item: ExperimentSurfaceControlItemV2;
  sourcePaneId: string;
  control: ExperimentPlacementBriefingControlV2 | undefined;
  selectedControls: readonly ExperimentPlacementBriefingControlV2[];
  scenarios: ExperimentSnapshotV2["content"]["scenarios"];
  visibleScenarioIds: readonly string[];
  initialFocusScenarioId: string;
  onToggle: (enabled: boolean) => void;
  onChange: (control: ExperimentPlacementBriefingControlV2) => void;
  onMove: (direction: -1 | 1) => void;
}>) {
  const { t } = useTranslation();
  const bindingScenarioIds = control?.binding.mode === "reader-focus"
    ? control.binding.allowedScenarioIds
    : control?.binding.scenarioIds ?? [];
  return (
    <div
      className="rounded-lg px-2 py-1.5 hover:bg-wb-hover"
      data-source-pane-id={sourcePaneId}
    >
      <div className="flex min-h-8 items-center gap-2">
        <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={control !== undefined}
            onChange={(event) => onToggle(event.currentTarget.checked)}
            className="h-3.5 w-3.5 accent-wb-accent"
          />
          <span className="truncate text-[11px] font-medium">{item.label}</span>
        </label>
        {control !== undefined && (
          <OrderControlsV3
            order={control.order}
            count={selectedControls.length}
            onMove={onMove}
          />
        )}
      </div>

      {control !== undefined && (
        <details className="ml-5 mt-1 rounded-md bg-wb-soft/60 px-2.5 py-2 text-[10px] text-wb-muted">
          <summary className="cursor-pointer select-none font-medium">
            {t("articleEditor.briefing.settings")}
          </summary>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <LabeledTextInputV3
              label={t("articleEditor.briefing.label")}
              value={control.label}
              onCommit={(label) => onChange({
                ...control,
                label: label || item.label,
              })}
            />
            <label className="grid gap-1">
              <span>{t("articleEditor.briefing.presentation")}</span>
              <select
                value={control.presentation.kind}
                disabled={definition === undefined}
                onChange={(event) => onChange({
                  ...control,
                  presentation: event.currentTarget.value === "buttons"
                    ? {
                      kind: "buttons",
                      options: definition === undefined
                        ? []
                        : defaultArticleControlButtonOptionsV3(definition),
                    }
                    : { kind: "slider" },
                })}
                className="h-8 rounded-md bg-wb-input px-2 outline-none disabled:cursor-not-allowed disabled:opacity-50 focus:ring-2 focus:ring-wb-accent"
              >
                <option value="slider">{t("articleEditor.briefing.slider")}</option>
                <option value="buttons">{t("articleEditor.briefing.buttons")}</option>
              </select>
            </label>
            <label className="grid gap-1">
              <span>{t("articleEditor.briefing.scenarioBinding")}</span>
              <select
                value={control.binding.mode}
                onChange={(event) => onChange({
                  ...control,
                  binding: event.currentTarget.value === "reader-focus"
                    ? {
                      mode: "reader-focus",
                      allowedScenarioIds: [...visibleScenarioIds],
                    }
                    : {
                      mode: "fixed",
                      scenarioIds: [initialFocusScenarioId],
                      application: "absolute",
                    },
                })}
                className="h-8 rounded-md bg-wb-input px-2 outline-none focus:ring-2 focus:ring-wb-accent"
              >
                <option value="fixed">{t("articleEditor.briefing.fixed")}</option>
                <option value="reader-focus">{t("articleEditor.briefing.readerFocus")}</option>
              </select>
            </label>
          </div>

          {control.presentation.kind === "buttons" && (
            <div className="mt-3 grid gap-1.5">
              <span className="font-medium">{t("articleEditor.briefing.buttons")}</span>
              {control.presentation.options.map((option, optionIndex) => (
                <div
                  key={option.label}
                  className="grid grid-cols-[minmax(0,1fr)_6rem_auto] gap-1.5"
                >
                  <input
                    type="text"
                    defaultValue={option.label}
                    onBlur={(event) => {
                      const candidateLabel = event.currentTarget.value.trim();
                      const existingLabels = control.presentation.kind === "buttons"
                        ? control.presentation.options
                          .filter((_, index) => index !== optionIndex)
                          .map(({ label }) => label)
                        : [];
                      const label = candidateLabel.length > 0
                        && !existingLabels.includes(candidateLabel)
                        ? candidateLabel
                        : option.label;
                      if (label === option.label) {
                        event.currentTarget.value = label;
                        return;
                      }
                      onChange({
                        ...control,
                        presentation: {
                          kind: "buttons",
                          options: control.presentation.kind === "buttons"
                            ? control.presentation.options.map((candidate, index) =>
                              index === optionIndex
                                ? { ...candidate, label }
                                : candidate)
                            : [{ label, value: option.value }],
                        },
                      });
                    }}
                    className="h-8 min-w-0 rounded-md bg-wb-input px-2 outline-none focus:ring-2 focus:ring-wb-accent"
                  />
                  <input
                    key={option.value}
                    type="number"
                    defaultValue={option.value}
                    disabled={definition === undefined}
                    min={definition?.minimum}
                    max={definition?.maximum}
                    step={definition?.step}
                    onBlur={(event) => {
                      const parsed = Number(event.currentTarget.value);
                      if (!Number.isFinite(parsed)) {
                        event.currentTarget.value = String(option.value);
                        return;
                      }
                      const value = definition === undefined
                        ? (Object.is(parsed, -0) ? 0 : parsed)
                        : normalizeControlOptionValueV3(parsed, definition);
                      if (
                        control.presentation.kind === "buttons"
                        && control.presentation.options.some((candidate, index) =>
                          index !== optionIndex && candidate.value === value)
                      ) {
                        event.currentTarget.value = String(option.value);
                        return;
                      }
                      if (value === option.value) {
                        event.currentTarget.value = String(value);
                        return;
                      }
                      onChange({
                        ...control,
                        presentation: {
                          kind: "buttons",
                          options: control.presentation.kind === "buttons"
                            ? control.presentation.options.map((candidate, index) =>
                              index === optionIndex
                                ? { ...candidate, value }
                                : candidate)
                            : [{ label: option.label, value }],
                        },
                      });
                    }}
                    className="h-8 min-w-0 rounded-md bg-wb-input px-2 font-mono outline-none disabled:cursor-not-allowed disabled:opacity-50 focus:ring-2 focus:ring-wb-accent"
                  />
                  <button
                    type="button"
                    disabled={
                      control.presentation.kind !== "buttons"
                      || control.presentation.options.length <= 2
                    }
                    onClick={() => onChange({
                      ...control,
                      presentation: {
                        kind: "buttons",
                        options: control.presentation.kind === "buttons"
                          ? control.presentation.options.filter((_, index) =>
                            index !== optionIndex)
                          : [option],
                      },
                    })}
                    aria-label={t("articleEditor.briefing.removeButton")}
                    className="h-8 w-8 rounded-md text-wb-subtle hover:bg-wb-hover hover:text-wb-text disabled:opacity-30"
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                disabled={
                  definition === undefined
                  || control.presentation.options.length >= 6
                }
                onClick={() => {
                  if (control.presentation.kind !== "buttons") return;
                  const lastValue = control.presentation.options.at(-1)?.value
                    ?? definition?.defaultValue
                    ?? -1;
                  let value = definition === undefined
                    ? lastValue + 1
                    : normalizeControlOptionValueV3(
                        Math.min(definition.maximum, lastValue + definition.step),
                        definition,
                      );
                  const existing = new Set(
                    control.presentation.options.map((option) => option.value),
                  );
                  while (existing.has(value)) {
                    if (definition === undefined) {
                      value += 1;
                    } else {
                      const next = normalizeControlOptionValueV3(
                        value + definition.step,
                        definition,
                      );
                      if (next === value) return;
                      value = next;
                    }
                  }
                  const existingLabels = new Set(
                    control.presentation.options.map((option) => option.label),
                  );
                  const labelStem = String(value);
                  let label = labelStem;
                  let labelSuffix = 2;
                  while (existingLabels.has(label)) {
                    label = `${labelStem} (${labelSuffix})`;
                    labelSuffix += 1;
                  }
                  onChange({
                    ...control,
                    presentation: {
                      kind: "buttons",
                      options: [...control.presentation.options, {
                        label,
                        value,
                      }],
                    },
                  });
                }}
                className="justify-self-start rounded-md px-2 py-1 text-[10px] text-wb-accent hover:bg-wb-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                + {t("articleEditor.briefing.addButton")}
              </button>
            </div>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            {scenarios
              .filter(({ scenarioId }) => visibleScenarioIds.includes(scenarioId))
              .map((scenario) => {
                const selected = bindingScenarioIds.includes(scenario.scenarioId);
                return (
                  <label
                    key={scenario.scenarioId}
                    className="inline-flex items-center gap-1.5 rounded-md bg-wb-input px-2 py-1.5"
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      disabled={selected && bindingScenarioIds.length === 1}
                      onChange={(event) => {
                        const next = event.currentTarget.checked
                          ? [...bindingScenarioIds, scenario.scenarioId]
                          : bindingScenarioIds.filter((id) => id !== scenario.scenarioId);
                        onChange({
                          ...control,
                          binding: control.binding.mode === "reader-focus"
                            ? {
                              mode: "reader-focus",
                              allowedScenarioIds: next,
                            }
                            : {
                              mode: "fixed",
                              scenarioIds: next,
                              application: "absolute",
                            },
                        });
                      }}
                      className="h-3 w-3 accent-wb-accent"
                    />
                    {scenario.label}
                  </label>
                );
              })}
          </div>
        </details>
      )}
    </div>
  );
}

function LabeledTextInputV3({
  label,
  value,
  onCommit,
}: Readonly<{
  label: string;
  value: string;
  onCommit: (value: string) => void;
}>) {
  return (
    <label className="grid gap-1 text-[10px] text-wb-muted">
      <span>{label}</span>
      <input
        key={value}
        type="text"
        defaultValue={value}
        onBlur={(event) => onCommit(event.currentTarget.value.trim())}
        className="h-8 min-w-0 rounded-md bg-wb-input px-2 outline-none focus:ring-2 focus:ring-wb-accent"
      />
    </label>
  );
}

function LabeledNumberInputV3({
  label,
  value,
  min,
  max,
  step,
  onCommit,
}: Readonly<{
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onCommit: (value: number) => void;
}>) {
  return (
    <label className="grid gap-1 text-[10px] text-wb-muted">
      <span>{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => {
          const candidate = Number(event.currentTarget.value);
          if (!Number.isFinite(candidate)) return;
          const quantized = min + Math.round((candidate - min) / step) * step;
          const normalized = Math.min(max, Math.max(min, quantized));
          onCommit(normalized);
        }}
        className="h-8 min-w-0 rounded-md bg-wb-input px-2 font-mono outline-none focus:ring-2 focus:ring-wb-accent"
      />
    </label>
  );
}

function OrderControlsV3({
  order,
  count,
  onMove,
}: Readonly<{
  order: number;
  count: number;
  onMove: (direction: -1 | 1) => void;
}>) {
  const { t } = useTranslation();
  return (
    <div className="flex shrink-0 items-center gap-0.5">
      <OrderButtonV3
        label={t("articleEditor.briefing.moveEarlier")}
        disabled={order === 0}
        onClick={() => onMove(-1)}
      >
        <ArrowUp className="h-3 w-3" />
      </OrderButtonV3>
      <OrderButtonV3
        label={t("articleEditor.briefing.moveLater")}
        disabled={order >= count - 1}
        onClick={() => onMove(1)}
      >
        <ArrowDown className="h-3 w-3" />
      </OrderButtonV3>
    </div>
  );
}

function OrderButtonV3({
  children,
  label,
  disabled = false,
  onClick,
}: Readonly<{
  children: React.ReactNode;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}>) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      title={label}
      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-wb-subtle transition-[color,background-color,transform] duration-150 hover:bg-wb-soft hover:text-wb-text active:scale-[0.96] disabled:pointer-events-none disabled:opacity-25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wb-accent"
    >
      {children}
    </button>
  );
}

type SurfaceOutputItemV3 = Readonly<{
  pane: ExperimentSurfaceOutputPaneV2;
  item: ExperimentSurfaceOutputItemV2;
}>;

function collectSurfaceOutputItemsV3(
  snapshot: ExperimentSnapshotV2,
): readonly SurfaceOutputItemV3[] {
  return [...snapshot.content.surface.outputPanes]
    .sort(compareSemanticOrderV3)
    .flatMap((pane) => [...pane.items]
      .sort(compareSemanticOrderV3)
      .map((item) => Object.freeze({ pane, item })));
}

function briefingOutputKeyV3(sourcePaneId: string, outputId: string): string {
  return `${sourcePaneId}\u001f${outputId}`;
}

type SurfaceControlItemV3 = Readonly<{
  pane: ExperimentSurfaceControlPaneV2;
  item: ExperimentSurfaceControlItemV2;
}>;

function collectSurfaceControlItemsV3(
  snapshot: ExperimentSnapshotV2,
): readonly SurfaceControlItemV3[] {
  return [...snapshot.content.surface.controlPanes]
    .sort(compareSemanticOrderV3)
    .flatMap((pane) => [...pane.items]
      .sort(compareSemanticOrderV3)
      .map((item) => Object.freeze({ pane, item })));
}

function briefingControlKeyV3(sourcePaneId: string, controlId: string): string {
  return `${sourcePaneId}\u001f${controlId}`;
}

function moveBriefingControlV3(
  controls: readonly ExperimentPlacementBriefingControlV2[],
  sourcePaneId: string,
  controlId: string,
  direction: -1 | 1,
): ExperimentPlacementBriefingControlV2[] {
  const sorted = normalizeSemanticOrderV3(controls);
  const key = briefingControlKeyV3(sourcePaneId, controlId);
  const currentIndex = sorted.findIndex((control) =>
    briefingControlKeyV3(control.sourcePaneId, control.controlId) === key);
  const nextIndex = currentIndex + direction;
  if (
    currentIndex < 0 ||
    nextIndex < 0 ||
    nextIndex >= sorted.length
  ) return sorted;
  [sorted[currentIndex], sorted[nextIndex]] = [
    sorted[nextIndex]!,
    sorted[currentIndex]!,
  ];
  return sorted.map((control, order) => ({ ...control, order }));
}

function moveBriefingOutputV3(
  outputs: readonly ExperimentPlacementBriefingOutputV2[],
  sourcePaneId: string,
  outputId: string,
  direction: -1 | 1,
): ExperimentPlacementBriefingOutputV2[] {
  const sorted = normalizeSemanticOrderV3(outputs);
  const key = briefingOutputKeyV3(sourcePaneId, outputId);
  const currentIndex = sorted.findIndex((output) =>
    briefingOutputKeyV3(output.sourcePaneId, output.outputId) === key);
  const nextIndex = currentIndex + direction;
  if (currentIndex < 0 || nextIndex < 0 || nextIndex >= sorted.length) {
    return sorted;
  }
  [sorted[currentIndex], sorted[nextIndex]] = [
    sorted[nextIndex]!,
    sorted[currentIndex]!,
  ];
  return sorted.map((output, order) => ({ ...output, order }));
}

function normalizeSemanticOrderV3<T extends Readonly<{ order: number }>>(
  items: readonly T[],
): T[] {
  return [...items]
    .sort(compareSemanticOrderV3)
    .map((item, order) => ({ ...item, order }) as T);
}

function normalizeGraphOrderV3(
  graphs: readonly ExperimentPlacementBriefingGraphV2[],
): ExperimentPlacementBriefingGraphV2[] {
  const normalized = normalizeSemanticOrderV3(graphs);
  if (
    normalized.length > 0
    && !normalized.some(({ emphasis }) => emphasis === "primary")
  ) {
    normalized[0] = { ...normalized[0]!, emphasis: "primary" };
  }
  return normalized;
}

function moveOrderedItemV3<T extends Readonly<{ order: number }>>(
  items: readonly T[],
  identity: string,
  direction: -1 | 1,
  identityKey: "paneId" | "outputId" | "controlId",
): T[] {
  const sorted = normalizeSemanticOrderV3(items);
  const currentIndex = sorted.findIndex((item) =>
    (item as unknown as Record<string, unknown>)[identityKey] === identity);
  const nextIndex = currentIndex + direction;
  if (
    currentIndex < 0
    || nextIndex < 0
    || nextIndex >= sorted.length
  ) {
    return sorted;
  }
  [sorted[currentIndex], sorted[nextIndex]] = [
    sorted[nextIndex]!,
    sorted[currentIndex]!,
  ];
  return sorted.map((item, order) => ({ ...item, order }) as T);
}

function reconcileControlBindingScopeV3(
  binding: ExperimentPlacementBriefingControlV2["binding"],
  visibleScenarioIds: readonly string[],
  initialFocusScenarioId: string,
): ExperimentPlacementBriefingControlV2["binding"] {
  if (binding.mode === "reader-focus") {
    const allowedScenarioIds = binding.allowedScenarioIds.filter((scenarioId) =>
      visibleScenarioIds.includes(scenarioId));
    return {
      mode: "reader-focus",
      allowedScenarioIds: allowedScenarioIds.length > 0
        ? allowedScenarioIds
        : [initialFocusScenarioId],
    };
  }
  const scenarioIds = binding.scenarioIds.filter((scenarioId) =>
    visibleScenarioIds.includes(scenarioId));
  return {
    mode: "fixed",
    scenarioIds: scenarioIds.length > 0
      ? scenarioIds
      : [initialFocusScenarioId],
    application: "absolute",
  };
}

function compareSemanticOrderV3(
  left: Readonly<{ order: number }>,
  right: Readonly<{ order: number }>,
): number {
  return left.order - right.order;
}

function normalizeControlOptionValueV3(
  value: number,
  definition: ControlDefinitionV2,
): number {
  const clamped = Math.min(
    definition.maximum,
    Math.max(definition.minimum, value),
  );
  const steps = Math.round(
    (clamped - definition.minimum) / definition.step,
  );
  const normalized = definition.minimum + steps * definition.step;
  return Number(Math.min(
    definition.maximum,
    Math.max(definition.minimum, normalized),
  ).toPrecision(12));
}

function defaultArticleControlButtonOptionsV3(
  definition: ControlDefinitionV2,
): readonly Readonly<{ label: string; value: number }>[] {
  const candidates = [
    definition.defaultValue - definition.step,
    definition.defaultValue,
    definition.defaultValue + definition.step,
    definition.minimum,
    definition.maximum,
  ].map((value) => normalizeControlOptionValueV3(value, definition));
  const values = [...new Set(candidates)].slice(0, 3);
  if (values.length < 2) values.push(definition.maximum);
  return values.map((value) => ({ label: String(value), value }));
}

function PlacementBlockActionsV3({
  index,
  total,
  onMove,
  onRemove,
}: Readonly<{
  index: number;
  total: number;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
}>) {
  const { t } = useTranslation();
  return (
    <div className="flex shrink-0 items-center gap-0.5 text-wb-subtle">
      <GripVertical className="mr-0.5 hidden h-4 w-4 opacity-40 sm:block" aria-hidden="true" />
      <PlacementActionV3
        label={t("articleEditor.moveUp")}
        disabled={index === 0}
        onClick={() => onMove(-1)}
      >
        <ChevronUp className="h-3.5 w-3.5" />
      </PlacementActionV3>
      <PlacementActionV3
        label={t("articleEditor.moveDown")}
        disabled={index === total - 1}
        onClick={() => onMove(1)}
      >
        <ChevronDown className="h-3.5 w-3.5" />
      </PlacementActionV3>
      <PlacementActionV3 label={t("articleEditor.removeBlock")} onClick={onRemove}>
        <Trash2 className="h-3.5 w-3.5" />
      </PlacementActionV3>
    </div>
  );
}

function PlacementActionV3({
  children,
  label,
  disabled = false,
  onClick,
}: Readonly<{
  children: React.ReactNode;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}>) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-7 w-7 items-center justify-center rounded-md transition-[color,background-color,transform] duration-150 hover:bg-wb-hover hover:text-wb-text active:scale-[0.96] disabled:pointer-events-none disabled:opacity-20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wb-accent"
    >
      {children}
    </button>
  );
}

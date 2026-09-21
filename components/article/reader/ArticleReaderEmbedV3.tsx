import React from "react";
import type { ArticleReaderOutputViewV3 } from "./ArticleReaderOutputDisclosureV3";
import { ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";

import { WorkbenchAreaLayoutV3 } from "@/components/workbench/WorkbenchAreaLayoutV3";
import type { ExperimentPlacementBriefingViewV2 } from "@/studio/contracts/v2/content";
import { articleBriefingSplitViewsV3 } from "@/studio/application/authoring/StudioArticleBriefingPresentationV3";
import { articleReaderTitleNamesScenarioV3 } from "./ArticleReaderObservationV3";

/**
 * Reading layouts shared by every extent of an embedded experiment.
 *
 * `inline`     lives in the Article column: stage, the author's primary
 *              observation and primary controls, nothing else.
 * `peek`       beside the Article: stage and observation stay put while the
 *              controllers scroll beneath the single measurement area.
 * `sheet`      phone-width Peek/Full: the same order as Peek in one sheet.
 * `workbench`  maximized on a desktop: the Workbench area arrangement (graphs
 *              tiled top-left, outputs bottom-left, controls right).
 *
 * These components own no numerical or durable state. Graph, control, and
 * output rendering is injected by the Reader so the same renderer instances
 * serve every layout.
 */
export type ArticleReaderEmbedLayoutV3 = "inline" | "peek" | "sheet" | "workbench";

export type ArticleReaderStageViewV3 = ExperimentPlacementBriefingViewV2;

/** Per-placement view memory only: graph, expansion and folded controls. */
export type ArticleReaderObservationMemoryV3 = {
  activePaneId: string | null;
  outputView: ArticleReaderOutputViewV3 | null;
  collapsedControlPaneIds: readonly string[] | null;
};

export function createArticleReaderObservationMemoryV3(): ArticleReaderObservationMemoryV3 {
  return { activePaneId: null, outputView: null, collapsedControlPaneIds: null };
}

/** Opening to operate starts with the author's primary values, keeping controls close. */
export function openArticleReaderToOperateV3(
  memory: ArticleReaderObservationMemoryV3,
  open: () => void,
): void {
  memory.outputView = "primary";
  open();
}

export const ArticleReaderObservationMemoryContextV3 =
  React.createContext<ArticleReaderObservationMemoryV3 | null>(null);

export function useArticleReaderObservationMemoryV3(): ArticleReaderObservationMemoryV3 {
  const shared = React.useContext(ArticleReaderObservationMemoryContextV3);
  const local = React.useRef<ArticleReaderObservationMemoryV3 | null>(null);
  if (shared !== null) return shared;
  if (local.current === null) local.current = createArticleReaderObservationMemoryV3();
  return local.current;
}

/** Below this stage width a sealed pair is read as two consecutive views. */
export const ARTICLE_READER_STAGE_PAIR_MIN_WIDTH_PX_V3 = 560;

export function useArticleReaderElementWidthV3(
  ref: React.RefObject<HTMLElement | null>,
): number {
  const [width, setWidth] = React.useState(0);
  React.useLayoutEffect(() => {
    const element = ref.current;
    if (element === null || typeof ResizeObserver === "undefined") return undefined;
    const measure = () => setWidth(element.getBoundingClientRect().width);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return width;
}

/** Sealed views, split into single views when the measured stage is narrow. */
export function articleReaderStageViewsForWidthV3(
  views: readonly ArticleReaderStageViewV3[],
  width: number,
): readonly ArticleReaderStageViewV3[] {
  if (width > 0 && width < ARTICLE_READER_STAGE_PAIR_MIN_WIDTH_PX_V3) {
    return articleBriefingSplitViewsV3(views);
  }
  return views;
}

/**
 * The reader's selection is a graph pane, not a position: pairs split and
 * rejoin as the stage width changes, so the index of a view is unstable. The
 * active view is the one containing the selected pane; selecting a pair keeps
 * its first pane, so a narrowed stage shows that pane and a widened stage
 * returns to the pair that contains it.
 */
export function articleReaderActiveViewIndexV3(
  views: readonly ArticleReaderStageViewV3[],
  activePaneId: string | null,
): number {
  if (views.length === 0) return 0;
  const index = activePaneId === null ? -1 : views.findIndex((view) => view.paneIds.includes(activePaneId));
  return index < 0 ? 0 : index;
}

export function articleReaderStageViewLabelV3(
  view: ArticleReaderStageViewV3,
  labelForPane: (paneId: string) => string,
  pairLabel: (first: string, second: string) => string,
): string {
  const [first, second] = view.paneIds;
  if (first === undefined) return "";
  return second === undefined ? labelForPane(first) : pairLabel(labelForPane(first), labelForPane(second));
}

export function ArticleReaderStageV3({
  layout,
  views,
  activePaneId,
  onActivePaneChange,
  labelForPane,
  renderGraph,
  status,
}: Readonly<{
  layout: ArticleReaderEmbedLayoutV3;
  views: readonly ArticleReaderStageViewV3[];
  /** Selected graph pane; the stage shows the view containing it. */
  activePaneId: string | null;
  onActivePaneChange: (paneId: string) => void;
  labelForPane: (paneId: string) => string;
  renderGraph: (paneId: string) => React.ReactNode;
  /** Analysis state for the visible graphs; rendered between canvas and rail. */
  status?: React.ReactNode;
}>) {
  const { t } = useTranslation();
  const rootRef = React.useRef<HTMLDivElement>(null);
  const width = useArticleReaderElementWidthV3(rootRef);
  const effectiveViews = articleReaderStageViewsForWidthV3(views, width);
  const index = articleReaderActiveViewIndexV3(effectiveViews, activePaneId);
  const active = effectiveViews[index];
  const tabId = React.useId();
  const tabRefs = React.useRef(new Map<number, HTMLButtonElement>());
  const pairLabel = (first: string, second: string) => t("articleReader.viewPair", { first, second });
  const select = (viewIndex: number) => {
    const paneId = effectiveViews[viewIndex]?.paneIds[0];
    if (paneId !== undefined) onActivePaneChange(paneId);
  };

  const moveSelection = (event: React.KeyboardEvent<HTMLButtonElement>, current: number) => {
    let next: number | null = null;
    const count = effectiveViews.length;
    if (event.key === "ArrowRight") next = (current + 1) % count;
    else if (event.key === "ArrowLeft") next = (current - 1 + count) % count;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = count - 1;
    if (next === null) return;
    event.preventDefault();
    select(next);
    tabRefs.current.get(next)?.focus();
  };

  return (
    <div
      ref={rootRef}
      className="article-reader-stage"
      data-reader-stage-layout={layout}
      data-reader-stage-view-count={effectiveViews.length}
      data-reader-stage-split={effectiveViews.length !== views.length ? "true" : "false"}
      data-reader-stage-active-pane={active?.paneIds[0] ?? ""}
    >
      {effectiveViews.length > 1 && (
        <div
          className="workbench-mobile-graph-view-rail article-reader-stage-rail"
          data-testid="article-reader-stage-rail-v3"
        >
          <div className="workbench-mobile-graph-view-tabs" role="tablist" aria-label={t("articleReader.views")}>
            {effectiveViews.map((view, viewIndex) => {
              const selected = viewIndex === index;
              return (
                <button
                  key={view.paneIds.join("+")}
                  ref={(element) => {
                    if (element === null) tabRefs.current.delete(viewIndex);
                    else tabRefs.current.set(viewIndex, element);
                  }}
                  id={`${tabId}-tab-${viewIndex}`}
                  type="button"
                  role="tab"
                  aria-controls={`${tabId}-panel`}
                  aria-selected={selected}
                  tabIndex={selected ? 0 : -1}
                  className="workbench-mobile-graph-view-tab"
                  onClick={() => select(viewIndex)}
                  onKeyDown={(event) => moveSelection(event, viewIndex)}
                >
                  <span className="truncate">{articleReaderStageViewLabelV3(view, labelForPane, pairLabel)}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
      <div
        id={`${tabId}-panel`}
        role={effectiveViews.length > 1 ? "tabpanel" : undefined}
        aria-labelledby={effectiveViews.length > 1 ? `${tabId}-tab-${index}` : undefined}
        className="article-reader-stage-canvas"
        data-reader-stage-slots={active?.paneIds.length ?? 0}
      >
        {active?.paneIds.map((paneId) => (
          <div key={paneId} className="article-reader-stage-slot" data-reader-stage-pane={paneId}>
            {renderGraph(paneId)}
          </div>
        ))}
      </div>
      {status}
    </div>
  );
}

export type ArticleReaderSectionV3 = Readonly<{
  key: string;
  title: string;
  /** Scenario the section reads or drives; omitted when there is nothing to distinguish. */
  scenario?: Readonly<{ label: string; colorHex: string }>;
  /** Optional row rendered between the header and the body (e.g. a Scenario selector). */
  lead?: React.ReactNode;
  body: React.ReactNode;
  /** Present when the section can fold: its body hides while collapsed. */
  collapsed?: boolean;
  onToggle?: () => void;
}>;

/**
 * Sections are the Workbench pane, carried into the Article. Their title is
 * the pane label, so an author groups outputs by meaning (valve, myocardium)
 * or by Scenario simply by composing panes. Several sections sit side by side
 * when the column is wide enough. Measurements flow horizontally within each
 * section; both sections and measurements wrap without hiding outputs. A
 * section with `onToggle` folds like a phone Workbench pane group.
 */
export function ArticleReaderSectionsV3({
  kind,
  sections,
  showHeaders,
  label,
}: Readonly<{
  kind: "controls" | "outputs";
  sections: readonly ArticleReaderSectionV3[];
  showHeaders: boolean;
  label: string;
}>) {
  const id = React.useId();
  if (sections.length === 0) return null;
  return (
    <section
      className="article-reader-sections"
      data-reader-sections={kind}
      data-reader-section-count={sections.length}
      aria-label={label}
    >
      {sections.map((section, index) => {
        const foldable = section.onToggle !== undefined && showHeaders;
        const collapsed = foldable && section.collapsed === true;
        const bodyId = `${id}-${index}-body`;
        const heading = (
          <>
            {section.scenario && (
              <span
                className="article-reader-scenario-swatch"
                style={{ backgroundColor: section.scenario.colorHex }}
                aria-hidden="true"
              />
            )}
            <span className="truncate">{section.title}</span>
            {section.scenario && !articleReaderTitleNamesScenarioV3(section.title, section.scenario.label) && (
              <span className="article-reader-section-scenario">{section.scenario.label}</span>
            )}
          </>
        );
        return (
          <div
            key={section.key}
            className="article-reader-section"
            data-reader-section={section.key}
            data-reader-section-collapsed={foldable ? (collapsed ? "true" : "false") : undefined}
          >
            {showHeaders && (
              <h3 className="article-reader-section-title">
                {foldable ? (
                  <button
                    type="button"
                    className="article-reader-section-toggle"
                    aria-expanded={!collapsed}
                    aria-controls={bodyId}
                    onClick={section.onToggle}
                  >
                    {heading}
                    <ChevronDown className="article-reader-section-chevron h-4 w-4" aria-hidden="true" />
                  </button>
                ) : heading}
              </h3>
            )}
            <div id={bodyId} hidden={collapsed}>
              {!collapsed && section.lead}
              {!collapsed && <div className="article-reader-section-body">{section.body}</div>}
            </div>
          </div>
        );
      })}
    </section>
  );
}

/**
 * Maximized desktop reading uses the Workbench's own area arrangement, so a
 * reader who continues into the Workbench meets the same geometry. Every
 * graph pane is tiled at once; views are a narrow-stage device only.
 */
export function ArticleReaderWorkbenchLayoutV3({
  graphs,
  outputs,
  controls,
  status,
}: Readonly<{
  graphs: readonly Readonly<{ paneId: string; node: React.ReactNode }>[];
  outputs: React.ReactNode;
  controls: React.ReactNode;
  status?: React.ReactNode;
}>) {
  const { t } = useTranslation();
  return (
    <WorkbenchAreaLayoutV3
      className="article-reader-workbench-layout min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(360px,1fr)_auto_auto] overflow-y-auto lg:overflow-hidden"
      inspectorResizeLabel={t("workbench.live.resizeInspectorArea")}
      outputResizeLabel={t("workbench.live.resizeOutputArea")}
      preferenceStorageKey="circleheart.reader.area-layout.v1"
      defaultPreference={{ inspectorWidthRatio: 0.24, outputHeightRatio: 0.2 }}
    >
      <div className="article-reader-workbench-graphs min-h-0 bg-wb-canvas lg:col-start-1 lg:row-start-1" data-reader-workbench-graph-count={graphs.length}>
        <div className="article-reader-workbench-graph-grid" data-reader-graph-count={graphs.length}>
          {graphs.map(({ paneId, node }) => (
            <div key={paneId} className="article-reader-stage-slot" data-reader-stage-pane={paneId}>{node}</div>
          ))}
        </div>
        {status}
      </div>
      <div className="article-reader-workbench-outputs min-h-0 overflow-y-auto border-t border-wb-line bg-wb-aux lg:col-start-1 lg:row-start-2">
        {outputs}
      </div>
      <div className="article-reader-workbench-controls min-h-0 overflow-y-auto border-t border-wb-line bg-wb-inspector lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:border-l lg:border-t-0">
        {controls}
      </div>
    </WorkbenchAreaLayoutV3>
  );
}

/** Compact segmented selector used only by legacy reader-focus control bindings. */
export function ArticleReaderScenarioSelectorV3({
  label,
  activeScenarioId,
  disabled,
  scenarios,
  onSelect,
}: Readonly<{
  label: string;
  activeScenarioId: string;
  disabled: boolean;
  scenarios: readonly Readonly<{ scenarioId: string; label: string; colorHex: string }>[];
  onSelect: (scenarioId: string) => void;
}>) {
  if (scenarios.length === 0
    || (scenarios.length === 1 && scenarios[0]!.scenarioId === activeScenarioId)) return null;
  return (
    <div className="article-reader-scenario-selector" role="group" aria-label={label}>
      <span className="article-reader-scenario-selector-label">{label}</span>
      {scenarios.map((scenario) => (
        <button
          key={scenario.scenarioId}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(scenario.scenarioId)}
          aria-pressed={activeScenarioId === scenario.scenarioId}
          className="workbench-selection-button article-reader-scenario-chip"
        >
          <span className="article-reader-scenario-swatch" style={{ backgroundColor: scenario.colorHex }} aria-hidden="true" />
          <span className="truncate">{scenario.label}</span>
        </button>
      ))}
    </div>
  );
}

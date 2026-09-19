import React from "react";
import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";

import { WorkbenchAreaLayoutV3 } from "@/components/workbench/WorkbenchAreaLayoutV3";
import type { ExperimentPlacementBriefingViewV2 } from "@/studio/contracts/v2/content";
import { articleBriefingSplitViewsV3 } from "@/studio/application/authoring/StudioArticleBriefingPresentationV3";

/**
 * Reading layouts shared by every extent of an embedded experiment.
 *
 * `inline`     lives in the Article column: stage, observation, then the
 *              primary controls and the sealed reference in flow.
 * `peek`       beside the Article: stage and observation stay put while the
 *              deck (primary controls, reference) scrolls.
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

/**
 * What the reader keeps while moving between extents and viewports: the
 * selected graph pane, the observed outputs (null until the reader changes
 * the author's observation), and which reference groups are open. It is a
 * mutable per-Placement memory, not durable content.
 */
export type ArticleReaderObservationMemoryV3 = {
  activePaneId: string | null;
  observedOutputKeys: readonly string[] | null;
  referenceOpen: { outputs: boolean; controls: boolean };
};

export function createArticleReaderObservationMemoryV3(): ArticleReaderObservationMemoryV3 {
  return { activePaneId: null, observedOutputKeys: null, referenceOpen: { outputs: false, controls: false } };
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
}>;

/**
 * Sections are the Workbench pane, carried into the Article. Their title is
 * the pane label, so an author groups outputs by meaning (valve, myocardium)
 * or by Scenario simply by composing panes. Several sections sit side by side
 * when the column is wide enough. Measurements flow horizontally within each
 * section; both sections and measurements wrap without hiding outputs.
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
  if (sections.length === 0) return null;
  return (
    <section
      className="article-reader-sections"
      data-reader-sections={kind}
      data-reader-section-count={sections.length}
      aria-label={label}
    >
      {sections.map((section) => (
        <div key={section.key} className="article-reader-section" data-reader-section={section.key}>
          {showHeaders && (
            <h3 className="article-reader-section-title">
              {section.scenario && (
                <span
                  className="article-reader-scenario-swatch"
                  style={{ backgroundColor: section.scenario.colorHex }}
                  aria-hidden="true"
                />
              )}
              <span className="truncate">{section.title}</span>
              {section.scenario && section.scenario.label !== section.title && (
                <span className="article-reader-section-scenario">{section.scenario.label}</span>
              )}
            </h3>
          )}
          {section.lead}
          <div className="article-reader-section-body">{section.body}</div>
        </div>
      ))}
    </section>
  );
}

/**
 * The sealed reference behind the observation: every output or every
 * remaining control, grouped by source pane. One disclosure per role; the
 * count names what is inside without a second explanation.
 */
export function ArticleReaderReferenceV3({
  kind,
  label,
  count,
  open,
  onToggle,
  action,
  children,
}: Readonly<{
  kind: "outputs" | "controls";
  label: string;
  count: number;
  open: boolean;
  onToggle: (open: boolean) => void;
  /** Optional secondary action beside the summary, e.g. reset the observation. */
  action?: React.ReactNode;
  children: React.ReactNode;
}>) {
  const id = React.useId();
  return (
    <section className="article-reader-reference" data-reader-reference={kind} data-reader-reference-open={open ? "true" : "false"}>
      <div className="article-reader-reference-summary">
        <button
          type="button"
          className="article-reader-reference-toggle"
          aria-expanded={open}
          aria-controls={`${id}-body`}
          onClick={() => onToggle(!open)}
        >
          <ChevronRight className="article-reader-reference-chevron h-3.5 w-3.5" aria-hidden="true" />
          <span>{label}</span>
          <span className="article-reader-reference-count">{count}</span>
        </button>
        {action}
      </div>
      <div id={`${id}-body`} className="article-reader-reference-body" hidden={!open}>
        {open && children}
      </div>
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
  if (scenarios.length < 2) return null;
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

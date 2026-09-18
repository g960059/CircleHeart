import type {
  ExperimentPlacementBriefingPresentationV2,
  ExperimentPlacementBriefingV2,
  ExperimentPlacementBriefingViewV2,
} from "@/studio/contracts/v2/content";

export type ArticleBriefingPresentationV3 =
  | "inflow"
  | "peek"
  | "fullscreen";

export type ArticleBriefingAnalysisRecomputeV3 = NonNullable<
  ExperimentPlacementBriefingPresentationV2["analysisRecompute"]
>;

export type ArticleBriefingPresentationInputV3 =
  Pick<ExperimentPlacementBriefingV2, "graphs">
  & Partial<Pick<
    ExperimentPlacementBriefingV2,
    "controls" | "outputs" | "scenarioScope" | "presentation"
  >>;

const EXTENT_TO_PRESENTATION_V3: Readonly<Record<
  ExperimentPlacementBriefingPresentationV2["extent"],
  ArticleBriefingPresentationV3
>> = Object.freeze({ inline: "inflow", peek: "peek", full: "fullscreen" });

/**
 * The reading form is an author decision sealed with the Briefing. Placements
 * sealed before explicit forms fall back to the complexity heuristic below,
 * which the editor also shows as its suggestion.
 */
export function articleBriefingPresentationV3(
  briefing: ArticleBriefingPresentationInputV3,
): ArticleBriefingPresentationV3 {
  if (briefing.presentation !== undefined) {
    return EXTENT_TO_PRESENTATION_V3[briefing.presentation.extent];
  }
  return suggestedArticleBriefingPresentationV3(briefing);
}

/**
 * Mobile-first suggestion from authored Briefing complexity.
 *
 * Inflow is intentionally a small observation instrument, not a compressed
 * Workbench. The phone-height budget treats one graph as two rows and places
 * two output cells per row. A small observation with one authored primary
 * graph can expose that graph in flow and retain its supporting views in Peek.
 */
export function suggestedArticleBriefingPresentationV3(
  briefing: ArticleBriefingPresentationInputV3,
): Exclude<ArticleBriefingPresentationV3, "fullscreen"> {
  const graphCount = briefing.graphs.length;
  const controlCount = briefing.controls?.length ?? 0;
  const outputCount = briefing.outputs?.length ?? 0;
  const scenarioCount =
    briefing.scenarioScope?.visibleScenarioIds.length ?? 1;

  const estimatedPhoneRows =
    (graphCount === 0 ? 0 : 2)
    + controlCount
    + Math.ceil(outputCount / 2);
  const inflowEligible =
    graphCount <= 1
    && scenarioCount <= 3
    && controlCount <= 3
    && outputCount <= 4
    && estimatedPhoneRows <= 4;

  return inflowEligible || hasCompactObservationV3(briefing) ? "inflow" : "peek";
}

/** Explicit sealed reading form for a Briefing that has none yet. */
export function defaultArticleBriefingPresentationV3(
  briefing: ArticleBriefingPresentationInputV3,
): ExperimentPlacementBriefingPresentationV2 {
  return Object.freeze({
    extent: suggestedArticleBriefingPresentationV3(briefing) === "inflow" ? "inline" : "peek",
    views: articleBriefingViewsV3(briefing),
    analysisRecompute: "on-request",
  });
}

/**
 * Stage views in reading order. Sealed views come first; selected graphs that
 * no sealed view names follow as single views, so a Briefing edited after
 * sealing never loses a graph.
 */
export function articleBriefingViewsV3(
  briefing: ArticleBriefingPresentationInputV3,
): readonly ExperimentPlacementBriefingViewV2[] {
  const selected = [...briefing.graphs].sort((left, right) => left.order - right.order);
  const selectedIds = new Set(selected.map(({ paneId }) => paneId));
  const placed = new Set<string>();
  const views: ExperimentPlacementBriefingViewV2[] = [];
  for (const view of briefing.presentation?.views ?? []) {
    const paneIds = view.paneIds.filter((paneId) => selectedIds.has(paneId) && !placed.has(paneId));
    if (paneIds.length === 0) continue;
    for (const paneId of paneIds) placed.add(paneId);
    views.push(Object.freeze({ paneIds: Object.freeze(paneIds.slice(0, 2)) }));
  }
  for (const { paneId } of selected) {
    if (placed.has(paneId)) continue;
    placed.add(paneId);
    views.push(Object.freeze({ paneIds: Object.freeze([paneId]) }));
  }
  return Object.freeze(views);
}

/** Narrow stages read one graph at a time: every pair becomes two views. */
export function articleBriefingSplitViewsV3(
  views: readonly ExperimentPlacementBriefingViewV2[],
): readonly ExperimentPlacementBriefingViewV2[] {
  return Object.freeze(views.flatMap((view) => view.paneIds.length <= 1
    ? [view]
    : view.paneIds.map((paneId) => Object.freeze({ paneIds: Object.freeze([paneId]) }))));
}

/**
 * Whether Surface-pinned analyses are re-measured after each reader control
 * change. Reading defaults to an explicit request: a settled TBV family costs
 * tens of seconds per Scenario even on a fast laptop, and a reader who moved
 * a slider usually wants the beat-level response first.
 */
export function articleBriefingAnalysisRecomputeV3(
  briefing: ArticleBriefingPresentationInputV3,
): ArticleBriefingAnalysisRecomputeV3 {
  return briefing.presentation?.analysisRecompute ?? "on-request";
}

function hasCompactObservationV3(briefing: ArticleBriefingPresentationInputV3): boolean {
  return briefing.graphs.length <= 3
    && briefing.graphs.filter(graph => graph.emphasis === "primary").length === 1
    && (briefing.scenarioScope?.visibleScenarioIds.length ?? 1) <= 2
    && (briefing.controls?.length ?? 0) === 0
    && (briefing.outputs?.length ?? 0) <= 8;
}

/**
 * Reading projection for Placements without an explicit form only. An author
 * who sealed `inline` explicitly keeps the whole Briefing in flow; the stage
 * views own its density instead of a hidden trim.
 */
export function articleBriefingInflowContentV3(briefing: ExperimentPlacementBriefingV2): ExperimentPlacementBriefingV2 {
  if (briefing.presentation !== undefined || !hasCompactObservationV3(briefing)) return briefing;
  const graphs = briefing.graphs.filter(graph => graph.emphasis === "primary");
  const outputs = [...briefing.outputs].sort((a, b) => a.order - b.order).slice(0, 4);
  if (graphs.length === briefing.graphs.length && outputs.length === briefing.outputs.length) return briefing;
  return { ...briefing, graphs, outputs };
}

import {
  STUDIO_BRIEFING_PRIMARY_CONTROL_LIMIT_V2,
  STUDIO_BRIEFING_PRIMARY_OUTPUT_LIMIT_V2,
  type ExperimentPlacementBriefingControlV2,
  type ExperimentPlacementBriefingItemEmphasisV2,
  type ExperimentPlacementBriefingOutputV2,
  type ExperimentPlacementBriefingV2,
} from "@/studio/contracts/v2/content";

/**
 * The observation of one Placement: which sealed outputs and controls the
 * reader keeps in view beside the graph while operating.
 *
 * Emphasis is item-level and Article-local. It never changes an item's
 * Scenario binding, its value, or whether it can be operated; every sealed
 * item stays reachable from the same Placement. The author's primary marks
 * are the first screen; opened forms reveal the remaining sealed items.
 * Readers configure a different set only after continuing in the Workbench.
 */

/** Item keys are Article-local identities; outputs include their sealed Scenario. */
export function articleBriefingOutputKeyV3(
  output: Pick<ExperimentPlacementBriefingOutputV2, "sourcePaneId" | "outputId" | "scenarioId">,
): string {
  return `${output.sourcePaneId}\u001f${output.outputId}\u001f${output.scenarioId}`;
}

export function articleBriefingControlKeyV3(
  control: Pick<ExperimentPlacementBriefingControlV2, "sourcePaneId" | "controlId">,
): string {
  return `${control.sourcePaneId}\u001f${control.controlId}`;
}

/**
 * Bounds of the primary sets, counted in sealed references (an output read
 * for two Scenarios is two). Six tiles are about two rows of three on a
 * 320px phone and two controllers are two slider rows; the budget keeps the
 * first screen short without promising that every device shows all of it at
 * once (three headed groups on a short phone scroll inside the observation's
 * bound). The sealed content behind them has no such bound.
 */
export const ARTICLE_PRIMARY_OUTPUT_LIMIT_V3 = STUDIO_BRIEFING_PRIMARY_OUTPUT_LIMIT_V2;
export const ARTICLE_PRIMARY_CONTROL_LIMIT_V3 = STUDIO_BRIEFING_PRIMARY_CONTROL_LIMIT_V2;

/** Comfortable observation on a phone: two rows of three measurements. */
export const ARTICLE_OBSERVATION_DEFAULT_BUDGET_V3 = ARTICLE_PRIMARY_OUTPUT_LIMIT_V3;

/**
 * Initial observation for content sealed without emphasis. Each group (a
 * source pane read for one Scenario) contributes its first items so that a
 * comparison keeps the same measurement across Scenarios; the budget is
 * shared evenly and never exceeded except to give every group one item.
 */
export function defaultObservedItemKeysV3(
  groups: readonly Readonly<{ keys: readonly string[] }>[],
  budget: number = ARTICLE_OBSERVATION_DEFAULT_BUDGET_V3,
): readonly string[] {
  const nonEmpty = groups.filter((group) => group.keys.length > 0);
  if (nonEmpty.length === 0) return Object.freeze([]);
  const perGroup = Math.max(1, Math.floor(budget / nonEmpty.length));
  return Object.freeze(nonEmpty.flatMap((group) => group.keys.slice(0, perGroup)));
}

function sortedByOrderV3<T extends Readonly<{ order: number }>>(items: readonly T[]): T[] {
  return [...items].sort((left, right) => left.order - right.order);
}

/** Whether the author sealed an explicit observation for this role. */
export function articleBriefingHasItemEmphasisV3(
  items: readonly Readonly<{ emphasis?: ExperimentPlacementBriefingOutputV2["emphasis"] }>[],
): boolean {
  return items.some((item) => item.emphasis !== undefined);
}

/**
 * Output keys the author placed on the first screen, in sealed order. Content
 * sealed before item emphasis derives the initial observation from its
 * groups, bounded by the primary limit; an explicit all-supporting seal
 * yields an empty observation.
 */
export function articleBriefingPrimaryOutputKeysV3(
  briefing: Pick<ExperimentPlacementBriefingV2, "outputs">,
): readonly string[] {
  const outputs = sortedByOrderV3(briefing.outputs);
  if (articleBriefingHasItemEmphasisV3(outputs)) {
    return Object.freeze(outputs
      .filter((output) => output.emphasis === "primary")
      .map(articleBriefingOutputKeyV3));
  }
  return Object.freeze(defaultObservedItemKeysV3(articleBriefingOutputGroupsV3(outputs).map((group) => ({
    keys: group.outputs.map(articleBriefingOutputKeyV3),
  }))).slice(0, ARTICLE_PRIMARY_OUTPUT_LIMIT_V3));
}

/**
 * Control keys the author placed on the first screen. Without emphasis the
 * first sealed controller pane is the one the reader uses first, bounded by
 * the primary limit.
 */
export function articleBriefingPrimaryControlKeysV3(
  briefing: Pick<ExperimentPlacementBriefingV2, "controls">,
): readonly string[] {
  const controls = sortedByOrderV3(briefing.controls);
  if (articleBriefingHasItemEmphasisV3(controls)) {
    return Object.freeze(controls
      .filter((control) => control.emphasis === "primary")
      .map(articleBriefingControlKeyV3));
  }
  const firstPaneId = controls[0]?.sourcePaneId;
  return Object.freeze(controls
    .filter((control) => control.sourcePaneId === firstPaneId)
    .slice(0, ARTICLE_PRIMARY_CONTROL_LIMIT_V3)
    .map(articleBriefingControlKeyV3));
}

/** Whether one more item may join the primary set of its role. */
export function articleBriefingPrimaryRoomV3(
  role: "outputs" | "controls",
  primaryCount: number,
): boolean {
  const limit = role === "outputs" ? ARTICLE_PRIMARY_OUTPUT_LIMIT_V3 : ARTICLE_PRIMARY_CONTROL_LIMIT_V3;
  return primaryCount < limit;
}

/** One reading group is a source pane read for one Scenario. */
export function articleBriefingOutputGroupKeyV3(sourcePaneId: string, scenarioId: string): string {
  return `${sourcePaneId}\u001f${scenarioId}`;
}

export type ArticleBriefingOutputGroupV3 = Readonly<{
  key: string;
  sourcePaneId: string;
  scenarioId: string;
  outputs: readonly ExperimentPlacementBriefingOutputV2[];
}>;

/** One group is one source pane read for one Scenario, in sealed order. */
export function articleBriefingOutputGroupsV3(
  outputs: readonly ExperimentPlacementBriefingOutputV2[],
): readonly ArticleBriefingOutputGroupV3[] {
  const groups = new Map<string, { sourcePaneId: string; scenarioId: string; outputs: ExperimentPlacementBriefingOutputV2[] }>();
  for (const output of sortedByOrderV3(outputs)) {
    const key = articleBriefingOutputGroupKeyV3(output.sourcePaneId, output.scenarioId);
    const group = groups.get(key) ?? { sourcePaneId: output.sourcePaneId, scenarioId: output.scenarioId, outputs: [] };
    group.outputs.push(output);
    groups.set(key, group);
  }
  return Object.freeze([...groups].map(([key, group]) => Object.freeze({ key, ...group, outputs: Object.freeze(group.outputs) })));
}

/**
 * Source panes whose controllers open first in an opened form: every pane
 * holding a primary controller, or the first sealed pane when none is
 * primary. The other panes wait collapsed one tap away.
 */
export function articleBriefingInitialOpenControlPaneIdsV3(
  briefing: Pick<ExperimentPlacementBriefingV2, "controls">,
): readonly string[] {
  const controls = sortedByOrderV3(briefing.controls);
  const primary = new Set(articleBriefingPrimaryControlKeysV3(briefing));
  const open = new Set(controls
    .filter((control) => primary.has(articleBriefingControlKeyV3(control)))
    .map((control) => control.sourcePaneId));
  if (open.size === 0 && controls[0] !== undefined) open.add(controls[0].sourcePaneId);
  return Object.freeze([...open]);
}

/** Seals explicit emphasis for every item so a later edit is never ambiguous. */
export function withExplicitItemEmphasisV3<T extends object>(
  items: readonly T[],
  primaryKeys: ReadonlySet<string>,
  keyOf: (item: T) => string,
): readonly Readonly<T & { emphasis: ExperimentPlacementBriefingItemEmphasisV2 }>[] {
  return Object.freeze(items.map((item) => Object.freeze({
    ...item,
    emphasis: primaryKeys.has(keyOf(item)) ? "primary" as const : "supporting" as const,
  })));
}

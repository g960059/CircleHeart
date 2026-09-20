import type { ExperimentObservationGroupV3, ExperimentOutputPresentationItemV3 } from "@/components/workbench/ExperimentPanePresentationV3";
import { isGenericOutputPaneLabelV3 } from "@/components/workbench/presentation/WorkbenchObservationV3";
import { articleBriefingOutputGroupKeyV3 } from "@/studio/application/article/ArticleBriefingObservationV3";
import type { ExperimentPlacementBriefingV2 } from "@/studio/contracts/v2/content";

/** Only exposed targets need distinguishing; unused snapshot scenarios do not. */
export function articleReaderNeedsScenarioLabelsV3(briefing: ExperimentPlacementBriefingV2): boolean {
  const exposed = new Set(briefing.outputs.map(item => item.scenarioId));
  for (const { binding } of briefing.controls) {
    for (const id of binding.mode === "fixed" ? binding.scenarioIds : binding.allowedScenarioIds) exposed.add(id);
  }
  // Graph panes compare the sealed visible scope. Keep targets legible even
  // when only one of those scenarios has controllers or measurements.
  if (briefing.graphs.length > 0) for (const id of briefing.scenarioScope.visibleScenarioIds) exposed.add(id);
  return briefing.scenarioScope.visibleScenarioIds.filter(id => exposed.has(id)).length > 1;
}

/** Suppress a repeated target only for explicit, unambiguous title forms. */
export function articleReaderTitleNamesScenarioV3(title: string, scenario: string): boolean {
  const name = scenario.trim();
  const text = title.trim();
  return text === name || text === `${name}を操作` || text === `${name} を操作`
    || text.includes(`（${name}）`) || text.includes(`(${name})`);
}

/**
 * Groups observed items by source pane and Scenario. Headings appear only
 * where they distinguish: the Scenario whenever several are open, the pane
 * label whenever it differs from the Scenario name or several panes are
 * observed. A single pane read for a single Scenario shows tiles alone.
 */
export function articleReaderObservationGroupsV3(
  items: readonly ArticleReaderOutputItemV3[],
  naming: Readonly<{
    multiScenario: boolean;
    paneLabel: (paneId: string) => string | undefined;
    scenarioLabel: (scenarioId: string) => string;
    scenarioColor: (scenarioId: string) => string;
    /** Current-locale role words that, as a pane title, name nothing beyond the role. */
    genericTitles?: readonly string[];
  }>,
): readonly ExperimentObservationGroupV3[] {
  const groups = new Map<string, { sourcePaneId: string; scenarioId: string; items: ArticleReaderOutputItemV3[] }>();
  for (const item of items) {
    const key = articleBriefingOutputGroupKeyV3(item.sourcePaneId, item.scenarioId);
    const group = groups.get(key) ?? { sourcePaneId: item.sourcePaneId, scenarioId: item.scenarioId, items: [] };
    group.items.push(item);
    groups.set(key, group);
  }
  const several = groups.size > 1;
  return [...groups].map(([key, group]) => {
    const paneLabel = naming.paneLabel(group.sourcePaneId);
    const scenarioLabel = naming.scenarioLabel(group.scenarioId);
    const distinguishes = (several || naming.multiScenario) && paneLabel !== scenarioLabel;
    // One pane, one Scenario: the heading is visible only when the title
    // says more than the target (a subject such as valves); a title that
    // repeats the Scenario or merely names the role remains for assistive
    // technology so the group is still named.
    const title = paneLabel !== undefined && (distinguishes || !naming.multiScenario) ? paneLabel : undefined;
    const headingHidden = title !== undefined && !several && !naming.multiScenario
      && (paneLabel === scenarioLabel || isGenericOutputPaneLabelV3(paneLabel ?? "", naming.genericTitles ?? []));
    return {
      key,
      ...(title === undefined ? {} : { title }),
      ...(naming.multiScenario ? { scenario: { label: scenarioLabel, colorHex: naming.scenarioColor(group.scenarioId) } } : {}),
      ...(headingHidden ? { headingHidden: true } : {}),
      items: group.items,
    };
  });
}

export type ArticleReaderOutputItemV3 = ExperimentOutputPresentationItemV3 & Readonly<{ scenarioId: string; sourcePaneId: string }>;

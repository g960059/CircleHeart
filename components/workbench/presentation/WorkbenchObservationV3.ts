import React from "react";

import type {
  ExperimentObservationGroupV3,
  ExperimentOutputPresentationItemV3 as Item,
} from "../ExperimentPanePresentationV3";
import type { WorkbenchLastMeasuredOutputsV1 } from "./WorkbenchLastMeasuredOutputsV1";
import { defaultObservedItemKeysV3 } from "@/studio/application/article/ArticleBriefingObservationV3";
import { WORKBENCH_DEFAULT_OUTPUT_PANE_LABEL_V3 } from "@/components/workbench/WorkbenchSurfaceV3";

/**
 * Whether a pane label only names the output role (the stored default
 * `Outputs`, or the current locale's role words) rather than a subject such
 * as valves or a Scenario. Compared trimmed and case-insensitively.
 */
export function isGenericOutputPaneLabelV3(label: string, localeRoleWords: readonly string[] = []): boolean {
  const normalized = label.trim().toLowerCase();
  if (normalized.length === 0) return true;
  return [WORKBENCH_DEFAULT_OUTPUT_PANE_LABEL_V3, ...localeRoleWords].some((word) => word.trim().toLowerCase() === normalized);
}

/**
 * The phone Workbench observation: a few measurement tiles kept between the
 * graph and the task deck while a control is used.
 *
 * Keys name a source pane and one of its presentation items. Values follow
 * the pane's fixed or active-slot binding. The compact view takes the first
 * items of each configured pane; expansion shows all, without another
 * membership selection. Composition is edited in the pane itself.
 */
export function workbenchObservedOutputKeyV3(paneId: string, itemId: string): string {
  return `${paneId}\u001f${itemId}`;
}

/** Display memory is scoped by pane and by the Scenario the pane resolves to. */
export function workbenchMeasurementScopeKeyV3(paneId: string, scenarioId: string | null): string {
  return `${paneId}\u001f${scenarioId ?? ""}`;
}

/** One output pane read for the observation: its live tiles and their display memory. */
export type WorkbenchOutputPaneReadingV3 = Readonly<{
  paneId: string;
  title: string;
  /** Whether the pane's Scenario follows the active slot or is fixed. */
  bindingMode: "active-slot" | "fixed";
  scenarioId: string | null;
  /** Label of the resolved Scenario, whatever the number of Scenarios. */
  scenarioLabel?: string;
  /** Tiles as materialized for this render; not yet projected through memory. */
  measured: readonly Item[];
  memory: WorkbenchLastMeasuredOutputsV1;
  previousValueNotice: string;
  /** Scenario the pane resolves to, shown when several Scenarios are open. */
  scenario?: Readonly<{ label: string; colorHex: string }>;
}>;

/** Compact and expanded views always derive from current pane composition. */
export function workbenchMobileOutputKeysV3(
  readings: readonly Pick<WorkbenchOutputPaneReadingV3, "paneId" | "measured">[],
  expanded: boolean,
): readonly string[] {
  const available = readings.flatMap((reading) => reading.measured.map((item) => workbenchObservedOutputKeyV3(reading.paneId, item.itemId)));
  if (!expanded) {
    return defaultObservedItemKeysV3(readings.map((reading) => ({
      keys: reading.measured.map((item) => workbenchObservedOutputKeyV3(reading.paneId, item.itemId)),
    })));
  }
  return Object.freeze(available);
}

/**
 * Render-phase projection only: retained previous values are read from
 * memory, never written. One group per pane keeps the pane's title and its
 * resolved Scenario once; tiles carry a Session-unique identity.
 *
 * A lone reading does not need a label column. With several groups, subject
 * labels and distinct Scenarios remain visible; repeated sole-target titles
 * remain accessible without consuming measurement space.
 */
export function projectWorkbenchObservationV3(
  readings: readonly WorkbenchOutputPaneReadingV3[],
  observedKeys: readonly string[],
  options: Readonly<{ genericTitles?: readonly string[] }> = {},
): readonly ExperimentObservationGroupV3[] {
  const observed = new Set(observedKeys);
  const groups = readings.flatMap((reading) => {
    const items = reading.memory.project(reading.measured, reading.previousValueNotice)
      .filter((item) => observed.has(workbenchObservedOutputKeyV3(reading.paneId, item.itemId)))
      .map((item) => ({ ...item, itemId: workbenchObservedOutputKeyV3(reading.paneId, item.itemId) }));
    return items.length === 0 ? [] : [{ reading, items }];
  });
  return groups.map(({ reading, items }) => {
    const title = reading.title.trim();
    const titleOnlyNamesTarget = isGenericOutputPaneLabelV3(title, options.genericTitles ?? [])
      || (reading.scenarioLabel !== undefined && title === reading.scenarioLabel.trim());
    const headingHidden = groups.length === 1 || (reading.scenario === undefined && titleOnlyNamesTarget);
    return {
      key: reading.paneId,
      title: reading.title,
      ...(reading.scenario === undefined ? {} : { scenario: reading.scenario }),
      following: reading.bindingMode === "active-slot",
      ...(headingHidden ? { headingHidden: true } : {}),
      items,
    };
  });
}

/** Commit-phase memory update: every pane's complete measured set, after React commits. */
export function useWorkbenchRememberedReadingsV3(readings: readonly WorkbenchOutputPaneReadingV3[]): void {
  React.useLayoutEffect(() => {
    for (const reading of readings) reading.memory.remember(reading.measured);
  }, [readings]);
}

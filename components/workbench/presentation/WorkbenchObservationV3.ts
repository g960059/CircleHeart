import React from "react";

import type {
  ExperimentObservationGroupV3,
  ExperimentOutputPresentationItemV3 as Item,
} from "../ExperimentPanePresentationV3";
import type { WorkbenchLastMeasuredOutputsV1 } from "./WorkbenchLastMeasuredOutputsV1";
import { defaultObservedItemKeysV3 } from "@/studio/application/article/ArticleBriefingObservationV3";

/**
 * The phone Workbench observation: a few measurement tiles kept between the
 * graph and the task deck while a control is used.
 *
 * Observed keys name a source pane and one of its presentation items. The
 * pane keeps its own Scenario binding (fixed or active slot), so an observed
 * item follows the pane, never a Scenario of its own. The selection is
 * Session presentation state: it survives breakpoint changes, reconciles
 * removed panes and items, and keeps an explicit empty choice empty. It is
 * never durable Experiment content.
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
  /** Tiles as materialized for this render; not yet projected through memory. */
  measured: readonly Item[];
  memory: WorkbenchLastMeasuredOutputsV1;
  previousValueNotice: string;
  /** Scenario the pane resolves to, shown when several Scenarios are open. */
  scenario?: Readonly<{ label: string; colorHex: string }>;
}>;

/** Selection resolved against the panes that exist now; `null` is the initial choice. */
export function resolveWorkbenchObservedKeysV3(
  selection: readonly string[] | null,
  readings: readonly Pick<WorkbenchOutputPaneReadingV3, "paneId" | "measured">[],
): readonly string[] {
  const available = readings.flatMap((reading) => reading.measured.map((item) => workbenchObservedOutputKeyV3(reading.paneId, item.itemId)));
  if (selection === null) {
    return defaultObservedItemKeysV3(readings.map((reading) => ({
      keys: reading.measured.map((item) => workbenchObservedOutputKeyV3(reading.paneId, item.itemId)),
    })));
  }
  const availableSet = new Set(available);
  return Object.freeze(selection.filter((key) => availableSet.has(key)));
}

/**
 * Render-phase projection only: retained previous values are read from
 * memory, never written. One group per pane keeps the pane's title and its
 * resolved Scenario once; tiles carry a Session-unique identity.
 */
export function projectWorkbenchObservationV3(
  readings: readonly WorkbenchOutputPaneReadingV3[],
  observedKeys: readonly string[],
): readonly ExperimentObservationGroupV3[] {
  const observed = new Set(observedKeys);
  return readings.flatMap((reading) => {
    const items = reading.memory.project(reading.measured, reading.previousValueNotice)
      .filter((item) => observed.has(workbenchObservedOutputKeyV3(reading.paneId, item.itemId)))
      .map((item) => ({ ...item, itemId: workbenchObservedOutputKeyV3(reading.paneId, item.itemId) }));
    if (items.length === 0) return [];
    return [{
      key: reading.paneId,
      title: reading.title,
      ...(reading.scenario === undefined ? {} : { scenario: reading.scenario }),
      following: reading.bindingMode === "active-slot",
      items,
    }];
  });
}

/** Commit-phase memory update: every pane's complete measured set, after React commits. */
export function useWorkbenchRememberedReadingsV3(readings: readonly WorkbenchOutputPaneReadingV3[]): void {
  React.useLayoutEffect(() => {
    for (const reading of readings) reading.memory.remember(reading.measured);
  }, [readings]);
}

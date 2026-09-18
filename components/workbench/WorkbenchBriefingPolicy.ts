import {
  defaultArticleBriefingV3,
  materializeSurfaceControlPaneBindingV3,
} from "@/studio/application/article/ArticleExperimentPlacementV3";
import { reconcileWorkbenchGraphColorsV3 } from "@/components/workbench/presentation/WorkbenchGraphColorV3";
import { validateExperimentPlacementBriefingV2 } from "@/studio/application/authoring/StudioExperimentDataV2";
import {
  STUDIO_EXPERIMENT_SNAPSHOT_V2_SCHEMA_ID,
  type ExperimentPlacementBriefingGraphOverridesV2,
  type ExperimentPlacementBriefingV2,
  type ExperimentScenarioV2,
  type ExperimentSnapshotV2,
  type ExperimentSurfaceGraphPaneV2,
  type ExperimentSurfaceV2,
} from "@/studio/contracts/v2/content";
import type { StudioSimulationWorkerScenarioDescriptorV2 } from "@/studio/workers/StudioSimulationWorkerProtocolV2";

export function createWorkbenchBriefingSnapshotV3(
  input: Readonly<{
    defaultTitle?: string;
    modelId: string;
    surfaceSeriesId: string;
    surfaceReleaseId: string;
    scenarios: readonly StudioSimulationWorkerScenarioDescriptorV2[];
    surface: ExperimentSurfaceV2;
  }>,
): ExperimentSnapshotV2 {
  if (input.scenarios.length === 0) {
    throw new Error("Workbench Briefing requires at least one Scenario");
  }
  const surface = reconcileWorkbenchGraphColorsV3(
    input.surface,
    input.scenarios,
  );
  const content = Object.freeze({
    modelId: input.modelId,
    surfaceSeriesId: input.surfaceSeriesId,
    scenarios: Object.freeze(
      input.scenarios.map((scenario) =>
        Object.freeze({
          scenarioId: scenario.scenarioId,
          label: scenario.label,
          capture: Object.freeze({
            fixture: Object.freeze({}),
            checkpoint: Object.freeze({
              acceptedRevision: 0,
              acceptedTimeSec: 0,
              payload: Object.freeze({}),
            }),
          }),
        }),
      ),
    ),
    surface,
  });
  return Object.freeze({
    schemaId: STUDIO_EXPERIMENT_SNAPSHOT_V2_SCHEMA_ID,
    snapshotId: "snapshot/workbench-briefing-composer",
    createdAt: "1970-01-01T00:00:00.000Z",
    surfaceReleaseId: input.surfaceReleaseId,
    content,
  });
}

/**
 * A Briefing editor is a projection frozen when its drawer opens. Live
 * numerical state may continue advancing, but changing the Scenario
 * collection or labels makes that projection stale and requires reopening
 * the composer before capture.
 */
export function workbenchBriefingSourceScenariosMatchV3(
  sourceSnapshot: ExperimentSnapshotV2,
  capturedScenarios: readonly ExperimentScenarioV2[],
): boolean {
  return (
    sourceSnapshot.content.scenarios.length === capturedScenarios.length &&
    sourceSnapshot.content.scenarios.every((source, index) => {
      const captured = capturedScenarios[index];
      return (
        captured !== undefined &&
        source.scenarioId === captured.scenarioId &&
        source.label === captured.label
      );
    })
  );
}

/**
 * Placement edits begin from the exact captured projection. An in-session
 * composer value wins only after the Session has authored one.
 */
export function resolveWorkbenchInitialBriefingV3(
  input: Readonly<{
    current: ExperimentPlacementBriefingV2 | null;
    sourceBriefing: ExperimentPlacementBriefingV2 | null;
  }>,
): ExperimentPlacementBriefingV2 | null {
  return input.current ?? input.sourceBriefing;
}

/**
 * Rebinds session-only author choices to the current Scenario/Surface schema.
 * Empty graph/output/control selections are intentional and remain empty.
 */
export function reconcileWorkbenchBriefingV3(
  input: Readonly<{
    briefing: ExperimentPlacementBriefingV2 | null;
    preferredFocusScenarioId: string;
    defaultTitle?: string;
    snapshot: ExperimentSnapshotV2;
  }>,
): ExperimentPlacementBriefingV2 {
  const availableScenarioIds = input.snapshot.content.scenarios.map(
    ({ scenarioId }) => scenarioId,
  );
  const fallbackFocusScenarioId = availableScenarioIds.includes(
    input.preferredFocusScenarioId,
  )
    ? input.preferredFocusScenarioId
    : availableScenarioIds[0];
  if (fallbackFocusScenarioId === undefined) {
    throw new Error("Workbench Briefing requires at least one Snapshot Scenario");
  }

  const defaultBriefing = defaultArticleBriefingV3(
    input.snapshot,
    fallbackFocusScenarioId,
    input.defaultTitle,
  );
  const authored = input.briefing ?? defaultBriefing;
  const authoredVisible = new Set(authored.scenarioScope.visibleScenarioIds);
  const retainedVisibleScenarioIds = availableScenarioIds.filter((scenarioId) =>
    authoredVisible.has(scenarioId),
  );
  const visibleScenarioIds = retainedVisibleScenarioIds.length > 0
    ? retainedVisibleScenarioIds
    : [fallbackFocusScenarioId];
  const initialFocusScenarioId = visibleScenarioIds.includes(
    authored.scenarioScope.initialFocusScenarioId,
  )
    ? authored.scenarioScope.initialFocusScenarioId
    : visibleScenarioIds.includes(fallbackFocusScenarioId)
      ? fallbackFocusScenarioId
      : visibleScenarioIds[0]!;

  const graphPanesById = new Map(
    input.snapshot.content.surface.graphPanes.map((pane) => [pane.paneId, pane]),
  );
  const graphs = [...authored.graphs]
    .sort(compareBriefingOrderV3)
    .flatMap((graph) => {
      const pane = graphPanesById.get(graph.paneId);
      if (pane === undefined) return [];
      const overrides = reconcileWorkbenchGraphOverridesV3(
        graph.overrides,
        pane,
        visibleScenarioIds,
      );
      return [
        Object.freeze({
          paneId: graph.paneId,
          order: 0,
          emphasis: graph.emphasis,
          ...(overrides === undefined ? {} : { overrides }),
        }),
      ];
    })
    .map((graph, order) => Object.freeze({ ...graph, order }));
  if (
    graphs.length > 0 &&
    !graphs.some(({ emphasis }) => emphasis === "primary")
  ) {
    graphs[0] = Object.freeze({ ...graphs[0]!, emphasis: "primary" });
  }

  const availableOutputKeys = new Set(
    input.snapshot.content.surface.outputPanes.flatMap((pane) =>
      pane.items.map(({ outputId }) =>
        workbenchBriefingOutputKeyV3(pane.paneId, outputId),
      ),
    ),
  );
  const seenOutputKeys = new Set<string>();
  const outputs = [...authored.outputs]
    .sort(compareBriefingOrderV3)
    .filter(({ sourcePaneId, outputId, scenarioId }) => {
      const key = workbenchBriefingOutputKeyV3(sourcePaneId, outputId);
      if (
        !availableOutputKeys.has(key) ||
        seenOutputKeys.has(key) ||
        !visibleScenarioIds.includes(scenarioId)
      ) {
        return false;
      }
      seenOutputKeys.add(key);
      return true;
    })
    .map((output, order) => Object.freeze({ ...output, order }));

  const availableControlKeys = new Set(
    input.snapshot.content.surface.controlPanes.flatMap((pane) =>
      pane.items.map(({ controlId }) =>
        workbenchBriefingControlKeyV3(pane.paneId, controlId),
      ),
    ),
  );
  const seenControlKeys = new Set<string>();
  const controls = [...authored.controls]
    .sort(compareBriefingOrderV3)
    .filter(({ sourcePaneId, controlId }) => {
      const key = workbenchBriefingControlKeyV3(sourcePaneId, controlId);
      if (!availableControlKeys.has(key) || seenControlKeys.has(key)) {
        return false;
      }
      seenControlKeys.add(key);
      return true;
    })
    .map((control, order) =>
      Object.freeze({
        ...control,
        order,
        binding: reconcileWorkbenchControlBindingV3(
          control.binding,
          visibleScenarioIds,
          initialFocusScenarioId,
        ),
      }),
    );

  // The sealed reading form survives re-capture; its views keep only graphs
  // that are still selected, so it can never name a pane the Briefing lost.
  const retainedGraphIds = new Set(graphs.map(({ paneId }) => paneId));
  const presentation = authored.presentation === undefined
    ? undefined
    : Object.freeze({
        ...authored.presentation,
        ...(authored.presentation.views === undefined ? {} : {
          views: Object.freeze(authored.presentation.views
            .map((view) => Object.freeze({
              paneIds: Object.freeze(view.paneIds.filter((paneId) => retainedGraphIds.has(paneId))),
            }))
            .filter((view) => view.paneIds.length > 0)),
        }),
      });

  const candidate = Object.freeze({
    // The composer has no detached title editor. Its default title always
    // comes from the frozen source projection so a stale in-memory Briefing
    // cannot override the Experiment title captured for this seal.
    defaultTitle: input.defaultTitle ?? authored.defaultTitle,
    scenarioScope: Object.freeze({
      visibleScenarioIds: Object.freeze(visibleScenarioIds),
      initialFocusScenarioId,
    }),
    graphs: Object.freeze(graphs),
    outputs: Object.freeze(outputs),
    controls: Object.freeze(controls),
    ...(presentation === undefined ? {} : { presentation }),
  });
  return validateExperimentPlacementBriefingV2(
    candidate,
    input.snapshot.content,
  );
}

/** Materializes the Workbench active slot only for newly picked controls. */
export function resolveWorkbenchBriefingEditorChangeV3(
  input: Readonly<{
    activeScenarioId: string;
    current: ExperimentPlacementBriefingV2;
    next: ExperimentPlacementBriefingV2;
    snapshot: ExperimentSnapshotV2;
  }>,
): ExperimentPlacementBriefingV2 {
  const availableScenarioIds = input.snapshot.content.scenarios.map(
    ({ scenarioId }) => scenarioId,
  );
  const activeScenarioId = availableScenarioIds.includes(input.activeScenarioId)
    ? input.activeScenarioId
    : input.next.scenarioScope.initialFocusScenarioId;
  const existingControlKeys = new Set(
    input.current.controls.map(({ sourcePaneId, controlId }) =>
      workbenchBriefingControlKeyV3(sourcePaneId, controlId),
    ),
  );
  const hasNewControl = input.next.controls.some(
    ({ sourcePaneId, controlId }) =>
      !existingControlKeys.has(
        workbenchBriefingControlKeyV3(sourcePaneId, controlId),
      ),
  );
  const visibleScenarioIds = hasNewControl
    ? availableScenarioIds.filter(
        (scenarioId) =>
          input.next.scenarioScope.visibleScenarioIds.includes(scenarioId) ||
          scenarioId === activeScenarioId,
      )
    : input.next.scenarioScope.visibleScenarioIds;
  const candidate = Object.freeze({
    ...input.next,
    scenarioScope: Object.freeze({
      ...input.next.scenarioScope,
      visibleScenarioIds: Object.freeze(visibleScenarioIds),
    }),
    controls: Object.freeze(
      input.next.controls.map((control) => {
        const key = workbenchBriefingControlKeyV3(
          control.sourcePaneId,
          control.controlId,
        );
        if (existingControlKeys.has(key)) return control;
        const sourcePane = input.snapshot.content.surface.controlPanes.find(
          ({ paneId }) => paneId === control.sourcePaneId,
        );
        return sourcePane === undefined
          ? control
          : Object.freeze({
              ...control,
              binding: materializeSurfaceControlPaneBindingV3(
                sourcePane.binding,
                activeScenarioId,
                availableScenarioIds,
              ),
            });
      }),
    ),
  });
  return reconcileWorkbenchBriefingV3({
    briefing: candidate,
    preferredFocusScenarioId: input.next.scenarioScope.initialFocusScenarioId,
    defaultTitle: input.current.defaultTitle,
    snapshot: input.snapshot,
  });
}

function workbenchBriefingControlKeyV3(
  sourcePaneId: string,
  controlId: string,
): string {
  return `${sourcePaneId}\u001f${controlId}`;
}

function workbenchBriefingOutputKeyV3(
  sourcePaneId: string,
  outputId: string,
): string {
  return `${sourcePaneId}\u001f${outputId}`;
}

function reconcileWorkbenchGraphOverridesV3(
  overrides: ExperimentPlacementBriefingGraphOverridesV2 | undefined,
  pane: ExperimentSurfaceGraphPaneV2,
  visibleScenarioIds: readonly string[],
): ExperimentPlacementBriefingGraphOverridesV2 | undefined {
  if (overrides === undefined) return undefined;
  const availableSeriesIds = new Set(pane.series.map(({ seriesId }) => seriesId));
  const series = overrides.series === undefined
    ? undefined
    : [...overrides.series]
        .sort(compareBriefingOrderV3)
        .filter(({ seriesId }) => availableSeriesIds.has(seriesId))
        .map((item, order) => Object.freeze({ ...item, order }));
  const retainSeries =
    series !== undefined && (series.length > 0 || pane.series.length === 0);
  const selectedSeriesIds = new Set(
    (retainSeries ? series : pane.series)?.map(({ seriesId }) => seriesId),
  );
  const visibleScenarioSet = new Set(visibleScenarioIds);
  const traceColors = overrides.traceColors?.filter(
    (trace) =>
      visibleScenarioSet.has(trace.scenarioId) &&
      (trace.seriesId === null
        ? pane.series.length === 0
        : selectedSeriesIds.has(trace.seriesId)),
  );
  const next: ExperimentPlacementBriefingGraphOverridesV2 = Object.freeze({
    ...(overrides.label === undefined ? {} : { label: overrides.label }),
    ...(overrides.legend === undefined ? {} : { legend: overrides.legend }),
    ...(retainSeries ? { series: Object.freeze(series) } : {}),
    ...(traceColors === undefined
      ? {}
      : {
          traceColors: Object.freeze(
            traceColors.map((trace) => Object.freeze({ ...trace })),
          ),
        }),
    ...(overrides.windowSec === undefined || pane.windowSec === undefined
      ? {}
      : { windowSec: overrides.windowSec }),
    ...(overrides.historyDepth === undefined || pane.historyDepth === undefined
      ? {}
      : { historyDepth: overrides.historyDepth }),
    ...(overrides.pvTrailBeats === undefined || pane.pressureVolumeAnalysisMode === undefined
      ? {}
      : { pvTrailBeats: overrides.pvTrailBeats }),
  });
  return Object.keys(next).length === 0 ? undefined : next;
}

function reconcileWorkbenchControlBindingV3(
  binding: ExperimentPlacementBriefingV2["controls"][number]["binding"],
  visibleScenarioIds: readonly string[],
  initialFocusScenarioId: string,
): ExperimentPlacementBriefingV2["controls"][number]["binding"] {
  const visible = new Set(visibleScenarioIds);
  if (binding.mode === "reader-focus") {
    const allowedScenarioIds = binding.allowedScenarioIds.filter((scenarioId) =>
      visible.has(scenarioId),
    );
    return Object.freeze({
      mode: "reader-focus",
      allowedScenarioIds: Object.freeze(
        allowedScenarioIds.length > 0
          ? allowedScenarioIds
          : [initialFocusScenarioId],
      ),
    });
  }
  const scenarioIds = binding.scenarioIds.filter((scenarioId) =>
    visible.has(scenarioId),
  );
  return Object.freeze({
    mode: "fixed",
    scenarioIds: Object.freeze(
      scenarioIds.length > 0 ? scenarioIds : [initialFocusScenarioId],
    ),
    application: "absolute",
  });
}

function compareBriefingOrderV3(
  left: Readonly<{ order: number }>,
  right: Readonly<{ order: number }>,
): number {
  return left.order - right.order;
}

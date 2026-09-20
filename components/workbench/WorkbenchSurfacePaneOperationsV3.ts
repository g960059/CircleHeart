import type {
  ExperimentSurfaceControlPaneV2,
  ExperimentSurfaceGraphPaneV2,
  ExperimentSurfaceOutputPaneV2,
  ExperimentSurfaceV2,
} from "@/studio/contracts/v2/content";
import type { ModelContractV2 } from "@/studio/contracts/v2/model";
import {
  controlLabelV3,
  graphSeriesLabelV3,
  graphTitleV3,
  outputLabelV3,
  resolveWorkbenchOutputPaneScenarioIdV3,
  WORKBENCH_GRAPH_HISTORY_DEFAULT_DEPTH_V3,
  WORKBENCH_PRESSURE_VOLUME_ANALYSIS_DEFAULT_MODE_V3,
  WORKBENCH_PRESSURE_VOLUME_ENVELOPE_DEFAULT_VISIBLE_V3,
  WORKBENCH_SWEEP_WINDOW_DEFAULT_SEC_V3,
  WORKBENCH_DEFAULT_OUTPUT_PANE_LABEL_V3,
} from "./WorkbenchSurfaceV3";

export type WorkbenchPaneIdentityV3 = Readonly<{
  kind: "graph" | "output" | "control";
  paneId: string;
}>;

export type WorkbenchSurfacePaneV3 =
  | ExperimentSurfaceGraphPaneV2
  | ExperimentSurfaceOutputPaneV2
  | ExperimentSurfaceControlPaneV2;

export function findWorkbenchSurfacePaneV3(
  surface: ExperimentSurfaceV2,
  selectedPane: WorkbenchPaneIdentityV3,
): WorkbenchSurfacePaneV3 | undefined {
  return paneCollectionV3(surface, selectedPane.kind).find(
    ({ paneId }) => paneId === selectedPane.paneId,
  );
}

export function updateWorkbenchSurfacePaneV3(
  surface: ExperimentSurfaceV2,
  selectedPane: WorkbenchPaneIdentityV3,
  update: (pane: WorkbenchSurfacePaneV3) => WorkbenchSurfacePaneV3,
): ExperimentSurfaceV2 {
  const key = paneCollectionKeyV3(selectedPane.kind);
  const collection = surface[key];
  let found = false;
  const nextCollection = collection.map((pane) => {
    if (pane.paneId !== selectedPane.paneId) return pane;
    found = true;
    return update(pane as WorkbenchSurfacePaneV3) as never;
  });
  if (!found) return surface;
  return { ...surface, [key]: nextCollection };
}

export function addWorkbenchSurfacePaneV3(
  surface: ExperimentSurfaceV2,
  kind: WorkbenchPaneIdentityV3["kind"],
  contract: ModelContractV2,
  graphId?: string,
  structuralSide?: "left" | "right",
  options: Readonly<{
    periodicPvaSupported?: boolean;
    emptyItems?: boolean;
  }> = Object.freeze({}),
): Readonly<{
  surface: ExperimentSurfaceV2;
  selectedPane: WorkbenchPaneIdentityV3 | null;
}> {
  const paneId = nextPaneIdV3(new Set(allPaneIdsV3(surface)), kind);
  const collection = paneCollectionV3(surface, kind);
  const order = nextOrderV3(collection);
  const priority = collection.reduce(
    (highest, pane) => Math.max(highest, pane.priority),
    kind === "graph" ? 50 : kind === "output" ? 40 : 30,
  );

  if (kind === "graph") {
    const graph = graphId === undefined
      ? undefined
      : contract.graphCatalog.find((candidate) => candidate.graphId === graphId);
    if (graph === undefined) return { surface, selectedPane: null };
    const selectedStructuralSide = graph.renderer === "structural-return"
      ? (structuralSide ?? (graph.side === "both" ? "right" : graph.side))
      : undefined;
    const pane: ExperimentSurfaceGraphPaneV2 = {
      paneId,
      role: "graph",
      label: graphTitleV3(graph.graphId, selectedStructuralSide),
      order,
      priority,
      graphId: graph.graphId,
      scenarioScope: { mode: "visible-scenarios" },
      excludedTraces: [],
      ...(graph.renderer === "sweep"
        ? { windowSec: WORKBENCH_SWEEP_WINDOW_DEFAULT_SEC_V3 }
        : {
            ...(graph.renderer === "cycle-waveform" ? {} : { historyDepth: WORKBENCH_GRAPH_HISTORY_DEFAULT_DEPTH_V3 }),
            ...(graph.renderer === "pressure-volume"
              ? options.periodicPvaSupported === false
                ? {
                    pressureVolumeAnalysisMode: "raw-exact-orbit" as const,
                  }
                : {
                    pressureVolumeAnalysisMode:
                      WORKBENCH_PRESSURE_VOLUME_ANALYSIS_DEFAULT_MODE_V3,
                    showPressureEnvelope:
                      WORKBENCH_PRESSURE_VOLUME_ENVELOPE_DEFAULT_VISIBLE_V3,
                  }
              : {}),
            ...(graph.renderer === "structural-return"
              ? { structuralSide: selectedStructuralSide! }
              : {}),
          }),
      traceColors: [],
      series: options.emptyItems || graph.renderer === "structural-return" || graph.renderer === "cycle-waveform"
        ? []
        : graph.defaultSeriesIds.map((seriesId, seriesOrder) => ({
            seriesId,
            label: graphSeriesLabelV3(seriesId),
            order: seriesOrder,
          })),
    };
    return {
      surface: { ...surface, graphPanes: [...surface.graphPanes, pane] },
      selectedPane: { kind, paneId },
    };
  }

  if (kind === "output") {
    const pane: ExperimentSurfaceOutputPaneV2 = {
      paneId,
      role: "output",
      label: WORKBENCH_DEFAULT_OUTPUT_PANE_LABEL_V3,
      order,
      priority,
      binding: { mode: "active-slot" },
      items: contract.outputCatalog.slice(0, options.emptyItems ? 0 : 1).map((output) => ({
        outputId: output.outputId,
        label: outputLabelV3(output.outputId),
        order: 0,
      })),
    };
    return {
      surface: { ...surface, outputPanes: [...surface.outputPanes, pane] },
      selectedPane: { kind, paneId },
    };
  }

  const pane: ExperimentSurfaceControlPaneV2 = {
    paneId,
    role: "control",
    label: "Parameters",
    order,
    priority,
    binding: { mode: "active-slot" },
    items: contract.controlCatalog.slice(0, options.emptyItems ? 0 : 1).map((control) => ({
      controlId: control.controlId,
      label: controlLabelV3(control.controlId),
      order: 0,
      presentation: { kind: "slider" },
    })),
  };
  return {
    surface: { ...surface, controlPanes: [...surface.controlPanes, pane] },
    selectedPane: { kind, paneId },
  };
}

export function deleteWorkbenchSurfacePaneV3(
  surface: ExperimentSurfaceV2,
  selectedPane: WorkbenchPaneIdentityV3,
): Readonly<{
  deleted: boolean;
  surface: ExperimentSurfaceV2;
  nextSelectedPane: WorkbenchPaneIdentityV3 | null;
}> {
  const key = paneCollectionKeyV3(selectedPane.kind);
  const collection = surface[key];
  const remaining = collection.filter(
    ({ paneId }) => paneId !== selectedPane.paneId,
  );
  if (remaining.length === collection.length) {
    return { deleted: false, surface, nextSelectedPane: selectedPane };
  }
  const nextPane = [...remaining].sort(comparePaneOrderV3)[0];
  return {
    deleted: true,
    surface: { ...surface, [key]: remaining },
    nextSelectedPane: nextPane === undefined
      ? null
      : { kind: selectedPane.kind, paneId: nextPane.paneId },
  };
}

export function duplicateWorkbenchSurfacePaneV3(
  surface: ExperimentSurfaceV2,
  selectedPane: WorkbenchPaneIdentityV3,
): Readonly<{
  paneId: string | null;
  surface: ExperimentSurfaceV2;
}> {
  const source = findWorkbenchSurfacePaneV3(surface, selectedPane);
  if (source === undefined) return { paneId: null, surface };
  const paneId = nextPaneIdV3(
    new Set(allPaneIdsV3(surface)),
    selectedPane.kind,
  );
  const order = nextOrderV3(paneCollectionV3(surface, selectedPane.kind));
  const copy: WorkbenchSurfacePaneV3 = source.role === "graph"
    ? {
        ...source,
        paneId,
        order,
        series: source.series.map((series) => ({ ...series })),
        ...(source.traceColors === undefined
          ? {}
          : { traceColors: source.traceColors.map((trace) => ({ ...trace })) }),
        scenarioScope: source.scenarioScope.mode === "fixed"
          ? {
              mode: "fixed",
              scenarioIds: [...source.scenarioScope.scenarioIds],
            }
          : { mode: "visible-scenarios" },
        excludedTraces: source.excludedTraces.map((trace) => ({ ...trace })),
      }
    : source.role === "output"
      ? {
          ...source,
          paneId,
          order,
          binding: source.binding.mode === "fixed"
            ? { mode: "fixed", scenarioId: source.binding.scenarioId }
            : { mode: "active-slot" },
          items: source.items.map((item) => ({ ...item })),
        }
      : {
          ...source,
          paneId,
          order,
          binding: source.binding.mode === "fixed"
            ? { mode: "fixed", scenarioIds: [...source.binding.scenarioIds] }
            : { mode: "active-slot" },
          items: source.items.map((item) => ({
            ...item,
            presentation: item.presentation.kind === "buttons"
              ? {
                  kind: "buttons" as const,
                  options: item.presentation.options.map((option) => ({
                    ...option,
                  })),
                }
              : { kind: "slider" as const },
          })),
        };
  const key = paneCollectionKeyV3(selectedPane.kind);
  return {
    paneId,
    surface: { ...surface, [key]: [...surface[key], copy] },
  };
}

/** Creates one side-by-side copy fixed to the next unrepresented Scenario. */
export function compareWorkbenchOutputPaneByScenarioV3(
  surface: ExperimentSurfaceV2,
  options: Readonly<{
    paneId: string;
    activeScenarioId: string | null;
    scenarios: readonly Readonly<{ scenarioId: string }>[];
  }>,
): Readonly<{
  paneId: string | null;
  surface: ExperimentSurfaceV2;
}> {
  if (options.scenarios.length < 2) return { paneId: null, surface };
  const source = surface.outputPanes.find(
    ({ paneId }) => paneId === options.paneId,
  );
  if (source === undefined) return { paneId: null, surface };

  const sourceScenarioId = resolveWorkbenchOutputPaneScenarioIdV3(
    source,
    options.activeScenarioId,
    options.scenarios,
  );
  if (sourceScenarioId === null) return { paneId: null, surface };

  const outputSignature = (pane: ExperimentSurfaceOutputPaneV2) =>
    JSON.stringify(
      [...pane.items]
        .sort((left, right) => left.order - right.order)
        .map(({ outputId, label }) => [outputId, label]),
    );
  const sourceSignature = outputSignature(source);
  const representedScenarioIds = new Set(
    surface.outputPanes.flatMap((pane) => {
      if (outputSignature(pane) !== sourceSignature) return [];
      const scenarioId = resolveWorkbenchOutputPaneScenarioIdV3(
        pane,
        options.activeScenarioId,
        options.scenarios,
      );
      return scenarioId === null ? [] : [scenarioId];
    }),
  );
  const comparisonScenario = options.scenarios.find(
    ({ scenarioId }) =>
      scenarioId !== sourceScenarioId
      && !representedScenarioIds.has(scenarioId),
  );
  if (comparisonScenario === undefined) return { paneId: null, surface };

  const duplicate = duplicateWorkbenchSurfacePaneV3(surface, {
    kind: "output",
    paneId: options.paneId,
  });
  if (duplicate.paneId === null) return duplicate;
  const sourceFixed = updateWorkbenchSurfacePaneV3(
    duplicate.surface,
    { kind: "output", paneId: options.paneId },
    (pane) => pane.role === "output"
      ? {
          ...pane,
          binding: { mode: "fixed", scenarioId: sourceScenarioId },
        }
      : pane,
  );
  return {
    paneId: duplicate.paneId,
    surface: updateWorkbenchSurfacePaneV3(
      sourceFixed,
      { kind: "output", paneId: duplicate.paneId },
      (pane) => pane.role === "output"
        ? {
            ...pane,
            binding: {
              mode: "fixed",
              scenarioId: comparisonScenario.scenarioId,
            },
          }
        : pane,
    ),
  };
}

function nextPaneIdV3(
  existingPaneIds: ReadonlySet<string>,
  kind: WorkbenchPaneIdentityV3["kind"],
): string {
  let suffix = 1;
  while (existingPaneIds.has(`${kind}-custom-${suffix}`)) suffix += 1;
  return `${kind}-custom-${suffix}`;
}

function allPaneIdsV3(surface: ExperimentSurfaceV2): readonly string[] {
  return [
    ...surface.graphPanes.map(({ paneId }) => paneId),
    ...surface.outputPanes.map(({ paneId }) => paneId),
    ...surface.controlPanes.map(({ paneId }) => paneId),
  ];
}

function nextOrderV3(items: readonly Readonly<{ order: number }>[]): number {
  return items.reduce((highest, item) => Math.max(highest, item.order), -1) + 1;
}

function paneCollectionKeyV3(
  kind: WorkbenchPaneIdentityV3["kind"],
): "graphPanes" | "outputPanes" | "controlPanes" {
  if (kind === "graph") return "graphPanes";
  if (kind === "output") return "outputPanes";
  return "controlPanes";
}

function paneCollectionV3(
  surface: ExperimentSurfaceV2,
  kind: WorkbenchPaneIdentityV3["kind"],
): readonly WorkbenchSurfacePaneV3[] {
  return surface[paneCollectionKeyV3(kind)];
}

function comparePaneOrderV3(
  left: Readonly<{ paneId: string; order: number }>,
  right: Readonly<{ paneId: string; order: number }>,
): number {
  if (left.order !== right.order) return left.order - right.order;
  return left.paneId.localeCompare(right.paneId);
}

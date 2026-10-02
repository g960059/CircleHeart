import type {
  ExperimentPlacementBriefingV2,
  ExperimentSnapshotV2,
} from "@/studio/contracts/v2/content";
import type { ModelContractV2 } from "@/studio/contracts/v2/model";
import {
  workbenchModelCyclePhaseOutputIdV3,
} from "@/components/workbench/presentation/WorkbenchPresentationOutputSelectionV3";

/**
 * Selects the scalar history needed by one Article Placement. Intermediate
 * presentation rows carry only this exact subset; every batch terminal remains
 * a complete model frame for latest-value and authoring correlation.
 */
export function articleReaderPresentationOutputSelectionV3(
  contract: ModelContractV2,
  snapshot: ExperimentSnapshotV2,
  briefing: ExperimentPlacementBriefingV2,
  exposedExactOutputIds?: ReadonlySet<string>,
): ReadonlySet<string> {
  const scalarOutputIds = new Set(
    contract.outputCatalog
      .filter(({ shape }) => shape === "scalar")
      .map(({ outputId }) => outputId),
  );
  const outputIds = new Set<string>();
  for (const { outputId } of briefing.outputs) {
    // Vector values remain available in each complete terminal frame, but the
    // compact presentation history intentionally transports scalar rows only.
    if (scalarOutputIds.has(outputId) && (exposedExactOutputIds?.has(outputId) ?? true)) outputIds.add(outputId);
  }
  let sweepPresent = false;
  for (const selectedGraph of briefing.graphs) {
    const pane = snapshot.content.surface.graphPanes.find(
      ({ paneId }) => paneId === selectedGraph.paneId,
    );
    if (pane === undefined) continue;
    const graph = contract.graphCatalog.find(
      ({ graphId }) => graphId === pane.graphId,
    );
    if (graph === undefined || graph.renderer === "structural-return" || graph.renderer === "cycle-waveform") continue;
    if (graph.renderer === "sweep") sweepPresent = true;
    const selectedSeries = selectedGraph.overrides?.series ?? pane.series;
    for (const authoredSeries of selectedSeries) {
      const binding = graph.seriesCatalog.find(
        ({ seriesId }) => seriesId === authoredSeries.seriesId,
      );
      if (binding === undefined) continue;
      if (graph.renderer === "sweep" && binding.kind === "scalar") {
        outputIds.add(binding.outputId);
      } else if (
        graph.renderer === "pressure-volume"
        && binding.kind === "pressure-volume"
      ) {
        outputIds.add(binding.volumeOutputId);
        outputIds.add(binding.pressureOutputId);
        outputIds.add(binding.cyclePhaseOutputId);
      } else if (graph.renderer === "xy" && binding.kind === "xy") {
        outputIds.add(binding.xOutputId);
        outputIds.add(binding.yOutputId);
        outputIds.add(binding.cyclePhaseOutputId);
      }
    }
  }
  if (sweepPresent) {
    const cyclePhaseOutputId = workbenchModelCyclePhaseOutputIdV3(contract);
    if (cyclePhaseOutputId !== undefined) outputIds.add(cyclePhaseOutputId);
  }
  return outputIds as ReadonlySet<string>;
}

import React from "react";
import type { ExperimentSnapshotV2 } from "@/studio/contracts/v2/content";
import type { ExperimentReaderPreviewV1 } from "@/studio/contracts/v2/readerPreview";
import type { StudioSimulationAnalysisV2, StudioSimulationFrameV2 } from "@/studio/contracts/v2/simulation";
import { WorkbenchScenarioPresentationSampleStoreV3, type WorkbenchSampledGraphPresentationSnapshotV3 } from "@/components/workbench/presentation/WorkbenchPresentationSampleStoreV3";
import { mainWireCardiacCycleOutputValueV1, mainWireFillingFlowOutputValueV1, mainWireAorticJetOutputValueV1 } from "@/analysis/methods/mainWire/MainWireCardiacCyclePresentationV1";
import type { UseArticleReaderLiveRuntimeResultV3 } from "./useArticleReaderLiveRuntimeV3";

/** A separate read-only store; preview rows never enter the live sample stream. */
export function createArticleReaderPreviewPresentationV1(
  snapshot: ExperimentSnapshotV2, preview: ExperimentReaderPreviewV1,
  cyclePhaseOutputId: string | undefined, allowedAnalysisIds: readonly string[],
) {
  const sampleStore = new WorkbenchScenarioPresentationSampleStoreV3();
  sampleStore.setCyclePhaseOutputId(cyclePhaseOutputId);
  sampleStore.appendMany(preview.scenarios.map(s => ({ scenarioId: s.scenarioId,
    samples: s.samples.map(row => ({ ...row, inputEpoch: 0 })) })));
  const traces = new Map(preview.scenarios.map(s => {
    const identity = { modelId: snapshot.content.modelId, runtimeSessionId: "reader-preview", scenarioId: s.scenarioId, inputEpoch: 0 };
    const frame: StudioSimulationFrameV2 = { ...identity, acceptedRevision: s.acceptedRevision, acceptedTimeSec: s.acceptedTimeSec, outputs: s.outputs };
    const analyses: readonly StudioSimulationAnalysisV2[] = s.analyses.filter(a => allowedAnalysisIds.includes(a.analysisId)).map(a => ({ ...a, ...identity }));
    return [s.scenarioId, { frame, analyses }] as const;
  }));
  return {
    sampleStore,
    presentationTrace: (id: string) => traces.get(id),
    presentationOutput: (id: string, outputId: string) => {
      const trace = traces.get(id);
      return mainWireCardiacCycleOutputValueV1(trace?.analyses, trace?.frame ?? null, outputId)
        ?? mainWireFillingFlowOutputValueV1(trace?.analyses, trace?.frame ?? null, outputId)
        ?? mainWireAorticJetOutputValueV1(trace?.analyses, trace?.frame ?? null, outputId)
        ?? trace?.frame.outputs[outputId];
    },
  };
}

/**
 * The saved beat is only a drawing background. Each Scenario's first real
 * samples drive its head immediately; a slower lane never holds another back.
 * No saved row is appended to the live store or used by an analysis.
 */
export function articleReaderSampledPresentationV1(
  live: WorkbenchSampledGraphPresentationSnapshotV3 | null,
  preview: WorkbenchScenarioPresentationSampleStoreV3 | undefined,
): WorkbenchSampledGraphPresentationSnapshotV3 | null {
  if (!live || !preview) return live;
  if (live.renderer === "sweep") {
    return { ...live, samplesByScenarioId: {
      ...preview.getSweepSnapshot().samplesByScenarioId, ...live.samplesByScenarioId,
    } };
  }
  const saved = preview.getPressureVolumeSnapshot();
  const completedCyclesByScenarioId = { ...live.completedCyclesByScenarioId };
  for (const [id, cycles] of Object.entries(saved.completedCyclesByScenarioId)) {
    const samples = live.exactOrbitSamplesByScenarioId[id];
    if (!completedCyclesByScenarioId[id]?.length && (!samples?.length || samples.at(-1)?.inputEpoch === 0)) {
      completedCyclesByScenarioId[id] = cycles;
    }
  }
  return { ...live,
    exactOrbitSamplesByScenarioId: { ...saved.exactOrbitSamplesByScenarioId, ...live.exactOrbitSamplesByScenarioId },
    currentCycleSamplesByScenarioId: { ...saved.currentCycleSamplesByScenarioId, ...live.currentCycleSamplesByScenarioId },
    cyclePositionByScenarioId: { ...saved.cyclePositionByScenarioId, ...live.cyclePositionByScenarioId },
    completedCyclesByScenarioId,
  };
}

/** Keep live subscriptions; a Scenario's live frame owns all its readouts. */
export function useArticleReaderPreviewV1(
  live: UseArticleReaderLiveRuntimeResultV3, snapshot: ExperimentSnapshotV2,
  preview: ExperimentReaderPreviewV1 | null, cyclePhaseOutputId: string | undefined,
  allowedAnalysisIds: readonly string[],
): UseArticleReaderLiveRuntimeResultV3 {
  const analysisKey = JSON.stringify(allowedAnalysisIds);
  const display = React.useMemo(() => preview === null ? null
    : createArticleReaderPreviewPresentationV1(snapshot, preview, cyclePhaseOutputId, allowedAnalysisIds),
  [snapshot, preview, cyclePhaseOutputId, analysisKey]);
  // A restored reader session and edited conditions always win over sealed data.
  const changed = live.state.changedScenarioIds.length > 0 || live.state.status === "applying-control";
  if (!display || changed || live.state.status === "failed") return live;
  return { ...live,
    previewSampleStore: display.sampleStore,
    presentationTrace: (id) => {
      const actual = live.presentationTrace?.(id);
      // A completed-beat graph has no partial equivalent. Keep its original
      // frame/analysis pair intact until the live observer supplies a result.
      return actual && (actual.frame.inputEpoch > 0 || actual.analyses.length > 0)
        ? actual : display.presentationTrace(id) ?? actual;
    },
    presentationOutput: (id, outputId) => {
      const trace = live.presentationTrace?.(id);
      const actual = live.presentationOutput?.(id, outputId)
        ?? trace?.frame.outputs[outputId];
      // Once a real frame exists, an unavailable derived value stays unavailable;
      // do not mix its old sealed value with this Scenario's current readouts.
      return trace !== undefined || actual !== undefined ? actual : display.presentationOutput(id, outputId);
    },
  };
}

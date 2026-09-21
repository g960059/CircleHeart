import type { ExperimentScenarioV2, ExperimentSnapshotV2 } from "@/studio/contracts/v2/content";
import type { ExperimentReaderPreviewV1 } from "@/studio/contracts/v2/readerPreview";
import type { ModelContractV2 } from "@/studio/contracts/v2/model";
import type { RegisteredModelSimulationAdapterV2, StudioSimulationAnalysisV2 } from "@/studio/contracts/v2/simulation";
import type { PresentationAnalysisMethodV1 } from "@/analysis/contracts/PresentationAnalysisV1";
import { sha256StudioCanonicalJsonHex } from "@/domain/json/CanonicalJsonSha256";
import { readerPreviewSourceSha256V1, validReaderPreviewShapeV1 } from "@/studio/application/authoring/StudioReaderPreviewV1";

/**
 * Runs only in the authoring Worker, after admission. A disposable exact fork
 * observes the opening two beats of each sealed condition. It never changes
 * the sealed checkpoint, starts a TBV sweep, or feeds reduced samples to an
 * analysis. The bounded projection is a reading aid, not scientific evidence.
 */
export async function buildReaderPreviewV1(input: Readonly<{
  snapshot: ExperimentSnapshotV2;
  contract: ModelContractV2;
  adapter: RegisteredModelSimulationAdapterV2;
  methods: readonly PresentationAnalysisMethodV1[];
  createSession(id: string, scenario: ExperimentScenarioV2): Promise<void>;
}>): Promise<ExperimentReaderPreviewV1 | undefined> {
  const { snapshot, contract, adapter } = input;
  const selected = new Set(snapshot.content.surface.outputPanes.flatMap(p => p.items.map(i => i.outputId)));
  const sampled = new Set<string>();
  let phaseId: string | undefined;
  for (const graph of contract.graphCatalog) {
    if (graph.renderer === "pressure-volume") phaseId ??= graph.seriesCatalog[0]?.cyclePhaseOutputId;
    if (graph.renderer !== "pressure-volume" && graph.renderer !== "sweep") continue;
    for (const pane of snapshot.content.surface.graphPanes.filter(p => p.graphId === graph.graphId)) {
      for (const series of graph.seriesCatalog) {
        if (!pane.series.some(s => s.seriesId === series.seriesId)) continue;
        if (series.kind === "pressure-volume") {
          sampled.add(series.volumeOutputId); sampled.add(series.pressureOutputId); sampled.add(series.cyclePhaseOutputId);
        } else if (series.kind === "scalar") sampled.add(series.outputId);
      }
    }
  }
  if (!phaseId || snapshot.content.scenarios.length > 8) return undefined;
  sampled.add(phaseId);
  const scenarios: ExperimentReaderPreviewV1["scenarios"][number][] = [];
  for (const scenario of snapshot.content.scenarios) {
    const id = `reader-preview/${crypto.randomUUID()}`;
    try {
      await input.createSession(id, scenario);
      let frame = adapter.currentFrame({ runtimeSessionId: id, scenarioId: scenario.scenarioId });
      const initialTime = frame.acceptedTimeSec;
      const outputIds = [...new Set([...sampled, ...input.methods.flatMap(m => m.requiredExactOutputIds)])];
      if (outputIds.some(outputId => !frame.outputs[outputId])) return undefined;
      const collectors = input.methods.map(method => ({ method, collector: method.create() }));
      const analyses = new Map<string, StudioSimulationAnalysisV2>();
      const rows: ExperimentReaderPreviewV1["scenarios"][number]["samples"][number][] = [];
      let wraps = 0;
      let previousPhase = frame.outputs[phaseId]?.value;
      // The time and iteration limits bound low-rate/nonperiodic models too.
      for (let step = 0; step < 188 && frame.acceptedTimeSec - initialTime < 6 && wraps < 2; step++) {
        const batch = await adapter.advancePresentationBatch({ runtimeSessionId: id, scenarioId: scenario.scenarioId,
          stepCount: 16, presentationOutputIds: outputIds });
        frame = batch.terminalFrame;
        for (const { method, collector } of collectors) {
          const analysis = collector.ingest(batch);
          if (analysis) analyses.set(method.methodId, analysis);
        }
        const phaseIndex = batch.outputIds.indexOf(phaseId);
        const columns = [...sampled].map(outputId => [outputId, batch.outputIds.indexOf(outputId)] as const);
        for (let row = 0; row < batch.acceptedTimesSec.length; row++) {
          const offset = row * batch.outputIds.length;
          const phase = batch.outputValues[offset + phaseIndex]!;
          if (typeof previousPhase === "number" && phase + 1e-6 < previousPhase) wraps++;
          previousPhase = phase;
          const values = Object.fromEntries(columns.map(([key, column]) => {
            const value = batch.outputValues[offset + column]!;
            return [key, Number.isFinite(value) ? value : null];
          }));
          rows.push({ acceptedRevision: batch.acceptedRevisions[row]!, acceptedTimeSec: batch.acceptedTimesSec[row]!, values });
        }
      }
      if (wraps < 2) return undefined;
      // Keep all accepted rows, including short flow peaks and PV corners.
      // Oversized previews fall back to ordinary startup instead of thinning.
      scenarios.push({ scenarioId: scenario.scenarioId, acceptedRevision: frame.acceptedRevision,
        acceptedTimeSec: frame.acceptedTimeSec,
        outputs: Object.fromEntries(Object.entries(frame.outputs).filter(([key, output]) =>
          (selected.has(key) || sampled.has(key)) && (output.value === null || typeof output.value === "number"))),
        samples: rows,
        analyses: [...analyses.values()].map(({ analysisId, sourceAcceptedRevision, sourceAcceptedTimeSec, payload }) =>
          ({ analysisId, sourceAcceptedRevision, sourceAcceptedTimeSec, payload })),
      });
    } finally { adapter.disposeSession(id); }
  }
  const body = { schemaId: "circleheart-experiment-reader-preview-v1" as const,
    sourceSha256: await readerPreviewSourceSha256V1(snapshot), scenarios };
  const preview = { ...body, previewSha256: await sha256StudioCanonicalJsonHex(body) };
  return validReaderPreviewShapeV1(preview) ? preview : undefined;
}

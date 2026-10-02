import { REGISTERED_ANALYSIS_EXECUTOR_V1 } from "@/analysis/runtime/RegisteredAnalysisExecutorV1";
import { resolveRegisteredAnalysisMethodsV1 } from "@/analysis/registry/RegisteredAnalysisMethodsV1";
import { sha256StudioCanonicalJsonHex } from "@/domain/json/CanonicalJsonSha256";
import type { ExperimentSnapshotV2 } from "@/studio/contracts/v2/content";
import type { ModelSurfaceReleaseManifestV1 } from "@/studio/contracts/v2/modelSurface";
import type { StudioModelWorkerReleaseTicketV2 } from "@/studio/contracts/v2/release";
import { validateStudioSimulationAnalysisV2, type StudioSimulationAnalysisV2 } from "@/studio/contracts/v2/simulation";
import type { StudioAuthoringExactModelPinV1 } from "./StudioNumericalAuthoringV1";

export type StudioSnapshotAnalysisInputV1 = Readonly<{
  snapshotId: string;
  scenarioIds: readonly string[];
  includeAnalysis: boolean;
}>;

/** Per-side display-completeness judgment of one measured analysis, as the host's
 * pinned Surface derivation reports it. `protocolId` is null until the measured
 * Starling/TBV family is bound; the application never decodes model payloads itself. */
export type StudioSnapshotAnalysisSideAssessmentV1 = Readonly<{
  side: "left" | "right";
  status: "complete" | "incomplete";
  settledPoints: number;
  completedPointCount: number;
  totalPointCount: number;
  protocolId: string | null;
  pvaMethodId: string;
  measurementStatus: "complete" | "incomplete";
  systolicLoadStatus: "complete" | "progressive" | "unavailable";
  diastolicLoadStatus: "complete" | "progressive" | "unavailable";
  pvaStatus: "complete" | "progressive" | "collecting" | "unavailable" | "not-evaluated";
  reason: string | null;
}>;

export type StudioSnapshotAnalysisAssessmentV1 = Readonly<{
  analysisId: string;
  pvaMethodId: string;
  sides: readonly StudioSnapshotAnalysisSideAssessmentV1[];
}>;

export interface StudioSnapshotAnalysisModelPortV1 {
  resolveAnalysisModel(pin: StudioAuthoringExactModelPinV1): Promise<Pick<
    StudioModelWorkerReleaseTicketV2, "modelId" | "artifactRevisionId" | "surfaceRelease"
  > & Readonly<{ exactNumericalExports?: Readonly<Record<string, unknown>> }>>;
  /** Judges display completeness with the Surface's pinned derivation and the display's
   * payload decoder. The host owns both; this port keeps them outside the application. */
  assessAnalysis(
    surface: ModelSurfaceReleaseManifestV1,
    analysis: StudioSimulationAnalysisV2,
  ): StudioSnapshotAnalysisAssessmentV1;
}

export type StudioSnapshotAnalysisProgressV1 = Readonly<{
  scenarioId: string;
  phase: "started" | "progress" | "complete" | "incomplete" | "failed";
  sides: readonly Readonly<{ side: "left" | "right"; completedPointCount: number; totalPointCount: number }>[];
}>;

export type StudioSnapshotAnalysisScenarioResultV1 = Readonly<{
  scenarioId: string;
  source: Readonly<{ captureSha256: string; inputEpoch: 0; acceptedRevision: number; acceptedTimeSec: number }>;
  status: "complete" | "incomplete" | "failed";
  assessment: StudioSnapshotAnalysisAssessmentV1 | null;
  analysis: StudioSimulationAnalysisV2 | null;
  error: Readonly<{ stage: "execution" | "assessment"; message: string }> | null;
}>;

/** Restores detached immutable captures. Only the registered executor runs the numerical
 * protocol; only the pinned Surface derivation judges display completeness. No write port. */
export async function analyzeStudioSnapshotV1(
  repository: { readSnapshot(id: string): Promise<ExperimentSnapshotV2 | null> },
  models: StudioSnapshotAnalysisModelPortV1,
  input: StudioSnapshotAnalysisInputV1,
  onProgress?: (progress: StudioSnapshotAnalysisProgressV1) => void,
) {
  const snapshot = await repository.readSnapshot(input.snapshotId);
  if (!snapshot) throw new Error("Snapshot is unavailable");
  if (snapshot.snapshotId !== input.snapshotId) throw new Error("Snapshot identity differs from the requested source");
  // Resolve every selection before starting expensive work, retaining the requested order.
  const scenarios = input.scenarioIds.map(scenarioId => {
    const scenario = snapshot.content.scenarios.find(s => s.scenarioId === scenarioId);
    if (!scenario) throw new Error(`Snapshot scenario is unavailable: ${scenarioId}`);
    if (!scenario.capture.checkpoint) throw new Error(`Snapshot scenario requires an accepted checkpoint: ${scenarioId}`);
    return scenario;
  });
  const exactModel: StudioAuthoringExactModelPinV1 = {
    modelId: snapshot.content.modelId, surfaceSeriesId: snapshot.content.surfaceSeriesId,
    surfaceReleaseId: snapshot.surfaceReleaseId,
  };
  const release = await models.resolveAnalysisModel(exactModel);
  const surface = release.surfaceRelease;
  if (release.modelId !== exactModel.modelId || surface.surfaceSeriesId !== exactModel.surfaceSeriesId
    || surface.surfaceReleaseId !== exactModel.surfaceReleaseId)
    throw new Error("Resolved analysis model does not match the Snapshot Model Surface pin");
  const analysisId = resolveRegisteredAnalysisMethodsV1(surface).periodicPvaDerivation?.sourceAnalysisId;
  if (!analysisId) throw new Error("Snapshot Surface has no pinned periodic PV/Starling analysis");
  const runtimeSessionId = `authoring/snapshot-analysis/${crypto.randomUUID()}`;
  const results: StudioSnapshotAnalysisScenarioResultV1[] = [];
  // Sequential execution also isolates the current executor's process-wide numerical tier.
  for (const scenario of scenarios) {
    const checkpoint = scenario.capture.checkpoint!;
    const source = {
      captureSha256: await sha256StudioCanonicalJsonHex(scenario.capture), inputEpoch: 0 as const,
      acceptedRevision: checkpoint.acceptedRevision, acceptedTimeSec: checkpoint.acceptedTimeSec,
    };
    let latest: StudioSimulationAnalysisV2 | null = null;
    // Progress reuses the host assessment; a failing assessment only silences progress sides.
    const notify = (phase: StudioSnapshotAnalysisProgressV1["phase"]) => onProgress?.({
      scenarioId: scenario.scenarioId, phase, sides: latest === null ? [] : measuredSidesV1(models, surface, latest),
    });
    const accept = (value: StudioSimulationAnalysisV2) => {
      const analysis = validateStudioSimulationAnalysisV2(value);
      if (analysis.modelId !== exactModel.modelId || analysis.runtimeSessionId !== runtimeSessionId
        || analysis.scenarioId !== scenario.scenarioId || analysis.analysisId !== analysisId
        || analysis.inputEpoch !== source.inputEpoch || analysis.sourceAcceptedRevision !== source.acceptedRevision
        || analysis.sourceAcceptedTimeSec !== source.acceptedTimeSec)
        throw new Error("Analysis source identity or accepted clocks differ from the Snapshot capture");
      return analysis;
    };
    notify("started");
    try {
      latest = accept(await REGISTERED_ANALYSIS_EXECUTOR_V1.execute({
        source: {
          acceptedFrame: { modelId: exactModel.modelId, runtimeSessionId, scenarioId: scenario.scenarioId,
            inputEpoch: 0, acceptedRevision: source.acceptedRevision, acceptedTimeSec: source.acceptedTimeSec, outputs: {} },
          surfaceRelease: surface, legacyExact: null,
          exactNumericalExports: release.exactNumericalExports,
          capture: async () => ({ artifactRevisionId: release.artifactRevisionId, scenario: structuredClone(scenario.capture) }),
        },
        request: { runtimeSessionId, scenarioId: scenario.scenarioId, analysisId,
          expectedInputEpoch: 0, expectedAcceptedRevision: source.acceptedRevision, expectedAcceptedTimeSec: source.acceptedTimeSec,
          onProgress: value => { latest = accept(value); notify("progress"); } },
      }));
    } catch (error) {
      results.push({ scenarioId: scenario.scenarioId, source, status: "failed", assessment: null,
        analysis: input.includeAnalysis ? latest : null,
        error: { stage: "execution", message: error instanceof Error ? error.message : String(error) } });
      notify("failed");
      continue;
    }
    try {
      const assessment = models.assessAnalysis(surface, latest);
      const incomplete = assessment.sides.find(side => side.status !== "complete");
      results.push({ scenarioId: scenario.scenarioId, source, status: incomplete ? "incomplete" : "complete", assessment,
        analysis: input.includeAnalysis ? latest : null,
        error: incomplete ? { stage: "assessment", message: incomplete.reason ?? "Analysis assessment is incomplete" } : null });
    } catch (error) {
      results.push({ scenarioId: scenario.scenarioId, source, status: "incomplete", assessment: null,
        analysis: input.includeAnalysis ? latest : null,
        error: { stage: "assessment", message: error instanceof Error ? error.message : String(error) } });
    }
    notify(results[results.length - 1]!.status);
  }
  return { source: { snapshotId: input.snapshotId, exactModel, artifactRevisionId: release.artifactRevisionId },
    analysisId, allComplete: results.every(result => result.status === "complete"), scenarios: results };
}

/** Only sides whose measured protocol is bound carry point progress. */
function measuredSidesV1(
  models: StudioSnapshotAnalysisModelPortV1,
  surface: ModelSurfaceReleaseManifestV1,
  analysis: StudioSimulationAnalysisV2,
): StudioSnapshotAnalysisProgressV1["sides"] {
  try {
    return models.assessAnalysis(surface, analysis).sides.flatMap(side => side.protocolId === null ? [] : [{
      side: side.side, completedPointCount: side.completedPointCount, totalPointCount: side.totalPointCount,
    }]);
  } catch {
    return [];
  }
}

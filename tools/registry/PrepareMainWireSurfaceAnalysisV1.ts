import type { ScenarioPresetV2 } from "@/studio/contracts/v2/content";
import type { ModelSurfaceReleaseManifestV1 } from "@/studio/contracts/v2/modelSurface";
import { resolveRegisteredAnalysisMethodsV1 as methods } from "@/analysis/registry/RegisteredAnalysisMethodsV1";
import { REGISTERED_ANALYSIS_EXECUTOR_V1 as executor } from "@/analysis/runtime/RegisteredAnalysisExecutorV1";
import { buildPreparedModelAnalysisV1 } from "@/studio/application/authoring/PreparedModelAnalysisV1";
import type { StudioSimulationAnalysisV2 } from "@/studio/contracts/v2/simulation";

/** Keep expensive measured families even when a cheap derived check fails. */
export class PreparedSurfaceAnalysisErrorV1 extends Error {
  constructor(readonly analysis: StudioSimulationAnalysisV2, cause: unknown) {
    super(cause instanceof Error ? cause.message : String(cause));
  }
}

/** Finalists only. Run the registered Surface executor, then its actual display
 * decoder and PVA derivation. Save the full portable analysis payload: it keeps
 * accepted path work, sampled loops and measured loci, not merely a curve fit.
 * No repeated ODE history/checkpoints are stored for every sweep branch. */
export async function prepareMainWireSurfaceAnalysisV1(input: {
  preset: ScenarioPresetV2; artifactRevisionId: string; surface: ModelSurfaceReleaseManifestV1;
  preparationSourceSha256: string;
}) {
  const { preset, surface } = input, checkpoint = preset.capture.checkpoint;
  const analysisId = methods(surface).periodicPvaDerivation?.sourceAnalysisId;
  if (!checkpoint || !analysisId) throw new Error("Surface preparation requires a launch checkpoint and a pinned PV method");
  const frame = { modelId: preset.modelId, runtimeSessionId: "prepared-analysis", scenarioId: preset.presetId,
    inputEpoch: 0, acceptedRevision: checkpoint.acceptedRevision, acceptedTimeSec: checkpoint.acceptedTimeSec, outputs: {} };
  const analysis = await executor.execute({ source: { acceptedFrame: frame, surfaceRelease: surface, legacyExact: null,
    capture: async () => ({ artifactRevisionId: input.artifactRevisionId, scenario: preset.capture }) },
    request: { runtimeSessionId: frame.runtimeSessionId, scenarioId: frame.scenarioId, analysisId,
      expectedInputEpoch: frame.inputEpoch, expectedAcceptedRevision: frame.acceptedRevision, expectedAcceptedTimeSec: frame.acceptedTimeSec } });
  try { return await buildPreparedModelAnalysisV1({ ...input, modelId: preset.modelId, capture: preset.capture, analysis }); }
  catch (error) { throw new PreparedSurfaceAnalysisErrorV1(analysis, error); }
}

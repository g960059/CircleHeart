import { sha256StudioCanonicalJsonHex as hash } from "@/domain/json/CanonicalJsonSha256";
import type { ScenarioCaptureV2 } from "@/studio/contracts/v2/content";
import type { ModelSurfaceReleaseManifestV1 } from "@/studio/contracts/v2/modelSurface";
import { validateStudioSimulationAnalysisV2, type StudioSimulationAnalysisV2 } from "@/studio/contracts/v2/simulation";
import { resolveRegisteredAnalysisMethodsV1 as methods } from "@/analysis/registry/RegisteredAnalysisMethodsV1";
import { structuralReturnOrientationFromPayloadV3 as decode } from "@/analysis/methods/mainWire/MainWireStructuralReturnPayloadV3";
import type {
  StudioSnapshotAnalysisAssessmentV1,
  StudioSnapshotAnalysisSideAssessmentV1,
} from "@/studio/application/authoring/StudioSnapshotAnalysisV1";

/** The application's assessment port owns this shape; all presentation and authoring hosts share it. */
export type ModelAnalysisSideAssessmentV1 = StudioSnapshotAnalysisSideAssessmentV1;

/** Analysis assessment: use the shared payload decoder and pinned derivation. Measured load
 * curves may be complete while PE/PVA rejects its extrapolation. These are separate
 * diagnostics, not additional healthy/disease physiology thresholds. Also serves as
 * the read-only Snapshot analysis `assessAnalysis` port for headless authoring hosts. */
export function inspectModelAnalysisV1(
  surface: ModelSurfaceReleaseManifestV1, analysis: StudioSimulationAnalysisV2,
): StudioSnapshotAnalysisAssessmentV1 {
  const pva = methods(surface).periodicPvaDerivation;
  if (!pva || pva.sourceAnalysisId !== analysis.analysisId) throw new Error("Prepared analysis is not pinned by this Surface");
  const sides = (["left", "right"] as const).map((side): ModelAnalysisSideAssessmentV1 => {
    const orientation = decode(analysis.payload, side);
    const locus = orientation?.starlingLocus;
    const measured = locus?.status === "measured-fixed-tbv-protocol" ? locus : null;
    const base = { side, settledPoints: measured?.points.filter(point => point.settled && point.curveEligible).length ?? 0,
      completedPointCount: measured?.completedPointCount ?? 0, totalPointCount: measured?.totalPointCount ?? 0,
      protocolId: measured?.protocolId ?? null, pvaMethodId: pva.methodId };
    if (!measured || measured.completedPointCount !== measured.totalPointCount || measured.points.length < 3
      || !measured.points.every(point => point.settled && point.curveEligible))
      return { ...base, status: "incomplete", measurementStatus: "incomplete", systolicLoadStatus: "unavailable",
        diastolicLoadStatus: "unavailable", pvaStatus: "not-evaluated", reason: `Prepared ${side} Starling/TBV family is incomplete` };
    try {
      const result = pva.build(measured, side === "left" ? "LV" : "RV");
      const systolicLoadStatus = result.loadRelations?.systolic?.completionStatus ?? "unavailable";
      const diastolicLoadStatus = result.loadRelations?.diastolic?.completionStatus ?? "unavailable";
      const pvaStatus = result.status === "available" ? result.completionStatus : result.status;
      const complete = pvaStatus === "complete" && systolicLoadStatus === "complete" && diastolicLoadStatus === "complete";
      return { ...base, status: complete ? "complete" : "incomplete", measurementStatus: "complete",
        systolicLoadStatus, diastolicLoadStatus, pvaStatus,
        reason: complete ? null : `Prepared ${side} ESPVR/EDPVR/PVA is incomplete: ${result.status === "available" ? "partial load relations or energy" : result.reason}` };
    } catch (error) {
      return { ...base, status: "incomplete", measurementStatus: "complete", systolicLoadStatus: "unavailable",
        diastolicLoadStatus: "unavailable", pvaStatus: "unavailable", reason: error instanceof Error ? error.message : String(error) };
    }
  });
  return { analysisId: analysis.analysisId, pvaMethodId: pva.methodId, sides };
}

/** Registry admission remains strict; its durable assessment format is unchanged. */
export function assessPreparedModelAnalysisV1(surface: ModelSurfaceReleaseManifestV1, analysis: StudioSimulationAnalysisV2) {
  const assessment = inspectModelAnalysisV1(surface, analysis);
  const sides = assessment.sides.map(side => {
    if (side.status !== "complete" || side.protocolId === null) throw new Error(side.reason ?? "Prepared analysis is incomplete");
    return { side: side.side, settledPoints: side.settledPoints, protocolId: side.protocolId,
      pvaMethodId: side.pvaMethodId, status: "complete" as const };
  });
  return { analysisId: assessment.analysisId, pvaMethodId: assessment.pvaMethodId, sides };
}

export type PreparedModelAnalysisV1 = Readonly<{
  schemaId: "prepared-model-analysis-v1";
  modelId: string;
  artifactRevisionId: string;
  captureSha256: string;
  preparationSourceSha256: string;
  assessment: ReturnType<typeof assessPreparedModelAnalysisV1>;
  analysis: StudioSimulationAnalysisV2;
  recordSha256: string;
}>;

export async function buildPreparedModelAnalysisV1(input: {
  modelId: string; artifactRevisionId: string; capture: ScenarioCaptureV2;
  surface: ModelSurfaceReleaseManifestV1; analysis: StudioSimulationAnalysisV2; preparationSourceSha256: string;
}): Promise<PreparedModelAnalysisV1> {
  const analysis = validateStudioSimulationAnalysisV2(input.analysis);
  const checkpoint = input.capture.checkpoint;
  if (!checkpoint || analysis.modelId !== input.modelId || analysis.inputEpoch !== 0
    || analysis.sourceAcceptedRevision !== checkpoint.acceptedRevision
    || analysis.sourceAcceptedTimeSec !== checkpoint.acceptedTimeSec)
    throw new Error("Prepared analysis source differs from the launch capture");
  const body = { schemaId: "prepared-model-analysis-v1" as const, modelId: input.modelId,
    artifactRevisionId: input.artifactRevisionId, captureSha256: await hash(input.capture),
    preparationSourceSha256: input.preparationSourceSha256,
    assessment: assessPreparedModelAnalysisV1(input.surface, analysis), analysis };
  return { ...body, recordSha256: await hash(body) };
}

/** Exact launch capture match, not just preset name or parameter proximity.
 * Analysis method pins, not Surface labels/layout, determine reusability. */
export async function readPreparedModelAnalysisV1(value: unknown, expected: {
  modelId: string; artifactRevisionId: string; capture: ScenarioCaptureV2; surface: ModelSurfaceReleaseManifestV1;
}): Promise<PreparedModelAnalysisV1> {
  const record = value as PreparedModelAnalysisV1;
  if (!record || record.schemaId !== "prepared-model-analysis-v1") throw new Error("Unknown prepared analysis format");
  const { recordSha256, ...body } = record;
  if (recordSha256 !== await hash(body) || record.modelId !== expected.modelId
    || record.artifactRevisionId !== expected.artifactRevisionId
    || record.captureSha256 !== await hash(expected.capture)) throw new Error("Prepared analysis binding differs");
  const rebuilt = await buildPreparedModelAnalysisV1({ ...expected, analysis: record.analysis,
    preparationSourceSha256: record.preparationSourceSha256 });
  if (rebuilt.recordSha256 !== recordSha256) throw new Error("Prepared analysis assessment/method pins differ");
  return rebuilt;
}

/** Article/Scenario preparation retains complete measured curves even when a
 * separate energy extrapolation is unavailable. Registry preset qualification
 * above still requires complete PVA. Both records keep the actual method result. */
export type PreparedScenarioAnalysisV1 = Omit<PreparedModelAnalysisV1, "schemaId" | "assessment"> & Readonly<{
  schemaId: "prepared-scenario-analysis-v1";
  assessment: StudioSnapshotAnalysisAssessmentV1;
}>;

export async function buildPreparedScenarioAnalysisV1(
  input: Parameters<typeof buildPreparedModelAnalysisV1>[0],
): Promise<PreparedScenarioAnalysisV1> {
  const analysis = validateStudioSimulationAnalysisV2(input.analysis);
  const checkpoint = input.capture.checkpoint;
  if (!checkpoint || analysis.modelId !== input.modelId || analysis.inputEpoch !== 0
    || analysis.sourceAcceptedRevision !== checkpoint.acceptedRevision
    || analysis.sourceAcceptedTimeSec !== checkpoint.acceptedTimeSec)
    throw new Error("Prepared analysis source differs from the launch capture");
  const assessment = inspectModelAnalysisV1(input.surface, analysis);
  for (const side of assessment.sides) {
    if (side.measurementStatus !== "complete" || side.systolicLoadStatus !== "complete"
      || side.diastolicLoadStatus !== "complete"
      || (side.pvaStatus !== "complete" && side.pvaStatus !== "unavailable"))
      throw new Error(side.reason ?? "Prepared Scenario measurements are incomplete");
  }
  const body = { schemaId: "prepared-scenario-analysis-v1" as const, modelId: input.modelId,
    artifactRevisionId: input.artifactRevisionId, captureSha256: await hash(input.capture),
    preparationSourceSha256: input.preparationSourceSha256, assessment, analysis };
  return { ...body, recordSha256: await hash(body) };
}

export async function readPreparedScenarioAnalysisV1(
  value: unknown,
  expected: Parameters<typeof readPreparedModelAnalysisV1>[1],
): Promise<PreparedModelAnalysisV1 | PreparedScenarioAnalysisV1> {
  const record = value as PreparedScenarioAnalysisV1 | PreparedModelAnalysisV1;
  if (record?.schemaId === "prepared-model-analysis-v1") return readPreparedModelAnalysisV1(value, expected);
  if (record?.schemaId !== "prepared-scenario-analysis-v1") throw new Error("Unknown prepared analysis format");
  const { recordSha256, ...body } = record;
  if (recordSha256 !== await hash(body) || record.modelId !== expected.modelId
    || record.artifactRevisionId !== expected.artifactRevisionId
    || record.captureSha256 !== await hash(expected.capture)) throw new Error("Prepared analysis binding differs");
  const rebuilt = await buildPreparedScenarioAnalysisV1({ ...expected, analysis: record.analysis,
    preparationSourceSha256: record.preparationSourceSha256 });
  if (rebuilt.recordSha256 !== recordSha256) throw new Error("Prepared analysis assessment/method pins differ");
  return rebuilt;
}

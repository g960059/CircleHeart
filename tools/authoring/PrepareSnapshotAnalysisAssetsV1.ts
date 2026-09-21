import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { ExperimentSnapshotV2 } from "@/studio/contracts/v2/content";
import type { StudioModelWorkerReleaseTicketV2 } from "@/studio/contracts/v2/release";
import type { analyzeStudioSnapshotV1 } from "@/studio/application/authoring/StudioSnapshotAnalysisV1";
import { buildPreparedScenarioAnalysisV1 } from "@/studio/application/authoring/PreparedModelAnalysisV1";
import { writeFittingRunJsonV1 } from "../scientific/FittingRunFilesV1";

/** Turns a read-only Authoring analysis into the same capture-addressed assets
 * used by registered presets. No content/checkpoint or publication writes.
 * Keep the raw result when admission fails so expensive measurements survive. */
export async function exportPreparedSnapshotAnalysesV1(input: {
  snapshot: ExperimentSnapshotV2;
  release: Pick<StudioModelWorkerReleaseTicketV2, "modelId" | "artifactRevisionId" | "surfaceRelease">;
  result: Awaited<ReturnType<typeof analyzeStudioSnapshotV1>>;
  preparationSourceSha256: string;
  output: string;
}) {
  const { snapshot, release, result } = input;
  const pin = result.source.exactModel;
  if (result.source.snapshotId !== snapshot.snapshotId || pin.modelId !== snapshot.content.modelId
    || pin.surfaceSeriesId !== snapshot.content.surfaceSeriesId || pin.surfaceReleaseId !== snapshot.surfaceReleaseId
    || release.modelId !== pin.modelId || release.surfaceRelease.surfaceSeriesId !== pin.surfaceSeriesId
    || release.surfaceRelease.surfaceReleaseId !== pin.surfaceReleaseId
    || release.artifactRevisionId !== result.source.artifactRevisionId)
    throw new Error("Prepared Snapshot analysis binding differs");
  const rows = [];
  const filesByCapture = new Map<string, { file: string; recordSha256: string }>();
  for (const entry of result.scenarios) {
    const scenario = snapshot.content.scenarios.find(s => s.scenarioId === entry.scenarioId);
    if (!scenario) throw new Error("Prepared Snapshot analysis has an unknown Scenario");
    if (entry.status === "failed" || !entry.analysis) {
      rows.push({ scenarioId: entry.scenarioId, status: "held" as const, reason: entry.error?.message ?? "Analysis is incomplete", file: null });
      continue;
    }
    let record;
    try { record = await buildPreparedScenarioAnalysisV1({
      modelId: pin.modelId, artifactRevisionId: release.artifactRevisionId,
      surface: release.surfaceRelease, capture: scenario.capture, analysis: entry.analysis,
      preparationSourceSha256: input.preparationSourceSha256,
    }); } catch (error) {
      rows.push({ scenarioId: entry.scenarioId, status: "held" as const,
        reason: error instanceof Error ? error.message : String(error), file: null });
      continue;
    }
    if (record.captureSha256 !== entry.source.captureSha256 || record.analysis.analysisId !== result.analysisId)
      throw new Error("Prepared Snapshot analysis source differs");
    // Identifiers come from the registered Surface, but still require path segments.
    const segments = [record.assessment.analysisId, record.assessment.pvaMethodId];
    if (segments.some(s => !/^[a-zA-Z0-9._-]+$/.test(s))) throw new Error("Analysis asset path requires safe method identifiers");
    const directory = join(input.output, ...segments);
    await mkdir(directory, { recursive: true });
    const asset = filesByCapture.get(record.captureSha256) ?? {
      file: await writeFittingRunJsonV1(directory, `${record.captureSha256}.json`, record),
      recordSha256: record.recordSha256,
    };
    filesByCapture.set(record.captureSha256, asset);
    rows.push({ scenarioId: entry.scenarioId, status: "prepared" as const, ...asset, captureSha256: record.captureSha256,
      promoteTo: join("data/model-analysis/prepared", ...segments, `${record.captureSha256}.json`),
      assessment: record.assessment });
  }
  return { snapshotId: snapshot.snapshotId, rows, allPrepared: rows.length > 0 && rows.every(r => r.status === "prepared") };
}

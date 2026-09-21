import type { ExperimentSnapshotV2 } from "@/studio/contracts/v2/content";
import type { ExperimentReaderPreviewV1 } from "@/studio/contracts/v2/readerPreview";
import { sha256StudioCanonicalJsonHex } from "@/domain/json/CanonicalJsonSha256";

export const READER_PREVIEW_MAX_BYTES_V1 = 1_500_000;
export const READER_PREVIEW_MAX_SAMPLES_V1 = 3072;

export function readerPreviewSourceSha256V1(snapshot: Pick<ExperimentSnapshotV2, "content" | "surfaceReleaseId">) {
  return sha256StudioCanonicalJsonHex({ content: snapshot.content, surfaceReleaseId: snapshot.surfaceReleaseId });
}

/** Invalid or obsolete display caches must not make a valid Snapshot unreadable. */
export function validReaderPreviewShapeV1(value: unknown): value is ExperimentReaderPreviewV1 {
  if (!value || typeof value !== "object") return false;
  try {
    if (new TextEncoder().encode(JSON.stringify(value)).byteLength > READER_PREVIEW_MAX_BYTES_V1) return false;
    const p = value as ExperimentReaderPreviewV1;
    if (p.schemaId !== "circleheart-experiment-reader-preview-v1" || !/^[a-f0-9]{64}$/.test(p.sourceSha256) || !/^[a-f0-9]{64}$/.test(p.previewSha256)
      || !Array.isArray(p.scenarios) || p.scenarios.length < 1 || p.scenarios.length > 32) return false;
    const seen = new Set<string>();
    for (const s of p.scenarios) {
      if (typeof s.scenarioId !== "string" || seen.has(s.scenarioId)
        || !Number.isSafeInteger(s.acceptedRevision) || s.acceptedRevision < 0
        || !Number.isFinite(s.acceptedTimeSec) || s.acceptedTimeSec < 0
        || !s.outputs || typeof s.outputs !== "object" || Array.isArray(s.outputs)
        || !Array.isArray(s.samples) || s.samples.length > READER_PREVIEW_MAX_SAMPLES_V1
        || !Array.isArray(s.analyses) || s.analyses.length > 16) return false;
      seen.add(s.scenarioId);
      for (const [id, output] of Object.entries(s.outputs as ExperimentReaderPreviewV1["scenarios"][number]["outputs"])) {
        if (output.outputId !== id || (output.value !== null && (typeof output.value !== "number" || !Number.isFinite(output.value)))
          || !["available", "not-evaluated-at-accepted-state"].includes(output.availability)
          || !["authoritative-state", "accepted-derived", "not-assessed"].includes(output.quality)) return false;
      }
      let previousTime = -1, previousRevision = -1;
      for (const row of s.samples) {
        if (!Number.isFinite(row.acceptedTimeSec) || row.acceptedTimeSec <= previousTime || row.acceptedTimeSec > s.acceptedTimeSec
          || !Number.isSafeInteger(row.acceptedRevision) || row.acceptedRevision <= previousRevision || row.acceptedRevision > s.acceptedRevision
          || !row.values || typeof row.values !== "object" || Array.isArray(row.values)
          || Object.values(row.values).some(v => v !== null && (typeof v !== "number" || !Number.isFinite(v)))) return false;
        previousTime = row.acceptedTimeSec; previousRevision = row.acceptedRevision;
      }
      for (const a of s.analyses) if (typeof a.analysisId !== "string"
        || !Number.isSafeInteger(a.sourceAcceptedRevision) || a.sourceAcceptedRevision < 0 || a.sourceAcceptedRevision > s.acceptedRevision
        || !Number.isFinite(a.sourceAcceptedTimeSec) || a.sourceAcceptedTimeSec < 0 || a.sourceAcceptedTimeSec > s.acceptedTimeSec
        || a.payload === undefined) return false;
    }
    return true;
  } catch { return false; }
}

const verified = new WeakMap<ExperimentSnapshotV2, Promise<ExperimentReaderPreviewV1 | null>>();
/** A cache hit is exact content identity, never nearby parameter values. */
export function verifiedReaderPreviewV1(snapshot: ExperimentSnapshotV2): Promise<ExperimentReaderPreviewV1 | null> {
  const cached = verified.get(snapshot);
  if (cached) return cached;
  const request = (async () => {
    const preview = snapshot.readerPreview;
    if (!validReaderPreviewShapeV1(preview) || preview.sourceSha256 !== await readerPreviewSourceSha256V1(snapshot)) return null;
    const { previewSha256, ...body } = preview;
    if (previewSha256 !== await sha256StudioCanonicalJsonHex(body)) return null;
    if (preview.scenarios.length !== snapshot.content.scenarios.length) return null;
    for (const scenario of preview.scenarios) {
      const checkpoint = snapshot.content.scenarios.find(s => s.scenarioId === scenario.scenarioId)?.capture.checkpoint;
      if (!checkpoint || scenario.acceptedTimeSec < checkpoint.acceptedTimeSec
        || scenario.acceptedTimeSec > checkpoint.acceptedTimeSec + 6.1
        || scenario.acceptedRevision < checkpoint.acceptedRevision
        || scenario.samples.some(s => s.acceptedTimeSec < checkpoint.acceptedTimeSec || s.acceptedRevision < checkpoint.acceptedRevision)
        || scenario.analyses.some(a => a.sourceAcceptedTimeSec < checkpoint.acceptedTimeSec || a.sourceAcceptedRevision < checkpoint.acceptedRevision)) return null;
    }
    return preview;
  })().catch(() => null);
  verified.set(snapshot, request);
  return request;
}

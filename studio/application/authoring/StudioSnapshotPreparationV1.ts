import {
  cloneAndFreezeStudioJson,
  studioCanonicalJsonStringify,
} from "@/domain/json/CanonicalJson";
import { sha256StudioCanonicalJsonHex } from "@/domain/json/CanonicalJsonSha256";
import type { ScenarioCaptureV2 } from "@/studio/contracts/v2/content";
import type { StudioJsonValueV2 } from "@/studio/contracts/v2/json";
import { validateScenarioCaptureV2 } from "./StudioExperimentDataV2";

export type StudioSnapshotPreparationIdentityV1 = Readonly<{
  modelId: string;
  artifactRevisionId: string;
  surfaceReleaseId: string;
}>;

export type StudioSnapshotSettlementMethodV1 = Readonly<{
  methodId: string;
  purpose: "full-system-steady";
  configuration: StudioJsonValueV2;
}>;

export type StudioSnapshotPreparationResultV1 =
  | Readonly<{
    status: "qualified";
    capture: ScenarioCaptureV2;
    /** Scientific evidence belongs to the versioned method, not Studio. */
    evidence: StudioJsonValueV2;
  }>
  | Readonly<{
    status: "insufficient-evidence" | "branch-mismatch" | "failed";
    reason: string;
  }>;

/** A trusted, purpose-specific analysis adapter; never a Snapshot gate. */
export type StudioSnapshotPreparationPortV1 = Readonly<{
  supports(input: Readonly<{
    identity: StudioSnapshotPreparationIdentityV1;
    method: StudioSnapshotSettlementMethodV1;
  }>): boolean;
  prepare(input: Readonly<{
    identity: StudioSnapshotPreparationIdentityV1;
    method: StudioSnapshotSettlementMethodV1;
    capture: ScenarioCaptureV2;
  }>): Promise<StudioSnapshotPreparationResultV1>;
}>;

/**
 * Process-local preparation evidence, separate from immutable Snapshot content.
 * JSON roundtrips do not confer qualification; a portable archive needs its own
 * method-owned verification. Only this module can admit a reusable instance.
 */
export type StudioSnapshotSettlementEvidenceV1 = Readonly<{
  identity: StudioSnapshotPreparationIdentityV1;
  method: StudioSnapshotSettlementMethodV1;
  sourceCaptureSha256: string;
  qualifiedCaptureSha256: string;
  evidence: StudioJsonValueV2;
}>;

export type StudioSnapshotPreparationRequestV1 = Readonly<{
  /** The new preparation workflow defaults to steady; neutral sealing does not. */
  mode?: "steady" | "preserve-transient";
  method?: StudioSnapshotSettlementMethodV1;
  reusableEvidence?: StudioSnapshotSettlementEvidenceV1;
}>;

export type StudioPreparedSnapshotCaptureV1 = Readonly<{
  mode: "steady" | "preserve-transient";
  capture: ScenarioCaptureV2;
  settlement: StudioSnapshotSettlementEvidenceV1 | null;
}>;

const admittedEvidence = new WeakSet<StudioSnapshotSettlementEvidenceV1>();

/** Prepare first, then pass the returned capture through normal exact admission. */
export async function prepareStudioSnapshotCaptureV1(input: Readonly<{
  identity: StudioSnapshotPreparationIdentityV1;
  capture: ScenarioCaptureV2;
  request?: StudioSnapshotPreparationRequestV1;
  port?: StudioSnapshotPreparationPortV1;
}>): Promise<StudioPreparedSnapshotCaptureV1> {
  // Own the request before the first await: edits during preparation cannot
  // silently substitute a different fixture, method, or evidence binding.
  const identity = cloneAndFreezeStudioJson<StudioSnapshotPreparationIdentityV1>(input.identity);
  const capture = validateScenarioCaptureV2(input.capture);
  assertIdentity(identity);
  const mode = input.request?.mode ?? "steady";
  if (mode === "preserve-transient") {
    return Object.freeze({ mode, capture, settlement: null });
  }
  if (mode !== "steady") throw new Error("Unknown Snapshot preparation mode");
  const port = input.port;
  const method = input.request?.method === undefined ? undefined
    : cloneAndFreezeStudioJson<StudioSnapshotSettlementMethodV1>(input.request.method);
  if (method === undefined || port === undefined) {
    throw new Error("Steady Snapshot preparation requires a compatible settlement method");
  }
  if (method.purpose !== "full-system-steady" || !method.methodId.trim()
    || !port.supports({ identity, method })) {
    throw new Error("Snapshot settlement method is incompatible with this exact capture");
  }
  const reusable = input.request?.reusableEvidence;
  const captureSha256 = await sha256StudioCanonicalJsonHex(capture);
  if (reusable !== undefined && admittedEvidence.has(reusable)
    && reusable.qualifiedCaptureSha256 === captureSha256
    && studioCanonicalJsonStringify(reusable.identity) === studioCanonicalJsonStringify(identity)
    && studioCanonicalJsonStringify(reusable.method) === studioCanonicalJsonStringify(method)) {
    return Object.freeze({ mode, capture, settlement: reusable });
  }
  const result = await port.prepare({ identity, method, capture });
  if (result.status !== "qualified") {
    throw new Error(`Snapshot preparation ${result.status}: ${result.reason}`);
  }
  const preparedCapture = validateScenarioCaptureV2(result.capture);
  if (studioCanonicalJsonStringify(preparedCapture.fixture)
    !== studioCanonicalJsonStringify(capture.fixture)) {
    throw new Error("Snapshot preparation must preserve the exact fixture");
  }
  // Freeze scientific data before hashing/returning across another async edge.
  const evidence = cloneAndFreezeStudioJson<StudioJsonValueV2>(result.evidence);
  const settlement: StudioSnapshotSettlementEvidenceV1 = Object.freeze({
    identity,
    method,
    sourceCaptureSha256: captureSha256,
    qualifiedCaptureSha256: await sha256StudioCanonicalJsonHex(preparedCapture),
    evidence,
  });
  admittedEvidence.add(settlement);
  return Object.freeze({ mode, capture: preparedCapture, settlement });
}

function assertIdentity(identity: StudioSnapshotPreparationIdentityV1): void {
  if (!identity.modelId?.trim() || !identity.surfaceReleaseId?.trim()
    || !/^[0-9a-f]{64}$/.test(identity.artifactRevisionId)) {
    throw new Error("Snapshot preparation requires exact model, artifact, and Surface identities");
  }
}

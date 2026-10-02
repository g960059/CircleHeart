import type { MainWireSharedPressureVolumeAnchorV1 as Anchor } from "./MainWireSharedPressureVolumeAnchorV1";
import { formalPairQualifiedV3 as qualified } from "./MainWirePressureVolumeProtocolsV3";
import { captureMainWirePressureCrossingSessionV1 as capture, wrapMainWirePressureCrossingSessionV1 as wrap } from "./MainWirePressureCrossingSessionV1";
import type { MainWireIntegratedModelGuytonStarlingOrientationV3 } from "./MainWireGuytonStarlingOrientationV3";
import { sha256StudioCanonicalJsonHex as digest } from "@/domain/json/CanonicalJsonSha256";
import { validateAndOwnStudioSimulationPortableJsonV2 as own } from "@/studio/contracts/v2/simulation";
import type { StudioJsonValueV2 as Json } from "@/studio/contracts/v2/json";
import { validMainWireFixedTonePointSettlementV2 } from "./MainWireFixedToneSettlementV2";

const schemaId = "main-wire-pressure-volume-anchor-continuation-v1";
type Owner = Parameters<typeof wrap>[0];
type Orientation = Extract<MainWireIntegratedModelGuytonStarlingOrientationV3, { status: "available" }>;
type Capsule = Readonly<{ schemaId: typeof schemaId; sourceBinding: string;
  checkpoint: Awaited<ReturnType<Owner["checkpoint"]>>;
  orientation: Orientation; pair: Anchor["pair"]; digest: string }>;

/** Ephemeral analysis transport only. Never persisted as an exact frame or
 * analysis result. Exact continuation uses only the model-owned checkpoint;
 * the derived fixed Guyton curve and qualified anchor travel alongside it. */
export async function captureMainWirePressureVolumeContinuationV1(
  center: Anchor, sourceBinding: string, orientation: Orientation,
): Promise<Json> {
  const body = own({ schemaId, sourceBinding, checkpoint: await capture(center.branch),
    orientation, pair: center.pair });
  return own({ ...(body as object), digest: await digest(body) });
}

export async function restoreMainWirePressureVolumeContinuationV1(
  value: Json, sourceBinding: string, restore: (checkpoint: unknown) => Promise<Owner>,
  requireReservoirClosure = false,
): Promise<Anchor & Readonly<{ orientation: Orientation }>> {
  const capsule = own(value) as unknown as Capsule;
  if (!capsule || typeof capsule !== "object" || capsule.schemaId !== schemaId || capsule.sourceBinding !== sourceBinding)
    throw new Error("Pressure-volume preparation source binding differs");
  const { digest: expectedDigest, ...body } = capsule;
  if (typeof expectedDigest !== "string" || await digest(body) !== expectedDigest)
    throw new Error("Pressure-volume preparation digest differs");
  const owner = await restore(capsule.checkpoint);
  const accepted = owner.currentAcceptedState();
  if (capsule.orientation.status !== "available"
    || capsule.orientation.sourceAcceptedRevision !== accepted.revision
    || capsule.orientation.sourceAcceptedTimeSec !== accepted.acceptedTimeSec
    || !qualified(capsule.pair)
    || (requireReservoirClosure && ![capsule.pair.left, capsule.pair.right].every(validMainWireFixedTonePointSettlementV2))
    || [capsule.pair.left, capsule.pair.right].some(point => point.role !== "operating-anchor"
      || point.totalBloodVolumeMl !== accepted.coronary.fixedGlobalTotalBloodVolumeMl))
    throw new Error("Pressure-volume preparation endpoint differs");
  // Each directional chain begins by making an exact fixed-TBV fork. Native
  // completed-beat readback and the old event collector are not needed to
  // initialize that new, isolated branch and are deliberately not transported.
  return Object.freeze({ branch: wrap(owner, .002, requireReservoirClosure), orientation: capsule.orientation, pair: capsule.pair });
}

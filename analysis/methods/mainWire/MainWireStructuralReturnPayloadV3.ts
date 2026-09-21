import type { MainWireIntegratedModelGuytonSideV3, MainWireIntegratedModelStructuralReturnOrientationV3 } from "./MainWireGuytonStarlingOrientationV3";

/**
 * Shared decoder for the portable model-analysis payload. Validation and
 * rendering use the same guard without loading UI code in numerical Workers.
 */
export function structuralReturnOrientationFromPayloadV3(
  payload: unknown,
  side: MainWireIntegratedModelGuytonSideV3,
): MainWireIntegratedModelStructuralReturnOrientationV3 | null {
  if (!plainRecordV3(payload) || payload.status !== "available") return null;
  const candidate = payload[side];
  if (
    !plainRecordV3(candidate) ||
    candidate.side !== side ||
    candidate.semantics !==
      "frozen-accepted-step-volume-constrained-structural-orientation-not-simulated-response" ||
    candidate.pressureBasis !== "absolute" ||
    !finiteNumberV3(candidate.sourceAcceptedRevision) ||
    !finiteNumberV3(candidate.sourceAcceptedTimeSec) ||
    !finiteNumberV3(candidate.fillingPressureMmHg) ||
    !plainRecordV3(candidate.operatingPoint) ||
    !finiteNumberV3(candidate.operatingPoint.downstreamPressureMmHg) ||
    !finiteNumberV3(candidate.operatingPoint.returnFlowLPerMin) ||
    !validStructuralAnchoringV3(candidate.anchoring) ||
    !Array.isArray(candidate.curve) ||
    candidate.curve.length < 2 ||
    candidate.curve.some(
      (point) =>
        !plainRecordV3(point) ||
        !finiteNumberV3(point.downstreamPressureMmHg) ||
        !finiteNumberV3(point.returnFlowLPerMin) ||
        typeof point.flowLimited !== "boolean",
    ) ||
    !validStarlingLocusV3(candidate.starlingLocus)
  )
    return null;
  return candidate as unknown as MainWireIntegratedModelStructuralReturnOrientationV3;
}

function plainRecordV3(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function finiteNumberV3(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function validStructuralAnchoringV3(value: unknown): boolean {
  if (
    !plainRecordV3(value) ||
    !finiteNumberV3(value.downstreamPressureOffsetMmHg)
  )
    return false;
  if (value.status === "accepted-step-readback") {
    return (
      value.method === "none" &&
      value.downstreamPressureOffsetMmHg === 0 &&
      value.volumeResidualMl === null
    );
  }
  return (
    value.status === "starling-operating-anchor" &&
    value.method === "downstream-pressure-translation" &&
    finiteNumberV3(value.volumeResidualMl)
  );
}

function validStarlingLocusV3(value: unknown): boolean {
  if (!plainRecordV3(value) || !Array.isArray(value.points)) return false;
  if (value.status === "requires-protocol") return value.points.length === 0;
  if (value.status === "responsive-fixed-tbv-preview") {
    if (
      !Number.isSafeInteger(value.completedPointCount) ||
      !Number.isSafeInteger(value.totalPointCount) ||
      (value.completedPointCount as number) < 1 ||
      value.completedPointCount !== value.points.length ||
      (value.totalPointCount as number) <
        (value.completedPointCount as number) ||
      !finiteNumberV3(value.measurementDurationSec) ||
      !Number.isSafeInteger(value.minimumBeatCount) ||
      !Number.isSafeInteger(value.maximumBeatCount) ||
      value.slowControllerPolicy !== "coronary-tone-frozen-at-branch-source"
    )
      return false;
  } else if (value.status === "measured-fixed-tbv-protocol") {
    if (
      !Number.isSafeInteger(value.completedPointCount) ||
      !Number.isSafeInteger(value.totalPointCount) ||
      value.completedPointCount !== value.points.length ||
      (value.totalPointCount as number) <
        (value.completedPointCount as number) ||
      !Number.isSafeInteger(value.minimumBeatCount) ||
      !Number.isSafeInteger(value.maximumBeatCount) ||
      value.slowControllerPolicy !==
        "active-source-period1-then-coronary-tone-frozen" ||
      value.convergencePolicy !==
        "complete-beat-output-period1-closure"
    ) return false;
  } else return false;
  const minimumPointCount =
    value.status === "responsive-fixed-tbv-preview" ? 1 : 2;
  return value.points.length >= minimumPointCount && value.points.every(
    (point) => {
      if (!plainRecordV3(point)) return false;
      const commonValid =
        finiteNumberV3(point.totalBloodVolumeMl) &&
        finiteNumberV3(point.fillingPressureMmHg) &&
        finiteNumberV3(point.cardiacOutputLPerMin) &&
        typeof point.settled === "boolean" &&
        point.finiteAndFixedTbvPassed === true &&
        (point.evidence === "responsive-preview" ||
          point.evidence === "responsive-settled-anchor" ||
          point.evidence === "qualified-periodic" ||
          point.evidence === "fixed-tone-periodic") &&
        (point.role === "operating-anchor" ||
          point.role === "continuation") &&
        (point.quality === "locally-converged" ||
          point.quality === "adaptive-preview" ||
          point.quality === "convergence-cap" ||
          point.quality === "period-2-boundary") &&
        typeof point.curveEligible === "boolean" &&
        Number.isSafeInteger(point.completedBeatCount) &&
        (point.completedBeatCount as number) >= 3 &&
        finiteNumberV3(point.maximumNormalizedBeatDelta) &&
        (point.measurementWindowStatus === "complete-beat-converged" ||
          point.measurementWindowStatus === "complete-beat-preview" ||
          point.measurementWindowStatus === "complete-beat-cap" ||
          point.measurementWindowStatus === "period-2-detected" ||
          point.measurementWindowStatus === "responsive-period1-settled" ||
          point.measurementWindowStatus === "canonical-period1-qualified" ||
          point.measurementWindowStatus === "fixed-tone-period1-settled") &&
        finiteNumberV3(point.acceptedMeasurementDurationSec) &&
        (point.acceptedMeasurementDurationSec as number) > 0 &&
        validPressureVolumeLoopV3(point.ventricularPressureVolumeLoop) &&
        validPressureVolumeLandmarksV3(
          point.ventricularPressureVolumeLandmarks,
        );
      if (!commonValid) return false;
      if (value.status === "responsive-fixed-tbv-preview") {
        return (point.acceptedMeasurementDurationSec as number) <=
          (value.measurementDurationSec as number) + 1e-9;
      }
      return point.quality === "locally-converged" &&
        point.curveEligible === true &&
        point.settled === true &&
        point.evidence === "fixed-tone-periodic" &&
        point.measurementWindowStatus === "fixed-tone-period1-settled";
    },
  );
}

function validPressureVolumeLoopV3(value: unknown): boolean {
  return Array.isArray(value) && value.length >= 12 && value.every((point) =>
    plainRecordV3(point) &&
    finiteNumberV3(point.volumeMl) &&
    finiteNumberV3(point.pressureMmHg));
}

function validPressureVolumeLandmarksV3(value: unknown): boolean {
  if (
    !plainRecordV3(value)
    || value.pressureBasis !== "transmural"
    || !plainRecordV3(value.endDiastolic)
    || !plainRecordV3(value.endSystolic)
  ) return false;
  return value.endDiastolic.event === "maximum-volume"
    && finiteNumberV3(value.endDiastolic.volumeMl)
    && finiteNumberV3(value.endDiastolic.pressureMmHg)
    && (
      value.endSystolic.event === "semilunar-valve-closure"
      || value.endSystolic.event === "minimum-volume-fallback"
    )
    && finiteNumberV3(value.endSystolic.volumeMl)
    && finiteNumberV3(value.endSystolic.pressureMmHg);
}

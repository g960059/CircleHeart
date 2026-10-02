import {
  MAIN_WIRE_INTEGRATED_MODEL_STARLING_PROTOCOL_REQUIREMENT_V3,
  type MainWireIntegratedModelPressureVolumeLoopPointV3,
  type MainWireIntegratedModelStarlingLocusV3,
  type MainWireIntegratedModelStarlingPointV3,
} from "@/analysis/methods/mainWire/MainWireGuytonStarlingOrientationV3";

import type {
  MainWireIntegratedModelCompletedBeatMetricsV3,
  MainWireIntegratedModelPressureVolumeLandmarkV3,
  MainWireIntegratedModelVentricularPressureVolumeLandmarksV3,
} from "@/engine/myocardium/MainWireIntegratedModelBeatMetricsV3";
import type {
  MainWireIntegratedModelOutputIdV3,
  MainWireIntegratedModelOutputValueV3,
} from "@/engine/myocardium/MainWireIntegratedModelOutputRegistryV3";
import {
  type MainWireIntegratedModelObservationV3,
  type MainWireIntegratedModelSessionV3,
} from "@/engine/myocardium/MainWireIntegratedModelSessionV3";
import type { MainWireIntegratedModelHemodynamicResearchInputsV3 } from "@/engine/myocardium/MainWireIntegratedModelHemodynamicResearchInputsV3";
import { MAIN_WIRE_NORMAL_ADULT_BLOOD_VOLUME_PROVENANCE_V1 } from "@/engine/myocardium/experiments/MainWireNormalAdultBloodVolumeOperatingPointV1";
import {
  MAIN_WIRE_INTEGRATED_MODEL_RESPONSIVE_STARLING_HYPERVOLEMIC_PARTITION_V3,
  MAIN_WIRE_INTEGRATED_MODEL_RESPONSIVE_STARLING_HYPOVOLEMIC_PARTITION_V3,
  type MainWireIntegratedModelResponsiveStarlingPartitionV3,
} from "@/analysis/methods/mainWire/MainWireStructuralAnalysisContractV3";
import {
  MAIN_WIRE_FIXED_TONE_SETTLEMENT_V2,
  MainWireFixedToneVolumeClosureV2,
  validMainWireFixedTonePointSettlementV2,
  type MainWireFixedToneSettlementEvidenceV2,
} from "@/analysis/methods/mainWire/MainWireFixedToneSettlementV2";

// The detached-worker coordinator reuses the same qualification and frontier
// algorithms. The admitted legacy entry point below remains byte-stable.
export {
  settleFormalPressureVolumeSourceV3,
  measureFormalPressureVolumeBranchV3,
  runFormalHypovolemicCoverageChainV3,
  runFormalHypervolemicStarlingChainV3,
  formalExpectedPointCountV3,
  formalPressureVolumeLocusV3,
  formalPairQualifiedV3,
  FIXED_TBV_TOLERANCE_ML_V3,
};
export type { AcceptedBranchV3, StarlingPairV3 };

export {
  MAIN_WIRE_INTEGRATED_MODEL_RESPONSIVE_STARLING_HYPERVOLEMIC_PARTITION_V3,
  MAIN_WIRE_INTEGRATED_MODEL_RESPONSIVE_STARLING_HYPOVOLEMIC_PARTITION_V3,
  type MainWireIntegratedModelResponsiveStarlingPartitionV3,
} from "@/analysis/methods/mainWire/MainWireStructuralAnalysisContractV3";

export const MAIN_WIRE_INTEGRATED_MODEL_RESPONSIVE_STARLING_PROTOCOL_V3_ID =
  "main-wire-integrated-model-responsive-fixed-tone-tbv-starling-preview-v3" as const;

/**
 * Deterministic first targets. The low chain may replace an unsafe target by
 * bisection against its last reliable point, so actual low scales can differ.
 */
export const MAIN_WIRE_INTEGRATED_MODEL_RESPONSIVE_STARLING_TBV_SCALES_V3 =
  Object.freeze([
    0.23, 0.27, 0.31, 0.36, 0.42, 0.48, 0.54, 0.6, 0.66, 0.72, 0.78, 0.84, 0.9,
    0.95, 1, 1.08, 1.16, 1.24, 1.32, 1.4,
  ] as const);

export const MAIN_WIRE_INTEGRATED_MODEL_RESPONSIVE_STARLING_HYPOVOLEMIC_TBV_SCALES_V3 =
  Object.freeze([
    0.95, 0.9, 0.84, 0.78, 0.72, 0.66, 0.6, 0.54, 0.48, 0.42, 0.36, 0.31, 0.27,
    0.23,
  ] as const);

export const MAIN_WIRE_INTEGRATED_MODEL_RESPONSIVE_STARLING_HYPERVOLEMIC_TBV_SCALES_V3 =
  Object.freeze([1.08, 1.16, 1.24, 1.32, 1.4] as const);

export const MAIN_WIRE_INTEGRATED_MODEL_RESPONSIVE_STARLING_LOW_FLOW_TARGET_L_PER_MIN_V3 = 0.5;

export const MAIN_WIRE_INTEGRATED_MODEL_FORMAL_PRESSURE_VOLUME_PROTOCOL_V3_ID =
  "main-wire-integrated-model-fixed-tone-settled-hot-start-pv-family-v1" as const;

export const MAIN_WIRE_INTEGRATED_MODEL_FORMAL_PRELOAD_RESERVE_PROTOCOL_V2_ID =
  "main-wire-integrated-model-fixed-tone-reservoir-settled-preload-reserve-v2" as const;

export const MAIN_WIRE_INTEGRATED_MODEL_FORMAL_PRELOAD_RESERVE_QUALIFICATION_V1_ID =
  "main-wire-integrated-model-formal-fixed-tone-preload-reserve-qualification-v1" as const;

/**
 * A release gate, not a clinical fluid-challenge claim. Symmetric fixed-tone
 * endpoints establish reserve on both sides of the operating point. Flow,
 * filling pressure, maximum-volume EDV, and ED transmural pressure must all
 * move in the physiologically expected direction for both ventricles.
 */
export const MAIN_WIRE_INTEGRATED_MODEL_FORMAL_PRELOAD_RESERVE_POLICY_V1 =
  Object.freeze({
    hypovolemicGlobalTbvScale: 0.88 as const,
    hypervolemicGlobalTbvScale: 1.12 as const,
    minimumDirectionalFillingPressureChangeMmHg: 1 as const,
    minimumDirectionalCardiacOutputChangeLPerMin: 0.05 as const,
    minimumDirectionalCardiacOutputChangeFraction01: 0.02 as const,
    minimumCardiacOutputSlopeLPerMinPerMmHg: 0.015 as const,
    minimumDirectionalEndDiastolicVolumeChangeMl: 1 as const,
    minimumDirectionalEndDiastolicVolumeChangeFraction01: 0.02 as const,
    minimumDirectionalEndDiastolicTransmuralPressureChangeMmHg: 0.25 as const,
  });

/**
 * Minimal numerical seam required by structural preload-family analyses.
 * Exact model generations may implement it without exposing analysis results
 * in their accepted state or checkpoint ABI.
 */
export interface MainWireIntegratedModelStructuralAnalysisSessionV3 {
  /** Purpose-specific additional gate, propagated to all analysis forks. */
  readonly requireReservoirClosureV1?: boolean;
  currentAcceptedState(): ReturnType<
    MainWireIntegratedModelSessionV3["currentAcceptedState"]
  >;
  observe(): MainWireIntegratedModelObservationV3;
  advanceToPresentationTime(
    targetTimeSec: number,
  ): ReturnType<MainWireIntegratedModelSessionV3["advanceToPresentationTime"]>;
  advanceStructuralAnalysisToPresentationTimeV1?(
    targetTimeSec: number,
  ): ReturnType<MainWireIntegratedModelSessionV3["advanceToPresentationTime"]>;
  /**
   * Optional exact-model projection seam for lean accepted steps, where the
   * large internal step object is deliberately not retained. Analysis owns
   * the derived loop; the model only supplies clock-matched primitive values.
   */
  projectCurrentAcceptedValuesV1?(
    outputIds: readonly MainWireIntegratedModelOutputIdV3[],
  ): Readonly<Record<string, MainWireIntegratedModelOutputValueV3>>;
  /** Analysis-only event measurements. Null discards a beat whose full event
   * window was not observed; exact/native metrics and checkpoints stay intact. */
  pressureVolumeLandmarksForBeatV1?(beat: MainWireIntegratedModelCompletedBeatMetricsV3): Readonly<{
    left: MainWireIntegratedModelVentricularPressureVolumeLandmarksV3;
    right: MainWireIntegratedModelVentricularPressureVolumeLandmarksV3;
  }> | null;
  forkAtFixedGlobalTotalBloodVolume(
    targetGlobalTotalBloodVolumeMl: number,
  ): MainWireIntegratedModelStructuralAnalysisSessionV3;
  forkResponsiveStarlingAtFixedGlobalTotalBloodVolume(
    targetGlobalTotalBloodVolumeMl: number,
  ): MainWireIntegratedModelStructuralAnalysisSessionV3;
}

function advanceStructuralAnalysisSessionV3(
  session: MainWireIntegratedModelStructuralAnalysisSessionV3,
  targetTimeSec: number,
): ReturnType<MainWireIntegratedModelSessionV3["advanceToPresentationTime"]> {
  return session.advanceStructuralAnalysisToPresentationTimeV1?.(
    targetTimeSec,
  ) ?? session.advanceToPresentationTime(targetTimeSec);
}

type AdvancedStructuralAnalysisStepV3 = Extract<
  ReturnType<MainWireIntegratedModelSessionV3["advanceToPresentationTime"]>,
  Readonly<{ status: "advanced" }>
>;

function attemptStructuralAnalysisAdvanceV3(
  session: MainWireIntegratedModelStructuralAnalysisSessionV3,
  targetTimeSec: number,
):
  | Readonly<{ status: "advanced"; advance: AdvancedStructuralAnalysisStepV3 }>
  | RejectedBranchV3 {
  try {
    const advance = advanceStructuralAnalysisSessionV3(session, targetTimeSec);
    if (advance.status !== "advanced") {
      return rejectedV3(
        advance.status === "failed"
          ? advance.message
          : `unexpected structural analysis advance status ${advance.status}`,
      );
    }
    return Object.freeze({ status: "advanced" as const, advance });
  } catch (error) {
    return rejectedV3(error);
  }
}

/**
 * PVA becomes available after one settled anchor, three lower-preload points,
 * and one higher-preload point. The low bootstrap reaches the greater of 70%
 * of source TBV and 60% of the normal-adult 5600 mL reference. The absolute
 * floor prevents an already-hypovolemic Scenario from being reduced too far
 * merely to preserve a relative display span. Both directional Workers then
 * continue with a coverage-first frontier: smooth, inexpensive intervals grow
 * wider, curved intervals shrink, and difficult settlement prevents further
 * widening. Coronary tone is held at the source value and every retained point
 * passes complete-beat P1 closure.
 */
export const MAIN_WIRE_INTEGRATED_MODEL_FORMAL_PVA_MINIMUM_POINT_COUNT_V3 = 5;
export const MAIN_WIRE_INTEGRATED_MODEL_FORMAL_PVA_MINIMUM_TBV_SCALE_V3 = 0.7;
export const MAIN_WIRE_INTEGRATED_MODEL_FORMAL_PVA_MINIMUM_ABSOLUTE_TBV_ML_V3 =
  MAIN_WIRE_NORMAL_ADULT_BLOOD_VOLUME_PROVENANCE_V1.fullGraphReferenceTotalBloodVolumeMl *
  0.6;

/**
 * Coverage bounds for the shared Starling/PV family. They are exploration
 * limits, not promises that an extreme state will settle. The low limb stops
 * earlier at the declared low-flow or numerical boundary. The high limb stops
 * at its numerical boundary. No pressure-volume point is extrapolated.
 */
export const MAIN_WIRE_INTEGRATED_MODEL_FORMAL_STARLING_MINIMUM_TBV_SCALE_V3 = 0.18;
export const MAIN_WIRE_INTEGRATED_MODEL_FORMAL_STARLING_MAXIMUM_TBV_SCALE_V3 = 1.6;

export const MAIN_WIRE_INTEGRATED_MODEL_FORMAL_PVA_CORE_POINT_COUNT_V3 = 4;

export function mainWireIntegratedModelFormalPvaTargetGlobalTbvMlV3(
  sourceGlobalTbvMl: number,
  scale: number,
): number {
  if (
    !Number.isFinite(sourceGlobalTbvMl) ||
    !(sourceGlobalTbvMl > 0) ||
    !Number.isFinite(scale) ||
    !(scale > 0) ||
    scale > 1
  ) {
    throw new Error("formal PVA TBV scale must lie in (0, 1]");
  }
  return sourceGlobalTbvMl * scale;
}

export function mainWireIntegratedModelFormalPvaMinimumGlobalTbvMlV3(
  sourceGlobalTbvMl: number,
): number {
  if (!Number.isFinite(sourceGlobalTbvMl) || !(sourceGlobalTbvMl > 0)) {
    throw new Error("formal PVA source TBV must be positive and finite");
  }
  return Math.min(
    sourceGlobalTbvMl,
    Math.max(
      sourceGlobalTbvMl *
        MAIN_WIRE_INTEGRATED_MODEL_FORMAL_PVA_MINIMUM_TBV_SCALE_V3,
      MAIN_WIRE_INTEGRATED_MODEL_FORMAL_PVA_MINIMUM_ABSOLUTE_TBV_ML_V3,
    ),
  );
}

const MINIMUM_COMPLETE_BEAT_COUNT_V3 = 3;
const STANDARD_MAXIMUM_COMPLETE_BEAT_COUNT_V3 = 5;
const DEEP_HYPOVOLEMIC_MAXIMUM_COMPLETE_BEAT_COUNT_V3 = 12;
// Continue the valid target instead of repeatedly discarding twelve beats and
// restarting via smaller bridges. This is a compute budget, not a relaxed
// period-1 tolerance; every retained point still passes two comparisons ≤1.
const FORMAL_CONTINUATION_MAXIMUM_COMPLETE_BEAT_COUNT_V3 = 16;
const FORMAL_SOURCE_MAXIMUM_COMPLETE_BEAT_COUNT_V3 = 20;
const CENTER_MAXIMUM_COMPLETE_BEAT_COUNT_V3 = 20;
const MAXIMUM_MEASUREMENT_DURATION_SEC_V3 = 36;
const RESPONSIVE_PROTOCOL_SAMPLE_DT_SEC_V3 = 0.02;
const FORMAL_PROTOCOL_SAMPLE_DT_SEC_V3 = 0.01;
const FIXED_TBV_TOLERANCE_ML_V3 = 1e-6;
const MAXIMUM_RESPONSIVE_PRESENTATION_ADVANCES_PER_POINT_V3 = 1_000;
const MAXIMUM_FORMAL_PRESENTATION_ADVANCES_PER_POINT_V3 = 4_000;
const MAXIMUM_LOW_TARGET_ATTEMPTS_PER_POINT_V3 = 8;
const MAXIMUM_FORMAL_HOT_START_ATTEMPTS_PER_POINT_V3 = 8;
const MINIMUM_LOW_SCALE_BRACKET_V3 = 0.01;
const MINIMUM_FORMAL_TBV_BRACKET_ML_V3 = 1;
const FORMAL_PVA_REQUIRED_LOWER_POINT_COUNT_V3 = 3;
const FORMAL_LOW_EXTENSION_INITIAL_SCALE_STEP_V3 = 0.12;
const FORMAL_LOW_MINIMUM_INFORMATION_SCALE_STEP_V3 = 0.02;
const FORMAL_LOW_HOT_START_BRIDGE_MAXIMUM_SCALE_STEP_V3 = 0.02;
const FORMAL_LOW_BOUNDARY_REFINEMENT_COUNT_V3 = 3;
const FORMAL_LOW_REFINEMENT_MAXIMUM_ATTEMPTS_V3 = 4;
const FORMAL_HIGH_INITIAL_SCALE_STEP_V3 = 0.12;
const FORMAL_HIGH_PREVIEW_SCALE_STEP_V3 = 0.06;
const FORMAL_PVA_MINIMUM_SCALE_STEP_V3 = 0.005;
const FORMAL_LOW_MAXIMUM_SCALE_STEP_V3 = 0.16;
const FORMAL_HIGH_MAXIMUM_SCALE_STEP_V3 = 0.2;
const FORMAL_HOT_START_BRIDGE_MAXIMUM_SCALE_STEP_V3 = 0.06;
const FORMAL_MAXIMUM_RETAINED_POINTS_PER_DIRECTION_V3 = 12;
const FORMAL_SMOOTH_CHORD_ERROR_V3 = 0.12;
const FORMAL_CURVED_CHORD_ERROR_V3 = 0.35;
const FORMAL_CURVED_SCALE_STEP_MULTIPLIER_V3 = 0.8;
const FORMAL_HIGH_ESV_SATURATION_GAIN_ML_V3 = 4;
const FORMAL_HIGH_ESV_SATURATION_STEP_MULTIPLIER_V3 = 1.35;
const FORMAL_MINIMUM_TERMINAL_COVERAGE_STEP_V3 = 0.02;
const FLOW_ABSOLUTE_CLOSURE_L_PER_MIN_V3 = 0.05;
const FLOW_RELATIVE_CLOSURE_V3 = 0.01;
const ATRIAL_PRESSURE_CLOSURE_MMHG_V3 = 0.15;
const AORTIC_PRESSURE_CLOSURE_MMHG_V3 = 0.5;
const VENTRICULAR_VOLUME_CLOSURE_ML_V3 = 1;
const VENTRICULAR_LANDMARK_VOLUME_CLOSURE_ML_V3 = 1;
const VENTRICULAR_LANDMARK_PRESSURE_CLOSURE_MMHG_V3 = 1;
const EARLY_PREVIEW_MAXIMUM_CLOSURE_SCORE_V3 = 2;
const FINAL_PREVIEW_MAXIMUM_CLOSURE_SCORE_V3 = 4;
const DESCENDING_LIMB_ABSOLUTE_DROP_L_PER_MIN_V3 = 0.15;
const DESCENDING_LIMB_RELATIVE_DROP_V3 = 0.03;
const DESCENDING_LIMB_STEP_TOLERANCE_L_PER_MIN_V3 = 0.01;
const MINIMUM_PRESSURE_VOLUME_LOOP_SAMPLE_COUNT_V3 = 12;
const STRUCTURAL_PRESSURE_VOLUME_OUTPUT_IDS_V3 = Object.freeze([
  "hemodynamics.volume.LV",
  "hemodynamics.pressure.transmural.LV",
  "hemodynamics.volume.RV",
  "hemodynamics.pressure.transmural.RV",
] as const satisfies readonly MainWireIntegratedModelOutputIdV3[]);

type StarlingPairV3 = Readonly<{
  right: MainWireIntegratedModelStarlingPointV3;
  left: MainWireIntegratedModelStarlingPointV3;
}>;

type PressureVolumeLoopPairV3 = Readonly<{
  left: readonly MainWireIntegratedModelPressureVolumeLoopPointV3[];
  right: readonly MainWireIntegratedModelPressureVolumeLoopPointV3[];
}>;

type CompletedPressureVolumeBeatPairV3 = Readonly<{
  loops: PressureVolumeLoopPairV3;
  completedBeatMetrics: MainWireIntegratedModelCompletedBeatMetricsV3;
}>;

class FixedTbvPressureVolumeLoopCollectorV3 {
  private completedBeatId: string | null = null;
  private left: MainWireIntegratedModelPressureVolumeLoopPointV3[] = [];
  private right: MainWireIntegratedModelPressureVolumeLoopPointV3[] = [];

  accept(
    observation: MainWireIntegratedModelObservationV3,
    session?: MainWireIntegratedModelStructuralAnalysisSessionV3,
  ): PressureVolumeLoopPairV3 | null {
    const sample = pressureVolumeSamplePairV3(observation, session);
    const nextCompletedBeatId =
      observation.completedBeatMetrics?.endAtrialCaptureId ?? null;
    if (sample === null || nextCompletedBeatId === null) return null;
    if (this.completedBeatId === null) {
      this.completedBeatId = nextCompletedBeatId;
      this.left = [sample.left];
      this.right = [sample.right];
      return null;
    }
    if (nextCompletedBeatId === this.completedBeatId) {
      this.left.push(sample.left);
      this.right.push(sample.right);
      return null;
    }
    const completed =
      this.left.length >= MINIMUM_PRESSURE_VOLUME_LOOP_SAMPLE_COUNT_V3 &&
      this.right.length >= MINIMUM_PRESSURE_VOLUME_LOOP_SAMPLE_COUNT_V3
        ? Object.freeze({
            left: Object.freeze([...this.left, sample.left]),
            right: Object.freeze([...this.right, sample.right]),
          })
        : null;
    this.completedBeatId = nextCompletedBeatId;
    this.left = [sample.left];
    this.right = [sample.right];
    return completed;
  }
}

class FormalFixedTbvPressureVolumeLoopCollectorV3 {
  private previousPhase01: number | null = null;
  private fullCycleStarted = false;
  private left: MainWireIntegratedModelPressureVolumeLoopPointV3[] = [];
  private right: MainWireIntegratedModelPressureVolumeLoopPointV3[] = [];

  accept(
    observation: MainWireIntegratedModelObservationV3,
    session?: MainWireIntegratedModelStructuralAnalysisSessionV3,
  ): CompletedPressureVolumeBeatPairV3 | null {
    const sample = formalPressureVolumeSamplePairV3(observation, session);
    if (sample === null) return null;
    if (this.previousPhase01 === null) {
      this.previousPhase01 = sample.left.phase01!;
      this.left = [sample.left];
      this.right = [sample.right];
      return null;
    }
    if (sample.left.phase01! >= this.previousPhase01) {
      this.left.push(sample.left);
      this.right.push(sample.right);
      this.previousPhase01 = sample.left.phase01!;
      return null;
    }
    const completed =
      this.fullCycleStarted &&
      this.left.length >= MINIMUM_PRESSURE_VOLUME_LOOP_SAMPLE_COUNT_V3 &&
      this.right.length >= MINIMUM_PRESSURE_VOLUME_LOOP_SAMPLE_COUNT_V3
        ? Object.freeze({
            loops: Object.freeze({
              left: Object.freeze([...this.left]),
              right: Object.freeze([...this.right]),
            }),
            completedBeatMetrics: observation.completedBeatMetrics!,
          })
        : null;
    this.fullCycleStarted = true;
    this.previousPhase01 = sample.left.phase01!;
    this.left = [sample.left];
    this.right = [sample.right];
    return completed;
  }
}

function pressureVolumeSamplePairV3(
  observation: MainWireIntegratedModelObservationV3,
  session?: MainWireIntegratedModelStructuralAnalysisSessionV3,
): Readonly<{
  left: MainWireIntegratedModelPressureVolumeLoopPointV3;
  right: MainWireIntegratedModelPressureVolumeLoopPointV3;
}> | null {
  const projected = projectedPressureVolumeSamplePairV3(session);
  if (projected !== null) return projected;
  const step = observation.lastAcceptedStep;
  if (step === null) return null;
  const volumes = observation.acceptedState.coronary.circulation.nodeVolumesMl;
  const pressures =
    step.coronaryStep.baseStep.mechanicsTrial.transmuralPressuresMmHg;
  const pair = Object.freeze({
    left: Object.freeze({
      volumeMl: volumes.LV,
      pressureMmHg: pressures.LV,
    }),
    right: Object.freeze({
      volumeMl: volumes.RV,
      pressureMmHg: pressures.RV,
    }),
  });
  if (
    ![
      pair.left.volumeMl,
      pair.left.pressureMmHg,
      pair.right.volumeMl,
      pair.right.pressureMmHg,
    ].every(Number.isFinite)
  )
    throw new Error("fixed-TBV pressure-volume loop sample is not finite");
  return pair;
}

function projectedPressureVolumeSamplePairV3(
  session: MainWireIntegratedModelStructuralAnalysisSessionV3 | undefined,
): Readonly<{
  left: MainWireIntegratedModelPressureVolumeLoopPointV3;
  right: MainWireIntegratedModelPressureVolumeLoopPointV3;
}> | null {
  if (session?.projectCurrentAcceptedValuesV1 === undefined) return null;
  const values = session.projectCurrentAcceptedValuesV1(
    STRUCTURAL_PRESSURE_VOLUME_OUTPUT_IDS_V3,
  );
  const scalar = (outputId: MainWireIntegratedModelOutputIdV3) => {
    const value = values[outputId];
    return value?.availability === "available" &&
        typeof value.value === "number" && Number.isFinite(value.value)
      ? value.value
      : null;
  };
  const leftVolumeMl = scalar("hemodynamics.volume.LV");
  const leftPressureMmHg = scalar("hemodynamics.pressure.transmural.LV");
  const rightVolumeMl = scalar("hemodynamics.volume.RV");
  const rightPressureMmHg = scalar("hemodynamics.pressure.transmural.RV");
  if (
    leftVolumeMl === null || leftPressureMmHg === null ||
    rightVolumeMl === null || rightPressureMmHg === null
  )
    return null;
  return Object.freeze({
    left: Object.freeze({
      volumeMl: leftVolumeMl,
      pressureMmHg: leftPressureMmHg,
    }),
    right: Object.freeze({
      volumeMl: rightVolumeMl,
      pressureMmHg: rightPressureMmHg,
    }),
  });
}

function formalPressureVolumeSamplePairV3(
  observation: MainWireIntegratedModelObservationV3,
  session?: MainWireIntegratedModelStructuralAnalysisSessionV3,
): Readonly<{
  left: MainWireIntegratedModelPressureVolumeLoopPointV3 &
    Readonly<{ phase01: number }>;
  right: MainWireIntegratedModelPressureVolumeLoopPointV3 &
    Readonly<{ phase01: number }>;
}> | null {
  const pair = pressureVolumeSamplePairV3(observation, session);
  const completedBeat = observation.completedBeatMetrics;
  if (pair === null || completedBeat === null) return null;
  const elapsedSinceLastCaptureSec =
    observation.acceptedState.acceptedTimeSec - completedBeat.endTimeSec;
  const phase01 = elapsedSinceLastCaptureSec / completedBeat.durationSec;
  if (!Number.isFinite(phase01) || phase01 < -1e-12 || phase01 >= 1 + 1e-12) {
    throw new Error("fixed-TBV pressure-volume loop phase is outside one beat");
  }
  const ownedPhase01 = Math.max(0, Math.min(1 - Number.EPSILON, phase01));
  return Object.freeze({
    left: Object.freeze({
      ...pair.left,
      phase01: ownedPhase01,
    }),
    right: Object.freeze({
      ...pair.right,
      phase01: ownedPhase01,
    }),
  });
}

type AcceptedBranchV3 = Readonly<{
  status: "accepted";
  branch: MainWireIntegratedModelStructuralAnalysisSessionV3;
  settlementEvidence?: MainWireFixedToneSettlementEvidenceV2;
  preloadEndDiastolic?: MainWireIntegratedModelFormalPreloadEndDiastolicV2;
  observation: MainWireIntegratedModelObservationV3;
  pair: StarlingPairV3;
}>;

type RejectedBranchV3 = Readonly<{
  status: "rejected";
  reason: string;
}>;

type MeasuredBranchV3 = AcceptedBranchV3 | RejectedBranchV3;

export type MainWireIntegratedModelResponsiveStarlingResultV3 = Readonly<{
  protocolId: typeof MAIN_WIRE_INTEGRATED_MODEL_RESPONSIVE_STARLING_PROTOCOL_V3_ID;
  /** Internal exact readback used to anchor the structural return curve. */
  anchorObservation: MainWireIntegratedModelObservationV3;
  right: MainWireIntegratedModelStarlingLocusV3;
  left: MainWireIntegratedModelStarlingLocusV3;
}>;

export type MainWireIntegratedModelFormalPressureVolumeResultV3 = Readonly<{
  protocolId: typeof MAIN_WIRE_INTEGRATED_MODEL_FORMAL_PRESSURE_VOLUME_PROTOCOL_V3_ID;
  anchorObservation: MainWireIntegratedModelObservationV3;
  right: MainWireIntegratedModelStarlingLocusV3;
  left: MainWireIntegratedModelStarlingLocusV3;
}>;

export type MainWireIntegratedModelFormalPreloadReserveDirectionalResponseV1 =
  Readonly<{
    endpointDirection: "hypovolemic" | "hypervolemic";
    baselineFillingPressureMmHg: number;
    endpointFillingPressureMmHg: number;
    directionalFillingPressureChangeMmHg: number;
    baselineCardiacOutputLPerMin: number;
    endpointCardiacOutputLPerMin: number;
    directionalCardiacOutputChangeLPerMin: number;
    directionalCardiacOutputChangeFraction01: number;
    cardiacOutputSlopeLPerMinPerMmHg: number;
    baselineEndDiastolicVolumeMl: number;
    endpointEndDiastolicVolumeMl: number;
    directionalEndDiastolicVolumeChangeMl: number;
    directionalEndDiastolicVolumeChangeFraction01: number;
    baselineEndDiastolicTransmuralPressureMmHg: number;
    endpointEndDiastolicTransmuralPressureMmHg: number;
    directionalEndDiastolicTransmuralPressureChangeMmHg: number;
    endDiastolicVolumeResponseMlPerMmHg: number;
  }>;

export type MainWireIntegratedModelFormalPreloadReserveSideV1 = Readonly<{
  hypovolemic: MainWireIntegratedModelFormalPreloadReserveDirectionalResponseV1;
  hypervolemic: MainWireIntegratedModelFormalPreloadReserveDirectionalResponseV1;
}>;

export type MainWireIntegratedModelFormalPreloadReserveQualificationV1 =
  Readonly<{
    qualificationId:
      typeof MAIN_WIRE_INTEGRATED_MODEL_FORMAL_PRELOAD_RESERVE_QUALIFICATION_V1_ID;
    protocolId:
      typeof MAIN_WIRE_INTEGRATED_MODEL_FORMAL_PRESSURE_VOLUME_PROTOCOL_V3_ID;
    status: "passed";
    sourceGlobalTbvMl: number;
    hypovolemicGlobalTbvMl: number;
    hypovolemicGlobalTbvScale:
      typeof MAIN_WIRE_INTEGRATED_MODEL_FORMAL_PRELOAD_RESERVE_POLICY_V1.hypovolemicGlobalTbvScale;
    hypervolemicGlobalTbvMl: number;
    hypervolemicGlobalTbvScale:
      typeof MAIN_WIRE_INTEGRATED_MODEL_FORMAL_PRELOAD_RESERVE_POLICY_V1.hypervolemicGlobalTbvScale;
    left: MainWireIntegratedModelFormalPreloadReserveSideV1;
    right: MainWireIntegratedModelFormalPreloadReserveSideV1;
  }>;

/** Settled responses, including sub-floor responses; not an admission claim. */
export type MainWireIntegratedModelFormalPreloadReserveMeasurementV1 = Omit<
  MainWireIntegratedModelFormalPreloadReserveQualificationV1,
  "qualificationId" | "status"
>;

/** Reservoir-settled reserve using the baseline's inlet-valve-closure ED definition. */
export type MainWireIntegratedModelFormalPreloadReserveMeasurementV2 = Omit<
  MainWireIntegratedModelFormalPreloadReserveMeasurementV1, "protocolId"
> & Readonly<{
  protocolId: typeof MAIN_WIRE_INTEGRATED_MODEL_FORMAL_PRELOAD_RESERVE_PROTOCOL_V2_ID;
  endDiastolicDefinition: "inlet-valve-closure";
  settlement: Readonly<Record<"center" | "hypovolemic" | "hypervolemic", MainWireFixedToneSettlementEvidenceV2>>;
}>;

export type MainWireIntegratedModelFormalPreloadReserveQualificationV2 =
  MainWireIntegratedModelFormalPreloadReserveMeasurementV2
  & Pick<MainWireIntegratedModelFormalPreloadReserveQualificationV1, "qualificationId" | "status">;

export type MainWireIntegratedModelFormalPreloadEndDiastolicV2 = Readonly<Record<
  "left" | "right", Readonly<{ volumeMl: number; pressureMmHg: number }>
>>;

/** Analysis readback only: do not relabel the exact model's maximum-volume landmarks. */
export function measureMainWireIntegratedModelFormalPreloadEndDiastolicV2(
  beat: Pick<MainWireIntegratedModelCompletedBeatMetricsV3,
    "startTimeSec" | "endTimeSec" | "leftVentricularValveEventMetrics" | "rightVentricularValveEventMetrics">,
): MainWireIntegratedModelFormalPreloadEndDiastolicV2 {
  if (!Number.isFinite(beat.startTimeSec) || !Number.isFinite(beat.endTimeSec)
    || !(beat.endTimeSec > beat.startTimeSec)) {
    throw new Error("formal preload-reserve V2 requires a complete beat clock");
  }
  const read = (side: "left" | "right") => {
    const metrics = side === "left" ? beat.leftVentricularValveEventMetrics
      : beat.rightVentricularValveEventMetrics;
    const valveId = side === "left" ? "MV" : "TV";
    const event = metrics?.endDiastolic;
    if (metrics?.pressureBasis !== "absolute-and-transmural"
      || metrics.inletValveId !== valveId || event == null
      || event.event !== "valve-closure-zero-flow-crossing" || event.valveId !== valveId
      || !Number.isFinite(event.volumeMl) || !(event.volumeMl > 0)
      || !Number.isFinite(event.transmuralPressureMmHg)
      || !Number.isFinite(event.timeSec)
      || event.timeSec < beat.startTimeSec || event.timeSec > beat.endTimeSec) {
      throw new Error(`formal preload-reserve V2 requires a finite ${valveId}-closure ED landmark`);
    }
    return Object.freeze({ volumeMl: event.volumeMl, pressureMmHg: event.transmuralPressureMmHg });
  };
  return Object.freeze({ left: read("left"), right: read("right") });
}

/**
 * Fast, ephemeral fixed-tone preload-response preview.
 *
 * One locally period-1-settled center is measured first in the same frozen-tone
 * responsive regime as its surrounding points. Each requested direction then
 * continues independently from that settled boundary and always warm-starts
 * from its previous reliable point. Studio requests the two directions in
 * parallel Workers; an undefined partition retains a complete sequential
 * execution for engine-level use. The source live session is never advanced
 * or modified. It is a fast preview; the PVA path instead requires every
 * retained load to pass the same complete-beat closure gate.
 */
export function runMainWireIntegratedModelResponsiveStarlingProtocolV3(
  sourceSession: MainWireIntegratedModelStructuralAnalysisSessionV3,
  onProgress?: (
    result: MainWireIntegratedModelResponsiveStarlingResultV3,
  ) => void,
  partition?: MainWireIntegratedModelResponsiveStarlingPartitionV3,
): MainWireIntegratedModelResponsiveStarlingResultV3 {
  const sourceGlobalTbvMl =
    sourceSession.currentAcceptedState().coronary.fixedGlobalTotalBloodVolumeMl;
  const paired: StarlingPairV3[] = [];
  let anchorObservation: MainWireIntegratedModelObservationV3 | null = null;
  const result = (
    protocolComplete = false,
  ): MainWireIntegratedModelResponsiveStarlingResultV3 =>
    Object.freeze({
      protocolId: MAIN_WIRE_INTEGRATED_MODEL_RESPONSIVE_STARLING_PROTOCOL_V3_ID,
      anchorObservation: requiredAnchorObservationV3(anchorObservation),
      right: responsiveLocusV3(
        paired.map(({ right }) => right),
        protocolComplete,
      ),
      left: responsiveLocusV3(
        paired.map(({ left }) => left),
        protocolComplete,
      ),
    });
  const append = (pair: StarlingPairV3) => {
    paired.push(pair);
    onProgress?.(result());
  };

  const center = measureBranchV3(sourceSession, sourceGlobalTbvMl, {
    role: "operating-anchor",
    maximumBeatCount: CENTER_MAXIMUM_COMPLETE_BEAT_COUNT_V3,
    requireLocalConvergence: true,
  });
  if (
    center.status === "rejected" ||
    !responsiveSettledAnchorPairV3(center.pair)
  ) {
    throw new Error(
      center.status === "rejected"
        ? `responsive Starling settled center rejected: ${center.reason}`
        : "responsive Starling center did not establish local period-1 closure",
    );
  }
  anchorObservation = center.observation;
  append(center.pair);
  if (!center.pair.left.curveEligible || !center.pair.right.curveEligible) {
    return result(true);
  }

  if (
    partition === undefined ||
    partition ===
      MAIN_WIRE_INTEGRATED_MODEL_RESPONSIVE_STARLING_HYPOVOLEMIC_PARTITION_V3
  )
    runHypovolemicChainV3(center.branch, sourceGlobalTbvMl, append);
  if (
    partition === undefined ||
    partition ===
      MAIN_WIRE_INTEGRATED_MODEL_RESPONSIVE_STARLING_HYPERVOLEMIC_PARTITION_V3
  )
    runHypervolemicChainV3(
      center.branch,
      center.pair,
      sourceGlobalTbvMl,
      append,
    );
  return result(true);
}

/**
 * Shared settled pressure-volume / Starling protocol.
 *
 * The live Scenario is never advanced. A persistent analysis Worker first
 * settles an isolated copy at the Scenario TBV with the active coronary
 * controller. It then freezes the controller state at that settled endpoint
 * and admits each load after three to sixteen complete beats satisfy the
 * declared flow/pressure/volume and ventricular landmark closure gates. The
 * number of beats is selected by measured period-1 closure rather than TBV
 * direction: any well-hot-started point may finish at three beats, while a
 * slowly converging point may use the sixteen-beat safety budget. The
 * low-volume bootstrap publishes progressive PVA previews while a second
 * persistent Worker runs the high-volume frontier from the same captured
 * Scenario source. Both frontiers adapt their next TBV step from retained
 * curve shape and settlement effort rather than spending a fixed point budget
 * uniformly.
 */
export async function runMainWireIntegratedModelFormalPressureVolumeProtocolV3(
  sourceSession: MainWireIntegratedModelStructuralAnalysisSessionV3,
  hemodynamicResearchInputs: MainWireIntegratedModelHemodynamicResearchInputsV3,
  onProgress?: (
    result: MainWireIntegratedModelFormalPressureVolumeResultV3,
  ) => void,
  partition?: MainWireIntegratedModelResponsiveStarlingPartitionV3,
): Promise<MainWireIntegratedModelFormalPressureVolumeResultV3> {
  const sourceGlobalTbvMl =
    sourceSession.currentAcceptedState().coronary.fixedGlobalTotalBloodVolumeMl;
  if (
    Math.abs(sourceGlobalTbvMl - hemodynamicResearchInputs.totalBloodVolumeMl) >
    FIXED_TBV_TOLERANCE_ML_V3
  ) {
    throw new Error("formal PVA source and Scenario TBV differ");
  }
  const paired: StarlingPairV3[] = [];
  let anchorObservation: MainWireIntegratedModelObservationV3 | null = null;
  const expectedPointCount = formalExpectedPointCountV3(partition);
  const result = (
    protocolComplete = false,
  ): MainWireIntegratedModelFormalPressureVolumeResultV3 =>
    Object.freeze({
      protocolId:
        MAIN_WIRE_INTEGRATED_MODEL_FORMAL_PRESSURE_VOLUME_PROTOCOL_V3_ID,
      anchorObservation: requiredAnchorObservationV3(anchorObservation),
      right: formalPressureVolumeLocusV3(
        paired.map(({ right }) => right),
        protocolComplete,
        expectedPointCount,
      ),
      left: formalPressureVolumeLocusV3(
        paired.map(({ left }) => left),
        protocolComplete,
        expectedPointCount,
      ),
    });
  const append = (pair: StarlingPairV3) => {
    paired.push(pair);
    onProgress?.(result());
  };
  const settledSource = settleFormalPressureVolumeSourceV3(
    sourceSession,
    sourceGlobalTbvMl,
  );
  if (settledSource.status === "rejected") {
    throw new Error(
      `formal pressure-volume source rejected: ${settledSource.reason}`,
    );
  }
  const center = await measureFormalPressureVolumeBranchV3(
    settledSource.branch,
    sourceGlobalTbvMl,
    "operating-anchor",
  );
  if (center.status === "rejected" || !formalPairQualifiedV3(center.pair)) {
    throw new Error(
      center.status === "rejected"
        ? `formal pressure-volume center rejected: ${center.reason}`
        : "formal pressure-volume center did not establish periodic closure",
    );
  }
  anchorObservation = center.observation;
  append(center.pair);

  if (
    partition === undefined ||
    partition ===
      MAIN_WIRE_INTEGRATED_MODEL_RESPONSIVE_STARLING_HYPERVOLEMIC_PARTITION_V3
  ) {
    await runFormalHypervolemicStarlingChainV3(
      center.branch,
      center.pair,
      sourceGlobalTbvMl,
      append,
    );
  }
  if (
    partition === undefined ||
    partition ===
      MAIN_WIRE_INTEGRATED_MODEL_RESPONSIVE_STARLING_HYPOVOLEMIC_PARTITION_V3
  ) {
    await runFormalHypovolemicCoverageChainV3(
      center.branch,
      center.pair,
      sourceGlobalTbvMl,
      append,
    );
  }
  return result(true);
}

/**
 * Focused release-time qualification of the operating point and symmetric
 * low-/high-preload endpoints. It reuses the formal fixed-tone protocol's
 * source settlement, complete-beat P1 closure, and hot-start continuation.
 */
export async function measureMainWireIntegratedModelFormalPreloadReserveV1(
  sourceSession: MainWireIntegratedModelStructuralAnalysisSessionV3,
  hemodynamicResearchInputs: MainWireIntegratedModelHemodynamicResearchInputsV3,
): Promise<MainWireIntegratedModelFormalPreloadReserveMeasurementV1> {
  const { settlement: _settlement, ...measurement } = await measureFormalPreloadReserve(
    sourceSession, hemodynamicResearchInputs, false,
  );
  return Object.freeze({ protocolId: MAIN_WIRE_INTEGRATED_MODEL_FORMAL_PRESSURE_VOLUME_PROTOCOL_V3_ID, ...measurement });
}

export async function measureMainWireIntegratedModelFormalPreloadReserveV2(
  sourceSession: MainWireIntegratedModelStructuralAnalysisSessionV3,
  hemodynamicResearchInputs: MainWireIntegratedModelHemodynamicResearchInputsV3,
): Promise<MainWireIntegratedModelFormalPreloadReserveMeasurementV2> {
  const measurement = await measureFormalPreloadReserve(sourceSession, hemodynamicResearchInputs, true);
  if (measurement.settlement === undefined) throw new Error("missing V2 reservoir settlement evidence");
  return Object.freeze({ ...measurement, settlement: measurement.settlement,
    endDiastolicDefinition: "inlet-valve-closure" as const,
    protocolId: MAIN_WIRE_INTEGRATED_MODEL_FORMAL_PRELOAD_RESERVE_PROTOCOL_V2_ID });
}

async function measureFormalPreloadReserve(
  sourceSession: MainWireIntegratedModelStructuralAnalysisSessionV3,
  hemodynamicResearchInputs: MainWireIntegratedModelHemodynamicResearchInputsV3,
  reservoirClosure: boolean,
) {
  const sourceGlobalTbvMl =
    sourceSession.currentAcceptedState().coronary.fixedGlobalTotalBloodVolumeMl;
  if (
    Math.abs(sourceGlobalTbvMl - hemodynamicResearchInputs.totalBloodVolumeMl) >
    FIXED_TBV_TOLERANCE_ML_V3
  ) {
    throw new Error("formal preload-reserve source and Scenario TBV differ");
  }
  const settledSource = settleFormalPressureVolumeSourceV3(
    sourceSession,
    sourceGlobalTbvMl,
    reservoirClosure,
  );
  if (settledSource.status === "rejected") {
    throw new Error(
      `formal preload-reserve source rejected: ${settledSource.reason}`,
    );
  }
  const center = await measureFormalPressureVolumeBranchV3(
    settledSource.branch,
    sourceGlobalTbvMl,
    "operating-anchor",
    reservoirClosure,
  );
  if (center.status === "rejected" || !formalPairQualifiedV3(center.pair)) {
    throw new Error(
      center.status === "rejected"
        ? `formal preload-reserve center rejected: ${center.reason}`
        : "formal preload-reserve center did not establish periodic closure",
    );
  }

  const policy = MAIN_WIRE_INTEGRATED_MODEL_FORMAL_PRELOAD_RESERVE_POLICY_V1;
  const initialBoundary = Object.freeze({
    branch: center.branch,
    scale: 1,
    pair: center.pair,
    ...(center.preloadEndDiastolic ? { preloadEndDiastolic: center.preloadEndDiastolic } : {}),
  });
  const hypovolemic = await formalPreloadReserveEndpointV1(
    initialBoundary,
    policy.hypovolemicGlobalTbvScale,
    sourceGlobalTbvMl,
    "hypovolemic",
    reservoirClosure,
  );
  const hypervolemic = await formalPreloadReserveEndpointV1(
    initialBoundary,
    policy.hypervolemicGlobalTbvScale,
    sourceGlobalTbvMl,
    "hypervolemic",
    reservoirClosure,
  );
  const left = Object.freeze({
    hypovolemic: formalPreloadReserveDirectionalResponseV1(
      center.pair.left,
      hypovolemic.pair.left,
      "hypovolemic",
      preloadEndDiastolicOverrideV2(center, hypovolemic, "left", reservoirClosure),
    ),
    hypervolemic: formalPreloadReserveDirectionalResponseV1(
      center.pair.left,
      hypervolemic.pair.left,
      "hypervolemic",
      preloadEndDiastolicOverrideV2(center, hypervolemic, "left", reservoirClosure),
    ),
  });
  const right = Object.freeze({
    hypovolemic: formalPreloadReserveDirectionalResponseV1(
      center.pair.right,
      hypovolemic.pair.right,
      "hypovolemic",
      preloadEndDiastolicOverrideV2(center, hypovolemic, "right", reservoirClosure),
    ),
    hypervolemic: formalPreloadReserveDirectionalResponseV1(
      center.pair.right,
      hypervolemic.pair.right,
      "hypervolemic",
      preloadEndDiastolicOverrideV2(center, hypervolemic, "right", reservoirClosure),
    ),
  });

  return Object.freeze({
    sourceGlobalTbvMl,
    hypovolemicGlobalTbvMl: sourceGlobalTbvMl * policy.hypovolemicGlobalTbvScale,
    hypovolemicGlobalTbvScale: policy.hypovolemicGlobalTbvScale,
    hypervolemicGlobalTbvMl: sourceGlobalTbvMl * policy.hypervolemicGlobalTbvScale,
    hypervolemicGlobalTbvScale: policy.hypervolemicGlobalTbvScale,
    left,
    right,
    settlement: reservoirClosure && center.settlementEvidence && hypovolemic.settlementEvidence && hypervolemic.settlementEvidence
      ? { center: center.settlementEvidence, hypovolemic: hypovolemic.settlementEvidence,
        hypervolemic: hypervolemic.settlementEvidence } : undefined,
  });
}

export async function qualifyMainWireIntegratedModelFormalPreloadReserveV1(
  sourceSession: MainWireIntegratedModelStructuralAnalysisSessionV3,
  hemodynamicResearchInputs: MainWireIntegratedModelHemodynamicResearchInputsV3,
): Promise<MainWireIntegratedModelFormalPreloadReserveQualificationV1> {
  return qualifyMainWireIntegratedModelFormalPreloadReserveMeasurementV1(
    await measureMainWireIntegratedModelFormalPreloadReserveV1(
      sourceSession, hemodynamicResearchInputs,
    ),
  );
}

export async function qualifyMainWireIntegratedModelFormalPreloadReserveV2(
  sourceSession: MainWireIntegratedModelStructuralAnalysisSessionV3,
  hemodynamicResearchInputs: MainWireIntegratedModelHemodynamicResearchInputsV3,
): Promise<MainWireIntegratedModelFormalPreloadReserveQualificationV2> {
  return qualifyMainWireIntegratedModelFormalPreloadReserveMeasurementV1(
    await measureMainWireIntegratedModelFormalPreloadReserveV2(
      sourceSession, hemodynamicResearchInputs,
    ),
  );
}

export function qualifyMainWireIntegratedModelFormalPreloadReserveMeasurementV1<T extends
  MainWireIntegratedModelFormalPreloadReserveMeasurementV1 | MainWireIntegratedModelFormalPreloadReserveMeasurementV2>(
  measurement: T,
): T & Pick<MainWireIntegratedModelFormalPreloadReserveQualificationV1, "qualificationId" | "status"> {
  const { left, right } = measurement;
  const failed = (["left", "right"] as const).flatMap((side) =>
    (["hypovolemic", "hypervolemic"] as const).flatMap((direction) => {
      const measured = (side === "left" ? left : right)[direction];
      return mainWireIntegratedModelFormalPreloadReserveDirectionalResponsePassedV1(
        measured,
      )
        ? []
        : [{ side, direction, measured }];
    })
  );
  if (failed.length > 0) {
    throw new Error(
      "formal preload-reserve gate rejected: " + failed.map((failure) => {
        const measured = failure.measured;
        return `${failure.side}/${failure.direction} `
          + `dCO=${measured.directionalCardiacOutputChangeLPerMin} L/min, `
          + `dCO/CO=${measured.directionalCardiacOutputChangeFraction01}, `
          + `dPfill=${measured.directionalFillingPressureChangeMmHg} mmHg, `
          + `dEDV=${measured.directionalEndDiastolicVolumeChangeMl} mL, `
          + `dEDV/EDV=${measured.directionalEndDiastolicVolumeChangeFraction01}, `
          + `dPtmED=${measured.directionalEndDiastolicTransmuralPressureChangeMmHg} mmHg, `
          + `CO/Pfill=${measured.cardiacOutputSlopeLPerMinPerMmHg} L/min/mmHg`;
      }).join("; "),
    );
  }

  const qualified = Object.assign({}, measurement, {
    qualificationId:
      MAIN_WIRE_INTEGRATED_MODEL_FORMAL_PRELOAD_RESERVE_QUALIFICATION_V1_ID,
    status: "passed" as const,
  });
  Object.freeze(qualified);
  return qualified;
}

async function formalPreloadReserveEndpointV1(
  initialBoundary: FormalCoverageBoundaryV3,
  requestedScale: number,
  sourceGlobalTbvMl: number,
  endpointDirection: "hypovolemic" | "hypervolemic",
  reservoirClosure = false,
): Promise<FormalCoverageBoundaryV3> {
  let retained: FormalCoverageBoundaryV3 | null = null;
  const advanced = await advanceFormalCoverageTowardScaleV3(
    initialBoundary,
    requestedScale,
    sourceGlobalTbvMl,
    (boundary) => {
      retained = boundary;
    },
    undefined,
    reservoirClosure,
  );
  const endpoint = retained as FormalCoverageBoundaryV3 | null;
  if (
    advanced.status !== "reached"
    || endpoint === null
    || Math.abs(endpoint.scale - requestedScale) > 1e-12
    || !formalPairQualifiedV3(endpoint.pair)
  ) {
    throw new Error(
      `formal preload-reserve ${endpointDirection} endpoint did not establish periodic closure`
        + (advanced.reason === null ? "" : `: ${advanced.reason}`),
    );
  }
  return endpoint;
}

type PreloadEndDiastolicOverrideV2 = Readonly<{
  baseline: MainWireIntegratedModelFormalPreloadEndDiastolicV2["left"];
  endpoint: MainWireIntegratedModelFormalPreloadEndDiastolicV2["left"];
}>;

function preloadEndDiastolicOverrideV2(
  baseline: Pick<AcceptedBranchV3, "preloadEndDiastolic">,
  endpoint: Pick<FormalCoverageBoundaryV3, "preloadEndDiastolic">,
  side: "left" | "right",
  required: boolean,
): PreloadEndDiastolicOverrideV2 | undefined {
  if (!required) return undefined;
  if (!baseline.preloadEndDiastolic || !endpoint.preloadEndDiastolic) {
    throw new Error("formal preload-reserve V2 lost its inlet-closure ED readback");
  }
  return { baseline: baseline.preloadEndDiastolic[side], endpoint: endpoint.preloadEndDiastolic[side] };
}

function formalPreloadReserveDirectionalResponseV1(
  baseline: MainWireIntegratedModelStarlingPointV3,
  endpoint: MainWireIntegratedModelStarlingPointV3,
  endpointDirection: "hypovolemic" | "hypervolemic",
  endDiastolic?: PreloadEndDiastolicOverrideV2,
): MainWireIntegratedModelFormalPreloadReserveDirectionalResponseV1 {
  const sign = endpointDirection === "hypervolemic" ? 1 : -1;
  const directionalFillingPressureChangeMmHg = sign *
    (endpoint.fillingPressureMmHg - baseline.fillingPressureMmHg);
  const directionalCardiacOutputChangeLPerMin = sign *
    (endpoint.cardiacOutputLPerMin - baseline.cardiacOutputLPerMin);
  const baselineEndDiastolic =
    endDiastolic?.baseline ?? baseline.ventricularPressureVolumeLandmarks.endDiastolic;
  const endpointEndDiastolic =
    endDiastolic?.endpoint ?? endpoint.ventricularPressureVolumeLandmarks.endDiastolic;
  const directionalEndDiastolicVolumeChangeMl = sign *
    (endpointEndDiastolic.volumeMl - baselineEndDiastolic.volumeMl);
  const directionalEndDiastolicTransmuralPressureChangeMmHg = sign *
    (endpointEndDiastolic.pressureMmHg - baselineEndDiastolic.pressureMmHg);
  return Object.freeze({
    endpointDirection,
    baselineFillingPressureMmHg: baseline.fillingPressureMmHg,
    endpointFillingPressureMmHg: endpoint.fillingPressureMmHg,
    directionalFillingPressureChangeMmHg,
    baselineCardiacOutputLPerMin: baseline.cardiacOutputLPerMin,
    endpointCardiacOutputLPerMin: endpoint.cardiacOutputLPerMin,
    directionalCardiacOutputChangeLPerMin,
    directionalCardiacOutputChangeFraction01:
      directionalCardiacOutputChangeLPerMin
      / baseline.cardiacOutputLPerMin,
    cardiacOutputSlopeLPerMinPerMmHg:
      directionalCardiacOutputChangeLPerMin
      / directionalFillingPressureChangeMmHg,
    baselineEndDiastolicVolumeMl: baselineEndDiastolic.volumeMl,
    endpointEndDiastolicVolumeMl: endpointEndDiastolic.volumeMl,
    directionalEndDiastolicVolumeChangeMl,
    directionalEndDiastolicVolumeChangeFraction01:
      directionalEndDiastolicVolumeChangeMl / baselineEndDiastolic.volumeMl,
    baselineEndDiastolicTransmuralPressureMmHg:
      baselineEndDiastolic.pressureMmHg,
    endpointEndDiastolicTransmuralPressureMmHg:
      endpointEndDiastolic.pressureMmHg,
    directionalEndDiastolicTransmuralPressureChangeMmHg,
    endDiastolicVolumeResponseMlPerMmHg:
      directionalEndDiastolicVolumeChangeMl
      / directionalEndDiastolicTransmuralPressureChangeMmHg,
  });
}

export function mainWireIntegratedModelFormalPreloadReserveDirectionalResponsePassedV1(
  measured: MainWireIntegratedModelFormalPreloadReserveDirectionalResponseV1,
): boolean {
  const policy = MAIN_WIRE_INTEGRATED_MODEL_FORMAL_PRELOAD_RESERVE_POLICY_V1;
  return measured.directionalFillingPressureChangeMmHg >=
      policy.minimumDirectionalFillingPressureChangeMmHg
    && measured.directionalCardiacOutputChangeLPerMin >=
      policy.minimumDirectionalCardiacOutputChangeLPerMin
    && measured.directionalCardiacOutputChangeFraction01 >=
      policy.minimumDirectionalCardiacOutputChangeFraction01
    && measured.cardiacOutputSlopeLPerMinPerMmHg >=
      policy.minimumCardiacOutputSlopeLPerMinPerMmHg
    && measured.directionalEndDiastolicVolumeChangeMl >=
      policy.minimumDirectionalEndDiastolicVolumeChangeMl
    && measured.directionalEndDiastolicVolumeChangeFraction01 >=
      policy.minimumDirectionalEndDiastolicVolumeChangeFraction01
    && measured.directionalEndDiastolicTransmuralPressureChangeMmHg >=
      policy.minimumDirectionalEndDiastolicTransmuralPressureChangeMmHg
    && measured.endDiastolicVolumeResponseMlPerMmHg > 0;
}

function formalExpectedPointCountV3(
  partition: MainWireIntegratedModelResponsiveStarlingPartitionV3 | undefined,
): number {
  if (
    partition ===
    MAIN_WIRE_INTEGRATED_MODEL_RESPONSIVE_STARLING_HYPOVOLEMIC_PARTITION_V3
  ) {
    return 1 + FORMAL_PVA_REQUIRED_LOWER_POINT_COUNT_V3;
  }
  if (
    partition ===
    MAIN_WIRE_INTEGRATED_MODEL_RESPONSIVE_STARLING_HYPERVOLEMIC_PARTITION_V3
  ) {
    return 2;
  }
  return MAIN_WIRE_INTEGRATED_MODEL_FORMAL_PVA_MINIMUM_POINT_COUNT_V3;
}

/**
 * Establishes the analysis source before any slow state is frozen.
 *
 * Workbench may request an analysis soon after the first accepted frame. The
 * request clock is therefore provenance, not evidence that the Scenario is
 * already periodic. This isolated active-controller branch closes that gap;
 * the subsequent fixed-tone family always starts from its period-1 endpoint.
 */
function settleFormalPressureVolumeSourceV3(
  sourceSession: MainWireIntegratedModelStructuralAnalysisSessionV3,
  sourceGlobalTbvMl: number,
  reservoirClosure = false,
):
  | Readonly<{
      status: "settled";
      branch: MainWireIntegratedModelStructuralAnalysisSessionV3;
    }>
  | RejectedBranchV3 {
  reservoirClosure ||= sourceSession.requireReservoirClosureV1 === true;
  let branch: MainWireIntegratedModelStructuralAnalysisSessionV3;
  try {
    branch = sourceSession.forkAtFixedGlobalTotalBloodVolume(sourceGlobalTbvMl);
  } catch (error) {
    return rejectedV3(error);
  }
  const originTimeSec = branch.currentAcceptedState().acceptedTimeSec;
  const beats: MainWireIntegratedModelCompletedBeatMetricsV3[] = [];
  const volumeClosure = reservoirClosure ? new MainWireFixedToneVolumeClosureV2() : null;
  const landmarkClosureScore = reservoirClosure
    ? mainWireIntegratedModelFormalPreloadLandmarkClosureScoreV2
    : formalBeatPairClosureScoreV3;
  if (volumeClosure) recordFixedToneReservoirVolumesV2(volumeClosure, branch.observe());
  const maximumDurationSec = reservoirClosure ? MAIN_WIRE_FIXED_TONE_SETTLEMENT_V2.maximumMeasurementDurationSec
    : MAXIMUM_MEASUREMENT_DURATION_SEC_V3;
  let lastCompletedBeatId: string | null =
    branch.observe().completedBeatMetrics?.endAtrialCaptureId ?? null;
  for (
    let ordinal = 1;
    ordinal <= (reservoirClosure ? maximumDurationSec / FORMAL_PROTOCOL_SAMPLE_DT_SEC_V3
      : MAXIMUM_FORMAL_PRESENTATION_ADVANCES_PER_POINT_V3);
    ordinal += 1
  ) {
    const acceptedTimeSec = branch.currentAcceptedState().acceptedTimeSec;
    if (acceptedTimeSec - originTimeSec >= maximumDurationSec)
      break;
    const attemptedAdvance = attemptStructuralAnalysisAdvanceV3(
      branch,
      acceptedTimeSec + FORMAL_PROTOCOL_SAMPLE_DT_SEC_V3,
    );
    if (attemptedAdvance.status === "rejected") return attemptedAdvance;
    const advance = attemptedAdvance.advance;
    if (volumeClosure) recordFixedToneReservoirVolumesV2(volumeClosure, advance.observation);
    const acceptedTbvMl =
      advance.observation.acceptedState.coronary.fixedGlobalTotalBloodVolumeMl;
    if (
      Math.abs(acceptedTbvMl - sourceGlobalTbvMl) > FIXED_TBV_TOLERANCE_ML_V3
    ) {
      return rejectedV3(
        "global TBV changed during active-controller source settlement",
      );
    }
    const completed = advance.observation.completedBeatMetrics;
    if (
      completed === null ||
      completed.endAtrialCaptureId === lastCompletedBeatId
    ) {
      continue;
    }
    lastCompletedBeatId = completed.endAtrialCaptureId;
    beats.push(completed);
    if (
      beats.length >= MINIMUM_COMPLETE_BEAT_COUNT_V3 &&
      period1ConvergedV3(beats, landmarkClosureScore)
      && (!volumeClosure || (volumeClosure.converged()
        && fixedToneRecentOutputScoreV2(beats) <= MAIN_WIRE_FIXED_TONE_SETTLEMENT_V2.maximumNormalizedOutputDelta
        && fixedToneRecentOutputScoreV2(beats, landmarkClosureScore)
          <= MAIN_WIRE_FIXED_TONE_SETTLEMENT_V2.maximumNormalizedLandmarkDelta))
    ) {
      return Object.freeze({ status: "settled" as const, branch });
    }
    if (
      beats.length >= 5 &&
      period2DetectedV3(beats, landmarkClosureScore)
    ) {
      return rejectedV3("active-controller source reached a period-2 boundary");
    }
    if (beats.length >= (reservoirClosure ? MAIN_WIRE_FIXED_TONE_SETTLEMENT_V2.maximumCompleteBeatCount
      : FORMAL_SOURCE_MAXIMUM_COMPLETE_BEAT_COUNT_V3)) break;
  }
  return rejectedV3(
    "active-controller source did not establish complete-beat period-1 closure"
      + (volumeClosure ? ` (beats=${beats.length}, redistributedVolumeMl=${volumeClosure.maximumRecentRedistributedVolumeMl()}, outputScore=${fixedToneRecentOutputScoreV2(beats)})` : ""),
  );
}

type FormalCoverageDirectionV3 = "hypovolemic" | "hypervolemic";

type FormalCoverageSampleV3 = Readonly<{
  scale: number;
  pair: StarlingPairV3;
}>;

type FormalCoverageBoundaryV3 = Readonly<{
  branch: MainWireIntegratedModelStructuralAnalysisSessionV3;
  scale: number;
  pair: StarlingPairV3;
  settlementEvidence?: MainWireFixedToneSettlementEvidenceV2;
  preloadEndDiastolic?: MainWireIntegratedModelFormalPreloadEndDiastolicV2;
}>;

type FormalCoverageAdvanceV3 = Readonly<{
  status: "reached" | "stopped" | "boundary";
  boundary: FormalCoverageBoundaryV3;
  reason: string | null;
}>;

type FormalCoverageCursorV3 = Pick<FormalCoverageBoundaryV3, "branch" | "scale">;

async function runFormalHypovolemicCoverageChainV3(
  centerBranch: MainWireIntegratedModelStructuralAnalysisSessionV3,
  centerPair: StarlingPairV3,
  sourceGlobalTbvMl: number,
  append: (pair: StarlingPairV3) => void,
): Promise<void> {
  const samples: FormalCoverageSampleV3[] = [
    Object.freeze({ scale: 1, pair: centerPair }),
  ];
  let boundary: FormalCoverageBoundaryV3 = Object.freeze({
    branch: centerBranch,
    scale: 1,
    pair: centerPair,
  });
  const accept = (nextBoundary: FormalCoverageBoundaryV3): void => {
    samples.push(
      Object.freeze({ scale: nextBoundary.scale, pair: nextBoundary.pair }),
    );
    append(nextBoundary.pair);
  };

  // Three evenly spaced lower-preload points establish the first admissible
  // PVA family without waiting for a dense nine-point grid. Already-low
  // Scenarios retain the normal-adult absolute floor.
  const coreMinimumScale =
    mainWireIntegratedModelFormalPvaMinimumGlobalTbvMlV3(sourceGlobalTbvMl) /
    sourceGlobalTbvMl;
  for (
    let ordinal = 1;
    ordinal <= FORMAL_PVA_REQUIRED_LOWER_POINT_COUNT_V3;
    ordinal += 1
  ) {
    const requestedScale =
      1 -
      ((1 - coreMinimumScale) * ordinal) /
        FORMAL_PVA_REQUIRED_LOWER_POINT_COUNT_V3;
    const advanced = await advanceFormalCoverageTowardScaleV3(
      boundary,
      requestedScale,
      sourceGlobalTbvMl,
      accept,
    );
    boundary = advanced.boundary;
    if (advanced.status !== "reached") {
      throw new Error(
        `formal PVA bootstrap below scale ${boundary.scale} rejected: ${advanced.reason ?? "numerical boundary"}`,
      );
    }
  }

  if (starlingPairReachedLowFlowTargetV3(boundary.pair)) return;
  let goalScale = Math.max(MAIN_WIRE_INTEGRATED_MODEL_FORMAL_STARLING_MINIMUM_TBV_SCALE_V3,
    boundary.scale - mainWireIntegratedModelFormalLowCoverageScaleStepV3(samples));
  let requestedScale = goalScale;
  let qualifiedEndpointCount = samples.length;
  let boundaryRetries = 0;
  const continuations: FormalCoverageCursorV3[] = [];
  while (
    boundary.scale >
      MAIN_WIRE_INTEGRATED_MODEL_FORMAL_STARLING_MINIMUM_TBV_SCALE_V3 + 1e-12 &&
    qualifiedEndpointCount < FORMAL_MAXIMUM_RETAINED_POINTS_PER_DIRECTION_V3
  ) {
    const priorScale = boundary.scale;
    const advanced = await advanceFormalCoverageTowardScaleV3(
      boundary,
      requestedScale,
      sourceGlobalTbvMl,
      () => undefined,
      (pair) => starlingPairReachedLowFlowTargetV3(pair),
      false,
      boundaryRetries > 0 ? FORMAL_LOW_REFINEMENT_MAXIMUM_ATTEMPTS_V3 : MAXIMUM_FORMAL_HOT_START_ATTEMPTS_PER_POINT_V3,
      {
        // Never reuse an overshooting branch: low-load continuation remains
        // directional. Same-load holds replace the older state at that load.
        continuation: continuations.filter((cursor) => cursor.scale >= requestedScale
          && cursor.scale <= boundary.scale).at(-1),
        retainContinuation: (cursor) => {
          const existing = continuations.findIndex((point) => point.scale === cursor.scale);
          if (existing >= 0) continuations[existing] = cursor;
          else continuations.push(cursor);
          continuations.sort((a, b) => b.scale - a.scale);
        },
      },
    );
    boundary = advanced.boundary;
    if (advanced.status === "boundary") {
      // A failed transition is not proof of a physical low-load boundary.
      // Back off, then resume from the newly settled state if a shorter step
      // succeeds, instead of stopping immediately after boundary refinement.
      if (boundaryRetries >= FORMAL_LOW_BOUNDARY_REFINEMENT_COUNT_V3) break;
      boundaryRetries += 1;
      const smallerStep = (boundary.scale - requestedScale) / 2;
      if (smallerStep < FORMAL_PVA_MINIMUM_SCALE_STEP_V3) break;
      requestedScale = boundary.scale - smallerStep;
      continue;
    }
    if (!(boundary.scale < priorScale - 1e-12)) break;
    qualifiedEndpointCount += 1;
    boundaryRetries = 0;
    continuations.length = 0;
    const reachedGoal = boundary.scale <= goalScale + 1e-12;
    const informative = formalLowInformationChangeV3(samples.at(-1)!.pair, boundary.pair) >= 0.75;
    if (reachedGoal || informative || advanced.status === "stopped") {
      accept(boundary);
      goalScale = Math.max(MAIN_WIRE_INTEGRATED_MODEL_FORMAL_STARLING_MINIMUM_TBV_SCALE_V3,
        boundary.scale - mainWireIntegratedModelFormalLowCoverageScaleStepV3(samples));
    }
    // An uninformative backoff endpoint is a numerical staging checkpoint,
    // not another requested measurement. Resume the original information goal.
    requestedScale = goalScale;
    if (advanced.status !== "reached") break;
  }
  // Preserve the furthest qualified observation at a genuine/budget boundary,
  // even if it added little new range. Never invent an unqualified endpoint.
  if (boundary.scale < samples.at(-1)!.scale - 1e-12) accept(boundary);
}

// Sampling resolution, not normal ranges or convergence tolerances.
const FORMAL_LOW_INFORMATION_RESOLUTION_V3 = [1, 0.75, 10, 15, 15, 3, 1, 0.75, 10, 15, 15, 3] as const;

function formalLowInformationChangeV3(before: StarlingPairV3, after: StarlingPairV3): number {
  const a = formalCoverageShapeVectorV3(before), b = formalCoverageShapeVectorV3(after);
  return Math.max(...b.map((value, i) => Math.abs(value - a[i]!) / FORMAL_LOW_INFORMATION_RESOLUTION_V3[i]!));
}

/** Proposes the next measurement spacing from qualified load responses.
 * Numerical staging checkpoints must not enter this sampling history. */
export function mainWireIntegratedModelFormalLowCoverageScaleStepV3(samples: readonly FormalCoverageSampleV3[]): number {
  if (samples.length < 2) return FORMAL_LOW_EXTENSION_INITIAL_SCALE_STEP_V3;
  const previous = samples.at(-2)!, current = samples.at(-1)!;
  // Display resolution, not physiological admissibility bounds. Either
  // ventricle and any of Starling / systolic / diastolic support can earn a point.
  const change = formalLowInformationChangeV3(previous.pair, current.pair);
  const previousStep = Math.abs(current.scale - previous.scale);
  let step = change > 1e-9 ? previousStep / change : FORMAL_LOW_MAXIMUM_SCALE_STEP_V3;
  const flow = (pair: StarlingPairV3) => Math.max(pair.left.cardiacOutputLPerMin, pair.right.cardiacOutputLPerMin);
  const flowDrop = flow(previous.pair) - flow(current.pair);
  if (flowDrop > 0) {
    // Aim just below the existing low-flow stopping target, rather than
    // spending compute on an unnecessarily deep near-zero-output endpoint.
    const remaining = flow(current.pair) - 0.9 * MAIN_WIRE_INTEGRATED_MODEL_RESPONSIVE_STARLING_LOW_FLOW_TARGET_L_PER_MIN_V3;
    if (remaining > 0) step = Math.min(step, previousStep * remaining / flowDrop);
  }
  const curvature = formalCoverageChordErrorV3(samples);
  return Math.max(FORMAL_LOW_MINIMUM_INFORMATION_SCALE_STEP_V3, Math.min(FORMAL_LOW_EXTENSION_INITIAL_SCALE_STEP_V3,
    step * (curvature !== null && curvature >= FORMAL_CURVED_CHORD_ERROR_V3 ? 0.8 : 1)));
}

function adaptiveFormalCoverageScaleStepV3(
  direction: FormalCoverageDirectionV3,
  acceptedScaleStep: number,
  samples: readonly FormalCoverageSampleV3[],
): number {
  const pair = samples.at(-1)!.pair;
  const completedBeatCount = Math.max(
    pair.left.completedBeatCount,
    pair.right.completedBeatCount,
  );
  const closureScore = Math.max(
    pair.left.maximumNormalizedBeatDelta,
    pair.right.maximumNormalizedBeatDelta,
  );
  const easySettlement = completedBeatCount <= 5 && closureScore <= 0.6;
  const difficultSettlement = completedBeatCount >= 10 || closureScore > 0.9;
  const chordError = formalCoverageChordErrorV3(samples);
  let multiplier =
    chordError === null
      ? easySettlement
        ? 1.2
        : 1
      : chordError <= FORMAL_SMOOTH_CHORD_ERROR_V3
        ? easySettlement
          ? 1.35
          : 1.15
        : chordError >= FORMAL_CURVED_CHORD_ERROR_V3
          ? FORMAL_CURVED_SCALE_STEP_MULTIPLIER_V3
          : 1;
  // Settlement cost controls how quickly the frontier may widen, but does not
  // by itself spend more displayed points in a smooth region. Internal
  // one-beat bridges handle a numerically large jump; actual curvature is what
  // earns a smaller retained interval.
  if (difficultSettlement) multiplier = Math.min(multiplier, 1);
  const highEsvGainMl =
    direction === "hypervolemic"
      ? formalCoverageMinimumEndSystolicVolumeGainV3(samples)
      : null;
  if (
    highEsvGainMl !== null &&
    highEsvGainMl < FORMAL_HIGH_ESV_SATURATION_GAIN_ML_V3
  ) {
    // At high preload, TBV may keep moving while end-systolic volume has nearly
    // saturated. Do not spend retained ESPVR points inside that compressed
    // volume band. Widen the next requested endpoint; hidden one-beat bridges
    // still preserve the numerical hot-start path.
    multiplier = Math.max(
      multiplier,
      FORMAL_HIGH_ESV_SATURATION_STEP_MULTIPLIER_V3,
    );
  }
  const maximumScaleStep =
    direction === "hypovolemic"
      ? FORMAL_LOW_MAXIMUM_SCALE_STEP_V3
      : FORMAL_HIGH_MAXIMUM_SCALE_STEP_V3;
  return Math.min(
    maximumScaleStep,
    Math.max(FORMAL_PVA_MINIMUM_SCALE_STEP_V3, acceptedScaleStep * multiplier),
  );
}

async function runFormalHypervolemicStarlingChainV3(
  centerBranch: MainWireIntegratedModelStructuralAnalysisSessionV3,
  centerPair: StarlingPairV3,
  sourceGlobalTbvMl: number,
  append: (pair: StarlingPairV3) => void,
): Promise<void> {
  const samples: FormalCoverageSampleV3[] = [
    Object.freeze({ scale: 1, pair: centerPair }),
  ];
  let boundary: FormalCoverageBoundaryV3 = Object.freeze({
    branch: centerBranch,
    scale: 1,
    pair: centerPair,
  });
  const accept = (nextBoundary: FormalCoverageBoundaryV3): void => {
    samples.push(
      Object.freeze({ scale: nextBoundary.scale, pair: nextBoundary.pair }),
    );
    append(nextBoundary.pair);
  };
  // Establish measured high-side support before the broader frontier. A
  // nearby settled point also gives the first +12% target a better hot start
  // than an unreported one-beat bridge; all closure gates remain identical.
  const preview = await advanceFormalCoverageTowardScaleV3(
    boundary,
    1 + FORMAL_HIGH_PREVIEW_SCALE_STEP_V3,
    sourceGlobalTbvMl,
    accept,
  );
  if (preview.status !== "reached") return;
  boundary = preview.boundary;
  let desiredScaleStep = FORMAL_HIGH_INITIAL_SCALE_STEP_V3;
  while (
    boundary.scale <
      MAIN_WIRE_INTEGRATED_MODEL_FORMAL_STARLING_MAXIMUM_TBV_SCALE_V3 - 1e-12 &&
    samples.length < FORMAL_MAXIMUM_RETAINED_POINTS_PER_DIRECTION_V3
  ) {
    const priorScale = boundary.scale;
    const remainingCoverageScale =
      MAIN_WIRE_INTEGRATED_MODEL_FORMAL_STARLING_MAXIMUM_TBV_SCALE_V3 -
      boundary.scale;
    if (
      remainingCoverageScale <
      Math.max(FORMAL_MINIMUM_TERMINAL_COVERAGE_STEP_V3, 0.5 * desiredScaleStep)
    ) {
      return;
    }
    const requestedScale = Math.min(
      MAIN_WIRE_INTEGRATED_MODEL_FORMAL_STARLING_MAXIMUM_TBV_SCALE_V3,
      samples.length === 2
        ? 1 + FORMAL_HIGH_INITIAL_SCALE_STEP_V3
        : boundary.scale + desiredScaleStep,
    );
    const advanced = await advanceFormalCoverageTowardScaleV3(
      boundary,
      requestedScale,
      sourceGlobalTbvMl,
      accept,
    );
    boundary = advanced.boundary;
    if (!(boundary.scale > priorScale + 1e-12)) {
      return;
    }
    desiredScaleStep = adaptiveFormalCoverageScaleStepV3(
      "hypervolemic",
      // The nearby preview must not halve the broad frontier's starting
      // resolution after the preserved +12% core point.
      samples.length === 3
        ? FORMAL_HIGH_INITIAL_SCALE_STEP_V3
        : recentAcceptedScaleStepV3(samples),
      samples,
    );
    if (advanced.status !== "reached") {
      return;
    }
  }
}

/**
 * Advances one persistent directional frontier. Large numerical jumps use
 * short, unreported one-beat hot-start bridges, while only the requested
 * complete-beat P1 endpoint is retained as curve evidence. This separates the
 * numerical homotopy resolution from the scientific/display sampling density.
 */
async function advanceFormalCoverageTowardScaleV3(
  initialBoundary: FormalCoverageBoundaryV3,
  requestedScale: number,
  sourceGlobalTbvMl: number,
  accept: (boundary: FormalCoverageBoundaryV3) => void,
  stopAfterAccepted: (pair: StarlingPairV3) => boolean = () => false,
  reservoirClosure = false,
  maximumAttempts = MAXIMUM_FORMAL_HOT_START_ATTEMPTS_PER_POINT_V3,
  lowCoverage?: Readonly<{
    continuation: FormalCoverageCursorV3 | undefined;
    retainContinuation: (cursor: FormalCoverageCursorV3) => void;
  }>,
): Promise<FormalCoverageAdvanceV3> {
  const boundary = initialBoundary;
  let continuationBranch = lowCoverage?.continuation?.branch ?? initialBoundary.branch;
  let continuationScale = lowCoverage?.continuation?.scale ?? initialBoundary.scale;
  let bridgeMaximumScaleStep = lowCoverage ? FORMAL_LOW_HOT_START_BRIDGE_MAXIMUM_SCALE_STEP_V3
    : FORMAL_HOT_START_BRIDGE_MAXIMUM_SCALE_STEP_V3;
  const heldScales = new Set<number>();
  const holdContinuation = async (): Promise<boolean> => {
    if (!lowCoverage || heldScales.has(continuationScale)) return false;
    heldScales.add(continuationScale);
    const held = await advanceFormalHotStartBridgeV3(continuationBranch, sourceGlobalTbvMl * continuationScale);
    if (held.status !== "accepted") return false;
    continuationBranch = held.branch;
    lowCoverage.retainContinuation({ branch: continuationBranch, scale: continuationScale });
    return true;
  };
  let forceBridgeBeforeTarget = false;
  let lastRejectedReason = "formal coverage target was not attempted";
  for (
    let attempt = 0;
    attempt < maximumAttempts;
    attempt += 1
  ) {
    const remainingScale = requestedScale - continuationScale;
    const minimumScaleStep = Math.max(
      FORMAL_PVA_MINIMUM_SCALE_STEP_V3,
      MINIMUM_FORMAL_TBV_BRACKET_ML_V3 / sourceGlobalTbvMl,
    );
    // A resumed internal cursor can already be at the new requested load,
    // but it is not a qualified measurement until the ordinary P1 gate passes.
    if (Math.abs(remainingScale) <= 1e-12 && !lowCoverage) break;
    if (
      forceBridgeBeforeTarget ||
      Math.abs(remainingScale) > bridgeMaximumScaleStep + 1e-12
    ) {
      const bridgeScaleStep = forceBridgeBeforeTarget
        ? Math.min(0.5 * Math.abs(remainingScale), lowCoverage ? bridgeMaximumScaleStep : Infinity)
        : Math.min(Math.abs(remainingScale), bridgeMaximumScaleStep);
      const bridgeScale =
        continuationScale + Math.sign(remainingScale) * bridgeScaleStep;
      const bridged = await advanceFormalHotStartBridgeV3(
        continuationBranch,
        sourceGlobalTbvMl * bridgeScale,
      );
      if (bridged.status === "accepted") {
        continuationBranch = bridged.branch;
        continuationScale = bridgeScale;
        lowCoverage?.retainContinuation({ branch: continuationBranch, scale: continuationScale });
        forceBridgeBeforeTarget = false;
        continue;
      }
      lastRejectedReason = bridged.reason;
      if (await holdContinuation()) continue;
      bridgeMaximumScaleStep = lowCoverage
        ? Math.min(bridgeMaximumScaleStep / 2, Math.abs(bridgeScaleStep) / 2)
        : bridgeMaximumScaleStep / 2;
      forceBridgeBeforeTarget = false;
      if (bridgeMaximumScaleStep < minimumScaleStep) break;
      continue;
    }

    const measured = await measureFormalPressureVolumeBranchV3(
      continuationBranch,
      sourceGlobalTbvMl * requestedScale,
      "continuation",
      reservoirClosure,
    );
    if (
      measured.status === "accepted" &&
      formalPairQualifiedV3(measured.pair)
    ) {
      const acceptedBoundary: FormalCoverageBoundaryV3 = Object.freeze({
        branch: measured.branch,
        scale: requestedScale,
        pair: measured.pair,
        ...(measured.settlementEvidence ? { settlementEvidence: measured.settlementEvidence } : {}),
        ...(measured.preloadEndDiastolic ? { preloadEndDiastolic: measured.preloadEndDiastolic } : {}),
      });
      accept(acceptedBoundary);
      if (stopAfterAccepted(measured.pair)) {
        return Object.freeze({
          status: "stopped" as const,
          boundary: acceptedBoundary,
          reason: null,
        });
      }
      return Object.freeze({
        status: "reached" as const,
        boundary: acceptedBoundary,
        reason: null,
      });
    }
    lastRejectedReason =
      measured.status === "rejected"
        ? measured.reason
        : "formal coverage target did not retain a settled fixed-tone pair";
    if (await holdContinuation()) continue;
    if (Math.abs(remainingScale) <= minimumScaleStep) break;
    forceBridgeBeforeTarget = true;
  }
  return Object.freeze({
    status: "boundary" as const,
    boundary,
    reason: lastRejectedReason,
  });
}

async function advanceFormalHotStartBridgeV3(
  sourceSession: MainWireIntegratedModelStructuralAnalysisSessionV3,
  targetGlobalTbvMl: number,
): Promise<
  | Readonly<{
      status: "accepted";
      branch: MainWireIntegratedModelStructuralAnalysisSessionV3;
    }>
  | RejectedBranchV3
> {
  let branch: MainWireIntegratedModelStructuralAnalysisSessionV3;
  try {
    branch =
      sourceSession.forkResponsiveStarlingAtFixedGlobalTotalBloodVolume(
        targetGlobalTbvMl,
      );
  } catch (error) {
    return rejectedV3(error);
  }
  const originTimeSec = branch.currentAcceptedState().acceptedTimeSec;
  let lastCompletedBeatId =
    branch.observe().completedBeatMetrics?.endAtrialCaptureId ?? null;
  for (
    let ordinal = 1;
    ordinal <= MAXIMUM_FORMAL_PRESENTATION_ADVANCES_PER_POINT_V3;
    ordinal += 1
  ) {
    const acceptedTimeSec = branch.currentAcceptedState().acceptedTimeSec;
    if (acceptedTimeSec - originTimeSec >= MAXIMUM_MEASUREMENT_DURATION_SEC_V3)
      break;
    const attemptedAdvance = attemptStructuralAnalysisAdvanceV3(
      branch,
      acceptedTimeSec + FORMAL_PROTOCOL_SAMPLE_DT_SEC_V3,
    );
    if (attemptedAdvance.status === "rejected") return attemptedAdvance;
    const advance = attemptedAdvance.advance;
    const acceptedTbvMl =
      advance.observation.acceptedState.coronary.fixedGlobalTotalBloodVolumeMl;
    if (
      Math.abs(acceptedTbvMl - targetGlobalTbvMl) > FIXED_TBV_TOLERANCE_ML_V3
    ) {
      return rejectedV3("fixed global TBV changed during a hot-start bridge");
    }
    const completed = advance.observation.completedBeatMetrics;
    if (
      completed !== null &&
      completed.endAtrialCaptureId !== lastCompletedBeatId
    ) {
      lastCompletedBeatId = completed.endAtrialCaptureId;
      return Object.freeze({ status: "accepted" as const, branch });
    }
  }
  return rejectedV3("hot-start bridge did not complete one beat");
}

function recentAcceptedScaleStepV3(
  samples: readonly FormalCoverageSampleV3[],
): number {
  if (samples.length < 2) return FORMAL_LOW_EXTENSION_INITIAL_SCALE_STEP_V3;
  return Math.abs(samples.at(-1)!.scale - samples.at(-2)!.scale);
}

function formalCoverageMinimumEndSystolicVolumeGainV3(
  samples: readonly FormalCoverageSampleV3[],
): number | null {
  if (samples.length < 2) return null;
  const previous = samples.at(-2)!.pair;
  const current = samples.at(-1)!.pair;
  const gain = (
    prior: MainWireIntegratedModelStarlingPointV3,
    next: MainWireIntegratedModelStarlingPointV3,
  ) =>
    Math.abs(
      next.ventricularPressureVolumeLandmarks.endSystolic.volumeMl -
        prior.ventricularPressureVolumeLandmarks.endSystolic.volumeMl,
    );
  return Math.min(
    gain(previous.left, current.left),
    gain(previous.right, current.right),
  );
}

function formalCoverageChordErrorV3(
  samples: readonly FormalCoverageSampleV3[],
): number | null {
  if (samples.length < 3) return null;
  const [first, middle, last] = samples.slice(-3);
  if (first === undefined || middle === undefined || last === undefined) {
    return null;
  }
  const denominator = last.scale - first.scale;
  if (!Number.isFinite(denominator) || Math.abs(denominator) < 1e-12) {
    return null;
  }
  const fraction = (middle.scale - first.scale) / denominator;
  const firstValues = formalCoverageShapeVectorV3(first.pair);
  const middleValues = formalCoverageShapeVectorV3(middle.pair);
  const lastValues = formalCoverageShapeVectorV3(last.pair);
  const normalizationFloors = [
    1, 0.25, 5, 5, 5, 1, 1, 0.25, 5, 5, 5, 1,
  ] as const;
  return Math.max(
    ...middleValues.map((value, index) => {
      const predicted =
        firstValues[index]! +
        fraction * (lastValues[index]! - firstValues[index]!);
      const localSpan = Math.abs(lastValues[index]! - firstValues[index]!);
      return (
        Math.abs(value - predicted) /
        Math.max(normalizationFloors[index]!, localSpan)
      );
    }),
  );
}

function formalCoverageShapeVectorV3(pair: StarlingPairV3): readonly number[] {
  const side = (point: MainWireIntegratedModelStarlingPointV3) => [
    point.fillingPressureMmHg,
    point.cardiacOutputLPerMin,
    point.ventricularPressureVolumeLandmarks.endSystolic.volumeMl,
    point.ventricularPressureVolumeLandmarks.endSystolic.pressureMmHg,
    point.ventricularPressureVolumeLandmarks.endDiastolic.volumeMl,
    point.ventricularPressureVolumeLandmarks.endDiastolic.pressureMmHg,
  ];
  return Object.freeze([...side(pair.left), ...side(pair.right)]);
}

function formalPairQualifiedV3(pair: StarlingPairV3): boolean {
  return (
    pair.left.settled &&
    pair.right.settled &&
    pair.left.evidence === "fixed-tone-periodic" &&
    pair.right.evidence === "fixed-tone-periodic" &&
    pair.left.curveEligible &&
    pair.right.curveEligible
  );
}

function responsiveSettledAnchorPairV3(pair: StarlingPairV3): boolean {
  return [pair.left, pair.right].every(
    (point) =>
      point.role === "operating-anchor" &&
      point.quality === "locally-converged" &&
      point.curveEligible === true &&
      point.settled === true &&
      point.evidence === "responsive-settled-anchor" &&
      point.measurementWindowStatus === "responsive-period1-settled",
  );
}

function runHypovolemicChainV3(
  centerBranch: MainWireIntegratedModelStructuralAnalysisSessionV3,
  sourceGlobalTbvMl: number,
  append: (pair: StarlingPairV3) => void,
): void {
  let reliableBranch = centerBranch;
  let reliableScale = 1;

  for (const requestedScale of MAIN_WIRE_INTEGRATED_MODEL_RESPONSIVE_STARLING_HYPOVOLEMIC_TBV_SCALES_V3) {
    let targetScale: number = requestedScale;
    let unsafeScale: number | null = null;
    let boundaryCandidate: StarlingPairV3 | null = null;
    let reachedRequestedScale = false;

    for (
      let attempt = 0;
      attempt < MAXIMUM_LOW_TARGET_ATTEMPTS_PER_POINT_V3;
      attempt += 1
    ) {
      const measured = measureBranchV3(
        reliableBranch,
        sourceGlobalTbvMl * targetScale,
        {
          role: "continuation",
          maximumBeatCount:
            targetScale <= 0.54
              ? DEEP_HYPOVOLEMIC_MAXIMUM_COMPLETE_BEAT_COUNT_V3
              : STANDARD_MAXIMUM_COMPLETE_BEAT_COUNT_V3,
          requireLocalConvergence: false,
        },
      );
      if (
        measured.status === "accepted" &&
        measured.pair.left.curveEligible &&
        measured.pair.right.curveEligible
      ) {
        append(measured.pair);
        reliableBranch = measured.branch;
        reliableScale = targetScale;
        if (starlingPairReachedLowFlowTargetV3(measured.pair)) return;
        if (Math.abs(targetScale - requestedScale) < 1e-12) {
          reachedRequestedScale = true;
          break;
        }

        // A midpoint made the original jump safe. Retry the original target
        // from this closer, fully advanced checkpoint before declaring a
        // numerical boundary.
        targetScale = requestedScale;
        continue;
      }

      unsafeScale = targetScale;
      if (measured.status === "accepted") boundaryCandidate = measured.pair;
      if (reliableScale - unsafeScale <= MINIMUM_LOW_SCALE_BRACKET_V3) break;
      targetScale = midpointV3(reliableScale, unsafeScale);
    }

    if (reachedRequestedScale) continue;
    if (boundaryCandidate !== null) append(boundaryCandidate);
    break;
  }
}

function starlingPairReachedLowFlowTargetV3(pair: StarlingPairV3): boolean {
  return (
    Math.max(pair.left.cardiacOutputLPerMin, pair.right.cardiacOutputLPerMin) <=
    MAIN_WIRE_INTEGRATED_MODEL_RESPONSIVE_STARLING_LOW_FLOW_TARGET_L_PER_MIN_V3
  );
}

function runHypervolemicChainV3(
  centerBranch: MainWireIntegratedModelStructuralAnalysisSessionV3,
  centerPair: StarlingPairV3,
  sourceGlobalTbvMl: number,
  append: (pair: StarlingPairV3) => void,
): void {
  let reliableBranch = centerBranch;
  const reliablePairs: StarlingPairV3[] = [centerPair];
  for (const scale of MAIN_WIRE_INTEGRATED_MODEL_RESPONSIVE_STARLING_HYPERVOLEMIC_TBV_SCALES_V3) {
    const measured = measureBranchV3(
      reliableBranch,
      sourceGlobalTbvMl * scale,
      {
        role: "continuation",
        maximumBeatCount: STANDARD_MAXIMUM_COMPLETE_BEAT_COUNT_V3,
        requireLocalConvergence: false,
      },
    );
    if (measured.status === "rejected") break;
    append(measured.pair);
    if (
      !measured.pair.left.curveEligible ||
      !measured.pair.right.curveEligible
    ) {
      break;
    }
    reliableBranch = measured.branch;
    reliablePairs.push(measured.pair);
    if (
      reliablePairs.length >= 4 &&
      mainWireIntegratedModelStarlingDescendingLimbV3(
        reliablePairs.map(({ right }) => right),
      ) !== null &&
      mainWireIntegratedModelStarlingDescendingLimbV3(
        reliablePairs.map(({ left }) => left),
      ) !== null
    )
      break;
  }
}

export type MainWireIntegratedModelStarlingDescendingLimbV3 = Readonly<{
  peakPressureMmHg: number;
  firstDecliningPressureMmHg: number;
  confirmedDecliningPressureMmHg: number;
}>;

/**
 * A descending limb is present only after two consecutive post-plateau drops
 * and a clinically visible aggregate fall. This rejects one-point noise while
 * allowing the high-volume continuation to stop before extreme filling
 * pressures dominate a comparison plot.
 */
export function mainWireIntegratedModelStarlingDescendingLimbV3(
  points: readonly Pick<
    MainWireIntegratedModelStarlingPointV3,
    "cardiacOutputLPerMin" | "curveEligible" | "fillingPressureMmHg"
  >[],
): MainWireIntegratedModelStarlingDescendingLimbV3 | null {
  const ordered = points
    .filter(
      ({ cardiacOutputLPerMin, curveEligible, fillingPressureMmHg }) =>
        curveEligible &&
        Number.isFinite(cardiacOutputLPerMin) &&
        Number.isFinite(fillingPressureMmHg),
    )
    .sort(
      (left, right) => left.fillingPressureMmHg - right.fillingPressureMmHg,
    );
  if (ordered.length < 4) return null;
  const peakFlowLPerMin = Math.max(
    ...ordered.map(({ cardiacOutputLPerMin }) => cardiacOutputLPerMin),
  );
  const plateauToleranceLPerMin = Math.max(0.05, 0.01 * peakFlowLPerMin);
  let peakIndex = 0;
  ordered.forEach((point, index) => {
    if (point.cardiacOutputLPerMin >= peakFlowLPerMin - plateauToleranceLPerMin)
      peakIndex = index;
  });
  const requiredDropLPerMin = Math.max(
    DESCENDING_LIMB_ABSOLUTE_DROP_L_PER_MIN_V3,
    DESCENDING_LIMB_RELATIVE_DROP_V3 * peakFlowLPerMin,
  );
  for (let index = peakIndex + 2; index < ordered.length; index += 1) {
    const peak = ordered[peakIndex]!;
    const firstDeclining = ordered[index - 1]!;
    const confirmation = ordered[index]!;
    if (
      firstDeclining.cardiacOutputLPerMin >
        peak.cardiacOutputLPerMin -
          DESCENDING_LIMB_STEP_TOLERANCE_L_PER_MIN_V3 ||
      confirmation.cardiacOutputLPerMin >
        firstDeclining.cardiacOutputLPerMin -
          DESCENDING_LIMB_STEP_TOLERANCE_L_PER_MIN_V3 ||
      peakFlowLPerMin - confirmation.cardiacOutputLPerMin < requiredDropLPerMin
    )
      continue;
    return Object.freeze({
      peakPressureMmHg: peak.fillingPressureMmHg,
      firstDecliningPressureMmHg: firstDeclining.fillingPressureMmHg,
      confirmedDecliningPressureMmHg: confirmation.fillingPressureMmHg,
    });
  }
  return null;
}

async function measureFormalPressureVolumeBranchV3(
  sourceSession: MainWireIntegratedModelStructuralAnalysisSessionV3,
  targetGlobalTbvMl: number,
  role: MainWireIntegratedModelStarlingPointV3["role"],
  reservoirClosure = false,
): Promise<MeasuredBranchV3> {
  reservoirClosure ||= sourceSession.requireReservoirClosureV1 === true;
  let branch: MainWireIntegratedModelStructuralAnalysisSessionV3;
  try {
    // A preload-reduction PVA family is a short mechanical perturbation, not a
    // sequence of 25-second coronary-controller re-equilibrations. Preserve
    // the source tone, reset its accepted averaging window beyond this bounded
    // branch, and hot-start the next load from the preceding settled endpoint.
    branch =
      sourceSession.forkResponsiveStarlingAtFixedGlobalTotalBloodVolume(
        targetGlobalTbvMl,
      );
    const originTimeSec = branch.currentAcceptedState().acceptedTimeSec;
    const beats: MainWireIntegratedModelCompletedBeatMetricsV3[] = [];
    const volumeClosure = reservoirClosure ? new MainWireFixedToneVolumeClosureV2() : null;
    const landmarkClosureScore = reservoirClosure
      ? mainWireIntegratedModelFormalPreloadLandmarkClosureScoreV2
      : formalBeatPairClosureScoreV3;
    if (volumeClosure) recordFixedToneReservoirVolumesV2(volumeClosure, branch.observe());
    const maximumDurationSec = reservoirClosure ? MAIN_WIRE_FIXED_TONE_SETTLEMENT_V2.maximumMeasurementDurationSec
      : MAXIMUM_MEASUREMENT_DURATION_SEC_V3;
    const frozenWindow = branch.currentAcceptedState().coronary.coronaryAutoregulationBinding.windowPolicy;
    const deadlineSec = Math.min(originTimeSec + maximumDurationSec,
      frozenWindow.originAcceptedTimeSec + frozenWindow.durationSec - 1e-8);
    const pressureVolumeBeats: CompletedPressureVolumeBeatPairV3[] = [];
    const pressureVolumeLoopCollector =
      new FormalFixedTbvPressureVolumeLoopCollectorV3();
    let lastCompletedBeatId: string | null =
      branch.observe().completedBeatMetrics?.endAtrialCaptureId ?? null;
    let locallyConverged = false;
    for (
      let ordinal = 1;
      ordinal <= (reservoirClosure ? maximumDurationSec / FORMAL_PROTOCOL_SAMPLE_DT_SEC_V3
        : MAXIMUM_FORMAL_PRESENTATION_ADVANCES_PER_POINT_V3);
      ordinal += 1
    ) {
      const acceptedTimeSec = branch.currentAcceptedState().acceptedTimeSec;
      if (
        reservoirClosure ? acceptedTimeSec + FORMAL_PROTOCOL_SAMPLE_DT_SEC_V3 > deadlineSec
          : acceptedTimeSec - originTimeSec >= MAXIMUM_MEASUREMENT_DURATION_SEC_V3
      )
        break;
      const attemptedAdvance = attemptStructuralAnalysisAdvanceV3(
        branch,
        acceptedTimeSec + FORMAL_PROTOCOL_SAMPLE_DT_SEC_V3,
      );
      if (attemptedAdvance.status === "rejected") return attemptedAdvance;
      const advance = attemptedAdvance.advance;
      if (volumeClosure) recordFixedToneReservoirVolumesV2(volumeClosure, advance.observation);
      const acceptedTbvMl =
        advance.observation.acceptedState.coronary
          .fixedGlobalTotalBloodVolumeMl;
      if (
        Math.abs(acceptedTbvMl - targetGlobalTbvMl) > FIXED_TBV_TOLERANCE_ML_V3
      ) {
        return rejectedV3("fixed global TBV changed during PVA settlement");
      }
      const completedPressureVolumeLoop = pressureVolumeLoopCollector.accept(
        advance.observation,
        branch,
      );
      if (completedPressureVolumeLoop !== null) {
        pressureVolumeBeats.push(completedPressureVolumeLoop);
      }
      const completed = advance.observation.completedBeatMetrics;
      if (
        completed === null ||
        completed.endAtrialCaptureId === lastCompletedBeatId
      ) {
        continue;
      }
      lastCompletedBeatId = completed.endAtrialCaptureId;
      beats.push(completed);
      if (volumeClosure) {
        locallyConverged = volumeClosure.converged()
          && fixedToneRecentOutputScoreV2(beats) <= MAIN_WIRE_FIXED_TONE_SETTLEMENT_V2.maximumNormalizedOutputDelta
          && fixedToneRecentOutputScoreV2(beats, landmarkClosureScore)
            <= MAIN_WIRE_FIXED_TONE_SETTLEMENT_V2.maximumNormalizedLandmarkDelta;
        if (locallyConverged && pressureVolumeBeats.length > 0) break;
        if (period2DetectedV3(beats, landmarkClosureScore)) {
          return rejectedV3("fixed-tone PVA branch reached a period-2 boundary");
        }
      } else if (locallyConverged) {
        // An exact checkpoint intentionally omits the analysis-only completed
        // beat readback.  In that case the formal phase collector must first
        // discard a partial cycle and can lag the closure gate by one beat.
        // Preserve strict period-1 evidence, but continue for the one bounded
        // cycle needed to retain an actual pressure-volume loop.
        if (pressureVolumeBeats.length > 0) break;
      } else if (beats.length >= MINIMUM_COMPLETE_BEAT_COUNT_V3) {
        if (period1ConvergedV3(beats, landmarkClosureScore)) {
          locallyConverged = true;
          if (pressureVolumeBeats.length > 0) break;
        }
        else if (
          beats.length >= 5 &&
          period2DetectedV3(beats, landmarkClosureScore)
        ) {
          return rejectedV3(
            "fixed-tone PVA branch reached a period-2 boundary",
          );
        }
      }
      const maximumBeatCount =
        reservoirClosure ? MAIN_WIRE_FIXED_TONE_SETTLEMENT_V2.maximumCompleteBeatCount
        : role === "operating-anchor"
          ? CENTER_MAXIMUM_COMPLETE_BEAT_COUNT_V3
          : FORMAL_CONTINUATION_MAXIMUM_COMPLETE_BEAT_COUNT_V3;
      if (
        beats.length >= maximumBeatCount &&
        (!locallyConverged || pressureVolumeBeats.length > 0)
      )
        break;
    }
    if (!locallyConverged) {
      const previousScore =
        beats.length >= 3
          ? landmarkClosureScore(beats.at(-3)!, beats.at(-2)!)
          : Number.POSITIVE_INFINITY;
      const latestScore = latestBeatClosureScoreV3(
        beats,
        landmarkClosureScore,
      );
      return rejectedV3(
        `fixed-tone PVA branch did not establish strict period-1 closure ` +
          `(beats=${beats.length}, previous=${previousScore}, latest=${latestScore}`
          + (volumeClosure ? `, redistributedVolumeMl=${volumeClosure.maximumRecentRedistributedVolumeMl()}` : "") + ")",
      );
    }
    const pressureVolumeBeat = pressureVolumeBeats.at(-1);
    if (pressureVolumeBeat === undefined) {
      return rejectedV3(
        "formal fixed-TBV branch did not retain a complete pressure-volume loop",
      );
    }

    // Report only the converged suffix; earlier beats belong to the hot-start
    // transient and must not bias the retained filling pressure or output.
    const averaged = averageBeatMetricsV3(beats.slice(-2));
    const selectedBeat = pressureVolumeBeat.completedBeatMetrics;
    const settlementEvidence = volumeClosure ? Object.freeze({
      policyId: MAIN_WIRE_FIXED_TONE_SETTLEMENT_V2.policyId,
      completedBeatCount: beats.length,
      maximumRecentRedistributedVolumeMl: volumeClosure.maximumRecentRedistributedVolumeMl(),
      maximumRecentNormalizedOutputDelta: fixedToneRecentOutputScoreV2(beats),
      maximumRecentNormalizedLandmarkDelta: fixedToneRecentOutputScoreV2(beats, landmarkClosureScore),
      measurementDurationSec: branch.currentAcceptedState().acceptedTimeSec - originTimeSec,
    }) : undefined;
    const common = Object.freeze({
      ...(settlementEvidence ? { settlementEvidence } : {}),
      totalBloodVolumeMl: targetGlobalTbvMl,
      role,
      quality: "locally-converged" as const,
      curveEligible: true as const,
      completedBeatCount: beats.length,
      maximumNormalizedBeatDelta: recentBeatClosureScoreV3(
        beats,
        landmarkClosureScore,
      ),
      settled: true as const,
      finiteAndFixedTbvPassed: true as const,
      evidence: "fixed-tone-periodic" as const,
      measurementWindowStatus: "fixed-tone-period1-settled" as const,
      acceptedMeasurementDurationSec:
        branch.currentAcceptedState().acceptedTimeSec - originTimeSec,
      acceptedBeatDurationSec: selectedBeat.durationSec,
    });
    return Object.freeze({
      status: "accepted" as const,
      branch,
      observation: branch.observe(),
      ...(reservoirClosure ? { preloadEndDiastolic:
        measureMainWireIntegratedModelFormalPreloadEndDiastolicV2(selectedBeat) } : {}),
      ...(settlementEvidence ? { settlementEvidence } : {}),
      pair: Object.freeze({
        right: Object.freeze({
          ...common,
          fillingPressureMmHg: averaged.meanRightAtrialPressureMmHg,
          cardiacOutputLPerMin: averaged.nativeRightCardiacOutputLPerMin,
          acceptedTransmuralPathWorkMmHgMl:
            selectedBeat.rightVentricularTransmuralPressureVolumePathWorkMmHgMl,
          ventricularPressureVolumeLoop: pressureVolumeBeat.loops.right,
          ventricularPressureVolumeLandmarks:
            selectedBeat.rightVentricularPressureVolumeLandmarks,
        }),
        left: Object.freeze({
          ...common,
          fillingPressureMmHg: averaged.meanLeftAtrialPressureMmHg,
          cardiacOutputLPerMin: averaged.nativeLeftCardiacOutputLPerMin,
          acceptedTransmuralPathWorkMmHgMl:
            selectedBeat.leftVentricularTransmuralPressureVolumePathWorkMmHgMl,
          ventricularPressureVolumeLoop: pressureVolumeBeat.loops.left,
          ventricularPressureVolumeLandmarks:
            selectedBeat.leftVentricularPressureVolumeLandmarks,
        }),
      }),
    });
  } catch (error) {
    return rejectedV3(error);
  }
}

function measureBranchV3(
  sourceSession: MainWireIntegratedModelStructuralAnalysisSessionV3,
  targetGlobalTbvMl: number,
  options: Readonly<{
    role: MainWireIntegratedModelStarlingPointV3["role"];
    maximumBeatCount: number;
    requireLocalConvergence: boolean;
  }>,
): MeasuredBranchV3 {
  let branch: MainWireIntegratedModelStructuralAnalysisSessionV3;
  try {
    branch =
      sourceSession.forkResponsiveStarlingAtFixedGlobalTotalBloodVolume(
        targetGlobalTbvMl,
      );
  } catch (error) {
    return rejectedV3(error);
  }
  const originTimeSec = branch.currentAcceptedState().acceptedTimeSec;
  const beats: MainWireIntegratedModelCompletedBeatMetricsV3[] = [];
  const pressureVolumeLoops: PressureVolumeLoopPairV3[] = [];
  const pressureVolumeLoopCollector =
    new FixedTbvPressureVolumeLoopCollectorV3();
  let lastCompletedBeatId: string | null = null;
  let quality: MainWireIntegratedModelStarlingPointV3["quality"] =
    "convergence-cap";

  for (
    let ordinal = 1;
    ordinal <= MAXIMUM_RESPONSIVE_PRESENTATION_ADVANCES_PER_POINT_V3;
    ordinal += 1
  ) {
    const acceptedTimeSec = branch.currentAcceptedState().acceptedTimeSec;
    if (acceptedTimeSec - originTimeSec >= MAXIMUM_MEASUREMENT_DURATION_SEC_V3)
      break;
    const attemptedAdvance = attemptStructuralAnalysisAdvanceV3(
      branch,
      acceptedTimeSec + RESPONSIVE_PROTOCOL_SAMPLE_DT_SEC_V3,
    );
    if (attemptedAdvance.status === "rejected") return attemptedAdvance;
    const advance = attemptedAdvance.advance;
    const acceptedTbvMl =
      advance.observation.acceptedState.coronary.fixedGlobalTotalBloodVolumeMl;
    if (Math.abs(acceptedTbvMl - targetGlobalTbvMl) > FIXED_TBV_TOLERANCE_ML_V3)
      return rejectedV3("fixed global TBV changed during the branch");

    const completedPressureVolumeLoop = pressureVolumeLoopCollector.accept(
      advance.observation,
      branch,
    );
    if (completedPressureVolumeLoop !== null) {
      pressureVolumeLoops.push(completedPressureVolumeLoop);
    }
    const completed = advance.observation.completedBeatMetrics;
    if (
      completed === null ||
      completed.endAtrialCaptureId === lastCompletedBeatId
    )
      continue;
    lastCompletedBeatId = completed.endAtrialCaptureId;
    beats.push(completed);

    if (
      beats.length >= MINIMUM_COMPLETE_BEAT_COUNT_V3 &&
      period1ConvergedV3(beats)
    ) {
      quality = "locally-converged";
      break;
    }
    if (beats.length >= 5 && period2DetectedV3(beats)) {
      quality = "period-2-boundary";
      break;
    }
    if (
      !options.requireLocalConvergence &&
      beats.length >= MINIMUM_COMPLETE_BEAT_COUNT_V3 &&
      recentBeatClosureScoreV3(beats) <= EARLY_PREVIEW_MAXIMUM_CLOSURE_SCORE_V3
    ) {
      quality = "adaptive-preview";
      break;
    }
    if (beats.length >= options.maximumBeatCount) break;
  }

  if (beats.length < MINIMUM_COMPLETE_BEAT_COUNT_V3) {
    return rejectedV3(
      `fewer than ${MINIMUM_COMPLETE_BEAT_COUNT_V3} complete beats were accepted`,
    );
  }
  if (quality === "convergence-cap" && period2DetectedV3(beats)) {
    quality = "period-2-boundary";
  } else if (
    quality === "convergence-cap" &&
    !options.requireLocalConvergence &&
    recentBeatClosureScoreV3(beats) <= FINAL_PREVIEW_MAXIMUM_CLOSURE_SCORE_V3
  ) {
    quality = "adaptive-preview";
  }
  const measurementBeats = beats.slice(-2);
  const pressureVolumeLoop = pressureVolumeLoops.at(-1);
  if (pressureVolumeLoop === undefined) {
    return rejectedV3(
      "fixed-TBV branch did not retain a complete pressure-volume loop",
    );
  }
  const averaged = averageBeatMetricsV3(measurementBeats);
  const lastBeatDelta = recentBeatClosureScoreV3(beats);
  const acceptedMeasurementDurationSec =
    branch.currentAcceptedState().acceptedTimeSec - originTimeSec;
  const curveEligible =
    quality === "locally-converged" || quality === "adaptive-preview";
  const responsiveSettledAnchor =
    options.role === "operating-anchor" && quality === "locally-converged";
  const common = Object.freeze({
    totalBloodVolumeMl: targetGlobalTbvMl,
    role: options.role,
    quality,
    curveEligible,
    completedBeatCount: beats.length,
    maximumNormalizedBeatDelta: lastBeatDelta,
    settled: responsiveSettledAnchor,
    finiteAndFixedTbvPassed: true as const,
    evidence: responsiveSettledAnchor
      ? ("responsive-settled-anchor" as const)
      : ("responsive-preview" as const),
    measurementWindowStatus: responsiveSettledAnchor
      ? ("responsive-period1-settled" as const)
      : quality === "locally-converged"
        ? ("complete-beat-converged" as const)
        : quality === "adaptive-preview"
          ? ("complete-beat-preview" as const)
          : quality === "period-2-boundary"
            ? ("period-2-detected" as const)
            : ("complete-beat-cap" as const),
    acceptedMeasurementDurationSec,
  });
  return Object.freeze({
    status: "accepted" as const,
    branch,
    observation: branch.observe(),
    pair: Object.freeze({
      right: Object.freeze({
        ...common,
        fillingPressureMmHg: averaged.meanRightAtrialPressureMmHg,
        cardiacOutputLPerMin: averaged.nativeRightCardiacOutputLPerMin,
        ventricularPressureVolumeLoop: pressureVolumeLoop.right,
        ventricularPressureVolumeLandmarks:
          averaged.rightVentricularPressureVolumeLandmarks,
      }),
      left: Object.freeze({
        ...common,
        fillingPressureMmHg: averaged.meanLeftAtrialPressureMmHg,
        cardiacOutputLPerMin: averaged.nativeLeftCardiacOutputLPerMin,
        ventricularPressureVolumeLoop: pressureVolumeLoop.left,
        ventricularPressureVolumeLandmarks:
          averaged.leftVentricularPressureVolumeLandmarks,
      }),
    }),
  });
}

type BeatPairClosureScoreV3 = (
  left: MainWireIntegratedModelCompletedBeatMetricsV3,
  right: MainWireIntegratedModelCompletedBeatMetricsV3,
) => number;

function recordFixedToneReservoirVolumesV2(
  collector: MainWireFixedToneVolumeClosureV2,
  observation: MainWireIntegratedModelObservationV3,
): void {
  const state = observation.acceptedState;
  collector.accept({ timeSec: state.acceptedTimeSec, volumesMl: {
    ...state.coronary.circulation.nodeVolumesMl,
    ...Object.fromEntries(Object.entries(state.coronary.coronary.volumeMlByNode)
      .map(([key, value]) => [`coronary.${key}`, value])),
  } }, observation.completedBeatMetrics?.endTimeSec ?? null);
}

function fixedToneRecentOutputScoreV2(beats: readonly MainWireIntegratedModelCompletedBeatMetricsV3[],
  score: BeatPairClosureScoreV3 = beatPairClosureScoreV3): number {
  const count = MAIN_WIRE_FIXED_TONE_SETTLEMENT_V2.consecutiveComparisonCount;
  if (beats.length < count + 1) return Number.POSITIVE_INFINITY;
  const suffix = beats.slice(-(count + 1));
  return Math.max(...suffix.slice(1).map((beat, index) => score(suffix[index]!, beat)));
}

function period1ConvergedV3(
  beats: readonly MainWireIntegratedModelCompletedBeatMetricsV3[],
  closureScore: BeatPairClosureScoreV3 = beatPairClosureScoreV3,
): boolean {
  const consecutiveComparisonCount = 2;
  if (beats.length < consecutiveComparisonCount + 1) return false;
  const suffix = beats.slice(-(consecutiveComparisonCount + 1));
  return suffix
    .slice(1)
    .every((beat, index) => closureScore(suffix[index]!, beat) <= 1);
}

function latestBeatClosureScoreV3(
  beats: readonly MainWireIntegratedModelCompletedBeatMetricsV3[],
  closureScore: BeatPairClosureScoreV3 = beatPairClosureScoreV3,
): number {
  if (beats.length < 2) return Number.POSITIVE_INFINITY;
  return closureScore(beats.at(-2)!, beats.at(-1)!);
}

function recentBeatClosureScoreV3(
  beats: readonly MainWireIntegratedModelCompletedBeatMetricsV3[],
  closureScore: BeatPairClosureScoreV3 = beatPairClosureScoreV3,
): number {
  if (beats.length < 2) return Number.POSITIVE_INFINITY;
  const adjacent = closureScore(beats.at(-2)!, beats.at(-1)!);
  return beats.length < 3
    ? adjacent
    : Math.max(closureScore(beats.at(-3)!, beats.at(-2)!), adjacent);
}

function period2DetectedV3(
  beats: readonly MainWireIntegratedModelCompletedBeatMetricsV3[],
  closureScore: BeatPairClosureScoreV3 = beatPairClosureScoreV3,
): boolean {
  if (beats.length < 5) return false;
  const p2 =
    closureScore(beats.at(-5)!, beats.at(-3)!) <= 1 &&
    closureScore(beats.at(-4)!, beats.at(-2)!) <= 1 &&
    closureScore(beats.at(-3)!, beats.at(-1)!) <= 1;
  const adjacent = closureScore(beats.at(-2)!, beats.at(-1)!);
  return p2 && adjacent > 1;
}

function beatPairClosureScoreV3(
  left: MainWireIntegratedModelCompletedBeatMetricsV3,
  right: MainWireIntegratedModelCompletedBeatMetricsV3,
): number {
  const flowScore = (leftValue: number, rightValue: number) =>
    Math.abs(leftValue - rightValue) /
    Math.max(
      FLOW_ABSOLUTE_CLOSURE_L_PER_MIN_V3,
      FLOW_RELATIVE_CLOSURE_V3 *
        Math.max(Math.abs(leftValue), Math.abs(rightValue)),
    );
  return Math.max(
    flowScore(
      left.nativeLeftCardiacOutputLPerMin,
      right.nativeLeftCardiacOutputLPerMin,
    ),
    flowScore(
      left.nativeRightCardiacOutputLPerMin,
      right.nativeRightCardiacOutputLPerMin,
    ),
    Math.abs(
      left.meanLeftAtrialPressureMmHg - right.meanLeftAtrialPressureMmHg,
    ) / ATRIAL_PRESSURE_CLOSURE_MMHG_V3,
    Math.abs(
      left.meanRightAtrialPressureMmHg - right.meanRightAtrialPressureMmHg,
    ) / ATRIAL_PRESSURE_CLOSURE_MMHG_V3,
    Math.abs(left.meanAorticPressureMmHg - right.meanAorticPressureMmHg) /
      AORTIC_PRESSURE_CLOSURE_MMHG_V3,
    Math.abs(
      left.maximumLeftVentricularVolumeMl -
        right.maximumLeftVentricularVolumeMl,
    ) / VENTRICULAR_VOLUME_CLOSURE_ML_V3,
    Math.abs(
      left.minimumLeftVentricularVolumeMl -
        right.minimumLeftVentricularVolumeMl,
    ) / VENTRICULAR_VOLUME_CLOSURE_ML_V3,
  );
}

function formalBeatPairClosureScoreV3(
  left: MainWireIntegratedModelCompletedBeatMetricsV3,
  right: MainWireIntegratedModelCompletedBeatMetricsV3,
): number {
  const landmarkScore = (
    leftLandmark: MainWireIntegratedModelPressureVolumeLandmarkV3,
    rightLandmark: MainWireIntegratedModelPressureVolumeLandmarkV3,
  ) =>
    Math.max(
      Math.abs(leftLandmark.volumeMl - rightLandmark.volumeMl) /
        VENTRICULAR_LANDMARK_VOLUME_CLOSURE_ML_V3,
      Math.abs(leftLandmark.pressureMmHg - rightLandmark.pressureMmHg) /
        VENTRICULAR_LANDMARK_PRESSURE_CLOSURE_MMHG_V3,
    );
  return Math.max(
    beatPairClosureScoreV3(left, right),
    landmarkScore(
      left.leftVentricularPressureVolumeLandmarks.endDiastolic,
      right.leftVentricularPressureVolumeLandmarks.endDiastolic,
    ),
    landmarkScore(
      left.leftVentricularPressureVolumeLandmarks.endSystolic,
      right.leftVentricularPressureVolumeLandmarks.endSystolic,
    ),
    landmarkScore(
      left.rightVentricularPressureVolumeLandmarks.endDiastolic,
      right.rightVentricularPressureVolumeLandmarks.endDiastolic,
    ),
    landmarkScore(
      left.rightVentricularPressureVolumeLandmarks.endSystolic,
      right.rightVentricularPressureVolumeLandmarks.endSystolic,
    ),
  );
}

/** V2 also closes the inlet-closure ED observables it reports, at existing landmark tolerances. */
export function mainWireIntegratedModelFormalPreloadLandmarkClosureScoreV2(
  previous: MainWireIntegratedModelCompletedBeatMetricsV3,
  current: MainWireIntegratedModelCompletedBeatMetricsV3,
): number {
  const previousEd = measureMainWireIntegratedModelFormalPreloadEndDiastolicV2(previous);
  const currentEd = measureMainWireIntegratedModelFormalPreloadEndDiastolicV2(current);
  return Math.max(formalBeatPairClosureScoreV3(previous, current),
    ...(["left", "right"] as const).flatMap((side) => [
      Math.abs(currentEd[side].volumeMl - previousEd[side].volumeMl)
        / VENTRICULAR_LANDMARK_VOLUME_CLOSURE_ML_V3,
      Math.abs(currentEd[side].pressureMmHg - previousEd[side].pressureMmHg)
        / VENTRICULAR_LANDMARK_PRESSURE_CLOSURE_MMHG_V3,
    ]));
}

function averageBeatMetricsV3(
  beats: readonly MainWireIntegratedModelCompletedBeatMetricsV3[],
): Readonly<{
  meanLeftAtrialPressureMmHg: number;
  meanRightAtrialPressureMmHg: number;
  nativeLeftCardiacOutputLPerMin: number;
  nativeRightCardiacOutputLPerMin: number;
  leftVentricularPressureVolumeLandmarks: MainWireIntegratedModelVentricularPressureVolumeLandmarksV3;
  rightVentricularPressureVolumeLandmarks: MainWireIntegratedModelVentricularPressureVolumeLandmarksV3;
}> {
  if (beats.length === 0) throw new Error("Starling beat average is empty");
  const mean = (
    read: (beat: MainWireIntegratedModelCompletedBeatMetricsV3) => number,
  ) => beats.reduce((sum, beat) => sum + read(beat), 0) / beats.length;
  return Object.freeze({
    meanLeftAtrialPressureMmHg: mean((beat) => beat.meanLeftAtrialPressureMmHg),
    meanRightAtrialPressureMmHg: mean(
      (beat) => beat.meanRightAtrialPressureMmHg,
    ),
    nativeLeftCardiacOutputLPerMin: mean(
      (beat) => beat.nativeLeftCardiacOutputLPerMin,
    ),
    nativeRightCardiacOutputLPerMin: mean(
      (beat) => beat.nativeRightCardiacOutputLPerMin,
    ),
    leftVentricularPressureVolumeLandmarks: averagePressureVolumeLandmarksV3(
      beats.map((beat) => beat.leftVentricularPressureVolumeLandmarks),
    ),
    rightVentricularPressureVolumeLandmarks: averagePressureVolumeLandmarksV3(
      beats.map((beat) => beat.rightVentricularPressureVolumeLandmarks),
    ),
  });
}

function averagePressureVolumeLandmarksV3(
  landmarks: readonly MainWireIntegratedModelVentricularPressureVolumeLandmarksV3[],
): MainWireIntegratedModelVentricularPressureVolumeLandmarksV3 {
  if (landmarks.length === 0) {
    throw new Error("pressure-volume landmark average is empty");
  }
  const average = (
    selected: readonly MainWireIntegratedModelPressureVolumeLandmarkV3[],
    event: MainWireIntegratedModelPressureVolumeLandmarkV3["event"],
  ): MainWireIntegratedModelPressureVolumeLandmarkV3 =>
    Object.freeze({
      volumeMl:
        selected.reduce((sum, point) => sum + point.volumeMl, 0) /
        selected.length,
      pressureMmHg:
        selected.reduce((sum, point) => sum + point.pressureMmHg, 0) /
        selected.length,
      event,
    });
  const endSystolic = landmarks.map(({ endSystolic }) => endSystolic);
  return Object.freeze({
    pressureBasis: "transmural" as const,
    endDiastolic: average(
      landmarks.map(({ endDiastolic }) => endDiastolic),
      "maximum-volume",
    ) as MainWireIntegratedModelVentricularPressureVolumeLandmarksV3["endDiastolic"],
    endSystolic: average(
      endSystolic,
      endSystolic.every(({ event }) => event === "semilunar-valve-closure")
        ? "semilunar-valve-closure"
        : "minimum-volume-fallback",
    ) as MainWireIntegratedModelVentricularPressureVolumeLandmarksV3["endSystolic"],
  });
}

function responsiveLocusV3(
  points: readonly MainWireIntegratedModelStarlingPointV3[],
  protocolComplete: boolean,
): MainWireIntegratedModelStarlingLocusV3 {
  return Object.freeze({
    status: "responsive-fixed-tbv-preview" as const,
    points: Object.freeze(
      [...points].sort(
        (left, right) => left.fillingPressureMmHg - right.fillingPressureMmHg,
      ),
    ),
    protocolId: MAIN_WIRE_INTEGRATED_MODEL_RESPONSIVE_STARLING_PROTOCOL_V3_ID,
    warmupDurationSec: 0,
    measurementDurationSec: MAXIMUM_MEASUREMENT_DURATION_SEC_V3,
    minimumBeatCount: MINIMUM_COMPLETE_BEAT_COUNT_V3,
    maximumBeatCount: CENTER_MAXIMUM_COMPLETE_BEAT_COUNT_V3,
    slowControllerPolicy: "coronary-tone-frozen-at-branch-source" as const,
    completedPointCount: points.length,
    totalPointCount: protocolComplete
      ? points.length
      : Math.max(
          points.length,
          MAIN_WIRE_INTEGRATED_MODEL_RESPONSIVE_STARLING_TBV_SCALES_V3.length,
        ),
  });
}

function formalPressureVolumeLocusV3(
  points: readonly MainWireIntegratedModelStarlingPointV3[],
  protocolComplete: boolean,
  expectedPointCount: number,
): MainWireIntegratedModelStarlingLocusV3 {
  const settled = points.filter(
    (
      point,
    ): point is MainWireIntegratedModelStarlingPointV3 &
      Readonly<{
        quality: "locally-converged";
        curveEligible: true;
        settled: true;
        evidence: "fixed-tone-periodic";
        measurementWindowStatus: "fixed-tone-period1-settled";
      }> =>
      point.quality === "locally-converged" &&
      point.curveEligible === true &&
      point.settled === true &&
      point.evidence === "fixed-tone-periodic" &&
      point.measurementWindowStatus === "fixed-tone-period1-settled",
  );
  const reservoirClosure = settled.some(point => point.settlementEvidence !== undefined);
  if (reservoirClosure && !settled.every(validMainWireFixedTonePointSettlementV2)) {
    throw new Error("Formal reservoir-closure family has missing or invalid interval evidence");
  }
  return Object.freeze({
    status: "measured-fixed-tbv-protocol" as const,
    protocolId:
      MAIN_WIRE_INTEGRATED_MODEL_FORMAL_PRESSURE_VOLUME_PROTOCOL_V3_ID,
    requirement: MAIN_WIRE_INTEGRATED_MODEL_STARLING_PROTOCOL_REQUIREMENT_V3,
    minimumBeatCount: reservoirClosure ? MAIN_WIRE_FIXED_TONE_SETTLEMENT_V2.consecutiveComparisonCount + 1 : MINIMUM_COMPLETE_BEAT_COUNT_V3,
    maximumBeatCount: reservoirClosure ? MAIN_WIRE_FIXED_TONE_SETTLEMENT_V2.maximumCompleteBeatCount : CENTER_MAXIMUM_COMPLETE_BEAT_COUNT_V3,
    completedPointCount: settled.length,
    totalPointCount: protocolComplete
      ? settled.length
      : Math.max(settled.length + 1, expectedPointCount),
    slowControllerPolicy:
      "active-source-period1-then-coronary-tone-frozen" as const,
    convergencePolicy: reservoirClosure ? "complete-beat-output-and-reservoir-period1-closure" as const
      : "complete-beat-output-period1-closure" as const,
    ...(reservoirClosure ? { settlementPolicy: MAIN_WIRE_FIXED_TONE_SETTLEMENT_V2 } : {}),
    points: Object.freeze(
      [...settled].sort(
        (left, right) => left.fillingPressureMmHg - right.fillingPressureMmHg,
      ),
    ),
  });
}

function rejectedV3(error: unknown): RejectedBranchV3 {
  return Object.freeze({
    status: "rejected" as const,
    reason: error instanceof Error ? error.message : String(error),
  });
}

function midpointV3(left: number, right: number): number {
  return 0.5 * (left + right);
}

function requiredAnchorObservationV3(
  observation: MainWireIntegratedModelObservationV3 | null,
): MainWireIntegratedModelObservationV3 {
  if (observation === null) {
    throw new Error("responsive Starling anchor observation is unavailable");
  }
  return observation;
}

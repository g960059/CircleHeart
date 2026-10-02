import { MAIN_WIRE_PRESSURE_CROSSING_PV_PROTOCOL_V1_ID } from "./MainWireStructuralAnalysisContractV3";
import { CARDIORESPIRATORY_MECHANICAL_PROTOCOL_V1_ID, CARDIORESPIRATORY_MECHANICAL_PVA_V1_ID } from "../cardiorespiratory/CardiorespiratoryMechanicalAnalysisV1";
import type {
  MainWireIntegratedModelPressureVolumeLoopPointV3,
  MainWireIntegratedModelStarlingLocusV3,
  MainWireIntegratedModelStarlingPointV3,
} from "@/analysis/methods/mainWire/MainWireGuytonStarlingOrientationV3";
import {
  evaluateMainWireIntegratedModelLvMvo2EstimateV1,
  type MainWireIntegratedModelLvMvo2EstimateV1,
} from "@/analysis/methods/mainWire/MainWireMvo2ReferenceV1";
import { evaluateMainWireLvMvo2EstimateV2, type MainWireLvMvo2EstimateV2 } from "./MainWireMvo2ReferenceV2";
export const MAIN_WIRE_PERIODIC_PVA_V1_ID =
  "main-wire-integrated-model-settled-hot-start-pva-v1" as const;
export { interpolateLoopAtTimeV1 as sampleMainWirePeriodicPvaLoopAtTimeV1 };
/** Published method identity. Semantic changes require a new ID and builder. */
export const MAIN_WIRE_PERIODIC_PVA_METHOD_V8_ID =
  "suga-pva-anchor-local-late-systolic-area-max-common-isochrone-nonlinear-espvr-exponential-edpvr-settled-preload-family-v8" as const;
export const MAIN_WIRE_PERIODIC_PVA_METHOD_V9_ID =
  "suga-pva-preload-reduction-through-anchor-area-max-common-isochrone-nonlinear-espvr-bidirectional-exponential-edpvr-v9" as const;
export const MAIN_WIRE_PERIODIC_PVA_METHOD_V10_ID =
  "suga-pva-preload-reduction-owner-with-measured-high-load-common-isochrone-display-v10" as const;
export const MAIN_WIRE_PERIODIC_PVA_METHOD_V13_ID =
  "suga-pva-common-isochrone-owner-with-measured-diastolic-load-display-v13" as const;
export const MAIN_WIRE_PERIODIC_PVA_METHOD_V14_ID =
  "suga-pva-measured-load-display-exact-anatomy-mvo2-v14" as const;
export const MAIN_WIRE_PERIODIC_PVA_METHOD_V15_ID =
  "suga-pva-measured-load-signed-semilunar-pressure-family-v15" as const;
/** V15 energy/display equations; the PE tail is admitted from the measured
 * domain first and the endpoint tangent is required only when the left
 * crossing lies below measured systolic support. */
export const MAIN_WIRE_PERIODIC_PVA_METHOD_V16_ID =
  "suga-pva-measured-domain-bounded-pe-tail-signed-semilunar-pressure-family-v16" as const;

export type MainWirePeriodicPvaMethodIdV1 =
  | typeof MAIN_WIRE_PERIODIC_PVA_METHOD_V8_ID
  | typeof MAIN_WIRE_PERIODIC_PVA_METHOD_V9_ID
  | typeof MAIN_WIRE_PERIODIC_PVA_METHOD_V10_ID
  | typeof MAIN_WIRE_PERIODIC_PVA_METHOD_V13_ID
  | typeof MAIN_WIRE_PERIODIC_PVA_METHOD_V14_ID
  | typeof MAIN_WIRE_PERIODIC_PVA_METHOD_V15_ID
  | typeof MAIN_WIRE_PERIODIC_PVA_METHOD_V16_ID
  | typeof CARDIORESPIRATORY_MECHANICAL_PVA_V1_ID;

type Mvo2Estimate = MainWireIntegratedModelLvMvo2EstimateV1 | MainWireLvMvo2EstimateV2;

const MMHG_ML_TO_JOULE_V1 = 1.33322e-4;
const MINIMUM_RELATION_PREVIEW_POINT_COUNT_V1 = 3;
const MINIMUM_PVA_PREVIEW_POINT_COUNT_V1 = 5;
const PHASE_SELECTION_LOWER_POINT_COUNT_V1 = 3;
const PHASE_SELECTION_HIGHER_POINT_COUNT_V1 = 1;
const CURVE_SAMPLE_COUNT_V1 = 64;
const PRESSURE_ENVELOPE_TIME_SAMPLE_COUNT_V1 = 128;
const PHASE_SELECTION_COARSE_TIME_SAMPLE_COUNT_V1 = 32;
const SYSTOLIC_TIME_LOCAL_REFINEMENT_INTERVAL_COUNT_V1 = 32;
const PHASE_SELECTION_WINDOW_MARGIN_PHASE01_V1 = 0.025;
const PHASE_SELECTION_ANCHOR_ESV_HALF_WIDTH_FRACTION_V1 = 0.1;
const PRESSURE_AREA_INTEGRATION_INTERVAL_COUNT_V1 = 128;
const EDPVR_V0_GRID_COUNT_V1 = 120;
const EDPVR_EXPONENT_GRID_COUNT_V1 = 180;

export type MainWireIntegratedModelPeriodicPvaVentricleV1 = "LV" | "RV";
export type MainWireIntegratedModelPeriodicPvaCurvePointV1 = Readonly<{
  volumeMl: number;
  pressureMmHg: number;
}>;

type PeriodicPvaProgressV1 = Readonly<{
  completedPointCount: number;
  totalPointCount: number;
}>;

export type MainWireIntegratedModelPeriodicPvaEspvrV1 = Readonly<{
  primaryMethod: "active-pressure-area-max-common-isochrone";
  primaryCurveLaw: "measured-domain-shape-preserving-locus";
  selectedTimeSinceAtrialCaptureSec: number;
  selectedPhase01AtAnchor: number;
  phaseSelectionPolicy:
    | "all-settled-loads-over-fixed-anchor-esv-neighborhood-within-anchor-late-systolic-window"
    | "preload-reduction-through-anchor-over-lower-anchor-esv-neighborhood-within-anchor-late-systolic-window";
  phaseSelectionStatus: "progressive" | "complete";
  phaseSelectionPointCount: number;
  phaseSelectionObjective: "positive-active-pressure-area-over-fixed-anchor-esv-neighborhood";
  phaseSelectionIntegrationVolumeRangeMl: readonly [number, number];
  phaseSelectionCandidateTimeRangeSec: readonly [number, number];
  phaseSelectionCandidatePhaseRange01: readonly [number, number];
  phaseSelectionAnchorLandmarks: Readonly<{
    maximumPressurePhase01: number;
    endSystolicPhase01: number;
  }>;
  phaseSelectionCoarseTimeSampleCount: 32;
  phaseSelectionLocalRefinementIntervalCount: 32;
  phaseSelectionScoreMmHgMl: number;
  measuredVolumeRangeMl: readonly [number, number];
  fitPoints: readonly MainWireIntegratedModelPeriodicPvaCurvePointV1[];
  curve: readonly MainWireIntegratedModelPeriodicPvaCurvePointV1[];
  interpolation: "piecewise-linear" | "shape-preserving-cubic-hermite";
  continuity: "C0" | "C1";
  displayExtrapolation: "none";
  /** Higher loads sampled at the selected clock, not a new PE/PVA boundary.
   * Preserve TBV ordering: a folded measured locus is not a single-valued P(V).
   * Null means a complete common-time continuation could not be observed. */
  highLoadIsochroneDisplay?: Readonly<{
    use: "measured-load-continuation-not-pva-owner";
    interpolation: "tbv-ordered-polyline";
    displayExtrapolation: "none";
    timeSinceAtrialCaptureSec: number;
    points: readonly (MainWireIntegratedModelPeriodicPvaCurvePointV1 & Readonly<{
      totalBloodVolumeMl: number;
    }>)[];
  }> | null;
  pressureEnvelopeDiagnostic: Readonly<{
    method: "phase-wise-maximum-pressure-envelope";
    use: "optional-display-and-single-phase-adequacy-diagnostic-not-pva-owner";
    curve: readonly MainWireIntegratedModelPeriodicPvaCurvePointV1[];
    timeSinceAtrialCaptureRangeSec: readonly [number, number];
    phase01AtAnchorRange: readonly [number, number];
    winningTimeByVolume: readonly Readonly<{
      volumeMl: number;
      timeSinceAtrialCaptureSec: number;
      phase01AtAnchor: number;
    }>[];
    excessAreaMmHgMl: number;
    excessAreaFraction: number;
  }>;
}>;

export type MainWireIntegratedModelPeriodicPvaEdpvrV1 = Readonly<{
  method: "density-weighted-exponential-maximum-volume-fit";
  scaleMmHg: number;
  exponentPerMl: number;
  zeroPressureVolumeMl: number;
  rSquared: number;
  measuredVolumeRangeMl: readonly [number, number];
  fitPoints: readonly MainWireIntegratedModelPeriodicPvaCurvePointV1[];
  parameterBoundaryHit: boolean;
  curve: readonly MainWireIntegratedModelPeriodicPvaCurvePointV1[];
}>;

type PeriodicPvaAnchorV1 = Readonly<{
  totalBloodVolumeMl: number;
  endDiastolicVolumeMl: number;
  endSystolicVolumeMl: number;
  acceptedBeatDurationSec: number;
  measuredHeartRateBpm: number;
}>;

type PeriodicPvaStrokeWorkV1 = Readonly<{
  method: "accepted-step-transmural-path-work";
  mmHgMl: number;
  joule: number;
}>;

type PeriodicPvaPotentialEnergyV1 = Readonly<{
  method: "area-between-nonlinear-espvr-and-nonnegative-edpvr-from-left-intersection-to-anchor-esv";
  leftIntersectionVolumeMl: number;
  measuredEspvrStartVolumeMl: number;
  lowVolumeTangentExtensionUsed: boolean;
  lowVolumeTangentExtensionSpanMl: number;
  mmHgMl: number;
  joule: number;
  /** V16 only. "measured-domain-intersection": P_es(V_min) <= P_ed(V_min), so the
   * left crossing is resolved inside measured support and nothing is extrapolated.
   * "endpoint-tangent-extension": the crossing lies below measured support. */
  lowVolumeTailAdmission?: "measured-domain-intersection" | "endpoint-tangent-extension";
  measuredStartPressureGapMmHg?: number;
}>;

type PeriodicPvaLimitationV1 =
  | "settled-preload-reduction-family-not-transient-venous-occlusion"
  | "maximum-volume-used-as-end-diastolic-proxy"
  | "common-isochrone-is-a-protocol-clock-not-a-common-land-state"
  | "common-isochrone-phase-selected-over-anchor-local-volume-neighborhood"
  | "pressure-envelope-retained-as-single-phase-approximation-diagnostic"
  | "measured-systolic-locus-is-not-extrapolated-for-display"
  | "low-volume-pva-tail-uses-endpoint-local-tangent-extension"
  | "low-volume-pva-tail-bounded-by-measured-domain-intersection"
  | "coronary-tone-held-at-source-during-preload-reduction"
  | "not-clinical-validation";

type PeriodicPvaAreaV1 = Readonly<{
  definition: "PVA = SW + PE";
  mmHgMl: number;
  joule: number;
}>;

export type MainWireIntegratedModelPeriodicPvaPreviewV1 = Readonly<{
  stage: "anchor" | "relations" | "pva";
  pointCount: number;
  anchor: PeriodicPvaAnchorV1 | null;
  strokeWork: PeriodicPvaStrokeWorkV1;
  espvr: MainWireIntegratedModelPeriodicPvaEspvrV1 | null;
  edpvr: MainWireIntegratedModelPeriodicPvaEdpvrV1 | null;
  potentialEnergy: PeriodicPvaPotentialEnergyV1 | null;
  pva: PeriodicPvaAreaV1 | null;
  estimatedMvo2: Mvo2Estimate | null;
}>;

/** Measured operational ED landmarks, distinct from the fitted energy boundary. */
export type MainWireDiastolicLoadRelationV1 = Readonly<{
  method: "settled-full-load-maximum-volume-locus-v1";
  displayExtrapolation: "none";
  completionStatus: "progressive" | "complete";
  sourcePointCount: number;
  excludedPointCount: number;
  /** TBV order, not volume order. Singletons are measured points, gaps stay gaps. */
  segments: readonly (readonly Readonly<{
    volumeMl: number;
    pressureMmHg: number;
    totalBloodVolumeMl: number;
    role: "operating-anchor" | "continuation";
  }>[])[];
}>;

/** Upper pressure envelope of the retained, protocol-conditioned PV family,
 * not Emax, an isovolumic capability law, or the PE/PVA integration boundary.
 * The display ends at the observed minimum-volume range: outside it, the
 * family may contain only early-ejection/filling states, not systolic support. */
export type MainWireSystolicPressureEnvelopeV1 = Readonly<{
  method: "settled-full-load-phasewise-pressure-envelope-v1";
  pressureBasis: "transmural";
  interpolation: "linear-time-and-adjacent-load-parametric-surface";
  volumeDomain: "observed-minimum-volume-range";
  displayExtrapolation: "none";
  completionStatus: "progressive" | "complete";
  sourcePointCount: number;
  excludedPointCount: number;
  /** One marker at each admitted load's observed minimum V. Its pressure is
   * evaluated on the envelope (including interpolation), not a raw landmark. */
  loadSupportPoints: readonly (MainWireIntegratedModelPeriodicPvaCurvePointV1 & Readonly<{
    minimumVolumeSourceTotalBloodVolumeMl: number;
    timeSinceAtrialCaptureSec: number;
    sourceTotalBloodVolumeRangeMl: readonly [number, number];
  }>)[];
  segments: readonly (readonly (MainWireIntegratedModelPeriodicPvaCurvePointV1 &
    Readonly<{
      timeSinceAtrialCaptureSec: number;
      sourceTotalBloodVolumeRangeMl: readonly [number, number];
    }>)[])[];
}>;

export type MainWirePvaAreaDisplayV1 = Readonly<{
  use: "separate-sw-and-pe-illustration-not-a-union-or-stored-energy-measurement";
  /** Sampled illustration only; accepted-step path work still owns SW. */
  strokeWorkLoop: readonly MainWireIntegratedModelPressureVolumeLoopPointV3[];
  /** Uses the numerical PE owner's quadrature nodes, including its local tail. */
  potentialEnergyStrip: readonly Readonly<{
    volumeMl: number;
    upperPressureMmHg: number;
    lowerPressureMmHg: number;
  }>[];
}>;

export type MainWirePeriodicPvaV1 = (
  | Readonly<{
      analysisId: typeof MAIN_WIRE_PERIODIC_PVA_V1_ID;
      methodId: MainWirePeriodicPvaMethodIdV1;
      status: "collecting" | "unavailable";
      ventricleId: MainWireIntegratedModelPeriodicPvaVentricleV1;
      pressureBasis: "transmural";
      progress: PeriodicPvaProgressV1;
      reason: string;
      preview: MainWireIntegratedModelPeriodicPvaPreviewV1 | null;
    }>
  | Readonly<{
      analysisId: typeof MAIN_WIRE_PERIODIC_PVA_V1_ID;
      methodId: MainWirePeriodicPvaMethodIdV1;
      outputId: string;
      status: "available";
      /** Displayable throughout refinement; this field only reports completion. */
      completionStatus: "progressive" | "complete";
      ventricleId: MainWireIntegratedModelPeriodicPvaVentricleV1;
      pressureBasis: "transmural";
      progress: PeriodicPvaProgressV1;
      source: Readonly<{
        protocolId: string;
        pointCount: number;
        familyProgress: PeriodicPvaProgressV1;
        primaryLineage: "persistent-worker-settled-hot-start-chain";
        slowControllerPolicy: "active-source-period1-then-coronary-tone-frozen";
        endDiastolicLandmark: "maximum-volume-proxy";
        endSystolicLandmark: "active-pressure-area-max-common-isochrone";
      }>;
      anchor: PeriodicPvaAnchorV1;
      strokeWork: PeriodicPvaStrokeWorkV1;
      espvr: MainWireIntegratedModelPeriodicPvaEspvrV1;
      edpvr: MainWireIntegratedModelPeriodicPvaEdpvrV1;
      potentialEnergy: PeriodicPvaPotentialEnergyV1;
      pva: PeriodicPvaAreaV1;
      estimatedMvo2: Mvo2Estimate | null;
      /** V8–V15 always list the tangent limitation; V16 lists it only when the
       * tangent was actually consumed, otherwise the measured-domain variant. */
      limitations: readonly PeriodicPvaLimitationV1[];
    }>
) & Readonly<{
  /** V13 measured display is independent of the numerical energy boundary. */
  loadRelations?: Readonly<{
    systolic: MainWireSystolicPressureEnvelopeV1 | null;
    diastolic: MainWireDiastolicLoadRelationV1 | null;
  }>;
  areaDisplay?: MainWirePvaAreaDisplayV1;
}>;

type SystolicPressureLawV1 = Readonly<{
  kind: "piecewise-linear" | "shape-preserving-cubic-hermite";
  points: readonly MainWireIntegratedModelPeriodicPvaCurvePointV1[];
  tangentsMmHgPerMl: readonly number[];
  measuredVolumeRangeMl: readonly [number, number];
}>;

type IsochronalPressureCandidateV1 = Readonly<{
  timeSinceAtrialCaptureSec: number;
  phase01AtAnchor: number;
  activePressureAreaMmHgMl: number;
  activePressureAreaVolumeRangeMl: readonly [number, number];
  law: SystolicPressureLawV1;
  points: readonly MainWireIntegratedModelPeriodicPvaCurvePointV1[];
}>;

type AreaMaxCommonIsochroneV1 = Readonly<{
  selected: IsochronalPressureCandidateV1;
  integrationVolumeRangeMl: readonly [number, number];
  candidateTimeRangeSec: readonly [number, number];
  candidatePhaseRange01: readonly [number, number];
  anchorLandmarks: Readonly<{
    maximumPressurePhase01: number;
    endSystolicPhase01: number;
  }>;
  pressureEnvelope: MainWireIntegratedModelPeriodicPvaEspvrV1["pressureEnvelopeDiagnostic"];
}>;

type ExponentialFitV1 = Readonly<{
  scale: number;
  exponent: number;
  volumeOffset: number;
  rSquared: number;
  parameterBoundaryHit: boolean;
}>;

/** Published V8 semantics retained for Surfaces that already pin this method. */
export function buildMainWirePeriodicPvaMethodV8(
  locus: MainWireIntegratedModelStarlingLocusV3,
  ventricleId: MainWireIntegratedModelPeriodicPvaVentricleV1,
): MainWirePeriodicPvaV1 {
  return buildMainWirePeriodicPvaByPolicyV1(locus, ventricleId, {
    methodId: MAIN_WIRE_PERIODIC_PVA_METHOD_V8_ID,
    systolicLoadDomain: "all-settled-loads",
  });
}

/**
 * Uses the conventional preload-reduction limb through the operating anchor
 * for ESPVR. Hypervolemic points remain owners of EDPVR and preload-reserve
 * information, but cannot fold the systolic display locus after ESV saturates.
 */
export function buildMainWirePeriodicPvaMethodV9(
  locus: MainWireIntegratedModelStarlingLocusV3,
  ventricleId: MainWireIntegratedModelPeriodicPvaVentricleV1,
): MainWirePeriodicPvaV1 {
  return buildMainWirePeriodicPvaByPolicyV1(locus, ventricleId, {
    methodId: MAIN_WIRE_PERIODIC_PVA_METHOD_V9_ID,
    systolicLoadDomain: "preload-reduction-through-anchor",
  });
}

/** V9 numerical owner, with observed higher-load continuation kept visible. */
export function buildMainWirePeriodicPvaMethodV10(
  locus: MainWireIntegratedModelStarlingLocusV3,
  ventricleId: MainWireIntegratedModelPeriodicPvaVentricleV1,
): MainWirePeriodicPvaV1 {
  return buildMainWirePeriodicPvaByPolicyV1(locus, ventricleId, {
    methodId: MAIN_WIRE_PERIODIC_PVA_METHOD_V10_ID,
    systolicLoadDomain: "preload-reduction-through-anchor",
    showMeasuredHighLoadIsochrone: true,
  });
}

/** V10 numerical policy, separate load-response and energy presentations.
 * Reuses the same settled family; no new sweep or exact-model change. */
export function buildMainWirePeriodicPvaMethodV13(
  locus: MainWireIntegratedModelStarlingLocusV3,
  ventricleId: MainWireIntegratedModelPeriodicPvaVentricleV1,
): MainWirePeriodicPvaV1 {
  return buildMeasuredLoadPva(locus, ventricleId, MAIN_WIRE_PERIODIC_PVA_METHOD_V13_ID);
}

/** Same PVA, PE and display policy; only the literature MVO2 mass owner changes.
 * Missing anatomy makes that estimate unavailable, not the PV analysis. */
export function buildMainWirePeriodicPvaMethodV14(
  locus: MainWireIntegratedModelStarlingLocusV3,
  ventricleId: MainWireIntegratedModelPeriodicPvaVentricleV1,
): MainWirePeriodicPvaV1 {
  return buildMeasuredLoadPva(locus, ventricleId, MAIN_WIRE_PERIODIC_PVA_METHOD_V14_ID);
}

/** Same energy/display equations, separately pinned to the new measured family.
 * Delegation preserves the V14 exact-anatomy MVO2 convention. Sealed Snapshots
 * still pin this method: its output, including the V14 nested MVO2 provenance,
 * is retained verbatim. */
export function buildMainWirePeriodicPvaMethodV15(
  locus: MainWireIntegratedModelStarlingLocusV3,
  ventricleId: MainWireIntegratedModelPeriodicPvaVentricleV1,
): MainWirePeriodicPvaV1 {
  assertPressureCrossingFamilyV1(locus);
  return Object.freeze({ ...buildMeasuredLoadPva(locus, ventricleId, MAIN_WIRE_PERIODIC_PVA_METHOD_V14_ID,
    { exactIntersectionEndpoint: true }), methodId: MAIN_WIRE_PERIODIC_PVA_METHOD_V15_ID });
}

/** V15 with bounded PE-tail admission. When the measured ESPVR already sits at
 * or below the EDPVR at its lowest measured volume, the left intersection is
 * searched inside measured support and no tangent is required or evaluated.
 * Whenever V15 admits with a positive measured-start gap, V16 is numerically
 * identical. The method ID, exact-anatomy MVO2 owner and nested MVO2
 * provenance are all pinned to V16 directly. */
export function buildMainWirePeriodicPvaMethodV16(
  locus: MainWireIntegratedModelStarlingLocusV3,
  ventricleId: MainWireIntegratedModelPeriodicPvaVentricleV1,
): MainWirePeriodicPvaV1 {
  assertPressureCrossingFamilyV1(locus);
  return buildMeasuredLoadPva(locus, ventricleId, MAIN_WIRE_PERIODIC_PVA_METHOD_V16_ID,
    { exactIntersectionEndpoint: true, lowVolumeTailPolicy: "measured-domain-first" });
}

function assertPressureCrossingFamilyV1(locus: MainWireIntegratedModelStarlingLocusV3): void {
  if (locus.status !== "measured-fixed-tbv-protocol" || locus.protocolId !== MAIN_WIRE_PRESSURE_CROSSING_PV_PROTOCOL_V1_ID)
    throw new Error("Pressure-crossing PVA requires its pinned measured protocol, not a legacy family");
}

/** Same energy equations as V16, separately pinned to an explicitly frozen
 * respiratory intervention. Never relabel a breathing or legacy PV family. */
export function buildCardiorespiratoryMechanicalPvaV1(
  locus: MainWireIntegratedModelStarlingLocusV3,
  ventricleId: MainWireIntegratedModelPeriodicPvaVentricleV1,
): MainWirePeriodicPvaV1 {
  if (locus.status !== "measured-fixed-tbv-protocol" || locus.protocolId !== CARDIORESPIRATORY_MECHANICAL_PROTOCOL_V1_ID)
    throw new Error("Fixed respiratory PVA requires its own measured mechanical protocol");
  return buildMeasuredLoadPva(locus, ventricleId, CARDIORESPIRATORY_MECHANICAL_PVA_V1_ID,
    { exactIntersectionEndpoint: true, lowVolumeTailPolicy: "measured-domain-first" });
}

function buildMeasuredLoadPva(locus: MainWireIntegratedModelStarlingLocusV3,
  ventricleId: MainWireIntegratedModelPeriodicPvaVentricleV1,
  methodId: typeof MAIN_WIRE_PERIODIC_PVA_METHOD_V13_ID | typeof MAIN_WIRE_PERIODIC_PVA_METHOD_V14_ID
    | typeof MAIN_WIRE_PERIODIC_PVA_METHOD_V16_ID | typeof CARDIORESPIRATORY_MECHANICAL_PVA_V1_ID,
  options: Readonly<{ exactIntersectionEndpoint?: boolean; lowVolumeTailPolicy?: "measured-domain-first" }> = {},
): MainWirePeriodicPvaV1 {
  const pva = buildMainWirePeriodicPvaByPolicyV1(locus, ventricleId, {
    methodId,
    systolicLoadDomain: "preload-reduction-through-anchor",
    showMeasuredHighLoadIsochrone: true,
    includeAreaDisplay: true,
    exactIntersectionEndpoint: options.exactIntersectionEndpoint ?? false,
    // V13 keeps the normal-adult literature mass; V14/V15/V16 use exact anatomy.
    exactAnatomyMvo2: methodId !== MAIN_WIRE_PERIODIC_PVA_METHOD_V13_ID,
    ...(options.lowVolumeTailPolicy === undefined ? {} : { lowVolumeTailPolicy: options.lowVolumeTailPolicy }),
  });
  return Object.freeze({ ...pva, loadRelations: Object.freeze({
    systolic: buildMainWireSystolicPressureEnvelopeV1(locus),
    diastolic: buildMainWireDiastolicLoadRelationV1(locus),
  }) });
}

/** An operational ED load locus, not a fully relaxed passive constitutive law.
 * A lower envelope would mix relaxation/suction phases and select different
 * histories. Keep the exact maximum-volume landmark explicit; do not silently
 * replace the numerical EDPVR used by PE/PVA or fit away a measured fold. */
export function buildMainWireDiastolicLoadRelationV1(
  locus: MainWireIntegratedModelStarlingLocusV3,
): MainWireDiastolicLoadRelationV1 | null {
  if (locus.status !== "measured-fixed-tbv-protocol") return null;
  const ordered = [...locus.points].sort((a, b) => a.totalBloodVolumeMl - b.totalBloodVolumeMl);
  type Point = MainWireDiastolicLoadRelationV1["segments"][number][number];
  const segments: Point[][] = [];
  let segment: Point[] = [];
  let excludedPointCount = 0;
  for (const [index, point] of ordered.entries()) {
    const { totalBloodVolumeMl, role, ventricularPressureVolumeLandmarks: landmarks } = point;
    const ed = landmarks.endDiastolic;
    if (!point.settled || !point.curveEligible || point.quality !== "locally-converged"
      || !point.finiteAndFixedTbvPassed || landmarks.pressureBasis !== "transmural"
      || ed.event !== "maximum-volume" || !Number.isFinite(ed.volumeMl) || ed.volumeMl <= 0
      || !Number.isFinite(ed.pressureMmHg) || !Number.isFinite(totalBloodVolumeMl) || totalBloodVolumeMl <= 0
      || ordered[index - 1]?.totalBloodVolumeMl === totalBloodVolumeMl
      || ordered[index + 1]?.totalBloodVolumeMl === totalBloodVolumeMl) {
      if (segment.length) segments.push(segment);
      segment = [];
      excludedPointCount += 1;
      continue;
    }
    segment.push(Object.freeze({ volumeMl: ed.volumeMl, pressureMmHg: ed.pressureMmHg, totalBloodVolumeMl, role }));
  }
  if (segment.length) segments.push(segment);
  const sourcePointCount = segments.reduce((sum, run) => sum + run.length, 0);
  if (!sourcePointCount) return null;
  return Object.freeze({ method: "settled-full-load-maximum-volume-locus-v1" as const,
    displayExtrapolation: "none" as const,
    completionStatus: locus.completedPointCount === locus.totalPointCount ? "complete" as const : "progressive" as const,
    sourcePointCount, excludedPointCount,
    segments: Object.freeze(segments.map((run) => Object.freeze(run))),
  });
}

export function buildMainWireSystolicPressureEnvelopeV1(
  locus: MainWireIntegratedModelStarlingLocusV3,
): MainWireSystolicPressureEnvelopeV1 | null {
  if (locus.status !== "measured-fixed-tbv-protocol") return null;
  const ordered = [...locus.points].sort((a, b) => a.totalBloodVolumeMl - b.totalBloodVolumeMl);
  type Point = MainWireSystolicPressureEnvelopeV1["segments"][number][number];
  const runs: MainWireIntegratedModelStarlingPointV3[][] = [];
  let run: MainWireIntegratedModelStarlingPointV3[] = [];
  let excludedPointCount = 0;
  for (const [index, point] of ordered.entries()) {
    const { totalBloodVolumeMl, ventricularPressureVolumeLandmarks: landmarks } = point;
    if (!point.settled || !point.curveEligible || point.quality !== "locally-converged"
      || !point.finiteAndFixedTbvPassed || landmarks.pressureBasis !== "transmural"
      || !Number.isFinite(totalBloodVolumeMl) || !(totalBloodVolumeMl > 0)
      || point.ventricularPressureVolumeLoop.some(({ volumeMl }) => !(volumeMl > 0))
      || interpolateLoopAtTimeV1(point.ventricularPressureVolumeLoop, point.acceptedBeatDurationSec, 0) === null
      || ordered[index - 1]?.totalBloodVolumeMl === totalBloodVolumeMl
      || ordered[index + 1]?.totalBloodVolumeMl === totalBloodVolumeMl) {
      if (run.length > 1) runs.push(run);
      else excludedPointCount += run.length; // An isolated load cannot support a load/time cell.
      run = [];
      excludedPointCount += 1;
      continue;
    }
    run.push(point);
  }
  if (run.length > 1) runs.push(run);
  else excludedPointCount += run.length;
  if (runs.length === 0) return null;

  // Adjacent TBV branches only; never sort a folded isochrone by V and join
  // unrelated loads. Every cell is linear in time along each retained path
  // and linear in load at a common atrial-capture clock.
  type Cell = Readonly<{
    start: readonly [MainWireIntegratedModelPeriodicPvaCurvePointV1, MainWireIntegratedModelPeriodicPvaCurvePointV1];
    end: readonly [MainWireIntegratedModelPeriodicPvaCurvePointV1, MainWireIntegratedModelPeriodicPvaCurvePointV1];
    timeRange: readonly [number, number];
    tbvRange: readonly [number, number];
  }>;
  const cells: Cell[] = [];
  const ranges = runs.map((points) => {
    const minima = points.map((point) => Math.min(...point.ventricularPressureVolumeLoop.map(({ volumeMl }) => volumeMl)));
    for (let i = 1; i < points.length; i += 1) {
      const pair = [points[i - 1]!, points[i]!] as const;
      const endTime = Math.min(...pair.map((point) => point.acceptedBeatDurationSec!)) * (1 - 1e-12);
      const times = [...new Set([0, endTime, ...pair.flatMap((point) =>
        point.ventricularPressureVolumeLoop.map(({ phase01 }) => phase01! * point.acceptedBeatDurationSec!)
          .filter((time) => time > 0 && time < endTime))])].sort((a, b) => a - b);
      const samples = times.map((time) => pair.map((point) =>
        interpolateLoopAtTimeV1(point.ventricularPressureVolumeLoop, point.acceptedBeatDurationSec, time)!));
      for (let t = 1; t < times.length; t += 1) {
        cells.push({ start: [samples[t - 1]![0]!, samples[t - 1]![1]!],
          end: [samples[t]![0]!, samples[t]![1]!], timeRange: [times[t - 1]!, times[t]!],
          tbvRange: [pair[0].totalBloodVolumeMl, pair[1].totalBloodVolumeMl] });
      }
    }
    return [Math.min(...minima), Math.max(...minima)] as [number, number];
  }).filter(([lo, hi]) => hi > lo).sort((a, b) => a[0] - b[0]);
  // Preserve unsupported gaps; do not draw across an excluded load.
  const coverage: [number, number][] = [];
  for (const [lo, hi] of ranges) {
    const last = coverage.at(-1);
    if (last && lo <= last[1]) last[1] = Math.max(last[1], hi);
    else coverage.push([lo, hi]);
  }
  const envelopeAtVolume = (volumeMl: number): Point | null => {
    let winner: Point | null = null;
    for (const cell of cells) {
      const peak = maximumPressureInLoadTimeCellV1(cell.start, cell.end, volumeMl);
      if (peak && (!winner || peak.pressureMmHg > winner.pressureMmHg)) {
        winner = Object.freeze({ volumeMl, pressureMmHg: peak.pressureMmHg,
          timeSinceAtrialCaptureSec: cell.timeRange[0] + peak.timeFraction * (cell.timeRange[1] - cell.timeRange[0]),
          sourceTotalBloodVolumeRangeMl: Object.freeze(cell.tbvRange) });
      }
    }
    return winner;
  };
  const segments: Point[][] = [];
  for (const [lo, hi] of coverage) {
    let segment: Point[] = [];
    for (let i = 0; i <= CURVE_SAMPLE_COUNT_V1; i += 1) {
      const volumeMl = lo + (hi - lo) * i / CURVE_SAMPLE_COUNT_V1;
      const winner = envelopeAtVolume(volumeMl);
      if (winner) segment.push(winner);
      else {
        if (segment.length > 1) segments.push(segment);
        segment = [];
      }
    }
    if (segment.length > 1) segments.push(segment);
  }
  if (segments.length === 0) return null;
  const loadSupportPoints = runs.flatMap((points) => points.flatMap((point) => {
    const volumeMl = Math.min(...point.ventricularPressureVolumeLoop.map((sample) => sample.volumeMl));
    if (!segments.some((segment) => volumeMl >= segment[0]!.volumeMl && volumeMl <= segment.at(-1)!.volumeMl)) return [];
    const envelope = envelopeAtVolume(volumeMl);
    return envelope ? [Object.freeze({ ...envelope,
      minimumVolumeSourceTotalBloodVolumeMl: point.totalBloodVolumeMl })] : [];
  }));
  return Object.freeze({
    method: "settled-full-load-phasewise-pressure-envelope-v1" as const,
    pressureBasis: "transmural" as const,
    interpolation: "linear-time-and-adjacent-load-parametric-surface" as const,
    volumeDomain: "observed-minimum-volume-range" as const,
    displayExtrapolation: "none" as const,
    completionStatus: locus.completedPointCount >= locus.totalPointCount ? "complete" : "progressive",
    sourcePointCount: runs.reduce((sum, points) => sum + points.length, 0),
    excludedPointCount,
    loadSupportPoints: Object.freeze(loadSupportPoints),
    segments: Object.freeze(segments.map((points) => Object.freeze(points))),
  });
}

/** At fixed V, pressure inside a bilinear load/time cell is quadratic/linear
 * in time. Its maximum is at a boundary, a V-crossing, or a derivative root.
 * Checking these avoids a second arbitrary time grid and missed narrow peaks.
 * This is exact for the retained piecewise-linear paths, not for the ODE. */
function maximumPressureInLoadTimeCellV1(
  start: readonly [MainWireIntegratedModelPeriodicPvaCurvePointV1, MainWireIntegratedModelPeriodicPvaCurvePointV1],
  end: readonly [MainWireIntegratedModelPeriodicPvaCurvePointV1, MainWireIntegratedModelPeriodicPvaCurvePointV1],
  volumeMl: number,
): Readonly<{ pressureMmHg: number; timeFraction: number }> | null {
  const [a, b] = start, [c, d] = end;
  const tolerance = 1e-9 * Math.max(1, Math.abs(volumeMl));
  if (volumeMl < Math.min(a.volumeMl, b.volumeMl, c.volumeMl, d.volumeMl) - tolerance
    || volumeMl > Math.max(a.volumeMl, b.volumeMl, c.volumeMl, d.volumeMl) + tolerance) return null;
  const av = c.volumeMl - a.volumeMl, bv = d.volumeMl - b.volumeMl;
  const ap = c.pressureMmHg - a.pressureMmHg, bp = d.pressureMmHg - b.pressureMmHg;
  const d0 = b.volumeMl - a.volumeMl, d1 = bv - av;
  const p0 = b.pressureMmHg - a.pressureMmHg, p1 = bp - ap;
  const offset = volumeMl - a.volumeMl;
  const n0 = a.pressureMmHg * d0 + offset * p0;
  const n1 = a.pressureMmHg * d1 + ap * d0 + offset * p1 - av * p0;
  const n2 = ap * d1 - av * p1;
  const times = [0, 1,
    ...quadraticRootsV1(n2 * d1, 2 * n2 * d0, n1 * d0 - n0 * d1)];
  if (av !== 0) times.push((volumeMl - a.volumeMl) / av);
  if (bv !== 0) times.push((volumeMl - b.volumeMl) / bv);
  let winner: { pressureMmHg: number; timeFraction: number } | null = null;
  for (const timeFraction of times) {
    if (!Number.isFinite(timeFraction) || timeFraction < 0 || timeFraction > 1) continue;
    const va = a.volumeMl + av * timeFraction, vb = b.volumeMl + bv * timeFraction;
    if (volumeMl < Math.min(va, vb) - tolerance || volumeMl > Math.max(va, vb) + tolerance) continue;
    const pa = a.pressureMmHg + ap * timeFraction, pb = b.pressureMmHg + bp * timeFraction;
    const pressureMmHg = Math.abs(vb - va) <= tolerance ? Math.max(pa, pb)
      : pa + Math.max(0, Math.min(1, (volumeMl - va) / (vb - va))) * (pb - pa);
    if (Number.isFinite(pressureMmHg) && (!winner || pressureMmHg > winner.pressureMmHg)) {
      winner = { pressureMmHg, timeFraction };
    }
  }
  return winner;
}

function quadraticRootsV1(a: number, b: number, c: number): readonly number[] {
  const scale = Math.max(Math.abs(a), Math.abs(b), Math.abs(c));
  if (scale === 0) return [];
  a /= scale; b /= scale; c /= scale;
  if (Math.abs(a) < 1e-14) return Math.abs(b) < 1e-14 ? [] : [-c / b];
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return [];
  const q = -0.5 * (b + (b < 0 ? -1 : 1) * Math.sqrt(discriminant));
  return q === 0 ? [-b / (2 * a)] : [q / a, c / q];
}

function projectEdpvrV1(
  fit: ExponentialFitV1,
  points: readonly MainWireIntegratedModelPeriodicPvaCurvePointV1[],
  range: readonly [number, number],
): MainWireIntegratedModelPeriodicPvaEdpvrV1 {
  return Object.freeze({
    method: "density-weighted-exponential-maximum-volume-fit" as const,
    scaleMmHg: fit.scale, exponentPerMl: fit.exponent, zeroPressureVolumeMl: fit.volumeOffset,
    rSquared: fit.rSquared, measuredVolumeRangeMl: range,
    fitPoints: Object.freeze(points.map((point) => Object.freeze({ ...point }))),
    parameterBoundaryHit: fit.parameterBoundaryHit,
    curve: sampleCurveV1(fit.volumeOffset, range[1], (volumeMl) => nonnegativeExponentialPressureV1(fit, volumeMl)),
  });
}

function buildMainWirePeriodicPvaByPolicyV1(
  locus: MainWireIntegratedModelStarlingLocusV3,
  ventricleId: MainWireIntegratedModelPeriodicPvaVentricleV1,
  method: Readonly<{
    methodId: MainWirePeriodicPvaMethodIdV1;
    systolicLoadDomain:
      | "all-settled-loads"
      | "preload-reduction-through-anchor";
    showMeasuredHighLoadIsochrone?: boolean;
    includeAreaDisplay?: boolean;
    exactIntersectionEndpoint?: boolean;
    exactAnatomyMvo2?: boolean;
    /** Default: the endpoint tangent is required unconditionally (V8–V15). */
    lowVolumeTailPolicy?: "measured-domain-first";
  }>,
): MainWirePeriodicPvaV1 {
  const familyProgress: PeriodicPvaProgressV1 = Object.freeze({
    completedPointCount:
      "completedPointCount" in locus ? locus.completedPointCount : 0,
    totalPointCount: "totalPointCount" in locus ? locus.totalPointCount : 0,
  });
  let progress = familyProgress;
  const incomplete = (
    status: "collecting" | "unavailable",
    reason: string,
    preview: MainWireIntegratedModelPeriodicPvaPreviewV1 | null = null,
  ): MainWirePeriodicPvaV1 =>
    Object.freeze({
      analysisId: MAIN_WIRE_PERIODIC_PVA_V1_ID,
      methodId: method.methodId,
      status,
      ventricleId,
      pressureBasis: "transmural" as const,
      progress,
      reason,
      preview,
    });

  if (locus.status !== "measured-fixed-tbv-protocol") {
    return incomplete(
      "unavailable",
      "PVA requires the settled fixed-tone preload-reduction analysis",
    );
  }
  const anchor = locus.points.find(({ role }) => role === "operating-anchor");
  if (anchor === undefined) {
    return incomplete(
      "unavailable",
      "The operating load anchor is unavailable",
    );
  }
  const tbvToleranceMl = Math.max(
    1e-6,
    Math.abs(anchor.totalBloodVolumeMl) * 1e-12,
  );
  const relationPoints = Object.freeze(
    [...locus.points].sort(
      (left, right) => right.totalBloodVolumeMl - left.totalBloodVolumeMl,
    ),
  );
  const systolicRelationPoints = method.systolicLoadDomain ===
      "preload-reduction-through-anchor"
    ? Object.freeze(relationPoints.filter(
      ({ totalBloodVolumeMl }) =>
        totalBloodVolumeMl <= anchor.totalBloodVolumeMl + tbvToleranceMl,
    ))
    : relationPoints;
  const lowerPointCount = relationPoints.filter(
    ({ totalBloodVolumeMl }) =>
      totalBloodVolumeMl < anchor.totalBloodVolumeMl - tbvToleranceMl,
  ).length;
  const higherPointCount = relationPoints.filter(
    ({ totalBloodVolumeMl }) =>
      totalBloodVolumeMl > anchor.totalBloodVolumeMl + tbvToleranceMl,
  ).length;
  const bilateralPreviewReady = lowerPointCount >= 1 && higherPointCount >= 1;
  const minimumPvaFamilyReady =
    lowerPointCount >= PHASE_SELECTION_LOWER_POINT_COUNT_V1 &&
    higherPointCount >= PHASE_SELECTION_HIGHER_POINT_COUNT_V1;
  progress = Object.freeze({
    completedPointCount: Math.min(
      MINIMUM_PVA_PREVIEW_POINT_COUNT_V1,
      1 +
        Math.min(PHASE_SELECTION_LOWER_POINT_COUNT_V1, lowerPointCount) +
        Math.min(PHASE_SELECTION_HIGHER_POINT_COUNT_V1, higherPointCount),
    ),
    totalPointCount: MINIMUM_PVA_PREVIEW_POINT_COUNT_V1,
  });
  const strokeWorkMmHgMl = anchor.acceptedTransmuralPathWorkMmHgMl;
  if (
    strokeWorkMmHgMl === undefined ||
    !Number.isFinite(strokeWorkMmHgMl) ||
    !(strokeWorkMmHgMl > 0)
  ) {
    return incomplete(
      "unavailable",
      "The anchor beat does not retain positive finite accepted-step SW",
    );
  }
  const strokeWork = Object.freeze({
    method: "accepted-step-transmural-path-work" as const,
    mmHgMl: strokeWorkMmHgMl,
    joule: strokeWorkMmHgMl * MMHG_ML_TO_JOULE_V1,
  });
  const anchorPreview: MainWireIntegratedModelPeriodicPvaPreviewV1 =
    Object.freeze({
      stage: "anchor" as const,
      pointCount: relationPoints.length,
      anchor: null,
      strokeWork,
      espvr: null,
      edpvr: null,
      potentialEnergy: null,
      pva: null,
      estimatedMvo2: null,
    });
  if (
    relationPoints.length < MINIMUM_RELATION_PREVIEW_POINT_COUNT_V1 ||
    !bilateralPreviewReady
  ) {
    return incomplete(
      "collecting",
      `${relationPoints.length} settled points; the anchor plus one lower- and one higher-preload point are required for relation preview`,
      anchorPreview,
    );
  }
  const diastolic = relationPoints
    .map(
      ({ ventricularPressureVolumeLandmarks }) =>
        ventricularPressureVolumeLandmarks.endDiastolic,
    )
    .filter(({ pressureMmHg }) => pressureMmHg > 0.05);
  const edpvr = exponentialFitV1(diastolic);
  if (
    diastolic.length < MINIMUM_RELATION_PREVIEW_POINT_COUNT_V1 ||
    edpvr === null
  ) {
    return incomplete(
      locus.completedPointCount === locus.totalPointCount
        ? "unavailable"
        : "collecting",
      "Positive-pressure filling landmarks do not define the full-family EDPVR",
      anchorPreview,
    );
  }
  const areaMaxIsochrone = areaMaxCommonIsochroneV1(
    systolicRelationPoints,
    edpvr,
    anchor,
    method.systolicLoadDomain === "preload-reduction-through-anchor"
      ? "lower-through-anchor"
      : "bilateral",
  );
  if (areaMaxIsochrone === null) {
    return incomplete(
      locus.completedPointCount === locus.totalPointCount
        ? "unavailable"
        : "collecting",
      "Settled phased loops do not cover the fixed anchor-ESV neighborhood within the anchor late-systolic window",
      anchorPreview,
    );
  }
  const systolicLaw = areaMaxIsochrone.selected.law;
  const anchorEndSystolic = interpolateLoopAtTimeV1(
    anchor.ventricularPressureVolumeLoop,
    anchor.acceptedBeatDurationSec,
    areaMaxIsochrone.selected.timeSinceAtrialCaptureSec,
  );
  const anchorEndDiastolic =
    anchor.ventricularPressureVolumeLandmarks.endDiastolic;
  const acceptedBeatDurationSec = anchor.acceptedBeatDurationSec;
  if (
    anchorEndSystolic === null ||
    acceptedBeatDurationSec === undefined ||
    !Number.isFinite(acceptedBeatDurationSec) ||
    !(acceptedBeatDurationSec > 0)
  ) {
    return incomplete(
      "unavailable",
      "The anchor beat does not retain accepted-step SW, duration, and the selected common isochrone time",
      anchorPreview,
    );
  }
  if (
    !systolicLawStrictlyIncreasingThroughVolumeV1(
      systolicLaw,
      method.systolicLoadDomain === "preload-reduction-through-anchor"
        ? systolicLaw.measuredVolumeRangeMl[1]
        : anchorEndSystolic.volumeMl,
    )
  ) {
    return incomplete(
      locus.completedPointCount === locus.totalPointCount
        ? "unavailable"
        : "collecting",
      method.systolicLoadDomain === "preload-reduction-through-anchor"
        ? "The preload-reduction ESPVR is not strictly increasing through the operating anchor"
        : "The fixed-phase ESPVR is not strictly increasing over the low-volume-to-anchor PVA domain",
      anchorPreview,
    );
  }
  const systolicRange = systolicLaw.measuredVolumeRangeMl;
  const diastolicRange = finiteRangeV1(
    diastolic.map(({ volumeMl }) => volumeMl),
  )!;
  const espvrProjection: MainWireIntegratedModelPeriodicPvaEspvrV1 =
    Object.freeze({
      primaryMethod: "active-pressure-area-max-common-isochrone" as const,
      primaryCurveLaw: "measured-domain-shape-preserving-locus" as const,
      selectedTimeSinceAtrialCaptureSec:
        areaMaxIsochrone.selected.timeSinceAtrialCaptureSec,
      selectedPhase01AtAnchor: areaMaxIsochrone.selected.phase01AtAnchor,
      phaseSelectionPolicy:
        method.systolicLoadDomain === "preload-reduction-through-anchor"
          ? "preload-reduction-through-anchor-over-lower-anchor-esv-neighborhood-within-anchor-late-systolic-window" as const
          : "all-settled-loads-over-fixed-anchor-esv-neighborhood-within-anchor-late-systolic-window" as const,
      phaseSelectionStatus:
        locus.completedPointCount >= locus.totalPointCount
          ? ("complete" as const)
          : ("progressive" as const),
      phaseSelectionPointCount: systolicRelationPoints.length,
      phaseSelectionObjective:
        "positive-active-pressure-area-over-fixed-anchor-esv-neighborhood" as const,
      phaseSelectionIntegrationVolumeRangeMl:
        areaMaxIsochrone.integrationVolumeRangeMl,
      phaseSelectionCandidateTimeRangeSec:
        areaMaxIsochrone.candidateTimeRangeSec,
      phaseSelectionCandidatePhaseRange01:
        areaMaxIsochrone.candidatePhaseRange01,
      phaseSelectionAnchorLandmarks: areaMaxIsochrone.anchorLandmarks,
      phaseSelectionCoarseTimeSampleCount:
        PHASE_SELECTION_COARSE_TIME_SAMPLE_COUNT_V1,
      phaseSelectionLocalRefinementIntervalCount:
        SYSTOLIC_TIME_LOCAL_REFINEMENT_INTERVAL_COUNT_V1,
      phaseSelectionScoreMmHgMl:
        areaMaxIsochrone.selected.activePressureAreaMmHgMl,
      measuredVolumeRangeMl: systolicRange,
      fitPoints: systolicLaw.points,
      curve: sampleShapePreservingCurveV1(systolicLaw),
      interpolation: systolicLaw.kind,
      continuity:
        systolicLaw.kind === "shape-preserving-cubic-hermite"
          ? ("C1" as const)
          : ("C0" as const),
      displayExtrapolation: "none" as const,
      ...(method.showMeasuredHighLoadIsochrone ? {
        highLoadIsochroneDisplay: measuredHighLoadIsochroneDisplayV1(
          relationPoints, anchor, areaMaxIsochrone.selected.timeSinceAtrialCaptureSec,
        ),
      } : {}),
      pressureEnvelopeDiagnostic: areaMaxIsochrone.pressureEnvelope,
    });
  const edpvrProjection: MainWireIntegratedModelPeriodicPvaEdpvrV1 =
    projectEdpvrV1(edpvr, diastolic, diastolicRange);
  const anchorProjection: PeriodicPvaAnchorV1 = Object.freeze({
    totalBloodVolumeMl: anchor.totalBloodVolumeMl,
    endDiastolicVolumeMl: anchorEndDiastolic.volumeMl,
    endSystolicVolumeMl: anchorEndSystolic.volumeMl,
    acceptedBeatDurationSec,
    measuredHeartRateBpm: 60 / acceptedBeatDurationSec,
  });
  const relationsPreview: MainWireIntegratedModelPeriodicPvaPreviewV1 =
    Object.freeze({
      stage: "relations" as const,
      pointCount: relationPoints.length,
      anchor: anchorProjection,
      strokeWork,
      espvr: espvrProjection,
      edpvr: edpvrProjection,
      potentialEnergy: null,
      pva: null,
      estimatedMvo2: null,
    });
  if (!minimumPvaFamilyReady) {
    return incomplete(
      "collecting",
      `${relationPoints.length} settled points; the anchor plus three lower- and one higher-preload point are required before PVA is admitted`,
      relationsPreview,
    );
  }
  // Bounded tail (V16): when the measured ESPVR is already at or below the
  // EDPVR at its lowest measured volume, the left crossing lies inside measured
  // support. Search from V_min and never evaluate an extrapolation. Otherwise,
  // and always for V8–V15, the endpoint tangent must exist before PE is admitted.
  const measuredStartPressureGapMmHg =
    systolicPressureV1(systolicLaw, systolicRange[0]) -
    nonnegativeExponentialPressureV1(edpvr, systolicRange[0]);
  const measuredDomainIntersection =
    method.lowVolumeTailPolicy === "measured-domain-first" &&
    Number.isFinite(measuredStartPressureGapMmHg) &&
    measuredStartPressureGapMmHg <= 0;
  const lowVolumeExtension = measuredDomainIntersection
    ? null
    : lowVolumeTangentExtensionV1(systolicLaw);
  if (!measuredDomainIntersection && lowVolumeExtension === null) {
    return incomplete(
      locus.completedPointCount === locus.totalPointCount
        ? "unavailable"
        : "collecting",
      "The nonlinear ESPVR does not define a positive finite low-volume tangent for the unresolved PE tail",
      relationsPreview,
    );
  }
  const systolicBoundaryPressureMmHg = (volumeMl: number) =>
    lowVolumeExtension === null
      ? systolicPressureV1(systolicLaw, volumeMl)
      : nonlinearPvaBoundaryPressureV1(systolicLaw, lowVolumeExtension, volumeMl);
  const peLeftIntersectionVolumeMl = pressureRelationsLeftIntersectionV1(
    systolicBoundaryPressureMmHg,
    edpvr,
    lowVolumeExtension === null
      ? systolicRange[0]
      : Math.max(0, lowVolumeExtension.zeroPressureVolumeMl),
    anchorEndSystolic.volumeMl,
    method.exactIntersectionEndpoint,
  );
  if (peLeftIntersectionVolumeMl === null) {
    return incomplete(
      locus.completedPointCount === locus.totalPointCount
        ? "unavailable"
        : "collecting",
      "PE requires one left ESPVR–EDPVR intersection followed by P_es > P_ed through anchor ESV",
      relationsPreview,
    );
  }
  const potentialEnergyMmHgMl = pressureDifferenceAreaV1(
    systolicBoundaryPressureMmHg,
    (volumeMl) => nonnegativeExponentialPressureV1(edpvr, volumeMl),
    peLeftIntersectionVolumeMl,
    anchorEndSystolic.volumeMl,
  );
  const pvaMmHgMl = strokeWorkMmHgMl + potentialEnergyMmHgMl;
  if (
    ![
      peLeftIntersectionVolumeMl,
      strokeWorkMmHgMl,
      potentialEnergyMmHgMl,
      pvaMmHgMl,
    ].every(Number.isFinite) ||
    !(anchorEndSystolic.volumeMl > peLeftIntersectionVolumeMl) ||
    !(strokeWorkMmHgMl > 0) ||
    !(potentialEnergyMmHgMl >= 0) ||
    !(pvaMmHgMl > 0)
  ) {
    return incomplete(
      locus.completedPointCount === locus.totalPointCount
        ? "unavailable"
        : "collecting",
      "The settled relations do not define a positive finite SW/PE/PVA decomposition",
      relationsPreview,
    );
  }
  const outputId = `protocol-analysis.settled-hot-start-pva-v1.${ventricleId}`;
  const pvaJ = pvaMmHgMl * MMHG_ML_TO_JOULE_V1;
  const mvo2Input = { pvaOutputId: outputId, pvaMethodId: method.methodId,
    pvaEstimateJ: pvaJ, heartRateBpm: 60 / acceptedBeatDurationSec };
  const estimatedMvo2 =
    ventricleId === "LV"
      ? method.exactAnatomyMvo2
        ? evaluateMainWireLvMvo2EstimateV2(mvo2Input, locus.exactAnatomy)
        : evaluateMainWireIntegratedModelLvMvo2EstimateV1(mvo2Input)
      : null;
  const potentialEnergy: PeriodicPvaPotentialEnergyV1 = Object.freeze({
    method:
      "area-between-nonlinear-espvr-and-nonnegative-edpvr-from-left-intersection-to-anchor-esv" as const,
    leftIntersectionVolumeMl: peLeftIntersectionVolumeMl,
    measuredEspvrStartVolumeMl: systolicRange[0],
    lowVolumeTangentExtensionUsed:
      peLeftIntersectionVolumeMl < systolicRange[0],
    lowVolumeTangentExtensionSpanMl: Math.max(
      0,
      systolicRange[0] - peLeftIntersectionVolumeMl,
    ),
    mmHgMl: potentialEnergyMmHgMl,
    joule: potentialEnergyMmHgMl * MMHG_ML_TO_JOULE_V1,
    ...(method.lowVolumeTailPolicy === "measured-domain-first" ? {
      lowVolumeTailAdmission: measuredDomainIntersection
        ? "measured-domain-intersection" as const
        : "endpoint-tangent-extension" as const,
      measuredStartPressureGapMmHg,
    } : {}),
  });
  const lowVolumeTailLimitation: PeriodicPvaLimitationV1 = measuredDomainIntersection
    ? "low-volume-pva-tail-bounded-by-measured-domain-intersection"
    : "low-volume-pva-tail-uses-endpoint-local-tangent-extension";
  const pva: PeriodicPvaAreaV1 = Object.freeze({
    definition: "PVA = SW + PE" as const,
    mmHgMl: pvaMmHgMl,
    joule: pvaJ,
  });
  return Object.freeze({
    analysisId: MAIN_WIRE_PERIODIC_PVA_V1_ID,
    methodId: method.methodId,
    outputId,
    status: "available" as const,
    completionStatus: espvrProjection.phaseSelectionStatus,
    ventricleId,
    pressureBasis: "transmural" as const,
    progress,
    source: Object.freeze({
      protocolId: locus.protocolId,
      pointCount: relationPoints.length,
      familyProgress,
      primaryLineage: "persistent-worker-settled-hot-start-chain" as const,
      slowControllerPolicy:
        "active-source-period1-then-coronary-tone-frozen" as const,
      endDiastolicLandmark: "maximum-volume-proxy" as const,
      endSystolicLandmark: "active-pressure-area-max-common-isochrone" as const,
    }),
    anchor: anchorProjection,
    strokeWork,
    espvr: espvrProjection,
    edpvr: edpvrProjection,
    potentialEnergy,
    pva,
    estimatedMvo2,
    ...(method.includeAreaDisplay ? { areaDisplay: Object.freeze({
      use: "separate-sw-and-pe-illustration-not-a-union-or-stored-energy-measurement" as const,
      strokeWorkLoop: anchor.ventricularPressureVolumeLoop,
      potentialEnergyStrip: Object.freeze(Array.from(
        { length: PRESSURE_AREA_INTEGRATION_INTERVAL_COUNT_V1 + 1 }, (_, index) => {
          const volumeMl = index === PRESSURE_AREA_INTEGRATION_INTERVAL_COUNT_V1
            ? anchorEndSystolic.volumeMl
            : peLeftIntersectionVolumeMl + index * ((anchorEndSystolic.volumeMl - peLeftIntersectionVolumeMl)
              / PRESSURE_AREA_INTEGRATION_INTERVAL_COUNT_V1);
          return Object.freeze({ volumeMl,
            upperPressureMmHg: systolicBoundaryPressureMmHg(volumeMl),
            lowerPressureMmHg: nonnegativeExponentialPressureV1(edpvr, volumeMl) });
        })),
    }) } : {}),
    limitations: Object.freeze([
      "settled-preload-reduction-family-not-transient-venous-occlusion",
      "maximum-volume-used-as-end-diastolic-proxy",
      "common-isochrone-is-a-protocol-clock-not-a-common-land-state",
      "common-isochrone-phase-selected-over-anchor-local-volume-neighborhood",
      "pressure-envelope-retained-as-single-phase-approximation-diagnostic",
      "measured-systolic-locus-is-not-extrapolated-for-display",
      lowVolumeTailLimitation,
      "coronary-tone-held-at-source-during-preload-reduction",
      "not-clinical-validation",
    ] as const),
  });
}

function measuredHighLoadIsochroneDisplayV1(
  points: readonly MainWireIntegratedModelStarlingPointV3[],
  anchor: MainWireIntegratedModelStarlingPointV3,
  timeSinceAtrialCaptureSec: number,
): MainWireIntegratedModelPeriodicPvaEspvrV1["highLoadIsochroneDisplay"] {
  const toleranceMl = Math.max(1e-6, Math.abs(anchor.totalBloodVolumeMl) * 1e-12);
  const higher = points.filter(({ totalBloodVolumeMl }) =>
    totalBloodVolumeMl > anchor.totalBloodVolumeMl + toleranceMl,
  ).sort((left, right) => left.totalBloodVolumeMl - right.totalBloodVolumeMl);
  if (higher.length === 0) return null;
  const projected = [anchor, ...higher].map((point) => {
    const observed = interpolateLoopAtTimeV1(point.ventricularPressureVolumeLoop,
      point.acceptedBeatDurationSec, timeSinceAtrialCaptureSec);
    return observed === null ? null : Object.freeze({ ...observed,
      totalBloodVolumeMl: point.totalBloodVolumeMl });
  });
  if (projected.some((point) => point === null)) return null;
  return Object.freeze({
    use: "measured-load-continuation-not-pva-owner" as const,
    interpolation: "tbv-ordered-polyline" as const,
    displayExtrapolation: "none" as const,
    timeSinceAtrialCaptureSec,
    points: Object.freeze(projected as NonNullable<typeof projected[number]>[]),
  });
}

function areaMaxCommonIsochroneV1(
  allPoints: readonly MainWireIntegratedModelStarlingPointV3[],
  fullEdpvr: ExponentialFitV1,
  anchor: MainWireIntegratedModelStarlingPointV3,
  volumeDomain: "bilateral" | "lower-through-anchor" = "bilateral",
): AreaMaxCommonIsochroneV1 | null {
  if (
    allPoints.length < MINIMUM_RELATION_PREVIEW_POINT_COUNT_V1 ||
    anchor.acceptedBeatDurationSec === undefined ||
    !Number.isFinite(anchor.acceptedBeatDurationSec) ||
    !(anchor.acceptedBeatDurationSec > 0)
  ) {
    return null;
  }
  const anchorEndSystolicVolumeMl =
    anchor.ventricularPressureVolumeLandmarks.endSystolic.volumeMl;
  const integrationVolumeRangeMl = Object.freeze([
    (1 - PHASE_SELECTION_ANCHOR_ESV_HALF_WIDTH_FRACTION_V1) *
      anchorEndSystolicVolumeMl,
    (volumeDomain === "lower-through-anchor"
      ? 1
      : 1 + PHASE_SELECTION_ANCHOR_ESV_HALF_WIDTH_FRACTION_V1) *
      anchorEndSystolicVolumeMl,
  ] as const);
  const candidateWindow = anchorLateSystolicWindowV1(anchor);
  if (
    !Number.isFinite(anchorEndSystolicVolumeMl) ||
    !(anchorEndSystolicVolumeMl > 0) ||
    candidateWindow === null
  ) {
    return null;
  }

  // Every candidate is scored over the same physical interval at the anchor.
  // V8 uses a bilateral neighborhood. V9 uses the lower half through the
  // anchor so a preload-reduction ESPVR does not require hypervolemic samples.
  const coarseCandidates = isochronalPressureCandidatesV1(
    allPoints,
    fullEdpvr,
    anchor,
    false,
    Object.freeze({
      timeRangeSec: candidateWindow.timeRangeSec,
      timeSampleCount: PHASE_SELECTION_COARSE_TIME_SAMPLE_COUNT_V1,
      activePressureAreaVolumeRangeMl: integrationVolumeRangeMl,
    }),
  );
  const coarseWinner = maximumAreaCandidateV1(coarseCandidates);
  if (coarseWinner === null) return null;
  const coarseTimeStepSec =
    (candidateWindow.timeRangeSec[1] - candidateWindow.timeRangeSec[0]) /
    (PHASE_SELECTION_COARSE_TIME_SAMPLE_COUNT_V1 - 1);
  const refinementStartSec = Math.max(
    candidateWindow.timeRangeSec[0],
    coarseWinner.timeSinceAtrialCaptureSec - coarseTimeStepSec,
  );
  const refinementEndSec = Math.min(
    candidateWindow.timeRangeSec[1],
    coarseWinner.timeSinceAtrialCaptureSec + coarseTimeStepSec,
  );
  const refinedCandidates = Array.from(
    { length: SYSTOLIC_TIME_LOCAL_REFINEMENT_INTERVAL_COUNT_V1 + 1 },
    (_, ordinal) =>
      isochronalPressureCandidateAtTimeV1(
        allPoints,
        fullEdpvr,
        anchor,
        refinementStartSec +
          (ordinal / SYSTOLIC_TIME_LOCAL_REFINEMENT_INTERVAL_COUNT_V1) *
            (refinementEndSec - refinementStartSec),
        false,
        integrationVolumeRangeMl,
      ),
  ).filter(
    (candidate): candidate is IsochronalPressureCandidateV1 =>
      candidate !== null,
  );
  const scoringWinner = maximumAreaCandidateV1([
    ...coarseCandidates,
    ...refinedCandidates,
  ]);
  if (scoringWinner === null) return null;
  const selected = scoringWinner;
  const pressureEnvelope = pressureEnvelopeDiagnosticV1(
    isochronalPressureCandidatesV1(allPoints, fullEdpvr, anchor, false),
    selected,
    selected.law.measuredVolumeRangeMl,
    anchor.acceptedBeatDurationSec,
    fullEdpvr,
  );
  if (pressureEnvelope === null) return null;
  return Object.freeze({
    selected,
    integrationVolumeRangeMl,
    candidateTimeRangeSec: candidateWindow.timeRangeSec,
    candidatePhaseRange01: candidateWindow.phaseRange01,
    anchorLandmarks: candidateWindow.anchorLandmarks,
    pressureEnvelope,
  });
}

function anchorLateSystolicWindowV1(
  anchor: MainWireIntegratedModelStarlingPointV3,
): Readonly<{
  timeRangeSec: readonly [number, number];
  phaseRange01: readonly [number, number];
  anchorLandmarks: Readonly<{
    maximumPressurePhase01: number;
    endSystolicPhase01: number;
  }>;
}> | null {
  const durationSec = anchor.acceptedBeatDurationSec;
  if (
    durationSec === undefined ||
    !Number.isFinite(durationSec) ||
    !(durationSec > 0)
  ) {
    return null;
  }
  const phased = anchor.ventricularPressureVolumeLoop
    .filter(
      (
        point,
      ): point is MainWireIntegratedModelPressureVolumeLoopPointV3 &
        Readonly<{ phase01: number }> =>
        point.phase01 !== undefined &&
        Number.isFinite(point.phase01) &&
        point.phase01 >= 0 &&
        point.phase01 < 1 &&
        Number.isFinite(point.volumeMl) &&
        Number.isFinite(point.pressureMmHg),
    )
    .sort((left, right) => left.phase01 - right.phase01);
  if (phased.length < MINIMUM_RELATION_PREVIEW_POINT_COUNT_V1) return null;
  const maximumPressure = phased.reduce((best, point) =>
    point.pressureMmHg > best.pressureMmHg ? point : best,
  );
  const target = anchor.ventricularPressureVolumeLandmarks.endSystolic;
  const volumeScaleMl = Math.max(
    1,
    ...phased.map(({ volumeMl }) => Math.abs(volumeMl - target.volumeMl)),
  );
  const pressureScaleMmHg = Math.max(
    1,
    ...phased.map(({ pressureMmHg }) =>
      Math.abs(pressureMmHg - target.pressureMmHg),
    ),
  );
  const endSystolic = phased.reduce((best, point) => {
    const score =
      ((point.volumeMl - target.volumeMl) / volumeScaleMl) ** 2 +
      ((point.pressureMmHg - target.pressureMmHg) / pressureScaleMmHg) ** 2;
    const bestScore =
      ((best.volumeMl - target.volumeMl) / volumeScaleMl) ** 2 +
      ((best.pressureMmHg - target.pressureMmHg) / pressureScaleMmHg) ** 2;
    return score < bestScore ? point : best;
  });
  const startPhase01 = Math.max(
    0,
    Math.min(maximumPressure.phase01, endSystolic.phase01) -
      PHASE_SELECTION_WINDOW_MARGIN_PHASE01_V1,
  );
  const endPhase01 = Math.min(
    1 - Number.EPSILON,
    Math.max(maximumPressure.phase01, endSystolic.phase01) +
      PHASE_SELECTION_WINDOW_MARGIN_PHASE01_V1,
  );
  if (!(endPhase01 > startPhase01)) return null;
  return Object.freeze({
    timeRangeSec: Object.freeze([
      startPhase01 * durationSec,
      endPhase01 * durationSec,
    ] as const),
    phaseRange01: Object.freeze([startPhase01, endPhase01] as const),
    anchorLandmarks: Object.freeze({
      maximumPressurePhase01: maximumPressure.phase01,
      endSystolicPhase01: endSystolic.phase01,
    }),
  });
}

function isochronalPressureCandidatesV1(
  points: readonly MainWireIntegratedModelStarlingPointV3[],
  edpvr: ExponentialFitV1,
  anchor: MainWireIntegratedModelStarlingPointV3,
  requireStrictlyIncreasingPressure: boolean,
  options: Readonly<{
    timeRangeSec?: readonly [number, number];
    timeSampleCount?: number;
    activePressureAreaVolumeRangeMl?: readonly [number, number];
  }> = Object.freeze({}),
): readonly IsochronalPressureCandidateV1[] {
  const beatDurationsSec = points.map(
    ({ acceptedBeatDurationSec }) => acceptedBeatDurationSec,
  );
  if (
    beatDurationsSec.some(
      (durationSec) =>
        durationSec === undefined ||
        !Number.isFinite(durationSec) ||
        !(durationSec > 0),
    )
  ) {
    return Object.freeze([]);
  }
  const minimumBeatDurationSec = Math.min(...(beatDurationsSec as number[]));
  const timeRangeSec =
    options.timeRangeSec ??
    Object.freeze([0, minimumBeatDurationSec * (1 - 1e-12)] as const);
  const timeSampleCount =
    options.timeSampleCount ?? PRESSURE_ENVELOPE_TIME_SAMPLE_COUNT_V1;
  if (
    !Number.isSafeInteger(timeSampleCount) ||
    timeSampleCount < 2 ||
    !Number.isFinite(timeRangeSec[0]) ||
    !Number.isFinite(timeRangeSec[1]) ||
    timeRangeSec[0] < 0 ||
    !(timeRangeSec[1] > timeRangeSec[0]) ||
    !(timeRangeSec[1] < minimumBeatDurationSec)
  ) {
    return Object.freeze([]);
  }
  return Object.freeze(
    Array.from({ length: timeSampleCount }, (_, timeOrdinal) =>
      isochronalPressureCandidateAtTimeV1(
        points,
        edpvr,
        anchor,
        timeRangeSec[0] +
          (timeOrdinal / (timeSampleCount - 1)) *
            (timeRangeSec[1] - timeRangeSec[0]),
        requireStrictlyIncreasingPressure,
        options.activePressureAreaVolumeRangeMl,
      ),
    ).filter(
      (candidate): candidate is IsochronalPressureCandidateV1 =>
        candidate !== null,
    ),
  );
}

function isochronalPressureCandidateAtTimeV1(
  points: readonly MainWireIntegratedModelStarlingPointV3[],
  edpvr: ExponentialFitV1,
  anchor: MainWireIntegratedModelStarlingPointV3,
  timeSinceAtrialCaptureSec: number,
  requireStrictlyIncreasingPressure: boolean,
  activePressureAreaVolumeRangeMl?: readonly [number, number],
): IsochronalPressureCandidateV1 | null {
  if (
    anchor.acceptedBeatDurationSec === undefined ||
    !Number.isFinite(anchor.acceptedBeatDurationSec) ||
    !(anchor.acceptedBeatDurationSec > 0)
  )
    return null;
  const sampled = points.map((point) =>
    interpolateLoopAtTimeV1(
      point.ventricularPressureVolumeLoop,
      point.acceptedBeatDurationSec,
      timeSinceAtrialCaptureSec,
    ),
  );
  if (sampled.some((point) => point === null)) return null;
  const owned = sampled as MainWireIntegratedModelPeriodicPvaCurvePointV1[];
  const law = fitSystolicPressureLawV1(owned);
  if (
    law === null ||
    (requireStrictlyIncreasingPressure && !systolicLawStrictlyIncreasingV1(law))
  )
    return null;
  if (
    activePressureAreaVolumeRangeMl !== undefined &&
    (law.measuredVolumeRangeMl[0] > activePressureAreaVolumeRangeMl[0] ||
      law.measuredVolumeRangeMl[1] < activePressureAreaVolumeRangeMl[1])
  ) {
    return null;
  }
  const areaVolumeRangeMl =
    activePressureAreaVolumeRangeMl ?? law.measuredVolumeRangeMl;
  const activePressureAreaMmHgMl = positivePressureDifferenceAreaV1(
    (volumeMl) => systolicPressureV1(law, volumeMl),
    (volumeMl) => nonnegativeExponentialPressureV1(edpvr, volumeMl),
    areaVolumeRangeMl[0],
    areaVolumeRangeMl[1],
  );
  if (activePressureAreaMmHgMl === null) return null;
  return Object.freeze({
    timeSinceAtrialCaptureSec,
    phase01AtAnchor: timeSinceAtrialCaptureSec / anchor.acceptedBeatDurationSec,
    activePressureAreaMmHgMl,
    activePressureAreaVolumeRangeMl: areaVolumeRangeMl,
    law,
    points: Object.freeze(owned.map((point) => Object.freeze({ ...point }))),
  });
}

function maximumAreaCandidateV1(
  candidates: readonly IsochronalPressureCandidateV1[],
): IsochronalPressureCandidateV1 | null {
  return candidates.reduce<IsochronalPressureCandidateV1 | null>(
    (best, candidate) =>
      best === null ||
      candidate.activePressureAreaMmHgMl > best.activePressureAreaMmHgMl
        ? candidate
        : best,
    null,
  );
}

function pressureEnvelopeDiagnosticV1(
  candidates: readonly IsochronalPressureCandidateV1[],
  selected: IsochronalPressureCandidateV1,
  volumeRangeMl: readonly [number, number],
  anchorBeatDurationSec: number,
  edpvr: ExponentialFitV1,
):
  | MainWireIntegratedModelPeriodicPvaEspvrV1["pressureEnvelopeDiagnostic"]
  | null {
  if (candidates.length === 0 || !(volumeRangeMl[1] > volumeRangeMl[0])) {
    return null;
  }
  const winningTimesSec: number[] = [];
  const curve = sampleCurveV1(
    volumeRangeMl[0],
    volumeRangeMl[1],
    (volumeMl) => {
      let winner = selected;
      let maximumPressureMmHg = systolicPressureV1(selected.law, volumeMl);
      for (const candidate of candidates) {
        const pressureMmHg = systolicPressureV1(candidate.law, volumeMl);
        if (!Number.isFinite(pressureMmHg)) continue;
        if (pressureMmHg > maximumPressureMmHg) {
          winner = candidate;
          maximumPressureMmHg = pressureMmHg;
        }
      }
      winningTimesSec.push(winner.timeSinceAtrialCaptureSec);
      return maximumPressureMmHg;
    },
  );
  const timeRange = finiteRangeAllowEqualV1(winningTimesSec);
  if (curve.length === 0 || timeRange === null) return null;
  const winningTimeByVolume = Object.freeze(
    curve.map((point, index) =>
      Object.freeze({
        volumeMl: point.volumeMl,
        timeSinceAtrialCaptureSec: winningTimesSec[index]!,
        phase01AtAnchor: winningTimesSec[index]! / anchorBeatDurationSec,
      }),
    ),
  );
  const excessAreaMmHgMl = pressureDifferenceAreaV1(
    (volumeMl) => {
      let maximumPressureMmHg = systolicPressureV1(selected.law, volumeMl);
      for (const candidate of candidates) {
        const pressureMmHg = systolicPressureV1(candidate.law, volumeMl);
        if (Number.isFinite(pressureMmHg)) {
          maximumPressureMmHg = Math.max(maximumPressureMmHg, pressureMmHg);
        }
      }
      return maximumPressureMmHg;
    },
    (volumeMl) => systolicPressureV1(selected.law, volumeMl),
    volumeRangeMl[0],
    volumeRangeMl[1],
  );
  const selectedFullAreaMmHgMl = pressureDifferenceAreaV1(
    (volumeMl) =>
      Math.max(
        systolicPressureV1(selected.law, volumeMl),
        nonnegativeExponentialPressureV1(edpvr, volumeMl),
      ),
    (volumeMl) => nonnegativeExponentialPressureV1(edpvr, volumeMl),
    volumeRangeMl[0],
    volumeRangeMl[1],
  );
  if (
    !Number.isFinite(excessAreaMmHgMl) ||
    excessAreaMmHgMl < 0 ||
    !Number.isFinite(selectedFullAreaMmHgMl) ||
    selectedFullAreaMmHgMl < 0
  )
    return null;
  return Object.freeze({
    method: "phase-wise-maximum-pressure-envelope" as const,
    use: "optional-display-and-single-phase-adequacy-diagnostic-not-pva-owner" as const,
    curve,
    timeSinceAtrialCaptureRangeSec: timeRange,
    phase01AtAnchorRange: Object.freeze([
      timeRange[0] / anchorBeatDurationSec,
      timeRange[1] / anchorBeatDurationSec,
    ] as const),
    winningTimeByVolume,
    excessAreaMmHgMl,
    excessAreaFraction:
      selectedFullAreaMmHgMl > 0
        ? excessAreaMmHgMl / selectedFullAreaMmHgMl
        : Number.POSITIVE_INFINITY,
  });
}

function interpolateLoopAtTimeV1(
  loop: readonly MainWireIntegratedModelPressureVolumeLoopPointV3[],
  acceptedBeatDurationSec: number | undefined,
  timeSinceAtrialCaptureSec: number,
): MainWireIntegratedModelPeriodicPvaCurvePointV1 | null {
  if (
    acceptedBeatDurationSec === undefined ||
    !Number.isFinite(acceptedBeatDurationSec) ||
    !(acceptedBeatDurationSec > 0) ||
    !Number.isFinite(timeSinceAtrialCaptureSec) ||
    timeSinceAtrialCaptureSec < 0 ||
    !(timeSinceAtrialCaptureSec < acceptedBeatDurationSec)
  ) {
    return null;
  }
  return interpolateLoopAtPhaseV1(
    loop,
    timeSinceAtrialCaptureSec / acceptedBeatDurationSec,
  );
}

function interpolateLoopAtPhaseV1(
  loop: readonly MainWireIntegratedModelPressureVolumeLoopPointV3[],
  phase01: number,
): MainWireIntegratedModelPeriodicPvaCurvePointV1 | null {
  if (
    loop.length < MINIMUM_RELATION_PREVIEW_POINT_COUNT_V1 ||
    !Number.isFinite(phase01) ||
    phase01 < 0 ||
    phase01 >= 1
  ) {
    return null;
  }
  const ordered = [...loop].sort(
    (left, right) =>
      (left.phase01 ?? Number.NaN) - (right.phase01 ?? Number.NaN),
  );
  if (
    ordered.some(
      ({ phase01: retainedPhase, volumeMl, pressureMmHg }) =>
        retainedPhase === undefined ||
        !Number.isFinite(retainedPhase) ||
        retainedPhase < 0 ||
        retainedPhase >= 1 ||
        !Number.isFinite(volumeMl) ||
        !Number.isFinite(pressureMmHg),
    ) ||
    ordered
      .slice(1)
      .some((point, index) => point.phase01! <= ordered[index]!.phase01!)
  ) {
    return null;
  }
  const exact = ordered.find((point) => point.phase01 === phase01);
  if (exact !== undefined) {
    return Object.freeze({
      volumeMl: exact.volumeMl,
      pressureMmHg: exact.pressureMmHg,
    });
  }
  const rightIndex = ordered.findIndex((point) => point.phase01! > phase01);
  const left = rightIndex <= 0 ? ordered.at(-1)! : ordered[rightIndex - 1]!;
  const right = rightIndex < 0 ? ordered[0]! : ordered[rightIndex]!;
  const leftPhase = rightIndex === 0 ? left.phase01! - 1 : left.phase01!;
  const rightPhase = rightIndex < 0 ? right.phase01! + 1 : right.phase01!;
  const fraction = (phase01 - leftPhase) / (rightPhase - leftPhase);
  if (!Number.isFinite(fraction) || fraction < 0 || fraction > 1) return null;
  return Object.freeze({
    volumeMl: left.volumeMl + fraction * (right.volumeMl - left.volumeMl),
    pressureMmHg:
      left.pressureMmHg + fraction * (right.pressureMmHg - left.pressureMmHg),
  });
}

function fitSystolicPressureLawV1(
  points: readonly MainWireIntegratedModelPeriodicPvaCurvePointV1[],
): SystolicPressureLawV1 | null {
  if (
    points.length < MINIMUM_RELATION_PREVIEW_POINT_COUNT_V1 ||
    points.some(
      ({ volumeMl, pressureMmHg }) =>
        !Number.isFinite(volumeMl) || !Number.isFinite(pressureMmHg),
    )
  )
    return null;
  const ordered = Object.freeze(
    [...points]
      .sort((left, right) => left.volumeMl - right.volumeMl)
      .map((point) => Object.freeze({ ...point })),
  );
  const widths = ordered
    .slice(1)
    .map((point, index) => point.volumeMl - ordered[index]!.volumeMl);
  if (widths.some((widthMl) => !(widthMl > 1e-10))) return null;
  const secants = widths.map(
    (widthMl, index) =>
      (ordered[index + 1]!.pressureMmHg - ordered[index]!.pressureMmHg) /
      widthMl,
  );
  if (secants.some((slope) => !Number.isFinite(slope))) return null;
  const useCubic = ordered.length >= MINIMUM_PVA_PREVIEW_POINT_COUNT_V1;
  const tangents = useCubic
    ? shapePreservingTangentsV1(widths, secants)
    : ordered.map((_, index) =>
        index === ordered.length - 1 ? secants.at(-1)! : secants[index]!,
      );
  if (tangents.some((slope) => !Number.isFinite(slope))) return null;
  return Object.freeze({
    kind: useCubic
      ? ("shape-preserving-cubic-hermite" as const)
      : ("piecewise-linear" as const),
    points: ordered,
    tangentsMmHgPerMl: Object.freeze(tangents),
    measuredVolumeRangeMl: Object.freeze([
      ordered[0]!.volumeMl,
      ordered.at(-1)!.volumeMl,
    ] as const),
  });
}

function systolicPressureV1(
  law: SystolicPressureLawV1,
  volumeMl: number,
): number {
  const [minimumVolumeMl, maximumVolumeMl] = law.measuredVolumeRangeMl;
  if (
    !Number.isFinite(volumeMl) ||
    volumeMl < minimumVolumeMl ||
    volumeMl > maximumVolumeMl
  )
    return Number.NaN;
  const exact = law.points.find((point) => point.volumeMl === volumeMl);
  if (exact !== undefined) return exact.pressureMmHg;
  const rightIndex = law.points.findIndex((point) => point.volumeMl > volumeMl);
  if (rightIndex <= 0) return Number.NaN;
  const left = law.points[rightIndex - 1]!;
  const right = law.points[rightIndex]!;
  const widthMl = right.volumeMl - left.volumeMl;
  const fraction = (volumeMl - left.volumeMl) / widthMl;
  if (law.kind === "piecewise-linear") {
    return (
      left.pressureMmHg + fraction * (right.pressureMmHg - left.pressureMmHg)
    );
  }
  const fraction2 = fraction * fraction;
  const fraction3 = fraction2 * fraction;
  return (
    (2 * fraction3 - 3 * fraction2 + 1) * left.pressureMmHg +
    (fraction3 - 2 * fraction2 + fraction) *
      widthMl *
      law.tangentsMmHgPerMl[rightIndex - 1]! +
    (-2 * fraction3 + 3 * fraction2) * right.pressureMmHg +
    (fraction3 - fraction2) * widthMl * law.tangentsMmHgPerMl[rightIndex]!
  );
}

function systolicPressureDerivativeV1(
  law: SystolicPressureLawV1,
  volumeMl: number,
): number {
  const [minimumVolumeMl, maximumVolumeMl] = law.measuredVolumeRangeMl;
  if (
    !Number.isFinite(volumeMl) ||
    volumeMl < minimumVolumeMl ||
    volumeMl > maximumVolumeMl
  ) {
    return Number.NaN;
  }
  const exactIndex = law.points.findIndex(
    (point) => point.volumeMl === volumeMl,
  );
  if (exactIndex >= 0) return law.tangentsMmHgPerMl[exactIndex]!;
  const rightIndex = law.points.findIndex((point) => point.volumeMl > volumeMl);
  if (rightIndex <= 0) return Number.NaN;
  const left = law.points[rightIndex - 1]!;
  const right = law.points[rightIndex]!;
  const widthMl = right.volumeMl - left.volumeMl;
  if (law.kind === "piecewise-linear") {
    return (right.pressureMmHg - left.pressureMmHg) / widthMl;
  }
  const fraction = (volumeMl - left.volumeMl) / widthMl;
  const fraction2 = fraction * fraction;
  return (
    ((6 * fraction2 - 6 * fraction) / widthMl) * left.pressureMmHg +
    (3 * fraction2 - 4 * fraction + 1) *
      law.tangentsMmHgPerMl[rightIndex - 1]! +
    ((-6 * fraction2 + 6 * fraction) / widthMl) * right.pressureMmHg +
    (3 * fraction2 - 2 * fraction) * law.tangentsMmHgPerMl[rightIndex]!
  );
}

function systolicLawStrictlyIncreasingV1(law: SystolicPressureLawV1): boolean {
  return (
    law.points
      .slice(1)
      .every(
        (point, index) => point.pressureMmHg > law.points[index]!.pressureMmHg,
      ) &&
    law.tangentsMmHgPerMl.every((slope) => Number.isFinite(slope) && slope >= 0)
  );
}

function systolicLawStrictlyIncreasingThroughVolumeV1(
  law: SystolicPressureLawV1,
  upperVolumeMl: number,
): boolean {
  if (!Number.isFinite(upperVolumeMl)) return false;
  const toleranceMl = Math.max(1e-9, Math.abs(upperVolumeMl) * 1e-12);
  const upperIndex = law.points.findIndex(
    ({ volumeMl }) => Math.abs(volumeMl - upperVolumeMl) <= toleranceMl,
  );
  if (upperIndex < 1) return false;
  return (
    law.points
      .slice(1, upperIndex + 1)
      .every(
        (point, index) => point.pressureMmHg > law.points[index]!.pressureMmHg,
      ) &&
    law.tangentsMmHgPerMl
      .slice(0, upperIndex + 1)
      .every((slope) => Number.isFinite(slope) && slope >= 0)
  );
}

type LowVolumeTangentExtensionV1 = Readonly<{
  measuredStartVolumeMl: number;
  measuredStartPressureMmHg: number;
  slopeMmHgPerMl: number;
  zeroPressureVolumeMl: number;
}>;

function lowVolumeTangentExtensionV1(
  law: SystolicPressureLawV1,
): LowVolumeTangentExtensionV1 | null {
  const measuredStartVolumeMl = law.measuredVolumeRangeMl[0];
  const measuredStartPressureMmHg = systolicPressureV1(
    law,
    measuredStartVolumeMl,
  );
  const slopeMmHgPerMl = systolicPressureDerivativeV1(
    law,
    measuredStartVolumeMl,
  );
  const zeroPressureVolumeMl =
    measuredStartVolumeMl - measuredStartPressureMmHg / slopeMmHgPerMl;
  if (
    ![
      measuredStartVolumeMl,
      measuredStartPressureMmHg,
      slopeMmHgPerMl,
      zeroPressureVolumeMl,
    ].every(Number.isFinite) ||
    !(measuredStartPressureMmHg > 0) ||
    !(slopeMmHgPerMl > 0) ||
    !(zeroPressureVolumeMl < measuredStartVolumeMl)
  ) {
    return null;
  }
  return Object.freeze({
    measuredStartVolumeMl,
    measuredStartPressureMmHg,
    slopeMmHgPerMl,
    zeroPressureVolumeMl,
  });
}

export function mainWirePvaLowVolumeTangentPressureV1(
  extension: LowVolumeTangentExtensionV1,
  volumeMl: number,
): number {
  // Preserve the analytic root: affine cancellation can otherwise leave a tiny
  // positive pressure and falsely reject the left PE intersection.
  if (volumeMl === extension.zeroPressureVolumeMl) return 0;
  return (
    extension.measuredStartPressureMmHg +
    extension.slopeMmHgPerMl * (volumeMl - extension.measuredStartVolumeMl)
  );
}

function nonlinearPvaBoundaryPressureV1(
  law: SystolicPressureLawV1,
  extension: LowVolumeTangentExtensionV1,
  volumeMl: number,
): number {
  if (!Number.isFinite(volumeMl)) return Number.NaN;
  if (volumeMl < extension.measuredStartVolumeMl) {
    return mainWirePvaLowVolumeTangentPressureV1(extension, volumeMl);
  }
  return systolicPressureV1(law, volumeMl);
}

function shapePreservingTangentsV1(
  widthsMl: readonly number[],
  secantsMmHgPerMl: readonly number[],
): readonly number[] {
  if (secantsMmHgPerMl.length === 1) {
    return Object.freeze([secantsMmHgPerMl[0]!, secantsMmHgPerMl[0]!]);
  }
  const endpoint = (
    firstWidth: number,
    secondWidth: number,
    firstSecant: number,
    secondSecant: number,
  ) => {
    let tangent =
      ((2 * firstWidth + secondWidth) * firstSecant -
        firstWidth * secondSecant) /
      (firstWidth + secondWidth);
    if (Math.sign(tangent) !== Math.sign(firstSecant)) tangent = 0;
    else if (
      Math.sign(firstSecant) !== Math.sign(secondSecant) &&
      Math.abs(tangent) > Math.abs(3 * firstSecant)
    )
      tangent = 3 * firstSecant;
    return tangent;
  };
  const tangents = new Array<number>(secantsMmHgPerMl.length + 1);
  tangents[0] = endpoint(
    widthsMl[0]!,
    widthsMl[1]!,
    secantsMmHgPerMl[0]!,
    secantsMmHgPerMl[1]!,
  );
  for (let index = 1; index < secantsMmHgPerMl.length; index += 1) {
    const leftSecant = secantsMmHgPerMl[index - 1]!;
    const rightSecant = secantsMmHgPerMl[index]!;
    if (
      leftSecant === 0 ||
      rightSecant === 0 ||
      Math.sign(leftSecant) !== Math.sign(rightSecant)
    ) {
      tangents[index] = 0;
      continue;
    }
    const leftWidth = widthsMl[index - 1]!;
    const rightWidth = widthsMl[index]!;
    const leftWeight = 2 * rightWidth + leftWidth;
    const rightWeight = rightWidth + 2 * leftWidth;
    tangents[index] =
      (leftWeight + rightWeight) /
      (leftWeight / leftSecant + rightWeight / rightSecant);
  }
  const last = secantsMmHgPerMl.length - 1;
  tangents[last + 1] = endpoint(
    widthsMl[last]!,
    widthsMl[last - 1]!,
    secantsMmHgPerMl[last]!,
    secantsMmHgPerMl[last - 1]!,
  );
  return Object.freeze(tangents);
}

function sampleShapePreservingCurveV1(
  law: SystolicPressureLawV1,
): readonly MainWireIntegratedModelPeriodicPvaCurvePointV1[] {
  const [startVolumeMl, endVolumeMl] = law.measuredVolumeRangeMl;
  return Object.freeze(
    Array.from({ length: CURVE_SAMPLE_COUNT_V1 + 1 }, (_, index) => {
      const volumeMl =
        index === 0
          ? startVolumeMl
          : index === CURVE_SAMPLE_COUNT_V1
            ? endVolumeMl
            : startVolumeMl +
              (index / CURVE_SAMPLE_COUNT_V1) * (endVolumeMl - startVolumeMl);
      return Object.freeze({
        volumeMl,
        pressureMmHg: systolicPressureV1(law, volumeMl),
      });
    }),
  );
}

function positivePressureDifferenceAreaV1(
  upperPressure: (volumeMl: number) => number,
  lowerPressure: (volumeMl: number) => number,
  startVolumeMl: number,
  endVolumeMl: number,
): number | null {
  if (!(endVolumeMl > startVolumeMl)) return null;
  for (
    let index = 0;
    index <= PRESSURE_AREA_INTEGRATION_INTERVAL_COUNT_V1;
    index += 1
  ) {
    const volumeMl =
      index === 0
        ? startVolumeMl
        : index === PRESSURE_AREA_INTEGRATION_INTERVAL_COUNT_V1
          ? endVolumeMl
          : startVolumeMl +
            (index / PRESSURE_AREA_INTEGRATION_INTERVAL_COUNT_V1) *
              (endVolumeMl - startVolumeMl);
    const differenceMmHg = upperPressure(volumeMl) - lowerPressure(volumeMl);
    if (!Number.isFinite(differenceMmHg) || !(differenceMmHg > 0)) return null;
  }
  const areaMmHgMl = pressureDifferenceAreaV1(
    upperPressure,
    lowerPressure,
    startVolumeMl,
    endVolumeMl,
  );
  return Number.isFinite(areaMmHgMl) && areaMmHgMl > 0 ? areaMmHgMl : null;
}

function pressureDifferenceAreaV1(
  upperPressure: (volumeMl: number) => number,
  lowerPressure: (volumeMl: number) => number,
  startVolumeMl: number,
  endVolumeMl: number,
): number {
  if (
    ![startVolumeMl, endVolumeMl].every(Number.isFinite) ||
    !(endVolumeMl > startVolumeMl)
  ) {
    return Number.NaN;
  }
  const intervalWidthMl =
    (endVolumeMl - startVolumeMl) / PRESSURE_AREA_INTEGRATION_INTERVAL_COUNT_V1;
  let areaMmHgMl = 0;
  for (
    let index = 0;
    index <= PRESSURE_AREA_INTEGRATION_INTERVAL_COUNT_V1;
    index += 1
  ) {
    const volumeMl =
      index === 0
        ? startVolumeMl
        : index === PRESSURE_AREA_INTEGRATION_INTERVAL_COUNT_V1
          ? endVolumeMl
          : startVolumeMl + index * intervalWidthMl;
    const differenceMmHg = upperPressure(volumeMl) - lowerPressure(volumeMl);
    if (!Number.isFinite(differenceMmHg)) return Number.NaN;
    areaMmHgMl +=
      (index === 0 || index === PRESSURE_AREA_INTEGRATION_INTERVAL_COUNT_V1
        ? 0.5
        : 1) * differenceMmHg;
  }
  return areaMmHgMl * intervalWidthMl;
}

type WeightedPressurePointV1 = Readonly<{
  point: Readonly<{ volumeMl: number; pressureMmHg: number }>;
  weight: number;
}>;

function volumeQuadratureWeightsV1(
  points: readonly Readonly<{ volumeMl: number; pressureMmHg: number }>[],
): readonly WeightedPressurePointV1[] | null {
  if (
    points.length < 2 ||
    points.some(
      ({ volumeMl, pressureMmHg }) =>
        !Number.isFinite(volumeMl) || !Number.isFinite(pressureMmHg),
    )
  ) {
    return null;
  }
  const ordered = [...points].sort(
    (left, right) => left.volumeMl - right.volumeMl,
  );
  if (
    ordered
      .slice(1)
      .some(
        (point, index) => !(point.volumeMl - ordered[index]!.volumeMl > 1e-10),
      )
  ) {
    return null;
  }
  return Object.freeze(
    ordered.map((point, index) => {
      const left = ordered[index - 1];
      const right = ordered[index + 1];
      const weight =
        left === undefined
          ? 0.5 * (right!.volumeMl - point.volumeMl)
          : right === undefined
            ? 0.5 * (point.volumeMl - left.volumeMl)
            : 0.5 * (right.volumeMl - left.volumeMl);
      return Object.freeze({ point, weight });
    }),
  );
}

function weightedRSquaredV1(
  weighted: readonly WeightedPressurePointV1[],
  predict: (
    point: Readonly<{ volumeMl: number; pressureMmHg: number }>,
  ) => number,
): number {
  const totalWeight = weighted.reduce((sum, item) => sum + item.weight, 0);
  const mean =
    weighted.reduce(
      (sum, item) => sum + item.weight * item.point.pressureMmHg,
      0,
    ) / totalWeight;
  const total = weighted.reduce(
    (sum, item) => sum + item.weight * (item.point.pressureMmHg - mean) ** 2,
    0,
  );
  const residual = weighted.reduce((sum, item) => {
    const predicted = predict(item.point);
    return sum + item.weight * (item.point.pressureMmHg - predicted) ** 2;
  }, 0);
  return total > 0 ? 1 - residual / total : residual === 0 ? 1 : 0;
}

export function pressureRelationsLeftIntersectionV1(
  systolicPressureMmHg: (volumeMl: number) => number,
  edpvr: ExponentialFitV1,
  searchStartVolumeMl: number,
  endVolumeMl: number,
  exactEndpoint = false,
): number | null {
  if (
    ![searchStartVolumeMl, endVolumeMl].every(Number.isFinite) ||
    searchStartVolumeMl < 0 ||
    !(endVolumeMl > searchStartVolumeMl)
  ) {
    return null;
  }
  const pressureDifferenceMmHg = (volumeMl: number) =>
    systolicPressureMmHg(volumeMl) -
    nonnegativeExponentialPressureV1(edpvr, volumeMl);
  let lowerVolumeMl = searchStartVolumeMl;
  let lowerDifferenceMmHg = pressureDifferenceMmHg(lowerVolumeMl);
  let upperVolumeMl = Number.NaN;
  let upperDifferenceMmHg = Number.NaN;
  const endDifferenceMmHg = pressureDifferenceMmHg(endVolumeMl);
  if (
    !Number.isFinite(lowerDifferenceMmHg) ||
    !Number.isFinite(endDifferenceMmHg) ||
    lowerDifferenceMmHg > 0 ||
    !(endDifferenceMmHg > 0)
  ) {
    return null;
  }
  for (let index = 1; index <= 256; index += 1) {
    const volumeMl =
      searchStartVolumeMl + (index / 256) * (endVolumeMl - searchStartVolumeMl);
    const differenceMmHg = pressureDifferenceMmHg(volumeMl);
    if (!Number.isFinite(differenceMmHg)) return null;
    if (lowerDifferenceMmHg <= 0 && differenceMmHg > 0) {
      upperVolumeMl = volumeMl;
      upperDifferenceMmHg = differenceMmHg;
      break;
    }
    lowerVolumeMl = volumeMl;
    lowerDifferenceMmHg = differenceMmHg;
  }
  if (!Number.isFinite(upperVolumeMl) || !(upperDifferenceMmHg > 0)) {
    return null;
  }
  if (lowerDifferenceMmHg <= 0) {
    for (let iteration = 0; iteration < 96; iteration += 1) {
      const midpointVolumeMl = 0.5 * (lowerVolumeMl + upperVolumeMl);
      const midpointDifferenceMmHg = pressureDifferenceMmHg(midpointVolumeMl);
      if (!Number.isFinite(midpointDifferenceMmHg)) return null;
      if (midpointDifferenceMmHg > 0) upperVolumeMl = midpointVolumeMl;
      else lowerVolumeMl = midpointVolumeMl;
    }
  }
  const intersectionVolumeMl =
    lowerDifferenceMmHg === 0
      ? lowerVolumeMl
      : 0.5 * (lowerVolumeMl + upperVolumeMl);
  // A nonlinear systolic locus can in principle re-cross the EDPVR. PVA is
  // admitted only when the first left intersection is followed by one
  // strictly positive pressure gap through the anchor end-systolic volume.
  for (let index = 1; index <= CURVE_SAMPLE_COUNT_V1; index += 1) {
    // Reconstructing the known right endpoint can overshoot the measured
    // domain by one ULP. Keep the endpoint exact, without widening the domain
    // or accepting a nonpositive pressure gap. This V15 fix is opt-in so
    // already-published methods retain even their former edge-case behaviour.
    const volumeMl =
      exactEndpoint && index === CURVE_SAMPLE_COUNT_V1 ? endVolumeMl : intersectionVolumeMl +
        (index / CURVE_SAMPLE_COUNT_V1) * (endVolumeMl - intersectionVolumeMl);
    if (!(pressureDifferenceMmHg(volumeMl) > 0)) return null;
  }
  return intersectionVolumeMl;
}

function exponentialFitV1(
  points: readonly Readonly<{ volumeMl: number; pressureMmHg: number }>[],
): ExponentialFitV1 | null {
  const range = finiteRangeV1(points.map(({ volumeMl }) => volumeMl));
  const weighted = volumeQuadratureWeightsV1(points);
  if (range === null || weighted === null || weighted.length < 3) return null;
  const span = range[1] - range[0];
  const minimumV0 = range[0] - Math.max(20, 1.5 * span);
  const maximumV0 = range[0] - Math.max(0.05, span * 0.002);
  const minimumExponent = 0.001;
  const maximumExponent = Math.min(
    0.25,
    18 / Math.max(1, range[1] - minimumV0),
  );
  if (!(maximumExponent > minimumExponent)) return null;
  let best: (ExponentialFitV1 & Readonly<{ score: number }>) | null = null;
  for (let vOrdinal = 0; vOrdinal <= EDPVR_V0_GRID_COUNT_V1; vOrdinal += 1) {
    const volumeOffset =
      minimumV0 + (vOrdinal / EDPVR_V0_GRID_COUNT_V1) * (maximumV0 - minimumV0);
    for (
      let exponentOrdinal = 0;
      exponentOrdinal <= EDPVR_EXPONENT_GRID_COUNT_V1;
      exponentOrdinal += 1
    ) {
      const fraction = exponentOrdinal / EDPVR_EXPONENT_GRID_COUNT_V1;
      const exponent = Math.exp(
        Math.log(minimumExponent) +
          fraction * (Math.log(maximumExponent) - Math.log(minimumExponent)),
      );
      const basis = weighted.map(({ point }) =>
        Math.expm1(exponent * (point.volumeMl - volumeOffset)),
      );
      const denominator = basis.reduce(
        (sum, value, index) => sum + weighted[index]!.weight * value ** 2,
        0,
      );
      if (!(denominator > 0) || !Number.isFinite(denominator)) continue;
      const scale =
        weighted.reduce(
          (sum, item, index) =>
            sum + item.weight * item.point.pressureMmHg * basis[index]!,
          0,
        ) / denominator;
      if (!(scale > 0) || !Number.isFinite(scale)) continue;
      const predicted = basis.map((value) => scale * value);
      const score = weighted.reduce(
        (sum, item, index) =>
          sum +
          item.weight * (item.point.pressureMmHg - predicted[index]!) ** 2,
        0,
      );
      if (!Number.isFinite(score) || (best !== null && score >= best.score))
        continue;
      best = Object.freeze({
        scale,
        exponent,
        volumeOffset,
        score,
        rSquared: weightedRSquaredV1(
          weighted,
          ({ volumeMl }) =>
            scale * Math.expm1(exponent * (volumeMl - volumeOffset)),
        ),
        parameterBoundaryHit:
          vOrdinal === 0 ||
          vOrdinal === EDPVR_V0_GRID_COUNT_V1 ||
          exponentOrdinal === 0 ||
          exponentOrdinal === EDPVR_EXPONENT_GRID_COUNT_V1,
      });
    }
  }
  if (best === null) return null;
  const { score: _score, ...fit } = best;
  return Object.freeze(fit);
}

function nonnegativeExponentialPressureV1(
  fit: ExponentialFitV1,
  volumeMl: number,
): number {
  if (volumeMl <= fit.volumeOffset) return 0;
  return fit.scale * Math.expm1(fit.exponent * (volumeMl - fit.volumeOffset));
}

function sampleCurveV1(
  startVolumeMl: number,
  endVolumeMl: number,
  pressure: (volumeMl: number) => number,
): readonly MainWireIntegratedModelPeriodicPvaCurvePointV1[] {
  if (!(endVolumeMl > startVolumeMl)) return Object.freeze([]);
  return Object.freeze(
    Array.from({ length: CURVE_SAMPLE_COUNT_V1 + 1 }, (_, index) => {
      const volumeMl =
        startVolumeMl +
        (index / CURVE_SAMPLE_COUNT_V1) * (endVolumeMl - startVolumeMl);
      return Object.freeze({ volumeMl, pressureMmHg: pressure(volumeMl) });
    }),
  );
}

function finiteRangeV1(
  values: readonly number[],
): readonly [number, number] | null {
  if (values.length === 0 || values.some((value) => !Number.isFinite(value)))
    return null;
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  return maximum > minimum ? Object.freeze([minimum, maximum] as const) : null;
}

function finiteRangeAllowEqualV1(
  values: readonly number[],
): readonly [number, number] | null {
  if (values.length === 0 || values.some((value) => !Number.isFinite(value))) {
    return null;
  }
  return Object.freeze([Math.min(...values), Math.max(...values)] as const);
}

function rSquaredV1(
  observed: readonly number[],
  predicted: readonly number[],
): number {
  if (observed.length === 0 || observed.length !== predicted.length) return 0;
  const mean =
    observed.reduce((sum, value) => sum + value, 0) / observed.length;
  const total = observed.reduce((sum, value) => sum + (value - mean) ** 2, 0);
  const residual = observed.reduce(
    (sum, value, index) => sum + (value - predicted[index]!) ** 2,
    0,
  );
  return total > 0 ? 1 - residual / total : residual === 0 ? 1 : 0;
}

import { evaluateParallelPulmonaryPathsV1 } from "./ParallelPulmonaryPathsV1";
import {
  buildAuthoritativeCirculationGraphV1,
  downstreamEffectivePressureAndDerivativeV1,
  downstreamEffectivePressureV1,
  effectiveUnstressedVolumeFromNodeV1,
  physicalColdSeedVolumeFromNodeV1,
  incidenceVolumeRatesFromEdgeFlowsV1,
  nonValveEdgeLossV1,
  nonValveEdgeLossAndPressureDerivativesV1,
  respiratoryExternalPressuresV1,
  vascularPvLawFromNodeV1,
  vascularTransmuralPressureAndVolumeTangentFromLawV1,
  type BaseEdgeLossRuntimeParameterViewV1,
  type NonValveEdgeLossAndPressureDerivativesV1,
  type NonValveEdgeLossV1,
  type RespiratoryExternalPressuresV1,
  type RespiratoryPressureParameterViewV1,
  type VascularTransmuralPressureAndVolumeTangentV1,
  type VascularPvRuntimeParameterViewV1,
} from "@/engine/core/circulationGraphKernelV1";
import {
  validateMainWireSelectedAorticOutflowCirculationProfileV1,
} from "@/engine/core/MainWireSelectedAorticOutflowCirculationProfileV1";
import {
  validateMainWireAlgebraicProximalArterialRootsProfileV1,
} from "@/engine/core/MainWireAlgebraicProximalArterialRootsProfileV1";
import {
  validateMainWireAlgebraicPulmonaryArterialRootProfileV1,
} from "@/engine/core/MainWireAlgebraicPulmonaryArterialRootProfileV1";
import type { EdgeSpec, NodeSpec } from "@/engine/core/topology";
import {
  fullHotPathInvariantsEnabledV1,
} from "@/engine/hotPathIntegrityTierV1";
import {
  validateMainWireFourValveDiseaseResearchInputV1,
  type MainWireFourValveDiseaseResearchInputV1,
} from "@/engine/valves/MainWireFourValveDiseaseResearchBracketsV1";
import {
  stepMainWireAorticRecoveredRootPortValveScalarsV1,
  type MainWireAorticRecoveredRootPortValveEvaluationV1,
} from "@/engine/valves/MainWireAorticRecoveredRootPortValveV1";
import {
  initialMainWireQuasiSteadyOrificeValveStateV2,
  stepMainWireQuasiSteadyOrificeValveScalarsV2,
  type MainWireQuasiSteadyOrificeValveEvaluationV2,
  type MainWireQuasiSteadyOrificeValveStateV2,
} from "@/engine/valves/MainWireQuasiSteadyOrificeValveV2";
import {
  stressedVolumeFromPtm,
  type VascularPvLaw,
} from "@/engine/vascularPv";
import { evaluateIabpV1 } from "@/engine/devices/iabpV1";
import {
  evaluateDynamicMechanicalSupportHydraulicsV1,
  validateDynamicMechanicalSupportAcceptedStateV1,
  validateDynamicMechanicalSupportInertanceProfileV1,
  type DynamicMechanicalSupportAcceptedStateV1,
  type DynamicMechanicalSupportHydraulicEvaluationV1,
  type DynamicMechanicalSupportInertanceProfileV1,
} from "@/engine/devices/dynamicNetworkV1";
import {
  evaluateMechanicalSupportHydraulicsV1,
  validateMechanicalSupportConfigV1,
} from "@/engine/devices/networkV1";
import {
  MECHANICAL_SUPPORT_NODE_NAMES_V1,
  type MechanicalSupportConfigV1,
  type MechanicalSupportHydraulicEvaluationV1,
} from "@/engine/devices/typesV1";

export const NON_CORONARY_CIRCULATION_BE_V1_ID =
  "main-wire-derived-noncoronary-experimental-backward-euler-v1" as const;

export const NON_CORONARY_NODE_NAMES_V1 = Object.freeze([
  "LV", "LA", "RV", "RA",
  "Ao", "SA", "Art", "Cap", "SV", "VC",
  "PA", "PArt", "PCap", "PVen", "PVein",
] as const);
export type NonCoronaryNodeNameV1 =
  (typeof NON_CORONARY_NODE_NAMES_V1)[number];

export const NON_CORONARY_EDGE_NAMES_V1 = Object.freeze([
  "MV", "AoV", "TV", "PV",
  "Ao_SA", "SA_Art", "Art_Cap", "Cap_SV", "SV_VC", "VC_RA",
  "PA_PArt", "PArt_PCap", "PCap_PVen", "PVen_PVein", "PVein_LA",
] as const);
export type NonCoronaryEdgeNameV1 =
  (typeof NON_CORONARY_EDGE_NAMES_V1)[number];

export const NON_CORONARY_DYNAMIC_EDGE_NAMES_V1 = Object.freeze([
  "Ao_SA", "PA_PArt",
] as const);
export type NonCoronaryDynamicEdgeNameV1 =
  (typeof NON_CORONARY_DYNAMIC_EDGE_NAMES_V1)[number];

export const NON_CORONARY_VALVE_NAMES_V1 = Object.freeze([
  "MV", "AoV", "TV", "PV",
] as const);
export type NonCoronaryValveNameV1 =
  (typeof NON_CORONARY_VALVE_NAMES_V1)[number];

export type NonCoronaryValveEvaluationV1 =
  | MainWireQuasiSteadyOrificeValveEvaluationV2
  | MainWireAorticRecoveredRootPortValveEvaluationV1;

const NON_CORONARY_NODE_INDEX_BY_NAME_V1 = Object.freeze(Object.fromEntries(
  NON_CORONARY_NODE_NAMES_V1.map((name, index) => [name, index]),
) as Record<NonCoronaryNodeNameV1, number>);
const NON_CORONARY_EDGE_INDEX_BY_NAME_V1 = Object.freeze(Object.fromEntries(
  NON_CORONARY_EDGE_NAMES_V1.map((name, index) => [name, index]),
) as Record<NonCoronaryEdgeNameV1, number>);
const NON_CORONARY_DYNAMIC_EDGE_INDEX_BY_NAME_V1 = Object.freeze(
  Object.fromEntries(
    NON_CORONARY_DYNAMIC_EDGE_NAMES_V1.map((name, index) => [name, index]),
  ) as Record<NonCoronaryDynamicEdgeNameV1, number>,
);
const NON_CORONARY_VALVE_INDEX_BY_NAME_V1 = Object.freeze(Object.fromEntries(
  NON_CORONARY_VALVE_NAMES_V1.map((name, index) => [name, index]),
) as Record<NonCoronaryValveNameV1, number>);

export const NON_CORONARY_CIRCULATION_SCOPE_V1 = Object.freeze({
  topologySource: "main-wire-buildNodes-buildEdges" as const,
  dynamicsOwner: "independent-experimental-backward-euler" as const,
  modelCoreRuntimeAdopted: false as const,
  includedNodes: NON_CORONARY_NODE_NAMES_V1,
  includedEdges: NON_CORONARY_EDGE_NAMES_V1,
  excludedCoronaryNodes: Object.freeze([
    "LAD_Art", "LAD_IM", "LAD_Ven",
    "LCx_Art", "LCx_IM", "LCx_Ven",
    "RCA_Art", "RCA_IM", "RCA_Ven", "CS",
  ] as const),
  excludedCoronaryEdges: Object.freeze([
    "Ao_LAD", "LAD_Art_IM", "LAD_IM_Ven", "LAD_Ven_CS",
    "Ao_LCx", "LCx_Art_IM", "LCx_IM_Ven", "LCx_Ven_CS",
    "Ao_RCA", "RCA_Art_IM", "RCA_IM_Ven", "RCA_Ven_CS", "CS_RA",
  ] as const),
  dependentBloodVolumeNode: "SV" as const,
  valveOwner: "MainWireQuasiSteadyOrificeValveV2" as const,
  optionalSelectedAorticValveOwner:
    "MainWireAorticRecoveredRootPortValveV1" as const,
  optionalSelectedAorticValveActivation:
    "runtime.vascular.selectedAorticOutflowProfile" as const,
  valveAcceptedMemory: "leaflet-opening-fraction-only" as const,
  valveFlow: "algebraic-candidate-readback" as const,
  valveLocalBulkInertance: "omitted-from-canonical" as const,
  semilunarRootInertanceOwners: Object.freeze({
    AoV: "Ao_SA" as const,
    PV: "PA_PArt" as const,
  }),
  valveLegacyEdgeHydraulicsUsed: false as const,
  coronaryBloodVolumeIncluded: false as const,
  chamberPressureCallback: "absolute-pressure-mmHg" as const,
  chamberPressureTangent:
    "optional-same-candidate-absolute-4x4-mmHg-per-mL" as const,
  circulationJacobian:
    "analytic-semismooth-when-pressure-tangent-available-otherwise-full-fd" as const,
  pericardialConstraintOwnedHere: false as const,
  parameterFittingAllowed: false as const,
  reverseFlowCapOrClampOnNonvalveEdges: false as const,
});

export const NON_CORONARY_CIRCULATION_UNITS_V1 = Object.freeze({
  time: "s" as const,
  nodeVolume: "mL" as const,
  pressure: "mmHg" as const,
  edgeFlow: "mL/s" as const,
  linearResistance: "mmHg*s/mL" as const,
  inertance: "mmHg*s^2/mL" as const,
  quadraticResistance: "mmHg*s^2/mL^2" as const,
});

type NodeRecord<T> = Readonly<Record<NonCoronaryNodeNameV1, T>>;
type EdgeRecord<T> = Readonly<Record<NonCoronaryEdgeNameV1, T>>;
type DynamicEdgeRecord<T> = Readonly<Record<NonCoronaryDynamicEdgeNameV1, T>>;
type ValveRecord<T> = Readonly<Record<NonCoronaryValveNameV1, T>>;

export type NonCoronaryChamberVolumesMlV1 = Readonly<{
  LV: number;
  LA: number;
  RV: number;
  RA: number;
}>;

export type NonCoronaryChamberPressuresMmHgV1 = Readonly<{
  LV: number;
  LA: number;
  RV: number;
  RA: number;
}>;

export const NON_CORONARY_CHAMBER_TANGENT_ORDER_V1 = Object.freeze([
  "LV",
  "LA",
  "RV",
  "RA",
] as const);
export type NonCoronaryChamberNameV1 =
  (typeof NON_CORONARY_CHAMBER_TANGENT_ORDER_V1)[number];
export type NonCoronaryChamberPressureTangentMatrixV1 = readonly [
  readonly [number, number, number, number],
  readonly [number, number, number, number],
  readonly [number, number, number, number],
  readonly [number, number, number, number],
];

/**
 * Same-candidate algorithmic derivative of absolute chamber-node pressure.
 * The callback owns composition of transmural mechanics, common pericardium,
 * and any other chamber pressure offset. The circulation kernel must not add
 * the common-pericardium rank-one term a second time.
 */
export type NonCoronaryAbsoluteChamberPressureTangentV1 = Readonly<{
  rowPressureOrder: typeof NON_CORONARY_CHAMBER_TANGENT_ORDER_V1;
  columnVolumeOrder: typeof NON_CORONARY_CHAMBER_TANGENT_ORDER_V1;
  units: "mmHg/mL";
  pressureKind: "absolute";
  derivativeSemantics:
    "candidate-algorithmic-at-fixed-accepted-state-time-dt-and-drive";
  dPressureDVolumeMmHgPerMl:
    NonCoronaryChamberPressureTangentMatrixV1;
}>;

export type NonCoronaryCandidateMechanicsResultV1<TEvaluation> = Readonly<{
  /** Absolute chamber-node pressures; callback owns any pericardial offset. */
  absolutePressuresMmHg: NonCoronaryChamberPressuresMmHgV1;
  /**
   * Optional only for custom/test compatibility. When present, the circulation
   * Newton uses the analytic/semismooth Jacobian. When absent, it explicitly
   * falls back to the historical full finite-difference Jacobian.
   */
  absolutePressureTangent?: NonCoronaryAbsoluteChamberPressureTangentV1;
  /** Opaque readback only. This circulation kernel never commits mechanics. */
  evaluation: TEvaluation;
}>;

export type NonCoronaryCandidateMechanicsCallbackV1<TEvaluation> = (
  chamberVolumesMl: NonCoronaryChamberVolumesMlV1,
  candidateTimeSec: number,
) => NonCoronaryCandidateMechanicsResultV1<TEvaluation>;

export type NonCoronaryCirculationRuntimeParamsV1 = Readonly<{
  vascular: VascularPvRuntimeParameterViewV1;
  losses: BaseEdgeLossRuntimeParameterViewV1;
  respiratory: RespiratoryPressureParameterViewV1;
  /** New exact owners only; omission preserves the published circulation. */
  parallelPulmonaryPaths?: import("./ParallelPulmonaryPathsV1").ParallelPulmonaryPathsV1;
  /** Explicit even for normal, so numeric identity and provenance cannot diverge. */
  valveResearchInput: MainWireFourValveDiseaseResearchInputV1;
}>;

/**
 * Optional same-candidate device extension. It is deliberately a trial input;
 * the circulation kernel does not own or promote device state.
 */
export type NonCoronaryMechanicalSupportInputV1 = Readonly<{
  config: MechanicalSupportConfigV1;
  /** Used only to map accepted time to IABP beat phase. */
  heartRateBpm: number;
}>;

/**
 * Optional pure dynamic-device trial seam. The circulation core reads one
 * immutable accepted q_n record on every Newton/FD/line-search probe and
 * exposes q_(n+1), but deliberately does not own or promote device state.
 */
export type NonCoronaryDynamicMechanicalSupportInputV1 = Readonly<{
  config: MechanicalSupportConfigV1;
  /** Used only to map accepted time to IABP beat phase. */
  heartRateBpm: number;
  profile: DynamicMechanicalSupportInertanceProfileV1;
  previousAcceptedState: DynamicMechanicalSupportAcceptedStateV1;
}>;

export type NonCoronaryCirculationGraphV1 = Readonly<{
  topologyId: typeof NON_CORONARY_CIRCULATION_BE_V1_ID;
  nodes: readonly NodeSpec[];
  edges: readonly EdgeSpec[];
  nodeIndex: ReadonlyMap<string, number>;
  edgeIndex: ReadonlyMap<string, number>;
  scope: typeof NON_CORONARY_CIRCULATION_SCOPE_V1;
}>;

export type NonCoronaryCirculationAcceptedStateV1 = Readonly<{
  transactionId: typeof NON_CORONARY_CIRCULATION_BE_V1_ID;
  revision: number;
  acceptedTimeSec: number;
  /** Fixed conserved-volume owner; never re-derived during state promotion. */
  totalBloodVolumeMl: number;
  nodeVolumesMl: NodeRecord<number>;
  dynamicEdgeFlowsMlPerSec: DynamicEdgeRecord<number>;
  valveStates: ValveRecord<MainWireQuasiSteadyOrificeValveStateV2>;
}>;

export type NonCoronaryCirculationColdSeedV1 = Readonly<{
  fixedTotalBloodVolumeMl: number;
  nodeVolumesMl: NodeRecord<number>;
}>;

export const NON_CORONARY_CIRCULATION_CHECKPOINT_V1_ID =
  "main-wire-noncoronary-circulation-checkpoint-v1" as const;
export type NonCoronaryCirculationCheckpointV1 = Readonly<{
  checkpointId: typeof NON_CORONARY_CIRCULATION_CHECKPOINT_V1_ID;
  schemaVersion: 1;
  state: NonCoronaryCirculationAcceptedStateV1;
  stateFingerprint: string;
}>;

export type NonCoronaryCirculationInitialStateInputV1 = Readonly<{
  timeSec: number;
  runtime: NonCoronaryCirculationRuntimeParamsV1;
  /** Explicit conserved-volume owner for this circulation transaction. */
  fixedTotalBloodVolumeMl: number;
  nodeVolumesMl?: NodeRecord<number>;
  dynamicEdgeFlowsMlPerSec?: DynamicEdgeRecord<number>;
  valveStates?: ValveRecord<MainWireQuasiSteadyOrificeValveStateV2>;
}>;

export type NonCoronaryCirculationNewtonOptionsV1 = Readonly<{
  maxIterations?: number;
  /** Absolute term in the per-node mixed continuity-residual gate. */
  absoluteContinuityResidualToleranceMl?: number;
  scaledResidualInfinityTolerance?: number;
  scaledUpdateInfinityTolerance?: number;
  finiteDifferenceScaledStep?: number;
  maximumLineSearchBacktracks?: number;
  /** Development/test-only; production leaves the expensive shadow disabled. */
  analyticJacobianFiniteDifferenceShadow?: boolean;
}>;

/**
 * Protocol-only hydraulic intervention. This is intentionally separate from
 * the case/runtime parameterization: it represents a transient external
 * occlusion (for example an IVC-like preload reduction), not a new vascular
 * phenotype or a persistent controller value.
 */
export type NonCoronaryProtocolResistanceScaleByEdgeV1 = Readonly<
  Partial<Record<NonCoronaryEdgeNameV1, number>>
>;

export type NonCoronaryIndependentNodeNameV1 = Exclude<
  NonCoronaryNodeNameV1,
  "SV"
>;

export const NON_CORONARY_CONSERVATIVE_COMPANION_BOUNDARY_NODES_V1 =
  Object.freeze(["Ao", "RA"] as const);
export type NonCoronaryConservativeCompanionBoundaryNodeV1 =
  (typeof NON_CORONARY_CONSERVATIVE_COMPANION_BOUNDARY_NODES_V1)[number];

export type NonCoronaryIndependentNodeRecordV1<T> = Readonly<
  Record<NonCoronaryIndependentNodeNameV1, T>
>;
export type NonCoronaryCompanionBoundaryRecordV1<T> = Readonly<
  Record<NonCoronaryConservativeCompanionBoundaryNodeV1, T>
>;

/**
 * Same-candidate input for an optional conservative implicit companion.
 *
 * The companion is deliberately generic: the circulation core never imports
 * a device, coronary, renal, or other subsystem type. Implementations must be
 * pure with respect to accepted state. In particular, every Newton/line-search
 * probe must start from the same previous accepted companion state rather than
 * from the preceding candidate evaluation.
 */
export type NonCoronaryConservativeCompanionCandidateInputV1<TEvaluation> =
  Readonly<{
    candidateTimeSec: number;
    dtSec: number;
    fixedGlobalTotalBloodVolumeMl: number;
    independentNodeOrder: readonly NonCoronaryIndependentNodeNameV1[];
    scaledIndependentVolumes: readonly number[];
    independentVolumeScalesMl: readonly number[];
    candidateIndependentNodeVolumesMl:
      NonCoronaryIndependentNodeRecordV1<number>;
    boundaryAbsolutePressuresMmHg:
      NonCoronaryCompanionBoundaryRecordV1<number>;
    /** Null when the mechanics callback did not provide its algorithmic tangent. */
    dBoundaryAbsolutePressureDScaledIndependentVolume:
      NonCoronaryCompanionBoundaryRecordV1<readonly number[]> | null;
    /** Opaque to this core; the companion implementation owns interpretation. */
    candidateMechanicsEvaluation: TEvaluation;
  }>;

export type NonCoronaryConservativeCompanionSensitivitiesV1 = Readonly<{
  dCandidateCompanionBloodVolumeMlDScaledIndependentVolume:
    readonly number[];
  dOuterBoundaryNetVolumeRateMlPerSecDScaledIndependentVolume:
    NonCoronaryCompanionBoundaryRecordV1<readonly number[]>;
}>;

export type NonCoronaryConservativeCompanionCandidateEvaluationV1<
  TCompanionTrial,
> = Readonly<{
  /** All conserved volume states owned by the companion at this candidate. */
  candidateCompanionBloodVolumeMl: number;
  /**
   * Net rate INTO each outer boundary node. For a coronary companion this is
   * normally negative at Ao (uptake) and positive at RA (venous return).
   */
  outerBoundaryNetVolumeRateMlPerSec:
    NonCoronaryCompanionBoundaryRecordV1<number>;
  /** Opaque pure trial; only the companion-aware transaction may promote it. */
  candidateCompanionTrial: TCompanionTrial;
  /** Omission is valid and explicitly selects the full finite-difference Jacobian. */
  sensitivities?: NonCoronaryConservativeCompanionSensitivitiesV1;
}>;

export type NonCoronaryConservativeCompanionAdapterV1<
  TEvaluation,
  TCompanionTrial,
> = Readonly<{
  /** Sole global conserved-volume owner for the coupled transaction. */
  fixedGlobalTotalBloodVolumeMl: number;
  /** Ledger value from the same previous accepted companion state. */
  previousAcceptedCompanionBloodVolumeMl: number;
  evaluateSameCandidate: (
    input: NonCoronaryConservativeCompanionCandidateInputV1<TEvaluation>,
  ) => NonCoronaryConservativeCompanionCandidateEvaluationV1<TCompanionTrial>;
}>;

export type NonCoronaryCirculationTrialInputV1<
  TEvaluation,
  TCompanionTrial = never,
> = Readonly<{
  previousAcceptedState: NonCoronaryCirculationAcceptedStateV1;
  dtSec: number;
  runtime: NonCoronaryCirculationRuntimeParamsV1;
  mechanicalSupport?: NonCoronaryMechanicalSupportInputV1;
  /** Mutually exclusive with the legacy algebraic mechanicalSupport seam. */
  dynamicMechanicalSupport?: NonCoronaryDynamicMechanicalSupportInputV1;
  evaluateCandidateMechanics:
    NonCoronaryCandidateMechanicsCallbackV1<TEvaluation>;
  options?: NonCoronaryCirculationNewtonOptionsV1;
  protocolResistanceScaleByEdge?:
    NonCoronaryProtocolResistanceScaleByEdgeV1;
  conservativeCompanion?: NonCoronaryConservativeCompanionAdapterV1<
    TEvaluation,
    TCompanionTrial
  >;
  /**
   * Optional Session-owned allocation storage. It is neither accepted state
   * nor checkpoint content, and a returned trial never aliases it.
   */
  scratchWorkspace?: NonCoronaryBackwardEulerScratchWorkspaceV1;
}>;

export type NonCoronaryCirculationTrialDiagnosticsV1 = Readonly<{
  iterations: number;
  acceptedLineSearchSteps: number;
  lineSearchBacktracks: number;
  finalScaledResidualInfinityNorm: number;
  finalMixedContinuityResidualInfinityNorm: number;
  absoluteContinuityResidualToleranceMl: number;
  relativeContinuityResidualTolerance: number;
  finalMaximumContinuityResidualMl: number;
  dependentNodeContinuityResidualMl: number;
  totalBloodVolumeErrorMl: number;
  jacobianMode:
    | "not-required"
    | "analytic-semismooth"
    | "full-fd-fallback"
    | "mixed";
  pressureTangentAvailableAtFinalCandidate: boolean;
  finiteDifferenceScaledStep: number | null;
  finiteDifferenceJacobianFallbackReason:
    | "absolute-chamber-pressure-tangent-not-provided"
    | "conservative-companion-sensitivities-not-provided"
    | null;
  analyticJacobianAssemblyCount: number;
  finiteDifferenceJacobianFallbackCount: number;
  finiteDifferenceJacobianShadowCount: number;
  jacobianMaximumAbsoluteShadowDifference: number | null;
  jacobianMaximumRelativeFrobeniusShadowDifference: number | null;
  mechanicsCallbackCallCount: number;
  mechanicsCallbackCacheHitCount: number;
  mechanicsCallbackUniqueCandidateCount: number;
  worstIndependentContinuityResidual: null | Readonly<{
    node: Exclude<NonCoronaryNodeNameV1, "SV">;
    residualMl: number;
    absoluteResidualMl: number;
    scaledResidual: number;
  }>;
  worstMixedContinuityResidual: null | Readonly<{
    node: NonCoronaryNodeNameV1;
    residualMl: number;
    absoluteResidualMl: number;
    toleranceMl: number;
    normalizedResidual: number;
  }>;
  failureNewtonTrace: readonly NonCoronaryNewtonFailureTraceEntryV1[];
  lineSearchFailure: NonCoronaryLineSearchFailureDiagnosticsV1 | null;
}>;

export type NonCoronaryLineSearchRejectionOwnerV1 =
  | "candidate-evaluation-exception"
  | "armijo-residual-rejection"
  | "mixed-equal"
  | "none";

export type NonCoronaryNewtonFailureTraceEntryV1 = Readonly<{
  iteration: number;
  currentScaledResidualInfinityNorm: number;
  updateScaledInfinityNorm: number | null;
  lineSearchAttemptCount: number;
  candidateEvaluationExceptionCount: number;
  armijoResidualRejectionCount: number;
  acceptedStepLength: number | null;
  acceptedTrialScaledResidualInfinityNorm: number | null;
}>;

export type NonCoronaryLineSearchFailureDiagnosticsV1 = Readonly<{
  iteration: number;
  attemptCount: number;
  candidateEvaluationExceptionCount: number;
  armijoResidualRejectionCount: number;
  dominantRejectionOwner: NonCoronaryLineSearchRejectionOwnerV1;
  lastCandidateEvaluationException: null | Readonly<{
    backtrackIndex: number;
    stepLength: number;
    message: string;
  }>;
  lastArmijoResidualRejection: null | Readonly<{
    backtrackIndex: number;
    stepLength: number;
    trialScaledResidualInfinityNorm: number;
    requiredMaximumScaledResidualInfinityNorm: number;
  }>;
}>;

export type NonCoronaryConservativeCompanionTrialReadbackV1<
  TCompanionTrial,
> = Readonly<{
  fixedGlobalTotalBloodVolumeMl: number;
  previousAcceptedCompanionBloodVolumeMl: number;
  candidateCompanionBloodVolumeMl: number;
  outerBoundaryNetVolumeRateMlPerSec:
    NonCoronaryCompanionBoundaryRecordV1<number>;
  candidateCompanionTrial: TCompanionTrial;
}>;

export type NonCoronaryCirculationTrialSuccessV1<
  TEvaluation,
  TCompanionTrial = never,
> = Readonly<{
  converged: true;
  transactionId: typeof NON_CORONARY_CIRCULATION_BE_V1_ID;
  baseRevision: number;
  baseAcceptedTimeSec: number;
  candidateTimeSec: number;
  dtSec: number;
  candidateNodeVolumesMl: NodeRecord<number>;
  candidateDynamicEdgeFlowsMlPerSec: DynamicEdgeRecord<number>;
  candidateValveStates: ValveRecord<MainWireQuasiSteadyOrificeValveStateV2>;
  nodeAbsolutePressuresMmHg: NodeRecord<number>;
  edgeFlowsMlPerSec: EdgeRecord<number>;
  valveEvaluations: ValveRecord<NonCoronaryValveEvaluationV1>;
  candidateMechanicsEvaluation: TEvaluation;
  /** Present when a device configuration was supplied, including all-off. */
  mechanicalSupport?: MechanicalSupportHydraulicEvaluationV1;
  /** Pure candidate only; an outer transaction must promote its device state. */
  dynamicMechanicalSupport?: DynamicMechanicalSupportHydraulicEvaluationV1;
  /** Absent at runtime on the immutable non-companion path. */
  conservativeCompanion?:
    NonCoronaryConservativeCompanionTrialReadbackV1<TCompanionTrial>;
  diagnostics: NonCoronaryCirculationTrialDiagnosticsV1;
  mechanicsCommitted: false;
  reverseFlowCapOrClampOnNonvalveEdges: false;
  units: typeof NON_CORONARY_CIRCULATION_UNITS_V1;
}>;

export type NonCoronaryCirculationTrialFailureReasonV1 =
  | "invalid-input"
  | "initial-evaluation-failed"
  | "jacobian-failed"
  | "singular-jacobian"
  | "line-search-failed"
  | "maximum-iterations";

export type NonCoronaryCirculationTrialFailureV1 = Readonly<{
  converged: false;
  transactionId: typeof NON_CORONARY_CIRCULATION_BE_V1_ID;
  reason: NonCoronaryCirculationTrialFailureReasonV1;
  message: string;
  rollbackState: NonCoronaryCirculationAcceptedStateV1;
  lastAcceptedCandidateNodeVolumesMl: NodeRecord<number>;
  diagnostics: NonCoronaryCirculationTrialDiagnosticsV1;
  mechanicsCommitted: false;
  units: typeof NON_CORONARY_CIRCULATION_UNITS_V1;
}>;

export type NonCoronaryCirculationTrialResultV1<
  TEvaluation,
  TCompanionTrial = never,
> =
  | NonCoronaryCirculationTrialSuccessV1<TEvaluation, TCompanionTrial>
  | NonCoronaryCirculationTrialFailureV1;

/**
 * Detached one-candidate residual image for replacement-solver construction.
 * Every numerical array follows the exported canonical node orders. This is a
 * cold verification seam; the production replacement kernel owns separate
 * flat buffers and must not call this object-materializing path per Newton
 * iteration.
 */
export type NonCoronaryCirculationCandidateProbeV1<
  TEvaluation,
  TCompanionTrial = never,
> = Readonly<{
  candidateTimeSec: number;
  candidateNodeVolumesMl: Float64Array;
  nodeAbsolutePressuresMmHg: Float64Array;
  vascularPressureTangentMmHgPerMl: Float64Array;
  edgeFlowsMlPerSec: Float64Array;
  continuityResidualMlByNode: Float64Array;
  scaledIndependentResidual: Float64Array;
  /** Same mixed continuity gate used by public candidate admission. */
  mixedContinuityResidualInfinityNorm: number;
  /**
   * Device-off local-continuity derivative with respect to the physical
   * dependent SV volume while every independent non-coronary volume and the
   * companion boundary rates remain fixed. The 14 rows follow
   * `NON_CORONARY_INDEPENDENT_NODE_NAMES_V1`.
   *
   * This is the `a = ∂r₀/∂V_SV` column needed by the monolithic
   * non-coronary/coronary Jacobian. It intentionally excludes the companion's
   * direct Ao/RA source-rate derivatives, which the coupled assembler adds
   * separately. Device/protocol slices return null until their component
   * writers own the corresponding tangent.
   */
  localIndependentResidualDDependentSvVolumeMlPerMl:
    Float64Array | null;
  /**
   * Physical 14x14 local-continuity tangent at fixed companion state. The
   * fixed-TBV dependent-SV chain is included; companion volume/rate
   * sensitivities are deliberately excluded for monolithic assembly.
   */
  localIndependentResidualDIndependentVolumeMlPerMl:
    Float64Array | null;
  /**
   * Direct physical 14x4 local-continuity derivative with respect to
   * absolute chamber pressure, ordered by
   * `NON_CORONARY_CHAMBER_TANGENT_ORDER_V1`. Candidate volumes, vascular
   * pressures and companion boundary rates remain fixed. This lets a global
   * mechanics solve chain its own internal-coordinate pressure directions
   * without perturbing the complete circulation residual.
   */
  localIndependentResidualDAbsoluteChamberPressureMlPerMmHg:
    Float64Array | null;
  absoluteChamberPressureTangent:
    NonCoronaryAbsoluteChamberPressureTangentV1 | null;
  candidateMechanicsEvaluation: TEvaluation;
  candidateCompanionTrial: TCompanionTrial | null;
}>;

export type NonCoronaryExternallySolvedCandidateDiagnosticsV1 = Readonly<{
  iterations: number;
  lineSearchBacktracks: number;
}>;

export const NON_CORONARY_PREPARED_CANDIDATE_EVALUATOR_V1_ID =
  "circleheart-noncoronary-prepared-candidate-evaluator-v1" as const;

/**
 * Opaque, one-step construction workspace for the replacement coupled solver.
 * It owns topology/runtime snapshots and mutable candidate storage; it is not
 * accepted state, checkpoint content, or a portable model contract.
 */
export type NonCoronaryPreparedCandidateEvaluatorV1<
  TEvaluation,
  TCompanionTrial = never,
> = Readonly<{
  schemaId: typeof NON_CORONARY_PREPARED_CANDIDATE_EVALUATOR_V1_ID;
  independentNodeCount: number;
  /** Type-only invariance marker. */
  _types?: (evaluation: TEvaluation) => TCompanionTrial;
}>;

/**
 * Borrowed numerical view valid only during one synchronous prepared-candidate
 * callback. Typed arrays are overwritten by the next evaluation and must not
 * escape the callback.
 */
export type NonCoronaryPreparedCandidateBorrowV1<TEvaluation> = Readonly<{
  candidateTimeSec: number;
  nodeVolumesMl: Float64Array;
  nodeAbsolutePressuresMmHg: Float64Array;
  vascularPressureTangentMmHgPerMl: Float64Array;
  edgeFlowsMlPerSec: Float64Array;
  dynamicEdgeFlowsMlPerSec: Float64Array;
  valveStates: readonly MainWireQuasiSteadyOrificeValveStateV2[];
  valveEvaluations: readonly NonCoronaryValveEvaluationV1[];
  mechanicalSupport: MechanicalSupportHydraulicEvaluationV1 | null;
  dynamicMechanicalSupport:
    DynamicMechanicalSupportHydraulicEvaluationV1 | null;
  continuityResidualMlByNode: Float64Array;
  /**
   * Maximum node-wise mixed atol + rtol continuity residual. Values at or
   * below one satisfy the same admission gate as a public circulation trial.
   */
  mixedContinuityResidualInfinityNorm: number;
  absoluteChamberPressureTangent:
    NonCoronaryAbsoluteChamberPressureTangentV1 | null;
  candidateMechanicsEvaluation: TEvaluation;
}>;

export function classifyNonCoronaryLineSearchRejectionOwnerV1(
  candidateEvaluationExceptionCount: number,
  armijoResidualRejectionCount: number,
): NonCoronaryLineSearchRejectionOwnerV1 {
  requireInteger(
    candidateEvaluationExceptionCount,
    "candidateEvaluationExceptionCount",
  );
  requireInteger(
    armijoResidualRejectionCount,
    "armijoResidualRejectionCount",
  );
  if (candidateEvaluationExceptionCount === 0
      && armijoResidualRejectionCount === 0) return "none";
  if (candidateEvaluationExceptionCount > armijoResidualRejectionCount) {
    return "candidate-evaluation-exception";
  }
  if (armijoResidualRejectionCount > candidateEvaluationExceptionCount) {
    return "armijo-residual-rejection";
  }
  return "mixed-equal";
}

type ConservativeCompanionCandidateEvaluationInternalV1<TCompanionTrial> =
  NonCoronaryConservativeCompanionCandidateEvaluationV1<TCompanionTrial>
  & Readonly<{
    fixedGlobalTotalBloodVolumeMl: number;
    previousAcceptedCompanionBloodVolumeMl: number;
  }>;

type CandidateEvaluation<TEvaluation, TCompanionTrial = never> = Readonly<{
  nodeVolumesMl: Float64Array;
  nodeAbsolutePressuresMmHg: Float64Array;
  vascularPressureTangentMmHgPerMl: Float64Array;
  edgeFlowsMlPerSec: Float64Array;
  dynamicEdgeFlowsMlPerSec: Float64Array;
  valveStates: readonly MainWireQuasiSteadyOrificeValveStateV2[];
  valveEvaluations: readonly NonCoronaryValveEvaluationV1[];
  candidateMechanicsEvaluation: TEvaluation;
  mechanicalSupport: MechanicalSupportHydraulicEvaluationV1 | null;
  dynamicMechanicalSupport:
    DynamicMechanicalSupportHydraulicEvaluationV1 | null;
  absoluteChamberPressureTangent:
    NonCoronaryAbsoluteChamberPressureTangentV1 | null;
  conservativeCompanion:
    ConservativeCompanionCandidateEvaluationInternalV1<TCompanionTrial>
    | null;
  continuityResidualMlByNode: Float64Array;
  scaledIndependentResidual: Float64Array;
}>;

/**
 * One reusable numerical image for a Newton candidate.
 *
 * Two images live in a borrowed workspace. The current image is never written
 * while a line-search trial is being evaluated in the other image. Public
 * success/failure values detach from either image before the workspace can be
 * borrowed again.
 */
type MutableCandidateNumericalPageV1 = {
  readonly independentNodeVolumesMl: Record<
    NonCoronaryIndependentNodeNameV1,
    number
  >;
  readonly nodeVolumesMl: Float64Array;
  readonly nodeAbsolutePressuresMmHg: Float64Array;
  readonly vascularPressureTangentMmHgPerMl: Float64Array;
  readonly edgeFlowsMlPerSec: Float64Array;
  readonly dynamicEdgeFlowsMlPerSec: Float64Array;
  readonly valveStates: MainWireQuasiSteadyOrificeValveStateV2[];
  readonly valveEvaluations: NonCoronaryValveEvaluationV1[];
  readonly nodeVolumeRatesMlPerSec: Float64Array;
  readonly continuityResidualMlByNode: Float64Array;
  readonly scaledIndependentResidual: Float64Array;
};

type NonCoronaryVascularPvLawsV1 = Readonly<
  Partial<Record<NonCoronaryNodeNameV1, VascularPvLaw>>
>;

type JacobianUsageDiagnosticsV1 = {
  analyticAssemblyCount: number;
  finiteDifferenceFallbackCount: number;
  finiteDifferenceShadowCount: number;
  maximumAbsoluteShadowDifference: number | null;
  maximumRelativeFrobeniusShadowDifference: number | null;
};

type MixedContinuityResidualAudit = Readonly<{
  infinityNorm: number;
  worst: NonNullable<
    NonCoronaryCirculationTrialDiagnosticsV1["worstMixedContinuityResidual"]
  >;
}>;

type MutableNewtonFailureTraceEntryV1 = {
  iteration: number;
  currentScaledResidualInfinityNorm: number;
  updateScaledInfinityNorm: number | null;
  lineSearchAttemptCount: number;
  candidateEvaluationExceptionCount: number;
  armijoResidualRejectionCount: number;
  acceptedStepLength: number | null;
  acceptedTrialScaledResidualInfinityNorm: number | null;
};

/**
 * Per-step memo of mechanics-callback results, keyed on the candidate time and
 * the four chamber volumes.
 *
 * On the analytic-Jacobian path the hit rate is exactly zero: every candidate
 * the outer Newton loop asks for differs in at least one chamber volume, and a
 * full healthy beat reports `mechanicsCallbackCacheHits` of 0 for all 2500
 * steps. On the finite-difference fallback path it is not: the Jacobian probes
 * every independent node, and the nine non-chamber columns leave all four
 * chamber volumes unchanged, so each of them is a hit. Removing the memo would
 * multiply whole-heart mechanics evaluations on exactly the path that already
 * costs the most.
 */
type CandidateMechanicsCache<TEvaluation> = {
  readonly values: CandidateMechanicsCacheEntry<TEvaluation>[];
  readonly jacobianUsage: JacobianUsageDiagnosticsV1;
  callCount: number;
  hitCount: number;
  uniqueCandidateCount: number;
};

type CandidateMechanicsCacheEntry<TEvaluation> = {
  candidateTimeSec: number;
  LV: number;
  LA: number;
  RV: number;
  RA: number;
  result: NonCoronaryCandidateMechanicsResultV1<TEvaluation>;
};

type NonCoronaryPreparedCandidateStorageV1<
  TEvaluation,
  TCompanionTrial,
> = {
  readonly input:
    NonCoronaryCirculationTrialInputV1<TEvaluation, TCompanionTrial>;
  readonly graph: NonCoronaryCirculationGraphV1;
  readonly options: Required<NonCoronaryCirculationNewtonOptionsV1>;
  readonly previous: PreviousAcceptedNumericalStateV1;
  readonly candidateTimeSec: number;
  readonly respiratoryExternalPressures: RespiratoryExternalPressuresV1;
  readonly vascularPvLaws: NonCoronaryVascularPvLawsV1;
  readonly volumeScales: readonly number[];
  readonly scaledUnknowns: number[];
  readonly mechanicsCache: CandidateMechanicsCache<TEvaluation>;
  readonly candidatePage: MutableCandidateNumericalPageV1;
  readonly dependentSvColumn: Float64Array;
  readonly localJacobian: Float64Array;
  inUse: boolean;
};

const NON_CORONARY_PREPARED_CANDIDATE_STORAGE_V1 = new WeakMap<
  object,
  NonCoronaryPreparedCandidateStorageV1<unknown, unknown>
>();

const DEPENDENT_NODE: NonCoronaryNodeNameV1 = "SV";
export const NON_CORONARY_INDEPENDENT_NODE_NAMES_V1 = Object.freeze(
  NON_CORONARY_NODE_NAMES_V1.filter(
    (name): name is NonCoronaryIndependentNodeNameV1 =>
      name !== DEPENDENT_NODE,
  ),
);
const INDEPENDENT_NODE_NAMES = NON_CORONARY_INDEPENDENT_NODE_NAMES_V1;
const INDEPENDENT_NODE_INDEX: Readonly<
  Partial<Record<NonCoronaryNodeNameV1, number>>
> = Object.freeze(
  INDEPENDENT_NODE_NAMES.reduce(
    (indices, name, index) => {
      indices[name] = index;
      return indices;
    },
    {} as Partial<Record<NonCoronaryNodeNameV1, number>>,
  ),
);
const CHAMBER_TANGENT_INDEX: Readonly<
  Partial<Record<NonCoronaryNodeNameV1, number>>
> = Object.freeze(
  NON_CORONARY_CHAMBER_TANGENT_ORDER_V1.reduce(
    (indices, name, index) => {
      indices[name] = index;
      return indices;
    },
    {} as Partial<Record<NonCoronaryNodeNameV1, number>>,
  ),
);
const DEFAULT_NEWTON_OPTIONS = Object.freeze({
  maxIterations: 30,
  absoluteContinuityResidualToleranceMl: 1e-8,
  scaledResidualInfinityTolerance: 2e-10,
  scaledUpdateInfinityTolerance: 2e-11,
  finiteDifferenceScaledStep: 2e-6,
  maximumLineSearchBacktracks: 24,
  analyticJacobianFiniteDifferenceShadow: false,
});
const MAX_NEWTON_FAILURE_TRACE_ENTRIES = 32;
const MAX_FAILURE_DIAGNOSTIC_MESSAGE_CHARACTERS = 1024;

export const NON_CORONARY_BACKWARD_EULER_SCRATCH_WORKSPACE_V1_ID =
  "circleheart-noncoronary-backward-euler-scratch-workspace-v1" as const;
export const NON_CORONARY_ACCEPTED_NUMERICAL_SOURCE_V1_ID =
  "circleheart-noncoronary-accepted-numerical-source-v1" as const;

/**
 * Internal numerical read seam for an already-admitted accepted-state image.
 * The object accepted state remains the rollback and validation authority;
 * every supplied scalar is compared exactly before the solver can consume it.
 */
export type NonCoronaryAcceptedNumericalDestinationV1 = {
  revision: number;
  acceptedTimeSec: number;
  totalBloodVolumeMl: number;
  readonly nodeVolumesMl: Float64Array;
  readonly dynamicEdgeFlowsMlPerSec: Float64Array;
  readonly valveOpeningFractions01: Float64Array;
};

export type NonCoronaryAcceptedNumericalSourceV1 = Readonly<{
  sourceId: typeof NON_CORONARY_ACCEPTED_NUMERICAL_SOURCE_V1_ID;
  readInto(destination: NonCoronaryAcceptedNumericalDestinationV1): void;
}>;

/**
 * Opaque allocation workspace for one synchronous outer circulation solve.
 * The WeakMap storage is deliberately absent from checkpoints and cannot be
 * reached through a successful or failed scientific trial.
 */
export type NonCoronaryBackwardEulerScratchWorkspaceV1 = Readonly<{
  schemaId: typeof NON_CORONARY_BACKWARD_EULER_SCRATCH_WORKSPACE_V1_ID;
  topologyId: typeof NON_CORONARY_CIRCULATION_BE_V1_ID;
  independentNodeCount: number;
}>;

type NonCoronaryBackwardEulerScratchStorageV1 = {
  readonly volumeScales: number[];
  readonly scaledUnknowns: number[];
  readonly candidateUnknowns: number[];
  readonly analyticJacobian: number[][];
  readonly linearRight: number[];
  readonly linearMatrix: number[][];
  readonly linearSolution: number[];
  readonly previousNumerical: MutablePreviousAcceptedNumericalStateV1;
  readonly candidatePages: readonly [
    MutableCandidateNumericalPageV1,
    MutableCandidateNumericalPageV1,
  ];
  inUse: boolean;
};

type PreviousAcceptedNumericalStateV1 = Readonly<{
  revision: number;
  acceptedTimeSec: number;
  totalBloodVolumeMl: number;
  nodeVolumesMl: Float64Array;
  dynamicEdgeFlowsMlPerSec: Float64Array;
  valveOpeningFractions01: Float64Array;
}>;

type MutablePreviousAcceptedNumericalStateV1 =
  NonCoronaryAcceptedNumericalDestinationV1;

const NON_CORONARY_BACKWARD_EULER_SCRATCH_STORAGE_V1 = new WeakMap<
  NonCoronaryBackwardEulerScratchWorkspaceV1,
  NonCoronaryBackwardEulerScratchStorageV1
>();

function createSquareMatrixV1(size: number): number[][] {
  return Array.from({ length: size }, () => Array<number>(size).fill(0));
}

function createMutableCandidateRecordV1<TName extends string, TValue>(
  names: readonly TName[],
  initialValue: TValue,
): Record<TName, TValue> {
  const record = {} as Record<TName, TValue>;
  for (const name of names) record[name] = initialValue;
  return record;
}

function createMutableCandidateNumericalPageV1():
MutableCandidateNumericalPageV1 {
  return {
    independentNodeVolumesMl: createMutableCandidateRecordV1(
      INDEPENDENT_NODE_NAMES,
      0,
    ),
    nodeVolumesMl: new Float64Array(NON_CORONARY_NODE_NAMES_V1.length),
    nodeAbsolutePressuresMmHg:
      new Float64Array(NON_CORONARY_NODE_NAMES_V1.length),
    vascularPressureTangentMmHgPerMl:
      new Float64Array(NON_CORONARY_NODE_NAMES_V1.length),
    edgeFlowsMlPerSec: new Float64Array(NON_CORONARY_EDGE_NAMES_V1.length),
    dynamicEdgeFlowsMlPerSec:
      new Float64Array(NON_CORONARY_DYNAMIC_EDGE_NAMES_V1.length),
    valveStates: Array<MainWireQuasiSteadyOrificeValveStateV2>(
      NON_CORONARY_VALVE_NAMES_V1.length,
    ),
    valveEvaluations:
      Array<NonCoronaryValveEvaluationV1>(
        NON_CORONARY_VALVE_NAMES_V1.length,
      ),
    nodeVolumeRatesMlPerSec:
      new Float64Array(NON_CORONARY_NODE_NAMES_V1.length),
    continuityResidualMlByNode:
      new Float64Array(NON_CORONARY_NODE_NAMES_V1.length),
    scaledIndependentResidual:
      new Float64Array(INDEPENDENT_NODE_NAMES.length),
  };
}

/** Creates reusable allocation storage without making it numerical authority. */
export function createNonCoronaryBackwardEulerScratchWorkspaceV1():
NonCoronaryBackwardEulerScratchWorkspaceV1 {
  const independentNodeCount = INDEPENDENT_NODE_NAMES.length;
  const workspace = Object.freeze({
    schemaId: NON_CORONARY_BACKWARD_EULER_SCRATCH_WORKSPACE_V1_ID,
    topologyId: NON_CORONARY_CIRCULATION_BE_V1_ID,
    independentNodeCount,
  });
  NON_CORONARY_BACKWARD_EULER_SCRATCH_STORAGE_V1.set(workspace, {
    volumeScales: Array<number>(independentNodeCount).fill(0),
    scaledUnknowns: Array<number>(independentNodeCount).fill(0),
    candidateUnknowns: Array<number>(independentNodeCount).fill(0),
    analyticJacobian: createSquareMatrixV1(independentNodeCount),
    linearRight: Array<number>(independentNodeCount).fill(0),
    linearMatrix: createSquareMatrixV1(independentNodeCount),
    linearSolution: Array<number>(independentNodeCount).fill(0),
    previousNumerical: {
      revision: 0,
      acceptedTimeSec: 0,
      totalBloodVolumeMl: 0,
      nodeVolumesMl: new Float64Array(NON_CORONARY_NODE_NAMES_V1.length),
      dynamicEdgeFlowsMlPerSec:
        new Float64Array(NON_CORONARY_DYNAMIC_EDGE_NAMES_V1.length),
      valveOpeningFractions01:
        new Float64Array(NON_CORONARY_VALVE_NAMES_V1.length),
    },
    candidatePages: [
      createMutableCandidateNumericalPageV1(),
      createMutableCandidateNumericalPageV1(),
    ],
    inUse: false,
  });
  return workspace;
}

function borrowNonCoronaryBackwardEulerScratchWorkspaceV1(
  workspace: NonCoronaryBackwardEulerScratchWorkspaceV1,
): NonCoronaryBackwardEulerScratchStorageV1 {
  const storage = NON_CORONARY_BACKWARD_EULER_SCRATCH_STORAGE_V1.get(workspace);
  if (storage === undefined) {
    throw new TypeError("non-coronary backward-Euler scratch workspace is foreign");
  }
  if (
    workspace.schemaId
      !== NON_CORONARY_BACKWARD_EULER_SCRATCH_WORKSPACE_V1_ID
    || workspace.topologyId !== NON_CORONARY_CIRCULATION_BE_V1_ID
    || workspace.independentNodeCount !== INDEPENDENT_NODE_NAMES.length
    || storage.volumeScales.length !== INDEPENDENT_NODE_NAMES.length
    || storage.scaledUnknowns.length !== INDEPENDENT_NODE_NAMES.length
    || storage.candidateUnknowns.length !== INDEPENDENT_NODE_NAMES.length
    || storage.analyticJacobian.length !== INDEPENDENT_NODE_NAMES.length
    || storage.linearRight.length !== INDEPENDENT_NODE_NAMES.length
    || storage.linearMatrix.length !== INDEPENDENT_NODE_NAMES.length
    || storage.linearSolution.length !== INDEPENDENT_NODE_NAMES.length
    || storage.previousNumerical.nodeVolumesMl.length
      !== NON_CORONARY_NODE_NAMES_V1.length
    || storage.previousNumerical.dynamicEdgeFlowsMlPerSec.length
      !== NON_CORONARY_DYNAMIC_EDGE_NAMES_V1.length
    || storage.previousNumerical.valveOpeningFractions01.length
      !== NON_CORONARY_VALVE_NAMES_V1.length
    || storage.candidatePages.length !== 2
    || storage.candidatePages.some((page) =>
      page.nodeVolumesMl.length !== NON_CORONARY_NODE_NAMES_V1.length
      || page.nodeAbsolutePressuresMmHg.length
        !== NON_CORONARY_NODE_NAMES_V1.length
      || page.vascularPressureTangentMmHgPerMl.length
        !== NON_CORONARY_NODE_NAMES_V1.length
      || page.edgeFlowsMlPerSec.length !== NON_CORONARY_EDGE_NAMES_V1.length
      || page.dynamicEdgeFlowsMlPerSec.length
        !== NON_CORONARY_DYNAMIC_EDGE_NAMES_V1.length
      || page.valveStates.length !== NON_CORONARY_VALVE_NAMES_V1.length
      || page.valveEvaluations.length !== NON_CORONARY_VALVE_NAMES_V1.length
      || page.nodeVolumeRatesMlPerSec.length
        !== NON_CORONARY_NODE_NAMES_V1.length
      || page.continuityResidualMlByNode.length
        !== NON_CORONARY_NODE_NAMES_V1.length
      || page.scaledIndependentResidual.length !== INDEPENDENT_NODE_NAMES.length)
  ) {
    throw new RangeError(
      "non-coronary backward-Euler scratch workspace topology mismatch",
    );
  }
  if (storage.inUse) {
    throw new Error(
      "non-coronary backward-Euler scratch workspace is already in use",
    );
  }
  storage.inUse = true;
  return storage;
}

function releaseNonCoronaryBackwardEulerScratchWorkspaceV1(
  storage: NonCoronaryBackwardEulerScratchStorageV1,
): void {
  storage.inUse = false;
}

function stagePreviousAcceptedNumericalStateV1(
  previous: NonCoronaryCirculationAcceptedStateV1,
  scratchStorage: NonCoronaryBackwardEulerScratchStorageV1 | null,
  source: NonCoronaryAcceptedNumericalSourceV1 | undefined,
): PreviousAcceptedNumericalStateV1 {
  const numerical = scratchStorage?.previousNumerical ?? {
    revision: previous.revision,
    acceptedTimeSec: previous.acceptedTimeSec,
    totalBloodVolumeMl: previous.totalBloodVolumeMl,
    nodeVolumesMl: new Float64Array(NON_CORONARY_NODE_NAMES_V1.length),
    dynamicEdgeFlowsMlPerSec:
      new Float64Array(NON_CORONARY_DYNAMIC_EDGE_NAMES_V1.length),
    valveOpeningFractions01:
      new Float64Array(NON_CORONARY_VALVE_NAMES_V1.length),
  };
  numerical.revision = previous.revision;
  numerical.acceptedTimeSec = previous.acceptedTimeSec;
  numerical.totalBloodVolumeMl = previous.totalBloodVolumeMl;
  if (source !== undefined) {
    if (source.sourceId !== NON_CORONARY_ACCEPTED_NUMERICAL_SOURCE_V1_ID) {
      throw new Error("non-coronary accepted numerical source is unsupported");
    }
    source.readInto(numerical);
    assertPreviousAcceptedNumericalParityV1(previous, numerical);
    // The aggregate is redundant with the admitted compartment vector. Once
    // its round-off-sized difference is accepted, use the rollback object's
    // canonical scalar so summation order cannot perturb the solve branch.
    numerical.totalBloodVolumeMl = previous.totalBloodVolumeMl;
    return numerical;
  }
  for (let index = 0; index < NON_CORONARY_NODE_NAMES_V1.length; index += 1) {
    numerical.nodeVolumesMl[index] = previous.nodeVolumesMl[
      NON_CORONARY_NODE_NAMES_V1[index]!
    ];
  }
  for (
    let index = 0;
    index < NON_CORONARY_DYNAMIC_EDGE_NAMES_V1.length;
    index += 1
  ) {
    numerical.dynamicEdgeFlowsMlPerSec[index] =
      previous.dynamicEdgeFlowsMlPerSec[
      NON_CORONARY_DYNAMIC_EDGE_NAMES_V1[index]!
    ];
  }
  for (let index = 0; index < NON_CORONARY_VALVE_NAMES_V1.length; index += 1) {
    numerical.valveOpeningFractions01[index] = previous.valveStates[
      NON_CORONARY_VALVE_NAMES_V1[index]!
    ].leafletOpeningFraction01;
  }
  return numerical;
}

function assertPreviousAcceptedNumericalParityV1(
  previous: NonCoronaryCirculationAcceptedStateV1,
  numerical: PreviousAcceptedNumericalStateV1,
): void {
  const totalBloodVolumeToleranceMl = 64 * Number.EPSILON * Math.max(
    1,
    Math.abs(numerical.totalBloodVolumeMl),
    Math.abs(previous.totalBloodVolumeMl),
  );
  if (
    numerical.revision !== previous.revision
    || !Object.is(numerical.acceptedTimeSec, previous.acceptedTimeSec)
    || !Number.isFinite(numerical.totalBloodVolumeMl)
    || Math.abs(
      numerical.totalBloodVolumeMl - previous.totalBloodVolumeMl
    ) > totalBloodVolumeToleranceMl
  ) {
    throw new Error(
      "non-coronary accepted numerical source clock or TBV diverged",
    );
  }
  for (let index = 0; index < NON_CORONARY_NODE_NAMES_V1.length; index += 1) {
    const name = NON_CORONARY_NODE_NAMES_V1[index]!;
    if (!Object.is(numerical.nodeVolumesMl[index], previous.nodeVolumesMl[name])) {
      throw new Error(
        `non-coronary accepted numerical source ${name} volume diverged`,
      );
    }
  }
  for (
    let index = 0;
    index < NON_CORONARY_DYNAMIC_EDGE_NAMES_V1.length;
    index += 1
  ) {
    const name = NON_CORONARY_DYNAMIC_EDGE_NAMES_V1[index]!;
    if (!Object.is(
      numerical.dynamicEdgeFlowsMlPerSec[index],
      previous.dynamicEdgeFlowsMlPerSec[name],
    )) {
      throw new Error(
        `non-coronary accepted numerical source ${name} flow diverged`,
      );
    }
  }
  for (let index = 0; index < NON_CORONARY_VALVE_NAMES_V1.length; index += 1) {
    const name = NON_CORONARY_VALVE_NAMES_V1[index]!;
    if (!Object.is(
      numerical.valveOpeningFractions01[index],
      previous.valveStates[name].leafletOpeningFraction01,
    )) {
      throw new Error(
        `non-coronary accepted numerical source ${name} opening diverged`,
      );
    }
  }
}

let cachedGraphV1: NonCoronaryCirculationGraphV1 | null = null;

/**
 * The non-coronary topology is a pure function of the authoritative graph and
 * the module-level scope constants: it takes no argument and depends on no
 * mutable state, so every call returns the same value. The frozen result is
 * built once per module instance and shared; every scope check below still runs
 * on that one build, so a source-topology change is still rejected.
 */
export function buildNonCoronaryCirculationGraphV1():
NonCoronaryCirculationGraphV1 {
  return cachedGraphV1 ??= buildNonCoronaryCirculationGraphOnceV1();
}

function buildNonCoronaryCirculationGraphOnceV1():
NonCoronaryCirculationGraphV1 {
  const sourceGraph = buildAuthoritativeCirculationGraphV1();
  const includedNodeNames = new Set<string>(NON_CORONARY_NODE_NAMES_V1);
  const nodes = Object.freeze(sourceGraph.nodes.filter((node) =>
    includedNodeNames.has(node.name)));
  const edges = Object.freeze(sourceGraph.edges.filter((edge) =>
    edge.group !== "coronary"));
  if (
    nodes.length !== NON_CORONARY_NODE_NAMES_V1.length
    || edges.length !== NON_CORONARY_EDGE_NAMES_V1.length
    || nodes.some((node, index) => node.name !== NON_CORONARY_NODE_NAMES_V1[index])
    || edges.some((edge, index) => edge.name !== NON_CORONARY_EDGE_NAMES_V1[index])
  ) throw new Error("main-wire source topology changed outside experimental scope");
  for (const excluded of NON_CORONARY_CIRCULATION_SCOPE_V1.excludedCoronaryNodes) {
    if (nodes.some((node) => node.name === excluded)) {
      throw new Error(`coronary node ${excluded} entered the non-coronary graph`);
    }
  }
  for (const edge of edges) {
    if (!includedNodeNames.has(edge.up) || !includedNodeNames.has(edge.down)) {
      throw new Error(`non-coronary edge ${edge.name} left the included node set`);
    }
  }
  return Object.freeze({
    topologyId: NON_CORONARY_CIRCULATION_BE_V1_ID,
    nodes,
    edges,
    nodeIndex: uniqueIndex(nodes),
    edgeIndex: uniqueIndex(edges),
    scope: NON_CORONARY_CIRCULATION_SCOPE_V1,
  });
}

function snapshotNonCoronaryVascularPvLawsV1(
  graph: NonCoronaryCirculationGraphV1,
  params: VascularPvRuntimeParameterViewV1,
): NonCoronaryVascularPvLawsV1 {
  const laws: Partial<Record<NonCoronaryNodeNameV1, VascularPvLaw>> = {};
  for (const node of graph.nodes) {
    const name = node.name as NonCoronaryNodeNameV1;
    if (isChamberName(name)) continue;
    laws[name] = Object.freeze(vascularPvLawFromNodeV1(node, params));
  }
  return Object.freeze(laws);
}

function requiredVascularPvLawV1(
  laws: NonCoronaryVascularPvLawsV1,
  name: NonCoronaryNodeNameV1,
): VascularPvLaw {
  const law = laws[name];
  if (law === undefined) {
    throw new Error(`vascular node ${name} has no snapshotted PV law`);
  }
  return law;
}

/**
 * Resolves the deterministic topology/runtime cold seed without selecting a
 * physiological operating point. Callers explicitly promote its total as the
 * fixed TBV owner, or supply another volume record with its own explicit owner.
 */
export function resolveNonCoronaryCirculationColdSeedV1(
  runtime: NonCoronaryCirculationRuntimeParamsV1,
): NonCoronaryCirculationColdSeedV1 {
  validateRuntime(runtime);
  const graph = buildNonCoronaryCirculationGraphV1();
  const nodeVolumesMl = initialNodeVolumes(graph, runtime);
  return Object.freeze({
    fixedTotalBloodVolumeMl: sumNodeRecord(nodeVolumesMl),
    nodeVolumesMl,
  });
}

export function createInitialNonCoronaryCirculationStateV1(
  input: NonCoronaryCirculationInitialStateInputV1,
): NonCoronaryCirculationAcceptedStateV1 {
  requireNonnegative(input.timeSec, "timeSec");
  validateRuntime(input.runtime);
  requirePositive(input.fixedTotalBloodVolumeMl, "fixedTotalBloodVolumeMl");
  const graph = buildNonCoronaryCirculationGraphV1();
  const nodeVolumesMl = input.nodeVolumesMl
    ? copyNodeRecord(input.nodeVolumesMl, "nodeVolumesMl", requirePositive)
    : initialNodeVolumes(graph, input.runtime);
  const dynamicEdgeFlowsMlPerSec = input.dynamicEdgeFlowsMlPerSec
    ? copyDynamicEdgeRecord(
      input.dynamicEdgeFlowsMlPerSec,
      "dynamicEdgeFlowsMlPerSec",
      requireFinite,
    )
    : dynamicEdgeRecord((name) => graph.edges[graph.edgeIndex.get(name)!].q0 ?? 0);
  const valveStates = input.valveStates
    ? copyValveStates(input.valveStates)
    : valveRecord((name) => {
      const edge = graph.edges[graph.edgeIndex.get(name)!];
      return initialMainWireQuasiSteadyOrificeValveStateV2(edge.xi0 ?? 0);
    });
  return acceptedState({
    revision: 0,
    acceptedTimeSec: input.timeSec,
    totalBloodVolumeMl: input.fixedTotalBloodVolumeMl,
    nodeVolumesMl,
    dynamicEdgeFlowsMlPerSec,
    valveStates,
  });
}

export function evaluateNonCoronaryCirculationBackwardEulerTrialV1<
  TEvaluation,
  TCompanionTrial = never,
>(
  input: NonCoronaryCirculationTrialInputV1<TEvaluation, TCompanionTrial>,
  previousAcceptedNumericalSource?: NonCoronaryAcceptedNumericalSourceV1,
): NonCoronaryCirculationTrialResultV1<TEvaluation, TCompanionTrial> {
  // A malformed accepted state is a programmer/checkpoint error and cannot
  // provide a trustworthy rollback target.
  validateAcceptedState(input.previousAcceptedState);
  let graph: NonCoronaryCirculationGraphV1;
  let options: Required<NonCoronaryCirculationNewtonOptionsV1>;
  try {
    requirePositive(input.dtSec, "dtSec");
    validateRuntime(input.runtime);
    validateProtocolResistanceScaleByEdge(
      input.protocolResistanceScaleByEdge,
    );
    validateConservativeCompanionAdapter(input);
    validateMechanicalSupportInput(input.mechanicalSupport);
    validateDynamicMechanicalSupportInput(input.dynamicMechanicalSupport);
    if (input.mechanicalSupport !== undefined
        && input.dynamicMechanicalSupport !== undefined) {
      throw new Error(
        "mechanicalSupport and dynamicMechanicalSupport are mutually exclusive",
      );
    }
    if (typeof input.evaluateCandidateMechanics !== "function") {
      throw new Error("evaluateCandidateMechanics must be a function");
    }
    graph = buildNonCoronaryCirculationGraphV1();
    options = resolveNewtonOptions(input.options);
  } catch (error) {
    return failure(
      input.previousAcceptedState,
      "invalid-input",
      errorMessage(error),
      input.previousAcceptedState.nodeVolumesMl,
      emptyDiagnostics(),
    );
  }
  const scratchStorage = input.scratchWorkspace === undefined
    ? null
    : borrowNonCoronaryBackwardEulerScratchWorkspaceV1(
      input.scratchWorkspace,
    );
  try {
    return evaluateNonCoronaryCirculationBackwardEulerTrialInternalV1(
      input,
      graph,
      options,
      scratchStorage,
      previousAcceptedNumericalSource,
    );
  } finally {
    if (scratchStorage !== null) {
      releaseNonCoronaryBackwardEulerScratchWorkspaceV1(scratchStorage);
    }
  }
}

/**
 * Prepares the invariant half of repeated same-step candidate evaluation for
 * the monolithic replacement solver. The accepted state and runtime are
 * validated once; each later call still validates its physical candidate.
 */
export function prepareNonCoronaryCandidateEvaluatorV1<
  TEvaluation,
  TCompanionTrial = never,
>(
  input: NonCoronaryCirculationTrialInputV1<TEvaluation, TCompanionTrial>,
  previousAcceptedNumericalSource?: NonCoronaryAcceptedNumericalSourceV1,
): NonCoronaryPreparedCandidateEvaluatorV1<TEvaluation, TCompanionTrial> {
  validateAcceptedState(input.previousAcceptedState);
  requirePositive(input.dtSec, "dtSec");
  validateRuntime(input.runtime);
  validateProtocolResistanceScaleByEdge(
    input.protocolResistanceScaleByEdge,
  );
  validateConservativeCompanionAdapter(input);
  validateMechanicalSupportInput(input.mechanicalSupport);
  validateDynamicMechanicalSupportInput(input.dynamicMechanicalSupport);
  if (
    input.mechanicalSupport !== undefined
    && input.dynamicMechanicalSupport !== undefined
  ) {
    throw new Error(
      "mechanicalSupport and dynamicMechanicalSupport are mutually exclusive",
    );
  }
  if (typeof input.evaluateCandidateMechanics !== "function") {
    throw new Error("evaluateCandidateMechanics must be a function");
  }
  const graph = buildNonCoronaryCirculationGraphV1();
  const options = resolveNewtonOptions(input.options);
  const previous = stagePreviousAcceptedNumericalStateV1(
    input.previousAcceptedState,
    null,
    previousAcceptedNumericalSource,
  );
  const candidateTimeSec = previous.acceptedTimeSec + input.dtSec;
  const respiratoryExternalPressures = respiratoryExternalPressuresV1(
    candidateTimeSec,
    input.runtime.respiratory,
  );
  const handle = Object.freeze({
    schemaId: NON_CORONARY_PREPARED_CANDIDATE_EVALUATOR_V1_ID,
    independentNodeCount: INDEPENDENT_NODE_NAMES.length,
  }) as NonCoronaryPreparedCandidateEvaluatorV1<
    TEvaluation,
    TCompanionTrial
  >;
  const storage: NonCoronaryPreparedCandidateStorageV1<
    TEvaluation,
    TCompanionTrial
  > = {
    input,
    graph,
    options,
    previous,
    candidateTimeSec,
    respiratoryExternalPressures,
    vascularPvLaws: snapshotNonCoronaryVascularPvLawsV1(
      graph,
      input.runtime.vascular,
    ),
    volumeScales: independentVolumeScales(previous.nodeVolumesMl),
    scaledUnknowns: Array<number>(INDEPENDENT_NODE_NAMES.length).fill(0),
    mechanicsCache: {
      values: [],
      jacobianUsage: {
        analyticAssemblyCount: 0,
        finiteDifferenceFallbackCount: 0,
        finiteDifferenceShadowCount: 0,
        maximumAbsoluteShadowDifference: null,
        maximumRelativeFrobeniusShadowDifference: null,
      },
      callCount: 0,
      hitCount: 0,
      uniqueCandidateCount: 0,
    },
    candidatePage: createMutableCandidateNumericalPageV1(),
    dependentSvColumn: new Float64Array(INDEPENDENT_NODE_NAMES.length),
    localJacobian: new Float64Array(
      INDEPENDENT_NODE_NAMES.length * INDEPENDENT_NODE_NAMES.length,
    ),
    inUse: false,
  };
  NON_CORONARY_PREPARED_CANDIDATE_STORAGE_V1.set(
    handle,
    storage as NonCoronaryPreparedCandidateStorageV1<unknown, unknown>,
  );
  return handle;
}

/**
 * Evaluates one physical candidate inside a prepared synchronous borrow. The
 * callback may copy values into its own fixed destinations but must not retain
 * the borrowed arrays or candidate object.
 */
export function withPreparedNonCoronaryCandidateV1<
  TEvaluation,
  TCompanionTrial,
  TResult,
>(
  evaluator:
    NonCoronaryPreparedCandidateEvaluatorV1<TEvaluation, TCompanionTrial>,
  candidateIndependentNodeVolumesMl: Float64Array,
  consume: (
    candidate: NonCoronaryPreparedCandidateBorrowV1<TEvaluation>,
    localIndependentResidualDDependentSvVolumeMlPerMl: Float64Array,
    localIndependentResidualDIndependentVolumeMlPerMl: Float64Array | null,
  ) => TResult,
): TResult {
  const storage = NON_CORONARY_PREPARED_CANDIDATE_STORAGE_V1.get(
    evaluator,
  ) as NonCoronaryPreparedCandidateStorageV1<
    TEvaluation,
    TCompanionTrial
  > | undefined;
  if (
    storage === undefined
    || evaluator.schemaId
      !== NON_CORONARY_PREPARED_CANDIDATE_EVALUATOR_V1_ID
    || evaluator.independentNodeCount !== INDEPENDENT_NODE_NAMES.length
  ) {
    throw new TypeError("non-coronary prepared candidate evaluator is foreign");
  }
  if (storage.inUse) {
    throw new Error("non-coronary prepared candidate evaluator is already in use");
  }
  if (
    !(candidateIndependentNodeVolumesMl instanceof Float64Array)
    || candidateIndependentNodeVolumesMl.length
      !== INDEPENDENT_NODE_NAMES.length
  ) {
    throw new RangeError(
      `candidate independent volumes must contain ${INDEPENDENT_NODE_NAMES.length} f64 values`,
    );
  }
  if (typeof consume !== "function") {
    throw new TypeError("prepared candidate consumer must be a function");
  }
  for (let index = 0; index < storage.scaledUnknowns.length; index += 1) {
    storage.scaledUnknowns[index] = requirePositive(
      candidateIndependentNodeVolumesMl[index]!,
      `${INDEPENDENT_NODE_NAMES[index]} candidate volume`,
    ) / storage.volumeScales[index]!;
  }
  storage.inUse = true;
  try {
    const candidate = evaluateCandidate(
      storage.graph,
      storage.input,
      storage.previous,
      storage.scaledUnknowns,
      storage.volumeScales,
      storage.candidateTimeSec,
      storage.respiratoryExternalPressures,
      storage.vascularPvLaws,
      storage.mechanicsCache,
      storage.candidatePage,
    );
    deviceOffLocalIndependentResidualDDependentSvVolumeV1(
      storage.graph,
      storage.input,
      candidate,
      storage.respiratoryExternalPressures,
      storage.dependentSvColumn,
    );
    const localJacobian = candidate.absoluteChamberPressureTangent === null
      ? null
      : deviceOffLocalIndependentResidualDIndependentVolumesV1(
        storage.graph,
        storage.input,
        candidate,
        storage.respiratoryExternalPressures,
        storage.localJacobian,
      );
    return consume(
      Object.freeze({
        candidateTimeSec: storage.candidateTimeSec,
        nodeVolumesMl: candidate.nodeVolumesMl,
        nodeAbsolutePressuresMmHg: candidate.nodeAbsolutePressuresMmHg,
        vascularPressureTangentMmHgPerMl:
          candidate.vascularPressureTangentMmHgPerMl,
        edgeFlowsMlPerSec: candidate.edgeFlowsMlPerSec,
        dynamicEdgeFlowsMlPerSec: candidate.dynamicEdgeFlowsMlPerSec,
        valveStates: candidate.valveStates,
        valveEvaluations: candidate.valveEvaluations,
        mechanicalSupport: candidate.mechanicalSupport,
        dynamicMechanicalSupport: candidate.dynamicMechanicalSupport,
        continuityResidualMlByNode:
          candidate.continuityResidualMlByNode,
        mixedContinuityResidualInfinityNorm: mixedContinuityResidualAudit(
          candidate,
          storage.previous.nodeVolumesMl,
          storage.options.absoluteContinuityResidualToleranceMl,
          storage.options.scaledResidualInfinityTolerance,
        ).infinityNorm,
        absoluteChamberPressureTangent:
          candidate.absoluteChamberPressureTangent,
        candidateMechanicsEvaluation:
          candidate.candidateMechanicsEvaluation,
      }),
      storage.dependentSvColumn,
      localJacobian,
    );
  } finally {
    storage.inUse = false;
  }
}

/**
 * Evaluates exactly one physical 14-volume candidate without running the
 * outer Newton loop. It supplies the active statically-condensed 30-row
 * coupled residual and its cold comparison against the nested transaction.
 */
export function evaluateNonCoronaryCirculationCandidateProbeV1<
  TEvaluation,
  TCompanionTrial = never,
>(
  input: NonCoronaryCirculationTrialInputV1<TEvaluation, TCompanionTrial>,
  candidateIndependentNodeVolumesMl: Float64Array,
  previousAcceptedNumericalSource?: NonCoronaryAcceptedNumericalSourceV1,
): NonCoronaryCirculationCandidateProbeV1<TEvaluation, TCompanionTrial> {
  validateAcceptedState(input.previousAcceptedState);
  requirePositive(input.dtSec, "dtSec");
  validateRuntime(input.runtime);
  validateProtocolResistanceScaleByEdge(
    input.protocolResistanceScaleByEdge,
  );
  validateConservativeCompanionAdapter(input);
  validateMechanicalSupportInput(input.mechanicalSupport);
  validateDynamicMechanicalSupportInput(input.dynamicMechanicalSupport);
  if (input.mechanicalSupport !== undefined
      && input.dynamicMechanicalSupport !== undefined) {
    throw new Error(
      "mechanicalSupport and dynamicMechanicalSupport are mutually exclusive",
    );
  }
  if (typeof input.evaluateCandidateMechanics !== "function") {
    throw new Error("evaluateCandidateMechanics must be a function");
  }
  const options = resolveNewtonOptions(input.options);
  if (!(candidateIndependentNodeVolumesMl instanceof Float64Array)
      || candidateIndependentNodeVolumesMl.length
        !== INDEPENDENT_NODE_NAMES.length) {
    throw new RangeError(
      `candidate independent volumes must contain ${INDEPENDENT_NODE_NAMES.length} f64 values`,
    );
  }

  const graph = buildNonCoronaryCirculationGraphV1();
  const previous = stagePreviousAcceptedNumericalStateV1(
    input.previousAcceptedState,
    null,
    previousAcceptedNumericalSource,
  );
  const candidateTimeSec = previous.acceptedTimeSec + input.dtSec;
  const respiratoryExternalPressures = respiratoryExternalPressuresV1(
    candidateTimeSec,
    input.runtime.respiratory,
  );
  const vascularPvLaws = snapshotNonCoronaryVascularPvLawsV1(
    graph,
    input.runtime.vascular,
  );
  const volumeScales = independentVolumeScales(previous.nodeVolumesMl);
  const scaledUnknowns = Array<number>(INDEPENDENT_NODE_NAMES.length);
  for (let index = 0; index < scaledUnknowns.length; index += 1) {
    const volume = requirePositive(
      candidateIndependentNodeVolumesMl[index]!,
      `${INDEPENDENT_NODE_NAMES[index]} candidate volume`,
    );
    scaledUnknowns[index] = volume / volumeScales[index]!;
  }
  const mechanicsCache: CandidateMechanicsCache<TEvaluation> = {
    values: [],
    jacobianUsage: {
      analyticAssemblyCount: 0,
      finiteDifferenceFallbackCount: 0,
      finiteDifferenceShadowCount: 0,
      maximumAbsoluteShadowDifference: null,
      maximumRelativeFrobeniusShadowDifference: null,
    },
    callCount: 0,
    hitCount: 0,
    uniqueCandidateCount: 0,
  };
  const candidate = evaluateCandidate(
    graph,
    input,
    previous,
    scaledUnknowns,
    volumeScales,
    candidateTimeSec,
    respiratoryExternalPressures,
    vascularPvLaws,
    mechanicsCache,
  );
  const localIndependentResidualDDependentSvVolumeMlPerMl =
    input.mechanicalSupport === undefined
      && input.dynamicMechanicalSupport === undefined
      && input.protocolResistanceScaleByEdge === undefined
      ? deviceOffLocalIndependentResidualDDependentSvVolumeV1(
        graph,
        input,
        candidate,
        respiratoryExternalPressures,
      )
      : null;
  const localIndependentResidualDIndependentVolumeMlPerMl =
    input.mechanicalSupport === undefined
      && input.dynamicMechanicalSupport === undefined
      && input.protocolResistanceScaleByEdge === undefined
      && candidate.absoluteChamberPressureTangent !== null
      ? deviceOffLocalIndependentResidualDIndependentVolumesV1(
        graph,
        input,
        candidate,
        respiratoryExternalPressures,
      )
      : null;
  const localIndependentResidualDAbsoluteChamberPressureMlPerMmHg =
    input.mechanicalSupport === undefined
      && input.dynamicMechanicalSupport === undefined
      && input.protocolResistanceScaleByEdge === undefined
      ? deviceOffLocalIndependentResidualDAbsoluteChamberPressuresV1(
        graph,
        input,
        candidate,
        respiratoryExternalPressures,
      )
      : null;
  return Object.freeze({
    candidateTimeSec,
    candidateNodeVolumesMl: candidate.nodeVolumesMl.slice(),
    nodeAbsolutePressuresMmHg:
      candidate.nodeAbsolutePressuresMmHg.slice(),
    vascularPressureTangentMmHgPerMl:
      candidate.vascularPressureTangentMmHgPerMl.slice(),
    edgeFlowsMlPerSec: candidate.edgeFlowsMlPerSec.slice(),
    continuityResidualMlByNode:
      candidate.continuityResidualMlByNode.slice(),
    scaledIndependentResidual:
      candidate.scaledIndependentResidual.slice(),
    mixedContinuityResidualInfinityNorm: mixedContinuityResidualAudit(
      candidate,
      previous.nodeVolumesMl,
      options.absoluteContinuityResidualToleranceMl,
      options.scaledResidualInfinityTolerance,
    ).infinityNorm,
    localIndependentResidualDDependentSvVolumeMlPerMl,
    localIndependentResidualDIndependentVolumeMlPerMl,
    localIndependentResidualDAbsoluteChamberPressureMlPerMmHg,
    absoluteChamberPressureTangent:
      candidate.absoluteChamberPressureTangent,
    candidateMechanicsEvaluation: candidate.candidateMechanicsEvaluation,
    candidateCompanionTrial:
      candidate.conservativeCompanion?.candidateCompanionTrial ?? null,
  });
}

/**
 * Re-evaluates an externally solved physical candidate and detaches the exact
 * public trial readback without running the legacy outer Newton loop. The
 * candidate must satisfy the same mixed continuity gate as a legacy success;
 * caller-owned vectors and internal candidate scratch never escape.
 */
export function materializeNonCoronaryCirculationCandidateTrialV1<
  TEvaluation,
  TCompanionTrial = never,
>(
  input: NonCoronaryCirculationTrialInputV1<TEvaluation, TCompanionTrial>,
  candidateIndependentNodeVolumesMl: Float64Array,
  externalDiagnostics: NonCoronaryExternallySolvedCandidateDiagnosticsV1,
  previousAcceptedNumericalSource?: NonCoronaryAcceptedNumericalSourceV1,
): NonCoronaryCirculationTrialSuccessV1<TEvaluation, TCompanionTrial> {
  validateAcceptedState(input.previousAcceptedState);
  requirePositive(input.dtSec, "dtSec");
  validateRuntime(input.runtime);
  validateProtocolResistanceScaleByEdge(
    input.protocolResistanceScaleByEdge,
  );
  validateConservativeCompanionAdapter(input);
  validateMechanicalSupportInput(input.mechanicalSupport);
  validateDynamicMechanicalSupportInput(input.dynamicMechanicalSupport);
  if (
    input.mechanicalSupport !== undefined
    || input.dynamicMechanicalSupport !== undefined
    || input.protocolResistanceScaleByEdge !== undefined
  ) {
    throw new Error(
      "external candidate materialization supports the device-off slice only",
    );
  }
  if (typeof input.evaluateCandidateMechanics !== "function") {
    throw new Error("evaluateCandidateMechanics must be a function");
  }
  if (
    !(candidateIndependentNodeVolumesMl instanceof Float64Array)
    || candidateIndependentNodeVolumesMl.length
      !== INDEPENDENT_NODE_NAMES.length
  ) {
    throw new RangeError(
      `candidate independent volumes must contain ${INDEPENDENT_NODE_NAMES.length} f64 values`,
    );
  }
  requireInteger(externalDiagnostics.iterations, "iterations");
  requireInteger(
    externalDiagnostics.lineSearchBacktracks,
    "lineSearchBacktracks",
  );
  if (
    externalDiagnostics.iterations < 0
    || externalDiagnostics.lineSearchBacktracks < 0
  ) {
    throw new RangeError("external solver diagnostics must be nonnegative");
  }

  const graph = buildNonCoronaryCirculationGraphV1();
  const options = resolveNewtonOptions(input.options);
  const previous = stagePreviousAcceptedNumericalStateV1(
    input.previousAcceptedState,
    null,
    previousAcceptedNumericalSource,
  );
  const candidateTimeSec = previous.acceptedTimeSec + input.dtSec;
  const respiratoryExternalPressures = respiratoryExternalPressuresV1(
    candidateTimeSec,
    input.runtime.respiratory,
  );
  const vascularPvLaws = snapshotNonCoronaryVascularPvLawsV1(
    graph,
    input.runtime.vascular,
  );
  const volumeScales = independentVolumeScales(previous.nodeVolumesMl);
  const scaledUnknowns = Array<number>(INDEPENDENT_NODE_NAMES.length);
  for (let index = 0; index < scaledUnknowns.length; index += 1) {
    scaledUnknowns[index] = requirePositive(
      candidateIndependentNodeVolumesMl[index]!,
      `${INDEPENDENT_NODE_NAMES[index]} candidate volume`,
    ) / volumeScales[index]!;
  }
  const mechanicsCache: CandidateMechanicsCache<TEvaluation> = {
    values: [],
    jacobianUsage: {
      analyticAssemblyCount: 0,
      finiteDifferenceFallbackCount: 0,
      finiteDifferenceShadowCount: 0,
      maximumAbsoluteShadowDifference: null,
      maximumRelativeFrobeniusShadowDifference: null,
    },
    callCount: 0,
    hitCount: 0,
    uniqueCandidateCount: 0,
  };
  const candidate = evaluateCandidate(
    graph,
    input,
    previous,
    scaledUnknowns,
    volumeScales,
    candidateTimeSec,
    respiratoryExternalPressures,
    vascularPvLaws,
    mechanicsCache,
  );
  const residualNorm = infinityNorm(candidate.scaledIndependentResidual);
  const mixedResidual = mixedContinuityResidualAudit(
    candidate,
    previous.nodeVolumesMl,
    options.absoluteContinuityResidualToleranceMl,
    options.scaledResidualInfinityTolerance,
  );
  if (mixedResidual.infinityNorm > 1) {
    throw new Error(
      "external non-coronary candidate does not satisfy continuity tolerance",
    );
  }
  const diagnostics = trialDiagnostics(
    externalDiagnostics.iterations,
    externalDiagnostics.iterations,
    externalDiagnostics.lineSearchBacktracks,
    residualNorm,
    candidate,
    previous,
    options,
    mechanicsCache,
  );
  return success(
    input.previousAcceptedState,
    input.dtSec,
    candidateTimeSec,
    candidate,
    diagnostics,
  );
}

function evaluateNonCoronaryCirculationBackwardEulerTrialInternalV1<
  TEvaluation,
  TCompanionTrial,
>(
  input: NonCoronaryCirculationTrialInputV1<TEvaluation, TCompanionTrial>,
  graph: NonCoronaryCirculationGraphV1,
  options: Required<NonCoronaryCirculationNewtonOptionsV1>,
  scratchStorage: NonCoronaryBackwardEulerScratchStorageV1 | null,
  previousAcceptedNumericalSource:
    NonCoronaryAcceptedNumericalSourceV1 | undefined,
): NonCoronaryCirculationTrialResultV1<TEvaluation, TCompanionTrial> {
  const previous = input.previousAcceptedState;
  const previousNumerical = stagePreviousAcceptedNumericalStateV1(
    previous,
    scratchStorage,
    previousAcceptedNumericalSource,
  );
  const candidateTimeSec = previousNumerical.acceptedTimeSec + input.dtSec;
  const respiratoryExternalPressures = respiratoryExternalPressuresV1(
    candidateTimeSec,
    input.runtime.respiratory,
  );
  const vascularPvLaws = snapshotNonCoronaryVascularPvLawsV1(
    graph,
    input.runtime.vascular,
  );
  const mechanicsCache: CandidateMechanicsCache<TEvaluation> = {
    values: [],
    jacobianUsage: {
      analyticAssemblyCount: 0,
      finiteDifferenceFallbackCount: 0,
      finiteDifferenceShadowCount: 0,
      maximumAbsoluteShadowDifference: null,
      maximumRelativeFrobeniusShadowDifference: null,
    },
    callCount: 0,
    hitCount: 0,
    uniqueCandidateCount: 0,
  };
  const volumeScales = independentVolumeScales(
    previousNumerical.nodeVolumesMl,
    scratchStorage?.volumeScales,
  );
  let scaledUnknowns = independentVolumesToScaled(
    previousNumerical.nodeVolumesMl,
    volumeScales,
    scratchStorage?.scaledUnknowns,
  );
  let current: CandidateEvaluation<TEvaluation, TCompanionTrial>;
  let currentCandidatePageIndex: 0 | 1 | null = scratchStorage === null
    ? null
    : 0;
  let acceptedLineSearchSteps = 0;
  let lineSearchBacktracks = 0;
  const failureTrace: MutableNewtonFailureTraceEntryV1[] = [];
  try {
    current = evaluateCandidate(
      graph,
      input,
      previousNumerical,
      scaledUnknowns,
      volumeScales,
      candidateTimeSec,
      respiratoryExternalPressures,
      vascularPvLaws,
      mechanicsCache,
      currentCandidatePageIndex === null
        ? undefined
        : scratchStorage!.candidatePages[currentCandidatePageIndex],
    );
  } catch (error) {
    return failure(
      previous,
      "initial-evaluation-failed",
      errorMessage(error),
      previous.nodeVolumesMl,
      emptyDiagnostics(options, mechanicsCache),
    );
  }

  for (let iteration = 0; iteration <= options.maxIterations; iteration += 1) {
    const residualNorm = infinityNorm(current.scaledIndependentResidual);
    const mixedContinuityResidual = mixedContinuityResidualAudit(
      current,
      previousNumerical.nodeVolumesMl,
      options.absoluteContinuityResidualToleranceMl,
      options.scaledResidualInfinityTolerance,
    );
    const continuityResidualConverged =
      mixedContinuityResidual.infinityNorm <= 1;
    const traceEntry: MutableNewtonFailureTraceEntryV1 = {
      iteration,
      currentScaledResidualInfinityNorm: residualNorm,
      updateScaledInfinityNorm: null,
      lineSearchAttemptCount: 0,
      candidateEvaluationExceptionCount: 0,
      armijoResidualRejectionCount: 0,
      acceptedStepLength: null,
      acceptedTrialScaledResidualInfinityNorm: null,
    };
    pushBoundedFailureTrace(failureTrace, traceEntry);
    if (continuityResidualConverged) {
      return success(
        previous,
        input.dtSec,
        candidateTimeSec,
        current,
        trialDiagnostics(
          iteration,
          acceptedLineSearchSteps,
          lineSearchBacktracks,
          residualNorm,
          current,
          previousNumerical,
          options,
          mechanicsCache,
        ),
      );
    }
    if (iteration === options.maxIterations) {
      return failure(
        previous,
        "maximum-iterations",
        "non-coronary circulation Newton reached its iteration limit",
        current.nodeVolumesMl,
        trialDiagnostics(
          iteration,
          acceptedLineSearchSteps,
          lineSearchBacktracks,
          residualNorm,
          current,
          previousNumerical,
          options,
          mechanicsCache,
          freezeFailureTrace(failureTrace),
        ),
      );
    }
    let jacobian: number[][];
    try {
      if (
        current.absoluteChamberPressureTangent !== null
        && conservativeCompanionSensitivitiesAvailable(current)
      ) {
        jacobian = analyticCirculationJacobian(
          graph,
          input,
          current,
          volumeScales,
          respiratoryExternalPressures,
          scratchStorage?.analyticJacobian,
        );
        mechanicsCache.jacobianUsage.analyticAssemblyCount += 1;
        if (options.analyticJacobianFiniteDifferenceShadow) {
          const shadow = finiteDifferenceJacobian(
            (candidate) => Array.from(evaluateCandidate(
              graph,
              input,
              previousNumerical,
              candidate,
              volumeScales,
              candidateTimeSec,
              respiratoryExternalPressures,
              vascularPvLaws,
              mechanicsCache,
            ).scaledIndependentResidual),
            scaledUnknowns,
            options.finiteDifferenceScaledStep,
          );
          recordJacobianShadowDifference(
            mechanicsCache.jacobianUsage,
            jacobian,
            shadow,
          );
        }
      } else {
        mechanicsCache.jacobianUsage.finiteDifferenceFallbackCount += 1;
        jacobian = finiteDifferenceJacobian(
          (candidate) => Array.from(evaluateCandidate(
            graph,
            input,
            previousNumerical,
            candidate,
            volumeScales,
            candidateTimeSec,
            respiratoryExternalPressures,
            vascularPvLaws,
            mechanicsCache,
          ).scaledIndependentResidual),
          scaledUnknowns,
          options.finiteDifferenceScaledStep,
        );
      }
    } catch (error) {
      return failure(
        previous,
        "jacobian-failed",
        errorMessage(error),
        current.nodeVolumesMl,
        trialDiagnostics(
          iteration,
          acceptedLineSearchSteps,
          lineSearchBacktracks,
          residualNorm,
          current,
          previousNumerical,
          options,
          mechanicsCache,
          freezeFailureTrace(failureTrace),
        ),
      );
    }
    const linearRight = scratchStorage?.linearRight
      ?? Array<number>(current.scaledIndependentResidual.length);
    for (
      let index = 0;
      index < current.scaledIndependentResidual.length;
      index += 1
    ) {
      linearRight[index] = -current.scaledIndependentResidual[index]!;
    }
    const update = solveDenseLinearSystem(
      jacobian,
      linearRight,
      scratchStorage,
    );
    traceEntry.updateScaledInfinityNorm = update === null
      ? null
      : infinityNorm(update);
    if (update === null) {
      return failure(
        previous,
        "singular-jacobian",
        "non-coronary circulation scaled Jacobian is singular",
        current.nodeVolumesMl,
        trialDiagnostics(
          iteration,
          acceptedLineSearchSteps,
          lineSearchBacktracks,
          residualNorm,
          current,
          previousNumerical,
          options,
          mechanicsCache,
          freezeFailureTrace(failureTrace),
        ),
      );
    }
    if (
      infinityNorm(update) <= options.scaledUpdateInfinityTolerance
      && !continuityResidualConverged
    ) {
      return failure(
        previous,
        "singular-jacobian",
        "non-coronary circulation Newton stagnated above tolerance",
        current.nodeVolumesMl,
        trialDiagnostics(
          iteration,
          acceptedLineSearchSteps,
          lineSearchBacktracks,
          residualNorm,
          current,
          previousNumerical,
          options,
          mechanicsCache,
          freezeFailureTrace(failureTrace),
        ),
      );
    }
    let accepted: Readonly<{
      scaledUnknowns: readonly number[];
      evaluation: CandidateEvaluation<TEvaluation, TCompanionTrial>;
      candidatePageIndex: 0 | 1 | null;
    }> | null = null;
    const trialCandidatePageIndex: 0 | 1 | null =
      currentCandidatePageIndex === null
        ? null
        : currentCandidatePageIndex === 0 ? 1 : 0;
    let stepLength = 1;
    let lastCandidateEvaluationException:
      NonCoronaryLineSearchFailureDiagnosticsV1[
        "lastCandidateEvaluationException"
      ] = null;
    let lastArmijoResidualRejection:
      NonCoronaryLineSearchFailureDiagnosticsV1[
        "lastArmijoResidualRejection"
      ] = null;
    for (
      let backtrack = 0;
      backtrack <= options.maximumLineSearchBacktracks;
      backtrack += 1
    ) {
      traceEntry.lineSearchAttemptCount += 1;
      const candidateUnknowns = scratchStorage?.candidateUnknowns
        ?? Array<number>(scaledUnknowns.length);
      for (let index = 0; index < scaledUnknowns.length; index += 1) {
        candidateUnknowns[index] = scaledUnknowns[index]!
          + stepLength * update[index]!;
      }
      try {
        const evaluation = evaluateCandidate(
          graph,
          input,
          previousNumerical,
          candidateUnknowns,
          volumeScales,
          candidateTimeSec,
          respiratoryExternalPressures,
          vascularPvLaws,
          mechanicsCache,
          trialCandidatePageIndex === null
            ? undefined
            : scratchStorage!.candidatePages[trialCandidatePageIndex],
        );
        const trialResidualNorm = infinityNorm(
          evaluation.scaledIndependentResidual,
        );
        const requiredMaximumResidualNorm =
          (1 - 1e-4 * stepLength) * residualNorm;
        if (trialResidualNorm <= requiredMaximumResidualNorm) {
          accepted = Object.freeze({
            scaledUnknowns: scratchStorage === null
              ? Object.freeze(candidateUnknowns)
              : candidateUnknowns,
            evaluation,
            candidatePageIndex: trialCandidatePageIndex,
          });
          traceEntry.acceptedStepLength = stepLength;
          traceEntry.acceptedTrialScaledResidualInfinityNorm =
            trialResidualNorm;
          break;
        }
        traceEntry.armijoResidualRejectionCount += 1;
        lastArmijoResidualRejection = Object.freeze({
          backtrackIndex: backtrack,
          stepLength,
          trialScaledResidualInfinityNorm: trialResidualNorm,
          requiredMaximumScaledResidualInfinityNorm:
            requiredMaximumResidualNorm,
        });
      } catch (error) {
        traceEntry.candidateEvaluationExceptionCount += 1;
        lastCandidateEvaluationException = Object.freeze({
          backtrackIndex: backtrack,
          stepLength,
          message: boundedDiagnosticMessage(errorMessage(error)),
        });
        // Inadmissible volume or callback state follows the same backtracking path.
      }
      stepLength *= 0.5;
      lineSearchBacktracks += 1;
    }
    if (accepted === null) {
      const lineSearchFailure: NonCoronaryLineSearchFailureDiagnosticsV1 =
        Object.freeze({
          iteration,
          attemptCount: traceEntry.lineSearchAttemptCount,
          candidateEvaluationExceptionCount:
            traceEntry.candidateEvaluationExceptionCount,
          armijoResidualRejectionCount:
            traceEntry.armijoResidualRejectionCount,
          dominantRejectionOwner:
            classifyNonCoronaryLineSearchRejectionOwnerV1(
              traceEntry.candidateEvaluationExceptionCount,
              traceEntry.armijoResidualRejectionCount,
            ),
          lastCandidateEvaluationException,
          lastArmijoResidualRejection,
        });
      return failure(
        previous,
        "line-search-failed",
        "non-coronary circulation Newton found no admissible residual-decreasing step",
        current.nodeVolumesMl,
        trialDiagnostics(
          iteration,
          acceptedLineSearchSteps,
          lineSearchBacktracks,
          residualNorm,
          current,
          previousNumerical,
          options,
          mechanicsCache,
          freezeFailureTrace(failureTrace),
          lineSearchFailure,
        ),
      );
    }
    if (scratchStorage === null) {
      scaledUnknowns = accepted.scaledUnknowns;
    } else {
      for (let index = 0; index < scaledUnknowns.length; index += 1) {
        scratchStorage.scaledUnknowns[index] = accepted.scaledUnknowns[index]!;
      }
      scaledUnknowns = scratchStorage.scaledUnknowns;
    }
    current = accepted.evaluation;
    currentCandidatePageIndex = accepted.candidatePageIndex;
    acceptedLineSearchSteps += 1;
  }
  throw new Error("unreachable circulation Newton state");
}

/** Pure promotion of circulation state. Mechanics promotion remains external. */
export function commitNonCoronaryCirculationTrialV1<
  TEvaluation,
  TCompanionTrial = never,
>(
  previous: NonCoronaryCirculationAcceptedStateV1,
  trial: NonCoronaryCirculationTrialSuccessV1<TEvaluation, TCompanionTrial>,
): NonCoronaryCirculationAcceptedStateV1 {
  validateAcceptedState(previous);
  if (trial.conservativeCompanion !== undefined) {
    throw new Error(
      "companion trial requires the companion-aware circulation commit",
    );
  }
  if (
    trial.transactionId !== NON_CORONARY_CIRCULATION_BE_V1_ID
    || trial.baseRevision !== previous.revision
    || !nearlyEqual(trial.baseAcceptedTimeSec, previous.acceptedTimeSec)
    || !nearlyEqual(trial.candidateTimeSec, previous.acceptedTimeSec + trial.dtSec)
  ) throw new Error("stale or foreign non-coronary circulation trial");
  const total = sumNodeRecord(trial.candidateNodeVolumesMl);
  if (!nearlyEqual(total, previous.totalBloodVolumeMl)) {
    throw new Error("candidate trial violates the accepted TBV constraint");
  }
  return acceptedState({
    revision: previous.revision + 1,
    acceptedTimeSec: trial.candidateTimeSec,
    totalBloodVolumeMl: previous.totalBloodVolumeMl,
    nodeVolumesMl: trial.candidateNodeVolumesMl,
    dynamicEdgeFlowsMlPerSec: trial.candidateDynamicEdgeFlowsMlPerSec,
    valveStates: trial.candidateValveStates,
  });
}

export type NonCoronaryCirculationCompanionCommitV1<TCompanionTrial> =
  Readonly<{
    /**
     * A valid V1 state used as the next non-coronary partition. Its TBV field
     * owns only this partition; the coupled transaction owns the global TBV.
     */
    acceptedNonCoronaryPartitionState:
      NonCoronaryCirculationAcceptedStateV1;
    candidateCompanionTrial: TCompanionTrial;
    fixedGlobalTotalBloodVolumeMl: number;
  }>;

/**
 * Companion-aware promotion of the non-coronary partition only.
 *
 * This deliberately does not call or weaken `commitNonCoronaryCirculationTrialV1`:
 * the historical path requires a fixed non-coronary TBV, whereas a conservative
 * companion exchanges blood volume with this partition. The outer transaction
 * remains responsible for atomically promoting the returned companion trial and
 * mechanics trial together with this partition state.
 */
export function commitNonCoronaryCirculationTrialWithConservativeCompanionV1<
  TEvaluation,
  TCompanionTrial,
>(
  previousNonCoronaryPartition: NonCoronaryCirculationAcceptedStateV1,
  trial: NonCoronaryCirculationTrialSuccessV1<
    TEvaluation,
    TCompanionTrial
  >,
): NonCoronaryCirculationCompanionCommitV1<TCompanionTrial> {
  validateAcceptedState(previousNonCoronaryPartition);
  const companion = trial.conservativeCompanion;
  if (companion === undefined) {
    throw new Error("companion-aware commit requires a companion trial");
  }
  if (
    trial.transactionId !== NON_CORONARY_CIRCULATION_BE_V1_ID
    || trial.baseRevision !== previousNonCoronaryPartition.revision
    || !nearlyEqual(
      trial.baseAcceptedTimeSec,
      previousNonCoronaryPartition.acceptedTimeSec,
    )
    || !nearlyEqual(
      trial.candidateTimeSec,
      previousNonCoronaryPartition.acceptedTimeSec + trial.dtSec,
    )
  ) throw new Error("stale or foreign companion circulation trial");
  if (!nearlyEqual(
    previousNonCoronaryPartition.totalBloodVolumeMl
      + companion.previousAcceptedCompanionBloodVolumeMl,
    companion.fixedGlobalTotalBloodVolumeMl,
  )) {
    throw new Error("previous companion/global TBV ledger is stale");
  }
  const candidateNonCoronaryBloodVolumeMl =
    sumNodeRecord(trial.candidateNodeVolumesMl);
  if (!nearlyEqual(
    candidateNonCoronaryBloodVolumeMl
      + companion.candidateCompanionBloodVolumeMl,
    companion.fixedGlobalTotalBloodVolumeMl,
  )) {
    throw new Error("candidate companion/global TBV ledger is stale");
  }
  const acceptedNonCoronaryPartitionState = acceptedState({
    revision: previousNonCoronaryPartition.revision + 1,
    acceptedTimeSec: trial.candidateTimeSec,
    totalBloodVolumeMl: candidateNonCoronaryBloodVolumeMl,
    nodeVolumesMl: trial.candidateNodeVolumesMl,
    dynamicEdgeFlowsMlPerSec: trial.candidateDynamicEdgeFlowsMlPerSec,
    valveStates: trial.candidateValveStates,
  });
  return Object.freeze({
    acceptedNonCoronaryPartitionState,
    candidateCompanionTrial: companion.candidateCompanionTrial,
    fixedGlobalTotalBloodVolumeMl: companion.fixedGlobalTotalBloodVolumeMl,
  });
}

/** JSON-safe accepted-state checkpoint; contains no callback or solver cache. */
export function checkpointNonCoronaryCirculationStateV1(
  state: NonCoronaryCirculationAcceptedStateV1,
): NonCoronaryCirculationCheckpointV1 {
  validateAcceptedState(state);
  const cloned = cloneAcceptedState(state);
  return Object.freeze({
    checkpointId: NON_CORONARY_CIRCULATION_CHECKPOINT_V1_ID,
    schemaVersion: 1 as const,
    state: cloned,
    stateFingerprint: fingerprintCirculationStateV1(cloned),
  });
}

/**
 * Restores a checkpoint and optionally rebases revision/time at the same
 * cardiac phase. Rephasing is deliberately owned by the caller.
 */
export function restoreNonCoronaryCirculationStateV1(
  checkpoint: NonCoronaryCirculationCheckpointV1,
  rebase?: Readonly<{ revision: number; acceptedTimeSec: number }>,
): NonCoronaryCirculationAcceptedStateV1 {
  if (
    checkpoint.checkpointId !== NON_CORONARY_CIRCULATION_CHECKPOINT_V1_ID
    || checkpoint.schemaVersion !== 1
  ) throw new Error("unsupported non-coronary circulation checkpoint");
  validateAcceptedState(checkpoint.state);
  if (
    fingerprintCirculationStateV1(checkpoint.state)
      !== checkpoint.stateFingerprint
  ) throw new Error("non-coronary circulation checkpoint fingerprint mismatch");
  return acceptedState({
    revision: rebase?.revision ?? checkpoint.state.revision,
    acceptedTimeSec: rebase?.acceptedTimeSec ?? checkpoint.state.acceptedTimeSec,
    totalBloodVolumeMl: checkpoint.state.totalBloodVolumeMl,
    nodeVolumesMl: checkpoint.state.nodeVolumesMl,
    dynamicEdgeFlowsMlPerSec: checkpoint.state.dynamicEdgeFlowsMlPerSec,
    valveStates: checkpoint.state.valveStates,
  });
}

function evaluateCandidate<TEvaluation, TCompanionTrial = never>(
  graph: NonCoronaryCirculationGraphV1,
  input: NonCoronaryCirculationTrialInputV1<TEvaluation, TCompanionTrial>,
  previous: PreviousAcceptedNumericalStateV1,
  scaledIndependentVolumes: readonly number[],
  volumeScales: readonly number[],
  candidateTimeSec: number,
  respiratoryExternalPressures: RespiratoryExternalPressuresV1,
  vascularPvLaws: NonCoronaryVascularPvLawsV1,
  mechanicsCache: CandidateMechanicsCache<TEvaluation>,
  numericalPage?: MutableCandidateNumericalPageV1,
): CandidateEvaluation<TEvaluation, TCompanionTrial> {
  const candidatePage = numericalPage
    ?? createMutableCandidateNumericalPageV1();
  // Preserve the immutable no-companion candidate reconstruction and failure
  // ordering exactly; the independent-only prepass exists solely for the
  // companion branch, where SV depends on the companion candidate volume.
  const legacyNodeVolumesMl = input.conservativeCompanion === undefined
    ? scaledToNodeVolumes(
      scaledIndependentVolumes,
      volumeScales,
      previous.totalBloodVolumeMl,
      candidatePage.nodeVolumesMl,
    )
    : null;
  const candidateIndependentNodeVolumesMl = legacyNodeVolumesMl === null
    ? scaledToIndependentNodeVolumes(
      scaledIndependentVolumes,
      volumeScales,
      candidatePage.independentNodeVolumesMl,
    )
    : independentNodeVolumesFromNodeArray(
      legacyNodeVolumesMl,
      candidatePage.independentNodeVolumesMl,
    );
  const chamberVolumesMl = Object.freeze({
    LV: candidateIndependentNodeVolumesMl.LV,
    LA: candidateIndependentNodeVolumesMl.LA,
    RV: candidateIndependentNodeVolumesMl.RV,
    RA: candidateIndependentNodeVolumesMl.RA,
  });
  const mechanics = evaluateCandidateMechanicsCached(
    mechanicsCache,
    input.evaluateCandidateMechanics,
    chamberVolumesMl,
    candidateTimeSec,
  );
  const aoPressureAndTangent =
    vascularTransmuralPressureAndVolumeTangentFromLawV1(
      requiredVascularPvLawV1(vascularPvLaws, "Ao"),
      candidateIndependentNodeVolumesMl.Ao,
      "adaptive-volume-tolerance",
    );
  const conservativeCompanion = input.conservativeCompanion === undefined
    ? null
    : evaluateConservativeCompanionSameCandidate(
      graph,
      input,
      scaledIndependentVolumes,
      volumeScales,
      candidateIndependentNodeVolumesMl,
      mechanics,
      candidateTimeSec,
      respiratoryExternalPressures,
      aoPressureAndTangent,
    );
  const nonCoronaryCandidateBloodVolumeMl = conservativeCompanion === null
    ? previous.totalBloodVolumeMl
    : conservativeCompanion.fixedGlobalTotalBloodVolumeMl
      - conservativeCompanion.candidateCompanionBloodVolumeMl;
  const nodeVolumesMl = legacyNodeVolumesMl ?? scaledToNodeVolumes(
    scaledIndependentVolumes,
    volumeScales,
    nonCoronaryCandidateBloodVolumeMl,
    candidatePage.nodeVolumesMl,
  );
  const supportTiming = input.mechanicalSupport === undefined
    ? null
    : mechanicalSupportTiming(
      candidateTimeSec,
      input.mechanicalSupport.heartRateBpm,
    );
  const dynamicSupportTiming = input.dynamicMechanicalSupport === undefined
    ? null
    : mechanicalSupportTiming(
      candidateTimeSec,
      input.dynamicMechanicalSupport.heartRateBpm,
    );
  const iabp = input.mechanicalSupport !== undefined && supportTiming !== null
    ? evaluateIabpV1(input.mechanicalSupport.config.iabp, supportTiming)
    : input.dynamicMechanicalSupport !== undefined
        && dynamicSupportTiming !== null
      ? evaluateIabpV1(
        input.dynamicMechanicalSupport.config.iabp,
        dynamicSupportTiming,
      )
      : null;
  const vascularPressureTangentValues =
    candidatePage.vascularPressureTangentMmHgPerMl;
  const nodeAbsolutePressureValues = candidatePage.nodeAbsolutePressuresMmHg;
  for (let nodeIndex = 0;
    nodeIndex < NON_CORONARY_NODE_NAMES_V1.length;
    nodeIndex += 1) {
    const name = NON_CORONARY_NODE_NAMES_V1[nodeIndex]!;
    if (isChamberName(name)) {
      vascularPressureTangentValues[nodeIndex] = 0;
      nodeAbsolutePressureValues[nodeIndex] =
        mechanics.absolutePressuresMmHg[name];
      continue;
    }
    const node = graph.nodes[graph.nodeIndex.get(name)!];
    const physicalVolumeMl = nodeVolumesMl[nodeIndex]!
      + (name === "SA" ? iabp?.balloonVolumeMl ?? 0 : 0);
    const pressureAndTangent = name === "Ao"
      ? aoPressureAndTangent
      : vascularTransmuralPressureAndVolumeTangentFromLawV1(
          requiredVascularPvLawV1(vascularPvLaws, name),
          physicalVolumeMl,
          "adaptive-volume-tolerance",
        );
    vascularPressureTangentValues[nodeIndex] =
      pressureAndTangent.dTransmuralPressureDPhysicalVolumeMmHgPerMl;
    const ext = respiratoryExternalPressureFromFrameV1(
      respiratoryKind(node.ext),
      respiratoryExternalPressures,
    );
    nodeAbsolutePressureValues[nodeIndex] = requireFinite(
      pressureAndTangent.transmuralPressureMmHg + ext,
      `${name} absolute pressure`,
    );
  }
  const nodeAbsolutePressuresMmHg = nodeAbsolutePressureValues;
  const vascularPressureTangentMmHgPerMl = vascularPressureTangentValues;
  const mechanicalSupport = input.mechanicalSupport === undefined
      || supportTiming === null
    ? null
    : evaluateMechanicalSupportHydraulicsV1(
      input.mechanicalSupport.config,
      {
        ...supportTiming,
        nodeAbsolutePressureMmHg: Object.freeze({
          LV: nodeAbsolutePressuresMmHg[
            NON_CORONARY_NODE_INDEX_BY_NAME_V1.LV
          ]!,
          Ao: nodeAbsolutePressuresMmHg[
            NON_CORONARY_NODE_INDEX_BY_NAME_V1.Ao
          ]!,
          SA: nodeAbsolutePressuresMmHg[
            NON_CORONARY_NODE_INDEX_BY_NAME_V1.SA
          ]!,
          RA: nodeAbsolutePressuresMmHg[
            NON_CORONARY_NODE_INDEX_BY_NAME_V1.RA
          ]!,
          VC: nodeAbsolutePressuresMmHg[
            NON_CORONARY_NODE_INDEX_BY_NAME_V1.VC
          ]!,
        }),
        nodeVolumeMl: Object.freeze({
          LV: nodeVolumesMl[NON_CORONARY_NODE_INDEX_BY_NAME_V1.LV]!,
          Ao: nodeVolumesMl[NON_CORONARY_NODE_INDEX_BY_NAME_V1.Ao]!,
          SA: nodeVolumesMl[NON_CORONARY_NODE_INDEX_BY_NAME_V1.SA]!,
          RA: nodeVolumesMl[NON_CORONARY_NODE_INDEX_BY_NAME_V1.RA]!,
          VC: nodeVolumesMl[NON_CORONARY_NODE_INDEX_BY_NAME_V1.VC]!,
        }),
      },
    );
  const dynamicMechanicalSupport =
    input.dynamicMechanicalSupport === undefined
      || dynamicSupportTiming === null
    ? null
    : evaluateDynamicMechanicalSupportHydraulicsV1(
      input.dynamicMechanicalSupport.config,
      input.dynamicMechanicalSupport.profile,
      input.dynamicMechanicalSupport.previousAcceptedState,
      {
        dtSec: input.dtSec,
        ...dynamicSupportTiming,
        nodeAbsolutePressureMmHg: Object.freeze({
          LV: nodeAbsolutePressuresMmHg[
            NON_CORONARY_NODE_INDEX_BY_NAME_V1.LV
          ]!,
          Ao: nodeAbsolutePressuresMmHg[
            NON_CORONARY_NODE_INDEX_BY_NAME_V1.Ao
          ]!,
          SA: nodeAbsolutePressuresMmHg[
            NON_CORONARY_NODE_INDEX_BY_NAME_V1.SA
          ]!,
          RA: nodeAbsolutePressuresMmHg[
            NON_CORONARY_NODE_INDEX_BY_NAME_V1.RA
          ]!,
          VC: nodeAbsolutePressuresMmHg[
            NON_CORONARY_NODE_INDEX_BY_NAME_V1.VC
          ]!,
        }),
        nodeVolumeMl: Object.freeze({
          LV: nodeVolumesMl[NON_CORONARY_NODE_INDEX_BY_NAME_V1.LV]!,
          Ao: nodeVolumesMl[NON_CORONARY_NODE_INDEX_BY_NAME_V1.Ao]!,
          SA: nodeVolumesMl[NON_CORONARY_NODE_INDEX_BY_NAME_V1.SA]!,
          RA: nodeVolumesMl[NON_CORONARY_NODE_INDEX_BY_NAME_V1.RA]!,
          VC: nodeVolumesMl[NON_CORONARY_NODE_INDEX_BY_NAME_V1.VC]!,
        }),
      },
    );
  const valveEvaluations = candidatePage.valveEvaluations;
  const valveStates = candidatePage.valveStates;
  const valveResearchInput = input.runtime.valveResearchInput;
  const flows = candidatePage.edgeFlowsMlPerSec;
  const dynamicFlows = candidatePage.dynamicEdgeFlowsMlPerSec;
  for (let edgeIndex = 0; edgeIndex < graph.edges.length; edgeIndex += 1) {
    const edge = graph.edges[edgeIndex]!;
    const name = edge.name as NonCoronaryEdgeNameV1;
    const upstreamPressure = nodeAbsolutePressuresMmHg[
      NON_CORONARY_NODE_INDEX_BY_NAME_V1[
        edge.up as NonCoronaryNodeNameV1
      ]
    ]!;
    const downstreamPressure = nodeAbsolutePressuresMmHg[
      NON_CORONARY_NODE_INDEX_BY_NAME_V1[
        edge.down as NonCoronaryNodeNameV1
      ]
    ]!;
    if (edge.kind === "valve") {
      const valveName = name as NonCoronaryValveNameV1;
      const valveIndex = NON_CORONARY_VALVE_INDEX_BY_NAME_V1[valveName];
      const previousOpening01 = previous.valveOpeningFractions01[
        NON_CORONARY_VALVE_INDEX_BY_NAME_V1[valveName]
      ]!;
      const selectedAorticOutflowProfile =
        input.runtime.vascular.selectedAorticOutflowProfile;
      const evaluation: NonCoronaryValveEvaluationV1 =
        valveName === "AoV" && selectedAorticOutflowProfile !== undefined
          ? stepMainWireAorticRecoveredRootPortValveScalarsV1(
              previousOpening01,
              input.dtSec,
              upstreamPressure,
              downstreamPressure,
              valveResearchInput.valves.AoV,
              selectedAorticOutflowProfile.aorticValveProfile,
            )
          : stepMainWireQuasiSteadyOrificeValveScalarsV2(
              previousOpening01,
              input.dtSec,
              upstreamPressure,
              downstreamPressure,
              valveResearchInput.valves[valveName],
            );
      if (!evaluation.valid || !evaluation.finite) {
        throw new Error(`${name} valve trial failed: ${evaluation.issues.join("; ")}`);
      }
      valveEvaluations[valveIndex] = evaluation;
      valveStates[valveIndex] = evaluation.state;
      flows[edgeIndex] = evaluation.flowMlPerSec;
      continue;
    }
    if (name === "PCap_PVen" && input.runtime.parallelPulmonaryPaths !== undefined) {
      flows[edgeIndex] = evaluateParallelPulmonaryPathsV1(
        input.runtime.parallelPulmonaryPaths, upstreamPressure, downstreamPressure,
      ).totalFlowMlPerSec;
      continue;
    }
    const edgeExternalPressureMmHg = respiratoryExternalPressureFromFrameV1(
      respiratoryKind(edge.ext),
      respiratoryExternalPressures,
    );
    const effectiveDownstreamPressure = downstreamEffectivePressureV1({
      edge,
      downstreamPressureMmHg: downstreamPressure,
      edgeExternalPressureMmHg,
    });
    const gradientMmHg = upstreamPressure - effectiveDownstreamPressure;
    const losses = applyProtocolResistanceScale(
      nonCoronaryNonValveEdgeLossV1(
        edge,
        name,
        input.runtime,
        upstreamPressure,
        downstreamPressure,
        edgeExternalPressureMmHg,
      ),
      protocolResistanceScaleForEdge(input, name),
    );
    if (edge.kind === "dynamic") {
      const dynamicName = name as NonCoronaryDynamicEdgeNameV1;
      const inertance = requireNonnegative(
        nonCoronaryDynamicEdgeInertanceV1(
          edge,
          dynamicName,
          input.runtime,
          losses.areaRatio,
        ),
        `${name} inertanceMmHgSec2PerMl`,
      );
      const flow = inertance === 0
        ? solveSignedLinearQuadraticFlowV1(
            gradientMmHg,
            losses.resistanceMmHgSecPerMl,
            losses.quadraticLossMmHgSec2PerMl2,
          )
        : solveSignedLinearQuadraticFlowV1(
            gradientMmHg + inertance
              * previous.dynamicEdgeFlowsMlPerSec[
                NON_CORONARY_DYNAMIC_EDGE_INDEX_BY_NAME_V1[dynamicName]
              ]! / input.dtSec,
            losses.resistanceMmHgSecPerMl + inertance / input.dtSec,
            losses.quadraticLossMmHgSec2PerMl2,
          );
      dynamicFlows[
        NON_CORONARY_DYNAMIC_EDGE_INDEX_BY_NAME_V1[dynamicName]
      ] = flow;
      flows[edgeIndex] = flow;
    } else {
      flows[edgeIndex] = solveSignedLinearQuadraticFlowV1(
        gradientMmHg,
        losses.resistanceMmHgSecPerMl,
        losses.quadraticLossMmHgSec2PerMl2,
      );
    }
  }
  const edgeFlowsMlPerSec = flows;
  // The rate vector is scratch that dies inside this evaluation. The incidence
  // operator overwrites every slot before the continuity residual consumes it.
  const localRates = incidenceVolumeRatesFromEdgeFlowsV1(
    graph,
    edgeFlowsMlPerSec,
    candidatePage.nodeVolumeRatesMlPerSec,
  );
  const continuityResidualValues = candidatePage.continuityResidualMlByNode;
  for (let nodeIndex = 0;
    nodeIndex < NON_CORONARY_NODE_NAMES_V1.length;
    nodeIndex += 1) {
    const name = NON_CORONARY_NODE_NAMES_V1[nodeIndex]!;
    const localIndex = graph.nodeIndex.get(name)!;
    const companionRate = conservativeCompanion === null
      ? 0
      : isConservativeCompanionBoundaryNode(name)
        ? conservativeCompanion.outerBoundaryNetVolumeRateMlPerSec[name]
        : 0;
    const supportRate = mechanicalSupportNodeRateMlPerSec(
      mechanicalSupport ?? dynamicMechanicalSupport,
      name,
    );
    continuityResidualValues[nodeIndex] = nodeVolumesMl[nodeIndex]!
      - previous.nodeVolumesMl[
      NON_CORONARY_NODE_INDEX_BY_NAME_V1[name]
    ]!
      - input.dtSec * (localRates[localIndex]! + companionRate + supportRate);
  }
  const continuityResidualMlByNode = continuityResidualValues;
  const scaledIndependentResidual = scaledResidualValuesV1(
    continuityResidualMlByNode,
    volumeScales,
    candidatePage.scaledIndependentResidual,
  );
  return Object.freeze({
    nodeVolumesMl,
    nodeAbsolutePressuresMmHg,
    vascularPressureTangentMmHgPerMl,
    edgeFlowsMlPerSec,
    dynamicEdgeFlowsMlPerSec: dynamicFlows,
    valveStates,
    valveEvaluations,
    candidateMechanicsEvaluation: mechanics.evaluation,
    mechanicalSupport,
    dynamicMechanicalSupport,
    absoluteChamberPressureTangent:
      mechanics.absolutePressureTangent ?? null,
    conservativeCompanion,
    continuityResidualMlByNode,
    scaledIndependentResidual,
  });
}

function evaluateConservativeCompanionSameCandidate<
  TEvaluation,
  TCompanionTrial,
>(
  graph: NonCoronaryCirculationGraphV1,
  input: NonCoronaryCirculationTrialInputV1<TEvaluation, TCompanionTrial>,
  scaledIndependentVolumes: readonly number[],
  volumeScales: readonly number[],
  candidateIndependentNodeVolumesMl:
    NonCoronaryIndependentNodeRecordV1<number>,
  mechanics: NonCoronaryCandidateMechanicsResultV1<TEvaluation>,
  candidateTimeSec: number,
  respiratoryExternalPressures: RespiratoryExternalPressuresV1,
  aoPressureAndTangent: VascularTransmuralPressureAndVolumeTangentV1,
): ConservativeCompanionCandidateEvaluationInternalV1<TCompanionTrial> {
  const adapter = input.conservativeCompanion;
  if (adapter === undefined) {
    throw new Error("conservative companion adapter is unavailable");
  }
  const aoNode = graph.nodes[graph.nodeIndex.get("Ao")!];
  const aoExternalPressureMmHg = respiratoryExternalPressureFromFrameV1(
    respiratoryKind(aoNode.ext),
    respiratoryExternalPressures,
  );
  const boundaryAbsolutePressuresMmHg = Object.freeze({
    Ao: requireFinite(
      aoPressureAndTangent.transmuralPressureMmHg + aoExternalPressureMmHg,
      "Ao companion boundary pressure",
    ),
    RA: requireFinite(
      mechanics.absolutePressuresMmHg.RA,
      "RA companion boundary pressure",
    ),
  });
  const boundaryPressureTangent = mechanics.absolutePressureTangent === undefined
    ? null
    : companionBoundaryPressureTangentByScaledIndependentVolume(
      aoPressureAndTangent.dTransmuralPressureDPhysicalVolumeMmHgPerMl,
      mechanics.absolutePressureTangent,
      volumeScales,
    );
  const evaluation = adapter.evaluateSameCandidate(Object.freeze({
    candidateTimeSec,
    dtSec: input.dtSec,
    fixedGlobalTotalBloodVolumeMl: adapter.fixedGlobalTotalBloodVolumeMl,
    independentNodeOrder: INDEPENDENT_NODE_NAMES,
    scaledIndependentVolumes: Object.freeze([...scaledIndependentVolumes]),
    independentVolumeScalesMl: Object.freeze([...volumeScales]),
    candidateIndependentNodeVolumesMl,
    boundaryAbsolutePressuresMmHg,
    dBoundaryAbsolutePressureDScaledIndependentVolume:
      boundaryPressureTangent,
    candidateMechanicsEvaluation: mechanics.evaluation,
  }));
  const validated = validateAndFreezeConservativeCompanionEvaluation(
    evaluation,
  );
  return Object.freeze({
    ...validated,
    fixedGlobalTotalBloodVolumeMl: adapter.fixedGlobalTotalBloodVolumeMl,
    previousAcceptedCompanionBloodVolumeMl:
      adapter.previousAcceptedCompanionBloodVolumeMl,
  });
}

function companionBoundaryPressureTangentByScaledIndependentVolume(
  dAoPressureDAoVolumeMmHgPerMl: number,
  chamberTangent: NonCoronaryAbsoluteChamberPressureTangentV1,
  volumeScales: readonly number[],
): NonCoronaryCompanionBoundaryRecordV1<readonly number[]> {
  requireFinite(
    dAoPressureDAoVolumeMmHgPerMl,
    "Ao companion boundary pressure tangent",
  );
  const ao = Array(INDEPENDENT_NODE_NAMES.length).fill(0) as number[];
  const aoColumn = INDEPENDENT_NODE_NAMES.indexOf("Ao");
  ao[aoColumn] = dAoPressureDAoVolumeMmHgPerMl * volumeScales[aoColumn]!;
  const ra = Array(INDEPENDENT_NODE_NAMES.length).fill(0) as number[];
  const raRow = NON_CORONARY_CHAMBER_TANGENT_ORDER_V1.indexOf("RA");
  for (
    let chamberColumn = 0;
    chamberColumn < NON_CORONARY_CHAMBER_TANGENT_ORDER_V1.length;
    chamberColumn += 1
  ) {
    const chamberName =
      NON_CORONARY_CHAMBER_TANGENT_ORDER_V1[chamberColumn]!;
    const independentColumn = INDEPENDENT_NODE_NAMES.indexOf(chamberName);
    ra[independentColumn] = requireFinite(
      chamberTangent.dPressureDVolumeMmHgPerMl[raRow]![chamberColumn]!
        * volumeScales[independentColumn]!,
      `RA companion boundary tangent by ${chamberName}`,
    );
  }
  return Object.freeze({
    Ao: Object.freeze(ao),
    RA: Object.freeze(ra),
  });
}

function validateAndFreezeConservativeCompanionEvaluation<TCompanionTrial>(
  evaluation:
    NonCoronaryConservativeCompanionCandidateEvaluationV1<TCompanionTrial>,
): NonCoronaryConservativeCompanionCandidateEvaluationV1<TCompanionTrial> {
  const candidateCompanionBloodVolumeMl = requireNonnegative(
    evaluation.candidateCompanionBloodVolumeMl,
    "candidate companion blood volume",
  );
  const outerBoundaryNetVolumeRateMlPerSec = Object.freeze({
    Ao: requireFinite(
      evaluation.outerBoundaryNetVolumeRateMlPerSec.Ao,
      "Ao companion net volume rate",
    ),
    RA: requireFinite(
      evaluation.outerBoundaryNetVolumeRateMlPerSec.RA,
      "RA companion net volume rate",
    ),
  });
  const sensitivities = evaluation.sensitivities === undefined
    ? undefined
    : Object.freeze({
      dCandidateCompanionBloodVolumeMlDScaledIndependentVolume:
        copyCompanionSensitivityVector(
          evaluation.sensitivities
            .dCandidateCompanionBloodVolumeMlDScaledIndependentVolume,
          "companion blood-volume sensitivity",
        ),
      dOuterBoundaryNetVolumeRateMlPerSecDScaledIndependentVolume:
        Object.freeze({
          Ao: copyCompanionSensitivityVector(
            evaluation.sensitivities
              .dOuterBoundaryNetVolumeRateMlPerSecDScaledIndependentVolume.Ao,
            "Ao companion source-rate sensitivity",
          ),
          RA: copyCompanionSensitivityVector(
            evaluation.sensitivities
              .dOuterBoundaryNetVolumeRateMlPerSecDScaledIndependentVolume.RA,
            "RA companion source-rate sensitivity",
          ),
        }),
    });
  return Object.freeze({
    candidateCompanionBloodVolumeMl,
    outerBoundaryNetVolumeRateMlPerSec,
    candidateCompanionTrial: evaluation.candidateCompanionTrial,
    ...(sensitivities === undefined ? {} : { sensitivities }),
  });
}

function copyCompanionSensitivityVector(
  values: readonly number[],
  label: string,
): readonly number[] {
  if (values.length !== INDEPENDENT_NODE_NAMES.length) {
    throw new Error(`${label} has incompatible dimension`);
  }
  return Object.freeze(values.map((value, index) =>
    requireFinite(value, `${label}[${INDEPENDENT_NODE_NAMES[index]}]`)));
}

function isConservativeCompanionBoundaryNode(
  name: NonCoronaryNodeNameV1,
): name is NonCoronaryConservativeCompanionBoundaryNodeV1 {
  return name === "Ao" || name === "RA";
}

function conservativeCompanionSensitivitiesAvailable<
  TEvaluation,
  TCompanionTrial,
>(
  evaluation: CandidateEvaluation<TEvaluation, TCompanionTrial>,
): boolean {
  return evaluation.conservativeCompanion === null
    || evaluation.conservativeCompanion.sensitivities !== undefined;
}

function accumulateAnalyticJacobianPressureColumn(
  jacobian: number[][],
  column: number,
  pressureCoefficient: number,
  pressureDerivative: number,
  firstResidualRow: number | undefined,
  firstResidualFactor: number,
  secondResidualRow: number | undefined,
  secondResidualFactor: number,
): void {
  const derivative = pressureCoefficient * pressureDerivative;
  if (firstResidualRow !== undefined) {
    jacobian[firstResidualRow]![column] += firstResidualFactor * derivative;
  }
  if (secondResidualRow !== undefined) {
    jacobian[secondResidualRow]![column] += secondResidualFactor * derivative;
  }
}

type EdgeFlowPressureDerivativesV1 = Readonly<{
  upstreamMlPerSecPerMmHg: number;
  downstreamMlPerSecPerMmHg: number;
}>;

/**
 * Same-candidate semismooth pressure derivatives for one native circulation
 * edge. Both the ordinary analytic Jacobian and the coupled dependent-SV
 * column use this single branch authority so they cannot silently disagree at
 * valve, collapse, pressure-dependent-loss, or inertance branches.
 */
function analyticEdgeFlowPressureDerivativesV1<
  TEvaluation,
  TCompanionTrial,
>(
  graph: NonCoronaryCirculationGraphV1,
  input: NonCoronaryCirculationTrialInputV1<TEvaluation, TCompanionTrial>,
  current: CandidateEvaluation<TEvaluation, TCompanionTrial>,
  respiratoryExternalPressures: RespiratoryExternalPressuresV1,
  edgeIndex: number,
): EdgeFlowPressureDerivativesV1 {
  const edge = graph.edges[edgeIndex]!;
  const edgeName = edge.name as NonCoronaryEdgeNameV1;
  const upstreamName = edge.up as NonCoronaryNodeNameV1;
  const downstreamName = edge.down as NonCoronaryNodeNameV1;
  const upstreamPressureMmHg =
    current.nodeAbsolutePressuresMmHg[
      NON_CORONARY_NODE_INDEX_BY_NAME_V1[upstreamName]
    ]!;
  const downstreamPressureMmHg =
    current.nodeAbsolutePressuresMmHg[
      NON_CORONARY_NODE_INDEX_BY_NAME_V1[downstreamName]
    ]!;
  let upstreamMlPerSecPerMmHg: number;
  let downstreamMlPerSecPerMmHg: number;

  if (edgeName === "PCap_PVen" && input.runtime.parallelPulmonaryPaths !== undefined) {
    return evaluateParallelPulmonaryPathsV1(input.runtime.parallelPulmonaryPaths,
      upstreamPressureMmHg, downstreamPressureMmHg);
  }

  if (edge.kind === "valve") {
    const evaluation = current.valveEvaluations[
      NON_CORONARY_VALVE_INDEX_BY_NAME_V1[
        edgeName as NonCoronaryValveNameV1
      ]
    ]!;
    const dFlowDGradient =
      evaluation.dFlowDPressureGradientMlPerSecPerMmHg;
    requireFinite(dFlowDGradient, `${edgeName} valve flow tangent`);
    upstreamMlPerSecPerMmHg = dFlowDGradient;
    downstreamMlPerSecPerMmHg = -dFlowDGradient;
  } else {
    const edgeExternalPressureMmHg = respiratoryExternalPressureFromFrameV1(
      respiratoryKind(edge.ext),
      respiratoryExternalPressures,
    );
    const downstream = downstreamEffectivePressureAndDerivativeV1({
      edge,
      downstreamPressureMmHg,
      edgeExternalPressureMmHg,
    });
    const losses = applyProtocolResistanceScaleWithDerivatives(
      nonCoronaryNonValveEdgeLossAndPressureDerivativesV1(
        edge,
        edgeName,
        input.runtime,
        upstreamPressureMmHg,
        downstreamPressureMmHg,
        edgeExternalPressureMmHg,
      ),
      protocolResistanceScaleForEdge(input, edgeName),
    );
    const flowMlPerSec = current.edgeFlowsMlPerSec[edgeIndex]!;
    const signedQuadraticFlow = flowMlPerSec * Math.abs(flowMlPerSec);
    let inertanceMmHgSec2PerMl = 0;
    let dInertanceDUpstreamPressureSec2PerMl = 0;
    let dInertanceDDownstreamPressureSec2PerMl = 0;
    let previousFlowMlPerSec = flowMlPerSec;
    if (edge.kind === "dynamic") {
      inertanceMmHgSec2PerMl = requireNonnegative(
        nonCoronaryDynamicEdgeInertanceV1(
          edge,
          edgeName as NonCoronaryDynamicEdgeNameV1,
          input.runtime,
          losses.areaRatio,
        ),
        `${edgeName} inertance tangent base`,
      );
      if (
        !selectedAorticOutflowDynamicEdgeActiveV1(
          edgeName,
          input.runtime,
        )
        && edge.useChiResistance
        && losses.areaRatio > 1e-6
      ) {
        const inertanceAreaFactor =
          -inertanceMmHgSec2PerMl / losses.areaRatio;
        dInertanceDUpstreamPressureSec2PerMl = inertanceAreaFactor
          * losses.dAreaRatioDUpstreamPressurePerMmHg;
        dInertanceDDownstreamPressureSec2PerMl = inertanceAreaFactor
          * losses.dAreaRatioDDownstreamPressurePerMmHg;
      }
      previousFlowMlPerSec = input.previousAcceptedState
        .dynamicEdgeFlowsMlPerSec[
          edgeName as NonCoronaryDynamicEdgeNameV1
        ];
    }
    const denominator = losses.resistanceMmHgSecPerMl
      + (edge.kind === "dynamic"
        ? inertanceMmHgSec2PerMl / input.dtSec
        : 0)
      + 2 * losses.quadraticLossMmHgSec2PerMl2
        * Math.abs(flowMlPerSec);
    requirePositive(denominator, `${edgeName} flow tangent denominator`);
    const dynamicInertanceFactor = edge.kind === "dynamic"
      ? (previousFlowMlPerSec - flowMlPerSec) / input.dtSec
      : 0;
    upstreamMlPerSecPerMmHg = (
      1
      - flowMlPerSec
        * losses.dResistanceDUpstreamPressureSecPerMl
      - signedQuadraticFlow
        * losses.dQuadraticLossDUpstreamPressureSec2PerMl2
      + dynamicInertanceFactor
        * dInertanceDUpstreamPressureSec2PerMl
    ) / denominator;
    downstreamMlPerSecPerMmHg = (
      -downstream.dEffectivePressureDDownstreamPressure
      - flowMlPerSec
        * losses.dResistanceDDownstreamPressureSecPerMl
      - signedQuadraticFlow
        * losses.dQuadraticLossDDownstreamPressureSec2PerMl2
      + dynamicInertanceFactor
        * dInertanceDDownstreamPressureSec2PerMl
    ) / denominator;
  }
  requireFinite(
    upstreamMlPerSecPerMmHg,
    `${edgeName} upstream pressure-flow tangent`,
  );
  requireFinite(
    downstreamMlPerSecPerMmHg,
    `${edgeName} downstream pressure-flow tangent`,
  );
  return Object.freeze({
    upstreamMlPerSecPerMmHg,
    downstreamMlPerSecPerMmHg,
  });
}

/**
 * Physical derivative of the 14 independent local continuity equations with
 * respect to the dependent SV volume. Companion volume/rate derivatives are
 * deliberately absent: the monolithic assembler owns those explicit blocks.
 */
function deviceOffLocalIndependentResidualDDependentSvVolumeV1<
  TEvaluation,
  TCompanionTrial,
>(
  graph: NonCoronaryCirculationGraphV1,
  input: NonCoronaryCirculationTrialInputV1<TEvaluation, TCompanionTrial>,
  current: CandidateEvaluation<TEvaluation, TCompanionTrial>,
  respiratoryExternalPressures: RespiratoryExternalPressuresV1,
  destination = new Float64Array(INDEPENDENT_NODE_NAMES.length),
): Float64Array {
  if (
    current.mechanicalSupport !== null
    || current.dynamicMechanicalSupport !== null
    || input.protocolResistanceScaleByEdge !== undefined
  ) {
    throw new Error(
      "dependent-SV local tangent V1 supports only the device-off protocol-free slice",
    );
  }
  if (destination.length !== INDEPENDENT_NODE_NAMES.length) {
    throw new RangeError("dependent-SV tangent destination has incompatible dimension");
  }
  destination.fill(0);
  const dependentPressureTangentMmHgPerMl = requireFinite(
    current.vascularPressureTangentMmHgPerMl[
      NON_CORONARY_NODE_INDEX_BY_NAME_V1[DEPENDENT_NODE]
    ]!,
    "SV vascular pressure tangent",
  );
  for (let edgeIndex = 0; edgeIndex < graph.edges.length; edgeIndex += 1) {
    const edge = graph.edges[edgeIndex]!;
    const upstreamName = edge.up as NonCoronaryNodeNameV1;
    const downstreamName = edge.down as NonCoronaryNodeNameV1;
    if (upstreamName !== DEPENDENT_NODE && downstreamName !== DEPENDENT_NODE) {
      continue;
    }
    const derivatives = analyticEdgeFlowPressureDerivativesV1(
      graph,
      input,
      current,
      respiratoryExternalPressures,
      edgeIndex,
    );
    const dFlowDDependentVolume = dependentPressureTangentMmHgPerMl * (
      (upstreamName === DEPENDENT_NODE
        ? derivatives.upstreamMlPerSecPerMmHg
        : 0)
      + (downstreamName === DEPENDENT_NODE
        ? derivatives.downstreamMlPerSecPerMmHg
        : 0)
    );
    const upstreamResidualRow = INDEPENDENT_NODE_INDEX[upstreamName];
    const downstreamResidualRow = INDEPENDENT_NODE_INDEX[downstreamName];
    if (upstreamResidualRow !== undefined) {
      destination[upstreamResidualRow] += input.dtSec
        * dFlowDDependentVolume;
    }
    if (downstreamResidualRow !== undefined) {
      destination[downstreamResidualRow] -= input.dtSec
        * dFlowDDependentVolume;
    }
  }
  return destination;
}

/**
 * Physical local-continuity Jacobian for the first monolithic device-off
 * slice. It differentiates native non-coronary edges and the fixed-TBV
 * dependent-SV elimination, but intentionally does not differentiate the
 * conservative companion. The coupled assembler owns those explicit rates.
 */
function deviceOffLocalIndependentResidualDIndependentVolumesV1<
  TEvaluation,
  TCompanionTrial,
>(
  graph: NonCoronaryCirculationGraphV1,
  input: NonCoronaryCirculationTrialInputV1<TEvaluation, TCompanionTrial>,
  current: CandidateEvaluation<TEvaluation, TCompanionTrial>,
  respiratoryExternalPressures: RespiratoryExternalPressuresV1,
  destination = new Float64Array(
    INDEPENDENT_NODE_NAMES.length * INDEPENDENT_NODE_NAMES.length,
  ),
): Float64Array {
  if (
    current.mechanicalSupport !== null
    || current.dynamicMechanicalSupport !== null
    || input.protocolResistanceScaleByEdge !== undefined
  ) {
    throw new Error(
      "local physical Jacobian V1 supports only the device-off protocol-free slice",
    );
  }
  const chamberTangent = current.absoluteChamberPressureTangent;
  if (chamberTangent === null) {
    throw new Error("local physical Jacobian requires chamber pressure tangents");
  }
  const size = INDEPENDENT_NODE_NAMES.length;
  if (destination.length !== size * size) {
    throw new RangeError("local physical Jacobian destination has incompatible dimension");
  }
  destination.fill(0);
  for (let index = 0; index < size; index += 1) {
    destination[index * size + index] = 1;
  }
  const pressureDerivative = (
    pressureNode: NonCoronaryNodeNameV1,
    volumeColumn: number,
  ): number => {
    const volumeNode = INDEPENDENT_NODE_NAMES[volumeColumn]!;
    if (isChamberName(pressureNode)) {
      if (!isChamberName(volumeNode)) return 0;
      const pressureRow = CHAMBER_TANGENT_INDEX[pressureNode];
      const chamberColumn = CHAMBER_TANGENT_INDEX[volumeNode];
      if (pressureRow === undefined || chamberColumn === undefined) {
        throw new Error("chamber tangent ordering drifted");
      }
      return chamberTangent.dPressureDVolumeMmHgPerMl[
        pressureRow
      ]![chamberColumn]!;
    }
    const tangent = requireFinite(
      current.vascularPressureTangentMmHgPerMl[
        NON_CORONARY_NODE_INDEX_BY_NAME_V1[pressureNode]
      ]!,
      `${pressureNode} vascular pressure tangent`,
    );
    if (pressureNode === DEPENDENT_NODE) return -tangent;
    return volumeNode === pressureNode ? tangent : 0;
  };
  for (let edgeIndex = 0; edgeIndex < graph.edges.length; edgeIndex += 1) {
    const edge = graph.edges[edgeIndex]!;
    const upstreamName = edge.up as NonCoronaryNodeNameV1;
    const downstreamName = edge.down as NonCoronaryNodeNameV1;
    const derivatives = analyticEdgeFlowPressureDerivativesV1(
      graph,
      input,
      current,
      respiratoryExternalPressures,
      edgeIndex,
    );
    const upstreamResidualRow = INDEPENDENT_NODE_INDEX[upstreamName];
    const downstreamResidualRow = INDEPENDENT_NODE_INDEX[downstreamName];
    for (let column = 0; column < size; column += 1) {
      const dFlowDVolume =
        derivatives.upstreamMlPerSecPerMmHg
          * pressureDerivative(upstreamName, column)
        + derivatives.downstreamMlPerSecPerMmHg
          * pressureDerivative(downstreamName, column);
      if (upstreamResidualRow !== undefined) {
        destination[upstreamResidualRow * size + column] +=
          input.dtSec * dFlowDVolume;
      }
      if (downstreamResidualRow !== undefined) {
        destination[downstreamResidualRow * size + column] -=
          input.dtSec * dFlowDVolume;
      }
    }
  }
  if (destination.some((value) => !Number.isFinite(value))) {
    throw new Error("local physical Jacobian produced non-finite values");
  }
  return destination;
}

/**
 * Direct chamber-pressure columns of the device-off local residual. The
 * conservative companion is excluded: the coupled assembler owns its Ao/RA
 * boundary-rate chain explicitly.
 */
function deviceOffLocalIndependentResidualDAbsoluteChamberPressuresV1<
  TEvaluation,
  TCompanionTrial,
>(
  graph: NonCoronaryCirculationGraphV1,
  input: NonCoronaryCirculationTrialInputV1<TEvaluation, TCompanionTrial>,
  current: CandidateEvaluation<TEvaluation, TCompanionTrial>,
  respiratoryExternalPressures: RespiratoryExternalPressuresV1,
  destination = new Float64Array(
    INDEPENDENT_NODE_NAMES.length
      * NON_CORONARY_CHAMBER_TANGENT_ORDER_V1.length,
  ),
): Float64Array {
  if (
    current.mechanicalSupport !== null
    || current.dynamicMechanicalSupport !== null
    || input.protocolResistanceScaleByEdge !== undefined
  ) {
    throw new Error(
      "local chamber-pressure Jacobian V1 supports only the device-off protocol-free slice",
    );
  }
  const rowCount = INDEPENDENT_NODE_NAMES.length;
  const columnCount = NON_CORONARY_CHAMBER_TANGENT_ORDER_V1.length;
  if (destination.length !== rowCount * columnCount) {
    throw new RangeError(
      "local chamber-pressure Jacobian destination has incompatible dimension",
    );
  }
  destination.fill(0);
  for (let edgeIndex = 0; edgeIndex < graph.edges.length; edgeIndex += 1) {
    const edge = graph.edges[edgeIndex]!;
    const upstreamName = edge.up as NonCoronaryNodeNameV1;
    const downstreamName = edge.down as NonCoronaryNodeNameV1;
    const derivatives = analyticEdgeFlowPressureDerivativesV1(
      graph,
      input,
      current,
      respiratoryExternalPressures,
      edgeIndex,
    );
    const upstreamResidualRow = INDEPENDENT_NODE_INDEX[upstreamName];
    const downstreamResidualRow = INDEPENDENT_NODE_INDEX[downstreamName];
    for (let column = 0; column < columnCount; column += 1) {
      const chamber = NON_CORONARY_CHAMBER_TANGENT_ORDER_V1[column]!;
      const flowDerivative =
        (upstreamName === chamber
          ? derivatives.upstreamMlPerSecPerMmHg
          : 0)
        + (downstreamName === chamber
          ? derivatives.downstreamMlPerSecPerMmHg
          : 0);
      if (upstreamResidualRow !== undefined) {
        destination[upstreamResidualRow * columnCount + column] +=
          input.dtSec * flowDerivative;
      }
      if (downstreamResidualRow !== undefined) {
        destination[downstreamResidualRow * columnCount + column] -=
          input.dtSec * flowDerivative;
      }
    }
  }
  if (destination.some((value) => !Number.isFinite(value))) {
    throw new Error(
      "local chamber-pressure Jacobian produced non-finite values",
    );
  }
  return destination;
}

/**
 * Exact chain rule for the current BE residual, using the same candidate's
 * chamber algorithmic tangent and active vascular/edge/valve branches.
 *
 * For scaled independent volumes x_j = V_j / s_j and dependent
 * V_SV = TBV_global - V_companion - sum_j V_j, this assembles
 *
 *   J = I - dt S^-1 E A (dq/dP) (dP/dV) (dV/dx).
 *
 * The no-companion derivative remains exactly -s_j. With a companion, the
 * additional -dV_companion/dx_j term is included explicitly below.
 */
function analyticCirculationJacobian<TEvaluation, TCompanionTrial>(
  graph: NonCoronaryCirculationGraphV1,
  input: NonCoronaryCirculationTrialInputV1<TEvaluation, TCompanionTrial>,
  current: CandidateEvaluation<TEvaluation, TCompanionTrial>,
  volumeScales: readonly number[],
  respiratoryExternalPressures: RespiratoryExternalPressuresV1,
  reusableJacobian?: number[][],
): number[][] {
  const chamberTangent = current.absoluteChamberPressureTangent;
  if (chamberTangent === null) {
    throw new Error("analytic circulation Jacobian requires chamber pressure tangent");
  }
  if (volumeScales.length !== INDEPENDENT_NODE_NAMES.length) {
    throw new Error("circulation volume-scale count is incompatible");
  }
  const size = INDEPENDENT_NODE_NAMES.length;
  const jacobian = reusableJacobian ?? createSquareMatrixV1(size);
  if (
    jacobian.length !== size
    || jacobian.some((row) => row.length !== size)
  ) {
    throw new Error("circulation Jacobian scratch has incompatible dimensions");
  }
  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column < size; column += 1) {
      jacobian[row]![column] = row === column ? 1 : 0;
    }
  }
  const companionVolumeSensitivity = current.conservativeCompanion
    ?.sensitivities
    ?.dCandidateCompanionBloodVolumeMlDScaledIndependentVolume;

  /**
   * Add coefficient * dP(node)/dx directly to one or two residual rows.
   * Chamber pressure has four nonzeros, ordinary vascular pressure has one,
   * and only the fixed-TBV dependent SV pressure has a dense row.
   */
  const accumulateNodePressureChain = (
    pressureNode: NonCoronaryNodeNameV1,
    pressureCoefficient: number,
    firstResidualRow: number | undefined,
    firstResidualFactor: number,
    secondResidualRow?: number,
    secondResidualFactor = 0,
  ): void => {
    if (isChamberName(pressureNode)) {
      const pressureRow = CHAMBER_TANGENT_INDEX[pressureNode];
      if (pressureRow === undefined) {
        throw new Error(`chamber ${pressureNode} has no tangent row`);
      }
      for (
        let volumeColumn = 0;
        volumeColumn < NON_CORONARY_CHAMBER_TANGENT_ORDER_V1.length;
        volumeColumn += 1
      ) {
        const volumeChamber =
          NON_CORONARY_CHAMBER_TANGENT_ORDER_V1[volumeColumn]!;
        const independentColumn = INDEPENDENT_NODE_INDEX[volumeChamber];
        if (independentColumn === undefined) {
          throw new Error(`chamber ${volumeChamber} is not an independent node`);
        }
        // The callback tangent is absolute and already contains the common
        // pericardium contribution exactly once.
        accumulateAnalyticJacobianPressureColumn(
          jacobian,
          independentColumn,
          pressureCoefficient,
          chamberTangent.dPressureDVolumeMmHgPerMl[pressureRow]![volumeColumn]!
            * volumeScales[independentColumn]!,
          firstResidualRow,
          firstResidualFactor,
          secondResidualRow,
          secondResidualFactor,
        );
      }
      return;
    }

    const pressureTangentMmHgPerMl = requireFinite(
      current.vascularPressureTangentMmHgPerMl[
        NON_CORONARY_NODE_INDEX_BY_NAME_V1[pressureNode]
      ]!,
      `${pressureNode} vascular pressure tangent`,
    );
    if (pressureNode === DEPENDENT_NODE) {
      // Fixed global TBV: dV_SV/dx_j = -s_j - dV_companion/dx_j.
      for (let column = 0; column < size; column += 1) {
        accumulateAnalyticJacobianPressureColumn(
          jacobian,
          column,
          pressureCoefficient,
          -pressureTangentMmHgPerMl * (
            volumeScales[column]!
            + (companionVolumeSensitivity?.[column] ?? 0)
          ),
          firstResidualRow,
          firstResidualFactor,
          secondResidualRow,
          secondResidualFactor,
        );
      }
      return;
    }

    const independentColumn = INDEPENDENT_NODE_INDEX[pressureNode];
    if (independentColumn === undefined) {
      throw new Error(
        `vascular node ${pressureNode} is not represented in the volume map`,
      );
    }
    accumulateAnalyticJacobianPressureColumn(
      jacobian,
      independentColumn,
      pressureCoefficient,
      pressureTangentMmHgPerMl * volumeScales[independentColumn]!,
      firstResidualRow,
      firstResidualFactor,
      secondResidualRow,
      secondResidualFactor,
    );
  };

  for (let edgeIndex = 0; edgeIndex < graph.edges.length; edgeIndex += 1) {
    const edge = graph.edges[edgeIndex]!;
    const upstreamName = edge.up as NonCoronaryNodeNameV1;
    const downstreamName = edge.down as NonCoronaryNodeNameV1;
    const derivatives = analyticEdgeFlowPressureDerivativesV1(
      graph,
      input,
      current,
      respiratoryExternalPressures,
      edgeIndex,
    );
    const upstreamResidualRow = INDEPENDENT_NODE_INDEX[upstreamName];
    const downstreamResidualRow = INDEPENDENT_NODE_INDEX[downstreamName];
    // incidence(upstream)=-q, so residual(upstream)=...+dt*q;
    // incidence(downstream)=+q, so residual(downstream)=...-dt*q.
    const upstreamResidualFactor = upstreamResidualRow === undefined
      ? 0
      : input.dtSec / volumeScales[upstreamResidualRow]!;
    const downstreamResidualFactor = downstreamResidualRow === undefined
      ? 0
      : -input.dtSec / volumeScales[downstreamResidualRow]!;
    accumulateNodePressureChain(
      upstreamName,
      derivatives.upstreamMlPerSecPerMmHg,
      upstreamResidualRow,
      upstreamResidualFactor,
      downstreamResidualRow,
      downstreamResidualFactor,
    );
    accumulateNodePressureChain(
      downstreamName,
      derivatives.downstreamMlPerSecPerMmHg,
      upstreamResidualRow,
      upstreamResidualFactor,
      downstreamResidualRow,
      downstreamResidualFactor,
    );
  }
  if (current.mechanicalSupport !== null) {
    for (const pump of Object.values(current.mechanicalSupport.pump)) {
      const inletName = pump.inletNode as NonCoronaryNodeNameV1;
      const outletName = pump.outletNode as NonCoronaryNodeNameV1;
      if (inletName === outletName) continue;
      if (
        graph.nodeIndex.get(inletName) === undefined
        || graph.nodeIndex.get(outletName) === undefined
      ) {
        throw new Error(`${pump.deviceId} mechanical-support node is absent`);
      }
      const inletResidualRow = INDEPENDENT_NODE_INDEX[inletName];
      const outletResidualRow = INDEPENDENT_NODE_INDEX[outletName];
      const inletResidualFactor = inletResidualRow === undefined
        ? 0
        : input.dtSec / volumeScales[inletResidualRow]!;
      const outletResidualFactor = outletResidualRow === undefined
        ? 0
        : -input.dtSec / volumeScales[outletResidualRow]!;
      accumulateNodePressureChain(
        inletName,
        pump.dFlowMlPerSecDInletPressureMlPerSecPerMmHg,
        inletResidualRow,
        inletResidualFactor,
        outletResidualRow,
        outletResidualFactor,
      );
      accumulateNodePressureChain(
        outletName,
        pump.dFlowMlPerSecDOutletPressureMlPerSecPerMmHg,
        inletResidualRow,
        inletResidualFactor,
        outletResidualRow,
        outletResidualFactor,
      );
      const inletVolumeColumn = INDEPENDENT_NODE_INDEX[inletName];
      if (inletVolumeColumn !== undefined) {
        const dFlowDScaledVolume =
          pump.dFlowMlPerSecDInletVolumePerSec
            * volumeScales[inletVolumeColumn]!;
        // Device incidence follows the same conservative inlet/outlet signs
        // as a native edge, but remains outside the immutable graph manifest.
        if (inletResidualRow !== undefined) {
          jacobian[inletResidualRow]![inletVolumeColumn] +=
            inletResidualFactor * dFlowDScaledVolume;
        }
        if (outletResidualRow !== undefined) {
          jacobian[outletResidualRow]![inletVolumeColumn] +=
            outletResidualFactor * dFlowDScaledVolume;
        }
      }
    }
  }
  if (current.dynamicMechanicalSupport !== null) {
    const support = current.dynamicMechanicalSupport;
    for (const residualNode of MECHANICAL_SUPPORT_NODE_NAMES_V1) {
      const residualRow = INDEPENDENT_NODE_INDEX[residualNode];
      if (residualRow === undefined) {
        throw new Error(
          `${residualNode} dynamic mechanical-support node must be independent`,
        );
      }
      const residualFactor = -input.dtSec / volumeScales[residualRow]!;
      for (const pressureNode of MECHANICAL_SUPPORT_NODE_NAMES_V1) {
        if (graph.nodeIndex.get(pressureNode) === undefined) {
          throw new Error(
            `${pressureNode} dynamic mechanical-support pressure node is absent`,
          );
        }
        const pressureCoefficient = requireFinite(
          support.dNodeNetVolumeRateDNodePressureMlPerSecPerMmHg[
            residualNode
          ][pressureNode],
          `${residualNode}/${pressureNode} dynamic support pressure tangent`,
        );
        accumulateNodePressureChain(
          pressureNode,
          pressureCoefficient,
          residualRow,
          residualFactor,
        );
      }
      for (const volumeNode of MECHANICAL_SUPPORT_NODE_NAMES_V1) {
        const volumeColumn = INDEPENDENT_NODE_INDEX[volumeNode];
        if (volumeColumn === undefined) {
          throw new Error(
            `${volumeNode} dynamic mechanical-support volume node must be independent`,
          );
        }
        const dRateDScaledVolume = requireFinite(
          support.dNodeNetVolumeRateDNodeVolumePerSec[residualNode][volumeNode]
            * volumeScales[volumeColumn]!,
          `${residualNode}/${volumeNode} dynamic support volume tangent`,
        );
        jacobian[residualRow]![volumeColumn] +=
          residualFactor * dRateDScaledVolume;
      }
    }
  }
  const companionSensitivities = current.conservativeCompanion?.sensitivities;
  if (current.conservativeCompanion !== null) {
    if (companionSensitivities === undefined) {
      throw new Error(
        "analytic circulation Jacobian requires companion sensitivities",
      );
    }
    for (const boundaryName of
      NON_CORONARY_CONSERVATIVE_COMPANION_BOUNDARY_NODES_V1) {
      const residualRow = INDEPENDENT_NODE_INDEX[boundaryName];
      if (residualRow === undefined) {
        throw new Error(`${boundaryName} companion boundary must be independent`);
      }
      const dRate = companionSensitivities
        .dOuterBoundaryNetVolumeRateMlPerSecDScaledIndependentVolume[
          boundaryName
        ];
      for (let column = 0; column < size; column += 1) {
        jacobian[residualRow]![column] -= input.dtSec
          * dRate[column]! / volumeScales[residualRow]!;
      }
    }
  }
  if (jacobian.some((row) => row.some((value) => !Number.isFinite(value)))) {
    throw new Error("analytic circulation Jacobian produced non-finite values");
  }
  return jacobian;
}

/** Exact signed solution of R q + B q |q| = pressure drive. */
export function solveSignedLinearQuadraticFlowV1(
  pressureDriveMmHg: number,
  linearCoefficientMmHgSecPerMl: number,
  quadraticCoefficientMmHgSec2PerMl2: number,
): number {
  requireFinite(pressureDriveMmHg, "pressureDriveMmHg");
  requirePositive(
    linearCoefficientMmHgSecPerMl,
    "linearCoefficientMmHgSecPerMl",
  );
  requireNonnegative(
    quadraticCoefficientMmHgSec2PerMl2,
    "quadraticCoefficientMmHgSec2PerMl2",
  );
  if (pressureDriveMmHg === 0) return 0;
  if (quadraticCoefficientMmHgSec2PerMl2 === 0) {
    return pressureDriveMmHg / linearCoefficientMmHgSecPerMl;
  }
  const magnitudeDrive = Math.abs(pressureDriveMmHg);
  const discriminant = Math.sqrt(
    linearCoefficientMmHgSecPerMl ** 2
      + 4 * quadraticCoefficientMmHgSec2PerMl2 * magnitudeDrive,
  );
  const magnitudeFlow = 2 * magnitudeDrive
    / (linearCoefficientMmHgSecPerMl + discriminant);
  return Math.sign(pressureDriveMmHg) * magnitudeFlow;
}

function initialNodeVolumes(
  graph: NonCoronaryCirculationGraphV1,
  runtime: NonCoronaryCirculationRuntimeParamsV1,
): NodeRecord<number> {
  return nodeRecord((name) => {
    const node = graph.nodes[graph.nodeIndex.get(name)!];
    const volume = physicalColdSeedVolumeFromNodeV1(node, runtime.vascular);
    return requirePositive(volume, `${name} initial volume`);
  });
}

function success<TEvaluation, TCompanionTrial>(
  previous: NonCoronaryCirculationAcceptedStateV1,
  dtSec: number,
  candidateTimeSec: number,
  evaluation: CandidateEvaluation<TEvaluation, TCompanionTrial>,
  diagnostics: NonCoronaryCirculationTrialDiagnosticsV1,
): NonCoronaryCirculationTrialSuccessV1<TEvaluation, TCompanionTrial> {
  const companion = evaluation.conservativeCompanion;
  const candidateNodeVolumesMl = nodeRecord((name) => requirePositive(
    evaluation.nodeVolumesMl[NON_CORONARY_NODE_INDEX_BY_NAME_V1[name]]!,
    `candidateNodeVolumesMl.${name}`,
  ));
  const candidateDynamicEdgeFlowsMlPerSec = dynamicEdgeRecord((name) =>
    requireFinite(
      evaluation.dynamicEdgeFlowsMlPerSec[
        NON_CORONARY_DYNAMIC_EDGE_INDEX_BY_NAME_V1[name]
      ]!,
      `candidateDynamicEdgeFlowsMlPerSec.${name}`,
    ));
  const candidateValveStates = valveRecord((name) => {
    const state = evaluation.valveStates[
      NON_CORONARY_VALVE_INDEX_BY_NAME_V1[name]
    ]!;
    return Object.freeze({ ...state });
  });
  const nodeAbsolutePressuresMmHg = nodeRecord((name) => requireFinite(
    evaluation.nodeAbsolutePressuresMmHg[
      NON_CORONARY_NODE_INDEX_BY_NAME_V1[name]
    ]!,
    `nodeAbsolutePressuresMmHg.${name}`,
  ));
  const edgeFlowsMlPerSec = edgeRecord((name) => requireFinite(
    evaluation.edgeFlowsMlPerSec[NON_CORONARY_EDGE_INDEX_BY_NAME_V1[name]]!,
    `edgeFlowsMlPerSec.${name}`,
  ));
  const valveEvaluations = valveRecord((name) =>
    evaluation.valveEvaluations[
      NON_CORONARY_VALVE_INDEX_BY_NAME_V1[name]
    ]!);
  return Object.freeze({
    converged: true as const,
    transactionId: NON_CORONARY_CIRCULATION_BE_V1_ID,
    baseRevision: previous.revision,
    baseAcceptedTimeSec: previous.acceptedTimeSec,
    candidateTimeSec,
    dtSec,
    candidateNodeVolumesMl,
    candidateDynamicEdgeFlowsMlPerSec,
    candidateValveStates,
    nodeAbsolutePressuresMmHg,
    edgeFlowsMlPerSec,
    valveEvaluations,
    candidateMechanicsEvaluation: evaluation.candidateMechanicsEvaluation,
    ...(evaluation.mechanicalSupport === null
      ? {}
      : { mechanicalSupport: evaluation.mechanicalSupport }),
    ...(evaluation.dynamicMechanicalSupport === null
      ? {}
      : { dynamicMechanicalSupport: evaluation.dynamicMechanicalSupport }),
    ...(companion === null
      ? {}
      : {
        conservativeCompanion: Object.freeze({
          fixedGlobalTotalBloodVolumeMl:
            companion.fixedGlobalTotalBloodVolumeMl,
          previousAcceptedCompanionBloodVolumeMl:
            companion.previousAcceptedCompanionBloodVolumeMl,
          candidateCompanionBloodVolumeMl:
            companion.candidateCompanionBloodVolumeMl,
          outerBoundaryNetVolumeRateMlPerSec:
            companion.outerBoundaryNetVolumeRateMlPerSec,
          candidateCompanionTrial: companion.candidateCompanionTrial,
        }),
      }),
    diagnostics,
    mechanicsCommitted: false as const,
    reverseFlowCapOrClampOnNonvalveEdges: false as const,
    units: NON_CORONARY_CIRCULATION_UNITS_V1,
  });
}

function failure(
  previous: NonCoronaryCirculationAcceptedStateV1,
  reason: NonCoronaryCirculationTrialFailureReasonV1,
  message: string,
  lastVolumes: NodeRecord<number> | Float64Array,
  diagnostics: NonCoronaryCirculationTrialDiagnosticsV1,
): NonCoronaryCirculationTrialFailureV1 {
  return Object.freeze({
    converged: false as const,
    transactionId: NON_CORONARY_CIRCULATION_BE_V1_ID,
    reason,
    message,
    rollbackState: cloneAcceptedState(previous),
    lastAcceptedCandidateNodeVolumesMl: lastVolumes instanceof Float64Array
      ? nodeRecord((name) => requireFinite(
          lastVolumes[NON_CORONARY_NODE_INDEX_BY_NAME_V1[name]]!,
          `lastAcceptedCandidateNodeVolumesMl.${name}`,
        ))
      : copyNodeRecord(
          lastVolumes,
          "lastAcceptedCandidateNodeVolumesMl",
          requireFinite,
        ),
    diagnostics,
    mechanicsCommitted: false as const,
    units: NON_CORONARY_CIRCULATION_UNITS_V1,
  });
}

function acceptedState(input: Readonly<{
  revision: number;
  acceptedTimeSec: number;
  totalBloodVolumeMl: number;
  nodeVolumesMl: NodeRecord<number>;
  dynamicEdgeFlowsMlPerSec: DynamicEdgeRecord<number>;
  valveStates: ValveRecord<MainWireQuasiSteadyOrificeValveStateV2>;
}>): NonCoronaryCirculationAcceptedStateV1 {
  requireInteger(input.revision, "revision");
  requireNonnegative(input.acceptedTimeSec, "acceptedTimeSec");
  requirePositive(input.totalBloodVolumeMl, "totalBloodVolumeMl");
  const nodeVolumesMl = copyNodeRecord(
    input.nodeVolumesMl,
    "nodeVolumesMl",
    requirePositive,
  );
  if (!nearlyEqual(sumNodeRecord(nodeVolumesMl), input.totalBloodVolumeMl)) {
    throw new Error("node volumes do not match the fixed TBV owner");
  }
  return Object.freeze({
    transactionId: NON_CORONARY_CIRCULATION_BE_V1_ID,
    revision: input.revision,
    acceptedTimeSec: input.acceptedTimeSec,
    totalBloodVolumeMl: input.totalBloodVolumeMl,
    nodeVolumesMl,
    dynamicEdgeFlowsMlPerSec: copyDynamicEdgeRecord(
      input.dynamicEdgeFlowsMlPerSec,
      "dynamicEdgeFlowsMlPerSec",
      requireFinite,
    ),
    valveStates: copyValveStates(input.valveStates),
  });
}

function cloneAcceptedState(
  state: NonCoronaryCirculationAcceptedStateV1,
): NonCoronaryCirculationAcceptedStateV1 {
  return acceptedState({
    revision: state.revision,
    acceptedTimeSec: state.acceptedTimeSec,
    totalBloodVolumeMl: state.totalBloodVolumeMl,
    nodeVolumesMl: state.nodeVolumesMl,
    dynamicEdgeFlowsMlPerSec: state.dynamicEdgeFlowsMlPerSec,
    valveStates: state.valveStates,
  });
}

function validateAcceptedState(
  state: NonCoronaryCirculationAcceptedStateV1,
): void {
  if (state.transactionId !== NON_CORONARY_CIRCULATION_BE_V1_ID) {
    throw new Error("accepted circulation transaction identity mismatch");
  }
  requireInteger(state.revision, "accepted revision");
  requireNonnegative(state.acceptedTimeSec, "acceptedTimeSec");
  requirePositive(state.totalBloodVolumeMl, "accepted totalBloodVolumeMl");
  copyNodeRecord(state.nodeVolumesMl, "accepted nodeVolumesMl", requirePositive);
  copyDynamicEdgeRecord(
    state.dynamicEdgeFlowsMlPerSec,
    "accepted dynamicEdgeFlowsMlPerSec",
    requireFinite,
  );
  copyValveStates(state.valveStates);
  if (!nearlyEqual(sumNodeRecord(state.nodeVolumesMl), state.totalBloodVolumeMl)) {
    throw new Error("accepted circulation state TBV identity is stale");
  }
}

function scaledToNodeVolumes(
  scaledIndependentVolumes: readonly number[],
  scales: readonly number[],
  totalBloodVolumeMl: number,
  destination?: Float64Array,
): Float64Array {
  if (
    scaledIndependentVolumes.length !== INDEPENDENT_NODE_NAMES.length
    || scales.length !== INDEPENDENT_NODE_NAMES.length
  ) throw new Error("circulation independent-volume vector has wrong length");
  const values = destination
    ?? new Float64Array(NON_CORONARY_NODE_NAMES_V1.length);
  if (values.length !== NON_CORONARY_NODE_NAMES_V1.length) {
    throw new Error("circulation candidate-volume scratch has wrong length");
  }
  let independentSum = 0;
  for (let index = 0; index < INDEPENDENT_NODE_NAMES.length; index += 1) {
    const value = requirePositive(
      scaledIndependentVolumes[index]! * scales[index]!,
      `${INDEPENDENT_NODE_NAMES[index]} candidate volume`,
    );
    values[NON_CORONARY_NODE_INDEX_BY_NAME_V1[
      INDEPENDENT_NODE_NAMES[index]!
    ]] = value;
    independentSum += value;
  }
  values[NON_CORONARY_NODE_INDEX_BY_NAME_V1[DEPENDENT_NODE]] = requirePositive(
    totalBloodVolumeMl - independentSum,
    `${DEPENDENT_NODE} dependent candidate volume`,
  );
  return values;
}

function scaledToIndependentNodeVolumes(
  scaledIndependentVolumes: readonly number[],
  scales: readonly number[],
  destination?: Record<NonCoronaryIndependentNodeNameV1, number>,
): NonCoronaryIndependentNodeRecordV1<number> {
  if (
    scaledIndependentVolumes.length !== INDEPENDENT_NODE_NAMES.length
    || scales.length !== INDEPENDENT_NODE_NAMES.length
  ) throw new Error("circulation independent-volume vector has wrong length");
  const values = destination
    ?? {} as Record<NonCoronaryIndependentNodeNameV1, number>;
  for (let index = 0; index < INDEPENDENT_NODE_NAMES.length; index += 1) {
    const value = requirePositive(
      scaledIndependentVolumes[index]! * scales[index]!,
      `${INDEPENDENT_NODE_NAMES[index]} candidate volume`,
    );
    values[INDEPENDENT_NODE_NAMES[index]!] = value;
  }
  return destination === undefined ? Object.freeze(values) : values;
}

function independentNodeVolumesFromNodeArray(
  volumes: Float64Array,
  destination?: Record<NonCoronaryIndependentNodeNameV1, number>,
): NonCoronaryIndependentNodeRecordV1<number> {
  const independent = destination ?? {} as Record<
      NonCoronaryIndependentNodeNameV1,
      number
  >;
  for (const name of INDEPENDENT_NODE_NAMES) {
    independent[name] = volumes[NON_CORONARY_NODE_INDEX_BY_NAME_V1[name]]!;
  }
  return destination === undefined ? Object.freeze(independent) : independent;
}

function scaledResidualValuesV1(
  continuityResidualMlByNode: Float64Array,
  volumeScales: readonly number[],
  destination?: Float64Array,
): Float64Array {
  const values = destination
    ?? new Float64Array(INDEPENDENT_NODE_NAMES.length);
  if (values.length !== INDEPENDENT_NODE_NAMES.length) {
    throw new Error("circulation scaled-residual scratch has wrong length");
  }
  for (let index = 0; index < INDEPENDENT_NODE_NAMES.length; index += 1) {
    values[index] = continuityResidualMlByNode[
      NON_CORONARY_NODE_INDEX_BY_NAME_V1[INDEPENDENT_NODE_NAMES[index]!]
    ]! / volumeScales[index]!;
  }
  return values;
}

function independentVolumesToScaled(
  volumes: Float64Array,
  scales: readonly number[],
  destination?: number[],
): readonly number[] {
  const values = destination
    ?? Array<number>(INDEPENDENT_NODE_NAMES.length);
  if (values.length !== INDEPENDENT_NODE_NAMES.length) {
    throw new Error("circulation scaled-volume scratch has wrong length");
  }
  for (let index = 0; index < INDEPENDENT_NODE_NAMES.length; index += 1) {
    values[index] = volumes[
      NON_CORONARY_NODE_INDEX_BY_NAME_V1[INDEPENDENT_NODE_NAMES[index]!]
    ]!
      / scales[index]!;
  }
  return destination === undefined ? Object.freeze(values) : values;
}

/**
 * A pure relative gate is brittle once residuals reach the finite-difference
 * noise floor. Keep the existing scale-relative term and add a tiny absolute
 * volume term, node by node, as in a standard mixed atol + rtol criterion.
 */
function mixedContinuityResidualAudit<TEvaluation, TCompanionTrial>(
  evaluation: CandidateEvaluation<TEvaluation, TCompanionTrial>,
  referenceVolumesMl: Float64Array,
  absoluteToleranceMl: number,
  scaledTolerance: number,
): MixedContinuityResidualAudit {
  let worstNode: NonCoronaryNodeNameV1 = NON_CORONARY_NODE_NAMES_V1[0]!;
  let worstResidualMl = evaluation.continuityResidualMlByNode[0]!;
  let worstAbsoluteResidualMl = Math.abs(worstResidualMl);
  let worstToleranceMl = absoluteToleranceMl + scaledTolerance * Math.max(
    10,
    Math.abs(referenceVolumesMl[
      NON_CORONARY_NODE_INDEX_BY_NAME_V1[worstNode]
    ]!),
  );
  let worstNormalizedResidual = worstAbsoluteResidualMl / worstToleranceMl;
  for (let index = 1; index < NON_CORONARY_NODE_NAMES_V1.length; index += 1) {
    const node = NON_CORONARY_NODE_NAMES_V1[index]!;
    const residualMl = evaluation.continuityResidualMlByNode[index]!;
    const absoluteResidualMl = Math.abs(residualMl);
    const toleranceMl = absoluteToleranceMl + scaledTolerance * Math.max(
      10,
      Math.abs(referenceVolumesMl[NON_CORONARY_NODE_INDEX_BY_NAME_V1[node]]!),
    );
    const normalizedResidual = absoluteResidualMl / toleranceMl;
    if (normalizedResidual > worstNormalizedResidual) {
      worstNode = node;
      worstResidualMl = residualMl;
      worstAbsoluteResidualMl = absoluteResidualMl;
      worstToleranceMl = toleranceMl;
      worstNormalizedResidual = normalizedResidual;
    }
  }
  const worst = Object.freeze({
    node: worstNode,
    residualMl: worstResidualMl,
    absoluteResidualMl: worstAbsoluteResidualMl,
    toleranceMl: worstToleranceMl,
    normalizedResidual: worstNormalizedResidual,
  });
  return Object.freeze({
    infinityNorm: worstNormalizedResidual,
    worst,
  });
}

function independentVolumeScales(
  volumes: Float64Array,
  destination?: number[],
): readonly number[] {
  const values = destination
    ?? Array<number>(INDEPENDENT_NODE_NAMES.length);
  if (values.length !== INDEPENDENT_NODE_NAMES.length) {
    throw new Error("circulation volume-scale scratch has wrong length");
  }
  for (let index = 0; index < INDEPENDENT_NODE_NAMES.length; index += 1) {
    values[index] = Math.max(
      10,
      Math.abs(volumes[
        NON_CORONARY_NODE_INDEX_BY_NAME_V1[INDEPENDENT_NODE_NAMES[index]!]
      ]!),
    );
  }
  return destination === undefined ? Object.freeze(values) : values;
}

function finiteDifferenceJacobian(
  evaluate: (unknowns: readonly number[]) => readonly number[],
  center: readonly number[],
  requestedStep: number,
): number[][] {
  const centerValue = evaluate(center);
  const size = center.length;
  if (centerValue.length !== size) throw new Error("residual is not square");
  const jacobian = Array.from({ length: size }, () => Array(size).fill(0));
  for (let column = 0; column < size; column += 1) {
    let step = requestedStep;
    let derivative: readonly number[] | null = null;
    let lastLowerIssue = "not-evaluated";
    let lastUpperIssue = "not-evaluated";
    for (let attempt = 0; attempt < 8 && derivative === null; attempt += 1) {
      const lower = [...center];
      const upper = [...center];
      lower[column] -= step;
      upper[column] += step;
      const lowerAttempt = tryEvaluateVector(evaluate, lower);
      const upperAttempt = tryEvaluateVector(evaluate, upper);
      lastLowerIssue = lowerAttempt.issue;
      lastUpperIssue = upperAttempt.issue;
      if (lowerAttempt.value && upperAttempt.value) {
        derivative = upperAttempt.value.map((value, row) =>
          (value - lowerAttempt.value![row]!) / (2 * step));
      } else if (upperAttempt.value) {
        derivative = upperAttempt.value.map((value, row) =>
          (value - centerValue[row]!) / step);
      } else if (lowerAttempt.value) {
        derivative = lowerAttempt.value.map((_value, row) =>
          (centerValue[row]! - lowerAttempt.value![row]!) / step);
      }
      step *= 0.5;
    }
    if (derivative === null || derivative.some((value) => !Number.isFinite(value))) {
      throw new Error(
        `failed to differentiate circulation volume ${column} `
        + `(${INDEPENDENT_NODE_NAMES[column]}): lower=${lastLowerIssue}; `
        + `upper=${lastUpperIssue}`,
      );
    }
    for (let row = 0; row < size; row += 1) {
      jacobian[row]![column] = derivative[row]!;
    }
  }
  return jacobian;
}

function recordJacobianShadowDifference(
  usage: JacobianUsageDiagnosticsV1,
  analytic: readonly (readonly number[])[],
  finiteDifference: readonly (readonly number[])[],
): void {
  if (
    analytic.length !== finiteDifference.length
    || analytic.some((row, index) =>
      row.length !== finiteDifference[index]?.length)
  ) throw new Error("analytic and finite-difference Jacobian shapes differ");
  let maximumAbsolute = 0;
  let differenceSquared = 0;
  let referenceSquared = 0;
  for (let row = 0; row < analytic.length; row += 1) {
    for (let column = 0; column < analytic[row]!.length; column += 1) {
      const analyticValue = analytic[row]![column]!;
      const referenceValue = finiteDifference[row]![column]!;
      const difference = analyticValue - referenceValue;
      if (![analyticValue, referenceValue, difference].every(Number.isFinite)) {
        throw new Error("Jacobian shadow comparison produced non-finite values");
      }
      maximumAbsolute = Math.max(maximumAbsolute, Math.abs(difference));
      differenceSquared += difference * difference;
      referenceSquared += referenceValue * referenceValue;
    }
  }
  const relativeFrobenius = Math.sqrt(differenceSquared)
    / Math.max(Math.sqrt(referenceSquared), 1e-14);
  usage.finiteDifferenceShadowCount += 1;
  usage.maximumAbsoluteShadowDifference = Math.max(
    usage.maximumAbsoluteShadowDifference ?? 0,
    maximumAbsolute,
  );
  usage.maximumRelativeFrobeniusShadowDifference = Math.max(
    usage.maximumRelativeFrobeniusShadowDifference ?? 0,
    relativeFrobenius,
  );
}

function solveDenseLinearSystem(
  sourceMatrix: readonly (readonly number[])[],
  sourceRight: readonly number[],
  scratchStorage: NonCoronaryBackwardEulerScratchStorageV1 | null = null,
): readonly number[] | null {
  const size = sourceRight.length;
  if (sourceMatrix.length !== size
    || sourceMatrix.some((row) => row.length !== size)) return null;
  const matrix = scratchStorage?.linearMatrix ?? createSquareMatrixV1(size);
  const right = scratchStorage?.linearRight ?? Array<number>(size).fill(0);
  const solution = scratchStorage?.linearSolution
    ?? Array<number>(size).fill(0);
  if (
    matrix.length !== size
    || matrix.some((row) => row.length !== size)
    || right.length !== size
    || solution.length !== size
  ) return null;
  for (let row = 0; row < size; row += 1) {
    right[row] = sourceRight[row]!;
    solution[row] = 0;
    for (let column = 0; column < size; column += 1) {
      matrix[row]![column] = sourceMatrix[row]![column]!;
    }
  }
  for (let pivot = 0; pivot < size; pivot += 1) {
    let best = pivot;
    for (let row = pivot + 1; row < size; row += 1) {
      if (Math.abs(matrix[row]![pivot]!) > Math.abs(matrix[best]![pivot]!)) best = row;
    }
    const pivotValue = matrix[best]![pivot]!;
    let rowScale = Number.MIN_VALUE;
    for (let column = 0; column < size; column += 1) {
      rowScale = Math.max(rowScale, Math.abs(matrix[best]![column]!));
    }
    if (!Number.isFinite(pivotValue) || Math.abs(pivotValue) <= 1e-13 * rowScale) {
      return null;
    }
    [matrix[pivot], matrix[best]] = [matrix[best]!, matrix[pivot]!];
    [right[pivot], right[best]] = [right[best]!, right[pivot]!];
    for (let row = pivot + 1; row < size; row += 1) {
      const factor = matrix[row]![pivot]! / matrix[pivot]![pivot]!;
      matrix[row]![pivot] = 0;
      for (let column = pivot + 1; column < size; column += 1) {
        matrix[row]![column] -= factor * matrix[pivot]![column]!;
      }
      right[row] -= factor * right[pivot]!;
    }
  }
  for (let row = size - 1; row >= 0; row -= 1) {
    let value = right[row]!;
    for (let column = row + 1; column < size; column += 1) {
      value -= matrix[row]![column]! * solution[column]!;
    }
    solution[row] = value / matrix[row]![row]!;
  }
  if (!solution.every(Number.isFinite)) return null;
  return scratchStorage === null ? Object.freeze(solution) : solution;
}

function trialDiagnostics<TEvaluation, TCompanionTrial>(
  iterations: number,
  acceptedLineSearchSteps: number,
  lineSearchBacktracks: number,
  residualNorm: number,
  evaluation: CandidateEvaluation<TEvaluation, TCompanionTrial>,
  previous: PreviousAcceptedNumericalStateV1,
  options: Required<NonCoronaryCirculationNewtonOptionsV1>,
  mechanicsCache: CandidateMechanicsCache<TEvaluation>,
  failureNewtonTrace: readonly NonCoronaryNewtonFailureTraceEntryV1[] = [],
  lineSearchFailure: NonCoronaryLineSearchFailureDiagnosticsV1 | null = null,
): NonCoronaryCirculationTrialDiagnosticsV1 {
  const worstIndependentContinuityResidual =
    worstIndependentContinuityResidualFromEvaluation(evaluation);
  const mixedContinuityResidual = mixedContinuityResidualAudit(
    evaluation,
    previous.nodeVolumesMl,
    options.absoluteContinuityResidualToleranceMl,
    options.scaledResidualInfinityTolerance,
  );
  let finalMaximumContinuityResidualMl = 0;
  for (let nodeIndex = 0;
    nodeIndex < NON_CORONARY_NODE_NAMES_V1.length;
    nodeIndex += 1) {
    finalMaximumContinuityResidualMl = Math.max(
      finalMaximumContinuityResidualMl,
      Math.abs(evaluation.continuityResidualMlByNode[nodeIndex]!),
    );
  }
  return Object.freeze({
    iterations,
    acceptedLineSearchSteps,
    lineSearchBacktracks,
    finalScaledResidualInfinityNorm: residualNorm,
    finalMixedContinuityResidualInfinityNorm:
      mixedContinuityResidual.infinityNorm,
    absoluteContinuityResidualToleranceMl:
      options.absoluteContinuityResidualToleranceMl,
    relativeContinuityResidualTolerance:
      options.scaledResidualInfinityTolerance,
    finalMaximumContinuityResidualMl,
    dependentNodeContinuityResidualMl:
      evaluation.continuityResidualMlByNode[
        NON_CORONARY_NODE_INDEX_BY_NAME_V1[DEPENDENT_NODE]
      ]!,
    totalBloodVolumeErrorMl:
      evaluation.conservativeCompanion === null
        ? sumCandidateNodeValuesV1(evaluation.nodeVolumesMl)
          - previous.totalBloodVolumeMl
        : sumCandidateNodeValuesV1(evaluation.nodeVolumesMl)
          + evaluation.conservativeCompanion.candidateCompanionBloodVolumeMl
          - evaluation.conservativeCompanion.fixedGlobalTotalBloodVolumeMl,
    jacobianMode: jacobianModeFromUsage(mechanicsCache.jacobianUsage),
    pressureTangentAvailableAtFinalCandidate:
      evaluation.absoluteChamberPressureTangent !== null,
    finiteDifferenceScaledStep:
      mechanicsCache.jacobianUsage.finiteDifferenceFallbackCount > 0
        || mechanicsCache.jacobianUsage.finiteDifferenceShadowCount > 0
        ? options.finiteDifferenceScaledStep
        : null,
    finiteDifferenceJacobianFallbackReason:
      mechanicsCache.jacobianUsage.finiteDifferenceFallbackCount > 0
        ? evaluation.conservativeCompanion !== null
            && evaluation.conservativeCompanion.sensitivities === undefined
          ? "conservative-companion-sensitivities-not-provided"
          : "absolute-chamber-pressure-tangent-not-provided"
        : null,
    analyticJacobianAssemblyCount:
      mechanicsCache.jacobianUsage.analyticAssemblyCount,
    finiteDifferenceJacobianFallbackCount:
      mechanicsCache.jacobianUsage.finiteDifferenceFallbackCount,
    finiteDifferenceJacobianShadowCount:
      mechanicsCache.jacobianUsage.finiteDifferenceShadowCount,
    jacobianMaximumAbsoluteShadowDifference:
      mechanicsCache.jacobianUsage.maximumAbsoluteShadowDifference,
    jacobianMaximumRelativeFrobeniusShadowDifference:
      mechanicsCache.jacobianUsage.maximumRelativeFrobeniusShadowDifference,
    mechanicsCallbackCallCount: mechanicsCache.callCount,
    mechanicsCallbackCacheHitCount: mechanicsCache.hitCount,
    mechanicsCallbackUniqueCandidateCount: mechanicsCache.uniqueCandidateCount,
    worstIndependentContinuityResidual,
    worstMixedContinuityResidual: mixedContinuityResidual.worst,
    failureNewtonTrace: Object.freeze([...failureNewtonTrace]),
    lineSearchFailure,
  });
}

function emptyDiagnostics<TEvaluation>(
  options?: Required<NonCoronaryCirculationNewtonOptionsV1>,
  mechanicsCache?: CandidateMechanicsCache<TEvaluation>,
): NonCoronaryCirculationTrialDiagnosticsV1 {
  return Object.freeze({
    iterations: 0,
    acceptedLineSearchSteps: 0,
    lineSearchBacktracks: 0,
    finalScaledResidualInfinityNorm: Number.POSITIVE_INFINITY,
    finalMixedContinuityResidualInfinityNorm: Number.POSITIVE_INFINITY,
    absoluteContinuityResidualToleranceMl:
      options?.absoluteContinuityResidualToleranceMl ?? Number.NaN,
    relativeContinuityResidualTolerance:
      options?.scaledResidualInfinityTolerance ?? Number.NaN,
    finalMaximumContinuityResidualMl: Number.POSITIVE_INFINITY,
    dependentNodeContinuityResidualMl: Number.NaN,
    totalBloodVolumeErrorMl: Number.NaN,
    jacobianMode: mechanicsCache
      ? jacobianModeFromUsage(mechanicsCache.jacobianUsage)
      : "not-required",
    pressureTangentAvailableAtFinalCandidate: false,
    finiteDifferenceScaledStep: null,
    finiteDifferenceJacobianFallbackReason:
      (mechanicsCache?.jacobianUsage.finiteDifferenceFallbackCount ?? 0) > 0
        ? "absolute-chamber-pressure-tangent-not-provided"
        : null,
    analyticJacobianAssemblyCount:
      mechanicsCache?.jacobianUsage.analyticAssemblyCount ?? 0,
    finiteDifferenceJacobianFallbackCount:
      mechanicsCache?.jacobianUsage.finiteDifferenceFallbackCount ?? 0,
    finiteDifferenceJacobianShadowCount:
      mechanicsCache?.jacobianUsage.finiteDifferenceShadowCount ?? 0,
    jacobianMaximumAbsoluteShadowDifference:
      mechanicsCache?.jacobianUsage.maximumAbsoluteShadowDifference ?? null,
    jacobianMaximumRelativeFrobeniusShadowDifference:
      mechanicsCache?.jacobianUsage.maximumRelativeFrobeniusShadowDifference
        ?? null,
    mechanicsCallbackCallCount: mechanicsCache?.callCount ?? 0,
    mechanicsCallbackCacheHitCount: mechanicsCache?.hitCount ?? 0,
    mechanicsCallbackUniqueCandidateCount:
      mechanicsCache?.uniqueCandidateCount ?? 0,
    worstIndependentContinuityResidual: null,
    worstMixedContinuityResidual: null,
    failureNewtonTrace: Object.freeze([]),
    lineSearchFailure: null,
  });
}

function jacobianModeFromUsage(
  usage: JacobianUsageDiagnosticsV1,
): NonCoronaryCirculationTrialDiagnosticsV1["jacobianMode"] {
  if (
    usage.analyticAssemblyCount === 0
    && usage.finiteDifferenceFallbackCount === 0
  ) return "not-required";
  if (
    usage.analyticAssemblyCount > 0
    && usage.finiteDifferenceFallbackCount > 0
  ) return "mixed";
  return usage.analyticAssemblyCount > 0
    ? "analytic-semismooth"
    : "full-fd-fallback";
}

function worstIndependentContinuityResidualFromEvaluation<
  TEvaluation,
  TCompanionTrial,
>(
  evaluation: CandidateEvaluation<TEvaluation, TCompanionTrial>,
): NonNullable<
  NonCoronaryCirculationTrialDiagnosticsV1[
    "worstIndependentContinuityResidual"
  ]
> {
  let worstIndex = 0;
  for (let index = 1; index < INDEPENDENT_NODE_NAMES.length; index += 1) {
    const candidateNodeIndex = NON_CORONARY_NODE_INDEX_BY_NAME_V1[
      INDEPENDENT_NODE_NAMES[index]!
    ];
    const worstNodeIndex = NON_CORONARY_NODE_INDEX_BY_NAME_V1[
      INDEPENDENT_NODE_NAMES[worstIndex]!
    ];
    if (Math.abs(evaluation.continuityResidualMlByNode[candidateNodeIndex]!)
        > Math.abs(evaluation.continuityResidualMlByNode[worstNodeIndex]!)) {
      worstIndex = index;
    }
  }
  const node = INDEPENDENT_NODE_NAMES[worstIndex]!;
  const residualMl = evaluation.continuityResidualMlByNode[
    NON_CORONARY_NODE_INDEX_BY_NAME_V1[node]
  ]!;
  return Object.freeze({
    node,
    residualMl,
    absoluteResidualMl: Math.abs(residualMl),
    scaledResidual: evaluation.scaledIndependentResidual[worstIndex]!,
  });
}

function pushBoundedFailureTrace(
  trace: MutableNewtonFailureTraceEntryV1[],
  entry: MutableNewtonFailureTraceEntryV1,
): void {
  trace.push(entry);
  if (trace.length > MAX_NEWTON_FAILURE_TRACE_ENTRIES) trace.shift();
}

function freezeFailureTrace(
  trace: readonly MutableNewtonFailureTraceEntryV1[],
): readonly NonCoronaryNewtonFailureTraceEntryV1[] {
  return Object.freeze(trace.map((entry) => Object.freeze({ ...entry })));
}

function boundedDiagnosticMessage(message: string): string {
  if (message.length <= MAX_FAILURE_DIAGNOSTIC_MESSAGE_CHARACTERS) {
    return message;
  }
  return `${message.slice(0, MAX_FAILURE_DIAGNOSTIC_MESSAGE_CHARACTERS - 1)}…`;
}

function resolveNewtonOptions(
  options: NonCoronaryCirculationNewtonOptionsV1 | undefined,
): Required<NonCoronaryCirculationNewtonOptionsV1> {
  const resolved = { ...DEFAULT_NEWTON_OPTIONS, ...options };
  requireInteger(resolved.maxIterations, "maxIterations");
  requireInteger(
    resolved.maximumLineSearchBacktracks,
    "maximumLineSearchBacktracks",
  );
  if (resolved.maxIterations <= 0 || resolved.maximumLineSearchBacktracks <= 0) {
    throw new Error("Newton iteration limits must be positive");
  }
  requirePositive(
    resolved.scaledResidualInfinityTolerance,
    "scaledResidualInfinityTolerance",
  );
  requireNonnegative(
    resolved.absoluteContinuityResidualToleranceMl,
    "absoluteContinuityResidualToleranceMl",
  );
  requirePositive(
    resolved.scaledUpdateInfinityTolerance,
    "scaledUpdateInfinityTolerance",
  );
  requirePositive(resolved.finiteDifferenceScaledStep, "finiteDifferenceScaledStep");
  if (typeof resolved.analyticJacobianFiniteDifferenceShadow !== "boolean") {
    throw new Error("analyticJacobianFiniteDifferenceShadow must be boolean");
  }
  return Object.freeze(resolved);
}

/**
 * Runtime parameters that have already passed this validation. The session
 * holds one frozen runtime object for the life of a parameter setting and hands
 * the same object to every step, so without this the whole check — including
 * five `stableHash` passes over an unchanging valve research input — re-ran twice per
 * 2 ms step.
 *
 * Membership is by object identity. A caller that mutates a runtime object in
 * place instead of building a new one is outside the contract: the object is
 * expected to be frozen, and the session replaces it wholesale on a parameter
 * change.
 */
const VALIDATED_RUNTIMES_V1 = new WeakSet<object>();

function validateRuntime(runtime: NonCoronaryCirculationRuntimeParamsV1): void {
  if (VALIDATED_RUNTIMES_V1.has(runtime)) return;
  validateRuntimeOnceV1(runtime);
  VALIDATED_RUNTIMES_V1.add(runtime);
}

function validateRuntimeOnceV1(
  runtime: NonCoronaryCirculationRuntimeParamsV1,
): void {
  requireFinite(runtime.vascular.venousTone, "venousTone");
  requirePositive(runtime.vascular.arterialStiffness, "arterialStiffness");
  const aorticInertanceScale = runtime.vascular.aorticRootInertanceResearchScale;
  if (aorticInertanceScale !== undefined) {
    requireNonnegative(aorticInertanceScale, "aorticRootInertanceResearchScale");
    if (runtime.vascular.selectedAorticOutflowProfile !== undefined
      || runtime.vascular.algebraicProximalArterialRootsProfile !== undefined) {
      throw new Error("aortic root inertance scale cannot override another aortic root owner");
    }
  }
  const selectedAorticOutflowProfile =
    runtime.vascular.selectedAorticOutflowProfile;
  if (selectedAorticOutflowProfile !== undefined) {
    const selectedProfileIssues =
      validateMainWireSelectedAorticOutflowCirculationProfileV1(
        selectedAorticOutflowProfile,
      );
    if (selectedProfileIssues.length > 0) {
      throw new Error(
        `invalid selectedAorticOutflowProfile: ${selectedProfileIssues.join("; ")}`,
      );
    }
  }
  const algebraicProximalArterialRootsProfile = runtime.vascular
    .algebraicProximalArterialRootsProfile;
  if (algebraicProximalArterialRootsProfile !== undefined) {
    const issues = validateMainWireAlgebraicProximalArterialRootsProfileV1(
      algebraicProximalArterialRootsProfile,
    );
    if (issues.length > 0) {
      throw new Error(
        `invalid algebraicProximalArterialRootsProfile: ${issues.join("; ")}`,
      );
    }
    if (selectedAorticOutflowProfile === undefined) {
      throw new Error(
        "algebraic proximal arterial roots require selected aortic outflow",
      );
    }
  }
  const algebraicPulmonaryArterialRootProfile = runtime.vascular
    .algebraicPulmonaryArterialRootProfile;
  if (algebraicPulmonaryArterialRootProfile !== undefined) {
    const issues = validateMainWireAlgebraicPulmonaryArterialRootProfileV1(
      algebraicPulmonaryArterialRootProfile,
    );
    if (issues.length > 0) {
      throw new Error(
        `invalid algebraicPulmonaryArterialRootProfile: ${issues.join("; ")}`,
      );
    }
    if (algebraicProximalArterialRootsProfile !== undefined) {
      throw new Error(
        "algebraic pulmonary root and bilateral algebraic roots are mutually exclusive",
      );
    }
  }
  requirePositive(runtime.losses.systemicResistance, "systemicResistance");
  requirePositive(runtime.losses.pulmonaryResistance, "pulmonaryResistance");
  if (
    runtime.losses.useChiResistance !== undefined
    && typeof runtime.losses.useChiResistance !== "boolean"
  ) {
    throw new Error("useChiResistance must be boolean when provided");
  }
  requireFinite(runtime.respiratory.PEEP, "PEEP");
  requireFinite(runtime.respiratory.Pth0, "Pth0");
  requireFinite(runtime.respiratory.respAmpTh, "respAmpTh");
  requireFinite(runtime.respiratory.respAmpAlv, "respAmpAlv");
  requireNonnegative(runtime.respiratory.respRate, "respRate");
  const valveIssues = validateMainWireFourValveDiseaseResearchInputV1(
    runtime.valveResearchInput,
  );
  if (valveIssues.length > 0) {
    throw new Error(`invalid valveResearchInput: ${valveIssues.join("; ")}`);
  }
}

function validateMechanicalSupportInput(
  input: NonCoronaryMechanicalSupportInputV1 | undefined,
): void {
  if (input === undefined) return;
  requirePositive(input.heartRateBpm, "mechanicalSupport.heartRateBpm");
  validateMechanicalSupportConfigV1(input.config);
}

function validateDynamicMechanicalSupportInput(
  input: NonCoronaryDynamicMechanicalSupportInputV1 | undefined,
): void {
  if (input === undefined) return;
  requirePositive(
    input.heartRateBpm,
    "dynamicMechanicalSupport.heartRateBpm",
  );
  validateMechanicalSupportConfigV1(input.config);
  validateDynamicMechanicalSupportInertanceProfileV1(input.profile);
  validateDynamicMechanicalSupportAcceptedStateV1(
    input.previousAcceptedState,
    input.profile,
    input.config,
  );
}

function mechanicalSupportTiming(
  timeSec: number,
  heartRateBpm: number,
): Readonly<{
  timeSec: number;
  cyclePhase01: number;
  beatIndex: number;
  heartRateBpm: number;
}> {
  const beatPosition = requireFinite(
    timeSec * requirePositive(heartRateBpm, "mechanical-support heart rate") / 60,
    "mechanical-support beat position",
  );
  const beatIndex = Math.floor(beatPosition);
  return Object.freeze({
    timeSec,
    cyclePhase01: beatPosition - beatIndex,
    beatIndex,
    heartRateBpm,
  });
}

function mechanicalSupportNodeRateMlPerSec(
  evaluation:
    | MechanicalSupportHydraulicEvaluationV1
    | DynamicMechanicalSupportHydraulicEvaluationV1
    | null,
  node: NonCoronaryNodeNameV1,
): number {
  if (evaluation === null) return 0;
  switch (node) {
    case "LV":
    case "Ao":
    case "SA":
    case "RA":
    case "VC":
      return evaluation.nodeNetVolumeRateMlPerSec[node];
    default:
      return 0;
  }
}

function validateChamberPressures(
  pressures: NonCoronaryChamberPressuresMmHgV1,
): void {
  if (pressures === null || typeof pressures !== "object") {
    throw new Error("mechanics callback must return chamber pressures");
  }
  for (const name of ["LV", "LA", "RV", "RA"] as const) {
    requireFinite(pressures[name], `${name} chamber pressure`);
  }
}

function copyAndValidateAbsoluteChamberPressureTangent(
  tangent: NonCoronaryAbsoluteChamberPressureTangentV1,
): NonCoronaryAbsoluteChamberPressureTangentV1 {
  if (tangent === null || typeof tangent !== "object") {
    throw new Error("absolutePressureTangent must be an object when provided");
  }
  for (const [label, order] of [
    ["rowPressureOrder", tangent.rowPressureOrder],
    ["columnVolumeOrder", tangent.columnVolumeOrder],
  ] as const) {
    if (
      !Array.isArray(order)
      || order.length !== NON_CORONARY_CHAMBER_TANGENT_ORDER_V1.length
      || order.some(
        (name, index) =>
          name !== NON_CORONARY_CHAMBER_TANGENT_ORDER_V1[index],
      )
    ) {
      throw new Error(
        `absolutePressureTangent.${label} must be LV,LA,RV,RA`,
      );
    }
  }
  if (
    tangent.units !== "mmHg/mL"
    || tangent.pressureKind !== "absolute"
    || tangent.derivativeSemantics
      !== "candidate-algorithmic-at-fixed-accepted-state-time-dt-and-drive"
  ) {
    throw new Error("absolutePressureTangent metadata is incompatible");
  }
  const matrix = tangent.dPressureDVolumeMmHgPerMl;
  if (
    !Array.isArray(matrix)
    || matrix.length !== 4
    || matrix.some((row) =>
      !Array.isArray(row)
      || row.length !== 4
      || row.some((value) => !Number.isFinite(value)))
  ) {
    throw new Error(
      "absolutePressureTangent matrix must be finite 4x4 mmHg/mL",
    );
  }
  const copy = matrix.map((row) => Object.freeze([...row])) as unknown as
    NonCoronaryChamberPressureTangentMatrixV1;
  return Object.freeze({
    rowPressureOrder: NON_CORONARY_CHAMBER_TANGENT_ORDER_V1,
    columnVolumeOrder: NON_CORONARY_CHAMBER_TANGENT_ORDER_V1,
    units: "mmHg/mL" as const,
    pressureKind: "absolute" as const,
    derivativeSemantics:
      "candidate-algorithmic-at-fixed-accepted-state-time-dt-and-drive" as const,
    dPressureDVolumeMmHgPerMl: copy,
  });
}

function evaluateCandidateMechanicsCached<TEvaluation>(
  cache: CandidateMechanicsCache<TEvaluation>,
  callback: NonCoronaryCandidateMechanicsCallbackV1<TEvaluation>,
  volumes: NonCoronaryChamberVolumesMlV1,
  candidateTimeSec: number,
): NonCoronaryCandidateMechanicsResultV1<TEvaluation> {
  for (let index = cache.values.length - 1; index >= 0; index -= 1) {
    const entry = cache.values[index]!;
    if (
      sameValueZeroV1(entry.candidateTimeSec, candidateTimeSec)
      && sameValueZeroV1(entry.LV, volumes.LV)
      && sameValueZeroV1(entry.LA, volumes.LA)
      && sameValueZeroV1(entry.RV, volumes.RV)
      && sameValueZeroV1(entry.RA, volumes.RA)
    ) {
      cache.hitCount += 1;
      return entry.result;
    }
  }
  cache.callCount += 1;
  const raw = callback(Object.freeze({ ...volumes }), candidateTimeSec);
  validateChamberPressures(raw.absolutePressuresMmHg);
  const absolutePressureTangent = raw.absolutePressureTangent === undefined
    ? undefined
    : copyAndValidateAbsoluteChamberPressureTangent(
      raw.absolutePressureTangent,
    );
  const result = Object.freeze({
    absolutePressuresMmHg: Object.freeze({ ...raw.absolutePressuresMmHg }),
    ...(absolutePressureTangent === undefined
      ? {}
      : { absolutePressureTangent }),
    evaluation: raw.evaluation,
  });
  cache.values.push({
    candidateTimeSec,
    LV: volumes.LV,
    LA: volumes.LA,
    RV: volumes.RV,
    RA: volumes.RA,
    result,
  });
  cache.uniqueCandidateCount += 1;
  return result;
}

function sameValueZeroV1(left: number, right: number): boolean {
  return left === right || (Number.isNaN(left) && Number.isNaN(right));
}

function copyNodeRecord(
  source: NodeRecord<number>,
  label: string,
  validate: (value: number, field: string) => number,
): NodeRecord<number> {
  assertExactKeys(source, NON_CORONARY_NODE_NAMES_V1, label);
  return nodeRecord((name) => validate(source[name], `${label}.${name}`));
}

function copyEdgeRecord(
  source: EdgeRecord<number>,
  label: string,
  validate: (value: number, field: string) => number,
): EdgeRecord<number> {
  assertExactKeys(source, NON_CORONARY_EDGE_NAMES_V1, label);
  return edgeRecord((name) => validate(source[name], `${label}.${name}`));
}

function copyDynamicEdgeRecord(
  source: DynamicEdgeRecord<number>,
  label: string,
  validate: (value: number, field: string) => number,
): DynamicEdgeRecord<number> {
  assertExactKeys(source, NON_CORONARY_DYNAMIC_EDGE_NAMES_V1, label);
  return dynamicEdgeRecord((name) => validate(source[name], `${label}.${name}`));
}

function copyValveStates(
  source: ValveRecord<MainWireQuasiSteadyOrificeValveStateV2>,
): ValveRecord<MainWireQuasiSteadyOrificeValveStateV2> {
  assertExactKeys(source, NON_CORONARY_VALVE_NAMES_V1, "valveStates");
  return valveRecord((name) => {
    const state = source[name];
    if (!Number.isFinite(state.leafletOpeningFraction01)
      || state.leafletOpeningFraction01 < 0
      || state.leafletOpeningFraction01 > 1) {
      throw new Error(`${name}.leafletOpeningFraction01 must lie in [0,1]`);
    }
    return Object.freeze({ ...state });
  });
}

/**
 * Key-set check for a record crossing this module's boundary. It is a defensive
 * precondition on a scoped record whose key set is fixed by the topology, so it
 * belongs to the full-invariant tier; see engine/hotPathIntegrityTierV1.ts. The
 * per-field value validation the copy helpers apply is unaffected and always
 * runs — a missing key still surfaces as a value that fails its own check.
 */
function assertExactKeys<T extends string>(
  value: object,
  names: readonly T[],
  label: string,
): void {
  if (!fullHotPathInvariantsEnabledV1()) return;
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be a record`);
  }
  const actual = Object.keys(value).sort();
  const expected = [...names].sort();
  if (actual.length !== expected.length
    || actual.some((key, index) => key !== expected[index])) {
    throw new Error(`${label} must contain exactly the authoritative scoped keys`);
  }
}

/**
 * Builds a scoped record over a fixed name list.
 *
 * Insertion order is the declaration order of the name list, exactly as the
 * previous `Object.fromEntries(names.map(...))` form produced, so every
 * canonical JSON serialization and every hash over these records is unchanged.
 * Writing the properties directly avoids the pair array and the entry arrays.
 *
 * Freezing is a hot-path defence rather than a computed value: these records are
 * rebuilt from scratch on every candidate and never handed to a provider, so the
 * freeze belongs to the full-invariant tier.
 */
function scopedRecord<TName extends string, T>(
  names: readonly TName[],
  build: (name: TName) => T,
): Record<TName, T> {
  const record = {} as Record<TName, T>;
  for (let index = 0; index < names.length; index += 1) {
    const name = names[index]!;
    record[name] = build(name);
  }
  return fullHotPathInvariantsEnabledV1() ? Object.freeze(record) : record;
}

function nodeRecord<T>(build: (name: NonCoronaryNodeNameV1) => T): NodeRecord<T> {
  return scopedRecord(NON_CORONARY_NODE_NAMES_V1, build) as NodeRecord<T>;
}

function edgeRecord<T>(build: (name: NonCoronaryEdgeNameV1) => T): EdgeRecord<T> {
  return scopedRecord(NON_CORONARY_EDGE_NAMES_V1, build) as EdgeRecord<T>;
}

function dynamicEdgeRecord<T>(
  build: (name: NonCoronaryDynamicEdgeNameV1) => T,
): DynamicEdgeRecord<T> {
  return scopedRecord(
    NON_CORONARY_DYNAMIC_EDGE_NAMES_V1,
    build,
  ) as DynamicEdgeRecord<T>;
}

function valveRecord<T>(
  build: (name: NonCoronaryValveNameV1) => T,
): ValveRecord<T> {
  return scopedRecord(NON_CORONARY_VALVE_NAMES_V1, build) as ValveRecord<T>;
}

function uniqueIndex(values: readonly { readonly name: string }[]): Map<string, number> {
  const result = new Map<string, number>();
  values.forEach((value, index) => {
    if (result.has(value.name)) throw new Error(`duplicate topology name ${value.name}`);
    result.set(value.name, index);
  });
  return result;
}

function sumNodeRecord(values: NodeRecord<number>): number {
  return NON_CORONARY_NODE_NAMES_V1.reduce((sum, name) => sum + values[name], 0);
}

function sumCandidateNodeValuesV1(values: Float64Array): number {
  if (values.length !== NON_CORONARY_NODE_NAMES_V1.length) {
    throw new Error("candidate node-volume vector has wrong length");
  }
  let total = 0;
  for (let index = 0; index < values.length; index += 1) {
    total += values[index]!;
  }
  return total;
}

function isChamberName(
  name: NonCoronaryNodeNameV1,
): name is keyof NonCoronaryChamberVolumesMlV1 {
  return name === "LV" || name === "LA" || name === "RV" || name === "RA";
}

function respiratoryKind(ext: NodeSpec["ext"] | EdgeSpec["ext"]):
"none" | "pth" | "palv" {
  if (ext === undefined || ext === "none") return "none";
  if (ext === "pth" || ext === "palv") return ext;
  throw new Error(`coronary external-pressure kind ${ext} is outside scope`);
}

function respiratoryExternalPressureFromFrameV1(
  kind: "none" | "pth" | "palv",
  pressures: RespiratoryExternalPressuresV1,
): number {
  if (kind === "none") return 0;
  return kind === "pth" ? pressures.pthMmHg : pressures.palvMmHg;
}

function validateProtocolResistanceScaleByEdge(
  scaleByEdge: NonCoronaryProtocolResistanceScaleByEdgeV1 | undefined,
): void {
  if (scaleByEdge === undefined) return;
  for (const [edgeName, scale] of Object.entries(scaleByEdge)) {
    if (!(NON_CORONARY_EDGE_NAMES_V1 as readonly string[]).includes(edgeName)) {
      throw new Error(
        `protocol resistance scale references unknown edge ${edgeName}`,
      );
    }
    if ((NON_CORONARY_VALVE_NAMES_V1 as readonly string[]).includes(edgeName)) {
      throw new Error(
        `protocol resistance scale cannot override valve edge ${edgeName}`,
      );
    }
    requirePositive(scale as number, `${edgeName} protocol resistance scale`);
  }
}

function validateConservativeCompanionAdapter<TEvaluation, TCompanionTrial>(
  input: NonCoronaryCirculationTrialInputV1<TEvaluation, TCompanionTrial>,
): void {
  const adapter = input.conservativeCompanion;
  if (adapter === undefined) return;
  requirePositive(
    adapter.fixedGlobalTotalBloodVolumeMl,
    "companion fixed global total blood volume",
  );
  requireNonnegative(
    adapter.previousAcceptedCompanionBloodVolumeMl,
    "previous accepted companion blood volume",
  );
  if (typeof adapter.evaluateSameCandidate !== "function") {
    throw new Error("companion evaluateSameCandidate must be a function");
  }
  if (!nearlyEqual(
    input.previousAcceptedState.totalBloodVolumeMl
      + adapter.previousAcceptedCompanionBloodVolumeMl,
    adapter.fixedGlobalTotalBloodVolumeMl,
  )) {
    throw new Error(
      "previous non-coronary partition and companion do not match global TBV",
    );
  }
}

function protocolResistanceScaleForEdge<TEvaluation, TCompanionTrial>(
  input: NonCoronaryCirculationTrialInputV1<TEvaluation, TCompanionTrial>,
  edgeName: NonCoronaryEdgeNameV1,
): number {
  return input.protocolResistanceScaleByEdge?.[edgeName] ?? 1;
}

function selectedAorticOutflowDynamicEdgeActiveV1(
  edgeName: NonCoronaryEdgeNameV1,
  runtime: NonCoronaryCirculationRuntimeParamsV1,
): boolean {
  const selectedProfile = runtime.vascular.selectedAorticOutflowProfile;
  return selectedProfile !== undefined
    && edgeName === selectedProfile.sourceDynamicEdgeId;
}

/**
 * Selected Ao_SA resistance is the residual downstream loss only. The fixed
 * characteristic impedance is already inside the recovered-root AoV port and
 * must never be scaled again by systemic resistance or a protocol multiplier.
 */
function nonCoronaryNonValveEdgeLossV1(
  edge: EdgeSpec,
  edgeName: NonCoronaryEdgeNameV1,
  runtime: NonCoronaryCirculationRuntimeParamsV1,
  upstreamPressureMmHg: number,
  downstreamPressureMmHg: number,
  edgeExternalPressureMmHg: number,
): NonValveEdgeLossV1 {
  const selectedProfile = runtime.vascular.selectedAorticOutflowProfile;
  if (
    selectedProfile === undefined
    || edgeName !== selectedProfile.sourceDynamicEdgeId
  ) {
    return nonValveEdgeLossV1({
      edge,
      params: runtime.losses,
      upstreamPressureMmHg,
      downstreamPressureMmHg,
      edgeExternalPressureMmHg,
    });
  }
  return Object.freeze({
    resistanceMmHgSecPerMl: requirePositive(
      selectedProfile.residualDownstreamResistanceMmHgSecPerMl
        * runtime.losses.systemicResistance,
      `${edgeName} selected residual downstream resistance`,
    ),
    quadraticLossMmHgSec2PerMl2: 0,
    areaRatio: 1,
    collapsibleTubeApplied: false,
  });
}

function nonCoronaryNonValveEdgeLossAndPressureDerivativesV1(
  edge: EdgeSpec,
  edgeName: NonCoronaryEdgeNameV1,
  runtime: NonCoronaryCirculationRuntimeParamsV1,
  upstreamPressureMmHg: number,
  downstreamPressureMmHg: number,
  edgeExternalPressureMmHg: number,
): NonValveEdgeLossAndPressureDerivativesV1 {
  if (!selectedAorticOutflowDynamicEdgeActiveV1(edgeName, runtime)) {
    return nonValveEdgeLossAndPressureDerivativesV1({
      edge,
      params: runtime.losses,
      upstreamPressureMmHg,
      downstreamPressureMmHg,
      edgeExternalPressureMmHg,
    });
  }
  return Object.freeze({
    ...nonCoronaryNonValveEdgeLossV1(
      edge,
      edgeName,
      runtime,
      upstreamPressureMmHg,
      downstreamPressureMmHg,
      edgeExternalPressureMmHg,
    ),
    dAreaRatioDUpstreamPressurePerMmHg: 0,
    dAreaRatioDDownstreamPressurePerMmHg: 0,
    dResistanceDUpstreamPressureSecPerMl: 0,
    dResistanceDDownstreamPressureSecPerMl: 0,
    dQuadraticLossDUpstreamPressureSec2PerMl2: 0,
    dQuadraticLossDDownstreamPressureSec2PerMl2: 0,
    areaRatioBranch: "not-applied" as const,
  });
}

/** Single L authority shared by the primal BE solve and analytic tangent. */
function nonCoronaryDynamicEdgeInertanceV1(
  edge: EdgeSpec,
  edgeName: NonCoronaryDynamicEdgeNameV1,
  runtime: NonCoronaryCirculationRuntimeParamsV1,
  areaRatio: number,
): number {
  if (edgeName === "Ao_SA" && runtime.vascular.aorticRootInertanceResearchScale !== undefined) {
    return (edge.L ?? 0) * runtime.vascular.aorticRootInertanceResearchScale / (
      edge.useChiResistance ? Math.max(areaRatio, 1e-6) : 1
    );
  }
  const algebraicRoots = runtime.vascular
    .algebraicProximalArterialRootsProfile;
  if (
    algebraicRoots !== undefined
    && (
      edgeName === algebraicRoots.aorticRootEdgeId
      || edgeName === algebraicRoots.pulmonaryRootEdgeId
    )
  ) return algebraicRoots.inertanceMmHgSec2PerMl;
  const algebraicPulmonaryRoot = runtime.vascular
    .algebraicPulmonaryArterialRootProfile;
  if (
    algebraicPulmonaryRoot !== undefined
    && edgeName === algebraicPulmonaryRoot.pulmonaryRootEdgeId
  ) return algebraicPulmonaryRoot.inertanceMmHgSec2PerMl;
  const selectedProfile = runtime.vascular.selectedAorticOutflowProfile;
  if (
    selectedProfile !== undefined
    && edgeName === selectedProfile.sourceDynamicEdgeId
  ) return selectedProfile.ascendingAorticInertanceMmHgSec2PerMl;
  return (edge.L ?? 0) / (
    edge.useChiResistance ? Math.max(areaRatio, 1e-6) : 1
  );
}

function applyProtocolResistanceScale<
  T extends Readonly<{ resistanceMmHgSecPerMl: number }>,
>(losses: T, scale: number): T {
  if (scale === 1) return losses;
  return Object.freeze({
    ...losses,
    resistanceMmHgSecPerMl:
      losses.resistanceMmHgSecPerMl * scale,
  }) as T;
}

function applyProtocolResistanceScaleWithDerivatives<
  T extends Readonly<{
    resistanceMmHgSecPerMl: number;
    dResistanceDUpstreamPressureSecPerMl: number;
    dResistanceDDownstreamPressureSecPerMl: number;
  }>,
>(losses: T, scale: number): T {
  if (scale === 1) return losses;
  return Object.freeze({
    ...losses,
    resistanceMmHgSecPerMl:
      losses.resistanceMmHgSecPerMl * scale,
    dResistanceDUpstreamPressureSecPerMl:
      losses.dResistanceDUpstreamPressureSecPerMl * scale,
    dResistanceDDownstreamPressureSecPerMl:
      losses.dResistanceDDownstreamPressureSecPerMl * scale,
  }) as T;
}

function tryEvaluateVector(
  evaluate: (unknowns: readonly number[]) => readonly number[],
  unknowns: readonly number[],
): Readonly<{ value: readonly number[] | null; issue: string }> {
  try {
    const value = evaluate(unknowns);
    return value.every(Number.isFinite)
      ? Object.freeze({ value, issue: "none" })
      : Object.freeze({ value: null, issue: "non-finite-residual" });
  } catch (error) {
    return Object.freeze({ value: null, issue: errorMessage(error) });
  }
}

function infinityNorm(values: ArrayLike<number>): number {
  let maximum = 0;
  for (let index = 0; index < values.length; index += 1) {
    maximum = Math.max(maximum, Math.abs(values[index]!));
  }
  return maximum;
}

function nearlyEqual(left: number, right: number): boolean {
  return Math.abs(left - right) <= 1e-10 * Math.max(1, Math.abs(left), Math.abs(right));
}

function fingerprintCirculationStateV1(
  state: NonCoronaryCirculationAcceptedStateV1,
): string {
  const text = canonicalCheckpointString(state);
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

function canonicalCheckpointString(value: unknown): string {
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("checkpoint contains non-finite number");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalCheckpointString).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const record = value as Readonly<Record<string, unknown>>;
    return `{${Object.keys(record).sort().map((key) =>
      `${JSON.stringify(key)}:${canonicalCheckpointString(record[key])}`
    ).join(",")}}`;
  }
  throw new Error("checkpoint contains unsupported value");
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function requireFinite(value: number, label: string): number {
  if (!Number.isFinite(value)) throw new Error(`${label} must be finite`);
  return value;
}

function requirePositive(value: number, label: string): number {
  if (!Number.isFinite(value) || !(value > 0)) {
    throw new Error(`${label} must be positive and finite`);
  }
  return value;
}

function requireNonnegative(value: number, label: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be nonnegative and finite`);
  }
  return value;
}

function requireInteger(value: number, label: string): number {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a nonnegative integer`);
  }
  return value;
}

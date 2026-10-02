import {
  advanceExactEventCalciumV1,
  evaluateExactEventCalciumV1,
  propagateExactEventCalciumV1,
  type ExactEventCalciumParametersV1,
  type ExactEventCalciumStateV1,
} from "@/engine/myocardium/calcium/exactEventPrescribedCalciumV1";
import {
  createAcceptedAuthoredEctopyScheduleConfigurationV2,
  evaluateAcceptedAuthoredEctopyScheduleTrialV2,
  initializeAcceptedAuthoredEctopyScheduleStateV2,
  validateAcceptedAuthoredEctopyScheduleConfigurationV2,
  validateAcceptedAuthoredEctopyScheduleStateV2,
  type AcceptedAuthoredEctopyScheduleConfigurationV2,
  type AcceptedAuthoredEctopyScheduleStateV2,
  type AcceptedAuthoredEctopyScheduleTrialV2,
  type AuthoredPacSourceImpulseMetadataV2,
} from "@/engine/myocardium/rhythm/acceptedAuthoredEctopyScheduleV2";
import {
  commitAcceptedAuthoredVentricularPacingReplaySourceTrialV1,
  createAcceptedAuthoredVentricularPacingReplaySourceConfigurationV1,
  evaluateAcceptedAuthoredVentricularPacingReplaySourceTrialV1,
  initializeAcceptedAuthoredVentricularPacingReplaySourceStateV1,
  rollbackAcceptedAuthoredVentricularPacingReplaySourceTrialV1,
  validateAcceptedAuthoredVentricularPacingReplaySourceConfigurationV1,
  validateAcceptedAuthoredVentricularPacingReplaySourceStateV1,
  type AcceptedAuthoredVentricularPacingReplaySourceConfigurationV1,
  type AcceptedAuthoredVentricularPacingReplaySourceStateV1,
  type AcceptedAuthoredVentricularPacingReplaySourceTrialV1,
} from "@/engine/myocardium/rhythm/acceptedAuthoredVentricularPacingReplaySourceV1";
import {
  createDistalConductionGateConfigurationV1,
  evaluateDistalConductionGateCandidateDecisionV1,
  initializeAcceptedDistalConductionGateStateV1,
  validateAcceptedDistalConductionGateStateV1,
  validateDistalConductionGateConfigurationV1,
  type AcceptedDistalConductionGateStateV1,
  type DistalConductionGateCandidateDecisionV1,
  type DistalConductionGateConfigurationV1,
} from "@/engine/myocardium/rhythm/acceptedDistalConductionGateV1";
import {
  createAcceptedElectricalCaptureOwnerConfigurationV2,
  commitAcceptedElectricalCaptureBatchCandidateV2,
  evaluateAcceptedElectricalCaptureBatchCandidateV2,
  initializeAcceptedElectricalCaptureOwnerStateV2,
  validateAcceptedElectricalCaptureOwnerStateV2,
  validateSourceImpulseV2,
  type AcceptedElectricalCaptureBatchCandidateV2,
  type AcceptedElectricalCaptureOwnerConfigurationV2,
  type AcceptedElectricalCaptureOwnerStateV2,
  type CapturedElectricalActivationV2,
  type PriorCapturedElectricalActivationV2,
  type SourceImpulseV2,
} from "@/engine/myocardium/rhythm/acceptedElectricalCaptureOwnerV2";
import {
  evaluateAcceptedRegularAtrialSourceCandidateV1,
  initializeAcceptedRegularAtrialSourceStateV1,
  validateAcceptedRegularAtrialSourceStateV1,
  validateRegularAtrialSourceConfigurationV1,
  type AcceptedRegularAtrialSourceCandidateV1,
  type AcceptedRegularAtrialSourceStateV1,
  type RegularAtrialSourceConfigurationV1,
} from "@/engine/myocardium/rhythm/acceptedRegularAtrialSourceOwnerV1";
import {
  createRecoveryConcealmentAvGateParametersV1,
  validateRecoveryConcealmentAvGateParametersV1,
  type RecoveryConcealmentAvGateParametersV1,
} from "@/engine/myocardium/rhythm/recoveryConcealmentAvGateV1";
import {
  createRecoveryConcealmentAvGateConfigurationV2,
  evaluateRecoveryConcealmentAvGateCandidateDecisionV2,
  initializeRecoveryConcealmentAvGateStateV2,
  validateRecoveryConcealmentAvGateConfigurationV2,
  validateRecoveryConcealmentAvGateStateV2,
  type RecoveryConcealmentAvGateAcceptedStateV2,
  type RecoveryConcealmentAvGateCandidateDecisionV2,
  type RecoveryConcealmentAvGateConfigurationV2,
} from "@/engine/myocardium/rhythm/recoveryConcealmentAvGateV2";
import {
  createAcceptedVentricularBackupSourceConfigurationV2,
  createVentricularBackupSourceResolutionV2,
  evaluateAcceptedVentricularBackupSourceCandidateV2,
  evaluateVentricularBackupSourceProposalV2,
  initializeAcceptedVentricularBackupSourceStateV2,
  validateAcceptedVentricularBackupSourceConfigurationV2,
  validateAcceptedVentricularBackupSourceStateV2,
  type AcceptedVentricularBackupSourceCandidateV2,
  type AcceptedVentricularBackupSourceConfigurationV2,
  type AcceptedVentricularBackupSourceStateV2,
  type VentricularBackupSourceProposalV2,
  type VentricularBackupSourceResolutionV2,
} from "@/engine/myocardium/rhythm/acceptedVentricularBackupSourceOwnerV2";
import {
  createAcceptedVentricularIntervalStrengthConfigurationV1,
  evaluateAcceptedVentricularIntervalStrengthCandidateV1,
  initializeAcceptedVentricularIntervalStrengthStateV1,
  rebindAcceptedVentricularIntervalStrengthReferenceV1,
  validateAcceptedVentricularIntervalStrengthConfigurationV1,
  validateAcceptedVentricularIntervalStrengthStateV1,
  type AcceptedVentricularIntervalStrengthCandidateV1,
  type AcceptedVentricularIntervalStrengthConfigurationV1,
  type AcceptedVentricularIntervalStrengthStateV1,
} from "@/engine/myocardium/rhythm/acceptedVentricularIntervalStrengthOwnerV1";
import {
  fullHotPathInvariantsEnabledV1,
} from "@/engine/hotPathIntegrityTierV1";
import { canonicalJsonStringify } from "@/engine/integrity";
import {
  validationStampIssuanceEligibleV1,
  validationStampReuseEligibleV1,
} from "@/engine/validationStampModeV1";

/**
 * Atomic standalone composition of accepted electrical sources, capture,
 * proximal and distal conduction, ventricular backup, interval strength, and
 * five exact prescribed-calcium states. It is intentionally not main-wired.
 */

export const ACCEPTED_COMPOSED_RHYTHM_TRANSACTION_CONFIGURATION_V2_ID =
  "accepted-composed-rhythm-transaction-configuration-v2" as const;
export const ACCEPTED_COMPOSED_RHYTHM_TRANSACTION_STATE_V2_ID =
  "accepted-composed-rhythm-transaction-state-v2" as const;
export const ACCEPTED_COMPOSED_RHYTHM_TRANSACTION_CANDIDATE_V2_ID =
  "accepted-composed-rhythm-transaction-candidate-v2" as const;
export const COMPOSED_RHYTHM_PENDING_PROXIMAL_AV_OUTPUT_V2_ID =
  "composed-rhythm-pending-proximal-av-output-v2" as const;
export const COMPOSED_PROXIMAL_AV_OUTPUT_DECISION_V2_ID =
  "composed-proximal-av-output-decision-v2" as const;
export const COMPOSED_RHYTHM_PENDING_CALCIUM_DEPOSIT_V2_ID =
  "composed-rhythm-pending-calcium-deposit-v2" as const;

export const ACCEPTED_COMPOSED_RHYTHM_TRANSACTION_CLAIM_V2 = deepFreeze({
  scope: "standalone-atomic-rhythm-to-five-wall-exact-calcium-composition" as const,
  liveHemodynamicOrFrontendWiringClaimed: false as const,
  boundaryEndpointContract:
    "absolute-candidate-time-only-never-derived-duration-readdition" as const,
  boundaryOrder: Object.freeze([
    "earliest-owned-event-clipping",
    "due-proximal-output-through-distal-gate",
    "complete-non-VVI-source-batch-from-one-capture-base",
    "conditional-VVI-only-without-preview-ventricular-capture",
    "one-final-capture-state-commit",
    "accepted-atrial-capture-through-AV-gate",
    "accepted-ventricular-capture-through-backup-and-interval-strength",
    "future-positive-delay-exact-calcium-deposits",
  ] as const),
  pacClockMutation:
    "captured-authored-PAC-metadata-only-and-only-for-regular-sinus-clock" as const,
  pvcClockMutationClaimed: false as const,
  acceptedVentricularCaptureOnlyResetsBackup: true as const,
  acceptedVentricularCaptureOnlyUpdatesIntervalStrength: true as const,
  proximalAvGateV2Ownership: Object.freeze({
    acceptedOwner: "RecoveryConcealmentAvGateV2" as const,
    directAcceptedStateOwned: true as const,
    outputSemantics:
      "proximal-av-output-before-distal-gate-not-ventricular-activation" as const,
    acceptedClock:
      "accepted-atrial-activation-time-not-future-proximal-output" as const,
    refractoryReference: "proximal-av-output-clock" as const,
    distalTiming: "ventricular-source-time-equals-proximal-exit-plus-HV-once" as const,
    jorgensenEndToEndVentricularTimingReproductionClaimed: false as const,
    wholeAvHisPurkinjePhysiologyClaimed: false as const,
  }),
  calcium: Object.freeze({
    exactBetweenEvents: true as const,
    depositsAdditive: true as const,
    ventricularDepositDelay: "explicit-strictly-positive" as const,
    periodicSinusVentricularDepositClock: Object.freeze({
      scope:
        "regular-sinus-av-output-without-authored-ectopy-pacing-or-pac" as const,
      boundary:
        "initial-accepted-time-plus-safe-ordinal-times-cycle" as const,
      canonicalization:
        "raw-deposit-within-64-eps-of-boundary-uses-that-exact-clock" as const,
    }),
    strength: "interval-owner-relative-strength-times-explicit-wall-strength" as const,
    coherentAtrialClasses: Object.freeze(["sinus", "captured-PAC"] as const),
    coherentFlutterCalciumClaimed: false as const,
    coherentAfCalciumClaimed: false as const,
  }),
  externalAfSourceSeam: Object.freeze({
    sourceOwnerStateOwnedByTransaction: false as const,
    acceptedInput:
      "explicit-external-owner-batch-of-atrial-primary-intrinsic-source-impulses" as const,
    eventClippingOwner:
      "caller-must-combine-external-owner-next-boundary-with-transaction-candidate-endpoint-limit" as const,
    coordinatedAtrialCalcium: "forbidden" as const,
  }),
  authoredVentricularPacingReplay: Object.freeze({
    optionalOwnedSource: true as const,
    sourceImpulseSchema: "source-impulse-v2" as const,
    emittedSourceKind: "pacing" as const,
    emittedChamber: "ventricular" as const,
    entersCompleteNonVviCaptureBatch: true as const,
    pvcLabelClaimed: false as const,
    captureAndRefractoryOwner:
      "accepted-electrical-capture-owner-v2" as const,
    conditionalVviPriorityOwner:
      "accepted-ventricular-backup-source-owner-v2" as const,
    acceptedVentricularCaptureFeedsExistingBackupAndIntervalOwners:
      true as const,
    captureClaimed: false as const,
    pacemakerPhysiologyClaimed: false as const,
    pacingSiteOrPropagationClaimed: false as const,
    qrsOrEcgClaimed: false as const,
    clark1997ReproductionClaimed: false as const,
    hemodynamicValidationClaimed: false as const,
  }),
  checkpointScopeExcludesExternalAfOwnerState: true as const,
  parameterDefaultsProvided: false as const,
  acceptedStateImmutable: true as const,
  candidateEvaluationPure: true as const,
  commitValidation: Object.freeze({
    fullInvariantOrUnstampedBoundary:
      "exact-deterministic-recomputation" as const,
    hotPathLeanSameTickInternal:
      "exact-candidate-and-base-object-identity-stamp" as const,
  }),
  rollbackReturnsAcceptedIdentity: true as const,
  clinicalValidityClaimed: false as const,
});

export const COMPOSED_RHYTHM_WALL_IDS_V2 = Object.freeze([
  "LA", "RA", "LVFW", "SEP", "RVFW",
] as const);
export type ComposedRhythmWallIdV2 = (typeof COMPOSED_RHYTHM_WALL_IDS_V2)[number];

export type ComposedRhythmCalciumParametersByWallV2 = Readonly<
  Record<ComposedRhythmWallIdV2, ExactEventCalciumParametersV1>
>;
export type ComposedRhythmCalciumStateByWallV2 = Readonly<
  Record<ComposedRhythmWallIdV2, ExactEventCalciumStateV1>
>;
export type ComposedRhythmCalciumStrengthByWallV2 = Readonly<
  Record<ComposedRhythmWallIdV2, number>
>;

export type ComposedRhythmAtrialDepositConfigurationV2 = Readonly<{
  electricalToCalciumDelaySec: number;
  leftAtrialStrength: number;
  rightAtrialStrength: number;
}>;
export type ComposedRhythmVentricularDepositConfigurationV2 = Readonly<{
  electricalToCalciumDelaySec: number;
  lvFreeWallBaseStrength: number;
  septalBaseStrength: number;
  rvFreeWallBaseStrength: number;
}>;

export type ComposedRhythmAtrialSourceConfigurationV2 =
  | Readonly<{
    mode: "regular";
    regularSourceConfiguration: RegularAtrialSourceConfigurationV1;
    externalAfOwnerInstanceId: null;
  }>
  | Readonly<{
    mode: "external-af";
    regularSourceConfiguration: null;
    externalAfOwnerInstanceId: string;
  }>;

export type AcceptedComposedRhythmTransactionConfigurationInputV2 = Readonly<{
  configurationId: string;
  ownerInstanceId: string;
  atrialSource: ComposedRhythmAtrialSourceConfigurationV2;
  authoredEctopySchedule: AcceptedAuthoredEctopyScheduleConfigurationV2;
  authoredVentricularPacingReplay:
    AcceptedAuthoredVentricularPacingReplaySourceConfigurationV1 | null;
  electricalCaptureOwner: AcceptedElectricalCaptureOwnerConfigurationV2;
  avGateParameters: RecoveryConcealmentAvGateParametersV1;
  avGateInstanceId: string;
  distalGate: DistalConductionGateConfigurationV1;
  ventricularBackup: AcceptedVentricularBackupSourceConfigurationV2;
  ventricularIntervalStrength: AcceptedVentricularIntervalStrengthConfigurationV1;
  calciumParametersByWall: ComposedRhythmCalciumParametersByWallV2;
  sinusAtrialCalciumDeposit: ComposedRhythmAtrialDepositConfigurationV2 | null;
  pacAtrialCalciumDeposit: ComposedRhythmAtrialDepositConfigurationV2 | null;
  ventricularCalciumDeposit: ComposedRhythmVentricularDepositConfigurationV2;
}>;

export type AcceptedComposedRhythmTransactionConfigurationV2 =
  AcceptedComposedRhythmTransactionConfigurationInputV2 & Readonly<{
    configurationSchemaId:
      typeof ACCEPTED_COMPOSED_RHYTHM_TRANSACTION_CONFIGURATION_V2_ID;
    schemaVersion: 2;
  }>;

export type AcceptedComposedRhythmTransactionInitialStateInputV2 = Readonly<{
  acceptedTimeSec: number;
  regularFirstFutureActivationTimeSec: number | null;
  regularFirstSourceSequence: number | null;
  priorAcceptedAtrialCapture: PriorCapturedElectricalActivationV2 | null;
  priorAcceptedVentricularActivation: CapturedElectricalActivationV2;
  initialNormalizedSrLoadState: number;
  calciumStateByWall: ComposedRhythmCalciumStateByWallV2;
}>;

export type ComposedRhythmExternalAtrialSourceBatchV2 =
  | Readonly<{
    sourceClass: "none";
    ownerInstanceId: null;
    candidateTimeSec: number;
    sourceImpulses: readonly SourceImpulseV2[];
    coordinatedAtrialCalcium: "forbidden";
  }>
  | Readonly<{
    sourceClass: "atrial-fibrillation";
    ownerInstanceId: string;
    candidateTimeSec: number;
    sourceImpulses: readonly SourceImpulseV2[];
    coordinatedAtrialCalcium: "forbidden";
  }>;

export type ComposedRhythmPendingProximalAvOutputV2 = Readonly<{
  pendingSchemaId: typeof COMPOSED_RHYTHM_PENDING_PROXIMAL_AV_OUTPUT_V2_ID;
  proximalAvOutputId: string;
  parentCapturedAtrialActivationId: string;
  proximalArrivalTimeSec: number;
}>;

/** Direct accepted owner state; no V1 state or semantic-name adapter is stored. */
export type ComposedProximalAvGateStateV2 =
  RecoveryConcealmentAvGateAcceptedStateV2;

export type ComposedProximalAvOutputDecisionV2 = Readonly<{
  decisionSchemaId: typeof COMPOSED_PROXIMAL_AV_OUTPUT_DECISION_V2_ID;
  schemaVersion: 2;
  gateInstanceId: string;
  parameterSetId: string;
  parentCapturedAtrialActivationId: string;
  activationOrdinal: number;
  baseRevision: number;
  candidateRevision: number;
  atrialActivationTimeSec: number;
  refractoryUntilProximalOwnerBeforeSec: number;
  outcome: "conducted" | "blocked";
  conducted: boolean;
  recoveryBeyondRefractorySec: number | null;
  conductionDelaySec: number | null;
  proximalAvOutputTimeSec: number | null;
  refractoryUntilProximalOwnerAfterSec: number;
  candidateState: ComposedProximalAvGateStateV2;
}>;

export type ComposedRhythmCalciumDepositClassV2 =
  | "sinus-atrial"
  | "pac-atrial"
  | "ventricular";

export type ComposedRhythmPendingCalciumDepositV2 = Readonly<{
  pendingSchemaId: typeof COMPOSED_RHYTHM_PENDING_CALCIUM_DEPOSIT_V2_ID;
  depositId: string;
  depositClass: ComposedRhythmCalciumDepositClassV2;
  parentCapturedActivationId: string;
  depositTimeSec: number;
  strengthByWall: ComposedRhythmCalciumStrengthByWallV2;
}>;

export type AcceptedComposedRhythmTransactionStateV2 = Readonly<{
  stateSchemaId: typeof ACCEPTED_COMPOSED_RHYTHM_TRANSACTION_STATE_V2_ID;
  schemaVersion: 2;
  configuration: AcceptedComposedRhythmTransactionConfigurationV2;
  initialAcceptedTimeSec: number;
  revision: number;
  acceptedTimeSec: number;
  regularAtrialSourceState: AcceptedRegularAtrialSourceStateV1 | null;
  authoredEctopyState: AcceptedAuthoredEctopyScheduleStateV2;
  authoredVentricularPacingReplayState:
    AcceptedAuthoredVentricularPacingReplaySourceStateV1 | null;
  electricalCaptureState: AcceptedElectricalCaptureOwnerStateV2;
  proximalAvGateState: ComposedProximalAvGateStateV2;
  distalGateState: AcceptedDistalConductionGateStateV1;
  ventricularBackupState: AcceptedVentricularBackupSourceStateV2;
  ventricularIntervalStrengthState: AcceptedVentricularIntervalStrengthStateV1;
  pendingProximalAvOutputs: readonly ComposedRhythmPendingProximalAvOutputV2[];
  pendingDistalVentricularImpulses: readonly SourceImpulseV2[];
  pendingCalciumDeposits: readonly ComposedRhythmPendingCalciumDepositV2[];
  calciumStateByWall: ComposedRhythmCalciumStateByWallV2;
  acceptedAtrialCaptureCount: number;
  acceptedVentricularCaptureCount: number;
  deliveredCalciumDepositCount: number;
}>;

export type AcceptedComposedRhythmTransactionCandidateInputV2 = Readonly<{
  candidateTimeSec: number;
  externalAtrialSourceBatch: ComposedRhythmExternalAtrialSourceBatchV2;
}>;

export type AcceptedComposedRhythmTransactionCandidateV2 = Readonly<{
  candidateSchemaId: typeof ACCEPTED_COMPOSED_RHYTHM_TRANSACTION_CANDIDATE_V2_ID;
  schemaVersion: 2;
  configurationId: string;
  ownerInstanceId: string;
  baseRevision: number;
  candidateRevision: number;
  startTimeSec: number;
  candidateTimeSec: number;
  externalAtrialSourceBatch: ComposedRhythmExternalAtrialSourceBatchV2;
  regularAtrialSourceCandidate: AcceptedRegularAtrialSourceCandidateV1 | null;
  authoredEctopyTrial: AcceptedAuthoredEctopyScheduleTrialV2;
  authoredVentricularPacingReplayTrial:
    AcceptedAuthoredVentricularPacingReplaySourceTrialV1 | null;
  dueProximalAvOutputs: readonly ComposedRhythmPendingProximalAvOutputV2[];
  distalGateDecisions: readonly DistalConductionGateCandidateDecisionV1[];
  ventricularBackupProposal: VentricularBackupSourceProposalV2;
  nonVviSourceImpulses: readonly SourceImpulseV2[];
  nonVviCapturePreview: AcceptedElectricalCaptureBatchCandidateV2;
  conditionalVviAttempted: boolean;
  acceptedCaptureCandidate: AcceptedElectricalCaptureBatchCandidateV2;
  capturedAtrialActivation: CapturedElectricalActivationV2 | null;
  capturedVentricularActivation: CapturedElectricalActivationV2 | null;
  pacSinusClockPolicyApplied: "reset" | "preserve" | null;
  proximalAvOutputDecision: ComposedProximalAvOutputDecisionV2 | null;
  ventricularBackupResolution: VentricularBackupSourceResolutionV2;
  ventricularBackupCandidate: AcceptedVentricularBackupSourceCandidateV2;
  ventricularIntervalStrengthCandidate: AcceptedVentricularIntervalStrengthCandidateV1 | null;
  deliveredCalciumDeposits: readonly ComposedRhythmPendingCalciumDepositV2[];
  scheduledCalciumDeposits: readonly ComposedRhythmPendingCalciumDepositV2[];
  candidateState: AcceptedComposedRhythmTransactionStateV2;
}>;

export type AcceptedComposedRhythmTransactionCandidateTimeLimitV2 = Readonly<{
  requestedCandidateTimeSec: number;
  candidateTimeSec: number;
  boundaryTimeSec: number | null;
  boundaryOwners: readonly string[];
}>;

/**
 * Entries are issued only for exact, transitively frozen plain-data state
 * objects this module constructed from validated owner candidates and direct
 * field derivations. A restored, copied, or hand-built state misses and is
 * fully validated. No assertion about an arbitrary frozen object is made, and
 * this proof is independent of the hot-path tier.
 */
const internallyValidatedAcceptedComposedRhythmStatesV2 =
  new WeakSet<object>();

/**
 * Exact configurations minted by this module, or subsequently proved once by
 * the complete exported validator. Only transitively frozen plain-data graphs
 * enter this persistent proof cache, so an identity hit cannot hide a later
 * mutation. This is not a mutable accepted-material cache: typed arrays and
 * every other non-plain-data prototype are ineligible.
 */
const internallyValidatedAcceptedComposedRhythmConfigurationsV2 =
  new WeakSet<object>();

/**
 * Entries map one internally constructed, recursively frozen candidate object
 * to the exact internally validated base-state object used to produce it.
 * Either identity changing makes the lookup miss.
 */
const internalCandidateBaseByCandidateV2 = new WeakMap<
  object,
  AcceptedComposedRhythmTransactionStateV2
>();

export function createNoExternalAtrialSourceBatchV2(
  candidateTimeSec: number,
): ComposedRhythmExternalAtrialSourceBatchV2 {
  return Object.freeze({
    sourceClass: "none" as const,
    ownerInstanceId: null,
    candidateTimeSec: requireNonnegativeFinite(candidateTimeSec, "external batch candidateTimeSec"),
    sourceImpulses: Object.freeze([]),
    coordinatedAtrialCalcium: "forbidden" as const,
  });
}

export function createAcceptedComposedRhythmTransactionConfigurationV2(
  input: AcceptedComposedRhythmTransactionConfigurationInputV2,
): AcceptedComposedRhythmTransactionConfigurationV2 {
  requireExactKeys(requirePlainRecord(input, "composed rhythm configuration input"), [
    "configurationId", "ownerInstanceId", "atrialSource", "authoredEctopySchedule",
    "authoredVentricularPacingReplay",
    "electricalCaptureOwner", "avGateParameters", "avGateInstanceId", "distalGate",
    "ventricularBackup", "ventricularIntervalStrength", "calciumParametersByWall",
    "sinusAtrialCalciumDeposit", "pacAtrialCalciumDeposit", "ventricularCalciumDeposit",
  ], "composed rhythm configuration input");

  const atrialSource = copyAtrialSourceConfiguration(input.atrialSource);
  const authoredEctopySchedule = copyEctopyConfiguration(input.authoredEctopySchedule);
  const authoredVentricularPacingReplay =
    copyAuthoredVentricularPacingReplayConfiguration(
      input.authoredVentricularPacingReplay,
    );
  const electricalCaptureOwner = createAcceptedElectricalCaptureOwnerConfigurationV2({
    configurationId: input.electricalCaptureOwner.configurationId,
    ownerInstanceId: input.electricalCaptureOwner.ownerInstanceId,
    atrialGate: {
      gateInstanceId: input.electricalCaptureOwner.atrialGate.gateInstanceId,
      refractoryPeriodSec: input.electricalCaptureOwner.atrialGate.refractoryPeriodSec,
    },
    ventricularGate: {
      gateInstanceId: input.electricalCaptureOwner.ventricularGate.gateInstanceId,
      refractoryPeriodSec: input.electricalCaptureOwner.ventricularGate.refractoryPeriodSec,
    },
  });
  const avGateParameters = createRecoveryConcealmentAvGateParametersV1({
    parameterSetId: input.avGateParameters.parameterSetId,
    parameterProvenance: {
      kind: input.avGateParameters.parameterProvenance.kind,
      sourceId: input.avGateParameters.parameterProvenance.sourceId,
    },
    minimumConductionDelaySec: input.avGateParameters.minimumConductionDelaySec,
    recoveryDelayAmplitudeSec: input.avGateParameters.recoveryDelayAmplitudeSec,
    recoveryTimeConstantSec: input.avGateParameters.recoveryTimeConstantSec,
    postConductionRefractorySec: input.avGateParameters.postConductionRefractorySec,
    concealedRefractoryExtensionSec: input.avGateParameters.concealedRefractoryExtensionSec,
  });
  const distalGate = createDistalConductionGateConfigurationV1({
    configurationId: input.distalGate.configurationId,
    gateInstanceId: input.distalGate.gateInstanceId,
    parameterProvenance: {
      kind: input.distalGate.parameterProvenance.kind,
      sourceId: input.distalGate.parameterProvenance.sourceId,
    },
    hvConductionDelaySec: input.distalGate.hvConductionDelaySec,
    distalEffectiveRefractoryPeriodSec: input.distalGate.distalEffectiveRefractoryPeriodSec,
    modeConfiguration: detachedFrozenCopy(input.distalGate.modeConfiguration),
  });
  const ventricularBackup = createAcceptedVentricularBackupSourceConfigurationV2({
    configurationId: input.ventricularBackup.configurationId,
    ownerInstanceId: input.ventricularBackup.ownerInstanceId,
    parameterProvenance: {
      kind: input.ventricularBackup.parameterProvenance.kind,
      sourceId: input.ventricularBackup.parameterProvenance.sourceId,
    },
    intrinsicEscapeSourceId: input.ventricularBackup.intrinsicEscapeSourceId,
    intrinsicEscapeCycleLengthSec: input.ventricularBackup.intrinsicEscapeCycleLengthSec,
    vviPacingSourceId: input.ventricularBackup.vviPacingSourceId,
    vviLowerRateLimitPerMin: input.ventricularBackup.vviLowerRateLimitPerMin,
  });
  const ventricularIntervalStrength = createAcceptedVentricularIntervalStrengthConfigurationV1({
    configurationId: input.ventricularIntervalStrength.configurationId,
    ownerInstanceId: input.ventricularIntervalStrength.ownerInstanceId,
    parameterProvenance: {
      kind: input.ventricularIntervalStrength.parameterProvenance.kind,
      sourceId: input.ventricularIntervalStrength.parameterProvenance.sourceId,
    },
    recoveryTimeConstantSec: input.ventricularIntervalStrength.recoveryTimeConstantSec,
    releaseFractionBeta: input.ventricularIntervalStrength.releaseFractionBeta,
    releasedLoadReturnFractionR: input.ventricularIntervalStrength.releasedLoadReturnFractionR,
    intervalInfluxInhibitionFractionH: input.ventricularIntervalStrength.intervalInfluxInhibitionFractionH,
    referenceCycleLengthSec: input.ventricularIntervalStrength.referenceCycleLengthSec,
  });
  const calciumParametersByWall = copyCalciumParameters(input.calciumParametersByWall);
  const sinusAtrialCalciumDeposit = copyAtrialDeposit(input.sinusAtrialCalciumDeposit, "sinusAtrialCalciumDeposit");
  const pacAtrialCalciumDeposit = copyAtrialDeposit(input.pacAtrialCalciumDeposit, "pacAtrialCalciumDeposit");
  const ventricularCalciumDeposit = copyVentricularDeposit(input.ventricularCalciumDeposit);
  const configuration = deepFreeze({
    configurationSchemaId: ACCEPTED_COMPOSED_RHYTHM_TRANSACTION_CONFIGURATION_V2_ID,
    schemaVersion: 2 as const,
    configurationId: requireNonemptyString(input.configurationId, "configurationId"),
    ownerInstanceId: requireNonemptyString(input.ownerInstanceId, "ownerInstanceId"),
    atrialSource,
    authoredEctopySchedule,
    authoredVentricularPacingReplay,
    electricalCaptureOwner,
    avGateParameters,
    avGateInstanceId: requireNonemptyString(input.avGateInstanceId, "avGateInstanceId"),
    distalGate,
    ventricularBackup,
    ventricularIntervalStrength,
    calciumParametersByWall,
    sinusAtrialCalciumDeposit,
    pacAtrialCalciumDeposit,
    ventricularCalciumDeposit,
  });
  stampInternallyValidatedAcceptedComposedRhythmConfigurationV2(configuration);
  return configuration;
}

export function validateAcceptedComposedRhythmTransactionConfigurationV2(
  configuration: AcceptedComposedRhythmTransactionConfigurationV2,
): void {
  if (
    validationStampReuseEligibleV1()
    && internallyValidatedAcceptedComposedRhythmConfigurationsV2.has(
      configuration,
    )
  ) {
    // Reuse the complete proof for this exact module-issued or previously
    // validated, transitively frozen configuration object. A copied, restored,
    // hand-built, or mutable configuration misses and still takes every
    // sub-validator plus the canonical rebuild comparison.
    return;
  }
  requireExactKeys(
    requirePlainRecord(configuration, "composed rhythm configuration"),
    [
      "configurationSchemaId", "schemaVersion", "configurationId",
      "ownerInstanceId", "atrialSource", "authoredEctopySchedule",
      "authoredVentricularPacingReplay",
      "electricalCaptureOwner", "avGateParameters", "avGateInstanceId",
      "distalGate", "ventricularBackup", "ventricularIntervalStrength",
      "calciumParametersByWall", "sinusAtrialCalciumDeposit",
      "pacAtrialCalciumDeposit", "ventricularCalciumDeposit",
    ],
    "composed rhythm configuration",
  );
  if (configuration.configurationSchemaId !== ACCEPTED_COMPOSED_RHYTHM_TRANSACTION_CONFIGURATION_V2_ID || configuration.schemaVersion !== 2 || !Object.isFrozen(configuration)) {
    throw new Error("composed rhythm configuration schema or immutability is invalid");
  }
  validateAcceptedAuthoredEctopyScheduleConfigurationV2(configuration.authoredEctopySchedule);
  if (configuration.authoredVentricularPacingReplay !== null) {
    validateAcceptedAuthoredVentricularPacingReplaySourceConfigurationV1(
      configuration.authoredVentricularPacingReplay,
    );
  }
  validateRecoveryConcealmentAvGateParametersV1(configuration.avGateParameters);
  validateDistalConductionGateConfigurationV1(configuration.distalGate);
  validateAcceptedVentricularBackupSourceConfigurationV2(configuration.ventricularBackup);
  validateAcceptedVentricularIntervalStrengthConfigurationV1(configuration.ventricularIntervalStrength);
  copyAtrialSourceConfiguration(configuration.atrialSource);
  copyCalciumParameters(configuration.calciumParametersByWall);
  copyAtrialDeposit(configuration.sinusAtrialCalciumDeposit, "sinusAtrialCalciumDeposit");
  copyAtrialDeposit(configuration.pacAtrialCalciumDeposit, "pacAtrialCalciumDeposit");
  copyVentricularDeposit(configuration.ventricularCalciumDeposit);
  requireNonemptyString(configuration.configurationId, "configurationId");
  requireNonemptyString(configuration.ownerInstanceId, "ownerInstanceId");
  requireNonemptyString(configuration.avGateInstanceId, "avGateInstanceId");
  const rebuilt = createAcceptedComposedRhythmTransactionConfigurationV2({
    configurationId: configuration.configurationId,
    ownerInstanceId: configuration.ownerInstanceId,
    atrialSource: configuration.atrialSource,
    authoredEctopySchedule: configuration.authoredEctopySchedule,
    authoredVentricularPacingReplay:
      configuration.authoredVentricularPacingReplay,
    electricalCaptureOwner: configuration.electricalCaptureOwner,
    avGateParameters: configuration.avGateParameters,
    avGateInstanceId: configuration.avGateInstanceId,
    distalGate: configuration.distalGate,
    ventricularBackup: configuration.ventricularBackup,
    ventricularIntervalStrength: configuration.ventricularIntervalStrength,
    calciumParametersByWall: configuration.calciumParametersByWall,
    sinusAtrialCalciumDeposit: configuration.sinusAtrialCalciumDeposit,
    pacAtrialCalciumDeposit: configuration.pacAtrialCalciumDeposit,
    ventricularCalciumDeposit: configuration.ventricularCalciumDeposit,
  });
  if (canonicalJsonStringify(configuration) !== canonicalJsonStringify(rebuilt)) {
    throw new Error("composed rhythm configuration is not canonical");
  }
  stampInternallyValidatedAcceptedComposedRhythmConfigurationV2(configuration);
}

export function initializeAcceptedComposedRhythmTransactionStateV2(
  configuration: AcceptedComposedRhythmTransactionConfigurationV2,
  input: AcceptedComposedRhythmTransactionInitialStateInputV2,
): AcceptedComposedRhythmTransactionStateV2 {
  validateAcceptedComposedRhythmTransactionConfigurationV2(configuration);
  requireExactKeys(requirePlainRecord(input, "composed rhythm initial state input"), [
    "acceptedTimeSec", "regularFirstFutureActivationTimeSec", "regularFirstSourceSequence",
    "priorAcceptedAtrialCapture", "priorAcceptedVentricularActivation",
    "initialNormalizedSrLoadState", "calciumStateByWall",
  ], "composed rhythm initial state input");
  const acceptedTimeSec = requireNonnegativeFinite(input.acceptedTimeSec, "acceptedTimeSec");
  const priorV = input.priorAcceptedVentricularActivation;
  if (priorV.sourceKind === "primary-intrinsic") throw new Error("ventricular history cannot use atrial-only primary-intrinsic route");
  const regularAtrialSourceState = configuration.atrialSource.mode === "regular"
    ? initializeAcceptedRegularAtrialSourceStateV1(
      configuration.atrialSource.regularSourceConfiguration,
      {
        acceptedTimeSec,
        firstFutureActivationTimeSec: requireNonnegativeFinite(input.regularFirstFutureActivationTimeSec, "regularFirstFutureActivationTimeSec"),
        firstSourceSequence: requireNonnegativeSafeInteger(input.regularFirstSourceSequence, "regularFirstSourceSequence"),
      },
    )
    : requireNullRegularInitialization(input);
  const authoredEctopyState = initializeEctopy(configuration.authoredEctopySchedule, acceptedTimeSec);
  const authoredVentricularPacingReplayState =
    configuration.authoredVentricularPacingReplay === null
      ? null
      : initializeAcceptedAuthoredVentricularPacingReplaySourceStateV1(
        configuration.authoredVentricularPacingReplay,
        acceptedTimeSec,
      );
  const electricalCaptureState = initializeAcceptedElectricalCaptureOwnerStateV2(
    configuration.electricalCaptureOwner,
    {
      acceptedTimeSec,
      atrialPriorCapture: input.priorAcceptedAtrialCapture,
      ventricularPriorCapture: {
        capturedActivationId: priorV.capturedActivationId,
        activationTimeSec: priorV.activationTimeSec,
      },
    },
  );
  const proximalAvGateState = initializeRecoveryConcealmentAvGateStateV2(
    composedProximalAvGateConfiguration(configuration),
    { acceptedAtrialActivationTimeSec: acceptedTimeSec },
  );
  const distalGateState = initializeAcceptedDistalConductionGateStateV1(
    configuration.distalGate,
    { acceptedTimeSec },
  );
  const ventricularBackupState = initializeAcceptedVentricularBackupSourceStateV2(
    configuration.ventricularBackup,
    {
      acceptedTimeSec,
      priorAcceptedVentricularCapture: {
        capturedActivationId: priorV.capturedActivationId,
        parentSourceImpulseId: priorV.parentSourceImpulseId,
        sourceKind: priorV.sourceKind,
        sourceId: priorV.sourceId,
        sourceSequence: priorV.sourceSequence,
        activationTimeSec: priorV.activationTimeSec,
      },
    },
  );
  const ventricularIntervalStrengthState = initializeAcceptedVentricularIntervalStrengthStateV1(
    configuration.ventricularIntervalStrength,
    {
      acceptedTimeSec,
      initialNormalizedSrLoadState: input.initialNormalizedSrLoadState,
      priorAcceptedVentricularActivation: priorV,
    },
  );
  const calciumStateByWall = copyCalciumStates(input.calciumStateByWall, configuration.calciumParametersByWall);
  const state = deepFreeze({
    stateSchemaId: ACCEPTED_COMPOSED_RHYTHM_TRANSACTION_STATE_V2_ID,
    schemaVersion: 2 as const,
    configuration,
    initialAcceptedTimeSec: acceptedTimeSec,
    revision: 0,
    acceptedTimeSec,
    regularAtrialSourceState,
    authoredEctopyState,
    authoredVentricularPacingReplayState,
    electricalCaptureState,
    proximalAvGateState,
    distalGateState,
    ventricularBackupState,
    ventricularIntervalStrengthState,
    pendingProximalAvOutputs: Object.freeze([]),
    pendingDistalVentricularImpulses: Object.freeze([]),
    pendingCalciumDeposits: Object.freeze([]),
    calciumStateByWall,
    acceptedAtrialCaptureCount: 0,
    acceptedVentricularCaptureCount: 0,
    deliveredCalciumDepositCount: 0,
  }) satisfies AcceptedComposedRhythmTransactionStateV2;
  validateAcceptedComposedRhythmTransactionStateV2(state);
  stampInternallyValidatedAcceptedComposedRhythmStateV2(state);
  return state;
}

/**
 * Rebinds the regular-sinus cycle contract at one accepted boundary without
 * rewinding any owner clock or discarding electrical, conduction, calcium, or
 * capture state. The remaining fraction of the active sinus interval is
 * preserved, so a heart-rate edit changes the next interval continuously
 * instead of restarting the rhythm owner at its cold phase.
 *
 * Only the regular-source cycle, its cycle-derived calcium parameters, and
 * the interval-strength reference normalization may differ. Every other
 * composed-rhythm owner contract must remain identical.
 */
export function rebindAcceptedComposedRegularSinusStateV2(
  state: AcceptedComposedRhythmTransactionStateV2,
  targetConfiguration: AcceptedComposedRhythmTransactionConfigurationV2,
): AcceptedComposedRhythmTransactionStateV2 {
  validateAcceptedComposedRhythmTransactionStateV2(state);
  validateAcceptedComposedRhythmTransactionConfigurationV2(
    targetConfiguration,
  );
  const sourceAtrial = state.configuration.atrialSource;
  const targetAtrial = targetConfiguration.atrialSource;
  if (
    sourceAtrial.mode !== "regular"
    || targetAtrial.mode !== "regular"
    || sourceAtrial.regularSourceConfiguration.rhythmClass !== "sinus"
    || targetAtrial.regularSourceConfiguration.rhythmClass !== "sinus"
    || state.regularAtrialSourceState === null
  ) {
    throw new Error(
      "composed rhythm warm start requires regular sinus source owners",
    );
  }
  assertRegularSinusWarmStartConfigurationV2(
    state.configuration,
    targetConfiguration,
  );
  const ventricularIntervalStrengthState =
    rebindAcceptedVentricularIntervalStrengthReferenceV1(
      state.ventricularIntervalStrengthState,
      targetConfiguration.ventricularIntervalStrength,
    );

  const sourceRegular = state.regularAtrialSourceState;
  const sourceCycleSec =
    sourceAtrial.regularSourceConfiguration.cycleLengthSec;
  const targetCycleSec =
    targetAtrial.regularSourceConfiguration.cycleLengthSec;
  const remainingFraction = (
    sourceRegular.nextActivationTimeSec - state.acceptedTimeSec
  ) / sourceCycleSec;
  const fractionTolerance = 64 * Number.EPSILON;
  if (
    !Number.isFinite(remainingFraction)
    || !(remainingFraction > 0)
    || remainingFraction > 1 + fractionTolerance
  ) {
    throw new Error(
      "composed rhythm warm-start sinus phase is outside one cycle",
    );
  }
  const nextActivationTimeSec = state.acceptedTimeSec
    + Math.min(1, remainingFraction) * targetCycleSec;
  if (!Number.isFinite(nextActivationTimeSec)
    || !(nextActivationTimeSec > state.acceptedTimeSec)) {
    throw new Error(
      "composed rhythm warm-start next sinus activation is invalid",
    );
  }

  const rebound = deepFreeze({
    ...state,
    configuration: targetConfiguration,
    regularAtrialSourceState: {
      ...sourceRegular,
      configuration: targetAtrial.regularSourceConfiguration,
      nextActivationTimeSec,
    },
    ventricularIntervalStrengthState,
  }) satisfies AcceptedComposedRhythmTransactionStateV2;
  validateAcceptedComposedRhythmTransactionStateV2(rebound);
  stampInternallyValidatedAcceptedComposedRhythmStateV2(rebound);
  return rebound;
}

/**
 * Limits an absolute requested endpoint to the earliest owned event boundary.
 *
 * candidateTimeSec is the sole executable endpoint. Consumers must not
 * reconstruct it by subtracting acceptedTimeSec and adding the derived
 * duration back, because that round trip is not exact for every finite pair.
 */
export function limitAcceptedComposedRhythmTransactionCandidateTimeV2(
  state: AcceptedComposedRhythmTransactionStateV2,
  requestedCandidateTimeSec: number,
  externalAfNextBoundaryTimeSec: number | null,
): AcceptedComposedRhythmTransactionCandidateTimeLimitV2 {
  validateAcceptedComposedRhythmTransactionBoundaryV2(state);
  const requestedCandidateTime = requireNonnegativeFinite(
    requestedCandidateTimeSec,
    "requestedCandidateTimeSec",
  );
  if (!(requestedCandidateTime > state.acceptedTimeSec)) {
    throw new Error("requested composed rhythm candidate time must advance");
  }
  const boundaries = ownedBoundaries(state);
  if (state.configuration.atrialSource.mode === "external-af") {
    const external = requireNonnegativeFinite(externalAfNextBoundaryTimeSec, "externalAfNextBoundaryTimeSec");
    if (!(external > state.acceptedTimeSec)) throw new Error("external AF next boundary must be future");
    boundaries.push({ owner: "external-af", timeSec: external });
  } else if (externalAfNextBoundaryTimeSec !== null) {
    throw new Error("regular atrial mode must not supply an external AF boundary");
  }
  const earliest = Math.min(
    requestedCandidateTime,
    ...boundaries.map((boundary) => boundary.timeSec),
  );
  const owners = boundaries.filter((boundary) => boundary.timeSec === earliest).map((boundary) => boundary.owner).sort();
  return Object.freeze({
    requestedCandidateTimeSec: requestedCandidateTime,
    candidateTimeSec: earliest,
    boundaryTimeSec: owners.length === 0 ? null : earliest,
    boundaryOwners: Object.freeze(owners),
  });
}

export function evaluateAcceptedComposedRhythmTransactionCandidateV2(
  state: AcceptedComposedRhythmTransactionStateV2,
  input: AcceptedComposedRhythmTransactionCandidateInputV2,
): AcceptedComposedRhythmTransactionCandidateV2 {
  validateAcceptedComposedRhythmTransactionBoundaryV2(state);
  requireExactKeys(requirePlainRecord(input, "composed rhythm candidate input"), ["candidateTimeSec", "externalAtrialSourceBatch"], "composed rhythm candidate input");
  if (state.revision === Number.MAX_SAFE_INTEGER) throw new Error("composed rhythm revision cannot increment safely");
  const candidateTimeSec = requireNonnegativeFinite(input.candidateTimeSec, "candidateTimeSec");
  if (!(candidateTimeSec > state.acceptedTimeSec)) throw new Error("composed rhythm candidate must advance time");
  const earliestInternal = Math.min(...ownedBoundaries(state).map((boundary) => boundary.timeSec));
  if (candidateTimeSec > earliestInternal) throw new Error("composed rhythm candidate may not cross an owned event boundary");
  const externalAtrialSourceBatch = validateAndCopyExternalBatch(state.configuration, input.externalAtrialSourceBatch, candidateTimeSec);

  const dueProximalAvOutputs = Object.freeze(state.pendingProximalAvOutputs.filter((item) => item.proximalArrivalTimeSec === candidateTimeSec));
  let distalGateState = state.distalGateState;
  const distalGateDecisions: DistalConductionGateCandidateDecisionV1[] = [];
  const newlyPendingDistal: SourceImpulseV2[] = [];
  for (const pending of dueProximalAvOutputs) {
    const decision = evaluateDistalConductionGateCandidateDecisionV1(distalGateState, {
      proximalAvOutputId: pending.proximalAvOutputId,
      parentCapturedActivationId: pending.parentCapturedAtrialActivationId,
      proximalArrivalTimeSec: pending.proximalArrivalTimeSec,
    });
    distalGateDecisions.push(decision);
    distalGateState = decision.candidateState;
    if (decision.ventricularSourceImpulse !== null) newlyPendingDistal.push(decision.ventricularSourceImpulse);
  }

  const provisionalRegularCandidate = state.regularAtrialSourceState === null
    ? null
    : evaluateAcceptedRegularAtrialSourceCandidateV1(state.regularAtrialSourceState, candidateTimeSec, null);
  const authoredEctopyTrial = evaluateAcceptedAuthoredEctopyScheduleTrialV2(state.authoredEctopyState, candidateTimeSec);
  const authoredVentricularPacingReplayTrial =
    state.authoredVentricularPacingReplayState === null
      ? null
      : evaluateAcceptedAuthoredVentricularPacingReplaySourceTrialV1(
        state.authoredVentricularPacingReplayState,
        candidateTimeSec,
      );
  const dueDistal = state.pendingDistalVentricularImpulses.filter((impulse) => impulse.activationTimeSec === candidateTimeSec);
  const ventricularBackupProposal = evaluateVentricularBackupSourceProposalV2(state.ventricularBackupState, candidateTimeSec);
  const regularImpulses = provisionalRegularCandidate?.sourceImpulse === null || provisionalRegularCandidate === null
    ? [] : [provisionalRegularCandidate.sourceImpulse];
  const nonVviSourceProposals = Object.freeze([
    ...regularImpulses,
    ...externalAtrialSourceBatch.sourceImpulses,
    ...authoredEctopyTrial.sourceImpulses,
    ...(authoredVentricularPacingReplayTrial?.sourceImpulses ?? []),
    ...dueDistal,
    ...ventricularBackupProposal.sourceImpulsesForNonVviBatch,
  ]);
  const nonVviCapturePreview = evaluateAcceptedElectricalCaptureBatchCandidateV2(state.electricalCaptureState, {
    candidateTimeSec,
    sourceImpulses: nonVviSourceProposals,
  });
  const nonVviSourceImpulses = nonVviCapturePreview.sourceImpulses;
  const previewV = capturedForChamber(nonVviCapturePreview, "ventricular");
  const conditionalVviAttempted = previewV === null && ventricularBackupProposal.conditionalVviPacingSourceImpulse !== null;
  const acceptedCaptureCandidate = conditionalVviAttempted
    ? evaluateAcceptedElectricalCaptureBatchCandidateV2(state.electricalCaptureState, {
      candidateTimeSec,
      sourceImpulses: Object.freeze([...nonVviSourceImpulses, ventricularBackupProposal.conditionalVviPacingSourceImpulse!]),
    })
    : nonVviCapturePreview;
  const capturedAtrialActivation = capturedForChamber(acceptedCaptureCandidate, "atrial");
  const capturedVentricularActivation = capturedForChamber(acceptedCaptureCandidate, "ventricular");
  const pacMetadata = capturedAtrialActivation === null ? null : pacMetadataForCapture(authoredEctopyTrial, capturedAtrialActivation);
  const pacSinusClockPolicyApplied = state.regularAtrialSourceState?.configuration.rhythmClass === "sinus"
    ? pacMetadata?.sinusResetPolicy ?? null
    : null;
  const regularAtrialSourceCandidate = state.regularAtrialSourceState === null
    ? null
    : evaluateAcceptedRegularAtrialSourceCandidateV1(state.regularAtrialSourceState, candidateTimeSec, pacSinusClockPolicyApplied);

  let proximalAvGateState = state.proximalAvGateState;
  let proximalAvOutputDecision: ComposedProximalAvOutputDecisionV2 | null =
    null;
  const newlyPendingProximal: ComposedRhythmPendingProximalAvOutputV2[] = [];
  if (capturedAtrialActivation !== null) {
    const ownerDecision =
      evaluateRecoveryConcealmentAvGateCandidateDecisionV2(
        proximalAvGateState,
        {
          atrialActivationId:
            capturedAtrialActivation.capturedActivationId,
          atrialActivationTimeSec:
            capturedAtrialActivation.activationTimeSec,
        },
      );
    proximalAvGateState = ownerDecision.candidateState;
    proximalAvOutputDecision = composeProximalAvGateDecision(ownerDecision);
    if (proximalAvOutputDecision.conducted) {
      newlyPendingProximal.push(
        createPendingProximal(
          proximalAvOutputDecision,
          capturedAtrialActivation,
        ),
      );
    }
  }

  const conditionalAcceptedV = conditionalVviAttempted
    && capturedVentricularActivation?.parentSourceImpulseId
      === ventricularBackupProposal.conditionalVviPacingSourceImpulse?.sourceImpulseId
    ? capturedVentricularActivation : null;
  const ventricularBackupResolution = createVentricularBackupSourceResolutionV2(ventricularBackupProposal, {
    nonVviAcceptedVentricularActivation: conditionalVviAttempted ? null : previewV,
    conditionalVviPacingAcceptedVentricularActivation: conditionalAcceptedV,
  });
  const ventricularBackupCandidate = evaluateAcceptedVentricularBackupSourceCandidateV2(
    state.ventricularBackupState,
    ventricularBackupProposal,
    ventricularBackupResolution,
  );
  const ventricularIntervalStrengthCandidate = capturedVentricularActivation === null
    ? null
    : evaluateAcceptedVentricularIntervalStrengthCandidateV1(state.ventricularIntervalStrengthState, {
      acceptedVentricularActivation: capturedVentricularActivation,
    });

  const deliveredCalciumDeposits = Object.freeze(state.pendingCalciumDeposits.filter((deposit) => deposit.depositTimeSec === candidateTimeSec));
  const calciumStateByWall = advanceCalciumStates(
    state.calciumStateByWall,
    state.acceptedTimeSec,
    candidateTimeSec,
    deliveredCalciumDeposits,
    state.configuration.calciumParametersByWall,
  );
  const scheduledCalciumDeposits = scheduleCalciumDeposits(
    state.configuration,
    candidateTimeSec,
    capturedAtrialActivation,
    provisionalRegularCandidate?.sourceImpulse ?? null,
    pacMetadata,
    capturedVentricularActivation,
    ventricularIntervalStrengthCandidate,
    regularSinusCycleBoundaryLatticeV2(state),
  );
  const pendingProximalAvOutputs = sortedPendingProximal([
    ...state.pendingProximalAvOutputs.filter((item) => item.proximalArrivalTimeSec > candidateTimeSec),
    ...newlyPendingProximal,
  ]);
  const pendingDistalVentricularImpulses = sortedSourceImpulses([
    ...state.pendingDistalVentricularImpulses.filter((impulse) => impulse.activationTimeSec > candidateTimeSec),
    ...newlyPendingDistal,
  ]);
  const pendingCalciumDeposits = sortedCalciumDeposits([
    ...state.pendingCalciumDeposits.filter((deposit) => deposit.depositTimeSec > candidateTimeSec),
    ...scheduledCalciumDeposits,
  ]);
  const candidateState = deepFreeze({
    stateSchemaId: ACCEPTED_COMPOSED_RHYTHM_TRANSACTION_STATE_V2_ID,
    schemaVersion: 2 as const,
    configuration: state.configuration,
    initialAcceptedTimeSec: state.initialAcceptedTimeSec,
    revision: state.revision + 1,
    acceptedTimeSec: candidateTimeSec,
    regularAtrialSourceState: regularAtrialSourceCandidate?.candidateState ?? null,
    authoredEctopyState: authoredEctopyTrial.candidateState,
    authoredVentricularPacingReplayState:
      authoredVentricularPacingReplayTrial?.candidateState ?? null,
    electricalCaptureState: acceptedCaptureCandidate.candidateState,
    proximalAvGateState,
    distalGateState,
    ventricularBackupState: ventricularBackupCandidate.candidateState,
    ventricularIntervalStrengthState: ventricularIntervalStrengthCandidate?.candidateState ?? state.ventricularIntervalStrengthState,
    pendingProximalAvOutputs,
    pendingDistalVentricularImpulses,
    pendingCalciumDeposits,
    calciumStateByWall,
    acceptedAtrialCaptureCount: safeCounterAdd(state.acceptedAtrialCaptureCount, capturedAtrialActivation === null ? 0 : 1, "acceptedAtrialCaptureCount"),
    acceptedVentricularCaptureCount: safeCounterAdd(state.acceptedVentricularCaptureCount, capturedVentricularActivation === null ? 0 : 1, "acceptedVentricularCaptureCount"),
    deliveredCalciumDepositCount: safeCounterAdd(state.deliveredCalciumDepositCount, deliveredCalciumDeposits.length, "deliveredCalciumDepositCount"),
  }) satisfies AcceptedComposedRhythmTransactionStateV2;
  if (fullHotPathInvariantsEnabledV1()) {
    validateAcceptedComposedRhythmTransactionStateV2(candidateState);
  }
  // Lean omits only the immediate deep re-proof of this exact state graph
  // assembled and recursively frozen above from already accepted owner
  // candidates. It therefore proves less about constructor output at this
  // site; arbitrary boundary states never receive this stamp.
  stampPrivatelyConstructedAcceptedComposedRhythmStateV2(candidateState);
  const candidate = deepFreeze({
    candidateSchemaId: ACCEPTED_COMPOSED_RHYTHM_TRANSACTION_CANDIDATE_V2_ID,
    schemaVersion: 2 as const,
    configurationId: state.configuration.configurationId,
    ownerInstanceId: state.configuration.ownerInstanceId,
    baseRevision: state.revision,
    candidateRevision: state.revision + 1,
    startTimeSec: state.acceptedTimeSec,
    candidateTimeSec,
    externalAtrialSourceBatch,
    regularAtrialSourceCandidate,
    authoredEctopyTrial,
    authoredVentricularPacingReplayTrial,
    dueProximalAvOutputs,
    distalGateDecisions: Object.freeze(distalGateDecisions),
    ventricularBackupProposal,
    nonVviSourceImpulses,
    nonVviCapturePreview,
    conditionalVviAttempted,
    acceptedCaptureCandidate,
    capturedAtrialActivation,
    capturedVentricularActivation,
    pacSinusClockPolicyApplied,
    proximalAvOutputDecision,
    ventricularBackupResolution,
    ventricularBackupCandidate,
    ventricularIntervalStrengthCandidate,
    deliveredCalciumDeposits,
    scheduledCalciumDeposits,
    candidateState,
  });
  if (
    validationStampReuseEligibleV1()
    && internallyValidatedAcceptedComposedRhythmStatesV2.has(state)
  ) {
    internalCandidateBaseByCandidateV2.set(candidate, state);
  }
  return candidate;
}

export function commitAcceptedComposedRhythmTransactionCandidateV2(
  state: AcceptedComposedRhythmTransactionStateV2,
  candidate: AcceptedComposedRhythmTransactionCandidateV2,
): AcceptedComposedRhythmTransactionStateV2 {
  if (
    validationStampReuseEligibleV1()
    && !fullHotPathInvariantsEnabledV1()
    && internalCandidateBaseByCandidateV2.get(candidate) === state
  ) {
    // The lean tier skips only same-tick defensive recomputation for the exact
    // candidate/base identity pair privately issued above. Full-invariant
    // always recomputes; an unstamped, copied, restored, or differently based
    // candidate also takes the complete path in either tier.
    return candidate.candidateState;
  }
  const expected = evaluateAcceptedComposedRhythmTransactionCandidateV2(state, {
    candidateTimeSec: candidate.candidateTimeSec,
    externalAtrialSourceBatch: candidate.externalAtrialSourceBatch,
  });
  if (canonicalJsonStringify(candidate) !== canonicalJsonStringify(expected)) throw new Error("composed rhythm candidate does not match its accepted base");
  const committedCapture = commitAcceptedElectricalCaptureBatchCandidateV2(
    state.electricalCaptureState,
    expected.acceptedCaptureCandidate,
  );
  if (
    canonicalJsonStringify(committedCapture)
      !== canonicalJsonStringify(expected.candidateState.electricalCaptureState)
  ) {
    throw new Error("composed rhythm final capture commit split");
  }
  if (state.authoredVentricularPacingReplayState !== null) {
    if (expected.authoredVentricularPacingReplayTrial === null) {
      throw new Error("composed rhythm authored pacing replay trial is missing");
    }
    const committedPacingReplay =
      commitAcceptedAuthoredVentricularPacingReplaySourceTrialV1(
        state.authoredVentricularPacingReplayState,
        expected.authoredVentricularPacingReplayTrial,
      );
    if (
      canonicalJsonStringify(committedPacingReplay)
        !== canonicalJsonStringify(
          expected.candidateState.authoredVentricularPacingReplayState,
        )
    ) {
      throw new Error("composed rhythm authored pacing replay commit split");
    }
  }
  return expected.candidateState;
}

export function rollbackAcceptedComposedRhythmTransactionCandidateV2(
  state: AcceptedComposedRhythmTransactionStateV2,
  candidate: AcceptedComposedRhythmTransactionCandidateV2,
): AcceptedComposedRhythmTransactionStateV2 {
  commitAcceptedComposedRhythmTransactionCandidateV2(state, candidate);
  if (state.authoredVentricularPacingReplayState !== null) {
    if (candidate.authoredVentricularPacingReplayTrial === null) {
      throw new Error("composed rhythm authored pacing replay trial is missing");
    }
    const rolledBackPacingReplay =
      rollbackAcceptedAuthoredVentricularPacingReplaySourceTrialV1(
        state.authoredVentricularPacingReplayState,
        candidate.authoredVentricularPacingReplayTrial,
      );
    if (rolledBackPacingReplay !== state.authoredVentricularPacingReplayState) {
      throw new Error("composed rhythm authored pacing replay rollback split");
    }
  }
  return state;
}

export function validateAcceptedComposedRhythmTransactionStateV2(
  state: AcceptedComposedRhythmTransactionStateV2,
): void {
  requireExactKeys(
    requirePlainRecord(state, "composed rhythm state"),
    [
      "stateSchemaId", "schemaVersion", "configuration",
      "initialAcceptedTimeSec", "revision", "acceptedTimeSec",
      "regularAtrialSourceState", "authoredEctopyState",
      "authoredVentricularPacingReplayState",
      "electricalCaptureState", "proximalAvGateState", "distalGateState",
      "ventricularBackupState", "ventricularIntervalStrengthState",
      "pendingProximalAvOutputs", "pendingDistalVentricularImpulses",
      "pendingCalciumDeposits", "calciumStateByWall",
      "acceptedAtrialCaptureCount", "acceptedVentricularCaptureCount",
      "deliveredCalciumDepositCount",
    ],
    "composed rhythm state",
  );
  if (state.stateSchemaId !== ACCEPTED_COMPOSED_RHYTHM_TRANSACTION_STATE_V2_ID || state.schemaVersion !== 2 || !Object.isFrozen(state)) throw new Error("composed rhythm state schema or immutability is invalid");
  validateAcceptedComposedRhythmTransactionConfigurationV2(state.configuration);
  const accepted = requireNonnegativeFinite(state.acceptedTimeSec, "state.acceptedTimeSec");
  const initial = requireNonnegativeFinite(state.initialAcceptedTimeSec, "state.initialAcceptedTimeSec");
  if (accepted < initial) throw new Error("composed rhythm accepted time precedes initialization");
  const revision = requireNonnegativeSafeInteger(state.revision, "state.revision");
  validateAcceptedAuthoredEctopyScheduleStateV2(state.authoredEctopyState);
  if (state.authoredVentricularPacingReplayState !== null) {
    validateAcceptedAuthoredVentricularPacingReplaySourceStateV1(
      state.authoredVentricularPacingReplayState,
    );
  }
  validateAcceptedElectricalCaptureOwnerStateV2(state.electricalCaptureState);
  validateRecoveryConcealmentAvGateStateV2(state.proximalAvGateState);
  validateAcceptedDistalConductionGateStateV1(state.distalGateState);
  validateAcceptedVentricularBackupSourceStateV2(state.ventricularBackupState);
  validateAcceptedVentricularIntervalStrengthStateV1(state.ventricularIntervalStrengthState);
  if (state.authoredEctopyState.acceptedTimeSec !== accepted || state.electricalCaptureState.acceptedTimeSec !== accepted || state.ventricularBackupState.acceptedTimeSec !== accepted) throw new Error("composed rhythm owned clocks are split");
  if (
    state.authoredEctopyState.revision !== revision
    || state.ventricularBackupState.revision !== revision
  ) {
    throw new Error("composed rhythm boundary revisions are split");
  }
  if (state.configuration.authoredVentricularPacingReplay === null) {
    if (state.authoredVentricularPacingReplayState !== null) {
      throw new Error(
        "composed rhythm without authored pacing replay configuration must not own replay state",
      );
    }
  } else {
    if (state.authoredVentricularPacingReplayState === null) {
      throw new Error(
        "composed rhythm authored pacing replay configuration requires replay state",
      );
    }
    if (
      state.authoredVentricularPacingReplayState.acceptedTimeSec !== accepted
      || state.authoredVentricularPacingReplayState.revision !== revision
    ) {
      throw new Error("composed rhythm authored pacing replay clock is split");
    }
    assertCanonicalEqual(
      state.authoredVentricularPacingReplayState.configuration,
      state.configuration.authoredVentricularPacingReplay,
      "authored ventricular pacing replay configuration split",
    );
  }
  assertCanonicalEqual(
    state.authoredEctopyState.configuration,
    state.configuration.authoredEctopySchedule,
    "authored ectopy configuration split",
  );
  assertCanonicalEqual(
    state.electricalCaptureState.configuration,
    state.configuration.electricalCaptureOwner,
    "capture configuration split",
  );
  assertCanonicalEqual(
    state.proximalAvGateState.configuration,
    composedProximalAvGateConfiguration(state.configuration),
    "proximal AV V2 configuration split",
  );
  assertCanonicalEqual(
    state.distalGateState.configuration,
    state.configuration.distalGate,
    "distal configuration split",
  );
  assertCanonicalEqual(
    state.ventricularBackupState.configuration,
    state.configuration.ventricularBackup,
    "backup configuration split",
  );
  assertCanonicalEqual(
    state.ventricularIntervalStrengthState.configuration,
    state.configuration.ventricularIntervalStrength,
    "interval-strength configuration split",
  );
  if (state.configuration.atrialSource.mode === "regular") {
    if (state.regularAtrialSourceState === null) throw new Error("regular mode requires regular source state");
    validateAcceptedRegularAtrialSourceStateV1(state.regularAtrialSourceState);
    if (state.regularAtrialSourceState.acceptedTimeSec !== accepted) throw new Error("regular source clock is split");
    if (state.regularAtrialSourceState.revision !== revision) throw new Error("regular source revision is split");
    assertCanonicalEqual(
      state.regularAtrialSourceState.configuration,
      state.configuration.atrialSource.regularSourceConfiguration,
      "regular source configuration split",
    );
  } else if (state.regularAtrialSourceState !== null) {
    throw new Error("external AF mode must not own regular or AF source state");
  }
  for (const [queue, timeKey, label] of [
    [state.pendingProximalAvOutputs, "proximalArrivalTimeSec", "pending proximal outputs"],
    [state.pendingDistalVentricularImpulses, "activationTimeSec", "pending distal impulses"],
    [state.pendingCalciumDeposits, "depositTimeSec", "pending calcium deposits"],
  ] as const) validateFutureSortedQueue(queue as readonly Record<string, unknown>[], timeKey, accepted, label);
  if (
    !Object.isFrozen(state.pendingProximalAvOutputs)
    || !Object.isFrozen(state.pendingDistalVentricularImpulses)
    || !Object.isFrozen(state.pendingCalciumDeposits)
  ) {
    throw new Error("composed rhythm pending queues must be immutable");
  }
  validatePendingProximalQueue(state.pendingProximalAvOutputs);
  state.pendingDistalVentricularImpulses.forEach(validateSourceImpulseV2);
  validateUniqueIds(
    state.pendingDistalVentricularImpulses.map((impulse) => impulse.sourceImpulseId),
    "pending distal source impulse ids",
  );
  validatePendingCalciumQueue(state.pendingCalciumDeposits);
  copyCalciumStates(state.calciumStateByWall, state.configuration.calciumParametersByWall);
  const atrialCount = requireNonnegativeSafeInteger(state.acceptedAtrialCaptureCount, "acceptedAtrialCaptureCount");
  const ventricularCount = requireNonnegativeSafeInteger(state.acceptedVentricularCaptureCount, "acceptedVentricularCaptureCount");
  if (
    state.electricalCaptureState.atrialGate.capturedActivationCount
      !== atrialCount
    || state.electricalCaptureState.ventricularGate.capturedActivationCount
      !== ventricularCount
    || state.ventricularIntervalStrengthState.acceptedVentricularCaptureCount
      !== ventricularCount
    || state.ventricularBackupState.acceptedVentricularCaptureFeedbackCount
      !== ventricularCount
  ) {
    throw new Error("composed rhythm accepted-capture counters are split");
  }
  requireNonnegativeSafeInteger(state.deliveredCalciumDepositCount, "deliveredCalciumDepositCount");
}

/**
 * Validates data crossing this owner boundary. Only the exact identity of a
 * transitively frozen plain-data state privately constructed above can take
 * the persistent constant-time path in either tier. Because every reachable
 * data property is frozen and no mutable built-in prototype is eligible, the
 * proof remains true after the state escapes. Restored and hand-built states
 * take the complete exported validator once and may earn the same persistent
 * identity proof only after that validation succeeds and the entire reachable
 * graph independently proves transitively frozen plain data. An outer-frozen
 * state with any mutable descendant remains ineligible and is revalidated on
 * every boundary crossing.
 */
export function validateAcceptedComposedRhythmTransactionBoundaryV2(
  state: AcceptedComposedRhythmTransactionStateV2,
): void {
  if (
    validationStampReuseEligibleV1()
    && internallyValidatedAcceptedComposedRhythmStatesV2.has(state)
  ) return;
  validateAcceptedComposedRhythmTransactionStateV2(state);
  stampInternallyValidatedAcceptedComposedRhythmStateV2(state);
}

function stampInternallyValidatedAcceptedComposedRhythmStateV2(
  state: AcceptedComposedRhythmTransactionStateV2,
): void {
  if (validationStampIssuanceEligibleV1(state)) {
    internallyValidatedAcceptedComposedRhythmStatesV2.add(state);
  }
}

/**
 * Records provenance for the exact graph assembled and recursively frozen by
 * the private candidate constructor above. Unlike exported-validator
 * issuance, this path does not re-walk the graph it has just built. It is not
 * exported and no caller-supplied state can reach it.
 */
function stampPrivatelyConstructedAcceptedComposedRhythmStateV2(
  state: AcceptedComposedRhythmTransactionStateV2,
): void {
  if (!validationStampReuseEligibleV1()) return;
  internallyValidatedAcceptedComposedRhythmStatesV2.add(state);
}

function stampInternallyValidatedAcceptedComposedRhythmConfigurationV2(
  configuration: AcceptedComposedRhythmTransactionConfigurationV2,
): void {
  if (validationStampIssuanceEligibleV1(configuration)) {
    internallyValidatedAcceptedComposedRhythmConfigurationsV2.add(
      configuration,
    );
  }
}

function assertRegularSinusWarmStartConfigurationV2(
  source: AcceptedComposedRhythmTransactionConfigurationV2,
  target: AcceptedComposedRhythmTransactionConfigurationV2,
): void {
  if (source.atrialSource.mode !== "regular"
    || target.atrialSource.mode !== "regular") {
    throw new Error(
      "composed rhythm warm-start configuration is not regular",
    );
  }
  const allowedProjection = {
    ...source,
    atrialSource: {
      ...source.atrialSource,
      regularSourceConfiguration: {
        ...source.atrialSource.regularSourceConfiguration,
        cycleLengthSec:
          target.atrialSource.regularSourceConfiguration.cycleLengthSec,
      },
    },
    calciumParametersByWall: target.calciumParametersByWall,
    ventricularIntervalStrength: target.ventricularIntervalStrength,
  };
  if (
    canonicalJsonStringify(allowedProjection)
      !== canonicalJsonStringify(target)
  ) {
    throw new Error(
      "composed rhythm warm start changed an unsupported owner contract",
    );
  }
}

function initializeEctopy(configuration: AcceptedAuthoredEctopyScheduleConfigurationV2, acceptedTimeSec: number): AcceptedAuthoredEctopyScheduleStateV2 {
  return initializeAcceptedAuthoredEctopyScheduleStateV2(
    configuration,
    acceptedTimeSec,
  );
}

function requireNullRegularInitialization(input: AcceptedComposedRhythmTransactionInitialStateInputV2): null {
  if (input.regularFirstFutureActivationTimeSec !== null || input.regularFirstSourceSequence !== null) throw new Error("external AF mode must not initialize a regular source clock");
  return null;
}

function capturedForChamber(candidate: AcceptedElectricalCaptureBatchCandidateV2, chamber: "atrial" | "ventricular"): CapturedElectricalActivationV2 | null {
  return candidate.capturedActivations.find((activation) => activation.chamber === chamber) ?? null;
}

function pacMetadataForCapture(trial: AcceptedAuthoredEctopyScheduleTrialV2, capture: CapturedElectricalActivationV2): AuthoredPacSourceImpulseMetadataV2 | null {
  const metadata = trial.metadataBySourceImpulseId[capture.parentSourceImpulseId];
  return metadata?.eventKind === "pac" ? metadata : null;
}

const composedProximalAvConfigurationsV2 = new WeakMap<
  AcceptedComposedRhythmTransactionConfigurationV2, RecoveryConcealmentAvGateConfigurationV2
>();

function composedProximalAvGateConfiguration(
  configuration: AcceptedComposedRhythmTransactionConfigurationV2,
): RecoveryConcealmentAvGateConfigurationV2 {
  const cached = validationStampReuseEligibleV1()
    ? composedProximalAvConfigurationsV2.get(configuration) : undefined;
  if (cached !== undefined) return cached;
  const parameters = configuration.avGateParameters;
  const direct = createRecoveryConcealmentAvGateConfigurationV2({
    configurationId: parameters.parameterSetId,
    proximalAvOwnerInstanceId: configuration.avGateInstanceId,
    parameterProvenance: {
      kind: parameters.parameterProvenance.kind,
      sourceId: parameters.parameterProvenance.sourceId,
    },
    minimumProximalAvConductionDelaySec:
      parameters.minimumConductionDelaySec,
    proximalAvRecoveryDelayAmplitudeSec:
      parameters.recoveryDelayAmplitudeSec,
    proximalAvRecoveryTimeConstantSec:
      parameters.recoveryTimeConstantSec,
    postProximalAvOutputRefractorySec:
      parameters.postConductionRefractorySec,
    concealedProximalAvRefractoryExtensionSec:
      parameters.concealedRefractoryExtensionSec,
  });
  validateRecoveryConcealmentAvGateConfigurationV2(direct);
  // This conversion depends only on the immutable configuration, never on an
  // accepted rhythm clock or queue. Mutable/getter-backed inputs cannot retain
  // a derived contract, and stamp-disabled audits redo the complete conversion.
  if (validationStampIssuanceEligibleV1(configuration)) {
    composedProximalAvConfigurationsV2.set(configuration, direct);
  }
  return direct;
}

function composeProximalAvGateDecision(
  decision: RecoveryConcealmentAvGateCandidateDecisionV2,
): ComposedProximalAvOutputDecisionV2 {
  return deepFreeze({
    decisionSchemaId: COMPOSED_PROXIMAL_AV_OUTPUT_DECISION_V2_ID,
    schemaVersion: 2 as const,
    gateInstanceId: decision.proximalAvOwnerInstanceId,
    parameterSetId: decision.configurationId,
    parentCapturedAtrialActivationId: decision.atrialActivationId,
    activationOrdinal: decision.atrialActivationOrdinal,
    baseRevision: decision.baseRevision,
    candidateRevision: decision.candidateRevision,
    atrialActivationTimeSec: decision.atrialActivationTimeSec,
    refractoryUntilProximalOwnerBeforeSec:
      decision.proximalAvRefractoryUntilBeforeSec,
    outcome: decision.outcome,
    conducted: decision.conductedToProximalAvOutput,
    recoveryBeyondRefractorySec:
      decision.recoveryBeyondProximalAvRefractorySec,
    conductionDelaySec: decision.proximalAvConductionDelaySec,
    proximalAvOutputTimeSec: decision.proximalAvOutputTimeSec,
    refractoryUntilProximalOwnerAfterSec:
      decision.proximalAvRefractoryUntilAfterSec,
    candidateState: decision.candidateState,
  });
}

function createPendingProximal(
  decision: ComposedProximalAvOutputDecisionV2,
  capture: CapturedElectricalActivationV2,
): ComposedRhythmPendingProximalAvOutputV2 {
  if (
    decision.proximalAvOutputTimeSec === null
    || !(decision.proximalAvOutputTimeSec > capture.activationTimeSec)
  ) {
    throw new Error("conducted proximal AV output must be strictly future");
  }
  return Object.freeze({
    pendingSchemaId: COMPOSED_RHYTHM_PENDING_PROXIMAL_AV_OUTPUT_V2_ID,
    proximalAvOutputId: framedId("proximal-av-output-v2", [
      decision.gateInstanceId,
      decision.parentCapturedAtrialActivationId,
      decision.activationOrdinal,
    ]),
    parentCapturedAtrialActivationId: capture.capturedActivationId,
    proximalArrivalTimeSec: decision.proximalAvOutputTimeSec,
  });
}

type PeriodicSinusCycleBoundaryLatticeV2 = Readonly<{
  originTimeSec: number;
  cycleLengthSec: number;
}>;

function regularSinusCycleBoundaryLatticeV2(
  state: AcceptedComposedRhythmTransactionStateV2,
): PeriodicSinusCycleBoundaryLatticeV2 | null {
  const regular = state.regularAtrialSourceState;
  if (
    regular === null
    || state.configuration.atrialSource.mode !== "regular"
    || regular.configuration.rhythmClass !== "sinus"
    || state.configuration.authoredEctopySchedule.eventCount !== 0
    || state.configuration.authoredVentricularPacingReplay !== null
    || state.authoredVentricularPacingReplayState !== null
    || regular.capturedPacResetCount !== 0
    || regular.capturedPacPreserveCount !== 0
    || regular.initialAcceptedTimeSec !== state.initialAcceptedTimeSec
  ) return null;
  return Object.freeze({
    originTimeSec: state.initialAcceptedTimeSec,
    cycleLengthSec: regular.configuration.cycleLengthSec,
  });
}

function scheduleCalciumDeposits(
  configuration: AcceptedComposedRhythmTransactionConfigurationV2,
  candidateTimeSec: number,
  atrial: CapturedElectricalActivationV2 | null,
  dueRegularImpulse: SourceImpulseV2 | null,
  pacMetadata: AuthoredPacSourceImpulseMetadataV2 | null,
  ventricular: CapturedElectricalActivationV2 | null,
  intervalCandidate: AcceptedVentricularIntervalStrengthCandidateV1 | null,
  periodicSinusLattice: PeriodicSinusCycleBoundaryLatticeV2 | null,
): readonly ComposedRhythmPendingCalciumDepositV2[] {
  const deposits: ComposedRhythmPendingCalciumDepositV2[] = [];
  if (atrial !== null && dueRegularImpulse !== null && atrial.parentSourceImpulseId === dueRegularImpulse.sourceImpulseId && configuration.atrialSource.mode === "regular" && configuration.atrialSource.regularSourceConfiguration.rhythmClass === "sinus" && configuration.sinusAtrialCalciumDeposit !== null) {
    deposits.push(atrialDeposit("sinus-atrial", atrial, candidateTimeSec, configuration.sinusAtrialCalciumDeposit));
  } else if (atrial !== null && pacMetadata !== null && configuration.pacAtrialCalciumDeposit !== null) {
    deposits.push(atrialDeposit("pac-atrial", atrial, candidateTimeSec, configuration.pacAtrialCalciumDeposit));
  }
  if (ventricular !== null) {
    if (intervalCandidate === null) throw new Error("captured ventricular activation requires interval-strength metadata");
    const relative = intervalCandidate.depositMetadata.futureExactCalciumDepositRelativeStrength;
    const profile = configuration.ventricularCalciumDeposit;
    const rawDepositTimeSec = safeFutureTime(
      candidateTimeSec,
      profile.electricalToCalciumDelaySec,
      "ventricular calcium deposit time",
    );
    deposits.push(createPendingCalciumDeposit(
      "ventricular",
      ventricular,
      canonicalizePeriodicSinusVentricularDepositTimeV2(
        ventricular,
        rawDepositTimeSec,
        periodicSinusLattice,
      ),
      { LA: 0, RA: 0, LVFW: profile.lvFreeWallBaseStrength * relative, SEP: profile.septalBaseStrength * relative, RVFW: profile.rvFreeWallBaseStrength * relative },
    ));
  }
  return Object.freeze(deposits);
}

function atrialDeposit(depositClass: "sinus-atrial" | "pac-atrial", activation: CapturedElectricalActivationV2, timeSec: number, profile: ComposedRhythmAtrialDepositConfigurationV2): ComposedRhythmPendingCalciumDepositV2 {
  return createPendingCalciumDeposit(depositClass, activation, safeFutureTime(timeSec, profile.electricalToCalciumDelaySec, `${depositClass} deposit time`), { LA: profile.leftAtrialStrength, RA: profile.rightAtrialStrength, LVFW: 0, SEP: 0, RVFW: 0 });
}

function createPendingCalciumDeposit(depositClass: ComposedRhythmCalciumDepositClassV2, activation: CapturedElectricalActivationV2, depositTimeSec: number, strengths: ComposedRhythmCalciumStrengthByWallV2): ComposedRhythmPendingCalciumDepositV2 {
  return deepFreeze({
    pendingSchemaId: COMPOSED_RHYTHM_PENDING_CALCIUM_DEPOSIT_V2_ID,
    depositId: framedId("composed-calcium-deposit-v2", [depositClass, activation.capturedActivationId]),
    depositClass,
    parentCapturedActivationId: activation.capturedActivationId,
    depositTimeSec,
    strengthByWall: copyStrengths(strengths),
  });
}

function advanceCalciumStates(states: ComposedRhythmCalciumStateByWallV2, startTimeSec: number, endTimeSec: number, deposits: readonly ComposedRhythmPendingCalciumDepositV2[], parameters: ComposedRhythmCalciumParametersByWallV2): ComposedRhythmCalciumStateByWallV2 {
  return deepFreeze(Object.fromEntries(COMPOSED_RHYTHM_WALL_IDS_V2.map((wall) => [wall, advanceExactEventCalciumV1(states[wall], startTimeSec, endTimeSec, deposits.map((deposit) => ({ timeSec: deposit.depositTimeSec, strength: deposit.strengthByWall[wall] })), parameters[wall])])) as Record<ComposedRhythmWallIdV2, ExactEventCalciumStateV1>);
}

function ownedBoundaries(state: AcceptedComposedRhythmTransactionStateV2): { owner: string; timeSec: number }[] {
  const boundaries: { owner: string; timeSec: number }[] = [];
  if (state.regularAtrialSourceState !== null) boundaries.push({ owner: "regular-atrial-source", timeSec: state.regularAtrialSourceState.nextActivationTimeSec });
  const ectopy = state.authoredEctopyState.configuration.events[state.authoredEctopyState.cursor];
  if (ectopy !== undefined) boundaries.push({ owner: "authored-ectopy", timeSec: ectopy.activationTimeSec });
  const authoredPacing =
    state.authoredVentricularPacingReplayState?.configuration.events[
      state.authoredVentricularPacingReplayState.cursor
    ];
  if (authoredPacing !== undefined) {
    boundaries.push({
      owner: "authored-ventricular-pacing-replay",
      timeSec: authoredPacing.activationTimeSec,
    });
  }
  if (state.pendingProximalAvOutputs[0] !== undefined) boundaries.push({ owner: "pending-proximal-av-output", timeSec: state.pendingProximalAvOutputs[0].proximalArrivalTimeSec });
  if (state.pendingDistalVentricularImpulses[0] !== undefined) boundaries.push({ owner: "pending-distal-ventricular-impulse", timeSec: state.pendingDistalVentricularImpulses[0].activationTimeSec });
  boundaries.push({ owner: "ventricular-backup", timeSec: Math.min(state.ventricularBackupState.nextIntrinsicEscapeDueTimeSec, state.ventricularBackupState.nextVviPaceDueTimeSec) });
  if (state.pendingCalciumDeposits[0] !== undefined) boundaries.push({ owner: "pending-calcium-deposit", timeSec: state.pendingCalciumDeposits[0].depositTimeSec });
  return boundaries;
}

function validateAndCopyExternalBatch(configuration: AcceptedComposedRhythmTransactionConfigurationV2, batch: ComposedRhythmExternalAtrialSourceBatchV2, candidateTimeSec: number): ComposedRhythmExternalAtrialSourceBatchV2 {
  requireExactKeys(
    requirePlainRecord(batch, "external atrial source batch"),
    [
      "sourceClass", "ownerInstanceId", "candidateTimeSec",
      "sourceImpulses", "coordinatedAtrialCalcium",
    ],
    "external atrial source batch",
  );
  if (batch.candidateTimeSec !== candidateTimeSec || batch.coordinatedAtrialCalcium !== "forbidden" || !Array.isArray(batch.sourceImpulses)) throw new Error("external atrial source batch boundary is invalid");
  if (configuration.atrialSource.mode === "regular") {
    if (batch.sourceClass !== "none" || batch.ownerInstanceId !== null || batch.sourceImpulses.length !== 0) throw new Error("regular mode rejects external atrial source impulses");
  } else if (batch.sourceClass !== "atrial-fibrillation" || batch.ownerInstanceId !== configuration.atrialSource.externalAfOwnerInstanceId) {
    throw new Error("external AF source batch owner or class mismatch");
  }
  const impulses = batch.sourceImpulses.map((impulse) => {
    validateSourceImpulseV2(impulse);
    if (impulse.chamber !== "atrial" || impulse.sourceKind !== "primary-intrinsic" || impulse.activationTimeSec !== candidateTimeSec || impulse.parentCapturedActivationId !== null) throw new Error("external AF source impulse route or boundary is invalid");
    return impulse;
  });
  impulses.sort((left, right) =>
    codeUnitCompare(left.sourceId, right.sourceId)
      || left.sourceSequence - right.sourceSequence);
  return deepFreeze({ ...batch, sourceImpulses: impulses } as ComposedRhythmExternalAtrialSourceBatchV2);
}

function copyAtrialSourceConfiguration(input: ComposedRhythmAtrialSourceConfigurationV2): ComposedRhythmAtrialSourceConfigurationV2 {
  requireExactKeys(
    requirePlainRecord(input, "atrial source configuration"),
    ["mode", "regularSourceConfiguration", "externalAfOwnerInstanceId"],
    "atrial source configuration",
  );
  if (input.mode === "regular") {
    if (input.externalAfOwnerInstanceId !== null) throw new Error("regular source mode cannot name external AF owner");
    validateRegularAtrialSourceConfigurationV1(input.regularSourceConfiguration);
    return deepFreeze({ mode: "regular" as const, regularSourceConfiguration: detachedFrozenCopy(input.regularSourceConfiguration), externalAfOwnerInstanceId: null });
  }
  if (input.regularSourceConfiguration !== null) throw new Error("external AF mode cannot own regular source configuration");
  return Object.freeze({ mode: "external-af" as const, regularSourceConfiguration: null, externalAfOwnerInstanceId: requireNonemptyString(input.externalAfOwnerInstanceId, "externalAfOwnerInstanceId") });
}

function copyEctopyConfiguration(configuration: AcceptedAuthoredEctopyScheduleConfigurationV2): AcceptedAuthoredEctopyScheduleConfigurationV2 {
  validateAcceptedAuthoredEctopyScheduleConfigurationV2(configuration);
  return createAcceptedAuthoredEctopyScheduleConfigurationV2({
    configurationId: configuration.configurationId,
    ownerInstanceId: configuration.ownerInstanceId,
    scheduleId: configuration.scheduleId,
    events: configuration.events.map((event) => event.eventKind === "pac" ? {
      eventKind: "pac" as const, authoredEctopyId: event.authoredEctopyId, sourceId: event.sourceId,
      sourceSequence: event.sourceSequence, activationTimeSec: event.activationTimeSec, chamber: "atrial" as const,
      sinusResetPolicy: event.sinusResetPolicy,
    } : {
      eventKind: "pvc" as const, authoredEctopyId: event.authoredEctopyId, sourceId: event.sourceId,
      sourceSequence: event.sourceSequence, activationTimeSec: event.activationTimeSec, chamber: "ventricular" as const,
    }),
  });
}

function copyAuthoredVentricularPacingReplayConfiguration(
  configuration:
    AcceptedAuthoredVentricularPacingReplaySourceConfigurationV1 | null,
): AcceptedAuthoredVentricularPacingReplaySourceConfigurationV1 | null {
  if (configuration === null) return null;
  validateAcceptedAuthoredVentricularPacingReplaySourceConfigurationV1(
    configuration,
  );
  return createAcceptedAuthoredVentricularPacingReplaySourceConfigurationV1({
    configurationId: configuration.configurationId,
    ownerInstanceId: configuration.ownerInstanceId,
    replayId: configuration.replayId,
    sourceId: configuration.sourceId,
    events: configuration.events.map((event) => ({
      pacingEventId: event.pacingEventId,
      sourceSequence: event.sourceSequence,
      activationTimeSec: event.activationTimeSec,
    })),
  });
}

function copyCalciumParameters(input: ComposedRhythmCalciumParametersByWallV2): ComposedRhythmCalciumParametersByWallV2 {
  requireExactKeys(
    requirePlainRecord(input, "calciumParametersByWall"),
    COMPOSED_RHYTHM_WALL_IDS_V2,
    "calciumParametersByWall",
  );
  return deepFreeze(Object.fromEntries(COMPOSED_RHYTHM_WALL_IDS_V2.map((wall) => {
    const parameters = input[wall];
    propagateExactEventCalciumV1(Object.freeze([0, 0]), 0, parameters);
    return [wall, { ...parameters }];
  })) as ComposedRhythmCalciumParametersByWallV2);
}

function copyCalciumStates(input: ComposedRhythmCalciumStateByWallV2, parameters: ComposedRhythmCalciumParametersByWallV2): ComposedRhythmCalciumStateByWallV2 {
  requireExactKeys(
    requirePlainRecord(input, "calciumStateByWall"),
    COMPOSED_RHYTHM_WALL_IDS_V2,
    "calciumStateByWall",
  );
  return deepFreeze(Object.fromEntries(COMPOSED_RHYTHM_WALL_IDS_V2.map((wall) => {
    evaluateExactEventCalciumV1(input[wall], parameters[wall]);
    return [wall, [...input[wall]]];
  })) as unknown as ComposedRhythmCalciumStateByWallV2);
}

function copyAtrialDeposit(input: ComposedRhythmAtrialDepositConfigurationV2 | null, field: string): ComposedRhythmAtrialDepositConfigurationV2 | null {
  if (input === null) return null;
  requireExactKeys(
    requirePlainRecord(input, field),
    [
      "electricalToCalciumDelaySec", "leftAtrialStrength",
      "rightAtrialStrength",
    ],
    field,
  );
  return Object.freeze({
    electricalToCalciumDelaySec: requirePositiveFinite(input.electricalToCalciumDelaySec, `${field}.electricalToCalciumDelaySec`),
    leftAtrialStrength: requireNonnegativeFinite(input.leftAtrialStrength, `${field}.leftAtrialStrength`),
    rightAtrialStrength: requireNonnegativeFinite(input.rightAtrialStrength, `${field}.rightAtrialStrength`),
  });
}

function copyVentricularDeposit(input: ComposedRhythmVentricularDepositConfigurationV2): ComposedRhythmVentricularDepositConfigurationV2 {
  requireExactKeys(
    requirePlainRecord(input, "ventricularCalciumDeposit"),
    [
      "electricalToCalciumDelaySec", "lvFreeWallBaseStrength",
      "septalBaseStrength", "rvFreeWallBaseStrength",
    ],
    "ventricularCalciumDeposit",
  );
  return Object.freeze({
    electricalToCalciumDelaySec: requirePositiveFinite(input.electricalToCalciumDelaySec, "ventricularCalciumDeposit.electricalToCalciumDelaySec"),
    lvFreeWallBaseStrength: requireNonnegativeFinite(input.lvFreeWallBaseStrength, "ventricularCalciumDeposit.lvFreeWallBaseStrength"),
    septalBaseStrength: requireNonnegativeFinite(input.septalBaseStrength, "ventricularCalciumDeposit.septalBaseStrength"),
    rvFreeWallBaseStrength: requireNonnegativeFinite(input.rvFreeWallBaseStrength, "ventricularCalciumDeposit.rvFreeWallBaseStrength"),
  });
}

function copyStrengths(input: ComposedRhythmCalciumStrengthByWallV2): ComposedRhythmCalciumStrengthByWallV2 {
  requireExactKeys(
    requirePlainRecord(input, "strengthByWall"),
    COMPOSED_RHYTHM_WALL_IDS_V2,
    "strengthByWall",
  );
  return Object.freeze(Object.fromEntries(COMPOSED_RHYTHM_WALL_IDS_V2.map((wall) => [wall, requireNonnegativeFinite(input[wall], `strengthByWall.${wall}`)])) as Record<ComposedRhythmWallIdV2, number>);
}

function sortedPendingProximal(input: readonly ComposedRhythmPendingProximalAvOutputV2[]): readonly ComposedRhythmPendingProximalAvOutputV2[] {
  return Object.freeze([...input].sort((a, b) => a.proximalArrivalTimeSec - b.proximalArrivalTimeSec || codeUnitCompare(a.proximalAvOutputId, b.proximalAvOutputId)));
}

function sortedSourceImpulses(input: readonly SourceImpulseV2[]): readonly SourceImpulseV2[] {
  return Object.freeze([...input].sort((a, b) => a.activationTimeSec - b.activationTimeSec || codeUnitCompare(a.sourceImpulseId, b.sourceImpulseId)));
}

function sortedCalciumDeposits(input: readonly ComposedRhythmPendingCalciumDepositV2[]): readonly ComposedRhythmPendingCalciumDepositV2[] {
  return Object.freeze([...input].sort((a, b) => a.depositTimeSec - b.depositTimeSec || codeUnitCompare(a.depositId, b.depositId)));
}

function validateFutureSortedQueue(queue: readonly Record<string, unknown>[], timeKey: string, acceptedTimeSec: number, field: string): void {
  let previous = -Infinity;
  for (const item of queue) {
    const time = requireNonnegativeFinite(item[timeKey], `${field}.${timeKey}`);
    if (!(time > acceptedTimeSec) || time < previous) throw new Error(`${field} must be sorted and strictly future`);
    previous = time;
  }
}

function validatePendingProximalQueue(
  queue: readonly ComposedRhythmPendingProximalAvOutputV2[],
): void {
  for (const item of queue) {
    requireExactKeys(
      requirePlainRecord(item, "pending proximal AV output"),
      [
        "pendingSchemaId", "proximalAvOutputId",
        "parentCapturedAtrialActivationId", "proximalArrivalTimeSec",
      ],
      "pending proximal AV output",
    );
    if (
      item.pendingSchemaId
        !== COMPOSED_RHYTHM_PENDING_PROXIMAL_AV_OUTPUT_V2_ID
      || !Object.isFrozen(item)
    ) {
      throw new Error("pending proximal AV output schema is invalid");
    }
    requireNonemptyString(item.proximalAvOutputId, "proximalAvOutputId");
    requireNonemptyString(
      item.parentCapturedAtrialActivationId,
      "parentCapturedAtrialActivationId",
    );
  }
  validateUniqueIds(
    queue.map((item) => item.proximalAvOutputId),
    "pending proximal AV output ids",
  );
}

function validatePendingCalciumQueue(
  queue: readonly ComposedRhythmPendingCalciumDepositV2[],
): void {
  for (const deposit of queue) {
    requireExactKeys(
      requirePlainRecord(deposit, "pending calcium deposit"),
      [
        "pendingSchemaId", "depositId", "depositClass",
        "parentCapturedActivationId", "depositTimeSec", "strengthByWall",
      ],
      "pending calcium deposit",
    );
    if (
      deposit.pendingSchemaId
        !== COMPOSED_RHYTHM_PENDING_CALCIUM_DEPOSIT_V2_ID
      || !Object.isFrozen(deposit)
      || !Object.isFrozen(deposit.strengthByWall)
    ) {
      throw new Error("pending calcium deposit schema is invalid");
    }
    if (
      deposit.depositClass !== "sinus-atrial"
      && deposit.depositClass !== "pac-atrial"
      && deposit.depositClass !== "ventricular"
    ) {
      throw new Error("pending calcium deposit class is invalid");
    }
    requireNonemptyString(deposit.depositId, "depositId");
    requireNonemptyString(
      deposit.parentCapturedActivationId,
      "deposit parent captured activation id",
    );
    const strengths = copyStrengths(deposit.strengthByWall);
    if (
      deposit.depositClass === "ventricular"
        ? strengths.LA !== 0 || strengths.RA !== 0
        : strengths.LVFW !== 0 || strengths.SEP !== 0 || strengths.RVFW !== 0
    ) {
      throw new Error("pending calcium deposit wall partition is invalid");
    }
  }
  validateUniqueIds(
    queue.map((deposit) => deposit.depositId),
    "pending calcium deposit ids",
  );
}

function validateUniqueIds(ids: readonly string[], field: string): void {
  if (new Set(ids).size !== ids.length) throw new Error(`${field} must be unique`);
}

function assertCanonicalEqual(
  actual: unknown,
  expected: unknown,
  message: string,
): void {
  if (canonicalJsonStringify(actual) !== canonicalJsonStringify(expected)) {
    throw new Error(message);
  }
}

function safeCounterAdd(value: number, increment: number, field: string): number {
  const next = value + increment;
  if (!Number.isSafeInteger(next) || next < 0) throw new Error(`${field} cannot increment safely`);
  return next;
}

function framedId(namespace: string, fields: readonly (string | number)[]): string {
  return `${namespace}:${fields.map((field) => `${String(field).length}:${String(field)}`).join("")}`;
}

function safeFutureTime(timeSec: number, durationSec: number, field: string): number {
  const next = timeSec + durationSec;
  if (!Number.isFinite(next) || !(next > timeSec)) throw new Error(`${field} must be strictly future and finite`);
  return next;
}

function canonicalizePeriodicSinusVentricularDepositTimeV2(
  activation: CapturedElectricalActivationV2,
  rawDepositTimeSec: number,
  lattice: PeriodicSinusCycleBoundaryLatticeV2 | null,
): number {
  if (lattice === null || activation.sourceKind !== "av-output") {
    return rawDepositTimeSec;
  }
  const ordinal = Math.round(
    (rawDepositTimeSec - lattice.originTimeSec) / lattice.cycleLengthSec,
  );
  if (!Number.isSafeInteger(ordinal)) return rawDepositTimeSec;
  const canonicalTimeSec =
    lattice.originTimeSec + ordinal * lattice.cycleLengthSec;
  if (
    !Number.isFinite(canonicalTimeSec)
    || !(canonicalTimeSec > activation.activationTimeSec)
  ) return rawDepositTimeSec;
  const tolerance = 64 * Number.EPSILON * Math.max(
    1,
    Math.abs(rawDepositTimeSec),
    Math.abs(canonicalTimeSec),
    Math.abs(lattice.originTimeSec),
    Math.abs(lattice.cycleLengthSec),
  );
  return Math.abs(rawDepositTimeSec - canonicalTimeSec) <= tolerance
    ? canonicalTimeSec
    : rawDepositTimeSec;
}

function codeUnitCompare(left: string, right: string): number { return left < right ? -1 : left > right ? 1 : 0; }
function detachedFrozenCopy<T>(input: T): T { return deepFreeze(JSON.parse(canonicalJsonStringify(input)) as T); }
function requirePlainRecord(value: unknown, field: string): Record<string, unknown> { if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error(`${field} must be a plain object`); const prototype = Object.getPrototypeOf(value); if (prototype !== Object.prototype && prototype !== null) throw new Error(`${field} must be a plain object`); return value as Record<string, unknown>; }
function requireExactKeys(value: Record<string, unknown>, expected: readonly string[], field: string): void { const actual = Object.keys(value).sort(); const wanted = [...expected].sort(); if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) throw new Error(`${field} keys are invalid`); }
function requireNonemptyString(value: unknown, field: string): string { if (typeof value !== "string" || value.length === 0) throw new Error(`${field} must be a nonempty string`); return value; }
function requirePositiveFinite(value: unknown, field: string): number { if (typeof value !== "number" || !Number.isFinite(value) || !(value > 0)) throw new Error(`${field} must be positive finite`); return value; }
function requireNonnegativeFinite(value: unknown, field: string): number { if (typeof value !== "number" || !Number.isFinite(value) || value < 0) throw new Error(`${field} must be nonnegative finite`); return value; }
function requireNonnegativeSafeInteger(value: unknown, field: string): number { if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) throw new Error(`${field} must be a nonnegative safe integer`); return value; }
function deepFreeze<T>(value: T): T { if (value !== null && typeof value === "object") { for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child); Object.freeze(value); } return value; }

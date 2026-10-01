import type {
  AcceptedStateAuthorityV1,
  AcceptedStateValidatorV1,
} from "@/engine/core/acceptedStateAuthorityV1";
import type {
  MainWireIntegratedModelAcceptedStateV3,
} from "@/engine/myocardium/MainWireIntegratedModelTransactionV3";
import type {
  MainWireNormalAdultFiveWallMechanicsStateV1,
} from "@/engine/myocardium/experiments/MainWireNormalAdultFiveWallClosedLoopV1";
import {
  createDefaultCoronaryAutoregulationWindowControlV3,
} from "@/engine/coronary/acceptedAutoregulationWindowV3";
import {
  VENTRICULAR_BACKUP_SOURCE_ATTEMPT_RESULT_V2_ID,
  type VentricularBackupSourceAttemptResultV2,
} from "@/engine/myocardium/rhythm/acceptedVentricularBackupSourceOwnerV2";
import {
  VENTRICULAR_INTERVAL_STRENGTH_DEPOSIT_METADATA_V1_ID,
  type VentricularIntervalStrengthDepositMetadataV1,
} from "@/engine/myocardium/rhythm/acceptedVentricularIntervalStrengthOwnerV1";
import {
  ACCEPTED_AUTHORED_VENTRICULAR_PACING_REPLAY_SOURCE_STATE_V1_ID,
} from "@/engine/myocardium/rhythm/acceptedAuthoredVentricularPacingReplaySourceV1";
import {
  COMPOSED_RHYTHM_PENDING_CALCIUM_DEPOSIT_V2_ID,
  COMPOSED_RHYTHM_PENDING_PROXIMAL_AV_OUTPUT_V2_ID,
  type ComposedRhythmPendingCalciumDepositV2,
  type ComposedRhythmPendingProximalAvOutputV2,
} from "@/engine/myocardium/rhythm/acceptedComposedRhythmTransactionV2";
import {
  ELECTRICAL_CAPTURE_PRIORITY_V2,
  SOURCE_IMPULSE_V2_ID,
  type SourceImpulseV2,
} from "@/engine/myocardium/rhythm/acceptedElectricalCaptureOwnerV2";
import {
  encodeCanonicalFlatDataIntoV1,
  measureCanonicalFlatDataV1,
} from "@/engine/vnext/CanonicalFlatDataV1";
import {
  fullHotPathInvariantsEnabledV1,
} from "@/engine/hotPathIntegrityTierV1";
import {
  createTransactionalTypedStateManifestV1,
  TransactionalTypedStateImageV1,
  type TransactionalTypedStateCandidateCursorV1,
  type TransactionalTypedStateCompletionPlanV1,
  type TransactionalTypedStateCurrentCursorV1,
  type TransactionalTypedStateImageReportV1,
  type TransactionalTypedStateImageSnapshotV1,
  type TransactionalTypedStateManifestV1,
  type TransactionalTypedStatePromotionPlanV1,
  type TransactionalTypedStateRequiredWritesV1,
  type TransactionalTypedStateRetainedSlotsV1,
} from "@/engine/vnext/TransactionalTypedStateImageV1";

export const MAIN_WIRE_ACCEPTED_TYPED_STATE_AUTHORITY_V1_ID =
  "main-wire-integrated-accepted-typed-state-authority-v1" as const;
export const MAIN_WIRE_ACCEPTED_TYPED_STATE_LAYOUT_V1_ID =
  "main-wire-integrated-accepted-typed-state-v1" as const;
export const MAIN_WIRE_ACCEPTED_TYPED_STATE_LAYOUT_V1_FINGERPRINT =
  "fnv1a32-44b16062" as const;
export const MAIN_WIRE_ACCEPTED_TYPED_STATE_STRING_CAPACITY_BYTES_V1 =
  16 * 1024;
export const MAIN_WIRE_ACCEPTED_TYPED_STATE_DYNAMIC_CAPACITY_BYTES_V1 =
  0;
/**
 * Phase-reference admission bound, not yet a production scientific maximum.
 * Production cutover requires a model-owned queue-capacity argument or a
 * different storage strategy for authored extreme protocols.
 */
export const MAIN_WIRE_ACCEPTED_TYPED_STATE_PENDING_QUEUE_CAPACITY_V1 =
  16 as const;
export const MAIN_WIRE_ACCEPTED_TYPED_STATE_BUFFER_BYTES_V1 = 22_360 as const;
export const MAIN_WIRE_ACCEPTED_TYPED_STATE_CONTINUOUS_SLOT_COUNT_V1 =
  484 as const;
export const MAIN_WIRE_ACCEPTED_TYPED_STATE_NULLABLE_CONTINUOUS_SLOT_COUNT_V1 =
  6 as const;
export const MAIN_WIRE_ACCEPTED_TYPED_STATE_NULLABLE_STRING_SLOT_COUNT_V1 =
  22 as const;
export const MAIN_WIRE_ACCEPTED_TYPED_STATE_OPTIONAL_RECORD_ROOT_COUNT_V1 =
  6 as const;
export const MAIN_WIRE_ACCEPTED_TYPED_STATE_BOUNDED_ARRAY_ROOT_COUNT_V1 =
  3 as const;
export const MAIN_WIRE_ACCEPTED_TYPED_STATE_BOOLEAN_SLOT_COUNT_V1 = 2 as const;
export const MAIN_WIRE_ACCEPTED_TYPED_STATE_STRING_SLOT_COUNT_V1 = 229 as const;
export const MAIN_WIRE_ACCEPTED_TYPED_STATE_DYNAMIC_ROOT_COUNT_V1 = 0 as const;
export const MAIN_WIRE_ACCEPTED_TYPED_STATE_CONTAINER_COUNT_V1 = 163 as const;

const MAIN_WIRE_ACCEPTED_TYPED_STATE_FIXED_ARRAY_POINTERS_V1 = Object.freeze([
  "/composedRhythm/calciumStateByWall/LA",
  "/composedRhythm/calciumStateByWall/LVFW",
  "/composedRhythm/calciumStateByWall/RA",
  "/composedRhythm/calciumStateByWall/RVFW",
  "/composedRhythm/calciumStateByWall/SEP",
]);

const MAIN_WIRE_ACCEPTED_TYPED_STATE_EXTERNAL_IMMUTABLE_ROOT_POINTERS_V1 =
  Object.freeze([
    "/composedRhythm/configuration",
    "/composedRhythm/regularAtrialSourceState/configuration",
    "/composedRhythm/authoredEctopyState/configuration",
    "/composedRhythm/electricalCaptureState/configuration",
    "/composedRhythm/proximalAvGateState/configuration",
    "/composedRhythm/distalGateState/configuration",
    "/composedRhythm/ventricularBackupState/configuration",
    "/composedRhythm/ventricularBackupState/initialCaptureSeed",
    "/composedRhythm/ventricularIntervalStrengthState/configuration",
    "/composedRhythm/ventricularIntervalStrengthState/initialPriorAcceptedVentricularActivation",
    "/dynamicMechanicalSupport/inertanceProfileSnapshot",
    "/dynamicMechanicalSupport/structuralHydraulicProjection",
  ]);

const MAIN_WIRE_ACCEPTED_TYPED_STATE_CONSTANT_STRING_POINTERS_V1 =
  Object.freeze([
    "/composedRhythm/authoredEctopyState/stateSchemaId",
    "/composedRhythm/distalGateState/stateSchemaId",
    "/composedRhythm/electricalCaptureState/atrialGate/chamber",
    "/composedRhythm/electricalCaptureState/atrialGate/gateInstanceId",
    "/composedRhythm/electricalCaptureState/atrialGate/gateStateSchemaId",
    "/composedRhythm/electricalCaptureState/stateSchemaId",
    "/composedRhythm/electricalCaptureState/ventricularGate/chamber",
    "/composedRhythm/electricalCaptureState/ventricularGate/gateInstanceId",
    "/composedRhythm/electricalCaptureState/ventricularGate/gateStateSchemaId",
    "/composedRhythm/proximalAvGateState/stateSchemaId",
    "/composedRhythm/regularAtrialSourceState/stateSchemaId",
    "/composedRhythm/stateSchemaId",
    "/composedRhythm/ventricularBackupState/stateSchemaId",
    "/composedRhythm/ventricularIntervalStrengthState/lastAcceptedVentricularActivation/activationSchemaId",
    "/composedRhythm/ventricularIntervalStrengthState/lastAcceptedVentricularActivation/chamber",
    "/composedRhythm/ventricularIntervalStrengthState/lastAcceptedVentricularActivation/gateInstanceId",
    "/composedRhythm/ventricularIntervalStrengthState/stateSchemaId",
    "/coronary/circulation/transactionId",
    "/coronary/coronaryAutoregulation/desiredControl/controlId",
    "/coronary/coronaryAutoregulation/stateId",
    "/coronary/coronaryAutoregulationBinding/bindingId",
    "/coronary/coronaryAutoregulationBinding/flowObservable",
    "/coronary/coronaryAutoregulationBinding/law",
    "/coronary/coronaryAutoregulationBinding/perfusionPressureObservable",
    "/coronary/coronaryAutoregulationBinding/priorFingerprint",
    "/coronary/coronaryAutoregulationBinding/windowPolicy/interpretation",
    "/coronary/coronaryAutoregulationBinding/windowPolicy/kind",
    "/coronary/coronaryAutoregulationBinding/windowPolicy/quadrature",
    "/coronary/coronaryBinding/boundaryResolverId",
    "/coronary/coronaryBinding/collapseHydraulicsFingerprint",
    "/coronary/coronaryBinding/impMechanism",
    "/coronary/coronaryBinding/mvcReferenceSemantics",
    "/coronary/coronaryBinding/priorFingerprint",
    "/coronary/coronaryBinding/shorteningImpPriorFingerprint",
    "/coronary/coronaryBinding/topologyId",
    "/coronary/mechanics/contractId",
    "/coronary/mechanics/parameterIdentityHash",
    "/coronary/mechanics/parameterSetId",
    "/coronary/mechanics/providerId",
    "/coronary/transactionId",
    "/dynamicMechanicalSupport/networkId",
    "/dynamicMechanicalSupport/stateSchemaId",
    "/dynamicMechanicalSupport/unitSystemId",
    "/transactionId",
  ]);

const MAIN_WIRE_ACCEPTED_TYPED_STATE_EXTERNAL_IMMUTABLE_POINTERS_V1 =
  Object.freeze([
    ...MAIN_WIRE_ACCEPTED_TYPED_STATE_EXTERNAL_IMMUTABLE_ROOT_POINTERS_V1,
    ...MAIN_WIRE_ACCEPTED_TYPED_STATE_CONSTANT_STRING_POINTERS_V1,
  ]);

const MAIN_WIRE_ACCEPTED_TYPED_STATE_NULLABLE_CONTINUOUS_POINTERS_V1 =
  Object.freeze([
    "/composedRhythm/distalGateState/lastPassedProximalArrivalTimeSec",
    "/composedRhythm/distalGateState/lastVentricularImpulseTimeSec",
    "/composedRhythm/electricalCaptureState/atrialGate/lastCapturedActivationTimeSec",
    "/composedRhythm/electricalCaptureState/lastAcceptedImpulseBatchTimeSec",
    "/composedRhythm/proximalAvGateState/lastConductedAtrialActivationTimeSec",
    "/composedRhythm/proximalAvGateState/lastProximalAvOutputTimeSec",
  ]);

const MAIN_WIRE_ACCEPTED_TYPED_STATE_NULLABLE_STRING_POINTERS_V1 =
  Object.freeze([
    "/composedRhythm/electricalCaptureState/atrialGate/lastCapturedActivationId",
    "/composedRhythm/ventricularBackupState/lastAcceptedVentricularActivation/upstreamCapturedActivationId",
    "/composedRhythm/ventricularBackupState/lastIntrinsicEscapeAttemptResult/capturedActivationId",
    "/composedRhythm/ventricularBackupState/lastVviPacingAttemptResult/capturedActivationId",
    "/composedRhythm/ventricularIntervalStrengthState/lastAcceptedVentricularActivation/upstreamCapturedActivationId",
    "/composedRhythm/ventricularIntervalStrengthState/lastDepositMetadata/capturedVentricularActivation/upstreamCapturedActivationId",
    ...Array.from(
      { length: MAIN_WIRE_ACCEPTED_TYPED_STATE_PENDING_QUEUE_CAPACITY_V1 },
      (_, index) =>
        `/composedRhythm/pendingDistalVentricularImpulses/${index}/parentCapturedActivationId`,
    ),
  ]);

const MAIN_WIRE_ACCEPTED_TYPED_STATE_ATTEMPT_RESULT_TEMPLATE_V1:
VentricularBackupSourceAttemptResultV2 = Object.freeze({
  resultSchemaId: VENTRICULAR_BACKUP_SOURCE_ATTEMPT_RESULT_V2_ID,
  schemaVersion: 2,
  sourceImpulseId: "template-source-impulse",
  sourceKind: "escape",
  sourceId: "template-source",
  sourceSequence: 0,
  activationTimeSec: 0,
  outcome: "not-captured",
  capturedActivationId: null,
});

const MAIN_WIRE_ACCEPTED_TYPED_STATE_AUTOREGULATION_CONTROL_TEMPLATE_V1 =
  createDefaultCoronaryAutoregulationWindowControlV3();

const MAIN_WIRE_ACCEPTED_TYPED_STATE_AUTHORED_PACING_TEMPLATE_V1 =
  Object.freeze({
    stateSchemaId:
      ACCEPTED_AUTHORED_VENTRICULAR_PACING_REPLAY_SOURCE_STATE_V1_ID,
    schemaVersion: 1 as const,
    configuration: null,
    initializedAcceptedTimeSec: 0,
    initializedHistoryEventCount: 0,
    revision: 0,
    acceptedTimeSec: 0,
    cursor: 0,
    acceptedEmittedImpulseCount: 0,
  });

const MAIN_WIRE_ACCEPTED_TYPED_STATE_PROXIMAL_QUEUE_ITEM_TEMPLATE_V1:
ComposedRhythmPendingProximalAvOutputV2 = Object.freeze({
  pendingSchemaId: COMPOSED_RHYTHM_PENDING_PROXIMAL_AV_OUTPUT_V2_ID,
  proximalAvOutputId: "template-proximal-av-output",
  parentCapturedAtrialActivationId: "template-atrial-activation",
  proximalArrivalTimeSec: 0,
});

const MAIN_WIRE_ACCEPTED_TYPED_STATE_DISTAL_QUEUE_ITEM_TEMPLATE_V1:
SourceImpulseV2 = Object.freeze({
  impulseSchemaId: SOURCE_IMPULSE_V2_ID,
  schemaVersion: 2,
  sourceImpulseId: "template-distal-source-impulse",
  parentCapturedActivationId: null,
  chamber: "ventricular",
  sourceKind: "av-output",
  capturePriority: ELECTRICAL_CAPTURE_PRIORITY_V2["av-output"],
  sourceId: "template-distal-source",
  sourceSequence: 0,
  activationTimeSec: 0,
});

const MAIN_WIRE_ACCEPTED_TYPED_STATE_CALCIUM_QUEUE_ITEM_TEMPLATE_V1:
ComposedRhythmPendingCalciumDepositV2 = Object.freeze({
  pendingSchemaId: COMPOSED_RHYTHM_PENDING_CALCIUM_DEPOSIT_V2_ID,
  depositId: "template-calcium-deposit",
  depositClass: "ventricular",
  parentCapturedActivationId: "template-ventricular-activation",
  depositTimeSec: 0,
  strengthByWall: Object.freeze({ LA: 0, RA: 0, LVFW: 0, SEP: 0, RVFW: 0 }),
});

type AcceptedState = MainWireIntegratedModelAcceptedStateV3<
  MainWireNormalAdultFiveWallMechanicsStateV1
>;

export type MainWireAcceptedTypedStateAuthorityReportV1 = Readonly<
  Omit<TransactionalTypedStateImageReportV1, "authorityId"> & {
    authorityId: typeof MAIN_WIRE_ACCEPTED_TYPED_STATE_AUTHORITY_V1_ID;
    poisonedReason: string | null;
    directCandidateCommitCount: number;
    directCandidateExactCommitCount: number;
    directCandidateMirrorReuseCount: number;
    modelOwnedCandidateCommitCount: number;
    modelOwnedAdapterFreeCommitCount: number;
    modelOwnedExactAuditCount: number;
    lazyMirrorRehydrateCount: number;
    currentMirrorMatchesImage: boolean;
  }
>;

/** Exact model admission for the Phase 1b.2b typed accepted-state image. */
export function createMainWireAcceptedTypedStateManifestV1(
  coldAcceptedState: AcceptedState,
): TransactionalTypedStateManifestV1 {
  return createMainWireAcceptedTypedStateManifestInternalV1(coldAcceptedState);
}

/** A new exact owner may append fixed numerical state without changing the
 * published Main Wire layout. Its own compiler and validator own that layout. */
export function createMainWireExtendedAcceptedTypedStateManifestV1(
  coldAcceptedState: AcceptedState,
  extension: Readonly<{ layoutId: string; state: Readonly<Record<string, unknown>>; fixedArrayPointers?: readonly string[] }>,
): TransactionalTypedStateManifestV1 {
  if (!extension.layoutId || extension.layoutId === MAIN_WIRE_ACCEPTED_TYPED_STATE_LAYOUT_V1_ID) {
    throw new Error("An extended exact owner requires a distinct typed layout");
  }
  for (const key of Object.keys(extension.state)) {
    if (Object.hasOwn(coldAcceptedState, key)) throw new Error("Extended state shadows a hemodynamic owner");
  }
  return createMainWireAcceptedTypedStateManifestInternalV1(
    { ...coldAcceptedState, ...extension.state }, extension.layoutId, extension.fixedArrayPointers,
  );
}

function createMainWireAcceptedTypedStateManifestInternalV1(
  coldAcceptedState: AcceptedState,
  extendedLayoutId?: string,
  extendedFixedArrayPointers: readonly string[] = [],
): TransactionalTypedStateManifestV1 {
  const manifest = createTransactionalTypedStateManifestV1(
    extendedLayoutId ?? MAIN_WIRE_ACCEPTED_TYPED_STATE_LAYOUT_V1_ID,
    coldAcceptedState,
    MAIN_WIRE_ACCEPTED_TYPED_STATE_STRING_CAPACITY_BYTES_V1,
    MAIN_WIRE_ACCEPTED_TYPED_STATE_DYNAMIC_CAPACITY_BYTES_V1,
    {
      fixedArrayPointers:
        [...MAIN_WIRE_ACCEPTED_TYPED_STATE_FIXED_ARRAY_POINTERS_V1, ...extendedFixedArrayPointers],
      externalImmutablePointers:
        MAIN_WIRE_ACCEPTED_TYPED_STATE_EXTERNAL_IMMUTABLE_POINTERS_V1,
      nullableContinuousPointers:
        MAIN_WIRE_ACCEPTED_TYPED_STATE_NULLABLE_CONTINUOUS_POINTERS_V1,
      nullableStringPointers:
        MAIN_WIRE_ACCEPTED_TYPED_STATE_NULLABLE_STRING_POINTERS_V1,
      optionalRecordTemplates: [
        {
          pointer:
            "/composedRhythm/authoredVentricularPacingReplayState",
          template:
            MAIN_WIRE_ACCEPTED_TYPED_STATE_AUTHORED_PACING_TEMPLATE_V1,
        },
        {
          pointer:
            "/composedRhythm/ventricularBackupState/lastAcceptedVentricularActivation",
          template: coldAcceptedState.composedRhythm
            .ventricularIntervalStrengthState
            .initialPriorAcceptedVentricularActivation,
        },
        {
          pointer:
            "/composedRhythm/ventricularBackupState/lastIntrinsicEscapeAttemptResult",
          template:
            MAIN_WIRE_ACCEPTED_TYPED_STATE_ATTEMPT_RESULT_TEMPLATE_V1,
        },
        {
          pointer:
            "/composedRhythm/ventricularBackupState/lastVviPacingAttemptResult",
          template:
            MAIN_WIRE_ACCEPTED_TYPED_STATE_ATTEMPT_RESULT_TEMPLATE_V1,
        },
        {
          pointer:
            "/coronary/coronaryAutoregulation/windowControl",
          template:
            MAIN_WIRE_ACCEPTED_TYPED_STATE_AUTOREGULATION_CONTROL_TEMPLATE_V1,
        },
        {
          pointer:
            "/composedRhythm/ventricularIntervalStrengthState/lastDepositMetadata",
          template: createIntervalStrengthDepositMetadataTemplateV1(
            coldAcceptedState,
          ),
        },
      ],
      externalImmutableAliases: [
        {
          pointer:
            "/composedRhythm/authoredVentricularPacingReplayState/configuration",
          sourcePointer:
            "/composedRhythm/configuration/authoredVentricularPacingReplay",
        },
      ],
      boundedArrayTemplates: [
        {
          pointer: "/composedRhythm/pendingProximalAvOutputs",
          capacity: MAIN_WIRE_ACCEPTED_TYPED_STATE_PENDING_QUEUE_CAPACITY_V1,
          itemTemplate:
            MAIN_WIRE_ACCEPTED_TYPED_STATE_PROXIMAL_QUEUE_ITEM_TEMPLATE_V1,
        },
        {
          pointer: "/composedRhythm/pendingDistalVentricularImpulses",
          capacity: MAIN_WIRE_ACCEPTED_TYPED_STATE_PENDING_QUEUE_CAPACITY_V1,
          itemTemplate:
            MAIN_WIRE_ACCEPTED_TYPED_STATE_DISTAL_QUEUE_ITEM_TEMPLATE_V1,
        },
        {
          pointer: "/composedRhythm/pendingCalciumDeposits",
          capacity: MAIN_WIRE_ACCEPTED_TYPED_STATE_PENDING_QUEUE_CAPACITY_V1,
          itemTemplate:
            MAIN_WIRE_ACCEPTED_TYPED_STATE_CALCIUM_QUEUE_ITEM_TEMPLATE_V1,
        },
      ],
    },
  );
  const layout = manifest.numericalLayout;
  if (extendedLayoutId !== undefined) return manifest;
  if (
    manifest.fingerprint
      !== MAIN_WIRE_ACCEPTED_TYPED_STATE_LAYOUT_V1_FINGERPRINT
    || manifest.bufferByteLength
      !== MAIN_WIRE_ACCEPTED_TYPED_STATE_BUFFER_BYTES_V1
    || layout.continuousSlots.length
      !== MAIN_WIRE_ACCEPTED_TYPED_STATE_CONTINUOUS_SLOT_COUNT_V1
    || layout.nullableContinuousSlots.length
      !== MAIN_WIRE_ACCEPTED_TYPED_STATE_NULLABLE_CONTINUOUS_SLOT_COUNT_V1
    || layout.nullableStringSlots.length
      !== MAIN_WIRE_ACCEPTED_TYPED_STATE_NULLABLE_STRING_SLOT_COUNT_V1
    || layout.optionalRecordRoots.length
      !== MAIN_WIRE_ACCEPTED_TYPED_STATE_OPTIONAL_RECORD_ROOT_COUNT_V1
    || layout.boundedArrayRoots.length
      !== MAIN_WIRE_ACCEPTED_TYPED_STATE_BOUNDED_ARRAY_ROOT_COUNT_V1
    || layout.booleanSlots.length
      !== MAIN_WIRE_ACCEPTED_TYPED_STATE_BOOLEAN_SLOT_COUNT_V1
    || layout.stringSlots.length
      !== MAIN_WIRE_ACCEPTED_TYPED_STATE_STRING_SLOT_COUNT_V1
    || layout.externalImmutableRoots.length !== 57
    || layout.excludedDynamicRoots.length
      !== MAIN_WIRE_ACCEPTED_TYPED_STATE_DYNAMIC_ROOT_COUNT_V1
    || layout.containers.length
      !== MAIN_WIRE_ACCEPTED_TYPED_STATE_CONTAINER_COUNT_V1
  ) {
    throw new Error(
      "Main Wire accepted typed-state layout changed without a new version "
        + `(${manifest.fingerprint}; ${manifest.bufferByteLength}; `
        + `${layout.continuousSlots.length}/`
        + `${layout.nullableContinuousSlots.length}/`
        + `${layout.nullableStringSlots.length}/`
        + `${layout.optionalRecordRoots.length}/`
        + `${layout.boundedArrayRoots.length}/`
        + `${layout.booleanSlots.length}/`
        + `${layout.stringSlots.length}/${layout.excludedDynamicRoots.length}/`
        + `${layout.externalImmutableRoots.length}/${layout.containers.length})`,
    );
  }
  return manifest;
}

function createIntervalStrengthDepositMetadataTemplateV1(
  coldAcceptedState: AcceptedState,
): VentricularIntervalStrengthDepositMetadataV1 {
  const state = coldAcceptedState.composedRhythm
    .ventricularIntervalStrengthState;
  const configuration = state.configuration;
  const activation = state.initialPriorAcceptedVentricularActivation;
  return Object.freeze({
    metadataSchemaId:
      VENTRICULAR_INTERVAL_STRENGTH_DEPOSIT_METADATA_V1_ID,
    schemaVersion: 1,
    configurationId: configuration.configurationId,
    ownerInstanceId: configuration.ownerInstanceId,
    ownerRevision: 0,
    acceptedVentricularCaptureOrdinal: 0,
    previousCapturedActivationId: activation.capturedActivationId,
    previousCapturedActivationTimeSec: activation.activationTimeSec,
    capturedVentricularActivation: activation,
    intervalSec: configuration.referenceCycleLengthSec,
    recoveryFractionA: configuration.referenceRecoveryFractionA,
    normalizedSrLoadBefore: configuration.referenceNormalizedSrLoadState,
    releasedRelativeStrengthR: 1,
    returnedReleasedRelativeLoad:
      configuration.releasedLoadReturnFractionR,
    intervalInfluxRelativeLoad:
      1 - configuration.releasedLoadReturnFractionR,
    normalizedSrLoadAfter: configuration.referenceNormalizedSrLoadState,
    futureExactCalciumDepositRelativeStrength: 1,
    calciumStateMutation: "none-metadata-only",
  });
}

/**
 * Model-owned transactional authority. The solver still produces an object
 * adapter in Phase 1b.2b.2a. Direct completion proves that every typed leaf is
 * bit-equal to that privately admitted adapter before promotion; the adapter
 * may then serve as a non-authoritative solver mirror. Detached public views,
 * checkpoints, restores, and cold boundaries still rehydrate from the active
 * typed image.
 */
export class MainWireAcceptedTypedStateAuthorityV1
  implements AcceptedStateAuthorityV1<AcceptedState> {
  readonly authorityId = MAIN_WIRE_ACCEPTED_TYPED_STATE_AUTHORITY_V1_ID;

  readonly #manifest: TransactionalTypedStateManifestV1;
  readonly #image: TransactionalTypedStateImageV1<AcceptedState>;
  readonly #ownDecoded: AcceptedStateValidatorV1<AcceptedState>;
  #currentState: AcceptedState;
  #currentMirrorMatchesImage = true;
  #poisonedReason: string | null = null;
  #directCandidateCommitCount = 0;
  #directCandidateExactCommitCount = 0;
  #directCandidateMirrorReuseCount = 0;
  #modelOwnedCandidateCommitCount = 0;
  #modelOwnedAdapterFreeCommitCount = 0;
  #modelOwnedExactAuditCount = 0;
  #lazyMirrorRehydrateCount = 0;

  constructor(
    coldAcceptedState: AcceptedState,
    initialState: AcceptedState,
    validate: AcceptedStateValidatorV1<AcceptedState>,
    ownDecoded: AcceptedStateValidatorV1<AcceptedState>,
    admitCompletedMirror: AcceptedStateValidatorV1<AcceptedState>,
  ) {
    validate(initialState);
    this.#ownDecoded = ownDecoded;
    this.#manifest = createMainWireAcceptedTypedStateManifestV1(
      coldAcceptedState,
    );
    this.#image = new TransactionalTypedStateImageV1<AcceptedState>(
      this.#manifest,
      initialState,
      admitCompletedMirror,
    );
    this.#currentState = this.ownAndValidate(this.#image.rehydrateCurrent());
  }

  current(): AcceptedState {
    this.assertHealthy();
    if (!this.#currentMirrorMatchesImage) {
      this.#currentState = this.ownAndValidate(this.#image.rehydrateCurrent());
      this.#currentMirrorMatchesImage = true;
      this.#lazyMirrorRehydrateCount += 1;
    }
    return this.#currentState;
  }

  /** Immutable model-owned layout used to bind hot-path slots once. */
  manifest(): TransactionalTypedStateManifestV1 {
    this.assertHealthy();
    return this.#manifest;
  }

  snapshot(): AcceptedState {
    this.assertHealthy();
    return this.ownAndValidate(this.#image.rehydrateCurrent());
  }

  commit(candidate: AcceptedState): AcceptedState {
    this.assertHealthy();
    try {
      this.#image.stage(candidate);
      const owned = this.ownAndValidate(this.#image.rehydrateStaged());
      this.#image.promote();
      this.#currentState = owned;
      this.#currentMirrorMatchesImage = true;
      return owned;
    } catch (error) {
      this.#image.abort();
      const message = error instanceof Error ? error.message : String(error);
      this.#poisonedReason = `candidate commit failed: ${message}`;
      throw new Error(
        `Main Wire accepted typed-state authority is poisoned: `
          + this.#poisonedReason,
      );
    }
  }

  /** Begins one inactive typed transaction for a migrated state owner. */
  beginDirectCandidate(): TransactionalTypedStateCandidateCursorV1 {
    this.assertHealthy();
    return this.#image.beginCandidateFromCurrent();
  }

  /** Compiles one model-bound retained-slot plan outside the accepted loop. */
  createDirectCompletionPlan(
    retained: TransactionalTypedStateRetainedSlotsV1,
  ): TransactionalTypedStateCompletionPlanV1 {
    this.assertHealthy();
    return this.#image.createCompletionPlan(retained);
  }

  /** Compiles model-owned required-write coverage outside the accepted loop. */
  createModelOwnedPromotionPlan(
    required: TransactionalTypedStateRequiredWritesV1,
  ): TransactionalTypedStatePromotionPlanV1 {
    this.assertHealthy();
    return this.#image.createPromotionPlan(required);
  }

  /**
   * Promotes an event-free model-owned candidate without a 484-leaf object
   * comparison in the lean production tier. Full-invariant runs retain that
   * comparison as an oracle and return null on a mismatch so the caller can
   * execute exhaustive event-boundary completion.
   */
  tryCommitModelOwnedDirectCandidate(
    adapterCandidate: AcceptedState,
    promotionPlan: TransactionalTypedStatePromotionPlanV1,
    auditPlan: TransactionalTypedStateCompletionPlanV1,
  ): AcceptedState | null {
    this.assertHealthy();
    try {
      const auditEnabled = fullHotPathInvariantsEnabledV1();
      const admittedMirror = this.#image.tryPromoteCandidateWithRequiredWrites(
        adapterCandidate,
        promotionPlan,
        auditEnabled ? auditPlan : undefined,
      );
      if (admittedMirror === null) return null;
      this.#currentState = admittedMirror;
      this.#currentMirrorMatchesImage = true;
      this.#directCandidateCommitCount += 1;
      this.#directCandidateMirrorReuseCount += 1;
      this.#modelOwnedCandidateCommitCount += 1;
      if (auditEnabled) {
        this.#directCandidateExactCommitCount += 1;
        this.#modelOwnedExactAuditCount += 1;
      }
      return admittedMirror;
    } catch (error) {
      this.#image.abort();
      const message = error instanceof Error ? error.message : String(error);
      this.#poisonedReason = `model-owned candidate commit failed: ${message}`;
      throw new Error(
        `Main Wire accepted typed-state authority is poisoned: `
          + this.#poisonedReason,
      );
    }
  }

  /**
   * Atomically promotes a fully staged, model-owned typed candidate without
   * allocating an AcceptedState adapter. The caller must already have applied
   * every component-owned numerical and cross-owner seal represented by the
   * immutable promotion plan. The cached object mirror is invalidated and is
   * rehydrated only if a cold/event API subsequently requests it.
   */
  commitModelOwnedTypedCandidate(
    promotionPlan: TransactionalTypedStatePromotionPlanV1,
  ): void {
    this.assertHealthy();
    try {
      this.#image.promoteCandidateWithRequiredWrites(promotionPlan);
      this.#currentMirrorMatchesImage = false;
      this.#directCandidateCommitCount += 1;
      this.#modelOwnedCandidateCommitCount += 1;
      this.#modelOwnedAdapterFreeCommitCount += 1;
    } catch (error) {
      this.#image.abort();
      const message = error instanceof Error ? error.message : String(error);
      this.#poisonedReason =
        `adapter-free model-owned candidate commit failed: ${message}`;
      throw new Error(
        `Main Wire accepted typed-state authority is poisoned: `
          + this.#poisonedReason,
      );
    }
  }

  /**
   * Admits the still-object-backed owners without overwriting migrated slots,
   * proves the exact model-owned adapter at its accepted boundary, then
   * promotes the complete typed candidate exactly once. The retained adapter
   * is a private solver mirror only; the inactive typed image supplied every
   * promoted byte and remains the accepted-state authority.
   */
  commitDirectCandidate(
    adapterCandidate: AcceptedState,
    plan: TransactionalTypedStateCompletionPlanV1,
  ): AcceptedState {
    this.assertHealthy();
    try {
      const admittedMirror = this.#image.completeCandidateFromObject(
        adapterCandidate,
        plan,
      );
      this.#image.promote();
      this.#currentState = admittedMirror;
      this.#currentMirrorMatchesImage = true;
      this.#directCandidateCommitCount += 1;
      this.#directCandidateMirrorReuseCount += 1;
      return admittedMirror;
    } catch (error) {
      this.#image.abort();
      const message = error instanceof Error ? error.message : String(error);
      this.#poisonedReason = `direct candidate commit failed: ${message}`;
      throw new Error(
        `Main Wire accepted typed-state authority is poisoned: `
          + this.#poisonedReason,
      );
    }
  }

  /**
   * Promotes without generic object completion only when every byte already
   * equals the internally admitted adapter. A null result leaves the staged
   * transaction open for exhaustive completion at an event boundary.
   */
  tryCommitExactDirectCandidate(
    adapterCandidate: AcceptedState,
    plan: TransactionalTypedStateCompletionPlanV1,
  ): AcceptedState | null {
    this.assertHealthy();
    try {
      const admittedMirror = this.#image.matchCandidateExactlyAgainstObject(
        adapterCandidate,
        plan,
      );
      if (admittedMirror === null) return null;
      this.#image.promote();
      this.#currentState = admittedMirror;
      this.#currentMirrorMatchesImage = true;
      this.#directCandidateCommitCount += 1;
      this.#directCandidateExactCommitCount += 1;
      this.#directCandidateMirrorReuseCount += 1;
      return admittedMirror;
    } catch (error) {
      this.#image.abort();
      const message = error instanceof Error ? error.message : String(error);
      this.#poisonedReason = `exact direct candidate commit failed: ${message}`;
      throw new Error(
        `Main Wire accepted typed-state authority is poisoned: `
          + this.#poisonedReason,
      );
    }
  }

  /** Expected solver rejection abandons the inactive candidate without poison. */
  abortDirectCandidate(): void {
    this.assertHealthy();
    this.#image.abort();
  }

  report(): MainWireAcceptedTypedStateAuthorityReportV1 {
    const report = this.#image.report();
    return Object.freeze({
      ...report,
      authorityId: MAIN_WIRE_ACCEPTED_TYPED_STATE_AUTHORITY_V1_ID,
      poisonedReason: this.#poisonedReason,
      directCandidateCommitCount: this.#directCandidateCommitCount,
      directCandidateExactCommitCount: this.#directCandidateExactCommitCount,
      directCandidateMirrorReuseCount: this.#directCandidateMirrorReuseCount,
      modelOwnedCandidateCommitCount: this.#modelOwnedCandidateCommitCount,
      modelOwnedAdapterFreeCommitCount:
        this.#modelOwnedAdapterFreeCommitCount,
      modelOwnedExactAuditCount: this.#modelOwnedExactAuditCount,
      lazyMirrorRehydrateCount: this.#lazyMirrorRehydrateCount,
      currentMirrorMatchesImage: this.#currentMirrorMatchesImage,
    });
  }

  snapshotImage(): TransactionalTypedStateImageSnapshotV1 {
    this.assertHealthy();
    return this.#image.snapshot();
  }

  /** Hot model-owned reads follow the active image after every promotion. */
  currentCursor(): TransactionalTypedStateCurrentCursorV1 {
    this.assertHealthy();
    return this.#image.currentCursor();
  }

  /** Cold-boundary proof that the cached solver adapter still matches storage. */
  assertCurrentMatches(candidate: AcceptedState): void {
    this.assertHealthy();
    const authoritative = this.snapshot();
    const authoritativeBytes = canonicalBytes(authoritative);
    const candidateBytes = canonicalBytes(candidate);
    if (
      authoritativeBytes.byteLength !== candidateBytes.byteLength
      || !authoritativeBytes.every(
        (value, index) => value === candidateBytes[index],
      )
    ) {
      throw new Error(
        "Main Wire accepted typed-state adapter differs from its active image",
      );
    }
  }

  private ownAndValidate(candidate: AcceptedState): AcceptedState {
    return this.#ownDecoded(candidate);
  }

  private assertHealthy(): void {
    if (this.#poisonedReason !== null) {
      throw new Error(
        `Main Wire accepted typed-state authority is poisoned: `
          + this.#poisonedReason,
      );
    }
  }
}

function canonicalBytes(value: unknown): Uint8Array {
  const bytes = new Uint8Array(measureCanonicalFlatDataV1(value));
  const length = encodeCanonicalFlatDataIntoV1(value, bytes);
  if (length !== bytes.byteLength) {
    throw new Error("Main Wire typed-state canonical length changed");
  }
  return bytes;
}

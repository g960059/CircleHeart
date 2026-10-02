import type {
  MainWireIntegratedModelCandidateTimeLimitV3,
} from "@/engine/myocardium/MainWireIntegratedModelTransactionV3";
import type {
  CoronaryAcceptedAutoregulationStateV3,
} from "@/engine/coronary/acceptedAutoregulationWindowV3";
import {
  CORONARY_LAYER_IDS_V2,
  CORONARY_TERRITORY_IDS_V2,
} from "@/engine/coronary/typesV2";
import {
  NON_CORONARY_ACCEPTED_NUMERICAL_SOURCE_V1_ID,
  NON_CORONARY_DYNAMIC_EDGE_NAMES_V1,
  NON_CORONARY_NODE_NAMES_V1,
  NON_CORONARY_VALVE_NAMES_V1,
  type NonCoronaryAcceptedNumericalDestinationV1,
  type NonCoronaryAcceptedNumericalSourceV1,
} from "@/engine/core/nonCoronaryCirculationBackwardEulerV1";
import type {
  DynamicMechanicalSupportAcceptedStateV1,
} from "@/engine/devices/dynamicNetworkV1";
import {
  ROTARY_SUPPORT_DEVICE_IDS_V1,
  type RotarySupportDeviceIdV1,
} from "@/engine/devices/typesV1";
import {
  MAX_AUTHORED_VENTRICULAR_PACING_REPLAY_IMPULSES_PER_TRIAL_V1,
} from "@/engine/myocardium/rhythm/acceptedAuthoredVentricularPacingReplaySourceV1";
import type {
  AcceptedComposedRhythmTransactionConfigurationV2,
  AcceptedComposedRhythmTransactionCandidateV2,
  AcceptedComposedRhythmTransactionCandidateTimeLimitV2,
  ComposedRhythmCalciumParametersByWallV2,
} from "@/engine/myocardium/rhythm/acceptedComposedRhythmTransactionV2";
import type {
  CapturedPacSinusClockPolicyV1,
} from "@/engine/myocardium/rhythm/acceptedRegularAtrialSourceOwnerV1";
import type {
  MainWireFiveWallFreeCalciumDriveV1,
} from "@/engine/myocardium/mechanics/MainWireFiveWallLandTriSegProviderV1";
import {
  advanceExactEventCalciumV1,
  type ExactEventCalciumEventV1,
  type ExactEventCalciumParametersV1,
  type ExactEventCalciumStateV1,
} from "@/engine/myocardium/calcium/exactEventPrescribedCalciumV1";
import {
  MAIN_WIRE_ACCEPTED_TYPED_STATE_LAYOUT_V1_FINGERPRINT,
  MAIN_WIRE_ACCEPTED_TYPED_STATE_LAYOUT_V1_ID,
} from "@/engine/vnext/MainWireAcceptedTypedStateV1";
import type {
  TransactionalTypedStateCandidateCursorV1,
  TransactionalTypedStateCurrentCursorV1,
  TransactionalTypedStateManifestV1,
} from "@/engine/vnext/TransactionalTypedStateImageV1";

import { assertMainWireAcceptedTypedExtensionBindingV1, type MainWireAcceptedTypedExtensionBindingV1 } from "./MainWireAcceptedTypedExtensionBindingV1";

export const MAIN_WIRE_ACCEPTED_TYPED_BOUNDARY_V1_ID =
  "main-wire-integrated-accepted-typed-boundary-v1" as const;

export type MainWireAcceptedTypedClockV1 = Readonly<{
  acceptedTimeSec: number;
  revision: number;
}>;

export type MainWireAcceptedTypedPresentationStateV1 = Readonly<{
  acceptedTimeSec: number;
  revision: number;
  regularSinusCycleLengthSec: number;
  regularSinusNextActivationTimeSec: number;
  lvadFlowMlPerSec: number;
}>;

type Boundary = Readonly<{ owner: string; timeSec: number }>;

const CALCIUM_WALLS = Object.freeze([
  "LA", "LVFW", "RA", "RVFW", "SEP",
] as const);
type CalciumWall = (typeof CALCIUM_WALLS)[number];

type AuthoredScheduleContinuousBinding = Readonly<{
  acceptedEmittedImpulseCount: number;
  acceptedTimeSec: number;
  cursor: number;
  revision: number;
}>;

type RegularAtrialContinuousBinding = Readonly<{
  acceptedTimeSec: number;
  capturedPacPreserveCount: number;
  capturedPacResetCount: number;
  emittedSourceImpulseCount: number;
  nextActivationTimeSec: number;
  nextSourceSequence: number;
  revision: number;
}>;

type ResolvedRhythmContinuousBinding = Readonly<{
  acceptedAtrialCaptureCount: number;
  acceptedVentricularCaptureCount: number;
  deliveredCalciumDepositCount: number;
}>;

type DynamicMechanicalSupportContinuousBinding = Readonly<
  Record<RotarySupportDeviceIdV1, number>
>;

type ContinuousBinding = Readonly<{
  acceptedTimeSec: number;
  composedAcceptedTimeSec: number;
  authoredEctopy: AuthoredScheduleContinuousBinding;
  authoredVentricularPacing: AuthoredScheduleContinuousBinding;
  regularAtrial: RegularAtrialContinuousBinding;
  resolvedRhythm: ResolvedRhythmContinuousBinding;
  electricalCaptureAcceptedTimeSec: number;
  ventricularBackupAcceptedTimeSec: number;
  ventricularBackupRevision: number;
  autoregulationAcceptedDurationSec: number;
  autoregulationAcceptedStepCount: number;
  autoregulationQmTimeIntegral:
    Readonly<Record<(typeof CORONARY_TERRITORY_IDS_V2)[number],
      Readonly<Record<(typeof CORONARY_LAYER_IDS_V2)[number], number>>>>;
  autoregulationPerfusionPressureTimeIntegral:
    Readonly<Record<(typeof CORONARY_TERRITORY_IDS_V2)[number], number>>;
  dynamicMechanicalSupport: DynamicMechanicalSupportContinuousBinding;
  composedRevision: number;
  ventricularBackupNextIntrinsicEscapeDueTimeSec: number;
  ventricularBackupNextVviPaceDueTimeSec: number;
  coronaryAcceptedTimeSec: number;
  autoregulationWindowIndex: number;
  autoregulationWindowOriginAcceptedTimeSec: number;
  autoregulationWindowStartAcceptedTimeSec: number;
  autoregulationWindowDurationSec: number;
  autoregulationBindingOriginAcceptedTimeSec: number;
  coronaryRevision: number;
  revision: number;
}>;

type BoundedArrayBinding = Readonly<{
  pendingCalciumDeposits: number;
  pendingDistalVentricularImpulses: number;
  pendingProximalAvOutputs: number;
}>;

type NonCoronaryAcceptedNumericalBindingV1 = Readonly<{
  revision: number;
  acceptedTimeSec: number;
  totalBloodVolumeMl: number;
  nodeVolumesMl: readonly number[];
  dynamicEdgeFlowsMlPerSec: readonly number[];
  valveOpeningFractions01: readonly number[];
}>;

export type MainWireAcceptedTypedBoundaryBindingV1 = Readonly<{
  layoutId: string;
  fingerprint: string;
  continuous: ContinuousBinding;
  boundedArray: BoundedArrayBinding;
  calcium: Readonly<Record<CalciumWall, Readonly<{
    state: readonly [number, number];
  }>>>;
  nonCoronaryAcceptedNumerical: NonCoronaryAcceptedNumericalBindingV1;
  directContinuousSlots: readonly number[];
  authoredVentricularPacingContinuousSlots: readonly number[];
  regularAtrialSourceContinuousSlots: readonly number[];
  postSolverContinuousSlots: readonly number[];
}>;

/** Resolves model paths once; the accepted hot loop performs no string lookup. */
const ISSUED_BOUNDARY_BINDINGS = new WeakSet<object>();

export function createMainWireAcceptedTypedBoundaryBindingV1(
  manifest: TransactionalTypedStateManifestV1,
): MainWireAcceptedTypedBoundaryBindingV1 {
  return createBoundaryBinding(manifest);
}

export function createMainWireExtendedAcceptedTypedBoundaryBindingV1(
  manifest: TransactionalTypedStateManifestV1,
  extension: MainWireAcceptedTypedExtensionBindingV1,
): MainWireAcceptedTypedBoundaryBindingV1 {
  assertMainWireAcceptedTypedExtensionBindingV1(extension, manifest);
  return createBoundaryBinding(manifest, extension);
}

function createBoundaryBinding(
  manifest: TransactionalTypedStateManifestV1,
  extension?: MainWireAcceptedTypedExtensionBindingV1,
): MainWireAcceptedTypedBoundaryBindingV1 {
  if (extension === undefined && (
    manifest.layoutId !== MAIN_WIRE_ACCEPTED_TYPED_STATE_LAYOUT_V1_ID
    || manifest.fingerprint
      !== MAIN_WIRE_ACCEPTED_TYPED_STATE_LAYOUT_V1_FINGERPRINT
  )) {
    throw new Error("Main Wire typed boundary manifest identity is unsupported");
  }
  const continuous = Object.freeze({
    acceptedTimeSec: continuousSlot(manifest, "/acceptedTimeSec"),
    composedAcceptedTimeSec:
      continuousSlot(manifest, "/composedRhythm/acceptedTimeSec"),
    authoredEctopy: authoredScheduleBinding(
      manifest,
      "/composedRhythm/authoredEctopyState",
    ),
    authoredVentricularPacing: authoredScheduleBinding(
      manifest,
      "/composedRhythm/authoredVentricularPacingReplayState",
    ),
    regularAtrial: regularAtrialBinding(
      manifest,
      "/composedRhythm/regularAtrialSourceState",
    ),
    resolvedRhythm: Object.freeze({
      acceptedAtrialCaptureCount: continuousSlot(
        manifest,
        "/composedRhythm/acceptedAtrialCaptureCount",
      ),
      acceptedVentricularCaptureCount: continuousSlot(
        manifest,
        "/composedRhythm/acceptedVentricularCaptureCount",
      ),
      deliveredCalciumDepositCount: continuousSlot(
        manifest,
        "/composedRhythm/deliveredCalciumDepositCount",
      ),
    }),
    electricalCaptureAcceptedTimeSec: continuousSlot(
      manifest,
      "/composedRhythm/electricalCaptureState/acceptedTimeSec",
    ),
    ventricularBackupAcceptedTimeSec: continuousSlot(
      manifest,
      "/composedRhythm/ventricularBackupState/acceptedTimeSec",
    ),
    ventricularBackupRevision: continuousSlot(
      manifest,
      "/composedRhythm/ventricularBackupState/revision",
    ),
    autoregulationAcceptedDurationSec: continuousSlot(
      manifest,
      "/coronary/coronaryAutoregulation/acceptedDurationSec",
    ),
    autoregulationAcceptedStepCount: continuousSlot(
      manifest,
      "/coronary/coronaryAutoregulation/acceptedStepCount",
    ),
    autoregulationQmTimeIntegral: Object.freeze(Object.fromEntries(
      CORONARY_TERRITORY_IDS_V2.map((territoryId) => [
        territoryId,
        Object.freeze(Object.fromEntries(CORONARY_LAYER_IDS_V2.map((layerId) => [
          layerId,
          continuousSlot(
            manifest,
            "/coronary/coronaryAutoregulation/"
              + "qmTimeIntegralMlByTerritoryLayer/"
              + `${territoryId}/${layerId}`,
          ),
        ])) as Record<(typeof CORONARY_LAYER_IDS_V2)[number], number>),
      ]),
    ) as Record<(typeof CORONARY_TERRITORY_IDS_V2)[number],
      Readonly<Record<(typeof CORONARY_LAYER_IDS_V2)[number], number>>>),
    autoregulationPerfusionPressureTimeIntegral: Object.freeze(
      Object.fromEntries(CORONARY_TERRITORY_IDS_V2.map((territoryId) => [
        territoryId,
        continuousSlot(
          manifest,
          "/coronary/coronaryAutoregulation/"
            + "perfusionPressureTimeIntegralMmHgSecByTerritory/"
            + territoryId,
        ),
      ])) as Record<(typeof CORONARY_TERRITORY_IDS_V2)[number], number>,
    ),
    dynamicMechanicalSupport: Object.freeze(
      Object.fromEntries(
        ROTARY_SUPPORT_DEVICE_IDS_V1.map((deviceId) => [
          deviceId,
          continuousSlot(
            manifest,
            `/dynamicMechanicalSupport/acceptedFlowMlPerSec/${deviceId}`,
          ),
        ]),
      ) as Record<RotarySupportDeviceIdV1, number>,
    ),
    composedRevision: continuousSlot(manifest, "/composedRhythm/revision"),
    ventricularBackupNextIntrinsicEscapeDueTimeSec: continuousSlot(
      manifest,
      "/composedRhythm/ventricularBackupState/nextIntrinsicEscapeDueTimeSec",
    ),
    ventricularBackupNextVviPaceDueTimeSec: continuousSlot(
      manifest,
      "/composedRhythm/ventricularBackupState/nextVviPaceDueTimeSec",
    ),
    coronaryAcceptedTimeSec:
      continuousSlot(manifest, "/coronary/acceptedTimeSec"),
    autoregulationWindowIndex: continuousSlot(
      manifest,
      "/coronary/coronaryAutoregulation/windowIndex",
    ),
    autoregulationWindowOriginAcceptedTimeSec: continuousSlot(
      manifest,
      "/coronary/coronaryAutoregulation/windowOriginAcceptedTimeSec",
    ),
    autoregulationWindowStartAcceptedTimeSec: continuousSlot(
      manifest,
      "/coronary/coronaryAutoregulation/windowStartAcceptedTimeSec",
    ),
    autoregulationWindowDurationSec: continuousSlot(
      manifest,
      "/coronary/coronaryAutoregulationBinding/windowPolicy/durationSec",
    ),
    autoregulationBindingOriginAcceptedTimeSec: continuousSlot(
      manifest,
      "/coronary/coronaryAutoregulationBinding/windowPolicy/originAcceptedTimeSec",
    ),
    coronaryRevision: continuousSlot(manifest, "/coronary/revision"),
    revision: continuousSlot(manifest, "/revision"),
  });
  const boundedArray = Object.freeze({
    pendingCalciumDeposits:
      boundedArraySlot(manifest, "/composedRhythm/pendingCalciumDeposits"),
    pendingDistalVentricularImpulses: boundedArraySlot(
      manifest,
      "/composedRhythm/pendingDistalVentricularImpulses",
    ),
    pendingProximalAvOutputs:
      boundedArraySlot(manifest, "/composedRhythm/pendingProximalAvOutputs"),
  });
  const calcium = Object.freeze(Object.fromEntries(CALCIUM_WALLS.map((wall) => [
    wall,
    Object.freeze({
      state: Object.freeze([
        continuousSlot(
          manifest,
          `/composedRhythm/calciumStateByWall/${wall}/0`,
        ),
        continuousSlot(
          manifest,
          `/composedRhythm/calciumStateByWall/${wall}/1`,
        ),
      ]) as readonly [number, number],
    }),
  ])) as Record<CalciumWall, Readonly<{
    state: readonly [number, number];
  }>>);
  const nonCoronaryAcceptedNumerical = Object.freeze({
    revision: continuousSlot(manifest, "/coronary/circulation/revision"),
    acceptedTimeSec: continuousSlot(
      manifest,
      "/coronary/circulation/acceptedTimeSec",
    ),
    totalBloodVolumeMl: continuousSlot(
      manifest,
      "/coronary/circulation/totalBloodVolumeMl",
    ),
    nodeVolumesMl: Object.freeze(NON_CORONARY_NODE_NAMES_V1.map((name) =>
      continuousSlot(
        manifest,
        `/coronary/circulation/nodeVolumesMl/${name}`,
      ))),
    dynamicEdgeFlowsMlPerSec: Object.freeze(
      NON_CORONARY_DYNAMIC_EDGE_NAMES_V1.map((name) => continuousSlot(
        manifest,
        `/coronary/circulation/dynamicEdgeFlowsMlPerSec/${name}`,
      )),
    ),
    valveOpeningFractions01: Object.freeze(
      NON_CORONARY_VALVE_NAMES_V1.map((name) => continuousSlot(
        manifest,
        `/coronary/circulation/valveStates/${name}/leafletOpeningFraction01`,
      )),
    ),
  });
  const clockSlots = Object.freeze([
    continuous.acceptedTimeSec,
    continuous.composedAcceptedTimeSec,
    continuous.coronaryAcceptedTimeSec,
    continuous.composedRevision,
    continuous.coronaryRevision,
    continuous.revision,
  ]);
  const calciumSlots = Object.freeze(CALCIUM_WALLS.flatMap((wall) =>
    [...calcium[wall].state]));
  const authoredEctopySlots = Object.freeze([
    continuous.authoredEctopy.acceptedEmittedImpulseCount,
    continuous.authoredEctopy.acceptedTimeSec,
    continuous.authoredEctopy.cursor,
    continuous.authoredEctopy.revision,
  ]);
  const authoredVentricularPacingContinuousSlots = Object.freeze([
    continuous.authoredVentricularPacing.acceptedEmittedImpulseCount,
    continuous.authoredVentricularPacing.acceptedTimeSec,
    continuous.authoredVentricularPacing.cursor,
    continuous.authoredVentricularPacing.revision,
  ]);
  const regularAtrialSourceContinuousSlots = Object.freeze([
    continuous.regularAtrial.acceptedTimeSec,
    continuous.regularAtrial.capturedPacPreserveCount,
    continuous.regularAtrial.capturedPacResetCount,
    continuous.regularAtrial.emittedSourceImpulseCount,
    continuous.regularAtrial.nextActivationTimeSec,
    continuous.regularAtrial.nextSourceSequence,
    continuous.regularAtrial.revision,
  ]);
  const postSolverContinuousSlots = Object.freeze([
    continuous.resolvedRhythm.acceptedAtrialCaptureCount,
    continuous.resolvedRhythm.acceptedVentricularCaptureCount,
    continuous.resolvedRhythm.deliveredCalciumDepositCount,
    continuous.electricalCaptureAcceptedTimeSec,
    continuous.ventricularBackupAcceptedTimeSec,
    continuous.ventricularBackupRevision,
    continuous.autoregulationAcceptedDurationSec,
    continuous.autoregulationAcceptedStepCount,
    ...CORONARY_TERRITORY_IDS_V2.flatMap((territoryId) => [
      ...CORONARY_LAYER_IDS_V2.map(
        (layerId) => continuous.autoregulationQmTimeIntegral[territoryId][layerId],
      ),
      continuous.autoregulationPerfusionPressureTimeIntegral[territoryId],
    ]),
    ...ROTARY_SUPPORT_DEVICE_IDS_V1.map(
      (deviceId) => continuous.dynamicMechanicalSupport[deviceId],
    ),
  ]);
  const binding = Object.freeze({
    layoutId: manifest.layoutId,
    fingerprint: manifest.fingerprint,
    continuous,
    boundedArray,
    calcium,
    nonCoronaryAcceptedNumerical,
    directContinuousSlots: Object.freeze([
      ...clockSlots,
      ...calciumSlots,
      ...authoredEctopySlots,
    ]),
    authoredVentricularPacingContinuousSlots,
    regularAtrialSourceContinuousSlots,
    postSolverContinuousSlots,
  });
  ISSUED_BOUNDARY_BINDINGS.add(binding);
  return binding;
}

/**
 * Binds the live accepted typed image to the non-coronary solver read seam.
 * The solver rechecks every scalar against its admitted rollback object before
 * use, so this adapter cannot silently substitute a different accepted state.
 */
export function createMainWireAcceptedTypedNonCoronaryNumericalSourceV1(
  cursor: TransactionalTypedStateCurrentCursorV1,
  binding: MainWireAcceptedTypedBoundaryBindingV1,
): NonCoronaryAcceptedNumericalSourceV1 {
  assertCursor(cursor, binding);
  const slots = binding.nonCoronaryAcceptedNumerical;
  return Object.freeze({
    sourceId: NON_CORONARY_ACCEPTED_NUMERICAL_SOURCE_V1_ID,
    readInto(destination: NonCoronaryAcceptedNumericalDestinationV1) {
      assertCursor(cursor, binding);
      const {
        nodeVolumesMl,
        dynamicEdgeFlowsMlPerSec,
        valveOpeningFractions01,
      } = destination;
      if (
        nodeVolumesMl.length !== slots.nodeVolumesMl.length
        || dynamicEdgeFlowsMlPerSec.length
          !== slots.dynamicEdgeFlowsMlPerSec.length
        || valveOpeningFractions01.length
          !== slots.valveOpeningFractions01.length
      ) {
        throw new Error(
          "Main Wire typed non-coronary numerical destination has wrong shape",
        );
      }
      for (let index = 0; index < nodeVolumesMl.length; index += 1) {
        nodeVolumesMl[index] = cursor.readContinuous(
          slots.nodeVolumesMl[index]!,
        );
      }
      for (
        let index = 0;
        index < dynamicEdgeFlowsMlPerSec.length;
        index += 1
      ) {
        dynamicEdgeFlowsMlPerSec[index] = cursor.readContinuous(
          slots.dynamicEdgeFlowsMlPerSec[index]!,
        );
      }
      for (let index = 0; index < valveOpeningFractions01.length; index += 1) {
        valveOpeningFractions01[index] = cursor.readContinuous(
          slots.valveOpeningFractions01[index]!,
        );
      }
      destination.revision = cursor.readContinuous(slots.revision);
      destination.acceptedTimeSec = cursor.readContinuous(
        slots.acceptedTimeSec,
      );
      destination.totalBloodVolumeMl = cursor.readContinuous(
        slots.totalBloodVolumeMl,
      );
    },
  });
}

/** Reads the authoritative outer clock without rebuilding the object graph. */
export function readMainWireAcceptedTypedClockV1(
  cursor: TransactionalTypedStateCurrentCursorV1,
  binding: MainWireAcceptedTypedBoundaryBindingV1,
): MainWireAcceptedTypedClockV1 {
  assertCursor(cursor, binding);
  const f64 = binding.continuous;
  const acceptedTimeSec = finiteNonnegative(
    cursor.readContinuous(f64.acceptedTimeSec),
    "outer accepted time",
  );
  const revision = nonnegativeSafeInteger(
    cursor.readContinuous(f64.revision),
    "outer revision",
  );
  const composedAcceptedTimeSec = cursor.readContinuous(
    f64.composedAcceptedTimeSec,
  );
  const coronaryAcceptedTimeSec = cursor.readContinuous(
    f64.coronaryAcceptedTimeSec,
  );
  const composedRevision = cursor.readContinuous(f64.composedRevision);
  const coronaryRevision = cursor.readContinuous(f64.coronaryRevision);
  if (
    composedAcceptedTimeSec !== acceptedTimeSec
    || coronaryAcceptedTimeSec !== acceptedTimeSec
    || composedRevision !== revision
    || coronaryRevision !== revision
  ) {
    throw new Error("Main Wire typed accepted owner clocks diverged");
  }
  return Object.freeze({ acceptedTimeSec, revision });
}

/** Minimal accepted state needed by the complete selected-output catalog. */
export function readMainWireAcceptedTypedPresentationStateV1(
  cursor: TransactionalTypedStateCurrentCursorV1,
  binding: MainWireAcceptedTypedBoundaryBindingV1,
  configuration: AcceptedComposedRhythmTransactionConfigurationV2,
): MainWireAcceptedTypedPresentationStateV1 {
  const clock = readMainWireAcceptedTypedClockV1(cursor, binding);
  if (
    configuration.atrialSource.mode !== "regular"
    || configuration.atrialSource.regularSourceConfiguration.rhythmClass
      !== "sinus"
  ) {
    throw new Error(
      "Main Wire typed presentation supports only regular sinus rhythm",
    );
  }
  const cycleLengthSec = positiveFinite(
    configuration.atrialSource.regularSourceConfiguration.cycleLengthSec,
    "regular sinus cycle length",
  );
  const nextActivationTimeSec = finiteNonnegative(
    cursor.readContinuous(
      binding.continuous.regularAtrial.nextActivationTimeSec,
    ),
    "regular sinus next activation time",
  );
  if (!(nextActivationTimeSec > clock.acceptedTimeSec)) {
    throw new Error(
      "Main Wire typed regular sinus activation must remain future",
    );
  }
  const lvadFlowMlPerSec = finiteNumber(
    cursor.readContinuous(binding.continuous.dynamicMechanicalSupport.LVAD),
    "LVAD accepted flow",
  );
  return Object.freeze({
    acceptedTimeSec: clock.acceptedTimeSec,
    revision: clock.revision,
    regularSinusCycleLengthSec: cycleLengthSec,
    regularSinusNextActivationTimeSec: nextActivationTimeSec,
    lvadFlowMlPerSec,
  });
}

/** Writes the exact six-slot outer/composed/coronary clock tuple. */
export function stageMainWireAcceptedTypedClockCandidateV1(
  current: TransactionalTypedStateCurrentCursorV1,
  candidate: TransactionalTypedStateCandidateCursorV1,
  binding: MainWireAcceptedTypedBoundaryBindingV1,
  candidateTimeSec: number,
): MainWireAcceptedTypedClockV1 {
  assertCursor(current, binding);
  assertCandidateCursor(candidate, binding);
  const previous = readMainWireAcceptedTypedClockV1(current, binding);
  const f64 = binding.continuous;
  const acceptedTimeSec = finiteNonnegative(
    candidateTimeSec,
    "clock candidate time",
  );
  if (!(acceptedTimeSec > previous.acceptedTimeSec)) {
    throw new Error("Main Wire typed clock candidate must advance");
  }
  if (previous.revision === Number.MAX_SAFE_INTEGER) {
    throw new Error("Main Wire typed clock revision cannot increment safely");
  }
  const revision = previous.revision + 1;
  candidate.writeContinuous(f64.acceptedTimeSec, acceptedTimeSec);
  candidate.writeContinuous(f64.composedAcceptedTimeSec, acceptedTimeSec);
  candidate.writeContinuous(f64.coronaryAcceptedTimeSec, acceptedTimeSec);
  candidate.writeContinuous(f64.revision, revision);
  candidate.writeContinuous(f64.composedRevision, revision);
  candidate.writeContinuous(f64.coronaryRevision, revision);
  return Object.freeze({ acceptedTimeSec, revision });
}

/**
 * Determines the next accepted boundary from the active typed image. This is
 * the first scheduling path that no longer treats the rehydrated legacy state
 * object as authority. Dynamic queues are decoded independently from their
 * bounded slots; the rest are fixed-offset reads.
 */
export function limitMainWireAcceptedTypedCandidateTimeV1(
  cursor: TransactionalTypedStateCurrentCursorV1,
  binding: MainWireAcceptedTypedBoundaryBindingV1,
  requestedCandidateTimeSec: number,
  configuration: AcceptedComposedRhythmTransactionConfigurationV2,
  externalAfNextBoundaryTimeSec: number | null,
): MainWireIntegratedModelCandidateTimeLimitV3 {
  const clock = readMainWireAcceptedTypedClockV1(cursor, binding);
  const f64 = binding.continuous;
  const requestedCandidateTime = finiteNonnegative(
    requestedCandidateTimeSec,
    "requested candidate time",
  );
  if (!(requestedCandidateTime > clock.acceptedTimeSec)) {
    throw new Error("Main Wire typed requested endpoint must advance");
  }

  const windowIndex = nonnegativeSafeInteger(
    cursor.readContinuous(f64.autoregulationWindowIndex),
    "autoregulation window index",
  );
  const stateWindowOrigin = finiteNonnegative(
    cursor.readContinuous(f64.autoregulationWindowOriginAcceptedTimeSec),
    "autoregulation state window origin",
  );
  const bindingWindowOrigin = finiteNonnegative(
    cursor.readContinuous(f64.autoregulationBindingOriginAcceptedTimeSec),
    "autoregulation binding window origin",
  );
  const windowDurationSec = positiveFinite(
    cursor.readContinuous(f64.autoregulationWindowDurationSec),
    "autoregulation window duration",
  );
  if (stateWindowOrigin !== bindingWindowOrigin) {
    throw new Error("Main Wire typed autoregulation origins diverged");
  }
  const expectedWindowStart = bindingWindowOrigin
    + windowIndex * windowDurationSec;
  if (
    cursor.readContinuous(f64.autoregulationWindowStartAcceptedTimeSec)
      !== expectedWindowStart
  ) {
    throw new Error("Main Wire typed autoregulation window start diverged");
  }
  const windowEnd = bindingWindowOrigin
    + (windowIndex + 1) * windowDurationSec;
  const windowTolerance = timeTolerance(
    windowEnd,
    clock.acceptedTimeSec,
  );
  const windowRemaining = windowEnd - clock.acceptedTimeSec;
  if (windowRemaining < -windowTolerance) {
    throw new Error("Main Wire typed accepted clock passed its coronary window");
  }
  const coronaryWindowMaximumStepSec = windowRemaining <= windowTolerance
    ? 0
    : windowRemaining;
  const requestedStepSec = requestedCandidateTime - clock.acceptedTimeSec;
  const tolerance = timeTolerance(clock.acceptedTimeSec, requestedStepSec);
  const clippedByCoronaryWindow =
    coronaryWindowMaximumStepSec < requestedStepSec - tolerance;
  const coronaryCappedEndTimeSec = clippedByCoronaryWindow
    ? clock.acceptedTimeSec + coronaryWindowMaximumStepSec
    : requestedCandidateTime;
  if (!(coronaryCappedEndTimeSec > clock.acceptedTimeSec)) {
    throw new Error("Main Wire typed coronary-capped step must be positive");
  }

  const rhythm = limitTypedRhythmBoundary(
    cursor,
    binding,
    clock.acceptedTimeSec,
    coronaryCappedEndTimeSec,
    configuration,
    externalAfNextBoundaryTimeSec,
  );
  const boundaryTime = rhythm.boundaryTimeSec;
  return Object.freeze({
    requestedCandidateTimeSec: requestedCandidateTime,
    coronaryWindowMaximumStepSec,
    coronaryCappedEndTimeSec,
    rhythm,
    candidateTimeSec: rhythm.candidateTimeSec,
    clippedByCoronaryWindow,
    clippedByRhythmBoundary:
      boundaryTime !== null
      && boundaryTime < coronaryCappedEndTimeSec - tolerance,
    rhythmBoundaryTimeSec: boundaryTime,
    rhythmBoundaryOwners: rhythm.boundaryOwners,
    coronaryWindowAndRhythmBoundaryTie:
      boundaryTime !== null
      && boundaryTime === coronaryCappedEndTimeSec
      && coronaryWindowMaximumStepSec <= requestedStepSec + tolerance,
  });
}

/** Exact-event calcium readback from ten fixed state slots. */
export function evaluateMainWireAcceptedTypedCalciumDriveV1(
  cursor: TransactionalTypedStateCurrentCursorV1,
  binding: MainWireAcceptedTypedBoundaryBindingV1,
  parametersByWall: ComposedRhythmCalciumParametersByWallV2,
): MainWireFiveWallFreeCalciumDriveV1 {
  assertCursor(cursor, binding);
  const values = Object.fromEntries(
    CALCIUM_WALLS.map((wall) => {
      const slots = binding.calcium[wall];
      const riseDrive = cursor.readContinuous(slots.state[0]);
      const decayDrive = cursor.readContinuous(slots.state[1]);
      const parameters = parametersByWall[wall];
      const gain = parameters.calciumGainUMPerUnitDrive;
      const calciumRestUM = parameters.calciumRestUM;
      const freeCalciumUM = calciumRestUM + gain * (decayDrive - riseDrive);
      if (!Number.isFinite(freeCalciumUM) || freeCalciumUM < 0) {
        throw new Error(`Main Wire typed ${wall} calcium is invalid`);
      }
      return [wall, freeCalciumUM];
    }),
  ) as MainWireFiveWallFreeCalciumDriveV1["freeCalciumUMByWall"];
  return Object.freeze({ freeCalciumUMByWall: Object.freeze(values) });
}

/**
 * First direct state-owner write: exact-event calcium advances from fixed
 * current slots into a generation-bound inactive candidate cursor. Other
 * owners remain byte-identical until their own typed transaction runs.
 */
export function stageMainWireAcceptedTypedCalciumCandidateV1(
  current: TransactionalTypedStateCurrentCursorV1,
  candidate: TransactionalTypedStateCandidateCursorV1,
  binding: MainWireAcceptedTypedBoundaryBindingV1,
  candidateTimeSec: number,
  parametersByWall: ComposedRhythmCalciumParametersByWallV2,
): MainWireFiveWallFreeCalciumDriveV1 {
  assertCursor(current, binding);
  assertCandidateCursor(candidate, binding);
  const f64 = binding.continuous;
  const startTimeSec = finiteNonnegative(
    current.readContinuous(f64.composedAcceptedTimeSec),
    "calcium start time",
  );
  const endTimeSec = finiteNonnegative(
    candidateTimeSec,
    "calcium candidate time",
  );
  if (!(endTimeSec > startTimeSec)) {
    throw new Error("Main Wire typed calcium candidate must advance");
  }
  const pendingDeposits = requiredArray(
    current.readBoundedArray(binding.boundedArray.pendingCalciumDeposits),
    "pending calcium deposits",
  );

  const freeCalciumUMByWall = {} as Record<CalciumWall, number>;
  for (const wall of CALCIUM_WALLS) {
    const slots = binding.calcium[wall];
    const state = Object.freeze([
      current.readContinuous(slots.state[0]),
      current.readContinuous(slots.state[1]),
    ]) as ExactEventCalciumStateV1;
    const parameters: ExactEventCalciumParametersV1 = parametersByWall[wall];
    const events = pendingDeposits.flatMap((deposit): ExactEventCalciumEventV1[] => {
      const record = requiredRecord(deposit, "pending calcium deposit");
      const depositTimeSec = numberProperty(
        record,
        "depositTimeSec",
        "pending calcium deposit",
      );
      if (depositTimeSec !== endTimeSec) return [];
      const strengths = requiredRecord(
        ownValue(record, "strengthByWall"),
        "pending calcium strengths",
      );
      return [Object.freeze({
        timeSec: depositTimeSec,
        strength: finiteNonnegative(
          ownValue(strengths, wall),
          `pending ${wall} calcium strength`,
        ),
      })];
    });
    const next = advanceExactEventCalciumV1(
      state,
      startTimeSec,
      endTimeSec,
      events,
      parameters,
    );
    candidate.writeContinuous(slots.state[0], next[0]);
    candidate.writeContinuous(slots.state[1], next[1]);
    const freeCalciumUM = parameters.calciumRestUM
      + parameters.calciumGainUMPerUnitDrive * (next[1] - next[0]);
    if (!Number.isFinite(freeCalciumUM) || freeCalciumUM < 0) {
      throw new Error(`Main Wire typed candidate ${wall} calcium is invalid`);
    }
    freeCalciumUMByWall[wall] = freeCalciumUM;
  }
  return Object.freeze({
    freeCalciumUMByWall: Object.freeze(freeCalciumUMByWall),
  });
}

/** Advances the two finite authored schedule cursors without owner objects. */
export function stageMainWireAcceptedTypedAuthoredScheduleCandidateV1(
  current: TransactionalTypedStateCurrentCursorV1,
  candidate: TransactionalTypedStateCandidateCursorV1,
  binding: MainWireAcceptedTypedBoundaryBindingV1,
  candidateTimeSec: number,
  configuration: AcceptedComposedRhythmTransactionConfigurationV2,
): void {
  assertCursor(current, binding);
  assertCandidateCursor(candidate, binding);
  const acceptedTimeSec = finiteNonnegative(
    current.readContinuous(binding.continuous.composedAcceptedTimeSec),
    "authored schedule accepted time",
  );
  const candidateTime = finiteNonnegative(
    candidateTimeSec,
    "authored schedule candidate time",
  );
  if (!(candidateTime > acceptedTimeSec)) {
    throw new Error("Main Wire typed authored schedule candidate must advance");
  }
  stageAuthoredScheduleCandidate(
    current,
    candidate,
    binding.continuous.authoredEctopy,
    configuration.authoredEctopySchedule.events,
    acceptedTimeSec,
    candidateTime,
    "authored ectopy",
    null,
  );
  if (configuration.authoredVentricularPacingReplay !== null) {
    stageAuthoredScheduleCandidate(
      current,
      candidate,
      binding.continuous.authoredVentricularPacing,
      configuration.authoredVentricularPacingReplay.events,
      acceptedTimeSec,
      candidateTime,
      "authored ventricular pacing replay",
      MAX_AUTHORED_VENTRICULAR_PACING_REPLAY_IMPULSES_PER_TRIAL_V1,
    );
  }
}

/** Advances the regular atrial clock after capture resolves any PAC policy. */
export function stageMainWireAcceptedTypedRegularAtrialCandidateV1(
  current: TransactionalTypedStateCurrentCursorV1,
  candidate: TransactionalTypedStateCandidateCursorV1,
  binding: MainWireAcceptedTypedBoundaryBindingV1,
  candidateTimeSec: number,
  configuration: AcceptedComposedRhythmTransactionConfigurationV2,
  capturedPacSinusClockPolicy: CapturedPacSinusClockPolicyV1,
): void {
  assertCursor(current, binding);
  assertCandidateCursor(candidate, binding);
  if (configuration.atrialSource.mode !== "regular") {
    if (capturedPacSinusClockPolicy !== null) {
      throw new Error(
        "Main Wire typed external atrial source cannot apply a PAC policy",
      );
    }
    return;
  }
  const slots = binding.continuous.regularAtrial;
  const acceptedTimeSec = finiteNonnegative(
    current.readContinuous(slots.acceptedTimeSec),
    "regular atrial accepted time",
  );
  const composedAcceptedTimeSec = finiteNonnegative(
    current.readContinuous(binding.continuous.composedAcceptedTimeSec),
    "regular atrial composed accepted time",
  );
  if (acceptedTimeSec !== composedAcceptedTimeSec) {
    throw new Error("Main Wire typed regular atrial clock diverged");
  }
  const candidateTime = finiteNonnegative(
    candidateTimeSec,
    "regular atrial candidate time",
  );
  if (!(candidateTime > acceptedTimeSec)) {
    throw new Error("Main Wire typed regular atrial candidate must advance");
  }
  const nextActivationTimeSec = finiteNonnegative(
    current.readContinuous(slots.nextActivationTimeSec),
    "regular atrial next activation time",
  );
  if (
    !(nextActivationTimeSec > acceptedTimeSec)
    || candidateTime > nextActivationTimeSec
  ) {
    throw new Error(
      "Main Wire typed regular atrial candidate crossed its activation",
    );
  }
  if (
    capturedPacSinusClockPolicy !== null
    && capturedPacSinusClockPolicy !== "reset"
    && capturedPacSinusClockPolicy !== "preserve"
  ) {
    throw new Error("Main Wire typed regular atrial PAC policy is invalid");
  }
  const regularConfiguration =
    configuration.atrialSource.regularSourceConfiguration;
  if (
    capturedPacSinusClockPolicy !== null
    && regularConfiguration.rhythmClass !== "sinus"
  ) {
    throw new Error(
      "Main Wire typed flutter source cannot apply a PAC clock policy",
    );
  }
  const due = candidateTime === nextActivationTimeSec;
  const revision = incrementableCounter(
    current.readContinuous(slots.revision),
    "regular atrial revision",
  );
  const nextSourceSequence = incrementableCounter(
    current.readContinuous(slots.nextSourceSequence),
    "regular atrial next source sequence",
  );
  const emittedSourceImpulseCount = incrementableCounter(
    current.readContinuous(slots.emittedSourceImpulseCount),
    "regular atrial emitted impulse count",
  );
  const capturedPacResetCount = incrementableCounter(
    current.readContinuous(slots.capturedPacResetCount),
    "regular atrial PAC reset count",
  );
  const capturedPacPreserveCount = incrementableCounter(
    current.readContinuous(slots.capturedPacPreserveCount),
    "regular atrial PAC preserve count",
  );
  const reset = capturedPacSinusClockPolicy === "reset";
  const candidateNextActivationTimeSec = due || reset
    ? finiteFutureTime(
        candidateTime,
        regularConfiguration.cycleLengthSec,
        "regular atrial next activation time",
      )
    : nextActivationTimeSec;
  candidate.writeContinuous(slots.acceptedTimeSec, candidateTime);
  candidate.writeContinuous(
    slots.capturedPacPreserveCount,
    capturedPacPreserveCount
      + (capturedPacSinusClockPolicy === "preserve" ? 1 : 0),
  );
  candidate.writeContinuous(
    slots.capturedPacResetCount,
    capturedPacResetCount + (reset ? 1 : 0),
  );
  candidate.writeContinuous(
    slots.emittedSourceImpulseCount,
    emittedSourceImpulseCount + (due ? 1 : 0),
  );
  candidate.writeContinuous(
    slots.nextActivationTimeSec,
    candidateNextActivationTimeSec,
  );
  candidate.writeContinuous(
    slots.nextSourceSequence,
    nextSourceSequence + (due ? 1 : 0),
  );
  candidate.writeContinuous(slots.revision, revision + 1);
}

/**
 * Emits the seven numerical values that become known only after the coupled
 * object solver accepts its candidate. This does not solve either owner a
 * second time: it verifies the accepted rhythm lineage and copies the exact
 * solver-owned rotary flows into fixed typed slots.
 */
export function stageMainWireAcceptedTypedResolvedCandidateV1(
  current: TransactionalTypedStateCurrentCursorV1,
  candidate: TransactionalTypedStateCandidateCursorV1,
  binding: MainWireAcceptedTypedBoundaryBindingV1,
  rhythmCandidate: AcceptedComposedRhythmTransactionCandidateV2,
  mechanicalSupportCandidate: DynamicMechanicalSupportAcceptedStateV1,
): void {
  assertCursor(current, binding);
  assertCandidateCursor(candidate, binding);

  const rhythm = binding.continuous.resolvedRhythm;
  const acceptedTimeSec = finiteNonnegative(
    current.readContinuous(binding.continuous.composedAcceptedTimeSec),
    "resolved rhythm accepted time",
  );
  const baseRevision = nonnegativeSafeInteger(
    current.readContinuous(binding.continuous.composedRevision),
    "resolved rhythm base revision",
  );
  if (rhythmCandidate.startTimeSec !== acceptedTimeSec) {
    throw new Error("Main Wire typed resolved rhythm start time diverged");
  }
  if (rhythmCandidate.baseRevision !== baseRevision) {
    throw new Error("Main Wire typed resolved rhythm base revision diverged");
  }
  if (
    baseRevision === Number.MAX_SAFE_INTEGER
    || rhythmCandidate.candidateRevision !== baseRevision + 1
  ) {
    throw new Error("Main Wire typed resolved rhythm revision diverged");
  }

  const acceptedAtrialCaptureCount = safeCounterAdd(
    current.readContinuous(rhythm.acceptedAtrialCaptureCount),
    rhythmCandidate.capturedAtrialActivation === null ? 0 : 1,
    "accepted atrial capture count",
  );
  const acceptedVentricularCaptureCount = safeCounterAdd(
    current.readContinuous(rhythm.acceptedVentricularCaptureCount),
    rhythmCandidate.capturedVentricularActivation === null ? 0 : 1,
    "accepted ventricular capture count",
  );
  const deliveredCalciumDepositCount = safeCounterAdd(
    current.readContinuous(rhythm.deliveredCalciumDepositCount),
    requiredArray(
      rhythmCandidate.deliveredCalciumDeposits,
      "delivered calcium deposits",
    ).length,
    "delivered calcium deposit count",
  );
  if (
    rhythmCandidate.candidateState.acceptedAtrialCaptureCount
      !== acceptedAtrialCaptureCount
    || rhythmCandidate.candidateState.acceptedVentricularCaptureCount
      !== acceptedVentricularCaptureCount
    || rhythmCandidate.candidateState.deliveredCalciumDepositCount
      !== deliveredCalciumDepositCount
  ) {
    throw new Error("Main Wire typed resolved rhythm counters diverged");
  }
  candidate.writeContinuous(
    rhythm.acceptedAtrialCaptureCount,
    acceptedAtrialCaptureCount,
  );
  candidate.writeContinuous(
    rhythm.acceptedVentricularCaptureCount,
    acceptedVentricularCaptureCount,
  );
  candidate.writeContinuous(
    rhythm.deliveredCalciumDepositCount,
    deliveredCalciumDepositCount,
  );

  const flowRecord = requiredRecord(
    mechanicalSupportCandidate.acceptedFlowMlPerSec,
    "dynamic mechanical support accepted flows",
  );
  assertExactRecordKeys(
    flowRecord,
    ROTARY_SUPPORT_DEVICE_IDS_V1,
    "dynamic mechanical support accepted flows",
  );
  for (const deviceId of ROTARY_SUPPORT_DEVICE_IDS_V1) {
    candidate.writeContinuous(
      binding.continuous.dynamicMechanicalSupport[deviceId],
      finiteNumber(
        ownValue(flowRecord, deviceId),
        `dynamic mechanical support ${deviceId} accepted flow`,
      ),
    );
  }
}

/**
 * Completes the fixed post-solver owner slots for a strictly ordinary,
 * device-off step. Discrete queues and nullable event records were copied
 * into the inactive image and must have no boundary at this candidate time.
 */
export function stageMainWireAcceptedTypedOrdinaryPostSolverCandidateV1(
  current: TransactionalTypedStateCurrentCursorV1,
  candidate: TransactionalTypedStateCandidateCursorV1,
  binding: MainWireAcceptedTypedBoundaryBindingV1,
  candidateClock: MainWireAcceptedTypedClockV1,
  autoregulation: CoronaryAcceptedAutoregulationStateV3,
): void {
  assertCursor(current, binding);
  assertCandidateCursor(candidate, binding);
  const currentClock = readMainWireAcceptedTypedClockV1(current, binding);
  if (
    candidateClock.acceptedTimeSec <= currentClock.acceptedTimeSec
    || candidateClock.revision !== currentClock.revision + 1
  ) {
    throw new Error("Main Wire typed ordinary candidate clock diverged");
  }
  const slots = binding.continuous;
  const rhythm = slots.resolvedRhythm;
  for (const [slot, label] of [
    [rhythm.acceptedAtrialCaptureCount, "atrial capture count"],
    [rhythm.acceptedVentricularCaptureCount, "ventricular capture count"],
    [rhythm.deliveredCalciumDepositCount, "calcium deposit count"],
  ] as const) {
    candidate.writeContinuous(
      slot,
      nonnegativeSafeInteger(current.readContinuous(slot), label),
    );
  }
  candidate.writeContinuous(
    slots.electricalCaptureAcceptedTimeSec,
    candidateClock.acceptedTimeSec,
  );
  candidate.writeContinuous(
    slots.ventricularBackupAcceptedTimeSec,
    candidateClock.acceptedTimeSec,
  );
  candidate.writeContinuous(
    slots.ventricularBackupRevision,
    candidateClock.revision,
  );
  for (const deviceId of ROTARY_SUPPORT_DEVICE_IDS_V1) {
    const slot = slots.dynamicMechanicalSupport[deviceId];
    if (current.readContinuous(slot) !== 0) {
      throw new Error(
        `Main Wire typed ordinary ${deviceId} support must be off`,
      );
    }
    candidate.writeContinuous(slot, 0);
  }
  stageAutoregulationCandidate(candidate, binding, autoregulation);
}

/**
 * Stages the continuously changing rhythm clocks and accepted coronary-window
 * integrals. Discrete rhythm queues, optional event records, tone changes,
 * and window rollover metadata remain on event-boundary completion.
 */
export function stageMainWireAcceptedTypedContinuousOwnerCandidateV1(
  candidate: TransactionalTypedStateCandidateCursorV1,
  binding: MainWireAcceptedTypedBoundaryBindingV1,
  rhythmCandidate: AcceptedComposedRhythmTransactionCandidateV2,
  autoregulation: CoronaryAcceptedAutoregulationStateV3,
): void {
  assertCandidateCursor(candidate, binding);
  const state = rhythmCandidate.candidateState;
  if (
    state.acceptedTimeSec !== rhythmCandidate.candidateTimeSec
    || state.revision !== rhythmCandidate.candidateRevision
    || state.electricalCaptureState.acceptedTimeSec !== state.acceptedTimeSec
    || state.ventricularBackupState.acceptedTimeSec !== state.acceptedTimeSec
    || state.ventricularBackupState.revision !== state.revision
  ) {
    throw new Error("Main Wire typed continuous rhythm owner clocks diverged");
  }
  const slots = binding.continuous;
  candidate.writeContinuous(
    slots.electricalCaptureAcceptedTimeSec,
    state.electricalCaptureState.acceptedTimeSec,
  );
  candidate.writeContinuous(
    slots.ventricularBackupAcceptedTimeSec,
    state.ventricularBackupState.acceptedTimeSec,
  );
  candidate.writeContinuous(
    slots.ventricularBackupRevision,
    state.ventricularBackupState.revision,
  );
  stageAutoregulationCandidate(candidate, binding, autoregulation);
}

function stageAutoregulationCandidate(
  candidate: TransactionalTypedStateCandidateCursorV1,
  binding: MainWireAcceptedTypedBoundaryBindingV1,
  autoregulation: CoronaryAcceptedAutoregulationStateV3,
): void {
  const slots = binding.continuous;
  candidate.writeContinuous(
    slots.autoregulationAcceptedDurationSec,
    finiteNonnegative(
      autoregulation.acceptedDurationSec,
      "autoregulation accepted duration",
    ),
  );
  candidate.writeContinuous(
    slots.autoregulationAcceptedStepCount,
    nonnegativeSafeInteger(
      autoregulation.acceptedStepCount,
      "autoregulation accepted step count",
    ),
  );
  for (const territoryId of CORONARY_TERRITORY_IDS_V2) {
    for (const layerId of CORONARY_LAYER_IDS_V2) {
      candidate.writeContinuous(
        slots.autoregulationQmTimeIntegral[territoryId][layerId],
        finiteNumber(
          autoregulation.qmTimeIntegralMlByTerritoryLayer[territoryId][layerId],
          `autoregulation ${territoryId}/${layerId} Qm integral`,
        ),
      );
    }
    candidate.writeContinuous(
      slots.autoregulationPerfusionPressureTimeIntegral[territoryId],
      finiteNumber(
        autoregulation.perfusionPressureTimeIntegralMmHgSecByTerritory[
          territoryId
        ],
        `autoregulation ${territoryId} pressure integral`,
      ),
    );
  }
}

function limitTypedRhythmBoundary(
  cursor: TransactionalTypedStateCurrentCursorV1,
  binding: MainWireAcceptedTypedBoundaryBindingV1,
  acceptedTimeSec: number,
  requestedCandidateTimeSec: number,
  configuration: AcceptedComposedRhythmTransactionConfigurationV2,
  externalAfNextBoundaryTimeSec: number | null,
): AcceptedComposedRhythmTransactionCandidateTimeLimitV2 {
  const boundaries: Boundary[] = [];
  const atrialSourceMode = configuration.atrialSource.mode;
  if (atrialSourceMode === "regular") {
    boundaries.push(boundary(
      "regular-atrial-source",
      cursor.readContinuous(
        binding.continuous.regularAtrial.nextActivationTimeSec,
      ),
      acceptedTimeSec,
    ));
    if (externalAfNextBoundaryTimeSec !== null) {
      throw new Error("Main Wire typed regular atrial mode rejects external AF boundary");
    }
  } else if (atrialSourceMode === "external-af") {
    boundaries.push(boundary(
      "external-af",
      finiteNonnegative(
        externalAfNextBoundaryTimeSec,
        "external AF next boundary",
      ),
      acceptedTimeSec,
    ));
  } else {
    throw new Error("Main Wire typed atrial source mode is unsupported");
  }

  const authoredEctopyEvents = requiredArray(
    configuration.authoredEctopySchedule.events,
    "authored ectopy events",
  );
  const authoredEctopyCursor = nonnegativeSafeInteger(
    cursor.readContinuous(binding.continuous.authoredEctopy.cursor),
    "authored ectopy cursor",
  );
  const ectopy = authoredEctopyEvents[authoredEctopyCursor];
  if (ectopy !== undefined) {
    boundaries.push(boundary(
      "authored-ectopy",
      numberProperty(ectopy, "activationTimeSec", "authored ectopy event"),
      acceptedTimeSec,
    ));
  }

  const pacingConfiguration = configuration.authoredVentricularPacingReplay;
  if (pacingConfiguration !== null) {
    const events = requiredArray(
      pacingConfiguration.events,
      "authored ventricular pacing events",
    );
    const pacingCursor = nonnegativeSafeInteger(
      cursor.readContinuous(
        binding.continuous.authoredVentricularPacing.cursor,
      ),
      "authored ventricular pacing cursor",
    );
    const event = events[pacingCursor];
    if (event !== undefined) {
      boundaries.push(boundary(
        "authored-ventricular-pacing-replay",
        numberProperty(
          event,
          "activationTimeSec",
          "authored ventricular pacing event",
        ),
        acceptedTimeSec,
      ));
    }
  }

  pushFirstArrayBoundary(
    boundaries,
    cursor.readBoundedArray(binding.boundedArray.pendingProximalAvOutputs),
    "pending-proximal-av-output",
    "proximalArrivalTimeSec",
    acceptedTimeSec,
  );
  pushFirstArrayBoundary(
    boundaries,
    cursor.readBoundedArray(
      binding.boundedArray.pendingDistalVentricularImpulses,
    ),
    "pending-distal-ventricular-impulse",
    "activationTimeSec",
    acceptedTimeSec,
  );
  boundaries.push(boundary(
    "ventricular-backup",
    Math.min(
      cursor.readContinuous(
        binding.continuous.ventricularBackupNextIntrinsicEscapeDueTimeSec,
      ),
      cursor.readContinuous(
        binding.continuous.ventricularBackupNextVviPaceDueTimeSec,
      ),
    ),
    acceptedTimeSec,
  ));
  pushFirstArrayBoundary(
    boundaries,
    cursor.readBoundedArray(binding.boundedArray.pendingCalciumDeposits),
    "pending-calcium-deposit",
    "depositTimeSec",
    acceptedTimeSec,
  );

  const earliest = Math.min(
    requestedCandidateTimeSec,
    ...boundaries.map(({ timeSec }) => timeSec),
  );
  const boundaryOwners = Object.freeze(
    boundaries
      .filter(({ timeSec }) => timeSec === earliest)
      .map(({ owner }) => owner)
      .sort(),
  );
  return Object.freeze({
    requestedCandidateTimeSec,
    candidateTimeSec: earliest,
    boundaryTimeSec: boundaryOwners.length === 0 ? null : earliest,
    boundaryOwners,
  });
}

function pushFirstArrayBoundary(
  destination: Boundary[],
  value: unknown,
  owner: string,
  timeProperty: string,
  acceptedTimeSec: number,
): void {
  const items = requiredArray(value, owner);
  const first = items[0];
  if (first === undefined) return;
  destination.push(boundary(
    owner,
    numberProperty(first, timeProperty, owner),
    acceptedTimeSec,
  ));
}

function boundary(
  owner: string,
  timeSec: number,
  acceptedTimeSec: number,
): Boundary {
  const acceptedBoundary = finiteNonnegative(timeSec, `${owner} boundary`);
  if (!(acceptedBoundary > acceptedTimeSec)) {
    throw new Error(`Main Wire typed ${owner} boundary must be future`);
  }
  return Object.freeze({ owner, timeSec: acceptedBoundary });
}

function numberProperty(
  value: unknown,
  property: string,
  owner: string,
): number {
  return finiteNonnegative(
    ownValue(requiredRecord(value, owner), property),
    `${owner} ${property}`,
  );
}

function ownValue(record: Record<string, unknown>, property: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(record, property);
  if (descriptor === undefined || !("value" in descriptor)) {
    throw new Error(`Main Wire typed ${property} is unavailable`);
  }
  return descriptor.value;
}

function requiredRecord(
  value: unknown,
  owner: string,
): Record<string, unknown> {
  if (
    value === null
    || typeof value !== "object"
    || Array.isArray(value)
    || (Object.getPrototypeOf(value) !== Object.prototype
      && Object.getPrototypeOf(value) !== null)
  ) {
    throw new Error(`Main Wire typed ${owner} must be a plain record`);
  }
  return value as Record<string, unknown>;
}

function requiredArray(value: unknown, owner: string): readonly unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`Main Wire typed ${owner} must be an array`);
  }
  return value;
}

function assertExactRecordKeys(
  value: Record<string, unknown>,
  expectedKeys: readonly string[],
  owner: string,
): void {
  const actual = Object.keys(value).sort();
  const expected = [...expectedKeys].sort();
  if (
    actual.length !== expected.length
    || actual.some((key, index) => key !== expected[index])
  ) {
    throw new Error(`Main Wire typed ${owner} has an unexpected field set`);
  }
}

function finiteNumber(value: unknown, owner: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Main Wire typed ${owner} must be finite`);
  }
  return value;
}

function finiteNonnegative(value: unknown, owner: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`Main Wire typed ${owner} must be nonnegative and finite`);
  }
  return value;
}

function positiveFinite(value: unknown, owner: string): number {
  const accepted = finiteNonnegative(value, owner);
  if (!(accepted > 0)) {
    throw new Error(`Main Wire typed ${owner} must be positive`);
  }
  return accepted;
}

function nonnegativeSafeInteger(value: unknown, owner: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new Error(`Main Wire typed ${owner} must be a nonnegative safe integer`);
  }
  return value as number;
}

function safeCounterAdd(
  value: unknown,
  increment: number,
  owner: string,
): number {
  const accepted = nonnegativeSafeInteger(value, owner);
  if (!Number.isSafeInteger(increment) || increment < 0) {
    throw new Error(`Main Wire typed ${owner} increment is invalid`);
  }
  const candidate = accepted + increment;
  if (!Number.isSafeInteger(candidate)) {
    throw new Error(`Main Wire typed ${owner} cannot increment safely`);
  }
  return candidate;
}

function timeTolerance(left: number, right: number): number {
  return 64 * Number.EPSILON
    * Math.max(1, Math.abs(left), Math.abs(right));
}

function assertCursor(
  cursor: TransactionalTypedStateCurrentCursorV1,
  binding: MainWireAcceptedTypedBoundaryBindingV1,
): void {
  if (
    !ISSUED_BOUNDARY_BINDINGS.has(binding)
    || cursor.layoutId !== binding.layoutId
    || cursor.fingerprint !== binding.fingerprint
  ) {
    throw new Error("Main Wire typed boundary cursor has the wrong layout");
  }
}

function assertCandidateCursor(
  cursor: TransactionalTypedStateCandidateCursorV1,
  binding: MainWireAcceptedTypedBoundaryBindingV1,
): void {
  if (
    !ISSUED_BOUNDARY_BINDINGS.has(binding)
    || cursor.layoutId !== binding.layoutId
    || cursor.fingerprint !== binding.fingerprint
  ) {
    throw new Error("Main Wire typed candidate cursor has the wrong layout");
  }
}

function continuousSlot(
  manifest: TransactionalTypedStateManifestV1,
  pointer: string,
): number {
  return requiredBindingSlot(
    manifest.numericalLayout.continuousSlots,
    pointer,
    "continuous",
  );
}

function authoredScheduleBinding(
  manifest: TransactionalTypedStateManifestV1,
  rootPointer: string,
): AuthoredScheduleContinuousBinding {
  return Object.freeze({
    acceptedEmittedImpulseCount: continuousSlot(
      manifest,
      `${rootPointer}/acceptedEmittedImpulseCount`,
    ),
    acceptedTimeSec: continuousSlot(
      manifest,
      `${rootPointer}/acceptedTimeSec`,
    ),
    cursor: continuousSlot(manifest, `${rootPointer}/cursor`),
    revision: continuousSlot(manifest, `${rootPointer}/revision`),
  });
}

function regularAtrialBinding(
  manifest: TransactionalTypedStateManifestV1,
  rootPointer: string,
): RegularAtrialContinuousBinding {
  return Object.freeze({
    acceptedTimeSec: continuousSlot(manifest, `${rootPointer}/acceptedTimeSec`),
    capturedPacPreserveCount: continuousSlot(
      manifest,
      `${rootPointer}/capturedPacPreserveCount`,
    ),
    capturedPacResetCount: continuousSlot(
      manifest,
      `${rootPointer}/capturedPacResetCount`,
    ),
    emittedSourceImpulseCount: continuousSlot(
      manifest,
      `${rootPointer}/emittedSourceImpulseCount`,
    ),
    nextActivationTimeSec: continuousSlot(
      manifest,
      `${rootPointer}/nextActivationTimeSec`,
    ),
    nextSourceSequence: continuousSlot(
      manifest,
      `${rootPointer}/nextSourceSequence`,
    ),
    revision: continuousSlot(manifest, `${rootPointer}/revision`),
  });
}

function stageAuthoredScheduleCandidate(
  current: TransactionalTypedStateCurrentCursorV1,
  candidate: TransactionalTypedStateCandidateCursorV1,
  slots: AuthoredScheduleContinuousBinding,
  events: readonly unknown[],
  expectedAcceptedTimeSec: number,
  candidateTimeSec: number,
  owner: string,
  maximumDueEventCount: number | null,
): void {
  const acceptedTimeSec = finiteNonnegative(
    current.readContinuous(slots.acceptedTimeSec),
    `${owner} accepted time`,
  );
  if (acceptedTimeSec !== expectedAcceptedTimeSec) {
    throw new Error(`Main Wire typed ${owner} clock diverged`);
  }
  const cursor = nonnegativeSafeInteger(
    current.readContinuous(slots.cursor),
    `${owner} cursor`,
  );
  if (cursor > events.length) {
    throw new Error(`Main Wire typed ${owner} cursor exceeds its events`);
  }
  const candidateCursor = upperBoundAuthoredScheduleEvents(
    events,
    cursor,
    candidateTimeSec,
    owner,
  );
  const dueEventCount = candidateCursor - cursor;
  if (
    maximumDueEventCount !== null
    && dueEventCount > maximumDueEventCount
  ) {
    throw new Error(
      `Main Wire typed ${owner} exceeds its per-trial impulse bound`,
    );
  }
  const emitted = nonnegativeSafeInteger(
    current.readContinuous(slots.acceptedEmittedImpulseCount),
    `${owner} emitted impulse count`,
  );
  const revision = nonnegativeSafeInteger(
    current.readContinuous(slots.revision),
    `${owner} revision`,
  );
  if (
    emitted > Number.MAX_SAFE_INTEGER - dueEventCount
    || revision === Number.MAX_SAFE_INTEGER
  ) {
    throw new Error(`Main Wire typed ${owner} counter cannot increment safely`);
  }
  candidate.writeContinuous(
    slots.acceptedEmittedImpulseCount,
    emitted + dueEventCount,
  );
  candidate.writeContinuous(slots.acceptedTimeSec, candidateTimeSec);
  candidate.writeContinuous(slots.cursor, candidateCursor);
  candidate.writeContinuous(slots.revision, revision + 1);
}

function upperBoundAuthoredScheduleEvents(
  events: readonly unknown[],
  initialCursor: number,
  candidateTimeSec: number,
  owner: string,
): number {
  let low = initialCursor;
  let high = events.length;
  while (low < high) {
    const middle = low + Math.floor((high - low) / 2);
    const event = requiredRecord(events[middle], `${owner} event`);
    const activationTimeSec = numberProperty(
      event,
      "activationTimeSec",
      `${owner} event`,
    );
    if (activationTimeSec <= candidateTimeSec) low = middle + 1;
    else high = middle;
  }
  return low;
}

function incrementableCounter(
  value: number,
  field: string,
): number {
  const counter = nonnegativeSafeInteger(value, field);
  if (counter === Number.MAX_SAFE_INTEGER) {
    throw new Error(`Main Wire typed ${field} cannot increment safely`);
  }
  return counter;
}

function finiteFutureTime(
  acceptedTimeSec: number,
  durationSec: number,
  field: string,
): number {
  if (!Number.isFinite(durationSec) || !(durationSec > 0)) {
    throw new Error(`Main Wire typed ${field} duration is invalid`);
  }
  const future = acceptedTimeSec + durationSec;
  if (!Number.isFinite(future) || !(future > acceptedTimeSec)) {
    throw new Error(`Main Wire typed ${field} is not strictly future`);
  }
  return future;
}

function boundedArraySlot(
  manifest: TransactionalTypedStateManifestV1,
  pointer: string,
): number {
  return requiredBindingSlot(
    manifest.numericalLayout.boundedArrayRoots,
    pointer,
    "bounded array",
  );
}

function requiredBindingSlot(
  slots: readonly Readonly<{ pointer: string }>[],
  pointer: string,
  owner: string,
): number {
  const matches: number[] = [];
  for (let index = 0; index < slots.length; index += 1) {
    if (slots[index]?.pointer === pointer) matches.push(index);
  }
  if (matches.length !== 1) {
    throw new Error(
      `Main Wire typed ${owner} binding ${pointer} must resolve exactly once`,
    );
  }
  return matches[0]!;
}

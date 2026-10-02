import {
  NON_CORONARY_CIRCULATION_BE_V1_ID,
  NON_CORONARY_DYNAMIC_EDGE_NAMES_V1,
  NON_CORONARY_NODE_NAMES_V1,
  NON_CORONARY_VALVE_NAMES_V1,
} from "@/engine/core/nonCoronaryCirculationBackwardEulerV1";
import {
  CORONARY_CONSERVED_VOLUME_NODE_IDS_V2,
  CORONARY_LAYER_IDS_V2,
  CORONARY_TERRITORY_IDS_V2,
} from "@/engine/coronary/typesV2";
import {
  MAIN_WIRE_FIVE_WALL_IDS_V1,
} from "@/engine/myocardium/mechanics/MainWireFiveWallLandTriSegProviderV1";
import type {
  MainWireNormalAdultFiveWallMechanicsStateV1,
} from "@/engine/myocardium/experiments/MainWireNormalAdultFiveWallClosedLoopV1";
import {
  MAIN_WIRE_FIVE_WALL_CORONARY_TRANSACTION_V2_ID,
  validateMainWireFiveWallCoronaryAcceptedStateV2,
  type MainWireCoronaryMvcReferenceStateV2,
  type MainWireFiveWallCoupledAcceptedCandidateBorrowV1,
  type MainWireFiveWallCoronaryAcceptedStateV2,
} from "@/engine/myocardium/MainWireFiveWallCoronaryTransactionV2";
import {
  MAIN_WIRE_ACCEPTED_TYPED_STATE_LAYOUT_V1_FINGERPRINT,
  MAIN_WIRE_ACCEPTED_TYPED_STATE_LAYOUT_V1_ID,
} from "@/engine/vnext/MainWireAcceptedTypedStateV1";
import type {
  TransactionalTypedStateCandidateCursorV1,
  TransactionalTypedStateCurrentCursorV1,
  TransactionalTypedStateManifestV1,
} from "@/engine/vnext/TransactionalTypedStateImageV1";
import {
  listExecutionPlanAcceptedTypedStateSlotsV1,
  type ExecutionPlanAcceptedTypedStateBindingV1,
} from "@/engine/vnext/ExecutionPlanAcceptedTypedStateBindingV1";

import { assertMainWireAcceptedTypedExtensionBindingV1, type MainWireAcceptedTypedExtensionBindingV1 } from "./MainWireAcceptedTypedExtensionBindingV1";

export const MAIN_WIRE_ACCEPTED_TYPED_HEMODYNAMIC_VIEW_V1_ID =
  "main-wire-integrated-accepted-typed-hemodynamic-view-v1" as const;

const LAND_STATE_LENGTH = 6;
const WALL_STATE_LENGTH = LAND_STATE_LENGTH + 3;

export const MAIN_WIRE_ACCEPTED_TYPED_HEMODYNAMIC_SLOT_COUNT_V1 = 100 as const;

const MAIN_WIRE_ACCEPTED_TYPED_HEMODYNAMIC_STATE_IDS_V1 = Object.freeze([
  "accepted.timeSec",
  "accepted.revision",
  "circulation.fixedTotalBloodVolumeMl",
  ...NON_CORONARY_NODE_NAMES_V1.map((nodeId) =>
    `noncoronary.volume.${nodeId}`),
  ...NON_CORONARY_DYNAMIC_EDGE_NAMES_V1.map((edgeId) =>
    `noncoronary.flow.${edgeId}`),
  ...NON_CORONARY_VALVE_NAMES_V1.map((valveId) =>
    `noncoronary.valve.${valveId}.openingFraction01`),
  ...CORONARY_CONSERVED_VOLUME_NODE_IDS_V2.map((nodeId) =>
    `coronary.volume.${nodeId}`),
  ...CORONARY_TERRITORY_IDS_V2.flatMap((territoryId) =>
    CORONARY_LAYER_IDS_V2.map((layerId) =>
      `coronary.tone.${territoryId}.${layerId}`)),
  ...MAIN_WIRE_FIVE_WALL_IDS_V1.flatMap((wallId) => [
    ...Array.from({ length: 6 }, (_unused, index) =>
      `mechanics.wall.${wallId}.land.${index}`),
    `mechanics.wall.${wallId}.sls.viscousLogStrain`,
    `mechanics.wall.${wallId}.previousFiberLogStrain`,
    `mechanics.wall.${wallId}.previousFreeCalciumUM`,
  ]),
  "TriSeg.septalMidwallCapVolume",
  "TriSeg.junctionRadius",
  "mechanics.mvc.referenceFiberLogStrain.LVFW",
  "mechanics.mvc.referenceFiberLogStrain.SEP",
  "mechanics.mvc.referenceFiberLogStrain.RVFW",
  "mechanics.mvc.referenceAcceptedTimeSec",
  "mechanics.mvc.referenceRevision",
  "mechanics.mvc.mitralForwardFlowActive",
  "mechanics.mvc.acceptedMitralClosureEventCount",
]);

const ACCEPTED_TIME_INDEX = 0;
const REVISION_INDEX = 1;
const FIXED_TBV_INDEX = 2;
const NON_CORONARY_INDEX = 3;
const DYNAMIC_EDGE_INDEX = NON_CORONARY_INDEX
  + NON_CORONARY_NODE_NAMES_V1.length;
const VALVE_INDEX = DYNAMIC_EDGE_INDEX
  + NON_CORONARY_DYNAMIC_EDGE_NAMES_V1.length;
const CORONARY_INDEX = VALVE_INDEX + NON_CORONARY_VALVE_NAMES_V1.length;
const CORONARY_TONE_INDEX = CORONARY_INDEX
  + CORONARY_CONSERVED_VOLUME_NODE_IDS_V2.length;
const WALL_STATE_INDEX = CORONARY_TONE_INDEX
  + CORONARY_TERRITORY_IDS_V2.length * CORONARY_LAYER_IDS_V2.length;
const TRISEG_INDEX = WALL_STATE_INDEX
  + MAIN_WIRE_FIVE_WALL_IDS_V1.length * WALL_STATE_LENGTH;
const MVC_INDEX = TRISEG_INDEX + 2;
const MVC_ACTIVE_INDEX = MVC_INDEX + 5;

/** Fixed canonical offsets consumed by the one-patch numerical kernel. */
export const MAIN_WIRE_ACCEPTED_TYPED_HEMODYNAMIC_LAYOUT_V1 = Object.freeze({
  acceptedTime: ACCEPTED_TIME_INDEX,
  revision: REVISION_INDEX,
  fixedTotalBloodVolume: FIXED_TBV_INDEX,
  nonCoronaryVolumes: NON_CORONARY_INDEX,
  dynamicEdgeFlows: DYNAMIC_EDGE_INDEX,
  valveOpenings: VALVE_INDEX,
  coronaryVolumes: CORONARY_INDEX,
  coronaryTone: CORONARY_TONE_INDEX,
  wallState: WALL_STATE_INDEX,
  triSeg: TRISEG_INDEX,
  mvc: MVC_INDEX,
  mvcActive: MVC_ACTIVE_INDEX,
  landStateLength: LAND_STATE_LENGTH,
  wallStateLength: WALL_STATE_LENGTH,
} as const);

if (
  NON_CORONARY_NODE_NAMES_V1.length !== 15
  || NON_CORONARY_DYNAMIC_EDGE_NAMES_V1.length !== 2
  || NON_CORONARY_VALVE_NAMES_V1.length !== 4
  || CORONARY_CONSERVED_VOLUME_NODE_IDS_V2.length !== 16
  || CORONARY_TERRITORY_IDS_V2.length !== 3
  || CORONARY_LAYER_IDS_V2.length !== 2
  || MAIN_WIRE_FIVE_WALL_IDS_V1.length !== 5
  || MVC_INDEX + 7 !== MAIN_WIRE_ACCEPTED_TYPED_HEMODYNAMIC_SLOT_COUNT_V1
) {
  throw new Error("Main Wire accepted typed hemodynamic dimensions changed");
}

type OwnerClockBindingV1 = Readonly<{
  acceptedTimeSec: number;
  revision: number;
}>;

export type MainWireAcceptedTypedHemodynamicBindingV1 = Readonly<{
  viewId: typeof MAIN_WIRE_ACCEPTED_TYPED_HEMODYNAMIC_VIEW_V1_ID;
  layoutId: string;
  fingerprint: string;
  /** Canonical 100-f64 view; the MVC-active position is supplied separately. */
  canonicalContinuousSlots: readonly (number | null)[];
  mvcActiveBooleanSlot: number;
  circulationTotalBloodVolumeSlot: number;
  mechanicsAcceptedVolumeSlots: Readonly<
    Record<"LA" | "LV" | "RA" | "RV", number>
  >;
  mechanicsMaterialFingerprintStringSlot: number;
  ownerClocks: readonly OwnerClockBindingV1[];
  coupledContinuousSlots: readonly number[];
  coupledBooleanSlots: readonly number[];
  /**
   * Leaves owned by the 30-row solver. Coronary tone is intentionally absent:
   * the accepted autoregulation owner may change it after the hydraulic solve.
   */
  solverRetainedContinuousSlots: readonly number[];
  solverRetainedBooleanSlots: readonly number[];
}>;

type LegacyMainWireAcceptedProjectionV1 = Readonly<{
  slots: (number | null)[];
  mvcActiveBooleanSlot: number;
}>;

/**
 * Compatibility seam for engine-level tests and standalone tools that
 * construct the typed authority without a compiled model. Registered exact
 * Sessions receive the compiler-owned binding at construction and never enter
 * this pointer-derived path. It is never a hot-path lookup.
 */
function createLegacyMainWireAcceptedProjectionV1(
  manifest: TransactionalTypedStateManifestV1,
): LegacyMainWireAcceptedProjectionV1 {
  const slots: (number | null)[] = [];
  slots.push(
    continuousSlot(manifest, "/acceptedTimeSec"),
    continuousSlot(manifest, "/revision"),
    continuousSlot(manifest, "/coronary/fixedGlobalTotalBloodVolumeMl"),
  );
  for (const nodeId of NON_CORONARY_NODE_NAMES_V1) {
    slots.push(continuousSlot(
      manifest,
      `/coronary/circulation/nodeVolumesMl/${nodeId}`,
    ));
  }
  for (const edgeId of NON_CORONARY_DYNAMIC_EDGE_NAMES_V1) {
    slots.push(continuousSlot(
      manifest,
      `/coronary/circulation/dynamicEdgeFlowsMlPerSec/${edgeId}`,
    ));
  }
  for (const valveId of NON_CORONARY_VALVE_NAMES_V1) {
    slots.push(continuousSlot(
      manifest,
      `/coronary/circulation/valveStates/${valveId}/leafletOpeningFraction01`,
    ));
  }
  for (const nodeId of CORONARY_CONSERVED_VOLUME_NODE_IDS_V2) {
    slots.push(continuousSlot(
      manifest,
      `/coronary/coronary/volumeMlByNode/${nodeId}`,
    ));
  }
  for (const territoryId of CORONARY_TERRITORY_IDS_V2) {
    for (const layerId of CORONARY_LAYER_IDS_V2) {
      slots.push(continuousSlot(
        manifest,
        "/coronary/coronary/toneResistanceScaleByTerritoryLayer/"
          + `${territoryId}/${layerId}`,
      ));
    }
  }
  for (const wallId of MAIN_WIRE_FIVE_WALL_IDS_V1) {
    for (let stateIndex = 0; stateIndex < LAND_STATE_LENGTH; stateIndex += 1) {
      slots.push(continuousSlot(
        manifest,
        "/coronary/mechanics/materialState/wallStateByWall/"
          + `${wallId}/landState/${stateIndex}`,
      ));
    }
    slots.push(
      continuousSlot(
        manifest,
        "/coronary/mechanics/materialState/wallStateByWall/"
          + `${wallId}/slsState/viscousLogStrain`,
      ),
      continuousSlot(
        manifest,
        "/coronary/mechanics/materialState/wallStateByWall/"
          + `${wallId}/previousFiberLogStrain`,
      ),
      continuousSlot(
        manifest,
        "/coronary/mechanics/materialState/wallStateByWall/"
          + `${wallId}/previousFreeCalciumUM`,
      ),
    );
  }
  slots.push(
    continuousSlot(
      manifest,
      "/coronary/mechanics/materialState/trisegCoordinates/"
        + "septalMidwallCapVolumeM3",
    ),
    continuousSlot(
      manifest,
      "/coronary/mechanics/materialState/trisegCoordinates/junctionRadiusM",
    ),
    continuousSlot(
      manifest,
      "/coronary/mvcReferenceState/reference/"
        + "referenceFiberLogStrainByWall/LVFW",
    ),
    continuousSlot(
      manifest,
      "/coronary/mvcReferenceState/reference/"
        + "referenceFiberLogStrainByWall/SEP",
    ),
    continuousSlot(
      manifest,
      "/coronary/mvcReferenceState/reference/"
        + "referenceFiberLogStrainByWall/RVFW",
    ),
    continuousSlot(
      manifest,
      "/coronary/mvcReferenceState/referenceAcceptedTimeSec",
    ),
    continuousSlot(manifest, "/coronary/mvcReferenceState/referenceRevision"),
    null,
    continuousSlot(
      manifest,
      "/coronary/mvcReferenceState/acceptedMitralClosureEventCount",
    ),
  );
  if (
    slots.length !== MAIN_WIRE_ACCEPTED_TYPED_HEMODYNAMIC_SLOT_COUNT_V1
    || slots[MVC_ACTIVE_INDEX] !== null
    || slots.some((slot, index) => index !== MVC_ACTIVE_INDEX && slot === null)
  ) {
    throw new Error("Main Wire accepted typed hemodynamic binding is incomplete");
  }
  return Object.freeze({
    slots,
    mvcActiveBooleanSlot: booleanSlot(
      manifest,
      "/coronary/mvcReferenceState/mitralForwardFlowActive",
    ),
  });
}

/**
 * Resolves the complete one-patch circulation/mechanics state once. The
 * binding is a read-only view over the existing full accepted-state image,
 * never a second state authority.
 */
const ISSUED_HEMODYNAMIC_BINDINGS = new WeakSet<object>();

export function createMainWireAcceptedTypedHemodynamicBindingV1(
  manifest: TransactionalTypedStateManifestV1,
  executionPlanBinding?: ExecutionPlanAcceptedTypedStateBindingV1,
): MainWireAcceptedTypedHemodynamicBindingV1 {
  assertManifest(manifest);
  return createHemodynamicBinding(manifest, executionPlanBinding);
}

export function createMainWireExtendedAcceptedTypedHemodynamicBindingV1(
  manifest: TransactionalTypedStateManifestV1,
  extension: MainWireAcceptedTypedExtensionBindingV1,
  executionPlanBinding: ExecutionPlanAcceptedTypedStateBindingV1,
): MainWireAcceptedTypedHemodynamicBindingV1 {
  assertMainWireAcceptedTypedExtensionBindingV1(extension, manifest);
  return createHemodynamicBinding(manifest, executionPlanBinding, extension);
}

function createHemodynamicBinding(
  manifest: TransactionalTypedStateManifestV1,
  executionPlanBinding?: ExecutionPlanAcceptedTypedStateBindingV1,
  extension?: MainWireAcceptedTypedExtensionBindingV1,
): MainWireAcceptedTypedHemodynamicBindingV1 {
  let slots: (number | null)[];
  let mvcActiveBooleanSlot: number;
  if (executionPlanBinding === undefined) {
    const legacyProjection = createLegacyMainWireAcceptedProjectionV1(manifest);
    slots = legacyProjection.slots;
    mvcActiveBooleanSlot = legacyProjection.mvcActiveBooleanSlot;
  } else {
    if (
      executionPlanBinding.authorityLayoutId !== manifest.layoutId
      || executionPlanBinding.authorityFingerprint !== manifest.fingerprint
    ) {
      throw new Error(
        "Main Wire execution-plan authority binding identity drifted",
      );
    }
    const allCompiled = listExecutionPlanAcceptedTypedStateSlotsV1(executionPlanBinding);
    const compiled = extension === undefined ? allCompiled
      : MAIN_WIRE_ACCEPTED_TYPED_HEMODYNAMIC_STATE_IDS_V1.map(id => {
        const slot = allCompiled.find(entry => entry.stateId === id);
        if (slot === undefined) throw new Error(`Extended Main Wire state ${id} is unavailable`);
        return slot;
      });
    const reference = extension === undefined ? null : createLegacyMainWireAcceptedProjectionV1(manifest);
    if (
      compiled.length
        !== MAIN_WIRE_ACCEPTED_TYPED_HEMODYNAMIC_STATE_IDS_V1.length
      || compiled.length
        !== MAIN_WIRE_ACCEPTED_TYPED_HEMODYNAMIC_SLOT_COUNT_V1
    ) {
      throw new Error("Main Wire execution-plan state count drifted");
    }
    const compiledSlots = compiled.map((slot, index) => {
      const expectedStateId =
        MAIN_WIRE_ACCEPTED_TYPED_HEMODYNAMIC_STATE_IDS_V1[index];
      const expectedStorageKind = index === MVC_ACTIVE_INDEX
        ? "boolean-u8"
        : "continuous-f64";
      if (
        slot.stateId !== expectedStateId
        || slot.logicalIndex !== index
        || slot.storageKind !== expectedStorageKind
        || (reference !== null && slot.authoritySlotIndex !== (index === MVC_ACTIVE_INDEX
          ? reference.mvcActiveBooleanSlot : reference.slots[index]))
      ) {
        throw new Error(
          `Main Wire execution-plan state ${index} identity drifted`,
        );
      }
      return slot.storageKind === "boolean-u8"
        ? null
        : slot.authoritySlotIndex;
    });
    const compiledMvc = compiled[MVC_ACTIVE_INDEX]!;
    slots = compiledSlots;
    mvcActiveBooleanSlot = compiledMvc.authoritySlotIndex;
  }
  const ownerClocks = Object.freeze([
    ownerClock(manifest, ""),
    ownerClock(manifest, "/composedRhythm"),
    ownerClock(manifest, "/coronary"),
    ownerClock(manifest, "/coronary/circulation"),
    ownerClock(manifest, "/coronary/coronary"),
    ownerClock(manifest, "/coronary/mechanics"),
  ]);
  const circulationTotalBloodVolumeSlot = continuousSlot(
    manifest,
    "/coronary/circulation/totalBloodVolumeMl",
  );
  const mechanicsAcceptedVolumeSlots = Object.freeze(Object.fromEntries(
    (["LA", "LV", "RA", "RV"] as const).map((chamberId) => [
      chamberId,
      continuousSlot(
        manifest,
        `/coronary/mechanics/acceptedVolumesMl/${chamberId}`,
      ),
    ]),
  ) as Record<"LA" | "LV" | "RA" | "RV", number>);
  const mechanicsMaterialFingerprintStringSlot = stringSlot(
    manifest,
    "/coronary/mechanics/materialStateFingerprint",
  );
  const coupledContinuousSlots = Object.freeze(Array.from(new Set([
    ...slots.filter((slot): slot is number => slot !== null),
    circulationTotalBloodVolumeSlot,
    ...Object.values(mechanicsAcceptedVolumeSlots),
    ...ownerClocks.flatMap((clock) => [
      clock.acceptedTimeSec,
      clock.revision,
    ]),
  ])));
  const coronaryToneSlots = new Set(
    slots.slice(
      CORONARY_TONE_INDEX,
      CORONARY_TONE_INDEX
        + CORONARY_TERRITORY_IDS_V2.length * CORONARY_LAYER_IDS_V2.length,
    ).filter((slot): slot is number => slot !== null),
  );
  const solverRetainedContinuousSlots = Object.freeze(
    coupledContinuousSlots.filter((slot) => !coronaryToneSlots.has(slot)),
  );
  const binding = Object.freeze({
    viewId: MAIN_WIRE_ACCEPTED_TYPED_HEMODYNAMIC_VIEW_V1_ID,
    layoutId: manifest.layoutId,
    fingerprint: manifest.fingerprint,
    canonicalContinuousSlots: Object.freeze(slots),
    mvcActiveBooleanSlot,
    circulationTotalBloodVolumeSlot,
    mechanicsAcceptedVolumeSlots,
    mechanicsMaterialFingerprintStringSlot,
    ownerClocks,
    coupledContinuousSlots,
    coupledBooleanSlots: Object.freeze([mvcActiveBooleanSlot]),
    solverRetainedContinuousSlots,
    solverRetainedBooleanSlots: Object.freeze([mvcActiveBooleanSlot]),
  });
  ISSUED_HEMODYNAMIC_BINDINGS.add(binding);
  return binding;
}

/** Allocates caller-owned scratch for cold setup or benchmark tooling. */
export function createMainWireAcceptedTypedHemodynamicDestinationV1():
Float64Array {
  return new Float64Array(MAIN_WIRE_ACCEPTED_TYPED_HEMODYNAMIC_SLOT_COUNT_V1);
}

/**
 * Copies one coherent canonical view from the live accepted cursor. The cursor
 * follows buffer promotion, so callers bind it once and reuse their scratch.
 */
export function readMainWireAcceptedTypedHemodynamicIntoV1(
  cursor: TransactionalTypedStateCurrentCursorV1,
  binding: MainWireAcceptedTypedHemodynamicBindingV1,
  destination: Float64Array,
): void {
  assertCursor(cursor, binding);
  if (
    !(destination instanceof Float64Array)
    || destination.length !== MAIN_WIRE_ACCEPTED_TYPED_HEMODYNAMIC_SLOT_COUNT_V1
  ) {
    throw new RangeError(
      "Main Wire accepted typed hemodynamic destination must contain 100 f64s",
    );
  }
  for (let index = 0; index < destination.length; index += 1) {
    const slot = binding.canonicalContinuousSlots[index];
    destination[index] = slot === null
      ? (cursor.readBoolean(binding.mvcActiveBooleanSlot) ? 1 : 0)
      : cursor.readContinuous(slot);
  }
  assertOwnerClocks(cursor, binding, destination);
  assertCanonicalView(destination);
}

/**
 * Reconstructs only the circulation/mechanics adapter required by the current
 * component equations. Every numerical leaf comes from the sole accepted
 * typed image; `template` contributes immutable model identities and the
 * coronary binding only. The result is a private solver adapter, never a
 * second accepted-state authority or a detached public snapshot.
 */
export function materializeMainWireAcceptedTypedCoupledSolverAdapterV1(
  cursor: TransactionalTypedStateCurrentCursorV1,
  binding: MainWireAcceptedTypedHemodynamicBindingV1,
  template: MainWireFiveWallCoronaryAcceptedStateV2<
    MainWireNormalAdultFiveWallMechanicsStateV1
  >,
  scratch: Float64Array,
): MainWireFiveWallCoronaryAcceptedStateV2<
  MainWireNormalAdultFiveWallMechanicsStateV1
> {
  validateMainWireFiveWallCoronaryAcceptedStateV2(template);
  readMainWireAcceptedTypedHemodynamicIntoV1(
    cursor,
    binding,
    scratch,
  );
  if (!Object.is(
    scratch[FIXED_TBV_INDEX],
    template.fixedGlobalTotalBloodVolumeMl,
  )) {
    throw new Error(
      "Main Wire typed solver adapter changed its fixed TBV identity",
    );
  }

  const acceptedTimeSec = scratch[ACCEPTED_TIME_INDEX]!;
  const revision = scratch[REVISION_INDEX]!;
  const nodeVolumesMl = Object.freeze(Object.fromEntries(
    NON_CORONARY_NODE_NAMES_V1.map((nodeId, index) => [
      nodeId,
      scratch[NON_CORONARY_INDEX + index]!,
    ]),
  )) as MainWireFiveWallCoronaryAcceptedStateV2<
    MainWireNormalAdultFiveWallMechanicsStateV1
  >["circulation"]["nodeVolumesMl"];
  const dynamicEdgeFlowsMlPerSec = Object.freeze(Object.fromEntries(
    NON_CORONARY_DYNAMIC_EDGE_NAMES_V1.map((edgeId, index) => [
      edgeId,
      scratch[DYNAMIC_EDGE_INDEX + index]!,
    ]),
  )) as MainWireFiveWallCoronaryAcceptedStateV2<
    MainWireNormalAdultFiveWallMechanicsStateV1
  >["circulation"]["dynamicEdgeFlowsMlPerSec"];
  const valveStates = Object.freeze(Object.fromEntries(
    NON_CORONARY_VALVE_NAMES_V1.map((valveId, index) => [
      valveId,
      Object.freeze({
        leafletOpeningFraction01: scratch[VALVE_INDEX + index]!,
      }),
    ]),
  )) as MainWireFiveWallCoronaryAcceptedStateV2<
    MainWireNormalAdultFiveWallMechanicsStateV1
  >["circulation"]["valveStates"];
  // Preserve the admitted aggregate scalar exactly. Re-summing the same
  // compartment vector here can differ by one ulp when the producer and this
  // adapter traverse the vector in different orders. The accepted-state
  // validator below still checks that this redundant scalar agrees with the
  // compartment ledger inside its round-off corridor.
  const nonCoronaryTotalBloodVolumeMl = cursor.readContinuous(
    binding.circulationTotalBloodVolumeSlot,
  );
  const circulation = Object.freeze({
    transactionId: NON_CORONARY_CIRCULATION_BE_V1_ID,
    revision,
    acceptedTimeSec,
    totalBloodVolumeMl: nonCoronaryTotalBloodVolumeMl,
    nodeVolumesMl,
    dynamicEdgeFlowsMlPerSec,
    valveStates,
  });

  const volumeMlByNode = Object.freeze(Object.fromEntries(
    CORONARY_CONSERVED_VOLUME_NODE_IDS_V2.map((nodeId, index) => [
      nodeId,
      scratch[CORONARY_INDEX + index]!,
    ]),
  )) as MainWireFiveWallCoronaryAcceptedStateV2<
    MainWireNormalAdultFiveWallMechanicsStateV1
  >["coronary"]["volumeMlByNode"];
  const coronary = Object.freeze({
    acceptedTimeSec,
    revision,
    volumeMlByNode,
    toneResistanceScaleByTerritoryLayer:
      readCoronaryToneFromCanonicalView(scratch),
  });

  const acceptedVolumesMl = Object.freeze({
    LA: nodeVolumesMl.LA,
    LV: nodeVolumesMl.LV,
    RA: nodeVolumesMl.RA,
    RV: nodeVolumesMl.RV,
  });
  const materialState = readMechanicsStateFromCanonicalView(scratch);
  const mechanics = Object.freeze({
    contractId: template.mechanics.contractId,
    providerId: template.mechanics.providerId,
    parameterSetId: template.mechanics.parameterSetId,
    parameterIdentityHash: template.mechanics.parameterIdentityHash,
    stateSchemaVersion: template.mechanics.stateSchemaVersion,
    revision,
    acceptedTimeSec,
    acceptedVolumesMl,
    materialState,
    materialStateFingerprint: cursor.readString(
      binding.mechanicsMaterialFingerprintStringSlot,
    ),
  });
  const accepted = Object.freeze({
    transactionId: MAIN_WIRE_FIVE_WALL_CORONARY_TRANSACTION_V2_ID,
    revision,
    acceptedTimeSec,
    fixedGlobalTotalBloodVolumeMl: scratch[FIXED_TBV_INDEX]!,
    coronaryBinding: template.coronaryBinding,
    circulation,
    coronary,
    mechanics,
    mvcReferenceState: readMvcReferenceFromCanonicalView(scratch),
  }) satisfies MainWireFiveWallCoronaryAcceptedStateV2<
    MainWireNormalAdultFiveWallMechanicsStateV1
  >;
  validateMainWireFiveWallCoronaryAcceptedStateV2(accepted);
  return accepted;
}

/**
 * Copies one component-admitted 30-row candidate into the global inactive
 * image. This function never promotes; rhythm, devices, autoregulation, and
 * final cross-owner admission must complete in the same outer transaction.
 */
export function stageMainWireAcceptedTypedCoupledCandidateV1(
  candidateCursor: TransactionalTypedStateCandidateCursorV1,
  binding: MainWireAcceptedTypedHemodynamicBindingV1,
  candidate: MainWireFiveWallCoupledAcceptedCandidateBorrowV1<
    MainWireNormalAdultFiveWallMechanicsStateV1
  >,
  scratch: Float64Array,
): void {
  assertCandidateCursor(candidateCursor, binding);
  if (
    !(scratch instanceof Float64Array)
    || scratch.length !== MAIN_WIRE_ACCEPTED_TYPED_HEMODYNAMIC_SLOT_COUNT_V1
  ) {
    throw new RangeError(
      "Main Wire accepted typed coupled scratch must contain 100 f64s",
    );
  }
  writeCandidateIntoCanonicalView(candidate, scratch);
  assertCanonicalView(scratch);
  for (let index = 0; index < scratch.length; index += 1) {
    const slot = binding.canonicalContinuousSlots[index];
    if (slot === null) {
      candidateCursor.writeBoolean(
        binding.mvcActiveBooleanSlot,
        scratch[index] === 1,
      );
    } else {
      candidateCursor.writeContinuous(slot, scratch[index]!);
    }
  }
  for (const clock of binding.ownerClocks) {
    candidateCursor.writeContinuous(
      clock.acceptedTimeSec,
      candidate.candidateTimeSec,
    );
    candidateCursor.writeContinuous(clock.revision, candidate.candidateRevision);
  }
  writeRedundantAcceptedVolumes(
    candidateCursor,
    binding,
    candidate.nonCoronaryNodeVolumesMl.reduce(
      (sum, volumeMl) => sum + volumeMl,
      0,
    ),
    candidate.mechanicsCandidateVolumesMl,
  );
  candidateCursor.writeStringSameByteLength(
    binding.mechanicsMaterialFingerprintStringSlot,
    candidate.mechanicsMaterialStateFingerprint,
  );
}

/**
 * Object-adapter migration seam for the same solver-owned leaves. Unlike the
 * borrow path this consumes the already finalized V2 candidate, avoiding a
 * second residual/mechanics evaluation while public object materialization is
 * still required for cold completion.
 */
export function stageMainWireAcceptedTypedCoupledStateV1(
  candidateCursor: TransactionalTypedStateCandidateCursorV1,
  binding: MainWireAcceptedTypedHemodynamicBindingV1,
  state: MainWireFiveWallCoronaryAcceptedStateV2<
    MainWireNormalAdultFiveWallMechanicsStateV1
  >,
  scratch: Float64Array,
): void {
  assertCandidateCursor(candidateCursor, binding);
  if (
    !(scratch instanceof Float64Array)
    || scratch.length !== MAIN_WIRE_ACCEPTED_TYPED_HEMODYNAMIC_SLOT_COUNT_V1
  ) {
    throw new RangeError(
      "Main Wire accepted typed coupled scratch must contain 100 f64s",
    );
  }
  scratch[ACCEPTED_TIME_INDEX] = state.acceptedTimeSec;
  scratch[REVISION_INDEX] = state.revision;
  scratch[FIXED_TBV_INDEX] = state.fixedGlobalTotalBloodVolumeMl;
  for (let index = 0; index < NON_CORONARY_NODE_NAMES_V1.length; index += 1) {
    scratch[NON_CORONARY_INDEX + index] = state.circulation.nodeVolumesMl[
      NON_CORONARY_NODE_NAMES_V1[index]!
    ];
  }
  for (let index = 0;
    index < NON_CORONARY_DYNAMIC_EDGE_NAMES_V1.length;
    index += 1) {
    scratch[DYNAMIC_EDGE_INDEX + index] =
      state.circulation.dynamicEdgeFlowsMlPerSec[
        NON_CORONARY_DYNAMIC_EDGE_NAMES_V1[index]!
      ];
  }
  for (let index = 0; index < NON_CORONARY_VALVE_NAMES_V1.length; index += 1) {
    scratch[VALVE_INDEX + index] = state.circulation.valveStates[
      NON_CORONARY_VALVE_NAMES_V1[index]!
    ].leafletOpeningFraction01;
  }
  for (let index = 0;
    index < CORONARY_CONSERVED_VOLUME_NODE_IDS_V2.length;
    index += 1) {
    scratch[CORONARY_INDEX + index] = state.coronary.volumeMlByNode[
      CORONARY_CONSERVED_VOLUME_NODE_IDS_V2[index]!
    ];
  }
  let toneIndex = CORONARY_TONE_INDEX;
  for (const territoryId of CORONARY_TERRITORY_IDS_V2) {
    for (const layerId of CORONARY_LAYER_IDS_V2) {
      scratch[toneIndex++] =
        state.coronary.toneResistanceScaleByTerritoryLayer[territoryId][
          layerId
        ];
    }
  }
  writeMaterialAndMvcIntoCanonicalView(
    state.mechanics.materialState,
    state.mvcReferenceState,
    scratch,
  );
  assertCanonicalView(scratch);
  assertMechanicsVolumesMatch(
    state.mechanics.acceptedVolumesMl,
    state.circulation.nodeVolumesMl,
  );
  writeCanonicalViewToCandidate(candidateCursor, binding, scratch);
  writeOwnerClocks(
    candidateCursor,
    binding,
    state.acceptedTimeSec,
    state.revision,
  );
  writeRedundantAcceptedVolumes(
    candidateCursor,
    binding,
    state.circulation.totalBloodVolumeMl,
    state.mechanics.acceptedVolumesMl,
  );
  candidateCursor.writeStringSameByteLength(
    binding.mechanicsMaterialFingerprintStringSlot,
    state.mechanics.materialStateFingerprint,
  );
}

function writeRedundantAcceptedVolumes(
  candidateCursor: TransactionalTypedStateCandidateCursorV1,
  binding: MainWireAcceptedTypedHemodynamicBindingV1,
  totalBloodVolumeMl: number,
  mechanicsVolumes: Readonly<Record<"LA" | "LV" | "RA" | "RV", number>>,
): void {
  if (!Number.isFinite(totalBloodVolumeMl) || !(totalBloodVolumeMl > 0)) {
    throw new Error("Main Wire typed circulation TBV is invalid");
  }
  candidateCursor.writeContinuous(
    binding.circulationTotalBloodVolumeSlot,
    totalBloodVolumeMl,
  );
  for (const chamberId of ["LA", "LV", "RA", "RV"] as const) {
    const value = mechanicsVolumes[chamberId];
    if (!Number.isFinite(value) || !(value > 0)) {
      throw new Error(
        `Main Wire typed ${chamberId} mechanics accepted volume is invalid`,
      );
    }
    candidateCursor.writeContinuous(
      binding.mechanicsAcceptedVolumeSlots[chamberId],
      value,
    );
  }
}

function writeCandidateIntoCanonicalView(
  candidate: MainWireFiveWallCoupledAcceptedCandidateBorrowV1<
    MainWireNormalAdultFiveWallMechanicsStateV1
  >,
  destination: Float64Array,
): void {
  destination[ACCEPTED_TIME_INDEX] = candidate.candidateTimeSec;
  destination[REVISION_INDEX] = candidate.candidateRevision;
  destination[FIXED_TBV_INDEX] = candidate.fixedGlobalTotalBloodVolumeMl;
  destination.set(candidate.nonCoronaryNodeVolumesMl, NON_CORONARY_INDEX);
  destination.set(candidate.dynamicEdgeFlowsMlPerSec, DYNAMIC_EDGE_INDEX);
  if (candidate.valveStates.length !== NON_CORONARY_VALVE_NAMES_V1.length) {
    throw new Error("Main Wire typed coupled valve-state dimension changed");
  }
  for (let index = 0; index < candidate.valveStates.length; index += 1) {
    destination[VALVE_INDEX + index] =
      candidate.valveStates[index]!.leafletOpeningFraction01;
  }
  for (let index = 0;
    index < CORONARY_CONSERVED_VOLUME_NODE_IDS_V2.length;
    index += 1) {
    destination[CORONARY_INDEX + index] = candidate.coronaryVolumesMl[
      CORONARY_CONSERVED_VOLUME_NODE_IDS_V2[index]!
    ];
  }
  let toneIndex = CORONARY_TONE_INDEX;
  for (const territoryId of CORONARY_TERRITORY_IDS_V2) {
    for (const layerId of CORONARY_LAYER_IDS_V2) {
      destination[toneIndex++] =
        candidate.coronaryToneResistanceScaleByTerritoryLayer[territoryId][
          layerId
        ];
    }
  }
  writeMaterialAndMvcIntoCanonicalView(
    candidate.mechanicsMaterialState,
    candidate.mvcReferenceState,
    destination,
  );
  assertMechanicsVolumesMatch(
    candidate.mechanicsCandidateVolumesMl,
    Object.fromEntries(NON_CORONARY_NODE_NAMES_V1.map((nodeId, index) => [
      nodeId,
      candidate.nonCoronaryNodeVolumesMl[index]!,
    ])) as Readonly<Record<(typeof NON_CORONARY_NODE_NAMES_V1)[number], number>>,
  );
}

function readCoronaryToneFromCanonicalView(
  source: Float64Array,
): MainWireFiveWallCoronaryAcceptedStateV2<
  MainWireNormalAdultFiveWallMechanicsStateV1
>["coronary"]["toneResistanceScaleByTerritoryLayer"] {
  let index = CORONARY_TONE_INDEX;
  return Object.freeze(Object.fromEntries(
    CORONARY_TERRITORY_IDS_V2.map((territoryId) => [
      territoryId,
      Object.freeze(Object.fromEntries(
        CORONARY_LAYER_IDS_V2.map((layerId) => [
          layerId,
          source[index++]!,
        ]),
      )),
    ]),
  )) as MainWireFiveWallCoronaryAcceptedStateV2<
    MainWireNormalAdultFiveWallMechanicsStateV1
  >["coronary"]["toneResistanceScaleByTerritoryLayer"];
}

function readMechanicsStateFromCanonicalView(
  source: Float64Array,
): MainWireNormalAdultFiveWallMechanicsStateV1 {
  let index = WALL_STATE_INDEX;
  const wallStateByWall = Object.freeze(Object.fromEntries(
    MAIN_WIRE_FIVE_WALL_IDS_V1.map((wallId) => {
      const landState = source.slice(index, index + LAND_STATE_LENGTH);
      index += LAND_STATE_LENGTH;
      const wall = Object.freeze({
        landState,
        slsState: Object.freeze({
          viscousLogStrain: source[index++]!,
        }),
        previousFiberLogStrain: source[index++]!,
        previousFreeCalciumUM: source[index++]!,
      });
      return [wallId, wall];
    }),
  )) as MainWireNormalAdultFiveWallMechanicsStateV1["wallStateByWall"];
  return Object.freeze({
    wallStateByWall,
    trisegCoordinates: Object.freeze({
      septalMidwallCapVolumeM3: source[TRISEG_INDEX]!,
      junctionRadiusM: source[TRISEG_INDEX + 1]!,
    }),
  });
}

function readMvcReferenceFromCanonicalView(
  source: Float64Array,
): MainWireCoronaryMvcReferenceStateV2 {
  return Object.freeze({
    reference: Object.freeze({
      referenceFiberLogStrainByWall: Object.freeze({
        LVFW: source[MVC_INDEX]!,
        SEP: source[MVC_INDEX + 1]!,
        RVFW: source[MVC_INDEX + 2]!,
      }),
    }),
    referenceAcceptedTimeSec: source[MVC_INDEX + 3]!,
    referenceRevision: source[MVC_INDEX + 4]!,
    mitralForwardFlowActive: source[MVC_ACTIVE_INDEX] === 1,
    acceptedMitralClosureEventCount: source[MVC_INDEX + 6]!,
  });
}

function writeMaterialAndMvcIntoCanonicalView(
  materialState: MainWireNormalAdultFiveWallMechanicsStateV1,
  mvc: MainWireFiveWallCoupledAcceptedCandidateBorrowV1<
    MainWireNormalAdultFiveWallMechanicsStateV1
  >["mvcReferenceState"],
  destination: Float64Array,
): void {
  let wallIndex = WALL_STATE_INDEX;
  for (const wallId of MAIN_WIRE_FIVE_WALL_IDS_V1) {
    const wall = materialState.wallStateByWall[wallId];
    if (wall.landState.length !== LAND_STATE_LENGTH) {
      throw new Error(`Main Wire typed ${wallId} Land-state dimension changed`);
    }
    destination.set(wall.landState, wallIndex);
    wallIndex += LAND_STATE_LENGTH;
    destination[wallIndex++] = wall.slsState.viscousLogStrain;
    destination[wallIndex++] = wall.previousFiberLogStrain;
    destination[wallIndex++] = wall.previousFreeCalciumUM;
  }
  destination[TRISEG_INDEX] = materialState
    .trisegCoordinates.septalMidwallCapVolumeM3;
  destination[TRISEG_INDEX + 1] = materialState
    .trisegCoordinates.junctionRadiusM;
  destination[MVC_INDEX] =
    mvc.reference.referenceFiberLogStrainByWall.LVFW;
  destination[MVC_INDEX + 1] =
    mvc.reference.referenceFiberLogStrainByWall.SEP;
  destination[MVC_INDEX + 2] =
    mvc.reference.referenceFiberLogStrainByWall.RVFW;
  destination[MVC_INDEX + 3] = mvc.referenceAcceptedTimeSec;
  destination[MVC_INDEX + 4] = mvc.referenceRevision;
  destination[MVC_ACTIVE_INDEX] = mvc.mitralForwardFlowActive ? 1 : 0;
  destination[MVC_INDEX + 6] = mvc.acceptedMitralClosureEventCount;
}

function assertMechanicsVolumesMatch(
  mechanicsVolumes: Readonly<Record<"LA" | "LV" | "RA" | "RV", number>>,
  nodeVolumes: Readonly<Record<(typeof NON_CORONARY_NODE_NAMES_V1)[number], number>>,
): void {
  for (const chamberId of ["LA", "LV", "RA", "RV"] as const) {
    if (
      !Object.is(mechanicsVolumes[chamberId], nodeVolumes[chamberId])
    ) {
      throw new Error(
        `Main Wire typed coupled ${chamberId} mechanics volume diverged`,
      );
    }
  }
}

function writeCanonicalViewToCandidate(
  candidateCursor: TransactionalTypedStateCandidateCursorV1,
  binding: MainWireAcceptedTypedHemodynamicBindingV1,
  values: Float64Array,
): void {
  for (let index = 0; index < values.length; index += 1) {
    const slot = binding.canonicalContinuousSlots[index];
    if (slot === null) {
      candidateCursor.writeBoolean(
        binding.mvcActiveBooleanSlot,
        values[index] === 1,
      );
    } else {
      candidateCursor.writeContinuous(slot, values[index]!);
    }
  }
}

function writeOwnerClocks(
  candidateCursor: TransactionalTypedStateCandidateCursorV1,
  binding: MainWireAcceptedTypedHemodynamicBindingV1,
  candidateTimeSec: number,
  candidateRevision: number,
): void {
  for (const clock of binding.ownerClocks) {
    candidateCursor.writeContinuous(clock.acceptedTimeSec, candidateTimeSec);
    candidateCursor.writeContinuous(clock.revision, candidateRevision);
  }
}

function assertManifest(manifest: TransactionalTypedStateManifestV1): void {
  if (
    manifest.layoutId !== MAIN_WIRE_ACCEPTED_TYPED_STATE_LAYOUT_V1_ID
    || manifest.fingerprint
      !== MAIN_WIRE_ACCEPTED_TYPED_STATE_LAYOUT_V1_FINGERPRINT
  ) {
    throw new Error(
      "Main Wire accepted typed hemodynamic manifest identity is unsupported",
    );
  }
}

function assertCursor(
  cursor: TransactionalTypedStateCurrentCursorV1,
  binding: MainWireAcceptedTypedHemodynamicBindingV1,
): void {
  if (
    !ISSUED_HEMODYNAMIC_BINDINGS.has(binding)
    || cursor.layoutId !== binding.layoutId
    || cursor.fingerprint !== binding.fingerprint
  ) {
    throw new Error("Main Wire accepted typed hemodynamic cursor is unsupported");
  }
}

function assertCandidateCursor(
  cursor: TransactionalTypedStateCandidateCursorV1,
  binding: MainWireAcceptedTypedHemodynamicBindingV1,
): void {
  if (
    !ISSUED_HEMODYNAMIC_BINDINGS.has(binding)
    || cursor.layoutId !== binding.layoutId
    || cursor.fingerprint !== binding.fingerprint
  ) {
    throw new Error(
      "Main Wire accepted typed hemodynamic candidate cursor is unsupported",
    );
  }
}

function ownerClock(
  manifest: TransactionalTypedStateManifestV1,
  pointer: string,
): OwnerClockBindingV1 {
  return Object.freeze({
    acceptedTimeSec: continuousSlot(manifest, `${pointer}/acceptedTimeSec`),
    revision: continuousSlot(manifest, `${pointer}/revision`),
  });
}

function assertOwnerClocks(
  cursor: TransactionalTypedStateCurrentCursorV1,
  binding: MainWireAcceptedTypedHemodynamicBindingV1,
  destination: Float64Array,
): void {
  const acceptedTimeSec = destination[ACCEPTED_TIME_INDEX]!;
  const revision = destination[REVISION_INDEX]!;
  for (const clock of binding.ownerClocks) {
    if (
      !Object.is(cursor.readContinuous(clock.acceptedTimeSec), acceptedTimeSec)
      || !Object.is(cursor.readContinuous(clock.revision), revision)
    ) {
      throw new Error("Main Wire accepted typed hemodynamic owner clocks diverged");
    }
  }
}

function assertCanonicalView(view: Float64Array): void {
  for (let index = 0; index < view.length; index += 1) {
    if (!Number.isFinite(view[index])) {
      throw new Error(
        `Main Wire accepted typed hemodynamic slot ${index} is not finite`,
      );
    }
  }
  if (!(view[ACCEPTED_TIME_INDEX]! >= 0)) {
    throw new Error("Main Wire accepted typed hemodynamic time is negative");
  }
  if (!Number.isSafeInteger(view[REVISION_INDEX]) || view[REVISION_INDEX]! < 0) {
    throw new Error("Main Wire accepted typed hemodynamic revision is invalid");
  }
  if (!(view[FIXED_TBV_INDEX]! > 0)) {
    throw new Error("Main Wire accepted typed hemodynamic TBV is invalid");
  }
  let bloodVolumeMl = 0;
  for (let index = NON_CORONARY_INDEX; index < DYNAMIC_EDGE_INDEX; index += 1) {
    if (!(view[index]! > 0)) {
      throw new Error("Main Wire accepted typed non-coronary volume is invalid");
    }
    bloodVolumeMl += view[index]!;
  }
  for (let index = VALVE_INDEX; index < CORONARY_INDEX; index += 1) {
    if (view[index]! < 0 || view[index]! > 1) {
      throw new Error("Main Wire accepted typed valve opening is invalid");
    }
  }
  for (let index = CORONARY_INDEX; index < CORONARY_TONE_INDEX; index += 1) {
    if (!(view[index]! > 0)) {
      throw new Error("Main Wire accepted typed coronary volume is invalid");
    }
    bloodVolumeMl += view[index]!;
  }
  for (let index = CORONARY_TONE_INDEX; index < WALL_STATE_INDEX; index += 1) {
    if (!(view[index]! > 0)) {
      throw new Error("Main Wire accepted typed coronary tone is invalid");
    }
  }
  const tbvTolerance = 64 * Number.EPSILON
    * Math.max(1, Math.abs(bloodVolumeMl), Math.abs(view[FIXED_TBV_INDEX]!));
  if (Math.abs(bloodVolumeMl - view[FIXED_TBV_INDEX]!) > tbvTolerance) {
    throw new Error("Main Wire accepted typed hemodynamic TBV ledger diverged");
  }
  for (let wall = 0; wall < MAIN_WIRE_FIVE_WALL_IDS_V1.length; wall += 1) {
    const previousCalciumIndex = WALL_STATE_INDEX
      + wall * WALL_STATE_LENGTH + LAND_STATE_LENGTH + 2;
    if (view[previousCalciumIndex]! < 0) {
      throw new Error("Main Wire accepted typed previous calcium is invalid");
    }
  }
  if (
    view[MVC_INDEX + 3]! < 0
    || view[MVC_INDEX + 3]! > view[ACCEPTED_TIME_INDEX]!
    || !Number.isSafeInteger(view[MVC_INDEX + 4])
    || view[MVC_INDEX + 4]! < 0
    || view[MVC_INDEX + 4]! > view[REVISION_INDEX]!
    || (view[MVC_ACTIVE_INDEX] !== 0 && view[MVC_ACTIVE_INDEX] !== 1)
    || !Number.isSafeInteger(view[MVC_INDEX + 6])
    || view[MVC_INDEX + 6]! < 0
  ) {
    throw new Error("Main Wire accepted typed MVC reference is invalid");
  }
}

function continuousSlot(
  manifest: TransactionalTypedStateManifestV1,
  pointer: string,
): number {
  return requiredSlot(manifest.numericalLayout.continuousSlots, pointer);
}

function booleanSlot(
  manifest: TransactionalTypedStateManifestV1,
  pointer: string,
): number {
  return requiredSlot(manifest.numericalLayout.booleanSlots, pointer);
}

function stringSlot(
  manifest: TransactionalTypedStateManifestV1,
  pointer: string,
): number {
  return requiredSlot(manifest.numericalLayout.stringSlots, pointer);
}

function requiredSlot(
  slots: readonly Readonly<{ pointer: string }>[],
  pointer: string,
): number {
  let found = -1;
  for (let index = 0; index < slots.length; index += 1) {
    if (slots[index]?.pointer !== pointer) continue;
    if (found !== -1) {
      throw new Error(
        `Main Wire accepted typed hemodynamic slot ${pointer} is duplicated`,
      );
    }
    found = index;
  }
  if (found === -1) {
    throw new Error(
      `Main Wire accepted typed hemodynamic slot ${pointer} is unavailable`,
    );
  }
  return found;
}

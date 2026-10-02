import {
  DYNAMIC_ROTARY_PUMP_ACCEPTED_FLOW_STATE_V1_ID,
  DYNAMIC_ROTARY_PUMP_UNIT_SYSTEM_V1_ID,
  createDynamicRotaryPumpAcceptedFlowStateV1,
  evaluateDynamicRotaryPumpV1,
  type DynamicRotaryPumpAcceptedFlowStateV1,
  type DynamicRotaryPumpCircuitInertanceV1,
  type DynamicRotaryPumpEvaluationV1,
} from "@/engine/devices/dynamicRotaryPumpV1";
import { evaluateIabpV1 } from "@/engine/devices/iabpV1";
import {
  validateMechanicalSupportConfigV1,
} from "@/engine/devices/networkV1";
import {
  compensatedMechanicalSupportNodeSumV1,
} from "@/engine/devices/mechanicalSupportConservationV1";
import {
  MECHANICAL_SUPPORT_MODEL_V1_ID,
  MECHANICAL_SUPPORT_NODE_NAMES_V1,
  ROTARY_SUPPORT_DEVICE_IDS_V1,
  type IabpEvaluationV1,
  type MechanicalSupportConfigV1,
  type MechanicalSupportHydraulicInputV1,
  type MechanicalSupportNodeNameV1,
  type RotaryPumpDeviceConfigV1,
  type RotarySupportDeviceIdV1,
} from "@/engine/devices/typesV1";
import {
  isTransitivelyFrozenPlainDataV1,
  validationStampIssuanceEligibleV1,
  validationStampReuseEligibleV1,
} from "@/engine/validationStampModeV1";

export const DYNAMIC_MECHANICAL_SUPPORT_NETWORK_V1_ID =
  "circleheart-dynamic-mechanical-support-network-v1" as const;

export const DYNAMIC_MECHANICAL_SUPPORT_INERTANCE_PROFILE_V1_ID =
  "circleheart-dynamic-mechanical-support-inertance-profile-v1" as const;

export const DYNAMIC_MECHANICAL_SUPPORT_DEVICE_PROFILE_BINDING_V1_ID =
  "circleheart-dynamic-mechanical-support-device-profile-binding-v1" as const;

export const DYNAMIC_MECHANICAL_SUPPORT_ACCEPTED_STATE_V1_ID =
  "circleheart-dynamic-mechanical-support-accepted-flow-state-v1" as const;

export const DYNAMIC_MECHANICAL_SUPPORT_STRUCTURAL_HYDRAULIC_PROJECTION_V1_ID =
  "circleheart-dynamic-mechanical-support-structural-hydraulic-projection-v1" as const;

const ML_PER_SEC_PER_L_MIN = 1000 / 60;
const SHA256_HEX = /^[0-9a-f]{64}$/;

type DeviceRecord<T> = Readonly<Record<RotarySupportDeviceIdV1, T>>;
type MutableDeviceRecord<T> = Record<RotarySupportDeviceIdV1, T>;
type NodeRecord<T> = Readonly<Record<MechanicalSupportNodeNameV1, T>>;
type MutableNodeRecord<T> = Record<MechanicalSupportNodeNameV1, T>;

/**
 * Per-device guard against borrowing an inertance from another pump/circuit.
 * This module intentionally defines no release-approved circuit profile.
 */
export type DynamicMechanicalSupportDeviceProfileBindingV1 = Readonly<{
  bindingSchemaId:
    typeof DYNAMIC_MECHANICAL_SUPPORT_DEVICE_PROFILE_BINDING_V1_ID;
  schemaVersion: 1;
  deviceId: RotarySupportDeviceIdV1;
  circuitProfileId: string;
  circuitProfileBindingSha256: string;
}>;

/**
 * Immutable circuit-inertance profile. The supplied digests remain release
 * metadata, but live acceptance never trusts those strings alone: accepted
 * state owns a detached copy of this complete object and a separate structural
 * hydraulic projection. Runtime commands such as rotor speed are excluded.
 */
export type DynamicMechanicalSupportInertanceProfileV1 = Readonly<{
  profileSchemaId:
    typeof DYNAMIC_MECHANICAL_SUPPORT_INERTANCE_PROFILE_V1_ID;
  schemaVersion: 1;
  unitSystemId: typeof DYNAMIC_ROTARY_PUMP_UNIT_SYSTEM_V1_ID;
  profileId: string;
  profileBindingSha256: string;
  deviceProfileBindingByDevice:
    DeviceRecord<DynamicMechanicalSupportDeviceProfileBindingV1>;
  inertanceByDevice: DeviceRecord<DynamicRotaryPumpCircuitInertanceV1>;
}>;

export type DynamicMechanicalSupportDeviceStructuralHydraulicsV1 = Readonly<{
  deviceId: RotarySupportDeviceIdV1;
  inletNode: MechanicalSupportNodeNameV1;
  outletNode: MechanicalSupportNodeNameV1;
  curve: RotaryPumpDeviceConfigV1["curve"];
  drainage: RotaryPumpDeviceConfigV1["drainage"];
  oxygenator: RotaryPumpDeviceConfigV1["oxygenator"];
  returnPath: RotaryPumpDeviceConfigV1["returnPath"];
  inletSuction: RotaryPumpDeviceConfigV1["inletSuction"];
  maximumForwardFlowLMin: number | null;
  maximumReverseFlowLMin: number;
  forwardFlowEvidenceDomain:
    RotaryPumpDeviceConfigV1["forwardFlowEvidenceDomain"];
  vaCannulation: MechanicalSupportConfigV1["vaEcmo"]["cannulation"] | null;
  vvCannulation: MechanicalSupportConfigV1["vvEcmo"]["cannulation"] | null;
  vvHemodynamicCoupling:
    MechanicalSupportConfigV1["vvEcmo"]["hemodynamicCoupling"] | null;
}>;

/**
 * The equation-changing rotary hydraulic structure. Runtime commands are
 * deliberately excluded: enabled, circuitClamped, speedRpm, and Impella P
 * level may change between accepted steps. IABP and gas exchange remain owned
 * by their existing provisional inputs.
 */
export type DynamicMechanicalSupportStructuralHydraulicProjectionV1 = Readonly<{
  projectionSchemaId:
    typeof DYNAMIC_MECHANICAL_SUPPORT_STRUCTURAL_HYDRAULIC_PROJECTION_V1_ID;
  schemaVersion: 1;
  modelId: typeof MECHANICAL_SUPPORT_MODEL_V1_ID;
  byDevice: DeviceRecord<DynamicMechanicalSupportDeviceStructuralHydraulicsV1>;
}>;

/**
 * Accepted memory for the four rotary circuits. In addition to q_n, the state
 * owns detached immutable snapshots of every inertance and structural
 * hydraulic value that changes the rotary equations. Revision, accepted time,
 * and atomic commit ownership remain with the enclosing transaction.
 */
export type DynamicMechanicalSupportAcceptedStateV1 = Readonly<{
  stateSchemaId: typeof DYNAMIC_MECHANICAL_SUPPORT_ACCEPTED_STATE_V1_ID;
  schemaVersion: 1;
  networkId: typeof DYNAMIC_MECHANICAL_SUPPORT_NETWORK_V1_ID;
  unitSystemId: typeof DYNAMIC_ROTARY_PUMP_UNIT_SYSTEM_V1_ID;
  inertanceProfileSnapshot: DynamicMechanicalSupportInertanceProfileV1;
  structuralHydraulicProjection:
    DynamicMechanicalSupportStructuralHydraulicProjectionV1;
  acceptedFlowMlPerSec: DeviceRecord<number>;
}>;

/** Factory provenance prevents a JSON/structured clone from becoming live state. */
const LIVE_DYNAMIC_MECHANICAL_SUPPORT_STATES = new WeakSet<object>();

/**
 * Persistent identity proofs are allowed only for transitively frozen
 * plain-data profiles. Mutable built-ins, including typed-array storage, are
 * ineligible.
 */
const VALIDATED_DYNAMIC_MECHANICAL_SUPPORT_PROFILES = new WeakSet<object>();
const VALIDATED_STRUCTURAL_HYDRAULIC_PROJECTIONS = new WeakSet<object>();
const VALIDATED_LIVE_DYNAMIC_STATE_SHAPES = new WeakSet<object>();

type DynamicMechanicalSupportValidationStampV1 = Readonly<{
  profile: DynamicMechanicalSupportInertanceProfileV1;
  config: MechanicalSupportConfigV1;
}>;

/**
 * A hit requires an exact live factory state plus the exact frozen profile and
 * config pair against which its complete structural binding was proved.
 */
const VALIDATED_DYNAMIC_MECHANICAL_SUPPORT_STATE_BINDINGS = new WeakMap<
  object,
  readonly DynamicMechanicalSupportValidationStampV1[]
>();

const CONFIGURED_PUMP_RECORD_CACHE_V1 = new WeakMap<
  object,
  WeakMap<object, DeviceRecord<RotaryPumpDeviceConfigV1>>
>();

const ZERO_DEVICE_NUMBERS_V1 = Object.freeze({
  LVAD: 0,
  IMPELLA: 0,
  VA_ECMO: 0,
  VV_ECMO: 0,
}) satisfies DeviceRecord<number>;

const ZERO_NODE_NUMBERS_V1 = Object.freeze({
  LV: 0,
  Ao: 0,
  SA: 0,
  RA: 0,
  VC: 0,
}) satisfies NodeRecord<number>;

const ZERO_NODE_JACOBIAN_V1 = Object.freeze({
  LV: ZERO_NODE_NUMBERS_V1,
  Ao: ZERO_NODE_NUMBERS_V1,
  SA: ZERO_NODE_NUMBERS_V1,
  RA: ZERO_NODE_NUMBERS_V1,
  VC: ZERO_NODE_NUMBERS_V1,
}) satisfies DynamicMechanicalSupportNodePressureJacobianV1;

const ZERO_PREVIOUS_FLOW_JACOBIAN_ROW_V1 = ZERO_DEVICE_NUMBERS_V1;
const ZERO_PREVIOUS_FLOW_JACOBIAN_V1 = Object.freeze({
  LV: ZERO_PREVIOUS_FLOW_JACOBIAN_ROW_V1,
  Ao: ZERO_PREVIOUS_FLOW_JACOBIAN_ROW_V1,
  SA: ZERO_PREVIOUS_FLOW_JACOBIAN_ROW_V1,
  RA: ZERO_PREVIOUS_FLOW_JACOBIAN_ROW_V1,
  VC: ZERO_PREVIOUS_FLOW_JACOBIAN_ROW_V1,
}) satisfies DynamicMechanicalSupportPreviousFlowJacobianV1;

export type DynamicMechanicalSupportHydraulicInputV1 =
  MechanicalSupportHydraulicInputV1 & Readonly<{
    dtSec: number;
  }>;

export type DynamicMechanicalSupportNodePressureJacobianV1 = NodeRecord<
  NodeRecord<number>
>;

export type DynamicMechanicalSupportNodeVolumeJacobianV1 = NodeRecord<
  NodeRecord<number>
>;

export type DynamicMechanicalSupportPreviousFlowJacobianV1 = NodeRecord<
  DeviceRecord<number>
>;

export type DynamicMechanicalSupportHydraulicEvaluationV1 = Readonly<{
  modelId: typeof MECHANICAL_SUPPORT_MODEL_V1_ID;
  networkId: typeof DYNAMIC_MECHANICAL_SUPPORT_NETWORK_V1_ID;
  unitSystemId: typeof DYNAMIC_ROTARY_PUMP_UNIT_SYSTEM_V1_ID;
  profileId: string;
  profileBindingSha256: string;
  deviceProfileBindingByDevice:
    DeviceRecord<DynamicMechanicalSupportDeviceProfileBindingV1>;
  dtSec: number;
  pump: DeviceRecord<DynamicRotaryPumpEvaluationV1>;
  iabp: IabpEvaluationV1;
  candidateAcceptedState: DynamicMechanicalSupportAcceptedStateV1;
  nodeNetVolumeRateMlPerSec: NodeRecord<number>;
  /**
   * Partial at fixed explicit inlet volumes; consumers apply pressure chain
   * rules.
   */
  dNodeNetVolumeRateDNodePressureMlPerSecPerMmHg:
    DynamicMechanicalSupportNodePressureJacobianV1;
  /** Explicit legacy inlet-availability volume partial at fixed pressures. */
  dNodeNetVolumeRateDNodeVolumePerSec:
    DynamicMechanicalSupportNodeVolumeJacobianV1;
  dNodeNetVolumeRateDPreviousDeviceFlow:
    DynamicMechanicalSupportPreviousFlowJacobianV1;
  constraintReactionMmHgByDevice: DeviceRecord<number>;
  constraintImpulseMmHgSecByDevice: DeviceRecord<number>;
  totalLeftHeartBypassFlowLMin: number;
  totalExtracorporealFlowLMin: number;
  conservationResidualMlPerSec: number;
  pressureJacobianConservationResidualMlPerSecPerMmHg:
    NodeRecord<number>;
  volumeJacobianConservationResidualPerSec: NodeRecord<number>;
  previousFlowJacobianConservationResidual:
    DeviceRecord<number>;
}>;

export function createDynamicMechanicalSupportDeviceProfileBindingV1(
  input: Readonly<{
    deviceId: RotarySupportDeviceIdV1;
    circuitProfileId: string;
    circuitProfileBindingSha256: string;
  }>,
): DynamicMechanicalSupportDeviceProfileBindingV1 {
  assertExactKeys(
    input,
    ["deviceId", "circuitProfileId", "circuitProfileBindingSha256"],
    "dynamic mechanical-support device profile binding input",
  );
  validateDeviceId(input.deviceId, "device profile binding deviceId");
  return Object.freeze({
    bindingSchemaId:
      DYNAMIC_MECHANICAL_SUPPORT_DEVICE_PROFILE_BINDING_V1_ID,
    schemaVersion: 1 as const,
    deviceId: input.deviceId,
    circuitProfileId: nonempty(
      input.circuitProfileId,
      "circuitProfileId",
    ),
    circuitProfileBindingSha256: sha256(
      input.circuitProfileBindingSha256,
      "circuitProfileBindingSha256",
    ),
  });
}

export function createDynamicMechanicalSupportInertanceProfileV1(
  input: Readonly<{
    profileId: string;
    profileBindingSha256: string;
    deviceProfileBindingByDevice:
      DeviceRecord<DynamicMechanicalSupportDeviceProfileBindingV1>;
    inertanceByDevice: DeviceRecord<DynamicRotaryPumpCircuitInertanceV1>;
  }>,
): DynamicMechanicalSupportInertanceProfileV1 {
  assertExactKeys(
    input,
    [
      "profileId",
      "profileBindingSha256",
      "deviceProfileBindingByDevice",
      "inertanceByDevice",
    ],
    "dynamic mechanical-support profile input",
  );
  const profileId = nonempty(input.profileId, "profileId");
  const profileBindingSha256 = sha256(
    input.profileBindingSha256,
    "profileBindingSha256",
  );
  const deviceProfileBindingByDevice = copyDeviceProfileBindingRecord(
    input.deviceProfileBindingByDevice,
  );
  const inertanceByDevice = copyInertanceRecord(input.inertanceByDevice);
  const profile = Object.freeze({
    profileSchemaId: DYNAMIC_MECHANICAL_SUPPORT_INERTANCE_PROFILE_V1_ID,
    schemaVersion: 1 as const,
    unitSystemId: DYNAMIC_ROTARY_PUMP_UNIT_SYSTEM_V1_ID,
    profileId,
    profileBindingSha256,
    deviceProfileBindingByDevice,
    inertanceByDevice,
  });
  if (validationStampIssuanceEligibleV1(profile)) {
    VALIDATED_DYNAMIC_MECHANICAL_SUPPORT_PROFILES.add(profile);
  }
  return profile;
}

export function createDynamicMechanicalSupportStructuralHydraulicProjectionV1(
  config: MechanicalSupportConfigV1,
): DynamicMechanicalSupportStructuralHydraulicProjectionV1 {
  validateMechanicalSupportConfigV1(config);
  const configs = configuredPumpRecord(config);
  return Object.freeze({
    projectionSchemaId:
      DYNAMIC_MECHANICAL_SUPPORT_STRUCTURAL_HYDRAULIC_PROJECTION_V1_ID,
    schemaVersion: 1 as const,
    modelId: MECHANICAL_SUPPORT_MODEL_V1_ID,
    byDevice: deviceRecord((deviceId) =>
      copyDeviceStructuralHydraulics(deviceId, configs[deviceId], config)),
  });
}

export function createDynamicMechanicalSupportAcceptedStateV1(
  profile: DynamicMechanicalSupportInertanceProfileV1,
  config: MechanicalSupportConfigV1,
  acceptedFlowMlPerSec?: DeviceRecord<number>,
): DynamicMechanicalSupportAcceptedStateV1 {
  const inertanceProfileSnapshot = copyInertanceProfile(profile);
  const structuralHydraulicProjection =
    createDynamicMechanicalSupportStructuralHydraulicProjectionV1(config);
  const flows = acceptedFlowMlPerSec === undefined
    ? deviceRecord(() => 0)
    : copyFlowRecord(acceptedFlowMlPerSec, "acceptedFlowMlPerSec");
  const state = createAcceptedStateFromOwnedBinding(
    inertanceProfileSnapshot,
    structuralHydraulicProjection,
    flows,
  );
  stampConstructedDynamicMechanicalSupportAcceptedStateV1(
    state,
    profile,
    config,
  );
  return state;
}

/**
 * Rehydrates JSON-safe accepted state only after its enclosing integrity check.
 * The returned live state is rebuilt from an already-live expected binding;
 * no profile/config identity declared by the serialized value is trusted.
 */
export function restoreDynamicMechanicalSupportAcceptedStateV1(
  candidate: unknown,
  expectedBindingState: DynamicMechanicalSupportAcceptedStateV1,
): DynamicMechanicalSupportAcceptedStateV1 {
  assertAcceptedStateShape(expectedBindingState, true);
  assertAcceptedStateShape(candidate, false);
  const serialized = candidate as DynamicMechanicalSupportAcceptedStateV1;
  if (!profilesExactlyEqual(
    serialized.inertanceProfileSnapshot,
    expectedBindingState.inertanceProfileSnapshot,
  )) {
    throw new Error(
      "serialized dynamic mechanical-support inertance profile content mismatch",
    );
  }
  if (!structuralProjectionsExactlyEqual(
    serialized.structuralHydraulicProjection,
    expectedBindingState.structuralHydraulicProjection,
  )) {
    throw new Error(
      "serialized dynamic mechanical-support structural hydraulic content mismatch",
    );
  }
  return createAcceptedStateFromOwnedBinding(
    expectedBindingState.inertanceProfileSnapshot,
    expectedBindingState.structuralHydraulicProjection,
    copyFlowRecord(
      serialized.acceptedFlowMlPerSec,
      "serialized state.acceptedFlowMlPerSec",
    ),
  );
}

function createAcceptedStateFromOwnedBinding(
  inertanceProfileSnapshot: DynamicMechanicalSupportInertanceProfileV1,
  structuralHydraulicProjection:
    DynamicMechanicalSupportStructuralHydraulicProjectionV1,
  acceptedFlowMlPerSec: DeviceRecord<number>,
): DynamicMechanicalSupportAcceptedStateV1 {
  const state = Object.freeze({
    stateSchemaId: DYNAMIC_MECHANICAL_SUPPORT_ACCEPTED_STATE_V1_ID,
    schemaVersion: 1 as const,
    networkId: DYNAMIC_MECHANICAL_SUPPORT_NETWORK_V1_ID,
    unitSystemId: DYNAMIC_ROTARY_PUMP_UNIT_SYSTEM_V1_ID,
    inertanceProfileSnapshot,
    structuralHydraulicProjection,
    acceptedFlowMlPerSec,
  });
  LIVE_DYNAMIC_MECHANICAL_SUPPORT_STATES.add(state);
  return state;
}

export function validateDynamicMechanicalSupportInertanceProfileV1(
  profile: unknown,
): asserts profile is DynamicMechanicalSupportInertanceProfileV1 {
  if (
    profile !== null
    && typeof profile === "object"
    && validationStampReuseEligibleV1()
    && VALIDATED_DYNAMIC_MECHANICAL_SUPPORT_PROFILES.has(profile)
  ) {
    // This persistent proof is sound because only a transitively frozen
    // plain-data profile can enter the set. Any clone, mutable built-in, or
    // mutable object misses and crosses the complete exported validation path.
    return;
  }
  plainRecord(profile, "dynamic mechanical-support inertance profile");
  assertExactKeys(
    profile,
    [
      "profileSchemaId",
      "schemaVersion",
      "unitSystemId",
      "profileId",
      "profileBindingSha256",
      "deviceProfileBindingByDevice",
      "inertanceByDevice",
    ],
    "dynamic mechanical-support inertance profile",
  );
  const typed = profile as Partial<DynamicMechanicalSupportInertanceProfileV1>;
  if (typed.profileSchemaId
      !== DYNAMIC_MECHANICAL_SUPPORT_INERTANCE_PROFILE_V1_ID
      || typed.schemaVersion !== 1
      || typed.unitSystemId !== DYNAMIC_ROTARY_PUMP_UNIT_SYSTEM_V1_ID) {
    throw new Error("dynamic mechanical-support inertance profile identity mismatch");
  }
  nonempty(typed.profileId, "profile.profileId");
  sha256(typed.profileBindingSha256, "profile.profileBindingSha256");
  validateDeviceProfileBindingRecord(
    typed.deviceProfileBindingByDevice,
    "profile.deviceProfileBindingByDevice",
  );
  validateInertanceRecord(
    typed.inertanceByDevice,
    "profile.inertanceByDevice",
  );
  if (validationStampIssuanceEligibleV1(profile)) {
    VALIDATED_DYNAMIC_MECHANICAL_SUPPORT_PROFILES.add(profile);
  }
}

export function validateDynamicMechanicalSupportAcceptedStateV1(
  state: unknown,
  profile: DynamicMechanicalSupportInertanceProfileV1,
  config: MechanicalSupportConfigV1,
): asserts state is DynamicMechanicalSupportAcceptedStateV1 {
  if (
    state !== null
    && typeof state === "object"
    && validationStampReuseEligibleV1()
    && hasDynamicMechanicalSupportValidationStampV1(state, profile, config)
  ) {
    // This persistent proof is sound because the live state, profile, and
    // config are all transitively frozen plain data. Restored, copied,
    // hand-built, differently bound, or mutable inputs miss it and retain the
    // full exported boundary validation.
    return;
  }
  validateDynamicMechanicalSupportInertanceProfileV1(profile);
  validateMechanicalSupportConfigV1(config);
  assertAcceptedStateShape(state, true);
  if (!profilesExactlyEqual(state.inertanceProfileSnapshot, profile)) {
    throw new Error(
      "dynamic mechanical-support accepted state profile content mismatch",
    );
  }
  if (!structuralProjectionMatchesConfig(
    state.structuralHydraulicProjection,
    config,
  )) {
    throw new Error(
      "dynamic mechanical-support accepted state structural hydraulic config mismatch",
    );
  }
  stampValidatedDynamicMechanicalSupportAcceptedStateV1(
    state,
    profile,
    config,
  );
}

/**
 * Pure four-circuit backward-Euler trial. All four device evaluations read the
 * same immutable q_n record; only candidateAcceptedState contains q_(n+1).
 */
export function evaluateDynamicMechanicalSupportHydraulicsV1(
  config: MechanicalSupportConfigV1,
  profile: DynamicMechanicalSupportInertanceProfileV1,
  previousAcceptedState: DynamicMechanicalSupportAcceptedStateV1,
  input: DynamicMechanicalSupportHydraulicInputV1,
): DynamicMechanicalSupportHydraulicEvaluationV1 {
  validateMechanicalSupportConfigV1(config);
  validateDynamicMechanicalSupportInertanceProfileV1(profile);
  validateDynamicMechanicalSupportAcceptedStateV1(
    previousAcceptedState,
    profile,
    config,
  );
  validateInput(input);

  const dtSec = positive(input.dtSec, "dtSec");
  const configs = configuredPumpRecordFromOwnedStructure(
    config,
    previousAcceptedState.structuralHydraulicProjection,
  );
  const ownedProfile = previousAcceptedState.inertanceProfileSnapshot;
  const pump = deviceRecord((deviceId) => evaluateDynamicRotaryPumpV1(
    deviceId,
    configs[deviceId],
    dynamicDeviceState(
      deviceId,
      previousAcceptedState.acceptedFlowMlPerSec[deviceId],
    ),
    {
      dtSec,
      inertance: ownedProfile.inertanceByDevice[deviceId],
      inletPressureMmHg:
        input.nodeAbsolutePressureMmHg[configs[deviceId].inletNode],
      outletPressureMmHg:
        input.nodeAbsolutePressureMmHg[configs[deviceId].outletNode],
      inletVolumeMl: input.nodeVolumeMl?.[configs[deviceId].inletNode],
    },
  ));
  if (rotaryPumpCommandsAreAllDisabled(config)) {
    return evaluateAllRotaryPumpsDisabled(
      config,
      profile,
      previousAcceptedState,
      input,
      dtSec,
      pump,
    );
  }
  const candidateAcceptedState = createAcceptedStateFromOwnedBinding(
    previousAcceptedState.inertanceProfileSnapshot,
    previousAcceptedState.structuralHydraulicProjection,
    deviceRecord((deviceId) =>
      pump[deviceId].candidateAcceptedState.acceptedFlowMlPerSec),
  );
  // This candidate is private same-tick output assembled from the accepted
  // state's owned immutable binding and the four validated pump candidates.
  // Only this exact state/profile/config identity proof can be reused.
  stampConstructedDynamicMechanicalSupportAcceptedStateV1(
    candidateAcceptedState,
    profile,
    config,
  );
  const nodeRates = mutableNodeRecord(() => 0);
  const pressureJacobian = mutableNodeMatrix();
  const volumeJacobian = mutableNodeMatrix();
  const previousFlowJacobian = mutablePreviousFlowJacobian();

  for (const deviceId of ROTARY_SUPPORT_DEVICE_IDS_V1) {
    const evaluation = pump[deviceId];
    if (evaluation.inletNode === evaluation.outletNode) continue;
    // Reproduce the V1 network conversion path exactly when inertance is zero.
    const routedFlowMlPerSec = evaluation.flowLMin
      * ML_PER_SEC_PER_L_MIN;
    nodeRates[evaluation.inletNode] -= routedFlowMlPerSec;
    nodeRates[evaluation.outletNode] += routedFlowMlPerSec;
    addIncidenceDerivative(
      pressureJacobian,
      evaluation.inletNode,
      evaluation.outletNode,
      evaluation.inletNode,
      evaluation.dFlowMlPerSecDInletPressureMlPerSecPerMmHg,
    );
    addIncidenceDerivative(
      pressureJacobian,
      evaluation.inletNode,
      evaluation.outletNode,
      evaluation.outletNode,
      evaluation.dFlowMlPerSecDOutletPressureMlPerSecPerMmHg,
    );
    addIncidenceDerivative(
      volumeJacobian,
      evaluation.inletNode,
      evaluation.outletNode,
      evaluation.inletNode,
      evaluation.dFlowMlPerSecDInletVolumePerSec,
    );
    previousFlowJacobian[evaluation.inletNode][deviceId] -=
      evaluation.dFlowMlPerSecDPreviousFlow;
    previousFlowJacobian[evaluation.outletNode][deviceId] +=
      evaluation.dFlowMlPerSecDPreviousFlow;
  }

  const nodeNetVolumeRateMlPerSec = freezeNodeRecord(nodeRates);
  const frozenPressureJacobian = freezeNodeMatrix(pressureJacobian);
  const frozenVolumeJacobian = freezeNodeMatrix(volumeJacobian);
  const frozenPreviousFlowJacobian = freezePreviousFlowJacobian(
    previousFlowJacobian,
  );
  const conservationResidualMlPerSec = sumNodeRecord(
    nodeNetVolumeRateMlPerSec,
  );
  const pressureConservation = nodeRecord((column) =>
    sumNodeColumn(frozenPressureJacobian, column));
  const volumeConservation = nodeRecord((column) =>
    sumNodeColumn(frozenVolumeJacobian, column));
  const previousFlowConservation = deviceRecord((deviceId) =>
    MECHANICAL_SUPPORT_NODE_NAMES_V1.reduce(
      (sum, node) => sum + frozenPreviousFlowJacobian[node][deviceId],
      0,
    ));

  return Object.freeze({
    modelId: MECHANICAL_SUPPORT_MODEL_V1_ID,
    networkId: DYNAMIC_MECHANICAL_SUPPORT_NETWORK_V1_ID,
    unitSystemId: DYNAMIC_ROTARY_PUMP_UNIT_SYSTEM_V1_ID,
    profileId: ownedProfile.profileId,
    profileBindingSha256: ownedProfile.profileBindingSha256,
    deviceProfileBindingByDevice: ownedProfile.deviceProfileBindingByDevice,
    dtSec,
    pump,
    iabp: evaluateIabpV1(config.iabp, input),
    candidateAcceptedState,
    nodeNetVolumeRateMlPerSec,
    dNodeNetVolumeRateDNodePressureMlPerSecPerMmHg:
      frozenPressureJacobian,
    dNodeNetVolumeRateDNodeVolumePerSec: frozenVolumeJacobian,
    dNodeNetVolumeRateDPreviousDeviceFlow: frozenPreviousFlowJacobian,
    constraintReactionMmHgByDevice: deviceRecord((deviceId) =>
      pump[deviceId].constraintReactionMmHg),
    constraintImpulseMmHgSecByDevice: deviceRecord((deviceId) =>
      pump[deviceId].constraintReactionMmHg * dtSec),
    totalLeftHeartBypassFlowLMin:
      pump.LVAD.flowLMin + pump.IMPELLA.flowLMin,
    totalExtracorporealFlowLMin:
      pump.VA_ECMO.flowLMin + pump.VV_ECMO.flowLMin,
    conservationResidualMlPerSec,
    pressureJacobianConservationResidualMlPerSecPerMmHg:
      pressureConservation,
    volumeJacobianConservationResidualPerSec: volumeConservation,
    previousFlowJacobianConservationResidual: previousFlowConservation,
  });
}

function evaluateAllRotaryPumpsDisabled(
  config: MechanicalSupportConfigV1,
  profile: DynamicMechanicalSupportInertanceProfileV1,
  previousAcceptedState: DynamicMechanicalSupportAcceptedStateV1,
  input: DynamicMechanicalSupportHydraulicInputV1,
  dtSec: number,
  pump: DeviceRecord<DynamicRotaryPumpEvaluationV1>,
): DynamicMechanicalSupportHydraulicEvaluationV1 {
  const acceptedFlowsAreCanonicalZero = ROTARY_SUPPORT_DEVICE_IDS_V1.every(
    (deviceId) => previousAcceptedState.acceptedFlowMlPerSec[deviceId] === 0,
  );
  const candidateAcceptedState = acceptedFlowsAreCanonicalZero
    ? previousAcceptedState
    : createAcceptedStateFromOwnedBinding(
      previousAcceptedState.inertanceProfileSnapshot,
      previousAcceptedState.structuralHydraulicProjection,
      ZERO_DEVICE_NUMBERS_V1,
    );
  if (!acceptedFlowsAreCanonicalZero) {
    stampConstructedDynamicMechanicalSupportAcceptedStateV1(
      candidateAcceptedState,
      profile,
      config,
    );
  }
  const ownedProfile = previousAcceptedState.inertanceProfileSnapshot;
  return Object.freeze({
    modelId: MECHANICAL_SUPPORT_MODEL_V1_ID,
    networkId: DYNAMIC_MECHANICAL_SUPPORT_NETWORK_V1_ID,
    unitSystemId: DYNAMIC_ROTARY_PUMP_UNIT_SYSTEM_V1_ID,
    profileId: ownedProfile.profileId,
    profileBindingSha256: ownedProfile.profileBindingSha256,
    deviceProfileBindingByDevice: ownedProfile.deviceProfileBindingByDevice,
    dtSec,
    pump,
    iabp: evaluateIabpV1(config.iabp, input),
    candidateAcceptedState,
    nodeNetVolumeRateMlPerSec: ZERO_NODE_NUMBERS_V1,
    dNodeNetVolumeRateDNodePressureMlPerSecPerMmHg:
      ZERO_NODE_JACOBIAN_V1,
    dNodeNetVolumeRateDNodeVolumePerSec: ZERO_NODE_JACOBIAN_V1,
    dNodeNetVolumeRateDPreviousDeviceFlow:
      ZERO_PREVIOUS_FLOW_JACOBIAN_V1,
    constraintReactionMmHgByDevice: ZERO_DEVICE_NUMBERS_V1,
    constraintImpulseMmHgSecByDevice: ZERO_DEVICE_NUMBERS_V1,
    totalLeftHeartBypassFlowLMin: 0,
    totalExtracorporealFlowLMin: 0,
    conservationResidualMlPerSec: 0,
    pressureJacobianConservationResidualMlPerSecPerMmHg:
      ZERO_NODE_NUMBERS_V1,
    volumeJacobianConservationResidualPerSec: ZERO_NODE_NUMBERS_V1,
    previousFlowJacobianConservationResidual: ZERO_DEVICE_NUMBERS_V1,
  });
}

function rotaryPumpCommandsAreAllDisabled(
  config: MechanicalSupportConfigV1,
): boolean {
  return !config.lvad.enabled
    && !config.impella.enabled
    && !config.vaEcmo.enabled
    && !config.vvEcmo.enabled;
}

function configuredPumpRecord(
  config: MechanicalSupportConfigV1,
): DeviceRecord<RotaryPumpDeviceConfigV1> {
  return Object.freeze({
    LVAD: config.lvad,
    IMPELLA: config.impella,
    VA_ECMO: config.vaEcmo,
    VV_ECMO: config.vvEcmo,
  });
}

function configuredPumpRecordFromOwnedStructure(
  config: MechanicalSupportConfigV1,
  projection: DynamicMechanicalSupportStructuralHydraulicProjectionV1,
): DeviceRecord<RotaryPumpDeviceConfigV1> {
  if (Object.isFrozen(config) && Object.isFrozen(projection)) {
    const cached = CONFIGURED_PUMP_RECORD_CACHE_V1.get(projection)?.get(config);
    if (cached !== undefined) return cached;
  }
  const commands = configuredPumpRecord(config);
  const configured = deviceRecord((deviceId) => {
    const command = commands[deviceId];
    const structural = projection.byDevice[deviceId];
    return Object.freeze({
      enabled: command.enabled,
      circuitClamped: command.circuitClamped,
      speedRpm: command.speedRpm,
      inletNode: structural.inletNode,
      outletNode: structural.outletNode,
      curve: structural.curve,
      drainage: structural.drainage,
      oxygenator: structural.oxygenator,
      returnPath: structural.returnPath,
      inletSuction: structural.inletSuction,
      maximumForwardFlowLMin: structural.maximumForwardFlowLMin,
      maximumReverseFlowLMin: structural.maximumReverseFlowLMin,
      forwardFlowEvidenceDomain: structural.forwardFlowEvidenceDomain,
    });
  });
  if (Object.isFrozen(config) && Object.isFrozen(projection)) {
    let byConfig = CONFIGURED_PUMP_RECORD_CACHE_V1.get(projection);
    if (byConfig === undefined) {
      byConfig = new WeakMap();
      CONFIGURED_PUMP_RECORD_CACHE_V1.set(projection, byConfig);
    }
    byConfig.set(config, configured);
  }
  return configured;
}

function copyDeviceStructuralHydraulics(
  deviceId: RotarySupportDeviceIdV1,
  config: RotaryPumpDeviceConfigV1,
  wholeConfig: MechanicalSupportConfigV1,
): DynamicMechanicalSupportDeviceStructuralHydraulicsV1 {
  return Object.freeze({
    deviceId,
    inletNode: config.inletNode,
    outletNode: config.outletNode,
    curve: Object.freeze({
      referenceSpeedRpm: config.curve.referenceSpeedRpm,
      shutoffHeadMmHg: config.curve.shutoffHeadMmHg,
      linearLossMmHgSecPerMl: config.curve.linearLossMmHgSecPerMl,
      linearLossSpeedExponent: config.curve.linearLossSpeedExponent,
      quadraticLossMmHgSec2PerMl2:
        config.curve.quadraticLossMmHgSec2PerMl2,
    }),
    drainage: copyHydraulicSegment(config.drainage),
    oxygenator: copyHydraulicSegment(config.oxygenator),
    returnPath: copyHydraulicSegment(config.returnPath),
    inletSuction: copyInletSuction(config.inletSuction),
    maximumForwardFlowLMin: config.maximumForwardFlowLMin,
    maximumReverseFlowLMin: config.maximumReverseFlowLMin,
    forwardFlowEvidenceDomain: Object.freeze({
      publishedExperimentalTraversalUpperLMin:
        config.forwardFlowEvidenceDomain
          .publishedExperimentalTraversalUpperLMin,
      advertisedCapacityLMin:
        config.forwardFlowEvidenceDomain.advertisedCapacityLMin,
    }),
    vaCannulation: deviceId === "VA_ECMO"
      ? wholeConfig.vaEcmo.cannulation
      : null,
    vvCannulation: deviceId === "VV_ECMO"
      ? wholeConfig.vvEcmo.cannulation
      : null,
    vvHemodynamicCoupling: deviceId === "VV_ECMO"
      ? wholeConfig.vvEcmo.hemodynamicCoupling
      : null,
  });
}

function copyHydraulicSegment(
  segment: RotaryPumpDeviceConfigV1["drainage"],
): RotaryPumpDeviceConfigV1["drainage"] {
  return Object.freeze({
    linearResistanceMmHgSecPerMl:
      segment.linearResistanceMmHgSecPerMl,
    quadraticResistanceMmHgSec2PerMl2:
      segment.quadraticResistanceMmHgSec2PerMl2,
  });
}

function copyInletSuction(
  suction: RotaryPumpDeviceConfigV1["inletSuction"],
): RotaryPumpDeviceConfigV1["inletSuction"] {
  switch (suction.kind) {
    case "none":
      return Object.freeze({ kind: "none" });
    case "pressure-dependent-series-resistance":
      return Object.freeze({
        kind: suction.kind,
        thresholdPressureMmHg: suction.thresholdPressureMmHg,
        resistanceSlopeMmHgSecPerMlPerMmHg:
          suction.resistanceSlopeMmHgSecPerMlPerMmHg,
      });
    case "legacy-smooth-availability":
      return Object.freeze({
        kind: suction.kind,
        collapsePressureMmHg: suction.collapsePressureMmHg,
        recoveredPressureMmHg: suction.recoveredPressureMmHg,
        minimumVolumeMl: suction.minimumVolumeMl,
        recoveredVolumeMl: suction.recoveredVolumeMl,
      });
  }
}

function dynamicDeviceState(
  deviceId: RotarySupportDeviceIdV1,
  flowMlPerSec: number,
): DynamicRotaryPumpAcceptedFlowStateV1 {
  const state = createDynamicRotaryPumpAcceptedFlowStateV1(
    deviceId,
    flowMlPerSec,
  );
  if (state.stateId !== DYNAMIC_ROTARY_PUMP_ACCEPTED_FLOW_STATE_V1_ID) {
    throw new Error("dynamic rotary-pump state identity mismatch");
  }
  return state;
}

function validateInput(input: DynamicMechanicalSupportHydraulicInputV1): void {
  plainRecord(input, "dynamic mechanical-support hydraulic input");
  assertAllowedKeys(
    input,
    [
      "dtSec",
      "timeSec",
      "cyclePhase01",
      "beatIndex",
      "heartRateBpm",
      "nodeAbsolutePressureMmHg",
      "nodeVolumeMl",
    ],
    "dynamic mechanical-support hydraulic input",
  );
  positive(input.dtSec, "dtSec");
  finite(input.timeSec, "timeSec");
  finite(input.cyclePhase01, "cyclePhase01");
  finite(input.beatIndex, "beatIndex");
  positive(input.heartRateBpm, "heartRateBpm");
  plainRecord(input.nodeAbsolutePressureMmHg, "nodeAbsolutePressureMmHg");
  assertExactKeys(
    input.nodeAbsolutePressureMmHg,
    MECHANICAL_SUPPORT_NODE_NAMES_V1,
    "nodeAbsolutePressureMmHg",
  );
  for (const node of MECHANICAL_SUPPORT_NODE_NAMES_V1) {
    finite(input.nodeAbsolutePressureMmHg[node], `${node} pressure`);
  }
  if (input.nodeVolumeMl !== undefined) {
    plainRecord(input.nodeVolumeMl, "nodeVolumeMl");
    assertAllowedKeys(
      input.nodeVolumeMl,
      MECHANICAL_SUPPORT_NODE_NAMES_V1,
      "nodeVolumeMl",
    );
    for (const [node, volume] of Object.entries(input.nodeVolumeMl)) {
      nonnegative(volume, `${node} volume`);
    }
  }
}

function validateDeviceProfileBindingRecord(
  value: unknown,
  label: string,
): asserts value is DeviceRecord<
  DynamicMechanicalSupportDeviceProfileBindingV1
> {
  plainRecord(value, label);
  assertExactKeys(value, ROTARY_SUPPORT_DEVICE_IDS_V1, label);
  const record = value as Record<string, unknown>;
  for (const deviceId of ROTARY_SUPPORT_DEVICE_IDS_V1) {
    const binding = record[deviceId];
    plainRecord(binding, `${label}.${deviceId}`);
    assertExactKeys(
      binding,
      [
        "bindingSchemaId",
        "schemaVersion",
        "deviceId",
        "circuitProfileId",
        "circuitProfileBindingSha256",
      ],
      `${label}.${deviceId}`,
    );
    const typed = binding as Partial<
      DynamicMechanicalSupportDeviceProfileBindingV1
    >;
    if (typed.bindingSchemaId
        !== DYNAMIC_MECHANICAL_SUPPORT_DEVICE_PROFILE_BINDING_V1_ID
        || typed.schemaVersion !== 1) {
      throw new Error(`${label}.${deviceId} identity mismatch`);
    }
    if (typed.deviceId !== deviceId) {
      throw new Error(
        `${label}.${deviceId} belongs to ${String(typed.deviceId)}`,
      );
    }
    nonempty(
      typed.circuitProfileId,
      `${label}.${deviceId}.circuitProfileId`,
    );
    sha256(
      typed.circuitProfileBindingSha256,
      `${label}.${deviceId}.circuitProfileBindingSha256`,
    );
  }
}

function copyDeviceProfileBindingRecord(
  value: unknown,
): DeviceRecord<DynamicMechanicalSupportDeviceProfileBindingV1> {
  validateDeviceProfileBindingRecord(
    value,
    "deviceProfileBindingByDevice",
  );
  return deviceRecord((deviceId) => Object.freeze({
    bindingSchemaId:
      DYNAMIC_MECHANICAL_SUPPORT_DEVICE_PROFILE_BINDING_V1_ID,
    schemaVersion: 1 as const,
    deviceId,
    circuitProfileId: value[deviceId].circuitProfileId,
    circuitProfileBindingSha256:
      value[deviceId].circuitProfileBindingSha256,
  }));
}

function validateInertanceRecord(
  value: unknown,
  label: string,
): asserts value is DeviceRecord<DynamicRotaryPumpCircuitInertanceV1> {
  plainRecord(value, label);
  assertExactKeys(value, ROTARY_SUPPORT_DEVICE_IDS_V1, label);
  const record = value as Record<string, unknown>;
  for (const deviceId of ROTARY_SUPPORT_DEVICE_IDS_V1) {
    const inertance = record[deviceId];
    plainRecord(inertance, `${label}.${deviceId}`);
    assertExactKeys(
      inertance,
      [
        "unitSystemId",
        "pumpInternalMmHgSec2PerMl",
        "drainageMmHgSec2PerMl",
        "oxygenatorMmHgSec2PerMl",
        "returnPathMmHgSec2PerMl",
      ],
      `${label}.${deviceId}`,
    );
    const typed = inertance as Partial<DynamicRotaryPumpCircuitInertanceV1>;
    if (typed.unitSystemId !== DYNAMIC_ROTARY_PUMP_UNIT_SYSTEM_V1_ID) {
      throw new Error(`${label}.${deviceId}.unitSystemId is incompatible`);
    }
    nonnegative(
      typed.pumpInternalMmHgSec2PerMl,
      `${label}.${deviceId}.pumpInternalMmHgSec2PerMl`,
    );
    nonnegative(
      typed.drainageMmHgSec2PerMl,
      `${label}.${deviceId}.drainageMmHgSec2PerMl`,
    );
    nonnegative(
      typed.oxygenatorMmHgSec2PerMl,
      `${label}.${deviceId}.oxygenatorMmHgSec2PerMl`,
    );
    nonnegative(
      typed.returnPathMmHgSec2PerMl,
      `${label}.${deviceId}.returnPathMmHgSec2PerMl`,
    );
  }
}

function copyInertanceRecord(
  value: unknown,
): DeviceRecord<DynamicRotaryPumpCircuitInertanceV1> {
  validateInertanceRecord(value, "inertanceByDevice");
  return deviceRecord((deviceId) => Object.freeze({
    unitSystemId: DYNAMIC_ROTARY_PUMP_UNIT_SYSTEM_V1_ID,
    pumpInternalMmHgSec2PerMl:
      value[deviceId].pumpInternalMmHgSec2PerMl,
    drainageMmHgSec2PerMl: value[deviceId].drainageMmHgSec2PerMl,
    oxygenatorMmHgSec2PerMl: value[deviceId].oxygenatorMmHgSec2PerMl,
    returnPathMmHgSec2PerMl: value[deviceId].returnPathMmHgSec2PerMl,
  }));
}

function copyFlowRecord(
  value: unknown,
  label: string,
): DeviceRecord<number> {
  plainRecord(value, label);
  assertExactKeys(value, ROTARY_SUPPORT_DEVICE_IDS_V1, label);
  const record = value as Record<string, unknown>;
  return deviceRecord((deviceId) => {
    const flow = finite(record[deviceId], `${label}.${deviceId}`);
    return flow === 0 ? 0 : flow;
  });
}

function copyInertanceProfile(
  profile: DynamicMechanicalSupportInertanceProfileV1,
): DynamicMechanicalSupportInertanceProfileV1 {
  validateDynamicMechanicalSupportInertanceProfileV1(profile);
  return createDynamicMechanicalSupportInertanceProfileV1({
    profileId: profile.profileId,
    profileBindingSha256: profile.profileBindingSha256,
    deviceProfileBindingByDevice: profile.deviceProfileBindingByDevice,
    inertanceByDevice: profile.inertanceByDevice,
  });
}

function assertAcceptedStateShape(
  state: unknown,
  requireLiveFactoryState: boolean,
): asserts state is DynamicMechanicalSupportAcceptedStateV1 {
  if (requireLiveFactoryState && state !== null && typeof state === "object"
      && validationStampReuseEligibleV1()
      && VALIDATED_LIVE_DYNAMIC_STATE_SHAPES.has(state)) return;
  plainRecord(state, "dynamic mechanical-support accepted state");
  assertExactKeys(
    state,
    [
      "stateSchemaId",
      "schemaVersion",
      "networkId",
      "unitSystemId",
      "inertanceProfileSnapshot",
      "structuralHydraulicProjection",
      "acceptedFlowMlPerSec",
    ],
    "dynamic mechanical-support accepted state",
  );
  const typed = state as Partial<DynamicMechanicalSupportAcceptedStateV1>;
  if (typed.stateSchemaId !== DYNAMIC_MECHANICAL_SUPPORT_ACCEPTED_STATE_V1_ID
      || typed.schemaVersion !== 1
      || typed.networkId !== DYNAMIC_MECHANICAL_SUPPORT_NETWORK_V1_ID
      || typed.unitSystemId !== DYNAMIC_ROTARY_PUMP_UNIT_SYSTEM_V1_ID) {
    throw new Error("dynamic mechanical-support accepted state identity mismatch");
  }
  validateDynamicMechanicalSupportInertanceProfileV1(
    typed.inertanceProfileSnapshot,
  );
  validateStructuralHydraulicProjection(
    typed.structuralHydraulicProjection,
  );
  copyFlowRecord(
    typed.acceptedFlowMlPerSec,
    "state.acceptedFlowMlPerSec",
  );
  if (requireLiveFactoryState) {
    if (!LIVE_DYNAMIC_MECHANICAL_SUPPORT_STATES.has(state)) {
      throw new Error(
        "dynamic mechanical-support accepted state lacks live factory provenance",
      );
    }
    assertDeepFrozen(state, "dynamic mechanical-support accepted state");
    if (validationStampIssuanceEligibleV1(state)) {
      VALIDATED_LIVE_DYNAMIC_STATE_SHAPES.add(state);
    }
  }
}

function validateStructuralHydraulicProjection(
  value: unknown,
): asserts value is DynamicMechanicalSupportStructuralHydraulicProjectionV1 {
  if (value !== null && typeof value === "object"
      && validationStampReuseEligibleV1()
      && VALIDATED_STRUCTURAL_HYDRAULIC_PROJECTIONS.has(value)) return;
  plainRecord(value, "structural hydraulic projection");
  assertExactKeys(value, [
    "projectionSchemaId",
    "schemaVersion",
    "modelId",
    "byDevice",
  ], "structural hydraulic projection");
  const projection = value as Partial<
    DynamicMechanicalSupportStructuralHydraulicProjectionV1
  >;
  if (projection.projectionSchemaId
      !== DYNAMIC_MECHANICAL_SUPPORT_STRUCTURAL_HYDRAULIC_PROJECTION_V1_ID
      || projection.schemaVersion !== 1
      || projection.modelId !== MECHANICAL_SUPPORT_MODEL_V1_ID) {
    throw new Error("structural hydraulic projection identity mismatch");
  }
  plainRecord(projection.byDevice, "structural hydraulic projection.byDevice");
  assertExactKeys(
    projection.byDevice,
    ROTARY_SUPPORT_DEVICE_IDS_V1,
    "structural hydraulic projection.byDevice",
  );
  for (const deviceId of ROTARY_SUPPORT_DEVICE_IDS_V1) {
    validateDeviceStructuralHydraulics(
      projection.byDevice[deviceId],
      deviceId,
    );
  }
  // Only successful admission of an immutable plain-data graph is reusable.
  // A restored clone or any mutable descendant still crosses the full gate.
  if (validationStampIssuanceEligibleV1(value)) {
    VALIDATED_STRUCTURAL_HYDRAULIC_PROJECTIONS.add(value);
  }
}

function validateDeviceStructuralHydraulics(
  value: unknown,
  deviceId: RotarySupportDeviceIdV1,
): void {
  const label = `structural hydraulic projection.byDevice.${deviceId}`;
  plainRecord(value, label);
  assertExactKeys(value, [
    "deviceId",
    "inletNode",
    "outletNode",
    "curve",
    "drainage",
    "oxygenator",
    "returnPath",
    "inletSuction",
    "maximumForwardFlowLMin",
    "maximumReverseFlowLMin",
    "forwardFlowEvidenceDomain",
    "vaCannulation",
    "vvCannulation",
    "vvHemodynamicCoupling",
  ], label);
  const structural = value as Partial<
    DynamicMechanicalSupportDeviceStructuralHydraulicsV1
  >;
  if (structural.deviceId !== deviceId) {
    throw new Error(`${label}.deviceId mismatch`);
  }
  validateNode(structural.inletNode, `${label}.inletNode`);
  validateNode(structural.outletNode, `${label}.outletNode`);
  validateStructuralCurve(structural.curve, `${label}.curve`);
  validateStructuralSegment(structural.drainage, `${label}.drainage`);
  validateStructuralSegment(structural.oxygenator, `${label}.oxygenator`);
  validateStructuralSegment(structural.returnPath, `${label}.returnPath`);
  validateStructuralInletSuction(structural.inletSuction, `${label}.inletSuction`);
  if (structural.maximumForwardFlowLMin !== null) {
    nonnegative(
      structural.maximumForwardFlowLMin,
      `${label}.maximumForwardFlowLMin`,
    );
  }
  nonnegative(structural.maximumReverseFlowLMin, `${label}.maximumReverseFlowLMin`);
  validateStructuralForwardFlowEvidence(
    structural.forwardFlowEvidenceDomain,
    `${label}.forwardFlowEvidenceDomain`,
  );
  const expectedVa = deviceId === "VA_ECMO";
  if ((expectedVa && structural.vaCannulation !== "peripheral"
      && structural.vaCannulation !== "central")
    || (!expectedVa && structural.vaCannulation !== null)) {
    throw new Error(`${label}.vaCannulation mismatch`);
  }
  const expectedVv = deviceId === "VV_ECMO";
  if ((expectedVv && structural.vvCannulation !== "femoral-jugular"
      && structural.vvCannulation !== "dual-lumen")
    || (!expectedVv && structural.vvCannulation !== null)) {
    throw new Error(`${label}.vvCannulation mismatch`);
  }
  if ((expectedVv
      && structural.vvHemodynamicCoupling !== "well-mixed-venous"
      && structural.vvHemodynamicCoupling !== "bicaval-pressure-resolved")
    || (!expectedVv && structural.vvHemodynamicCoupling !== null)) {
    throw new Error(`${label}.vvHemodynamicCoupling mismatch`);
  }
}

function validateStructuralCurve(value: unknown, label: string): void {
  plainRecord(value, label);
  assertExactKeys(value, [
    "referenceSpeedRpm",
    "shutoffHeadMmHg",
    "linearLossMmHgSecPerMl",
    "linearLossSpeedExponent",
    "quadraticLossMmHgSec2PerMl2",
  ], label);
  const curve = value as Record<string, unknown>;
  positive(curve.referenceSpeedRpm, `${label}.referenceSpeedRpm`);
  nonnegative(curve.shutoffHeadMmHg, `${label}.shutoffHeadMmHg`);
  nonnegative(curve.linearLossMmHgSecPerMl, `${label}.linearLossMmHgSecPerMl`);
  if (curve.linearLossSpeedExponent !== 0
      && curve.linearLossSpeedExponent !== 1) {
    throw new Error(`${label}.linearLossSpeedExponent must be 0 or 1`);
  }
  nonnegative(
    curve.quadraticLossMmHgSec2PerMl2,
    `${label}.quadraticLossMmHgSec2PerMl2`,
  );
}

function validateStructuralSegment(value: unknown, label: string): void {
  plainRecord(value, label);
  assertExactKeys(value, [
    "linearResistanceMmHgSecPerMl",
    "quadraticResistanceMmHgSec2PerMl2",
  ], label);
  const segment = value as Record<string, unknown>;
  nonnegative(
    segment.linearResistanceMmHgSecPerMl,
    `${label}.linearResistanceMmHgSecPerMl`,
  );
  nonnegative(
    segment.quadraticResistanceMmHgSec2PerMl2,
    `${label}.quadraticResistanceMmHgSec2PerMl2`,
  );
}

function validateStructuralInletSuction(value: unknown, label: string): void {
  plainRecord(value, label);
  const suction = value as Record<string, unknown>;
  if (suction.kind === "none") {
    assertExactKeys(value, ["kind"], label);
    return;
  }
  if (suction.kind === "pressure-dependent-series-resistance") {
    assertExactKeys(value, [
      "kind",
      "thresholdPressureMmHg",
      "resistanceSlopeMmHgSecPerMlPerMmHg",
    ], label);
    finite(suction.thresholdPressureMmHg, `${label}.thresholdPressureMmHg`);
    positive(
      suction.resistanceSlopeMmHgSecPerMlPerMmHg,
      `${label}.resistanceSlopeMmHgSecPerMlPerMmHg`,
    );
    return;
  }
  if (suction.kind !== "legacy-smooth-availability") {
    throw new Error(`${label}.kind is unsupported`);
  }
  assertExactKeys(value, [
    "kind",
    "collapsePressureMmHg",
    "recoveredPressureMmHg",
    "minimumVolumeMl",
    "recoveredVolumeMl",
  ], label);
  const collapsePressure = finite(
    suction.collapsePressureMmHg,
    `${label}.collapsePressureMmHg`,
  );
  const recoveredPressure = finite(
    suction.recoveredPressureMmHg,
    `${label}.recoveredPressureMmHg`,
  );
  if (!(recoveredPressure > collapsePressure)) {
    throw new Error(`${label} pressure interval must be positive`);
  }
  if (suction.minimumVolumeMl === null
      && suction.recoveredVolumeMl === null) return;
  const minimumVolume = nonnegative(
    suction.minimumVolumeMl,
    `${label}.minimumVolumeMl`,
  );
  const recoveredVolume = nonnegative(
    suction.recoveredVolumeMl,
    `${label}.recoveredVolumeMl`,
  );
  if (!(recoveredVolume > minimumVolume)) {
    throw new Error(`${label} volume interval must be positive or null`);
  }
}

function validateStructuralForwardFlowEvidence(
  value: unknown,
  label: string,
): void {
  plainRecord(value, label);
  assertExactKeys(value, [
    "publishedExperimentalTraversalUpperLMin",
    "advertisedCapacityLMin",
  ], label);
  const domain = value as Record<string, unknown>;
  const publishedUpper = domain.publishedExperimentalTraversalUpperLMin;
  const advertised = domain.advertisedCapacityLMin;
  if (publishedUpper === null && advertised === null) return;
  if (publishedUpper === null || advertised === null) {
    throw new Error(`${label} limits must both be null or finite`);
  }
  const publishedUpperValue = positive(
    publishedUpper,
    `${label}.publishedExperimentalTraversalUpperLMin`,
  );
  const advertisedValue = positive(
    advertised,
    `${label}.advertisedCapacityLMin`,
  );
  if (advertisedValue < publishedUpperValue) {
    throw new Error(
      `${label} advertised capacity must cover published experimental traversal`,
    );
  }
}

function profilesExactlyEqual(
  left: DynamicMechanicalSupportInertanceProfileV1,
  right: DynamicMechanicalSupportInertanceProfileV1,
): boolean {
  if (left.profileSchemaId !== right.profileSchemaId
      || left.schemaVersion !== right.schemaVersion
      || left.unitSystemId !== right.unitSystemId
      || left.profileId !== right.profileId
      || left.profileBindingSha256 !== right.profileBindingSha256) return false;
  return ROTARY_SUPPORT_DEVICE_IDS_V1.every((deviceId) => {
    const leftBinding = left.deviceProfileBindingByDevice[deviceId];
    const rightBinding = right.deviceProfileBindingByDevice[deviceId];
    const leftInertance = left.inertanceByDevice[deviceId];
    const rightInertance = right.inertanceByDevice[deviceId];
    return leftBinding.bindingSchemaId === rightBinding.bindingSchemaId
      && leftBinding.schemaVersion === rightBinding.schemaVersion
      && leftBinding.deviceId === rightBinding.deviceId
      && leftBinding.circuitProfileId === rightBinding.circuitProfileId
      && leftBinding.circuitProfileBindingSha256
        === rightBinding.circuitProfileBindingSha256
      && leftInertance.unitSystemId === rightInertance.unitSystemId
      && leftInertance.pumpInternalMmHgSec2PerMl
        === rightInertance.pumpInternalMmHgSec2PerMl
      && leftInertance.drainageMmHgSec2PerMl
        === rightInertance.drainageMmHgSec2PerMl
      && leftInertance.oxygenatorMmHgSec2PerMl
        === rightInertance.oxygenatorMmHgSec2PerMl
      && leftInertance.returnPathMmHgSec2PerMl
        === rightInertance.returnPathMmHgSec2PerMl;
  });
}

function structuralProjectionMatchesConfig(
  projection: DynamicMechanicalSupportStructuralHydraulicProjectionV1,
  config: MechanicalSupportConfigV1,
): boolean {
  const configs = configuredPumpRecord(config);
  return projection.modelId === config.modelId
    && ROTARY_SUPPORT_DEVICE_IDS_V1.every((deviceId) =>
      deviceStructuralHydraulicsMatches(
        projection.byDevice[deviceId],
        copyDeviceStructuralHydraulics(deviceId, configs[deviceId], config),
      ));
}

function structuralProjectionsExactlyEqual(
  left: DynamicMechanicalSupportStructuralHydraulicProjectionV1,
  right: DynamicMechanicalSupportStructuralHydraulicProjectionV1,
): boolean {
  return left.projectionSchemaId === right.projectionSchemaId
    && left.schemaVersion === right.schemaVersion
    && left.modelId === right.modelId
    && ROTARY_SUPPORT_DEVICE_IDS_V1.every((deviceId) =>
      deviceStructuralHydraulicsMatches(
        left.byDevice[deviceId],
        right.byDevice[deviceId],
      ));
}

function deviceStructuralHydraulicsMatches(
  left: DynamicMechanicalSupportDeviceStructuralHydraulicsV1,
  right: DynamicMechanicalSupportDeviceStructuralHydraulicsV1,
): boolean {
  return left.deviceId === right.deviceId
    && left.inletNode === right.inletNode
    && left.outletNode === right.outletNode
    && left.curve.referenceSpeedRpm === right.curve.referenceSpeedRpm
    && left.curve.shutoffHeadMmHg === right.curve.shutoffHeadMmHg
    && left.curve.linearLossMmHgSecPerMl
      === right.curve.linearLossMmHgSecPerMl
    && left.curve.linearLossSpeedExponent
      === right.curve.linearLossSpeedExponent
    && left.curve.quadraticLossMmHgSec2PerMl2
      === right.curve.quadraticLossMmHgSec2PerMl2
    && segmentsExactlyEqual(left.drainage, right.drainage)
    && segmentsExactlyEqual(left.oxygenator, right.oxygenator)
    && segmentsExactlyEqual(left.returnPath, right.returnPath)
    && inletSuctionExactlyEqual(left.inletSuction, right.inletSuction)
    && left.maximumForwardFlowLMin === right.maximumForwardFlowLMin
    && left.maximumReverseFlowLMin === right.maximumReverseFlowLMin
    && left.forwardFlowEvidenceDomain.publishedExperimentalTraversalUpperLMin
      === right.forwardFlowEvidenceDomain
        .publishedExperimentalTraversalUpperLMin
    && left.forwardFlowEvidenceDomain.advertisedCapacityLMin
      === right.forwardFlowEvidenceDomain.advertisedCapacityLMin
    && left.vaCannulation === right.vaCannulation
    && left.vvCannulation === right.vvCannulation
    && left.vvHemodynamicCoupling === right.vvHemodynamicCoupling;
}

function segmentsExactlyEqual(
  left: RotaryPumpDeviceConfigV1["drainage"],
  right: RotaryPumpDeviceConfigV1["drainage"],
): boolean {
  return left.linearResistanceMmHgSecPerMl
      === right.linearResistanceMmHgSecPerMl
    && left.quadraticResistanceMmHgSec2PerMl2
      === right.quadraticResistanceMmHgSec2PerMl2;
}

function inletSuctionExactlyEqual(
  left: RotaryPumpDeviceConfigV1["inletSuction"],
  right: RotaryPumpDeviceConfigV1["inletSuction"],
): boolean {
  if (left.kind !== right.kind) return false;
  if (left.kind === "none" || right.kind === "none") return true;
  if (left.kind === "pressure-dependent-series-resistance"
      && right.kind === "pressure-dependent-series-resistance") {
    return left.thresholdPressureMmHg === right.thresholdPressureMmHg
      && left.resistanceSlopeMmHgSecPerMlPerMmHg
        === right.resistanceSlopeMmHgSecPerMlPerMmHg;
  }
  if (left.kind !== "legacy-smooth-availability"
      || right.kind !== "legacy-smooth-availability") return false;
  return left.collapsePressureMmHg === right.collapsePressureMmHg
    && left.recoveredPressureMmHg === right.recoveredPressureMmHg
    && left.minimumVolumeMl === right.minimumVolumeMl
    && left.recoveredVolumeMl === right.recoveredVolumeMl;
}

function validateNode(
  value: unknown,
  label: string,
): asserts value is MechanicalSupportNodeNameV1 {
  if (typeof value !== "string"
      || !MECHANICAL_SUPPORT_NODE_NAMES_V1.includes(
        value as MechanicalSupportNodeNameV1,
      )) throw new Error(`${label} is unsupported`);
}

function assertDeepFrozen(value: unknown, label: string): void {
  if (validationStampReuseEligibleV1() && isTransitivelyFrozenPlainDataV1(value)) return;
  const visited = new WeakSet<object>();
  const visit = (candidate: unknown, path: string): void => {
    if (candidate === null || typeof candidate !== "object") return;
    if (visited.has(candidate)) return;
    visited.add(candidate);
    if (!Object.isFrozen(candidate)) {
      throw new Error(`${path} must be deeply frozen`);
    }
    for (const key of Reflect.ownKeys(candidate)) {
      const descriptor = Object.getOwnPropertyDescriptor(candidate, key);
      if (descriptor === undefined || !("value" in descriptor)) {
        throw new Error(`${path} must contain only frozen data properties`);
      }
      visit(descriptor.value, `${path}.${String(key)}`);
    }
  };
  visit(value, label);
}

function hasDynamicMechanicalSupportValidationStampV1(
  state: object,
  profile: DynamicMechanicalSupportInertanceProfileV1,
  config: MechanicalSupportConfigV1,
): boolean {
  return VALIDATED_DYNAMIC_MECHANICAL_SUPPORT_STATE_BINDINGS.get(state)
    ?.some((stamp) => stamp.profile === profile && stamp.config === config)
    ?? false;
}

function stampValidatedDynamicMechanicalSupportAcceptedStateV1(
  state: DynamicMechanicalSupportAcceptedStateV1,
  profile: DynamicMechanicalSupportInertanceProfileV1,
  config: MechanicalSupportConfigV1,
): void {
  if (
    !LIVE_DYNAMIC_MECHANICAL_SUPPORT_STATES.has(state)
    || !validationStampIssuanceEligibleV1(state, profile, config)
  ) return;
  recordDynamicMechanicalSupportAcceptedStateStampV1(
    state,
    profile,
    config,
  );
}

/**
 * The live-state constructor owns and freezes every state descendant. The
 * profile/config context must still retain its generic immutable proof, but
 * the newly created state need not be recursively walked a second time.
 */
function stampConstructedDynamicMechanicalSupportAcceptedStateV1(
  state: DynamicMechanicalSupportAcceptedStateV1,
  profile: DynamicMechanicalSupportInertanceProfileV1,
  config: MechanicalSupportConfigV1,
): void {
  if (
    !LIVE_DYNAMIC_MECHANICAL_SUPPORT_STATES.has(state)
    || !validationStampIssuanceEligibleV1(profile, config)
  ) return;
  recordDynamicMechanicalSupportAcceptedStateStampV1(
    state,
    profile,
    config,
  );
}

function recordDynamicMechanicalSupportAcceptedStateStampV1(
  state: DynamicMechanicalSupportAcceptedStateV1,
  profile: DynamicMechanicalSupportInertanceProfileV1,
  config: MechanicalSupportConfigV1,
): void {
  const existing =
    VALIDATED_DYNAMIC_MECHANICAL_SUPPORT_STATE_BINDINGS.get(state) ?? [];
  if (existing.some((stamp) =>
    stamp.profile === profile && stamp.config === config)) return;
  VALIDATED_DYNAMIC_MECHANICAL_SUPPORT_STATE_BINDINGS.set(
    state,
    Object.freeze([...existing, Object.freeze({ profile, config })]),
  );
}

function addIncidenceDerivative(
  matrix: MutableNodeRecord<MutableNodeRecord<number>>,
  inletNode: MechanicalSupportNodeNameV1,
  outletNode: MechanicalSupportNodeNameV1,
  columnNode: MechanicalSupportNodeNameV1,
  derivative: number,
): void {
  matrix[inletNode][columnNode] -= derivative;
  matrix[outletNode][columnNode] += derivative;
}

function mutableNodeMatrix(): MutableNodeRecord<MutableNodeRecord<number>> {
  return mutableNodeRecord(() => mutableNodeRecord(() => 0));
}

function mutablePreviousFlowJacobian(): MutableNodeRecord<
  MutableDeviceRecord<number>
> {
  return mutableNodeRecord(() => mutableDeviceRecord(() => 0));
}

function freezeNodeMatrix(
  matrix: MutableNodeRecord<MutableNodeRecord<number>>,
): DynamicMechanicalSupportNodePressureJacobianV1 {
  return nodeRecord((row) => freezeNodeRecord(matrix[row]));
}

function freezePreviousFlowJacobian(
  matrix: MutableNodeRecord<MutableDeviceRecord<number>>,
): DynamicMechanicalSupportPreviousFlowJacobianV1 {
  return nodeRecord((row) => Object.freeze({ ...matrix[row] }));
}

function sumNodeRecord(record: NodeRecord<number>): number {
  return compensatedMechanicalSupportNodeSumV1(record);
}

function sumNodeColumn(
  matrix: DynamicMechanicalSupportNodePressureJacobianV1,
  column: MechanicalSupportNodeNameV1,
): number {
  return MECHANICAL_SUPPORT_NODE_NAMES_V1.reduce(
    (sum, row) => sum + matrix[row][column],
    0,
  );
}

function deviceRecord<T>(
  factory: (deviceId: RotarySupportDeviceIdV1) => T,
): DeviceRecord<T> {
  return Object.freeze({
    LVAD: factory("LVAD"),
    IMPELLA: factory("IMPELLA"),
    VA_ECMO: factory("VA_ECMO"),
    VV_ECMO: factory("VV_ECMO"),
  });
}

function mutableDeviceRecord<T>(
  factory: (deviceId: RotarySupportDeviceIdV1) => T,
): MutableDeviceRecord<T> {
  return {
    LVAD: factory("LVAD"),
    IMPELLA: factory("IMPELLA"),
    VA_ECMO: factory("VA_ECMO"),
    VV_ECMO: factory("VV_ECMO"),
  };
}

function nodeRecord<T>(
  factory: (node: MechanicalSupportNodeNameV1) => T,
): NodeRecord<T> {
  return Object.freeze({
    LV: factory("LV"),
    Ao: factory("Ao"),
    SA: factory("SA"),
    RA: factory("RA"),
    VC: factory("VC"),
  });
}

function mutableNodeRecord<T>(
  factory: (node: MechanicalSupportNodeNameV1) => T,
): MutableNodeRecord<T> {
  return {
    LV: factory("LV"),
    Ao: factory("Ao"),
    SA: factory("SA"),
    RA: factory("RA"),
    VC: factory("VC"),
  };
}

function freezeNodeRecord<T>(
  record: MutableNodeRecord<T>,
): NodeRecord<T> {
  return Object.freeze({ ...record });
}

function plainRecord(
  value: unknown,
  label: string,
): asserts value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new Error(`${label} must be a plain object`);
  }
}

function assertExactKeys(
  value: object,
  expected: readonly (string | number)[],
  label: string,
): void {
  const expectedStrings = expected.map(String).sort();
  const actual = Reflect.ownKeys(value);
  if (actual.some((key) => typeof key !== "string")) {
    throw new Error(`${label} contains a non-string key`);
  }
  const actualStrings = (actual as string[]).sort();
  if (actualStrings.length !== expectedStrings.length
      || actualStrings.some((key, index) => key !== expectedStrings[index])) {
    throw new Error(`${label} must have the exact expected key set`);
  }
}

function assertAllowedKeys(
  value: object,
  allowed: readonly (string | number)[],
  label: string,
): void {
  const allowedSet = new Set(allowed.map(String));
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== "string" || !allowedSet.has(key)) {
      throw new Error(`${label} contains unsupported key ${String(key)}`);
    }
  }
}

function nonempty(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} must be a nonempty string`);
  }
  return value;
}

function validateDeviceId(
  value: unknown,
  label: string,
): asserts value is RotarySupportDeviceIdV1 {
  if (!ROTARY_SUPPORT_DEVICE_IDS_V1.includes(
    value as RotarySupportDeviceIdV1,
  )) throw new Error(`${label} is unsupported`);
}

function sha256(value: unknown, label: string): string {
  if (typeof value !== "string" || !SHA256_HEX.test(value)) {
    throw new Error(`${label} must be a lowercase SHA-256 digest`);
  }
  return value;
}

function finite(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${label} must be finite`);
  }
  return value;
}

function positive(value: unknown, label: string): number {
  const number = finite(value, label);
  if (!(number > 0)) throw new Error(`${label} must be positive`);
  return number;
}

function nonnegative(value: unknown, label: string): number {
  const number = finite(value, label);
  if (number < 0) throw new Error(`${label} must be nonnegative`);
  return number;
}

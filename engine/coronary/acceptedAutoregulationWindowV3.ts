import {
  NORMAL_ADULT_CORONARY_AUTOREGULATION_PRIOR_V2,
  stepCoronaryAutoregulationByTerritoryLayerV2,
  unitCoronaryDemandScaleV2,
  zeroCoronaryHyperemiaDriveV2,
  type CoronaryAutoregulationAcceptedAggregateV2,
  type CoronaryAutoregulationAcceptedStepV2,
} from "@/engine/coronary/autoregulationV2";
import {
  coronaryConfigurationFingerprintV2,
  type CoronaryTopologyPriorV2,
} from "@/engine/coronary/topologyPriorV2";
import {
  CORONARY_LAYER_IDS_V2,
  CORONARY_TERRITORY_IDS_V2,
  type CoronaryTerritoryLayerRecordV2,
  type CoronaryTerritoryRecordV2,
  type CoronaryToneStateV2,
} from "@/engine/coronary/typesV2";
import {
  fullHotPathInvariantsEnabledV1,
} from "@/engine/hotPathIntegrityTierV1";
import {
  validationStampIssuanceEligibleV1,
  validationStampReuseEligibleV1,
} from "@/engine/validationStampModeV1";

export const CORONARY_ACCEPTED_AUTOREGULATION_BINDING_V3_ID =
  "accepted-physical-time-coronary-autoregulation-v1" as const;

export const CORONARY_ACCEPTED_AUTOREGULATION_STATE_V3_ID =
  "circleheart.coronary-accepted-autoregulation-state.v3" as const;

export const DEFAULT_CORONARY_AUTOREGULATION_CONTROL_V3_ID =
  "circleheart.coronary-autoregulation-control.rest.v1" as const;

export type CoronaryAutoregulationWindowBindingV3 = Readonly<{
  bindingId: typeof CORONARY_ACCEPTED_AUTOREGULATION_BINDING_V3_ID;
  law: "integral-flow-homeostasis-v2";
  priorFingerprint: string;
  windowPolicy: Readonly<{
    kind: "fixed-physical-duration";
    interpretation:
      | "periodic-sinus-cycle-aligned"
      | "irregular-rhythm-stationary";
    originAcceptedTimeSec: number;
    durationSec: number;
    quadrature: "backward-euler-right-endpoint";
  }>;
  flowObservable:
    "final-candidate-layer-qm-internal-flow-ml-per-sec";
  perfusionPressureObservable:
    "final-candidate-post-focal-lesion-pressure-minus-common-cv-pressure";
}>;

export type CoronaryAutoregulationWindowControlV3 = Readonly<{
  controlId: string;
  demandScaleByTerritoryLayer: CoronaryTerritoryLayerRecordV2<number>;
  hyperemia01ByTerritoryLayer: CoronaryTerritoryLayerRecordV2<number>;
  effectiveMinimumToneScaleByTerritoryLayer:
    CoronaryTerritoryLayerRecordV2<number>;
}>;

export type CoronaryAcceptedAutoregulationStateV3 = Readonly<{
  stateId: typeof CORONARY_ACCEPTED_AUTOREGULATION_STATE_V3_ID;
  windowIndex: number;
  windowOriginAcceptedTimeSec: number;
  windowStartAcceptedTimeSec: number;
  windowStartRevision: number;
  acceptedDurationSec: number;
  acceptedStepCount: number;
  qmTimeIntegralMlByTerritoryLayer:
    CoronaryTerritoryLayerRecordV2<number>;
  perfusionPressureTimeIntegralMmHgSecByTerritory:
    CoronaryTerritoryRecordV2<number>;
  /** Control physically applied throughout the current accepted window. */
  windowControl: CoronaryAutoregulationWindowControlV3 | null;
  /**
   * Latest desired control. A mid-window change is retained here and becomes
   * the next window's applied control at its accepted boundary.
   */
  desiredControl: CoronaryAutoregulationWindowControlV3 | null;
}>;

export type CoronaryAcceptedAutoregulationCompletionV3 = Readonly<{
  windowIndex: number;
  windowStartAcceptedTimeSec: number;
  windowEndAcceptedTimeSec: number;
  windowStartRevision: number;
  windowEndRevision: number;
  acceptedStepCount: number;
  control: CoronaryAutoregulationWindowControlV3;
  aggregate: CoronaryAutoregulationAcceptedAggregateV2;
  toneStep: CoronaryAutoregulationAcceptedStepV2;
}>;

export type CoronaryAcceptedAutoregulationAdvanceV3 = Readonly<{
  nextState: CoronaryAcceptedAutoregulationStateV3;
  hydraulicToneUsed: CoronaryToneStateV2;
  nextToneResistanceScaleByTerritoryLayer: CoronaryToneStateV2;
  completedWindow: CoronaryAcceptedAutoregulationCompletionV3 | null;
}>;

const VALIDATED_AUTOREGULATION_BINDINGS_V3 = new WeakSet<object>();
const FROZEN_AUTOREGULATION_CONTROLS_V3 = new WeakMap<
  object,
  CoronaryAutoregulationWindowControlV3
>();
let defaultAutoregulationControlV3: CoronaryAutoregulationWindowControlV3 | undefined;
const VALIDATED_BINDINGS_BY_AUTOREGULATION_STATE_V3 = new WeakMap<
  object,
  WeakSet<object>
>();

export function createCoronaryAutoregulationWindowBindingV3(
  input: Readonly<{
    originAcceptedTimeSec: number;
    durationSec: number;
    interpretation:
      | "periodic-sinus-cycle-aligned"
      | "irregular-rhythm-stationary";
  }>,
): CoronaryAutoregulationWindowBindingV3 {
  requireNonnegativeFinite(
    input.originAcceptedTimeSec,
    "originAcceptedTimeSec",
  );
  requirePositiveFinite(input.durationSec, "durationSec");
  if (input.interpretation !== "periodic-sinus-cycle-aligned"
    && input.interpretation !== "irregular-rhythm-stationary") {
    throw new RangeError("unsupported autoregulation window interpretation");
  }
  const binding = Object.freeze({
    bindingId: CORONARY_ACCEPTED_AUTOREGULATION_BINDING_V3_ID,
    law: "integral-flow-homeostasis-v2" as const,
    priorFingerprint: coronaryConfigurationFingerprintV2(
      NORMAL_ADULT_CORONARY_AUTOREGULATION_PRIOR_V2,
    ),
    windowPolicy: Object.freeze({
      kind: "fixed-physical-duration" as const,
      interpretation: input.interpretation,
      originAcceptedTimeSec: input.originAcceptedTimeSec,
      durationSec: input.durationSec,
      quadrature: "backward-euler-right-endpoint" as const,
    }),
    flowObservable:
      "final-candidate-layer-qm-internal-flow-ml-per-sec" as const,
    perfusionPressureObservable:
      "final-candidate-post-focal-lesion-pressure-minus-common-cv-pressure" as const,
  });
  if (validationStampIssuanceEligibleV1(binding)) {
    VALIDATED_AUTOREGULATION_BINDINGS_V3.add(binding);
  }
  return binding;
}

export function createDefaultCoronaryAutoregulationWindowControlV3():
CoronaryAutoregulationWindowControlV3 {
  if (validationStampReuseEligibleV1() && defaultAutoregulationControlV3 !== undefined) {
    return defaultAutoregulationControlV3;
  }
  const control = freezeControl(Object.freeze({
    controlId: DEFAULT_CORONARY_AUTOREGULATION_CONTROL_V3_ID,
    demandScaleByTerritoryLayer: unitCoronaryDemandScaleV2(),
    hyperemia01ByTerritoryLayer: zeroCoronaryHyperemiaDriveV2(),
    effectiveMinimumToneScaleByTerritoryLayer: constantLayerRecord(
      NORMAL_ADULT_CORONARY_AUTOREGULATION_PRIOR_V2.minimumResistanceScale,
    ),
  }));
  if (validationStampReuseEligibleV1()) defaultAutoregulationControlV3 = control;
  return control;
}

export function createCoronaryAcceptedAutoregulationStateV3(
  binding: CoronaryAutoregulationWindowBindingV3,
  input: Readonly<{
    acceptedTimeSec: number;
    revision: number;
    desiredControl?: CoronaryAutoregulationWindowControlV3;
  }>,
): CoronaryAcceptedAutoregulationStateV3 {
  validateCoronaryAutoregulationWindowBindingV3(binding);
  requireNonnegativeFinite(input.acceptedTimeSec, "acceptedTimeSec");
  requireNonnegativeInteger(input.revision, "revision");
  if (!nearlyEqual(
    input.acceptedTimeSec,
    binding.windowPolicy.originAcceptedTimeSec,
  )) {
    throw new RangeError(
      "initial autoregulation clock must equal the window origin",
    );
  }
  return freezeState({
    stateId: CORONARY_ACCEPTED_AUTOREGULATION_STATE_V3_ID,
    windowIndex: 0,
    windowOriginAcceptedTimeSec:
      binding.windowPolicy.originAcceptedTimeSec,
    windowStartAcceptedTimeSec:
      binding.windowPolicy.originAcceptedTimeSec,
    windowStartRevision: input.revision,
    acceptedDurationSec: 0,
    acceptedStepCount: 0,
    qmTimeIntegralMlByTerritoryLayer: zeroLayerRecord(),
    perfusionPressureTimeIntegralMmHgSecByTerritory: zeroTerritoryRecord(),
    windowControl: null,
    desiredControl: input.desiredControl === undefined
      ? null
      : freezeControl(input.desiredControl),
  });
}

export function maximumCoronaryAutoregulationStepDurationV3(
  binding: CoronaryAutoregulationWindowBindingV3,
  state: CoronaryAcceptedAutoregulationStateV3,
  previousAcceptedTimeSec: number,
): number {
  validateCoronaryAcceptedAutoregulationStateV3(
    binding,
    state,
    { acceptedTimeSec: previousAcceptedTimeSec },
  );
  const windowEnd = canonicalWindowEnd(binding, state.windowIndex);
  const remaining = windowEnd - previousAcceptedTimeSec;
  const tolerance = timeTolerance(windowEnd, previousAcceptedTimeSec);
  if (remaining < -tolerance) {
    throw new Error("autoregulation accepted clock passed its window end");
  }
  return remaining <= tolerance ? 0 : remaining;
}

/**
 * Pure accepted-boundary operator. Candidate probes and rejected steps never
 * call this function. The final converged BE right-endpoint readback is the
 * only value integrated, and tone changes only after a complete time window.
 */
export function advanceCoronaryAcceptedAutoregulationV3(
  binding: CoronaryAutoregulationWindowBindingV3,
  previous: CoronaryAcceptedAutoregulationStateV3,
  previousTone: CoronaryToneStateV2,
  input: Readonly<{
    previousAcceptedTimeSec: number;
    candidateAcceptedTimeSec: number;
    candidateRevision: number;
    finalQmInternalFlowMlPerSecByTerritoryLayer:
      CoronaryTerritoryLayerRecordV2<number>;
    finalPostFocalLesionPressureMmHgByTerritory:
      CoronaryTerritoryRecordV2<number>;
    finalCommonCoronaryVenousPressureMmHg: number;
    control?: CoronaryAutoregulationWindowControlV3;
    topologyPrior?: CoronaryTopologyPriorV2;
  }>,
): CoronaryAcceptedAutoregulationAdvanceV3 {
  validateCoronaryAcceptedAutoregulationStateV3(
    binding,
    previous,
    {
      acceptedTimeSec: input.previousAcceptedTimeSec,
      maximumRevision: previous.windowStartRevision
        + previous.acceptedStepCount,
    },
  );
  validateTone(previousTone);
  requireNonnegativeFinite(
    input.candidateAcceptedTimeSec,
    "candidateAcceptedTimeSec",
  );
  requireNonnegativeInteger(input.candidateRevision, "candidateRevision");
  const expectedCandidateRevision = previous.windowStartRevision
    + previous.acceptedStepCount + 1;
  if (input.candidateRevision !== expectedCandidateRevision) {
    throw new RangeError(
      "candidate revision must advance the accepted window by exactly one step",
    );
  }
  if (input.candidateAcceptedTimeSec <= input.previousAcceptedTimeSec) {
    throw new RangeError("accepted autoregulation interval must be positive");
  }
  const dtSec = input.candidateAcceptedTimeSec
    - input.previousAcceptedTimeSec;
  const maximumDtSec = maximumCoronaryAutoregulationStepDurationV3(
    binding,
    previous,
    input.previousAcceptedTimeSec,
  );
  const windowEnd = canonicalWindowEnd(binding, previous.windowIndex);
  const tolerance = timeTolerance(
    windowEnd,
    input.candidateAcceptedTimeSec,
  );
  if (dtSec > maximumDtSec + tolerance) {
    throw new RangeError(
      "accepted step crosses a coronary autoregulation window boundary",
    );
  }
  validateLayerRecord(
    input.finalQmInternalFlowMlPerSecByTerritoryLayer,
    "final Qm",
  );
  validateTerritoryRecord(
    input.finalPostFocalLesionPressureMmHgByTerritory,
    "post-focal-lesion pressure",
  );
  requireFinite(
    input.finalCommonCoronaryVenousPressureMmHg,
    "common coronary venous pressure",
  );
  const suppliedControl = freezeControl(
    input.control ?? createDefaultCoronaryAutoregulationWindowControlV3(),
  );
  const desiredControl = previous.desiredControl !== null
      && controlsExactlyEqual(previous.desiredControl, suppliedControl)
    ? previous.desiredControl
    : suppliedControl;
  const control = previous.windowControl
    ?? previous.desiredControl
    ?? desiredControl;

  const duration = previous.acceptedDurationSec + dtSec;
  const stepCount = previous.acceptedStepCount + 1;
  const qmIntegral = mapLayerRecord((territoryId, layerId) =>
    previous.qmTimeIntegralMlByTerritoryLayer[territoryId][layerId]
    + dtSec
      * input.finalQmInternalFlowMlPerSecByTerritoryLayer[territoryId][layerId]);
  const perfusionPressure = mapTerritoryRecord((territoryId) =>
    input.finalPostFocalLesionPressureMmHgByTerritory[territoryId]
      - input.finalCommonCoronaryVenousPressureMmHg);
  const pressureIntegral = mapTerritoryRecord((territoryId) =>
    previous.perfusionPressureTimeIntegralMmHgSecByTerritory[territoryId]
    + dtSec * perfusionPressure[territoryId]);
  const closesWindow = Math.abs(
    input.candidateAcceptedTimeSec - windowEnd,
  ) <= tolerance;

  if (!closesWindow) {
    const nextState = freezeState({
      ...previous,
      acceptedDurationSec: duration,
      acceptedStepCount: stepCount,
      qmTimeIntegralMlByTerritoryLayer: qmIntegral,
      perfusionPressureTimeIntegralMmHgSecByTerritory: pressureIntegral,
      windowControl: control,
      desiredControl,
    });
    validateOrStampConstructedAutoregulationStateV3(
      binding,
      nextState,
      input.candidateAcceptedTimeSec,
      input.candidateRevision,
    );
    return Object.freeze({
      nextState,
      hydraulicToneUsed: previousTone,
      nextToneResistanceScaleByTerritoryLayer: previousTone,
      completedWindow: null,
    });
  }

  // The window policy owns the completed interval. Summing hundreds of
  // accepted substeps is suitable for quadrature but can differ by a few ulps
  // from a non-binary sinus period (for example 60/65 s). Do not propagate
  // that accumulation error into the completed clock identity or its means.
  const completedDurationSec = binding.windowPolicy.durationSec;
  const aggregate = Object.freeze({
    meanTissueFlowMlPerSecByTerritoryLayer: mapLayerRecord(
      (territoryId, layerId) =>
        qmIntegral[territoryId][layerId] / completedDurationSec,
    ),
    meanPerfusionPressureMmHgByTerritory: mapTerritoryRecord(
      (territoryId) =>
        pressureIntegral[territoryId] / completedDurationSec,
    ),
    demandScaleByTerritoryLayer: control.demandScaleByTerritoryLayer,
    hyperemia01ByTerritoryLayer: control.hyperemia01ByTerritoryLayer,
    acceptedWindowDurationSec: completedDurationSec,
  }) satisfies CoronaryAutoregulationAcceptedAggregateV2;
  const toneStep = stepCoronaryAutoregulationByTerritoryLayerV2(
    previousTone,
    aggregate,
    {
      topologyPrior: input.topologyPrior,
      law: binding.law,
      effectiveMinimumResistanceScaleByTerritoryLayer:
        control.effectiveMinimumToneScaleByTerritoryLayer,
    },
  );
  const completion = Object.freeze({
    windowIndex: previous.windowIndex,
    windowStartAcceptedTimeSec: previous.windowStartAcceptedTimeSec,
    windowEndAcceptedTimeSec: windowEnd,
    windowStartRevision: previous.windowStartRevision,
    windowEndRevision: input.candidateRevision,
    acceptedStepCount: stepCount,
    control,
    aggregate,
    toneStep,
  }) satisfies CoronaryAcceptedAutoregulationCompletionV3;
  const nextState = freezeState({
    stateId: CORONARY_ACCEPTED_AUTOREGULATION_STATE_V3_ID,
    windowIndex: previous.windowIndex + 1,
    windowOriginAcceptedTimeSec: previous.windowOriginAcceptedTimeSec,
    windowStartAcceptedTimeSec: windowEnd,
    windowStartRevision: input.candidateRevision,
    acceptedDurationSec: 0,
    acceptedStepCount: 0,
    qmTimeIntegralMlByTerritoryLayer: zeroLayerRecord(),
    perfusionPressureTimeIntegralMmHgSecByTerritory: zeroTerritoryRecord(),
    windowControl: null,
    desiredControl,
  });
  validateOrStampConstructedAutoregulationStateV3(
    binding,
    nextState,
    input.candidateAcceptedTimeSec,
    input.candidateRevision,
  );
  return Object.freeze({
    nextState,
    hydraulicToneUsed: previousTone,
    nextToneResistanceScaleByTerritoryLayer:
      toneStep.nextToneResistanceScaleByTerritoryLayer,
    completedWindow: completion,
  });
}

export function validateCoronaryAutoregulationWindowBindingV3(
  binding: CoronaryAutoregulationWindowBindingV3,
): void {
  if (
    validationStampReuseEligibleV1()
    && VALIDATED_AUTOREGULATION_BINDINGS_V3.has(binding)
  ) {
    // This persistent proof is sound because only transitively frozen plain
    // data enters the set. A copied, caller-built, or mutable binding misses
    // this identity stamp and retains the complete exported validation.
    return;
  }
  assertPlainObject(binding, "coronary autoregulation V3 binding");
  assertExactKeys(binding, [
    "bindingId",
    "law",
    "priorFingerprint",
    "windowPolicy",
    "flowObservable",
    "perfusionPressureObservable",
  ], "coronary autoregulation V3 binding");
  assertPlainObject(binding.windowPolicy, "autoregulation window policy");
  assertExactKeys(binding.windowPolicy, [
    "kind",
    "interpretation",
    "originAcceptedTimeSec",
    "durationSec",
    "quadrature",
  ], "autoregulation window policy");
  if (
    binding.bindingId !== CORONARY_ACCEPTED_AUTOREGULATION_BINDING_V3_ID
    || binding.law !== "integral-flow-homeostasis-v2"
    || binding.priorFingerprint !== coronaryConfigurationFingerprintV2(
      NORMAL_ADULT_CORONARY_AUTOREGULATION_PRIOR_V2,
    )
    || binding.windowPolicy.kind !== "fixed-physical-duration"
    || binding.windowPolicy.quadrature !== "backward-euler-right-endpoint"
    || binding.flowObservable
      !== "final-candidate-layer-qm-internal-flow-ml-per-sec"
    || binding.perfusionPressureObservable
      !== "final-candidate-post-focal-lesion-pressure-minus-common-cv-pressure"
  ) throw new Error("unsupported coronary autoregulation V3 binding");
  requireNonnegativeFinite(
    binding.windowPolicy.originAcceptedTimeSec,
    "window origin",
  );
  requirePositiveFinite(binding.windowPolicy.durationSec, "window duration");
  if (binding.windowPolicy.interpretation
      !== "periodic-sinus-cycle-aligned"
    && binding.windowPolicy.interpretation
      !== "irregular-rhythm-stationary") {
    throw new Error("unsupported autoregulation window interpretation");
  }
  if (validationStampIssuanceEligibleV1(binding)) {
    VALIDATED_AUTOREGULATION_BINDINGS_V3.add(binding);
  }
}

export function validateCoronaryAcceptedAutoregulationStateV3(
  binding: CoronaryAutoregulationWindowBindingV3,
  state: CoronaryAcceptedAutoregulationStateV3,
  clock?: Readonly<{
    acceptedTimeSec: number;
    maximumRevision?: number;
  }>,
): void {
  if (
    validationStampReuseEligibleV1()
    && hasAutoregulationStateBindingStampV3(state, binding)
  ) {
    // This persistent proof is sound because both identities are transitively
    // frozen plain data. The supplied outer clock is still checked on every
    // call; any mutable, copied, or differently bound state takes the full path.
    validateAutoregulationClockV3(state, clock);
    return;
  }
  validateCoronaryAutoregulationWindowBindingV3(binding);
  assertPlainObject(state, "coronary accepted autoregulation state");
  assertExactKeys(state, [
    "stateId",
    "windowIndex",
    "windowOriginAcceptedTimeSec",
    "windowStartAcceptedTimeSec",
    "windowStartRevision",
    "acceptedDurationSec",
    "acceptedStepCount",
    "qmTimeIntegralMlByTerritoryLayer",
    "perfusionPressureTimeIntegralMmHgSecByTerritory",
    "windowControl",
    "desiredControl",
  ], "coronary accepted autoregulation state");
  if (state.stateId !== CORONARY_ACCEPTED_AUTOREGULATION_STATE_V3_ID) {
    throw new Error("unsupported coronary accepted autoregulation state");
  }
  requireNonnegativeInteger(state.windowIndex, "windowIndex");
  requireNonnegativeFinite(
    state.windowOriginAcceptedTimeSec,
    "windowOriginAcceptedTimeSec",
  );
  requireNonnegativeFinite(
    state.windowStartAcceptedTimeSec,
    "windowStartAcceptedTimeSec",
  );
  requireNonnegativeInteger(state.windowStartRevision, "windowStartRevision");
  requireNonnegativeFinite(state.acceptedDurationSec, "acceptedDurationSec");
  requireNonnegativeInteger(state.acceptedStepCount, "acceptedStepCount");
  if (!nearlyEqual(
    state.windowOriginAcceptedTimeSec,
    binding.windowPolicy.originAcceptedTimeSec,
  ) || !nearlyEqual(
    state.windowStartAcceptedTimeSec,
    canonicalWindowStart(binding, state.windowIndex),
  )) throw new Error("autoregulation state window identity mismatch");
  const durationTolerance = timeTolerance(
    state.acceptedDurationSec,
    binding.windowPolicy.durationSec,
  );
  if (state.acceptedDurationSec
      >= binding.windowPolicy.durationSec - durationTolerance
    && state.acceptedDurationSec !== 0) {
    throw new Error("completed autoregulation window was not reset");
  }
  validateLayerRecord(
    state.qmTimeIntegralMlByTerritoryLayer,
    "Qm time integral",
  );
  validateTerritoryRecord(
    state.perfusionPressureTimeIntegralMmHgSecByTerritory,
    "perfusion-pressure time integral",
  );
  const empty = state.acceptedStepCount === 0;
  if (empty !== (state.acceptedDurationSec === 0)
    || (empty && state.windowControl !== null)
    || (!empty && state.windowControl === null)) {
    throw new Error("autoregulation empty-window invariants differ");
  }
  if (empty && (!layerRecordIsZero(state.qmTimeIntegralMlByTerritoryLayer)
    || !territoryRecordIsZero(
      state.perfusionPressureTimeIntegralMmHgSecByTerritory,
    ))) throw new Error("empty autoregulation window contains integrals");
  if (state.windowControl !== null) freezeControl(state.windowControl);
  if (state.desiredControl !== null) freezeControl(state.desiredControl);
  if (!empty && state.desiredControl === null) {
    throw new Error("active autoregulation window has no desired control");
  }
  validateAutoregulationClockV3(state, clock);
  stampAutoregulationStateBindingV3(state, binding);
}

function freezeState(
  state: CoronaryAcceptedAutoregulationStateV3,
): CoronaryAcceptedAutoregulationStateV3 {
  return Object.freeze({
    ...state,
    // Every caller is private and supplies freshly constructed frozen numerical
    // records. Reusing those records retains detachment from all public inputs.
    qmTimeIntegralMlByTerritoryLayer: validationStampReuseEligibleV1()
      ? state.qmTimeIntegralMlByTerritoryLayer : mapLayerRecord(
      (territoryId, layerId) =>
        state.qmTimeIntegralMlByTerritoryLayer[territoryId][layerId],
    ),
    perfusionPressureTimeIntegralMmHgSecByTerritory: validationStampReuseEligibleV1()
      ? state.perfusionPressureTimeIntegralMmHgSecByTerritory : mapTerritoryRecord(
      (territoryId) =>
        state.perfusionPressureTimeIntegralMmHgSecByTerritory[territoryId],
    ),
    windowControl: state.windowControl === null
      ? null
      : freezeControl(state.windowControl),
    desiredControl: state.desiredControl === null
      ? null
      : freezeControl(state.desiredControl),
  });
}

function validateOrStampConstructedAutoregulationStateV3(
  binding: CoronaryAutoregulationWindowBindingV3,
  state: CoronaryAcceptedAutoregulationStateV3,
  acceptedTimeSec: number,
  maximumRevision: number,
): void {
  if (fullHotPathInvariantsEnabledV1()) {
    validateCoronaryAcceptedAutoregulationStateV3(binding, state, {
      acceptedTimeSec,
      maximumRevision,
    });
    return;
  }
  // Lean narrows the post-construction guarantee here: it does not immediately
  // re-walk this module's own freshly frozen state. The constructor above
  // derives its clock/revision and copies every record from already validated
  // inputs; only that exact output/binding identity receives the stamp.
  stampPrivatelyConstructedAutoregulationStateBindingV3(state, binding);
}

function validateAutoregulationClockV3(
  state: CoronaryAcceptedAutoregulationStateV3,
  clock: Readonly<{
    acceptedTimeSec: number;
    maximumRevision?: number;
  }> | undefined,
): void {
  if (clock === undefined) return;
  requireNonnegativeFinite(clock.acceptedTimeSec, "acceptedTimeSec");
  const expectedTime = state.windowStartAcceptedTimeSec
    + state.acceptedDurationSec;
  if (!nearlyEqual(clock.acceptedTimeSec, expectedTime)) {
    throw new Error("autoregulation window clock differs from accepted tuple");
  }
  if (clock.maximumRevision !== undefined) {
    requireNonnegativeInteger(clock.maximumRevision, "maximumRevision");
    const expectedRevision = state.windowStartRevision
      + state.acceptedStepCount;
    if (expectedRevision !== clock.maximumRevision) {
      throw new Error(
        "autoregulation window step count differs from accepted revision",
      );
    }
  }
}

function hasAutoregulationStateBindingStampV3(
  state: CoronaryAcceptedAutoregulationStateV3,
  binding: CoronaryAutoregulationWindowBindingV3,
): boolean {
  return VALIDATED_BINDINGS_BY_AUTOREGULATION_STATE_V3.get(state)
    ?.has(binding) ?? false;
}

function stampAutoregulationStateBindingV3(
  state: CoronaryAcceptedAutoregulationStateV3,
  binding: CoronaryAutoregulationWindowBindingV3,
): void {
  // A successful semantic validation is not itself an immutability proof:
  // public callers can supply an outer-frozen state with mutable descendants.
  // Prove the complete state/binding graph before retaining identity reuse.
  if (!validationStampIssuanceEligibleV1(state, binding)) return;
  recordAutoregulationStateBindingStampV3(state, binding);
}

/**
 * Records only the exact state created by freezeState after its input binding
 * has already earned a complete immutable binding proof. This private path
 * avoids re-walking the freshly copied state graph in the lean tier; exported
 * validator issuance still proves the complete graph independently.
 */
function stampPrivatelyConstructedAutoregulationStateBindingV3(
  state: CoronaryAcceptedAutoregulationStateV3,
  binding: CoronaryAutoregulationWindowBindingV3,
): void {
  if (
    !validationStampReuseEligibleV1()
    || !Object.isFrozen(state)
    || !VALIDATED_AUTOREGULATION_BINDINGS_V3.has(binding)
  ) return;
  recordAutoregulationStateBindingStampV3(state, binding);
}

function recordAutoregulationStateBindingStampV3(
  state: CoronaryAcceptedAutoregulationStateV3,
  binding: CoronaryAutoregulationWindowBindingV3,
): void {
  const bindings = VALIDATED_BINDINGS_BY_AUTOREGULATION_STATE_V3.get(state)
    ?? new WeakSet<object>();
  bindings.add(binding);
  VALIDATED_BINDINGS_BY_AUTOREGULATION_STATE_V3.set(state, bindings);
}

function freezeControl(
  control: CoronaryAutoregulationWindowControlV3,
): CoronaryAutoregulationWindowControlV3 {
  const reuse = validationStampReuseEligibleV1();
  const cached = reuse ? FROZEN_AUTOREGULATION_CONTROLS_V3.get(control) : undefined;
  if (cached !== undefined) return cached;
  assertPlainObject(control, "autoregulation control");
  assertExactKeys(control, [
    "controlId",
    "demandScaleByTerritoryLayer",
    "hyperemia01ByTerritoryLayer",
    "effectiveMinimumToneScaleByTerritoryLayer",
  ], "autoregulation control");
  if (typeof control.controlId !== "string" || control.controlId.length === 0) {
    throw new RangeError("autoregulation controlId must be non-empty");
  }
  validateLayerRecord(control.demandScaleByTerritoryLayer, "demand scale");
  validateLayerRecord(control.hyperemia01ByTerritoryLayer, "hyperemia");
  validateLayerRecord(
    control.effectiveMinimumToneScaleByTerritoryLayer,
    "effective minimum tone",
  );
  for (const territoryId of CORONARY_TERRITORY_IDS_V2) {
    for (const layerId of CORONARY_LAYER_IDS_V2) {
      if (control.demandScaleByTerritoryLayer[territoryId][layerId] <= 0) {
        throw new RangeError("autoregulation demand scale must be positive");
      }
      const hyperemia = control.hyperemia01ByTerritoryLayer[territoryId][layerId];
      if (hyperemia < 0 || hyperemia > 1) {
        throw new RangeError("autoregulation hyperemia must lie in [0,1]");
      }
      const minimum = control
        .effectiveMinimumToneScaleByTerritoryLayer[territoryId][layerId];
      if (minimum <= 0
        || minimum >= NORMAL_ADULT_CORONARY_AUTOREGULATION_PRIOR_V2
          .maximumResistanceScale) {
        throw new RangeError("effective minimum tone is outside its bounds");
      }
    }
  }
  const frozen = Object.freeze({
    controlId: control.controlId,
    demandScaleByTerritoryLayer: mapLayerRecord((territoryId, layerId) =>
      control.demandScaleByTerritoryLayer[territoryId][layerId]),
    hyperemia01ByTerritoryLayer: mapLayerRecord((territoryId, layerId) =>
      control.hyperemia01ByTerritoryLayer[territoryId][layerId]),
    effectiveMinimumToneScaleByTerritoryLayer: mapLayerRecord(
      (territoryId, layerId) =>
        control.effectiveMinimumToneScaleByTerritoryLayer[territoryId][layerId],
    ),
  });
  if (reuse && validationStampIssuanceEligibleV1(control)) {
    // Both the validated reads and copied values come from immutable plain data.
    // Getter-backed inputs can change between validation and copying, so even
    // their new frozen snapshot must pass a fresh validator before earning reuse.
    FROZEN_AUTOREGULATION_CONTROLS_V3.set(frozen, frozen);
    FROZEN_AUTOREGULATION_CONTROLS_V3.set(control, frozen);
  }
  return frozen;
}

function controlsExactlyEqual(
  left: CoronaryAutoregulationWindowControlV3,
  right: CoronaryAutoregulationWindowControlV3,
): boolean {
  if (left.controlId !== right.controlId) return false;
  for (const territoryId of CORONARY_TERRITORY_IDS_V2) {
    for (const layerId of CORONARY_LAYER_IDS_V2) {
      if (left.demandScaleByTerritoryLayer[territoryId][layerId]
          !== right.demandScaleByTerritoryLayer[territoryId][layerId]
        || left.hyperemia01ByTerritoryLayer[territoryId][layerId]
          !== right.hyperemia01ByTerritoryLayer[territoryId][layerId]
        || left.effectiveMinimumToneScaleByTerritoryLayer[territoryId][layerId]
          !== right.effectiveMinimumToneScaleByTerritoryLayer[territoryId][layerId]
      ) return false;
    }
  }
  return true;
}

function canonicalWindowStart(
  binding: CoronaryAutoregulationWindowBindingV3,
  windowIndex: number,
): number {
  return binding.windowPolicy.originAcceptedTimeSec
    + windowIndex * binding.windowPolicy.durationSec;
}

function canonicalWindowEnd(
  binding: CoronaryAutoregulationWindowBindingV3,
  windowIndex: number,
): number {
  return binding.windowPolicy.originAcceptedTimeSec
    + (windowIndex + 1) * binding.windowPolicy.durationSec;
}

function validateTone(tone: CoronaryToneStateV2): void {
  validateLayerRecord(tone, "tone");
  for (const territoryId of CORONARY_TERRITORY_IDS_V2) {
    for (const layerId of CORONARY_LAYER_IDS_V2) {
      if (tone[territoryId][layerId] <= 0) {
        throw new RangeError("accepted coronary tone must be positive");
      }
    }
  }
}

function validateLayerRecord(
  record: CoronaryTerritoryLayerRecordV2<number>,
  label: string,
): void {
  assertPlainObject(record, label);
  assertExactKeys(record, CORONARY_TERRITORY_IDS_V2, label);
  for (const territoryId of CORONARY_TERRITORY_IDS_V2) {
    assertPlainObject(record[territoryId], `${label} ${territoryId}`);
    assertExactKeys(
      record[territoryId],
      CORONARY_LAYER_IDS_V2,
      `${label} ${territoryId}`,
    );
    for (const layerId of CORONARY_LAYER_IDS_V2) {
      if (!Number.isFinite(record[territoryId][layerId])) {
        throw new RangeError(`${label} ${territoryId}.${layerId} must be finite`);
      }
    }
  }
}

function validateTerritoryRecord(
  record: CoronaryTerritoryRecordV2<number>,
  label: string,
): void {
  assertPlainObject(record, label);
  assertExactKeys(record, CORONARY_TERRITORY_IDS_V2, label);
  for (const territoryId of CORONARY_TERRITORY_IDS_V2) {
    if (!Number.isFinite(record[territoryId])) {
      throw new RangeError(`${label} ${territoryId} must be finite`);
    }
  }
}

function mapLayerRecord(
  map: (
    territoryId: (typeof CORONARY_TERRITORY_IDS_V2)[number],
    layerId: (typeof CORONARY_LAYER_IDS_V2)[number],
  ) => number,
): CoronaryTerritoryLayerRecordV2<number> {
  return Object.freeze(Object.fromEntries(CORONARY_TERRITORY_IDS_V2.map(
    (territoryId) => [territoryId, Object.freeze(Object.fromEntries(
      CORONARY_LAYER_IDS_V2.map((layerId) => [
        layerId,
        map(territoryId, layerId),
      ]),
    ))],
  ))) as CoronaryTerritoryLayerRecordV2<number>;
}

function mapTerritoryRecord(
  map: (territoryId: (typeof CORONARY_TERRITORY_IDS_V2)[number]) => number,
): CoronaryTerritoryRecordV2<number> {
  return Object.freeze(Object.fromEntries(CORONARY_TERRITORY_IDS_V2.map(
    (territoryId) => [territoryId, map(territoryId)],
  ))) as CoronaryTerritoryRecordV2<number>;
}

function constantLayerRecord(
  value: number,
): CoronaryTerritoryLayerRecordV2<number> {
  return mapLayerRecord(() => value);
}

function zeroLayerRecord(): CoronaryTerritoryLayerRecordV2<number> {
  return constantLayerRecord(0);
}

function zeroTerritoryRecord(): CoronaryTerritoryRecordV2<number> {
  return mapTerritoryRecord(() => 0);
}

function layerRecordIsZero(
  record: CoronaryTerritoryLayerRecordV2<number>,
): boolean {
  return CORONARY_TERRITORY_IDS_V2.every((territoryId) =>
    CORONARY_LAYER_IDS_V2.every((layerId) =>
      record[territoryId][layerId] === 0));
}

function territoryRecordIsZero(
  record: CoronaryTerritoryRecordV2<number>,
): boolean {
  return CORONARY_TERRITORY_IDS_V2.every((territoryId) =>
    record[territoryId] === 0);
}

function nearlyEqual(left: number, right: number): boolean {
  return Math.abs(left - right) <= timeTolerance(left, right);
}

function timeTolerance(...values: readonly number[]): number {
  return 64 * Number.EPSILON * Math.max(1, ...values.map(Math.abs));
}

function requireFinite(value: number, label: string): void {
  if (!Number.isFinite(value)) throw new RangeError(`${label} must be finite`);
}

function requireNonnegativeFinite(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${label} must be finite and non-negative`);
  }
}

function requirePositiveFinite(value: number, label: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${label} must be finite and positive`);
  }
}

function requireNonnegativeInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(`${label} must be a non-negative integer`);
  }
}

function assertPlainObject(value: unknown, label: string): asserts value is object {
  if (
    value === null
    || typeof value !== "object"
    || Array.isArray(value)
    || (Object.getPrototypeOf(value) !== Object.prototype
      && Object.getPrototypeOf(value) !== null)
  ) {
    throw new Error(`${label} must be a plain object`);
  }
}

function assertExactKeys(
  value: object,
  expectedKeys: readonly string[],
  label: string,
): void {
  const actual = Object.keys(value).sort();
  const expected = [...expectedKeys].sort();
  if (
    actual.length !== expected.length
    || actual.some((key, index) => key !== expected[index])
  ) {
    throw new Error(`${label} keys mismatch`);
  }
}

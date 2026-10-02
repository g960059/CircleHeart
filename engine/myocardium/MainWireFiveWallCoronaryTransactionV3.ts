import {
  createCoronaryAcceptedAutoregulationStateV3,
  createCoronaryAutoregulationWindowBindingV3,
  createDefaultCoronaryAutoregulationWindowControlV3,
  advanceCoronaryAcceptedAutoregulationV3,
  maximumCoronaryAutoregulationStepDurationV3,
  validateCoronaryAcceptedAutoregulationStateV3,
  validateCoronaryAutoregulationWindowBindingV3,
  type CoronaryAcceptedAutoregulationCompletionV3,
  type CoronaryAcceptedAutoregulationAdvanceV3,
  type CoronaryAcceptedAutoregulationStateV3,
  type CoronaryAutoregulationWindowBindingV3,
  type CoronaryAutoregulationWindowControlV3,
} from "@/engine/coronary/acceptedAutoregulationWindowV3";
import {
  NORMAL_CORONARY_DISEASE_INPUT_V2,
  type CoronaryBackwardEulerScratchWorkspaceV2,
  type CoronaryDiseaseInputV2,
} from "@/engine/coronary/backwardEulerCoronaryNetworkV2";
import type {
  NonCoronaryAcceptedNumericalSourceV1,
  NonCoronaryBackwardEulerScratchWorkspaceV1,
} from "@/engine/core/nonCoronaryCirculationBackwardEulerV1";
import {
  NORMAL_ADULT_CORONARY_AUTOREGULATION_PRIOR_V2,
  unitCoronaryDemandScaleV2,
  zeroCoronaryHyperemiaDriveV2,
} from "@/engine/coronary/autoregulationV2";
import {
  CORONARY_LAYER_IDS_V2,
  CORONARY_TERRITORY_IDS_V2,
  type CoronaryTerritoryLayerRecordV2,
  type CoronaryToneStateV2,
} from "@/engine/coronary/typesV2";
import {
  MAIN_WIRE_FIVE_WALL_CORONARY_TRANSACTION_V2_ID,
  initializeMainWireFiveWallCoronaryV2,
  stepMainWireFiveWallCoronaryV2,
  validateMainWireFiveWallCoronaryAcceptedStateV2,
  type MainWireFiveWallCoronaryAcceptedStateV2,
  type MainWireFiveWallCoronaryColdResultV2,
  type MainWireFiveWallCoronaryInitializeInputV2,
  type MainWireFiveWallCoronaryStepInputV2,
  type MainWireFiveWallCoronaryStepResultV2,
  type MainWireFiveWallCoronaryStepSuccessV2,
} from "@/engine/myocardium/MainWireFiveWallCoronaryTransactionV2";
import type {
  MainWireFiveWallFreeCalciumDriveV1,
} from "@/engine/myocardium/mechanics/MainWireFiveWallLandTriSegProviderV1";
import type {
  WholeHeartMechanicsProviderV1,
} from "@/engine/myocardium/wholeHeartMechanicsContractV1";
import {
  validationStampIssuanceEligibleV1,
  validationStampReuseEligibleV1,
} from "@/engine/validationStampModeV1";

export const MAIN_WIRE_FIVE_WALL_CORONARY_TRANSACTION_V3_ID =
  "main-wire-five-wall-coronary-transaction-v3" as const;

export const MAIN_WIRE_FIVE_WALL_CORONARY_TRANSACTION_CLAIM_V3 =
  Object.freeze({
    hydraulicSubstrate:
      "main-wire-five-wall-coronary-transaction-v2-same-candidate" as const,
    acceptedAutoregulation:
      "fixed-physical-time-final-candidate-be-right-endpoint-window" as const,
    hydraulicToneDuringStep: "previous-accepted-tone-fixed" as const,
    acceptedToneAfterWindow:
      "updated-once-after-complete-window-for-next-hydraulic-step" as const,
    acceptedControlDuringWindow:
      "latched-window-control-remains-exact-through-completion" as const,
    desiredControlTransition:
      "latest-desired-control-applies-atomically-at-next-window-boundary" as const,
    flowObservable:
      "layer-qm-internal-not-inlet-r1-or-post-hoc-cycle-sample" as const,
    perfusionPressureObservable:
      "post-focal-lesion-absolute-pressure-minus-common-cv-absolute-pressure" as const,
    failureSemantics:
      "circulation-coronary-mechanics-mvc-tone-and-window-rollback" as const,
    legacyV2AcceptedStateReinterpreted: false as const,
    simulationReady: false as const,
  });

export type MainWireFiveWallCoronaryAcceptedStateV3<TWallState> = Readonly<
  Omit<MainWireFiveWallCoronaryAcceptedStateV2<TWallState>, "transactionId">
  & {
    transactionId: typeof MAIN_WIRE_FIVE_WALL_CORONARY_TRANSACTION_V3_ID;
    coronaryAutoregulationBinding: CoronaryAutoregulationWindowBindingV3;
    coronaryAutoregulation: CoronaryAcceptedAutoregulationStateV3;
  }
>;

/**
 * A cached V2 view exists only after the exact V3 object and that exact V2
 * reconstruction passed both validators while the V3 validation surface was
 * frozen. A changed/deserialised V3 object therefore cannot inherit the stamp.
 */
const validatedBaseStateByMainWireFiveWallCoronaryAcceptedStateV3 =
  new WeakMap<object, MainWireFiveWallCoronaryAcceptedStateV2<unknown>>();

const defaultAutoregulationDriveIdentityV3 = Object.freeze({});
const resolvedAutoregulationControlsByDiseaseV3 = new WeakMap<
  object,
  WeakMap<object, CoronaryAutoregulationWindowControlV3>
>();

export type MainWireFiveWallCoronaryAutoregulationDriveV3 = Readonly<{
  controlId: string;
  demandScaleByTerritoryLayer: CoronaryTerritoryLayerRecordV2<number>;
  hyperemia01ByTerritoryLayer: CoronaryTerritoryLayerRecordV2<number>;
}>;

export type MainWireFiveWallCoronaryInitializeInputV3<TWallState> =
  MainWireFiveWallCoronaryInitializeInputV2<TWallState> & Readonly<{
    coronaryAutoregulationDrive?:
      MainWireFiveWallCoronaryAutoregulationDriveV3;
    autoregulationWindow?: Readonly<{
      durationSec?: number;
      interpretation?:
        | "periodic-sinus-cycle-aligned"
        | "irregular-rhythm-stationary";
    }>;
  }>;

export type MainWireFiveWallCoronaryStepInputV3 =
  MainWireFiveWallCoronaryStepInputV2 & Readonly<{
    coronaryAutoregulationDrive?:
      MainWireFiveWallCoronaryAutoregulationDriveV3;
  }>;

export type MainWireFiveWallCoronaryColdResultV3<TWallState> = Readonly<
  Omit<MainWireFiveWallCoronaryColdResultV2<TWallState>, "acceptedState">
  & { acceptedState: MainWireFiveWallCoronaryAcceptedStateV3<TWallState> }
>;

export type MainWireFiveWallCoronaryStepSuccessV3<TWallState> = Readonly<{
  converged: true;
  acceptedState: MainWireFiveWallCoronaryAcceptedStateV3<TWallState>;
  baseStep: MainWireFiveWallCoronaryStepSuccessV2<TWallState>;
  autoregulationWindowCompleted: boolean;
  autoregulationCompletion:
    CoronaryAcceptedAutoregulationCompletionV3 | null;
  hydraulicToneUsed: CoronaryToneStateV2;
  acceptedToneAfterWindow: CoronaryToneStateV2;
  autoregulationCommitted: true;
}>;

export type MainWireFiveWallCoronaryStepFailureV3<TWallState> = Readonly<{
  converged: false;
  reason:
    | "base-circulation-mechanics-or-coronary-v2-trial-failed"
    | "accepted-coronary-autoregulation-window-rejected";
  message: string;
  rollbackState: MainWireFiveWallCoronaryAcceptedStateV3<TWallState>;
  baseStep: MainWireFiveWallCoronaryStepResultV2<TWallState>;
  mechanicsCommitted: false;
  circulationCommitted: false;
  coronaryCommitted: false;
  mvcReferenceCommitted: false;
  autoregulationCommitted: false;
}>;

export type MainWireFiveWallCoronaryStepResultV3<TWallState> =
  | MainWireFiveWallCoronaryStepSuccessV3<TWallState>
  | MainWireFiveWallCoronaryStepFailureV3<TWallState>;

export type MainWireFiveWallCoronaryAutoregulationAcceptedOwnerV3 = Readonly<{
  acceptedTimeSec: number;
  binding: CoronaryAutoregulationWindowBindingV3;
  state: CoronaryAcceptedAutoregulationStateV3;
  toneResistanceScaleByTerritoryLayer: CoronaryToneStateV2;
}>;

/**
 * Applies the accepted autoregulation owner directly to the ten packed
 * hydraulic observables emitted by the coupled solver. This is algebraically
 * identical to the public-trial promotion below and avoids requiring a full
 * coronary diagnostics object on the typed path.
 */
export function advanceMainWireFiveWallCoronaryAutoregulationFromPackedV3<
  TWallState,
>(
  previous: MainWireFiveWallCoronaryAcceptedStateV3<TWallState>,
  input: MainWireFiveWallCoronaryStepInputV3,
  candidateAcceptedTimeSec: number,
  candidateRevision: number,
  packedHydraulicObservables: Float64Array,
): CoronaryAcceptedAutoregulationAdvanceV3 {
  return advanceMainWireFiveWallCoronaryAutoregulationOwnerFromPackedV3(
    Object.freeze({
      acceptedTimeSec: previous.acceptedTimeSec,
      binding: previous.coronaryAutoregulationBinding,
      state: previous.coronaryAutoregulation,
      toneResistanceScaleByTerritoryLayer:
        previous.coronary.toneResistanceScaleByTerritoryLayer,
    }),
    input,
    candidateAcceptedTimeSec,
    candidateRevision,
    packedHydraulicObservables,
  );
}

/**
 * Advances only the accepted autoregulation owner. The complete coronary
 * AcceptedState is deliberately absent so a typed global transaction can
 * consume the selected-root hydraulic page without rehydrating public state.
 */
export function advanceMainWireFiveWallCoronaryAutoregulationOwnerFromPackedV3(
  previous: MainWireFiveWallCoronaryAutoregulationAcceptedOwnerV3,
  input: MainWireFiveWallCoronaryStepInputV3,
  candidateAcceptedTimeSec: number,
  candidateRevision: number,
  packedHydraulicObservables: Float64Array,
): CoronaryAcceptedAutoregulationAdvanceV3 {
  if (
    !(packedHydraulicObservables instanceof Float64Array)
    || packedHydraulicObservables.length !== 10
  ) {
    throw new RangeError(
      "packed coronary autoregulation readback must contain ten f64s",
    );
  }
  let observableIndex = 0;
  const finalQmInternalFlowMlPerSecByTerritoryLayer = Object.freeze(
    Object.fromEntries(CORONARY_TERRITORY_IDS_V2.map((territoryId) => [
      territoryId,
      Object.freeze(Object.fromEntries(CORONARY_LAYER_IDS_V2.map(
        (layerId) => [layerId, packedHydraulicObservables[observableIndex++]!],
      ))),
    ])),
  ) as CoronaryTerritoryLayerRecordV2<number>;
  const finalPostFocalLesionPressureMmHgByTerritory = Object.freeze(
    Object.fromEntries(CORONARY_TERRITORY_IDS_V2.map((territoryId) => [
      territoryId,
      packedHydraulicObservables[observableIndex++]!,
    ])),
  ) as Readonly<Record<(typeof CORONARY_TERRITORY_IDS_V2)[number], number>>;
  return advanceCoronaryAcceptedAutoregulationV3(
    previous.binding,
    previous.state,
    previous.toneResistanceScaleByTerritoryLayer,
    {
      previousAcceptedTimeSec: previous.acceptedTimeSec,
      candidateAcceptedTimeSec,
      candidateRevision,
      finalQmInternalFlowMlPerSecByTerritoryLayer,
      finalPostFocalLesionPressureMmHgByTerritory,
      finalCommonCoronaryVenousPressureMmHg:
        packedHydraulicObservables[observableIndex]!,
      control: resolveAutoregulationControl(
        input.coronaryAutoregulationDrive,
        input.coronaryDisease ?? NORMAL_CORONARY_DISEASE_INPUT_V2,
      ),
      topologyPrior: input.coronaryPrior,
    },
  );
}

export function initializeMainWireFiveWallCoronaryV3<TWallState>(
  input: MainWireFiveWallCoronaryInitializeInputV3<TWallState>,
): MainWireFiveWallCoronaryColdResultV3<TWallState> {
  const base = initializeMainWireFiveWallCoronaryV2(input);
  const interpretation = input.autoregulationWindow?.interpretation
    ?? "periodic-sinus-cycle-aligned";
  const durationSec = input.autoregulationWindow?.durationSec
    ?? (interpretation === "periodic-sinus-cycle-aligned"
      ? input.calciumDriveParams.cycleLengthSec
      : 1);
  if (interpretation === "periodic-sinus-cycle-aligned"
    && !nearlyEqual(durationSec, input.calciumDriveParams.cycleLengthSec)) {
    throw new RangeError(
      "periodic sinus autoregulation window must equal the calcium cycle",
    );
  }
  const binding = createCoronaryAutoregulationWindowBindingV3({
    originAcceptedTimeSec: base.acceptedState.acceptedTimeSec,
    durationSec,
    interpretation,
  });
  const autoregulation = createCoronaryAcceptedAutoregulationStateV3(
    binding,
    {
      acceptedTimeSec: base.acceptedState.acceptedTimeSec,
      revision: base.acceptedState.revision,
      desiredControl: resolveAutoregulationControl(
        input.coronaryAutoregulationDrive,
        input.coronaryDisease ?? NORMAL_CORONARY_DISEASE_INPUT_V2,
      ),
    },
  );
  return Object.freeze({
    ...base,
    acceptedState: wrapInternalMainWireFiveWallCoronaryAcceptedStateV3(
      base.acceptedState,
      binding,
      autoregulation,
    ),
  });
}

export function maximumMainWireFiveWallCoronaryStepDurationV3<TWallState>(
  state: MainWireFiveWallCoronaryAcceptedStateV3<TWallState>,
): number {
  validateMainWireFiveWallCoronaryAcceptedStateV3(state);
  return maximumMainWireFiveWallCoronaryStepDurationFromValidatedStateV3(
    state,
  );
}

function maximumMainWireFiveWallCoronaryStepDurationFromValidatedStateV3<
  TWallState,
>(
  state: MainWireFiveWallCoronaryAcceptedStateV3<TWallState>,
): number {
  return maximumCoronaryAutoregulationStepDurationV3(
    state.coronaryAutoregulationBinding,
    state.coronaryAutoregulation,
    state.acceptedTimeSec,
  );
}

export function stepMainWireFiveWallCoronaryV3<TWallState>(
  provider: WholeHeartMechanicsProviderV1<
    TWallState,
    MainWireFiveWallFreeCalciumDriveV1
  >,
  previous: MainWireFiveWallCoronaryAcceptedStateV3<TWallState>,
  input: MainWireFiveWallCoronaryStepInputV3,
  coronaryScratchWorkspace?: CoronaryBackwardEulerScratchWorkspaceV2,
  nonCoronaryScratchWorkspace?:
    NonCoronaryBackwardEulerScratchWorkspaceV1,
  previousAcceptedNumericalSource?: NonCoronaryAcceptedNumericalSourceV1,
): MainWireFiveWallCoronaryStepResultV3<TWallState> {
  const basePrevious =
    validatedMainWireFiveWallCoronaryBaseStateV2(previous);
  const maximumDtSec =
    maximumMainWireFiveWallCoronaryStepDurationFromValidatedStateV3(
      previous,
    );
  const tolerance = 64 * Number.EPSILON
    * Math.max(1, Math.abs(previous.acceptedTimeSec), Math.abs(input.dtSec));
  if (!Number.isFinite(input.dtSec) || input.dtSec <= 0
    || input.dtSec > maximumDtSec + tolerance) {
    throw new RangeError(
      "step dt must be positive and must not cross the autoregulation window",
    );
  }
  const baseStep = stepMainWireFiveWallCoronaryV2(
    provider,
    basePrevious,
    input,
    coronaryScratchWorkspace,
    nonCoronaryScratchWorkspace,
    previousAcceptedNumericalSource,
  );
  return promoteMainWireFiveWallCoronaryBaseStepV3(
    previous,
    input,
    baseStep,
  );
}

/**
 * Applies the V3 accepted-autoregulation owner to one component-admitted V2
 * candidate. The nested reference step and the vNext statically condensed
 * solver both enter through this exact promotion boundary, so changing the
 * nonlinear algebra cannot fork coronary tone/window semantics.
 */
export function promoteMainWireFiveWallCoronaryBaseStepV3<TWallState>(
  previous: MainWireFiveWallCoronaryAcceptedStateV3<TWallState>,
  input: MainWireFiveWallCoronaryStepInputV3,
  baseStep: MainWireFiveWallCoronaryStepResultV2<TWallState>,
): MainWireFiveWallCoronaryStepResultV3<TWallState> {
  validatedMainWireFiveWallCoronaryBaseStateV2(previous);
  const maximumDtSec =
    maximumMainWireFiveWallCoronaryStepDurationFromValidatedStateV3(
      previous,
    );
  const tolerance = 64 * Number.EPSILON
    * Math.max(1, Math.abs(previous.acceptedTimeSec), Math.abs(input.dtSec));
  if (!Number.isFinite(input.dtSec) || input.dtSec <= 0
    || input.dtSec > maximumDtSec + tolerance) {
    throw new RangeError(
      "step dt must be positive and must not cross the autoregulation window",
    );
  }
  if (baseStep.converged === false) {
    return Object.freeze({
      converged: false,
      reason: "base-circulation-mechanics-or-coronary-v2-trial-failed",
      message: baseStep.message,
      rollbackState: previous,
      baseStep,
      mechanicsCommitted: false,
      circulationCommitted: false,
      coronaryCommitted: false,
      mvcReferenceCommitted: false,
      autoregulationCommitted: false,
    });
  }

  try {
    const control = resolveAutoregulationControl(
      input.coronaryAutoregulationDrive,
      input.coronaryDisease ?? NORMAL_CORONARY_DISEASE_INPUT_V2,
    );
    const hydraulics = baseStep.coronaryTrial.diagnostics.hydraulics;
    const regulation = advanceCoronaryAcceptedAutoregulationV3(
      previous.coronaryAutoregulationBinding,
      previous.coronaryAutoregulation,
      previous.coronary.toneResistanceScaleByTerritoryLayer,
      {
        previousAcceptedTimeSec: previous.acceptedTimeSec,
        candidateAcceptedTimeSec: baseStep.acceptedState.acceptedTimeSec,
        candidateRevision: baseStep.acceptedState.revision,
        finalQmInternalFlowMlPerSecByTerritoryLayer:
          hydraulics.layerQmInternalFlowMlPerSecByTerritory,
        finalPostFocalLesionPressureMmHgByTerritory:
          hydraulics.postFocalLesionAbsolutePressureMmHgByTerritory,
        finalCommonCoronaryVenousPressureMmHg:
          hydraulics.absolutePressureMmHgByNode.CV,
        control,
        topologyPrior: input.coronaryPrior,
      },
    );
    const promotedBase = withAcceptedCoronaryTone(
      baseStep.acceptedState,
      regulation.nextToneResistanceScaleByTerritoryLayer,
    );
    const acceptedState = wrapInternalMainWireFiveWallCoronaryAcceptedStateV3(
      promotedBase,
      previous.coronaryAutoregulationBinding,
      regulation.nextState,
    );
    return Object.freeze({
      converged: true,
      acceptedState,
      baseStep,
      autoregulationWindowCompleted:
        regulation.completedWindow !== null,
      autoregulationCompletion: regulation.completedWindow,
      hydraulicToneUsed: regulation.hydraulicToneUsed,
      acceptedToneAfterWindow:
        regulation.nextToneResistanceScaleByTerritoryLayer,
      autoregulationCommitted: true,
    });
  } catch (error) {
    return Object.freeze({
      converged: false,
      reason: "accepted-coronary-autoregulation-window-rejected",
      message: error instanceof Error ? error.message : String(error),
      rollbackState: previous,
      baseStep,
      mechanicsCommitted: false,
      circulationCommitted: false,
      coronaryCommitted: false,
      mvcReferenceCommitted: false,
      autoregulationCommitted: false,
    });
  }
}

export function mainWireFiveWallCoronaryBaseStateV2<TWallState>(
  state: MainWireFiveWallCoronaryAcceptedStateV3<TWallState>,
): MainWireFiveWallCoronaryAcceptedStateV2<TWallState> {
  const {
    coronaryAutoregulationBinding: _binding,
    coronaryAutoregulation: _autoregulation,
    ...base
  } = state;
  return Object.freeze({
    ...base,
    transactionId: MAIN_WIRE_FIVE_WALL_CORONARY_TRANSACTION_V2_ID,
  });
}

export function wrapMainWireFiveWallCoronaryAcceptedStateV3<TWallState>(
  base: MainWireFiveWallCoronaryAcceptedStateV2<TWallState>,
  binding: CoronaryAutoregulationWindowBindingV3,
  autoregulation: CoronaryAcceptedAutoregulationStateV3,
): MainWireFiveWallCoronaryAcceptedStateV3<TWallState> {
  validateCoronaryAutoregulationWindowBindingV3(binding);
  validateCoronaryAcceptedAutoregulationStateV3(
    binding,
    autoregulation,
    {
      acceptedTimeSec: base.acceptedTimeSec,
      maximumRevision: base.revision,
    },
  );
  return Object.freeze({
    ...base,
    transactionId: MAIN_WIRE_FIVE_WALL_CORONARY_TRANSACTION_V3_ID,
    coronaryAutoregulationBinding: Object.freeze({
      ...binding,
      windowPolicy: Object.freeze({ ...binding.windowPolicy }),
    }),
    coronaryAutoregulation: autoregulation,
  });
}

/**
 * Wraps only V2 accepted states returned by this module's cold/step owners and
 * records their exact V3-to-V2 view without attempting a generic transitive
 * immutability proof over mechanics typed arrays. Downstream V2 mechanics and
 * material-state validators remain authoritative; external wrappers and
 * restored identities never enter this cache through this private function.
 */
function wrapInternalMainWireFiveWallCoronaryAcceptedStateV3<TWallState>(
  base: MainWireFiveWallCoronaryAcceptedStateV2<TWallState>,
  binding: CoronaryAutoregulationWindowBindingV3,
  autoregulation: CoronaryAcceptedAutoregulationStateV3,
): MainWireFiveWallCoronaryAcceptedStateV3<TWallState> {
  validateMainWireFiveWallCoronaryAcceptedStateV2(base);
  const state = wrapMainWireFiveWallCoronaryAcceptedStateV3(
    base,
    binding,
    autoregulation,
  );
  if (validationStampReuseEligibleV1()) {
    validatedBaseStateByMainWireFiveWallCoronaryAcceptedStateV3.set(
      state,
      base as MainWireFiveWallCoronaryAcceptedStateV2<unknown>,
    );
  }
  return state;
}

export function validateMainWireFiveWallCoronaryAcceptedStateV3<TWallState>(
  state: MainWireFiveWallCoronaryAcceptedStateV3<TWallState>,
): void {
  validatedMainWireFiveWallCoronaryBaseStateV2(state);
}

function validatedMainWireFiveWallCoronaryBaseStateV2<TWallState>(
  state: MainWireFiveWallCoronaryAcceptedStateV3<TWallState>,
): MainWireFiveWallCoronaryAcceptedStateV2<TWallState> {
  const cached =
    validatedBaseStateByMainWireFiveWallCoronaryAcceptedStateV3.get(state) as
      | MainWireFiveWallCoronaryAcceptedStateV2<TWallState>
      | undefined;
  if (validationStampReuseEligibleV1() && cached !== undefined) return cached;
  if (state.transactionId !== MAIN_WIRE_FIVE_WALL_CORONARY_TRANSACTION_V3_ID) {
    throw new Error("invalid main-wire coronary V3 transaction identity");
  }
  if (!Number.isInteger(state.revision) || state.revision < 0
    || !Number.isFinite(state.acceptedTimeSec) || state.acceptedTimeSec < 0
    || state.circulation.revision !== state.revision
    || state.coronary.revision !== state.revision
    || state.mechanics.revision !== state.revision
    || state.circulation.acceptedTimeSec !== state.acceptedTimeSec
    || state.coronary.acceptedTimeSec !== state.acceptedTimeSec
    || state.mechanics.acceptedTimeSec !== state.acceptedTimeSec) {
    throw new Error("main-wire coronary V3 accepted owner clocks differ");
  }
  validateCoronaryAcceptedAutoregulationStateV3(
    state.coronaryAutoregulationBinding,
    state.coronaryAutoregulation,
    {
      acceptedTimeSec: state.acceptedTimeSec,
      maximumRevision: state.revision,
    },
  );
  const baseState = mainWireFiveWallCoronaryBaseStateV2(state);
  validateMainWireFiveWallCoronaryAcceptedStateV2(baseState);
  return baseState;
}

function withAcceptedCoronaryTone<TWallState>(
  base: MainWireFiveWallCoronaryAcceptedStateV2<TWallState>,
  tone: CoronaryToneStateV2,
): MainWireFiveWallCoronaryAcceptedStateV2<TWallState> {
  return Object.freeze({
    ...base,
    coronary: Object.freeze({
      ...base.coronary,
      toneResistanceScaleByTerritoryLayer: copyLayerRecord(tone),
    }),
  });
}

function resolveAutoregulationControl(
  drive: MainWireFiveWallCoronaryAutoregulationDriveV3 | undefined,
  disease: CoronaryDiseaseInputV2,
): CoronaryAutoregulationWindowControlV3 {
  const reuse = validationStampReuseEligibleV1();
  const driveIdentity = drive ?? defaultAutoregulationDriveIdentityV3;
  const cached = reuse
    ? resolvedAutoregulationControlsByDiseaseV3.get(disease)?.get(driveIdentity)
    : undefined;
  if (cached !== undefined) return cached;
  const defaults = createDefaultCoronaryAutoregulationWindowControlV3();
  const control = Object.freeze({
    controlId: drive?.controlId ?? defaults.controlId,
    demandScaleByTerritoryLayer:
      drive?.demandScaleByTerritoryLayer ?? unitCoronaryDemandScaleV2(),
    hyperemia01ByTerritoryLayer:
      drive?.hyperemia01ByTerritoryLayer ?? zeroCoronaryHyperemiaDriveV2(),
    effectiveMinimumToneScaleByTerritoryLayer: mapLayerRecord(
      (territoryId, layerId) => Math.max(
        NORMAL_ADULT_CORONARY_AUTOREGULATION_PRIOR_V2.minimumResistanceScale,
        disease[territoryId].layers[layerId]
          .vasodilatoryToneMinimumResistanceScale,
      ),
    ),
  });
  if (reuse && validationStampIssuanceEligibleV1(disease, driveIdentity)) {
    const byDrive = resolvedAutoregulationControlsByDiseaseV3.get(disease)
      ?? new WeakMap<object, CoronaryAutoregulationWindowControlV3>();
    byDrive.set(driveIdentity, control);
    resolvedAutoregulationControlsByDiseaseV3.set(disease, byDrive);
  }
  return control;
}

function copyLayerRecord(
  record: CoronaryTerritoryLayerRecordV2<number>,
): CoronaryTerritoryLayerRecordV2<number> {
  return mapLayerRecord((territoryId, layerId) =>
    record[territoryId][layerId]);
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

function nearlyEqual(left: number, right: number): boolean {
  return Math.abs(left - right) <= 64 * Number.EPSILON
    * Math.max(1, Math.abs(left), Math.abs(right));
}

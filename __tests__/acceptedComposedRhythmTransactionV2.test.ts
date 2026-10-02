import { describe, expect, it, vi } from "vitest";
import * as proximalAv from "@/engine/myocardium/rhythm/recoveryConcealmentAvGateV2";
import {
  MAIN_WIRE_INTEGRATED_MATCHED_ALPHA_FIXED_REGULAR_SINUS_PROFILE_V1_CLAIM,
  MAIN_WIRE_INTEGRATED_MATCHED_ALPHA_FIXED_REGULAR_SINUS_PROFILE_V1_ID,
  createMainWireIntegratedRegularSinusRhythmV3,
} from "@/engine/myocardium/MainWireIntegratedRegularSinusRhythmV3";
import {
  evaluateExactEventCalciumV1,
} from "@/engine/myocardium/calcium/exactEventPrescribedCalciumV1";
import {
  FIVE_WALL_NORMAL_CALCIUM_DRIVE_FIXED_PRIOR_V1,
  evaluateFiveWallNormalCalciumDriveV1,
} from "@/engine/myocardium/calcium/fiveWallNormalCalciumDriveV1";
import {
  MAIN_WIRE_VENTRICULAR_CALCIUM_MATCHED_ALPHA_EXACT_PERSISTENCE_CLAIM_V1,
  MAIN_WIRE_VENTRICULAR_CALCIUM_MATCHED_ALPHA_EXACT_PERSISTENCE_V1_ID,
  resolveMainWireVentricularCalciumMatchedAlphaExactPersistenceV1,
} from "@/engine/myocardium/calcium/MainWireVentricularCalciumMatchedAlphaExactPersistenceV1";
import {
  resolveMainWireVentricularCalciumMatchedAlphaSaturatingHeartRateLawParamsV1,
} from "@/engine/myocardium/calcium/MainWireVentricularCalciumMatchedAlphaSaturatingHeartRateLawV1";
import {
  checkpointAcceptedComposedRhythmTransactionStateV2,
  restoreAcceptedComposedRhythmTransactionStateV2,
} from "@/engine/myocardium/rhythm/acceptedComposedRhythmTransactionCheckpointV2";
import {
  ACCEPTED_COMPOSED_RHYTHM_TRANSACTION_CLAIM_V2,
  commitAcceptedComposedRhythmTransactionCandidateV2,
  createAcceptedComposedRhythmTransactionConfigurationV2,
  createNoExternalAtrialSourceBatchV2,
  evaluateAcceptedComposedRhythmTransactionCandidateV2,
  initializeAcceptedComposedRhythmTransactionStateV2,
  limitAcceptedComposedRhythmTransactionCandidateTimeV2,
  rebindAcceptedComposedRegularSinusStateV2,
  rollbackAcceptedComposedRhythmTransactionCandidateV2,
  validateAcceptedComposedRhythmTransactionBoundaryV2,
  validateAcceptedComposedRhythmTransactionStateV2,
  type AcceptedComposedRhythmTransactionConfigurationV2,
  type AcceptedComposedRhythmTransactionStateV2,
} from "@/engine/myocardium/rhythm/acceptedComposedRhythmTransactionV2";
import {
  createAcceptedAuthoredEctopyScheduleConfigurationV2,
  type AuthoredEctopyEventInputV2,
} from "@/engine/myocardium/rhythm/acceptedAuthoredEctopyScheduleV2";
import {
  createAcceptedAuthoredVentricularPacingReplaySourceConfigurationV1,
  type AuthoredVentricularPacingReplayEventInputV1,
} from "@/engine/myocardium/rhythm/acceptedAuthoredVentricularPacingReplaySourceV1";
import {
  createDistalConductionGateConfigurationV1,
  type DistalConductionGateModeConfigurationInputV1,
} from "@/engine/myocardium/rhythm/acceptedDistalConductionGateV1";
import {
  createAcceptedElectricalCaptureOwnerConfigurationV2,
  createSourceImpulseV2,
  evaluateAcceptedElectricalCaptureBatchCandidateV2,
  initializeAcceptedElectricalCaptureOwnerStateV2,
  type CapturedElectricalActivationV2,
} from "@/engine/myocardium/rhythm/acceptedElectricalCaptureOwnerV2";
import {
  createRegularAtrialSourceConfigurationV1,
} from "@/engine/myocardium/rhythm/acceptedRegularAtrialSourceOwnerV1";
import {
  createRecoveryConcealmentAvGateParametersV1,
} from "@/engine/myocardium/rhythm/recoveryConcealmentAvGateV1";
import {
  RECOVERY_CONCEALMENT_AV_GATE_STATE_V2_ID,
} from "@/engine/myocardium/rhythm/recoveryConcealmentAvGateV2";
import {
  withHotPathIntegrityTierV1,
} from "@/engine/hotPathIntegrityTierV1";
import {
  selectValidationStampModeV1,
  validationStampModeV1,
} from "@/engine/validationStampModeV1";
import {
  createAcceptedVentricularBackupSourceConfigurationV2,
} from "@/engine/myocardium/rhythm/acceptedVentricularBackupSourceOwnerV2";
import {
  createAcceptedVentricularIntervalStrengthConfigurationV1,
} from "@/engine/myocardium/rhythm/acceptedVentricularIntervalStrengthOwnerV1";
import {
  canonicalJsonStringify,
  sha256CanonicalJsonHex,
} from "@/engine/integrity";

type FixtureOptions = Readonly<{
  events?: readonly AuthoredEctopyEventInputV2[];
  pacingReplayEvents?:
    readonly AuthoredVentricularPacingReplayEventInputV1[];
  acceptedTimeSec?: number;
  priorVentricularTimeSec?: number;
  firstRegularTimeSec?: number;
  atrialPriorTimeSec?: number | null;
  atrialRefractorySec?: number;
  ventricularRefractorySec?: number;
  distalMode?: DistalConductionGateModeConfigurationInputV1;
  escapeCycleSec?: number;
  vviIntervalSec?: number;
  sourceMode?: "regular" | "external-af";
  regularRhythmClass?: "sinus" | "flutter";
  lvfwCalciumGainUMPerUnitDrive?: number;
}>;

function fixture(options: FixtureOptions = {}): {
  configuration: AcceptedComposedRhythmTransactionConfigurationV2;
  state: AcceptedComposedRhythmTransactionStateV2;
} {
  const acceptedTimeSec = options.acceptedTimeSec ?? 0;
  const captureConfiguration = createAcceptedElectricalCaptureOwnerConfigurationV2({
    configurationId: "capture-config",
    ownerInstanceId: "capture-owner",
    atrialGate: {
      gateInstanceId: "atrial-capture-gate",
      refractoryPeriodSec: options.atrialRefractorySec ?? 0.2,
    },
    ventricularGate: {
      gateInstanceId: "ventricular-capture-gate",
      refractoryPeriodSec: options.ventricularRefractorySec ?? 0.25,
    },
  });
  const intervalConfiguration = createAcceptedVentricularIntervalStrengthConfigurationV1({
    configurationId: "interval-config",
    ownerInstanceId: "interval-owner",
    parameterProvenance: { kind: "explicit-research-parameters", sourceId: "test-explicit" },
    recoveryTimeConstantSec: 0.5,
    releaseFractionBeta: 0.8,
    releasedLoadReturnFractionR: 0.5,
    intervalInfluxInhibitionFractionH: 0.2,
    referenceCycleLengthSec: 1,
  });
  const regularConfiguration = createRegularAtrialSourceConfigurationV1({
    configurationId: "regular-config",
    ownerInstanceId: "regular-owner",
    sourceId: "sinus-source",
    rhythmClass: options.regularRhythmClass ?? "sinus",
    cycleLengthSec: 1,
  });
  const sourceMode = options.sourceMode ?? "regular";
  const configuration = createAcceptedComposedRhythmTransactionConfigurationV2({
    configurationId: `composed-${sourceMode}`,
    ownerInstanceId: "composed-owner",
    atrialSource: sourceMode === "regular"
      ? { mode: "regular", regularSourceConfiguration: regularConfiguration, externalAfOwnerInstanceId: null }
      : { mode: "external-af", regularSourceConfiguration: null, externalAfOwnerInstanceId: "af-owner" },
    authoredEctopySchedule: createAcceptedAuthoredEctopyScheduleConfigurationV2({
      configurationId: "ectopy-config",
      ownerInstanceId: "ectopy-owner",
      scheduleId: "ectopy-schedule",
      events: options.events ?? [],
    }),
    authoredVentricularPacingReplay:
      options.pacingReplayEvents === undefined
        ? null
        : createAcceptedAuthoredVentricularPacingReplaySourceConfigurationV1({
          configurationId: "ventricular-pacing-replay-config",
          ownerInstanceId: "ventricular-pacing-replay-owner",
          replayId: "ventricular-pacing-replay",
          sourceId: "authored-ventricular-pacing-source",
          events: options.pacingReplayEvents,
        }),
    electricalCaptureOwner: captureConfiguration,
    avGateParameters: createRecoveryConcealmentAvGateParametersV1({
      parameterSetId: "av-parameters",
      parameterProvenance: { kind: "explicit-research-parameters", sourceId: "test-explicit" },
      minimumConductionDelaySec: 0.1,
      recoveryDelayAmplitudeSec: 0,
      recoveryTimeConstantSec: 1,
      postConductionRefractorySec: 0.2,
      concealedRefractoryExtensionSec: 0,
    }),
    avGateInstanceId: "av-gate",
    distalGate: createDistalConductionGateConfigurationV1({
      configurationId: "distal-config",
      gateInstanceId: "distal-gate",
      parameterProvenance: { kind: "explicit-research-parameters", sourceId: "test-explicit" },
      hvConductionDelaySec: 0.05,
      distalEffectiveRefractoryPeriodSec: 0,
      modeConfiguration: options.distalMode ?? { mode: "pass" },
    }),
    ventricularBackup: createAcceptedVentricularBackupSourceConfigurationV2({
      configurationId: "backup-config",
      ownerInstanceId: "backup-owner",
      parameterProvenance: { kind: "authored", sourceId: "test-explicit" },
      intrinsicEscapeSourceId: "escape-source",
      intrinsicEscapeCycleLengthSec: options.escapeCycleSec ?? 2,
      vviPacingSourceId: "vvi-source",
      vviLowerRateLimitPerMin: 60 / (options.vviIntervalSec ?? 2),
    }),
    ventricularIntervalStrength: intervalConfiguration,
    calciumParametersByWall: Object.freeze({
      LA: calciumParameters(), RA: calciumParameters(),
      LVFW: calciumParameters(options.lvfwCalciumGainUMPerUnitDrive),
      SEP: calciumParameters(), RVFW: calciumParameters(),
    }),
    sinusAtrialCalciumDeposit: {
      electricalToCalciumDelaySec: 0.02,
      leftAtrialStrength: 1,
      rightAtrialStrength: 0.9,
    },
    pacAtrialCalciumDeposit: {
      electricalToCalciumDelaySec: 0.02,
      leftAtrialStrength: 0.8,
      rightAtrialStrength: 0.7,
    },
    ventricularCalciumDeposit: {
      electricalToCalciumDelaySec: 0.02,
      lvFreeWallBaseStrength: 1,
      septalBaseStrength: 0.95,
      rvFreeWallBaseStrength: 0.9,
    },
  });
  const priorV = priorVentricularCapture(
    captureConfiguration,
    options.priorVentricularTimeSec ?? acceptedTimeSec,
  );
  const state = initializeAcceptedComposedRhythmTransactionStateV2(configuration, {
    acceptedTimeSec,
    regularFirstFutureActivationTimeSec: sourceMode === "regular"
      ? options.firstRegularTimeSec ?? acceptedTimeSec + 1
      : null,
    regularFirstSourceSequence: sourceMode === "regular" ? 0 : null,
    priorAcceptedAtrialCapture: options.atrialPriorTimeSec === null || options.atrialPriorTimeSec === undefined
      ? null
      : { capturedActivationId: "prior-atrial", activationTimeSec: options.atrialPriorTimeSec },
    priorAcceptedVentricularActivation: priorV,
    initialNormalizedSrLoadState: intervalConfiguration.referenceNormalizedSrLoadState,
    calciumStateByWall: Object.freeze({
      LA: Object.freeze([0, 0] as const), RA: Object.freeze([0, 0] as const),
      LVFW: Object.freeze([0, 0] as const), SEP: Object.freeze([0, 0] as const),
      RVFW: Object.freeze([0, 0] as const),
    }),
  });
  return { configuration, state };
}

function calciumParameters(calciumGainUMPerUnitDrive = 1) {
  return Object.freeze({
    tauRiseSec: 0.03,
    tauDecaySec: 0.2,
    calciumRestUM: 0.1,
    calciumGainUMPerUnitDrive,
  });
}

function priorVentricularCapture(
  configuration: ReturnType<typeof createAcceptedElectricalCaptureOwnerConfigurationV2>,
  timeSec: number,
): CapturedElectricalActivationV2 {
  const captureState = initializeAcceptedElectricalCaptureOwnerStateV2(configuration, {
    acceptedTimeSec: timeSec,
    atrialPriorCapture: null,
    ventricularPriorCapture: null,
  });
  const source = createSourceImpulseV2({
    sourceImpulseId: `history-source-${timeSec}`,
    parentCapturedActivationId: null,
    chamber: "ventricular",
    sourceKind: "escape",
    sourceId: "history-source",
    sourceSequence: 0,
    activationTimeSec: timeSec,
  });
  return evaluateAcceptedElectricalCaptureBatchCandidateV2(captureState, {
    candidateTimeSec: timeSec,
    sourceImpulses: [source],
  }).capturedActivations[0]!;
}

function evaluateAt(
  state: AcceptedComposedRhythmTransactionStateV2,
  timeSec: number,
) {
  return evaluateAcceptedComposedRhythmTransactionCandidateV2(state, {
    candidateTimeSec: timeSec,
    externalAtrialSourceBatch: createNoExternalAtrialSourceBatchV2(timeSec),
  });
}

function advanceAt(
  state: AcceptedComposedRhythmTransactionStateV2,
  timeSec: number,
): AcceptedComposedRhythmTransactionStateV2 {
  const candidate = evaluateAt(state, timeSec);
  return commitAcceptedComposedRhythmTransactionCandidateV2(state, candidate);
}

function advanceThroughOwnedBoundaries(
  state: AcceptedComposedRhythmTransactionStateV2,
  targetTimeSec: number,
): AcceptedComposedRhythmTransactionStateV2 {
  let current = state;
  while (current.acceptedTimeSec < targetTimeSec) {
    const limited = limitAcceptedComposedRhythmTransactionCandidateTimeV2(
      current,
      targetTimeSec,
      null,
    );
    if (!(limited.candidateTimeSec > current.acceptedTimeSec)) {
      throw new Error("test helper did not make strict forward progress");
    }
    current = advanceAt(current, limited.candidateTimeSec);
  }
  return current;
}

describe("AcceptedComposedRhythmTransactionV2", () => {
  it("keeps the absent-profile regular-sinus legacy keys and literals", () => {
    const cycleLengthSec = 0.8;
    const rhythm = createMainWireIntegratedRegularSinusRhythmV3({
      idPrefix: "legacy-default-regression",
      parameterProvenanceSourceId: "legacy-default-regression-source",
      cycleLengthSec,
    });
    const interval = rhythm.configuration.ventricularIntervalStrength;

    expect(Object.keys(interval)).toEqual([
      "configurationSchemaId",
      "schemaVersion",
      "configurationId",
      "ownerInstanceId",
      "parameterProvenance",
      "recoveryTimeConstantSec",
      "releaseFractionBeta",
      "releasedLoadReturnFractionR",
      "intervalInfluxInhibitionFractionH",
      "referenceCycleLengthSec",
      "referenceRecoveryFractionA",
      "referenceNormalizedSrLoadState",
      "normalizedIntervalInfluxGamma",
    ]);
    expect(Object.hasOwn(interval, "futureExactCalciumDepositPolicy"))
      .toBe(false);
    expect(interval.referenceCycleLengthSec).toBe(1);
    expect(rhythm.configuration.avGateParameters.minimumConductionDelaySec)
      .toBe(0.125);
    expect(rhythm.configuration.distalGate.hvConductionDelaySec)
      .toBe(0.0625);
    expect(
      rhythm.configuration.sinusAtrialCalciumDeposit
        ?.electricalToCalciumDelaySec,
    ).toBe(0.0625);
    expect(
      rhythm.configuration.ventricularCalciumDeposit
        .electricalToCalciumDelaySec,
    ).toBe(0.0625);
    expect(rhythm.state.regularAtrialSourceState?.nextActivationTimeSec)
      .toBe(0.625 * cycleLengthSec);
    expect(
      rhythm.state.ventricularIntervalStrengthState
        .lastAcceptedVentricularActivation.activationTimeSec,
    ).toBe(0);
    expect(rhythm.state.calciumStateByWall).toEqual({
      LA: [0, 0],
      RA: [0, 0],
      LVFW: [0, 0],
      SEP: [0, 0],
      RVFW: [0, 0],
    });
    expect(FIVE_WALL_NORMAL_CALCIUM_DRIVE_FIXED_PRIOR_V1.cycleLengthSec)
      .toBe(1);
  });

  it("warm-rebinds a matched-alpha HR coordinate at the accepted clock", () => {
    const identity = {
      idPrefix: "matched-alpha-warm-rebind",
      parameterProvenanceSourceId: "matched-alpha-warm-rebind-source",
    } as const;
    const sourceRhythm = createMainWireIntegratedRegularSinusRhythmV3(
      { ...identity, cycleLengthSec: 1 },
      {
        profileId:
          MAIN_WIRE_INTEGRATED_MATCHED_ALPHA_FIXED_REGULAR_SINUS_PROFILE_V1_ID,
        heartRateBpm: 60,
      },
    );
    const source = advanceThroughOwnedBoundaries(sourceRhythm.state, 1.1);
    const targetRhythm = createMainWireIntegratedRegularSinusRhythmV3(
      { ...identity, cycleLengthSec: 0.8 },
      {
        profileId:
          MAIN_WIRE_INTEGRATED_MATCHED_ALPHA_FIXED_REGULAR_SINUS_PROFILE_V1_ID,
        heartRateBpm: 75,
      },
    );
    const sourceLoad = source.ventricularIntervalStrengthState
      .normalizedSrLoadState;
    const sourceNext = source.regularAtrialSourceState!.nextActivationTimeSec;
    const rebound = rebindAcceptedComposedRegularSinusStateV2(
      source,
      targetRhythm.configuration,
    );

    expect(rebound.acceptedTimeSec).toBe(source.acceptedTimeSec);
    expect(rebound.revision).toBe(source.revision);
    expect(rebound.ventricularIntervalStrengthState.normalizedSrLoadState)
      .toBe(sourceLoad);
    expect(rebound.ventricularIntervalStrengthState
      .acceptedVentricularCaptureCount)
      .toBe(source.ventricularIntervalStrengthState
        .acceptedVentricularCaptureCount);
    expect(rebound.ventricularIntervalStrengthState.configuration
      .referenceCycleLengthSec).toBe(0.8);
    expect(rebound.ventricularIntervalStrengthState.lastDepositMetadata)
      .toBeNull();
    expect(rebound.regularAtrialSourceState!.nextActivationTimeSec)
      .toBeCloseTo(
        source.acceptedTimeSec
          + (sourceNext - source.acceptedTimeSec) * 0.8,
        12,
      );
    expect(() => validateAcceptedComposedRhythmTransactionBoundaryV2(
      rebound,
    )).not.toThrow();
  });

  it("does not rewrite an accepted calcium deposit across an HR warm rebind", async () => {
    const identity = {
      idPrefix: "pending-calcium-warm-rebind",
      parameterProvenanceSourceId: "pending-calcium-warm-rebind-source",
    } as const;
    const sourceRhythm = createMainWireIntegratedRegularSinusRhythmV3(
      { ...identity, cycleLengthSec: 1 },
      {
        profileId:
          MAIN_WIRE_INTEGRATED_MATCHED_ALPHA_FIXED_REGULAR_SINUS_PROFILE_V1_ID,
        heartRateBpm: 60,
      },
    );
    const source = advanceThroughOwnedBoundaries(sourceRhythm.state, 0.99);
    expect(source.pendingCalciumDeposits).toHaveLength(1);
    const acceptedPendingDeposit = canonicalJsonStringify(
      source.pendingCalciumDeposits,
    );
    const sourceLoad = source.ventricularIntervalStrengthState
      .normalizedSrLoadState;

    const targetRhythm = createMainWireIntegratedRegularSinusRhythmV3(
      { ...identity, cycleLengthSec: 0.8 },
      {
        profileId:
          MAIN_WIRE_INTEGRATED_MATCHED_ALPHA_FIXED_REGULAR_SINUS_PROFILE_V1_ID,
        heartRateBpm: 75,
      },
    );
    const rebound = rebindAcceptedComposedRegularSinusStateV2(
      source,
      targetRhythm.configuration,
    );

    expect(canonicalJsonStringify(rebound.pendingCalciumDeposits))
      .toBe(acceptedPendingDeposit);
    expect(rebound.ventricularIntervalStrengthState.normalizedSrLoadState)
      .toBe(sourceLoad);
    expect(rebound.ventricularIntervalStrengthState.lastDepositMetadata)
      .toBeNull();
    expect(rebound.ventricularIntervalStrengthState
      .acceptedVentricularCaptureCount)
      .toBe(source.ventricularIntervalStrengthState
        .acceptedVentricularCaptureCount);

    const checkpoint =
      await checkpointAcceptedComposedRhythmTransactionStateV2(rebound);
    const restored = await restoreAcceptedComposedRhythmTransactionStateV2(
      JSON.parse(JSON.stringify(checkpoint)),
      targetRhythm.configuration,
    );
    expect(canonicalJsonStringify(restored))
      .toBe(canonicalJsonStringify(rebound));

    const depositTimeSec = rebound.pendingCalciumDeposits[0]!.depositTimeSec;
    const uninterrupted = advanceAt(rebound, depositTimeSec);
    const resumed = advanceAt(restored, depositTimeSec);
    expect(canonicalJsonStringify(resumed))
      .toBe(canonicalJsonStringify(uninterrupted));
    expect(resumed.deliveredCalciumDepositCount)
      .toBe(rebound.deliveredCalciumDepositCount + 1);
    expect(resumed.pendingCalciumDeposits).toEqual([]);
  });

  it("activates the selected fixed profile with exact event timing and one-cycle calcium closure", () => {
    const walls = ["LA", "RA", "LVFW", "SEP", "RVFW"] as const;
    expect(
      MAIN_WIRE_INTEGRATED_MATCHED_ALPHA_FIXED_REGULAR_SINUS_PROFILE_V1_CLAIM
        .aggregateAtrialToVentricularElectricalDelaySec,
    ).toBe(0.12);
    expect(
      MAIN_WIRE_INTEGRATED_MATCHED_ALPHA_FIXED_REGULAR_SINUS_PROFILE_V1_CLAIM
        .initialCalciumState,
    ).toBe("analytic-periodic");
    expect(
      MAIN_WIRE_INTEGRATED_MATCHED_ALPHA_FIXED_REGULAR_SINUS_PROFILE_V1_CLAIM
        .calciumExactPersistenceId,
    ).toBe(
      MAIN_WIRE_VENTRICULAR_CALCIUM_MATCHED_ALPHA_EXACT_PERSISTENCE_V1_ID,
    );
    expect(
      MAIN_WIRE_VENTRICULAR_CALCIUM_MATCHED_ALPHA_EXACT_PERSISTENCE_CLAIM_V1
        .sourceContinuousLawRetainedUnrounded,
    ).toBe(true);

    for (const heartRateBpm of [40, 60, 73.25, 100]) {
      const cycleLengthSec = 60 / heartRateBpm;
      const resolved =
        resolveMainWireVentricularCalciumMatchedAlphaExactPersistenceV1(
          heartRateBpm,
        );
      const rhythm = createMainWireIntegratedRegularSinusRhythmV3(
        {
          idPrefix: `selected-${heartRateBpm}`,
          parameterProvenanceSourceId: "selected-fixed-profile-test",
          cycleLengthSec,
        },
        {
          profileId:
            MAIN_WIRE_INTEGRATED_MATCHED_ALPHA_FIXED_REGULAR_SINUS_PROFILE_V1_ID,
          heartRateBpm,
        },
      );
      const { configuration } = rhythm;

      expect(configuration.avGateParameters.minimumConductionDelaySec)
        .toBe(0.08);
      expect(configuration.distalGate.hvConductionDelaySec).toBe(0.04);
      expect(configuration.sinusAtrialCalciumDeposit
        ?.electricalToCalciumDelaySec).toBe(0.012);
      expect(configuration.ventricularCalciumDeposit
        .electricalToCalciumDelaySec).toBe(0.012);
      expect(configuration.ventricularIntervalStrength.referenceCycleLengthSec)
        .toBe(cycleLengthSec);
      expect(Object.hasOwn(
        configuration.ventricularIntervalStrength,
        "futureExactCalciumDepositPolicy",
      )).toBe(false);
      expect(rhythm.state.regularAtrialSourceState?.nextActivationTimeSec)
        .toBe(cycleLengthSec - 0.132);
      expect(rhythm.state.electricalCaptureState.atrialGate
        .lastCapturedActivationTimeSec).toBe(-0.132);
      expect(rhythm.state.ventricularIntervalStrengthState
        .lastAcceptedVentricularActivation.activationTimeSec).toBe(-0.012);
      expect(rhythm.state.ventricularIntervalStrengthState
        .lastAcceptedVentricularActivation.upstreamCapturedActivationId)
        .toBe(rhythm.state.electricalCaptureState.atrialGate
          .lastCapturedActivationId);
      expect(cycleLengthSec - 0.132).toBeGreaterThan(
        rhythm.state.electricalCaptureState.atrialGate.refractoryUntilSec,
      );
      expect(cycleLengthSec - 0.012).toBeGreaterThan(
        rhythm.state.electricalCaptureState.ventricularGate
          .refractoryUntilSec,
      );

      const atrialTimeSec = cycleLengthSec - 0.132;
      const atrial = evaluateAt(rhythm.state, atrialTimeSec);
      expect(atrial.capturedAtrialActivation?.activationTimeSec)
        .toBe(atrialTimeSec);
      expect(atrial.proximalAvOutputDecision?.proximalAvOutputTimeSec)
        .toBe(cycleLengthSec - 0.052);
      expect(atrial.scheduledCalciumDeposits).toEqual([
        expect.objectContaining({
          depositClass: "sinus-atrial",
          depositTimeSec: cycleLengthSec - 0.12,
        }),
      ]);

      let current = advanceThroughOwnedBoundaries(
        rhythm.state,
        cycleLengthSec - 0.052,
      );
      expect(current.pendingDistalVentricularImpulses[0]?.activationTimeSec)
        .toBe(cycleLengthSec - 0.012);
      const ventricular = evaluateAt(current, cycleLengthSec - 0.012);
      expect(ventricular.capturedVentricularActivation?.activationTimeSec)
        .toBe(cycleLengthSec - 0.012);
      expect(ventricular.ventricularIntervalStrengthCandidate
        ?.depositMetadata.intervalSec).toBe(cycleLengthSec);
      expect(ventricular.ventricularIntervalStrengthCandidate
        ?.depositMetadata.releasedRelativeStrengthR).toBe(1);
      expect(ventricular.ventricularIntervalStrengthCandidate
        ?.depositMetadata.futureExactCalciumDepositRelativeStrength).toBe(1);
      expect(ventricular.scheduledCalciumDeposits).toEqual([
        expect.objectContaining({
          depositClass: "ventricular",
          depositTimeSec: cycleLengthSec,
        }),
      ]);

      current = advanceThroughOwnedBoundaries(current, cycleLengthSec);
      expect(current.acceptedAtrialCaptureCount).toBe(1);
      expect(current.acceptedVentricularCaptureCount).toBe(1);
      expect(current.deliveredCalciumDepositCount).toBe(2);
      expect(current.pendingCalciumDeposits).toEqual([]);
      for (const wall of walls) {
        expect(current.calciumStateByWall[wall][0])
          .toBeCloseTo(rhythm.state.calciumStateByWall[wall][0], 14);
        expect(current.calciumStateByWall[wall][1])
          .toBeCloseTo(rhythm.state.calciumStateByWall[wall][1], 14);
      }

      let sampled = rhythm.state;
      let maximumAbsoluteErrorUM = 0;
      for (const targetTimeSec of [
        0,
        0.137 * cycleLengthSec,
        0.5 * cycleLengthSec,
        0.95 * cycleLengthSec,
        cycleLengthSec,
      ]) {
        sampled = advanceThroughOwnedBoundaries(sampled, targetTimeSec);
        const direct = evaluateFiveWallNormalCalciumDriveV1(
          targetTimeSec + 0.012,
          resolved,
        ).freeCalciumUMByWall;
        for (const wall of walls) {
          const exact = evaluateExactEventCalciumV1(
            sampled.calciumStateByWall[wall],
            configuration.calciumParametersByWall[wall],
          ).freeCalciumUM;
          maximumAbsoluteErrorUM = Math.max(
            maximumAbsoluteErrorUM,
            Math.abs(exact - direct[wall]),
          );
        }
      }
      expect(maximumAbsoluteErrorUM).toBeLessThanOrEqual(3e-12);
    }
  });

  it.each([50, 90] as const)(
    "canonicalizes the %s bpm ventricular calcium deposit onto each exact sinus cycle boundary",
    (heartRateBpm) => {
      const cycleLengthSec = 60 / heartRateBpm;
      const rhythm = createMainWireIntegratedRegularSinusRhythmV3(
        {
          idPrefix: `coincident-cycle-${heartRateBpm}`,
          parameterProvenanceSourceId: "coincident-cycle-regression",
          cycleLengthSec,
        },
        {
          profileId:
            MAIN_WIRE_INTEGRATED_MATCHED_ALPHA_FIXED_REGULAR_SINUS_PROFILE_V1_ID,
          heartRateBpm,
        },
      );

      let completed = rhythm.state;
      for (let cycleOrdinal = 1; cycleOrdinal <= 3; cycleOrdinal += 1) {
        const boundaryTimeSec = cycleOrdinal * cycleLengthSec;
        completed = advanceThroughOwnedBoundaries(completed, boundaryTimeSec);
        expect(completed.acceptedTimeSec).toBe(boundaryTimeSec);
        expect(completed.acceptedAtrialCaptureCount).toBe(cycleOrdinal);
        expect(completed.acceptedVentricularCaptureCount).toBe(cycleOrdinal);
        expect(completed.deliveredCalciumDepositCount).toBe(
          2 * cycleOrdinal,
        );
        expect(completed.pendingCalciumDeposits).toEqual([]);
      }
    },
  );

  it("keeps the fixed-profile calcium queue empty across a dense 40-100 bpm sweep", () => {
    for (let heartRateBpm = 40; heartRateBpm <= 100; heartRateBpm += 1) {
      const cycleLengthSec = 60 / heartRateBpm;
      const rhythm = createMainWireIntegratedRegularSinusRhythmV3(
        {
          idPrefix: `dense-cycle-${heartRateBpm}`,
          parameterProvenanceSourceId: "dense-cycle-regression",
          cycleLengthSec,
        },
        {
          profileId:
            MAIN_WIRE_INTEGRATED_MATCHED_ALPHA_FIXED_REGULAR_SINUS_PROFILE_V1_ID,
          heartRateBpm,
        },
      );
      let completed = rhythm.state;
      for (let cycleOrdinal = 1; cycleOrdinal <= 6; cycleOrdinal += 1) {
        completed = advanceThroughOwnedBoundaries(
          completed,
          cycleOrdinal * cycleLengthSec,
        );
        expect(completed.acceptedAtrialCaptureCount).toBe(cycleOrdinal);
        expect(completed.acceptedVentricularCaptureCount).toBe(cycleOrdinal);
        expect(completed.deliveredCalciumDepositCount).toBe(
          2 * cycleOrdinal,
        );
        expect(completed.pendingCalciumDeposits).toEqual([]);
      }
    }
  });

  it("does not project an authored PAC lineage onto the regular-sinus cycle lattice", () => {
    const { state } = fixture({
      firstRegularTimeSec: 10,
      events: [{
        eventKind: "pac",
        authoredEctopyId: "off-lattice-pac",
        sourceId: "off-lattice-pac-source",
        sourceSequence: 0,
        activationTimeSec: 1.03,
        chamber: "atrial",
        sinusResetPolicy: "preserve",
      }],
    });

    const afterVentricularCapture = advanceThroughOwnedBoundaries(
      state,
      1.1800000000000002,
    );
    expect(afterVentricularCapture.pendingCalciumDeposits).toHaveLength(1);
    expect(afterVentricularCapture.pendingCalciumDeposits[0]).toMatchObject({
      depositClass: "ventricular",
      depositTimeSec: 1.2000000000000002,
    });
    expect(afterVentricularCapture.pendingCalciumDeposits[0]?.depositTimeSec)
      .not.toBe(1.2);
  });

  it("keeps the continuous HR law separate from its exact tau boundary", () => {
    const continuous =
      resolveMainWireVentricularCalciumMatchedAlphaSaturatingHeartRateLawParamsV1(
        60,
      );
    const persisted =
      resolveMainWireVentricularCalciumMatchedAlphaExactPersistenceV1(60);
    expect(continuous.ventricular.riseTimeConstantSec)
      .toBe(0.1234750900275888);
    expect(persisted.ventricular.riseTimeConstantSec)
      .toBe(0.123475090028);
    expect(persisted.cycleLengthSec).toBe(continuous.cycleLengthSec);
    expect(persisted.atrial).toBe(continuous.atrial);
  });

  it("rejects fixed-profile identity, shape, and HR-cycle splits", () => {
    const identity = {
      idPrefix: "selected-profile-validation",
      parameterProvenanceSourceId: "selected-profile-validation-source",
      cycleLengthSec: 1,
    } as const;
    expect(() => createMainWireIntegratedRegularSinusRhythmV3(
      identity,
      {
        profileId:
          MAIN_WIRE_INTEGRATED_MATCHED_ALPHA_FIXED_REGULAR_SINUS_PROFILE_V1_ID,
        heartRateBpm: 60,
        extra: true,
      } as never,
    )).toThrow(/profile keys are invalid/);
    expect(() => createMainWireIntegratedRegularSinusRhythmV3(
      identity,
      { profileId: "wrong-profile", heartRateBpm: 60 } as never,
    )).toThrow(/profile id is invalid/);
    expect(() => createMainWireIntegratedRegularSinusRhythmV3(
      identity,
      {
        profileId:
          MAIN_WIRE_INTEGRATED_MATCHED_ALPHA_FIXED_REGULAR_SINUS_PROFILE_V1_ID,
        heartRateBpm: 75,
      },
    )).toThrow(/heart rate and cycle split/);
  });

  it("rejects state A's candidate against state B's rhythm configuration in the lean tier", () => {
    const a = fixture({ firstRegularTimeSec: 10 });
    const b = fixture({
      firstRegularTimeSec: 10,
      lvfwCalciumGainUMPerUnitDrive: 1.125,
    });
    const candidateFromA = evaluateAt(a.state, 0.1);

    expect(b.configuration.configurationId)
      .toBe(a.configuration.configurationId);
    expect(
      b.configuration.calciumParametersByWall.LVFW
        .calciumGainUMPerUnitDrive,
    ).not.toBe(
      a.configuration.calciumParametersByWall.LVFW
        .calciumGainUMPerUnitDrive,
    );
    withHotPathIntegrityTierV1("hot-path-lean", () => {
      expect(() =>
        commitAcceptedComposedRhythmTransactionCandidateV2(
          b.state,
          candidateFromA,
        )).toThrow(/candidate does not match its accepted base/);
    });
  });

  it("retains complete candidate recomputation when validation stamps are disabled in the lean tier", () => {
    const previousStampMode = validationStampModeV1();
    selectValidationStampModeV1("validation-stamps-disabled");
    try {
      withHotPathIntegrityTierV1("hot-path-lean", () => {
        const a = fixture({ firstRegularTimeSec: 10 });
        const b = fixture({
          firstRegularTimeSec: 10,
          lvfwCalciumGainUMPerUnitDrive: 1.125,
        });
        const candidateFromA = evaluateAt(a.state, 0.1);

        expect(
          commitAcceptedComposedRhythmTransactionCandidateV2(
            a.state,
            candidateFromA,
          ),
        ).toEqual(candidateFromA.candidateState);
        expect(() =>
          commitAcceptedComposedRhythmTransactionCandidateV2(
            b.state,
            candidateFromA,
          )).toThrow(/candidate does not match its accepted base/);
      });
    } finally {
      selectValidationStampModeV1(previousStampMode);
    }
    expect(validationStampModeV1()).toBe(previousStampMode);
  });

  it("reuses a restored immutable state proof only after complete boundary validation", async () => {
    const { configuration, state } = fixture({ firstRegularTimeSec: 10 });
    const checkpoint = await checkpointAcceptedComposedRhythmTransactionStateV2(
      state,
    );
    const restored = await restoreAcceptedComposedRhythmTransactionStateV2(
      JSON.parse(JSON.stringify(checkpoint)),
      configuration,
    );

    withHotPathIntegrityTierV1("hot-path-lean", () => {
      const candidate = evaluateAt(restored, 0.1);
      expect(
        commitAcceptedComposedRhythmTransactionCandidateV2(
          restored,
          candidate,
        ),
      ).toBe(candidate.candidateState);
    });
  });

  it("reuses the fixed proximal AV conversion while retaining full state validation", () => {
    const mode = validationStampModeV1();
    const { state } = fixture({ firstRegularTimeSec: 10 });
    const conversion = vi.spyOn(proximalAv, "createRecoveryConcealmentAvGateConfigurationV2");
    try {
      selectValidationStampModeV1("validation-stamps-enabled");
      validateAcceptedComposedRhythmTransactionStateV2(state);
      validateAcceptedComposedRhythmTransactionStateV2(Object.freeze({ ...state }));
      expect(conversion).not.toHaveBeenCalled();
      expect(() => validateAcceptedComposedRhythmTransactionStateV2(Object.freeze({
        ...state, proximalAvGateState: Object.freeze({ ...state.proximalAvGateState,
          configuration: Object.freeze({ ...state.proximalAvGateState.configuration,
            proximalAvOwnerInstanceId: "different-owner" }) }),
      }))).toThrow(/proximal AV V2 configuration split/);
      selectValidationStampModeV1("validation-stamps-disabled");
      validateAcceptedComposedRhythmTransactionStateV2(state);
      expect(conversion).toHaveBeenCalled();
    } finally {
      conversion.mockRestore();
      selectValidationStampModeV1(mode);
    }
  });

  it("never stamps an outer-frozen state with mutable descendants", () => {
    const original = fixture({ firstRegularTimeSec: 10 }).state;
    const mutableLvfwCalcium = [
      ...original.calciumStateByWall.LVFW,
    ] as [number, number];
    const mutable = Object.freeze({
      ...original,
      calciumStateByWall: {
        ...original.calciumStateByWall,
        LVFW: mutableLvfwCalcium,
      },
    }) as unknown as {
      calciumStateByWall: { LVFW: [number, number] };
    } & AcceptedComposedRhythmTransactionStateV2;

    validateAcceptedComposedRhythmTransactionBoundaryV2(mutable);
    mutable.calciumStateByWall.LVFW[0] = Number.NaN;

    expect(() =>
      validateAcceptedComposedRhythmTransactionBoundaryV2(mutable)
    ).toThrow(/state\[0\] must be nonnegative and finite/);
  });

  it("returns the exact owned endpoint without exposing a re-addable duration", () => {
    const { state } = fixture({
      acceptedTimeSec: 1.8571428571428572,
      priorVentricularTimeSec: 1.333333333333333,
      firstRegularTimeSec: 10,
      escapeCycleSec: 5,
      vviIntervalSec: 20,
    });
    const limited = limitAcceptedComposedRhythmTransactionCandidateTimeV2(
      state,
      7,
      null,
    );
    const derivedDuration =
      limited.candidateTimeSec - state.acceptedTimeSec;

    expect(limited.candidateTimeSec).toBe(6.333333333333333);
    expect(state.acceptedTimeSec + derivedDuration)
      .toBe(6.333333333333334);
    expect(limited).not.toHaveProperty("maximumStepSec");
    expect(limited.boundaryOwners).toEqual(["ventricular-backup"]);
    expect(() => evaluateAt(state, limited.candidateTimeSec)).not.toThrow();
  });

  it("arbitrates a simultaneous PAC before sinus and applies reset only after PAC capture", () => {
    const { state } = fixture({
      events: [{
        eventKind: "pac", authoredEctopyId: "pac-1", sourceId: "pac-source",
        sourceSequence: 0, activationTimeSec: 1, chamber: "atrial",
        sinusResetPolicy: "reset",
      }],
    });
    const candidate = evaluateAt(state, 1);
    expect(candidate.nonVviSourceImpulses).toHaveLength(2);
    expect(candidate.capturedAtrialActivation?.sourceKind).toBe("authored-ectopy");
    expect(candidate.pacSinusClockPolicyApplied).toBe("reset");
    expect(candidate.regularAtrialSourceCandidate?.candidateState.nextActivationTimeSec).toBe(2);
    expect(candidate.acceptedCaptureCandidate.decisions.find((decision) =>
      decision.sourceId === "sinus-source")?.outcome).toBe("coincident-suppressed");
    expect(candidate.scheduledCalciumDeposits.map((deposit) => deposit.depositClass)).toEqual(["pac-atrial"]);
  });

  it("does not feed refractory-blocked atrial candidates into AV or PAC clock reset", () => {
    const { state } = fixture({
      acceptedTimeSec: 1,
      firstRegularTimeSec: 1.1,
      atrialPriorTimeSec: 0.95,
      atrialRefractorySec: 0.2,
      events: [{
        eventKind: "pac", authoredEctopyId: "pac-blocked", sourceId: "pac-source",
        sourceSequence: 0, activationTimeSec: 1.1, chamber: "atrial",
        sinusResetPolicy: "reset",
      }],
    });
    const candidate = evaluateAt(state, 1.1);
    expect(candidate.capturedAtrialActivation).toBeNull();
    expect(candidate.pacSinusClockPolicyApplied).toBeNull();
    expect(candidate.proximalAvOutputDecision).toBeNull();
    expect(candidate.scheduledCalciumDeposits).toEqual([]);
    expect(candidate.regularAtrialSourceCandidate?.candidateState.nextActivationTimeSec).toBe(2.1);
  });

  it("clips and preserves the AV-to-proximal-to-distal-to-ventricular queue chain", () => {
    const { state } = fixture();
    const atrialCandidate = evaluateAt(state, 1);
    expect(
      atrialCandidate.proximalAvOutputDecision?.proximalAvOutputTimeSec,
    ).toBe(1.1);
    expect(
      atrialCandidate.proximalAvOutputDecision?.conductionDelaySec,
    ).toBe(0.1);
    const atOne = commitAcceptedComposedRhythmTransactionCandidateV2(
      state,
      atrialCandidate,
    );
    expect(atOne.proximalAvGateState.stateSchemaId)
      .toBe(RECOVERY_CONCEALMENT_AV_GATE_STATE_V2_ID);
    expect(atOne.proximalAvGateState.acceptedAtrialActivationTimeSec).toBe(1);
    expect(atOne.proximalAvGateState.lastProximalAvOutputTimeSec).toBe(1.1);
    expect(atOne.proximalAvGateState)
      .not.toHaveProperty("acceptedProximalOwnerTimeSec");
    expect(atOne.proximalAvGateState)
      .not.toHaveProperty("lastVentricularActivationTimeSec");
    expect(ACCEPTED_COMPOSED_RHYTHM_TRANSACTION_CLAIM_V2
      .proximalAvGateV2Ownership.directAcceptedStateOwned).toBe(true);
    expect(canonicalJsonStringify(
      ACCEPTED_COMPOSED_RHYTHM_TRANSACTION_CLAIM_V2,
    )).not.toContain("legacyAvGate");
    expect(atOne.pendingProximalAvOutputs[0]?.proximalArrivalTimeSec).toBe(1.1);
    const calciumBoundary =
      limitAcceptedComposedRhythmTransactionCandidateTimeV2(
        atOne,
        2,
        null,
      );
    expect(calciumBoundary.candidateTimeSec).toBe(1.02);
    const atCalcium = advanceAt(atOne, 1.02);
    const proximalBoundary =
      limitAcceptedComposedRhythmTransactionCandidateTimeV2(
        atCalcium,
        2,
        null,
      );
    expect(proximalBoundary.candidateTimeSec).toBe(1.1);
    const proximalCandidate = evaluateAt(atCalcium, 1.1);
    expect(proximalCandidate.distalGateDecisions[0]?.passed).toBe(true);
    expect(proximalCandidate.candidateState.pendingDistalVentricularImpulses[0]?.activationTimeSec).toBeCloseTo(1.15, 14);
    expect(
      proximalCandidate.candidateState.pendingDistalVentricularImpulses[0]!
        .activationTimeSec
        - proximalCandidate.dueProximalAvOutputs[0]!.proximalArrivalTimeSec,
    ).toBeCloseTo(0.05, 14);
    expect(
      proximalCandidate.candidateState.pendingDistalVentricularImpulses[0]!
        .activationTimeSec - 1,
    ).toBeCloseTo(0.15, 14);
    const atProximal = commitAcceptedComposedRhythmTransactionCandidateV2(atCalcium, proximalCandidate);
    const ventricularTime = atProximal.pendingDistalVentricularImpulses[0]!
      .activationTimeSec;
    const ventricularCandidate = evaluateAt(atProximal, ventricularTime);
    expect(ventricularCandidate.capturedVentricularActivation?.sourceKind).toBe("av-output");
    expect(ventricularCandidate.ventricularIntervalStrengthCandidate).not.toBeNull();
    expect(ventricularCandidate.scheduledCalciumDeposits[0]?.depositTimeSec).toBeCloseTo(1.17, 14);
  });

  it("allows intrinsic escape before VVI and conditional VVI only when no non-VVI capture exists", () => {
    const escapeFixture = fixture({ firstRegularTimeSec: 0.1, escapeCycleSec: 0.4, vviIntervalSec: 0.5, distalMode: { mode: "disconnect" } });
    let escapeState = advanceAt(escapeFixture.state, 0.1);
    for (let index = 0; index < 2; index += 1) {
      const boundary = limitAcceptedComposedRhythmTransactionCandidateTimeV2(
        escapeState,
        escapeState.acceptedTimeSec + 1,
        null,
      );
      escapeState = advanceAt(escapeState, boundary.candidateTimeSec);
    }
    expect(escapeState.distalGateState.disconnectedDropCount).toBe(1);
    const escape = evaluateAt(escapeState, 0.4);
    expect(escape.capturedVentricularActivation?.sourceKind).toBe("escape");
    expect(escape.conditionalVviAttempted).toBe(false);

    const vviFixture = fixture({ firstRegularTimeSec: 0.1, escapeCycleSec: 0.8, vviIntervalSec: 0.5, distalMode: { mode: "disconnect" } });
    let vviState = advanceAt(vviFixture.state, 0.1);
    for (let index = 0; index < 2; index += 1) {
      const boundary = limitAcceptedComposedRhythmTransactionCandidateTimeV2(
        vviState,
        vviState.acceptedTimeSec + 1,
        null,
      );
      vviState = advanceAt(vviState, boundary.candidateTimeSec);
    }
    expect(vviState.distalGateState.disconnectedDropCount).toBe(1);
    const vvi = evaluateAt(vviState, 0.5);
    expect(vvi.nonVviCapturePreview.capturedActivations).toEqual([]);
    expect(vvi.conditionalVviAttempted).toBe(true);
    expect(vvi.capturedVentricularActivation?.sourceKind).toBe("pacing");
    expect(vvi.ventricularBackupResolution.acceptedCapturePhase).toBe("conditional-vvi");
    expect(vvi.nonVviCapturePreview.baseRevision).toBe(
      vvi.acceptedCaptureCandidate.baseRevision,
    );
    const committedVvi = commitAcceptedComposedRhythmTransactionCandidateV2(
      vviState,
      vvi,
    );
    expect(committedVvi.electricalCaptureState.acceptedImpulseBatchCount).toBe(
      vviState.electricalCaptureState.acceptedImpulseBatchCount + 1,
    );
    expect(committedVvi.ventricularBackupState.vviPacingAttemptCount).toBe(1);
    expect(committedVvi.acceptedVentricularCaptureCount).toBe(1);
  });

  it("keeps PVC timing out of the sinus clock and carries weak then recovered interval strength", () => {
    const { state } = fixture({
      events: [{
        eventKind: "pvc", authoredEctopyId: "pvc-1", sourceId: "pvc-source",
        sourceSequence: 0, activationTimeSec: 0.3, chamber: "ventricular",
      }],
    });
    const pvc = evaluateAt(state, 0.3);
    const pvcStrength = pvc.ventricularIntervalStrengthCandidate!.depositMetadata.futureExactCalciumDepositRelativeStrength;
    expect(pvcStrength).toBeLessThan(1);
    expect(pvc.regularAtrialSourceCandidate?.candidateState.nextActivationTimeSec).toBe(1);
    let current = commitAcceptedComposedRhythmTransactionCandidateV2(state, pvc);
    for (const time of [0.32, 1, 1.02, 1.1]) current = advanceAt(current, time);
    const postPvc = evaluateAt(
      current,
      current.pendingDistalVentricularImpulses[0]!.activationTimeSec,
    );
    const postStrength = postPvc.ventricularIntervalStrengthCandidate!.depositMetadata.futureExactCalciumDepositRelativeStrength;
    expect(postStrength).toBeGreaterThan(pvcStrength);
    expect(postPvc.capturedVentricularActivation?.sourceKind).toBe("av-output");
  });

  it("owns typed ventricular pacing replay without relabeling it as PVC or bypassing capture and VVI arbitration", () => {
    const pacingReplayEvents = [
      {
        pacingEventId: "irregular-pacing-0",
        sourceSequence: 0,
        activationTimeSec: 0.4,
      },
      {
        pacingEventId: "irregular-pacing-1",
        sourceSequence: 1,
        activationTimeSec: 1,
      },
      {
        pacingEventId: "irregular-pacing-2",
        sourceSequence: 2,
        activationTimeSec: 1.4,
      },
    ] as const;
    const { state } = fixture({
      firstRegularTimeSec: 10,
      pacingReplayEvents,
    });

    const maximum = limitAcceptedComposedRhythmTransactionCandidateTimeV2(
      state,
      1,
      null,
    );
    expect(maximum.candidateTimeSec).toBe(0.4);
    expect(maximum.boundaryOwners).toEqual([
      "authored-ventricular-pacing-replay",
    ]);

    const candidate = evaluateAt(state, 0.4);
    const replayImpulse = candidate.authoredVentricularPacingReplayTrial
      ?.sourceImpulses[0];
    expect(replayImpulse?.sourceKind).toBe("pacing");
    expect(replayImpulse?.chamber).toBe("ventricular");
    expect(candidate.authoredEctopyTrial.sourceImpulses).toEqual([]);
    expect(candidate.nonVviSourceImpulses).toContainEqual(replayImpulse);
    expect(candidate.capturedVentricularActivation?.parentSourceImpulseId)
      .toBe(replayImpulse?.sourceImpulseId);
    expect(candidate.conditionalVviAttempted).toBe(false);
    expect(candidate.scheduledCalciumDeposits.map((deposit) =>
      deposit.depositClass)).toEqual(["ventricular"]);
    expect(ACCEPTED_COMPOSED_RHYTHM_TRANSACTION_CLAIM_V2
      .authoredVentricularPacingReplay.pvcLabelClaimed).toBe(false);
    expect(ACCEPTED_COMPOSED_RHYTHM_TRANSACTION_CLAIM_V2
      .authoredVentricularPacingReplay.pacemakerPhysiologyClaimed).toBe(false);
    expect(ACCEPTED_COMPOSED_RHYTHM_TRANSACTION_CLAIM_V2
      .authoredVentricularPacingReplay.clark1997ReproductionClaimed)
      .toBe(false);
    expect(rollbackAcceptedComposedRhythmTransactionCandidateV2(
      state,
      candidate,
    )).toBe(state);

    const committed = commitAcceptedComposedRhythmTransactionCandidateV2(
      state,
      candidate,
    );
    expect(committed.authoredVentricularPacingReplayState?.cursor).toBe(1);
    expect(committed.authoredVentricularPacingReplayState?.revision)
      .toBe(committed.revision);
  });

  it("delegates authored pacing refractory, escape priority, and conditional-VVI inhibition to existing owners", () => {
    const collision = fixture({
      firstRegularTimeSec: 10,
      escapeCycleSec: 0.8,
      vviIntervalSec: 0.8,
      pacingReplayEvents: [{
        pacingEventId: "simultaneous-authored-pacing",
        sourceSequence: 0,
        activationTimeSec: 0.8,
      }],
    });
    const collisionCandidate = evaluateAt(collision.state, 0.8);
    expect(collisionCandidate.capturedVentricularActivation?.sourceKind)
      .toBe("escape");
    expect(collisionCandidate.acceptedCaptureCandidate.decisions.find(
      (decision) => decision.sourceId
        === "authored-ventricular-pacing-source",
    )?.outcome).toBe("coincident-suppressed");
    expect(collisionCandidate.conditionalVviAttempted).toBe(false);
    expect(collisionCandidate.ventricularBackupResolution.acceptedCapturePhase)
      .toBe("non-vvi");
    expect(collisionCandidate.ventricularBackupResolution.sourceAttemptResults)
      .toEqual([expect.objectContaining({
        sourceKind: "escape",
        outcome: "captured",
      })]);

    const refractory = fixture({
      firstRegularTimeSec: 10,
      pacingReplayEvents: [{
        pacingEventId: "refractory-authored-pacing",
        sourceSequence: 0,
        activationTimeSec: 0.1,
      }],
    });
    const refractoryCandidate = evaluateAt(refractory.state, 0.1);
    expect(refractoryCandidate.capturedVentricularActivation).toBeNull();
    expect(refractoryCandidate.acceptedCaptureCandidate.decisions[0]?.outcome)
      .toBe("refractory-blocked");
    expect(refractoryCandidate.ventricularBackupCandidate.candidateState
      .acceptedVentricularCaptureFeedbackCount).toBe(0);
  });

  it("preserves null replay behavior and exact-resumes a complete nested pacing owner checkpoint", async () => {
    const withoutReplay = fixture({ firstRegularTimeSec: 10 });
    const inertCandidate = evaluateAt(withoutReplay.state, 0.4);
    expect(withoutReplay.state.authoredVentricularPacingReplayState).toBeNull();
    expect(inertCandidate.authoredVentricularPacingReplayTrial).toBeNull();
    expect(inertCandidate.nonVviSourceImpulses).toEqual([]);

    const pacingReplayEvents = [
      {
        pacingEventId: "matched-mean-irregular-0",
        sourceSequence: 0,
        activationTimeSec: 0.4,
      },
      {
        pacingEventId: "matched-mean-irregular-1",
        sourceSequence: 1,
        activationTimeSec: 1,
      },
      {
        pacingEventId: "matched-mean-irregular-2",
        sourceSequence: 2,
        activationTimeSec: 1.4,
      },
    ] as const;
    const replay = fixture({
      firstRegularTimeSec: 10,
      pacingReplayEvents,
    });
    const accepted = advanceAt(replay.state, 0.4);
    const checkpoint =
      await checkpointAcceptedComposedRhythmTransactionStateV2(accepted);
    expect(checkpoint.authoredVentricularPacingReplay?.cursor).toBe(1);
    expect(checkpoint.authoredVentricularPacingReplay?.acceptedState.cursor)
      .toBe(1);
    expect(checkpoint).not.toHaveProperty("exactResumeClaim");
    expect(checkpoint.authoredVentricularPacingReplay)
      .not.toHaveProperty("exactResumeClaim");

    const restored = await restoreAcceptedComposedRhythmTransactionStateV2(
      JSON.parse(JSON.stringify(checkpoint)),
      replay.configuration,
    );
    const depositTimeSec = accepted.pendingCalciumDeposits[0]!.depositTimeSec;
    const uninterruptedAfterDeposit = advanceAt(accepted, depositTimeSec);
    const resumedAfterDeposit = advanceAt(restored, depositTimeSec);
    expect(canonicalJsonStringify(resumedAfterDeposit))
      .toBe(canonicalJsonStringify(uninterruptedAfterDeposit));
    expect(limitAcceptedComposedRhythmTransactionCandidateTimeV2(
      resumedAfterDeposit,
      resumedAfterDeposit.acceptedTimeSec + 1,
      null,
    ).boundaryOwners).toEqual(["authored-ventricular-pacing-replay"]);
    const uninterrupted = advanceAt(uninterruptedAfterDeposit, 1);
    const resumed = advanceAt(resumedAfterDeposit, 1);
    expect(canonicalJsonStringify(resumed))
      .toBe(canonicalJsonStringify(uninterrupted));
    expect(resumed.authoredVentricularPacingReplayState?.cursor).toBe(2);

    const nestedTamper = JSON.parse(JSON.stringify(checkpoint));
    nestedTamper.authoredVentricularPacingReplay.acceptedState.cursor = 0;
    const { checkpointSha256: _oldOuterSha, ...outerPayload } = nestedTamper;
    nestedTamper.checkpointSha256 = await sha256CanonicalJsonHex(outerPayload);
    await expect(restoreAcceptedComposedRhythmTransactionStateV2(
      nestedTamper,
      replay.configuration,
    )).rejects.toThrow(/pacing replay checkpoint SHA-256 mismatch/);

    const substituted = fixture({
      firstRegularTimeSec: 10,
      pacingReplayEvents: [
        pacingReplayEvents[0],
        { ...pacingReplayEvents[1], activationTimeSec: 1.1 },
        { ...pacingReplayEvents[2], activationTimeSec: 1.5 },
      ],
    });
    expect(substituted.configuration.configurationId)
      .toBe(replay.configuration.configurationId);
    await expect(restoreAcceptedComposedRhythmTransactionStateV2(
      checkpoint,
      substituted.configuration,
    )).rejects.toThrow(/expected configuration mismatch/);
  });

  it("checkpoints and resumes pending electrical and calcium queues exactly", async () => {
    const { configuration, state } = fixture();
    let current = advanceAt(state, 1);
    current = advanceAt(current, 1.02);
    const checkpoint = await checkpointAcceptedComposedRhythmTransactionStateV2(current);
    expect(checkpoint.acceptedState.proximalAvGateState.stateSchemaId)
      .toBe(RECOVERY_CONCEALMENT_AV_GATE_STATE_V2_ID);
    expect(checkpoint).not.toHaveProperty("exactResumeClaim");
    expect(canonicalJsonStringify(current)).not.toContain(
      '"lastVentricularActivationTimeSec":',
    );
    expect(canonicalJsonStringify(checkpoint)).not.toContain(
      '"lastVentricularActivationTimeSec":',
    );
    expect(canonicalJsonStringify(checkpoint)).not.toContain(
      '"acceptedProximalOwnerTimeSec":',
    );
    const restored = await restoreAcceptedComposedRhythmTransactionStateV2(
      JSON.parse(JSON.stringify(checkpoint)),
      configuration,
    );
    const uninterrupted = advanceAt(current, 1.1);
    const resumed = advanceAt(restored, 1.1);
    expect(canonicalJsonStringify(resumed)).toBe(canonicalJsonStringify(uninterrupted));
    const tampered = JSON.parse(JSON.stringify(checkpoint));
    tampered.acceptedState.acceptedTimeSec = 1.03;
    await expect(restoreAcceptedComposedRhythmTransactionStateV2(tampered, configuration)).rejects.toThrow("SHA-256 mismatch");
  });

  it("accepts the typed external AF source seam but fail-closes coordinated atrial calcium", () => {
    const { state } = fixture({ sourceMode: "external-af" });
    const impulse = createSourceImpulseV2({
      sourceImpulseId: "af-impulse-0",
      parentCapturedActivationId: null,
      chamber: "atrial",
      sourceKind: "primary-intrinsic",
      sourceId: "af-source",
      sourceSequence: 0,
      activationTimeSec: 0.5,
    });
    const candidate = evaluateAcceptedComposedRhythmTransactionCandidateV2(state, {
      candidateTimeSec: 0.5,
      externalAtrialSourceBatch: Object.freeze({
        sourceClass: "atrial-fibrillation",
        ownerInstanceId: "af-owner",
        candidateTimeSec: 0.5,
        sourceImpulses: Object.freeze([impulse]),
        coordinatedAtrialCalcium: "forbidden",
      }),
    });
    expect(candidate.capturedAtrialActivation?.parentSourceImpulseId).toBe("af-impulse-0");
    expect(candidate.scheduledCalciumDeposits.filter((deposit) => deposit.depositClass !== "ventricular")).toEqual([]);
    expect(candidate.candidateState.regularAtrialSourceState).toBeNull();
  });

  it("routes regular flutter captures through AV but never emits coordinated flutter atrial calcium", () => {
    const { state } = fixture({ regularRhythmClass: "flutter" });
    const candidate = evaluateAt(state, 1);
    expect(candidate.capturedAtrialActivation?.sourceKind).toBe(
      "primary-intrinsic",
    );
    expect(candidate.proximalAvOutputDecision?.conducted).toBe(true);
    expect(candidate.scheduledCalciumDeposits).toEqual([]);
  });
});

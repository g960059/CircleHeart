import type { MainWireIntegratedModelStepSuccessV3 } from "@/engine/myocardium/MainWireIntegratedModelTransactionV3";
import type { MainWireNormalAdultFiveWallMechanicsStateV1 } from "@/engine/myocardium/experiments/MainWireNormalAdultFiveWallClosedLoopV1";
import {
  MAIN_WIRE_FIVE_WALL_ACCEPTED_NUMERICAL_READBACK_COUNT_V1,
  MAIN_WIRE_FIVE_WALL_ACCEPTED_NUMERICAL_READBACK_LAYOUT_V1,
} from "@/engine/myocardium/MainWireFiveWallCoronaryTransactionV2";

type SuccessfulStep =
  MainWireIntegratedModelStepSuccessV3<MainWireNormalAdultFiveWallMechanicsStateV1>;

export const MAIN_WIRE_INTEGRATED_MODEL_BEAT_METRICS_V3_ID =
  "main-wire-integrated-model-accepted-step-beat-metrics-v4" as const;
export const MAIN_WIRE_INTEGRATED_MODEL_BEAT_ACCUMULATOR_CHECKPOINT_V3_ID =
  "main-wire-integrated-model-beat-accumulator-checkpoint-v4" as const;

export const MAIN_WIRE_INTEGRATED_MODEL_BEAT_PRESSURE_NODE_IDS_V3 =
  Object.freeze([
    "LA",
    "LV",
    "RA",
    "RV",
    "Ao",
    "SA",
    "PA",
    "PVein",
    "VC",
  ] as const);
export type MainWireIntegratedModelBeatPressureNodeIdV3 =
  (typeof MAIN_WIRE_INTEGRATED_MODEL_BEAT_PRESSURE_NODE_IDS_V3)[number];

export const MAIN_WIRE_INTEGRATED_MODEL_BEAT_VALVE_IDS_V3 = Object.freeze([
  "MV",
  "AoV",
  "TV",
  "PV",
] as const);
export type MainWireIntegratedModelBeatValveIdV3 =
  (typeof MAIN_WIRE_INTEGRATED_MODEL_BEAT_VALVE_IDS_V3)[number];

export type MainWireIntegratedModelPressureVolumeLandmarkV3 = Readonly<{
  volumeMl: number;
  pressureMmHg: number;
  event:
    "maximum-volume" | "semilunar-valve-closure" | "minimum-volume-fallback";
}>;

export type MainWireIntegratedModelVentricularPressureVolumeLandmarksV3 =
  Readonly<{
    pressureBasis: "transmural";
    endDiastolic: MainWireIntegratedModelPressureVolumeLandmarkV3 &
      Readonly<{ event: "maximum-volume" }>;
    endSystolic: MainWireIntegratedModelPressureVolumeLandmarkV3 &
      Readonly<{
        event: "semilunar-valve-closure" | "minimum-volume-fallback";
      }>;
  }>;

export type MainWireIntegratedModelValveClosureLandmarkV3 = Readonly<{
  event: "valve-closure-zero-flow-crossing";
  valveId: MainWireIntegratedModelBeatValveIdV3;
  timeSec: number;
  volumeMl: number;
  absolutePressureMmHg: number;
  transmuralPressureMmHg: number;
}>;

export type MainWireIntegratedModelVentricularValveEventMetricsV3 = Readonly<{
  pressureBasis: "absolute-and-transmural";
  inletValveId: "MV" | "TV";
  semilunarValveId: "AoV" | "PV";
  endDiastolic: MainWireIntegratedModelValveClosureLandmarkV3 | null;
  endSystolic: MainWireIntegratedModelValveClosureLandmarkV3 | null;
  eventDefinedStrokeVolumeMl: number | null;
  eventDefinedEjectionFraction01: number | null;
}>;

export type MainWireIntegratedModelValveFlowVolumesV3 = Readonly<{
  forwardVolumeMl: number;
  reverseVolumeMl: number;
  netVolumeMl: number;
  /** Reverse/forward for the same valve; unavailable without forward flow. */
  sameValveRegurgitantFraction: number | null;
}>;

/** Direct time-domain summary of one model pressure node over a completed beat. */
export type MainWireIntegratedModelBeatPressureSummaryV3 = Readonly<{
  timeWeightedMeanMmHg: number;
  maximumMmHg: number;
  minimumMmHg: number;
  pulseMmHg: number;
}>;

/**
 * Upstream-minus-downstream hydraulic pressure difference, evaluated only
 * over the linearly interpolated interval in which the model valve flow is
 * forward. This is not a Doppler/Bernoulli pressure-gradient estimate.
 */
export type MainWireIntegratedModelValveForwardPressureGradientV3 = Readonly<{
  basis: "upstream-minus-downstream-absolute-pressure-during-forward-flow";
  forwardFlowDurationSec: number;
  timeWeightedMeanMmHg: number | null;
  peakMmHg: number | null;
}>;

export type MainWireIntegratedModelCompletedBeatMetricsV3 = Readonly<{
  metricsId: typeof MAIN_WIRE_INTEGRATED_MODEL_BEAT_METRICS_V3_ID;
  startAtrialCaptureId: string;
  endAtrialCaptureId: string;
  startTimeSec: number;
  endTimeSec: number;
  durationSec: number;
  pressureSummaries: Readonly<
    Record<
      MainWireIntegratedModelBeatPressureNodeIdV3,
      MainWireIntegratedModelBeatPressureSummaryV3
    >
  >;
  meanAorticPressureMmHg: number;
  systolicAorticPressureMmHg: number;
  diastolicAorticPressureMmHg: number;
  pulseAorticPressureMmHg: number;
  meanPulmonaryArterialPressureMmHg: number;
  meanLeftAtrialPressureMmHg: number;
  meanRightAtrialPressureMmHg: number;
  maximumLeftVentricularVolumeMl: number;
  minimumLeftVentricularVolumeMl: number;
  leftVentricularPressureVolumeLandmarks: MainWireIntegratedModelVentricularPressureVolumeLandmarksV3;
  rightVentricularPressureVolumeLandmarks: MainWireIntegratedModelVentricularPressureVolumeLandmarksV3;
  leftVentricularValveEventMetrics: MainWireIntegratedModelVentricularValveEventMetricsV3;
  rightVentricularValveEventMetrics: MainWireIntegratedModelVentricularValveEventMetricsV3;
  valveFlowVolumes: Readonly<
    Record<
      MainWireIntegratedModelBeatValveIdV3,
      MainWireIntegratedModelValveFlowVolumesV3
    >
  >;
  valveForwardPressureGradients: Readonly<
    Record<
      MainWireIntegratedModelBeatValveIdV3,
      MainWireIntegratedModelValveForwardPressureGradientV3
    >
  >;
  extremaLeftVentricularStrokeVolumeMl: number;
  extremaLeftVentricularEjectionFraction01: number;
  /**
   * Negative signed line integral of transmural LV pressure against LV volume
   * over the accepted capture-to-capture path. It is positive for the usual
   * counter-clockwise loop orientation. No synthetic end-to-start closing
   * segment is added, so a transient non-closing path is not silently turned
   * into a closed-loop stroke-work estimate.
   */
  leftVentricularTransmuralPressureVolumePathWorkMmHgMl: number;
  rightVentricularTransmuralPressureVolumePathWorkMmHgMl: number;
  ventricularAbsolutePressureRateExtrema: Readonly<
    Record<
      "LV" | "RV",
      Readonly<{ maximumMmHgPerSec: number; minimumMmHgPerSec: number }>
    >
  >;
  nativeLeftCardiacOutputLPerMin: number;
  nativeRightCardiacOutputLPerMin: number;
  effectiveNativeLeftCardiacOutputLPerMin: number;
  effectiveNativeRightCardiacOutputLPerMin: number;
  systemicVenousReturnLPerMin: number;
  pulmonaryVenousReturnLPerMin: number;
  systemicTissueOutputLPerMin: number;
  pulmonaryOutputLPerMin: number;
}>;

export type MainWireIntegratedModelAcceptedBeatSampleV3 = Readonly<{
  timeSec: number;
  systemicArterialPressureMmHg: number;
  pulmonaryVenousPressureMmHg: number;
  venaCavaPressureMmHg: number;
  aorticPressureMmHg: number;
  pulmonaryArterialPressureMmHg: number;
  leftAtrialPressureMmHg: number;
  rightAtrialPressureMmHg: number;
  leftVentricularAbsolutePressureMmHg: number;
  rightVentricularAbsolutePressureMmHg: number;
  leftVentricularVolumeMl: number;
  rightVentricularVolumeMl: number;
  leftVentricularTransmuralPressureMmHg: number;
  rightVentricularTransmuralPressureMmHg: number;
  mitralValveFlowMlPerSec: number;
  aorticValveFlowMlPerSec: number;
  tricuspidValveFlowMlPerSec: number;
  pulmonaryValveFlowMlPerSec: number;
  systemicVenousReturnMlPerSec: number;
  pulmonaryVenousReturnMlPerSec: number;
  systemicTissueFlowMlPerSec: number;
  pulmonaryFlowMlPerSec: number;
}>;

type ActiveBeatV3 = {
  startAtrialCaptureId: string;
  startTimeSec: number;
  previous: MainWireIntegratedModelAcceptedBeatSampleV3;
  pressureSummaryAccumulators: Record<
    MainWireIntegratedModelBeatPressureNodeIdV3,
    { integralMmHgSec: number; maximumMmHg: number; minimumMmHg: number }
  >;
  aorticPressureIntegralMmHgSec: number;
  pulmonaryArterialPressureIntegralMmHgSec: number;
  leftAtrialPressureIntegralMmHgSec: number;
  rightAtrialPressureIntegralMmHgSec: number;
  leftVentricularTransmuralPressureVolumePathIntegralMmHgMl: number;
  rightVentricularTransmuralPressureVolumePathIntegralMmHgMl: number;
  ventricularAbsolutePressureRateExtrema: Record<
    "LV" | "RV",
    { maximumMmHgPerSec: number | null; minimumMmHgPerSec: number | null }
  >;
  valveFlowVolumes: Record<
    MainWireIntegratedModelBeatValveIdV3,
    { forwardVolumeMl: number; reverseVolumeMl: number }
  >;
  valveForwardPressureGradientAccumulators: Record<
    MainWireIntegratedModelBeatValveIdV3,
    {
      forwardFlowDurationSec: number;
      pressureIntegralMmHgSec: number;
      peakMmHg: number | null;
    }
  >;
  systemicVenousReturnVolumeMl: number;
  pulmonaryVenousReturnVolumeMl: number;
  systemicTissueVolumeMl: number;
  pulmonaryVolumeMl: number;
  maximumAorticPressureMmHg: number;
  minimumAorticPressureMmHg: number;
  maximumLeftVentricularVolumeMl: number;
  minimumLeftVentricularVolumeMl: number;
  maximumLeftVentricularLandmark: MainWireIntegratedModelPressureVolumeLandmarkV3;
  minimumLeftVentricularLandmark: MainWireIntegratedModelPressureVolumeLandmarkV3;
  maximumRightVentricularLandmark: MainWireIntegratedModelPressureVolumeLandmarkV3;
  minimumRightVentricularLandmark: MainWireIntegratedModelPressureVolumeLandmarkV3;
  valveClosureLandmarks: Record<
    MainWireIntegratedModelBeatValveIdV3,
    MainWireIntegratedModelValveClosureLandmarkV3 | null
  >;
};

export type MainWireIntegratedModelBeatAccumulatorCheckpointV3 = Readonly<{
  checkpointId: typeof MAIN_WIRE_INTEGRATED_MODEL_BEAT_ACCUMULATOR_CHECKPOINT_V3_ID;
  schemaVersion: 1;
  active: Readonly<ActiveBeatV3> | null;
}>;

/**
 * Full accepted-step accumulator. It consumes every event-clipped numerical
 * commit inside a presentation interval, so beat metrics never depend on UI
 * frame decimation or rendering cadence.
 */
export class MainWireIntegratedModelBeatAccumulatorV3 {
  #active: ActiveBeatV3 | null = null;

  /** A private in-memory trial owns its mutable integrals independently.
   * Immutable samples and landmarks are replaced, never mutated. Durable or
   * external data still enter through the complete checkpoint validator. */
  fork(): MainWireIntegratedModelBeatAccumulatorV3 {
    const fork = new MainWireIntegratedModelBeatAccumulatorV3();
    const active = this.#active;
    if (active !== null) fork.#active = {
      ...active,
      pressureSummaryAccumulators: copyAccumulatorRecordV3(active.pressureSummaryAccumulators),
      ventricularAbsolutePressureRateExtrema: copyAccumulatorRecordV3(active.ventricularAbsolutePressureRateExtrema),
      valveFlowVolumes: copyAccumulatorRecordV3(active.valveFlowVolumes),
      valveForwardPressureGradientAccumulators: copyAccumulatorRecordV3(active.valveForwardPressureGradientAccumulators),
      valveClosureLandmarks: { ...active.valveClosureLandmarks },
    };
    return fork;
  }

  static restore(input: unknown): MainWireIntegratedModelBeatAccumulatorV3 {
    const checkpoint = ownBeatAccumulatorCheckpointV3(input);
    const accumulator = new MainWireIntegratedModelBeatAccumulatorV3();
    accumulator.#active =
      checkpoint.active === null ? null : ownActiveBeatV3(checkpoint.active);
    return accumulator;
  }

  checkpoint(): MainWireIntegratedModelBeatAccumulatorCheckpointV3 {
    return Object.freeze({
      checkpointId:
        MAIN_WIRE_INTEGRATED_MODEL_BEAT_ACCUMULATOR_CHECKPOINT_V3_ID,
      schemaVersion: 1 as const,
      active:
        this.#active === null
          ? null
          : Object.freeze(ownActiveBeatV3(this.#active)),
    });
  }

  accept(
    step: SuccessfulStep,
  ): MainWireIntegratedModelCompletedBeatMetricsV3 | null {
    const sample = sampleFromStepV3(step);
    return this.acceptSample(
      sample,
      step.composedRhythmCandidate.capturedAtrialActivation
        ?.capturedActivationId ?? null,
    );
  }

  /**
   * Consumes the model-owned fixed readback only after its wider integrated
   * transaction has committed. The input is borrowed and never retained.
   */
  acceptNumericalReadback(
    readback: Float64Array,
    capturedAtrialActivationId: string | null,
  ): MainWireIntegratedModelCompletedBeatMetricsV3 | null {
    return this.acceptSample(
      sampleFromNumericalReadbackV1(readback),
      capturedAtrialActivationId,
    );
  }

  private acceptSample(
    sample: MainWireIntegratedModelAcceptedBeatSampleV3,
    capturedAtrialActivationId: string | null,
  ): MainWireIntegratedModelCompletedBeatMetricsV3 | null {
    if (this.#active !== null) integrateSampleV3(this.#active, sample);

    if (capturedAtrialActivationId === null) return null;

    const completed =
      this.#active === null
        ? null
        : completeBeatV3(
            this.#active,
            capturedAtrialActivationId,
            sample.timeSec,
          );
    this.#active = beginBeatV3(capturedAtrialActivationId, sample);
    return completed;
  }
}

function copyAccumulatorRecordV3<T extends Record<string, object>>(record: T): T {
  return Object.fromEntries(Object.entries(record).map(([key, value]) => [key, { ...value }])) as T;
}

export function validateAndOwnMainWireIntegratedModelCompletedBeatMetricsV3(
  input: unknown,
): MainWireIntegratedModelCompletedBeatMetricsV3 {
  const record = plainExactRecordV3(
    input,
    [
      "metricsId",
      "startAtrialCaptureId",
      "endAtrialCaptureId",
      "startTimeSec",
      "endTimeSec",
      "durationSec",
      "pressureSummaries",
      "meanAorticPressureMmHg",
      "systolicAorticPressureMmHg",
      "diastolicAorticPressureMmHg",
      "pulseAorticPressureMmHg",
      "meanPulmonaryArterialPressureMmHg",
      "meanLeftAtrialPressureMmHg",
      "meanRightAtrialPressureMmHg",
      "maximumLeftVentricularVolumeMl",
      "minimumLeftVentricularVolumeMl",
      "leftVentricularPressureVolumeLandmarks",
      "rightVentricularPressureVolumeLandmarks",
      "leftVentricularValveEventMetrics",
      "rightVentricularValveEventMetrics",
      "valveFlowVolumes",
      "valveForwardPressureGradients",
      "extremaLeftVentricularStrokeVolumeMl",
      "extremaLeftVentricularEjectionFraction01",
      "leftVentricularTransmuralPressureVolumePathWorkMmHgMl",
      "rightVentricularTransmuralPressureVolumePathWorkMmHgMl",
      "ventricularAbsolutePressureRateExtrema",
      "nativeLeftCardiacOutputLPerMin",
      "nativeRightCardiacOutputLPerMin",
      "effectiveNativeLeftCardiacOutputLPerMin",
      "effectiveNativeRightCardiacOutputLPerMin",
      "systemicVenousReturnLPerMin",
      "pulmonaryVenousReturnLPerMin",
      "systemicTissueOutputLPerMin",
      "pulmonaryOutputLPerMin",
    ],
    "integrated V3 completed beat metrics",
  );
  if (record.metricsId !== MAIN_WIRE_INTEGRATED_MODEL_BEAT_METRICS_V3_ID) {
    throw new Error("integrated V3 completed beat metrics identity is invalid");
  }
  const startAtrialCaptureId = requiredStringV3(
    record.startAtrialCaptureId,
    "integrated V3 completed beat start capture ID",
  );
  const endAtrialCaptureId = requiredStringV3(
    record.endAtrialCaptureId,
    "integrated V3 completed beat end capture ID",
  );
  const startTimeSec = nonnegativeFiniteV3(
    record.startTimeSec,
    "integrated V3 completed beat start time",
  );
  const endTimeSec = nonnegativeFiniteV3(
    record.endTimeSec,
    "integrated V3 completed beat end time",
  );
  const durationSec = positiveFiniteV3(
    record.durationSec,
    "integrated V3 completed beat duration",
  );
  if (endTimeSec <= startTimeSec || endTimeSec - startTimeSec !== durationSec) {
    throw new Error("integrated V3 completed beat clocks are inconsistent");
  }
  return Object.freeze({
    metricsId: MAIN_WIRE_INTEGRATED_MODEL_BEAT_METRICS_V3_ID,
    startAtrialCaptureId,
    endAtrialCaptureId,
    startTimeSec,
    endTimeSec,
    durationSec,
    pressureSummaries: ownPressureSummariesRecordV3(
      record.pressureSummaries,
      "integrated V3 completed beat pressure summaries",
    ),
    meanAorticPressureMmHg: finiteV3(
      record.meanAorticPressureMmHg,
      "integrated V3 completed beat mean aortic pressure",
    ),
    systolicAorticPressureMmHg: finiteV3(
      record.systolicAorticPressureMmHg,
      "integrated V3 completed beat systolic aortic pressure",
    ),
    diastolicAorticPressureMmHg: finiteV3(
      record.diastolicAorticPressureMmHg,
      "integrated V3 completed beat diastolic aortic pressure",
    ),
    pulseAorticPressureMmHg: finiteV3(
      record.pulseAorticPressureMmHg,
      "integrated V3 completed beat pulse aortic pressure",
    ),
    meanPulmonaryArterialPressureMmHg: finiteV3(
      record.meanPulmonaryArterialPressureMmHg,
      "integrated V3 completed beat mean pulmonary pressure",
    ),
    meanLeftAtrialPressureMmHg: finiteV3(
      record.meanLeftAtrialPressureMmHg,
      "integrated V3 completed beat mean left atrial pressure",
    ),
    meanRightAtrialPressureMmHg: finiteV3(
      record.meanRightAtrialPressureMmHg,
      "integrated V3 completed beat mean right atrial pressure",
    ),
    maximumLeftVentricularVolumeMl: finiteV3(
      record.maximumLeftVentricularVolumeMl,
      "integrated V3 completed beat maximum LV volume",
    ),
    minimumLeftVentricularVolumeMl: finiteV3(
      record.minimumLeftVentricularVolumeMl,
      "integrated V3 completed beat minimum LV volume",
    ),
    leftVentricularPressureVolumeLandmarks: ownVentricularLandmarksV3(
      record.leftVentricularPressureVolumeLandmarks,
      "integrated V3 completed beat left ventricular landmarks",
    ),
    rightVentricularPressureVolumeLandmarks: ownVentricularLandmarksV3(
      record.rightVentricularPressureVolumeLandmarks,
      "integrated V3 completed beat right ventricular landmarks",
    ),
    leftVentricularValveEventMetrics: ownVentricularValveEventMetricsV3(
      record.leftVentricularValveEventMetrics,
      "left",
      "integrated V3 completed beat left ventricular valve-event metrics",
    ),
    rightVentricularValveEventMetrics: ownVentricularValveEventMetricsV3(
      record.rightVentricularValveEventMetrics,
      "right",
      "integrated V3 completed beat right ventricular valve-event metrics",
    ),
    valveFlowVolumes: ownValveFlowVolumesRecordV3(
      record.valveFlowVolumes,
      "integrated V3 completed beat valve-flow volumes",
    ),
    valveForwardPressureGradients: ownValveForwardPressureGradientsRecordV3(
      record.valveForwardPressureGradients,
      "integrated V3 completed beat valve forward pressure gradients",
    ),
    extremaLeftVentricularStrokeVolumeMl: finiteV3(
      record.extremaLeftVentricularStrokeVolumeMl,
      "integrated V3 completed beat LV stroke volume",
    ),
    extremaLeftVentricularEjectionFraction01: finiteV3(
      record.extremaLeftVentricularEjectionFraction01,
      "integrated V3 completed beat LV ejection fraction",
    ),
    leftVentricularTransmuralPressureVolumePathWorkMmHgMl: finiteV3(
      record.leftVentricularTransmuralPressureVolumePathWorkMmHgMl,
      "integrated V3 completed beat LV transmural pressure-volume path work",
    ),
    rightVentricularTransmuralPressureVolumePathWorkMmHgMl: finiteV3(
      record.rightVentricularTransmuralPressureVolumePathWorkMmHgMl,
      "integrated V3 completed beat RV transmural pressure-volume path work",
    ),
    ventricularAbsolutePressureRateExtrema: ownVentricularPressureRateExtremaV3(
      record.ventricularAbsolutePressureRateExtrema,
      false,
      "integrated V3 completed beat ventricular pressure-rate extrema",
    ) as MainWireIntegratedModelCompletedBeatMetricsV3["ventricularAbsolutePressureRateExtrema"],
    nativeLeftCardiacOutputLPerMin: finiteV3(
      record.nativeLeftCardiacOutputLPerMin,
      "integrated V3 completed beat native left output",
    ),
    nativeRightCardiacOutputLPerMin: finiteV3(
      record.nativeRightCardiacOutputLPerMin,
      "integrated V3 completed beat native right output",
    ),
    effectiveNativeLeftCardiacOutputLPerMin: finiteV3(
      record.effectiveNativeLeftCardiacOutputLPerMin,
      "integrated V3 completed beat effective native left output",
    ),
    effectiveNativeRightCardiacOutputLPerMin: finiteV3(
      record.effectiveNativeRightCardiacOutputLPerMin,
      "integrated V3 completed beat effective native right output",
    ),
    systemicVenousReturnLPerMin: finiteV3(
      record.systemicVenousReturnLPerMin,
      "integrated V3 completed beat systemic venous return",
    ),
    pulmonaryVenousReturnLPerMin: finiteV3(
      record.pulmonaryVenousReturnLPerMin,
      "integrated V3 completed beat pulmonary venous return",
    ),
    systemicTissueOutputLPerMin: finiteV3(
      record.systemicTissueOutputLPerMin,
      "integrated V3 completed beat systemic tissue output",
    ),
    pulmonaryOutputLPerMin: finiteV3(
      record.pulmonaryOutputLPerMin,
      "integrated V3 completed beat pulmonary output",
    ),
  });
}

function sampleFromStepV3(
  step: SuccessfulStep,
): MainWireIntegratedModelAcceptedBeatSampleV3 {
  const circulation = step.coronaryStep.baseStep.circulationTrial;
  const coronary =
    step.coronaryStep.baseStep.coronaryTrial.diagnostics.hydraulics;
  const sample = Object.freeze({
    timeSec: step.acceptedState.acceptedTimeSec,
    systemicArterialPressureMmHg: circulation.nodeAbsolutePressuresMmHg.SA,
    pulmonaryVenousPressureMmHg: circulation.nodeAbsolutePressuresMmHg.PVein,
    venaCavaPressureMmHg: circulation.nodeAbsolutePressuresMmHg.VC,
    aorticPressureMmHg: circulation.nodeAbsolutePressuresMmHg.Ao,
    pulmonaryArterialPressureMmHg: circulation.nodeAbsolutePressuresMmHg.PA,
    leftAtrialPressureMmHg: circulation.nodeAbsolutePressuresMmHg.LA,
    rightAtrialPressureMmHg: circulation.nodeAbsolutePressuresMmHg.RA,
    leftVentricularAbsolutePressureMmHg:
      circulation.nodeAbsolutePressuresMmHg.LV,
    rightVentricularAbsolutePressureMmHg:
      circulation.nodeAbsolutePressuresMmHg.RV,
    leftVentricularVolumeMl:
      step.acceptedState.coronary.circulation.nodeVolumesMl.LV,
    rightVentricularVolumeMl:
      step.acceptedState.coronary.circulation.nodeVolumesMl.RV,
    leftVentricularTransmuralPressureMmHg:
      step.coronaryStep.baseStep.mechanicsTrial.transmuralPressuresMmHg.LV,
    rightVentricularTransmuralPressureMmHg:
      step.coronaryStep.baseStep.mechanicsTrial.transmuralPressuresMmHg.RV,
    mitralValveFlowMlPerSec: circulation.valveEvaluations.MV.flowMlPerSec,
    aorticValveFlowMlPerSec: circulation.valveEvaluations.AoV.flowMlPerSec,
    tricuspidValveFlowMlPerSec: circulation.valveEvaluations.TV.flowMlPerSec,
    pulmonaryValveFlowMlPerSec: circulation.valveEvaluations.PV.flowMlPerSec,
    systemicVenousReturnMlPerSec:
      circulation.edgeFlowsMlPerSec.VC_RA +
      coronary.commonCoronaryVenousOutletFlowMlPerSec,
    pulmonaryVenousReturnMlPerSec: circulation.edgeFlowsMlPerSec.PVein_LA,
    systemicTissueFlowMlPerSec: circulation.edgeFlowsMlPerSec.SA_Art,
    pulmonaryFlowMlPerSec: circulation.edgeFlowsMlPerSec.PA_PArt,
  });
  for (const [name, value] of Object.entries(sample)) {
    if (!Number.isFinite(value)) {
      throw new Error(`integrated V3 beat sample ${name} is not finite`);
    }
  }
  return sample;
}

export function sampleMainWireIntegratedModelBeatFromNumericalReadbackV1(
  readback: Float64Array,
): MainWireIntegratedModelAcceptedBeatSampleV3 {
  return sampleFromNumericalReadbackV1(readback);
}

function sampleFromNumericalReadbackV1(
  readback: Float64Array,
): MainWireIntegratedModelAcceptedBeatSampleV3 {
  if (
    !(readback instanceof Float64Array) ||
    readback.length !== MAIN_WIRE_FIVE_WALL_ACCEPTED_NUMERICAL_READBACK_COUNT_V1
  ) {
    throw new RangeError(
      "integrated V3 beat readback must contain exactly " +
        `${MAIN_WIRE_FIVE_WALL_ACCEPTED_NUMERICAL_READBACK_COUNT_V1} f64 values`,
    );
  }
  const layout = MAIN_WIRE_FIVE_WALL_ACCEPTED_NUMERICAL_READBACK_LAYOUT_V1;
  const sample = Object.freeze({
    timeSec: readback[layout.timeSec]!,
    systemicArterialPressureMmHg: readback[layout.absolutePressureMmHg + 5]!,
    pulmonaryVenousPressureMmHg: readback[layout.absolutePressureMmHg + 7]!,
    venaCavaPressureMmHg: readback[layout.absolutePressureMmHg + 8]!,
    aorticPressureMmHg: readback[layout.absolutePressureMmHg + 4]!,
    pulmonaryArterialPressureMmHg: readback[layout.absolutePressureMmHg + 6]!,
    leftAtrialPressureMmHg: readback[layout.absolutePressureMmHg]!,
    rightAtrialPressureMmHg: readback[layout.absolutePressureMmHg + 2]!,
    leftVentricularAbsolutePressureMmHg:
      readback[layout.absolutePressureMmHg + 1]!,
    rightVentricularAbsolutePressureMmHg:
      readback[layout.absolutePressureMmHg + 3]!,
    leftVentricularVolumeMl: readback[layout.chamberVolumeMl + 1]!,
    rightVentricularVolumeMl: readback[layout.chamberVolumeMl + 3]!,
    leftVentricularTransmuralPressureMmHg:
      readback[layout.transmuralPressureMmHg + 1]!,
    rightVentricularTransmuralPressureMmHg:
      readback[layout.transmuralPressureMmHg + 3]!,
    mitralValveFlowMlPerSec: readback[layout.valveFlowMlPerSec]!,
    aorticValveFlowMlPerSec: readback[layout.valveFlowMlPerSec + 1]!,
    tricuspidValveFlowMlPerSec: readback[layout.valveFlowMlPerSec + 2]!,
    pulmonaryValveFlowMlPerSec: readback[layout.valveFlowMlPerSec + 3]!,
    systemicVenousReturnMlPerSec:
      readback[layout.systemicVenousFlowMlPerSec]! +
      readback[layout.coronaryVenousOutletFlowMlPerSec]!,
    pulmonaryVenousReturnMlPerSec:
      readback[layout.pulmonaryVenousFlowMlPerSec]!,
    systemicTissueFlowMlPerSec: readback[layout.systemicTissueFlowMlPerSec]!,
    pulmonaryFlowMlPerSec: readback[layout.pulmonaryFlowMlPerSec]!,
  });
  for (const [name, value] of Object.entries(sample)) {
    if (!Number.isFinite(value)) {
      throw new Error(`integrated V3 beat readback ${name} is not finite`);
    }
  }
  return sample;
}

function beginBeatV3(
  startAtrialCaptureId: string,
  sample: MainWireIntegratedModelAcceptedBeatSampleV3,
): ActiveBeatV3 {
  const leftLandmark = pressureVolumeLandmarkFromSampleV3(
    sample,
    "left",
    "maximum-volume",
  );
  const rightLandmark = pressureVolumeLandmarkFromSampleV3(
    sample,
    "right",
    "maximum-volume",
  );
  return {
    startAtrialCaptureId,
    startTimeSec: sample.timeSec,
    previous: sample,
    pressureSummaryAccumulators: createPressureSummaryAccumulatorsV3(sample),
    aorticPressureIntegralMmHgSec: 0,
    pulmonaryArterialPressureIntegralMmHgSec: 0,
    leftAtrialPressureIntegralMmHgSec: 0,
    rightAtrialPressureIntegralMmHgSec: 0,
    leftVentricularTransmuralPressureVolumePathIntegralMmHgMl: 0,
    rightVentricularTransmuralPressureVolumePathIntegralMmHgMl: 0,
    ventricularAbsolutePressureRateExtrema: {
      LV: { maximumMmHgPerSec: null, minimumMmHgPerSec: null },
      RV: { maximumMmHgPerSec: null, minimumMmHgPerSec: null },
    },
    valveFlowVolumes: createMutableValveFlowVolumesV3(),
    valveForwardPressureGradientAccumulators:
      createValveForwardPressureGradientAccumulatorsV3(),
    systemicVenousReturnVolumeMl: 0,
    pulmonaryVenousReturnVolumeMl: 0,
    systemicTissueVolumeMl: 0,
    pulmonaryVolumeMl: 0,
    maximumAorticPressureMmHg: sample.aorticPressureMmHg,
    minimumAorticPressureMmHg: sample.aorticPressureMmHg,
    maximumLeftVentricularVolumeMl: sample.leftVentricularVolumeMl,
    minimumLeftVentricularVolumeMl: sample.leftVentricularVolumeMl,
    maximumLeftVentricularLandmark: leftLandmark,
    minimumLeftVentricularLandmark: Object.freeze({
      ...leftLandmark,
      event: "minimum-volume-fallback" as const,
    }),
    maximumRightVentricularLandmark: rightLandmark,
    minimumRightVentricularLandmark: Object.freeze({
      ...rightLandmark,
      event: "minimum-volume-fallback" as const,
    }),
    valveClosureLandmarks: createNullValveClosureLandmarksV3(),
  };
}

function integrateSampleV3(
  active: ActiveBeatV3,
  next: MainWireIntegratedModelAcceptedBeatSampleV3,
): void {
  const previous = active.previous;
  const dtSec = next.timeSec - previous.timeSec;
  if (!Number.isFinite(dtSec) || dtSec <= 0) {
    throw new Error("integrated V3 beat sample clock did not advance");
  }
  for (const nodeId of MAIN_WIRE_INTEGRATED_MODEL_BEAT_PRESSURE_NODE_IDS_V3) {
    const previousPressureMmHg = pressureFromSampleV3(previous, nodeId);
    const nextPressureMmHg = pressureFromSampleV3(next, nodeId);
    const summary = active.pressureSummaryAccumulators[nodeId];
    summary.integralMmHgSec += trapezoidV3(
      previousPressureMmHg,
      nextPressureMmHg,
      dtSec,
    );
    summary.maximumMmHg = Math.max(summary.maximumMmHg, nextPressureMmHg);
    summary.minimumMmHg = Math.min(summary.minimumMmHg, nextPressureMmHg);
  }
  active.aorticPressureIntegralMmHgSec += trapezoidV3(
    previous.aorticPressureMmHg,
    next.aorticPressureMmHg,
    dtSec,
  );
  active.pulmonaryArterialPressureIntegralMmHgSec += trapezoidV3(
    previous.pulmonaryArterialPressureMmHg,
    next.pulmonaryArterialPressureMmHg,
    dtSec,
  );
  active.leftAtrialPressureIntegralMmHgSec += trapezoidV3(
    previous.leftAtrialPressureMmHg,
    next.leftAtrialPressureMmHg,
    dtSec,
  );
  active.rightAtrialPressureIntegralMmHgSec += trapezoidV3(
    previous.rightAtrialPressureMmHg,
    next.rightAtrialPressureMmHg,
    dtSec,
  );
  active.leftVentricularTransmuralPressureVolumePathIntegralMmHgMl +=
    pressureVolumePathIntegralIncrementV3(
      previous.leftVentricularVolumeMl,
      previous.leftVentricularTransmuralPressureMmHg,
      next.leftVentricularVolumeMl,
      next.leftVentricularTransmuralPressureMmHg,
    );
  active.rightVentricularTransmuralPressureVolumePathIntegralMmHgMl +=
    pressureVolumePathIntegralIncrementV3(
      previous.rightVentricularVolumeMl,
      previous.rightVentricularTransmuralPressureMmHg,
      next.rightVentricularVolumeMl,
      next.rightVentricularTransmuralPressureMmHg,
    );
  updatePressureRateExtremaV3(
    active.ventricularAbsolutePressureRateExtrema.LV,
    (next.leftVentricularAbsolutePressureMmHg -
      previous.leftVentricularAbsolutePressureMmHg) /
      dtSec,
  );
  updatePressureRateExtremaV3(
    active.ventricularAbsolutePressureRateExtrema.RV,
    (next.rightVentricularAbsolutePressureMmHg -
      previous.rightVentricularAbsolutePressureMmHg) /
      dtSec,
  );
  for (const valveId of MAIN_WIRE_INTEGRATED_MODEL_BEAT_VALVE_IDS_V3) {
    const previousFlowMlPerSec = valveFlowFromSampleV3(previous, valveId);
    const nextFlowMlPerSec = valveFlowFromSampleV3(next, valveId);
    const increment = signedFlowVolumeIncrementV3(
      previousFlowMlPerSec,
      nextFlowMlPerSec,
      dtSec,
    );
    active.valveFlowVolumes[valveId].forwardVolumeMl +=
      increment.forwardVolumeMl;
    active.valveFlowVolumes[valveId].reverseVolumeMl +=
      increment.reverseVolumeMl;
    const gradientIncrement = forwardPressureGradientIncrementV3(
      previousFlowMlPerSec,
      nextFlowMlPerSec,
      valvePressureGradientFromSampleV3(previous, valveId),
      valvePressureGradientFromSampleV3(next, valveId),
      dtSec,
    );
    const gradientAccumulator =
      active.valveForwardPressureGradientAccumulators[valveId];
    gradientAccumulator.forwardFlowDurationSec +=
      gradientIncrement.forwardFlowDurationSec;
    gradientAccumulator.pressureIntegralMmHgSec +=
      gradientIncrement.pressureIntegralMmHgSec;
    if (gradientIncrement.peakMmHg !== null) {
      gradientAccumulator.peakMmHg =
        gradientAccumulator.peakMmHg === null
          ? gradientIncrement.peakMmHg
          : Math.max(gradientAccumulator.peakMmHg, gradientIncrement.peakMmHg);
    }

    if (
      active.valveClosureLandmarks[valveId] === null &&
      previousFlowMlPerSec > 0 &&
      nextFlowMlPerSec <= 0
    ) {
      active.valveClosureLandmarks[valveId] = interpolateValveClosureV3(
        previous,
        next,
        valveId,
        previousFlowMlPerSec,
        nextFlowMlPerSec,
      );
    }
  }
  active.systemicVenousReturnVolumeMl += trapezoidV3(
    previous.systemicVenousReturnMlPerSec,
    next.systemicVenousReturnMlPerSec,
    dtSec,
  );
  active.pulmonaryVenousReturnVolumeMl += trapezoidV3(
    previous.pulmonaryVenousReturnMlPerSec,
    next.pulmonaryVenousReturnMlPerSec,
    dtSec,
  );
  active.systemicTissueVolumeMl += trapezoidV3(
    previous.systemicTissueFlowMlPerSec,
    next.systemicTissueFlowMlPerSec,
    dtSec,
  );
  active.pulmonaryVolumeMl += trapezoidV3(
    previous.pulmonaryFlowMlPerSec,
    next.pulmonaryFlowMlPerSec,
    dtSec,
  );
  active.maximumAorticPressureMmHg = Math.max(
    active.maximumAorticPressureMmHg,
    next.aorticPressureMmHg,
  );
  active.minimumAorticPressureMmHg = Math.min(
    active.minimumAorticPressureMmHg,
    next.aorticPressureMmHg,
  );
  active.maximumLeftVentricularVolumeMl = Math.max(
    active.maximumLeftVentricularVolumeMl,
    next.leftVentricularVolumeMl,
  );
  active.minimumLeftVentricularVolumeMl = Math.min(
    active.minimumLeftVentricularVolumeMl,
    next.leftVentricularVolumeMl,
  );
  if (
    next.leftVentricularVolumeMl >
    active.maximumLeftVentricularLandmark.volumeMl
  ) {
    active.maximumLeftVentricularLandmark = pressureVolumeLandmarkFromSampleV3(
      next,
      "left",
      "maximum-volume",
    );
  }
  if (
    next.leftVentricularVolumeMl <
    active.minimumLeftVentricularLandmark.volumeMl
  ) {
    active.minimumLeftVentricularLandmark = pressureVolumeLandmarkFromSampleV3(
      next,
      "left",
      "minimum-volume-fallback",
    );
  }
  if (
    next.rightVentricularVolumeMl >
    active.maximumRightVentricularLandmark.volumeMl
  ) {
    active.maximumRightVentricularLandmark = pressureVolumeLandmarkFromSampleV3(
      next,
      "right",
      "maximum-volume",
    );
  }
  if (
    next.rightVentricularVolumeMl <
    active.minimumRightVentricularLandmark.volumeMl
  ) {
    active.minimumRightVentricularLandmark = pressureVolumeLandmarkFromSampleV3(
      next,
      "right",
      "minimum-volume-fallback",
    );
  }
  active.previous = next;
}

function completeBeatV3(
  active: ActiveBeatV3,
  endAtrialCaptureId: string,
  endTimeSec: number,
): MainWireIntegratedModelCompletedBeatMetricsV3 {
  const durationSec = endTimeSec - active.startTimeSec;
  if (!Number.isFinite(durationSec) || durationSec <= 0) {
    throw new Error("integrated V3 completed beat duration is invalid");
  }
  const strokeVolumeMl =
    active.maximumLeftVentricularVolumeMl -
    active.minimumLeftVentricularVolumeMl;
  const ejectionFraction01 =
    strokeVolumeMl / active.maximumLeftVentricularVolumeMl;
  const valveFlowVolumes = completeValveFlowVolumesV3(active.valveFlowVolumes);
  const pressureSummaries = completePressureSummariesV3(
    active.pressureSummaryAccumulators,
    durationSec,
  );
  const valveForwardPressureGradients = completeValveForwardPressureGradientsV3(
    active.valveForwardPressureGradientAccumulators,
  );
  const leftVentricularValveEventMetrics =
    completeVentricularValveEventMetricsV3(active, "left");
  const rightVentricularValveEventMetrics =
    completeVentricularValveEventMetricsV3(active, "right");
  const meanFlowToLPerMin = (volumeMl: number) =>
    ((volumeMl / durationSec) * 60) / 1_000;
  const completed = Object.freeze({
    metricsId: MAIN_WIRE_INTEGRATED_MODEL_BEAT_METRICS_V3_ID,
    startAtrialCaptureId: active.startAtrialCaptureId,
    endAtrialCaptureId,
    startTimeSec: active.startTimeSec,
    endTimeSec,
    durationSec,
    pressureSummaries,
    meanAorticPressureMmHg: active.aorticPressureIntegralMmHgSec / durationSec,
    systolicAorticPressureMmHg: active.maximumAorticPressureMmHg,
    diastolicAorticPressureMmHg: active.minimumAorticPressureMmHg,
    pulseAorticPressureMmHg:
      active.maximumAorticPressureMmHg - active.minimumAorticPressureMmHg,
    meanPulmonaryArterialPressureMmHg:
      active.pulmonaryArterialPressureIntegralMmHgSec / durationSec,
    meanLeftAtrialPressureMmHg:
      active.leftAtrialPressureIntegralMmHgSec / durationSec,
    meanRightAtrialPressureMmHg:
      active.rightAtrialPressureIntegralMmHgSec / durationSec,
    maximumLeftVentricularVolumeMl: active.maximumLeftVentricularVolumeMl,
    minimumLeftVentricularVolumeMl: active.minimumLeftVentricularVolumeMl,
    leftVentricularPressureVolumeLandmarks: Object.freeze({
      pressureBasis: "transmural" as const,
      endDiastolic:
        active.maximumLeftVentricularLandmark as MainWireIntegratedModelVentricularPressureVolumeLandmarksV3["endDiastolic"],
      endSystolic: (legacySemilunarClosureLandmarkV3(
        active.valveClosureLandmarks.AoV,
      ) ??
        active.minimumLeftVentricularLandmark) as MainWireIntegratedModelVentricularPressureVolumeLandmarksV3["endSystolic"],
    }),
    rightVentricularPressureVolumeLandmarks: Object.freeze({
      pressureBasis: "transmural" as const,
      endDiastolic:
        active.maximumRightVentricularLandmark as MainWireIntegratedModelVentricularPressureVolumeLandmarksV3["endDiastolic"],
      endSystolic: (legacySemilunarClosureLandmarkV3(
        active.valveClosureLandmarks.PV,
      ) ??
        active.minimumRightVentricularLandmark) as MainWireIntegratedModelVentricularPressureVolumeLandmarksV3["endSystolic"],
    }),
    leftVentricularValveEventMetrics,
    rightVentricularValveEventMetrics,
    valveFlowVolumes,
    valveForwardPressureGradients,
    extremaLeftVentricularStrokeVolumeMl: strokeVolumeMl,
    extremaLeftVentricularEjectionFraction01: ejectionFraction01,
    leftVentricularTransmuralPressureVolumePathWorkMmHgMl:
      negateWithoutNegativeZeroV3(
        active.leftVentricularTransmuralPressureVolumePathIntegralMmHgMl,
      ),
    rightVentricularTransmuralPressureVolumePathWorkMmHgMl:
      negateWithoutNegativeZeroV3(
        active.rightVentricularTransmuralPressureVolumePathIntegralMmHgMl,
      ),
    ventricularAbsolutePressureRateExtrema:
      completeVentricularPressureRateExtremaV3(
        active.ventricularAbsolutePressureRateExtrema,
      ),
    nativeLeftCardiacOutputLPerMin: meanFlowToLPerMin(
      valveFlowVolumes.AoV.forwardVolumeMl,
    ),
    nativeRightCardiacOutputLPerMin: meanFlowToLPerMin(
      valveFlowVolumes.PV.forwardVolumeMl,
    ),
    effectiveNativeLeftCardiacOutputLPerMin: meanFlowToLPerMin(
      valveFlowVolumes.AoV.netVolumeMl,
    ),
    effectiveNativeRightCardiacOutputLPerMin: meanFlowToLPerMin(
      valveFlowVolumes.PV.netVolumeMl,
    ),
    systemicVenousReturnLPerMin: meanFlowToLPerMin(
      active.systemicVenousReturnVolumeMl,
    ),
    pulmonaryVenousReturnLPerMin: meanFlowToLPerMin(
      active.pulmonaryVenousReturnVolumeMl,
    ),
    systemicTissueOutputLPerMin: meanFlowToLPerMin(
      active.systemicTissueVolumeMl,
    ),
    pulmonaryOutputLPerMin: meanFlowToLPerMin(active.pulmonaryVolumeMl),
  });
  for (const [name, value] of Object.entries(completed)) {
    if (typeof value === "number" && !Number.isFinite(value)) {
      throw new Error(
        `integrated V3 completed beat metric ${name} is not finite`,
      );
    }
  }
  return completed;
}

function trapezoidV3(left: number, right: number, dtSec: number): number {
  return 0.5 * (left + right) * dtSec;
}

/**
 * Integrates a linearly interpolated signed valve-flow segment while keeping
 * forward and reverse ledgers separate. A sign-changing segment is split at
 * its zero crossing instead of clipping its two endpoints over the whole dt.
 */
export function signedFlowVolumeIncrementV3(
  previousFlowMlPerSec: number,
  nextFlowMlPerSec: number,
  dtSec: number,
): Readonly<{
  forwardVolumeMl: number;
  reverseVolumeMl: number;
  netVolumeMl: number;
}> {
  for (const [name, value] of Object.entries({
    previousFlowMlPerSec,
    nextFlowMlPerSec,
    dtSec,
  })) {
    if (!Number.isFinite(value)) {
      throw new Error(`signed flow ${name} is not finite`);
    }
  }
  if (dtSec <= 0) throw new Error("signed flow dtSec must be positive");

  let forwardVolumeMl = 0;
  let reverseVolumeMl = 0;
  if (previousFlowMlPerSec >= 0 && nextFlowMlPerSec >= 0) {
    forwardVolumeMl = trapezoidV3(
      previousFlowMlPerSec,
      nextFlowMlPerSec,
      dtSec,
    );
  } else if (previousFlowMlPerSec <= 0 && nextFlowMlPerSec <= 0) {
    reverseVolumeMl = -trapezoidV3(
      previousFlowMlPerSec,
      nextFlowMlPerSec,
      dtSec,
    );
  } else {
    const crossingFraction =
      previousFlowMlPerSec / (previousFlowMlPerSec - nextFlowMlPerSec);
    if (previousFlowMlPerSec > 0) {
      forwardVolumeMl = 0.5 * previousFlowMlPerSec * crossingFraction * dtSec;
      reverseVolumeMl =
        0.5 * -nextFlowMlPerSec * (1 - crossingFraction) * dtSec;
    } else {
      reverseVolumeMl = 0.5 * -previousFlowMlPerSec * crossingFraction * dtSec;
      forwardVolumeMl = 0.5 * nextFlowMlPerSec * (1 - crossingFraction) * dtSec;
    }
  }
  return Object.freeze({
    forwardVolumeMl,
    reverseVolumeMl,
    netVolumeMl: forwardVolumeMl - reverseVolumeMl,
  });
}

/**
 * One accepted-endpoint trapezoid for the signed line integral `P dV`.
 * Time does not enter this work-conjugate integral; accepted numerical
 * endpoints and event-clipped substeps own the path resolution.
 */
export function pressureVolumePathIntegralIncrementV3(
  previousVolumeMl: number,
  previousPressureMmHg: number,
  nextVolumeMl: number,
  nextPressureMmHg: number,
): number {
  for (const [name, value] of Object.entries({
    previousVolumeMl,
    previousPressureMmHg,
    nextVolumeMl,
    nextPressureMmHg,
  })) {
    if (!Number.isFinite(value)) {
      throw new Error(`pressure-volume path ${name} is not finite`);
    }
  }
  return (
    0.5 *
    (previousPressureMmHg + nextPressureMmHg) *
    (nextVolumeMl - previousVolumeMl)
  );
}

/**
 * Integrates upstream-minus-downstream pressure only during forward flow.
 * Both flow and pressure are linearly interpolated between accepted endpoints;
 * a flow zero crossing therefore owns an exact partial interval.
 */
export function forwardPressureGradientIncrementV3(
  previousFlowMlPerSec: number,
  nextFlowMlPerSec: number,
  previousGradientMmHg: number,
  nextGradientMmHg: number,
  dtSec: number,
): Readonly<{
  forwardFlowDurationSec: number;
  pressureIntegralMmHgSec: number;
  peakMmHg: number | null;
}> {
  for (const [name, value] of Object.entries({
    previousFlowMlPerSec,
    nextFlowMlPerSec,
    previousGradientMmHg,
    nextGradientMmHg,
    dtSec,
  })) {
    if (!Number.isFinite(value)) {
      throw new Error(`forward pressure gradient ${name} is not finite`);
    }
  }
  if (dtSec <= 0) {
    throw new Error("forward pressure gradient dtSec must be positive");
  }
  if (previousFlowMlPerSec <= 0 && nextFlowMlPerSec <= 0) {
    return Object.freeze({
      forwardFlowDurationSec: 0,
      pressureIntegralMmHgSec: 0,
      peakMmHg: null,
    });
  }
  if (previousFlowMlPerSec > 0 && nextFlowMlPerSec > 0) {
    return Object.freeze({
      forwardFlowDurationSec: dtSec,
      pressureIntegralMmHgSec: trapezoidV3(
        previousGradientMmHg,
        nextGradientMmHg,
        dtSec,
      ),
      peakMmHg: Math.max(previousGradientMmHg, nextGradientMmHg),
    });
  }

  const crossingFraction =
    previousFlowMlPerSec / (previousFlowMlPerSec - nextFlowMlPerSec);
  const crossingGradientMmHg =
    previousGradientMmHg +
    crossingFraction * (nextGradientMmHg - previousGradientMmHg);
  if (previousFlowMlPerSec > 0) {
    const forwardFlowDurationSec = crossingFraction * dtSec;
    return Object.freeze({
      forwardFlowDurationSec,
      pressureIntegralMmHgSec: trapezoidV3(
        previousGradientMmHg,
        crossingGradientMmHg,
        forwardFlowDurationSec,
      ),
      peakMmHg: Math.max(previousGradientMmHg, crossingGradientMmHg),
    });
  }
  const forwardFlowDurationSec = (1 - crossingFraction) * dtSec;
  return Object.freeze({
    forwardFlowDurationSec,
    pressureIntegralMmHgSec: trapezoidV3(
      crossingGradientMmHg,
      nextGradientMmHg,
      forwardFlowDurationSec,
    ),
    peakMmHg: Math.max(crossingGradientMmHg, nextGradientMmHg),
  });
}

function pressureFromSampleV3(
  sample: MainWireIntegratedModelAcceptedBeatSampleV3,
  nodeId: MainWireIntegratedModelBeatPressureNodeIdV3,
): number {
  switch (nodeId) {
    case "LA":
      return sample.leftAtrialPressureMmHg;
    case "LV":
      return sample.leftVentricularAbsolutePressureMmHg;
    case "RA":
      return sample.rightAtrialPressureMmHg;
    case "RV":
      return sample.rightVentricularAbsolutePressureMmHg;
    case "Ao":
      return sample.aorticPressureMmHg;
    case "SA":
      return sample.systemicArterialPressureMmHg;
    case "PA":
      return sample.pulmonaryArterialPressureMmHg;
    case "PVein":
      return sample.pulmonaryVenousPressureMmHg;
    case "VC":
      return sample.venaCavaPressureMmHg;
  }
}

function valvePressureGradientFromSampleV3(
  sample: MainWireIntegratedModelAcceptedBeatSampleV3,
  valveId: MainWireIntegratedModelBeatValveIdV3,
): number {
  switch (valveId) {
    case "MV":
      return (
        sample.leftAtrialPressureMmHg -
        sample.leftVentricularAbsolutePressureMmHg
      );
    case "AoV":
      return (
        sample.leftVentricularAbsolutePressureMmHg - sample.aorticPressureMmHg
      );
    case "TV":
      return (
        sample.rightAtrialPressureMmHg -
        sample.rightVentricularAbsolutePressureMmHg
      );
    case "PV":
      return (
        sample.rightVentricularAbsolutePressureMmHg -
        sample.pulmonaryArterialPressureMmHg
      );
  }
}

function createPressureSummaryAccumulatorsV3(
  sample: MainWireIntegratedModelAcceptedBeatSampleV3,
): ActiveBeatV3["pressureSummaryAccumulators"] {
  const create = (nodeId: MainWireIntegratedModelBeatPressureNodeIdV3) => {
    const pressureMmHg = pressureFromSampleV3(sample, nodeId);
    return {
      integralMmHgSec: 0,
      maximumMmHg: pressureMmHg,
      minimumMmHg: pressureMmHg,
    };
  };
  return {
    LA: create("LA"),
    LV: create("LV"),
    RA: create("RA"),
    RV: create("RV"),
    Ao: create("Ao"),
    SA: create("SA"),
    PA: create("PA"),
    PVein: create("PVein"),
    VC: create("VC"),
  };
}

function completePressureSummariesV3(
  input: ActiveBeatV3["pressureSummaryAccumulators"],
  durationSec: number,
): MainWireIntegratedModelCompletedBeatMetricsV3["pressureSummaries"] {
  const complete = (nodeId: MainWireIntegratedModelBeatPressureNodeIdV3) => {
    const value = input[nodeId];
    return Object.freeze({
      timeWeightedMeanMmHg: value.integralMmHgSec / durationSec,
      maximumMmHg: value.maximumMmHg,
      minimumMmHg: value.minimumMmHg,
      pulseMmHg: value.maximumMmHg - value.minimumMmHg,
    });
  };
  return Object.freeze({
    LA: complete("LA"),
    LV: complete("LV"),
    RA: complete("RA"),
    RV: complete("RV"),
    Ao: complete("Ao"),
    SA: complete("SA"),
    PA: complete("PA"),
    PVein: complete("PVein"),
    VC: complete("VC"),
  });
}

function updatePressureRateExtremaV3(
  extrema: {
    maximumMmHgPerSec: number | null;
    minimumMmHgPerSec: number | null;
  },
  valueMmHgPerSec: number,
): void {
  if (!Number.isFinite(valueMmHgPerSec)) {
    throw new Error("ventricular pressure rate is not finite");
  }
  extrema.maximumMmHgPerSec =
    extrema.maximumMmHgPerSec === null
      ? valueMmHgPerSec
      : Math.max(extrema.maximumMmHgPerSec, valueMmHgPerSec);
  extrema.minimumMmHgPerSec =
    extrema.minimumMmHgPerSec === null
      ? valueMmHgPerSec
      : Math.min(extrema.minimumMmHgPerSec, valueMmHgPerSec);
}

function completeVentricularPressureRateExtremaV3(
  input: ActiveBeatV3["ventricularAbsolutePressureRateExtrema"],
): MainWireIntegratedModelCompletedBeatMetricsV3["ventricularAbsolutePressureRateExtrema"] {
  const complete = (ventricle: "LV" | "RV") => {
    const value = input[ventricle];
    if (value.maximumMmHgPerSec === null || value.minimumMmHgPerSec === null) {
      throw new Error(
        "completed beat has no ventricular pressure-rate interval",
      );
    }
    return Object.freeze({
      maximumMmHgPerSec: value.maximumMmHgPerSec,
      minimumMmHgPerSec: value.minimumMmHgPerSec,
    });
  };
  return Object.freeze({ LV: complete("LV"), RV: complete("RV") });
}

function createValveForwardPressureGradientAccumulatorsV3(): ActiveBeatV3["valveForwardPressureGradientAccumulators"] {
  const create = () => ({
    forwardFlowDurationSec: 0,
    pressureIntegralMmHgSec: 0,
    peakMmHg: null,
  });
  return { MV: create(), AoV: create(), TV: create(), PV: create() };
}

function completeValveForwardPressureGradientsV3(
  input: ActiveBeatV3["valveForwardPressureGradientAccumulators"],
): MainWireIntegratedModelCompletedBeatMetricsV3["valveForwardPressureGradients"] {
  const complete = (valveId: MainWireIntegratedModelBeatValveIdV3) => {
    const value = input[valveId];
    return Object.freeze({
      basis:
        "upstream-minus-downstream-absolute-pressure-during-forward-flow" as const,
      forwardFlowDurationSec: value.forwardFlowDurationSec,
      timeWeightedMeanMmHg:
        value.forwardFlowDurationSec > 0
          ? value.pressureIntegralMmHgSec / value.forwardFlowDurationSec
          : null,
      peakMmHg: value.peakMmHg,
    });
  };
  return Object.freeze({
    MV: complete("MV"),
    AoV: complete("AoV"),
    TV: complete("TV"),
    PV: complete("PV"),
  });
}

function pressureVolumeLandmarkFromSampleV3(
  sample: MainWireIntegratedModelAcceptedBeatSampleV3,
  side: "left" | "right",
  event: MainWireIntegratedModelPressureVolumeLandmarkV3["event"],
): MainWireIntegratedModelPressureVolumeLandmarkV3 {
  return Object.freeze({
    volumeMl:
      side === "left"
        ? sample.leftVentricularVolumeMl
        : sample.rightVentricularVolumeMl,
    pressureMmHg:
      side === "left"
        ? sample.leftVentricularTransmuralPressureMmHg
        : sample.rightVentricularTransmuralPressureMmHg,
    event,
  });
}

function createMutableValveFlowVolumesV3(): ActiveBeatV3["valveFlowVolumes"] {
  return {
    MV: { forwardVolumeMl: 0, reverseVolumeMl: 0 },
    AoV: { forwardVolumeMl: 0, reverseVolumeMl: 0 },
    TV: { forwardVolumeMl: 0, reverseVolumeMl: 0 },
    PV: { forwardVolumeMl: 0, reverseVolumeMl: 0 },
  };
}

function createNullValveClosureLandmarksV3(): ActiveBeatV3["valveClosureLandmarks"] {
  return { MV: null, AoV: null, TV: null, PV: null };
}

function valveFlowFromSampleV3(
  sample: MainWireIntegratedModelAcceptedBeatSampleV3,
  valveId: MainWireIntegratedModelBeatValveIdV3,
): number {
  switch (valveId) {
    case "MV":
      return sample.mitralValveFlowMlPerSec;
    case "AoV":
      return sample.aorticValveFlowMlPerSec;
    case "TV":
      return sample.tricuspidValveFlowMlPerSec;
    case "PV":
      return sample.pulmonaryValveFlowMlPerSec;
  }
}

function completeValveFlowVolumesV3(
  input: ActiveBeatV3["valveFlowVolumes"],
): Readonly<
  Record<
    MainWireIntegratedModelBeatValveIdV3,
    MainWireIntegratedModelValveFlowVolumesV3
  >
> {
  const complete = (
    valveId: MainWireIntegratedModelBeatValveIdV3,
  ): MainWireIntegratedModelValveFlowVolumesV3 => {
    const forwardVolumeMl = input[valveId].forwardVolumeMl;
    const reverseVolumeMl = input[valveId].reverseVolumeMl;
    return Object.freeze({
      forwardVolumeMl,
      reverseVolumeMl,
      netVolumeMl: forwardVolumeMl - reverseVolumeMl,
      sameValveRegurgitantFraction:
        forwardVolumeMl > 0 ? reverseVolumeMl / forwardVolumeMl : null,
    });
  };
  return Object.freeze({
    MV: complete("MV"),
    AoV: complete("AoV"),
    TV: complete("TV"),
    PV: complete("PV"),
  });
}

function completeVentricularValveEventMetricsV3(
  active: ActiveBeatV3,
  side: "left" | "right",
): MainWireIntegratedModelVentricularValveEventMetricsV3 {
  const inletValveId = side === "left" ? "MV" : "TV";
  const semilunarValveId = side === "left" ? "AoV" : "PV";
  const endDiastolic = active.valveClosureLandmarks[inletValveId];
  const endSystolic = active.valveClosureLandmarks[semilunarValveId];
  const isOrderedPair =
    endDiastolic !== null &&
    endSystolic !== null &&
    endDiastolic.timeSec < endSystolic.timeSec &&
    endDiastolic.volumeMl > 0;
  const eventDefinedStrokeVolumeMl = isOrderedPair
    ? endDiastolic.volumeMl - endSystolic.volumeMl
    : null;
  return Object.freeze({
    pressureBasis: "absolute-and-transmural" as const,
    inletValveId,
    semilunarValveId,
    endDiastolic,
    endSystolic,
    eventDefinedStrokeVolumeMl,
    eventDefinedEjectionFraction01:
      eventDefinedStrokeVolumeMl === null
        ? null
        : eventDefinedStrokeVolumeMl / endDiastolic.volumeMl,
  });
}

function legacySemilunarClosureLandmarkV3(
  landmark: MainWireIntegratedModelValveClosureLandmarkV3 | null,
): MainWireIntegratedModelPressureVolumeLandmarkV3 | null {
  return landmark === null
    ? null
    : Object.freeze({
        volumeMl: landmark.volumeMl,
        pressureMmHg: landmark.transmuralPressureMmHg,
        event: "semilunar-valve-closure" as const,
      });
}

function ownBeatAccumulatorCheckpointV3(
  input: unknown,
): MainWireIntegratedModelBeatAccumulatorCheckpointV3 {
  const record = plainExactRecordV3(
    input,
    ["checkpointId", "schemaVersion", "active"],
    "integrated V3 beat accumulator checkpoint",
  );
  if (
    record.checkpointId !==
      MAIN_WIRE_INTEGRATED_MODEL_BEAT_ACCUMULATOR_CHECKPOINT_V3_ID ||
    record.schemaVersion !== 1
  ) {
    throw new Error("unsupported integrated V3 beat accumulator checkpoint");
  }
  return Object.freeze({
    checkpointId: MAIN_WIRE_INTEGRATED_MODEL_BEAT_ACCUMULATOR_CHECKPOINT_V3_ID,
    schemaVersion: 1 as const,
    active: record.active === null ? null : ownActiveBeatV3(record.active),
  });
}

function ownActiveBeatV3(input: unknown): ActiveBeatV3 {
  const record = plainExactRecordV3(
    input,
    [
      "startAtrialCaptureId",
      "startTimeSec",
      "previous",
      "pressureSummaryAccumulators",
      "aorticPressureIntegralMmHgSec",
      "pulmonaryArterialPressureIntegralMmHgSec",
      "leftAtrialPressureIntegralMmHgSec",
      "rightAtrialPressureIntegralMmHgSec",
      "leftVentricularTransmuralPressureVolumePathIntegralMmHgMl",
      "rightVentricularTransmuralPressureVolumePathIntegralMmHgMl",
      "ventricularAbsolutePressureRateExtrema",
      "valveFlowVolumes",
      "valveForwardPressureGradientAccumulators",
      "systemicVenousReturnVolumeMl",
      "pulmonaryVenousReturnVolumeMl",
      "systemicTissueVolumeMl",
      "pulmonaryVolumeMl",
      "maximumAorticPressureMmHg",
      "minimumAorticPressureMmHg",
      "maximumLeftVentricularVolumeMl",
      "minimumLeftVentricularVolumeMl",
      "maximumLeftVentricularLandmark",
      "minimumLeftVentricularLandmark",
      "maximumRightVentricularLandmark",
      "minimumRightVentricularLandmark",
      "valveClosureLandmarks",
    ],
    "integrated V3 active beat checkpoint",
  );
  const startTimeSec = nonnegativeFiniteV3(
    record.startTimeSec,
    "integrated V3 active beat start time",
  );
  const previous = ownBeatSampleV3(record.previous);
  if (previous.timeSec < startTimeSec) {
    throw new Error("integrated V3 active beat sample precedes its start");
  }
  return {
    startAtrialCaptureId: requiredStringV3(
      record.startAtrialCaptureId,
      "integrated V3 active beat capture ID",
    ),
    startTimeSec,
    previous,
    pressureSummaryAccumulators: ownPressureSummaryAccumulatorsRecordV3(
      record.pressureSummaryAccumulators,
      "integrated V3 active beat pressure summary accumulators",
    ),
    aorticPressureIntegralMmHgSec: finiteV3(
      record.aorticPressureIntegralMmHgSec,
      "integrated V3 active beat aortic pressure integral",
    ),
    pulmonaryArterialPressureIntegralMmHgSec: finiteV3(
      record.pulmonaryArterialPressureIntegralMmHgSec,
      "integrated V3 active beat pulmonary pressure integral",
    ),
    leftAtrialPressureIntegralMmHgSec: finiteV3(
      record.leftAtrialPressureIntegralMmHgSec,
      "integrated V3 active beat left atrial pressure integral",
    ),
    rightAtrialPressureIntegralMmHgSec: finiteV3(
      record.rightAtrialPressureIntegralMmHgSec,
      "integrated V3 active beat right atrial pressure integral",
    ),
    leftVentricularTransmuralPressureVolumePathIntegralMmHgMl: finiteV3(
      record.leftVentricularTransmuralPressureVolumePathIntegralMmHgMl,
      "integrated V3 active beat LV transmural pressure-volume path integral",
    ),
    rightVentricularTransmuralPressureVolumePathIntegralMmHgMl: finiteV3(
      record.rightVentricularTransmuralPressureVolumePathIntegralMmHgMl,
      "integrated V3 active beat RV transmural pressure-volume path integral",
    ),
    ventricularAbsolutePressureRateExtrema: ownVentricularPressureRateExtremaV3(
      record.ventricularAbsolutePressureRateExtrema,
      true,
      "integrated V3 active beat ventricular pressure-rate extrema",
    ) as ActiveBeatV3["ventricularAbsolutePressureRateExtrema"],
    valveFlowVolumes: ownMutableValveFlowVolumesRecordV3(
      record.valveFlowVolumes,
      "integrated V3 active beat valve-flow volumes",
    ),
    valveForwardPressureGradientAccumulators:
      ownValveForwardPressureGradientAccumulatorsRecordV3(
        record.valveForwardPressureGradientAccumulators,
        "integrated V3 active beat valve forward pressure gradient accumulators",
      ),
    systemicVenousReturnVolumeMl: finiteV3(
      record.systemicVenousReturnVolumeMl,
      "integrated V3 active beat systemic venous return volume",
    ),
    pulmonaryVenousReturnVolumeMl: finiteV3(
      record.pulmonaryVenousReturnVolumeMl,
      "integrated V3 active beat pulmonary venous return volume",
    ),
    systemicTissueVolumeMl: finiteV3(
      record.systemicTissueVolumeMl,
      "integrated V3 active beat systemic tissue volume",
    ),
    pulmonaryVolumeMl: finiteV3(
      record.pulmonaryVolumeMl,
      "integrated V3 active beat pulmonary volume",
    ),
    maximumAorticPressureMmHg: finiteV3(
      record.maximumAorticPressureMmHg,
      "integrated V3 active beat maximum aortic pressure",
    ),
    minimumAorticPressureMmHg: finiteV3(
      record.minimumAorticPressureMmHg,
      "integrated V3 active beat minimum aortic pressure",
    ),
    maximumLeftVentricularVolumeMl: finiteV3(
      record.maximumLeftVentricularVolumeMl,
      "integrated V3 active beat maximum LV volume",
    ),
    minimumLeftVentricularVolumeMl: finiteV3(
      record.minimumLeftVentricularVolumeMl,
      "integrated V3 active beat minimum LV volume",
    ),
    maximumLeftVentricularLandmark: ownPressureVolumeLandmarkV3(
      record.maximumLeftVentricularLandmark,
      "integrated V3 active beat maximum LV landmark",
      ["maximum-volume"],
    ),
    minimumLeftVentricularLandmark: ownPressureVolumeLandmarkV3(
      record.minimumLeftVentricularLandmark,
      "integrated V3 active beat minimum LV landmark",
      ["minimum-volume-fallback"],
    ),
    maximumRightVentricularLandmark: ownPressureVolumeLandmarkV3(
      record.maximumRightVentricularLandmark,
      "integrated V3 active beat maximum RV landmark",
      ["maximum-volume"],
    ),
    minimumRightVentricularLandmark: ownPressureVolumeLandmarkV3(
      record.minimumRightVentricularLandmark,
      "integrated V3 active beat minimum RV landmark",
      ["minimum-volume-fallback"],
    ),
    valveClosureLandmarks: ownValveClosureLandmarksRecordV3(
      record.valveClosureLandmarks,
      "integrated V3 active beat valve-closure landmarks",
    ),
  };
}

function ownBeatSampleV3(
  input: unknown,
): MainWireIntegratedModelAcceptedBeatSampleV3 {
  const record = plainExactRecordV3(
    input,
    [
      "timeSec",
      "systemicArterialPressureMmHg",
      "pulmonaryVenousPressureMmHg",
      "venaCavaPressureMmHg",
      "aorticPressureMmHg",
      "pulmonaryArterialPressureMmHg",
      "leftAtrialPressureMmHg",
      "rightAtrialPressureMmHg",
      "leftVentricularAbsolutePressureMmHg",
      "rightVentricularAbsolutePressureMmHg",
      "leftVentricularVolumeMl",
      "rightVentricularVolumeMl",
      "leftVentricularTransmuralPressureMmHg",
      "rightVentricularTransmuralPressureMmHg",
      "mitralValveFlowMlPerSec",
      "aorticValveFlowMlPerSec",
      "tricuspidValveFlowMlPerSec",
      "pulmonaryValveFlowMlPerSec",
      "systemicVenousReturnMlPerSec",
      "pulmonaryVenousReturnMlPerSec",
      "systemicTissueFlowMlPerSec",
      "pulmonaryFlowMlPerSec",
    ],
    "integrated V3 beat sample checkpoint",
  );
  return Object.freeze({
    timeSec: nonnegativeFiniteV3(
      record.timeSec,
      "integrated V3 beat sample time",
    ),
    systemicArterialPressureMmHg: finiteV3(
      record.systemicArterialPressureMmHg,
      "systemic arterial pressure",
    ),
    pulmonaryVenousPressureMmHg: finiteV3(
      record.pulmonaryVenousPressureMmHg,
      "pulmonary venous pressure",
    ),
    venaCavaPressureMmHg: finiteV3(
      record.venaCavaPressureMmHg,
      "vena cava pressure",
    ),
    aorticPressureMmHg: finiteV3(record.aorticPressureMmHg, "aortic pressure"),
    pulmonaryArterialPressureMmHg: finiteV3(
      record.pulmonaryArterialPressureMmHg,
      "pulmonary arterial pressure",
    ),
    leftAtrialPressureMmHg: finiteV3(
      record.leftAtrialPressureMmHg,
      "left atrial pressure",
    ),
    rightAtrialPressureMmHg: finiteV3(
      record.rightAtrialPressureMmHg,
      "right atrial pressure",
    ),
    leftVentricularAbsolutePressureMmHg: finiteV3(
      record.leftVentricularAbsolutePressureMmHg,
      "left ventricular absolute pressure",
    ),
    rightVentricularAbsolutePressureMmHg: finiteV3(
      record.rightVentricularAbsolutePressureMmHg,
      "right ventricular absolute pressure",
    ),
    leftVentricularVolumeMl: finiteV3(
      record.leftVentricularVolumeMl,
      "left ventricular volume",
    ),
    rightVentricularVolumeMl: finiteV3(
      record.rightVentricularVolumeMl,
      "right ventricular volume",
    ),
    leftVentricularTransmuralPressureMmHg: finiteV3(
      record.leftVentricularTransmuralPressureMmHg,
      "left ventricular transmural pressure",
    ),
    rightVentricularTransmuralPressureMmHg: finiteV3(
      record.rightVentricularTransmuralPressureMmHg,
      "right ventricular transmural pressure",
    ),
    mitralValveFlowMlPerSec: finiteV3(
      record.mitralValveFlowMlPerSec,
      "mitral valve flow",
    ),
    aorticValveFlowMlPerSec: finiteV3(
      record.aorticValveFlowMlPerSec,
      "aortic valve flow",
    ),
    tricuspidValveFlowMlPerSec: finiteV3(
      record.tricuspidValveFlowMlPerSec,
      "tricuspid valve flow",
    ),
    pulmonaryValveFlowMlPerSec: finiteV3(
      record.pulmonaryValveFlowMlPerSec,
      "pulmonary valve flow",
    ),
    systemicVenousReturnMlPerSec: finiteV3(
      record.systemicVenousReturnMlPerSec,
      "systemic venous return",
    ),
    pulmonaryVenousReturnMlPerSec: finiteV3(
      record.pulmonaryVenousReturnMlPerSec,
      "pulmonary venous return",
    ),
    systemicTissueFlowMlPerSec: finiteV3(
      record.systemicTissueFlowMlPerSec,
      "systemic tissue flow",
    ),
    pulmonaryFlowMlPerSec: finiteV3(
      record.pulmonaryFlowMlPerSec,
      "pulmonary flow",
    ),
  });
}

function ownVentricularLandmarksV3(
  input: unknown,
  label: string,
): MainWireIntegratedModelVentricularPressureVolumeLandmarksV3 {
  const record = plainExactRecordV3(
    input,
    ["pressureBasis", "endDiastolic", "endSystolic"],
    label,
  );
  if (record.pressureBasis !== "transmural") {
    throw new Error(`${label} pressure basis is invalid`);
  }
  return Object.freeze({
    pressureBasis: "transmural" as const,
    endDiastolic: ownPressureVolumeLandmarkV3(
      record.endDiastolic,
      `${label} end diastolic`,
      ["maximum-volume"],
    ) as MainWireIntegratedModelVentricularPressureVolumeLandmarksV3["endDiastolic"],
    endSystolic: ownPressureVolumeLandmarkV3(
      record.endSystolic,
      `${label} end systolic`,
      ["semilunar-valve-closure", "minimum-volume-fallback"],
    ) as MainWireIntegratedModelVentricularPressureVolumeLandmarksV3["endSystolic"],
  });
}

function ownVentricularValveEventMetricsV3(
  input: unknown,
  side: "left" | "right",
  label: string,
): MainWireIntegratedModelVentricularValveEventMetricsV3 {
  const record = plainExactRecordV3(
    input,
    [
      "pressureBasis",
      "inletValveId",
      "semilunarValveId",
      "endDiastolic",
      "endSystolic",
      "eventDefinedStrokeVolumeMl",
      "eventDefinedEjectionFraction01",
    ],
    label,
  );
  const inletValveId = side === "left" ? "MV" : "TV";
  const semilunarValveId = side === "left" ? "AoV" : "PV";
  if (
    record.pressureBasis !== "absolute-and-transmural" ||
    record.inletValveId !== inletValveId ||
    record.semilunarValveId !== semilunarValveId
  ) {
    throw new Error(`${label} identity is invalid`);
  }
  const endDiastolic =
    record.endDiastolic === null
      ? null
      : ownValveClosureLandmarkV3(
          record.endDiastolic,
          inletValveId,
          `${label} end diastolic`,
        );
  const endSystolic =
    record.endSystolic === null
      ? null
      : ownValveClosureLandmarkV3(
          record.endSystolic,
          semilunarValveId,
          `${label} end systolic`,
        );
  const eventDefinedStrokeVolumeMl = nullableFiniteV3(
    record.eventDefinedStrokeVolumeMl,
    `${label} event-defined stroke volume`,
  );
  const eventDefinedEjectionFraction01 = nullableFiniteV3(
    record.eventDefinedEjectionFraction01,
    `${label} event-defined ejection fraction`,
  );
  const hasOrderedPair =
    endDiastolic !== null &&
    endSystolic !== null &&
    endDiastolic.timeSec < endSystolic.timeSec &&
    endDiastolic.volumeMl > 0;
  if (!hasOrderedPair) {
    if (
      eventDefinedStrokeVolumeMl !== null ||
      eventDefinedEjectionFraction01 !== null
    ) {
      throw new Error(`${label} derived values require an ordered event pair`);
    }
  } else {
    const expectedStrokeVolumeMl = endDiastolic.volumeMl - endSystolic.volumeMl;
    const expectedEjectionFraction01 =
      expectedStrokeVolumeMl / endDiastolic.volumeMl;
    if (
      eventDefinedStrokeVolumeMl === null ||
      eventDefinedEjectionFraction01 === null ||
      !approximatelyEqualV3(
        eventDefinedStrokeVolumeMl,
        expectedStrokeVolumeMl,
      ) ||
      !approximatelyEqualV3(
        eventDefinedEjectionFraction01,
        expectedEjectionFraction01,
      )
    ) {
      throw new Error(`${label} derived values are inconsistent`);
    }
  }
  return Object.freeze({
    pressureBasis: "absolute-and-transmural" as const,
    inletValveId,
    semilunarValveId,
    endDiastolic,
    endSystolic,
    eventDefinedStrokeVolumeMl,
    eventDefinedEjectionFraction01,
  });
}

function ownValveClosureLandmarkV3(
  input: unknown,
  expectedValveId: MainWireIntegratedModelBeatValveIdV3,
  label: string,
): MainWireIntegratedModelValveClosureLandmarkV3 {
  const record = plainExactRecordV3(
    input,
    [
      "event",
      "valveId",
      "timeSec",
      "volumeMl",
      "absolutePressureMmHg",
      "transmuralPressureMmHg",
    ],
    label,
  );
  if (
    record.event !== "valve-closure-zero-flow-crossing" ||
    record.valveId !== expectedValveId
  ) {
    throw new Error(`${label} identity is invalid`);
  }
  return Object.freeze({
    event: "valve-closure-zero-flow-crossing" as const,
    valveId: expectedValveId,
    timeSec: nonnegativeFiniteV3(record.timeSec, `${label} time`),
    volumeMl: finiteV3(record.volumeMl, `${label} volume`),
    absolutePressureMmHg: finiteV3(
      record.absolutePressureMmHg,
      `${label} absolute pressure`,
    ),
    transmuralPressureMmHg: finiteV3(
      record.transmuralPressureMmHg,
      `${label} transmural pressure`,
    ),
  });
}

function ownValveClosureLandmarksRecordV3(
  input: unknown,
  label: string,
): ActiveBeatV3["valveClosureLandmarks"] {
  const record = plainExactRecordV3(
    input,
    MAIN_WIRE_INTEGRATED_MODEL_BEAT_VALVE_IDS_V3,
    label,
  );
  const own = (valveId: MainWireIntegratedModelBeatValveIdV3) =>
    record[valveId] === null
      ? null
      : ownValveClosureLandmarkV3(
          record[valveId],
          valveId,
          `${label} ${valveId}`,
        );
  return {
    MV: own("MV"),
    AoV: own("AoV"),
    TV: own("TV"),
    PV: own("PV"),
  };
}

function ownMutableValveFlowVolumesRecordV3(
  input: unknown,
  label: string,
): ActiveBeatV3["valveFlowVolumes"] {
  const record = plainExactRecordV3(
    input,
    MAIN_WIRE_INTEGRATED_MODEL_BEAT_VALVE_IDS_V3,
    label,
  );
  const own = (valveId: MainWireIntegratedModelBeatValveIdV3) => {
    const value = plainExactRecordV3(
      record[valveId],
      ["forwardVolumeMl", "reverseVolumeMl"],
      `${label} ${valveId}`,
    );
    return {
      forwardVolumeMl: nonnegativeFiniteV3(
        value.forwardVolumeMl,
        `${label} ${valveId} forward volume`,
      ),
      reverseVolumeMl: nonnegativeFiniteV3(
        value.reverseVolumeMl,
        `${label} ${valveId} reverse volume`,
      ),
    };
  };
  return {
    MV: own("MV"),
    AoV: own("AoV"),
    TV: own("TV"),
    PV: own("PV"),
  };
}

function ownValveFlowVolumesRecordV3(
  input: unknown,
  label: string,
): Readonly<
  Record<
    MainWireIntegratedModelBeatValveIdV3,
    MainWireIntegratedModelValveFlowVolumesV3
  >
> {
  const record = plainExactRecordV3(
    input,
    MAIN_WIRE_INTEGRATED_MODEL_BEAT_VALVE_IDS_V3,
    label,
  );
  const own = (
    valveId: MainWireIntegratedModelBeatValveIdV3,
  ): MainWireIntegratedModelValveFlowVolumesV3 => {
    const value = plainExactRecordV3(
      record[valveId],
      [
        "forwardVolumeMl",
        "reverseVolumeMl",
        "netVolumeMl",
        "sameValveRegurgitantFraction",
      ],
      `${label} ${valveId}`,
    );
    const forwardVolumeMl = nonnegativeFiniteV3(
      value.forwardVolumeMl,
      `${label} ${valveId} forward volume`,
    );
    const reverseVolumeMl = nonnegativeFiniteV3(
      value.reverseVolumeMl,
      `${label} ${valveId} reverse volume`,
    );
    const netVolumeMl = finiteV3(
      value.netVolumeMl,
      `${label} ${valveId} net volume`,
    );
    const sameValveRegurgitantFraction = nullableFiniteV3(
      value.sameValveRegurgitantFraction,
      `${label} ${valveId} same-valve regurgitant fraction`,
    );
    const expectedRegurgitantFraction =
      forwardVolumeMl > 0 ? reverseVolumeMl / forwardVolumeMl : null;
    if (
      !approximatelyEqualV3(netVolumeMl, forwardVolumeMl - reverseVolumeMl) ||
      (expectedRegurgitantFraction === null
        ? sameValveRegurgitantFraction !== null
        : sameValveRegurgitantFraction === null ||
          !approximatelyEqualV3(
            sameValveRegurgitantFraction,
            expectedRegurgitantFraction,
          ))
    ) {
      throw new Error(`${label} ${valveId} values are inconsistent`);
    }
    return Object.freeze({
      forwardVolumeMl,
      reverseVolumeMl,
      netVolumeMl,
      sameValveRegurgitantFraction,
    });
  };
  return Object.freeze({
    MV: own("MV"),
    AoV: own("AoV"),
    TV: own("TV"),
    PV: own("PV"),
  });
}

function ownPressureSummaryAccumulatorsRecordV3(
  input: unknown,
  label: string,
): ActiveBeatV3["pressureSummaryAccumulators"] {
  const record = plainExactRecordV3(
    input,
    MAIN_WIRE_INTEGRATED_MODEL_BEAT_PRESSURE_NODE_IDS_V3,
    label,
  );
  const own = (nodeId: MainWireIntegratedModelBeatPressureNodeIdV3) => {
    const value = plainExactRecordV3(
      record[nodeId],
      ["integralMmHgSec", "maximumMmHg", "minimumMmHg"],
      `${label} ${nodeId}`,
    );
    const maximumMmHg = finiteV3(
      value.maximumMmHg,
      `${label} ${nodeId} maximum`,
    );
    const minimumMmHg = finiteV3(
      value.minimumMmHg,
      `${label} ${nodeId} minimum`,
    );
    if (maximumMmHg < minimumMmHg) {
      throw new Error(`${label} ${nodeId} extrema are inverted`);
    }
    return {
      integralMmHgSec: finiteV3(
        value.integralMmHgSec,
        `${label} ${nodeId} integral`,
      ),
      maximumMmHg,
      minimumMmHg,
    };
  };
  return {
    LA: own("LA"),
    LV: own("LV"),
    RA: own("RA"),
    RV: own("RV"),
    Ao: own("Ao"),
    SA: own("SA"),
    PA: own("PA"),
    PVein: own("PVein"),
    VC: own("VC"),
  };
}

function ownVentricularPressureRateExtremaV3(
  input: unknown,
  nullable: boolean,
  label: string,
): Readonly<
  Record<
    "LV" | "RV",
    Readonly<{
      maximumMmHgPerSec: number | null;
      minimumMmHgPerSec: number | null;
    }>
  >
> {
  const record = plainExactRecordV3(input, ["LV", "RV"], label);
  const own = (ventricle: "LV" | "RV") => {
    const value = plainExactRecordV3(
      record[ventricle],
      ["maximumMmHgPerSec", "minimumMmHgPerSec"],
      `${label} ${ventricle}`,
    );
    const maximumMmHgPerSec = nullable
      ? nullableFiniteV3(
          value.maximumMmHgPerSec,
          `${label} ${ventricle} maximum`,
        )
      : finiteV3(value.maximumMmHgPerSec, `${label} ${ventricle} maximum`);
    const minimumMmHgPerSec = nullable
      ? nullableFiniteV3(
          value.minimumMmHgPerSec,
          `${label} ${ventricle} minimum`,
        )
      : finiteV3(value.minimumMmHgPerSec, `${label} ${ventricle} minimum`);
    if ((maximumMmHgPerSec === null) !== (minimumMmHgPerSec === null)) {
      throw new Error(`${label} ${ventricle} availability is inconsistent`);
    }
    if (
      maximumMmHgPerSec !== null &&
      minimumMmHgPerSec !== null &&
      maximumMmHgPerSec < minimumMmHgPerSec
    ) {
      throw new Error(`${label} ${ventricle} extrema are inverted`);
    }
    const owned = { maximumMmHgPerSec, minimumMmHgPerSec };
    return nullable ? owned : Object.freeze(owned);
  };
  const owned = { LV: own("LV"), RV: own("RV") };
  return nullable ? owned : Object.freeze(owned);
}

function ownPressureSummariesRecordV3(
  input: unknown,
  label: string,
): MainWireIntegratedModelCompletedBeatMetricsV3["pressureSummaries"] {
  const record = plainExactRecordV3(
    input,
    MAIN_WIRE_INTEGRATED_MODEL_BEAT_PRESSURE_NODE_IDS_V3,
    label,
  );
  const own = (nodeId: MainWireIntegratedModelBeatPressureNodeIdV3) => {
    const value = plainExactRecordV3(
      record[nodeId],
      ["timeWeightedMeanMmHg", "maximumMmHg", "minimumMmHg", "pulseMmHg"],
      `${label} ${nodeId}`,
    );
    const timeWeightedMeanMmHg = finiteV3(
      value.timeWeightedMeanMmHg,
      `${label} ${nodeId} mean`,
    );
    const maximumMmHg = finiteV3(
      value.maximumMmHg,
      `${label} ${nodeId} maximum`,
    );
    const minimumMmHg = finiteV3(
      value.minimumMmHg,
      `${label} ${nodeId} minimum`,
    );
    const pulseMmHg = nonnegativeFiniteV3(
      value.pulseMmHg,
      `${label} ${nodeId} pulse`,
    );
    if (
      maximumMmHg < minimumMmHg ||
      !approximatelyEqualV3(pulseMmHg, maximumMmHg - minimumMmHg)
    ) {
      throw new Error(`${label} ${nodeId} extrema are inconsistent`);
    }
    return Object.freeze({
      timeWeightedMeanMmHg,
      maximumMmHg,
      minimumMmHg,
      pulseMmHg,
    });
  };
  return Object.freeze({
    LA: own("LA"),
    LV: own("LV"),
    RA: own("RA"),
    RV: own("RV"),
    Ao: own("Ao"),
    SA: own("SA"),
    PA: own("PA"),
    PVein: own("PVein"),
    VC: own("VC"),
  });
}

function ownValveForwardPressureGradientAccumulatorsRecordV3(
  input: unknown,
  label: string,
): ActiveBeatV3["valveForwardPressureGradientAccumulators"] {
  const record = plainExactRecordV3(
    input,
    MAIN_WIRE_INTEGRATED_MODEL_BEAT_VALVE_IDS_V3,
    label,
  );
  const own = (valveId: MainWireIntegratedModelBeatValveIdV3) => {
    const value = plainExactRecordV3(
      record[valveId],
      ["forwardFlowDurationSec", "pressureIntegralMmHgSec", "peakMmHg"],
      `${label} ${valveId}`,
    );
    const forwardFlowDurationSec = nonnegativeFiniteV3(
      value.forwardFlowDurationSec,
      `${label} ${valveId} forward duration`,
    );
    const peakMmHg = nullableFiniteV3(
      value.peakMmHg,
      `${label} ${valveId} peak`,
    );
    if ((forwardFlowDurationSec === 0) !== (peakMmHg === null)) {
      throw new Error(`${label} ${valveId} availability is inconsistent`);
    }
    return {
      forwardFlowDurationSec,
      pressureIntegralMmHgSec: finiteV3(
        value.pressureIntegralMmHgSec,
        `${label} ${valveId} integral`,
      ),
      peakMmHg,
    };
  };
  return { MV: own("MV"), AoV: own("AoV"), TV: own("TV"), PV: own("PV") };
}

function ownValveForwardPressureGradientsRecordV3(
  input: unknown,
  label: string,
): MainWireIntegratedModelCompletedBeatMetricsV3["valveForwardPressureGradients"] {
  const record = plainExactRecordV3(
    input,
    MAIN_WIRE_INTEGRATED_MODEL_BEAT_VALVE_IDS_V3,
    label,
  );
  const own = (valveId: MainWireIntegratedModelBeatValveIdV3) => {
    const value = plainExactRecordV3(
      record[valveId],
      ["basis", "forwardFlowDurationSec", "timeWeightedMeanMmHg", "peakMmHg"],
      `${label} ${valveId}`,
    );
    if (
      value.basis !==
      "upstream-minus-downstream-absolute-pressure-during-forward-flow"
    ) {
      throw new Error(`${label} ${valveId} basis is invalid`);
    }
    const forwardFlowDurationSec = nonnegativeFiniteV3(
      value.forwardFlowDurationSec,
      `${label} ${valveId} forward duration`,
    );
    const timeWeightedMeanMmHg = nullableFiniteV3(
      value.timeWeightedMeanMmHg,
      `${label} ${valveId} mean`,
    );
    const peakMmHg = nullableFiniteV3(
      value.peakMmHg,
      `${label} ${valveId} peak`,
    );
    const available = forwardFlowDurationSec > 0;
    if (available !== (timeWeightedMeanMmHg !== null && peakMmHg !== null)) {
      throw new Error(`${label} ${valveId} availability is inconsistent`);
    }
    return Object.freeze({
      basis:
        "upstream-minus-downstream-absolute-pressure-during-forward-flow" as const,
      forwardFlowDurationSec,
      timeWeightedMeanMmHg,
      peakMmHg,
    });
  };
  return Object.freeze({
    MV: own("MV"),
    AoV: own("AoV"),
    TV: own("TV"),
    PV: own("PV"),
  });
}

function ownPressureVolumeLandmarkV3(
  input: unknown,
  label: string,
  allowedEvents: readonly MainWireIntegratedModelPressureVolumeLandmarkV3["event"][],
): MainWireIntegratedModelPressureVolumeLandmarkV3 {
  const record = plainExactRecordV3(
    input,
    ["volumeMl", "pressureMmHg", "event"],
    label,
  );
  if (
    !allowedEvents.includes(
      record.event as MainWireIntegratedModelPressureVolumeLandmarkV3["event"],
    )
  ) {
    throw new Error(`${label} event is invalid`);
  }
  return Object.freeze({
    volumeMl: finiteV3(record.volumeMl, `${label} volume`),
    pressureMmHg: finiteV3(record.pressureMmHg, `${label} pressure`),
    event:
      record.event as MainWireIntegratedModelPressureVolumeLandmarkV3["event"],
  });
}

function plainExactRecordV3(
  input: unknown,
  keys: readonly string[],
  label: string,
): Record<string, unknown> {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new Error(`${label} must be a plain object`);
  }
  const prototype = Object.getPrototypeOf(input);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new Error(`${label} must be a plain object`);
  }
  const ownKeys = Reflect.ownKeys(input);
  if (ownKeys.some((key) => typeof key !== "string")) {
    throw new Error(`${label} contains a non-string key`);
  }
  const actual = [...(ownKeys as string[])].sort();
  const expected = [...keys].sort();
  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  ) {
    throw new Error(`${label} has an unexpected field set`);
  }
  return input as Record<string, unknown>;
}

function requiredStringV3(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${label} must be a nonempty string`);
  }
  return value;
}

function finiteV3(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${label} must be finite`);
  }
  return value;
}

function nullableFiniteV3(value: unknown, label: string): number | null {
  return value === null ? null : finiteV3(value, label);
}

function approximatelyEqualV3(left: number, right: number): boolean {
  return (
    Math.abs(left - right) <=
    1e-12 * Math.max(1, Math.abs(left), Math.abs(right))
  );
}

function negateWithoutNegativeZeroV3(value: number): number {
  return value === 0 ? 0 : -value;
}

function nonnegativeFiniteV3(value: unknown, label: string): number {
  const owned = finiteV3(value, label);
  if (owned < 0) throw new Error(`${label} must be nonnegative`);
  return owned;
}

function positiveFiniteV3(value: unknown, label: string): number {
  const owned = finiteV3(value, label);
  if (owned <= 0) throw new Error(`${label} must be positive`);
  return owned;
}

function interpolateValveClosureV3(
  previous: MainWireIntegratedModelAcceptedBeatSampleV3,
  next: MainWireIntegratedModelAcceptedBeatSampleV3,
  valveId: MainWireIntegratedModelBeatValveIdV3,
  previousFlowMlPerSec: number,
  nextFlowMlPerSec: number,
): MainWireIntegratedModelValveClosureLandmarkV3 {
  const denominator = previousFlowMlPerSec - nextFlowMlPerSec;
  const ratio =
    denominator > 1e-12
      ? Math.max(0, Math.min(1, previousFlowMlPerSec / denominator))
      : 1;
  const interpolate = (left: number, right: number) =>
    left + ratio * (right - left);
  const side = valveId === "MV" || valveId === "AoV" ? "left" : "right";
  return Object.freeze({
    event: "valve-closure-zero-flow-crossing" as const,
    valveId,
    timeSec: interpolate(previous.timeSec, next.timeSec),
    volumeMl:
      side === "left"
        ? interpolate(
            previous.leftVentricularVolumeMl,
            next.leftVentricularVolumeMl,
          )
        : interpolate(
            previous.rightVentricularVolumeMl,
            next.rightVentricularVolumeMl,
          ),
    absolutePressureMmHg:
      side === "left"
        ? interpolate(
            previous.leftVentricularAbsolutePressureMmHg,
            next.leftVentricularAbsolutePressureMmHg,
          )
        : interpolate(
            previous.rightVentricularAbsolutePressureMmHg,
            next.rightVentricularAbsolutePressureMmHg,
          ),
    transmuralPressureMmHg:
      side === "left"
        ? interpolate(
            previous.leftVentricularTransmuralPressureMmHg,
            next.leftVentricularTransmuralPressureMmHg,
          )
        : interpolate(
            previous.rightVentricularTransmuralPressureMmHg,
            next.rightVentricularTransmuralPressureMmHg,
          ),
  });
}

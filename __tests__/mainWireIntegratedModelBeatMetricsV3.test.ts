import { describe, expect, it } from "vitest";

import {
  MAIN_WIRE_INTEGRATED_MODEL_BEAT_ACCUMULATOR_CHECKPOINT_V3_ID,
  MAIN_WIRE_INTEGRATED_MODEL_BEAT_METRICS_V3_ID,
  MainWireIntegratedModelBeatAccumulatorV3,
  forwardPressureGradientIncrementV3,
  pressureVolumePathIntegralIncrementV3,
  signedFlowVolumeIncrementV3,
} from "@/engine/myocardium/MainWireIntegratedModelBeatMetricsV3";
import {
  MAIN_WIRE_FIVE_WALL_ACCEPTED_NUMERICAL_READBACK_COUNT_V1,
  MAIN_WIRE_FIVE_WALL_ACCEPTED_NUMERICAL_READBACK_LAYOUT_V1,
} from "@/engine/myocardium/MainWireFiveWallCoronaryTransactionV2";

describe("Main Wire Integrated Model V3 accepted-step beat metrics", () => {
  it("forks trial integrals independently and preserves checkpoint-equivalent completed beats", () => {
    const original = new MainWireIntegratedModelBeatAccumulatorV3();
    const empty = original.fork();
    original.acceptNumericalReadback(readbackV1(0, 100, 0, { aorticValveFlowMlPerSec: 10 }), "capture/start");
    expect(empty.checkpoint().active).toBeNull();
    const baseline = original.checkpoint();
    const trial = original.fork();
    const reference = MainWireIntegratedModelBeatAccumulatorV3.restore(baseline);
    const next = readbackV1(.1, 120, 80, { aorticValveFlowMlPerSec: -5,
      leftVentricularAbsolutePressureMmHg: 90, aorticPressureMmHg: 80 });
    trial.acceptNumericalReadback(next, null);
    reference.acceptNumericalReadback(next, null);
    expect(original.checkpoint()).toEqual(baseline);
    expect(trial.checkpoint()).toEqual(reference.checkpoint());
    const trialState = trial.checkpoint();
    original.acceptNumericalReadback(readbackV1(.1, 90, 10), null);
    expect(trial.checkpoint()).toEqual(trialState);
    const end = readbackV1(.2, 110, 5);
    expect(trial.acceptNumericalReadback(end, "capture/end"))
      .toEqual(reference.acceptNumericalReadback(end, "capture/end"));
    expect(trial.checkpoint()).toEqual(reference.checkpoint());
  });

  it("integrates positive external work from a counter-clockwise transmural LV PV path", () => {
    const accumulator = new MainWireIntegratedModelBeatAccumulatorV3();
    expect(
      accumulator.acceptNumericalReadback(
        readbackV1(0, 100, 0),
        "capture/start",
      ),
    ).toBeNull();
    expect(
      accumulator.acceptNumericalReadback(readbackV1(0.1, 101, 0), null),
    ).toBeNull();
    expect(
      accumulator.acceptNumericalReadback(readbackV1(0.2, 101, 1), null),
    ).toBeNull();
    expect(
      accumulator.acceptNumericalReadback(readbackV1(0.3, 100, 1), null),
    ).toBeNull();
    const completed = accumulator.acceptNumericalReadback(
      readbackV1(0.4, 100, 0),
      "capture/end",
    );

    expect(completed).toMatchObject({
      metricsId: MAIN_WIRE_INTEGRATED_MODEL_BEAT_METRICS_V3_ID,
      startAtrialCaptureId: "capture/start",
      endAtrialCaptureId: "capture/end",
      leftVentricularTransmuralPressureVolumePathWorkMmHgMl: 1,
    });
  });

  it("does not manufacture a closing segment for a transient open PV path", () => {
    const accumulator = new MainWireIntegratedModelBeatAccumulatorV3();
    accumulator.acceptNumericalReadback(readbackV1(0, 100, 0), "capture/start");
    accumulator.acceptNumericalReadback(readbackV1(0.1, 101, 0), null);
    const completed = accumulator.acceptNumericalReadback(
      readbackV1(0.2, 101, 1),
      "capture/end",
    );

    expect(
      completed?.leftVentricularTransmuralPressureVolumePathWorkMmHgMl,
    ).toBeCloseTo(0, 12);
  });

  it("continues the in-progress PV work ledger exactly across checkpoint restore", () => {
    const uninterrupted = new MainWireIntegratedModelBeatAccumulatorV3();
    uninterrupted.acceptNumericalReadback(
      readbackV1(0, 100, 0),
      "capture/start",
    );
    uninterrupted.acceptNumericalReadback(readbackV1(0.1, 101, 0), null);
    const checkpoint = uninterrupted.checkpoint();
    expect(checkpoint.checkpointId).toBe(
      MAIN_WIRE_INTEGRATED_MODEL_BEAT_ACCUMULATOR_CHECKPOINT_V3_ID,
    );
    const restored =
      MainWireIntegratedModelBeatAccumulatorV3.restore(checkpoint);

    for (const [timeSec, volumeMl, pressureMmHg] of [
      [0.2, 101, 1],
      [0.3, 100, 1],
    ] as const) {
      const sample = readbackV1(timeSec, volumeMl, pressureMmHg);
      expect(uninterrupted.acceptNumericalReadback(sample, null)).toBeNull();
      expect(restored.acceptNumericalReadback(sample, null)).toBeNull();
    }
    const finalSample = readbackV1(0.4, 100, 0);
    const uninterruptedCompleted = uninterrupted.acceptNumericalReadback(
      finalSample,
      "capture/end",
    );
    const restoredCompleted = restored.acceptNumericalReadback(
      finalSample,
      "capture/end",
    );

    expect(restoredCompleted).toEqual(uninterruptedCompleted);
    expect(
      restoredCompleted?.leftVentricularTransmuralPressureVolumePathWorkMmHgMl,
    ).toBe(1);
  });

  it("rejects non-finite pressure-volume path endpoints", () => {
    expect(() =>
      pressureVolumePathIntegralIncrementV3(100, 0, Number.NaN, 1),
    ).toThrow(/nextVolumeMl is not finite/);
  });

  it("splits forward and reverse volume exactly at a linear zero crossing", () => {
    expect(signedFlowVolumeIncrementV3(10, -10, 2)).toEqual({
      forwardVolumeMl: 5,
      reverseVolumeMl: 5,
      netVolumeMl: 0,
    });
    const asymmetric = signedFlowVolumeIncrementV3(-10, 20, 3);
    expect(asymmetric.forwardVolumeMl).toBeCloseTo(20, 12);
    expect(asymmetric.reverseVolumeMl).toBeCloseTo(5, 12);
    expect(asymmetric.netVolumeMl).toBeCloseTo(15, 12);
  });

  it("splits a forward-flow pressure-gradient interval at valve zero flow", () => {
    expect(forwardPressureGradientIncrementV3(10, -10, 20, 0, 2)).toEqual({
      forwardFlowDurationSec: 1,
      pressureIntegralMmHgSec: 15,
      peakMmHg: 20,
    });
    expect(forwardPressureGradientIncrementV3(-10, -5, 10, 20, 2)).toEqual({
      forwardFlowDurationSec: 0,
      pressureIntegralMmHgSec: 0,
      peakMmHg: null,
    });
  });

  it("publishes conventional systemic and pulmonary pressure summaries", () => {
    const accumulator = new MainWireIntegratedModelBeatAccumulatorV3();
    accumulator.acceptNumericalReadback(
      readbackV1(0, 100, 0, {
        systemicArterialPressureMmHg: 80,
        pulmonaryArterialPressureMmHg: 10,
        leftVentricularAbsolutePressureMmHg: 100,
        aorticPressureMmHg: 80,
        aorticValveFlowMlPerSec: 10,
      }),
      "capture/start",
    );
    const completed = accumulator.acceptNumericalReadback(
      readbackV1(1, 100, 0, {
        systemicArterialPressureMmHg: 120,
        pulmonaryArterialPressureMmHg: 30,
        leftVentricularAbsolutePressureMmHg: 120,
        aorticPressureMmHg: 100,
        aorticValveFlowMlPerSec: 10,
      }),
      "capture/end",
    );

    expect(completed?.pressureSummaries.SA).toEqual({
      timeWeightedMeanMmHg: 100,
      maximumMmHg: 120,
      minimumMmHg: 80,
      pulseMmHg: 40,
    });
    expect(completed?.pressureSummaries.PA).toEqual({
      timeWeightedMeanMmHg: 20,
      maximumMmHg: 30,
      minimumMmHg: 10,
      pulseMmHg: 20,
    });
    expect(completed?.valveForwardPressureGradients.AoV).toEqual({
      basis: "upstream-minus-downstream-absolute-pressure-during-forward-flow",
      forwardFlowDurationSec: 1,
      timeWeightedMeanMmHg: 20,
      peakMmHg: 20,
    });
    expect(completed?.ventricularAbsolutePressureRateExtrema.LV).toEqual({
      maximumMmHgPerSec: 20,
      minimumMmHgPerSec: 20,
    });
    expect(
      completed?.rightVentricularTransmuralPressureVolumePathWorkMmHgMl,
    ).toBe(0);
  });

  it("interpolates MV and AoV closure into event-defined LV metrics", () => {
    const accumulator = new MainWireIntegratedModelBeatAccumulatorV3();
    accumulator.acceptNumericalReadback(
      readbackV1(0, 110, 8, {
        leftVentricularAbsolutePressureMmHg: 10,
        mitralValveFlowMlPerSec: 10,
      }),
      "capture/start",
    );
    accumulator.acceptNumericalReadback(
      readbackV1(0.1, 120, 18, {
        leftVentricularAbsolutePressureMmHg: 20,
        mitralValveFlowMlPerSec: -10,
      }),
      null,
    );
    accumulator.acceptNumericalReadback(
      readbackV1(0.2, 115, 95, {
        leftVentricularAbsolutePressureMmHg: 100,
        mitralValveFlowMlPerSec: -10,
        aorticValveFlowMlPerSec: 20,
      }),
      null,
    );
    accumulator.acceptNumericalReadback(
      readbackV1(0.3, 95, 75, {
        leftVentricularAbsolutePressureMmHg: 80,
        aorticValveFlowMlPerSec: -20,
      }),
      null,
    );
    const completed = accumulator.acceptNumericalReadback(
      readbackV1(0.4, 100, 20),
      "capture/end",
    );

    expect(completed?.leftVentricularValveEventMetrics).toEqual({
      pressureBasis: "absolute-and-transmural",
      inletValveId: "MV",
      semilunarValveId: "AoV",
      endDiastolic: {
        event: "valve-closure-zero-flow-crossing",
        valveId: "MV",
        timeSec: 0.05,
        volumeMl: 115,
        absolutePressureMmHg: 15,
        transmuralPressureMmHg: 13,
      },
      endSystolic: {
        event: "valve-closure-zero-flow-crossing",
        valveId: "AoV",
        timeSec: 0.25,
        volumeMl: 105,
        absolutePressureMmHg: 90,
        transmuralPressureMmHg: 85,
      },
      eventDefinedStrokeVolumeMl: 10,
      eventDefinedEjectionFraction01: 10 / 115,
    });
    expect(completed?.rightVentricularValveEventMetrics).toMatchObject({
      endDiastolic: null,
      endSystolic: null,
      eventDefinedStrokeVolumeMl: null,
      eventDefinedEjectionFraction01: null,
    });
    expect(completed?.valveFlowVolumes.AoV.forwardVolumeMl).toBeCloseTo(
      1.5,
      12,
    );
    expect(completed?.valveFlowVolumes.AoV.reverseVolumeMl).toBeCloseTo(
      1.5,
      12,
    );
    expect(completed?.valveFlowVolumes.AoV.netVolumeMl).toBeCloseTo(0, 12);
    expect(
      completed?.valveFlowVolumes.AoV.sameValveRegurgitantFraction,
    ).toBeCloseTo(1, 12);
  });
});

type ReadbackOverridesV1 = Readonly<{
  systemicArterialPressureMmHg?: number;
  pulmonaryArterialPressureMmHg?: number;
  aorticPressureMmHg?: number;
  leftVentricularAbsolutePressureMmHg?: number;
  mitralValveFlowMlPerSec?: number;
  aorticValveFlowMlPerSec?: number;
}>;

function readbackV1(
  timeSec: number,
  leftVentricularVolumeMl: number,
  leftVentricularTransmuralPressureMmHg: number,
  overrides: ReadbackOverridesV1 = {},
): Float64Array {
  const readback = new Float64Array(
    MAIN_WIRE_FIVE_WALL_ACCEPTED_NUMERICAL_READBACK_COUNT_V1,
  );
  const layout = MAIN_WIRE_FIVE_WALL_ACCEPTED_NUMERICAL_READBACK_LAYOUT_V1;
  readback[layout.timeSec] = timeSec;
  for (let chamberIndex = 0; chamberIndex < 4; chamberIndex += 1) {
    readback[layout.chamberVolumeMl + chamberIndex] = 100;
  }
  readback[layout.chamberVolumeMl + 1] = leftVentricularVolumeMl;
  readback[layout.transmuralPressureMmHg + 1] =
    leftVentricularTransmuralPressureMmHg;
  readback[layout.absolutePressureMmHg + 4] = overrides.aorticPressureMmHg ?? 0;
  readback[layout.absolutePressureMmHg + 5] =
    overrides.systemicArterialPressureMmHg ?? 0;
  readback[layout.absolutePressureMmHg + 6] =
    overrides.pulmonaryArterialPressureMmHg ?? 0;
  readback[layout.absolutePressureMmHg + 1] =
    overrides.leftVentricularAbsolutePressureMmHg ?? 0;
  readback[layout.valveFlowMlPerSec] = overrides.mitralValveFlowMlPerSec ?? 0;
  readback[layout.valveFlowMlPerSec + 1] =
    overrides.aorticValveFlowMlPerSec ?? 0;
  return readback;
}

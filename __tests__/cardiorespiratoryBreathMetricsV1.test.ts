import { describe, expect, it } from "vitest";
import { CardiorespiratoryBreathMetricsCollectorV1, CARDIORESPIRATORY_BREATH_REQUIRED_IDS_V1 as required,
  CARDIORESPIRATORY_BREATH_OUTPUT_IDS_V1 as ids, cardiorespiratoryBreathOutputValueV1 } from "@/analysis/methods/cardiorespiratory/CardiorespiratoryBreathMetricsV1";
import type { RegisteredModelPresentationBatchV2 as Batch, StudioSimulationAnalysisV2 } from "@/studio/contracts/v2/simulation";
function batch(first: number, last: number, epoch = 0, signedAorticFlow = 100): Batch {
  const ticks = Array.from({ length: last - first + 1 }, (_, i) => i + first);
  const sample = (i: number) => [Math.floor(i / 2500), 1, Math.sin(2 * Math.PI * i / 2500), signedAorticFlow, signedAorticFlow * 10, 250];
  return { outputIds: required, acceptedRevisions: Float64Array.from(ticks), acceptedTimesSec: Float64Array.from(ticks.map(t => t * .002)),
    outputValues: Float64Array.from(ticks.flatMap(sample)), outputStates: new Uint8Array(ticks.length * required.length),
    terminalFrame: { modelId: "dev", runtimeSessionId: "r", scenarioId: "s", inputEpoch: epoch, acceptedRevision: last, acceptedTimeSec: last * .002, outputs: {} } };
}
describe("complete breath analysis", () => {
  it("integrates the physical waveform over one whole breath and converts units once", () => {
    const result = new CardiorespiratoryBreathMetricsCollectorV1().ingest(batch(0, 5000))!;
    expect(result.payload).toMatchObject({ status: "available", startTimeSec: 5, endTimeSec: 10 });
    const values = (result.payload as { values: Record<string, number> }).values;
    expect(values[ids.inspiredTidalVolume]).toBeCloseTo(5 / Math.PI, 5);
    expect(values[ids.expiredTidalVolume]).toBeCloseTo(5 / Math.PI, 5);
    expect(values[ids.minuteVentilation]).toBeCloseTo(60 / Math.PI, 4);
    expect(values[ids.cardiacOutput]).toBeCloseTo(6, 10);
    expect(values[ids.oxygenDelivery]).toBeCloseTo(1000, 10);
    expect(values[ids.oxygenConsumption]).toBeCloseTo(250, 10);
    expect(values[ids.consumptionDeliveryRatio]).toBeCloseTo(.25, 10);
  });
  it("is invariant to batch partition and never uses a partial first breath", () => {
    const collector = new CardiorespiratoryBreathMetricsCollectorV1();
    let result: StudioSimulationAnalysisV2 | undefined;
    for (let i = 1200; i <= 5000; i += 137) result = collector.ingest(batch(i, Math.min(i + 136, 5000))) ?? result;
    expect(result).toEqual(new CardiorespiratoryBreathMetricsCollectorV1().ingest(batch(0, 5000)));
    expect(new CardiorespiratoryBreathMetricsCollectorV1().ingest(batch(1200, 4800))?.payload).toMatchObject({ status: "unavailable" });
  });
  it.each(["gap", "epoch", "spontaneous", "missing"])("invalidates %s and cannot expose old-window values", defect => {
    const collector = new CardiorespiratoryBreathMetricsCollectorV1();
    collector.ingest(batch(0, 5000));
    const next = batch(defect === "gap" ? 5002 : 5001, 5500, defect === "epoch" ? 1 : 0);
    if (defect === "spontaneous") for (let i = 0; i < next.acceptedTimesSec.length; i++) next.outputValues[i * required.length + 1] = 0;
    if (defect === "missing") next.outputStates[2] = 2;
    const result = collector.ingest(next)!;
    expect(result.payload).toMatchObject({ status: "unavailable" });
    expect(cardiorespiratoryBreathOutputValueV1([result], next.terminalFrame, ids.oxygenDelivery)?.value).toBeNull();
  });
  it("keeps net reverse output signed and does not invent a consumption/delivery ratio", () => {
    const result = new CardiorespiratoryBreathMetricsCollectorV1().ingest(batch(0, 5000, 0, -20))!;
    const values = (result.payload as { values: Record<string, number | null> }).values;
    expect(values[ids.cardiacOutput]).toBeCloseTo(-1.2, 10);
    expect(values[ids.oxygenDelivery]).toBeCloseTo(-200, 10);
    expect(values[ids.consumptionDeliveryRatio]).toBeNull();
  });
});

import { boundCardiorespiratoryControlV1 } from "@/components/workbench/CardiorespiratoryControlBoundsV1";
import { describe, expect, it } from "vitest";
import inherited from "@/studio/integrations/mainWireIntegratedV3/MainWireIntegratedStudioStaticCaseSurfaceV5";
import surface from "@/studio/integrations/cardiorespiratoryV1/CardiorespiratorySurfaceV1";
import { assertModelSurfaceReleaseManifestV1 } from "@/studio/contracts/v2/modelSurface";
import { CARDIORESPIRATORY_PRIMITIVE_SIGNALS_V1, CARDIORESPIRATORY_PRIMITIVE_CONTROLS_V1 } from "@/studio/integrations/cardiorespiratoryV1/CardiorespiratoryCatalogV1";
import { resolveStudioItemPresentationV1 } from "@/studio/presentation/StudioItemPresentationCatalogV1";
import { CardiorespiratoryVariationCollectorV1, CARDIORESPIRATORY_VARIATION_REQUIRED_IDS_V1, evaluateCardiorespiratoryVariationV1, CARDIORESPIRATORY_VARIATION_OUTPUT_IDS_V1 as ids, type CardiorespiratoryVariationSampleV1 as Sample } from "@/analysis/methods/cardiorespiratory/CardiorespiratoryVariationV1";
import type { RegisteredModelPresentationBatchV2, StudioSimulationAnalysisV2 } from "@/studio/contracts/v2/simulation";
import { genericXYDisplayPathV1, genericXYSegmentsV1 } from "@/components/workbench/presentation/GenericXYGraphV1";
const samples = (): Sample[] => Array.from({ length: 10001 }, (_, i) => {
  const t = i * .002, cardiacPhase = i % 500 / 500, amplitude = [40, 50, 60, 50, 40][Math.floor(i / 500) % 5]!;
  return { inputEpoch: 0, acceptedRevision: i, acceptedTimeSec: t, values: {
    "cardiorespiratory.breath-index": Math.floor(i / 2500), "rhythm.phase.regular-sinus": cardiacPhase,
    "hemodynamics.pressure.absolute.Ao": 80 + amplitude * Math.sin(Math.PI * cardiacPhase) ** 2,
    "hemodynamics.flow.valve.AoV": amplitude * Math.sin(Math.PI * cardiacPhase) ** 2,
    "cardiorespiratory.ventilator.controlled": 1, "cardiorespiratory.muscle.active": 0,
  } };
});
describe("cardiorespiratory dev Surface compatibility", () => {
  it("retains every production output, control, graph, knob, protocol and pinned analysis", () => {
    expect(() => assertModelSurfaceReleaseManifestV1(surface)).not.toThrow();
    for (const key of ["exposedExactOutputIds", "controlCatalog", "derivedOutputCatalog", "graphCatalog", "knobCatalog", "protocolCatalog"] as const) {
      for (const item of inherited[key]) expect(surface[key]).toContainEqual(item);
    }
    expect(surface.surfaceReleaseId).not.toBe(inherited.surfaceReleaseId);
  });
  it("gives every new control and signal readable bilingual labels", () => {
    for (const [kind, catalog] of [["control", CARDIORESPIRATORY_PRIMITIVE_CONTROLS_V1], ["output", CARDIORESPIRATORY_PRIMITIVE_SIGNALS_V1]] as const) {
      for (const item of catalog) {
        const itemId = "controlId" in item ? item.controlId : item.outputId;
        for (const locale of ["en", "ja"]) expect(resolveStudioItemPresentationV1({ kind, itemId, locale, fallbackEnglishLabel: itemId }).label).not.toBe(itemId);
      }
    }
  });
});
describe("qualified three-breath PPV/SVV", () => {
  it("uses each complete breath maximum/minimum, then averages across three breaths", () => {
    const result = evaluateCardiorespiratoryVariationV1(samples());
    expect(result.status).toBe("available"); expect(result.breathCount).toBe(3);
    expect((result.values as Record<string, number>)[ids.ppv]).toBeCloseTo(.4, 10);
    expect((result.values as Record<string, number>)[ids.svv]).toBeCloseTo(.4, 10);
    expect(result.interpretation).toContain("not-fluid-responsiveness");
  });
  it.each(["gap", "epoch", "effort", "clock", "regurgitation"])("rejects %s instead of manufacturing a clinical metric", defect => {
    const observations = samples(); const s = observations[4000]!;
    if (defect === "gap") observations.splice(4000, 1);
    if (defect === "epoch") observations[4000] = { ...s, inputEpoch: 1 };
    if (defect === "effort") observations[4000] = { ...s, values: { ...s.values, "cardiorespiratory.muscle.active": 1 } };
    if (defect === "clock") observations[4000] = { ...s, values: { ...s.values, "cardiorespiratory.breath-index": 8 } };
    if (defect === "regurgitation") for (let i = 4000; i < 4250; i++) observations[i] = { ...observations[i]!, values: { ...observations[i]!.values, "hemodynamics.flow.valve.AoV": -200 } };
    expect(evaluateCardiorespiratoryVariationV1(observations).status).toBe("unavailable");
  });
  it("requires complete windows and sufficient beats", () => {
    expect(evaluateCardiorespiratoryVariationV1(samples().slice(0, 7000)).reason).toBe("insufficient-complete-breaths");
    const fastBreaths = samples().map((s, i) => ({ ...s, values: { ...s.values, "cardiorespiratory.breath-index": Math.floor(i / 500) } }));
    expect(evaluateCardiorespiratoryVariationV1(fastBreaths).reason).toBe("fewer-than-three-complete-beats-per-breath");
  });
});
it("generic XY uses simultaneous observations and breaks gaps, phases and epochs without closing or filling", () => {
  const observations = [0, .002, .004, .02, .022, .024].map((time, i) => ({ inputEpoch: i === 5 ? 1 : 0, acceptedRevision: i, acceptedTimeSec: time, presentationTimeSec: time, values: { x: i, y: i + 10, phase: i === 2 ? .1 : .5 } }));
  expect(genericXYSegmentsV1({ id: "t", label: "t", color: "red", samples: observations, xOutputId: "x", yOutputId: "y", cyclePhaseOutputId: "phase" })).toEqual([[[0, 10], [1, 11]], [[2, 12]], [[3, 13], [4, 14]], [[5, 15]]]);
});

it("XY display coalescing retains paired coordinate extrema and chronology inside each subpixel run", () => {
  const points: readonly (readonly [number, number])[] = Object.freeze([
    [.3, .3], [.31, .31], [.1, .2], [.2, .1], [.6, .4], [.4, .65], [.42, .42], [.4, .4],
  ].map(p => Object.freeze(p) as readonly [number, number]));
  expect(genericXYDisplayPathV1(points, x => x, y => y)).toBe("M0.30,0.30 L0.10,0.20 L0.20,0.10 L0.60,0.40 L0.40,0.65 L0.40,0.40");
  expect(points).toHaveLength(8);
  expect(genericXYDisplayPathV1([[.1, .1], [1, .1], [.2, .2]], x => x, y => y)).toBe("M0.10,0.10 L1.00,0.10 L0.20,0.20");
});

it("XY display coalescing bounds a dense subpixel path without reducing its source or joining missing-data gaps", () => {
  const points: readonly [number, number][] = Array.from({ length: 10000 }, (_, i) => [i / 9999 * .5, .2]);
  expect(genericXYDisplayPathV1(points, x => x, y => y)).toBe("M0.00,0.20 L0.50,0.20");
  expect(points).toHaveLength(10000);
  const samples = [0, 1, 2].map(i => ({ inputEpoch: 0, acceptedRevision: i, acceptedTimeSec: i * .002, presentationTimeSec: i * .002,
    values: { x: i, y: i === 1 ? NaN : i, phase: .5 } }));
  const paths = genericXYSegmentsV1({ id: "t", label: "t", color: "red", samples, xOutputId: "x", yOutputId: "y", cyclePhaseOutputId: "phase" })
    .map(segment => genericXYDisplayPathV1(segment, x => x, y => y));
  expect(paths).toEqual(["M0.00,0.00", "M2.00,2.00"]);
});

it("PPV/SVV collector is batch-partition invariant and invalidates a broken stream immediately", () => {
  const observations = samples();
  const pack = (rows: Sample[]): RegisteredModelPresentationBatchV2 => {
    const last = rows.at(-1)!;
    return { outputIds: CARDIORESPIRATORY_VARIATION_REQUIRED_IDS_V1, acceptedRevisions: new Float64Array(rows.map(s => s.acceptedRevision)), acceptedTimesSec: new Float64Array(rows.map(s => s.acceptedTimeSec)), outputStates: new Uint8Array(rows.length * CARDIORESPIRATORY_VARIATION_REQUIRED_IDS_V1.length), outputValues: new Float64Array(rows.flatMap(s => CARDIORESPIRATORY_VARIATION_REQUIRED_IDS_V1.map(id => s.values[id]!))), terminalFrame: { modelId: "dev", runtimeSessionId: "r", scenarioId: "s", inputEpoch: last.inputEpoch, acceptedRevision: last.acceptedRevision, acceptedTimeSec: last.acceptedTimeSec, outputs: {} } };
  };
  const one = new CardiorespiratoryVariationCollectorV1(), split = new CardiorespiratoryVariationCollectorV1();
  const single = one.ingest(pack(observations)); let partitioned: StudioSimulationAnalysisV2 | undefined;
  for (let i = 0; i < observations.length; i += 137) partitioned = split.ingest(pack(observations.slice(i, i + 137))) ?? partitioned;
  expect(partitioned).toEqual(single);
  const last = observations.at(-1)!;
  const gap = split.ingest(pack([{ ...last, acceptedRevision: last.acceptedRevision + 2, acceptedTimeSec: last.acceptedTimeSec + .004 }]));
  expect(gap?.payload).toMatchObject({ status: "unavailable", reason: "noncontinuous-observation-window" });
});

it("limits interacting ventilation sliders to valid tuples without changing other settings", () => {
  const values = (items: Record<string, number>) => Object.fromEntries(Object.entries(items).map(([key, value]) => [`cardiorespiratory.ventilator.${key}`, { status: "value" as const, value }]));
  const controls = (id: string) => CARDIORESPIRATORY_PRIMITIVE_CONTROLS_V1.find(c => c.controlId === `cardiorespiratory.ventilator.${id}`)!;
  expect(boundCardiorespiratoryControlV1(controls("rate"), [values({ "inspiratory-time": 3 })])?.maximum).toBe(19);
  expect(boundCardiorespiratoryControlV1(controls("inspiratory-time"), [values({ rate: 40, "inspiratory-hold": .8 })])).toMatchObject({ minimum: .9, maximum: 1.4 });
  expect(boundCardiorespiratoryControlV1(controls("inspiratory-hold"), [values({ "inspiratory-time": 1 }), values({ "inspiratory-time": .5 })])?.maximum).toBe(.4);
  expect(boundCardiorespiratoryControlV1(controls("peep"), [values({ "pressure-limit": 10 })])?.maximum).toBe(10);
  expect(boundCardiorespiratoryControlV1(controls("pressure-limit"), [values({ peep: 18 })])?.minimum).toBe(18);
  expect(boundCardiorespiratoryControlV1(controls("inspiratory-time"), [
    values({ rate: 12, "inspiratory-time": 2.5, "inspiratory-hold": 2 }),
    values({ rate: 40, "inspiratory-time": 1, "inspiratory-hold": 0 }),
  ])).toBeNull();
});


it("retains a rolling PPV window at the minimum 3/min ventilator rate", () => {
  const template = samples();
  const observations: Sample[] = Array.from({ length: 50001 }, (_, i) => ({
    ...template[i % 10000]!, acceptedRevision: i, acceptedTimeSec: i * .002,
    values: { ...template[i % 10000]!.values, "cardiorespiratory.breath-index": Math.floor(i / 10000) },
  }));
  const collector = new CardiorespiratoryVariationCollectorV1();
  let result: StudioSimulationAnalysisV2 | undefined;
  for (let start = 0; start < observations.length; start += 1000) {
    const rows = observations.slice(start, start + 1000), last = rows.at(-1)!;
    result = collector.ingest({ outputIds: CARDIORESPIRATORY_VARIATION_REQUIRED_IDS_V1,
      acceptedRevisions: Float64Array.from(rows.map(s => s.acceptedRevision)),
      acceptedTimesSec: Float64Array.from(rows.map(s => s.acceptedTimeSec)),
      outputStates: new Uint8Array(rows.length * CARDIORESPIRATORY_VARIATION_REQUIRED_IDS_V1.length),
      outputValues: Float64Array.from(rows.flatMap(s => CARDIORESPIRATORY_VARIATION_REQUIRED_IDS_V1.map(id => s.values[id]!))),
      terminalFrame: { modelId: "dev", runtimeSessionId: "r", scenarioId: "s", inputEpoch: 0,
        acceptedRevision: last.acceptedRevision, acceptedTimeSec: last.acceptedTimeSec, outputs: {} },
    }) ?? result;
  }
  expect(result?.payload).toMatchObject({ status: "available", startTimeSec: 40, endTimeSec: 100 });
});

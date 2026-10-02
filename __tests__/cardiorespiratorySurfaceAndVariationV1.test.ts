import { CARDIORESPIRATORY_MECHANICAL_ANALYSIS_V1_ID, CARDIORESPIRATORY_MECHANICAL_PVA_V1_ID } from "@/analysis/methods/cardiorespiratory/CardiorespiratoryMechanicalAnalysisV1";
import { resolveRegisteredAnalysisMethodsV1 } from "@/analysis/registry/RegisteredAnalysisMethodsV1";
import { boundCardiorespiratoryControlV1 } from "@/components/workbench/CardiorespiratoryControlBoundsV1";
import { describe, expect, it, vi } from "vitest";
import inherited from "@/studio/integrations/mainWireIntegratedV3/MainWireIntegratedStudioStaticCaseSurfaceV5";
import surface from "@/studio/integrations/cardiorespiratoryV1/CardiorespiratorySurfaceV1";
import { assertModelSurfaceReleaseManifestV1 } from "@/studio/contracts/v2/modelSurface";
import { CARDIORESPIRATORY_PRIMITIVE_SIGNALS_V1, CARDIORESPIRATORY_PRIMITIVE_CONTROLS_V1 } from "@/studio/integrations/cardiorespiratoryV1/CardiorespiratoryCatalogV1";
import { resolveStudioItemPresentationV1 } from "@/studio/presentation/StudioItemPresentationCatalogV1";
import { CardiorespiratoryVariationCollectorV1, CARDIORESPIRATORY_VARIATION_REQUIRED_IDS_V1, evaluateCardiorespiratoryVariationV1, CARDIORESPIRATORY_VARIATION_OUTPUT_IDS_V1 as ids, type CardiorespiratoryVariationSampleV1 as Sample } from "@/analysis/methods/cardiorespiratory/CardiorespiratoryVariationV1";
import type { RegisteredModelPresentationBatchV2, StudioSimulationAnalysisV2 } from "@/studio/contracts/v2/simulation";
import { GenericXYGeometryCacheV1, type GenericXYGeometryV1, type GenericXYTraceV1, genericXYSegmentsV1 } from "@/components/workbench/presentation/GenericXYGraphV1";
import { GenericXYCanvasPathCacheV1, forEachGenericXYDisplayPointV1, genericXYCanvasViewportV1 } from "@/components/workbench/presentation/GenericXYCanvasRendererV1";
import { WorkbenchScenarioPresentationSampleStoreV3 } from "@/components/workbench/presentation/WorkbenchPresentationSampleStoreV3";
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
  it("retains every production item with explicit fixed-respiratory source and PVA substitutions", () => {
    expect(() => assertModelSurfaceReleaseManifestV1(surface)).not.toThrow();
    for (const key of ["exposedExactOutputIds", "controlCatalog", "knobCatalog", "protocolCatalog"] as const) {
      for (const item of inherited[key]) expect(surface[key]).toContainEqual(item);
    }
    expect(surface.derivedOutputCatalog.map(x => x.outputId)).toEqual(expect.arrayContaining(inherited.derivedOutputCatalog.map(x => x.outputId)));
    expect(surface.graphCatalog.map(x => x.graphId)).toEqual(expect.arrayContaining(inherited.graphCatalog.map(x => x.graphId)));
    for (const graph of inherited.graphCatalog) {
      const current = surface.graphCatalog.find(x => x.graphId === graph.graphId)!;
      expect(current.renderer).toBe(graph.renderer);
      if (current.renderer === "structural-return") expect(current.analysisId).toBe(CARDIORESPIRATORY_MECHANICAL_ANALYSIS_V1_ID);
    }
    expect(resolveRegisteredAnalysisMethodsV1(surface).periodicPvaDerivation).toMatchObject({
      methodId: CARDIORESPIRATORY_MECHANICAL_PVA_V1_ID, sourceAnalysisId: CARDIORESPIRATORY_MECHANICAL_ANALYSIS_V1_ID,
    });
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

const xyDisplayPoints = (points: readonly (readonly [number, number])[]) => {
  const result: (readonly [number, number])[] = [];
  forEachGenericXYDisplayPointV1(points, x => x, y => y, point => result.push(point));
  return result;
};

it("XY display coalescing retains paired coordinate extrema and chronology inside each subpixel run", () => {
  const points: readonly (readonly [number, number])[] = Object.freeze([
    [.3, .3], [.31, .31], [.1, .2], [.2, .1], [.6, .4], [.4, .65], [.42, .42], [.4, .4],
  ].map(p => Object.freeze(p) as readonly [number, number]));
  expect(xyDisplayPoints(points)).toEqual([[.3, .3], [.1, .2], [.2, .1], [.6, .4], [.4, .65], [.4, .4]]);
  expect(points).toHaveLength(8);
  expect(xyDisplayPoints([[.1, .1], [1, .1], [.2, .2]])).toEqual([[.1, .1], [1, .1], [.2, .2]]);
});

it("XY display coalescing bounds a dense subpixel path without reducing its source or joining missing-data gaps", () => {
  const points: readonly [number, number][] = Array.from({ length: 10000 }, (_, i) => [i / 9999 * .5, .2]);
  expect(xyDisplayPoints(points)).toEqual([[0, .2], [.5, .2]]);
  expect(points).toHaveLength(10000);
  const samples = [0, 1, 2].map(i => ({ inputEpoch: 0, acceptedRevision: i, acceptedTimeSec: i * .002, presentationTimeSec: i * .002,
    values: { x: i, y: i === 1 ? NaN : i, phase: .5 } }));
  const paths = genericXYSegmentsV1({ id: "t", label: "t", color: "red", samples, xOutputId: "x", yOutputId: "y", cyclePhaseOutputId: "phase" })
    .map(xyDisplayPoints);
  expect(paths).toEqual([[[0, 0]], [[2, 2]]]);
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


describe("incremental XY display geometry", () => {
  const makeTrace = (): GenericXYTraceV1 => ({ id: "t", label: "t", color: "red", xOutputId: "x", yOutputId: "y", cyclePhaseOutputId: "phase",
    samples: Array.from({ length: 1800 }, (_, i) => Object.freeze({ inputEpoch: 0, acceptedRevision: i, acceptedTimeSec: i * .002,
      presentationTimeSec: i * .002, values: Object.freeze({ x: Math.sin(i / 100), y: Math.cos(i / 100), phase: (i % 333) / 333, other: i }) })) });
  const edges = (segments: readonly (readonly (readonly [number, number])[])[]) => segments.flatMap(segment =>
    segment.slice(1).map((point, index) => [segment[index], point]));
  const assertGeometry = (geometry: GenericXYGeometryV1, trace: GenericXYTraceV1) => {
    const expected = genericXYSegmentsV1(trace), points = expected.flat();
    expect(edges(geometry.chunks.flatMap(chunk => chunk.segments))).toEqual(edges(expected));
    expect(geometry.pointCount).toBe(points.length);
    expect(geometry.minimumX).toBe(Math.min(...points.map(point => point[0])));
    expect(geometry.maximumX).toBe(Math.max(...points.map(point => point[0])));
    expect(geometry.minimumY).toBe(Math.min(...points.map(point => point[1])));
    expect(geometry.maximumY).toBe(Math.max(...points.map(point => point[1])));
  };

  it("reuses chunks from the production presentation store after another delivery", () => {
    const trace = makeTrace(), store = new WorkbenchScenarioPresentationSampleStoreV3();
    const cache = new GenericXYGeometryCacheV1();
    store.append("s", trace.samples.slice(0, 1500));
    const before = cache.project({ ...trace, samples: store.getScenarioExactOrbitSnapshot("s") });
    store.append("s", trace.samples.slice(1500, 1532));
    const after = cache.project({ ...trace, samples: store.getScenarioExactOrbitSnapshot("s") });
    expect(before.chunks.length).toBeGreaterThan(3);
    for (let i = 1; i < before.chunks.length - 1; i++) expect(after.chunks[i]).toBe(before.chunks[i]);
  });

  it("reuses interior observed geometry while both window ends move", () => {
    const trace = makeTrace(), cache = new GenericXYGeometryCacheV1();
    const before = cache.project({ ...trace, samples: trace.samples.slice(0, 1500) });
    const window = { ...trace, samples: trace.samples.slice(8, 1508) }, after = cache.project(window);
    assertGeometry(after, window);
    expect(after.chunks.slice(1, -1)).toEqual(before.chunks.slice(1, -1));
    for (let i = 1; i < after.chunks.length - 1; i++) expect(after.chunks[i]).toBe(before.chunks[i]);
    expect(trace.samples).toHaveLength(1800);
  });

  it.each(["missing", "epoch", "gap", "phase", "revision"].flatMap(defect => [255, 256].map(index => [defect, index] as const)))("preserves a %s break at chunk-boundary index %i", (defect, index) => {
    const trace = makeTrace(), rows = [...trace.samples], sample = rows[index]!;
    rows[index] = { ...sample,
      inputEpoch: defect === "epoch" ? 1 : sample.inputEpoch,
      acceptedTimeSec: defect === "gap" ? sample.acceptedTimeSec + .01 : sample.acceptedTimeSec,
      acceptedRevision: defect === "revision" ? 0 : sample.acceptedRevision,
      values: { ...sample.values, y: defect === "missing" ? null : sample.values.y!, phase: defect === "phase" ? 0 : sample.values.phase! } };
    const changed = { ...trace, samples: rows }, cache = new GenericXYGeometryCacheV1();
    cache.project(trace);
    assertGeometry(cache.project(changed), changed);
  });

  it("detects changed interior observations and rebinds outputs without relying only on endpoint clocks", () => {
    const trace = makeTrace(), cache = new GenericXYGeometryCacheV1();
    const before = cache.project(trace), rows = [...trace.samples], sample = rows[600]!;
    rows[600] = { ...sample, values: { ...sample.values, y: 123 } };
    const changed = { ...trace, samples: rows }, after = cache.project(changed);
    assertGeometry(after, changed);
    expect(after.chunks[2]).not.toBe(before.chunks[2]);
    expect(after.chunks[3]).toBe(before.chunks[3]);
    const rebound = { ...changed, xOutputId: "other" };
    assertGeometry(cache.project(rebound), rebound);
    const reset = { ...trace, samples: trace.samples.slice(0, 20).map(sample => ({ ...sample, inputEpoch: 1 })) };
    assertGeometry(cache.project(reset), reset);
    expect(cache.project({ ...trace, samples: [] }).pointCount).toBe(0);
  });

  it.each(["mutable-values", "getter-values", "mutable-clock"])("does not cache a %s observation or its outgoing chunk boundary", defect => {
    const trace = makeTrace(), rows = [...trace.samples], original = rows[255]!;
    let value = original.values.y!;
    const mutableValues = { ...original.values };
    const getterValues = Object.freeze({ ...original.values, get y() { return value; } });
    const mutableSample = { ...original };
    rows[255] = defect === "mutable-clock" ? mutableSample : Object.freeze({ ...original,
      values: defect === "getter-values" ? getterValues : mutableValues });
    const changed = { ...trace, samples: rows }, cache = new GenericXYGeometryCacheV1();
    cache.project(changed);
    if (defect === "mutable-values") mutableValues.y = 99;
    else if (defect === "getter-values") value = 99;
    else mutableSample.acceptedTimeSec += .01;
    assertGeometry(cache.project(changed), changed);
  });


});


describe("retained XY Canvas display", () => {
  it("aligns Canvas with the SVG axes for wide and tall dock panels", () => {
    expect(genericXYCanvasViewportV1(1240, 750)).toEqual({ scale: 2, offsetX: 0, offsetY: 0 });
    expect(genericXYCanvasViewportV1(1240, 375)).toEqual({ scale: 1, offsetX: 310, offsetY: 0 });
    expect(genericXYCanvasViewportV1(620, 750)).toEqual({ scale: 1, offsetX: 0, offsetY: 187.5 });
  });

  it("emits original paired extrema in order, including a reversal inside one visual cell", () => {
    const points = [[.3, .3], [.1, .2], [.2, .1], [.6, .4], [.4, .65], [.4, .4]] as const;
    const retained: (readonly [number, number])[] = [];
    forEachGenericXYDisplayPointV1(points, x => x, y => y, point => retained.push(point));
    expect(retained).toEqual(points);
    for (let i = 0; i < points.length; i++) expect(retained[i]).toBe(points[i]);
  });

  it("reuses native chunk paths while retaining gaps, exact pairs, and a fixed-stroke affine projection", () => {
    type Command = readonly ["M" | "L", number, number];
    class Matrix { constructor(readonly values: number[]) {} }
    let lineCommands = 0;
    class NativePath {
      commands: Command[] = [];
      moveTo(x: number, y: number) { this.commands.push(["M", x, y]); lineCommands++; }
      lineTo(x: number, y: number) { this.commands.push(["L", x, y]); lineCommands++; }
      addPath(path: NativePath, matrix: Matrix) {
        const [a, b, c, d, e, f] = matrix.values;
        for (const [kind, x, y] of path.commands) this.commands.push([kind, a * x + c * y + e, b * x + d * y + f]);
      }
    }
    vi.stubGlobal("Path2D", NativePath); vi.stubGlobal("DOMMatrix", Matrix);
    try {
      const samples = Array.from({ length: 550 }, (_, i) => Object.freeze({ inputEpoch: i < 256 ? 0 : 1,
        acceptedRevision: i, acceptedTimeSec: .002 * i, presentationTimeSec: .002 * i,
        values: Object.freeze({ x: i, y: 2 * i, phase: i / 1000 }) }));
      const trace = { id: "t", label: "t", color: "red", samples, xOutputId: "x", yOutputId: "y", cyclePhaseOutputId: "phase" };
      const geometry = new GenericXYGeometryCacheV1().project(trace), cache = new GenericXYCanvasPathCacheV1();
      const projection = { scaleX: 2, scaleY: -3, offsetX: 70, offsetY: 320, displayScale: 1 };
      const first = cache.project(geometry, projection);
      const commands = (first.path as unknown as NativePath).commands;
      expect(commands[0]).toEqual(["M", 70, 320]);
      expect(commands).toContainEqual(["M", 582, -1216]);
      expect(commands).not.toContainEqual(["L", 582, -1216]);
      for (const [, x, y] of commands) expect((320 - y) / 3).toBe(2 * ((x - 70) / 2));
      const initiallyBuilt = lineCommands;
      const shifted = cache.project(geometry, { ...projection, offsetX: 71 });
      expect(lineCommands).toBe(initiallyBuilt);
      expect((shifted.path as unknown as NativePath).commands[0]).toEqual(["M", 71, 320]);
      cache.project(geometry, { ...projection, scaleX: 20 });
      expect(lineCommands).toBeGreaterThan(initiallyBuilt);
    } finally { vi.unstubAllGlobals(); }
  });
});

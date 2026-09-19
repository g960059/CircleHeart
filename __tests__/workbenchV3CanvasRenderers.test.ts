import { describe, expect, it, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import "@/i18n";
import * as canvasRuntime from "@/components/workbench/presentation/WorkbenchCanvasRuntimeV3";
import { PressureVolumeLoopCanvasV3 } from "@/components/workbench/presentation/PressureVolumeLoopCanvasV3";
import { WorkbenchCompletedCycleBufferV3 } from "@/components/workbench/presentation/WorkbenchCompletedCycleBufferV3";
import { workbenchPvTrailAlphaV3, workbenchPvInputTransitionV3, workbenchPvHistoryLayersV3, projectWorkbenchPvHistoryV3 } from "@/components/workbench/presentation/PressureVolumeLoopCanvasV3";
import { workbenchManualChartDomainV3 } from "@/components/workbench/presentation/WorkbenchManualChartDomainV3";
import { nextZeroBasedPvDomainV3, workbenchPvLoopDomainPointsV3 } from "@/components/workbench/presentation/PressureVolumeLoopCanvasV3";
import { pvCompactPressureAxisTitleV3, pvPressureAxisTitleV3 } from "@/components/workbench/presentation/PressureVolumeLoopCanvasV3";

import {
  WORKBENCH_PRESENTATION_SAMPLE_CAPACITY_V3,
  WORKBENCH_PRESENTATION_HISTORY_MAX_DEPTH_V3,
  WORKBENCH_SWEEP_FORWARD_GAP_FRACTION_V3,
  WorkbenchScenarioPresentationSampleStoreV3,
  appendWorkbenchPresentationSamplesV3,
  appendWorkbenchExactOrbitSamplesV3,
  buildPvBackBufferRemainderV3,
  buildSweepingWaveformSegmentsV3,
  buildWorkbenchTraceLegendModelV3,
  boundedCanvasPixelRatioV3,
  createWorkbenchCanvasFrameSchedulerV3,
  drawWorkbenchLeadingCapV3,
  extractLivePvTrajectoryV3,
  firstSampleAtOrAfterV3,
  guytonZeroFlowPresentationMaximumV3,
  guytonStarlingPlotDomainV3,
  isWorkbenchPresentationSampleV3,
  lastCompleteCycleRangeV3,
  latestSweepingWaveformPointV3,
  mixOpaqueWorkbenchCanvasColorV3,
  nextStableNumericDomainStateV3,
  niceNumericDomainV3,
  numericTicksV3,
  orderedFiniteWorkbenchSamplesV3,
  projectHistoricalPvEpochV3,
  readWorkbenchCanvasThemeVariablesV3,
  workbenchHistoryAlphaV3,
  workbenchDefaultScenarioColorV3,
  reconcileWorkbenchGraphColorsV3,
  resolveWorkbenchAutomaticGraphColorV3,
  resolveWorkbenchGraphTraceStyleV3,
  starlingCurveSegmentsV3,
  starlingPresentationFocusV3,
  updateWorkbenchScenarioBaseColorV3,
  workbenchPerceptualColorDistanceV3,
  workbenchSemanticItemColorV3,
  workbenchModelCyclePhaseOutputIdV3,
  workbenchPresentationOutputSelectionV3,
  type WorkbenchPvPointV3,
  type WorkbenchScalarSampleV3,
} from "@/components/workbench/presentation";
import type { MainWireIntegratedModelStructuralReturnOrientationV3 } from "@/analysis/methods/mainWire/MainWireGuytonStarlingOrientationV3";
import type {
  ExperimentSurfaceGraphPaneV2,
  ExperimentSurfaceV2,
} from "@/studio/contracts/v2/content";
import type { ModelContractV2 } from "@/studio/contracts/v2/model";

const TEST_CYCLE_PHASE_OUTPUT_ID_V3 = "custom.clock/cycle-fraction";

const sampleV3 = (
  acceptedTimeSec: number,
  cyclePhase01: number | null,
  values: Readonly<Record<string, number | null>>,
  identity: Readonly<{
    inputEpoch?: number;
    acceptedRevision?: number;
    presentationTimeSec?: number;
  }> = {},
): WorkbenchScalarSampleV3 =>
  Object.freeze({
    inputEpoch: identity.inputEpoch ?? 0,
    acceptedRevision:
      identity.acceptedRevision ??
      Math.max(0, Math.round(acceptedTimeSec / 0.002)),
    acceptedTimeSec,
    presentationTimeSec: identity.presentationTimeSec ?? acceptedTimeSec,
    values: Object.freeze({
      ...values,
      [TEST_CYCLE_PHASE_OUTPUT_ID_V3]: cyclePhase01,
    }),
  });

describe("V3-neutral Workbench Canvas helpers", () => {
  it.each([0.2, 0.6])("draws every focused PV layer last when the other scenario is at phase %s", otherPhase => {
    const store = new WorkbenchScenarioPresentationSampleStoreV3();
    store.setCyclePhaseOutputId(TEST_CYCLE_PHASE_OUTPUT_ID_V3);
    for (const [id, phase] of [["a", 0.2], ["b", otherPhase]] as const) {
      store.append(id, Array.from({ length: 601 }, (_, index) => sampleV3(index / 500, (index % 500) / 500,
        { volume: 95 + 10 * Math.cos(2 * Math.PI * index / 500), pressure: 45 + 40 * Math.sin(2 * Math.PI * index / 500) })));
      store.append(id, Array.from({ length: Math.round((2 + phase) * 500) + 1 }, (_, index) =>
        sampleV3((600 + index) / 500, (index % 500) / 500, {
          volume: 100 + 10 * Math.cos(2 * Math.PI * index / 500),
          pressure: 50 + 40 * Math.sin(2 * Math.PI * index / 500),
        }, { inputEpoch: 1 })));
    }
    const snapshot = store.getPressureVolumeSnapshot();
    const strokes: { color: string; alpha: number; points: number }[] = [];
    const states: { strokeStyle: string; globalAlpha: number; lineWidth: number }[] = [];
    let points = 0;
    const context = {
      strokeStyle: "", globalAlpha: 1, lineWidth: 1,
      save() { states.push({ strokeStyle: this.strokeStyle, globalAlpha: this.globalAlpha, lineWidth: this.lineWidth }); },
      restore() { Object.assign(this, states.pop()); },
      beginPath() { points = 0; }, moveTo() { points += 1; }, lineTo() { points += 1; },
      stroke() {
        if (points > 1 && ["#ff0000", "#0000ff"].includes(this.strokeStyle)) {
          strokes.push({ color: this.strokeStyle, alpha: this.globalAlpha, points });
        }
      },
      setLineDash() {}, rect() {}, clip() {}, arc() {}, fill() {},
      fillText() {}, strokeRect() {}, translate() {}, rotate() {},
      measureText(text: string) { return { width: text.length * 6 }; },
    };
    const frame = vi.spyOn(canvasRuntime, "useResponsiveCanvasFrameV3").mockImplementation((_container, _canvas, draw) => {
      draw(context as unknown as CanvasRenderingContext2D, 800, 500);
    });
    const useState = React.useState;
    let focused = false;
    const state = vi.spyOn(React, "useState").mockImplementation(((initial: unknown) => {
      const result = useState(initial);
      if (initial === null && !focused) {
        focused = true;
        return [{ kind: "scenario", scenarioId: "a" }, result[1]];
      }
      return result;
    }) as typeof React.useState);
    try {
      renderToStaticMarkup(React.createElement(PressureVolumeLoopCanvasV3, {
        periodicPvaSupported: false,
        traces: ["a", "b"].map(id => ({
          scenarioId: id, scenarioLabel: id, scenarioStyleIndex: 0,
          chamberId: "LV", chamberLabel: "LV", chamberColor: id === "a" ? "#ff0000" : "#0000ff",
          volumeOutputId: "volume", pressureOutputId: "pressure", pressureBasis: "transmural" as const,
          cyclePhaseOutputId: TEST_CYCLE_PHASE_OUTPUT_ID_V3,
          samples: snapshot.exactOrbitSamplesByScenarioId[id]!,
          historyEpochs: snapshot.orbitHistoryByScenarioId[id]!,
          cyclePosition: snapshot.cyclePositionByScenarioId[id]!,
          completedCycleSampleSets: snapshot.completedCyclesByScenarioId[id]!,
          currentCycleSamples: snapshot.currentCycleSamplesByScenarioId[id]!,
        })),
      }));
      // Two prior-input layers, two completed beats and the current prefix.
      expect(strokes.map(stroke => stroke.color)).toEqual([
        ...Array<string>(5).fill("#0000ff"), ...Array<string>(5).fill("#ff0000"),
      ]);
      expect(strokes.slice(-3).map(stroke => stroke.points)).toEqual([501, 501, 101]);
      expect(strokes.at(-1)!.alpha).toBe(0.88);
    } finally {
      frame.mockRestore(); state.mockRestore();
    }
  });

  it("retains five immutable cycles independently of the short exact window, including slow heart rates", () => {
    const store = new WorkbenchScenarioPresentationSampleStoreV3();
    store.setCyclePhaseOutputId(TEST_CYCLE_PHASE_OUTPUT_ID_V3);
    const samples = Array.from({ length: 1201 }, (_, index) => sampleV3(index / 20, (index % 200) / 200,
      { volume: 100 + index, pressure: index % 200 }));
    store.append("a", samples);
    const snapshot = store.getPressureVolumeSnapshot();
    const cycles = snapshot.completedCyclesByScenarioId.a!;
    expect(cycles).toHaveLength(5);
    expect(cycles[0]![0]!.acceptedTimeSec).toBe(10);
    expect(cycles.at(-1)!.at(-1)!.acceptedTimeSec).toBe(60);
    expect(cycles.every(cycle => Object.isFrozen(cycle) && cycle.length === 201)).toBe(true);
    expect(store.getScenarioExactOrbitSnapshot("a")[0]!.acceptedTimeSec).toBeGreaterThanOrEqual(56);
    store.append("a", [sampleV3(60.05, .005, { volume: 90, pressure: 8 })]);
    expect(store.getPressureVolumeSnapshot().completedCyclesByScenarioId.a).toBe(cycles);
    store.cloneScenario("a", "b");
    store.append("b", [sampleV3(60.1, .01, { volume: 91, pressure: 8 })]);
    expect(store.getPressureVolumeSnapshot().currentCycleSamplesByScenarioId.a).toHaveLength(2);
    expect(store.getPressureVolumeSnapshot().currentCycleSamplesByScenarioId.b).toHaveLength(3);
    store.append("b", [sampleV3(60.1, .01, { volume: 92, pressure: 8 }, { inputEpoch: 1 })]);
    expect(store.getPressureVolumeSnapshot().completedCyclesByScenarioId.b).toHaveLength(0);
    expect(store.getScenarioOrbitHistorySnapshot("b").at(-1)!.completedCycles!.at(-1)![0]!.acceptedTimeSec).toBe(50);
    expect(store.getPressureVolumeSnapshot().completedCyclesByScenarioId.a).toBe(cycles);
    store.resetScenario("b");
    expect(store.getPressureVolumeSnapshot().completedCyclesByScenarioId.b).toBeUndefined();
    store.removeScenario("a");
    expect(store.getPressureVolumeSnapshot().completedCyclesByScenarioId.a).toBeUndefined();
  });

  it("does not close partial, discontinuous, or cross-epoch cycles", () => {
    const buffer = new WorkbenchCompletedCycleBufferV3(TEST_CYCLE_PHASE_OUTPUT_ID_V3);
    buffer.append([sampleV3(0, .4, {}), sampleV3(.4, .8, {}), sampleV3(.6, 0, {})]);
    expect(buffer.snapshot).toHaveLength(0);
    buffer.append([sampleV3(.8, .2, {}), sampleV3(1, null, {}), sampleV3(1.1, .9, {}), sampleV3(1.2, 0, {})]);
    expect(buffer.snapshot).toHaveLength(0);
    buffer.append([sampleV3(1.4, .2, {}), sampleV3(2, .8, {}), sampleV3(2.2, .99, {}), sampleV3(2.3, 0, {})]);
    expect(buffer.snapshot).toHaveLength(1);
    expect(buffer.snapshot[0]!.at(-1)!.acceptedTimeSec).toBe(2.3);
    buffer.append([sampleV3(2.4, .1, {}, { inputEpoch: 1 })]);
    expect(buffer.snapshot).toHaveLength(0);
    buffer.append([sampleV3(0, 0, {})]);
    expect(buffer.currentCycle).toHaveLength(1);
  });

  it("projects a validated completed cycle even when its first post-wrap phase is above the startup tolerance", () => {
    const store = new WorkbenchScenarioPresentationSampleStoreV3();
    store.setCyclePhaseOutputId(TEST_CYCLE_PHASE_OUTPUT_ID_V3);
    const values = { volume: 100, pressure: 10 };
    store.append("a", [.9, 1.1, 1.5, 1.95, 2.1].map(time => sampleV3(time, time % 1, values)));
    const snapshot = store.getPressureVolumeSnapshot();
    expect(snapshot.completedCyclesByScenarioId.a).toHaveLength(1);
    const html = renderToStaticMarkup(React.createElement(PressureVolumeLoopCanvasV3, {
      traces: [{ scenarioId: "a", scenarioLabel: "a", chamberId: "LV", chamberLabel: "LV", chamberColor: "#ff0000",
        volumeOutputId: "volume", pressureOutputId: "pressure", pressureBasis: "transmural",
        cyclePhaseOutputId: TEST_CYCLE_PHASE_OUTPUT_ID_V3, samples: snapshot.exactOrbitSamplesByScenarioId.a!,
        completedCycleSampleSets: snapshot.completedCyclesByScenarioId.a!,
        currentCycleSamples: snapshot.currentCycleSamplesByScenarioId.a! }],
    }));
    expect(html).toContain('data-pv-ready-trace-count="1"');
    expect(html).toContain('data-pv-trail-count="1"');
    store.append("a", [sampleV3(2.1, .1, values, { inputEpoch: 1 })]);
    const projection = projectWorkbenchPvHistoryV3(store.getScenarioOrbitHistorySnapshot("a")[0]!,
      "volume", "pressure", TEST_CYCLE_PHASE_OUTPUT_ID_V3);
    expect(projection.completedBeat.map(point => point.acceptedTimeSec)).toEqual([1.1, 1.5, 1.95, 2.1]);
    // A new phase binding cannot reuse the old phase clock's fade positions.
    store.setCyclePhaseOutputId("replacement.phase");
    expect(store.getScenarioOrbitHistorySnapshot("a")).toEqual([]);
  });

  it("archives startup fragments and never reconnects historical points across a phase gap", () => {
    const store = new WorkbenchScenarioPresentationSampleStoreV3();
    store.setCyclePhaseOutputId(TEST_CYCLE_PHASE_OUTPUT_ID_V3);
    const values = { volume: 100, pressure: 10 };
    store.append("startup", [sampleV3(.7, .7, values), sampleV3(.9, .9, values), sampleV3(1, 0, values), sampleV3(1.2, .2, values)]);
    store.append("startup", [sampleV3(1.2, .2, values, { inputEpoch: 1 })]);
    const startup = store.getScenarioOrbitHistorySnapshot("startup")[0]!;
    expect(projectWorkbenchPvHistoryV3(startup, "volume", "pressure", TEST_CYCLE_PHASE_OUTPUT_ID_V3).liveSegment!.map(point => point.acceptedTimeSec)).toEqual([.7, .9, 1, 1.2]);
    store.append("gap", [sampleV3(0, 0, values), sampleV3(.2, .2, values), sampleV3(.9, .9, values), sampleV3(1, 0, values), sampleV3(1.1, null, values), sampleV3(1.3, .3, values), sampleV3(1.5, .5, values)]);
    store.append("gap", [sampleV3(1.5, .5, values, { inputEpoch: 1 })]);
    const gap = store.getScenarioOrbitHistorySnapshot("gap")[0]!;
    const projection = projectWorkbenchPvHistoryV3(gap, "volume", "pressure", TEST_CYCLE_PHASE_OUTPUT_ID_V3);
    expect(projection.liveSegment!.map(point => point.acceptedTimeSec)).toEqual([1.3, 1.5]);
    expect(projectWorkbenchPvHistoryV3(gap, "volume", "pressure", TEST_CYCLE_PHASE_OUTPUT_ID_V3)).toBe(projection);
  });

  it("keeps fade time continuous through rapid edits without counting parameter-induced phase jumps", () => {
    const store = new WorkbenchScenarioPresentationSampleStoreV3();
    store.setCyclePhaseOutputId(TEST_CYCLE_PHASE_OUTPUT_ID_V3);
    store.append("a", [sampleV3(0, 0, {}), sampleV3(.8, .8, {}), sampleV3(1, 0, {})]);
    store.append("a", [sampleV3(1, .4, {}, { inputEpoch: 1 }), sampleV3(1.2, .6, {}, { inputEpoch: 1 })]);
    const before = store.getPressureVolumeSnapshot().cyclePositionByScenarioId.a!;
    expect(before).toBeCloseTo(1.2);
    const history = store.getScenarioOrbitHistorySnapshot("a")[0]!;
    expect(before - history.sourceCyclePosition!).toBeCloseTo(.2);
    store.append("a", [sampleV3(1.2, .1, {}, { inputEpoch: 2 })]);
    expect(store.getPressureVolumeSnapshot().cyclePositionByScenarioId.a).toBe(before);
    expect(store.getScenarioOrbitHistorySnapshot("a")[0]).toBe(history);
    store.append("a", [sampleV3(1.4, .3, {}, { inputEpoch: 2 })]);
    expect(store.getPressureVolumeSnapshot().cyclePositionByScenarioId.a! - history.sourceCyclePosition!).toBeCloseTo(.4);
  });

  it("fades trails continuously at beat boundaries and prior inputs by recorded phase only", () => {
    expect(workbenchPvTrailAlphaV3(0, 0, 2)).toBe(1);
    expect(workbenchPvTrailAlphaV3(0, 1, 2)).toBe(workbenchPvTrailAlphaV3(1, 0, 2));
    expect(workbenchPvTrailAlphaV3(1, 1, 2)).toBe(0);
    expect(workbenchPvTrailAlphaV3(0, 0, 0)).toBe(0);
    const samples = [sampleV3(0, .7, {}), sampleV3(.1, .8, {}), sampleV3(.3, 0, {}), sampleV3(.4, .1, {})];
    expect(workbenchPvInputTransitionV3(samples.slice(0, 1), TEST_CYCLE_PHASE_OUTPUT_ID_V3)).toBe(0);
    expect(workbenchPvInputTransitionV3(samples, TEST_CYCLE_PHASE_OUTPUT_ID_V3)).toBeCloseTo(.4);
    const history = projectHistoricalPvEpochV3(Object.freeze(samples), "volume", "pressure", TEST_CYCLE_PHASE_OUTPUT_ID_V3);
    expect(history.completedBeat).toHaveLength(0);
  });

  it("preserves exactly the prior trail geometry, widths and opacity when inputs change", () => {
    const beat = (offset: number) => [0, .25, .5, .9, 1].map(phase => ({
      acceptedTimeSec: offset + phase, cyclePhase01: phase % 1, volumeMl: 100 + offset + phase, pressureMmHg: 10 + phase,
    }));
    const previous = [beat(0), beat(1)];
    const liveSegment = beat(2).slice(0, 3);
    const completedBeat = previous[1]!;
    const backBufferRemainder = buildPvBackBufferRemainderV3(completedBeat, liveSegment);
    const projection = { completedBeat, liveSegment, backBufferRemainder };
    expect(workbenchPvHistoryLayersV3(projection, previous, 2, 0, .35)).toEqual([
      { points: previous[0], width: 1.5, alpha: .25 },
      { points: previous[1], width: 1.5, alpha: .75 },
      { points: liveSegment, width: 2, alpha: 1 },
    ]);
    expect(workbenchPvHistoryLayersV3(projection, previous, 2, 1, .35)).toEqual([
      { points: backBufferRemainder, width: 1.5, alpha: .35 },
      { points: liveSegment, width: 2, alpha: .35 },
    ]);
    expect(workbenchPvHistoryLayersV3(projection, previous, 0, 0, .35)).toEqual([
      { points: backBufferRemainder, width: 1.5, alpha: 1 },
      { points: liveSegment, width: 2, alpha: 1 },
    ]);
  });

  it("allocates twelve seconds of waveform samples only when requested", () => {
    const normal = new WorkbenchScenarioPresentationSampleStoreV3();
    const long = new WorkbenchScenarioPresentationSampleStoreV3();
    long.setSweepWindowSec(12);
    const samples = Array.from({ length: 8401 }, (_, i) => sampleV3(i / 500, (i % 500) / 500, { pressure: i }));
    normal.append("a", samples); long.append("a", samples);
    const span = (store: WorkbenchScenarioPresentationSampleStoreV3) => {
      const points = store.getScenarioSnapshot("a");
      return points.at(-1)!.presentationTimeSec - points[0]!.presentationTimeSec;
    };
    expect(span(normal)).toBeGreaterThanOrEqual(5.98);
    expect(span(normal)).toBeLessThan(6.03);
    expect(span(long)).toBeGreaterThanOrEqual(11.98);
    expect(span(long)).toBeLessThan(12.03);
    long.setSweepWindowSec(4); long.append("a", [sampleV3(16.9, .9, { pressure: 10 })]);
    expect(span(long)).toBeLessThan(6.03);
  });
  it("uses authored ranges verbatim without expanding to data or mutating automatic domains", () => {
    const automatic = Object.freeze([0, 150] as const);
    expect(workbenchManualChartDomainV3(automatic, undefined)).toBe(automatic);
    expect(workbenchManualChartDomainV3(automatic, { minimum: 40, maximum: 100 })).toEqual([40, 100]);
    for (const range of [{ minimum: 0, maximum: 0 }, { minimum: 20, maximum: -1 },
      { minimum: NaN, maximum: 1 }, { minimum: 0, maximum: Infinity },
      { minimum: -Number.MAX_VALUE, maximum: Number.MAX_VALUE }]) {
      expect(workbenchManualChartDomainV3(automatic, range)).toBe(automatic);
    }
    expect(automatic).toEqual([0, 150]);
  });
  it("builds leading-cap tints as opaque colors against either Canvas theme", () => {
    expect(mixOpaqueWorkbenchCanvasColorV3("#ff0000", "#ffffff", 0.25))
      .toBe("#ffbfbf");
    expect(mixOpaqueWorkbenchCanvasColorV3("#ffffff", "#000000", 0.25))
      .toBe("#404040");
    expect(mixOpaqueWorkbenchCanvasColorV3("#abc", "#000", 0))
      .toBe("#000000");
    expect(mixOpaqueWorkbenchCanvasColorV3("#abc", "#000", 1))
      .toBe("#aabbcc");
  });

  it("draws a solid trace-color leading cap with a Canvas-colored gap", () => {
    const radii: number[] = [];
    const fills: string[] = [];
    let fillStyle = "";
    const context = {
      save: vi.fn(),
      restore: vi.fn(),
      setLineDash: vi.fn(),
      beginPath: vi.fn(),
      arc: (_x: number, _y: number, radius: number) => radii.push(radius),
      fill: () => fills.push(fillStyle),
      globalAlpha: 0,
      get fillStyle() { return fillStyle; },
      set fillStyle(value: string | CanvasGradient | CanvasPattern) {
        fillStyle = String(value);
      },
    } as unknown as CanvasRenderingContext2D;

    drawWorkbenchLeadingCapV3(
      context,
      20,
      30,
      "#ff5f73",
      "#ffffff",
    );

    expect(radii).toEqual([5, 3.25]);
    expect(fills).toEqual(["#ffffff", "#ff5f73"]);
    expect(context.globalAlpha).toBe(1);
  });

  it("reserves four percent of the sweep as a readable forward gap", () => {
    expect(WORKBENCH_SWEEP_FORWARD_GAP_FRACTION_V3).toBe(0.04);
  });

  it("does not pin a fallback palette before authored theme variables resolve", () => {
    let resolved = "";
    const getComputedStyle = vi.fn(() => ({
      getPropertyValue: () => resolved,
    }));
    vi.stubGlobal("getComputedStyle", getComputedStyle);
    const themeRoot = { dataset: { appTheme: "dark" } };
    const element = {
      closest: () => themeRoot,
    } as unknown as HTMLElement;
    const variables = [["--wb-chart-grid", "fallback"]] as const;

    expect(readWorkbenchCanvasThemeVariablesV3(element, variables))
      .toEqual(["fallback"]);
    resolved = "#123456";
    expect(readWorkbenchCanvasThemeVariablesV3(element, variables))
      .toEqual(["#123456"]);
    expect(readWorkbenchCanvasThemeVariablesV3(element, variables))
      .toEqual(["#123456"]);
    expect(getComputedStyle).toHaveBeenCalledTimes(2);
    vi.unstubAllGlobals();
  });

  it("detects the downturn while the viewport uses the zero-flow intercept", () => {
    const orientation = structuralOrientationV3([
      [-1, 0.2],
      [4, 3.4],
      [8, 5.2],
      [12, 5.8],
      [16, 5.7],
      [22, 5.5],
      [40, 4.8],
    ]);
    const history = structuralOrientationV3([
      [-2, 0.1],
      [8, 5],
      [16, 5.6],
      [30, 5.3],
      [80, 3],
    ]);

    expect(starlingPresentationFocusV3(orientation)).toEqual({
      peakPressureMmHg: 12,
      firstDecliningPressureMmHg: 16,
      confirmedDecliningPressureMmHg: 22,
      pressureMaximumMmHg: 19.2,
    });
    const focused = guytonStarlingPlotDomainV3(orientation);
    expect(guytonZeroFlowPresentationMaximumV3(orientation)).toBeCloseTo(14.3);
    expect(focused.pressureMaximumMmHg).toBeCloseTo(14.3);
    const comparison = guytonStarlingPlotDomainV3(orientation, [history]);
    expect(comparison.pressureMinimumMmHg).toBeLessThanOrEqual(guytonStarlingPlotDomainV3(history).pressureMinimumMmHg);
    expect(comparison.pressureMaximumMmHg).toBe(focused.pressureMaximumMmHg);
    expect(comparison.flowMaximumLPerMin).toBeGreaterThanOrEqual(focused.flowMaximumLPerMin);
  });

  it("preserves missing support, vertical points, and reversed pressure limbs in TBV order", () => {
    const points = [
      {totalBloodVolumeMl:4000,fillingPressureMmHg:2,cardiacOutputLPerMin:3},
      {totalBloodVolumeMl:4500,fillingPressureMmHg:4,cardiacOutputLPerMin:4},
      {totalBloodVolumeMl:5000,fillingPressureMmHg:4,cardiacOutputLPerMin:5},
      {totalBloodVolumeMl:5500,fillingPressureMmHg:3,cardiacOutputLPerMin:6},
      {totalBloodVolumeMl:6000,fillingPressureMmHg:10,cardiacOutputLPerMin:8,curveEligible:false},
      {totalBloodVolumeMl:6500,fillingPressureMmHg:12,cardiacOutputLPerMin:7},
    ];
    const result = starlingCurveSegmentsV3([...points].reverse());
    expect(result).toContainEqual([{pressureMmHg:4,flowLPerMin:4},{pressureMmHg:4,flowLPerMin:5}]);
    expect(result.some(run=>run.some(p=>p.pressureMmHg<12) && run.some(p=>p.pressureMmHg===12))).toBe(false);
    expect(result.flat().some(p=>p.pressureMmHg===10)).toBe(false);
    expect(result.at(-1)).toEqual([{pressureMmHg:12,flowLPerMin:7}]);
  });

  it("interpolates eligible Starling points without extrapolating through a boundary", () => {
    const curve = starlingCurveSegmentsV3([
      {
        fillingPressureMmHg: -12,
        cardiacOutputLPerMin: 0,
        curveEligible: false,
      },
      {
        fillingPressureMmHg: -2,
        cardiacOutputLPerMin: 0.08,
        curveEligible: true,
      },
      {
        fillingPressureMmHg: 0,
        cardiacOutputLPerMin: 0.7,
        curveEligible: true,
      },
      {
        fillingPressureMmHg: 2,
        cardiacOutputLPerMin: 2.4,
        curveEligible: true,
      },
      {
        fillingPressureMmHg: 5,
        cardiacOutputLPerMin: 4.8,
        curveEligible: true,
      },
    ]);

    expect(curve.flat()[0]).toEqual({ pressureMmHg: -2, flowLPerMin: 0.08 });
    expect(curve.flat().at(-1)).toEqual({ pressureMmHg: 5, flowLPerMin: 4.8 });
    expect(
      curve.flat().every(
        ({ pressureMmHg, flowLPerMin }) =>
          pressureMmHg >= -2 &&
          pressureMmHg <= 5 &&
          flowLPerMin >= 0.08 &&
          flowLPerMin <= 4.8,
      ),
    ).toBe(true);
  });

  it("splits a sweeping waveform at time wraps and around the forward cursor gap", () => {
    const samples = [
      sampleV3(0.2, null, { pressure: 20 }),
      sampleV3(0.25, null, { pressure: 25 }),
      sampleV3(0.5, null, { pressure: 50 }),
      sampleV3(0.9, null, { pressure: 90 }),
      sampleV3(1, null, { pressure: 100 }),
      sampleV3(1.2, null, { pressure: 120 }),
    ];

    const segments = buildSweepingWaveformSegmentsV3(samples, "pressure", {
      windowSec: 1,
      forwardGapFraction: 0.1,
    });

    expect(segments.map((segment) => segment.length)).toEqual([1, 2, 2]);
    expect(segments[0]?.[0]?.phaseSec).toBeCloseTo(0.2);
    expect(segments[1]?.map(({ phaseSec }) => phaseSec)).toEqual([0.5, 0.9]);
    expect(segments[2]?.[0]?.phaseSec).toBe(0);
    expect(segments[2]?.[1]?.phaseSec).toBeCloseTo(0.2);
    expect(segments.flat().some(({ phaseSec }) => phaseSec === 0.25)).toBe(
      false,
    );
  });

  it("places each waveform cap on that trace's newest finite live sample", () => {
    const samples = [
      sampleV3(6.01, null, { pressure: 80 }),
      sampleV3(6.25, null, { pressure: 96 }),
    ];

    expect(latestSweepingWaveformPointV3(samples, "pressure", 6)).toEqual({
      phaseSec: 0.25,
      value: 96,
    });
    expect(
      latestSweepingWaveformPointV3(
        [...samples, sampleV3(6.5, null, { pressure: null })],
        "pressure",
        6,
      ),
    ).toEqual({
      phaseSec: 0.25,
      value: 96,
    });
  });

  it("reuses immutable waveform points without changing extrema, windows or signals", () => {
    const source = Array.from({ length: 210 }, (_, index) => sampleV3(
      0.9 + index * .002, null,
      { pressure: Math.sin(index) * 50, flow: index % 3 === 0 ? null : index },
    ));
    const buckets = appendWorkbenchPresentationSamplesV3([], source);
    const mutable = JSON.parse(JSON.stringify(buckets));
    for (const windowSec of [1, 2, 1]) {
      for (const outputId of ["pressure", "flow", "missing"]) {
        const options = { windowSec, forwardGapFraction: .1 };
        const cold = buildSweepingWaveformSegmentsV3(buckets, outputId, options);
        const hot = buildSweepingWaveformSegmentsV3(buckets, outputId, options);
        expect(hot).toEqual(buildSweepingWaveformSegmentsV3(mutable, outputId, options));
        expect(hot.flat().every((point, index) => point === cold.flat()[index])).toBe(true);
      }
    }
    const appended = appendWorkbenchPresentationSamplesV3(buckets, [sampleV3(1.32, null, { pressure: 123 })]);
    expect(buildSweepingWaveformSegmentsV3(appended, "pressure", { windowSec: 1 }).at(-1)?.at(-1)?.value).toBe(123);
    const mutableValues = { pressure: 1 };
    const shallow = Object.freeze({ ...source[0]!, values: mutableValues });
    expect(buildSweepingWaveformSegmentsV3([shallow], "pressure", { windowSec: 1 })[0]?.[0]?.value).toBe(1);
    mutableValues.pressure = 2;
    expect(buildSweepingWaveformSegmentsV3([shallow], "pressure", { windowSec: 1 })[0]?.[0]?.value).toBe(2);
  });

  it("uses nice ticks, expands without clipping, and contracts only after six commits", () => {
    let state = nextStableNumericDomainStateV3(null, [0, 100], {
      commitKey: "beat/0",
      paddingFraction: 0,
    });
    expect(state.domain).toEqual([0, 100]);
    for (let beat = 1; beat <= 5; beat += 1) {
      state = nextStableNumericDomainStateV3(state, [35, 60], {
        commitKey: `beat/${beat}`,
        paddingFraction: 0,
      });
      expect(state.domain).toEqual([0, 100]);
    }
    state = nextStableNumericDomainStateV3(state, [35, 60], {
      commitKey: "beat/6",
      paddingFraction: 0,
    });
    expect(state.domain).toEqual([35, 60]);
    expect(
      nextStableNumericDomainStateV3(state, [-20, 80], {
        commitKey: "beat/7",
        paddingFraction: 0,
      }).domain,
    ).toEqual([-20, 80]);
    expect(niceNumericDomainV3([-2, 12])).toEqual([-5, 15]);
    expect(numericTicksV3([-5, 15])).toEqual([-5, 0, 5, 10, 15]);
  });

  it("keeps PV pressure and volume domains at zero without altering observations", () => {
    for (const observations of [[], [-10, -2], [0, 0], [NaN, Infinity], [-1.4, 6, 110], [45, 170]]) {
      const values = Object.freeze(observations);
      const state = nextZeroBasedPvDomainV3(null, values, { commitKey: "0" });
      expect(state.domain[0]).toBe(0);
      expect(state.domain[1]).toBeGreaterThan(0);
      expect(state.domain[1]).toBeGreaterThanOrEqual(Math.max(0, ...values.filter(Number.isFinite)));
    }
  });

  it("fits PV axes to current and visible previous loops, never auxiliary geometry", () => {
    const point = (volumeMl: number, pressureMmHg: number): WorkbenchPvPointV3 =>
      Object.freeze({ volumeMl, pressureMmHg, acceptedTimeSec: 1, cyclePhase01: 0.5 });
    const completedBeat = [point(60, 100), point(140, 10)];
    const liveSegment = [point(130, 110)];
    const previousBeat = [point(160, 125)];
    const distantSupport = Object.freeze([point(600, 500)]);
    const drawing = Object.freeze({
      espvr: { curve: distantSupport, fitPoints: distantSupport },
      edpvr: { fitPoints: distantSupport },
      loadRelation: { segments: [distantSupport], loadSupportPoints: distantSupport },
      diastolicRelation: { segments: [distantSupport] },
      pressureEnvelope: [distantSupport],
      areaDisplay: { potentialEnergyStrip: [{ volumeMl: 600, lowerPressureMmHg: 10, upperPressureMmHg: 500 }] },
    });
    const trace = { completedBeat, liveSegment, history: [{ completedBeat: previousBeat }],
      periodicPvaDrawing: drawing, periodicPvaHistoryDrawings: [{ drawing, alpha: 0.3 }] };
    const points = workbenchPvLoopDomainPointsV3([trace]);
    expect(points).toEqual([...completedBeat, ...liveSegment, ...previousBeat]);
    expect(nextZeroBasedPvDomainV3(null, points.map(p => p.volumeMl), { commitKey: "1", upperPaddingFraction: 0.08 }).domain)
      .toEqual([0, 200]);
    expect(nextZeroBasedPvDomainV3(null, points.map(p => p.pressureMmHg), { commitKey: "1", upperPaddingFraction: 0.12 }).domain)
      .toEqual([0, 150]);
    // Hiding previous results changes support; hiding or updating auxiliaries does not.
    expect(workbenchPvLoopDomainPointsV3([{ ...trace, history: [] }])).toEqual([...completedBeat, ...liveSegment]);
    const withoutAnalysis = { ...trace, periodicPvaDrawing: null, periodicPvaHistoryDrawings: [] };
    expect(workbenchPvLoopDomainPointsV3([withoutAnalysis])).toEqual(points);
    expect(drawing.espvr.curve).toBe(distantSupport);
  });

  it("keeps prepared or historical analysis out of an empty loop domain", () => {
    const trace = { completedBeat: [], liveSegment: [], history: [],
      get periodicPvaDrawing(): never { throw new Error("Analysis must not own the loop viewport"); },
      get periodicPvaHistoryDrawings(): never { throw new Error("Old analysis must not own the loop viewport"); } };
    expect(workbenchPvLoopDomainPointsV3([trace])).toEqual([]);
  });

  it("contracts a zero-based PV upper limit only after sustained smaller observations", () => {
    let state = nextZeroBasedPvDomainV3(null, [-3, 200], { commitKey: "0", upperPaddingFraction: 0 });
    for (let beat = 1; beat <= 5; beat++) {
      state = nextZeroBasedPvDomainV3(state, [-2, 70], { commitKey: String(beat), upperPaddingFraction: 0 });
      expect(state.domain).toEqual([0, 200]);
    }
    state = nextZeroBasedPvDomainV3(state, [-2, 70], { commitKey: "6", upperPaddingFraction: 0 });
    expect(state.domain[0]).toBe(0);
    expect(state.domain[1]).toBeLessThan(200);
    expect(state.domain[1]).toBeGreaterThanOrEqual(70);
  });

  it("uses model-emitted cycle wraps to select the newest complete PV beat", () => {
    const samples = [
      sampleV3(0.7, 0.7, { volume: 110, pressure: 12 }),
      sampleV3(0.9, 0.9, { volume: 120, pressure: 10 }),
      sampleV3(1.1, 0.1, { volume: 118, pressure: 15 }),
      sampleV3(1.4, 0.4, { volume: 90, pressure: 110 }),
      sampleV3(1.9, 0.9, { volume: 120, pressure: 10 }),
      sampleV3(2.1, 0.1, { volume: 118, pressure: 15 }),
      sampleV3(2.2, 0.2, { volume: 110, pressure: 55 }),
    ];

    expect(
      lastCompleteCycleRangeV3(samples, TEST_CYCLE_PHASE_OUTPUT_ID_V3),
    ).toEqual({
      startIndex: 2,
      endIndexInclusive: 5,
    });
    const beat = extractLivePvTrajectoryV3(
      samples,
      "volume",
      "pressure",
      TEST_CYCLE_PHASE_OUTPUT_ID_V3,
    ).completedBeat;
    expect(beat.map(({ acceptedTimeSec }) => acceptedTimeSec)).toEqual([
      1.1, 1.4, 1.9, 2.1,
    ]);
    const trajectory = extractLivePvTrajectoryV3(
      samples,
      "volume",
      "pressure",
      TEST_CYCLE_PHASE_OUTPUT_ID_V3,
    );
    expect(trajectory.completedBeat).toEqual(beat);
    expect(
      trajectory.liveSegment.map(({ acceptedTimeSec }) => acceptedTimeSec),
    ).toEqual([2.1, 2.2]);
    expect(trajectory.liveSegment.at(-1)).toMatchObject({
      cyclePhase01: 0.2,
      volumeMl: 110,
      pressureMmHg: 55,
    });
  });

  it("exposes the exact partial PV trajectory from the first sample without closing it", () => {
    const samples = [
      sampleV3(0.2, 0.2, { volume: 118, pressure: 20 }),
      sampleV3(0.4, 0.4, { volume: 88, pressure: 112 }),
      sampleV3(0.6, 0.6, { volume: 70, pressure: 65 }),
    ];

    const trajectory = extractLivePvTrajectoryV3(
      samples,
      "volume",
      "pressure",
      TEST_CYCLE_PHASE_OUTPUT_ID_V3,
    );
    expect(trajectory).toEqual({
      completedBeat: [],
      liveSegment: [
        {
          acceptedTimeSec: 0.2,
          cyclePhase01: 0.2,
          volumeMl: 118,
          pressureMmHg: 20,
        },
        {
          acceptedTimeSec: 0.4,
          cyclePhase01: 0.4,
          volumeMl: 88,
          pressureMmHg: 112,
        },
        {
          acceptedTimeSec: 0.6,
          cyclePhase01: 0.6,
          volumeMl: 70,
          pressureMmHg: 65,
        },
      ],
    });
    expect(buildPvBackBufferRemainderV3(trajectory.completedBeat, trajectory.liveSegment)).toEqual([]);
    const initial = extractLivePvTrajectoryV3(samples.slice(0, 1), "volume", "pressure", TEST_CYCLE_PHASE_OUTPUT_ID_V3);
    expect(initial.completedBeat).toEqual([]);
    expect(initial.liveSegment).toEqual(trajectory.liveSegment.slice(0, 1));
    expect(workbenchPvLoopDomainPointsV3([{ ...trajectory, history: [] }])).toEqual(trajectory.liveSegment);
  });

  it("retains the initial fragment through the first wrap but drops samples before a missing phase", () => {
    const samples = [
      sampleV3(0.7, 0.7, { volume: 110, pressure: 12 }),
      sampleV3(0.9, 0.9, { volume: 120, pressure: 10 }),
      sampleV3(1, 0, { volume: 121, pressure: 11 }),
      sampleV3(1.2, 0.2, { volume: 99, pressure: 105 }),
    ];
    const trajectory = extractLivePvTrajectoryV3(samples, "volume", "pressure", TEST_CYCLE_PHASE_OUTPUT_ID_V3);
    expect(trajectory.completedBeat).toEqual([]);
    expect(trajectory.liveSegment.map(point => point.acceptedTimeSec)).toEqual([0.7, 0.9, 1, 1.2]);
    const gap = samples.map((sample, index) => index === 2
      ? { ...sample, values: { ...sample.values, [TEST_CYCLE_PHASE_OUTPUT_ID_V3]: null } } : sample);
    expect(extractLivePvTrajectoryV3(gap, "volume", "pressure", TEST_CYCLE_PHASE_OUTPUT_ID_V3).liveSegment.map(point => point.acceptedTimeSec)).toEqual([1.2]);
  });

  it("reveals phase-aware live PV motion after the first complete beat", () => {
    const trajectory = extractLivePvTrajectoryV3(
      [
        sampleV3(0, 0, { volume: 120, pressure: 10 }),
        sampleV3(0.25, 0.25, { volume: 100, pressure: 80 }),
        sampleV3(0.5, 0.5, { volume: 65, pressure: 120 }),
        sampleV3(0.9, 0.9, { volume: 115, pressure: 12 }),
        sampleV3(1, 0, { volume: 120, pressure: 10 }),
        sampleV3(1.2, 0.2, { volume: 108, pressure: 52 }),
      ],
      "volume",
      "pressure",
      TEST_CYCLE_PHASE_OUTPUT_ID_V3,
    );

    expect(trajectory.completedBeat).toHaveLength(5);
    expect(trajectory.liveSegment).toHaveLength(2);
  });

  it("replaces the completed PV back buffer by phase without an alpha seam", () => {
    const completed: readonly WorkbenchPvPointV3[] = Object.freeze([
      { acceptedTimeSec: 1, cyclePhase01: 0.1, volumeMl: 120, pressureMmHg: 10 },
      { acceptedTimeSec: 1.3, cyclePhase01: 0.4, volumeMl: 80, pressureMmHg: 110 },
      { acceptedTimeSec: 1.8, cyclePhase01: 0.9, volumeMl: 118, pressureMmHg: 12 },
      { acceptedTimeSec: 2, cyclePhase01: 0.1, volumeMl: 120, pressureMmHg: 10 },
    ]);
    const live: readonly WorkbenchPvPointV3[] = Object.freeze([
      { acceptedTimeSec: 2, cyclePhase01: 0.1, volumeMl: 120, pressureMmHg: 10 },
      { acceptedTimeSec: 2.2, cyclePhase01: 0.3, volumeMl: 92, pressureMmHg: 82 },
    ]);

    const remainder = buildPvBackBufferRemainderV3(completed, live);
    expect(remainder[0]).toMatchObject({
      cyclePhase01: 0.3,
      volumeMl: expect.closeTo(93.3333333333),
      pressureMmHg: expect.closeTo(76.6666666667),
    });
    expect(remainder.slice(1)).toEqual(completed.slice(1));
    expect(buildPvBackBufferRemainderV3(completed, live.slice(0, 1))).toBe(
      completed,
    );
  });

  it("does not infer a complete beat when model cycle phase is absent", () => {
    const samples = [
      sampleV3(0, null, { volume: 100, pressure: 10 }),
      sampleV3(0.5, null, { volume: 80, pressure: 100 }),
      sampleV3(1, null, { volume: 100, pressure: 10 }),
    ];

    expect(
      lastCompleteCycleRangeV3(samples, TEST_CYCLE_PHASE_OUTPUT_ID_V3),
    ).toBeNull();
    expect(
      extractLivePvTrajectoryV3(
        samples,
        "volume",
        "pressure",
        TEST_CYCLE_PHASE_OUTPUT_ID_V3,
      ).completedBeat,
    ).toEqual([]);
  });

  it("reuses PV projection only for immutable historical epochs", () => {
    const history = Object.freeze([
      sampleV3(0, 0, { volume: 120, pressure: 10 }),
      sampleV3(0.25, 0.25, { volume: 100, pressure: 80 }),
      sampleV3(0.5, 0.5, { volume: 65, pressure: 120 }),
      sampleV3(0.9, 0.9, { volume: 115, pressure: 12 }),
      sampleV3(1, 0, { volume: 120, pressure: 10 }),
    ]);
    const first = projectHistoricalPvEpochV3(
      history,
      "volume",
      "pressure",
      TEST_CYCLE_PHASE_OUTPUT_ID_V3,
    );
    const reused = projectHistoricalPvEpochV3(
      history,
      "volume",
      "pressure",
      TEST_CYCLE_PHASE_OUTPUT_ID_V3,
    );
    const differentBinding = projectHistoricalPvEpochV3(
      history,
      "volume",
      "pressure",
      "other-cycle-phase",
    );

    expect(reused).toBe(first);
    expect(first.completedBeat.length).toBeGreaterThanOrEqual(3);
    expect(differentBinding).not.toBe(first);
  });

  it("uses only catalog-bound arbitrary PV output IDs", () => {
    const volumeOutputId = "arbitrary/x-axis";
    const pressureOutputId = "arbitrary/y-axis";
    const cyclePhaseOutputId = "arbitrary/cycle-boundary";
    const samples = [
      [0.1, 0.1, 120, 10],
      [0.5, 0.5, 80, 110],
      [0.9, 0.9, 118, 12],
      [1.1, 0.1, 116, 16],
      [1.5, 0.5, 78, 112],
      [1.9, 0.9, 119, 11],
      [2.1, 0.1, 117, 15],
    ].map(([acceptedTimeSec, phase, volume, pressure]) =>
      Object.freeze({
        inputEpoch: 0,
        acceptedRevision: Math.round(acceptedTimeSec / 0.002),
        acceptedTimeSec,
        presentationTimeSec: acceptedTimeSec,
        values: Object.freeze({
          [volumeOutputId]: volume,
          [pressureOutputId]: pressure,
          [cyclePhaseOutputId]: phase,
          // A hard-coded Main Wire phase would never form a cycle here.
          "rhythm.phase.regular-sinus": 0.5,
        }),
      }),
    );

    const beat = extractLivePvTrajectoryV3(
      samples,
      volumeOutputId,
      pressureOutputId,
      cyclePhaseOutputId,
    ).completedBeat;

    expect(beat.map(({ acceptedTimeSec }) => acceptedTimeSec)).toEqual([
      1.1, 1.5, 1.9, 2.1,
    ]);
    expect(beat[1]).toMatchObject({
      cyclePhase01: 0.5,
      volumeMl: 78,
      pressureMmHg: 112,
    });
  });

  it("keeps monotonic Worker samples on the allocation-free fast path", () => {
    const ordered = Object.freeze([
      sampleV3(0, 0, {}),
      sampleV3(0.002, 0.002, {}),
      sampleV3(0.004, 0.004, {}),
    ]);

    expect(orderedFiniteWorkbenchSamplesV3(ordered)).toBe(ordered);
    expect(firstSampleAtOrAfterV3(ordered, 0.001)).toBe(1);
    expect(firstSampleAtOrAfterV3(ordered, 1)).toBe(ordered.length);

    const malformed = [
      ordered[2]!,
      sampleV3(Number.NaN, null, {}),
      ordered[0]!,
    ];
    expect(
      orderedFiniteWorkbenchSamplesV3(malformed).map(
        (sample) => sample.acceptedTimeSec,
      ),
    ).toEqual([0, 0.004]);
  });

  it("bounds Retina backing-store cost while preserving CSS resolution", () => {
    expect(boundedCanvasPixelRatioV3(0.5)).toBe(1);
    expect(boundedCanvasPixelRatioV3(2)).toBe(2);
    expect(boundedCanvasPixelRatioV3(4)).toBe(2);
    expect(boundedCanvasPixelRatioV3(Number.NaN)).toBe(1);
  });

  it("coalesces saturated Canvas updates into one pending animation frame", () => {
    let requestCount = 0;
    let cancelCount = 0;
    let renderCount = 0;
    let pending: (() => void) | null = null;
    const scheduler = createWorkbenchCanvasFrameSchedulerV3(
      () => {
        renderCount += 1;
      },
      (callback) => {
        requestCount += 1;
        pending = callback;
        return requestCount;
      },
      () => {
        cancelCount += 1;
      },
    );

    for (let index = 0; index < 2_000; index += 1) scheduler.schedule();
    expect(requestCount).toBe(1);
    expect(cancelCount).toBe(0);
    (pending as (() => void) | null)?.();
    expect(renderCount).toBe(1);

    scheduler.schedule();
    expect(requestCount).toBe(2);
    scheduler.dispose();
    expect(cancelCount).toBe(1);
  });

  it("keeps a minute-long exact stream bounded and preserves bucket extrema", () => {
    let presentation: readonly WorkbenchScalarSampleV3[] = [];
    const dtSec = 0.002;
    const sourceSampleCount = 30_000;
    const batchSize = 16;
    for (let start = 0; start < sourceSampleCount; start += batchSize) {
      const batch = Array.from(
        { length: Math.min(batchSize, sourceSampleCount - start) },
        (_, offset) => {
          const ordinal = start + offset;
          const timeSec = ordinal * dtSec;
          return sampleV3(timeSec, (timeSec % 0.8) / 0.8, {
            pressure: ordinal % 83 === 0 ? 180 : 80 + 20 * Math.sin(timeSec),
            flow: ordinal % 71 === 0 ? -40 : 5 + 10 * Math.cos(timeSec),
            volume: 100 + 25 * Math.sin(timeSec * 2),
          });
        },
      );
      presentation = appendWorkbenchPresentationSamplesV3(presentation, batch);
      expect(presentation.length).toBeLessThanOrEqual(
        WORKBENCH_PRESENTATION_SAMPLE_CAPACITY_V3,
      );
    }

    expect(presentation.length).toBeLessThanOrEqual(362);
    expect(
      presentation.at(-1)!.acceptedTimeSec - presentation[0]!.acceptedTimeSec,
    ).toBeLessThanOrEqual(6.002);
    const retainedExactSourceCount = presentation.reduce(
      (total, sample) =>
        total +
        (isWorkbenchPresentationSampleV3(sample)
          ? sample.presentationEnvelope.sourceSampleCount
          : 0),
      0,
    );
    expect(retainedExactSourceCount).toBeGreaterThanOrEqual(2_990);
    expect(retainedExactSourceCount).toBeLessThanOrEqual(3_010);
    for (const outputId of ["pressure", "flow", "volume"]) {
      const segments = buildSweepingWaveformSegmentsV3(presentation, outputId, {
        windowSec: 6,
        forwardGapFraction: 0,
      });
      expect(segments.flat().length).toBeGreaterThanOrEqual(
        presentation.length,
      );
      expect(segments.flat().length).toBeLessThanOrEqual(
        presentation.length * 4,
      );
      expect(segments.flat().every(({ value }) => Number.isFinite(value)))
        .toBe(true);
    }

    const oneBucket = appendWorkbenchPresentationSamplesV3(
      [],
      [
        sampleV3(0, 0, { pressure: 10 }),
        sampleV3(0.002, 0.002, { pressure: 180 }),
        sampleV3(0.004, 0.004, { pressure: -20 }),
      ],
    );
    expect(oneBucket).toHaveLength(1);
    const projected = buildSweepingWaveformSegmentsV3(oneBucket, "pressure", {
      windowSec: 6,
      forwardGapFraction: 0,
    }).flat();
    expect(projected).toEqual([
      { phaseSec: 0, value: 10 },
      { phaseSec: 0.002, value: 180 },
      { phaseSec: 0.004, value: -20 },
    ]);
  });

  it("starts a new trace on the smallest representable backward clock step", () => {
    const previous = appendWorkbenchPresentationSamplesV3(
      [],
      [sampleV3(1, 0.5, { pressure: 100, volume: 120 })],
    );
    const restoredTimeSec = 1 - Number.EPSILON / 2;
    const restored = sampleV3(restoredTimeSec, 0.25, {
      pressure: 12,
      volume: 99,
    });

    const presentation = appendWorkbenchPresentationSamplesV3(previous, [
      restored,
    ]);

    expect(restoredTimeSec).toBeLessThan(1);
    expect(presentation).toHaveLength(1);
    expect(presentation[0]).toMatchObject(restored);
    expect(presentation[0]?.values).toBe(restored.values);
    expect(presentation[0]?.presentationEnvelope).toEqual({
      bucketOrdinal: 60,
      sourceSampleCount: 1,
      firsts: {
        [TEST_CYCLE_PHASE_OUTPUT_ID_V3]: 0.25,
        pressure: 12,
        volume: 99,
      },
      minimums: {
        [TEST_CYCLE_PHASE_OUTPUT_ID_V3]: 0.25,
        pressure: 12,
        volume: 99,
      },
      maximums: {
        [TEST_CYCLE_PHASE_OUTPUT_ID_V3]: 0.25,
        pressure: 12,
        volume: 99,
      },
      firstPresentationTimesSec: {
        [TEST_CYCLE_PHASE_OUTPUT_ID_V3]: restoredTimeSec,
        pressure: restoredTimeSec,
        volume: restoredTimeSec,
      },
      minimumPresentationTimesSec: {
        [TEST_CYCLE_PHASE_OUTPUT_ID_V3]: restoredTimeSec,
        pressure: restoredTimeSec,
        volume: restoredTimeSec,
      },
      maximumPresentationTimesSec: {
        [TEST_CYCLE_PHASE_OUTPUT_ID_V3]: restoredTimeSec,
        pressure: restoredTimeSec,
        volume: restoredTimeSec,
      },
    });
  });

  it("keeps bounded presentation samples independent per Scenario and clones a visual window safely", () => {
    const store = new WorkbenchScenarioPresentationSampleStoreV3({
      bucketSec: 0.01,
      windowSec: 0.04,
      capacity: 4,
    });
    let notifications = 0;
    const unsubscribe = store.subscribeSweep(() => {
      notifications += 1;
    });
    const baselineTerminalSample = sampleV3(0.009, 0.01, { pressure: 12 });

    store.append("baseline", [
      sampleV3(0, 0, { pressure: 10 }),
      baselineTerminalSample,
    ]);
    store.append("intervention", [sampleV3(0, 0, { pressure: 80 })]);

    expect(store.scenarioCount).toBe(2);
    expect(store.getScenarioSnapshot("baseline")).toHaveLength(1);
    expect(store.getScenarioSnapshot("baseline")[0]?.acceptedTimeSec).toBe(
      0.009,
    );
    expect(store.getScenarioSnapshot("baseline")[0]?.values).toBe(
      baselineTerminalSample.values,
    );
    expect(store.getScenarioSnapshot("intervention")[0]?.values.pressure).toBe(
      80,
    );

    expect(store.cloneScenario("baseline", "baseline-copy")).toBe(true);
    const clonedWindow = store.getScenarioSnapshot("baseline-copy");
    const clonedExact = store.getScenarioExactOrbitSnapshot("baseline-copy");
    expect(clonedWindow).toBe(store.getScenarioSnapshot("baseline"));
    expect(clonedExact).toBe(store.getScenarioExactOrbitSnapshot("baseline"));
    expect(store.getScenarioOrbitHistorySnapshot("baseline-copy")).toEqual([]);
    store.append("baseline-copy", [sampleV3(0.02, 0.02, { pressure: 20 })]);
    expect(store.getScenarioSnapshot("baseline-copy")).not.toBe(clonedWindow);
    expect(
      store.getScenarioSnapshot("baseline-copy").at(-1)?.presentationTimeSec,
    ).toBe(0.02);
    expect(store.getScenarioExactOrbitSnapshot("baseline-copy")).not.toBe(
      clonedExact,
    );
    expect(store.getScenarioExactOrbitSnapshot("baseline")).toBe(clonedExact);
    expect(store.getScenarioOrbitHistorySnapshot("baseline-copy")).toEqual([]);
    expect(store.getScenarioSnapshot("baseline")).toBe(clonedWindow);
    expect(store.getScenarioSnapshot("baseline")).toHaveLength(1);

    expect(store.resetScenario("baseline")).toBe(true);
    expect(store.getSnapshot()).toHaveProperty("baseline", []);
    expect(store.removeScenario("intervention")).toBe(true);
    expect(store.getSnapshot()).not.toHaveProperty("intervention");
    expect(store.removeScenario("missing")).toBe(false);
    expect(store.cloneScenario("missing", "copy")).toBe(false);
    expect(notifications).toBe(6);
    unsubscribe();
  });

  it("exposes one renderer-specific subscription and one stable PV snapshot", () => {
    const store = new WorkbenchScenarioPresentationSampleStoreV3();
    let sweepNotifications = 0;
    let pressureVolumeNotifications = 0;
    const unsubscribeSweep = store.subscribeSweep(() => {
      sweepNotifications += 1;
    });
    const unsubscribePressureVolume = store.subscribePressureVolume(() => {
      pressureVolumeNotifications += 1;
    });

    store.append("baseline", [sampleV3(0.002, 0.01, { pressure: 12 })]);

    expect(sweepNotifications).toBe(1);
    expect(pressureVolumeNotifications).toBe(1);
    expect(store.getSweepSnapshot()).toMatchObject({ renderer: "sweep" });
    const pressureVolume = store.getPressureVolumeSnapshot();
    expect(pressureVolume).toMatchObject({ renderer: "pressure-volume" });
    expect(pressureVolume.exactOrbitSamplesByScenarioId.baseline)
      .toHaveLength(1);
    expect(store.getPressureVolumeSnapshot()).toBe(pressureVolume);

    unsubscribeSweep();
    unsubscribePressureVolume();
  });

  it("retains graph-owned outputs without materializing the whole model catalog", () => {
    const contract = {
      graphCatalog: [
        {
          graphId: "graph/pressure",
          renderer: "sweep",
          seriesCatalog: [
            { kind: "scalar", seriesId: "LVP", outputId: "pressure.lv" },
            { kind: "scalar", seriesId: "AoP", outputId: "pressure.ao" },
          ],
        },
        {
          graphId: "graph/pv",
          renderer: "pressure-volume",
          seriesCatalog: [{
            kind: "pressure-volume",
            seriesId: "LV",
            volumeOutputId: "volume.lv",
            pressureOutputId: "pressure.lv.transmural",
            pressureBasis: "transmural",
            cyclePhaseOutputId: "clock.cycle-phase",
          }],
        },
      ],
    } as unknown as ModelContractV2;
    const surface = {
      graphPanes: [
        {
          graphId: "graph/pressure",
          series: [{ seriesId: "LVP", label: "LVP", order: 0 }],
        },
        {
          graphId: "graph/pv",
          series: [{ seriesId: "LV", label: "LV", order: 0 }],
        },
      ],
    } as unknown as ExperimentSurfaceV2;

    const selected = workbenchPresentationOutputSelectionV3(contract, surface);
    expect([...selected].sort()).toEqual([
      "clock.cycle-phase",
      "pressure.lv",
      "pressure.lv.transmural",
      "volume.lv",
    ]);
    expect(selected.has("pressure.ao")).toBe(false);
    expect(workbenchModelCyclePhaseOutputIdV3(contract))
      .toBe("clock.cycle-phase");
    expect(workbenchPresentationOutputSelectionV3(contract, surface))
      .toBe(selected);
  });

  it("retains exact 2 ms PV samples without presentation bucketing", () => {
    const exact = Array.from({ length: 1_000 }, (_, index) =>
      sampleV3(index * 0.002, (index % 400) / 400, {
        pressure: index,
        volume: 120 - index / 100,
      }),
    );
    const retained = appendWorkbenchExactOrbitSamplesV3([], exact, {
      capacity: 1_200,
      windowSec: 2.1,
    });

    expect(retained).toHaveLength(exact.length);
    expect(retained[537]).toBe(exact[537]);
    expect(
      retained.every((sample) => !("presentationEnvelope" in sample)),
    ).toBe(true);
  });

  it("connects sweep epochs on one timeline and archives exact PV epochs", () => {
    const store = new WorkbenchScenarioPresentationSampleStoreV3({
      bucketSec: 0.001,
      windowSec: 0.05,
      capacity: 100,
      exactOrbitWindowSec: 1,
      exactOrbitCapacity: 600,
    });
    store.append("baseline", [
      sampleV3(
        0.996,
        0.2,
        { pressure: 80 },
        {
          inputEpoch: 0,
          acceptedRevision: 498,
        },
      ),
      sampleV3(
        0.998,
        0.3,
        { pressure: 82 },
        {
          inputEpoch: 0,
          acceptedRevision: 499,
        },
      ),
    ]);
    store.append("baseline", [
      sampleV3(
        0,
        0,
        { pressure: 90 },
        {
          inputEpoch: 1,
          acceptedRevision: 0,
        },
      ),
      sampleV3(
        0.002,
        0.01,
        { pressure: 92 },
        {
          inputEpoch: 1,
          acceptedRevision: 1,
        },
      ),
    ]);

    const sweep = store.getScenarioSnapshot("baseline");
    expect(sweep.map(({ presentationTimeSec }) => presentationTimeSec)).toEqual(
      [0.996, 0.998, 0.998, 1],
    );
    expect(sweep.map(({ inputEpoch }) => inputEpoch)).toEqual([0, 0, 1, 1]);
    expect(
      buildSweepingWaveformSegmentsV3(sweep, "pressure", {
        windowSec: 6,
        forwardGapFraction: 0,
      }).map((segment) => segment.length),
    ).toEqual([4]);

    expect(
      store
        .getScenarioExactOrbitSnapshot("baseline")
        .map(({ acceptedTimeSec }) => acceptedTimeSec),
    ).toEqual([0, 0.002]);
    expect(store.getScenarioOrbitHistorySnapshot("baseline")).toMatchObject([
      {
        inputEpoch: 0,
        sourceAcceptedRevision: 499,
        sourceAcceptedTimeSec: 0.998,
      },
    ]);
  });

  it("fails closed on an unexpected same-epoch accepted-clock rewind", () => {
    const store = new WorkbenchScenarioPresentationSampleStoreV3({
      bucketSec: 0.001,
      windowSec: 6,
      capacity: 384,
    });
    store.append("baseline", [
      sampleV3(
        1,
        0.5,
        { pressure: 100 },
        { inputEpoch: 2, acceptedRevision: 500 },
      ),
    ]);
    store.append("baseline", [
      sampleV3(
        0.5,
        0.25,
        { pressure: 80 },
        { inputEpoch: 2, acceptedRevision: 250 },
      ),
    ]);

    expect(store.getScenarioSnapshot("baseline")).toHaveLength(1);
    expect(store.getScenarioSnapshot("baseline")[0]).toMatchObject({
      inputEpoch: 2,
      acceptedRevision: 250,
      acceptedTimeSec: 0.5,
      presentationTimeSec: 0.5,
    });
    expect(store.getScenarioExactOrbitSnapshot("baseline")).toHaveLength(1);
    expect(store.getScenarioOrbitHistorySnapshot("baseline")).toEqual([]);
  });

  it("caps per-Scenario exact orbit history at three completed epochs", () => {
    const store = new WorkbenchScenarioPresentationSampleStoreV3();
    for (let inputEpoch = 0; inputEpoch <= 4; inputEpoch += 1) {
      store.append("baseline", [
        sampleV3(
          0,
          0,
          { pressure: 80 + inputEpoch },
          { inputEpoch, acceptedRevision: 0 },
        ),
      ]);
    }
    const history = store.getScenarioOrbitHistorySnapshot("baseline");
    expect(history).toHaveLength(WORKBENCH_PRESENTATION_HISTORY_MAX_DEPTH_V3);
    expect(history.map(({ inputEpoch }) => inputEpoch)).toEqual([1, 2, 3]);
    expect(store.getScenarioExactOrbitSnapshot("baseline")[0]?.inputEpoch).toBe(
      4,
    );
  });

  it("fades historical graph states by recency", () => {
    expect([0, 1, 2].map((index) => workbenchHistoryAlphaV3(index, 3))).toEqual(
      [0.15, 0.25, 0.35],
    );
    expect(workbenchHistoryAlphaV3(-1, 3)).toBe(0);
  });

  it("builds compact Scenario groups without repeating Scenario names per trace", () => {
    const model = buildWorkbenchTraceLegendModelV3([
      { traceKey: "a:lvp", scenarioId: "a", scenarioLabel: "Baseline", itemId: "lvp", itemLabel: "LVP", itemDescription: "Model LV pressure", itemDescriptionLabel: "About LVP", color: "#ff5a78" },
      { traceKey: "a:lap", scenarioId: "a", scenarioLabel: "Baseline", itemId: "lap", itemLabel: "LAP", color: "#b78bfa" },
      { traceKey: "b:lvp", scenarioId: "b", scenarioLabel: "Copy", itemId: "lvp", itemLabel: "LVP", color: "#d58a19" },
      { traceKey: "b:lap", scenarioId: "b", scenarioLabel: "Copy", itemId: "lap", itemLabel: "LAP", color: "#e0a645" },
      { traceKey: "b:lap", scenarioId: "b", scenarioLabel: "Ignored", itemId: "lap", itemLabel: "Ignored", color: "#000000" },
    ]);

    expect(model.mode).toBe("groups");
    expect(model.scenarios.map(({ label }) => label)).toEqual([
      "Baseline",
      "Copy",
    ]);
    expect(model.items.map(({ label }) => label)).toEqual(["LVP", "LAP"]);
    expect(model.items[0]).toMatchObject({
      description: "Model LV pressure",
      descriptionLabel: "About LVP",
    });
    expect(model.traces).toHaveLength(4);
    expect(
      buildWorkbenchTraceLegendModelV3(model.traces.slice(0, 2)).mode,
    ).toBe("items");
  });

  it("uses a soft zero floor and asymmetric headroom without flattening AoP", () => {
    expect(niceNumericDomainV3([3, 122], {
      softZeroFloor: true,
      softZeroSpanFraction: 0.25,
      lowerPaddingFraction: 0.04,
      upperPaddingFraction: 0.12,
      minimumUpperPadding: 3,
    })).toEqual([0, 150]);
    expect(niceNumericDomainV3([72, 122], {
      softZeroFloor: true,
      softZeroSpanFraction: 0.25,
      lowerPaddingFraction: 0.04,
      upperPaddingFraction: 0.12,
      minimumUpperPadding: 3,
    })).toEqual([60, 140]);
  });

  it("materializes one stable color for every Scenario/item trace", () => {
    const pane: ExperimentSurfaceGraphPaneV2 = {
      paneId: "pane/pressure",
      role: "graph",
      label: "Pressure",
      order: 0,
      priority: 10,
      graphId: "graph/pressure",
      scenarioScope: { mode: "visible-scenarios" },
      excludedTraces: [],
      windowSec: 2,
      series: ["LVP", "LAP", "AoP"].map((seriesId, order) => ({
        seriesId,
        label: seriesId.toUpperCase(),
        order,
      })),
    };
    const surface: ExperimentSurfaceV2 = {
      graphPanes: [pane],
      outputPanes: [],
      controlPanes: [],
      note: { text: "" },
    };
    const reconciled = reconcileWorkbenchGraphColorsV3(surface, [
      { scenarioId: "scenario/a" },
      { scenarioId: "scenario/b" },
    ]);

    expect(reconciled.graphPanes).toHaveLength(1);
    expect(reconciled.graphPanes[0]?.traceColors).toHaveLength(6);
    expect(
      new Set(
        reconciled.graphPanes[0]?.traceColors?.map(
          ({ scenarioId, seriesId }) => `${scenarioId}:${seriesId}`,
        ),
      ).size,
    ).toBe(6);
    const traceColors = reconciled.graphPanes[0]?.traceColors ?? [];
    expect(
      traceColors
        .filter(({ scenarioId }) => scenarioId === "scenario/a")
        .map(({ automaticColorHex }) => automaticColorHex),
    ).toEqual(["#e07ce8", "#39c2ff", "#ff5f73"]);
    const minimumPairDistance = (colors: readonly string[]) => Math.min(
      ...colors.flatMap((left, leftIndex) =>
        colors.slice(leftIndex + 1).map((right) =>
          workbenchPerceptualColorDistanceV3(left, right)),
      ),
    );
    expect(minimumPairDistance(traceColors.map(
      ({ automaticColorHex }) => automaticColorHex,
    ))).toBeGreaterThan(0.1);
    for (const appTheme of ["dark", "light"] as const) {
      const renderedColors = traceColors.map((trace) =>
        resolveWorkbenchGraphTraceStyleV3({
          pane: reconciled.graphPanes[0]!,
          surface: reconciled,
          renderer: "sweep",
          authoredScenarioCount: 2,
          scenarioId: trace.scenarioId,
          scenarioIndex: trace.scenarioId === "scenario/a" ? 0 : 1,
          seriesId: trace.seriesId,
          seriesIndex: reconciled.graphPanes[0]!.series.findIndex(
            ({ seriesId }) => seriesId === trace.seriesId,
          ),
          appTheme,
        }).color,
      );
      expect(
        minimumPairDistance(renderedColors),
        `${appTheme}: ${renderedColors.join(", ")}`,
      ).toBeGreaterThan(0.12);
    }
  });

  it("retains allocated colors and gives a new baseline item its semantic color", () => {
    const pane: ExperimentSurfaceGraphPaneV2 = {
      paneId: "pane/pressure",
      role: "graph",
      label: "Pressure",
      order: 0,
      priority: 10,
      graphId: "graph/pressure",
      scenarioScope: { mode: "visible-scenarios" },
      excludedTraces: [],
      windowSec: 2,
      series: [
        {
          seriesId: "LVP",
          label: "LVP",
          order: 0,
        },
      ],
    };
    const allocated = reconcileWorkbenchGraphColorsV3(
      {
        graphPanes: [pane],
        outputPanes: [],
        controlPanes: [],
        note: { text: "" },
      },
      [{ scenarioId: "scenario/a" }],
    );
    const existing = allocated.graphPanes[0]?.traceColors;
    expect(
      updateWorkbenchScenarioBaseColorV3(
        allocated,
        "scenario/missing",
        "#8b76d1",
      ),
    ).toBe(allocated);
    const recoloredBase = updateWorkbenchScenarioBaseColorV3(
      allocated,
      "scenario/a",
      "#8b76d1",
    );
    expect(recoloredBase.graphPanes[0]?.traceColors).toEqual(existing);

    const withNewItem: ExperimentSurfaceV2 = {
      ...recoloredBase,
      graphPanes: [
        {
          ...recoloredBase.graphPanes[0]!,
          series: [
            ...recoloredBase.graphPanes[0]!.series,
            { seriesId: "LAP", label: "LAP", order: 1 },
          ],
        },
      ],
    };
    const reconciled = reconcileWorkbenchGraphColorsV3(withNewItem, [
      { scenarioId: "scenario/a" },
    ]);
    expect(
      reconciled.graphPanes[0]?.traceColors?.find(
        ({ seriesId }) => seriesId === "LVP",
      )?.automaticColorHex,
    ).toBe(existing?.[0]?.automaticColorHex);
    expect(
      reconciled.graphPanes[0]?.traceColors?.find(
        ({ seriesId }) => seriesId === "LAP",
      )?.automaticColorHex,
    ).toBe(workbenchSemanticItemColorV3("LAP"));
  });

  it("allocates a single-chamber PV loop from the Scenario base color", () => {
    const pane: ExperimentSurfaceGraphPaneV2 = {
      paneId: "pane/pv",
      role: "graph",
      label: "PV loop",
      order: 0,
      priority: 10,
      graphId: "hemodynamics.pressure-volume",
      scenarioScope: { mode: "visible-scenarios" },
      excludedTraces: [],
      historyDepth: 1,
      pressureVolumeAnalysisMode: "responsive-preview",
      series: [{ seriesId: "LV", label: "LV", order: 0 }],
    };
    const reconciled = reconcileWorkbenchGraphColorsV3(
      {
        graphPanes: [pane],
        outputPanes: [],
        controlPanes: [],
        note: { text: "" },
      },
      [{ scenarioId: "scenario/a" }],
    );

    expect(reconciled.scenarioColorSeeds?.[0]?.colorHex).toBe("#ff5f73");
    expect(reconciled.graphPanes[0]?.traceColors?.[0]?.automaticColorHex)
      .toBe("#ff5f73");

    const comparison = reconcileWorkbenchGraphColorsV3(reconciled, [
      { scenarioId: "scenario/a" },
      { scenarioId: "scenario/b" },
    ]);
    expect(comparison.graphPanes[0]?.traceColors?.map(
      ({ automaticColorHex }) => automaticColorHex,
    )).toEqual(["#ff5f73", "#39c2ff"]);
  });

  it("lets an exact Scenario/item custom color win over its frozen automatic color", () => {
    const surface: ExperimentSurfaceV2 = {
      scenarioColorSeeds: [
        { scenarioId: "scenario/a", colorHex: "#167db8" },
        { scenarioId: "scenario/b", colorHex: "#a96c08" },
      ],
      graphPanes: [],
      outputPanes: [],
      controlPanes: [],
      note: { text: "" },
    };
    const pane: ExperimentSurfaceGraphPaneV2 = {
      paneId: "pane/pressure",
      role: "graph",
      label: "Pressure",
      order: 0,
      priority: 10,
      graphId: "graph/pressure",
      scenarioScope: { mode: "visible-scenarios" },
      excludedTraces: [],
      windowSec: 2,
      traceColors: [
        {
          scenarioId: "scenario/b",
          seriesId: "lvp",
          automaticColorHex: "#a96c08",
          customColorHex: "#db2777",
        },
      ],
      series: [
        {
          seriesId: "lvp",
          label: "LVP",
          order: 0,
        },
      ],
    };
    const style = resolveWorkbenchGraphTraceStyleV3({
      pane,
      surface,
      renderer: "sweep",
      authoredScenarioCount: 2,
      scenarioId: "scenario/b",
      scenarioIndex: 1,
      seriesId: "lvp",
    });

    expect(style).toEqual({ color: "#db2777" });
  });

  it("resolves widely separated one-Scenario item colors per theme", () => {
    const pane: ExperimentSurfaceGraphPaneV2 = {
      paneId: "pane/pressure",
      role: "graph",
      label: "Pressure",
      order: 0,
      priority: 10,
      graphId: "graph/pressure",
      scenarioScope: { mode: "visible-scenarios" },
      excludedTraces: [],
      series: [],
    };
    const surface: ExperimentSurfaceV2 = {
      graphPanes: [pane],
      outputPanes: [],
      controlPanes: [],
      note: { text: "" },
    };
    const color = (seriesId: "LVP" | "LAP" | "AoP", appTheme: "light" | "dark") =>
      resolveWorkbenchGraphTraceStyleV3({
        pane,
        surface,
        renderer: "sweep",
        authoredScenarioCount: 1,
        scenarioId: "scenario/a",
        scenarioIndex: 0,
        seriesId,
        appTheme,
      }).color;

    expect([color("LVP", "dark"), color("LAP", "dark"), color("AoP", "dark")])
      .toEqual(["#e07ce8", "#39c2ff", "#ff5f73"]);
    expect([color("LVP", "light"), color("LAP", "light"), color("AoP", "light")])
      .toEqual(["#a12bc7", "#0068a3", "#c22347"]);
  });

  it("allocates new Scenario base colors as red, blue, purple, then green", () => {
    expect(Array.from({ length: 4 }, (_, index) =>
      workbenchDefaultScenarioColorV3(index)))
      .toEqual(["#ff5f73", "#39c2ff", "#8b76d1", "#2f9e7d"]);
    expect(new Set(Array.from({ length: 6 }, (_, index) => workbenchDefaultScenarioColorV3(index))).size).toBe(6);
  });

  it("migrates persisted former semantic seeds through the current theme palette", () => {
    expect(resolveWorkbenchAutomaticGraphColorV3({
      colorHex: "#33b1ff",
      appTheme: "dark",
    })).toBe("#39c2ff");
    expect(resolveWorkbenchAutomaticGraphColorV3({
      colorHex: "#33b1ff",
      appTheme: "light",
    })).toBe("#0068a3");
  });
});

function structuralOrientationV3(
  points: readonly (readonly [number, number])[],
): MainWireIntegratedModelStructuralReturnOrientationV3 {
  return {
    side: "left",
    semantics:
      "frozen-accepted-step-volume-constrained-structural-orientation-not-simulated-response",
    pressureBasis: "absolute",
    sourceAcceptedRevision: 1,
    sourceAcceptedTimeSec: 1,
    downstreamNode: "LA",
    downstreamPressureLabel: "LAP",
    fillingPressureLabel: "Pmpf orientation",
    fillingPressureMmHg: 13,
    operatingPoint: {
      downstreamPressureMmHg: 8,
      returnFlowLPerMin: 5.2,
      returnPath: "PVein_LA",
    },
    anchoring: {
      status: "starling-operating-anchor",
      method: "downstream-pressure-translation",
      downstreamPressureOffsetMmHg: 0,
      volumeResidualMl: 0,
    },
    curve: [
      { downstreamPressureMmHg: -2, returnFlowLPerMin: 7, flowLimited: true },
      { downstreamPressureMmHg: 13, returnFlowLPerMin: 0, flowLimited: false },
    ],
    starlingLocus: {
      status: "responsive-fixed-tbv-preview",
      protocolId: "protocol/test",
      warmupDurationSec: 0,
      measurementDurationSec: 10,
      minimumBeatCount: 3,
      maximumBeatCount: 20,
      slowControllerPolicy: "coronary-tone-frozen-at-branch-source",
      completedPointCount: points.length,
      totalPointCount: points.length,
      points: points.map(
        ([fillingPressureMmHg, cardiacOutputLPerMin], index) => ({
          totalBloodVolumeMl: 3_000 + index * 300,
          fillingPressureMmHg,
          cardiacOutputLPerMin,
          role: index === 2 ? "operating-anchor" : "continuation",
          quality: "locally-converged",
          curveEligible: true,
          completedBeatCount: 3,
          maximumNormalizedBeatDelta: 0.5,
          settled: false,
          finiteAndFixedTbvPassed: true,
          evidence: "responsive-preview",
          measurementWindowStatus: "complete-beat-converged",
          acceptedMeasurementDurationSec: 3,
          ventricularPressureVolumeLoop: Array.from(
            { length: 16 },
            (_, sampleIndex) => ({
              volumeMl: 55 + index * 3 + sampleIndex * 4,
              pressureMmHg: Math.max(
                4,
                90 + index * 8 - sampleIndex * 4,
              ),
            }),
          ),
          ventricularPressureVolumeLandmarks: {
            pressureBasis: "transmural",
            endDiastolic: {
              volumeMl: 120 + index * 5,
              pressureMmHg: 6 + index,
              event: "maximum-volume",
            },
            endSystolic: {
              volumeMl: 55 + index * 3,
              pressureMmHg: 90 + index * 8,
              event: "semilunar-valve-closure",
            },
          },
        }),
      ),
    },
    limitations: [],
  };
}

describe("PV pressure axis titles keep the pressure basis", () => {
  const trace = (chamberLabel: string, pressureBasis: "transmural" | "intracavitary") => ({ chamberLabel, pressureBasis }) as never;
  it("names the basis in full and compact form, and claims none for mixed bases", () => {
    expect(pvPressureAxisTitleV3([trace("LV", "transmural")])).toBe("LV transmural pressure (mmHg)");
    expect(pvCompactPressureAxisTitleV3([trace("LV", "transmural")])).toBe("LV Ptm (mmHg)");
    expect(pvPressureAxisTitleV3([trace("LV", "intracavitary"), trace("LV", "intracavitary")])).toBe("LV intracavitary pressure (mmHg)");
    expect(pvCompactPressureAxisTitleV3([trace("LV", "intracavitary")])).toBe("LV Pic (mmHg)");
    // Several chambers keep the basis but drop the chamber name.
    expect(pvPressureAxisTitleV3([trace("LV", "transmural"), trace("RV", "transmural")])).toBe("transmural pressure (mmHg)");
    expect(pvCompactPressureAxisTitleV3([trace("LV", "transmural"), trace("RV", "transmural")])).toBe("Ptm (mmHg)");
    // Mixed bases never present one basis, in either form.
    expect(pvPressureAxisTitleV3([trace("LV", "transmural"), trace("LV", "intracavitary")])).toBe("Pressure (mmHg)");
    expect(pvCompactPressureAxisTitleV3([trace("LV", "transmural"), trace("LV", "intracavitary")])).toBe("LV P (mmHg)");
    expect(pvCompactPressureAxisTitleV3([])).toBe("P (mmHg)");
  });
});

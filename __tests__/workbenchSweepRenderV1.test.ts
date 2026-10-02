import { afterEach, describe, expect, it, vi } from "vitest";
import { SweepDeltaEncoderV1, sweepTraceIdentityV1, SWEEP_ROW_WIDTH_V1, SWEEP_MAXIMUM_ROWS_V1, decodeSweepRowsV1,
  type SweepRenderFrameV1, type SweepTraceInputV1 } from "@/components/workbench/presentation/sweep/SweepRenderProtocolV1";
import { SweepRenderRecoveryV1 } from "@/components/workbench/presentation/sweep/SweepRenderRecoveryV1";
import { SweepRenderModelV1, sweepChunkSegmentsV1 } from "@/components/workbench/presentation/sweep/SweepRenderModelV1";
import { SweepRenderClientV1, type SweepWorkerTransportV1 } from "@/components/workbench/presentation/sweep/SweepRenderClientV1";
import { SweepRenderWorkerRuntimeV1, type SweepWorkerRequestV1, type SweepWorkerResponseV1 } from "@/components/workbench/presentation/sweep/SweepRenderWorkerRuntimeV1";
import { WorkbenchScenarioPresentationSampleStoreV3 } from "@/components/workbench/presentation/WorkbenchPresentationSampleStoreV3";
import { appendWorkbenchPresentationSamplesV3 } from "@/components/workbench/presentation/WorkbenchPresentationSampleBufferV3";
import { buildSweepingWaveformSegmentsV3 } from "./helpers/sweepGeometryReferenceV1";
import type { WorkbenchScalarSampleV3 } from "@/components/workbench/presentation/WorkbenchScalarSampleV3";

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
const theme = { canvas: "#000000", grid: "#222222", axis: "#444444", text: "#ffffff", font: "10px monospace" };
function sample(i: number, value: number | null = i, epoch = 0): WorkbenchScalarSampleV3 {
  return Object.freeze({ inputEpoch: epoch, acceptedRevision: i, acceptedTimeSec: i * .002,
    presentationTimeSec: i * .002, values: Object.freeze({ value, phase: (i * .002) % 1 }) });
}
function trace(samples: readonly WorkbenchScalarSampleV3[], id = "trace"): SweepTraceInputV1 {
  return { id, samples, outputId: "value", cyclePhaseOutputId: "phase", color: "#ff0000", alpha: 1, hidden: false };
}
function frame(encoder: SweepDeltaEncoderV1, sequence: number, samples: readonly WorkbenchScalarSampleV3[], overrides: Partial<SweepRenderFrameV1> = {}): SweepRenderFrameV1 {
  return { sequence, identity: "pane", width: 620, height: 300, pixelRatio: 1, windowSec: 6,
    includeZero: false, pressureAxis: false, theme, traces: encoder.encode([trace(samples)]), ...overrides };
}
function context() {
  const calls: unknown[][] = [];
  const target = { canvas: {}, calls } as unknown as CanvasRenderingContext2D & { calls: unknown[][] };
  return new Proxy(target, { get(object, key) {
    if (key in object) return Reflect.get(object, key);
    return (...args: unknown[]) => { calls.push([key, ...args]); };
  }, set(object, key, value) { Reflect.set(object, key, value); return true; } });
}

describe("incremental sweep rendering", () => {
  it("transfers only appended/replaced buckets while retaining exact extrema times", () => {
    const source = [sample(1, 10), sample(2, -30), sample(3, 90), sample(4, 15), sample(12, 20)];
    const buckets = appendWorkbenchPresentationSamplesV3([], source);
    const encoder = new SweepDeltaEncoderV1(), initial = encoder.encode([trace(buckets)])[0]!;
    const decoded = decodeSweepRowsV1(initial.rows);
    expect(decoded[0]!.points).toEqual([{ time: .002, value: 10 }, { time: .004, value: -30 }, { time: .006, value: 90 }, { time: .008, value: 15 }]);
    const next = appendWorkbenchPresentationSamplesV3(buckets, [sample(13, 21), sample(24, 100)]);
    const delta = encoder.encode([trace(next)])[0]!;
    expect(delta).toMatchObject({ baseLength: 2, removePrefix: 0, retainCount: 1 });
    expect(delta.rows.length).toBe(2 * SWEEP_ROW_WIDTH_V1);
    expect(encoder.encode([trace(next)])[0]!.rows.length).toBe(0);
    const model = new SweepRenderModelV1();
    model.apply({ ...frame(new SweepDeltaEncoderV1(), 1, []), traces: [initial] });
    model.apply({ ...frame(new SweepDeltaEncoderV1(), 2, []), traces: [delta] });
    expect(model.retainedRowCount).toBe(next.length);
  });

  it("gives series sharing the same scenario/output distinct renderer owners", () => {
    const samples = [sample(1, 10), sample(2, 20)], encoder = new SweepDeltaEncoderV1();
    const traces = [0, 1].map(ordinal => ({ ...trace(samples), id: sweepTraceIdentityV1("scenario", "value", ordinal) }));
    expect(traces[0]!.id).not.toBe(traces[1]!.id);
    const model = new SweepRenderModelV1();
    model.apply({ ...frame(new SweepDeltaEncoderV1(), 1, []), traces: encoder.encode(traces) });
    expect(model.retainedRowCount).toBe(4);
    expect(model.draw(context()).pointCount).toBe(4);
  });

  it("resynchronizes both main-thread delta owners after rejection and waits for changed input", () => {
    const recovery = new SweepRenderRecoveryV1(), initial = [sample(1)], input = {};
    recovery.paint(frame(recovery.encoder, 1, initial), context()); recovery.accept();
    const changed = [...initial, sample(2)], failedKey = { input, samples: [changed], dimensionsAndTheme: "same" };
    expect(recovery.canAttempt(failedKey)).toBe(true);
    expect(() => recovery.paint(frame(recovery.encoder, 2, changed, { width: 0 }), context())).toThrow(/dimensions/);
    recovery.reject(failedKey);
    expect(recovery.canAttempt({ ...failedKey, samples: [...failedKey.samples] })).toBe(false);
    const next = [...changed, sample(3)];
    expect(recovery.canAttempt({ ...failedKey, samples: [next] })).toBe(true);
    const valid = frame(recovery.encoder, 3, next);
    expect(valid.traces[0]).toMatchObject({ baseLength: 0, retainCount: 0 });
    expect(() => recovery.paint(valid, context())).not.toThrow();
    recovery.accept();
    expect(recovery.canAttempt(failedKey)).toBe(true);
  });

  it("handles sliding windows, changed middle samples, resets and rebinding without stale values", () => {
    const encoder = new SweepDeltaEncoderV1(), model = new SweepRenderModelV1();
    const original = Array.from({ length: 100 }, (_, i) => sample(i));
    model.apply(frame(encoder, 1, original));
    const shifted = [...original.slice(10), sample(100)];
    const next = frame(encoder, 2, shifted);
    expect(next.traces[0]).toMatchObject({ removePrefix: 10, retainCount: 90 });
    model.apply(next);
    const changed = shifted.map((item, i) => i === 10 ? sample(20, 900) : item);
    const middle = frame(encoder, 3, changed);
    expect(middle.traces[0]!.retainCount).toBe(10);
    model.apply(middle);
    expect(model.draw(context()).domain[1]).toBeGreaterThanOrEqual(900);
    model.apply(frame(encoder, 4, [sample(1, -90, 1)]));
    expect(model.retainedRowCount).toBe(1);
    const rebound = encoder.encode([{ ...trace([sample(1, -90, 1)]), outputId: "phase" }])[0]!;
    expect(rebound.retainCount).toBe(0);
  });

  it("does not trust shallow-frozen or getter-backed input across publications", () => {
    const mutableValues = { value: 2, phase: .1 };
    const shallow = Object.freeze({ ...sample(1), values: mutableValues });
    let observed = 5;
    const getter = Object.freeze({ ...sample(2), values: Object.freeze({ get value() { return observed; }, phase: .2 }) });
    const encoder = new SweepDeltaEncoderV1(), model = new SweepRenderModelV1();
    model.apply(frame(encoder, 1, [shallow, getter]));
    mutableValues.value = 17; observed = 90;
    const changed = frame(encoder, 2, [shallow, getter]);
    expect(changed.traces[0]).toMatchObject({ baseLength: 2, removePrefix: 2, retainCount: 0 });
    expect(decodeSweepRowsV1(changed.traces[0]!.rows).map(row => row.points[0]!.value)).toEqual([17, 90]);
    model.apply(changed);
    expect(model.draw(context()).domain[1]).toBeGreaterThanOrEqual(90);
  });

  it("retains original sample pairs and splits nulls, epochs and wraps, including chunk predecessors", () => {
    const encoder = new SweepDeltaEncoderV1();
    const samples = [sample(1, 5), sample(2, null), sample(3, 8), sample(4, 9, 1), sample(3000, 12, 1), sample(3001, 13, 1)];
    const rows = decodeSweepRowsV1(encoder.encode([trace(samples)])[0]!.rows);
    const segments = sweepChunkSegmentsV1(rows, undefined, 6, -Infinity);
    expect(segments).toEqual([
      [{ phaseSec: .002, value: 5 }], [{ phaseSec: .006, value: 8 }],
      [{ phaseSec: .008, value: 9 }], [{ phaseSec: 0, value: 12 }, { phaseSec: .0019999999999997797, value: 13 }],
    ]);
    expect(sweepChunkSegmentsV1(rows.slice(2, 3), rows[1], 6, -Infinity)).toEqual([[{ phaseSec: .006, value: 8 }]]);
    expect(sweepChunkSegmentsV1(rows.slice(3, 4), rows[2], 6, -Infinity)).toEqual([[{ phaseSec: .006, value: 8 }], [{ phaseSec: .008, value: 9 }]]);
  });

  it("renders cloned edited history when the duplicate runtime restarts its epoch at zero", () => {
    const store = new WorkbenchScenarioPresentationSampleStoreV3();
    store.append("edited", [sample(1, 10, 1), sample(10, 20, 1)]);
    expect(store.cloneScenario("edited", "copy")).toBe(true);
    const encoder = new SweepDeltaEncoderV1(), model = new SweepRenderModelV1();
    model.apply(frame(encoder, 1, store.getScenarioSnapshot("copy")));
    store.append("copy", [sample(11, 30, 0), sample(20, 40, 0)]);
    const copiedHistory = store.getScenarioSnapshot("copy");
    expect(copiedHistory.map(row => row.inputEpoch)).toEqual([1, 1, 0, 0]);
    expect(copiedHistory.every((row, i) => i === 0 || row.presentationTimeSec >= copiedHistory[i - 1]!.presentationTimeSec)).toBe(true);
    expect(() => model.apply(frame(encoder, 2, copiedHistory))).not.toThrow();
    expect(() => model.draw(context())).not.toThrow();
    const rows = decodeSweepRowsV1(new SweepDeltaEncoderV1().encode([trace(copiedHistory)])[0]!.rows);
    expect(sweepChunkSegmentsV1(rows, undefined, 6, -Infinity).map(segment => segment.map(point => point.value)))
      .toEqual([[10, 20], [30, 40]]); // No connecting stroke across either epoch direction.
    expect(store.getScenarioSnapshot("edited").map(row => row.inputEpoch)).toEqual([1, 1]);
  });

  it("matches the existing point projection on complete finite waveforms", () => {
    const raw = Array.from({ length: 1000 }, (_, i) => sample(i, Math.sin(i * .05) * 30));
    const buckets = appendWorkbenchPresentationSamplesV3([], raw);
    const encoded = new SweepDeltaEncoderV1().encode([trace(buckets)])[0]!;
    const rows = decodeSweepRowsV1(encoded.rows);
    expect(sweepChunkSegmentsV1(rows, undefined, 6, -Infinity)).toEqual(
      buildSweepingWaveformSegmentsV3(buckets, "value", { windowSec: 6, forwardGapFraction: 0 }));
  });

  it("rejects malformed row matrices and applies multi-trace updates atomically", () => {
    const encoder = new SweepDeltaEncoderV1(), model = new SweepRenderModelV1();
    const initial = frame(encoder, 1, [sample(1)]); model.apply(initial);
    expect(model.apply(initial)).toBe(false);
    const valid = frame(encoder, 2, [sample(1), sample(2)]);
    const corrupted = { ...valid.traces[0]!, id: "bad", baseLength: 99 };
    expect(() => model.apply({ ...valid, traces: [...valid.traces, corrupted] })).toThrow(/prefix/);
    expect(model.sequence).toBe(1); expect(model.retainedRowCount).toBe(1);
    expect(model.apply(valid)).toBe(true);
    expect(() => decodeSweepRowsV1(new Float64Array(12))).toThrow(/matrix/);
    const bad = new Float64Array(initial.traces[0]!.rows); bad[4] = 5;
    expect(() => decodeSweepRowsV1(bad)).toThrow(/row/);
    bad[4] = 1; bad[5] = 2;
    expect(() => decodeSweepRowsV1(bad)).toThrow(/ordering/);
  });

  it("bounds retained history and reuses completed screen paths after append", () => {
    class Path { static count = 0; constructor() { Path.count++; } moveTo() {} lineTo() {} }
    vi.stubGlobal("Path2D", Path);
    const encoder = new SweepDeltaEncoderV1(), model = new SweepRenderModelV1();
    const source = Array.from({ length: 256 }, (_, i) => sample(i, 2));
    model.apply(frame(encoder, 1, source)); model.draw(context());
    expect(Path.count).toBe(4);
    model.apply(frame(encoder, 2, [...source, sample(256, 2)])); model.draw(context());
    expect(Path.count).toBe(5); // No rebuilt interior paths.
    const many = Array.from({ length: SWEEP_MAXIMUM_ROWS_V1 + 3 }, (_, i) => sample(i));
    model.apply(frame(encoder, 3, many));
    expect(model.retainedRowCount).toBe(SWEEP_MAXIMUM_ROWS_V1);
  });

  it("expires cached finite points behind a moving cutoff when a completed chunk starts with null", () => {
    class Path {
      readonly points: [number, number][] = [];
      moveTo(x: number, y: number) { this.points.push([x, y]); }
      lineTo(x: number, y: number) { this.points.push([x, y]); }
    }
    vi.stubGlobal("Path2D", Path);
    // A 2-second pane can read a longer shared sweep history. The first full
    // 64-row chunk remains reusable as the pane's cutoff crosses its interior.
    const source = Array.from({ length: 120 }, (_, i) => Object.freeze({
      ...sample(i, i === 0 ? null : i), presentationTimeSec: i * .04,
    }));
    const encoder = new SweepDeltaEncoderV1(), model = new SweepRenderModelV1();
    const drawValues = (sequence: number, count: number) => {
      model.apply(frame(encoder, sequence, source.slice(0, count), { windowSec: 2, manualDomain: [0, 150] }));
      const ctx = context(); model.draw(ctx);
      // width=620,height=300 gives plot bottom=272 and top=12. Recover the
      // original signal/index from the actual stroked Path2D screen vertices.
      return ctx.calls.filter(call => call[0] === "stroke" && call[1] instanceof Path)
        .flatMap(call => (call[1] as Path).points.map(([, y]) => (272 - y) * 150 / 260));
    };
    const first = drawValues(1, 70); // latest=2.76, oldest=.76: index 19 is visible.
    expect(Math.min(...first)).toBeCloseTo(19, 9);
    const second = drawValues(2, 76); // latest=3.0, oldest=1.0: index 19 must expire.
    expect(Math.min(...second)).toBeCloseTo(25, 9);
    expect(second.some(value => value < 25 - 1e-9)).toBe(false);
    const expiredChunk = drawValues(3, 120); // Entire first chunk and incoming edge expire.
    expect(Math.min(...expiredChunk)).toBeCloseTo(69, 9);
    expect(expiredChunk.some(value => value < 69 - 1e-9)).toBe(false);
  });

  it("caches static axes and invalidates for size, DPR, range, theme and title", () => {
    const created: { width: number; height: number; ctx: ReturnType<typeof context> }[] = [];
    class Offscreen { ctx = context(); constructor(public width: number, public height: number) { created.push(this); } getContext() { return this.ctx; } }
    vi.stubGlobal("OffscreenCanvas", Offscreen);
    const encoder = new SweepDeltaEncoderV1(), model = new SweepRenderModelV1(), ctx = context();
    const source = [sample(1)];
    model.apply(frame(encoder, 1, source)); model.draw(ctx);
    model.apply(frame(encoder, 2, source)); model.draw(ctx);
    expect(created).toHaveLength(1);
    for (const [i, change] of [{ width: 700 }, { pixelRatio: 2 }, { manualDomain: [0, 20] as const }, { theme: { ...theme, text: "#abcdef" } }, { axisTitle: "Pressure" }].entries()) {
      model.apply(frame(encoder, i + 3, source, change)); model.draw(ctx);
    }
    expect(created).toHaveLength(6);
    expect(ctx.calls.filter(call => call[0] === "drawImage")).toHaveLength(7);
  });
});

class Transport implements SweepWorkerTransportV1 {
  listeners = new Map<string, Set<(event: any) => void>>();
  readonly requests: SweepWorkerRequestV1[] = [];
  terminate = vi.fn();
  readonly contexts = new Map<string, ReturnType<typeof context>>();
  readonly runtime = new SweepRenderWorkerRuntimeV1(response => this.emit(response));
  constructor(readonly automatic = true) {}
  addEventListener(type: string, listener: (event: any) => void) { const set = this.listeners.get(type) ?? new Set(); set.add(listener); this.listeners.set(type, set); }
  postMessage(message: SweepWorkerRequestV1) { this.requests.push(message); if (this.automatic) queueMicrotask(() => this.runtime.handle(message)); }
  emit(message: SweepWorkerResponseV1) { for (const listener of this.listeners.get("message") ?? []) listener({ data: message }); }
  canvas(id: string) { const ctx = context(); this.contexts.set(id, ctx); return { width: 1, height: 1, getContext: () => ctx } as unknown as OffscreenCanvas; }
}

describe("shared sweep rendering Worker", () => {
  it("uses one Worker for two isolated panes, matches main commands and disposes independently", async () => {
    const transport = new Transport(), client = new SweepRenderClientV1(transport);
    await client.ready;
    await client.attach("one", transport.canvas("one"), vi.fn());
    await client.attach("two", transport.canvas("two"), vi.fn());
    expect(transport.runtime.paneCount).toBe(2);
    const input = frame(new SweepDeltaEncoderV1(), 1, [sample(1, -3), sample(2, 8)]);
    const direct = new SweepRenderModelV1(), ctx = context(); direct.apply(input); const expected = direct.draw(ctx);
    const result = await client.draw("one", input);
    expect(result.domain).toEqual(expected.domain);
    expect(result.pointCount).toBe(expected.pointCount);
    expect(transport.contexts.get("one")!.calls).toEqual(ctx.calls);
    client.disposePane("one"); await Promise.resolve();
    expect(transport.runtime.paneCount).toBe(1);
    await expect(client.draw("two", frame(new SweepDeltaEncoderV1(), 1, [sample(1)]))).resolves.toMatchObject({ sequence: 1 });
    client.disposePane("two"); await Promise.resolve(); client.dispose();
    expect(transport.runtime.paneCount).toBe(0);
    expect(transport.terminate).toHaveBeenCalledOnce();
  });

  it("rejects readiness failures and fans errors out to all attached panes", async () => {
    vi.useFakeTimers();
    const stalled = new Transport(false), timed = new SweepRenderClientV1(stalled, 100);
    const ready = expect(timed.ready).rejects.toThrow(/readiness/);
    await vi.advanceTimersByTimeAsync(100); await ready;
    expect(stalled.terminate).toHaveBeenCalledOnce();
    const transport = new Transport(), client = new SweepRenderClientV1(transport), first = vi.fn(), second = vi.fn();
    await client.ready; await client.attach("one", transport.canvas("one"), first); await client.attach("two", transport.canvas("two"), second);
    transport.emit({ kind: "error", message: "transport failed" });
    expect(first).toHaveBeenCalledOnce(); expect(second).toHaveBeenCalledOnce();
    expect(client.failed).toBe(true); expect(client.paneCount).toBe(0);
  });

  it("isolates one rejected pane while another continues using the shared Worker", async () => {
    const transport = new Transport(), client = new SweepRenderClientV1(transport), first = vi.fn(), second = vi.fn();
    await client.ready;
    await client.attach("bad", transport.canvas("bad"), first);
    await client.attach("good", transport.canvas("good"), second);
    const goodEncoder = new SweepDeltaEncoderV1();
    const invalid = client.draw("bad", frame(new SweepDeltaEncoderV1(), 1, [sample(1)], { width: 0 }));
    const invalidAssertion = expect(invalid).rejects.toThrow(/dimensions/);
    await expect(client.draw("good", frame(goodEncoder, 1, [sample(1)]))).resolves.toMatchObject({ sequence: 1 });
    await invalidAssertion;
    expect(first).toHaveBeenCalledOnce(); expect(second).not.toHaveBeenCalled();
    expect(client.failed).toBe(false); expect(client.paneCount).toBe(1); expect(transport.terminate).not.toHaveBeenCalled();
    await expect(client.draw("good", frame(goodEncoder, 2, [sample(1), sample(2)]))).resolves.toMatchObject({ sequence: 2 });
    client.disposePane("good"); client.dispose();
  });

  it("bounds each pane to one pending draw, ignores stale replies and cancels disposed work", async () => {
    const transport = new Transport(false), client = new SweepRenderClientV1(transport);
    transport.emit({ kind: "ready" }); await client.ready;
    const attached = client.attach("one", transport.canvas("one"), vi.fn()); await Promise.resolve();
    transport.emit({ kind: "attached", paneId: "one" }); await attached;
    const input = frame(new SweepDeltaEncoderV1(), 2, [sample(2)]), pending = client.draw("one", input);
    await expect(client.draw("one", input)).rejects.toThrow(/busy/);
    let settled = false; void pending.then(() => { settled = true; });
    transport.emit({ kind: "drawn", paneId: "one", result: { sequence: 1, domain: [0, 10], prepareMs: 0, drawMs: 0, pointCount: 1 } });
    await Promise.resolve(); expect(settled).toBe(false);
    transport.emit({ kind: "drawn", paneId: "one", result: { sequence: 2, domain: [0, 10], prepareMs: 0, drawMs: 0, pointCount: 1 } });
    await pending;
    const cancelled = client.draw("one", { ...input, sequence: 3 });
    const assertion = expect(cancelled).rejects.toThrow(/disposed/); client.disposePane("one"); await assertion; client.dispose();
  });

  it("falls back through a reported fatal failure when the Worker cannot attach its 2D context", async () => {
    const transport = new Transport(), client = new SweepRenderClientV1(transport), fail = vi.fn();
    await client.ready;
    await expect(client.attach("one", { getContext: () => null } as unknown as OffscreenCanvas, fail)).rejects.toThrow(/unavailable/);
    expect(fail).toHaveBeenCalledOnce(); expect(transport.terminate).not.toHaveBeenCalled();
    expect(client.failed).toBe(false); client.dispose();
  });
});

import { EventEmitter } from "node:events";
import { mkdtemp, open, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { CDPSession } from "@playwright/test";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CARDIORESPIRATORY_SAMPLE_START_MARK as START, CARDIORESPIRATORY_SAMPLE_END_MARK as END,
  groupCardiorespiratoryRenderDiagnosticsV1, parseCardiorespiratoryBrowserArgumentsV1 as parse,
  summarizeCardiorespiratoryTraceV1, type BrowserTraceEventV1 } from "../tools/performance/cardiorespiratoryBrowserMeasurementsV1";
import { CARDIORESPIRATORY_TRACE_SUMMARY_MAX_BYTES_V1, CardiorespiratoryBrowserTraceV1, readCardiorespiratoryTraceSummaryV1 } from "../tools/performance/cardiorespiratoryBrowserObservationV1";

describe("cardiorespiratory browser measurement arguments and scope", () => {
  it("preserves the existing untraced headless defaults", () => {
    expect(parse([])).toEqual({ origin: "http://127.0.0.1:4216", mode: "default", throttle: 1, useMaximumRate: false,
      targetPlaybackRate: null, scenarioCount: 1, warmupMs: 4000, sampleMs: 5000, headed: false, dpr: 1,
      viewport: { width: 1440, height: 900 }, tracePath: null, sweepRenderer: null, presentationMs: null });
  });

  it("accepts explicit rendering/environment controls without altering target playback", () => {
    expect(parse(["--headed", "--dpr", "2", "--viewport", "1920x1080", "--scenarios", "5", "--playback-rate", "1",
      "--sample-ms", "60000", "--sweep-renderer", "worker", "--presentation-ms", "16", "--cdp-trace", "/tmp/render.json"]))
      .toMatchObject({ headed: true, dpr: 2, viewport: { width: 1920, height: 1080 }, scenarioCount: 5,
        targetPlaybackRate: 1, sampleMs: 60000, sweepRenderer: "worker", presentationMs: "16", tracePath: "/tmp/render.json" });
    expect(parse(["--presentation-ms", "auto", "--sweep-renderer", "main", "--maximum-rate"]))
      .toMatchObject({ presentationMs: "auto", sweepRenderer: "main", useMaximumRate: true });
  });

  it("rejects missing, duplicate, unknown, nonfinite and incompatible arguments", () => {
    const invalid = [["--dpr"], ["--dpr", "--headed"], ["--dpr", "NaN"], ["--dpr", "0"], ["--dpr", "4.1"],
      ["--headed", "true"], ["--headed", "--headed"], ["--unknown"], ["--scenarios", "1.5"], ["--scenarios", "6"],
      ["--sample-ms", "999"], ["--sample-ms", "600001"], ["--viewport", "1440,900"], ["--viewport", "100x900"],
      ["--viewport", "1440x900.5"], ["--origin", "file:///tmp"], ["--origin", "https://example.org/path"],
      ["--view", "none"], ["--main-thread-throttle", "Infinity"], ["--presentation-ms", "17"], ["--sweep-renderer", "webgl"],
      ["--maximum-rate", "--playback-rate", "1"], ["--playback-rate", "1.01"]];
    for (const args of invalid) expect(() => parse(args), args.join(" ")).toThrow();
  });

  it("keeps per-pane metrics distinct from aggregate renderer counters", () => {
    const metric = { count: 2, meanMs: 3, p95Ms: 4, maximumMs: 4, latestMs: 2 };
    const value = { count: 2, mean: 1, recentMean: 1, p05: 1, p95: 1, minimum: 1, maximum: 1, latest: 1 };
    const grouped = groupCardiorespiratoryRenderDiagnosticsV1({ enabled: true, capturedAtMs: 100,
      metrics: { "render.sweep.pane.1.draw": metric, "render.sweep.pane.2.draw": metric, "canvas.sweep.draw": metric, "worker.solve": metric },
      values: { "render.sweep.pane.1.backend": value }, counters: { "render.sweep.pane.1.skipped": 5, "canvas.static-layer.paint": 3 } });
    expect(Object.keys(grouped.panes)).toEqual(["sweep.pane.1", "sweep.pane.2"]);
    expect(grouped.panes["sweep.pane.1"]).toMatchObject({ paneId: "pane.1", metrics: { draw: metric }, values: { backend: value }, counters: { skipped: 5 } });
    expect(grouped.aggregate).toEqual({ metrics: { "canvas.sweep.draw": metric }, values: {}, counters: { "canvas.static-layer.paint": 3 } });
  });
});

const markedEvents = (): BrowserTraceEventV1[] => [
  { name: "thread_name", ph: "M", pid: 1, tid: 2, args: { name: "CrRendererMain" } },
  { name: START, ph: "R", ts: 1000, pid: 1, tid: 2 }, { name: END, ph: "R", ts: 11000, pid: 1, tid: 2 },
  { name: "Paint", ph: "X", ts: 0, dur: 5000, pid: 1, tid: 2 },
  { name: "RasterTask", ph: "X", ts: 10000, dur: 5000, pid: 3, tid: 4 },
  { name: "DrawFrame", ph: "I", ts: 3000, pid: 3, tid: 4 },
  { name: "DroppedFrame", ph: "I", ts: 4000, pid: 1, tid: 2 },
  { name: "PipelineReporter", ph: "b", ts: 5000, pid: 3, tid: 4, args: { chrome_frame_reporter: { state: "STATE_DROPPED" } } },
  { name: "PipelineReporter", ph: "e", ts: 5500, pid: 3, tid: 4, args: { chrome_frame_reporter: { state: "STATE_DROPPED" } } },
  { name: "DrawFrame", ph: "I", ts: 12000, pid: 3, tid: 4 },
];

describe("trace evidence scope", () => {
  it("clips complete render durations and excludes post-sample interactions without pretending draw markers are FPS", () => {
    const summary = summarizeCardiorespiratoryTraceV1(markedEvents());
    expect(summary.windowDurationMs).toBe(10);
    expect(summary.renderCompleteEvents).toEqual({ Paint: { count: 1, overlappingDurationMs: 4 }, RasterTask: { count: 1, overlappingDurationMs: 1 } });
    expect(summary.observedFrameEventMarkers).toEqual({ DrawFrame: 1, DroppedFrame: 1, PipelineReporter: 2 });
    expect(summary.pipelineReporterStates).toEqual({ "chrome_frame_reporter.STATE_DROPPED": 1 });
    expect(summary.physicalPresentationFps).toBeNull(); expect(summary.physicalDroppedFrameCount).toBeNull();
    expect(summary.observedThreads).toContainEqual({ pid: 1, tid: 2, name: "CrRendererMain", observedEvents: 3 });
  });

  it("reports absent compositor state evidence as unavailable, and refuses ambiguous windows", () => {
    expect(summarizeCardiorespiratoryTraceV1(markedEvents().filter(event => event.name !== "PipelineReporter")).pipelineReporterStates).toBeNull();
    for (const events of [[], markedEvents().filter(event => event.name !== END), [...markedEvents(), { name: START, ts: 1200 }],
      [{ name: START, ts: 5 }, { name: END, ts: 2 }]]) expect(() => summarizeCardiorespiratoryTraceV1(events)).toThrow();
  });
});

describe("CDP trace lifecycle", () => {
  const directories: string[] = [];
  afterEach(async () => { for (const directory of directories.splice(0)) await rm(directory, { recursive: true, force: true }); });
  const tracePath = async () => {
    const directory = await mkdtemp(join(tmpdir(), "cardiorespiratory-trace-test-")); directories.push(directory);
    return join(directory, "trace.json");
  };
  function cdpFixture(failRead = false, rawTrace = JSON.stringify({ traceEvents: markedEvents() })) {
    const events = new EventEmitter();
    const send = vi.fn(async (method: string) => {
      if (method === "Tracing.end") queueMicrotask(() => events.emit("Tracing.tracingComplete", { stream: "handle", dataLossOccurred: false }));
      if (method === "IO.read") {
        if (failRead) throw new Error("stream read failed");
        return { data: Buffer.from(rawTrace).toString("base64"), base64Encoded: true, eof: true };
      }
      return {};
    });
    return { cdp: Object.assign(events, { send }) as unknown as CDPSession, send, events };
  }

  it("streams the exact trace, closes resources and stops only once", async () => {
    const fixture = cdpFixture(), path = await tracePath(), trace = new CardiorespiratoryBrowserTraceV1(fixture.cdp, path);
    await trace.start();
    const completion = trace.stop(); expect(trace.stop()).toBe(completion);
    expect(await completion).toMatchObject({ path, dataLossOccurred: false, summary: { windowDurationMs: 10 },
      summaryAvailability: { status: "available", reason: null, maximumInputBytes: CARDIORESPIRATORY_TRACE_SUMMARY_MAX_BYTES_V1 } });
    expect(JSON.parse(await readFile(path, "utf8")).traceEvents).toEqual(markedEvents());
    expect(fixture.send.mock.calls.filter(([method]) => method === "Tracing.end")).toHaveLength(1);
    expect(fixture.send).toHaveBeenCalledWith("IO.close", { handle: "handle" });
    expect(fixture.events.listenerCount("Tracing.tracingComplete")).toBe(0);
  });

  it("releases the stream and listener on a read failure", async () => {
    const fixture = cdpFixture(true), trace = new CardiorespiratoryBrowserTraceV1(fixture.cdp, await tracePath());
    await trace.start(); await expect(trace.stop()).rejects.toThrow("stream read failed");
    expect(fixture.send).toHaveBeenCalledWith("IO.close", { handle: "handle" });
    expect(fixture.events.listenerCount("Tracing.tracingComplete")).toBe(0);
  });

  it("never overwrites existing trace evidence", async () => {
    const fixture = cdpFixture(), path = await tracePath(); await writeFile(path, "previous evidence");
    const trace = new CardiorespiratoryBrowserTraceV1(fixture.cdp, path);
    await expect(trace.start()).rejects.toThrow();
    expect(fixture.send).not.toHaveBeenCalled(); expect(await readFile(path, "utf8")).toBe("previous evidence");
  });

  it("skips large raw traces before parsing without allocating or reading their contents", async () => {
    const path = await tracePath(), file = await open(path, "wx");
    // Sparse length exercises the real default cap without constructing a 64 MiB
    // string or reading a large artifact as part of the regression test.
    try { await file.truncate(CARDIORESPIRATORY_TRACE_SUMMARY_MAX_BYTES_V1 + 1); } finally { await file.close(); }
    expect(await readCardiorespiratoryTraceSummaryV1(path)).toMatchObject({ summary: null,
      rawTraceBytes: CARDIORESPIRATORY_TRACE_SUMMARY_MAX_BYTES_V1 + 1,
      summaryAvailability: { status: "skipped-size-limit", maximumInputBytes: CARDIORESPIRATORY_TRACE_SUMMARY_MAX_BYTES_V1 } });
  });

  it("retains a successful capture when optional JSON parsing or window analysis fails", async () => {
    for (const rawTrace of ["{malformed", JSON.stringify({ traceEvents: [] })]) {
      const fixture = cdpFixture(false, rawTrace), path = await tracePath(), trace = new CardiorespiratoryBrowserTraceV1(fixture.cdp, path);
      await trace.start();
      expect(await trace.stop()).toMatchObject({ path, dataLossOccurred: false, summary: null, rawTraceBytes: Buffer.byteLength(rawTrace),
        summaryAvailability: { status: "unavailable" } });
      expect(await readFile(path, "utf8")).toBe(rawTrace);
      expect(fixture.send).toHaveBeenCalledWith("IO.close", { handle: "handle" });
      expect(fixture.events.listenerCount("Tracing.tracingComplete")).toBe(0);
    }
  });
});

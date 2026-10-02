import type { CDPSession } from "@playwright/test";
import { open, type FileHandle } from "node:fs/promises";
import { summarizeCardiorespiratoryTraceV1, type BrowserTraceEventV1 } from "./cardiorespiratoryBrowserMeasurementsV1";

/** Serialized into the page by Playwright: deliberately has no runtime imports
 * or closure dependencies, and never patches renderer/React/rAF implementations. */
export function installCardiorespiratoryBrowserObserverV1() {
  type Entry = PerformanceEntry & { blockingDuration?: number; renderStart?: number; styleAndLayoutStart?: number;
    presentationTime?: number; paintTime?: number; processingStart?: number; processingEnd?: number; interactionId?: number;
    scripts?: { duration?: number; forcedStyleAndLayoutDuration?: number }[] };
  let active = false, startMs = 0, endMs = 0, frameRequest = 0, previousFrame: number | null = null;
  let frameIntervals: number[] = [], entries: Entry[] = [], observers: PerformanceObserver[] = [], observerErrors: string[] = [];
  let hiddenDuringWindow = false, discardedEntries = 0;
  const supportedEntryTypes = typeof PerformanceObserver === "function" ? [...PerformanceObserver.supportedEntryTypes] : [];
  const addEntries = (incoming: PerformanceEntry[]) => {
    for (const entry of incoming) {
      if (entries.length < 100000) entries.push(entry as Entry); else discardedEntries++;
    }
  };
  const visibility = () => { if (document.visibilityState !== "visible") hiddenDuringWindow = true; };
  const frame = (timestamp: number) => {
    if (!active) return;
    if (previousFrame !== null) frameIntervals.push(timestamp - previousFrame);
    previousFrame = timestamp;
    frameRequest = requestAnimationFrame(frame);
  };
  const stats = (values: number[]) => {
    const finite = values.filter(Number.isFinite).sort((a, b) => a - b);
    if (!finite.length) return { count: 0, meanMs: null, p50Ms: null, p95Ms: null, maximumMs: null, totalMs: 0 };
    const totalMs = finite.reduce((a, b) => a + b, 0);
    return { count: finite.length, meanMs: totalMs / finite.length, p50Ms: finite[Math.floor((finite.length - 1) * .5)]!,
      p95Ms: finite[Math.floor((finite.length - 1) * .95)]!, maximumMs: finite[finite.length - 1]!, totalMs };
  };
  const api = {
    start() {
      if (active) throw new Error("Browser observation is already active");
      entries = []; frameIntervals = []; observerErrors = []; observers = []; previousFrame = null;
      discardedEntries = 0; hiddenDuringWindow = document.visibilityState !== "visible";
      startMs = performance.now(); endMs = 0; active = true;
      for (const type of ["long-animation-frame", "longtask", "event"]) {
        if (!supportedEntryTypes.includes(type)) continue;
        try {
          const observer = new PerformanceObserver(list => addEntries(list.getEntries()));
          observer.observe({ type, buffered: false, ...(type === "event" ? { durationThreshold: 16 } : {}) });
          observers.push(observer);
        } catch (error) { observerErrors.push(`${type}: ${String(error)}`); }
      }
      document.addEventListener("visibilitychange", visibility);
      frameRequest = requestAnimationFrame(frame);
    },
    stop() {
      if (!active) throw new Error("Browser observation is not active");
      endMs = performance.now(); active = false; cancelAnimationFrame(frameRequest);
      for (const observer of observers) { addEntries(observer.takeRecords()); observer.disconnect(); }
      observers = []; document.removeEventListener("visibilitychange", visibility);
      // Entries may be delivered later than their start; retain only this window.
      const observed = entries.filter(entry => entry.startTime >= startMs && entry.startTime < endMs);
      const loaf = observed.filter(entry => entry.entryType === "long-animation-frame");
      const longTasks = observed.filter(entry => entry.entryType === "longtask");
      const events = observed.filter(entry => entry.entryType === "event");
      const scripts = loaf.flatMap(entry => entry.scripts ?? []);
      const positive = (value: number | undefined) => typeof value === "number" && value > 0;
      return { wallMs: endMs - startMs, supportedEntryTypes, observerErrors, discardedEntries, hiddenDuringWindow,
        rafCallbackIntervals: stats(frameIntervals),
        rafIntervalsOver25Ms: frameIntervals.filter(value => value > 25).length,
        rafScope: "Independent requestAnimationFrame callback intervals; not pane draws, GPU completion, presented FPS, or dropped frames; 25 ms threshold is a 60 Hz cadence diagnostic only",
        longAnimationFrames: { supported: supportedEntryTypes.includes("long-animation-frame"), duration: stats(loaf.map(entry => entry.duration)),
          blockingDuration: stats(loaf.flatMap(entry => typeof entry.blockingDuration === "number" ? [entry.blockingDuration] : [])),
          renderPhase: stats(loaf.flatMap(entry => positive(entry.renderStart) ? [entry.startTime + entry.duration - entry.renderStart!] : [])),
          styleAndLayoutPhase: stats(loaf.flatMap(entry => positive(entry.styleAndLayoutStart) ? [entry.startTime + entry.duration - entry.styleAndLayoutStart!] : [])),
          scriptDuration: stats(scripts.flatMap(entry => typeof entry.duration === "number" ? [entry.duration] : [])),
          forcedStyleAndLayoutDuration: stats(scripts.flatMap(entry => typeof entry.forcedStyleAndLayoutDuration === "number" ? [entry.forcedStyleAndLayoutDuration] : [])),
          presentationAfterPaint: stats(loaf.flatMap(entry => positive(entry.presentationTime) && positive(entry.paintTime)
            && entry.presentationTime! >= entry.paintTime! ? [entry.presentationTime! - entry.paintTime!] : [])),
          scope: "Browser-reported long animation frames (>50 ms), not all frames; script/render scopes can overlap; presentation fields are experimental and reported only when available" },
        longTasks: { supported: supportedEntryTypes.includes("longtask"), duration: stats(longTasks.map(entry => entry.duration)) },
        eventTiming: { supported: supportedEntryTypes.includes("event"), duration: stats(events.map(entry => entry.duration)),
          inputDelay: stats(events.flatMap(entry => typeof entry.processingStart === "number" ? [entry.processingStart - entry.startTime] : [])),
          processingDuration: stats(events.flatMap(entry => typeof entry.processingStart === "number" && typeof entry.processingEnd === "number"
            ? [entry.processingEnd - entry.processingStart] : [])),
          names: [...new Set(events.map(entry => entry.name))], distinctInteractionCount: new Set(events.map(entry => entry.interactionId).filter(id => id !== undefined && id > 0)).size,
          scope: "PerformanceEventTiming events delivered by the browser with requested durationThreshold=16 ms; rounded durations and omitted short events; not a complete INP measurement" } };
    },
  };
  (window as Window & { __circleHeartBrowserObservationV1?: typeof api }).__circleHeartBrowserObservationV1 = api;
  return api;
}

export type CardiorespiratoryBrowserObservationApiV1 = ReturnType<typeof installCardiorespiratoryBrowserObserverV1>;

/** Bound optional JSON parsing independently of trace duration. Chromium traces
 * can be hundreds of MB; parsing them must not discard an otherwise valid run.
 * This limits summary input, not the size of the streamed raw evidence file. */
export const CARDIORESPIRATORY_TRACE_SUMMARY_MAX_BYTES_V1 = 64 * 1024 * 1024;

export async function readCardiorespiratoryTraceSummaryV1(path: string) {
  let file: FileHandle | null = null;
  let rawTraceBytes: number | null = null;
  const result = (status: "available" | "skipped-size-limit" | "unavailable", reason: string | null,
    summary: ReturnType<typeof summarizeCardiorespiratoryTraceV1> | null = null) => ({ summary,
    summaryAvailability: { status, reason, maximumInputBytes: CARDIORESPIRATORY_TRACE_SUMMARY_MAX_BYTES_V1 }, rawTraceBytes });
  const skipped = () => result("skipped-size-limit", "Raw trace exceeds the 64 MiB summary input limit; full raw trace is retained for external trace analysis");
  try {
    file = await open(path, "r");
    rawTraceBytes = (await file.stat()).size;
    if (rawTraceBytes > CARDIORESPIRATORY_TRACE_SUMMARY_MAX_BYTES_V1) return skipped();
    // The stat is only a fast rejection. A bounded read also protects against a
    // file growing/replaced between capture and analysis; never call readFile.
    const chunks: Buffer[] = [];
    let bytes = 0;
    for (;;) {
      const buffer = Buffer.allocUnsafe(Math.min(1024 * 1024, CARDIORESPIRATORY_TRACE_SUMMARY_MAX_BYTES_V1 + 1 - bytes));
      const { bytesRead } = await file.read(buffer, 0, buffer.length, null);
      if (bytesRead === 0) break;
      bytes += bytesRead;
      if (bytes > CARDIORESPIRATORY_TRACE_SUMMARY_MAX_BYTES_V1) return skipped();
      chunks.push(buffer.subarray(0, bytesRead));
    }
    const trace = JSON.parse(Buffer.concat(chunks, bytes).toString("utf8")) as { traceEvents?: BrowserTraceEventV1[] };
    if (!Array.isArray(trace.traceEvents)) throw new Error("CDP trace has no traceEvents array");
    return result("available", null, summarizeCardiorespiratoryTraceV1(trace.traceEvents));
  } catch (error) {
    return result("unavailable", `Optional trace summary failed; raw trace retained: ${String(error)}`);
  } finally { if (file) await file.close(); }
}

/** A dedicated benchmark browser makes this browser-wide CDP trace isolated.
 * Stream the optional trace to an exclusively created file; retain raw evidence
 * on failure and always release the CDP stream and file descriptors. */
export class CardiorespiratoryBrowserTraceV1 {
  readonly #cdp: CDPSession;
  readonly path: string;
  #file: FileHandle | null = null;
  #running = false;
  #completion: Promise<{ path: string; dataLossOccurred: boolean } & Awaited<ReturnType<typeof readCardiorespiratoryTraceSummaryV1>>> | null = null;
  static readonly categories = ["devtools.timeline", "disabled-by-default-devtools.timeline.frame", "blink.user_timing", "cc", "benchmark", "viz", "gpu"];

  constructor(cdp: CDPSession, path: string) { this.#cdp = cdp; this.path = path; }

  async start() {
    if (this.#file || this.#running || this.#completion) throw new Error("Trace can only be started once");
    this.#file = await open(this.path, "wx");
    try {
      await this.#cdp.send("Tracing.start", { categories: CardiorespiratoryBrowserTraceV1.categories.join(","),
        transferMode: "ReturnAsStream", streamFormat: "json", streamCompression: "none" });
      this.#running = true;
    } catch (error) { await this.#file.close(); this.#file = null; throw error; }
  }

  stop() {
    if (this.#completion) return this.#completion;
    if (!this.#running || !this.#file) return Promise.reject(new Error("Trace was not started"));
    this.#completion = this.#finish();
    return this.#completion;
  }

  get started() { return this.#running || this.#completion !== null; }

  async #finish() {
    let handle: string | undefined;
    let cleanupListener = () => {};
    try {
      const complete = new Promise<{ stream?: string; dataLossOccurred: boolean }>((resolve, reject) => {
        const listener = (event: { stream?: string; dataLossOccurred: boolean }) => { cleanupListener(); resolve(event); };
        const timer = setTimeout(() => { cleanupListener(); reject(new Error("Timed out finishing CDP trace")); }, 30000);
        cleanupListener = () => { clearTimeout(timer); this.#cdp.off("Tracing.tracingComplete", listener); };
        this.#cdp.on("Tracing.tracingComplete", listener);
      });
      // Install the handler before ending: tracingComplete can arrive immediately.
      // Promise.all attaches rejection handlers even if Tracing.end itself fails.
      const [, result] = await Promise.all([this.#cdp.send("Tracing.end"), complete]);
      handle = result.stream;
      if (!handle) throw new Error("CDP did not return a trace stream");
      for (;;) {
        const chunk = await this.#cdp.send("IO.read", { handle, size: 1024 * 1024 });
        await this.#file!.writeFile(Buffer.from(chunk.data, chunk.base64Encoded ? "base64" : "utf8"));
        if (chunk.eof) break;
      }
      await this.#file!.close(); this.#file = null;
      return { path: this.path, dataLossOccurred: result.dataLossOccurred, ...await readCardiorespiratoryTraceSummaryV1(this.path) };
    } finally {
      this.#running = false; cleanupListener();
      if (handle) await this.#cdp.send("IO.close", { handle }).catch(() => {});
      if (this.#file) { await this.#file.close(); this.#file = null; }
    }
  }
}

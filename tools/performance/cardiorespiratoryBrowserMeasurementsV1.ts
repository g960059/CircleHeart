import { resolve } from "node:path";
import { WORKBENCH_MINIMUM_PLAYBACK_RATE_V3, WORKBENCH_MAXIMUM_PLAYBACK_RATE_V3, WORKBENCH_PLAYBACK_RATE_STEP_V3 } from "@/components/workbench/runtime/WorkbenchGroupTimeConductorV3";
import type { WorkbenchPerformanceSnapshotV3 } from "@/components/workbench/runtime/WorkbenchPerformanceDiagnosticsV3";

export const CARDIORESPIRATORY_SAMPLE_START_MARK = "circleheart.cardiorespiratory.sample.start";
export const CARDIORESPIRATORY_SAMPLE_END_MARK = "circleheart.cardiorespiratory.sample.end";

export function parseCardiorespiratoryBrowserArgumentsV1(argv: readonly string[]) {
  const booleanFlags = new Set(["--headed", "--maximum-rate"]);
  const valueFlags = new Set(["--origin", "--view", "--main-thread-throttle", "--playback-rate", "--scenarios", "--warmup-ms", "--sample-ms",
    "--dpr", "--viewport", "--cdp-trace", "--sweep-renderer", "--presentation-ms"]);
  const options = new Map<string, string | true>();
  for (let i = 0; i < argv.length; i++) {
    const name = argv[i]!;
    if (name === "--") continue;
    if (!booleanFlags.has(name) && !valueFlags.has(name)) throw new Error(`Unknown argument: ${name}`);
    if (options.has(name)) throw new Error(`Duplicate argument: ${name}`);
    if (booleanFlags.has(name)) options.set(name, true);
    else {
      const value = argv[++i];
      if (!value || value.startsWith("--")) throw new Error(`${name} requires a value`);
      options.set(name, value);
    }
  }
  const value = (name: string, fallback: string) => String(options.get(name) ?? fallback);
  const boundedNumber = (name: string, fallback: number, low: number, high: number, integer = false) => {
    const result = Number(value(name, String(fallback)));
    if (!Number.isFinite(result) || (integer && !Number.isSafeInteger(result)) || result < low || result > high) {
      throw new Error(`${name} must be ${integer ? "an integer" : "a number"} in ${low}..${high}`);
    }
    return result;
  };
  const oneOf = <T extends string>(name: string, fallback: T, allowed: readonly T[]): T => {
    const result = value(name, fallback);
    if (!allowed.includes(result as T)) throw new Error(`${name} must be one of ${allowed.join(", ")}`);
    return result as T;
  };
  const origin = value("--origin", "http://127.0.0.1:4216");
  const parsedOrigin = new URL(origin);
  if (!['http:', 'https:'].includes(parsedOrigin.protocol) || parsedOrigin.username || parsedOrigin.password
    || parsedOrigin.pathname !== "/" || parsedOrigin.search || parsedOrigin.hash) throw new Error("--origin must be an HTTP(S) origin");
  const viewport = /^(\d+)x(\d+)$/.exec(value("--viewport", "1440x900"));
  const width = Number(viewport?.[1]), height = Number(viewport?.[2]);
  if (!viewport || !Number.isSafeInteger(width) || !Number.isSafeInteger(height)
    || width < 320 || width > 7680 || height < 240 || height > 4320) throw new Error("--viewport requires WIDTHxHEIGHT, width 320..7680 and height 240..4320 CSS pixels");
  const useMaximumRate = options.has("--maximum-rate");
  const targetPlaybackRate = options.has("--playback-rate")
    ? boundedNumber("--playback-rate", 1, WORKBENCH_MINIMUM_PLAYBACK_RATE_V3, WORKBENCH_MAXIMUM_PLAYBACK_RATE_V3) : null;
  if (targetPlaybackRate !== null && (useMaximumRate
    || Math.abs(targetPlaybackRate / WORKBENCH_PLAYBACK_RATE_STEP_V3 - Math.round(targetPlaybackRate / WORKBENCH_PLAYBACK_RATE_STEP_V3)) > 1e-9)) {
    throw new Error(`--playback-rate requires ${WORKBENCH_PLAYBACK_RATE_STEP_V3} steps and cannot be combined with --maximum-rate`);
  }
  return { origin: parsedOrigin.origin, mode: oneOf("--view", "default", ["default", "xy"]),
    throttle: boundedNumber("--main-thread-throttle", 1, 1, 8), useMaximumRate, targetPlaybackRate,
    scenarioCount: boundedNumber("--scenarios", 1, 1, 5, true), warmupMs: boundedNumber("--warmup-ms", 4000, 1000, 120000, true),
    sampleMs: boundedNumber("--sample-ms", 5000, 1000, 600000, true), headed: options.has("--headed"),
    dpr: boundedNumber("--dpr", 1, .5, 4), viewport: { width, height },
    tracePath: options.has("--cdp-trace") ? resolve(value("--cdp-trace", "")) : null,
    sweepRenderer: options.has("--sweep-renderer") ? oneOf("--sweep-renderer", "auto", ["main", "worker", "auto"]) : null,
    presentationMs: options.has("--presentation-ms") ? oneOf("--presentation-ms", "auto", ["16", "32", "auto"]) : null };
}

/** Only render.<kind>.<mounted-pane-id>.<metric> is per-pane. Legacy canvas/svg
 * counts can combine several panes and must not be interpreted as pane FPS. */
export function groupCardiorespiratoryRenderDiagnosticsV1(snapshot: WorkbenchPerformanceSnapshotV3) {
  const panes: Record<string, { renderer: string; paneId: string; metrics: Record<string, unknown>; values: Record<string, unknown>; counters: Record<string, number> }> = {};
  const aggregate = { metrics: {} as Record<string, unknown>, values: {} as Record<string, unknown>, counters: {} as Record<string, number> };
  for (const kind of ["metrics", "values", "counters"] as const) {
    for (const [name, metric] of Object.entries(snapshot[kind])) {
      const match = /^render\.([^.]+)\.(.+)\.([^.]+)$/.exec(name);
      if (match) {
        const key = `${match[1]}.${match[2]}`;
        const pane = panes[key] ??= { renderer: match[1]!, paneId: match[2]!, metrics: {}, values: {}, counters: {} };
        (pane[kind] as Record<string, unknown>)[match[3]!] = metric;
      } else if (/^(canvas|svg|render)\./.test(name)) (aggregate[kind] as Record<string, unknown>)[name] = metric;
    }
  }
  return { panes, aggregate, paneTimingScope: "CPU preparation/draw and renderer callback intervals; neither GPU time nor physical presentation FPS" };
}

export interface BrowserTraceEventV1 {
  name?: string; ph?: string; cat?: string; ts?: number; dur?: number; pid?: number; tid?: number;
  args?: Record<string, unknown>;
}

/** Trace JSON names/availability vary by Chromium. Preserve raw event names and
 * reporter states. A compositor pipeline report is not a unique screen refresh. */
export function summarizeCardiorespiratoryTraceV1(events: readonly BrowserTraceEventV1[]) {
  const starts = events.filter(event => event.name === CARDIORESPIRATORY_SAMPLE_START_MARK && Number.isFinite(event.ts));
  const ends = events.filter(event => event.name === CARDIORESPIRATORY_SAMPLE_END_MARK && Number.isFinite(event.ts));
  if (starts.length !== 1 || ends.length !== 1 || ends[0]!.ts! <= starts[0]!.ts!) throw new Error("Trace lacks a unique ordered measurement window");
  const start = starts[0]!.ts!, end = ends[0]!.ts!;
  const eventNames: Record<string, number> = {}, completedDurations: Record<string, { count: number; overlappingDurationMs: number }> = {};
  const pipelineReporterStates: Record<string, number> = {};
  const threads = new Map<string, { pid: number; tid: number; name: string | null; observedEvents: number }>();
  const threadNames = new Map<string, string>();
  for (const event of events) if (event.ph === "M" && event.name === "thread_name" && typeof event.args?.name === "string") {
    threadNames.set(`${event.pid}:${event.tid}`, event.args.name);
  }
  for (const event of events) {
    if (!Number.isFinite(event.ts) || !event.name || event.ph === "M") continue;
    const complete = event.ph === "X" && Number.isFinite(event.dur) && event.dur! >= 0;
    const inside = event.ts! >= start && event.ts! < end;
    const duration = complete ? Math.max(0, Math.min(end, event.ts! + event.dur!) - Math.max(start, event.ts!)) : 0;
    if (!inside && duration === 0) continue;
    const key = `${event.pid}:${event.tid}`;
    const thread = threads.get(key) ?? { pid: event.pid ?? -1, tid: event.tid ?? -1, name: threadNames.get(key) ?? null, observedEvents: 0 };
    thread.observedEvents++; threads.set(key, thread);
    if (inside) eventNames[event.name] = (eventNames[event.name] ?? 0) + 1;
    if (complete && /(?:Paint|Raster|Composite|Commit|Layout|UpdateLayer|DrawFrame)/.test(event.name)) {
      const metric = completedDurations[event.name] ??= { count: 0, overlappingDurationMs: 0 };
      metric.count++; metric.overlappingDurationMs += duration / 1000;
    }
    if (inside && event.ph !== "e" && event.ph !== "E") {
      for (const field of ["chrome_frame_reporter", "chrome_frame_reporter2"]) {
        const reporter = event.args?.[field];
        if (reporter && typeof reporter === "object" && "state" in reporter) {
          const state = (reporter as { state: unknown }).state;
          if (typeof state === "number" || typeof state === "string") {
            const label = `${field}.${state}`;
            pipelineReporterStates[label] = (pipelineReporterStates[label] ?? 0) + 1;
          }
        }
      }
    }
  }
  return { windowDurationMs: (end - start) / 1000, window: "UserTiming sample.start inclusive to sample.end exclusive; interaction trace is retained outside this window",
    observedFrameEventMarkers: Object.fromEntries(Object.entries(eventNames).filter(([name]) => /Frame|PipelineReporter|Display::Draw/.test(name))),
    pipelineReporterStates: Object.keys(pipelineReporterStates).length ? pipelineReporterStates : null,
    compositorReporterScope: "Raw Chromium per-pipeline states when exported; partial/presented/dropped reports are not deduplicated screen frames or per-pane results",
    renderCompleteEvents: completedDurations,
    renderDurationScope: "Trace complete (X) events only, clipped to the sample; nested/parallel scopes overlap, sums are not exclusive CPU/GPU time",
    physicalPresentationFps: null, physicalDroppedFrameCount: null,
    presentationAvailability: "Not derived from rAF, DrawFrame, or aggregate pipeline events; physical display refresh/presentation is not established by this trace",
    observedThreads: [...threads.values()], totalTraceEvents: events.length };
}

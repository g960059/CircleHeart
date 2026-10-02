import { chromium, expect, type Page } from "@playwright/test";
import { createHash } from "node:crypto";
import { arch, cpus, platform } from "node:os";
import { selectMeasuredPlaybackRateV1 } from "./workbenchMeasuredPlaybackRateV1";
import type { WorkbenchPerformanceDiagnosticsApiV3 } from "@/components/workbench/runtime/WorkbenchPerformanceDiagnosticsV3";

import { CARDIORESPIRATORY_SAMPLE_START_MARK, CARDIORESPIRATORY_SAMPLE_END_MARK, parseCardiorespiratoryBrowserArgumentsV1, groupCardiorespiratoryRenderDiagnosticsV1 } from "./cardiorespiratoryBrowserMeasurementsV1";
import { CardiorespiratoryBrowserTraceV1, installCardiorespiratoryBrowserObserverV1, type CardiorespiratoryBrowserObservationApiV1 } from "./cardiorespiratoryBrowserObservationV1";

type DiagnosticWindow = Window & typeof globalThis & { __circleHeartWorkbenchPerfV3: WorkbenchPerformanceDiagnosticsApiV3;
  __circleHeartBrowserObservationV1: CardiorespiratoryBrowserObservationApiV1;
  exactArtifactTickets: { artifactRevisionId: string; artifactUrl: string }[] };
const options = parseCardiorespiratoryBrowserArgumentsV1(process.argv.slice(2));
const { origin, mode, throttle, useMaximumRate, targetPlaybackRate, scenarioCount, warmupMs, sampleMs } = options;
const browser = await chromium.launch({ headless: !options.headed });
let trace: CardiorespiratoryBrowserTraceV1 | null = null;
let traceFinished = false;
try {
  const page = await browser.newPage({ viewport: options.viewport, deviceScaleFactor: options.dpr });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Performance.enable");
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: throttle });
  await page.addInitScript(installCardiorespiratoryBrowserObserverV1);
  await page.addInitScript(() => {
    const target = window as DiagnosticWindow;
    target.exactArtifactTickets = [];
    const original = Worker.prototype.postMessage;
    Worker.prototype.postMessage = function(message: unknown, ...rest: unknown[]) {
      const request = message as { kind?: string; releaseTicket?: { artifactRevisionId: string; artifactUrl: string } };
      if (request.kind === "initialize" && request.releaseTicket) target.exactArtifactTickets.push({
        artifactRevisionId: request.releaseTicket.artifactRevisionId, artifactUrl: request.releaseTicket.artifactUrl });
      return Reflect.apply(original, this, [message, ...rest]);
    };
  });
  await page.route("**/rest/v1/rpc/save_experiment_v1", route => route.abort("blockedbyclient"));
  const url = new URL(`${origin}/ja/dev/model-lab?model=cardiorespiratory&workbenchPerf=1`);
  if (options.sweepRenderer !== null) url.searchParams.set("workbenchSweepRenderer", options.sweepRenderer);
  if (options.presentationMs !== null) url.searchParams.set("workbenchPresentationMs", options.presentationMs);
  await page.goto(url.href);
  await page.waitForFunction(() => Number(document.querySelector('[data-testid="v3-dockview-workbench"]')?.getAttribute("data-model-time-sec")) > .3);
  const root = page.getByTestId("v3-dockview-workbench");
  if (await root.getAttribute("data-model-id") !== "circleheart.cardiorespiratory-dev-v1") throw new Error("Wrong exact model");
  await ensureScenarioCount(page, scenarioCount);
  if (mode === "xy") await page.getByRole("region", { name: "グラフエリア" }).getByText("フローボリュームループ", { exact: true }).click();
  await page.waitForTimeout(warmupMs);
  let selectedMaximumRate: number | null = null;
  const rateSlider = page.getByTestId("v3-playback-rate-slider");
  const playbackRateSelection = targetPlaybackRate === null ? null : await selectMeasuredPlaybackRateV1(page, targetPlaybackRate).catch(async error => {
    const stopped = await page.getByTestId("workbench-calculation-stopped").allTextContents();
    throw new Error(`Playback selection failed: ${String(error)}; stopped=${JSON.stringify(stopped)}; pageErrors=${JSON.stringify(errors)}`);
  });
  await page.getByTestId("v3-playback-rate-trigger").click();
  // The slider retains at least 1x/current selection; its max is not measured capacity.
  const sliderMaximumRateBefore = Number(await rateSlider.getAttribute("max"));
  if (useMaximumRate) {
    selectedMaximumRate = sliderMaximumRateBefore;
    await rateSlider.focus(); await rateSlider.press("End");
  }
  const requestedRate = Number(await rateSlider.inputValue());
  if (targetPlaybackRate !== null && requestedRate !== targetPlaybackRate) throw new Error("Target playback rate did not remain selected");
  await page.getByTestId("v3-playback-rate-trigger").click();
  if (useMaximumRate || targetPlaybackRate !== null) await page.waitForTimeout(1000);
  if (options.tracePath !== null) {
    trace = new CardiorespiratoryBrowserTraceV1(cdp, options.tracePath);
    await trace.start();
  }
  const before = await cdp.send("Performance.getMetrics");
  const started = performance.now();
  const first = await page.evaluate(mark => {
    const target = window as DiagnosticWindow;
    target.__circleHeartWorkbenchPerfV3.reset();
    target.__circleHeartBrowserObservationV1.start();
    performance.mark(mark);
    return Number(document.querySelector('[data-testid="v3-dockview-workbench"]')?.getAttribute("data-model-time-sec"));
  }, CARDIORESPIRATORY_SAMPLE_START_MARK);
  await page.waitForTimeout(sampleMs);
  const { last, diagnostics, browserObservation } = await page.evaluate(mark => {
    performance.mark(mark);
    const target = window as DiagnosticWindow;
    return { last: Number(document.querySelector('[data-testid="v3-dockview-workbench"]')?.getAttribute("data-model-time-sec")),
      diagnostics: target.__circleHeartWorkbenchPerfV3.snapshot(), browserObservation: target.__circleHeartBrowserObservationV1.stop() };
  }, CARDIORESPIRATORY_SAMPLE_END_MARK);
  const wallMs = performance.now() - started;
  const after = await cdp.send("Performance.getMetrics");
  const a = Object.fromEntries(after.metrics.map(m => [m.name, m.value]));
  const b = Object.fromEntries(before.metrics.map(m => [m.name, m.value]));
  const mainThread = Object.fromEntries(["TaskDuration", "ScriptDuration", "LayoutDuration", "RecalcStyleDuration"].map(k =>
    [k, Number.isFinite(a[k]) && Number.isFinite(b[k]) ? a[k]! - b[k]! : null]));
  if (diagnostics.values["scheduler.group.live-lane-count"]?.minimum !== scenarioCount
    || diagnostics.values["scheduler.group.live-lane-count"]?.maximum !== scenarioCount) throw new Error("Measurement did not retain the requested live scenario count");
  const laneWorkers = Object.fromEntries(Object.entries(diagnostics.metrics).flatMap(([name, metric]) => {
    const match = /^worker\.lane\.(.+)\.presentation-advance$/.exec(name);
    return match ? [[match[1], { advance: metric, prepare: diagnostics.metrics[`worker.lane.${match[1]}.presentation-prepare`] }]] : [];
  }));
  await page.getByTestId("v3-playback-rate-trigger").click();
  const sliderMaximumRateAfter = Number(await rateSlider.getAttribute("max"));
  const requestedRateAfter = Number(await rateSlider.inputValue());
  await page.getByTestId("v3-playback-rate-trigger").click();
  const observedRequestedRate = diagnostics.values["scheduler.group.requested-playback-rate"];
  if (requestedRateAfter !== requestedRate || (observedRequestedRate
    && (observedRequestedRate.minimum !== requestedRate || observedRequestedRate.maximum !== requestedRate))) {
    throw new Error("Requested playback rate changed during the measurement window");
  }
  const xyPaths = await page.getByTestId("generic-xy-graph").filter({ visible: true }).locator('path[fill="none"]').evaluateAll(paths =>
    paths.map(p => ({ characters: p.getAttribute("d")?.length, vertices: p.getAttribute("d")?.match(/[ML]/g)?.length })));
  await page.evaluate(() => (window as DiagnosticWindow).__circleHeartBrowserObservationV1.start());
  const controlLatency = await measureControlLatency(page);
  const controlObservation = await page.evaluate(() => (window as DiagnosticWindow).__circleHeartBrowserObservationV1.stop());
  let traceMeasurement = null;
  if (trace) {
    // stop() is idempotent; even a summary failure has released CDP/file handles.
    try { traceMeasurement = await trace.stop(); } finally { traceFinished = true; }
    if (traceMeasurement.dataLossOccurred) throw new Error(`CDP trace lost data; raw partial trace retained at ${trace.path}`);
  }
  const renderSurfaces = await page.locator("canvas").evaluateAll(canvases => canvases.map(canvas => {
    const bounds = canvas.getBoundingClientRect(), style = getComputedStyle(canvas);
    const pane = canvas.closest("[data-render-pane-id]");
    return { testId: canvas.getAttribute("data-testid"), paneId: pane?.getAttribute("data-render-pane-id") ?? null,
      backend: pane?.getAttribute("data-render-backend") ?? canvas.getAttribute("data-render-backend"),
      backingWidth: (canvas as HTMLCanvasElement).width, backingHeight: (canvas as HTMLCanvasElement).height, cssWidth: bounds.width, cssHeight: bounds.height,
      visible: bounds.width > 0 && bounds.height > 0 && style.visibility !== "hidden" && style.display !== "none" };
  }));
  const tickets = await page.evaluate(() => (window as DiagnosticWindow).exactArtifactTickets);
  const ticket = tickets[0];
  if (!ticket) throw new Error("Missing exact Worker artifact ticket");
  if (new Set(tickets.map(item => item.artifactRevisionId)).size !== 1) throw new Error("Numerical Workers loaded different exact artifacts");
  const served = await page.request.get(ticket.artifactUrl);
  if (!served.ok() || createHash("sha256").update(await served.body()).digest("hex") !== ticket.artifactRevisionId) throw new Error("Served artifact differs from Worker ticket");
  if (errors.length || await page.getByTestId("workbench-calculation-stopped").count()) throw new Error(`Browser calculation failed: ${errors.join("; ")}`);
  const environment = await page.evaluate(() => ({ userAgent: navigator.userAgent, logicalCpus: navigator.hardwareConcurrency, devicePixelRatio, viewport: { width: innerWidth, height: innerHeight }, visibilityState: document.visibilityState }));
  const hostCpus = cpus();
  const benchmarkHost = { cpuModels: [...new Set(hostCpus.map(cpu => cpu.model))], logicalCpuCount: hostCpus.length, architecture: arch(), platform: platform() };
  console.log(JSON.stringify({ schemaId: "circleheart-cardiorespiratory-browser-performance-v1", artifactRevisionId: ticket.artifactRevisionId,
    view: mode, requestedMainThreadThrottle: throttle, proxy: throttle === 1 ? `native-${options.headed ? "headed" : "headless"}-chromium` : "main-thread-only-throttle-dedicated-worker-unthrottled",
    browserMode: options.headed ? "headed" : "headless", requestedDpr: options.dpr, requestedViewport: options.viewport,
    requestedSweepRenderer: options.sweepRenderer, requestedPresentationMs: options.presentationMs,
    measurementScope: "Single isolated Chromium browser; headed mode does not prove an unobscured window or a particular physical display refresh rate; DPR changes backing resolution, not display hardware",
    scenarioCount, workerArtifactTicketCount: tickets.length, warmupMs, sampleMs, selectedMaximumRate, benchmarkHost, environment, first, last, wallMs, simulatedTimePerWallTime: (last - first) * 1000 / wallMs,
    diagnosticStatistics: { cumulativeWindow: "since reset immediately before measurement", recentObservationLimit: 240,
      durationMetrics: { countMeanMaximum: "entire measurement window", p95: "most recent up to 240 observations per metric", latest: "latest observation" },
      valueMetrics: { countMeanMinimumMaximum: "entire measurement window", p05P95RecentMean: "most recent up to 240 observations per metric", latest: "latest observation" } },
    requestedRate, requestedRateAfter, sliderMaximumRateBefore, sliderMaximumRateAfter,
    playbackRateSelection: playbackRateSelection ?? { mode: useMaximumRate ? "maximum-once" : "default", targetRate: null, readinessWaitMs: 0 },
    measuredSafePlaybackRate: diagnostics.values["scheduler.group.safe-playback-rate"],
    mainThread, mainThreadBusyFraction: mainThread.TaskDuration === null ? null : mainThread.TaskDuration! * 1000 / wallMs,
    mainThreadScope: "CDP Performance cumulative duration deltas in seconds; includes protocol boundary overhead; unsupported metrics are null",
    laneWorkers, groupRoundTrip: diagnostics.metrics["scheduler.group.worker-round-trip"],
    drawing: Object.fromEntries(Object.entries(diagnostics.metrics).filter(([name]) => name.startsWith("canvas.") || name.startsWith("svg."))),
    rendering: groupCardiorespiratoryRenderDiagnosticsV1(diagnostics), renderSurfaces, browserObservation,
    react: { metrics: Object.fromEntries(Object.entries(diagnostics.metrics).filter(([name]) => name.startsWith("react."))),
      scope: "Existing React Profiler actualDuration/commit interval diagnostics when enabled by the app; absent in ordinary production React builds, not interpreted as zero cost" },
    controlLatencyMs: controlLatency.acceptedDomMs, controlLatencyMeasurement: "native-keyup-to-accepted-checkpoint-dom-mutation",
    controlLatency, controlObservation,
    trace: traceMeasurement === null ? { enabled: false } : { enabled: true, categories: CardiorespiratoryBrowserTraceV1.categories,
      ...traceMeasurement, overhead: "Tracing changes workload and scheduling; compare like-for-like traced runs and use untraced runs for throughput qualification" },
    xyPaths, diagnostics }, null, 2));
} finally {
  try {
    if (trace?.started && !traceFinished) await trace.stop().catch(error => console.error(`Trace cleanup: ${String(error)}; partial path=${trace!.path}`));
  } finally { await browser.close(); }
}

/** Use the same duplication path as the Workbench browser-performance suite. */
async function ensureScenarioCount(page: Page, target: number): Promise<void> {
  const host = page.getByRole("region", { name: "Scenarios" });
  const menus = host.getByRole("button", { name: /Scenarioメニュー:/ });
  await expect(menus).toHaveCount(1);
  while (await menus.count() < target) {
    const before = await menus.count();
    await host.getByRole("button", { name: "Scenarioメニュー: baseline", exact: true }).click();
    await page.getByRole("menu", { name: "Scenarioメニュー: baseline", exact: true }).getByRole("menuitem", { name: "複製" }).click();
    await expect(menus).toHaveCount(before + 1);
  }
}

/** Start at the native commit event; polling is only a completion wait. */
async function measureControlLatency(page: Page) {
  const slider = page.getByRole("slider", { name: "HR", exact: true }).first();
  await slider.scrollIntoViewIfNeeded();
  const initialEpoch = Number(await page.getByTestId("v3-dockview-workbench").getAttribute("data-input-epoch"));
  const measureName = "circleheart.cardiorespiratory.control-to-accepted-dom";
  await slider.evaluate((element, { initialEpoch, measureName }) => {
    const root = document.querySelector('[data-testid="v3-dockview-workbench"]');
    if (!root) throw new Error("Workbench root is unavailable");
    const startMark = `${measureName}.start`, endMark = `${measureName}.end`;
    performance.clearMarks(startMark); performance.clearMarks(endMark); performance.clearMeasures(measureName);
    performance.clearMeasures(`${measureName}.next-raf`); performance.clearMeasures(`${measureName}.second-raf`);
    let started = false;
    const onKeyUp = (event: Event) => {
      if ((event as KeyboardEvent).key !== "ArrowRight" || started) return;
      started = true; performance.mark(startMark);
    };
    const observer = new MutationObserver(() => {
      if (!started || Number(root.getAttribute("data-input-epoch")) <= initialEpoch
        || Number(root.getAttribute("data-accepted-revision")) <= 0 || Number(root.getAttribute("data-model-time-sec")) <= 0) return;
      performance.mark(endMark); performance.measure(measureName, startMark, endMark); cleanup();
      requestAnimationFrame(() => {
        performance.measure(`${measureName}.next-raf`, { start: startMark, end: performance.now() });
        requestAnimationFrame(() => performance.measure(`${measureName}.second-raf`, { start: startMark, end: performance.now() }));
      });
    });
    const cleanup = () => { observer.disconnect(); element.removeEventListener("keyup", onKeyUp, true); window.clearTimeout(timeout); };
    const timeout = window.setTimeout(cleanup, 10000);
    element.addEventListener("keyup", onKeyUp, true);
    observer.observe(root, { attributes: true, attributeFilter: ["data-input-epoch", "data-accepted-revision", "data-model-time-sec"] });
  }, { initialEpoch, measureName });
  await slider.press("ArrowRight");
  await page.waitForFunction(name => performance.getEntriesByName(name, "measure").length === 1, measureName, { timeout: 10000 });
  await page.waitForFunction(name => performance.getEntriesByName(`${name}.second-raf`, "measure").length === 1, measureName, { timeout: 10000 });
  return page.evaluate(name => ({ acceptedDomMs: performance.getEntriesByName(name, "measure")[0]!.duration,
    nextRafMs: performance.getEntriesByName(`${name}.next-raf`, "measure")[0]!.duration,
    secondRafMs: performance.getEntriesByName(`${name}.second-raf`, "measure")[0]!.duration,
    scope: "One native HR ArrowRight keyup to accepted checkpoint DOM mutation, then the next two rAF callbacks; callback times are rendering opportunities, not confirmed pixels or physical presentation" }), measureName);
}

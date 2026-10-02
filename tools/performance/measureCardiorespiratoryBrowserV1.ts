import { chromium, expect, type Page } from "@playwright/test";
import { createHash } from "node:crypto";
import { arch, cpus, platform } from "node:os";
import { WORKBENCH_MINIMUM_PLAYBACK_RATE_V3, WORKBENCH_MAXIMUM_PLAYBACK_RATE_V3, WORKBENCH_PLAYBACK_RATE_STEP_V3 } from "@/components/workbench/runtime/WorkbenchGroupTimeConductorV3";
import type { WorkbenchPerformanceDiagnosticsApiV3 } from "@/components/workbench/runtime/WorkbenchPerformanceDiagnosticsV3";

type DiagnosticWindow = Window & typeof globalThis & { __circleHeartWorkbenchPerfV3: WorkbenchPerformanceDiagnosticsApiV3;
  exactArtifactTickets: { artifactRevisionId: string; artifactUrl: string }[] };
const argument = (name: string) => { const i = process.argv.indexOf(name); return i < 0 ? undefined : process.argv[i + 1]; };
function boundedIntegerArgument(name: string, fallback: number, minimum: number, maximum: number): number {
  const value = Number(process.argv.includes(name) ? argument(name) : fallback);
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) throw new Error(`${name} must be an integer in ${minimum}..${maximum}`);
  return value;
}
const origin = argument("--origin") ?? "http://127.0.0.1:4216";
const mode = argument("--view") ?? "default";
const throttle = Number(argument("--main-thread-throttle") ?? 1);
const useMaximumRate = process.argv.includes("--maximum-rate");
const targetPlaybackRate = process.argv.includes("--playback-rate") ? Number(argument("--playback-rate")) : null;
if (targetPlaybackRate !== null && (useMaximumRate || !Number.isFinite(targetPlaybackRate)
  || targetPlaybackRate < WORKBENCH_MINIMUM_PLAYBACK_RATE_V3 || targetPlaybackRate > WORKBENCH_MAXIMUM_PLAYBACK_RATE_V3
  || Math.abs(targetPlaybackRate / WORKBENCH_PLAYBACK_RATE_STEP_V3 - Math.round(targetPlaybackRate / WORKBENCH_PLAYBACK_RATE_STEP_V3)) > 1e-9)) {
  throw new Error(`--playback-rate requires ${WORKBENCH_MINIMUM_PLAYBACK_RATE_V3}..${WORKBENCH_MAXIMUM_PLAYBACK_RATE_V3} in ${WORKBENCH_PLAYBACK_RATE_STEP_V3} steps and cannot be combined with --maximum-rate`);
}
const scenarioCount = boundedIntegerArgument("--scenarios", 1, 1, 5);
const warmupMs = boundedIntegerArgument("--warmup-ms", 4000, 1000, 120000);
const sampleMs = boundedIntegerArgument("--sample-ms", 5000, 1000, 600000);
if (!["default", "xy"].includes(mode) || !Number.isFinite(throttle) || throttle < 1 || throttle > 8) throw new Error("Invalid view or throttle");
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Performance.enable");
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: throttle });
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
  await page.goto(`${origin}/ja/dev/model-lab?model=cardiorespiratory&workbenchPerf=1`);
  await page.waitForFunction(() => Number(document.querySelector('[data-testid="v3-dockview-workbench"]')?.getAttribute("data-model-time-sec")) > .3);
  const root = page.getByTestId("v3-dockview-workbench");
  if (await root.getAttribute("data-model-id") !== "circleheart.cardiorespiratory-dev-v1") throw new Error("Wrong exact model");
  await ensureScenarioCount(page, scenarioCount);
  if (mode === "xy") await page.getByRole("region", { name: "グラフエリア" }).getByText("フローボリュームループ", { exact: true }).click();
  await page.waitForTimeout(warmupMs);
  let selectedMaximumRate: number | null = null;
  const rateSlider = page.getByTestId("v3-playback-rate-slider");
  const playbackRateSelection = targetPlaybackRate === null ? null : await selectMeasuredPlaybackRate(page, targetPlaybackRate).catch(async error => {
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
  await page.evaluate(() => (window as DiagnosticWindow).__circleHeartWorkbenchPerfV3.reset());
  const before = await cdp.send("Performance.getMetrics");
  const first = Number(await root.getAttribute("data-model-time-sec")), started = performance.now();
  await page.waitForTimeout(sampleMs);
  const after = await cdp.send("Performance.getMetrics");
  const last = Number(await root.getAttribute("data-model-time-sec")), wallMs = performance.now() - started;
  const diagnostics = await page.evaluate(() => (window as DiagnosticWindow).__circleHeartWorkbenchPerfV3.snapshot());
  const a = Object.fromEntries(after.metrics.map(m => [m.name, m.value]));
  const b = Object.fromEntries(before.metrics.map(m => [m.name, m.value]));
  const mainThread = Object.fromEntries(["TaskDuration", "ScriptDuration", "LayoutDuration", "RecalcStyleDuration"].map(k => [k, a[k] - b[k]]));
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
  const controlLatencyMs = await measureControlLatency(page);
  const tickets = await page.evaluate(() => (window as DiagnosticWindow).exactArtifactTickets);
  const ticket = tickets[0];
  if (!ticket) throw new Error("Missing exact Worker artifact ticket");
  if (new Set(tickets.map(item => item.artifactRevisionId)).size !== 1) throw new Error("Numerical Workers loaded different exact artifacts");
  const served = await page.request.get(ticket.artifactUrl);
  if (!served.ok() || createHash("sha256").update(await served.body()).digest("hex") !== ticket.artifactRevisionId) throw new Error("Served artifact differs from Worker ticket");
  if (errors.length || await page.getByTestId("workbench-calculation-stopped").count()) throw new Error(`Browser calculation failed: ${errors.join("; ")}`);
  const environment = await page.evaluate(() => ({ userAgent: navigator.userAgent, logicalCpus: navigator.hardwareConcurrency, devicePixelRatio }));
  const hostCpus = cpus();
  const benchmarkHost = { cpuModels: [...new Set(hostCpus.map(cpu => cpu.model))], logicalCpuCount: hostCpus.length, architecture: arch(), platform: platform() };
  console.log(JSON.stringify({ schemaId: "circleheart-cardiorespiratory-browser-performance-v1", artifactRevisionId: ticket.artifactRevisionId,
    view: mode, requestedMainThreadThrottle: throttle, proxy: throttle === 1 ? "native-headless-chromium" : "main-thread-only-throttle-dedicated-worker-unthrottled",
    scenarioCount, workerArtifactTicketCount: tickets.length, warmupMs, sampleMs, selectedMaximumRate, benchmarkHost, environment, first, last, wallMs, simulatedTimePerWallTime: (last - first) * 1000 / wallMs,
    diagnosticStatistics: { cumulativeWindow: "since reset immediately before measurement", recentObservationLimit: 240,
      durationMetrics: { countMeanMaximum: "entire measurement window", p95: "most recent up to 240 observations per metric", latest: "latest observation" },
      valueMetrics: { countMeanMinimumMaximum: "entire measurement window", p05P95RecentMean: "most recent up to 240 observations per metric", latest: "latest observation" } },
    requestedRate, requestedRateAfter, sliderMaximumRateBefore, sliderMaximumRateAfter,
    playbackRateSelection: playbackRateSelection ?? { mode: useMaximumRate ? "maximum-once" : "default", targetRate: null, readinessWaitMs: 0 },
    measuredSafePlaybackRate: diagnostics.values["scheduler.group.safe-playback-rate"],
    mainThread, mainThreadBusyFraction: mainThread.TaskDuration * 1000 / wallMs,
    laneWorkers, groupRoundTrip: diagnostics.metrics["scheduler.group.worker-round-trip"],
    drawing: Object.fromEntries(Object.entries(diagnostics.metrics).filter(([name]) => name.startsWith("canvas.") || name.startsWith("svg."))),
    controlLatencyMs, controlLatencyMeasurement: "native-keyup-to-accepted-checkpoint-dom-mutation",
    xyPaths, diagnostics }, null, 2));
} finally { await browser.close(); }

/** Follow the real control and measured capacity; a requested target is never
 * injected into the conductor or substituted for the actual selected value. */
async function selectMeasuredPlaybackRate(page: Page, targetRate: number) {
  const maximumReadinessWaitMs = 60_000, startedAt = performance.now();
  const trigger = page.getByTestId("v3-playback-rate-trigger"), slider = page.getByTestId("v3-playback-rate-slider");
  const observations: { elapsedMs: number; sliderMaximumRate: number; measuredSafeRate: number | null; selectedRate: number }[] = [];
  let attempts = 0;
  while (performance.now() - startedAt < maximumReadinessWaitMs) {
    const timeout = Math.max(1, Math.min(5000, maximumReadinessWaitMs - (performance.now() - startedAt)));
    await trigger.click({ timeout });
    const sliderMaximumRate = Number(await slider.getAttribute("max"));
    const measuredSafeRate = await page.evaluate(() =>
      (window as DiagnosticWindow).__circleHeartWorkbenchPerfV3.snapshot().values["scheduler.group.safe-playback-rate"]?.latest ?? null);
    // During calibration the UI temporarily offers the global maximum. Wait
    // for actual measured capacity before accelerating above ordinary 1x.
    const availableRate = Math.min(sliderMaximumRate, Math.max(1, measuredSafeRate ?? 1));
    const nextRate = Math.min(targetRate, availableRate);
    const previousRate = Number(await slider.inputValue());
    const steps = Math.round((nextRate - previousRate) / WORKBENCH_PLAYBACK_RATE_STEP_V3);
    await slider.focus({ timeout });
    for (let step = 0; step < Math.abs(steps); step++) await slider.press(steps > 0 ? "ArrowRight" : "ArrowLeft", { timeout });
    const selectedRate = Number(await slider.inputValue());
    if (selectedRate !== nextRate) throw new Error(`Playback UI selected ${selectedRate}x instead of available ${nextRate}x`);
    await trigger.click({ timeout });
    observations.push({ elapsedMs: performance.now() - startedAt, sliderMaximumRate, measuredSafeRate, selectedRate });
    attempts++;
    if (selectedRate === targetRate) return { mode: "target-with-measured-ui-ramp" as const, targetRate,
      maximumReadinessWaitMs, readinessWaitMs: performance.now() - startedAt, attempts, observations };
    if (await page.getByTestId("workbench-calculation-stopped").count()) throw new Error("Calculation stopped while waiting for target playback capacity");
    const remaining = maximumReadinessWaitMs - (performance.now() - startedAt);
    if (remaining > 0) await page.waitForTimeout(Math.min(1000, remaining));
  }
  throw new Error(`Playback target ${targetRate}x was not available within ${maximumReadinessWaitMs} ms; ${JSON.stringify(observations.at(-1))}`);
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
async function measureControlLatency(page: Page): Promise<number> {
  const slider = page.getByRole("slider", { name: "HR", exact: true }).first();
  await slider.scrollIntoViewIfNeeded();
  const initialEpoch = Number(await page.getByTestId("v3-dockview-workbench").getAttribute("data-input-epoch"));
  const measureName = "circleheart.cardiorespiratory.control-to-accepted-dom";
  await slider.evaluate((element, { initialEpoch, measureName }) => {
    const root = document.querySelector('[data-testid="v3-dockview-workbench"]');
    if (!root) throw new Error("Workbench root is unavailable");
    const startMark = `${measureName}.start`, endMark = `${measureName}.end`;
    performance.clearMarks(startMark); performance.clearMarks(endMark); performance.clearMeasures(measureName);
    let started = false;
    const onKeyUp = (event: Event) => {
      if ((event as KeyboardEvent).key !== "ArrowRight" || started) return;
      started = true; performance.mark(startMark);
    };
    const observer = new MutationObserver(() => {
      if (!started || Number(root.getAttribute("data-input-epoch")) <= initialEpoch
        || Number(root.getAttribute("data-accepted-revision")) <= 0 || Number(root.getAttribute("data-model-time-sec")) <= 0) return;
      performance.mark(endMark); performance.measure(measureName, startMark, endMark); cleanup();
    });
    const cleanup = () => { observer.disconnect(); element.removeEventListener("keyup", onKeyUp, true); window.clearTimeout(timeout); };
    const timeout = window.setTimeout(cleanup, 10000);
    element.addEventListener("keyup", onKeyUp, true);
    observer.observe(root, { attributes: true, attributeFilter: ["data-input-epoch", "data-accepted-revision", "data-model-time-sec"] });
  }, { initialEpoch, measureName });
  await slider.press("ArrowRight");
  await page.waitForFunction(name => performance.getEntriesByName(name, "measure").length === 1, measureName, { timeout: 10000 });
  return page.evaluate(name => performance.getEntriesByName(name, "measure")[0]!.duration, measureName);
}

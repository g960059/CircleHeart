import { chromium } from "@playwright/test";
import { createHash } from "node:crypto";
import type { WorkbenchPerformanceDiagnosticsApiV3 } from "@/components/workbench/runtime/WorkbenchPerformanceDiagnosticsV3";

type DiagnosticWindow = Window & typeof globalThis & { __circleHeartWorkbenchPerfV3: WorkbenchPerformanceDiagnosticsApiV3;
  exactArtifactTickets: { artifactRevisionId: string; artifactUrl: string }[] };
const argument = (name: string) => { const i = process.argv.indexOf(name); return i < 0 ? undefined : process.argv[i + 1]; };
const origin = argument("--origin") ?? "http://127.0.0.1:4216";
const mode = argument("--view") ?? "default";
const throttle = Number(argument("--main-thread-throttle") ?? 1);
const useMaximumRate = process.argv.includes("--maximum-rate");
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
  if (mode === "xy") await page.getByRole("region", { name: "グラフエリア" }).getByText("フローボリュームループ", { exact: true }).click();
  await page.waitForTimeout(4000);
  let selectedMaximumRate: number | null = null;
  if (useMaximumRate) {
    await page.getByTestId("v3-playback-rate-trigger").click();
    const slider = page.getByTestId("v3-playback-rate-slider");
    selectedMaximumRate = Number(await slider.getAttribute("max"));
    await slider.focus(); await slider.press("End");
    await page.getByTestId("v3-playback-rate-trigger").click();
    await page.waitForTimeout(1000);
  }
  await page.evaluate(() => (window as DiagnosticWindow).__circleHeartWorkbenchPerfV3.reset());
  const before = await cdp.send("Performance.getMetrics");
  const first = Number(await root.getAttribute("data-model-time-sec")), started = performance.now();
  await page.waitForTimeout(5000);
  const after = await cdp.send("Performance.getMetrics");
  const last = Number(await root.getAttribute("data-model-time-sec")), wallMs = performance.now() - started;
  const diagnostics = await page.evaluate(() => (window as DiagnosticWindow).__circleHeartWorkbenchPerfV3.snapshot());
  const a = Object.fromEntries(after.metrics.map(m => [m.name, m.value]));
  const b = Object.fromEntries(before.metrics.map(m => [m.name, m.value]));
  const mainThread = Object.fromEntries(["TaskDuration", "ScriptDuration", "LayoutDuration", "RecalcStyleDuration"].map(k => [k, a[k] - b[k]]));
  const xyPaths = await page.getByTestId("generic-xy-graph").filter({ visible: true }).locator('path[fill="none"]').evaluateAll(paths =>
    paths.map(p => ({ characters: p.getAttribute("d")?.length, vertices: p.getAttribute("d")?.match(/[ML]/g)?.length })));
  const ticket = await page.evaluate(() => (window as DiagnosticWindow).exactArtifactTickets[0]);
  if (!ticket) throw new Error("Missing exact Worker artifact ticket");
  const served = await page.request.get(ticket.artifactUrl);
  if (!served.ok() || createHash("sha256").update(await served.body()).digest("hex") !== ticket.artifactRevisionId) throw new Error("Served artifact differs from Worker ticket");
  if (errors.length || await page.getByTestId("workbench-calculation-stopped").count()) throw new Error(`Browser calculation failed: ${errors.join("; ")}`);
  const environment = await page.evaluate(() => ({ userAgent: navigator.userAgent, logicalCpus: navigator.hardwareConcurrency, devicePixelRatio }));
  console.log(JSON.stringify({ schemaId: "circleheart-cardiorespiratory-browser-performance-v1", artifactRevisionId: ticket.artifactRevisionId,
    view: mode, requestedMainThreadThrottle: throttle, proxy: throttle === 1 ? "native-headless-chromium" : "main-thread-only-throttle-dedicated-worker-unthrottled",
    selectedMaximumRate, environment, first, last, wallMs, simulatedTimePerWallTime: (last - first) * 1000 / wallMs,
    mainThread, xyPaths, diagnostics }, null, 2));
} finally { await browser.close(); }

import { chromium, type Browser } from "@playwright/test";
import { createHash } from "node:crypto";
import { open } from "node:fs/promises";
import { cpus } from "node:os";
import type { WorkbenchPerformanceDiagnosticsApiV3 } from "@/components/workbench/runtime/WorkbenchPerformanceDiagnosticsV3";
import { selectMeasuredPlaybackRateV1 } from "./workbenchMeasuredPlaybackRateV1";
import { CardiorespiratoryWorkerCdpRpcV1, parseCardiorespiratoryWorkerProfileArgumentsV1,
  summarizeCardiorespiratoryWorkerCpuProfileV1, type CardiorespiratoryCpuProfileV1 } from "./cardiorespiratoryWorkerProfileV1";

type WorkerTicket = { workerUrl: string; workerName: string | null; scenarioId: string | null;
  artifactRevisionId: string; artifactUrl: string; modelId: string };
type ProfileWindow = Window & typeof globalThis & { __circleHeartNumericalProfileTicketsV1: WorkerTicket[];
  __circleHeartWorkbenchPerfV3: WorkbenchPerformanceDiagnosticsApiV3 };
type AttachedTarget = { sessionId: string; targetInfo: { targetId: string; type: string; title: string; url: string } };
const options = parseCardiorespiratoryWorkerProfileArgumentsV1(process.argv.slice(2));
const outputFile = await open(options.output, "wx");
let browser: Browser | null = null, rpc: CardiorespiratoryWorkerCdpRpcV1 | null = null;
const rpcSessions: CardiorespiratoryWorkerCdpRpcV1[] = [];
const installedProbes = new Set<CardiorespiratoryWorkerCdpRpcV1>();
const probeKey = "__circleHeartNumericalCpuIdentityProbeV1";
const removeProbeExpression = `(() => {
  const probe = globalThis[${JSON.stringify(probeKey)}];
  if (!probe) return null;
  removeEventListener('message', probe.listener); delete globalThis[${JSON.stringify(probeKey)}];
  return { count: probe.count, last: probe.last, href: location.href, name: globalThis.name };
})()`;
let profiling = false, written = false;
const saveProfile = async (profile: CardiorespiratoryCpuProfileV1) => {
  await outputFile.writeFile(JSON.stringify(profile)); written = true;
};
try {
  browser = await chromium.launch({ headless: !options.headed });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  const cdp = await page.context().newCDPSession(page);
  const attached = new Map<string, AttachedTarget>();
  cdp.on("Target.attachedToTarget", (event: AttachedTarget) => attached.set(event.sessionId, event));
  cdp.on("Target.detachedFromTarget", event => attached.delete(event.sessionId));
  await cdp.send("Target.setAutoAttach", { autoAttach: true, waitForDebuggerOnStart: false, flatten: false,
    filter: [{ type: "worker", exclude: false }, { exclude: true }] });
  await page.addInitScript(() => {
    const target = window as ProfileWindow;
    target.__circleHeartNumericalProfileTicketsV1 = [];
    const NativeWorker = window.Worker;
    const metadata = new WeakMap<Worker, { workerUrl: string; workerName: string | null }>();
    window.Worker = new Proxy(NativeWorker, {
      construct(constructor, args, newTarget) {
        const worker = Reflect.construct(constructor, args, newTarget) as Worker;
        metadata.set(worker, { workerUrl: new URL(String(args[0]), location.href).href,
          workerName: (args[1] as WorkerOptions | undefined)?.name ?? null });
        return worker;
      },
    });
    const original = NativeWorker.prototype.postMessage;
    NativeWorker.prototype.postMessage = function(message: unknown, ...rest: unknown[]) {
      const request = message as { kind?: string; scenarioId?: string;
        releaseTicket?: { artifactRevisionId: string; artifactUrl: string; modelId: string } };
      const source = metadata.get(this);
      if (request?.kind === "initialize" && request.releaseTicket && source) {
        target.__circleHeartNumericalProfileTicketsV1.push({ ...source, artifactRevisionId: request.releaseTicket.artifactRevisionId,
          artifactUrl: request.releaseTicket.artifactUrl, modelId: request.releaseTicket.modelId, scenarioId: request.scenarioId ?? null });
      }
      return Reflect.apply(original, this, [message, ...rest]);
    };
  });
  await page.route("**/rest/v1/rpc/save_experiment_v1", route => route.abort("blockedbyclient"));
  await page.goto(`${options.origin}/ja/dev/model-lab?model=cardiorespiratory&workbenchPerf=1`);
  const root = page.getByTestId("v3-dockview-workbench");
  await page.waitForFunction(() => Number(document.querySelector('[data-testid="v3-dockview-workbench"]')?.getAttribute("data-model-time-sec")) > .3);
  if (await root.getAttribute("data-model-id") !== "circleheart.cardiorespiratory-dev-v1") throw new Error("Wrong exact model");
  await page.waitForTimeout(4000);
  const playbackRateSelection = await selectMeasuredPlaybackRateV1(page, options.playbackRate);
  await page.waitForTimeout(1000);
  const tickets = await page.evaluate(() => (window as ProfileWindow).__circleHeartNumericalProfileTicketsV1);
  const numerical = tickets.filter(ticket => ticket.modelId === "circleheart.cardiorespiratory-dev-v1"
    && ticket.workerName === "circleheart-studio-v2-simulation");
  if (!numerical.length || new Set(numerical.map(ticket => ticket.workerUrl)).size !== 1
    || new Set(numerical.map(ticket => ticket.artifactRevisionId)).size !== 1) throw new Error("Expected one numerical Worker URL and exact artifact");
  const ticket = numerical[0]!;
  // Match the actual constructor URL that sent initialize, not every dedicated
  // Worker: the SweepRenderWorker shares this page but has a different role.
  const targets = [...attached.values()].filter(target => target.targetInfo.type === "worker" && target.targetInfo.url === ticket.workerUrl);
  if (!targets.length) throw new Error("No attached target matches the numerical Worker initialize URL");
  // Live and background analysis Workers share their URL/name. Observe actual
  // incoming request kinds briefly; remove every passive listener before the
  // profiling window. This does not call the model or add Worker messages.
  for (const target of targets) {
    const session = new CardiorespiratoryWorkerCdpRpcV1(cdp, target.sessionId); rpcSessions.push(session);
    const result = await session.send<{ exceptionDetails?: unknown }>("Runtime.evaluate", { expression: `(() => {
      const key = ${JSON.stringify(probeKey)};
      if (globalThis[key]) throw new Error('Worker identity probe already installed');
      const probe = { count: 0, last: null, listener: null };
      probe.listener = event => { const request = event.data;
        if (request?.kind === 'advance-presentation') { probe.count++; probe.last = {
          runtimeSessionId: request.runtimeSessionId, scenarioId: request.scenarioId, stepCount: request.stepCount };
        }
      };
      globalThis[key] = probe; addEventListener('message', probe.listener);
    })()`, returnByValue: true });
    if (result.exceptionDetails) throw new Error("Could not observe numerical Worker request identity");
    installedProbes.add(session);
  }
  await page.waitForTimeout(350);
  type Probe = { count: number; last: { runtimeSessionId: string; scenarioId: string; stepCount: number } | null; href: string; name: string };
  const observations: { worker: AttachedTarget; session: CardiorespiratoryWorkerCdpRpcV1; probe: Probe }[] = [];
  for (let i = 0; i < targets.length; i++) {
    const session = rpcSessions[i]!;
    const result = await session.send<{ result: { value?: Probe }; exceptionDetails?: unknown }>("Runtime.evaluate", {
      expression: removeProbeExpression, returnByValue: true });
    installedProbes.delete(session);
    if (result.exceptionDetails || !result.result.value) throw new Error("Could not read numerical Worker request identity");
    observations.push({ worker: targets[i]!, session, probe: result.result.value });
  }
  const active = observations.filter(item => item.probe.count > 0);
  if (active.length !== 1) throw new Error(`Expected one active presentation Worker: ${JSON.stringify(observations.map(item => ({ targetId: item.worker.targetInfo.targetId, ...item.probe })))}`);
  const { worker, session, probe } = active[0]!; rpc = session;
  if (probe.href !== ticket.workerUrl || probe.name !== ticket.workerName || !probe.last) throw new Error("Active Worker identity differs from numerical initialize sender");
  const served = await page.request.get(ticket.artifactUrl);
  if (!served.ok() || createHash("sha256").update(await served.body()).digest("hex") !== ticket.artifactRevisionId) {
    throw new Error("Served artifact differs from numerical Worker ticket");
  }
  await rpc.send("Profiler.enable");
  await rpc.send("Profiler.setSamplingInterval", { interval: 1000 });
  await page.evaluate(() => (window as ProfileWindow).__circleHeartWorkbenchPerfV3.reset());
  const firstModelTimeSec = Number(await root.getAttribute("data-model-time-sec"));
  const firstRevision = Number(await root.getAttribute("data-accepted-revision"));
  await rpc.send("Profiler.start"); profiling = true;
  const startedAt = performance.now();
  await page.waitForTimeout(options.sampleMs);
  const { profile } = await rpc.send<{ profile: CardiorespiratoryCpuProfileV1 }>("Profiler.stop"); profiling = false;
  const wallMs = performance.now() - startedAt;
  await saveProfile(profile);
  const lastModelTimeSec = Number(await root.getAttribute("data-model-time-sec"));
  const lastRevision = Number(await root.getAttribute("data-accepted-revision"));
  const observedRequestedPlaybackRate = await page.evaluate(() =>
    (window as ProfileWindow).__circleHeartWorkbenchPerfV3.snapshot().values["scheduler.group.requested-playback-rate"] ?? null);
  if (!observedRequestedPlaybackRate || observedRequestedPlaybackRate.minimum !== options.playbackRate
    || observedRequestedPlaybackRate.maximum !== options.playbackRate) throw new Error("Requested playback rate changed or was unavailable during profiling");
  if (errors.length || await page.getByTestId("workbench-calculation-stopped").count()) throw new Error(`Browser calculation failed: ${errors.join("; ")}`);
  if (!(lastModelTimeSec > firstModelTimeSec) || !(lastRevision > firstRevision)) throw new Error("Numerical Worker did not advance during profiling");
  const summaries = summarizeCardiorespiratoryWorkerCpuProfileV1(profile);
  console.log(JSON.stringify({ schemaId: "circleheart-cardiorespiratory-worker-cpu-profile-v1", rawProfilePath: options.output,
    artifactRevisionId: ticket.artifactRevisionId, artifactUrl: ticket.artifactUrl,
    worker: { targetId: worker.targetInfo.targetId, targetType: worker.targetInfo.type, url: worker.targetInfo.url,
      title: worker.targetInfo.title, name: probe.name, scenarioId: probe.last.scenarioId, runtimeSessionId: probe.last.runtimeSessionId,
      observedPresentationRequestsBeforeProfile: probe.count, lastRequestedStepCountBeforeProfile: probe.last.stepCount,
      initializeCount: numerical.length, attachedWorkerCount: attached.size, matchingNumericalTargetCount: targets.length,
      identification: "Constructor URL/name + exact artifact initialize ticket + passive advance-presentation requests; identity observer removed before profiling" },
    origin: options.origin, browserMode: options.headed ? "headed" : "headless", browserVersion: browser.version(),
    host: { node: process.version, architecture: process.arch, cpu: cpus()[0]?.model },
    requestedSampleMs: options.sampleMs, samplingIntervalUs: 1000, warmupMs: 4000, wallMs,
    requestedPlaybackRate: options.playbackRate, playbackRateSelection, observedRequestedPlaybackRate, playbackSettlementMs: 1000,
    firstModelTimeSec, lastModelTimeSec, firstRevision, lastRevision,
    clockScope: "Published Workbench DOM accepted clock observed around profiler RPCs; confirms active calculation, not an unprofiled throughput benchmark",
    ...summaries }, null, 2));
} finally {
  try {
    if (profiling && rpc) {
      try {
        const { profile } = await rpc.send<{ profile: CardiorespiratoryCpuProfileV1 }>("Profiler.stop");
        if (!written) await saveProfile(profile);
      } catch (error) { console.error(`Worker profile cleanup failed: ${String(error)}`); }
    }
    for (const session of installedProbes) await session.send("Runtime.evaluate", { expression: removeProbeExpression }).catch(() => {});
    for (const session of rpcSessions) session.dispose();
  } finally {
    try { await browser?.close(); } finally { await outputFile.close(); }
  }
}

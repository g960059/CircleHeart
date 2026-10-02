import type { CDPSession } from "@playwright/test";
import { resolve } from "node:path";
import { validateMeasuredPlaybackRateV1 } from "./workbenchMeasuredPlaybackRateV1";

export function parseCardiorespiratoryWorkerProfileArgumentsV1(args: readonly string[]) {
  let origin = "http://127.0.0.1:4220", output: string | null = null, sampleMs = 5000, headed = false, playbackRate = 1;
  const seen = new Set<string>();
  for (let i = 0; i < args.length; i++) {
    const key = args[i]!;
    if (key === "--") continue;
    if (seen.has(key)) throw new Error(`Duplicate argument ${key}`);
    seen.add(key);
    if (key === "--headed") { headed = true; continue; }
    if (!["--origin", "--output", "--sample-ms", "--playback-rate"].includes(key)) throw new Error(`Unknown argument ${key}`);
    const value = args[++i];
    if (!value || value.startsWith("--")) throw new Error(`${key} requires a value`);
    if (key === "--origin") origin = value;
    else if (key === "--output") output = resolve(value);
    else if (key === "--playback-rate") playbackRate = validateMeasuredPlaybackRateV1(Number(value));
    else sampleMs = Number(value);
  }
  const url = new URL(origin);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("--origin must be an HTTP(S) origin");
  }
  if (!output) throw new Error("--output is required (an exclusively created .cpuprofile file)");
  if (!Number.isSafeInteger(sampleMs) || sampleMs < 5000 || sampleMs > 30000) throw new Error("--sample-ms must be an integer in 5000..30000");
  return { origin: url.origin, output, sampleMs, headed, playbackRate };
}

export interface CardiorespiratoryCpuProfileV1 {
  nodes: { id: number; callFrame: { functionName: string; url: string; lineNumber: number; columnNumber: number }; children?: number[] }[];
  startTime: number; endTime: number; samples?: number[]; timeDeltas?: number[];
}

/** V8 timeDeltas are microseconds. Aggregate identical source call frames across
 * nodes; count recursion once per inclusive stack sample. Idle/program/GC stay
 * visible instead of being silently treated as exact-solver CPU work. */
export function summarizeCardiorespiratoryWorkerCpuProfileV1(profile: CardiorespiratoryCpuProfileV1) {
  const samples = profile.samples ?? [], deltas = profile.timeDeltas ?? [];
  if (!Number.isFinite(profile.startTime) || !Number.isFinite(profile.endTime) || profile.endTime < profile.startTime
    || samples.length !== deltas.length || !samples.length || deltas.some(value => !Number.isFinite(value) || value < 0)) {
    throw new Error("CPU profile has invalid timestamps or missing/misaligned samples");
  }
  const nodes = new Map(profile.nodes.map(node => [node.id, node]));
  if (nodes.size !== profile.nodes.length) throw new Error("CPU profile has duplicate node IDs");
  const parents = new Map<number, number>();
  const keys = new Map<number, string>();
  type Metric = { functionName: string; url: string; line: number; column: number; selfMs: number; inclusiveMs: number };
  const aggregate = new Map<string, Metric>();
  for (const node of nodes.values()) {
    const frame = node.callFrame, key = JSON.stringify([frame.url, frame.lineNumber, frame.columnNumber, frame.functionName]);
    keys.set(node.id, key);
    if (!aggregate.has(key)) aggregate.set(key, { functionName: frame.functionName, url: frame.url,
      line: frame.lineNumber + 1, column: frame.columnNumber + 1, selfMs: 0, inclusiveMs: 0 });
    for (const child of node.children ?? []) {
      if (!nodes.has(child) || parents.has(child)) throw new Error("CPU profile child is missing or has multiple parents");
      parents.set(child, node.id);
    }
  }
  for (let i = 0; i < samples.length; i++) {
    const id = samples[i]!, durationMs = deltas[i]! / 1000, key = keys.get(id);
    if (key === undefined) throw new Error("CPU profile sample references an unknown node");
    aggregate.get(key)!.selfMs += durationMs;
    const visitedNodes = new Set<number>(), visitedFrames = new Set<string>();
    for (let cursor: number | undefined = id; cursor !== undefined; cursor = parents.get(cursor)) {
      if (visitedNodes.has(cursor)) throw new Error("CPU profile stack contains a cycle");
      visitedNodes.add(cursor);
      const frameKey = keys.get(cursor)!;
      if (!visitedFrames.has(frameKey)) { aggregate.get(frameKey)!.inclusiveMs += durationMs; visitedFrames.add(frameKey); }
    }
  }
  const all = [...aggregate.values()], rank = (key: "selfMs" | "inclusiveMs") => all.filter(row => row[key] > 0)
    .sort((a, b) => b[key] - a[key] || a.functionName.localeCompare(b.functionName)).slice(0, 40);
  return { profileDurationMs: (profile.endTime - profile.startTime) / 1000, sampleCount: samples.length,
    sampledDurationMs: deltas.reduce((sum, value) => sum + value, 0) / 1000,
    sampledScriptUrls: [...new Set(all.filter(row => row.selfMs > 0 && row.url).map(row => row.url))],
    rankedSelf: rank("selfMs"), rankedInclusive: rank("inclusiveMs"),
    scope: "V8 sampled call-stack time in the selected dedicated numerical Worker; includes idle/program/GC where reported, not exact instruction counts or throughput qualification; inclusive rows overlap" };
}

/** Playwright exposes page/frame CDP sessions, not Worker CDP sessions. Route
 * bounded commands through an explicitly attached non-flat Target session. */
export class CardiorespiratoryWorkerCdpRpcV1 {
  readonly #cdp: CDPSession;
  readonly #sessionId: string;
  #nextId = 0;
  #disposed = false;
  readonly #pending = new Map<number, { resolve(value: unknown): void; reject(error: Error): void; timeout: ReturnType<typeof setTimeout> }>();
  readonly #receive = (event: { sessionId: string; message: string }) => {
    if (event.sessionId !== this.#sessionId) return;
    const message = JSON.parse(event.message) as { id?: number; result?: unknown; error?: { message?: string } };
    if (message.id === undefined) return;
    const pending = this.#pending.get(message.id);
    if (!pending) return;
    this.#pending.delete(message.id); clearTimeout(pending.timeout);
    if (message.error) pending.reject(new Error(`Worker CDP: ${message.error.message ?? JSON.stringify(message.error)}`));
    else pending.resolve(message.result);
  };

  constructor(cdp: CDPSession, sessionId: string) {
    this.#cdp = cdp; this.#sessionId = sessionId;
    cdp.on("Target.receivedMessageFromTarget", this.#receive);
  }

  send<T = Record<string, unknown>>(method: string, params: Record<string, unknown> = {}): Promise<T> {
    if (this.#disposed) return Promise.reject(new Error("Worker CDP session was disposed"));
    const id = ++this.#nextId;
    return new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(() => { this.#pending.delete(id); reject(new Error(`Worker CDP timed out: ${method}`)); }, 15000);
      this.#pending.set(id, { resolve: value => resolve(value as T), reject, timeout });
      this.#cdp.send("Target.sendMessageToTarget", { sessionId: this.#sessionId, message: JSON.stringify({ id, method, params }) }).catch(error => {
        if (!this.#pending.delete(id)) return;
        clearTimeout(timeout); reject(error);
      });
    });
  }

  dispose() {
    this.#disposed = true; this.#cdp.off("Target.receivedMessageFromTarget", this.#receive);
    for (const pending of this.#pending.values()) { clearTimeout(pending.timeout); pending.reject(new Error("Worker CDP session disposed with a pending command")); }
    this.#pending.clear();
  }
}

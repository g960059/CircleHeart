import { sweepFrameTransferablesV1, type SweepRenderFrameV1, type SweepRenderResultV1 } from "./SweepRenderProtocolV1";
import type { SweepWorkerRequestV1, SweepWorkerResponseV1 } from "./SweepRenderWorkerRuntimeV1";
export interface SweepWorkerTransportV1 {
  postMessage(message: SweepWorkerRequestV1, transfer?: Transferable[]): void;
  addEventListener(type: "message", listener: (event: MessageEvent<SweepWorkerResponseV1>) => void): void;
  addEventListener(type: "error" | "messageerror", listener: (event: Event) => void): void;
  terminate(): void;
}
type Pending<T> = { resolve(value: T): void; reject(error: Error): void; timer: ReturnType<typeof setTimeout> };
/** One Worker shared across mounted sweep panes, with one bounded pending draw
 * per pane. Histories live in the worker; messages contain only changed tails. */
export class SweepRenderClientV1 {
  readonly ready: Promise<void>;
  #ready?: Pending<void>;
  #attached = new Map<string, Pending<void>>();
  #draws = new Map<string, Pending<SweepRenderResultV1> & { sequence: number }>();
  #panes = new Map<string, (error: Error) => void>();
  #failed: Error | undefined;
  constructor(private readonly transport: SweepWorkerTransportV1, private readonly timeoutMs = 4000) {
    this.ready = new Promise<void>((resolve, reject) => { this.#ready = { resolve, reject, timer: setTimeout(() => this.#fail(new Error("Render worker readiness timed out")), timeoutMs) }; });
    // Consumers attach failure handlers immediately even while waiting for fonts.
    void this.ready.catch(() => {});
    transport.addEventListener("message", event => this.#receive(event.data));
    transport.addEventListener("error", () => this.#fail(new Error("Render worker failed")));
    transport.addEventListener("messageerror", () => this.#fail(new Error("Render worker message failed")));
    try { transport.postMessage({ kind: "hello" }); } catch (error) { this.#fail(asError(error)); }
  }
  get paneCount(): number { return this.#panes.size; }
  get failed(): boolean { return this.#failed !== undefined; }
  async attach(paneId: string, canvas: OffscreenCanvas, onFailure: (error: Error) => void): Promise<void> {
    await this.ready;
    if (this.#failed) throw this.#failed;
    if (this.#panes.has(paneId)) throw new Error("Render pane already attached");
    this.#panes.set(paneId, onFailure);
    return new Promise<void>((resolve, reject) => {
      this.#attached.set(paneId, { resolve, reject, timer: setTimeout(() => this.#fail(new Error("Render canvas attachment timed out")), this.timeoutMs) });
      try { this.transport.postMessage({ kind: "attach", paneId, canvas }, [canvas]); } catch (error) { this.#fail(asError(error)); }
    });
  }
  draw(paneId: string, frame: SweepRenderFrameV1): Promise<SweepRenderResultV1> {
    if (this.#failed) return Promise.reject(this.#failed);
    if (!this.#panes.has(paneId) || this.#attached.has(paneId) || this.#draws.has(paneId)) return Promise.reject(new Error("Render pane is unavailable or busy"));
    return new Promise((resolve, reject) => {
      this.#draws.set(paneId, { sequence: frame.sequence, resolve, reject, timer: setTimeout(() => this.#failPane(paneId, new Error("Render worker draw timed out")), this.timeoutMs) });
      try { this.transport.postMessage({ kind: "frame", paneId, frame }, sweepFrameTransferablesV1(frame)); } catch (error) { this.#fail(asError(error)); }
    });
  }
  disposePane(paneId: string): void {
    this.#panes.delete(paneId);
    for (const map of [this.#attached, this.#draws]) {
      const pending = map.get(paneId); if (pending) { clearTimeout(pending.timer); pending.reject(new Error("Render pane disposed")); map.delete(paneId); }
    }
    if (!this.#failed) try { this.transport.postMessage({ kind: "dispose", paneId }); } catch { /* already closing */ }
  }
  dispose(): void { this.#fail(new Error("Render client disposed")); }
  #receive(message: SweepWorkerResponseV1): void {
    if (this.#failed) return;
    if (message.kind === "error") {
      const error = new Error(message.message);
      if (message.paneId === undefined) this.#fail(error); else this.#failPane(message.paneId, error);
      return;
    }
    if (message.kind === "ready") {
      if (this.#ready) { clearTimeout(this.#ready.timer); this.#ready.resolve(); this.#ready = undefined; } return;
    }
    if (message.kind === "attached") {
      const pending = this.#attached.get(message.paneId);
      if (pending) { clearTimeout(pending.timer); this.#attached.delete(message.paneId); pending.resolve(); } return;
    }
    const pending = this.#draws.get(message.paneId);
    if (!pending || message.result.sequence < pending.sequence) return;
    if (message.result.sequence !== pending.sequence) { this.#fail(new Error("Render reply sequence mismatch")); return; }
    clearTimeout(pending.timer); this.#draws.delete(message.paneId); pending.resolve(message.result);
  }
  #failPane(paneId: string, error: Error): void {
    const fail = this.#panes.get(paneId);
    if (!fail) return; // A late error for an already disposed pane has no owner.
    this.#panes.delete(paneId);
    for (const map of [this.#attached, this.#draws]) {
      const pending = map.get(paneId);
      if (pending) { clearTimeout(pending.timer); pending.reject(error); map.delete(paneId); }
    }
    try { this.transport.postMessage({ kind: "dispose", paneId }); } catch (transportError) { this.#fail(asError(transportError)); }
    fail(error);
  }
  #fail(error: Error): void {
    if (this.#failed) return;
    this.#failed = error; this.transport.terminate();
    if (this.#ready) { clearTimeout(this.#ready.timer); this.#ready.reject(error); this.#ready = undefined; }
    for (const pending of [...this.#attached.values(), ...this.#draws.values()]) { clearTimeout(pending.timer); pending.reject(error); }
    this.#attached.clear(); this.#draws.clear();
    for (const fail of this.#panes.values()) fail(error);
    this.#panes.clear();
  }
}
function asError(error: unknown): Error { return error instanceof Error ? error : new Error(String(error)); }
let shared: { client: SweepRenderClientV1; leases: number } | undefined;
export function acquireSweepRenderClientV1(): { client: SweepRenderClientV1; release(): void } {
  if (!shared || shared.client.failed) shared = { client: new SweepRenderClientV1(new Worker(new URL("./SweepRenderWorkerV1.ts", import.meta.url), { type: "module", name: "workbench-sweep-render" })), leases: 0 };
  const entry = shared; entry.leases++;
  let released = false;
  return { client: entry.client, release() { if (released) return; released = true; entry.leases--;
    if (entry.leases === 0) { entry.client.dispose(); if (shared === entry) shared = undefined; } } };
}
export function sweepRenderWorkerSupportedV1(): boolean {
  return typeof Worker === "function" && typeof OffscreenCanvas === "function"
    && typeof HTMLCanvasElement !== "undefined" && typeof HTMLCanvasElement.prototype.transferControlToOffscreen === "function";
}

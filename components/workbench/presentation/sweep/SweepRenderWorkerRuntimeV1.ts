import { SweepRenderModelV1 } from "./SweepRenderModelV1";
import type { SweepRenderFrameV1, SweepRenderResultV1 } from "./SweepRenderProtocolV1";
export type SweepWorkerRequestV1 = { kind: "hello" } | { kind: "attach"; paneId: string; canvas: OffscreenCanvas }
  | { kind: "frame"; paneId: string; frame: SweepRenderFrameV1 } | { kind: "dispose"; paneId: string };
export type SweepWorkerResponseV1 = { kind: "ready" } | { kind: "attached"; paneId: string }
  | { kind: "drawn"; paneId: string; result: SweepRenderResultV1 }
  | { kind: "error"; paneId?: string; message: string };
/** A shared render worker has no exact model or analysis authority. */
export class SweepRenderWorkerRuntimeV1 {
  #panes = new Map<string, { canvas: OffscreenCanvas; context: OffscreenCanvasRenderingContext2D; model: SweepRenderModelV1 }>();
  constructor(private readonly respond: (response: SweepWorkerResponseV1) => void) {}
  get paneCount(): number { return this.#panes.size; }
  handle(request: SweepWorkerRequestV1): void {
    try {
      if (request.kind === "hello") { this.respond({ kind: "ready" }); return; }
      if (request.kind === "dispose") { this.#panes.delete(request.paneId); return; }
      if (request.kind === "attach") {
        if (this.#panes.has(request.paneId) || this.#panes.size >= 32) throw new Error("Invalid render pane lifecycle");
        const context = request.canvas.getContext("2d");
        if (!context) throw new Error("OffscreenCanvas 2D is unavailable");
        this.#panes.set(request.paneId, { canvas: request.canvas, context, model: new SweepRenderModelV1() });
        this.respond({ kind: "attached", paneId: request.paneId }); return;
      }
      const pane = this.#panes.get(request.paneId);
      if (!pane) throw new Error("Unknown render pane");
      if (!pane.model.apply(request.frame)) return;
      const width = Math.max(1, Math.round(request.frame.width * request.frame.pixelRatio));
      const height = Math.max(1, Math.round(request.frame.height * request.frame.pixelRatio));
      if (pane.canvas.width !== width) pane.canvas.width = width;
      if (pane.canvas.height !== height) pane.canvas.height = height;
      this.respond({ kind: "drawn", paneId: request.paneId, result: pane.model.draw(pane.context) });
    } catch (error) {
      this.respond({ kind: "error", ...("paneId" in request ? { paneId: request.paneId } : {}), message: String(error) });
    }
  }
}

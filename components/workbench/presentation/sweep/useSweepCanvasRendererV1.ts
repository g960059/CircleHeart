import React from "react";
import type { WorkbenchGraphSampleSourceV3 } from "../WorkbenchGraphSampleSourceV3";
import { boundedCanvasPixelRatioV3, readWorkbenchCanvasThemeVariablesV3 } from "../WorkbenchCanvasRuntimeV3";
import { recordWorkbenchPerformanceDurationV3, recordWorkbenchPerformanceEventIntervalV3,
  recordWorkbenchPerformanceValueV3, incrementWorkbenchPerformanceCounterV3, workbenchPerformanceDiagnosticsEnabledV3 } from "../../runtime/WorkbenchPerformanceDiagnosticsV3";
import { acquireSweepRenderClientV1, sweepRenderWorkerSupportedV1 } from "./SweepRenderClientV1";
import { SweepRenderRecoveryV1, type SweepRenderSnapshotKeyV1 } from "./SweepRenderRecoveryV1";
import { type SweepRenderFrameV1, type SweepRenderResultV1, type SweepTraceInputV1 } from "./SweepRenderProtocolV1";

export type SweepCanvasInputV1 = Readonly<{ identity: string; traces: readonly (SweepTraceInputV1 & { scenarioId: string })[];
  sampleSource?: WorkbenchGraphSampleSourceV3; windowSec: number; includeZero: boolean; pressureAxis: boolean;
  axisTitle?: string; manualDomain?: readonly [number, number] }>;

/** Imperative graph data subscription: React retains accessible controls and
 * descriptors while received samples schedule at most one pending paint. */
export function useSweepCanvasRendererV1(containerRef: React.RefObject<HTMLDivElement | null>,
  canvasRef: React.RefObject<HTMLCanvasElement | null>, input: SweepCanvasInputV1): { canvasKey: number; paneId: string; backend: string } {
  const id = React.useId(), paneId = `sweep-${id.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const inputRef = React.useRef(input); inputRef.current = input;
  const scheduleRef = React.useRef<(() => void) | null>(null);
  const [canvasKey, setCanvasKey] = React.useState(0), [backend, setBackend] = React.useState("pending");
  const fallbackRef = React.useRef(false);
  React.useLayoutEffect(() => { scheduleRef.current?.(); }, [input]);
  React.useEffect(() => input.sampleSource?.subscribe(() => scheduleRef.current?.()), [input.sampleSource]);
  React.useEffect(() => {
    const canvas = canvasRef.current, container = containerRef.current;
    if (!canvas || !container) return;
    let disposed = false, frameId: number | null = null, dirty = true, inFlight = false, initialized = false;
    let width = 1, height = 1, intersects = true, sequence = 0, release: (() => void) | undefined;
    const recovery = new SweepRenderRecoveryV1();
    let paint: ((frame: SweepRenderFrameV1) => Promise<SweepRenderResultV1> | SweepRenderResultV1) | undefined;
    const metric = `render.sweep.${paneId}`;
    const fail = () => {
      if (disposed || fallbackRef.current) return;
      fallbackRef.current = true;
      incrementWorkbenchPerformanceCounterV3(`${metric}.fallback`);
      // A transferred canvas cannot regain a main-thread context. React creates
      // a fresh element; the latest source snapshot seeds a fresh bounded owner.
      setCanvasKey(key => key + 1);
    };
    const visible = () => intersects && document.visibilityState !== "hidden";
    const schedule = () => {
      dirty = true;
      if (disposed || !initialized || !visible() || frameId !== null || inFlight) return;
      frameId = requestAnimationFrame(() => { frameId = null; void render(); });
    };
    const render = async () => {
      if (disposed || !visible() || !dirty || !paint || inFlight) return;
      dirty = false; inFlight = true;
      let attempt: SweepRenderSnapshotKeyV1 | undefined;
      try {
        const current = inputRef.current, prepareStarted = performance.now();
        const [background, grid, axis, text, font] = readWorkbenchCanvasThemeVariablesV3(container, [
          ["--wb-canvas-bg", "#0a141d"], ["--wb-grid", "rgba(165, 185, 200, 0.10)"],
          ["--wb-axis", "rgba(165, 185, 200, 0.32)"], ["--wb-text-muted", "#94a3b8"],
          ["--wb-chart-font", "10px ui-monospace, SFMono-Regular, Menlo, monospace"],
        ]);
        const traces = current.traces.map(trace => ({ ...trace,
          samples: current.sampleSource?.getSamples(trace.scenarioId) ?? trace.samples }));
        attempt = { input: current, samples: traces.map(trace => trace.samples),
          dimensionsAndTheme: JSON.stringify([width, height, window.devicePixelRatio, background, grid, axis, text, font]) };
        if (!recovery.canAttempt(attempt)) return;
        const frame: SweepRenderFrameV1 = { sequence: ++sequence, identity: current.identity,
          width, height, pixelRatio: boundedCanvasPixelRatioV3(window.devicePixelRatio || 1), windowSec: current.windowSec,
          includeZero: current.includeZero, pressureAxis: current.pressureAxis, axisTitle: current.axisTitle,
          manualDomain: current.manualDomain, theme: { canvas: background!, grid: grid!, axis: axis!, text: text!, font: font! },
          traces: recovery.encoder.encode(traces) };
        if (workbenchPerformanceDiagnosticsEnabledV3()) {
          recordWorkbenchPerformanceDurationV3(`${metric}.encode`, performance.now() - prepareStarted);
          recordWorkbenchPerformanceValueV3(`${metric}.transferred-bytes`, frame.traces.reduce((sum, trace) => sum + trace.rows.byteLength, 0));
        }
        const result = await paint(frame);
        if (disposed) return;
        recovery.accept();
        canvas.dataset.yMinimum = String(result.domain[0]); canvas.dataset.yMaximum = String(result.domain[1]);
        canvas.dataset.renderSequence = String(result.sequence);
        recordWorkbenchPerformanceDurationV3(`${metric}.prepare`, result.prepareMs);
        recordWorkbenchPerformanceDurationV3(`${metric}.draw`, result.drawMs);
        // Completion intervals are not compositor presentation/FPS. Each pane
        // gets its own key so simultaneous canvases cannot halve the interval.
        recordWorkbenchPerformanceEventIntervalV3(`${metric}.display-interval`);
        recordWorkbenchPerformanceValueV3(`${metric}.points`, result.pointCount);
      } catch {
        recovery.reject(attempt);
        incrementWorkbenchPerformanceCounterV3(`${metric}.draw-error`);
        // A pane failure in the Worker needs a fresh canvas; the main backend
        // instead waits for changed input with both delta owners reset.
        if (useWorker) fail();
      }
      finally { inFlight = false; if (dirty && !disposed) schedule(); }
    };
    const resize = (nextWidth?: number, nextHeight?: number) => {
      const bounds = nextWidth === undefined || nextHeight === undefined ? container.getBoundingClientRect() : null;
      width = Math.max(1, nextWidth ?? bounds!.width); height = Math.max(1, nextHeight ?? bounds!.height); schedule();
    };
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(entries => {
      const rect = entries[0]?.contentRect; if (rect) resize(rect.width, rect.height); else resize();
    }) : null;
    observer?.observe(container);
    const intersection = typeof IntersectionObserver === "function" ? new IntersectionObserver(entries => {
      intersects = entries[0]?.isIntersecting ?? true; if (intersects) schedule();
    }) : null;
    intersection?.observe(container);
    const themeRoot = container.closest("[data-app-theme]");
    const themeObserver = typeof MutationObserver === "function" ? new MutationObserver(schedule) : null;
    if (themeRoot) themeObserver?.observe(themeRoot, { attributes: true, attributeFilter: ["data-app-theme", "class", "style"] });
    const resizeEvent = () => resize();
    window.addEventListener("resize", resizeEvent); document.addEventListener("visibilitychange", schedule);
    document.fonts?.addEventListener("loadingdone", schedule);
    scheduleRef.current = schedule; resize();
    const mode = new URLSearchParams(location.search).get("workbenchSweepRenderer") ?? "auto";
    const useWorker = !fallbackRef.current && mode !== "main" && sweepRenderWorkerSupportedV1();
    const initialize = async () => {
      if (useWorker) {
        const lease = acquireSweepRenderClientV1(); release = () => { lease.client.disposePane(paneId); lease.release(); };
        await lease.client.ready;
        if (disposed) return;
        const offscreen = canvas.transferControlToOffscreen();
        await lease.client.attach(paneId, offscreen, fail);
        if (disposed) return;
        paint = frame => lease.client.draw(paneId, frame); setBackend("worker");
        recordWorkbenchPerformanceValueV3(`${metric}.backend`, 1);
      } else {
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Canvas 2D unavailable");
        paint = frame => {
          const pixelWidth = Math.max(1, Math.round(frame.width * frame.pixelRatio));
          const pixelHeight = Math.max(1, Math.round(frame.height * frame.pixelRatio));
          if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
          if (canvas.height !== pixelHeight) canvas.height = pixelHeight;
          return recovery.paint(frame, context);
        };
        setBackend("main"); recordWorkbenchPerformanceValueV3(`${metric}.backend`, 0);
      }
      initialized = true; schedule();
    };
    void initialize().catch(fail);
    return () => {
      disposed = true; initialized = false; scheduleRef.current = null;
      if (frameId !== null) cancelAnimationFrame(frameId);
      observer?.disconnect(); intersection?.disconnect(); themeObserver?.disconnect();
      window.removeEventListener("resize", resizeEvent); document.removeEventListener("visibilitychange", schedule);
      document.fonts?.removeEventListener("loadingdone", schedule); release?.();
    };
  }, [canvasKey, paneId, canvasRef, containerRef]);
  return { canvasKey, paneId, backend };
}

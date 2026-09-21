import React from "react";

import {
  incrementWorkbenchPerformanceCounterV3,
  recordWorkbenchPerformanceDurationV3,
  recordWorkbenchPerformanceEventIntervalV3,
  workbenchPerformanceDiagnosticsEnabledV3,
  workbenchPerformanceNowV3,
} from "../runtime/WorkbenchPerformanceDiagnosticsV3";

const CANVAS_OBJECT_IDS_V3 = new WeakMap<object, number>();
let nextCanvasObjectIdV3 = 0;

/** Immutable analysis objects can invalidate a visual layer without repeatedly
 * serializing their full scientific payload on every animation frame. */
export function workbenchCanvasObjectIdentityV3(value: object | null | undefined): number {
  if (value == null) return 0;
  const existing = CANVAS_OBJECT_IDS_V3.get(value);
  if (existing !== undefined) return existing;
  const id = ++nextCanvasObjectIdV3;
  CANVAS_OBJECT_IDS_V3.set(value, id);
  return id;
}

const STATIC_CANVAS_LAYERS_V3 = new WeakMap<CanvasRenderingContext2D, {
  key: string;
  canvas: HTMLCanvasElement;
}>();

/** One bounded, disposable bitmap per live canvas. Axes and unchanged analysis
 * geometry are cached; live trajectories and current markers remain dynamic. */
export function drawWorkbenchStaticCanvasLayerV3(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  identity: readonly unknown[],
  draw: (layer: CanvasRenderingContext2D) => void,
): void {
  if (typeof document === "undefined" || typeof context.getTransform !== "function") {
    draw(context);
    return;
  }
  const transform = context.getTransform();
  if (transform.b !== 0 || transform.c !== 0 || transform.e !== 0 || transform.f !== 0) {
    draw(context);
    return;
  }
  const key = JSON.stringify([width, height, transform.a, transform.d, document.fonts?.status, identity]);
  let cached = STATIC_CANVAS_LAYERS_V3.get(context);
  if (cached?.key !== key) {
    const canvas = cached?.canvas ?? document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * transform.a));
    canvas.height = Math.max(1, Math.round(height * transform.d));
    const layer = canvas.getContext("2d");
    if (!layer) { draw(context); return; }
    layer.setTransform(transform.a, 0, 0, transform.d, 0, 0);
    draw(layer);
    cached = { key, canvas };
    STATIC_CANVAS_LAYERS_V3.set(context, cached);
    incrementWorkbenchPerformanceCounterV3("canvas.static-layer.paint");
  } else incrementWorkbenchPerformanceCounterV3("canvas.static-layer.reuse");
  context.drawImage(cached.canvas, 0, 0, width, height);
}

export const WORKBENCH_MAXIMUM_CANVAS_PIXEL_RATIO_V3 = 2;

const WORKBENCH_CANVAS_THEME_CACHE_V3 = new WeakMap<
  HTMLElement,
  Map<string, readonly string[]>
>();

/** Reads a Canvas palette once per element/theme/variable set. */
export function readWorkbenchCanvasThemeVariablesV3(
  element: HTMLElement | null,
  variables: readonly (readonly [name: string, fallback: string])[],
): readonly string[] {
  if (element === null || typeof getComputedStyle !== "function") {
    return Object.freeze(variables.map(([, fallback]) => fallback));
  }
  const themeRoot = element.closest<HTMLElement>("[data-app-theme]");
  const themeId = themeRoot?.dataset.appTheme ?? "";
  const cacheKey = `${themeId}\u001f${variables.map(([name]) => name).join("\u001f")}`;
  const elementCache = WORKBENCH_CANVAS_THEME_CACHE_V3.get(element)
    ?? new Map<string, readonly string[]>();
  const cached = elementCache.get(cacheKey);
  if (cached !== undefined) return cached;
  const styles = getComputedStyle(element);
  let allVariablesResolved = themeRoot !== null && themeId.length > 0;
  const values = Object.freeze(variables.map(([name, fallback]) => {
    const resolved = styles.getPropertyValue(name).trim();
    if (resolved.length === 0) allVariablesResolved = false;
    return resolved || fallback;
  }));
  // A first Canvas paint can race stylesheet/theme application. A fallback is
  // safe for that paint, but caching it would pin the wrong palette until the
  // component remounts. Cache only a fully resolved authored theme.
  if (!allVariablesResolved) return values;
  elementCache.set(cacheKey, values);
  WORKBENCH_CANVAS_THEME_CACHE_V3.set(element, elementCache);
  return values;
}

export function boundedCanvasPixelRatioV3(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(
    WORKBENCH_MAXIMUM_CANVAS_PIXEL_RATIO_V3,
    Math.max(1, value),
  );
}

export type WorkbenchCanvasFrameSchedulerV3 = Readonly<{
  schedule(): void;
  dispose(): void;
}>;

/** One pending animation frame is enough; replacing it can starve rendering. */
export function createWorkbenchCanvasFrameSchedulerV3(
  render: () => void,
  request: (callback: () => void) => number = requestAnimationFrame,
  cancel: (frameId: number) => void = cancelAnimationFrame,
): WorkbenchCanvasFrameSchedulerV3 {
  let frameId: number | null = null;
  let disposed = false;
  return Object.freeze({
    schedule() {
      if (disposed || frameId !== null) return;
      frameId = request(() => {
        frameId = null;
        if (!disposed) render();
      });
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      if (frameId !== null) cancel(frameId);
      frameId = null;
    },
  });
}

export function useResponsiveCanvasFrameV3(
  containerRef: React.RefObject<HTMLDivElement | null>,
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  draw: (
    context: CanvasRenderingContext2D,
    width: number,
    height: number,
  ) => void,
  diagnosticKey = "canvas",
): void {
  const drawRef = React.useRef(draw);
  const scheduleRef = React.useRef<(() => void) | null>(null);

  React.useLayoutEffect(() => {
    drawRef.current = draw;
    scheduleRef.current?.();
  }, [draw]);

  React.useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (container === null || canvas === null) return undefined;
    const context = canvas.getContext("2d");
    if (context === null) return undefined;
    let width = 1;
    let height = 1;

    const updateBounds = (
      nextWidth?: number,
      nextHeight?: number,
    ) => {
      if (nextWidth === undefined || nextHeight === undefined) {
        const bounds = container.getBoundingClientRect();
        nextWidth = bounds.width;
        nextHeight = bounds.height;
      }
      width = Math.max(1, nextWidth);
      height = Math.max(1, nextHeight);
    };

    const render = () => {
      const diagnosticsEnabled = workbenchPerformanceDiagnosticsEnabledV3();
      const startedAtMs = diagnosticsEnabled
        ? workbenchPerformanceNowV3()
        : 0;
      const pixelRatio = boundedCanvasPixelRatioV3(
        window.devicePixelRatio || 1,
      );
      const pixelWidth = Math.max(1, Math.round(width * pixelRatio));
      const pixelHeight = Math.max(1, Math.round(height * pixelRatio));
      if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
      if (canvas.height !== pixelHeight) canvas.height = pixelHeight;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.clearRect(0, 0, width, height);
      drawRef.current(context, width, height);
      if (diagnosticsEnabled) {
        recordWorkbenchPerformanceDurationV3(
          `canvas.${diagnosticKey}.draw`,
          workbenchPerformanceNowV3() - startedAtMs,
        );
        recordWorkbenchPerformanceEventIntervalV3(
          `canvas.${diagnosticKey}.display-interval`,
        );
      }
    };
    const frameScheduler = createWorkbenchCanvasFrameSchedulerV3(render);
    const schedule = frameScheduler.schedule;
    const observer = typeof ResizeObserver === "function"
      ? new ResizeObserver((entries) => {
          const entry = entries[0];
          if (entry !== undefined) {
            updateBounds(entry.contentRect.width, entry.contentRect.height);
          } else {
            updateBounds();
          }
          schedule();
        })
      : null;
    observer?.observe(container);
    const handleWindowResize = () => {
      updateBounds();
      schedule();
    };
    window.addEventListener("resize", handleWindowResize);
    updateBounds();
    scheduleRef.current = schedule;
    schedule();
    return () => {
      scheduleRef.current = null;
      observer?.disconnect();
      window.removeEventListener("resize", handleWindowResize);
      frameScheduler.dispose();
    };
  }, [canvasRef, containerRef, diagnosticKey]);
}

export function scaleLinearV3(
  value: number,
  domainMinimum: number,
  domainMaximum: number,
  rangeMinimum: number,
  rangeMaximum: number,
): number {
  const span = domainMaximum - domainMinimum;
  const ratio = span > 1e-12 ? (value - domainMinimum) / span : 0.5;
  return rangeMinimum + ratio * (rangeMaximum - rangeMinimum);
}

/**
 * Produces a fully opaque tint for Canvas markers. Mixing against the authored
 * Canvas surface preserves the visual softness of a translucent marker while
 * preventing the trace underneath from showing through the leading cap.
 */
export function mixOpaqueWorkbenchCanvasColorV3(
  foregroundHex: string,
  backgroundHex: string,
  foregroundFraction: number,
): string {
  const foreground = parseCanvasHexColorV3(foregroundHex);
  const background = parseCanvasHexColorV3(backgroundHex);
  if (foreground === null || background === null) return foregroundHex;
  const fraction = Math.max(0, Math.min(1, foregroundFraction));
  return `#${foreground.map((component, index) => {
    const mixed = Math.round(
      component * fraction + background[index]! * (1 - fraction),
    );
    return mixed.toString(16).padStart(2, "0");
  }).join("")}`;
}

function parseCanvasHexColorV3(
  value: string,
): readonly [number, number, number] | null {
  const normalized = value.trim().toLowerCase();
  const expanded = /^#[0-9a-f]{3}$/.test(normalized)
    ? `#${[...normalized.slice(1)].map((digit) => `${digit}${digit}`).join("")}`
    : normalized;
  if (!/^#[0-9a-f]{6}$/.test(expanded)) return null;
  return Object.freeze([
    Number.parseInt(expanded.slice(1, 3), 16),
    Number.parseInt(expanded.slice(3, 5), 16),
    Number.parseInt(expanded.slice(5, 7), 16),
  ]);
}

import React from "react";
import type { ExperimentGraphAxisRangesV2 } from "@/studio/contracts/v2/content";
import type { WorkbenchScalarSampleV3 } from "./WorkbenchScalarSampleV3";
import { GenericXYCanvasPathCacheV1, genericXYCanvasViewportV1 } from "./GenericXYCanvasRendererV1";
import { drawWorkbenchStaticCanvasLayerV3, readWorkbenchCanvasThemeVariablesV3, useResponsiveCanvasFrameV3 } from "./WorkbenchCanvasRuntimeV3";
import type { WorkbenchGraphSampleSourceV3 } from "./WorkbenchGraphSampleSourceV3";
import { recordWorkbenchPerformanceDurationV3, recordWorkbenchPerformanceValueV3, workbenchPerformanceDiagnosticsEnabledV3, workbenchPerformanceNowV3 } from "../runtime/WorkbenchPerformanceDiagnosticsV3";

export type GenericXYTraceV1 = Readonly<{ id: string; label: string; color: string;
  samples: readonly WorkbenchScalarSampleV3[]; scenarioId?: string; xOutputId: string; yOutputId: string; cyclePhaseOutputId: string }>;

/** Both coordinates come from the same accepted observation. Missing data and
 * changed epochs break the path; no synthetic closure or PVA interpretation. */
export function genericXYSegmentsV1(trace: GenericXYTraceV1): readonly (readonly [number, number][])[] {
  const segments: [number, number][][] = []; let current: [number, number][] = [];
  let previous: WorkbenchScalarSampleV3 | undefined;
  for (const sample of trace.samples) {
    const x = sample.values[trace.xOutputId], y = sample.values[trace.yOutputId], phase = sample.values[trace.cyclePhaseOutputId];
    if (x == null || y == null || phase == null || !Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(phase)) {
      if (current.length) segments.push(current); current = []; previous = undefined; continue;
    }
    if (previous && (sample.inputEpoch !== previous.inputEpoch || sample.acceptedRevision <= previous.acceptedRevision || sample.acceptedTimeSec <= previous.acceptedTimeSec
      || sample.acceptedTimeSec - previous.acceptedTimeSec > .004001 || phase < (previous.values[trace.cyclePhaseOutputId] ?? 0))) {
      if (current.length) segments.push(current); current = [];
    }
    current.push([x, y]); previous = sample;
  }
  if (current.length) segments.push(current);
  return segments;
}

const XY_CHUNK_SAMPLE_COUNT_V1 = 256;
type XYGeometryChunkV1 = Readonly<{
  id: number;
  samples: readonly WorkbenchScalarSampleV3[];
  predecessor: WorkbenchScalarSampleV3 | undefined;
  segments: readonly (readonly [number, number][])[];
  minimumX: number; maximumX: number; minimumY: number; maximumY: number;
  pointCount: number;
}>;
export type GenericXYGeometryV1 = Readonly<{
  chunks: readonly XYGeometryChunkV1[];
  minimumX: number; maximumX: number; minimumY: number; maximumY: number;
  pointCount: number;
}>;

/** Mounted-renderer cache only. A chunk retains the original paired observations;
 * identity checks cover every sample, including its incoming boundary. Neither
 * a changed middle sample nor an epoch/reset can reuse stale geometry. */
export class GenericXYGeometryCacheV1 {
  #binding = "";
  #nextChunkId = 0;
  readonly #immutableSamples = new WeakSet<WorkbenchScalarSampleV3>();
  #chunks = new Map<WorkbenchScalarSampleV3, XYGeometryChunkV1>();

  #immutableObservation(sample: WorkbenchScalarSampleV3): boolean {
    if (this.#immutableSamples.has(sample)) return true;
    const dataProperties = (record: object): PropertyDescriptorMap | null => {
      const prototype = Object.getPrototypeOf(record);
      if (!Object.isFrozen(record) || (prototype !== Object.prototype && prototype !== null)) return null;
      const properties = Object.getOwnPropertyDescriptors(record);
      for (const key of Reflect.ownKeys(properties)) if (!("value" in properties[key as string]!)) return null;
      return properties;
    };
    const properties = dataProperties(sample);
    const values = properties?.values?.value as unknown;
    if (!properties || values === null || typeof values !== "object") return false;
    for (const key of Reflect.ownKeys(properties)) {
      if (key !== "values" && typeof properties[key as string]!.value !== "number") return false;
    }
    const valueProperties = dataProperties(values);
    if (!valueProperties) return false;
    for (const key of Reflect.ownKeys(valueProperties)) {
      const value = valueProperties[key as string]!.value as unknown;
      if (value !== null && typeof value !== "number") return false;
    }
    this.#immutableSamples.add(sample);
    return true;
  }

  project(trace: GenericXYTraceV1): GenericXYGeometryV1 {
    const binding = JSON.stringify([trace.xOutputId, trace.yOutputId, trace.cyclePhaseOutputId]);
    if (binding !== this.#binding) { this.#chunks.clear(); this.#binding = binding; }
    const chunks: XYGeometryChunkV1[] = [], next = new Map<WorkbenchScalarSampleV3, XYGeometryChunkV1>();
    let minimumX = Infinity, maximumX = -Infinity, minimumY = Infinity, maximumY = -Infinity, pointCount = 0;
    for (let start = 0; start < trace.samples.length;) {
      const first = trace.samples[start]!, predecessor = trace.samples[start - 1];
      let chunk = this.#chunks.get(first);
      if (chunk && (chunk.predecessor !== predecessor
        || (chunk.samples.length !== XY_CHUNK_SAMPLE_COUNT_V1 && start + chunk.samples.length !== trace.samples.length)
        || !chunk.samples.every((sample, offset) => sample === trace.samples[start + offset]))) chunk = undefined;
      const reusedChunk = chunk !== undefined;
      if (!chunk) {
        let end = Math.min(start + XY_CHUNK_SAMPLE_COUNT_V1, trace.samples.length);
        // A sliding window clips only the first block; retain the established
        // interior boundaries instead of shifting and rebuilding every block.
        for (let index = start + 1; index < end; index++) {
          if (this.#chunks.get(trace.samples[index]!)?.samples.length === XY_CHUNK_SAMPLE_COUNT_V1) { end = index; break; }
        }
        const samples = trace.samples.slice(start, end);
        const segments = genericXYSegmentsV1({ ...trace, samples: predecessor ? [predecessor, ...samples] : samples });
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, count = 0;
        for (const segment of segments) for (const [x, y] of segment) {
          minX = Math.min(minX, x); maxX = Math.max(maxX, x);
          minY = Math.min(minY, y); maxY = Math.max(maxY, y); count++;
        }
        if (predecessor && genericXYSegmentsV1({ ...trace, samples: [predecessor] }).length) count--;
        chunk = { id: this.#nextChunkId++, samples, predecessor, segments, minimumX: minX, maximumX: maxX, minimumY: minY, maximumY: maxY, pointCount: count };
      }
      chunks.push(chunk);
      // Live store observations are frozen plain data. External preview arrays
      // and getter-backed records remain supported, but cannot earn reuse.
      if (reusedChunk || (chunk.samples.every(sample => this.#immutableObservation(sample))
        && (predecessor === undefined || this.#immutableObservation(predecessor)))) next.set(first, chunk);
      start += chunk.samples.length;
      minimumX = Math.min(minimumX, chunk.minimumX); maximumX = Math.max(maximumX, chunk.maximumX);
      minimumY = Math.min(minimumY, chunk.minimumY); maximumY = Math.max(maximumY, chunk.maximumY); pointCount += chunk.pointCount;
    }
    this.#chunks = next;
    return { chunks, minimumX, maximumX, minimumY, maximumY, pointCount };
  }

}

export function GenericXYGraphV1({ traces, xLabel, yLabel, axisRanges, actions, sampleSource }: Readonly<{
  traces: readonly GenericXYTraceV1[]; xLabel: string; yLabel: string; axisRanges?: ExperimentGraphAxisRangesV2; actions?: React.ReactNode;
  sampleSource?: WorkbenchGraphSampleSourceV3;
}>) {
  const rootRef = React.useRef<HTMLDivElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const canvasPaths = React.useRef(new GenericXYCanvasPathCacheV1());
  const caches = React.useRef(new Map<string, GenericXYGeometryCacheV1>());
  const draw = React.useCallback((context: CanvasRenderingContext2D, width: number, height: number) => {
    const diagnostics = workbenchPerformanceDiagnosticsEnabledV3(), started = diagnostics ? workbenchPerformanceNowV3() : 0;
    const activeIds = new Set(traces.map(trace => trace.id));
    for (const id of caches.current.keys()) if (!activeIds.has(id)) caches.current.delete(id);
    const data = traces.map(trace => {
      let cache = caches.current.get(trace.id);
      if (!cache) { cache = new GenericXYGeometryCacheV1(); caches.current.set(trace.id, cache); }
      const samples = sampleSource && trace.scenarioId ? sampleSource.getSamples(trace.scenarioId) : trace.samples;
      return { trace, geometry: cache.project(samples === trace.samples ? trace : { ...trace, samples }) };
    });
    let minimumX = Infinity, maximumX = -Infinity, minimumY = Infinity, maximumY = -Infinity, pointCount = 0;
    for (const { geometry } of data) {
      minimumX = Math.min(minimumX, geometry.minimumX); maximumX = Math.max(maximumX, geometry.maximumX);
      minimumY = Math.min(minimumY, geometry.minimumY); maximumY = Math.max(maximumY, geometry.maximumY); pointCount += geometry.pointCount;
    }
    const bounds = (axis: 0 | 1) => {
      const manual = axisRanges?.[axis === 0 ? "x" : "y"];
      if (manual) return [manual.minimum, manual.maximum] as const;
      const minimum = axis === 0 ? minimumX : minimumY, maximum = axis === 0 ? maximumX : maximumY;
      if (!Number.isFinite(minimum)) return [0, 1] as const;
      const pad = Math.max((maximum - minimum) * .08, Math.abs(minimum) * .02, .01);
      return [minimum - pad, maximum + pad] as const;
    };
    const [xmin, xmax] = bounds(0), [ymin, ymax] = bounds(1);
    const scaleX = 520 / (xmax - xmin), scaleY = -285 / (ymax - ymin);
    const viewport = genericXYCanvasViewportV1(width, height);
    const [gridColor, textColor] = readWorkbenchCanvasThemeVariablesV3(containerRef.current, [
      ["--wb-text-subtle", "#64748b"], ["--wb-text-muted", "#94a3b8"],
    ]);
    if (diagnostics) {
      recordWorkbenchPerformanceDurationV3("canvas.generic-xy.prepare", workbenchPerformanceNowV3() - started);
      recordWorkbenchPerformanceValueV3("canvas.generic-xy.source-points", pointCount);
    }
    drawWorkbenchStaticCanvasLayerV3(context, width, height, [xmin, xmax, ymin, ymax, xLabel, yLabel, gridColor, textColor, pointCount === 0], layer => {
      layer.save();
      layer.translate(viewport.offsetX, viewport.offsetY); layer.scale(viewport.scale, viewport.scale);
      layer.font = "11px ui-sans-serif, system-ui, sans-serif";
      layer.lineWidth = 1;
      const tick = (value: number) => Number(value.toPrecision(3)).toString();
      for (let i = 0; i < 5; i++) {
        const x = 70 + 520 * i / 4, y = 320 - 285 * i / 4;
        layer.globalAlpha = .18; layer.strokeStyle = gridColor;
        layer.beginPath(); layer.moveTo(x, 35); layer.lineTo(x, 320); layer.moveTo(70, y); layer.lineTo(590, y); layer.stroke();
        layer.globalAlpha = 1; layer.fillStyle = gridColor;
        layer.textAlign = "center"; layer.fillText(tick(xmin + (xmax - xmin) * i / 4), x, 338);
        layer.textAlign = "right"; layer.fillText(tick(ymin + (ymax - ymin) * i / 4), 62, y + 4);
      }
      layer.font = "12px ui-sans-serif, system-ui, sans-serif"; layer.fillStyle = textColor; layer.textAlign = "center";
      layer.fillText(xLabel, 330, 365);
      if (pointCount === 0) layer.fillText("—", 330, 180);
      layer.translate(18, 180); layer.rotate(-Math.PI / 2); layer.fillText(yLabel, 0, 0);
      layer.restore();
    });
    context.save();
    context.translate(viewport.offsetX, viewport.offsetY); context.scale(viewport.scale, viewport.scale);
    context.beginPath(); context.rect(70, 35, 520, 285); context.clip();
    context.lineWidth = 1.7;
    let retainedPointCount = 0;
    for (const { trace, geometry } of data) {
      const projected = canvasPaths.current.project(geometry, {
        scaleX, scaleY, offsetX: 70 - xmin * scaleX, offsetY: 320 - ymin * scaleY,
        displayScale: viewport.scale,
      });
      context.strokeStyle = trace.color; context.stroke(projected.path);
      retainedPointCount += projected.pointCount;
    }
    context.restore();
    if (canvasRef.current) canvasRef.current.dataset.displayPointCount = String(retainedPointCount);
    if (rootRef.current) {
      for (const [key, value] of Object.entries({ xMinimum: xmin, xMaximum: xmax, yMinimum: ymin, yMaximum: ymax })) {
        if (rootRef.current.dataset[key] !== String(value)) rootRef.current.dataset[key] = String(value);
      }
    }
    if (diagnostics) recordWorkbenchPerformanceValueV3("canvas.generic-xy.display-points", retainedPointCount);
  }, [traces, xLabel, yLabel, axisRanges, sampleSource]);
  useResponsiveCanvasFrameV3(containerRef, canvasRef, draw, "generic-xy", sampleSource?.subscribe);
  return <div ref={rootRef} className="flex h-full min-h-0 flex-col" data-testid="generic-xy-graph">
    <div className="flex flex-wrap items-center gap-3 px-3 py-2 text-xs text-wb-muted">
      {traces.map(trace => <span key={trace.id}><span style={{ color: trace.color }}>● </span>{trace.label}</span>)}{actions}
    </div>
    <div ref={containerRef} className="relative min-h-0 flex-1">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" data-testid="generic-xy-canvas" role="img" aria-label={`${yLabel} / ${xLabel}`} />
    </div>
  </div>;
}

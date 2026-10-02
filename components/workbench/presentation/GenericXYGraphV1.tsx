import React from "react";
import type { ExperimentGraphAxisRangesV2 } from "@/studio/contracts/v2/content";
import type { WorkbenchScalarSampleV3 } from "./WorkbenchScalarSampleV3";
import { recordWorkbenchPerformanceDurationV3, recordWorkbenchPerformanceValueV3, workbenchPerformanceDiagnosticsEnabledV3, workbenchPerformanceNowV3 } from "../runtime/WorkbenchPerformanceDiagnosticsV3";

export type GenericXYTraceV1 = Readonly<{ id: string; label: string; color: string;
  samples: readonly WorkbenchScalarSampleV3[]; xOutputId: string; yOutputId: string; cyclePhaseOutputId: string }>;

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

/** Display-only coalescing of consecutive points inside one subpixel SVG cell.
 * Retain first/last and both coordinate extrema in their original order. Every
 * retained pair is an observed point, and a path never crosses a segment gap.
 * The exact sample buffer and all analysis consumers remain unreduced. */
export function genericXYDisplayPathV1(segment: readonly (readonly [number, number])[],
  projectX: (value: number) => number, projectY: (value: number) => number): string {
  return coalescedXYPathV1(segment, projectX, projectY,
    point => `${projectX(point[0]).toFixed(2)},${projectY(point[1]).toFixed(2)}`);
}

function coalescedXYPathV1(segment: readonly (readonly [number, number])[],
  projectX: (value: number) => number, projectY: (value: number) => number,
  coordinates: (point: readonly [number, number]) => string): string {
  let path = "", first = 0, last = -1, minXIndex = 0, maxXIndex = 0, minYIndex = 0, maxYIndex = 0;
  let cellX = NaN, cellY = NaN, minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  const append = (index: number) => {
    const point = segment[index]!;
    path += `${path.length === 0 ? "M" : " L"}${coordinates(point)}`;
  };
  const flush = () => {
    if (last < first) return;
    if ((minXIndex === first || minXIndex === last) && (maxXIndex === first || maxXIndex === last)
      && (minYIndex === first || minYIndex === last) && (maxYIndex === first || maxYIndex === last)) {
      append(first); if (last !== first) append(last); return;
    }
    const indices = [first, minXIndex, maxXIndex, minYIndex, maxYIndex, last].sort((a, b) => a - b);
    let previous = -1;
    for (const index of indices) {
      if (index === previous) continue;
      append(index);
      previous = index;
    }
  };
  for (let index = 0; index < segment.length; index++) {
    const point = segment[index]!, x = projectX(point[0]), y = projectY(point[1]);
    const nextCellX = Math.floor(x / .75), nextCellY = Math.floor(y / .75);
    if (nextCellX !== cellX || nextCellY !== cellY) {
      flush(); first = minXIndex = maxXIndex = minYIndex = maxYIndex = index;
      cellX = nextCellX; cellY = nextCellY; minX = maxX = x; minY = maxY = y;
    } else {
      if (x < minX) { minX = x; minXIndex = index; }
      if (x > maxX) { maxX = x; maxXIndex = index; }
      if (y < minY) { minY = y; minYIndex = index; }
      if (y > maxY) { maxY = y; maxYIndex = index; }
    }
    last = index;
  }
  flush();
  return path;
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
  #paths = new WeakMap<XYGeometryChunkV1, Readonly<{ scaleX: number; scaleY: number; path: string }>>();

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

  paths(geometry: GenericXYGeometryV1, scaleX: number, scaleY: number): readonly string[] {
    // Round toward finer cells: a coalesced cell never exceeds .75 screen units.
    // Small automatic-domain changes update only the SVG transform, without
    // repeatedly serializing unchanged history. Large zoom changes reproject.
    const cellScale = (scale: number) => 2 ** Math.ceil(Math.log2(Math.abs(scale)));
    const cellScaleX = cellScale(scaleX), cellScaleY = cellScale(scaleY);
    return geometry.chunks.map(chunk => {
      const existing = this.#paths.get(chunk);
      if (existing?.scaleX === cellScaleX && existing.scaleY === cellScaleY) return existing.path;
      const path = chunk.segments.map(segment => coalescedXYPathV1(segment,
        value => value * cellScaleX, value => value * cellScaleY,
        point => `${point[0]},${point[1]}`)).join(" ");
      this.#paths.set(chunk, { scaleX: cellScaleX, scaleY: cellScaleY, path });
      return path;
    });
  }
}

export function genericXYResponsiveStrokeWidthV1(width: number, height: number): number {
  return 1.7 * Math.min(width / 620, height / 375);
}

const GenericXYPathV1 = React.memo(function GenericXYPathV1({ path, color, strokeWidth }: Readonly<{ path: string; color: string; strokeWidth: number }>) {
  return <path d={path} fill="none" stroke={color} strokeWidth={strokeWidth} vectorEffect="non-scaling-stroke" />;
});

export function GenericXYGraphV1({ traces, xLabel, yLabel, axisRanges, actions }: Readonly<{
  traces: readonly GenericXYTraceV1[]; xLabel: string; yLabel: string; axisRanges?: ExperimentGraphAxisRangesV2; actions?: React.ReactNode;
}>) {
  const clipId = React.useId().replace(/:/g, "");
  const svgRef = React.useRef<SVGSVGElement>(null);
  const [strokeWidth, setStrokeWidth] = React.useState(1.7);
  React.useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const update = (width: number, height: number) => {
      if (width > 0 && height > 0) setStrokeWidth(genericXYResponsiveStrokeWidthV1(width, height));
    };
    const measure = () => { const bounds = svg.getBoundingClientRect(); update(bounds.width, bounds.height); };
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(entries => {
      const bounds = entries[0]?.contentRect;
      if (bounds) update(bounds.width, bounds.height);
    }) : null;
    observer?.observe(svg); window.addEventListener("resize", measure); measure();
    return () => { observer?.disconnect(); window.removeEventListener("resize", measure); };
  }, []);
  const diagnostics = workbenchPerformanceDiagnosticsEnabledV3(), started = diagnostics ? workbenchPerformanceNowV3() : 0;
  const caches = React.useRef(new Map<string, GenericXYGeometryCacheV1>());
  const activeIds = new Set(traces.map(trace => trace.id));
  for (const id of caches.current.keys()) if (!activeIds.has(id)) caches.current.delete(id);
  const data = traces.map(trace => {
    let cache = caches.current.get(trace.id);
    if (!cache) { cache = new GenericXYGeometryCacheV1(); caches.current.set(trace.id, cache); }
    return { trace, cache, geometry: cache.project(trace) };
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
  const x = (v: number) => 70 + (v - xmin) / (xmax - xmin) * 520;
  const y = (v: number) => 320 - (v - ymin) / (ymax - ymin) * 285;
  const scaleX = 520 / (xmax - xmin), scaleY = -285 / (ymax - ymin);
  const paths = data.flatMap(({ trace, cache, geometry }) => cache.paths(geometry, scaleX, scaleY).map((path, index) => ({
    id: `${trace.id}-${geometry.chunks[index]!.id}`, color: trace.color, path,
  })));
  if (diagnostics) {
    recordWorkbenchPerformanceDurationV3("svg.generic-xy.prepare", workbenchPerformanceNowV3() - started);
    recordWorkbenchPerformanceValueV3("svg.generic-xy.source-points", pointCount);
    recordWorkbenchPerformanceValueV3("svg.generic-xy.path-characters", paths.reduce((sum, item) => sum + item.path.length, 0));
  }
  const tick = (v: number) => Number(v.toPrecision(3)).toString();
  return <div className="flex h-full min-h-0 flex-col" data-testid="generic-xy-graph"
    data-x-minimum={xmin} data-x-maximum={xmax} data-y-minimum={ymin} data-y-maximum={ymax}>
    <div className="flex flex-wrap items-center gap-3 px-3 py-2 text-xs text-wb-muted">
      {traces.map(trace => <span key={trace.id}><span style={{ color: trace.color }}>● </span>{trace.label}</span>)}{actions}
    </div>
    <svg ref={svgRef} viewBox="0 0 620 375" className="min-h-0 flex-1" role="img" aria-label={`${yLabel} / ${xLabel}`}>
      <defs><clipPath id={clipId}><rect x="70" y="35" width="520" height="285" /></clipPath></defs>
      {Array.from({ length: 5 }, (_, i) => {
        const xv = xmin + (xmax - xmin) * i / 4, yv = ymin + (ymax - ymin) * i / 4;
        return <g key={i} className="text-wb-subtle" fontSize="11" fill="currentColor">
          <path d={`M${x(xv)},35V320 M70,${y(yv)}H590`} stroke="currentColor" opacity=".18" />
          <text x={x(xv)} y="338" textAnchor="middle">{tick(xv)}</text><text x="62" y={y(yv) + 4} textAnchor="end">{tick(yv)}</text>
        </g>;
      })}
      <g clipPath={`url(#${clipId})`}><g transform={`matrix(${scaleX} 0 0 ${scaleY} ${70 - xmin * scaleX} ${320 - ymin * scaleY})`}>
        {paths.map(path => <GenericXYPathV1 key={path.id} path={path.path} color={path.color} strokeWidth={strokeWidth} />)}
      </g></g>
      <g className="text-wb-muted" fill="currentColor" fontSize="12"><text x="330" y="365" textAnchor="middle">{xLabel}</text>
        <text transform="translate(18 180) rotate(-90)" textAnchor="middle">{yLabel}</text></g>
      {pointCount === 0 && <text x="330" y="180" textAnchor="middle" className="text-wb-muted" fill="currentColor" fontSize="12">—</text>}
    </svg>
  </div>;
}

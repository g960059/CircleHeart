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
  let path = "", first = 0, last = -1, minXIndex = 0, maxXIndex = 0, minYIndex = 0, maxYIndex = 0;
  let cellX = NaN, cellY = NaN, minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  const append = (index: number) => {
    const point = segment[index]!;
    path += `${path.length === 0 ? "M" : " L"}${projectX(point[0]).toFixed(2)},${projectY(point[1]).toFixed(2)}`;
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

export function GenericXYGraphV1({ traces, xLabel, yLabel, axisRanges, actions }: Readonly<{
  traces: readonly GenericXYTraceV1[]; xLabel: string; yLabel: string; axisRanges?: ExperimentGraphAxisRangesV2; actions?: React.ReactNode;
}>) {
  const clipId = React.useId().replace(/:/g, "");
  const diagnostics = workbenchPerformanceDiagnosticsEnabledV3(), started = diagnostics ? workbenchPerformanceNowV3() : 0;
  const data = traces.map(trace => ({ ...trace, segments: genericXYSegmentsV1(trace) }));
  let minimumX = Infinity, maximumX = -Infinity, minimumY = Infinity, maximumY = -Infinity, pointCount = 0;
  for (const trace of data) for (const segment of trace.segments) for (const [x, y] of segment) {
    minimumX = Math.min(minimumX, x); maximumX = Math.max(maximumX, x);
    minimumY = Math.min(minimumY, y); maximumY = Math.max(maximumY, y); pointCount++;
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
  const paths = data.flatMap(trace => trace.segments.map((segment, i) => ({
    id: `${trace.id}-${i}`, color: trace.color, path: genericXYDisplayPathV1(segment, x, y),
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
    <svg viewBox="0 0 620 375" className="min-h-0 flex-1" role="img" aria-label={`${yLabel} / ${xLabel}`}>
      <defs><clipPath id={clipId}><rect x="70" y="35" width="520" height="285" /></clipPath></defs>
      {Array.from({ length: 5 }, (_, i) => {
        const xv = xmin + (xmax - xmin) * i / 4, yv = ymin + (ymax - ymin) * i / 4;
        return <g key={i} className="text-wb-subtle" fontSize="11" fill="currentColor">
          <path d={`M${x(xv)},35V320 M70,${y(yv)}H590`} stroke="currentColor" opacity=".18" />
          <text x={x(xv)} y="338" textAnchor="middle">{tick(xv)}</text><text x="62" y={y(yv) + 4} textAnchor="end">{tick(yv)}</text>
        </g>;
      })}
      <g clipPath={`url(#${clipId})`}>{paths.map(path => <path key={path.id}
        d={path.path} fill="none" stroke={path.color} strokeWidth="1.7" />)}</g>
      <g className="text-wb-muted" fill="currentColor" fontSize="12"><text x="330" y="365" textAnchor="middle">{xLabel}</text>
        <text transform="translate(18 180) rotate(-90)" textAnchor="middle">{yLabel}</text></g>
      {pointCount === 0 && <text x="330" y="180" textAnchor="middle" className="text-wb-muted" fill="currentColor" fontSize="12">—</text>}
    </svg>
  </div>;
}

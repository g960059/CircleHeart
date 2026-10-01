import React from "react";
import type { ExperimentGraphAxisRangesV2 } from "@/studio/contracts/v2/content";
import type { WorkbenchScalarSampleV3 } from "./WorkbenchScalarSampleV3";

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

export function GenericXYGraphV1({ traces, xLabel, yLabel, axisRanges, actions }: Readonly<{
  traces: readonly GenericXYTraceV1[]; xLabel: string; yLabel: string; axisRanges?: ExperimentGraphAxisRangesV2; actions?: React.ReactNode;
}>) {
  const clipId = React.useId().replace(/:/g, "");
  const data = traces.map(trace => ({ ...trace, segments: genericXYSegmentsV1(trace) }));
  const points = data.flatMap(trace => trace.segments.flat());
  const bounds = (axis: 0 | 1) => {
    const manual = axisRanges?.[axis === 0 ? "x" : "y"];
    if (manual) return [manual.minimum, manual.maximum] as const;
    let minimum = Infinity, maximum = -Infinity;
    for (const point of points) { minimum = Math.min(minimum, point[axis]); maximum = Math.max(maximum, point[axis]); }
    if (!Number.isFinite(minimum)) return [0, 1] as const;
    const pad = Math.max((maximum - minimum) * .08, Math.abs(minimum) * .02, .01);
    return [minimum - pad, maximum + pad] as const;
  };
  const [xmin, xmax] = bounds(0), [ymin, ymax] = bounds(1);
  const x = (v: number) => 70 + (v - xmin) / (xmax - xmin) * 520;
  const y = (v: number) => 320 - (v - ymin) / (ymax - ymin) * 285;
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
      <g clipPath={`url(#${clipId})`}>{data.flatMap(trace => trace.segments.map((segment, i) => <path key={`${trace.id}-${i}`}
        d={segment.map(([a, b], n) => `${n ? "L" : "M"}${x(a).toFixed(2)},${y(b).toFixed(2)}`).join(" ")}
        fill="none" stroke={trace.color} strokeWidth="1.7" />))}</g>
      <g className="text-wb-muted" fill="currentColor" fontSize="12"><text x="330" y="365" textAnchor="middle">{xLabel}</text>
        <text transform="translate(18 180) rotate(-90)" textAnchor="middle">{yLabel}</text></g>
      {points.length === 0 && <text x="330" y="180" textAnchor="middle" className="text-wb-muted" fill="currentColor" fontSize="12">—</text>}
    </svg>
  </div>;
}

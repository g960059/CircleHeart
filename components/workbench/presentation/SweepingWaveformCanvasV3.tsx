import React from "react";
import { workbenchManualChartDomainV3 } from "./WorkbenchManualChartDomainV3";

import {
  isWorkbenchPresentationSampleV3,
} from "./WorkbenchPresentationSampleBufferV3";
import {
  firstSampleAtOrAfterV3,
  finiteWorkbenchScalarValueV3,
  orderedFiniteWorkbenchSamplesV3,
  type WorkbenchScalarSampleV3,
} from "./WorkbenchScalarSampleV3";
import {
  scaleLinearV3,
  readWorkbenchCanvasThemeVariablesV3,
  useResponsiveCanvasFrameV3,
} from "./WorkbenchCanvasRuntimeV3";
import {
  WorkbenchChartLegendV3,
  buildWorkbenchTraceLegendModelV3,
  drawWorkbenchLeadingCapV3,
  workbenchLegendTraceAlphaV3,
  workbenchLegendTraceHiddenV3,
  workbenchTraceLegendKeyV3,
  type WorkbenchChartLegendSelectionV3,
  type WorkbenchScenarioTraceIdentityV3,
} from "./WorkbenchChartTraceStyleV3";
import {
  nextStableNumericDomainStateV3,
  numericTicksV3,
  type WorkbenchNumericDomainV3,
  type WorkbenchStableNumericDomainStateV3,
} from "./WorkbenchStableChartDomainV3";

export type WorkbenchWaveformTraceV3 = WorkbenchScenarioTraceIdentityV3 &
  Readonly<{
    samples: readonly WorkbenchScalarSampleV3[];
    outputId: string;
    signalLabel: string;
    signalDescription?: string;
    signalDescriptionLabel?: string;
    /** Final resolved trace color from the automatic comparison strategy. */
    signalColor: string;
    /** Optional catalog-owned cycle source used to commit stable axes. */
    cyclePhaseOutputId?: string;
  }>;

export type SweepingWaveformPointV3 = Readonly<{
  phaseSec: number;
  value: number;
}>;

export type SweepingWaveformSegmentV3 = readonly SweepingWaveformPointV3[];

/** Canvas-only column envelope. Retained points are original time/value pairs;
 * keep the first, both extrema and last in accepted order. Each existing gap
 * or sweep wrap is supplied separately and remains a separate stroke. */
export function coalesceSweepingWaveformDisplaySegmentV3(
  segment: SweepingWaveformSegmentV3,
  projectX: (phaseSec: number) => number,
): SweepingWaveformSegmentV3 {
  if (segment.length < 2) return segment;
  const firstColumn = Math.floor(projectX(segment[0]!.phaseSec));
  const lastColumn = Math.floor(projectX(segment.at(-1)!.phaseSec));
  // Sparse trajectories already fit this budget; avoid another pass/allocation.
  if (segment.length <= 4 * (Math.abs(lastColumn - firstColumn) + 1)) return segment;
  const result: SweepingWaveformPointV3[] = [];
  let column = firstColumn, first = 0, last = 0, low = 0, high = 0;
  const flush = () => {
    result.push(segment[first]!);
    const earlier = Math.min(low, high), later = Math.max(low, high);
    if (earlier !== first && earlier !== last) result.push(segment[earlier]!);
    if (later !== earlier && later !== first && later !== last) result.push(segment[later]!);
    if (last !== first) result.push(segment[last]!);
  };
  for (let i = 1; i < segment.length; i++) {
    const point = segment[i]!, nextColumn = Math.floor(projectX(point.phaseSec));
    if (nextColumn !== column) {
      flush(); column = nextColumn; first = low = high = i;
    } else {
      if (point.value < segment[low]!.value) low = i;
      if (point.value > segment[high]!.value) high = i;
    }
    last = i;
  }
  flush();
  return result;
}

type WaveformSourcePointV3 = Readonly<{
  presentationTimeSec: number;
  value: number;
}>;

type ProjectedWaveformSourcePointV3 = Readonly<{
  presentationTimeSec: number;
  point: SweepingWaveformPointV3;
}>;

// Completed presentation buckets retain their identity between paints. Keep
// their exact extrema/order and modulo projection, not a second sampled curve.
// Weak keys release evicted history; one window per signal bounds each entry.
const waveformProjectionCacheV3 = new WeakMap<
  WorkbenchScalarSampleV3,
  Map<string, Readonly<{
    windowSec: number;
    points: readonly ProjectedWaveformSourcePointV3[];
  }>>
>();

function projectedWaveformSourcePointsV3(
  sample: WorkbenchScalarSampleV3,
  outputId: string,
  windowSec: number,
): readonly ProjectedWaveformSourcePointV3[] {
  let signals = waveformProjectionCacheV3.get(sample);
  const cached = signals?.get(outputId);
  if (cached?.windowSec === windowSec) return cached.points;
  const points = Object.freeze(waveformSourcePointsV3(sample, outputId)
    .map((point) => Object.freeze({
      presentationTimeSec: point.presentationTimeSec,
      point: Object.freeze({
        phaseSec: positiveModuloV3(point.presentationTimeSec, windowSec),
        value: point.value,
      }),
    })));
  const immutable = Object.isFrozen(sample) && Object.isFrozen(sample.values)
    && (!isWorkbenchPresentationSampleV3(sample)
      || (Object.isFrozen(sample.presentationEnvelope)
        && Object.values(sample.presentationEnvelope).every((value) =>
          typeof value !== "object" || value === null || Object.isFrozen(value))));
  if (immutable) {
    if (signals === undefined) {
      signals = new Map();
      waveformProjectionCacheV3.set(sample, signals);
    }
    signals.set(outputId, { windowSec, points });
  }
  return points;
}

type SweepingWaveformOptionsV3 = Readonly<{
  windowSec: number;
  forwardGapFraction?: number;
}>;

/**
 * Expands one bounded presentation bucket into its causally ordered
 * first/min/max/last samples. This preserves sharp accepted-step features in
 * the main polyline without a separate min/max whisker layer or an unbounded
 * 2 ms UI trace.
 */
function waveformSourcePointsV3(
  sample: WorkbenchScalarSampleV3,
  outputId: string,
): readonly WaveformSourcePointV3[] {
  const terminal = finiteWorkbenchScalarValueV3(sample, outputId);
  if (terminal === null) return Object.freeze([]);
  if (!isWorkbenchPresentationSampleV3(sample)) {
    return Object.freeze([Object.freeze({
      presentationTimeSec: sample.presentationTimeSec,
      value: terminal,
    })]);
  }
  const envelope = sample.presentationEnvelope;
  const candidates: WaveformSourcePointV3[] = [];
  const append = (
    presentationTimeSec: number | undefined,
    value: number | undefined,
  ) => {
    if (
      typeof presentationTimeSec !== "number"
      || !Number.isFinite(presentationTimeSec)
      || typeof value !== "number"
      || !Number.isFinite(value)
    ) return;
    candidates.push(Object.freeze({ presentationTimeSec, value }));
  };
  append(
    envelope.firstPresentationTimesSec[outputId],
    envelope.firsts[outputId],
  );
  append(
    envelope.minimumPresentationTimesSec[outputId],
    envelope.minimums[outputId],
  );
  append(
    envelope.maximumPresentationTimesSec[outputId],
    envelope.maximums[outputId],
  );
  append(sample.presentationTimeSec, terminal);
  candidates.sort((left, right) =>
    left.presentationTimeSec - right.presentationTimeSec);
  return Object.freeze(candidates.filter((point, index) => {
    const previous = candidates[index - 1];
    return previous === undefined
      || Math.abs(previous.presentationTimeSec - point.presentationTimeSec)
        > WAVEFORM_EPSILON_V3
      || Math.abs(previous.value - point.value) > WAVEFORM_EPSILON_V3;
  }));
}

export const WORKBENCH_SWEEP_FORWARD_GAP_FRACTION_V3 = 0.04;

const WAVEFORM_EPSILON_V3 = 1e-9;

export function positiveModuloV3(value: number, period: number): number {
  if (!(period > 0) || !Number.isFinite(value)) return 0;
  const result = value % period;
  return result < 0 ? result + period : result;
}

export function phaseIsInsideForwardSweepGapV3(
  phaseSec: number,
  cursorPhaseSec: number,
  gapSec: number,
  windowSec: number,
): boolean {
  if (!(windowSec > 0) || !(gapSec > 0)) return false;
  const forwardDistance = positiveModuloV3(
    phaseSec - cursorPhaseSec,
    windowSec,
  );
  return forwardDistance > WAVEFORM_EPSILON_V3
    && forwardDistance < gapSec;
}

/**
 * Projects the newest time window onto a sweeping display. A model-time wrap,
 * a missing value, or the blank region immediately ahead of the cursor starts
 * a new stroke, so Canvas never draws a false line across the sweep boundary.
 */
export function buildSweepingWaveformSegmentsV3(
  samples: readonly WorkbenchScalarSampleV3[],
  outputId: string,
  options: SweepingWaveformOptionsV3,
): readonly SweepingWaveformSegmentV3[] {
  const windowSec = options.windowSec;
  if (!(windowSec > 0) || !Number.isFinite(windowSec)) {
    return Object.freeze([]);
  }
  const ordered = orderedFiniteWorkbenchSamplesV3(samples);
  return buildSweepingWaveformSegmentsFromOrderedV3(
    ordered,
    outputId,
    options,
  );
}

function buildSweepingWaveformSegmentsFromOrderedV3(
  ordered: readonly WorkbenchScalarSampleV3[],
  outputId: string,
  options: SweepingWaveformOptionsV3,
): readonly SweepingWaveformSegmentV3[] {
  const windowSec = options.windowSec;
  if (!(windowSec > 0) || !Number.isFinite(windowSec)) {
    return Object.freeze([]);
  }
  const latestTimeSec = ordered.at(-1)?.presentationTimeSec;
  if (latestTimeSec === undefined) return Object.freeze([]);

  const cursorPhaseSec = positiveModuloV3(latestTimeSec, windowSec);
  const gapFraction = clampV3(
    options.forwardGapFraction
      ?? WORKBENCH_SWEEP_FORWARD_GAP_FRACTION_V3,
    0,
    0.25,
  );
  const gapSec = windowSec * gapFraction;
  const oldestTimeSec = latestTimeSec - windowSec - WAVEFORM_EPSILON_V3;
  const segments: SweepingWaveformPointV3[][] = [];
  let active: SweepingWaveformPointV3[] = [];
  let previousPhaseSec: number | null = null;

  const flush = () => {
    if (active.length > 0) segments.push(active);
    active = [];
  };

  const firstIndex = firstSampleAtOrAfterV3(ordered, oldestTimeSec);
  for (let index = firstIndex; index < ordered.length; index += 1) {
    const sample = ordered[index]!;
    for (const sourcePoint of projectedWaveformSourcePointsV3(sample, outputId, windowSec)) {
      if (sourcePoint.presentationTimeSec < oldestTimeSec) continue;
      const { phaseSec, value } = sourcePoint.point;
      if (
        previousPhaseSec !== null
        && phaseSec + WAVEFORM_EPSILON_V3 < previousPhaseSec
      ) {
        flush();
      }
      previousPhaseSec = phaseSec;
      const hiddenByCursorGap = phaseIsInsideForwardSweepGapV3(
        phaseSec,
        cursorPhaseSec,
        gapSec,
        windowSec,
      );
      if (hiddenByCursorGap) {
        flush();
        continue;
      }
      const previousPoint = active.at(-1);
      if (
        previousPoint !== undefined
        && Math.abs(previousPoint.phaseSec - phaseSec)
          <= WAVEFORM_EPSILON_V3
        && Math.abs(previousPoint.value - value)
          <= WAVEFORM_EPSILON_V3
      ) continue;
      active.push(sourcePoint.point);
    }
  }
  flush();
  return Object.freeze(segments.map((segment) => Object.freeze(segment)));
}

export function latestSweepingWaveformPointV3(
  samples: readonly WorkbenchScalarSampleV3[],
  outputId: string,
  windowSec: number,
): SweepingWaveformPointV3 | null {
  if (!(windowSec > 0) || !Number.isFinite(windowSec)) return null;
  return latestSweepingWaveformPointFromOrderedV3(
    orderedFiniteWorkbenchSamplesV3(samples),
    outputId,
    windowSec,
  );
}

function latestSweepingWaveformPointFromOrderedV3(
  ordered: readonly WorkbenchScalarSampleV3[],
  outputId: string,
  windowSec: number,
): SweepingWaveformPointV3 | null {
  const latestTimeSec = ordered.at(-1)?.presentationTimeSec;
  if (latestTimeSec === undefined) return null;
  const oldestVisibleTimeSec = latestTimeSec - windowSec;
  for (let index = ordered.length - 1; index >= 0; index -= 1) {
    const sample = ordered[index]!;
    if (sample.presentationTimeSec < oldestVisibleTimeSec) break;
    const value = finiteWorkbenchScalarValueV3(sample, outputId);
    if (value === null) continue;
    return Object.freeze({
      phaseSec: positiveModuloV3(sample.presentationTimeSec, windowSec),
      value,
    });
  }
  return null;
}

type SweepingWaveformCanvasCommonPropsV3 = Readonly<{
  axisRanges?: import("@/studio/contracts/v2/content").ExperimentGraphAxisRangesV2;
  legendActions?: React.ReactNode;
  windowSec?: number;
  unitLabel?: string;
  axisLabel?: string;
  includeZero?: boolean;
  className?: string;
}>;

export type SweepingWaveformCanvasPropsV3 = SweepingWaveformCanvasCommonPropsV3 & Readonly<{
  traces: readonly WorkbenchWaveformTraceV3[];
  activeScenarioId: string | null;
}>;

export function SweepingWaveformCanvasV3(
  props: SweepingWaveformCanvasPropsV3,
) {
  const {
    windowSec = 6,
    unitLabel,
    axisLabel,
    includeZero = false,
    className,
  } = props;
  const containerRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const domainStateRef = React.useRef<
    WorkbenchStableNumericDomainStateV3 | null
  >(null);
  const [hoveredLegendSelection, setHoveredLegendSelection] =
    React.useState<WorkbenchChartLegendSelectionV3 | null>(null);
  const [hiddenLegendSelections, setHiddenLegendSelections] =
    React.useState<readonly WorkbenchChartLegendSelectionV3[]>([]);
  const legendSelection = hoveredLegendSelection;
  const traces = useStableWorkbenchWaveformTracesV3(props.traces);
  const activeScenarioId = props.activeScenarioId;
  const legendModel = React.useMemo(
    () => buildWorkbenchTraceLegendModelV3(traces.map((trace) => ({
      traceKey: workbenchTraceLegendKeyV3(trace.scenarioId, trace.outputId),
      scenarioId: trace.scenarioId,
      scenarioLabel: trace.scenarioLabel,
      itemId: trace.outputId,
      itemLabel: trace.signalLabel,
      ...(trace.signalDescription === undefined
        ? {}
        : { itemDescription: trace.signalDescription }),
      ...(trace.signalDescriptionLabel === undefined
        ? {}
        : { itemDescriptionLabel: trace.signalDescriptionLabel }),
      color: trace.signalColor,
    }))),
    [traces],
  );
  const orderedTraces = React.useMemo(
    () => traces.map((trace) => Object.freeze({
      trace,
      orderedSamples: orderedFiniteWorkbenchSamplesV3(trace.samples),
    })),
    [traces],
  );
  const domainIdentity = traces
    .map(({ outputId, scenarioId }) => `${scenarioId}:${outputId}`)
    .join("\u001f")
    + `\u001e${unitLabel ?? ""}\u001e${includeZero}\u001e${windowSec}`;

  React.useEffect(() => {
    domainStateRef.current = null;
    setHoveredLegendSelection(null);
    setHiddenLegendSelections([]);
  }, [domainIdentity]);

  const domainCommitKey = React.useMemo(
    () => waveformStableDomainCommitKeyV3(orderedTraces),
    [orderedTraces],
  );
  const resolvedAxisTitle = waveformAxisTitleV3(axisLabel, unitLabel);

  const draw = React.useCallback((
    context: CanvasRenderingContext2D,
    width: number,
    height: number,
  ) => {
    const theme = readCanvasThemeV3(containerRef.current);
    const plot = waveformPlotRectV3(width, height);
    const projectedTraces = orderedTraces.map((item) => Object.freeze({
      ...item,
      segments: buildSweepingWaveformSegmentsFromOrderedV3(
        item.orderedSamples,
        item.trace.outputId,
        { windowSec },
      ),
      head: latestSweepingWaveformPointFromOrderedV3(
        item.orderedSamples,
        item.trace.outputId,
        windowSec,
      ),
    }));
    const allValues: number[] = [];
    for (const { segments, trace } of projectedTraces) {
      const descriptor = waveformLegendDescriptorV3(trace);
      if (workbenchLegendTraceHiddenV3(hiddenLegendSelections, descriptor)) {
        continue;
      }
      for (const segment of segments) {
        for (const point of segment) {
          allValues.push(point.value);
        }
      }
    }
    domainStateRef.current = nextStableNumericDomainStateV3(
      domainStateRef.current,
      allValues,
      {
        includeZero,
        softZeroFloor: unitLabel?.trim().toLowerCase() === "mmhg",
        softZeroSpanFraction: 0.25,
        lowerPaddingFraction: 0.04,
        upperPaddingFraction: 0.12,
        minimumUpperPadding:
          unitLabel?.trim().toLowerCase() === "mmhg" ? 3 : 0,
        commitKey: domainCommitKey,
      },
    );
    const domain = workbenchManualChartDomainV3(domainStateRef.current.domain, props.axisRanges?.y);
    if (canvasRef.current) {
      canvasRef.current.dataset.yMinimum = String(domain[0]);
      canvasRef.current.dataset.yMaximum = String(domain[1]);
    }
    drawWaveformAxesV3(
      context,
      plot,
      domain,
      windowSec,
      resolvedAxisTitle,
      theme,
    );
    const x = (phaseSec: number) => scaleLinearV3(
      phaseSec,
      0,
      windowSec,
      plot.left,
      plot.right,
    );
    const y = (value: number) => scaleLinearV3(
      value,
      domain[0],
      domain[1],
      plot.bottom,
      plot.top,
    );

    // Put the focused series on top even when several Scenarios coincide.
    const drawingOrder = [...projectedTraces].sort((a, b) =>
      workbenchLegendTraceAlphaV3(legendSelection, waveformLegendDescriptorV3(a.trace))
      - workbenchLegendTraceAlphaV3(legendSelection, waveformLegendDescriptorV3(b.trace)));
    for (const { head, segments, trace } of drawingOrder) {
      const legendDescriptor = waveformLegendDescriptorV3(trace);
      if (workbenchLegendTraceHiddenV3(
        hiddenLegendSelections,
        legendDescriptor,
      )) continue;
      const traceAlpha = workbenchLegendTraceAlphaV3(
        legendSelection,
        legendDescriptor,
      );
      context.save();
      context.strokeStyle = trace.signalColor;
      context.lineJoin = "round";
      context.lineCap = "round";
      context.setLineDash([]);
      context.globalAlpha = traceAlpha;
      context.lineWidth = 1.6;
      for (const segment of segments) {
        if (segment.length === 0) continue;
        context.beginPath();
        coalesceSweepingWaveformDisplaySegmentV3(segment, x).forEach((point, index) => {
          if (index === 0) context.moveTo(x(point.phaseSec), y(point.value));
          else context.lineTo(x(point.phaseSec), y(point.value));
        });
        context.stroke();
      }
      context.restore();
      if (head !== null) {
        drawWorkbenchLeadingCapV3(
          context,
          x(head.phaseSec),
          y(head.value),
          trace.signalColor,
          theme.canvas,
          traceAlpha,
        );
      }
    }
  }, [
    domainCommitKey,
    props.axisRanges,
    hiddenLegendSelections,
    includeZero,
    legendSelection,
    orderedTraces,
    resolvedAxisTitle,
    unitLabel,
    windowSec,
  ]);

  useResponsiveCanvasFrameV3(
    containerRef,
    canvasRef,
    draw,
    "sweeping-waveform",
  );

  return (
    <div
      className={`flex min-h-48 h-full w-full flex-col overflow-hidden ${className ?? ""}`}
      data-chart-kind="sweeping-waveform-v3"
      data-active-scenario-id={activeScenarioId}
      data-time-window-sec={windowSec}
    >
      <WorkbenchChartLegendV3
        actions={props.legendActions}
        hiddenSelections={hiddenLegendSelections}
        model={legendModel}
        selection={legendSelection}
        onHoverSelection={setHoveredLegendSelection}
        onToggleVisibility={(selection) =>
          setHiddenLegendSelections((current) =>
            current.some((candidate) =>
              legendSelectionKeyV3(candidate) === legendSelectionKeyV3(selection))
              ? current.filter((candidate) =>
                  legendSelectionKeyV3(candidate) !== legendSelectionKeyV3(selection))
              : Object.freeze([...current, selection]))}
      />
      <div ref={containerRef} className="relative min-h-0 flex-1 overflow-hidden">
        <canvas
          ref={canvasRef}
          className="block h-full w-full"
          role="img"
          aria-label={`Sweeping waveform, ${windowSec} second window`}
        />
      </div>
    </div>
  );
}

/** Retains descriptor identity across unrelated Workbench root renders. */
function useStableWorkbenchWaveformTracesV3(
  next: readonly WorkbenchWaveformTraceV3[],
): readonly WorkbenchWaveformTraceV3[] {
  const currentRef = React.useRef<readonly WorkbenchWaveformTraceV3[]>(next);
  const current = currentRef.current;
  if (
    current.length !== next.length
    || current.some((trace, index) =>
      !sameWorkbenchWaveformTraceV3(trace, next[index]!))
  ) {
    currentRef.current = next;
  }
  return currentRef.current;
}

function sameWorkbenchWaveformTraceV3(
  left: WorkbenchWaveformTraceV3,
  right: WorkbenchWaveformTraceV3,
): boolean {
  return left.scenarioId === right.scenarioId
    && left.scenarioLabel === right.scenarioLabel
    && left.scenarioStatus === right.scenarioStatus
    && left.scenarioColor === right.scenarioColor
    && left.scenarioStyleIndex === right.scenarioStyleIndex
    && left.samples === right.samples
    && left.outputId === right.outputId
    && left.signalLabel === right.signalLabel
    && left.signalDescription === right.signalDescription
    && left.signalDescriptionLabel === right.signalDescriptionLabel
    && left.signalColor === right.signalColor
    && left.cyclePhaseOutputId === right.cyclePhaseOutputId;
}

function waveformLegendDescriptorV3(trace: WorkbenchWaveformTraceV3) {
  return Object.freeze({
    traceKey: workbenchTraceLegendKeyV3(trace.scenarioId, trace.outputId),
    scenarioId: trace.scenarioId,
    scenarioLabel: trace.scenarioLabel,
    itemId: trace.outputId,
    itemLabel: trace.signalLabel,
    ...(trace.signalDescription === undefined
      ? {}
      : { itemDescription: trace.signalDescription }),
    ...(trace.signalDescriptionLabel === undefined
      ? {}
      : { itemDescriptionLabel: trace.signalDescriptionLabel }),
    color: trace.signalColor,
  });
}

function waveformStableDomainCommitKeyV3(
  traces: readonly Readonly<{
    trace: WorkbenchWaveformTraceV3;
    orderedSamples: readonly WorkbenchScalarSampleV3[];
  }>[],
): string | null {
  const seenScenarioIds = new Set<string>();
  const keys: string[] = [];
  for (const { trace, orderedSamples } of traces) {
    if (seenScenarioIds.has(trace.scenarioId)) continue;
    seenScenarioIds.add(trace.scenarioId);
    const key = latestWaveformDomainCommitKeyV3(
      orderedSamples,
      trace.cyclePhaseOutputId,
    );
    if (key !== null) keys.push(`${trace.scenarioId}:${key}`);
  }
  return keys.length === 0 ? null : keys.join("\u001f");
}

function latestWaveformDomainCommitKeyV3(
  samples: readonly WorkbenchScalarSampleV3[],
  cyclePhaseOutputId: string | undefined,
): string | null {
  const latest = samples.at(-1);
  if (latest === undefined) return null;
  if (cyclePhaseOutputId !== undefined) {
    let previousPhase: number | null = null;
    let latestBoundary: WorkbenchScalarSampleV3 | null = null;
    for (const sample of samples) {
      const value = finiteWorkbenchScalarValueV3(sample, cyclePhaseOutputId);
      const phase = value === null ? null : positiveModuloV3(value, 1);
      if (
        phase !== null
        && previousPhase !== null
        && phase + WAVEFORM_EPSILON_V3 < previousPhase
      ) {
        latestBoundary = sample;
      }
      previousPhase = phase;
    }
    if (latestBoundary !== null) {
      return `cycle:${latestBoundary.inputEpoch}:${latestBoundary.acceptedRevision}`;
    }
  }
  // Models without a cycle source still receive a quiet semantic cadence.
  return `time:${Math.floor(latest.presentationTimeSec / 0.75)}`;
}

function legendSelectionKeyV3(
  selection: WorkbenchChartLegendSelectionV3 | null,
): string | null {
  if (selection === null) return null;
  if (selection.kind === "scenario") return `scenario:${selection.scenarioId}`;
  if (selection.kind === "item") return `item:${selection.itemId}`;
  return `trace:${selection.traceKey}`;
}

type CanvasPlotRectV3 = Readonly<{
  left: number;
  right: number;
  top: number;
  bottom: number;
}>;

type CanvasThemeV3 = Readonly<{
  canvas: string;
  grid: string;
  axis: string;
  text: string;
  font: string;
}>;

function waveformPlotRectV3(
  width: number,
  height: number,
): CanvasPlotRectV3 {
  const left = Math.min(62, width * 0.27);
  const top = Math.min(12, height * 0.08);
  return Object.freeze({
    left,
    right: Math.max(left + 1, width - 12),
    top,
    bottom: Math.max(top + 1, height - 28),
  });
}

function drawWaveformAxesV3(
  context: CanvasRenderingContext2D,
  plot: CanvasPlotRectV3,
  domain: WorkbenchNumericDomainV3,
  windowSec: number,
  axisTitle: string | undefined,
  theme: CanvasThemeV3,
): void {
  context.save();
  context.font = theme.font;
  context.fillStyle = theme.text;
  context.strokeStyle = theme.grid;
  context.lineWidth = 1;
  for (const value of numericTicksV3(domain, 4)) {
    const y = scaleLinearV3(
      value,
      domain[0],
      domain[1],
      plot.bottom,
      plot.top,
    );
    context.beginPath();
    context.moveTo(plot.left, y);
    context.lineTo(plot.right, y);
    context.stroke();
    context.textAlign = "right";
    context.textBaseline = "middle";
    context.fillText(formatAxisNumberV3(value), plot.left - 6, y);
  }
  for (let ordinal = 0; ordinal <= 4; ordinal += 1) {
    const ratio = ordinal / 4;
    const x = plot.left + ratio * (plot.right - plot.left);
    context.beginPath();
    context.moveTo(x, plot.top);
    context.lineTo(x, plot.bottom);
    context.stroke();
    context.textAlign = "center";
    context.textBaseline = "top";
    context.fillText(
      `${formatAxisNumberV3(ratio * windowSec)} s`,
      x,
      plot.bottom + 7,
    );
  }
  context.strokeStyle = theme.axis;
  context.strokeRect(
    plot.left,
    plot.top,
    plot.right - plot.left,
    plot.bottom - plot.top,
  );
  if (axisTitle) {
    context.save();
    context.translate(Math.max(9, plot.left - 48), (plot.top + plot.bottom) / 2);
    context.rotate(-Math.PI / 2);
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(axisTitle, 0, 0);
    context.restore();
  }
  context.restore();
}

function waveformAxisTitleV3(
  axisLabel: string | undefined,
  unitLabel: string | undefined,
): string | undefined {
  const explicit = axisLabel?.trim();
  const unit = unitLabel?.trim();
  if (explicit) return unit ? `${explicit} (${unit})` : explicit;
  if (!unit) return undefined;
  const normalized = unit.toLowerCase();
  if (normalized === "mmhg") return `Pressure (${unit})`;
  if (normalized === "ml" || normalized === "l") return `Volume (${unit})`;
  if (normalized.includes("/s") || normalized.includes("/min")) {
    return `Flow (${unit})`;
  }
  return unit;
}

function readCanvasThemeV3(element: HTMLElement | null): CanvasThemeV3 {
  const [canvas, grid, axis, text, font] =
    readWorkbenchCanvasThemeVariablesV3(element, [
      ["--wb-canvas-bg", "#0a141d"],
      ["--wb-grid", "rgba(165, 185, 200, 0.10)"],
      ["--wb-axis", "rgba(165, 185, 200, 0.32)"],
      ["--wb-text-muted", "#94a3b8"],
      ["--wb-chart-font", "10px ui-monospace, SFMono-Regular, Menlo, monospace"],
    ]);
  return Object.freeze({
    canvas: canvas!,
    grid: grid!,
    axis: axis!,
    text: text!,
    font: font!,
  });
}

function formatAxisNumberV3(value: number): string {
  if (Math.abs(value - Math.round(value)) < 1e-9) {
    return Math.round(value).toString();
  }
  const magnitude = Math.abs(value);
  if (magnitude >= 100) return value.toFixed(0);
  if (magnitude >= 10) return value.toFixed(1);
  if (magnitude >= 1) return value.toFixed(1);
  return value.toFixed(2);
}

function clampV3(value: number, minimum: number, maximum: number): number {
  if (!Number.isFinite(value)) return minimum;
  return Math.max(minimum, Math.min(maximum, value));
}

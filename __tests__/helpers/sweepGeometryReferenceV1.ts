/** Former whole-window projector retained only as a test oracle for the new
 * incremental renderer. It is not a shipped presentation implementation. */
import { isWorkbenchPresentationSampleV3 } from "@/components/workbench/presentation/WorkbenchPresentationSampleBufferV3";
import { firstSampleAtOrAfterV3, finiteWorkbenchScalarValueV3, orderedFiniteWorkbenchSamplesV3, type WorkbenchScalarSampleV3 } from "@/components/workbench/presentation/WorkbenchScalarSampleV3";
import { waveformSourcePointsV3, positiveModuloV3, phaseIsInsideForwardSweepGapV3, WORKBENCH_SWEEP_FORWARD_GAP_FRACTION_V3,
  type SweepingWaveformPointV3, type SweepingWaveformSegmentV3 } from "@/components/workbench/presentation/sweep/SweepWaveformGeometryV1";
const WAVEFORM_EPSILON_V3 = 1e-9;

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


function clampV3(value: number, minimum: number, maximum: number): number {
  return Number.isFinite(value) ? Math.max(minimum, Math.min(maximum, value)) : minimum;
}

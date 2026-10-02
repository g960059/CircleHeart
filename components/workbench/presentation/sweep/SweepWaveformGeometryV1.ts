import { isWorkbenchPresentationSampleV3 } from "../WorkbenchPresentationSampleBufferV3";
import { finiteWorkbenchScalarValueV3, type WorkbenchScalarSampleV3 } from "../WorkbenchScalarSampleV3";

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

/**
 * Expands one bounded presentation bucket into its causally ordered
 * first/min/max/last samples. This preserves sharp accepted-step features in
 * the main polyline without a separate min/max whisker layer or an unbounded
 * 2 ms UI trace.
 */
export function waveformSourcePointsV3(
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

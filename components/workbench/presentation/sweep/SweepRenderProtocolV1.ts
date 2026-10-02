import type { WorkbenchScalarSampleV3 } from "../WorkbenchScalarSampleV3";
import { orderedFiniteWorkbenchSamplesV3 } from "../WorkbenchScalarSampleV3";
import { waveformSourcePointsV3 } from "./SweepWaveformGeometryV1";

export const SWEEP_ROW_WIDTH_V1 = 13;
export const SWEEP_MAXIMUM_ROWS_V1 = 8192;
export const SWEEP_MAXIMUM_TRACES_V1 = 128;
/** Visual series may share an output binding; their renderer ownership must not. */
export function sweepTraceIdentityV1(scenarioId: string, outputId: string, ordinal: number): string {
  return JSON.stringify([scenarioId, outputId, ordinal]);
}
export type SweepRenderThemeV1 = Readonly<{ canvas: string; grid: string; axis: string; text: string; font: string }>;
export type SweepTraceInputV1 = Readonly<{ id: string; samples: readonly WorkbenchScalarSampleV3[];
  outputId: string; cyclePhaseOutputId?: string; color: string; alpha: number; hidden: boolean }>;
export type SweepTraceDeltaV1 = Readonly<{ id: string; color: string; alpha: number; hidden: boolean;
  baseLength: number; removePrefix: number; retainCount: number; rows: Float64Array }>;
export type SweepRenderFrameV1 = Readonly<{ sequence: number; identity: string; width: number; height: number;
  pixelRatio: number; windowSec: number; includeZero: boolean; pressureAxis: boolean; axisTitle?: string;
  manualDomain?: readonly [number, number]; theme: SweepRenderThemeV1; traces: readonly SweepTraceDeltaV1[] }>;
export type SweepRenderResultV1 = Readonly<{ sequence: number; domain: readonly [number, number];
  prepareMs: number; drawMs: number; pointCount: number }>;
export type SweepRowV1 = Readonly<{ time: number; epoch: number; revision: number; cycle: number;
  points: readonly Readonly<{ time: number; value: number }>[] }>;

/** Only new/replaced buckets cross the rendering boundary. Unchanged interior
 * observations are identity checked; mutable/accessor-backed previews reset. */
export class SweepDeltaEncoderV1 {
  #previous = new Map<string, { samples: readonly WorkbenchScalarSampleV3[]; length: number; binding: string }>();
  readonly #immutable = new WeakSet<object>();
  reset(): void { this.#previous.clear(); }
  #plainFrozen(value: object): boolean {
    if (this.#immutable.has(value)) return true;
    if (!Object.isFrozen(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) return false;
    for (const descriptor of Object.values(Object.getOwnPropertyDescriptors(value))) {
      if (!("value" in descriptor)) return false;
      if (descriptor.value !== null && typeof descriptor.value === "object" && !this.#plainFrozen(descriptor.value)) return false;
    }
    this.#immutable.add(value); return true;
  }
  encode(traces: readonly SweepTraceInputV1[]): readonly SweepTraceDeltaV1[] {
    if (traces.length > SWEEP_MAXIMUM_TRACES_V1) throw new Error("Too many sweep traces");
    const next = new Map<string, { samples: readonly WorkbenchScalarSampleV3[]; length: number; binding: string }>();
    const deltas = traces.map(trace => {
      if (next.has(trace.id)) throw new Error("Duplicate sweep trace");
      const samples = orderedFiniteWorkbenchSamplesV3(trace.samples).slice(-SWEEP_MAXIMUM_ROWS_V1);
      const prior = this.#previous.get(trace.id);
      const binding = JSON.stringify([trace.outputId, trace.cyclePhaseOutputId]);
      const previous = prior?.binding === binding ? prior.samples : [];
      const baseLength = prior?.length ?? 0;
      let removePrefix = baseLength, retainCount = 0;
      if (samples.length > 0) {
        const found = previous.indexOf(samples[0]!);
        if (found >= 0) {
          removePrefix = found;
          while (retainCount < samples.length && removePrefix + retainCount < previous.length
            && samples[retainCount] === previous[removePrefix + retainCount]) retainCount++;
        }
      }
      const rows = new Float64Array((samples.length - retainCount) * SWEEP_ROW_WIDTH_V1);
      for (let index = retainCount; index < samples.length; index++) {
        const sample = samples[index]!, at = (index - retainCount) * SWEEP_ROW_WIDTH_V1;
        const points = waveformSourcePointsV3(sample, trace.outputId);
        rows[at] = sample.presentationTimeSec; rows[at + 1] = sample.inputEpoch; rows[at + 2] = sample.acceptedRevision;
        rows[at + 3] = trace.cyclePhaseOutputId ? sample.values[trace.cyclePhaseOutputId] ?? NaN : NaN;
        rows[at + 4] = points.length;
        points.forEach((point, offset) => { rows[at + 5 + offset * 2] = point.presentationTimeSec; rows[at + 6 + offset * 2] = point.value; });
      }
      // Bound proof storage through WeakSet; externally mutable input never
      // earns a delta against an observation which could have changed in place.
      next.set(trace.id, { samples: samples.every(sample => this.#plainFrozen(sample)) ? samples : [], length: samples.length, binding });
      return { id: trace.id, color: trace.color, alpha: trace.alpha, hidden: trace.hidden,
        baseLength, removePrefix, retainCount, rows };
    });
    this.#previous = next;
    return deltas;
  }
}

export function decodeSweepRowsV1(rows: Float64Array): readonly SweepRowV1[] {
  if (!(rows instanceof Float64Array) || rows.length % SWEEP_ROW_WIDTH_V1 !== 0
    || rows.length > SWEEP_ROW_WIDTH_V1 * SWEEP_MAXIMUM_ROWS_V1) throw new Error("Invalid sweep row matrix");
  const result: SweepRowV1[] = [];
  for (let at = 0; at < rows.length; at += SWEEP_ROW_WIDTH_V1) {
    const time = rows[at]!, epoch = rows[at + 1]!, revision = rows[at + 2]!, cycle = rows[at + 3]!, count = rows[at + 4]!;
    if (!Number.isFinite(time) || !Number.isSafeInteger(epoch) || epoch < 0 || !Number.isSafeInteger(revision) || revision < 0
      || (!Number.isFinite(cycle) && !Number.isNaN(cycle)) || !Number.isInteger(count) || count < 0 || count > 4) throw new Error("Invalid sweep row");
    const points: { time: number; value: number }[] = [];
    for (let i = 0; i < count; i++) {
      const pointTime = rows[at + 5 + i * 2]!, value = rows[at + 6 + i * 2]!;
      if (!Number.isFinite(pointTime) || !Number.isFinite(value) || pointTime > time + 1e-9
        || (i > 0 && pointTime < points[i - 1]!.time)) throw new Error("Invalid sweep point ordering");
      points.push({ time: pointTime, value });
    }
    result.push({ time, epoch, revision, cycle, points });
  }
  return result;
}

export function sweepFrameTransferablesV1(frame: SweepRenderFrameV1): ArrayBuffer[] {
  return frame.traces.map(trace => trace.rows.buffer as ArrayBuffer);
}

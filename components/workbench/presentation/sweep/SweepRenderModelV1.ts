import { nextStableNumericDomainStateV3, numericTicksV3, type WorkbenchStableNumericDomainStateV3 } from "../WorkbenchStableChartDomainV3";
import { decodeSweepRowsV1, SWEEP_MAXIMUM_ROWS_V1, SWEEP_MAXIMUM_TRACES_V1,
  type SweepRenderFrameV1, type SweepRenderResultV1, type SweepRenderThemeV1, type SweepRowV1 } from "./SweepRenderProtocolV1";
import { positiveModuloV3, phaseIsInsideForwardSweepGapV3, coalesceSweepingWaveformDisplaySegmentV3, WORKBENCH_SWEEP_FORWARD_GAP_FRACTION_V3,
  type SweepingWaveformSegmentV3 } from "./SweepWaveformGeometryV1";

type Context = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
type Chunk = { rows: readonly SweepRowV1[]; predecessor?: SweepRowV1; pathKey?: string; path?: Path2D;
  low: number; high: number; firstPointTime: number; lastPointTime: number; pointCount: number; lastBoundary?: SweepRowV1 };
type TraceState = { rows: readonly SweepRowV1[]; chunks: readonly Chunk[] };
const CHUNK_ROWS = 64;
const EPSILON = 1e-9;

/** DOM-free, presentation-only owner. Both backends consume exactly the same
 * bounded rows, axis controller, path cache and drawing commands. */
export class SweepRenderModelV1 {
  #sequence = 0;
  #identity = "";
  #traces = new Map<string, TraceState>();
  #domain: WorkbenchStableNumericDomainStateV3 | null = null;
  #frame: SweepRenderFrameV1 | undefined;
  #axes?: { key: string; canvas: OffscreenCanvas | HTMLCanvasElement };
  get sequence(): number { return this.#sequence; }
  get retainedRowCount(): number { return [...this.#traces.values()].reduce((sum, trace) => sum + trace.rows.length, 0); }
  apply(frame: SweepRenderFrameV1): boolean {
    if (!Number.isSafeInteger(frame.sequence) || frame.sequence < 1) throw new Error("Invalid sweep sequence");
    if (frame.sequence <= this.#sequence) return false;
    if (!Number.isFinite(frame.windowSec) || frame.windowSec <= 0 || frame.windowSec > 120
      || !Number.isFinite(frame.width) || frame.width < 1 || frame.width > 16384
      || !Number.isFinite(frame.height) || frame.height < 1 || frame.height > 16384
      || !Number.isFinite(frame.pixelRatio) || frame.pixelRatio < 1 || frame.pixelRatio > 2
      || frame.traces.length > SWEEP_MAXIMUM_TRACES_V1) throw new Error("Invalid sweep dimensions");
    if (frame.manualDomain && (!frame.manualDomain.every(Number.isFinite) || frame.manualDomain[1] <= frame.manualDomain[0])) throw new Error("Invalid sweep domain");
    const next = new Map<string, TraceState>();
    for (const delta of frame.traces) {
      if (next.has(delta.id) || typeof delta.id !== "string" || typeof delta.color !== "string"
        || !Number.isFinite(delta.alpha) || delta.alpha < 0 || delta.alpha > 1) throw new Error("Invalid sweep trace");
      const prior = this.#traces.get(delta.id);
      const previousRows = prior?.rows ?? [];
      if (!Number.isSafeInteger(delta.baseLength) || !Number.isSafeInteger(delta.removePrefix) || !Number.isSafeInteger(delta.retainCount)
        || delta.baseLength !== previousRows.length || delta.removePrefix < 0 || delta.retainCount < 0
        || delta.removePrefix + delta.retainCount > previousRows.length) throw new Error("Sweep delta does not match retained prefix");
      const rows = [...previousRows.slice(delta.removePrefix, delta.removePrefix + delta.retainCount), ...decodeSweepRowsV1(delta.rows)];
      if (rows.length > SWEEP_MAXIMUM_ROWS_V1) throw new Error("Sweep history exceeds its bound");
      for (let i = 1; i < rows.length; i++) {
        // Epoch IDs belong to each exact runtime. A duplicated Scenario keeps
        // visual history while its new runtime may restart its epoch at zero.
        // Only the mapped presentation clock is ordered across that boundary.
        if (rows[i]!.time < rows[i - 1]!.time) throw new Error("Sweep clock reversed");
      }
      const lookup = new Map(prior?.chunks.map(chunk => [chunk.rows[0]!, chunk]));
      const chunks: Chunk[] = [];
      for (let start = 0; start < rows.length;) {
        const predecessor = rows[start - 1], first = rows[start]!;
        let chunk = lookup.get(first);
        if (chunk && (chunk.predecessor !== predecessor || (chunk.rows.length !== CHUNK_ROWS && start + chunk.rows.length !== rows.length)
          || !chunk.rows.every((row, i) => row === rows[start + i]))) chunk = undefined;
        if (!chunk) {
          let end = Math.min(start + CHUNK_ROWS, rows.length);
          for (let i = start + 1; i < end; i++) if (lookup.get(rows[i]!)?.rows.length === CHUNK_ROWS) { end = i; break; }
          chunk = createChunk(rows.slice(start, end), predecessor);
        }
        chunks.push(chunk); start += chunk.rows.length;
      }
      next.set(delta.id, { rows, chunks });
    }
    // Commit only after every delta validates. Old/reordered deliveries never
    // mutate geometry, and one malformed trace cannot partly advance a pane.
    if (frame.identity !== this.#identity) this.#domain = null;
    this.#identity = frame.identity; this.#sequence = frame.sequence; this.#frame = frame; this.#traces = next;
    return true;
  }

  draw(context: Context): SweepRenderResultV1 {
    const frame = this.#frame;
    if (!frame) throw new Error("Sweep renderer has no frame");
    const started = performance.now(), extent: number[] = [], commitKeys: string[] = [];
    let pointCount = 0;
    for (const trace of frame.traces) {
      const rows = this.#traces.get(trace.id)!.rows, latest = rows.at(-1);
      if (!latest) continue;
      let boundary: SweepRowV1 | undefined;
      const cursor = positiveModuloV3(latest.time, frame.windowSec), oldest = latest.time - frame.windowSec - EPSILON;
      let low = Infinity, high = -Infinity;
      for (const chunk of this.#traces.get(trace.id)!.chunks) {
        if (chunk.lastBoundary) boundary = chunk.lastBoundary;
        if (trace.hidden || chunk.pointCount === 0 || chunk.lastPointTime < oldest) continue;
        // Most completed chunks lie entirely inside one visible phase range.
        // Reuse their bounds/count; only the moving cut and gap need point scans.
        const firstPhase = positiveModuloV3(chunk.firstPointTime, frame.windowSec);
        const lastPhase = positiveModuloV3(chunk.lastPointTime, frame.windowSec);
        const gapStart = cursor, gapEnd = cursor + frame.windowSec * WORKBENCH_SWEEP_FORWARD_GAP_FRACTION_V3;
        const outsideGap = gapEnd < frame.windowSec
          ? lastPhase <= gapStart || firstPhase >= gapEnd
          : firstPhase >= gapEnd - frame.windowSec && lastPhase <= gapStart;
        if (chunk.firstPointTime >= oldest && chunk.lastPointTime - chunk.firstPointTime < frame.windowSec
          && firstPhase <= lastPhase && outsideGap) {
          low = Math.min(low, chunk.low); high = Math.max(high, chunk.high); pointCount += chunk.pointCount;
        } else for (const row of chunk.rows) for (const point of row.points) {
          if (point.time < oldest || phaseIsInsideForwardSweepGapV3(positiveModuloV3(point.time, frame.windowSec), cursor, frame.windowSec * WORKBENCH_SWEEP_FORWARD_GAP_FRACTION_V3, frame.windowSec)) continue;
          low = Math.min(low, point.value); high = Math.max(high, point.value); pointCount++;
        }
      }
      if (Number.isFinite(low)) extent.push(low, high);
      commitKeys.push(`${trace.id}:${boundary ? `${boundary.epoch}:${boundary.revision}` : Math.floor(latest.time / .75)}`);
    }
    this.#domain = nextStableNumericDomainStateV3(this.#domain, extent, {
      includeZero: frame.includeZero, softZeroFloor: frame.pressureAxis, softZeroSpanFraction: .25,
      lowerPaddingFraction: .04, upperPaddingFraction: .12, minimumUpperPadding: frame.pressureAxis ? 3 : 0,
      commitKey: commitKeys.join("\u001f") || null,
    });
    const domain = frame.manualDomain ?? this.#domain.domain;
    const plot = { left: Math.min(62, frame.width * .27), right: 0, top: Math.min(12, frame.height * .08), bottom: 0 };
    plot.right = Math.max(plot.left + 1, frame.width - 12); plot.bottom = Math.max(plot.top + 1, frame.height - 28);
    const x = (phase: number) => plot.left + phase / frame.windowSec * (plot.right - plot.left);
    const y = (value: number) => plot.bottom - (value - domain[0]) / (domain[1] - domain[0]) * (plot.bottom - plot.top);
    const prepareMs = performance.now() - started, drawStarted = performance.now();
    context.setTransform(frame.pixelRatio, 0, 0, frame.pixelRatio, 0, 0);
    context.clearRect(0, 0, frame.width, frame.height);
    const axisKey = JSON.stringify([frame.width, frame.height, frame.pixelRatio, domain, frame.windowSec, frame.axisTitle, frame.theme]);
    if (this.#axes?.key !== axisKey) {
      const layer = typeof OffscreenCanvas === "function" ? new OffscreenCanvas(Math.round(frame.width * frame.pixelRatio), Math.round(frame.height * frame.pixelRatio))
        : typeof document !== "undefined" ? document.createElement("canvas") : undefined;
      if (layer) {
        layer.width = Math.max(1, Math.round(frame.width * frame.pixelRatio)); layer.height = Math.max(1, Math.round(frame.height * frame.pixelRatio));
        const layerContext = layer.getContext("2d") as Context | null;
        if (layerContext) { layerContext.setTransform(frame.pixelRatio, 0, 0, frame.pixelRatio, 0, 0);
          drawAxes(layerContext, plot, domain, frame.windowSec, frame.axisTitle, frame.theme); this.#axes = { key: axisKey, canvas: layer }; }
      }
    }
    if (this.#axes?.key === axisKey) context.drawImage(this.#axes.canvas, 0, 0, frame.width, frame.height);
    else drawAxes(context, plot, domain, frame.windowSec, frame.axisTitle, frame.theme);
    for (const trace of [...frame.traces].sort((a, b) => a.alpha - b.alpha)) {
      if (trace.hidden) continue;
      const state = this.#traces.get(trace.id)!, latest = state.rows.at(-1);
      if (!latest) continue;
      const oldest = latest.time - frame.windowSec - EPSILON, cursor = positiveModuloV3(latest.time, frame.windowSec), gap = frame.windowSec * WORKBENCH_SWEEP_FORWARD_GAP_FRACTION_V3;
      context.save(); context.beginPath();
      if (cursor + gap < frame.windowSec) {
        context.rect(plot.left, plot.top, x(cursor) - plot.left, plot.bottom - plot.top);
        context.rect(x(cursor + gap), plot.top, plot.right - x(cursor + gap), plot.bottom - plot.top);
      } else context.rect(x(cursor + gap - frame.windowSec), plot.top, x(cursor) - x(cursor + gap - frame.windowSec), plot.bottom - plot.top);
      context.clip(); context.strokeStyle = trace.color; context.lineJoin = "round"; context.lineCap = "round";
      context.setLineDash([]); context.globalAlpha = trace.alpha; context.lineWidth = 1.6;
      for (const chunk of state.chunks) {
        if (chunk.rows.at(-1)!.time < oldest) continue;
        // Null-leading buckets do not describe the first rendered point. The
        // cache must follow the earliest finite point anywhere in this chunk,
        // plus the predecessor terminal point which owns its incoming edge.
        const firstRenderedTime = Math.min(chunk.firstPointTime, chunk.predecessor?.points.at(-1)?.time ?? Infinity);
        const clippedOldest = firstRenderedTime < oldest ? oldest : -Infinity;
        const pathKey = `${frame.windowSec}:${frame.width}:${frame.height}:${domain[0]}:${domain[1]}:${clippedOldest}`;
        if (typeof Path2D === "function") {
          if (chunk.pathKey !== pathKey || !chunk.path) {
            const path = new Path2D();
            emitSegments(path, sweepChunkSegmentsV1(chunk.rows, chunk.predecessor, frame.windowSec, oldest), x, y);
            chunk.path = path; chunk.pathKey = pathKey;
          }
          context.stroke(chunk.path);
        } else {
          context.beginPath(); emitSegments(context, sweepChunkSegmentsV1(chunk.rows, chunk.predecessor, frame.windowSec, oldest), x, y); context.stroke();
        }
      }
      context.restore();
      let head: { time: number; value: number } | undefined;
      for (let i = state.rows.length - 1; i >= 0; i--) {
        if (state.rows[i]!.time < oldest) break;
        head = state.rows[i]!.points.at(-1); if (head) break;
      }
      if (head) {
        const px = x(positiveModuloV3(head.time, frame.windowSec)), py = y(head.value);
        context.save(); context.globalAlpha = 1; context.fillStyle = frame.theme.canvas;
        context.beginPath(); context.arc(px, py, 5, 0, Math.PI * 2); context.fill();
        context.globalAlpha = trace.alpha; context.fillStyle = trace.color;
        context.beginPath(); context.arc(px, py, 3.25, 0, Math.PI * 2); context.fill(); context.restore();
      }
    }
    return { sequence: frame.sequence, domain, pointCount, prepareMs, drawMs: performance.now() - drawStarted };
  }
}

/** Every retained point is an original time/value pair. Nulls, epoch changes
 * and phase wraps split strokes, including at cached chunk boundaries. */
export function sweepChunkSegmentsV1(rows: readonly SweepRowV1[], predecessor: SweepRowV1 | undefined,
  windowSec: number, oldest: number): readonly SweepingWaveformSegmentV3[] {
  const segments: { phaseSec: number; value: number }[][] = [];
  let active: { phaseSec: number; value: number }[] = [], previousPhase = -Infinity, previousEpoch = -1;
  const flush = () => { if (active.length) segments.push(active); active = []; };
  for (const row of predecessor ? [predecessor, ...rows] : rows) {
    if (!row.points.length || (previousEpoch !== -1 && previousEpoch !== row.epoch)) flush();
    previousEpoch = row.epoch;
    // Only the predecessor's terminal point owns the incoming inter-bucket edge.
    const points = row === predecessor ? row.points.slice(-1) : row.points;
    for (const point of points) {
      if (point.time < oldest) continue;
      const phaseSec = positiveModuloV3(point.time, windowSec);
      if (phaseSec + EPSILON < previousPhase) flush();
      previousPhase = phaseSec;
      const last = active.at(-1);
      if (!last || Math.abs(last.phaseSec - phaseSec) > EPSILON || Math.abs(last.value - point.value) > EPSILON) active.push({ phaseSec, value: point.value });
    }
  }
  flush(); return segments;
}
function createChunk(rows: readonly SweepRowV1[], predecessor: SweepRowV1 | undefined): Chunk {
  const chunk: Chunk = { rows, predecessor, low: Infinity, high: -Infinity, firstPointTime: Infinity, lastPointTime: -Infinity, pointCount: 0 };
  let previousCycle = predecessor && Number.isFinite(predecessor.cycle) ? positiveModuloV3(predecessor.cycle, 1) : NaN;
  for (const row of rows) {
    const cycle = Number.isFinite(row.cycle) ? positiveModuloV3(row.cycle, 1) : NaN;
    if (Number.isFinite(previousCycle) && Number.isFinite(cycle) && cycle + EPSILON < previousCycle) chunk.lastBoundary = row;
    previousCycle = cycle;
    for (const point of row.points) { chunk.low = Math.min(chunk.low, point.value); chunk.high = Math.max(chunk.high, point.value);
      chunk.firstPointTime = Math.min(chunk.firstPointTime, point.time); chunk.lastPointTime = Math.max(chunk.lastPointTime, point.time); chunk.pointCount++; }
  }
  return chunk;
}

function emitSegments(path: Pick<CanvasRenderingContext2D, "moveTo" | "lineTo"> | Path2D,
  segments: readonly SweepingWaveformSegmentV3[], x: (n: number) => number, y: (n: number) => number): void {
  for (const segment of segments) coalesceSweepingWaveformDisplaySegmentV3(segment, x).forEach((point, i) => {
    if (i === 0) path.moveTo(x(point.phaseSec), y(point.value)); else path.lineTo(x(point.phaseSec), y(point.value));
  });
}
function drawAxes(context: Context, plot: { left: number; right: number; top: number; bottom: number },
  domain: readonly [number, number], windowSec: number, title: string | undefined, theme: SweepRenderThemeV1): void {
  context.save(); context.font = theme.font; context.fillStyle = theme.text; context.strokeStyle = theme.grid; context.lineWidth = 1;
  for (const value of numericTicksV3(domain, 4)) {
    const y = plot.bottom - (value - domain[0]) / (domain[1] - domain[0]) * (plot.bottom - plot.top);
    context.beginPath(); context.moveTo(plot.left, y); context.lineTo(plot.right, y); context.stroke();
    context.textAlign = "right"; context.textBaseline = "middle"; context.fillText(formatAxis(value), plot.left - 6, y);
  }
  for (let ordinal = 0; ordinal <= 4; ordinal++) {
    const ratio = ordinal / 4, x = plot.left + ratio * (plot.right - plot.left);
    context.beginPath(); context.moveTo(x, plot.top); context.lineTo(x, plot.bottom); context.stroke();
    context.textAlign = "center"; context.textBaseline = "top"; context.fillText(`${formatAxis(ratio * windowSec)} s`, x, plot.bottom + 7);
  }
  context.strokeStyle = theme.axis; context.strokeRect(plot.left, plot.top, plot.right - plot.left, plot.bottom - plot.top);
  if (title) { context.save(); context.translate(Math.max(9, plot.left - 48), (plot.top + plot.bottom) / 2); context.rotate(-Math.PI / 2);
    context.textAlign = "center"; context.textBaseline = "middle"; context.fillText(title, 0, 0); context.restore(); }
  context.restore();
}
function formatAxis(value: number): string {
  if (Math.abs(value - Math.round(value)) < 1e-9) return Math.round(value).toString();
  return value.toFixed(Math.abs(value) >= 100 ? 0 : Math.abs(value) >= 1 ? 1 : 2);
}

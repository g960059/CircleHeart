import type { GenericXYGeometryV1 } from "./GenericXYGraphV1";

type XYPointV1 = readonly [number, number];

/** Visit a visual subset without making new coordinate pairs. Consecutive
 * points in one subpixel cell retain both endpoints and both axis extrema,
 * in observation order. Call separately for every discontinuous segment. */
export function forEachGenericXYDisplayPointV1(
  segment: readonly XYPointV1[], projectX: (value: number) => number,
  projectY: (value: number) => number, append: (point: XYPointV1) => void,
): void {
  let first = 0, last = -1, minXIndex = 0, maxXIndex = 0, minYIndex = 0, maxYIndex = 0;
  let cellX = NaN, cellY = NaN, minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  const flush = () => {
    if (last < first) return;
    if ((minXIndex === first || minXIndex === last) && (maxXIndex === first || maxXIndex === last)
      && (minYIndex === first || minYIndex === last) && (maxYIndex === first || maxYIndex === last)) {
      append(segment[first]!); if (last !== first) append(segment[last]!); return;
    }
    const indices = [first, minXIndex, maxXIndex, minYIndex, maxYIndex, last].sort((a, b) => a - b);
    let previous = -1;
    for (const index of indices) {
      if (index === previous) continue;
      append(segment[index]!); previous = index;
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
}

/** Match the SVG axes' default xMidYMid meet viewBox in any dock shape. */
export function genericXYCanvasViewportV1(width: number, height: number) {
  const scale = Math.min(width / 620, height / 375);
  return { scale, offsetX: (width - 620 * scale) / 2, offsetY: (height - 375 * scale) / 2 };
}

export type GenericXYCanvasProjectionV1 = Readonly<{
  scaleX: number; scaleY: number; offsetX: number; offsetY: number; displayScale: number;
}>;

/** Path2D owns retained native geometry, not a copy of scientific history.
 * Unchanged chunks avoid JS coordinate loops and SVG string serialization.
 * Transforming the path (rather than the context) preserves a constant stroke
 * width when the two data axes have different scales. Weak keys bound lifetime
 * to the visible geometry window. There is no state shared with analysis. */
export class GenericXYCanvasPathCacheV1 {
  readonly #chunks = new WeakMap<GenericXYGeometryV1["chunks"][number], Readonly<{
    scaleX: number; scaleY: number; path: Path2D; pointCount: number;
  }>>();

  project(geometry: GenericXYGeometryV1, projection: GenericXYCanvasProjectionV1): Readonly<{ path: Path2D; pointCount: number }> {
    // Round toward finer cells; coalescing never exceeds .75 CSS pixel.
    const cellScale = (scale: number) => 2 ** Math.ceil(Math.log2(Math.abs(scale * projection.displayScale)));
    const scaleX = cellScale(projection.scaleX), scaleY = cellScale(projection.scaleY);
    const path = new Path2D(), transform = new DOMMatrix([
      projection.scaleX, 0, 0, projection.scaleY, projection.offsetX, projection.offsetY,
    ]);
    let pointCount = 0;
    for (const chunk of geometry.chunks) {
      let retained = this.#chunks.get(chunk);
      if (retained?.scaleX !== scaleX || retained.scaleY !== scaleY) {
        const chunkPath = new Path2D();
        let count = 0;
        for (const segment of chunk.segments) {
          let first = true;
          forEachGenericXYDisplayPointV1(segment, x => x * scaleX, y => y * scaleY, point => {
            if (first) chunkPath.moveTo(point[0], point[1]); else chunkPath.lineTo(point[0], point[1]);
            first = false; count++;
          });
        }
        retained = { scaleX, scaleY, path: chunkPath, pointCount: count };
        this.#chunks.set(chunk, retained);
      }
      path.addPath(retained.path, transform);
      pointCount += retained.pointCount;
    }
    return { path, pointCount };
  }
}

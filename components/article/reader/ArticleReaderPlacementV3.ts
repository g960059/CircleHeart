/** Keep viewport selection independent of the numerical Reader bundle. */
export function articleReaderPlacementInReadingAreaV3(
  placements: readonly Readonly<{ id: string; top: number; bottom: number }>[],
  viewport: Readonly<{ top: number; bottom: number }>,
  current: string | null,
): string | null {
  const height = Math.max(0, viewport.bottom - viewport.top);
  const overlap = (top: number, bottom: number, start: number, end: number) => Math.max(0, Math.min(bottom, end) - Math.max(top, start));
  const readingLine = viewport.top + height * 0.2;
  const candidates = placements.map(p => ({ id: p.id,
    visible: overlap(p.top, p.bottom, viewport.top, viewport.bottom),
    distance: Math.max(0, p.top - readingLine, readingLine - p.bottom),
  })).filter(p => p.visible > 0).sort((a, b) => a.distance - b.distance);
  const best = candidates[0];
  if (!best) return null;
  const active = candidates.find(p => p.id === current);
  // Follow where the reader is, not the area a plot occupies: a compact waiting
  // entry must not lose to an already expanded plot farther down the page.
  // Hysteresis prevents alternation around adjacent experiments.
  return active && active.distance - best.distance < 40 ? active.id : best.id;
}

export function articleReaderPlacementAfterViewportExitV3(
  activePlacementId: string | null,
  exitedPlacementId: string,
  remainingVisiblePlacementIds: readonly string[] = [],
): string | null {
  return activePlacementId === exitedPlacementId ? remainingVisiblePlacementIds.at(-1) ?? null : activePlacementId;
}

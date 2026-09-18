/** Keep viewport selection independent of the numerical Reader bundle. */
export function articleReaderPlacementInReadingAreaV3(
  placements: readonly Readonly<{ id: string; top: number; bottom: number }>[],
  viewport: Readonly<{ top: number; bottom: number }>,
  current: string | null,
): string | null {
  const height = Math.max(0, viewport.bottom - viewport.top);
  const overlap = (top: number, bottom: number, start: number, end: number) => Math.max(0, Math.min(bottom, end) - Math.max(top, start));
  const candidates = placements.map(p => ({ id: p.id,
    visible: overlap(p.top, p.bottom, viewport.top, viewport.bottom),
    score: overlap(p.top, p.bottom, viewport.top + height * 0.15, viewport.bottom - height * 0.2)
      + 0.1 * overlap(p.top, p.bottom, viewport.top, viewport.bottom),
  })).filter(p => p.visible > 0).sort((a, b) => b.score - a.score);
  const best = candidates[0];
  if (!best) return null;
  const active = candidates.find(p => p.id === current);
  // Edge overlap cannot monopolize playback; hysteresis prevents alternation
  // around the boundary between two adjacent experiments.
  return active && active.score > 0 && best.score - active.score < 40 ? active.id : best.id;
}

export function articleReaderPlacementAfterViewportExitV3(
  activePlacementId: string | null,
  exitedPlacementId: string,
  remainingVisiblePlacementIds: readonly string[] = [],
): string | null {
  return activePlacementId === exitedPlacementId ? remainingVisiblePlacementIds.at(-1) ?? null : activePlacementId;
}

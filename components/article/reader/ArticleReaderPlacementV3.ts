/** Keep viewport selection independent of the numerical Reader bundle. */
export function articleReaderPlacementInReadingAreaV3(
  placements: readonly Readonly<{ id: string; top: number; bottom: number }>[],
  viewport: Readonly<{ top: number; bottom: number }>,
  current: string | null,
  explicitlyActivated: string | null = null,
): string | null {
  const height = Math.max(0, viewport.bottom - viewport.top);
  const overlap = (top: number, bottom: number, start: number, end: number) => Math.max(0, Math.min(bottom, end) - Math.max(top, start));
  const readingLine = viewport.top + height * 0.2;
  const visible = placements.map(p => ({ id: p.id,
    visible: overlap(p.top, p.bottom, viewport.top, viewport.bottom),
    requiredVisible: Math.min(160, height * 0.25, Math.max(0, p.bottom - p.top) * 0.7),
    distance: Math.max(0, p.top - readingLine, readingLine - p.bottom),
  })).filter(p => p.visible > 0).sort((a, b) => a.distance - b.distance);
  if (visible.some(p => p.id === explicitlyActivated)) return explicitlyActivated;
  // A thin tail of the previous instrument must not hold the live lane while
  // the next one occupies the reading area. Small anchors remain eligible.
  const substantial = visible.filter(p => p.visible >= p.requiredVisible);
  const candidates = substantial.length > 0 ? substantial : visible;
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

/** Presentation pressure only: rAF callbacks measure scheduling opportunities,
 * not compositor FPS. No sample, numerical clock, or model state lives here. */
export class WorkbenchPresentationPressureV3 {
  #multiplier: 1 | 2 = 1;
  #previousMs: number | undefined;
  #windowMs = 0;
  #missedBudgetMs = 0;
  #samples = 0;
  #slowSamples = 0;
  #recoveryMs = 0;

  get multiplier(): 1 | 2 { return this.#multiplier; }

  reset(): void {
    this.#multiplier = 1;
    this.restartObservation();
    this.#recoveryMs = 0;
  }

  /** A pause or visibility transition carries no scheduling-pressure evidence.
   * Retain the chosen quality and already observed recovery, not wall time. */
  restartObservation(): void {
    this.#previousMs = undefined;
    this.#clearWindow();
  }

  observe(nowMs: number, visible = true): void {
    if (!Number.isFinite(nowMs)) return;
    const previousMs = this.#previousMs;
    this.#previousMs = visible ? nowMs : undefined;
    if (visible && previousMs === undefined) return;
    const elapsed = previousMs === undefined ? 0 : nowMs - previousMs;
    // Hidden documents and suspension are not evidence of rendering overload.
    if (!visible || elapsed <= 0 || elapsed > 250) {
      this.#clearWindow(); this.#recoveryMs = 0; return;
    }
    this.#samples++;
    this.#windowMs += elapsed;
    if (elapsed > 25) {
      this.#missedBudgetMs += elapsed - 1_000 / 60;
      this.#slowSamples++;
    }
    if (this.#windowMs < 2_000 || this.#samples < 30) return;
    const pressure = this.#missedBudgetMs / this.#windowMs;
    if (this.#multiplier === 1 && pressure > .15 && this.#slowSamples >= 3) {
      this.#multiplier = 2;
      this.#recoveryMs = 0;
    } else if (this.#multiplier === 2) {
      this.#recoveryMs = pressure < .02 ? this.#recoveryMs + this.#windowMs : 0;
      // Probe 60 Hz again only after ten seconds of sustained headroom.
      if (this.#recoveryMs >= 10_000) {
        this.#multiplier = 1;
        this.#recoveryMs = 0;
      }
    }
    this.#clearWindow();
  }

  #clearWindow(): void {
    this.#windowMs = 0; this.#missedBudgetMs = 0; this.#samples = 0; this.#slowSamples = 0;
  }
}

export type WorkbenchPresentationCadenceV3 = Readonly<{
  start(): void;
  stop(): void;
  multiplier(): 1 | 2;
}>;

/** One lightweight observer per playing group, independent of dev diagnostics.
 * Explicit query overrides exist only for reproducible renderer comparisons. */
export function createWorkbenchPresentationCadenceV3(): WorkbenchPresentationCadenceV3 {
  const pressure = new WorkbenchPresentationPressureV3();
  const forcedMs = typeof location === "undefined" ? null
    : new URLSearchParams(location.search).get("workbenchPresentationMs");
  let frameId: number | undefined;
  let running = false;
  const visibilityChanged = () => pressure.restartObservation();
  const observe = (nowMs: number) => {
    if (!running) return;
    pressure.observe(nowMs, typeof document === "undefined" || document.visibilityState !== "hidden");
    frameId = requestAnimationFrame(observe);
  };
  return {
    start() {
      if (running) return;
      running = true;
      pressure.restartObservation();
      if (typeof document !== "undefined") document.addEventListener("visibilitychange", visibilityChanged);
      if (typeof requestAnimationFrame === "function" && forcedMs !== "16" && forcedMs !== "32") {
        frameId = requestAnimationFrame(observe);
      }
    },
    stop() {
      running = false;
      if (typeof document !== "undefined") document.removeEventListener("visibilitychange", visibilityChanged);
      pressure.restartObservation();
      if (frameId !== undefined) cancelAnimationFrame(frameId);
      frameId = undefined;
    },
    multiplier: () => forcedMs === "32" ? 2 : forcedMs === "16" ? 1 : pressure.multiplier,
  };
}

import React from "react";
import type {
  WorkbenchBackgroundJobHandleV3,
  WorkbenchBackgroundWorkerPoolPortV3,
  WorkbenchForegroundPlaybackStateV3,
} from "@/components/workbench/runtime/WorkbenchBackgroundWorkerPoolV3";

type Owner = {
  count: number;
  playback: WorkbenchForegroundPlaybackStateV3 | null;
  jobs: Set<WorkbenchBackgroundJobHandleV3<unknown>>;
};

/** One article budget, with isolated ownership of each placement's jobs. */
export class ArticleReaderWorkerResourcesV1 {
  readonly #owners = new Set<Owner>();
  #pool: (WorkbenchBackgroundWorkerPoolPortV3 & { dispose(): void }) | null = null;

  // The lazy experiment supplies its factory. An article with no opened
  // experiments must not load numerical Worker dependencies through context.
  acquire(createPool: () => WorkbenchBackgroundWorkerPoolPortV3 & { dispose(): void }):
    WorkbenchBackgroundWorkerPoolPortV3 & { release(): void } {
    const pool = this.#pool ??= createPool();
    const owner: Owner = { count: 0, playback: null, jobs: new Set() };
    this.#owners.add(owner);
    let released = false;
    const port: WorkbenchBackgroundWorkerPoolPortV3 & { release(): void } = {
      setLiveScenarioCount: count => {
        if (released) return;
        if (!Number.isSafeInteger(count) || count < 0 || count > 128) throw new Error("Invalid article Scenario count");
        owner.count = count;
        this.#updateBudget();
      },
      setForegroundPlaybackState: playback => {
        if (released) return;
        owner.playback = playback;
        this.#updateBudget();
      },
      schedule: (priority, operation) => {
        if (released) throw new Error("Article Worker lease is released");
        const handle = pool.schedule(priority, operation);
        owner.jobs.add(handle);
        const remove = () => { owner.jobs.delete(handle); };
        // Two handlers avoid manufacturing an unhandled rejected finally promise.
        void handle.promise.then(remove, remove);
        return handle;
      },
      run: (priority, operation) => port.schedule(priority, operation).promise,
      release: () => {
        if (released) return;
        released = true;
        for (const job of owner.jobs) job.cancel();
        this.#owners.delete(owner);
        if (this.#owners.size === 0) {
          pool.dispose();
          this.#pool = null;
        } else this.#updateBudget();
      },
    };
    return port;
  }

  #updateBudget(): void {
    const pool = this.#pool;
    if (!pool) return;
    const active = [...this.#owners].filter(owner => owner.count > 0);
    const calibrating = active.some(owner => owner.playback === null || owner.playback.calibrating);
    const headroom = active.length === 0 ? null : Math.min(...active.map(owner => {
      const state = owner.playback;
      return state?.maximumRate == null ? 0 : Math.max(0, state.maximumRate - state.playbackRate);
    }));
    // Paused owners cannot overwrite the active placement's calibration or
    // measured headroom. Count all foreground work, including control commits.
    pool.setForegroundPlaybackState({ playbackRate: 1, maximumRate: calibrating ? null : 1 + (headroom ?? 0), calibrating });
    pool.setLiveScenarioCount(Math.min(128, active.reduce((total, owner) => total + owner.count, 0)));
  }
}

const ArticleReaderWorkerResourcesContextV1 = React.createContext<ArticleReaderWorkerResourcesV1 | null>(null);

export function ArticleReaderWorkerResourcesProviderV1({ children }: React.PropsWithChildren) {
  // No Workers are created during render. The last runtime lease disposes the
  // pool, including StrictMode cleanup and delayed continuation captures.
  const [resources] = React.useState(() => new ArticleReaderWorkerResourcesV1());
  return <ArticleReaderWorkerResourcesContextV1.Provider value={resources}>{children}</ArticleReaderWorkerResourcesContextV1.Provider>;
}

export function useArticleReaderWorkerResourcesV1() {
  return React.useContext(ArticleReaderWorkerResourcesContextV1);
}

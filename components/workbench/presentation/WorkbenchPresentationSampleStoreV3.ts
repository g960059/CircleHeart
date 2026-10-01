import React from "react";
import { STUDIO_SWEEP_WINDOW_MAX_SEC_V2 } from "@/studio/contracts/v2/content";
import { WorkbenchCompletedCycleBufferV3, type WorkbenchCompletedCyclesV3 } from "./WorkbenchCompletedCycleBufferV3";

import {
  appendWorkbenchPresentationSamplesV3,
  WORKBENCH_PRESENTATION_BUCKET_SEC_V3,
  WORKBENCH_PRESENTATION_WINDOW_SEC_V3,
  type WorkbenchPresentationBufferOptionsV3,
} from "./WorkbenchPresentationSampleBufferV3";
import {
  appendWorkbenchExactOrbitSamplesV3,
  type WorkbenchExactOrbitBufferOptionsV3,
} from "./WorkbenchExactOrbitSampleBufferV3";
import type {
  WorkbenchAcceptedScalarSampleV3,
  WorkbenchScalarSampleV3,
} from "./WorkbenchScalarSampleV3";
import {
  recordWorkbenchPerformanceDurationV3,
  recordWorkbenchPerformanceEventIntervalV3,
  workbenchPerformanceDiagnosticsEnabledV3,
  workbenchPerformanceNowV3,
} from "../runtime/WorkbenchPerformanceDiagnosticsV3";

const EMPTY_WORKBENCH_PRESENTATION_SAMPLES_V3:
  readonly WorkbenchScalarSampleV3[] = Object.freeze([]);

export type WorkbenchScenarioPresentationSamplesV3 = Readonly<
  Record<string, readonly WorkbenchScalarSampleV3[]>
>;

export type WorkbenchOrbitHistoryEpochV3 = Readonly<{
  inputEpoch: number;
  sourceAcceptedRevision: number;
  sourceAcceptedTimeSec: number;
  samples: readonly WorkbenchScalarSampleV3[];
  completedCycles?: WorkbenchCompletedCyclesV3;
  currentCycleSamples?: readonly WorkbenchScalarSampleV3[];
  sourceCyclePosition?: number;
}>;

const EMPTY_WORKBENCH_ORBIT_HISTORY_V3:
  readonly WorkbenchOrbitHistoryEpochV3[] = Object.freeze([]);

export type WorkbenchScenarioOrbitHistoryV3 = Readonly<
  Record<string, readonly WorkbenchOrbitHistoryEpochV3[]>
>;

export type WorkbenchSweepPresentationSnapshotV3 = Readonly<{
  renderer: "sweep";
  samplesByScenarioId: WorkbenchScenarioPresentationSamplesV3;
}>;

export type WorkbenchPressureVolumePresentationSnapshotV3 = Readonly<{
  renderer: "pressure-volume";
  exactOrbitSamplesByScenarioId: WorkbenchScenarioPresentationSamplesV3;
  orbitHistoryByScenarioId: WorkbenchScenarioOrbitHistoryV3;
  completedCyclesByScenarioId: Readonly<Record<string, WorkbenchCompletedCyclesV3>>;
  currentCycleSamplesByScenarioId: WorkbenchScenarioPresentationSamplesV3;
  cyclePositionByScenarioId: Readonly<Record<string, number>>;
}>;

export type WorkbenchSampledGraphPresentationSnapshotV3 =
  | WorkbenchSweepPresentationSnapshotV3
  | WorkbenchPressureVolumePresentationSnapshotV3;

export const WORKBENCH_PRESENTATION_HISTORY_MAX_DEPTH_V3 = 3;

type WorkbenchScenarioPresentationClockV3 = Readonly<{
  inputEpoch: number;
  acceptedTimeSec: number;
  presentationTimeSec: number;
  offsetSec: number;
}>;

export type WorkbenchScenarioPresentationStoreOptionsV3 =
  WorkbenchPresentationBufferOptionsV3 & Readonly<{
    exactOrbitWindowSec?: number;
    exactOrbitCapacity?: number;
  }>;

/**
 * Presentation-only cache for every Scenario currently available to graph
 * panes. Each Scenario owns an independently bounded sample window. The cache
 * never changes the exact accepted sample selected as a bucket terminal state
 * and is not a checkpoint, metric, or scientific evidence source.
 */
export class WorkbenchScenarioPresentationSampleStoreV3 {
  #options: WorkbenchPresentationBufferOptionsV3;
  #exactOrbitOptions: WorkbenchExactOrbitBufferOptionsV3;
  readonly #sweepListeners = new Set<() => void>();
  readonly #pressureVolumeListeners = new Set<() => void>();
  readonly #clocks = new Map<string, WorkbenchScenarioPresentationClockV3>();
  #cyclePhaseOutputId: string | undefined;
  readonly #cycleBuffers = new Map<string, WorkbenchCompletedCycleBufferV3>();
  #samplesByScenarioId: WorkbenchScenarioPresentationSamplesV3 =
    emptyScenarioPresentationSnapshotV3();
  #exactOrbitSamplesByScenarioId: WorkbenchScenarioPresentationSamplesV3 =
    emptyScenarioPresentationSnapshotV3();
  #orbitHistoryByScenarioId: WorkbenchScenarioOrbitHistoryV3 =
    emptyScenarioOrbitHistorySnapshotV3();
  #sweepSnapshot: WorkbenchSweepPresentationSnapshotV3 = Object.freeze({
    renderer: "sweep",
    samplesByScenarioId: this.#samplesByScenarioId,
  });
  #pressureVolumeSnapshot: WorkbenchPressureVolumePresentationSnapshotV3 =
    Object.freeze({
      renderer: "pressure-volume",
      exactOrbitSamplesByScenarioId: this.#exactOrbitSamplesByScenarioId,
      orbitHistoryByScenarioId: this.#orbitHistoryByScenarioId,
      completedCyclesByScenarioId: Object.freeze({}),
      currentCycleSamplesByScenarioId: Object.freeze({}),
      cyclePositionByScenarioId: Object.freeze({}),
    });

  constructor(options: WorkbenchScenarioPresentationStoreOptionsV3 = {}) {
    const {
      exactOrbitCapacity,
      exactOrbitWindowSec,
      ...sweepOptions
    } = options;
    this.#options = Object.freeze(sweepOptions);
    this.#exactOrbitOptions = Object.freeze({
      ...(exactOrbitCapacity === undefined
        ? {}
        : { capacity: exactOrbitCapacity }),
      ...(exactOrbitWindowSec === undefined
        ? {}
        : { windowSec: exactOrbitWindowSec }),
    });
  }

  /** A respiratory XY orbit may span longer than a cardiac cycle. */
  ensureExactOrbitWindowSec(seconds: number): void {
    if (!Number.isFinite(seconds) || seconds <= 0 || seconds > 30) return;
    this.#exactOrbitOptions = Object.freeze({ windowSec: Math.max(seconds, this.#exactOrbitOptions.windowSec ?? 4),
      capacity: Math.max(Math.ceil(seconds / .002) + 24, this.#exactOrbitOptions.capacity ?? 2048) });
  }

  /** The Model Surface supplies the phase identity; never infer it from a name. */
  setCyclePhaseOutputId(outputId: string | undefined): void {
    if (this.#cyclePhaseOutputId === outputId) return;
    this.#cyclePhaseOutputId = outputId;
    this.#cycleBuffers.clear();
    this.#orbitHistoryByScenarioId = emptyScenarioOrbitHistorySnapshotV3();
    if (outputId !== undefined) for (const [scenarioId, samples] of Object.entries(this.#exactOrbitSamplesByScenarioId)) {
      const buffer = new WorkbenchCompletedCycleBufferV3(outputId);
      buffer.append(samples);
      this.#cycleBuffers.set(scenarioId, buffer);
    }
    this.#refreshPressureVolumeSnapshot();
    for (const listener of this.#pressureVolumeListeners) listener();
  }

  /** Only longer requested waveforms grow the buffer; ordinary views keep their budget. */
  setSweepWindowSec(windowSec: number): void {
    if (!Number.isFinite(windowSec)) return;
    const bounded = Math.max(WORKBENCH_PRESENTATION_WINDOW_SEC_V3, Math.min(STUDIO_SWEEP_WINDOW_MAX_SEC_V2, windowSec));
    this.#options = Object.freeze({ ...this.#options, windowSec: bounded,
      capacity: Math.ceil(bounded / (this.#options.bucketSec ?? WORKBENCH_PRESENTATION_BUCKET_SEC_V3)) + 24 });
  }

  readonly getSnapshot = (): WorkbenchScenarioPresentationSamplesV3 =>
    this.#samplesByScenarioId;

  readonly getPressureVolumeSnapshot = ():
    WorkbenchPressureVolumePresentationSnapshotV3 =>
      this.#pressureVolumeSnapshot;

  readonly getSweepSnapshot = (): WorkbenchSweepPresentationSnapshotV3 =>
    this.#sweepSnapshot;

  readonly subscribeSweep = (listener: () => void): (() => void) => {
    this.#sweepListeners.add(listener);
    return () => this.#sweepListeners.delete(listener);
  };

  readonly subscribePressureVolume = (
    listener: () => void,
  ): (() => void) => {
    this.#pressureVolumeListeners.add(listener);
    return () => this.#pressureVolumeListeners.delete(listener);
  };

  getScenarioSnapshot(
    scenarioId: string,
  ): readonly WorkbenchScalarSampleV3[] {
    return this.#samplesByScenarioId[scenarioId]
      ?? EMPTY_WORKBENCH_PRESENTATION_SAMPLES_V3;
  }

  getScenarioExactOrbitSnapshot(
    scenarioId: string,
  ): readonly WorkbenchScalarSampleV3[] {
    return this.#exactOrbitSamplesByScenarioId[scenarioId]
      ?? EMPTY_WORKBENCH_PRESENTATION_SAMPLES_V3;
  }

  getScenarioOrbitHistorySnapshot(
    scenarioId: string,
  ): readonly WorkbenchOrbitHistoryEpochV3[] {
    return this.#orbitHistoryByScenarioId[scenarioId]
      ?? EMPTY_WORKBENCH_ORBIT_HISTORY_V3;
  }

  append(
    scenarioId: string,
    samples: readonly WorkbenchAcceptedScalarSampleV3[],
  ): void {
    this.appendMany([{ scenarioId, samples }]);
  }

  /** Commits one Worker delivery for all Scenarios with a single UI invalidation. */
  appendMany(entries: readonly Readonly<{
    scenarioId: string;
    samples: readonly WorkbenchAcceptedScalarSampleV3[];
  }>[]): void {
    const diagnosticsEnabled = workbenchPerformanceDiagnosticsEnabledV3();
    const startedAtMs = diagnosticsEnabled
      ? workbenchPerformanceNowV3()
      : 0;
    const nextSweep = createScenarioPresentationSnapshotV3(
      this.#samplesByScenarioId,
    );
    const nextExact = createScenarioPresentationSnapshotV3(
      this.#exactOrbitSamplesByScenarioId,
    );
    const nextHistory = createScenarioOrbitHistorySnapshotV3(
      this.#orbitHistoryByScenarioId,
    );
    let changed = false;
    for (const { scenarioId, samples } of entries) {
      if (samples.length === 0) continue;
      const mapped = this.#mapToPresentationTimeline(scenarioId, samples);
      if (mapped.length === 0) continue;
      nextSweep[scenarioId] = appendWorkbenchPresentationSamplesV3(
        nextSweep[scenarioId] ?? EMPTY_WORKBENCH_PRESENTATION_SAMPLES_V3,
        mapped,
        this.#options,
      );
      let currentExact = nextExact[scenarioId]
        ?? EMPTY_WORKBENCH_PRESENTATION_SAMPLES_V3;
      let currentHistory = nextHistory[scenarioId]
        ?? EMPTY_WORKBENCH_ORBIT_HISTORY_V3;
      let pendingExact: WorkbenchScalarSampleV3[] = [];
      const flushExact = () => {
        if (pendingExact.length === 0) return;
        if (this.#cyclePhaseOutputId !== undefined) {
          let buffer = this.#cycleBuffers.get(scenarioId);
          if (!buffer) {
            buffer = new WorkbenchCompletedCycleBufferV3(this.#cyclePhaseOutputId);
            this.#cycleBuffers.set(scenarioId, buffer);
          }
          buffer.append(pendingExact);
        }
        currentExact = appendWorkbenchExactOrbitSamplesV3(
          currentExact,
          pendingExact,
          this.#exactOrbitOptions,
        );
        pendingExact = [];
      };
      for (const sample of mapped) {
        const currentEpoch = currentExact.at(-1)?.inputEpoch;
        const pendingEpoch = pendingExact.at(-1)?.inputEpoch;
        if (
          (pendingEpoch !== undefined && pendingEpoch !== sample.inputEpoch)
          || (pendingEpoch === undefined
            && currentEpoch !== undefined
            && currentEpoch !== sample.inputEpoch)
        ) {
          flushExact();
          currentHistory = appendOrbitHistoryEpochV3(
            currentHistory,
            currentExact,
            this.#cycleBuffers.get(scenarioId)?.snapshot,
            this.#cycleBuffers.get(scenarioId)?.currentCycle,
            this.#cycleBuffers.get(scenarioId)?.cyclePosition,
          );
          currentExact = EMPTY_WORKBENCH_PRESENTATION_SAMPLES_V3;
        }
        pendingExact.push(sample);
      }
      flushExact();
      nextExact[scenarioId] = currentExact;
      nextHistory[scenarioId] = currentHistory;
      changed = true;
    }
    if (!changed) return;
    this.#samplesByScenarioId = Object.freeze(nextSweep);
    this.#exactOrbitSamplesByScenarioId = Object.freeze(nextExact);
    this.#orbitHistoryByScenarioId = Object.freeze(nextHistory);
    this.#refreshSweepSnapshot();
    this.#refreshPressureVolumeSnapshot();
    this.#notify();
    if (diagnosticsEnabled) {
      recordWorkbenchPerformanceDurationV3(
        "presentation.store-append",
        workbenchPerformanceNowV3() - startedAtMs,
      );
      recordWorkbenchPerformanceEventIntervalV3(
        "presentation.store-commit-interval",
      );
    }
  }

  /** Clears one Scenario while retaining its identity in the cache map. */
  resetScenario(scenarioId: string): boolean {
    const exists = hasOwnScenarioV3(this.#samplesByScenarioId, scenarioId)
      || hasOwnScenarioV3(this.#exactOrbitSamplesByScenarioId, scenarioId)
      || hasOwnScenarioV3(this.#orbitHistoryByScenarioId, scenarioId);
    if (!exists) return false;
    this.#clocks.delete(scenarioId);
    this.#cycleBuffers.delete(scenarioId);
    this.#replaceScenarioState(
      scenarioId,
      EMPTY_WORKBENCH_PRESENTATION_SAMPLES_V3,
      EMPTY_WORKBENCH_PRESENTATION_SAMPLES_V3,
      EMPTY_WORKBENCH_ORBIT_HISTORY_V3,
    );
    return true;
  }

  reset(): void {
    if (this.scenarioCount === 0) return;
    this.#samplesByScenarioId = emptyScenarioPresentationSnapshotV3();
    this.#exactOrbitSamplesByScenarioId =
      emptyScenarioPresentationSnapshotV3();
    this.#orbitHistoryByScenarioId = emptyScenarioOrbitHistorySnapshotV3();
    this.#clocks.clear();
    this.#cycleBuffers.clear();
    this.#refreshSweepSnapshot();
    this.#refreshPressureVolumeSnapshot();
    this.#notify();
  }

  removeScenario(scenarioId: string): boolean {
    const exists = hasOwnScenarioV3(this.#samplesByScenarioId, scenarioId)
      || hasOwnScenarioV3(this.#exactOrbitSamplesByScenarioId, scenarioId)
      || hasOwnScenarioV3(this.#orbitHistoryByScenarioId, scenarioId);
    if (!exists) return false;
    this.#cycleBuffers.delete(scenarioId);
    this.#samplesByScenarioId = withoutScenarioV3(
      this.#samplesByScenarioId,
      scenarioId,
    );
    this.#exactOrbitSamplesByScenarioId = withoutScenarioV3(
      this.#exactOrbitSamplesByScenarioId,
      scenarioId,
    );
    this.#orbitHistoryByScenarioId = withoutScenarioHistoryV3(
      this.#orbitHistoryByScenarioId,
      scenarioId,
    );
    this.#refreshSweepSnapshot();
    this.#refreshPressureVolumeSnapshot();
    this.#clocks.delete(scenarioId);
    this.#notify();
    return true;
  }

  /**
   * Clones an immutable presentation window for an immediately useful visual
   * duplicate. Later appends replace only the target array, so source and
   * target cannot mutate one another.
   */
  cloneScenario(sourceScenarioId: string, targetScenarioId: string): boolean {
    const source = this.#samplesByScenarioId[sourceScenarioId];
    if (source === undefined) return false;
    if (
      sourceScenarioId === targetScenarioId
      || this.#samplesByScenarioId[targetScenarioId] === source
    ) return true;
    const sourceExact = this.#exactOrbitSamplesByScenarioId[sourceScenarioId]
      ?? EMPTY_WORKBENCH_PRESENTATION_SAMPLES_V3;
    const sourceCycles = this.#cycleBuffers.get(sourceScenarioId);
    if (sourceCycles) this.#cycleBuffers.set(targetScenarioId, sourceCycles.clone());
    const sourceClock = this.#clocks.get(sourceScenarioId);
    if (sourceClock !== undefined) {
      this.#clocks.set(targetScenarioId, sourceClock);
    }
    this.#replaceScenarioState(
      targetScenarioId,
      source,
      sourceExact,
      EMPTY_WORKBENCH_ORBIT_HISTORY_V3,
    );
    return true;
  }

  get scenarioCount(): number {
    return Object.keys(this.#samplesByScenarioId).length;
  }

  get subscriberCount(): number {
    return this.#sweepListeners.size
      + this.#pressureVolumeListeners.size;
  }

  #replaceScenarioState(
    scenarioId: string,
    sweepSamples: readonly WorkbenchScalarSampleV3[],
    exactSamples: readonly WorkbenchScalarSampleV3[],
    history: readonly WorkbenchOrbitHistoryEpochV3[],
  ): void {
    const nextSweep = createScenarioPresentationSnapshotV3(
      this.#samplesByScenarioId,
    );
    const nextExact = createScenarioPresentationSnapshotV3(
      this.#exactOrbitSamplesByScenarioId,
    );
    const nextHistory = createScenarioOrbitHistorySnapshotV3(
      this.#orbitHistoryByScenarioId,
    );
    nextSweep[scenarioId] = sweepSamples;
    nextExact[scenarioId] = exactSamples;
    nextHistory[scenarioId] = history;
    this.#samplesByScenarioId = Object.freeze(nextSweep);
    this.#exactOrbitSamplesByScenarioId = Object.freeze(nextExact);
    this.#orbitHistoryByScenarioId = Object.freeze(nextHistory);
    this.#refreshSweepSnapshot();
    this.#refreshPressureVolumeSnapshot();
    this.#notify();
  }

  #mapToPresentationTimeline(
    scenarioId: string,
    samples: readonly WorkbenchAcceptedScalarSampleV3[],
  ): readonly WorkbenchScalarSampleV3[] {
    let clock = this.#clocks.get(scenarioId);
    const mapped: WorkbenchScalarSampleV3[] = [];
    for (const sample of samples) {
      if (
        !Number.isSafeInteger(sample.inputEpoch)
        || sample.inputEpoch < 0
        || !Number.isSafeInteger(sample.acceptedRevision)
        || sample.acceptedRevision < 0
        || !Number.isFinite(sample.acceptedTimeSec)
        || sample.acceptedTimeSec < 0
      ) continue;
      let offsetSec = clock?.offsetSec ?? 0;
      if (clock !== undefined && sample.inputEpoch !== clock.inputEpoch) {
        offsetSec = clock.presentationTimeSec - sample.acceptedTimeSec;
      } else if (
        clock !== undefined
        && sample.acceptedTimeSec < clock.acceptedTimeSec
      ) {
        // An unexpected same-epoch rewind is a new visual authority. Let the
        // bounded buffers fail closed instead of drawing a false connection.
        offsetSec = 0;
      }
      const presentationTimeSec = sample.acceptedTimeSec + offsetSec;
      const projected = Object.freeze({
        ...sample,
        presentationTimeSec,
      });
      mapped.push(projected);
      clock = Object.freeze({
        inputEpoch: sample.inputEpoch,
        acceptedTimeSec: sample.acceptedTimeSec,
        presentationTimeSec,
        offsetSec,
      });
    }
    if (clock !== undefined) this.#clocks.set(scenarioId, clock);
    return Object.freeze(mapped);
  }

  #notify(): void {
    for (const listener of this.#sweepListeners) listener();
    for (const listener of this.#pressureVolumeListeners) listener();
  }

  #refreshPressureVolumeSnapshot(): void {
    this.#pressureVolumeSnapshot = Object.freeze({
      renderer: "pressure-volume",
      exactOrbitSamplesByScenarioId: this.#exactOrbitSamplesByScenarioId,
      orbitHistoryByScenarioId: this.#orbitHistoryByScenarioId,
      completedCyclesByScenarioId: Object.freeze(Object.fromEntries([...this.#cycleBuffers].map(([id, buffer]) => [id, buffer.snapshot]))),
      currentCycleSamplesByScenarioId: Object.freeze(Object.fromEntries([...this.#cycleBuffers].map(([id, buffer]) => [id, buffer.currentCycle]))),
      cyclePositionByScenarioId: Object.freeze(Object.fromEntries([...this.#cycleBuffers].map(([id, buffer]) => [id, buffer.cyclePosition]))),
    });
  }

  #refreshSweepSnapshot(): void {
    this.#sweepSnapshot = Object.freeze({
      renderer: "sweep",
      samplesByScenarioId: this.#samplesByScenarioId,
    });
  }
}

export function useWorkbenchScenarioPresentationSamplesV3(
  store: WorkbenchScenarioPresentationSampleStoreV3,
): WorkbenchScenarioPresentationSamplesV3 {
  return React.useSyncExternalStore(
    store.subscribeSweep,
    store.getSnapshot,
    store.getSnapshot,
  );
}

export function useWorkbenchSampledGraphPresentationSamplesV3(
  store: WorkbenchScenarioPresentationSampleStoreV3,
  renderer: "sweep" | "pressure-volume",
): WorkbenchSampledGraphPresentationSnapshotV3 {
  const subscribe: (listener: () => void) => () => void =
    renderer === "sweep"
      ? store.subscribeSweep
      : store.subscribePressureVolume;
  const getSnapshot: () => WorkbenchSampledGraphPresentationSnapshotV3 =
    renderer === "sweep"
      ? store.getSweepSnapshot
      : store.getPressureVolumeSnapshot;
  return React.useSyncExternalStore(
    subscribe,
    getSnapshot,
    getSnapshot,
  );
}

/**
 * One subscription per rendered graph. Structural graphs intentionally pass
 * null and therefore do not re-render on unrelated accepted scalar samples.
 */
export function useWorkbenchOptionalSampledGraphPresentationSamplesV3(
  store: WorkbenchScenarioPresentationSampleStoreV3,
  renderer: "sweep" | "pressure-volume" | null,
): WorkbenchSampledGraphPresentationSnapshotV3 | null {
  const subscribe: (listener: () => void) => () => void = renderer === null
    ? NOOP_WORKBENCH_PRESENTATION_SUBSCRIBE_V3
    : renderer === "sweep"
      ? store.subscribeSweep
      : store.subscribePressureVolume;
  const getSnapshot: () => WorkbenchSampledGraphPresentationSnapshotV3 | null =
    renderer === null
      ? EMPTY_WORKBENCH_SAMPLED_GRAPH_SNAPSHOT_V3
      : renderer === "sweep"
        ? store.getSweepSnapshot
        : store.getPressureVolumeSnapshot;
  return React.useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

function emptyScenarioPresentationSnapshotV3():
  WorkbenchScenarioPresentationSamplesV3 {
  return Object.freeze(Object.create(null)) as
    WorkbenchScenarioPresentationSamplesV3;
}

const NOOP_WORKBENCH_PRESENTATION_SUBSCRIBE_V3 = () => () => undefined;
const EMPTY_WORKBENCH_SAMPLED_GRAPH_SNAPSHOT_V3 = () => null;

function createScenarioPresentationSnapshotV3(
  current: WorkbenchScenarioPresentationSamplesV3,
): Record<string, readonly WorkbenchScalarSampleV3[]> {
  return Object.assign(Object.create(null), current) as
    Record<string, readonly WorkbenchScalarSampleV3[]>;
}

function emptyScenarioOrbitHistorySnapshotV3():
  WorkbenchScenarioOrbitHistoryV3 {
  return Object.freeze(Object.create(null)) as WorkbenchScenarioOrbitHistoryV3;
}

function createScenarioOrbitHistorySnapshotV3(
  current: WorkbenchScenarioOrbitHistoryV3,
): Record<string, readonly WorkbenchOrbitHistoryEpochV3[]> {
  return Object.assign(Object.create(null), current) as
    Record<string, readonly WorkbenchOrbitHistoryEpochV3[]>;
}

function appendOrbitHistoryEpochV3(
  current: readonly WorkbenchOrbitHistoryEpochV3[],
  samples: readonly WorkbenchScalarSampleV3[],
  completedCycles?: WorkbenchCompletedCyclesV3,
  currentCycleSamples?: readonly WorkbenchScalarSampleV3[],
  sourceCyclePosition?: number,
): readonly WorkbenchOrbitHistoryEpochV3[] {
  const terminal = samples.at(-1);
  if (terminal === undefined) return current;
  const entry = Object.freeze({
    inputEpoch: terminal.inputEpoch,
    sourceAcceptedRevision: terminal.acceptedRevision,
    sourceAcceptedTimeSec: terminal.acceptedTimeSec,
    samples,
    completedCycles,
    currentCycleSamples,
    sourceCyclePosition,
  });
  return Object.freeze([...current, entry].slice(
    -WORKBENCH_PRESENTATION_HISTORY_MAX_DEPTH_V3,
  ));
}

function withoutScenarioV3(
  snapshot: WorkbenchScenarioPresentationSamplesV3,
  scenarioId: string,
): WorkbenchScenarioPresentationSamplesV3 {
  const next = createScenarioPresentationSnapshotV3(snapshot);
  delete next[scenarioId];
  return Object.freeze(next);
}

function withoutScenarioHistoryV3(
  snapshot: WorkbenchScenarioOrbitHistoryV3,
  scenarioId: string,
): WorkbenchScenarioOrbitHistoryV3 {
  const next = createScenarioOrbitHistorySnapshotV3(snapshot);
  delete next[scenarioId];
  return Object.freeze(next);
}

function hasOwnScenarioV3(
  snapshot: Readonly<Record<string, unknown>>,
  scenarioId: string,
): boolean {
  return Object.prototype.hasOwnProperty.call(snapshot, scenarioId);
}

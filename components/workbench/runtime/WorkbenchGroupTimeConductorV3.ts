import {
  getWorkbenchPerformanceRecorderV3,
  type WorkbenchPerformanceRecorderV3,
} from "./WorkbenchPerformanceDiagnosticsV3";

export const WORKBENCH_MINIMUM_PLAYBACK_RATE_V3 = 0.25;
export const WORKBENCH_MAXIMUM_PLAYBACK_RATE_V3 = 5;
export const WORKBENCH_PLAYBACK_RATE_STEP_V3 = 0.25;
export const WORKBENCH_PLAYBACK_CAPACITY_STEP_V3 = 0.5;
export const WORKBENCH_DEFAULT_PLAYBACK_RATE_V3 = 1;

const WORKBENCH_GROUP_RATE_HEADROOM_V3 = 0.9;
const WORKBENCH_GROUP_CALIBRATION_DISCARD_COUNT_V3 = 3;
const WORKBENCH_GROUP_CALIBRATION_SAMPLE_COUNT_V3 = 9;
const WORKBENCH_GROUP_CAPACITY_PERCENTILE_V3 = 0.2;
const WORKBENCH_GROUP_OVERLOAD_SAMPLE_COUNT_V3 = 12;
const WORKBENCH_GROUP_OVERLOAD_RATIO_V3 = 0.9;
const WORKBENCH_GROUP_REQUALIFICATION_SAMPLE_COUNT_V3 = 24;
const WORKBENCH_ACCELERATED_BATCH_SAMPLE_COUNT_V3 = 4;
const WORKBENCH_ACCELERATED_BATCH_ENTER_MS_V3 = 20;
const WORKBENCH_ACCELERATED_BATCH_EXIT_MS_V3 = 24;

export type WorkbenchGroupTimeConductorTimerV3 = ReturnType<typeof setTimeout>;

export type WorkbenchGroupPlaybackRateStateV3 = Readonly<{
  /** Requested pace, independent of the measured throughput of this device. */
  playbackRate: number;
  maximumRate: number | null;
  calibrating: boolean;
  userSelected: boolean;
  performanceLimited: boolean;
}>;

export type WorkbenchGroupTimeConductorLaneV3<TFrame> = Readonly<{
  laneId: string;
  acceptedTimeSec: number;
  advance(stepCount: number): Promise<readonly TFrame[]>;
  frameAcceptedTimeSec(frame: TFrame): number;
}>;

export type WorkbenchGroupTimeConductorDependenciesV3<TFrame> = Readonly<{
  lanes(): readonly WorkbenchGroupTimeConductorLaneV3<TFrame>[];
  onFrames(frames: readonly TFrame[]): void;
  onError(error: Error): void;
  onPlaybackRateChange?(state: WorkbenchGroupPlaybackRateStateV3): void;
  /**
   * True when this batch represents visible playback. The conservative limit
   * describes the current workload, not an unloaded hardware benchmark.
   * Include background contention; exclude hidden/suspended documents.
   */
  capacityMeasurementEligible?(): boolean;
  nowMs?: () => number;
  schedule?: (
    callback: () => void,
    delayMs: number,
  ) => WorkbenchGroupTimeConductorTimerV3;
  cancel?: (timer: WorkbenchGroupTimeConductorTimerV3) => void;
  presentationDtSec?: number;
  batchSteps?: number;
  presentationIntervalMs?: number;
  /** Frames released per lane and interval at 1× playback. */
  maximumPresentationFramesPerLane?: number;
  /** Smooth-profile policy only: large comparisons paint at about 30 Hz. */
  adaptPresentationCadenceToLaneCount?: boolean;
  /** Smooth-profile policy only: measured short requests may batch 32 ticks. */
  adaptComputeBatchToPlaybackRate?: boolean;
  minimumPlaybackRate?: number;
  maximumPlaybackRate?: number;
  performanceRecorder?: WorkbenchPerformanceRecorderV3;
}>;

type PendingGroupPresentationV3<TFrame> = {
  readonly laneFrames: readonly Readonly<{
    laneId: string;
    frames: readonly TFrame[];
  }>[];
  offset: number;
};

/**
 * Owns one shared model-time pace for every live Scenario.
 *
 * Every lane advances by the same exact accepted-step count. A presentation
 * prefix is released only after every lane has completed that group batch, so
 * comparative waveforms never imply independent playback speeds. When the
 * device has insufficient capacity, model time slows honestly instead of
 * discarding wall-clock debt.
 */
export class WorkbenchGroupTimeConductorV3<TFrame> {
  readonly #lanes: () => readonly WorkbenchGroupTimeConductorLaneV3<TFrame>[];
  readonly #onFrames: (frames: readonly TFrame[]) => void;
  readonly #onError: (error: Error) => void;
  readonly #onPlaybackRateChange:
    ((state: WorkbenchGroupPlaybackRateStateV3) => void) | undefined;
  readonly #capacityMeasurementEligible: () => boolean;
  readonly #nowMs: () => number;
  readonly #schedule: (
    callback: () => void,
    delayMs: number,
  ) => WorkbenchGroupTimeConductorTimerV3;
  readonly #cancel: (timer: WorkbenchGroupTimeConductorTimerV3) => void;
  readonly #presentationDtSec: number;
  readonly #batchSteps: number;
  readonly #presentationIntervalMs: number;
  readonly #maximumPresentationFramesPerLane: number;
  readonly #adaptPresentationCadenceToLaneCount: boolean;
  readonly #adaptComputeBatchToPlaybackRate: boolean;
  #recentGroupMsPerStep: number[] = [];
  #acceleratedBatch = false;
  #presentationCadenceMultiplier = 1;
  readonly #minimumPlaybackRate: number;
  readonly #maximumPlaybackRate: number;
  readonly #performance: WorkbenchPerformanceRecorderV3;

  #running = false;
  #disposed = false;
  #pumpTimer: WorkbenchGroupTimeConductorTimerV3 | undefined;
  #presentationTimer: WorkbenchGroupTimeConductorTimerV3 | undefined;
  #inFlight: Promise<void> | undefined;
  #nextPumpWallMs = 0;
  #lastPresentationWallMs = 0;
  #presentationFrameCreditPerLane = 0;
  #pendingPresentation: PendingGroupPresentationV3<TFrame>[] = [];
  #playbackRate = WORKBENCH_DEFAULT_PLAYBACK_RATE_V3;
  #maximumRate: number | null = null;
  #userSelected = false;
  #performanceLimited = false;
  #calibrationMeasurementCount = 0;
  #calibrationCapacitySamples: number[] = [];
  #steadyCapacitySamples: number[] = [];
  #requalificationCapacitySamples: number[] = [];
  #lastPublishedRateState: WorkbenchGroupPlaybackRateStateV3 | null = null;

  constructor(dependencies: WorkbenchGroupTimeConductorDependenciesV3<TFrame>) {
    this.#lanes = dependencies.lanes;
    this.#onFrames = dependencies.onFrames;
    this.#onError = dependencies.onError;
    this.#onPlaybackRateChange = dependencies.onPlaybackRateChange;
    this.#capacityMeasurementEligible = dependencies.capacityMeasurementEligible
      ?? defaultCapacityMeasurementEligibleV3;
    this.#nowMs = dependencies.nowMs ?? (() => performance.now());
    this.#schedule = dependencies.schedule ?? ((callback, delayMs) =>
      setTimeout(callback, delayMs));
    this.#cancel = dependencies.cancel ?? ((timer) => clearTimeout(timer));
    this.#presentationDtSec = dependencies.presentationDtSec ?? 0.002;
    this.#batchSteps = dependencies.batchSteps ?? 16;
    this.#presentationIntervalMs = dependencies.presentationIntervalMs ?? 16;
    this.#maximumPresentationFramesPerLane =
      dependencies.maximumPresentationFramesPerLane ?? 8;
    this.#adaptPresentationCadenceToLaneCount = dependencies.adaptPresentationCadenceToLaneCount ?? false;
    this.#adaptComputeBatchToPlaybackRate = dependencies.adaptComputeBatchToPlaybackRate ?? false;
    this.#minimumPlaybackRate = dependencies.minimumPlaybackRate
      ?? WORKBENCH_MINIMUM_PLAYBACK_RATE_V3;
    this.#maximumPlaybackRate = dependencies.maximumPlaybackRate
      ?? WORKBENCH_MAXIMUM_PLAYBACK_RATE_V3;
    this.#performance = dependencies.performanceRecorder
      ?? getWorkbenchPerformanceRecorderV3();
    if (
      !Number.isFinite(this.#presentationDtSec)
      || this.#presentationDtSec <= 0
      || !Number.isSafeInteger(this.#batchSteps)
      || this.#batchSteps < 1
      || !Number.isFinite(this.#presentationIntervalMs)
      || this.#presentationIntervalMs < 0
      || !Number.isSafeInteger(this.#maximumPresentationFramesPerLane)
      || this.#maximumPresentationFramesPerLane < 1
      || !Number.isFinite(this.#minimumPlaybackRate)
      || !Number.isFinite(this.#maximumPlaybackRate)
      || this.#minimumPlaybackRate <= 0
      || this.#maximumPlaybackRate <= this.#minimumPlaybackRate
    ) {
      throw new Error("Workbench group TimeConductor configuration is invalid");
    }
    this.#playbackRate = clampV3(
      WORKBENCH_DEFAULT_PLAYBACK_RATE_V3,
      this.#minimumPlaybackRate,
      this.#maximumPlaybackRate,
    );
    this.#resetCapacityEstimate();
  }

  get running(): boolean {
    return this.#running;
  }

  playbackRateState(): WorkbenchGroupPlaybackRateStateV3 {
    return Object.freeze({
      playbackRate: this.#playbackRate,
      maximumRate: this.#maximumRate,
      calibrating: this.#maximumRate === null,
      userSelected: this.#userSelected,
      performanceLimited: this.#performanceLimited,
    });
  }

  setPlaybackRate(rate: number): WorkbenchGroupPlaybackRateStateV3 {
    const previousPlaybackRate = this.#playbackRate;
    const changedAtMs = this.#nowMs();
    if (this.#running && !this.#disposed) {
      this.#publishOrSchedulePresentation(changedAtMs);
    }
    requirePlaybackRateV3(
      rate,
      this.#minimumPlaybackRate,
      this.#maximumPlaybackRate,
    );
    // Normal-speed playback remains selectable even when measured capacity is
    // lower. Work is still bounded to one exact group batch at a time; actual
    // model time then progresses only as fast as every lane can compute it.
    const selectableMaximum = Math.max(
      Math.min(WORKBENCH_DEFAULT_PLAYBACK_RATE_V3, this.#maximumPlaybackRate),
      this.#maximumRate ?? this.#maximumPlaybackRate,
    );
    if (rate > selectableMaximum + 1e-9) {
      throw new Error("Workbench playback rate exceeds the calibrated limit");
    }
    this.#playbackRate = rate;
    if (rate < 2) this.#acceleratedBatch = false;
    this.#userSelected = true;
    this.#performanceLimited = false;
    this.#steadyCapacitySamples = [];
    this.#requalificationCapacitySamples = [];
    if (this.#running && !this.#disposed) {
      // Apply the new rate from this wall-clock boundary. At most one partial
      // presentation interval is discarded; no accepted model frame is.
      this.#lastPresentationWallMs = changedAtMs;
      this.#presentationFrameCreditPerLane = 0;
      this.#publishOrSchedulePresentation(changedAtMs);
      if (Math.abs(this.#playbackRate - previousPlaybackRate) > 1e-9) {
        this.#cancelPumpTimer();
        const nextBoundaryDemand = Math.max(
          1,
          Math.floor(
            this.#presentationFramesPerInterval() * this.#playbackRate
              + 1e-9,
          ),
        );
        const startImmediately = this.#playbackRate > previousPlaybackRate
          && this.#presentationBacklogFramesPerLane() < nextBoundaryDemand;
        // An in-flight batch already occupies the current deadline. Let its
        // completion add exactly one interval at the new rate. A queued batch
        // instead owns the explicit immediate or delayed deadline below.
        this.#nextPumpWallMs = this.#inFlight === undefined
          ? changedAtMs + (startImmediately
            ? 0
            : this.#batchModelDurationMs(this.#selectBatchSteps()) / this.#playbackRate)
          : changedAtMs;
        if (this.#inFlight === undefined) {
          this.#queuePump(
            Math.max(0, this.#nextPumpWallMs - changedAtMs),
          );
        }
      }
    }
    this.#publishRateState();
    return this.playbackRateState();
  }

  play(): void {
    if (this.#disposed) {
      throw new Error("Workbench group TimeConductor is disposed");
    }
    if (this.#running) return;
    this.#updatePresentationCadence(requireGroupLanesV3(this.#lanes()).length);
    this.#running = true;
    this.#lastPresentationWallMs = this.#nowMs();
    this.#nextPumpWallMs = this.#lastPresentationWallMs;
    this.#presentationFrameCreditPerLane = 0;
    this.#publishRateState();
    this.#queuePump(0);
  }

  async pause(): Promise<void> {
    if (this.#disposed) return;
    this.#running = false;
    this.#cancelPumpTimer();
    await this.#inFlight;
    this.#cancelPresentationTimer();
    this.#flushAllPresentation(this.#nowMs());
    this.#presentationFrameCreditPerLane = 0;
  }

  /** Must be called after a paused lane set changes. */
  lanesChanged(): WorkbenchGroupPlaybackRateStateV3 {
    if (this.#running || this.#inFlight !== undefined) {
      throw new Error("Workbench group lanes can change only while paused");
    }
    this.#cancelPresentationTimer();
    this.#flushAllPresentation(this.#nowMs());
    this.#updatePresentationCadence(this.#lanes().length);
    this.#resetCapacityEstimate();
    this.#publishRateState();
    return this.playbackRateState();
  }

  terminate(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    this.#running = false;
    this.#cancelPumpTimer();
    this.#cancelPresentationTimer();
    this.#pendingPresentation = [];
    this.#presentationFrameCreditPerLane = 0;
    this.#recordPresentationBacklog();
  }

  async dispose(): Promise<void> {
    if (this.#disposed) return;
    this.terminate();
    await this.#inFlight;
  }

  #queuePump(delayMs: number): void {
    if (
      !this.#running
      || this.#disposed
      || this.#pumpTimer !== undefined
    ) return;
    this.#pumpTimer = this.#schedule(() => {
      this.#pumpTimer = undefined;
      this.#pump();
    }, Math.max(0, delayMs));
  }

  #pump(): void {
    if (
      !this.#running
      || this.#disposed
      || this.#inFlight !== undefined
    ) return;
    const lanes = requireGroupLanesV3(this.#lanes());
    const startedAtMs = this.#nowMs();
    if (this.#performance.enabled) this.#performance.recordDuration(
      "scheduler.group.pump-start-lateness", Math.max(0, startedAtMs - this.#nextPumpWallMs),
    );
    const capacityEligibleAtStart = this.#capacityMeasurementEligible();
    // Capture the count for this operation. Mid-flight rate changes affect the
    // next request, never its validation, measured capacity, or accepted prefix.
    const batchSteps = this.#selectBatchSteps();
    const operation = Promise.all(lanes.map(async (lane) => {
      const frames = await lane.advance(batchSteps);
      validateGroupLaneAdvanceV3(
        lane,
        frames,
        batchSteps,
        this.#presentationDtSec,
      );
      return Object.freeze({ laneId: lane.laneId, frames });
    })).then((laneFrames) => {
      const completedAtMs = this.#nowMs();
      const groupWallMs = completedAtMs - startedAtMs;
      if (!(groupWallMs >= 0) || !Number.isFinite(groupWallMs)) {
        throw new Error("Workbench group clock moved backwards");
      }
      this.#recordGroupCompletion(groupWallMs, lanes.length, batchSteps);
      this.#recordBatchCost(groupWallMs, batchSteps, capacityEligibleAtStart && this.#capacityMeasurementEligible());
      this.#updateCapacityEstimate(groupWallMs, capacityEligibleAtStart, batchSteps);
      this.#pendingPresentation.push({
        laneFrames: Object.freeze(laneFrames),
        offset: 0,
      });
      this.#recordPresentationBacklog();
      this.#publishOrSchedulePresentation(completedAtMs);
      if (this.#performance.enabled) this.#performance.recordDuration(
        "scheduler.group.presentation-publication", this.#nowMs() - completedAtMs,
      );
      const intervalMs = this.#batchModelDurationMs(batchSteps) / this.#playbackRate;
      // Carry the absolute deadline forward while it is still current, so
      // ordinary sub-millisecond timer lateness cannot accumulate into a
      // visible rate error at high playback multipliers. A suspended tab or
      // exceptional Worker stall must not replay every missed wall deadline:
      // re-anchor at completion and permit at most one immediate batch.
      this.#nextPumpWallMs = Math.max(
        this.#nextPumpWallMs + intervalMs,
        completedAtMs,
      );
      // Publication may synchronously materialize samples and notify mounted
      // panes. Its elapsed time consumes this deadline, not another idle delay.
      this.#queuePump(Math.max(0, this.#nextPumpWallMs - this.#nowMs()));
    }).catch((error) => {
      this.#running = false;
      this.#cancelPumpTimer();
      this.#cancelPresentationTimer();
      if (!this.#disposed) this.#flushAllPresentation(this.#nowMs());
      if (!this.#disposed) this.#onError(errorAsErrorV3(error));
    }).finally(() => {
      if (this.#inFlight === operation) this.#inFlight = undefined;
      if (this.#running && !this.#disposed && this.#pumpTimer === undefined) {
        this.#queuePump(0);
      }
    });
    this.#inFlight = operation;
  }

  #selectBatchSteps(): number {
    if (!this.#adaptComputeBatchToPlaybackRate || this.#batchSteps !== 16 || this.#playbackRate < 2
      || this.#recentGroupMsPerStep.length < WORKBENCH_ACCELERATED_BATCH_SAMPLE_COUNT_V3) {
      this.#acceleratedBatch = false;
      return this.#batchSteps;
    }
    // The slowest of four recent group round trips includes transport and main
    // thread reply delay. Hysteresis avoids toggling around a single threshold;
    // one slow sample immediately returns to 16 until the recent window clears.
    const predictedMs = Math.max(...this.#recentGroupMsPerStep) * 32;
    this.#acceleratedBatch = predictedMs <= (this.#acceleratedBatch
      ? WORKBENCH_ACCELERATED_BATCH_EXIT_MS_V3 : WORKBENCH_ACCELERATED_BATCH_ENTER_MS_V3);
    return this.#acceleratedBatch ? 32 : this.#batchSteps;
  }

  #recordBatchCost(groupWallMs: number, batchSteps: number, eligible: boolean): void {
    if (!eligible || groupWallMs <= 0) {
      this.#recentGroupMsPerStep = [];
      this.#acceleratedBatch = false;
      return;
    }
    this.#recentGroupMsPerStep.push(groupWallMs / batchSteps);
    if (this.#recentGroupMsPerStep.length > WORKBENCH_ACCELERATED_BATCH_SAMPLE_COUNT_V3) this.#recentGroupMsPerStep.shift();
    if (this.#performance.enabled) this.#performance.recordValue(
      "scheduler.group.predicted-32-step-wall-ms", Math.max(...this.#recentGroupMsPerStep) * 32,
    );
  }

  #recordGroupCompletion(groupWallMs: number, laneCount: number, batchSteps: number): void {
    if (!this.#performance.enabled) return;
    this.#performance.recordDuration(
      "scheduler.group.worker-round-trip",
      groupWallMs,
    );
    this.#performance.recordValue("scheduler.group.live-lane-count", laneCount);
    this.#performance.recordValue("scheduler.group.presentation-interval-ms", this.#presentationIntervalMs * this.#presentationCadenceMultiplier);
    this.#performance.recordValue(
      "scheduler.group.requested-batch-steps",
      batchSteps,
    );
    this.#performance.recordValue(
      "scheduler.group.model-time-ratio",
      groupWallMs === 0
        ? this.#maximumPlaybackRate
        : this.#batchModelDurationMs(batchSteps) / groupWallMs,
    );
  }

  #updateCapacityEstimate(
    groupWallMs: number,
    capacityEligibleAtStart: boolean,
    batchSteps: number,
  ): void {
    // A zero-duration synthetic clock is valid in unit tests but carries no
    // throughput information.
    if (groupWallMs <= 0) return;
    const measuredCapacity = this.#batchModelDurationMs(batchSteps) / groupWallMs;
    // A batch starting while hidden is not evidence even if the tab becomes
    // visible before its reply. Ordinary background contention IS evidence.
    const eligible = capacityEligibleAtStart
      && this.#capacityMeasurementEligible();
    if (this.#performance.enabled) {
      this.#performance.recordValue(
        "scheduler.group.capacity-sample-eligible",
        eligible ? 1 : 0,
      );
      this.#performance.incrementCounter(
        eligible
          ? "scheduler.group.capacity-samples-accepted"
          : "scheduler.group.capacity-samples-rejected",
      );
    }
    if (!eligible) return;
    if (this.#maximumRate === null) {
      this.#calibrationMeasurementCount += 1;
      if (
        this.#calibrationMeasurementCount
          > WORKBENCH_GROUP_CALIBRATION_DISCARD_COUNT_V3
      ) this.#calibrationCapacitySamples.push(measuredCapacity);
      if (
        this.#calibrationCapacitySamples.length
          >= WORKBENCH_GROUP_CALIBRATION_SAMPLE_COUNT_V3
      ) this.#finishCalibration();
    } else {
      this.#steadyCapacitySamples.push(measuredCapacity);
      if (
        this.#steadyCapacitySamples.length
          > WORKBENCH_GROUP_OVERLOAD_SAMPLE_COUNT_V3
      ) this.#steadyCapacitySamples.shift();
      if (
        this.#steadyCapacitySamples.length
          === WORKBENCH_GROUP_OVERLOAD_SAMPLE_COUNT_V3
      ) {
        this.#performanceLimited = percentileV3(
          this.#steadyCapacitySamples,
          WORKBENCH_GROUP_CAPACITY_PERCENTILE_V3,
        ) < this.#playbackRate * WORKBENCH_GROUP_OVERLOAD_RATIO_V3;
      }
      if (
        this.#maximumRate < this.#maximumPlaybackRate
      ) {
        this.#requalificationCapacitySamples.push(measuredCapacity);
        if (
          this.#requalificationCapacitySamples.length
            >= WORKBENCH_GROUP_REQUALIFICATION_SAMPLE_COUNT_V3
        ) this.#requalifyCapacity();
      }
    }
    if (this.#performance.enabled) {
      if (this.#maximumRate !== null) {
        this.#performance.recordValue(
          "scheduler.group.safe-playback-rate",
          this.#maximumRate,
        );
      }
      this.#performance.recordValue(
        "scheduler.group.requested-playback-rate",
        this.#playbackRate,
      );
      if (this.#maximumRate !== null) {
        this.#performance.recordValue(
          "scheduler.group.playback-headroom",
          Math.max(0, this.#maximumRate - this.#playbackRate),
        );
      }
    }
    this.#publishRateState();
  }

  #finishCalibration(): void {
    const measuredCapacity = percentileV3(
      this.#calibrationCapacitySamples,
      WORKBENCH_GROUP_CAPACITY_PERCENTILE_V3,
    );
    this.#maximumRate = quantizePlaybackRateDownV3(
      measuredCapacity * WORKBENCH_GROUP_RATE_HEADROOM_V3,
      this.#minimumPlaybackRate,
      this.#maximumPlaybackRate,
    );
    // Calibration controls acceleration options and background-work headroom,
    // not the requested pace. Cold Workers must not switch playback to 0.5×.
    // Detect a real shortfall before quantization: a conservative 0.5× ceiling
    // can still represent throughput sufficient for normal-speed playback.
    this.#performanceLimited = measuredCapacity
      < this.#playbackRate * WORKBENCH_GROUP_OVERLOAD_RATIO_V3;
    this.#steadyCapacitySamples = [];
    this.#requalificationCapacitySamples = [];
  }

  #requalifyCapacity(): void {
    const conservativeCapacity = percentileV3(
      this.#requalificationCapacitySamples,
      WORKBENCH_GROUP_CAPACITY_PERCENTILE_V3,
    ) * WORKBENCH_GROUP_RATE_HEADROOM_V3;
    this.#requalificationCapacitySamples = [];
    const promotedRate = quantizePlaybackRateDownV3(
      conservativeCapacity,
      this.#minimumPlaybackRate,
      this.#maximumPlaybackRate,
    );
    if (this.#maximumRate === null || promotedRate <= this.#maximumRate) return;
    this.#maximumRate = promotedRate;
    this.#performance.incrementCounter(
      "scheduler.group.safe-playback-rate-promotions",
    );
  }

  #updatePresentationCadence(laneCount: number): void {
    // Four or more live lanes multiply React, Canvas and SVG paint work. Only
    // the smooth profile opts into a 32-ms display boundary: doubling its
    // released frame credit preserves the same complete accepted-time prefix.
    // Numerical requests, analysis samples, and pause/control flushes are unchanged.
    this.#presentationCadenceMultiplier = this.#adaptPresentationCadenceToLaneCount && laneCount >= 4 ? 2 : 1;
  }

  #presentationFramesPerInterval(): number {
    return this.#maximumPresentationFramesPerLane * this.#presentationCadenceMultiplier;
  }

  #publishOrSchedulePresentation(nowMs: number): void {
    if (this.#pendingPresentation.length === 0) return;
    const intervalMs = this.#presentationIntervalMs * this.#presentationCadenceMultiplier;
    const framesPerInterval = this.#presentationFramesPerInterval();
    if (intervalMs === 0) {
      this.#cancelPresentationTimer();
      this.#flushAllPresentation(nowMs);
      return;
    }
    const elapsedIntervals = Math.floor(
      Math.max(0, nowMs - this.#lastPresentationWallMs)
        / intervalMs,
    );
    if (elapsedIntervals > 0) {
      this.#lastPresentationWallMs += elapsedIntervals * intervalMs;
      this.#presentationFrameCreditPerLane = Math.min(
        Math.max(
          this.#adaptComputeBatchToPlaybackRate && this.#batchSteps === 16 ? 32 : this.#batchSteps,
          framesPerInterval * this.#maximumPlaybackRate,
        ),
        this.#presentationFrameCreditPerLane
          + elapsedIntervals
            * framesPerInterval * this.#playbackRate,
      );
      this.#flushCreditedPresentation();
    }
    if (
      this.#pendingPresentation.length === 0
      || this.#presentationTimer !== undefined
      || !this.#running
      || this.#disposed
    ) return;
    const remainingMs = Math.max(
      0,
      intervalMs - (this.#nowMs() - this.#lastPresentationWallMs),
    );
    this.#presentationTimer = this.#schedule(() => {
      this.#presentationTimer = undefined;
      if (!this.#running || this.#disposed) return;
      this.#publishOrSchedulePresentation(this.#nowMs());
    }, Math.ceil(remainingMs));
  }

  #flushCreditedPresentation(): void {
    let creditedFrames = Math.floor(
      this.#presentationFrameCreditPerLane + 1e-9,
    );
    while (creditedFrames > 0 && this.#pendingPresentation.length > 0) {
      const emitted = this.#flushPresentationSlice(creditedFrames);
      this.#presentationFrameCreditPerLane = Math.max(
        0,
        this.#presentationFrameCreditPerLane - emitted,
      );
      creditedFrames = Math.floor(
        this.#presentationFrameCreditPerLane + 1e-9,
      );
    }
  }

  #flushPresentationSlice(maximumFramesPerLane: number): number {
    const frames: TFrame[] = [];
    let count = 0;
    // One visible interval can cover several exact Worker batches at faster
    // playback. Commit their whole aligned prefix once, retaining every sample
    // in lane order without notifying/materializing the same panes repeatedly.
    while (count < maximumFramesPerLane && this.#pendingPresentation.length > 0) {
      const pending = this.#pendingPresentation[0]!;
      const available = pending.laneFrames[0]!.frames.length - pending.offset;
      const take = Math.min(maximumFramesPerLane - count, available);
      for (const lane of pending.laneFrames) {
        for (let i = pending.offset; i < pending.offset + take; i++) frames.push(lane.frames[i]!);
      }
      pending.offset += take;
      count += take;
      if (pending.offset === pending.laneFrames[0]!.frames.length) this.#pendingPresentation.shift();
    }
    if (!this.#disposed && frames.length > 0) {
      this.#onFrames(Object.freeze(frames));
    }
    this.#recordPresentationBacklog();
    return count;
  }

  #flushAllPresentation(nowMs: number): void {
    while (this.#pendingPresentation.length > 0) {
      this.#flushPresentationSlice(Number.POSITIVE_INFINITY);
    }
    this.#lastPresentationWallMs = nowMs;
    this.#presentationFrameCreditPerLane = 0;
  }

  #recordPresentationBacklog(): void {
    if (!this.#performance.enabled) return;
    this.#performance.recordValue(
      "scheduler.group.presentation-backlog-frames-per-lane",
      this.#presentationBacklogFramesPerLane(),
    );
  }

  #presentationBacklogFramesPerLane(): number {
    return this.#pendingPresentation.reduce(
      (sum, pending) =>
        sum + pending.laneFrames[0]!.frames.length - pending.offset,
      0,
    );
  }

  #resetCapacityEstimate(): void {
    this.#recentGroupMsPerStep = [];
    this.#acceleratedBatch = false;
    this.#maximumRate = null;
    this.#performanceLimited = false;
    this.#calibrationMeasurementCount = 0;
    this.#calibrationCapacitySamples = [];
    this.#steadyCapacitySamples = [];
    this.#requalificationCapacitySamples = [];
    // A changed Scenario count invalidates capacity, not playback intent.
  }

  #publishRateState(): void {
    const state = this.playbackRateState();
    if (samePlaybackRateStateV3(state, this.#lastPublishedRateState)) return;
    this.#lastPublishedRateState = state;
    this.#onPlaybackRateChange?.(state);
  }

  #batchModelDurationMs(batchSteps: number): number {
    return batchSteps * this.#presentationDtSec * 1_000;
  }

  #cancelPumpTimer(): void {
    if (this.#pumpTimer === undefined) return;
    this.#cancel(this.#pumpTimer);
    this.#pumpTimer = undefined;
  }

  #cancelPresentationTimer(): void {
    if (this.#presentationTimer === undefined) return;
    this.#cancel(this.#presentationTimer);
    this.#presentationTimer = undefined;
  }
}

function defaultCapacityMeasurementEligibleV3(): boolean {
  return typeof document === "undefined"
    || document.visibilityState === "visible";
}

function requireGroupLanesV3<TFrame>(
  lanes: readonly WorkbenchGroupTimeConductorLaneV3<TFrame>[],
): readonly WorkbenchGroupTimeConductorLaneV3<TFrame>[] {
  if (lanes.length === 0) {
    throw new Error("Workbench group TimeConductor requires at least one lane");
  }
  const ids = new Set<string>();
  for (const lane of lanes) {
    if (lane.laneId.length === 0 || ids.has(lane.laneId)) {
      throw new Error("Workbench group TimeConductor lane identity is invalid");
    }
    if (!Number.isFinite(lane.acceptedTimeSec) || lane.acceptedTimeSec < 0) {
      throw new Error("Workbench group TimeConductor lane clock is invalid");
    }
    ids.add(lane.laneId);
  }
  return lanes;
}

function validateGroupLaneAdvanceV3<TFrame>(
  lane: WorkbenchGroupTimeConductorLaneV3<TFrame>,
  frames: readonly TFrame[],
  stepCount: number,
  presentationDtSec: number,
): void {
  if (frames.length !== stepCount) {
    throw new Error(
      `Workbench group lane ${lane.laneId} returned ${frames.length} frames `
        + `for ${stepCount} requested steps`,
    );
  }
  let previousTimeSec = lane.acceptedTimeSec;
  for (const frame of frames) {
    const acceptedTimeSec = lane.frameAcceptedTimeSec(frame);
    const expected = previousTimeSec + presentationDtSec;
    if (
      !Number.isFinite(acceptedTimeSec)
      || Math.abs(acceptedTimeSec - expected)
        > Math.max(1, Math.abs(expected)) * 1e-9
    ) {
      throw new Error(
        `Workbench group lane ${lane.laneId} did not advance by one exact `
          + `presentation tick (previous ${previousTimeSec}, expected `
          + `${expected}, received ${acceptedTimeSec})`,
      );
    }
    previousTimeSec = acceptedTimeSec;
  }
}

function requirePlaybackRateV3(rate: number, minimum: number, maximum: number) {
  if (
    !Number.isFinite(rate)
    || rate < minimum
    || rate > maximum
    || Math.abs(
      rate / WORKBENCH_PLAYBACK_RATE_STEP_V3
        - Math.round(rate / WORKBENCH_PLAYBACK_RATE_STEP_V3),
    ) > 1e-9
  ) {
    throw new Error("Workbench playback rate is outside the supported range");
  }
}

function samePlaybackRateStateV3(
  left: WorkbenchGroupPlaybackRateStateV3,
  right: WorkbenchGroupPlaybackRateStateV3 | null,
): boolean {
  // The controller updates its EWMA after every group batch. React only needs
  // a new state when the two-decimal control can visibly change; the state we
  // do publish still carries the exact rate and exact safety ceiling.
  return right !== null
    && left.playbackRate === right.playbackRate
    && left.maximumRate === right.maximumRate
    && left.calibrating === right.calibrating
    && left.userSelected === right.userSelected
    && left.performanceLimited === right.performanceLimited;
}

function clampV3(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function quantizePlaybackRateDownV3(
  value: number,
  minimum: number,
  maximum: number,
): number {
  const clamped = clampV3(value, minimum, maximum);
  const quantized = Math.floor(
    (clamped + 1e-9) / WORKBENCH_PLAYBACK_CAPACITY_STEP_V3,
  ) * WORKBENCH_PLAYBACK_CAPACITY_STEP_V3;
  return Number(clampV3(quantized, minimum, maximum).toFixed(2));
}

function percentileV3(values: readonly number[], percentile: number): number {
  if (values.length === 0) {
    throw new Error("Workbench capacity percentile requires measurements");
  }
  const ordered = [...values].sort((left, right) => left - right);
  const index = Math.floor((ordered.length - 1) * percentile);
  return ordered[index]!;
}

function errorAsErrorV3(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}

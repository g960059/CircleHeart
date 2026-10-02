import { describe, expect, it, vi } from "vitest";

import {
  WorkbenchGroupTimeConductorV3,
  type WorkbenchGroupTimeConductorLaneV3,
  type WorkbenchGroupTimeConductorTimerV3,
} from "@/components/workbench/runtime/WorkbenchGroupTimeConductorV3";
import { WorkbenchPerformanceDiagnosticsV3 } from
  "@/components/workbench/runtime/WorkbenchPerformanceDiagnosticsV3";
import {
  formatWorkbenchPlaybackRateV3,
  snapWorkbenchPlaybackRateV3,
  workbenchPlaybackPresetRatesV3,
} from "@/components/workbench/WorkbenchPlaybackControlV3";

type Frame = Readonly<{ laneId: string; timeSec: number; index: number }>;

describe("WorkbenchGroupTimeConductorV3", () => {
  it("publishes only after every Scenario reaches the same group boundary", async () => {
    const clock = new GroupClockV3();
    const baseline = deferredV3<readonly Frame[]>();
    const comparison = deferredV3<readonly Frame[]>();
    const onFrames = vi.fn<(frames: readonly Frame[]) => void>();
    const conductor = new WorkbenchGroupTimeConductorV3({
      lanes: () => [
        laneV3("baseline", 0, () => baseline.promise),
        laneV3("comparison", 0, () => comparison.promise),
      ],
      onFrames,
      onError: vi.fn(),
      nowMs: clock.now,
      schedule: clock.schedule,
      cancel: clock.cancel,
      batchSteps: 2,
      presentationIntervalMs: 0,
      maximumPresentationFramesPerLane: 2,
    });

    conductor.play();
    await clock.advanceBy(0);
    baseline.resolve(framesV3("baseline", 0, 2));
    await flushMicrotasksV3();
    expect(onFrames).not.toHaveBeenCalled();

    comparison.resolve(framesV3("comparison", 0, 2));
    await flushMicrotasksV3();
    expect(onFrames).toHaveBeenCalledOnce();
    expect(onFrames.mock.calls[0]![0].map(({ laneId, timeSec }) =>
      [laneId, timeSec])).toEqual([
        ["baseline", 0.002],
        ["baseline", 0.004],
        ["comparison", 0.002],
        ["comparison", 0.004],
      ]);
    await conductor.pause();
  });

  it.each([
    { laneCount: 3, adaptive: true, multiplier: 1 as const, firstIntervalMs: 16, firstFrames: 8 },
    { laneCount: 4, adaptive: true, multiplier: 1 as const, firstIntervalMs: 16, firstFrames: 8 },
    { laneCount: 5, adaptive: true, multiplier: 2 as const, firstIntervalMs: 32, firstFrames: 16 },
    { laneCount: 1, adaptive: true, multiplier: 2 as const, firstIntervalMs: 32, firstFrames: 16 },
    { laneCount: 5, adaptive: false, multiplier: 2 as const, firstIntervalMs: 16, firstFrames: 8 },
  ])("retains every common-prefix observation for $laneCount lanes with adaptive=$adaptive", async ({ laneCount, adaptive, multiplier, firstIntervalMs, firstFrames }) => {
    const clock = new GroupClockV3(), onFrames = vi.fn<(frames: readonly Frame[]) => void>();
    const times = Array.from({ length: laneCount }, () => 0);
    const conductor = new WorkbenchGroupTimeConductorV3({
      lanes: () => times.map((time, index) => laneV3(String(index), time, async count => {
        const frames = framesV3(String(index), times[index]!, count); times[index] = frames.at(-1)!.timeSec; return frames;
      })), onFrames, onError: vi.fn(), nowMs: clock.now, schedule: clock.schedule, cancel: clock.cancel,
      adaptPresentationCadenceToLoad: adaptive,
      presentationCadence: { start() {}, stop() {}, multiplier: () => multiplier },
    });
    conductor.play(); await clock.advanceBy(0); await clock.advanceBy(firstIntervalMs - 1);
    expect(onFrames).not.toHaveBeenCalled();
    await clock.advanceBy(1);
    expect(onFrames).toHaveBeenCalledOnce();
    expect(onFrames.mock.calls[0]![0]).toHaveLength(laneCount * firstFrames);
    for (let i = 0; i < 12; i++) await clock.advanceBy(8);
    // Pausing for a control/capture releases the remaining prefix immediately,
    // without waiting for the next (possibly 32-ms) display boundary.
    const pausedAtMs = clock.now(); await conductor.pause(); expect(clock.now()).toBe(pausedAtMs);
    const all = onFrames.mock.calls.flatMap(([frames]) => frames);
    for (let lane = 0; lane < laneCount; lane++) {
      const observations = all.filter(frame => frame.laneId === String(lane));
      expect(observations).toHaveLength(Math.round(times[lane]! / .002));
      observations.forEach((frame, i) => expect(frame.timeSec).toBeCloseTo((i + 1) * .002, 10));
    }
    for (const [frames] of onFrames.mock.calls) {
      const ends = times.map((_, i) => frames.filter(frame => frame.laneId === String(i)).at(-1)!.timeSec);
      expect(new Set(ends).size).toBe(1);
    }
  });

  it("keeps 60 Hz delivery across a lane-count change when measured pressure is low", async () => {
    const clock = new GroupClockV3(), onFrames = vi.fn<(frames: readonly Frame[]) => void>();
    let times = [0, 0, 0]; let deferred = true;
    const replies = times.map(() => deferredV3<readonly Frame[]>());
    const conductor = new WorkbenchGroupTimeConductorV3({
      lanes: () => times.map((time, index) => laneV3(String(index), time, async count => {
        const frames = deferred ? await replies[index]!.promise : framesV3(String(index), times[index]!, count);
        times[index] = frames.at(-1)!.timeSec; return frames;
      })), onFrames, onError: vi.fn(), nowMs: clock.now, schedule: clock.schedule, cancel: clock.cancel,
      adaptPresentationCadenceToLoad: true,
    });
    conductor.play(); await clock.advanceBy(0);
    expect(() => conductor.lanesChanged()).toThrow(/only while paused/);
    const paused = conductor.pause();
    expect(() => conductor.lanesChanged()).toThrow(/only while paused/);
    replies.forEach((reply, index) => reply.resolve(framesV3(String(index), 0, 16)));
    await paused;
    expect(onFrames).toHaveBeenCalledOnce(); expect(onFrames.mock.calls[0]![0]).toHaveLength(48);
    deferred = false; times.push(.032); conductor.lanesChanged(); onFrames.mockClear();
    conductor.play(); await clock.advanceBy(0); await clock.advanceBy(16);
    expect(onFrames).toHaveBeenCalledOnce(); expect(onFrames.mock.calls[0]![0]).toHaveLength(32);
    await conductor.pause(); times = times.slice(0, 3); conductor.lanesChanged(); onFrames.mockClear();
    conductor.play(); await clock.advanceBy(0); await clock.advanceBy(16);
    expect(onFrames).toHaveBeenCalledOnce(); expect(onFrames.mock.calls[0]![0]).toHaveLength(24);
    await conductor.pause();
  });

  it("changes live display cadence without changing group time or dropping accepted observations", async () => {
    const clock = new GroupClockV3();
    const times = [0, 0, 0, 0, 0];
    const onFrames = vi.fn<(frames: readonly Frame[]) => void>();
    let multiplier: 1 | 2 = 1;
    const cadence = { start: vi.fn(), stop: vi.fn(), multiplier: () => multiplier };
    const conductor = new WorkbenchGroupTimeConductorV3({
      lanes: () => times.map((time, lane) => laneV3(String(lane), time, async count => {
        const frames = framesV3(String(lane), time, count);
        times[lane] = frames.at(-1)!.timeSec; return frames;
      })), onFrames, onError: vi.fn(), nowMs: clock.now,
      schedule: clock.schedule, cancel: clock.cancel,
      adaptPresentationCadenceToLoad: true, presentationCadence: cadence,
    });
    conductor.play();
    for (let i = 0; i < 80; i++) {
      if (i === 11) multiplier = 2;
      if (i === 49) multiplier = 1;
      await clock.advanceBy(7);
    }
    await conductor.pause();
    expect(cadence.start).toHaveBeenCalledOnce();
    expect(cadence.stop).toHaveBeenCalledOnce();
    for (const [batch] of onFrames.mock.calls) {
      expect(new Set(times.map((_, lane) => batch.filter(f => f.laneId === String(lane)).at(-1)!.timeSec)).size).toBe(1);
    }
    const all = onFrames.mock.calls.flatMap(([frames]) => frames);
    for (let lane = 0; lane < times.length; lane++) {
      const frames = all.filter(frame => frame.laneId === String(lane));
      expect(frames).toHaveLength(Math.round(times[lane]! / .002));
      frames.forEach((frame, i) => expect(frame.timeSec).toBeCloseTo((i + 1) * .002, 10));
    }
    // Numerical pacing retains its requested 1x trajectory through both changes.
    expect(times[0]).toBeCloseTo(.576, 10);
  });

  it("uses measured short 32-step requests at high rates without inflating capacity or dropping samples", async () => {
    const clock = new GroupClockV3(), sizes: number[] = [], published: number[] = [];
    const performance = new WorkbenchPerformanceDiagnosticsV3({ enabled: true, nowMs: clock.now });
    let time = 0;
    const conductor = new WorkbenchGroupTimeConductorV3({
      lanes: () => [laneV3("a", time, async count => {
        sizes.push(count); clock.elapse(count * .25);
        const frames = framesV3("a", time, count); time = frames.at(-1)!.timeSec; return frames;
      })], onFrames: frames => published.push(...frames.map(frame => frame.timeSec)), onError: vi.fn(),
      nowMs: clock.now, schedule: clock.schedule, cancel: clock.cancel,
      adaptComputeBatchToPlaybackRate: true, performanceRecorder: performance,
    });
    conductor.setPlaybackRate(4); conductor.play();
    for (let attempt = 0; sizes.length < 24 && attempt < 100; attempt++) await clock.runNextTimer();
    expect(sizes.slice(0, 4)).toEqual([16, 16, 16, 16]);
    expect(sizes.slice(4)).toEqual(Array(sizes.length - 4).fill(32));
    expect(performance.snapshot().values["scheduler.group.model-time-ratio"]).toMatchObject({ minimum: 8, maximum: 8 });
    expect(conductor.playbackRateState().maximumRate).toBe(5);
    await conductor.pause();
    expect(published).toHaveLength(sizes.reduce((sum, count) => sum + count, 0));
    published.forEach((acceptedTime, index) => expect(acceptedTime).toBeCloseTo((index + 1) * .002, 10));
  });

  it.each([
    { rate: 1, adaptive: true, batchSteps: 16, perStepMs: .25, eligible: true },
    { rate: 4, adaptive: false, batchSteps: 16, perStepMs: .25, eligible: true },
    { rate: 4, adaptive: true, batchSteps: 8, perStepMs: .25, eligible: true },
    { rate: 4, adaptive: true, batchSteps: 16, perStepMs: .8, eligible: true },
    { rate: 4, adaptive: true, batchSteps: 16, perStepMs: .25, eligible: false },
  ])("keeps configured batching for ineligible cost/rate/profile evidence $rate/$adaptive/$batchSteps/$perStepMs/$eligible", async ({ rate, adaptive, batchSteps, perStepMs, eligible }) => {
    const clock = new GroupClockV3(), sizes: number[] = []; let time = 0;
    const conductor = new WorkbenchGroupTimeConductorV3({
      lanes: () => [laneV3("a", time, async count => {
        sizes.push(count); clock.elapse(count * perStepMs);
        const frames = framesV3("a", time, count); time = frames.at(-1)!.timeSec; return frames;
      })], onFrames: vi.fn(), onError: vi.fn(), nowMs: clock.now, schedule: clock.schedule, cancel: clock.cancel,
      batchSteps, adaptComputeBatchToPlaybackRate: adaptive, capacityMeasurementEligible: () => eligible,
    });
    conductor.setPlaybackRate(rate); conductor.play();
    for (let attempt = 0; sizes.length < 10 && attempt < 100; attempt++) await clock.runNextTimer();
    expect(sizes).toHaveLength(10); expect(sizes).toEqual(Array(10).fill(batchSteps)); await conductor.pause();
  });

  it("returns a whole group to 16 after slow work and requires renewed headroom before growing again", async () => {
    const clock = new GroupClockV3(), sizes: number[][] = Array.from({ length: 5 }, () => []), times = [0, 0, 0, 0, 0];
    const published: Frame[] = []; let perStepMs = .5;
    const performance = new WorkbenchPerformanceDiagnosticsV3({ enabled: true, nowMs: clock.now });
    const conductor = new WorkbenchGroupTimeConductorV3({
      lanes: () => times.map((time, lane) => laneV3(String(lane), time, async count => {
        sizes[lane]!.push(count);
        // The last lane owns the shared barrier completion in this synthetic clock.
        if (lane === 4) clock.elapse(count * perStepMs);
        const frames = framesV3(String(lane), times[lane]!, count); times[lane] = frames.at(-1)!.timeSec; return frames;
      })), onFrames: frames => published.push(...frames), onError: vi.fn(), nowMs: clock.now, schedule: clock.schedule, cancel: clock.cancel,
      adaptComputeBatchToPlaybackRate: true, adaptPresentationCadenceToLoad: true, performanceRecorder: performance,
    });
    const complete = async (count: number) => {
      const target = sizes[0]!.length + count;
      for (let attempt = 0; sizes[0]!.length < target && attempt < 100; attempt++) await clock.runNextTimer();
      expect(sizes[0]!.length).toBe(target);
    };
    conductor.setPlaybackRate(2); conductor.play(); await complete(5); expect(sizes[0]!.at(-1)).toBe(32);
    perStepMs = 22 / 32; await complete(5); expect(sizes[0]!.slice(-5)).toEqual(Array(5).fill(32));
    perStepMs = 26 / 32; await complete(2); expect(sizes[0]!.slice(-2)).toEqual([32, 16]);
    perStepMs = 21 / 32; await complete(5); expect(sizes[0]!.slice(-5)).toEqual(Array(5).fill(16));
    perStepMs = .5; await complete(5); expect(sizes[0]!.at(-1)).toBe(32);
    const backlog = performance.snapshot().values["scheduler.group.presentation-backlog-frames-per-lane"]!;
    expect(backlog.maximum).toBeLessThanOrEqual(80);
    await conductor.pause();
    for (let lane = 0; lane < 5; lane++) {
      expect(sizes[lane]).toEqual(sizes[0]);
      const frames = published.filter(frame => frame.laneId === String(lane));
      expect(frames).toHaveLength(sizes[lane]!.reduce((sum, count) => sum + count, 0));
      frames.forEach((frame, index) => expect(frame.timeSec).toBeCloseTo((index + 1) * .002, 10));
    }
    conductor.lanesChanged(); conductor.play(); await complete(1); expect(sizes[0]!.at(-1)).toBe(16); await conductor.pause();
  });

  it("preserves an in-flight 32-step request when lowering rate or pausing for a control", async () => {
    const clock = new GroupClockV3(), sizes: number[] = [], published: number[] = [];
    const reply = deferredV3<readonly Frame[]>(); let time = 0;
    const performance = new WorkbenchPerformanceDiagnosticsV3({ enabled: true, nowMs: clock.now });
    const conductor = new WorkbenchGroupTimeConductorV3({
      lanes: () => [laneV3("a", time, async count => {
        sizes.push(count);
        const frames = sizes.length === 5 ? await reply.promise : framesV3("a", time, count);
        clock.elapse(count * .25); time = frames.at(-1)!.timeSec; return frames;
      })], onFrames: frames => published.push(...frames.map(frame => frame.timeSec)), onError: vi.fn(),
      nowMs: clock.now, schedule: clock.schedule, cancel: clock.cancel,
      adaptComputeBatchToPlaybackRate: true, performanceRecorder: performance,
    });
    conductor.setPlaybackRate(4); conductor.play();
    for (let attempt = 0; sizes.length < 5 && attempt < 100; attempt++) await clock.runNextTimer();
    expect(sizes).toEqual([16, 16, 16, 16, 32]);
    conductor.setPlaybackRate(1); const pause = conductor.pause(); reply.resolve(framesV3("a", time, 32)); await pause;
    expect(published).toHaveLength(96);
    expect(performance.snapshot().values["scheduler.group.requested-batch-steps"]!.latest).toBe(32);
    expect(performance.snapshot().values["scheduler.group.model-time-ratio"]!.latest).toBe(8);
    conductor.play(); await clock.runNextTimer(); expect(sizes.at(-1)).toBe(16); await conductor.pause();
  });

  it("starts at real time and measures capacity without changing the requested pace", async () => {
    const clock = new GroupClockV3();
    let acceptedTimeSec = 0;
    let groupWallMs = 16;
    const conductor = new WorkbenchGroupTimeConductorV3({
      lanes: () => [laneV3("baseline", acceptedTimeSec, async (stepCount) => {
        clock.elapse(groupWallMs);
        const frames = framesV3("baseline", acceptedTimeSec, stepCount);
        acceptedTimeSec = frames.at(-1)!.timeSec;
        return frames;
      })],
      onFrames: vi.fn(),
      onError: vi.fn(),
      nowMs: clock.now,
      schedule: clock.schedule,
      cancel: clock.cancel,
      presentationIntervalMs: 0,
    });

    expect(conductor.playbackRateState()).toMatchObject({
      playbackRate: 1,
      calibrating: true,
      userSelected: false,
    });
    conductor.play();
    for (let attempt = 0; attempt < 24; attempt += 1) {
      await clock.runNextTimer();
      if (!conductor.playbackRateState().calibrating) break;
    }
    expect(conductor.playbackRateState()).toMatchObject({
      playbackRate: 1,
      maximumRate: 1.5,
      calibrating: false,
      userSelected: false,
    });

    expect(conductor.setPlaybackRate(1.5)).toMatchObject({
      playbackRate: 1.5,
      maximumRate: 1.5,
      userSelected: true,
    });
    expect(() => conductor.setPlaybackRate(2)).toThrow(/calibrated limit/);

    groupWallMs = 40;
    for (let attempt = 0; attempt < 16; attempt += 1) {
      await clock.runNextTimer();
    }
    expect(conductor.playbackRateState()).toMatchObject({
      playbackRate: 1.5,
      maximumRate: 1.5,
      performanceLimited: true,
    });
    groupWallMs = 16;
    for (let attempt = 0; attempt < 16; attempt += 1) {
      await clock.runNextTimer();
    }
    expect(conductor.playbackRateState()).toMatchObject({
      playbackRate: 1.5,
      maximumRate: 1.5,
      performanceLimited: false,
    });
    await conductor.pause();
  });

  it.each([{ wallMs: 50, rate: 0.5 }, { wallMs: 160, rate: 0.25 }])(
    "reports a genuinely slow workload without replacing its requested pace ($wallMs ms/batch)",
    async ({ wallMs, rate }) => {
    const clock = new GroupClockV3();
    let acceptedTimeSec = 0;
    const conductor = new WorkbenchGroupTimeConductorV3({
      lanes: () => [laneV3("baseline", acceptedTimeSec, async (stepCount) => {
        clock.elapse(wallMs);
        const frames = framesV3("baseline", acceptedTimeSec, stepCount);
        acceptedTimeSec = frames.at(-1)!.timeSec;
        return frames;
      })],
      onFrames: vi.fn(),
      onError: vi.fn(),
      nowMs: clock.now,
      schedule: clock.schedule,
      cancel: clock.cancel,
      presentationIntervalMs: 0,
    });

    conductor.play();
    for (let attempt = 0; attempt < 24; attempt += 1) {
      await clock.runNextTimer();
      if (!conductor.playbackRateState().calibrating) break;
    }
    expect(conductor.playbackRateState()).toMatchObject({
      playbackRate: 1,
      maximumRate: rate,
      calibrating: false,
      userSelected: false,
      performanceLimited: true,
    });
    // Actual model time follows completed computation, never a fabricated 1×
    // wall clock, and no extra idle time is imposed by the coarse capacity tier.
    expect(acceptedTimeSec / (clock.now() / 1_000)).toBeCloseTo(32 / wallMs, 8);
    conductor.setPlaybackRate(0.25);
    expect(conductor.setPlaybackRate(1)).toMatchObject({ playbackRate: 1, userSelected: true });
    expect(() => conductor.setPlaybackRate(1.25)).toThrow(/calibrated limit/);
    await conductor.pause();
  });

  it("bounds normal presentation queues and keeps slow Scenarios synchronized at a requested 1×", async () => {
    const clock = new GroupClockV3();
    const performance = new WorkbenchPerformanceDiagnosticsV3({ enabled: true, nowMs: clock.now });
    const accepted = new Map([["fast", 0], ["slow", 0]]);
    const inFlight = new Map([["fast", 0], ["slow", 0]]);
    const published = new Map<string, number[]>([["fast", []], ["slow", []]]);
    let maximumConcurrentPerLane = 0;
    const onError = vi.fn();
    const conductor = new WorkbenchGroupTimeConductorV3({
      lanes: () => [...accepted].map(([id, time]) => laneV3(id, time, stepCount => new Promise(resolve => {
        inFlight.set(id, inFlight.get(id)! + 1);
        maximumConcurrentPerLane = Math.max(maximumConcurrentPerLane, inFlight.get(id)!);
        clock.schedule(() => {
          const frames = framesV3(id, time, stepCount);
          accepted.set(id, frames.at(-1)!.timeSec);
          inFlight.set(id, inFlight.get(id)! - 1);
          resolve(frames);
        }, id === "fast" ? 10 : 50);
      }))),
      onFrames: frames => {
        for (const frame of frames) published.get(frame.laneId)!.push(frame.timeSec);
        expect(published.get("fast")).toEqual(published.get("slow"));
      },
      onError, nowMs: clock.now, schedule: clock.schedule, cancel: clock.cancel,
      performanceRecorder: performance,
      // Production defaults: 16 accepted steps, then synchronized 16 ms slices.
    });
    conductor.play();
    await clock.advanceBy(0);
    for (let ms = 0; ms < 2_000; ms++) await clock.advanceBy(1);
    expect(conductor.playbackRateState()).toMatchObject({ playbackRate: 1, maximumRate: 0.5, performanceLimited: true });
    expect(maximumConcurrentPerLane).toBe(1);
    expect(performance.snapshot().values["scheduler.group.requested-playback-rate"]!.latest).toBe(1);
    expect(performance.snapshot().values["scheduler.group.safe-playback-rate"]!.latest).toBe(0.5);
    expect(performance.snapshot().values["scheduler.group.presentation-backlog-frames-per-lane"]!.maximum).toBeLessThanOrEqual(16);
    expect(published.get("slow")!.at(-1)).toBeCloseTo(1.28, 8);
    const paused = conductor.pause();
    await clock.advanceBy(100);
    await paused;
    for (const times of published.values()) {
      times.forEach((time, index) => expect(time).toBeCloseTo((index + 1) * 0.002, 8));
    }
    expect(onError).not.toHaveBeenCalled();
  });

  it("excludes hidden batches from calibration", async () => {
    const clock = new GroupClockV3();
    const performance = new WorkbenchPerformanceDiagnosticsV3({
      enabled: true,
      nowMs: clock.now,
    });
    let acceptedTimeSec = 0;
    let eligible = false;
    const conductor = new WorkbenchGroupTimeConductorV3({
      lanes: () => [laneV3("baseline", acceptedTimeSec, async (stepCount) => {
        clock.elapse(eligible ? 16 : 64);
        const frames = framesV3("baseline", acceptedTimeSec, stepCount);
        acceptedTimeSec = frames.at(-1)!.timeSec;
        return frames;
      })],
      onFrames: vi.fn(),
      onError: vi.fn(),
      capacityMeasurementEligible: () => eligible,
      nowMs: clock.now,
      schedule: clock.schedule,
      cancel: clock.cancel,
      presentationIntervalMs: 0,
      performanceRecorder: performance,
    });

    conductor.play();
    for (let attempt = 0; attempt < 12; attempt += 1) {
      await clock.runNextTimer();
    }
    expect(conductor.playbackRateState()).toMatchObject({
      maximumRate: null,
      calibrating: true,
    });

    eligible = true;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      await clock.runNextTimer();
      if (!conductor.playbackRateState().calibrating) break;
    }
    expect(conductor.playbackRateState()).toMatchObject({
      playbackRate: 1,
      maximumRate: 1.5,
      calibrating: false,
    });
    const counters = performance.snapshot().counters;
    expect(counters["scheduler.group.capacity-samples-rejected"])
      .toBeGreaterThanOrEqual(12);
    expect(counters["scheduler.group.capacity-samples-accepted"])
      .toBeGreaterThanOrEqual(12);
    await conductor.pause();
  });

  it("excludes a hidden batch even when the tab becomes visible before its reply", async () => {
    const clock = new GroupClockV3();
    const performance = new WorkbenchPerformanceDiagnosticsV3({
      enabled: true,
      nowMs: clock.now,
    });
    let eligible = false;
    const conductor = new WorkbenchGroupTimeConductorV3({
      lanes: () => [laneV3("baseline", 0, async (stepCount) => {
        clock.elapse(64);
        eligible = true;
        return framesV3("baseline", 0, stepCount);
      })],
      onFrames: vi.fn(),
      onError: vi.fn(),
      capacityMeasurementEligible: () => eligible,
      nowMs: clock.now,
      schedule: clock.schedule,
      cancel: clock.cancel,
      presentationIntervalMs: 0,
      performanceRecorder: performance,
    });
    conductor.play();
    await clock.runNextTimer();
    expect(performance.snapshot().counters[
      "scheduler.group.capacity-samples-rejected"
    ]).toBe(1);
    expect(performance.snapshot().counters[
      "scheduler.group.capacity-samples-accepted"
    ]).toBeUndefined();
    await conductor.pause();
  });

  it.each([false, true])(
    "recovers from a slow startup without replacing explicit selection (%s)",
    async (userSelected) => {
    const clock = new GroupClockV3();
    const performance = new WorkbenchPerformanceDiagnosticsV3({
      enabled: true,
      nowMs: clock.now,
    });
    let acceptedTimeSec = 0;
    let groupWallMs = 50;
    let visible = true;
    const conductor = new WorkbenchGroupTimeConductorV3({
      lanes: () => [laneV3("baseline", acceptedTimeSec, async (stepCount) => {
        clock.elapse(groupWallMs);
        const frames = framesV3("baseline", acceptedTimeSec, stepCount);
        acceptedTimeSec = frames.at(-1)!.timeSec;
        return frames;
      })],
      onFrames: vi.fn(),
      onError: vi.fn(),
      capacityMeasurementEligible: () => visible,
      nowMs: clock.now,
      schedule: clock.schedule,
      cancel: clock.cancel,
      presentationIntervalMs: 0,
      performanceRecorder: performance,
    });

    conductor.play();
    for (let attempt = 0; attempt < 24; attempt += 1) {
      await clock.runNextTimer();
      if (!conductor.playbackRateState().calibrating) break;
    }
    expect(conductor.playbackRateState()).toMatchObject({
      playbackRate: 1,
      maximumRate: 0.5,
      calibrating: false,
      performanceLimited: true,
    });

    if (userSelected) conductor.setPlaybackRate(0.5);
    visible = false;
    groupWallMs = 160;
    for (let attempt = 0; attempt < 24; attempt += 1) {
      await clock.runNextTimer();
    }
    expect(conductor.playbackRateState()).toMatchObject({
      playbackRate: userSelected ? 0.5 : 1,
      maximumRate: 0.5,
      performanceLimited: !userSelected,
    });

    visible = true;
    groupWallMs = 16;
    for (let attempt = 0; attempt < 24; attempt += 1) {
      await clock.runNextTimer();
    }
    expect(conductor.playbackRateState()).toMatchObject({
      playbackRate: userSelected ? 0.5 : 1,
      maximumRate: 1.5,
      calibrating: false,
      userSelected,
      performanceLimited: false,
    });
    expect(
      performance.snapshot().counters[
        "scheduler.group.safe-playback-rate-promotions"
      ],
    ).toBe(1);
    await conductor.pause();
  });

  it("rounds a device ceiling down to a stable 0.5× tier", async () => {
    const clock = new GroupClockV3();
    let acceptedTimeSec = 0;
    const groupWallMs = 32 * 0.9 / 4.65;
    const conductor = new WorkbenchGroupTimeConductorV3({
      lanes: () => [laneV3("baseline", acceptedTimeSec, async (stepCount) => {
        clock.elapse(groupWallMs);
        const frames = framesV3("baseline", acceptedTimeSec, stepCount);
        acceptedTimeSec = frames.at(-1)!.timeSec;
        return frames;
      })],
      onFrames: vi.fn(),
      onError: vi.fn(),
      nowMs: clock.now,
      schedule: clock.schedule,
      cancel: clock.cancel,
      presentationIntervalMs: 0,
    });

    conductor.play();
    for (let attempt = 0; attempt < 24; attempt += 1) {
      await clock.runNextTimer();
      if (!conductor.playbackRateState().calibrating) break;
    }
    expect(conductor.playbackRateState()).toMatchObject({
      playbackRate: 1,
      maximumRate: 4.5,
      calibrating: false,
    });
    await conductor.pause();
  });

  it("slices every Scenario at the same presentation offset", async () => {
    const clock = new GroupClockV3();
    const onFrames = vi.fn<(frames: readonly Frame[]) => void>();
    const accepted = new Map([["baseline", 0], ["comparison", 0]]);
    const lanes = ["baseline", "comparison"].map((laneId) =>
      laneV3(laneId, accepted.get(laneId)!, async (stepCount) => {
        const frames = framesV3(laneId, accepted.get(laneId)!, stepCount);
        accepted.set(laneId, frames.at(-1)!.timeSec);
        return frames;
      }));
    const conductor = new WorkbenchGroupTimeConductorV3({
      lanes: () => lanes.map((lane) => Object.freeze({
        ...lane,
        acceptedTimeSec: accepted.get(lane.laneId)!,
      })),
      onFrames,
      onError: vi.fn(),
      nowMs: clock.now,
      schedule: clock.schedule,
      cancel: clock.cancel,
      batchSteps: 4,
      presentationIntervalMs: 16,
      maximumPresentationFramesPerLane: 4,
    });

    conductor.setPlaybackRate(0.5);
    conductor.play();
    await clock.advanceBy(0);
    await flushMicrotasksV3();
    expect(onFrames).not.toHaveBeenCalled();

    await clock.advanceBy(16);
    expect(onFrames).toHaveBeenCalledOnce();
    expect(onFrames.mock.calls[0]![0].map(({ index }) => index))
      .toEqual([1, 2, 1, 2]);

    await clock.advanceBy(16);
    expect(onFrames).toHaveBeenCalledTimes(2);
    expect(onFrames.mock.calls[1]![0].map(({ index }) => index))
      .toEqual([3, 4, 3, 4]);
    await conductor.pause();
  });

  it("uses fractional presentation credit for sub-unit playback", async () => {
    const clock = new GroupClockV3();
    const onFrames = vi.fn<(frames: readonly Frame[]) => void>();
    let acceptedTimeSec = 0;
    const conductor = new WorkbenchGroupTimeConductorV3({
      lanes: () => [laneV3("baseline", acceptedTimeSec, async (stepCount) => {
        const frames = framesV3("baseline", acceptedTimeSec, stepCount);
        acceptedTimeSec = frames.at(-1)!.timeSec;
        return frames;
      })],
      onFrames,
      onError: vi.fn(),
      nowMs: clock.now,
      schedule: clock.schedule,
      cancel: clock.cancel,
      batchSteps: 4,
      presentationIntervalMs: 16,
      maximumPresentationFramesPerLane: 2,
    });

    conductor.setPlaybackRate(0.25);
    conductor.play();
    await clock.advanceBy(0);
    await clock.advanceBy(16);
    expect(onFrames).not.toHaveBeenCalled();

    await clock.advanceBy(16);
    expect(onFrames).toHaveBeenCalledOnce();
    expect(onFrames.mock.calls[0]![0].map(({ index }) => index)).toEqual([1]);

    await clock.advanceBy(32);
    expect(onFrames).toHaveBeenCalledTimes(2);
    expect(onFrames.mock.calls[1]![0].map(({ index }) => index)).toEqual([2]);
    await conductor.pause();
  });

  it.each([
    { label: "0.25×", requestedRate: 0.25, minimumRate: 0.25, maximumRate: 5 },
    { label: "0.5×", requestedRate: 0.5, minimumRate: 0.25, maximumRate: 5 },
    { label: "1×", requestedRate: 1, minimumRate: 0.25, maximumRate: 5 },
    { label: "5×", requestedRate: 5, minimumRate: 0.25, maximumRate: 5 },
  ])("paces visible model time uniformly at $label", async ({
    requestedRate,
    minimumRate,
    maximumRate,
  }) => {
    const clock = new GroupClockV3();
    let acceptedTimeSec = 0;
    let presentedFrames = 0;
    const conductor = new WorkbenchGroupTimeConductorV3({
      lanes: () => [laneV3("baseline", acceptedTimeSec, async (stepCount) => {
        const frames = framesV3("baseline", acceptedTimeSec, stepCount);
        acceptedTimeSec = frames.at(-1)!.timeSec;
        return frames;
      })],
      onFrames: (frames) => { presentedFrames += frames.length; },
      onError: vi.fn(),
      nowMs: clock.now,
      schedule: clock.schedule,
      cancel: clock.cancel,
      batchSteps: 16,
      presentationIntervalMs: 16,
      maximumPresentationFramesPerLane: 8,
      minimumPlaybackRate: minimumRate,
      maximumPlaybackRate: maximumRate,
    });

    const effectiveRate = conductor.setPlaybackRate(requestedRate)
      .playbackRate;
    conductor.play();
    await clock.advanceBy(0);
    for (let elapsedDeciMs = 0; elapsedDeciMs <= 16_000; elapsedDeciMs += 1) {
      await clock.advanceBy(0.1);
    }

    const expectedFrames = Math.floor(100 * 8 * effectiveRate + 1e-9);
    // A newly started lane may spend one presentation boundary filling its
    // initial queue. That fixed startup cost must not turn into
    // rate-dependent drift over the steady interval.
    expect(Math.abs(presentedFrames - expectedFrames)).toBeLessThanOrEqual(40);
    expect(presentedFrames * 0.002 / 1.6).toBeCloseTo(effectiveRate, 1);
    await conductor.pause();
  });

  it("re-times queued compute when the user raises the group rate", async () => {
    const clock = new GroupClockV3();
    const presentedTimes: number[] = [];
    let acceptedTimeSec = 0;
    const conductor = new WorkbenchGroupTimeConductorV3({
      lanes: () => [laneV3("baseline", acceptedTimeSec, async (stepCount) => {
        const frames = framesV3("baseline", acceptedTimeSec, stepCount);
        acceptedTimeSec = frames.at(-1)!.timeSec;
        return frames;
      })],
      onFrames: (frames) => {
        presentedTimes.push(...frames.map(({ timeSec }) => timeSec));
      },
      onError: vi.fn(),
      nowMs: clock.now,
      schedule: clock.schedule,
      cancel: clock.cancel,
      batchSteps: 16,
      presentationIntervalMs: 16,
      maximumPresentationFramesPerLane: 8,
      minimumPlaybackRate: 0.25,
      maximumPlaybackRate: 1,
    });

    conductor.setPlaybackRate(0.5);
    conductor.play();
    await clock.advanceBy(0);
    expect(acceptedTimeSec).toBeCloseTo(0.032);

    await clock.advanceBy(8);
    const raisedRate = conductor.setPlaybackRate(1).playbackRate;
    await clock.advanceBy(0);
    expect(acceptedTimeSec).toBeCloseTo(0.032);
    expect(presentedTimes).toEqual([]);

    await clock.advanceBy(16);
    await clock.advanceBy(16);
    const expectedFrameCount = Math.floor(2 * 8 * raisedRate + 1e-9);
    expect(presentedTimes).toEqual(
      Array.from(
        { length: expectedFrameCount },
        (_, index) => (index + 1) * 0.002,
      ),
    );
    await clock.advanceBy(6);
    expect(acceptedTimeSec).toBeCloseTo(0.064);
    await conductor.pause();
  });

  it("keeps the presentation queue bounded above real time", async () => {
    const clock = new GroupClockV3();
    const performance = new WorkbenchPerformanceDiagnosticsV3({
      enabled: true,
      nowMs: clock.now,
    });
    let acceptedTimeSec = 0;
    const conductor = new WorkbenchGroupTimeConductorV3({
      lanes: () => [laneV3("baseline", acceptedTimeSec, async (stepCount) => {
        clock.elapse(1);
        const frames = framesV3("baseline", acceptedTimeSec, stepCount);
        acceptedTimeSec = frames.at(-1)!.timeSec;
        return frames;
      })],
      onFrames: vi.fn(),
      onError: vi.fn(),
      nowMs: clock.now,
      schedule: clock.schedule,
      cancel: clock.cancel,
      batchSteps: 8,
      presentationIntervalMs: 16,
      maximumPresentationFramesPerLane: 8,
      performanceRecorder: performance,
    });

    conductor.play();
    await clock.advanceBy(0);
    for (let elapsedMs = 0; elapsedMs < 500; elapsedMs += 1) {
      await clock.advanceBy(1);
    }

    expect(conductor.playbackRateState()).toMatchObject({
      playbackRate: 1,
      maximumRate: 5,
    });
    const backlog = performance.snapshot().values[
      "scheduler.group.presentation-backlog-frames-per-lane"
    ];
    expect(backlog).toBeDefined();
    expect(backlog!.maximum).toBeLessThanOrEqual(32);
    expect(backlog!.latest).toBeLessThanOrEqual(16);
    await conductor.pause();
  });

  it("subtracts synchronous presentation work from the next absolute compute deadline", async () => {
    const clock = new GroupClockV3();
    const starts: number[] = [], published: number[] = [];
    let acceptedTimeSec = 0;
    const conductor = new WorkbenchGroupTimeConductorV3({
      lanes: () => [laneV3("baseline", acceptedTimeSec, async stepCount => {
        starts.push(clock.now());
        clock.elapse(24);
        const frames = framesV3("baseline", acceptedTimeSec, stepCount);
        acceptedTimeSec = frames.at(-1)!.timeSec;
        return frames;
      })],
      onFrames: frames => { published.push(...frames.map(frame => frame.timeSec)); clock.elapse(8); },
      onError: vi.fn(), nowMs: clock.now, schedule: clock.schedule, cancel: clock.cancel,
      presentationIntervalMs: 0,
    });
    conductor.play();
    await clock.runNextTimer();
    await clock.runNextTimer();
    expect(starts).toEqual([0, 32]);
    await conductor.pause();
    expect(published).toHaveLength(32);
    published.forEach((time, index) => expect(time).toBeCloseTo((index + 1) * .002, 10));
  });

  it("notifies once for multiple credited batches without dropping either lane's accepted prefix", async () => {
    const clock = new GroupClockV3();
    const accepted = new Map([["baseline", 0], ["comparison", 0]]);
    const onFrames = vi.fn<(frames: readonly Frame[]) => void>();
    const conductor = new WorkbenchGroupTimeConductorV3({
      lanes: () => [...accepted].map(([id, time]) => laneV3(id, time, async count => {
        const frames = framesV3(id, time, count); accepted.set(id, frames.at(-1)!.timeSec); return frames;
      })),
      onFrames, onError: vi.fn(), nowMs: clock.now, schedule: clock.schedule, cancel: clock.cancel,
    });
    conductor.setPlaybackRate(4);
    conductor.play();
    await clock.advanceBy(0);
    await clock.advanceBy(8);
    expect(onFrames).not.toHaveBeenCalled();
    await clock.advanceBy(8);
    expect(onFrames).toHaveBeenCalledOnce();
    const released = onFrames.mock.calls[0]![0];
    for (const id of accepted.keys()) {
      const times = released.filter(frame => frame.laneId === id).map(frame => frame.timeSec);
      expect(times).toHaveLength(32);
      times.forEach((time, index) => expect(time).toBeCloseTo((index + 1) * .002, 10));
    }
    await conductor.pause();
  });

  it("re-anchors compute after a long stall instead of replaying missed deadlines", async () => {
    const clock = new GroupClockV3();
    const performance = new WorkbenchPerformanceDiagnosticsV3({
      enabled: true,
      nowMs: clock.now,
    });
    let acceptedTimeSec = 0;
    let advanceCount = 0;
    let presentedFrameCount = 0;
    const conductor = new WorkbenchGroupTimeConductorV3({
      lanes: () => [laneV3("baseline", acceptedTimeSec, async (stepCount) => {
        advanceCount += 1;
        clock.elapse(advanceCount === 1 ? 10_000 : 1);
        const frames = framesV3("baseline", acceptedTimeSec, stepCount);
        acceptedTimeSec = frames.at(-1)!.timeSec;
        return frames;
      })],
      onFrames: (frames) => { presentedFrameCount += frames.length; },
      onError: vi.fn(),
      nowMs: clock.now,
      schedule: clock.schedule,
      cancel: clock.cancel,
      batchSteps: 16,
      presentationIntervalMs: 16,
      maximumPresentationFramesPerLane: 8,
      performanceRecorder: performance,
    });

    conductor.play();
    await clock.advanceBy(0);

    // The completed stalled batch may be followed by one immediate batch.
    // Older wall deadlines are discarded rather than converted into accepted
    // model work and a many-second presentation queue.
    expect(advanceCount).toBe(2);
    expect(acceptedTimeSec).toBeCloseTo(0.064);
    const backlog = performance.snapshot().values[
      "scheduler.group.presentation-backlog-frames-per-lane"
    ];
    expect(backlog).toBeDefined();
    expect(backlog!.maximum).toBeLessThanOrEqual(16);
    expect(backlog!.latest).toBeLessThanOrEqual(16);

    await conductor.pause();
    expect(presentedFrameCount).toBe(32);
  });

  it("repays brief reply overruns without drifting or changing either lane's accepted prefix", async () => {
    const clock = new GroupClockV3(), starts: number[] = [], published: Frame[] = [];
    const accepted = [0, 0];
    const conductor = new WorkbenchGroupTimeConductorV3({
      lanes: () => accepted.map((time, lane) => laneV3(String(lane), time, async count => {
        if (lane === 0) starts.push(clock.now());
        if (lane === 1) clock.elapse(starts.length % 2 === 1 ? 18 : 10);
        const frames = framesV3(String(lane), time, count); accepted[lane] = frames.at(-1)!.timeSec; return frames;
      })),
      onFrames: frames => published.push(...frames), onError: vi.fn(),
      nowMs: clock.now, schedule: clock.schedule, cancel: clock.cancel,
      batchSteps: 32, presentationIntervalMs: 16, maximumPresentationFramesPerLane: 8,
      capacityMeasurementEligible: () => true,
    });
    conductor.setPlaybackRate(4); conductor.play();
    for (let attempt = 0; starts.length < 10 && attempt < 30; attempt++) await clock.runNextTimer();
    expect(starts).toEqual([0, 18, 32, 50, 64, 82, 96, 114, 128, 146]);
    await conductor.pause();
    for (const lane of ["0", "1"]) {
      const times = published.filter(frame => frame.laneId === lane).map(frame => frame.timeSec);
      expect(times).toHaveLength(320);
      times.forEach((time, index) => expect(time).toBeCloseTo((index + 1) * .002, 10));
    }
    clock.elapse(1_000);
    const resumedAt = clock.now();
    conductor.setPlaybackRate(1); conductor.play();
    for (let attempt = 0; starts.length < 12 && attempt < 20; attempt++) await clock.runNextTimer();
    expect(starts.slice(-2)).toEqual([resumedAt, resumedAt + 64]);
    await conductor.pause();
  });

  it("bounds accumulated debt under sustained insufficient capacity instead of replaying missed model time", async () => {
    const clock = new GroupClockV3(), starts: number[] = [], published: Frame[] = [];
    const performance = new WorkbenchPerformanceDiagnosticsV3({ enabled: true, nowMs: clock.now });
    let time = 0;
    const conductor = new WorkbenchGroupTimeConductorV3({
      lanes: () => [laneV3("a", time, async count => {
        starts.push(clock.now()); clock.elapse(24);
        const frames = framesV3("a", time, count); time = frames.at(-1)!.timeSec; return frames;
      })], onFrames: frames => published.push(...frames), onError: vi.fn(),
      nowMs: clock.now, schedule: clock.schedule, cancel: clock.cancel,
      batchSteps: 32, capacityMeasurementEligible: () => true, performanceRecorder: performance,
    });
    conductor.setPlaybackRate(4); conductor.play();
    for (let attempt = 0; starts.length < 24 && attempt < 50; attempt++) await clock.runNextTimer();
    expect(starts).toEqual(Array.from({ length: 24 }, (_, index) => index * 24));
    expect(time / (clock.now() / 1_000)).toBeCloseTo(64 / 24, 10);
    const diagnostics = performance.snapshot();
    expect(diagnostics.values["scheduler.group.retained-compute-deadline-debt-ms"]!.maximum).toBe(16);
    expect(diagnostics.metrics["scheduler.group.discarded-compute-deadline-debt"]!.count).toBe(8);
    expect(diagnostics.values["scheduler.group.presentation-backlog-frames-per-lane"]!.maximum).toBeLessThanOrEqual(32);
    await conductor.pause();
    expect(published).toHaveLength(24 * 32);
  });

  it.each([[false, true], [true, false], [false, false]])(
    "does not retain short debt for work whose visibility eligibility changes %s→%s",
    async (startEligible, endEligible) => {
      const clock = new GroupClockV3(), starts: number[] = []; let time = 0, eligible = startEligible;
      const conductor = new WorkbenchGroupTimeConductorV3({
        lanes: () => [laneV3("a", time, async count => {
          starts.push(clock.now()); clock.elapse(starts.length === 1 ? 18 : 10); eligible = endEligible;
          const frames = framesV3("a", time, count); time = frames.at(-1)!.timeSec; return frames;
        })], onFrames: vi.fn(), onError: vi.fn(), nowMs: clock.now, schedule: clock.schedule, cancel: clock.cancel,
        batchSteps: 32, presentationIntervalMs: 0, capacityMeasurementEligible: () => eligible,
      });
      conductor.setPlaybackRate(4); conductor.play();
      for (let step = 0; step < 3; step++) await clock.runNextTimer();
      expect(starts).toEqual([0, 18, 34]);
      await conductor.pause();
    },
  );

  it("fails closed before publishing a lane with an off-tick clock", async () => {
    const clock = new GroupClockV3();
    const onFrames = vi.fn();
    const onError = vi.fn();
    const conductor = new WorkbenchGroupTimeConductorV3({
      lanes: () => [laneV3("baseline", 0, async () => Object.freeze([
        Object.freeze({ laneId: "baseline", timeSec: 0.003, index: 1 }),
      ]))],
      onFrames,
      onError,
      nowMs: clock.now,
      schedule: clock.schedule,
      cancel: clock.cancel,
      batchSteps: 1,
      presentationIntervalMs: 0,
    });

    conductor.play();
    await clock.advanceBy(0);
    await vi.waitFor(() => expect(onError).toHaveBeenCalledOnce());
    expect(onFrames).not.toHaveBeenCalled();
    expect(conductor.running).toBe(false);
  });

  it("flushes the complete aligned prefix when playback pauses", async () => {
    const clock = new GroupClockV3();
    const onFrames = vi.fn<(frames: readonly Frame[]) => void>();
    let acceptedTimeSec = 0;
    const conductor = new WorkbenchGroupTimeConductorV3({
      lanes: () => [laneV3("baseline", acceptedTimeSec, async (stepCount) => {
        const frames = framesV3("baseline", acceptedTimeSec, stepCount);
        acceptedTimeSec = frames.at(-1)!.timeSec;
        return frames;
      })],
      onFrames,
      onError: vi.fn(),
      nowMs: clock.now,
      schedule: clock.schedule,
      cancel: clock.cancel,
      batchSteps: 4,
      presentationIntervalMs: 16,
      maximumPresentationFramesPerLane: 2,
    });

    conductor.play();
    await clock.advanceBy(0);
    await flushMicrotasksV3();
    expect(onFrames).not.toHaveBeenCalled();

    await conductor.pause();
    expect(onFrames).toHaveBeenCalledOnce();
    expect(onFrames.mock.calls[0]![0].map(({ index }) => index))
      .toEqual([1, 2, 3, 4]);
  });

  it.each([null, 0.75])("recalibrates lane membership without resetting playback intent (%s)", (selectedRate) => {
    let laneCount = 1;
    const conductor = new WorkbenchGroupTimeConductorV3({
      lanes: () => Array.from({ length: laneCount }, (_, index) =>
        laneV3(`lane-${index}`, 0, async () => [])),
      onFrames: vi.fn(),
      onError: vi.fn(),
    });
    expect(conductor.playbackRateState()).toMatchObject({
      playbackRate: 1,
      maximumRate: null,
      calibrating: true,
    });

    if (selectedRate !== null) conductor.setPlaybackRate(selectedRate);

    laneCount = 4;
    expect(conductor.lanesChanged()).toMatchObject({
      playbackRate: selectedRate ?? 1,
      maximumRate: null,
      calibrating: true,
      userSelected: selectedRate !== null,
    });
  });
});

describe("Workbench playback-rate presentation", () => {
  it("snaps every selection to the 0.25× lattice without crossing the limit", () => {
    expect(snapWorkbenchPlaybackRateV3(0.52, 1)).toBe(0.5);
    expect(snapWorkbenchPlaybackRateV3(0.73, 1)).toBe(0.75);
    expect(snapWorkbenchPlaybackRateV3(1.88, 1.75)).toBe(1.75);
    expect(formatWorkbenchPlaybackRateV3(0.5)).toBe("0.5×");
    expect(formatWorkbenchPlaybackRateV3(1)).toBe("1×");
  });

  it("keeps the preset row stable across device ceilings", () => {
    expect(workbenchPlaybackPresetRatesV3()).toEqual([0.25, 0.5, 1, 2, 5]);
  });
});

function laneV3(
  laneId: string,
  acceptedTimeSec: number,
  advance: (stepCount: number) => Promise<readonly Frame[]>,
): WorkbenchGroupTimeConductorLaneV3<Frame> {
  return Object.freeze({
    laneId,
    acceptedTimeSec,
    advance,
    frameAcceptedTimeSec: (frame) => frame.timeSec,
  });
}

function framesV3(
  laneId: string,
  startTimeSec: number,
  count: number,
): readonly Frame[] {
  return Object.freeze(Array.from({ length: count }, (_, offset) =>
    Object.freeze({
      laneId,
      timeSec: startTimeSec + (offset + 1) * 0.002,
      index: offset + 1,
    })));
}

function deferredV3<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((complete) => { resolve = complete; });
  return { promise, resolve };
}

async function flushMicrotasksV3(): Promise<void> {
  for (let index = 0; index < 8; index += 1) await Promise.resolve();
}

class GroupClockV3 {
  #nowMs = 0;
  #nextId = 1;
  readonly #timers = new Map<number, Readonly<{
    atMs: number;
    callback: () => void;
  }>>();

  readonly now = () => this.#nowMs;

  readonly schedule = (
    callback: () => void,
    delayMs: number,
  ): WorkbenchGroupTimeConductorTimerV3 => {
    const id = this.#nextId;
    this.#nextId += 1;
    this.#timers.set(id, { atMs: this.#nowMs + delayMs, callback });
    return id as unknown as WorkbenchGroupTimeConductorTimerV3;
  };

  readonly cancel = (timer: WorkbenchGroupTimeConductorTimerV3): void => {
    this.#timers.delete(timer as unknown as number);
  };

  elapse(deltaMs: number): void {
    this.#nowMs += deltaMs;
  }

  async advanceBy(deltaMs: number): Promise<void> {
    this.#nowMs += deltaMs;
    for (let iteration = 0; iteration < 1_000; iteration += 1) {
      const due = [...this.#timers.entries()]
        .filter(([, timer]) => timer.atMs <= this.#nowMs)
        .sort((left, right) => left[1].atMs - right[1].atMs)[0];
      if (due === undefined) {
        await flushMicrotasksV3();
        return;
      }
      this.#timers.delete(due[0]);
      due[1].callback();
      await flushMicrotasksV3();
    }
    throw new Error("group TimeConductor clock did not drain");
  }

  async runNextTimer(): Promise<void> {
    const next = [...this.#timers.entries()]
      .sort((left, right) => left[1].atMs - right[1].atMs)[0];
    if (next === undefined) throw new Error("group TimeConductor has no timer");
    this.#timers.delete(next[0]);
    this.#nowMs = Math.max(this.#nowMs, next[1].atMs);
    next[1].callback();
    await flushMicrotasksV3();
  }
}

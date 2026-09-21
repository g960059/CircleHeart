import { ArticleReaderWorkerResourcesV1 } from "@/components/article/reader/ArticleReaderWorkerResourcesV1";
import { WorkbenchBackgroundWorkerPoolV3 } from "@/components/workbench/runtime/WorkbenchBackgroundWorkerPoolV3";
import type { StudioSimulationWorkerClientV2 } from "@/studio/workers/StudioSimulationWorkerClientV2";

import { describe, expect, it, vi } from "vitest";
import { StudioExperimentSessionHandoffStoreV3 } from "@/studio/infrastructure/browser/StudioExperimentSessionHandoffV3";

import {
  ArticleReaderLiveRuntimeV3,
  articleReaderAnalysisKeyV3,
  appendArticleReaderFramesV3,
  type ArticleReaderParallelRuntimeFactoryInputV3,
  type ArticleReaderParallelRuntimeV3,
} from "@/components/article/reader/ArticleReaderLiveRuntimeV3";
import {
  STUDIO_EXPERIMENT_SNAPSHOT_V2_SCHEMA_ID,
  type ExperimentSnapshotV2,
} from "@/studio/contracts/v2/content";
import type {
  StudioSimulationAnalysisV2,
  StudioSimulationFrameV2,
} from "@/studio/contracts/v2/simulation";
import type { StudioJsonObjectV2 } from "@/studio/contracts/v2/json";
import type {
  StudioSimulationWorkerScenarioStateV2,
} from "@/studio/workers/StudioSimulationWorkerProtocolV2";
import {
  WorkbenchScenarioPresentationSampleStoreV3,
} from "@/components/workbench/presentation/WorkbenchPresentationSampleStoreV3";
import type {
  WorkbenchParallelScenarioSeedV3,
} from "@/components/workbench/runtime/WorkbenchParallelScenarioRuntimeV3";
import {
  STANDARD_TEST_RELEASE_TICKET_V1,
  STANDARD_TEST_SURFACE_RELEASE_ID_V1,
  STANDARD_TEST_SURFACE_SERIES_ID_V1,
} from "./helpers/standardReleaseTicketV1";

describe("ArticleReaderLiveRuntimeV3", () => {
  it("carries exact captures, edited controls, scenario selection and pace into a restored reader or Workbench", async () => {
    const snapshot = snapshotV3();
    const original = JSON.stringify(snapshot);
    const harness = runtimeHarnessV3(snapshot);
    const first = new ArticleReaderLiveRuntimeV3(snapshot, { createRuntime: harness.createRuntime });
    await first.start();
    await first.applyControl({ controlInstanceId: "test", controlId: "preload", scenarioIds: ["scenario/one"], value: 42 });
    first.selectScenario("scenario/two");
    first.setPlaybackRate(0.75);
    await first.pause();
    const continuation = await first.captureContinuation(false);
    await first.dispose();
    expect(continuation.content.scenarios[0]!.capture.fixture).toMatchObject({ preload: 42 });
    expect(continuation.content.scenarios[0]!.capture.checkpoint).toEqual(snapshot.content.scenarios[0]!.capture.checkpoint);
    expect(JSON.stringify(snapshot)).toBe(original);
    const storage = new Map<string, string>();
    const handoff = new StudioExperimentSessionHandoffStoreV3({
      getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => { storage.set(key, value); },
      removeItem: key => { storage.delete(key); },
    });
    handoff.begin({ sessionToken: "test-session", snapshotId: snapshot.snapshotId,
      returnHref: "/ja/articles/test/preview#placement-test", continuation });
    expect(handoff.read()?.continuation).toEqual(continuation);
    const nextHarness = runtimeHarnessV3(snapshot);
    const restored = new ArticleReaderLiveRuntimeV3(snapshot, { createRuntime: nextHarness.createRuntime, continuation });
    await restored.start();
    expect(restored.getSnapshot()).toMatchObject({ status: "paused", activeScenarioId: "scenario/two", playbackRate: { playbackRate: 0.75 } });
    expect(nextHarness.initializeInput?.scenarios[0]?.fixture).toMatchObject({ preload: 42 });
    expect(nextHarness.initializeInput?.scenarios[0]?.checkpoint).toEqual(continuation.content.scenarios[0]!.capture.checkpoint);
    expect(nextHarness.playAll).not.toHaveBeenCalled();
    await restored.dispose();
    expect(() => new ArticleReaderLiveRuntimeV3(snapshot, { createRuntime: harness.createRuntime,
      continuation: { ...continuation, surfaceReleaseId: "another-surface" } })).toThrow(/pinned model and Surface/);
  });

  it("waits for an in-flight control before taking a continuation and keeps retiring lanes stopped", async () => {
    const snapshot = snapshotV3();
    const pauseGate = deferredV3<void>();
    const harness = runtimeHarnessV3(snapshot, { pauseGate });
    const controller = new ArticleReaderLiveRuntimeV3(snapshot, { createRuntime: harness.createRuntime });
    await controller.start();
    const editing = controller.applyControl({ controlInstanceId: "test", controlId: "afterload", scenarioIds: ["scenario/one"], value: 7 });
    await expect(controller.applyControl({ controlInstanceId: "second", controlId: "preload", scenarioIds: ["scenario/one"], value: 9 }))
      .rejects.toThrow("applying another control");
    const capturing = controller.captureContinuation(false);
    pauseGate.resolve();
    await editing;
    const continuation = await capturing;
    expect(continuation.content.scenarios[0]!.capture.fixture).toMatchObject({ afterload: 7 });
    expect(continuation.playing).toBe(true);
    expect(harness.playAll).toHaveBeenCalledTimes(1);
    await controller.dispose();
  });

  it("keeps the playback status synchronized when analysis finishes during a resumable capture", async () => {
    const snapshot = snapshotV3();
    const analysisGate = deferredV3<void>();
    const captureGate = deferredV3<void>();
    const harness = runtimeHarnessV3(snapshot, { analysisGate, captureGate });
    const controller = new ArticleReaderLiveRuntimeV3(snapshot, { createRuntime: harness.createRuntime });
    await controller.start();
    const analysis = controller.requestAnalysis({ analysisId: "analysis/return", scenarioIds: ["scenario/one"] });
    const capture = controller.captureContinuation();
    await vi.waitFor(() => expect(harness.captureScenario).toHaveBeenCalled());
    analysisGate.resolve();
    await analysis;
    expect(controller.getSnapshot().status).toBe("paused");
    captureGate.resolve();
    expect((await capture).playing).toBe(true);
    expect(controller.getSnapshot().status).toBe("playing");
    expect(harness.playAll).toHaveBeenCalledTimes(2);
    await controller.dispose();
  });

  it("shares a concurrent capture and lets retirement prevent any resume", async () => {
    const snapshot = snapshotV3();
    const captureGate = deferredV3<void>();
    const harness = runtimeHarnessV3(snapshot, { captureGate });
    const controller = new ArticleReaderLiveRuntimeV3(snapshot, { createRuntime: harness.createRuntime });
    await controller.start();
    const handoff = controller.captureContinuation();
    const retiring = controller.captureContinuation(false);
    expect(retiring).toBe(handoff);
    captureGate.resolve();
    await retiring;
    expect(harness.captureScenario).toHaveBeenCalledTimes(snapshot.content.scenarios.length);
    expect(harness.playAll).toHaveBeenCalledTimes(1);
    expect(controller.getSnapshot().status).toBe("paused");
    await controller.dispose();
  });

  it("autoplays at 1× after restore and leaves a collapsed presentation at its saved boundary", async () => {
    const snapshot = snapshotV3();
    const harness = runtimeHarnessV3(snapshot);
    const setRate = vi.fn();
    const controller = new ArticleReaderLiveRuntimeV3(snapshot, { createRuntime: input => {
      const runtime = harness.createRuntime(input);
      return { ...runtime, setPlaybackRate: rate => { setRate(rate); return runtime.setPlaybackRate(rate); } };
    } });
    await controller.setPresentationVisible(false);
    await controller.start();
    expect(setRate).toHaveBeenCalledTimes(1);
    expect(setRate).toHaveBeenCalledWith(1);
    expect(harness.playAll).not.toHaveBeenCalled();
    expect(controller.getSnapshot()).toMatchObject({ status: "paused", playbackRate: { playbackRate: 1 } });
    await controller.setPresentationVisible(true);
    expect(harness.playAll).toHaveBeenCalledTimes(1);
    await controller.pause();
    await controller.setPresentationVisible(false);
    await controller.setPresentationVisible(true);
    expect(controller.getSnapshot().status).toBe("paused");
    expect(harness.playAll).toHaveBeenCalledTimes(1);
    await controller.dispose();
  });

  it("requires both the document and presentation to be visible, including startup and pending pauses", async () => {
    const snapshot = snapshotV3();
    const initializeGate = deferredV3<StudioSimulationWorkerScenarioStateV2>();
    const pauseGate = deferredV3<void>();
    const harness = runtimeHarnessV3(snapshot, { initializeGate, pauseGate });
    const controller = new ArticleReaderLiveRuntimeV3(snapshot, { createRuntime: harness.createRuntime });
    const starting = controller.start();
    await controller.setPresentationVisible(false);
    initializeGate.resolve(workerStateV3(snapshot, "scenario/one"));
    await starting;
    expect(harness.playAll).not.toHaveBeenCalled();
    await controller.setDocumentVisible(false);
    await controller.setPresentationVisible(true);
    controller.play();
    expect(harness.playAll).not.toHaveBeenCalled();
    await controller.setDocumentVisible(true);
    expect(harness.playAll).toHaveBeenCalledTimes(1);
    const hiding = controller.setPresentationVisible(false);
    await controller.setPresentationVisible(true);
    pauseGate.resolve(); await hiding;
    expect(controller.getSnapshot().status).toBe("playing");
    expect(harness.playAll).toHaveBeenCalledTimes(2);
    await controller.dispose();
  });

  it("retains explicit reader pause and speed when a viewport owner is recreated", async () => {
    const snapshot = snapshotV3();
    const harness = runtimeHarnessV3(snapshot);
    const first = new ArticleReaderLiveRuntimeV3(snapshot, { createRuntime: harness.createRuntime });
    await first.start(); first.setPlaybackRate(0.75); await first.pause();
    const preference = first.playbackPreference();
    await first.dispose();
    const second = new ArticleReaderLiveRuntimeV3(snapshot, { createRuntime: harness.createRuntime, initialPlaybackPreference: preference });
    await second.start();
    expect(second.getSnapshot()).toMatchObject({ status: "paused", playbackRate: { playbackRate: 0.75 } });
    expect(harness.playAll).toHaveBeenCalledTimes(1);
    await second.setDocumentVisible(false); await second.setDocumentVisible(true);
    expect(harness.playAll).toHaveBeenCalledTimes(1);
    await second.dispose();
  });

  it("keeps the reader pace when initialization emits the conductor calibration rate", async () => {
    const snapshot = snapshotV3();
    const initializeGate = deferredV3<StudioSimulationWorkerScenarioStateV2>();
    const harness = runtimeHarnessV3(snapshot, { initializeGate });
    const controller = new ArticleReaderLiveRuntimeV3(snapshot, { createRuntime: harness.createRuntime });
    const starting = controller.start();
    harness.dependencies?.onPlaybackRateChange?.({ ...controller.getSnapshot().playbackRate, playbackRate: 0.5, userSelected: false });
    expect(controller.getSnapshot().playbackRate.playbackRate).toBe(1);
    initializeGate.resolve(workerStateV3(snapshot, "scenario/one"));
    await starting;
    expect(controller.getSnapshot()).toMatchObject({ status: "playing", playbackRate: { playbackRate: 1 } });
    await controller.dispose();
  });

  it("restores without consuming a transient when the Reader pauses before startup", async () => {
    const snapshot = snapshotV3();
    const harness = runtimeHarnessV3(snapshot);
    const controller = new ArticleReaderLiveRuntimeV3(snapshot, { createRuntime: harness.createRuntime });
    await controller.pause();
    await controller.start();
    expect(controller.getSnapshot().status).toBe("paused");
    expect(harness.playAll).not.toHaveBeenCalled();
    await controller.setDocumentVisible(false);
    await controller.setDocumentVisible(true);
    expect(harness.playAll).not.toHaveBeenCalled();
    controller.play();
    expect(controller.getSnapshot().status).toBe("playing");
    expect(harness.playAll).toHaveBeenCalledTimes(1);
    await controller.dispose();
  });

  it("does not read beat outputs from a lane before initialization completes", async () => {
    const snapshot = snapshotV3();
    const initializeGate = deferredV3<StudioSimulationWorkerScenarioStateV2>();
    const harness = runtimeHarnessV3(snapshot, { initializeGate });
    const latest = vi.fn();
    let initialized = false;
    const controller = new ArticleReaderLiveRuntimeV3(snapshot, {
      createRuntime: input => {
        const runtime = harness.createRuntime(input);
        return { ...runtime, latestFrame: scenarioId => {
          latest();
          if (!initialized) throw new Error("not initialized");
          return runtime.latestFrame(scenarioId);
        } };
      },
    });
    const starting = controller.start();
    await Promise.resolve();
    expect(controller.presentationOutput("scenario/one", "hemodynamics.duration.isovolumic-contraction.flow-event.LV"))
      .toMatchObject({ value: null, quality: "not-assessed" });
    expect(latest).not.toHaveBeenCalled();
    initialized = true;
    initializeGate.resolve(workerStateV3(snapshot, "scenario/one")); await starting;
    expect(controller.getSnapshot().status).toBe("playing");
    expect(controller.presentationOutput("scenario/one", "pressure")).toBeUndefined();
    await controller.dispose();
    expect(controller.presentationOutput("scenario/one", "hemodynamics.duration.isovolumic-contraction.flow-event.LV"))
      .toMatchObject({ value: null });
  });
  it("restores only the visible Scenario authority and starts those lanes", async () => {
    const snapshot = snapshotV3();
    const harness = runtimeHarnessV3(snapshot);
    const controller = new ArticleReaderLiveRuntimeV3(snapshot, {
      initialActiveScenarioId: "scenario/two",
      visibleScenarioIds: ["scenario/two"],
      createRuntime: harness.createRuntime,
    });
    const notifications = vi.fn();
    controller.subscribe(notifications);

    await controller.start();

    expect(harness.dependencies?.expectedModelId).toBe("model/exact-reader-v3");
    expect(harness.initializeInput?.activeScenarioId).toBe("scenario/two");
    expect(harness.initializeInput?.scenarios).toEqual(snapshot.content.scenarios
      .filter(({ scenarioId }) => scenarioId === "scenario/two").map(
      ({ scenarioId, label, capture }) => ({
        scenarioId,
        label,
        fixture: capture.fixture,
        checkpoint: capture.checkpoint,
      }),
    ));
    expect(harness.playAll).toHaveBeenCalledTimes(1);
    expect(controller.getSnapshot()).toMatchObject({
      status: "playing",
      activeScenarioId: "scenario/two",
      scenarioIds: ["scenario/two"],
      fixtureByScenario: {
        "scenario/two": { offset: 1 },
      },
    });
    expect(controller.sampleStore.getScenarioSnapshot("scenario/one"))
      .toEqual([]);
    expect(controller.sampleStore.getScenarioSnapshot("scenario/two").at(-1))
      .toMatchObject({ acceptedTimeSec: 1, values: { pressure: 20 } });
    await expect(controller.applyControl({
      controlInstanceId: "pane/control\u001fcontrol/svr",
      controlId: "control/svr",
      scenarioIds: ["scenario/one"],
      value: 44,
    })).rejects.toThrow(/targets an unknown Scenario/);
    expect(harness.pauseAll).not.toHaveBeenCalled();
    expect(notifications).toHaveBeenCalled();
  });

  it("rejects empty, duplicate, unknown, and hidden initial Scenario authority", () => {
    const snapshot = snapshotV3();
    expect(() => new ArticleReaderLiveRuntimeV3(snapshot, {
      releaseTicket: STANDARD_TEST_RELEASE_TICKET_V1,
      visibleScenarioIds: [],
    })).toThrow(/at least one visible Scenario/);
    expect(() => new ArticleReaderLiveRuntimeV3(snapshot, {
      releaseTicket: STANDARD_TEST_RELEASE_TICKET_V1,
      visibleScenarioIds: ["scenario/one", "scenario/one"],
    })).toThrow(/duplicate/);
    expect(() => new ArticleReaderLiveRuntimeV3(snapshot, {
      releaseTicket: STANDARD_TEST_RELEASE_TICKET_V1,
      visibleScenarioIds: ["scenario/missing"],
    })).toThrow(/not in the pinned Snapshot/);
    expect(() => new ArticleReaderLiveRuntimeV3(snapshot, {
      releaseTicket: STANDARD_TEST_RELEASE_TICKET_V1,
      visibleScenarioIds: ["scenario/one"],
      initialActiveScenarioId: "scenario/two",
    })).toThrow(/active Scenario is not in the visible Scenario scope/);
  });

  it("keeps active Scenario selection independent from all-Scenario playback", async () => {
    const snapshot = snapshotV3();
    const harness = runtimeHarnessV3(snapshot);
    const controller = new ArticleReaderLiveRuntimeV3(snapshot, {
      createRuntime: harness.createRuntime,
    });
    await controller.start();

    controller.selectScenario("scenario/two");
    await controller.pause();
    controller.play();

    expect(harness.selectScenario).toHaveBeenCalledWith("scenario/two");
    expect(harness.pauseAll).toHaveBeenCalledTimes(1);
    expect(harness.playAll).toHaveBeenCalledTimes(2);
    expect(controller.getSnapshot()).toMatchObject({
      status: "playing",
      activeScenarioId: "scenario/two",
    });
    expect(() => controller.selectScenario("scenario/missing"))
      .toThrow(/unknown Scenario/);
  });

  it("queues Scenario focus during initialization without failing the pool", async () => {
    const snapshot = snapshotV3();
    const initializeGate = deferredV3<StudioSimulationWorkerScenarioStateV2>();
    const harness = runtimeHarnessV3(snapshot, { initializeGate });
    const controller = new ArticleReaderLiveRuntimeV3(snapshot, {
      createRuntime: harness.createRuntime,
    });
    const starting = controller.start();
    await Promise.resolve();

    controller.selectScenario("scenario/two");

    expect(controller.getSnapshot()).toMatchObject({
      status: "starting",
      activeScenarioId: "scenario/two",
    });
    expect(harness.selectScenario).not.toHaveBeenCalled();
    initializeGate.resolve(workerStateV3(snapshot, "scenario/one"));
    await starting;

    expect(harness.selectScenario).toHaveBeenCalledTimes(1);
    expect(harness.selectScenario).toHaveBeenCalledWith("scenario/two");
    expect(harness.terminate).not.toHaveBeenCalled();
    expect(controller.getSnapshot()).toMatchObject({
      status: "playing",
      activeScenarioId: "scenario/two",
    });
  });

  it("honors a play intent that arrives while pause is awaiting its boundary", async () => {
    const snapshot = snapshotV3();
    const pauseGate = deferredV3<void>();
    const harness = runtimeHarnessV3(snapshot, { pauseGate });
    const controller = new ArticleReaderLiveRuntimeV3(snapshot, {
      createRuntime: harness.createRuntime,
    });
    await controller.start();

    const pausing = controller.pause();
    controller.play();
    pauseGate.resolve();
    await pausing;

    expect(harness.playAll).toHaveBeenCalledTimes(2);
    expect(controller.getSnapshot().status).toBe("playing");
  });

  it("applies one fixed control value to every bound Scenario at a paused boundary", async () => {
    const snapshot = snapshotV3();
    const harness = runtimeHarnessV3(snapshot);
    const controller = new ArticleReaderLiveRuntimeV3(snapshot, {
      createRuntime: harness.createRuntime,
    });
    await controller.start();

    await controller.applyControl({
      controlInstanceId: "pane/control\u001fcontrol/svr",
      controlId: "control/svr",
      scenarioIds: ["scenario/one", "scenario/two"],
      value: 44,
    });

    expect(harness.pauseAll).toHaveBeenCalledTimes(1);
    expect(harness.applyControl).toHaveBeenCalledTimes(2);
    expect(harness.applyControl.mock.calls.map(([input]) => input.scenarioId))
      .toEqual(["scenario/one", "scenario/two"]);
    expect(harness.playAll).toHaveBeenCalledTimes(2);
    expect(controller.getSnapshot()).toMatchObject({
      status: "playing",
      pendingControlInstanceId: null,
      fixtureByScenario: {
        "scenario/one": { offset: 0, "control/svr": 44 },
        "scenario/two": { offset: 1, "control/svr": 44 },
      },
    });
    expect(controller.sampleStore.getScenarioSnapshot("scenario/two").at(-1))
      .toMatchObject({ values: { pressure: 44 } });
  });

  it("does not retain control-boundary outputs outside the authored presentation selection", async () => {
    const snapshot = snapshotV3();
    const harness = runtimeHarnessV3(snapshot);
    const controller = new ArticleReaderLiveRuntimeV3(snapshot, {
      createRuntime: harness.createRuntime,
      presentationOutputIds: new Set<string>(),
    });
    await controller.start();

    await controller.applyControl({
      controlInstanceId: "pane/control\u001fcontrol/svr",
      controlId: "control/svr",
      scenarioIds: ["scenario/one"],
      value: 44,
    });

    expect(controller.sampleStore.getScenarioSnapshot("scenario/one"))
      .toEqual([]);
  });

  it("transfers each short analysis-source pause without using global UI pause", async () => {
    const snapshot = snapshotV3();
    const harness = runtimeHarnessV3(snapshot, { advanceOnPause: true });
    const controller = new ArticleReaderLiveRuntimeV3(snapshot, {
      createRuntime: harness.createRuntime,
      structuralAnalyses: [{
        analysisId: "analysis/return",
        historyDepth: 1,
      }],
    });
    await controller.start();

    await controller.requestAnalysis({
      analysisId: "analysis/return",
      scenarioIds: ["scenario/one", "scenario/two"],
    });

    expect(harness.pauseAll).not.toHaveBeenCalled();
    expect(harness.pauseScenario).toHaveBeenCalledTimes(2);
    expect(harness.pauseScenario.mock.calls.map(([scenarioId]) => scenarioId))
      .toEqual(["scenario/one", "scenario/two"]);
    expect(harness.requestAnalysis).toHaveBeenCalledTimes(2);
    expect(harness.requestAnalysis.mock.calls.map(([input]) => input))
      .toEqual([
        expect.objectContaining({
          scenarioId: "scenario/one",
          analysisId: "analysis/return",
          expectedInputEpoch: 0,
          expectedAcceptedRevision: 501,
          expectedAcceptedTimeSec: 1.002,
          sourceAlreadyPaused: true,
        }),
        expect.objectContaining({
          scenarioId: "scenario/two",
          analysisId: "analysis/return",
          expectedInputEpoch: 0,
          expectedAcceptedRevision: 501,
          expectedAcceptedTimeSec: 1.002,
          sourceAlreadyPaused: true,
        }),
      ]);
    expect(controller.getSnapshot()).toMatchObject({
      status: "playing",
      pendingAnalysisKeys: [],
    });
    expect(Object.keys(controller.getSnapshot().analysisByKey)).toEqual([
      articleReaderAnalysisKeyV3("scenario/one", "analysis/return"),
      articleReaderAnalysisKeyV3("scenario/two", "analysis/return"),
    ]);
    expect(harness.playAll).toHaveBeenCalledTimes(1);
  });

  it("allows controls during analysis, rejects late old-input results, and keeps other Scenarios independent", async () => {
    const snapshot = snapshotV3();
    const analysisGate = deferredV3<void>();
    const harness = runtimeHarnessV3(snapshot, { analysisGate });
    const controller = new ArticleReaderLiveRuntimeV3(snapshot, {
      createRuntime: harness.createRuntime,
    });
    await controller.start();

    const analysis = controller.requestAnalysis({
      analysisId: "analysis/return",
      scenarioIds: ["scenario/one", "scenario/two"],
    });
    await vi.waitFor(() => expect(harness.requestAnalysis).toHaveBeenCalledTimes(2));
    expect(controller.getSnapshot().status).toBe("playing");
    await expect(controller.applyControl({
      controlInstanceId: "pane/control\u001fcontrol/svr",
      controlId: "control/svr",
      scenarioIds: ["scenario/one"],
      value: 44,
    })).resolves.toBeUndefined();
    expect(controller.getSnapshot().pendingAnalysisKeys).toEqual([
      articleReaderAnalysisKeyV3("scenario/two", "analysis/return"),
    ]);
    analysisGate.resolve(undefined);
    await analysis;
    expect(controller.getSnapshot().analysisByKey[articleReaderAnalysisKeyV3("scenario/one", "analysis/return")]).toBeUndefined();
    expect(controller.getSnapshot().analysisErrorByKey).toEqual({});
    expect(controller.getSnapshot().analysisByKey[articleReaderAnalysisKeyV3("scenario/two", "analysis/return")]).toBeDefined();

    const failingHarness = runtimeHarnessV3(snapshot, {
      analysisError: new Error("analysis unavailable"),
    });
    const failing = new ArticleReaderLiveRuntimeV3(snapshot, {
      createRuntime: failingHarness.createRuntime,
    });
    await failing.start();
    await expect(failing.requestAnalysis({
      analysisId: "analysis/return",
      scenarioIds: ["scenario/one"],
    })).resolves.toBeUndefined();
    expect(failing.getSnapshot()).toMatchObject({ status: "playing" });
    expect(failing.getSnapshot().analysisErrorByKey[
      articleReaderAnalysisKeyV3("scenario/one", "analysis/return")
    ]).toBe("analysis unavailable");
    expect(failingHarness.terminate).not.toHaveBeenCalled();
  });

  it("coalesces overlapping pane requests without blocking independent analysis types", async () => {
    const snapshot = snapshotV3();
    const gate = deferredV3<void>();
    const harness = runtimeHarnessV3(snapshot, { analysisGate: gate });
    const controller = new ArticleReaderLiveRuntimeV3(snapshot, { createRuntime: harness.createRuntime });
    await controller.start();
    const first = controller.requestAnalysis({ analysisId: "analysis/return", scenarioIds: ["scenario/one"] });
    const joined = controller.requestAnalysis({ analysisId: "analysis/return", scenarioIds: ["scenario/one", "scenario/two"] });
    const other = controller.requestAnalysis({ analysisId: "analysis/other", scenarioIds: ["scenario/one"] });
    await vi.waitFor(() => expect(harness.requestAnalysis).toHaveBeenCalledTimes(3));
    expect(controller.getSnapshot().pendingAnalysisKeys).toHaveLength(3);
    gate.resolve();
    await Promise.all([first, joined, other]);
    expect(Object.keys(controller.getSnapshot().analysisByKey)).toHaveLength(3);
    expect(controller.getSnapshot().pendingAnalysisKeys).toEqual([]);
    expect(harness.resumeScenario).not.toHaveBeenCalled();
    await controller.dispose();
  });

  it("never lets an old error clear the pending replacement analysis for a new input", async () => {
    const snapshot = snapshotV3();
    const oldGate = deferredV3<StudioSimulationAnalysisV2>();
    const newGate = deferredV3<StudioSimulationAnalysisV2>();
    const harness = runtimeHarnessV3(snapshot);
    const controller = new ArticleReaderLiveRuntimeV3(snapshot, { createRuntime: input => {
      const runtime = harness.createRuntime(input);
      let requests = 0;
      return { ...runtime, requestAnalysis: () => ++requests === 1 ? oldGate.promise : newGate.promise };
    } });
    await controller.start();
    const key = articleReaderAnalysisKeyV3("scenario/one", "analysis/return");
    const old = controller.requestAnalysis({ analysisId: "analysis/return", scenarioIds: ["scenario/one"] });
    await vi.waitFor(() => expect(harness.pauseScenario).toHaveBeenCalledOnce());
    await controller.applyControl({ controlInstanceId: "test", controlId: "preload", scenarioIds: ["scenario/one"], value: 42 });
    const replacement = controller.requestAnalysis({ analysisId: "analysis/return", scenarioIds: ["scenario/one"] });
    await vi.waitFor(() => expect(harness.pauseScenario).toHaveBeenCalledTimes(2));
    oldGate.reject(new Error("cancelled old input"));
    await old;
    expect(controller.getSnapshot().pendingAnalysisKeys).toEqual([key]);
    expect(controller.getSnapshot().analysisErrorByKey).toEqual({});
    newGate.resolve({ modelId: snapshot.content.modelId, runtimeSessionId: "runtime/scenario/one",
      scenarioId: "scenario/one", analysisId: "analysis/return", inputEpoch: 1,
      sourceAcceptedRevision: 500, sourceAcceptedTimeSec: 1, payload: { status: "available" } });
    await replacement;
    expect(controller.getSnapshot().analysisByKey[key]!.inputEpoch).toBe(1);
    expect(controller.getSnapshot().pendingAnalysisKeys).toEqual([]);
    await controller.dispose();
  });

  it("honors a pause intent that arrives while exact analysis is in flight", async () => {
    const snapshot = snapshotV3();
    const analysisGate = deferredV3<void>();
    const harness = runtimeHarnessV3(snapshot, { analysisGate });
    const controller = new ArticleReaderLiveRuntimeV3(snapshot, {
      createRuntime: harness.createRuntime,
    });
    await controller.start();

    const analysis = controller.requestAnalysis({
      analysisId: "analysis/return",
      scenarioIds: ["scenario/one"],
    });
    await Promise.resolve();
    await controller.pause();
    analysisGate.resolve(undefined);
    await analysis;

    expect(controller.getSnapshot().status).toBe("paused");
    expect(harness.playAll).toHaveBeenCalledTimes(1);
    controller.play();
    expect(controller.getSnapshot().status).toBe("playing");
    expect(harness.playAll).toHaveBeenCalledTimes(2);
  });

  it("retains measurements while offscreen and stops live lanes even during analysis", async () => {
    const snapshot = snapshotV3();
    const analysisGate = deferredV3<void>();
    const harness = runtimeHarnessV3(snapshot, { analysisGate });
    const controller = new ArticleReaderLiveRuntimeV3(snapshot, { createRuntime: harness.createRuntime });
    await controller.start();
    const pending = controller.requestAnalysis({ analysisId: "analysis/return", scenarioIds: ["scenario/one"] });
    await Promise.resolve();
    await controller.setPresentationVisible(false);
    expect(harness.pauseAll).toHaveBeenCalled();
    expect(controller.getSnapshot().status).toBe("paused");
    analysisGate.resolve();
    await pending;
    const key = articleReaderAnalysisKeyV3("scenario/one", "analysis/return");
    const measured = controller.getSnapshot().analysisByKey[key];
    expect(measured).toBeDefined();
    expect(controller.getSnapshot().status).toBe("paused");
    await controller.setPresentationVisible(true);
    expect(controller.getSnapshot().status).toBe("playing");
    expect(controller.getSnapshot().analysisByKey[key]).toBe(measured);
    expect(harness.requestAnalysis).toHaveBeenCalledTimes(1);
    await controller.setPresentationVisible(false);
    await controller.setPresentationVisible(true);
    expect(controller.getSnapshot().analysisByKey[key]).toBe(measured);
    expect(harness.requestAnalysis).toHaveBeenCalledTimes(1);
    await controller.dispose();
  });

  it("parks idle Workers and restores the edited checkpoint, waveform and measured results without another analysis", async () => {
    const snapshot = snapshotV3();
    const harnesses: ReturnType<typeof runtimeHarnessV3>[] = [];
    const controller = new ArticleReaderLiveRuntimeV3(snapshot, { createRuntime: input => {
      const harness = runtimeHarnessV3(snapshot);
      harnesses.push(harness);
      return harness.createRuntime(input);
    }, structuralAnalyses: [{ analysisId: "analysis/return", historyDepth: 3 }] });
    await controller.start();
    await controller.requestAnalysis({ analysisId: "analysis/return", scenarioIds: ["scenario/one"] });
    await controller.applyControl({ controlInstanceId: "test", controlId: "preload", scenarioIds: ["scenario/one"], value: 42 });
    await controller.requestAnalysis({ analysisId: "analysis/return", scenarioIds: ["scenario/one"] });
    const key = articleReaderAnalysisKeyV3("scenario/one", "analysis/return");
    const measured = controller.getSnapshot().analysisByKey[key]!;
    expect(await controller.parkIfHidden()).toBe(false);
    await controller.setPresentationVisible(false);
    const waveformLength = controller.sampleStore.getScenarioSnapshot("scenario/one").length;
    expect(await controller.parkIfHidden()).toBe(true);
    expect(harnesses[0]!.dispose).toHaveBeenCalledOnce();
    expect((await controller.captureContinuation()).content.scenarios[0]!.capture.fixture).toMatchObject({ preload: 42 });
    await controller.setPresentationVisible(true);
    expect(harnesses).toHaveLength(2);
    expect(harnesses[1]!.initializeInput?.scenarios[0]?.fixture).toMatchObject({ preload: 42 });
    expect(harnesses[1]!.requestAnalysis).not.toHaveBeenCalled();
    expect(controller.getSnapshot().analysisByKey[key]!.payload).toBe(measured.payload);
    expect(controller.getSnapshot().analysisByKey[key]!.sourceAcceptedTimeSec).toBe(measured.sourceAcceptedTimeSec);
    expect(controller.getSnapshot().analysisByKey[key]!.inputEpoch).toBe(0);
    expect(controller.getSnapshot().changedScenarioIds).toContain("scenario/one");
    expect(controller.sampleStore.getScenarioSnapshot("scenario/one").length).toBeGreaterThanOrEqual(waveformLength);
    expect(controller.sampleStore.getScenarioOrbitHistorySnapshot("scenario/one")).toHaveLength(1);
    expect(controller.presentationAnalysisEpoch(controller.getSnapshot().analysisByKey[key]!)).toBe(1);
    await controller.applyControl({ controlInstanceId: "test", controlId: "preload", scenarioIds: ["scenario/one"], value: 43 });
    const history = controller.getSnapshot().analysisHistoryByKey[key]!;
    expect(history).toHaveLength(2);
    // Worker epochs may restart at zero; earlier scientific records remain
    // untouched, while their display epochs cannot alias the restored condition.
    expect(history.map(analysis => controller.presentationAnalysisEpoch(analysis))).toEqual([0, 1]);
    expect(controller.sampleStore.getScenarioOrbitHistorySnapshot("scenario/one").map(entry => entry.inputEpoch)).toEqual([0, 1]);
    expect(controller.sampleStore.getScenarioExactOrbitSnapshot("scenario/one").at(-1)?.inputEpoch).toBe(2);
    await controller.requestAnalysis({ analysisId: "analysis/return", scenarioIds: ["scenario/one"] });
    await controller.setPresentationVisible(false);
    expect(await controller.parkIfHidden()).toBe(true);
    controller.selectScenario("scenario/two");
    await controller.setPresentationVisible(true);
    expect(controller.getSnapshot().activeScenarioId).toBe("scenario/two");
    expect(controller.presentationAnalysisEpoch(controller.getSnapshot().analysisByKey[key]!)).toBe(2);
    await controller.applyControl({ controlInstanceId: "test", controlId: "preload", scenarioIds: ["scenario/one"], value: 44 });
    expect(controller.sampleStore.getScenarioOrbitHistorySnapshot("scenario/one").map(entry => entry.inputEpoch)).toEqual([0, 1, 2]);
    expect(controller.getSnapshot().analysisHistoryByKey[key]!.map(analysis => controller.presentationAnalysisEpoch(analysis))).toEqual([0, 1, 2]);
    await controller.dispose();
  });

  it("retains completed-beat presentation through repeated paused parks until the inputs change", async () => {
    const snapshot = snapshotV3();
    const sourceFrame = frameV3("scenario/one", 1, 10);
    const measured: StudioSimulationAnalysisV2 = {
      modelId: sourceFrame.modelId, runtimeSessionId: sourceFrame.runtimeSessionId,
      scenarioId: sourceFrame.scenarioId, inputEpoch: sourceFrame.inputEpoch,
      sourceAcceptedRevision: sourceFrame.acceptedRevision,
      sourceAcceptedTimeSec: sourceFrame.acceptedTimeSec,
      analysisId: "analysis/completed-beat", payload: { status: "available" },
    };
    let generations = 0;
    const controller = new ArticleReaderLiveRuntimeV3(snapshot, {
      createRuntime: input => {
        const runtime = runtimeHarnessV3(snapshot).createRuntime(input);
        const original = generations++ === 0;
        return { ...runtime, presentationAnalyses: scenarioId =>
          original && scenarioId === measured.scenarioId ? [measured] : [] };
      },
    });
    await controller.start();
    await controller.pause();
    const original = controller.presentationTrace("scenario/one")!;
    expect(original.analyses).toEqual([measured]);
    for (let revisit = 0; revisit < 3; revisit++) {
      await controller.setPresentationVisible(false);
      expect(await controller.parkIfHidden()).toBe(true);
      expect(controller.presentationTrace("scenario/one")?.analyses).toEqual([measured]);
      await controller.setPresentationVisible(true);
      expect(controller.getSnapshot().status).toBe("paused");
      expect(controller.presentationTrace("scenario/one")).toMatchObject(original);
    }
    // The retained beat belongs only to the restored condition. A new input
    // epoch must not reuse it, even through another offscreen round trip.
    await controller.applyControl({ controlInstanceId: "test", controlId: "preload", scenarioIds: ["scenario/one"], value: 42 });
    expect(controller.presentationTrace("scenario/one")?.analyses).toEqual([]);
    await controller.setPresentationVisible(false);
    expect(await controller.parkIfHidden()).toBe(true);
    await controller.setPresentationVisible(true);
    expect(controller.presentationTrace("scenario/one")?.analyses).toEqual([]);
    await controller.dispose();
  });

  it("does not sacrifice running measurements for parking, and a capture failure keeps the reader usable", async () => {
    const snapshot = snapshotV3();
    const gate = deferredV3<void>();
    const harness = runtimeHarnessV3(snapshot, { analysisGate: gate, captureScenarioError: new Error("capture refused") });
    const controller = new ArticleReaderLiveRuntimeV3(snapshot, { createRuntime: harness.createRuntime });
    await controller.start();
    const analysis = controller.requestAnalysis({ analysisId: "analysis/return", scenarioIds: ["scenario/one"] });
    await controller.setPresentationVisible(false);
    expect(await controller.parkIfHidden()).toBe(false);
    gate.resolve();
    await analysis;
    expect(await controller.parkIfHidden()).toBe(false);
    await controller.setPresentationVisible(true);
    expect(controller.getSnapshot().status).toBe("playing");
    expect(harness.dispose).not.toHaveBeenCalled();
    await controller.dispose();
  });

  it("waits for a pending park before restoring a placement revisited during capture", async () => {
    const snapshot = snapshotV3();
    const gate = deferredV3<void>();
    const harnesses: ReturnType<typeof runtimeHarnessV3>[] = [];
    const controller = new ArticleReaderLiveRuntimeV3(snapshot, { createRuntime: input => {
      const harness = runtimeHarnessV3(snapshot, { captureGate: gate });
      harnesses.push(harness); return harness.createRuntime(input);
    } });
    await controller.start();
    await controller.setPresentationVisible(false);
    const park = controller.parkIfHidden();
    const revisit = controller.setPresentationVisible(true);
    gate.resolve();
    await Promise.all([park, revisit]);
    expect(harnesses).toHaveLength(2);
    expect(harnesses[0]!.dispose).toHaveBeenCalledOnce();
    expect(controller.getSnapshot().status).toBe("playing");
    await controller.dispose();
  });

  it("archives exact pre-control structural states, clears current, and refreshes the new epoch", async () => {
    const snapshot = snapshotV3();
    const harness = runtimeHarnessV3(snapshot);
    const controller = new ArticleReaderLiveRuntimeV3(snapshot, {
      createRuntime: harness.createRuntime,
      structuralAnalyses: [{
        analysisId: "analysis/return",
        historyDepth: 2,
      }],
    });
    await controller.start();
    await controller.requestAnalysis({
      analysisId: "analysis/return",
      scenarioIds: ["scenario/one"],
    });
    const key = articleReaderAnalysisKeyV3(
      "scenario/one",
      "analysis/return",
    );

    await controller.applyControl({
      controlInstanceId: "pane/control\u001fcontrol/svr",
      controlId: "control/svr",
      scenarioIds: ["scenario/one"],
      value: 44,
    });

    expect(controller.getSnapshot().analysisByKey[key]).toBeUndefined();
    expect(controller.getSnapshot().analysisHistoryByKey[key])
      .toHaveLength(1);
    expect(controller.getSnapshot().analysisHistoryByKey[key]?.[0])
      .toMatchObject({ inputEpoch: 0, analysisId: "analysis/return" });
    await controller.requestAnalysis({
      analysisId: "analysis/return",
      scenarioIds: ["scenario/one"],
    });
    expect(controller.getSnapshot().analysisByKey[key])
      .toMatchObject({ inputEpoch: 1 });
  });

  it("does not archive structural history when its authored depth is zero", async () => {
    const snapshot = snapshotV3();
    const harness = runtimeHarnessV3(snapshot);
    const controller = new ArticleReaderLiveRuntimeV3(snapshot, {
      createRuntime: harness.createRuntime,
      structuralAnalyses: [{
        analysisId: "analysis/return",
        historyDepth: 0,
      }],
    });
    await controller.start();
    await controller.requestAnalysis({
      analysisId: "analysis/return",
      scenarioIds: ["scenario/one"],
    });

    await controller.applyControl({
      controlInstanceId: "pane/control\u001fcontrol/svr",
      controlId: "control/svr",
      scenarioIds: ["scenario/one"],
      value: 44,
    });

    expect(controller.getSnapshot().analysisHistoryByKey).toEqual({});
    expect(harness.requestAnalysis).toHaveBeenCalledTimes(1);
  });

  it("fails closed when a dispatched single-Scenario control rejects", async () => {
    const snapshot = snapshotV3();
    const harness = runtimeHarnessV3(snapshot, {
      applyControlError: new Error("control failed"),
    });
    const controller = new ArticleReaderLiveRuntimeV3(snapshot, {
      createRuntime: harness.createRuntime,
    });
    await controller.start();

    await expect(controller.applyControl({
      controlInstanceId: "pane/control\u001fcontrol/svr",
      controlId: "control/svr",
      scenarioIds: ["scenario/one"],
      value: 44,
    })).rejects.toThrow("control failed");

    expect(controller.getSnapshot().fixtureByScenario).toEqual({
      "scenario/one": { offset: 0 },
      "scenario/two": { offset: 1 },
    });
    expect(controller.getSnapshot()).toMatchObject({
      status: "failed",
      pendingControlInstanceId: null,
    });
    expect(harness.playAll).toHaveBeenCalledTimes(1);
    expect(harness.terminate).toHaveBeenCalledTimes(1);
    expect(harness.releaseForegroundCapacity).toHaveBeenCalledOnce();
  });

  it("publishes the committed fixture without an extra checkpoint capture", async () => {
    const snapshot = snapshotV3();
    const harness = runtimeHarnessV3(snapshot, {
      captureScenarioError: new Error("capture failed"),
    });
    const controller = new ArticleReaderLiveRuntimeV3(snapshot, {
      createRuntime: harness.createRuntime,
    });
    await controller.start();

    await expect(controller.applyControl({
      controlInstanceId: "pane/control\u001fcontrol/svr",
      controlId: "control/svr",
      scenarioIds: ["scenario/one"],
      value: 44,
    })).resolves.toBeUndefined();

    expect(harness.applyControl).toHaveBeenCalledTimes(1);
    expect(controller.getSnapshot()).toMatchObject({
      status: "playing",
      pendingControlInstanceId: null,
      fixtureByScenario: { "scenario/one": { "control/svr": 44 } },
    });
    expect(harness.captureScenario).not.toHaveBeenCalled();
    expect(harness.releaseForegroundCapacity).toHaveBeenCalledOnce();
    expect(harness.terminate).not.toHaveBeenCalled();
    expect(harness.playAll).toHaveBeenCalledTimes(2);
    // Explicit persistence still requires an exact capture and reports its
    // failure; the fixture response is not a substitute checkpoint.
    await expect(controller.captureContinuation()).rejects.toThrow("capture failed");
    await controller.dispose();
  });

  it("fails closed when a multi-Scenario control can partially commit", async () => {
    const snapshot = snapshotV3();
    const harness = runtimeHarnessV3(snapshot, {
      applyControlErrorByScenarioId: {
        "scenario/two": new Error("second lane rejected"),
      },
    });
    const controller = new ArticleReaderLiveRuntimeV3(snapshot, {
      createRuntime: harness.createRuntime,
    });
    await controller.start();

    await expect(controller.applyControl({
      controlInstanceId: "pane/control\u001fcontrol/svr",
      controlId: "control/svr",
      scenarioIds: ["scenario/one", "scenario/two"],
      value: 44,
    })).rejects.toThrow("second lane rejected");

    expect(harness.applyControl).toHaveBeenCalledTimes(2);
    expect(controller.getSnapshot()).toMatchObject({
      status: "failed",
      pendingControlInstanceId: null,
    });
    expect(controller.getSnapshot().fixtureByScenario).toEqual({
      "scenario/one": { offset: 0 },
      "scenario/two": { offset: 1 },
    });
    expect(harness.terminate).toHaveBeenCalledTimes(1);
    expect(harness.playAll).toHaveBeenCalledTimes(1);
  });

  it("pauses while the document is hidden and resumes only its preserved play intent", async () => {
    const snapshot = snapshotV3();
    const harness = runtimeHarnessV3(snapshot);
    const controller = new ArticleReaderLiveRuntimeV3(snapshot, {
      createRuntime: harness.createRuntime,
    });
    await controller.start();

    await controller.setDocumentVisible(false);
    expect(controller.getSnapshot().status).toBe("paused");
    expect(harness.pauseAll).toHaveBeenCalledTimes(1);
    await controller.setDocumentVisible(true);
    expect(controller.getSnapshot().status).toBe("playing");
    expect(harness.playAll).toHaveBeenCalledTimes(2);

    await controller.pause();
    await controller.setDocumentVisible(false);
    await controller.setDocumentVisible(true);
    expect(controller.getSnapshot().status).toBe("paused");
    expect(harness.playAll).toHaveBeenCalledTimes(2);
  });

  it("fails closed on a lane error and ignores every later callback", async () => {
    const snapshot = snapshotV3();
    const harness = runtimeHarnessV3(snapshot);
    const controller = new ArticleReaderLiveRuntimeV3(snapshot, {
      createRuntime: harness.createRuntime,
    });
    await controller.start();
    harness.dependencies?.onFrames([frameV3("scenario/one", 2, 11)]);
    const beforeFailure = controller.sampleStore
      .getScenarioSnapshot("scenario/one").length;

    harness.dependencies?.onError(new Error("reader lane failed"));
    harness.dependencies?.onFrames([frameV3("scenario/one", 3, 12)]);
    controller.play();
    await controller.pause();

    expect(harness.terminate).toHaveBeenCalledTimes(1);
    expect(controller.getSnapshot()).toMatchObject({ status: "failed" });
    expect(controller.getSnapshot().error?.message).toBe("reader lane failed");
    expect(controller.sampleStore.getScenarioSnapshot("scenario/one"))
      .toHaveLength(beforeFailure);
    expect(harness.playAll).toHaveBeenCalledTimes(1);
  });

  it("disposes an initializing authority without publishing late completion", async () => {
    const snapshot = snapshotV3();
    const initializeGate = deferredV3<StudioSimulationWorkerScenarioStateV2>();
    const harness = runtimeHarnessV3(snapshot, { initializeGate });
    const controller = new ArticleReaderLiveRuntimeV3(snapshot, {
      createRuntime: harness.createRuntime,
    });
    const starting = controller.start();

    await controller.dispose();
    initializeGate.resolve(workerStateV3(snapshot, "scenario/one"));
    await starting;
    harness.dependencies?.onFrames([frameV3("scenario/one", 2, 99)]);

    expect(controller.getSnapshot().status).toBe("disposed");
    expect(harness.dispose).toHaveBeenCalledTimes(1);
    expect(harness.playAll).not.toHaveBeenCalled();
    expect(controller.sampleStore.getScenarioSnapshot("scenario/one")).toEqual([]);
  });

  it("records synchronous construction failure without leaking it from start", async () => {
    const controller = new ArticleReaderLiveRuntimeV3(snapshotV3(), {
      createRuntime: () => {
        throw new Error("worker construction failed");
      },
    });

    await expect(controller.start()).resolves.toBeUndefined();
    expect(controller.getSnapshot()).toMatchObject({ status: "failed" });
    expect(controller.getSnapshot().error?.message)
      .toBe("worker construction failed");
  });

  it("treats pause during initialization as intent and never calls an inactive pool", async () => {
    const snapshot = snapshotV3();
    const initializeGate = deferredV3<StudioSimulationWorkerScenarioStateV2>();
    const harness = runtimeHarnessV3(snapshot, { initializeGate });
    const controller = new ArticleReaderLiveRuntimeV3(snapshot, {
      createRuntime: harness.createRuntime,
    });
    const starting = controller.start();

    await controller.pause();
    initializeGate.resolve(workerStateV3(snapshot, "scenario/one"));
    await starting;

    expect(harness.pauseAll).not.toHaveBeenCalled();
    expect(harness.playAll).not.toHaveBeenCalled();
    expect(controller.getSnapshot().status).toBe("paused");
  });

  it("projects only finite assessed scalar outputs into the shared sample store", () => {
    const store = new WorkbenchScenarioPresentationSampleStoreV3();
    const base = frameV3("scenario/one", 1, 8);
    appendArticleReaderFramesV3([{
      ...base,
      outputs: {
        pressure: base.outputs.pressure!,
        vector: {
          outputId: "vector",
          value: [1, 2],
          availability: "available",
          quality: "accepted-derived",
        },
        unassessed: {
          outputId: "unassessed",
          value: 7,
          availability: "available",
          quality: "not-assessed",
        },
      },
    }], store);

    expect(store.getScenarioSnapshot("scenario/one").at(-1)?.values).toEqual({
      pressure: 8,
      vector: null,
      unassessed: null,
    });
  });

  it("keeps complete beats and their clock when a restored Worker starts a new exact epoch", () => {
    const store = new WorkbenchScenarioPresentationSampleStoreV3();
    store.setCyclePhaseOutputId("phase");
    const frame = (i: number, inputEpoch: number) => ({
      ...frameV3("scenario/one", i / 500, 8, inputEpoch),
      outputs: {
        phase: { outputId: "phase", value: (i % 500) / 500,
          availability: "available" as const, quality: "accepted-derived" as const },
      },
    });
    appendArticleReaderFramesV3(Array.from({ length: 601 }, (_, i) => frame(i, 7)), store);
    const cycles = store.getPressureVolumeSnapshot().completedCyclesByScenarioId["scenario/one"]!;
    const history = store.getScenarioOrbitHistorySnapshot("scenario/one");
    expect(cycles.length).toBeGreaterThan(0);
    const restored = frame(601, 0);
    appendArticleReaderFramesV3([restored], store, undefined, new Map([["scenario/one", 7]]));
    expect(restored.inputEpoch).toBe(0);
    expect(store.getPressureVolumeSnapshot().completedCyclesByScenarioId["scenario/one"]).toEqual(cycles);
    expect(store.getScenarioOrbitHistorySnapshot("scenario/one")).toBe(history);
    expect(store.getScenarioSnapshot("scenario/one").at(-1)).toMatchObject({
      inputEpoch: 7, acceptedTimeSec: 1.202, presentationTimeSec: 1.202,
    });
  });

  it("retains only Placement-selected output histories", () => {
    const store = new WorkbenchScenarioPresentationSampleStoreV3();
    const base = frameV3("scenario/one", 1, 8);
    appendArticleReaderFramesV3([{
      ...base,
      outputs: {
        pressure: base.outputs.pressure!,
        unrelated: {
          outputId: "unrelated",
          value: 99,
          availability: "available",
          quality: "accepted-derived",
        },
      },
    }], store, new Set(["pressure"]));

    expect(store.getScenarioSnapshot("scenario/one").at(-1)?.values).toEqual({
      pressure: 8,
    });
  });

  it("does not invalidate the presentation store for analysis-only Placements", () => {
    const store = new WorkbenchScenarioPresentationSampleStoreV3();
    appendArticleReaderFramesV3(
      [frameV3("scenario/one", 1, 8)],
      store,
      new Set(),
    );

    expect(store.scenarioCount).toBe(0);
  });
});

function snapshotV3(): ExperimentSnapshotV2 {
  return Object.freeze({
    schemaId: STUDIO_EXPERIMENT_SNAPSHOT_V2_SCHEMA_ID,
    snapshotId: "snapshot/reader-live-v3",
    surfaceReleaseId: STANDARD_TEST_SURFACE_RELEASE_ID_V1,
    createdAt: "2026-08-02T00:00:00.000Z",
    content: Object.freeze({
      modelId: "model/exact-reader-v3",
      surfaceSeriesId: STANDARD_TEST_SURFACE_SERIES_ID_V1,
      scenarios: Object.freeze([
        scenarioV3("scenario/one", "One", 0),
        scenarioV3("scenario/two", "Two", 1),
      ]),
      surface: Object.freeze({
        graphPanes: Object.freeze([]),
        outputPanes: Object.freeze([]),
        controlPanes: Object.freeze([]),
        note: Object.freeze({ text: "" }),
      }),
    }),
  });
}

function scenarioV3(scenarioId: string, label: string, offset: number) {
  return Object.freeze({
    scenarioId,
    label,
    capture: Object.freeze({
      fixture: Object.freeze({ offset }),
      checkpoint: Object.freeze({
        acceptedRevision: 5,
        acceptedTimeSec: 1,
        payload: Object.freeze({ state: offset }),
      }),
    }),
  });
}

function frameV3(
  scenarioId: string,
  acceptedTimeSec: number,
  pressure: number,
  inputEpoch = 0,
): StudioSimulationFrameV2 {
  return Object.freeze({
    modelId: "model/exact-reader-v3",
    runtimeSessionId: `runtime/${scenarioId}`,
    scenarioId,
    inputEpoch,
    acceptedRevision: Math.round(acceptedTimeSec * 500),
    acceptedTimeSec,
    outputs: Object.freeze({
      pressure: Object.freeze({
        outputId: "pressure",
        value: pressure,
        availability: "available",
        quality: "accepted-derived",
      }),
    }),
  });
}

function workerStateV3(
  snapshot: ExperimentSnapshotV2,
  activeScenarioId: string,
): StudioSimulationWorkerScenarioStateV2 {
  return Object.freeze({
    activeScenarioId,
    scenarios: Object.freeze(snapshot.content.scenarios.map(
      ({ scenarioId, label }) => Object.freeze({ scenarioId, label }),
    )),
    frame: frameV3(activeScenarioId, 1, activeScenarioId.endsWith("two") ? 20 : 10),
  });
}

function runtimeHarnessV3(
  snapshot: ExperimentSnapshotV2,
  gates: Readonly<{
    initializeGate?: DeferredV3<StudioSimulationWorkerScenarioStateV2>;
    pauseGate?: DeferredV3<void>;
    analysisGate?: DeferredV3<void>;
    analysisError?: Error;
    advanceOnPause?: boolean;
    applyControlError?: Error;
    applyControlErrorByScenarioId?: Readonly<Record<string, Error>>;
    captureScenarioError?: Error;
    captureGate?: DeferredV3<void>;
  }> = {},
) {
  let dependencies: ArticleReaderParallelRuntimeFactoryInputV3 | undefined;
  let initializeInput: Readonly<{
    scenarios: readonly WorkbenchParallelScenarioSeedV3[];
    activeScenarioId: string;
  }> | undefined;
  let activeScenarioId = snapshot.content.scenarios[0]!.scenarioId;
  const frames = new Map(snapshot.content.scenarios.map((scenario, index) => [
    scenario.scenarioId,
    frameV3(scenario.scenarioId, 1, (index + 1) * 10),
  ]));
  const fixtures = new Map<string, StudioJsonObjectV2>(
    snapshot.content.scenarios.map((scenario) => [
      scenario.scenarioId,
      scenario.capture.fixture as StudioJsonObjectV2,
    ]),
  );
  const playAll = vi.fn();
  const releaseForegroundCapacity = vi.fn();
  const reserveForegroundCapacity = vi.fn(() => releaseForegroundCapacity);
  const applyControl = vi.fn(async (input: Readonly<{
    scenarioId: string;
    controlId: string;
    value: number;
    expectedInputEpoch: number;
  }>) => {
    if (gates.applyControlError !== undefined) {
      throw gates.applyControlError;
    }
    const scenarioError = gates.applyControlErrorByScenarioId?.[
      input.scenarioId
    ];
    if (scenarioError !== undefined) throw scenarioError;
    const current = frames.get(input.scenarioId)!;
    const next = frameV3(
      input.scenarioId,
      current.acceptedTimeSec,
      input.value,
      current.inputEpoch + 1,
    );
    frames.set(input.scenarioId, next);
    fixtures.set(input.scenarioId, Object.freeze({
      ...(fixtures.get(input.scenarioId) ?? {}),
      [input.controlId]: input.value,
    }));
    return { frame: next, fixture: fixtures.get(input.scenarioId)! };
  });
  const captureScenario = vi.fn(async (scenarioId: string) => {
    await gates.captureGate?.promise;
    if (gates.captureScenarioError !== undefined) {
      throw gates.captureScenarioError;
    }
    const source = snapshot.content.scenarios.find(
      (scenario) => scenario.scenarioId === scenarioId,
    );
    const fixture = fixtures.get(scenarioId);
    if (source === undefined || fixture === undefined) {
      throw new Error("missing test Scenario capture");
    }
    return Object.freeze({
      ...source,
      capture: Object.freeze({
        ...source.capture,
        fixture,
      }),
    });
  });
  const requestAnalysis = vi.fn(async (input: Readonly<{
    scenarioId: string;
    analysisId: string;
    expectedInputEpoch: number;
    expectedAcceptedRevision: number;
    expectedAcceptedTimeSec: number;
    sourceAlreadyPaused?: boolean;
  }>): Promise<StudioSimulationAnalysisV2> => {
    const frame = frames.get(input.scenarioId)!;
    await gates.analysisGate?.promise;
    if (gates.analysisError !== undefined) throw gates.analysisError;
    return Object.freeze({
      modelId: frame.modelId,
      runtimeSessionId: frame.runtimeSessionId,
      scenarioId: frame.scenarioId,
      inputEpoch: frame.inputEpoch,
      sourceAcceptedRevision: frame.acceptedRevision,
      sourceAcceptedTimeSec: frame.acceptedTimeSec,
      analysisId: input.analysisId,
      payload: Object.freeze({ status: "available" }),
    });
  });
  const pauseAll = vi.fn(async () => {
    await gates.pauseGate?.promise;
  });
  const pauseScenario = vi.fn(async (scenarioId: string) => {
    const current = frames.get(scenarioId);
    if (current === undefined) throw new Error("missing test frame");
    if (!gates.advanceOnPause) return current;
    const pressure = current.outputs.pressure?.availability === "available"
      && typeof current.outputs.pressure.value === "number"
      ? current.outputs.pressure.value
      : 0;
    const drained = frameV3(
      scenarioId,
      current.acceptedTimeSec + 0.002,
      pressure,
      current.inputEpoch,
    );
    frames.set(scenarioId, drained);
    return drained;
  });
  const resumeScenario = vi.fn();
  const selectScenario = vi.fn((scenarioId: string) => {
    activeScenarioId = scenarioId;
    return workerStateV3(snapshot, scenarioId);
  });
  const terminate = vi.fn();
  const dispose = vi.fn(async () => undefined);
  const createRuntime = (
    input: ArticleReaderParallelRuntimeFactoryInputV3,
  ): ArticleReaderParallelRuntimeV3 => {
    dependencies = input;
    return {
      async initialize(next) {
        initializeInput = next;
        activeScenarioId = next.activeScenarioId;
        return gates.initializeGate?.promise
          ?? workerStateV3(snapshot, activeScenarioId);
      },
      applyControl,
      reserveForegroundCapacity,
      waitForControlPresentation: async () => undefined,
      captureScenario,
      requestAnalysis,
      latestFrame(scenarioId) {
        const frame = frames.get(scenarioId);
        if (frame === undefined) throw new Error("missing test frame");
        return frame;
      },
      playAll,
      pauseAll,
      pauseScenario,
      setPlaybackRate: (rate) => Object.freeze({
        playbackRate: rate,
        maximumRate: 1,
        calibrating: false,
        userSelected: true,
        performanceLimited: false,
      }),
      selectScenario,
      resumeScenario,
      terminate,
      dispose,
    };
  };
  return {
    createRuntime,
    get dependencies() {
      return dependencies;
    },
    get initializeInput() {
      return initializeInput;
    },
    playAll,
    reserveForegroundCapacity,
    releaseForegroundCapacity,
    applyControl,
    captureScenario,
    requestAnalysis,
    pauseAll,
    pauseScenario,
    resumeScenario,
    selectScenario,
    terminate,
    dispose,
  };
}

type DeferredV3<T> = Readonly<{
  promise: Promise<T>;
  resolve(value: T): void;
  reject(error: Error): void;
}>;

function deferredV3<T>(): DeferredV3<T> {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((next, fail) => {
    resolve = next;
    reject = fail;
  });
  return { promise, resolve, reject };
}

describe("article-wide Worker resources", () => {
  it("aggregates live demand and ignores paused owners' playback ceilings", () => {
    const pool = new WorkbenchBackgroundWorkerPoolV3({ warmSize: 0, maxSize: 1 });
    const counts = vi.spyOn(pool, "setLiveScenarioCount");
    const playback = vi.spyOn(pool, "setForegroundPlaybackState");
    const disposed = vi.spyOn(pool, "dispose");
    const resources = new ArticleReaderWorkerResourcesV1();
    const first = resources.acquire(() => pool);
    const second = resources.acquire(() => pool);
    first.setForegroundPlaybackState({ playbackRate: 1, maximumRate: 3, calibrating: false });
    first.setLiveScenarioCount(3);
    second.setForegroundPlaybackState({ playbackRate: 1, maximumRate: null, calibrating: true });
    expect(counts).toHaveBeenLastCalledWith(3);
    expect(playback).toHaveBeenLastCalledWith({ playbackRate: 1, maximumRate: 3, calibrating: false });
    second.setLiveScenarioCount(2);
    expect(counts).toHaveBeenLastCalledWith(5);
    expect(playback.mock.lastCall?.[0].calibrating).toBe(true);
    first.release();
    expect(counts).toHaveBeenLastCalledWith(2);
    expect(disposed).not.toHaveBeenCalled();
    second.release();
    expect(disposed).toHaveBeenCalledOnce();
  });

  it("shares the actual concurrency cap and releases only the retiring owner's jobs", async () => {
    const clients: { terminate: ReturnType<typeof vi.fn> }[] = [];
    const create = vi.fn(() => new WorkbenchBackgroundWorkerPoolV3({ warmSize: 0, maxSize: 1 }, () => {
      const client = { terminate: vi.fn() };
      clients.push(client);
      return client as unknown as StudioSimulationWorkerClientV2;
    }, 2));
    const resources = new ArticleReaderWorkerResourcesV1();
    const first = resources.acquire(create);
    const second = resources.acquire(create);
    let finish!: () => void;
    const gate = new Promise<void>(resolve => { finish = resolve; });
    const active = first.run("analysis", () => gate);
    const never = vi.fn(async () => undefined);
    const cancelled = second.run("analysis", never);
    const rejected = expect(cancelled).rejects.toThrow(/cancelled/);
    await Promise.resolve();
    expect(create).toHaveBeenCalledOnce();
    expect(clients).toHaveLength(1);
    second.release();
    await rejected;
    expect(never).not.toHaveBeenCalled();
    expect(clients[0]!.terminate).not.toHaveBeenCalled();
    finish();
    await active;
    first.release();
    // A StrictMode replay or later article placement can acquire a fresh pool.
    const replay = resources.acquire(create);
    expect(create).toHaveBeenCalledTimes(2);
    replay.release();
  });
});

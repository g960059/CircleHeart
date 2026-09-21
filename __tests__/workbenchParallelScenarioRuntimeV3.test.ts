import { describe, expect, it, vi } from "vitest";

import {
  WorkbenchParallelScenarioRuntimeV3,
  type WorkbenchParallelScenarioRuntimeClientV3,
  type WorkbenchParallelScenarioRuntimeDependenciesV3,
} from "@/components/workbench/runtime/WorkbenchParallelScenarioRuntimeV3";
import type {
  StudioSimulationAnalysisV2,
  StudioSimulationFrameV2,
} from "@/studio/contracts/v2/simulation";
import type { StudioSimulationWorkerRequestAnalysisClientInputV2 } from "@/studio/workers/StudioSimulationWorkerClientV2";
import {
  WorkbenchGroupTimeConductorV3,
  type WorkbenchGroupPlaybackRateStateV3,
  type WorkbenchGroupTimeConductorDependenciesV3,
  type WorkbenchGroupTimeConductorTimerV3,
} from "@/components/workbench/runtime/WorkbenchGroupTimeConductorV3";
import type {
  WorkbenchBackgroundJobHandleV3,
  WorkbenchBackgroundJobPriorityV3,
  WorkbenchBackgroundWorkerPoolPortV3,
} from "@/components/workbench/runtime/WorkbenchBackgroundWorkerPoolV3";
import { WorkbenchBackgroundWorkerPoolV3 } from
  "@/components/workbench/runtime/WorkbenchBackgroundWorkerPoolV3";
import {
  STANDARD_TEST_RELEASE_TICKET_V1,
} from "./helpers/standardReleaseTicketV1";

describe("WorkbenchParallelScenarioRuntimeV3", () => {
  it("lets the changed lane publish before all group analysis waiters can capture", async () => {
    const h = harnessV3();
    await h.runtime.initialize({ scenarios: [seedV3("edited", "Edited", 0), seedV3("unchanged", "Other", 0)], activeScenarioId: "edited" });
    await expect(h.runtime.waitForControlPresentation()).resolves.toBeUndefined();
    h.clients.get("edited")!.applyControl.mockResolvedValue({
      frame: { ...frameV3("edited", 0), inputEpoch: 1 }, fixture: { value: 1 },
    });
    await h.runtime.applyControl({ scenarioId: "edited", controlId: "test", value: 1, expectedInputEpoch: 0 });
    h.runtime.playAll();
    const released = vi.fn(() => expect(h.onFrames).toHaveBeenLastCalledWith([
      expect.objectContaining({ scenarioId: "edited", inputEpoch: 1, acceptedRevision: 1 }),
    ]));
    const first = h.runtime.waitForControlPresentation().then(released);
    const second = h.runtime.waitForControlPresentation().then(released);
    h.conductor.emit([frameV3("unchanged", 1), frameV3("edited", 3)]);
    h.conductor.emit([{ ...frameV3("edited", 0), inputEpoch: 1 }]);
    await Promise.resolve();
    expect(released).not.toHaveBeenCalled();
    expect(h.conductor.pause).not.toHaveBeenCalled();
    h.conductor.emit([{ ...frameV3("edited", 1), inputEpoch: 1 }]);
    await Promise.all([first, second]);
    expect(released).toHaveBeenCalledTimes(2);
    await expect(h.runtime.waitForControlPresentation()).resolves.toBeUndefined();
    h.runtime.terminate();
  });

  it.each(["pause", "terminate", "dispose", "failure"] as const)(
    "releases pending post-control presentation waits on %s", async action => {
      const h = harnessV3();
      await h.runtime.initialize({ scenarios: [seedV3("edited", "Edited", 0)], activeScenarioId: "edited" });
      h.clients.get("edited")!.applyControl.mockResolvedValue({
        frame: { ...frameV3("edited", 0), inputEpoch: 1 }, fixture: { value: 1 },
      });
      await h.runtime.applyControl({ scenarioId: "edited", controlId: "test", value: 1, expectedInputEpoch: 0 });
      // A deliberately paused view does not need a future frame to run analysis.
      await expect(h.runtime.waitForControlPresentation()).resolves.toBeUndefined();
      h.runtime.playAll();
      const waiting = h.runtime.waitForControlPresentation();
      const asserted = action === "pause" ? expect(waiting).resolves.toBeUndefined()
        : expect(waiting).rejects.toThrow("not active");
      if (action === "pause") await h.runtime.pauseAll();
      else if (action === "terminate") h.runtime.terminate();
      else if (action === "dispose") await h.runtime.dispose();
      else h.conductor.fail(new Error("live failure"));
      await asserted;
      h.runtime.terminate();
    },
  );

  it.each([1, 2])("shares preparation outside the %s-slot pool without holding the live lane", async slots => {
    const requests: StudioSimulationWorkerRequestAnalysisClientInputV2[] = [];
    const releases: (() => void)[] = [];
    const clients: ReturnType<typeof clientV3>[] = [];
    const pool = new WorkbenchBackgroundWorkerPoolV3({ warmSize: 0, maxSize: slots }, () => {
      const client = clientV3("scenario/baseline"); clients.push(client);
      client.requestAnalysis.mockImplementation((request: StudioSimulationWorkerRequestAnalysisClientInputV2) => {
        requests.push(request);
        return new Promise(resolve => releases.push(() => resolve(analysisV3(request.runtimeSessionId, request.scenarioId, request.analysisId))));
      });
      return client as never;
    }, 8);
    const h = harnessV3(vi.fn(), pool, { resolveAnalysisExecutionPlan: () => ({
      partitions: ["hypovolemic", "hypervolemic"], sharedPreparation: true, merge: analyses => analyses[0]!,
    }) });
    await h.runtime.initialize({ scenarios: [seedV3("scenario/baseline", "Baseline", 0)], activeScenarioId: "scenario/baseline" });
    h.conductor.setPlaybackRate(1);
    h.runtime.playAll();
    const pending = h.runtime.requestAnalysis({ scenarioId: "scenario/baseline", analysisId: "analysis/shared",
      expectedInputEpoch: 0, expectedAcceptedRevision: 0, expectedAcceptedTimeSec: 0 });
    await vi.waitFor(() => expect(requests).toHaveLength(1));
    expect(h.conductor.running).toBe(true);
    expect(requests[0]!.sharePreparation).toBe(true);
    const preparation = { exactEndpoint: "detached", source: "same-capture" };
    requests[0]!.onProgress!(analysisV3(requests[0]!.runtimeSessionId, "scenario/baseline", "analysis/shared"), preparation);
    if (slots === 2) await vi.waitFor(() => expect(requests).toHaveLength(2));
    else { await Promise.resolve(); await Promise.resolve(); expect(requests).toHaveLength(1); }
    releases[0]!();
    await vi.waitFor(() => expect(requests).toHaveLength(2));
    expect(requests[1]!.preparedAnalysis).toEqual(preparation);
    expect(requests[1]!.sharePreparation).toBeUndefined();
    expect(clients[0]!.initialize.mock.calls[0]![0].checkpoint).toBe(clients[1]!.initialize.mock.calls[0]![0].checkpoint);
    releases[1]!();
    await expect(pending).resolves.toMatchObject({ scenarioId: "scenario/baseline" });
    expect(clients.every(c => c.terminate.mock.calls.length === 1)).toBe(true);
    h.runtime.terminate(); pool.dispose();
  });

  it.each(["failure", "missing", "cancel"])("releases waiting partitions after preparation %s", async kind => {
    let finish!: () => void;
    const clients: ReturnType<typeof clientV3>[] = [];
    const pool = new WorkbenchBackgroundWorkerPoolV3({ warmSize: 0, maxSize: 1 }, () => {
      const client = clientV3("scenario/baseline"); clients.push(client);
      client.requestAnalysis.mockImplementation((request: StudioSimulationWorkerRequestAnalysisClientInputV2) => new Promise((resolve, reject) => {
        finish = () => kind === "failure" ? reject(new Error("anchor failed"))
          : resolve(analysisV3(request.runtimeSessionId, request.scenarioId, request.analysisId));
      }));
      return client as never;
    }, 8);
    const h = harnessV3(vi.fn(), pool, { resolveAnalysisExecutionPlan: () => ({
      partitions: ["low", "high"], sharedPreparation: true, merge: analyses => analyses[0]!,
    }) });
    await h.runtime.initialize({ scenarios: [seedV3("scenario/baseline", "Baseline", 0)], activeScenarioId: "scenario/baseline" });
    const pending = h.runtime.requestAnalysis({ scenarioId: "scenario/baseline", analysisId: "analysis/shared",
      expectedInputEpoch: 0, expectedAcceptedRevision: 0, expectedAcceptedTimeSec: 0 });
    const rejected = expect(pending).rejects.toThrow(kind === "failure" ? /anchor failed/ : kind === "missing" ? /did not provide/ : /cancel/);
    await vi.waitFor(() => expect(finish).toBeTypeOf("function"));
    if (kind === "cancel") h.runtime.cancelAnalysisJobs();
    finish();
    await rejected;
    expect(clients).toHaveLength(1);
    h.runtime.terminate(); pool.dispose();
  });

  it("shares an exact post-control capture with analysis and preserves current labels", async () => {
    const h = harnessV3();
    const scenarioId = "scenario/baseline";
    await h.runtime.initialize({ scenarios: [seedV3(scenarioId, "Baseline", 0)], activeScenarioId: scenarioId });
    const live = h.clients.get(scenarioId)!;
    live.applyControl.mockResolvedValue({ frame: { ...frameV3(scenarioId, 0), inputEpoch: 1 }, fixture: { value: 1 } });
    await h.runtime.applyControl({ scenarioId, controlId: "test", value: 1, expectedInputEpoch: 0 });
    const first = await h.runtime.captureScenario(scenarioId);
    h.analysisClients.get(scenarioId)!.requestAnalysis.mockResolvedValue(
      analysisV3("detached", scenarioId, "analysis/guyton-starling"));
    h.runtime.playAll();
    await h.runtime.requestAnalysis({ scenarioId, analysisId: "analysis/guyton-starling",
      expectedInputEpoch: 1, expectedAcceptedRevision: 0, expectedAcceptedTimeSec: 0 });
    expect(h.conductor.running).toBe(true);
    h.runtime.renameScenario({ scenarioId, label: "Renamed" });
    const second = (await h.runtime.captureScenarios()).scenarios[0]!;
    expect(second.capture).toBe(first.capture);
    expect(second.label).toBe("Renamed");
    expect(live.readScenarios).toHaveBeenCalledOnce();
    h.runtime.terminate();
  });

  it("invalidates captures before advancing and after same-clock input changes", async () => {
    const h = harnessV3();
    const scenarioId = "scenario/baseline";
    await h.runtime.initialize({ scenarios: [seedV3(scenarioId, "Baseline", 0)], activeScenarioId: scenarioId });
    const live = h.clients.get(scenarioId)!;
    const first = await h.runtime.captureScenario(scenarioId);
    live.applyControl.mockResolvedValue({ frame: { ...frameV3(scenarioId, 0), inputEpoch: 1 }, fixture: { value: 1 } });
    await h.runtime.applyControl({ scenarioId, controlId: "test", value: 1, expectedInputEpoch: 0 });
    const changed = await h.runtime.captureScenario(scenarioId);
    expect(changed.capture).not.toBe(first.capture);
    expect(live.readScenarios).toHaveBeenCalledTimes(2);
    live.advancePresentation.mockResolvedValueOnce([{ ...frameV3(scenarioId, 1), inputEpoch: 1 }]);
    live.readScenarios.mockResolvedValueOnce({ activeScenarioId: scenarioId,
      scenarios: [scenarioV3(scenarioId, "Baseline", 1)] });
    await h.conductor.dependencies.lanes()[0]!.advance(1);
    const advanced = await h.runtime.captureScenario(scenarioId);
    expect(advanced.capture.checkpoint.acceptedRevision).toBe(1);
    expect(live.readScenarios).toHaveBeenCalledTimes(3);
    h.runtime.terminate();
  });

  it("coalesces concurrent boundary reads and retries a failed capture", async () => {
    const h = harnessV3();
    const scenarioId = "scenario/baseline";
    await h.runtime.initialize({ scenarios: [seedV3(scenarioId, "Baseline", 0)], activeScenarioId: scenarioId });
    const live = h.clients.get(scenarioId)!;
    live.readScenarios.mockRejectedValueOnce(new Error("capture failed"));
    const failed = await Promise.allSettled([
      h.runtime.captureScenario(scenarioId), h.runtime.captureScenario(scenarioId),
    ]);
    expect(failed.every(result => result.status === "rejected")).toBe(true);
    expect(live.readScenarios).toHaveBeenCalledOnce();
    await expect(h.runtime.captureScenario(scenarioId)).resolves.toMatchObject({ scenarioId });
    expect(live.readScenarios).toHaveBeenCalledTimes(2);
    h.runtime.terminate();
  });

  it.each(["advance", "control"] as const)("does not serve an earlier capture while %s is in flight", async operation => {
    const h = harnessV3();
    const scenarioId = "scenario/baseline";
    await h.runtime.initialize({ scenarios: [seedV3(scenarioId, "Baseline", 0)], activeScenarioId: scenarioId });
    const live = h.clients.get(scenarioId)!;
    await h.runtime.captureScenario(scenarioId);
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    live.applyControl.mockImplementation(async () => {
      await gate;
      return { frame: { ...frameV3(scenarioId, 0), inputEpoch: 1 }, fixture: { value: 1 } };
    });
    live.advancePresentation.mockImplementation(async () => {
      await gate;
      return [frameV3(scenarioId, 1)];
    });
    // The actual Worker client rejects overlapping operations. A cache must
    // not bypass that guard just because the response frame has not arrived.
    live.readScenarios.mockRejectedValueOnce(new Error("operation in flight"));
    const pending = operation === "advance"
      ? h.conductor.dependencies.lanes()[0]!.advance(1)
      : h.runtime.applyControl({ scenarioId, controlId: "test", value: 1, expectedInputEpoch: 0 });
    await expect(h.runtime.captureScenario(scenarioId)).rejects.toThrow("operation in flight");
    expect(live.readScenarios).toHaveBeenCalledTimes(2);
    release();
    await pending;
    h.runtime.terminate();
  });

  it("does not cache a capture from another accepted clock", async () => {
    const h = harnessV3();
    const scenarioId = "scenario/baseline";
    await h.runtime.initialize({ scenarios: [seedV3(scenarioId, "Baseline", 0)], activeScenarioId: scenarioId });
    const live = h.clients.get(scenarioId)!;
    live.readScenarios.mockResolvedValueOnce({ activeScenarioId: scenarioId,
      scenarios: [scenarioV3(scenarioId, "Baseline", 1)] });
    await expect(h.runtime.captureScenario(scenarioId)).rejects.toThrow("capture clocks differ");
    const current = await h.runtime.captureScenario(scenarioId);
    expect(current.capture.checkpoint.acceptedRevision).toBe(0);
    expect(live.readScenarios).toHaveBeenCalledTimes(2);
    h.runtime.terminate();
  });
  it("starts optional prepared-data loading alongside initialization without waiting or advancing the model", async () => {
    let releaseFrame!: (frame: StudioSimulationFrameV2) => void;
    let releaseAsset!: (analysis: StudioSimulationAnalysisV2 | null) => void;
    const initialFrame = new Promise<StudioSimulationFrameV2>(resolve => { releaseFrame = resolve; });
    const asset = new Promise<StudioSimulationAnalysisV2 | null>(resolve => { releaseAsset = resolve; });
    const client = clientV3("scenario/baseline");
    client.initialize.mockImplementation(() => initialFrame);
    const load = vi.fn(() => asset);
    const h = harnessV3(undefined, undefined, { createClient: () => client, loadPreparedAnalysis: load });
    const seed = { ...seedV3("scenario/baseline", "Baseline", 0), checkpoint: checkpointV3(0) };
    const starting = h.runtime.initialize({ scenarios: [seed], activeScenarioId: seed.scenarioId });
    await vi.waitFor(() => expect(load).toHaveBeenCalledWith(seed));
    expect(client.initialize).toHaveBeenCalledOnce();
    releaseFrame(frameV3(seed.scenarioId, 0));
    await starting;
    expect(h.runtime.latestFrame(seed.scenarioId).acceptedRevision).toBe(0);
    expect(client.advance).not.toHaveBeenCalled();
    expect(client.advancePresentation).not.toHaveBeenCalled();
    releaseAsset(null);
    h.runtime.terminate();
  });

  it("contains an optional prepared-data rejection even if initialization also fails", async () => {
    const client = clientV3("scenario/baseline");
    client.initialize.mockRejectedValue(new Error("initialization failed"));
    const h = harnessV3(undefined, undefined, {
      createClient: () => client,
      loadPreparedAnalysis: () => { throw new Error("optional asset failed"); },
    });
    await expect(h.runtime.initialize({ scenarios: [{ ...seedV3("scenario/baseline", "Baseline", 0), checkpoint: checkpointV3(0) }], activeScenarioId: "scenario/baseline" })).rejects.toThrow();
    expect(client.terminate).toHaveBeenCalled();
    h.runtime.terminate();
  });

  it("restores five lanes and adds another independent Scenario", async () => {
    const harness = harnessV3();
    const scenarios = Array.from({ length: 5 }, (_, index) => seedV3(`scenario/baseline-${index}`, `baseline ${index + 1}`, 0));
    await harness.runtime.initialize({ scenarios, activeScenarioId: scenarios[0].scenarioId });
    expect(harness.runtime.descriptors()).toHaveLength(5);
    const added = await harness.runtime.addScenario(seedV3("scenario/extra", "baseline 6", 0));
    expect(added.scenarios).toHaveLength(6);
    const captures = await harness.runtime.captureScenarios();
    expect(new Set(captures.scenarios.map(scenario => scenario.scenarioId)).size).toBe(6);
    expect(captures.scenarios[0].capture).not.toBe(captures.scenarios[1].capture);
    harness.runtime.terminate();
  });
  it("reuses a prepared launch family without a numerical analysis Worker, preserving its original source clock", async () => {
    const saved = analysisV3("offline", "registered-preset", "analysis/guyton-starling");
    const load = vi.fn(async () => saved);
    const h = harnessV3(undefined, undefined, { loadPreparedAnalysis: load });
    await h.runtime.initialize({ scenarios: [{ ...seedV3("scenario/baseline", "Baseline", 0), checkpoint: checkpointV3(0) }], activeScenarioId: "scenario/baseline" });
    h.runtime.playAll();
    const released = vi.fn();
    const result = await h.runtime.requestAnalysis({ scenarioId: "scenario/baseline", analysisId: saved.analysisId,
      expectedInputEpoch: 0, expectedAcceptedRevision: 0, expectedAcceptedTimeSec: 0, onLiveLaneReleased: released });
    expect(result).toEqual({ ...saved, runtimeSessionId: "runtime/scenario/baseline", scenarioId: "scenario/baseline" });
    expect(load).toHaveBeenCalledOnce();
    expect(released).toHaveBeenCalledOnce();
    expect(h.conductor.running).toBe(true);
    expect(h.analysisClients.get("scenario/baseline")!.initialize).not.toHaveBeenCalled();
    h.runtime.terminate();
  });

  it("does not reuse initial analysis after an accepted input change", async () => {
    const saved = analysisV3("offline", "registered-preset", "analysis/guyton-starling");
    const h = harnessV3(undefined, undefined, { loadPreparedAnalysis: async () => saved });
    await h.runtime.initialize({ scenarios: [{ ...seedV3("scenario/baseline", "Baseline", 0), checkpoint: checkpointV3(0) }], activeScenarioId: "scenario/baseline" });
    const changed = { ...frameV3("scenario/baseline", 0), inputEpoch: 1 };
    h.clients.get("scenario/baseline")!.applyControl.mockResolvedValue({ frame: changed, fixture: { value: 1 } });
    await h.runtime.applyControl({ scenarioId: "scenario/baseline", controlId: "test", value: 1,
      expectedInputEpoch: 0 });
    const worker = h.analysisClients.get("scenario/baseline")!;
    worker.requestAnalysis.mockResolvedValue({ ...saved, scenarioId: "scenario/baseline" });
    const result = await h.runtime.requestAnalysis({ scenarioId: "scenario/baseline", analysisId: saved.analysisId,
      expectedInputEpoch: 1, expectedAcceptedRevision: 0, expectedAcceptedTimeSec: 0 });
    expect(worker.initialize).toHaveBeenCalledOnce();
    expect(result.inputEpoch).toBe(1);
    h.runtime.terminate();
  });
  it("discards a prepared result when a control is accepted while the asset is loading", async () => {
    const saved = analysisV3("offline", "registered-preset", "analysis/guyton-starling");
    let resolveAsset!: (value: StudioSimulationAnalysisV2) => void;
    const asset = new Promise<StudioSimulationAnalysisV2>(resolve => { resolveAsset = resolve; });
    const h = harnessV3(undefined, undefined, { loadPreparedAnalysis: () => asset });
    await h.runtime.initialize({ scenarios: [{ ...seedV3("scenario/baseline", "Baseline", 0), checkpoint: checkpointV3(0) }], activeScenarioId: "scenario/baseline" });
    const released = vi.fn();
    const pending = h.runtime.requestAnalysis({ scenarioId: "scenario/baseline", analysisId: saved.analysisId,
      expectedInputEpoch: 0, expectedAcceptedRevision: 0, expectedAcceptedTimeSec: 0, onLiveLaneReleased: released }).catch(error => error);
    await vi.waitFor(() => expect(released).toHaveBeenCalledOnce());
    h.clients.get("scenario/baseline")!.applyControl.mockResolvedValue({ frame: { ...frameV3("scenario/baseline", 0), inputEpoch: 1 }, fixture: { value: 1 } });
    await h.runtime.applyControl({ scenarioId: "scenario/baseline", controlId: "test", value: 1, expectedInputEpoch: 0 });
    resolveAsset(saved);
    expect((await pending).message).toContain("Prepared analysis target changed");
    expect(h.runtime.latestFrame("scenario/baseline").inputEpoch).toBe(1);
    h.runtime.terminate();
  });

  it("falls back to numerical analysis when the optional prepared asset cannot load", async () => {
    const h = harnessV3(undefined, undefined, { loadPreparedAnalysis: async () => { throw new Error("network unavailable"); } });
    await h.runtime.initialize({ scenarios: [{ ...seedV3("scenario/baseline", "Baseline", 0), checkpoint: checkpointV3(0) }], activeScenarioId: "scenario/baseline" });
    h.analysisClients.get("scenario/baseline")!.requestAnalysis.mockResolvedValue(
      analysisV3("detached", "scenario/baseline", "analysis/guyton-starling"));
    const result = await h.runtime.requestAnalysis({ scenarioId: "scenario/baseline", analysisId: "analysis/guyton-starling",
      expectedInputEpoch: 0, expectedAcceptedRevision: 0, expectedAcceptedTimeSec: 0 });
    expect(result.analysisId).toBe("analysis/guyton-starling");
    expect(h.analysisClients.get("scenario/baseline")!.initialize).toHaveBeenCalledOnce();
    h.runtime.terminate();
  });
  it("measures visible playback while detached analysis survives a Scenario addition", async () => {
    let releaseAnalysis!: (value: string) => void;
    const analysisGate = new Promise<string>((resolve) => { releaseAnalysis = resolve; });
    const pool = new WorkbenchBackgroundWorkerPoolV3(
      { warmSize: 0, maxSize: 1 },
      () => ({ terminate: vi.fn() }) as never,
      4,
    );
    const analysis = pool.schedule("analysis", () => analysisGate);
    await Promise.resolve();
    const harness = harnessV3(vi.fn(), pool);
    try {
      await harness.runtime.initialize({
        scenarios: [seedV3("scenario/baseline", "Baseline", 0)],
        activeScenarioId: "scenario/baseline",
      });
      harness.runtime.playAll();
      expect(harness.conductor.dependencies.capacityMeasurementEligible?.())
        .toBe(true);
      await harness.runtime.pauseAll();
      await harness.runtime.addScenario(seedV3("scenario/as", "AS", 0));
      harness.runtime.playAll();
      expect(harness.conductor.dependencies.capacityMeasurementEligible?.())
        .toBe(true);

      vi.stubGlobal("document", { visibilityState: "hidden" });
      expect(harness.conductor.dependencies.capacityMeasurementEligible?.())
        .toBe(false);
      vi.stubGlobal("document", { visibilityState: "visible" });
      expect(harness.conductor.dependencies.capacityMeasurementEligible?.())
        .toBe(true);
      releaseAnalysis("complete");
      await expect(analysis.promise).resolves.toBe("complete");
    } finally {
      vi.unstubAllGlobals();
      releaseAnalysis("complete");
      await analysis.promise;
      await harness.runtime.dispose();
      pool.dispose();
    }
  });

  it("creates one persistent Worker per Scenario under one TimeConductor", async () => {
    const harness = harnessV3();
    const state = await harness.runtime.initialize({
      scenarios: [
        seedV3("scenario/baseline", "Baseline", 0),
        seedV3("scenario/comparison", "Comparison", 4),
      ],
      activeScenarioId: "scenario/comparison",
    });

    expect([...harness.clients]).toHaveLength(2);
    expect(harness.clients.get("scenario/baseline")?.initialize)
      .toHaveBeenCalledWith(expect.objectContaining({
        runtimeSessionId: "runtime/scenario/baseline",
        scenarioId: "scenario/baseline",
        fixture: { value: 0 },
      }));
    expect(harness.clients.get("scenario/comparison")?.initialize)
      .toHaveBeenCalledWith(expect.objectContaining({
        runtimeSessionId: "runtime/scenario/comparison",
        scenarioId: "scenario/comparison",
        checkpoint: expect.objectContaining({ acceptedRevision: 4 }),
      }));
    expect(state.activeScenarioId).toBe("scenario/comparison");
    expect(harness.conductor.dependencies).toMatchObject({
      batchSteps: 16,
      presentationIntervalMs: 16,
      maximumPresentationFramesPerLane: 8,
    });
    expect(harness.conductor.dependencies.lanes().map(({ laneId }) => laneId))
      .toEqual(["scenario/baseline", "scenario/comparison"]);

    harness.runtime.playAll();
    expect(harness.conductor.running).toBe(true);
    await harness.runtime.pauseAll();
    expect(harness.conductor.running).toBe(false);
  });

  it("keeps latest-value state on complete terminal frames between visual slices", async () => {
    const client = clientV3("scenario/baseline");
    const completeOutputs = {
      selected: scalarOutputV3("selected", 1),
      "latest-only": scalarOutputV3("latest-only", 7),
    };
    client.initialize.mockResolvedValue(frameV3(
      "scenario/baseline",
      0,
      completeOutputs,
    ));
    let conductor: FakeTimeConductorV3 | undefined;
    const runtime = new WorkbenchParallelScenarioRuntimeV3({
      releaseTicket: STANDARD_TEST_RELEASE_TICKET_V1,
      expectedModelId: "model/main-wire-v3-r1",
      createRuntimeSessionId: (scenarioId) => `runtime/${scenarioId}`,
      createClient: () => client as unknown as
        WorkbenchParallelScenarioRuntimeClientV3,
      createTimeConductor: (dependencies) => {
        conductor = new FakeTimeConductorV3(dependencies);
        return conductor;
      },
      onFrames: vi.fn(),
      onError: vi.fn(),
    });
    await runtime.initialize({
      scenarios: [seedV3("scenario/baseline", "Baseline", 0)],
      activeScenarioId: "scenario/baseline",
    });

    conductor!.emit([frameV3("scenario/baseline", 1, {
      selected: scalarOutputV3("selected", 2),
    })]);
    expect(runtime.latestFrame("scenario/baseline")).toMatchObject({
      acceptedRevision: 0,
      outputs: { "latest-only": { value: 7 } },
    });

    conductor!.emit([frameV3("scenario/baseline", 2, {
      selected: scalarOutputV3("selected", 3),
      "latest-only": scalarOutputV3("latest-only", 8),
    })]);
    expect(runtime.latestFrame("scenario/baseline")).toMatchObject({
      acceptedRevision: 2,
      outputs: { "latest-only": { value: 8 } },
    });

    conductor!.emit([frameV3("scenario/baseline", 1, completeOutputs)]);
    expect(runtime.latestFrame("scenario/baseline")).toMatchObject({
      acceptedRevision: 2,
      outputs: { "latest-only": { value: 8 } },
    });
  });

  it("reports live lane membership to the shared background QoS budget", async () => {
    const liveScenarioCounts: number[] = [];
    const backgroundWorkerPool = {
      setLiveScenarioCount: (count) => liveScenarioCounts.push(count),
      setForegroundPlaybackState: () => undefined,
      schedule: () => {
        throw new Error("background operation is not expected");
      },
      run: async () => {
        throw new Error("background operation is not expected");
      },
    } satisfies WorkbenchBackgroundWorkerPoolPortV3;
    const harness = harnessV3(vi.fn(), backgroundWorkerPool);

    await harness.runtime.initialize({
      scenarios: [
        seedV3("scenario/baseline", "Baseline", 0),
        seedV3("scenario/comparison", "Comparison", 0),
      ],
      activeScenarioId: "scenario/baseline",
    });
    // Initialization reserves both lanes while their Workers are being built,
    // then releases that reservation until playback actually starts.
    expect(liveScenarioCounts).toContain(2);
    expect(liveScenarioCounts.at(-1)).toBe(0);

    harness.runtime.playAll();
    expect(liveScenarioCounts.at(-1)).toBe(2);

    // Short, overlapping capture leases must not release the foreground
    // reservation and start analysis before initial calibration can finish.
    await harness.runtime.pauseScenario("scenario/baseline");
    await harness.runtime.pauseScenario("scenario/comparison");
    expect(harness.conductor.running).toBe(false);
    expect(liveScenarioCounts.at(-1)).toBe(2);
    harness.runtime.resumeScenario("scenario/baseline");
    expect(liveScenarioCounts.at(-1)).toBe(2);
    // A genuine global pause still gives idle capacity back to analysis.
    await harness.runtime.pauseAll();
    expect(liveScenarioCounts.at(-1)).toBe(0);
    const releaseControl = harness.runtime.reserveForegroundCapacity();
    const releaseNested = harness.runtime.reserveForegroundCapacity();
    await harness.runtime.pauseAll();
    expect(liveScenarioCounts.at(-1)).toBe(2);
    releaseNested();
    releaseNested(); // Idempotence must not release the outer transaction.
    expect(liveScenarioCounts.at(-1)).toBe(2);
    releaseControl();
    expect(liveScenarioCounts.at(-1)).toBe(0);
    expect(harness.conductor.running).toBe(false);
    harness.runtime.resumeScenario("scenario/comparison");
    expect(liveScenarioCounts.at(-1)).toBe(0);
    harness.runtime.playAll();
    expect(liveScenarioCounts.at(-1)).toBe(2);
    harness.conductor.pause.mockRejectedValueOnce(new Error("pause failed"));
    await expect(harness.runtime.pauseScenario("scenario/baseline")).rejects.toThrow("pause failed");
    expect(liveScenarioCounts.at(-1)).toBe(2);
    await harness.runtime.pauseScenario("scenario/baseline");
    harness.runtime.resumeScenario("scenario/baseline");
    expect(harness.conductor.running).toBe(true);

    await harness.runtime.addScenario(
      seedV3("scenario/third", "Third", 0),
    );
    expect(liveScenarioCounts.at(-1)).toBe(3);

    await harness.runtime.deleteScenario("scenario/third");
    expect(liveScenarioCounts.at(-1)).toBe(2);
    await harness.runtime.pauseAll();
    expect(liveScenarioCounts.at(-1)).toBe(0);
    harness.runtime.playAll();
    expect(liveScenarioCounts.at(-1)).toBe(2);
    const releaseRetiredControl = harness.runtime.reserveForegroundCapacity();
    harness.runtime.terminate();
    expect(liveScenarioCounts.at(-1)).toBe(0);
    const countAfterTermination = liveScenarioCounts.length;
    releaseRetiredControl();
    expect(liveScenarioCounts).toHaveLength(countAfterTermination);
  });

  it("pauses the shared comparison clock for a short Scenario lease", async () => {
    const harness = harnessV3();
    await harness.runtime.initialize({
      scenarios: [
        seedV3("scenario/baseline", "Baseline", 0),
        seedV3("scenario/comparison", "Comparison", 0),
      ],
      activeScenarioId: "scenario/baseline",
    });
    harness.runtime.playAll();

    await harness.runtime.pauseScenario("scenario/baseline");
    expect(harness.conductor.running).toBe(false);

    harness.runtime.resumeScenario("scenario/baseline");
    expect(harness.conductor.running).toBe(true);
  });

  it("releases a Scenario lease while globally paused", async () => {
    const harness = harnessV3();
    await harness.runtime.initialize({
      scenarios: [seedV3("scenario/baseline", "Baseline", 0)],
      activeScenarioId: "scenario/baseline",
    });
    harness.runtime.playAll();

    await harness.runtime.pauseScenario("scenario/baseline");
    await harness.runtime.pauseAll();
    harness.runtime.resumeScenario("scenario/baseline");
    harness.runtime.playAll();

    expect(harness.conductor.running).toBe(true);
  });

  it("waits for every overlapping Scenario lease before resuming", async () => {
    const harness = harnessV3();
    await harness.runtime.initialize({
      scenarios: [seedV3("scenario/baseline", "Baseline", 0)],
      activeScenarioId: "scenario/baseline",
    });
    harness.runtime.playAll();

    await harness.runtime.pauseScenario("scenario/baseline");
    await harness.runtime.pauseScenario("scenario/baseline");
    harness.runtime.resumeScenario("scenario/baseline");
    expect(harness.conductor.running).toBe(false);

    harness.runtime.resumeScenario("scenario/baseline");
    expect(harness.conductor.running).toBe(true);
  });

  it("runs analysis in an isolated Worker and resumes the live lane after capture", async () => {
    const harness = harnessV3();
    await harness.runtime.initialize({
      scenarios: [seedV3("scenario/baseline", "Baseline", 0)],
      activeScenarioId: "scenario/baseline",
    });
    harness.runtime.playAll();
    const analysisClient = harness.analysisClients.get("scenario/baseline")!;
    let releaseAnalysis!: (value: ReturnType<typeof analysisV3>) => void;
    analysisClient.requestAnalysis.mockImplementation((request) =>
      new Promise((resolve) => {
        releaseAnalysis = resolve;
        const initialized = analysisClient.initialize.mock.calls[0]![0] as {
          runtimeSessionId: string;
        };
        void request;
        queueMicrotask(() => releaseAnalysis(analysisV3(
          initialized.runtimeSessionId,
          "scenario/baseline",
          "analysis/guyton-starling",
        )));
      }));

    const pending = harness.runtime.requestAnalysis({
      scenarioId: "scenario/baseline",
      analysisId: "analysis/guyton-starling",
      expectedInputEpoch: 0,
      expectedAcceptedRevision: 0,
      expectedAcceptedTimeSec: 0,
    });
    await vi.waitFor(() => {
      expect(analysisClient.requestAnalysis).toHaveBeenCalledOnce();
    });

    expect(harness.clients.get("scenario/baseline")?.requestAnalysis)
      .not.toHaveBeenCalled();
    expect(analysisClient.initialize).toHaveBeenCalledWith(
      expect.objectContaining({
        checkpoint: expect.objectContaining({ acceptedRevision: 0 }),
      }),
    );
    expect(harness.conductor.running).toBe(true);
    await expect(pending).resolves.toMatchObject({
      runtimeSessionId: "runtime/scenario/baseline",
      scenarioId: "scenario/baseline",
      sourceAcceptedRevision: 0,
    });
    expect(analysisClient.terminate).toHaveBeenCalledOnce();
  });

  it("consumes a caller-owned pause lease immediately after analysis capture", async () => {
    const harness = harnessV3();
    await harness.runtime.initialize({
      scenarios: [seedV3("scenario/baseline", "Baseline", 0)],
      activeScenarioId: "scenario/baseline",
    });
    harness.runtime.playAll();
    await harness.runtime.pauseScenario("scenario/baseline");
    expect(harness.conductor.running).toBe(false);
    const analysisClient = harness.analysisClients.get("scenario/baseline")!;
    analysisClient.requestAnalysis.mockImplementation(async () => {
      const initialized = analysisClient.initialize.mock.calls[0]![0] as {
        runtimeSessionId: string;
      };
      return analysisV3(
        initialized.runtimeSessionId,
        "scenario/baseline",
        "analysis/guyton-starling",
      );
    });

    const pending = harness.runtime.requestAnalysis({
      scenarioId: "scenario/baseline",
      analysisId: "analysis/guyton-starling",
      expectedInputEpoch: 0,
      expectedAcceptedRevision: 0,
      expectedAcceptedTimeSec: 0,
      sourceAlreadyPaused: true,
    });
    await vi.waitFor(() => {
      expect(harness.analysisClients.get("scenario/baseline")?.requestAnalysis)
        .toHaveBeenCalledOnce();
    });

    expect(harness.conductor.running).toBe(true);
    await expect(pending).resolves.toMatchObject({
      scenarioId: "scenario/baseline",
    });
    // A caller's defensive finally may release again; this is intentionally
    // idempotent and must not alter the running group.
    harness.runtime.resumeScenario("scenario/baseline");
    expect(harness.conductor.running).toBe(true);
  });

  it("releases the transferred pause lease if resolving the analysis plan fails", async () => {
    const harness = harnessV3(vi.fn(), undefined, {
      resolveAnalysisExecutionPlan: () => { throw new Error("invalid analysis plan"); },
    });
    await harness.runtime.initialize({
      scenarios: [seedV3("scenario/baseline", "Baseline", 0)],
      activeScenarioId: "scenario/baseline",
    });
    harness.runtime.playAll();
    await harness.runtime.pauseScenario("scenario/baseline");
    await harness.runtime.pauseScenario("scenario/baseline");
    await expect(harness.runtime.requestAnalysis({
      scenarioId: "scenario/baseline", analysisId: "analysis/guyton-starling",
      expectedInputEpoch: 0, expectedAcceptedRevision: 0, expectedAcceptedTimeSec: 0,
      sourceAlreadyPaused: true,
    })).rejects.toThrow("invalid analysis plan");
    // Only the transferred lease is released; another concurrent owner remains.
    expect(harness.conductor.running).toBe(false);
    harness.runtime.resumeScenario("scenario/baseline");
    expect(harness.conductor.running).toBe(true);
    await harness.runtime.dispose();
  });

  it("cancels obsolete Scenario analysis before applying a new control input", async () => {
    const cancelled = vi.fn();
    const scheduled = vi.fn();
    const schedule = <T>(
      _priority: WorkbenchBackgroundJobPriorityV3,
      _operation: (
        client: import("@/studio/workers/StudioSimulationWorkerClientV2")
          .StudioSimulationWorkerClientV2,
      ) => Promise<T>,
    ): WorkbenchBackgroundJobHandleV3<T> => {
      scheduled();
      let rejectJob!: (reason: Error) => void;
      let cancellationAccepted = false;
      const promise = new Promise<T>((_resolve, reject) => {
        rejectJob = reject;
      });
      return Object.freeze({
        promise,
        promote: () => undefined,
        cancel: () => {
          if (cancellationAccepted) return false;
          cancellationAccepted = true;
          cancelled();
          rejectJob(new Error("analysis cancelled after input change"));
          return true;
        },
      });
    };
    const backgroundWorkerPool = {
      setLiveScenarioCount: () => undefined,
      setForegroundPlaybackState: () => undefined,
      schedule,
      run: async <T>(
        priority: WorkbenchBackgroundJobPriorityV3,
        operation: (
          client: import("@/studio/workers/StudioSimulationWorkerClientV2")
            .StudioSimulationWorkerClientV2,
        ) => Promise<T>,
      ) => await schedule(priority, operation).promise,
    } satisfies WorkbenchBackgroundWorkerPoolPortV3;
    const harness = harnessV3(vi.fn(), backgroundWorkerPool);
    await harness.runtime.initialize({
      scenarios: [seedV3("scenario/baseline", "Baseline", 0)],
      activeScenarioId: "scenario/baseline",
    });

    const pendingAnalysis = harness.runtime.requestAnalysis({
      scenarioId: "scenario/baseline",
      analysisId: "analysis/guyton-starling",
      expectedInputEpoch: 0,
      expectedAcceptedRevision: 0,
      expectedAcceptedTimeSec: 0,
    });
    await vi.waitFor(() => expect(scheduled).toHaveBeenCalledOnce());
    const liveClient = harness.clients.get("scenario/baseline")!;
    liveClient.applyControl
      .mockRejectedValueOnce(new Error("control rejected"));
    await expect(harness.runtime.applyControl({
      scenarioId: "scenario/baseline",
      controlId: "control/systemic-resistance",
      value: 1.01,
      expectedInputEpoch: 0,
    })).rejects.toThrow("control rejected");
    expect(cancelled).not.toHaveBeenCalled();

    liveClient.applyControl
      .mockResolvedValueOnce(Object.freeze({
        frame: { ...frameV3("scenario/baseline", 0), inputEpoch: 1 },
        fixture: { value: 1.01 },
      }));
    const captureCountBeforeControl = liveClient.readScenarios.mock.calls.length;

    await expect(harness.runtime.applyControl({
      scenarioId: "scenario/baseline",
      controlId: "control/systemic-resistance",
      value: 1.01,
      expectedInputEpoch: 0,
    })).resolves.toMatchObject({ frame: { inputEpoch: 1 }, fixture: { value: 1.01 } });
    expect(cancelled).toHaveBeenCalledOnce();
    // Accepted settings arrive without a checkpoint read. A later detached
    // analysis/authoring capture can still seed a speculative warm start.
    expect(liveClient.readScenarios).toHaveBeenCalledTimes(captureCountBeforeControl);
    harness.runtime.selectBestAvailableScenarioCaptures({
      activeScenarioId: "scenario/baseline",
      scenarios: [await harness.runtime.captureScenario("scenario/baseline")],
    });
    expect(liveClient.readScenarios).toHaveBeenCalledTimes(captureCountBeforeControl + 1);
    expect(scheduled).toHaveBeenCalledTimes(2);
    await expect(pendingAnalysis).rejects.toThrow(
      "analysis cancelled after input change",
    );
    await harness.runtime.dispose();
  });

  it("starts hypovolemic and hypervolemic analysis Workers from one exact capture", async () => {
    const liveClient = clientV3("scenario/baseline");
    const analysisClients = new Map<string, ReturnType<typeof clientV3>>();
    const releases = new Map<string, () => void>();
    const started: string[] = [];
    const onProgress = vi.fn<(analysis: StudioSimulationAnalysisV2) => void>();
    const onLiveLaneReleased = vi.fn();
    let conductor: FakeTimeConductorV3 | null = null;
    const runtime = new WorkbenchParallelScenarioRuntimeV3({
    releaseTicket: STANDARD_TEST_RELEASE_TICKET_V1,
      expectedModelId: "model/main-wire-v3-r1",
      createRuntimeSessionId: (scenarioId) => `runtime/${scenarioId}`,
      createClient: () => liveClient as unknown as
        WorkbenchParallelScenarioRuntimeClientV3,
      createAnalysisClient: (_scenarioId, analysisPartition) => {
        if (analysisPartition === undefined) {
          throw new Error("partitioned analysis Worker requires a direction");
        }
        const client = clientV3("scenario/baseline");
        client.requestAnalysis.mockImplementation((request) => {
          const workerRequest = request as unknown as Readonly<{
            runtimeSessionId: string;
            scenarioId: string;
            analysisId: string;
            analysisPartition?: string;
            onProgress?: (analysis: StudioSimulationAnalysisV2) => void;
          }>;
          started.push(analysisPartition);
          const result: StudioSimulationAnalysisV2 = Object.freeze({
            ...analysisV3(
              workerRequest.runtimeSessionId,
              workerRequest.scenarioId,
              workerRequest.analysisId,
            ),
            payload: Object.freeze({
              status: "available",
              partition: analysisPartition,
            }),
          });
          workerRequest.onProgress?.(result);
          return new Promise<StudioSimulationAnalysisV2>((resolve) => {
            releases.set(analysisPartition, () => resolve(result));
          });
        });
        analysisClients.set(analysisPartition, client);
        return client as unknown as WorkbenchParallelScenarioRuntimeClientV3;
      },
      createTimeConductor: (dependencies) => {
        conductor = new FakeTimeConductorV3(dependencies);
        return conductor;
      },
      resolveAnalysisExecutionPlan: (analysisId) =>
        analysisId === "analysis/guyton-starling"
          ? Object.freeze({
              partitions: Object.freeze(["hypovolemic", "hypervolemic"]),
              merge: (analyses) => Object.freeze({
                ...analyses[0]!,
                payload: Object.freeze({
                  status: "available",
                  partitions: Object.freeze(analyses.map((analysis) =>
                    (analysis.payload as Readonly<{ partition: string }>)
                      .partition).sort()),
                }),
              }),
            })
          : null,
      onFrames: vi.fn(),
      onError: vi.fn(),
    });
    await runtime.initialize({
      scenarios: [seedV3("scenario/baseline", "Baseline", 0)],
      activeScenarioId: "scenario/baseline",
    });
    runtime.playAll();

    const pending = runtime.requestAnalysis({
      scenarioId: "scenario/baseline",
      analysisId: "analysis/guyton-starling",
      expectedInputEpoch: 0,
      expectedAcceptedRevision: 0,
      expectedAcceptedTimeSec: 0,
      onProgress,
      onLiveLaneReleased,
    });
    await vi.waitFor(() => expect(started.sort()).toEqual([
      "hypervolemic",
      "hypovolemic",
    ]));

    expect(conductor?.running).toBe(true);
    expect(onLiveLaneReleased).toHaveBeenCalledOnce();
    const lowClient = analysisClients.get("hypovolemic")!;
    const highClient = analysisClients.get("hypervolemic")!;
    expect(lowClient.initialize).toHaveBeenCalledOnce();
    expect(highClient.initialize).toHaveBeenCalledOnce();
    expect(lowClient.initialize.mock.calls[0]![0].checkpoint)
      .toBe(highClient.initialize.mock.calls[0]![0].checkpoint);
    expect(lowClient.requestAnalysis).toHaveBeenCalledWith(
      expect.objectContaining({ analysisPartition: "hypovolemic" }),
    );
    expect(highClient.requestAnalysis).toHaveBeenCalledWith(
      expect.objectContaining({ analysisPartition: "hypervolemic" }),
    );
    expect(onProgress).toHaveBeenCalledTimes(2);
    expect(onProgress.mock.calls.at(-1)?.[0].payload).toEqual({
      status: "available",
      partitions: ["hypervolemic", "hypovolemic"],
    });

    releases.get("hypovolemic")!();
    releases.get("hypervolemic")!();
    await expect(pending).resolves.toMatchObject({
      runtimeSessionId: "runtime/scenario/baseline",
      payload: {
        status: "available",
        partitions: ["hypervolemic", "hypovolemic"],
      },
    });
    expect(lowClient.terminate).toHaveBeenCalledOnce();
    expect(highClient.terminate).toHaveBeenCalledOnce();
  });

  it("publishes a TimeConductor group slice in one presentation commit", async () => {
    const harness = harnessV3();
    await harness.runtime.initialize({
      scenarios: [
        seedV3("scenario/baseline", "Baseline", 0),
        seedV3("scenario/comparison", "Comparison", 0),
      ],
      activeScenarioId: "scenario/baseline",
    });
    harness.runtime.playAll();
    harness.conductor.emit([
      frameV3("scenario/baseline", 1),
      frameV3("scenario/baseline", 2),
      frameV3("scenario/comparison", 1),
    ]);

    expect(harness.onFrames).toHaveBeenCalledOnce();
    expect(harness.onFrames.mock.calls[0]![0].map((frame) => [
      frame.scenarioId,
      frame.acceptedRevision,
    ])).toEqual([
      ["scenario/baseline", 1],
      ["scenario/baseline", 2],
      ["scenario/comparison", 1],
    ]);
    expect(harness.runtime.latestFrame("scenario/baseline").acceptedRevision)
      .toBe(2);
  });

  it("publishes one Scenario through the same group presentation boundary", async () => {
    const harness = harnessV3();
    await harness.runtime.initialize({
      scenarios: [seedV3("scenario/baseline", "Baseline", 0)],
      activeScenarioId: "scenario/baseline",
    });
    harness.conductor.emit([
      frameV3("scenario/baseline", 1),
      frameV3("scenario/baseline", 2),
    ]);

    expect(harness.onFrames).toHaveBeenCalledOnce();
    expect(harness.onFrames.mock.calls[0]![0].map(({ acceptedRevision }) =>
      acceptedRevision)).toEqual([1, 2]);
  });

  it("duplicates from the source lane's exact capture and keeps labels in the pool", async () => {
    const harness = harnessV3();
    await harness.runtime.initialize({
      scenarios: [seedV3("scenario/baseline", "Baseline", 3)],
      activeScenarioId: "scenario/baseline",
    });
    await harness.conductor.dependencies.lanes()[0]!.advance(6);
    const sourceCapture = scenarioV3(
      "scenario/baseline",
      "stale worker label",
      9,
    );
    harness.clients.get("scenario/baseline")!.readScenarios.mockResolvedValue({
      activeScenarioId: "scenario/baseline",
      scenarios: [sourceCapture],
    });

    const duplicated = await harness.runtime.duplicateScenario({
      sourceScenarioId: "scenario/baseline",
      scenarioId: "scenario/copy",
      label: "Copy",
    });
    expect(duplicated.activeScenarioId).toBe("scenario/copy");
    expect(harness.clients.get("scenario/copy")?.initialize)
      .toHaveBeenCalledWith(expect.objectContaining({
        fixture: { value: 9 },
        checkpoint: expect.objectContaining({ acceptedRevision: 9 }),
      }));
    const duplicateSeed = harness.clients.get("scenario/copy")?.initialize
      .mock.calls[0]![0] as Readonly<{
        fixture: unknown;
        checkpoint: unknown;
      }>;
    expect(duplicateSeed.fixture).not.toBe(sourceCapture.capture.fixture);
    expect(duplicateSeed.checkpoint).not.toBe(sourceCapture.capture.checkpoint);

    harness.runtime.renameScenario({
      scenarioId: "scenario/baseline",
      label: "Renamed baseline",
    });
    const captures = await harness.runtime.captureScenarios();
    expect(captures.scenarios.map(({ scenarioId, label }) =>
      [scenarioId, label])).toEqual([
      ["scenario/baseline", "Renamed baseline"],
      ["scenario/copy", "Copy"],
    ]);
  });

  it("routes controls to only the selected lane and disposes a deleted lane", async () => {
    const harness = harnessV3();
    await harness.runtime.initialize({
      scenarios: [
        seedV3("scenario/baseline", "Baseline", 0),
        seedV3("scenario/comparison", "Comparison", 0),
      ],
      activeScenarioId: "scenario/comparison",
    });
    const comparisonClient = harness.clients.get("scenario/comparison")!;
    comparisonClient.applyControl.mockResolvedValue(
      { frame: frameV3("scenario/comparison", 7), fixture: { value: 1.2 } },
    );
    await harness.runtime.applyControl({
      scenarioId: "scenario/comparison",
      controlId: "control/svr",
      value: 1.2,
      expectedInputEpoch: 0,
    });
    expect(comparisonClient.applyControl).toHaveBeenCalledOnce();
    expect(harness.clients.get("scenario/baseline")?.applyControl)
      .not.toHaveBeenCalled();

    const next = await harness.runtime.deleteScenario("scenario/comparison");
    expect(next.activeScenarioId).toBe("scenario/baseline");
    expect(harness.runtime.maybeLatestFrame("scenario/comparison"))
      .toBeUndefined();
    expect(harness.runtime.maybeLatestFrame("scenario/baseline"))
      .toBeDefined();
    expect(comparisonClient.terminate).toHaveBeenCalledOnce();
  });

  it("fail-closes every lane when the shared TimeConductor fails", async () => {
    const onError = vi.fn();
    const harness = harnessV3(onError);
    await harness.runtime.initialize({
      scenarios: [
        seedV3("scenario/baseline", "Baseline", 0),
        seedV3("scenario/comparison", "Comparison", 0),
      ],
      activeScenarioId: "scenario/baseline",
    });

    harness.conductor.emit([
      frameV3("scenario/baseline", 1),
      frameV3("scenario/baseline", 2),
    ]);
    expect(harness.onFrames).toHaveBeenCalledOnce();

    harness.conductor.fail(new Error("comparison Worker failed"));

    expect(harness.onFrames).toHaveBeenCalledOnce();
    expect(harness.onFrames.mock.calls[0]![0].map(({ acceptedRevision }) =>
      acceptedRevision)).toEqual([1, 2]);
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({
      message: "comparison Worker failed",
    }));
    expect([...harness.clients.values()].every(({ terminate }) =>
      terminate.mock.calls.length === 1)).toBe(true);
    const firstTerminate = Math.min(...[...harness.clients.values()].map(
      ({ terminate }) => terminate.mock.invocationCallOrder[0]!,
    ));
    expect(harness.onFrames.mock.invocationCallOrder[0])
      .toBeLessThan(firstTerminate);
    expect(firstTerminate).toBeLessThan(onError.mock.invocationCallOrder[0]!);
    expect(() => harness.runtime.activeFrame()).toThrow(/not active/);
    expect(() => harness.runtime.playAll()).not.toThrow();
    await expect(harness.runtime.pauseAll()).resolves.toBeUndefined();
  });

  it("does not publish a partial group when one real Worker lane fails", async () => {
    const clock = new ParallelSchedulerClockV3();
    const events: string[] = [];
    const clients = new Map<string, ReturnType<typeof clientV3>>();
    const runtime = new WorkbenchParallelScenarioRuntimeV3({
    releaseTicket: STANDARD_TEST_RELEASE_TICKET_V1,
      expectedModelId: "model/main-wire-v3-r1",
      createRuntimeSessionId: (scenarioId) => `runtime/${scenarioId}`,
      createClient: (scenarioId) => {
        const client = clientV3(scenarioId);
        let acceptedRevision = 0;
        client.advancePresentation.mockImplementation(async (input) => {
          if (scenarioId === "scenario/comparison") {
            throw new Error("comparison failed");
          }
          const { stepCount } = input as unknown as { stepCount: number };
          return Array.from({ length: stepCount }, () =>
            frameV3(scenarioId, acceptedRevision += 1));
        });
        clients.set(scenarioId, client);
        return client as unknown as WorkbenchParallelScenarioRuntimeClientV3;
      },
      createTimeConductor: (dependencies) =>
        new WorkbenchGroupTimeConductorV3({
          ...dependencies,
          nowMs: clock.now,
          schedule: clock.schedule,
          cancel: clock.cancel,
          batchSteps: 1,
          presentationIntervalMs: 0,
        }),
      onFrames: (frames) => events.push(...frames.map(
        ({ scenarioId, acceptedRevision }) =>
          `frame:${scenarioId}:${acceptedRevision}`,
      )),
      onError: (error) => events.push(`error:${error.message}`),
    });
    await runtime.initialize({
      scenarios: [
        seedV3("scenario/baseline", "Baseline", 0),
        seedV3("scenario/comparison", "Comparison", 0),
      ],
      activeScenarioId: "scenario/baseline",
    });

    runtime.playAll();
    await clock.advanceBy(1);
    await vi.waitFor(() => expect(events).toEqual([
      "error:comparison failed",
    ]));

    expect(events).toEqual(["error:comparison failed"]);
    expect([...clients.values()].every(({ terminate }) =>
      terminate.mock.calls.length === 1)).toBe(true);
    expect(() => runtime.activeFrame()).toThrow(/not active/);

    expect(events).toEqual(["error:comparison failed"]);
    await expect(runtime.pauseAll()).resolves.toBeUndefined();
    await runtime.dispose();
  });

  it("reserves an ID while a Scenario lane is being added", async () => {
    const harness = harnessV3();
    await harness.runtime.initialize({
      scenarios: [seedV3("scenario/baseline", "Baseline", 0)],
      activeScenarioId: "scenario/baseline",
    });
    const first = harness.runtime.addScenario(
      seedV3("scenario/comparison", "Comparison", 0),
    );
    await expect(harness.runtime.addScenario(
      seedV3("scenario/comparison", "Another comparison", 0),
    )).rejects.toThrow(/already exists/);
    await expect(first).resolves.toMatchObject({
      activeScenarioId: "scenario/comparison",
    });
    expect(harness.clients.get("scenario/comparison")?.initialize)
      .toHaveBeenCalledOnce();
  });

  it("does not allocate a Worker when runtime-session identity creation fails", async () => {
    const createClient = vi.fn(() =>
      clientV3("scenario/baseline") as unknown as
        WorkbenchParallelScenarioRuntimeClientV3);
    const runtime = new WorkbenchParallelScenarioRuntimeV3({
    releaseTicket: STANDARD_TEST_RELEASE_TICKET_V1,
      expectedModelId: "model/main-wire-v3-r1",
      createClient,
      createRuntimeSessionId: () => {
        throw new Error("identity unavailable");
      },
      onFrames: vi.fn(),
      onError: vi.fn(),
    });

    await expect(runtime.initialize({
      scenarios: [seedV3("scenario/baseline", "Baseline", 0)],
      activeScenarioId: "scenario/baseline",
    })).rejects.toThrow("identity unavailable");
    expect(createClient).not.toHaveBeenCalled();
  });

  it("fail-closes the pool if the TimeConductor rejects global playback", async () => {
    const onError = vi.fn();
    const harness = harnessV3(onError);
    await harness.runtime.initialize({
      scenarios: [
        seedV3("scenario/baseline", "Baseline", 0),
        seedV3("scenario/comparison", "Comparison", 0),
      ],
      activeScenarioId: "scenario/baseline",
    });
    harness.conductor.play.mockImplementationOnce(() => {
      throw new Error("TimeConductor disposed unexpectedly");
    });

    expect(() => harness.runtime.playAll()).not.toThrow();
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({
      message: "TimeConductor disposed unexpectedly",
    }));
    expect([...harness.clients.values()].every(({ terminate }) =>
      terminate.mock.calls.length === 1)).toBe(true);
  });
});

function harnessV3(
  onError = vi.fn<(error: Error) => void>(),
  backgroundWorkerPool?: WorkbenchBackgroundWorkerPoolPortV3,
  extra: Partial<WorkbenchParallelScenarioRuntimeDependenciesV3> = {},
) {
  const clients = new Map<string, ReturnType<typeof clientV3>>();
  const analysisClients = new Map<string, ReturnType<typeof clientV3>>();
  const onFrames = vi.fn<(frames: readonly StudioSimulationFrameV2[]) => void>();
  let conductor!: FakeTimeConductorV3;
  const runtime = new WorkbenchParallelScenarioRuntimeV3({
    releaseTicket: STANDARD_TEST_RELEASE_TICKET_V1,
    expectedModelId: "model/main-wire-v3-r1",
    createRuntimeSessionId: (scenarioId) => `runtime/${scenarioId}`,
    createClient: (scenarioId) => {
      const client = clientV3(scenarioId);
      clients.set(scenarioId, client);
      return client as unknown as WorkbenchParallelScenarioRuntimeClientV3;
    },
    createAnalysisClient: (scenarioId) => {
      const client = analysisClients.get(scenarioId) ?? clientV3(scenarioId);
      if (!analysisClients.has(scenarioId)) {
        analysisClients.set(scenarioId, client);
      }
      return client as unknown as WorkbenchParallelScenarioRuntimeClientV3;
    },
    createTimeConductor: (dependencies) => {
      conductor = new FakeTimeConductorV3(dependencies);
      return conductor;
    },
    onFrames,
    onError,
    ...(backgroundWorkerPool === undefined ? {} : { backgroundWorkerPool }),
    ...extra,
  });
  // Factories are lazy: provision deterministic analysis doubles for the
  // assertions before the request allocates one.
  for (const scenarioId of ["scenario/baseline", "scenario/comparison"]) {
    if (!analysisClients.has(scenarioId)) {
      const client = clientV3(scenarioId);
      analysisClients.set(scenarioId, client);
    }
  }
  return {
    analysisClients,
    clients,
    conductor,
    onFrames,
    runtime,
  };
}

class FakeTimeConductorV3 {
  running = false;
  readonly dispose = vi.fn(async () => { this.running = false; });
  readonly lanesChanged = vi.fn(() => this.playbackRateState());
  readonly pause = vi.fn(async () => { this.running = false; });
  readonly play = vi.fn(() => { this.running = true; });
  readonly terminate = vi.fn(() => { this.running = false; });
  readonly setPlaybackRate = vi.fn((rate: number) => {
    this.#rate = Object.freeze({
      playbackRate: rate,
      maximumRate: 1,
      calibrating: false,
      userSelected: true,
      performanceLimited: false,
    });
    this.dependencies.onPlaybackRateChange?.(this.#rate);
    return this.#rate;
  });
  #rate: WorkbenchGroupPlaybackRateStateV3 = AUTO_RATE_STATE_V3;

  constructor(
    readonly dependencies:
      WorkbenchGroupTimeConductorDependenciesV3<StudioSimulationFrameV2>,
  ) {}

  playbackRateState(): WorkbenchGroupPlaybackRateStateV3 {
    return this.#rate;
  }

  emit(frames: readonly StudioSimulationFrameV2[]): void {
    this.dependencies.onFrames(frames);
  }

  fail(error: Error): void {
    this.dependencies.onError(error);
  }
}

const AUTO_RATE_STATE_V3: WorkbenchGroupPlaybackRateStateV3 = Object.freeze({
  playbackRate: 1,
  maximumRate: null,
  calibrating: true,
  userSelected: false,
  performanceLimited: false,
});

class ParallelSchedulerClockV3 {
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

  async advanceBy(deltaMs: number): Promise<void> {
    this.#nowMs += deltaMs;
    for (let iteration = 0; iteration < 1_000; iteration += 1) {
      const due = [...this.#timers.entries()]
        .filter(([, timer]) => timer.atMs <= this.#nowMs)
        .sort((left, right) => left[1].atMs - right[1].atMs)[0];
      if (due === undefined) {
        await Promise.resolve();
        const newlyDue = [...this.#timers.values()].some(
          (timer) => timer.atMs <= this.#nowMs,
        );
        if (!newlyDue) return;
        continue;
      }
      this.#timers.delete(due[0]);
      due[1].callback();
      await Promise.resolve();
      await Promise.resolve();
    }
    throw new Error("parallel scheduler clock did not drain");
  }
}

function clientV3(scenarioId: string) {
  let clock = 0;
  const advance = async (input: number | { stepCount: number }) => {
    const stepCount = typeof input === "number" ? input : input.stepCount;
    return Array.from(
      { length: stepCount },
      () => frameV3(scenarioId, clock += 1),
    );
  };
  return {
    advance: vi.fn(advance),
    advancePresentation: vi.fn(advance),
    applyControl: vi.fn(),
    initialize: vi.fn(async (input: { checkpoint?: { acceptedRevision: number } }) => {
      clock = input.checkpoint?.acceptedRevision ?? 0;
      return frameV3(scenarioId, clock);
    }),
    readScenarios: vi.fn(async () => ({
      activeScenarioId: scenarioId,
      scenarios: [scenarioV3(scenarioId, scenarioId, clock)],
    })),
    requestAnalysis: vi.fn(),
    terminate: vi.fn(),
  };
}

function seedV3(scenarioId: string, label: string, clock: number) {
  return {
    scenarioId,
    label,
    fixture: { value: clock },
    ...(clock === 0 ? {} : { checkpoint: checkpointV3(clock) }),
  };
}

function scenarioV3(scenarioId: string, label: string, clock: number) {
  return {
    scenarioId,
    label,
    capture: {
      fixture: { value: clock },
      checkpoint: checkpointV3(clock),
    },
  };
}

function checkpointV3(clock: number) {
  return {
    acceptedRevision: clock,
    acceptedTimeSec: clock * 0.002,
    payload: { state: clock },
  };
}

function frameV3(
  scenarioId: string,
  acceptedRevision: number,
  outputs: StudioSimulationFrameV2["outputs"] = {},
): StudioSimulationFrameV2 {
  return {
    runtimeSessionId: `runtime/${scenarioId}`,
    scenarioId,
    modelId: "model/main-wire-v3-r1",
    inputEpoch: 0,
    acceptedRevision,
    acceptedTimeSec: acceptedRevision * 0.002,
    outputs,
  };
}

function scalarOutputV3(outputId: string, value: number) {
  return {
    outputId,
    value,
    availability: "available" as const,
    quality: "authoritative-state" as const,
  };
}

function analysisV3(
  runtimeSessionId: string,
  scenarioId: string,
  analysisId: string,
) {
  return {
    runtimeSessionId,
    scenarioId,
    modelId: "model/main-wire-v3-r1",
    inputEpoch: 0,
    sourceAcceptedRevision: 0,
    sourceAcceptedTimeSec: 0,
    analysisId,
    payload: { status: "available" },
  } as const;
}

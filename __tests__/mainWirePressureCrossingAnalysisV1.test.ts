import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { MainWireStaticCaseSessionV1 as Session } from "@/engine/vnext/MainWireStaticCaseSessionV1";
import { selectHotPathIntegrityTierV1, hotPathIntegrityTierV1 } from "@/engine/hotPathIntegrityTierV1";
import { interpolateMainWireSemilunarClosureV1 as interpolate, wrapMainWirePressureCrossingSessionV1 as wrap } from "@/analysis/methods/mainWire/MainWirePressureCrossingSessionV1";
import { MAIN_WIRE_PRESSURE_CROSSING_PV_ANALYSIS_V1_ID as analysisId, MAIN_WIRE_PRESSURE_CROSSING_PV_PROTOCOL_V1_ID as protocolId,
  MAIN_WIRE_INTEGRATED_MODEL_FORMAL_PRESSURE_VOLUME_RELATIONS_V3_ID as legacyId } from "@/analysis/methods/mainWire/MainWireStructuralAnalysisContractV3";
import { buildMainWirePeriodicPvaMethodV15 as pva } from "@/analysis/methods/mainWire/MainWirePeriodicPvaV1";
import { resolveRegisteredAnalysisMethodsV1 as methods } from "@/analysis/registry/RegisteredAnalysisMethodsV1";
import { MAIN_WIRE_PRESSURE_CROSSING_SOURCE_ARTIFACT_V1 as supportedArtifact, executeMainWirePressureCrossingPvV1 as execute } from "@/analysis/methods/mainWire/MainWirePressureCrossingExecutionV1";
import { REGISTERED_ANALYSIS_EXECUTOR_V1 as registered } from "@/analysis/runtime/RegisteredAnalysisExecutorV1";
import type { AnalysisExecutorV1 } from "@/analysis/contracts/AnalysisExecutionV1";
import current from "@/studio/integrations/mainWireIntegratedV3/MainWireIntegratedStudioStaticCaseSurfaceV2";
import candidate from "@/studio/integrations/mainWireIntegratedV3/MainWireIntegratedStudioStaticCaseSurfaceV4";
import { CURRENT_MODEL_PRESETS_V1 } from "@/data/model-releases/CurrentModelReleaseV1";
import currentBundle from "@/data/model-releases/standard74/bundle.json";
const high = currentBundle.presets[1]!, low = currentBundle.presets[2]!;
import lock from "@/data/model-releases/standard74/publication.json";
import type { MainWireIntegratedStudioSelectedAorticOutflowFixtureV1 as Fixture,
  createMainWireIntegratedStudioStaticCaseCoreReleaseV1 as Factory } from "@/studio/integrations/mainWireIntegratedV3/MainWireIntegratedStudioSelectedAorticOutflowExactModelV1";
import { importExactExecutableArtifactModuleV2 as importArtifact } from "@/runtime/ExactExecutableArtifactModuleLoaderV2";
import { composeStandardModelContractV1 } from "@/studio/contracts/v2/modelSurface";
import { validateScenarioPresetV2 } from "@/studio/application/authoring/StudioExperimentDataV2";
import * as fixedBoundaryExecution from "@/analysis/methods/mainWire/FixedBoundaryPressureVolumeExecutionV1";

const tier = hotPathIntegrityTierV1();
afterEach(() => selectHotPathIntegrityTierV1(tier));

describe("analysis-owned quasi-steady semilunar closure", () => {
  it("retains tier ownership until the asynchronous shared helper completes", async () => {
    selectHotPathIntegrityTierV1("full-invariant");
    const frame = { modelId: high.modelId, runtimeSessionId: "physical", scenarioId: "high", inputEpoch: 1,
      acceptedRevision: high.capture.checkpoint.acceptedRevision, acceptedTimeSec: high.capture.checkpoint.acceptedTimeSec, outputs: {} };
    const restored = { currentAcceptedState: () => ({ revision: frame.acceptedRevision, acceptedTimeSec: frame.acceptedTimeSec }) } as Session;
    const restore = vi.spyOn(Session, "restore").mockResolvedValue(restored);
    type Result = Awaited<ReturnType<typeof fixedBoundaryExecution.executeFixedBoundaryPressureVolumeV1>>;
    const gates: { resolve: (value: Result) => void; reject: (error: Error) => void }[] = [];
    const helper = vi.spyOn(fixedBoundaryExecution, "executeFixedBoundaryPressureVolumeV1").mockImplementation(() =>
      new Promise<Result>((resolve, reject) => gates.push({ resolve, reject })));
    const input = { source: { acceptedFrame: frame, exactNumericalExports: { ExactSessionV1: Session },
      surfaceRelease: candidate, capture: async () => ({ artifactRevisionId: supportedArtifact, scenario: high.capture }), legacyExact: null },
    request: { runtimeSessionId: frame.runtimeSessionId, scenarioId: frame.scenarioId, analysisId, expectedInputEpoch: frame.inputEpoch,
      expectedAcceptedRevision: frame.acceptedRevision, expectedAcceptedTimeSec: frame.acceptedTimeSec } } as Parameters<AnalysisExecutorV1["execute"]>[0];
    const first = execute(input).catch(error => error), second = execute(input).catch(error => error);
    try {
      await vi.waitFor(() => expect(gates.length).toBeGreaterThan(0));
      // Both restores can finish immediately. Only the pending analysis helper
      // should retain the lock across this event-loop turn.
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(restore).toHaveBeenCalledTimes(1);
      expect(helper).toHaveBeenCalledTimes(1);
      expect(hotPathIntegrityTierV1()).toBe("hot-path-lean");
      gates[0]!.reject(new Error("first helper stopped"));
      expect((await first).message).toBe("first helper stopped");
      await vi.waitFor(() => expect(helper).toHaveBeenCalledTimes(2));
      expect(hotPathIntegrityTierV1()).toBe("hot-path-lean");
      const result = { ...frame, sourceAcceptedRevision: frame.acceptedRevision,
        sourceAcceptedTimeSec: frame.acceptedTimeSec, analysisId, payload: { status: "available" } } as Result;
      gates[1]!.resolve(result);
      expect(await second).toBe(result);
      expect(hotPathIntegrityTierV1()).toBe("full-invariant");
    } finally {
      // A failing assertion must not leave the module's serial queue locked.
      gates.forEach(gate => gate.reject(new Error("test cleanup")));
      helper.mockRejectedValue(new Error("test cleanup"));
      await Promise.all([first, second]);
      helper.mockRestore(); restore.mockRestore();
    }
  });

  it("serializes same-realm async tier ownership and releases it after failures", async () => {
    selectHotPathIntegrityTierV1("full-invariant");
    const rejections: ((error: Error) => void)[] = [];
    const restore = vi.spyOn(Session, "restore").mockImplementation(async () => {
      expect(hotPathIntegrityTierV1()).toBe("hot-path-lean");
      return new Promise<Session>((_resolve, reject) => { rejections.push(reject); });
    });
    const input = { source: { acceptedFrame: { modelId: high.modelId, runtimeSessionId: "physical", scenarioId: "high",
      inputEpoch: 1, acceptedRevision: high.capture.checkpoint.acceptedRevision, acceptedTimeSec: high.capture.checkpoint.acceptedTimeSec, outputs: {} },
      exactNumericalExports: { ExactSessionV1: Session }, surfaceRelease: candidate, capture: async () => ({ artifactRevisionId: supportedArtifact, scenario: high.capture }), legacyExact: null },
      request: { runtimeSessionId: "physical", scenarioId: "high", analysisId, expectedInputEpoch: 1,
        expectedAcceptedRevision: high.capture.checkpoint.acceptedRevision, expectedAcceptedTimeSec: high.capture.checkpoint.acceptedTimeSec },
    } as Parameters<AnalysisExecutorV1["execute"]>[0];
    try {
      const first = execute(input).catch(error => error);
      const second = execute(input).catch(error => error);
      await vi.waitFor(() => expect(restore).toHaveBeenCalledTimes(1));
      expect(hotPathIntegrityTierV1()).toBe("hot-path-lean");
      rejections[0]!(new Error("first stopped"));
      expect((await first).message).toBe("first stopped");
      await vi.waitFor(() => expect(restore).toHaveBeenCalledTimes(2));
      expect(hotPathIntegrityTierV1()).toBe("hot-path-lean");
      rejections[1]!(new Error("second stopped"));
      expect((await second).message).toBe("second stopped");
      expect(hotPathIntegrityTierV1()).toBe("full-invariant");
    } finally { restore.mockRestore(); }
  });

  it("opts into candidate sampling without dropping the anchor diagnostic readback", () => {
    const { source } = syntheticClosureSource();
    const ordinary = vi.spyOn(source, "advanceToPresentationTime");
    const lean = vi.fn(source.advanceToPresentationTime.bind(source));
    const candidate = Object.assign(source, { advancePressureCrossingPresentationV1: lean });
    vi.spyOn(candidate, "forkResponsiveStarlingAtFixedGlobalTotalBloodVolume").mockReturnValue(candidate);
    const wrapped = wrap(candidate);
    wrapped.advanceStructuralAnalysisToPresentationTimeV1!(.01);
    expect(ordinary).toHaveBeenCalledOnce(); expect(lean).not.toHaveBeenCalled();
    wrapped.forkResponsiveStarlingAtFixedGlobalTotalBloodVolume(4000).advanceStructuralAnalysisToPresentationTimeV1!(.02);
    expect(lean).toHaveBeenCalledOnce();
  });

  it("reads full observations only on presentation boundaries, not on every crossing sample", () => {
    const { source } = syntheticClosureSource();
    const times: number[] = [];
    const observe = source.observe.bind(source);
    vi.spyOn(source, "observe").mockImplementation(() => {
      const result = observe(); times.push(result.acceptedState.acceptedTimeSec); return result;
    });
    const snapshot = vi.spyOn(source, "currentAcceptedState");
    const session = wrap(source);
    snapshot.mockClear();
    session.advanceStructuralAnalysisToPresentationTimeV1!(.01);
    expect(times.length).toBeGreaterThan(0);
    expect(times.every(time => time === 0 || time === .01)).toBe(true);
    expect(session.currentAcceptedState()).toBeDefined();
    expect(snapshot).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it("rejects unpinned, stale and unsupported artifact requests before running a numerical family", async () => {
    const capture = vi.fn(async () => ({ artifactRevisionId: "wrong", scenario: high.capture }));
    const input = { source: { acceptedFrame: { modelId: high.modelId, runtimeSessionId: "physical", scenarioId: "high",
      inputEpoch: 1, acceptedRevision: high.capture.checkpoint.acceptedRevision, acceptedTimeSec: high.capture.checkpoint.acceptedTimeSec, outputs: {} },
      surfaceRelease: current, capture, legacyExact: null },
      request: { runtimeSessionId: "physical", scenarioId: "high", analysisId, expectedInputEpoch: 1,
        expectedAcceptedRevision: high.capture.checkpoint.acceptedRevision, expectedAcceptedTimeSec: high.capture.checkpoint.acceptedTimeSec } } as Parameters<AnalysisExecutorV1["execute"]>[0];
    await expect(registered.execute(input)).rejects.toThrow(/not pinned/);
    expect(capture).not.toHaveBeenCalled();
    await expect(execute({ ...input, request: { ...input.request, expectedInputEpoch: 0 } })).rejects.toThrow(/clocks differ/);
    expect(capture).not.toHaveBeenCalled();
    await expect(execute(input)).rejects.toThrow(/artifact requires compatibility/);
    expect(capture).toHaveBeenCalledTimes(1);
  });

  it("interpolates the signed pressure root, without snapping a clipped Q to the last endpoint", () => {
    const a = { timeSec: 1, pressureDifferenceMmHg: 3, volumeMl: 80, transmuralPressureMmHg: 104 };
    const b = { timeSec: 1.002, pressureDifferenceMmHg: -1, volumeMl: 79, transmuralPressureMmHg: 100 };
    expect(interpolate(a, b)).toMatchObject({ timeSec: 1.0015, bracketEndSec: 1.002,
      landmark: { event: "semilunar-valve-closure", volumeMl: 79.25, pressureMmHg: 101 } });
    expect(() => interpolate(a, { ...b, pressureDifferenceMmHg: 1 })).toThrow(/bracket/);
    expect(() => interpolate(a, { ...b, timeSec: a.timeSec })).toThrow(/bracket/);
    expect(() => interpolate({ ...a, pressureDifferenceMmHg: 0 }, b)).toThrow(/bracket/);
    expect(() => interpolate(a, { ...b, volumeMl: NaN })).toThrow(/bracket/);
  });

  it("pins one source for all new consumers, preserving the current production binding", () => {
    const before = methods(current), after = methods(candidate);
    expect(before.periodicPvaDerivation?.sourceAnalysisId).toBe(legacyId);
    expect(after.periodicPvaDerivation?.sourceAnalysisId).toBe(analysisId);
    expect(before.resolveExecutionPlan(analysisId)).toBeNull();
    expect(after.resolveExecutionPlan(legacyId)).toBeNull();
    expect(after.resolveExecutionPlan(analysisId)?.partitions).toEqual(["hypovolemic", "hypervolemic"]);
    expect(() => pva({ status: "measured-fixed-tbv-protocol", protocolId: "legacy" } as never, "LV")).toThrow(/pinned measured protocol/);
    expect(protocolId).not.toBe(legacyId);
    expect(candidate.controlCatalog).toBe(current.controlCatalog);
    expect(candidate.exposedExactOutputIds).toBe(current.exposedExactOutputIds);
  });

  it.each([{ crossing: false }, { closureTime: .009 }])("rejects an unobserved closing episode (%j)", options => {
    const { source, beat } = syntheticClosureSource(options), session = wrap(source);
    session.advanceToPresentationTime(.01);
    expect(() => session.pressureVolumeLandmarksForBeatV1!(beat)).toThrow(/Unobserved left semilunar closure/);
  });

  it.each(["hemodynamics.pressure.absolute.LV", "hemodynamics.pressure.absolute.RV"])(
    "rejects missing primitive %s", missingId => {
      const { source } = syntheticClosureSource({ missingId });
      expect(() => wrap(source).advanceToPresentationTime(.01)).toThrow(/Semilunar closure missing primitive/);
    });

  it("discards an incomplete observation window instead of reusing native or forked events", () => {
    const { source, beat } = syntheticClosureSource({ origin: .006 }), session = wrap(source);
    session.advanceToPresentationTime(.01);
    expect(session.pressureVolumeLandmarksForBeatV1!(beat)).toBeNull();
  });

  it.each([0, .006])("projects only structural advance, not native observations (origin %s)", origin => {
    const { source, beat } = syntheticClosureSource({ origin }), session = wrap(source);
    const nativeBefore = JSON.stringify(beat);
    const result = session.advanceStructuralAnalysisToPresentationTimeV1!(.01);
    expect(result.status).toBe("advanced");
    if (result.status === "failed") throw new Error(result.message);
    expect(session.observe().completedBeatMetrics).toBe(beat);
    expect(source.observe().completedBeatMetrics).toBe(beat);
    expect(JSON.stringify(beat)).toBe(nativeBefore);
    if (origin > 0) expect(result.observation.completedBeatMetrics).toBeNull();
    else {
      expect(result.observation.completedBeatMetrics?.leftVentricularPressureVolumeLandmarks.endSystolic)
        .toEqual({ event: "semilunar-valve-closure", volumeMl: 79.25, pressureMmHg: 101 });
      const { leftVentricularPressureVolumeLandmarks: _left, rightVentricularPressureVolumeLandmarks: _right, ...rest } = result.observation.completedBeatMetrics!;
      const { leftVentricularPressureVolumeLandmarks: _nativeLeft, rightVentricularPressureVolumeLandmarks: _nativeRight, ...nativeRest } = beat;
      expect(rest).toEqual(nativeRest);
    }
  });

  it.each(["forkAtFixedGlobalTotalBloodVolume", "forkResponsiveStarlingAtFixedGlobalTotalBloodVolume"] as const)(
    "keeps observations private across %s", forkMethod => {
      const { source, beat } = syntheticClosureSource(), parent = wrap(source), branch = parent[forkMethod](4000);
      const unchanged = JSON.stringify(beat);
      branch.advanceToPresentationTime(.01);
      const measured = { event: "semilunar-valve-closure", volumeMl: 79.25, pressureMmHg: 101 };
      for (const side of ["left", "right"] as const)
        expect(branch.pressureVolumeLandmarksForBeatV1!(beat)?.[side].endSystolic).toEqual(measured);
      expect(parent.currentAcceptedState().acceptedTimeSec).toBe(0);
      expect(() => parent.pressureVolumeLandmarksForBeatV1!(beat)).toThrow(/Unobserved left semilunar closure/);
      parent.advanceToPresentationTime(.01);
      expect(parent.pressureVolumeLandmarksForBeatV1!(beat)?.left.endSystolic).toEqual(measured);
      expect(source.observe().completedBeatMetrics).toBe(beat);
      expect(JSON.stringify(beat)).toBe(unchanged);
    });

  it.each([0, .0007])("reduces HR70 grid-phase jitter while leaving every native beat untouched (phase %s)", async phase => {
    selectHotPathIntegrityTierV1("hot-path-lean");
    const f = high.capture.fixture as unknown as Fixture;
    const raw = await Session.restore(high.capture.checkpoint.payload, f.anatomyId as "baseline-v1", f.hemodynamicResearchInputs, 1, f.mechanismResearchInputs);
    if (phase) raw.advanceToPresentationTimeWithSelectedOutputProjectionV1(raw.currentAcceptedState().acceptedTimeSec + phase, []);
    const session = wrap(raw).forkAtFixedGlobalTotalBloodVolume(f.hemodynamicResearchInputs.totalBloodVolumeMl);
    const origin = session.currentAcceptedState().acceptedTimeSec;
    const oldP: number[] = [], newP: number[] = [];
    let last = session.observe().completedBeatMetrics?.endAtrialCaptureId;
    for (let i = 1; newP.length < 8; i++) {
      const result = session.advanceToPresentationTime(origin + i * .01);
      expect(result.status).toBe("advanced");
      const beat = session.observe().completedBeatMetrics;
      if (!beat || beat.endAtrialCaptureId === last) continue;
      last = beat.endAtrialCaptureId;
      const unchanged = JSON.stringify(beat);
      const landmarks = session.pressureVolumeLandmarksForBeatV1!(beat);
      expect(session.observe().completedBeatMetrics).toBe(beat);
      expect(JSON.stringify(beat)).toBe(unchanged);
      if (!landmarks) continue;
      oldP.push(beat.leftVentricularPressureVolumeLandmarks.endSystolic.pressureMmHg);
      newP.push(landmarks.left.endSystolic.pressureMmHg);
    }
    const spread = (v: number[]) => Math.max(...v.slice(2)) - Math.min(...v.slice(2));
    expect(spread(oldP)).toBeGreaterThan(1.5);
    expect(spread(newP)).toBeLessThan(.2); // Numerical regression, not a clinical threshold.
  }, 60_000);

  it.each([...CURRENT_MODEL_PRESETS_V1, validateScenarioPresetV2(high), validateScenarioPresetV2(low)])(
    "matches the admitted artifact for a complete continuation: $title", async preset => {
      selectHotPathIntegrityTierV1("hot-path-lean");
      const bytes = new Uint8Array(readFileSync("data/model-releases/standard74/artifact.mjs.txt"));
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(lock.artifactSha256);
      expect(supportedArtifact).toBe(lock.artifactRevisionId);
      const namespace = await importArtifact(bytes), release = await (namespace.createCircleHeartExactModelReleaseV1 as typeof Factory)();
      const adapter = release.executables.simulationAdapter;
      const f = preset.capture.fixture as unknown as Fixture;
      const raw = await (namespace.ExactSessionV1 as typeof Session).restore(preset.capture.checkpoint.payload, f.anatomyId!, f.hemodynamicResearchInputs, 1, f.mechanismResearchInputs);
      const id = { runtimeSessionId: "analysis-source-parity", scenarioId: "parity" };
      await adapter.createSession({ runtimeSessionId: id.runtimeSessionId, scenarios: [{ scenarioId: id.scenarioId, ...preset.capture }] });
      try {
        for (let i = 0; i < 1000; i++) {
          const frame = await adapter.advanceOnePresentationStep(id);
          const result = raw.advanceToPresentationTimeWithSelectedOutputProjectionV1(frame.acceptedTimeSec, []);
          expect(result.advance.status).toBe("advanced");
        }
        const model = composeStandardModelContractV1(release.manifest, current, methods(current).capabilities).contract;
        const captured = await release.executables.experimentCapture.captureAcceptedCandidate({ experimentId: "analysis-parity",
          model, desiredContent: { modelId: model.modelId, surfaceSeriesId: current.surfaceSeriesId,
            scenarios: [{ scenarioId: id.scenarioId, label: preset.title, fixture: preset.capture.fixture }],
            surface: { graphPanes: [], outputPanes: [], controlPanes: [], note: { text: "" } } },
          correlation: { runtimeSessionId: id.runtimeSessionId, scenarios: [{ scenarioId: id.scenarioId, expectedInputEpoch: 0 }] } });
        expect(await raw.checkpoint()).toEqual(captured.content.scenarios[0]!.capture.checkpoint.payload);
      } finally { adapter.disposeSession(id.runtimeSessionId); }
    }, 60_000);
});

type ObservedBeat = NonNullable<ReturnType<Session["observe"]>["completedBeatMetrics"]>;
// A synthetic 10-ms window tests the observation seam, not physiological beats.
function syntheticClosureSource({ crossing = true, missingId, origin = 0, closureTime = .004 }:
  { crossing?: boolean; missingId?: string; origin?: number; closureTime?: number } = {}): { source: Session; beat: ObservedBeat } {
  let time = origin, revision = 0;
  const landmarks = { pressureBasis: "transmural", endDiastolic: { event: "maximum-volume", volumeMl: 140, pressureMmHg: 10 },
    endSystolic: { event: "semilunar-valve-closure", volumeMl: 79, pressureMmHg: 100 } };
  const beat = { startTimeSec: 0, endTimeSec: .01, leftVentricularPressureVolumeLandmarks: landmarks,
    rightVentricularPressureVolumeLandmarks: landmarks, leftVentricularValveEventMetrics: { endSystolic: { timeSec: closureTime } },
    rightVentricularValveEventMetrics: { endSystolic: { timeSec: closureTime } } } as unknown as ObservedBeat;
  const observe = () => ({ acceptedState: Object.freeze({ acceptedTimeSec: time, revision,
    coronary: { fixedGlobalTotalBloodVolumeMl: 5600 } }),
    completedBeatMetrics: time >= .01 - 1e-12 ? beat : null });
  const values = (ids: readonly string[]) => Object.fromEntries(ids.map(id => {
    if (id === missingId) return [id, { availability: "unavailable" }];
    const before = time < .004 - 1e-12;
    const value = id.includes("flow.valve") ? crossing && before ? 5 : 0
      : id.includes("volume") ? before ? 80 : 79 : id.includes("transmural") ? before ? 104 : 100
      : id.endsWith(".Ao") || id.endsWith(".PA") ? 101 : before ? 104 : 100;
    return [id, { availability: "available", value }];
  }));
  const advance = (target: number) => {
    time = target; revision++;
    return { status: "advanced", acceptedTimeSec: time, acceptedRevision: revision,
      internalAcceptedSubstepCount: 1, observation: observe() };
  };
  const fork = () => syntheticClosureSource({ crossing, missingId, origin: time, closureTime }).source;
  return { beat, source: { currentAcceptedState: () => observe().acceptedState, observe,
    projectCurrentAcceptedValuesV1: values, advanceToPresentationTime: advance,
    advanceToPresentationTimeWithSelectedOutputProjectionV1: (target: number, ids: readonly string[]) =>
      ({ advance: advance(target), projectedValues: values(ids) }),
    forkAtFixedGlobalTotalBloodVolume: fork, forkResponsiveStarlingAtFixedGlobalTotalBloodVolume: fork } as unknown as Session };
}

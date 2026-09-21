import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { createMainWireIntegratedStudioStaticCaseCoreReleaseV1 as currentFactory } from "@/studio/integrations/mainWireIntegratedV3/MainWireIntegratedStudioSelectedAorticOutflowExactModelV1";
import { MainWireStaticCaseSessionV1 as Session } from "@/engine/vnext/MainWireStaticCaseSessionV1";
import { hotPathIntegrityTierV1, selectHotPathIntegrityTierV1 } from "@/engine/hotPathIntegrityTierV1";
import { validationStampModeV1, selectValidationStampModeV1 } from "@/engine/validationStampModeV1";
import { importExactExecutableArtifactModuleV2 } from "@/runtime/ExactExecutableArtifactModuleLoaderV2";
import { composeStandardModelContractV1 } from "@/studio/contracts/v2/modelSurface";
import surface from "@/studio/integrations/mainWireIntegratedV3/MainWireIntegratedStudioStaticCaseSurfaceV5";
import { resolveMainWireAnalysisMethodsForSurfaceV1 as methods } from "@/analysis/methods/mainWire/MainWireAnalysisMethodRegistryV1";
import { loadStudioLocalCurrentClientCompositionV1 } from "@/studio/composition/StudioDefaultCompositionV2";
import bundle from "@/data/model-releases/standard74/bundle.json";
import metadata from "@/data/model-releases/standard74/bundle.json";
import type { StudioSimulationFrameV2 } from "@/studio/contracts/v2/simulation";
import { canonicalJsonStringify } from "@/engine/integrity";
import { CURRENT_MODEL_PRESETS_V1 } from "@/data/model-releases/CurrentModelReleaseV1";
import { executeMainWirePressureCrossingPvV1 } from "@/analysis/methods/mainWire/MainWirePressureCrossingExecutionV1";
import { readPreparedModelAnalysisV1 } from "@/studio/application/authoring/PreparedModelAnalysisV1";
import { sha256CanonicalJsonHex } from "@/engine/integrity";
import { MAIN_WIRE_PRESSURE_CROSSING_PV_ANALYSIS_V1_ID as pvAnalysis } from "@/analysis/methods/mainWire/MainWireStructuralAnalysisContractV3";
import { advanceMainWireProjectionWithRecoveryV1 as recover,
  isMainWireUncommittedSolveFailureV1 as retryable } from "@/engine/vnext/MainWireProjectionStepRecoveryV1";

const id = { runtimeSessionId: "candidate-control-test", scenarioId: "case" };
const tbv = "hemodynamics.total-blood-volume-ml";
const outputs = ["hemodynamics.pressure.absolute.LV", "hemodynamics.pressure.absolute.Ao", "hemodynamics.flow.valve.AoV"] as const;
const emptySurface = { graphPanes: [], outputPanes: [], controlPanes: [], note: { text: "" } } as const;
const currentFactoryForTest = currentFactory;
type Release = ReturnType<typeof currentFactoryForTest>;
const tier = hotPathIntegrityTierV1();
const stampMode = validationStampModeV1();
beforeEach(() => selectHotPathIntegrityTierV1("hot-path-lean"));
afterEach(() => { selectHotPathIntegrityTierV1(tier); selectValidationStampModeV1(stampMode); vi.restoreAllMocks(); });
const withoutModel = ({ modelId: _, ...frame }: StudioSimulationFrameV2) => frame;
async function compiled(path: string): Promise<Release> {
  const module = await importExactExecutableArtifactModuleV2(await readFile(path));
  return (module.createCircleHeartExactModelReleaseV1 as typeof currentFactoryForTest)();
}
async function capture(release: Release, fixture: typeof bundle.baseline.capture.fixture) {
  const model = composeStandardModelContractV1(release.manifest, surface, methods(surface).capabilities).contract;
  const frame = release.executables.simulationAdapter.currentFrame(id);
  return (await release.executables.experimentCapture.captureAcceptedCandidate({
    experimentId: "candidate-test", model,
    desiredContent: { modelId: model.modelId, surfaceSeriesId: surface.surfaceSeriesId,
      scenarios: [{ scenarioId: id.scenarioId, label: "test", fixture }], surface: emptySurface },
    correlation: { runtimeSessionId: id.runtimeSessionId, scenarios: [{ scenarioId: id.scenarioId, expectedInputEpoch: frame.inputEpoch }] },
  })).content.scenarios[0]!.capture;
}
async function change(release: Release, value: number) {
  const adapter = release.executables.simulationAdapter;
  return adapter.applyControl({ ...id, controlId: tbv, value, expectedInputEpoch: adapter.currentInputEpoch(id) });
}

describe("current exact model control admission", () => {
  it.each(CURRENT_MODEL_PRESETS_V1)("keeps audited and cached validation numerically identical on the canonical lean path for $title", async preset => {
    // Full-invariant selects a separate unpredicted public solver path. Audit
    // only stamp reuse here, keeping the model's admitted solver path fixed.
    const run = async (mode: "validation-stamps-disabled" | "validation-stamps-enabled") => {
      selectHotPathIntegrityTierV1("hot-path-lean");
      selectValidationStampModeV1(mode);
      const release = currentFactory(), adapter = release.executables.simulationAdapter;
      await adapter.createSession({ runtimeSessionId: id.runtimeSessionId, scenarios: [{ scenarioId: id.scenarioId, ...preset.capture }] });
      try {
        const before = await adapter.advancePresentationBatch({ ...id, stepCount: 64, presentationOutputIds: outputs });
        await change(release, 6000);
        const batches = [];
        for (let i = 0; i < 10; i++) batches.push(await adapter.advancePresentationBatch({ ...id, stepCount: 64, presentationOutputIds: outputs }));
        const fixture = { ...preset.capture.fixture as typeof bundle.baseline.capture.fixture,
          hemodynamicResearchInputs: { ...(preset.capture.fixture as typeof bundle.baseline.capture.fixture).hemodynamicResearchInputs, totalBloodVolumeMl: 6000 } };
        return { before, batches, capture: await capture(release, fixture) };
      } finally { adapter.disposeSession(id.runtimeSessionId); }
    };
    const audited = await run("validation-stamps-disabled"), cached = await run("validation-stamps-enabled");
    expect(cached).toEqual(audited);
  }, 90_000);

  it.each(CURRENT_MODEL_PRESETS_V1)("keeps pressure-volume sample continuation exact for $title", async preset => {
    const seed = preset.capture, f = seed.fixture as unknown as typeof bundle.baseline.capture.fixture;
    const restore = () => Session.restore(seed.checkpoint!.payload, f.anatomyId as never,
      f.hemodynamicResearchInputs as never, 1, f.mechanismResearchInputs as never);
    const reference = await restore(), sampling = await restore();
    const start = reference.currentAcceptedState().acceptedTimeSec;
    for (let tick = 1; tick <= 600; tick++) {
      const target = start + tick * .002;
      if (tick % 5 !== 0) {
        reference.advanceToPresentationTimeWithSelectedOutputProjectionV1(target, []);
        sampling.advanceToPresentationTimeWithSelectedOutputProjectionV1(target, []);
        continue;
      }
      const full = reference.advanceToPresentationTime(target);
      const sampled = sampling.advancePressureCrossingPresentationV1(target);
      expect(full.status).toBe("advanced"); expect(sampled.status).toBe("advanced");
      if (full.status !== "advanced" || sampled.status !== "advanced") throw new Error("Sampling did not reach its target");
      const { observation: fullObservation, ...fullMetadata } = full;
      const { observation: sampledObservation, ...sampledMetadata } = sampled;
      expect(sampledMetadata).toEqual(fullMetadata);
      expect(sampling.snapshotAcceptedStateBytes()).toEqual(reference.snapshotAcceptedStateBytes());
      expect(sampledObservation.completedBeatMetrics).toEqual(fullObservation.completedBeatMetrics);
      expect(sampling.projectCurrentAcceptedValuesV1(outputs)).toEqual(reference.projectCurrentAcceptedValuesV1(outputs));
    }
    expect(await sampling.checkpoint()).toEqual(await reference.checkpoint());
  }, 30_000);

  it("bounds subdivision, reports only real accepted substeps, and never retries invariants", () => {
    const rejection = () => new Error("typed ordinary coupled solve failed: maximum-iterations: test nonconvergence");
    let time = 0, revision = 0, calls = 0;
    const advance: Parameters<typeof recover>[0] = target => {
      calls++;
      if (target - time > .0000625 + 1e-12) throw rejection();
      time = target; revision++;
      return { advance: { status: "advanced", presentationTimeSec: target, acceptedTimeSec: time,
        acceptedRevision: revision, acceptedRevisionSpanFromPrevious: 1, internalAcceptedSubstepCount: 1,
        boundaryClippedSubstepCount: 0, substeps: [{ acceptedTimeSec: time, acceptedRevision: revision,
          landedOnPresentationTarget: true, clippedByCoronaryWindow: false, clippedByRhythmBoundary: false,
          rhythmBoundaryTimeSec: null, rhythmBoundaryOwners: [] }] }, projectedValues: {}, outputProjectionDurationMs: 1 };
    };
    const result = recover(advance, () => ({ acceptedTimeSec: time, revision }), .002);
    expect(calls).toBe(63); expect(revision).toBe(32); expect(time).toBe(.002);
    expect(result.advance).toMatchObject({ status: "advanced", internalAcceptedSubstepCount: 32,
      acceptedRevisionSpanFromPrevious: 32, acceptedTimeSec: .002 });
    if (result.advance.status !== "advanced") throw new Error("Missing recovered target");
    expect(result.advance.substeps.map(step => step.acceptedRevision)).toEqual(Array.from({ length: 32 }, (_, i) => i + 1));
    expect(result.advance.substeps.filter(step => step.landedOnPresentationTarget)).toHaveLength(1);
    expect(result.outputProjectionDurationMs).toBe(32);
    expect(retryable(new Error("typed ordinary coupled solve failed: line-search: test"))).toBe(true);
    expect(retryable(new Error("typed ordinary coupled solve failed: nonfinite: test"))).toBe(false);
    const invariant = vi.fn(() => { throw new Error("invalid accepted state"); });
    expect(() => recover(invariant, () => ({ revision: 0, acceptedTimeSec: 0 }), .002)).toThrow("invalid accepted state");
    expect(invariant).toHaveBeenCalledTimes(1);
    const impossible = vi.fn(() => { throw rejection(); });
    expect(() => recover(impossible, () => ({ revision: 0, acceptedTimeSec: 0 }), .002)).toThrow(/test nonconvergence/);
    expect(impossible).toHaveBeenCalledTimes(6);
    impossible.mockClear();
    expect(() => recover(impossible, () => ({ revision: 0, acceptedTimeSec: 0 }), .0001)).toThrow(/test nonconvergence/);
    expect(impossible).toHaveBeenCalledTimes(1);
  });

  it("retains an accepted event boundary before recovering only the failed remainder", () => {
    let time = 0, revision = 0, calls = 0;
    const record = (target: number, clipped: boolean) => ({ acceptedTimeSec: target, acceptedRevision: ++revision,
      landedOnPresentationTarget: !clipped, clippedByCoronaryWindow: false, clippedByRhythmBoundary: clipped,
      rhythmBoundaryTimeSec: clipped ? target : null, rhythmBoundaryOwners: [] });
    const advance: Parameters<typeof recover>[0] = target => {
      calls++;
      if (calls === 1) {
        time = .0008;
        return { projectedValues: null, outputProjectionDurationMs: 0, advance: {
          status: "failed", reason: "outer-input-clock-binding-or-boundary-rejected",
          message: "statically condensed coupled solve failed: line-search: test boundary remainder",
          acceptedTimeSec: time, acceptedRevision: 1, partiallyAdvanced: true, internalAcceptedSubstepCount: 1,
          boundaryClippedSubstepCount: 1, substeps: [record(time, true)], requestedPresentationTimeSec: target,
        } };
      }
      time = target;
      const step = record(target, false);
      return { projectedValues: {}, outputProjectionDurationMs: 1, advance: {
        status: "advanced", presentationTimeSec: target, acceptedTimeSec: time, acceptedRevision: revision,
        acceptedRevisionSpanFromPrevious: 1, internalAcceptedSubstepCount: 1, boundaryClippedSubstepCount: 0, substeps: [step],
      } };
    };
    const reset = vi.fn();
    const result = recover(advance, () => ({ acceptedTimeSec: time, revision }), .002, reset);
    expect(result.advance).toMatchObject({ status: "advanced", acceptedRevisionSpanFromPrevious: 3,
      internalAcceptedSubstepCount: 3, boundaryClippedSubstepCount: 2, acceptedTimeSec: .002 });
    if (result.advance.status !== "advanced") throw new Error("Missing recovered boundary");
    expect(result.advance.substeps.map(s => s.acceptedTimeSec)).toEqual([.0008, .0008 + (.002 - .0008) / 2, .002]);
    expect(reset).toHaveBeenCalledTimes(3);
  });

  it("corrects the reproduced 6000→4200 failure without time subdivision and resumes exactly", async () => {
    const seed = bundle.baseline.capture, f = seed.fixture;
    const anatomy = f.anatomyId as Parameters<typeof Session.restore>[1];
    const mechanism = f.mechanismResearchInputs as Parameters<typeof Session.restore>[4];
    let original = await Session.restore(seed.checkpoint.payload, anatomy, f.hemodynamicResearchInputs, 1, mechanism);
    original = original.warmStart({ ...f.hemodynamicResearchInputs, totalBloodVolumeMl: 6000 });
    const warmTime = original.currentAcceptedState().acceptedTimeSec;
    for (let tick = 1; tick <= 1500; tick++) original.advanceToPresentationTimeWithSelectedOutputProjectionV1(warmTime + tick * .002, []);
    const inputs = { ...f.hemodynamicResearchInputs, totalBloodVolumeMl: 4200 };
    original = original.warmStart(inputs);
    const saved = await original.checkpoint(), start = original.currentAcceptedState().acceptedTimeSec;
    // Match the executable's integer base-tick schedule, including binary
    // rounding. (start + tick * dt) is not the same sequence of IEEE values.
    const timeAt = (tick: number) => (Math.round(start / .002) + tick) * .002;
    const session = await Session.restore(saved, anatomy, inputs, 1, mechanism);
    const executable = await compiled("data/model-releases/standard74/artifact.mjs.txt");
    const fixture = { ...f, hemodynamicResearchInputs: inputs };
    await executable.executables.simulationAdapter.createSession({ runtimeSessionId: id.runtimeSessionId,
      scenarios: [{ scenarioId: id.scenarioId, fixture,
        checkpoint: { acceptedRevision: saved.base.revision, acceptedTimeSec: saved.base.acceptedTimeSec, payload: saved as never } }] });
    let restored: Session | null = null, subdivided = 0, clipped = 0;
    const ids = ["hemodynamics.pressure.absolute.LV", "hemodynamics.pressure.absolute.Ao", "hemodynamics.flow.valve.AoV"] as const;
    try { for (let tick = 1; tick <= 2500; tick++) {
      const target = timeAt(tick);
      const result = session.advanceToPresentationTimeWithSelectedOutputProjectionV1(target, ids);
      expect(result.advance.status, `tick ${tick}: ${JSON.stringify(result.advance)}`).toBe("advanced");
      if (result.advance.status !== "advanced") throw new Error("Recovery did not reach its target");
      expect(result.advance.acceptedTimeSec).toBe(target);
      subdivided += result.advance.internalAcceptedSubstepCount > 1 ? 1 : 0;
      clipped += result.advance.boundaryClippedSubstepCount;
      if (restored) {
        const replay = restored.advanceToPresentationTimeWithSelectedOutputProjectionV1(target, ids);
        expect(replay.advance).toEqual(result.advance); expect(replay.projectedValues).toEqual(result.projectedValues);
        if (tick % 50 === 0) expect(restored.snapshotAcceptedStateBytes()).toEqual(session.snapshotAcceptedStateBytes());
      }
      if (tick === 100) restored = await Session.restore(JSON.parse(JSON.stringify(await session.checkpoint())), anatomy, inputs, 1, mechanism);
      if (tick % 250 === 0) {
        const state = session.currentAcceptedState();
        expect(state.coronary.fixedGlobalTotalBloodVolumeMl).toBe(4200);
        const coronaryMl = Object.values(state.coronary.coronary.volumeMlByNode).reduce((sum, value) => sum + value, 0);
        expect(state.coronary.circulation.totalBloodVolumeMl + coronaryMl).toBeCloseTo(4200, 8);
        const batch = await executable.executables.simulationAdapter.advancePresentationBatch({ ...id, stepCount: 250, presentationOutputIds: ids });
        expect(batch.terminalFrame).toMatchObject({ acceptedTimeSec: target, acceptedRevision: result.advance.acceptedRevision });
        expect((await capture(executable, fixture)).checkpoint!.payload).toEqual(await session.checkpoint());
      }
    }
    expect(subdivided).toBeGreaterThan(0); expect(clipped).toBeGreaterThan(0);
    expect(session.observe().completedBeatMetrics).not.toBeNull();
    expect(await restored!.checkpoint()).toEqual(await session.checkpoint());
    } finally { executable.executables.simulationAdapter.disposeSession(id.runtimeSessionId); }
  }, 120_000);

  it("runs the corrected large-TBV trajectory for 60 seconds without adaptive recovery", async () => {
    const seed = bundle.baseline.capture, f = seed.fixture;
    let old = await Session.restore(seed.checkpoint.payload, f.anatomyId as never, f.hemodynamicResearchInputs, 1, f.mechanismResearchInputs as never);
    old = old.warmStart({ ...f.hemodynamicResearchInputs, totalBloodVolumeMl: 6000 });
    const warmTime = old.currentAcceptedState().acceptedTimeSec;
    for (let i = 1; i <= 1500; i++) old.advanceToPresentationTimeWithSelectedOutputProjectionV1(warmTime + i * .002, []);
    const inputs = { ...f.hemodynamicResearchInputs, totalBloodVolumeMl: 4200 };
    old = old.warmStart(inputs);
    const session = await Session.restore(await old.checkpoint(), f.anatomyId as never, inputs, 1, f.mechanismResearchInputs as never);
    const start = session.currentAcceptedState().acceptedTimeSec;
    let resumed: Session | null = null;
    for (let tick = 1; tick <= 30000; tick++) {
      const target = (Math.round(start / .002) + tick) * .002;
      const result = session.advanceToPresentationTimeWithSelectedOutputProjectionV1(target, []);
      expect(result.advance.status).toBe("advanced");
      expect(result.advance.acceptedTimeSec).toBe(target);
      if (resumed) {
        expect(resumed.advanceToPresentationTimeWithSelectedOutputProjectionV1(target, []).advance).toEqual(result.advance);
        if (tick % 500 === 0) expect(resumed.snapshotAcceptedStateBytes()).toEqual(session.snapshotAcceptedStateBytes());
      }
      if (tick === 29000) resumed = await Session.restore(await session.checkpoint(), f.anatomyId as never, inputs, 1, f.mechanismResearchInputs as never);
      if (tick % 1000 === 0) {
        const state = session.currentAcceptedState().coronary;
        const total = Object.values(state.circulation.nodeVolumesMl).reduce((a, b) => a + b, 0)
          + Object.values(state.coronary.volumeMlByNode).reduce((a, b) => a + b, 0);
        expect(total).toBeCloseTo(4200, 8);
      }
    }
    expect(await resumed!.checkpoint()).toEqual(await session.checkpoint());
  }, 120_000);

  it("binds its exact identity and inherits every current Surface/analysis pin", async () => {
    const source = currentFactory(), executable = await compiled("data/model-releases/standard74/artifact.mjs.txt");
    expect(source.manifest).toEqual(metadata.manifest);
    expect(executable.manifest).toEqual(source.manifest);
    expect(source.manifest.solver).toHaveProperty("nonconvergenceRecovery");
    const composition = await loadStudioLocalCurrentClientCompositionV1();
    expect(composition.modelSurface.identity.surfaceReleaseId).toBe(surface.surfaceReleaseId);
    expect(composition.modelSurface.analysis.periodicPvaDerivation).toBe(methods(surface).periodicPvaDerivation);
    expect(composition.modelSurface.analysis.presentationMethods.map(method => method.methodId)).toEqual(methods(surface).presentationMethods.map(method => method.methodId));
    const artifact = await readFile("data/model-releases/standard74/artifact.mjs.txt");
    const manifest = Buffer.from(canonicalJsonStringify(source.manifest)), lengths = Buffer.alloc(8);
    lengths.writeUInt32BE(manifest.length, 0); lengths.writeUInt32BE(artifact.length, 4);
    const hash = (data: Uint8Array) => createHash("sha256").update(data).digest("hex");
    expect(hash(artifact)).toBe(metadata.artifactSha256);
    expect(hash(Buffer.concat([lengths, manifest, artifact]))).toBe(metadata.artifactRevisionId);
  });

  it("launches only its own continued captures and artifact-bound prepared curves", async () => {
    const composition = await loadStudioLocalCurrentClientCompositionV1();
    const model = composeStandardModelContractV1(metadata.manifest, surface, methods(surface).capabilities).contract;
    expect(composition.presets).toHaveLength(CURRENT_MODEL_PRESETS_V1.length);
    expect(composition.exactModel.defaultFixture).toEqual(composition.presets![0]!.capture.fixture);
    expect(composition.exactModel.defaultCheckpoint).toEqual(composition.presets![0]!.capture.checkpoint);
    for (const preset of composition.presets!) {
      const previous = CURRENT_MODEL_PRESETS_V1.find(value => value.presetId === preset.presetId)!;
      expect(preset.modelId).toBe(metadata.manifest.modelId);
      expect(preset.capture).toEqual(previous.capture);
      await currentFactoryForTest().executables.captureAdapter.validateCapture({ model, capture: preset.capture });
      const digest = await sha256CanonicalJsonHex(preset.capture);
      const path = `data/model-analysis/prepared/${pvAnalysis}/${methods(surface).periodicPvaDerivation!.methodId}/${digest}.json`;
      const value = JSON.parse(await readFile(path, "utf8"));
      const expected = { modelId: preset.modelId, artifactRevisionId: metadata.artifactRevisionId, surface, capture: preset.capture };
      const prepared = await readPreparedModelAnalysisV1(value, expected);
      expect(prepared.assessment.sides.every(side => side.status === "complete")).toBe(true);
      await expect(readPreparedModelAnalysisV1(value, { ...expected, artifactRevisionId: "wrong-artifact" })).rejects.toThrow(/binding differs/);
    }
  });

  it("probes exactly one short live batch without adopting lookahead or mutating siblings", async () => {
    const release = currentFactoryForTest(), adapter = release.executables.simulationAdapter;
    const seed = bundle.baseline.capture;
    await adapter.createSession({ runtimeSessionId: id.runtimeSessionId,
      scenarios: [{ ...seed, scenarioId: id.scenarioId }, { ...seed, scenarioId: "sibling" }] });
    const before = adapter.currentFrame(id), sibling = adapter.currentFrame({ ...id, scenarioId: "sibling" });
    const publicPath = vi.spyOn(Session.prototype, "advanceToPresentationTime");
    const livePath = vi.spyOn(Session.prototype, "advanceToPresentationTimeWithStandard70SelectedOutputProjectionV1");
    const serialization = vi.spyOn(Session.prototype, "checkpoint");
    try {
      const frame = await change(release, 4940);
      expect(serialization).not.toHaveBeenCalled();
      expect(publicPath).not.toHaveBeenCalled(); expect(livePath).toHaveBeenCalledTimes(16);
      expect(livePath.mock.calls.every(([, ids]) => ids.length === 0)).toBe(true);
      expect(frame).toMatchObject({ inputEpoch: 1, acceptedRevision: before.acceptedRevision, acceptedTimeSec: before.acceptedTimeSec });
      expect(adapter.currentFrame({ ...id, scenarioId: "sibling" })).toEqual(sibling);
      const first = await adapter.advancePresentationBatch({ ...id, stepCount: 16, presentationOutputIds: outputs });
      expect(first.acceptedTimesSec[0]).toBeCloseTo(before.acceptedTimeSec + .002, 10);
      expect(first.acceptedTimesSec[15]).toBeCloseTo(before.acceptedTimeSec + .032, 10);
    } finally { adapter.disposeSession(id.runtimeSessionId); }
  });

  it("copies a TBV admission trial by rebase with exactly the same continuation as checkpoint restore", async () => {
    for (const preset of CURRENT_MODEL_PRESETS_V1) {
      const f = preset.capture.fixture as typeof bundle.baseline.capture.fixture;
      const source = await Session.restore(preset.capture.checkpoint!.payload, f.anatomyId as never,
        f.hemodynamicResearchInputs, 1, f.mechanismResearchInputs as never);
      const start = source.currentAcceptedState().acceptedTimeSec;
      for (let tick = 1; tick <= 83; tick++) source.advanceToPresentationTimeWithSelectedOutputProjectionV1((Math.round(start / .002) + tick) * .002, []);
      const before = await source.checkpoint();
      const inputs = { ...f.hemodynamicResearchInputs, totalBloodVolumeMl: f.hemodynamicResearchInputs.totalBloodVolumeMl + 5 };
      const adopted = source.warmStart(inputs), trial = source.warmStart(inputs);
      const adoptedBefore = await adopted.checkpoint();
      const restored = await Session.restore(adoptedBefore, f.anatomyId as never, inputs, 1, f.mechanismResearchInputs as never);
      expect(await trial.checkpoint()).toEqual(adoptedBefore);
      for (let tick = 1; tick <= 128; tick++) {
        const target = (Math.round(adoptedBefore.base.acceptedTimeSec / .002) + tick) * .002;
        const a = trial.advanceToPresentationTimeWithSelectedOutputProjectionV1(target, outputs);
        const b = restored.advanceToPresentationTimeWithSelectedOutputProjectionV1(target, outputs);
        expect(a.advance).toEqual(b.advance); expect(a.projectedValues).toEqual(b.projectedValues);
      }
      expect(await trial.checkpoint()).toEqual(await restored.checkpoint());
      expect(await source.checkpoint()).toEqual(before); expect(await adopted.checkpoint()).toEqual(adoptedBefore);
    }
  }, 60_000);

  const presets = [bundle.baseline, ...bundle.presets, ...CURRENT_MODEL_PRESETS_V1.filter(preset =>
    ![bundle.baseline, ...bundle.presets].some(known => known.presetId === preset.presetId))];
  for (const preset of presets) for (const ticks of (preset.presetId.includes("as-") ? [0] : [0, 83, 251])) for (const delta of [-5, 5]) {
    it(`${preset.presetId}, phase +${ticks * 2} ms, TBV ${delta}: independent source/compiled normal paths and restored continuation agree`, async () => {
      const releases = [currentFactoryForTest(), await compiled("data/model-releases/standard74/artifact.mjs.txt")];
      const startingFixture = preset.capture.fixture as typeof bundle.baseline.capture.fixture;
      const target = startingFixture.hemodynamicResearchInputs.totalBloodVolumeMl + delta;
      const fixture = { ...startingFixture, hemodynamicResearchInputs: { ...startingFixture.hemodynamicResearchInputs, totalBloodVolumeMl: target } };
      try {
        for (const release of releases) {
          const adapter = release.executables.simulationAdapter;
          await adapter.createSession({ runtimeSessionId: id.runtimeSessionId, scenarios: [{ scenarioId: id.scenarioId, ...preset.capture }] });
          if (ticks) await adapter.advancePresentationBatch({ ...id, stepCount: ticks, presentationOutputIds: outputs });
          await change(release, target);
        }
        for (let index = 0; index < 32; index++) {
          const batches = [];
          for (const release of releases) batches.push(await release.executables.simulationAdapter.advancePresentationBatch({ ...id, stepCount: 16, presentationOutputIds: outputs }));
          const normalize = (batch: typeof batches[number]) => ({ ...batch, terminalFrame: withoutModel(batch.terminalFrame) });
          expect(normalize(batches[1]!)).toEqual(normalize(batches[0]!));
        }
        const captures = await Promise.all(releases.map(release => capture(release, fixture)));
        expect(captures[1]).toEqual(captures[0]);
        const restored = currentFactoryForTest();
        try {
          await restored.executables.simulationAdapter.createSession({ runtimeSessionId: id.runtimeSessionId,
            scenarios: [{ scenarioId: id.scenarioId, ...captures[0]! }] });
          const a = await releases[0]!.executables.simulationAdapter.advancePresentationBatch({ ...id, stepCount: 128, presentationOutputIds: outputs });
          const b = await restored.executables.simulationAdapter.advancePresentationBatch({ ...id, stepCount: 128, presentationOutputIds: outputs });
          expect(b.outputValues).toEqual(a.outputValues); expect(b.acceptedTimesSec).toEqual(a.acceptedTimesSec);
          expect((await capture(restored, fixture)).checkpoint).toEqual((await capture(releases[0]!, fixture)).checkpoint);
        } finally { restored.executables.simulationAdapter.disposeSession(id.runtimeSessionId); }
      } finally { for (const release of releases) release.executables.simulationAdapter.disposeSession(id.runtimeSessionId); }
    }, 60_000);
  }

  it("keeps the protected 6000→4200 continuation clock and exact compiled restore", async () => {
    const releases = [currentFactoryForTest(), await compiled("data/model-releases/standard74/artifact.mjs.txt")];
    try {
      for (const release of releases) {
        const adapter = release.executables.simulationAdapter;
        await adapter.createSession({ runtimeSessionId: id.runtimeSessionId, scenarios: [{ scenarioId: id.scenarioId, ...bundle.baseline.capture }] });
        await change(release, 6000);
        for (let batch = 0; batch < 6; batch++) await adapter.advancePresentationBatch({ ...id, stepCount: 250, presentationOutputIds: outputs });
      }
      const before = releases[0]!.executables.simulationAdapter.currentFrame(id);
      const livePath = vi.spyOn(Session.prototype, "advanceToPresentationTimeWithStandard70SelectedOutputProjectionV1");
      const frames = []; for (const release of releases) frames.push(await change(release, 4200));
      expect(livePath).not.toHaveBeenCalled(); // Forced continuation creates no discarded live preflight.
      const { outputs: corrected, ...clock } = withoutModel(frames[0]!);
      const { outputs: admitted, ...admittedClock } = withoutModel(frames[1]!);
      expect(clock).toEqual(admittedClock);
      // Source, compiled artifact and restored continuation use the same policy.
      for (const key of Object.keys(admitted)) {
        const { value, ...rest } = corrected[key]!;
        const { value: previous, ...previousRest } = admitted[key]!;
        expect(rest).toEqual(previousRest);
        expect(value).toEqual(previous);
      }
      expect(frames[0]!.acceptedTimeSec - before.acceptedTimeSec).toBeCloseTo(1.712, 10);
      const fixture = { ...bundle.baseline.capture.fixture, hemodynamicResearchInputs: { ...bundle.baseline.capture.fixture.hemodynamicResearchInputs, totalBloodVolumeMl: 4200 } };
      const captured = await capture(releases[0]!, fixture), resumed = currentFactoryForTest();
      try {
        await resumed.executables.simulationAdapter.createSession({ runtimeSessionId: id.runtimeSessionId,
          scenarios: [{ scenarioId: id.scenarioId, ...captured }] });
        const a = await releases[0]!.executables.simulationAdapter.advancePresentationBatch({ ...id, stepCount: 128, presentationOutputIds: outputs });
        const b = await resumed.executables.simulationAdapter.advancePresentationBatch({ ...id, stepCount: 128, presentationOutputIds: outputs });
        // A restored runtime starts a fresh input epoch; its numerical clock,
        // accepted revisions, samples, and continuation must still be exact.
        expect(a.terminalFrame.inputEpoch).toBe(2);
        expect(b.terminalFrame.inputEpoch).toBe(0);
        expect({ ...a, terminalFrame: { ...a.terminalFrame, inputEpoch: 0 } }).toEqual(b);
        expect(await capture(releases[0]!, fixture)).toEqual(await capture(resumed, fixture));
      } finally { resumed.executables.simulationAdapter.disposeSession(id.runtimeSessionId); }
    } finally { for (const release of releases) release.executables.simulationAdapter.disposeSession(id.runtimeSessionId); }
  }, 60_000);

  it("rejects invariant failures without committing or disguising them as a continuation retry", async () => {
    const release = currentFactoryForTest(), adapter = release.executables.simulationAdapter;
    await adapter.createSession({ runtimeSessionId: id.runtimeSessionId, scenarios: [{ scenarioId: id.scenarioId, ...bundle.baseline.capture }] });
    try {
      const before = await capture(release, bundle.baseline.capture.fixture);
      vi.spyOn(Session.prototype, "advanceToPresentationTimeWithStandard70SelectedOutputProjectionV1").mockImplementationOnce(() => { throw new Error("invalid predictor invariant"); });
      const fallback = vi.spyOn(Session.prototype, "advanceToPresentationTime");
      await expect(change(release, 4940)).rejects.toThrow("invalid predictor invariant");
      expect(fallback).not.toHaveBeenCalled(); expect(adapter.currentInputEpoch(id)).toBe(0);
      expect(await capture(release, bundle.baseline.capture.fixture)).toEqual(before);
    } finally { adapter.disposeSession(id.runtimeSessionId); }
  });

  it.each(["initial-residual-evaluation", "jacobian-evaluation", "singular-jacobian", "nonfinite"])(
    "rejects %s in live admission without a continuation retry", async reason => {
    const release = currentFactoryForTest(), adapter = release.executables.simulationAdapter;
    await adapter.createSession({ runtimeSessionId: id.runtimeSessionId, scenarios: [{ scenarioId: id.scenarioId, ...bundle.baseline.capture }] });
    try {
      const before = await capture(release, bundle.baseline.capture.fixture);
      const message = `typed ordinary coupled solve failed: ${reason}: injected invalid residual`;
      vi.spyOn(Session.prototype, "advanceToPresentationTimeWithStandard70SelectedOutputProjectionV1")
        .mockImplementationOnce(() => { throw new Error(message); });
      const fallback = vi.spyOn(Session.prototype, "advanceToPresentationTime");
      await expect(change(release, 4940)).rejects.toThrow(message);
      expect(fallback).not.toHaveBeenCalled(); expect(adapter.currentInputEpoch(id)).toBe(0);
      expect(await capture(release, bundle.baseline.capture.fixture)).toEqual(before);
    } finally { adapter.disposeSession(id.runtimeSessionId); }
  });

  it.each(["live-probe", "protected-continuation"])("rejects invalid returned states in %s without retrying them", async path => {
    const release = currentFactoryForTest(), adapter = release.executables.simulationAdapter;
    await adapter.createSession({ runtimeSessionId: id.runtimeSessionId, scenarios: [{ scenarioId: id.scenarioId, ...bundle.baseline.capture }] });
    try {
      if (path === "protected-continuation") await change(release, 6000);
      const fixture = { ...bundle.baseline.capture.fixture, hemodynamicResearchInputs: {
        ...bundle.baseline.capture.fixture.hemodynamicResearchInputs,
        totalBloodVolumeMl: path === "protected-continuation" ? 6000 : bundle.baseline.capture.fixture.hemodynamicResearchInputs.totalBloodVolumeMl } };
      const before = await capture(release, fixture), epoch = adapter.currentInputEpoch(id);
      const rejected = function(this: Session, target: number) {
        const state = this.currentAcceptedState();
        return { status: "failed" as const, reason: "outer-input-clock-binding-or-boundary-rejected" as const,
          message: "statically condensed coupled solve failed: initial-residual-evaluation: invalid residual",
          acceptedTimeSec: state.acceptedTimeSec, acceptedRevision: state.revision,
          partiallyAdvanced: false, internalAcceptedSubstepCount: 0, requestedPresentationTimeSec: target };
      };
      const fallback = vi.spyOn(Session.prototype, "advanceToPresentationTime");
      if (path === "protected-continuation") fallback.mockImplementation(rejected);
      else vi.spyOn(Session.prototype, "advanceToPresentationTimeWithStandard70SelectedOutputProjectionV1")
        .mockImplementation(function(this: Session, target: number) { return { advance: rejected.call(this, target), projectedValues: null, outputProjectionDurationMs: 0 }; });
      await expect(change(release, path === "protected-continuation" ? 4200 : 4940)).rejects.toThrow(/initial-residual-evaluation/);
      expect(fallback).toHaveBeenCalledTimes(path === "protected-continuation" ? 1 : 0);
      expect(adapter.currentInputEpoch(id)).toBe(epoch); expect(await capture(release, fixture)).toEqual(before);
    } finally { adapter.disposeSession(id.runtimeSessionId); }
  });

  it("leaves the exact capture untouched when numerical admission and continuation both fail", async () => {
    const release = currentFactoryForTest(), adapter = release.executables.simulationAdapter;
    await adapter.createSession({ runtimeSessionId: id.runtimeSessionId, scenarios: [{ scenarioId: id.scenarioId, ...bundle.baseline.capture }] });
    try {
      const before = await capture(release, bundle.baseline.capture.fixture);
      vi.spyOn(Session.prototype, "advanceToPresentationTimeWithStandard70SelectedOutputProjectionV1")
        .mockImplementationOnce(() => { throw new Error("typed ordinary coupled solve failed: maximum-iterations: injected nonconvergence"); });
      vi.spyOn(Session.prototype, "advanceToPresentationTime").mockImplementation(function(this: Session, target) {
        const state = this.currentAcceptedState();
        return { status: "failed", reason: "outer-input-clock-binding-or-boundary-rejected", message: "statically condensed coupled solve failed: maximum-iterations: injected continuation rejection",
          acceptedTimeSec: state.acceptedTimeSec, acceptedRevision: state.revision,
          partiallyAdvanced: false, internalAcceptedSubstepCount: 0, requestedPresentationTimeSec: target };
      });
      await expect(change(release, 4940)).rejects.toThrow(/before commit/);
      expect(adapter.currentInputEpoch(id)).toBe(0);
      expect(await capture(release, bundle.baseline.capture.fixture)).toEqual(before);
    } finally { adapter.disposeSession(id.runtimeSessionId); }
  });

  it("executes the inherited pressure-crossing method only for the pinned current artifact, with an isolated source", async () => {
    const release = currentFactoryForTest(), adapter = release.executables.simulationAdapter;
    const seed = bundle.baseline.capture;
    await adapter.createSession({ runtimeSessionId: id.runtimeSessionId, scenarios: [{ scenarioId: id.scenarioId, ...seed }] });
    try {
      const frame = adapter.currentFrame(id), before = await capture(release, seed.fixture);
      const partial: unknown[] = [];
      const request = { ...id, analysisId: pvAnalysis, expectedInputEpoch: frame.inputEpoch,
        expectedAcceptedRevision: frame.acceptedRevision, expectedAcceptedTimeSec: frame.acceptedTimeSec,
        onProgress: (analysis: unknown) => { partial.push(analysis); throw new Error("stop after verified first progress"); } };
      const source = { acceptedFrame: frame, surfaceRelease: surface, legacyExact: null,
        capture: async () => ({ artifactRevisionId: metadata.artifactRevisionId, scenario: before }) };
      await expect(executeMainWirePressureCrossingPvV1({ request, source })).rejects.toThrow("stop after verified first progress");
      expect(partial).toHaveLength(1);
      expect(partial[0]).toMatchObject({ modelId: metadata.manifest.modelId, analysisId: pvAnalysis, sourceAcceptedTimeSec: frame.acceptedTimeSec });
      expect(await capture(release, seed.fixture)).toEqual(before);
      await expect(executeMainWirePressureCrossingPvV1({ request, source: { ...source,
        capture: async () => ({ artifactRevisionId: "0".repeat(64), scenario: before }) } })).rejects.toThrow(/artifact requires compatibility/);
    } finally { adapter.disposeSession(id.runtimeSessionId); }
  }, 60_000);
});

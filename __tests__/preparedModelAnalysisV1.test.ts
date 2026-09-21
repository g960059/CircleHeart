import { afterEach, expect, it, vi } from "vitest";
import { readFile, mkdtemp, rm, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { exportPreparedSnapshotAnalysesV1 } from "@/tools/authoring/PrepareSnapshotAnalysisAssetsV1";
import type { ExperimentSnapshotV2 } from "@/studio/contracts/v2/content";
import { sha256CanonicalJsonHex as hash } from "@/engine/integrity";
import * as integrity from "@/domain/json/CanonicalJsonSha256";
import { loadPreparedModelAnalysisV1 as load } from "@/components/workbench/runtime/PreparedModelAnalysisRegistryV1";
import { validatePreparedAnalysisForDisplayV1 } from "@/components/workbench/runtime/PreparedModelAnalysisRegistryV1";
import type { WorkbenchBackgroundWorkerPoolPortV3 } from "@/components/workbench/runtime/WorkbenchBackgroundWorkerPoolV3";
import type { StudioModelWorkerReleaseTicketV2 } from "@/studio/contracts/v2/release";
import surface from "@/studio/integrations/mainWireIntegratedV3/MainWireIntegratedStudioStaticCaseSurfaceV4";
import oldSurface from "@/studio/integrations/mainWireIntegratedV3/MainWireIntegratedStudioStaticCaseSurfaceV2";
import boundedSurface from "@/studio/integrations/mainWireIntegratedV3/MainWireIntegratedStudioStaticCaseSurfaceV5";
import { buildPreparedModelAnalysisV1 as build, readPreparedModelAnalysisV1 as read,
  buildPreparedScenarioAnalysisV1 as buildScenario, readPreparedScenarioAnalysisV1 as readScenario,
  assessPreparedModelAnalysisV1 as assess, inspectModelAnalysisV1 as inspect } from "@/studio/application/authoring/PreparedModelAnalysisV1";
import * as decoder from "@/analysis/methods/mainWire/MainWireStructuralReturnPayloadV3";
import * as registry from "@/analysis/registry/RegisteredAnalysisMethodsV1";
import * as pva from "@/analysis/methods/mainWire/MainWirePeriodicPvaV1";
import currentBundle from "@/data/model-releases/standard74/bundle.json";
const high = currentBundle.presets[1]!;
import { validateScenarioPresetV2 } from "@/studio/application/authoring/StudioExperimentDataV2";
import { prepareMainWireSurfaceAnalysisV1 as prepare, PreparedSurfaceAnalysisErrorV1 } from "@/tools/registry/PrepareMainWireSurfaceAnalysisV1";
import { CURRENT_MODEL_PRESETS_V1 } from "@/data/model-releases/CurrentModelReleaseV1";
import lock from "@/data/model-releases/standard74/publication.json";
import { REGISTERED_ANALYSIS_EXECUTOR_V1 as executor } from "@/analysis/runtime/RegisteredAnalysisExecutorV1";
import type { StudioSimulationAnalysisV2 } from "@/studio/contracts/v2/simulation";
vi.mock("@/analysis/runtime/RegisteredAnalysisExecutorV1", () => ({ REGISTERED_ANALYSIS_EXECUTOR_V1: { execute: vi.fn() } }));

const capture = validateScenarioPresetV2(high).capture;
const analysis: StudioSimulationAnalysisV2 = { modelId: high.modelId, runtimeSessionId: "offline", scenarioId: "case", inputEpoch: 0,
  sourceAcceptedRevision: capture.checkpoint!.acceptedRevision, sourceAcceptedTimeSec: capture.checkpoint!.acceptedTimeSec,
  analysisId: registry.resolveRegisteredAnalysisMethodsV1(surface).periodicPvaDerivation!.sourceAnalysisId!, payload: { status: "available" } };
const expected = { modelId: high.modelId, artifactRevisionId: "a".repeat(64), capture, surface };
afterEach(() => vi.restoreAllMocks());

it("validates in the bounded pool, sharing only completed exact-source receipts between owners", async () => {
  const ticket = { modelId: expected.modelId, artifactRevisionId: expected.artifactRevisionId, surfaceRelease: surface } as StudioModelWorkerReleaseTicketV2;
  const receipt = { analysis, recordSha256: "1".repeat(64), captureSha256: "2".repeat(64), preparationSourceSha256: "3".repeat(64) };
  let finish!: (value: typeof receipt) => void;
  const validatePreparedAnalysis = vi.fn(() => new Promise<typeof receipt>(resolve => { finish = resolve; }));
  const run = vi.fn((_priority, operation) => operation({ validatePreparedAnalysis }));
  const pool = { run } as unknown as WorkbenchBackgroundWorkerPoolPortV3;
  const record = { test: "shared-valid-source" };
  const first = validatePreparedAnalysisForDisplayV1(record, ticket, capture, pool);
  const second = validatePreparedAnalysisForDisplayV1(record, ticket, capture, pool);
  await vi.waitFor(() => expect(run).toHaveBeenCalledOnce());
  finish(receipt);
  expect(await first).toBe(receipt);
  expect(await second).toBe(receipt);
  const otherRun = vi.fn().mockResolvedValue(receipt);
  const otherPool = { run: otherRun } as unknown as WorkbenchBackgroundWorkerPoolPortV3;
  expect(await validatePreparedAnalysisForDisplayV1(record, ticket, capture, otherPool)).toBe(receipt);
  expect(otherRun).not.toHaveBeenCalled();
  await validatePreparedAnalysisForDisplayV1({ ...record, altered: true }, ticket, capture, otherPool);
  await validatePreparedAnalysisForDisplayV1(record, { ...ticket, artifactRevisionId: "f".repeat(64) }, capture, otherPool);
  expect(otherRun).toHaveBeenCalledTimes(2);
});

it("does not reuse cancelled validation, including another owner's pending work", async () => {
  const ticket = { modelId: expected.modelId, artifactRevisionId: expected.artifactRevisionId, surfaceRelease: surface } as StudioModelWorkerReleaseTicketV2;
  let cancel!: (reason: Error) => void;
  const run = vi.fn(() => new Promise((_, reject) => { cancel = reject; }));
  const pool = { run } as unknown as WorkbenchBackgroundWorkerPoolPortV3;
  const record = { test: "cancelled-source" };
  const first = validatePreparedAnalysisForDisplayV1(record, ticket, capture, pool);
  const rejected = expect(first).rejects.toThrow("cancelled");
  await vi.waitFor(() => expect(run).toHaveBeenCalledOnce());
  const otherRun = vi.fn().mockRejectedValue(new Error("different owner"));
  const otherPool = { run: otherRun } as unknown as WorkbenchBackgroundWorkerPoolPortV3;
  await expect(validatePreparedAnalysisForDisplayV1(record, ticket, capture, otherPool)).rejects.toThrow("different owner");
  expect(otherRun).toHaveBeenCalledOnce();
  cancel(new Error("cancelled")); await rejected;
  otherRun.mockRejectedValueOnce(new Error("retried"));
  await expect(validatePreparedAnalysisForDisplayV1(record, ticket, capture, otherPool)).rejects.toThrow("retried");
  expect(otherRun).toHaveBeenCalledTimes(2);
});

it("exports a saved Scenario's actual Guyton/PV family and rejects a different Snapshot or artifact", async () => {
  const preset = CURRENT_MODEL_PRESETS_V1[0]!;
  const pin = registry.resolveRegisteredAnalysisMethodsV1(surface).periodicPvaDerivation!;
  const record = JSON.parse(await readFile(`data/model-analysis/prepared/${pin.sourceAnalysisId}/${pin.methodId}/${await hash(preset.capture)}.json`, "utf8"));
  const snapshot: ExperimentSnapshotV2 = { schemaId: "circleheart-studio-experiment-snapshot-v2", createdAt: "2026-09-12T00:00:00Z",
    snapshotId: "snapshot/article", surfaceReleaseId: surface.surfaceReleaseId,
    content: { modelId: preset.modelId, surfaceSeriesId: surface.surfaceSeriesId,
      scenarios: [{ scenarioId: "renamed", label: "Reader scenario", capture: preset.capture }],
      surface: { graphPanes: [], outputPanes: [], controlPanes: [], note: { text: "" } } } };
  const result = { source: { snapshotId: snapshot.snapshotId, artifactRevisionId: record.artifactRevisionId,
    exactModel: { modelId: preset.modelId, surfaceSeriesId: surface.surfaceSeriesId, surfaceReleaseId: surface.surfaceReleaseId } },
    analysisId: record.analysis.analysisId, allComplete: true, scenarios: [{ scenarioId: "renamed", status: "complete" as const,
      source: { captureSha256: record.captureSha256, inputEpoch: 0 as const,
        acceptedRevision: preset.capture.checkpoint.acceptedRevision, acceptedTimeSec: preset.capture.checkpoint.acceptedTimeSec },
      assessment: inspect(surface, record.analysis), analysis: record.analysis, error: null }] };
  const output = await mkdtemp(join(tmpdir(), "snapshot-analysis-"));
  const input = { snapshot, result, output, preparationSourceSha256: "b".repeat(64),
    release: { modelId: preset.modelId, artifactRevisionId: record.artifactRevisionId, surfaceRelease: surface } };
  try {
    const exported = await exportPreparedSnapshotAnalysesV1(input);
    expect(exported.allPrepared).toBe(true);
    const saved = await readScenario(JSON.parse(await readFile(exported.rows[0]!.file!, "utf8")), {
      modelId: preset.modelId, artifactRevisionId: record.artifactRevisionId, capture: preset.capture, surface });
    for (const side of ["left", "right"] as const) {
      const orientation = decoder.structuralReturnOrientationFromPayloadV3(saved.analysis.payload, side)!;
      expect(orientation.curve.length).toBeGreaterThan(20);
      expect(orientation.starlingLocus.status).toBe("measured-fixed-tbv-protocol");
    }
    expect(saved.analysis.payload).toEqual(record.analysis.payload);
    await expect(exportPreparedSnapshotAnalysesV1({ ...input, snapshot: { ...snapshot, snapshotId: "other" } })).rejects.toThrow(/binding differs/);
    await expect(exportPreparedSnapshotAnalysesV1({ ...input, release: { ...input.release, artifactRevisionId: "other" } })).rejects.toThrow(/binding differs/);
    const held = await exportPreparedSnapshotAnalysesV1({ ...input, result: { ...result, scenarios: [{ ...result.scenarios[0]!, status: "incomplete", analysis: null }] } });
    expect(held).toMatchObject({ allPrepared: false, rows: [{ status: "held", file: null }] });
  } finally { await rm(output, { recursive: true, force: true }); }
});

it("retains complete Scenario curves with unavailable PVA, without changing registry admission or the method result", async () => {
  const derive = complete().mockReturnValue({ status: "unavailable", reason: "unresolved PE tail",
    loadRelations: { systolic: { completionStatus: "complete" }, diastolic: { completionStatus: "complete" } } } as never);
  expect(() => assess(surface, analysis)).toThrow("unresolved PE tail");
  const saved = await buildScenario({ ...expected, analysis, preparationSourceSha256: "b".repeat(64) });
  expect(saved.assessment.sides.every(s => s.measurementStatus === "complete" && s.pvaStatus === "unavailable")).toBe(true);
  expect(saved.analysis).toEqual(analysis);
  expect(await readScenario(saved, expected)).toEqual(saved);
  await expect(readScenario(saved, { ...expected, capture: { ...capture, fixture: {} } })).rejects.toThrow(/binding differs/);
  await expect(readScenario(saved, { ...expected, surface: boundedSurface })).rejects.toThrow(/method pins differ/);
  await expect(readScenario({ ...saved, recordSha256: "altered" }, expected)).rejects.toThrow(/binding differs/);
  derive.mockReturnValue({ status: "available", completionStatus: "progressive",
    loadRelations: { systolic: { completionStatus: "progressive" }, diastolic: { completionStatus: "complete" } } } as never);
  await expect(buildScenario({ ...expected, analysis, preparationSourceSha256: "b".repeat(64) })).rejects.toThrow(/incomplete/);
});

it("keeps every shipped prepared asset bound to the current artifact and method, including article-only Scenarios", async () => {
  const root = "data/model-analysis/prepared";
  const pin = registry.resolveRegisteredAnalysisMethodsV1(surface).periodicPvaDerivation!;
  let checked = 0;
  for (const analysisId of await readdir(root)) for (const methodId of await readdir(join(root, analysisId))) {
    expect(analysisId).toBe(pin.sourceAnalysisId);
    const assetSurface = methodId === pin.methodId ? surface : boundedSurface;
    expect(methodId).toBe(registry.resolveRegisteredAnalysisMethodsV1(assetSurface).periodicPvaDerivation!.methodId);
    for (const name of await readdir(join(root, analysisId, methodId))) {
      const record = JSON.parse(await readFile(join(root, analysisId, methodId, name), "utf8"));
      const { recordSha256, ...body } = record;
      expect(await hash(body)).toBe(recordSha256);
      expect(name).toBe(`${record.captureSha256}.json`);
      expect(record.modelId).toBe(lock.modelId);
      expect(record.artifactRevisionId).toBe(lock.artifactRevisionId);
      expect(record.analysis.analysisId).toBe(analysisId);
      expect(record.assessment).toEqual(record.schemaId === "prepared-scenario-analysis-v1"
        ? inspect(assetSurface, record.analysis) : assess(assetSurface, record.analysis));
      checked++;
    }
  }
  expect(checked).toBeGreaterThan(CURRENT_MODEL_PRESETS_V1.length);
});
function complete() {
  const locus = { status: "measured-fixed-tbv-protocol", completedPointCount: 3, totalPointCount: 3, protocolId: "protocol",
    points: Array.from({ length: 3 }, () => ({ settled: true, curveEligible: true })) };
  vi.spyOn(decoder, "structuralReturnOrientationFromPayloadV3").mockImplementation((_payload, side) => ({ side, starlingLocus: locus }) as never);
  const original = registry.resolveRegisteredAnalysisMethodsV1;
  vi.spyOn(registry, "resolveRegisteredAnalysisMethodsV1").mockImplementation(s => {
    const methods = original(s);
    return { ...methods, periodicPvaDerivation: { ...methods.periodicPvaDerivation!, build: pva.buildMainWirePeriodicPvaMethodV15 } };
  });
  return vi.spyOn(pva, "buildMainWirePeriodicPvaMethodV15").mockReturnValue({ status: "available", completionStatus: "complete",
    loadRelations: { systolic: { completionStatus: "complete" }, diastolic: { completionStatus: "complete" } } } as never);
}

it("does not hash a large capture when the pinned method has no launch assets", async () => {
  const digest = vi.spyOn(integrity, "sha256StudioCanonicalJsonHex");
  expect(await load({ surfaceRelease: oldSurface } as StudioModelWorkerReleaseTicketV2, capture)).toBeNull();
  expect(digest).not.toHaveBeenCalled();
});

it.each(CURRENT_MODEL_PRESETS_V1.map(preset => [preset.title, preset] as const))(
  "admits the prepared launch family %s under the bounded V16 pin with V15-identical energy, never reusing the V15 record", async (_title, preset) => {
    const pinned = registry.resolveRegisteredAnalysisMethodsV1(surface).periodicPvaDerivation!;
    const candidate = registry.resolveRegisteredAnalysisMethodsV1(boundedSurface).periodicPvaDerivation!;
    expect(candidate).toMatchObject({ methodId: pva.MAIN_WIRE_PERIODIC_PVA_METHOD_V16_ID, sourceAnalysisId: pinned.sourceAnalysisId });
    const record = JSON.parse(await readFile(
      `data/model-analysis/prepared/${pinned.sourceAnalysisId}/${pinned.methodId}/${await hash(preset.capture)}.json`, "utf8"));
    expect(record.assessment.pvaMethodId).toBe(pva.MAIN_WIRE_PERIODIC_PVA_METHOD_V15_ID);
    const assessment = inspect(boundedSurface, record.analysis);
    expect(assessment.pvaMethodId).toBe(pva.MAIN_WIRE_PERIODIC_PVA_METHOD_V16_ID);
    expect(assessment.sides.map(s => [s.side, s.status, s.pvaStatus])).toEqual([["left", "complete", "complete"], ["right", "complete", "complete"]]);
    for (const side of ["left", "right"] as const) {
      const locus = decoder.structuralReturnOrientationFromPayloadV3(record.analysis.payload, side)!.starlingLocus;
      const ventricle = side === "left" ? "LV" as const : "RV" as const;
      const previous = pva.buildMainWirePeriodicPvaMethodV15(locus, ventricle), bounded = pva.buildMainWirePeriodicPvaMethodV16(locus, ventricle);
      if (previous.status !== "available" || bounded.status !== "available") throw new Error("Expected both PVA generations");
      expect(bounded.methodId).toBe(pva.MAIN_WIRE_PERIODIC_PVA_METHOD_V16_ID);
      // Registered launch families already sit above the EDPVR at V_min: the tangent is still consumed and nothing moves.
      expect(bounded.potentialEnergy).toMatchObject({ lowVolumeTailAdmission: "endpoint-tangent-extension", lowVolumeTangentExtensionUsed: true });
      expect(bounded.potentialEnergy.measuredStartPressureGapMmHg).toBeGreaterThan(0);
      for (const key of ["pva", "espvr", "edpvr", "strokeWork", "anchor", "areaDisplay"] as const) expect(bounded[key]).toEqual(previous[key]);
      expect(bounded.potentialEnergy.leftIntersectionVolumeMl).toBe(previous.potentialEnergy.leftIntersectionVolumeMl);
      expect(bounded.potentialEnergy.mmHgMl).toBe(previous.potentialEnergy.mmHgMl);
      if (ventricle === "LV") expect(bounded.estimatedMvo2).toMatchObject({ status: "available", pvaSource: { methodId: pva.MAIN_WIRE_PERIODIC_PVA_METHOD_V16_ID } });
    }
    const expectedUnderCandidate = { modelId: preset.modelId, artifactRevisionId: record.artifactRevisionId, capture: preset.capture, surface: boundedSurface };
    await expect(read(record, expectedUnderCandidate)).rejects.toThrow(/method pins differ/);
    // V16 is re-assessed from the same measured source, with its own method binding and digest.
    const boundedRecord = JSON.parse(await readFile(`data/model-analysis/prepared/${candidate.sourceAnalysisId}/${candidate.methodId}/${await hash(preset.capture)}.json`, "utf8"));
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(boundedRecord)));
    const adopted = await load({ surfaceRelease: boundedSurface, modelId: preset.modelId, artifactRevisionId: record.artifactRevisionId } as StudioModelWorkerReleaseTicketV2, preset.capture);
    expect(adopted).not.toBeNull();
    expect(adopted!.analysis.payload).toEqual(record.analysis.payload);
    expect(boundedRecord.recordSha256).not.toBe(record.recordSha256);
    expect((await read(boundedRecord, expectedUnderCandidate)).assessment.pvaMethodId).toBe(pva.MAIN_WIRE_PERIODIC_PVA_METHOD_V16_ID);
  }, 30_000);

it("accepts identical captures and method pins across presentation-only Surface changes", async () => {
  complete();
  const saved = await build({ ...expected, analysis, preparationSourceSha256: "b".repeat(64) });
  const returned = await read(saved, { ...expected, surface: { ...surface, surfaceReleaseId: "new-layout-only" } });
  expect(returned).toEqual(saved);
  expect(returned.assessment.sides.map(s => s.status)).toEqual(["complete", "complete"]);
});

it("rejects changed artifact, fixture, checkpoint, method, digest and recomputed false assessments", async () => {
  complete();
  const saved = await build({ ...expected, analysis, preparationSourceSha256: "b".repeat(64) });
  for (const input of [{ ...expected, artifactRevisionId: "changed" }, { ...expected, capture: { ...capture, fixture: {} } },
    { ...expected, capture: { ...capture, checkpoint: { ...capture.checkpoint!, acceptedRevision: 1 } } }, { ...expected, surface: oldSurface }])
    await expect(read(saved, input)).rejects.toThrow();
  await expect(read({ ...saved, preparationSourceSha256: "tampered" }, expected)).rejects.toThrow(/binding/);
  const { recordSha256: _digest, ...body } = saved;
  const altered = { ...body, assessment: { ...body.assessment, sides: [] } };
  await expect(read({ ...altered, recordSha256: await hash(altered) }, expected)).rejects.toThrow(/assessment/);
});

it.each(["missing-curve", "progressive-energy", "unavailable-energy"])("holds incomplete final Surface analysis: %s", state => {
  const derive = complete();
  if (state === "missing-curve") derive.mockReturnValue({ status: "available", completionStatus: "complete" } as never);
  if (state === "progressive-energy") derive.mockReturnValue({ status: "available", completionStatus: "progressive" } as never);
  if (state === "unavailable-energy") derive.mockReturnValue({ status: "unavailable" } as never);
  expect(() => assess(surface, analysis)).toThrow(/ESPVR\/EDPVR\/PVA/);
});

it("reports complete measured load relations when energy extrapolation is unavailable without relaxing registry admission", () => {
  complete().mockImplementation((_locus, ventricleId) => ({ status: ventricleId === "LV" ? "unavailable" : "available",
    completionStatus: "complete", reason: "unresolved PE tail",
    loadRelations: { systolic: { completionStatus: "complete" }, diastolic: { completionStatus: "complete" } },
  }) as never);
  const result = inspect(surface, analysis);
  expect(result.sides[0]).toMatchObject({ status: "incomplete", measurementStatus: "complete", settledPoints: 3,
    systolicLoadStatus: "complete", diastolicLoadStatus: "complete", pvaStatus: "unavailable", reason: expect.stringContaining("unresolved PE tail") });
  expect(result.sides[1]).toMatchObject({ status: "complete", measurementStatus: "complete", pvaStatus: "complete", reason: null });
  expect(() => assess(surface, analysis)).toThrow("unresolved PE tail");
});

it("executes through the Surface registry and retains the actual source clocks", async () => {
  complete();
  const execute = vi.mocked(executor.execute).mockResolvedValue(analysis);
  const result = await prepare({ ...expected, preset: validateScenarioPresetV2(high), preparationSourceSha256: "b".repeat(64) });
  expect(execute).toHaveBeenCalledOnce();
  const input = execute.mock.calls[0]![0];
  expect(input.source.surfaceRelease).toBe(surface);
  expect(input.request.analysisId).toBe(analysis.analysisId);
  expect(await input.source.capture!()).toEqual({ artifactRevisionId: expected.artifactRevisionId, scenario: capture });
  expect(result.analysis.sourceAcceptedTimeSec).toBe(capture.checkpoint!.acceptedTimeSec);
});

it("retains the expensive measured payload when final derivation fails", async () => {
  complete().mockReturnValue({ status: "unavailable", reason: "intersection rejected" } as never);
  vi.mocked(executor.execute).mockResolvedValue(analysis);
  const failure = await prepare({ ...expected, preset: validateScenarioPresetV2(high), preparationSourceSha256: "b".repeat(64) }).catch(e => e);
  expect(failure).toBeInstanceOf(PreparedSurfaceAnalysisErrorV1);
  expect(failure.analysis).toBe(analysis);
  expect(failure.message).toContain("intersection rejected");
});

it.each(CURRENT_MODEL_PRESETS_V1)(
  "reconstructs both complete PV/Starling/PVA results from the registered launch asset: $title", async preset => {
    // No mocks/ODE: actual payload decoder, derived method, digest and capture.
    const pin = registry.resolveRegisteredAnalysisMethodsV1(surface).periodicPvaDerivation!;
    const path = `data/model-analysis/prepared/${pin.sourceAnalysisId}/${pin.methodId}/${await hash(preset.capture)}.json`;
    const record = JSON.parse(await readFile(path, "utf8"));
    const result = await read(record, { modelId: lock.modelId, artifactRevisionId: lock.artifactRevisionId, surface, capture: preset.capture });
    expect(result.assessment.sides.map(s => s.status)).toEqual(["complete", "complete"]);
    expect(result.assessment.sides.every(s => s.settledPoints >= 5)).toBe(true);
  });

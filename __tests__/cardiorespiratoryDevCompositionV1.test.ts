import { createHash } from "node:crypto";
import { readFile, mkdtemp, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { importExactExecutableArtifactModuleV2 } from "@/runtime/ExactExecutableArtifactModuleLoaderV2";
import { fingerprintCardiorespiratoryStartupSourceV1 } from "@/tools/scientific/CardiorespiratoryStartupSourceV1";
import { loadCardiorespiratoryDevClientCompositionV1 } from "@/studio/composition/StudioCardiorespiratoryDevCompositionV1";
import { createDefaultExperimentSurfaceV3 } from "@/components/workbench/WorkbenchSurfaceV3";
import { createCardiorespiratoryDevReleaseV1 } from "@/studio/integrations/cardiorespiratoryV1/CardiorespiratoryExactModelV1";
import { validateExperimentDesiredContentForModelV2 } from "@/studio/application/authoring/StudioExperimentDataV2";
import { composeStandardModelContractV1 } from "@/studio/contracts/v2/modelSurface";
import surfaceRelease from "@/studio/integrations/cardiorespiratoryV1/CardiorespiratorySurfaceV1";
import { StudioSimulationWorkerRuntimeV2 } from "@/studio/workers/StudioSimulationWorkerRuntimeV2";
import { createStudioSimulationInitializeRequestV2, createStudioSimulationReadScenariosRequestV2, createStudioSimulationAdvancePresentationRequestV2, createStudioSimulationApplyControlRequestV2, validateStudioSimulationWorkerResponseV2 } from "@/studio/workers/StudioSimulationWorkerProtocolV2";
import { readCardiorespiratoryPreparedDevInputsV1 } from "@/tools/model/CardiorespiratoryPreparedDevInputsV1";
import { CardiorespiratorySessionV1 } from "@/engine/cardiorespiratory/CardiorespiratorySessionV1";
import { DEFAULT_CARDIORESPIRATORY_FIXTURE_V1 } from "@/engine/cardiorespiratory/CardiorespiratoryFixtureV1";
import { CardiorespiratoryStartupMonitorV1, cardiorespiratoryStartupRatesV1, readCardiorespiratoryStartupSampleV1 } from "@/analysis/methods/cardiorespiratory/CardiorespiratoryStartupReadinessV1";
import { studioCanonicalJsonStringify } from "@/domain/json/CanonicalJson";

describe("explicit local cardiorespiratory Model Lab composition", () => {
  it("does not import a self-declared ready preset without current startup evidence", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "cardiorespiratory-prepared-admission-"));
    try {
      const session = CardiorespiratorySessionV1.create(DEFAULT_CARDIORESPIRATORY_FIXTURE_V1);
      const monitor = new CardiorespiratoryStartupMonitorV1({ startTimeSec: 0,
        rates: cardiorespiratoryStartupRatesV1(session.fixture), contextKey: studioCanonicalJsonStringify(session.fixture) });
      const evidence = monitor.assessment(), checkpoint = session.checkpoint();
      const source = { sha256: "a".repeat(64), files: [] };
      const body = { schemaId: "cardiorespiratory-dev-startup-preparation-v1", scope: "local-development-no-publication",
        source, caseId: "dev-baseline", sourcePresetId: null, fixture: session.fixture,
        preparation: { status: "ready", reason: null, checkpoint, observer: monitor.checkpoint(),
          evidence: { ...evidence, status: "ready", issues: [] } } };
      await writeFile(path.join(directory, "dev-baseline.json"), JSON.stringify({ ...body,
        recordSha256: createHash("sha256").update(studioCanonicalJsonStringify(body)).digest("hex") }));
      await expect(readCardiorespiratoryPreparedDevInputsV1({
        root: path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."), directory, source,
      })).rejects.toThrow("no current startup readiness evidence");
    } finally { await rm(directory, { recursive: true, force: true }); }
  });
  it.each(["checkpoint", "terminal-observation"])("rejects a rehashed archive with substituted %s binding", async mutation => {
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
    const bundle = JSON.parse(await readFile(path.join(root, "data/model-releases/cardiorespiratory-dev-v1/bundle.json"), "utf8"));
    const directory = await mkdtemp(path.join(os.tmpdir(), "cardiorespiratory-startup-binding-"));
    try {
      const sha = (value: unknown) => createHash("sha256").update(studioCanonicalJsonStringify(value)).digest("hex");
      const fixture = bundle.defaultFixture, checkpoint = bundle.prepared.defaultCheckpoint.payload;
      const session = CardiorespiratorySessionV1.restore(fixture, checkpoint);
      const evidence = bundle.prepared.preparation.cases[0].evidence;
      const terminalSample = structuredClone(readCardiorespiratoryStartupSampleV1(session));
      if (mutation === "terminal-observation") (terminalSample.values as { mapMmHg: number }).mapMmHg += 1;
      const observer = { schemaId: "cardiorespiratory-startup-monitor-v1", policy: evidence.policy, rates: evidence.rates,
        contextKey: studioCanonicalJsonStringify(fixture), startTimeSec: evidence.startTimeSec, lastTimeSec: evidence.acceptedTimeSec,
        windows: evidence.windows, pending: { startTimeSec: evidence.acceptedTimeSec, sampleCount: 0, sums: {}, minima: {}, maxima: {} }, terminalSample };
      const source = { sha256: bundle.prepared.preparation.sourceSha256, files: [] };
      const preparation = { status: "ready", reason: null, checkpoint, observer, evidence, wallTimeSec: 0, proof: {
        identity: { modelId: bundle.manifest.modelId, sourceSha256: source.sha256 }, fixtureSha256: sha(fixture),
        policySha256: sha(evidence.policy), checkpointSha256: mutation === "checkpoint" ? "0".repeat(64) : sha(checkpoint),
        terminalSampleSha256: sha(terminalSample), evidenceSha256: sha(evidence) } };
      const body = { schemaId: "cardiorespiratory-dev-startup-preparation-v1", scope: "local-development-no-publication",
        source, caseId: "dev-baseline", sourcePresetId: null, fixture, preparation };
      await writeFile(path.join(directory, "dev-baseline.json"), JSON.stringify({ ...body, recordSha256: sha(body) }));
      await expect(readCardiorespiratoryPreparedDevInputsV1({ root, directory, source })).rejects.toThrow("checkpoint and startup evidence binding differ");
    } finally { await rm(directory, { recursive: true, force: true }); }
  });
  it("binds the compiled artifact and every bundled source input to this checkout", async () => {
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
    const bundle = JSON.parse(await readFile(path.join(root, "data/model-releases/cardiorespiratory-dev-v1/bundle.json"), "utf8")) as { artifactRevisionId: string; sourceTreeHash: string; sourceInputs: { path: string; sha256: string }[] };
    const sha256 = (bytes: string | Uint8Array) => createHash("sha256").update(bytes).digest("hex");
    expect(sha256(await readFile(path.join(root, "data/model-releases/cardiorespiratory-dev-v1/artifact.mjs.txt")))).toBe(bundle.artifactRevisionId);
    expect(bundle.sourceInputs.length).toBeGreaterThan(20);
    const source = createHash("sha256");
    for (const input of bundle.sourceInputs) {
      const bytes = await readFile(path.resolve(root, input.path));
      expect(sha256(bytes), input.path).toBe(input.sha256);
      source.update(input.path).update("\0").update(bytes).update("\0");
    }
    expect(source.digest("hex")).toBe(bundle.sourceTreeHash);
  });
  it("restores all five prepared states in the compiled artifact and continues exactly like the source owner", async () => {
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
    const bundle = JSON.parse(await readFile(path.join(root, "data/model-releases/cardiorespiratory-dev-v1/bundle.json"), "utf8"));
    expect(bundle.prepared.preparation.interpretation).toBe("startup-readiness-not-full-settlement");
    expect(bundle.prepared.preparation.sourceSha256).toBe((await fingerprintCardiorespiratoryStartupSourceV1(root)).sha256);
    expect(bundle.prepared.preparation.cases).toHaveLength(5);
    const artifact = await importExactExecutableArtifactModuleV2(new Uint8Array(await readFile(path.join(root, "data/model-releases/cardiorespiratory-dev-v1/artifact.mjs.txt"))));
    const Owner = artifact.ExactSessionV1 as typeof CardiorespiratorySessionV1;
    const captures = [{ fixture: bundle.defaultFixture, checkpoint: bundle.prepared.defaultCheckpoint },
      ...bundle.prepared.presets.map((preset: { capture: { fixture: unknown; checkpoint: unknown } }) => preset.capture)];
    for (const capture of captures) {
      const source = CardiorespiratorySessionV1.restore(capture.fixture, capture.checkpoint.payload);
      const compiled = Owner.restore(capture.fixture, capture.checkpoint.payload);
      expect(compiled.currentAcceptedClock()).toEqual({ acceptedTimeSec: capture.checkpoint.acceptedTimeSec, revision: capture.checkpoint.acceptedRevision });
      expect(compiled.checkpoint()).toEqual(capture.checkpoint.payload);
      const target = capture.checkpoint.acceptedTimeSec + .04;
      source.advanceToPresentationTime(target); compiled.advanceToPresentationTime(target);
      expect(compiled.checkpoint()).toEqual(source.checkpoint());
    }
  });
  it("pins a separate ephemeral artifact, projects every inherited/new control and validates usable default panes", async () => {
    const composition = await loadCardiorespiratoryDevClientCompositionV1(), { contract } = composition.modelSurface;
    expect(composition.exactModel.modelId).toBe("circleheart.cardiorespiratory-dev-v1");
    expect(composition.exactModel.stage).toBe("dev");
    expect(composition.exactModel.defaultCheckpoint?.acceptedTimeSec).toBeGreaterThanOrEqual(60);
    expect(composition.presets).toHaveLength(4);
    for (const preset of composition.presets!) {
      expect(preset.capture.checkpoint?.acceptedTimeSec).toBeGreaterThanOrEqual(60);
      expect(preset.modelId).toBe(composition.exactModel.modelId);
    }
    expect(composition.exactModel.workerReleaseTicket.artifactUrl).toContain(composition.exactModel.workerReleaseTicket.artifactRevisionId);
    for (const control of contract.controlCatalog) expect(composition.exactModel.fixtureProjection.controlValue(composition.exactModel.defaultFixture, control.controlId).status, control.controlId).toBe("value");
    const base = createDefaultExperimentSurfaceV3(contract, "case", { periodicPvaSupported: composition.modelSurface.analysis.periodicPvaDerivation !== null });
    const surface = composition.presentation!.adaptDefaultSurface(base, "ja");
    expect(surface.graphPanes.some(p => p.graphId === "cardiorespiratory.flow-volume")).toBe(true);
    expect(surface.graphPanes.some(p => p.graphId === "cardiorespiratory.lung-pressure-volume")).toBe(true);
    expect(surface.note.text).toContain("oxygen.*");
    expect(surface.note.text).toContain("表示開始時の過渡変化");
    expect(surface.note.text).toContain("全体系の厳密な整定・生理学的な教育目標への適合は未検証");
    expect(surface.note.text).toBe(composition.presentation!.limitations("ja").join("\n\n"));
    expect(composition.presentation!.adaptDefaultSurface(base, "en").note.text).toBe(composition.presentation!.limitations("en").join("\n\n"));
    expect(base.graphPanes).not.toEqual(surface.graphPanes);
    expect(base.note.text).not.toBe(surface.note.text);
    expect(() => validateExperimentDesiredContentForModelV2({ modelId: contract.modelId, surfaceSeriesId: composition.modelSurface.identity.surfaceSeriesId,
      scenarios: [{ scenarioId: "case", label: "Case", fixture: composition.exactModel.defaultFixture }], surface }, contract)).not.toThrow();
  });
  it("restores the prepared default through the ordinary Worker lifecycle without advancing for warmup", async () => {
    const composition = await loadCardiorespiratoryDevClientCompositionV1(), release = createCardiorespiratoryDevReleaseV1();
    const composed = composeStandardModelContractV1(release.manifest, surfaceRelease, composition.modelSurface.analysis.capabilities);
    const messages: unknown[] = [];
    const runtime = new StudioSimulationWorkerRuntimeV2({ loadExactRuntime: async () => ({ ...release.executables, contract: composed.contract, exactContract: composed.exactContract }),
      resolvePresentationAnalysisMethods: () => composition.modelSurface.analysis.presentationMethods,
      port: { postMessage: message => { messages.push(message); }, close() {} } });
    const context = { runtimeSessionId: "dev-worker", scenarioId: "case" };
    const request = async (value: unknown) => { runtime.enqueue(value); await runtime.whenIdle(); return validateStudioSimulationWorkerResponseV2(messages.at(-1)); };
    try {
      const initialized = await request(createStudioSimulationInitializeRequestV2(1, { ...context, expectedModelId: composition.exactModel.modelId,
        scenarioLabel: "Case", fixture: composition.exactModel.defaultFixture, checkpoint: composition.exactModel.defaultCheckpoint, releaseTicket: composition.exactModel.workerReleaseTicket }));
      expect(initialized, JSON.stringify(initialized)).toMatchObject({ status: "ok", kind: "initialized" });
      const captured = await request(createStudioSimulationReadScenariosRequestV2(2, { runtimeSessionId: context.runtimeSessionId, expectedActiveScenarioId: context.scenarioId,
        expectedInputEpoch: 0, expectedAcceptedRevision: composition.exactModel.defaultCheckpoint!.acceptedRevision, expectedAcceptedTimeSec: composition.exactModel.defaultCheckpoint!.acceptedTimeSec }));
      expect(captured, JSON.stringify(captured)).toMatchObject({ status: "ok", kind: "scenarios-captured" });
      const advanced = await request(createStudioSimulationAdvancePresentationRequestV2(3, { ...context, stepCount: 4,
        presentationOutputIds: ["cardiorespiratory.pressure.airway", "cardiorespiratory.volume.lung"] }));
      expect(advanced, JSON.stringify(advanced)).toMatchObject({ status: "ok", kind: "presentation-advanced" });
      const edited = await request(createStudioSimulationApplyControlRequestV2(4, { ...context, expectedInputEpoch: 0, controlId: "cardiorespiratory.ventilator.peep", value: 6 }));
      expect(edited, JSON.stringify(edited)).toMatchObject({ status: "ok" });
    } finally { runtime.terminate(); }
  });
});

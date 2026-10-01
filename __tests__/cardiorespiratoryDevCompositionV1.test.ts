import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { loadCardiorespiratoryDevClientCompositionV1 } from "@/studio/composition/StudioCardiorespiratoryDevCompositionV1";
import { createCardiorespiratoryDefaultSurfaceV1 } from "@/components/workbench/CardiorespiratoryDefaultSurfaceV1";
import { createCardiorespiratoryDevReleaseV1 } from "@/studio/integrations/cardiorespiratoryV1/CardiorespiratoryExactModelV1";
import { validateExperimentDesiredContentForModelV2 } from "@/studio/application/authoring/StudioExperimentDataV2";
import { composeStandardModelContractV1 } from "@/studio/contracts/v2/modelSurface";
import surfaceRelease from "@/studio/integrations/cardiorespiratoryV1/CardiorespiratorySurfaceV1";
import { StudioSimulationWorkerRuntimeV2 } from "@/studio/workers/StudioSimulationWorkerRuntimeV2";
import { createStudioSimulationInitializeRequestV2, createStudioSimulationReadScenariosRequestV2, createStudioSimulationAdvancePresentationRequestV2, createStudioSimulationApplyControlRequestV2, validateStudioSimulationWorkerResponseV2 } from "@/studio/workers/StudioSimulationWorkerProtocolV2";

describe("explicit local cardiorespiratory Model Lab composition", () => {
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
  it("pins a separate ephemeral artifact, projects every inherited/new control and validates usable default panes", async () => {
    const composition = await loadCardiorespiratoryDevClientCompositionV1(), { contract } = composition.modelSurface;
    expect(composition.exactModel.modelId).toBe("circleheart.cardiorespiratory-dev-v1");
    expect(composition.exactModel.stage).toBe("dev");
    expect(composition.exactModel.workerReleaseTicket.artifactUrl).toContain(composition.exactModel.workerReleaseTicket.artifactRevisionId);
    for (const control of contract.controlCatalog) expect(composition.exactModel.fixtureProjection.controlValue(composition.exactModel.defaultFixture, control.controlId).status, control.controlId).toBe("value");
    const surface = createCardiorespiratoryDefaultSurfaceV1(contract, "case", "ja");
    expect(surface.graphPanes.some(p => p.graphId === "cardiorespiratory.flow-volume")).toBe(true);
    expect(surface.graphPanes.some(p => p.graphId === "cardiorespiratory.lung-pressure-volume")).toBe(true);
    expect(surface.note.text).toContain("oxygen.*");
    expect(() => validateExperimentDesiredContentForModelV2({ modelId: contract.modelId, surfaceSeriesId: composition.modelSurface.identity.surfaceSeriesId,
      scenarios: [{ scenarioId: "case", label: "Case", fixture: composition.exactModel.defaultFixture }], surface }, contract)).not.toThrow();
  });
  it("uses the ordinary Worker lifecycle for initialization, ephemeral capture, selected samples and controls", async () => {
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
        scenarioLabel: "Case", fixture: composition.exactModel.defaultFixture, releaseTicket: composition.exactModel.workerReleaseTicket }));
      expect(initialized, JSON.stringify(initialized)).toMatchObject({ status: "ok", kind: "initialized" });
      const captured = await request(createStudioSimulationReadScenariosRequestV2(2, { runtimeSessionId: context.runtimeSessionId, expectedActiveScenarioId: context.scenarioId,
        expectedInputEpoch: 0, expectedAcceptedRevision: 0, expectedAcceptedTimeSec: 0 }));
      expect(captured, JSON.stringify(captured)).toMatchObject({ status: "ok", kind: "scenarios-captured" });
      const advanced = await request(createStudioSimulationAdvancePresentationRequestV2(3, { ...context, stepCount: 4,
        presentationOutputIds: ["cardiorespiratory.pressure.airway", "cardiorespiratory.volume.lung"] }));
      expect(advanced, JSON.stringify(advanced)).toMatchObject({ status: "ok", kind: "presentation-advanced" });
      const edited = await request(createStudioSimulationApplyControlRequestV2(4, { ...context, expectedInputEpoch: 0, controlId: "cardiorespiratory.ventilator.peep", value: 6 }));
      expect(edited, JSON.stringify(edited)).toMatchObject({ status: "ok" });
    } finally { runtime.terminate(); }
  });
});

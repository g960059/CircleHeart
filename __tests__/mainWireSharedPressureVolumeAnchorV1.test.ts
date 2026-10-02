import { readFileSync } from "node:fs";
import { importExactExecutableArtifactModuleV2 } from "@/runtime/ExactExecutableArtifactModuleLoaderV2";
import { afterEach, describe, expect, it } from "vitest";
import { executeMainWirePressureCrossingPvV1 as execute } from "@/analysis/methods/mainWire/MainWirePressureCrossingExecutionV1";
import { MAIN_WIRE_PRESSURE_CROSSING_PV_ANALYSIS_V1_ID as analysisId } from "@/analysis/methods/mainWire/MainWireStructuralAnalysisContractV3";
import type { AnalysisExecutorV1 } from "@/analysis/contracts/AnalysisExecutionV1";
import type { StudioJsonValueV2 as Json } from "@/studio/contracts/v2/json";
import type { StudioSimulationAnalysisV2 as Analysis } from "@/studio/contracts/v2/simulation";
import { hotPathIntegrityTierV1, selectHotPathIntegrityTierV1 } from "@/engine/hotPathIntegrityTierV1";
import { sha256StudioCanonicalJsonHex as digest } from "@/domain/json/CanonicalJsonSha256";
import { CURRENT_MODEL_PRESETS_V1 } from "@/data/model-releases/CurrentModelReleaseV1";
import publication from "@/data/model-releases/standard74/publication.json";

const tier = hotPathIntegrityTierV1();
afterEach(() => selectHotPathIntegrityTierV1(tier));

describe("shared pressure-volume anchor", () => {
  it.each(CURRENT_MODEL_PRESETS_V1.map(preset => ({ ...preset, artifactRevisionId: publication.artifactRevisionId })))
  ("preserves both first measured loads, native evidence and orientation: $title", async preset => {
    selectHotPathIntegrityTierV1("hot-path-lean");
    const checkpoint = preset.capture.checkpoint!;
    const exactNumericalExports = await importExactExecutableArtifactModuleV2(new Uint8Array(readFileSync("data/model-releases/standard74/artifact.mjs.txt")));
    const source = { exactNumericalExports, acceptedFrame: { modelId: preset.modelId, runtimeSessionId: "test", scenarioId: "source",
      inputEpoch: 0, acceptedRevision: checkpoint.acceptedRevision, acceptedTimeSec: checkpoint.acceptedTimeSec, outputs: {} },
      legacyExact: null, capture: async () => ({ artifactRevisionId: preset.artifactRevisionId, scenario: preset.capture }) };
    const request = { runtimeSessionId: "test", scenarioId: "source", analysisId, expectedInputEpoch: 0,
      expectedAcceptedRevision: checkpoint.acceptedRevision, expectedAcceptedTimeSec: checkpoint.acceptedTimeSec };
    const input = { source, request } as Parameters<AnalysisExecutorV1["execute"]>[0];
    const original = JSON.stringify(preset.capture);
    const stop = new Error("first off-anchor point captured");
    let preparation: Json | undefined;
    let preparations = 0;
    const run = async (partition: string, shared: boolean) => {
      const progress: Analysis[] = [];
      try {
        await execute({ ...input, request: { ...request, analysisPartition: partition,
          ...(shared ? partition === "hypovolemic" ? { sharePreparation: true } : { preparedAnalysis: preparation! } : {}),
          onProgress: (analysis, prepared) => {
            if (prepared !== undefined) { preparation = prepared; preparations++; }
            progress.push(analysis);
            const payload = analysis.payload as { left: { starlingLocus: { points: unknown[] } } };
            if (payload.left.starlingLocus.points.length > 1) throw stop;
          } } });
        throw new Error("Expected an off-anchor point");
      } catch (error) { if (error !== stop) throw error; }
      return progress;
    };
    const low = await run("hypovolemic", false);
    const high = await run("hypervolemic", false);
    expect(await run("hypovolemic", true)).toEqual(low);
    expect(preparation).toBeDefined();
    expect(await run("hypervolemic", true)).toEqual(high);
    expect(preparations).toBe(1);
    expect(JSON.stringify(preset.capture)).toBe(original);

    // A source with identical clocks but different construction/inputs is not
    // interchangeable. Neither a stale binding nor damaged transport is used.
    const capsule = preparation as Record<string, Json>;
    const consume = (preparedAnalysis: Json) => execute({ ...input, request: {
      ...request, analysisPartition: "hypervolemic", preparedAnalysis } });
    await expect(consume({ ...capsule, sourceBinding: "different-source" })).rejects.toThrow(/source binding/);
    await expect(consume({ ...capsule, digest: "bad-digest" })).rejects.toThrow(/digest/);
    const { digest: _digest, ...body } = capsule;
    const wrong = { ...body, orientation: { ...(body.orientation as Record<string, Json>), sourceAcceptedRevision: 0 } };
    await expect(consume({ ...wrong, digest: await digest(wrong) })).rejects.toThrow(/endpoint/);
  }, 120_000);
});

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { importExactExecutableArtifactModuleV2 } from "@/runtime/ExactExecutableArtifactModuleLoaderV2";
import type { CardiorespiratorySessionV1 } from "@/engine/cardiorespiratory/CardiorespiratorySessionV1";
import { evaluateParallelPulmonaryPathsV1 } from "@/engine/core/ParallelPulmonaryPathsV1";
import { inverseParallelPulmonaryPressureV1 } from "@/analysis/methods/mainWire/MainWireGuytonStarlingOrientationV3";
import { REGISTERED_ANALYSIS_EXECUTOR_V1 } from "@/analysis/runtime/RegisteredAnalysisExecutorV1";
import { CARDIORESPIRATORY_MECHANICAL_ANALYSIS_V1_ID as analysisId, CARDIORESPIRATORY_MECHANICAL_PROTOCOL_V1_ID as protocolId } from "@/analysis/methods/cardiorespiratory/CardiorespiratoryMechanicalAnalysisV1";
import { buildCardiorespiratoryMechanicalPvaV1, buildMainWirePeriodicPvaMethodV16 } from "@/analysis/methods/mainWire/MainWirePeriodicPvaV1";
import type { StudioJsonValueV2 as Json } from "@/studio/contracts/v2/json";
import type { StudioSimulationAnalysisV2 as Analysis } from "@/studio/contracts/v2/simulation";
import surfaceRelease from "@/studio/integrations/cardiorespiratoryV1/CardiorespiratorySurfaceV1";
import bundle from "@/data/model-releases/cardiorespiratory-dev-v1/bundle.json";
import { MAIN_WIRE_FIXED_TONE_SETTLEMENT_V2, validMainWireFixedTonePointSettlementV2 } from "@/analysis/methods/mainWire/MainWireFixedToneSettlementV2";
import { structuralReturnOrientationFromPayloadV3 } from "@/analysis/methods/mainWire/MainWireStructuralReturnPayloadV3";
import { sha256StudioCanonicalJsonHex as digest } from "@/domain/json/CanonicalJsonSha256";

describe("fixed respiratory mechanical analysis", () => {
  it("inverts both pulmonary paths without averaging their collapse pressures", () => {
    const paths = [{ resistanceMmHgSecPerMl: .04, externalPressureMmHg: 5 },
      { resistanceMmHgSecPerMl: .3, externalPressureMmHg: 22 }] as const;
    for (const downstream of [-5, 0, 10, 30]) for (const flow of [0, .01, 10, 100, 300]) {
      const upstream = inverseParallelPulmonaryPressureV1(paths, downstream, flow);
      expect(evaluateParallelPulmonaryPathsV1(paths, upstream, downstream).totalFlowMlPerSec).toBeCloseTo(flow, 6);
    }
    const up = inverseParallelPulmonaryPressureV1(paths, 10, 100);
    const averaged = paths.map(p => ({ ...p, externalPressureMmHg: 13.5 })) as unknown as typeof paths;
    expect(Math.abs(evaluateParallelPulmonaryPathsV1(averaged, up, 10).totalFlowMlPerSec - 100)).toBeGreaterThan(1);
    expect(() => inverseParallelPulmonaryPressureV1(paths, 10, -1)).toThrow();
  });

  it("runs the dev artifact through the Surface, shares a settled anchor, and leaves the breathing capture intact", async () => {
    const exactNumericalExports = await importExactExecutableArtifactModuleV2(new Uint8Array(readFileSync("data/model-releases/cardiorespiratory-dev-v1/artifact.mjs.txt")));
    const Owner = exactNumericalExports.ExactSessionV1 as typeof CardiorespiratorySessionV1;
    const coupled = Owner.create(bundle.defaultFixture as unknown as Parameters<typeof Owner.create>[0]);
    const capture = { fixture: bundle.defaultFixture as unknown as Json, checkpoint: {
      acceptedRevision: 0, acceptedTimeSec: 0, payload: coupled.checkpoint() as unknown as Json } };
    const original = JSON.stringify(capture);
    const frame = { modelId: bundle.manifest.modelId, runtimeSessionId: "mechanical-test", scenarioId: "source",
      inputEpoch: 0, acceptedRevision: 0, acceptedTimeSec: 0, outputs: {} };
    const source = { acceptedFrame: frame, surfaceRelease, exactNumericalExports, legacyExact: null,
      capture: async () => ({ artifactRevisionId: bundle.artifactRevisionId, scenario: capture }) };
    const request = { runtimeSessionId: frame.runtimeSessionId, scenarioId: frame.scenarioId, analysisId,
      expectedInputEpoch: 0, expectedAcceptedRevision: 0, expectedAcceptedTimeSec: 0 };
    let prepared: Json | undefined;
    const stop = new Error("measured point received");
    const collect = async (partition: string, preparation?: Json) => {
      const progress: Analysis[] = [];
      await expect(REGISTERED_ANALYSIS_EXECUTOR_V1.execute({ source, request: { ...request,
        analysisPartition: partition, ...(preparation ? { preparedAnalysis: preparation } : { sharePreparation: true }),
        onProgress: (value, capsule) => {
          if (capsule) prepared = capsule;
          progress.push(value);
          const payload = value.payload as { left: { starlingLocus: { points: unknown[] } } };
          if (payload.left.starlingLocus.points.length > 1) throw stop;
        },
      } })).rejects.toBe(stop);
      return progress.at(-1)!;
    };
    const low = await collect("hypovolemic");
    expect(prepared).toBeDefined();
    const high = await collect("hypervolemic", prepared);
    for (const value of [low, high]) {
      expect(value).toMatchObject({ analysisId, sourceAcceptedRevision: 0, sourceAcceptedTimeSec: 0,
        payload: { measurement: { protocolId, respiratoryCondition: "captured-boundary-held-fixed", breathingAverage: false,
          wholeSystemGasSettlement: "not-required" } } });
      const payload = value.payload as unknown as { left: { starlingLocus: Parameters<typeof buildCardiorespiratoryMechanicalPvaV1>[0] } };
      expect(payload.left.starlingLocus).toMatchObject({ minimumBeatCount: 4, maximumBeatCount: 50,
        convergencePolicy: "complete-beat-output-and-reservoir-period1-closure",
        settlementPolicy: MAIN_WIRE_FIXED_TONE_SETTLEMENT_V2 });
      for (const side of ["left", "right"] as const) {
        const decoded = structuralReturnOrientationFromPayloadV3(JSON.parse(JSON.stringify(value.payload)), side);
        expect(decoded).not.toBeNull();
        expect(decoded!.starlingLocus.points.every(validMainWireFixedTonePointSettlementV2)).toBe(true);
      }
      expect(() => buildCardiorespiratoryMechanicalPvaV1(payload.left.starlingLocus, "LV")).not.toThrow();
      expect(() => buildMainWirePeriodicPvaMethodV16(payload.left.starlingLocus, "LV")).toThrow(/pinned measured protocol/);
    }
    expect(JSON.stringify(capture)).toBe(original);
    expect(coupled.currentAcceptedClock()).toMatchObject({ acceptedTimeSec: 0, revision: 0 });
    const capsule = prepared as Record<string, Json>;
    const pair = capsule.pair as Record<string, Json>;
    for (const side of ["left", "right"] as const) expect(validMainWireFixedTonePointSettlementV2(pair[side])).toBe(true);
    // A digest authenticates transport consistency, not missing scientific evidence.
    // Rehashing an output-only anchor must not qualify it for the stricter CR method.
    const { digest: _oldDigest, ...body } = capsule;
    const { settlementEvidence: _oldReceipt, ...unqualifiedLeft } = pair.left as Record<string, Json>;
    const damaged = { ...body, pair: { ...pair, left: unqualifiedLeft } };
    await expect(REGISTERED_ANALYSIS_EXECUTOR_V1.execute({ source, request: { ...request,
      analysisPartition: "hypervolemic", preparedAnalysis: { ...damaged, digest: await digest(damaged) } } })).rejects.toThrow(/endpoint/);
    const otherPhase = Owner.create(bundle.defaultFixture as unknown as Parameters<typeof Owner.create>[0]);
    otherPhase.advanceToPresentationTime(.5);
    const mismatchedBoundary = { ...body, checkpoint: await otherPhase.forkFixedRespiratoryMechanicsV1().checkpoint() as unknown as Json };
    await expect(REGISTERED_ANALYSIS_EXECUTOR_V1.execute({ source, request: { ...request,
      analysisPartition: "hypervolemic", preparedAnalysis: { ...mismatchedBoundary, digest: await digest(mismatchedBoundary) } } }))
      .rejects.toThrow(/respiratory boundary differs/);
    await expect(REGISTERED_ANALYSIS_EXECUTOR_V1.execute({ source: { ...source, exactNumericalExports: {} }, request })).rejects.toThrow(/artifact exports/);
  }, 180_000);
});

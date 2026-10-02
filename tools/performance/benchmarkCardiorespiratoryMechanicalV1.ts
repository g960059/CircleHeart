import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { cpus } from "node:os";
import { importExactExecutableArtifactModuleV2 } from "@/runtime/ExactExecutableArtifactModuleLoaderV2";
import type { CardiorespiratorySessionV1 } from "@/engine/cardiorespiratory/CardiorespiratorySessionV1";
import { REGISTERED_ANALYSIS_EXECUTOR_V1 } from "@/analysis/runtime/RegisteredAnalysisExecutorV1";
import { CARDIORESPIRATORY_MECHANICAL_ANALYSIS_V1_ID as analysisId } from "@/analysis/methods/cardiorespiratory/CardiorespiratoryMechanicalAnalysisV1";
import { inspectModelAnalysisV1 } from "@/studio/application/authoring/PreparedModelAnalysisV1";
import surfaceRelease from "@/studio/integrations/cardiorespiratoryV1/CardiorespiratorySurfaceV1";
import type { StudioJsonValueV2 as Json } from "@/studio/contracts/v2/json";
import bundle from "@/data/model-releases/cardiorespiratory-dev-v1/bundle.json";

const option = (name: string, fallback: string) => {
  const i = process.argv.indexOf(name);
  if (i < 0) return fallback;
  const value = process.argv[i + 1];
  if (!value || value.startsWith("--")) throw new Error(`${name} requires a value`);
  return value;
};
const directory = resolve(option("--output", "test-results/cardiorespiratory-mechanical"));
const bytes = await readFile("data/model-releases/cardiorespiratory-dev-v1/artifact.mjs.txt");
if (createHash("sha256").update(bytes).digest("hex") !== bundle.artifactRevisionId) throw new Error("Stale dev artifact");
const exactNumericalExports = await importExactExecutableArtifactModuleV2(bytes);
const Owner = exactNumericalExports.ExactSessionV1 as typeof CardiorespiratorySessionV1;
const session = Owner.create(bundle.defaultFixture as unknown as Parameters<typeof Owner.create>[0]);
const capture = { fixture: bundle.defaultFixture as unknown as Json, checkpoint: {
  acceptedTimeSec: 0, acceptedRevision: 0, payload: session.checkpoint() as unknown as Json } };
const frame = { modelId: bundle.manifest.modelId, runtimeSessionId: "mechanical-benchmark", scenarioId: "baseline",
  inputEpoch: 0, acceptedRevision: 0, acceptedTimeSec: 0, outputs: {} };
const started = performance.now(), cpuStarted = process.cpuUsage();
const progress: { elapsedMs: number; leftPoints: number; rightPoints: number }[] = [];
const result = await REGISTERED_ANALYSIS_EXECUTOR_V1.execute({
  source: { acceptedFrame: frame, surfaceRelease, exactNumericalExports, legacyExact: null,
    capture: async () => ({ artifactRevisionId: bundle.artifactRevisionId, scenario: capture }) },
  request: { runtimeSessionId: frame.runtimeSessionId, scenarioId: frame.scenarioId, analysisId,
    expectedInputEpoch: 0, expectedAcceptedRevision: 0, expectedAcceptedTimeSec: 0,
    onProgress: value => {
      const p = value.payload as { left: { starlingLocus: { points: unknown[] } }; right: { starlingLocus: { points: unknown[] } } };
      const sample = { elapsedMs: performance.now() - started, leftPoints: p.left.starlingLocus.points.length,
        rightPoints: p.right.starlingLocus.points.length };
      progress.push(sample); process.stdout.write(JSON.stringify({ phase: "progress", ...sample }) + "\n");
    } },
});
const elapsedMs = performance.now() - started, cpu = process.cpuUsage(cpuStarted);
const report = { schemaId: "cardiorespiratory-mechanical-benchmark-v1", artifactRevisionId: bundle.artifactRevisionId,
  source: "cold-dev-baseline", condition: "captured-respiratory-boundary-held-fixed", nodeVersion: process.version,
  cpuModel: cpus()[0]?.model, elapsedMs, cpuMs: (cpu.user + cpu.system) / 1000,
  progress, assessment: inspectModelAnalysisV1(surfaceRelease, result) };
await mkdir(directory, { recursive: true });
await writeFile(resolve(directory, "analysis.json"), JSON.stringify(result));
await writeFile(resolve(directory, "timing.json"), JSON.stringify(report, null, 2) + "\n");
process.stdout.write(JSON.stringify(report) + "\n");

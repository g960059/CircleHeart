import { performance } from "node:perf_hooks";
import { createHash } from "node:crypto";
import { readFile, mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir, cpus } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { CardiorespiratorySessionV1 } from "@/engine/cardiorespiratory/CardiorespiratorySessionV1";
import type { createCardiorespiratoryDevReleaseV1 } from "@/studio/integrations/cardiorespiratoryV1/CardiorespiratoryExactModelV1";
import type { StudioJsonValueV2 } from "@/studio/contracts/v2/json";

// Measures the actual local dev artifact, so an old immutable artifact can be
// compared with a rebuilt candidate under the same benchmark. No publication.
const argument = (name: string) => { const i = process.argv.indexOf(name); return i < 0 ? undefined : process.argv[i + 1]; };
const positiveIntegerArgument = (name: string, fallback: number, maximum: number) => {
  const text = argument(name);
  const value = text === undefined && !process.argv.includes(name) ? fallback : Number(text);
  if (!Number.isSafeInteger(value) || value < 1 || value > maximum) throw new Error(`${name} must be an integer in 1..${maximum}`);
  return value;
};
const bundlePath = argument("--bundle") ?? "data/model-releases/cardiorespiratory-dev-v1/bundle.json";
const artifactPath = argument("--artifact") ?? "data/model-releases/cardiorespiratory-dev-v1/artifact.mjs.txt";
const bundle = JSON.parse(await readFile(bundlePath, "utf8"));
const artifact = await readFile(artifactPath);
const directory = await mkdtemp(path.join(tmpdir(), "circleheart-cardiorespiratory-perf-"));
const artifactRevisionId = createHash("sha256").update(artifact).digest("hex");
const dt = .002, warmupSteps = positiveIntegerArgument("--warmup-steps", 250, 60_000),
  rounds = positiveIntegerArgument("--rounds", 3, 20),
  stepsPerRound = positiveIntegerArgument("--steps-per-round", 512, 60_000),
  batchSteps = positiveIntegerArgument("--batch-steps", 16, 32);
const selectedIds = ["hemodynamics.pressure.absolute.Ao", "hemodynamics.volume.LV", "cardiorespiratory.pressure.airway", "cardiorespiratory.volume.lung", "cardiorespiratory.phase"];
const percentile = (values: number[], q: number) => [...values].sort((a, b) => a - b)[Math.ceil(values.length * q) - 1]!;
try {
  const modulePath = path.join(directory, "artifact.mjs");
  await writeFile(modulePath, artifact);
  const releaseModule = await import(/* @vite-ignore */ pathToFileURL(modulePath).href) as {
    ExactSessionV1: typeof CardiorespiratorySessionV1;
    createCircleHeartExactModelReleaseV1: typeof createCardiorespiratoryDevReleaseV1;
  };
  const release = releaseModule.createCircleHeartExactModelReleaseV1();
  const outputIds = [...release.manifest.primitiveSignalCatalog, ...release.manifest.modelMetricCatalog].map(o => o.outputId);
  const fixture = bundle.defaultFixture;
  const terminal: { acceptedTimeSec: number; acceptedRevision: number; outputs: unknown }[] = [];
  const measurements = [];
  for (const mode of ["numerical-only", "selected-batch", "full-frame"] as const) {
    const exact = mode === "numerical-only" ? releaseModule.ExactSessionV1.create(fixture) : null;
    const adapter = releaseModule.createCircleHeartExactModelReleaseV1().executables.simulationAdapter;
    const context = { runtimeSessionId: `performance/${mode}`, scenarioId: "case" };
    if (!exact) await adapter.createSession({ runtimeSessionId: context.runtimeSessionId, scenarios: [{ scenarioId: context.scenarioId, fixture: fixture as StudioJsonValueV2 }] });
    let ordinal = 0;
    const advance = async (count: number) => {
      if (exact) for (let n = 0; n < count; n++) exact.advanceToPresentationTime(++ordinal * dt);
      else if (mode === "selected-batch") {
        for (let n = 0; n < count; n += batchSteps) await adapter.advancePresentationBatch({ ...context, stepCount: Math.min(batchSteps, count - n), presentationOutputIds: selectedIds });
      } else for (let n = 0; n < count; n++) await adapter.advanceOnePresentationStep(context);
    };
    await advance(warmupSteps);
    const sampleMs: number[] = [];
    for (let round = 0; round < rounds; round++) {
      const start = performance.now(); await advance(stepsPerRound); sampleMs.push(performance.now() - start);
    }
    const totalMs = sampleMs.reduce((a, b) => a + b, 0), measuredSteps = rounds * stepsPerRound;
    measurements.push({ mode, measuredSteps, sampleMs, medianMsPerStep: percentile(sampleMs, .5) / stepsPerRound, meanMsPerStep: totalMs / measuredSteps,
      simulatedTimePerWallTime: measuredSteps * dt * 1000 / totalMs });
    if (exact) { const state = exact.currentAcceptedState(); terminal.push({ acceptedTimeSec: state.acceptedTimeSec, acceptedRevision: state.revision, outputs: exact.projectValues(outputIds) }); }
    else { const frame = adapter.currentFrame(context); terminal.push({ acceptedTimeSec: frame.acceptedTimeSec, acceptedRevision: frame.acceptedRevision, outputs: frame.outputs }); adapter.disposeSession(context.runtimeSessionId); }
  }
  if (terminal.some(frame => JSON.stringify(frame) !== JSON.stringify(terminal[0]))) throw new Error("Benchmark presentation modes changed exact terminal outputs");
  process.stdout.write(`${JSON.stringify({ schemaId: "circleheart-cardiorespiratory-performance-v1", artifactRevisionId,
    environment: { node: process.version, architecture: process.arch, cpu: cpus()[0]?.model, logicalCpus: cpus().length,
      requestedIntegrityTier: process.env.CIRCLEHEART_HOT_PATH_INTEGRITY ?? null,
      requestedValidationStamps: process.env.CIRCLEHEART_VALIDATION_STAMPS ?? null },
    fixtureSha256: createHash("sha256").update(JSON.stringify(fixture)).digest("hex"),
    initialization: "cold-fixture-followed-by-warmup", runtimePolicy: release.manifest.runtime,
    warmupSteps, rounds, stepsPerRound, batchSteps, selectedOutputCount: selectedIds.length, measurements,
    terminal: { ...terminal[0], outputs: undefined, outputHash: createHash("sha256").update(JSON.stringify(terminal[0]!.outputs)).digest("hex") } }, null, 2)}\n`);
} finally { await rm(directory, { recursive: true, force: true }); }

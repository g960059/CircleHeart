/**
 * Development-only fixture builder for the Article embed reading study.
 *
 * 1. Runs the reviewed local exact artifact (the same bytes the authoring CLI
 *    executes), starts three Scenarios from the registered Standard74 baseline
 *    capture, applies the total-blood-volume control to two of them through
 *    the ordinary control ABI, advances every lane for a fixed number of
 *    beats, and captures each lane at an accepted boundary.
 * 2. Passes the result through the ordinary Snapshot admission gate; the
 *    recorded admission status is part of the output.
 * 3. Measures the Surface-pinned settled PV/Starling analysis for every
 *    captured Scenario with the registered analysis executor, and stores each
 *    result as a content-addressed prepared Scenario analysis (the same record
 *    format the registry uses for launch presets). The Reader loads these
 *    instead of re-measuring the sealed state on the reader's device.
 *
 * This is a study fixture, not a qualified baseline, published Snapshot, or
 * scientific claim. Usage:
 *
 *   npx vite-node --script tools/dev/buildArticleEmbedStudySnapshotV1.ts
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { selectHotPathIntegrityTierV1 } from "@/engine/hotPathIntegrityTierV1";
import { CURRENT_BASELINE_V1 } from "@/data/model-baselines/CurrentBaselineV1";
import currentClientDescriptorV1 from "@/data/model-releases/CurrentModelReleaseV1";
import currentPublicationLockV1 from "@/data/model-releases/standard74/publication.json";
import currentSurfaceReleaseV1 from
  "@/studio/integrations/mainWireIntegratedV3/MainWireIntegratedStudioStaticCaseSurfaceV5";
import {
  STUDIO_MODEL_WORKER_RELEASE_TICKET_V2_SCHEMA_ID,
  validateStudioModelWorkerReleaseTicketV2,
} from "@/studio/contracts/v2/release";
import {
  STUDIO_EXPERIMENT_SNAPSHOT_V2_SCHEMA_ID,
  type ExperimentSnapshotV2,
  type ExperimentSurfaceV2,
} from "@/studio/contracts/v2/content";
import type { StudioJsonValueV2 } from "@/studio/contracts/v2/json";
import { validateExperimentSnapshotV2 } from "@/studio/application/authoring/StudioExperimentDataV2";
import { admitAndSealStudioSnapshotCommitV1 } from "@/studio/application/authoring/StudioAdmittedSnapshotCommitV1";
import { LocalTrustedAuthoringRuntimeLoaderV1 } from "@/tools/authoring/LocalTrustedAuthoringRuntimeLoaderV1";
import { REGISTERED_ANALYSIS_EXECUTOR_V1 } from "@/analysis/runtime/RegisteredAnalysisExecutorV1";
import { resolveRegisteredAnalysisMethodsV1 } from "@/analysis/registry/RegisteredAnalysisMethodsV1";
import {
  buildPreparedScenarioAnalysisV1,
  type PreparedScenarioAnalysisV1,
} from "@/studio/application/authoring/PreparedModelAnalysisV1";
import {
  ARTICLE_EMBED_STUDY_SCENARIOS_V1,
  ARTICLE_EMBED_STUDY_SURFACE_V1,
  ARTICLE_EMBED_STUDY_SNAPSHOT_ID_V1,
  ARTICLE_EMBED_STUDY_TBV_CONTROL_ID_V1,
} from "@/components/dev/embedStudy/embedStudyDefinitionV1";

selectHotPathIntegrityTierV1("hot-path-lean");

const BEATS_PER_LANE = Number(process.env.CIRCLEHEART_EMBED_STUDY_BEATS ?? "20");
const SKIP_ANALYSIS = process.env.CIRCLEHEART_EMBED_STUDY_SKIP_ANALYSIS === "1";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const outputPath = resolve(root, "components/dev/embedStudy/embedStudySnapshotV1.json");

type Fixture = Readonly<{
  hemodynamicResearchInputs: Readonly<{ heartRateBpm: number; totalBloodVolumeMl: number }>;
}> & Record<string, unknown>;

const ticket = validateStudioModelWorkerReleaseTicketV2({
  schemaId: STUDIO_MODEL_WORKER_RELEASE_TICKET_V2_SCHEMA_ID,
  modelId: currentClientDescriptorV1.manifest.modelId,
  artifactRevisionId: currentPublicationLockV1.artifactRevisionId,
  manifest: currentClientDescriptorV1.manifest,
  surfaceRelease: currentSurfaceReleaseV1,
  moduleAbi: "circleheart-exact-model-esm-v1",
  // The local loader ignores the URL and reads the reviewed artifact bytes.
  artifactUrl: "http://127.0.0.1:3036/standard-exact-model.mjs",
});

const started = performance.now();
const runtime = await new LocalTrustedAuthoringRuntimeLoaderV1().load(ticket);
const adapter = runtime.simulationAdapter;
const baseline = CURRENT_BASELINE_V1;
if (baseline.modelId !== ticket.modelId || baseline.surfaceReleaseId !== currentSurfaceReleaseV1.surfaceReleaseId) {
  throw new Error("Registered baseline does not match the current model and Surface");
}
const baselineFixture = baseline.capture.fixture as unknown as Fixture;
const heartRateBpm = baselineFixture.hemodynamicResearchInputs.heartRateBpm;
const stepSec = (runtime.executionPlan.descriptor as { updateSchedule?: { presentationStepSec?: number } })
  ?.updateSchedule?.presentationStepSec;
if (typeof stepSec !== "number" || !(stepSec > 0)) throw new Error("Exact presentation schedule is unavailable");

const runtimeSessionId = "dev/article-embed-study";
await adapter.createSession({
  runtimeSessionId,
  scenarios: ARTICLE_EMBED_STUDY_SCENARIOS_V1.map(({ scenarioId }) => ({
    scenarioId,
    fixture: baseline.capture.fixture as StudioJsonValueV2,
    checkpoint: baseline.capture.checkpoint,
  })),
});
let snapshot: ExperimentSnapshotV2;
let admission: { status: "passed" } | { status: "rejected"; reason: string };
try {
  const desiredScenarios = [];
  for (const scenario of ARTICLE_EMBED_STUDY_SCENARIOS_V1) {
    let fixture: StudioJsonValueV2 = baseline.capture.fixture as StudioJsonValueV2;
    if (scenario.tbvDeltaMl !== 0) {
      const value = baselineFixture.hemodynamicResearchInputs.totalBloodVolumeMl + scenario.tbvDeltaMl;
      await adapter.applyControl({
        runtimeSessionId, scenarioId: scenario.scenarioId,
        controlId: ARTICLE_EMBED_STUDY_TBV_CONTROL_ID_V1, value,
        expectedInputEpoch: adapter.currentInputEpoch({ runtimeSessionId, scenarioId: scenario.scenarioId }),
      });
      fixture = {
        ...baselineFixture,
        hemodynamicResearchInputs: { ...baselineFixture.hemodynamicResearchInputs, totalBloodVolumeMl: value },
      } as unknown as StudioJsonValueV2;
    }
    const startTimeSec = adapter.currentFrame({ runtimeSessionId, scenarioId: scenario.scenarioId }).acceptedTimeSec;
    const targetTimeSec = startTimeSec + BEATS_PER_LANE * 60 / heartRateBpm;
    for (;;) {
      const frame = adapter.currentFrame({ runtimeSessionId, scenarioId: scenario.scenarioId });
      if (frame.acceptedTimeSec >= targetTimeSec) break;
      const remaining = Math.ceil((targetTimeSec - frame.acceptedTimeSec) / stepSec);
      await adapter.advancePresentationBatch({
        runtimeSessionId, scenarioId: scenario.scenarioId,
        stepCount: Math.max(1, Math.min(64, remaining)),
        presentationOutputIds: ["hemodynamics.pressure.absolute.LV", "hemodynamics.volume.LV"],
      });
    }
    const frame = adapter.currentFrame({ runtimeSessionId, scenarioId: scenario.scenarioId });
    console.error(`${scenario.scenarioId}: advanced to t=${frame.acceptedTimeSec.toFixed(3)} s (${((performance.now() - started) / 1000).toFixed(1)} s wall)`);
    desiredScenarios.push({ scenarioId: scenario.scenarioId, label: scenario.label, fixture });
  }
  const surface: ExperimentSurfaceV2 = ARTICLE_EMBED_STUDY_SURFACE_V1;
  const captured = await runtime.experimentCapture.captureAcceptedCandidate({
    experimentId: "dev/article-embed-study",
    model: runtime.contract,
    desiredContent: {
      modelId: ticket.modelId,
      surfaceSeriesId: currentSurfaceReleaseV1.surfaceSeriesId,
      scenarios: desiredScenarios,
      surface,
    },
    correlation: {
      runtimeSessionId,
      scenarios: ARTICLE_EMBED_STUDY_SCENARIOS_V1.map(({ scenarioId }) => ({
        scenarioId,
        expectedInputEpoch: adapter.currentInputEpoch({ runtimeSessionId, scenarioId }),
      })),
    },
  });
  snapshot = validateExperimentSnapshotV2({
    schemaId: STUDIO_EXPERIMENT_SNAPSHOT_V2_SCHEMA_ID,
    snapshotId: ARTICLE_EMBED_STUDY_SNAPSHOT_ID_V1,
    surfaceReleaseId: currentSurfaceReleaseV1.surfaceReleaseId,
    content: {
      modelId: ticket.modelId,
      surfaceSeriesId: currentSurfaceReleaseV1.surfaceSeriesId,
      scenarios: captured.content.scenarios,
      surface,
    },
    createdAt: new Date().toISOString(),
  });
  try {
    await admitAndSealStudioSnapshotCommitV1({ snapshot, runtime });
    admission = { status: "passed" };
  } catch (error) {
    admission = { status: "rejected", reason: error instanceof Error ? error.message : String(error) };
  }
} finally {
  adapter.disposeSession(runtimeSessionId);
}

// Sealed-state analyses: the same registered executor and the same prepared
// record format as registry launch presets. The record is bound to the exact
// capture hash, the artifact revision, and the Surface's pinned method.
const preparationSourceSha256 = createHash("sha256")
  .update(await readFile(fileURLToPath(import.meta.url)))
  .update(await readFile(resolve(root, "components/dev/embedStudy/embedStudyDefinitionV1.ts")))
  .digest("hex");
const analysisId = resolveRegisteredAnalysisMethodsV1(currentSurfaceReleaseV1).periodicPvaDerivation?.sourceAnalysisId;
if (!analysisId) throw new Error("Current Surface has no pinned periodic PV/Starling analysis");
const preparedAnalyses: PreparedScenarioAnalysisV1[] = [];
const analysisTimings: Record<string, number> = {};
if (!SKIP_ANALYSIS) {
  for (const scenario of snapshot.content.scenarios) {
    const checkpoint = scenario.capture.checkpoint;
    const analysisStarted = performance.now();
    const frame = { modelId: ticket.modelId, runtimeSessionId: "prepared-analysis", scenarioId: scenario.scenarioId,
      inputEpoch: 0, acceptedRevision: checkpoint.acceptedRevision, acceptedTimeSec: checkpoint.acceptedTimeSec, outputs: {} };
    let progressCount = 0;
    const analysis = await REGISTERED_ANALYSIS_EXECUTOR_V1.execute({
      source: { acceptedFrame: frame, surfaceRelease: currentSurfaceReleaseV1, legacyExact: null,
        capture: async () => ({ artifactRevisionId: ticket.artifactRevisionId, scenario: structuredClone(scenario.capture) }) },
      request: { runtimeSessionId: frame.runtimeSessionId, scenarioId: frame.scenarioId, analysisId,
        expectedInputEpoch: 0, expectedAcceptedRevision: frame.acceptedRevision, expectedAcceptedTimeSec: frame.acceptedTimeSec,
        onProgress: () => { progressCount += 1; } },
    });
    const prepared = await buildPreparedScenarioAnalysisV1({
      modelId: ticket.modelId, artifactRevisionId: ticket.artifactRevisionId, capture: scenario.capture,
      surface: currentSurfaceReleaseV1, analysis, preparationSourceSha256,
    });
    analysisTimings[scenario.scenarioId] = performance.now() - analysisStarted;
    preparedAnalyses.push(prepared);
    console.error(`${scenario.scenarioId}: prepared ${analysisId} in ${(analysisTimings[scenario.scenarioId]! / 1000).toFixed(1)} s (${progressCount} progress results; ${prepared.assessment.sides.map(side => `${side.side}:${side.status}`).join(" ")})`);
  }
}

const record = {
  schemaId: "circleheart-dev-article-embed-study-fixture-v3",
  purpose: "UI reading study only; exact captures and Surface-pinned analyses from the reviewed local artifact, not a qualified or published Snapshot",
  generatedAt: snapshot.createdAt,
  tool: "tools/dev/buildArticleEmbedStudySnapshotV1.ts",
  sourceBaselineId: baseline.baselineId,
  beatsAdvancedPerLane: BEATS_PER_LANE,
  admission,
  analysisId,
  analysisWallMsByScenario: analysisTimings,
  snapshot,
  preparedAnalyses,
};
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(record, null, 2)}\n`);
console.log(JSON.stringify({ outputPath, admission, analysisId, preparedAnalyses: preparedAnalyses.length,
  scenarios: snapshot.content.scenarios.map(s => ({
    scenarioId: s.scenarioId, acceptedTimeSec: s.capture.checkpoint.acceptedTimeSec,
    tbvMl: (s.capture.fixture as unknown as Fixture).hemodynamicResearchInputs.totalBloodVolumeMl })),
  analysisWallMsByScenario: analysisTimings,
  wallSec: (performance.now() - started) / 1000 }));

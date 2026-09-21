import { createStudioArticleBriefingV1, type StudioArticleBriefingSelectionV1 } from "@/studio/application/authoring/StudioArticleBriefingPlacementV1";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readFile } from "node:fs/promises";
import { sha256CanonicalJsonHex as hash } from "@/engine/integrity";
import { CURRENT_MODEL_PRESETS_V1 } from "@/data/model-releases/CurrentModelReleaseV1";
import publication from "@/data/model-releases/standard74/publication.json";
import analysisSurface from "@/studio/integrations/mainWireIntegratedV3/MainWireIntegratedStudioStaticCaseSurfaceV5";
import { resolveRegisteredAnalysisMethodsV1 } from "@/analysis/registry/RegisteredAnalysisMethodsV1";
import { REGISTERED_ANALYSIS_EXECUTOR_V1 as analysisExecutor } from "@/analysis/runtime/RegisteredAnalysisExecutorV1";
import { inspectModelAnalysisV1 } from "@/studio/application/authoring/PreparedModelAnalysisV1";
import type { StudioSimulationAnalysisV2 } from "@/studio/contracts/v2/simulation";
vi.mock("@/analysis/runtime/RegisteredAnalysisExecutorV1", () => ({ REGISTERED_ANALYSIS_EXECUTOR_V1: { execute: vi.fn() } }));

import {
  STUDIO_AUTHORING_COMMAND_V1_SCHEMA_ID,
  describeStudioAuthoringProtocolV1,
  executeStudioAuthoringCommandV1,
  type StudioAuthoringModelPortV1,
  validateStudioAuthoringCommandV1,
  type StudioAuthoringRepositoryPortV1,
} from "@/studio/application/authoring/StudioAuthoringCommandV1";
import { STUDIO_ARTICLE_DRAFT_V2_SCHEMA_ID } from "@/studio/contracts/v2/article";
import {
  type ExperimentSnapshotV2,
  STUDIO_EXPERIMENT_PLACEMENT_V2_SCHEMA_ID,
  STUDIO_EXPERIMENT_SNAPSHOT_V2_SCHEMA_ID,
  STUDIO_EXPERIMENT_V2_SCHEMA_ID,
} from "@/studio/contracts/v2/content";

describe("Studio authoring command V1", () => {
  afterEach(() => vi.restoreAllMocks());

  it("discovers read-only Snapshot analysis for any nonempty distinct Scenario selection", async () => {
    const command = snapshotAnalysisCommandV1(["baseline"], false);
    const repository = repositoryV1();
    const authorize = vi.fn();
    const schema = describeStudioAuthoringProtocolV1("snapshot.analyze").actions[0]!;
    expect(schema.mutation).toBe(false);
    expect(schema.inputSchema).toMatchObject({ required: ["snapshotId", "scenarioIds", "includeAnalysis"],
      properties: { scenarioIds: { minItems: 1, uniqueItems: true }, includeAnalysis: { type: "boolean" } } });
    expect(validateStudioAuthoringCommandV1(snapshotAnalysisCommandV1(["1", "2", "3", "4", "5"], false)).action).toBe("snapshot.analyze");
    for (const patch of [{ scenarioIds: [] }, { scenarioIds: ["baseline", "baseline"] },
      { includeAnalysis: "true" }, { analysisId: "unreviewed-method" }]) {
      await expect(executeStudioAuthoringCommandV1(repository, modelsV1(), {
        ...command, input: { ...command.input, ...patch },
      }, { authorize })).rejects.toThrow();
    }
    expect(authorize).not.toHaveBeenCalled();
    expect(repository.readSnapshot).not.toHaveBeenCalled();
    await expect(executeStudioAuthoringCommandV1(repository, modelsV1(), command,
      { authorize: () => { throw new Error("denied"); } })).rejects.toThrow("denied");
    expect(repository.readSnapshot).not.toHaveBeenCalled();
    await expect(executeStudioAuthoringCommandV1(repository, modelsV1(), command, { authorize }))
      .rejects.toThrow("Snapshot is unavailable");
    expect(authorize).toHaveBeenCalledOnce();
  });

  it("analyzes detached Snapshot captures with pinned methods, actual source clocks and display completeness", async () => {
    const { repository, models, snapshot, payload, execute } = await snapshotAnalysisFixtureV1();
    const before = JSON.stringify(snapshot);
    const progress = vi.fn();
    execute.mockImplementation(async ({ source, request }) => {
      expect(source.legacyExact).toBeNull();
      expect(source.surfaceRelease).toBe(analysisSurface);
      expect(request.analysisPartition).toBeUndefined();
      expect(request).toMatchObject({ analysisId: payload.analysisId, scenarioId: "baseline",
        expectedInputEpoch: 0, expectedAcceptedRevision: payload.sourceAcceptedRevision,
        expectedAcceptedTimeSec: payload.sourceAcceptedTimeSec });
      expect(source.acceptedFrame).toEqual({ modelId: snapshot.content.modelId,
        runtimeSessionId: request.runtimeSessionId, scenarioId: "baseline", inputEpoch: 0,
        acceptedRevision: payload.sourceAcceptedRevision, acceptedTimeSec: payload.sourceAcceptedTimeSec, outputs: {} });
      const detached = await source.capture!();
      expect(detached.artifactRevisionId).toBe(publication.artifactRevisionId);
      expect(detached.scenario).toEqual(snapshot.content.scenarios[0]!.capture);
      (detached.scenario.fixture as Record<string, unknown>).testMutation = true;
      const result = { ...payload, runtimeSessionId: request.runtimeSessionId, scenarioId: request.scenarioId };
      request.onProgress!(result);
      return result;
    });
    const result = await executeStudioAuthoringCommandV1(repository, models,
      snapshotAnalysisCommandV1(["baseline"], true), undefined, { onSnapshotAnalysisProgress: progress }) as any;
    expect(result.allComplete).toBe(true);
    expect(result.source.exactModel).toEqual({ modelId: snapshot.content.modelId,
      surfaceSeriesId: analysisSurface.surfaceSeriesId, surfaceReleaseId: analysisSurface.surfaceReleaseId });
    expect(models.resolveAnalysisModel).toHaveBeenCalledWith(result.source.exactModel);
    expect(models.resolveExactNumericalModel).not.toHaveBeenCalled();
    // Display completeness is the host's judgment through the port, on the accepted analysis only.
    expect(vi.mocked(models.assessAnalysis).mock.calls.every(([surface, analysis]) =>
      surface === analysisSurface && analysis.scenarioId === "baseline"
      && analysis.runtimeSessionId.startsWith("authoring/snapshot-analysis/"))).toBe(true);
    expect(result.scenarios[0].assessment).toEqual(vi.mocked(models.assessAnalysis).mock.results.at(-1)!.value);
    expect(result.scenarios[0].source).toEqual({ captureSha256: await hash(snapshot.content.scenarios[0]!.capture),
      inputEpoch: 0, acceptedRevision: payload.sourceAcceptedRevision, acceptedTimeSec: payload.sourceAcceptedTimeSec });
    expect(result.scenarios[0].assessment.sides.map((s: any) => [s.side, s.status])).toEqual([["left", "complete"], ["right", "complete"]]);
    expect(result.scenarios[0].analysis.payload).toEqual(payload.payload);
    expect(progress.mock.calls.map(c => c[0].phase)).toEqual(["started", "progress", "complete"]);
    expect(progress.mock.calls[1]![0].sides).toEqual(result.scenarios[0].assessment.sides.map((s: any) => ({
      side: s.side, completedPointCount: s.settledPoints, totalPointCount: s.settledPoints,
    })));
    expect(JSON.stringify(snapshot)).toBe(before);
    expect(repository.commitSnapshot).not.toHaveBeenCalled();
    expect(repository.saveExperiment).not.toHaveBeenCalled();
    expect(repository.saveArticle).not.toHaveBeenCalled();
  });

  it("checks all selected captures and exact Surface pins before executing any analysis", async () => {
    const { repository, models, snapshot, execute } = await snapshotAnalysisFixtureV1();
    await expect(executeStudioAuthoringCommandV1(repository, models,
      snapshotAnalysisCommandV1(["baseline", "missing"], false))).rejects.toThrow("scenario is unavailable");
    expect(models.resolveAnalysisModel).not.toHaveBeenCalled();
    vi.mocked(repository.readSnapshot).mockResolvedValue({ ...snapshot, content: { ...snapshot.content,
      scenarios: [{ ...snapshot.content.scenarios[0]!, capture: { fixture: {}, checkpoint: null } }] } });
    await expect(executeStudioAuthoringCommandV1(repository, models,
      snapshotAnalysisCommandV1(["baseline"], false))).rejects.toThrow("accepted checkpoint");
    vi.mocked(repository.readSnapshot).mockResolvedValue(snapshot);
    for (const patch of [{ modelId: "other-model" }, { surfaceRelease: { ...analysisSurface, surfaceReleaseId: "other-release" } },
      { surfaceRelease: { ...analysisSurface, surfaceSeriesId: "other-series" } }]) {
      vi.mocked(models.resolveAnalysisModel).mockResolvedValue({ modelId: publication.modelId,
        artifactRevisionId: publication.artifactRevisionId, surfaceRelease: analysisSurface, ...patch });
      await expect(executeStudioAuthoringCommandV1(repository, models,
        snapshotAnalysisCommandV1(["baseline"], false))).rejects.toThrow("Model Surface pin");
    }
    expect(execute).not.toHaveBeenCalled();
  });

  it("rejects a different Snapshot identity and a Surface without a pinned periodic analysis", async () => {
    const { repository, models, snapshot, execute } = await snapshotAnalysisFixtureV1();
    const command = snapshotAnalysisCommandV1(["baseline"], false);
    vi.mocked(repository.readSnapshot).mockResolvedValue({ ...snapshot, snapshotId: "other-snapshot" });
    await expect(executeStudioAuthoringCommandV1(repository, models, command)).rejects.toThrow("Snapshot identity differs");
    expect(models.resolveAnalysisModel).not.toHaveBeenCalled();
    vi.mocked(repository.readSnapshot).mockResolvedValue(snapshot);
    vi.mocked(models.resolveAnalysisModel).mockResolvedValue({ modelId: publication.modelId,
      artifactRevisionId: publication.artifactRevisionId,
      surfaceRelease: { ...analysisSurface, derivedOutputCatalog: [], graphCatalog: [] } });
    await expect(executeStudioAuthoringCommandV1(repository, models, command)).rejects.toThrow("no pinned periodic");
    expect(execute).not.toHaveBeenCalled();
  });

  it("retains valid progress on failure, distinguishes incomplete assessment and continues later scenarios", async () => {
    const { repository, models, snapshot, payload, execute } = await snapshotAnalysisFixtureV1();
    vi.mocked(repository.readSnapshot).mockResolvedValue({ ...snapshot, content: { ...snapshot.content,
      scenarios: ["failed", "incomplete", "complete"].map(scenarioId => ({ ...snapshot.content.scenarios[0]!, scenarioId })) } });
    execute.mockImplementation(async ({ request }) => {
      const analysis = { ...payload, runtimeSessionId: request.runtimeSessionId, scenarioId: request.scenarioId };
      if (request.scenarioId === "failed") { request.onProgress!(analysis); throw new Error("numerical protocol failed"); }
      return request.scenarioId === "incomplete" ? { ...analysis, payload: { status: "available" } } : analysis;
    });
    const result = await executeStudioAuthoringCommandV1(repository, models,
      snapshotAnalysisCommandV1(["failed", "incomplete", "complete"], true)) as any;
    expect(result.allComplete).toBe(false);
    expect(result.scenarios.map((s: any) => s.status)).toEqual(["failed", "incomplete", "complete"]);
    expect(result.scenarios[0].analysis.payload).toEqual(payload.payload);
    expect(result.scenarios[0].error).toEqual({ stage: "execution", message: "numerical protocol failed" });
    expect(result.scenarios[1].error.stage).toBe("assessment");
    expect(result.scenarios[1].assessment.sides.map((s: any) => [s.measurementStatus, s.pvaStatus]))
      .toEqual([["incomplete", "not-evaluated"], ["incomplete", "not-evaluated"]]);
    const compact = await executeStudioAuthoringCommandV1(repository, models,
      snapshotAnalysisCommandV1(["complete"], false)) as any;
    expect(compact.allComplete).toBe(true);
    expect(compact.scenarios[0].analysis).toBeNull();
  });

  it("reports a failing host assessment as incomplete and keeps progress silent instead of aborting", async () => {
    const { repository, models, payload, execute } = await snapshotAnalysisFixtureV1();
    const progress = vi.fn();
    vi.mocked(models.assessAnalysis).mockImplementation(() => { throw new Error("host assessment unavailable"); });
    execute.mockImplementation(async ({ request }) => {
      const analysis = { ...payload, runtimeSessionId: request.runtimeSessionId, scenarioId: request.scenarioId };
      request.onProgress!(analysis);
      return analysis;
    });
    const result = await executeStudioAuthoringCommandV1(repository, models,
      snapshotAnalysisCommandV1(["baseline"], true), undefined, { onSnapshotAnalysisProgress: progress }) as any;
    expect(result.allComplete).toBe(false);
    expect(result.scenarios[0]).toMatchObject({ status: "incomplete", assessment: null,
      analysis: { payload: payload.payload }, error: { stage: "assessment", message: "host assessment unavailable" } });
    expect(progress.mock.calls.map(c => [c[0].phase, c[0].sides])).toEqual([["started", []], ["progress", []], ["incomplete", []]]);
  });

  it("rejects stale or misbound analysis payloads without reporting completion", async () => {
    const { repository, models, payload, execute } = await snapshotAnalysisFixtureV1();
    for (const patch of [{ modelId: "other" }, { runtimeSessionId: "other" }, { scenarioId: "other" },
      { analysisId: "other" }, { inputEpoch: 1 }, { sourceAcceptedRevision: payload.sourceAcceptedRevision + 1 },
      { sourceAcceptedTimeSec: payload.sourceAcceptedTimeSec + 1 }]) {
      execute.mockImplementation(async ({ request }) => ({ ...payload,
        runtimeSessionId: request.runtimeSessionId, scenarioId: request.scenarioId, ...patch }));
      const result = await executeStudioAuthoringCommandV1(repository, models,
        snapshotAnalysisCommandV1(["baseline"], true)) as any;
      expect(result.allComplete).toBe(false);
      expect(result.scenarios[0]).toMatchObject({ status: "failed", analysis: null, assessment: null,
        error: { stage: "execution", message: expect.stringContaining("identity or accepted clocks differ") } });
    }
  });

  it("rejects misbound progress while retaining the last valid analysis for diagnosis", async () => {
    const { repository, models, payload, execute } = await snapshotAnalysisFixtureV1();
    const progress = vi.fn();
    execute.mockImplementation(async ({ request }) => {
      const valid = { ...payload, runtimeSessionId: request.runtimeSessionId, scenarioId: request.scenarioId };
      request.onProgress!(valid);
      request.onProgress!({ ...valid, inputEpoch: 1 });
      return valid;
    });
    const result = await executeStudioAuthoringCommandV1(repository, models,
      snapshotAnalysisCommandV1(["baseline"], true), undefined, { onSnapshotAnalysisProgress: progress }) as any;
    expect(result.allComplete).toBe(false);
    expect(result.scenarios[0]).toMatchObject({ status: "failed", assessment: null,
      analysis: { inputEpoch: 0, payload: payload.payload }, error: { stage: "execution" } });
    expect(progress.mock.calls.map(c => c[0].phase)).toEqual(["started", "progress", "failed"]);
  });

  it("validates trace budgets before authority access and dispatches valid reads through policy", async () => {
    const input = { experimentId: "experiment/trace", expectedVersion: 0,
      exactModel: { modelId: "model/example", surfaceSeriesId: "surface/example", surfaceReleaseId: "surface/example-v1" },
      scenarioIds: ["baseline"], outputIds: ["volume"], stepCount: 64, sampleStride: 1, wallClockTimeoutMs: 1_000 };
    const command = { schemaId: STUDIO_AUTHORING_COMMAND_V1_SCHEMA_ID,
      commandId: "a650007a-2aa4-4a91-a824-ae39fd7d6c19", action: "experiment.trace", input };
    const repository = repositoryV1();
    const authorize = vi.fn();
    for (const patch of [{ scenarioIds: [] }, { outputIds: [] }, { scenarioIds: Array.from({length: 5}, (_, i) => `s${i}`) },
      { outputIds: Array.from({length: 33}, (_, i) => `o${i}`) }, { outputIds: ["volume", "volume"] },
      { stepCount: 20_000, outputIds: Array.from({length: 32}, (_, i) => `o${i}`) }]) {
      await expect(executeStudioAuthoringCommandV1(repository, modelsV1(), { ...command, input: { ...input, ...patch } }, { authorize }))
        .rejects.toThrow(/must|duplicated/);
    }
    expect(authorize).not.toHaveBeenCalled();
    expect(repository.readMyExperiment).not.toHaveBeenCalled();
    await expect(executeStudioAuthoringCommandV1(repository, modelsV1(), command, { authorize })).rejects.toThrow("Experiment is unavailable");
    expect(authorize).toHaveBeenCalledOnce();
    expect(repository.readMyExperiment).toHaveBeenCalledWith("experiment/trace");
  });
  it("rejects a time-only no-op and accepts the advertised 120-second step budget", () => {
    const command = { schemaId: STUDIO_AUTHORING_COMMAND_V1_SCHEMA_ID,
      commandId: "a650007a-2aa4-4a91-a824-ae39fd7d6c19", action: "experiment.preview",
      input: { experimentId: "experiment/trace", expectedVersion: 0, title: "Advance",
        scenarioOperations: [{ operation: "advance", scenarioId: "baseline" }],
        presentation: { mode: "preserve", note: "" }, observeOutputIds: [],
        executionBudget: { advanceSeconds: 0, maxPresentationSteps: 60_000, wallClockTimeoutMs: 600_000 } } };
    expect(() => validateStudioAuthoringCommandV1(command)).toThrow(/positive advanceSeconds/);
    expect(validateStudioAuthoringCommandV1({ ...command, input: { ...command.input,
      executionBudget: { ...command.input.executionBudget, advanceSeconds: 120 } } }).action).toBe("experiment.preview");
  });

  it("discovers one complete action without unrelated command or result schemas", () => {
    const full = describeStudioAuthoringProtocolV1();
    for (const action of full.actions) {
      const scoped = describeStudioAuthoringProtocolV1(action.action);
      expect(scoped.actions).toEqual([action]);
      expect(scoped.envelopes.command).toMatchObject({ oneOf: [{ properties: {
        action: { const: action.action }, input: action.inputSchema,
      } }] });
      expect(scoped.envelopes.success).toMatchObject({ oneOf: [{ properties: {
        action: { const: action.action }, result: action.resultSchema,
      } }] });
      expect(scoped.envelopes.error).toEqual(full.envelopes.error);
      expect(scoped.protocol).toEqual(full.protocol);
    }
    expect(() => describeStudioAuthoringProtocolV1("article.nonexistent"))
      .toThrow(/Unknown authoring action/);
  });
  it("advertises the same graph window limits used by saved presentation validation", () => {
    const description = describeStudioAuthoringProtocolV1("experiment.presentation.save");
    const schema = description.actions[0]!.inputSchema as any;
    const properties = schema.properties.surface.properties.graphPanes.items.properties;
    expect(properties.windowSec).toEqual({ type: "number", minimum: 1, maximum: 12, multipleOf: 0.5 });
    expect(properties.pvTrailBeats).toEqual({ type: "integer", minimum: 0, maximum: 5 });
    expect(properties.historyDepth.minimum).toBe(0);
    expect(properties.historyDepth.maximum).toBeGreaterThanOrEqual(3);
  });
  it("describes nested numerical and Article commands for AI discovery", () => {
    const description = describeStudioAuthoringProtocolV1();
    const preview = description.actions.find(({ action }) =>
      action === "experiment.preview");
    const patch = description.actions.find(({ action }) =>
      action === "article.blocks.patch");
    expect(description.jsonSchemaDialect)
      .toBe("https://json-schema.org/draft/2020-12/schema");
    expect(description.envelopes.command).toMatchObject({
      oneOf: expect.arrayContaining([
        expect.objectContaining({ additionalProperties: false }),
      ]),
    });
    expect(description.envelopes.error).toMatchObject({
      type: "object",
      properties: {
        error: {
          type: "object",
          properties: {
            recovery: {
              enum: expect.arrayContaining([
                "inspect-operation-then-retry-same-command",
                "read-authority-state",
              ]),
            },
          },
        },
      },
    });
    expect(description.protocol.errorRecovery).toMatchObject({
      "refresh-headless-token": expect.any(String),
      "read-authority-state": expect.any(String),
    });
    const previewInputBranches = (
      preview?.inputSchema as { oneOf?: Array<Record<string, any>> } | undefined
    )?.oneOf;
    expect(previewInputBranches).toHaveLength(2);
    for (const branch of previewInputBranches ?? []) {
      expect(branch).toMatchObject({
        additionalProperties: false,
        properties: {
          scenarioOperations: {
            items: { oneOf: expect.any(Array) },
          },
        },
      });
      const budget = (branch.properties as Record<string, any>).executionBudget;
      expect(budget.properties.advanceSeconds.maximum).toBe(120);
      expect(budget.properties.wallClockTimeoutMs.maximum).toBe(600_000);
    }
    const previewResult = preview?.resultSchema as {
      properties?: Record<string, any>;
    } | undefined;
    const planBranches = previewResult?.properties?.plan?.oneOf as
      | Array<Record<string, any>>
      | undefined;
    expect(planBranches).toHaveLength(2);
    expect(planBranches).toEqual(expect.arrayContaining([
      expect.objectContaining({
        properties: expect.objectContaining({
          experimentId: { const: null },
          expectedVersion: { const: null },
          planDigest: { pattern: "^[0-9a-f]{64}$", type: "string" },
        }),
      }),
      expect.objectContaining({
        properties: expect.objectContaining({
          experimentId: { minLength: 1, type: "string" },
          expectedVersion: { minimum: 0, type: "integer" },
        }),
      }),
    ]));
    expect(previewResult?.properties?.observations).toMatchObject({
      items: { properties: { outputs: { type: "array" } } },
    });
    expect(patch?.inputSchema).toMatchObject({
      properties: {
        operations: { items: { oneOf: expect.any(Array) } },
      },
    });
    const apply = description.actions.find(({ action }) =>
      action === "experiment.apply");
    expect(apply?.resultSchema).toMatchObject({
      properties: {
        observations: { type: "array" },
        savedExperiment: { type: "object" },
      },
    });
    const list = description.actions.find(({ action }) =>
      action === "experiment.list");
    expect(list?.inputSchema).toMatchObject({
      required: ["cursor", "limit"],
      properties: { cursor: { oneOf: expect.any(Array) } },
    });
    expect(list?.resultSchema).toMatchObject({
      properties: {
        items: { items: { additionalProperties: false } },
        nextCursor: { oneOf: expect.any(Array) },
      },
    });
    const articleSave = description.actions.find(({ action }) =>
      action === "article.save");
    const articleSaveBranches = (
      articleSave?.inputSchema as { oneOf?: Array<Record<string, any>> } | undefined
    )?.oneOf ?? [];
    const articleBlocks = (
      articleSaveBranches[0]?.properties as Record<string, any>
    )?.article?.properties?.blocks?.items?.oneOf as Array<Record<string, any>>;
    const imageBlock = articleBlocks.find((branch) =>
      branch.properties?.kind?.const === "image");
    const accordionBlock = articleBlocks.find((branch) =>
      branch.properties?.kind?.const === "accordion");
    const quizBlock = articleBlocks.find((branch) =>
      branch.properties?.kind?.const === "quiz");
    const linkBlock = articleBlocks.find((branch) =>
      branch.properties?.kind?.const === "link");
    expect(imageBlock?.properties?.url).toMatchObject({
      oneOf: expect.arrayContaining([
        { const: "" },
        expect.objectContaining({
          format: "uri",
          pattern: expect.stringContaining("https://"),
        }),
      ]),
    });
    expect(accordionBlock?.properties?.blocks).toMatchObject({
      maxItems: 100,
      items: {
        oneOf: expect.not.arrayContaining([
          expect.objectContaining({
            properties: { kind: { const: "experiment" } },
          }),
        ]),
      },
    });
    expect(quizBlock?.properties?.choices).toMatchObject({
      minItems: 2,
      maxItems: 8,
      items: { additionalProperties: false },
    });
    expect(linkBlock?.properties?.href).toMatchObject({
      oneOf: expect.arrayContaining([
        expect.objectContaining({
          pattern: expect.stringContaining("\\\\\\u0000"),
        }),
      ]),
    });
  });

  it("pages authoring inventory with one opaque authority cursor", async () => {
    const repository = repositoryV1();
    const command = {
      schemaId: STUDIO_AUTHORING_COMMAND_V1_SCHEMA_ID,
      commandId: "11111111-1111-4111-8111-111111111111",
      action: "experiment.list",
      input: {
        cursor: {
          timestamp: "2026-08-11T00:00:00.123456Z",
          id: "22222222-2222-4222-8222-222222222222",
        },
        limit: 50,
      },
    } as const;
    await executeStudioAuthoringCommandV1(repository, modelsV1(), command);
    expect(repository.listMyExperiments).toHaveBeenCalledWith(command.input);
    expect(() => validateStudioAuthoringCommandV1({
      ...command,
      input: { limit: 50 },
    })).toThrow(/keys must be exactly cursor, limit/);
  });

  it("accepts a complete Article save command and rejects hidden authority", () => {
    const command = articleSaveCommandV1();
    expect(validateStudioAuthoringCommandV1(command)).toEqual(command);
    expect(() => validateStudioAuthoringCommandV1({
      ...command,
      serviceRoleKey: "must-never-enter-a-command",
    })).toThrow(/keys must be exactly/);
  });

  it("executes through a repository port with an optional policy seam", async () => {
    const repository = repositoryV1();
    const authorize = vi.fn();
    await expect(executeStudioAuthoringCommandV1(
      repository,
      modelsV1(),
      articleSaveCommandV1(),
      { authorize },
    )).resolves.toMatchObject({ articleId: "article/pv-loop" });
    expect(authorize).toHaveBeenCalledOnce();
    expect(repository.saveArticle).toHaveBeenCalledWith({
      articleId: "article/pv-loop",
      expectedVersion: 2,
      article: articleV1(),
    });
  });

  it("publishes an already admitted Snapshot without an approval prompt", async () => {
    const repository = repositoryV1();
    await expect(executeStudioAuthoringCommandV1(repository, modelsV1(), {
      schemaId: STUDIO_AUTHORING_COMMAND_V1_SCHEMA_ID,
      commandId: "22222222-2222-4222-8222-222222222222",
      action: "experiment.publish",
      input: {
        experimentId: "experiment/pv-loop",
        expectedVersion: 3,
        snapshotId: "snapshot/admitted-pv-loop",
        publicSlug: "pv-loop-basics",
      },
    })).resolves.toEqual({ published: true });
    expect(repository.publishExperiment).toHaveBeenCalledOnce();
  });

  it("rejects publication slugs before the backend constraint", () => {
    expect(() => validateStudioAuthoringCommandV1({
      schemaId: STUDIO_AUTHORING_COMMAND_V1_SCHEMA_ID,
      commandId: "22222222-2222-4222-8222-222222222222",
      action: "experiment.publish",
      input: {
        experimentId: "experiment/pv-loop",
        expectedVersion: 3,
        snapshotId: "snapshot/admitted-pv-loop",
        publicSlug: "Invalid slug",
      },
    })).toThrow(/3-96 lowercase alphanumeric or hyphen/);
  });

  it("reads an exact Snapshot for Article authoring", async () => {
    const repository = repositoryV1();
    await expect(executeStudioAuthoringCommandV1(repository, modelsV1(), {
      schemaId: STUDIO_AUTHORING_COMMAND_V1_SCHEMA_ID,
      commandId: "55555555-5555-4555-8555-555555555555",
      action: "snapshot.read",
      input: { snapshotId: "snapshot/admitted-pv-loop" },
    })).resolves.toBeNull();
    expect(repository.readSnapshot).toHaveBeenCalledWith(
      "snapshot/admitted-pv-loop",
    );
  });

  it("requires explicit Scenario operations in an AI numerical preview", () => {
    const command = validateStudioAuthoringCommandV1({
      schemaId: STUDIO_AUTHORING_COMMAND_V1_SCHEMA_ID,
      commandId: "12121212-1212-4212-8212-121212121212",
      action: "experiment.preview",
      input: {
        experimentId: "experiment/pv-loop",
        expectedVersion: 3,
        title: "Fluid response",
        scenarioOperations: [{
          operation: "update",
          scenarioId: "scenario/baseline",
          label: null,
          controls: [{ controlId: "hemodynamics.total-blood-volume-ml", value: 6100 }],
        }],
        presentation: { mode: "preserve", note: "" },
        executionBudget: {
          advanceSeconds: 10,
          maxPresentationSteps: 2_000,
          wallClockTimeoutMs: 60_000,
        },
        observeOutputIds: null,
      },
    });
    expect(command.action).toBe("experiment.preview");
    if (command.action !== "experiment.preview") throw new Error("unexpected action");
    expect(command.input.scenarioOperations).toEqual([{
      operation: "update",
      scenarioId: "scenario/baseline",
      label: null,
      controls: [{ controlId: "hemodynamics.total-blood-volume-ml", value: 6100 }],
    }]);
  });

  it("routes mutations to authority instead of trusting a coarse receipt", async () => {
    const repository = repositoryV1();
    vi.mocked(repository.readMyAuthoringOperationReceipt).mockResolvedValue({
      operationId: "66666666-6666-4666-8666-666666666666",
      operationKind: "save-experiment-v1",
      status: "committed",
      result: { experimentId: "experiment/pv-loop", version: 4 },
      createdAt: "2026-08-11T00:00:00.000Z",
      completedAt: "2026-08-11T00:00:01.000Z",
    });
    await expect(executeStudioAuthoringCommandV1(
      repository,
      modelsV1(),
      articleSaveCommandV1(),
    )).resolves.toMatchObject({ articleId: "article/pv-loop" });
    expect(repository.readMyAuthoringOperationReceipt).not.toHaveBeenCalled();
    expect(repository.saveArticle).toHaveBeenCalledOnce();
  });

  it("patches selected Article blocks without replacing the whole draft", async () => {
    const repository = repositoryV1();
    vi.mocked(repository.readArticle).mockResolvedValue(articleV1());
    await expect(executeStudioAuthoringCommandV1(repository, modelsV1(), {
      schemaId: STUDIO_AUTHORING_COMMAND_V1_SCHEMA_ID,
      commandId: "13131313-1313-4313-8313-131313131313",
      action: "article.blocks.patch",
      input: {
        articleId: "article/pv-loop",
        expectedVersion: 2,
        title: null,
        operations: [{
          operation: "replace",
          blockId: "block/equation",
          block: {
            blockId: "block/equation",
            kind: "paragraph",
            text: "Observed rather than assumed.",
          },
        }],
      },
    })).resolves.toMatchObject({ articleId: "article/pv-loop" });
    expect(repository.saveArticle).toHaveBeenCalledWith(expect.objectContaining({
      article: expect.objectContaining({
        blocks: expect.arrayContaining([{
          blockId: "block/equation",
          kind: "paragraph",
          text: "Observed rather than assumed.",
        }]),
      }),
    }));
  });

  it("places one fixed Snapshot Briefing through the AI command seam", async () => {
    const repository = repositoryV1();
    vi.mocked(repository.readArticle).mockResolvedValue(articleV1());
    vi.mocked(repository.readSnapshot).mockResolvedValue({
      schemaId: STUDIO_EXPERIMENT_SNAPSHOT_V2_SCHEMA_ID,
      snapshotId: "snapshot/admitted-pv-loop",
      content: contentV1(),
      surfaceReleaseId: "surface-release/example",
      createdAt: "2026-08-11T00:00:00.000Z",
    });
    await expect(executeStudioAuthoringCommandV1(repository, modelsV1(), {
      schemaId: STUDIO_AUTHORING_COMMAND_V1_SCHEMA_ID,
      commandId: "14141414-1414-4414-8414-141414141414",
      action: "article.briefing.place",
      input: {
        articleId: "article/pv-loop",
        expectedVersion: 2,
        snapshotId: "snapshot/admitted-pv-loop",
        selection: {
          title: "PV loop",
          visibleScenarioIds: null,
          outputScenarioMode: "source-fixed",
          controlBindingMode: "source-fixed",
          initialFocusScenarioId: null,
          graphPaneIds: null,
          outputIds: null,
          controlIds: null,
        },
        target: { mode: "append" },
      },
    })).resolves.toMatchObject({
      articleId: "article/pv-loop",
      placementId: "placement/authoring/14141414-1414-4414-8414-141414141414",
      blockId: "block/authoring/14141414-1414-4414-8414-141414141414",
      snapshotId: "snapshot/admitted-pv-loop",
    });
    expect(repository.saveArticle).toHaveBeenCalledWith(expect.objectContaining({
      article: expect.objectContaining({
        blocks: expect.arrayContaining([expect.objectContaining({
          kind: "experiment",
          placement: expect.objectContaining({
            snapshotId: "snapshot/admitted-pv-loop",
            briefing: expect.objectContaining({ defaultTitle: "PV loop" }),
          }),
        })]),
      }),
    }));
  });

  it("rejects an Experiment presentation outside the resolved model catalog", async () => {
    const repository = repositoryV1();
    vi.mocked(repository.readMyExperiment).mockResolvedValue({
      experiment: {
        schemaId: STUDIO_EXPERIMENT_V2_SCHEMA_ID,
        experimentId: "experiment/pv-loop",
        version: 3,
        content: contentV1(),
      },
      title: "Baseline",
    });
    const surface = {
      ...contentV1().surface,
      graphPanes: [{
        paneId: "pane/unknown",
        role: "graph" as const,
        label: "Unknown",
        order: 0,
        priority: 0,
        graphId: "graph/not-registered",
        scenarioScope: { mode: "visible-scenarios" as const },
        excludedTraces: [],
        windowSec: 2,
        series: [],
      }],
    };
    await expect(executeStudioAuthoringCommandV1(repository, modelsV1(), {
      schemaId: STUDIO_AUTHORING_COMMAND_V1_SCHEMA_ID,
      commandId: "66666666-6666-4666-8666-666666666666",
      action: "experiment.presentation.save",
      input: {
        experimentId: "experiment/pv-loop",
        expectedVersion: 3,
        surfaceReleaseId: "surface-release/example",
        title: "Baseline",
        surface,
      },
    })).rejects.toThrow(/unknown registered graph/);
    expect(repository.saveExperiment).not.toHaveBeenCalled();
  });

  it("does not save periodic PVA or envelope claims on a raw-only Model Surface", async () => {
    const repository = repositoryV1();
    vi.mocked(repository.readMyExperiment).mockResolvedValue({
      experiment: {
        schemaId: STUDIO_EXPERIMENT_V2_SCHEMA_ID,
        experimentId: "experiment/pv-loop",
        version: 3,
        content: contentV1(),
      },
      title: "Baseline",
    });
    const models = modelsV1({
      periodicPvaSupported: false,
      pressureVolumeGraph: true,
    });
    const command = (surface: ReturnType<typeof pressureVolumeSurfaceV1>) => ({
      schemaId: STUDIO_AUTHORING_COMMAND_V1_SCHEMA_ID,
      commandId: "67676767-6767-4767-8767-676767676767",
      action: "experiment.presentation.save" as const,
      input: {
        experimentId: "experiment/pv-loop",
        expectedVersion: 3,
        surfaceReleaseId: "surface-release/example",
        title: "Baseline",
        surface,
      },
    });

    await expect(executeStudioAuthoringCommandV1(
      repository,
      models,
      command(pressureVolumeSurfaceV1("formal-periodic")),
    )).rejects.toThrow(/no periodic PVA analysis.*raw-exact-orbit/);
    await expect(executeStudioAuthoringCommandV1(
      repository,
      models,
      command(pressureVolumeSurfaceV1("raw-exact-orbit", false)),
    )).rejects.toThrow(/raw-exact-orbit.*must not configure an analysis envelope/);
    expect(repository.saveExperiment).not.toHaveBeenCalled();
  });

  it("rejects an Article placement when its exact Snapshot is unavailable", async () => {
    const repository = repositoryV1();
    const article = {
      ...articleV1(),
      blocks: [{
        blockId: "block/simulation",
        kind: "experiment" as const,
        placement: {
          schemaId: STUDIO_EXPERIMENT_PLACEMENT_V2_SCHEMA_ID,
          placementId: "placement/pv-loop",
          snapshotId: "snapshot/missing",
          briefing: {
            defaultTitle: "PV loop",
            scenarioScope: {
              visibleScenarioIds: ["scenario/baseline"],
              initialFocusScenarioId: "scenario/baseline",
            },
            graphs: [],
            outputs: [],
            controls: [],
          },
          titleOverride: null,
          caption: null,
        },
      }],
    };
    await expect(executeStudioAuthoringCommandV1(repository, modelsV1(), {
      ...articleSaveCommandV1(),
      commandId: "77777777-7777-4777-8777-777777777777",
      input: {
        ...articleSaveCommandV1().input,
        article,
      },
    })).rejects.toThrow(/Snapshot snapshot\/missing is unavailable/);
    expect(repository.saveArticle).not.toHaveBeenCalled();
  });

  it("does not pretend raw parameter mutation is safe without an execution host", () => {
    expect(() => validateStudioAuthoringCommandV1({
      schemaId: STUDIO_AUTHORING_COMMAND_V1_SCHEMA_ID,
      commandId: "33333333-3333-4333-8333-333333333333",
      action: "scenario.parameter.set",
      input: { controlId: "hemodynamics.tbv", value: 4800 },
    })).toThrow(/Unsupported Studio authoring action/);
  });

  it("rejects an outer Article target that disagrees with its embedded draft", () => {
    const command = articleSaveCommandV1();
    expect(() => validateStudioAuthoringCommandV1({
      ...command,
      input: {
        ...command.input,
        articleId: "article/another",
      },
    })).toThrow(/identity\/version must match/);
  });

  it("rejects an empty Article title before persistence", () => {
    const command = articleSaveCommandV1();
    expect(() => validateStudioAuthoringCommandV1({
      ...command,
      input: {
        ...command.input,
        article: { ...command.input.article, title: "" },
      },
    })).toThrow(/article\.title must be non-empty/);
  });

  it("rejects unsafe image URLs in AI-authored Article blocks", () => {
    const command = articleSaveCommandV1();
    expect(() => validateStudioAuthoringCommandV1({
      ...command,
      input: {
        ...command.input,
        article: {
          ...command.input.article,
          blocks: [{
            blockId: "block/image",
            kind: "image",
            url: "file:///tmp/private.png",
            altText: "",
            caption: "",
          }],
        },
      },
    })).toThrow(/HTTPS URL/);
  });
});

function articleSaveCommandV1() {
  return {
    schemaId: STUDIO_AUTHORING_COMMAND_V1_SCHEMA_ID,
    commandId: "11111111-1111-4111-8111-111111111111",
    action: "article.save" as const,
    input: {
      articleId: "article/pv-loop",
      expectedVersion: 2,
      article: articleV1(),
    },
  };
}

function articleV1() {
  return {
    schemaId: STUDIO_ARTICLE_DRAFT_V2_SCHEMA_ID,
    articleId: "article/pv-loop",
    draftVersion: 2,
    visibility: "draft" as const,
    locale: "ja",
    title: "PV loopの基礎",
    blocks: [{
      blockId: "block/equation",
      kind: "equation" as const,
      expression: "CO = HR \\times SV",
    }, {
      blockId: "block/image",
      kind: "image" as const,
      url: "https://example.com/pv-loop.png",
      altText: "PV loop",
      caption: "Baseline",
    }, {
      blockId: "block/divider",
      kind: "divider" as const,
    }, {
      blockId: "block/accordion",
      kind: "accordion" as const,
      title: "臨床での解釈",
      blocks: [{
        blockId: "block/accordion/paragraph",
        kind: "paragraph" as const,
        text: "複数の指標を統合して読みます。",
      }],
    }, {
      blockId: "block/quiz",
      kind: "quiz" as const,
      question: "後負荷が上がると一回拍出量は？",
      choices: [{ choiceId: "choice/decrease", label: "低下" }, {
        choiceId: "choice/increase",
        label: "上昇",
      }],
      correctChoiceId: "choice/decrease",
      explanation: "急性の後負荷上昇では駆出が減ります。",
    }, {
      blockId: "block/link",
      kind: "link" as const,
      href: "/ja/articles/series-introduction",
      label: "シリーズ冒頭へ",
      description: "基礎から読み直します。",
    }],
  };
}

function repositoryV1(): StudioAuthoringRepositoryPortV1 {
  return {
    listMyExperiments: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
    listMySnapshots: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
    deleteCourse: vi.fn(), saveCourse: vi.fn(), publishCourse: vi.fn(), readMyCourse: vi.fn().mockResolvedValue(null),
    readPublicCourse: vi.fn().mockResolvedValue(null),listMyCourses:vi.fn().mockResolvedValue([]),listPublicCourses:vi.fn().mockResolvedValue([]),
    listMyArticles: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
    readMyExperiment: vi.fn().mockResolvedValue(null),
    readSnapshot: vi.fn().mockResolvedValue(null),
    readArticle: vi.fn().mockResolvedValue(null),
    readMyAuthoringOperationReceipt: vi.fn().mockResolvedValue(null),
    saveExperiment: vi.fn(),
    commitSnapshot: vi.fn(),
    publishExperiment: vi.fn().mockResolvedValue(undefined),
    saveArticle: vi.fn().mockImplementation(async ({ article }) => article),
    publishArticle: vi.fn().mockResolvedValue(undefined),
  };
}

function snapshotAnalysisCommandV1(scenarioIds: string[], includeAnalysis: boolean) {
  return { schemaId: STUDIO_AUTHORING_COMMAND_V1_SCHEMA_ID,
    commandId: "a650007a-2aa4-4a91-a824-ae39fd7d6c19", action: "snapshot.analyze" as const,
    input: { snapshotId: "snapshot/analysis", scenarioIds, includeAnalysis } };
}

async function snapshotAnalysisFixtureV1() {
  const preset = CURRENT_MODEL_PRESETS_V1[0]!;
  const methods = resolveRegisteredAnalysisMethodsV1(analysisSurface).periodicPvaDerivation!;
  const record = JSON.parse(await readFile(`data/model-analysis/prepared/${methods.sourceAnalysisId}/${methods.methodId}/${await hash(preset.capture)}.json`, "utf8"));
  const payload = record.analysis as StudioSimulationAnalysisV2;
  const snapshot: ExperimentSnapshotV2 = { schemaId: STUDIO_EXPERIMENT_SNAPSHOT_V2_SCHEMA_ID,
    snapshotId: "snapshot/analysis", surfaceReleaseId: analysisSurface.surfaceReleaseId, createdAt: "2026-09-12T00:00:00.000Z",
    content: { ...contentV1(), modelId: preset.modelId, surfaceSeriesId: analysisSurface.surfaceSeriesId,
      scenarios: [{ scenarioId: "baseline", label: "Baseline", capture: preset.capture }] } };
  const repository = repositoryV1();
  vi.mocked(repository.readSnapshot).mockResolvedValue(snapshot);
  const models = modelsV1();
  vi.mocked(models.resolveAnalysisModel).mockResolvedValue({ modelId: preset.modelId,
    artifactRevisionId: publication.artifactRevisionId, surfaceRelease: analysisSurface });
  const execute = vi.mocked(analysisExecutor.execute).mockReset();
  return { repository, models, snapshot, payload, execute };
}

function modelsV1(
  options: Readonly<{
    periodicPvaSupported?: boolean;
    pressureVolumeGraph?: boolean;
  }> = Object.freeze({}),
): StudioAuthoringModelPortV1 {
  const graphCatalog = options.pressureVolumeGraph === true
    ? [{
        graphId: "graph/pressure-volume",
        renderer: "pressure-volume" as const,
        seriesCatalog: [{
          kind: "pressure-volume" as const,
          seriesId: "LV",
          volumeOutputId: "output/volume/LV",
          pressureOutputId: "output/pressure/LV",
          pressureBasis: "transmural" as const,
          cyclePhaseOutputId: "output/phase",
        }],
        defaultSeriesIds: ["LV"],
      }]
    : [];
  const contract = Object.freeze({
    modelId: "model/example",
    modelFamilyId: "model-family/example",
    displayName: "Example",
    fixtureSchemaId: "fixture/example-v1",
    checkpointCodecId: "checkpoint/example-v1",
    snapshotGateId: "snapshot/example-v1",
    controlCatalog: [],
    outputCatalog: [],
    graphCatalog,
  });
  return {
    resolveAnalysisModel: vi.fn(),
    assessAnalysis: vi.fn(inspectModelAnalysisV1),
    resolveModel: vi.fn().mockResolvedValue(contract),
    resolveActiveNumericalModel: vi.fn(),
    resolveLatestNumericalModel: vi.fn(),
    resolveExactNumericalModel: vi.fn().mockResolvedValue(Object.freeze({
      contract,
      defaultFixture: Object.freeze({}),
      periodicPvaSupported: options.periodicPvaSupported ?? true,
      runtime: null as never,
      surfaceReleaseId: "surface-release/example",
      surfaceSeriesId: "surface-series/example",
    })),
    prepareSurface: vi.fn(),
  };
}

function pressureVolumeSurfaceV1(
  pressureVolumeAnalysisMode: "raw-exact-orbit" | "formal-periodic",
  showPressureEnvelope?: boolean,
) {
  return {
    graphPanes: [{
      paneId: "pane/pv",
      role: "graph" as const,
      label: "PV loop",
      order: 0,
      priority: 100,
      graphId: "graph/pressure-volume",
      scenarioScope: { mode: "visible-scenarios" as const },
      excludedTraces: [],
      historyDepth: 1,
      pressureVolumeAnalysisMode,
      ...(showPressureEnvelope === undefined ? {} : { showPressureEnvelope }),
      series: [{ seriesId: "LV", label: "LV", order: 0 }],
    }],
    outputPanes: [],
    controlPanes: [],
    note: { text: "" },
  };
}

function contentV1() {
  return {
    modelId: "model/example",
    surfaceSeriesId: "surface-series/example",
    scenarios: [{
      scenarioId: "scenario/baseline",
      label: "Baseline",
      capture: {
        fixture: {},
        checkpoint: {
          acceptedRevision: 1,
          acceptedTimeSec: 0.002,
          payload: {},
        },
      },
    }],
    surface: {
      graphPanes: [],
      outputPanes: [],
      controlPanes: [],
      note: { text: "" },
    },
  };
}


describe("Article comparison placement", () => {
  const selection: StudioArticleBriefingSelectionV1 = {
    title: "Compare filling", visibleScenarioIds: ["baseline", "loaded"], initialFocusScenarioId: "loaded",
    graphPaneIds: [], outputIds: null, controlIds: null,
    outputScenarioMode: "each-visible", controlBindingMode: "reader-focus",
  };
  function snapshot(): ExperimentSnapshotV2 {
    const output = { paneId: "output/active", role: "output" as const, label: "Flow", order: 0, priority: 1,
      binding: { mode: "active-slot" as const }, items: [{ outputId: "sv", label: "SV", order: 0 }, { outputId: "lap", label: "LAP", order: 1 }] };
    const control = { paneId: "control/active", role: "control" as const, label: "Volume", order: 0, priority: 1,
      binding: { mode: "active-slot" as const }, items: [{ controlId: "tbv", label: "TBV", order: 0, presentation: { kind: "slider" as const } }] };
    return { schemaId: STUDIO_EXPERIMENT_SNAPSHOT_V2_SCHEMA_ID, snapshotId: "snapshot/compare", surfaceReleaseId: "surface/1", createdAt: "2026-09-12T00:00:00Z",
      content: { modelId: "model/1", surfaceSeriesId: "surface", scenarios: ["baseline", "loaded", "hidden"].map(scenarioId => ({ scenarioId, label: scenarioId,
        capture: { fixture: {}, checkpoint: { acceptedRevision: 1, acceptedTimeSec: .002, payload: {} } } })),
        surface: { graphPanes: [], note: { text: "" },
          outputPanes: [output, { ...output, paneId: "output/fixed", order: 1, binding: { mode: "fixed", scenarioId: "baseline" } }],
          controlPanes: [control, { ...control, paneId: "control/fixed", order: 1, binding: { mode: "fixed", scenarioIds: ["baseline", "hidden"] } }] } } };
  }

  it("expands active outputs across visible scenarios while retaining fixed source scopes", () => {
    const s = snapshot(); const before = JSON.stringify(s); const b = createStudioArticleBriefingV1(s, selection);
    expect(b.outputs.map(o => [o.sourcePaneId, o.outputId, o.scenarioId, o.order])).toEqual([
      ["output/active", "sv", "baseline", 0], ["output/active", "sv", "loaded", 1],
      ["output/active", "lap", "baseline", 2], ["output/active", "lap", "loaded", 3],
      ["output/fixed", "sv", "baseline", 4], ["output/fixed", "lap", "baseline", 5],
    ]);
    expect(b.controls.map(c => c.binding)).toEqual([
      { mode: "reader-focus", allowedScenarioIds: ["baseline", "loaded"] },
      { mode: "reader-focus", allowedScenarioIds: ["baseline"] },
    ]);
    expect(JSON.stringify(s)).toBe(before);
  });
  it("materializes source-fixed active slots at the explicit initial focus", () => {
    const b = createStudioArticleBriefingV1(snapshot(), { ...selection, outputScenarioMode: "source-fixed", controlBindingMode: "source-fixed" });
    expect(b.outputs.map(o => o.scenarioId)).toEqual(["loaded", "loaded", "baseline", "baseline"]);
    expect(b.controls.map(c => c.binding)).toEqual([
      { mode: "fixed", scenarioIds: ["loaded"], application: "absolute" },
      { mode: "fixed", scenarioIds: ["baseline"], application: "absolute" },
    ]);
  });
  it("omits hidden fixed scopes instead of silently retargeting them", () => {
    const b = createStudioArticleBriefingV1(snapshot(), { ...selection, visibleScenarioIds: ["loaded"] });
    expect(b.outputs.map(o => o.sourcePaneId)).toEqual(["output/active", "output/active"]);
    expect(b.controls.map(c => c.sourcePaneId)).toEqual(["control/active"]);
    expect(() => createStudioArticleBriefingV1(snapshot(), { ...selection, outputIds: ["missing"] })).toThrow(/unavailable output/);
  });
  it("requires explicit projection choices and advertises exactly the accepted enums", () => {
    const schema = describeStudioAuthoringProtocolV1("article.briefing.place").actions[0]!.inputSchema as any;
    const command = { schemaId: "circleheart-studio-authoring-command-v1", commandId: "c42363ce-3ad5-4c5c-a3dd-28cbe4c21e91", action: "article.briefing.place",
      input: { articleId: "article/1", expectedVersion: 1, snapshotId: "snapshot/compare", selection, target: { mode: "append" } } };
    expect(schema.properties.selection.required).toContain("outputScenarioMode");
    expect(schema.properties.selection.required).toContain("controlBindingMode");
    for (const outputScenarioMode of schema.properties.selection.properties.outputScenarioMode.enum) {
      for (const controlBindingMode of schema.properties.selection.properties.controlBindingMode.enum) {
        expect(validateStudioAuthoringCommandV1({ ...command, input: { ...command.input, selection: { ...selection, outputScenarioMode, controlBindingMode } } }).action).toBe("article.briefing.place");
      }
    }
    for (const patch of [{ outputScenarioMode: "all" }, { controlBindingMode: "relative" }, { outputScenarioMode: undefined }]) {
      expect(() => validateStudioAuthoringCommandV1({ ...command, input: { ...command.input, selection: { ...selection, ...patch } } })).toThrow();
    }
  });
});

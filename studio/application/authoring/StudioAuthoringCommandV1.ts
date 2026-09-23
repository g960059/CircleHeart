import { validateCourseContentV1, type CourseContentV1, type CourseDraftV1 } from "@/studio/application/course/StudioCourseV1";
import {
  STUDIO_GRAPH_HISTORY_MAX_DEPTH_V2, STUDIO_GRAPH_HISTORY_MIN_DEPTH_V2,
  STUDIO_PV_TRAIL_MAX_BEATS_V2,
  STUDIO_SWEEP_WINDOW_MAX_SEC_V2, STUDIO_SWEEP_WINDOW_MIN_SEC_V2, STUDIO_SWEEP_WINDOW_STEP_SEC_V2,
} from "@/studio/contracts/v2/content";
import { assertStudioAuthoringTraceSamplingV1, traceStudioExperimentV1, type StudioAuthoringTraceInputV1 } from "./StudioAuthoringTraceV1";
import {
  analyzeStudioSnapshotV1, type StudioSnapshotAnalysisInputV1,
  type StudioSnapshotAnalysisModelPortV1, type StudioSnapshotAnalysisProgressV1,
} from "./StudioSnapshotAnalysisV1";
import {
  validateStudioArticleDraftV2,
} from "@/studio/application/authoring/StudioArticleDataV2";
import {
  STUDIO_ARTICLE_TAG_LIMIT_V1,
  STUDIO_ARTICLE_TAG_MAX_LENGTH_V1,
} from "@/studio/application/article/StudioArticleTagsV1";
import {
  assertExperimentBriefingMatchesModelV2,
  assertExperimentContentMatchesModelV2,
  assertExperimentContentMatchesModelSurfaceCapabilitiesV2,
  validateExperimentPlacementAgainstSnapshotV2,
  validateExperimentContentV2,
} from "@/studio/application/authoring/StudioExperimentDataV2";
import {
  applyStudioExperimentPlanV1,
  assertStudioAuthoringTimeAdvanceV1,
  STUDIO_AUTHORING_MAX_PRESENTATION_STEPS_V1,
  assertStudioAuthoringResolvedNumericalModelMatchesPinV1,
  previewStudioExperimentPlanV1,
  sealStudioExperimentSnapshotV1,
  STUDIO_EXPERIMENT_APPLY_PLAN_V1_SCHEMA_ID,
  type StudioAuthoringControlAssignmentV1,
  type StudioAuthoringExactModelPinV1,
  type StudioAuthoringExecutionBudgetV1,
  type StudioAuthoringNumericalModelPortV1,
  type StudioAuthoringPresentationSpecV1,
  type StudioAuthoringScenarioOperationV1,
  type StudioExperimentApplyPlanV1,
} from "@/studio/application/authoring/StudioNumericalAuthoringV1";
import {
  placeStudioArticleBriefingV1,
  type StudioArticleBriefingPlacementTargetV1,
  type StudioArticleBriefingSelectionV1,
} from "@/studio/application/authoring/StudioArticleBriefingPlacementV1";
import type {
  StudioAdmittedSnapshotCommitV1,
} from "@/studio/application/authoring/StudioAdmittedSnapshotCommitV1";
import type {
  StudioArticleBlockV2,
  StudioArticleDraftV2,
} from "@/studio/contracts/v2/article";
import type {
  ExperimentSnapshotV2,
  ExperimentSurfaceV2,
  ExperimentV2,
} from "@/studio/contracts/v2/content";
import type { ModelContractV2 } from "@/studio/contracts/v2/model";
import {
  assertPortableStudioJsonObjectV2,
} from "@/studio/contracts/v2/model";
export const STUDIO_AUTHORING_COMMAND_V1_SCHEMA_ID =
  "circleheart-studio-authoring-command-v1" as const;
export const STUDIO_AUTHORING_PROTOCOL_DESCRIPTION_V1_SCHEMA_ID =
  "circleheart-studio-authoring-protocol-description-v1" as const;

type StudioAuthoringListActionV1 =
  "experiment.list" | "snapshot.list" | "article.list";
export type StudioAuthoringListCursorV1 = Readonly<{
  timestamp: string;
  id: string;
}>;
type StudioAuthoringListRequestV1 = Readonly<{
  limit: number;
  cursor: StudioAuthoringListCursorV1 | null;
}>;
export type StudioAuthoringArticleBlockOperationV1 =
  | Readonly<{
      operation: "replace";
      blockId: string;
      block: StudioArticleBlockV2;
    }>
  | Readonly<{
      operation: "insert-after";
      blockId: string;
      block: StudioArticleBlockV2;
    }>
  | Readonly<{
      operation: "remove";
      blockId: string;
    }>;

export type StudioAuthoringCommandV1 =
  | Readonly<{schemaId:typeof STUDIO_AUTHORING_COMMAND_V1_SCHEMA_ID;commandId:string;action:"course.delete";input:{courseId:string;expectedVersion:number}}>
  | Readonly<{ schemaId: typeof STUDIO_AUTHORING_COMMAND_V1_SCHEMA_ID; commandId:string; action:"course.save"; input:{courseId:string|null;expectedVersion:number|null;content:CourseContentV1} }>
  | Readonly<{ schemaId: typeof STUDIO_AUTHORING_COMMAND_V1_SCHEMA_ID; commandId:string; action:"course.publish"; input:{courseId:string;expectedVersion:number;publish:boolean} }>
  | Readonly<{ schemaId: typeof STUDIO_AUTHORING_COMMAND_V1_SCHEMA_ID; commandId:string; action:"course.read"; input:{courseId:string;scope:"mine"|"public"} }>
  | Readonly<{ schemaId: typeof STUDIO_AUTHORING_COMMAND_V1_SCHEMA_ID; commandId:string; action:"course.list"; input:{locale:"ja"|"en";scope:"mine"|"public"|"featured";offset:number} }>
  | Readonly<{
      schemaId: typeof STUDIO_AUTHORING_COMMAND_V1_SCHEMA_ID;
      commandId: string;
      action: "snapshot.analyze";
      input: StudioSnapshotAnalysisInputV1;
    }>
  | Readonly<{
      schemaId: typeof STUDIO_AUTHORING_COMMAND_V1_SCHEMA_ID;
      commandId: string;
      action: "experiment.trace";
      input: StudioAuthoringTraceInputV1;
    }>
  | Readonly<{
      schemaId: typeof STUDIO_AUTHORING_COMMAND_V1_SCHEMA_ID;
      commandId: string;
      action: StudioAuthoringListActionV1;
      input: StudioAuthoringListRequestV1;
    }>
  | Readonly<{
      schemaId: typeof STUDIO_AUTHORING_COMMAND_V1_SCHEMA_ID;
      commandId: string;
      action: "experiment.read";
      input: Readonly<{ experimentId: string }>;
    }>
  | Readonly<{
      schemaId: typeof STUDIO_AUTHORING_COMMAND_V1_SCHEMA_ID;
      commandId: string;
      action: "snapshot.read";
      input: Readonly<{ snapshotId: string }>;
    }>
  | Readonly<{
      schemaId: typeof STUDIO_AUTHORING_COMMAND_V1_SCHEMA_ID;
      commandId: string;
      action: "article.read";
      input: Readonly<{ articleId: string }>;
    }>
  | Readonly<{
      schemaId: typeof STUDIO_AUTHORING_COMMAND_V1_SCHEMA_ID;
      commandId: string;
      action: "operation.read";
      input: Readonly<{ operationId: string }>;
    }>
  | Readonly<{
      schemaId: typeof STUDIO_AUTHORING_COMMAND_V1_SCHEMA_ID;
      commandId: string;
      action: "model.describe";
      input: Readonly<{ experimentId: string | null }>;
    }>
  | Readonly<{
      schemaId: typeof STUDIO_AUTHORING_COMMAND_V1_SCHEMA_ID;
      commandId: string;
      action: "experiment.preview";
      input: Readonly<{
        experimentId: string | null;
        expectedVersion: number | null;
        title: string;
        scenarioOperations: readonly StudioAuthoringScenarioOperationV1[];
        presentation: StudioAuthoringPresentationSpecV1;
        executionBudget: StudioAuthoringExecutionBudgetV1;
        observeOutputIds: readonly string[] | null;
      }>;
    }>
  | Readonly<{
      schemaId: typeof STUDIO_AUTHORING_COMMAND_V1_SCHEMA_ID;
      commandId: string;
      action: "experiment.apply";
      input: Readonly<{ plan: StudioExperimentApplyPlanV1 }>;
    }>
  | Readonly<{
      schemaId: typeof STUDIO_AUTHORING_COMMAND_V1_SCHEMA_ID;
      commandId: string;
      action: "experiment.presentation.save";
      input: Readonly<{
        experimentId: string;
        expectedVersion: number;
        surfaceReleaseId: string;
        title: string;
        surface: ExperimentSurfaceV2;
      }>;
    }>
  | Readonly<{
      schemaId: typeof STUDIO_AUTHORING_COMMAND_V1_SCHEMA_ID;
      commandId: string;
      action: "snapshot.seal";
      input: Readonly<{
        experimentId: string;
        expectedVersion: number;
        exactModel: StudioAuthoringExactModelPinV1;
        createdAt: string;
        observeOutputIds: readonly string[] | null;
      }>;
    }>
  | Readonly<{
      schemaId: typeof STUDIO_AUTHORING_COMMAND_V1_SCHEMA_ID;
      commandId: string;
      action: "article.briefing.place";
      input: Readonly<{
        articleId: string;
        expectedVersion: number;
        snapshotId: string;
        selection: StudioArticleBriefingSelectionV1;
        target: StudioArticleBriefingPlacementTargetV1;
      }>;
    }>
  | Readonly<{
      schemaId: typeof STUDIO_AUTHORING_COMMAND_V1_SCHEMA_ID;
      commandId: string;
      action: "article.blocks.patch";
      input: Readonly<{
        articleId: string;
        expectedVersion: number;
        title: string | null;
        operations: readonly StudioAuthoringArticleBlockOperationV1[];
      }>;
    }>
  | Readonly<{
      schemaId: typeof STUDIO_AUTHORING_COMMAND_V1_SCHEMA_ID;
      commandId: string;
      action: "experiment.publish";
      input: Readonly<{
        experimentId: string;
        expectedVersion: number;
        snapshotId: string;
        publicSlug: string;
      }>;
    }>
  | Readonly<{
      schemaId: typeof STUDIO_AUTHORING_COMMAND_V1_SCHEMA_ID;
      commandId: string;
      action: "article.save";
      input: Readonly<{
        articleId: string | null;
        expectedVersion: number | null;
        article: StudioArticleDraftV2;
      }>;
    }>
  | Readonly<{
      schemaId: typeof STUDIO_AUTHORING_COMMAND_V1_SCHEMA_ID;
      commandId: string;
      action: "article.publish";
      input: Readonly<{
        articleId: string;
        expectedVersion: number;
        publicSlug: string;
      }>;
    }>;

export type StudioAuthoringOperationReceiptV1 = Readonly<{
  operationId: string;
  operationKind: string;
  status: "running" | "committed";
  result: Readonly<Record<string, unknown>> | null;
  createdAt: string;
  completedAt: string | null;
}>;

export interface StudioAuthoringRepositoryPortV1 {
  deleteCourse(input:{courseId:string;expectedVersion:number}):Promise<void>;
  saveCourse(input:{courseId:string|null;expectedVersion:number|null;content:CourseContentV1}):Promise<CourseDraftV1>;
  publishCourse(input:{courseId:string;expectedVersion:number;publish:boolean}):Promise<CourseDraftV1>;
  readMyCourse(id:string):Promise<CourseDraftV1|null>;
  readPublicCourse(id:string):Promise<unknown>;
  listMyCourses(input:{locale?:string;offset?:number}):Promise<unknown>;
  listPublicCourses(input:{locale?:string;featured?:boolean;offset?:number}):Promise<unknown>;
  listMyExperiments(request: StudioAuthoringListRequestV1): Promise<unknown>;
  listMySnapshots(request: StudioAuthoringListRequestV1): Promise<unknown>;
  listMyArticles(request: StudioAuthoringListRequestV1): Promise<unknown>;
  readMyExperiment(experimentId: string): Promise<Readonly<{
    experiment: ExperimentV2;
    title: string;
  }> | null>;
  readSnapshot(snapshotId: string): Promise<ExperimentSnapshotV2 | null>;
  readArticle(articleId: string): Promise<StudioArticleDraftV2 | null>;
  readMyAuthoringOperationReceipt(operationId: string):
    Promise<StudioAuthoringOperationReceiptV1 | null>;
  saveExperiment(input: Readonly<{
    experimentId: string | null;
    expectedVersion: number | null;
    title: string;
    content: ExperimentV2["content"];
  }>): Promise<ExperimentV2>;
  commitSnapshot(input: Readonly<{
    admitted: StudioAdmittedSnapshotCommitV1;
    sourceExperiment?: Readonly<{
      experimentId: string;
      expectedVersion: number;
    }>;
  }>): Promise<ExperimentSnapshotV2>;
  publishExperiment(input: Readonly<{
    experimentId: string;
    expectedVersion: number;
    snapshotId: string;
    publicSlug: string;
  }>): Promise<void>;
  saveArticle(input: Readonly<{
    articleId: string | null;
    expectedVersion: number | null;
    article: StudioArticleDraftV2;
  }>): Promise<StudioArticleDraftV2>;
  publishArticle(input: Readonly<{
    articleId: string;
    expectedVersion: number;
    publicSlug: string;
  }>): Promise<void>;
}

export interface StudioAuthoringModelPortV1
  extends StudioAuthoringNumericalModelPortV1, StudioSnapshotAnalysisModelPortV1 {
  resolveModel(input: StudioAuthoringExactModelPinV1): Promise<ModelContractV2>;
}

export interface StudioAuthoringPolicyPortV1 {
  authorize(command: StudioAuthoringCommandV1): Promise<void> | void;
}

export const ALLOW_STUDIO_AUTHORING_POLICY_V1: StudioAuthoringPolicyPortV1 =
  Object.freeze({ authorize: () => undefined });

/** Machine discovery document. `inputSchema` is JSON Schema, never prose. */
export function describeStudioAuthoringProtocolV1(selectedAction?: string): Readonly<{
  schemaId: typeof STUDIO_AUTHORING_PROTOCOL_DESCRIPTION_V1_SCHEMA_ID;
  jsonSchemaDialect: "https://json-schema.org/draft/2020-12/schema";
  commandSchemaId: typeof STUDIO_AUTHORING_COMMAND_V1_SCHEMA_ID;
  protocol: Readonly<Record<string, unknown>>;
  envelopes: Readonly<{
    command: Readonly<Record<string, unknown>>;
    success: Readonly<Record<string, unknown>>;
    error: Readonly<Record<string, unknown>>;
  }>;
  actions: readonly Readonly<{
    action: StudioAuthoringCommandV1["action"];
    mutation: boolean;
    inputSchema: Readonly<Record<string, unknown>>;
    resultSchema: Readonly<Record<string, unknown>>;
  }>[];
}> {
  const object = (
    required: readonly string[],
    properties: Readonly<Record<string, unknown>>,
  ) => Object.freeze({
    type: "object",
    additionalProperties: false,
    required,
    properties,
  });
  const id = Object.freeze({ type: "string", minLength: 1 });
  const publicSlug = Object.freeze({
    type: "string",
    minLength: 3,
    maxLength: 96,
    pattern: "^[a-z0-9][a-z0-9-]{2,95}$",
    not: {
      pattern: "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
    },
  });
  const nullableId = Object.freeze({ type: ["string", "null"], minLength: 1 });
  const version = Object.freeze({ type: "integer", minimum: 0 });
  const nullableVersion = Object.freeze({ type: ["integer", "null"], minimum: 0 });
  const uuid = Object.freeze({ type: "string", format: "uuid" });
  const nullableUuid = Object.freeze({ type: ["string", "null"], format: "uuid" });
  const bool = Object.freeze({ type: "boolean" });
  const finiteNumber = Object.freeze({ type: "number" });
  const stringArray = Object.freeze({
    type: "array", items: id, uniqueItems: true,
  });
  const nullableStringArray = Object.freeze({
    oneOf: [stringArray, { type: "null" }],
  });
  const controlAssignment = object(["controlId", "value"], {
    controlId: id,
    value: finiteNumber,
  });
  const controlAssignments = Object.freeze({
    type: "array", items: controlAssignment,
  });
  const scenarioOperation = Object.freeze({ oneOf: [
    object(["controls", "label", "operation", "scenarioId", "sourceScenarioId"], {
      operation: { const: "add" }, scenarioId: id, label: id,
      sourceScenarioId: nullableId, controls: controlAssignments,
    }),
    object(["controls", "label", "operation", "scenarioId"], {
      operation: { const: "update" }, scenarioId: id, label: nullableId,
      controls: controlAssignments,
    }),
    object(["operation", "scenarioId"], {
      operation: { const: "remove" }, scenarioId: id,
    }),
    object(["operation", "scenarioId"], {
      operation: { const: "advance" }, scenarioId: id,
    }),
  ] });
  const scenarioOperations = Object.freeze({
    type: "array", minItems: 1, items: scenarioOperation,
  });
  const presentation = object(["mode", "note"], {
    mode: { enum: ["default", "preserve"] },
    note: { type: "string", maxLength: 20_000 },
  });
  const executionBudget = object(
    ["advanceSeconds", "maxPresentationSteps", "wallClockTimeoutMs"],
    {
      advanceSeconds: { type: "number", minimum: 0, maximum: 120 },
      maxPresentationSteps: { type: "integer", minimum: 1, maximum: STUDIO_AUTHORING_MAX_PRESENTATION_STEPS_V1 },
      wallClockTimeoutMs: { type: "integer", minimum: 1_000, maximum: 600_000 },
    },
  );
  const exactModel = object(
    ["modelId", "surfaceSeriesId", "surfaceReleaseId"],
    { modelId: id, surfaceSeriesId: id, surfaceReleaseId: id },
  );
  const scalarGraphSeries = object(["kind", "outputId", "seriesId"], {
    kind: { const: "scalar" }, seriesId: id, outputId: id,
  });
  const pressureVolumeGraphSeries = object([
    "cyclePhaseOutputId", "kind", "pressureBasis", "pressureOutputId",
    "seriesId", "volumeOutputId",
  ], {
    kind: { const: "pressure-volume" },
    seriesId: id,
    volumeOutputId: id,
    pressureOutputId: id,
    pressureBasis: { enum: ["transmural", "intracavitary"] },
    cyclePhaseOutputId: id,
  });
  const graphDefinition = Object.freeze({ oneOf: [
    object(["defaultSeriesIds", "graphId", "renderer", "seriesCatalog"], {
      graphId: id,
      renderer: { const: "sweep" },
      seriesCatalog: { type: "array", items: scalarGraphSeries },
      defaultSeriesIds: stringArray,
    }),
    object(["defaultSeriesIds", "graphId", "renderer", "seriesCatalog"], {
      graphId: id,
      renderer: { const: "pressure-volume" },
      seriesCatalog: { type: "array", items: pressureVolumeGraphSeries },
      defaultSeriesIds: stringArray,
    }),
    object(["analysisId", "graphId", "renderer", "side"], {
      graphId: id,
      renderer: { const: "structural-return" },
      analysisId: id,
      side: { enum: ["left", "right", "both"] },
    }),
    object(["derivationId", "graphId", "renderer"], {
      graphId: id, renderer: { const: "cycle-waveform" }, derivationId: id,
    }),
  ] });
  const outputDefinition = Object.freeze({ oneOf: [
    object(["kind", "outputId", "sampling", "shape", "unit"], {
      outputId: id,
      kind: { const: "signal" },
      unit: { type: "string" },
      shape: { enum: ["scalar", "vector"] },
      sampling: { enum: ["accepted-step", "event"] },
    }),
    object(["dependencies", "kind", "outputId", "scope", "shape", "unit"], {
      outputId: id,
      kind: { const: "metric" },
      unit: { type: "string" },
      shape: { enum: ["scalar", "vector"] },
      scope: { enum: ["instant", "beat", "window"] },
      dependencies: stringArray,
    }),
  ] });
  const modelContract = object([
    "checkpointCodecId", "controlCatalog", "displayName", "fixtureSchemaId",
    "graphCatalog", "modelFamilyId", "modelId", "outputCatalog", "snapshotGateId",
  ], {
    modelId: id,
    modelFamilyId: id,
    displayName: id,
    fixtureSchemaId: id,
    checkpointCodecId: id,
    snapshotGateId: id,
    controlCatalog: { type: "array", items: object([
      "changeSemantics", "controlId", "defaultValue", "maximum", "minimum",
      "step", "unit", "valueType",
    ], {
      controlId: id,
      valueType: { const: "number" },
      unit: { type: "string" },
      minimum: finiteNumber,
      maximum: finiteNumber,
      step: finiteNumber,
      defaultValue: finiteNumber,
      changeSemantics: {
        enum: ["accepted-state-warm-start", "cold-restart"],
      },
    }) },
    outputCatalog: { type: "array", items: outputDefinition },
    graphCatalog: { type: "array", items: graphDefinition },
  });
  const graphScenarioScope = Object.freeze({ oneOf: [
    object(["mode"], { mode: { const: "visible-scenarios" } }),
    object(["mode", "scenarioIds"], {
      mode: { const: "fixed" }, scenarioIds: stringArray,
    }),
  ] });
  const sweepWindow = { type: "number", minimum: STUDIO_SWEEP_WINDOW_MIN_SEC_V2,
    maximum: STUDIO_SWEEP_WINDOW_MAX_SEC_V2, multipleOf: STUDIO_SWEEP_WINDOW_STEP_SEC_V2 };
  const historyDepth = { type: "integer", minimum: STUDIO_GRAPH_HISTORY_MIN_DEPTH_V2,
    maximum: STUDIO_GRAPH_HISTORY_MAX_DEPTH_V2 };
  const pvTrailBeats = { type: "integer", minimum: 0, maximum: STUDIO_PV_TRAIL_MAX_BEATS_V2 };
  const graphPane = object([
    "excludedTraces", "graphId", "label", "order", "paneId", "priority",
    "role", "scenarioScope", "series",
  ], {
    paneId: id,
    role: { const: "graph" },
    label: id,
    order: version,
    priority: version,
    graphId: id,
    scenarioScope: graphScenarioScope,
    excludedTraces: { type: "array", items: object(["scenarioId", "seriesId"], {
      scenarioId: id, seriesId: nullableId,
    }) },
    windowSec: sweepWindow,
    axisRanges: object([], {
      x: object(["minimum", "maximum"], { minimum: finiteNumber, maximum: finiteNumber }),
      y: object(["minimum", "maximum"], { minimum: finiteNumber, maximum: finiteNumber }),
    }),
    historyDepth,
    pvTrailBeats,
    pressureVolumeAnalysisMode: {
      enum: ["raw-exact-orbit", "responsive-preview", "formal-periodic"],
    },
    showPressureEnvelope: { type: "boolean" },
    showPvaBoundary: { type: "boolean" },
    structuralSide: { enum: ["left", "right"] },
    traceColors: { type: "array", items: object([
      "automaticColorHex", "scenarioId", "seriesId",
    ], {
      scenarioId: id,
      seriesId: nullableId,
      automaticColorHex: { type: "string", pattern: "^#[0-9A-Fa-f]{6}$" },
      customColorHex: { type: "string", pattern: "^#[0-9A-Fa-f]{6}$" },
    }) },
    series: { type: "array", items: object(["label", "order", "seriesId"], {
      seriesId: id, label: id, order: version,
    }) },
  });
  const outputPaneBinding = Object.freeze({ oneOf: [
    object(["mode"], { mode: { const: "active-slot" } }),
    object(["mode", "scenarioId"], {
      mode: { const: "fixed" }, scenarioId: id,
    }),
  ] });
  const outputPane = object([
    "binding", "items", "label", "order", "paneId", "priority", "role",
  ], {
    paneId: id,
    role: { const: "output" },
    label: id,
    order: version,
    priority: version,
    binding: outputPaneBinding,
    items: { type: "array", items: object(["label", "order", "outputId"], {
      outputId: id, label: id, order: version,
    }) },
  });
  const controlPresentation = Object.freeze({ oneOf: [
    object(["kind"], { kind: { const: "slider" } }),
    object(["kind", "options"], {
      kind: { const: "buttons" },
      options: { type: "array", items: object(["label", "value"], {
        label: id, value: finiteNumber,
      }) },
    }),
  ] });
  const controlPaneBinding = Object.freeze({ oneOf: [
    object(["mode"], { mode: { const: "active-slot" } }),
    object(["mode", "scenarioIds"], {
      mode: { const: "fixed" }, scenarioIds: stringArray,
    }),
  ] });
  const controlPane = object([
    "binding", "items", "label", "order", "paneId", "priority", "role",
  ], {
    paneId: id,
    role: { const: "control" },
    label: id,
    order: version,
    priority: version,
    binding: controlPaneBinding,
    items: { type: "array", items: object([
      "controlId", "label", "order", "presentation",
    ], {
      controlId: id, label: id, order: version, presentation: controlPresentation,
    }) },
  });
  const experimentSurface = object(["controlPanes", "graphPanes", "note", "outputPanes"], {
    scenarioColorSeeds: { type: "array", items: object(["colorHex", "scenarioId"], {
      scenarioId: id, colorHex: { type: "string", pattern: "^#[0-9A-Fa-f]{6}$" },
    }) },
    graphPanes: { type: "array", items: graphPane },
    outputPanes: { type: "array", items: outputPane },
    controlPanes: { type: "array", items: controlPane },
    note: object(["text"], { text: { type: "string" } }),
  });
  const opaquePortableJson = Object.freeze({
    description: "Model-owned portable JSON validated by the exact-model adapter",
  });
  const scenarioCapture = object(["checkpoint", "fixture"], {
    fixture: opaquePortableJson,
    checkpoint: object(["acceptedRevision", "acceptedTimeSec", "payload"], {
      acceptedRevision: version,
      acceptedTimeSec: { type: "number", minimum: 0 },
      payload: opaquePortableJson,
    }),
  });
  const experimentScenario = object(["capture", "label", "scenarioId"], {
    scenarioId: id, label: id, capture: scenarioCapture,
  });
  const experimentContent = object([
    "modelId", "scenarios", "surface", "surfaceSeriesId",
  ], {
    modelId: id,
    surfaceSeriesId: id,
    scenarios: { type: "array", items: experimentScenario },
    surface: experimentSurface,
  });
  const experiment = object([
    "content", "experimentId", "schemaId", "version",
  ], {
    schemaId: { const: "circleheart-studio-experiment-v2" },
    experimentId: uuid,
    version,
    content: experimentContent,
  });
  const snapshot = object([
    "content", "createdAt", "schemaId", "snapshotId", "surfaceReleaseId",
  ], {
    schemaId: { const: "circleheart-studio-experiment-snapshot-v2" },
    snapshotId: uuid,
    surfaceReleaseId: id,
    content: experimentContent,
    createdAt: { type: "string", format: "date-time" },
    createdBy: uuid,
  });
  const briefingGraphSeries = object(["label", "order", "seriesId"], {
    seriesId: id, label: id, order: version,
  });
  const briefingGraph = object(["emphasis", "order", "paneId"], {
    paneId: id,
    order: version,
    emphasis: { enum: ["primary", "supporting"] },
    overrides: object([], {
      label: id,
      legend: { enum: ["auto", "hidden", "compact", "full"] },
      series: { type: "array", items: briefingGraphSeries },
      traceColors: { type: "array", items: object([
        "colorHex", "scenarioId", "seriesId",
      ], {
        scenarioId: id,
        seriesId: nullableId,
        colorHex: { type: "string", pattern: "^#[0-9A-Fa-f]{6}$" },
      }) },
      windowSec: sweepWindow,
      historyDepth,
      pvTrailBeats,
    }),
  });
  const briefingOutput = object([
    "label", "order", "outputId", "scenarioId", "sourcePaneId",
  ], {
    sourcePaneId: id, outputId: id, scenarioId: id, label: id, order: version,
  });
  const briefingControlBinding = Object.freeze({ oneOf: [
    object(["allowedScenarioIds", "mode"], {
      mode: { const: "reader-focus" }, allowedScenarioIds: stringArray,
    }),
    object(["application", "mode", "scenarioIds"], {
      mode: { const: "fixed" },
      scenarioIds: stringArray,
      application: { const: "absolute" },
    }),
  ] });
  const briefingControl = object([
    "binding", "controlId", "label", "order", "presentation", "sourcePaneId",
  ], {
    sourcePaneId: id,
    controlId: id,
    label: id,
    order: version,
    presentation: controlPresentation,
    binding: briefingControlBinding,
  });
  const placementBriefing = object([
    "controls", "defaultTitle", "graphs", "outputs", "scenarioScope",
  ], {
    defaultTitle: id,
    scenarioScope: object(["initialFocusScenarioId", "visibleScenarioIds"], {
      visibleScenarioIds: stringArray, initialFocusScenarioId: id,
    }),
    graphs: { type: "array", items: briefingGraph },
    outputs: { type: "array", items: briefingOutput },
    controls: { type: "array", items: briefingControl },
  });
  const experimentPlacement = object([
    "briefing", "caption", "placementId", "schemaId", "snapshotId", "titleOverride",
  ], {
    schemaId: { const: "circleheart-studio-experiment-placement-v2" },
    placementId: id,
    snapshotId: uuid,
    briefing: placementBriefing,
    titleOverride: { type: ["string", "null"] },
    caption: { type: ["string", "null"] },
  });
  const experimentPlanRequired = [
    "baseScenarioIds", "exactModel", "executionBudget", "expectedVersion",
    "experimentId", "observeOutputIds", "planDigest", "presentation",
    "scenarioOperations", "schemaId", "title",
  ] as const;
  const experimentPlanBase = {
    schemaId: { const: STUDIO_EXPERIMENT_APPLY_PLAN_V1_SCHEMA_ID },
    planDigest: { type: "string", pattern: "^[0-9a-f]{64}$" },
    exactModel,
    baseScenarioIds: stringArray,
    title: id,
    scenarioOperations,
    presentation,
    executionBudget,
    observeOutputIds: nullableStringArray,
  };
  const experimentPlan = Object.freeze({ oneOf: [
    object(experimentPlanRequired, {
      ...experimentPlanBase,
      experimentId: { const: null },
      expectedVersion: { const: null },
    }),
    object(experimentPlanRequired, {
      ...experimentPlanBase,
      experimentId: id,
      expectedVersion: version,
    }),
  ] });
  const briefingSelection = object([
    "controlIds", "graphPaneIds", "initialFocusScenarioId", "outputIds",
    "title", "visibleScenarioIds", "outputScenarioMode", "controlBindingMode",
  ], {
    title: id,
    visibleScenarioIds: nullableStringArray,
    initialFocusScenarioId: nullableId,
    graphPaneIds: nullableStringArray,
    outputIds: nullableStringArray,
    controlIds: nullableStringArray,
    outputScenarioMode: { enum: ["source-fixed", "each-visible"] },
    controlBindingMode: { enum: ["source-fixed", "reader-focus"] },
  });
  const briefingTarget = Object.freeze({ oneOf: [
    object(["mode"], { mode: { const: "append" } }),
    object(["blockId", "mode"], { mode: { const: "replace" }, blockId: id }),
    object(["blockId", "mode"], { mode: { const: "insert-after" }, blockId: id }),
  ] });
  const articleQuizChoice = object(["choiceId", "label"], {
    choiceId: id,
    label: { type: "string", maxLength: 1_000 },
  });
  const articleOptionalImageUrl = { oneOf: [
    { const: "" },
    { type: "string", format: "uri", maxLength: 4_096,
      pattern: "^(?:https://|http://(?:localhost|127\\.0\\.0\\.1)(?=[:/?#]|$))" },
  ] };
  const articleLinkBlock = object([
    "blockId", "description", "href", "kind", "label",
  ], {
    blockId: id,
    kind: { const: "link" },
    href: { oneOf: [
      { const: "" },
      {
        type: "string",
        maxLength: 4_096,
        pattern: String.raw`^/(?!/)(?!.*[\\\u0000-\u001F\u007F])`,
      },
      {
        type: "string",
        format: "uri",
        maxLength: 4_096,
        pattern: "^(?:https://|http://(?:localhost|127\\.0\\.0\\.1)(?=[:/?#]|$))",
      },
    ] },
    label: { type: "string", maxLength: 500 },
    description: { type: "string", maxLength: 2_000 },
    role: { enum: ["card", "reference"] },
    imageUrl: articleOptionalImageUrl,
    iconUrl: articleOptionalImageUrl,
    siteName: { type: "string", maxLength: 240 },
  });
  const articleQuizBlock = object([
    "blockId", "choices", "correctChoiceId", "explanation", "kind",
    "question",
  ], {
    blockId: id,
    kind: { const: "quiz" },
    question: { type: "string", maxLength: 2_000 },
    choices: {
      type: "array",
      minItems: 2,
      maxItems: 8,
      items: articleQuizChoice,
    },
    correctChoiceId: id,
    explanation: { type: "string", maxLength: 10_000 },
  });
  const articleAccordionContentBlock = Object.freeze({ oneOf: [
    object(["blockId", "kind", "level", "text"], {
      blockId: id, kind: { const: "heading" }, level: { enum: [2, 3] },
      text: { type: "string", maxLength: 500 },
    }),
    object(["blockId", "kind", "text"], {
      blockId: id,
      kind: { const: "paragraph" },
      text: { type: "string", maxLength: 20_000, description: "Inline references use [@linkBlockId] for role=reference, [^accordionBlockId] for role=note, and [fig:imageBlockId]. Drafts may contain unresolved targets; all targets must exist before publication. Prefix a marker with a backslash to display it literally. Numbers follow first mention; image numbers follow document order. Other text is literal, never HTML." },
    }),
    object(["blockId", "expression", "kind"], {
      blockId: id,
      kind: { const: "equation" },
      expression: { type: "string", maxLength: 5_000 },
    }),
    object(["altText", "blockId", "caption", "kind", "url"], {
      blockId: id,
      kind: { const: "image" },
      url: { oneOf: [
        { const: "" },
        {
          type: "string",
          format: "uri",
          maxLength: 4_096,
          pattern: "^(?:https://|http://(?:localhost|127\\.0\\.0\\.1)(?=[:/?#]|$))",
        },
      ] },
      altText: { type: "string", maxLength: 1_000 },
      caption: { type: "string", maxLength: 2_000 },
      title: { type: "string", maxLength: 500 },
      credit: object(["text", "licenseLabel", "licenseHref"], {
        text: { type: "string", maxLength: 2_000 },
        licenseLabel: { type: "string", maxLength: 240 },
        licenseHref: articleLinkBlock.properties.href,
      }),
    }),
    object(["blockId", "kind"], {
      blockId: id, kind: { const: "divider" },
    }),
    articleLinkBlock,
    articleQuizBlock,
  ] });
  const articleBlock = Object.freeze({ oneOf: [
    ...articleAccordionContentBlock.oneOf,
    object(["blockId", "blocks", "kind", "title"], {
      blockId: id,
      kind: { const: "accordion" },
      role: { enum: ["disclosure", "note"] },
      title: { type: "string", maxLength: 500 },
      blocks: {
        type: "array",
        maxItems: 100,
        items: articleAccordionContentBlock,
      },
    }),
    object(["blockId", "kind", "placement"], {
      blockId: id, kind: { const: "experiment" }, placement: experimentPlacement,
    }),
  ] });
  // Discovery tags: NFKC text without '#', commas or invisible characters,
  // single inner spaces. Normalize before saving; the backend rejects others.
  const articleTags = Object.freeze({
    type: "array",
    maxItems: STUDIO_ARTICLE_TAG_LIMIT_V1,
    uniqueItems: true,
    items: {
      type: "string",
      minLength: 1,
      maxLength: STUDIO_ARTICLE_TAG_MAX_LENGTH_V1,
      pattern: "^[^#,\\s\u3001]+(?: [^#,\\s\u3001]+)*$",
    },
  });
  const articleDraft = object([
    "articleId", "blocks", "draftVersion", "locale", "schemaId", "tags",
    "title", "visibility",
  ], {
    schemaId: { const: "circleheart-studio-article-draft-v2" },
    articleId: id,
    draftVersion: version,
    visibility: { enum: ["draft", "public"] },
    locale: id,
    title: id,
    tags: articleTags,
    blocks: { type: "array", items: articleBlock },
  });
  const articleBlockOperation = Object.freeze({ oneOf: [
    object(["blockId", "operation"], {
      operation: { const: "remove" }, blockId: id,
    }),
    object(["block", "blockId", "operation"], {
      operation: { const: "replace" }, blockId: id, block: articleBlock,
    }),
    object(["block", "blockId", "operation"], {
      operation: { const: "insert-after" }, blockId: id, block: articleBlock,
    }),
  ] });
  const observationOutput = object(
    ["availability", "outputId", "quality", "value"],
    {
      outputId: id,
      value: { oneOf: [finiteNumber, { type: "array", items: finiteNumber }, { type: "null" }] },
      availability: id,
      quality: id,
    },
  );
  const observation = object(
    ["acceptedRevision", "acceptedTimeSec", "inputEpoch", "outputs", "scenarioId"],
    {
      scenarioId: id,
      acceptedRevision: version,
      acceptedTimeSec: { type: "number", minimum: 0 },
      inputEpoch: version,
      outputs: { type: "array", items: observationOutput },
    },
  );
  const observations = Object.freeze({ type: "array", items: observation });
  const experimentSummary = object(
    ["experimentId", "modelId", "scenarioIds", "surfaceSeriesId", "version"],
    {
      experimentId: id, version, modelId: id, surfaceSeriesId: id,
      scenarioIds: stringArray,
    },
  );
  const articleSummary = object(
    ["articleId", "blockCount", "draftVersion", "locale", "tags", "title", "visibility"],
    {
      articleId: id, draftVersion: version, visibility: { enum: ["draft", "public"] },
      locale: id, title: id, tags: articleTags, blockCount: version,
    },
  );
  const published = object(["published"], { published: { const: true } });
  const cursor = object(["id", "timestamp"], {
    id: uuid,
    timestamp: { type: "string", format: "date-time" },
  });
  const nullableCursor = Object.freeze({ oneOf: [cursor, { type: "null" }] });
  const page = (itemSchema: Readonly<Record<string, unknown>>) => Object.freeze({
    type: "object", additionalProperties: false, required: ["items", "nextCursor"],
    properties: {
      items: { type: "array", items: itemSchema },
      nextCursor: nullableCursor,
    },
  });
  const experimentListItem = object([
    "createdAt", "experimentId", "modelId", "publicSlug", "publishedSnapshotId",
    "scenarioCount", "surfaceSeriesId", "title", "updatedAt", "version",
  ], {
    experimentId: uuid,
    version,
    modelId: id,
    surfaceSeriesId: id,
    title: id,
    scenarioCount: version,
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
    publishedSnapshotId: nullableId,
    publicSlug: nullableId,
  });
  const snapshotListItem = object([
    "createdAt", "modelId", "paneCount", "scenarioCount", "snapshotId",
    "surfaceReleaseId", "surfaceSeriesId", "title",
  ], {
    snapshotId: uuid,
    modelId: id,
    surfaceSeriesId: id,
    surfaceReleaseId: id,
    title: id,
    scenarioCount: version,
    paneCount: version,
    createdAt: { type: "string", format: "date-time" },
  });
  const articleListItem = object([
    "articleId", "createdAt", "locale", "publicSlug", "tags", "title",
    "updatedAt", "version", "visibility",
  ], {
    articleId: uuid,
    version,
    visibility: { enum: ["draft", "public"] },
    locale: id,
    title: id,
    tags: articleTags,
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
    publicSlug: nullableId,
  });
  const listItemByAction = Object.freeze({
    "experiment.list": experimentListItem,
    "snapshot.list": snapshotListItem,
    "article.list": articleListItem,
  });
  const experimentResource = object([
    "createdAt", "experiment", "publicSlug", "publishedSnapshotId", "title", "updatedAt",
  ], {
    experiment,
    title: id,
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
    publishedSnapshotId: nullableId,
    publicSlug: nullableId,
    publishedVersion: { type: ["integer", "null"], minimum: 0 },
    publishedAt: { type: ["string", "null"], format: "date-time" },
  });
  const operationReceiptResult = Object.freeze({ oneOf: [
    object(["experimentId", "version"], { experimentId: uuid, version }),
    object(["createdAt", "schemaId", "snapshotId"], {
      schemaId: { const: "circleheart-studio-experiment-snapshot-v2" },
      snapshotId: uuid,
      createdAt: { type: "string", format: "date-time" },
    }),
    object(["articleId", "version"], { articleId: uuid, version }),
    object(["experimentId", "publicSlug", "snapshotId"], {
      experimentId: uuid, snapshotId: uuid, publicSlug: id,
    }),
    object(["articleContentId", "articleId", "publicSlug"], {
      articleId: uuid, articleContentId: uuid, publicSlug: id,
    }),
  ] });
  const runningOperationReceipt = object([
    "completedAt", "createdAt", "operationId", "operationKind", "result", "status",
  ], {
    operationId: uuid,
    operationKind: id,
    status: { const: "running" },
    result: { type: "null" },
    createdAt: { type: "string", format: "date-time" },
    completedAt: { type: "null" },
  });
  const committedOperationReceipt = object([
    "completedAt", "createdAt", "operationId", "operationKind", "result", "status",
  ], {
    operationId: uuid,
    operationKind: id,
    status: { const: "committed" },
    result: operationReceiptResult,
    createdAt: { type: "string", format: "date-time" },
    completedAt: { type: "string", format: "date-time" },
  });
  const operationReceipt = Object.freeze({ oneOf: [
    runningOperationReceipt,
    committedOperationReceipt,
  ] });
  const nullable = (schema: Readonly<Record<string, unknown>>) =>
    Object.freeze({ oneOf: [schema, { type: "null" }] });
  const previewInputRequired = [
    "executionBudget", "expectedVersion", "experimentId", "observeOutputIds",
    "presentation", "scenarioOperations", "title",
  ] as const;
  const previewInputBase = {
    title: id,
    scenarioOperations,
    presentation,
    executionBudget,
    observeOutputIds: nullableStringArray,
  };
  const previewInputSchema = Object.freeze({ oneOf: [
    object(previewInputRequired, {
      ...previewInputBase,
      experimentId: { const: null },
      expectedVersion: { const: null },
    }),
    object(previewInputRequired, {
      ...previewInputBase,
      experimentId: id,
      expectedVersion: version,
    }),
  ] });
  const articleSaveInputSchema = Object.freeze({ oneOf: [
    object(["article", "articleId", "expectedVersion"], {
      articleId: { const: null },
      expectedVersion: { const: null },
      article: articleDraft,
    }),
    object(["article", "articleId", "expectedVersion"], {
      articleId: id,
      expectedVersion: version,
      article: articleDraft,
    }),
  ] });
  const courseContent=object(["title","description","audience","locale","articleIds"],{
    title:{type:"string",minLength:1,maxLength:240},description:{type:"string",maxLength:4000},audience:{type:"string",maxLength:1000},
    locale:{enum:["ja","en"]},articleIds:{type:"array",items:uuid,maxItems:64,uniqueItems:true},
  });
  const courseDraft=object(["courseId","version","content","published","updatedAt"],{courseId:uuid,version,content:courseContent,published:bool,updatedAt:{type:"string",format:"date-time"}});
  const allActions: ReturnType<typeof describeStudioAuthoringProtocolV1>["actions"] = [
    {action:"course.delete",mutation:true,inputSchema:object(["courseId","expectedVersion"],{courseId:uuid,expectedVersion:version}),resultSchema:{type:"null"}},
    {action:"course.save",mutation:true,inputSchema:object(["courseId","expectedVersion","content"],{courseId:nullableUuid,expectedVersion:nullableVersion,content:courseContent}),resultSchema:courseDraft},
    {action:"course.publish",mutation:true,inputSchema:object(["courseId","expectedVersion","publish"],{courseId:uuid,expectedVersion:version,publish:bool}),resultSchema:courseDraft},
    {action:"course.read",mutation:false,inputSchema:object(["courseId","scope"],{courseId:uuid,scope:{enum:["mine","public"]}}),resultSchema:{type:["object","null"]}},
    {action:"course.list",mutation:false,inputSchema:object(["locale","scope","offset"],{locale:{enum:["ja","en"]},scope:{enum:["mine","public","featured"]},offset:{type:"integer",minimum:0}}),resultSchema:{type:"array",items:{type:"object"}}},
    ...(["experiment.list", "snapshot.list", "article.list"] as const).map((action) =>
      Object.freeze({ action, mutation: false, inputSchema: object(["cursor", "limit"], {
        cursor: nullableCursor,
        limit: { type: "integer", minimum: 1, maximum: 100 },
      }), resultSchema: page(listItemByAction[action]) })),
    Object.freeze({ action: "experiment.read", mutation: false,
      inputSchema: object(["experimentId"], { experimentId: id }),
      resultSchema: nullable(experimentResource) }),
    Object.freeze({ action: "snapshot.read", mutation: false,
      inputSchema: object(["snapshotId"], { snapshotId: id }),
      resultSchema: nullable(snapshot) }),
    Object.freeze({ action: "snapshot.analyze", mutation: false,
      inputSchema: object(["snapshotId", "scenarioIds", "includeAnalysis"], {
        snapshotId: id,
        scenarioIds: { type: "array", minItems: 1, uniqueItems: true, items: id },
        includeAnalysis: { type: "boolean", description: "Include the portable measured analysis payload (including partial progress on failure). False returns only source bindings and completeness assessments. Always ephemeral; never writes the Snapshot." },
      }),
      resultSchema: object(["source", "analysisId", "allComplete", "scenarios"], {
        source: object(["snapshotId", "exactModel", "artifactRevisionId"], { snapshotId: id, exactModel, artifactRevisionId: id }),
        analysisId: id,
        allComplete: { type: "boolean", description: "True only when every requested scenario passes both sides of the pinned PV/Starling/PVA display assessment. Command ok does not imply allComplete." },
        scenarios: { type: "array", items: object(["scenarioId", "source", "status", "assessment", "analysis", "error"], {
          scenarioId: id,
          source: object(["captureSha256", "inputEpoch", "acceptedRevision", "acceptedTimeSec"], {
            captureSha256: { type: "string", pattern: "^[0-9a-f]{64}$" }, inputEpoch: { const: 0 },
            acceptedRevision: version, acceptedTimeSec: finiteNumber,
          }),
          status: { enum: ["complete", "incomplete", "failed"] },
          assessment: nullable(object(["analysisId", "pvaMethodId", "sides"], {
            analysisId: id, pvaMethodId: id,
            sides: { type: "array", items: object(["side", "settledPoints", "completedPointCount", "totalPointCount", "protocolId", "pvaMethodId", "status", "measurementStatus", "systolicLoadStatus", "diastolicLoadStatus", "pvaStatus", "reason"], {
              side: { enum: ["left", "right"] }, settledPoints: version, completedPointCount: version, totalPointCount: version,
              protocolId: nullableId, pvaMethodId: id, status: { enum: ["complete", "incomplete"] },
              measurementStatus: { enum: ["complete", "incomplete"] },
              systolicLoadStatus: { enum: ["complete", "progressive", "unavailable"] },
              diastolicLoadStatus: { enum: ["complete", "progressive", "unavailable"] },
              pvaStatus: { enum: ["complete", "progressive", "collecting", "unavailable", "not-evaluated"] }, reason: nullableId,
            }) },
          })),
          analysis: nullable(object(["modelId", "runtimeSessionId", "scenarioId", "inputEpoch", "sourceAcceptedRevision", "sourceAcceptedTimeSec", "analysisId", "payload"], {
            modelId: id, runtimeSessionId: id, scenarioId: id, inputEpoch: { const: 0 },
            sourceAcceptedRevision: version, sourceAcceptedTimeSec: finiteNumber, analysisId: id,
            payload: { type: "object", description: "Portable JSON owned by the pinned analysis method." },
          })),
          error: nullable(object(["stage", "message"], { stage: { enum: ["execution", "assessment"] }, message: id })),
        }) },
      }) }),
    Object.freeze({ action: "article.read", mutation: false,
      inputSchema: object(["articleId"], { articleId: id }),
      resultSchema: nullable(articleDraft) }),
    Object.freeze({ action: "operation.read", mutation: false,
      inputSchema: object(["operationId"], { operationId: uuid }),
      resultSchema: nullable(operationReceipt) }),
    Object.freeze({ action: "model.describe", mutation: false,
      inputSchema: object(["experimentId"], { experimentId: nullableId }),
      resultSchema: object(["exactModel", "model"], { exactModel, model: modelContract }) }),
    Object.freeze({ action: "experiment.trace", mutation: false,
      inputSchema: object(["experimentId", "expectedVersion", "exactModel", "scenarioIds", "outputIds", "stepCount", "sampleStride", "wallClockTimeoutMs"], {
        experimentId: id, expectedVersion: version, exactModel,
        scenarioIds: { type: "array", minItems: 1, uniqueItems: true, items: id },
        outputIds: { type: "array", minItems: 1, maxItems: 32, uniqueItems: true, items: id },
        stepCount: { type: "integer", minimum: 1, maximum: 20_000 },
        sampleStride: { type: "integer", minimum: 1, maximum: 1_000 },
        wallClockTimeoutMs: { type: "integer", minimum: 1_000, maximum: 600_000 },
      }),
      resultSchema: object(["source", "stepCount", "sampleStride", "outputIds", "traces"], {
        source: object(["experimentId", "version", "exactModel"], { experimentId: id, version, exactModel }),
        stepCount: version, sampleStride: version, outputIds: stringArray,
        traces: { type: "array", items: object(["scenarioId", "inputEpoch", "startAcceptedTimeSec", "startAcceptedRevision", "samples"], {
          scenarioId: id, inputEpoch: version, startAcceptedTimeSec: finiteNumber, startAcceptedRevision: version,
          samples: { type: "array", items: object(["acceptedTimeSec", "acceptedRevision", "values", "states"], {
            acceptedTimeSec: finiteNumber, acceptedRevision: version,
            values: { type: "array", items: { type: ["number", "null"] } },
            states: { type: "array", items: { type: "integer", minimum: 0, maximum: 5 },
              description: "Packed exact ABI: availability offset 0=available, 3=not-evaluated; quality offset 0=authoritative-state, 1=accepted-derived, 2=not-assessed. Values are null for unavailable states." },
          }) },
        }) },
      }) }),
    Object.freeze({ action: "experiment.preview", mutation: false,
      inputSchema: previewInputSchema,
      resultSchema: object(["diff", "observations", "plan"], {
        plan: experimentPlan,
        diff: object([
          "addedScenarioIds", "advancedScenarioIds", "finalScenarioIds",
          "removedScenarioIds", "updatedScenarioIds",
        ], {
          addedScenarioIds: stringArray,
          updatedScenarioIds: stringArray,
          removedScenarioIds: stringArray,
          advancedScenarioIds: stringArray,
          finalScenarioIds: stringArray,
        }),
        observations,
      }) }),
    Object.freeze({ action: "experiment.apply", mutation: true,
      inputSchema: object(["plan"], { plan: experimentPlan }),
      resultSchema: object(["observations", "savedExperiment"], {
        savedExperiment: experimentSummary, observations,
      }) }),
    Object.freeze({ action: "experiment.presentation.save", mutation: true,
      inputSchema: object([
        "expectedVersion", "experimentId", "surface", "surfaceReleaseId", "title",
      ], {
        experimentId: id, expectedVersion: version, surfaceReleaseId: id,
        title: id,
        surface: experimentSurface,
      }), resultSchema: experimentSummary }),
    Object.freeze({ action: "snapshot.seal", mutation: true,
      inputSchema: object([
        "createdAt", "exactModel", "expectedVersion", "experimentId", "observeOutputIds",
      ], {
        experimentId: id, expectedVersion: version, exactModel,
        createdAt: { type: "string", format: "date-time" },
        observeOutputIds: nullableStringArray,
      }),
      resultSchema: object(["observations", "sealedSnapshot"], {
        sealedSnapshot: object([
          "createdAt", "modelId", "scenarioIds", "snapshotId",
          "surfaceReleaseId", "surfaceSeriesId",
        ], {
          snapshotId: id, modelId: id, surfaceSeriesId: id,
          surfaceReleaseId: id, scenarioIds: stringArray,
          createdAt: { type: "string", format: "date-time" },
        }),
        observations,
      }) }),
    Object.freeze({ action: "article.briefing.place", mutation: true,
      inputSchema: object([
        "articleId", "expectedVersion", "selection", "snapshotId", "target",
      ], {
        articleId: id, expectedVersion: version, snapshotId: id,
        selection: briefingSelection, target: briefingTarget,
      }), resultSchema: object([
        "articleId", "blockCount", "blockId", "draftVersion", "locale",
        "placementId", "snapshotId", "tags", "title", "visibility",
      ], {
        articleId: id, draftVersion: version, visibility: { enum: ["draft", "public"] },
        locale: id, title: id, tags: articleTags, blockCount: version,
        blockId: id, placementId: id, snapshotId: id,
      }) }),
    Object.freeze({ action: "article.blocks.patch", mutation: true,
      inputSchema: object(["articleId", "expectedVersion", "operations", "title"], {
        articleId: id, expectedVersion: version, title: nullableId,
        operations: { type: "array", minItems: 1, items: articleBlockOperation },
      }), resultSchema: articleSummary }),
    Object.freeze({ action: "experiment.publish", mutation: true,
      inputSchema: object(["expectedVersion", "experimentId", "publicSlug", "snapshotId"], {
        experimentId: id, expectedVersion: version, snapshotId: id, publicSlug,
      }), resultSchema: published }),
    Object.freeze({ action: "article.save", mutation: true,
      inputSchema: articleSaveInputSchema,
      resultSchema: articleSummary }),
    Object.freeze({ action: "article.publish", mutation: true,
      inputSchema: object(["articleId", "expectedVersion", "publicSlug"], {
        articleId: id, expectedVersion: version, publicSlug,
      }), resultSchema: published }),
  ];
  const actions = selectedAction === undefined
    ? allActions
    : allActions.filter(({ action }) => action === selectedAction);
  if (actions.length === 0) {
    throw new Error(`Unknown authoring action: ${selectedAction}; use --list-actions`);
  }
  const commandEnvelope = Object.freeze({
    oneOf: actions.map(({ action, inputSchema }) => object(
      ["action", "commandId", "input", "schemaId"],
      {
        schemaId: { const: STUDIO_AUTHORING_COMMAND_V1_SCHEMA_ID },
        commandId: uuid,
        action: { const: action },
        input: inputSchema,
      },
    )),
  });
  const successEnvelope = Object.freeze({
    oneOf: actions.map(({ action, resultSchema }) => object(
      ["action", "commandId", "ok", "result", "schemaId"],
      {
        schemaId: { const: "circleheart-studio-authoring-command-result-v1" },
        ok: { const: true },
        commandId: uuid,
        action: { const: action },
        result: resultSchema,
      },
    )),
  });
  const errorDetail = object(
    ["category", "code", "commitState", "message", "recovery", "retryable"],
    {
      code: id,
      category: { enum: [
        "validation", "conflict", "authentication", "authorization",
        "not-found", "quota", "numerical", "transport", "internal",
      ] },
      retryable: bool,
      commitState: { enum: ["none", "unknown", "confirmed"] },
      recovery: { enum: [
        "fix-command", "mint-new-command-id", "refresh-authority-state",
        "login", "request-access", "refresh-headless-token",
        "reduce-work-or-wait", "retry-same-command",
        "inspect-operation-then-retry-same-command",
        "read-authority-state", "report-bug",
      ] },
      message: { type: "string" },
    },
  );
  return deepFreezeV1({
    schemaId: STUDIO_AUTHORING_PROTOCOL_DESCRIPTION_V1_SCHEMA_ID,
    jsonSchemaDialect: "https://json-schema.org/draft/2020-12/schema",
    commandSchemaId: STUDIO_AUTHORING_COMMAND_V1_SCHEMA_ID,
    protocol: {
      stdout: "exactly-one-json-envelope",
      stderr: "progress-and-debug-only",
      mutationRetry: "reuse-commandId-for-the-identical-semantic-mutation",
      concurrency: "one-refresh-token-rotation-per-profile",
      numericalMutation: "preview-exact-plan-then-apply",
      publication: "standalone-explicit-action",
      commandIdentity: "commandId-is-bound-by-authority-request-fingerprint-for-at-least-30-days",
      errorRecovery: {
        "fix-command": "correct input against the action JSON Schema and mint a new commandId",
        "mint-new-command-id": "preserve the old command file and mint a UUID for the new semantic request",
        "refresh-authority-state": "read the current Article, Experiment, Snapshot or list state before replanning",
        login: "restore the selected authoring profile before retrying",
        "request-access": "use a non-anonymous account with authority for the requested action",
        "refresh-headless-token": "obtain a fresh access/refresh pair from the external token manager",
        "reduce-work-or-wait": "reduce the numerical budget or wait for quota capacity before minting a new command",
        "retry-same-command": "no mutation reached authority; retry the byte-identical commandId after transport recovers",
        "inspect-operation-then-retry-same-command": "call operation.read with commandId, then retry the exact same commandId only if uncommitted",
        "read-authority-state": "inspect the target and operation receipt before deciding whether another write is needed",
        "report-bug": "do not guess; preserve the envelope and report an implementation defect",
      },
    },
    envelopes: {
      success: successEnvelope,
      error: object(["action", "commandId", "error", "ok", "schemaId"], {
        schemaId: { const: "circleheart-studio-authoring-command-error-v1" },
        ok: { const: false }, commandId: nullableUuid,
        action: { type: ["string", "null"] }, error: errorDetail,
      }),
      command: commandEnvelope,
    },
    actions,
  });
}

export function validateStudioAuthoringCommandV1(
  value: unknown,
): StudioAuthoringCommandV1 {
  assertPortableStudioJsonObjectV2(value, "$.command");
  const command = JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
  exactKeysV1(command, ["action", "commandId", "input", "schemaId"], "$.command");
  if (command.schemaId !== STUDIO_AUTHORING_COMMAND_V1_SCHEMA_ID) {
    throw new Error("Studio authoring command schema identity mismatch");
  }
  const commandId = uuidV1(command.commandId, "$.command.commandId");
  const input = recordV1(command.input, "$.command.input");
  const base = { schemaId: STUDIO_AUTHORING_COMMAND_V1_SCHEMA_ID, commandId };
  switch (command.action) {
    case "course.delete":
      exactKeysV1(input,["courseId","expectedVersion"],"$.command.input");
      return {...base,action:"course.delete",input:{courseId:uuidV1(input.courseId,"courseId"),expectedVersion:versionV1(input.expectedVersion,"expectedVersion")}};
    case "course.save":
      exactKeysV1(input,["courseId","expectedVersion","content"],"$.command.input");
      return {...base,action:"course.save",input:{courseId:input.courseId===null?null:uuidV1(input.courseId,"courseId"),expectedVersion:nullableVersionV1(input.expectedVersion,"expectedVersion"),content:validateCourseContentV1(input.content)}};
    case "course.publish":
      exactKeysV1(input,["courseId","expectedVersion","publish"],"$.command.input");
      if(typeof input.publish!=="boolean")throw new Error("publish must be boolean");
      return {...base,action:"course.publish",input:{courseId:uuidV1(input.courseId,"courseId"),expectedVersion:versionV1(input.expectedVersion,"expectedVersion"),publish:input.publish}};
    case "course.read":
      exactKeysV1(input,["courseId","scope"],"$.command.input");
      if(input.scope!=="mine"&&input.scope!=="public")throw new Error("Invalid Course scope");
      return {...base,action:"course.read",input:{courseId:uuidV1(input.courseId,"courseId"),scope:input.scope}};
    case "course.list":
      exactKeysV1(input,["locale","scope","offset"],"$.command.input");
      if((input.locale!=="ja"&&input.locale!=="en")||(input.scope!=="mine"&&input.scope!=="public"&&input.scope!=="featured"))throw new Error("Invalid Course list");
      return {...base,action:"course.list",input:{locale:input.locale,scope:input.scope,offset:boundedIntegerV1(input.offset,"offset",0,1000000)}};
    case "experiment.list":
    case "snapshot.list":
    case "article.list":
      exactKeysV1(input, ["cursor", "limit"], "$.command.input");
      return deepFreezeV1({ ...base, action: command.action, input: {
        limit: pageLimitV1(input.limit),
        cursor: listCursorV1(input.cursor, "$.command.input.cursor"),
      } });
    case "experiment.read":
      exactKeysV1(input, ["experimentId"], "$.command.input");
      return deepFreezeV1({ ...base, action: command.action, input: {
        experimentId: trimmedV1(input.experimentId, "$.command.input.experimentId"),
      } });
    case "snapshot.read":
      exactKeysV1(input, ["snapshotId"], "$.command.input");
      return deepFreezeV1({ ...base, action: command.action, input: {
        snapshotId: trimmedV1(input.snapshotId, "$.command.input.snapshotId"),
      } });
    case "snapshot.analyze": {
      exactKeysV1(input, ["snapshotId", "scenarioIds", "includeAnalysis"], "$.command.input");
      const scenarioIds = stringArrayV1(input.scenarioIds, "$.command.input.scenarioIds");
      if (scenarioIds.length < 1)
        throw new Error("$.command.input.scenarioIds must select at least one scenario");
      if (typeof input.includeAnalysis !== "boolean")
        throw new Error("$.command.input.includeAnalysis must be a boolean");
      return deepFreezeV1({ ...base, action: command.action, input: {
        snapshotId: trimmedV1(input.snapshotId, "$.command.input.snapshotId"), scenarioIds, includeAnalysis: input.includeAnalysis,
      } });
    }
    case "article.read":
      exactKeysV1(input, ["articleId"], "$.command.input");
      return deepFreezeV1({ ...base, action: command.action, input: {
        articleId: trimmedV1(input.articleId, "$.command.input.articleId"),
      } });
    case "operation.read":
      exactKeysV1(input, ["operationId"], "$.command.input");
      return deepFreezeV1({ ...base, action: command.action, input: {
        operationId: uuidV1(input.operationId, "$.command.input.operationId"),
      } });
    case "model.describe":
      exactKeysV1(input, ["experimentId"], "$.command.input");
      return deepFreezeV1({ ...base, action: command.action, input: {
        experimentId: nullableTrimmedV1(input.experimentId, "$.command.input.experimentId"),
      } });
    case "experiment.trace": {
      exactKeysV1(input, ["experimentId", "expectedVersion", "exactModel", "scenarioIds", "outputIds", "stepCount", "sampleStride", "wallClockTimeoutMs"], "$.command.input");
      const traceInput: StudioAuthoringTraceInputV1 = {
        experimentId: trimmedV1(input.experimentId, "$.command.input.experimentId"),
        expectedVersion: boundedIntegerV1(input.expectedVersion, "$.command.input.expectedVersion", 0, Number.MAX_SAFE_INTEGER),
        exactModel: exactModelPinV1(input.exactModel, "$.command.input.exactModel"),
        scenarioIds: stringArrayV1(input.scenarioIds, "$.command.input.scenarioIds"),
        outputIds: stringArrayV1(input.outputIds, "$.command.input.outputIds"),
        stepCount: boundedIntegerV1(input.stepCount, "$.command.input.stepCount", 1, 20_000),
        sampleStride: boundedIntegerV1(input.sampleStride, "$.command.input.sampleStride", 1, 1_000),
        wallClockTimeoutMs: boundedIntegerV1(input.wallClockTimeoutMs, "$.command.input.wallClockTimeoutMs", 1_000, 600_000),
      };
      assertStudioAuthoringTraceSamplingV1(traceInput);
      return deepFreezeV1({ ...base, action: command.action, input: traceInput });
    }
    case "experiment.preview": {
      exactKeysV1(input, [
        "executionBudget", "expectedVersion", "experimentId", "observeOutputIds",
        "presentation", "scenarioOperations", "title",
      ], "$.command.input");
      const experimentId = nullableTrimmedV1(
        input.experimentId,
        "$.command.input.experimentId",
      );
      const expectedVersion = nullableVersionV1(
        input.expectedVersion,
        "$.command.input.expectedVersion",
      );
      assertMatchingNullableIdentityV1(experimentId, expectedVersion, "Experiment preview");
      const scenarioOperations = scenarioOperationsV1(input.scenarioOperations);
      const executionBudget = executionBudgetV1(input.executionBudget);
      assertStudioAuthoringTimeAdvanceV1(scenarioOperations, executionBudget);
      return deepFreezeV1({ ...base, action: command.action, input: {
        experimentId,
        expectedVersion,
        title: trimmedV1(input.title, "$.command.input.title"),
        scenarioOperations,
        presentation: presentationSpecV1(input.presentation),
        executionBudget,
        observeOutputIds: nullableStringArrayV1(
          input.observeOutputIds,
          "$.command.input.observeOutputIds",
        ),
      } });
    }
    case "experiment.apply":
      exactKeysV1(input, ["plan"], "$.command.input");
      return deepFreezeV1({ ...base, action: command.action, input: {
        plan: experimentApplyPlanV1(input.plan),
      } });
    case "experiment.presentation.save":
      exactKeysV1(input, [
        "expectedVersion", "experimentId", "surface", "surfaceReleaseId", "title",
      ], "$.command.input");
      return deepFreezeV1({ ...base, action: command.action, input: {
        experimentId: trimmedV1(input.experimentId, "$.command.input.experimentId"),
        expectedVersion: versionV1(input.expectedVersion, "$.command.input.expectedVersion"),
        surfaceReleaseId: trimmedV1(
          input.surfaceReleaseId,
          "$.command.input.surfaceReleaseId",
        ),
        title: trimmedV1(input.title, "$.command.input.title"),
        surface: input.surface as ExperimentSurfaceV2,
      } });
    case "snapshot.seal":
      exactKeysV1(input, [
        "createdAt", "exactModel", "expectedVersion", "experimentId", "observeOutputIds",
      ], "$.command.input");
      return deepFreezeV1({ ...base, action: command.action, input: {
        experimentId: trimmedV1(input.experimentId, "$.command.input.experimentId"),
        expectedVersion: versionV1(input.expectedVersion, "$.command.input.expectedVersion"),
        exactModel: exactModelPinV1(input.exactModel, "$.command.input.exactModel"),
        createdAt: isoTimestampV1(input.createdAt, "$.command.input.createdAt"),
        observeOutputIds: nullableStringArrayV1(
          input.observeOutputIds,
          "$.command.input.observeOutputIds",
        ),
      } });
    case "article.briefing.place":
      exactKeysV1(input, [
        "articleId", "expectedVersion", "selection", "snapshotId", "target",
      ], "$.command.input");
      return deepFreezeV1({ ...base, action: command.action, input: {
        articleId: trimmedV1(input.articleId, "$.command.input.articleId"),
        expectedVersion: versionV1(input.expectedVersion, "$.command.input.expectedVersion"),
        snapshotId: trimmedV1(input.snapshotId, "$.command.input.snapshotId"),
        selection: briefingSelectionV1(input.selection),
        target: briefingTargetV1(input.target),
      } });
    case "article.blocks.patch":
      exactKeysV1(input, ["articleId", "expectedVersion", "operations", "title"], "$.command.input");
      return deepFreezeV1({ ...base, action: command.action, input: {
        articleId: trimmedV1(input.articleId, "$.command.input.articleId"),
        expectedVersion: versionV1(input.expectedVersion, "$.command.input.expectedVersion"),
        title: nullableTrimmedV1(input.title, "$.command.input.title"),
        operations: articleBlockOperationsV1(input.operations),
      } });
    case "experiment.publish":
      exactKeysV1(input, ["expectedVersion", "experimentId", "publicSlug", "snapshotId"], "$.command.input");
      return deepFreezeV1({ ...base, action: command.action, input: {
        experimentId: trimmedV1(input.experimentId, "$.command.input.experimentId"),
        expectedVersion: versionV1(input.expectedVersion, "$.command.input.expectedVersion"),
        snapshotId: trimmedV1(input.snapshotId, "$.command.input.snapshotId"),
        publicSlug: publicSlugV1(input.publicSlug, "$.command.input.publicSlug"),
      } });
    case "article.save": {
      exactKeysV1(input, ["article", "articleId", "expectedVersion"], "$.command.input");
      const articleId = nullableTrimmedV1(input.articleId, "$.command.input.articleId");
      const expectedVersion = nullableVersionV1(
        input.expectedVersion,
        "$.command.input.expectedVersion",
      );
      assertMatchingNullableIdentityV1(articleId, expectedVersion, "Article save");
      const article = validateStudioArticleDraftV2(input.article);
      if (article.title.trim().length === 0) {
        throw new Error("$.command.input.article.title must be non-empty");
      }
      if (
        articleId !== null
        && (article.articleId !== articleId || article.draftVersion !== expectedVersion)
      ) {
        throw new Error("Article command identity/version must match its embedded draft");
      }
      return deepFreezeV1({ ...base, action: command.action, input: {
        articleId, expectedVersion, article,
      } });
    }
    case "article.publish":
      exactKeysV1(input, ["articleId", "expectedVersion", "publicSlug"], "$.command.input");
      return deepFreezeV1({ ...base, action: command.action, input: {
        articleId: trimmedV1(input.articleId, "$.command.input.articleId"),
        expectedVersion: versionV1(input.expectedVersion, "$.command.input.expectedVersion"),
        publicSlug: publicSlugV1(input.publicSlug, "$.command.input.publicSlug"),
      } });
    default:
      throw new Error(`Unsupported Studio authoring action ${String(command.action)}`);
  }
}

export async function executeStudioAuthoringCommandV1(
  repository: StudioAuthoringRepositoryPortV1,
  models: StudioAuthoringModelPortV1,
  commandValue: StudioAuthoringCommandV1 | unknown,
  policy: StudioAuthoringPolicyPortV1 = ALLOW_STUDIO_AUTHORING_POLICY_V1,
  observer: Readonly<{ onSnapshotAnalysisProgress?: (progress: StudioSnapshotAnalysisProgressV1) => void }> = {},
): Promise<unknown> {
  const command = validateStudioAuthoringCommandV1(commandValue);
  await policy.authorize(command);
  switch (command.action) {
    case "course.delete": await repository.deleteCourse(command.input); return null;
    case "course.save": return repository.saveCourse(command.input);
    case "course.publish": return repository.publishCourse(command.input);
    case "course.read": return command.input.scope==="mine"?repository.readMyCourse(command.input.courseId):repository.readPublicCourse(command.input.courseId);
    case "course.list": return command.input.scope==="mine"?repository.listMyCourses(command.input):repository.listPublicCourses({...command.input,featured:command.input.scope==="featured"});
    case "experiment.list": return repository.listMyExperiments(command.input);
    case "snapshot.list": return repository.listMySnapshots(command.input);
    case "article.list": return repository.listMyArticles(command.input);
    case "experiment.read": return repository.readMyExperiment(command.input.experimentId);
    case "snapshot.read": return repository.readSnapshot(command.input.snapshotId);
    case "snapshot.analyze":
      return analyzeStudioSnapshotV1(repository, models, command.input, observer.onSnapshotAnalysisProgress);
    case "article.read": return repository.readArticle(command.input.articleId);
    case "operation.read":
      return repository.readMyAuthoringOperationReceipt(command.input.operationId);
    case "model.describe":
      return describeModelForAuthoringV1(repository, models, command.input.experimentId);
    case "experiment.trace":
      return traceStudioExperimentV1(repository, models, command.input);
    case "experiment.preview":
      return previewStudioExperimentPlanV1(repository, models, command.input);
    case "experiment.apply":
      return applyStudioExperimentPlanV1(repository, models, command.input.plan);
    case "experiment.presentation.save": {
      const current = await repository.readMyExperiment(command.input.experimentId);
      if (current === null) throw new Error("Experiment is unavailable");
      if (current.experiment.version !== command.input.expectedVersion) {
        throw new Error(
          `Experiment version conflict: expected ${command.input.expectedVersion}, current ${current.experiment.version}`,
        );
      }
      const content = validateExperimentContentV2({
        ...current.experiment.content,
        surface: command.input.surface,
      });
      const exactModel = Object.freeze({
        modelId: content.modelId,
        surfaceSeriesId: content.surfaceSeriesId,
        surfaceReleaseId: command.input.surfaceReleaseId,
      });
      const resolved = await models.resolveExactNumericalModel(exactModel);
      assertStudioAuthoringResolvedNumericalModelMatchesPinV1(
        resolved,
        exactModel,
      );
      assertExperimentContentMatchesModelSurfaceCapabilitiesV2(
        content,
        resolved.contract,
        { periodicPvaSupported: resolved.periodicPvaSupported },
      );
      return summarizeExperimentMutationV1(await repository.saveExperiment({
        experimentId: command.input.experimentId,
        expectedVersion: command.input.expectedVersion,
        title: command.input.title,
        content,
      }));
    }
    case "snapshot.seal":
      return sealStudioExperimentSnapshotV1(repository, models, {
        ...command.input,
        snapshotId: `snapshot/authoring/${command.commandId}`,
      });
    case "article.briefing.place": {
      const article = await readArticleVersionV1(
        repository,
        command.input.articleId,
        command.input.expectedVersion,
      );
      const snapshot = await repository.readSnapshot(command.input.snapshotId);
      if (snapshot === null) throw new Error("Snapshot is unavailable");
      const next = placeStudioArticleBriefingV1({
        article,
        snapshot,
        selection: command.input.selection,
        target: command.input.target,
        identity: Object.freeze({
          placementId: `placement/authoring/${command.commandId}`,
          blockId: `block/authoring/${command.commandId}`,
        }),
      });
      await assertArticleMatchesAuthorityV1(next, repository, models);
      const saved = await repository.saveArticle({
        articleId: article.articleId,
        expectedVersion: article.draftVersion,
        article: next,
      });
      return Object.freeze({
        ...summarizeArticleMutationV1(saved),
        placementId: `placement/authoring/${command.commandId}`,
        blockId: `block/authoring/${command.commandId}`,
        snapshotId: snapshot.snapshotId,
      });
    }
    case "article.blocks.patch": {
      const article = await readArticleVersionV1(
        repository,
        command.input.articleId,
        command.input.expectedVersion,
      );
      const next = applyArticleBlockOperationsV1(
        article,
        command.input.title,
        command.input.operations,
      );
      await assertArticleMatchesAuthorityV1(next, repository, models);
      return summarizeArticleMutationV1(await repository.saveArticle({
        articleId: article.articleId,
        expectedVersion: article.draftVersion,
        article: next,
      }));
    }
    case "experiment.publish":
      await repository.publishExperiment(command.input);
      return Object.freeze({ published: true });
    case "article.save":
      await assertArticleMatchesAuthorityV1(command.input.article, repository, models);
      return summarizeArticleMutationV1(await repository.saveArticle(command.input));
    case "article.publish":
      await repository.publishArticle(command.input);
      return Object.freeze({ published: true });
  }
}

async function describeModelForAuthoringV1(
  repository: StudioAuthoringRepositoryPortV1,
  models: StudioAuthoringModelPortV1,
  experimentId: string | null,
): Promise<unknown> {
  const resolved = experimentId === null
    ? await models.resolveActiveNumericalModel()
    : await (async () => {
        const resource = await repository.readMyExperiment(experimentId);
        if (resource === null) throw new Error("Experiment is unavailable");
        return models.resolveLatestNumericalModel({
          modelId: resource.experiment.content.modelId,
          surfaceSeriesId: resource.experiment.content.surfaceSeriesId,
        });
      })();
  return Object.freeze({
    exactModel: Object.freeze({
      modelId: resolved.contract.modelId,
      surfaceSeriesId: resolved.surfaceSeriesId,
      surfaceReleaseId: resolved.surfaceReleaseId,
    }),
    model: resolved.contract,
  });
}

async function readArticleVersionV1(
  repository: StudioAuthoringRepositoryPortV1,
  articleId: string,
  expectedVersion: number,
): Promise<StudioArticleDraftV2> {
  const article = await repository.readArticle(articleId);
  if (article === null) throw new Error("Article is unavailable");
  if (article.draftVersion !== expectedVersion) {
    throw new Error(
      `Article version conflict: expected ${expectedVersion}, current ${article.draftVersion}`,
    );
  }
  return article;
}

function applyArticleBlockOperationsV1(
  article: StudioArticleDraftV2,
  title: string | null,
  operations: readonly StudioAuthoringArticleBlockOperationV1[],
): StudioArticleDraftV2 {
  const blocks = [...article.blocks];
  const targets = new Set<string>();
  for (const operation of operations) {
    if (targets.has(operation.blockId)) {
      throw new Error(`Article block ${operation.blockId} has more than one operation`);
    }
    targets.add(operation.blockId);
    const index = blocks.findIndex(({ blockId }) => blockId === operation.blockId);
    if (index < 0) throw new Error(`Article block is unavailable: ${operation.blockId}`);
    if (operation.operation === "remove") {
      blocks.splice(index, 1);
    } else if (operation.operation === "replace") {
      blocks.splice(index, 1, operation.block);
    } else {
      blocks.splice(index + 1, 0, operation.block);
    }
  }
  return validateStudioArticleDraftV2({
    ...article,
    title: title ?? article.title,
    blocks,
  });
}

async function assertArticleMatchesAuthorityV1(
  article: StudioArticleDraftV2,
  repository: StudioAuthoringRepositoryPortV1,
  models: StudioAuthoringModelPortV1,
): Promise<void> {
  const snapshots = new Map<string, Promise<ExperimentSnapshotV2>>();
  const readSnapshot = (snapshotId: string): Promise<ExperimentSnapshotV2> => {
    const cached = snapshots.get(snapshotId);
    if (cached !== undefined) return cached;
    const pending = repository.readSnapshot(snapshotId).then((snapshot) => {
      if (snapshot === null) throw new Error(`Article Snapshot ${snapshotId} is unavailable`);
      return snapshot;
    });
    snapshots.set(snapshotId, pending);
    return pending;
  };
  await Promise.all(article.blocks.map(async (block) => {
    if (block.kind !== "experiment") return;
    const snapshot = await readSnapshot(block.placement.snapshotId);
    const placement = validateExperimentPlacementAgainstSnapshotV2(
      block.placement,
      snapshot,
    );
    const model = await models.resolveModel({
      modelId: snapshot.content.modelId,
      surfaceSeriesId: snapshot.content.surfaceSeriesId,
      surfaceReleaseId: snapshot.surfaceReleaseId,
    });
    assertExperimentContentMatchesModelV2(snapshot.content, model);
    assertExperimentBriefingMatchesModelV2(placement.briefing, model);
  }));
}

function scenarioOperationsV1(value: unknown): readonly StudioAuthoringScenarioOperationV1[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error("$.command.input.scenarioOperations must be a non-empty array");
  }
  const scenarioIds = new Set<string>();
  return Object.freeze(value.map((candidate, index) => {
    const path = `$.command.input.scenarioOperations[${index}]`;
    const operation = recordV1(candidate, path);
    const scenarioId = trimmedV1(operation.scenarioId, `${path}.scenarioId`);
    if (scenarioIds.has(scenarioId)) {
      throw new Error(`${path}.scenarioId has more than one operation`);
    }
    scenarioIds.add(scenarioId);
    if (operation.operation === "remove") {
      exactKeysV1(operation, ["operation", "scenarioId"], path);
      return Object.freeze({ operation: "remove" as const, scenarioId });
    }
    if (operation.operation === "advance") {
      exactKeysV1(operation, ["operation", "scenarioId"], path);
      return Object.freeze({ operation: "advance" as const, scenarioId });
    }
    if (operation.operation === "update") {
      exactKeysV1(operation, ["controls", "label", "operation", "scenarioId"], path);
      return Object.freeze({
        operation: "update" as const,
        scenarioId,
        label: nullableTrimmedV1(operation.label, `${path}.label`),
        controls: controlAssignmentsV1(operation.controls, `${path}.controls`),
      });
    }
    if (operation.operation === "add") {
      exactKeysV1(operation, [
        "controls", "label", "operation", "scenarioId", "sourceScenarioId",
      ], path);
      return Object.freeze({
        operation: "add" as const,
        scenarioId,
        label: trimmedV1(operation.label, `${path}.label`),
        sourceScenarioId: nullableTrimmedV1(
          operation.sourceScenarioId,
          `${path}.sourceScenarioId`,
        ),
        controls: controlAssignmentsV1(operation.controls, `${path}.controls`),
      });
    }
    throw new Error(`${path}.operation is unsupported`);
  }));
}

function controlAssignmentsV1(
  value: unknown,
  path: string,
): readonly StudioAuthoringControlAssignmentV1[] {
  if (!Array.isArray(value)) throw new Error(`${path} must be an array`);
  const ids = new Set<string>();
  return Object.freeze(value.map((candidate, index) => {
    const itemPath = `${path}[${index}]`;
    const record = recordV1(candidate, itemPath);
    exactKeysV1(record, ["controlId", "value"], itemPath);
    const controlId = trimmedV1(record.controlId, `${itemPath}.controlId`);
    if (ids.has(controlId)) throw new Error(`${itemPath}.controlId is duplicated`);
    ids.add(controlId);
    return Object.freeze({
      controlId,
      value: boundedFiniteV1(
        record.value,
        `${itemPath}.value`,
        -Number.MAX_VALUE,
        Number.MAX_VALUE,
      ),
    });
  }));
}

function experimentApplyPlanV1(value: unknown): StudioExperimentApplyPlanV1 {
  const path = "$.command.input.plan";
  const plan = recordV1(value, path);
  exactKeysV1(plan, [
    "baseScenarioIds", "exactModel", "executionBudget", "expectedVersion",
    "experimentId", "observeOutputIds", "planDigest", "presentation",
    "scenarioOperations", "schemaId", "title",
  ], path);
  if (plan.schemaId !== STUDIO_EXPERIMENT_APPLY_PLAN_V1_SCHEMA_ID) {
    throw new Error("Experiment apply plan schema identity mismatch");
  }
  const experimentId = nullableTrimmedV1(plan.experimentId, `${path}.experimentId`);
  const expectedVersion = nullableVersionV1(plan.expectedVersion, `${path}.expectedVersion`);
  assertMatchingNullableIdentityV1(experimentId, expectedVersion, "Experiment plan");
  const planDigest = trimmedV1(plan.planDigest, `${path}.planDigest`);
  if (!/^[0-9a-f]{64}$/.test(planDigest)) {
    throw new Error(`${path}.planDigest must be lowercase SHA-256`);
  }
  const scenarioOperations = scenarioOperationsAtPathV1(plan.scenarioOperations, `${path}.scenarioOperations`);
  const executionBudget = executionBudgetAtPathV1(plan.executionBudget, `${path}.executionBudget`);
  assertStudioAuthoringTimeAdvanceV1(scenarioOperations, executionBudget);
  return Object.freeze({
    schemaId: STUDIO_EXPERIMENT_APPLY_PLAN_V1_SCHEMA_ID,
    planDigest,
    experimentId,
    expectedVersion,
    exactModel: exactModelPinV1(plan.exactModel, `${path}.exactModel`),
    baseScenarioIds: stringArrayV1(plan.baseScenarioIds, `${path}.baseScenarioIds`),
    title: trimmedV1(plan.title, `${path}.title`),
    scenarioOperations,
    presentation: presentationSpecAtPathV1(plan.presentation, `${path}.presentation`),
    executionBudget,
    observeOutputIds: nullableStringArrayV1(
      plan.observeOutputIds,
      `${path}.observeOutputIds`,
    ),
  });
}

function scenarioOperationsAtPathV1(
  value: unknown,
  path: string,
): readonly StudioAuthoringScenarioOperationV1[] {
  // Reuse the strict parser while retaining one canonical command shape.
  try {
    return scenarioOperationsV1(value);
  } catch (error) {
    throw new Error(`${path} is invalid`, { cause: error });
  }
}

function executionBudgetV1(value: unknown): StudioAuthoringExecutionBudgetV1 {
  return executionBudgetAtPathV1(value, "$.command.input.executionBudget");
}

function executionBudgetAtPathV1(
  value: unknown,
  path: string,
): StudioAuthoringExecutionBudgetV1 {
  const record = recordV1(value, path);
  exactKeysV1(record, [
    "advanceSeconds", "maxPresentationSteps", "wallClockTimeoutMs",
  ], path);
  return Object.freeze({
    advanceSeconds: boundedFiniteV1(record.advanceSeconds, `${path}.advanceSeconds`, 0, 120),
    maxPresentationSteps: boundedIntegerV1(
      record.maxPresentationSteps,
      `${path}.maxPresentationSteps`,
      1,
      STUDIO_AUTHORING_MAX_PRESENTATION_STEPS_V1,
    ),
    wallClockTimeoutMs: boundedIntegerV1(
      record.wallClockTimeoutMs,
      `${path}.wallClockTimeoutMs`,
      1_000,
      10 * 60_000,
    ),
  });
}

function exactModelPinV1(value: unknown, path: string): StudioAuthoringExactModelPinV1 {
  const record = recordV1(value, path);
  exactKeysV1(record, ["modelId", "surfaceReleaseId", "surfaceSeriesId"], path);
  return Object.freeze({
    modelId: trimmedV1(record.modelId, `${path}.modelId`),
    surfaceSeriesId: trimmedV1(record.surfaceSeriesId, `${path}.surfaceSeriesId`),
    surfaceReleaseId: trimmedV1(record.surfaceReleaseId, `${path}.surfaceReleaseId`),
  });
}

function articleBlockOperationsV1(
  value: unknown,
): readonly StudioAuthoringArticleBlockOperationV1[] {
  const path = "$.command.input.operations";
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${path} must be a non-empty array`);
  }
  const targets = new Set<string>();
  return Object.freeze(value.map((candidate, index) => {
    const itemPath = `${path}[${index}]`;
    const operation = recordV1(candidate, itemPath);
    const blockId = trimmedV1(operation.blockId, `${itemPath}.blockId`);
    if (targets.has(blockId)) throw new Error(`${itemPath}.blockId is duplicated`);
    targets.add(blockId);
    if (operation.operation === "remove") {
      exactKeysV1(operation, ["blockId", "operation"], itemPath);
      return Object.freeze({ operation: "remove" as const, blockId });
    }
    if (operation.operation === "replace" || operation.operation === "insert-after") {
      exactKeysV1(operation, ["block", "blockId", "operation"], itemPath);
      return Object.freeze({
        operation: operation.operation,
        blockId,
        block: operation.block as StudioArticleBlockV2,
      });
    }
    throw new Error(`${itemPath}.operation is unsupported`);
  }));
}

function presentationSpecV1(value: unknown): StudioAuthoringPresentationSpecV1 {
  return presentationSpecAtPathV1(value, "$.command.input.presentation");
}

function presentationSpecAtPathV1(
  value: unknown,
  path: string,
): StudioAuthoringPresentationSpecV1 {
  const record = recordV1(value, path);
  exactKeysV1(record, ["mode", "note"], path);
  if (record.mode !== "default" && record.mode !== "preserve") {
    throw new Error(`${path}.mode must be default or preserve`);
  }
  if (typeof record.note !== "string" || record.note.length > 20_000) {
    throw new Error(`${path}.note must be a string of at most 20000 characters`);
  }
  return Object.freeze({ mode: record.mode, note: record.note });
}

function briefingSelectionV1(value: unknown): StudioArticleBriefingSelectionV1 {
  const path = "$.command.input.selection";
  const record = recordV1(value, path);
  exactKeysV1(record, [
    "controlIds", "graphPaneIds", "initialFocusScenarioId", "outputIds",
    "title", "visibleScenarioIds", "outputScenarioMode", "controlBindingMode",
  ], path);
  if (record.outputScenarioMode !== "source-fixed" && record.outputScenarioMode !== "each-visible") {
    throw new Error(`${path}.outputScenarioMode must be source-fixed or each-visible`);
  }
  if (record.controlBindingMode !== "source-fixed" && record.controlBindingMode !== "reader-focus") {
    throw new Error(`${path}.controlBindingMode must be source-fixed or reader-focus`);
  }
  return Object.freeze({
    title: trimmedV1(record.title, `${path}.title`),
    visibleScenarioIds: nullableStringArrayV1(record.visibleScenarioIds, `${path}.visibleScenarioIds`),
    initialFocusScenarioId: nullableTrimmedV1(record.initialFocusScenarioId, `${path}.initialFocusScenarioId`),
    graphPaneIds: nullableStringArrayV1(record.graphPaneIds, `${path}.graphPaneIds`),
    outputIds: nullableStringArrayV1(record.outputIds, `${path}.outputIds`),
    controlIds: nullableStringArrayV1(record.controlIds, `${path}.controlIds`),
    outputScenarioMode: record.outputScenarioMode,
    controlBindingMode: record.controlBindingMode,
  });
}

function briefingTargetV1(value: unknown): StudioArticleBriefingPlacementTargetV1 {
  const path = "$.command.input.target";
  const record = recordV1(value, path);
  if (record.mode === "append") {
    exactKeysV1(record, ["mode"], path);
    return Object.freeze({ mode: "append" as const });
  }
  if (record.mode === "replace" || record.mode === "insert-after") {
    exactKeysV1(record, ["blockId", "mode"], path);
    return Object.freeze({
      mode: record.mode,
      blockId: trimmedV1(record.blockId, `${path}.blockId`),
    });
  }
  throw new Error(`${path}.mode is unsupported`);
}

function exactKeysV1(value: Record<string, unknown>, expected: readonly string[], path: string): void {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    throw new Error(`${path} keys must be exactly ${wanted.join(", ")}`);
  }
}

function recordV1(value: unknown, path: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${path} must be an object`);
  }
  return value as Record<string, unknown>;
}

function trimmedV1(value: unknown, path: string): string {
  if (typeof value !== "string" || value.length === 0 || value !== value.trim()) {
    throw new Error(`${path} must be a non-empty trimmed string`);
  }
  return value;
}

function nullableTrimmedV1(value: unknown, path: string): string | null {
  return value === null ? null : trimmedV1(value, path);
}

function uuidV1(value: unknown, path: string): string {
  const text = trimmedV1(value, path);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text)) {
    throw new Error(`${path} must be a UUID`);
  }
  return text;
}

function publicSlugV1(value: unknown, path: string): string {
  const text = trimmedV1(value, path);
  if (
    !/^[a-z0-9][a-z0-9-]{2,95}$/.test(text)
    || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(text)
  ) {
    throw new Error(
      `${path} must be a non-UUID slug of 3-96 lowercase alphanumeric or hyphen characters`,
    );
  }
  return text;
}

function versionV1(value: unknown, path: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new Error(`${path} must be a nonnegative integer`);
  }
  return value as number;
}

function nullableVersionV1(value: unknown, path: string): number | null {
  return value === null ? null : versionV1(value, path);
}

function boundedIntegerV1(value: unknown, path: string, minimum: number, maximum: number): number {
  if (!Number.isSafeInteger(value) || (value as number) < minimum || (value as number) > maximum) {
    throw new Error(`${path} must be an integer between ${minimum} and ${maximum}`);
  }
  return value as number;
}

function boundedFiniteV1(value: unknown, path: string, minimum: number, maximum: number): number {
  if (
    typeof value !== "number" || !Number.isFinite(value) || Object.is(value, -0)
    || value < minimum || value > maximum
  ) {
    throw new Error(`${path} must be a finite number between ${minimum} and ${maximum}`);
  }
  return value;
}

function isoTimestampV1(value: unknown, path: string): string {
  const text = trimmedV1(value, path);
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3,6}Z$/.test(text)
    || !Number.isFinite(Date.parse(text))
  ) {
    throw new Error(
      `${path} must be a UTC ISO-8601 timestamp with 3-6 fractional digits`,
    );
  }
  return text;
}

function pageLimitV1(value: unknown): number {
  return boundedIntegerV1(value, "$.command.input.limit", 1, 100);
}

function listCursorV1(
  value: unknown,
  path: string,
): StudioAuthoringListCursorV1 | null {
  if (value === null) return null;
  const cursor = recordV1(value, path);
  exactKeysV1(cursor, ["id", "timestamp"], path);
  return Object.freeze({
    timestamp: isoTimestampV1(cursor.timestamp, `${path}.timestamp`),
    id: uuidV1(cursor.id, `${path}.id`),
  });
}

function nullableStringArrayV1(value: unknown, path: string): readonly string[] | null {
  if (value === null) return null;
  return stringArrayV1(value, path);
}

function stringArrayV1(value: unknown, path: string): readonly string[] {
  if (!Array.isArray(value)) throw new Error(`${path} must be an array`);
  const seen = new Set<string>();
  return Object.freeze(value.map((candidate, index) => {
    const item = trimmedV1(candidate, `${path}[${index}]`);
    if (seen.has(item)) throw new Error(`${path}[${index}] is duplicated`);
    seen.add(item);
    return item;
  }));
}

function assertMatchingNullableIdentityV1(
  identity: string | null,
  version: number | null,
  label: string,
): void {
  if ((identity === null) !== (version === null)) {
    throw new Error(`${label} requires null identity/version for new content or both for updates`);
  }
}

function deepFreezeV1<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value as Record<string, unknown>)) deepFreezeV1(child);
    Object.freeze(value);
  }
  return value;
}

function summarizeExperimentMutationV1(experiment: ExperimentV2) {
  return Object.freeze({
    experimentId: experiment.experimentId,
    version: experiment.version,
    modelId: experiment.content.modelId,
    surfaceSeriesId: experiment.content.surfaceSeriesId,
    scenarioIds: Object.freeze(experiment.content.scenarios.map(({ scenarioId }) => scenarioId)),
  });
}

function summarizeArticleMutationV1(article: StudioArticleDraftV2) {
  return Object.freeze({
    articleId: article.articleId,
    draftVersion: article.draftVersion,
    visibility: article.visibility,
    locale: article.locale,
    title: article.title,
    tags: article.tags,
    blockCount: article.blocks.length,
  });
}

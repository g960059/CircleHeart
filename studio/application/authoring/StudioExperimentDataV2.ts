import { validReaderPreviewShapeV1 } from "./StudioReaderPreviewV1";
import {
  STUDIO_BRIEFING_PRIMARY_CONTROL_LIMIT_V2,
  STUDIO_BRIEFING_PRIMARY_OUTPUT_LIMIT_V2,
  STUDIO_EXPERIMENT_PLACEMENT_V2_SCHEMA_ID,
  STUDIO_EXPERIMENT_SNAPSHOT_V2_SCHEMA_ID,
  STUDIO_EXPERIMENT_V2_SCHEMA_ID,
  STUDIO_GRAPH_HISTORY_MAX_DEPTH_V2,
  STUDIO_GRAPH_HISTORY_MIN_DEPTH_V2,
  STUDIO_PV_TRAIL_MAX_BEATS_V2,
  STUDIO_SCENARIO_PRESET_V2_SCHEMA_ID,
  STUDIO_SWEEP_WINDOW_MAX_SEC_V2,
  STUDIO_SWEEP_WINDOW_MIN_SEC_V2,
  STUDIO_SWEEP_WINDOW_STEP_SEC_V2,
  type ExperimentContentV2,
  type ExperimentPlacementBriefingV2,
  type ExperimentPlacementV2,
  type ExperimentScenarioV2,
  type ExperimentSnapshotV2,
  type ExperimentSurfaceV2,
  type ScenarioCaptureV2,
  type ScenarioPresetV2,
  type ExperimentV2,
} from "@/studio/contracts/v2/content";
import type {
  ExperimentCaptureConfirmationV2,
  ExperimentCaptureCorrelationV2,
  ExperimentDesiredContentV2,
  ExperimentDesiredScenarioV2,
} from "@/studio/contracts/v2/authoring";
import {
  assertCaptureAdapterMatchesModelV2,
  assertModelContractV2,
  type RegisteredModelCaptureAdapterV2,
  type ModelContractV2,
} from "@/studio/contracts/v2/model";
import type { ExactModelRuntimeResolverPortV2 } from "@/studio/contracts/v2/executable";
import { studioNumericControlValueIssueV2 } from "@/studio/contracts/v2/control";

const PORTABLE_ID_V2 = /^[A-Za-z0-9][A-Za-z0-9._:/@+-]{0,255}$/;
const MAXIMUM_PORTABLE_ID_LENGTH_V2 = 256;
const MAXIMUM_JSON_DEPTH_V2 = 256;

export class StudioExperimentDataValidationErrorV2 extends Error {
  constructor(path: string, message: string) {
    super(`Studio Experiment V2 rejected ${path}: ${message}`);
    this.name = "StudioExperimentDataValidationErrorV2";
  }
}

/**
 * Validates and takes ownership of one explicitly saved mutable Experiment.
 *
 * The returned graph shares no objects with the caller and is deeply frozen.
 */
export function validateExperimentV2(
  value: unknown,
): ExperimentV2 {
  const experiment = clonePortableJsonV2(
    value,
    "$.experiment",
  ) as ExperimentV2;
  assertExactKeysV2(
    experiment,
    ["schemaId", "experimentId", "version", "content"],
    "$.experiment",
  );
  if (experiment.schemaId !== STUDIO_EXPERIMENT_V2_SCHEMA_ID) {
    throw validationErrorV2("$.experiment.schemaId", "schema identity mismatch");
  }
  requiredPortableIdV2(experiment.experimentId, "$.experiment.experimentId");
  nonnegativeSafeIntegerV2(experiment.version, "$.experiment.version");
  assertExperimentContentV2(experiment.content, "$.experiment.content");
  return experiment;
}

/** Validates detached Workbench content without manufacturing an Experiment. */
export function validateExperimentContentV2(
  value: unknown,
): ExperimentContentV2 {
  const content = clonePortableJsonV2(
    value,
    "$.content",
  ) as ExperimentContentV2;
  assertExperimentContentV2(content, "$.content");
  return content;
}

/** Owns a checkpoint-free authored Surface against an explicit Scenario set. */
export function validateExperimentSurfaceV2(
  value: unknown,
  scenarioIdValues: readonly string[],
): ExperimentSurfaceV2 {
  const surface = clonePortableJsonV2(value, "$.surface") as ExperimentSurfaceV2;
  if (scenarioIdValues.length === 0) {
    throw validationErrorV2(
      "$.scenarioIds",
      "must contain at least one Scenario ID",
    );
  }
  const scenarioIds = new Set<string>();
  scenarioIdValues.forEach((scenarioId, index) => {
    const owned = requiredPortableIdV2(scenarioId, `$.scenarioIds[${index}]`);
    assertUniqueIdV2(scenarioIds, owned, `$.scenarioIds[${index}]`);
  });
  assertExperimentSurfaceV2(surface, "$.surface", scenarioIds);
  return surface;
}

/**
 * Validates and takes ownership of an immutable Experiment snapshot.
 *
 * Snapshot identity is opaque. It is never derived from a numeric revision,
 * content hash, model package, runtime build, or certification object.
 */
export function validateExperimentSnapshotV2(
  value: unknown,
): ExperimentSnapshotV2 {
  recordV2(value, "$.snapshot");
  // A disposable cache must not invalidate the authoritative Snapshot, even
  // when it fails portable-JSON validation. Preserve all mandatory descriptors
  // and the prototype so separating the cache cannot sanitize invalid content.
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const previewDescriptor = descriptors.readerPreview;
  delete descriptors.readerPreview;
  const snapshot = clonePortableJsonV2(
    Object.create(Object.getPrototypeOf(value), descriptors),
    "$.snapshot",
  ) as ExperimentSnapshotV2;
  assertRequiredOptionalKeysV2(
    snapshot,
    ["schemaId", "snapshotId", "surfaceReleaseId", "content", "createdAt"],
    ["createdBy", "readerPreview"],
    "$.snapshot",
  );
  if (snapshot.schemaId !== STUDIO_EXPERIMENT_SNAPSHOT_V2_SCHEMA_ID) {
    throw validationErrorV2("$.snapshot.schemaId", "schema identity mismatch");
  }
  requiredPortableIdV2(snapshot.snapshotId, "$.snapshot.snapshotId");
  assertExperimentContentV2(snapshot.content, "$.snapshot.content");
  requiredPortableIdV2(
    snapshot.surfaceReleaseId,
    "$.snapshot.surfaceReleaseId",
  );
  isoTimestampV2(snapshot.createdAt, "$.snapshot.createdAt");
  if (hasOwnV2(snapshot, "createdBy")) {
    requiredPortableIdV2(snapshot.createdBy, "$.snapshot.createdBy");
  }
  if (previewDescriptor?.enumerable && "value" in previewDescriptor) {
    try {
      const readerPreview = clonePortableJsonV2(previewDescriptor.value, "$.snapshot.readerPreview");
      if (validReaderPreviewShapeV1(readerPreview)) {
        return Object.freeze({ ...snapshot, readerPreview });
      }
    } catch {
      // Corrupt or obsolete presentation caches are safe to regenerate.
    }
  }
  return snapshot;
}

/** Validates one Article projection against the exact content it captures. */
export function validateExperimentPlacementBriefingV2(
  value: unknown,
  contentValue: unknown,
): ExperimentPlacementBriefingV2 {
  const briefing = clonePortableJsonV2(
    value,
    "$.briefing",
  ) as ExperimentPlacementBriefingV2;
  const content = clonePortableJsonV2(
    contentValue,
    "$.content",
  ) as ExperimentContentV2;
  assertExperimentContentV2(content, "$.content");
  assertPlacementBriefingV2(briefing, "$.briefing");
  assertBriefingReferencesContentV2(briefing, content, "$.briefing");
  return briefing;
}

export function validateScenarioCaptureV2(value: unknown): ScenarioCaptureV2 {
  const capture = clonePortableJsonV2(value, "$.capture") as ScenarioCaptureV2;
  assertScenarioCaptureV2(capture, "$.capture");
  return capture;
}

export function validateScenarioPresetV2(value: unknown): ScenarioPresetV2 {
  const preset = clonePortableJsonV2(value, "$.preset") as ScenarioPresetV2;
  assertExactKeysV2(
    preset,
    ["schemaId", "presetId", "modelId", "title", "description", "capture"],
    "$.preset",
  );
  if (preset.schemaId !== STUDIO_SCENARIO_PRESET_V2_SCHEMA_ID) {
    throw validationErrorV2("$.preset.schemaId", "schema identity mismatch");
  }
  requiredPortableIdV2(preset.presetId, "$.preset.presetId");
  requiredPortableIdV2(preset.modelId, "$.preset.modelId");
  requiredTrimmedStringV2(preset.title, "$.preset.title");
  trimmedStringV2(preset.description, "$.preset.description");
  assertScenarioCaptureV2(preset.capture, "$.preset.capture");
  return preset;
}

export type ScenarioPresetCaptureClonerV2 = Readonly<{
  clone(value: unknown): Promise<ScenarioCaptureV2>;
}>;

/**
 * Binds Preset application to the exact executable bundle admitted by the
 * registry. Callers cannot substitute a look-alike model contract or capture
 * validator.
 *
 * The returned capture is a second detached clone, not the capture object owned
 * by either the caller or the validated Preset. No qualification is inferred.
 */
export function createScenarioPresetCaptureClonerV2(
  models: ExactModelRuntimeResolverPortV2,
): ScenarioPresetCaptureClonerV2 {
  return Object.freeze({
    async clone(value: unknown): Promise<ScenarioCaptureV2> {
      const preset = validateScenarioPresetV2(value);
      const runtime = models.resolveExactRuntime(preset.modelId);
      assertModelContractV2(runtime.contract);
      assertScenarioPresetMatchesModelV2(preset, runtime.contract);
      const capture = validateScenarioCaptureV2(preset.capture);
      await assertCaptureMatchesModelV2(
        capture,
        runtime.contract,
        runtime.captureAdapter,
        "$.preset.capture",
      );
      return capture;
    },
  });
}

/**
 * Takes ownership of Experiment content and binds every model-owned reference
 * to one exact registered model contract.
 *
 * Opaque fixture/checkpoint payload validation remains the model adapter's
 * responsibility at capture and restore.
 */
export function validateExperimentContentForModelV2(
  value: unknown,
  modelValue: unknown,
): ExperimentContentV2 {
  const content = clonePortableJsonV2(
    value,
    "$.content",
  ) as ExperimentContentV2;
  assertExperimentContentV2(content, "$.content");
  assertModelContractV2(modelValue);
  assertExperimentContentMatchesModelV2(content, modelValue);
  return content;
}

/**
 * Validates and takes ownership of checkpoint-free Save intent.
 *
 * This checkpoint-free shape cannot be persisted as an Experiment. The model-owned
 * capture port must first turn every desired fixture into a complete atomic
 * fixture/checkpoint capture.
 */
export function validateExperimentDesiredContentForModelV2(
  value: unknown,
  modelValue: unknown,
): ExperimentDesiredContentV2 {
  const desiredContent = clonePortableJsonV2(
    value,
    "$.desiredContent",
  ) as ExperimentDesiredContentV2;
  assertExperimentDesiredContentV2(desiredContent, "$.desiredContent");
  assertModelContractV2(modelValue);
  assertExperimentDesiredContentMatchesModelV2(desiredContent, modelValue);
  return desiredContent;
}

export function validateExperimentCaptureCorrelationV2(
  value: unknown,
  desiredContent: ExperimentDesiredContentV2,
): ExperimentCaptureCorrelationV2 {
  const correlation = clonePortableJsonV2(
    value,
    "$.captureCorrelation",
  ) as ExperimentCaptureCorrelationV2;
  assertExactKeysV2(
    correlation,
    ["runtimeSessionId", "scenarios"],
    "$.captureCorrelation",
  );
  requiredPortableIdV2(
    correlation.runtimeSessionId,
    "$.captureCorrelation.runtimeSessionId",
  );
  assertCaptureCorrelationScenariosV2(
    correlation.scenarios,
    desiredContent.scenarios.map(({ scenarioId }) => scenarioId),
    "$.captureCorrelation.scenarios",
  );
  return correlation;
}

export function validateExperimentCaptureConfirmationV2(
  value: unknown,
  expected: Readonly<{
    experimentId: string;
    correlation: ExperimentCaptureCorrelationV2;
  }>,
): ExperimentCaptureConfirmationV2 {
  const confirmation = clonePortableJsonV2(
    value,
    "$.captureConfirmation",
  ) as ExperimentCaptureConfirmationV2;
  assertExactKeysV2(
    confirmation,
    ["experimentId", "runtimeSessionId", "scenarios"],
    "$.captureConfirmation",
  );
  requiredPortableIdV2(
    confirmation.experimentId,
    "$.captureConfirmation.experimentId",
  );
  requiredPortableIdV2(
    confirmation.runtimeSessionId,
    "$.captureConfirmation.runtimeSessionId",
  );
  assertCaptureCorrelationScenariosV2(
    confirmation.scenarios,
    expected.correlation.scenarios.map(({ scenarioId }) => scenarioId),
    "$.captureConfirmation.scenarios",
  );
  if (
    confirmation.experimentId !== expected.experimentId ||
    confirmation.runtimeSessionId !== expected.correlation.runtimeSessionId ||
    confirmation.scenarios.some(
      (scenario, index) =>
        scenario.expectedInputEpoch !==
        expected.correlation.scenarios[index]?.expectedInputEpoch,
    )
  ) {
    throw validationErrorV2(
      "$.captureConfirmation",
      "must exactly confirm the requested Experiment, runtime session, Scenario order, and input epochs",
    );
  }
  return confirmation;
}

function assertCaptureCorrelationScenariosV2(
  value:
    | readonly Readonly<{
        scenarioId: string;
        expectedInputEpoch: number;
      }>[]
    | unknown,
  expectedScenarioIds: readonly string[],
  path: string,
): void {
  if (!Array.isArray(value) || value.length !== expectedScenarioIds.length) {
    throw validationErrorV2(
      path,
      "must contain exactly one entry for every desired Scenario in order",
    );
  }
  value.forEach((scenario, index) => {
    assertExactKeysV2(
      scenario,
      ["scenarioId", "expectedInputEpoch"],
      `${path}[${index}]`,
    );
    requiredPortableIdV2(scenario.scenarioId, `${path}[${index}].scenarioId`);
    nonnegativeSafeIntegerV2(
      scenario.expectedInputEpoch,
      `${path}[${index}].expectedInputEpoch`,
    );
    if (scenario.scenarioId !== expectedScenarioIds[index]) {
      throw validationErrorV2(
        `${path}[${index}].scenarioId`,
        "must preserve desired Scenario identity and order",
      );
    }
  });
}

export function assertExperimentContentMatchesModelV2(
  content: ExperimentContentV2,
  model: ModelContractV2,
): void {
  assertExperimentModelAndSurfaceMatchV2(content, model, "$.content");
}

/**
 * Binds analysis claims in durable presentation data to the capabilities of
 * the resolved exact Model Surface. A raw-only Surface may expose an exact PV
 * orbit, but it cannot durably claim a periodic analysis method or envelope.
 */
export function assertExperimentContentMatchesModelSurfaceCapabilitiesV2(
  content: ExperimentContentV2,
  model: ModelContractV2,
  capabilities: Readonly<{ periodicPvaSupported: boolean }>,
): void {
  assertExperimentModelAndSurfaceMatchV2(content, model, "$.content");
  if (capabilities.periodicPvaSupported) return;

  const graphsById = new Map(
    model.graphCatalog.map((definition) => [definition.graphId, definition]),
  );
  content.surface.graphPanes.forEach((pane, paneIndex) => {
    if (graphsById.get(pane.graphId)?.renderer !== "pressure-volume") return;
    const panePath = `$.content.surface.graphPanes[${paneIndex}]`;
    if (pane.pressureVolumeAnalysisMode !== "raw-exact-orbit") {
      throw validationErrorV2(
        `${panePath}.pressureVolumeAnalysisMode`,
        "resolved Model Surface has no periodic PVA analysis; must be raw-exact-orbit",
      );
    }
    if (pane.showPressureEnvelope !== undefined) {
      throw validationErrorV2(
        `${panePath}.showPressureEnvelope`,
        "resolved Model Surface has no periodic PVA analysis; must not configure an analysis envelope",
      );
    }
    if (pane.showPvaBoundary !== undefined) {
      throw validationErrorV2(`${panePath}.showPvaBoundary`,
        "resolved Model Surface has no periodic PVA analysis; must not configure an energy view");
    }
  });
}

export function assertExperimentDesiredContentMatchesModelV2(
  desiredContent: ExperimentDesiredContentV2,
  model: ModelContractV2,
): void {
  assertExperimentModelAndSurfaceMatchV2(
    desiredContent,
    model,
    "$.desiredContent",
  );
}

/** Validates Article-only control presentation values against the exact model. */
export function assertExperimentBriefingMatchesModelV2(
  briefing: ExperimentPlacementBriefingV2,
  model: ModelContractV2,
): void {
  const controlsById = new Map(
    model.controlCatalog.map((definition) => [definition.controlId, definition]),
  );
  briefing.controls.forEach((control, controlIndex) => {
    const definition = controlsById.get(control.controlId);
    const controlPath = `$.briefing.controls[${controlIndex}]`;
    if (definition === undefined) {
      throw validationErrorV2(
        `${controlPath}.controlId`,
        `unknown registered control ${control.controlId}`,
      );
    }
    if (control.presentation.kind !== "buttons") return;
    control.presentation.options.forEach((option, optionIndex) => {
      const issue = studioNumericControlValueIssueV2(
        option.value,
        definition,
      );
      if (issue !== undefined) {
        throw validationErrorV2(
          `${controlPath}.presentation.options[${optionIndex}].value`,
          issue,
        );
      }
    });
  });
}

function assertExperimentModelAndSurfaceMatchV2(
  content: Readonly<{
    modelId: string;
    scenarios: readonly Readonly<{ scenarioId: string }>[];
    surface: ExperimentSurfaceV2;
  }>,
  model: ModelContractV2,
  path: string,
): void {
  if (content.modelId !== model.modelId) {
    throw validationErrorV2(
      `${path}.modelId`,
      `must match registered model ${model.modelId}`,
    );
  }
  const graphsById = new Map(
    model.graphCatalog.map((definition) => [definition.graphId, definition]),
  );
  const outputsById = new Map(
    model.outputCatalog.map((definition) => [definition.outputId, definition]),
  );
  const controlsById = new Map(
    model.controlCatalog.map((definition) => [definition.controlId, definition]),
  );
  content.surface.graphPanes.forEach((pane, paneIndex) => {
    const panePath = `${path}.surface.graphPanes[${paneIndex}]`;
    const graph = graphsById.get(pane.graphId);
    if (graph === undefined) {
      throw validationErrorV2(
        `${panePath}.graphId`,
        `unknown registered graph ${pane.graphId}`,
      );
    }
    const scopedScenarioIds = pane.scenarioScope.mode === "fixed"
      ? pane.scenarioScope.scenarioIds
      : content.scenarios.map(({ scenarioId }) => scenarioId);
    if (pane.pvTrailBeats !== undefined && graph.renderer !== "pressure-volume") {
      throw validationErrorV2(`${panePath}.pvTrailBeats`, "only pressure-volume graphs retain completed beats");
    }
    if (pane.axisRanges !== undefined && (graph.renderer === "cycle-waveform"
      || (graph.renderer === "sweep" && pane.axisRanges.x !== undefined))) {
      throw validationErrorV2(`${panePath}.axisRanges`, "waveforms use their time window for the horizontal axis; completed-cycle graphs use automatic scaling");
    }
    if (pane.showPvaBoundary !== undefined && (graph.renderer !== "pressure-volume"
      || pane.pressureVolumeAnalysisMode === "raw-exact-orbit")) {
      throw validationErrorV2(`${panePath}.showPvaBoundary`,
        "only analysis-enabled pressure-volume graphs may configure an energy view");
    }
    if (graph.renderer === "cycle-waveform") {
      if (pane.series.length || pane.windowSec !== undefined || pane.structuralSide !== undefined
        || pane.historyDepth !== undefined || pane.pressureVolumeAnalysisMode !== undefined
        || pane.showPressureEnvelope !== undefined || pane.showPvaBoundary !== undefined
        || pane.excludedTraces.some(trace => trace.seriesId !== null))
        throw validationErrorV2(panePath, "completed-cycle graphs only configure whole-Scenario traces");
      if (scopedScenarioIds.every(id => pane.excludedTraces.some(trace => trace.scenarioId === id)))
        throw validationErrorV2(panePath, "must leave at least one visible Scenario trace");
      return;
    }
    if (graph.renderer === "structural-return") {
      if (pane.series.length !== 0) {
        throw validationErrorV2(
          `${panePath}.series`,
          "structural-return graphs must not configure series",
        );
      }
      if (pane.windowSec !== undefined) {
        throw validationErrorV2(
          `${panePath}.windowSec`,
          `${graph.renderer} graphs must not configure a waveform window`,
        );
      }
      if (pane.pressureVolumeAnalysisMode !== undefined) {
        throw validationErrorV2(
          `${panePath}.pressureVolumeAnalysisMode`,
          "structural-return graphs must not configure pressure-volume analysis",
        );
      }
      if (pane.showPressureEnvelope !== undefined) {
        throw validationErrorV2(
          `${panePath}.showPressureEnvelope`,
          "structural-return graphs must not configure a pressure-volume envelope overlay",
        );
      }
      if (pane.historyDepth === undefined) {
        throw validationErrorV2(
          `${panePath}.historyDepth`,
          "structural-return graphs must configure a history depth",
        );
      }
      if (pane.structuralSide === undefined) {
        throw validationErrorV2(
          `${panePath}.structuralSide`,
          "structural-return graphs must select exactly one circulation side",
        );
      }
      if (graph.side !== "both" && pane.structuralSide !== graph.side) {
        throw validationErrorV2(
          `${panePath}.structuralSide`,
          `registered graph only supports ${graph.side}`,
        );
      }
      const invalidExclusionIndex = pane.excludedTraces.findIndex(
        ({ seriesId }) => seriesId !== null,
      );
      if (invalidExclusionIndex >= 0) {
        throw validationErrorV2(
          `${panePath}.excludedTraces[${invalidExclusionIndex}].seriesId`,
          "structural-return exclusions must target the whole Scenario trace",
        );
      }
      const excludedScenarioIds = new Set(
        pane.excludedTraces.map(({ scenarioId }) => scenarioId),
      );
      if (scopedScenarioIds.every((scenarioId) =>
        excludedScenarioIds.has(scenarioId))) {
        throw validationErrorV2(
          `${panePath}.excludedTraces`,
          "must leave at least one visible Scenario trace",
        );
      }
      return;
    }
    const wholeScenarioExclusionIndex = pane.excludedTraces.findIndex(
      ({ seriesId }) => seriesId === null,
    );
    if (wholeScenarioExclusionIndex >= 0) {
      throw validationErrorV2(
        `${panePath}.excludedTraces[${wholeScenarioExclusionIndex}].seriesId`,
        `${graph.renderer} exclusions must select an exact series`,
      );
    }
    if (pane.structuralSide !== undefined) {
      throw validationErrorV2(
        `${panePath}.structuralSide`,
        `${graph.renderer} graphs must not configure a structural side`,
      );
    }
    if (
      graph.renderer === "pressure-volume" &&
      pane.pressureVolumeAnalysisMode === undefined
    ) {
      throw validationErrorV2(
        `${panePath}.pressureVolumeAnalysisMode`,
        "pressure-volume graphs must configure an analysis mode",
      );
    }
    if (
      graph.renderer === "pressure-volume" &&
      pane.pressureVolumeAnalysisMode === "raw-exact-orbit" &&
      pane.showPressureEnvelope !== undefined
    ) {
      throw validationErrorV2(
        `${panePath}.showPressureEnvelope`,
        "raw-exact-orbit pressure-volume graphs must not configure an analysis envelope",
      );
    }
    if (
      graph.renderer !== "pressure-volume" &&
      pane.pressureVolumeAnalysisMode !== undefined
    ) {
      throw validationErrorV2(
        `${panePath}.pressureVolumeAnalysisMode`,
        `${graph.renderer} graphs must not configure pressure-volume analysis`,
      );
    }
    if (
      graph.renderer !== "pressure-volume" &&
      pane.showPressureEnvelope !== undefined
    ) {
      throw validationErrorV2(
        `${panePath}.showPressureEnvelope`,
        `${graph.renderer} graphs must not configure a pressure-volume envelope overlay`,
      );
    }
    if (graph.renderer === "sweep" && pane.windowSec === undefined) {
      throw validationErrorV2(
        `${panePath}.windowSec`,
        "sweep graphs must configure an authored waveform window",
      );
    }
    if (graph.renderer !== "sweep" && pane.windowSec !== undefined) {
      throw validationErrorV2(
        `${panePath}.windowSec`,
        `${graph.renderer} graphs must not configure a waveform window`,
      );
    }
    if (graph.renderer === "sweep" && pane.historyDepth !== undefined) {
      throw validationErrorV2(
        `${panePath}.historyDepth`,
        "sweep graphs must not configure an explicit history depth",
      );
    }
    if (
      graph.renderer === "pressure-volume" &&
      pane.historyDepth === undefined
    ) {
      throw validationErrorV2(
        `${panePath}.historyDepth`,
        "pressure-volume graphs must configure a history depth",
      );
    }
    if (pane.series.length === 0) {
      throw validationErrorV2(
        `${panePath}.series`,
        `${graph.renderer} graphs must select at least one registered series`,
      );
    }
    const seriesById = new Map(
      graph.seriesCatalog.map((series) => [series.seriesId, series] as const),
    );
    pane.series.forEach((series, seriesIndex) => {
      if (!seriesById.has(series.seriesId)) {
        throw validationErrorV2(
          `${panePath}.series[${seriesIndex}].seriesId`,
          `unknown registered graph series ${series.seriesId}`,
        );
      }
    });
    const excludedTraceKeys = new Set(
      pane.excludedTraces.map(({ scenarioId, seriesId }) =>
        `${scenarioId}\u001f${seriesId ?? ""}`),
    );
    const hasVisibleTrace = scopedScenarioIds.some((scenarioId) =>
      pane.series.some(({ seriesId }) =>
        !excludedTraceKeys.has(`${scenarioId}\u001f${seriesId}`)));
    if (!hasVisibleTrace) {
      throw validationErrorV2(
        `${panePath}.excludedTraces`,
        "must leave at least one visible Scenario/series trace",
      );
    }
  });
  content.surface.outputPanes.forEach((pane, paneIndex) => {
    pane.items.forEach((item, itemIndex) => {
      if (!outputsById.has(item.outputId)) {
        throw validationErrorV2(
          `${path}.surface.outputPanes[${paneIndex}].items[${itemIndex}].outputId`,
          `unknown registered output ${item.outputId}`,
        );
      }
    });
  });
  content.surface.controlPanes.forEach((pane, paneIndex) => {
    pane.items.forEach((item, itemIndex) => {
      const itemPath = `${path}.surface.controlPanes[${paneIndex}].items[${itemIndex}]`;
      const definition = controlsById.get(item.controlId);
      if (definition === undefined) {
        throw validationErrorV2(
          `${itemPath}.controlId`,
          `unknown registered control ${item.controlId}`,
        );
      }
      if (item.presentation.kind === "buttons") {
        item.presentation.options.forEach((option, optionIndex) => {
          const issue = studioNumericControlValueIssueV2(
            option.value,
            definition,
          );
          if (issue !== undefined) {
            throw validationErrorV2(
              `${itemPath}.presentation.options[${optionIndex}].value`,
              issue,
            );
          }
        });
      }
    });
  });
}

export function assertExperimentFixturesMatchModelV2(
  content: ExperimentContentV2,
  model: ModelContractV2,
  adapter: RegisteredModelCaptureAdapterV2,
): void {
  assertCaptureAdapterBindingV2(adapter, model);
  content.scenarios.forEach((scenario, index) => {
    try {
      const result = adapter.validateFixture(
        Object.freeze({
          model,
          fixture: scenario.capture.fixture,
        }),
      );
      if (result !== undefined) {
        throw new Error("fixture validator must complete synchronously");
      }
    } catch (error) {
      throw validationErrorV2(
        `$.content.scenarios[${index}].capture.fixture`,
        `registered model ${model.modelId} rejected fixture: ${errorMessageV2(error)}`,
      );
    }
  });
}

export function assertExperimentDesiredFixturesMatchModelV2(
  desiredContent: ExperimentDesiredContentV2,
  model: ModelContractV2,
  adapter: RegisteredModelCaptureAdapterV2,
): void {
  assertCaptureAdapterBindingV2(adapter, model);
  desiredContent.scenarios.forEach((scenario, index) => {
    try {
      const result = adapter.validateFixture(
        Object.freeze({
          model,
          fixture: scenario.fixture,
        }),
      );
      if (result !== undefined) {
        throw new Error("fixture validator must complete synchronously");
      }
    } catch (error) {
      throw validationErrorV2(
        `$.desiredContent.scenarios[${index}].fixture`,
        `registered model ${model.modelId} rejected fixture: ${errorMessageV2(error)}`,
      );
    }
  });
}

export async function assertExperimentCapturesMatchModelV2(
  content: ExperimentContentV2,
  model: ModelContractV2,
  adapter: RegisteredModelCaptureAdapterV2,
): Promise<void> {
  for (let index = 0; index < content.scenarios.length; index += 1) {
    const scenario = content.scenarios[index];
    await assertCaptureMatchesModelV2(
      scenario.capture,
      model,
      adapter,
      `$.content.scenarios[${index}].capture`,
    );
  }
}

async function assertCaptureMatchesModelV2(
  capture: ScenarioCaptureV2,
  model: ModelContractV2,
  adapter: RegisteredModelCaptureAdapterV2,
  path: string,
): Promise<void> {
  assertCaptureAdapterBindingV2(adapter, model);
  try {
    const fixtureResult = adapter.validateFixture(
      Object.freeze({
        model,
        fixture: capture.fixture,
      }),
    );
    if (fixtureResult !== undefined) {
      throw new Error("fixture validator must complete synchronously");
    }
    await adapter.validateCapture(Object.freeze({ model, capture }));
  } catch (error) {
    throw validationErrorV2(
      path,
      `registered model ${model.modelId} rejected capture: ${errorMessageV2(error)}`,
    );
  }
}

function assertCaptureAdapterBindingV2(
  adapter: RegisteredModelCaptureAdapterV2,
  model: ModelContractV2,
): void {
  try {
    assertCaptureAdapterMatchesModelV2(adapter, model);
  } catch (error) {
    throw validationErrorV2("$.captureAdapter", errorMessageV2(error));
  }
}

function assertScenarioPresetMatchesModelV2(
  preset: ScenarioPresetV2,
  model: ModelContractV2,
): void {
  if (preset.modelId !== model.modelId) {
    throw validationErrorV2(
      "$.preset.modelId",
      `must match registered model ${model.modelId}`,
    );
  }
}

export function validateExperimentPlacementV2(
  value: unknown,
): ExperimentPlacementV2 {
  const placement = clonePortableJsonV2(
    value,
    "$.placement",
  ) as ExperimentPlacementV2;
  assertRequiredOptionalKeysV2(
    placement,
    [
      "schemaId",
      "placementId",
      "snapshotId",
      "briefing",
      "titleOverride",
      "caption",
    ],
    [],
    "$.placement",
  );
  if (placement.schemaId !== STUDIO_EXPERIMENT_PLACEMENT_V2_SCHEMA_ID) {
    throw validationErrorV2("$.placement.schemaId", "schema identity mismatch");
  }
  requiredPortableIdV2(placement.placementId, "$.placement.placementId");
  requiredPortableIdV2(placement.snapshotId, "$.placement.snapshotId");
  assertPlacementBriefingV2(placement.briefing, "$.placement.briefing");
  if (placement.titleOverride !== null) {
    requiredTrimmedStringV2(
      placement.titleOverride,
      "$.placement.titleOverride",
    );
  }
  if (placement.caption !== null) {
    requiredTrimmedStringV2(placement.caption, "$.placement.caption");
  }
  return placement;
}

/**
 * Resolves only against the immutable snapshot explicitly pinned by Placement.
 *
 * Briefing references are role-specific and must resolve entirely inside the
 * pinned Snapshot. No lookup against a mutable Experiment is
 * permitted here.
 */
export function validateExperimentPlacementAgainstSnapshotV2(
  value: unknown,
  snapshotValue: unknown,
): ExperimentPlacementV2 {
  const placement = validateExperimentPlacementV2(value);
  const snapshot = validateExperimentSnapshotV2(snapshotValue);
  if (placement.snapshotId !== snapshot.snapshotId) {
    throw validationErrorV2(
      "$.placement.snapshotId",
      "does not match the pinned snapshot",
    );
  }
  assertBriefingReferencesContentV2(
    placement.briefing,
    snapshot.content,
    "$.placement.briefing",
  );
  return placement;
}

function assertBriefingReferencesContentV2(
  briefing: ExperimentPlacementBriefingV2,
  content: ExperimentContentV2,
  path: string,
): void {
  const surface = content.surface;
  assertKnownSubsetV2(
    briefing.scenarioScope.visibleScenarioIds,
    content.scenarios.map(({ scenarioId }) => scenarioId),
    `${path}.scenarioScope.visibleScenarioIds`,
  );
  if (
    !briefing.scenarioScope.visibleScenarioIds.includes(
      briefing.scenarioScope.initialFocusScenarioId,
    )
  ) {
    throw validationErrorV2(
      `${path}.scenarioScope.initialFocusScenarioId`,
      "must be included in visibleScenarioIds",
    );
  }

  const graphPanesById = new Map(
    surface.graphPanes.map((pane) => [pane.paneId, pane] as const),
  );
  briefing.graphs.forEach((graph, graphIndex) => {
    const graphPath = `${path}.graphs[${graphIndex}]`;
    const sourcePane = graphPanesById.get(graph.paneId);
    if (sourcePane === undefined) {
      throw validationErrorV2(
        `${graphPath}.paneId`,
        `unknown graph pane ${graph.paneId}`,
      );
    }
    const overrides = graph.overrides;
    if (overrides?.series !== undefined) {
      if (sourcePane.series.length > 0 && overrides.series.length === 0) {
        throw validationErrorV2(
          `${graphPath}.overrides.series`,
          "must select at least one source graph series",
        );
      }
      assertKnownSubsetV2(
        overrides.series.map(({ seriesId }) => seriesId),
        sourcePane.series.map(({ seriesId }) => seriesId),
        `${graphPath}.overrides.series`,
        "seriesId",
      );
    }
    if (overrides?.traceColors !== undefined) {
      const selectedSeriesIds = new Set(
        (overrides.series ?? sourcePane.series).map(({ seriesId }) => seriesId),
      );
      overrides.traceColors.forEach((trace, traceIndex) => {
        const tracePath = `${graphPath}.overrides.traceColors[${traceIndex}]`;
        if (!briefing.scenarioScope.visibleScenarioIds.includes(
          trace.scenarioId,
        )) {
          throw validationErrorV2(
            `${tracePath}.scenarioId`,
            "must reference a visible Briefing Scenario",
          );
        }
        if (
          trace.seriesId === null
            ? sourcePane.series.length > 0
            : !selectedSeriesIds.has(trace.seriesId)
        ) {
          throw validationErrorV2(
            `${tracePath}.seriesId`,
            "must reference a selected source graph trace",
          );
        }
      });
    }
    if (
      overrides?.windowSec !== undefined &&
      sourcePane.windowSec === undefined
    ) {
      throw validationErrorV2(
        `${graphPath}.overrides.windowSec`,
        "source graph pane does not support a waveform window",
      );
    }
    if (
      overrides?.historyDepth !== undefined &&
      sourcePane.historyDepth === undefined
    ) {
      throw validationErrorV2(
        `${graphPath}.overrides.historyDepth`,
        "source graph pane does not support graph history",
      );
    }
    if (overrides?.pvTrailBeats !== undefined && sourcePane.pressureVolumeAnalysisMode === undefined) {
      throw validationErrorV2(`${graphPath}.overrides.pvTrailBeats`, "source graph pane does not support PV beat trails");
    }
  });

  const outputPanesById = new Map(
    surface.outputPanes.map((pane) => [pane.paneId, pane] as const),
  );
  briefing.outputs.forEach((output, index) => {
    const outputPath = `${path}.outputs[${index}]`;
    const sourcePane = outputPanesById.get(output.sourcePaneId);
    if (sourcePane === undefined) {
      throw validationErrorV2(
        `${outputPath}.sourcePaneId`,
        `unknown Surface output pane ${output.sourcePaneId}`,
      );
    }
    if (!sourcePane.items.some(({ outputId }) => outputId === output.outputId)) {
      throw validationErrorV2(
        `${outputPath}.outputId`,
        `output ${output.outputId} is not present in source pane ${output.sourcePaneId}`,
      );
    }
    if (!briefing.scenarioScope.visibleScenarioIds.includes(output.scenarioId)) {
      throw validationErrorV2(
        `${outputPath}.scenarioId`,
        `output target ${output.scenarioId} must be visible`,
      );
    }
  });

  const controlPanesById = new Map(
    surface.controlPanes.map((pane) => [pane.paneId, pane] as const),
  );
  briefing.controls.forEach((control, index) => {
    const controlPath = `${path}.controls[${index}]`;
    const sourcePane = controlPanesById.get(control.sourcePaneId);
    if (sourcePane === undefined) {
      throw validationErrorV2(
        `${controlPath}.sourcePaneId`,
        `unknown Surface control pane ${control.sourcePaneId}`,
      );
    }
    if (!sourcePane.items.some(({ controlId }) =>
      controlId === control.controlId)) {
      throw validationErrorV2(
        `${controlPath}.controlId`,
        `control ${control.controlId} is not present in source pane ${control.sourcePaneId}`,
      );
    }
    const targetScenarioIds =
      control.binding.mode === "reader-focus"
        ? control.binding.allowedScenarioIds
        : control.binding.scenarioIds;
    assertKnownSubsetV2(
      targetScenarioIds,
      briefing.scenarioScope.visibleScenarioIds,
      `${controlPath}.binding.${
        control.binding.mode === "reader-focus"
          ? "allowedScenarioIds"
          : "scenarioIds"
      }`,
    );
  });
}

function assertExperimentContentV2(
  content: ExperimentContentV2,
  path: string,
): void {
  assertRequiredOptionalKeysV2(
    content,
    ["modelId", "surfaceSeriesId", "scenarios", "surface"],
    [],
    path,
  );
  requiredPortableIdV2(content.modelId, `${path}.modelId`);
  requiredPortableIdV2(content.surfaceSeriesId, `${path}.surfaceSeriesId`);
  if (!Array.isArray(content.scenarios) || content.scenarios.length === 0) {
    throw validationErrorV2(`${path}.scenarios`, "must be a nonempty array");
  }
  const scenarioIds = new Set<string>();
  content.scenarios.forEach((scenario, index) =>
    assertExperimentScenarioV2(
      scenario,
      `${path}.scenarios[${index}]`,
      scenarioIds,
    ),
  );
  assertExperimentSurfaceV2(content.surface, `${path}.surface`, scenarioIds);
}

function assertExperimentDesiredContentV2(
  desiredContent: ExperimentDesiredContentV2,
  path: string,
): void {
  assertRequiredOptionalKeysV2(
    desiredContent,
    ["modelId", "surfaceSeriesId", "scenarios", "surface"],
    [],
    path,
  );
  requiredPortableIdV2(desiredContent.modelId, `${path}.modelId`);
  requiredPortableIdV2(
    desiredContent.surfaceSeriesId,
    `${path}.surfaceSeriesId`,
  );
  if (
    !Array.isArray(desiredContent.scenarios) ||
    desiredContent.scenarios.length === 0
  ) {
    throw validationErrorV2(`${path}.scenarios`, "must be a nonempty array");
  }
  const scenarioIds = new Set<string>();
  desiredContent.scenarios.forEach((scenario, index) =>
    assertExperimentDesiredScenarioV2(
      scenario,
      `${path}.scenarios[${index}]`,
      scenarioIds,
    ),
  );
  assertExperimentSurfaceV2(
    desiredContent.surface,
    `${path}.surface`,
    scenarioIds,
  );
}

function assertExperimentDesiredScenarioV2(
  scenario: ExperimentDesiredScenarioV2,
  path: string,
  scenarioIds: Set<string>,
): void {
  assertExactKeysV2(scenario, ["scenarioId", "label", "fixture"], path);
  const scenarioId = requiredPortableIdV2(
    scenario.scenarioId,
    `${path}.scenarioId`,
  );
  assertUniqueIdV2(scenarioIds, scenarioId, `${path}.scenarioId`);
  requiredTrimmedStringV2(scenario.label, `${path}.label`);
  // Fixture JSON portability was proven by clonePortableJsonV2.
  void scenario.fixture;
}

function assertExperimentScenarioV2(
  scenario: ExperimentScenarioV2,
  path: string,
  scenarioIds: Set<string>,
): void {
  assertExactKeysV2(scenario, ["scenarioId", "label", "capture"], path);
  const scenarioId = requiredPortableIdV2(
    scenario.scenarioId,
    `${path}.scenarioId`,
  );
  assertUniqueIdV2(scenarioIds, scenarioId, `${path}.scenarioId`);
  requiredTrimmedStringV2(scenario.label, `${path}.label`);
  assertScenarioCaptureV2(scenario.capture, `${path}.capture`);
}

function assertScenarioCaptureV2(
  capture: ScenarioCaptureV2,
  path: string,
): void {
  assertExactKeysV2(capture, ["fixture", "checkpoint"], path);
  const checkpoint = capture.checkpoint;
  assertExactKeysV2(
    checkpoint,
    ["acceptedRevision", "acceptedTimeSec", "payload"],
    `${path}.checkpoint`,
  );
  nonnegativeSafeIntegerV2(
    checkpoint.acceptedRevision,
    `${path}.checkpoint.acceptedRevision`,
  );
  nonnegativeFiniteNumberV2(
    checkpoint.acceptedTimeSec,
    `${path}.checkpoint.acceptedTimeSec`,
  );
  // Fixture and payload JSON portability was proven by clonePortableJsonV2.
  void capture.fixture;
  void checkpoint.payload;
}

function assertExperimentSurfaceV2(
  surface: ExperimentSurfaceV2,
  path: string,
  scenarioIds: ReadonlySet<string>,
): void {
  assertRequiredOptionalKeysV2(
    surface,
    ["graphPanes", "outputPanes", "controlPanes", "note"],
    ["scenarioColorSeeds"],
    path,
  );
  arrayV2(surface.graphPanes, `${path}.graphPanes`);
  arrayV2(surface.outputPanes, `${path}.outputPanes`);
  arrayV2(surface.controlPanes, `${path}.controlPanes`);
  if (surface.scenarioColorSeeds !== undefined) {
    arrayV2(surface.scenarioColorSeeds, `${path}.scenarioColorSeeds`);
    const seededScenarioIds = new Set<string>();
    surface.scenarioColorSeeds.forEach((seed, index) => {
      const seedPath = `${path}.scenarioColorSeeds[${index}]`;
      assertExactKeysV2(seed, ["scenarioId", "colorHex"], seedPath);
      const scenarioId = requiredPortableIdV2(
        seed.scenarioId,
        `${seedPath}.scenarioId`,
      );
      if (!scenarioIds.has(scenarioId)) {
        throw validationErrorV2(
          `${seedPath}.scenarioId`,
          "must reference a Scenario in the same Experiment",
        );
      }
      assertUniqueIdV2(seededScenarioIds, scenarioId, `${seedPath}.scenarioId`);
      canonicalColorHexV2(seed.colorHex, `${seedPath}.colorHex`);
    });
  }

  const paneIds = new Set<string>();
  const assertPane = (
    pane: Record<string, unknown>,
    panePath: string,
    role: "graph" | "output" | "control",
    roleOrders: Set<number>,
  ): void => {
    const paneId = requiredPortableIdV2(pane.paneId, `${panePath}.paneId`);
    assertUniqueIdV2(paneIds, paneId, `${panePath}.paneId`);
    if (pane.role !== role) {
      throw validationErrorV2(`${panePath}.role`, `must be ${role}`);
    }
    requiredTrimmedStringV2(pane.label, `${panePath}.label`);
    semanticOrderV2(pane.order, `${panePath}.order`);
    if (roleOrders.has(pane.order as number)) {
      throw validationErrorV2(
        `${panePath}.order`,
        `duplicate ${role} pane order ${String(pane.order)}`,
      );
    }
    roleOrders.add(pane.order as number);
    semanticPriorityV2(pane.priority, `${panePath}.priority`);
  };
  const assertLabeledOutputItems = (
    items: readonly unknown[],
    itemsPath: string,
  ): void => {
    const outputIds = new Set<string>();
    const orders = new Set<number>();
    items.forEach((item, index) => {
      const itemPath = `${itemsPath}[${index}]`;
      assertExactKeysV2(item, ["outputId", "label", "order"], itemPath);
      const outputId = requiredPortableIdV2(
        item.outputId,
        `${itemPath}.outputId`,
      );
      assertUniqueIdV2(outputIds, outputId, `${itemPath}.outputId`);
      requiredTrimmedStringV2(item.label, `${itemPath}.label`);
      semanticOrderV2(item.order, `${itemPath}.order`);
      assertUniqueOrderV2(orders, item.order as number, `${itemPath}.order`);
    });
  };

  const graphOrders = new Set<number>();
  surface.graphPanes.forEach((pane, index) => {
    const panePath = `${path}.graphPanes[${index}]`;
    assertRequiredOptionalKeysV2(
      pane,
      [
        "paneId",
        "role",
        "label",
        "order",
        "priority",
        "graphId",
        "scenarioScope",
        "excludedTraces",
        "series",
      ],
      [
        "windowSec",
        "axisRanges",
        "historyDepth",
        "pvTrailBeats",
        "pressureVolumeAnalysisMode",
        "showPressureEnvelope",
        "showPvaBoundary",
        "structuralSide",
        "traceColors",
      ],
      panePath,
    );
    assertPane(
      pane as unknown as Record<string, unknown>,
      panePath,
      "graph",
      graphOrders,
    );
    requiredPortableIdV2(pane.graphId, `${panePath}.graphId`);
    recordV2(pane.scenarioScope, `${panePath}.scenarioScope`);
    if (pane.scenarioScope.mode === "visible-scenarios") {
      assertExactKeysV2(
        pane.scenarioScope,
        ["mode"],
        `${panePath}.scenarioScope`,
      );
    } else if (pane.scenarioScope.mode === "fixed") {
      assertExactKeysV2(
        pane.scenarioScope,
        ["mode", "scenarioIds"],
        `${panePath}.scenarioScope`,
      );
      assertNonemptyUniquePortableIdsV2(
        pane.scenarioScope.scenarioIds,
        `${panePath}.scenarioScope.scenarioIds`,
      );
      assertKnownSubsetV2(
        pane.scenarioScope.scenarioIds,
        [...scenarioIds],
        `${panePath}.scenarioScope.scenarioIds`,
      );
    } else {
      throw validationErrorV2(
        `${panePath}.scenarioScope.mode`,
        "must be visible-scenarios or fixed",
      );
    }
    if (pane.windowSec !== undefined) {
      sweepWindowSecV2(pane.windowSec, `${panePath}.windowSec`);
    }
    if (pane.axisRanges !== undefined) {
      assertGraphAxisRangesV2(pane.axisRanges, `${panePath}.axisRanges`);
    }
    if (pane.historyDepth !== undefined) {
      graphHistoryDepthV2(pane.historyDepth, `${panePath}.historyDepth`);
    }
    if (pane.pvTrailBeats !== undefined) pvTrailBeatsV2(pane.pvTrailBeats, `${panePath}.pvTrailBeats`);
    if (
      pane.pressureVolumeAnalysisMode !== undefined &&
      pane.pressureVolumeAnalysisMode !== "raw-exact-orbit" &&
      pane.pressureVolumeAnalysisMode !== "responsive-preview" &&
      pane.pressureVolumeAnalysisMode !== "formal-periodic"
    ) {
      throw validationErrorV2(
        `${panePath}.pressureVolumeAnalysisMode`,
        "must be raw-exact-orbit, responsive-preview, or formal-periodic",
      );
    }
    if (
      pane.showPressureEnvelope !== undefined &&
      typeof pane.showPressureEnvelope !== "boolean"
    ) {
      throw validationErrorV2(
        `${panePath}.showPressureEnvelope`,
        "must be boolean",
      );
    }
    if (pane.showPvaBoundary !== undefined && typeof pane.showPvaBoundary !== "boolean") {
      throw validationErrorV2(`${panePath}.showPvaBoundary`, "must be boolean");
    }
    if (
      pane.structuralSide !== undefined &&
      pane.structuralSide !== "left" &&
      pane.structuralSide !== "right"
    ) {
      throw validationErrorV2(
        `${panePath}.structuralSide`,
        "must be left or right",
      );
    }
    arrayV2(pane.series, `${panePath}.series`);
    const seriesIds = new Set<string>();
    const seriesOrders = new Set<number>();
    pane.series.forEach((series, seriesIndex) => {
      const seriesPath = `${panePath}.series[${seriesIndex}]`;
      assertExactKeysV2(
        series,
        ["seriesId", "label", "order"],
        seriesPath,
      );
      const seriesId = requiredPortableIdV2(
        series.seriesId,
        `${seriesPath}.seriesId`,
      );
      assertUniqueIdV2(seriesIds, seriesId, `${seriesPath}.seriesId`);
      requiredTrimmedStringV2(series.label, `${seriesPath}.label`);
      semanticOrderV2(series.order, `${seriesPath}.order`);
      assertUniqueOrderV2(seriesOrders, series.order, `${seriesPath}.order`);
    });
    arrayV2(pane.excludedTraces, `${panePath}.excludedTraces`);
    const excludedTraceKeys = new Set<string>();
    pane.excludedTraces.forEach((trace, traceIndex) => {
      const tracePath = `${panePath}.excludedTraces[${traceIndex}]`;
      assertExactKeysV2(trace, ["scenarioId", "seriesId"], tracePath);
      const scenarioId = requiredPortableIdV2(
        trace.scenarioId,
        `${tracePath}.scenarioId`,
      );
      if (!scenarioIds.has(scenarioId)) {
        throw validationErrorV2(
          `${tracePath}.scenarioId`,
          "must reference a Scenario in the same Experiment",
        );
      }
      const seriesId = trace.seriesId === null
        ? null
        : requiredPortableIdV2(trace.seriesId, `${tracePath}.seriesId`);
      if (seriesId !== null && !seriesIds.has(seriesId)) {
        throw validationErrorV2(
          `${tracePath}.seriesId`,
          "must reference a selected series in the same graph pane",
        );
      }
      const traceKey = `${scenarioId}\u001f${seriesId ?? ""}`;
      if (excludedTraceKeys.has(traceKey)) {
        throw validationErrorV2(tracePath, "duplicates an excluded trace");
      }
      excludedTraceKeys.add(traceKey);
    });
    if (pane.traceColors !== undefined) {
      arrayV2(pane.traceColors, `${panePath}.traceColors`);
      const traceKeys = new Set<string>();
      pane.traceColors.forEach((trace, traceIndex) => {
        const tracePath = `${panePath}.traceColors[${traceIndex}]`;
        assertRequiredOptionalKeysV2(
          trace,
          ["scenarioId", "seriesId", "automaticColorHex"],
          ["customColorHex"],
          tracePath,
        );
        const scenarioId = requiredPortableIdV2(
          trace.scenarioId,
          `${tracePath}.scenarioId`,
        );
        if (!scenarioIds.has(scenarioId)) {
          throw validationErrorV2(
            `${tracePath}.scenarioId`,
            "must reference a Scenario in the same Experiment",
          );
        }
        const seriesId =
          trace.seriesId === null
            ? null
            : requiredPortableIdV2(trace.seriesId, `${tracePath}.seriesId`);
        if (
          seriesId !== null &&
          !pane.series.some((series) => series.seriesId === seriesId)
        ) {
          throw validationErrorV2(
            `${tracePath}.seriesId`,
            "must reference a selected series in the same graph pane",
          );
        }
        const traceKey = `${scenarioId}\u001f${seriesId ?? ""}`;
        if (traceKeys.has(traceKey)) {
          throw validationErrorV2(
            tracePath,
            "duplicates a Scenario/series trace color",
          );
        }
        traceKeys.add(traceKey);
        canonicalColorHexV2(
          trace.automaticColorHex,
          `${tracePath}.automaticColorHex`,
        );
        if (trace.customColorHex !== undefined) {
          canonicalColorHexV2(
            trace.customColorHex,
            `${tracePath}.customColorHex`,
          );
        }
      });
    }
  });

  const outputOrders = new Set<number>();
  surface.outputPanes.forEach((pane, index) => {
    const panePath = `${path}.outputPanes[${index}]`;
    assertExactKeysV2(
      pane,
      ["paneId", "role", "label", "order", "priority", "binding", "items"],
      panePath,
    );
    assertPane(
      pane as unknown as Record<string, unknown>,
      panePath,
      "output",
      outputOrders,
    );
    recordV2(pane.binding, `${panePath}.binding`);
    if (pane.binding.mode === "active-slot") {
      assertExactKeysV2(pane.binding, ["mode"], `${panePath}.binding`);
    } else if (pane.binding.mode === "fixed") {
      assertExactKeysV2(
        pane.binding,
        ["mode", "scenarioId"],
        `${panePath}.binding`,
      );
      const scenarioId = requiredPortableIdV2(
        pane.binding.scenarioId,
        `${panePath}.binding.scenarioId`,
      );
      if (!scenarioIds.has(scenarioId)) {
        throw validationErrorV2(
          `${panePath}.binding.scenarioId`,
          `unknown Scenario ${scenarioId}`,
        );
      }
    } else {
      throw validationErrorV2(
        `${panePath}.binding.mode`,
        "must be active-slot or fixed",
      );
    }
    arrayV2(pane.items, `${panePath}.items`);
    assertLabeledOutputItems(pane.items, `${panePath}.items`);
  });

  const controlOrders = new Set<number>();
  surface.controlPanes.forEach((pane, paneIndex) => {
    const panePath = `${path}.controlPanes[${paneIndex}]`;
    assertExactKeysV2(
      pane,
      ["paneId", "role", "label", "order", "priority", "binding", "items"],
      panePath,
    );
    assertPane(
      pane as unknown as Record<string, unknown>,
      panePath,
      "control",
      controlOrders,
    );
    recordV2(pane.binding, `${panePath}.binding`);
    if (pane.binding.mode === "active-slot") {
      assertExactKeysV2(pane.binding, ["mode"], `${panePath}.binding`);
    } else if (pane.binding.mode === "fixed") {
      assertExactKeysV2(
        pane.binding,
        ["mode", "scenarioIds"],
        `${panePath}.binding`,
      );
      assertNonemptyUniquePortableIdsV2(
        pane.binding.scenarioIds,
        `${panePath}.binding.scenarioIds`,
      );
      assertKnownSubsetV2(
        pane.binding.scenarioIds,
        [...scenarioIds],
        `${panePath}.binding.scenarioIds`,
      );
    } else {
      throw validationErrorV2(
        `${panePath}.binding.mode`,
        "must be active-slot or fixed",
      );
    }
    arrayV2(pane.items, `${panePath}.items`);
    const controlIds = new Set<string>();
    const itemOrders = new Set<number>();
    pane.items.forEach((item, itemIndex) => {
      const itemPath = `${panePath}.items[${itemIndex}]`;
      assertExactKeysV2(
        item,
        ["controlId", "label", "order", "presentation"],
        itemPath,
      );
      const controlId = requiredPortableIdV2(
        item.controlId,
        `${itemPath}.controlId`,
      );
      assertUniqueIdV2(controlIds, controlId, `${itemPath}.controlId`);
      requiredTrimmedStringV2(item.label, `${itemPath}.label`);
      semanticOrderV2(item.order, `${itemPath}.order`);
      assertUniqueOrderV2(itemOrders, item.order, `${itemPath}.order`);
      assertControlPresentationV2(
        item.presentation,
        `${itemPath}.presentation`,
      );
    });
  });

  assertExactKeysV2(surface.note, ["text"], `${path}.note`);
  trimmedStringV2(surface.note.text, `${path}.note.text`);
}

function assertPlacementBriefingV2(
  briefing: ExperimentPlacementBriefingV2 | undefined,
  path: string,
): asserts briefing is ExperimentPlacementBriefingV2 {
  if (briefing === undefined) {
    throw validationErrorV2(path, "must be an object when present");
  }
  assertRequiredOptionalKeysV2(
    briefing,
    ["defaultTitle", "scenarioScope", "graphs", "outputs", "controls"],
    ["presentation"],
    path,
  );
  requiredTrimmedStringV2(briefing.defaultTitle, `${path}.defaultTitle`);

  const scopePath = `${path}.scenarioScope`;
  assertExactKeysV2(
    briefing.scenarioScope,
    ["visibleScenarioIds", "initialFocusScenarioId"],
    scopePath,
  );
  arrayV2(
    briefing.scenarioScope.visibleScenarioIds,
    `${scopePath}.visibleScenarioIds`,
  );
  if (briefing.scenarioScope.visibleScenarioIds.length === 0) {
    throw validationErrorV2(
      `${scopePath}.visibleScenarioIds`,
      "must contain at least one Scenario",
    );
  }
  const visibleScenarioIds = new Set<string>();
  briefing.scenarioScope.visibleScenarioIds.forEach((value, index) => {
    const scenarioId = requiredPortableIdV2(
      value,
      `${scopePath}.visibleScenarioIds[${index}]`,
    );
    assertUniqueIdV2(
      visibleScenarioIds,
      scenarioId,
      `${scopePath}.visibleScenarioIds[${index}]`,
    );
  });
  requiredPortableIdV2(
    briefing.scenarioScope.initialFocusScenarioId,
    `${scopePath}.initialFocusScenarioId`,
  );

  arrayV2(briefing.graphs, `${path}.graphs`);
  const graphPaneIds = new Set<string>();
  const graphOrders = new Set<number>();
  briefing.graphs.forEach((graph, index) => {
    const graphPath = `${path}.graphs[${index}]`;
    assertRequiredOptionalKeysV2(
      graph,
      ["paneId", "order", "emphasis"],
      ["overrides"],
      graphPath,
    );
    const paneId = requiredPortableIdV2(graph.paneId, `${graphPath}.paneId`);
    assertUniqueIdV2(graphPaneIds, paneId, `${graphPath}.paneId`);
    semanticOrderV2(graph.order, `${graphPath}.order`);
    assertUniqueOrderV2(graphOrders, graph.order, `${graphPath}.order`);
    if (graph.emphasis !== "primary" && graph.emphasis !== "supporting") {
      throw validationErrorV2(
        `${graphPath}.emphasis`,
        "must be primary or supporting",
      );
    }
    if (hasOwnV2(graph, "overrides")) {
      assertGraphBriefingOverridesV2(graph.overrides, `${graphPath}.overrides`);
    }
  });
  if (hasOwnV2(briefing, "presentation")) {
    assertPlacementBriefingPresentationV2(
      briefing.presentation,
      graphPaneIds,
      `${path}.presentation`,
    );
  }

  arrayV2(briefing.outputs, `${path}.outputs`);
  const outputKeys = new Set<string>();
  const outputOrders = new Set<number>();
  briefing.outputs.forEach((output, index) => {
    const outputPath = `${path}.outputs[${index}]`;
    assertRequiredOptionalKeysV2(
      output,
      ["sourcePaneId", "outputId", "scenarioId", "label", "order"],
      ["emphasis"],
      outputPath,
    );
    assertBriefingItemEmphasisV2(output, outputPath);
    const sourcePaneId = requiredPortableIdV2(
      output.sourcePaneId,
      `${outputPath}.sourcePaneId`,
    );
    const outputId = requiredPortableIdV2(
      output.outputId,
      `${outputPath}.outputId`,
    );
    const scenarioId = requiredPortableIdV2(
      output.scenarioId,
      `${outputPath}.scenarioId`,
    );
    assertUniqueIdV2(
      outputKeys,
      `${sourcePaneId}\u001f${outputId}\u001f${scenarioId}`,
      outputPath,
    );
    requiredTrimmedStringV2(output.label, `${outputPath}.label`);
    semanticOrderV2(output.order, `${outputPath}.order`);
    assertUniqueOrderV2(outputOrders, output.order, `${outputPath}.order`);
  });

  arrayV2(briefing.controls, `${path}.controls`);
  const controlKeys = new Set<string>();
  const controlOrders = new Set<number>();
  briefing.controls.forEach((control, index) => {
    const controlPath = `${path}.controls[${index}]`;
    assertRequiredOptionalKeysV2(
      control,
      [
        "sourcePaneId",
        "controlId",
        "label",
        "order",
        "presentation",
        "binding",
      ],
      ["emphasis"],
      controlPath,
    );
    assertBriefingItemEmphasisV2(control, controlPath);
    const sourcePaneId = requiredPortableIdV2(
      control.sourcePaneId,
      `${controlPath}.sourcePaneId`,
    );
    const controlId = requiredPortableIdV2(
      control.controlId,
      `${controlPath}.controlId`,
    );
    assertUniqueIdV2(
      controlKeys,
      `${sourcePaneId}\u001f${controlId}`,
      controlPath,
    );
    requiredTrimmedStringV2(control.label, `${controlPath}.label`);
    semanticOrderV2(control.order, `${controlPath}.order`);
    assertUniqueOrderV2(controlOrders, control.order, `${controlPath}.order`);
    assertControlPresentationV2(
      control.presentation,
      `${controlPath}.presentation`,
    );
    assertControlBriefingBindingV2(control.binding, `${controlPath}.binding`);
  });
  assertBriefingPrimaryLimitV2(
    briefing.outputs,
    STUDIO_BRIEFING_PRIMARY_OUTPUT_LIMIT_V2,
    `${path}.outputs`,
  );
  assertBriefingPrimaryLimitV2(
    briefing.controls,
    STUDIO_BRIEFING_PRIMARY_CONTROL_LIMIT_V2,
    `${path}.controls`,
  );
}

/** Item emphasis is reading density only; absent means sealed before emphasis. */
function assertBriefingItemEmphasisV2(
  item: Readonly<{ emphasis?: unknown }>,
  path: string,
): void {
  if (!hasOwnV2(item, "emphasis")) return;
  if (item.emphasis !== "primary" && item.emphasis !== "supporting") {
    throw validationErrorV2(`${path}.emphasis`, "must be primary or supporting");
  }
}

/**
 * The primary set of one role is bounded to keep the Article's first screen
 * short; the sealed items themselves are not. Counted in sealed references.
 */
function assertBriefingPrimaryLimitV2(
  items: readonly Readonly<{ emphasis?: unknown }>[],
  limit: number,
  path: string,
): void {
  const primary = items.filter((item) => item.emphasis === "primary").length;
  if (primary > limit) {
    throw validationErrorV2(
      path,
      `must mark at most ${limit} primary items (found ${primary})`,
    );
  }
}

/**
 * The sealed reading form is layout density only. Every view pane must be a
 * selected Briefing graph, no graph may sit in two views, and a view holds one
 * or two panes. Renderer identity and numerical semantics are not touched.
 */
function assertPlacementBriefingPresentationV2(
  presentation: ExperimentPlacementBriefingV2["presentation"],
  graphPaneIds: ReadonlySet<string>,
  path: string,
): void {
  if (presentation === undefined) {
    throw validationErrorV2(path, "must be an object when present");
  }
  assertRequiredOptionalKeysV2(
    presentation,
    ["extent"],
    ["views", "analysisRecompute"],
    path,
  );
  if (!["inline", "peek", "full"].includes(presentation.extent)) {
    throw validationErrorV2(`${path}.extent`, "must be inline, peek, or full");
  }
  if (hasOwnV2(presentation, "views")) {
    arrayV2(presentation.views, `${path}.views`);
    const viewedPaneIds = new Set<string>();
    presentation.views!.forEach((view, index) => {
      const viewPath = `${path}.views[${index}]`;
      assertExactKeysV2(view, ["paneIds"], viewPath);
      arrayV2(view.paneIds, `${viewPath}.paneIds`);
      if (view.paneIds.length < 1 || view.paneIds.length > 2) {
        throw validationErrorV2(`${viewPath}.paneIds`, "must hold one or two graph panes");
      }
      view.paneIds.forEach((value, paneIndex) => {
        const paneId = requiredPortableIdV2(value, `${viewPath}.paneIds[${paneIndex}]`);
        if (!graphPaneIds.has(paneId)) {
          throw validationErrorV2(`${viewPath}.paneIds[${paneIndex}]`, "must select a Briefing graph");
        }
        assertUniqueIdV2(viewedPaneIds, paneId, `${viewPath}.paneIds[${paneIndex}]`);
      });
    });
  }
  if (
    hasOwnV2(presentation, "analysisRecompute")
    && presentation.analysisRecompute !== "on-request"
    && presentation.analysisRecompute !== "automatic"
  ) {
    throw validationErrorV2(`${path}.analysisRecompute`, "must be on-request or automatic");
  }
}

function assertGraphAxisRangesV2(value: unknown, path: string): void {
  assertRequiredOptionalKeysV2(value, [], ["x", "y"], path);
  for (const axis of ["x", "y"] as const) {
    if (!hasOwnV2(value, axis)) continue;
    const range = value[axis];
    assertExactKeysV2(range, ["minimum", "maximum"], `${path}.${axis}`);
    if (typeof range.minimum !== "number" || !Number.isFinite(range.minimum)
      || typeof range.maximum !== "number" || !Number.isFinite(range.maximum)
      || range.maximum <= range.minimum || !Number.isFinite(range.maximum - range.minimum)) {
      throw validationErrorV2(`${path}.${axis}`, "must contain finite increasing display bounds");
    }
  }
}

function assertGraphBriefingOverridesV2(
  overrides: unknown,
  path: string,
): void {
  assertRequiredOptionalKeysV2(
    overrides,
    [],
    [
      "label",
      "legend",
      "series",
      "traceColors",
      "windowSec",
      "historyDepth",
      "pvTrailBeats",
    ],
    path,
  );
  if (hasOwnV2(overrides, "label")) {
    requiredTrimmedStringV2(overrides.label, `${path}.label`);
  }
  if (
    hasOwnV2(overrides, "legend") &&
    overrides.legend !== "auto" &&
    overrides.legend !== "hidden" &&
    overrides.legend !== "compact" &&
    overrides.legend !== "full"
  ) {
    throw validationErrorV2(
      `${path}.legend`,
      "must be auto, hidden, compact, or full",
    );
  }
  if (hasOwnV2(overrides, "windowSec")) {
    sweepWindowSecV2(overrides.windowSec, `${path}.windowSec`);
  }
  if (hasOwnV2(overrides, "historyDepth")) {
    graphHistoryDepthV2(overrides.historyDepth, `${path}.historyDepth`);
  }
  if (hasOwnV2(overrides, "pvTrailBeats")) pvTrailBeatsV2(overrides.pvTrailBeats, `${path}.pvTrailBeats`);
  if (hasOwnV2(overrides, "series")) {
    arrayV2(overrides.series, `${path}.series`);
    const seriesIds = new Set<string>();
    const seriesOrders = new Set<number>();
    overrides.series.forEach((series, index) => {
      const seriesPath = `${path}.series[${index}]`;
      assertExactKeysV2(
        series,
        ["seriesId", "label", "order"],
        seriesPath,
      );
      const seriesId = requiredPortableIdV2(
        series.seriesId,
        `${seriesPath}.seriesId`,
      );
      assertUniqueIdV2(seriesIds, seriesId, `${seriesPath}.seriesId`);
      requiredTrimmedStringV2(series.label, `${seriesPath}.label`);
      semanticOrderV2(series.order, `${seriesPath}.order`);
      assertUniqueOrderV2(
        seriesOrders,
        series.order as number,
        `${seriesPath}.order`,
      );
    });
  }
  if (hasOwnV2(overrides, "traceColors")) {
    arrayV2(overrides.traceColors, `${path}.traceColors`);
    const traceKeys = new Set<string>();
    overrides.traceColors.forEach((trace, index) => {
      const tracePath = `${path}.traceColors[${index}]`;
      assertExactKeysV2(
        trace,
        ["scenarioId", "seriesId", "colorHex"],
        tracePath,
      );
      const scenarioId = requiredPortableIdV2(
        trace.scenarioId,
        `${tracePath}.scenarioId`,
      );
      const seriesId = trace.seriesId === null
        ? null
        : requiredPortableIdV2(trace.seriesId, `${tracePath}.seriesId`);
      const key = `${scenarioId}\u001f${seriesId ?? ""}`;
      if (traceKeys.has(key)) {
        throw validationErrorV2(
          tracePath,
          "duplicates a Scenario/series trace color override",
        );
      }
      traceKeys.add(key);
      canonicalColorHexV2(trace.colorHex, `${tracePath}.colorHex`);
    });
  }
}

function assertControlPresentationV2(
  presentation: unknown,
  path: string,
): void {
  recordV2(presentation, path);
  if (presentation.kind === "slider") {
    assertExactKeysV2(presentation, ["kind"], path);
    return;
  }
  if (presentation.kind !== "buttons") {
    throw validationErrorV2(`${path}.kind`, "must be slider or buttons");
  }
  assertExactKeysV2(presentation, ["kind", "options"], path);
  arrayV2(presentation.options, `${path}.options`);
  if (presentation.options.length < 2 || presentation.options.length > 6) {
    throw validationErrorV2(
      `${path}.options`,
      "button presentation must contain between 2 and 6 options",
    );
  }
  const labels = new Set<string>();
  const values = new Set<number>();
  presentation.options.forEach((option, index) => {
    const optionPath = `${path}.options[${index}]`;
    assertExactKeysV2(option, ["label", "value"], optionPath);
    requiredTrimmedStringV2(option.label, `${optionPath}.label`);
    const label = option.label as string;
    if (labels.has(label)) {
      throw validationErrorV2(
        `${optionPath}.label`,
        `duplicate button label ${label}`,
      );
    }
    labels.add(label);
    finiteNumberV2(option.value, `${optionPath}.value`);
    const value = option.value as number;
    if (values.has(value)) {
      throw validationErrorV2(
        `${optionPath}.value`,
        `duplicate button value ${String(value)}`,
      );
    }
    values.add(value);
  });
}

function assertControlBriefingBindingV2(binding: unknown, path: string): void {
  recordV2(binding, path);
  if (binding.mode === "reader-focus") {
    assertExactKeysV2(binding, ["mode", "allowedScenarioIds"], path);
    assertNonemptyUniquePortableIdsV2(
      binding.allowedScenarioIds,
      `${path}.allowedScenarioIds`,
    );
    return;
  }
  if (binding.mode !== "fixed") {
    throw validationErrorV2(`${path}.mode`, "must be reader-focus or fixed");
  }
  assertExactKeysV2(binding, ["mode", "scenarioIds", "application"], path);
  if (binding.application !== "absolute") {
    throw validationErrorV2(`${path}.application`, "must be absolute");
  }
  assertNonemptyUniquePortableIdsV2(binding.scenarioIds, `${path}.scenarioIds`);
}

function assertNonemptyUniquePortableIdsV2(value: unknown, path: string): void {
  arrayV2(value, path);
  if (value.length === 0) {
    throw validationErrorV2(path, "must contain at least one Scenario");
  }
  const seen = new Set<string>();
  value.forEach((candidate, index) => {
    const id = requiredPortableIdV2(candidate, `${path}[${index}]`);
    assertUniqueIdV2(seen, id, `${path}[${index}]`);
  });
}

function assertKnownSubsetV2(
  subset: readonly string[],
  available: readonly string[],
  path: string,
  memberField?: string,
): void {
  const availableIds = new Set(available);
  subset.forEach((id, index) => {
    if (!availableIds.has(id)) {
      throw validationErrorV2(
        `${path}[${index}]${memberField === undefined ? "" : `.${memberField}`}`,
        `unknown id ${id}`,
      );
    }
  });
}

function assertExactKeysV2(
  value: unknown,
  expected: readonly string[],
  path: string,
): asserts value is Record<string, unknown> {
  recordV2(value, path);
  const actual = Object.keys(value).sort();
  const required = [...expected].sort();
  if (
    actual.length !== required.length ||
    actual.some((key, index) => key !== required[index])
  ) {
    throw validationErrorV2(
      path,
      `keys must be exactly ${required.join(", ")}`,
    );
  }
}

function assertRequiredOptionalKeysV2(
  value: unknown,
  required: readonly string[],
  optional: readonly string[],
  path: string,
): asserts value is Record<string, unknown> {
  recordV2(value, path);
  const actual = Object.keys(value);
  const allowed = new Set([...required, ...optional]);
  const missing = required.filter((key) => !hasOwnV2(value, key));
  const unknown = actual.filter((key) => !allowed.has(key));
  if (missing.length > 0 || unknown.length > 0) {
    throw validationErrorV2(
      path,
      `field set mismatch (missing: ${missing.join(", ") || "none"}; ` +
        `unknown: ${unknown.join(", ") || "none"})`,
    );
  }
}

function recordV2(
  value: unknown,
  path: string,
): asserts value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw validationErrorV2(path, "must be an object");
  }
}

function arrayV2(
  value: unknown,
  path: string,
): asserts value is readonly unknown[] {
  if (!Array.isArray(value)) {
    throw validationErrorV2(path, "must be an array");
  }
}

function hasOwnV2(value: object, key: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function requiredPortableIdV2(value: unknown, path: string): string {
  if (
    typeof value !== "string" ||
    value.length > MAXIMUM_PORTABLE_ID_LENGTH_V2 ||
    !PORTABLE_ID_V2.test(value)
  ) {
    throw validationErrorV2(path, "must be a portable opaque ID");
  }
  return value;
}

function assertUniqueIdV2(
  seen: Set<string>,
  value: string,
  path: string,
): void {
  if (seen.has(value)) {
    throw validationErrorV2(path, `duplicate id ${value}`);
  }
  seen.add(value);
}

function assertUniqueOrderV2(
  seen: Set<number>,
  value: number,
  path: string,
): void {
  if (seen.has(value)) {
    throw validationErrorV2(path, `duplicate order ${value}`);
  }
  seen.add(value);
}

function requiredTrimmedStringV2(value: unknown, path: string): void {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.trim() !== value
  ) {
    throw validationErrorV2(path, "must be a nonempty trimmed string");
  }
}

function trimmedStringV2(value: unknown, path: string): void {
  if (typeof value !== "string" || value.trim() !== value) {
    throw validationErrorV2(path, "must be a trimmed string");
  }
}

function canonicalColorHexV2(value: unknown, path: string): void {
  if (typeof value !== "string" || !/^#[0-9a-f]{6}$/.test(value)) {
    throw validationErrorV2(
      path,
      "must be a canonical lowercase #rrggbb color",
    );
  }
}

function nonnegativeSafeIntegerV2(value: unknown, path: string): void {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw validationErrorV2(path, "must be a nonnegative safe integer");
  }
}

function nonnegativeFiniteNumberV2(value: unknown, path: string): void {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw validationErrorV2(path, "must be a nonnegative finite number");
  }
}

function finiteNumberV2(value: unknown, path: string): void {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw validationErrorV2(path, "must be a finite number");
  }
}

function sweepWindowSecV2(value: unknown, path: string): void {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < STUDIO_SWEEP_WINDOW_MIN_SEC_V2 ||
    value > STUDIO_SWEEP_WINDOW_MAX_SEC_V2 ||
    Math.abs(
      (value - STUDIO_SWEEP_WINDOW_MIN_SEC_V2) /
        STUDIO_SWEEP_WINDOW_STEP_SEC_V2 -
        Math.round(
          (value - STUDIO_SWEEP_WINDOW_MIN_SEC_V2) /
            STUDIO_SWEEP_WINDOW_STEP_SEC_V2,
        ),
    ) > 1e-9
  ) {
    throw validationErrorV2(
      path,
      `must be ${STUDIO_SWEEP_WINDOW_MIN_SEC_V2}–${STUDIO_SWEEP_WINDOW_MAX_SEC_V2} ` +
        `seconds in ${STUDIO_SWEEP_WINDOW_STEP_SEC_V2} second steps`,
    );
  }
}

function pvTrailBeatsV2(value: unknown, path: string): void {
  if (!Number.isSafeInteger(value) || (value as number) < 0 || (value as number) > STUDIO_PV_TRAIL_MAX_BEATS_V2) {
    throw validationErrorV2(path, `must be an integer from 0 to ${STUDIO_PV_TRAIL_MAX_BEATS_V2}`);
  }
}

function graphHistoryDepthV2(value: unknown, path: string): void {
  if (
    !Number.isSafeInteger(value) ||
    (value as number) < STUDIO_GRAPH_HISTORY_MIN_DEPTH_V2 ||
    (value as number) > STUDIO_GRAPH_HISTORY_MAX_DEPTH_V2
  ) {
    throw validationErrorV2(
      path,
      `must be an integer from ${STUDIO_GRAPH_HISTORY_MIN_DEPTH_V2} to ` +
        `${STUDIO_GRAPH_HISTORY_MAX_DEPTH_V2}`,
    );
  }
}

function semanticOrderV2(value: unknown, path: string): void {
  nonnegativeSafeIntegerV2(value, path);
}

function semanticPriorityV2(value: unknown, path: string): void {
  nonnegativeSafeIntegerV2(value, path);
}

function isoTimestampV2(value: unknown, path: string): void {
  const parsed = typeof value === "string" ? Date.parse(value) : Number.NaN;
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) ||
    !Number.isFinite(parsed) ||
    new Date(parsed).toISOString() !== value
  ) {
    throw validationErrorV2(
      path,
      "must be a canonical, calendar-valid ISO-8601 UTC timestamp",
    );
  }
}

function clonePortableJsonV2(
  value: unknown,
  path: string,
  ancestors: Set<object> = new Set<object>(),
  depth = 0,
): unknown {
  if (depth > MAXIMUM_JSON_DEPTH_V2) {
    throw validationErrorV2(path, "JSON nesting limit exceeded");
  }
  if (value === null || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    assertUnicodeScalarSequenceV2(value, path);
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value) || Object.is(value, -0)) {
      throw validationErrorV2(
        path,
        "JSON number must be finite and must not be negative zero",
      );
    }
    return value;
  }
  if (typeof value !== "object") {
    throw validationErrorV2(path, "must be portable JSON");
  }
  if (ancestors.has(value)) {
    throw validationErrorV2(path, "cyclic JSON is not supported");
  }

  const nextAncestors = new Set(ancestors);
  nextAncestors.add(value);
  if (Array.isArray(value)) {
    const expectedKeys = new Set([
      "length",
      ...Array.from({ length: value.length }, (_, index) => String(index)),
    ]);
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key !== "string" || !expectedKeys.has(key)) {
        throw validationErrorV2(
          path,
          "JSON arrays must be dense and have no custom properties",
        );
      }
    }
    const clone: unknown[] = [];
    for (let index = 0; index < value.length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      if (
        descriptor === undefined ||
        !descriptor.enumerable ||
        !("value" in descriptor)
      ) {
        throw validationErrorV2(
          `${path}[${index}]`,
          "JSON array entries must be enumerable data properties",
        );
      }
      clone.push(
        clonePortableJsonV2(
          descriptor.value,
          `${path}[${index}]`,
          nextAncestors,
          depth + 1,
        ),
      );
    }
    return Object.freeze(clone);
  }

  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw validationErrorV2(path, "JSON objects must be plain objects");
  }
  const ownKeys = Reflect.ownKeys(value);
  if (ownKeys.some((key) => typeof key !== "string")) {
    throw validationErrorV2(path, "JSON objects cannot have symbol keys");
  }
  const clone: Record<string, unknown> = {};
  for (const key of ownKeys as string[]) {
    assertUnicodeScalarSequenceV2(key, `${path} property name`);
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (
      descriptor === undefined ||
      !descriptor.enumerable ||
      !("value" in descriptor)
    ) {
      throw validationErrorV2(
        `${path}.${key}`,
        "JSON properties must be enumerable data properties",
      );
    }
    Object.defineProperty(clone, key, {
      value: clonePortableJsonV2(
        descriptor.value,
        `${path}.${key}`,
        nextAncestors,
        depth + 1,
      ),
      enumerable: true,
      configurable: false,
      writable: false,
    });
  }
  return Object.freeze(clone);
}

function assertUnicodeScalarSequenceV2(value: string, path: string): void {
  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);
    if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) {
        throw validationErrorV2(path, "contains an unpaired high surrogate");
      }
      index += 1;
    } else if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) {
      throw validationErrorV2(path, "contains an unpaired low surrogate");
    }
  }
}

function validationErrorV2(
  path: string,
  message: string,
): StudioExperimentDataValidationErrorV2 {
  return new StudioExperimentDataValidationErrorV2(path, message);
}

function errorMessageV2(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

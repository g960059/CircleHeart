import type { ModelFamilyIdV2, ModelIdV2 } from "./ids";
import type { ScenarioCaptureV2 } from "./content";
import type { StudioJsonObjectV2, StudioJsonValueV2 } from "./json";
import { studioNumericControlValueIssueV2 } from "./control";

/**
 * The public model contract is an allowlisted identity/reference projection
 * for the V2 foundation. Registry package metadata, build identities, release
 * labels, and integrity values cannot be smuggled through extensible catalog
 * records. Renderer-facing labels are localized by the application. Numeric
 * control ranges and graph renderer semantics are allowlisted here; there is
 * no arbitrary JSON escape hatch.
 */
export type ControlDefinitionV2 = Readonly<{
  controlId: string;
  valueType: "number";
  unit: string;
  minimum: number;
  maximum: number;
  step: number;
  defaultValue: number;
  changeSemantics: "accepted-state-warm-start" | "cold-restart";
}>;

export type ScalarGraphSeriesDefinitionV2 = Readonly<{
  kind: "scalar";
  seriesId: string;
  outputId: string;
}>;

export type PressureVolumePressureBasisV2 = "transmural" | "intracavitary";

export type PressureVolumeGraphSeriesDefinitionV2 = Readonly<{
  kind: "pressure-volume";
  seriesId: string;
  volumeOutputId: string;
  pressureOutputId: string;
  pressureBasis: PressureVolumePressureBasisV2;
  cyclePhaseOutputId: string;
}>;

export type XYGraphSeriesDefinitionV2 = Readonly<{
  kind: "xy";
  seriesId: string;
  xOutputId: string;
  yOutputId: string;
  cyclePhaseOutputId: string;
}>;
export type XYGraphDefinitionV2 = Readonly<{
  graphId: string;
  renderer: "xy";
  seriesCatalog: readonly XYGraphSeriesDefinitionV2[];
  defaultSeriesIds: readonly string[];
}>;
export type GraphSeriesDefinitionV2 =
  ScalarGraphSeriesDefinitionV2 | PressureVolumeGraphSeriesDefinitionV2 | XYGraphSeriesDefinitionV2;

export type SweepGraphDefinitionV2 = Readonly<{
  graphId: string;
  renderer: "sweep";
  seriesCatalog: readonly ScalarGraphSeriesDefinitionV2[];
  defaultSeriesIds: readonly string[];
}>;

export type PressureVolumeGraphDefinitionV2 = Readonly<{
  graphId: string;
  renderer: "pressure-volume";
  seriesCatalog: readonly PressureVolumeGraphSeriesDefinitionV2[];
  defaultSeriesIds: readonly string[];
}>;

export type StructuralReturnGraphDefinitionV2 = Readonly<{
  graphId: string;
  renderer: "structural-return";
  analysisId: string;
  side: "right" | "left" | "both";
}>;

export type GraphDefinitionV2 =
  | SweepGraphDefinitionV2
  | XYGraphDefinitionV2
  | PressureVolumeGraphDefinitionV2
  | StructuralReturnGraphDefinitionV2
  | Readonly<{ graphId: string; renderer: "cycle-waveform"; derivationId: string }>;

export type SignalOutputDefinitionV2 = Readonly<{
  outputId: string;
  kind: "signal";
  unit: string;
  /** Presentation metadata only; numerical values remain unrounded. */
  significantDigits?: number;
  shape: "scalar" | "vector";
  sampling: "accepted-step" | "event";
}>;

export type MetricOutputDefinitionV2 = Readonly<{
  outputId: string;
  kind: "metric";
  unit: string;
  /** Presentation metadata only; numerical values remain unrounded. */
  significantDigits?: number;
  shape: "scalar" | "vector";
  scope: "instant" | "beat" | "window";
  dependencies: readonly string[];
}>;

export type OutputDefinitionV2 =
  SignalOutputDefinitionV2 | MetricOutputDefinitionV2;

/**
 * Public, hash-free model surface delivered by the trusted registry.
 *
 * `modelId` is the exact registered release identity. Integrity digests and
 * build identities are deliberately absent: they remain registry internals.
 */
export type ModelContractV2 = Readonly<{
  modelId: ModelIdV2;
  modelFamilyId: ModelFamilyIdV2;
  displayName: string;
  fixtureSchemaId: string;
  checkpointCodecId: string;
  snapshotGateId: string;
  controlCatalog: readonly ControlDefinitionV2[];
  outputCatalog: readonly OutputDefinitionV2[];
  graphCatalog: readonly GraphDefinitionV2[];
}>;

export type RegisteredModelFixtureSchemaV2 = Readonly<{
  fixtureSchemaId: string;
  definition: StudioJsonObjectV2;
}>;

export type RegisteredModelCheckpointCodecV2 = Readonly<{
  checkpointCodecId: string;
  definition: StudioJsonObjectV2;
}>;

/**
 * Exact-model executable seam for opaque fixture/checkpoint validation.
 * Identity fields are checked against the registered public contract before
 * any validator is called. Capture validation is asynchronous so an adapter
 * can await exact restore before a Studio read or write becomes visible.
 */
export type RegisteredModelCaptureAdapterV2 = Readonly<{
  modelId: ModelIdV2;
  fixtureSchemaId: string;
  checkpointCodecId: string;
  validateFixture(
    input: Readonly<{
      model: ModelContractV2;
      fixture: StudioJsonValueV2;
    }>,
  ): undefined;
  validateCapture(
    input: Readonly<{
      model: ModelContractV2;
      capture: ScenarioCaptureV2;
    }>,
  ): Promise<void>;
}>;

export class ModelContractValidationErrorV2 extends Error {
  constructor(path: string, message: string) {
    super(`Studio V2 model contract rejected ${path}: ${message}`);
    this.name = "ModelContractValidationErrorV2";
  }
}

const MODEL_CONTRACT_KEYS_V2 = Object.freeze([
  "checkpointCodecId",
  "controlCatalog",
  "displayName",
  "fixtureSchemaId",
  "graphCatalog",
  "modelFamilyId",
  "modelId",
  "outputCatalog",
  "snapshotGateId",
]);
const CONTROL_KEYS_V2 = Object.freeze([
  "changeSemantics",
  "controlId",
  "defaultValue",
  "maximum",
  "minimum",
  "step",
  "unit",
  "valueType",
]);
const SWEEP_GRAPH_KEYS_V2 = Object.freeze([
  "defaultSeriesIds",
  "graphId",
  "renderer",
  "seriesCatalog",
]);
const PRESSURE_VOLUME_GRAPH_KEYS_V2 = Object.freeze([
  "defaultSeriesIds",
  "graphId",
  "renderer",
  "seriesCatalog",
]);
const STRUCTURAL_RETURN_GRAPH_KEYS_V2 = Object.freeze([
  "analysisId",
  "graphId",
  "renderer",
  "side",
]);
const SCALAR_GRAPH_SERIES_KEYS_V2 = Object.freeze([
  "kind",
  "outputId",
  "seriesId",
]);
const PRESSURE_VOLUME_GRAPH_SERIES_KEYS_V2 = Object.freeze([
  "cyclePhaseOutputId",
  "kind",
  "pressureBasis",
  "pressureOutputId",
  "seriesId",
  "volumeOutputId",
]);
const SIGNAL_OUTPUT_KEYS_V2 = Object.freeze([
  "kind",
  "outputId",
  "sampling",
  "shape",
  "unit",
]);
const METRIC_OUTPUT_KEYS_V2 = Object.freeze([
  "dependencies",
  "kind",
  "outputId",
  "scope",
  "shape",
  "unit",
]);
const PORTABLE_ID_V2 = /^[A-Za-z0-9][A-Za-z0-9._:/@+-]{0,255}$/;
const MAXIMUM_PORTABLE_JSON_DEPTH_V2 = 256;

export function assertModelContractV2(
  value: unknown,
): asserts value is ModelContractV2 {
  assertPortableStudioJsonObjectV2(value, "$");
  assertExactKeysV2(value, "$", MODEL_CONTRACT_KEYS_V2);

  assertPortableModelIdentifierV2(value.modelId, "$.modelId");
  assertPortableModelIdentifierV2(value.modelFamilyId, "$.modelFamilyId");
  assertNonEmptyTrimmedStringV2(value.displayName, "$.displayName", 512);
  assertPortableModelIdentifierV2(value.fixtureSchemaId, "$.fixtureSchemaId");
  assertPortableModelIdentifierV2(
    value.checkpointCodecId,
    "$.checkpointCodecId",
  );
  assertPortableModelIdentifierV2(value.snapshotGateId, "$.snapshotGateId");

  assertControlCatalogV2(value.controlCatalog, "$.controlCatalog");
  const outputCatalog = assertOutputCatalogV2(
    value.outputCatalog,
    "$.outputCatalog",
  );
  assertGraphCatalogV2(value.graphCatalog, "$.graphCatalog", outputCatalog);
}

export function assertCaptureAdapterMatchesModelV2(
  adapter: RegisteredModelCaptureAdapterV2,
  model: ModelContractV2,
): void {
  if (
    adapter === null ||
    typeof adapter !== "object" ||
    adapter.modelId !== model.modelId ||
    adapter.fixtureSchemaId !== model.fixtureSchemaId ||
    adapter.checkpointCodecId !== model.checkpointCodecId ||
    typeof adapter.validateFixture !== "function" ||
    typeof adapter.validateCapture !== "function"
  ) {
    throw new ModelContractValidationErrorV2(
      "$.captureAdapter",
      `must exactly match model ${model.modelId}, fixture schema ` +
        `${model.fixtureSchemaId}, and checkpoint codec ` +
        model.checkpointCodecId,
    );
  }
}

export function assertPortableModelIdentifierV2(
  value: unknown,
  path = "$.modelId",
): asserts value is string {
  if (typeof value !== "string" || !PORTABLE_ID_V2.test(value)) {
    throw new ModelContractValidationErrorV2(
      path,
      "must be a 1-256 character portable opaque ID",
    );
  }
}

export function assertPortableStudioJsonObjectV2(
  value: unknown,
  path = "$",
): asserts value is StudioJsonObjectV2 {
  assertPortableStudioJsonValueV2(value, path, new Set<object>(), 0);
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new ModelContractValidationErrorV2(
      path,
      "must be a portable JSON object",
    );
  }
}

function assertPortableStudioJsonValueV2(
  value: unknown,
  path: string,
  ancestors: Set<object>,
  depth: number,
): asserts value is StudioJsonValueV2 {
  if (depth > MAXIMUM_PORTABLE_JSON_DEPTH_V2) {
    throw new ModelContractValidationErrorV2(
      path,
      "portable JSON nesting limit exceeded",
    );
  }
  if (value === null || typeof value === "boolean") {
    return;
  }
  if (typeof value === "string") {
    assertUnicodeScalarSequenceV2(value, path);
    return;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value) || Object.is(value, -0)) {
      throw new ModelContractValidationErrorV2(
        path,
        "portable JSON numbers must be finite and must not be negative zero",
      );
    }
    return;
  }
  if (typeof value !== "object") {
    throw new ModelContractValidationErrorV2(
      path,
      `${typeof value} is outside the portable JSON data model`,
    );
  }
  if (ancestors.has(value)) {
    throw new ModelContractValidationErrorV2(
      path,
      "portable JSON must not be cyclic",
    );
  }

  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      assertPortableArrayV2(value, path, ancestors, depth);
      return;
    }
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new ModelContractValidationErrorV2(
        path,
        "portable JSON objects must be plain objects",
      );
    }
    const descriptors = Object.getOwnPropertyDescriptors(value);
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key !== "string") {
        throw new ModelContractValidationErrorV2(
          path,
          "portable JSON must not contain symbol properties",
        );
      }
      assertUnicodeScalarSequenceV2(key, `${path} property name`);
      const descriptor = descriptors[key];
      if (
        descriptor === undefined ||
        !descriptor.enumerable ||
        !("value" in descriptor)
      ) {
        throw new ModelContractValidationErrorV2(
          propertyPathV2(path, key),
          "portable JSON properties must be enumerable data",
        );
      }
      assertPortableStudioJsonValueV2(
        descriptor.value,
        propertyPathV2(path, key),
        ancestors,
        depth + 1,
      );
    }
  } finally {
    ancestors.delete(value);
  }
}

function assertPortableArrayV2(
  value: readonly unknown[],
  path: string,
  ancestors: Set<object>,
  depth: number,
): void {
  const expectedKeys = new Set<string>(["length"]);
  for (let index = 0; index < value.length; index += 1) {
    expectedKeys.add(String(index));
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (
      descriptor === undefined ||
      !descriptor.enumerable ||
      !("value" in descriptor)
    ) {
      throw new ModelContractValidationErrorV2(
        `${path}[${index}]`,
        "portable JSON arrays must be dense enumerable data",
      );
    }
    assertPortableStudioJsonValueV2(
      descriptor.value,
      `${path}[${index}]`,
      ancestors,
      depth + 1,
    );
  }
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== "string" || !expectedKeys.has(key)) {
      throw new ModelContractValidationErrorV2(
        path,
        "portable JSON arrays must not have custom properties",
      );
    }
  }
}

function mapArrayByIndexV2<TValue, TResult>(
  value: readonly TValue[],
  transform: (value: TValue, index: number) => TResult,
): TResult[] {
  const result: TResult[] = [];
  for (let index = 0; index < value.length; index += 1) {
    result.push(transform(value[index]!, index));
  }
  return result;
}

function copyArrayByIndexV2<TValue>(value: readonly TValue[]): TValue[] {
  return mapArrayByIndexV2(value, (entry) => entry);
}

export function assertControlCatalogV2(value: unknown, path: string): void {
  if (!Array.isArray(value)) {
    throw new ModelContractValidationErrorV2(path, "must be an array");
  }
  const controlIds = new Set<string>();
  for (let index = 0; index < value.length; index += 1) {
    const definition = value[index];
    const definitionPath = `${path}[${index}]`;
    if (
      definition === null ||
      typeof definition !== "object" ||
      Array.isArray(definition)
    ) {
      throw new ModelContractValidationErrorV2(
        definitionPath,
        "control definitions must be objects",
      );
    }
    const control = definition as Record<string, unknown>;
    assertExactKeysV2(definition, definitionPath, CONTROL_KEYS_V2);
    const controlId = control.controlId;
    assertPortableModelIdentifierV2(controlId, `${definitionPath}.controlId`);
    if (controlIds.has(controlId)) {
      throw new ModelContractValidationErrorV2(
        `${definitionPath}.controlId`,
        `duplicate catalog ID ${controlId}`,
      );
    }
    controlIds.add(controlId);
    if (control.valueType !== "number") {
      throw new ModelContractValidationErrorV2(
        `${definitionPath}.valueType`,
        'must be "number"',
      );
    }
    if (
      control.changeSemantics !== "accepted-state-warm-start"
      && control.changeSemantics !== "cold-restart"
    ) {
      throw new ModelContractValidationErrorV2(
        `${definitionPath}.changeSemantics`,
        'must be "accepted-state-warm-start" or "cold-restart"',
      );
    }
    assertNonEmptyTrimmedStringV2(control.unit, `${definitionPath}.unit`, 128);
    const minimum = finiteNumberV2(
      control.minimum,
      `${definitionPath}.minimum`,
    );
    const maximum = finiteNumberV2(
      control.maximum,
      `${definitionPath}.maximum`,
    );
    const step = finiteNumberV2(control.step, `${definitionPath}.step`);
    const defaultValue = finiteNumberV2(
      control.defaultValue,
      `${definitionPath}.defaultValue`,
    );
    if (!(minimum < maximum)) {
      throw new ModelContractValidationErrorV2(
        definitionPath,
        "minimum must be less than maximum",
      );
    }
    if (!(step > 0) || step > maximum - minimum) {
      throw new ModelContractValidationErrorV2(
        `${definitionPath}.step`,
        "must be positive and no larger than the control range",
      );
    }
    const maximumIssue = studioNumericControlValueIssueV2(maximum, {
      controlId,
      minimum,
      maximum,
      step,
    });
    if (maximumIssue !== undefined) {
      throw new ModelContractValidationErrorV2(
        `${definitionPath}.maximum`,
        maximumIssue,
      );
    }
    const defaultValueIssue = studioNumericControlValueIssueV2(defaultValue, {
      controlId,
      minimum,
      maximum,
      step,
    });
    if (defaultValueIssue !== undefined) {
      throw new ModelContractValidationErrorV2(
        `${definitionPath}.defaultValue`,
        defaultValueIssue,
      );
    }
  }
}

export type ValidatedOutputCatalogV2 = Readonly<{
  ids: ReadonlySet<string>;
  definitionsById: ReadonlyMap<
    string,
    Readonly<{
      shape: "scalar" | "vector";
      unit: string;
    }>
  >;
}>;

export function assertOutputCatalogV2(
  value: unknown,
  path: string,
): ValidatedOutputCatalogV2 {
  if (!Array.isArray(value)) {
    throw new ModelContractValidationErrorV2(path, "must be an array");
  }
  const ids = new Set<string>();
  const definitionsById = new Map<
    string,
    Readonly<{
      shape: "scalar" | "vector";
      unit: string;
    }>
  >();
  const metricDependencies: Array<
    Readonly<{
      outputId: string;
      path: string;
      dependencies: readonly string[];
    }>
  > = [];
  for (let index = 0; index < value.length; index += 1) {
    const definition = value[index];
    const definitionPath = `${path}[${index}]`;
    if (
      definition === null ||
      typeof definition !== "object" ||
      Array.isArray(definition)
    ) {
      throw new ModelContractValidationErrorV2(
        definitionPath,
        "output definitions must be objects",
      );
    }
    const output = definition as Record<string, unknown>;
    assertPortableModelIdentifierV2(
      output.outputId,
      `${definitionPath}.outputId`,
    );
    if (ids.has(output.outputId)) {
      throw new ModelContractValidationErrorV2(
        `${definitionPath}.outputId`,
        `duplicate output ID ${output.outputId}`,
      );
    }
    ids.add(output.outputId);
    assertNonEmptyTrimmedStringV2(output.unit, `${definitionPath}.unit`, 128);
    if (
      output.significantDigits !== undefined &&
      (!Number.isSafeInteger(output.significantDigits) ||
        (output.significantDigits as number) < 1 ||
        (output.significantDigits as number) > 12)
    ) {
      throw new ModelContractValidationErrorV2(
        `${definitionPath}.significantDigits`,
        "must be an integer from 1 through 12",
      );
    }
    if (output.shape !== "scalar" && output.shape !== "vector") {
      throw new ModelContractValidationErrorV2(
        `${definitionPath}.shape`,
        'must be "scalar" or "vector"',
      );
    }
    definitionsById.set(
      output.outputId as string,
      Object.freeze({
        shape: output.shape,
        unit: output.unit as string,
      }),
    );

    if (output.kind === "signal") {
      assertExactKeysV2(
        definition,
        definitionPath,
        output.significantDigits === undefined
          ? SIGNAL_OUTPUT_KEYS_V2
          : [
              ...SIGNAL_OUTPUT_KEYS_V2.slice(0, -1),
              "significantDigits",
              "unit",
            ],
      );
      if (output.sampling !== "accepted-step" && output.sampling !== "event") {
        throw new ModelContractValidationErrorV2(
          `${definitionPath}.sampling`,
          'must be "accepted-step" or "event"',
        );
      }
      continue;
    }
    if (output.kind === "metric") {
      assertExactKeysV2(
        definition,
        definitionPath,
        output.significantDigits === undefined
          ? METRIC_OUTPUT_KEYS_V2
          : [
              ...METRIC_OUTPUT_KEYS_V2.slice(0, -1),
              "significantDigits",
              "unit",
            ],
      );
      if (
        output.scope !== "instant" &&
        output.scope !== "beat" &&
        output.scope !== "window"
      ) {
        throw new ModelContractValidationErrorV2(
          `${definitionPath}.scope`,
          'must be "instant", "beat", or "window"',
        );
      }
      if (!Array.isArray(output.dependencies)) {
        throw new ModelContractValidationErrorV2(
          `${definitionPath}.dependencies`,
          "must be an array",
        );
      }
      const dependencies = new Set<string>();
      for (
        let dependencyIndex = 0;
        dependencyIndex < output.dependencies.length;
        dependencyIndex += 1
      ) {
        const dependency = output.dependencies[dependencyIndex];
        assertPortableModelIdentifierV2(
          dependency,
          `${definitionPath}.dependencies[${dependencyIndex}]`,
        );
        if (dependencies.has(dependency)) {
          throw new ModelContractValidationErrorV2(
            `${definitionPath}.dependencies[${dependencyIndex}]`,
            `duplicate dependency ${dependency}`,
          );
        }
        dependencies.add(dependency);
      }
      metricDependencies.push({
        outputId: output.outputId,
        path: `${definitionPath}.dependencies`,
        dependencies: [...dependencies],
      });
      continue;
    }
    throw new ModelContractValidationErrorV2(
      `${definitionPath}.kind`,
      'must be "signal" or "metric"',
    );
  }
  for (const metric of metricDependencies) {
    metric.dependencies.forEach((dependency, index) => {
      if (!ids.has(dependency)) {
        throw new ModelContractValidationErrorV2(
          `${metric.path}[${index}]`,
          `unknown output dependency ${dependency}`,
        );
      }
    });
  }
  assertAcyclicMetricDependenciesV2(metricDependencies);
  return Object.freeze({ ids, definitionsById });
}

export function assertGraphCatalogV2(
  value: unknown,
  path: string,
  outputCatalog: ValidatedOutputCatalogV2,
): void {
  if (!Array.isArray(value)) {
    throw new ModelContractValidationErrorV2(path, "must be an array");
  }
  const graphIds = new Set<string>();
  for (let index = 0; index < value.length; index += 1) {
    const definition = value[index];
    const definitionPath = `${path}[${index}]`;
    if (
      definition === null ||
      typeof definition !== "object" ||
      Array.isArray(definition)
    ) {
      throw new ModelContractValidationErrorV2(
        definitionPath,
        "graph definitions must be objects",
      );
    }
    const graph = definition as Record<string, unknown>;
    if (graph.renderer === "sweep") {
      assertExactKeysV2(definition, definitionPath, SWEEP_GRAPH_KEYS_V2);
    } else if (graph.renderer === "pressure-volume" || graph.renderer === "xy") {
      assertExactKeysV2(
        definition,
        definitionPath,
        PRESSURE_VOLUME_GRAPH_KEYS_V2,
      );
    } else if (graph.renderer === "structural-return") {
      assertExactKeysV2(
        definition,
        definitionPath,
        STRUCTURAL_RETURN_GRAPH_KEYS_V2,
      );
    } else if (graph.renderer === "cycle-waveform") {
      assertExactKeysV2(definition, definitionPath, ["derivationId", "graphId", "renderer"]);
    } else {
      throw new ModelContractValidationErrorV2(
        `${definitionPath}.renderer`,
        'must be "sweep", "pressure-volume", "xy", "structural-return", or "cycle-waveform"',
      );
    }
    const graphId = graph.graphId;
    assertPortableModelIdentifierV2(graphId, `${definitionPath}.graphId`);
    if (graphIds.has(graphId)) {
      throw new ModelContractValidationErrorV2(
        `${definitionPath}.graphId`,
        `duplicate catalog ID ${graphId}`,
      );
    }
    graphIds.add(graphId);
    if (graph.renderer === "cycle-waveform") {
      assertPortableModelIdentifierV2(graph.derivationId, `${definitionPath}.derivationId`);
      continue;
    }
    if (graph.renderer === "structural-return") {
      assertPortableModelIdentifierV2(
        graph.analysisId,
        `${definitionPath}.analysisId`,
      );
      if (
        graph.side !== "right" &&
        graph.side !== "left" &&
        graph.side !== "both"
      ) {
        throw new ModelContractValidationErrorV2(
          `${definitionPath}.side`,
          'must be "right", "left", or "both"',
        );
      }
      continue;
    }

    const seriesIds =
      graph.renderer === "sweep"
        ? assertScalarGraphSeriesCatalogV2(
            graph.seriesCatalog,
            `${definitionPath}.seriesCatalog`,
            outputCatalog,
          )
        : graph.renderer === "xy" ? assertXYGraphSeriesCatalogV2(graph.seriesCatalog, `${definitionPath}.seriesCatalog`, outputCatalog)
        : assertPressureVolumeGraphSeriesCatalogV2(
            graph.seriesCatalog,
            `${definitionPath}.seriesCatalog`,
            outputCatalog,
          );
    assertDefaultGraphSeriesIdsV2(
      graph.defaultSeriesIds,
      `${definitionPath}.defaultSeriesIds`,
      seriesIds,
    );
  }
}

function assertXYGraphSeriesCatalogV2(value: unknown, path: string, outputs: ValidatedOutputCatalogV2): ReadonlySet<string> {
  if (!Array.isArray(value) || value.length === 0) throw new ModelContractValidationErrorV2(path, "must contain XY series");
  const ids = new Set<string>(), bindings = new Set<string>();
  const units: Partial<Record<"xOutputId" | "yOutputId", string>> = {};
  value.forEach((entry, index) => {
    const at = `${path}[${index}]`, series = requiredGraphSeriesRecordV2(entry, at);
    assertExactKeysV2(series, at, ["cyclePhaseOutputId", "kind", "seriesId", "xOutputId", "yOutputId"]);
    if (series.kind !== "xy") throw new ModelContractValidationErrorV2(at, "must be an XY series");
    requiredUniqueGraphSeriesIdV2(series.seriesId, `${at}.seriesId`, ids);
    for (const key of ["xOutputId", "yOutputId"] as const) {
      const output = requiredScalarGraphOutputV2(series[key], `${at}.${key}`, outputs);
      if (units[key] !== undefined && units[key] !== output.unit) throw new ModelContractValidationErrorV2(at, "XY axis units must match across series");
      units[key] = output.unit;
    }
    const phase = requiredScalarGraphOutputV2(series.cyclePhaseOutputId, `${at}.cyclePhaseOutputId`, outputs);
    if (phase.unit !== "1") throw new ModelContractValidationErrorV2(at, "XY phase must be dimensionless");
    const binding = `${series.xOutputId}\0${series.yOutputId}\0${series.cyclePhaseOutputId}`;
    if (bindings.has(binding)) throw new ModelContractValidationErrorV2(at, "duplicate XY output binding");
    bindings.add(binding);
  });
  return ids;
}

function assertScalarGraphSeriesCatalogV2(
  value: unknown,
  path: string,
  outputCatalog: ValidatedOutputCatalogV2,
): ReadonlySet<string> {
  if (!Array.isArray(value) || value.length === 0) {
    throw new ModelContractValidationErrorV2(
      path,
      "must be a nonempty array of scalar graph series",
    );
  }
  const seriesIds = new Set<string>();
  const outputIds = new Set<string>();
  let sharedUnit: string | undefined;
  for (let index = 0; index < value.length; index += 1) {
    const series = requiredGraphSeriesRecordV2(
      value[index],
      `${path}[${index}]`,
    );
    assertExactKeysV2(series, `${path}[${index}]`, SCALAR_GRAPH_SERIES_KEYS_V2);
    if (series.kind !== "scalar") {
      throw new ModelContractValidationErrorV2(
        `${path}[${index}].kind`,
        'must be "scalar"',
      );
    }
    const seriesId = requiredUniqueGraphSeriesIdV2(
      series.seriesId,
      `${path}[${index}].seriesId`,
      seriesIds,
    );
    const output = requiredScalarGraphOutputV2(
      series.outputId,
      `${path}[${index}].outputId`,
      outputCatalog,
    );
    if (outputIds.has(series.outputId as string)) {
      throw new ModelContractValidationErrorV2(
        `${path}[${index}].outputId`,
        `duplicate scalar output binding ${series.outputId}`,
      );
    }
    outputIds.add(series.outputId as string);
    if (sharedUnit === undefined) {
      sharedUnit = output.unit;
    } else if (output.unit !== sharedUnit) {
      throw new ModelContractValidationErrorV2(
        `${path}[${index}].outputId`,
        `sweep series must share one unit; expected ${sharedUnit} but ${seriesId} uses ${output.unit}`,
      );
    }
  }
  return seriesIds;
}

function assertPressureVolumeGraphSeriesCatalogV2(
  value: unknown,
  path: string,
  outputCatalog: ValidatedOutputCatalogV2,
): ReadonlySet<string> {
  if (!Array.isArray(value) || value.length === 0) {
    throw new ModelContractValidationErrorV2(
      path,
      "must be a nonempty array of pressure-volume graph series",
    );
  }
  const seriesIds = new Set<string>();
  const bindings = new Set<string>();
  const roleUnits: Partial<
    Record<"volumeOutputId" | "pressureOutputId" | "cyclePhaseOutputId", string>
  > = {};
  for (let index = 0; index < value.length; index += 1) {
    const seriesPath = `${path}[${index}]`;
    const series = requiredGraphSeriesRecordV2(value[index], seriesPath);
    assertExactKeysV2(series, seriesPath, PRESSURE_VOLUME_GRAPH_SERIES_KEYS_V2);
    if (series.kind !== "pressure-volume") {
      throw new ModelContractValidationErrorV2(
        `${seriesPath}.kind`,
        'must be "pressure-volume"',
      );
    }
    requiredUniqueGraphSeriesIdV2(
      series.seriesId,
      `${seriesPath}.seriesId`,
      seriesIds,
    );
    const bindingOutputIds: string[] = [];
    for (const key of [
      "volumeOutputId",
      "pressureOutputId",
      "cyclePhaseOutputId",
    ] as const) {
      const output = requiredScalarGraphOutputV2(
        series[key],
        `${seriesPath}.${key}`,
        outputCatalog,
      );
      bindingOutputIds.push(series[key] as string);
      if (roleUnits[key] === undefined) {
        roleUnits[key] = output.unit;
      } else if (roleUnits[key] !== output.unit) {
        throw new ModelContractValidationErrorV2(
          `${seriesPath}.${key}`,
          `pressure-volume ${key} units must match across series; expected ${roleUnits[key]} but found ${output.unit}`,
        );
      }
    }
    const bindingKey = bindingOutputIds.join("\u0000");
    if (bindings.has(bindingKey)) {
      throw new ModelContractValidationErrorV2(
        seriesPath,
        "duplicate pressure-volume output binding",
      );
    }
    bindings.add(bindingKey);
    if (
      series.pressureBasis !== "transmural" &&
      series.pressureBasis !== "intracavitary"
    ) {
      throw new ModelContractValidationErrorV2(
        `${seriesPath}.pressureBasis`,
        'must be "transmural" or "intracavitary"',
      );
    }
  }
  return seriesIds;
}

function requiredGraphSeriesRecordV2(
  value: unknown,
  path: string,
): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new ModelContractValidationErrorV2(
      path,
      "graph series definitions must be objects",
    );
  }
  return value as Record<string, unknown>;
}

function requiredUniqueGraphSeriesIdV2(
  value: unknown,
  path: string,
  seriesIds: Set<string>,
): string {
  assertPortableModelIdentifierV2(value, path);
  if (seriesIds.has(value)) {
    throw new ModelContractValidationErrorV2(
      path,
      `duplicate graph series ID ${value}`,
    );
  }
  seriesIds.add(value);
  return value;
}

function requiredScalarGraphOutputV2(
  value: unknown,
  path: string,
  outputCatalog: ValidatedOutputCatalogV2,
): Readonly<{ shape: "scalar" | "vector"; unit: string }> {
  assertPortableModelIdentifierV2(value, path);
  const output = outputCatalog.definitionsById.get(value);
  if (output === undefined) {
    throw new ModelContractValidationErrorV2(
      path,
      `unknown output ID ${value}`,
    );
  }
  if (output.shape !== "scalar") {
    throw new ModelContractValidationErrorV2(
      path,
      `graph output ${value} must be scalar`,
    );
  }
  return output;
}

function assertDefaultGraphSeriesIdsV2(
  value: unknown,
  path: string,
  seriesIds: ReadonlySet<string>,
): void {
  if (!Array.isArray(value) || value.length === 0) {
    throw new ModelContractValidationErrorV2(
      path,
      "must be a nonempty array of graph series IDs",
    );
  }
  const defaultIds = new Set<string>();
  for (let index = 0; index < value.length; index += 1) {
    const seriesId = value[index];
    assertPortableModelIdentifierV2(seriesId, `${path}[${index}]`);
    if (!seriesIds.has(seriesId)) {
      throw new ModelContractValidationErrorV2(
        `${path}[${index}]`,
        `unknown graph series ID ${seriesId}`,
      );
    }
    if (defaultIds.has(seriesId)) {
      throw new ModelContractValidationErrorV2(
        `${path}[${index}]`,
        `duplicate default graph series ID ${seriesId}`,
      );
    }
    defaultIds.add(seriesId);
  }
}

function assertAcyclicMetricDependenciesV2(
  metrics: readonly Readonly<{
    outputId: string;
    path: string;
    dependencies: readonly string[];
  }>[],
): void {
  const dependenciesByMetric = new Map(
    metrics.map((metric) => [metric.outputId, metric.dependencies]),
  );
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (outputId: string): void => {
    if (visited.has(outputId)) return;
    if (visiting.has(outputId)) {
      const metric = metrics.find(
        (candidate) => candidate.outputId === outputId,
      );
      throw new ModelContractValidationErrorV2(
        metric?.path ?? "$.outputCatalog",
        `cyclic metric dependency involving ${outputId}`,
      );
    }
    visiting.add(outputId);
    for (const dependency of dependenciesByMetric.get(outputId) ?? []) {
      if (dependenciesByMetric.has(dependency)) visit(dependency);
    }
    visiting.delete(outputId);
    visited.add(outputId);
  };
  metrics.forEach(({ outputId }) => visit(outputId));
}

function assertExactKeysV2(
  value: unknown,
  path: string,
  expectedKeys: readonly string[],
): void {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new ModelContractValidationErrorV2(path, "must be an object");
  }
  const actualKeys = Object.keys(value).sort();
  if (
    actualKeys.length !== expectedKeys.length ||
    actualKeys.some((key, index) => key !== expectedKeys[index])
  ) {
    throw new ModelContractValidationErrorV2(
      path,
      `must contain exactly: ${expectedKeys.join(", ")}`,
    );
  }
}

function assertNonEmptyTrimmedStringV2(
  value: unknown,
  path: string,
  maximumLength: number,
): asserts value is string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > maximumLength ||
    value.trim() !== value
  ) {
    throw new ModelContractValidationErrorV2(
      path,
      `must be a non-empty trimmed string up to ${maximumLength} characters`,
    );
  }
}

function finiteNumberV2(value: unknown, path: string): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    Object.is(value, -0)
  ) {
    throw new ModelContractValidationErrorV2(
      path,
      "must be a finite number other than negative zero",
    );
  }
  return value;
}

function assertUnicodeScalarSequenceV2(value: string, path: string): void {
  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);
    if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) {
        throw new ModelContractValidationErrorV2(
          path,
          "contains an unpaired high surrogate",
        );
      }
      index += 1;
    } else if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) {
      throw new ModelContractValidationErrorV2(
        path,
        "contains an unpaired low surrogate",
      );
    }
  }
}

function propertyPathV2(parent: string, key: string): string {
  return `${parent}[${JSON.stringify(key)}]`;
}

import type {
  ControlDefinitionV2,
  GraphDefinitionV2,
  MetricOutputDefinitionV2,
  ModelContractV2,
  RegisteredModelCheckpointCodecV2,
  RegisteredModelFixtureSchemaV2,
  SignalOutputDefinitionV2,
} from "./model";
import {
  assertControlCatalogV2,
  assertGraphCatalogV2,
  assertModelContractV2,
  assertOutputCatalogV2,
  assertPortableModelIdentifierV2,
  assertPortableStudioJsonObjectV2,
} from "./model";
import { studioNumericControlValueIssueV2 } from "./control";
import type { StudioJsonObjectV2 } from "./json";

export const STUDIO_EXACT_MODEL_KERNEL_V3_SCHEMA_ID =
  "circleheart-studio-exact-model-kernel-v3" as const;
export const STUDIO_MODEL_SURFACE_RELEASE_V1_SCHEMA_ID =
  "circleheart-studio-model-surface-release-v1" as const;
export const STUDIO_COMMON_SNAPSHOT_ADMISSION_ID_V1 =
  "circleheart.studio.common-snapshot-admission.v1" as const;

export type StudioReleaseStageV1 = "dev" | "stable" | "retired";

/**
 * Exact numerical identity for the Standard executable ABI.
 *
 * Presentation catalogs and Snapshot admission are deliberately impossible to
 * encode in this shape. Adding either would fail exact-key validation rather
 * than silently churning modelId for ordinary Studio product work.
 */
export type ExactModelKernelManifestV3 = Readonly<{
  schemaId: typeof STUDIO_EXACT_MODEL_KERNEL_V3_SCHEMA_ID;
  modelId: string;
  modelFamilyId: string;
  equations: StudioJsonObjectV2;
  runtime: StudioJsonObjectV2;
  solver: StudioJsonObjectV2;
  fixtureSchema: RegisteredModelFixtureSchemaV2;
  checkpointCodec: RegisteredModelCheckpointCodecV2;
  primitiveControlCatalog: readonly ControlDefinitionV2[];
  primitiveSignalCatalog: readonly SignalOutputDefinitionV2[];
  /** Metrics accumulated by the exact Session from accepted substeps. */
  modelMetricCatalog: readonly MetricOutputDefinitionV2[];
  capabilities: readonly string[];
}>;

export type ModelSurfaceControlDefinitionV1 = Readonly<{
  controlId: string;
  preferredPresentation: "slider" | "buttons";
  requiredCapabilities: readonly string[];
}>;

export type ModelSurfaceDerivedOutputDefinitionV1 =
  MetricOutputDefinitionV2 & Readonly<{
    derivationId: string;
    requiredCapabilities: readonly string[];
  }>;

export type ModelSurfaceGraphDefinitionV1 = GraphDefinitionV2 & Readonly<{
  requiredCapabilities: readonly string[];
}>;

export type ModelSurfaceKnobTargetV1 = Readonly<{
  controlId: string;
  scale: number;
  offset: number;
}>;

export type ModelSurfaceAffineNumericKnobDefinitionV1 = Readonly<{
  kind: "affine-numeric";
  knobId: string;
  unit: string;
  minimum: number;
  maximum: number;
  step: number;
  defaultValue: number;
  requiredCapabilities: readonly string[];
  targets: readonly ModelSurfaceKnobTargetV1[];
}>;

/** V1 exposes one explicit mapping kind; future kinds extend this union. */
export type ModelSurfaceKnobDefinitionV1 =
  ModelSurfaceAffineNumericKnobDefinitionV1;

export type ModelSurfaceProtocolActionV1 = Readonly<{
  controlId: string;
  value: number;
}>;

export type ModelSurfaceProtocolStepV1 = Readonly<{
  atSec: number;
  actions: readonly ModelSurfaceProtocolActionV1[];
}>;

export type ModelSurfaceProtocolDefinitionV1 = Readonly<{
  protocolId: string;
  requiredCapabilities: readonly string[];
  steps: readonly ModelSurfaceProtocolStepV1[];
}>;

/**
 * Immutable authoring/analysis surface compatible with one model family.
 * Locale strings and authored labels/colors stay outside this semantic row.
 */
export type ModelSurfaceReleaseManifestV1 = Readonly<{
  schemaId: typeof STUDIO_MODEL_SURFACE_RELEASE_V1_SCHEMA_ID;
  surfaceReleaseId: string;
  surfaceSeriesId: string;
  predecessorSurfaceReleaseId: string | null;
  modelFamilyId: string;
  displayName: string;
  /** Exact outputs intentionally exposed by this Surface. */
  exposedExactOutputIds: readonly string[];
  controlCatalog: readonly ModelSurfaceControlDefinitionV1[];
  derivedOutputCatalog: readonly ModelSurfaceDerivedOutputDefinitionV1[];
  graphCatalog: readonly ModelSurfaceGraphDefinitionV1[];
  knobCatalog: readonly ModelSurfaceKnobDefinitionV1[];
  protocolCatalog: readonly ModelSurfaceProtocolDefinitionV1[];
}>;

/**
 * Runtime projection of one immutable release for one pinned exact model.
 * It intentionally does not masquerade as the registered manifest: filtering
 * unsupported additions must never change the bytes named by surfaceReleaseId.
 */
export type MaterializedModelSurfaceV1 = Readonly<{
  surfaceReleaseId: string;
  modelFamilyId: string;
  exposedExactOutputIds: readonly string[];
  controlCatalog: readonly ModelSurfaceControlDefinitionV1[];
  derivedOutputCatalog: readonly ModelSurfaceDerivedOutputDefinitionV1[];
  graphCatalog: readonly ModelSurfaceGraphDefinitionV1[];
  knobCatalog: readonly ModelSurfaceKnobDefinitionV1[];
  protocolCatalog: readonly ModelSurfaceProtocolDefinitionV1[];
}>;

export type ComposedStandardModelContractV1 = Readonly<{
  exactContract: ModelContractV2;
  contract: ModelContractV2;
  surface: MaterializedModelSurfaceV1;
}>;

export class ModelSurfaceValidationErrorV1 extends Error {
  constructor(path: string, message: string) {
    super(`Studio model surface rejected ${path}: ${message}`);
    this.name = "ModelSurfaceValidationErrorV1";
  }
}

const KERNEL_KEYS_V3 = Object.freeze([
  "capabilities",
  "checkpointCodec",
  "equations",
  "fixtureSchema",
  "modelFamilyId",
  "modelId",
  "modelMetricCatalog",
  "primitiveControlCatalog",
  "primitiveSignalCatalog",
  "runtime",
  "schemaId",
  "solver",
]);

const SURFACE_KEYS_V1 = Object.freeze([
  "controlCatalog",
  "derivedOutputCatalog",
  "displayName",
  "exposedExactOutputIds",
  "graphCatalog",
  "knobCatalog",
  "modelFamilyId",
  "predecessorSurfaceReleaseId",
  "protocolCatalog",
  "schemaId",
  "surfaceReleaseId",
  "surfaceSeriesId",
]);

export function assertStudioReleaseStageV1(
  value: unknown,
  path = "$.stage",
): asserts value is StudioReleaseStageV1 {
  if (value !== "dev" && value !== "stable" && value !== "retired") {
    throw new ModelSurfaceValidationErrorV1(
      path,
      'must be "dev", "stable", or "retired"',
    );
  }
}

export function assertExactModelKernelManifestV3(
  value: unknown,
): asserts value is ExactModelKernelManifestV3 {
  assertPortableStudioJsonObjectV2(value, "$.kernel");
  assertRequiredAndOptionalKeysV1(
    value,
    KERNEL_KEYS_V3,
    [],
    "$.kernel",
  );
  const kernel = value as unknown as Record<string, unknown>;
  if (kernel.schemaId !== STUDIO_EXACT_MODEL_KERNEL_V3_SCHEMA_ID) {
    throw new ModelSurfaceValidationErrorV1(
      "$.kernel.schemaId",
      "schema identity mismatch",
    );
  }
  assertPortableModelIdentifierV2(kernel.modelId, "$.kernel.modelId");
  assertPortableModelIdentifierV2(
    kernel.modelFamilyId,
    "$.kernel.modelFamilyId",
  );
  assertNonemptyObjectV1(kernel.equations, "$.kernel.equations");
  assertNonemptyObjectV1(kernel.runtime, "$.kernel.runtime");
  assertNonemptyObjectV1(kernel.solver, "$.kernel.solver");
  assertDefinitionV1(
    kernel.fixtureSchema,
    "fixtureSchemaId",
    "$.kernel.fixtureSchema",
  );
  assertDefinitionV1(
    kernel.checkpointCodec,
    "checkpointCodecId",
    "$.kernel.checkpointCodec",
  );
  assertControlCatalogV2(
    kernel.primitiveControlCatalog,
    "$.kernel.primitiveControlCatalog",
  );
  const signals = kernel.primitiveSignalCatalog;
  assertOutputCatalogV2(signals, "$.kernel.primitiveSignalCatalog");
  if (!Array.isArray(signals) || signals.some((signal) =>
    signal === null
    || typeof signal !== "object"
    || (signal as Record<string, unknown>).kind !== "signal")) {
    throw new ModelSurfaceValidationErrorV1(
      "$.kernel.primitiveSignalCatalog",
      "must contain primitive signals only",
    );
  }
  const metrics = kernel.modelMetricCatalog;
  if (!Array.isArray(metrics) || metrics.some((metric) =>
    metric === null
    || typeof metric !== "object"
    || (metric as Record<string, unknown>).kind !== "metric")) {
    throw new ModelSurfaceValidationErrorV1(
      "$.kernel.modelMetricCatalog",
      "must contain exact model-owned metrics only",
    );
  }
  assertOutputCatalogV2(
    [...signals as readonly SignalOutputDefinitionV2[],
      ...metrics as readonly MetricOutputDefinitionV2[]],
    "$.kernel.modelOutputCatalog",
  );
  const capabilities = assertUniqueIdArrayV1(
    kernel.capabilities,
    "$.kernel.capabilities",
  );
  const required = [
    ...(kernel.primitiveControlCatalog as readonly ControlDefinitionV2[])
      .map(({ controlId }) => controlCapabilityV1(controlId)),
    ...(signals as readonly SignalOutputDefinitionV2[])
      .map(({ outputId }) => outputCapabilityV1(outputId)),
    ...(metrics as readonly MetricOutputDefinitionV2[])
      .map(({ outputId }) => outputCapabilityV1(outputId)),
  ];
  for (const capability of required) {
    if (!capabilities.has(capability)) {
      throw new ModelSurfaceValidationErrorV1(
        "$.kernel.capabilities",
        `must declare primitive capability ${capability}`,
      );
    }
  }
}

export function assertModelSurfaceReleaseManifestV1(
  value: unknown,
): asserts value is ModelSurfaceReleaseManifestV1 {
  assertPortableStudioJsonObjectV2(value, "$.surfaceRelease");
  assertRequiredAndOptionalKeysV1(
    value,
    SURFACE_KEYS_V1,
    [],
    "$.surfaceRelease",
  );
  const surface = value as unknown as Record<string, unknown>;
  if (surface.schemaId !== STUDIO_MODEL_SURFACE_RELEASE_V1_SCHEMA_ID) {
    throw new ModelSurfaceValidationErrorV1(
      "$.surfaceRelease.schemaId",
      "schema identity mismatch",
    );
  }
  assertPortableModelIdentifierV2(
    surface.surfaceReleaseId,
    "$.surfaceRelease.surfaceReleaseId",
  );
  assertPortableModelIdentifierV2(
    surface.surfaceSeriesId,
    "$.surfaceRelease.surfaceSeriesId",
  );
  if (surface.predecessorSurfaceReleaseId !== null) {
    assertPortableModelIdentifierV2(
      surface.predecessorSurfaceReleaseId,
      "$.surfaceRelease.predecessorSurfaceReleaseId",
    );
    if (surface.predecessorSurfaceReleaseId === surface.surfaceReleaseId) {
      throw new ModelSurfaceValidationErrorV1(
        "$.surfaceRelease.predecessorSurfaceReleaseId",
        "must not refer to the release itself",
      );
    }
  }
  assertPortableModelIdentifierV2(
    surface.modelFamilyId,
    "$.surfaceRelease.modelFamilyId",
  );
  assertDisplayNameV1(surface.displayName, "$.surfaceRelease.displayName");
  assertUniqueIdArrayV1(
    surface.exposedExactOutputIds,
    "$.surfaceRelease.exposedExactOutputIds",
  );
  assertSurfaceControlCatalogV1(surface.controlCatalog);
  assertDerivedOutputCatalogV1(surface.derivedOutputCatalog);
  assertSurfaceGraphCatalogV1(
    surface.graphCatalog,
    surface.derivedOutputCatalog,
  );
  (surface.derivedOutputCatalog as readonly ModelSurfaceDerivedOutputDefinitionV1[])
    .forEach((output, index) => {
      const capability = derivationCapabilityV1(output.derivationId);
      const requiredCapabilities = new Set(output.requiredCapabilities);
      if (!requiredCapabilities.has(capability)) {
        throw new ModelSurfaceValidationErrorV1(
          `$.surfaceRelease.derivedOutputCatalog[${index}].requiredCapabilities`,
          `requires capability ${capability}`,
        );
      }
      const derivedIds = new Set(
        (surface.derivedOutputCatalog as readonly ModelSurfaceDerivedOutputDefinitionV1[])
          .map(({ outputId }) => outputId),
      );
      output.dependencies.forEach((dependency) => {
        const dependencyCapability = outputCapabilityV1(dependency);
        if (
          !derivedIds.has(dependency)
          && !requiredCapabilities.has(dependencyCapability)
        ) {
          throw new ModelSurfaceValidationErrorV1(
            `$.surfaceRelease.derivedOutputCatalog[${index}].requiredCapabilities`,
            `requires capability ${dependencyCapability}`,
          );
        }
      });
    });
  const derivedIds = new Set(
    (surface.derivedOutputCatalog as readonly ModelSurfaceDerivedOutputDefinitionV1[])
      .map(({ outputId }) => outputId),
  );
  (surface.graphCatalog as readonly ModelSurfaceGraphDefinitionV1[]).forEach(
    (graph, index) => {
      const requiredCapabilities = new Set(graph.requiredCapabilities);
      if (graph.renderer === "cycle-waveform" && !requiredCapabilities.has(derivationCapabilityV1(graph.derivationId)))
        throw new ModelSurfaceValidationErrorV1(`$.surfaceRelease.graphCatalog[${index}].derivationId`, "requires the pinned presentation derivation");
      if (
        graph.renderer === "structural-return"
        && !requiredCapabilities.has(analysisCapabilityV1(graph.analysisId))
      ) {
        throw new ModelSurfaceValidationErrorV1(
          `$.surfaceRelease.graphCatalog[${index}].analysisId`,
          `requires capability ${analysisCapabilityV1(graph.analysisId)}`,
        );
      }
      graphOutputIdsV1([graph]).forEach((outputId) => {
        const capability = outputCapabilityV1(outputId);
        if (!derivedIds.has(outputId) && !requiredCapabilities.has(capability)) {
          throw new ModelSurfaceValidationErrorV1(
            `$.surfaceRelease.graphCatalog[${index}].requiredCapabilities`,
            `requires capability ${capability}`,
          );
        }
      });
    },
  );
  assertKnobCatalogV1(surface.knobCatalog);
  assertProtocolCatalogV1(surface.protocolCatalog);
}

/** Capabilities projected from the current public model contract. */
export function modelCapabilitiesFromContractV1(
  model: ModelContractV2,
  additional: readonly string[] = [],
): ReadonlySet<string> {
  const capabilities = new Set<string>(additional);
  model.controlCatalog.forEach(({ controlId }) => {
    capabilities.add(controlCapabilityV1(controlId));
  });
  model.outputCatalog.forEach(({ outputId }) => {
    capabilities.add(outputCapabilityV1(outputId));
  });
  model.graphCatalog.forEach((graph) => {
    if (graph.renderer === "structural-return") {
      capabilities.add(analysisCapabilityV1(graph.analysisId));
    }
  });
  return capabilities;
}

/**
 * Compatibility projection used while the product contract remains
 * `ModelContractV2`. Numerical identity comes only from the exact kernel;
 * display/catalog data comes from one immutable Surface, and Snapshot
 * admission names the single Studio service rather than the model artifact.
 */
export function composeStandardModelContractV1(
  kernelValue: unknown,
  surfaceValue: unknown,
  studioCapabilities: readonly string[] = [],
): ComposedStandardModelContractV1 {
  assertExactModelKernelManifestV3(kernelValue);
  assertModelSurfaceReleaseManifestV1(surfaceValue);
  const kernel = kernelValue;
  const surfaceRelease = surfaceValue;
  if (kernel.modelFamilyId !== surfaceRelease.modelFamilyId) {
    throw new ModelSurfaceValidationErrorV1(
      "$.surfaceRelease.modelFamilyId",
      `must match exact model family ${kernel.modelFamilyId}`,
    );
  }
  const kernelContract: ModelContractV2 = Object.freeze({
    modelId: kernel.modelId,
    modelFamilyId: kernel.modelFamilyId,
    displayName: kernel.modelId,
    fixtureSchemaId: kernel.fixtureSchema.fixtureSchemaId,
    checkpointCodecId: kernel.checkpointCodec.checkpointCodecId,
    snapshotGateId: STUDIO_COMMON_SNAPSHOT_ADMISSION_ID_V1,
    controlCatalog: kernel.primitiveControlCatalog,
    outputCatalog: Object.freeze([
      ...kernel.primitiveSignalCatalog,
      ...kernel.modelMetricCatalog,
    ]),
    graphCatalog: Object.freeze([]),
  });
  assertModelContractV2(kernelContract);
  const materialized = materializeModelSurfaceForModelV1(
    surfaceRelease,
    kernelContract,
    Object.freeze([...kernel.capabilities, ...studioCapabilities]),
  );
  const exposedControlIds = new Set(
    materialized.controlCatalog.map(({ controlId }) => controlId),
  );
  const exposedExactOutputIds = new Set(
    materialized.exposedExactOutputIds,
  );
  const contract: ModelContractV2 = Object.freeze({
    ...kernelContract,
    displayName: surfaceRelease.displayName,
    controlCatalog: Object.freeze(kernel.primitiveControlCatalog.filter(
      ({ controlId }) => exposedControlIds.has(controlId),
    )),
    outputCatalog: Object.freeze([
      ...kernel.primitiveSignalCatalog.filter(({ outputId }) =>
        exposedExactOutputIds.has(outputId)),
      ...kernel.modelMetricCatalog.filter(({ outputId }) =>
        exposedExactOutputIds.has(outputId)),
      ...materialized.derivedOutputCatalog.map(stripDerivationV1),
    ]),
    graphCatalog: Object.freeze(
      materialized.graphCatalog.map(stripGraphRequirementsV1),
    ),
  });
  assertModelContractV2(contract);
  return Object.freeze({
    exactContract: kernelContract,
    contract,
    surface: materialized,
  });
}

/** Materializes a Surface only when its exact-output pin fits this model. */
export function materializeModelSurfaceForModelV1(
  surface: ModelSurfaceReleaseManifestV1,
  model: ModelContractV2,
  additionalCapabilities: readonly string[] = [],
): MaterializedModelSurfaceV1 {
  assertModelSurfaceReleaseManifestV1(surface);
  if (surface.modelFamilyId !== model.modelFamilyId) {
    throw new ModelSurfaceValidationErrorV1(
      "$.surfaceRelease.modelFamilyId",
      `must match model family ${model.modelFamilyId}`,
    );
  }
  const capabilities = modelCapabilitiesFromContractV1(
    model,
    additionalCapabilities,
  );
  const controls = new Map(
    model.controlCatalog.map((definition) => [definition.controlId, definition]),
  );
  const primitiveOutputIds = new Set(
    model.outputCatalog.map(({ outputId }) => outputId),
  );
  surface.derivedOutputCatalog.forEach((output, index) => {
    if (primitiveOutputIds.has(output.outputId)) {
      throw new ModelSurfaceValidationErrorV1(
        `$.surfaceRelease.derivedOutputCatalog[${index}].outputId`,
        `derived output ID ${output.outputId} collides with an exact-model output`,
      );
    }
  });
  const controlCatalog = surface.controlCatalog.filter((item) =>
    requirementsSatisfiedV1(item.requiredCapabilities, capabilities)
    && controls.has(item.controlId));
  const modelOutputsById = new Map(
    model.outputCatalog.map((output) => [output.outputId, output]),
  );
  const unsupportedExactOutputIndex = surface.exposedExactOutputIds.findIndex(
    (outputId) => !modelOutputsById.has(outputId),
  );
  if (unsupportedExactOutputIndex >= 0) {
    throw new ModelSurfaceValidationErrorV1(
      `$.surfaceRelease.exposedExactOutputIds[${unsupportedExactOutputIndex}]`,
      "is unsupported by the pinned exact model",
    );
  }
  const exposedExactOutputIds = [...surface.exposedExactOutputIds];
  const exposedExactOutputCatalog = exposedExactOutputIds.map((outputId) =>
    modelOutputsById.get(outputId)!);
  const availableOutputs = new Set(exposedExactOutputIds);
  const derivedOutputCatalog: ModelSurfaceDerivedOutputDefinitionV1[] = [];
  const remainingDerived = [...surface.derivedOutputCatalog];
  let addedOutput = true;
  while (addedOutput) {
    addedOutput = false;
    for (let index = remainingDerived.length - 1; index >= 0; index -= 1) {
      const output = remainingDerived[index]!;
      if (
        availableOutputs.has(output.outputId)
        || !requirementsSatisfiedV1(output.requiredCapabilities, capabilities)
        || output.dependencies.some((dependency) =>
          !availableOutputs.has(dependency))
      ) continue;
      derivedOutputCatalog.push(output);
      availableOutputs.add(output.outputId);
      remainingDerived.splice(index, 1);
      addedOutput = true;
    }
  }
  const derivedOrder = new Map(
    surface.derivedOutputCatalog.map(({ outputId }, index) => [outputId, index]),
  );
  derivedOutputCatalog.sort((left, right) =>
    derivedOrder.get(left.outputId)! - derivedOrder.get(right.outputId)!);
  const graphCatalog = surface.graphCatalog.filter((graph) =>
    requirementsSatisfiedV1(graph.requiredCapabilities, capabilities)
    && [...graphOutputIdsV1([graph])].every((outputId) =>
      availableOutputs.has(outputId)));
  assertMaterializedGraphCatalogV1(
    graphCatalog,
    exposedExactOutputCatalog,
    derivedOutputCatalog,
  );
  const knobCatalog = surface.knobCatalog.filter((knob) =>
    requirementsSatisfiedV1(knob.requiredCapabilities, capabilities)
    && knobCompatibilityIssueV1(knob, controls) === undefined);
  const protocolCatalog = surface.protocolCatalog.filter((protocol) =>
    requirementsSatisfiedV1(protocol.requiredCapabilities, capabilities)
    && protocolCompatibilityIssueV1(protocol, controls) === undefined);
  return Object.freeze({
    surfaceReleaseId: surface.surfaceReleaseId,
    modelFamilyId: surface.modelFamilyId,
    exposedExactOutputIds: Object.freeze(exposedExactOutputIds),
    controlCatalog: Object.freeze(controlCatalog),
    derivedOutputCatalog: Object.freeze(derivedOutputCatalog),
    graphCatalog: Object.freeze(graphCatalog),
    knobCatalog: Object.freeze(knobCatalog),
    protocolCatalog: Object.freeze(protocolCatalog),
  });
}

/** Requires every declared item to be usable by one exact model. */
export function assertModelSurfaceCompatibleV1(
  surface: ModelSurfaceReleaseManifestV1,
  model: ModelContractV2,
  additionalCapabilities: readonly string[] = [],
): void {
  assertModelSurfaceReleaseManifestV1(surface);
  const capabilities = modelCapabilitiesFromContractV1(
    model,
    additionalCapabilities,
  );
  const controls = new Map(
    model.controlCatalog.map((definition) => [definition.controlId, definition]),
  );
  surface.knobCatalog.forEach((knob, index) => {
    if (!requirementsSatisfiedV1(knob.requiredCapabilities, capabilities)) return;
    const issue = knobCompatibilityIssueV1(knob, controls);
    if (issue !== undefined) {
      throw new ModelSurfaceValidationErrorV1(
        `$.surfaceRelease.knobCatalog[${index}]`,
        issue,
      );
    }
  });
  surface.protocolCatalog.forEach((protocol, index) => {
    if (!requirementsSatisfiedV1(protocol.requiredCapabilities, capabilities)) {
      return;
    }
    const issue = protocolCompatibilityIssueV1(protocol, controls);
    if (issue !== undefined) {
      throw new ModelSurfaceValidationErrorV1(
        `$.surfaceRelease.protocolCatalog[${index}]`,
        issue,
      );
    }
  });
  const materialized = materializeModelSurfaceForModelV1(
    surface,
    model,
    additionalCapabilities,
  );
  const catalogs = [
    ["controlCatalog", surface.controlCatalog, materialized.controlCatalog],
    [
      "derivedOutputCatalog",
      surface.derivedOutputCatalog,
      materialized.derivedOutputCatalog,
    ],
    ["graphCatalog", surface.graphCatalog, materialized.graphCatalog],
    ["knobCatalog", surface.knobCatalog, materialized.knobCatalog],
    ["protocolCatalog", surface.protocolCatalog, materialized.protocolCatalog],
  ] as const;
  const incompatible = catalogs.find(([, declared, supported]) =>
    declared.length !== supported.length);
  if (incompatible !== undefined) {
    throw new ModelSurfaceValidationErrorV1(
      `$.surfaceRelease.${incompatible[0]}`,
      "contains an item unsupported by the pinned exact model",
    );
  }
}

/** Existing semantic IDs must remain byte-equivalent; only additions survive. */
export function assertAdditiveModelSurfaceUpgradeV1(
  previous: ModelSurfaceReleaseManifestV1,
  next: ModelSurfaceReleaseManifestV1,
): void {
  assertModelSurfaceReleaseManifestV1(previous);
  assertModelSurfaceReleaseManifestV1(next);
  if (previous.modelFamilyId !== next.modelFamilyId) {
    throw new ModelSurfaceValidationErrorV1(
      "$.surfaceRelease.modelFamilyId",
      "an additive Surface upgrade cannot change model family",
    );
  }
  if (previous.surfaceSeriesId !== next.surfaceSeriesId) {
    throw new ModelSurfaceValidationErrorV1(
      "$.surfaceRelease.surfaceSeriesId",
      "an additive Surface upgrade cannot change series",
    );
  }
  if (next.predecessorSurfaceReleaseId !== previous.surfaceReleaseId) {
    throw new ModelSurfaceValidationErrorV1(
      "$.surfaceRelease.predecessorSurfaceReleaseId",
      `must be ${previous.surfaceReleaseId}`,
    );
  }
  assertCatalogExtensionV1(
    previous.controlCatalog,
    next.controlCatalog,
    "controlId",
    "controlCatalog",
  );
  assertExactOutputExposureExtensionV1(previous, next);
  assertCatalogExtensionV1(
    previous.derivedOutputCatalog,
    next.derivedOutputCatalog,
    "outputId",
    "derivedOutputCatalog",
  );
  assertCatalogExtensionV1(
    previous.graphCatalog,
    next.graphCatalog,
    "graphId",
    "graphCatalog",
  );
  assertCatalogExtensionV1(
    previous.knobCatalog,
    next.knobCatalog,
    "knobId",
    "knobCatalog",
  );
  assertCatalogExtensionV1(
    previous.protocolCatalog,
    next.protocolCatalog,
    "protocolId",
    "protocolCatalog",
  );
}

/**
 * Validate the declared registry lineage, not only the manifest's local shape.
 * A new Surface series has no predecessor; a successor names and extends the
 * immediately preceding release in the same series.
 */
export function assertModelSurfaceReleaseLineageV1(
  current: ModelSurfaceReleaseManifestV1,
  previous?: ModelSurfaceReleaseManifestV1,
): void {
  assertModelSurfaceReleaseManifestV1(current);
  if (current.predecessorSurfaceReleaseId === null) {
    if (previous !== undefined) {
      throw new ModelSurfaceValidationErrorV1(
        "$.surfaceRelease.predecessorSurfaceReleaseId",
        "a root Surface release must not supply a predecessor",
      );
    }
    return;
  }
  if (previous === undefined) {
    throw new ModelSurfaceValidationErrorV1(
      "$.surfaceRelease.predecessorSurfaceReleaseId",
      `requires predecessor ${current.predecessorSurfaceReleaseId}`,
    );
  }
  assertAdditiveModelSurfaceUpgradeV1(previous, current);
}

function assertExactOutputExposureExtensionV1(
  previous: ModelSurfaceReleaseManifestV1,
  next: ModelSurfaceReleaseManifestV1,
): void {
  const nextIds = new Set(next.exposedExactOutputIds);
  const removed = previous.exposedExactOutputIds.find((outputId) =>
    !nextIds.has(outputId));
  if (removed !== undefined) {
    throw new ModelSurfaceValidationErrorV1(
      "$.surfaceRelease.exposedExactOutputIds",
      `an additive Surface upgrade cannot hide exact output ${removed}`,
    );
  }
}

export function controlCapabilityV1(controlId: string): string {
  return `control/${controlId}`;
}

export function outputCapabilityV1(outputId: string): string {
  return `output/${outputId}`;
}

export function analysisCapabilityV1(analysisId: string): string {
  return `analysis/${analysisId}`;
}

/** Immutable implementation supplied by the trusted Studio derivation registry. */
export function derivationCapabilityV1(derivationId: string): string {
  return `derivation/${derivationId}`;
}

function assertSurfaceControlCatalogV1(value: unknown): void {
  if (!Array.isArray(value)) {
    throw new ModelSurfaceValidationErrorV1(
      "$.surfaceRelease.controlCatalog",
      "must be an array",
    );
  }
  const ids = new Set<string>();
  value.forEach((entry, index) => {
    const path = `$.surfaceRelease.controlCatalog[${index}]`;
    assertRecordV1(entry, path);
    assertExactKeysV1(entry, [
      "controlId",
      "preferredPresentation",
      "requiredCapabilities",
    ], path);
    assertPortableModelIdentifierV2(entry.controlId, `${path}.controlId`);
    assertUniqueCatalogIdV1(ids, entry.controlId, `${path}.controlId`);
    const requiredCapabilities = assertUniqueIdArrayV1(
      entry.requiredCapabilities,
      `${path}.requiredCapabilities`,
    );
    const controlCapability = controlCapabilityV1(entry.controlId);
    if (!requiredCapabilities.has(controlCapability)) {
      throw new ModelSurfaceValidationErrorV1(
        `${path}.requiredCapabilities`,
        `requires capability ${controlCapability}`,
      );
    }
    if (
      entry.preferredPresentation !== "slider"
      && entry.preferredPresentation !== "buttons"
    ) {
      throw new ModelSurfaceValidationErrorV1(
        `${path}.preferredPresentation`,
        'must be "slider" or "buttons"',
      );
    }
  });
}

function assertDerivedOutputCatalogV1(value: unknown): void {
  if (!Array.isArray(value)) {
    throw new ModelSurfaceValidationErrorV1(
      "$.surfaceRelease.derivedOutputCatalog",
      "must be an array",
    );
  }
  const ids = new Set<string>();
  value.forEach((entry, index) => {
    const path = `$.surfaceRelease.derivedOutputCatalog[${index}]`;
    assertRecordV1(entry, path);
    assertRequiredAndOptionalKeysV1(entry, [
      "dependencies",
      "derivationId",
      "kind",
      "outputId",
      "requiredCapabilities",
      "scope",
      "shape",
      "unit",
    ], ["significantDigits"], path);
    assertPortableModelIdentifierV2(entry.outputId, `${path}.outputId`);
    assertPortableModelIdentifierV2(entry.derivationId, `${path}.derivationId`);
    assertUniqueCatalogIdV1(ids, entry.outputId, `${path}.outputId`);
    assertUniqueIdArrayV1(
      entry.requiredCapabilities,
      `${path}.requiredCapabilities`,
    );
    if (entry.kind !== "metric") {
      throw new ModelSurfaceValidationErrorV1(`${path}.kind`, 'must be "metric"');
    }
    if (!Array.isArray(entry.dependencies)) {
      throw new ModelSurfaceValidationErrorV1(
        `${path}.dependencies`,
        "must be an array",
      );
    }
    entry.dependencies.forEach((dependency, dependencyIndex) => {
      assertPortableModelIdentifierV2(
        dependency,
        `${path}.dependencies[${dependencyIndex}]`,
      );
    });
    assertNonemptyStringV1(entry.unit, `${path}.unit`, 128);
    if (entry.shape !== "scalar" && entry.shape !== "vector") {
      throw new ModelSurfaceValidationErrorV1(
        `${path}.shape`,
        'must be "scalar" or "vector"',
      );
    }
    if (
      entry.scope !== "instant"
      && entry.scope !== "beat"
      && entry.scope !== "window"
    ) {
      throw new ModelSurfaceValidationErrorV1(
        `${path}.scope`,
        'must be "instant", "beat", or "window"',
      );
    }
    const significantDigits = entry.significantDigits;
    if (
      significantDigits !== undefined
      && (
        typeof significantDigits !== "number"
        || !Number.isSafeInteger(significantDigits)
        || significantDigits < 1
        || significantDigits > 12
      )
    ) {
      throw new ModelSurfaceValidationErrorV1(
        `${path}.significantDigits`,
        "must be an integer between 1 and 12",
      );
    }
  });
}

function assertSurfaceGraphCatalogV1(
  value: unknown,
  derivedValue: unknown,
): void {
  if (!Array.isArray(value) || !Array.isArray(derivedValue)) {
    throw new ModelSurfaceValidationErrorV1(
      "$.surfaceRelease.graphCatalog",
      "must be an array",
    );
  }
  const referenced = graphOutputIdsV1(value);
  const derived = derivedValue as readonly ModelSurfaceDerivedOutputDefinitionV1[];
  const derivedIds = new Set(derived.map(({ outputId }) => outputId));
  const primitiveDependencies = new Set<string>([
    ...referenced,
    ...derived.flatMap(({ dependencies }) => dependencies),
  ]);
  const syntheticInputs: SignalOutputDefinitionV2[] = [...primitiveDependencies]
    .filter((outputId) => !derivedIds.has(outputId))
    .map((outputId) => Object.freeze({
      outputId,
      kind: "signal" as const,
      unit: "1",
      shape: "scalar" as const,
      sampling: "accepted-step" as const,
    }));
  const outputs = [
    ...syntheticInputs,
    ...derived.map(stripDerivationV1),
  ];
  const catalog = assertOutputCatalogV2(
    outputs,
    "$.surfaceRelease.graphValidationOutputs",
  );
  value.forEach((entry, index) => {
    const path = `$.surfaceRelease.graphCatalog[${index}]`;
    assertRecordV1(entry, path);
    assertUniqueIdArrayV1(
      entry.requiredCapabilities,
      `${path}.requiredCapabilities`,
    );
  });
  assertGraphCatalogV2(
    value.map(stripGraphRequirementsV1),
    "$.surfaceRelease.graphCatalog",
    catalog,
  );
}

function assertKnobCatalogV1(value: unknown): void {
  if (!Array.isArray(value)) {
    throw new ModelSurfaceValidationErrorV1(
      "$.surfaceRelease.knobCatalog",
      "must be an array",
    );
  }
  const ids = new Set<string>();
  value.forEach((entry, index) => {
    const path = `$.surfaceRelease.knobCatalog[${index}]`;
    assertRecordV1(entry, path);
    assertExactKeysV1(entry, [
      "defaultValue",
      "kind",
      "knobId",
      "maximum",
      "minimum",
      "requiredCapabilities",
      "step",
      "targets",
      "unit",
    ], path);
    if (entry.kind !== "affine-numeric") {
      throw new ModelSurfaceValidationErrorV1(
        `${path}.kind`,
        'must be "affine-numeric"',
      );
    }
    assertPortableModelIdentifierV2(entry.knobId, `${path}.knobId`);
    assertUniqueCatalogIdV1(ids, entry.knobId, `${path}.knobId`);
    const requiredCapabilities = assertUniqueIdArrayV1(
      entry.requiredCapabilities,
      `${path}.requiredCapabilities`,
    );
    assertControlCatalogV2([{
      controlId: entry.knobId,
      valueType: "number",
      unit: entry.unit,
      minimum: entry.minimum,
      maximum: entry.maximum,
      step: entry.step,
      defaultValue: entry.defaultValue,
      changeSemantics: "accepted-state-warm-start",
    }], path);
    if (!Array.isArray(entry.targets) || entry.targets.length === 0) {
      throw new ModelSurfaceValidationErrorV1(
        `${path}.targets`,
        "must be a nonempty array",
      );
    }
    const targetIds = new Set<string>();
    entry.targets.forEach((target, targetIndex) => {
      const targetPath = `${path}.targets[${targetIndex}]`;
      assertRecordV1(target, targetPath);
      assertExactKeysV1(target, ["controlId", "offset", "scale"], targetPath);
      assertPortableModelIdentifierV2(target.controlId, `${targetPath}.controlId`);
      assertUniqueCatalogIdV1(targetIds, target.controlId, `${targetPath}.controlId`);
      const controlCapability = controlCapabilityV1(target.controlId);
      if (!requiredCapabilities.has(controlCapability)) {
        throw new ModelSurfaceValidationErrorV1(
          `${path}.requiredCapabilities`,
          `requires capability ${controlCapability}`,
        );
      }
      const scale = assertFiniteNumberV1(target.scale, `${targetPath}.scale`);
      if (scale === 0) {
        throw new ModelSurfaceValidationErrorV1(
          `${targetPath}.scale`,
          "must not be zero",
        );
      }
      assertFiniteNumberV1(target.offset, `${targetPath}.offset`);
    });
  });
}

function assertProtocolCatalogV1(value: unknown): void {
  if (!Array.isArray(value)) {
    throw new ModelSurfaceValidationErrorV1(
      "$.surfaceRelease.protocolCatalog",
      "must be an array",
    );
  }
  const ids = new Set<string>();
  value.forEach((entry, index) => {
    const path = `$.surfaceRelease.protocolCatalog[${index}]`;
    assertRecordV1(entry, path);
    assertExactKeysV1(
      entry,
      ["protocolId", "requiredCapabilities", "steps"],
      path,
    );
    assertPortableModelIdentifierV2(entry.protocolId, `${path}.protocolId`);
    assertUniqueCatalogIdV1(ids, entry.protocolId, `${path}.protocolId`);
    const requiredCapabilities = assertUniqueIdArrayV1(
      entry.requiredCapabilities,
      `${path}.requiredCapabilities`,
    );
    if (!Array.isArray(entry.steps) || entry.steps.length === 0) {
      throw new ModelSurfaceValidationErrorV1(
        `${path}.steps`,
        "must be a nonempty array",
      );
    }
    let priorAtSec = -1;
    entry.steps.forEach((step, stepIndex) => {
      const stepPath = `${path}.steps[${stepIndex}]`;
      assertRecordV1(step, stepPath);
      assertExactKeysV1(step, ["actions", "atSec"], stepPath);
      const atSec = assertFiniteNumberV1(step.atSec, `${stepPath}.atSec`);
      if (atSec < 0 || atSec <= priorAtSec) {
        throw new ModelSurfaceValidationErrorV1(
          `${stepPath}.atSec`,
          "must be nonnegative and strictly increasing",
        );
      }
      priorAtSec = atSec;
      if (!Array.isArray(step.actions) || step.actions.length === 0) {
        throw new ModelSurfaceValidationErrorV1(
          `${stepPath}.actions`,
          "must be a nonempty array",
        );
      }
      const controls = new Set<string>();
      step.actions.forEach((action, actionIndex) => {
        const actionPath = `${stepPath}.actions[${actionIndex}]`;
        assertRecordV1(action, actionPath);
        assertExactKeysV1(action, ["controlId", "value"], actionPath);
        assertPortableModelIdentifierV2(action.controlId, `${actionPath}.controlId`);
        assertUniqueCatalogIdV1(controls, action.controlId, `${actionPath}.controlId`);
        const controlCapability = controlCapabilityV1(action.controlId);
        if (!requiredCapabilities.has(controlCapability)) {
          throw new ModelSurfaceValidationErrorV1(
            `${path}.requiredCapabilities`,
            `requires capability ${controlCapability}`,
          );
        }
        assertFiniteNumberV1(action.value, `${actionPath}.value`);
      });
    });
  });
}

function graphOutputIdsV1(graphs: readonly unknown[]): Set<string> {
  const result = new Set<string>();
  graphs.forEach((graph, graphIndex) => {
    const path = `$.surfaceRelease.graphCatalog[${graphIndex}]`;
    assertRecordV1(graph, path);
    if (graph.renderer === "structural-return" || graph.renderer === "cycle-waveform") return;
    if (!Array.isArray(graph.seriesCatalog)) {
      throw new ModelSurfaceValidationErrorV1(
        `${path}.seriesCatalog`,
        "must be an array",
      );
    }
    graph.seriesCatalog.forEach((series, seriesIndex) => {
      const seriesPath = `${path}.seriesCatalog[${seriesIndex}]`;
      assertRecordV1(series, seriesPath);
      if (graph.renderer === "sweep") {
        if (typeof series.outputId === "string") result.add(series.outputId);
      } else if (graph.renderer === "xy") {
        for (const key of ["xOutputId", "yOutputId", "cyclePhaseOutputId"]) if (typeof series[key] === "string") result.add(series[key] as string);
      } else if (graph.renderer === "pressure-volume") {
        if (typeof series.volumeOutputId === "string") result.add(series.volumeOutputId);
        if (typeof series.pressureOutputId === "string") result.add(series.pressureOutputId);
        if (typeof series.cyclePhaseOutputId === "string") {
          result.add(series.cyclePhaseOutputId);
        }
      }
    });
  });
  return result;
}

function stripDerivationV1(
  value: ModelSurfaceDerivedOutputDefinitionV1,
): MetricOutputDefinitionV2 {
  return Object.freeze({
    outputId: value.outputId,
    kind: "metric",
    unit: value.unit,
    shape: value.shape,
    scope: value.scope,
    dependencies: Object.freeze([...value.dependencies]),
    ...(value.significantDigits === undefined
      ? {}
      : { significantDigits: value.significantDigits }),
  });
}

function stripGraphRequirementsV1(
  value: unknown,
): GraphDefinitionV2 {
  assertRecordV1(value, "$.surfaceRelease.graphCatalog[]");
  const { requiredCapabilities: _requiredCapabilities, ...graph } = value;
  return graph as GraphDefinitionV2;
}

function requirementsSatisfiedV1(
  required: readonly string[],
  capabilities: ReadonlySet<string>,
): boolean {
  return required.every((capability) => capabilities.has(capability));
}

function knobCompatibilityIssueV1(
  knob: ModelSurfaceKnobDefinitionV1,
  controls: ReadonlyMap<string, ControlDefinitionV2>,
): string | undefined {
  for (const target of knob.targets) {
    const control = controls.get(target.controlId);
    if (control === undefined) return `unknown primitive control ${target.controlId}`;
    for (const knobValue of [
      knob.minimum,
      knob.maximum,
      knob.defaultValue,
    ]) {
      const mapped = target.scale * knobValue + target.offset;
      const issue = studioNumericControlValueIssueV2(mapped, control);
      if (issue !== undefined) {
        return `${target.controlId} mapping at ${knobValue} ${issue}`;
      }
    }
    // An affine map preserves every allowed stop iff the first stop and one
    // adjacent stop both land on the target lattice. Endpoints/default above
    // additionally prove the mapped domain and authored neutral position.
    const adjacentKnobValue = knob.minimum + knob.step;
    const adjacentMapped = target.scale * adjacentKnobValue + target.offset;
    const adjacentIssue = studioNumericControlValueIssueV2(
      adjacentMapped,
      control,
    );
    if (adjacentIssue !== undefined) {
      return `${target.controlId} mapping does not preserve the target step `
        + `lattice: ${adjacentIssue}`;
    }
    const mappedDefault = target.scale * knob.defaultValue + target.offset;
    const tolerance = Number.EPSILON * 32
      * Math.max(1, Math.abs(mappedDefault), Math.abs(control.defaultValue));
    if (Math.abs(mappedDefault - control.defaultValue) > tolerance) {
      return `${target.controlId} mapping must reproduce primitive default `
        + `${control.defaultValue}`;
    }
  }
  return undefined;
}

function assertMaterializedGraphCatalogV1(
  graphs: readonly ModelSurfaceGraphDefinitionV1[],
  exactOutputs: ModelContractV2["outputCatalog"],
  derivedOutputs: readonly ModelSurfaceDerivedOutputDefinitionV1[],
): void {
  try {
    const actualOutputs = assertOutputCatalogV2(
      [...exactOutputs, ...derivedOutputs.map(stripDerivationV1)],
      "$.materializedSurface.outputCatalog",
    );
    assertGraphCatalogV2(
      graphs.map(stripGraphRequirementsV1),
      "$.materializedSurface.graphCatalog",
      actualOutputs,
    );
  } catch (error) {
    throw new ModelSurfaceValidationErrorV1(
      "$.materializedSurface.graphCatalog",
      error instanceof Error ? error.message : "actual output validation failed",
    );
  }
}

function protocolCompatibilityIssueV1(
  protocol: ModelSurfaceProtocolDefinitionV1,
  controls: ReadonlyMap<string, ControlDefinitionV2>,
): string | undefined {
  for (const step of protocol.steps) {
    for (const action of step.actions) {
      const control = controls.get(action.controlId);
      if (control === undefined) {
        return `unknown primitive control ${action.controlId}`;
      }
      const issue = studioNumericControlValueIssueV2(action.value, control);
      if (issue !== undefined) return `${action.controlId} action ${issue}`;
    }
  }
  return undefined;
}

function assertCatalogExtensionV1<
  TEntry extends Readonly<Record<TKey, string>>,
  TKey extends string,
>(
  previous: readonly TEntry[],
  next: readonly TEntry[],
  idKey: TKey,
  catalogName: string,
): void {
  const nextById = new Map(next.map((entry) => [entry[idKey], entry]));
  previous.forEach((entry) => {
    const replacement = nextById.get(entry[idKey]);
    if (replacement === undefined) {
      throw new ModelSurfaceValidationErrorV1(
        `$.surfaceRelease.${catalogName}`,
        `cannot remove ${entry[idKey]}`,
      );
    }
    if (!samePortableValueV1(entry, replacement)) {
      throw new ModelSurfaceValidationErrorV1(
        `$.surfaceRelease.${catalogName}`,
        `cannot change existing definition ${entry[idKey]}`,
      );
    }
  });
}

function samePortableValueV1(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left)
      && Array.isArray(right)
      && left.length === right.length
      && left.every((entry, index) => samePortableValueV1(entry, right[index]));
  }
  if (
    left === null
    || right === null
    || typeof left !== "object"
    || typeof right !== "object"
  ) return false;
  const leftRecord = left as Record<string, unknown>;
  const rightRecord = right as Record<string, unknown>;
  const leftKeys = Object.keys(leftRecord).sort();
  const rightKeys = Object.keys(rightRecord).sort();
  return leftKeys.length === rightKeys.length
    && leftKeys.every((key, index) =>
      key === rightKeys[index]
      && samePortableValueV1(leftRecord[key], rightRecord[key]));
}

function assertDefinitionV1(
  value: unknown,
  idKey: "fixtureSchemaId" | "checkpointCodecId",
  path: string,
): void {
  assertRecordV1(value, path);
  assertExactKeysV1(value, ["definition", idKey], path);
  assertPortableModelIdentifierV2(value[idKey], `${path}.${idKey}`);
  assertNonemptyObjectV1(value.definition, `${path}.definition`);
}

function assertUniqueIdArrayV1(
  value: unknown,
  path: string,
): Set<string> {
  if (!Array.isArray(value)) {
    throw new ModelSurfaceValidationErrorV1(path, "must be an array");
  }
  const result = new Set<string>();
  value.forEach((entry, index) => {
    assertPortableModelIdentifierV2(entry, `${path}[${index}]`);
    assertUniqueCatalogIdV1(result, entry, `${path}[${index}]`);
  });
  return result;
}

function assertUniqueCatalogIdV1(
  ids: Set<string>,
  id: string,
  path: string,
): void {
  if (ids.has(id)) {
    throw new ModelSurfaceValidationErrorV1(path, `duplicate ID ${id}`);
  }
  ids.add(id);
}

function assertRecordV1(
  value: unknown,
  path: string,
): asserts value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new ModelSurfaceValidationErrorV1(path, "must be an object");
  }
}

function assertExactKeysV1(
  value: unknown,
  keys: readonly string[],
  path: string,
): void {
  assertRecordV1(value, path);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (
    actual.length !== expected.length
    || actual.some((key, index) => key !== expected[index])
  ) {
    throw new ModelSurfaceValidationErrorV1(
      path,
      `keys must be exactly ${expected.join(", ")}`,
    );
  }
}

function assertRequiredAndOptionalKeysV1(
  value: unknown,
  requiredKeys: readonly string[],
  optionalKeys: readonly string[],
  path: string,
): void {
  assertRecordV1(value, path);
  const actual = Object.keys(value);
  const required = new Set(requiredKeys);
  const allowed = new Set([...requiredKeys, ...optionalKeys]);
  const missing = requiredKeys.filter((key) => !actual.includes(key));
  const unexpected = actual.filter((key) => !allowed.has(key));
  if (missing.length > 0 || unexpected.length > 0) {
    throw new ModelSurfaceValidationErrorV1(
      path,
      `keys must contain exactly ${[...required].sort().join(", ")}`
        + (optionalKeys.length === 0
          ? ""
          : ` with optional ${[...optionalKeys].sort().join(", ")}`)
        + (missing.length === 0
          ? ""
          : `; missing ${missing.sort().join(", ")}`)
        + (unexpected.length === 0
          ? ""
          : `; unexpected ${unexpected.sort().join(", ")}`),
    );
  }
}

function assertDisplayNameV1(value: unknown, path: string): void {
  assertNonemptyStringV1(value, path, 160);
}

function assertNonemptyStringV1(
  value: unknown,
  path: string,
  maximumLength: number,
): asserts value is string {
  if (
    typeof value !== "string"
    || value.length === 0
    || value !== value.trim()
    || value.length > maximumLength
  ) {
    throw new ModelSurfaceValidationErrorV1(
      path,
      `must be a nonempty trimmed string of at most ${maximumLength} characters`,
    );
  }
}

function assertNonemptyObjectV1(value: unknown, path: string): void {
  assertPortableStudioJsonObjectV2(value, path);
  if (Object.keys(value).length === 0) {
    throw new ModelSurfaceValidationErrorV1(path, "must not be empty");
  }
}

function assertFiniteNumberV1(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || Object.is(value, -0)) {
    throw new ModelSurfaceValidationErrorV1(
      path,
      "must be a finite number and must not be negative zero",
    );
  }
  return value;
}

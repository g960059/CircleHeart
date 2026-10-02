import {
  EXECUTION_PLAN_DESCRIPTOR_V1_SCHEMA_ID,
  type ExecutionPlanDescriptorV1,
  type ExecutionPlanNewtonF64WorkspaceRoleV1,
  type ExecutionPlanNewtonInt32WorkspaceRoleV1,
  type ExecutionPlanSolveGroupV1,
} from "./ExecutionPlanDescriptorV1";

export const EXECUTION_PLAN_TYPED_AUTHORITY_BINDING_V1_CAPABILITY =
  "runtime/execution-plan-typed-authority-binding-v1" as const;
export const EXECUTION_PLAN_NEWTON_WORKSPACE_V1_CAPABILITY =
  "runtime/execution-plan-newton-workspace-v1" as const;
export const BOUND_EXECUTION_PLAN_V1_SCHEMA_ID =
  "circleheart-bound-execution-plan-v1" as const;

export type ExecutionPlanKernelBindingCatalogV1 = Readonly<{
  componentKernelIds: readonly string[];
  hydraulicPathKernelIds: readonly string[];
  solveSystemKernelIds: readonly string[];
}>;

export type BoundExecutionPlanSolveGroupV1 = Readonly<{
  solveGroupId: string;
  activeStateLogicalIndices: Int32Array;
  dependentStateLogicalIndices: Int32Array;
  workspaceF64: Float64Array;
  workspaceInt32: Int32Array;
}>;

export type BoundExecutionPlanStateSlotDispatchV1 = Readonly<{
  stateId: string;
  authorityPointer: string;
  logicalIndex: number;
  storageKind: "continuous-f64" | "boolean-u8";
}>;

export type BoundExecutionPlanStateDispatchV1 = Readonly<{
  definitionId: string;
  logicalSlotCount: number;
  continuousSlotCount: number;
  booleanSlotCount: number;
  slots: readonly BoundExecutionPlanStateSlotDispatchV1[];
}>;

export type BoundExecutionPlanHydraulicNodeDispatchV1 = Readonly<{
  nodeId: string;
  componentId: string;
  componentKernelId: string;
  componentKernelBindingOrdinal: number;
  storageStateLogicalIndex: number;
}>;

export type BoundExecutionPlanHydraulicPathDispatchV1 = Readonly<{
  pathId: string;
  componentId: string;
  componentKernelId: string;
  componentKernelBindingOrdinal: number;
  upstreamNodeIndex: number;
  downstreamNodeIndex: number;
  pathKernelId: string;
  pathKernelBindingOrdinal: number;
}>;

export type BoundExecutionPlanHydraulicDispatchV1 = Readonly<{
  definitionId: string;
  nodes: readonly BoundExecutionPlanHydraulicNodeDispatchV1[];
  paths: readonly BoundExecutionPlanHydraulicPathDispatchV1[];
  conservationPools: readonly Readonly<{
    poolId: string;
    ledgerStateLogicalIndex: number;
    memberStateLogicalIndices: readonly number[];
    dependentStateLogicalIndex: number;
  }>[];
}>;

export type BoundExecutionPlanUpdateGroupDispatchV1 = Readonly<{
  updateGroupId: string;
  ordinal: number;
  periodTicks: number;
  phaseTicks: number;
  effectiveStepSec: number;
  integration: "fixed-step-backward-euler" | "fixed-step-conservative-partitioned";
  solveGroupId: string;
  solveGroupIndex: number;
  systemKernelId: string;
  solveSystemKernelBindingOrdinal: number;
}>;

export type BoundExecutionPlanUpdateScheduleV1 = Readonly<{
  definitionId: string;
  policyId: string;
  baseTickSec: number;
  presentationPeriodTicks: number;
  presentationStepSec: number;
  groups: readonly BoundExecutionPlanUpdateGroupDispatchV1[];
}>;

/**
 * Worker-local, session-independent allocation produced once at initialization.
 * Typed arrays are intentionally mutable scratch, but the bound object never
 * leaves its owning Worker.
 */
export type BoundExecutionPlanV1 = Readonly<{
  schemaId: typeof BOUND_EXECUTION_PLAN_V1_SCHEMA_ID;
  definitionId: string;
  policyId: string;
  bindingCatalog: ExecutionPlanKernelBindingCatalogV1;
  componentKernelBindingOrdinals: Int32Array;
  hydraulicPathKernelBindingOrdinals: Int32Array;
  solveSystemKernelBindingOrdinals: Int32Array;
  graphStorageStateLogicalIndices: Int32Array;
  graphUpstreamNodeIndices: Int32Array;
  graphDownstreamNodeIndices: Int32Array;
  solveGroups: readonly BoundExecutionPlanSolveGroupV1[];
  allocatedBytes: number;
}>;

export type BoundExecutionPlanNewtonWorkspaceV1 = Readonly<{
  solveGroupId: string;
  dimension: number;
  currentUnknowns: Float64Array;
  residual: Float64Array;
  jacobian: Float64Array;
  factors: Float64Array;
  rightHandSide: Float64Array;
  transformedRightHandSide: Float64Array;
  update: Float64Array;
  trialUnknowns: Float64Array;
  trialResidual: Float64Array;
  unknownScale: Float64Array;
  residualScale: Float64Array;
  pivots: Int32Array;
}>;

export type BoundExecutionPlanSolveBlockDispatchV1 = Readonly<{
  blockId: string;
  componentId: string;
  kernelId: string;
  componentKernelBindingOrdinal: number;
  disposition: "retained" | "statically-condensed";
  start: number;
  length: number;
  endExclusive: number;
}>;

export type BoundExecutionPlanSolveDispatchV1 = Readonly<{
  solveGroupId: string;
  systemKernelId: string;
  solveSystemKernelBindingOrdinal: number;
  totalUnknownCount: number;
  activeUnknownCount: number;
  blocks: readonly BoundExecutionPlanSolveBlockDispatchV1[];
}>;

export type ExecutionPlanSolveSystemRuntimeBindingV1<TResult> = Readonly<{
  systemKernelId: string;
  bind(input: Readonly<{
    dispatch: BoundExecutionPlanSolveDispatchV1;
    hydraulicDispatch: BoundExecutionPlanHydraulicDispatchV1;
    workspace: BoundExecutionPlanNewtonWorkspaceV1;
  }>): TResult;
}>;

type BoundExecutionPlanSolveGroupMetadataV1 = Readonly<{
  solveGroupId: string;
  workspace: BoundExecutionPlanNewtonWorkspaceV1;
  dispatch: BoundExecutionPlanSolveDispatchV1;
}>;

type BoundExecutionPlanMetadataV1 = Readonly<{
  descriptor: ExecutionPlanDescriptorV1;
  stateDispatch: BoundExecutionPlanStateDispatchV1;
  hydraulicDispatch: BoundExecutionPlanHydraulicDispatchV1;
  updateSchedule: BoundExecutionPlanUpdateScheduleV1;
  solveGroups: readonly BoundExecutionPlanSolveGroupMetadataV1[];
}>;

const BOUND_EXECUTION_PLAN_METADATA_V1 = new WeakMap<
  object,
  BoundExecutionPlanMetadataV1
>();
const OWNED_EXECUTION_PLAN_DESCRIPTORS_V1 = new WeakSet<object>();
const OWNED_EXECUTION_PLAN_KERNEL_CATALOGS_V1 = new WeakSet<object>();
const BOUND_EXECUTION_PLAN_HYDRAULIC_DISPATCHES_V1 = new WeakSet<object>();
const BOUND_EXECUTION_PLAN_UPDATE_SCHEDULES_V1 = new WeakSet<object>();

const PORTABLE_ID = /^[A-Za-z0-9][A-Za-z0-9._/-]{0,255}$/;
const MAXIMUM_EXECUTION_PLAN_DATA_DEPTH_V1 = 256;
const NEWTON_F64_WORKSPACE_ROLES_V1 = Object.freeze([
  "current-unknowns",
  "residual",
  "jacobian",
  "factors",
  "right-hand-side",
  "transformed-right-hand-side",
  "update",
  "trial-unknowns",
  "trial-residual",
  "unknown-scale",
  "residual-scale",
] as const satisfies readonly ExecutionPlanNewtonF64WorkspaceRoleV1[]);
const NEWTON_INT32_WORKSPACE_ROLES_V1 = Object.freeze([
  "pivots",
] as const satisfies readonly ExecutionPlanNewtonInt32WorkspaceRoleV1[]);

export function validateAndOwnExecutionPlanDescriptorV1(
  value: unknown,
): ExecutionPlanDescriptorV1 {
  if (
    (typeof value === "object" || typeof value === "function")
    && value !== null
    && OWNED_EXECUTION_PLAN_DESCRIPTORS_V1.has(value)
  ) {
    return value as ExecutionPlanDescriptorV1;
  }
  const plan = ownDataV1(value, "$") as Record<string, unknown>;
  exactKeysV1(plan, [
    "definitionId",
    "hydraulicGraph",
    "policyId",
    "schemaId",
    "solveGroups",
    "stateLayout",
    "updateSchedule",
  ], "$");
  if (plan.schemaId !== EXECUTION_PLAN_DESCRIPTOR_V1_SCHEMA_ID) {
    failV1("$.schemaId", "schema identity mismatch");
  }
  portableIdV1(plan.definitionId, "$.definitionId");
  portableIdV1(plan.policyId, "$.policyId");

  const stateLayout = recordV1(plan.stateLayout, "$.stateLayout");
  exactKeysV1(stateLayout, [
    "blocks",
    "booleanSlotCount",
    "continuousSlotCount",
    "logicalSlotCount",
    "slots",
  ], "$.stateLayout");
  const logicalSlotCount = nonnegativeIntegerV1(
    stateLayout.logicalSlotCount,
    "$.stateLayout.logicalSlotCount",
  );
  const continuousSlotCount = nonnegativeIntegerV1(
    stateLayout.continuousSlotCount,
    "$.stateLayout.continuousSlotCount",
  );
  const booleanSlotCount = nonnegativeIntegerV1(
    stateLayout.booleanSlotCount,
    "$.stateLayout.booleanSlotCount",
  );
  if (
    logicalSlotCount === 0
    || continuousSlotCount + booleanSlotCount !== logicalSlotCount
  ) {
    failV1("$.stateLayout", "slot counts are inconsistent");
  }
  const blocks = arrayV1(stateLayout.blocks, "$.stateLayout.blocks");
  const slots = arrayV1(stateLayout.slots, "$.stateLayout.slots");
  if (blocks.length === 0 || slots.length !== logicalSlotCount) {
    failV1("$.stateLayout", "block or slot cardinality is inconsistent");
  }
  const componentIds = new Set<string>();
  const componentIdsByBlockIndex: string[] = [];
  const componentKernelById = new Map<string, string>();
  const componentByLogicalIndex: string[] = [];
  const componentKernelIds: string[] = [];
  let nextLogicalStart = 0;
  blocks.forEach((raw, index) => {
    const block = recordV1(raw, `$.stateLayout.blocks[${index}]`);
    exactKeysV1(block, [
      "componentId",
      "kernelId",
      "logicalLength",
      "logicalStart",
    ], `$.stateLayout.blocks[${index}]`);
    const componentId = portableIdV1(
      block.componentId,
      `$.stateLayout.blocks[${index}].componentId`,
    );
    const kernelId = portableIdV1(
      block.kernelId,
      `$.stateLayout.blocks[${index}].kernelId`,
    );
    if (componentIds.has(componentId)) {
      failV1(`$.stateLayout.blocks[${index}]`, "duplicate componentId");
    }
    componentIds.add(componentId);
    componentIdsByBlockIndex.push(componentId);
    componentKernelById.set(componentId, kernelId);
    componentKernelIds.push(kernelId);
    const start = nonnegativeIntegerV1(
      block.logicalStart,
      `$.stateLayout.blocks[${index}].logicalStart`,
    );
    const length = positiveIntegerV1(
      block.logicalLength,
      `$.stateLayout.blocks[${index}].logicalLength`,
    );
    if (start !== nextLogicalStart || start + length > logicalSlotCount) {
      failV1(`$.stateLayout.blocks[${index}]`, "blocks are not contiguous");
    }
    for (let offset = 0; offset < length; offset += 1) {
      componentByLogicalIndex.push(componentId);
    }
    nextLogicalStart += length;
  });
  if (nextLogicalStart !== logicalSlotCount) {
    failV1("$.stateLayout.blocks", "blocks do not cover every state slot");
  }
  const stateIdByLogicalIndex: string[] = [];
  const stateIdSet = new Set<string>();
  const authorityPointerSet = new Set<string>();
  let expectedContinuousIndex = 0;
  let expectedBooleanIndex = 0;
  slots.forEach((raw, index) => {
    const slot = recordV1(raw, `$.stateLayout.slots[${index}]`);
    exactKeysV1(slot, [
      "authorityPointer",
      "componentId",
      "logicalIndex",
      "stateId",
      "storageIndex",
      "storageKind",
      "unit",
    ], `$.stateLayout.slots[${index}]`);
    const stateId = portableIdV1(
      slot.stateId,
      `$.stateLayout.slots[${index}].stateId`,
    );
    const componentId = portableIdV1(
      slot.componentId,
      `$.stateLayout.slots[${index}].componentId`,
    );
    const authorityPointer = authorityPointerV1(
      slot.authorityPointer,
      `$.stateLayout.slots[${index}].authorityPointer`,
    );
    if (stateIdSet.has(stateId)) {
      failV1(`$.stateLayout.slots[${index}]`, "duplicate stateId");
    }
    stateIdSet.add(stateId);
    if (authorityPointerSet.has(authorityPointer)) {
      failV1(
        `$.stateLayout.slots[${index}].authorityPointer`,
        "duplicate accepted-state authority pointer",
      );
    }
    authorityPointerSet.add(authorityPointer);
    if (
      nonnegativeIntegerV1(
        slot.logicalIndex,
        `$.stateLayout.slots[${index}].logicalIndex`,
      ) !== index
      || componentByLogicalIndex[index] !== componentId
    ) {
      failV1(`$.stateLayout.slots[${index}]`, "slot ownership is inconsistent");
    }
    const storageIndex = nonnegativeIntegerV1(
      slot.storageIndex,
      `$.stateLayout.slots[${index}].storageIndex`,
    );
    if (slot.storageKind === "continuous-f64") {
      if (storageIndex !== expectedContinuousIndex++) {
        failV1(`$.stateLayout.slots[${index}]`, "continuous slots are not contiguous");
      }
    } else if (slot.storageKind === "boolean-u8") {
      if (storageIndex !== expectedBooleanIndex++) {
        failV1(`$.stateLayout.slots[${index}]`, "boolean slots are not contiguous");
      }
    } else {
      failV1(`$.stateLayout.slots[${index}].storageKind`, "unsupported storage kind");
    }
    nonemptyStringV1(slot.unit, `$.stateLayout.slots[${index}].unit`);
    stateIdByLogicalIndex.push(stateId);
  });
  if (
    expectedContinuousIndex !== continuousSlotCount
    || expectedBooleanIndex !== booleanSlotCount
  ) {
    failV1("$.stateLayout.slots", "storage indices do not match slot counts");
  }

  const graph = recordV1(plan.hydraulicGraph, "$.hydraulicGraph");
  exactKeysV1(graph, [
    "conservationPools",
    "downstreamNodeIndices",
    "nodeComponentBlockIndices",
    "nodeIds",
    "pathComponentBlockIndices",
    "pathIds",
    "pathKernelIds",
    "storageStateLogicalIndices",
    "upstreamNodeIndices",
  ], "$.hydraulicGraph");
  const nodeIds = portableIdArrayV1(graph.nodeIds, "$.hydraulicGraph.nodeIds");
  const storageIndices = integerArrayV1(
    graph.storageStateLogicalIndices,
    "$.hydraulicGraph.storageStateLogicalIndices",
  );
  const nodeComponentBlockIndices = integerArrayV1(
    graph.nodeComponentBlockIndices,
    "$.hydraulicGraph.nodeComponentBlockIndices",
  );
  uniqueV1(nodeIds, "$.hydraulicGraph.nodeIds");
  if (
    nodeIds.length === 0
    || storageIndices.length !== nodeIds.length
    || nodeComponentBlockIndices.length !== nodeIds.length
  ) {
    failV1("$.hydraulicGraph", "node arrays have inconsistent lengths");
  }
  storageIndices.forEach((logicalIndex, index) => {
    continuousLogicalIndexV1(
      logicalIndex,
      slots,
      `$.hydraulicGraph.storageStateLogicalIndices[${index}]`,
    );
    const componentBlockIndex = nodeComponentBlockIndices[index]!;
    if (
      componentBlockIndex < 0
      || componentBlockIndex >= blocks.length
      || componentIdsByBlockIndex[componentBlockIndex]
        !== componentByLogicalIndex[logicalIndex]
    ) {
      failV1(
        `$.hydraulicGraph.nodeComponentBlockIndices[${index}]`,
        "node component ownership is inconsistent",
      );
    }
  });
  const pathIds = portableIdArrayV1(graph.pathIds, "$.hydraulicGraph.pathIds");
  const pathKernelIds = portableIdArrayV1(
    graph.pathKernelIds,
    "$.hydraulicGraph.pathKernelIds",
  );
  const upstream = integerArrayV1(
    graph.upstreamNodeIndices,
    "$.hydraulicGraph.upstreamNodeIndices",
  );
  const downstream = integerArrayV1(
    graph.downstreamNodeIndices,
    "$.hydraulicGraph.downstreamNodeIndices",
  );
  const pathComponentBlockIndices = integerArrayV1(
    graph.pathComponentBlockIndices,
    "$.hydraulicGraph.pathComponentBlockIndices",
  );
  uniqueV1(pathIds, "$.hydraulicGraph.pathIds");
  if (
    pathIds.length !== pathKernelIds.length
    || pathIds.length !== upstream.length
    || pathIds.length !== downstream.length
    || pathIds.length !== pathComponentBlockIndices.length
  ) {
    failV1("$.hydraulicGraph", "path arrays have inconsistent lengths");
  }
  upstream.forEach((nodeIndex, index) => {
    const componentBlockIndex = pathComponentBlockIndices[index]!;
    if (
      nodeIndex < 0
      || nodeIndex >= nodeIds.length
      || downstream[index]! < 0
      || downstream[index]! >= nodeIds.length
      || nodeIndex === downstream[index]
      || componentBlockIndex < 0
      || componentBlockIndex >= blocks.length
    ) {
      failV1(
        `$.hydraulicGraph.pathIds[${index}]`,
        "path endpoints or component ownership are invalid",
      );
    }
  });
  const pools = arrayV1(
    graph.conservationPools,
    "$.hydraulicGraph.conservationPools",
  );
  const poolIds = new Set<string>();
  pools.forEach((raw, index) => {
    const pool = recordV1(raw, `$.hydraulicGraph.conservationPools[${index}]`);
    exactKeysV1(pool, [
      "dependentStateLogicalIndex",
      "ledgerStateLogicalIndex",
      "memberStateLogicalIndices",
      "poolId",
    ], `$.hydraulicGraph.conservationPools[${index}]`);
    const poolId = portableIdV1(
      pool.poolId,
      `$.hydraulicGraph.conservationPools[${index}].poolId`,
    );
    if (poolIds.has(poolId)) {
      failV1(`$.hydraulicGraph.conservationPools[${index}]`, "duplicate poolId");
    }
    poolIds.add(poolId);
    continuousLogicalIndexV1(
      integerV1(
        pool.ledgerStateLogicalIndex,
        `$.hydraulicGraph.conservationPools[${index}].ledgerStateLogicalIndex`,
      ),
      slots,
      `$.hydraulicGraph.conservationPools[${index}].ledgerStateLogicalIndex`,
    );
    const members = integerArrayV1(
      pool.memberStateLogicalIndices,
      `$.hydraulicGraph.conservationPools[${index}].memberStateLogicalIndices`,
    );
    if (members.length < 2 || new Set(members).size !== members.length) {
      failV1(`$.hydraulicGraph.conservationPools[${index}]`, "pool members are invalid");
    }
    members.forEach((logicalIndex, memberIndex) => continuousLogicalIndexV1(
      logicalIndex,
      slots,
      `$.hydraulicGraph.conservationPools[${index}].memberStateLogicalIndices[${memberIndex}]`,
    ));
    const dependent = integerV1(
      pool.dependentStateLogicalIndex,
      `$.hydraulicGraph.conservationPools[${index}].dependentStateLogicalIndex`,
    );
    if (!members.includes(dependent)) {
      failV1(`$.hydraulicGraph.conservationPools[${index}]`, "dependent state is not a member");
    }
  });

  const solveGroups = arrayV1(plan.solveGroups, "$.solveGroups");
  if (solveGroups.length === 0) failV1("$.solveGroups", "must not be empty");
  const solveGroupIds = new Set<string>();
  solveGroups.forEach((raw, groupIndex) => validateSolveGroupV1(
    raw,
    groupIndex,
    slots,
    stateIdByLogicalIndex,
    componentByLogicalIndex,
    componentKernelById,
    solveGroupIds,
  ));

  const updateSchedule = recordV1(
    plan.updateSchedule,
    "$.updateSchedule",
  );
  exactKeysV1(updateSchedule, [
    "baseTickSec",
    "groups",
    "presentationPeriodTicks",
    "presentationStepSec",
  ], "$.updateSchedule");
  const baseTickSec = positiveFiniteV1(
    updateSchedule.baseTickSec,
    "$.updateSchedule.baseTickSec",
  );
  const presentationPeriodTicks = positiveIntegerV1(
    updateSchedule.presentationPeriodTicks,
    "$.updateSchedule.presentationPeriodTicks",
  );
  const presentationStepSec = positiveFiniteV1(
    updateSchedule.presentationStepSec,
    "$.updateSchedule.presentationStepSec",
  );
  if (!sameCompiledClockValueV1(
    presentationStepSec,
    baseTickSec * presentationPeriodTicks,
  )) {
    failV1(
      "$.updateSchedule.presentationStepSec",
      "does not match the compiled timebase",
    );
  }
  const updateGroups = arrayV1(
    updateSchedule.groups,
    "$.updateSchedule.groups",
  );
  if (updateGroups.length === 0) {
    failV1("$.updateSchedule.groups", "must not be empty");
  }
  const updateGroupIds = new Set<string>();
  updateGroups.forEach((raw, index) => {
    const path = `$.updateSchedule.groups[${index}]`;
    const group = recordV1(raw, path);
    exactKeysV1(group, [
      "effectiveStepSec",
      "integration",
      "ordinal",
      "periodTicks",
      "phaseTicks",
      "solveGroupId",
      "solveGroupIndex",
      "updateGroupId",
    ], path);
    const updateGroupId = portableIdV1(
      group.updateGroupId,
      `${path}.updateGroupId`,
    );
    if (updateGroupIds.has(updateGroupId)) {
      failV1(path, "duplicate updateGroupId");
    }
    updateGroupIds.add(updateGroupId);
    if (integerV1(group.ordinal, `${path}.ordinal`) !== index) {
      failV1(`${path}.ordinal`, "must be contiguous from zero");
    }
    if (group.integration !== "fixed-step-backward-euler"
      && group.integration !== "fixed-step-conservative-partitioned") {
      failV1(`${path}.integration`, "unsupported integration");
    }
    const periodTicks = positiveIntegerV1(
      group.periodTicks,
      `${path}.periodTicks`,
    );
    const phaseTicks = nonnegativeIntegerV1(
      group.phaseTicks,
      `${path}.phaseTicks`,
    );
    if (phaseTicks >= periodTicks) {
      failV1(`${path}.phaseTicks`, "must be below periodTicks");
    }
    const effectiveStepSec = positiveFiniteV1(
      group.effectiveStepSec,
      `${path}.effectiveStepSec`,
    );
    if (!sameCompiledClockValueV1(
      effectiveStepSec,
      baseTickSec * periodTicks,
    )) {
      failV1(`${path}.effectiveStepSec`, "does not match the timebase");
    }
    const solveGroupId = portableIdV1(
      group.solveGroupId,
      `${path}.solveGroupId`,
    );
    const solveGroupIndex = nonnegativeIntegerV1(
      group.solveGroupIndex,
      `${path}.solveGroupIndex`,
    );
    const referencedSolveGroup = solveGroups[solveGroupIndex];
    if (
      !solveGroupIds.has(solveGroupId)
      || referencedSolveGroup === undefined
      || recordV1(
        referencedSolveGroup,
        `$.solveGroups[${solveGroupIndex}]`,
      ).solveGroupId !== solveGroupId
    ) {
      failV1(`${path}.solveGroupIndex`, "solve-group binding is inconsistent");
    }
  });

  // These arrays were read above to ensure the clone is internally complete.
  void componentKernelIds;
  void pathKernelIds;
  const owned = plan as unknown as ExecutionPlanDescriptorV1;
  OWNED_EXECUTION_PLAN_DESCRIPTORS_V1.add(owned);
  return owned;
}

export function bindExecutionPlanV1(
  descriptorValue: unknown,
  catalogValue: unknown,
): BoundExecutionPlanV1 {
  const descriptor = validateAndOwnExecutionPlanDescriptorV1(descriptorValue);
  const catalog = validateAndOwnExecutionPlanKernelCatalogV1(catalogValue);
  assertExecutionPlanCatalogMatchesDescriptorV1(descriptor, catalog);
  const requiredComponents = descriptor.stateLayout.blocks
    .map(({ kernelId }) => kernelId);
  const requiredPaths = descriptor.hydraulicGraph.pathKernelIds;
  const requiredSolveSystems = descriptor.solveGroups
    .map(({ systemKernelId }) => systemKernelId);
  const componentOrdinalById = new Map(catalog.componentKernelIds.map(
    (kernelId, ordinal) => [kernelId, ordinal] as const,
  ));
  const pathOrdinalById = new Map(catalog.hydraulicPathKernelIds.map(
    (kernelId, ordinal) => [kernelId, ordinal] as const,
  ));
  const solveSystemOrdinalById = new Map(catalog.solveSystemKernelIds.map(
    (kernelId, ordinal) => [kernelId, ordinal] as const,
  ));
  const componentKernelBindingOrdinals = Int32Array.from(
    requiredComponents.map((kernelId) => componentOrdinalById.get(kernelId)!),
  );
  const hydraulicPathKernelBindingOrdinals = Int32Array.from(
    requiredPaths.map((kernelId) => pathOrdinalById.get(kernelId)!),
  );
  const solveSystemKernelBindingOrdinals = Int32Array.from(
    requiredSolveSystems.map((kernelId) =>
      solveSystemOrdinalById.get(kernelId)!),
  );
  const graphStorageStateLogicalIndices = Int32Array.from(
    descriptor.hydraulicGraph.storageStateLogicalIndices,
  );
  const graphUpstreamNodeIndices = Int32Array.from(
    descriptor.hydraulicGraph.upstreamNodeIndices,
  );
  const graphDownstreamNodeIndices = Int32Array.from(
    descriptor.hydraulicGraph.downstreamNodeIndices,
  );
  const stateIndexById = new Map(descriptor.stateLayout.slots.map(
    ({ stateId, logicalIndex }) => [stateId, logicalIndex] as const,
  ));
  const solveGroups = Object.freeze(descriptor.solveGroups.map((group) => {
    const activeStateIds = group.blocks
      .filter(({ disposition }) => disposition === "retained")
      .flatMap(({ stateIds }) => stateIds);
    return Object.freeze({
      solveGroupId: group.solveGroupId,
      activeStateLogicalIndices: Int32Array.from(
        activeStateIds.map((stateId) => stateIndexById.get(stateId)!),
      ),
      dependentStateLogicalIndices: Int32Array.from(
        group.dependentStateIds.map((stateId) => stateIndexById.get(stateId)!),
      ),
      workspaceF64: new Float64Array(group.workspace.f64Count),
      workspaceInt32: new Int32Array(group.workspace.int32Count),
    });
  }));
  const arrays: ArrayBufferView[] = [
    componentKernelBindingOrdinals,
    hydraulicPathKernelBindingOrdinals,
    solveSystemKernelBindingOrdinals,
    graphStorageStateLogicalIndices,
    graphUpstreamNodeIndices,
    graphDownstreamNodeIndices,
    ...solveGroups.flatMap((group) => [
      group.activeStateLogicalIndices,
      group.dependentStateLogicalIndices,
      group.workspaceF64,
      group.workspaceInt32,
    ]),
  ];
  const bound = Object.freeze({
    schemaId: BOUND_EXECUTION_PLAN_V1_SCHEMA_ID,
    definitionId: descriptor.definitionId,
    policyId: descriptor.policyId,
    bindingCatalog: catalog,
    componentKernelBindingOrdinals,
    hydraulicPathKernelBindingOrdinals,
    solveSystemKernelBindingOrdinals,
    graphStorageStateLogicalIndices,
    graphUpstreamNodeIndices,
    graphDownstreamNodeIndices,
    solveGroups,
    allocatedBytes: arrays.reduce((total, view) => total + view.byteLength, 0),
  });
  assertBoundExecutionPlanV1(bound, descriptor);
  BOUND_EXECUTION_PLAN_METADATA_V1.set(bound, Object.freeze({
    descriptor,
    stateDispatch: Object.freeze({
      definitionId: descriptor.definitionId,
      logicalSlotCount: descriptor.stateLayout.logicalSlotCount,
      continuousSlotCount: descriptor.stateLayout.continuousSlotCount,
      booleanSlotCount: descriptor.stateLayout.booleanSlotCount,
      slots: Object.freeze(descriptor.stateLayout.slots.map((slot) =>
        Object.freeze({
          stateId: slot.stateId,
          authorityPointer: slot.authorityPointer,
          logicalIndex: slot.logicalIndex,
          storageKind: slot.storageKind,
        }))),
    }),
    hydraulicDispatch: createBoundHydraulicDispatchV1(descriptor, bound),
    updateSchedule: createBoundUpdateScheduleV1(descriptor, bound),
    solveGroups: Object.freeze(descriptor.solveGroups.map(
      (descriptorGroup, index) => createBoundSolveGroupMetadataV1(
        descriptor,
        descriptorGroup,
        solveGroups[index]!,
        bound,
        index,
      ),
    )),
  }));
  return bound;
}

/** Resolves immutable compiler-owned state identity and authority metadata. */
export function resolveBoundExecutionPlanStateDispatchV1(
  bound: BoundExecutionPlanV1,
): BoundExecutionPlanStateDispatchV1 {
  const metadata = BOUND_EXECUTION_PLAN_METADATA_V1.get(bound);
  if (metadata === undefined) {
    throw new Error("Execution plan state dispatch requires a bound plan");
  }
  return metadata.stateDispatch;
}

/**
 * Resolves immutable compiler-owned hydraulic topology, component ownership,
 * and exact kernel ordinals. The dispatch is admitted only for the original
 * Worker-local bound plan, never for a structurally similar clone.
 */
export function resolveBoundExecutionPlanHydraulicDispatchV1(
  bound: BoundExecutionPlanV1,
): BoundExecutionPlanHydraulicDispatchV1 {
  const metadata = BOUND_EXECUTION_PLAN_METADATA_V1.get(bound);
  if (metadata === undefined) {
    throw new Error("Execution plan hydraulic dispatch requires a bound plan");
  }
  return metadata.hydraulicDispatch;
}

/** Rejects structural lookalikes at the model-owned kernel boundary. */
export function assertBoundExecutionPlanHydraulicDispatchV1(
  value: unknown,
): asserts value is BoundExecutionPlanHydraulicDispatchV1 {
  if (
    (typeof value !== "object" && typeof value !== "function")
    || value === null
    || !BOUND_EXECUTION_PLAN_HYDRAULIC_DISPATCHES_V1.has(value)
  ) {
    throw new Error(
      "Execution plan hydraulic dispatch must be compiler-bound",
    );
  }
}

/** Resolves the compiler-owned integer timebase and update-group schedule. */
export function resolveBoundExecutionPlanUpdateScheduleV1(
  bound: BoundExecutionPlanV1,
): BoundExecutionPlanUpdateScheduleV1 {
  const metadata = BOUND_EXECUTION_PLAN_METADATA_V1.get(bound);
  if (metadata === undefined) {
    throw new Error("Execution plan update schedule requires a bound plan");
  }
  return metadata.updateSchedule;
}

/** Rejects copied schedules at the model-owned clock boundary. */
export function assertBoundExecutionPlanUpdateScheduleV1(
  value: unknown,
): asserts value is BoundExecutionPlanUpdateScheduleV1 {
  if (
    (typeof value !== "object" && typeof value !== "function")
    || value === null
    || !BOUND_EXECUTION_PLAN_UPDATE_SCHEDULES_V1.has(value)
  ) {
    throw new Error("Execution plan update schedule must be compiler-bound");
  }
}

/** Exact integer base-tick to accepted-clock projection. */
export function executionPlanTimeAtBaseTickV1(
  schedule: BoundExecutionPlanUpdateScheduleV1,
  baseTick: number,
): number {
  assertBoundExecutionPlanUpdateScheduleV1(schedule);
  if (!Number.isSafeInteger(baseTick) || baseTick < 0) {
    throw new RangeError("Execution plan base tick is invalid");
  }
  const timeSec = baseTick * schedule.baseTickSec;
  if (!Number.isFinite(timeSec)) {
    throw new RangeError("Execution plan base-tick time exceeds its range");
  }
  return timeSec;
}

/** Accepted clock to exact integer base tick, with only roundoff tolerance. */
export function executionPlanBaseTickAtTimeV1(
  schedule: BoundExecutionPlanUpdateScheduleV1,
  timeSec: number,
): number {
  assertBoundExecutionPlanUpdateScheduleV1(schedule);
  if (!Number.isFinite(timeSec) || timeSec < 0) {
    throw new RangeError("Execution plan accepted time is invalid");
  }
  const baseTick = Math.round(timeSec / schedule.baseTickSec);
  if (!Number.isSafeInteger(baseTick)) {
    throw new RangeError("Execution plan base tick exceeds the safe integer range");
  }
  const canonicalTimeSec = executionPlanTimeAtBaseTickV1(schedule, baseTick);
  const toleranceSec = Math.max(
    1e-12,
    Number.EPSILON * Math.max(1, Math.abs(timeSec)) * 8,
  );
  if (Math.abs(canonicalTimeSec - timeSec) > toleranceSec) {
    throw new Error("Execution plan accepted clock is not on its base timebase");
  }
  return baseTick;
}

/** Presentation ordinal to a future base tick without floating accumulation. */
export function executionPlanPresentationBaseTickV1(
  schedule: BoundExecutionPlanUpdateScheduleV1,
  originBaseTick: number,
  presentationOrdinal: number,
): number {
  assertBoundExecutionPlanUpdateScheduleV1(schedule);
  if (
    !Number.isSafeInteger(originBaseTick)
    || originBaseTick < 0
    || !Number.isSafeInteger(presentationOrdinal)
    || presentationOrdinal < 0
  ) {
    throw new RangeError("Execution plan presentation clock is invalid");
  }
  const baseTick = originBaseTick
    + presentationOrdinal * schedule.presentationPeriodTicks;
  if (!Number.isSafeInteger(baseTick)) {
    throw new RangeError(
      "Execution plan presentation tick exceeds the safe integer range",
    );
  }
  return baseTick;
}

/** Compiler-bound update-group cadence test on the integer base timebase. */
export function executionPlanUpdateGroupIsDueAtBaseTickV1(
  schedule: BoundExecutionPlanUpdateScheduleV1,
  group: BoundExecutionPlanUpdateGroupDispatchV1,
  baseTick: number,
): boolean {
  assertBoundExecutionPlanUpdateScheduleV1(schedule);
  if (!Number.isSafeInteger(baseTick) || baseTick < 0) {
    throw new RangeError("Execution plan update base tick is invalid");
  }
  if (
    !Number.isSafeInteger(group.ordinal)
    || schedule.groups[group.ordinal] !== group
  ) {
    throw new Error("Execution plan update group does not belong to its schedule");
  }
  return baseTick >= group.phaseTicks
    && (baseTick - group.phaseTicks) % group.periodTicks === 0;
}

/** Returns persistent views over one compiler-owned preallocated workspace. */
export function prepareBoundExecutionPlanSolveGroupV1(
  bound: BoundExecutionPlanV1,
  solveGroupId: string,
): BoundExecutionPlanNewtonWorkspaceV1 {
  const metadata = BOUND_EXECUTION_PLAN_METADATA_V1.get(bound);
  if (metadata === undefined) {
    throw new Error("Execution plan solve preparation requires a bound plan");
  }
  const group = metadata.solveGroups.find((candidate) =>
    candidate.solveGroupId === solveGroupId);
  if (group === undefined) {
    throw new Error(`Execution plan solve group ${solveGroupId} is unavailable`);
  }
  return group.workspace;
}

/**
 * Resolves immutable block/kernel dispatch metadata compiled for one solve
 * group. No numerical callback is stored in the portable descriptor.
 */
export function resolveBoundExecutionPlanSolveDispatchV1(
  bound: BoundExecutionPlanV1,
  solveGroupId: string,
): BoundExecutionPlanSolveDispatchV1 {
  const metadata = BOUND_EXECUTION_PLAN_METADATA_V1.get(bound);
  if (metadata === undefined) {
    throw new Error("Execution plan dispatch requires a bound plan");
  }
  const group = metadata.solveGroups.find((candidate) =>
    candidate.solveGroupId === solveGroupId);
  if (group === undefined) {
    throw new Error(`Execution plan solve group ${solveGroupId} is unavailable`);
  }
  return group.dispatch;
}

/**
 * Resolves one model-owned solve-system implementation by the compiler-bound
 * ordinal. Function bindings stay inside the exact artifact and never enter
 * the portable descriptor.
 */
export function bindExecutionPlanSolveSystemRuntimeV1<TResult>(
  bound: BoundExecutionPlanV1,
  solveGroupId: string,
  workspace: BoundExecutionPlanNewtonWorkspaceV1,
  bindings: readonly ExecutionPlanSolveSystemRuntimeBindingV1<TResult>[],
): TResult {
  if (!Array.isArray(bindings)) {
    throw new TypeError("Execution plan solve-system bindings must be an array");
  }
  if (bindings.length !== bound.bindingCatalog.solveSystemKernelIds.length) {
    throw new Error(
      "Execution plan solve-system runtime bindings must match exactly",
    );
  }
  for (let index = 0; index < bindings.length; index += 1) {
    const binding = bindings[index];
    if (
      binding === undefined
      || binding.systemKernelId
        !== bound.bindingCatalog.solveSystemKernelIds[index]
      || typeof binding.bind !== "function"
    ) {
      throw new Error(
        "Execution plan solve-system runtime binding order drifted",
      );
    }
  }
  const dispatch = resolveBoundExecutionPlanSolveDispatchV1(
    bound,
    solveGroupId,
  );
  const expectedWorkspace = BOUND_EXECUTION_PLAN_METADATA_V1.get(bound)
    ?.solveGroups.find((candidate) =>
      candidate.solveGroupId === solveGroupId)?.workspace;
  if (workspace !== expectedWorkspace) {
    throw new Error(
      `Execution plan solve group ${solveGroupId} requires its bound workspace`,
    );
  }
  const binding = bindings[dispatch.solveSystemKernelBindingOrdinal];
  if (binding?.systemKernelId !== dispatch.systemKernelId) {
    throw new Error(
      `Execution plan solve group ${solveGroupId} runtime binding drifted`,
    );
  }
  if (
    workspace.solveGroupId !== dispatch.solveGroupId
    || workspace.dimension !== dispatch.activeUnknownCount
  ) {
    throw new Error(
      `Execution plan solve group ${solveGroupId} workspace drifted`,
    );
  }
  return binding.bind(Object.freeze({
    dispatch,
    hydraulicDispatch: resolveBoundExecutionPlanHydraulicDispatchV1(bound),
    workspace,
  }));
}

function createBoundHydraulicDispatchV1(
  descriptor: ExecutionPlanDescriptorV1,
  bound: BoundExecutionPlanV1,
): BoundExecutionPlanHydraulicDispatchV1 {
  const componentBindings = Object.freeze(descriptor.stateLayout.blocks.map(
    (block, componentBlockIndex) => {
      const bindingOrdinal =
        bound.componentKernelBindingOrdinals[componentBlockIndex];
      if (
        bindingOrdinal === undefined
        || bound.bindingCatalog.componentKernelIds[bindingOrdinal]
          !== block.kernelId
      ) {
        throw new Error("Execution plan hydraulic component binding drifted");
      }
      return Object.freeze({
        componentId: block.componentId,
        componentKernelId: block.kernelId,
        componentKernelBindingOrdinal: bindingOrdinal,
      });
    },
  ));
  const componentDispatch = (componentBlockIndex: number) => {
    const component = componentBindings[componentBlockIndex];
    if (component === undefined) {
      throw new Error("Execution plan hydraulic component owner drifted");
    }
    return component;
  };
  const nodes = Object.freeze(descriptor.hydraulicGraph.nodeIds.map(
    (nodeId, index) => Object.freeze({
      nodeId,
      ...componentDispatch(
        descriptor.hydraulicGraph.nodeComponentBlockIndices[index]!,
      ),
      storageStateLogicalIndex:
        descriptor.hydraulicGraph.storageStateLogicalIndices[index]!,
    }),
  ));
  const paths = Object.freeze(descriptor.hydraulicGraph.pathIds.map(
    (pathId, index) => {
      const pathKernelId = descriptor.hydraulicGraph.pathKernelIds[index]!;
      const pathKernelBindingOrdinal =
        bound.hydraulicPathKernelBindingOrdinals[index]!;
      if (
        bound.bindingCatalog.hydraulicPathKernelIds[
          pathKernelBindingOrdinal
        ] !== pathKernelId
      ) {
        throw new Error("Execution plan hydraulic path binding drifted");
      }
      return Object.freeze({
        pathId,
        ...componentDispatch(
          descriptor.hydraulicGraph.pathComponentBlockIndices[index]!,
        ),
        upstreamNodeIndex:
          descriptor.hydraulicGraph.upstreamNodeIndices[index]!,
        downstreamNodeIndex:
          descriptor.hydraulicGraph.downstreamNodeIndices[index]!,
        pathKernelId,
        pathKernelBindingOrdinal,
      });
    },
  ));
  const dispatch = Object.freeze({
    definitionId: descriptor.definitionId,
    nodes,
    paths,
    conservationPools: Object.freeze(
      descriptor.hydraulicGraph.conservationPools.map((pool) =>
        Object.freeze({
          poolId: pool.poolId,
          ledgerStateLogicalIndex: pool.ledgerStateLogicalIndex,
          memberStateLogicalIndices: Object.freeze([
            ...pool.memberStateLogicalIndices,
          ]),
          dependentStateLogicalIndex: pool.dependentStateLogicalIndex,
        })),
    ),
  });
  BOUND_EXECUTION_PLAN_HYDRAULIC_DISPATCHES_V1.add(dispatch);
  return dispatch;
}

function createBoundUpdateScheduleV1(
  descriptor: ExecutionPlanDescriptorV1,
  bound: BoundExecutionPlanV1,
): BoundExecutionPlanUpdateScheduleV1 {
  const groups = Object.freeze(descriptor.updateSchedule.groups.map((group) => {
    const solveGroup = descriptor.solveGroups[group.solveGroupIndex];
    const solveSystemKernelBindingOrdinal =
      bound.solveSystemKernelBindingOrdinals[group.solveGroupIndex];
    if (
      solveGroup === undefined
      || solveGroup.solveGroupId !== group.solveGroupId
      || solveSystemKernelBindingOrdinal === undefined
      || bound.bindingCatalog.solveSystemKernelIds[
        solveSystemKernelBindingOrdinal
      ] !== solveGroup.systemKernelId
    ) {
      throw new Error("Execution plan update-group solve binding drifted");
    }
    return Object.freeze({
      ...group,
      systemKernelId: solveGroup.systemKernelId,
      solveSystemKernelBindingOrdinal,
    });
  }));
  const schedule = Object.freeze({
    definitionId: descriptor.definitionId,
    policyId: descriptor.policyId,
    baseTickSec: descriptor.updateSchedule.baseTickSec,
    presentationPeriodTicks:
      descriptor.updateSchedule.presentationPeriodTicks,
    presentationStepSec: descriptor.updateSchedule.presentationStepSec,
    groups,
  });
  BOUND_EXECUTION_PLAN_UPDATE_SCHEDULES_V1.add(schedule);
  return schedule;
}

function createBoundSolveGroupMetadataV1(
  descriptor: ExecutionPlanDescriptorV1,
  descriptorGroup: ExecutionPlanSolveGroupV1,
  boundGroup: BoundExecutionPlanSolveGroupV1,
  bound: BoundExecutionPlanV1,
  solveGroupIndex: number,
): BoundExecutionPlanSolveGroupMetadataV1 {
  for (const logicalIndex of boundGroup.activeStateLogicalIndices) {
    if (descriptor.stateLayout.slots[logicalIndex]?.storageKind
      !== "continuous-f64") {
      throw new Error(
        "Execution plan active solve state must use continuous storage",
      );
    }
  }
  const f64View = (
    role: ExecutionPlanNewtonF64WorkspaceRoleV1,
  ): Float64Array => {
    const segment = descriptorGroup.workspace.f64Segments.find(
      (candidate) => candidate.role === role,
    );
    if (segment === undefined) {
      throw new Error(`Execution plan workspace omits ${role}`);
    }
    return new Float64Array(
      boundGroup.workspaceF64.buffer,
      boundGroup.workspaceF64.byteOffset
        + segment.offset * Float64Array.BYTES_PER_ELEMENT,
      segment.length,
    );
  };
  const int32View = (
    role: ExecutionPlanNewtonInt32WorkspaceRoleV1,
  ): Int32Array => {
    const segment = descriptorGroup.workspace.int32Segments.find(
      (candidate) => candidate.role === role,
    );
    if (segment === undefined) {
      throw new Error(`Execution plan workspace omits ${role}`);
    }
    return new Int32Array(
      boundGroup.workspaceInt32.buffer,
      boundGroup.workspaceInt32.byteOffset
        + segment.offset * Int32Array.BYTES_PER_ELEMENT,
      segment.length,
    );
  };
  const workspace = Object.freeze({
    solveGroupId: descriptorGroup.solveGroupId,
    dimension: descriptorGroup.activeUnknownCount,
    currentUnknowns: f64View("current-unknowns"),
    residual: f64View("residual"),
    jacobian: f64View("jacobian"),
    factors: f64View("factors"),
    rightHandSide: f64View("right-hand-side"),
    transformedRightHandSide: f64View("transformed-right-hand-side"),
    update: f64View("update"),
    trialUnknowns: f64View("trial-unknowns"),
    trialResidual: f64View("trial-residual"),
    unknownScale: f64View("unknown-scale"),
    residualScale: f64View("residual-scale"),
    pivots: int32View("pivots"),
  });
  assertCanonicalNewtonWorkspaceViewsV1(
    workspace,
    boundGroup,
    descriptorGroup,
  );
  const solveSystemKernelBindingOrdinal =
    bound.solveSystemKernelBindingOrdinals[solveGroupIndex]!;
  if (
    bound.bindingCatalog.solveSystemKernelIds[
      solveSystemKernelBindingOrdinal
    ] !== descriptorGroup.systemKernelId
  ) {
    throw new Error(
      `Execution plan solve group ${descriptorGroup.solveGroupId} system kernel binding drifted`,
    );
  }
  const dispatch = Object.freeze({
    solveGroupId: descriptorGroup.solveGroupId,
    systemKernelId: descriptorGroup.systemKernelId,
    solveSystemKernelBindingOrdinal,
    totalUnknownCount: descriptorGroup.totalUnknownCount,
    activeUnknownCount: descriptorGroup.activeUnknownCount,
    blocks: Object.freeze(descriptorGroup.blocks.map((block) => {
      const stateBlockIndex = descriptor.stateLayout.blocks.findIndex(
        ({ componentId }) => componentId === block.componentId,
      );
      if (stateBlockIndex < 0) {
        throw new Error(
          `Execution plan solve block ${block.blockId} has no component owner`,
        );
      }
      const componentKernelBindingOrdinal =
        bound.componentKernelBindingOrdinals[stateBlockIndex]!;
      if (
        bound.bindingCatalog.componentKernelIds[
          componentKernelBindingOrdinal
        ] !== block.kernelId
      ) {
        throw new Error(
          `Execution plan solve block ${block.blockId} kernel binding drifted`,
        );
      }
      return Object.freeze({
        blockId: block.blockId,
        componentId: block.componentId,
        kernelId: block.kernelId,
        componentKernelBindingOrdinal,
        disposition: block.disposition,
        start: block.start,
        length: block.length,
        endExclusive: block.endExclusive,
      });
    })),
  });
  return Object.freeze({
    solveGroupId: descriptorGroup.solveGroupId,
    workspace,
    dispatch,
  });
}

function assertCanonicalNewtonWorkspaceViewsV1(
  workspace: BoundExecutionPlanNewtonWorkspaceV1,
  boundGroup: BoundExecutionPlanSolveGroupV1,
  descriptorGroup: ExecutionPlanSolveGroupV1,
): void {
  if (
    workspace.solveGroupId !== descriptorGroup.solveGroupId
    || workspace.dimension !== descriptorGroup.activeUnknownCount
  ) {
    throw new Error("Execution plan Newton workspace identity drifted");
  }
  const f64Views = [
    ["current-unknowns", workspace.currentUnknowns],
    ["residual", workspace.residual],
    ["jacobian", workspace.jacobian],
    ["factors", workspace.factors],
    ["right-hand-side", workspace.rightHandSide],
    ["transformed-right-hand-side", workspace.transformedRightHandSide],
    ["update", workspace.update],
    ["trial-unknowns", workspace.trialUnknowns],
    ["trial-residual", workspace.trialResidual],
    ["unknown-scale", workspace.unknownScale],
    ["residual-scale", workspace.residualScale],
  ] as const satisfies readonly (readonly [
    ExecutionPlanNewtonF64WorkspaceRoleV1,
    Float64Array,
  ])[];
  for (const [role, view] of f64Views) {
    const segment = descriptorGroup.workspace.f64Segments.find(
      (candidate) => candidate.role === role,
    )!;
    if (
      view.buffer !== boundGroup.workspaceF64.buffer
      || view.byteOffset !== boundGroup.workspaceF64.byteOffset
        + segment.offset * Float64Array.BYTES_PER_ELEMENT
      || view.length !== segment.length
      || view.byteLength
        !== segment.length * Float64Array.BYTES_PER_ELEMENT
    ) {
      throw new Error(`Execution plan Newton workspace ${role} view drifted`);
    }
  }
  const [pivotSegment] = descriptorGroup.workspace.int32Segments;
  if (
    pivotSegment?.role !== "pivots"
    || workspace.pivots.buffer !== boundGroup.workspaceInt32.buffer
    || workspace.pivots.byteOffset !== boundGroup.workspaceInt32.byteOffset
      + pivotSegment.offset * Int32Array.BYTES_PER_ELEMENT
    || workspace.pivots.length !== pivotSegment.length
    || workspace.pivots.byteLength
      !== pivotSegment.length * Int32Array.BYTES_PER_ELEMENT
  ) {
    throw new Error("Execution plan Newton workspace pivots view drifted");
  }
}

export function assertBoundExecutionPlanV1(
  value: unknown,
  descriptorValue: unknown,
): asserts value is BoundExecutionPlanV1 {
  if (
    (typeof value === "object" || typeof value === "function")
    && value !== null
    && BOUND_EXECUTION_PLAN_METADATA_V1.get(value)?.descriptor
      === descriptorValue
  ) {
    return;
  }
  const descriptor = validateAndOwnExecutionPlanDescriptorV1(descriptorValue);
  const bound = recordV1(value, "$.boundExecutionPlan");
  exactKeysV1(bound, [
    "allocatedBytes",
    "bindingCatalog",
    "componentKernelBindingOrdinals",
    "definitionId",
    "graphDownstreamNodeIndices",
    "graphStorageStateLogicalIndices",
    "graphUpstreamNodeIndices",
    "hydraulicPathKernelBindingOrdinals",
    "policyId",
    "schemaId",
    "solveSystemKernelBindingOrdinals",
    "solveGroups",
  ], "$.boundExecutionPlan");
  if (
    bound.schemaId !== BOUND_EXECUTION_PLAN_V1_SCHEMA_ID
    || bound.definitionId !== descriptor.definitionId
    || bound.policyId !== descriptor.policyId
  ) {
    failV1("$.boundExecutionPlan", "descriptor identity mismatch");
  }
  const catalog = validateAndOwnExecutionPlanKernelCatalogV1(
    bound.bindingCatalog,
  );
  assertExecutionPlanCatalogMatchesDescriptorV1(descriptor, catalog);
  const componentOrdinals = int32ViewV1(
    bound.componentKernelBindingOrdinals,
    descriptor.stateLayout.blocks.length,
    "$.boundExecutionPlan.componentKernelBindingOrdinals",
  );
  const pathOrdinals = int32ViewV1(
    bound.hydraulicPathKernelBindingOrdinals,
    descriptor.hydraulicGraph.pathIds.length,
    "$.boundExecutionPlan.hydraulicPathKernelBindingOrdinals",
  );
  const solveSystemOrdinals = int32ViewV1(
    bound.solveSystemKernelBindingOrdinals,
    descriptor.solveGroups.length,
    "$.boundExecutionPlan.solveSystemKernelBindingOrdinals",
  );
  descriptor.stateLayout.blocks.forEach((block, index) => {
    if (catalog.componentKernelIds[componentOrdinals[index]!] !== block.kernelId) {
      failV1("$.boundExecutionPlan.componentKernelBindingOrdinals", "binding mismatch");
    }
  });
  descriptor.hydraulicGraph.pathKernelIds.forEach((kernelId, index) => {
    if (catalog.hydraulicPathKernelIds[pathOrdinals[index]!] !== kernelId) {
      failV1("$.boundExecutionPlan.hydraulicPathKernelBindingOrdinals", "binding mismatch");
    }
  });
  descriptor.solveGroups.forEach(({ systemKernelId }, index) => {
    if (
      catalog.solveSystemKernelIds[solveSystemOrdinals[index]!]
        !== systemKernelId
    ) {
      failV1(
        "$.boundExecutionPlan.solveSystemKernelBindingOrdinals",
        "binding mismatch",
      );
    }
  });
  const arrays: ArrayBufferView[] = [
    componentOrdinals,
    pathOrdinals,
    solveSystemOrdinals,
  ];
  arrays.push(assertInt32ValuesV1(
    bound.graphStorageStateLogicalIndices,
    descriptor.hydraulicGraph.storageStateLogicalIndices,
    "$.boundExecutionPlan.graphStorageStateLogicalIndices",
  ));
  arrays.push(assertInt32ValuesV1(
    bound.graphUpstreamNodeIndices,
    descriptor.hydraulicGraph.upstreamNodeIndices,
    "$.boundExecutionPlan.graphUpstreamNodeIndices",
  ));
  arrays.push(assertInt32ValuesV1(
    bound.graphDownstreamNodeIndices,
    descriptor.hydraulicGraph.downstreamNodeIndices,
    "$.boundExecutionPlan.graphDownstreamNodeIndices",
  ));
  const solveGroups = arrayV1(bound.solveGroups, "$.boundExecutionPlan.solveGroups");
  if (solveGroups.length !== descriptor.solveGroups.length) {
    failV1("$.boundExecutionPlan.solveGroups", "group count mismatch");
  }
  solveGroups.forEach((raw, index) => {
    const group = recordV1(raw, `$.boundExecutionPlan.solveGroups[${index}]`);
    exactKeysV1(group, [
      "activeStateLogicalIndices",
      "dependentStateLogicalIndices",
      "solveGroupId",
      "workspaceF64",
      "workspaceInt32",
    ], `$.boundExecutionPlan.solveGroups[${index}]`);
    const descriptorGroup = descriptor.solveGroups[index]!;
    if (group.solveGroupId !== descriptorGroup.solveGroupId) {
      failV1(`$.boundExecutionPlan.solveGroups[${index}]`, "solveGroupId mismatch");
    }
    const stateIndexById = new Map(descriptor.stateLayout.slots.map(
      ({ stateId, logicalIndex }) => [stateId, logicalIndex] as const,
    ));
    const expectedActive = descriptorGroup.blocks
      .filter(({ disposition }) => disposition === "retained")
      .flatMap(({ stateIds }) => stateIds.map((id) => stateIndexById.get(id)!));
    arrays.push(assertInt32ValuesV1(
      group.activeStateLogicalIndices,
      expectedActive,
      `$.boundExecutionPlan.solveGroups[${index}].activeStateLogicalIndices`,
    ));
    arrays.push(assertInt32ValuesV1(
      group.dependentStateLogicalIndices,
      descriptorGroup.dependentStateIds.map((id) => stateIndexById.get(id)!),
      `$.boundExecutionPlan.solveGroups[${index}].dependentStateLogicalIndices`,
    ));
    arrays.push(f64ViewV1(
      group.workspaceF64,
      descriptorGroup.workspace.f64Count,
      `$.boundExecutionPlan.solveGroups[${index}].workspaceF64`,
    ));
    arrays.push(int32ViewV1(
      group.workspaceInt32,
      descriptorGroup.workspace.int32Count,
      `$.boundExecutionPlan.solveGroups[${index}].workspaceInt32`,
    ));
  });
  const buffers = new Set(arrays.map((view) => view.buffer));
  if (buffers.size !== arrays.length) {
    failV1("$.boundExecutionPlan", "typed allocations must not alias");
  }
  const allocatedBytes = arrays.reduce(
    (total, view) => total + view.byteLength,
    0,
  );
  if (
    nonnegativeIntegerV1(bound.allocatedBytes, "$.boundExecutionPlan.allocatedBytes")
      !== allocatedBytes
  ) {
    failV1("$.boundExecutionPlan.allocatedBytes", "allocation total mismatch");
  }
}

function validateSolveGroupV1(
  raw: unknown,
  groupIndex: number,
  slots: readonly unknown[],
  stateIdByLogicalIndex: readonly string[],
  componentByLogicalIndex: readonly string[],
  componentKernelById: ReadonlyMap<string, string>,
  solveGroupIds: Set<string>,
): void {
  const path = `$.solveGroups[${groupIndex}]`;
  const group = recordV1(raw, path);
  exactKeysV1(group, [
    "activeUnknownCount",
    "activeUnknownStateIds",
    "blocks",
    "dependentStateIds",
    "jacobianElementCount",
    "solveGroupId",
    "solver",
    "systemKernelId",
    "totalUnknownCount",
    "unknownStateIds",
    "workspace",
  ], path);
  const solveGroupId = portableIdV1(group.solveGroupId, `${path}.solveGroupId`);
  portableIdV1(group.systemKernelId, `${path}.systemKernelId`);
  if (solveGroupIds.has(solveGroupId)) failV1(path, "duplicate solveGroupId");
  solveGroupIds.add(solveGroupId);
  const unknownStateIds = portableIdArrayV1(
    group.unknownStateIds,
    `${path}.unknownStateIds`,
  );
  const activeUnknownStateIds = portableIdArrayV1(
    group.activeUnknownStateIds,
    `${path}.activeUnknownStateIds`,
  );
  const dependentStateIds = portableIdArrayV1(
    group.dependentStateIds,
    `${path}.dependentStateIds`,
  );
  uniqueV1(unknownStateIds, `${path}.unknownStateIds`);
  uniqueV1(activeUnknownStateIds, `${path}.activeUnknownStateIds`);
  uniqueV1(dependentStateIds, `${path}.dependentStateIds`);
  const blocks = arrayV1(group.blocks, `${path}.blocks`);
  if (blocks.length === 0) failV1(`${path}.blocks`, "must not be empty");
  const compiledUnknowns: string[] = [];
  const compiledActive: string[] = [];
  const blockIds = new Set<string>();
  const residualIdsAcrossBlocks = new Set<string>();
  let nextStart = 0;
  blocks.forEach((blockRaw, blockIndex) => {
    const blockPath = `${path}.blocks[${blockIndex}]`;
    const block = recordV1(blockRaw, blockPath);
    exactKeysV1(block, [
      "blockId",
      "componentId",
      "disposition",
      "endExclusive",
      "kernelId",
      "length",
      "residualIds",
      "start",
      "stateIds",
      "stateLogicalIndices",
    ], blockPath);
    const blockId = portableIdV1(block.blockId, `${blockPath}.blockId`);
    const componentId = portableIdV1(
      block.componentId,
      `${blockPath}.componentId`,
    );
    const kernelId = portableIdV1(block.kernelId, `${blockPath}.kernelId`);
    if (componentKernelById.get(componentId) !== kernelId) {
      failV1(blockPath, "solve block component kernel identity mismatch");
    }
    if (blockIds.has(blockId)) failV1(blockPath, "duplicate blockId");
    blockIds.add(blockId);
    if (block.disposition !== "retained"
      && block.disposition !== "statically-condensed") {
      failV1(`${blockPath}.disposition`, "unsupported disposition");
    }
    const stateIds = portableIdArrayV1(block.stateIds, `${blockPath}.stateIds`);
    const residualIds = portableIdArrayV1(
      block.residualIds,
      `${blockPath}.residualIds`,
    );
    uniqueV1(stateIds, `${blockPath}.stateIds`);
    uniqueV1(residualIds, `${blockPath}.residualIds`);
    residualIds.forEach((residualId) => {
      if (residualIdsAcrossBlocks.has(residualId)) {
        failV1(`${blockPath}.residualIds`, "residualId is duplicated across solve blocks");
      }
      residualIdsAcrossBlocks.add(residualId);
    });
    const logicalIndices = integerArrayV1(
      block.stateLogicalIndices,
      `${blockPath}.stateLogicalIndices`,
    );
    const start = nonnegativeIntegerV1(block.start, `${blockPath}.start`);
    const length = positiveIntegerV1(block.length, `${blockPath}.length`);
    const end = positiveIntegerV1(block.endExclusive, `${blockPath}.endExclusive`);
    if (
      start !== nextStart
      || end !== start + length
      || stateIds.length !== length
      || residualIds.length !== length
      || logicalIndices.length !== length
    ) {
      failV1(blockPath, "solve block dimensions are inconsistent");
    }
    stateIds.forEach((stateId, index) => {
      const logicalIndex = logicalIndices[index]!;
      continuousLogicalIndexV1(logicalIndex, slots, `${blockPath}.stateLogicalIndices[${index}]`);
      if (stateIdByLogicalIndex[logicalIndex] !== stateId) {
        failV1(`${blockPath}.stateLogicalIndices[${index}]`, "state identity mismatch");
      }
      if (componentByLogicalIndex[logicalIndex] !== componentId) {
        failV1(`${blockPath}.stateLogicalIndices[${index}]`, "component ownership mismatch");
      }
    });
    compiledUnknowns.push(...stateIds);
    if (block.disposition === "retained") compiledActive.push(...stateIds);
    nextStart = end;
  });
  if (!sameStringsV1(unknownStateIds, compiledUnknowns)
    || !sameStringsV1(activeUnknownStateIds, compiledActive)) {
    failV1(path, "solve block state projections are inconsistent");
  }
  dependentStateIds.forEach((stateId, index) => {
    const logicalIndex = stateIdByLogicalIndex.indexOf(stateId);
    if (logicalIndex < 0 || unknownStateIds.includes(stateId)) {
      failV1(`${path}.dependentStateIds[${index}]`, "dependent state is invalid");
    }
    continuousLogicalIndexV1(logicalIndex, slots, `${path}.dependentStateIds[${index}]`);
  });
  const total = nonnegativeIntegerV1(group.totalUnknownCount, `${path}.totalUnknownCount`);
  const active = positiveIntegerV1(group.activeUnknownCount, `${path}.activeUnknownCount`);
  if (total !== unknownStateIds.length || active !== activeUnknownStateIds.length) {
    failV1(path, "unknown counts are inconsistent");
  }
  if (
    nonnegativeIntegerV1(group.jacobianElementCount, `${path}.jacobianElementCount`)
      !== active * active
  ) {
    failV1(`${path}.jacobianElementCount`, "must equal activeUnknownCount squared");
  }
  const workspace = recordV1(group.workspace, `${path}.workspace`);
  exactKeysV1(workspace, [
    "f64Count",
    "f64Segments",
    "int32Count",
    "int32Segments",
  ], `${path}.workspace`);
  const f64Count = nonnegativeIntegerV1(
    workspace.f64Count,
    `${path}.workspace.f64Count`,
  );
  const int32Count = nonnegativeIntegerV1(
    workspace.int32Count,
    `${path}.workspace.int32Count`,
  );
  validateWorkspaceSegmentsV1(
    workspace.f64Segments,
    NEWTON_F64_WORKSPACE_ROLES_V1,
    [
      active,
      active,
      active * active,
      active * active,
      active,
      active,
      active,
      active,
      active,
      active,
      active,
    ],
    f64Count,
    `${path}.workspace.f64Segments`,
  );
  validateWorkspaceSegmentsV1(
    workspace.int32Segments,
    NEWTON_INT32_WORKSPACE_ROLES_V1,
    [active],
    int32Count,
    `${path}.workspace.int32Segments`,
  );
  const solver = recordV1(group.solver, `${path}.solver`);
  exactKeysV1(solver, [
    "globalization",
    "jacobian",
    "linearSolver",
    "matrixStorage",
    "nonlinearMethod",
  ], `${path}.solver`);
  if (
    solver.nonlinearMethod !== "newton"
    || solver.globalization !== "armijo-line-search"
    || solver.jacobian !== "component-analytic-with-finite-difference-audit"
    || solver.linearSolver !== "dense-lu"
    || solver.matrixStorage !== "row-major-f64"
  ) {
    failV1(`${path}.solver`, "unsupported solver policy");
  }
}

function validateWorkspaceSegmentsV1<TRole extends string>(
  raw: unknown,
  expectedRoles: readonly TRole[],
  expectedLengths: readonly number[],
  declaredCount: number,
  path: string,
): void {
  const segments = arrayV1(raw, path);
  if (
    segments.length !== expectedRoles.length
    || expectedLengths.length !== expectedRoles.length
  ) {
    failV1(path, "segment role count does not match solver policy");
  }
  let expectedOffset = 0;
  segments.forEach((rawSegment, index) => {
    const segmentPath = `${path}[${index}]`;
    const segment = recordV1(rawSegment, segmentPath);
    exactKeysV1(segment, ["length", "offset", "role"], segmentPath);
    if (segment.role !== expectedRoles[index]) {
      failV1(`${segmentPath}.role`, "workspace role order is invalid");
    }
    const offset = nonnegativeIntegerV1(
      segment.offset,
      `${segmentPath}.offset`,
    );
    const length = positiveIntegerV1(
      segment.length,
      `${segmentPath}.length`,
    );
    if (offset !== expectedOffset || length !== expectedLengths[index]) {
      failV1(segmentPath, "workspace segment is not canonical");
    }
    expectedOffset += length;
  });
  if (expectedOffset !== declaredCount) {
    failV1(path, "workspace segments do not cover the declared storage");
  }
}

export function validateAndOwnExecutionPlanKernelCatalogV1(
  value: unknown,
): ExecutionPlanKernelBindingCatalogV1 {
  if (
    (typeof value === "object" || typeof value === "function")
    && value !== null
    && OWNED_EXECUTION_PLAN_KERNEL_CATALOGS_V1.has(value)
  ) {
    return value as ExecutionPlanKernelBindingCatalogV1;
  }
  const owned = ownDataV1(value, "$.bindingCatalog");
  const record = recordV1(owned, "$.bindingCatalog");
  exactKeysV1(record, [
    "componentKernelIds",
    "hydraulicPathKernelIds",
    "solveSystemKernelIds",
  ], "$.bindingCatalog");
  const componentKernelIds = portableIdArrayV1(
    record.componentKernelIds,
    "$.bindingCatalog.componentKernelIds",
  );
  const hydraulicPathKernelIds = portableIdArrayV1(
    record.hydraulicPathKernelIds,
    "$.bindingCatalog.hydraulicPathKernelIds",
  );
  const solveSystemKernelIds = portableIdArrayV1(
    record.solveSystemKernelIds,
    "$.bindingCatalog.solveSystemKernelIds",
  );
  uniqueV1(componentKernelIds, "$.bindingCatalog.componentKernelIds");
  uniqueV1(hydraulicPathKernelIds, "$.bindingCatalog.hydraulicPathKernelIds");
  uniqueV1(solveSystemKernelIds, "$.bindingCatalog.solveSystemKernelIds");
  const catalog = Object.freeze({
    componentKernelIds: Object.freeze(componentKernelIds),
    hydraulicPathKernelIds: Object.freeze(hydraulicPathKernelIds),
    solveSystemKernelIds: Object.freeze(solveSystemKernelIds),
  });
  OWNED_EXECUTION_PLAN_KERNEL_CATALOGS_V1.add(catalog);
  return catalog;
}

function assertExactBindingSetV1(
  required: readonly string[],
  provided: readonly string[],
  label: string,
): void {
  const requiredSet = new Set(required);
  const providedSet = new Set(provided);
  if (
    requiredSet.size !== providedSet.size
    || [...requiredSet].some((id) => !providedSet.has(id))
  ) {
    throw new Error(`Execution plan ${label} bindings must match exactly`);
  }
}

function assertExecutionPlanCatalogMatchesDescriptorV1(
  descriptor: ExecutionPlanDescriptorV1,
  catalog: ExecutionPlanKernelBindingCatalogV1,
): void {
  assertExactBindingSetV1(
    descriptor.stateLayout.blocks.map(({ kernelId }) => kernelId),
    catalog.componentKernelIds,
    "component kernel",
  );
  assertExactBindingSetV1(
    descriptor.hydraulicGraph.pathKernelIds,
    catalog.hydraulicPathKernelIds,
    "hydraulic path kernel",
  );
  assertExactBindingSetV1(
    descriptor.solveGroups.map(({ systemKernelId }) => systemKernelId),
    catalog.solveSystemKernelIds,
    "solve system kernel",
  );
}

function ownDataV1(
  value: unknown,
  path: string,
  ancestors: Set<object> = new Set<object>(),
  depth = 0,
): unknown {
  if (depth > MAXIMUM_EXECUTION_PLAN_DATA_DEPTH_V1) {
    failV1(path, "portable data nesting limit exceeded");
  }
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value) || Object.is(value, -0)) {
      failV1(path, "numbers must be finite and must not be negative zero");
    }
    return value;
  }
  if (Array.isArray(value)) {
    if (ancestors.has(value)) failV1(path, "must not be cyclic");
    if (Object.getPrototypeOf(value) !== Array.prototype) {
      failV1(path, "must be a plain array");
    }
    ancestors.add(value);
    try {
      const result: unknown[] = [];
      for (let index = 0; index < value.length; index += 1) {
        const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
        if (descriptor === undefined || !("value" in descriptor) || !descriptor.enumerable) {
          failV1(`${path}[${index}]`, "must be an enumerable data property");
        }
        result.push(ownDataV1(
          descriptor.value,
          `${path}[${index}]`,
          ancestors,
          depth + 1,
        ));
      }
      const allowed = new Set(["length", ...result.map((_, index) => String(index))]);
      if (Reflect.ownKeys(value).some((key) => typeof key !== "string" || !allowed.has(key))) {
        failV1(path, "must not contain custom array fields");
      }
      return Object.freeze(result);
    } finally {
      ancestors.delete(value);
    }
  }
  if (value === null || typeof value !== "object") {
    failV1(path, "contains a nonportable value");
  }
  if (Object.getPrototypeOf(value) !== Object.prototype
    && Object.getPrototypeOf(value) !== null) {
    failV1(path, "must be a plain data object");
  }
  if (ancestors.has(value)) failV1(path, "must not be cyclic");
  ancestors.add(value);
  try {
    const result: Record<string, unknown> = Object.create(null);
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key !== "string") failV1(path, "must not contain symbol fields");
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (descriptor === undefined || !("value" in descriptor) || !descriptor.enumerable) {
        failV1(`${path}.${key}`, "must be an enumerable data property");
      }
      result[key] = ownDataV1(
        descriptor.value,
        `${path}.${key}`,
        ancestors,
        depth + 1,
      );
    }
    return Object.freeze(result);
  } finally {
    ancestors.delete(value);
  }
}

function recordV1(value: unknown, path: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    failV1(path, "must be an object");
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    failV1(path, "must be a plain data object");
  }
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== "string") failV1(path, "must not contain symbol fields");
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (
      descriptor === undefined
      || !descriptor.enumerable
      || !("value" in descriptor)
    ) {
      failV1(`${path}.${key}`, "must be an enumerable data property");
    }
  }
  return value as Record<string, unknown>;
}

function arrayV1(value: unknown, path: string): readonly unknown[] {
  if (!Array.isArray(value)) failV1(path, "must be an array");
  if (Object.getPrototypeOf(value) !== Array.prototype) {
    failV1(path, "must be a plain array");
  }
  const allowed = new Set(["length"]);
  for (let index = 0; index < value.length; index += 1) {
    const key = String(index);
    allowed.add(key);
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (
      descriptor === undefined
      || !descriptor.enumerable
      || !("value" in descriptor)
    ) {
      failV1(`${path}[${index}]`, "must be an enumerable data property");
    }
  }
  if (
    Reflect.ownKeys(value).some((key) =>
      typeof key !== "string" || !allowed.has(key))
  ) {
    failV1(path, "must not contain custom array fields");
  }
  return value;
}

function exactKeysV1(
  value: Record<string, unknown>,
  expected: readonly string[],
  path: string,
): void {
  const actual = Object.keys(value).sort();
  const keys = [...expected].sort();
  if (actual.length !== keys.length
    || actual.some((key, index) => key !== keys[index])) {
    failV1(path, `fields must be exactly ${keys.join(", ")}`);
  }
}

function portableIdV1(value: unknown, path: string): string {
  if (typeof value !== "string" || !PORTABLE_ID.test(value)) {
    failV1(path, "must be a portable identifier");
  }
  return value;
}

function authorityPointerV1(value: unknown, path: string): string {
  if (
    typeof value !== "string"
    || value.length < 2
    || value.length > 1_024
    || value[0] !== "/"
    || /[\u0000-\u001f\u007f]/u.test(value)
  ) {
    failV1(path, "must be a bounded absolute JSON pointer");
  }
  for (let index = 0; index < value.length; index += 1) {
    if (value[index] !== "~") continue;
    const escape = value[index + 1];
    if (escape !== "0" && escape !== "1") {
      failV1(path, "contains an invalid JSON-pointer escape");
    }
    index += 1;
  }
  return value;
}

function portableIdArrayV1(value: unknown, path: string): string[] {
  return arrayV1(value, path).map((item, index) =>
    portableIdV1(item, `${path}[${index}]`));
}

function integerArrayV1(value: unknown, path: string): number[] {
  return arrayV1(value, path).map((item, index) =>
    integerV1(item, `${path}[${index}]`));
}

function integerV1(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value)) {
    failV1(path, "must be a safe integer");
  }
  return value;
}

function nonnegativeIntegerV1(value: unknown, path: string): number {
  const number = integerV1(value, path);
  if (number < 0) failV1(path, "must be nonnegative");
  return number;
}

function positiveIntegerV1(value: unknown, path: string): number {
  const number = integerV1(value, path);
  if (number <= 0) failV1(path, "must be positive");
  return number;
}

function positiveFiniteV1(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    failV1(path, "must be positive and finite");
  }
  return value;
}

function sameCompiledClockValueV1(left: number, right: number): boolean {
  const tolerance = Number.EPSILON
    * Math.max(1, Math.abs(left), Math.abs(right)) * 8;
  return Math.abs(left - right) <= tolerance;
}

function nonemptyStringV1(value: unknown, path: string): string {
  if (typeof value !== "string" || value.length === 0) {
    failV1(path, "must be a nonempty string");
  }
  return value;
}

function uniqueV1(values: readonly string[], path: string): void {
  if (new Set(values).size !== values.length) failV1(path, "must be unique");
}

function continuousLogicalIndexV1(
  logicalIndex: number,
  slots: readonly unknown[],
  path: string,
): void {
  if (logicalIndex < 0 || logicalIndex >= slots.length) {
    failV1(path, "is outside the state layout");
  }
  const slot = recordV1(slots[logicalIndex], path);
  if (slot.storageKind !== "continuous-f64") {
    failV1(path, "must reference continuous state");
  }
}

function f64ViewV1(value: unknown, length: number, path: string): Float64Array {
  if (!(value instanceof Float64Array) || value.length !== length
    || !fixedOwnedArrayBufferV1(value.buffer)
    || value.byteOffset !== 0 || value.byteLength !== value.buffer.byteLength) {
    failV1(path, "must be one owned Float64Array of the expected length");
  }
  return value;
}

function int32ViewV1(value: unknown, length: number, path: string): Int32Array {
  if (!(value instanceof Int32Array) || value.length !== length
    || !fixedOwnedArrayBufferV1(value.buffer)
    || value.byteOffset !== 0 || value.byteLength !== value.buffer.byteLength) {
    failV1(path, "must be one owned Int32Array of the expected length");
  }
  return value;
}

function fixedOwnedArrayBufferV1(buffer: ArrayBufferLike): buffer is ArrayBuffer {
  return buffer instanceof ArrayBuffer
    && !(
      "resizable" in buffer
      && (buffer as ArrayBuffer & { readonly resizable: boolean }).resizable
    );
}

function assertInt32ValuesV1(
  value: unknown,
  expected: readonly number[],
  path: string,
): Int32Array {
  const view = int32ViewV1(value, expected.length, path);
  for (let index = 0; index < expected.length; index += 1) {
    if (view[index] !== expected[index]) failV1(path, "values do not match descriptor");
  }
  return view;
}

function sameStringsV1(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length
    && left.every((value, index) => value === right[index]);
}

function failV1(path: string, message: string): never {
  throw new Error(`Execution plan rejected ${path}: ${message}`);
}

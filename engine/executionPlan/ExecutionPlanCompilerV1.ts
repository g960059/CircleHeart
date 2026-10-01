import {
  MODEL_DEFINITION_V1_SCHEMA_ID,
  NUMERICAL_POLICY_V1_SCHEMA_ID,
  type ModelComponentDefinitionV1,
  type ModelDefinitionV1,
  type ModelStateDefinitionV1,
  type NumericalPolicyV1,
  type NumericalSolveGroupV1,
} from "./ModelDefinitionV1";
import {
  EXECUTION_PLAN_DESCRIPTOR_V1_SCHEMA_ID,
  type ExecutionPlanDescriptorV1,
  type ExecutionPlanNewtonF64WorkspaceRoleV1,
  type ExecutionPlanNewtonInt32WorkspaceRoleV1,
  type ExecutionPlanSolveBlockV1,
  type ExecutionPlanSolveGroupV1,
  type ExecutionPlanStateBlockV1,
  type ExecutionPlanStateSlotV1,
  type ExecutionPlanUpdateScheduleV1,
} from "@/runtime/executionPlan/ExecutionPlanDescriptorV1";

export {
  EXECUTION_PLAN_DESCRIPTOR_V1_SCHEMA_ID,
} from "@/runtime/executionPlan/ExecutionPlanDescriptorV1";
export type {
  ExecutionPlanDescriptorV1,
  ExecutionPlanSolveBlockV1,
  ExecutionPlanSolveGroupV1,
  ExecutionPlanStateBlockV1,
  ExecutionPlanStateSlotV1,
} from "@/runtime/executionPlan/ExecutionPlanDescriptorV1";

const PORTABLE_ID = /^[A-Za-z0-9][A-Za-z0-9._/-]*$/;

/**
 * Pure build-time compiler. The result contains only plain immutable data and
 * can be bundled beside an exact model executable. No function, URL, digest,
 * or environment-dependent value is admitted to the descriptor.
 */
export function compileExecutionPlanV1(
  definition: ModelDefinitionV1,
  policy: NumericalPolicyV1,
): ExecutionPlanDescriptorV1 {
  assertExactDataRecordV1(definition, [
    "components",
    "definitionId",
    "hydraulicTopology",
    "schemaId",
  ], "ModelDefinition");
  assertExactDataRecordV1(definition.hydraulicTopology, [
    "conservationPools",
    "nodes",
    "paths",
  ], "ModelDefinition hydraulicTopology");
  assertExactDataRecordV1(policy, [
    "policyId",
    "schemaId",
    "solveGroups",
    "timebase",
    "updateGroups",
  ], "NumericalPolicy");
  if (definition.schemaId !== MODEL_DEFINITION_V1_SCHEMA_ID) {
    throw new Error("ModelDefinition V1 schemaId is invalid");
  }
  if (policy.schemaId !== NUMERICAL_POLICY_V1_SCHEMA_ID) {
    throw new Error("NumericalPolicy V1 schemaId is invalid");
  }
  assertPortableId(definition.definitionId, "definitionId");
  assertPortableId(policy.policyId, "policyId");

  const components = canonicalOrdinalSequence(
    definition.components,
    "component",
  );
  for (const component of components) {
    assertExactDataRecordV1(component, [
      "componentId",
      "kernelId",
      "ordinal",
      "states",
    ], "model component");
  }
  uniqueIds(
    components.map(({ componentId }) => componentId),
    "component",
  );
  const stateLayout = compileStateLayout(components);
  const stateById = new Map(
    stateLayout.slots.map((slot) => [slot.stateId, slot] as const),
  );
  const hydraulicGraph = compileHydraulicGraph(
    definition,
    new Map(components.map((component, index) =>
      [component.componentId, index] as const)),
    stateById,
  );
  const componentKernelById = new Map(
    stateLayout.blocks.map(({ componentId, kernelId }) =>
      [componentId, kernelId] as const),
  );
  const solveGroups = compileSolveGroups(
    policy,
    stateById,
    componentKernelById,
  );
  const updateSchedule = compileUpdateScheduleV1(policy, solveGroups);

  return Object.freeze({
    schemaId: EXECUTION_PLAN_DESCRIPTOR_V1_SCHEMA_ID,
    definitionId: definition.definitionId,
    policyId: policy.policyId,
    stateLayout,
    hydraulicGraph,
    solveGroups: Object.freeze(solveGroups),
    updateSchedule,
  });
}

function compileUpdateScheduleV1(
  policy: NumericalPolicyV1,
  solveGroups: readonly ExecutionPlanSolveGroupV1[],
): ExecutionPlanUpdateScheduleV1 {
  assertExactDataRecordV1(policy.timebase, [
    "baseTickSec",
    "presentationPeriodTicks",
  ], "numerical timebase");
  const baseTickSec = positiveFiniteNumberV1(
    policy.timebase.baseTickSec,
    "numerical timebase baseTickSec",
  );
  const presentationPeriodTicks = positiveSafeIntegerV1(
    policy.timebase.presentationPeriodTicks,
    "numerical timebase presentationPeriodTicks",
  );
  const solveGroupIndexById = new Map(solveGroups.map((group, index) =>
    [group.solveGroupId, index] as const));
  const groups = canonicalOrdinalSequence(
    policy.updateGroups,
    "update group",
  ).map((group) => {
    assertExactDataRecordV1(group, [
      "integration",
      "ordinal",
      "periodTicks",
      "phaseTicks",
      "solveGroupId",
      "updateGroupId",
    ], "update group");
    assertPortableId(group.updateGroupId, "updateGroupId");
    if (group.integration !== "fixed-step-backward-euler"
      && group.integration !== "fixed-step-conservative-partitioned") {
      throw new Error(
        `update group ${group.updateGroupId} has an unsupported integration`,
      );
    }
    const periodTicks = positiveSafeIntegerV1(
      group.periodTicks,
      `update group ${group.updateGroupId} periodTicks`,
    );
    const phaseTicks = nonnegativeSafeIntegerV1(
      group.phaseTicks,
      `update group ${group.updateGroupId} phaseTicks`,
    );
    if (phaseTicks >= periodTicks) {
      throw new RangeError(
        `update group ${group.updateGroupId} phaseTicks must be below periodTicks`,
      );
    }
    const solveGroupIndex = solveGroupIndexById.get(group.solveGroupId);
    if (solveGroupIndex === undefined) {
      throw new Error(
        `update group ${group.updateGroupId} references unknown solve group `
          + group.solveGroupId,
      );
    }
    const effectiveStepSec = baseTickSec * periodTicks;
    if (!Number.isFinite(effectiveStepSec) || effectiveStepSec <= 0) {
      throw new RangeError(
        `update group ${group.updateGroupId} effective step is invalid`,
      );
    }
    return Object.freeze({
      updateGroupId: group.updateGroupId,
      ordinal: group.ordinal,
      periodTicks,
      phaseTicks,
      effectiveStepSec,
      integration: group.integration,
      solveGroupId: group.solveGroupId,
      solveGroupIndex,
    });
  });
  uniqueIds(groups.map(({ updateGroupId }) => updateGroupId),
    "update group");
  if (groups.length === 0) {
    throw new Error("NumericalPolicy must contain at least one update group");
  }
  const presentationStepSec = baseTickSec * presentationPeriodTicks;
  if (!Number.isFinite(presentationStepSec) || presentationStepSec <= 0) {
    throw new RangeError("numerical presentation step is invalid");
  }
  return Object.freeze({
    baseTickSec,
    presentationPeriodTicks,
    presentationStepSec,
    groups: Object.freeze(groups),
  });
}

function compileStateLayout(
  components: readonly ModelComponentDefinitionV1[],
): ExecutionPlanDescriptorV1["stateLayout"] {
  const blocks: ExecutionPlanStateBlockV1[] = [];
  const slots: ExecutionPlanStateSlotV1[] = [];
  const stateIds = new Set<string>();
  const authorityPointers = new Set<string>();
  let logicalIndex = 0;
  let continuousIndex = 0;
  let booleanIndex = 0;

  for (const component of components) {
    assertExactDataRecordV1(component, [
      "componentId",
      "kernelId",
      "ordinal",
      "states",
    ], "model component");
    assertPortableId(component.componentId, "componentId");
    assertPortableId(component.kernelId, "kernelId");
    const states = canonicalOrdinalSequence(component.states,
      `state in ${component.componentId}`);
    const logicalStart = logicalIndex;
    for (const state of states) {
      assertStateDefinition(state, component.componentId);
      if (stateIds.has(state.stateId)) {
        throw new Error(`duplicate model state ${state.stateId}`);
      }
      if (authorityPointers.has(state.authorityPointer)) {
        throw new Error(
          `duplicate model-state authority pointer ${state.authorityPointer}`,
        );
      }
      stateIds.add(state.stateId);
      authorityPointers.add(state.authorityPointer);
      const storageIndex = state.storageKind === "continuous-f64"
        ? continuousIndex++
        : booleanIndex++;
      slots.push(Object.freeze({
        stateId: state.stateId,
        componentId: component.componentId,
        authorityPointer: state.authorityPointer,
        logicalIndex,
        storageKind: state.storageKind,
        storageIndex,
        unit: state.unit,
      }));
      logicalIndex += 1;
    }
    blocks.push(Object.freeze({
      componentId: component.componentId,
      kernelId: component.kernelId,
      logicalStart,
      logicalLength: states.length,
    }));
  }
  if (slots.length === 0) {
    throw new Error("ModelDefinition must contain at least one state");
  }
  return Object.freeze({
    logicalSlotCount: logicalIndex,
    continuousSlotCount: continuousIndex,
    booleanSlotCount: booleanIndex,
    blocks: Object.freeze(blocks),
    slots: Object.freeze(slots),
  });
}

function compileHydraulicGraph(
  definition: ModelDefinitionV1,
  componentBlockIndexById: ReadonlyMap<string, number>,
  stateById: ReadonlyMap<string, ExecutionPlanStateSlotV1>,
): ExecutionPlanDescriptorV1["hydraulicGraph"] {
  const nodes = canonicalOrdinalSequence(
    definition.hydraulicTopology.nodes,
    "hydraulic node",
  );
  for (const node of nodes) {
    assertExactDataRecordV1(node, [
      "componentId",
      "nodeId",
      "ordinal",
      "storageStateId",
    ], "hydraulic node");
  }
  uniqueIds(nodes.map(({ nodeId }) => nodeId), "hydraulic node");
  const nodeIndexById = new Map(
    nodes.map((node, index) => [node.nodeId, index] as const),
  );
  const nodeComponentBlockIndices: number[] = [];
  const storageStateLogicalIndices = nodes.map((node) => {
    assertExactDataRecordV1(node, [
      "componentId",
      "nodeId",
      "ordinal",
      "storageStateId",
    ], "hydraulic node");
    assertPortableId(node.nodeId, "hydraulic nodeId");
    const componentBlockIndex = requiredComponentBlockIndexV1(
      componentBlockIndexById,
      node.componentId,
      node.nodeId,
    );
    const state = requiredContinuousState(stateById, node.storageStateId,
      `hydraulic node ${node.nodeId}`);
    if (state.componentId !== node.componentId) {
      throw new Error(
        `hydraulic node ${node.nodeId} storage state is owned by `
          + `${state.componentId}, not ${node.componentId}`,
      );
    }
    nodeComponentBlockIndices.push(componentBlockIndex);
    return state.logicalIndex;
  });

  const paths = canonicalOrdinalSequence(
    definition.hydraulicTopology.paths,
    "hydraulic path",
  );
  for (const path of paths) {
    assertExactDataRecordV1(path, [
      "componentId",
      "downstreamNodeId",
      "kernelId",
      "ordinal",
      "pathId",
      "upstreamNodeId",
    ], "hydraulic path");
  }
  uniqueIds(paths.map(({ pathId }) => pathId), "hydraulic path");
  const upstreamNodeIndices: number[] = [];
  const downstreamNodeIndices: number[] = [];
  const pathComponentBlockIndices: number[] = [];
  for (const path of paths) {
    assertExactDataRecordV1(path, [
      "componentId",
      "downstreamNodeId",
      "kernelId",
      "ordinal",
      "pathId",
      "upstreamNodeId",
    ], "hydraulic path");
    assertPortableId(path.pathId, "hydraulic pathId");
    assertPortableId(path.kernelId, "hydraulic path kernelId");
    pathComponentBlockIndices.push(requiredComponentBlockIndexV1(
      componentBlockIndexById,
      path.componentId,
      path.pathId,
    ));
    const upstream = nodeIndexById.get(path.upstreamNodeId);
    const downstream = nodeIndexById.get(path.downstreamNodeId);
    if (upstream === undefined || downstream === undefined) {
      throw new Error(
        `hydraulic path ${path.pathId} references an unknown endpoint`,
      );
    }
    if (upstream === downstream) {
      throw new Error(`hydraulic path ${path.pathId} is a self-loop`);
    }
    upstreamNodeIndices.push(upstream);
    downstreamNodeIndices.push(downstream);
  }

  const conservationPools = canonicalOrdinalSequence(
    definition.hydraulicTopology.conservationPools,
    "conservation pool",
  ).map((pool) => {
    assertExactDataRecordV1(pool, [
      "dependentStateId",
      "ledgerStateId",
      "memberStateIds",
      "ordinal",
      "poolId",
    ], "conservation pool");
    assertPortableId(pool.poolId, "conservation poolId");
    const memberIds = uniqueIds(stringArrayDataValuesV1(
      pool.memberStateIds,
      `conservation pool ${pool.poolId} member`,
    ),
      `conservation pool ${pool.poolId} member`);
    if (memberIds.length < 2) {
      throw new Error(
        `conservation pool ${pool.poolId} must contain at least two states`,
      );
    }
    if (!memberIds.includes(pool.dependentStateId)) {
      throw new Error(
        `conservation pool ${pool.poolId} omits its dependent state`,
      );
    }
    return Object.freeze({
      poolId: pool.poolId,
      ledgerStateLogicalIndex: requiredContinuousState(
        stateById,
        pool.ledgerStateId,
        `conservation pool ${pool.poolId}`,
      ).logicalIndex,
      memberStateLogicalIndices: Object.freeze(memberIds.map((stateId) =>
        requiredContinuousState(
          stateById,
          stateId,
          `conservation pool ${pool.poolId}`,
        ).logicalIndex)),
      dependentStateLogicalIndex: requiredContinuousState(
        stateById,
        pool.dependentStateId,
        `conservation pool ${pool.poolId}`,
      ).logicalIndex,
    });
  });
  uniqueIds(conservationPools.map(({ poolId }) => poolId),
    "conservation pool");

  return Object.freeze({
    nodeIds: Object.freeze(nodes.map(({ nodeId }) => nodeId)),
    nodeComponentBlockIndices: Object.freeze(nodeComponentBlockIndices),
    storageStateLogicalIndices: Object.freeze(storageStateLogicalIndices),
    pathIds: Object.freeze(paths.map(({ pathId }) => pathId)),
    pathComponentBlockIndices: Object.freeze(pathComponentBlockIndices),
    upstreamNodeIndices: Object.freeze(upstreamNodeIndices),
    downstreamNodeIndices: Object.freeze(downstreamNodeIndices),
    pathKernelIds: Object.freeze(paths.map(({ kernelId }) => kernelId)),
    conservationPools: Object.freeze(conservationPools),
  });
}

function requiredComponentBlockIndexV1(
  componentBlockIndexById: ReadonlyMap<string, number>,
  componentId: string,
  ownerId: string,
): number {
  const index = componentBlockIndexById.get(componentId);
  if (index === undefined) {
    throw new Error(`${ownerId} references unknown component ${componentId}`);
  }
  return index;
}

function compileSolveGroups(
  policy: NumericalPolicyV1,
  stateById: ReadonlyMap<string, ExecutionPlanStateSlotV1>,
  componentKernelById: ReadonlyMap<string, string>,
): ExecutionPlanSolveGroupV1[] {
  const groups = canonicalOrdinalSequence(policy.solveGroups, "solve group");
  for (const group of groups) {
    assertExactDataRecordV1(group, [
      "dependentStateIds",
      "ordinal",
      "solveGroupId",
      "solver",
      "systemKernelId",
      "unknownBlocks",
    ], "solve group");
  }
  uniqueIds(groups.map(({ solveGroupId }) => solveGroupId), "solve group");
  return groups.map((group) => {
    assertExactDataRecordV1(group, [
      "dependentStateIds",
      "ordinal",
      "solveGroupId",
      "solver",
      "systemKernelId",
      "unknownBlocks",
    ], "solve group");
    assertExactDataRecordV1(group.solver, [
      "globalization",
      "jacobian",
      "linearSolver",
      "matrixStorage",
      "nonlinearMethod",
    ], `solve group ${group.solveGroupId} solver`);
    assertPortableId(group.solveGroupId, "solveGroupId");
    assertPortableId(group.systemKernelId, "systemKernelId");
    assertSupportedSolverV1(group);
    const blocks = canonicalOrdinalSequence(
      group.unknownBlocks,
      `solve block in ${group.solveGroupId}`,
    );
    for (const block of blocks) {
      assertExactDataRecordV1(block, [
        "blockId",
        "disposition",
        "ordinal",
        "residualIds",
        "stateIds",
      ], "solve block");
    }
    uniqueIds(blocks.map(({ blockId }) => blockId), "solve block");
    const unknownStateIds: string[] = [];
    const activeUnknownStateIds: string[] = [];
    const compiledBlocks: ExecutionPlanSolveBlockV1[] = [];
    let start = 0;
    for (const block of blocks) {
      assertExactDataRecordV1(block, [
        "blockId",
        "disposition",
        "ordinal",
        "residualIds",
        "stateIds",
      ], "solve block");
      assertPortableId(block.blockId, "solve blockId");
      if (block.disposition !== "retained"
        && block.disposition !== "statically-condensed") {
        throw new Error(
          `solve block ${block.blockId} has an unsupported disposition`,
        );
      }
      const blockStateIds = stringArrayDataValuesV1(
        block.stateIds,
        `solve block ${block.blockId} state`,
      );
      const blockResidualIds = stringArrayDataValuesV1(
        block.residualIds,
        `solve block ${block.blockId} residual`,
      );
      if (blockStateIds.length === 0) {
        throw new Error(`solve block ${block.blockId} is empty`);
      }
      if (blockStateIds.length !== blockResidualIds.length) {
        throw new Error(`solve block ${block.blockId} is not square`);
      }
      const stateIds = uniqueIds(blockStateIds,
        `solve block ${block.blockId} state`);
      const residualIds = uniqueIds(blockResidualIds,
        `solve block ${block.blockId} residual`);
      residualIds.forEach((id) => assertPortableId(id, "residualId"));
      const blockStates = stateIds.map((stateId) =>
        requiredContinuousState(
          stateById,
          stateId,
          `solve block ${block.blockId}`,
        ));
      const componentIds = new Set(
        blockStates.map(({ componentId }) => componentId),
      );
      if (componentIds.size !== 1) {
        throw new Error(
          `solve block ${block.blockId} spans multiple component owners`,
        );
      }
      const componentId = [...componentIds][0]!;
      const kernelId = componentKernelById.get(componentId);
      if (kernelId === undefined) {
        throw new Error(
          `solve block ${block.blockId} has no component kernel`,
        );
      }
      const stateLogicalIndices = blockStates.map(({ logicalIndex }) =>
        logicalIndex);
      for (const stateId of stateIds) {
        if (unknownStateIds.includes(stateId)) {
          throw new Error(
            `solve group ${group.solveGroupId} repeats state ${stateId}`,
          );
        }
        unknownStateIds.push(stateId);
        if (block.disposition === "retained") {
          activeUnknownStateIds.push(stateId);
        }
      }
      compiledBlocks.push(Object.freeze({
        blockId: block.blockId,
        componentId,
        kernelId,
        disposition: block.disposition,
        start,
        length: stateIds.length,
        endExclusive: start + stateIds.length,
        stateIds: Object.freeze(stateIds),
        stateLogicalIndices: Object.freeze(stateLogicalIndices),
        residualIds: Object.freeze(residualIds),
      }));
      start += stateIds.length;
    }
    const dependentStateIds = uniqueIds(stringArrayDataValuesV1(
      group.dependentStateIds,
      `solve group ${group.solveGroupId} dependent state`,
    ),
      `solve group ${group.solveGroupId} dependent state`);
    for (const stateId of dependentStateIds) {
      requiredContinuousState(stateById, stateId,
        `solve group ${group.solveGroupId}`);
      if (unknownStateIds.includes(stateId)) {
        throw new Error(
          `solve group ${group.solveGroupId} treats ${stateId} as both `
            + "dependent and unknown",
        );
      }
    }
    const activeUnknownCount = activeUnknownStateIds.length;
    const f64Segments = compileContiguousWorkspaceSegmentsV1([
      ["current-unknowns", activeUnknownCount],
      ["residual", activeUnknownCount],
      ["jacobian", activeUnknownCount * activeUnknownCount],
      ["factors", activeUnknownCount * activeUnknownCount],
      ["right-hand-side", activeUnknownCount],
      ["transformed-right-hand-side", activeUnknownCount],
      ["update", activeUnknownCount],
      ["trial-unknowns", activeUnknownCount],
      ["trial-residual", activeUnknownCount],
      ["unknown-scale", activeUnknownCount],
      ["residual-scale", activeUnknownCount],
    ] as const satisfies readonly (readonly [
      ExecutionPlanNewtonF64WorkspaceRoleV1,
      number,
    ])[]);
    const int32Segments = compileContiguousWorkspaceSegmentsV1([
      ["pivots", activeUnknownCount],
    ] as const satisfies readonly (readonly [
      ExecutionPlanNewtonInt32WorkspaceRoleV1,
      number,
    ])[]);
    return Object.freeze({
      solveGroupId: group.solveGroupId,
      systemKernelId: group.systemKernelId,
      unknownStateIds: Object.freeze(unknownStateIds),
      activeUnknownStateIds: Object.freeze(activeUnknownStateIds),
      dependentStateIds: Object.freeze(dependentStateIds),
      blocks: Object.freeze(compiledBlocks),
      totalUnknownCount: unknownStateIds.length,
      activeUnknownCount,
      jacobianElementCount:
        activeUnknownCount * activeUnknownCount,
      workspace: Object.freeze({
        f64Count: segmentEndV1(f64Segments),
        int32Count: segmentEndV1(int32Segments),
        f64Segments,
        int32Segments,
      }),
      solver: Object.freeze({ ...group.solver }),
    });
  });
}

function compileContiguousWorkspaceSegmentsV1<TRole extends string>(
  definitions: readonly (readonly [TRole, number])[],
): readonly Readonly<{ role: TRole; offset: number; length: number }>[] {
  let offset = 0;
  return Object.freeze(definitions.map(([role, length]) => {
    if (!Number.isSafeInteger(length) || length <= 0) {
      throw new RangeError(`workspace segment ${role} must be nonempty`);
    }
    const segment = Object.freeze({ role, offset, length });
    offset += length;
    return segment;
  }));
}

function segmentEndV1(
  segments: readonly Readonly<{ offset: number; length: number }>[],
): number {
  const last = segments.at(-1);
  return last === undefined ? 0 : last.offset + last.length;
}

function assertStateDefinition(
  state: ModelStateDefinitionV1,
  componentId: string,
): void {
  assertExactDataRecordV1(state, [
    "authorityPointer",
    "ordinal",
    "stateId",
    "storageKind",
    "unit",
  ], `state in ${componentId}`);
  assertPortableId(state.stateId, `stateId in ${componentId}`);
  assertAuthorityPointerV1(
    state.authorityPointer,
    `state ${state.stateId} authorityPointer`,
  );
  if (state.storageKind !== "continuous-f64"
    && state.storageKind !== "boolean-u8") {
    throw new Error(`state ${state.stateId} has an unsupported storage kind`);
  }
  if (typeof state.unit !== "string" || state.unit.length === 0) {
    throw new Error(`state ${state.stateId} must declare a unit`);
  }
}

function assertAuthorityPointerV1(value: string, label: string): void {
  if (
    typeof value !== "string"
    || value.length < 2
    || value.length > 1_024
    || value[0] !== "/"
    || /[\u0000-\u001f\u007f]/u.test(value)
  ) {
    throw new Error(`${label} must be a bounded absolute JSON pointer`);
  }
  for (let index = 0; index < value.length; index += 1) {
    if (value[index] !== "~") continue;
    const escape = value[index + 1];
    if (escape !== "0" && escape !== "1") {
      throw new Error(`${label} contains an invalid JSON-pointer escape`);
    }
    index += 1;
  }
}

function requiredContinuousState(
  stateById: ReadonlyMap<string, ExecutionPlanStateSlotV1>,
  stateId: string,
  owner: string,
): ExecutionPlanStateSlotV1 {
  const state = stateById.get(stateId);
  if (state === undefined) {
    throw new Error(`${owner} references unknown state ${stateId}`);
  }
  if (state.storageKind !== "continuous-f64") {
    throw new Error(`${owner} requires continuous state ${stateId}`);
  }
  return state;
}

function positiveFiniteNumberV1(value: number, label: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${label} must be positive and finite`);
  }
  return value;
}

function positiveSafeIntegerV1(value: number, label: string): number {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new RangeError(`${label} must be a positive safe integer`);
  }
  return value;
}

function nonnegativeSafeIntegerV1(value: number, label: string): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${label} must be a nonnegative safe integer`);
  }
  return value;
}

function assertPortableId(value: string, label: string): void {
  if (typeof value !== "string" || !PORTABLE_ID.test(value)) {
    throw new Error(`${label} must be a portable identifier`);
  }
}

function uniqueIds(ids: string[], label: string): string[] {
  for (const id of ids) assertPortableId(id, `${label} id`);
  if (new Set(ids).size !== ids.length) {
    throw new Error(`${label} identifiers must be unique`);
  }
  return ids;
}

function canonicalOrdinalSequence<T extends Readonly<{ ordinal: number }>>(
  values: readonly T[],
  label: string,
): T[] {
  const dataValues = plainArrayDataValuesV1(values, label);
  if (dataValues.length === 0) {
    throw new Error(`${label} sequence must not be empty`);
  }
  const sorted = dataValues.map((value, declarationIndex) => {
    if (
      value === null
      || typeof value !== "object"
      || Array.isArray(value)
      || (Object.getPrototypeOf(value) !== Object.prototype
        && Object.getPrototypeOf(value) !== null)
    ) {
      throw new Error(`${label}[${declarationIndex}] must be a data object`);
    }
    const descriptor = Object.getOwnPropertyDescriptor(value, "ordinal");
    if (
      descriptor === undefined
      || !("value" in descriptor)
      || !descriptor.enumerable
    ) {
      throw new Error(
        `${label}[${declarationIndex}].ordinal must be an enumerable data property`,
      );
    }
    return Object.freeze({
      value: value as T,
      ordinal: descriptor.value as unknown,
    });
  }).sort((left, right) => {
    if (typeof left.ordinal !== "number" || typeof right.ordinal !== "number") {
      return 0;
    }
    return left.ordinal - right.ordinal;
  });
  for (let index = 0; index < sorted.length; index += 1) {
    if (!Number.isSafeInteger(sorted[index]!.ordinal)
      || sorted[index]!.ordinal !== index) {
      throw new Error(`${label} ordinals must be contiguous from zero`);
    }
  }
  return sorted.map(({ value }) => value);
}

function assertSupportedSolverV1(group: NumericalSolveGroupV1): void {
  const { solver } = group;
  if (
    solver.nonlinearMethod !== "newton"
    || solver.globalization !== "armijo-line-search"
    || solver.jacobian
      !== "component-analytic-with-finite-difference-audit"
    || solver.linearSolver !== "dense-lu"
    || solver.matrixStorage !== "row-major-f64"
  ) {
    throw new Error(
      `solve group ${group.solveGroupId} has an unsupported solver policy`,
    );
  }
}

function assertExactDataRecordV1(
  value: unknown,
  keys: readonly string[],
  label: string,
): asserts value is Record<string, unknown> {
  if (
    value === null
    || typeof value !== "object"
    || Array.isArray(value)
    || (Object.getPrototypeOf(value) !== Object.prototype
      && Object.getPrototypeOf(value) !== null)
  ) {
    throw new Error(`${label} must be a plain data object`);
  }
  const expected = [...keys].sort();
  const actual = Reflect.ownKeys(value).map((key) => {
    if (typeof key !== "string") {
      throw new Error(`${label} must not contain symbol fields`);
    }
    return key;
  }).sort();
  if (
    actual.length !== expected.length
    || actual.some((key, index) => key !== expected[index])
  ) {
    throw new Error(`${label} fields must match exactly`);
  }
  for (const key of expected) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (
      descriptor === undefined
      || !("value" in descriptor)
      || !descriptor.enumerable
    ) {
      throw new Error(`${label}.${key} must be an enumerable data property`);
    }
  }
}

function plainArrayDataValuesV1(
  value: unknown,
  label: string,
): unknown[] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) {
    throw new Error(`${label} must be a plain array`);
  }
  const allowed = new Set<string>(["length"]);
  for (let index = 0; index < value.length; index += 1) {
    allowed.add(String(index));
  }
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== "string" || !allowed.has(key)) {
      throw new Error(`${label} must not contain custom array fields`);
    }
  }
  const result: unknown[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (
      descriptor === undefined
      || !("value" in descriptor)
      || !descriptor.enumerable
    ) {
      throw new Error(`${label}[${index}] must be an enumerable data property`);
    }
    result.push(descriptor.value);
  }
  return result;
}

function stringArrayDataValuesV1(
  value: unknown,
  label: string,
): string[] {
  return plainArrayDataValuesV1(value, label).map((item, index) => {
    if (typeof item !== "string") {
      throw new Error(`${label}[${index}] must be a string`);
    }
    return item;
  });
}

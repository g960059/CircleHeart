import type {
  MainWireFiveWallCoupledResidualContextV1,
  MainWireFiveWallCoronaryStepFailureV2,
  MainWireFiveWallCoronaryStepSuccessV2,
} from "@/engine/myocardium/MainWireFiveWallCoronaryTransactionV2";
import {
  CORONARY_BOUNDARY_LINEARIZATION_COMPONENT_IDS_V2,
} from "@/engine/coronary/backwardEulerCoronaryNetworkV2";
import {
  CORONARY_CONSERVED_VOLUME_NODE_IDS_V2,
} from "@/engine/coronary/typesV2";
import {
  NON_CORONARY_EDGE_NAMES_V1,
  NON_CORONARY_INDEPENDENT_NODE_NAMES_V1,
  NON_CORONARY_NODE_NAMES_V1,
} from "@/engine/core/nonCoronaryCirculationBackwardEulerV1";
import { buildEdges } from "@/engine/core/topology";
import { buildCoronaryTopologyV2 } from "@/engine/coronary/topologyPriorV2";
import {
  MAIN_WIRE_ACCEPTED_TYPED_HEMODYNAMIC_LAYOUT_V1,
} from "@/engine/vnext/MainWireAcceptedTypedHemodynamicV1";
import {
  assertFlatCoupledNewtonWorkspaceV1,
  bindFlatCoupledNewtonWorkspaceV1,
  createFlatCoupledNewtonWorkspaceV1,
  solveFlatCoupledSystemV1,
  type FlatCoupledNewtonResultV1,
  type FlatCoupledNewtonWorkspaceV1,
  type FlatCoupledSystemV1,
} from "@/engine/vnext/coupled/FlatCoupledNewtonV1";
import {
  prepareMainWireFiveWallCoupledPredictionV1,
  type MainWireFiveWallCoupledPredictionOrderV1,
  type MainWireFiveWallCoupledPredictorWorkspaceV1,
} from "@/engine/vnext/coupled/MainWireFiveWallCoupledPredictorV1";
import {
  assertMainWireFiveWallCoupledSolveLayoutV1,
  bindMainWireFiveWallCoupledSolveDispatchV1,
  createCanonicalMainWireFiveWallCoupledSolveLayoutV1,
  MAIN_WIRE_FIVE_WALL_COUPLED_SYSTEM_KERNEL_V1_ID,
  type MainWireFiveWallCoupledSolveLayoutV1,
} from "@/engine/vnext/coupled/CoupledHemodynamicsLayoutV1";
import {
  assertBoundExecutionPlanHydraulicDispatchV1,
  type BoundExecutionPlanHydraulicDispatchV1,
  type BoundExecutionPlanNewtonWorkspaceV1,
  type BoundExecutionPlanSolveDispatchV1,
} from "@/runtime/executionPlan/BoundExecutionPlanV1";

export const MAIN_WIRE_FIVE_WALL_COUPLED_NEWTON_SHADOW_V1_ID =
  "main-wire-five-wall-coupled-newton-shadow-v1" as const;
export { MAIN_WIRE_FIVE_WALL_COUPLED_SYSTEM_KERNEL_V1_ID };

const MAIN_WIRE_HYDRAULIC_EXECUTION_PLAN_EXPECTATION_V1 =
  createMainWireHydraulicExecutionPlanExpectationV1();

export type MainWireFiveWallCoupledNewtonShadowOptionsV1 = Readonly<{
  /**
   * Optional caller-owned seed for this synchronous solve. It changes only
   * the Newton starting point; the model-owned residual, admissibility, and
   * convergence gates remain authoritative.
   */
  initialGuessMl?: Float64Array;
  maximumIterations?: number;
  maximumLineSearchBacktracks?: number;
  maximumAcceptedStepsPerJacobian?: number;
  residualInfinityToleranceMl?: number;
  updateInfinityToleranceMl?: number;
  finiteDifferenceRelativeStep?: number;
  jacobianMode?: "central-difference" | "hybrid-coronary-analytic";
  analyticJacobianPolicy?:
    | "allow-noncoronary-fallback"
    | "require-complete";
}>;

export type MainWireFiveWallCoupledNewtonShadowResultV1 = Readonly<{
  solverId: typeof MAIN_WIRE_FIVE_WALL_COUPLED_NEWTON_SHADOW_V1_ID;
  jacobianResidualEvaluationCount: number;
  coronaryAnalyticBlockAssemblyCount: number;
  coronaryBoundaryAnalyticBlockAssemblyCount: number;
  nonCoronaryAnalyticBlockAssemblyCount: number;
  dependentSvContinuityResidualMl: number | null;
  result: FlatCoupledNewtonResultV1;
}>;

export type MainWireFiveWallCoupledPredictedSolveResultV1 = Readonly<{
  predictionMode:
    | "context"
    | "linear-extrapolation"
    | "quadratic-extrapolation"
    | "cubic-extrapolation";
  extrapolationScale: number;
  fallbackUsed: boolean;
  /** Total work includes a failed extrapolated attempt before any fallback. */
  work: MainWireFiveWallCoupledSolveWorkV1;
  solver: MainWireFiveWallCoupledNewtonShadowResultV1;
}>;

export type MainWireFiveWallCoupledSolveWorkV1 = Readonly<{
  attemptCount: number;
  iterations: number;
  residualEvaluationCount: number;
  jacobianEvaluationCount: number;
  lineSearchBacktrackCount: number;
  jacobianResidualEvaluationCount: number;
  coronaryAnalyticBlockAssemblyCount: number;
  coronaryBoundaryAnalyticBlockAssemblyCount: number;
  nonCoronaryAnalyticBlockAssemblyCount: number;
}>;

export function summarizeMainWireFiveWallCoupledSolveWorkV1(
  ...attempts: readonly MainWireFiveWallCoupledNewtonShadowResultV1[]
): MainWireFiveWallCoupledSolveWorkV1 {
  const work = { attemptCount: attempts.length, iterations: 0, residualEvaluationCount: 0,
    jacobianEvaluationCount: 0, lineSearchBacktrackCount: 0, jacobianResidualEvaluationCount: 0,
    coronaryAnalyticBlockAssemblyCount: 0, coronaryBoundaryAnalyticBlockAssemblyCount: 0,
    nonCoronaryAnalyticBlockAssemblyCount: 0 };
  for (const attempt of attempts) {
    work.iterations += attempt.result.iterations;
    work.residualEvaluationCount += attempt.result.residualEvaluationCount;
    work.jacobianEvaluationCount += attempt.result.jacobianEvaluationCount;
    work.lineSearchBacktrackCount += attempt.result.lineSearchBacktrackCount;
    work.jacobianResidualEvaluationCount += attempt.jacobianResidualEvaluationCount;
    work.coronaryAnalyticBlockAssemblyCount += attempt.coronaryAnalyticBlockAssemblyCount;
    work.coronaryBoundaryAnalyticBlockAssemblyCount += attempt.coronaryBoundaryAnalyticBlockAssemblyCount;
    work.nonCoronaryAnalyticBlockAssemblyCount += attempt.nonCoronaryAnalyticBlockAssemblyCount;
  }
  return Object.freeze(work);
}

export type MainWireFiveWallCoupledNewtonAdvanceResultV1<TWallState> =
  | Readonly<{
    status: "accepted";
    solver: MainWireFiveWallCoupledNewtonShadowResultV1;
    step: MainWireFiveWallCoronaryStepSuccessV2<TWallState>;
  }>
  | Readonly<{
    status: "solver-failed";
    solver: MainWireFiveWallCoupledNewtonShadowResultV1;
  }>
  | Readonly<{
    status: "candidate-materialization-failed";
    message: string;
    solver: MainWireFiveWallCoupledNewtonShadowResultV1;
  }>
  | Readonly<{
    status: "finalization-failed";
    solver: MainWireFiveWallCoupledNewtonShadowResultV1;
    step: MainWireFiveWallCoronaryStepFailureV2<TWallState>;
  }>;

export type MainWireFiveWallCoupledNewtonShadowWorkspaceV1 = Readonly<{
  schemaId:
    "circleheart-main-wire-five-wall-coupled-newton-shadow-workspace-v1";
  dimension: number;
}>;

export type MainWireFiveWallCoupledNewtonWorkspaceBackingV1 = Readonly<{
  newton: FlatCoupledNewtonWorkspaceV1;
  unknownScales: Float64Array;
  residualScales: Float64Array;
  solveLayout: MainWireFiveWallCoupledSolveLayoutV1;
  hydraulicDispatch?: BoundExecutionPlanHydraulicDispatchV1;
}>;

type CoupledCoronaryLinearizationStorageV1 = {
  readonly residualMl: Float64Array;
  readonly dResidualDVolume: Float64Array;
  readonly dResidualDBoundary: Float64Array;
  readonly dTotalInletFlowDVolume: Float64Array;
  readonly dCommonVenousOutletFlowDVolume: Float64Array;
  readonly dTotalInletFlowDBoundary: Float64Array;
  readonly dCommonVenousOutletFlowDBoundary: Float64Array;
};

type MainWireFiveWallCoupledNewtonShadowWorkspaceStorageV1 = {
  readonly plus: Float64Array;
  readonly minus: Float64Array;
  readonly plusResidual: Float64Array;
  readonly minusResidual: Float64Array;
  readonly localDependentSvColumn: Float64Array;
  readonly coronaryBoundaryLinearization: Float64Array;
  readonly localNonCoronaryLinearization: Float64Array;
  readonly coronaryLinearization: CoupledCoronaryLinearizationStorageV1;
  readonly unknownScales: Float64Array;
  readonly residualScales: Float64Array;
  readonly newton: FlatCoupledNewtonWorkspaceV1;
  readonly solveLayout: MainWireFiveWallCoupledSolveLayoutV1;
  readonly hydraulicDispatch: BoundExecutionPlanHydraulicDispatchV1 | null;
  inUse: boolean;
};

const MAIN_WIRE_FIVE_WALL_COUPLED_NEWTON_SHADOW_WORKSPACE_STORAGE_V1 =
  new WeakMap<
    MainWireFiveWallCoupledNewtonShadowWorkspaceV1,
    MainWireFiveWallCoupledNewtonShadowWorkspaceStorageV1
  >();
/**
 * Session-owned mutable scratch for the migration solver. It is not accepted
 * model state, is never checkpointed, and may only be borrowed by one solve.
 */
export function createMainWireFiveWallCoupledNewtonShadowWorkspaceV1():
MainWireFiveWallCoupledNewtonShadowWorkspaceV1;
export function createMainWireFiveWallCoupledNewtonShadowWorkspaceV1(
  backing: MainWireFiveWallCoupledNewtonWorkspaceBackingV1,
): MainWireFiveWallCoupledNewtonShadowWorkspaceV1;
export function createMainWireFiveWallCoupledNewtonShadowWorkspaceV1(
  backing?: MainWireFiveWallCoupledNewtonWorkspaceBackingV1,
): MainWireFiveWallCoupledNewtonShadowWorkspaceV1 {
  const nonCoronaryDimension =
    NON_CORONARY_INDEPENDENT_NODE_NAMES_V1.length;
  const coronaryDimension = CORONARY_CONSERVED_VOLUME_NODE_IDS_V2.length;
  const boundaryDimension =
    CORONARY_BOUNDARY_LINEARIZATION_COMPONENT_IDS_V2.length;
  const dimension = nonCoronaryDimension + coronaryDimension;
  const newton = backing?.newton
    ?? createFlatCoupledNewtonWorkspaceV1(dimension);
  const unknownScales = backing?.unknownScales
    ?? new Float64Array(dimension);
  const residualScales = backing?.residualScales
    ?? new Float64Array(dimension);
  const solveLayout = backing?.solveLayout
    ?? createCanonicalMainWireFiveWallCoupledSolveLayoutV1();
  if (backing?.hydraulicDispatch !== undefined) {
    assertBoundExecutionPlanHydraulicDispatchV1(backing.hydraulicDispatch);
  }
  assertFlatCoupledNewtonWorkspaceV1(newton, dimension);
  assertMainWireFiveWallCoupledSolveLayoutV1(solveLayout);
  assertExternalScaleStorageV1(
    newton,
    unknownScales,
    residualScales,
    dimension,
  );
  const workspace = Object.freeze({
    schemaId:
      "circleheart-main-wire-five-wall-coupled-newton-shadow-workspace-v1" as const,
    dimension,
  });
  MAIN_WIRE_FIVE_WALL_COUPLED_NEWTON_SHADOW_WORKSPACE_STORAGE_V1.set(
    workspace,
    {
      plus: new Float64Array(dimension),
      minus: new Float64Array(dimension),
      plusResidual: new Float64Array(dimension),
      minusResidual: new Float64Array(dimension),
      localDependentSvColumn: new Float64Array(nonCoronaryDimension),
      coronaryBoundaryLinearization: new Float64Array(
        boundaryDimension * nonCoronaryDimension,
      ),
      localNonCoronaryLinearization: new Float64Array(
        nonCoronaryDimension * nonCoronaryDimension,
      ),
      coronaryLinearization: {
        residualMl: new Float64Array(coronaryDimension),
        dResidualDVolume:
          new Float64Array(coronaryDimension * coronaryDimension),
        dResidualDBoundary:
          new Float64Array(coronaryDimension * boundaryDimension),
        dTotalInletFlowDVolume: new Float64Array(coronaryDimension),
        dCommonVenousOutletFlowDVolume:
          new Float64Array(coronaryDimension),
        dTotalInletFlowDBoundary: new Float64Array(boundaryDimension),
        dCommonVenousOutletFlowDBoundary:
          new Float64Array(boundaryDimension),
      },
      unknownScales,
      residualScales,
      newton,
      solveLayout,
      hydraulicDispatch: backing?.hydraulicDispatch ?? null,
      inUse: false,
    },
  );
  return workspace;
}

/** Binds one compiler-owned workspace to the model-owned coupled system. */
export function bindMainWireFiveWallCoupledExecutionPlanRuntimeV1(
  input: Readonly<{
    dispatch: BoundExecutionPlanSolveDispatchV1;
    hydraulicDispatch: BoundExecutionPlanHydraulicDispatchV1;
    workspace: BoundExecutionPlanNewtonWorkspaceV1;
  }>,
): MainWireFiveWallCoupledNewtonShadowWorkspaceV1 {
  if (
    input.dispatch.systemKernelId
      !== MAIN_WIRE_FIVE_WALL_COUPLED_SYSTEM_KERNEL_V1_ID
    || input.workspace.solveGroupId !== input.dispatch.solveGroupId
    || input.workspace.dimension !== input.dispatch.activeUnknownCount
  ) {
    throw new Error("Main Wire execution-plan solve system drifted");
  }
  assertBoundExecutionPlanHydraulicDispatchV1(input.hydraulicDispatch);
  assertMainWireHydraulicExecutionPlanDispatchV1(input.hydraulicDispatch);
  return createMainWireFiveWallCoupledNewtonShadowWorkspaceV1({
    newton: bindFlatCoupledNewtonWorkspaceV1({
      dimension: input.workspace.dimension,
      current: input.workspace.currentUnknowns,
      residual: input.workspace.residual,
      jacobian: input.workspace.jacobian,
      factors: input.workspace.factors,
      rightHandSide: input.workspace.rightHandSide,
      transformedRightHandSide:
        input.workspace.transformedRightHandSide,
      update: input.workspace.update,
      trial: input.workspace.trialUnknowns,
      trialResidual: input.workspace.trialResidual,
      pivots: input.workspace.pivots,
    }),
    unknownScales: input.workspace.unknownScale,
    residualScales: input.workspace.residualScale,
    solveLayout: bindMainWireFiveWallCoupledSolveDispatchV1(input.dispatch),
    hydraulicDispatch: input.hydraulicDispatch,
  });
}

/** Returns the exact topology admitted with the compiler-owned workspace. */
export function resolveMainWireHydraulicExecutionPlanDispatchV1(
  workspace: MainWireFiveWallCoupledNewtonShadowWorkspaceV1,
): BoundExecutionPlanHydraulicDispatchV1 {
  assertMainWireFiveWallCoupledNewtonShadowWorkspaceV1(workspace);
  const dispatch =
    MAIN_WIRE_FIVE_WALL_COUPLED_NEWTON_SHADOW_WORKSPACE_STORAGE_V1.get(
      workspace,
    )!.hydraulicDispatch;
  if (dispatch === null) {
    throw new Error("coupled Newton workspace has no execution-plan topology");
  }
  return dispatch;
}

function assertMainWireHydraulicExecutionPlanDispatchV1(
  dispatch: BoundExecutionPlanHydraulicDispatchV1,
): void {
  const {
    nodes: expectedNodes,
    paths: expectedPaths,
  } = MAIN_WIRE_HYDRAULIC_EXECUTION_PLAN_EXPECTATION_V1;
  if (
    dispatch.definitionId !== "main-wire-hemodynamic-model-definition-v1"
    || dispatch.nodes.length !== expectedNodes.length
    || dispatch.paths.length !== expectedPaths.length
    || dispatch.conservationPools.length !== 1
  ) {
    throw new Error("Main Wire hydraulic execution-plan dimensions drifted");
  }
  expectedNodes.forEach((expected, index) => {
    const actual = dispatch.nodes[index];
    if (
      actual?.nodeId !== expected.nodeId
      || actual.componentId !== expected.componentId
      || actual.componentKernelId !== expected.componentKernelId
      || actual.storageStateLogicalIndex !== expected.storageStateLogicalIndex
    ) {
      throw new Error(`Main Wire hydraulic node ${index} drifted`);
    }
  });
  expectedPaths.forEach((expected, index) => {
    const actual = dispatch.paths[index];
    if (
      actual?.pathId !== expected.pathId
      || actual.componentId !== expected.componentId
      || actual.componentKernelId !== expected.componentKernelId
      || dispatch.nodes[actual.upstreamNodeIndex]?.nodeId
        !== expected.upstreamNodeId
      || dispatch.nodes[actual.downstreamNodeIndex]?.nodeId
        !== expected.downstreamNodeId
      || actual.pathKernelId !== expected.pathKernelId
    ) {
      throw new Error(`Main Wire hydraulic path ${index} drifted`);
    }
  });
  const [pool] = dispatch.conservationPools;
  if (
    pool?.poolId !== "global-blood-volume"
    || pool.ledgerStateLogicalIndex
      !== MAIN_WIRE_ACCEPTED_TYPED_HEMODYNAMIC_LAYOUT_V1.fixedTotalBloodVolume
    || pool.dependentStateLogicalIndex
      !== MAIN_WIRE_ACCEPTED_TYPED_HEMODYNAMIC_LAYOUT_V1.nonCoronaryVolumes + 8
    || pool.memberStateLogicalIndices.length !== expectedNodes.length
    || pool.memberStateLogicalIndices.some((logicalIndex, index) =>
      logicalIndex !== expectedNodes[index]!.storageStateLogicalIndex)
  ) {
    throw new Error("Main Wire hydraulic conservation pool drifted");
  }
}

function createMainWireHydraulicExecutionPlanExpectationV1() {
  const edgeById = new Map(buildEdges().map((edge) =>
    [edge.name, edge] as const));
  const nonCoronaryEdges = NON_CORONARY_EDGE_NAMES_V1.map((edgeId) => {
    const edge = edgeById.get(edgeId);
    if (edge === undefined) {
      throw new Error(`Main Wire hydraulic path ${edgeId} is unavailable`);
    }
    return edge;
  });
  const coronaryTopology = buildCoronaryTopologyV2();
  const nodes = Object.freeze([
    ...NON_CORONARY_NODE_NAMES_V1.map((nodeId, index) => ({
      nodeId,
      componentId: "noncoronary-circulation",
      componentKernelId: "noncoronary-backward-euler-kernel-v1",
      storageStateLogicalIndex:
        MAIN_WIRE_ACCEPTED_TYPED_HEMODYNAMIC_LAYOUT_V1.nonCoronaryVolumes
        + index,
    })),
    ...coronaryTopology.nodes.map((node, index) => ({
      nodeId: node.nodeId,
      componentId: "coronary-circulation",
      componentKernelId: "coronary-backward-euler-kernel-v2",
      storageStateLogicalIndex:
        MAIN_WIRE_ACCEPTED_TYPED_HEMODYNAMIC_LAYOUT_V1.coronaryVolumes
        + index,
    })),
  ]);
  const paths = Object.freeze([
    ...nonCoronaryEdges.map((edge) => ({
      pathId: edge.name,
      componentId: "noncoronary-circulation",
      componentKernelId: "noncoronary-backward-euler-kernel-v1",
      upstreamNodeId: edge.up,
      downstreamNodeId: edge.down,
      pathKernelId: `noncoronary-flow/${edge.kind}`,
    })),
    ...coronaryTopology.edges.map((edge) => ({
      pathId: edge.edgeId,
      componentId: "coronary-circulation",
      componentKernelId: "coronary-backward-euler-kernel-v2",
      upstreamNodeId: edge.upstreamNodeId,
      downstreamNodeId: edge.downstreamNodeId,
      pathKernelId: `coronary-flow/${edge.kind}`,
    })),
  ]);
  return Object.freeze({ nodes, paths });
}

export function assertMainWireFiveWallCoupledNewtonShadowWorkspaceV1(
  workspace: MainWireFiveWallCoupledNewtonShadowWorkspaceV1,
): void {
  const expectedDimension = NON_CORONARY_INDEPENDENT_NODE_NAMES_V1.length
    + CORONARY_CONSERVED_VOLUME_NODE_IDS_V2.length;
  const storage =
    MAIN_WIRE_FIVE_WALL_COUPLED_NEWTON_SHADOW_WORKSPACE_STORAGE_V1.get(
      workspace,
    );
  if (
    storage === undefined
    || workspace.dimension !== expectedDimension
    || storage.inUse
  ) {
    throw new RangeError("coupled Newton shadow workspace is not admitted");
  }
}

/** Returns the admitted compiler projection owned by this Scenario workspace. */
export function resolveMainWireFiveWallCoupledSolveLayoutV1(
  workspace: MainWireFiveWallCoupledNewtonShadowWorkspaceV1,
): MainWireFiveWallCoupledSolveLayoutV1 {
  assertMainWireFiveWallCoupledNewtonShadowWorkspaceV1(workspace);
  return MAIN_WIRE_FIVE_WALL_COUPLED_NEWTON_SHADOW_WORKSPACE_STORAGE_V1.get(
    workspace,
  )!.solveLayout;
}

function assertMatchingMainWireFiveWallCoupledSolveLayoutV1(
  contextLayout: MainWireFiveWallCoupledSolveLayoutV1,
  workspaceLayout: MainWireFiveWallCoupledSolveLayoutV1,
): void {
  assertMainWireFiveWallCoupledSolveLayoutV1(contextLayout);
  const blockNames = ["nonCoronary", "coronary", "triSeg"] as const;
  if (contextLayout.dimension !== workspaceLayout.dimension) {
    throw new RangeError("coupled context/workspace solve dimensions drifted");
  }
  for (const blockName of blockNames) {
    const contextBlock = contextLayout[blockName];
    const workspaceBlock = workspaceLayout[blockName];
    if (
      contextBlock.blockId !== workspaceBlock.blockId
      || contextBlock.componentId !== workspaceBlock.componentId
      || contextBlock.kernelId !== workspaceBlock.kernelId
      || contextBlock.disposition !== workspaceBlock.disposition
      || contextBlock.start !== workspaceBlock.start
      || contextBlock.length !== workspaceBlock.length
      || contextBlock.endExclusive !== workspaceBlock.endExclusive
    ) {
      throw new RangeError(
        `coupled context/workspace ${blockName} solve block drifted`,
      );
    }
  }
}

function borrowMainWireFiveWallCoupledNewtonShadowWorkspaceV1(
  workspace: MainWireFiveWallCoupledNewtonShadowWorkspaceV1,
  dimension: number,
): MainWireFiveWallCoupledNewtonShadowWorkspaceStorageV1 {
  const storage =
    MAIN_WIRE_FIVE_WALL_COUPLED_NEWTON_SHADOW_WORKSPACE_STORAGE_V1.get(
      workspace,
    );
  if (storage === undefined || workspace.dimension !== dimension) {
    throw new RangeError("coupled Newton shadow workspace is incompatible");
  }
  if (storage.inUse) {
    throw new Error("coupled Newton shadow workspace is already in use");
  }
  storage.inUse = true;
  return storage;
}

function assertExternalScaleStorageV1(
  newton: FlatCoupledNewtonWorkspaceV1,
  unknownScales: Float64Array,
  residualScales: Float64Array,
  dimension: number,
): void {
  if (
    !(unknownScales instanceof Float64Array)
    || unknownScales.length !== dimension
    || !(residualScales instanceof Float64Array)
    || residualScales.length !== dimension
  ) {
    throw new RangeError(
      "coupled Newton scale storage has an incompatible shape",
    );
  }
  const scaleViews = [unknownScales, residualScales];
  const newtonViews: ArrayBufferView[] = [
    newton.current,
    newton.residual,
    newton.jacobian,
    newton.linear.factors,
    newton.rightHandSide,
    newton.linear.transformedRightHandSide,
    newton.update,
    newton.trial,
    newton.trialResidual,
    newton.linear.pivotRowByColumn,
  ];
  for (let index = 0; index < scaleViews.length; index += 1) {
    const scale = scaleViews[index]!;
    const others: readonly ArrayBufferView[] = [
      ...newtonViews,
      ...scaleViews.slice(index + 1),
    ];
    for (const other of others) {
      if (
        scale.buffer === other.buffer
        && scale.byteOffset < other.byteOffset + other.byteLength
        && other.byteOffset < scale.byteOffset + scale.byteLength
      ) {
        throw new RangeError(
          "coupled Newton scale storage must not overlap solver scratch",
        );
      }
    }
  }
}

/**
 * First advancing proof of the real 30-row equations. The production
 * mechanics provider gives the default hybrid a complete component-owned
 * analytic Jacobian. Providers without the required physical tangents retain
 * a 14-column finite-difference construction fallback. The all-central-
 * difference mode remains an independent oracle only.
 */
export function solveMainWireFiveWallCoupledNewtonShadowV1<TWallState = unknown>(
  context: MainWireFiveWallCoupledResidualContextV1<TWallState>,
  options: MainWireFiveWallCoupledNewtonShadowOptionsV1 = Object.freeze({}),
  workspace: MainWireFiveWallCoupledNewtonShadowWorkspaceV1 =
    createMainWireFiveWallCoupledNewtonShadowWorkspaceV1(),
): MainWireFiveWallCoupledNewtonShadowResultV1 {
  const dimension = context.dimension;
  const storage = borrowMainWireFiveWallCoupledNewtonShadowWorkspaceV1(
    workspace,
    dimension,
  );
  try {
  const finiteDifferenceRelativeStep =
    options.finiteDifferenceRelativeStep ?? 2e-6;
  requirePositiveFinite(
    finiteDifferenceRelativeStep,
    "finiteDifferenceRelativeStep",
  );
  const { plus, minus, plusResidual, minusResidual, solveLayout } = storage;
  assertMatchingMainWireFiveWallCoupledSolveLayoutV1(
    context.solveLayout,
    solveLayout,
  );
  const coronaryDimension = solveLayout.coronary.length;
  const coronaryStart = solveLayout.coronary.start;
  const boundaryDimension =
    CORONARY_BOUNDARY_LINEARIZATION_COMPONENT_IDS_V2.length;
  const nonCoronaryDimension = solveLayout.nonCoronary.length;
  const {
    localDependentSvColumn,
    coronaryBoundaryLinearization,
    localNonCoronaryLinearization,
    coronaryLinearization,
  } = storage;
  let jacobianResidualEvaluationCount = 0;
  let coronaryAnalyticBlockAssemblyCount = 0;
  let coronaryBoundaryAnalyticBlockAssemblyCount = 0;
  let nonCoronaryAnalyticBlockAssemblyCount = 0;
  const jacobianMode = options.jacobianMode
    ?? "hybrid-coronary-analytic";
  const system: FlatCoupledSystemV1 = Object.freeze({
    dimension,
    assertCandidateAdmissible: (unknowns) => {
      const dependentSvVolumeMl = context.fixedGlobalTotalBloodVolumeMl
        - sumVector(unknowns);
      if (!(dependentSvVolumeMl > context.minimumDependentSvVolumeMl)) {
        throw new RangeError(
          "coupled candidate leaves no admissible dependent SV volume",
        );
      }
    },
    maximumAdmissibleStepLength: (current, update) => {
      const updateSum = sumVector(update);
      if (updateSum <= 0) return 1;
      const availableVolumeMl = context.fixedGlobalTotalBloodVolumeMl
        - context.minimumDependentSvVolumeMl - sumVector(current);
      if (!(availableVolumeMl > 0)) {
        throw new RangeError(
          "coupled candidate has no dependent SV volume headroom",
        );
      }
      return availableVolumeMl / updateSum;
    },
    evaluateResidual: context.evaluateResidualMl,
    isResidualConverged: context.isResidualConverged,
    evaluateJacobian: (unknowns, destination) => {
      let completeAnalyticAssemblyAvailable = false;
      if (jacobianMode === "hybrid-coronary-analytic") {
        completeAnalyticAssemblyAvailable =
          context.writeCoupledLinearizations(
            unknowns,
            coronaryLinearization,
            localDependentSvColumn,
            localNonCoronaryLinearization,
            coronaryBoundaryLinearization,
          );
        coronaryAnalyticBlockAssemblyCount += 1;
        if (
          !completeAnalyticAssemblyAvailable
          && options.analyticJacobianPolicy === "require-complete"
        ) {
          throw new Error(
            "coupled authority requires a complete component-owned analytic Jacobian",
          );
        }
      }
      const finiteDifferenceColumnCount =
        jacobianMode === "hybrid-coronary-analytic"
          ? completeAnalyticAssemblyAvailable
            ? 0
            : nonCoronaryDimension
          : dimension;
      for (
        let column = 0;
        column < finiteDifferenceColumnCount;
        column += 1
      ) {
        plus.set(unknowns);
        minus.set(unknowns);
        const halfStep = finiteDifferenceRelativeStep
          * Math.max(1, Math.abs(unknowns[column]!));
        if (
          unknowns[column]! - halfStep <= context.lowerBoundsMl[column]!
          || unknowns[column]! + halfStep >= context.upperBoundsMl[column]!
        ) {
          throw new RangeError(
            `coupled finite-difference column ${column} has no centered step`,
          );
        }
        plus[column] += halfStep;
        minus[column] -= halfStep;
        context.evaluateResidualMl(plus, plusResidual);
        context.evaluateResidualMl(minus, minusResidual);
        jacobianResidualEvaluationCount += 2;
        const denominator = 2 * halfStep;
        for (let row = 0; row < dimension; row += 1) {
          destination[row * dimension + column] =
            (plusResidual[row]! - minusResidual[row]!) / denominator;
        }
      }
      if (jacobianMode === "hybrid-coronary-analytic") {
        const aoResidualRow =
          NON_CORONARY_INDEPENDENT_NODE_NAMES_V1.indexOf("Ao");
        const raResidualRow =
          NON_CORONARY_INDEPENDENT_NODE_NAMES_V1.indexOf("RA");
        if (aoResidualRow < 0 || raResidualRow < 0) {
          throw new Error(
            "coupled coronary block requires independent Ao and RA rows",
          );
        }
        for (let row = 0; row < nonCoronaryDimension; row += 1) {
          for (let column = 0; column < coronaryDimension; column += 1) {
            let derivative = -localDependentSvColumn[row]!;
            if (row === aoResidualRow) {
              derivative += context.stepDtSec
                * coronaryLinearization.dTotalInletFlowDVolume[column]!;
            }
            if (row === raResidualRow) {
              derivative -= context.stepDtSec
                * coronaryLinearization
                  .dCommonVenousOutletFlowDVolume[column]!;
            }
            destination[row * dimension + coronaryStart + column] =
              derivative;
          }
        }
        for (let row = 0; row < coronaryDimension; row += 1) {
          for (let column = 0; column < coronaryDimension; column += 1) {
            destination[
              (coronaryStart + row) * dimension
              + coronaryStart + column
            ] = coronaryLinearization.dResidualDVolume[
              row * coronaryDimension + column
            ]!;
          }
        }
        if (completeAnalyticAssemblyAvailable) {
          coronaryBoundaryAnalyticBlockAssemblyCount += 1;
          nonCoronaryAnalyticBlockAssemblyCount += 1;
          for (let row = 0; row < nonCoronaryDimension; row += 1) {
            for (
              let column = 0;
              column < nonCoronaryDimension;
              column += 1
            ) {
              destination[row * dimension + column] =
                localNonCoronaryLinearization[
                  row * nonCoronaryDimension + column
                ]!;
            }
          }
          for (
            let column = 0;
            column < nonCoronaryDimension;
            column += 1
          ) {
            let inletDerivative = 0;
            let outletDerivative = 0;
            for (
              let boundary = 0;
              boundary < boundaryDimension;
              boundary += 1
            ) {
              const boundaryDerivative = coronaryBoundaryLinearization[
                boundary * nonCoronaryDimension + column
              ]!;
              inletDerivative +=
                coronaryLinearization.dTotalInletFlowDBoundary[boundary]!
                  * boundaryDerivative;
              outletDerivative +=
                coronaryLinearization
                  .dCommonVenousOutletFlowDBoundary[boundary]!
                  * boundaryDerivative;
            }
            destination[aoResidualRow * dimension + column] +=
              context.stepDtSec * inletDerivative;
            destination[raResidualRow * dimension + column] -=
              context.stepDtSec * outletDerivative;
          }
          for (let row = 0; row < coronaryDimension; row += 1) {
            for (
              let column = 0;
              column < nonCoronaryDimension;
              column += 1
            ) {
              let derivative = 0;
              for (
                let boundary = 0;
                boundary < boundaryDimension;
                boundary += 1
              ) {
                derivative += coronaryLinearization.dResidualDBoundary[
                  row * boundaryDimension + boundary
                ]! * coronaryBoundaryLinearization[
                  boundary * nonCoronaryDimension + column
                ]!;
              }
              destination[
                (coronaryStart + row) * dimension + column
              ] = derivative;
            }
          }
        }
      }
    },
  });
  for (let index = 0; index < dimension; index += 1) {
    const scale = Math.max(1, Math.abs(context.initialUnknownsMl[index]!));
    storage.unknownScales[index] = scale;
    storage.residualScales[index] = scale;
  }
  const result = solveFlatCoupledSystemV1(
    system,
    options.initialGuessMl ?? context.initialUnknownsMl,
    Object.freeze({
      maximumIterations: options.maximumIterations ?? 12,
      maximumLineSearchBacktracks:
        options.maximumLineSearchBacktracks ?? 24,
      maximumAcceptedStepsPerJacobian:
        options.maximumAcceptedStepsPerJacobian ?? 1,
      residualInfinityTolerance:
        options.residualInfinityToleranceMl ?? 2e-9,
      updateInfinityTolerance: options.updateInfinityToleranceMl ?? 1e-12,
      armijoCoefficient: 1e-4,
      minimumAbsolutePivot: 1e-14,
      unknownScaleByUnknown: storage.unknownScales,
      residualScaleByEquation: storage.residualScales,
      lowerBoundByUnknown: context.lowerBoundsMl,
      upperBoundByUnknown: context.upperBoundsMl,
    }),
    storage.newton,
  );
  const dependentSvContinuityResidualMl = result.status === "converged"
    ? context.evaluateDependentSvContinuityResidualMl(result.solution)
    : null;
  return Object.freeze({
    solverId: MAIN_WIRE_FIVE_WALL_COUPLED_NEWTON_SHADOW_V1_ID,
    jacobianResidualEvaluationCount,
    coronaryAnalyticBlockAssemblyCount,
    coronaryBoundaryAnalyticBlockAssemblyCount,
    nonCoronaryAnalyticBlockAssemblyCount,
    dependentSvContinuityResidualMl,
    result,
  });
  } finally {
    storage.inUse = false;
  }
}

/**
 * Uses the accepted-trajectory predictor as a performance hint only. If the
 * extrapolated seed cannot converge, the exact same model-owned solve is
 * retried from the context seed. Neither attempt mutates accepted state or
 * predictor history.
 */
export function solveMainWireFiveWallCoupledNewtonPredictedV1<
  TWallState = unknown,
>(
  context: MainWireFiveWallCoupledResidualContextV1<TWallState>,
  options: MainWireFiveWallCoupledNewtonShadowOptionsV1,
  solverWorkspace: MainWireFiveWallCoupledNewtonShadowWorkspaceV1,
  predictorWorkspace: MainWireFiveWallCoupledPredictorWorkspaceV1,
  predictionOrder: MainWireFiveWallCoupledPredictionOrderV1 = "linear",
): MainWireFiveWallCoupledPredictedSolveResultV1 {
  const prediction = prepareMainWireFiveWallCoupledPredictionV1(
    context,
    predictorWorkspace,
    predictionOrder,
  );
  const primary = solveMainWireFiveWallCoupledNewtonShadowV1(
    context,
    Object.freeze({
      ...options,
      initialGuessMl: prediction.initialGuessMl,
    }),
    solverWorkspace,
  );
  if (
    primary.result.status === "converged"
    || prediction.mode === "context"
  ) {
    return Object.freeze({
      predictionMode: prediction.mode,
      extrapolationScale: prediction.extrapolationScale,
      fallbackUsed: false,
      work: summarizeMainWireFiveWallCoupledSolveWorkV1(primary),
      solver: primary,
    });
  }
  const fallback = solveMainWireFiveWallCoupledNewtonShadowV1(
    context,
    Object.freeze({
      ...options,
      initialGuessMl: context.initialUnknownsMl,
    }),
    solverWorkspace,
  );
  return Object.freeze({
    predictionMode: prediction.mode,
    extrapolationScale: prediction.extrapolationScale,
    fallbackUsed: true,
    work: summarizeMainWireFiveWallCoupledSolveWorkV1(primary, fallback),
    solver: fallback,
  });
}

/**
 * Advances one accepted tuple through the coupled 30-row solve and the same
 * atomic finalizer used by the nested reference path. This remains a vNext
 * migration entry point; callers retain the previous accepted tuple unless
 * `status === "accepted"`.
 */
export function advanceMainWireFiveWallCoupledNewtonV1<TWallState>(
  context: MainWireFiveWallCoupledResidualContextV1<TWallState>,
  options: MainWireFiveWallCoupledNewtonShadowOptionsV1 = Object.freeze({}),
  workspace: MainWireFiveWallCoupledNewtonShadowWorkspaceV1 =
    createMainWireFiveWallCoupledNewtonShadowWorkspaceV1(),
): MainWireFiveWallCoupledNewtonAdvanceResultV1<TWallState> {
  const solver = solveMainWireFiveWallCoupledNewtonShadowV1(
    context,
    Object.freeze({
      ...options,
      analyticJacobianPolicy: "require-complete" as const,
    }),
    workspace,
  );
  if (solver.result.status !== "converged") {
    return Object.freeze({
      status: "solver-failed" as const,
      solver,
    });
  }
  let step;
  try {
    step = context.finalizeConvergedSolution(
      solver.result.solution,
      Object.freeze({
        iterations: solver.result.iterations,
        lineSearchBacktracks: solver.result.lineSearchBacktrackCount,
      }),
    );
  } catch (error) {
    return Object.freeze({
      status: "candidate-materialization-failed" as const,
      message: error instanceof Error ? error.message : String(error),
      solver,
    });
  }
  if (step.converged === false) {
    return Object.freeze({
      status: "finalization-failed" as const,
      solver,
      step,
    });
  }
  return Object.freeze({
    status: "accepted" as const,
    solver,
    step,
  });
}

function requirePositiveFinite(value: number, label: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${label} must be positive and finite`);
  }
}

function sumVector(values: Float64Array): number {
  let sum = 0;
  for (let index = 0; index < values.length; index += 1) {
    sum += values[index]!;
  }
  return sum;
}

export const EXECUTION_PLAN_DESCRIPTOR_V1_SCHEMA_ID =
  "circleheart-execution-plan-descriptor-v1" as const;

export type ExecutionPlanStateStorageKindV1 =
  | "continuous-f64"
  | "boolean-u8";

export type ExecutionPlanSolverPolicyV1 = Readonly<{
  nonlinearMethod: "newton";
  globalization: "armijo-line-search";
  jacobian: "component-analytic-with-finite-difference-audit";
  linearSolver: "dense-lu";
  matrixStorage: "row-major-f64";
}>;

export type ExecutionPlanNewtonF64WorkspaceRoleV1 =
  | "current-unknowns"
  | "residual"
  | "jacobian"
  | "factors"
  | "right-hand-side"
  | "transformed-right-hand-side"
  | "update"
  | "trial-unknowns"
  | "trial-residual"
  | "unknown-scale"
  | "residual-scale";

export type ExecutionPlanNewtonInt32WorkspaceRoleV1 = "pivots";

export type ExecutionPlanWorkspaceSegmentV1<TRole extends string> = Readonly<{
  role: TRole;
  offset: number;
  length: number;
}>;

export type ExecutionPlanUpdateGroupV1 = Readonly<{
  updateGroupId: string;
  ordinal: number;
  periodTicks: number;
  phaseTicks: number;
  effectiveStepSec: number;
  integration: "fixed-step-backward-euler" | "fixed-step-conservative-partitioned";
  solveGroupId: string;
  solveGroupIndex: number;
}>;

export type ExecutionPlanUpdateScheduleV1 = Readonly<{
  baseTickSec: number;
  presentationPeriodTicks: number;
  presentationStepSec: number;
  groups: readonly ExecutionPlanUpdateGroupV1[];
}>;

export type ExecutionPlanStateSlotV1 = Readonly<{
  stateId: string;
  componentId: string;
  authorityPointer: string;
  logicalIndex: number;
  storageKind: ExecutionPlanStateStorageKindV1;
  storageIndex: number;
  unit: string;
}>;

export type ExecutionPlanStateBlockV1 = Readonly<{
  componentId: string;
  kernelId: string;
  logicalStart: number;
  logicalLength: number;
}>;

export type ExecutionPlanSolveBlockV1 = Readonly<{
  blockId: string;
  componentId: string;
  kernelId: string;
  disposition: "retained" | "statically-condensed";
  start: number;
  length: number;
  endExclusive: number;
  stateIds: readonly string[];
  stateLogicalIndices: readonly number[];
  residualIds: readonly string[];
}>;

export type ExecutionPlanSolveGroupV1 = Readonly<{
  solveGroupId: string;
  systemKernelId: string;
  unknownStateIds: readonly string[];
  activeUnknownStateIds: readonly string[];
  dependentStateIds: readonly string[];
  blocks: readonly ExecutionPlanSolveBlockV1[];
  totalUnknownCount: number;
  activeUnknownCount: number;
  jacobianElementCount: number;
  workspace: Readonly<{
    f64Count: number;
    int32Count: number;
    f64Segments: readonly ExecutionPlanWorkspaceSegmentV1<
      ExecutionPlanNewtonF64WorkspaceRoleV1
    >[];
    int32Segments: readonly ExecutionPlanWorkspaceSegmentV1<
      ExecutionPlanNewtonInt32WorkspaceRoleV1
    >[];
  }>;
  solver: ExecutionPlanSolverPolicyV1;
}>;

export type ExecutionPlanDescriptorV1 = Readonly<{
  schemaId: typeof EXECUTION_PLAN_DESCRIPTOR_V1_SCHEMA_ID;
  definitionId: string;
  policyId: string;
  stateLayout: Readonly<{
    logicalSlotCount: number;
    continuousSlotCount: number;
    booleanSlotCount: number;
    blocks: readonly ExecutionPlanStateBlockV1[];
    slots: readonly ExecutionPlanStateSlotV1[];
  }>;
  hydraulicGraph: Readonly<{
    nodeIds: readonly string[];
    nodeComponentBlockIndices: readonly number[];
    storageStateLogicalIndices: readonly number[];
    pathIds: readonly string[];
    pathComponentBlockIndices: readonly number[];
    upstreamNodeIndices: readonly number[];
    downstreamNodeIndices: readonly number[];
    pathKernelIds: readonly string[];
    conservationPools: readonly Readonly<{
      poolId: string;
      ledgerStateLogicalIndex: number;
      memberStateLogicalIndices: readonly number[];
      dependentStateLogicalIndex: number;
    }>[];
  }>;
  solveGroups: readonly ExecutionPlanSolveGroupV1[];
  updateSchedule: ExecutionPlanUpdateScheduleV1;
}>;

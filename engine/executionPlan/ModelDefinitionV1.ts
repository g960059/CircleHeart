export const MODEL_DEFINITION_V1_SCHEMA_ID =
  "circleheart-model-definition-v1" as const;

export const NUMERICAL_POLICY_V1_SCHEMA_ID =
  "circleheart-numerical-policy-v1" as const;

export type ModelStateStorageKindV1 =
  | "continuous-f64"
  | "boolean-u8";

export type ModelStateDefinitionV1 = Readonly<{
  stateId: string;
  ordinal: number;
  storageKind: ModelStateStorageKindV1;
  unit: string;
  /** Exact accepted-state leaf owned by this numerical state. */
  authorityPointer: string;
}>;

/**
 * A component is a scientific ownership boundary. `kernelId` names the
 * implementation family that will later be bound to the compiled descriptor;
 * it is deliberately not executable code or a module URL.
 */
export type ModelComponentDefinitionV1 = Readonly<{
  componentId: string;
  ordinal: number;
  kernelId: string;
  states: readonly ModelStateDefinitionV1[];
}>;

export type ModelHydraulicNodeDefinitionV1 = Readonly<{
  nodeId: string;
  ordinal: number;
  componentId: string;
  storageStateId: string;
}>;

export type ModelHydraulicPathDefinitionV1 = Readonly<{
  pathId: string;
  ordinal: number;
  componentId: string;
  upstreamNodeId: string;
  downstreamNodeId: string;
  kernelId: string;
}>;

export type ModelConservationPoolDefinitionV1 = Readonly<{
  poolId: string;
  ordinal: number;
  ledgerStateId: string;
  memberStateIds: readonly string[];
  dependentStateId: string;
}>;

export type ModelDefinitionV1 = Readonly<{
  schemaId: typeof MODEL_DEFINITION_V1_SCHEMA_ID;
  definitionId: string;
  components: readonly ModelComponentDefinitionV1[];
  hydraulicTopology: Readonly<{
    nodes: readonly ModelHydraulicNodeDefinitionV1[];
    paths: readonly ModelHydraulicPathDefinitionV1[];
    conservationPools: readonly ModelConservationPoolDefinitionV1[];
  }>;
}>;

export type NumericalUnknownBlockV1 = Readonly<{
  blockId: string;
  ordinal: number;
  disposition: "retained" | "statically-condensed";
  stateIds: readonly string[];
  residualIds: readonly string[];
}>;

export type NumericalSolveGroupV1 = Readonly<{
  solveGroupId: string;
  ordinal: number;
  /** Model-owned residual/Jacobian/materialization assembly implementation. */
  systemKernelId: string;
  unknownBlocks: readonly NumericalUnknownBlockV1[];
  dependentStateIds: readonly string[];
  solver: Readonly<{
    nonlinearMethod: "newton";
    globalization: "armijo-line-search";
    jacobian: "component-analytic-with-finite-difference-audit";
    linearSolver: "dense-lu";
    matrixStorage: "row-major-f64";
  }>;
}>;

export type NumericalUpdateGroupV1 = Readonly<{
  updateGroupId: string;
  ordinal: number;
  integration: "fixed-step-backward-euler" | "fixed-step-conservative-partitioned";
  /** Number of policy timebase ticks between updates. */
  periodTicks: number;
  /** Target-tick phase in [0, periodTicks). */
  phaseTicks: number;
  solveGroupId: string;
}>;

/**
 * Numerical policy is separate from scientific structure. Changing solver or
 * scheduling policy must not require rewriting the topology definition.
 */
export type NumericalPolicyV1 = Readonly<{
  schemaId: typeof NUMERICAL_POLICY_V1_SCHEMA_ID;
  policyId: string;
  timebase: Readonly<{
    baseTickSec: number;
    presentationPeriodTicks: number;
  }>;
  solveGroups: readonly NumericalSolveGroupV1[];
  updateGroups: readonly NumericalUpdateGroupV1[];
}>;

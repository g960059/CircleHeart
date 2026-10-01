import generated from "./CardiorespiratoryExecutionPlanV1.generated.json";
import { assertBoundExecutionPlanV1, bindExecutionPlanV1, bindExecutionPlanSolveSystemRuntimeV1,
  prepareBoundExecutionPlanSolveGroupV1, resolveBoundExecutionPlanHydraulicDispatchV1,
  resolveBoundExecutionPlanStateDispatchV1, resolveBoundExecutionPlanUpdateScheduleV1,
  validateAndOwnExecutionPlanDescriptorV1, validateAndOwnExecutionPlanKernelCatalogV1,
  type BoundExecutionPlanV1, type BoundExecutionPlanHydraulicDispatchV1,
  type BoundExecutionPlanSolveDispatchV1, type BoundExecutionPlanNewtonWorkspaceV1 }
  from "@/runtime/executionPlan/BoundExecutionPlanV1";
import { MAIN_WIRE_COUPLED_HEMODYNAMICS_SOLVE_GROUP_ID_V1 } from "@/engine/executionPlan/MainWireNumericalClockV1";
import { MAIN_WIRE_FIVE_WALL_COUPLED_SYSTEM_KERNEL_V1_ID, bindMainWireFiveWallCoupledSolveDispatchV1 }
  from "@/engine/vnext/coupled/CoupledHemodynamicsLayoutV1";
import { bindFlatCoupledNewtonWorkspaceV1 } from "@/engine/vnext/coupled/FlatCoupledNewtonV1";
import { createMainWireFiveWallCoupledNewtonShadowWorkspaceV1 } from "@/engine/vnext/coupled/MainWireFiveWallCoupledNewtonShadowV1";
import { CARDIORESPIRATORY_MODEL_DEFINITION_V1_ID, CARDIORESPIRATORY_PULMONARY_PATH_KERNEL_V1_ID,
  CARDIORESPIRATORY_STATE_OWNERS_V1 } from "./CardiorespiratoryExecutionPlanContractV1";

export const CARDIORESPIRATORY_EXECUTION_PLAN_DESCRIPTOR_V1 = validateAndOwnExecutionPlanDescriptorV1(generated);
/** Explicit implementation whitelist: receiving a descriptor never admits a new kernel. */
export const CARDIORESPIRATORY_EXECUTION_PLAN_KERNEL_BINDINGS_V1 = validateAndOwnExecutionPlanKernelCatalogV1({
  componentKernelIds: ["accepted-transaction-kernel-v1", "noncoronary-backward-euler-kernel-v1",
    "coronary-backward-euler-kernel-v2", "five-wall-land-triseg-kernel-v1",
    ...new Set(CARDIORESPIRATORY_STATE_OWNERS_V1.map(({ kernelId }) => kernelId))],
  hydraulicPathKernelIds: ["noncoronary-flow/resistive", "noncoronary-flow/valve", "noncoronary-flow/dynamic",
    "coronary-flow/large-arterial", "coronary-flow/micro-proximal-arteriolar", "coronary-flow/micro-intermediate-capillary",
    "coronary-flow/micro-distal-venular", "coronary-flow/large-venous-outlet", CARDIORESPIRATORY_PULMONARY_PATH_KERNEL_V1_ID],
  solveSystemKernelIds: [MAIN_WIRE_FIVE_WALL_COUPLED_SYSTEM_KERNEL_V1_ID],
});

export function bindCardiorespiratoryExecutionPlanV1(descriptor: unknown = CARDIORESPIRATORY_EXECUTION_PLAN_DESCRIPTOR_V1): BoundExecutionPlanV1 {
  const owned = validateAndOwnExecutionPlanDescriptorV1(descriptor);
  const bound = bindExecutionPlanV1(owned, CARDIORESPIRATORY_EXECUTION_PLAN_KERNEL_BINDINGS_V1);
  if (JSON.stringify(owned) !== JSON.stringify(CARDIORESPIRATORY_EXECUTION_PLAN_DESCRIPTOR_V1)) {
    throw new Error("Cardiorespiratory execution-plan descriptor drifted");
  }
  return bound;
}

/** Bind once per session. All views share the admitted preallocated Newton backing. */
export function prepareCardiorespiratoryExecutionPlanV1(bound: BoundExecutionPlanV1) {
  const descriptor = CARDIORESPIRATORY_EXECUTION_PLAN_DESCRIPTOR_V1;
  assertBoundExecutionPlanV1(bound, descriptor);
  const state = resolveBoundExecutionPlanStateDispatchV1(bound);
  if (state.slots.length !== descriptor.stateLayout.logicalSlotCount || state.slots.some((slot, index) => {
    const expected = descriptor.stateLayout.slots[index]!;
    return slot.stateId !== expected.stateId || slot.authorityPointer !== expected.authorityPointer
      || slot.storageKind !== expected.storageKind || slot.logicalIndex !== expected.logicalIndex;
  })) throw new Error("Cardiorespiratory accepted-state binding drifted");
  const updateSchedule = resolveBoundExecutionPlanUpdateScheduleV1(bound);
  const expectedSchedule = descriptor.updateSchedule;
  if (updateSchedule.definitionId !== descriptor.definitionId || updateSchedule.policyId !== descriptor.policyId
    || updateSchedule.baseTickSec !== expectedSchedule.baseTickSec
    || updateSchedule.presentationPeriodTicks !== expectedSchedule.presentationPeriodTicks
    || updateSchedule.presentationStepSec !== expectedSchedule.presentationStepSec
    || updateSchedule.groups.length !== expectedSchedule.groups.length
    || updateSchedule.groups.some((group, i) => Object.entries(expectedSchedule.groups[i]!).some(([key, value]) =>
      group[key as keyof typeof group] !== value))) throw new Error("Cardiorespiratory update schedule drifted");
  assertCardiorespiratoryHydraulicDispatch(resolveBoundExecutionPlanHydraulicDispatchV1(bound));
  const prepared = prepareBoundExecutionPlanSolveGroupV1(bound, MAIN_WIRE_COUPLED_HEMODYNAMICS_SOLVE_GROUP_ID_V1);
  const workspace = bindExecutionPlanSolveSystemRuntimeV1(bound, MAIN_WIRE_COUPLED_HEMODYNAMICS_SOLVE_GROUP_ID_V1,
    prepared, [{ systemKernelId: MAIN_WIRE_FIVE_WALL_COUPLED_SYSTEM_KERNEL_V1_ID, bind: bindNumericalRuntime }]);
  return Object.freeze({ workspace, updateSchedule });
}

function bindNumericalRuntime(input: Readonly<{ dispatch: BoundExecutionPlanSolveDispatchV1;
  hydraulicDispatch: BoundExecutionPlanHydraulicDispatchV1; workspace: BoundExecutionPlanNewtonWorkspaceV1 }>) {
  if (input.dispatch.systemKernelId !== MAIN_WIRE_FIVE_WALL_COUPLED_SYSTEM_KERNEL_V1_ID
    || input.workspace.solveGroupId !== input.dispatch.solveGroupId
    || input.workspace.dimension !== input.dispatch.activeUnknownCount) throw new Error("Cardiorespiratory solve system drifted");
  assertCardiorespiratoryHydraulicDispatch(input.hydraulicDispatch);
  const w = input.workspace;
  return createMainWireFiveWallCoupledNewtonShadowWorkspaceV1({
    newton: bindFlatCoupledNewtonWorkspaceV1({ dimension: w.dimension, current: w.currentUnknowns,
      residual: w.residual, jacobian: w.jacobian, factors: w.factors, rightHandSide: w.rightHandSide,
      transformedRightHandSide: w.transformedRightHandSide, update: w.update,
      trial: w.trialUnknowns, trialResidual: w.trialResidual, pivots: w.pivots }),
    unknownScales: w.unknownScale, residualScales: w.residualScale,
    solveLayout: bindMainWireFiveWallCoupledSolveDispatchV1(input.dispatch), hydraulicDispatch: input.hydraulicDispatch,
  });
}

function assertCardiorespiratoryHydraulicDispatch(actual: BoundExecutionPlanHydraulicDispatchV1): void {
  const d = CARDIORESPIRATORY_EXECUTION_PLAN_DESCRIPTOR_V1, graph = d.hydraulicGraph;
  if (actual.definitionId !== CARDIORESPIRATORY_MODEL_DEFINITION_V1_ID || actual.nodes.length !== graph.nodeIds.length
    || actual.paths.length !== graph.pathIds.length) throw new Error("Cardiorespiratory hydraulic topology dimensions drifted");
  for (const [i, node] of actual.nodes.entries()) {
    const block = d.stateLayout.blocks[graph.nodeComponentBlockIndices[i]!]!;
    if (node.nodeId !== graph.nodeIds[i] || node.componentId !== block.componentId || node.componentKernelId !== block.kernelId
      || node.storageStateLogicalIndex !== graph.storageStateLogicalIndices[i]) throw new Error(`Cardiorespiratory hydraulic node ${i} drifted`);
  }
  for (const [i, p] of actual.paths.entries()) {
    const block = d.stateLayout.blocks[graph.pathComponentBlockIndices[i]!]!;
    if (p.pathId !== graph.pathIds[i] || p.componentId !== block.componentId || p.componentKernelId !== block.kernelId
      || p.pathKernelId !== graph.pathKernelIds[i] || p.upstreamNodeIndex !== graph.upstreamNodeIndices[i]
      || p.downstreamNodeIndex !== graph.downstreamNodeIndices[i]) throw new Error(`Cardiorespiratory hydraulic path ${i} drifted`);
  }
  if (JSON.stringify(actual.conservationPools) !== JSON.stringify(graph.conservationPools)) throw new Error("Cardiorespiratory conservation pools drifted");
}

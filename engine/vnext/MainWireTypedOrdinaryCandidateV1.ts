import { CORONARY_LAYER_IDS_V2, CORONARY_TERRITORY_IDS_V2 } from "@/engine/coronary/typesV2";
import type { CoronaryAutoregulationWindowControlV3 } from "@/engine/coronary/acceptedAutoregulationWindowV3";
import { advanceMainWireFiveWallCoronaryAutoregulationOwnerFromPackedV3,
  type MainWireFiveWallCoronaryAutoregulationAcceptedOwnerV3,
  type MainWireFiveWallCoronaryStepInputV3 } from "@/engine/myocardium/MainWireFiveWallCoronaryTransactionV3";
import type { MainWireFiveWallCoupledAcceptedCandidateBorrowV1,
  MainWireFiveWallCoupledResidualWorkspaceV1, MainWireFiveWallCoronaryAcceptedStateV2 } from "@/engine/myocardium/MainWireFiveWallCoronaryTransactionV2";
import type { MainWireNormalAdultFiveWallMechanicsStateV1 } from "@/engine/myocardium/experiments/MainWireNormalAdultFiveWallClosedLoopV1";
import type { MainWireNormalAdultFiveWallProviderV1 } from "@/engine/myocardium/mechanics/MainWireNormalAdultFiveWallProviderV1";
import type { AcceptedComposedRhythmTransactionConfigurationV2 } from "@/engine/myocardium/rhythm/acceptedComposedRhythmTransactionV2";
import type { MainWireIntegratedModelCandidateTimeLimitV3 } from "@/engine/myocardium/MainWireIntegratedModelTransactionV3";
import { solveMainWireFiveWallCoupledCandidateV1, type MainWireFiveWallCoupledCandidateSolveOptionsV1, type MainWireFiveWallCoupledSolveDiagnosticsV1 } from "./coupled/MainWireIntegratedCoupledStepV1";
import { stageAcceptedMainWireFiveWallCoupledSolutionV1, type MainWireFiveWallCoupledPredictorPromotionV1 } from "./coupled/MainWireFiveWallCoupledPredictorV1";
import type { MainWireFiveWallCoupledNewtonShadowWorkspaceV1 } from "./coupled/MainWireFiveWallCoupledNewtonShadowV1";
import { createMainWireAcceptedTypedNonCoronaryNumericalSourceV1, readMainWireAcceptedTypedClockV1,
  stageMainWireAcceptedTypedClockCandidateV1, stageMainWireAcceptedTypedCalciumCandidateV1,
  stageMainWireAcceptedTypedAuthoredScheduleCandidateV1, stageMainWireAcceptedTypedRegularAtrialCandidateV1,
  stageMainWireAcceptedTypedOrdinaryPostSolverCandidateV1, type MainWireAcceptedTypedBoundaryBindingV1 } from "./MainWireAcceptedTypedBoundaryV1";
import { materializeMainWireAcceptedTypedCoupledSolverAdapterV1, stageMainWireAcceptedTypedCoupledCandidateV1,
  type MainWireAcceptedTypedHemodynamicBindingV1 } from "./MainWireAcceptedTypedHemodynamicV1";
import type { TransactionalTypedStateCurrentCursorV1, TransactionalTypedStateCandidateCursorV1 } from "./TransactionalTypedStateImageV1";

type WallState = MainWireNormalAdultFiveWallMechanicsStateV1;
type Owner = MainWireFiveWallCoronaryAutoregulationAcceptedOwnerV3;

function sameControl(left: CoronaryAutoregulationWindowControlV3 | null, right: CoronaryAutoregulationWindowControlV3 | null): boolean {
  if (left === null || right === null) return left === right;
  if (left.controlId !== right.controlId) return false;
  return CORONARY_TERRITORY_IDS_V2.every(t => CORONARY_LAYER_IDS_V2.every(l =>
    left.demandScaleByTerritoryLayer[t][l] === right.demandScaleByTerritoryLayer[t][l]
    && left.hyperemia01ByTerritoryLayer[t][l] === right.hyperemia01ByTerritoryLayer[t][l]
    && left.effectiveMinimumToneScaleByTerritoryLayer[t][l] === right.effectiveMinimumToneScaleByTerritoryLayer[t][l]));
}

export function isMainWireTypedOrdinaryCandidateV1(
  acceptedTimeSec: number, limit: MainWireIntegratedModelCandidateTimeLimitV3,
  configuration: AcceptedComposedRhythmTransactionConfigurationV2, owner: Owner,
): boolean {
  const windowEnd = acceptedTimeSec + limit.coronaryWindowMaximumStepSec;
  const tolerance = 64 * Number.EPSILON * Math.max(1, Math.abs(acceptedTimeSec), Math.abs(limit.candidateTimeSec), Math.abs(windowEnd));
  return configuration.atrialSource.mode === "regular"
    && configuration.atrialSource.regularSourceConfiguration.rhythmClass === "sinus"
    && limit.rhythmBoundaryTimeSec === null && limit.rhythmBoundaryOwners.length === 0
    && owner.acceptedTimeSec === acceptedTimeSec && owner.state.windowControl !== null
    && sameControl(owner.state.windowControl, owner.state.desiredControl)
    && limit.candidateTimeSec < windowEnd - tolerance;
}

/** Stages component-admitted ordinary owners into a caller-owned candidate.
 * Never promotes, retains accepted numerical state, or finalizes a public trial.
 * The caller must admit its other owners and promote the whole image atomically. */
export function stageMainWireTypedOrdinaryCandidateV1<TResult>(input: Readonly<{
  current: TransactionalTypedStateCurrentCursorV1; candidate: TransactionalTypedStateCandidateCursorV1;
  boundary: MainWireAcceptedTypedBoundaryBindingV1; hemodynamics: MainWireAcceptedTypedHemodynamicBindingV1;
  targetTimeSec: number; limit: MainWireIntegratedModelCandidateTimeLimitV3; configuration: AcceptedComposedRhythmTransactionConfigurationV2;
  provider: MainWireNormalAdultFiveWallProviderV1;
  template: MainWireFiveWallCoronaryAcceptedStateV2<WallState>; scratch: Float64Array;
  autoregulation: Owner; step: Omit<MainWireFiveWallCoronaryStepInputV3, "dtSec">;
  newtonWorkspace: MainWireFiveWallCoupledNewtonShadowWorkspaceV1;
  residualWorkspace: MainWireFiveWallCoupledResidualWorkspaceV1;
  predictor?: MainWireFiveWallCoupledCandidateSolveOptionsV1["predictor"];
  onSolverDiagnostics?: (diagnostics: MainWireFiveWallCoupledSolveDiagnosticsV1) => void;
}>, consume: (candidate: MainWireFiveWallCoupledAcceptedCandidateBorrowV1<WallState>,
  previous: MainWireFiveWallCoronaryAcceptedStateV2<WallState>) => TResult) {
  const { current, candidate, boundary, configuration } = input;
  const before = readMainWireAcceptedTypedClockV1(current, boundary);
  if (input.targetTimeSec !== input.limit.candidateTimeSec
    || !isMainWireTypedOrdinaryCandidateV1(before.acceptedTimeSec, input.limit, configuration, input.autoregulation)) {
    throw new Error("Typed ordinary candidate requires a resolved ordinary boundary");
  }
  const clock = stageMainWireAcceptedTypedClockCandidateV1(current, candidate, boundary, input.targetTimeSec);
  const calciumDriveOverride = stageMainWireAcceptedTypedCalciumCandidateV1(current, candidate, boundary,
    input.targetTimeSec, configuration.calciumParametersByWall);
  stageMainWireAcceptedTypedAuthoredScheduleCandidateV1(current, candidate, boundary, input.targetTimeSec, configuration);
  stageMainWireAcceptedTypedRegularAtrialCandidateV1(current, candidate, boundary, input.targetTimeSec, configuration, null);
  const previous = materializeMainWireAcceptedTypedCoupledSolverAdapterV1(current, input.hemodynamics, input.template, input.scratch);
  const step = { ...input.step, dtSec: input.targetTimeSec - before.acceptedTimeSec, calciumDriveOverride };
  const solved = solveMainWireFiveWallCoupledCandidateV1(input.provider, previous, step, input.newtonWorkspace, {
    residualWorkspace: input.residualWorkspace, predictor: input.predictor,
    previousAcceptedNumericalSource: createMainWireAcceptedTypedNonCoronaryNumericalSourceV1(current, boundary),
  });
  input.onSolverDiagnostics?.(solved.diagnostics);
  if (solved.status !== "converged" || solved.solver.result.status !== "converged") {
    throw new Error("Typed ordinary coupled solve failed");
  }
  let predictorTicket: MainWireFiveWallCoupledPredictorPromotionV1 | null = null;
  try {
    if (input.predictor !== undefined) predictorTicket = stageAcceptedMainWireFiveWallCoupledSolutionV1(
      solved.context, solved.solver.result.solution, input.predictor.workspace);
    const value = solved.context.withConvergedCandidate(solved.solver.result.solution, borrowed => {
      borrowed.assertCurrent();
      stageMainWireAcceptedTypedCoupledCandidateV1(candidate, input.hemodynamics, borrowed, input.scratch);
      const regulation = advanceMainWireFiveWallCoronaryAutoregulationOwnerFromPackedV3(input.autoregulation,
        step, borrowed.candidateTimeSec, borrowed.candidateRevision, borrowed.coronaryAutoregulationHydraulicObservables);
      if (regulation.completedWindow !== null
        || !sameControl(input.autoregulation.state.windowControl, regulation.nextState.windowControl)
        || !sameControl(input.autoregulation.state.desiredControl, regulation.nextState.desiredControl)
        || regulation.hydraulicToneUsed !== input.autoregulation.toneResistanceScaleByTerritoryLayer
        || regulation.nextToneResistanceScaleByTerritoryLayer !== input.autoregulation.toneResistanceScaleByTerritoryLayer) {
        throw new Error("Typed ordinary autoregulation crossed a discrete boundary");
      }
      stageMainWireAcceptedTypedOrdinaryPostSolverCandidateV1(current, candidate, boundary, clock, regulation.nextState);
      return consume(borrowed, previous);
    });
    return { clock, value, predictorTicket, diagnostics: solved.diagnostics };
  } catch (error) { predictorTicket?.discard(); throw error; }
}

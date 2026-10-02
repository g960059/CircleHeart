import {
  evaluateDynamicMechanicalSupportHydraulicsV1,
} from "@/engine/devices/dynamicNetworkV1";
import {
  mainWireFiveWallCoronaryBaseStateV2,
  promoteMainWireFiveWallCoronaryBaseStepV3,
  type MainWireFiveWallCoronaryStepInputV3,
} from "@/engine/myocardium/MainWireFiveWallCoronaryTransactionV3";
import {
  prepareMainWireFiveWallCoupledResidualContextV1,
  type MainWireFiveWallCoupledAcceptedCandidateBorrowV1,
  type MainWireFiveWallCoronaryAcceptedStateV2,
  type MainWireFiveWallCoronaryStepInputV2,
  type MainWireFiveWallCoronaryStepSuccessV2,
  type MainWireFiveWallCoupledResidualWorkspaceV1,
} from "@/engine/myocardium/MainWireFiveWallCoronaryTransactionV2";
import {
  stepMainWireIntegratedModelWithCoronaryExecutorV3,
  type MainWireIntegratedModelAcceptedStateV3,
  type MainWireIntegratedModelStepInputV3,
  type MainWireIntegratedModelStepResultV3,
} from "@/engine/myocardium/MainWireIntegratedModelTransactionV3";
import type {
  NonCoronaryAcceptedNumericalSourceV1,
} from "@/engine/core/nonCoronaryCirculationBackwardEulerV1";
import type {
  MainWireFiveWallFreeCalciumDriveV1,
} from "@/engine/myocardium/mechanics/MainWireFiveWallLandTriSegProviderV1";
import type {
  WholeHeartMechanicsProviderV1,
} from "@/engine/myocardium/wholeHeartMechanicsContractV1";
import {
  createMainWireFiveWallCoupledNewtonShadowWorkspaceV1,
  resolveMainWireFiveWallCoupledSolveLayoutV1,
  solveMainWireFiveWallCoupledNewtonPredictedV1,
  solveMainWireFiveWallCoupledNewtonShadowV1,
  summarizeMainWireFiveWallCoupledSolveWorkV1,
  type MainWireFiveWallCoupledNewtonShadowOptionsV1,
  type MainWireFiveWallCoupledNewtonShadowResultV1,
  type MainWireFiveWallCoupledNewtonShadowWorkspaceV1,
  type MainWireFiveWallCoupledPredictedSolveResultV1,
  type MainWireFiveWallCoupledSolveWorkV1,
} from "@/engine/vnext/coupled/MainWireFiveWallCoupledNewtonShadowV1";
import {
  stageAcceptedMainWireFiveWallCoupledSolutionV1,
  type MainWireFiveWallCoupledPredictionOrderV1,
  type MainWireFiveWallCoupledPredictorWorkspaceV1,
  type MainWireFiveWallCoupledPredictorPromotionV1,
} from "@/engine/vnext/coupled/MainWireFiveWallCoupledPredictorV1";
import type {
  MainWireFiveWallCoupledResidualContextV1,
} from "@/engine/myocardium/MainWireFiveWallCoronaryTransactionV2";

export const MAIN_WIRE_INTEGRATED_COUPLED_STEP_V1_ID =
  "main-wire-integrated-static-condensed-coupled-step-v1" as const;

export type MainWireIntegratedCoupledStepOptionsV1<TWallState> = Readonly<{
  solver?: MainWireFiveWallCoupledNewtonShadowOptionsV1;
  residualWorkspace?: MainWireFiveWallCoupledResidualWorkspaceV1;
  /**
   * Live read seam over the admitted typed image. The component solver
   * compares every value exactly with its rollback object before use.
   */
  previousAcceptedNumericalSource?: NonCoronaryAcceptedNumericalSourceV1;
  /**
   * Private adapter reconstructed from the sole typed accepted image. It lets
   * the component equations stop reading the retained public object graph
   * before the outer rhythm/device promotion is migrated.
   */
  previousCoupledAcceptedAdapter?:
    MainWireFiveWallCoronaryAcceptedStateV2<TWallState>;
  /**
   * Synchronous migration seam into the global inactive typed image. The
   * borrow is context-owned and must not escape this callback.
   */
  onConvergedCandidate?: (
    candidate: MainWireFiveWallCoupledAcceptedCandidateBorrowV1<TWallState>,
  ) => void;
  onAcceptedBaseStep?: (
    step: MainWireFiveWallCoronaryStepSuccessV2<TWallState>,
  ) => void;
  predictor?: MainWireFiveWallCoupledCandidateSolveOptionsV1["predictor"];
  /** Work on failed extrapolated attempts is included in these diagnostics. */
  onSolverDiagnostics?: (diagnostics: MainWireFiveWallCoupledSolveDiagnosticsV1) => void;
  /**
   * Emitted only after integrated hemodynamics succeeds. The outer owner must
   * discard on later rejection, or preflight/install around its own promotion.
   */
  onPredictorCandidate?: (ticket: MainWireFiveWallCoupledPredictorPromotionV1) => void;
}>;

export type MainWireFiveWallCoupledSolveDiagnosticsV1 = Readonly<{
  predictionMode: "disabled" | MainWireFiveWallCoupledPredictedSolveResultV1["predictionMode"];
  extrapolationScale: number;
  fallbackUsed: boolean;
  work: MainWireFiveWallCoupledSolveWorkV1;
}>;

export type MainWireFiveWallCoupledCandidateSolveOptionsV1 = Readonly<{
  solver?: MainWireFiveWallCoupledNewtonShadowOptionsV1;
  residualWorkspace?: MainWireFiveWallCoupledResidualWorkspaceV1;
  previousAcceptedNumericalSource?: NonCoronaryAcceptedNumericalSourceV1;
  predictor?: Readonly<{
    workspace: MainWireFiveWallCoupledPredictorWorkspaceV1;
    order: MainWireFiveWallCoupledPredictionOrderV1;
  }>;
}>;

export type MainWireFiveWallCoupledCandidateSolveV1<TWallState> =
  | Readonly<{
    status: "converged";
    context: MainWireFiveWallCoupledResidualContextV1<TWallState>;
    solver: MainWireFiveWallCoupledNewtonShadowResultV1;
    diagnostics: MainWireFiveWallCoupledSolveDiagnosticsV1;
  }>
  | Readonly<{
    status: "failed";
    solver: MainWireFiveWallCoupledNewtonShadowResultV1;
    diagnostics: MainWireFiveWallCoupledSolveDiagnosticsV1;
  }>;

/**
 * Solves and component-admits the 30-volume candidate without constructing a
 * public coronary or integrated AcceptedState. A typed owner may synchronously
 * borrow the converged component through `context.withConvergedCandidate` and
 * promote its own inactive image; legacy/event paths may instead call the
 * one-shot public finalizer on the returned context.
 */
export function solveMainWireFiveWallCoupledCandidateV1<TWallState>(
  provider: WholeHeartMechanicsProviderV1<
    TWallState,
    MainWireFiveWallFreeCalciumDriveV1
  >,
  previous: MainWireFiveWallCoronaryAcceptedStateV2<TWallState>,
  input: MainWireFiveWallCoronaryStepInputV2,
  workspace: MainWireFiveWallCoupledNewtonShadowWorkspaceV1 =
    createMainWireFiveWallCoupledNewtonShadowWorkspaceV1(),
  options: MainWireFiveWallCoupledCandidateSolveOptionsV1 = Object.freeze({}),
): MainWireFiveWallCoupledCandidateSolveV1<TWallState> {
  assertBaseDeviceOff(input);
  const context = prepareMainWireFiveWallCoupledResidualContextV1(
    provider,
    previous,
    input,
    options.previousAcceptedNumericalSource,
    options.residualWorkspace,
    resolveMainWireFiveWallCoupledSolveLayoutV1(workspace),
  );
  const solverOptions = Object.freeze({
    ...options.solver,
    analyticJacobianPolicy: "require-complete" as const,
  });
  const predicted = options.predictor === undefined ? undefined
    : solveMainWireFiveWallCoupledNewtonPredictedV1(
      context,
      solverOptions,
      workspace,
      options.predictor.workspace,
      options.predictor.order,
    );
  const solver = predicted?.solver ?? solveMainWireFiveWallCoupledNewtonShadowV1(context, solverOptions, workspace);
  const diagnostics: MainWireFiveWallCoupledSolveDiagnosticsV1 = Object.freeze({
    predictionMode: predicted?.predictionMode ?? "disabled",
    extrapolationScale: predicted?.extrapolationScale ?? 0,
    fallbackUsed: predicted?.fallbackUsed ?? false,
    work: predicted?.work ?? summarizeMainWireFiveWallCoupledSolveWorkV1(solver),
  });
  return solver.result.status === "converged"
    ? Object.freeze({ status: "converged" as const, context, solver, diagnostics })
    : Object.freeze({ status: "failed" as const, solver, diagnostics });
}

/**
 * Device-off vertical slice for the 30-volume statically condensed solver.
 * The nonlinear candidate is component-admitted before the callback runs;
 * V3 autoregulation, rhythm, dynamic-device validation, and outer promotion
 * continue through their existing owners.
 */
export function stepMainWireIntegratedModelCoupledV1<TWallState>(
  provider: WholeHeartMechanicsProviderV1<
    TWallState,
    MainWireFiveWallFreeCalciumDriveV1
  >,
  previous: MainWireIntegratedModelAcceptedStateV3<TWallState>,
  input: MainWireIntegratedModelStepInputV3,
  workspace: MainWireFiveWallCoupledNewtonShadowWorkspaceV1 =
    createMainWireFiveWallCoupledNewtonShadowWorkspaceV1(),
  options: MainWireIntegratedCoupledStepOptionsV1<TWallState> =
    Object.freeze({}),
): MainWireIntegratedModelStepResultV3<TWallState> {
  let predictorTicket: MainWireFiveWallCoupledPredictorPromotionV1 | undefined;
  const result = stepMainWireIntegratedModelWithCoronaryExecutorV3(
    previous,
    input,
    (coronaryPrevious, coronaryInput) => {
      assertDeviceOff(coronaryInput);
      const {
        dynamicMechanicalSupport,
        coronaryAutoregulationDrive: _autoregulationDrive,
        ...baseInput
      } = coronaryInput;
      const solved = solveMainWireFiveWallCoupledCandidateV1(
        provider,
        options.previousCoupledAcceptedAdapter
          ?? mainWireFiveWallCoronaryBaseStateV2(coronaryPrevious),
        baseInput as MainWireFiveWallCoronaryStepInputV2,
        workspace,
        Object.freeze({
          solver: options.solver,
          residualWorkspace: options.residualWorkspace,
          previousAcceptedNumericalSource:
            options.previousAcceptedNumericalSource,
          predictor: options.predictor,
        }),
      );
      options.onSolverDiagnostics?.(solved.diagnostics);
      if (solved.status === "failed") {
        const failure = solved.solver.result;
        if (failure.status !== "failed") {
          throw new Error("coupled solve status/result drifted");
        }
        throw new Error(
          "statically condensed coupled solve failed: "
            + `${failure.reason}: ${failure.message}`,
        );
      }
      const { context, solver } = solved;
      const solverResult = solver.result;
      if (solverResult.status !== "converged") {
        throw new Error("coupled converged solve status/result drifted");
      }
      if (options.predictor !== undefined && options.onPredictorCandidate !== undefined) {
        predictorTicket = stageAcceptedMainWireFiveWallCoupledSolutionV1(
          context, solverResult.solution, options.predictor.workspace,
        );
      }
      if (options.onConvergedCandidate !== undefined) {
        context.withConvergedCandidate(
          solverResult.solution,
          options.onConvergedCandidate,
        );
      }
      const baseStep = context.finalizeConvergedSolution(
        solverResult.solution,
        Object.freeze({
          iterations: solverResult.iterations,
          lineSearchBacktracks: solverResult.lineSearchBacktrackCount,
        }),
      );
      if (baseStep.converged && options.onAcceptedBaseStep !== undefined) {
        options.onAcceptedBaseStep(baseStep);
      }
      const coronaryStep = promoteMainWireFiveWallCoronaryBaseStepV3(
        coronaryPrevious,
        coronaryInput,
        baseStep,
      );
      if (coronaryStep.converged === false) {
        return Object.freeze({ coronaryStep });
      }
      const dynamicMechanicalSupportTrial =
        evaluateDynamicMechanicalSupportHydraulicsV1(
          dynamicMechanicalSupport.config,
          dynamicMechanicalSupport.profile,
          dynamicMechanicalSupport.previousAcceptedState,
          dynamicHydraulicInput(
            coronaryStep,
            coronaryInput,
            dynamicMechanicalSupport.heartRateBpm,
          ),
        );
      return Object.freeze({
        coronaryStep,
        dynamicMechanicalSupportTrial,
      });
    },
  );
  if (predictorTicket !== undefined) {
    if (result.converged) options.onPredictorCandidate!(predictorTicket);
    else predictorTicket.discard();
  }
  return result;
}

function assertDeviceOff(input: MainWireFiveWallCoronaryStepInputV3): void {
  const dynamic = input.dynamicMechanicalSupport;
  if (
    dynamic === undefined
    || dynamic.config.lvad.enabled
    || dynamic.config.impella.enabled
    || dynamic.config.vaEcmo.enabled
    || dynamic.config.vvEcmo.enabled
    || dynamic.config.iabp.enabled
    || input.mechanicalSupport !== undefined
    || input.protocolResistanceScaleByEdge !== undefined
  ) {
    throw new Error(
      "statically condensed integrated step supports only the device-off slice",
    );
  }
}

function assertBaseDeviceOff(
  input: MainWireFiveWallCoronaryStepInputV2,
): void {
  if (
    input.mechanicalSupport !== undefined
    || input.dynamicMechanicalSupport !== undefined
    || input.protocolResistanceScaleByEdge !== undefined
  ) {
    throw new Error(
      "statically condensed coupled candidate supports only the device-off slice",
    );
  }
}

function dynamicHydraulicInput<TWallState>(
  step: Extract<
    ReturnType<typeof promoteMainWireFiveWallCoronaryBaseStepV3<TWallState>>,
    { converged: true }
  >,
  input: MainWireFiveWallCoronaryStepInputV3,
  heartRateBpm: number,
) {
  const candidateTimeSec = step.acceptedState.acceptedTimeSec;
  const beatPosition = candidateTimeSec * heartRateBpm / 60;
  if (!Number.isFinite(beatPosition) || heartRateBpm <= 0) {
    throw new RangeError("dynamic-device timing must be positive and finite");
  }
  const beatIndex = Math.floor(beatPosition);
  const pressure = step.baseStep.circulationTrial.nodeAbsolutePressuresMmHg;
  const volume = step.baseStep.circulationTrial.candidateNodeVolumesMl;
  return Object.freeze({
    dtSec: input.dtSec,
    timeSec: candidateTimeSec,
    cyclePhase01: beatPosition - beatIndex,
    beatIndex,
    heartRateBpm,
    nodeAbsolutePressureMmHg: Object.freeze({
      LV: pressure.LV,
      Ao: pressure.Ao,
      SA: pressure.SA,
      RA: pressure.RA,
      VC: pressure.VC,
    }),
    nodeVolumeMl: Object.freeze({
      LV: volume.LV,
      Ao: volume.Ao,
      SA: volume.SA,
      RA: volume.RA,
      VC: volume.VC,
    }),
  });
}

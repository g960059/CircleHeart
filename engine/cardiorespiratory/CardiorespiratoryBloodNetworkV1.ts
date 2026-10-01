import { buildNonCoronaryCirculationGraphV1 } from "@/engine/core/nonCoronaryCirculationBackwardEulerV1";
import type { MainWireIntegratedModelAcceptedStateV3, MainWireIntegratedModelStepSuccessV3 }
  from "@/engine/myocardium/MainWireIntegratedModelTransactionV3";
import type { MainWireNormalAdultFiveWallMechanicsStateV1 } from "@/engine/myocardium/experiments/MainWireNormalAdultFiveWallClosedLoopV1";

type State = MainWireIntegratedModelAcceptedStateV3<MainWireNormalAdultFiveWallMechanicsStateV1>;
type Step = MainWireIntegratedModelStepSuccessV3<MainWireNormalAdultFiveWallMechanicsStateV1>;
const graph = buildNonCoronaryCirculationGraphV1();

/** These are physical blood stores, including unstressed vascular volume and
 * both compliant arterial roots. Device displacement is never a blood store. */
export function cardiorespiratoryPhysicalBloodVolumesV1(state: State): Record<string, number> {
  return { ...state.coronary.circulation.nodeVolumesMl,
    ...state.coronary.coronary.volumeMlByNode };
}

/** BE continuity uses right-endpoint signed flow, not beat trapezoids. */
export function cardiorespiratoryAcceptedBloodTransfersV1(step: Step) {
  const dt = step.coronaryStep.baseStep.circulationTrial.dtSec;
  const transfers = graph.edges.map(edge => ({ from: edge.up, to: edge.down,
    volumeMl: dt * step.coronaryStep.baseStep.circulationTrial.edgeFlowsMlPerSec[edge.name] }));
  for (const [edge, flow] of Object.entries(step.coronaryStep.baseStep.coronaryTrial.diagnostics.hydraulics.signedFlowMlPerSecByEdge)) {
    const [from, to] = edge.split("_");
    if (!from || !to) throw new Error("Invalid coronary transport incidence");
    transfers.push({ from, to, volumeMl: dt * flow });
  }
  return transfers;
}

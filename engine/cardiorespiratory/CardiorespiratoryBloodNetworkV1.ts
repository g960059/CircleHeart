import { buildNonCoronaryCirculationGraphV1, NON_CORONARY_EDGE_NAMES_V1, NON_CORONARY_NODE_NAMES_V1 }
  from "@/engine/core/nonCoronaryCirculationBackwardEulerV1";
import { CORONARY_CONSERVED_VOLUME_NODE_IDS_V2, CORONARY_EDGE_IDS_V2 } from "@/engine/coronary/typesV2";
import type { MainWireFiveWallCoronaryAcceptedStateV2, MainWireFiveWallCoupledAcceptedCandidateBorrowV1 }
  from "@/engine/myocardium/MainWireFiveWallCoronaryTransactionV2";
import type { AcceptedFluidTransferV1 } from "./ConservativeGasTransportV1";
import type { MainWireIntegratedModelAcceptedStateV3, MainWireIntegratedModelStepSuccessV3 }
  from "@/engine/myocardium/MainWireIntegratedModelTransactionV3";
import type { MainWireNormalAdultFiveWallMechanicsStateV1 } from "@/engine/myocardium/experiments/MainWireNormalAdultFiveWallClosedLoopV1";

type State = MainWireIntegratedModelAcceptedStateV3<MainWireNormalAdultFiveWallMechanicsStateV1>;
type Step = MainWireIntegratedModelStepSuccessV3<MainWireNormalAdultFiveWallMechanicsStateV1>;
const graph = buildNonCoronaryCirculationGraphV1();
const nonCoronaryTransportEdges = graph.edges.map(edge => {
  const index = NON_CORONARY_EDGE_NAMES_V1.findIndex(name => name === edge.name);
  if (index < 0) throw new Error("Invalid noncoronary transport edge order");
  return { from: edge.up, to: edge.down, index };
});
const coronaryTransportEdges = CORONARY_EDGE_IDS_V2.map(edge => {
  const [from, to] = edge.split("_");
  if (!from || !to) throw new Error("Invalid coronary transport incidence");
  return { from, to };
});
const capillaryIndex = NON_CORONARY_NODE_NAMES_V1.indexOf("PCap");
const pulmonaryVenousIndex = NON_CORONARY_NODE_NAMES_V1.indexOf("PVen");
const aorticValveIndex = NON_CORONARY_EDGE_NAMES_V1.indexOf("AoV");

/** These are physical blood stores, including unstressed vascular volume and
 * both compliant arterial roots. Device displacement is never a blood store. */
export function cardiorespiratoryPhysicalBloodVolumesV1(state: State): Record<string, number> {
  return cardiorespiratoryPhysicalBloodVolumesFromCoupledStateV1(state.coronary);
}

/** Also accepts the private solver adapter reconstructed from typed authority. */
export function cardiorespiratoryPhysicalBloodVolumesFromCoupledStateV1<T>(
  state: Pick<MainWireFiveWallCoronaryAcceptedStateV2<T>, "circulation" | "coronary">,
): Record<string, number> {
  return { ...state.circulation.nodeVolumesMl, ...state.coronary.volumeMlByNode };
}

export type CardiorespiratoryBorrowedBloodNetworkV1 = Readonly<{
  physicalBloodVolumesMl: Record<string, number>;
  transfers: AcceptedFluidTransferV1[];
  pulmonaryCapillaryPressureMmHg: number;
  pulmonaryVenousPressureMmHg: number;
  aorticFlowMlSec: number;
}>;

/** Copies only the component-admitted physical volumes and right-endpoint
 * signed flows needed by gas transport. No observer quadrature or trial graph. */
export function cardiorespiratoryBorrowedBloodNetworkV1<T>(
  candidate: MainWireFiveWallCoupledAcceptedCandidateBorrowV1<T>,
): CardiorespiratoryBorrowedBloodNetworkV1 {
  candidate.assertCurrent();
  const dt = candidate.stepDtSec;
  if (!Number.isFinite(dt) || dt <= 0) throw new RangeError("Invalid borrowed blood transport step");
  for (const [values, count] of [[candidate.nonCoronaryNodeVolumesMl, NON_CORONARY_NODE_NAMES_V1.length],
    [candidate.nonCoronaryNodeAbsolutePressuresMmHg, NON_CORONARY_NODE_NAMES_V1.length],
    [candidate.nonCoronaryEdgeFlowsMlPerSec, NON_CORONARY_EDGE_NAMES_V1.length],
    [candidate.coronarySignedEdgeFlowsMlPerSec, CORONARY_EDGE_IDS_V2.length]] as const) {
    if (!(values instanceof Float64Array) || values.length !== count || values.some(value => !Number.isFinite(value))) {
      throw new RangeError("Invalid borrowed blood transport vector");
    }
  }
  const volumes: Record<string, number> = {};
  NON_CORONARY_NODE_NAMES_V1.forEach((node, index) => { volumes[node] = candidate.nonCoronaryNodeVolumesMl[index]!; });
  for (const node of CORONARY_CONSERVED_VOLUME_NODE_IDS_V2) volumes[node] = candidate.coronaryVolumesMl[node];
  if (Object.values(volumes).some(value => !Number.isFinite(value) || value < 0)) throw new RangeError("Invalid borrowed physical blood volume");
  const transfers = nonCoronaryTransportEdges.map(edge => ({ from: edge.from, to: edge.to,
    volumeMl: dt * candidate.nonCoronaryEdgeFlowsMlPerSec[edge.index]! }));
  coronaryTransportEdges.forEach((edge, index) => transfers.push({ ...edge,
    volumeMl: dt * candidate.coronarySignedEdgeFlowsMlPerSec[index]! }));
  candidate.assertCurrent();
  return { physicalBloodVolumesMl: volumes, transfers,
    pulmonaryCapillaryPressureMmHg: candidate.nonCoronaryNodeAbsolutePressuresMmHg[capillaryIndex]!,
    pulmonaryVenousPressureMmHg: candidate.nonCoronaryNodeAbsolutePressuresMmHg[pulmonaryVenousIndex]!,
    aorticFlowMlSec: candidate.nonCoronaryEdgeFlowsMlPerSec[aorticValveIndex]! };
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

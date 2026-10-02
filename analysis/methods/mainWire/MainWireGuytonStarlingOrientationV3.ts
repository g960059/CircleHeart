import {
  buildNonCoronaryCirculationGraphV1,
} from "@/engine/core/nonCoronaryCirculationBackwardEulerV1";
import type { MainWireStaticCaseAnatomyV1 } from "@/engine/myocardium/mechanics/MainWireStaticCaseAnatomyV1";

import {
  nonValveEdgeLossV1,
  vascularPvLawFromNodeV1,
  vascularTransmuralPressureFromPhysicalVolumeV1,
} from "@/engine/core/circulationGraphKernelV1";
import { smoothMax } from "@/engine/math";
import { evaluateParallelPulmonaryPathsV1, type ParallelPulmonaryPathsV1 } from "@/engine/core/ParallelPulmonaryPathsV1";
import type { MAIN_WIRE_FIXED_TONE_SETTLEMENT_V2, MainWireFixedToneSettlementEvidenceV2 } from "./MainWireFixedToneSettlementV2";
import type {
  MainWireIntegratedModelHemodynamicResearchInputsV3,
} from "@/engine/myocardium/MainWireIntegratedModelHemodynamicResearchInputsV3";
import type {
  MainWireIntegratedModelObservationV3,
} from "@/engine/myocardium/MainWireIntegratedModelSessionV3";
import {
  MAIN_WIRE_INTEGRATED_MODEL_GUYTON_STARLING_ORIENTATION_V3_ID,
} from "@/analysis/methods/mainWire/MainWireStructuralAnalysisContractV3";
import {
  complianceFromPtm,
  stressedVolumeFromPtm,
  type VascularPvLaw,
} from "@/engine/vascularPv";

export {
  MAIN_WIRE_INTEGRATED_MODEL_GUYTON_STARLING_ORIENTATION_V3_ID,
} from "@/analysis/methods/mainWire/MainWireStructuralAnalysisContractV3";

export const MAIN_WIRE_INTEGRATED_MODEL_STRUCTURAL_RETURN_SEMANTICS_V3 =
  "frozen-accepted-step-volume-constrained-structural-orientation-not-simulated-response" as const;

export const MAIN_WIRE_INTEGRATED_MODEL_STARLING_PROTOCOL_REQUIREMENT_V3 =
  "persistent-fixed-tone-preload-reduction-chain-with-complete-beat-period1-settlement" as const;

export type MainWireIntegratedModelGuytonSideV3 = "right" | "left";

export type MainWireIntegratedModelGuytonPointV3 = Readonly<{
  downstreamPressureMmHg: number;
  returnFlowLPerMin: number;
  flowLimited: boolean;
}>;

export type MainWireIntegratedModelPressureVolumeLoopPointV3 = Readonly<{
  volumeMl: number;
  pressureMmHg: number;
  /** Normalized atrial-capture phase; legacy responsive preview points may omit it. */
  phase01?: number;
}>;

export type MainWireIntegratedModelStarlingPointV3 = Readonly<{
  /** Present only when this measured interval passed reservoir closure. */
  settlementEvidence?: MainWireFixedToneSettlementEvidenceV2;
  totalBloodVolumeMl: number;
  fillingPressureMmHg: number;
  cardiacOutputLPerMin: number;
  role: "operating-anchor" | "continuation";
  quality:
    | "locally-converged"
    | "adaptive-preview"
    | "convergence-cap"
    | "period-2-boundary";
  curveEligible: boolean;
  completedBeatCount: number;
  maximumNormalizedBeatDelta: number;
  settled: boolean;
  finiteAndFixedTbvPassed: true;
  evidence:
    | "responsive-preview"
    | "responsive-settled-anchor"
    | "qualified-periodic"
    | "fixed-tone-periodic";
  measurementWindowStatus:
    | "complete-beat-converged"
    | "complete-beat-preview"
    | "complete-beat-cap"
    | "period-2-detected"
    | "responsive-period1-settled"
    | "canonical-period1-qualified"
    | "fixed-tone-period1-settled";
  acceptedMeasurementDurationSec: number;
  /** Exact accepted-step path work from the retained completed beat. */
  acceptedTransmuralPathWorkMmHgMl?: number;
  /** Exact duration of the retained completed beat. */
  acceptedBeatDurationSec?: number;
  /** Last complete analysis beat sampled from the fixed-TBV branch. */
  ventricularPressureVolumeLoop:
    readonly MainWireIntegratedModelPressureVolumeLoopPointV3[];
  ventricularPressureVolumeLandmarks: Readonly<{
    pressureBasis: "transmural";
    endDiastolic: Readonly<{
      volumeMl: number;
      pressureMmHg: number;
      event: "maximum-volume";
    }>;
    endSystolic: Readonly<{
      volumeMl: number;
      pressureMmHg: number;
      event: "semilunar-valve-closure" | "minimum-volume-fallback";
    }>;
  }>;
}>;

export type MainWireIntegratedModelStarlingLocusV3 =
  (Readonly<{
      status: "requires-protocol";
      requirement:
        typeof MAIN_WIRE_INTEGRATED_MODEL_STARLING_PROTOCOL_REQUIREMENT_V3;
      points: readonly [];
    }>
  | Readonly<{
      status: "responsive-fixed-tbv-preview";
      protocolId: string;
      warmupDurationSec: number;
      measurementDurationSec: number;
      minimumBeatCount: number;
      maximumBeatCount: number;
      slowControllerPolicy: "coronary-tone-frozen-at-branch-source";
      completedPointCount: number;
      totalPointCount: number;
      points: readonly MainWireIntegratedModelStarlingPointV3[];
    }>
  | Readonly<{
      status: "measured-fixed-tbv-protocol";
      protocolId: string;
      requirement:
        typeof MAIN_WIRE_INTEGRATED_MODEL_STARLING_PROTOCOL_REQUIREMENT_V3;
      minimumBeatCount: number;
      maximumBeatCount: number;
      completedPointCount: number;
      totalPointCount: number;
      slowControllerPolicy:
        "active-source-period1-then-coronary-tone-frozen";
      convergencePolicy:
        "complete-beat-output-period1-closure" | "complete-beat-output-and-reservoir-period1-closure";
      settlementPolicy?: typeof MAIN_WIRE_FIXED_TONE_SETTLEMENT_V2;
      points: readonly (MainWireIntegratedModelStarlingPointV3 & Readonly<{
        quality: "locally-converged";
        curveEligible: true;
        settled: true;
        evidence: "fixed-tone-periodic";
        measurementWindowStatus: "fixed-tone-period1-settled";
      }>)[];
    }>) & Readonly<{
      /** Exact construction provenance supplied by an anatomy-bearing owner. */
      exactAnatomy?: MainWireStaticCaseAnatomyV1;
    }>;

export type MainWireIntegratedModelStructuralReturnOrientationV3 = Readonly<{
  side: MainWireIntegratedModelGuytonSideV3;
  semantics:
    typeof MAIN_WIRE_INTEGRATED_MODEL_STRUCTURAL_RETURN_SEMANTICS_V3;
  pressureBasis: "absolute";
  sourceAcceptedRevision: number;
  sourceAcceptedTimeSec: number;
  downstreamNode: "RA" | "LA";
  downstreamPressureLabel: "RAP" | "LAP";
  fillingPressureLabel: "Pmsf orientation" | "Pmpf orientation";
  fillingPressureMmHg: number;
  operatingPoint: Readonly<{
    downstreamPressureMmHg: number;
    returnFlowLPerMin: number;
    returnPath: "VC_RA+CS_RA" | "PVein_LA";
  }>;
  anchoring:
    | Readonly<{
        status: "starling-operating-anchor";
        method: "downstream-pressure-translation";
        downstreamPressureOffsetMmHg: number;
        volumeResidualMl: number;
      }>
    | Readonly<{
        status: "accepted-step-readback";
        method: "none";
        downstreamPressureOffsetMmHg: 0;
        volumeResidualMl: null;
      }>;
  curve: readonly MainWireIntegratedModelGuytonPointV3[];
  starlingLocus: MainWireIntegratedModelStarlingLocusV3;
  limitations: readonly string[];
}>;

export type MainWireIntegratedModelGuytonStarlingOrientationV3 =
  | Readonly<{
      analysisId:
        typeof MAIN_WIRE_INTEGRATED_MODEL_GUYTON_STARLING_ORIENTATION_V3_ID;
      status: "accepted-step-readback-required";
      sourceAcceptedRevision: number;
      sourceAcceptedTimeSec: number;
      right: null;
      left: null;
    }>
  | Readonly<{
      analysisId:
        typeof MAIN_WIRE_INTEGRATED_MODEL_GUYTON_STARLING_ORIENTATION_V3_ID;
      status: "available";
      sourceAcceptedRevision: number;
      sourceAcceptedTimeSec: number;
      right: MainWireIntegratedModelStructuralReturnOrientationV3;
      left: MainWireIntegratedModelStructuralReturnOrientationV3;
    }>;

type StructuralNodeV3 = Readonly<{
  name: string;
  externalPressureMmHg: number;
  stressedVolumeMl: number;
  complianceMlPerMmHg: number;
  law: VascularPvLaw;
}>;

type StructuralEdgeV3 = Readonly<{
  parallelPulmonaryPaths?: ParallelPulmonaryPathsV1;
  upstreamNode: string;
  resistanceMmHgSecPerMl: number;
  quadraticLossMmHgSec2PerMl2: number;
  waterfall: boolean;
  collapsePressureMmHg: number;
}>;

type StructuralPathV3 = Readonly<{
  nodes: readonly StructuralNodeV3[];
  edges: readonly StructuralEdgeV3[];
  totalStressedVolumeMl: number;
}>;

type StructuralAnchorV3 = Readonly<{
  downstreamPressureMmHg: number;
  returnFlowLPerMin: number;
}>;

const SYSTEMIC_NODE_PATH_V3 = Object.freeze([
  "VC", "SV", "Cap", "Art", "SA", "Ao",
] as const);
const SYSTEMIC_EDGE_PATH_V3 = Object.freeze([
  "VC_RA", "SV_VC", "Cap_SV", "Art_Cap", "SA_Art", "Ao_SA",
] as const);
const PULMONARY_NODE_PATH_V3 = Object.freeze([
  "PVein", "PVen", "PCap",
] as const);
const PULMONARY_EDGE_PATH_V3 = Object.freeze([
  "PVein_LA", "PVen_PVein", "PCap_PVen",
] as const);

const CURVE_SAMPLE_COUNT_V3 = 121;
const MAXIMUM_ORIENTATION_FLOW_ML_PER_SEC_V3 = 350;
const ROOT_TOLERANCE_ML_V3 = 1e-4;
const ANCHOR_VOLUME_TOLERANCE_ML_V3 = 1e-6;
const ANCHOR_PRESSURE_TOLERANCE_MMHG_V3 = 1e-12;
const MAXIMUM_ANCHOR_PRESSURE_OFFSET_MMHG_V3 = 160;

/**
 * Read-only side analysis of one exact accepted V3 step.
 *
 * The vascular-return curve freezes the current accepted volume ledger, PV
 * laws, external pressures, and local edge-loss coefficients. It then solves
 * the corresponding steady volume-constrained return map. It neither forks
 * nor advances the supplied numerical session and deliberately does not
 * manufacture a Frank-Starling response curve from one operating point.
 */
export function buildMainWireIntegratedModelGuytonStarlingOrientationV3(
  observation: MainWireIntegratedModelObservationV3,
  hemodynamicInputs: MainWireIntegratedModelHemodynamicResearchInputsV3,
  starlingLoci?: Readonly<Record<
    MainWireIntegratedModelGuytonSideV3,
    MainWireIntegratedModelStarlingLocusV3
  >>,
  parallelPulmonaryPaths?: ParallelPulmonaryPathsV1,
): MainWireIntegratedModelGuytonStarlingOrientationV3 {
  const accepted = observation.acceptedState;
  const step = observation.lastAcceptedStep;
  if (step === null) {
    return Object.freeze({
      analysisId:
        MAIN_WIRE_INTEGRATED_MODEL_GUYTON_STARLING_ORIENTATION_V3_ID,
      status: "accepted-step-readback-required" as const,
      sourceAcceptedRevision: accepted.revision,
      sourceAcceptedTimeSec: accepted.acceptedTimeSec,
      right: null,
      left: null,
    });
  }
  assertObservationPairV3(observation);
  return Object.freeze({
    analysisId:
      MAIN_WIRE_INTEGRATED_MODEL_GUYTON_STARLING_ORIENTATION_V3_ID,
    status: "available" as const,
    sourceAcceptedRevision: accepted.revision,
    sourceAcceptedTimeSec: accepted.acceptedTimeSec,
    right: buildSideOrientationV3(
      "right",
      observation,
      hemodynamicInputs,
      starlingLoci?.right,
      parallelPulmonaryPaths,
    ),
    left: buildSideOrientationV3(
      "left",
      observation,
      hemodynamicInputs,
      starlingLoci?.left,
      parallelPulmonaryPaths,
    ),
  });
}

function buildSideOrientationV3(
  side: MainWireIntegratedModelGuytonSideV3,
  observation: MainWireIntegratedModelObservationV3,
  hemodynamicInputs: MainWireIntegratedModelHemodynamicResearchInputsV3,
  starlingLocus?: MainWireIntegratedModelStarlingLocusV3,
  parallelPulmonaryPaths?: ParallelPulmonaryPathsV1,
): MainWireIntegratedModelStructuralReturnOrientationV3 {
  const accepted = observation.acceptedState;
  const circulation = observation.lastAcceptedStep!.coronaryStep.baseStep
    .circulationTrial;
  const path = structuralPathV3(side, observation, hemodynamicInputs, parallelPulmonaryPaths);
  const downstreamNode = side === "right" ? "RA" : "LA";
  const returnPath = side === "right" ? "VC_RA+CS_RA" : "PVein_LA";
  const acceptedDownstreamPressureMmHg =
    circulation.nodeAbsolutePressuresMmHg[downstreamNode];
  const acceptedReturnFlowLPerMin = side === "right"
    ? (
        circulation.edgeFlowsMlPerSec.VC_RA
        + observation.lastAcceptedStep!.coronaryStep.baseStep.coronaryTrial
          .diagnostics.hydraulics.commonCoronaryVenousOutletFlowMlPerSec
      ) * 60 / 1_000
    : circulation.edgeFlowsMlPerSec.PVein_LA * 60 / 1_000;
  const starlingAnchor = responsiveStarlingAnchorV3(starlingLocus);
  const downstreamPressureMmHg = starlingAnchor?.downstreamPressureMmHg
    ?? acceptedDownstreamPressureMmHg;
  const returnFlowLPerMin = starlingAnchor?.returnFlowLPerMin
    ?? acceptedReturnFlowLPerMin;
  const anchorCalibration = starlingAnchor === null
    ? null
    : calibrateStructuralPressureOffsetV3(path, starlingAnchor);
  const downstreamPressureOffsetMmHg =
    anchorCalibration?.downstreamPressureOffsetMmHg ?? 0;
  const fillingPressureMmHg = solveUniformFillingPressureV3(path)
    - downstreamPressureOffsetMmHg;
  const [domainMinimum, domainMaximum] = pressureDomainV3(
    side,
    downstreamPressureMmHg,
    fillingPressureMmHg,
  );
  const samplePressures = structuralCurveSamplePressuresV3(
    domainMinimum,
    domainMaximum,
    starlingAnchor?.downstreamPressureMmHg ?? null,
  );
  const curve = Object.freeze(samplePressures.map((pressureMmHg) =>
    starlingAnchor !== null
      && pressureMmHg === starlingAnchor.downstreamPressureMmHg
      ? Object.freeze({
          downstreamPressureMmHg: pressureMmHg,
          returnFlowLPerMin: starlingAnchor.returnFlowLPerMin,
          flowLimited: false,
        })
      : remapStructuralPressureV3(
          solveStructuralReturnAtPressureV3(
            path,
            pressureMmHg + downstreamPressureOffsetMmHg,
          ),
          pressureMmHg,
        )));
  return Object.freeze({
    side,
    semantics:
      MAIN_WIRE_INTEGRATED_MODEL_STRUCTURAL_RETURN_SEMANTICS_V3,
    pressureBasis: "absolute" as const,
    sourceAcceptedRevision: accepted.revision,
    sourceAcceptedTimeSec: accepted.acceptedTimeSec,
    downstreamNode,
    downstreamPressureLabel: side === "right" ? "RAP" : "LAP",
    fillingPressureLabel:
      side === "right" ? "Pmsf orientation" : "Pmpf orientation",
    fillingPressureMmHg,
    operatingPoint: Object.freeze({
      downstreamPressureMmHg,
      returnFlowLPerMin,
      returnPath,
    }),
    anchoring: anchorCalibration === null
      ? Object.freeze({
          status: "accepted-step-readback" as const,
          method: "none" as const,
          downstreamPressureOffsetMmHg: 0 as const,
          volumeResidualMl: null,
        })
      : Object.freeze({
          status: "starling-operating-anchor" as const,
          method: "downstream-pressure-translation" as const,
          downstreamPressureOffsetMmHg:
            anchorCalibration.downstreamPressureOffsetMmHg,
          volumeResidualMl: anchorCalibration.volumeResidualMl,
        }),
    curve,
    starlingLocus: starlingLocus ?? Object.freeze({
      status: "requires-protocol" as const,
      requirement:
        MAIN_WIRE_INTEGRATED_MODEL_STARLING_PROTOCOL_REQUIREMENT_V3,
      points: Object.freeze([] as const),
    }),
    limitations: Object.freeze([
      "Structural return orientation only; not a simulated pressure intervention.",
      "Edge losses and external pressures are frozen at the accepted step; inertance is omitted from the steady map.",
      side === "right"
        ? "The displayed systemic operating return includes VC-to-RA plus coronary-sinus return; the structural curve represents their effective aggregate."
        : "The pulmonary venous PCap-to-LA return path is shown.",
      starlingAnchor === null
        ? "The pressure coordinate is the exact accepted-step structural readback."
        : "The frozen-volume structural shape and positive edge losses are retained, while its pressure coordinate is translated to the complete-beat mean operating anchor.",
      starlingLocus?.status === "responsive-fixed-tbv-preview"
        ? "The operating anchor is locally period-1-settled in the frozen-tone responsive regime; off-centre Starling points remain adaptive preview data rather than canonical settled periodic evidence."
        : starlingLocus?.status === "measured-fixed-tbv-protocol"
          ? "The shared formal locus settles one active-controller source, freezes its coronary tone, and uses repeated complete-beat closure along hot-started TBV branches; it is numerical analysis, not physiological or clinical validation."
          : "A qualified Starling locus requires independent fixed-TBV V3 fixture forks, settlement, and numerical qualification at every point.",
    ]),
  });
}

function structuralPathV3(
  side: MainWireIntegratedModelGuytonSideV3,
  observation: MainWireIntegratedModelObservationV3,
  hemodynamicInputs: MainWireIntegratedModelHemodynamicResearchInputsV3,
  parallelPulmonaryPaths?: ParallelPulmonaryPathsV1,
): StructuralPathV3 {
  const graph = buildNonCoronaryCirculationGraphV1();
  const acceptedVolumes =
    observation.acceptedState.coronary.circulation.nodeVolumesMl;
  const readback = observation.lastAcceptedStep!.coronaryStep.baseStep
    .circulationTrial;
  const nodeNames = side === "right"
    ? SYSTEMIC_NODE_PATH_V3
    : PULMONARY_NODE_PATH_V3;
  const edgeNames = side === "right"
    ? SYSTEMIC_EDGE_PATH_V3
    : PULMONARY_EDGE_PATH_V3;
  const nodes = Object.freeze(nodeNames.map((name): StructuralNodeV3 => {
    const node = graph.nodes[graph.nodeIndex.get(name)!];
    const volumeMl = acceptedVolumes[name];
    const law = vascularPvLawFromNodeV1(node, hemodynamicInputs);
    const transmuralPressureMmHg =
      vascularTransmuralPressureFromPhysicalVolumeV1(
        node,
        volumeMl,
        hemodynamicInputs,
        "adaptive-volume-tolerance",
      );
    const externalPressureMmHg =
      readback.nodeAbsolutePressuresMmHg[name] - transmuralPressureMmHg;
    return Object.freeze({
      name,
      externalPressureMmHg,
      stressedVolumeMl: volumeMl - law.Vu,
      complianceMlPerMmHg:
        complianceFromPtm(law, transmuralPressureMmHg),
      law,
    });
  }));
  const nodeByName = new Map(nodes.map((node) => [node.name, node]));
  const edges = Object.freeze(edgeNames.map((name): StructuralEdgeV3 => {
    const edge = graph.edges[graph.edgeIndex.get(name)!];
    const externalPressureMmHg = edge.ext === "palv"
      ? nodeByName.get("PCap")?.externalPressureMmHg ?? 0
      : edge.ext === "pth"
        ? inferThoracicPressureV3(observation)
        : 0;
    const loss = nonValveEdgeLossV1({
      edge,
      params: hemodynamicInputs,
      upstreamPressureMmHg:
        readback.nodeAbsolutePressuresMmHg[edge.up],
      downstreamPressureMmHg:
        readback.nodeAbsolutePressuresMmHg[edge.down],
      edgeExternalPressureMmHg: externalPressureMmHg,
    });
    return Object.freeze({
      upstreamNode: edge.up,
      ...(name === "PCap_PVen" && parallelPulmonaryPaths ? { parallelPulmonaryPaths } : {}),
      resistanceMmHgSecPerMl: loss.resistanceMmHgSecPerMl,
      quadraticLossMmHgSec2PerMl2:
        loss.quadraticLossMmHgSec2PerMl2,
      waterfall: Boolean(edge.waterfall),
      collapsePressureMmHg:
        externalPressureMmHg + (edge.Pcrit ?? 0),
    });
  }));
  if (
    edges.length !== nodes.length
    || edges.some((edge, index) => edge.upstreamNode !== nodes[index]?.name)
  ) throw new Error("integrated V3 structural return path topology changed");
  const totalStressedVolumeMl = nodes.reduce(
    (sum, node) => sum + node.stressedVolumeMl,
    0,
  );
  if (!(totalStressedVolumeMl > 0)) {
    throw new Error("integrated V3 structural return path has no stressed volume");
  }
  return Object.freeze({ nodes, edges, totalStressedVolumeMl });
}

function inferThoracicPressureV3(
  observation: MainWireIntegratedModelObservationV3,
): number {
  const step = observation.lastAcceptedStep!;
  const absoluteRa = step.coronaryStep.baseStep.circulationTrial
    .nodeAbsolutePressuresMmHg.RA;
  const transmuralRa = step.coronaryStep.baseStep.mechanicsTrial
    .transmuralPressuresMmHg.RA;
  return absoluteRa - transmuralRa;
}

function solveUniformFillingPressureV3(path: StructuralPathV3): number {
  return bisectOrNearestV3(
    (pressureMmHg) => totalStressedVolumeAtUniformPressureV3(
      path,
      pressureMmHg,
    ) - path.totalStressedVolumeMl,
    -40,
    120,
    1e-7,
    96,
  );
}

function solveStructuralReturnAtPressureV3(
  path: StructuralPathV3,
  downstreamPressureMmHg: number,
): MainWireIntegratedModelGuytonPointV3 {
  const residual = (flowMlPerSec: number) =>
    totalStressedVolumeAtFlowV3(
      path,
      downstreamPressureMmHg,
      flowMlPerSec,
    ) - path.totalStressedVolumeMl;
  if (residual(0) >= 0) {
    return Object.freeze({
      downstreamPressureMmHg,
      returnFlowLPerMin: 0,
      flowLimited: false,
    });
  }
  if (residual(MAXIMUM_ORIENTATION_FLOW_ML_PER_SEC_V3) < 0) {
    return Object.freeze({
      downstreamPressureMmHg,
      returnFlowLPerMin:
        MAXIMUM_ORIENTATION_FLOW_ML_PER_SEC_V3 * 60 / 1_000,
      flowLimited: true,
    });
  }
  const flowMlPerSec = bisectOrNearestV3(
    residual,
    0,
    MAXIMUM_ORIENTATION_FLOW_ML_PER_SEC_V3,
    ROOT_TOLERANCE_ML_V3,
    80,
  );
  return Object.freeze({
    downstreamPressureMmHg,
    returnFlowLPerMin: flowMlPerSec * 60 / 1_000,
    flowLimited: false,
  });
}

function totalStressedVolumeAtUniformPressureV3(
  path: StructuralPathV3,
  absolutePressureMmHg: number,
): number {
  return path.nodes.reduce((sum, node) => sum + stressedVolumeFromPtm(
    node.law,
    absolutePressureMmHg - node.externalPressureMmHg,
  ), 0);
}

function totalStressedVolumeAtFlowV3(
  path: StructuralPathV3,
  downstreamPressureMmHg: number,
  flowMlPerSec: number,
): number {
  let currentDownstreamPressureMmHg = downstreamPressureMmHg;
  let totalStressedVolumeMl = 0;
  for (let index = 0; index < path.edges.length; index += 1) {
    const edge = path.edges[index]!;
    const node = path.nodes[index]!;
    const effectiveDownstreamPressureMmHg = edge.waterfall
      ? smoothMax(
          currentDownstreamPressureMmHg,
          edge.collapsePressureMmHg,
          0.25,
        )
      : currentDownstreamPressureMmHg;
    const upstreamPressureMmHg = edge.parallelPulmonaryPaths
      ? inverseParallelPulmonaryPressureV1(edge.parallelPulmonaryPaths, currentDownstreamPressureMmHg, flowMlPerSec)
      : effectiveDownstreamPressureMmHg
      + edge.resistanceMmHgSecPerMl * flowMlPerSec
      + edge.quadraticLossMmHgSec2PerMl2
        * flowMlPerSec * Math.abs(flowMlPerSec);
    totalStressedVolumeMl += stressedVolumeFromPtm(
      node.law,
      upstreamPressureMmHg - node.externalPressureMmHg,
    );
    currentDownstreamPressureMmHg = upstreamPressureMmHg;
  }
  return totalStressedVolumeMl;
}

/** Invert the SUM of both actual pulmonary branch laws. Averaging Palv or R
 * would move collapse thresholds and change the return curve. */
export function inverseParallelPulmonaryPressureV1(
  paths: ParallelPulmonaryPathsV1, downstreamMmHg: number, flowMlPerSec: number,
): number {
  if (!Number.isFinite(flowMlPerSec) || flowMlPerSec < 0) throw new Error("Structural pulmonary return requires nonnegative flow");
  // Also validates the path domain at zero flow.
  evaluateParallelPulmonaryPathsV1(paths, downstreamMmHg, downstreamMmHg);
  if (flowMlPerSec === 0) return downstreamMmHg;
  const flow = (up: number) => evaluateParallelPulmonaryPathsV1(paths, up, downstreamMmHg).totalFlowMlPerSec;
  let low = downstreamMmHg, high = Math.max(downstreamMmHg, ...paths.map(p => p.externalPressureMmHg))
    + 1 + flowMlPerSec / paths.reduce((sum, p) => sum + 1 / p.resistanceMmHgSecPerMl, 0);
  for (let i = 0; flow(high) < flowMlPerSec; i++) {
    if (i === 32 || !Number.isFinite(high)) throw new Error("Cannot bracket parallel pulmonary return");
    high = downstreamMmHg + 2 * (high - downstreamMmHg);
  }
  for (let i = 0; i < 64 && high - low > 1e-9; i++) {
    const middle = (low + high) / 2;
    if (flow(middle) < flowMlPerSec) low = middle; else high = middle;
  }
  return (low + high) / 2;
}

function responsiveStarlingAnchorV3(
  locus: MainWireIntegratedModelStarlingLocusV3 | undefined,
): StructuralAnchorV3 | null {
  if (
    locus?.status !== "responsive-fixed-tbv-preview" &&
    locus?.status !== "measured-fixed-tbv-protocol"
  ) return null;
  const point = locus.points.find((candidate) =>
    candidate.role === "operating-anchor" && candidate.curveEligible);
  return point === undefined
    ? null
    : Object.freeze({
        downstreamPressureMmHg: point.fillingPressureMmHg,
        returnFlowLPerMin: point.cardiacOutputLPerMin,
      });
}

function calibrateStructuralPressureOffsetV3(
  path: StructuralPathV3,
  anchor: StructuralAnchorV3,
): Readonly<{
  downstreamPressureOffsetMmHg: number;
  volumeResidualMl: number;
}> {
  const anchorFlowMlPerSec = anchor.returnFlowLPerMin * 1_000 / 60;
  const residual = (downstreamPressureOffsetMmHg: number) =>
    totalStressedVolumeAtFlowV3(
      path,
      anchor.downstreamPressureMmHg + downstreamPressureOffsetMmHg,
      anchorFlowMlPerSec,
    ) - path.totalStressedVolumeMl;
  const zeroResidual = residual(0);
  if (Math.abs(zeroResidual) <= ANCHOR_VOLUME_TOLERANCE_ML_V3) {
    return Object.freeze({
      downstreamPressureOffsetMmHg: 0,
      volumeResidualMl: zeroResidual,
    });
  }
  let lower = zeroResidual > 0 ? -1 : 0;
  let upper = zeroResidual > 0 ? 0 : 1;
  let lowerResidual = residual(lower);
  let upperResidual = residual(upper);
  while (
    Math.sign(lowerResidual) === Math.sign(upperResidual)
    && Math.max(Math.abs(lower), Math.abs(upper))
      < MAXIMUM_ANCHOR_PRESSURE_OFFSET_MMHG_V3
  ) {
    if (lowerResidual > 0 && upperResidual > 0) {
      lower = Math.max(
        -MAXIMUM_ANCHOR_PRESSURE_OFFSET_MMHG_V3,
        lower * 2,
      );
      lowerResidual = residual(lower);
    } else {
      upper = Math.min(
        MAXIMUM_ANCHOR_PRESSURE_OFFSET_MMHG_V3,
        upper * 2,
      );
      upperResidual = residual(upper);
    }
  }
  if (Math.sign(lowerResidual) === Math.sign(upperResidual)) {
    throw new Error(
      "integrated V3 structural return cannot align to the complete-beat operating anchor",
    );
  }
  const downstreamPressureOffsetMmHg = bisectResidualV3(
    residual,
    lower,
    upper,
    ANCHOR_VOLUME_TOLERANCE_ML_V3,
    ANCHOR_PRESSURE_TOLERANCE_MMHG_V3,
    128,
  );
  return Object.freeze({
    downstreamPressureOffsetMmHg,
    volumeResidualMl: residual(downstreamPressureOffsetMmHg),
  });
}

function remapStructuralPressureV3(
  point: MainWireIntegratedModelGuytonPointV3,
  downstreamPressureMmHg: number,
): MainWireIntegratedModelGuytonPointV3 {
  return Object.freeze({
    ...point,
    downstreamPressureMmHg,
  });
}

function bisectResidualV3(
  evaluate: (value: number) => number,
  lower: number,
  upper: number,
  residualTolerance: number,
  valueTolerance: number,
  maximumIterations: number,
): number {
  let low = lower;
  let high = upper;
  let lowResidual = evaluate(low);
  let highResidual = evaluate(high);
  for (let iteration = 0; iteration < maximumIterations; iteration += 1) {
    const midpoint = 0.5 * (low + high);
    const midpointResidual = evaluate(midpoint);
    if (!Number.isFinite(midpointResidual)) {
      throw new Error("integrated V3 anchor-alignment residual is not finite");
    }
    if (Math.abs(midpointResidual) <= residualTolerance) return midpoint;
    if (Math.sign(midpointResidual) === Math.sign(lowResidual)) {
      low = midpoint;
      lowResidual = midpointResidual;
    } else {
      high = midpoint;
      highResidual = midpointResidual;
    }
    if (
      Math.abs(high - low)
        <= valueTolerance * Math.max(1, Math.abs(midpoint))
    ) break;
  }
  return Math.abs(lowResidual) <= Math.abs(highResidual) ? low : high;
}

function structuralCurveSamplePressuresV3(
  minimumMmHg: number,
  maximumMmHg: number,
  anchorMmHg: number | null,
): readonly number[] {
  const values = Array.from({ length: CURVE_SAMPLE_COUNT_V3 }, (_, index) =>
    minimumMmHg
      + index / (CURVE_SAMPLE_COUNT_V3 - 1) * (maximumMmHg - minimumMmHg));
  if (
    anchorMmHg !== null
    && anchorMmHg > minimumMmHg
    && anchorMmHg < maximumMmHg
  ) {
    let nearestIndex = 0;
    for (let index = 1; index < values.length; index += 1) {
      if (
        Math.abs(values[index]! - anchorMmHg)
          < Math.abs(values[nearestIndex]! - anchorMmHg)
      ) nearestIndex = index;
    }
    values[nearestIndex] = anchorMmHg;
    values.sort((left, right) => left - right);
  }
  return Object.freeze(values);
}

function pressureDomainV3(
  side: MainWireIntegratedModelGuytonSideV3,
  operatingPressureMmHg: number,
  fillingPressureMmHg: number,
): readonly [number, number] {
  const baselineMinimum = side === "right" ? -8 : -5;
  const baselineMaximum = side === "right" ? 20 : 30;
  return Object.freeze([
    Math.min(baselineMinimum, operatingPressureMmHg - 4),
    Math.max(baselineMaximum, fillingPressureMmHg + 4),
  ]);
}

function bisectOrNearestV3(
  evaluate: (value: number) => number,
  lower: number,
  upper: number,
  tolerance: number,
  maximumIterations: number,
): number {
  let low = lower;
  let high = upper;
  let lowResidual = evaluate(low);
  let highResidual = evaluate(high);
  if (!Number.isFinite(lowResidual) || !Number.isFinite(highResidual)) {
    throw new Error("integrated V3 structural return root is not finite");
  }
  if (Math.abs(lowResidual) <= tolerance) return low;
  if (Math.abs(highResidual) <= tolerance) return high;
  if (Math.sign(lowResidual) === Math.sign(highResidual)) {
    return Math.abs(lowResidual) <= Math.abs(highResidual) ? low : high;
  }
  for (let iteration = 0; iteration < maximumIterations; iteration += 1) {
    const midpoint = 0.5 * (low + high);
    const midpointResidual = evaluate(midpoint);
    if (!Number.isFinite(midpointResidual)) {
      throw new Error("integrated V3 structural return midpoint is not finite");
    }
    if (
      Math.abs(midpointResidual) <= tolerance
      || Math.abs(high - low) <= tolerance
    ) return midpoint;
    if (Math.sign(midpointResidual) === Math.sign(lowResidual)) {
      low = midpoint;
      lowResidual = midpointResidual;
    } else {
      high = midpoint;
      highResidual = midpointResidual;
    }
  }
  return Math.abs(lowResidual) <= Math.abs(highResidual) ? low : high;
}

function assertObservationPairV3(
  observation: MainWireIntegratedModelObservationV3,
): void {
  const accepted = observation.acceptedState;
  const step = observation.lastAcceptedStep!;
  if (
    step.acceptedState.revision !== accepted.revision
    || step.acceptedState.acceptedTimeSec !== accepted.acceptedTimeSec
    || step.coronaryStep.baseStep.circulationTrial.candidateTimeSec
      !== accepted.acceptedTimeSec
  ) {
    throw new Error(
      "integrated V3 structural return observation/readback clocks differ",
    );
  }
}

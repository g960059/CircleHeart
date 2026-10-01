import { clamp, sigmoid, smoothMax, smoothMin } from "@/engine/math";
import {
  buildEdges,
  buildNodes,
  type EdgeSpec,
  type NodeSpec,
} from "@/engine/core/topology";
import {
  complianceFromPtm,
  ptmAndVolumeTangentFromStressedVolume,
  ptmFromStressedVolume,
  stressedVolumeFromPtm,
  type PtmFromStressedVolumeTangentBranch,
  type VascularPvLaw,
} from "@/engine/vascularPv";
import {
  MAIN_WIRE_SELECTED_AORTIC_OUTFLOW_CIRCULATION_PROFILE_V1,
  validateMainWireSelectedAorticOutflowCirculationProfileV1,
  type MainWireSelectedAorticOutflowCirculationProfileV1,
} from "@/engine/core/MainWireSelectedAorticOutflowCirculationProfileV1";
import { validationStampIssuanceEligibleV1 } from
  "@/engine/validationStampModeV1";
import type {
  MainWireAlgebraicProximalArterialRootsProfileV1,
} from "@/engine/core/MainWireAlgebraicProximalArterialRootsProfileV1";
import type {
  MainWireAlgebraicPulmonaryArterialRootProfileV1,
} from "@/engine/core/MainWireAlgebraicPulmonaryArterialRootProfileV1";

/**
 * Explicit Phase-1 boundary: this kernel owns the shipped graph topology,
 * vascular PV laws, respiratory external pressure, non-coronary losses,
 * collapsible-tube chi, and incidence continuity. Coronary compression and
 * stenosis are owned by the coronary transaction modules with their
 * myocardial inputs.
 */
export const CIRCULATION_GRAPH_KERNEL_V1_BOUNDARY = {
  topology: "buildNodes/buildEdges",
  edgeLosses: "nonvalve-noncoronary-with-optional-chi",
  excluded: ["coronary-compression", "coronary-stenosis"] as const,
} as const;

export type AuthoritativeCirculationGraphV1 = {
  readonly nodes: readonly NodeSpec[];
  readonly edges: readonly EdgeSpec[];
  readonly nodeIndex: ReadonlyMap<string, number>;
  readonly edgeIndex: ReadonlyMap<string, number>;
};

export function buildAuthoritativeCirculationGraphV1(): AuthoritativeCirculationGraphV1 {
  const nodes = buildNodes();
  const edges = buildEdges();
  const nodeIndex = uniqueNameIndex(nodes, "node");
  const edgeIndex = uniqueNameIndex(edges, "edge");

  for (const edge of edges) {
    if (!nodeIndex.has(edge.up) || !nodeIndex.has(edge.down)) {
      throw new Error(`Edge ${edge.name} references a node outside the authoritative graph`);
    }
  }
  return { nodes, edges, nodeIndex, edgeIndex };
}

export type VascularPvRuntimeParameterViewV1 = {
  readonly venousTone: number;
  readonly arterialStiffness: number;
  /** Fixed construction scale of Ao/SA/Art volume-law amplitude. */
  readonly systemicArterialComplianceResearchScale?: number;
  /** Fixed construction scale of the existing Ao_SA momentum term. */
  readonly aorticRootInertanceResearchScale?: number;
  readonly selectedAorticOutflowProfile?:
    MainWireSelectedAorticOutflowCirculationProfileV1;
  readonly algebraicProximalArterialRootsProfile?:
    MainWireAlgebraicProximalArterialRootsProfileV1;
  readonly algebraicPulmonaryArterialRootProfile?:
    MainWireAlgebraicPulmonaryArterialRootProfileV1;
};

export function effectiveUnstressedVolumeFromNodeV1(
  node: NodeSpec,
  params: Pick<
    VascularPvRuntimeParameterViewV1,
    "venousTone" | "selectedAorticOutflowProfile"
  >,
): number {
  const topologyEffectiveVu = (node.Vu ?? 0)
    - (node.venousToneGain ?? 0) * params.venousTone;
  const stiffnessMultiplier =
    selectedSystemicArterialStiffnessMultiplierV1(node, params);
  if (stiffnessMultiplier === undefined) return topologyEffectiveVu;
  return node.x0
    - (node.x0 - topologyEffectiveVu) / stiffnessMultiplier;
}

export function vascularPvLawFromNodeV1(
  node: NodeSpec,
  params: VascularPvRuntimeParameterViewV1,
): VascularPvLaw {
  const Vu = effectiveUnstressedVolumeFromNodeV1(node, params);
  if (node.kind === "arterial") {
    const systemicScale = params.systemicArterialComplianceResearchScale ?? 1;
    if (!Number.isFinite(systemicScale) || systemicScale <= 0) {
      throw new Error("systemic arterial compliance scale must be positive and finite");
    }
    if (params.systemicArterialComplianceResearchScale !== undefined
      && params.selectedAorticOutflowProfile !== undefined) {
      throw new Error("systemic compliance scale has no selected-aortic-profile compatibility decision");
    }
    const stiffnessMultiplier =
      selectedSystemicArterialStiffnessMultiplierV1(node, params);
    if (stiffnessMultiplier !== undefined) {
      const baseVsEff = Math.max(
        (node.Vs ?? 100) / Math.max(params.arterialStiffness, 0.25),
        1,
      );
      return {
        kind: "arterial",
        Vu,
        P0: node.P0 ?? 50,
        VsEff: baseVsEff / stiffnessMultiplier,
      };
    }
    return {
      kind: "arterial",
      Vu,
      P0: node.P0 ?? 50,
      VsEff: Math.max((node.Vs ?? 100) / Math.max(params.arterialStiffness, 0.25), 1)
        * (node.name === "Ao" || node.name === "SA" || node.name === "Art" ? systemicScale : 1),
    };
  }
  if (node.kind === "linear") {
    return {
      kind: "linear",
      Vu,
      C: Math.max(node.C ?? 1, 1e-6),
    };
  }
  if (node.kind === "venousPressure") {
    return {
      kind: "venous3",
      Vu,
      Ccoll: node.Ccoll ?? 5,
      Copen: node.Copen ?? 50,
      Cdist: node.Cdist ?? 15,
      Popen: node.Popen ?? -1,
      Pstiff: node.Pstiff ?? 14,
      dOpen: Math.max(node.dOpen ?? 1, 1e-6),
      dStiff: Math.max(node.dStiff ?? 3, 1e-6),
    };
  }
  throw new Error(`Node ${node.name} has no vascular PV law`);
}

function selectedSystemicArterialStiffnessMultiplierV1(
  node: NodeSpec,
  params: Pick<
    VascularPvRuntimeParameterViewV1,
    "selectedAorticOutflowProfile"
  >,
): 2 | undefined {
  const selectedProfile = params.selectedAorticOutflowProfile;
  if (selectedProfile === undefined || node.kind !== "arterial") {
    return undefined;
  }
  if (
    selectedProfile
      !== MAIN_WIRE_SELECTED_AORTIC_OUTFLOW_CIRCULATION_PROFILE_V1
    && !VALIDATED_FROZEN_SELECTED_AORTIC_OUTFLOW_PROFILES_V1.has(
      selectedProfile,
    )
  ) {
    const issues = validateMainWireSelectedAorticOutflowCirculationProfileV1(
      selectedProfile,
    );
    if (issues.length > 0) throw new Error(issues.join("; "));
    if (validationStampIssuanceEligibleV1(selectedProfile)) {
      VALIDATED_FROZEN_SELECTED_AORTIC_OUTFLOW_PROFILES_V1.add(
        selectedProfile,
      );
    }
  }
  if (
    !selectedProfile.systemicArterialNodeIds.some(
      (nodeId) => nodeId === node.name,
    )
  ) return undefined;
  return selectedProfile.systemicArterialTangentStiffnessMultiplier;
}

// Structurally equal profile clones are admitted only after validation. A
// proof is retained only for transitively frozen plain data, so mutable input
// is revalidated on every constitutive entry and cannot mutate behind a stamp.
const VALIDATED_FROZEN_SELECTED_AORTIC_OUTFLOW_PROFILES_V1 =
  new WeakSet<object>();

/**
 * Authoritative main-wire cold-seed volume rule. `x0` is a physical volume
 * for every node except `venousPressure`, where it is the initial transmural
 * pressure and must be mapped through the current venous PV law.
 */
export function physicalColdSeedVolumeFromNodeV1(
  node: NodeSpec,
  params: VascularPvRuntimeParameterViewV1,
): number {
  if (node.kind !== "venousPressure") return node.x0;
  const law = vascularPvLawFromNodeV1(node, params);
  return law.Vu + stressedVolumeFromPtm(law, node.x0);
}

/**
 * Shared main-wire volume-to-pressure map with an explicit numerical policy.
 *
 * The admitted fixed-iteration and arterial-clamp semantics differ from the
 * adaptive-stop inverse. Callers must name the numerical policy explicitly.
 */
export type VascularPressureInversePolicyV1 =
  | "fixed-32-iterations"
  | "adaptive-volume-tolerance";

const FIXED32_INVERSE_OPTIONS_V1 = Object.freeze({
  maxIterations: 32,
  termination: "fixed-iterations" as const,
});

export function vascularTransmuralPressureFromPhysicalVolumeV1(
  node: NodeSpec,
  physicalVolumeMl: number,
  params: VascularPvRuntimeParameterViewV1,
  policy: VascularPressureInversePolicyV1,
): number {
  if (!Number.isFinite(physicalVolumeMl)) {
    throw new RangeError(`${node.name} physical volume must be finite`);
  }
  const law = vascularPvLawFromNodeV1(node, params);
  return vascularTransmuralPressureFromLawV1(law, physicalVolumeMl, policy);
}

export function vascularTransmuralPressureFromLawV1(
  law: VascularPvLaw,
  physicalVolumeMl: number,
  policy: VascularPressureInversePolicyV1,
): number {
  if (!Number.isFinite(physicalVolumeMl)) {
    throw new RangeError("vascular physical volume must be finite");
  }
  const stressedVolumeMl = physicalVolumeMl - law.Vu;
  if (policy === "adaptive-volume-tolerance") {
    return ptmFromStressedVolume(law, stressedVolumeMl);
  }
  if (law.kind === "arterial") {
    const logStrain = clamp(
      stressedVolumeMl / Math.max(law.VsEff, 1),
      -30,
      5,
    );
    return law.P0 * (Math.exp(logStrain) - 1);
  }
  if (law.kind === "linear") {
    return stressedVolumeMl / Math.max(law.C, 1e-6);
  }
  return ptmFromStressedVolume(
    law,
    stressedVolumeMl,
    FIXED32_INVERSE_OPTIONS_V1,
  );
}

export type VascularPressureVolumeTangentBranchV1 =
  | PtmFromStressedVolumeTangentBranch
  | "fixed32-arterial-lower-saturation"
  | "fixed32-arterial-interior"
  | "fixed32-arterial-upper-saturation"
  | "fixed32-linear"
  | "fixed32-venous-lower-saturation"
  | "fixed32-venous-interior"
  | "fixed32-venous-upper-saturation";

export type VascularTransmuralPressureAndVolumeTangentV1 = Readonly<{
  /** Exactly the corresponding scalar API's primal pressure. */
  transmuralPressureMmHg: number;
  dTransmuralPressureDPhysicalVolumeMmHgPerMl: number;
  branch: VascularPressureVolumeTangentBranchV1;
}>;

/** Paired node PV inverse and active-branch tangent for a volume Newton solve. */
export function vascularTransmuralPressureAndVolumeTangentFromPhysicalVolumeV1(
  node: NodeSpec,
  physicalVolumeMl: number,
  params: VascularPvRuntimeParameterViewV1,
  policy: VascularPressureInversePolicyV1,
): VascularTransmuralPressureAndVolumeTangentV1 {
  const law = vascularPvLawFromNodeV1(node, params);
  return vascularTransmuralPressureAndVolumeTangentFromLawV1(
    law,
    physicalVolumeMl,
    policy,
  );
}

export function vascularTransmuralPressureAndVolumeTangentFromLawV1(
  law: VascularPvLaw,
  physicalVolumeMl: number,
  policy: VascularPressureInversePolicyV1,
): VascularTransmuralPressureAndVolumeTangentV1 {
  const stressedVolumeMl = physicalVolumeMl - law.Vu;
  if (policy === "adaptive-volume-tolerance") {
    const paired = ptmAndVolumeTangentFromStressedVolume(
      law,
      stressedVolumeMl,
    );
    return Object.freeze({
      transmuralPressureMmHg: paired.transmuralPressure,
      dTransmuralPressureDPhysicalVolumeMmHgPerMl:
        paired.dPtmDStressedVolume,
      branch: paired.branch,
    });
  }

  const transmuralPressureMmHg =
    vascularTransmuralPressureFromLawV1(
      law,
      physicalVolumeMl,
      policy,
    );
  if (law.kind === "arterial") {
    const volumeScaleMl = Math.max(law.VsEff, 1);
    const logStrain = stressedVolumeMl / volumeScaleMl;
    if (logStrain <= -30) {
      return Object.freeze({
        transmuralPressureMmHg,
        dTransmuralPressureDPhysicalVolumeMmHgPerMl: 0,
        branch: "fixed32-arterial-lower-saturation" as const,
      });
    }
    if (logStrain >= 5) {
      return Object.freeze({
        transmuralPressureMmHg,
        dTransmuralPressureDPhysicalVolumeMmHgPerMl: 0,
        branch: "fixed32-arterial-upper-saturation" as const,
      });
    }
    return Object.freeze({
      transmuralPressureMmHg,
      dTransmuralPressureDPhysicalVolumeMmHgPerMl:
        (law.P0 + transmuralPressureMmHg) / volumeScaleMl,
      branch: "fixed32-arterial-interior" as const,
    });
  }
  if (law.kind === "linear") {
    return Object.freeze({
      transmuralPressureMmHg,
      dTransmuralPressureDPhysicalVolumeMmHgPerMl:
        1 / Math.max(law.C, 1e-6),
      branch: "fixed32-linear" as const,
    });
  }
  const lowerVolumeMl = stressedVolumeFromPtm(law, -20);
  if (stressedVolumeMl <= lowerVolumeMl) {
    return Object.freeze({
      transmuralPressureMmHg,
      dTransmuralPressureDPhysicalVolumeMmHgPerMl: 0,
      branch: "fixed32-venous-lower-saturation" as const,
    });
  }
  const upperVolumeMl = stressedVolumeFromPtm(law, 45);
  if (stressedVolumeMl >= upperVolumeMl) {
    return Object.freeze({
      transmuralPressureMmHg,
      dTransmuralPressureDPhysicalVolumeMmHgPerMl: 0,
      branch: "fixed32-venous-upper-saturation" as const,
    });
  }
  return Object.freeze({
    transmuralPressureMmHg,
    dTransmuralPressureDPhysicalVolumeMmHgPerMl:
      1 / complianceFromPtm(law, transmuralPressureMmHg),
    branch: "fixed32-venous-interior" as const,
  });
}

export type RespiratoryPressureParameterViewV1 = {
  /** Candidate-owned respiratory mechanics. Absent in the published model. */
  readonly coupledPressures?: RespiratoryExternalPressuresV1;
  readonly PEEP: number;
  readonly Pth0: number;
  readonly respAmpTh: number;
  readonly respAmpAlv: number;
  readonly respRate: number;
};

export type RespiratoryExternalPressuresV1 = {
  readonly pthMmHg: number;
  readonly palvMmHg: number;
};

export function respiratoryExternalPressuresV1(
  timeSec: number,
  params: RespiratoryPressureParameterViewV1,
): RespiratoryExternalPressuresV1 {
  if (params.coupledPressures !== undefined) {
    if (!Number.isFinite(params.coupledPressures.pthMmHg)
      || !Number.isFinite(params.coupledPressures.palvMmHg)) throw new Error("Invalid coupled respiratory pressure");
    return params.coupledPressures;
  }
  const respiratorySignal = Math.sin(2 * Math.PI * params.respRate * timeSec);
  return {
    pthMmHg: params.Pth0 + 0.20 * params.PEEP + params.respAmpTh * respiratorySignal,
    palvMmHg: params.PEEP + params.respAmpAlv * respiratorySignal,
  };
}

export function respiratoryExternalPressureForKindV1(
  kind: "none" | "pth" | "palv",
  timeSec: number,
  params: RespiratoryPressureParameterViewV1,
): number {
  if (kind === "none") return 0;
  const pressures = respiratoryExternalPressuresV1(timeSec, params);
  return kind === "pth" ? pressures.pthMmHg : pressures.palvMmHg;
}

export type DownstreamWaterfallInputV1 = {
  readonly edge: Pick<EdgeSpec, "waterfall" | "Pcrit">;
  readonly downstreamPressureMmHg: number;
  readonly edgeExternalPressureMmHg: number;
  readonly smoothingMmHg?: number;
};

export function downstreamEffectivePressureV1(input: DownstreamWaterfallInputV1): number {
  if (!input.edge.waterfall) return input.downstreamPressureMmHg;
  const collapsePressureMmHg = input.edgeExternalPressureMmHg + (input.edge.Pcrit ?? 0);
  return smoothMax(
    input.downstreamPressureMmHg,
    collapsePressureMmHg,
    input.smoothingMmHg ?? 0.25,
  );
}

export type DownstreamEffectivePressureAndDerivativeV1 = Readonly<{
  /** Exactly the scalar API's primal effective pressure. */
  effectivePressureMmHg: number;
  dEffectivePressureDDownstreamPressure: number;
  branch: "direct-downstream" | "smooth-waterfall";
}>;

export function downstreamEffectivePressureAndDerivativeV1(
  input: DownstreamWaterfallInputV1,
): DownstreamEffectivePressureAndDerivativeV1 {
  const effectivePressureMmHg = downstreamEffectivePressureV1(input);
  if (!input.edge.waterfall) {
    return Object.freeze({
      effectivePressureMmHg,
      dEffectivePressureDDownstreamPressure: 1,
      branch: "direct-downstream" as const,
    });
  }
  const collapsePressureMmHg =
    input.edgeExternalPressureMmHg + (input.edge.Pcrit ?? 0);
  const differenceMmHg = input.downstreamPressureMmHg - collapsePressureMmHg;
  const smoothingMmHg = input.smoothingMmHg ?? 0.25;
  const denominatorMmHg = Math.sqrt(
    differenceMmHg * differenceMmHg + smoothingMmHg * smoothingMmHg,
  );
  return Object.freeze({
    effectivePressureMmHg,
    // The zero-width exact tie has Clarke interval [0, 1]; use its midpoint.
    dEffectivePressureDDownstreamPressure: denominatorMmHg === 0
      ? 0.5
      : 0.5 * (1 + differenceMmHg / denominatorMmHg),
    branch: "smooth-waterfall" as const,
  });
}

export type BaseEdgeLossRuntimeParameterViewV1 = {
  readonly systemicResistance: number;
  readonly pulmonaryResistance: number;
  readonly useChiResistance?: boolean;
};

export type BaseNonValveEdgeLossV1 = {
  readonly resistanceMmHgSecPerMl: number;
  readonly quadraticLossMmHgSec2PerMl2: number;
  readonly collapsibleTubeCorrectionDeferred: boolean;
};

export type NonValveEdgeLossInputV1 = {
  readonly edge: EdgeSpec;
  readonly params: BaseEdgeLossRuntimeParameterViewV1;
  readonly upstreamPressureMmHg: number;
  readonly downstreamPressureMmHg: number;
  readonly edgeExternalPressureMmHg: number;
};

export type NonValveEdgeLossV1 = {
  readonly resistanceMmHgSecPerMl: number;
  readonly quadraticLossMmHgSec2PerMl2: number;
  readonly areaRatio: number;
  readonly collapsibleTubeApplied: boolean;
};

/**
 * Resolve the admitted base R/B scaling for non-valve edges.
 *
 * Valve R/B/EOA has exactly one owner: MainWireQuasiSteadyOrificeValveV2. This function
 * therefore rejects valves as well as coronary edges, and reports (but does
 * not apply) collapsible-tube chi scaling. Use nonValveEdgeLossV1 when the raw
 * edge pressures and external pressure are available.
 */
export function baseNonValveEdgeLossV1(
  edge: EdgeSpec,
  params: BaseEdgeLossRuntimeParameterViewV1,
): BaseNonValveEdgeLossV1 {
  if (edge.kind === "valve" || edge.group === "coronary") {
    throw new Error(`Edge ${edge.name} is outside the base non-valve loss boundary`);
  }

  let resistance = edge.R;
  let quadraticLoss = edge.B ?? 0;
  if (edge.group === "systemic") resistance *= params.systemicResistance;
  if (edge.group === "pulmonary") resistance *= params.pulmonaryResistance;

  return {
    resistanceMmHgSecPerMl: Math.max(resistance, 1e-8),
    quadraticLossMmHgSec2PerMl2: Math.max(quadraticLoss, 0),
    collapsibleTubeCorrectionDeferred: Boolean(edge.useChiResistance || edge.useChiQuadratic),
  };
}

/**
 * Resolve the complete admitted non-coronary, non-valve loss law.
 *
 * The chi coordinate intentionally uses the raw upstream/downstream absolute
 * pressures. The downstream waterfall pressure is a separate flow-gradient
 * construction and must not be fed back into this area ratio.
 */
export function nonValveEdgeLossV1(
  input: NonValveEdgeLossInputV1,
): NonValveEdgeLossV1 {
  const base = baseNonValveEdgeLossV1(input.edge, input.params);
  const usesChi = Boolean(
    input.edge.useChiResistance || input.edge.useChiQuadratic,
  );
  if (!input.params.useChiResistance || !usesChi) {
    return {
      resistanceMmHgSecPerMl: base.resistanceMmHgSecPerMl,
      quadraticLossMmHgSec2PerMl2: base.quadraticLossMmHgSec2PerMl2,
      areaRatio: 1,
      collapsibleTubeApplied: false,
    };
  }

  const areaRatio = collapsibleTubeAreaRatioV1({
    edge: input.edge,
    upstreamPressureMmHg: input.upstreamPressureMmHg,
    downstreamPressureMmHg: input.downstreamPressureMmHg,
    edgeExternalPressureMmHg: input.edgeExternalPressureMmHg,
  });
  return {
    resistanceMmHgSecPerMl: input.edge.useChiResistance
      ? base.resistanceMmHgSecPerMl
        * Math.pow(areaRatio, -(input.edge.chiRExp ?? 2))
      : base.resistanceMmHgSecPerMl,
    quadraticLossMmHgSec2PerMl2: input.edge.useChiQuadratic
      ? base.quadraticLossMmHgSec2PerMl2
        * Math.pow(areaRatio, -(input.edge.chiBExp ?? 2))
      : base.quadraticLossMmHgSec2PerMl2,
    areaRatio,
    collapsibleTubeApplied: true,
  };
}

export type NonValveEdgeLossAndPressureDerivativesV1 =
  NonValveEdgeLossV1 & Readonly<{
    dAreaRatioDUpstreamPressurePerMmHg: number;
    dAreaRatioDDownstreamPressurePerMmHg: number;
    dResistanceDUpstreamPressureSecPerMl: number;
    dResistanceDDownstreamPressureSecPerMl: number;
    dQuadraticLossDUpstreamPressureSec2PerMl2: number;
    dQuadraticLossDDownstreamPressureSec2PerMl2: number;
    areaRatioBranch: CollapsibleTubeAreaRatioDerivativeBranchV1 | "not-applied";
  }>;

export function nonValveEdgeLossAndPressureDerivativesV1(
  input: NonValveEdgeLossInputV1,
): NonValveEdgeLossAndPressureDerivativesV1 {
  const loss = nonValveEdgeLossV1(input);
  if (!loss.collapsibleTubeApplied) {
    return Object.freeze({
      ...loss,
      dAreaRatioDUpstreamPressurePerMmHg: 0,
      dAreaRatioDDownstreamPressurePerMmHg: 0,
      dResistanceDUpstreamPressureSecPerMl: 0,
      dResistanceDDownstreamPressureSecPerMl: 0,
      dQuadraticLossDUpstreamPressureSec2PerMl2: 0,
      dQuadraticLossDDownstreamPressureSec2PerMl2: 0,
      areaRatioBranch: "not-applied" as const,
    });
  }
  const area = collapsibleTubeAreaRatioAndPressureDerivativesV1({
    edge: input.edge,
    upstreamPressureMmHg: input.upstreamPressureMmHg,
    downstreamPressureMmHg: input.downstreamPressureMmHg,
    edgeExternalPressureMmHg: input.edgeExternalPressureMmHg,
  });
  const resistanceExponent = input.edge.chiRExp ?? 2;
  const quadraticExponent = input.edge.chiBExp ?? 2;
  const resistanceFactor = input.edge.useChiResistance
    ? -resistanceExponent * loss.resistanceMmHgSecPerMl / loss.areaRatio
    : 0;
  const quadraticFactor = input.edge.useChiQuadratic
    ? -quadraticExponent * loss.quadraticLossMmHgSec2PerMl2 / loss.areaRatio
    : 0;
  return Object.freeze({
    ...loss,
    dAreaRatioDUpstreamPressurePerMmHg:
      area.dAreaRatioDUpstreamPressurePerMmHg,
    dAreaRatioDDownstreamPressurePerMmHg:
      area.dAreaRatioDDownstreamPressurePerMmHg,
    dResistanceDUpstreamPressureSecPerMl:
      resistanceFactor * area.dAreaRatioDUpstreamPressurePerMmHg,
    dResistanceDDownstreamPressureSecPerMl:
      resistanceFactor * area.dAreaRatioDDownstreamPressurePerMmHg,
    dQuadraticLossDUpstreamPressureSec2PerMl2:
      quadraticFactor * area.dAreaRatioDUpstreamPressurePerMmHg,
    dQuadraticLossDDownstreamPressureSec2PerMl2:
      quadraticFactor * area.dAreaRatioDDownstreamPressurePerMmHg,
    areaRatioBranch: area.branch,
  });
}

export type CollapsibleTubeAreaRatioInputV1 = {
  readonly edge: Pick<
    EdgeSpec,
    "Pcrit" | "chiWidth" | "chiMin"
  >;
  readonly upstreamPressureMmHg: number;
  readonly downstreamPressureMmHg: number;
  readonly edgeExternalPressureMmHg: number;
};

export function collapsibleTubeAreaRatioV1(
  input: CollapsibleTubeAreaRatioInputV1,
): number {
  const transmuralTubePressureMmHg = smoothMin(
    input.upstreamPressureMmHg - input.edgeExternalPressureMmHg,
    input.downstreamPressureMmHg - input.edgeExternalPressureMmHg,
    0.25,
  );
  const normalizedPressure = (
    transmuralTubePressureMmHg - (input.edge.Pcrit ?? 0)
  ) / Math.max(input.edge.chiWidth ?? 1, 1e-6);
  const minimumAreaRatio = input.edge.chiMin ?? 0.08;
  return minimumAreaRatio
    + (1 - minimumAreaRatio) * sigmoid(normalizedPressure);
}

export type CollapsibleTubeAreaRatioDerivativeBranchV1 =
  | "lower-sigmoid-clamp"
  | "smooth-interior"
  | "upper-sigmoid-clamp";

export type CollapsibleTubeAreaRatioAndPressureDerivativesV1 = Readonly<{
  /** Exactly the scalar API's primal area ratio. */
  areaRatio: number;
  dAreaRatioDUpstreamPressurePerMmHg: number;
  dAreaRatioDDownstreamPressurePerMmHg: number;
  branch: CollapsibleTubeAreaRatioDerivativeBranchV1;
}>;

export function collapsibleTubeAreaRatioAndPressureDerivativesV1(
  input: CollapsibleTubeAreaRatioInputV1,
): CollapsibleTubeAreaRatioAndPressureDerivativesV1 {
  const areaRatio = collapsibleTubeAreaRatioV1(input);
  const upstreamTransmuralMmHg =
    input.upstreamPressureMmHg - input.edgeExternalPressureMmHg;
  const downstreamTransmuralMmHg =
    input.downstreamPressureMmHg - input.edgeExternalPressureMmHg;
  const differenceMmHg = upstreamTransmuralMmHg - downstreamTransmuralMmHg;
  const smoothMinDenominatorMmHg = Math.sqrt(
    differenceMmHg * differenceMmHg + 0.25 * 0.25,
  );
  const dMinimumDUpstream = 0.5 * (
    1 - differenceMmHg / smoothMinDenominatorMmHg
  );
  const dMinimumDDownstream = 0.5 * (
    1 + differenceMmHg / smoothMinDenominatorMmHg
  );
  const transmuralTubePressureMmHg = smoothMin(
    upstreamTransmuralMmHg,
    downstreamTransmuralMmHg,
    0.25,
  );
  const widthMmHg = Math.max(input.edge.chiWidth ?? 1, 1e-6);
  const normalizedPressure = (
    transmuralTubePressureMmHg - (input.edge.Pcrit ?? 0)
  ) / widthMmHg;
  if (normalizedPressure <= -40 || normalizedPressure >= 40) {
    return Object.freeze({
      areaRatio,
      dAreaRatioDUpstreamPressurePerMmHg: 0,
      dAreaRatioDDownstreamPressurePerMmHg: 0,
      branch: normalizedPressure <= -40
        ? "lower-sigmoid-clamp" as const
        : "upper-sigmoid-clamp" as const,
    });
  }
  const sigmoidValue = sigmoid(normalizedPressure);
  const minimumAreaRatio = input.edge.chiMin ?? 0.08;
  const dAreaRatioDMinimum = (1 - minimumAreaRatio)
    * sigmoidValue * (1 - sigmoidValue) / widthMmHg;
  return Object.freeze({
    areaRatio,
    dAreaRatioDUpstreamPressurePerMmHg:
      dAreaRatioDMinimum * dMinimumDUpstream,
    dAreaRatioDDownstreamPressurePerMmHg:
      dAreaRatioDMinimum * dMinimumDDownstream,
    branch: "smooth-interior" as const,
  });
}

/**
 * Apply the directed graph incidence operator to edge flows. Positive flow is
 * from edge.up to edge.down; the returned vector follows graph.nodes order.
 *
 * `out` lets a caller supply a scratch vector instead of taking a fresh one.
 * The result is identical either way: the buffer is zeroed before accumulation,
 * exactly as a freshly constructed `Float64Array` would be. The live lane needs
 * this because a fifteen-element `Float64Array` is 120 bytes, which is past the
 * 64-byte limit V8 keeps typed arrays on its own heap under; anything larger
 * takes a backing store from an allocator shared by the whole renderer process.
 */
export function incidenceVolumeRatesFromEdgeFlowsV1(
  graph: AuthoritativeCirculationGraphV1,
  edgeFlowsMlPerSec: ArrayLike<number>,
  out?: Float64Array,
): Float64Array {
  if (edgeFlowsMlPerSec.length !== graph.edges.length) {
    throw new RangeError(
      `Expected ${graph.edges.length} edge flows, received ${edgeFlowsMlPerSec.length}`,
    );
  }
  if (out !== undefined && out.length !== graph.nodes.length) {
    throw new RangeError(
      `Expected a ${graph.nodes.length}-element rate buffer, received ${out.length}`,
    );
  }
  const rates = out ?? new Float64Array(graph.nodes.length);
  rates.fill(0);
  for (let edgeIndex = 0; edgeIndex < graph.edges.length; edgeIndex++) {
    const edge = graph.edges[edgeIndex]!;
    const flow = edgeFlowsMlPerSec[edgeIndex]!;
    if (!Number.isFinite(flow)) throw new RangeError(`Edge flow ${edge.name} must be finite`);
    rates[graph.nodeIndex.get(edge.up)!] -= flow;
    rates[graph.nodeIndex.get(edge.down)!] += flow;
  }
  return rates;
}

function uniqueNameIndex<T extends { readonly name: string }>(
  values: readonly T[],
  kind: "node" | "edge",
): Map<string, number> {
  const index = new Map<string, number>();
  for (let i = 0; i < values.length; i++) {
    const name = values[i]!.name;
    if (index.has(name)) throw new Error(`Duplicate ${kind} name ${name}`);
    index.set(name, i);
  }
  return index;
}

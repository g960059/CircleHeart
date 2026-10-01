import { describe, expect, it } from "vitest";
import { evaluateParallelPulmonaryPathsV1, type ParallelPulmonaryPathsV1 } from "@/engine/core/ParallelPulmonaryPathsV1";
import { respiratoryExternalPressureForKindV1 } from "@/engine/core/circulationGraphKernelV1";
import { NON_CORONARY_CHAMBER_TANGENT_ORDER_V1, NON_CORONARY_NODE_NAMES_V1,
  createInitialNonCoronaryCirculationStateV1, resolveNonCoronaryCirculationColdSeedV1,
  evaluateNonCoronaryCirculationBackwardEulerTrialV1,
  type NonCoronaryCirculationRuntimeParamsV1, type NonCoronaryCandidateMechanicsCallbackV1 }
  from "@/engine/core/nonCoronaryCirculationBackwardEulerV1";
import { MAIN_WIRE_FOUR_VALVE_NORMAL_RESEARCH_INPUT_V1 } from "@/engine/valves/MainWireFourValveDiseaseResearchBracketsV1";

const paths = (external: number): ParallelPulmonaryPathsV1 => [
  { resistanceMmHgSecPerMl: .06, externalPressureMmHg: external },
  { resistanceMmHgSecPerMl: .12, externalPressureMmHg: external + 2 },
];

describe("regional pulmonary pressure-flow coupling", () => {
  it("matches analytic endpoint pressure derivatives across open, transition, collapsed and reversed flow", () => {
    const p = paths(10), h = 1e-5;
    for (const [up, down] of [[20, 15], [10, 8], [3, 5], [15, 20], [10, 10], [12, 10]]) {
      const actual = evaluateParallelPulmonaryPathsV1(p, up, down);
      const derivative = (du: number, dd: number) => (evaluateParallelPulmonaryPathsV1(p, up + du, down + dd).totalFlowMlPerSec
        - evaluateParallelPulmonaryPathsV1(p, up - du, down - dd).totalFlowMlPerSec) / (2 * h);
      expect(actual.upstreamMlPerSecPerMmHg).toBeCloseTo(derivative(h, 0), 7);
      expect(actual.downstreamMlPerSecPerMmHg).toBeCloseTo(derivative(0, h), 7);
      expect(actual.upstreamMlPerSecPerMmHg).toBeGreaterThan(0);
      expect(actual.downstreamMlPerSecPerMmHg).toBeLessThan(0);
    }
  });

  it("is symmetric on reversal, invariant to a common pressure reference, and cannot pump against the gradient", () => {
    for (const external of [-20, 10, 30]) {
      const p = paths(external), forward = evaluateParallelPulmonaryPathsV1(p, 20, 10);
      const reverse = evaluateParallelPulmonaryPathsV1(p, 10, 20);
      const equal = evaluateParallelPulmonaryPathsV1(p, 12, 12);
      expect(equal.flowMlPerSecByUnit).toEqual([0, 0]);
      for (const i of [0, 1] as const) {
        expect(forward.flowMlPerSecByUnit[i]).toBeGreaterThan(0);
        expect(reverse.flowMlPerSecByUnit[i]).toBe(-forward.flowMlPerSecByUnit[i]);
      }
      const shifted = p.map(path => ({ ...path, externalPressureMmHg: path.externalPressureMmHg + 100 })) as unknown as ParallelPulmonaryPathsV1;
      expect(evaluateParallelPulmonaryPathsV1(shifted, 120, 110)).toEqual(forward);
    }
  });

  it("progressively restricts perfusion when external pressure straddles and then exceeds both endpoints", () => {
    const open = evaluateParallelPulmonaryPathsV1(paths(-20), 20, 10).totalFlowMlPerSec;
    const waterfall = evaluateParallelPulmonaryPathsV1(paths(15), 20, 10).totalFlowMlPerSec;
    const collapsed = evaluateParallelPulmonaryPathsV1(paths(50), 20, 10).totalFlowMlPerSec;
    expect(open).toBeCloseTo(10 * (1 / .06 + 1 / .12), 1);
    expect(waterfall).toBeGreaterThan(0);
    expect(waterfall).toBeLessThan(open * .6);
    // The 0.25-mmHg regularization leaves a small smooth residual conductance.
    expect(collapsed).toBeGreaterThan(0);
    expect(collapsed).toBeLessThan(open * .001);
  });

  it("passes the regional paths through the actual circulation residual and analytic volume Jacobian", () => {
    for (const external of [-5, 8, 30]) {
      const runtime: NonCoronaryCirculationRuntimeParamsV1 = {
        vascular: { venousTone: 0, arterialStiffness: 1 }, losses: { systemicResistance: 1, pulmonaryResistance: 1 },
        respiratory: { PEEP: 0, Pth0: 0, respAmpTh: 0, respAmpAlv: 0, respRate: 0,
          coupledPressures: { pthMmHg: -3, palvMmHg: 5 } },
        parallelPulmonaryPaths: paths(external), valveResearchInput: MAIN_WIRE_FOUR_VALVE_NORMAL_RESEARCH_INPUT_V1,
      };
      const initial = createInitialNonCoronaryCirculationStateV1({ timeSec: 0, runtime,
        ...resolveNonCoronaryCirculationColdSeedV1(runtime) });
      const callback: NonCoronaryCandidateMechanicsCallbackV1<null> = v => ({
        absolutePressuresMmHg: { LV: 16 + .12 * (v.LV - initial.nodeVolumesMl.LV), LA: 12 + .08 * (v.LA - initial.nodeVolumesMl.LA),
          RV: 11 + .09 * (v.RV - initial.nodeVolumesMl.RV), RA: 7 + .06 * (v.RA - initial.nodeVolumesMl.RA) },
        absolutePressureTangent: { rowPressureOrder: NON_CORONARY_CHAMBER_TANGENT_ORDER_V1, columnVolumeOrder: NON_CORONARY_CHAMBER_TANGENT_ORDER_V1,
          units: "mmHg/mL", pressureKind: "absolute", derivativeSemantics: "candidate-algorithmic-at-fixed-accepted-state-time-dt-and-drive",
          dPressureDVolumeMmHgPerMl: [[.12, 0, 0, 0], [0, .08, 0, 0], [0, 0, .09, 0], [0, 0, 0, .06]] }, evaluation: null,
      });
      const analytic = evaluateNonCoronaryCirculationBackwardEulerTrialV1({ previousAcceptedState: initial, dtSec: .001,
        runtime, evaluateCandidateMechanics: callback, options: { analyticJacobianFiniteDifferenceShadow: true } });
      const fd = evaluateNonCoronaryCirculationBackwardEulerTrialV1({ previousAcceptedState: initial, dtSec: .001,
        runtime, evaluateCandidateMechanics: (v, t) => { const { absolutePressureTangent: _tangent, ...value } = callback(v, t); return value; } });
      if (analytic.converged === false) throw new Error(analytic.message);
      if (fd.converged === false) throw new Error(fd.message);
      expect(analytic.diagnostics.analyticJacobianAssemblyCount).toBeGreaterThan(0);
      expect(analytic.diagnostics.finiteDifferenceJacobianFallbackCount).toBe(0);
      expect(analytic.diagnostics.jacobianMaximumRelativeFrobeniusShadowDifference).not.toBeNull();
      expect(analytic.diagnostics.jacobianMaximumRelativeFrobeniusShadowDifference!).toBeLessThan(2e-5);
      const expected = evaluateParallelPulmonaryPathsV1(runtime.parallelPulmonaryPaths!,
        analytic.nodeAbsolutePressuresMmHg.PCap, analytic.nodeAbsolutePressuresMmHg.PVen);
      expect(analytic.edgeFlowsMlPerSec.PCap_PVen).toBe(expected.totalFlowMlPerSec);
      for (const name of NON_CORONARY_NODE_NAMES_V1) expect(analytic.candidateNodeVolumesMl[name]).toBeCloseTo(fd.candidateNodeVolumesMl[name], 8);
    }
  });

  it("keeps pleural and alveolar pressures separate at vascular external-pressure ports", () => {
    const runtime = { PEEP: 30, Pth0: 10, respAmpTh: 99, respAmpAlv: 99, respRate: 1,
      coupledPressures: { pthMmHg: -4, palvMmHg: 9 } };
    expect(respiratoryExternalPressureForKindV1("pth", .25, runtime)).toBe(-4);
    expect(respiratoryExternalPressureForKindV1("palv", .25, runtime)).toBe(9);
    expect(respiratoryExternalPressureForKindV1("none", .25, runtime)).toBe(0);
  });
});

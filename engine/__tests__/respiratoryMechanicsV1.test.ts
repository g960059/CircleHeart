import { describe, expect, it } from "vitest";
import {
  DEFAULT_RESPIRATORY_MECHANICS_CONFIG_V1,
  RESPIRATORY_GAS_CONSTANT_L_MMHG_PER_MOL_K_V1,
  RESPIRATORY_MMHG_PER_CMH2O_V1,
  createRespiratoryMechanicsCheckpointV1,
  createRespiratoryMechanicsStateV1,
  evaluateRespiratoryMechanicsV1,
  nextRespiratoryBoundaryTimeSecV1,
  restoreRespiratoryMechanicsCheckpointV1,
  stepRespiratoryMechanicsV1,
  type RespiratoryMechanicsConfigV1,
  type RespiratoryMechanicsStateV1,
} from "@/engine/cardiorespiratory/RespiratoryMechanicsV1";

function config(overrides: Partial<RespiratoryMechanicsConfigV1> = {}): RespiratoryMechanicsConfigV1 {
  return { ...structuredClone(DEFAULT_RESPIRATORY_MECHANICS_CONFIG_V1), conductingDeadspaceVolumeL: 0, ...overrides };
}
function units(c: RespiratoryMechanicsConfigV1, change: Partial<RespiratoryMechanicsConfigV1["units"][0]>): RespiratoryMechanicsConfigV1["units"] {
  return [{ ...c.units[0], ...change }, { ...c.units[1], ...change }];
}
const zero = { o2Mol: 0, co2Mol: 0, inertMol: 0 };
const total = (s: RespiratoryMechanicsStateV1, key: "o2Mol" | "co2Mol" | "inertMol") => s.unitGasMol[0][key] + s.unitGasMol[1][key];

describe("respiratory mechanics and conserved dry-gas owner V1", () => {
  it("crosses the PCV rise boundary repeatedly on the coupled 2 ms clock", () => {
    const c = config();
    let state = createRespiratoryMechanicsStateV1(c);
    for (let i = 1; i <= 15_000; i++) state = stepRespiratoryMechanicsV1(c, state, i * .002 - state.timeSec).state;
    expect(state.timeSec).toBe(30);
    expect(state.completedBreaths).toBe(6);
    expect(state.ventilatorCycleTimeSec).toBe(0);
  });
  it("solves ideal-gas and both PV relations without independently advancing volume", () => {
    const c = config();
    const state = createRespiratoryMechanicsStateV1(c);
    const result = stepRespiratoryMechanicsV1(c, state, 0.4);
    const { output: o } = result;
    const rt = RESPIRATORY_GAS_CONSTANT_L_MMHG_PER_MOL_K_V1 * c.environment.temperatureKelvin;
    for (const i of [0, 1] as const) {
      const amount = result.state.unitGasMol[i];
      const dryP = c.environment.barometricPressureMmHg - c.environment.waterVaporPressureMmHg
        + o.alveolarPressureCmH2OByUnit[i] * RESPIRATORY_MMHG_PER_CMH2O_V1;
      expect(dryP * o.volumeLByUnit[i]).toBeCloseTo((amount.o2Mol + amount.co2Mol + amount.inertMol) * rt, 8);
      expect(o.alveolarPressureCmH2OByUnit[i]).toBeCloseTo(o.pleuralPressureCmH2O + o.transpulmonaryPressureCmH2OByUnit[i], 12);
    }
    expect(o.pleuralPressureCmH2O).toBeCloseTo(-5 + 5 * (o.totalLungVolumeL - 2.5), 10);
  });

  it("recovers the passive homogeneous RC step response in the incompressible limit", () => {
    const base = config();
    const c = config({
      environment: { ...base.environment, barometricPressureMmHg: 1e8 },
      ventilator: { ...base.ventilator, peepCmH2O: 0, riseTimeSec: 0, pressureControlAbovePeepCmH2O: 10 },
      maximumSubstepSec: 0.002,
    });
    const state = createRespiratoryMechanicsStateV1(c);
    const o = stepRespiratoryMechanicsV1(c, state, 0.5).output;
    // Parallel E_L = 5, chest-wall E = 5, parallel R = 5 -> tau = 0.5 s.
    const expectedVolume = 2.5 + (1 - Math.exp(-0.5 / 0.5));
    expect(o.totalLungVolumeL).toBeCloseTo(expectedVolume, 5);
    expect(o.airwayFlowLPerSec).toBeCloseTo(2 * Math.exp(-1), 5);
    expect(o.volumeLByUnit[0]).toBeCloseTo(o.volumeLByUnit[1], 12);
  });

  it("partitions an equivalent homogeneous lung without changing total mechanics", () => {
    const base = config();
    const unequal = config({ units: [
      { ...base.units[0], referenceVolumeL: 0.625, elastanceCmH2OPerL: 20, resistanceCmH2OSPerL: 20 },
      { ...base.units[1], referenceVolumeL: 1.875, elastanceCmH2OPerL: 20 / 3, resistanceCmH2OSPerL: 20 / 3 },
    ] });
    const a = stepRespiratoryMechanicsV1(base, createRespiratoryMechanicsStateV1(base), 0.6).output;
    const b = stepRespiratoryMechanicsV1(unequal, createRespiratoryMechanicsStateV1(unequal), 0.6).output;
    expect(b.totalLungVolumeL).toBeCloseTo(a.totalLungVolumeL, 10);
    expect(b.airwayFlowLPerSec).toBeCloseTo(a.airwayFlowLPerSec, 10);
    expect(b.volumeLByUnit[1] / b.volumeLByUnit[0]).toBeCloseTo(3, 10);
  });

  it("conserves every species during occluded inter-unit redistribution", () => {
    const c = config();
    const s = createRespiratoryMechanicsStateV1(c, {
      initialVolumeLByUnit: [1.7, 1.1],
      initialGasFractionsByUnit: [{ o2: 0.3, co2: 0.02, inert: 0.68 }, { o2: 0.1, co2: 0.08, inert: 0.82 }],
    });
    const result = stepRespiratoryMechanicsV1(c, s, 0.5, { airwayOccluded: true });
    for (const key of ["o2Mol", "co2Mol", "inertMol"] as const) {
      expect(total(result.state, key)).toBeCloseTo(total(s, key), 14);
      expect(result.ledger.conservationResidualMol[key]).toBeCloseTo(0, 14);
      expect(result.ledger.boundaryGasTransferMol[key]).toBeCloseTo(0, 14);
    }
    expect(result.output.airwayFlowLPerSec).toBe(0);
    expect(result.state.unitGasMol[1].o2Mol).toBeGreaterThan(s.unitGasMol[1].o2Mol);
  });

  it("preserves trapped gas and permits conservative absorption without ventilation", () => {
    const c = config();
    const s = createRespiratoryMechanicsStateV1(c, { airwayOpenByUnit: [false, false] });
    const before = evaluateRespiratoryMechanicsV1(c, s);
    const trapped = stepRespiratoryMechanicsV1(c, s, 0.3);
    expect(trapped.state.unitGasMol).toEqual(s.unitGasMol);
    const uptake = { o2Mol: -0.0002, co2Mol: 0.00016, inertMol: 0 };
    const absorbed = stepRespiratoryMechanicsV1(c, trapped.state, 0, { exchangeMolByUnit: [uptake, zero] });
    expect(absorbed.state.unitGasMol[0].o2Mol).toBeCloseTo(s.unitGasMol[0].o2Mol + uptake.o2Mol, 15);
    expect(absorbed.output.totalLungVolumeL).toBeLessThan(before.totalLungVolumeL);
    expect(absorbed.output.flowLPerSecByUnit).toEqual([0, 0]);
    expect(absorbed.ledger.conservationResidualMol.o2Mol).toBeCloseTo(0, 15);
  });

  it("reopens retained gas after sustained opening pressure without resetting composition", () => {
    const base = config();
    const c = config({ units: units(base, { recruitment: {
      openingTranspulmonaryPressureCmH2O: 10,
      closingTranspulmonaryPressureCmH2O: 2,
      openingTimeSec: 0.05,
      closingTimeSec: 0.05,
    } }),
    ventilator: { ...base.ventilator, riseTimeSec: 0 },
    });
    const s = createRespiratoryMechanicsStateV1(c, {
      airwayOpenByUnit: [false, false],
      initialGasFractionsByUnit: [{ o2: 0.1, co2: 0.1, inert: 0.8 }, { o2: 0.1, co2: 0.1, inert: 0.8 }],
    });
    const result = stepRespiratoryMechanicsV1(c, s, 0.06);
    expect(result.state.airwayOpenByUnit).toEqual([true, true]);
    expect(result.events.filter(e => e.kind === "airway-opened")).toHaveLength(2);
    expect(result.events[0].timeSec).toBeCloseTo(0.05, 12);
    expect(result.state.unitGasMol[0].co2Mol).toBeGreaterThan(0);
    expect(result.state.unitGasMol[0].co2Mol).toBeCloseTo(s.unitGasMol[0].co2Mol, 12);
    expect(result.ledger.conservationResidualMol.co2Mol).toBeCloseTo(0, 14);
  });

  it("VCV controls delivered flow, and pressure limiting allows volume-target failure", () => {
    const base = config();
    const c = config({ ventilator: { ...base.ventilator, mode: "vcv", riseTimeSec: 0 } });
    const s = createRespiratoryMechanicsStateV1(c);
    const delivered = stepRespiratoryMechanicsV1(c, s, c.ventilator.inspiratoryTimeSec);
    expect(delivered.ledger.inspiredBoundaryVolumeL).toBeCloseTo(0.5, 9);
    expect(delivered.output.phase).toBe("expiration");
    const limitedConfig = config({
      ...c,
      units: units(c, { elastanceCmH2OPerL: 100 }),
      ventilator: { ...c.ventilator, pressureLimitCmH2O: 8 },
    });
    const limited = stepRespiratoryMechanicsV1(limitedConfig, createRespiratoryMechanicsStateV1(limitedConfig), 0.8);
    expect(limited.output.pressureLimited).toBe(true);
    expect(limited.output.airwayPressureCmH2O).toBe(8);
    expect(limited.ledger.inspiredBoundaryVolumeL).toBeLessThan(0.2);
  });

  it("exactly segments mandatory breath and hold boundaries across a long step", () => {
    const base = config();
    const c = config({ ventilator: { ...base.ventilator, inspiratoryHoldSec: 0.2 } });
    const s = createRespiratoryMechanicsStateV1(c);
    expect(nextRespiratoryBoundaryTimeSecV1(c, s)).toBe(0.1);
    const result = stepRespiratoryMechanicsV1(c, s, 5.1);
    expect(result.events.map(e => e.kind)).toEqual(["inspiratory-hold-start", "expiration-start", "inspiration-start"]);
    expect(result.events.map(e => e.timeSec)).toEqual([0.8, 1, 5]);
    expect(result.state.completedBreaths).toBe(1);
    expect(result.state.ventilatorCycleTimeSec).toBeCloseTo(0.1, 12);
  });

  it("produces intrinsic PEEP from high resistance and incomplete expiration", () => {
    const base = config();
    const c = config({
      units: units(base, { resistanceCmH2OSPerL: 40 }),
      ventilator: { ...base.ventilator, respiratoryRatePerMin: 30, inspiratoryTimeSec: 1, peepCmH2O: 0, riseTimeSec: 0, pressureControlAbovePeepCmH2O: 15 },
    });
    const result = stepRespiratoryMechanicsV1(c, createRespiratoryMechanicsStateV1(c), 12 - 1e-6);
    expect(result.output.phase).toBe("expiration");
    expect(result.output.alveolarPressureCmH2OByUnit[0]).toBeGreaterThan(3);
    expect(result.output.airwayFlowLPerSec).toBeLessThan(0);
    expect(result.output.totalLungVolumeL).toBeGreaterThan(2.8);
  });

  it("rejects impossible exchange atomically and resumes a JSON checkpoint exactly", () => {
    const c = config();
    const s = stepRespiratoryMechanicsV1(c, createRespiratoryMechanicsStateV1(c), 0.357).state;
    const before = JSON.stringify(s);
    expect(() => stepRespiratoryMechanicsV1(c, s, 0.2, { exchangeMolByUnit: [{ o2Mol: -1, co2Mol: 0, inertMol: 0 }, zero] })).toThrow();
    expect(JSON.stringify(s)).toBe(before);
    const checkpoint = JSON.parse(JSON.stringify(createRespiratoryMechanicsCheckpointV1(c, s)));
    const restored = restoreRespiratoryMechanicsCheckpointV1(c, checkpoint);
    expect(stepRespiratoryMechanicsV1(c, restored, 0.2)).toEqual(stepRespiratoryMechanicsV1(c, s, 0.2));
    const wrongConfig = { ...c, ventilator: { ...c.ventilator, peepCmH2O: 6 } };
    expect(() => restoreRespiratoryMechanicsCheckpointV1(wrongConfig, checkpoint)).toThrow("configuration mismatch");
  });

  it("uses muscle pressure as a separate driver of the same passive lung", () => {
    const base = config();
    const c = config({ ventilator: { ...base.ventilator, mode: "spontaneous", peepCmH2O: 0 }, muscle: { ...base.muscle, amplitudeCmH2O: 8 } });
    const result = stepRespiratoryMechanicsV1(c, createRespiratoryMechanicsStateV1(c), 0.5);
    expect(result.output.musclePressureCmH2O).toBeCloseTo(8, 10);
    expect(result.output.pleuralPressureCmH2O).toBeLessThan(-5);
    expect(result.output.airwayPressureCmH2O).toBe(0);
    expect(result.output.airwayFlowLPerSec).toBeGreaterThan(0);
    expect(result.output.totalLungVolumeL).toBeGreaterThan(2.5);
  });

  it("converges under temporal refinement in the compressible nonlinear model", () => {
    const base = config();
    const values = [0.01, 0.005, 0.0025, 0.0003125].map(maximumSubstepSec => {
      const c = config({ units: units(base, { overdistensionCmH2O: 20 }), maximumSubstepSec });
      return stepRespiratoryMechanicsV1(c, createRespiratoryMechanicsStateV1(c), 0.8).output.totalLungVolumeL;
    });
    const errors = values.slice(0, 3).map(v => Math.abs(v - values[3]));
    expect(errors[0]).toBeGreaterThan(3 * errors[1]);
    expect(errors[1]).toBeGreaterThan(3 * errors[2]);
    expect(errors[2]).toBeLessThan(1e-5);
  });

  it("keeps expired composition on the donor side of the exact boundary ledger", () => {
    const base = config();
    const c = config({ ventilator: { ...base.ventilator, mode: "spontaneous", peepCmH2O: 0 } });
    const s = createRespiratoryMechanicsStateV1(c, {
      initialVolumeLByUnit: [1.7, 1.7],
      initialGasFractionsByUnit: [{ o2: 0.14, co2: 0.06, inert: 0.8 }, { o2: 0.14, co2: 0.06, inert: 0.8 }],
    });
    const result = stepRespiratoryMechanicsV1(c, s, 0.4);
    const ledger = result.ledger.boundaryGasTransferMol;
    expect(ledger.co2Mol).toBeLessThan(0);
    expect(ledger.o2Mol / ledger.co2Mol).toBeCloseTo(0.14 / 0.06, 10);
    expect(result.ledger.inspiredBoundaryVolumeL).toBe(0);
    expect(result.ledger.expiredBoundaryVolumeL).toBeGreaterThan(0);
    expect(result.ledger.conservationResidualMol.co2Mol).toBeCloseTo(0, 14);
  });

  it("washes out conducting gas analytically and rebreathes its stored CO2 during inspiration", () => {
    const base = config();
    const c = config({ conductingDeadspaceVolumeL: .15, ventilator: { ...base.ventilator, mode: "vcv" } });
    const state = createRespiratoryMechanicsStateV1(c, {
      initialConductingGasFractions: { o2: .11, co2: .1, inert: .79 },
    });
    const result = stepRespiratoryMechanicsV1(c, state, .2);
    const mols = (g: typeof state.conductingGasMol) => g.o2Mol + g.co2Mol + g.inertMol;
    const capacity = mols(state.conductingGasMol), through = mols(result.ledger.boundaryGasTransferMol);
    expect(through).toBeGreaterThan(0);
    expect(result.state.conductingGasMol.co2Mol).toBeCloseTo(state.conductingGasMol.co2Mol * Math.exp(-through / capacity), 14);
    expect(total(result.state, "co2Mol") - total(state, "co2Mol"))
      .toBeCloseTo(state.conductingGasMol.co2Mol - result.state.conductingGasMol.co2Mol, 14);
    expect(result.ledger.boundaryGasTransferMol.co2Mol).toBe(0);
    expect(mols(result.state.conductingGasMol)).toBeCloseTo(capacity, 15);
    expect(result.state.conductingGasMol.co2Mol).toBeGreaterThan(0);
  });

  it("fills deadspace from expired alveolar gas and conserves all species over flow reversal", () => {
    const base = config();
    const c = config({ conductingDeadspaceVolumeL: .15, ventilator: { ...base.ventilator, mode: "spontaneous", peepCmH2O: 0 } });
    const state = createRespiratoryMechanicsStateV1(c, { initialVolumeLByUnit: [1.6, 1.6],
      initialGasFractionsByUnit: [{ o2: .14, co2: .06, inert: .8 }, { o2: .14, co2: .06, inert: .8 }] });
    const expiration = stepRespiratoryMechanicsV1(c, state, .3);
    expect(expiration.state.conductingGasMol.co2Mol).toBeGreaterThan(0);
    // The initially fresh reservoir delays CO2 at the external boundary.
    const expired = expiration.ledger.boundaryGasTransferMol;
    const expiredTotal = expired.o2Mol + expired.co2Mol + expired.inertMol;
    expect(expired.co2Mol / expiredTotal).toBeGreaterThan(0);
    expect(expired.co2Mol / expiredTotal).toBeLessThan(.06);
    const inspirationConfig = { ...c, ventilator: { ...c.ventilator, mode: "pcv" as const, pressureControlAbovePeepCmH2O: 20, riseTimeSec: 0 } };
    const inspiration = stepRespiratoryMechanicsV1(inspirationConfig, expiration.state, .1);
    expect(inspiration.ledger.inspiredBoundaryVolumeL).toBeGreaterThan(0);
    expect(inspiration.state.conductingGasMol.co2Mol).toBeLessThan(expiration.state.conductingGasMol.co2Mol);
    for (const key of ["o2Mol", "co2Mol", "inertMol"] as const) {
      const before = total(state, key) + state.conductingGasMol[key];
      const after = total(inspiration.state, key) + inspiration.state.conductingGasMol[key];
      expect(after - before).toBeCloseTo(expiration.ledger.boundaryGasTransferMol[key] + inspiration.ledger.boundaryGasTransferMol[key], 13);
    }
  });

  it("routes occluded pendelluft through the finite reservoir without an external gas transfer", () => {
    const c = config({ conductingDeadspaceVolumeL: .15 });
    const state = createRespiratoryMechanicsStateV1(c, { initialVolumeLByUnit: [1.7, 1.1],
      initialGasFractionsByUnit: [{ o2: .14, co2: .06, inert: .8 }, { o2: .21, co2: 0, inert: .79 }] });
    const result = stepRespiratoryMechanicsV1(c, state, .2, { airwayOccluded: true });
    expect(result.ledger.boundaryGasTransferMol).toEqual(zero);
    expect(result.state.conductingGasMol.co2Mol).toBeGreaterThan(0);
    expect(result.state.unitGasMol[1].co2Mol).toBeGreaterThan(0);
    for (const key of ["o2Mol", "co2Mol", "inertMol"] as const) expect(total(result.state, key) + result.state.conductingGasMol[key])
      .toBeCloseTo(total(state, key) + state.conductingGasMol[key], 14);
  });

  it("recovers the massless-junction limit without a small-deadspace timestep restriction", () => {
    const base = config();
    const c = config({ ventilator: { ...base.ventilator, mode: "vcv" } });
    const run = (volume: number) => {
      const configuration = { ...c, conductingDeadspaceVolumeL: volume };
      const state = createRespiratoryMechanicsStateV1(configuration, {
        initialGasFractionsByUnit: [{ o2: .14, co2: .06, inert: .8 }, { o2: .14, co2: .06, inert: .8 }] });
      return { state, result: stepRespiratoryMechanicsV1(configuration, state, .2) };
    };
    const zeroVolume = run(0), tiny = run(1e-9);
    expect(zeroVolume.result.state.conductingGasMol).toEqual(zero);
    const gainO2 = total(zeroVolume.result.state, "o2Mol") - total(zeroVolume.state, "o2Mol");
    const gain = ["o2Mol", "co2Mol", "inertMol"].reduce((sum, key) => sum + zeroVolume.result.ledger.boundaryGasTransferMol[key as keyof typeof zero], 0);
    expect(gainO2 / gain).toBeCloseTo(.21, 12);
    expect(tiny.result.ledger.acceptedSubsteps).toBe(zeroVolume.result.ledger.acceptedSubsteps);
    for (const key of ["o2Mol", "co2Mol", "inertMol"] as const) expect(total(tiny.result.state, key)).toBeCloseTo(total(zeroVolume.result.state, key), 10);
  });

  it("converges in deadspace and alveolar composition as the transport step is refined", () => {
    const seed = config({ conductingDeadspaceVolumeL: .15 });
    const results = [.01, .005, .0025, .0003125].map(maximumSubstepSec => {
      const c = { ...seed, maximumSubstepSec };
      const state = createRespiratoryMechanicsStateV1(c, {
        initialGasFractionsByUnit: [{ o2: .14, co2: .06, inert: .8 }, { o2: .14, co2: .06, inert: .8 }],
      });
      const final = stepRespiratoryMechanicsV1(c, state, 3).state;
      return [final.conductingGasMol.co2Mol, final.unitGasMol[0].co2Mol, final.unitGasMol[1].co2Mol];
    });
    const errors = results.slice(0, 3).map(values => values.reduce((sum, v, i) => sum + Math.abs(v - results[3][i]), 0));
    expect(errors[0]).toBeGreaterThan(2.8 * errors[1]);
    expect(errors[1]).toBeGreaterThan(2.8 * errors[2]);
  });
});

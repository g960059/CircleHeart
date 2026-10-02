import { describe, expect, it, vi } from "vitest";
import { CardiorespiratorySessionV1, type CardiorespiratoryStateV1 } from "@/engine/cardiorespiratory/CardiorespiratorySessionV1";
import { CardiorespiratoryFixedRespiratoryMechanicalSessionV1 as FixedSession } from "@/engine/cardiorespiratory/CardiorespiratoryFixedRespiratoryMechanicalSessionV1";
import { DEFAULT_CARDIORESPIRATORY_FIXTURE_V1 as defaults, validateAndOwnCardiorespiratoryFixtureV1 } from "@/engine/cardiorespiratory/CardiorespiratoryFixtureV1";
import { projectCardiorespiratorySettlementStateV1 as project } from "@/engine/cardiorespiratory/CardiorespiratorySettlementStateV1";
import { DEFAULT_TISSUE_GAS_PARAMETERS_V1 } from "@/engine/cardiorespiratory/TissueGasExchangeV1";
import { cardiorespiratoryPhysicalBloodVolumesV1 } from "@/engine/cardiorespiratory/CardiorespiratoryBloodNetworkV1";
import { bloodGasAmountsFromPressuresV1 } from "@/engine/cardiorespiratory/BloodGasChemistryV1";
import { createMainWireIntegratedModelStaticCaseFixtureV1 } from "@/engine/myocardium/experiments/MainWireIntegratedModelStaticCaseFixtureV1";
import { stepMainWireIntegratedModelCoupledV1 } from "@/engine/vnext/coupled/MainWireIntegratedCoupledStepV1";
import { createMainWireFiveWallCoupledNewtonShadowWorkspaceV1 } from "@/engine/vnext/coupled/MainWireFiveWallCoupledNewtonShadowV1";
import { createMainWireFiveWallCoupledResidualWorkspaceV1 } from "@/engine/myocardium/MainWireFiveWallCoronaryTransactionV2";
import * as breathing from "@/engine/cardiorespiratory/RespiratoryMechanicsV1";
import * as pulmonary from "@/engine/cardiorespiratory/PulmonaryGasExchangeV1";
import * as tissue from "@/engine/cardiorespiratory/TissueGasExchangeV1";

function asymmetricSource() {
  const respiratory = defaults.cardiorespiratory.respiratory;
  const fixture = validateAndOwnCardiorespiratoryFixtureV1({ ...defaults,
    hemodynamicResearchInputs: { ...defaults.hemodynamicResearchInputs, heartRateBpm: 73.25 },
    cardiorespiratory: { ...defaults.cardiorespiratory,
      pulmonaryReferenceResistanceMmHgSecPerMl: [.04, .09],
      respiratory: { ...respiratory,
        ventilator: { ...respiratory.ventilator, respiratoryRatePerMin: 12.37 },
        muscle: { ...respiratory.muscle, respiratoryRatePerMin: 13.51, amplitudeCmH2O: 2 },
      } },
  });
  const source = CardiorespiratorySessionV1.create(fixture).forkSettlementSeedV1({ lungGasScaleByUnit: [.8, 1.3] });
  source.advanceToPresentationTime(.008);
  return source;
}

function inventories(state: CardiorespiratoryStateV1) {
  return [...Object.values(state.blood), ...state.respiratory.unitGasMol, state.respiratory.conductingGasMol,
    state.systemic.amount, state.myocardium.amount].reduce((sum, gas) => ({
    o2Mol: sum.o2Mol + gas.o2Mol, co2Mol: sum.co2Mol + gas.co2Mol,
  }), { o2Mol: 0, co2Mol: 0 });
}

describe("CR exact-owned fixed respiratory mechanical experiment", () => {
  it("captures the actual two-path pressure and volume-dependent resistance boundary without changing its source", () => {
    const source = asymmetricSource(), saved = source.checkpoint(), respiratory = source.respiratoryOutput();
    const fork = source.forkFixedRespiratoryMechanicsV1(), boundary = fork.respiratoryBoundary;
    expect(fork.currentAcceptedState()).toEqual(source.currentAcceptedState());
    expect(boundary.pleuralPressureMmHg).toBe(respiratory.pleuralPressureMmHg);
    expect(boundary.alveolarPressureMmHgByUnit).toEqual(respiratory.alveolarPressureMmHgByUnit);
    expect(Math.abs(boundary.alveolarPressureMmHgByUnit[0] - boundary.alveolarPressureMmHgByUnit[1])).toBeGreaterThan(1);
    for (const i of [0, 1] as const) {
      const ratio = respiratory.volumeLByUnit[i] / source.fixture.cardiorespiratory.respiratory.units[i].referenceVolumeL;
      const resistance = source.fixture.cardiorespiratory.pulmonaryReferenceResistanceMmHgSecPerMl[i]
        * (1 + source.fixture.cardiorespiratory.pulmonaryVolumeResistanceGain * ((ratio - 1) ** 2 + (1 / ratio - 1) ** 2));
      expect(boundary.pulmonaryPaths[i]).toEqual({ resistanceMmHgSecPerMl: resistance,
        externalPressureMmHg: respiratory.alveolarPressureMmHgByUnit[i] });
    }
    expect(Object.isFrozen(boundary.pulmonaryPaths[0])).toBe(true);
    expect(source.checkpoint()).toEqual(saved);
  });

  it("matches a coupled cardiovascular step with the captured two paths, and differs from a mean-Palv collapse", () => {
    const source = asymmetricSource(), fork = source.forkFixedRespiratoryMechanicsV1(), b = fork.respiratoryBoundary;
    const base = createMainWireIntegratedModelStaticCaseFixtureV1(source.fixture.anatomyId,
      source.fixture.hemodynamicResearchInputs, 1, source.fixture.mechanismResearchInputs);
    const mean = (b.alveolarPressureMmHgByUnit[0] + b.alveolarPressureMmHgByUnit[1]) / 2;
    const solve = (collapse: boolean) => {
      const runtime = { ...base.runtime, respiratory: { ...base.runtime.respiratory,
        coupledPressures: { pthMmHg: b.pleuralPressureMmHg, palvMmHg: mean } },
      parallelPulmonaryPaths: collapse ? b.pulmonaryPaths.map(p => ({ ...p, externalPressureMmHg: mean })) as unknown as typeof b.pulmonaryPaths : b.pulmonaryPaths };
      const result = stepMainWireIntegratedModelCoupledV1(base.provider, source.currentAcceptedState(), {
        candidateTimeSec: .01, coronary: { ...base.coronaryStepInput, runtime },
        rhythm: { configuration: base.rhythm.configuration, externalAfNextBoundaryTimeSec: null, externalAtrialSourceBatch: null },
        dynamicMechanicalSupport: { config: base.config, profile: base.profile },
      }, createMainWireFiveWallCoupledNewtonShadowWorkspaceV1(), { residualWorkspace: createMainWireFiveWallCoupledResidualWorkspaceV1() });
      if (result.converged === false) throw new Error(result.message);
      return result.acceptedState;
    };
    const expected = solve(false), collapsed = solve(true);
    fork.advanceToPresentationTime(.01);
    const actual = fork.currentAcceptedState().coronary.circulation.nodeVolumesMl;
    for (const id of Object.keys(actual) as (keyof typeof actual)[]) {
      expect(actual[id], id).toBeCloseTo(expected.coronary.circulation.nodeVolumesMl[id], 8);
    }
    expect(Math.abs(actual.PCap - collapsed.coronary.circulation.nodeVolumesMl.PCap)).toBeGreaterThan(1e-5);
  });

  it("preserves the fixed boundary through TBV and fixed-tone forks, conserves volume, and never advances gas owners", () => {
    const source = asymmetricSource(), original = source.checkpoint(), anchor = source.forkFixedRespiratoryMechanicsV1();
    const tbv = anchor.currentAcceptedState().coronary.fixedGlobalTotalBloodVolumeMl;
    const active = anchor.forkAtFixedGlobalTotalBloodVolume(tbv - 300);
    expect(active.currentAcceptedState().coronary.coronaryAutoregulation).toEqual(anchor.currentAcceptedState().coronary.coronaryAutoregulation);
    const fixed = active.forkResponsiveStarlingAtFixedGlobalTotalBloodVolume(tbv + 100);
    expect(fixed.currentAcceptedState().coronary.coronary.toneResistanceScaleByTerritoryLayer)
      .toEqual(anchor.currentAcceptedState().coronary.coronary.toneResistanceScaleByTerritoryLayer);
    expect(fixed.currentAcceptedState().coronary.coronaryAutoregulation.acceptedDurationSec).toBe(0);
    const spies = [vi.spyOn(breathing, "stepRespiratoryMechanicsV1"), vi.spyOn(pulmonary, "exchangePerfusedBloodWithAlveolarGasV1"),
      vi.spyOn(tissue, "advanceTissueGasExchangeV1")];
    try {
      for (const branch of [active, fixed]) {
        branch.advanceToPresentationTimeWithSelectedOutputProjectionV1(.014, []);
        expect(branch.respiratoryBoundary).toEqual(anchor.respiratoryBoundary);
        const state = branch.currentAcceptedState();
        expect(Object.values(cardiorespiratoryPhysicalBloodVolumesV1(state)).reduce((a, b) => a + b, 0))
          .toBeCloseTo(state.coronary.fixedGlobalTotalBloodVolumeMl, 6);
        expect(branch.observe().runtimeSignals.pleuralPressureMmHg).toBe(anchor.respiratoryBoundary.pleuralPressureMmHg);
      }
      spies.forEach(spy => expect(spy).not.toHaveBeenCalled());
    } finally { spies.forEach(spy => spy.mockRestore()); }
    expect(source.checkpoint()).toEqual(original);
  });

  it("serializes a distinct fixed-boundary checkpoint and continues a frozen-tone branch identically", async () => {
    const source = asymmetricSource(), anchor = source.forkFixedRespiratoryMechanicsV1();
    const branch = anchor.forkResponsiveStarlingAtFixedGlobalTotalBloodVolume(anchor.currentAcceptedState().coronary.fixedGlobalTotalBloodVolumeMl - 100);
    branch.advanceToPresentationTimeWithSelectedOutputProjectionV1(.016, []);
    const pending = branch.checkpoint();
    branch.advanceToPresentationTimeWithSelectedOutputProjectionV1(.02, []);
    const checkpoint = JSON.parse(JSON.stringify(await pending));
    const restored = await FixedSession.restore(source.fixture, checkpoint);
    expect(restored.currentAcceptedClock().acceptedTimeSec).toBe(.016);
    restored.advanceToPresentationTimeWithSelectedOutputProjectionV1(.02, []);
    expect(restored.snapshotAcceptedStateBytes()).toEqual(branch.snapshotAcceptedStateBytes());
    expect(await restored.checkpoint()).toEqual(await branch.checkpoint());
    expect(() => CardiorespiratorySessionV1.restore(source.fixture, checkpoint)).toThrow();
    checkpoint.respiratoryBoundary.alveolarPressureMmHgByUnit[0] += 1;
    await expect(FixedSession.restore(source.fixture, checkpoint)).rejects.toThrow(/SHA-256/);
  });
});

describe("CR same-forcing settlement state and independent histories", () => {
  it("declares only conditional payload shapes and retains every mandatory coordinate through cardiac events", () => {
    const source = CardiorespiratorySessionV1.create(), initial = source.physicalSettlementProjectionV1();
    const optional = (key: string) => initial.optionalCoordinatePrefixes.some(prefix => key === prefix || key.startsWith(prefix + "."));
    const mandatory = (p: typeof initial) => ({
      continuous: Object.keys(p.continuous).filter(key => !optional(key)).sort(),
      discrete: Object.keys(p.discrete).filter(key => !optional(key)).sort(),
    });
    expect(Object.isFrozen(initial.optionalCoordinatePrefixes)).toBe(true);
    for (const key of ["gas.totalCo2Mol", "hemodynamic.volumesMl.LV", "hemodynamic.mvcReference.reference.referenceFiberLogStrainByWall.LVFW",
      "controller.tone.LAD.subendocardial", "controller.qmIntegralMl.LAD.subendocardial", "respiratory.airwayOpen.0", "respiratory.recruitmentProgress.0"])
      expect(optional(key), key).toBe(false);
    expect(initial.discrete["controller.windowControl"]).toBe(null);
    for (const time of [.1, .7, .76, .8, .9, 1.6, 1.72, 1.8]) {
      source.advanceToPresentationTime(time);
      const p = source.physicalSettlementProjectionV1();
      expect(p.optionalCoordinatePrefixes).toEqual(initial.optionalCoordinatePrefixes);
      expect(mandatory(p), `mandatory schema at ${time}`).toEqual(mandatory(initial));
    }
    expect(source.physicalSettlementProjectionV1().continuous["controller.windowControl.demandScaleByTerritoryLayer.LAD.subendocardial"])
      .toBeDefined();
  });

  it("admits independent differences in all physical domains with unchanged forcing, TBV, hidden clocks and source", () => {
    const source = CardiorespiratorySessionV1.create();
    source.advanceToPresentationTime(.006);
    const saved = source.checkpoint(), seed = source.forkSettlementSeedV1({ venousRedistributionMl: 20, coronaryToneScale: 1.03,
      lungGasScaleByUnit: [.98, 1.02], systemicGasPressureOffsetMmHg: { o2: 5, co2: 10 },
      myocardialGasPressureOffsetMmHg: { o2: 5, co2: 10 }, bloodGasPressureOffsetMmHg: { o2: 2, co2: 2 } });
    const a = source.physicalSettlementProjectionV1(), b = seed.physicalSettlementProjectionV1();
    expect(b.forcing).toEqual(a.forcing);
    expect(b.invariants).toEqual(a.invariants);
    expect(b.discrete).toEqual(a.discrete);
    for (const domain of ["hemodynamic", "respiratory", "gas", "controller"]) {
      expect(Object.entries(a.continuous).some(([key, coordinate]) => coordinate.domain === domain
        && Math.abs(coordinate.value - b.continuous[key].value) / coordinate.scale > .01), domain).toBe(true);
    }
    const state = seed.checkpoint().state;
    expect(state.composedRhythm).toEqual(saved.state.composedRhythm);
    expect(state.coronary.coronaryAutoregulation).toEqual(saved.state.coronary.coronaryAutoregulation);
    expect(state.cardiorespiratory.respiratory.recruitmentProgress01ByUnit).toEqual(saved.state.cardiorespiratory.respiratory.recruitmentProgress01ByUnit);
    const before = inventories(saved.state.cardiorespiratory), after = inventories(state.cardiorespiratory);
    expect(after.o2Mol - before.o2Mol).toBeCloseTo(state.cardiorespiratory.ledger.interventionO2Mol, 14);
    expect(after.co2Mol - before.co2Mol).toBeCloseTo(state.cardiorespiratory.ledger.interventionCo2Mol, 14);
    expect(Object.values(cardiorespiratoryPhysicalBloodVolumesV1(seed.currentAcceptedState())).reduce((x, y) => x + y, 0))
      .toBeCloseTo(saved.state.coronary.fixedGlobalTotalBloodVolumeMl, 6);
    expect(source.checkpoint()).toEqual(saved);
    expect(Object.isFrozen(b.continuous["gas.systemic.co2Mol"])).toBe(true);
    seed.advanceToPresentationTime(.01);
    expect(Math.abs(seed.cardiorespiratoryState().readback.co2BalanceResidualMol)).toBeLessThan(1e-12);
  });

  it("conserves both gases under pure venous redistribution and retains closed-unit inert inventory", () => {
    const source = CardiorespiratorySessionV1.create();
    const redistributed = source.forkSettlementSeedV1({ venousRedistributionMl: -20 });
    const before = inventories(source.cardiorespiratoryState()), after = inventories(redistributed.cardiorespiratoryState());
    expect(after.o2Mol).toBeCloseTo(before.o2Mol, 14);
    expect(after.co2Mol).toBeCloseTo(before.co2Mol, 14);
    const checkpoint = JSON.parse(JSON.stringify(source.checkpoint()));
    checkpoint.state.cardiorespiratory.respiratory.airwayOpenByUnit[0] = false;
    const closed = CardiorespiratorySessionV1.restore(source.fixture, checkpoint);
    const seed = closed.forkSettlementSeedV1({ lungGasScaleByUnit: [1.1, 1.1] });
    expect(seed.cardiorespiratoryState().respiratory.unitGasMol[0].inertMol).toBe(closed.cardiorespiratoryState().respiratory.unitGasMol[0].inertMol);
    expect(seed.cardiorespiratoryState().respiratory.airwayOpenByUnit).toEqual([false, true]);
  });

  it("ignores cumulative diagnostics and MVC capture clocks but retains future material, controller and recruitment history", () => {
    const source = CardiorespiratorySessionV1.create(), cp = source.checkpoint();
    const original = project(source.fixture, cp.state), altered = JSON.parse(JSON.stringify(cp.state));
    altered.cardiorespiratory.ledger.boundaryCo2Mol += 1;
    altered.cardiorespiratory.systemic.cumulativeUnmetO2Mol += 1;
    altered.cardiorespiratory.respiratory.completedBreaths += 1;
    altered.coronary.mvcReferenceState.referenceAcceptedTimeSec += 1;
    altered.coronary.mvcReferenceState.referenceRevision += 1;
    altered.coronary.mvcReferenceState.acceptedMitralClosureEventCount += 1;
    expect(project(source.fixture, altered)).toEqual(original);
    altered.cardiorespiratory.respiratory.recruitmentProgress01ByUnit[0] = .1;
    const toneTerritory = Object.keys(altered.coronary.coronaryAutoregulation.qmTimeIntegralMlByTerritoryLayer)[0];
    const toneLayer = Object.keys(altered.coronary.coronaryAutoregulation.qmTimeIntegralMlByTerritoryLayer[toneTerritory])[0];
    altered.coronary.coronaryAutoregulation.qmTimeIntegralMlByTerritoryLayer[toneTerritory][toneLayer] += 1;
    altered.coronary.mvcReferenceState.reference.referenceFiberLogStrainByWall.LVFW += .1;
    const changed = project(source.fixture, altered);
    expect(changed.continuous["respiratory.recruitmentProgress.0"].value).toBe(.1);
    expect(changed.continuous[`controller.qmIntegralMl.${toneTerritory}.${toneLayer}`].value)
      .not.toBe(original.continuous[`controller.qmIntegralMl.${toneTerritory}.${toneLayer}`].value);
    expect(changed.continuous["hemodynamic.mvcReference.reference.referenceFiberLogStrainByWall.LVFW"].value)
      .not.toBe(original.continuous["hemodynamic.mvcReference.reference.referenceFiberLogStrainByWall.LVFW"].value);
    for (const id of ["systemic", "myocardium"] as const) {
      expect(changed.continuous[`gas.${id}.co2Mol`].scale).toBe(100 * DEFAULT_TISSUE_GAS_PARAMETERS_V1[id].co2CapacityMolPerMmHg);
    }
  });

  it("represents every blood inventory invertibly with volume, content and pressure using fixed scales", () => {
    const source = asymmetricSource(), state = source.cardiorespiratoryState(), projection = source.physicalSettlementProjectionV1();
    const volumes = cardiorespiratoryPhysicalBloodVolumesV1(source.currentAcceptedState());
    const total = inventories(state);
    expect(projection.continuous["gas.totalO2Mol"].value).toBeCloseTo(total.o2Mol, 14);
    expect(projection.continuous["gas.totalCo2Mol"].value).toBeCloseTo(total.co2Mol, 14);
    for (const [id, amount] of Object.entries(state.blood)) {
      const get = (path: string) => projection.continuous[path];
      expect(get(`gas.bloodContent.${id}.o2MolPerL`).value * volumes[id] / 1000).toBeCloseTo(amount.o2Mol, 14);
      expect(get(`gas.bloodContent.${id}.co2MolPerL`).value * volumes[id] / 1000).toBeCloseTo(amount.co2Mol, 14);
      const reconstructed = bloodGasAmountsFromPressuresV1(volumes[id], {
        o2MmHg: get(`gas.bloodPressure.${id}.o2MmHg`).value,
        co2MmHg: get(`gas.bloodPressure.${id}.co2MmHg`).value,
      }, source.fixture.cardiorespiratory.bloodGas);
      expect(reconstructed.o2Mol).toBeCloseTo(amount.o2Mol, 13);
      expect(reconstructed.co2Mol).toBeCloseTo(amount.co2Mol, 13);
    }
    const seed = source.forkSettlementSeedV1({ venousRedistributionMl: 20, bloodGasPressureOffsetMmHg: { o2: 2, co2: 2 } })
      .physicalSettlementProjectionV1();
    for (const [key, coordinate] of Object.entries(projection.continuous)) expect(seed.continuous[key].scale, key).toBe(coordinate.scale);
  });

  it("rejects inadmissible seeds atomically", () => {
    const source = CardiorespiratorySessionV1.create(), saved = source.checkpoint();
    for (const options of [{ venousRedistributionMl: 1e6 }, { coronaryToneScale: 100 },
      { lungGasScaleByUnit: [-1, 1] as const }, { systemicGasPressureOffsetMmHg: { o2: -1e6 } },
      { bloodGasPressureOffsetMmHg: { co2: -1e6 } }]) expect(() => source.forkSettlementSeedV1(options)).toThrow();
    expect(source.checkpoint()).toEqual(saved);
  });
});

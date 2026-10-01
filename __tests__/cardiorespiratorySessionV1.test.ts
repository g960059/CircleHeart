import { describe, expect, it, vi } from 'vitest';
import { CardiorespiratorySessionV1, type CardiorespiratoryStateV1 } from '../engine/cardiorespiratory/CardiorespiratorySessionV1';
import { DEFAULT_CARDIORESPIRATORY_FIXTURE_V1, validateAndOwnCardiorespiratoryFixtureV1 } from '../engine/cardiorespiratory/CardiorespiratoryFixtureV1';
import { cardiorespiratoryPhysicalBloodVolumesV1, cardiorespiratoryAcceptedBloodTransfersV1 } from '../engine/cardiorespiratory/CardiorespiratoryBloodNetworkV1';
import { bloodGasAmountsFromPressuresV1 } from '../engine/cardiorespiratory/BloodGasChemistryV1';
import { advanceConservativeGasTransportV1 } from '../engine/cardiorespiratory/ConservativeGasTransportV1';
import { createMainWireIntegratedModelStaticCaseFixtureV1 } from '../engine/myocardium/experiments/MainWireIntegratedModelStaticCaseFixtureV1';
import { stepMainWireIntegratedModelCoupledV1 } from '../engine/vnext/coupled/MainWireIntegratedCoupledStepV1';
import { createMainWireFiveWallCoupledNewtonShadowWorkspaceV1 } from '../engine/vnext/coupled/MainWireFiveWallCoupledNewtonShadowV1';
import { createMainWireFiveWallCoupledResidualWorkspaceV1 } from '../engine/myocardium/MainWireFiveWallCoronaryTransactionV2';
import { createCardiorespiratoryDevReleaseV1 } from '../studio/integrations/cardiorespiratoryV1/CardiorespiratoryExactModelV1';
import * as pulmonaryExchange from '../engine/cardiorespiratory/PulmonaryGasExchangeV1';

function total(state: CardiorespiratoryStateV1) {
  return [...Object.values(state.blood), ...state.respiratory.unitGasMol, state.respiratory.conductingGasMol, state.systemic.amount, state.myocardium.amount]
    .reduce((sum, a) => ({ o2Mol: sum.o2Mol + a.o2Mol, co2Mol: sum.co2Mol + a.co2Mol }), { o2Mol: 0, co2Mol: 0 });
}
function run(dt: number, until = 0.04) {
  const session = CardiorespiratorySessionV1.create();
  for (let i = 1; i <= Math.round(until / dt); i += 1) session.advanceToPresentationTime(i * dt);
  return session;
}
function inventoryVector(state: CardiorespiratoryStateV1) {
  return [...Object.values(state.blood), ...state.respiratory.unitGasMol, state.respiratory.conductingGasMol, state.systemic.amount, state.myocardium.amount]
    .flatMap(a => [a.o2Mol, a.co2Mol]);
}

describe('development cardiorespiratory exact session', () => {
  it('advances with an independently summed whole-model gas ledger', () => {
    const session = CardiorespiratorySessionV1.create();
    const before = total(session.cardiorespiratoryState());
    const result = session.advanceToPresentationTime(0.02);
    expect(result.acceptedTimeSec).toBe(0.02);
    const state = session.cardiorespiratoryState();
    const after = total(state);
    expect(after.o2Mol - before.o2Mol).toBeCloseTo(state.ledger.boundaryO2Mol - state.ledger.consumedO2Mol, 12);
    expect(after.co2Mol - before.co2Mol).toBeCloseTo(state.ledger.boundaryCo2Mol + state.ledger.producedCo2Mol, 12);
    expect(state.ledger.consumedO2Mol).toBeGreaterThan(0);
    expect(state.systemic.cumulativeUnmetO2Mol).toBe(0);
    expect(state.myocardium.cumulativeUnmetO2Mol).toBe(0);
  });
  it('rejects omitted, surplus and mistyped exact checkpoint fields before layout binding', () => {
    const session = CardiorespiratorySessionV1.create();
    const checkpoint = () => JSON.parse(JSON.stringify(session.checkpoint()));
    const extra = checkpoint();
    extra.state.cardiorespiratory.ledger.hiddenStore = 0;
    expect(() => CardiorespiratorySessionV1.restore(session.fixture, extra)).toThrow(/shape/);
    const missing = checkpoint();
    delete missing.state.cardiorespiratory.readback.pulmonaryFlow1MlSec;
    expect(() => CardiorespiratorySessionV1.restore(session.fixture, missing)).toThrow(/shape/);
    const mistyped = checkpoint();
    mistyped.state.cardiorespiratory.respiratory.airwayOpenByUnit[0] = 1;
    expect(() => CardiorespiratorySessionV1.restore(session.fixture, mistyped)).toThrow(/boolean/);
    const envelope = checkpoint();
    envelope.extra = true;
    expect(() => CardiorespiratorySessionV1.restore(session.fixture, envelope)).toThrow(/shape/);
    const beat = checkpoint();
    beat.completedBeatMetrics = { arbitrary: 1 };
    expect(() => CardiorespiratorySessionV1.restore(session.fixture, beat)).toThrow();
  });
  it('continues identically after a JSON checkpoint round trip', () => {
    const original = run(0.002, 0.012);
    const copied = CardiorespiratorySessionV1.restore(original.fixture, JSON.parse(JSON.stringify(original.checkpoint())));
    original.advanceToPresentationTime(0.03);
    copied.advanceToPresentationTime(0.03);
    expect(copied.snapshotAcceptedStateBytes()).toEqual(original.snapshotAcceptedStateBytes());
    expect(copied.checkpoint()).toEqual(original.checkpoint());
  });
  it('preserves all primitive selected outputs immediately after JSON restore and on continuation', () => {
    const outputIds = createCardiorespiratoryDevReleaseV1().manifest.primitiveSignalCatalog.map(output => output.outputId);
    const original = run(.002, .02);
    const before = original.projectValues(outputIds);
    for (const id of ['hemodynamics.pressure.absolute.Ao', 'hemodynamics.flow.valve.AoV', 'coronary.flow.total']) {
      expect(before[id]?.availability, id).toBe('available');
    }
    const restored = CardiorespiratorySessionV1.restore(original.fixture, JSON.parse(JSON.stringify(original.checkpoint())));
    expect(restored.projectValues(outputIds)).toEqual(before);
    original.advanceToPresentationTime(.03);
    restored.advanceToPresentationTime(.03);
    expect(restored.projectValues(outputIds)).toEqual(original.projectValues(outputIds));
    expect(restored.checkpoint()).toEqual(original.checkpoint());
  });
  it('rejects stale or malformed numerical readback and invalidates it across a warm fixture edit', () => {
    const original = run(.002, .006);
    for (const mutation of [
      (r: { acceptedRevision: number; values: number[]; available: boolean }) => { r.acceptedRevision++; },
      (r: { acceptedRevision: number; values: number[]; available: boolean }) => { r.values[0] += .1; },
      (r: { acceptedRevision: number; values: number[]; available: boolean }) => { r.values[1] += 1; },
      (r: { acceptedRevision: number; values: number[]; available: boolean }) => { r.values[5] = NaN; },
      (r: { acceptedRevision: number; values: number[]; available: boolean }) => { r.available = false; },
    ]) {
      const checkpoint = JSON.parse(JSON.stringify(original.checkpoint()));
      mutation(checkpoint.state.cardiorespiratory.hemodynamicReadback);
      expect(() => CardiorespiratorySessionV1.restore(original.fixture, checkpoint)).toThrow(/readback/i);
    }
    const target = { ...original.fixture, cardiorespiratory: { ...original.fixture.cardiorespiratory, systemicDemandMlMin: 200 } };
    const edited = original.reconfigure(target);
    expect(edited.cardiorespiratoryState().hemodynamicReadback.available).toBe(false);
    expect(edited.cardiorespiratoryState().hemodynamicReadback.values.every(value => value === 0)).toBe(true);
    expect(edited.projectValues(['hemodynamics.pressure.absolute.Ao'])['hemodynamics.pressure.absolute.Ao']?.availability)
      .toBe('not-evaluated-at-accepted-state');
    const copy = CardiorespiratorySessionV1.restore(edited.fixture, JSON.parse(JSON.stringify(edited.checkpoint())));
    expect(copy.projectValues(['hemodynamics.pressure.absolute.Ao'])).toEqual(edited.projectValues(['hemodynamics.pressure.absolute.Ao']));
    edited.advanceToPresentationTime(.008);
    expect(edited.cardiorespiratoryState().hemodynamicReadback.available).toBe(true);
  });
  it('rolls back the candidate numerical readback when a later gas owner rejects the step', () => {
    const original = run(.002, .006), checkpoint = original.checkpoint(), bytes = original.snapshotAcceptedStateBytes();
    const outputIds = createCardiorespiratoryDevReleaseV1().manifest.primitiveSignalCatalog.map(output => output.outputId);
    const outputs = original.projectValues(outputIds);
    const failure = vi.spyOn(pulmonaryExchange, 'exchangePerfusedBloodWithAlveolarGasV1')
      .mockImplementation(() => { throw new Error('injected post-hemodynamic gas rejection'); });
    try { expect(() => original.advanceToPresentationTime(.008)).toThrow('injected post-hemodynamic gas rejection'); }
    finally { failure.mockRestore(); }
    expect(original.checkpoint()).toEqual(checkpoint);
    expect(original.snapshotAcceptedStateBytes()).toEqual(bytes);
    expect(original.projectValues(outputIds)).toEqual(outputs);
    original.advanceToPresentationTime(.008);
    expect(original.cardiorespiratoryState().hemodynamicReadback.available).toBe(true);
    expect(original.cardiorespiratoryState().hemodynamicReadback.values[0]).toBe(.008);
  });
  it('rejects forged finite gas readbacks while preserving last-interval uptake across warm demand edits', () => {
    const session = run(0.002, 0.01);
    for (const key of ['oxygenBalanceResidualMol', 'co2BalanceResidualMol', 'systemicConsumptionMlMin', 'myocardialConsumptionMlMin']) {
      const checkpoint = JSON.parse(JSON.stringify(session.checkpoint()));
      checkpoint.state.cardiorespiratory.readback[key] = 1e6;
      expect(() => CardiorespiratorySessionV1.restore(session.fixture, checkpoint)).toThrow(/readback|consumption/);
    }
    const fixture = { ...session.fixture, cardiorespiratory: { ...session.fixture.cardiorespiratory,
      systemicDemandMlMin: 0, myocardialDemandMlMin: 0 } };
    const changed = session.reconfigure(fixture);
    expect(changed.cardiorespiratoryState().readback.systemicConsumptionMlMin).toBe(225);
    changed.advanceToPresentationTime(0.012);
    expect(changed.cardiorespiratoryState().readback.systemicConsumptionMlMin).toBe(0);
    expect(changed.cardiorespiratoryState().readback.myocardialConsumptionMlMin).toBe(0);
  });
  it('conserves all gas in closed airways with zero metabolism while blood and tissue exchange continues', () => {
    const fixture = { ...DEFAULT_CARDIORESPIRATORY_FIXTURE_V1, cardiorespiratory: {
      ...DEFAULT_CARDIORESPIRATORY_FIXTURE_V1.cardiorespiratory,
      systemicDemandMlMin: 0, myocardialDemandMlMin: 0,
    } };
    const original = CardiorespiratorySessionV1.create(fixture);
    const checkpoint = structuredClone(original.checkpoint());
    const respiratory = checkpoint.state.cardiorespiratory.respiratory;
    // No recruitment law is enabled, so initially closed airways stay sealed.
    Object.assign(respiratory, { airwayOpenByUnit: [false, false], recruitmentProgress01ByUnit: [0, 0] });
    const closed = CardiorespiratorySessionV1.restore(fixture, checkpoint);
    const before = closed.cardiorespiratoryState();
    closed.advanceToPresentationTime(0.02);
    const after = closed.cardiorespiratoryState();
    expect(after.ledger.boundaryO2Mol).toBe(0);
    expect(after.ledger.boundaryCo2Mol).toBe(0);
    expect(after.ledger.consumedO2Mol).toBe(0);
    expect(after.ledger.producedCo2Mol).toBe(0);
    expect(total(after).o2Mol).toBeCloseTo(total(before).o2Mol, 13);
    expect(total(after).co2Mol).toBeCloseTo(total(before).co2Mol, 13);
    expect(after.systemic.amount.o2Mol).not.toBe(before.systemic.amount.o2Mol);
    expect(after.respiratory.unitGasMol[0].o2Mol).not.toBe(before.respiratory.unitGasMol[0].o2Mol);
  });
  it('reports the signed O2 flux using the accepted aortic upwind blood content', () => {
    const session = CardiorespiratorySessionV1.create();
    session.advanceToPresentationTime(0.2);
    const state = session.cardiorespiratoryState();
    const volumes = cardiorespiratoryPhysicalBloodVolumesV1(session.currentAcceptedState());
    const q = state.readback.cardiacFlowMlSec;
    expect(q).toBeGreaterThan(0);
    const donor = q >= 0 ? 'LV' : 'Ao';
    // Neither LV nor Ao participates in the subsequent lung/tissue exchange.
    expect(state.readback.aorticOxygenFluxMolPerSec).toBeCloseTo(q * state.blood[donor].o2Mol / volumes[donor], 14);
  });
  it('converges in gas inventories with 2 ms, 1 ms and 0.5 ms coupled steps', () => {
    const coarse = inventoryVector(run(0.002).cardiorespiratoryState());
    const fine = inventoryVector(run(0.001).cardiorespiratoryState());
    const reference = inventoryVector(run(0.0005).cardiorespiratoryState());
    const distance = (values: number[]) => values.reduce((sum, v, i) => sum + Math.abs(v - reference[i]), 0);
    expect(distance(coarse)).toBeGreaterThan(1e-12);
    expect(distance(fine)).toBeLessThan(distance(coarse) * 0.7);
  });
  it('keeps exact gas intervention ledgers during a warm blood-volume change', () => {
    const session = run(0.002, 0.012);
    const before = session.cardiorespiratoryState();
    const target = {
      ...session.fixture,
      hemodynamicResearchInputs: { ...session.fixture.hemodynamicResearchInputs,
        totalBloodVolumeMl: session.fixture.hemodynamicResearchInputs.totalBloodVolumeMl + 100 },
    };
    const changed = session.reconfigure(target);
    const after = changed.cardiorespiratoryState();
    expect(changed.currentAcceptedState().acceptedTimeSec).toBe(session.currentAcceptedState().acceptedTimeSec);
    expect(total(after).o2Mol - total(before).o2Mol).toBeCloseTo(after.ledger.interventionO2Mol - before.ledger.interventionO2Mol, 13);
    expect(total(after).co2Mol - total(before).co2Mol).toBeCloseTo(after.ledger.interventionCo2Mol - before.ledger.interventionCo2Mol, 13);
    expect(after.ledger.interventionO2Mol).toBeGreaterThan(0);
    changed.advanceToPresentationTime(0.02);
    expect(Math.abs(changed.cardiorespiratoryState().readback.oxygenBalanceResidualMol)).toBeLessThan(1e-10);
  });
  it('represents supply-limited actual consumption separately from demand in an admissible hypoxic seed', () => {
    const fixture = { ...DEFAULT_CARDIORESPIRATORY_FIXTURE_V1, cardiorespiratory: {
      ...DEFAULT_CARDIORESPIRATORY_FIXTURE_V1.cardiorespiratory,
      systemicDemandMlMin: 2000, myocardialDemandMlMin: 250,
    } };
    const session = CardiorespiratorySessionV1.create(fixture);
    // A deliberately hypoxic initial condition, not an unledgered runtime edit.
    const checkpoint = JSON.parse(JSON.stringify(session.checkpoint()));
    const cr = checkpoint.state.cardiorespiratory;
    const volumes = cardiorespiratoryPhysicalBloodVolumesV1(checkpoint.state);
    for (const [id, volume] of Object.entries(volumes)) cr.blood[id] = bloodGasAmountsFromPressuresV1(volume, { o2MmHg: 0.1, co2MmHg: 46 }, fixture.cardiorespiratory.bloodGas);
    cr.systemic.amount.o2Mol = 0;
    cr.myocardium.amount.o2Mol = 0;
    cr.ledger.initialO2Mol = total(cr).o2Mol;
    cr.ledger.initialCo2Mol = total(cr).co2Mol;
    const hypoxic = CardiorespiratorySessionV1.restore(fixture, checkpoint);
    hypoxic.advanceToPresentationTime(0.002);
    const result = hypoxic.cardiorespiratoryState();
    expect(result.readback.systemicConsumptionMlMin).toBeLessThan(2000);
    expect(result.readback.myocardialConsumptionMlMin).toBeLessThan(250);
    expect(result.systemic.cumulativeUnmetO2Mol).toBeGreaterThan(0);
    expect(result.myocardium.cumulativeUnmetO2Mol).toBeGreaterThan(0);
    expect(Math.abs(result.readback.oxygenBalanceResidualMol)).toBeLessThan(1e-10);
  });
  it('reopens only a disabled recruitment unit while preserving its trapped gas', () => {
    const base = DEFAULT_CARDIORESPIRATORY_FIXTURE_V1;
    const unit = base.cardiorespiratory.respiratory.units[0];
    const enabled = { ...unit, recruitment: { openingTranspulmonaryPressureCmH2O: 100,
      closingTranspulmonaryPressureCmH2O: 20, openingTimeSec: .1, closingTimeSec: .1 } };
    const fixture = { ...base, cardiorespiratory: { ...base.cardiorespiratory, respiratory: {
      ...base.cardiorespiratory.respiratory, units: [enabled, enabled] as const } } };
    const seed = CardiorespiratorySessionV1.create(fixture);
    const checkpoint = structuredClone(seed.checkpoint());
    Object.assign(checkpoint.state.cardiorespiratory.respiratory,
      { airwayOpenByUnit: [false, false], recruitmentProgress01ByUnit: [.2, .3] });
    const source = CardiorespiratorySessionV1.restore(fixture, checkpoint);
    const target = { ...fixture, cardiorespiratory: { ...fixture.cardiorespiratory, respiratory: {
      ...fixture.cardiorespiratory.respiratory, units: [unit, enabled] as const } } };
    const changed = source.reconfigure(target);
    const before = source.cardiorespiratoryState().respiratory, after = changed.cardiorespiratoryState().respiratory;
    expect(after.airwayOpenByUnit).toEqual([true, false]);
    expect(after.recruitmentProgress01ByUnit).toEqual([1, .3]);
    expect(after.unitGasMol).toEqual(before.unitGasMol);
    expect(after.timeSec).toBe(before.timeSec);
    expect(source.cardiorespiratoryState().respiratory.airwayOpenByUnit).toEqual([false, false]);
    changed.advanceToPresentationTime(.002);
    expect(changed.respiratoryOutput().airwayOpenByUnit).toEqual([true, false]);
    expect(Math.abs(changed.cardiorespiratoryState().readback.oxygenBalanceResidualMol)).toBeLessThan(1e-10);
  });
  it('cold-restarts a conducting-capacity edit rather than silently adding or deleting airway gas', () => {
    const source = run(.002, .004), before = source.checkpoint();
    const target = { ...source.fixture, cardiorespiratory: { ...source.fixture.cardiorespiratory,
      respiratory: { ...source.fixture.cardiorespiratory.respiratory, conductingDeadspaceVolumeL: 0 } } };
    const changed = source.reconfigure(target);
    expect(changed.currentAcceptedState().acceptedTimeSec).toBe(0);
    expect(changed.cardiorespiratoryState().respiratory.conductingGasMol).toEqual({ o2Mol: 0, co2Mol: 0, inertMol: 0 });
    expect(source.checkpoint()).toEqual(before);
    expect(total(changed.cardiorespiratoryState()).o2Mol).toBeCloseTo(changed.cardiorespiratoryState().ledger.initialO2Mol, 14);
  });
  it('rejects invalid fixture respiratory quotient and malformed gas checkpoints', () => {
    const bad = { ...DEFAULT_CARDIORESPIRATORY_FIXTURE_V1, cardiorespiratory: {
      ...DEFAULT_CARDIORESPIRATORY_FIXTURE_V1.cardiorespiratory, respiratoryQuotient: 1.25,
    } };
    expect(() => validateAndOwnCardiorespiratoryFixtureV1(bad)).toThrow();
    const session = CardiorespiratorySessionV1.create();
    const checkpoint = JSON.parse(JSON.stringify(session.checkpoint()));
    checkpoint.state.cardiorespiratory.ledger.boundaryO2Mol = NaN;
    expect(() => CardiorespiratorySessionV1.restore(session.fixture, checkpoint)).toThrow(/finite/i);
  });
  it('preserves a uniform tracer using the actual accepted noncoronary AND coronary BE transfers', () => {
    const fixture = DEFAULT_CARDIORESPIRATORY_FIXTURE_V1;
    const runtime = createMainWireIntegratedModelStaticCaseFixtureV1(fixture.anatomyId, fixture.hemodynamicResearchInputs, 1, fixture.mechanismResearchInputs);
    const before = runtime.cold.acceptedState;
    const step = stepMainWireIntegratedModelCoupledV1(runtime.provider, before, {
      candidateTimeSec: 0.002,
      coronary: runtime.coronaryStepInput,
      rhythm: { configuration: runtime.rhythm.configuration, externalAfNextBoundaryTimeSec: null, externalAtrialSourceBatch: null },
      dynamicMechanicalSupport: { config: runtime.config, profile: runtime.profile },
    }, createMainWireFiveWallCoupledNewtonShadowWorkspaceV1(), { residualWorkspace: createMainWireFiveWallCoupledResidualWorkspaceV1() });
    if (step.converged === false) throw new Error(step.message);
    const beforeV = cardiorespiratoryPhysicalBloodVolumesV1(before);
    const afterV = cardiorespiratoryPhysicalBloodVolumesV1(step.acceptedState);
    const transfers = cardiorespiratoryAcceptedBloodTransfersV1(step);
    const result = advanceConservativeGasTransportV1(Object.keys(beforeV).map(id => ({
      id, volumeBeforeMl: beforeV[id], volumeAfterMl: afterV[id],
      amount: { o2Mol: beforeV[id] * 1e-5, co2Mol: beforeV[id] * 2e-5 },
    })), transfers, { volumeBalanceToleranceMl: 2e-5 });
    let maximumRelativeError = 0;
    for (const [id, amount] of Object.entries(result.amountsById)) {
      maximumRelativeError = Math.max(maximumRelativeError, Math.abs(amount.o2Mol / afterV[id] / 1e-5 - 1));
    }
    const volumeResidualById = { ...beforeV };
    for (const transfer of transfers) {
      volumeResidualById[transfer.from] -= transfer.volumeMl;
      volumeResidualById[transfer.to] += transfer.volumeMl;
    }
    const maximumVolumeResidualMl = Math.max(...Object.keys(afterV).map(id => Math.abs(volumeResidualById[id] - afterV[id])));
    expect(maximumVolumeResidualMl).toBeLessThan(1e-8);
    expect(maximumRelativeError).toBeLessThan(1e-10);
    expect(result.conservationResidualMol.o2Mol).toBeCloseTo(0, 13);
    expect(result.conservationResidualMol.co2Mol).toBeCloseTo(0, 13);
  });
});

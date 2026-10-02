import { describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { hotPathIntegrityTierV1, selectHotPathIntegrityTierV1, type HotPathIntegrityTierV1 } from '../engine/hotPathIntegrityTierV1';
import { validationStampModeV1, selectValidationStampModeV1, type ValidationStampModeV1 } from '../engine/validationStampModeV1';
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
import * as bloodGasChemistry from '../engine/cardiorespiratory/BloodGasChemistryV1';
import * as respiratoryMechanics from '../engine/cardiorespiratory/RespiratoryMechanicsV1';
import * as integratedTransaction from '../engine/myocardium/MainWireIntegratedModelTransactionV3';
import * as typedOrdinary from '../engine/vnext/MainWireTypedOrdinaryCandidateV1';
import * as coupledStep from '../engine/vnext/coupled/MainWireIntegratedCoupledStepV1';
import { TransactionalTypedStateImageV1 } from '../engine/vnext/TransactionalTypedStateImageV1';

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
  it('binds restored immutable device roots to the runtime-owned roots before repeated accepted staging', () => {
    const original = run(.002, .006);
    const checkpoint = JSON.parse(JSON.stringify(original.checkpoint()));
    const forceRaw = vi.spyOn(typedOrdinary, 'isMainWireTypedOrdinaryCandidateV1').mockReturnValue(false);
    const complete = TransactionalTypedStateImageV1.prototype.completeCandidateFromObject;
    const matches: { identity: number; canonical: number }[] = [];
    const monitor = vi.spyOn(TransactionalTypedStateImageV1.prototype, 'completeCandidateFromObject').mockImplementation(function (
      this: TransactionalTypedStateImageV1<unknown>, candidate: unknown,
      plan: Parameters<TransactionalTypedStateImageV1<unknown>["completeCandidateFromObject"]>[1],
    ) {
      const before = this.report();
      const admitted = complete.call(this, candidate, plan);
      const after = this.report();
      matches.push({ identity: after.externalImmutableIdentityMatchCount - before.externalImmutableIdentityMatchCount,
        canonical: after.externalImmutableCanonicalMatchCount - before.externalImmutableCanonicalMatchCount });
      return admitted;
    });
    try {
      const restored = CardiorespiratorySessionV1.restore(original.fixture, checkpoint);
      matches.length = 0;
      restored.advanceToPresentationTime(.016);
      expect(matches.length).toBeGreaterThanOrEqual(5);
      expect(matches.every(match => match.identity > 0 && match.canonical === 0), JSON.stringify(matches)).toBe(true);
      original.advanceToPresentationTime(.016);
      expect(restored.checkpoint()).toEqual(original.checkpoint());
    } finally { monitor.mockRestore(); forceRaw.mockRestore(); }
  });
  it('rejects modified nested device bindings before rebinding a restored checkpoint to trusted runtime roots', () => {
    const original = run(.002, .006);
    const checkpoint = () => JSON.parse(JSON.stringify(original.checkpoint()));
    const alteredInertance = checkpoint();
    const inertance = alteredInertance.state.dynamicMechanicalSupport.inertanceProfileSnapshot.inertanceByDevice.LVAD;
    const inertanceKey = Object.keys(inertance).find(key => typeof inertance[key] === 'number')!;
    expect(inertanceKey).toBeDefined();
    inertance[inertanceKey] += 1;
    expect(() => CardiorespiratorySessionV1.restore(original.fixture, alteredInertance)).toThrow(/inertance|profile/i);
    const alteredHydraulics = checkpoint();
    alteredHydraulics.state.dynamicMechanicalSupport.structuralHydraulicProjection.byDevice.LVAD.maximumReverseFlowLMin += 1;
    expect(() => CardiorespiratorySessionV1.restore(original.fixture, alteredHydraulics)).toThrow(/structural|hydraulic/i);
    const surplus = checkpoint();
    surplus.state.dynamicMechanicalSupport.structuralHydraulicProjection.byDevice.LVAD.hiddenResistance = 1;
    expect(() => CardiorespiratorySessionV1.restore(original.fixture, surplus)).toThrow();
  });
  it('retains restored noncanonical device flows instead of replacing them with the cold live tuple', () => {
    const session = CardiorespiratorySessionV1.create();
    const checkpoint = JSON.parse(JSON.stringify(session.checkpoint()));
    checkpoint.state.dynamicMechanicalSupport.acceptedFlowMlPerSec.LVAD = 1.25;
    checkpoint.state.dynamicMechanicalSupport.acceptedFlowMlPerSec.IMPELLA = -.25;
    const restored = CardiorespiratorySessionV1.restore(session.fixture, checkpoint);
    const flows = restored.currentAcceptedState().dynamicMechanicalSupport.acceptedFlowMlPerSec;
    expect(flows.LVAD).toBe(1.25);
    expect(flows.IMPELLA).toBe(-.25);
    expect(restored.checkpoint().state.dynamicMechanicalSupport.acceptedFlowMlPerSec.LVAD).toBe(1.25);
    restored.advanceToPresentationTime(.002);
    // The disabled device owner makes this transition in its accepted step.
    expect(restored.currentAcceptedState().dynamicMechanicalSupport.acceptedFlowMlPerSec.LVAD).toBe(0);
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
  it('projects each primitive independently with identical values at cold, accepted and warm-edited boundaries', () => {
    const outputIds = createCardiorespiratoryDevReleaseV1().manifest.primitiveSignalCatalog.map(output => output.outputId);
    const session = CardiorespiratorySessionV1.create();
    const check = (current: CardiorespiratorySessionV1) => {
      const bytes = current.snapshotAcceptedStateBytes();
      const full = current.projectValues(outputIds);
      for (const id of outputIds) expect(current.projectValues([id]), id).toEqual({ [id]: full[id] });
      expect(current.projectValues([])).toEqual({});
      expect(current.snapshotAcceptedStateBytes()).toEqual(bytes);
    };
    check(session);
    session.advanceToPresentationTime(.006);
    check(session);
    check(session.reconfigure({ ...session.fixture,
      cardiorespiratory: { ...session.fixture.cardiorespiratory, systemicDemandMlMin: 200 } }));
  });
  it('evaluates gas inversions and respiratory mechanics only for selected signal families', () => {
    const session = run(.002, .006);
    const chemistry = vi.spyOn(bloodGasChemistry, 'bloodGasPressuresFromAmountsV1');
    const mechanics = vi.spyOn(respiratoryMechanics, 'evaluateRespiratoryMechanicsV1');
    try {
      session.projectValues(['hemodynamics.pressure.absolute.Ao', 'cardiorespiratory.oxygen.demand']);
      expect(chemistry).not.toHaveBeenCalled();
      expect(mechanics).not.toHaveBeenCalled();
      session.projectValues(['cardiorespiratory.pressure.airway', 'cardiorespiratory.volume.lung']);
      expect(mechanics).toHaveBeenCalledTimes(1);
      expect(chemistry).not.toHaveBeenCalled();
      session.projectValues(['cardiorespiratory.gas.pressure.arterial-o2', 'cardiorespiratory.gas.ph.arterial']);
      expect(chemistry).toHaveBeenCalledTimes(1);
      session.projectValues(['cardiorespiratory.gas.pressure.mixed-venous-co2', 'cardiorespiratory.gas.saturation.mixed-venous-o2']);
      expect(chemistry).toHaveBeenCalledTimes(2);
      expect(mechanics).toHaveBeenCalledTimes(1);
    } finally { chemistry.mockRestore(); mechanics.mockRestore(); }
  });
  it('projects admitted numerical readback without materializing sibling owners and retains the unavailable fallback', () => {
    const outputIds = createCardiorespiratoryDevReleaseV1().manifest.primitiveSignalCatalog.map(output => output.outputId);
    const session = run(.002, .006);
    const expected = session.projectValues(outputIds), expectedState = session.cardiorespiratoryState();
    const bytes = session.snapshotAcceptedStateBytes();
    const fullRead = vi.spyOn(TransactionalTypedStateImageV1.prototype, 'rehydrateCurrent');
    try {
      expect(session.projectValues(outputIds)).toEqual(expected);
      expect(session.cardiorespiratoryState()).toEqual(expectedState);
      expect(fullRead).not.toHaveBeenCalled();
      expect(session.snapshotAcceptedStateBytes()).toEqual(bytes);
      const cold = CardiorespiratorySessionV1.create();
      fullRead.mockClear();
      cold.projectValues(outputIds);
      expect(fullRead).toHaveBeenCalledTimes(1);
      fullRead.mockClear();
      cold.projectValues(['cardiorespiratory.gas.pressure.arterial-o2']);
      expect(fullRead).not.toHaveBeenCalled();
    } finally { fullRead.mockRestore(); }
  });
  it('returns detached scalar clocks and state snapshots while retaining the private accepted authority', () => {
    const session = run(.002, .006), reference = run(.002, .006);
    const clock = session.currentAcceptedClock(), hemo = session.currentAcceptedState();
    expect(clock).toEqual({ acceptedTimeSec: hemo.acceptedTimeSec, revision: hemo.revision });
    const bytes = session.snapshotAcceptedStateBytes();
    Object.assign(clock, { acceptedTimeSec: 10, revision: 999 });
    expect(() => Object.assign(hemo.coronary.circulation.nodeVolumesMl, { Ao: 0 })).toThrow(TypeError);
    const gas = session.cardiorespiratoryState();
    expect(() => Object.assign(gas.blood.Ao, { o2Mol: 0 })).toThrow(TypeError);
    expect(() => Object.assign(gas.respiratory.conductingGasMol, { co2Mol: 10 })).toThrow(TypeError);
    expect(session.snapshotAcceptedStateBytes()).toEqual(bytes);
    expect(session.currentAcceptedClock()).toEqual(reference.currentAcceptedClock());
    session.advanceToPresentationTime(.008);
    reference.advanceToPresentationTime(.008);
    expect(session.checkpoint()).toEqual(reference.checkpoint());
  });
  it('retains raw fallback entry admission while avoiding an extra public wrap for its private typed adapter', () => {
    const session = run(.002, .006);
    const forceRaw = vi.spyOn(typedOrdinary, 'isMainWireTypedOrdinaryCandidateV1').mockReturnValue(false);
    const wrap = vi.spyOn(integratedTransaction, 'wrapMainWireIntegratedModelAcceptedStateV3');
    try {
      session.advanceToPresentationTime(.008);
      expect(wrap).not.toHaveBeenCalled();
      session.currentAcceptedState();
      expect(wrap).toHaveBeenCalledTimes(1);
      const before = session.checkpoint(), step = coupledStep.stepMainWireIntegratedModelCoupledV1;
      const corruptEntry = vi.spyOn(coupledStep, 'stepMainWireIntegratedModelCoupledV1')
        .mockImplementation((provider, state, ...args) => step(provider, { ...state, revision: state.revision + 1 }, ...args));
      try {
        expect(() => session.advanceToPresentationTime(.010)).toThrow(/owner clocks differ/);
        expect(session.checkpoint()).toEqual(before);
      } finally { corruptEntry.mockRestore(); }
      session.advanceToPresentationTime(.010);
      expect(session.currentAcceptedClock().acceptedTimeSec).toBe(.010);
    } finally { wrap.mockRestore(); forceRaw.mockRestore(); }
  });
  it('keeps the same coupled numerical path byte-identical across integrity tiers and disabled validation stamps', () => {
    const previousTier = hotPathIntegrityTierV1(), previousStamps = validationStampModeV1();
    const outputIds = createCardiorespiratoryDevReleaseV1().manifest.primitiveSignalCatalog.map(output => output.outputId);
    const bytesHash = (session: CardiorespiratorySessionV1) => {
      const hash = createHash('sha256');
      for (const [key, array] of Object.entries(session.snapshotAcceptedStateBytes())) {
        hash.update(key);
        hash.update(new Uint8Array(array.buffer, array.byteOffset, array.byteLength));
      }
      return hash.digest('hex');
    };
    const runTier = (tier: HotPathIntegrityTierV1, stamps: ValidationStampModeV1) => {
      selectHotPathIntegrityTierV1(tier);
      selectValidationStampModeV1(stamps);
      let session = CardiorespiratorySessionV1.create();
      const trace: unknown[] = [], rhythmEventSteps: number[] = [];
      let previousCaptures = 0;
      for (let ordinal = 1; ordinal <= 700; ordinal++) {
        const target = ordinal * .002;
        if (ordinal === 257) {
          session = session.reconfigure({ ...session.fixture,
            cardiorespiratory: { ...session.fixture.cardiorespiratory, systemicDemandMlMin: 200 } });
          expect(session.cardiorespiratoryState().hemodynamicReadback.available).toBe(false);
        }
        if (ordinal === 451) {
          const checkpoint = JSON.parse(JSON.stringify(session.checkpoint()));
          const before = session.projectValues(outputIds);
          session = CardiorespiratorySessionV1.restore(session.fixture, checkpoint);
          expect(session.projectValues(outputIds)).toEqual(before);
          const malformed = JSON.parse(JSON.stringify(checkpoint));
          malformed.state.cardiorespiratory.blood.Ao.o2Mol = -1;
          expect(() => CardiorespiratorySessionV1.restore(session.fixture, malformed)).toThrow(/blood gas inventory/);
        }
        if (ordinal === 501) {
          const before = session.checkpoint(), acceptedBytes = bytesHash(session), values = session.projectValues(outputIds);
          const failure = vi.spyOn(pulmonaryExchange, 'exchangePerfusedBloodWithAlveolarGasV1')
            .mockImplementation(() => { throw new Error('tier qualification post-hemodynamic rejection'); });
          try { expect(() => session.advanceToPresentationTime(target)).toThrow('tier qualification post-hemodynamic rejection'); }
          finally { failure.mockRestore(); }
          expect(session.checkpoint()).toEqual(before);
          expect(bytesHash(session)).toBe(acceptedBytes);
          expect(session.projectValues(outputIds)).toEqual(values);
        }
        const result = session.advanceToPresentationTime(target);
        const values = session.projectValues(outputIds);
        const rhythm = session.currentAcceptedState().composedRhythm;
        const captures = rhythm.acceptedAtrialCaptureCount + rhythm.acceptedVentricularCaptureCount;
        if (captures !== previousCaptures) rhythmEventSteps.push(ordinal);
        previousCaptures = captures;
        trace.push({ result, state: bytesHash(session), values,
          rhythmRevision: rhythm.revision, captures, deposits: rhythm.deliveredCalciumDepositCount });
      }
      expect(rhythmEventSteps.length).toBeGreaterThan(1);
      expect(trace.some(item => (item as { result: { internalAcceptedSubstepCount: number } }).result.internalAcceptedSubstepCount > 1)).toBe(true);
      const checkpoint = session.checkpoint();
      const respiratory = session.fixture.cardiorespiratory.respiratory;
      const restarted = session.reconfigure({ ...session.fixture, cardiorespiratory: { ...session.fixture.cardiorespiratory,
        respiratory: { ...respiratory, conductingDeadspaceVolumeL: respiratory.conductingDeadspaceVolumeL + .01 } } });
      expect(restarted.currentAcceptedClock()).toEqual({ acceptedTimeSec: 0, revision: 0 });
      expect(restarted.cardiorespiratoryState().hemodynamicReadback.available).toBe(false);
      restarted.advanceToPresentationTime(.02);
      return { trace, rhythmEventSteps, checkpoint, restart: { checkpoint: restarted.checkpoint(),
        values: restarted.projectValues(outputIds), state: bytesHash(restarted) } };
    };
    try {
      const full = runTier('full-invariant', 'validation-stamps-enabled');
      for (const stamps of ['validation-stamps-enabled', 'validation-stamps-disabled'] as const) {
        const lean = runTier('hot-path-lean', stamps);
        for (let i = 0; i < full.trace.length; i++) expect(lean.trace[i], `${stamps}, step ${i + 1}`).toEqual(full.trace[i]);
        expect(lean.rhythmEventSteps).toEqual(full.rhythmEventSteps);
        expect(lean.checkpoint).toEqual(full.checkpoint);
        expect(lean.restart).toEqual(full.restart);
      }
    } finally {
      selectValidationStampModeV1(previousStamps);
      selectHotPathIntegrityTierV1(previousTier);
    }
  }, 60_000);
  it('persists cubic predictor history for exact continuation and resets at edited or clipped boundaries', () => {
    const session = run(.002, .04);
    const checkpoint = session.checkpoint();
    expect(checkpoint.schemaId).toBe('circleheart-cardiorespiratory-checkpoint-v2');
    expect(checkpoint.coupledPredictor.history.historyDepth).toBeGreaterThan(0);
    expect(session.solverWorkReport().cubicSolves).toBeGreaterThan(0);
    const restored = CardiorespiratorySessionV1.restore(session.fixture, JSON.parse(JSON.stringify(checkpoint)));
    session.advanceToPresentationTime(.08);
    restored.advanceToPresentationTime(.08);
    expect(restored.checkpoint()).toEqual(session.checkpoint());
    const warm = restored.reconfigure({ ...restored.fixture,
      cardiorespiratory: { ...restored.fixture.cardiorespiratory, systemicDemandMlMin: 200 } });
    expect(warm.checkpoint().coupledPredictor.history.historyDepth).toBe(0);
    restored.advanceToPresentationTime(.081);
    expect(restored.checkpoint().coupledPredictor).toMatchObject({ previousStepDtSec: 0, history: { historyDepth: 0 } });
    session.advanceToPresentationTime(.1);
    expect(session.checkpoint().coupledPredictor.history.historyDepth).toBe(0);
  });
  it('matches the whole public checkpoint across a ventilator cycle, PCV ramps, cardiac boundaries and a clipped endpoint', () => {
    const fast = CardiorespiratorySessionV1.create(), reference = CardiorespiratorySessionV1.create();
    const outputIds = createCardiorespiratoryDevReleaseV1().manifest.primitiveSignalCatalog.map(output => output.outputId);
    let maximumScaledOutputDifference = 0, maximumGasDifference = 0;
    let dormantRightVentricularFallback = false;
    const compareCheckpoint = (actual: unknown, expected: unknown, path = 'checkpoint'): void => {
      if (path === 'checkpoint') {
        // Admission independently checks each exact material fingerprint. A
        // tolerance comparison of its floats cannot require equal byte hashes.
        expect(() => CardiorespiratorySessionV1.restore(fast.fixture, actual)).not.toThrow();
        expect(() => CardiorespiratorySessionV1.restore(reference.fixture, expected)).not.toThrow();
        const a = (actual as ReturnType<CardiorespiratorySessionV1['checkpoint']>).beatAccumulator.active;
        const b = (expected as ReturnType<CardiorespiratorySessionV1['checkpoint']>).beatAccumulator.active;
        // Strict argmin can select different pressure witnesses on an
        // isovolumic plateau after ulp-sized volume changes. When PV closure
        // exists it supersedes this fallback; compare that entire event below.
        dormantRightVentricularFallback = a != null && b != null
          && a.valveClosureLandmarks.PV != null && b.valveClosureLandmarks.PV != null
          && Math.abs(a.minimumRightVentricularLandmark.volumeMl - b.minimumRightVentricularLandmark.volumeMl) < 1e-10;
      }
      if (path === 'checkpoint.state.coronary.mechanics.materialStateFingerprint') return;
      if (path === 'checkpoint.beatAccumulator.active.minimumRightVentricularLandmark.pressureMmHg'
        && dormantRightVentricularFallback) return;
      if (typeof actual === 'number' && typeof expected === 'number') {
        expect(Number.isFinite(actual), path).toBe(true);
        expect(Math.abs(actual - expected) / Math.max(1, Math.abs(expected)),
          `${path} at ${fast.currentAcceptedClock().acceptedTimeSec}: ${actual} versus ${expected}`).toBeLessThan(1e-8);
      } else if (actual !== null && expected !== null && typeof actual === 'object' && typeof expected === 'object') {
        expect(Object.keys(actual), path).toEqual(Object.keys(expected));
        for (const key of Object.keys(expected)) compareCheckpoint(
          (actual as Record<string, unknown>)[key], (expected as Record<string, unknown>)[key], `${path}.${key}`);
      } else expect(actual, path).toBe(expected);
    };
    for (let ordinal = 1; ordinal <= 2650; ordinal++) {
      const target = ordinal * .002;
      fast.advanceToPresentationTime(target);
      const forceRaw = vi.spyOn(typedOrdinary, 'isMainWireTypedOrdinaryCandidateV1').mockReturnValue(false);
      try { reference.advanceToPresentationTime(target); } finally { forceRaw.mockRestore(); }
      expect(fast.currentAcceptedClock()).toEqual(reference.currentAcceptedClock());
      if ([50, 500, 2500, 2550].includes(ordinal)) {
        // PCV ramp end, expiration, mandatory breath restart, next ramp end.
        expect(fast.checkpoint().coupledPredictor.history.historyDepth).toBe(0);
        compareCheckpoint(fast.checkpoint(), reference.checkpoint());
      } else if (ordinal % 250 === 0) compareCheckpoint(fast.checkpoint(), reference.checkpoint());
      if (ordinal % 25 !== 0) continue;
      const actual = fast.projectValues(outputIds), expected = reference.projectValues(outputIds);
      for (const id of outputIds) {
        expect(actual[id].availability, id).toBe(expected[id].availability);
        const a = actual[id].value, b = expected[id].value;
        if (a === null || b === null) expect(a, id).toBe(b);
        else maximumScaledOutputDifference = Math.max(maximumScaledOutputDifference, Math.abs(a - b) / Math.max(1, Math.abs(b)));
      }
      const actualGas = inventoryVector(fast.cardiorespiratoryState()), expectedGas = inventoryVector(reference.cardiorespiratoryState());
      actualGas.forEach((value, i) => { maximumGasDifference = Math.max(maximumGasDifference, Math.abs(value - expectedGas[i])); });
    }
    expect(fast.cardiorespiratoryState().respiratory.completedBreaths).toBe(1);
    fast.advanceToPresentationTime(5.301);
    const forceRaw = vi.spyOn(typedOrdinary, 'isMainWireTypedOrdinaryCandidateV1').mockReturnValue(false);
    try { reference.advanceToPresentationTime(5.301); } finally { forceRaw.mockRestore(); }
    expect(fast.currentAcceptedClock()).toEqual(reference.currentAcceptedClock());
    expect(maximumScaledOutputDifference).toBeLessThan(1e-7);
    expect(maximumGasDifference).toBeLessThan(1e-12);
    expect(fast.checkpoint().coupledPredictor.history.historyDepth).toBe(0);
    compareCheckpoint(fast.checkpoint(), reference.checkpoint());
  });
  it('rejects mismatched predictor roots, unknown continuation fields and incompatible step history', () => {
    const original = run(.002, .04);
    const checkpoint = () => JSON.parse(JSON.stringify(original.checkpoint()));
    const root = checkpoint();
    root.coupledPredictor.history.currentAcceptedMl[0] += 1;
    expect(() => CardiorespiratorySessionV1.restore(original.fixture, root)).toThrow(/predictor checkpoint root/);
    const step = checkpoint();
    step.coupledPredictor.previousStepDtSec = .001;
    expect(() => CardiorespiratorySessionV1.restore(original.fixture, step)).toThrow(/predictor continuation/);
    const empty = checkpoint();
    empty.coupledPredictor.previousStepDtSec = 0;
    expect(() => CardiorespiratorySessionV1.restore(original.fixture, empty)).toThrow(/history and step/);
    const unknown = checkpoint();
    unknown.coupledPredictor.hidden = 1;
    expect(() => CardiorespiratorySessionV1.restore(original.fixture, unknown)).toThrow(/predictor continuation/);
  });
  it('rejects a substituted direct candidate and preserves numerical and predictor accepted ownership', () => {
    const session = run(.002, .04), checkpoint = session.checkpoint();
    const forceRaw = vi.spyOn(typedOrdinary, 'isMainWireTypedOrdinaryCandidateV1').mockReturnValue(false);
    const complete = TransactionalTypedStateImageV1.prototype.completeCandidateFromObject;
    const substitute = vi.spyOn(TransactionalTypedStateImageV1.prototype, 'completeCandidateFromObject').mockImplementation(function (
      this: TransactionalTypedStateImageV1<unknown>, candidate: unknown,
      plan: Parameters<TransactionalTypedStateImageV1<unknown>["completeCandidateFromObject"]>[1],
    ) { return complete.call(this, { ...(candidate as object) }, plan); });
    try { expect(() => session.advanceToPresentationTime(.042)).toThrow(/Unowned cardiorespiratory direct candidate/); }
    finally { substitute.mockRestore(); forceRaw.mockRestore(); }
    expect(session.checkpoint()).toEqual(checkpoint);
    session.advanceToPresentationTime(.042);
    expect(session.currentAcceptedClock().acceptedTimeSec).toBe(.042);
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
    expect(checkpoint.coupledPredictor.history.historyDepth).toBeGreaterThan(0);
    const typedStage = vi.spyOn(typedOrdinary, 'stageMainWireTypedOrdinaryCandidateV1');
    const failure = vi.spyOn(pulmonaryExchange, 'exchangePerfusedBloodWithAlveolarGasV1')
      .mockImplementation(() => { throw new Error('injected post-hemodynamic gas rejection'); });
    try {
      expect(() => original.advanceToPresentationTime(.008)).toThrow('injected post-hemodynamic gas rejection');
      expect(typedStage).toHaveBeenCalled();
    } finally { failure.mockRestore(); typedStage.mockRestore(); }
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
  it('withholds prior-interval gas outputs after a warm demand edit until the next accepted step', () => {
    const original = run(.002, .01);
    const intervalIds = ['oxygen.delivery', 'oxygen.consumption', 'oxygen.demand-met-fraction',
      'oxygen.myocardial-consumption', 'flow.perfusion.1', 'flow.perfusion.2'].map(id => `cardiorespiratory.${id}`);
    const stateIds = ['oxygen.demand', 'inventory.oxygen', 'inventory.carbon-dioxide',
      'balance.oxygen', 'balance.carbon-dioxide', 'gas.pressure.arterial-o2'].map(id => `cardiorespiratory.${id}`);
    const allIds = [...intervalIds, ...stateIds];
    const changed = original.reconfigure({ ...original.fixture,
      cardiorespiratory: { ...original.fixture.cardiorespiratory, systemicDemandMlMin: 25 } });
    expect(changed.cardiorespiratoryState().readback.systemicConsumptionMlMin).toBe(225);
    const values = changed.projectValues(allIds);
    expect(values['cardiorespiratory.oxygen.demand'].value).toBe(50);
    for (const id of intervalIds) expect(values[id], id).toMatchObject({ value: null,
      availability: 'not-evaluated-at-accepted-state', quality: 'not-assessed' });
    for (const id of stateIds) expect(values[id].availability, id).toBe('available');
    const restored = CardiorespiratorySessionV1.restore(changed.fixture, JSON.parse(JSON.stringify(changed.checkpoint())));
    expect(restored.projectValues(allIds)).toEqual(values);
    changed.advanceToPresentationTime(.012);
    const updated = changed.projectValues(allIds);
    for (const id of intervalIds) expect(updated[id].availability, id).toBe('available');
    expect(updated['cardiorespiratory.oxygen.consumption'].value).toBe(50);
    expect(updated['cardiorespiratory.oxygen.demand-met-fraction'].value).toBe(1);
    expect(updated['cardiorespiratory.oxygen.myocardial-consumption'].value).toBe(25);
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


it("uses the same offset effort clock for spontaneous muscle pressure and displayed phase", () => {
  const base = DEFAULT_CARDIORESPIRATORY_FIXTURE_V1;
  const inspiratoryTimeSec = base.cardiorespiratory.respiratory.muscle.inspiratoryTimeSec;
  for (const sign of [1, -1]) {
    const respiratory = { ...base.cardiorespiratory.respiratory,
      ventilator: { ...base.cardiorespiratory.respiratory.ventilator, mode: "spontaneous" as const },
      muscle: { ...base.cardiorespiratory.respiratory.muscle, amplitudeCmH2O: 5, phaseOffsetSec: sign * inspiratoryTimeSec / 2 } };
    const session = CardiorespiratorySessionV1.create({ ...base, cardiorespiratory: { ...base.cardiorespiratory, respiratory } });
    const outputs = session.projectValues(["cardiorespiratory.phase", "cardiorespiratory.pressure.muscle"]);
    const offsetFraction = inspiratoryTimeSec / 2 / (60 / respiratory.muscle.respiratoryRatePerMin);
    expect(outputs["cardiorespiratory.phase"].value).toBeCloseTo(sign > 0 ? offsetFraction : 1 - offsetFraction, 12);
    expect(outputs["cardiorespiratory.pressure.muscle"].value).toBeCloseTo(sign > 0 ? 5 : 0, 12);
  }
});

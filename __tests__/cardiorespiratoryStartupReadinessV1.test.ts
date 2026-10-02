import { describe, expect, it } from "vitest";
import { CardiorespiratoryStartupMonitorV1 as Monitor, DEFAULT_CARDIORESPIRATORY_STARTUP_POLICY_V1 as policy,
  CARDIORESPIRATORY_STARTUP_METRICS_V1 as metrics, prepareCardiorespiratoryStartupV1,
  type CardiorespiratoryStartupSampleV1, type CardiorespiratoryStartupPolicyV1 } from "@/analysis/methods/cardiorespiratory/CardiorespiratoryStartupReadinessV1";
import type { CardiorespiratorySessionV1 } from "@/engine/cardiorespiratory/CardiorespiratorySessionV1";
import { DEFAULT_CARDIORESPIRATORY_FIXTURE_V1 } from "@/engine/cardiorespiratory/CardiorespiratoryFixtureV1";

const constants = { mapMmHg: 60, cardiacOutputLMin: 3, lvVolumeMl: 180, rvVolumeMl: 120, lungVolumeL: 3,
  pleuralPressureCmH2O: 2, arterialO2MmHg: 60, arterialCo2MmHg: 55, systemicO2MmHg: 20, systemicCo2MmHg: 50,
  myocardialO2MmHg: 5, myocardialCo2MmHg: 50 };
const sample = (timeSec: number, patch = {}): CardiorespiratoryStartupSampleV1 => ({ timeSec, values: { ...constants, ...patch } });
function observe(m: Monitor, until: number, values = (_t: number) => ({})) {
  const from = Math.round(m.checkpoint().lastTimeSec * 100);
  for (let i = from + 1; i <= Math.round(until * 100); i++) m.observe(sample(i / 100, values(i / 100)));
}
const create = (overrides = {}) => new Monitor({ startTimeSec: 0, rates: { heartRateBpm: 83.1, respiratoryRatesPerMin: [18.75] }, ...overrides });

describe("single-history UX startup readiness", () => {
  it("allows regular breathing with fractional heart rate and never claims full settlement", () => {
    const m = create(); observe(m, 67.2, t => ({ pleuralPressureCmH2O: 2 + 4 * Math.sin(2 * Math.PI * 18.75 / 60 * t) }));
    expect(m.windowDurationSec).toBeCloseTo(9.6);
    expect(m.assessment().status).toBe("ready");
    expect(m.assessment().interpretation).toContain("not-full-settlement");
  });
  it("allows independent respiratory forcing without rounding HR/RR to a common period", () => {
    const m = create({ rates: { heartRateBpm: 83.37, respiratoryRatesPerMin: [12, 15.3] } });
    observe(m, 60, t => ({ pleuralPressureCmH2O: 2 + 4 * Math.sin(2 * Math.PI * 12 / 60 * t) + .4 * Math.sin(2 * Math.PI * 15.3 / 60 * t) }));
    expect(m.assessment().status).toBe("ready");
    expect(m.assessment().rates.heartRateBpm).toBe(83.37);
  });
  it("rejects a visible continuing gas ramp even when all mechanics are stable", () => {
    const m = create(); observe(m, 67.2, t => ({ arterialCo2MmHg: 40 + .5 * t }));
    expect(m.assessment().status).toBe("not-ready");
    expect(m.assessment().worstComparison?.metric).toBe("arterialCo2MmHg");
  });
  it("permits gradual gas drift and abnormal steady values without imposing normal physiology", () => {
    const m = create(); observe(m, 67.2, t => ({ arterialCo2MmHg: 70 + .03 * t, arterialO2MmHg: 45 }));
    expect(m.assessment().status).toBe("ready");
  });
  it("extends past a large decaying startup transient rather than accepting elapsed time alone", () => {
    const m = create(); observe(m, 67.2, t => ({ mapMmHg: 60 + 80 * Math.exp(-t / 40) }));
    expect(m.assessment().status).toBe("not-ready");
    observe(m, 115.2, t => ({ mapMmHg: 60 + 80 * Math.exp(-t / 40) }));
    expect(m.assessment().status).toBe("ready");
  });
  it("rejects missing or nonfinite signals and skipped samples", () => {
    const m = create();
    const missing = sample(.01); delete (missing.values as Record<string, number>).arterialO2MmHg;
    expect(() => m.observe(missing)).toThrow(/missing/);
    expect(() => m.observe(sample(.01, { mapMmHg: NaN }))).toThrow(/missing/);
    expect(() => m.observe(sample(.02))).toThrow(/missing/);
    expect(m.checkpoint().lastTimeSec).toBe(0);
  });
  it("roundtrips an incomplete window and rejects changed terminal clock or summary", () => {
    const a = create(); observe(a, 33.33);
    const b = Monitor.restore(a.checkpoint()); observe(a, 67.2); observe(b, 67.2);
    expect(b.assessment()).toEqual(a.assessment());
    const clock = structuredClone(a.checkpoint()) as any; clock.lastTimeSec += 10;
    expect(() => Monitor.restore(clock)).toThrow(/continuation/);
    const summary = structuredClone(a.checkpoint()) as any; summary.windows[0].means.mapMmHg = 999;
    expect(() => Monitor.restore(summary)).toThrow(/window/);
  });
});

function fakeSession(failAt = Infinity) {
  const fixture = structuredClone(DEFAULT_CARDIORESPIRATORY_FIXTURE_V1) as any;
  fixture.hemodynamicResearchInputs.heartRateBpm = 240;
  fixture.cardiorespiratory.respiratory.ventilator.respiratoryRatePerMin = 60;
  let time = 0, hidden = 0, advances = 0;
  const session = { fixture, currentAcceptedClock: () => ({ acceptedTimeSec: time }),
    advanceToPresentationTime(t: number) { if (t >= failAt) throw new Error("numerical-domain-failure"); time = t; advances++; },
    checkpoint: () => ({ fixture, time, hidden }),
    projectValues: (ids: readonly string[]) => Object.fromEntries(ids.map(id => [id, { value: id === "hemodynamics.output.native-left" ? 5 : 1 }])),
    cardiorespiratoryState: () => ({ systemic: { amount: { co2Mol: .075 } }, myocardium: { amount: { co2Mol: .0005 } } }),
  } as unknown as CardiorespiratorySessionV1;
  return { session, changedHidden: () => { hidden++; }, advances: () => advances };
}
const shortPolicy: CardiorespiratoryStartupPolicyV1 = { ...policy, standardWarmupSec: 6, maximumExtensionSec: 2, minimumWindowSec: 1 };
const identity = { modelId: "test", sourceSha256: "source-a" };
describe("bounded single-session preparation", () => {
  it("uses only the supplied trajectory and binds a reusable ready checkpoint to full state and source", async () => {
    const f = fakeSession();
    const ready = await prepareCardiorespiratoryStartupV1({ session: f.session, identity, policy: shortPolicy });
    expect(ready.status).toBe("ready"); expect(ready.evidence.elapsedSec).toBe(6); expect(f.advances()).toBe(600);
    await prepareCardiorespiratoryStartupV1({ session: f.session, identity, resume: ready });
    expect(f.advances()).toBe(600);
    await expect(prepareCardiorespiratoryStartupV1({ session: f.session, identity: { ...identity, sourceSha256: "new-source" }, resume: ready })).rejects.toThrow(/proof/);
    f.changedHidden();
    await expect(prepareCardiorespiratoryStartupV1({ session: f.session, identity, resume: ready })).rejects.toThrow(/proof/);
  });
  it("distinguishes numerical failure from an interrupted bounded warmup", async () => {
    const failed = await prepareCardiorespiratoryStartupV1({ session: fakeSession(.05).session, identity, policy: shortPolicy });
    expect(failed.status).toBe("failed"); expect(failed.reason).toBe("numerical-domain-failure");
    const abort = new AbortController(); abort.abort();
    const interrupted = await prepareCardiorespiratoryStartupV1({ session: fakeSession().session, identity, policy: shortPolicy, abortSignal: abort.signal });
    expect(interrupted.status).toBe("not-ready"); expect(interrupted.reason).toBe("aborted");
  });
  it("honors timer cancellation between complete windows and resumes exactly", async () => {
    const f = fakeSession(), abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), 0);
    const partial = await prepareCardiorespiratoryStartupV1({ session: f.session, identity, policy: shortPolicy, abortSignal: abort.signal });
    clearTimeout(timer);
    expect(partial.status).toBe("not-ready"); expect(partial.evidence.elapsedSec).toBe(2);
    const ready = await prepareCardiorespiratoryStartupV1({ session: f.session, identity, resume: partial });
    expect(ready.status).toBe("ready"); expect(f.advances()).toBe(600);
  });
  it("never runs beyond the extension cap when measured changes continue", async () => {
    const f = fakeSession();
    const projection = f.session.projectValues.bind(f.session);
    f.session.projectValues = (ids: readonly string[]) => {
      const values = projection(ids);
      values["cardiorespiratory.gas.pressure.arterial-co2"] = { ...values["cardiorespiratory.gas.pressure.arterial-co2"], value: 40 + f.session.currentAcceptedClock().acceptedTimeSec };
      return values;
    };
    const result = await prepareCardiorespiratoryStartupV1({ session: f.session, identity, policy: shortPolicy });
    expect(result.status).toBe("not-ready"); expect(result.reason).toBe("maximum-warmup-budget-exhausted");
    expect(result.evidence.elapsedSec).toBe(8); expect(f.advances()).toBe(800);
  });
});

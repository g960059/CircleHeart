import { describe, expect, it } from "vitest";
import { CardiorespiratorySettlementMonitorV1, type CardiorespiratorySettlementProjectionV1,
  type CardiorespiratorySettlementConfigV1 } from "@/analysis/methods/cardiorespiratory/CardiorespiratorySettlementV1";

const config: CardiorespiratorySettlementConfigV1 = {
  observationIntervalSec: 1, windowSec: 20, minimumDurationSec: 80, holdoutWindows: 3,
  physicalRelativeTolerance: 1e-3, windowMeanDriftRelativeTolerance: 2e-4,
};
const ids = ["reference", "lower", "upper"];
function projection(t: number, seed = 0, commonDrift = 0): CardiorespiratorySettlementProjectionV1 {
  // Neither forcing frequency is rounded or required to share a period.
  const continuous = Object.fromEntries((["hemodynamic", "respiratory", "gas", "controller"] as const).map(domain => [domain, {
    value: 1 + seed * Math.exp(-t / 2) + commonDrift * t, scale: 1, domain, monitorDrift: domain === "gas" || domain === "controller",
  }]));
  return { timeSec: t, forcing: { heart: (t * 73.7 / 60) % 1, breath: (t * 13.13 / 60) % 1 },
    invariants: { tbvMl: 5000, branch: "open" }, optionalCoordinatePrefixes: ["pendingCalcium"], continuous, discrete: { airwayOpen: true } };
}
const observations = (t: number, drift = 0) => [0, -.1, .1].map(seed => projection(t, seed, drift));
function run(drift = 0) {
  const m = new CardiorespiratorySettlementMonitorV1(ids, observations(0), config);
  for (let t = 1; t <= 120; t++) m.observe(observations(t, drift));
  return m;
}

describe("full-system cardiorespiratory settlement evidence", () => {
  it("records decayed independent histories but does not certify the undersampled trajectory", () => {
    const m = run(), e = m.evidence();
    expect(e.status).toBe("insufficient-evidence");
    expect(e.issues).toEqual(["dense-matched-forcing-holdout-required", "physical-age-comparison-required"]);
    expect(e.missingSeedDomains).toEqual([]);
    expect(e.windows.at(-1)!.maximumHistoryDifference).toBeLessThan(1);
  });
  it("rejects a co-drifting matched set even after independent history differences disappear", () => {
    const e = run(.0001).evidence();
    expect(e.windows.at(-1)!.maximumHistoryDifference).toBeLessThan(1);
    expect(e.status).toBe("insufficient-evidence");
    expect(e.issues).toContain("unresolved-window-mean-change");
  });
  it("does not interpret tiny consecutive changes of a very slow transient as convergence", () => {
    const m = new CardiorespiratorySettlementMonitorV1(ids, observations(0), config);
    for (let t = 1; t <= 120; t++) {
      m.observe([0, -.1, .1].map(seed => projection(0, seed * Math.exp(-t / 100000))).map(p => ({ ...p, timeSec: t })));
    }
    expect(m.evidence().issues).toContain("physical-history-memory");
  });
  it("rejects duplicate unperturbed histories, incompatible neutral invariants, and mismatched forcing", () => {
    const same = new CardiorespiratorySettlementMonitorV1(ids, ids.map(() => projection(0)), config);
    for (let t = 1; t <= 120; t++) same.observe(ids.map(() => projection(t)));
    expect(same.evidence().issues).toContain("independent-seed-domain-coverage");
    const differentTbv = observations(0); differentTbv[1] = { ...differentTbv[1]!, invariants: { tbvMl: 5001, branch: "open" } };
    expect(() => new CardiorespiratorySettlementMonitorV1(ids, differentTbv, config)).toThrow(/invariants/);
    const differentClock = observations(0); differentClock[1] = { ...differentClock[1]!, forcing: { heart: .1, breath: 0 } };
    expect(() => new CardiorespiratorySettlementMonitorV1(ids, differentClock, config)).toThrow(/forcing/);
  });
  it("accepts only bounded forcing-clock roundoff while preserving exact period and fixture invariants", () => {
    const initial: CardiorespiratorySettlementProjectionV1[] = observations(0).map(p => ({ ...p, forcing: { ...p.forcing, cardiacPeriodSec: 60 / 73.7 } }));
    initial[1] = { ...initial[1]!, forcing: { ...initial[1]!.forcing, heart: Number.EPSILON } };
    expect(() => new CardiorespiratorySettlementMonitorV1(ids, initial, config)).not.toThrow();
    const material = initial.map(p => ({ ...p, forcing: { ...p.forcing } }));
    material[1]!.forcing.heart += 1e-6;
    expect(() => new CardiorespiratorySettlementMonitorV1(ids, material, config)).toThrow(/forcing/);
    const period = initial.map(p => ({ ...p, forcing: { ...p.forcing } }));
    period[1]!.forcing.cardiacPeriodSec += Number.EPSILON;
    expect(() => new CardiorespiratorySettlementMonitorV1(ids, period, config)).toThrow(/forcing/);
  });
  it("retains branch disagreement rather than averaging different physical histories", () => {
    const m = new CardiorespiratorySettlementMonitorV1(ids, observations(0), config);
    for (let t = 1; t <= 120; t++) {
      const p = observations(t); p[1] = { ...p[1]!, discrete: { airwayOpen: false } }; m.observe(p);
    }
    expect(m.evidence().issues).toContain("discrete-history-branch-disagreement");
  });
  it("resumes without discarding a partial drift window or inventing holdout coverage", () => {
    let resumed = new CardiorespiratorySettlementMonitorV1(ids, observations(0), config);
    for (let t = 1; t <= 120; t++) {
      resumed.observe(observations(t));
      if (t === 53) {
        expect(resumed.evidence().issues).toContain("incomplete-holdout-window");
        resumed = CardiorespiratorySettlementMonitorV1.restore(JSON.parse(JSON.stringify(resumed.checkpoint())));
      }
    }
    expect(resumed.evidence()).toEqual(run().evidence());
  });
  it("fails closed on missing coordinates and skipped observations", () => {
    const m = new CardiorespiratorySettlementMonitorV1(ids, observations(0), config);
    expect(() => m.observe(observations(2))).toThrow(/cadence/);
    const p = observations(1); const { gas: _gas, ...continuous } = p[1]!.continuous;
    p[1] = { ...p[1]!, continuous };
    expect(() => m.observe(p)).toThrow(/coverage/);
  });
  it("allows synchronized pending-event shapes to evolve without dropping their history comparison", () => {
    const m = new CardiorespiratorySettlementMonitorV1(ids, observations(0), config);
    for (let t = 1; t <= 120; t++) {
      const p = observations(t).map(x => ({ ...x, continuous: { ...x.continuous,
        ...(t % 2 ? { pendingCalcium: { value: .01, scale: 1, domain: "hemodynamic" as const, monitorDrift: false } } : {}) },
      }));
      m.observe(p);
    }
    expect(m.evidence().issues).toEqual(["dense-matched-forcing-holdout-required", "physical-age-comparison-required"]);
  });
  it("rejects a mandatory gas coordinate disappearing synchronously from every history", () => {
    const m = new CardiorespiratorySettlementMonitorV1(ids, observations(0), config);
    const p = observations(1).map(x => {
      const { gas: _gas, ...continuous } = x.continuous; return { ...x, continuous };
    });
    expect(() => m.observe(p)).toThrow(/Mandatory/);
  });
  it("rejects a checkpoint clock advanced beyond its recorded held-out observations", () => {
    const cp = JSON.parse(JSON.stringify(run().checkpoint()));
    cp.lastTimeSec += 600;
    expect(() => CardiorespiratorySettlementMonitorV1.restore(cp)).toThrow(/clock/);
  });
  it("binds terminal observations to the history count, time, schema, and recorded residual bound", () => {
    const cp = () => JSON.parse(JSON.stringify(run().checkpoint()));
    const missing = cp(); missing.terminalProjections.pop();
    expect(() => CardiorespiratorySettlementMonitorV1.restore(missing)).toThrow(/terminal/);
    const clock = cp(); clock.terminalProjections[0].timeSec += 1;
    expect(() => CardiorespiratorySettlementMonitorV1.restore(clock)).toThrow(/terminal/);
    const state = cp(); state.terminalProjections[1].continuous.gas.value += 1;
    expect(() => CardiorespiratorySettlementMonitorV1.restore(state)).toThrow(/terminal/);
  });
  it("does not admit a periodically amplified mode hidden by coarse observation times", () => {
    const m = new CardiorespiratorySettlementMonitorV1(ids, observations(0), { ...config, observationIntervalSec: .5, windowSec: 60, minimumDurationSec: 360 });
    for (let t = .5; t <= 420; t += .5) {
      m.observe([0, -.1, .1].map(seed => {
        const p = projection(t);
        const value = 1 + seed * Math.exp(-t / 50 + 6 * Math.sin(2 * Math.PI * t) ** 2);
        return { ...p, continuous: Object.fromEntries(Object.entries(p.continuous).map(([id, x]) => [id, { ...x, value }])) };
      }));
    }
    expect(m.evidence().windows.slice(-3).every(w => w.maximumHistoryDifference < 1)).toBe(true);
    expect(.1 * Math.exp(-420.25 / 50 + 6) / config.physicalRelativeTolerance).toBeGreaterThan(9);
    expect(m.evidence().status).toBe("insufficient-evidence");
    expect(m.evidence().issues).toContain("dense-matched-forcing-holdout-required");
  });
  it("does not describe aliased means of an already periodic trajectory as established secular drift", () => {
    const m = new CardiorespiratorySettlementMonitorV1(ids, observations(0), { ...config, observationIntervalSec: .5, windowSec: 60, minimumDurationSec: 360 });
    for (let t = .5; t <= 600; t += .5) {
      m.observe([0, -.1, .1].map(seed => {
        const p = projection(t);
        const value = 1 + seed * Math.exp(-t / 2) + .05 * Math.sin(2 * Math.PI * 119.97 / 60 * t);
        return { ...p, continuous: Object.fromEntries(Object.entries(p.continuous).map(([id, x]) => [id, { ...x, value }])) };
      }));
    }
    expect(m.evidence().windows.at(-1)!.maximumHistoryDifference).toBe(0);
    expect(m.evidence().issues).toContain("unresolved-window-mean-change");
    expect(m.evidence().issues).not.toContain("common-slow-state-drift");
  });
});

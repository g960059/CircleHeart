/** Analysis-owned bounded diagnostics, not an Exact-frame output or full
 * settlement certification. Histories are compared at the SAME forcing clock.
 * Full admission is deliberately held until physical-age comparison and dense
 * matched-time holdout are implemented. No common period or rounded rate. */
export const CARDIORESPIRATORY_SETTLEMENT_METHOD_V1 = "cardiorespiratory-full-system-settlement-v1" as const;
/** Only accumulated clock roundoff; never a rounded rate or phase-bin match. */
export const CARDIORESPIRATORY_SETTLEMENT_FORCING_ROUNDOFF_SEC_V1 = 1e-9;
export type CardiorespiratorySettlementDomainV1 = "hemodynamic" | "respiratory" | "gas" | "controller";
export type CardiorespiratorySettlementCoordinateV1 = Readonly<{
  value: number; scale: number; domain: CardiorespiratorySettlementDomainV1;
  /** Slow inventories and controller state: independent common-drift guard. */
  monitorDrift: boolean;
}>;
export type CardiorespiratorySettlementProjectionV1 = Readonly<{
  timeSec: number;
  forcing: Readonly<Record<string, number>>;
  invariants: Readonly<Record<string, number | string>>;
  /** Exact-owned phase-shaped event payloads. Every other coordinate is mandatory. */
  optionalCoordinatePrefixes?: readonly string[];
  continuous: Readonly<Record<string, CardiorespiratorySettlementCoordinateV1>>;
  discrete: Readonly<Record<string, string | number | boolean | null>>;
}>;
export type CardiorespiratorySettlementConfigV1 = Readonly<{
  observationIntervalSec: number;
  windowSec: number;
  minimumDurationSec: number;
  holdoutWindows: number;
  physicalRelativeTolerance: number;
  windowMeanDriftRelativeTolerance: number;
}>;
export const DEFAULT_CARDIORESPIRATORY_SETTLEMENT_CONFIG_V1: CardiorespiratorySettlementConfigV1 = Object.freeze({
  observationIntervalSec: .5, windowSec: 60, minimumDurationSec: 360,
  holdoutWindows: 3, physicalRelativeTolerance: 1e-3, windowMeanDriftRelativeTolerance: 2e-4,
});
export type CardiorespiratorySettlementWindowV1 = Readonly<{
  startTimeSec: number; endTimeSec: number; observations: number;
  maximumHistoryDifference: number; worstHistoryCoordinate: string | null;
  discreteAgreement: boolean;
  /** Window-mean change; may include phase/sampling bias. Not a drift proof. */
  maximumMeanDrift: number | null; worstDriftCoordinate: string | null;
  slowMeans: Readonly<Record<string, number>>;
}>;
export type CardiorespiratorySettlementEvidenceV1 = Readonly<{
  schemaId: "cardiorespiratory-settlement-evidence-v1";
  methodId: typeof CARDIORESPIRATORY_SETTLEMENT_METHOD_V1;
  purpose: "full-system-steady";
  status: "qualified" | "insufficient-evidence";
  config: CardiorespiratorySettlementConfigV1;
  startTimeSec: number; acceptedTimeSec: number;
  seedIds: readonly string[];
  coveredDomains: readonly CardiorespiratorySettlementDomainV1[];
  missingSeedDomains: readonly CardiorespiratorySettlementDomainV1[];
  issues: readonly string[];
  windows: readonly CardiorespiratorySettlementWindowV1[];
  interpretation: "bounded-independent-history-and-common-drift-evidence-not-global-attraction-proof";
}>;
type MutableWindow = { startTimeSec: number; count: number; max: number; worst: string | null;
  discreteAgreement: boolean; slowSums: Record<string, number> };
export type CardiorespiratorySettlementMonitorCheckpointV1 = Readonly<{
  schemaId: "cardiorespiratory-settlement-monitor-v1";
  config: CardiorespiratorySettlementConfigV1;
  seedIds: readonly string[]; startTimeSec: number; lastTimeSec: number;
  template: CardiorespiratorySettlementProjectionV1;
  coveredDomains: readonly CardiorespiratorySettlementDomainV1[];
  /** Last actual observation, bound by the caller to each restored Exact state. */
  terminalProjections: readonly CardiorespiratorySettlementProjectionV1[];
  windows: readonly CardiorespiratorySettlementWindowV1[];
  pending: MutableWindow;
}>;
const domains: readonly CardiorespiratorySettlementDomainV1[] = ["hemodynamic", "respiratory", "gas", "controller"];
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const keys = (x: object) => Object.keys(x).sort();
function sameForcing(a: Readonly<Record<string, number>>, b: Readonly<Record<string, number>>) {
  return same(keys(a), keys(b)) && Object.keys(a).every(key => key.endsWith("PeriodSec")
    ? Object.is(a[key], b[key])
    : Math.abs(a[key]! - b[key]!) <= CARDIORESPIRATORY_SETTLEMENT_FORCING_ROUNDOFF_SEC_V1);
}
function ownConfig(c: CardiorespiratorySettlementConfigV1): CardiorespiratorySettlementConfigV1 {
  if (![c.observationIntervalSec, c.windowSec, c.minimumDurationSec, c.physicalRelativeTolerance,
    c.windowMeanDriftRelativeTolerance].every(x => Number.isFinite(x) && x > 0)
    || !Number.isSafeInteger(c.holdoutWindows) || c.holdoutWindows < 3 || c.holdoutWindows > 32
    || c.windowSec < 20 || c.minimumDurationSec < c.windowSec * (c.holdoutWindows + 1)
    || c.observationIntervalSec > c.windowSec / 20
    || Math.abs(c.windowSec / c.observationIntervalSec - Math.round(c.windowSec / c.observationIntervalSec)) > 1e-8) {
    throw new Error("Invalid full-system settlement policy");
  }
  return Object.freeze({ ...c });
}
function validateProjection(p: CardiorespiratorySettlementProjectionV1) {
  if (!Number.isFinite(p.timeSec) || p.timeSec < 0 || !Object.keys(p.continuous).length
    || !Object.values(p.forcing).every(Number.isFinite)
    || (p.optionalCoordinatePrefixes ?? []).some(x => typeof x !== "string" || !x)
    || !Object.values(p.continuous).every(x => Number.isFinite(x.value) && Number.isFinite(x.scale) && x.scale > 0
      && domains.includes(x.domain) && typeof x.monitorDrift === "boolean")) throw new Error("Invalid physical settlement projection");
}

/** Conservative drift windows may remain unresolved when forcing modulation
 * obscures a trend. That is insufficient evidence, never permission to round
 * HR/RR or label a matched but co-drifting pair settled. */
export class CardiorespiratorySettlementMonitorV1 {
  readonly config: CardiorespiratorySettlementConfigV1;
  readonly #seedIds: readonly string[];
  readonly #template: CardiorespiratorySettlementProjectionV1;
  readonly #start: number;
  #terminal: readonly CardiorespiratorySettlementProjectionV1[];
  readonly #covered = new Set<CardiorespiratorySettlementDomainV1>();
  #last: number;
  #windows: CardiorespiratorySettlementWindowV1[] = [];
  #pending: MutableWindow;
  constructor(seedIds: readonly string[], initial: readonly CardiorespiratorySettlementProjectionV1[],
    config: CardiorespiratorySettlementConfigV1 = DEFAULT_CARDIORESPIRATORY_SETTLEMENT_CONFIG_V1) {
    this.config = ownConfig(config);
    if (seedIds.length < 3 || seedIds.length !== initial.length || new Set(seedIds).size !== seedIds.length
      || seedIds.some(id => !id)) throw new Error("Require at least three distinct independent histories");
    initial.forEach(validateProjection);
    this.#template = structuredClone(initial[0]!);
    this.#start = initial[0]!.timeSec; this.#last = this.#start;
    this.#seedIds = [...seedIds];
    this.#terminal = structuredClone(initial);
    this.#pending = this.#newWindow(this.#start);
    this.#compare(initial);
    // Coverage is measured from actual admitted state differences, not from a
    // caller's claim that an identical checkpoint is an independent seed.
    for (const p of initial.slice(1)) for (const [id, x] of Object.entries(p.continuous)) {
      if (Math.abs(x.value - initial[0]!.continuous[id]!.value) / x.scale > this.config.physicalRelativeTolerance * 10) {
        this.#covered.add(x.domain);
      }
    }
  }
  static restore(value: CardiorespiratorySettlementMonitorCheckpointV1) {
    if (value.schemaId !== "cardiorespiratory-settlement-monitor-v1") throw new Error("Unknown settlement monitor checkpoint");
    const m = new CardiorespiratorySettlementMonitorV1(value.seedIds, value.seedIds.map(() => value.template), value.config);
    const close = (a: number, b: number) => Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= 1e-7;
    const nonnegative = (x: number) => Number.isFinite(x) && x >= 0;
    const validWorst = (x: unknown) => x === null || typeof x === "string" && x.length > 0;
    const driftKeys = keys(value.template.continuous).filter(id => value.template.continuous[id]!.monitorDrift);
    const hasDriftKeys = (x: Record<string, number>) => same(keys(x), driftKeys) && Object.values(x).every(Number.isFinite);
    if (!Number.isFinite(value.lastTimeSec) || value.lastTimeSec < value.startTimeSec
      || value.startTimeSec !== value.template.timeSec || value.coveredDomains.some(x => !domains.includes(x))
      || new Set(value.coveredDomains).size !== value.coveredDomains.length) throw new Error("Invalid settlement monitor continuation");
    let nextStart = value.startTimeSec;
    let previous: CardiorespiratorySettlementWindowV1 | undefined;
    for (const w of value.windows) {
      if (!close(w.startTimeSec, nextStart) || !close(w.endTimeSec - w.startTimeSec, m.config.windowSec)
        || w.observations !== Math.round(m.config.windowSec / m.config.observationIntervalSec)
        || !nonnegative(w.maximumHistoryDifference) || !validWorst(w.worstHistoryCoordinate)
        || typeof w.discreteAgreement !== "boolean" || !hasDriftKeys(w.slowMeans)
        || !validWorst(w.worstDriftCoordinate)) throw new Error("Invalid settlement observation window");
      const drift = previous ? Math.max(0, ...driftKeys.map(id => Math.abs(w.slowMeans[id]! - previous!.slowMeans[id]!)
        / (value.template.continuous[id]!.scale * m.config.windowMeanDriftRelativeTolerance))) : null;
      if (drift === null ? w.maximumMeanDrift !== null : !close(drift, w.maximumMeanDrift!)) throw new Error("Settlement drift evidence differs");
      nextStart = w.endTimeSec; previous = w;
    }
    const pending = value.pending;
    if (!close(pending.startTimeSec, nextStart) || !Number.isSafeInteger(pending.count) || pending.count < 0
      || pending.count >= Math.round(m.config.windowSec / m.config.observationIntervalSec)
      || !close(value.lastTimeSec, pending.startTimeSec + pending.count * m.config.observationIntervalSec)
      || !nonnegative(pending.max) || !validWorst(pending.worst) || typeof pending.discreteAgreement !== "boolean"
      || (pending.count === 0 ? keys(pending.slowSums).length !== 0 : !hasDriftKeys(pending.slowSums))) {
      throw new Error("Settlement checkpoint clock and observation coverage differ");
    }
    if (!Array.isArray(value.terminalProjections) || value.terminalProjections.length !== value.seedIds.length
      || value.terminalProjections.some(p => !close(p.timeSec, value.lastTimeSec))) throw new Error("Settlement terminal observation clock differs");
    const terminal = m.#compare(value.terminalProjections);
    const bound = pending.count ? { maximumHistoryDifference: pending.max, discreteAgreement: pending.discreteAgreement } : value.windows.at(-1);
    if (bound && (terminal.max > bound.maximumHistoryDifference + 1e-7 || !terminal.discreteAgreement && bound.discreteAgreement)) {
      throw new Error("Settlement terminal observation disagrees with its observation window");
    }
    m.#last = value.lastTimeSec;
    m.#windows = structuredClone([...value.windows]);
    m.#pending = structuredClone(value.pending);
    m.#terminal = structuredClone(value.terminalProjections);
    value.coveredDomains.forEach(x => m.#covered.add(x));
    return m;
  }
  checkpoint(): CardiorespiratorySettlementMonitorCheckpointV1 {
    return structuredClone({ schemaId: "cardiorespiratory-settlement-monitor-v1", config: this.config,
      seedIds: this.#seedIds, startTimeSec: this.#start, lastTimeSec: this.#last, template: this.#template,
      coveredDomains: [...this.#covered], windows: this.#windows, pending: this.#pending, terminalProjections: this.#terminal });
  }
  observe(histories: readonly CardiorespiratorySettlementProjectionV1[]) {
    const t = histories[0]?.timeSec;
    if (!Number.isFinite(t) || Math.abs(t! - this.#last - this.config.observationIntervalSec) > 1e-7) {
      throw new Error("Settlement observations must be contiguous at the declared cadence");
    }
    const comparison = this.#compare(histories), p = this.#pending;
    if (comparison.max > p.max) { p.max = comparison.max; p.worst = comparison.worst; }
    p.discreteAgreement &&= comparison.discreteAgreement;
    p.count++;
    for (const [id, x] of Object.entries(histories[0]!.continuous)) if (x.monitorDrift) {
      p.slowSums[id] = (p.slowSums[id] ?? 0) + x.value;
    }
    this.#terminal = structuredClone(histories);
    this.#last = t!;
    if (this.#last - p.startTimeSec < this.config.windowSec - 1e-7) return false;
    const means = Object.fromEntries(Object.entries(p.slowSums).map(([id, sum]) => [id, sum / p.count]));
    const previous = this.#windows.at(-1);
    let drift: number | null = previous ? 0 : null, worst: string | null = null;
    if (previous) for (const [id, value] of Object.entries(means)) {
      const d = Math.abs(value - previous.slowMeans[id]!)
        / (this.#template.continuous[id]!.scale * this.config.windowMeanDriftRelativeTolerance);
      if (d > drift!) { drift = d; worst = id; }
    }
    this.#windows.push({ startTimeSec: p.startTimeSec, endTimeSec: this.#last, observations: p.count,
      maximumHistoryDifference: p.max, worstHistoryCoordinate: p.worst, discreteAgreement: p.discreteAgreement,
      maximumMeanDrift: drift, worstDriftCoordinate: worst, slowMeans: means });
    this.#pending = this.#newWindow(this.#last);
    return true;
  }
  evidence(): CardiorespiratorySettlementEvidenceV1 {
    const missing = domains.filter(d => !this.#covered.has(d));
    const tail = this.#windows.slice(-this.config.holdoutWindows);
    const issues: string[] = [];
    if (this.#last - this.#start < this.config.minimumDurationSec - 1e-7) issues.push("minimum-history-duration");
    if (missing.length) issues.push("independent-seed-domain-coverage");
    if (tail.length !== this.config.holdoutWindows || tail.some(w => w.maximumMeanDrift === null)) issues.push("holdout-window-coverage");
    if (tail.some(w => w.maximumHistoryDifference > 1)) issues.push("physical-history-memory");
    if (tail.some(w => !w.discreteAgreement)) issues.push("discrete-history-branch-disagreement");
    if (tail.some(w => w.maximumMeanDrift !== null && w.maximumMeanDrift > 1)) issues.push("unresolved-window-mean-change");
    if (!Object.values(this.#template.continuous).some(x => x.monitorDrift && x.domain === "gas")) issues.push("gas-inventory-drift-coverage");
    // Coarse endpoint agreement is useful prewarming evidence, but cannot
    // certify a full trajectory. Dense forcing-aware holdout admission is a
    // separate required step; the former .5-second classifier is fail closed.
    issues.push("dense-matched-forcing-holdout-required");
    issues.push("physical-age-comparison-required");
    // Qualification is only issued at a tested complete holdout boundary.
    if (this.#pending.count) issues.push("incomplete-holdout-window");
    return { schemaId: "cardiorespiratory-settlement-evidence-v1", methodId: CARDIORESPIRATORY_SETTLEMENT_METHOD_V1,
      purpose: "full-system-steady", status: issues.length ? "insufficient-evidence" : "qualified", config: this.config,
      startTimeSec: this.#start, acceptedTimeSec: this.#last, seedIds: this.#seedIds,
      coveredDomains: [...this.#covered], missingSeedDomains: missing, issues, windows: this.#windows,
      interpretation: "bounded-independent-history-and-common-drift-evidence-not-global-attraction-proof" };
  }
  #newWindow(startTimeSec: number): MutableWindow {
    return { startTimeSec, count: 0, max: 0, worst: null, discreteAgreement: true, slowSums: {} };
  }
  #compare(histories: readonly CardiorespiratorySettlementProjectionV1[]) {
    if (histories.length !== this.#seedIds.length) throw new Error("Settlement history count differs");
    const reference = histories[0]!;
    let max = 0, worst: string | null = null, discreteAgreement = true;
    for (const p of histories) {
      validateProjection(p);
      if (Math.abs(p.timeSec - reference.timeSec) > CARDIORESPIRATORY_SETTLEMENT_FORCING_ROUNDOFF_SEC_V1
        || !sameForcing(p.forcing, reference.forcing)) throw new Error("Settlement forcing clocks differ");
      if (!same(p.invariants, this.#template.invariants)) throw new Error("Settlement neutral invariants differ");
      if (!same(p.optionalCoordinatePrefixes ?? [], this.#template.optionalCoordinatePrefixes ?? [])) throw new Error("Settlement phase-dependent schema differs");
      const optional = (id: string) => (this.#template.optionalCoordinatePrefixes ?? []).some(prefix => id === prefix || id.startsWith(prefix + "."));
      const mandatory = (x: object) => keys(x).filter(id => !optional(id));
      if (!same(mandatory(p.continuous), mandatory(this.#template.continuous))
        || !same(mandatory(p.discrete), mandatory(this.#template.discrete))) throw new Error("Mandatory settlement physical state coverage differs");
      // Pending event payload shapes may change with forcing phase. Coverage
      // must agree between histories at THIS time, not with the cold phase.
      if (!same(keys(p.continuous), keys(reference.continuous)) || !same(keys(p.discrete), keys(reference.discrete))) {
        throw new Error("Settlement physical state coverage differs");
      }
      discreteAgreement &&= same(p.discrete, reference.discrete);
      for (const [id, x] of Object.entries(p.continuous)) {
        const template = this.#template.continuous[id] ?? reference.continuous[id]!;
        if (x.scale !== template.scale || x.domain !== template.domain || x.monitorDrift !== template.monitorDrift) throw new Error("Settlement coordinate policy changed");
        if (x.monitorDrift && (!Object.hasOwn(this.#template.continuous, id) || optional(id))) throw new Error("Drift coordinates must have mandatory stable coverage");
        const d = Math.abs(x.value - reference.continuous[id]!.value) / (x.scale * this.config.physicalRelativeTolerance);
        if (d > max) { max = d; worst = id; }
      }
    }
    return { max, worst, discreteAgreement };
  }
}

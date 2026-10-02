import type { CardiorespiratorySessionV1, CardiorespiratoryCheckpointV2 } from "@/engine/cardiorespiratory/CardiorespiratorySessionV1";
import type { CardiorespiratoryFixtureV1 } from "@/engine/cardiorespiratory/CardiorespiratoryFixtureV1";
import { DEFAULT_TISSUE_GAS_PARAMETERS_V1 } from "@/engine/cardiorespiratory/TissueGasExchangeV1";
import { canonicalJsonStringify, sha256CanonicalJsonHex } from "@/engine/integrity";

export const CARDIORESPIRATORY_STARTUP_METHOD_V1 = "cardiorespiratory-startup-readiness-v1" as const;
export const CARDIORESPIRATORY_STARTUP_METRICS_V1 = ["mapMmHg", "cardiacOutputLMin", "lvVolumeMl", "rvVolumeMl", "lungVolumeL", "pleuralPressureCmH2O",
  "arterialO2MmHg", "arterialCo2MmHg", "systemicO2MmHg", "systemicCo2MmHg", "myocardialO2MmHg", "myocardialCo2MmHg"] as const;
export type CardiorespiratoryStartupMetricV1 = typeof CARDIORESPIRATORY_STARTUP_METRICS_V1[number];
type Values = Readonly<Record<CardiorespiratoryStartupMetricV1, number>>;
export type CardiorespiratoryStartupSampleV1 = Readonly<{ timeSec: number; values: Values }>;
type Limit = Readonly<{ absolute: number; relative: number; spanAbsolute: number; spanRelative: number; projectedTenSecondDrift?: boolean }>;
export type CardiorespiratoryStartupPolicyV1 = Readonly<{
  policyId: typeof CARDIORESPIRATORY_STARTUP_METHOD_V1;
  standardWarmupSec: number; maximumExtensionSec: number;
  sampleIntervalSec: .01; minimumWindowSec: number; requiredWindows: 3;
  limits: Readonly<Record<CardiorespiratoryStartupMetricV1, Limit>>;
}>;
const mechanical = (absolute: number, relative: number, spanAbsolute = absolute, spanRelative = .1): Limit => ({ absolute, relative, spanAbsolute, spanRelative });
const gas = (absolute: number, relative = .02): Limit => ({ absolute, relative, spanAbsolute: absolute * 2, spanRelative: .2, projectedTenSecondDrift: true });
/** UX operating budget, never a physiological normal range or equilibrium tolerance. */
export const DEFAULT_CARDIORESPIRATORY_STARTUP_POLICY_V1: CardiorespiratoryStartupPolicyV1 = Object.freeze({
  policyId: CARDIORESPIRATORY_STARTUP_METHOD_V1, standardWarmupSec: 60, maximumExtensionSec: 120,
  sampleIntervalSec: .01, minimumWindowSec: 8, requiredWindows: 3,
  limits: Object.freeze({ mapMmHg: mechanical(2, .02, 4), cardiacOutputLMin: mechanical(.2, .04, 2),
    lvVolumeMl: mechanical(3, .03), rvVolumeMl: mechanical(3, .03), lungVolumeL: mechanical(.03, .02),
    pleuralPressureCmH2O: mechanical(.3, .03, .4), arterialO2MmHg: gas(2), arterialCo2MmHg: gas(1),
    systemicO2MmHg: gas(1), systemicCo2MmHg: gas(1), myocardialO2MmHg: gas(.5, .05), myocardialCo2MmHg: gas(1) }),
});
export type CardiorespiratoryStartupRatesV1 = Readonly<{ heartRateBpm: number; respiratoryRatesPerMin: readonly number[] }>;
export type CardiorespiratoryStartupWindowV1 = Readonly<{
  startTimeSec: number; endTimeSec: number; sampleCount: number; means: Values; minima: Values; maxima: Values;
}>;
export type CardiorespiratoryStartupAssessmentV1 = Readonly<{
  methodId: typeof CARDIORESPIRATORY_STARTUP_METHOD_V1;
  interpretation: "single-trajectory-ux-startup-readiness-not-full-settlement";
  status: "ready" | "not-ready"; issues: readonly string[];
  startTimeSec: number; acceptedTimeSec: number; elapsedSec: number;
  standardBudgetSec: number; maximumBudgetSec: number; windowDurationSec: number;
  policy: CardiorespiratoryStartupPolicyV1; rates: CardiorespiratoryStartupRatesV1;
  windows: readonly CardiorespiratoryStartupWindowV1[];
  worstComparison: Readonly<{ metric: CardiorespiratoryStartupMetricV1; score: number; component: "mean" | "span" }> | null;
}>;
type Pending = { startTimeSec: number; sampleCount: number; sums: Record<string, number>; minima: Record<string, number>; maxima: Record<string, number> };
export type CardiorespiratoryStartupMonitorCheckpointV1 = Readonly<{
  schemaId: "cardiorespiratory-startup-monitor-v1"; policy: CardiorespiratoryStartupPolicyV1;
  rates: CardiorespiratoryStartupRatesV1; contextKey: string; startTimeSec: number; lastTimeSec: number;
  windows: readonly CardiorespiratoryStartupWindowV1[]; pending: Pending; terminalSample: CardiorespiratoryStartupSampleV1 | null;
}>;
const metrics = CARDIORESPIRATORY_STARTUP_METRICS_V1;
const equal = (a: unknown, b: unknown) => canonicalJsonStringify(a) === canonicalJsonStringify(b);
const close = (a: number, b: number) => Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= 1e-7;
function valuesValid(v: Values) { return v && Object.keys(v).length === metrics.length && metrics.every(k => Number.isFinite(v[k])); }
function ownPolicy(p: CardiorespiratoryStartupPolicyV1) {
  if (p.policyId !== CARDIORESPIRATORY_STARTUP_METHOD_V1 || p.sampleIntervalSec !== .01 || p.requiredWindows !== 3
    || ![p.standardWarmupSec, p.maximumExtensionSec, p.minimumWindowSec].every(x => Number.isFinite(x) && x >= 0)
    || p.minimumWindowSec < 1 || p.standardWarmupSec > 600 || p.maximumExtensionSec > 600
    || metrics.some(k => !p.limits[k] || ![p.limits[k].absolute, p.limits[k].relative, p.limits[k].spanAbsolute, p.limits[k].spanRelative].every(x => Number.isFinite(x) && x >= 0)
      || p.limits[k].absolute <= 0 || p.limits[k].spanAbsolute <= 0)) throw new Error("Invalid startup readiness policy");
  return structuredClone(p);
}
export function cardiorespiratoryStartupRatesV1(f: CardiorespiratoryFixtureV1): CardiorespiratoryStartupRatesV1 {
  const r = f.cardiorespiratory.respiratory;
  return { heartRateBpm: f.hemodynamicResearchInputs.heartRateBpm, respiratoryRatesPerMin: [
    ...(r.ventilator.mode !== "spontaneous" ? [r.ventilator.respiratoryRatePerMin] : []),
    ...(r.ventilator.mode === "spontaneous" || r.muscle.amplitudeCmH2O > 0 ? [r.muscle.respiratoryRatePerMin] : []),
  ] };
}
const outputIds = {
  mapMmHg: "hemodynamics.pressure.absolute.Ao", cardiacOutputLMin: "hemodynamics.output.native-left",
  lvVolumeMl: "hemodynamics.volume.LV", rvVolumeMl: "hemodynamics.volume.RV",
  lungVolumeL: "cardiorespiratory.volume.lung", pleuralPressureCmH2O: "cardiorespiratory.pressure.pleural",
  arterialO2MmHg: "cardiorespiratory.gas.pressure.arterial-o2", arterialCo2MmHg: "cardiorespiratory.gas.pressure.arterial-co2",
  systemicO2MmHg: "cardiorespiratory.tissue.oxygen-pressure.systemic", myocardialO2MmHg: "cardiorespiratory.tissue.oxygen-pressure.myocardium",
} as const;
export function readCardiorespiratoryStartupSampleV1(session: CardiorespiratorySessionV1): CardiorespiratoryStartupSampleV1 {
  const projected = session.projectValues([...Object.values(outputIds), "hemodynamics.flow.valve.AoV"]);
  const values = Object.fromEntries(Object.entries(outputIds).map(([key, id]) => [key, projected[id]?.value])) as unknown as Record<CardiorespiratoryStartupMetricV1, number>;
  // First beat is not yet available immediately after cold initialization.
  // This fallback is confined to the initial window, before the warmup gate.
  if (values.cardiacOutputLMin === null || values.cardiacOutputLMin === undefined) {
    values.cardiacOutputLMin = (projected["hemodynamics.flow.valve.AoV"]?.value ?? NaN) * .06;
  }
  const cr = session.cardiorespiratoryState();
  values.systemicCo2MmHg = cr.systemic.amount.co2Mol / DEFAULT_TISSUE_GAS_PARAMETERS_V1.systemic.co2CapacityMolPerMmHg;
  values.myocardialCo2MmHg = cr.myocardium.amount.co2Mol / DEFAULT_TISSUE_GAS_PARAMETERS_V1.myocardium.co2CapacityMolPerMmHg;
  if (!valuesValid(values)) throw new Error("Startup observation is missing or nonfinite");
  return { timeSec: session.currentAcceptedClock().acceptedTimeSec, values };
}

/** Shared UX change score for consecutive windows or independent forward checks.
 * Gas mean changes are projected over ten seconds using window-center spacing. */
export function compareCardiorespiratoryStartupWindowsV1(a: CardiorespiratoryStartupWindowV1,
  b: CardiorespiratoryStartupWindowV1, policy: CardiorespiratoryStartupPolicyV1 = DEFAULT_CARDIORESPIRATORY_STARTUP_POLICY_V1): NonNullable<CardiorespiratoryStartupAssessmentV1["worstComparison"]> {
  const separation = (b.startTimeSec + b.endTimeSec - a.startTimeSec - a.endTimeSec) / 2;
  if (!(separation > 0)) throw new Error("Startup comparison requires ordered windows");
  let worst: NonNullable<CardiorespiratoryStartupAssessmentV1["worstComparison"]> = { metric: metrics[0], component: "mean", score: 0 };
  for (const k of metrics) {
    const limit = policy.limits[k];
    const allowed = limit.absolute + limit.relative * Math.max(Math.abs(a.means[k]), Math.abs(b.means[k]));
    // Ppl is directly forced. Its envelope center avoids a phase-clipped breath
    // mean while preserving sensitivity to a changing mechanical offset.
    const centerA = k === "pleuralPressureCmH2O" ? (a.maxima[k] + a.minima[k]) / 2 : a.means[k];
    const centerB = k === "pleuralPressureCmH2O" ? (b.maxima[k] + b.minima[k]) / 2 : b.means[k];
    const mean = Math.abs(centerB - centerA) * (limit.projectedTenSecondDrift ? 10 / separation : 1) / allowed;
    const as = a.maxima[k] - a.minima[k], bs = b.maxima[k] - b.minima[k];
    const span = Math.abs(bs - as) / (limit.spanAbsolute + limit.spanRelative * Math.max(as, bs));
    for (const [component, score] of [["mean", mean], ["span", span]] as const) if (score > worst.score) worst = { metric: k, component, score };
  }
  return worst;
}

/** Three finite observation windows. Oscillation itself is permitted; only
 * changes in mean/range and a permissive projected gas drift are guarded. */
export class CardiorespiratoryStartupMonitorV1 {
  readonly policy: CardiorespiratoryStartupPolicyV1;
  readonly rates: CardiorespiratoryStartupRatesV1;
  readonly contextKey: string;
  readonly startTimeSec: number;
  readonly windowDurationSec: number;
  readonly standardBudgetSec: number;
  readonly maximumBudgetSec: number;
  #lastTimeSec: number;
  #windows: CardiorespiratoryStartupWindowV1[] = [];
  #pending: Pending;
  #terminalSample: CardiorespiratoryStartupSampleV1 | null = null;
  constructor(input: Readonly<{ startTimeSec: number; rates: CardiorespiratoryStartupRatesV1; contextKey?: string; policy?: CardiorespiratoryStartupPolicyV1 }>) {
    this.policy = ownPolicy(input.policy ?? DEFAULT_CARDIORESPIRATORY_STARTUP_POLICY_V1);
    if (!Number.isFinite(input.startTimeSec) || input.startTimeSec < 0 || ![input.rates.heartRateBpm, ...input.rates.respiratoryRatesPerMin].every(x => Number.isFinite(x) && x > 0)) throw new Error("Invalid startup clock/rates");
    this.rates = structuredClone(input.rates); this.contextKey = input.contextKey ?? "";
    this.startTimeSec = input.startTimeSec; this.#lastTimeSec = input.startTimeSec;
    const longestBreathSec = Math.max(0, ...this.rates.respiratoryRatesPerMin.map(rate => 60 / rate));
    const minimum = Math.max(this.policy.minimumWindowSec, 4 * 60 / this.rates.heartRateBpm, 2 * longestBreathSec);
    // Complete cycles of one active respiratory forcing, without requiring a
    // cardiac/respiratory LCM. Independent effort may still modulate the envelope.
    const breathingWindow = longestBreathSec ? Math.ceil(minimum / longestBreathSec) * longestBreathSec : minimum;
    this.windowDurationSec = Math.ceil((breathingWindow - 1e-10) / this.policy.sampleIntervalSec) * this.policy.sampleIntervalSec;
    this.standardBudgetSec = Math.max(this.policy.standardWarmupSec, this.policy.requiredWindows * this.windowDurationSec);
    this.maximumBudgetSec = this.standardBudgetSec + this.policy.maximumExtensionSec;
    this.#pending = this.#empty(this.startTimeSec);
  }
  static restore(v: CardiorespiratoryStartupMonitorCheckpointV1) {
    if (v.schemaId !== "cardiorespiratory-startup-monitor-v1") throw new Error("Unknown startup monitor checkpoint");
    const m = new CardiorespiratoryStartupMonitorV1(v);
    let next = v.startTimeSec;
    for (const w of v.windows) {
      if (!close(w.startTimeSec, next) || !close(w.endTimeSec - w.startTimeSec, m.windowDurationSec)
        || w.sampleCount !== Math.round(m.windowDurationSec / m.policy.sampleIntervalSec)
        || !valuesValid(w.means) || !valuesValid(w.minima) || !valuesValid(w.maxima)
        || metrics.some(k => w.minima[k] > w.means[k] + 1e-9 || w.means[k] > w.maxima[k] + 1e-9)) throw new Error("Invalid startup window");
      next = w.endTimeSec;
    }
    const p = v.pending;
    if (!close(p.startTimeSec, next) || !Number.isSafeInteger(p.sampleCount) || p.sampleCount < 0
      || p.sampleCount >= Math.round(m.windowDurationSec / m.policy.sampleIntervalSec)
      || !close(v.lastTimeSec, next + p.sampleCount * m.policy.sampleIntervalSec)
      || (p.sampleCount > 0 && (!valuesValid(p.sums as Values) || !valuesValid(p.minima as Values) || !valuesValid(p.maxima as Values)))
      || (v.terminalSample && (!close(v.terminalSample.timeSec, v.lastTimeSec) || !valuesValid(v.terminalSample.values)))
      || (v.lastTimeSec > v.startTimeSec && !v.terminalSample)) throw new Error("Invalid startup continuation");
    m.#lastTimeSec = v.lastTimeSec; m.#pending = structuredClone(p); m.#windows = structuredClone([...v.windows]); m.#terminalSample = structuredClone(v.terminalSample);
    return m;
  }
  observe(sample: CardiorespiratoryStartupSampleV1) {
    if (!close(sample.timeSec - this.#lastTimeSec, this.policy.sampleIntervalSec) || !valuesValid(sample.values)) throw new Error("Invalid or missing startup observation");
    const p = this.#pending;
    for (const k of metrics) {
      const value = sample.values[k]; p.sums[k] = (p.sums[k] ?? 0) + value;
      p.minima[k] = Math.min(p.minima[k] ?? value, value); p.maxima[k] = Math.max(p.maxima[k] ?? value, value);
    }
    p.sampleCount++; this.#lastTimeSec = sample.timeSec; this.#terminalSample = structuredClone(sample);
    if (p.sampleCount < Math.round(this.windowDurationSec / this.policy.sampleIntervalSec)) return false;
    this.#windows.push({ startTimeSec: p.startTimeSec, endTimeSec: sample.timeSec, sampleCount: p.sampleCount,
      means: Object.fromEntries(metrics.map(k => [k, p.sums[k]! / p.sampleCount])) as unknown as Values,
      minima: { ...p.minima } as unknown as Values, maxima: { ...p.maxima } as unknown as Values });
    this.#pending = this.#empty(sample.timeSec); return true;
  }
  assessment(): CardiorespiratoryStartupAssessmentV1 {
    const elapsedSec = this.#lastTimeSec - this.startTimeSec, issues: string[] = [];
    if (elapsedSec < this.standardBudgetSec - 1e-7) issues.push("standard-warmup-budget");
    const tail = this.#windows.slice(-this.policy.requiredWindows);
    if (tail.length !== this.policy.requiredWindows) issues.push("observation-window-coverage");
    if (this.#pending.sampleCount) issues.push("incomplete-observation-window");
    let worst: CardiorespiratoryStartupAssessmentV1["worstComparison"] = null;
    for (let i = 1; i < tail.length; i++) {
      const comparison = compareCardiorespiratoryStartupWindowsV1(tail[i - 1]!, tail[i]!, this.policy);
      if (!worst || comparison.score > worst.score) worst = comparison;
    }
    if (worst && worst.score > 1) issues.push("observable-startup-change");
    return { methodId: CARDIORESPIRATORY_STARTUP_METHOD_V1, interpretation: "single-trajectory-ux-startup-readiness-not-full-settlement",
      status: issues.length ? "not-ready" : "ready", issues, startTimeSec: this.startTimeSec, acceptedTimeSec: this.#lastTimeSec, elapsedSec,
      standardBudgetSec: this.standardBudgetSec, maximumBudgetSec: this.maximumBudgetSec, windowDurationSec: this.windowDurationSec,
      policy: this.policy, rates: this.rates, windows: structuredClone(this.#windows), worstComparison: worst };
  }
  checkpoint(): CardiorespiratoryStartupMonitorCheckpointV1 {
    return structuredClone({ schemaId: "cardiorespiratory-startup-monitor-v1", policy: this.policy, rates: this.rates, contextKey: this.contextKey,
      startTimeSec: this.startTimeSec, lastTimeSec: this.#lastTimeSec, windows: this.#windows, pending: this.#pending, terminalSample: this.#terminalSample });
  }
  #empty(startTimeSec: number): Pending { return { startTimeSec, sampleCount: 0, sums: {}, minima: {}, maxima: {} }; }
}

export type CardiorespiratoryStartupIdentityV1 = Readonly<{ modelId: string; sourceSha256: string; artifactRevisionId?: string }>;
export type CardiorespiratoryStartupPreparationV1 = Readonly<{
  status: "ready" | "not-ready" | "failed"; checkpoint: CardiorespiratoryCheckpointV2;
  observer: CardiorespiratoryStartupMonitorCheckpointV1; evidence: CardiorespiratoryStartupAssessmentV1;
  reason: string | null; wallTimeSec: number;
  proof: Readonly<{ identity: CardiorespiratoryStartupIdentityV1; fixtureSha256: string; policySha256: string; checkpointSha256: string;
    terminalSampleSha256: string; evidenceSha256: string }>;
}>;
/** Reusable fitting/authoring preparation: mutates this ONE isolated session.
 * No second trajectory, hidden live warmup, or full-settlement assertion. */
export async function prepareCardiorespiratoryStartupV1(input: Readonly<{
  session: CardiorespiratorySessionV1; identity: CardiorespiratoryStartupIdentityV1; policy?: CardiorespiratoryStartupPolicyV1;
  resume?: Pick<CardiorespiratoryStartupPreparationV1, "observer" | "proof">; wallTimeBudgetSec?: number; abortSignal?: AbortSignal;
  onProgress?: (assessment: CardiorespiratoryStartupAssessmentV1) => void | Promise<void>;
}>): Promise<CardiorespiratoryStartupPreparationV1> {
  const session = input.session, contextKey = canonicalJsonStringify(session.fixture);
  const monitor = input.resume ? CardiorespiratoryStartupMonitorV1.restore(input.resume.observer) : new CardiorespiratoryStartupMonitorV1({
    startTimeSec: session.currentAcceptedClock().acceptedTimeSec, rates: cardiorespiratoryStartupRatesV1(session.fixture), contextKey, policy: input.policy });
  if (monitor.contextKey !== contextKey || !equal(monitor.rates, cardiorespiratoryStartupRatesV1(session.fixture))
    || input.policy && !equal(monitor.policy, input.policy)
    || !close(monitor.checkpoint().lastTimeSec, session.currentAcceptedClock().acceptedTimeSec)
    || input.resume?.observer.terminalSample && !equal(input.resume.observer.terminalSample, readCardiorespiratoryStartupSampleV1(session))) throw new Error("Startup resume binding differs");
  if (input.resume && (!equal(input.resume.proof.identity, input.identity)
    || input.resume.proof.fixtureSha256 !== await sha256CanonicalJsonHex(session.fixture)
    || input.resume.proof.policySha256 !== await sha256CanonicalJsonHex(monitor.policy)
    || input.resume.proof.checkpointSha256 !== await sha256CanonicalJsonHex(session.checkpoint())
    || input.resume.proof.terminalSampleSha256 !== await sha256CanonicalJsonHex(input.resume.observer.terminalSample)
    || input.resume.proof.evidenceSha256 !== await sha256CanonicalJsonHex(monitor.assessment()))) throw new Error("Startup resume proof differs");
  const wall = performance.now(), budget = input.wallTimeBudgetSec ?? 120;
  if (!Number.isFinite(budget) || budget <= 0) throw new Error("Invalid startup wall budget");
  let evidence = monitor.assessment(), reason: string | null = null, failed = false;
  try {
    let ordinal = Math.round(evidence.elapsedSec / monitor.policy.sampleIntervalSec);
    while (evidence.status !== "ready" && (ordinal + 1) * monitor.policy.sampleIntervalSec <= monitor.maximumBudgetSec + 1e-7) {
      if (input.abortSignal?.aborted) { reason = "aborted"; break; }
      if ((performance.now() - wall) / 1000 >= budget) { reason = "wall-budget-exhausted"; break; }
      session.advanceToPresentationTime(monitor.startTimeSec + (++ordinal) * monitor.policy.sampleIntervalSec);
      const completed = monitor.observe(readCardiorespiratoryStartupSampleV1(session));
      if (completed) {
        evidence = monitor.assessment(); await input.onProgress?.(evidence);
        await new Promise<void>(resolve => setTimeout(resolve, 0));
      }
    }
    evidence = monitor.assessment();
    if (evidence.status !== "ready" && !reason) reason = "maximum-warmup-budget-exhausted";
  } catch (error) { failed = true; reason = error instanceof Error ? error.message : String(error); evidence = monitor.assessment(); }
  const checkpoint = session.checkpoint(), observer = monitor.checkpoint();
  const proof = { identity: structuredClone(input.identity), fixtureSha256: await sha256CanonicalJsonHex(session.fixture),
    policySha256: await sha256CanonicalJsonHex(monitor.policy), checkpointSha256: await sha256CanonicalJsonHex(checkpoint),
    terminalSampleSha256: await sha256CanonicalJsonHex(observer.terminalSample), evidenceSha256: await sha256CanonicalJsonHex(evidence) };
  return { status: failed ? "failed" : evidence.status, checkpoint, observer, evidence, reason, wallTimeSec: (performance.now() - wall) / 1000, proof };
}

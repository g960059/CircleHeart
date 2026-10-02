import type { PresentationAnalysisCollectorV1 } from "@/analysis/contracts/PresentationAnalysisV1";
import type { RegisteredModelPresentationBatchV2, StudioSimulationAnalysisV2, StudioSimulationFrameV2, StudioSimulationOutputValueV2 } from "@/studio/contracts/v2/simulation";
import type { StudioJsonObjectV2 } from "@/studio/contracts/v2/json";

export const CARDIORESPIRATORY_VARIATION_METHOD_V1_ID = "cardiorespiratory-three-continuous-breaths-ppv-svv-v1";
export const CARDIORESPIRATORY_VARIATION_OUTPUT_IDS_V1 = Object.freeze({ ppv: "cardiorespiratory.variation.pulse-pressure", svv: "cardiorespiratory.variation.stroke-volume" });
const breath = "cardiorespiratory.breath-index", phase = "rhythm.phase.regular-sinus", pressure = "hemodynamics.pressure.absolute.Ao", flow = "hemodynamics.flow.valve.AoV";
const controlled = "cardiorespiratory.ventilator.controlled", muscle = "cardiorespiratory.muscle.active";
export const CARDIORESPIRATORY_VARIATION_REQUIRED_IDS_V1 = Object.freeze([breath, phase, pressure, flow, controlled, muscle]);
export type CardiorespiratoryVariationSampleV1 = Readonly<{ inputEpoch: number; acceptedRevision: number; acceptedTimeSec: number; values: Readonly<Record<string, number | null>> }>;
type Sample = CardiorespiratoryVariationSampleV1;
export type CardiorespiratoryVariationResultV1 = StudioJsonObjectV2 & Readonly<{
  methodId: typeof CARDIORESPIRATORY_VARIATION_METHOD_V1_ID; status: "available" | "unavailable"; reason?: string;
}>;
const unavailable = (reason: string): CardiorespiratoryVariationResultV1 => Object.freeze({ methodId: CARDIORESPIRATORY_VARIATION_METHOD_V1_ID,
  status: "unavailable", reason, values: { [CARDIORESPIRATORY_VARIATION_OUTPUT_IDS_V1.ppv]: null, [CARDIORESPIRATORY_VARIATION_OUTPUT_IDS_V1.svv]: null } });
const fractionalVariation = (values: readonly number[]) => {
  const maximum = Math.max(...values), minimum = Math.min(...values);
  return 2 * (maximum - minimum) / (maximum + minimum);
};
/** Three complete consecutive breaths, at least three whole cardiac cycles per
 * breath. An observed waveform metric; never a fluid-responsiveness diagnosis.
 * SV is the net aortic-valve volume; significant regurgitation is ineligible. */
export function evaluateCardiorespiratoryVariationV1(samples: readonly Sample[]): CardiorespiratoryVariationResultV1 {
  if (samples.length < 2) return unavailable("insufficient-complete-breaths");
  const breathBoundaries: number[] = [], beatBoundaries: number[] = [];
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i]!;
    if (CARDIORESPIRATORY_VARIATION_REQUIRED_IDS_V1.some(id => !Number.isFinite(s.values[id]))) return unavailable("missing-exact-observation");
    if (s.values[controlled] !== 1 || s.values[muscle] !== 0) return unavailable("requires-passive-controlled-ventilation");
    if (!Number.isInteger(s.values[breath]) || s.values[phase]! < 0 || s.values[phase]! >= 1) return unavailable("invalid-cycle-clock");
    const prev = samples[i - 1]; if (!prev) continue;
    if (s.inputEpoch !== prev.inputEpoch || s.acceptedRevision <= prev.acceptedRevision
      || Math.abs(s.acceptedTimeSec - prev.acceptedTimeSec - .002) > 2e-10) return unavailable("noncontinuous-observation-window");
    const increment = s.values[breath]! - prev.values[breath]!;
    if (increment !== 0 && increment !== 1) return unavailable("noncontinuous-breath-clock");
    if (increment === 1) breathBoundaries.push(i);
    const delta = s.values[phase]! - prev.values[phase]!;
    if (delta < -.5) beatBoundaries.push(i);
    else if (delta <= 0 || delta > .5) return unavailable("invalid-cardiac-phase");
  }
  if (breathBoundaries.length < 4) return unavailable("insufficient-complete-breaths");
  const selected = breathBoundaries.slice(-4), ppvs: number[] = [], svvs: number[] = [], beatDurations: number[] = [];
  const breathReports: StudioJsonObjectV2[] = [];
  for (let b = 0; b < 3; b++) {
    const start = selected[b]!, end = selected[b + 1]!;
    const boundaries = beatBoundaries.filter(index => index >= start && index <= end);
    if (boundaries.length < 4) return unavailable("fewer-than-three-complete-beats-per-breath");
    const pulsePressures: number[] = [], strokeVolumes: number[] = [];
    for (let n = 1; n < boundaries.length; n++) {
      const a = boundaries[n - 1]!, z = boundaries[n]!;
      let pmin = Infinity, pmax = -Infinity, forward = 0, reverse = 0;
      for (let i = a; i <= z; i++) {
        const s = samples[i]!; pmin = Math.min(pmin, s.values[pressure]!); pmax = Math.max(pmax, s.values[pressure]!);
        if (i === a) continue;
        const prev = samples[i - 1]!, dt = s.acceptedTimeSec - prev.acceptedTimeSec;
        // This is analysis of observed valve flow, not the gas-transport flux.
        forward += .5 * (Math.max(prev.values[flow]!, 0) + Math.max(s.values[flow]!, 0)) * dt;
        reverse += .5 * (Math.max(-prev.values[flow]!, 0) + Math.max(-s.values[flow]!, 0)) * dt;
      }
      if (!(forward > 0) || reverse > .01 * forward) return unavailable("no-valid-net-forward-stroke-volume");
      if (!(pmax > pmin)) return unavailable("no-pulsatile-pressure");
      pulsePressures.push(pmax - pmin); strokeVolumes.push(forward - reverse);
      beatDurations.push(samples[z]!.acceptedTimeSec - samples[a]!.acceptedTimeSec);
    }
    const ppv = fractionalVariation(pulsePressures), svv = fractionalVariation(strokeVolumes);
    ppvs.push(ppv); svvs.push(svv);
    breathReports.push({ breathIndex: samples[start]!.values[breath]!, startTimeSec: samples[start]!.acceptedTimeSec,
      endTimeSec: samples[end]!.acceptedTimeSec, completeBeatCount: strokeVolumes.length, ppv, svv });
  }
  if (Math.max(...beatDurations) / Math.min(...beatDurations) > 1.05) return unavailable("irregular-cardiac-cycle-window");
  return Object.freeze({ methodId: CARDIORESPIRATORY_VARIATION_METHOD_V1_ID, status: "available", breathCount: 3,
    startTimeSec: samples[selected[0]!]!.acceptedTimeSec, endTimeSec: samples[selected[3]!]!.acceptedTimeSec,
    values: { [CARDIORESPIRATORY_VARIATION_OUTPUT_IDS_V1.ppv]: ppvs.reduce((a, b) => a + b) / 3,
      [CARDIORESPIRATORY_VARIATION_OUTPUT_IDS_V1.svv]: svvs.reduce((a, b) => a + b) / 3 }, breaths: breathReports,
    interpretation: "modeled-respiratory-variation-not-fluid-responsiveness-or-volume-status", pressureStation: "aortic-model-node",
    denominator: "half-the-sum-of-per-breath-maximum-and-minimum", aggregation: "mean-of-three-complete-breath-variations" });
}

export class CardiorespiratoryVariationCollectorV1 implements PresentationAnalysisCollectorV1 {
  #scope = ""; #samples: Sample[] = [];
  ingest(batch: RegisteredModelPresentationBatchV2): StudioSimulationAnalysisV2 | undefined {
    const frame = batch.terminalFrame, scope = JSON.stringify([frame.modelId, frame.runtimeSessionId, frame.scenarioId, frame.inputEpoch]);
    let result: CardiorespiratoryVariationResultV1 | undefined;
    let resultSample: Sample | undefined;
    if (scope !== this.#scope) { this.#scope = scope; this.#samples = []; result = unavailable("insufficient-complete-breaths"); }
    const columns = CARDIORESPIRATORY_VARIATION_REQUIRED_IDS_V1.map(id => batch.outputIds.indexOf(id));
    for (let row = 0; row < batch.acceptedTimesSec.length; row++) {
      const sample: Sample = { inputEpoch: frame.inputEpoch, acceptedRevision: batch.acceptedRevisions[row]!, acceptedTimeSec: batch.acceptedTimesSec[row]!,
        values: Object.fromEntries(CARDIORESPIRATORY_VARIATION_REQUIRED_IDS_V1.map((id, i) => {
          const col = columns[i]!, offset = row * batch.outputIds.length + col;
          return [id, col < 0 || batch.outputStates[offset]! >= 2 ? null : batch.outputValues[offset]!];
        })) };
      const prev = this.#samples.at(-1);
      const priorResult = result;
      if (prev && (sample.acceptedRevision <= prev.acceptedRevision || Math.abs(sample.acceptedTimeSec - prev.acceptedTimeSec - .002) > 2e-10)) {
        this.#samples = []; result = unavailable("noncontinuous-observation-window");
      }
      this.#samples.push(sample);
      if (CARDIORESPIRATORY_VARIATION_REQUIRED_IDS_V1.some(id => !Number.isFinite(sample.values[id])) || sample.values[controlled] !== 1 || sample.values[muscle] !== 0) {
        result = evaluateCardiorespiratoryVariationV1(this.#samples); resultSample = sample; this.#samples = []; continue;
      }
      if (prev && sample.values[breath] !== prev.values[breath]) {
        result = evaluateCardiorespiratoryVariationV1(this.#samples);
        // Retain the last four complete boundaries plus their left bracket.
        const boundaries = this.#samples.filter((s, i, all) => i > 0 && s.values[breath] !== all[i - 1]!.values[breath]);
        if (boundaries.length >= 4) { const cutoff = boundaries.at(-4)!.acceptedTimeSec; this.#samples = this.#samples.filter(s => s.acceptedTimeSec >= cutoff - .002001); }
      }
      if (this.#samples.length > 45_002) { this.#samples = []; result = unavailable("observation-window-capacity-exceeded"); }
      if (result !== priorResult) resultSample = sample;
    }
    return result ? Object.freeze({ modelId: frame.modelId, runtimeSessionId: frame.runtimeSessionId, scenarioId: frame.scenarioId, inputEpoch: frame.inputEpoch,
      sourceAcceptedRevision: resultSample?.acceptedRevision ?? frame.acceptedRevision, sourceAcceptedTimeSec: resultSample?.acceptedTimeSec ?? frame.acceptedTimeSec, analysisId: CARDIORESPIRATORY_VARIATION_METHOD_V1_ID, payload: result }) : undefined;
  }
}
export const CARDIORESPIRATORY_VARIATION_DERIVATION_V1 = Object.freeze({ derivationId: CARDIORESPIRATORY_VARIATION_METHOD_V1_ID,
  outputs: Object.freeze(Object.values(CARDIORESPIRATORY_VARIATION_OUTPUT_IDS_V1).map(outputId => Object.freeze({ outputId, kind: "metric" as const, unit: "1", shape: "scalar" as const,
    scope: "window" as const, dependencies: CARDIORESPIRATORY_VARIATION_REQUIRED_IDS_V1 }))), requiredAnalysisIds: Object.freeze([]),
  runtime: Object.freeze({ kind: "presentation" as const, method: Object.freeze({ methodId: CARDIORESPIRATORY_VARIATION_METHOD_V1_ID,
    requiredExactOutputIds: CARDIORESPIRATORY_VARIATION_REQUIRED_IDS_V1, create: () => new CardiorespiratoryVariationCollectorV1() }) }) });

export function cardiorespiratoryVariationOutputValueV1(analyses: readonly StudioSimulationAnalysisV2[] | undefined,
  frame: StudioSimulationFrameV2 | null, outputId: string): StudioSimulationOutputValueV2 | undefined {
  if (!(Object.values(CARDIORESPIRATORY_VARIATION_OUTPUT_IDS_V1) as string[]).includes(outputId)) return undefined;
  const a = frame && analyses?.find(a => a.analysisId === CARDIORESPIRATORY_VARIATION_METHOD_V1_ID && a.modelId === frame.modelId
    && a.runtimeSessionId === frame.runtimeSessionId && a.scenarioId === frame.scenarioId && a.inputEpoch === frame.inputEpoch
    && a.sourceAcceptedTimeSec <= frame.acceptedTimeSec && a.sourceAcceptedRevision <= frame.acceptedRevision);
  const p = a?.payload;
  const values = p && typeof p === "object" && !Array.isArray(p) && "status" in p && p.status === "available" && "values" in p ? p.values : null;
  const candidate = values && typeof values === "object" && !Array.isArray(values) ? (values as Record<string, unknown>)[outputId] : null;
  const value = typeof candidate === "number" && Number.isFinite(candidate) ? candidate : null;
  return { outputId, value, availability: value === null ? "not-evaluated-at-accepted-state" : "available", quality: value === null ? "not-assessed" : "accepted-derived" };
}

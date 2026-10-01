import type { PresentationAnalysisCollectorV1 } from "@/analysis/contracts/PresentationAnalysisV1";
import type { RegisteredModelPresentationBatchV2, StudioSimulationAnalysisV2, StudioSimulationFrameV2, StudioSimulationOutputValueV2 } from "@/studio/contracts/v2/simulation";

export const CARDIORESPIRATORY_BREATH_METHOD_V1_ID = "cardiorespiratory-complete-controlled-breath-means-v1";
export const CARDIORESPIRATORY_BREATH_OUTPUT_IDS_V1 = Object.freeze({
  inspiredTidalVolume: "cardiorespiratory.breath.inspired-tidal-volume",
  expiredTidalVolume: "cardiorespiratory.breath.expired-tidal-volume",
  minuteVentilation: "cardiorespiratory.breath.minute-ventilation",
  cardiacOutput: "cardiorespiratory.breath.cardiac-output",
  oxygenDelivery: "cardiorespiratory.breath.oxygen-delivery",
  oxygenConsumption: "cardiorespiratory.breath.oxygen-consumption",
  consumptionDeliveryRatio: "cardiorespiratory.breath.consumption-delivery-ratio",
});
const ids = CARDIORESPIRATORY_BREATH_OUTPUT_IDS_V1;
const breath = "cardiorespiratory.breath-index", controlled = "cardiorespiratory.ventilator.controlled";
const flow = "cardiorespiratory.flow.airway", aorticFlow = "hemodynamics.flow.valve.AoV";
const delivery = "cardiorespiratory.oxygen.delivery", consumption = "cardiorespiratory.oxygen.consumption";
export const CARDIORESPIRATORY_BREATH_REQUIRED_IDS_V1 = Object.freeze([breath, controlled, flow, aorticFlow, delivery, consumption]);
type Sample = { time: number; revision: number; values: Record<string, number> };
type Window = { start: number; inspired: number; expired: number; aortic: number; oxygenDelivered: number; oxygenConsumed: number };
/** O(1) presentation accumulator. Integrates signed valve flux and actual
 * consumption over a complete observed controlled breath. This is a transient
 * whole-system consumption/delivery ratio, not Fick extraction: tissue/blood
 * storage may change during the window. Airway volumes use model BTPS flow. */
export class CardiorespiratoryBreathMetricsCollectorV1 implements PresentationAnalysisCollectorV1 {
  #scope = "";
  #last: Sample | null = null;
  #window: Window | null = null;
  ingest(batch: RegisteredModelPresentationBatchV2): StudioSimulationAnalysisV2 | undefined {
    const f = batch.terminalFrame, scope = JSON.stringify([f.modelId, f.runtimeSessionId, f.scenarioId, f.inputEpoch]);
    let result: StudioSimulationAnalysisV2 | undefined;
    const report = (s: Sample | null, reason: string | null, values: Record<string, number | null>, start?: number) => {
      result = { modelId: f.modelId, runtimeSessionId: f.runtimeSessionId, scenarioId: f.scenarioId, inputEpoch: f.inputEpoch,
        sourceAcceptedRevision: s?.revision ?? f.acceptedRevision, sourceAcceptedTimeSec: s?.time ?? f.acceptedTimeSec,
        analysisId: CARDIORESPIRATORY_BREATH_METHOD_V1_ID,
        payload: { methodId: CARDIORESPIRATORY_BREATH_METHOD_V1_ID, status: reason === null ? "available" : "unavailable", reason,
          values, startTimeSec: start ?? null, endTimeSec: s?.time ?? null,
          interpretation: "observed-complete-breath-means-with-transient-gas-storage" } };
    };
    const empty = () => Object.fromEntries(Object.values(ids).map(id => [id, null]));
    if (scope !== this.#scope) { this.#scope = scope; this.#last = null; this.#window = null; report(null, "awaiting-complete-breath", empty()); }
    const columns = CARDIORESPIRATORY_BREATH_REQUIRED_IDS_V1.map(id => batch.outputIds.indexOf(id));
    for (let row = 0; row < batch.acceptedTimesSec.length; row++) {
      const s: Sample = { time: batch.acceptedTimesSec[row]!, revision: batch.acceptedRevisions[row]!,
        values: Object.fromEntries(CARDIORESPIRATORY_BREATH_REQUIRED_IDS_V1.map((id, i) => {
          const col = columns[i]!, offset = row * batch.outputIds.length + col;
          return [id, col < 0 || batch.outputStates[offset]! >= 2 ? NaN : batch.outputValues[offset]!];
        })) };
      const p = this.#last;
      const delta = p ? s.values[breath]! - p.values[breath]! : 0;
      const valid = Object.values(s.values).every(Number.isFinite) && s.values[controlled] === 1 && Number.isInteger(s.values[breath])
        && (!p || (s.revision > p.revision && Math.abs(s.time - p.time - .002) < 2e-10 && (delta === 0 || delta === 1)));
      if (!valid) { this.#last = null; this.#window = null; report(s, "requires-continuous-controlled-breath", empty()); continue; }
      if (p && this.#window) {
        const w = this.#window, dt = s.time - p.time;
        w.inspired += .5 * (Math.max(0, p.values[flow]!) + Math.max(0, s.values[flow]!)) * dt;
        w.expired += .5 * (Math.max(0, -p.values[flow]!) + Math.max(0, -s.values[flow]!)) * dt;
        w.aortic += .5 * (p.values[aorticFlow]! + s.values[aorticFlow]!) * dt;
        w.oxygenDelivered += .5 * (p.values[delivery]! + s.values[delivery]!) * dt;
        w.oxygenConsumed += .5 * (p.values[consumption]! + s.values[consumption]!) * dt;
        if (delta === 1) {
          const duration = s.time - w.start;
          report(s, null, { [ids.inspiredTidalVolume]: w.inspired, [ids.expiredTidalVolume]: w.expired,
            [ids.minuteVentilation]: w.expired * 60 / duration,
            [ids.cardiacOutput]: w.aortic * .06 / duration,
            [ids.oxygenDelivery]: w.oxygenDelivered / duration, [ids.oxygenConsumption]: w.oxygenConsumed / duration,
            [ids.consumptionDeliveryRatio]: w.oxygenDelivered > 0 ? w.oxygenConsumed / w.oxygenDelivered : null }, w.start);
        }
      }
      if (p && delta === 1) this.#window = { start: s.time, inspired: 0, expired: 0, aortic: 0, oxygenDelivered: 0, oxygenConsumed: 0 };
      this.#last = s;
    }
    return result;
  }
}
const units = ["L", "L", "L/min", "L/min", "mL/min", "mL/min", "1"];
export const CARDIORESPIRATORY_BREATH_DERIVATION_V1 = Object.freeze({ derivationId: CARDIORESPIRATORY_BREATH_METHOD_V1_ID,
  outputs: Object.freeze(Object.values(ids).map((outputId, i) => Object.freeze({ outputId, kind: "metric" as const, unit: units[i]!, shape: "scalar" as const,
    scope: "window" as const, dependencies: CARDIORESPIRATORY_BREATH_REQUIRED_IDS_V1 }))), requiredAnalysisIds: Object.freeze([]),
  runtime: Object.freeze({ kind: "presentation" as const, method: Object.freeze({ methodId: CARDIORESPIRATORY_BREATH_METHOD_V1_ID,
    requiredExactOutputIds: CARDIORESPIRATORY_BREATH_REQUIRED_IDS_V1, create: () => new CardiorespiratoryBreathMetricsCollectorV1() }) }) });
export function cardiorespiratoryBreathOutputValueV1(analyses: readonly StudioSimulationAnalysisV2[] | undefined,
  frame: StudioSimulationFrameV2 | null, outputId: string): StudioSimulationOutputValueV2 | undefined {
  if (!(Object.values(ids) as string[]).includes(outputId)) return undefined;
  const a = frame && analyses?.find(a => a.analysisId === CARDIORESPIRATORY_BREATH_METHOD_V1_ID && a.modelId === frame.modelId
    && a.runtimeSessionId === frame.runtimeSessionId && a.scenarioId === frame.scenarioId && a.inputEpoch === frame.inputEpoch
    && a.sourceAcceptedTimeSec <= frame.acceptedTimeSec && a.sourceAcceptedRevision <= frame.acceptedRevision);
  const p = a?.payload;
  const values = p && typeof p === "object" && !Array.isArray(p) && "status" in p && p.status === "available" && "values" in p ? p.values : null;
  const candidate = values && typeof values === "object" && !Array.isArray(values) ? (values as Record<string, unknown>)[outputId] : null;
  const value = typeof candidate === "number" && Number.isFinite(candidate) ? candidate : null;
  return { outputId, value, availability: value === null ? "not-evaluated-at-accepted-state" : "available", quality: value === null ? "not-assessed" : "accepted-derived" };
}

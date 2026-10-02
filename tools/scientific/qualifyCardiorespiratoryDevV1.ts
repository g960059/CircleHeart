/** Bounded numerical/operating-point qualification, NOT H3 patient-data validation.
 * JSONL goes to stdout; this runner never writes bulky result artifacts.
 * Example: vite-node --script tools/scientific/qualifyCardiorespiratoryDevV1.ts --duration 60 --scenarios
 */
import { performance } from "node:perf_hooks";
import { CardiorespiratorySessionV1, type CardiorespiratoryStateV1 } from "@/engine/cardiorespiratory/CardiorespiratorySessionV1";
import { DEFAULT_CARDIORESPIRATORY_FIXTURE_V1, type CardiorespiratoryFixtureV1 } from "@/engine/cardiorespiratory/CardiorespiratoryFixtureV1";
import { bloodGasPressuresFromAmountsV1 } from "@/engine/cardiorespiratory/BloodGasChemistryV1";
import { cardiorespiratoryPhysicalBloodVolumesV1 } from "@/engine/cardiorespiratory/CardiorespiratoryBloodNetworkV1";
import { CARDIORESPIRATORY_VARIATION_REQUIRED_IDS_V1, evaluateCardiorespiratoryVariationV1,
  type CardiorespiratoryVariationSampleV1 } from "@/analysis/methods/cardiorespiratory/CardiorespiratoryVariationV1";

const dtSec = .002;
const observationIds = {
  aorticPressureMmHg: "hemodynamics.pressure.absolute.Ao",
  aorticFlowMlSec: "hemodynamics.flow.valve.AoV",
  coronaryInletMlSec: "coronary.flow.total", coronaryVenousOutletMlSec: "coronary.flow.venous-outlet",
  arterialO2MmHg: "cardiorespiratory.gas.pressure.arterial-o2",
  arterialCo2MmHg: "cardiorespiratory.gas.pressure.arterial-co2",
  arterialO2Saturation01: "cardiorespiratory.gas.saturation.arterial-o2",
  venousO2Saturation01: "cardiorespiratory.gas.saturation.mixed-venous-o2",
  arterialPH: "cardiorespiratory.gas.ph.arterial", arterialO2ContentMlDl: "cardiorespiratory.gas.content.arterial-o2",
  oxygenFluxMlMin: "cardiorespiratory.oxygen.delivery", oxygenConsumptionMlMin: "cardiorespiratory.oxygen.consumption",
  myocardialConsumptionMlMin: "cardiorespiratory.oxygen.myocardial-consumption",
  systemicTissueO2MmHg: "cardiorespiratory.tissue.oxygen-pressure.systemic",
  myocardialTissueO2MmHg: "cardiorespiratory.tissue.oxygen-pressure.myocardium",
  lungVolumeL: "cardiorespiratory.volume.lung", pleuralPressureCmH2O: "cardiorespiratory.pressure.pleural",
  alveolarO2MmHg1: "cardiorespiratory.gas.pressure.alveolar-o2.1", alveolarO2MmHg2: "cardiorespiratory.gas.pressure.alveolar-o2.2",
  alveolarCo2MmHg1: "cardiorespiratory.gas.pressure.alveolar-co2.1", alveolarCo2MmHg2: "cardiorespiratory.gas.pressure.alveolar-co2.2",
  pulmonaryPerfusionMlSec1: "cardiorespiratory.flow.perfusion.1", pulmonaryPerfusionMlSec2: "cardiorespiratory.flow.perfusion.2",
  airwayOpen1: "cardiorespiratory.lung.open.1", airwayOpen2: "cardiorespiratory.lung.open.2",
} as const;
const selectedIds = [...new Set([...CARDIORESPIRATORY_VARIATION_REQUIRED_IDS_V1, ...Object.values(observationIds)])];
const emit = (value: unknown) => console.log(JSON.stringify(value));
function parseArguments() {
  let durationSec = 30, scenarioDurationSec = 20, scenarios = false;
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--scenarios") scenarios = true;
    else if (arg === "--duration" || arg === "--scenario-duration") {
      const value = Number(args[++i]);
      if (!Number.isFinite(value) || value < dtSec || value > 120 || Math.abs(value / dtSec - Math.round(value / dtSec)) > 1e-8) {
        throw new Error(`${arg} must be a positive multiple of 0.002 s, at most 120 s`);
      }
      if (arg === "--duration") durationSec = value; else scenarioDurationSec = value;
    } else throw new Error(`Unknown argument ${arg}; use --duration 30 [--scenarios] [--scenario-duration 20]`);
  }
  return { durationSec, scenarioDurationSec, scenarios };
}
function residuals(state: CardiorespiratoryStateV1) {
  const amounts = [...Object.values(state.blood), state.respiratory.conductingGasMol,
    ...state.respiratory.unitGasMol, state.systemic.amount, state.myocardium.amount];
  const total = amounts.reduce((t, a) => ({ o2Mol: t.o2Mol + a.o2Mol, co2Mol: t.co2Mol + a.co2Mol }), { o2Mol: 0, co2Mol: 0 });
  const l = state.ledger;
  return { o2Mol: total.o2Mol - l.initialO2Mol - l.boundaryO2Mol + l.consumedO2Mol - l.interventionO2Mol,
    co2Mol: total.co2Mol - l.initialCo2Mol - l.boundaryCo2Mol - l.producedCo2Mol - l.interventionCo2Mol };
}
function run(name: string, create: () => CardiorespiratorySessionV1, durationSec: number, requireFullDemand = false) {
  let session: CardiorespiratorySessionV1 | undefined;
  const wallStart = performance.now();
  try {
    session = create();
    const startTimeSec = session.currentAcceptedState().acceptedTimeSec;
    const initial = session.cardiorespiratoryState();
    let previousBreath = initial.respiratory.completedBreaths, windowStartSec = startTimeSec;
    let windowStartsAtBreathBoundary = Math.abs(initial.respiratory.ventilatorCycleTimeSec) < 1e-10;
    let sum: Record<string, number> = {}, count = 0, minimumLungVolumeL = Infinity, maximumLungVolumeL = -Infinity;
    let maximumO2ResidualMol = 0, maximumCo2ResidualMol = 0;
    const samples: CardiorespiratoryVariationSampleV1[] = [];
    const flush = (endTimeSec: number, completeBreath: boolean) => {
      if (!count) return;
      emit({ kind: "period", name, startTimeSec: windowStartSec, endTimeSec, completeBreath,
        means: Object.fromEntries(Object.entries(sum).map(([key, value]) => [key, value / count])),
        lungVolumeRangeL: [minimumLungVolumeL, maximumLungVolumeL] });
      sum = {}; count = 0; minimumLungVolumeL = Infinity; maximumLungVolumeL = -Infinity; windowStartSec = endTimeSec;
    };
    for (let i = 1; i <= Math.round(durationSec / dtSec); i++) {
      session.advanceToPresentationTime(startTimeSec + i * dtSec);
      const projected = session.projectValues(selectedIds);
      const values = Object.fromEntries(Object.entries(projected).map(([key, value]) => [key, value.value]));
      if (selectedIds.some(id => !Number.isFinite(values[id]))) throw new Error("Missing/nonfinite exact observation");
      const hemo = session.currentAcceptedState(), state = session.cardiorespiratoryState();
      samples.push({ inputEpoch: 0, acceptedRevision: hemo.revision, acceptedTimeSec: hemo.acceptedTimeSec, values });
      for (const [key, id] of Object.entries(observationIds)) sum[key] = (sum[key] ?? 0) + values[id]!;
      const cv = bloodGasPressuresFromAmountsV1(state.blood.CV, cardiorespiratoryPhysicalBloodVolumesV1(hemo).CV, session.fixture.cardiorespiratory.bloodGas);
      for (const [key, value] of Object.entries({ coronaryVenousO2MmHg: cv.o2MmHg,
        coronaryVenousCo2MmHg: cv.co2MmHg, coronaryVenousSaturation01: cv.saturation01 })) sum[key] = (sum[key] ?? 0) + value;
      const volume = values[observationIds.lungVolumeL]!;
      minimumLungVolumeL = Math.min(minimumLungVolumeL, volume); maximumLungVolumeL = Math.max(maximumLungVolumeL, volume); count++;
      const residual = residuals(state);
      if (!Object.values(residual).every(Number.isFinite)) throw new Error("Nonfinite independent gas ledger");
      maximumO2ResidualMol = Math.max(maximumO2ResidualMol, Math.abs(residual.o2Mol));
      maximumCo2ResidualMol = Math.max(maximumCo2ResidualMol, Math.abs(residual.co2Mol));
      if (maximumO2ResidualMol > 1e-10 || maximumCo2ResidualMol > 1e-10) throw new Error("Independent gas ledger failed");
      if (state.respiratory.completedBreaths !== previousBreath) {
        flush(hemo.acceptedTimeSec, windowStartsAtBreathBoundary);
        previousBreath = state.respiratory.completedBreaths; windowStartsAtBreathBoundary = true;
      }
    }
    flush(session.currentAcceptedState().acceptedTimeSec, false);
    const state = session.cardiorespiratoryState();
    const unmetO2Mol = { systemic: state.systemic.cumulativeUnmetO2Mol - initial.systemic.cumulativeUnmetO2Mol,
      myocardium: state.myocardium.cumulativeUnmetO2Mol - initial.myocardium.cumulativeUnmetO2Mol };
    const variation = evaluateCardiorespiratoryVariationV1(samples);
    if (requireFullDemand && (unmetO2Mol.systemic !== 0 || unmetO2Mol.myocardium !== 0)) throw new Error("Default operating point did not fulfill prescribed demand");
    if (requireFullDemand && durationSec >= 20 && variation.status !== "available") throw new Error("Default operating point did not yield the expected PPV/SVV observation window");
    emit({ kind: "summary", name, status: "completed", startTimeSec, endTimeSec: session.currentAcceptedState().acceptedTimeSec,
      wallTimeSec: (performance.now() - wallStart) / 1000, maximumO2ResidualMol, maximumCo2ResidualMol, unmetO2Mol, variation });
    return session;
  } catch (error) {
    emit({ kind: "failure", name, status: "failed", acceptedTimeSec: session?.currentAcceptedState().acceptedTimeSec ?? null,
      wallTimeSec: (performance.now() - wallStart) / 1000, error: error instanceof Error ? error.message : String(error) });
    process.exitCode = 1; return null;
  }
}
function withPeep(fixture: CardiorespiratoryFixtureV1, peepCmH2O: number): CardiorespiratoryFixtureV1 {
  return { ...fixture, hemodynamicResearchInputs: { ...fixture.hemodynamicResearchInputs, peepCmH2O },
    cardiorespiratory: { ...fixture.cardiorespiratory, respiratory: { ...fixture.cardiorespiratory.respiratory,
      ventilator: { ...fixture.cardiorespiratory.respiratory.ventilator, peepCmH2O } } } };
}
function main() {
  const args = parseArguments(), fixture = DEFAULT_CARDIORESPIRATORY_FIXTURE_V1;
  emit({ kind: "scope", scope: "development-numerical-and-operating-point-construction-not-H3-patient-validation", ...args,
    interpretation: "Finite transients and directional scenarios; neither gas steady-state certification nor fluid-responsiveness diagnosis." });
  const baseline = run("baseline", () => CardiorespiratorySessionV1.create(fixture), args.durationSec, true);
  if (!args.scenarios) return;
  if (baseline) {
    const f = baseline.fixture;
    run("inspired-o2-0.6-warm", () => baseline.reconfigure({ ...f, cardiorespiratory: { ...f.cardiorespiratory,
      respiratory: { ...f.cardiorespiratory.respiratory, inspiredGasFractions: { o2: .6, co2: 0, inert: .4 } } } }), args.scenarioDurationSec);
    run("peep-15-warm", () => baseline.reconfigure(withPeep(f, 15)), args.scenarioDurationSec);
  }
  run("hemoglobin-7.5-cold", () => CardiorespiratorySessionV1.create({ ...fixture,
    cardiorespiratory: { ...fixture.cardiorespiratory, bloodGas: { ...fixture.cardiorespiratory.bloodGas, hemoglobinGPerDl: 7.5 } } }), args.scenarioDurationSec);
  run("heart-rate-40-blood-volume-4200-cold", () => CardiorespiratorySessionV1.create({ ...fixture,
    hemodynamicResearchInputs: { ...fixture.hemodynamicResearchInputs, heartRateBpm: 40, totalBloodVolumeMl: 4200 } }), args.scenarioDurationSec);
  for (const peep of [5, 15]) {
    const f = withPeep(fixture, peep), respiratory = f.cardiorespiratory.respiratory;
    run(`heterogeneous-peep-${peep}-cold`, () => CardiorespiratorySessionV1.create({ ...f,
      cardiorespiratory: { ...f.cardiorespiratory, respiratory: { ...respiratory,
        units: [respiratory.units[0], { ...respiratory.units[1], elastanceCmH2OPerL: 30, resistanceCmH2OSPerL: 40,
          recruitment: { openingTranspulmonaryPressureCmH2O: 15, closingTranspulmonaryPressureCmH2O: 5, openingTimeSec: .3, closingTimeSec: .3 } }] } } }), args.scenarioDurationSec);
  }
}
main();

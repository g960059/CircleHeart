/**
 * Two functional lung units share a chest wall and a conducting gas reservoir.
 * Dry-gas amounts are the only lung storage states. Volumes and pressures solve
 * PV mechanics and the humidified ideal-gas law together at every evaluation.
 *
 * The perfectly mixed conducting reservoir has fixed reference BTPS capacity:
 * it ignores pressure-dependent airway compression and is not a capnograph.
 * There is no respiratory feedback, expiratory flow limitation, or
 * device-specific ventilator model.
 * Airway closure retains gas; subsequent gas exchange may deflate a closed unit.
 */
export type RespiratoryPairV1<T> = readonly [T, T];
export type RespiratoryGasAmountV1 = Readonly<{
  o2Mol: number;
  co2Mol: number;
  inertMol: number;
}>;
export type RespiratoryGasFractionsV1 = Readonly<{
  o2: number;
  co2: number;
  inert: number;
}>;
export type RespiratoryRecruitmentV1 = Readonly<{
  openingTranspulmonaryPressureCmH2O: number;
  closingTranspulmonaryPressureCmH2O: number;
  openingTimeSec: number;
  closingTimeSec: number;
}>;
export type RespiratoryUnitConfigV1 = Readonly<{
  referenceVolumeL: number;
  referenceTranspulmonaryPressureCmH2O: number;
  elastanceCmH2OPerL: number;
  resistanceCmH2OSPerL: number;
  /** Cubic extra recoil above reference volume; zero gives linear elasticity. */
  overdistensionCmH2O: number;
  recruitment: RespiratoryRecruitmentV1 | null;
}>;
export type RespiratoryMechanicsConfigV1 = Readonly<{
  environment: Readonly<{
    barometricPressureMmHg: number;
    waterVaporPressureMmHg: number;
    temperatureKelvin: number;
  }>;
  chestWall: Readonly<{
    referenceTotalVolumeL: number;
    referencePleuralPressureCmH2O: number;
    elastanceCmH2OPerL: number;
  }>;
  units: RespiratoryPairV1<RespiratoryUnitConfigV1>;
  ventilator: Readonly<{
    mode: "spontaneous" | "pcv" | "vcv";
    respiratoryRatePerMin: number;
    /** Includes the optional terminal inspiratory hold. */
    inspiratoryTimeSec: number;
    peepCmH2O: number;
    pressureControlAbovePeepCmH2O: number;
    tidalVolumeL: number;
    pressureLimitCmH2O: number;
    riseTimeSec: number;
    inspiratoryHoldSec: number;
  }>;
  muscle: Readonly<{
    amplitudeCmH2O: number;
    respiratoryRatePerMin: number;
    inspiratoryTimeSec: number;
    phaseOffsetSec: number;
  }>;
  inspiredGasFractions: RespiratoryGasFractionsV1;
  /** Effective mixed conducting deadspace at ambient reference BTPS. Zero
   * recovers a massless junction; this omits airway compression by pressure. */
  conductingDeadspaceVolumeL: number;
  maximumSubstepSec: number;
}>;
export type RespiratoryPhaseV1 =
  | "inspiration" | "inspiratory-hold" | "expiration"
  | "expiratory-hold" | "occluded";
export type RespiratoryMechanicsStateV1 = Readonly<{
  timeSec: number;
  revision: number;
  unitGasMol: RespiratoryPairV1<RespiratoryGasAmountV1>;
  conductingGasMol: RespiratoryGasAmountV1;
  airwayOpenByUnit: RespiratoryPairV1<boolean>;
  /** Consecutive pressure-qualified opening/closing progress, in [0, 1]. */
  recruitmentProgress01ByUnit: RespiratoryPairV1<number>;
  ventilatorCycleTimeSec: number;
  completedBreaths: number;
  inspiredVolumeThisBreathL: number;
}>;
export type RespiratoryMechanicsInputV1 = Readonly<{
  hold?: "inspiratory" | "expiratory";
  /** Occludes the common airway; inter-unit redistribution remains possible. */
  airwayOccluded?: boolean;
  /**
   * Cumulative transfer INTO each gas unit, applied once at the step endpoint.
   * The blood owner must accept exactly the opposite amount atomically. dt=0
   * supports paired exchange after an accepted ventilation trial. No clipping.
   */
  exchangeMolByUnit?: RespiratoryPairV1<RespiratoryGasAmountV1>;
}>;
export type RespiratoryMechanicsOutputV1 = Readonly<{
  timeSec: number;
  phase: RespiratoryPhaseV1;
  breathCount: number;
  airwayPressureCmH2O: number;
  pleuralPressureCmH2O: number;
  pleuralPressureMmHg: number;
  musclePressureCmH2O: number;
  alveolarPressureCmH2OByUnit: RespiratoryPairV1<number>;
  alveolarPressureMmHgByUnit: RespiratoryPairV1<number>;
  transpulmonaryPressureCmH2OByUnit: RespiratoryPairV1<number>;
  volumeLByUnit: RespiratoryPairV1<number>;
  totalLungVolumeL: number;
  /** Volumetric flows are referenced to the common junction pressure, BTPS. */
  airwayFlowLPerSec: number;
  flowLPerSecByUnit: RespiratoryPairV1<number>;
  pressureLimited: boolean;
  oxygenPartialPressureMmHgByUnit: RespiratoryPairV1<number>;
  co2PartialPressureMmHgByUnit: RespiratoryPairV1<number>;
  airwayOpenByUnit: RespiratoryPairV1<boolean>;
}>;
export type RespiratoryMechanicsEventV1 = Readonly<{
  timeSec: number;
  kind: "inspiration-start" | "expiration-start" | "inspiratory-hold-start"
    | "airway-opened" | "airway-closed";
  unitIndex: 0 | 1 | null;
}>;
export type RespiratoryMechanicsStepV1 = Readonly<{
  state: RespiratoryMechanicsStateV1;
  output: RespiratoryMechanicsOutputV1;
  events: readonly RespiratoryMechanicsEventV1[];
  ledger: Readonly<{
    boundaryGasTransferMol: RespiratoryGasAmountV1;
    exchangeMolByUnit: RespiratoryPairV1<RespiratoryGasAmountV1>;
    /** Final - initial - boundary - exchange, separately for each species. */
    conservationResidualMol: RespiratoryGasAmountV1;
    inspiredBoundaryVolumeL: number;
    expiredBoundaryVolumeL: number;
    acceptedSubsteps: number;
  }>;
}>;
export type RespiratoryMechanicsCheckpointV1 = Readonly<{
  schema: "circleheart.respiratory-mechanics-checkpoint.v1";
  configuration: RespiratoryMechanicsConfigV1;
  state: RespiratoryMechanicsStateV1;
}>;

export const RESPIRATORY_MMHG_PER_CMH2O_V1 = 0.7355592400690849;
export const RESPIRATORY_GAS_CONSTANT_L_MMHG_PER_MOL_K_V1 = 62.36367;

function defaultUnit(): RespiratoryUnitConfigV1 {
  return {
    referenceVolumeL: 1.25,
    referenceTranspulmonaryPressureCmH2O: 5,
    elastanceCmH2OPerL: 10,
    resistanceCmH2OSPerL: 10,
    overdistensionCmH2O: 0,
    recruitment: null,
  };
}

export const DEFAULT_RESPIRATORY_MECHANICS_CONFIG_V1: RespiratoryMechanicsConfigV1 = {
  environment: {
    barometricPressureMmHg: 760,
    waterVaporPressureMmHg: 47,
    temperatureKelvin: 310.15,
  },
  chestWall: {
    referenceTotalVolumeL: 2.5,
    referencePleuralPressureCmH2O: -5,
    elastanceCmH2OPerL: 5,
  },
  units: [defaultUnit(), defaultUnit()],
  ventilator: {
    mode: "pcv",
    respiratoryRatePerMin: 12,
    inspiratoryTimeSec: 1,
    peepCmH2O: 5,
    pressureControlAbovePeepCmH2O: 10,
    tidalVolumeL: 0.5,
    pressureLimitCmH2O: 40,
    riseTimeSec: 0.1,
    inspiratoryHoldSec: 0,
  },
  muscle: {
    amplitudeCmH2O: 0,
    respiratoryRatePerMin: 12,
    inspiratoryTimeSec: 1,
    phaseOffsetSec: 0,
  },
  inspiredGasFractions: { o2: 0.21, co2: 0, inert: 0.79 },
  conductingDeadspaceVolumeL: 0.15,
  maximumSubstepSec: 0.005,
};

const GAS_KEYS = ["o2Mol", "co2Mol", "inertMol"] as const;
const pair = <T>(f: (i: 0 | 1) => T): [T, T] => [f(0), f(1)];
const zeroGas = (): RespiratoryGasAmountV1 => ({ o2Mol: 0, co2Mol: 0, inertMol: 0 });
const totalGas = (g: RespiratoryGasAmountV1) => g.o2Mol + g.co2Mol + g.inertMol;
const conductingCapacityMol = (c: RespiratoryMechanicsConfigV1) => c.conductingDeadspaceVolumeL
  * (c.environment.barometricPressureMmHg - c.environment.waterVaporPressureMmHg)
  / (RESPIRATORY_GAS_CONSTANT_L_MMHG_PER_MOL_K_V1 * c.environment.temperatureKelvin);
const addGas = (a: RespiratoryGasAmountV1, b: RespiratoryGasAmountV1, scale = 1): RespiratoryGasAmountV1 => ({
  o2Mol: a.o2Mol + scale * b.o2Mol,
  co2Mol: a.co2Mol + scale * b.co2Mol,
  inertMol: a.inertMol + scale * b.inertMol,
});
const scaleGas = (a: RespiratoryGasAmountV1, scale: number): RespiratoryGasAmountV1 => ({
  o2Mol: a.o2Mol * scale, co2Mol: a.co2Mol * scale, inertMol: a.inertMol * scale,
});
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

function finite(value: number, name: string, min = -Infinity, strict = false): void {
  if (!Number.isFinite(value) || (strict ? value <= min : value < min)) {
    throw new RangeError(`respiratory ${name} is outside its finite domain`);
  }
}

export function validateRespiratoryMechanicsConfigV1(c: RespiratoryMechanicsConfigV1): void {
  const e = c.environment;
  finite(e.temperatureKelvin, "temperatureKelvin", 0, true);
  finite(e.waterVaporPressureMmHg, "waterVaporPressureMmHg", 0);
  finite(e.barometricPressureMmHg, "barometricPressureMmHg", e.waterVaporPressureMmHg, true);
  finite(c.chestWall.referenceTotalVolumeL, "referenceTotalVolumeL", 0, true);
  finite(c.chestWall.referencePleuralPressureCmH2O, "referencePleuralPressureCmH2O");
  finite(c.chestWall.elastanceCmH2OPerL, "chestWall.elastance", 0);
  if (c.units.length !== 2) throw new RangeError("respiratory requires two functional units");
  for (const u of c.units) {
    finite(u.referenceVolumeL, "unit.referenceVolumeL", 0, true);
    finite(u.referenceTranspulmonaryPressureCmH2O, "unit.referenceTranspulmonaryPressureCmH2O");
    finite(u.elastanceCmH2OPerL, "unit.elastance", 0, true);
    finite(u.resistanceCmH2OSPerL, "unit.resistance", 0, true);
    finite(u.overdistensionCmH2O, "unit.overdistension", 0);
    if (u.recruitment) {
      const r = u.recruitment;
      finite(r.closingTranspulmonaryPressureCmH2O, "closingPressure");
      finite(r.openingTranspulmonaryPressureCmH2O, "openingPressure", r.closingTranspulmonaryPressureCmH2O, true);
      finite(r.openingTimeSec, "openingTimeSec", 0, true);
      finite(r.closingTimeSec, "closingTimeSec", 0, true);
    }
  }
  const v = c.ventilator;
  if (!["pcv", "vcv", "spontaneous"].includes(v.mode)) throw new RangeError("respiratory invalid ventilator mode");
  finite(v.respiratoryRatePerMin, "respiratoryRatePerMin", 0, true);
  finite(v.inspiratoryTimeSec, "inspiratoryTimeSec", 0, true);
  if (v.inspiratoryTimeSec >= 60 / v.respiratoryRatePerMin) throw new RangeError("respiratory inspiration must leave positive expiratory time");
  finite(v.inspiratoryHoldSec, "inspiratoryHoldSec", 0);
  if (v.inspiratoryHoldSec >= v.inspiratoryTimeSec) throw new RangeError("respiratory hold must leave positive inspiratory flow time");
  finite(v.peepCmH2O, "peepCmH2O", 0);
  finite(v.pressureControlAbovePeepCmH2O, "pressureControlAbovePeepCmH2O", 0);
  finite(v.tidalVolumeL, "tidalVolumeL", 0, true);
  finite(v.pressureLimitCmH2O, "pressureLimitCmH2O", v.peepCmH2O);
  finite(v.riseTimeSec, "riseTimeSec", 0);
  finite(c.muscle.amplitudeCmH2O, "muscle.amplitude", 0);
  finite(c.muscle.respiratoryRatePerMin, "muscle.respiratoryRatePerMin", 0, true);
  finite(c.muscle.inspiratoryTimeSec, "muscle.inspiratoryTimeSec", 0, true);
  if (c.muscle.inspiratoryTimeSec >= 60 / c.muscle.respiratoryRatePerMin) throw new RangeError("respiratory muscle inspiration must leave expiration");
  finite(c.muscle.phaseOffsetSec, "muscle.phaseOffsetSec");
  const f = c.inspiredGasFractions;
  finite(c.conductingDeadspaceVolumeL, "conductingDeadspaceVolumeL", 0);
  if (c.conductingDeadspaceVolumeL > 0.5) throw new RangeError("respiratory conductingDeadspaceVolumeL exceeds 0.5 L");
  for (const value of [f.o2, f.co2, f.inert]) finite(value, "inspired gas fraction", 0);
  if (Math.abs(f.o2 + f.co2 + f.inert - 1) > 1e-12) throw new RangeError("respiratory inspired gas fractions must sum to one");
  finite(c.maximumSubstepSec, "maximumSubstepSec", 0, true);
  if (c.maximumSubstepSec > 0.05) throw new RangeError("respiratory maximumSubstepSec must not exceed 0.05 s");
}

export function validateRespiratoryMechanicsStateV1(c: RespiratoryMechanicsConfigV1, s: RespiratoryMechanicsStateV1): void {
  finite(s.timeSec, "state.timeSec", 0);
  if (!Number.isSafeInteger(s.revision) || s.revision < 0 || !Number.isSafeInteger(s.completedBreaths) || s.completedBreaths < 0) {
    throw new RangeError("respiratory state counters must be nonnegative safe integers");
  }
  finite(s.ventilatorCycleTimeSec, "state.ventilatorCycleTimeSec", 0);
  if (s.ventilatorCycleTimeSec >= 60 / c.ventilator.respiratoryRatePerMin) throw new RangeError("respiratory state cycle time exceeds ventilator period");
  finite(s.inspiredVolumeThisBreathL, "state.inspiredVolumeThisBreathL", 0);
  if (s.unitGasMol.length !== 2 || s.airwayOpenByUnit.length !== 2 || s.recruitmentProgress01ByUnit.length !== 2) throw new RangeError("respiratory state must contain two units");
  for (const key of GAS_KEYS) finite(s.conductingGasMol[key], `state.conductingGasMol.${key}`, 0);
  const capacity = conductingCapacityMol(c);
  if ((capacity === 0 && totalGas(s.conductingGasMol) !== 0)
    || Math.abs(totalGas(s.conductingGasMol) - capacity) > 1e-11 * Math.max(1e-6, capacity)) {
    throw new RangeError("respiratory conducting gas capacity differs from configuration");
  }
  for (const i of [0, 1] as const) {
    for (const key of GAS_KEYS) finite(s.unitGasMol[i][key], `state.${key}`, 0);
    finite(totalGas(s.unitGasMol[i]), "state.totalGas", 0, true);
    if (typeof s.airwayOpenByUnit[i] !== "boolean") throw new RangeError("respiratory airway state must be boolean");
    finite(s.recruitmentProgress01ByUnit[i], "state.recruitmentProgress", 0);
    if (s.recruitmentProgress01ByUnit[i] > 1) throw new RangeError("respiratory recruitmentProgress exceeds one");
  }
}

/** Shared effort clock. Positive offsets advance the prescribed muscle cycle. */
export function respiratoryMuscleCycleTimeSecV1(c: RespiratoryMechanicsConfigV1, timeSec: number): number {
  const period = 60 / c.muscle.respiratoryRatePerMin;
  return ((timeSec + c.muscle.phaseOffsetSec) % period + period) % period;
}
function musclePressure(c: RespiratoryMechanicsConfigV1, timeSec: number): number {
  const m = c.muscle;
  const phase = respiratoryMuscleCycleTimeSecV1(c, timeSec);
  return phase < m.inspiratoryTimeSec
    ? m.amplitudeCmH2O * Math.sin(Math.PI * phase / m.inspiratoryTimeSec) ** 2 : 0;
}

function lungRecoil(u: RespiratoryUnitConfigV1, v: number): { pressure: number; derivative: number } {
  const stretch = Math.max(0, v / u.referenceVolumeL - 1);
  return {
    pressure: u.referenceTranspulmonaryPressureCmH2O
      + u.elastanceCmH2OPerL * (v - u.referenceVolumeL)
      + u.overdistensionCmH2O * stretch ** 3,
    derivative: u.elastanceCmH2OPerL + 3 * u.overdistensionCmH2O * stretch ** 2 / u.referenceVolumeL,
  };
}

function pressuresAtVolumes(c: RespiratoryMechanicsConfigV1, volumes: RespiratoryPairV1<number>, pmus: number) {
  const pleural = c.chestWall.referencePleuralPressureCmH2O
    + c.chestWall.elastanceCmH2OPerL * (volumes[0] + volumes[1] - c.chestWall.referenceTotalVolumeL) - pmus;
  const recoil = pair(i => lungRecoil(c.units[i], volumes[i]));
  return { pleural, recoil, alveolar: pair(i => pleural + recoil[i].pressure) };
}

/** Positive two-variable Newton solve; rejected candidates never touch state. */
function solveVolumes(c: RespiratoryMechanicsConfigV1, gas: RespiratoryPairV1<RespiratoryGasAmountV1>, pmus: number): [number, number] {
  const h = RESPIRATORY_MMHG_PER_CMH2O_V1;
  const dryAmbient = c.environment.barometricPressureMmHg - c.environment.waterVaporPressureMmHg;
  const rt = RESPIRATORY_GAS_CONSTANT_L_MMHG_PER_MOL_K_V1 * c.environment.temperatureKelvin;
  const target = pair(i => totalGas(gas[i]) * rt);
  let volumes = pair(i => target[i] / dryAmbient);
  for (let iteration = 0; iteration < 30; iteration += 1) {
    const p = pressuresAtVolumes(c, volumes, pmus);
    const dry = pair(i => dryAmbient + h * p.alveolar[i]);
    const residual = pair(i => dry[i] * volumes[i] - target[i]);
    if (Math.max(...residual.map(Math.abs)) <= 1e-11 * Math.max(1, ...target)) {
      if (dry.some(v => v <= 0) || volumes.some(v => !Number.isFinite(v) || v <= 0)) throw new RangeError("respiratory ideal-gas solution outside positive domain");
      return volumes;
    }
    const cw = c.chestWall.elastanceCmH2OPerL;
    const a = dry[0] + h * volumes[0] * (cw + p.recoil[0].derivative);
    const b = h * volumes[0] * cw;
    const cc = h * volumes[1] * cw;
    const d = dry[1] + h * volumes[1] * (cw + p.recoil[1].derivative);
    const det = a * d - b * cc;
    if (!Number.isFinite(det) || det <= 0) throw new RangeError("respiratory nonpositive gas-mechanics Jacobian");
    const correction: [number, number] = [
      (d * residual[0] - b * residual[1]) / det,
      (a * residual[1] - cc * residual[0]) / det,
    ];
    let scale = 1;
    while (scale > 1e-8 && volumes.some((v, i) => v - scale * correction[i] <= 0)) scale *= 0.5;
    volumes = pair(i => volumes[i] - scale * correction[i]);
  }
  throw new RangeError("respiratory ideal-gas/PV closure failed to converge");
}

function phaseAt(c: RespiratoryMechanicsConfigV1, s: RespiratoryMechanicsStateV1, input: RespiratoryMechanicsInputV1): RespiratoryPhaseV1 {
  if (input.airwayOccluded) return "occluded";
  if (input.hold) return input.hold === "inspiratory" ? "inspiratory-hold" : "expiratory-hold";
  const v = c.ventilator;
  if (v.mode === "spontaneous") return musclePressure(c, s.timeSec) > 0 ? "inspiration" : "expiration";
  if (s.ventilatorCycleTimeSec >= v.inspiratoryTimeSec) return "expiration";
  if (s.ventilatorCycleTimeSec >= v.inspiratoryTimeSec - v.inspiratoryHoldSec
    || (v.mode === "vcv" && s.inspiredVolumeThisBreathL >= v.tidalVolumeL * (1 - 1e-12))) return "inspiratory-hold";
  return "inspiration";
}

function evaluate(c: RespiratoryMechanicsConfigV1, s: RespiratoryMechanicsStateV1, input: RespiratoryMechanicsInputV1 = {}): RespiratoryMechanicsOutputV1 {
  const pmus = musclePressure(c, s.timeSec);
  const volumes = solveVolumes(c, s.unitGasMol, pmus);
  const p = pressuresAtVolumes(c, volumes, pmus);
  const phase = phaseAt(c, s, input);
  const g = pair(i => s.airwayOpenByUnit[i] ? 1 / c.units[i].resistanceCmH2OSPerL : 0);
  const conductance = g[0] + g[1];
  const weightedAlveolar = g[0] * p.alveolar[0] + g[1] * p.alveolar[1];
  const v = c.ventilator;
  let paw = v.peepCmH2O;
  let limited = false;
  const held = phase === "occluded" || phase === "inspiratory-hold" || phase === "expiratory-hold";
  if (held) {
    // A closed common port permits pendelluft, but no external molar flow.
    paw = conductance > 0 ? weightedAlveolar / conductance : (p.alveolar[0] + p.alveolar[1]) / 2;
  } else if (phase === "inspiration" && v.mode !== "spontaneous") {
    if (v.mode === "pcv") {
      const ramp = v.riseTimeSec === 0 ? 1 : Math.min(1, s.ventilatorCycleTimeSec / v.riseTimeSec);
      const target = v.peepCmH2O + v.pressureControlAbovePeepCmH2O * ramp;
      limited = target > v.pressureLimitCmH2O;
      paw = Math.min(target, v.pressureLimitCmH2O);
    } else {
      const targetFlow = v.tidalVolumeL / (v.inspiratoryTimeSec - v.inspiratoryHoldSec);
      const needed = conductance > 0 ? (targetFlow + weightedAlveolar) / conductance : v.pressureLimitCmH2O + 1;
      limited = needed > v.pressureLimitCmH2O;
      paw = Math.min(needed, v.pressureLimitCmH2O);
    }
  }
  let flows = pair(i => g[i] * (paw - p.alveolar[i]));
  if (held) {
    const pendelluft = conductance > 0 ? g[0] * g[1] / conductance * (p.alveolar[1] - p.alveolar[0]) : 0;
    flows = [pendelluft, -pendelluft];
  }
  const h = RESPIRATORY_MMHG_PER_CMH2O_V1;
  const dry = pair(i => c.environment.barometricPressureMmHg + h * p.alveolar[i] - c.environment.waterVaporPressureMmHg);
  finite(c.environment.barometricPressureMmHg + h * paw - c.environment.waterVaporPressureMmHg, "junction dry pressure", 0, true);
  return {
    timeSec: s.timeSec,
    phase,
    breathCount: s.completedBreaths + 1,
    airwayPressureCmH2O: paw,
    pleuralPressureCmH2O: p.pleural,
    pleuralPressureMmHg: p.pleural * h,
    musclePressureCmH2O: pmus,
    alveolarPressureCmH2OByUnit: p.alveolar,
    alveolarPressureMmHgByUnit: pair(i => p.alveolar[i] * h),
    transpulmonaryPressureCmH2OByUnit: pair(i => p.recoil[i].pressure),
    volumeLByUnit: volumes,
    totalLungVolumeL: volumes[0] + volumes[1],
    airwayFlowLPerSec: held ? 0 : flows[0] + flows[1],
    flowLPerSecByUnit: flows,
    pressureLimited: limited,
    oxygenPartialPressureMmHgByUnit: pair(i => dry[i] * s.unitGasMol[i].o2Mol / totalGas(s.unitGasMol[i])),
    co2PartialPressureMmHgByUnit: pair(i => dry[i] * s.unitGasMol[i].co2Mol / totalGas(s.unitGasMol[i])),
    airwayOpenByUnit: [...s.airwayOpenByUnit],
  };
}

export function evaluateRespiratoryMechanicsV1(c: RespiratoryMechanicsConfigV1, s: RespiratoryMechanicsStateV1, input: RespiratoryMechanicsInputV1 = {}): RespiratoryMechanicsOutputV1 {
  validateRespiratoryMechanicsConfigV1(c);
  validateRespiratoryMechanicsStateV1(c, s);
  return evaluate(c, s, input);
}

/** Next mandatory phase/rise boundary for a coupled circulation integrator. */
export function nextRespiratoryBoundaryTimeSecV1(c: RespiratoryMechanicsConfigV1, s: RespiratoryMechanicsStateV1): number {
  validateRespiratoryMechanicsConfigV1(c);
  validateRespiratoryMechanicsStateV1(c, s);
  const v = c.ventilator;
  const boundaries = [v.inspiratoryTimeSec - v.inspiratoryHoldSec, v.inspiratoryTimeSec, 60 / v.respiratoryRatePerMin];
  if (v.mode === "pcv" && v.riseTimeSec > 0 && v.riseTimeSec < v.inspiratoryTimeSec - v.inspiratoryHoldSec) boundaries.push(v.riseTimeSec);
  const next = Math.min(...boundaries.filter(t => t > s.ventilatorCycleTimeSec));
  return s.timeSec + next - s.ventilatorCycleTimeSec;
}

export function createRespiratoryMechanicsStateV1(c: RespiratoryMechanicsConfigV1 = DEFAULT_RESPIRATORY_MECHANICS_CONFIG_V1, options: Readonly<{
  timeSec?: number;
  initialVolumeLByUnit?: RespiratoryPairV1<number>;
  initialGasFractionsByUnit?: RespiratoryPairV1<RespiratoryGasFractionsV1>;
  initialConductingGasFractions?: RespiratoryGasFractionsV1;
  airwayOpenByUnit?: RespiratoryPairV1<boolean>;
}> = {}): RespiratoryMechanicsStateV1 {
  validateRespiratoryMechanicsConfigV1(c);
  const timeSec = options.timeSec ?? 0;
  finite(timeSec, "initial timeSec", 0);
  if (options.initialVolumeLByUnit && options.initialVolumeLByUnit.length !== 2) throw new RangeError("respiratory initial volumes must contain two units");
  if (options.initialGasFractionsByUnit && options.initialGasFractionsByUnit.length !== 2) throw new RangeError("respiratory initial fractions must contain two units");
  const pmus = musclePressure(c, timeSec);
  let volumes = options.initialVolumeLByUnit ? [...options.initialVolumeLByUnit] as [number, number] : pair(i => c.units[i].referenceVolumeL);
  if (!options.initialVolumeLByUnit) {
    // Cold seed at static end-expiratory pressure. It is not a periodic solution.
    for (let k = 0; k < 30; k += 1) {
      const p = pressuresAtVolumes(c, volumes, pmus);
      const r = pair(i => p.alveolar[i] - c.ventilator.peepCmH2O);
      if (Math.max(...r.map(Math.abs)) < 1e-10) break;
      const cw = c.chestWall.elastanceCmH2OPerL;
      const a = cw + p.recoil[0].derivative;
      const d = cw + p.recoil[1].derivative;
      const det = a * d - cw * cw;
      volumes = [volumes[0] - (d * r[0] - cw * r[1]) / det, volumes[1] - (a * r[1] - cw * r[0]) / det];
    }
    if (pressuresAtVolumes(c, volumes, pmus).alveolar.some(p => !Number.isFinite(p) || Math.abs(p - c.ventilator.peepCmH2O) > 1e-8)) {
      throw new RangeError("respiratory static initial equilibrium failed to converge");
    }
  }
  for (const volume of volumes) finite(volume, "initial volume", 0, true);
  const p = pressuresAtVolumes(c, volumes, pmus);
  const rt = RESPIRATORY_GAS_CONSTANT_L_MMHG_PER_MOL_K_V1 * c.environment.temperatureKelvin;
  const gases = pair(i => {
    const f = options.initialGasFractionsByUnit?.[i] ?? c.inspiredGasFractions;
    for (const value of [f.o2, f.co2, f.inert]) finite(value, "initial gas fraction", 0);
    if (Math.abs(f.o2 + f.co2 + f.inert - 1) > 1e-12) throw new RangeError("respiratory initial gas fractions must sum to one");
    const pressure = c.environment.barometricPressureMmHg - c.environment.waterVaporPressureMmHg + RESPIRATORY_MMHG_PER_CMH2O_V1 * p.alveolar[i];
    finite(pressure, "initial dry pressure", 0, true);
    const n = pressure * volumes[i] / rt;
    return { o2Mol: n * f.o2, co2Mol: n * f.co2, inertMol: n * f.inert };
  });
  const open: [boolean, boolean] = [...(options.airwayOpenByUnit ?? [true, true])];
  const f = options.initialConductingGasFractions ?? c.inspiredGasFractions;
  for (const value of [f.o2, f.co2, f.inert]) finite(value, "initial conducting fraction", 0);
  if (Math.abs(f.o2 + f.co2 + f.inert - 1) > 1e-12) throw new RangeError("respiratory initial conducting fractions must sum to one");
  const capacity = conductingCapacityMol(c);
  const state: RespiratoryMechanicsStateV1 = {
    timeSec, revision: 0, unitGasMol: gases, airwayOpenByUnit: open,
    conductingGasMol: { o2Mol: capacity * f.o2, co2Mol: capacity * f.co2, inertMol: capacity * f.inert },
    recruitmentProgress01ByUnit: pair(i => open[i] ? 1 : 0),
    ventilatorCycleTimeSec: 0, completedBreaths: 0, inspiredVolumeThisBreathL: 0,
  };
  validateRespiratoryMechanicsStateV1(c, state);
  return state;
}

function transportRate(c: RespiratoryMechanicsConfigV1, s: RespiratoryMechanicsStateV1, o: RespiratoryMechanicsOutputV1) {
  const density = (c.environment.barometricPressureMmHg - c.environment.waterVaporPressureMmHg
    + RESPIRATORY_MMHG_PER_CMH2O_V1 * o.airwayPressureCmH2O)
    / (RESPIRATORY_GAS_CONSTANT_L_MMHG_PER_MOL_K_V1 * c.environment.temperatureKelvin);
  const unitFractions = pair(i => scaleGas(s.unitGasMol[i], 1 / totalGas(s.unitGasMol[i])));
  if (o.airwayFlowLPerSec === 0) {
    const donor = o.flowLPerSecByUnit[0] >= 0 ? unitFractions[1] : unitFractions[0];
    const transfer = scaleGas(donor, density * o.flowLPerSecByUnit[0]);
    return { unit: [transfer, scaleGas(transfer, -1)] as RespiratoryPairV1<RespiratoryGasAmountV1>, boundary: zeroGas() };
  }
  const fi: RespiratoryGasAmountV1 = {
    o2Mol: c.inspiredGasFractions.o2, co2Mol: c.inspiredGasFractions.co2, inertMol: c.inspiredGasFractions.inert,
  };
  const incomingBoundary = Math.max(0, o.airwayFlowLPerSec);
  let mixtureRate = scaleGas(fi, incomingBoundary);
  let incomingJunction = incomingBoundary;
  for (const i of [0, 1] as const) {
    const expired = Math.max(0, -o.flowLPerSecByUnit[i]);
    mixtureRate = addGas(mixtureRate, unitFractions[i], expired);
    incomingJunction += expired;
  }
  const junctionFractions = incomingJunction > 0 ? scaleGas(mixtureRate, 1 / incomingJunction) : fi;
  const unit = pair(i => scaleGas(o.flowLPerSecByUnit[i] >= 0 ? junctionFractions : unitFractions[i], density * o.flowLPerSecByUnit[i]));
  // Use the sum of the same unit transfers to make the discrete boundary ledger
  // identical to its incidence assembly, including pendelluft and roundoff.
  return { unit, boundary: addGas(unit[0], unit[1]) };
}

/** Integrate the mixed conducting compartment analytically for frozen incoming
 * rates. Its exact integrated outflow is shared by every destination. This
 * remains positive as capacity tends to zero without a hidden fast gas clock.
 * The outer midpoint step supplies midpoint lung composition and molar flows. */
function transportTransfer(c: RespiratoryMechanicsConfigV1, s: RespiratoryMechanicsStateV1,
  o: RespiratoryMechanicsOutputV1, dt: number, initialConducting = s.conductingGasMol) {
  if (c.conductingDeadspaceVolumeL === 0) {
    const rate = transportRate(c, s, o);
    return { unit: pair(i => scaleGas(rate.unit[i], dt)), boundary: scaleGas(rate.boundary, dt), conducting: zeroGas() };
  }
  const density = (c.environment.barometricPressureMmHg - c.environment.waterVaporPressureMmHg
    + RESPIRATORY_MMHG_PER_CMH2O_V1 * o.airwayPressureCmH2O)
    / (RESPIRATORY_GAS_CONSTANT_L_MMHG_PER_MOL_K_V1 * c.environment.temperatureKelvin);
  const q = pair(i => o.flowLPerSecByUnit[i] * density);
  const external = o.airwayFlowLPerSec * density;
  const inspiredRate = scaleGas({ o2Mol: c.inspiredGasFractions.o2, co2Mol: c.inspiredGasFractions.co2,
    inertMol: c.inspiredGasFractions.inert }, Math.max(0, external));
  const expiredRates = pair(i => scaleGas(s.unitGasMol[i], Math.max(0, -q[i]) / totalGas(s.unitGasMol[i])));
  const incoming = addGas(addGas(inspiredRate, expiredRates[0]), expiredRates[1]);
  const outRate = Math.max(0, -external) + Math.max(0, q[0]) + Math.max(0, q[1]);
  if (outRate === 0) return { unit: pair(zeroGas), boundary: zeroGas(), conducting: initialConducting };
  const capacity = conductingCapacityMol(c), x = outRate * dt / capacity;
  const washedFraction = -Math.expm1(-x);
  const incomingOutflowFraction = x < 1e-4 ? x / 2 - x * x / 6 + x ** 3 / 24 - x ** 4 / 120 : 1 - washedFraction / x;
  const out = addGas(scaleGas(initialConducting, washedFraction), incoming, dt * incomingOutflowFraction);
  const conducting = addGas(scaleGas(initialConducting, Math.exp(-x)), incoming, capacity / outRate * washedFraction);
  const unit = pair(i => q[i] >= 0 ? scaleGas(out, q[i] / outRate) : scaleGas(expiredRates[i], -dt));
  const boundary = addGas(scaleGas(inspiredRate, dt), out, -Math.max(0, -external) / outRate);
  return { unit, boundary, conducting };
}

function advanceRecruitment(c: RespiratoryMechanicsConfigV1, s: RespiratoryMechanicsStateV1, o: RespiratoryMechanicsOutputV1, dt: number, events: RespiratoryMechanicsEventV1[]): RespiratoryMechanicsStateV1 {
  const progress = [...s.recruitmentProgress01ByUnit] as [number, number];
  const open = [...s.airwayOpenByUnit] as [boolean, boolean];
  for (const i of [0, 1] as const) {
    const r = c.units[i].recruitment;
    if (!r) continue;
    if (open[i]) {
      progress[i] = o.transpulmonaryPressureCmH2OByUnit[i] < r.closingTranspulmonaryPressureCmH2O
        ? Math.max(0, progress[i] - dt / r.closingTimeSec) : 1;
      if (progress[i] < 1e-12) {
        progress[i] = 0;
        open[i] = false;
        events.push({ timeSec: s.timeSec, kind: "airway-closed", unitIndex: i });
      }
    } else {
      // Reopening is driven by pressure upstream of the closed airway, not by
      // assuming the trapped alveolus already equilibrated with the ventilator.
      progress[i] = o.airwayPressureCmH2O - o.pleuralPressureCmH2O > r.openingTranspulmonaryPressureCmH2O
        ? Math.min(1, progress[i] + dt / r.openingTimeSec) : 0;
      if (progress[i] > 1 - 1e-12) {
        progress[i] = 1;
        open[i] = true;
        events.push({ timeSec: s.timeSec, kind: "airway-opened", unitIndex: i });
      }
    }
  }
  return { ...s, airwayOpenByUnit: open, recruitmentProgress01ByUnit: progress };
}

export function stepRespiratoryMechanicsV1(c: RespiratoryMechanicsConfigV1, accepted: RespiratoryMechanicsStateV1, dtSec: number, input: RespiratoryMechanicsInputV1 = {}): RespiratoryMechanicsStepV1 {
  validateRespiratoryMechanicsConfigV1(c);
  validateRespiratoryMechanicsStateV1(c, accepted);
  finite(dtSec, "dtSec", 0);
  const exchange = input.exchangeMolByUnit ?? pair(zeroGas);
  if (exchange.length !== 2) throw new RangeError("respiratory exchange must contain two units");
  for (const gas of exchange) for (const key of GAS_KEYS) finite(gas[key], `exchange.${key}`);
  const endTime = accepted.timeSec + dtSec;
  finite(endTime, "endTime");
  let s: RespiratoryMechanicsStateV1 = clone(accepted);
  let boundary = zeroGas();
  let inspired = 0;
  let expired = 0;
  let substeps = 0;
  const events: RespiratoryMechanicsEventV1[] = [];
  const period = 60 / c.ventilator.respiratoryRatePerMin;
  const activeTime = c.ventilator.inspiratoryTimeSec - c.ventilator.inspiratoryHoldSec;
  while (s.timeSec < endTime) {
    if (++substeps > 1_000_000) throw new RangeError("respiratory step exceeds substep budget");
    const start = evaluate(c, s, input);
    const cycleBefore = s.ventilatorCycleTimeSec;
    const cycleStartTime = s.timeSec - s.ventilatorCycleTimeSec;
    let phaseBoundary = s.ventilatorCycleTimeSec < activeTime ? activeTime
      : s.ventilatorCycleTimeSec < c.ventilator.inspiratoryTimeSec ? c.ventilator.inspiratoryTimeSec : period;
    if (c.ventilator.mode === "pcv" && c.ventilator.riseTimeSec > s.ventilatorCycleTimeSec) {
      phaseBoundary = Math.min(phaseBoundary, c.ventilator.riseTimeSec);
    }
    const stableStep = Math.min(...c.units.map((u, i) =>
      0.1 * u.resistanceCmH2OSPerL / (lungRecoil(u, start.volumeLByUnit[i]).derivative + 2 * c.chestWall.elastanceCmH2OPerL)));
    let dt = Math.min(endTime - s.timeSec, c.maximumSubstepSec, stableStep, phaseBoundary - s.ventilatorCycleTimeSec);
    // End volume targeting at the accepted flow integral, never by assigning V.
    if (c.ventilator.mode === "vcv" && start.phase === "inspiration" && start.airwayFlowLPerSec > 0) {
      dt = Math.min(dt, (c.ventilator.tidalVolumeL - s.inspiredVolumeThisBreathL) / start.airwayFlowLPerSec);
    }
    if (!(dt > 0) || s.timeSec + dt === s.timeSec) throw new RangeError("respiratory timestep cannot advance");
    const transfer0 = transportTransfer(c, s, start, dt / 2);
    const midpoint: RespiratoryMechanicsStateV1 = {
      ...s,
      timeSec: s.timeSec + dt / 2,
      ventilatorCycleTimeSec: s.ventilatorCycleTimeSec + dt / 2,
      unitGasMol: pair(i => addGas(s.unitGasMol[i], transfer0.unit[i])),
      conductingGasMol: transfer0.conducting,
      inspiredVolumeThisBreathL: s.inspiredVolumeThisBreathL + Math.max(0, start.airwayFlowLPerSec) * dt / 2,
    };
    validateRespiratoryMechanicsStateV1(c, midpoint);
    const midOutput = evaluate(c, midpoint, input);
    const transfer = transportTransfer(c, midpoint, midOutput, dt, s.conductingGasMol);
    const inspiredStep = Math.max(0, midOutput.airwayFlowLPerSec) * dt;
    inspired += inspiredStep;
    expired += Math.max(0, -midOutput.airwayFlowLPerSec) * dt;
    boundary = addGas(boundary, transfer.boundary);
    const cycle = s.ventilatorCycleTimeSec + dt;
    s = {
      ...s,
      timeSec: s.timeSec + dt,
      unitGasMol: pair(i => addGas(s.unitGasMol[i], transfer.unit[i])),
      conductingGasMol: transfer.conducting,
      ventilatorCycleTimeSec: cycle,
      inspiredVolumeThisBreathL: s.inspiredVolumeThisBreathL + inspiredStep,
    };
    s = advanceRecruitment(c, s, midOutput, dt, events);
    if (Math.abs(cycle - period) <= 1e-12) {
      s = { ...s, timeSec: cycleStartTime + period, ventilatorCycleTimeSec: 0, completedBreaths: s.completedBreaths + 1, inspiredVolumeThisBreathL: 0 };
      if (c.ventilator.mode !== "spontaneous") events.push({ timeSec: s.timeSec, kind: "inspiration-start", unitIndex: null });
    } else if (cycleBefore < c.ventilator.inspiratoryTimeSec && Math.abs(cycle - c.ventilator.inspiratoryTimeSec) <= 1e-12) {
      s = { ...s, timeSec: cycleStartTime + c.ventilator.inspiratoryTimeSec, ventilatorCycleTimeSec: c.ventilator.inspiratoryTimeSec };
      if (c.ventilator.mode !== "spontaneous") events.push({ timeSec: s.timeSec, kind: "expiration-start", unitIndex: null });
    } else if (c.ventilator.inspiratoryHoldSec > 0 && cycleBefore < activeTime && Math.abs(cycle - activeTime) <= 1e-12) {
      s = { ...s, timeSec: cycleStartTime + activeTime, ventilatorCycleTimeSec: activeTime };
      if (c.ventilator.mode !== "spontaneous") events.push({ timeSec: s.timeSec, kind: "inspiratory-hold-start", unitIndex: null });
    } else if (c.ventilator.mode === "pcv" && cycleBefore < c.ventilator.riseTimeSec
      && Math.abs(cycle - c.ventilator.riseTimeSec) <= 1e-12) {
      // At later breaths, subtracting absolute times can leave cycle time one
      // ulp before the ramp boundary. Snap this boundary like all other phases.
      s = { ...s, timeSec: cycleStartTime + c.ventilator.riseTimeSec, ventilatorCycleTimeSec: c.ventilator.riseTimeSec };
    }
    validateRespiratoryMechanicsStateV1(c, s);
  }
  s = { ...s, timeSec: endTime, revision: accepted.revision + 1, unitGasMol: pair(i => addGas(s.unitGasMol[i], exchange[i])) };
  validateRespiratoryMechanicsStateV1(c, s);
  const initial = addGas(addGas(accepted.unitGasMol[0], accepted.unitGasMol[1]), accepted.conductingGasMol);
  const final = addGas(addGas(s.unitGasMol[0], s.unitGasMol[1]), s.conductingGasMol);
  const residual = addGas(addGas(addGas(final, initial, -1), boundary, -1), addGas(exchange[0], exchange[1]), -1);
  for (const key of GAS_KEYS) {
    if (Math.abs(residual[key]) > 1e-11 * Math.max(1, initial[key], final[key])) throw new RangeError("respiratory discrete gas conservation failed");
  }
  return {
    state: s,
    output: evaluate(c, s, input),
    events,
    ledger: {
      boundaryGasTransferMol: boundary, exchangeMolByUnit: clone(exchange), conservationResidualMol: residual,
      inspiredBoundaryVolumeL: inspired, expiredBoundaryVolumeL: expired, acceptedSubsteps: substeps,
    },
  };
}

export function createRespiratoryMechanicsCheckpointV1(c: RespiratoryMechanicsConfigV1, s: RespiratoryMechanicsStateV1): RespiratoryMechanicsCheckpointV1 {
  validateRespiratoryMechanicsConfigV1(c);
  validateRespiratoryMechanicsStateV1(c, s);
  evaluate(c, s);
  return clone({ schema: "circleheart.respiratory-mechanics-checkpoint.v1", configuration: c, state: s });
}

export function restoreRespiratoryMechanicsCheckpointV1(c: RespiratoryMechanicsConfigV1, checkpoint: RespiratoryMechanicsCheckpointV1): RespiratoryMechanicsStateV1 {
  if (checkpoint.schema !== "circleheart.respiratory-mechanics-checkpoint.v1") throw new RangeError("respiratory checkpoint schema mismatch");
  // Canonical key order makes config equality independent of object insertion.
  const canonical = (value: unknown): string => JSON.stringify(value, (_key, item: unknown) => {
    if (item && typeof item === "object" && !Array.isArray(item)) return Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b)));
    return item;
  });
  if (canonical(c) !== canonical(checkpoint.configuration)) throw new RangeError("respiratory checkpoint configuration mismatch");
  validateRespiratoryMechanicsConfigV1(c);
  validateRespiratoryMechanicsStateV1(c, checkpoint.state);
  evaluate(c, checkpoint.state);
  return clone(checkpoint.state);
}

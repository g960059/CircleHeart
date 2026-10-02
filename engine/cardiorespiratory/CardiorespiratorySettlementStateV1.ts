import { canonicalJsonStringify } from "@/engine/integrity";
import type { CardiorespiratoryCheckpointV2 } from "./CardiorespiratorySessionV1";
import type { CardiorespiratoryFixtureV1 } from "./CardiorespiratoryFixtureV1";
import { respiratoryMuscleCycleTimeSecV1 } from "./RespiratoryMechanicsV1";
import { DEFAULT_TISSUE_GAS_PARAMETERS_V1 } from "./TissueGasExchangeV1";
import { bloodGasContentsFromPressuresV1, bloodGasPressuresFromAmountsV1 } from "./BloodGasChemistryV1";
import { cardiorespiratoryPhysicalBloodVolumesFromCoupledStateV1 } from "./CardiorespiratoryBloodNetworkV1";

export type CardiorespiratorySettlementCoordinateV1 = Readonly<{
  value: number;
  /** Fixed dimensional reference, never a convergence tolerance. */
  scale: number;
  domain: "hemodynamic" | "respiratory" | "gas" | "controller";
  monitorDrift: boolean;
}>;
export type CardiorespiratorySettlementProjectionV1 = Readonly<{
  timeSec: number;
  /** Only these nullable/event payloads may change coordinate shape with phase.
   * Match an entire path component: key === prefix or prefix + ".". All other
   * continuous and discrete coordinates are mandatory across observations. */
  optionalCoordinatePrefixes: readonly string[];
  forcing: Readonly<Record<string, number>>;
  invariants: Readonly<Record<string, number | string>>;
  continuous: Readonly<Record<string, CardiorespiratorySettlementCoordinateV1>>;
  discrete: Readonly<Record<string, string | boolean | null | number>>;
}>;
const optionalCoordinatePrefixes = Object.freeze([
  "controller.windowControl",
  "controller.desiredControl",
  "history.pendingProximalAvOutputs",
  "history.pendingDistalVentricularImpulses",
  "history.pendingCalciumDeposits",
  "history.electricalCaptureState.lastAcceptedImpulseBatchTimeSec",
  "history.electricalCaptureState.atrialGate.lastCapturedActivationTimeSec",
  "history.electricalCaptureState.ventricularGate.lastCapturedActivationTimeSec",
  "history.proximalAvGateState.lastConductedAtrialActivationTimeSec",
  "history.proximalAvGateState.lastProximalAvOutputTimeSec",
  "history.distalGateState.lastPassedProximalArrivalTimeSec",
  "history.distalGateState.lastVentricularImpulseTimeSec",
  "history.ventricularBackupState.lastAcceptedVentricularActivation",
  "history.ventricularBackupState.lastIntrinsicEscapeAttemptResult",
  "history.ventricularBackupState.lastVviPacingAttemptResult",
  "history.intervalLastActivation",
]);
export type CardiorespiratorySettlementSeedV1 = Readonly<{
  systemicGasPressureOffsetMmHg?: Readonly<{ o2?: number; co2?: number }>;
  myocardialGasPressureOffsetMmHg?: Readonly<{ o2?: number; co2?: number }>;
  bloodGasPressureOffsetMmHg?: Readonly<{ o2?: number; co2?: number }>;
  /** Positive transfers blood from SV to VC, conserving TBV and both gases. */
  venousRedistributionMl?: number;
  /** Multiplier of each accepted coronary resistance scale. */
  coronaryToneScale?: number;
  /** Numerical initial-condition probe. Closed-unit inert inventories stay fixed. */
  lungGasScaleByUnit?: readonly [number, number];
}>;

/**
 * Physical state and future memory for SAME-forcing comparisons. Absolute
 * clocks, bookkeeping counters, gas ledgers, output caches and diagnostic
 * integrals are excluded. Pending events retain their delays and structure.
 * This projection is not a classifier or a claim of phase-averaged stationarity.
 */
export function projectCardiorespiratorySettlementStateV1(
  fixture: CardiorespiratoryFixtureV1, state: CardiorespiratoryCheckpointV2["state"],
): CardiorespiratorySettlementProjectionV1 {
  const continuous: Record<string, CardiorespiratorySettlementCoordinateV1> = {};
  const discrete: Record<string, string | boolean | null | number> = {};
  const time = state.acceptedTimeSec, cr = state.cardiorespiratory, c = state.coronary;
  const put = (path: string, value: number, scale: number,
    domain: CardiorespiratorySettlementCoordinateV1["domain"], monitorDrift = false) => {
    if (!Number.isFinite(value) || !Number.isFinite(scale) || scale <= 0)
      throw new Error(`Invalid physical settlement coordinate ${path}`);
    continuous[path] = Object.freeze({ value, scale, domain, monitorDrift });
  };
  const walk = (path: string, value: unknown, domain: CardiorespiratorySettlementCoordinateV1["domain"],
    scale: number, monitorDrift = false): void => {
    if (typeof value === "number") put(path, value, scale, domain, monitorDrift);
    else if (value === null || typeof value === "boolean" || typeof value === "string") discrete[path] = value as string | boolean | null;
    else if (Array.isArray(value) || ArrayBuffer.isView(value)) {
      const entries = Array.from(value as ArrayLike<unknown>);
      discrete[`${path}.length`] = entries.length;
      entries.forEach((v, i) => walk(`${path}.${i}`, v, domain, scale, monitorDrift));
    } else if (value && typeof value === "object") {
      for (const [key, child] of Object.entries(value)) walk(`${path}.${key}`, child, domain,
        key === "junctionRadiusM" ? .03 : key === "septalMidwallCapVolumeM3" ? 1e-4 : scale, monitorDrift);
    }
  };
  walk("hemodynamic.volumesMl", c.circulation.nodeVolumesMl, "hemodynamic", 100, true);
  walk("hemodynamic.coronaryVolumesMl", c.coronary.volumeMlByNode, "hemodynamic", 1, true);
  walk("hemodynamic.edgeFlowsMlPerSec", c.circulation.dynamicEdgeFlowsMlPerSec, "hemodynamic", 100);
  walk("hemodynamic.valves", c.circulation.valveStates, "hemodynamic", 1);
  walk("hemodynamic.material", c.mechanics.materialState, "hemodynamic", 1);
  walk("hemodynamic.mvcReference", { mitralForwardFlowActive: c.mvcReferenceState.mitralForwardFlowActive,
    reference: c.mvcReferenceState.reference }, "hemodynamic", 1);
  walk("hemodynamic.deviceFlows", state.dynamicMechanicalSupport.acceptedFlowMlPerSec, "hemodynamic", 100);
  walk("controller.tone", c.coronary.toneResistanceScaleByTerritoryLayer, "controller", 1, true);
  walk("controller.qmIntegralMl", c.coronaryAutoregulation.qmTimeIntegralMlByTerritoryLayer, "controller", 1);
  walk("controller.pressureIntegralMmHgSec", c.coronaryAutoregulation.perfusionPressureTimeIntegralMmHgSecByTerritory, "controller", 100);
  put("controller.windowElapsedSec", c.coronaryAutoregulation.acceptedDurationSec, 1, "controller");
  walk("controller.windowControl", c.coronaryAutoregulation.windowControl, "controller", 1);
  walk("controller.desiredControl", c.coronaryAutoregulation.desiredControl, "controller", 1);
  // Content plus separately retained physical volume uniquely determines each
  // inventory. A fixed chemistry reference avoids giving large reservoirs much
  // tighter concentration tolerances merely because they contain more blood.
  // Pressure is included too: Hb saturation can make a small content change
  // correspond to an appreciable PO2 change. Neither normalization is adaptive.
  const bloodReference = bloodGasContentsFromPressuresV1({ o2MmHg: 100, co2MmHg: 40 }, fixture.cardiorespiratory.bloodGas);
  const bloodVolumes = cardiorespiratoryPhysicalBloodVolumesFromCoupledStateV1(c);
  for (const [id, amount] of Object.entries(cr.blood)) {
    const pressure = bloodGasPressuresFromAmountsV1(amount, bloodVolumes[id], fixture.cardiorespiratory.bloodGas);
    put(`gas.bloodContent.${id}.o2MolPerL`, amount.o2Mol * 1000 / bloodVolumes[id], bloodReference.o2MolPerL, "gas", true);
    put(`gas.bloodContent.${id}.co2MolPerL`, amount.co2Mol * 1000 / bloodVolumes[id], bloodReference.co2MolPerL, "gas", true);
    put(`gas.bloodPressure.${id}.o2MmHg`, pressure.o2MmHg, 100, "gas", true);
    put(`gas.bloodPressure.${id}.co2MmHg`, pressure.co2MmHg, 100, "gas", true);
  }
  // A common 100-mmHg reference makes these inventory scales comparable
  // despite the very different effective O2/CO2 and tissue storage capacities.
  // Analysis still owns the convergence tolerance; these are dimensional units.
  for (const tissue of ["systemic", "myocardium"] as const) {
    const capacity = DEFAULT_TISSUE_GAS_PARAMETERS_V1[tissue];
    put(`gas.${tissue}.o2Mol`, cr[tissue].amount.o2Mol, 100 * capacity.o2CapacityMolPerMmHg, "gas", true);
    put(`gas.${tissue}.co2Mol`, cr[tissue].amount.co2Mol, 100 * capacity.co2CapacityMolPerMmHg, "gas", true);
  }
  walk("gas.alveolar", cr.respiratory.unitGasMol, "gas", .001, true);
  walk("gas.conducting", cr.respiratory.conductingGasMol, "gas", .001, true);
  const inventory = [...Object.values(cr.blood), cr.systemic.amount, cr.myocardium.amount,
    ...cr.respiratory.unitGasMol, cr.respiratory.conductingGasMol]
    .reduce((sum, amount) => ({ o2Mol: sum.o2Mol + amount.o2Mol, co2Mol: sum.co2Mol + amount.co2Mol }),
      { o2Mol: 0, co2Mol: 0 });
  // Independent whole-model inventory coordinates expose common gas drift
  // even if same-forcing independent histories happen to approach one another.
  put("gas.totalO2Mol", inventory.o2Mol, .1, "gas", true);
  put("gas.totalCo2Mol", inventory.co2Mol, .3, "gas", true);
  for (const i of [0, 1] as const) {
    const g = cr.respiratory.unitGasMol[i];
    put(`respiratory.totalGasMol.${i}`, g.o2Mol + g.co2Mol + g.inertMol, .05, "respiratory", true);
  }
  put("respiratory.inspiredVolumeThisBreathL", cr.respiratory.inspiredVolumeThisBreathL, 1, "respiratory");
  walk("respiratory.recruitmentProgress", cr.respiratory.recruitmentProgress01ByUnit, "respiratory", 1);
  walk("respiratory.airwayOpen", cr.respiratory.airwayOpenByUnit, "respiratory", 1);

  const rhythm = state.composedRhythm;
  walk("hemodynamic.calcium", rhythm.calciumStateByWall, "hemodynamic", 1);
  put("hemodynamic.normalizedSrLoad", rhythm.ventricularIntervalStrengthState.normalizedSrLoadState, 1, "hemodynamic");
  // Include complete pending event payloads and gate histories. Only their
  // bookkeeping lineage counters are removed; cursors/mask positions remain.
  const history = (path: string, value: unknown): void => {
    if (!value || typeof value !== "object") { walk(path, value, "hemodynamic", 1); return; }
    if (Array.isArray(value)) {
      discrete[`${path}.length`] = value.length;
      value.forEach((v, i) => history(`${path}.${i}`, v)); return;
    }
    for (const [key, child] of Object.entries(value)) {
      if (key === "configuration" || key === "revision" || key === "ownerRevision" || key === "acceptedTimeSec"
        || key === "schemaVersion" || key.endsWith("Count") || key.endsWith("Ordinal")
        || key === "sourceSequence" || key === "nextSourceSequence" || key.startsWith("initial")) continue;
      if (typeof child === "number" && /(TimeSec|UntilSec|DueTimeSec|AtSec)$/.test(key))
        put(`${path}.${key}.relative`, child - time, 1, "hemodynamic");
      else history(`${path}.${key}`, child);
    }
  };
  for (const key of ["electricalCaptureState", "proximalAvGateState", "distalGateState", "ventricularBackupState",
    "pendingProximalAvOutputs", "pendingDistalVentricularImpulses", "pendingCalciumDeposits", "authoredEctopyState"] as const)
    history(`history.${key}`, rhythm[key]);
  history("history.intervalLastActivation", rhythm.ventricularIntervalStrengthState.lastAcceptedVentricularActivation);
  const cardiacPeriod = rhythm.regularAtrialSourceState!.configuration.cycleLengthSec;
  const respiratory = fixture.cardiorespiratory.respiratory;
  return Object.freeze({ timeSec: time, optionalCoordinatePrefixes,
    forcing: Object.freeze({ cardiacTimeUntilNextSec: rhythm.regularAtrialSourceState!.nextActivationTimeSec - time,
      cardiacPeriodSec: cardiacPeriod, ventilatorCycleTimeSec: cr.respiratory.ventilatorCycleTimeSec,
      muscleCycleTimeSec: respiratoryMuscleCycleTimeSecV1(respiratory, time),
      controllerWindowElapsedSec: c.coronaryAutoregulation.acceptedDurationSec }),
    invariants: Object.freeze({ fixture: canonicalJsonStringify(fixture), fixedGlobalTotalBloodVolumeMl: c.fixedGlobalTotalBloodVolumeMl }),
    continuous: Object.freeze(continuous), discrete: Object.freeze(discrete) });
}

import {
  bloodGasPressuresFromAmountsV1,
  MOLAR_GAS_VOLUME_STPD_L_PER_MOL_V1,
  type BloodGasAmountV1,
  type BloodGasChemistryParametersV1,
} from './BloodGasChemistryV1';

export type TissueBedIdV1 = 'systemic' | 'myocardium';
export type TissueGasParametersV1 = Readonly<{
  id: TissueBedIdV1;
  /** Effective storage slopes, not literal tissue solubility or mitochondrial Km. */
  o2CapacityMolPerMmHg: number;
  co2CapacityMolPerMmHg: number;
  o2ConductanceMolPerSecPerMmHg: number;
  co2ConductanceMolPerSecPerMmHg: number;
  /** Above this effective tissue PO2, consumption exactly fulfills demand. */
  fullDemandO2PressureMmHg: number;
  respiratoryQuotient: number;
}>;
export type TissueGasStateV1 = Readonly<{
  id: TissueBedIdV1;
  amount: BloodGasAmountV1;
  /** Diagnostic integral only; this is neither lactate nor irreversible injury. */
  cumulativeUnmetO2Mol: number;
}>;
export type TissueGasStepResultV1 = Readonly<{
  state: TissueGasStateV1;
  bloodAmount: BloodGasAmountV1;
  bloodDeltaMol: BloodGasAmountV1;
  demandO2Mol: number;
  consumedO2Mol: number;
  producedCo2Mol: number;
  unmetDemandO2Mol: number;
  demandFulfillment01: number | null;
  tissueO2MmHg: number;
  tissueCo2MmHg: number;
}>;
/**
 * Explicitly provisional effective compartment priors. Separate heart/rest-body
 * stores and demands; no oxygen-dependent contractility/autoregulation feedback.
 * The heart prior does not automatically rescale with anatomical case mass.
 */
export const DEFAULT_TISSUE_GAS_PARAMETERS_V1: Readonly<Record<TissueBedIdV1, TissueGasParametersV1>> = Object.freeze({
  systemic: Object.freeze({
    id: 'systemic',
    o2CapacityMolPerMmHg: 0.00015,
    co2CapacityMolPerMmHg: 0.0015,
    o2ConductanceMolPerSecPerMmHg: 8.2e-6,
    co2ConductanceMolPerSecPerMmHg: 5e-5,
    fullDemandO2PressureMmHg: 3,
    respiratoryQuotient: 0.8,
  }),
  myocardium: Object.freeze({
    id: 'myocardium',
    o2CapacityMolPerMmHg: 2e-6,
    co2CapacityMolPerMmHg: 1e-5,
    // Provisional operating-point construction: at prescribed 25 mL O2/min,
    // G=2e-6 gives a ~9.3-mmHg drop from observed baseline CV PO2 ~15 mmHg,
    // leaving effective tissue PO2 ~5-6 above the full-demand threshold.
    // This is neither patient calibration nor independent physiological validation.
    o2ConductanceMolPerSecPerMmHg: 2e-6,
    co2ConductanceMolPerSecPerMmHg: 5e-6,
    fullDemandO2PressureMmHg: 3,
    respiratoryQuotient: 0.8,
  }),
});
function nonnegative(value: number, name: string): void {
  if (!Number.isFinite(value) || value < 0) throw new RangeError(`${name} must be finite and nonnegative`);
}
export function validateTissueGasParametersV1(parameters: TissueGasParametersV1): void {
  if (parameters.id !== 'systemic' && parameters.id !== 'myocardium') throw new RangeError('unknown tissue bed');
  for (const key of ['o2CapacityMolPerMmHg', 'co2CapacityMolPerMmHg', 'fullDemandO2PressureMmHg'] as const) {
    if (!Number.isFinite(parameters[key]) || parameters[key] <= 0) throw new RangeError(`${key} must be finite and positive`);
  }
  for (const key of ['o2ConductanceMolPerSecPerMmHg', 'co2ConductanceMolPerSecPerMmHg', 'respiratoryQuotient'] as const) nonnegative(parameters[key], key);
  if (parameters.respiratoryQuotient > 1.2) throw new RangeError('respiratoryQuotient exceeds model domain');
}
export function initializeTissueGasStateV1(
  parameters: TissueGasParametersV1, o2MmHg: number, co2MmHg: number,
): TissueGasStateV1 {
  validateTissueGasParametersV1(parameters);
  nonnegative(o2MmHg, 'tissue o2MmHg');
  nonnegative(co2MmHg, 'tissue co2MmHg');
  return {
    id: parameters.id,
    amount: { o2Mol: parameters.o2CapacityMolPerMmHg * o2MmHg, co2Mol: parameters.co2CapacityMolPerMmHg * co2MmHg },
    cumulativeUnmetO2Mol: 0,
  };
}
export function oxygenDemandMolPerSecFromMlPerMinV1(demandMlPerMin: number): number {
  nonnegative(demandMlPerMin, 'oxygen demandMlPerMin');
  return demandMlPerMin / (1000 * MOLAR_GAS_VOLUME_STPD_L_PER_MOL_V1 * 60);
}
/** Smooth, bounded effective supply limitation with an EXACT healthy plateau. */
export function tissueDemandFulfillmentV1(o2MmHg: number, fullDemandO2PressureMmHg: number): number {
  nonnegative(o2MmHg, 'tissue o2MmHg');
  if (!Number.isFinite(fullDemandO2PressureMmHg) || fullDemandO2PressureMmHg <= 0) throw new RangeError('full-demand O2 pressure must be positive');
  if (o2MmHg >= fullDemandO2PressureMmHg) return 1;
  const x = o2MmHg / fullDemandO2PressureMmHg;
  return x * x * (3 - 2 * x);
}
/**
 * First-order exchange/reaction split. Paired explicit diffusion transfers conserve
 * both gases exactly; an excessive exchange step is rejected (caller subdivides).
 * The metabolic sink is implicit and positivity-preserving, including complete
 * interruption of oxygen supply. This avoids forcing negative venous content.
 * CO2 production tracks actual aerobic consumption, not unmet demand; anaerobic
 * acid generation and bicarbonate titration are outside the scope of this model.
 */
export function advanceTissueGasExchangeV1(input: Readonly<{
  parameters: TissueGasParametersV1;
  state: TissueGasStateV1;
  bloodAmount: BloodGasAmountV1;
  bloodVolumeMl: number;
  chemistry: BloodGasChemistryParametersV1;
  demandO2MolPerSec: number;
  dtSec: number;
}>): TissueGasStepResultV1 {
  const { parameters, state, dtSec } = input;
  validateTissueGasParametersV1(parameters);
  if (state.id !== parameters.id) throw new RangeError('tissue state/parameter bed mismatch');
  for (const [name, value] of Object.entries({
    dtSec, demandO2MolPerSec: input.demandO2MolPerSec,
    tissueO2Mol: state.amount.o2Mol, tissueCo2Mol: state.amount.co2Mol,
    cumulativeUnmetO2Mol: state.cumulativeUnmetO2Mol,
  })) nonnegative(value, name);
  const blood = bloodGasPressuresFromAmountsV1(input.bloodAmount, input.bloodVolumeMl, input.chemistry);
  const tissueO2Before = state.amount.o2Mol / parameters.o2CapacityMolPerMmHg;
  const tissueCo2Before = state.amount.co2Mol / parameters.co2CapacityMolPerMmHg;
  const toTissue = {
    o2Mol: dtSec * parameters.o2ConductanceMolPerSecPerMmHg * (blood.o2MmHg - tissueO2Before),
    co2Mol: dtSec * parameters.co2ConductanceMolPerSecPerMmHg * (blood.co2MmHg - tissueCo2Before),
  };
  const bloodAmount = { o2Mol: input.bloodAmount.o2Mol - toTissue.o2Mol, co2Mol: input.bloodAmount.co2Mol - toTissue.co2Mol };
  const availableO2 = state.amount.o2Mol + toTissue.o2Mol;
  const co2AfterExchange = state.amount.co2Mol + toTissue.co2Mol;
  for (const [name, value] of Object.entries({ bloodO2: bloodAmount.o2Mol, bloodCo2: bloodAmount.co2Mol, tissueO2: availableO2, tissueCo2: co2AfterExchange })) {
    if (!Number.isFinite(value) || value < 0) throw new RangeError(`tissue exchange depletes ${name}; subdivide trial`);
  }
  // Reject a chemically unsupported blood state rather than silently clamping it.
  bloodGasPressuresFromAmountsV1(bloodAmount, input.bloodVolumeMl, input.chemistry);
  const demandO2Mol = dtSec * input.demandO2MolPerSec;
  const plateauAmount = parameters.o2CapacityMolPerMmHg * parameters.fullDemandO2PressureMmHg;
  let tissueO2Mol: number;
  let consumedO2Mol: number;
  if (availableO2 - demandO2Mol >= plateauAmount || demandO2Mol === 0) {
    consumedO2Mol = demandO2Mol;
    tissueO2Mol = availableO2 - demandO2Mol;
  } else {
    let low = 0;
    let high = availableO2;
    for (let i = 0; i < 64; i += 1) {
      const middle = (low + high) / 2;
      const actual = demandO2Mol * tissueDemandFulfillmentV1(middle / parameters.o2CapacityMolPerMmHg, parameters.fullDemandO2PressureMmHg);
      if (middle + actual > availableO2) high = middle; else low = middle;
    }
    // Evaluate the bounded reaction from the admissible lower root bracket.
    // Subtracting two nearly equal stores to recover consumption can round
    // above demand at the plateau and manufacture a negative unmet amount.
    consumedO2Mol = demandO2Mol * tissueDemandFulfillmentV1(low / parameters.o2CapacityMolPerMmHg, parameters.fullDemandO2PressureMmHg);
    tissueO2Mol = availableO2 - consumedO2Mol;
  }
  const unmetDemandO2Mol = demandO2Mol - consumedO2Mol;
  if (consumedO2Mol < 0 || unmetDemandO2Mol < 0) throw new RangeError('metabolism solve violated demand bounds');
  const producedCo2Mol = consumedO2Mol * parameters.respiratoryQuotient;
  const tissueAmount = { o2Mol: tissueO2Mol, co2Mol: co2AfterExchange + producedCo2Mol };
  return {
    state: { id: state.id, amount: tissueAmount, cumulativeUnmetO2Mol: state.cumulativeUnmetO2Mol + unmetDemandO2Mol },
    bloodAmount,
    bloodDeltaMol: { o2Mol: -toTissue.o2Mol, co2Mol: -toTissue.co2Mol },
    demandO2Mol, consumedO2Mol, producedCo2Mol, unmetDemandO2Mol,
    demandFulfillment01: demandO2Mol === 0 ? null : consumedO2Mol / demandO2Mol,
    tissueO2MmHg: tissueAmount.o2Mol / parameters.o2CapacityMolPerMmHg,
    tissueCo2MmHg: tissueAmount.co2Mol / parameters.co2CapacityMolPerMmHg,
  };
}

/**
 * Reduced adult blood chemistry at 37 C and normal 2,3-DPG. Gas amounts use mol;
 * contents use mol/L of physical whole blood (not plasma or stressed volume).
 *
 * O2: Severinghaus (1979), doi:10.1152/jappl.1979.46.3.599, standard curve;
 * pH shift: Okada et al. (1977), doi:10.2170/jjphysiol.27.135 (fixed T/DPG).
 * CO2: Douglas et al. (1988), doi:10.1152/jappl.1988.65.1.473, whole-blood
 * correction, with fixed-37-C Henderson-Hasselbalch alpha=0.0307, pK=6.1.
 * Buffer: Van Slyke, Siggaard-Andersen & Fogh-Andersen (1995), Table 1,
 * https://www.siggaard-andersen.dk/BaseExcessOrBufferBase.pdf .
 *
 * This is a reduced constitutive closure, NOT the full Dash 2016 model. Fixed
 * whole-blood base excess approximates a closed blood buffer; interstitial ion
 * redistribution, renal compensation, lactate, dyshemoglobins and temperature
 * changes are outside this model. Mixing different Hb/BE populations requires
 * transporting those inventories too and is not supported by fixed parameters.
 */
import { isTransitivelyFrozenPlainDataV1, validationStampReuseEligibleV1 } from "@/engine/validationStampModeV1";

export const MOLAR_GAS_VOLUME_STPD_L_PER_MOL_V1 = 22.414;
export type BloodGasAmountV1 = Readonly<{ o2Mol: number; co2Mol: number }>;
export type BloodGasContentV1 = Readonly<{ o2MolPerL: number; co2MolPerL: number }>;
export type BloodGasPressureV1 = Readonly<{ o2MmHg: number; co2MmHg: number }>;
export type BloodGasChemistryParametersV1 = Readonly<{
  hemoglobinGPerDl: number;
  /** Fixed whole-blood titratable base offset; not an evolving metabolic state. */
  baseExcessMmolPerL: number;
}>;
export type BloodGasEvaluationV1 = BloodGasContentV1 & BloodGasPressureV1 & Readonly<{
  pH: number;
  saturation01: number;
  bicarbonateMmolPerL: number;
}>;
export const DEFAULT_BLOOD_GAS_CHEMISTRY_V1: BloodGasChemistryParametersV1 = Object.freeze({
  hemoglobinGPerDl: 15,
  baseExcessMmolPerL: 0,
});
export const BLOOD_GAS_CHEMISTRY_DOMAIN_V1 = Object.freeze({
  minimumHemoglobinGPerDl: 3,
  maximumHemoglobinGPerDl: 22,
  minimumBaseExcessMmolPerL: -10,
  maximumBaseExcessMmolPerL: 10,
  minimumPH: 6.6,
  maximumPH: 7.8,
  maximumO2MmHg: 2000,
});
const ALPHA_CO2_MMOL_PER_L_PER_MMHG = 0.0307;
const PK = 6.1;
const HCO3_REFERENCE = 24.5;
const BISECTION_ITERATIONS = 64;
const inverseDomainParameters = new WeakMap<BloodGasChemistryParametersV1, PreparedInverseDomainParameters>();
type PreparedInverseDomainParameters = Readonly<{
  terms: ReturnType<typeof fixedBufferTerms>;
  lowPH: number; highPH: number;
  maximumO2Low: number; maximumO2High: number;
  interiorMinimumCo2: number; interiorMaximumCo2: number;
}>;

function finiteRange(value: number, low: number, high: number, label: string): void {
  if (!Number.isFinite(value) || value < low || value > high) {
    throw new RangeError(`${label} must be finite and in [${low}, ${high}]`);
  }
}
export function validateBloodGasChemistryV1(parameters: BloodGasChemistryParametersV1): void {
  finiteRange(parameters.hemoglobinGPerDl, 3, 22, 'hemoglobinGPerDl');
  finiteRange(parameters.baseExcessMmolPerL, -10, 10, 'baseExcessMmolPerL');
}
function bufferTerms(parameters: BloodGasChemistryParametersV1): { beta: number; offset: number } {
  // Hb monomer molecular mass 16,114 g/mol; g/dL -> mmol monomer/L.
  const hbMmolPerL = parameters.hemoglobinGPerDl * 10_000 / 16_114;
  return {
    beta: 2.3 * hbMmolPerL + 7.7,
    offset: parameters.baseExcessMmolPerL / (1 - hbMmolPerL / 43),
  };
}
function co2AtPH(pH: number, beta: number, offset: number): number {
  const bicarbonate = HCO3_REFERENCE + offset - beta * (pH - 7.4);
  if (!(bicarbonate > 0)) throw new RangeError('buffer closure has nonpositive bicarbonate');
  return bicarbonate / (ALPHA_CO2_MMOL_PER_L_PER_MMHG * 10 ** (pH - PK));
}
function fixedBufferTerms(parameters: BloodGasChemistryParametersV1) {
  // Low BE/high Hb can exhaust bicarbonate before the nominal upper pH bound.
  // Keep an explicit strictly positive bicarbonate margin; never clamp input state.
  const { beta, offset } = bufferTerms(parameters);
  const upperPH = Math.min(7.8, 7.4 + (HCO3_REFERENCE + offset - 0.1) / beta);
  return { beta, offset, upperPH,
    minimumMmHg: co2AtPH(upperPH, beta, offset), maximumMmHg: co2AtPH(6.6, beta, offset) };
}
export function bloodGasCo2PressureBoundsV1(parameters: BloodGasChemistryParametersV1): Readonly<{
  minimumMmHg: number; maximumMmHg: number;
}> {
  validateBloodGasChemistryV1(parameters);
  const { minimumMmHg, maximumMmHg } = fixedBufferTerms(parameters);
  return { minimumMmHg, maximumMmHg };
}
export function respiratoryPHFromCo2V1(co2MmHg: number, parameters: BloodGasChemistryParametersV1): number {
  validateBloodGasChemistryV1(parameters);
  return respiratoryPHAtFixedBuffer(co2MmHg, fixedBufferTerms(parameters));
}
function respiratoryPHAtFixedBuffer(co2MmHg: number, terms: ReturnType<typeof fixedBufferTerms>): number {
  finiteRange(co2MmHg, terms.minimumMmHg, terms.maximumMmHg, 'co2MmHg');
  const { beta, offset } = terms;
  let low = 6.6;
  let high = terms.upperPH;
  let pH = (low + high) / 2;
  for (let i = 0; i < BISECTION_ITERATIONS; i += 1) {
    const bicarbonate = ALPHA_CO2_MMOL_PER_L_PER_MMHG * co2MmHg * 10 ** (pH - PK);
    const residual = bicarbonate - HCO3_REFERENCE + beta * (pH - 7.4) - offset;
    if (Math.abs(residual) <= 1e-13) return pH;
    if (residual > 0) high = pH; else low = pH;
    // Strictly positive derivative; retain the bracket even near domain bounds.
    const candidate = pH - residual / (Math.LN10 * bicarbonate + beta);
    pH = candidate > low && candidate < high ? candidate : (low + high) / 2;
  }
  throw new RangeError('fixed-buffer pH inversion failed to converge');
}
export function oxygenSaturationFromPressureAndPHV1(o2MmHg: number, pH: number): number {
  finiteRange(o2MmHg, 0, 2000, 'o2MmHg');
  finiteRange(pH, 6.6, 7.8, 'pH');
  const standardPressure = o2MmHg / 10 ** (0.48 * (7.4 - pH));
  const numerator = standardPressure ** 3 + 150 * standardPressure;
  return numerator / (numerator + 23_400);
}
export function bloodGasContentsFromPressuresV1(
  pressures: BloodGasPressureV1,
  parameters: BloodGasChemistryParametersV1 = DEFAULT_BLOOD_GAS_CHEMISTRY_V1,
): BloodGasEvaluationV1 {
  const pH = respiratoryPHFromCo2V1(pressures.co2MmHg, parameters);
  return bloodGasContentsAtResolvedPH(pressures, parameters, pH);
}
function bloodGasContentsAtResolvedPH(
  pressures: BloodGasPressureV1, parameters: BloodGasChemistryParametersV1, pH: number,
): BloodGasEvaluationV1 {
  const saturation01 = oxygenSaturationFromPressureAndPHV1(pressures.o2MmHg, pH);
  const o2MlPerDl = 1.34 * parameters.hemoglobinGPerDl * saturation01 + 0.0031 * pressures.o2MmHg;
  const bicarbonateMmolPerL = ALPHA_CO2_MMOL_PER_L_PER_MMHG * pressures.co2MmHg * 10 ** (pH - PK);
  const plasmaCo2MmolPerL = bicarbonateMmolPerL + ALPHA_CO2_MMOL_PER_L_PER_MMHG * pressures.co2MmHg;
  const wholeBloodCorrection = 1 - (0.0289 * parameters.hemoglobinGPerDl)
    / ((3.352 - 0.456 * saturation01) * (8.142 - pH));
  if (!(wholeBloodCorrection > 0)) throw new RangeError('CO2 whole-blood correction outside domain');
  return {
    ...pressures,
    pH,
    saturation01,
    bicarbonateMmolPerL,
    o2MolPerL: o2MlPerDl * 0.01 / MOLAR_GAS_VOLUME_STPD_L_PER_MOL_V1,
    co2MolPerL: plasmaCo2MmolPerL * wholeBloodCorrection / 1000,
  };
}
function oxygenPressureAtContentAndPH(
  o2MolPerL: number, pH: number, parameters: BloodGasChemistryParametersV1,
): number {
  const shift = 10 ** (0.48 * (7.4 - pH));
  const scale = 0.01 / MOLAR_GAS_VOLUME_STPD_L_PER_MOL_V1;
  const contentAt = (pressure: number): number => {
    const x = pressure / shift;
    const n = x * x * x + 150 * x;
    return (1.34 * parameters.hemoglobinGPerDl * n / (n + 23_400) + 0.0031 * pressure) * scale;
  };
  // Permit only the inverse solver's declared residual tolerance at a bound.
  if (Math.abs(o2MolPerL - contentAt(2000)) <= 1e-14) return 2000;
  finiteRange(o2MolPerL, 0, contentAt(2000), 'o2MolPerL');
  if (o2MolPerL === 0) return 0;
  let low = 0;
  let high = 2000;
  let pressure = 40;
  for (let i = 0; i < 64; i += 1) {
    const residual = contentAt(pressure) - o2MolPerL;
    if (Math.abs(residual) <= 1e-14) return pressure;
    if (residual > 0) high = pressure; else low = pressure;
    const x = pressure / shift;
    const n = x * x * x + 150 * x;
    const derivative = (1.34 * parameters.hemoglobinGPerDl * 23_400 * (3 * x * x + 150)
      / ((n + 23_400) ** 2 * shift) + 0.0031) * scale;
    const candidate = pressure - residual / derivative;
    pressure = candidate > low && candidate < high ? candidate : (low + high) / 2;
  }
  throw new RangeError('O2 content inversion failed to converge');
}

/** Pure fixed-parameter work only. No accepted or warm numerical state is cached. */
function prepareInverseDomainParameters(parameters: BloodGasChemistryParametersV1): PreparedInverseDomainParameters {
  const reuse = validationStampReuseEligibleV1();
  const cached = reuse ? inverseDomainParameters.get(parameters) : undefined;
  if (cached) return cached;
  const terms = fixedBufferTerms(parameters);
  const lowPH = respiratoryPHAtFixedBuffer(terms.minimumMmHg, terms);
  const highPH = respiratoryPHAtFixedBuffer(terms.maximumMmHg, terms);
  const lowMaximum = bloodGasContentsAtResolvedPH({ o2MmHg: 2000, co2MmHg: terms.minimumMmHg }, parameters, lowPH);
  const highMaximum = bloodGasContentsAtResolvedPH({ o2MmHg: 2000, co2MmHg: terms.maximumMmHg }, parameters, highPH);
  const prepared = Object.freeze({ terms: Object.freeze(terms), lowPH, highPH,
    maximumO2Low: lowMaximum.o2MolPerL, maximumO2High: highMaximum.o2MolPerL,
    interiorMinimumCo2: bloodGasContentsAtResolvedPH({ o2MmHg: 0, co2MmHg: terms.minimumMmHg }, parameters, lowPH).co2MolPerL,
    interiorMaximumCo2: highMaximum.co2MolPerL });
  if (reuse && isTransitivelyFrozenPlainDataV1(parameters)) inverseDomainParameters.set(parameters, prepared);
  return prepared;
}

/** Same feasible domain used by the full inverse, without solving its interior. */
function bloodGasInverseDomain(contents: BloodGasContentV1, parameters: BloodGasChemistryParametersV1) {
  validateBloodGasChemistryV1(parameters);
  finiteRange(contents.o2MolPerL, 0, Number.MAX_VALUE, 'o2MolPerL');
  finiteRange(contents.co2MolPerL, 0, Number.MAX_VALUE, 'co2MolPerL');
  const prepared = prepareInverseDomainParameters(parameters);
  const { terms, lowPH } = prepared;
  const low = terms.minimumMmHg;
  let high = terms.maximumMmHg;
  let highPH = prepared.highPH;
  // The finite PO2 ceiling makes the feasible PCO2 interval content-dependent.
  // Restrict the SEARCH interval, never the accepted inventory or returned state.
  const maximumO2At = (co2MmHg: number, pH: number) => bloodGasContentsAtResolvedPH({ o2MmHg: 2000, co2MmHg }, parameters, pH).o2MolPerL;
  finiteRange(contents.o2MolPerL, 0, prepared.maximumO2Low, 'o2MolPerL (chemical domain)');
  if (contents.o2MolPerL > prepared.maximumO2High) {
    let allowed = low;
    let excluded = high;
    for (let i = 0; i < BISECTION_ITERATIONS; i += 1) {
      const middle = (allowed + excluded) / 2;
      if (maximumO2At(middle, respiratoryPHAtFixedBuffer(middle, terms)) >= contents.o2MolPerL) allowed = middle; else excluded = middle;
    }
    high = allowed;
    highPH = respiratoryPHAtFixedBuffer(high, terms);
  }
  const atPH = (co2MmHg: number, pH: number) => bloodGasContentsAtResolvedPH({
    o2MmHg: oxygenPressureAtContentAndPH(contents.o2MolPerL, pH, parameters), co2MmHg,
  }, parameters, pH);
  const at = (co2MmHg: number) => atPH(co2MmHg, respiratoryPHAtFixedBuffer(co2MmHg, terms));
  const minimumValue = atPH(low, lowPH), maximumValue = atPH(high, highPH);
  const minimum = minimumValue.co2MolPerL;
  const maximum = maximumValue.co2MolPerL;
  if (contents.co2MolPerL < minimum - 1e-14 || contents.co2MolPerL > maximum + 1e-14) {
    throw new RangeError(`co2MolPerL outside fixed-buffer chemical domain [${minimum}, ${maximum}]`);
  }
  return { low, high, at, minimum, maximum, minimumValue, maximumValue, beta: terms.beta };
}
export function validateBloodGasContentsV1(
  contents: BloodGasContentV1,
  parameters: BloodGasChemistryParametersV1 = DEFAULT_BLOOD_GAS_CHEMISTRY_V1,
): void {
  validateBloodGasChemistryV1(parameters);
  finiteRange(contents.o2MolPerL, 0, Number.MAX_VALUE, 'o2MolPerL');
  finiteRange(contents.co2MolPerL, 0, Number.MAX_VALUE, 'co2MolPerL');
  if (validationStampReuseEligibleV1()) {
    const domain = prepareInverseDomainParameters(parameters);
    // At fixed endpoint pH/PCO2, CO2 content strictly decreases with O2
    // saturation. S=0 bounds every lower endpoint from above; PO2=2000 bounds
    // every upper endpoint from below. Restrict O2 to both endpoint domains.
    // This conservative interior therefore needs no content-dependent roots.
    // Keep an inward margin (100x the inverse's content tolerance); boundary
    // cases and stamp-disabled audits retain the complete original checks.
    const margin = 1e-12;
    if (contents.o2MolPerL < Math.min(domain.maximumO2Low, domain.maximumO2High) - margin
      && contents.co2MolPerL > domain.interiorMinimumCo2 + margin
      && contents.co2MolPerL < domain.interiorMaximumCo2 - margin) return;
  }
  bloodGasInverseDomain(contents, parameters);
}
/** Bounded coupled inversion; impossible contents fail instead of changing inventory. */
export function bloodGasPressuresFromContentsV1(
  contents: BloodGasContentV1,
  parameters: BloodGasChemistryParametersV1 = DEFAULT_BLOOD_GAS_CHEMISTRY_V1,
): BloodGasEvaluationV1 {
  const domain = bloodGasInverseDomain(contents, parameters);
  let { low, high } = domain;
  const { at, minimum, maximum, beta } = domain;
  if (Math.abs(contents.co2MolPerL - minimum) <= 1e-14) return domain.minimumValue;
  if (Math.abs(contents.co2MolPerL - maximum) <= 1e-14) return domain.maximumValue;
  const oxygenCapacityMlPerDl = 1.34 * parameters.hemoglobinGPerDl;
  const hbCorrection = 0.0289 * parameters.hemoglobinGPerDl;
  let co2MmHg = 40 > low && 40 < high ? 40 : (low + high) / 2;
  for (let i = 0; i < BISECTION_ITERATIONS; i += 1) {
    const value = at(co2MmHg);
    const residual = value.co2MolPerL - contents.co2MolPerL;
    if (residual === 0) return value;
    if (residual > 0) high = co2MmHg; else low = co2MmHg;

    // Differentiate total CO2 ALONG constant total O2, including Bohr/Haldane
    // coupling. The pH derivative follows the same fixed-buffer closure.
    const pHDCo2 = -value.bicarbonateMmolPerL
      / (co2MmHg * (Math.LN10 * value.bicarbonateMmolPerL + beta));
    const shift = 10 ** (0.48 * (7.4 - value.pH));
    const x = value.o2MmHg / shift;
    const n = x * x * x + 150 * x;
    const saturationDO2 = 23_400 * (3 * x * x + 150) / ((n + 23_400) ** 2 * shift);
    const saturationDPH = saturationDO2 * value.o2MmHg * (0.48 * Math.LN10)
      * 0.0031 / (oxygenCapacityMlPerDl * saturationDO2 + 0.0031);
    const saturationFactor = 3.352 - 0.456 * value.saturation01;
    const pHFactor = 8.142 - value.pH;
    const correctionLoss = hbCorrection / (saturationFactor * pHFactor);
    const correctionDCo2 = -correctionLoss * (0.456 * saturationDPH / saturationFactor + 1 / pHFactor) * pHDCo2;
    const plasmaCo2 = value.bicarbonateMmolPerL + ALPHA_CO2_MMOL_PER_L_PER_MMHG * co2MmHg;
    const derivative = ((ALPHA_CO2_MMOL_PER_L_PER_MMHG - beta * pHDCo2) * (1 - correctionLoss)
      + plasmaCo2 * correctionDCo2) / 1000;
    const candidate = co2MmHg - residual / derivative;
    // Stop only at an exact content match or floating-point pressure stagnation,
    // rather than relaxing the former bisection's content/pressure accuracy.
    if (candidate === co2MmHg) return value;
    co2MmHg = candidate > low && candidate < high ? candidate : (low + high) / 2;
  }
  return at((low + high) / 2);
}
export function bloodGasAmountsFromPressuresV1(
  volumeMl: number, pressures: BloodGasPressureV1,
  parameters: BloodGasChemistryParametersV1 = DEFAULT_BLOOD_GAS_CHEMISTRY_V1,
): BloodGasAmountV1 {
  finiteRange(volumeMl, Number.MIN_VALUE, Number.MAX_VALUE, 'physical blood volumeMl');
  const contents = bloodGasContentsFromPressuresV1(pressures, parameters);
  return { o2Mol: contents.o2MolPerL * volumeMl / 1000, co2Mol: contents.co2MolPerL * volumeMl / 1000 };
}
export function bloodGasPressuresFromAmountsV1(
  amount: BloodGasAmountV1, volumeMl: number,
  parameters: BloodGasChemistryParametersV1 = DEFAULT_BLOOD_GAS_CHEMISTRY_V1,
): BloodGasEvaluationV1 {
  finiteRange(volumeMl, Number.MIN_VALUE, Number.MAX_VALUE, 'physical blood volumeMl');
  return bloodGasPressuresFromContentsV1({ o2MolPerL: amount.o2Mol * 1000 / volumeMl, co2MolPerL: amount.co2Mol * 1000 / volumeMl }, parameters);
}

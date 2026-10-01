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
function co2AtPH(pH: number, parameters: BloodGasChemistryParametersV1): number {
  const { beta, offset } = bufferTerms(parameters);
  const bicarbonate = HCO3_REFERENCE + offset - beta * (pH - 7.4);
  if (!(bicarbonate > 0)) throw new RangeError('buffer closure has nonpositive bicarbonate');
  return bicarbonate / (ALPHA_CO2_MMOL_PER_L_PER_MMHG * 10 ** (pH - PK));
}
export function bloodGasCo2PressureBoundsV1(parameters: BloodGasChemistryParametersV1): Readonly<{
  minimumMmHg: number; maximumMmHg: number;
}> {
  validateBloodGasChemistryV1(parameters);
  // Low BE/high Hb can exhaust bicarbonate before the nominal upper pH bound.
  // Keep an explicit strictly positive bicarbonate margin; never clamp input state.
  const { beta, offset } = bufferTerms(parameters);
  const upperPH = Math.min(7.8, 7.4 + (HCO3_REFERENCE + offset - 0.1) / beta);
  return { minimumMmHg: co2AtPH(upperPH, parameters), maximumMmHg: co2AtPH(6.6, parameters) };
}
export function respiratoryPHFromCo2V1(co2MmHg: number, parameters: BloodGasChemistryParametersV1): number {
  validateBloodGasChemistryV1(parameters);
  const bounds = bloodGasCo2PressureBoundsV1(parameters);
  finiteRange(co2MmHg, bounds.minimumMmHg, bounds.maximumMmHg, 'co2MmHg');
  const { beta, offset } = bufferTerms(parameters);
  let low = 6.6;
  let high = Math.min(7.8, 7.4 + (HCO3_REFERENCE + offset - 0.1) / beta);
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
function oxygenPressureAtContentAndCo2(
  o2MolPerL: number, co2MmHg: number, parameters: BloodGasChemistryParametersV1,
): number {
  const pH = respiratoryPHFromCo2V1(co2MmHg, parameters);
  return oxygenPressureAtContentAndPH(o2MolPerL, pH, parameters);
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

/** Same feasible domain used by the full inverse, without solving its interior. */
function bloodGasInverseDomain(contents: BloodGasContentV1, parameters: BloodGasChemistryParametersV1) {
  validateBloodGasChemistryV1(parameters);
  finiteRange(contents.o2MolPerL, 0, Number.MAX_VALUE, 'o2MolPerL');
  finiteRange(contents.co2MolPerL, 0, Number.MAX_VALUE, 'co2MolPerL');
  const bounds = bloodGasCo2PressureBoundsV1(parameters);
  let low = bounds.minimumMmHg;
  let high = bounds.maximumMmHg;
  // The finite PO2 ceiling makes the feasible PCO2 interval content-dependent.
  // Restrict the SEARCH interval, never the accepted inventory or returned state.
  const maximumO2At = (co2MmHg: number) => bloodGasContentsFromPressuresV1({ o2MmHg: 2000, co2MmHg }, parameters).o2MolPerL;
  finiteRange(contents.o2MolPerL, 0, maximumO2At(low), 'o2MolPerL (chemical domain)');
  if (contents.o2MolPerL > maximumO2At(high)) {
    let allowed = low;
    let excluded = high;
    for (let i = 0; i < BISECTION_ITERATIONS; i += 1) {
      const middle = (allowed + excluded) / 2;
      if (maximumO2At(middle) >= contents.o2MolPerL) allowed = middle; else excluded = middle;
    }
    high = allowed;
  }
  const at = (co2MmHg: number) => bloodGasContentsFromPressuresV1({
    o2MmHg: oxygenPressureAtContentAndCo2(contents.o2MolPerL, co2MmHg, parameters), co2MmHg,
  }, parameters);
  const minimum = at(low).co2MolPerL;
  const maximum = at(high).co2MolPerL;
  if (contents.co2MolPerL < minimum - 1e-14 || contents.co2MolPerL > maximum + 1e-14) {
    throw new RangeError(`co2MolPerL outside fixed-buffer chemical domain [${minimum}, ${maximum}]`);
  }
  return { low, high, at, minimum, maximum };
}
export function validateBloodGasContentsV1(
  contents: BloodGasContentV1,
  parameters: BloodGasChemistryParametersV1 = DEFAULT_BLOOD_GAS_CHEMISTRY_V1,
): void {
  bloodGasInverseDomain(contents, parameters);
}
/** Bounded nested inversion; impossible contents fail instead of changing inventory. */
export function bloodGasPressuresFromContentsV1(
  contents: BloodGasContentV1,
  parameters: BloodGasChemistryParametersV1 = DEFAULT_BLOOD_GAS_CHEMISTRY_V1,
): BloodGasEvaluationV1 {
  const domain = bloodGasInverseDomain(contents, parameters);
  let { low, high } = domain;
  const { at, minimum, maximum } = domain;
  if (Math.abs(contents.co2MolPerL - minimum) <= 1e-14) return at(low);
  if (Math.abs(contents.co2MolPerL - maximum) <= 1e-14) return at(high);
  for (let i = 0; i < BISECTION_ITERATIONS; i += 1) {
    const middle = (low + high) / 2;
    if (at(middle).co2MolPerL > contents.co2MolPerL) high = middle; else low = middle;
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

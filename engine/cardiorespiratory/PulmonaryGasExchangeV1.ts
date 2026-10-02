import {
  bloodGasContentsFromPressuresV1,
  type BloodGasAmountV1,
  type BloodGasChemistryParametersV1,
  type BloodGasContentV1,
  type BloodGasPressureV1,
} from './BloodGasChemistryV1';

export type PerfusedAlveolarExchangeInputV1 = Readonly<{
  /** Actual absolute through-volume from the accepted hydraulic path, not net CO. */
  throughVolumeMl: number;
  /** Caller chooses the true upstream blood compartment when hydraulic flow reverses. */
  upstreamContent: BloodGasContentV1;
  alveolarPressures: BloodGasPressureV1;
  alveolarAvailable: BloodGasAmountV1;
  /** Receiver after conservative advection; exchange modifies this same inventory. */
  receivingBloodAvailable: BloodGasAmountV1;
  equilibrationFraction01: number;
  chemistry: BloodGasChemistryParametersV1;
}>;
export type PerfusedAlveolarExchangeResultV1 = Readonly<{
  bloodDeltaMol: BloodGasAmountV1;
  alveolarDeltaMol: BloodGasAmountV1;
  equilibratedOutflowContent: BloodGasContentV1;
}>;
/**
 * Perfusion-limited plug-flow contact, fractionally equilibrating the transported
 * blood against the regional gas pressure. No fictitious regional blood storage.
 * Exchange uses the start-of-exchange alveolar pressure (first-order split).
 * Trial rejection/subdivision, not donor clipping, handles an excessive step.
 */
export function exchangePerfusedBloodWithAlveolarGasV1(
  input: PerfusedAlveolarExchangeInputV1,
): PerfusedAlveolarExchangeResultV1 {
  for (const [name, value] of Object.entries({
    throughVolumeMl: input.throughVolumeMl,
    upstreamO2: input.upstreamContent.o2MolPerL,
    upstreamCo2: input.upstreamContent.co2MolPerL,
    alveolarO2: input.alveolarAvailable.o2Mol,
    alveolarCo2: input.alveolarAvailable.co2Mol,
    receiverO2: input.receivingBloodAvailable.o2Mol,
    receiverCo2: input.receivingBloodAvailable.co2Mol,
  })) if (!Number.isFinite(value) || value < 0) throw new RangeError(`${name} must be finite and nonnegative`);
  const fraction = input.equilibrationFraction01;
  if (!Number.isFinite(fraction) || fraction < 0 || fraction > 1) throw new RangeError('equilibrationFraction01 must be in [0,1]');
  if (input.throughVolumeMl === 0 || fraction === 0) return {
    bloodDeltaMol: { o2Mol: 0, co2Mol: 0 },
    alveolarDeltaMol: { o2Mol: 0, co2Mol: 0 },
    equilibratedOutflowContent: { ...input.upstreamContent },
  };
  const equilibrium = bloodGasContentsFromPressuresV1(input.alveolarPressures, input.chemistry);
  const outflow = {
    o2MolPerL: input.upstreamContent.o2MolPerL + fraction * (equilibrium.o2MolPerL - input.upstreamContent.o2MolPerL),
    co2MolPerL: input.upstreamContent.co2MolPerL + fraction * (equilibrium.co2MolPerL - input.upstreamContent.co2MolPerL),
  };
  const bloodDeltaMol = {
    o2Mol: (outflow.o2MolPerL - input.upstreamContent.o2MolPerL) * input.throughVolumeMl / 1000,
    co2Mol: (outflow.co2MolPerL - input.upstreamContent.co2MolPerL) * input.throughVolumeMl / 1000,
  };
  for (const species of ['o2Mol', 'co2Mol'] as const) {
    if (input.alveolarAvailable[species] - bloodDeltaMol[species] < 0
      || input.receivingBloodAvailable[species] + bloodDeltaMol[species] < 0) {
      throw new RangeError(`pulmonary ${species} exchange would deplete a donor; subdivide trial`);
    }
  }
  return {
    bloodDeltaMol,
    alveolarDeltaMol: { o2Mol: -bloodDeltaMol.o2Mol, co2Mol: -bloodDeltaMol.co2Mol },
    equilibratedOutflowContent: outflow,
  };
}

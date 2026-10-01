import type { BloodGasAmountV1 } from './BloodGasChemistryV1';

export type GasTransportNodeV1 = Readonly<{
  id: string;
  /** Physical blood volume, including unstressed volume. */
  volumeBeforeMl: number;
  volumeAfterMl: number;
  amount: BloodGasAmountV1;
}>;
export type AcceptedFluidTransferV1 = Readonly<{
  from: string;
  to: string;
  /** Signed volume from the same accepted continuity update, e.g. dt * Qnew. */
  volumeMl: number;
}>;
export type ConservativeGasTransportResultV1 = Readonly<{
  amountsById: Readonly<Record<string, BloodGasAmountV1>>;
  /** Signed with each input edge orientation. */
  transfersByEdge: readonly BloodGasAmountV1[];
  conservationResidualMol: BloodGasAmountV1;
}>;
function nonnegative(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) throw new RangeError(`${label} must be finite and nonnegative`);
}
/**
 * Backward-Euler upwind advection with both gas species sharing one factorization.
 * No source/sink and no boundary reservoirs: every edge belongs to this closed
 * blood network. Exchange is an independently balanced pairwise operation.
 * Zero-volume nodes are allowed only as zero-inventory algebraic mixing nodes.
 */
export function advanceConservativeGasTransportV1(
  nodes: readonly GasTransportNodeV1[],
  transfers: readonly AcceptedFluidTransferV1[],
  options: Readonly<{ volumeBalanceToleranceMl?: number }> = {},
): ConservativeGasTransportResultV1 {
  if (nodes.length === 0) throw new RangeError('gas transport requires nodes');
  const tolerance = options.volumeBalanceToleranceMl ?? 1e-7;
  nonnegative(tolerance, 'volumeBalanceToleranceMl');
  const index = new Map<string, number>();
  const expected = nodes.map((node, i) => {
    if (!node.id || index.has(node.id)) throw new RangeError('gas transport node IDs must be nonempty and unique');
    index.set(node.id, i);
    nonnegative(node.volumeBeforeMl, `${node.id}.volumeBeforeMl`);
    nonnegative(node.volumeAfterMl, `${node.id}.volumeAfterMl`);
    nonnegative(node.amount.o2Mol, `${node.id}.o2Mol`);
    nonnegative(node.amount.co2Mol, `${node.id}.co2Mol`);
    if (node.volumeBeforeMl === 0 && (node.amount.o2Mol !== 0 || node.amount.co2Mol !== 0)) {
      throw new RangeError('zero-volume nodes cannot store gas');
    }
    return node.volumeBeforeMl;
  });
  const n = nodes.length;
  const matrix = nodes.map((node, i) => {
    const row = new Float64Array(n + 2);
    row[i] = node.volumeAfterMl;
    row[n] = node.amount.o2Mol;
    row[n + 1] = node.amount.co2Mol;
    return row;
  });
  const oriented = transfers.map((edge) => {
    const from = index.get(edge.from);
    const to = index.get(edge.to);
    if (from === undefined || to === undefined) throw new RangeError('gas transfer references unknown node');
    if (!Number.isFinite(edge.volumeMl)) throw new RangeError('accepted fluid transfer must be finite');
    expected[from] -= edge.volumeMl;
    expected[to] += edge.volumeMl;
    const upstream = edge.volumeMl >= 0 ? from : to;
    const downstream = edge.volumeMl >= 0 ? to : from;
    const volume = Math.abs(edge.volumeMl);
    matrix[upstream][upstream] += volume;
    matrix[downstream][upstream] -= volume;
    return { upstream, signedVolume: edge.volumeMl };
  });
  nodes.forEach((node, i) => {
    if (Math.abs(expected[i] - node.volumeAfterMl) > tolerance) {
      throw new RangeError(`accepted blood continuity mismatch at ${node.id}: ${expected[i] - node.volumeAfterMl} mL`);
    }
  });
  // Partial-pivot Gaussian elimination; state stays untouched if any solve fails.
  for (let k = 0; k < n; k += 1) {
    let pivot = k;
    for (let i = k + 1; i < n; i += 1) if (Math.abs(matrix[i][k]) > Math.abs(matrix[pivot][k])) pivot = i;
    if (!(Math.abs(matrix[pivot][k]) > 0)) throw new RangeError('singular gas transport mixing network');
    [matrix[k], matrix[pivot]] = [matrix[pivot], matrix[k]];
    for (let i = k + 1; i < n; i += 1) {
      const factor = matrix[i][k] / matrix[k][k];
      matrix[i][k] = 0;
      for (let j = k + 1; j < n + 2; j += 1) matrix[i][j] -= factor * matrix[k][j];
    }
  }
  const concentrations = nodes.map(() => ({ o2Mol: 0, co2Mol: 0 })); // mol/mL
  for (let i = n - 1; i >= 0; i -= 1) {
    let o2 = matrix[i][n];
    let co2 = matrix[i][n + 1];
    for (let j = i + 1; j < n; j += 1) {
      o2 -= matrix[i][j] * concentrations[j].o2Mol;
      co2 -= matrix[i][j] * concentrations[j].co2Mol;
    }
    concentrations[i] = { o2Mol: o2 / matrix[i][i], co2Mol: co2 / matrix[i][i] };
    nonnegative(concentrations[i].o2Mol, 'solved O2 concentration');
    nonnegative(concentrations[i].co2Mol, 'solved CO2 concentration');
  }
  const amountsById: Record<string, BloodGasAmountV1> = Object.create(null);
  const residual = { o2Mol: 0, co2Mol: 0 };
  nodes.forEach((node, i) => {
    const amount = { o2Mol: concentrations[i].o2Mol * node.volumeAfterMl, co2Mol: concentrations[i].co2Mol * node.volumeAfterMl };
    amountsById[node.id] = amount;
    residual.o2Mol += amount.o2Mol - node.amount.o2Mol;
    residual.co2Mol += amount.co2Mol - node.amount.co2Mol;
  });
  return {
    amountsById,
    transfersByEdge: oriented.map(({ upstream, signedVolume }) => ({
      o2Mol: signedVolume * concentrations[upstream].o2Mol,
      co2Mol: signedVolume * concentrations[upstream].co2Mol,
    })),
    conservationResidualMol: residual,
  };
}

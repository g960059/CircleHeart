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
  return new ConservativeGasTransportWorkspaceV1().advance(nodes, transfers, options);
}

/** Private reusable solve storage only. Every call rebuilds coefficients from
 * its inputs, including after rejection; returned amounts never alias scratch.
 * One exact session owns one workspace, with no additional numerical state. */
export class ConservativeGasTransportWorkspaceV1 {
  #matrix: Float64Array[] = [];
  #expected = new Float64Array(0);
  #oxygen = new Float64Array(0);
  #carbonDioxide = new Float64Array(0);
  #upstream = new Uint32Array(0);
  #signedVolume = new Float64Array(0);
  #index = new Map<string, number>();
  #busy = false;

  advance(nodes: readonly GasTransportNodeV1[], transfers: readonly AcceptedFluidTransferV1[],
    options: Readonly<{ volumeBalanceToleranceMl?: number }> = {}): ConservativeGasTransportResultV1 {
    if (this.#busy) throw new Error('gas transport workspace is already in use');
    this.#busy = true;
    try { return this.#solve(nodes, transfers, options); }
    finally { this.#busy = false; }
  }

  #solve(nodes: readonly GasTransportNodeV1[], transfers: readonly AcceptedFluidTransferV1[],
    options: Readonly<{ volumeBalanceToleranceMl?: number }>): ConservativeGasTransportResultV1 {
    if (nodes.length === 0) throw new RangeError('gas transport requires nodes');
    const tolerance = options.volumeBalanceToleranceMl ?? 1e-7;
    nonnegative(tolerance, 'volumeBalanceToleranceMl');
    const n = nodes.length;
    if (this.#matrix.length !== n) {
      this.#matrix = Array.from({ length: n }, () => new Float64Array(n + 2));
      this.#expected = new Float64Array(n);
      this.#oxygen = new Float64Array(n);
      this.#carbonDioxide = new Float64Array(n);
    }
    if (this.#upstream.length !== transfers.length) {
      this.#upstream = new Uint32Array(transfers.length);
      this.#signedVolume = new Float64Array(transfers.length);
    }
    const index = this.#index, expected = this.#expected, matrix = this.#matrix;
    index.clear();
    for (let i = 0; i < n; i++) {
      const node = nodes[i];
      if (!node || typeof node !== 'object') throw new RangeError('gas transport nodes must be dense records');
      if (!node.id || index.has(node.id)) throw new RangeError('gas transport node IDs must be nonempty and unique');
      index.set(node.id, i);
      nonnegative(node.volumeBeforeMl, `${node.id}.volumeBeforeMl`);
      nonnegative(node.volumeAfterMl, `${node.id}.volumeAfterMl`);
      nonnegative(node.amount.o2Mol, `${node.id}.o2Mol`);
      nonnegative(node.amount.co2Mol, `${node.id}.co2Mol`);
      if (node.volumeBeforeMl === 0 && (node.amount.o2Mol !== 0 || node.amount.co2Mol !== 0)) {
        throw new RangeError('zero-volume nodes cannot store gas');
      }
      expected[i] = node.volumeBeforeMl;
    }
    nodes.forEach((node, i) => {
      const row = matrix[i];
      row.fill(0);
      row[i] = node.volumeAfterMl;
      row[n] = node.amount.o2Mol;
      row[n + 1] = node.amount.co2Mol;
    });
    const upstreamByEdge = this.#upstream, signedVolumeByEdge = this.#signedVolume;
    transfers.forEach((edge, i) => {
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
      upstreamByEdge[i] = upstream; signedVolumeByEdge[i] = edge.volumeMl;
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
    const oxygen = this.#oxygen, carbonDioxide = this.#carbonDioxide; // mol/mL
    for (let i = n - 1; i >= 0; i -= 1) {
      let o2 = matrix[i][n];
      let co2 = matrix[i][n + 1];
      for (let j = i + 1; j < n; j += 1) {
        o2 -= matrix[i][j] * oxygen[j];
        co2 -= matrix[i][j] * carbonDioxide[j];
      }
      oxygen[i] = o2 / matrix[i][i]; carbonDioxide[i] = co2 / matrix[i][i];
      nonnegative(oxygen[i], 'solved O2 concentration');
      nonnegative(carbonDioxide[i], 'solved CO2 concentration');
    }
    const amountsById: Record<string, BloodGasAmountV1> = Object.create(null);
    const residual = { o2Mol: 0, co2Mol: 0 };
    nodes.forEach((node, i) => {
      const amount = { o2Mol: oxygen[i] * node.volumeAfterMl, co2Mol: carbonDioxide[i] * node.volumeAfterMl };
      amountsById[node.id] = amount;
      residual.o2Mol += amount.o2Mol - node.amount.o2Mol;
      residual.co2Mol += amount.co2Mol - node.amount.co2Mol;
    });
    return {
      amountsById,
      transfersByEdge: transfers.map((_edge, i) => ({
        o2Mol: signedVolumeByEdge[i] * oxygen[upstreamByEdge[i]],
        co2Mol: signedVolumeByEdge[i] * carbonDioxide[upstreamByEdge[i]],
      })),
      conservationResidualMol: residual,
    };
  }
}

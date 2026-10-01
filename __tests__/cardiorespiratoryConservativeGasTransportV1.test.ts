import { describe, expect, it } from 'vitest';
import { advanceConservativeGasTransportV1, type GasTransportNodeV1 } from '../engine/cardiorespiratory/ConservativeGasTransportV1';

describe('accepted-fluid conservative implicit gas advection', () => {
  it('preserves uniform concentrations while physical blood volumes change', () => {
    const nodes = [
      { id: 'a', volumeBeforeMl: 100, volumeAfterMl: 70, amount: { o2Mol: 0.001, co2Mol: 0.002 } },
      { id: 'b', volumeBeforeMl: 100, volumeAfterMl: 130, amount: { o2Mol: 0.001, co2Mol: 0.002 } },
    ];
    const before = JSON.stringify(nodes);
    const result = advanceConservativeGasTransportV1(nodes, [{ from: 'a', to: 'b', volumeMl: 30 }]);
    expect(result.amountsById.a.o2Mol / 70).toBeCloseTo(0.00001, 14);
    expect(result.amountsById.b.o2Mol / 130).toBeCloseTo(0.00001, 14);
    expect(result.amountsById.a.co2Mol / 70).toBeCloseTo(0.00002, 14);
    expect(result.conservationResidualMol.o2Mol).toBeCloseTo(0, 15);
    expect(JSON.stringify(nodes)).toBe(before);
  });
  it('uses the opposite donor for reversed flow', () => {
    const result = advanceConservativeGasTransportV1([
      { id: 'a', volumeBeforeMl: 100, volumeAfterMl: 125, amount: { o2Mol: 0, co2Mol: 0 } },
      { id: 'b', volumeBeforeMl: 100, volumeAfterMl: 75, amount: { o2Mol: 0.001, co2Mol: 0.002 } },
    ], [{ from: 'a', to: 'b', volumeMl: -25 }]);
    expect(result.amountsById.a.o2Mol).toBeCloseTo(0.00025, 15);
    expect(result.amountsById.b.o2Mol).toBeCloseTo(0.00075, 15);
    expect(result.transfersByEdge[0].o2Mol).toBeLessThan(0);
    expect(result.transfersByEdge[0].o2Mol).toBe(-25 * result.amountsById.b.o2Mol / 75);
    expect(result.transfersByEdge[0].co2Mol).toBe(-25 * result.amountsById.b.co2Mol / 75);
  });
  it('does not cancel opposite directional transfers with different upstream contents', () => {
    const result = advanceConservativeGasTransportV1([
      { id: 'a', volumeBeforeMl: 100, volumeAfterMl: 100, amount: { o2Mol: 0.002, co2Mol: 0.001 } },
      { id: 'b', volumeBeforeMl: 100, volumeAfterMl: 100, amount: { o2Mol: 0, co2Mol: 0.003 } },
    ], [{ from: 'a', to: 'b', volumeMl: 10 }, { from: 'a', to: 'b', volumeMl: -10 }]);
    expect(result.amountsById.b.o2Mol).toBeGreaterThan(0);
    expect(result.amountsById.a.o2Mol).toBeLessThan(0.002);
    expect(result.conservationResidualMol.o2Mol).toBeCloseTo(0, 15);
    expect(result.conservationResidualMol.co2Mol).toBeCloseTo(0, 15);
  });
  it('is positive for many compartment turnovers and treats zero-volume mixing algebraically', () => {
    const nodes: GasTransportNodeV1[] = [
      { id: 'a', volumeBeforeMl: 1, volumeAfterMl: 1, amount: { o2Mol: 1, co2Mol: 0 } },
      { id: 'junction', volumeBeforeMl: 0, volumeAfterMl: 0, amount: { o2Mol: 0, co2Mol: 0 } },
      { id: 'b', volumeBeforeMl: 1, volumeAfterMl: 1, amount: { o2Mol: 0, co2Mol: 1 } },
    ];
    const result = advanceConservativeGasTransportV1(nodes, [
      { from: 'a', to: 'junction', volumeMl: 100 },
      { from: 'junction', to: 'b', volumeMl: 100 },
      { from: 'b', to: 'a', volumeMl: 100 },
    ]);
    expect(result.amountsById.junction.o2Mol).toBe(0);
    expect(result.amountsById.a.o2Mol).toBeGreaterThan(0);
    expect(result.amountsById.b.o2Mol).toBeGreaterThan(0);
    expect(result.amountsById.a.o2Mol + result.amountsById.b.o2Mol).toBeCloseTo(1, 12);
  });
  it('rejects a flow inconsistent with the accepted volume update', () => {
    expect(() => advanceConservativeGasTransportV1([
      { id: 'a', volumeBeforeMl: 100, volumeAfterMl: 100, amount: { o2Mol: 1, co2Mol: 1 } },
      { id: 'b', volumeBeforeMl: 100, volumeAfterMl: 100, amount: { o2Mol: 1, co2Mol: 1 } },
    ], [{ from: 'a', to: 'b', volumeMl: 1 }])).toThrow(/continuity mismatch/);
  });
  it('rejects negative inventory and an isolated zero-volume junction', () => {
    expect(() => advanceConservativeGasTransportV1([{ id: 'a', volumeBeforeMl: 1, volumeAfterMl: 1, amount: { o2Mol: -1, co2Mol: 1 } }], [])).toThrow();
    expect(() => advanceConservativeGasTransportV1([{ id: 'a', volumeBeforeMl: 0, volumeAfterMl: 0, amount: { o2Mol: 0, co2Mol: 0 } }], [])).toThrow(/singular/);
  });
});

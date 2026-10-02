import { describe, expect, it } from "vitest";
import { parseCardiorespiratoryStartupCalibrationArgumentsV1 as parse } from "@/tools/scientific/calibrateCardiorespiratoryStartupV1";
import { cardiorespiratoryStartupCalibrationCasesV1 as cases } from "@/tools/scientific/CardiorespiratoryStartupCalibrationCasesV1";
import { evaluateCardiorespiratoryStartupHoldoutV1 as holdout } from "@/tools/scientific/CardiorespiratoryStartupCalibrationWorkerV1";
import { CARDIORESPIRATORY_STARTUP_METRICS_V1 as metrics, type CardiorespiratoryStartupWindowV1 as Window } from
  "@/analysis/methods/cardiorespiratory/CardiorespiratoryStartupReadinessV1";

function window(startTimeSec: number): Window {
  const values = Object.fromEntries(metrics.map(k => [k, 0])) as unknown as Window["means"];
  return { startTimeSec, endTimeSec: startTimeSec + 10, sampleCount: 1000,
    means: { ...values, mapMmHg: 100 }, minima: { ...values, mapMmHg: 80, pleuralPressureCmH2O: -5 },
    maxima: { ...values, mapMmHg: 120, pleuralPressureCmH2O: 5 } };
}
describe("bounded single-history startup calibration", () => {
  it("preserves fixed budget candidates and rejects unbounded or destructive CLI choices", () => {
    expect(parse([], "/workspace")).toMatchObject({ cases: "dev-baseline", workers: 3, budgets: [60, 90, 120], maximumTimeSec: 180, holdoutSec: 15 });
    expect(parse(["--budgets", "90,60", "--workers", "1", "--output", "/tmp/local-run"], "/workspace").budgets).toEqual([60, 90]);
    for (const args of [["--workers", "0"], ["--workers", "5"], ["--workers"], ["--maximum-time", "301"],
      ["--holdout", "9"], ["--holdout", "31"], ["--budgets", "60,60"], ["--budgets", "NaN"],
      ["--maximum-time", "60"], ["--output", "data/model-releases"], ["--unknown", "x"]])
      expect(() => parse(args, "/workspace")).toThrow();
  });
  it("declares fifteen independent cases including fractional and asynchronous forcing", async () => {
    const matrix = await cases(process.cwd());
    expect(matrix).toHaveLength(15); expect(new Set(matrix.map(c => c.caseId)).size).toBe(15);
    expect(matrix.slice(0, 5).filter(c => c.sourcePresetId !== null)).toHaveLength(4);
    const fractional = matrix.find(c => c.caseId === "pcv-hr83.3-rr13.7")!.fixture;
    expect(fractional.hemodynamicResearchInputs.heartRateBpm).toBe(83.3);
    expect(fractional.cardiorespiratory.respiratory.ventilator.respiratoryRatePerMin).toBe(13.7);
    const effort = matrix.find(c => c.caseId === "pcv-plus-effort-rr12-15.3")!.fixture.cardiorespiratory.respiratory;
    expect(effort.ventilator.mode).toBe("pcv"); expect(effort.muscle.amplitudeCmH2O).toBeGreaterThan(0);
    expect(effort.muscle.respiratoryRatePerMin).not.toBe(effort.ventilator.respiratoryRatePerMin);
  });
  it("does not miss an immediate post-candidate transient that returns before the final holdout window", () => {
    const reference = window(50), early = window(60), late = window(70);
    const changed = { ...early, means: { ...early.means, mapMmHg: 110 } };
    const result = holdout(reference, [changed, late], 20);
    expect(result.complete).toBe(true); expect(result.passed).toBe(false);
    expect(result.comparisons[0]!.worstComparison.score).toBeGreaterThan(1);
    expect(result.comparisons[1]!.worstComparison.score).toBe(0);
    expect(result.maximumNormalizedChange).toBe(result.comparisons[0]!.worstComparison.score);
    expect(holdout(reference, [early], 20)).toMatchObject({ complete: false, passed: false });
    expect(() => holdout(reference, [late], 20)).toThrow(/contiguous/);
  });
  it("uses the same pleural envelope meaning as readiness without hiding reported raw mean changes", () => {
    const reference = window(50), next = window(60);
    const phaseClipped = { ...next, means: { ...next.means, pleuralPressureCmH2O: 2 } };
    const result = holdout(reference, [phaseClipped], 10);
    expect(result.passed).toBe(true);
    expect(result.comparisons[0]!.changes.pleuralPressureCmH2O).toEqual({ meanDelta: 2, spanDelta: 0, envelopeMidpointDelta: 0 });
  });
});

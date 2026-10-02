import { parentPort, workerData } from "node:worker_threads";
import { CardiorespiratorySessionV1 } from "@/engine/cardiorespiratory/CardiorespiratorySessionV1";
import { selectHotPathIntegrityTierV1 } from "@/engine/hotPathIntegrityTierV1";
import { CardiorespiratoryStartupMonitorV1, cardiorespiratoryStartupRatesV1, readCardiorespiratoryStartupSampleV1,
  compareCardiorespiratoryStartupWindowsV1,
  DEFAULT_CARDIORESPIRATORY_STARTUP_POLICY_V1, CARDIORESPIRATORY_STARTUP_METRICS_V1 as metrics,
  type CardiorespiratoryStartupAssessmentV1 as Assessment, type CardiorespiratoryStartupWindowV1 as Window } from
  "@/analysis/methods/cardiorespiratory/CardiorespiratoryStartupReadinessV1";
import type { CardiorespiratoryStartupCalibrationCaseV1 as Case } from "./CardiorespiratoryStartupCalibrationCasesV1";

type Holdout = Readonly<{ durationSec: number; complete: boolean; passed: boolean; maximumNormalizedChange: number;
  comparisons: readonly Readonly<{ durationSec: number; worstComparison: NonNullable<Assessment["worstComparison"]>;
    changes: Readonly<Record<string, { meanDelta: number; spanDelta: number; envelopeMidpointDelta: number }>>; future: Window }>[] }>;
type Check = { budgetSec: number; checkedAtSec: number; ready: boolean; worstComparison: Assessment["worstComparison"];
  reference: Window; holdoutPassed: boolean | null; holdout: Holdout | null };
export type CardiorespiratoryStartupCalibrationResultV1 = Readonly<{
  caseId: string; status: "completed" | "failed" | "wall-budget-exceeded"; error: string | null;
  elapsedSec: number | null; wallTimeSec: number; integrationWallSec: number | null; observerWallSec: number | null;
  earliestReadySec: number | null; earliestReadyHoldout: Holdout | null; earliestReadyWindow: Window | null;
  budgetChecks: readonly Check[]; firstReadyAfterLastBudgetSec: number | null;
  windows: readonly Readonly<{ assessment: Omit<Assessment, "windows">; window: Window }>[];
  maximumGasResidualMol: number | null; finalAssessment: Assessment | null;
}>;
type Input = Readonly<{ case: Case; budgets: readonly number[]; maximumTimeSec: number; holdoutSec: number; wallBudgetSec: number }>;

/** Every complete post-candidate window is checked, including a transient
 * that subsequently returns to its candidate level. Shared comparison policy
 * keeps gas projection and forced-pressure envelope meaning identical. */
export function evaluateCardiorespiratoryStartupHoldoutV1(reference: Window, futures: readonly Window[], minimumDurationSec: number): Holdout {
  let previousEnd = reference.endTimeSec;
  if (!Number.isFinite(minimumDurationSec) || minimumDurationSec <= 0) throw new Error("Invalid holdout duration");
  const comparisons = futures.map(future => {
    if (Math.abs(future.startTimeSec - previousEnd) > 1e-7) throw new Error("Holdout windows must be contiguous after the candidate");
    previousEnd = future.endTimeSec;
    const changes = Object.fromEntries(metrics.map(k => [k, {
      meanDelta: future.means[k] - reference.means[k],
      spanDelta: future.maxima[k] - future.minima[k] - reference.maxima[k] + reference.minima[k],
      envelopeMidpointDelta: (future.maxima[k] + future.minima[k] - reference.maxima[k] - reference.minima[k]) / 2,
    }]));
    return { durationSec: future.endTimeSec - reference.endTimeSec,
      worstComparison: compareCardiorespiratoryStartupWindowsV1(reference, future), changes, future };
  });
  const durationSec = previousEnd - reference.endTimeSec, complete = durationSec >= minimumDurationSec - 1e-7;
  const maximumNormalizedChange = Math.max(0, ...comparisons.map(c => c.worstComparison.score));
  return { durationSec, complete, passed: complete && maximumNormalizedChange <= 1, maximumNormalizedChange, comparisons };
}
function gasResidual(session: CardiorespiratorySessionV1): number {
  const state = session.cardiorespiratoryState(), l = state.ledger;
  const total = [...Object.values(state.blood), state.respiratory.conductingGasMol, ...state.respiratory.unitGasMol,
    state.systemic.amount, state.myocardium.amount].reduce((sum, a) => ({ o2: sum.o2 + a.o2Mol, co2: sum.co2 + a.co2Mol }), { o2: 0, co2: 0 });
  return Math.max(Math.abs(total.o2 - l.initialO2Mol - l.boundaryO2Mol + l.consumedO2Mol - l.interventionO2Mol),
    Math.abs(total.co2 - l.initialCo2Mol - l.boundaryCo2Mol - l.producedCo2Mol - l.interventionCo2Mol));
}
export function runCardiorespiratoryStartupCalibrationCaseV1(input: Input): CardiorespiratoryStartupCalibrationResultV1 {
  selectHotPathIntegrityTierV1("hot-path-lean");
  const wall = performance.now();
  let session = CardiorespiratorySessionV1.create(input.case.fixture);
  if (input.case.seed) session = session.forkSettlementSeedV1(input.case.seed);
  const startTimeSec = session.currentAcceptedClock().acceptedTimeSec;
  // Zero removes only the policy's waiting-time floor so the empirical first
  // guard pass can be measured. Every scientific/UX observable limit is copied
  // unchanged, and each proposed budget is checked independently below.
  const monitor = new CardiorespiratoryStartupMonitorV1({ startTimeSec, rates: cardiorespiratoryStartupRatesV1(input.case.fixture),
    contextKey: input.case.caseId, policy: { ...DEFAULT_CARDIORESPIRATORY_STARTUP_POLICY_V1, standardWarmupSec: 0,
      maximumExtensionSec: input.maximumTimeSec } });
  let status: CardiorespiratoryStartupCalibrationResultV1["status"] = "completed", error: string | null = null;
  let integrationWallSec = 0, observerWallSec = 0, maximumGasResidualMol = gasResidual(session);
  let earliestReadySec: number | null = null, earliestReadyWindow: Window | null = null, earliestReadyHoldout: Holdout | null = null;
  let firstReadyAfterLastBudgetSec: number | null = null;
  const windows: { assessment: Omit<Assessment, "windows">; window: Window }[] = [], budgetChecks: Check[] = [];
  const lastBudget = Math.max(...input.budgets), window = monitor.windowDurationSec;
  const holdoutDuration = Math.ceil(input.holdoutSec / window) * window;
  try {
    const limit = Math.ceil((input.maximumTimeSec + holdoutDuration) / .01);
    for (let ordinal = 1; ordinal <= limit; ordinal++) {
      if ((performance.now() - wall) / 1000 > input.wallBudgetSec) { status = "wall-budget-exceeded"; break; }
      let before = performance.now(); session.advanceToPresentationTime(startTimeSec + ordinal * .01);
      integrationWallSec += (performance.now() - before) / 1000;
      before = performance.now(); const completed = monitor.observe(readCardiorespiratoryStartupSampleV1(session));
      observerWallSec += (performance.now() - before) / 1000;
      if (!completed) continue;
      const assessment = monitor.assessment(), current = assessment.windows.at(-1)!;
      const { windows: _allWindows, ...summary } = assessment;
      windows.push({ assessment: summary, window: current });
      maximumGasResidualMol = Math.max(maximumGasResidualMol, gasResidual(session));
      if (!Number.isFinite(maximumGasResidualMol) || maximumGasResidualMol > 1e-10) throw new Error("Independent gas ledger failed");
      const elapsed = assessment.elapsedSec, ready = assessment.status === "ready";
      if (ready && earliestReadySec === null && elapsed <= input.maximumTimeSec + 1e-7) { earliestReadySec = elapsed; earliestReadyWindow = current; }
      if (ready && firstReadyAfterLastBudgetSec === null && elapsed >= lastBudget - 1e-7 && elapsed <= input.maximumTimeSec + 1e-7)
        firstReadyAfterLastBudgetSec = elapsed;
      for (const budgetSec of input.budgets) if (elapsed >= budgetSec - 1e-7 && !budgetChecks.some(c => c.budgetSec === budgetSec))
        budgetChecks.push({ budgetSec, checkedAtSec: elapsed, ready: ready && elapsed <= input.maximumTimeSec + 1e-7,
          worstComparison: assessment.worstComparison, reference: current, holdoutPassed: null, holdout: null });
      for (const check of budgetChecks) if (!check.holdout?.complete && elapsed > check.checkedAtSec + 1e-7) {
        check.holdout = evaluateCardiorespiratoryStartupHoldoutV1(check.reference,
          [...(check.holdout?.comparisons.map(c => c.future) ?? []), current], holdoutDuration);
        check.holdoutPassed = check.holdout.complete ? check.ready && check.holdout.passed : null;
      }
      if (earliestReadyWindow && !earliestReadyHoldout?.complete && elapsed > earliestReadySec! + 1e-7)
        earliestReadyHoldout = evaluateCardiorespiratoryStartupHoldoutV1(earliestReadyWindow,
          [...(earliestReadyHoldout?.comparisons.map(c => c.future) ?? []), current], holdoutDuration);
      const target = firstReadyAfterLastBudgetSec ?? input.maximumTimeSec;
      if (elapsed >= target + holdoutDuration - 1e-7 && budgetChecks.every(c => c.holdout?.complete)) break;
    }
  } catch (e) { status = "failed"; error = e instanceof Error ? e.message : String(e); }
  return { caseId: input.case.caseId, status, error, elapsedSec: session.currentAcceptedClock().acceptedTimeSec - startTimeSec,
    wallTimeSec: (performance.now() - wall) / 1000, integrationWallSec, observerWallSec,
    earliestReadySec, earliestReadyWindow, earliestReadyHoldout, budgetChecks, firstReadyAfterLastBudgetSec,
    windows, maximumGasResidualMol, finalAssessment: monitor.assessment() };
}
if (parentPort && workerData?.kind === "cardiorespiratory-startup-calibration-job-v1")
  parentPort.postMessage(runCardiorespiratoryStartupCalibrationCaseV1(workerData as Input));

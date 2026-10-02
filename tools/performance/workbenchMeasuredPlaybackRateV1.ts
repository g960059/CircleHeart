import type { Page } from "@playwright/test";
import { WORKBENCH_MINIMUM_PLAYBACK_RATE_V3, WORKBENCH_MAXIMUM_PLAYBACK_RATE_V3, WORKBENCH_PLAYBACK_RATE_STEP_V3 } from "@/components/workbench/runtime/WorkbenchGroupTimeConductorV3";
import type { WorkbenchPerformanceDiagnosticsApiV3 } from "@/components/workbench/runtime/WorkbenchPerformanceDiagnosticsV3";

type DiagnosticWindow = Window & typeof globalThis & { __circleHeartWorkbenchPerfV3: WorkbenchPerformanceDiagnosticsApiV3 };

export function validateMeasuredPlaybackRateV1(value: number): number {
  if (!Number.isFinite(value) || value < WORKBENCH_MINIMUM_PLAYBACK_RATE_V3 || value > WORKBENCH_MAXIMUM_PLAYBACK_RATE_V3
    || Math.abs(value / WORKBENCH_PLAYBACK_RATE_STEP_V3 - Math.round(value / WORKBENCH_PLAYBACK_RATE_STEP_V3)) > 1e-9) {
    throw new Error(`--playback-rate must be ${WORKBENCH_MINIMUM_PLAYBACK_RATE_V3}..${WORKBENCH_MAXIMUM_PLAYBACK_RATE_V3} in ${WORKBENCH_PLAYBACK_RATE_STEP_V3} steps`);
  }
  return value;
}

/** Follow the real control and measured capacity; a requested target is never
 * injected into the conductor or substituted for the actual selected value. */
export async function selectMeasuredPlaybackRateV1(page: Page, targetRate: number) {
  validateMeasuredPlaybackRateV1(targetRate);
  const maximumReadinessWaitMs = 60_000, startedAt = performance.now();
  const trigger = page.getByTestId("v3-playback-rate-trigger"), slider = page.getByTestId("v3-playback-rate-slider");
  const observations: { elapsedMs: number; sliderMaximumRate: number; measuredSafeRate: number | null; selectedRate: number }[] = [];
  let attempts = 0;
  while (performance.now() - startedAt < maximumReadinessWaitMs) {
    const timeout = Math.max(1, Math.min(5000, maximumReadinessWaitMs - (performance.now() - startedAt)));
    await trigger.click({ timeout });
    const sliderMaximumRate = Number(await slider.getAttribute("max"));
    const measuredSafeRate = await page.evaluate(() =>
      (window as DiagnosticWindow).__circleHeartWorkbenchPerfV3.snapshot().values["scheduler.group.safe-playback-rate"]?.latest ?? null);
    // During calibration the UI temporarily offers the global maximum. Wait
    // for actual measured capacity before accelerating above ordinary 1x.
    const availableRate = Math.min(sliderMaximumRate, Math.max(1, measuredSafeRate ?? 1));
    const nextRate = Math.min(targetRate, availableRate);
    const previousRate = Number(await slider.inputValue());
    const steps = Math.round((nextRate - previousRate) / WORKBENCH_PLAYBACK_RATE_STEP_V3);
    await slider.focus({ timeout });
    for (let step = 0; step < Math.abs(steps); step++) await slider.press(steps > 0 ? "ArrowRight" : "ArrowLeft", { timeout });
    const selectedRate = Number(await slider.inputValue());
    if (selectedRate !== nextRate) throw new Error(`Playback UI selected ${selectedRate}x instead of available ${nextRate}x`);
    await trigger.click({ timeout });
    observations.push({ elapsedMs: performance.now() - startedAt, sliderMaximumRate, measuredSafeRate, selectedRate });
    attempts++;
    if (selectedRate === targetRate) return { mode: "target-with-measured-ui-ramp" as const, targetRate,
      maximumReadinessWaitMs, readinessWaitMs: performance.now() - startedAt, attempts, observations };
    if (await page.getByTestId("workbench-calculation-stopped").count()) throw new Error("Calculation stopped while waiting for target playback capacity");
    const remaining = maximumReadinessWaitMs - (performance.now() - startedAt);
    if (remaining > 0) await page.waitForTimeout(Math.min(1000, remaining));
  }
  throw new Error(`Playback target ${targetRate}x was not available within ${maximumReadinessWaitMs} ms; ${JSON.stringify(observations.at(-1))}`);
}

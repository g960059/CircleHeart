import { expect, test } from "@playwright/test";

for (const mode of ["worker", "main", "worker-failure"] as const) {
  test(`@desktop live sweep ${mode} paints after resize, pause and input epoch change`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    if (mode === "worker-failure") {
      await page.route("**/*SweepRenderWorkerV1*", route => route.abort("failed"));
    }
    await page.goto(`/ja/dev/model-lab?model=cardiorespiratory&workbenchSweepRenderer=${mode === "main" ? "main" : "worker"}`);
    const root = page.getByTestId("v3-dockview-workbench");
    const pane = page.locator('[data-chart-kind="sweeping-waveform-v3"]').filter({ visible: true }).first();
    await expect(pane).toHaveAttribute("data-render-backend", mode === "worker" ? "worker" : "main");
    const canvas = pane.locator("canvas");
    await expect.poll(async () => Number(await canvas.getAttribute("data-render-sequence"))).toBeGreaterThan(2);
    await expect.poll(async () => Number(await root.getAttribute("data-model-time-sec"))).toBeGreaterThan(.5);
    await page.getByTestId("v3-playback-toggle").click();
    await page.waitForTimeout(100);
    const pausedTime = Number(await root.getAttribute("data-model-time-sec"));
    const sequence = Number(await canvas.getAttribute("data-render-sequence"));
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect.poll(async () => Number(await canvas.getAttribute("data-render-sequence"))).toBeGreaterThan(sequence);
    expect(Number(await root.getAttribute("data-model-time-sec"))).toBe(pausedTime);
    const epoch = Number(await root.getAttribute("data-input-epoch"));
    const hr = page.getByRole("slider", { name: "HR", exact: true }).first();
    await hr.focus(); await hr.press("ArrowRight");
    await expect.poll(async () => Number(await root.getAttribute("data-input-epoch"))).toBeGreaterThan(epoch);
    if (mode === "worker") {
      // A duplicated edited Scenario retains epoch-N display history while its
      // new exact session starts at epoch 0. Both are valid accepted samples.
      const scenarios = page.getByRole("region", { name: "Scenarios" });
      await scenarios.getByRole("button", { name: "Scenarioメニュー: baseline", exact: true }).click();
      await page.getByRole("menu", { name: "Scenarioメニュー: baseline", exact: true }).getByRole("menuitem", { name: "複製" }).click();
      await expect(scenarios.getByRole("button", { name: /Scenarioメニュー:/ })).toHaveCount(2);
    }
    const afterEdit = Number(await canvas.getAttribute("data-render-sequence"));
    await page.getByTestId("v3-playback-toggle").click();
    await expect.poll(async () => Number(await root.getAttribute("data-model-time-sec"))).toBeGreaterThan(pausedTime + .2);
    await expect.poll(async () => Number(await canvas.getAttribute("data-render-sequence"))).toBeGreaterThan(afterEdit);
    await expect(pane).toHaveAttribute("data-render-backend", mode === "worker" ? "worker" : "main");
    await expect(page.getByTestId("workbench-calculation-stopped")).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}

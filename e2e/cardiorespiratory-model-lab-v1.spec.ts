import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

const prepared = JSON.parse(readFileSync(new URL("../data/model-releases/cardiorespiratory-dev-v1/bundle.json", import.meta.url), "utf8")).prepared;

test("@desktop cardiorespiratory Model Lab runs its own Worker, renders XY data and applies a warm PEEP edit", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/rest/v1/rpc/save_experiment_v1", route => route.abort("blockedbyclient"));
  await page.goto("/ja/dev/model-lab?model=cardiorespiratory", { waitUntil: "domcontentloaded" });
  const root = page.getByTestId("v3-dockview-workbench");
  await expect(root).toHaveAttribute("data-model-id", "circleheart.cardiorespiratory-dev-v1");
  await expect(page.getByTestId("cardiorespiratory-dev-notice")).toBeVisible();
  await expect(page.getByTestId("v3-save-experiment")).toHaveCount(0);
  await expect.poll(async () => Number(await root.getAttribute("data-model-time-sec"))).toBeGreaterThan(prepared.defaultCheckpoint.acceptedTimeSec + .3);
  await page.getByTestId("v3-playback-toggle").click();
  const graphs = page.getByRole("region", { name: "グラフエリア" });
  await graphs.getByText("呼吸圧・肺気量ループ", { exact: true }).click();
  const xy = page.getByTestId("generic-xy-graph").filter({ visible: true });
  await expect(xy).toBeVisible();
  const xyCanvas = xy.getByTestId("generic-xy-canvas");
  await expect.poll(async () => Number(await xyCanvas.getAttribute("data-display-point-count"))).toBeGreaterThan(1);
  // The Canvas retains accessible naming and paints axes plus the live trajectory.
  expect(await xyCanvas.evaluate(canvas => {
    const element = canvas as HTMLCanvasElement, context = element.getContext("2d")!;
    const legend = element.closest('[data-testid="generic-xy-graph"]')!.querySelector<HTMLElement>('span[style]')!;
    const color = getComputedStyle(legend).color.match(/[\d.]+/g)!.slice(0, 3).map(Number);
    const pixels = context.getImageData(0, 0, element.width, element.height).data;
    let painted = 0;
    for (let offset = 0; offset < pixels.length; offset += 4) {
      if (pixels[offset + 3] > 32 && color.every((value, channel) => Math.abs(pixels[offset + channel] - value) <= 5)) painted++;
    }
    return painted;
  })).toBeGreaterThan(20);
  expect(Number(await xy.getAttribute("data-x-maximum"))).toBeGreaterThan(1);
  expect(Number(await xy.getAttribute("data-x-maximum"))).toBeLessThan(20);
  await graphs.getByText("フローボリュームループ", { exact: true }).click();
  await expect(graphs.getByRole("img", { name: /L\/s/ })).toBeVisible();
  const controls = page.getByRole("region", { name: "コントロールエリア" });
  await controls.getByText("人工呼吸・自発努力", { exact: true }).click();
  const peep = controls.getByRole("slider", { name: "PEEP", exact: true });
  await expect(peep).toHaveValue("5");
  const epoch = Number(await root.getAttribute("data-input-epoch")), time = Number(await root.getAttribute("data-model-time-sec"));
  await peep.focus(); await peep.press("ArrowRight");
  await expect.poll(async () => Number(await root.getAttribute("data-input-epoch"))).toBe(epoch + 1);
  await expect(peep).toHaveValue("6");
  expect(Number(await root.getAttribute("data-model-time-sec"))).toBeGreaterThanOrEqual(time);
  await page.getByTestId("v3-playback-toggle").click();
  await expect.poll(async () => Number(await root.getAttribute("data-model-time-sec"))).toBeGreaterThan(time + .2);
  await page.getByTestId("v3-playback-toggle").click();
  await expect(page.getByTestId("workbench-calculation-stopped")).toHaveCount(0);
  expect(errors).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath("cardiorespiratory-model-lab.png"), fullPage: true });
});

test("@desktop cardiorespiratory mechanical analysis runs through its artifact Worker without advancing the live capture", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/ja/dev/model-lab?model=cardiorespiratory", { waitUntil: "domcontentloaded" });
  const root = page.getByTestId("v3-dockview-workbench");
  await expect.poll(async () => Number(await root.getAttribute("data-model-time-sec"))).toBeGreaterThan(prepared.defaultCheckpoint.acceptedTimeSec + .3);
  await page.getByTestId("v3-playback-toggle").click();
  const time = await root.getAttribute("data-model-time-sec");
  const graphs = page.getByRole("region", { name: "グラフエリア" });
  await graphs.getByRole("button", { name: "Paneを追加" }).first().click();
  await page.getByRole("dialog", { name: "グラフを追加" })
    .getByRole("button", { name: "体循環 Guyton / Starling（CVP）", exact: true }).click();
  const structural = page.locator('[data-chart-kind="guyton-starling-structural-orientation-v3"][data-circulation-side="right"]');
  await expect.poll(async () => Number(await structural.getAttribute("data-starling-completed-points")), { timeout: 90_000 })
    .toBeGreaterThan(1);
  await expect(root).toHaveAttribute("data-model-time-sec", time!);
  await expect(page.getByTestId("workbench-calculation-stopped")).toHaveCount(0);
  expect(errors).toEqual([]);
});


test("@desktop cardiorespiratory default and four presets load offline startup checkpoints", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/ja/dev/model-lab?model=cardiorespiratory", { waitUntil: "domcontentloaded" });
  const root = page.getByTestId("v3-dockview-workbench");
  await expect.poll(async () => Number(await root.getAttribute("data-model-time-sec"))).toBeGreaterThanOrEqual(prepared.defaultCheckpoint.acceptedTimeSec);
  await page.getByTestId("v3-playback-toggle").click();
  await expect(page.getByTestId("cardiorespiratory-dev-notice")).toContainText("定量的妥当性は未検証");
  const manager = page.getByTestId("workbench-scenario-manager-v3");
  for (const preset of prepared.presets) {
    await manager.getByRole("button", { name: "Presetから追加", exact: true }).click();
    const picker = page.getByTestId("workbench-preset-picker-v3");
    await picker.locator(`[data-preset-id="${preset.presetId}"]`).getByRole("button").first().click();
    await expect(picker).toHaveCount(0);
    await expect.poll(async () => Number(await root.getAttribute("data-model-time-sec"))).toBe(preset.capture.checkpoint.acceptedTimeSec);
    await expect(manager.getByTitle(preset.title, { exact: true })).toHaveAttribute("aria-pressed", "true");
  }
  await expect(manager.locator(".workbench-scenario-row")).toHaveCount(5);
  await expect(page.getByTestId("workbench-calculation-stopped")).toHaveCount(0);
  expect(errors).toEqual([]);
});

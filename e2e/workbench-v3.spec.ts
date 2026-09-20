import { expect, test, type Locator, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";

const defaultRegistryAdmissionLock = JSON.parse(readFileSync(new URL(
  "../data/model-releases/standard74/publication.json",
  import.meta.url,
), "utf8")) as Readonly<{ modelId: string }>;

const DEFAULT_EXACT_MODEL_ID =
  defaultRegistryAdmissionLock.modelId;
const UUID_RESOURCE_ID =
  "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const EXPERIMENT_RESOURCE_ID =
  `(?:${UUID_RESOURCE_ID}|experiment-[A-Za-z0-9_-]+)`;

async function expectFormalPvaProgressOrResult(
  pvCanvas: Locator,
): Promise<void> {
  await expect.poll(async () => pvCanvas.evaluate((element) => {
    if (Number(element.getAttribute("data-pva-result-count")) > 0) {
      return true;
    }
    // Actual current-input preview geometry, not a busy indicator or retained history.
    return Number(element.getAttribute("data-pva-drawing-count"))
      > Number(element.getAttribute("data-pva-retained-drawing-count"));
  }), { timeout: 90_000 }).toBe(true);
}

test.beforeEach(async ({ page }, testInfo) => {
  if (testInfo.title.includes("@preset-picker") || testInfo.title.includes("@pv-history")) {
    // This regression persists only to the isolated browser store. Do not
    // write test experiments to a developer's configured remote repository.
    await page.route("**/rest/v1/rpc/save_experiment_v1", route => route.abort("blockedbyclient"));
  }
  if (testInfo.title.includes("selector stays")) {
    await page.goto("/ja/me/experiments");
    return;
  }
  if (testInfo.title.includes("baseline duplication stays independent")) {
    // Keep this liveness regression reproducible on high-core developer Macs:
    // two live lanes leave one serialized background slot on the supported
    // four-logical-core tier, matching the constrained CI/device contract.
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "hardwareConcurrency", {
        configurable: true,
        get: () => 4,
      });
    });
  }
  const modelLab = testInfo.title.includes("@model-lab");
  await page.goto(modelLab
    ? "/ja/dev/model-lab"
    : "/ja/experiments/new");
  const root = page.getByTestId("v3-dockview-workbench");
  await expect(root).toBeVisible();
  await expect(root).toHaveAttribute(
    "data-model-id",
    DEFAULT_EXACT_MODEL_ID,
  );
  await expect(
    page.getByTestId("workbench-simulation-info-trigger-v3"),
  ).toBeVisible();
  await expect.poll(() => acceptedRevision(page)).toBeGreaterThan(10);
});

test("@desktop selector stays ID-less until the first explicit Save", async ({
  page,
}) => {
  await expect(page.getByTestId("workbench-selector-v3")).toBeVisible();
  await page.getByTestId("create-workbench-v3").click();
  await expect(page).toHaveURL(/\/ja\/experiments\/new$/);
  const root = page.getByTestId("v3-dockview-workbench");
  await expect(root).toBeVisible();
  await expect(root).toHaveAttribute("data-model-id", DEFAULT_EXACT_MODEL_ID);
  await expect(page.getByTestId("workbench-unavailable-model-v3")).toHaveCount(
    0,
  );
  expect(page.url()).not.toContain(encodeURIComponent(DEFAULT_EXACT_MODEL_ID));

  const title = page.getByTestId("workbench-experiment-title-v3");
  await title.fill("Acute afterload comparison");
  await title.press("Enter");
  await expect(title).not.toBeFocused();

  await page.getByRole("button", { name: "保存", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "保存済み", exact: true }),
  ).toBeVisible({ timeout: 30_000 });
  await expect(page).toHaveURL(new RegExp(
    `/ja/experiments/${EXPERIMENT_RESOURCE_ID}$`,
  ));

  // The first Save replaces /new but must preserve the management entry.
  await page.getByTestId("workbench-back-v1").click();
  await expect(page).toHaveURL(/\/ja\/me\/experiments$/);
  const experimentRow = page.getByRole("listitem").filter({
    hasText: "Acute afterload comparison",
  });
  await expect(experimentRow).toContainText("未公開");
  await expect(experimentRow.getByRole("link", { name: "編集", exact: true })).toBeVisible();
  await expect(experimentRow.getByRole("button", {
    name: "シミュレーションを削除",
  })).toBeVisible();
  await expect(page.getByRole("button", { name: /書き出/ })).toHaveCount(0);
});

test("@desktop current model inherits the complete analysis Surface", async ({
  page,
}, testInfo) => {
  const root = page.getByTestId("v3-dockview-workbench");
  const graphArea = page.getByRole("region", { name: "グラフエリア" });
  const graphGroups = graphArea.locator(".dv-groupview");
  const pvTab = graphArea.locator(".dv-tab").filter({ hasText: "PV loop" });
  const guytonTab = graphArea
    .locator(".dv-tab")
    .filter({ hasText: "Systemic Guyton / Starling" });
  const pressureTab = graphArea
    .locator(".dv-tab")
    .filter({ hasText: "Pressure waveforms" });

  await expect(graphGroups).toHaveCount(3);
  await expect(graphArea.locator(".dv-tab")).toHaveCount(3);
  await expect(
    graphArea.getByRole("button", { name: "Paneを追加" }),
  ).toHaveCount(3);
  await expect(pvTab).toHaveClass(/dv-active-tab/);
  await expect(guytonTab).toHaveClass(/dv-active-tab/);
  await expect(pressureTab).toHaveClass(/dv-active-tab/);
  const groupFor = (title: string) => graphGroups.filter({ has: page.locator(".dv-tab").filter({ hasText: title }) });
  const pvBox = await groupFor("PV loop").boundingBox();
  const guytonBox = await groupFor("Systemic Guyton / Starling").boundingBox();
  const pressureBox = await groupFor("Pressure waveforms").boundingBox();
  expect(pvBox && guytonBox && pressureBox).toBeTruthy();
  expect(Math.abs(pvBox!.y - guytonBox!.y)).toBeLessThan(3);
  expect(guytonBox!.x).toBeGreaterThan(pvBox!.x + pvBox!.width - 3);
  expect(Math.abs(pressureBox!.x - guytonBox!.x)).toBeLessThan(3);
  expect(pressureBox!.y).toBeGreaterThan(guytonBox!.y + guytonBox!.height - 3);
  expect(Math.abs(pvBox!.y + pvBox!.height - pressureBox!.y - pressureBox!.height)).toBeLessThan(3);
  expect(pvBox!.width / (pvBox!.width + guytonBox!.width)).toBeCloseTo(0.58, 1);
  await expectDockTabAccent(pvTab.locator(".workbench-dock-tab"));
  await expectDockTabAccent(guytonTab.locator(".workbench-dock-tab"));
  await expectDockTabAccent(pressureTab.locator(".workbench-dock-tab"));

  await graphGroups.first().getByRole("button", { name: "Paneを追加" }).click();
  const addGraphMenu = page.getByRole("dialog", { name: "グラフを追加" });
  await expect(addGraphMenu.locator("[data-graph-option-id]")).toHaveText([
    "PV loop",
    "圧波形",
    "流量波形",
    "体循環 Guyton / Starling（CVP）",
    "肺循環 Guyton / Starling（PCWP）",
  ]);
  await addGraphMenu.getByRole("button", { name: "閉じる", exact: true }).click();
  await expect(addGraphMenu).toBeHidden();

  const pvCanvas = page.locator(
    '[data-chart-kind="pressure-volume-loop-v3"]',
  );
  await expectNonZeroCanvas(pvCanvas);
  await expect(pvCanvas).toHaveAttribute(
    "data-pv-analysis-mode",
    "formal-periodic",
  );
  await expect(pvCanvas).toHaveAttribute(
    "data-pv-relation-semantics",
    "full-load-pressure-envelope-measured-diastolic-locus",
    { timeout: 90_000 },
  );
  // Browser smoke owns worker wiring and at least one settled formal branch,
  // not a wall-clock completion SLA for the full family. Exact integration
  // tests own the complete relation and pressure-volume loops.
  await expectFormalPvaProgressOrResult(pvCanvas);
  await page.screenshot({ path: testInfo.outputPath("clinical-workbench-layout.png") });

  await pressureTab.locator(".workbench-dock-tab").click();
  await expect(pressureTab).toHaveClass(/dv-active-tab/);
  await expectNonZeroCanvas(
    page.locator('[data-chart-kind="sweeping-waveform-v3"]'),
  );
  await expect(graphArea.getByRole("button", { name: "AoPの説明" })).toHaveCount(0);
  const aorticDescription = page.locator('[data-output-id="presentation.pressure-summary.Ao"]').getByRole("button", {
    name: "AoPの説明",
  });
  await expect(aorticDescription).toBeVisible();
  await aorticDescription.hover();
  await expect(page.getByRole("tooltip")).toBeVisible();
  await aorticDescription.click();
  const aorticTooltip = page.getByRole("tooltip");
  await expect(aorticTooltip).toContainText(
    "大動脈圧。1心拍における大動脈基部圧の最大値／最小値",
  );
  await aorticDescription.click();
  await expect(aorticTooltip).toBeHidden();
  await aorticDescription.click();
  await expect(aorticTooltip).toBeVisible();
  await page.keyboard.press("Escape");

  await expect(page.locator('[data-output-id="presentation.pressure-summary.Ao"] .workbench-output-value'))
    .toHaveText(/^\d+\.\d\/\d+\.\d\s*mmHg$/);
  await expect(page.locator('[data-output-id="hemodynamics.pressure.mean.RA"] .workbench-output-value'))
    .toHaveText(/^-?\d+\.\d\s*mmHg$/);
  await expect(page.locator('[data-output-id="hemodynamics.pressure.mean.Ao"]')).toHaveCount(0);

  const controlArea = page.getByRole("region", { name: "コントロールエリア" });
  const heartRate = controlArea.getByRole("slider", { name: "HR" });
  await expect(heartRate).toBeVisible();
  await expect(heartRate).toHaveValue("70");
  await expect(controlArea.getByRole("slider")).toHaveCount(7);
  await expect(
    controlArea.getByRole("slider", { name: "SVR" }),
  ).toBeVisible();

  await expect.poll(() => modelTime(root)).toBeGreaterThan(0.5);
  const playback = page.getByTestId("v3-playback-toggle");
  await playback.click();
  await expect(root).toHaveAttribute("data-playback", "paused");
  const priorEpoch = await inputEpoch(page);
  const priorTime = await modelTime(root);
  const priorRevision = await acceptedRevision(page);
  expect(priorTime).toBeGreaterThan(0.5);
  await heartRate.press("ArrowRight");
  await expect.poll(() => inputEpoch(page)).toBeGreaterThan(priorEpoch);
  await expect.poll(() => modelTime(root)).toBeGreaterThan(priorTime - 0.01);
  await expect.poll(() => acceptedRevision(page)).toBeGreaterThanOrEqual(
    priorRevision,
  );
});

test("@desktop @mobile previous outputs remain visibly stale across controls and mobile tabs", async ({ page }, testInfo) => {
  const root = page.getByTestId("v3-dockview-workbench");
  const mobile = (page.viewportSize()?.width ?? 1440) < 768;
  const taskDeck = page.getByTestId("workbench-mobile-task-deck");
  if (mobile) await taskDeck.getByRole("tab", { name: "出力", exact: true }).click();
  const output = page.locator('[data-output-id="hemodynamics.output.effective-native-left"]');
  await expect(output).toHaveAttribute("data-output-availability", "available");
  await expect(output).toHaveAttribute("data-output-stale", "false");
  const playback = page.getByTestId("v3-playback-toggle");
  await playback.click();
  await expect(root).toHaveAttribute("data-playback", "paused");
  // Drain the bounded already-accepted prefix before remembering the displayed value.
  await expect.poll(async () => {
    const before = await modelTime(root);
    await page.waitForTimeout(150);
    return Math.abs((await modelTime(root)) - before);
  }).toBeLessThanOrEqual(0.002);
  const visibleNumber = () => output.locator(".workbench-output-value").evaluate(
    element => element.firstChild?.textContent ?? "",
  );
  const previous = await visibleNumber();
  const currentColor = await output.locator(".workbench-output-value")
    .evaluate(element => getComputedStyle(element).color);
  const previousEpoch = await inputEpoch(page);
  if (mobile) await taskDeck.getByRole("tab", { name: "コントロール", exact: true }).click();
  await page.getByRole("slider", { name: "HR", exact: true }).press("ArrowRight");
  await expect.poll(() => inputEpoch(page)).toBeGreaterThan(previousEpoch);
  if (mobile) await taskDeck.getByRole("tab", { name: "出力", exact: true }).click();
  await expect(output).toHaveAttribute("data-output-stale", "true");
  await expect(output).toHaveAttribute("data-output-availability", "not-evaluated-at-accepted-state");
  expect(await visibleNumber()).toBe(previous);
  expect(await output.locator(".workbench-output-value")
    .evaluate(element => getComputedStyle(element).color)).not.toBe(currentColor);
  await output.scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath("stale-outputs.png") });
  await output.getByTestId("workbench-item-description-trigger-v3").click();
  await expect(page.getByRole("tooltip")).toContainText("前回の測定値");
  await expect(page.getByRole("tooltip")).toHaveCSS("white-space", "pre-line");
  await page.keyboard.press("Escape");
  await playback.click();
  await expect(output).toHaveAttribute("data-output-stale", "false");
  await expect(output).toHaveAttribute("data-output-availability", "available");
  expect(await visibleNumber()).not.toBe("—");
  await expect(root).toHaveAttribute("data-playback", "playing");
});

test("@desktop item tooltips wait for deliberate hover and cancel when the pointer leaves", async ({ page }) => {
  await page.clock.install();
  await page.clock.pauseAt(new Date());
  const aop = page.locator('[data-output-id="presentation.pressure-summary.Ao"]').getByRole("button");
  const cvp = page.locator('[data-output-id="hemodynamics.pressure.mean.RA"]').getByRole("button");
  const tooltip = page.getByRole("tooltip");

  await aop.hover();
  await page.clock.runFor(300);
  await expect(tooltip).toBeHidden();
  await page.mouse.move(0, 0);
  await page.clock.runFor(600);
  await expect(tooltip).toBeHidden();

  for (const label of [aop, cvp]) {
    await label.hover();
    await page.clock.runFor(499);
    await expect(tooltip).toBeHidden();
    await page.clock.runFor(1);
    await expect(tooltip).toBeVisible();
    await page.mouse.move(0, 0);
    await page.clock.runFor(130);
    await expect(tooltip).toBeHidden();
  }

  await aop.hover();
  await page.clock.runFor(100);
  await aop.click();
  await expect(tooltip).toBeVisible();
  await page.keyboard.press("Escape");
  await page.clock.runFor(600);
  await expect(tooltip).toBeHidden();
  await cvp.focus();
  await expect(tooltip).toBeVisible();
});

test("@desktop @mobile clinical item labels disclose meaning without changing parameter values", async ({ page }, testInfo) => {
  const mobile = (page.viewportSize()?.width ?? 1440) < 768;
  if (mobile) await page.getByTestId("workbench-mobile-task-deck").getByRole("tab", { name: "コントロール", exact: true }).click();
  const heartRate = page.getByRole("slider", { name: "HR", exact: true });
  const before = await heartRate.inputValue();
  const explanation = page.locator(".workbench-control-row").filter({ has: heartRate }).getByRole("button", { name: "HRの説明", exact: true });
  await explanation.click();
  await expect(page.getByRole("tooltip")).toContainText("心拍数");
  await expect(heartRate).toHaveValue(before);
  await page.screenshot({ path: testInfo.outputPath("clinical-control-description.png") });
  await page.keyboard.press("Escape");
  await expect(page.getByRole("tooltip")).toBeHidden();

  if (mobile) await page.getByTestId("workbench-mobile-graph-view-rail").getByRole("tab", { name: "Pressure waveforms", exact: true }).click();
  {
    const legend = page.locator('[data-chart-kind="sweeping-waveform-v3"]').getByRole("button", { name: "AoP", exact: true });
    await legend.focus();
    await expect(page.getByRole("tooltip")).toContainText("大動脈弁直後");
    await expect(legend).toHaveAttribute("aria-pressed", "false");
    await legend.press("Enter");
    await expect(legend).toHaveAttribute("aria-pressed", "true");
    await legend.press("Enter");
    await expect(legend).toHaveAttribute("aria-pressed", "false");
    await page.screenshot({ path: testInfo.outputPath("clinical-graph-description.png") });
  }
  if (!mobile) {
    await page.keyboard.press("Escape");
    await openPaneSettings(page, "Pressure waveforms");
    const dialog = page.getByTestId("workbench-pane-picker-v3");
    await dialog.getByRole("button", { name: "項目を追加", exact: true }).click();
    await dialog.getByRole("searchbox").fill("肺静脈圧");
    await dialog.getByRole("button", { name: "肺静脈圧の説明", exact: true }).focus();
    await expect(page.getByRole("tooltip")).toContainText("肺から左房");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("tooltip")).toBeHidden();
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  }
});

test("@desktop @mobile @beat-metrics selected beat outputs stay responsive and retain stale values", async ({ page }, testInfo) => {
  const root = page.getByTestId("v3-dockview-workbench");
  const mobile = (page.viewportSize()?.width ?? 1440) < 768;
  const deck = page.getByTestId("workbench-mobile-task-deck");
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  if (mobile) {
    await deck.getByRole("tab", { name: "出力", exact: true }).click();
    await deck.locator('[data-testid="pane-settings-button-v3"]').first().click();
  } else await openPaneSettings(page, "Outputs");
  const settings = page.getByTestId("workbench-pane-picker-v3");
  await settings.getByRole("button", { name: "項目を追加", exact: true }).click();
  const drawer = settings;
  const labels = ["LV ICT", "LV IRT", "LV Tei", "LV +dP/dt", "LV −dP/dt", "RV +dP/dt", "RV −dP/dt"];
  for (const label of labels) {
    await drawer.getByRole("searchbox").fill(label);
    await drawer.getByRole("checkbox", { name: label, exact: true }).check();
  }
  await settings.getByRole("tab", { name: "項目", exact: true }).click();
  for (const label of labels.slice(3)) {
    await settings.getByRole("button", { name: label, exact: true }).click();
    const kind = label.includes("+") ? "maximum" : "minimum";
    await settings.getByRole("combobox", { name: "時間幅", exact: true }).selectOption(`hemodynamics.pressure-rate.${kind}-windowed-10ms.absolute.${label.slice(0, 2)}`);
  }
  await settings.getByRole("button", { name: "適用", exact: true }).click();
  const ids = ["hemodynamics.duration.isovolumic-contraction.flow-event.LV",
    "hemodynamics.duration.isovolumic-relaxation.flow-event.LV", "hemodynamics.index.myocardial-performance.flow-event.LV",
    "hemodynamics.pressure-rate.maximum-windowed-10ms.absolute.LV", "hemodynamics.pressure-rate.minimum-windowed-10ms.absolute.LV",
    "hemodynamics.pressure-rate.maximum-windowed-10ms.absolute.RV", "hemodynamics.pressure-rate.minimum-windowed-10ms.absolute.RV"];
  for (const id of ids) await expect(page.locator(`[data-output-id="${id}"]`)).toHaveAttribute("data-output-availability", "available");
  const ict = page.locator(`[data-output-id="${ids[0]}"]`);
  const playback = page.getByTestId("v3-playback-toggle");
  await playback.click(); await expect(root).toHaveAttribute("data-playback", "paused");
  const number = () => ict.locator(".workbench-output-value").evaluate(element => element.firstChild?.textContent ?? "");
  const prior = await number();
  const epoch = await inputEpoch(page);
  if (mobile) await deck.getByRole("tab", { name: "コントロール", exact: true }).click();
  await page.getByRole("slider", { name: "HR", exact: true }).press("ArrowRight");
  await expect.poll(() => inputEpoch(page)).toBeGreaterThan(epoch);
  if (mobile) await deck.getByRole("tab", { name: "出力", exact: true }).click();
  await expect(ict).toHaveAttribute("data-output-stale", "true");
  expect(await number()).toBe(prior);
  await ict.scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath("beat-metrics-stale.png") });
  await playback.click();
  for (const id of ids) {
    const output = page.locator(`[data-output-id="${id}"]`);
    await expect(output).toHaveAttribute("data-output-stale", "false");
    await expect(output).toHaveAttribute("data-output-availability", "available");
  }
  await ict.getByTestId("workbench-item-description-trigger-v3").click();
  await expect(page.getByRole("tooltip")).toContainText("左室等容性収縮時間");
  await page.keyboard.press("Escape");
  await page.screenshot({ path: testInfo.outputPath("beat-metrics-ready.png") });
  expect(errors).toEqual([]);
});

test("@desktop @mobile @model-lab @prepared-cycle prepared PV results and saved AV timing survive controls", async ({ page }, testInfo) => {
  const mobile = (page.viewportSize()?.width ?? 1440) < 768, errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  const root = page.getByTestId("v3-dockview-workbench"), deck = page.getByTestId("workbench-mobile-task-deck");
  const pv = page.locator("[data-pva-result-count]").first();
  const started = Date.now();
  await expect.poll(async () => Number(await pv.getAttribute("data-pva-result-count")), { timeout: 15_000 }).toBeGreaterThan(0);
  const readyPath = testInfo.outputPath("prepared-baseline-ready.json");
  await writeFile(readyPath, JSON.stringify({ waitAfterWorkbenchMs: Date.now() - started,
    navigationToReadyMs: await page.evaluate(() => performance.now()) }));
  await testInfo.attach("prepared-baseline-ready", { path: readyPath, contentType: "application/json" });
  // The simplified add menu no longer offers a dedicated AV timing pane.
  // The inherited current Surface still owns it in already-authored content.
  const bundle = JSON.parse(readFileSync(new URL("../data/model-releases/standard74/bundle.json", import.meta.url), "utf8"));
  const snapshot = {
    schemaId: "circleheart-studio-experiment-snapshot-v2", snapshotId: "snapshot-saved-av-timing",
    createdAt: "2026-09-16T00:00:00.000Z", surfaceReleaseId: bundle.surface.surfaceReleaseId,
    content: { modelId: bundle.manifest.modelId, surfaceSeriesId: bundle.surface.surfaceSeriesId,
      scenarios: [{ scenarioId: "baseline", label: "baseline", capture: bundle.baseline.capture }],
      surface: {
        graphPanes: [{ paneId: "av-timing", role: "graph", label: "AV timing", order: 0, priority: 0,
          graphId: "hemodynamics.aortic-jet.cycle", scenarioScope: { mode: "visible-scenarios" }, excludedTraces: [], series: [] }],
        controlPanes: [{ paneId: "hr", role: "control", label: "Parameters", order: 0, priority: 0,
          binding: { mode: "active-slot" }, items: [{ controlId: "rhythm.heart-rate-bpm", label: "HR", order: 0, presentation: { kind: "slider" } }] }],
        outputPanes: [], note: { text: "" },
      } },
  };
  await page.addInitScript(snapshot => localStorage.setItem("circleheart.studio.browser-content.v9", JSON.stringify({
    schemaId: "circleheart-studio-browser-content-v9", experiments: [], snapshots: [snapshot], articles: [],
  })), snapshot);
  await page.goto(`/ja/snapshots/${snapshot.snapshotId}`);
  const wave = page.locator('[data-ejection-waveform="true"]').first();
  await expect(wave).toBeVisible();
  await expect(wave.locator('[data-ejection-stale="false"]')).toHaveCount(1);
  await expect(wave).toContainText(/AT \d+ \/ ET \d+ ms/);
  await expectNonZeroCanvas(wave);
  await wave.screenshot({ path: testInfo.outputPath("ejection-ready.png") });
  const playback = page.getByTestId("v3-playback-toggle");
  await playback.click(); await expect(root).toHaveAttribute("data-playback", "paused");
  const before = await wave.innerText(), epoch = await inputEpoch(page);
  if (mobile) await deck.getByRole("tab", { name: "コントロール", exact: true }).click();
  await page.getByRole("slider", { name: "HR", exact: true }).press("ArrowRight");
  await expect.poll(() => inputEpoch(page)).toBeGreaterThan(epoch);
  await expect(wave.locator('[data-ejection-stale="true"]')).toHaveCount(1);
  expect(await wave.innerText()).toContain(before);
  await wave.screenshot({ path: testInfo.outputPath("ejection-stale.png") });
  await playback.click();
  await expect(wave.locator('[data-ejection-stale="false"]')).toHaveCount(1);
  expect(errors).toEqual([]);
});

test("@desktop @mobile @pv-history loop-owned zero-based axes retain auxiliary history without rescaling", async ({ page }, testInfo) => {
  const mobile = (page.viewportSize()?.width ?? 1440) < 768;
  const root = page.getByTestId("v3-dockview-workbench");
  const pv = page.locator('[data-chart-kind="pressure-volume-loop-v3"]').first();
  const starling = page.locator('[data-chart-kind="guyton-starling-structural-orientation-v3"]').first();
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  const selectGraph = async (name: string) => {
    if (mobile) await page.getByTestId("workbench-mobile-graph-view-rail").getByRole("tab", { name, exact: true }).click();
    else await page.getByRole("region", { name: "グラフエリア" }).getByText(name, { exact: true }).click();
  };
  const editGraph = async (name: string) => {
    if (mobile) {
      await page.getByRole("button", { name: `Pane設定: ${name}`, exact: true }).click();
    } else await openPaneSettings(page, name);
    const display = page.getByTestId("workbench-pane-picker-v3").getByRole("tab", { name: "表示", exact: true });
    if (await display.count()) await display.click();
  };
  await expect.poll(async () => Number(await pv.getAttribute("data-pva-result-count")), { timeout: 15_000 }).toBeGreaterThan(0);
  await expect.poll(async () => Number(await pv.getAttribute("data-pv-ready-trace-count"))).toBeGreaterThan(0);
  await expect(pv).toHaveAttribute("data-volume-minimum-ml", "0");
  await expect(pv).toHaveAttribute("data-pressure-minimum-mmhg", "0");
  const pressureMaximum = Number(await pv.locator("canvas").getAttribute("data-pressure-maximum-mmhg"));
  const volumeMaximum = Number(await pv.locator("canvas").getAttribute("data-volume-maximum-ml"));
  const playback = page.getByTestId("v3-playback-toggle");
  await playback.click();
  await expect(root).toHaveAttribute("data-playback", "paused");
  await pv.screenshot({ path: testInfo.outputPath("pv-loop-owned-domain.png") });
  // Changing the auxiliary construction must not enlarge the paused loop's axes.
  for (const view of ["pva", "envelope", "espvr"] as const) {
    await editGraph("PV loop");
    const settings = page.getByTestId("workbench-pane-picker-v3");
    await settings.getByRole("button", { name: view === "envelope" ? /^包絡線 / : /^PVA / }).click();
    await settings.getByRole("button", { name: "適用", exact: true }).click();
    await expect(pv).toHaveAttribute("data-pv-pva-boundary-visible", view === "espvr" ? "false" : "true");
    await expect(pv.locator("canvas")).toHaveAttribute("data-pressure-maximum-mmhg", String(pressureMaximum));
    await expect(pv.locator("canvas")).toHaveAttribute("data-volume-maximum-ml", String(volumeMaximum));
  }
  const epoch = await inputEpoch(page);
  if (mobile) await page.getByTestId("workbench-mobile-task-deck").getByRole("tab", { name: "コントロール", exact: true }).click();
  await page.getByRole("slider", { name: "HR", exact: true }).press("ArrowRight");
  await expect.poll(() => inputEpoch(page)).toBeGreaterThan(epoch);
  await expect(pv).toHaveAttribute("data-pva-result-count", "0");
  await expect(pv).toHaveAttribute("data-pva-retained-drawing-count", "1");
  await expect(pv).toHaveAttribute("data-pv-history-loop-count", "1");
  await expect(pv.getByText("薄い線：変更前", { exact: true })).toHaveCount(0);
  expect(Number(await pv.locator("canvas").getAttribute("data-pressure-maximum-mmhg"))).toBeGreaterThanOrEqual(pressureMaximum);
  expect(Number(await pv.locator("canvas").getAttribute("data-volume-maximum-ml"))).toBeGreaterThanOrEqual(volumeMaximum);
  await pv.screenshot({ path: testInfo.outputPath("pv-history-pending.png") });
  await selectGraph("Systemic Guyton / Starling");
  await expect(starling).toHaveAttribute("data-stale-scenario-count", "1");
  await expect(starling).toHaveAttribute("data-history-count", "1");
  await expect(starling.getByText("薄い線：変更前", { exact: true })).toHaveCount(0);
  await starling.screenshot({ path: testInfo.outputPath("starling-history-pending.png") });
  for (const name of ["Systemic Guyton / Starling", "PV loop"]) {
    await selectGraph(name);
    await editGraph(name);
    const settings = page.getByTestId("workbench-pane-picker-v3");
    const history = settings.getByRole("group", { name: "変更前の結果" });
    await expect(history.getByRole("radio", { name: "1", exact: true })).toBeChecked();
    await history.getByText("非表示", { exact: true }).click();
    await expect(history.getByRole("radio", { name: "非表示", exact: true })).toBeChecked();
    await settings.getByRole("button", { name: "適用", exact: true }).click();
    if (name === "PV loop") {
      await expect(pv).toHaveAttribute("data-pva-retained-drawing-count", "0");
      await expect(pv).toHaveAttribute("data-pv-history-loop-count", "0");
    } else await expect.poll(async () => await starling.count() === 0 ? 0 : Number(await starling.getAttribute("data-history-count"))).toBe(0);
    await editGraph(name);
    const choices = settings.getByRole("group", { name: "変更前の結果" });
    await choices.getByRole("radio", { name: "3", exact: true }).focus();
    await choices.getByRole("radio", { name: "3", exact: true }).press("Space");
    await expect(choices.getByRole("radio", { name: "3", exact: true })).toBeChecked();
    await choices.getByRole("radio", { name: "3", exact: true }).press("ArrowLeft");
    await choices.getByRole("radio", { name: "2", exact: true }).press("ArrowLeft");
    await expect(choices.getByRole("radio", { name: "1", exact: true })).toBeChecked();
    await settings.screenshot({ path: testInfo.outputPath(name === "PV loop" ? "pv-history-settings.png" : "starling-history-settings.png") });
    await settings.getByRole("button", { name: "適用", exact: true }).click();
  }
  await expect(pv).toHaveAttribute("data-pva-retained-drawing-count", "1");
  await playback.click();
  const startTime = await modelTime(root);
  // At the supported 0.25x playback rate, six model seconds already need
  // 24 wall seconds. Keep the six-second retention check, not a hidden 0.3x SLA.
  await expect.poll(() => modelTime(root), { timeout: 40_000 }).toBeGreaterThan(startTime + 6);
  await expect(pv).toHaveAttribute("data-pva-retained-drawing-count", "1");
  await expect(pv).toHaveAttribute("data-pressure-minimum-mmhg", "0");
  expect(Number(await pv.locator("canvas").getAttribute("data-pressure-maximum-mmhg"))).toBeGreaterThanOrEqual(pressureMaximum);
  await pv.screenshot({ path: testInfo.outputPath("pv-history-resumed.png") });
  expect(errors).toEqual([]);
});

test("@desktop @mobile @as-jet opt-in jet outputs preserve live and stale behavior", async ({ page }, testInfo) => {
  const root = page.getByTestId("v3-dockview-workbench");
  const mobile = (page.viewportSize()?.width ?? 1440) < 768;
  const deck = page.getByTestId("workbench-mobile-task-deck");
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  const labels = ["AV 最大圧較差", "AV AT", "AV AT/ET", "AV駆出中平均流量"];
  const ids = ["hemodynamics.velocity.peak-quasi-steady-jet.AoV", "hemodynamics.pressure-gradient.mean-bernoulli-jet.AoV",
    "hemodynamics.pressure-gradient.peak-bernoulli-jet.AoV", "hemodynamics.duration.jet-acceleration.AoV",
    "hemodynamics.ratio.jet-AT-to-ET.AoV", "hemodynamics.area.forward-SV-over-jet-VTI.AoV", "hemodynamics.flow.mean-ejection.AoV",
    "hemodynamics.stroke-volume-index.forward.AoV-reference-bsa1p9"];
  // No new defaults: the reader deliberately selects the additional observer.
  for (const id of ids) await expect(page.locator(`[data-output-id="${id}"]`)).toHaveCount(0);
  if (mobile) {
    await deck.getByRole("tab", { name: "出力", exact: true }).click();
    await deck.locator('[data-testid="pane-settings-button-v3"]').first().click();
  } else await openPaneSettings(page, "Outputs");
  const settings = page.getByTestId("workbench-pane-picker-v3");
  await settings.getByRole("button", { name: "項目を追加", exact: true }).click();
  await settings.getByRole("button", { name: "AS関連の5項目を追加", exact: true }).click();
  await expect(settings.getByRole("button", { name: "AS関連の5項目を追加", exact: true })).toHaveCount(0);
  const drawer = settings;
  for (const label of labels) {
    await drawer.getByRole("searchbox").fill(label);
    await drawer.getByRole("checkbox", { name: label, exact: true }).check();
  }
  await settings.getByRole("tab", { name: "項目", exact: true }).click();
  await settings.getByRole("button", { name: "AV 最大圧較差", exact: true }).click();
  await settings.getByRole("combobox", { name: "計算方法", exact: true }).selectOption("hemodynamics.pressure-gradient.peak-bernoulli-jet.AoV");
  await settings.getByRole("button", { name: "適用", exact: true }).click();
  for (const id of ids) await expect(page.locator(`[data-output-id="${id}"]`)).toHaveAttribute("data-output-availability", "available");
  for (const id of ids) await expect(page.locator(`[data-output-id="${id}"]`)).toHaveCount(1);
  const svi = page.locator(`[data-output-id="${ids[7]}"]`);
  await svi.getByTestId("workbench-item-description-trigger-v3").click();
  await expect(page.getByRole("tooltip")).toContainText("参照体表面積1.9 m²");
  await page.keyboard.press("Escape");
  const vmax = page.locator(`[data-output-id="${ids[0]}"]`), playback = page.getByTestId("v3-playback-toggle");
  const value = () => vmax.locator(".workbench-output-value").evaluate(element => element.firstChild?.textContent ?? "");
  expect(Number(await value())).toBeGreaterThan(0);
  await vmax.getByTestId("workbench-item-description-trigger-v3").click();
  await expect(page.getByRole("tooltip")).toContainText("推定した噴流速度");
  await page.keyboard.press("Escape");
  await vmax.scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath("jet-outputs-ready.png") });
  await playback.click(); await expect(root).toHaveAttribute("data-playback", "paused");
  const previous = await value(), epoch = await inputEpoch(page);
  if (mobile) await deck.getByRole("tab", { name: "コントロール", exact: true }).click();
  await page.getByRole("slider", { name: "HR", exact: true }).press("ArrowRight");
  await expect.poll(() => inputEpoch(page)).toBeGreaterThan(epoch);
  if (mobile) await deck.getByRole("tab", { name: "出力", exact: true }).click();
  await expect(vmax).toHaveAttribute("data-output-stale", "true");
  expect(await value()).toBe(previous);
  await vmax.scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath("jet-outputs-stale.png") });
  await playback.click();
  for (const id of ids) {
    const output = page.locator(`[data-output-id="${id}"]`);
    await expect(output).toHaveAttribute("data-output-stale", "false");
    await expect(output).toHaveAttribute("data-output-availability", "available");
  }
  expect(errors).toEqual([]);
});

test("@desktop @mobile @webkit @axis-ranges graph ranges and beat trails persist without changing numerical state", async ({ page }, testInfo) => {
  const mobile = (page.viewportSize()?.width ?? 1440) < 768;
  const root = page.getByTestId("v3-dockview-workbench");
  await page.getByTestId("v3-playback-toggle").click();
  await expect(root).toHaveAttribute("data-playback", "paused");
  const epoch = await inputEpoch(page);
  const initialVolumeMax = await page.locator('[data-chart-kind="pressure-volume-loop-v3"] canvas').first().getAttribute("data-volume-maximum-ml");
  const edit = async (name: string) => {
    if (mobile) {
      await page.getByTestId("workbench-mobile-graph-view-rail").getByRole("tab", { name, exact: true }).click();
      await page.getByRole("button", { name: `Pane設定: ${name}`, exact: true }).click();
    } else await openPaneSettings(page, name);
    const settings = page.getByTestId("workbench-pane-picker-v3");
    await expect(settings).toBeVisible();
    if (name === "PV loop" || name === "Pressure waveforms") await settings.getByRole("tab", { name: "表示", exact: true }).click();
    return settings;
  };
  const setRange = async (settings: Locator, axis: string, minimum: string, maximum: string) => {
    const section = settings.locator(`[data-axis-range="${axis}"]`);
    await section.getByText("固定", { exact: true }).click();
    await expect(section.getByRole("radio", { name: "固定", exact: true })).toBeChecked();
    const inputs = section.getByRole("textbox");
    await inputs.nth(0).fill(minimum); await inputs.nth(1).fill(maximum); await inputs.nth(1).press("Tab");
  };
  let settings = await edit("PV loop");
  const recent = settings.getByRole("group", { name: "最近の拍", exact: true });
  await expect(recent.getByRole("radio", { name: "2", exact: true })).toBeChecked();
  await recent.getByText("5", { exact: true }).click();
  const xSection = settings.locator('[data-axis-range="x"]');
  await xSection.getByText("固定", { exact: true }).click();
  await expect(xSection.getByRole("textbox").nth(1)).toHaveValue(initialVolumeMax!);
  await xSection.getByRole("textbox").nth(0).fill("9999");
  await expect(settings.getByRole("button", { name: "適用", exact: true })).toBeDisabled();
  await expect(xSection.getByRole("alert")).toBeVisible();
  await setRange(settings, "x", "20", "180");
  await setRange(settings, "y", "-10", "130");
  await settings.screenshot({ path: testInfo.outputPath("pv-trails-axis-settings.png") });
  await settings.getByRole("button", { name: "適用", exact: true }).click();
  const pv = page.locator('[data-chart-kind="pressure-volume-loop-v3"] canvas').first();
  await expect(pv).toHaveAttribute("data-volume-minimum-ml", "20");
  await expect(pv).toHaveAttribute("data-volume-maximum-ml", "180");
  await expect(pv).toHaveAttribute("data-pressure-minimum-mmhg", "-10");
  await expect(pv).toHaveAttribute("data-pressure-maximum-mmhg", "130");
  settings = await edit("Pressure waveforms");
  await expect(settings.locator('[data-axis-range="x"]')).toHaveCount(0);
  await setRange(settings, "y", "0", "120");
  const windowInput = settings.getByRole("slider", { name: "表示時間幅", exact: true });
  await windowInput.press("End");
  await expect(windowInput).toHaveValue("12");
  await settings.getByRole("button", { name: "適用", exact: true }).click();
  await expect(page.locator('[data-chart-kind="sweeping-waveform-v3"] canvas').first()).toHaveAttribute("data-y-maximum", "120");
  await expect(page.locator('[data-chart-kind="sweeping-waveform-v3"]').first()).toHaveAttribute("data-time-window-sec", "12");
  settings = await edit("Systemic Guyton / Starling");
  await setRange(settings, "x", "-5", "25"); await setRange(settings, "y", "0", "12");
  await settings.getByRole("button", { name: "適用", exact: true }).click();
  const gs = page.locator('[data-chart-kind="guyton-starling-structural-orientation-v3"]').first();
  await expect(gs).toHaveAttribute("data-pressure-minimum-mmhg", "-5");
  await expect(gs).toHaveAttribute("data-flow-maximum-l-per-min", "12");
  expect(await inputEpoch(page)).toBe(epoch);
  await page.keyboard.press("ControlOrMeta+s");
  await expect(page.getByTestId("v3-save-experiment")).toContainText("保存済み");
  await expect(page).toHaveURL(new RegExp(`/ja/experiments/${EXPERIMENT_RESOURCE_ID}$`));
  await page.reload(); await expect(root).toBeVisible();
  settings = await edit("PV loop");
  await expect(settings.locator('[data-axis-range="x"]').getByRole("textbox").nth(0)).toHaveValue("20");
  await expect(settings.getByRole("group", { name: "最近の拍", exact: true }).getByRole("radio", { name: "5", exact: true })).toBeChecked();
  await settings.locator('[data-axis-range="x"]').getByText("自動", { exact: true }).click();
  await settings.locator('[data-axis-range="y"]').getByText("自動", { exact: true }).click();
  await settings.getByRole("button", { name: "適用", exact: true }).click();
  await expect(pv).toHaveAttribute("data-volume-minimum-ml", "0");
  await page.screenshot({ path: testInfo.outputPath("manual-axis-ranges.png") });
});

test("@desktop @mobile @legend-density long scenario names keep actions fixed and legends bounded", async ({ page }, testInfo) => {
  const mobile = (page.viewportSize()?.width ?? 1440) < 768;
  const deck = page.getByTestId("workbench-mobile-task-deck");
  if (mobile) await deck.getByRole("tab", { name: "Scenario", exact: true }).click();
  const manager = mobile ? deck.getByTestId("workbench-scenario-manager-v3") : page.getByRole("region", { name: "Scenarios", exact: true });
  await page.getByTestId("v3-playback-toggle").click();
  const icons = manager.getByRole("button", { name: "Scenarioメニュー: baseline", exact: true });
  const original = await icons.boundingBox();
  const longName = "比較用シナリオと十分に長い病態の説明".repeat(6);
  await openScenarioMenu(page, manager, "baseline");
  await page.getByRole("menuitem", { name: "名前を変更", exact: true }).click();
  const name = manager.getByRole("textbox", { name: "Scenario名", exact: true });
  await name.fill(longName); await name.press("Enter");
  const renamed = manager.getByRole("button", { name: `Scenarioメニュー: ${longName}`, exact: true });
  const after = await renamed.boundingBox(), bounds = await manager.boundingBox();
  expect(Math.abs(after!.x - original!.x)).toBeLessThan(2);
  expect(after!.x + after!.width).toBeLessThanOrEqual(bounds!.x + bounds!.width);
  await expect(manager.getByRole("button", { name: `グラフで非表示: ${longName}`, exact: true })).toBeInViewport();
  expect(await manager.locator(".workbench-scenario-label").evaluate(el => el.scrollWidth > el.clientWidth)).toBe(true);
  for (let i = 0; i < 4; i++) {
    await manager.getByRole("button", { name: "Presetから追加", exact: true }).click();
    await page.getByRole("dialog", { name: "シナリオを追加" }).getByRole("button", { name: "baseline", exact: true }).click();
  }
  if (mobile) await page.getByTestId("workbench-mobile-graph-view-rail").getByRole("tab", { name: "Pressure waveforms", exact: true }).click();
  const waveform = page.locator('[data-chart-kind="sweeping-waveform-v3"]');
  const legend = waveform.locator('[data-legend-expanded]');
  if (mobile) {
    // The phone keeps the plot's height by scrolling one legend row sideways.
    const row = legend.locator('[data-chart-legend]');
    await expect(waveform.getByRole("button", { name: "凡例を展開", exact: true })).toHaveCount(0);
    expect((await legend.boundingBox())!.height).toBeLessThanOrEqual(29);
    expect(await row.evaluate(element => element.scrollWidth > element.clientWidth)).toBe(true);
  } else {
    await expect(waveform.getByRole("button", { name: "凡例を展開", exact: true })).toBeVisible();
    expect((await legend.boundingBox())!.height).toBeLessThanOrEqual(57);
    await waveform.getByRole("button", { name: "凡例を展開", exact: true }).click();
    await expect(legend).toHaveAttribute("data-legend-expanded", "true");
    await waveform.getByRole("button", { name: "凡例を折りたたむ", exact: true }).click();
  }
  await waveform.getByRole("button", { name: "baseline 4, AoP", exact: true }).focus();
  if (mobile) {
    await expect(waveform.getByRole("button", { name: "baseline 4, AoP", exact: true })).toBeInViewport();
    expect(await legend.locator('[data-chart-legend]').evaluate(element => element.scrollLeft)).toBeGreaterThan(0);
    await expect(waveform.getByRole("button", { name: "Pane設定: Pressure waveforms", exact: true })).toBeInViewport();
  }
  await page.keyboard.press("Enter");
  await expect(waveform.getByRole("button", { name: "baseline 4, AoP", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(waveform.getByRole("button", { name: `${longName}, AoP`, exact: true })).toHaveAttribute("aria-pressed", "false");
  await page.screenshot({ path: testInfo.outputPath("compact-legends-long-label.png") });
});

test("@desktop @mobile @preset-picker browses without changing Scenarios and preserves five baseline copies", async ({ page }, testInfo) => {
  const mobile = (page.viewportSize()?.width ?? 1440) < 768;
  const deck = page.getByTestId("workbench-mobile-task-deck");
  const root = page.getByTestId("v3-dockview-workbench");
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.getByTestId("v3-playback-toggle").click();
  await expect(root).toHaveAttribute("data-playback", "paused");
  if (mobile) await deck.getByRole("tab", { name: "Scenario", exact: true }).click();
  const manager = mobile ? deck.getByTestId("workbench-scenario-manager-v3") : page.getByRole("region", { name: "Scenarios" });
  const add = manager.getByRole("button", { name: "Presetから追加", exact: true });
  const picker = page.getByRole("dialog", { name: "シナリオを追加", exact: true });
  const rows = manager.locator(".workbench-scenario-row");
  const search = picker.getByRole("searchbox", { name: "病態・略語で検索" });
  await add.click();
  await expect(picker).toBeVisible();
  if (!mobile) await expect(search).toBeFocused();
  await search.fill("大動脈弁狭窄");
  await expect(picker.locator("[data-preset-id]")).toHaveCount(2);
  await picker.getByRole("button", { name: "AS · 弁狭窄のみ・高勾配: 詳細", exact: true }).click();
  await expect(rows).toHaveCount(1);
  await expect(manager.getByRole("button", { name: "baseline workbench-live-default", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(picker.getByRole("link", { name: /設定と検証/ })).toHaveAttribute("href", /standard74-as-high-gradient-document/);
  await expect(picker.getByRole("link", { name: /設定と検証/ })).toHaveAttribute("target", "_blank");
  await expect(picker.getByRole("button", { name: "一覧に戻る" })).toBeFocused();
  await picker.getByRole("button", { name: "一覧に戻る" }).click();
  await expect(search).toHaveValue("大動脈弁狭窄");
  await search.fill("AS low");
  await expect(picker.locator("[data-preset-id]")).toHaveCount(1);
  await search.fill("no-matching-preset");
  await expect(picker.getByText("該当するプリセットがありません。")).toBeVisible();
  await search.fill("");
  await page.keyboard.press("Escape");
  await expect(picker).toBeHidden();
  await expect(add).toBeFocused();
  for (let count = 2; count <= 5; count += 1) {
    await add.click();
    await picker.getByRole("button", { name: "baseline", exact: true }).click();
    await expect(picker).toBeHidden();
    await expect(rows).toHaveCount(count);
  }
  await expect(add).toBeEnabled();
  await expect(manager.getByRole("heading", { name: "Scenarios (5)", exact: true })).toBeVisible();
  await expect(manager).not.toContainText("/4");
  await manager.getByRole("button", { name: "グラフで非表示: baseline 5", exact: true }).click();
  await expect(manager.getByRole("button", { name: "グラフに表示: baseline 5", exact: true })).toBeVisible();
  await manager.getByRole("button", { name: "グラフに表示: baseline 5", exact: true }).click();
  await openScenarioMenu(page, manager, "baseline 5");
  await page.getByRole("menuitem", { name: "名前を変更", exact: true }).click();
  await manager.getByRole("textbox", { name: "Scenario名", exact: true }).fill("比較用baseline");
  await manager.getByRole("textbox", { name: "Scenario名", exact: true }).press("Enter");
  await expect(manager.getByRole("button", { name: "Scenarioメニュー: 比較用baseline", exact: true })).toHaveCount(1);
  await openScenarioMenu(page, manager, "比較用baseline");
  await page.getByRole("menuitem", { name: "複製", exact: true }).click();
  await expect(rows).toHaveCount(6);
  await openScenarioMenu(page, manager, "比較用baseline のコピー");
  await page.getByRole("menuitem", { name: "削除", exact: true }).click();
  await expect(rows).toHaveCount(5);
  await page.keyboard.press("ControlOrMeta+s");
  await expect(page).toHaveURL(new RegExp(`/ja/experiments/${EXPERIMENT_RESOURCE_ID}$`));
  await page.reload();
  await expect(root).toHaveAttribute("data-model-id", DEFAULT_EXACT_MODEL_ID);
  if (mobile) await deck.getByRole("tab", { name: "Scenario", exact: true }).click();
  await expect(rows).toHaveCount(5);
  await expect(manager.getByRole("button", { name: "Scenarioメニュー: 比較用baseline", exact: true })).toHaveCount(1);
  await add.click();
  await expect(picker).not.toContainText("比較中");
  await page.screenshot({ path: testInfo.outputPath("preset-picker.png") });
  expect(errors).toEqual([]);
});

test("@desktop @mobile @as-presets public settled AS presets remain reachable beside their controls", async ({ page }, testInfo) => {
  const mobile = (page.viewportSize()?.width ?? 1440) < 768;
  const deck = page.getByTestId("workbench-mobile-task-deck"), root = page.getByTestId("v3-dockview-workbench");
  const errors: string[] = []; page.on("pageerror", e => errors.push(e.message));
  if (mobile) {
    await deck.getByRole("tab", { name: "出力", exact: true }).click();
    await deck.locator('[data-testid="pane-settings-button-v3"]').first().click();
  } else await openPaneSettings(page, "Outputs");
  const settings = page.getByTestId("workbench-pane-picker-v3");
  await settings.getByRole("button", { name: "項目を追加", exact: true }).click();
  await settings.getByRole("button", { name: "AS関連の5項目を追加", exact: true }).click();
  await settings.getByRole("button", { name: "適用", exact: true }).click();
  const ids = ["hemodynamics.velocity.peak-quasi-steady-jet.AoV", "hemodynamics.pressure-gradient.mean-bernoulli-jet.AoV"];
  const manager = mobile ? deck.getByTestId("workbench-scenario-manager-v3") : page.getByRole("region", { name: "Scenarios" });
  for (const [title, min, max] of [["AS · 弁狭窄のみ・高勾配", 45, 52], ["HFrEF · 慢性左室拡大型", 1, 3], ["AS · 低EF・低流量・低勾配", 18, 23]] as const) {
    if (mobile) await deck.getByRole("tab", { name: "Scenario", exact: true }).click();
    await manager.getByRole("button", { name: "Presetから追加", exact: true }).click();
    const menu = page.getByRole("dialog", { name: "シナリオを追加", exact: true });
    const item = menu.getByRole("button", { name: title, exact: true });
    await item.scrollIntoViewIfNeeded();
    expect(await menu.evaluate(e => e.getBoundingClientRect().bottom <= innerHeight)).toBe(true);
    await item.click();
    await expect(manager.getByRole("button", { name: new RegExp(`^${title} scenario/`) })).toHaveAttribute("aria-pressed", "true");
    if (mobile) await deck.getByRole("tab", { name: "出力", exact: true }).click();
    for (const id of ids) await expect(page.locator(`[data-output-id="${id}"]`)).toHaveAttribute("data-output-availability", "available");
    const pg = page.locator(`[data-output-id="${ids[1]}"] .workbench-output-value`);
    const value = () => pg.evaluate(e => Number(e.firstChild?.textContent));
    await expect.poll(value).toBeGreaterThan(min); expect(await value()).toBeLessThan(max);
    await page.screenshot({ path: testInfo.outputPath(`as-preset-${min}.png`) });
  }
  if (mobile) await deck.getByRole("tab", { name: "Scenario", exact: true }).click();
  await expect(manager.getByRole("button", { name: /Scenarioメニュー:/ })).toHaveCount(4);
  await manager.getByRole("button", { name: "baseline workbench-live-default", exact: true }).click();
  if (mobile) await deck.getByRole("tab", { name: "出力", exact: true }).click();
  await expect.poll(() => page.locator(`[data-output-id="${ids[1]}"] .workbench-output-value`).evaluate(e => Number(e.firstChild?.textContent))).toBeLessThan(5);
  await expect(root).toHaveAttribute("data-model-id", DEFAULT_EXACT_MODEL_ID);
  expect(errors).toEqual([]);
});

for (const [key, title] of [["high-gradient AS", "AS · 弁狭窄のみ・高勾配"],
  ["low-flow AS", "AS · 低EF・低流量・低勾配"], ["HFrEF", "HFrEF · 慢性左室拡大型"]] as const) {
test(`@desktop @as-analysis public ${key} completes formal PV analysis without stopping live execution`, async ({ page }, testInfo) => {
  const manager = page.getByRole("region", { name: "Scenarios" });
  await manager.getByRole("button", { name: "Presetから追加", exact: true }).click();
  const picker = page.getByRole("dialog", { name: "シナリオを追加", exact: true });
  await picker.getByRole("button", { name: title, exact: true }).click();
  await expect(manager.getByRole("button", { name: new RegExp(`^${title} scenario/`) })).toHaveAttribute("aria-pressed", "true");
  const canvas = page.locator("[data-pva-result-count]").first();
  const error = page.getByTestId("workbench-pva-analysis-error");
  const started = Date.now();
  // A dev-server reload discards an unsaved scenario. Report it as such rather
  // than waiting several minutes and misclassifying it as a numerical failure.
  await Promise.race([page.waitForEvent("framenavigated", { predicate: frame => frame === page.mainFrame(), timeout: 20_000 })
    .then(() => { throw new Error("Workbench page reloaded while verifying formal analysis"); }), expect.poll(async () => {
    if (await error.count()) {
      await error.first().click();
      const message = await page.getByTestId("workbench-pva-analysis-error-popover").innerText();
      await testInfo.attach("analysis-error", { body: message, contentType: "text/plain" });
      throw new Error(message);
    }
    return Number(await canvas.getAttribute("data-pva-result-count")) >= 2 && await canvas.getAttribute("data-pva-analysis-pending") === "false";
  }, { timeout: 15_000 }).toBe(true)]);
  const readyPath = testInfo.outputPath("prepared-case-ready.json");
  await writeFile(readyPath, JSON.stringify({ case: key, waitAfterScenarioAddedMs: Date.now() - started }));
  await testInfo.attach("prepared-case-ready", { path: readyPath, contentType: "application/json" });
  await expect(error).toHaveCount(0);
  expect(Number(await canvas.getAttribute("data-pv-envelope-source-point-count"))).toBeGreaterThan(10);
  expect(Number(await canvas.getAttribute("data-pv-diastolic-source-point-count"))).toBeGreaterThan(10);
  await page.screenshot({ path: testInfo.outputPath("as-formal-complete.png") });
  const before = await acceptedRevision(page);
  await expect.poll(() => acceptedRevision(page)).toBeGreaterThan(before + 100);
  await expect(page.getByTestId("v3-runtime-error")).toHaveCount(0);
  await page.getByTestId("workbench-simulation-info-trigger-v3").click();
  const info = page.getByRole("dialog", { name: "シミュレーション情報" });
  await info.getByRole("tab", { name: "数理モデル", exact: true }).click();
  await info.getByText("制限事項", { exact: false }).first().click();
  await expect(info.getByText(/圧差のゼロ交差から補間/)).toBeVisible();
});
}

test("@desktop @mobile @beat-metrics filling outputs retain stale measurements without inventing unavailable durations", async ({ page }, testInfo) => {
  const root = page.getByTestId("v3-dockview-workbench");
  const mobile = (page.viewportSize()?.width ?? 1440) < 768;
  const deck = page.getByTestId("workbench-mobile-task-deck");
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  if (mobile) {
    await deck.getByRole("tab", { name: "出力", exact: true }).click();
    await deck.locator('[data-testid="pane-settings-button-v3"]').first().click();
  } else await openPaneSettings(page, "Outputs");
  const settings = page.getByTestId("workbench-pane-picker-v3");
  await settings.getByRole("button", { name: "項目を追加", exact: true }).click();
  const drawer = settings;
  for (const [query, label] of [["MV E/A", "MV E/A（流量）"], ["MV DT", "MV DT（流量）"], ["MV A dur", "MV A波持続時間"], ["PV S", "肺静脈S波流量"], ["PV D", "肺静脈D波流量"], ["PV S/D", "肺静脈S/D（流量）"], ["PV Ar", "肺静脈Ar波流量"], ["PV Ar dur", "肺静脈Ar波持続時間"], ["PV Ar−A dur", "Ar−A時間差"]]) {
    await drawer.getByRole("searchbox").fill(query);
    await drawer.getByRole("checkbox", { name: label, exact: true }).check();
  }
  await settings.getByRole("tab", { name: "項目", exact: true }).click();
  await settings.getByRole("button", { name: "適用", exact: true }).click();
  const measuredIds = ["hemodynamics.ratio.peak-E-to-A.volumetric.MV", "hemodynamics.duration.E-deceleration-80-40.volumetric.MV",
    "hemodynamics.flow.peak-systolic-ejection.PVein_LA", "hemodynamics.flow.peak-early-diastolic.PVein_LA", "hemodynamics.ratio.peak-S-to-D.volumetric.PVein_LA",
    "hemodynamics.flow.peak-atrial-reversal-magnitude.PVein_LA", "hemodynamics.duration.atrial-reversal-zero-crossing.PVein_LA"];
  for (const id of measuredIds) await expect(page.locator(`[data-output-id="${id}"]`)).toHaveAttribute("data-output-availability", "available");
  const aDuration = page.locator('[data-output-id="hemodynamics.duration.A-zero-crossing.volumetric.MV"]');
  await expect(aDuration).toHaveAttribute("data-output-availability", "not-evaluated-at-accepted-state");
  await expect(aDuration).toHaveAttribute("data-output-stale", "false"); // No invented initial measurement.
  await expect(aDuration.locator(".text-wb-warning")).toHaveCount(0);
  await aDuration.getByTestId("workbench-item-description-trigger-v3").click();
  await expect(page.getByRole("tooltip")).toContainText("独立したA波の順行性血流");
  await expect(page.getByRole("tooltip")).toContainText("新しい測定値を得られていません");
  await expect(page.getByRole("tooltip")).toHaveCSS("white-space", "pre-line");
  await page.keyboard.press("Escape");
  const ratio = page.locator(`[data-output-id="${measuredIds[0]}"]`), playback = page.getByTestId("v3-playback-toggle");
  await playback.click(); await expect(root).toHaveAttribute("data-playback", "paused");
  const number = () => ratio.locator(".workbench-output-value").evaluate(element => element.firstChild?.textContent ?? "");
  const prior = await number(), epoch = await inputEpoch(page);
  if (mobile) await deck.getByRole("tab", { name: "コントロール", exact: true }).click();
  await page.getByRole("slider", { name: "HR", exact: true }).press("ArrowRight");
  await expect.poll(() => inputEpoch(page)).toBeGreaterThan(epoch);
  if (mobile) await deck.getByRole("tab", { name: "出力", exact: true }).click();
  await expect(ratio).toHaveAttribute("data-output-stale", "true");
  expect(await number()).toBe(prior);
  await ratio.scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath("filling-stale.png") });
  await playback.click();
  await expect(ratio).toHaveAttribute("data-output-stale", "false");
  await expect(ratio).toHaveAttribute("data-output-availability", "available");
  await ratio.getByTestId("workbench-item-description-trigger-v3").click();
  await expect(page.getByRole("tooltip")).toContainText("E波と心房収縮期A波のピーク流量比");
  await page.keyboard.press("Escape");
  await page.screenshot({ path: testInfo.outputPath("filling-ready.png") });
  expect(errors).toEqual([]);
});

test("@desktop @model-lab formal analysis, warm controls, and settings stay live", async ({
  page,
}) => {
  const root = page.getByTestId("v3-dockview-workbench");
  const firstTime = await modelTime(root);
  // The deterministic scheduler suite owns the wall-clock pacing contract.
  // This production-browser smoke runs on variable shared CI hardware, so it
  // verifies sustained numerical progress without turning solver throughput
  // into a runner benchmark.
  await expect
    .poll(() => modelTime(root), { timeout: 10_000, intervals: [250] })
    .toBeGreaterThan(firstTime + 0.6);
  const secondTime = await modelTime(root);
  expect(secondTime - firstTime).toBeLessThan(3.2);

  const playback = page.getByTestId("v3-playback-toggle");
  await playback.click();
  await expect(root).toHaveAttribute("data-playback", "paused");
  // The pause intent is rendered immediately while the scheduler drains an
  // already accepted presentation batch. Wait for that bounded drain rather
  // than treating a slow shared runner's queued frame delivery as playback.
  await expect.poll(async () => {
    const beforeDrain = await modelTime(root);
    await page.waitForTimeout(150);
    return Math.abs((await modelTime(root)) - beforeDrain);
  }, { timeout: 5_000 }).toBeLessThanOrEqual(0.02);
  const pausedAt = await modelTime(root);
  await page.waitForTimeout(800);
  expect(Math.abs((await modelTime(root)) - pausedAt)).toBeLessThanOrEqual(
    0.02,
  );
  await playback.click();
  await expect(root).toHaveAttribute("data-playback", "playing");
  await expect.poll(() => modelTime(root)).toBeGreaterThan(pausedAt + 0.25);

  await expectNonZeroCanvas(
    page.locator('[data-chart-kind="sweeping-waveform-v3"]'),
  );

  await expect(page.getByText(/\d+\.\d+ s/)).toHaveCount(0);
  await expect(page.getByRole("link", { name: "記事" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Brief" })).toHaveCount(0);

  const themeToggle = page.getByTestId("workbench-theme-toggle");
  await expect(themeToggle).toBeVisible();
  await expect(page.locator("body")).toHaveAttribute("data-app-theme", "dark");
  await themeToggle.click();
  await expect(page.locator("body")).toHaveAttribute("data-app-theme", "light");
  await themeToggle.click();
  await expect(page.locator("body")).toHaveAttribute("data-app-theme", "dark");

  const playbackRateTrigger = page.getByTestId("v3-playback-rate-trigger");
  await expect(
    page.getByTestId("v3-header-playback-authoring-separator"),
  ).toHaveCount(0);
  await expect(page.getByTestId("v3-save-experiment")).toHaveCount(0);
  const headerActions = [
    page.getByTestId("workbench-simulation-info-trigger-v3"),
    themeToggle,
    page.getByTestId("v3-header-information-playback-separator"),
    playback,
    playbackRateTrigger,
  ];
  const headerActionXs = await Promise.all(headerActions.map(async (action) =>
    (await action.boundingBox())?.x ?? Number.NaN
  ));
  expect(headerActionXs.every(Number.isFinite)).toBe(true);
  expect(headerActionXs).toEqual([...headerActionXs].sort((a, b) => a - b));

  await playbackRateTrigger.click();
  const playbackRatePopover = page.getByTestId("v3-playback-rate-popover");
  await expect(playbackRatePopover).toBeVisible();
  await expect(playbackRateTrigger.locator("svg")).toHaveCount(0);
  await expect(
    playbackRatePopover.getByRole("slider", { name: "再生速度を変更" }),
  ).toBeEnabled();
  expect(await playbackRatePopover.evaluate((popover) => {
    const bounds = popover.getBoundingClientRect();
    const topmost = document.elementFromPoint(
      bounds.left + bounds.width / 2,
      bounds.top + Math.min(24, bounds.height / 2),
    );
    return topmost !== null && popover.contains(topmost);
  })).toBe(true);
  await playbackRatePopover.getByRole("button", {
    name: "0.25×",
    exact: true,
  }).click();
  await expect(playbackRateTrigger).toContainText("0.25×");
  await playbackRateTrigger.click();
  await expect(playbackRatePopover).toBeHidden();

  const scenarioRegion = page.getByRole("region", { name: "Scenarios" });
  const controlArea = page.getByRole("region", { name: "コントロールエリア" });
  const scenarioBox = await scenarioRegion.boundingBox();
  const controlBox = await controlArea.boundingBox();
  expect(
    (scenarioBox?.y ?? 0) + (scenarioBox?.height ?? 0),
  ).toBeLessThanOrEqual((controlBox?.y ?? 0) + 1);
  await expect(
    controlArea.getByRole("region", { name: "Scenarios" }),
  ).toHaveCount(0);
  const outputArea = page.getByRole("region", { name: "出力エリア" });
  const areaLayout = page.getByTestId("workbench-area-layout");
  const [outputBox, areaLayoutBox] = await Promise.all([
    outputArea.boundingBox(),
    areaLayout.boundingBox(),
  ]);
  expect(outputBox).not.toBeNull();
  expect(areaLayoutBox).not.toBeNull();
  expect(outputBox!.height / areaLayoutBox!.height).toBeLessThan(0.21);
  const outputGridLayout = await outputArea.locator(".workbench-output-grid")
    .evaluate((grid) => ({
      columnCount: getComputedStyle(grid).gridTemplateColumns
        .split(" ")
        .filter(Boolean).length,
      horizontalOverflowPx: grid.scrollWidth - grid.clientWidth,
    }));
  expect(outputGridLayout.columnCount).toBeGreaterThan(1);
  expect(outputGridLayout.horizontalOverflowPx).toBeLessThanOrEqual(1);

  await openPaneSettings(page, "Pressure waveforms");
  const waveformSettings = page.getByTestId("workbench-pane-picker-v3");
  await expect(
    waveformSettings.getByRole("heading", { name: "Pressure waveforms" }),
  ).toBeVisible();
  await waveformSettings.getByRole("tab", { name: "表示", exact: true }).click();
  const waveformWindow = waveformSettings.getByRole("slider", {
    name: "表示時間幅",
  });
  await expect(waveformWindow).toHaveValue("4");
  await waveformWindow.fill("3.5");
  await expect(waveformWindow).toHaveValue("3.5");
  await waveformSettings.getByRole("button", { name: "適用" }).click();
  await expect(waveformSettings).toBeHidden();
  await openPaneSettings(page, "Pressure waveforms");
  await waveformSettings.getByRole("tab", { name: "表示", exact: true }).click();
  await expect(
    page
      .getByTestId("workbench-pane-picker-v3")
      .getByRole("slider", { name: "表示時間幅" }),
  ).toHaveValue("3.5");
  await page.getByRole("button", { name: "キャンセル" }).click();

  const pvTab = page.getByText("PV loop", { exact: true });
  await pvTab.scrollIntoViewIfNeeded();
  await pvTab.click();
  await expectNonZeroCanvas(
    page.locator('[data-chart-kind="pressure-volume-loop-v3"]'),
  );
  await expect(
    page.locator(
      '[data-pv-relation-semantics="full-load-pressure-envelope-measured-diastolic-locus"]',
    ),
  ).toBeVisible();
  await expectFormalPvaProgressOrResult(
    page.locator('[data-chart-kind="pressure-volume-loop-v3"]'),
  );

  const graphArea = page.getByRole("region", { name: "グラフエリア" });
  const graphGroups = graphArea.locator(".dv-groupview");
  await expect(graphGroups).toHaveCount(3);
  await expect(
    graphArea.getByRole("button", { name: "Paneを追加" }),
  ).toHaveCount(3);
  const groupBounds = await graphGroups.evaluateAll((groups) =>
    groups.map((group) => {
      const bounds = group.getBoundingClientRect();
      return { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height };
    })
  );
  // Default composition: a tall PV loop on the left, two stacked panes on the right.
  const left = [...groupBounds].sort((a, b) => a.x - b.x)[0]!;
  const right = groupBounds.filter(group => group.x > left.x + 20).sort((a, b) => a.y - b.y);
  expect(right).toHaveLength(2);
  expect(Math.abs(left.y - right[0]!.y)).toBeLessThan(4);
  expect(Math.abs(right[0]!.x - right[1]!.x)).toBeLessThan(4);
  expect(right[1]!.y).toBeGreaterThan(right[0]!.y + 20);
  expect(left.width).toBeGreaterThan(right[0]!.width);
  expect(left.height).toBeGreaterThan(right[0]!.height * 1.7);
  expect(Math.abs(left.y + left.height - right[1]!.y - right[1]!.height)).toBeLessThan(4);
  const structuralTab = graphArea.getByText("Systemic Guyton / Starling", {
    exact: true,
  });
  await expect(structuralTab).toBeVisible();
  await structuralTab.click();
  const structuralDockTab = graphArea
    .locator(".dv-tab")
    .filter({ hasText: "Systemic Guyton / Starling" });
  await expect(structuralDockTab).toHaveClass(/dv-active-tab/);
  await expectDockTabAccent(structuralDockTab.locator(".workbench-dock-tab"));
  const structural = page.locator(
    '[data-chart-kind="guyton-starling-structural-orientation-v3"][data-circulation-side="right"]',
  );
  await expect(structural).toHaveCount(1);
  await expectNonZeroCanvas(structural.first());
  await expect(page.locator(
    '[data-analysis-boundary-status][data-circulation-side="right"]',
  )).toHaveAttribute(
    "data-analysis-boundary-status",
    "current-input-epoch",
  );
  await expect
    .poll(
      async () => {
        const completed = Number(
          await structural
            .first()
            .getAttribute("data-starling-completed-points"),
        );
        const total = Number(
          await structural.first().getAttribute("data-starling-total-points"),
        );
        // The reader renders every accepted continuation point immediately.
        // Full-locus convergence is covered by deterministic protocol tests;
        // this variable-hardware browser smoke owns progressive first paint,
        // not a numerical-throughput benchmark.
        return completed > 0 && total >= completed;
      },
      { timeout: 30_000 },
    )
    .toBe(true);
  expect(
    Number(await structural.getAttribute("data-pressure-maximum-mmhg")),
  ).toBeLessThan(25);

  await openPaneSettings(page, "Systemic Guyton / Starling");
  const structuralSettings = page.getByTestId("workbench-pane-picker-v3");
  await expect(
    structuralSettings.getByRole("combobox", {
      name: "表示する循環",
    }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "閉じる" }).click();
  await expect(structural).toHaveCount(1);

  await graphGroups.first().getByRole("button", { name: "Paneを追加" }).click();
  const addGraphMenu = page.getByRole("dialog", { name: "グラフを追加" });
  await expect(addGraphMenu.locator("[data-graph-option-id]")).toHaveText([
    "PV loop",
    "圧波形",
    "流量波形",
    "体循環 Guyton / Starling（CVP）",
    "肺循環 Guyton / Starling（PCWP）",
  ]);
  await addGraphMenu
    .getByRole("button", { name: "肺循環 Guyton / Starling（PCWP）" })
    .click();
  const pulmonaryTab = graphArea.getByText("Pulmonary Guyton / Starling", {
    exact: true,
  });
  await expect(structuralTab).toBeVisible();
  await expect(pulmonaryTab).toBeVisible();
  await pulmonaryTab.click();
  const pulmonaryDockTab = graphArea
    .locator(".dv-tab")
    .filter({ hasText: "Pulmonary Guyton / Starling" });
  await expect(pulmonaryDockTab).toHaveClass(/dv-active-tab/);
  await expectDockTabAccent(pulmonaryDockTab.locator(".workbench-dock-tab"));
  await expectDockTabAccent(structuralDockTab.locator(".workbench-dock-tab"));
  const pulmonaryStructural = page.locator(
    '[data-chart-kind="guyton-starling-structural-orientation-v3"][data-circulation-side="left"]',
  );
  await expect(pulmonaryStructural).toHaveCount(1);
  await expect(page.locator(
    '[data-chart-kind="guyton-starling-structural-orientation-v3"]',
  )).toHaveCount(2);
  expect(
    Number(await pulmonaryStructural.getAttribute("data-pressure-maximum-mmhg")),
  ).toBeLessThan(30);
  await openPaneSettings(page, "Pulmonary Guyton / Starling");
  await expect(
    page
      .getByTestId("workbench-pane-picker-v3")
      .getByRole("combobox", { name: "表示する循環" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "閉じる" }).click();
  await structuralTab.click();
  await expect(structuralDockTab).toHaveClass(/dv-active-tab/);
  await expectDockTabAccent(structuralDockTab.locator(".workbench-dock-tab"));
  await expectDockTabAccent(pulmonaryDockTab.locator(".workbench-dock-tab"));
  // History retains the last renderable preview, not only a completed family.
  // Keep this smoke about mutation/retention; exact protocol tests own complete
  // branch convergence independently of browser/CI hardware throughput.
  await expect.poll(async () => Number(
    await structural.getAttribute("data-starling-completed-points"),
  )).toBeGreaterThan(0);

  const initialEpoch = await inputEpoch(page);
  const preControlTime = await modelTime(root);
  const preControlRevision = await acceptedRevision(page);
  const systemicResistance = page.getByRole("slider", {
    name: "SVR",
  });
  await expect(systemicResistance).toBeEnabled({ timeout: 60_000 });
  await systemicResistance.press("ArrowRight");
  await expect(
    page.getByTestId("workbench-scenario-manager-v3").getByRole("status", {
      name: "Guyton / Starling曲線を更新しています…: baseline",
      exact: true,
    }),
  ).toBeVisible({ timeout: 20_000 });
  await expect(structural).toHaveAttribute("data-history-count", "1", {
    timeout: 20_000,
  });
  await expect.poll(() => inputEpoch(page)).toBeGreaterThan(initialEpoch);
  const changedEpoch = await inputEpoch(page);
  expect(await modelTime(root)).toBeGreaterThanOrEqual(preControlTime);
  expect(await acceptedRevision(page)).toBeGreaterThanOrEqual(
    preControlRevision,
  );
  await expect.poll(() => modelTime(root)).toBeGreaterThan(preControlTime);
  await expect(structural).toHaveAttribute("data-history-count", "1");

  await openPaneSettings(page, "Outputs");
  const settings = page.getByTestId("workbench-pane-picker-v3");
  await expect(settings).toBeVisible();
  await expect(settings.locator('input[type="color"]')).toHaveCount(0);
  const selectedHeartRate = settings.getByRole("button", {
    name: "HR (現在値)",
    exact: true,
  });
  await expect(selectedHeartRate).toHaveCount(0);
  await settings.getByRole("button", { name: "項目を追加", exact: true }).click();
  await settings.getByRole("searchbox").fill("心拍数");
  await settings.getByRole("checkbox", { name: "HR", exact: true }).check();
  await settings.getByRole("tab", { name: "項目", exact: true }).click();
  await expect(selectedHeartRate).toBeVisible();
  await settings.getByRole("button", { name: "Paneから外す: HR", exact: true }).click();
  await expect(selectedHeartRate).toHaveCount(0);
  await settings.getByRole("button", { name: "項目を追加", exact: true }).click();
  await settings.getByRole("searchbox").fill("心拍数");
  await settings.getByRole("checkbox", { name: "HR", exact: true }).check();
  await settings.getByRole("tab", { name: "項目", exact: true }).click();
  await expect(selectedHeartRate).toBeVisible();
  await expect(
    settings.getByRole("button", { name: "Paneを削除" }),
  ).toHaveCount(0);
  await settings.getByRole("button", { name: "キャンセル" }).click();
  await expect(settings).toBeHidden();

  await openPaneSettings(page, "Outputs");
  await expect(
    page
      .getByTestId("workbench-pane-picker-v3")
      .getByRole("button", { name: "HR (現在値)", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "キャンセル" }).click();

  await page.getByRole("button", { name: "Paneメニュー: Outputs" }).click();
  const outputPaneMenu = page.getByRole("menu", { name: "Outputs" });
  await expect(
    outputPaneMenu.getByRole("menuitem", { name: "右に分割" }),
  ).toBeVisible();
  await expect(
    outputPaneMenu.getByRole("menuitem", { name: "下に分割" }),
  ).toHaveCount(0);
  await page.keyboard.press("Escape");

  await expect(controlArea.locator(".dv-groupview")).toHaveCount(1);
  await controlArea.getByRole("button", { name: "Paneを追加" }).click();
  const addControlPicker = page.getByTestId("workbench-pane-picker-v3");
  await addControlPicker.getByRole("searchbox").fill("HR");
  await addControlPicker.getByRole("checkbox", { name: "HR", exact: true }).check();
  await addControlPicker.getByRole("button", { name: "追加", exact: true }).click();
  const controllerSettingsButtons = controlArea.getByRole("button", {
    name: /Paneメニュー: Parameters/,
  });
  await expect(controllerSettingsButtons).toHaveCount(2);
  const activeControllerSettings = controlArea
    .locator(".dv-tab.dv-active-tab")
    .getByRole("button", { name: "Paneメニュー: Parameters" });
  await expect(activeControllerSettings).toHaveCount(1);
  await expect(controlArea.locator(".dv-tab")).toHaveCount(2);
  await expect(controlArea.locator(".dv-groupview")).toHaveCount(1);

  await activeControllerSettings.click();
  const controllerPaneMenu = page.getByRole("menu", { name: "Parameters" });
  await expect(
    controllerPaneMenu.getByRole("menuitem", { name: "右に分割" }),
  ).toHaveCount(0);
  await controllerPaneMenu.getByRole("menuitem", { name: "下に分割" }).click();
  await expect(controlArea.locator(".dv-groupview")).toHaveCount(2);
  const upperControllerGroup = await controlArea
    .locator(".dv-groupview")
    .first()
    .boundingBox();
  const lowerControllerGroup = await controlArea
    .locator(".dv-groupview")
    .nth(1)
    .boundingBox();
  expect(lowerControllerGroup?.y ?? 0).toBeGreaterThan(
    upperControllerGroup?.y ?? 0,
  );
  // Exercise settings while the isolated formal family is still computing.
  // It must eventually replace the retained old-input drawing; use the same
  // bounded formal-analysis budget as the initial PV check, not a 20s SLA.
  await expect(page.locator(
    '[data-analysis-input-epoch][data-circulation-side="right"]',
  )).toHaveAttribute("data-analysis-input-epoch", String(changedEpoch), { timeout: 90_000 });
  await expect(page.getByTestId("workbench-structural-analysis-error")).toHaveCount(0);
  await expect(page.getByTestId("v3-runtime-error")).toHaveCount(0);
});

test("@desktop baseline duplication stays independent and requires explicit save", async ({
  page,
}) => {
  const root = page.getByTestId("v3-dockview-workbench");
  const scenarioRegion = page.getByRole("region", { name: "Scenarios" });
  const heartRate = page.getByRole("slider", { name: "HR" });
  await expect(heartRate).toBeEnabled();
  const baselineHeartRate = await heartRate.inputValue();
  const heartRateStep = Number(await heartRate.getAttribute("step") ?? "1");
  expect(Number.isFinite(heartRateStep)).toBe(true);
  expect(heartRateStep).toBeGreaterThan(0);
  const copyHeartRate = String(Number(baselineHeartRate) - heartRateStep);
  const changedCopyHeartRate = String(Number(copyHeartRate) - heartRateStep);
  await expect(
    scenarioRegion.getByRole("button", { name: /Scenarioメニュー:/ }),
  ).toHaveCount(1);
  const baselineMenuButton = scenarioRegion.getByRole("button", {
    name: "Scenarioメニュー: baseline",
  });
  await openScenarioMenu(page, scenarioRegion, "baseline");
  const baselineMenu = page.getByRole("menu", {
    name: "Scenarioメニュー: baseline",
  });
  await expect(baselineMenu.getByRole("menuitem").first()).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(baselineMenu).toBeHidden();
  await expect(baselineMenuButton).toBeFocused();
  await openScenarioMenu(page, scenarioRegion, "baseline");
  await page.getByRole("menuitem", { name: "複製" }).click();
  await expect(
    scenarioRegion.getByRole("button", { name: /Scenarioメニュー:/ }),
  ).toHaveCount(2);
  const immediateCopyEpoch = await inputEpoch(page);
  await expect(heartRate).toBeEnabled({ timeout: 5_000 });
  await expect(heartRate).toHaveValue(baselineHeartRate);
  await heartRate.press("ArrowLeft");
  await expect.poll(() => inputEpoch(page)).toBeGreaterThan(immediateCopyEpoch);
  await expect(heartRate).toHaveValue(copyHeartRate);
  await expect(
    page.getByRole("button", { name: "保存", exact: true }),
  ).toBeVisible();
  await expect(
    page.locator('[data-chart-kind="sweeping-waveform-v3"]'),
  ).toHaveCount(1);
  await expect(
    page.getByRole("button", {
      name: "baseline, LVP",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "baseline のコピー, LVP",
      exact: true,
    }),
  ).toBeVisible();

  const graphArea = page.getByRole("region", { name: "グラフエリア" });
  await graphArea.getByText("Pressure waveforms", { exact: true }).click();
  await openPaneSettings(page, "Pressure waveforms");
  const colorSettings = page.getByTestId("workbench-pane-picker-v3");
  await colorSettings.getByRole("button", { name: "LVP", exact: true }).click();
  const copyTraceColor = colorSettings.getByTestId("pane-trace-rows-v3").locator('[data-scenario-id]').nth(1).locator('input[type="color"]');
  const allocatedCopyLvp = await copyTraceColor.inputValue();
  await page.getByRole("button", { name: "閉じる" }).click();
  await expect(colorSettings).toBeHidden();
  const copyBaseColor = page.getByLabel("新しいtraceのbase色: baseline のコピー");
  await copyBaseColor.fill("#8b76d1");
  await expect(copyBaseColor).toHaveValue("#8b76d1");
  await openPaneSettings(page, "Pressure waveforms");
  await colorSettings.getByRole("button", { name: "LVP", exact: true }).click();
  await expect(copyTraceColor).toHaveValue(allocatedCopyLvp);
  await copyTraceColor.fill("#00a37a");
  await expect(copyTraceColor).toHaveValue("#00a37a");
  await colorSettings.getByRole("button", { name: "自動配色に戻す: baseline のコピー", exact: true }).click();
  await expect(copyTraceColor).toHaveValue(allocatedCopyLvp);
  await page.getByRole("button", { name: "閉じる" }).click();
  await expect(colorSettings).toBeHidden();

  const copyScenario = scenarioRegion.getByRole("button", {
    name: "baseline のコピー scenario/workbench-live-default-copy",
    exact: true,
  });
  await expect(copyScenario).toBeVisible();

  const pvTab = graphArea.locator(".dv-tab").filter({ hasText: "PV loop" });
  await pvTab.locator(".workbench-dock-tab").click();
  // The inherited production Surface keeps its formal periodic PV method
  // while Scenario duplication, live independence, and persistence remain
  // owned by this browser regression.
  await expect(
    page.locator('[data-chart-kind="pressure-volume-loop-v3"]'),
  ).toHaveAttribute("data-pv-loop-trace-count", "2");
  await expect(
    page.locator('[data-chart-kind="pressure-volume-loop-v3"]'),
  ).toHaveAttribute("data-pv-analysis-mode", "formal-periodic");

  await expect.poll(() => modelTime(root)).toBeGreaterThan(0.2);
  const playback = page.getByTestId("v3-playback-toggle");
  await playback.click();
  await expect(root).toHaveAttribute("data-playback", "paused");

  const baselineScenario = scenarioRegion.getByRole("button", {
    name: "baseline workbench-live-default",
    exact: true,
  });
  await baselineScenario.click();
  await expect(heartRate).toHaveValue(baselineHeartRate);
  const baselineCheckpointTime = await modelTime(root);

  await copyScenario.click();
  await expect(heartRate).toHaveValue(copyHeartRate);
  // Selection waits for global Pause to drain every lane, so this is the
  // exact copy time that the following explicit Save must capture.
  const copyCheckpointTime = await modelTime(root);

  // Save captures every exact branch, not only the active Scenario. Keep the
  // baseline active so reload must restore the inactive divergent copy from
  // its durable fixture + checkpoint rather than from live UI state.
  await baselineScenario.click();
  const save = page.getByTestId("v3-save-experiment");
  await save.click();
  await expect(save).toContainText("保存済み");
  await expect(root).toHaveAttribute("data-playback", "paused");

  await page.reload();
  await expect(root).toBeVisible();
  await expect(root).toHaveAttribute("data-model-id", DEFAULT_EXACT_MODEL_ID);
  await expect(
    scenarioRegion.getByRole("button", { name: /Scenarioメニュー:/ }),
  ).toHaveCount(2);

  const restoredBaseline = scenarioRegion.getByRole("button", {
    name: "baseline workbench-live-default",
    exact: true,
  });
  const restoredCopy = scenarioRegion.getByRole("button", {
    name: "baseline のコピー scenario/workbench-live-default-copy",
    exact: true,
  });
  await restoredBaseline.click();
  if ((await root.getAttribute("data-playback")) !== "playing") {
    await playback.click();
  }
  await expect(root).toHaveAttribute("data-playback", "playing");
  await expect
    .poll(() => modelTime(root), { timeout: 10_000, intervals: [100] })
    .toBeGreaterThan(baselineCheckpointTime + 0.08);

  await playback.click();
  await expect(root).toHaveAttribute("data-playback", "paused");
  // Scenario selection drains any final in-flight batches before adopting the
  // selected frame, making both post-reload times stable for comparison.
  await restoredCopy.click();
  await expect(heartRate).toHaveValue(copyHeartRate);
  await restoredBaseline.click();
  await expect(heartRate).toHaveValue(baselineHeartRate);
  const restoredBaselineTime = await modelTime(root);
  const baselineAutostartAdvance =
    restoredBaselineTime - baselineCheckpointTime;
  expect(baselineAutostartAdvance).toBeGreaterThan(0.02);

  await restoredCopy.click();
  await expect(heartRate).toHaveValue(copyHeartRate);
  const restoredCopyTime = await modelTime(root);
  const copyAutostartAdvance = restoredCopyTime - copyCheckpointTime;
  // The copy was never selected while playback ran. Its positive advancement
  // therefore proves that inactive Scenarios also simulate live, while the
  // bounded delta rejects a reset or hidden-tab debt replay.
  expect(copyAutostartAdvance).toBeGreaterThan(0.02);
  expect(
    Math.abs(copyAutostartAdvance - baselineAutostartAdvance),
  ).toBeLessThanOrEqual(0.25);

  // Mutating the restored copy remains branch-local after the durable
  // round-trip. The current model warm-starts only that branch from its accepted
  // state and clock; the baseline fixture and trajectory remain untouched.
  const restoredCopyEpoch = await inputEpoch(page);
  const restoredCopyTimeBeforeMutation = await modelTime(root);
  const restoredCopyRevisionBeforeMutation = await acceptedRevision(page);
  await heartRate.press("ArrowLeft");
  await expect(heartRate).toHaveValue(changedCopyHeartRate);
  await expect.poll(() => inputEpoch(page), { timeout: 30_000 })
    .toBeGreaterThan(restoredCopyEpoch);
  await expect.poll(() => modelTime(root))
    .toBeGreaterThan(restoredCopyTimeBeforeMutation - 0.01);
  await expect.poll(() => acceptedRevision(page)).toBeGreaterThanOrEqual(
    restoredCopyRevisionBeforeMutation,
  );
  await restoredBaseline.click();
  await expect(heartRate).toHaveValue(baselineHeartRate);
});

test("@desktop simulation information stays human-facing", async ({
  page,
}) => {
  await page.getByTestId("workbench-simulation-info-trigger-v3").click();
  const dialog = page.getByRole("dialog", { name: "シミュレーション情報" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("heading", { name: "シナリオの状態 · 1" }))
    .toBeVisible();
  await dialog.getByRole("tab", { name: "数理モデル" }).click();
  await expect(dialog.getByText("統合循環動態モデル", { exact: true }))
    .toBeVisible();
  await expect(dialog.getByText("検証と妥当性", { exact: true }))
    .toBeVisible();
  const documentationLink = dialog.getByRole("link", {
    name: "数理モデルの詳細を見る",
  });
  await expect(documentationLink).toBeVisible();
  expect(await documentationLink.getAttribute("href"))
    .toContain(`/ja/models/${DEFAULT_EXACT_MODEL_ID}?surface=`);
  const limitations = dialog.locator("details").filter({
    hasText: "制限事項",
  }).first();
  await limitations.locator("summary").click();
  await expect(limitations).toContainText(
    "AoP/PAPはAo/PA node圧",
  );
  await expect(limitations).toContainText(
    "局所ジェット、圧波の伝播・反射",
  );
  await expect(limitations).toContainText("弁尖の接触時刻を測るものではありません");
  await expect(dialog.getByText("数理モデルのbaseline検証", { exact: true }))
    .toBeVisible();
  await expect(dialog.getByText("LV τ (Weiss / Glantz)", { exact: true }))
    .toBeVisible();
  await expect(dialog.getByText("Exact model ID", { exact: true }))
    .toHaveCount(0);
  await expect(dialog.getByText("Fixture schema", { exact: true }))
    .toHaveCount(0);
  await expect(dialog.getByText("Checkpoint codec", { exact: true }))
    .toHaveCount(0);
  await expect(dialog.getByText("Snapshot gate", { exact: true }))
    .toHaveCount(0);

  const documentationPageOpened = page.context().waitForEvent("page");
  await documentationLink.click();
  const documentationPage = await documentationPageOpened;
  await expect(documentationPage).toHaveURL(new RegExp(`/ja/models/${DEFAULT_EXACT_MODEL_ID.replaceAll(".", "\\.")}\\?`));
  await expect(documentationPage.getByRole("heading", {
    name: /^Standard \d+のしくみ$/,
    level: 1,
  })).toBeVisible();
  await documentationPage.close();
});

test("@desktop deleting nested Scenario copies never renders a disposed lane", async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  const root = page.getByTestId("v3-dockview-workbench");
  const scenarioRegion = page.getByRole("region", { name: "Scenarios" });
  const labels = [
    "baseline",
    "baseline のコピー",
    "baseline のコピー のコピー",
    "baseline のコピー のコピー のコピー",
  ] as const;

  for (let index = 0; index < labels.length - 1; index += 1) {
    await openScenarioMenu(page, scenarioRegion, labels[index]!);
    await page
      .getByRole("menu", { name: `Scenarioメニュー: ${labels[index]}` })
      .getByRole("menuitem", { name: "複製" })
      .click();
    await expect(scenarioRegion.getByRole("button", {
      name: new RegExp(`^${labels[index + 1]}`),
    })).toBeVisible({ timeout: 30_000 });
  }

  for (let index = labels.length - 1; index > 0; index -= 1) {
    await openScenarioMenu(page, scenarioRegion, labels[index]!);
    await page
      .getByRole("menu", { name: `Scenarioメニュー: ${labels[index]}` })
      .getByRole("menuitem", { name: "削除" })
      .click();
    await expect(scenarioRegion.getByRole("button", {
      name: new RegExp(`^${labels[index]}`),
    })).toHaveCount(0, { timeout: 30_000 });
    await expect(root).toBeVisible();
    await expect(page.getByText("Something went wrong.")).toHaveCount(0);
  }

  expect(pageErrors.filter((message) =>
    message.includes("parallel Scenario not found")
  )).toEqual([]);
});

test("@mobile 390px Workbench uses a live Stage and one-scroll task deck", async ({
  page,
}) => {
  await expect(page.getByTestId("workbench-theme-toggle")).toBeHidden();
  await expect(page.getByRole("button", {
    name: "シミュレーションのメモ",
  })).toHaveCount(0);
  await page.getByTestId("workbench-simulation-info-trigger-v3").click();
  const simulationInfo = page.getByRole("dialog", {
    name: "シミュレーション情報",
  });
  await simulationInfo.getByRole("tab", {
    name: "シミュレーションのメモ",
  }).click();
  await expect(simulationInfo.getByPlaceholder(
    "このシミュレーションの解釈、制限事項、参考文献などを記入…",
  )).toBeVisible();
  await expect(simulationInfo.getByText("制限事項", { exact: false }))
    .toBeVisible();
  await simulationInfo.getByRole("button", { name: "閉じる" }).click();

  const rateTrigger = page.getByTestId("v3-playback-rate-trigger");
  await expect(rateTrigger).toBeVisible();
  await expect(rateTrigger).toContainText("×");
  await rateTrigger.click();
  const ratePopover = page.getByTestId("v3-playback-rate-popover");
  await expect(ratePopover).toBeVisible();
  await expect(
    ratePopover.getByRole("slider", { name: "再生速度を変更" }),
  ).toBeVisible();
  const rateSlider = ratePopover.getByRole("slider", {
    name: "再生速度を変更",
  });
  await expect(rateSlider).toBeEnabled();
  await expect(rateSlider).toHaveAttribute("min", "0.25");
  await expect(rateSlider).toHaveAttribute("step", "0.25");
  await expect(ratePopover.getByRole("button", {
    name: "0.25×",
    exact: true,
  })).toBeVisible();
  await expect(ratePopover.getByRole("button", {
    name: "0.5×",
    exact: true,
  })).toBeVisible();
  await expect(ratePopover.getByRole("button", {
    name: "1×",
    exact: true,
  })).toBeVisible();
  await expect(ratePopover.getByRole("button", {
    name: "2×",
    exact: true,
  })).toBeVisible();
  await expect(ratePopover.getByRole("button", {
    name: "5×",
    exact: true,
  })).toBeVisible();
  const maximumRate = Number(await rateSlider.getAttribute("max"));
  expect(maximumRate).toBeGreaterThanOrEqual(0.25);
  expect(maximumRate).toBeLessThanOrEqual(5);
  expect(maximumRate === 0.25 || Number.isInteger(maximumRate * 2)).toBe(true);

  const initialRate = Number(await rateSlider.inputValue());
  await rateSlider.press("ArrowRight");
  const selectedRate = Math.min(maximumRate, initialRate + 0.25);
  await expect(rateSlider).toHaveValue(String(selectedRate));
  await page.waitForTimeout(500);
  await expect(rateSlider).toHaveValue(String(selectedRate));
  await expect(rateTrigger).toContainText(`${selectedRate}×`);
  const ratePopoverBox = await ratePopover.boundingBox();
  expect(ratePopoverBox?.x ?? -1).toBeGreaterThanOrEqual(0);
  expect(
    (ratePopoverBox?.x ?? 0) + (ratePopoverBox?.width ?? 391),
  ).toBeLessThanOrEqual(390);
  await page.getByTestId("v3-playback-rate-backdrop").click();
  await expect(ratePopover).toBeHidden();

  const mobileShell = page.getByTestId("workbench-mobile-stage-deck");
  const graphArea = page.getByTestId("workbench-mobile-stage");
  const taskDeck = page.getByTestId("workbench-mobile-task-deck");
  const taskScroll = page.getByTestId("workbench-mobile-task-scroll");
  await expect(mobileShell).toBeVisible();
  await expect(graphArea).toBeVisible();
  await expect(taskDeck).toBeVisible();
  await expect(mobileShell.locator(".dv-groupview")).toHaveCount(0);
  await expect.poll(() => taskScroll.evaluate((element) =>
    getComputedStyle(element).overflowY)).toBe("auto");
  const graphBox = await graphArea.boundingBox();
  expect(graphBox?.width ?? 0).toBeGreaterThan(360);
  const graphRail = page.getByTestId("workbench-mobile-graph-view-rail");
  const graphTabs = graphRail.getByRole("tab");
  await expect(graphTabs).toHaveCount(3);
  const pvTab = graphRail.getByRole("tab", { name: "PV loop" });
  const guytonTab = graphRail.getByRole("tab", {
    name: "Systemic Guyton / Starling",
  });
  await expect(pvTab)
    .toHaveAttribute("aria-selected", "true");
  const pressureTab = graphRail.getByRole("tab", {
    name: "Pressure waveforms",
  });
  await pressureTab.click();
  await expect(pressureTab).toHaveAttribute("aria-selected", "true");
  await expectNonZeroCanvas(
    page.locator('[data-chart-kind="sweeping-waveform-v3"]'),
  );
  await pressureTab.press("ArrowLeft");
  await expect(guytonTab).toHaveAttribute("aria-selected", "true");
  await guytonTab.press("ArrowLeft");
  await expect(pvTab).toHaveAttribute("aria-selected", "true");
  await pressureTab.click();
  const addGraphView = graphRail.getByRole("button", {
    name: "グラフビューを追加",
  });
  await addGraphView.click();
  const graphAddSheet = page.getByRole("dialog", { name: "グラフを追加" });
  await expect(graphAddSheet).toBeVisible();
  await expect(
    graphAddSheet.locator("[data-graph-option-id]"),
  ).toHaveCount(5);
  await expect(graphAddSheet.getByText("PV loop", { exact: true })).toBeVisible();
  await graphAddSheet.getByRole("button", { name: "閉じる", exact: true })
    .click();
  await expect(graphAddSheet).toBeHidden();
  await expect(addGraphView).toBeFocused();

  await expect(taskDeck.getByRole("tab", { name: "コントロール" }))
    .toHaveAttribute("aria-selected", "true");
  const controlGroup = taskDeck.locator(
    '[data-mobile-pane-group-role="control"]',
  ).first();
  const controlGroupToggle = controlGroup.locator(
    ".workbench-mobile-pane-group-toggle",
  );
  await expect(controlGroupToggle).toHaveAttribute("aria-expanded", "true");
  await expect(
    page.getByRole("slider", { name: "HR" }),
  ).toBeVisible();
  await controlGroupToggle.click();
  await expect(controlGroupToggle).toHaveAttribute("aria-expanded", "false");
  await expect(
    page.getByRole("slider", { name: "HR" }),
  ).toBeHidden();
  await controlGroupToggle.click();
  await taskDeck.getByRole("tab", { name: "出力" }).click();
  const outputGroup = taskDeck.locator(
    '[data-mobile-pane-group-role="output"]',
  ).first();
  const outputGroupToggle = outputGroup.locator(
    ".workbench-mobile-pane-group-toggle",
  );
  await expect(outputGroupToggle).toHaveAttribute("aria-expanded", "true");
  await expect(outputGroup.getByText("AoP", { exact: true }))
    .toBeVisible();
  await outputGroupToggle.click();
  await expect(outputGroup.getByText("AoP", { exact: true }))
    .toBeHidden();
  await outputGroupToggle.click();
  await taskDeck.getByRole("tab", { name: "Scenario" }).click();
  await expect(
    taskDeck.getByTestId("workbench-scenario-manager-v3"),
  ).toHaveAttribute("data-scenario-manager-variant", "embedded-mobile");
  await taskDeck.getByRole("tab", { name: "コントロール" }).click();
  await taskDeck.locator('[data-testid="pane-settings-button-v3"]').first()
    .click();
  const settings = page.getByTestId("workbench-pane-picker-v3");
  await expect(settings).toBeVisible();
  await expect(settings.locator("[data-selected-item-id]")).toHaveCount(7);
  await expect(settings.getByRole("button", { name: /Paneから外す:/ })).toHaveCount(7);
  await settings.getByRole("button", { name: "項目を追加", exact: true }).click();
  await expect(settings.getByRole("searchbox")).toBeVisible();
  await expect(settings.getByTestId("pane-catalog-sections-v3")).toBeVisible();
  await expect(settings.getByTestId("pane-catalog-sections-v3").getByRole("button", { expanded: false })).toHaveCount(8);
  const box = (await settings.boundingBox())!;
  expect(box.width).toBeGreaterThan(300);
  expect(box.x + box.width).toBeLessThanOrEqual(390);
  await settings.getByRole("tab", { name: "項目", exact: true }).click();
  await settings.getByRole("button", { name: "HR", exact: true }).click();
  await expect(settings.getByRole("radio", { name: "スライダー" })).toHaveAttribute("aria-checked", "true");
  await expect(settings.getByText("プレビュー", { exact: true })).toBeVisible();
  await settings.getByRole("radio", { name: "カスタムボタン" }).click();
  await expect(settings.getByRole("radio", { name: "カスタムボタン" })).toHaveAttribute("aria-checked", "true");
  await expect(settings.getByRole("button", { name: "適用", exact: true })).toBeVisible();
  await settings.getByRole("button", { name: "キャンセル" }).click();
});

async function modelTime(root: Locator): Promise<number> {
  const raw = await root.getAttribute("data-model-time-sec");
  const value = Number(raw);
  if (!Number.isFinite(value)) throw new Error(`invalid model time ${raw}`);
  return value;
}

async function acceptedRevision(page: Page): Promise<number> {
  const raw = await page
    .getByTestId("v3-dockview-workbench")
    .getAttribute("data-accepted-revision");
  return Number(raw ?? -1);
}

async function inputEpoch(page: Page): Promise<number> {
  const raw = await page
    .getByTestId("v3-dockview-workbench")
    .getAttribute("data-input-epoch");
  return Number(raw ?? -1);
}

async function expectNonZeroCanvas(container: Locator): Promise<void> {
  const target = container.first();
  await expect(target).toBeVisible();
  const canvas = target.locator("canvas");
  await expect(canvas).toBeVisible();
  await expect
    .poll(async () => {
      const box = await canvas.boundingBox();
      return (box?.width ?? 0) * (box?.height ?? 0);
    })
    .toBeGreaterThan(10_000);
}

async function expectDockTabAccent(tab: Locator): Promise<void> {
  await expect(tab).toBeVisible();
  await expect.poll(() => tab.evaluate((element) => {
    const style = getComputedStyle(element, "::before");
    return style.content !== "none" &&
      style.backgroundColor !== "transparent" &&
      style.backgroundColor !== "rgba(0, 0, 0, 0)";
  })).toBe(true);
}

async function openPaneSettings(page: Page, paneTitle: string): Promise<void> {
  await page
    .getByRole("button", {
      name: `Paneメニュー: ${paneTitle}`,
    })
    .click();
  await page
    .getByRole("menu", { name: paneTitle })
    .getByRole("menuitem", { name: "Pane設定" })
    .click();
}

async function openScenarioMenu(
  page: Page,
  scenarioRegion: Locator,
  scenarioLabel: string,
): Promise<void> {
  await scenarioRegion
    .getByRole("button", {
      name: `Scenarioメニュー: ${scenarioLabel}`,
    })
    .click();
  await expect(
    page.getByRole("menu", {
      name: `Scenarioメニュー: ${scenarioLabel}`,
    }),
  ).toBeVisible();
}

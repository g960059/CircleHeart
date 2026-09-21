import { test, expect, type Page, type Locator } from "@playwright/test";

test.use({ actionTimeout: 10_000 });

test.beforeEach(async ({ page }) => {
  // Never send verification writes to the developer's configured database.
  await page.route("**/rest/v1/rpc/save_experiment_v1", route => route.abort("blockedbyclient"));
  await page.goto("/ja/experiments/new");
  await expect(page.getByTestId("v3-dockview-workbench")).toBeVisible();
  await expect.poll(async () => Number(await page.getByTestId("v3-dockview-workbench").getAttribute("data-accepted-revision"))).toBeGreaterThan(10);
  await page.getByTestId("v3-playback-toggle").click();
});

function ui(page: Page) {
  const mobile = (page.viewportSize()?.width ?? 1440) < 768;
  const picker = page.getByTestId("workbench-pane-picker-v3");
  const settings = picker;
  const graphs = mobile ? page.getByTestId("workbench-mobile-stage") : page.getByRole("region", { name: "グラフエリア" });
  const task = async (name: string) => { if (mobile) await page.getByTestId("workbench-mobile-task-deck").getByRole("tab", { name, exact: true }).click(); };
  const addGraph = async () => {
    if (mobile) await graphs.getByRole("button", { name: "グラフビューを追加", exact: true }).click();
    else await graphs.getByRole("button", { name: "Paneを追加", exact: true }).last().click();
  };
  const addPane = async (kind: "output" | "control") => {
    await task(kind === "output" ? "出力" : "コントロール");
    if (mobile) await page.locator(`[data-mobile-pane-groups="${kind}"] .workbench-mobile-pane-group-add`).click();
    else await page.getByRole("region", { name: kind === "output" ? "出力エリア" : "コントロールエリア" }).getByRole("button", { name: "Paneを追加", exact: true }).click();
  };
  return { mobile, picker, settings, graphs, task, addGraph, addPane };
}

async function checkBounds(page: Page, target: Locator) {
  const box = (await target.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
  expect(await target.evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
}


async function openItems(page: Page, title: string, area: "graph" | "output" | "control" = "graph") {
  const { mobile, task, graphs } = ui(page);
  if (area !== "graph") await task(area === "output" ? "出力" : "コントロール");
  if (area === "graph" && mobile) await graphs.getByRole("tab", { name: title, exact: true }).click();
  else if (!mobile) await page.locator(".workbench-dock-tab").getByText(title, { exact: true }).click();
  await page.getByRole("button", { name: `Pane設定: ${title}`, exact: true }).click();
}
async function items(picker: Locator) { await picker.getByRole("tab", { name: "項目", exact: true }).click(); }
async function renamePane(picker: Locator, title: string, tab = "表示") {
  await picker.getByRole("tab", { name: tab, exact: true }).click();
  await picker.getByRole("textbox", { name: "Pane名", exact: true }).fill(title);
  await picker.getByRole("textbox", { name: "Pane名", exact: true }).press("Enter");
}
const selectedRow = (picker: Locator, id: string) => picker.locator(`[data-selected-item-id="${id}"]`);

async function samplePopupBounds(popup: Locator) {
  return popup.evaluate(async element => {
    const bounds = [];
    for (let frame = 0; frame < 4; frame++) {
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      const { x, y, width, height } = element.getBoundingClientRect();
      bounds.push({ x, y, width, height });
    }
    return bounds;
  });
}

async function expectPopupOrigin(popup: Locator, origin: { x: number; y: number }) {
  for (const bounds of await samplePopupBounds(popup)) {
    expect(Math.abs(bounds.x - origin.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(bounds.y - origin.y)).toBeLessThanOrEqual(1);
  }
}

test("@desktop @pane-picker retains its opening position through item expansion, tabs and catalog changes", async ({ page }, testInfo) => {
  const { picker } = ui(page);
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  for (const [title, item, area] of [["Pressure waveforms", "AoP", "graph"], ["Parameters", "HR", "control"], ["Outputs", "CVP", "output"], ["PV loop", "LV", "graph"]] as const) {
    await openItems(page, title, area);
    const origin = (await samplePopupBounds(picker)).at(-1)!;
    await picker.getByRole("button", { name: item, exact: true }).click();
    await expectPopupOrigin(picker, origin);
    await checkBounds(page, picker);
    await expect(picker.getByRole("button", { name: "適用", exact: true })).toBeInViewport();
    if (title === "Pressure waveforms") await page.screenshot({ path: testInfo.outputPath("expanded-waveform-stays-anchored.png") });
    if (area === "control") {
      await picker.getByRole("radio", { name: "カスタムボタン", exact: true }).click();
      await picker.getByRole("button", { name: "Buttonを追加", exact: true }).click();
      await expectPopupOrigin(picker, origin);
      await expect(picker.getByRole("button", { name: "適用", exact: true })).toBeInViewport();
    }
    await picker.getByRole("button", { name: item, exact: true }).click();
    await expectPopupOrigin(picker, origin);
    await picker.getByRole("tab", { name: area === "graph" ? "表示" : "対象", exact: true }).click();
    await expectPopupOrigin(picker, origin);
    await items(picker);
    await picker.getByRole("button", { name: "項目を追加", exact: true }).click();
    await expectPopupOrigin(picker, origin);
    if (area !== "graph") {
      await picker.getByRole("button", { name: "循環動態", exact: true }).click();
      await expectPopupOrigin(picker, origin);
      await picker.getByRole("searchbox").fill("zzzz-no-matches");
      await expectPopupOrigin(picker, origin);
      await picker.getByRole("searchbox").fill("");
      await expectPopupOrigin(picker, origin);
    }
    await checkBounds(page, picker);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: `Pane設定: ${title}`, exact: true })).toBeFocused();
  }
  expect(errors).toEqual([]);
});

test("@desktop @pane-picker keeps the preset popup in place through search and details on a short viewport", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 480 });
  await page.getByRole("button", { name: "Presetから追加", exact: true }).click();
  const presets = page.getByTestId("workbench-preset-picker-v3");
  const origin = (await samplePopupBounds(presets)).at(-1)!;
  await presets.getByRole("searchbox").fill("zzzz-no-matches");
  await expectPopupOrigin(presets, origin);
  await presets.getByRole("searchbox").fill("");
  await expectPopupOrigin(presets, origin);
  await presets.getByRole("button", { name: "baseline: 詳細", exact: true }).click();
  await expectPopupOrigin(presets, origin);
  await checkBounds(page, presets);
  await presets.getByRole("button", { name: "一覧に戻る", exact: true }).click();
  await expectPopupOrigin(presets, origin);
});

test("@desktop @mobile @pane-picker adapts to viewport changes while retaining a usable scroll area", async ({ page }) => {
  const { picker } = ui(page);
  await openItems(page, "Pressure waveforms");
  await picker.getByRole("button", { name: "AoP", exact: true }).click();
  await page.setViewportSize({ width: 900, height: 480 });
  const resizedOrigin = (await samplePopupBounds(picker)).at(-1)!;
  await checkBounds(page, picker);
  await expect(picker.getByRole("button", { name: "適用", exact: true })).toBeInViewport();
  await picker.getByRole("button", { name: "AoP", exact: true }).click();
  await expectPopupOrigin(picker, resizedOrigin);
  await page.setViewportSize({ width: 390, height: 480 });
  for (const action of ["expand", "collapse"]) {
    await picker.getByRole("button", { name: "AoP", exact: true }).click();
    for (const bounds of await samplePopupBounds(picker)) expect(Math.abs(bounds.y + bounds.height - 472)).toBeLessThanOrEqual(1);
    await checkBounds(page, picker);
    await expect(picker.getByRole("button", { name: "適用", exact: true })).toBeInViewport();
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  const restoredOrigin = (await samplePopupBounds(picker)).at(-1)!;
  await picker.getByRole("button", { name: "AoP", exact: true }).click();
  await expectPopupOrigin(picker, restoredOrigin);
  await checkBounds(page, picker);
  await page.keyboard.press("Escape");
});

test("@desktop @mobile @pane-picker scopes settings to the pane body and keeps the existing pane menu", async ({ page }, testInfo) => {
  const { mobile, graphs, picker, task } = ui(page);
  for (const title of ["PV loop", "Pressure waveforms"]) {
    await openItems(page, title);
    await expect(picker.getByTestId("pane-selected-items-v3")).toBeVisible();
    await expect(picker.getByRole("searchbox")).toHaveCount(0);
    await checkBounds(page, picker);
    await picker.getByRole("button", { name: "項目を追加", exact: true }).click();
    await expect(picker.getByRole("searchbox")).toHaveCount(title === "PV loop" ? 0 : 1);
    await page.keyboard.press("Escape");
    await expect(picker).toBeHidden();
    await expect(page.getByRole("button", { name: `Pane設定: ${title}`, exact: true })).toBeFocused();
  }
  for (const row of await graphs.locator('[data-chart-legend-row="true"]:visible').all()) {
    await expect(row).toHaveCSS("padding-top", "0px");
    await expect(row.getByTestId("pane-settings-button-v3")).toHaveCount(1);
  }
  await expect(graphs.locator(mobile ? ".workbench-mobile-graph-view-rail" : ".dv-tabs-and-actions-container").getByTestId("pane-settings-button-v3")).toHaveCount(0);
  if (mobile) await graphs.getByRole("tab", { name: "Systemic Guyton / Starling", exact: true }).click();
  else await graphs.locator(".workbench-dock-tab").getByText("Systemic Guyton / Starling", { exact: true }).click();
  await page.getByRole("button", { name: "Pane設定: Systemic Guyton / Starling", exact: true }).click();
  await expect(picker.getByTestId("pane-selected-items-v3")).toHaveCount(0);
  await expect(picker.getByRole("searchbox")).toHaveCount(0);
  await expect(picker.locator('input[type="color"]')).toHaveCount(1);
  await checkBounds(page, picker);
  await page.keyboard.press("Escape");
  if (!mobile) {
    await graphs.getByRole("button", { name: "Paneメニュー: Systemic Guyton / Starling", exact: true }).click();
    const menu = page.getByRole("menu");
    await expect(menu.getByRole("menuitem", { name: /名前/ })).toBeVisible();
    await menu.getByRole("menuitem", { name: "Pane設定", exact: true }).click();
    await expect(picker.locator('input[type="color"]')).toHaveCount(1);
    await page.keyboard.press("Escape");
  }
  for (const area of ["output", "control"] as const) {
    await task(area === "output" ? "出力" : "コントロール");
    const buttons = mobile ? page.locator(`[data-mobile-pane-group-role="${area}"]`).getByTestId("pane-settings-button-v3") : page.getByRole("region", { name: area === "output" ? "出力エリア" : "コントロールエリア" }).getByTestId("pane-settings-button-v3");
    await buttons.first().click();
    await expect(picker.getByTestId("pane-selected-items-v3")).toBeVisible();
    await expect(picker.locator('input[type="color"]')).toHaveCount(0);
    await page.keyboard.press("Escape");
    if (mobile) {
      const group = page.locator(`[data-mobile-pane-group-role="${area}"]`).first();
      // The sole pane in a one-Scenario session needs no redundant heading;
      // its binding/items editor remains available in the pane body.
      await expect(group.locator(".workbench-mobile-pane-group-toggle")).toHaveCount(0);
      await expect(group.getByTestId("pane-settings-button-v3")).toHaveCount(1);
    }
  }
  await page.screenshot({ path: testInfo.outputPath("shared-pane-headers.png") });
});

test("@desktop @mobile @pane-picker preserves PV draft details, reorder, zero selection and display controls", async ({ page }, testInfo) => {
  const { mobile, picker, graphs, addGraph } = ui(page);
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  const tabs = graphs.locator(mobile ? '[role="tab"]' : ".dv-tab");
  const count = await tabs.count();
  await addGraph();
  await expect(picker.locator("[data-graph-option-id]")).toHaveText(["PV loop", "圧波形", "流量波形", "体循環 Guyton / Starling（CVP）", "肺循環 Guyton / Starling（PCWP）"]);
  await expect(picker.getByRole("searchbox")).toHaveCount(0);
  await picker.getByRole("button", { name: "PV loop", exact: true }).click();
  await expect(picker.getByRole("checkbox")).toHaveCount(4);
  await expect(picker.getByRole("checkbox", { checked: true })).toHaveCount(0);
  await expect(picker.getByRole("button", { name: "表示", exact: true })).toBeDisabled();
  await picker.getByRole("checkbox", { name: "LA", exact: true }).check();
  await expect(tabs).toHaveCount(count);
  await expect(picker.locator("footer")).not.toContainText("LA");
  await items(picker);
  await selectedRow(picker, "LA").getByRole("button", { name: "LA", exact: true }).click();
  await expect(selectedRow(picker, "LA").getByRole("button", { name: "LA", exact: true })).toHaveAttribute("aria-expanded", "true");
  await picker.locator('input[type="color"]').fill("#008877");
  await picker.getByRole("textbox", { name: "ラベル", exact: true }).fill("LA custom");
  // Clicking another control must commit the field without swallowing that click.
  await picker.getByRole("tab", { name: "表示", exact: true }).click();
  await renamePane(picker, "Atrial PV");
  const previousResults = picker.getByRole("group", { name: "変更前の結果", exact: true });
  const recentBeats = picker.getByRole("group", { name: "最近の拍", exact: true });
  await previousResults.getByRole("radio", { name: "3", exact: true }).locator("..").click();
  await expect(recentBeats.getByRole("radio", { name: "2", exact: true })).toBeChecked();
  await picker.getByRole("button", { name: /^PVA/ }).click();
  await picker.getByRole("button", { name: /^包絡線/ }).click();
  await items(picker);
  await selectedRow(picker, "LA").getByRole("button", { name: "Paneから外す: LA custom", exact: true }).click();
  await expect(picker.getByRole("button", { name: "表示", exact: true })).toBeDisabled();
  await picker.getByRole("button", { name: "項目を追加", exact: true }).click();
  await picker.getByRole("checkbox", { name: "LA", exact: true }).check();
  await picker.getByRole("checkbox", { name: "LV", exact: true }).check();
  await items(picker);
  await selectedRow(picker, "LV").getByRole("button", { name: /上へ/ }).click();
  expect(await picker.locator("[data-selected-item-id]").evaluateAll(els => els.map(el => el.getAttribute("data-selected-item-id")))).toEqual(["LV", "LA"]);
  await selectedRow(picker, "LA").getByRole("button", { name: "LA custom", exact: true }).click();
  await expect(picker.locator('input[type="color"]')).toHaveValue("#008877");
  await expect(picker.getByRole("textbox", { name: "ラベル", exact: true })).toHaveValue("LA custom");
  await checkBounds(page, picker);
  await page.screenshot({ path: testInfo.outputPath("compact-pv-editor.png") });
  await picker.getByRole("tab", { name: "表示", exact: true }).click();
  await expect(previousResults.getByRole("radio", { name: "3", exact: true })).toBeChecked();
  await expect(recentBeats.getByRole("radio", { name: "2", exact: true })).toBeChecked();
  await expect(picker.getByRole("button", { name: /^PVA/ })).toHaveAttribute("aria-pressed", "true");
  await picker.getByRole("button", { name: "表示", exact: true }).click();
  await expect(tabs).toHaveCount(count + 1);
  if (!mobile) {
    const group = graphs.locator(".dv-groupview").filter({ has: page.locator(".dv-tab").filter({ hasText: "Atrial PV" }) });
    await expect(group.locator(".dv-tab")).toHaveCount(2);
    await expect(group).toContainText("Pressure waveforms");
    await expect(group.getByTestId("pane-settings-button-v3")).toHaveCount(1);
  }
  await openItems(page, "Atrial PV");
  await selectedRow(picker, "LA").getByRole("button", { name: "LA custom", exact: true }).click();
  await picker.locator('input[type="color"]').fill("#aa2233");
  await picker.getByRole("button", { name: "キャンセル", exact: true }).click();
  await openItems(page, "Atrial PV");
  await selectedRow(picker, "LA").getByRole("button", { name: "LA custom", exact: true }).click();
  await expect(picker.locator('input[type="color"]')).toHaveValue("#008877");
  await page.keyboard.press("Escape");
  await addGraph(); await picker.getByRole("button", { name: "圧波形", exact: true }).click();
  await picker.getByRole("checkbox", { name: "AoP", exact: true }).check();
  await picker.getByRole("tab", { name: "表示", exact: true }).click();
  await picker.getByRole("slider", { name: "表示時間幅", exact: true }).fill("2.5");
  await items(picker); await picker.getByRole("tab", { name: "表示", exact: true }).click();
  await expect(picker.getByRole("slider", { name: "表示時間幅", exact: true })).toHaveValue("2.5");
  await page.keyboard.press("Escape");
  await expect(tabs).toHaveCount(count + 1);
  expect(errors).toEqual([]);
});

test("@desktop @mobile @pane-picker browses sections and searches all categories with clinical display units", async ({ page }, testInfo) => {
  const { picker, addPane } = ui(page);
  await addPane("output");
  const sections = picker.getByTestId("pane-catalog-sections-v3");
  await expect(sections.getByRole("button", { expanded: false })).toHaveCount(9);
  await expect(picker.getByRole("checkbox")).toHaveCount(0);
  await checkBounds(page, picker);
  await page.screenshot({ path: testInfo.outputPath("output-catalog-sections.png") });
  const hemodynamics = sections.getByRole("button", { name: "循環動態", exact: true });
  await hemodynamics.click();
  await expect(hemodynamics).toHaveAttribute("aria-expanded", "true");
  await sections.getByRole("button", { name: "リズム", exact: true }).click();
  await expect(picker.getByRole("searchbox")).toBeInViewport();
  // A closed section is still searchable, and clearing the query restores the open sections.
  await picker.getByRole("searchbox").fill("arterial");
  const saturation = picker.locator('[data-item-id="oxygen.saturation.arterial"]');
  await expect(saturation.getByTestId("pane-catalog-unit-v3")).toHaveText("%");
  await saturation.getByRole("checkbox").check();
  await picker.getByRole("searchbox").fill("LVEF");
  const ef = picker.locator('[data-item-id="presentation.output-method.LV-ejection-fraction"]');
  await expect(ef.getByTestId("pane-catalog-unit-v3")).toHaveText("%");
  await picker.getByRole("searchbox").fill("");
  await expect(hemodynamics).toHaveAttribute("aria-expanded", "true");
  await expect(sections.getByRole("button", { name: "リズム", exact: true })).toHaveAttribute("aria-expanded", "true");
  await expect(sections.getByRole("button", { name: "酸素運搬", exact: true })).toHaveAttribute("aria-expanded", "false");
  await sections.getByRole("button", { name: "酸素運搬", exact: true }).click();
  await expect(saturation.getByRole("checkbox")).toBeChecked();
  await picker.getByRole("button", { name: "キャンセル", exact: true }).click();
  await addPane("control");
  await expect(sections.getByRole("button", { expanded: false })).toHaveCount(8);
  await picker.getByRole("searchbox").fill("RER");
  const rer = picker.locator('[data-item-id="oxygen.respiratory-exchange-ratio"]');
  await expect(rer).toBeVisible();
  await expect(rer.getByTestId("pane-catalog-unit-v3")).toHaveCount(0);
  await rer.getByRole("checkbox").check();
  await items(picker);
  await selectedRow(picker, "oxygen.respiratory-exchange-ratio").getByRole("button", { name: "呼吸交換比", exact: true }).click();
  await expect(picker.locator(".workbench-control-inspector-preview output")).toHaveText("0.8");
  await picker.getByRole("radio", { name: "カスタムボタン", exact: true }).click();
  await expect(picker.getByRole("spinbutton").first()).not.toHaveAccessibleName(/\(1\)/);
  await checkBounds(page, picker);
  await page.keyboard.press("Escape");
});

test("@desktop @mobile @pane-picker prioritizes clinical quantities while retaining searchable waveform values", async ({ page }, testInfo) => {
  const { mobile, picker, addPane } = ui(page);
  await addPane("output");
  await picker.getByRole("button", { name: "弁", exact: true }).click();
  const forward = picker.locator('[data-item-id="hemodynamics.valve-volume.forward.MV"]');
  const instant = picker.locator('[data-item-id="hemodynamics.flow.valve.MV"]');
  const fold = picker.locator('[data-catalog-waveforms="valves"]');
  await expect(forward.getByRole("checkbox")).toHaveAccessibleName("MV 流入量");
  await expect(instant).toHaveCount(0);
  await expect(fold.getByRole("button")).toHaveAttribute("aria-expanded", "false");
  await checkBounds(page, picker);
  await page.screenshot({ path: testInfo.outputPath("clinical-valve-outputs.png") });
  const origin = (await picker.boundingBox())!;
  await fold.getByRole("button").click();
  if ((page.viewportSize()?.width ?? 0) >= 768) await expectPopupOrigin(picker, origin);
  await expect(instant.getByRole("checkbox")).toHaveAccessibleName("MV 流量");
  await instant.getByRole("checkbox").check();
  await fold.getByRole("button", { expanded: true }).click();
  await expect(fold).toContainText("1選択");
  await picker.getByRole("searchbox").fill("MV instantaneous");
  await expect(instant.getByRole("checkbox")).toBeChecked();
  await expect(forward).toHaveCount(0);
  await picker.getByRole("searchbox").fill("MV forward volume");
  await expect(forward).toBeVisible();
  await forward.getByRole("checkbox").check();
  await picker.getByRole("searchbox").fill("");
  await expect(instant).toHaveCount(0);
  await expect(fold.getByRole("button")).toHaveAttribute("aria-expanded", "false");
  await picker.getByRole("button", { name: "リズム", exact: true }).click();
  await expect(picker.locator('[data-item-id="rhythm.heart-rate.instantaneous"]')).toBeVisible();
  await items(picker);
  await expect(selectedRow(picker, "hemodynamics.flow.valve.MV")).toBeVisible();
  await expect(selectedRow(picker, "hemodynamics.valve-volume.forward.MV")).toBeVisible();
  await picker.getByRole("button", { name: "追加", exact: true }).click();
  const outputArea = mobile ? page.getByTestId("workbench-mobile-task-scroll") : page.getByRole("region", { name: "出力エリア" });
  const tile = outputArea.locator('.workbench-output-item[data-output-id*="hemodynamics.flow.valve.MV"]');
  await expect(tile.getByTestId("output-value-context-v3")).toHaveText("現在値");
  await addPane("control");
  await picker.getByRole("searchbox").fill("左室収縮性");
  const lv = picker.locator('[data-item-id="myocardium.lv-contractility"]');
  await expect(lv.getByRole("checkbox")).toHaveAccessibleName("LV 収縮性");
  await lv.getByRole("checkbox").check();
  await picker.getByRole("searchbox").fill("AoV maximum");
  await expect(picker.locator('[data-item-id="valve.maximum-forward-eoa-cm2.AoV"]')).toContainText("AV 弁口面積");
  await expect(picker.locator("[data-catalog-waveforms]")).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath("clinical-control-search.png") });
  await page.keyboard.press("Escape");
});

test("@desktop @mobile @pane-picker chooses output methods in details and compares them without duplicate catalog entries", async ({ page }, testInfo) => {
  const { picker, addPane } = ui(page);
  const pressure = "hemodynamics.pressure-gradient.valve.mean-hydraulic-forward.AoV";
  const velocity = "hemodynamics.pressure-gradient.mean-bernoulli-jet.AoV";
  const ef = "hemodynamics.ejection-fraction.LV-event-defined";
  const extrema = "hemodynamics.ejection-fraction.LV-extrema";
  const short = "hemodynamics.pressure-rate.maximum-accepted-step.absolute.LV";
  const windowed = "hemodynamics.pressure-rate.maximum-windowed-10ms.absolute.LV";
  await addPane("output");
  for (const [query, label] of [["AV 平均圧較差", "AV 平均圧較差"], ["LVEF", "LVEF"], ["LV +dP/dt (10 ms)", "LV +dP/dt"]]) {
    await picker.getByRole("searchbox").fill(query!);
    await expect(picker.getByRole("checkbox", { name: label, exact: true })).toHaveCount(1);
    await picker.getByRole("checkbox", { name: label, exact: true }).check();
  }
  await items(picker);
  for (const id of [pressure, ef, short]) await expect(selectedRow(picker, id)).toBeVisible();
  await selectedRow(picker, pressure).getByRole("button", { name: "AV 平均圧較差", exact: true }).click();
  const origin = (await picker.boundingBox())!;
  await selectedRow(picker, pressure).getByRole("combobox", { name: "計算方法" }).selectOption(velocity);
  await expect(selectedRow(picker, pressure)).toHaveCount(0);
  const velocityRow = selectedRow(picker, velocity);
  await expect(velocityRow.getByRole("combobox")).toHaveValue(velocity);
  await expect(velocityRow.getByRole("combobox")).toBeFocused();
  await expect(velocityRow.getByTestId("output-method-settings-v3")).toContainText("4v²");
  await expectPopupOrigin(picker, origin);
  await velocityRow.getByRole("textbox").fill("圧較差の比較");
  await velocityRow.getByRole("textbox").press("Enter");
  await velocityRow.getByRole("button", { name: "「圧から計算」も追加して比較", exact: true }).click();
  await expect(velocityRow.getByRole("combobox").locator(`option[value="${pressure}"]`)).toHaveJSProperty("disabled", true);
  await checkBounds(page, picker);
  await page.screenshot({ path: testInfo.outputPath("output-method-comparison-settings.png") });
  await selectedRow(picker, ef).getByRole("button", { name: "LVEF", exact: true }).click();
  await selectedRow(picker, ef).getByRole("combobox").selectOption(extrema);
  await expect(selectedRow(picker, extrema).getByTestId("output-method-settings-v3")).toContainText("最大容積");
  await selectedRow(picker, short).getByRole("button", { name: "LV +dP/dt", exact: true }).click();
  await selectedRow(picker, short).getByRole("combobox", { name: "時間幅" }).selectOption(windowed);
  await expect(selectedRow(picker, windowed).getByTestId("output-method-settings-v3")).toContainText("10 ms間");
  await picker.getByRole("button", { name: "項目を追加", exact: true }).click();
  await picker.getByRole("searchbox").fill("LV +dP/dt (10 ms)");
  const rate = picker.getByRole("checkbox", { name: "LV +dP/dt", exact: true });
  await rate.uncheck();
  await rate.check();
  await items(picker);
  await expect(selectedRow(picker, windowed)).toBeVisible();
  await expect(selectedRow(picker, short)).toHaveCount(0);
  await renamePane(picker, "Method comparison", "対象");
  await picker.getByRole("button", { name: "追加", exact: true }).click();
  const tile = (id: string) => page.locator(`.workbench-output-item[data-output-id="${id}"]`);
  await page.getByTestId("v3-playback-toggle").click();
  for (const id of [velocity, windowed]) await expect(tile(id)).toHaveAttribute("data-output-availability", "available");
  await page.getByTestId("v3-playback-toggle").click();
  await expect(tile(pressure).getByTestId("output-method-context-v3")).toHaveText("圧から計算");
  await expect(tile(velocity).getByTestId("output-method-context-v3")).toHaveText("流速から推定");
  await expect(tile(velocity).locator(".workbench-output-label")).toHaveText("圧較差の比較");
  for (const id of [extrema, windowed]) await expect(tile(id).getByTestId("output-method-context-v3")).toHaveCount(0);
  await tile(velocity).scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath("short-output-labels.png") });
  await openItems(page, "Method comparison", "output");
  await selectedRow(picker, pressure).getByRole("button", { name: "Paneから外す: AV 平均圧較差", exact: true }).click();
  await picker.getByRole("button", { name: "キャンセル", exact: true }).click();
  await expect(tile(pressure)).toBeVisible();
  await openItems(page, "Method comparison", "output");
  await selectedRow(picker, pressure).getByRole("button", { name: "Paneから外す: AV 平均圧較差", exact: true }).click();
  await picker.getByRole("button", { name: "適用", exact: true }).click();
  await expect(tile(pressure)).toHaveCount(0);
  await expect(tile(velocity).getByTestId("output-method-context-v3")).toHaveCount(0);
});

test("@desktop @mobile @pane-picker creates only chosen outputs and preserves custom controller buttons", async ({ page }, testInfo) => {
  const { mobile, picker, addPane } = ui(page);
  await addPane("output");
  await expect(picker.getByRole("checkbox", { checked: true })).toHaveCount(0);
  for (const name of ["CVP", "CO"]) {
    await picker.getByRole("searchbox").fill(name);
    await picker.getByRole("checkbox", { name, exact: true }).check();
  }
  await renamePane(picker, "Selected outputs", "対象");
  await picker.getByRole("button", { name: "追加", exact: true }).click();
  const outputGrid = mobile ? page.locator('[data-mobile-pane-group-role="output"]').filter({ hasText: "Selected outputs" }).locator(".workbench-output-grid") : page.locator(".workbench-output-grid:visible");
  await expect(outputGrid.locator(".workbench-output-label")).toHaveText(["CVP", "CO"]);
  await addPane("control");
  await picker.getByRole("searchbox").fill("HR");
  await picker.getByRole("checkbox", { name: "HR", exact: true }).check();
  await items(picker);
  await picker.getByRole("button", { name: "HR", exact: true }).click();
  await picker.getByRole("radio", { name: "カスタムボタン", exact: true }).click();
  await picker.getByRole("textbox", { name: "ボタンのラベル", exact: true }).first().fill("Rest");
  await picker.getByRole("textbox", { name: "ボタンのラベル", exact: true }).first().press("Enter");
  await picker.getByRole("button", { name: "Buttonを追加", exact: true }).click();
  await picker.getByRole("button", { name: "Buttonを追加", exact: true }).click();
  await picker.getByRole("button", { name: "Buttonを追加", exact: true }).click();
  await expect(picker.getByRole("button", { name: "Buttonを追加", exact: true })).toBeDisabled();
  await expect(picker.getByRole("textbox", { name: "ボタンのラベル", exact: true })).toHaveCount(6);
  await picker.getByRole("button", { name: "Paneから外す: HR", exact: true }).click();
  await picker.getByRole("button", { name: "項目を追加", exact: true }).click();
  await picker.getByRole("searchbox").fill("HR");
  await picker.getByRole("checkbox", { name: "HR", exact: true }).check();
  await items(picker);
  await picker.getByRole("button", { name: "HR", exact: true }).click();
  await expect(picker.getByRole("radio", { name: "カスタムボタン", exact: true })).toHaveAttribute("aria-checked", "true");
  await expect(picker.getByRole("textbox", { name: "ボタンのラベル", exact: true }).first()).toHaveValue("Rest");
  await expect(picker.locator('input[type="color"]')).toHaveCount(0);
  await checkBounds(page, picker);
  await page.screenshot({ path: testInfo.outputPath("compact-controller-editor.png") });
  await picker.getByRole("button", { name: "追加", exact: true }).click();
  await expect(page.getByRole("button", { name: "Rest", exact: true }).first()).toBeVisible();
});

test("@desktop @mobile @pane-picker keeps compact scenario trace edits and bindings after local save and reload", async ({ page }, testInfo) => {
  test.skip(!process.env.CIRCLEHEART_E2E_DIST, "Save/reload requires a browser-local build.");
  const { picker, addGraph, addPane, task } = ui(page);
  await task("Scenario");
  await page.getByRole("button", { name: "Presetから追加", exact: true }).click();
  await page.getByTestId("workbench-preset-picker-v3").getByRole("button", { name: "baseline", exact: true }).click();
  await expect(page.locator(".workbench-scenario-row")).toHaveCount(2);
  for (let count = 2; count < 5; count++) {
    await page.getByRole("button", { name: "Presetから追加", exact: true }).click();
    await page.getByTestId("workbench-preset-picker-v3").getByRole("button", { name: "baseline", exact: true }).click();
  }
  await expect(page.locator(".workbench-scenario-row")).toHaveCount(5);
  await addGraph(); await picker.getByRole("button", { name: "PV loop", exact: true }).click();
  for (const name of ["LV", "RV"]) await picker.getByRole("checkbox", { name, exact: true }).check();
  await items(picker); await selectedRow(picker, "RV").getByRole("button", { name: "RV", exact: true }).click();
  const second = picker.getByTestId("pane-trace-rows-v3").locator("[data-scenario-id]").nth(1);
  const traces = picker.getByTestId("pane-trace-rows-v3").locator("[data-scenario-id]");
  await expect(traces).toHaveCount(5);
  await expect(picker.getByTestId("pane-trace-rows-v3").getByRole("checkbox")).toHaveCount(0);
  await expect(picker.getByTestId("pane-trace-rows-v3").getByText(/^(自動|カスタム)$/)).toHaveCount(0);
  await expect(second.getByRole("button", { name: /自動配色に戻す/ })).toHaveCount(0);
  const positions = await traces.evaluateAll(elements => elements.map(el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, bottom: r.bottom }; }));
  expect(positions[0]!.y).toBe(positions[1]!.y);
  expect(positions[2]!.y).toBe(positions[3]!.y);
  expect(positions[2]!.y).toBeGreaterThan(positions[0]!.y);
  expect(positions[4]!.y).toBeGreaterThan(positions[2]!.y);
  const visibility = second.getByRole("button", { name: /この項目を表示/ });
  await second.locator('input[type="color"]').fill("#8844aa");
  await expect(visibility).toHaveAttribute("aria-pressed", "true");
  await expect(second.getByRole("button", { name: /自動配色に戻す/ })).toBeVisible();
  await visibility.click();
  await expect(visibility).toHaveAttribute("aria-pressed", "false");
  await expect(traces.first().getByRole("button", { name: /この項目を表示/ })).toHaveAttribute("aria-pressed", "true");
  await checkBounds(page, picker);
  await page.screenshot({ path: testInfo.outputPath("five-scenario-settings.png") });
  if ((page.viewportSize()?.width ?? 1440) < 768) {
    await page.setViewportSize({ width: 320, height: 740 });
    await expect(picker.getByRole("button", { name: "表示", exact: true })).toBeInViewport();
    const narrow = await traces.evaluateAll(elements => elements.map(el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y }; }));
    expect(narrow[0]!.x).toBe(narrow[1]!.x);
    expect(narrow[1]!.y).toBeGreaterThan(narrow[0]!.y);
    await checkBounds(page, picker);
    await page.screenshot({ path: testInfo.outputPath("narrow-scenario-settings.png") });
    await page.setViewportSize({ width: 390, height: 844 });
  }
  await picker.getByRole("button", { name: "Paneから外す: RV", exact: true }).click();
  await picker.getByRole("button", { name: "項目を追加", exact: true }).click();
  await picker.getByRole("checkbox", { name: "RV", exact: true }).check();
  await renamePane(picker, "Persisted PV");
  await picker.getByRole("button", { name: "表示", exact: true }).click();
  await addPane("output");
  await picker.getByRole("searchbox").fill("AoP");
  await picker.locator('[data-item-id="presentation.pressure-summary.Ao"]').getByRole("checkbox").check();
  await renamePane(picker, "Fixed outputs", "対象");
  await picker.getByRole("radio", { name: "Scenarioを固定", exact: true }).click();
  await picker.getByRole("combobox", { name: "Scenarioを固定", exact: true }).selectOption({ label: "baseline 2" });
  await picker.getByRole("button", { name: "追加", exact: true }).click();
  await addPane("control");
  await picker.getByRole("searchbox").fill("HR");
  await picker.getByRole("checkbox", { name: "HR", exact: true }).check();
  await renamePane(picker, "Fixed controls", "対象");
  await picker.getByRole("radio", { name: "Scenarioを固定", exact: true }).click();
  await picker.getByRole("checkbox", { name: "baseline 2", exact: true }).check();
  await picker.getByRole("button", { name: "追加", exact: true }).click();
  await page.getByTestId("v3-save-experiment").click();
  await expect(page).toHaveURL(/\/ja\/experiments\/(?!new$).+/);
  await expect(page.getByTestId("v3-save-experiment")).toHaveText("保存済み");
  await page.reload();
  await openItems(page, "Persisted PV");
  await selectedRow(picker, "RV").getByRole("button", { name: "RV", exact: true }).click();
  await expect(second.locator('input[type="color"]')).toHaveValue("#8844aa");
  await expect(visibility).toHaveAttribute("aria-pressed", "false");
  await picker.getByRole("button", { name: /自動.*baseline 2/ }).click();
  await expect(second.locator('input[type="color"]')).not.toHaveValue("#8844aa");
  await expect(second.getByRole("button", { name: /自動配色に戻す/ })).toHaveCount(0);
  await expect(visibility).toHaveAttribute("aria-pressed", "false");
  await expect(second.locator('input[type="color"]')).toBeFocused();
  await page.keyboard.press("Escape");
  await openItems(page, "Fixed outputs", "output");
  await expect(picker.getByRole("button", { name: /AoP/, exact: false }).first()).toBeVisible();
  await picker.getByRole("tab", { name: "対象", exact: true }).click();
  await expect(picker.getByRole("combobox", { name: "Scenarioを固定", exact: true }).locator("option:checked")).toHaveText("baseline 2");
  await page.keyboard.press("Escape");
  await openItems(page, "Fixed controls", "control");
  await picker.getByRole("tab", { name: "対象", exact: true }).click();
  await expect(picker.getByRole("checkbox", { checked: true })).toHaveCount(2);
  await page.keyboard.press("Escape");
});
test("@desktop @mobile @pane-picker legend visibility is scoped to the clicked scenario and series", async ({ page }) => {
  const { graphs, picker, addGraph, task } = ui(page);
  await task("Scenario");
  await page.getByRole("button", { name: "Presetから追加", exact: true }).click();
  await page.getByTestId("workbench-preset-picker-v3").getByRole("button", { name: "baseline", exact: true }).click();
  await expect(page.locator(".workbench-scenario-row")).toHaveCount(2);
  await addGraph();
  await picker.getByRole("button", { name: "PV loop", exact: true }).click();
  await picker.getByRole("checkbox", { name: "LV", exact: true }).check();
  await picker.getByRole("checkbox", { name: "RV", exact: true }).check();
  await picker.getByRole("button", { name: "表示", exact: true }).click();
  const chart = graphs.locator('[data-chart-kind="pressure-volume-loop-v3"]:visible').filter({ has: page.getByRole("button", { name: "baseline, RV", exact: true }) });
  const aLv = chart.getByRole("button", { name: "baseline, LV", exact: true });
  const bLv = chart.getByRole("button", { name: "baseline 2, LV", exact: true });
  const aRv = chart.getByRole("button", { name: "baseline, RV", exact: true });
  await expect(chart).toHaveAttribute("data-pv-loop-trace-count", "4");
  await aLv.click();
  await expect(page.getByTestId("workbench-item-description-popover-v3")).toHaveCount(0);
  await expect(aLv).toHaveAttribute("aria-pressed", "true");
  await expect(bLv).toHaveAttribute("aria-pressed", "false");
  await expect(aRv).toHaveAttribute("aria-pressed", "false");
  await expect(chart).toHaveAttribute("data-pv-loop-trace-count", "3");
  await bLv.click();
  await expect(chart).toHaveAttribute("data-pv-loop-trace-count", "2");
  await aLv.click();
  await expect(bLv).toHaveAttribute("aria-pressed", "true");
  await expect(chart).toHaveAttribute("data-pv-loop-trace-count", "3");
  await bLv.click();
  await expect(chart).toHaveAttribute("data-pv-loop-trace-count", "4");
});

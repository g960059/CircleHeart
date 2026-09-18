// Browser verification for the Article embed reading study.
// Usage: node tools/dev/embedStudyScreenshotsV1.mjs http://127.0.0.1:3036 /path/to/output-dir
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const [origin = "http://127.0.0.1:3036", outputDir = "/tmp/embed-study-shots", phaseList = "dark,light,mobile,editor"] = process.argv.slice(2);
const phases = new Set(phaseList.split(","));
await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch();
const checks = [];
const record = (name, value) => { checks.push({ name, ...value }); console.log(JSON.stringify({ name, ...value })); };
const SNAPSHOT_ID = "snapshot/dev-article-embed-study-v3";
const ARTICLE = `${origin}/ja/articles/dev-article-embed-study-v3/preview`;
const placement = (page, id) => page.locator(`[data-reader-placement-id="placement/${id}"]`);

async function seed(page) {
  await page.goto(`${origin}/ja/dev/embed-study`);
  await page.getByText("記事プレビュー", { exact: false }).waitFor({ timeout: 60_000 });
}
// One live inline Placement at a time: bring the placement to the top so the
// previous one leaves the viewport. Activation is viewport-driven, so after a
// layout shift during load the scroll is repeated until the placement is live.
async function focusPlacement(page, id) {
  const target = placement(page, id);
  let attempts = 0;
  for (; attempts < 12; attempts += 1) {
    await target.evaluate((element, block) => element.scrollIntoView({ block, behavior: "instant" }), attempts % 2 === 0 ? "start" : "center");
    const live = await target.locator('[data-reader-placement-live="true"]').or(target.and(page.locator('[data-reader-placement-live="true"]'))).first()
      .waitFor({ timeout: 3_000 }).then(() => true, () => false);
    if (live) break;
  }
  record(`focus-${id}`, { scrollAttempts: attempts + 1, live: await target.getAttribute("data-reader-placement-live") });
  return target;
}
async function waitLive(scope, timeout = 120_000) {
  await scope.locator("[data-reader-runtime-status='playing'], [data-reader-runtime-status='paused'], [data-reader-runtime-status='requesting-analysis']").first().waitFor({ timeout });
}
async function analysisState(scope) {
  const status = scope.locator("[data-reader-analysis-state]");
  return (await status.count()) === 0 ? "fresh" : await status.first().getAttribute("data-reader-analysis-state");
}
async function counts(scope) {
  return {
    stageSlots: await scope.locator(".article-reader-stage-canvas").first().getAttribute("data-reader-stage-slots").catch(() => null),
    railTabs: await scope.locator("[data-testid='article-reader-stage-rail-v3'] [role='tab']").count(),
    canvases: await scope.locator("canvas").count(),
    controlSections: await scope.locator("[data-reader-sections='controls'] .article-reader-section").count(),
    outputSections: await scope.locator("[data-reader-sections='outputs'] .article-reader-section").count(),
    outputTiles: await scope.locator(".workbench-output-item").count(),
    analysis: await analysisState(scope),
    layout: await scope.locator("[data-reader-layout]").first().getAttribute("data-reader-layout").catch(() => null),
  };
}

async function desktop(theme) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript((value) => localStorage.setItem("circleheart.app.theme", value), theme);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await seed(page);
  await page.goto(ARTICLE);

  for (const id of ["study-inline-light", "study-inline-compare"]) {
    const inline = await focusPlacement(page, id);
    await waitLive(inline);
    await page.waitForTimeout(4000);
    await inline.screenshot({ path: join(outputDir, `desktop-${theme}-${id}.png`) });
    record(`desktop-${theme}-${id}`, await counts(inline));
  }
  if (theme === "light") { await context.close(); return errors; }

  const anchor = placement(page, "study-peek-heavy").getByRole("button").first();
  await anchor.scrollIntoViewIfNeeded();
  await anchor.click();
  const panel = page.getByTestId("article-reader-experiment-peek-v3");
  await panel.waitFor();
  await waitLive(panel);
  const openedAt = Date.now();
  // Prepared sealed-state analyses should arrive without measuring.
  await panel.locator("[data-reader-analysis-input-epoch]").first().waitFor({ timeout: 60_000 }).catch(() => {});
  const structuralAfterMs = Date.now() - openedAt;
  await page.waitForTimeout(3000);
  await page.screenshot({ path: join(outputDir, "desktop-dark-peek-heavy.png") });
  record("desktop-dark-peek-heavy", { ...(await counts(panel)), structuralAnalysisVisibleAfterMs: structuralAfterMs,
    preparedOriginInDom: (await panel.locator("[data-reader-structural-scenario-id]").count()) });
  const tabs = panel.locator("[data-testid='article-reader-stage-rail-v3'] [role='tab']");
  await tabs.nth(1).click();
  await page.waitForTimeout(2500);
  await page.screenshot({ path: join(outputDir, "desktop-dark-peek-heavy-view2.png") });
  record("desktop-dark-peek-heavy-view2", await counts(panel));
  // Selection is a pane, not an index: narrowing splits the pair and must keep 圧波形; widening rejoins it.
  const activePane = () => panel.locator(".article-reader-stage").getAttribute("data-reader-stage-active-pane");
  const stagePanes = () => panel.locator("[data-reader-stage-pane]").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-reader-stage-pane")));
  const selectionAtWide = { activePane: await activePane(), panes: await stagePanes() };
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.waitForTimeout(1200);
  const selectionAtNarrow = { activePane: await activePane(), panes: await stagePanes(), railTabs: await tabs.count() };
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(1200);
  const selectionBackWide = { activePane: await activePane(), panes: await stagePanes(), railTabs: await tabs.count() };
  record("desktop-dark-peek-selection-across-widths", { selectionAtWide, selectionAtNarrow, selectionBackWide,
    stable: selectionAtWide.panes[0] === selectionAtNarrow.panes[0] && selectionBackWide.panes.join() === selectionAtWide.panes.join() });
  await tabs.nth(0).click();
  await page.waitForTimeout(1000);

  // Move the first control (基準 TBV slider): beat-level response now, analysis stays sealed.
  await panel.locator("[data-reader-runtime-status='playing'], [data-reader-runtime-status='paused']").first().waitFor({ timeout: 120_000 });
  const slider = panel.getByRole("slider").first();
  const box = await slider.boundingBox();
  await page.mouse.move(box.x + box.width * 0.27, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.45, box.y + box.height / 2, { steps: 8 });
  await page.mouse.up();
  const controlAt = Date.now();
  let backAfterMs = null;
  for (let i = 0; i < 120; i += 1) {
    await page.waitForTimeout(500);
    const status = await panel.locator("[data-reader-runtime-status]").first().getAttribute("data-reader-runtime-status");
    if (status === "playing" || status === "paused") { backAfterMs = Date.now() - controlAt; break; }
  }
  record("desktop-dark-peek-control-commit", { backAfterMs, sliderValue: await slider.inputValue(), alerts: await panel.locator("[role='alert']").allTextContents() });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: join(outputDir, "desktop-dark-peek-after-control.png") });
  record("desktop-dark-peek-after-control", { ...(await counts(panel)), controlsUsableAfterMs: backAfterMs,
    staleScenarios: await panel.locator("[data-reader-analysis-state='stale']").getAttribute("data-reader-analysis-stale-scenarios").catch(() => null) });

  // Reader asks for re-measurement explicitly.
  await panel.locator("[data-reader-recompute-analysis]").click();
  await panel.locator("[data-reader-analysis-state='pending']").waitFor({ timeout: 10_000 });
  const recomputeAt = Date.now();
  await page.waitForTimeout(4000);
  await page.screenshot({ path: join(outputDir, "desktop-dark-peek-recomputing.png") });
  record("desktop-dark-peek-recomputing", await counts(panel));
  await panel.locator("[data-reader-analysis-state='pending']").waitFor({ state: "detached", timeout: 240_000 });
  const recomputeMs = Date.now() - recomputeAt;
  await page.waitForTimeout(1500);
  await page.screenshot({ path: join(outputDir, "desktop-dark-peek-recomputed.png") });
  record("desktop-dark-peek-recomputed", { ...(await counts(panel)), recomputeWallMs: recomputeMs });

  await panel.getByRole("button", { name: "広く表示" }).click();
  await page.waitForTimeout(3000);
  await page.screenshot({ path: join(outputDir, "desktop-dark-maximized-workbench.png") });
  const maximizedBounds = await panel.evaluate((root) => {
    const box = (element) => { const r = element.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height), bottom: Math.round(r.bottom) }; };
    const graphs = [...root.querySelectorAll(".article-reader-workbench-graph-grid .article-reader-stage-slot")].map((slot) => ({
      pane: slot.getAttribute("data-reader-stage-pane"), canvases: slot.querySelectorAll("canvas").length, ...box(slot) }));
    const outputs = root.querySelector(".article-reader-workbench-outputs");
    return { viewport: { width: window.innerWidth, height: window.innerHeight }, graphs, outputs: outputs ? box(outputs) : null };
  });
  const insideViewport = (b) => b !== null && b.y >= 0 && b.bottom <= maximizedBounds.viewport.height && b.x >= 0 && b.x + b.width <= maximizedBounds.viewport.width;
  record("desktop-dark-maximized-workbench", { ...(await counts(panel)),
    areaLayout: await panel.getByTestId("workbench-area-layout").count(),
    graphCells: maximizedBounds.graphs.length,
    graphsPaintedInViewport: maximizedBounds.graphs.filter((g) => g.canvases > 0 && insideViewport(g)).length,
    outputsInViewport: insideViewport(maximizedBounds.outputs),
    bounds: maximizedBounds });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(600);
  record("desktop-dark-escape-restores-peek", { layout: await panel.locator("[data-reader-layout]").first().getAttribute("data-reader-layout") });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(800);
  record("desktop-dark-escape-closes", { panels: await page.getByTestId("article-reader-experiment-peek-v3").count() });

  const fullAnchor = placement(page, "study-full-heavy").getByRole("button").first();
  await fullAnchor.scrollIntoViewIfNeeded();
  await fullAnchor.click();
  await panel.waitFor();
  await waitLive(panel);
  await page.waitForTimeout(3500);
  await page.screenshot({ path: join(outputDir, "desktop-dark-full-opens-maximized.png") });
  record("desktop-dark-full-opens-maximized", await counts(panel));
  await panel.getByRole("button", { name: "記事と並べる" }).click();
  await page.waitForTimeout(800);
  record("desktop-dark-full-to-peek", { layout: await panel.locator("[data-reader-layout]").first().getAttribute("data-reader-layout") });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(800);

  // Automatic policy placement: the control commit itself triggers re-measurement.
  const autoAnchor = placement(page, "study-peek-automatic").getByRole("button").first();
  await autoAnchor.scrollIntoViewIfNeeded();
  await autoAnchor.click();
  await panel.waitFor();
  await waitLive(panel);
  await panel.locator("[data-reader-runtime-status='playing'], [data-reader-runtime-status='paused']").first().waitFor({ timeout: 120_000 });
  await page.waitForTimeout(2500);
  const autoSlider = panel.getByRole("slider").first();
  const autoBox = await autoSlider.boundingBox();
  await page.mouse.move(autoBox.x + autoBox.width * 0.27, autoBox.y + autoBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(autoBox.x + autoBox.width * 0.4, autoBox.y + autoBox.height / 2, { steps: 6 });
  await page.mouse.up();
  await panel.locator("[data-reader-analysis-state='pending']").waitFor({ timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(1500);
  await page.screenshot({ path: join(outputDir, "desktop-dark-peek-automatic-after-control.png") });
  record("desktop-dark-peek-automatic-after-control", { ...(await counts(panel)),
    runtimeStatus: await panel.locator("[data-reader-runtime-status]").first().getAttribute("data-reader-runtime-status") });
  await page.keyboard.press("Escape");
  await context.close();
  return errors;
}

async function mobile() {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await seed(page);
  await page.goto(ARTICLE);
  for (const id of ["study-inline-light", "study-inline-compare"]) {
    const inline = await focusPlacement(page, id);
    await waitLive(inline);
    await page.waitForTimeout(4000);
    await page.screenshot({ path: join(outputDir, `mobile-${id}.png`) });
    const box = await inline.locator(".article-reader-embed").boundingBox();
    record(`mobile-${id}`, { ...(await counts(inline)), embedWidthPx: box?.width ?? null, viewportPx: 390 });
  }
  const anchor = placement(page, "study-peek-heavy").getByRole("button").first();
  await anchor.scrollIntoViewIfNeeded();
  await anchor.click();
  const panel = page.getByTestId("article-reader-experiment-peek-v3");
  await panel.waitFor();
  await waitLive(panel);
  await page.waitForTimeout(4000);
  await page.screenshot({ path: join(outputDir, "mobile-sheet-controls.png") });
  const stage = await panel.locator(".article-reader-stage").boundingBox();
  record("mobile-sheet-controls", { ...(await counts(panel)), stageHeightPx: stage?.height ?? null });
  await panel.getByRole("tab", { name: "出力" }).click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: join(outputDir, "mobile-sheet-outputs.png") });
  record("mobile-sheet-outputs", await counts(panel));
  const tabs = panel.locator("[data-testid='article-reader-stage-rail-v3'] [role='tab']");
  await tabs.nth(1).click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: join(outputDir, "mobile-sheet-view2.png") });
  record("mobile-sheet-view2", await counts(panel));
  await context.close();
  return errors;
}

async function editor() {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await seed(page);
  // Authoring path: Article editor → Placement panel → "ExperimentSessionでBriefingを編集"
  // → Workbench with an Article authoring context → header Brief → composer.
  await page.goto(`${origin}/ja/articles/dev-article-embed-study-v3/edit`);
  const editButton = page.getByRole("button", { name: "Briefingを編集" });
  await editButton.first().waitFor({ timeout: 120_000 });
  await editButton.nth(2).scrollIntoViewIfNeeded();
  await editButton.nth(2).click();
  const panel = page.getByTestId("article-reader-experiment-peek-v3");
  await panel.waitFor({ timeout: 60_000 });
  await panel.locator("[data-reader-runtime-status='playing'], [data-reader-runtime-status='paused']").first().waitFor({ timeout: 120_000 });
  await panel.getByRole("button", { name: "その他の操作" }).click();
  await panel.getByRole("button", { name: "ExperimentSessionでBriefingを編集" }).click();
  await page.getByTestId("v3-dockview-workbench").waitFor({ timeout: 120_000 });
  // The Workbench re-measures every Scenario's settled relations on open (it
  // uses only registry preparations); authoring actions wait for that to end.
  const briefingButton = page.locator("button[aria-label*='Brief']:not([disabled])").first();
  const enabledAt = Date.now();
  await briefingButton.waitFor({ timeout: 300_000 });
  record("desktop-dark-workbench-briefing-enabled", { afterMs: Date.now() - enabledAt });
  const form = page.getByTestId("article-briefing-reading-form-v3");
  // The header re-renders as analyses settle; a click may land between renders.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await page.waitForTimeout(2000);
    await briefingButton.click();
    if (await form.waitFor({ timeout: 10_000 }).then(() => true, () => false)) break;
  }
  await form.waitFor({ timeout: 30_000 });
  await form.scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  await page.screenshot({ path: join(outputDir, "desktop-dark-workbench-briefing-reading-form.png") });
  record("desktop-dark-workbench-briefing-reading-form", {
    extents: await form.locator("[role='radio']").count(),
    pairToggles: await form.locator("input[type='checkbox']").count(),
    pairedByDefault: await form.locator("input[type='checkbox']:checked").count(),
    checkedRadios: await form.locator("[role='radio'][aria-checked='true']").allTextContents(),
  });
  await context.close();
  return errors;
}

const errors = {};
if (phases.has("dark")) errors.desktopDark = await desktop("dark");
if (phases.has("light")) errors.desktopLight = await desktop("light");
if (phases.has("mobile")) errors.mobile = await mobile();
if (phases.has("editor")) errors.editor = await editor();
await browser.close();
await writeFile(join(outputDir, "..", `BROWSER-CHECKS-${[...phases].join("-")}.json`), JSON.stringify({ origin, checks, pageErrors: errors }, null, 2) + "\n");
console.log(JSON.stringify({ pageErrors: errors }));

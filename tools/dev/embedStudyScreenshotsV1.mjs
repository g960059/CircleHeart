// Browser verification for the Article embed reading study.
// Usage: node tools/dev/embedStudyScreenshotsV1.mjs http://127.0.0.1:3037 /path/to/output-dir [phases]
// Phases: desktop, light, mobile, small, landscape, workbench, editor (comma separated).
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const [origin = "http://127.0.0.1:3037", outputDir = "/tmp/embed-study-shots", phaseList = "desktop,light,mobile,small,landscape,workbench,rotation"] = process.argv.slice(2);
const phases = new Set(phaseList.split(","));
await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch();
const checks = [];
const record = (name, value) => { checks.push({ name, ...value }); console.log(JSON.stringify({ name, ...value })); };
const ARTICLE = `${origin}/ja/articles/dev-article-embed-study-v3/preview`;
const placement = (page, id) => page.locator(`[data-reader-placement-id="placement/${id}"]`);

async function seed(page) {
  await page.goto(`${origin}/ja/dev/embed-study`);
  await page.getByText("記事プレビュー", { exact: false }).waitFor({ timeout: 60_000 });
}
// Placements render lazily near the viewport: scroll the placement first, then its anchor.
async function anchorOf(page, id) {
  const target = placement(page, id);
  await target.waitFor({ timeout: 120_000 });
  await target.scrollIntoViewIfNeeded();
  const anchor = target.getByRole("button").first();
  await anchor.waitFor({ timeout: 60_000 });
  await anchor.scrollIntoViewIfNeeded();
  return anchor;
}
/** Elements painted past the panel's right edge, for horizontal-overflow diagnosis. */
async function overflowSources(scope) {
  return scope.evaluate((root) => {
    const embed = root.querySelector(".article-reader-embed") ?? root;
    const limit = embed.getBoundingClientRect().right;
    return [...embed.querySelectorAll("*")].filter((el) => el.getBoundingClientRect().right > limit + 1).slice(0, 6)
      .map((el) => ({ tag: el.tagName, cls: el.className?.toString().slice(0, 70), testId: el.getAttribute("data-testid"), right: Math.round(el.getBoundingClientRect().right - limit) }));
  });
}
async function focusPlacement(page, id) {
  const target = placement(page, id);
  await target.waitFor({ timeout: 120_000 });
  let attempts = 0;
  for (; attempts < 12; attempts += 1) {
    await target.evaluate((element, block) => element.scrollIntoView({ block, behavior: "instant" }), attempts % 2 === 0 ? "start" : "center");
    const live = await target.and(page.locator('[data-reader-placement-live="true"]')).waitFor({ timeout: 3_000 }).then(() => true, () => false);
    if (live) break;
  }
  return target;
}
async function waitLive(scope, timeout = 120_000) {
  await scope.locator("[data-reader-runtime-status='playing'], [data-reader-runtime-status='paused']").first().waitFor({ timeout });
}
const box = async (locator) => {
  const b = await locator.boundingBox();
  return b === null ? null : { x: Math.round(b.x), y: Math.round(b.y), width: Math.round(b.width), height: Math.round(b.height), bottom: Math.round(b.y + b.height) };
};
async function overflow(page) {
  // Visually hidden (sr-only) text is clipped and never paints; only painted boxes count.
  return page.evaluate(() => ({
    documentWider: document.documentElement.scrollWidth > window.innerWidth,
    // The graph tab strip scrolls sideways by design; anything else past the panel edge is a defect.
    panelWider: [...document.querySelectorAll(".article-reader-embed")].some((embed) => {
      const limit = embed.getBoundingClientRect().right;
      return [...embed.querySelectorAll("*")].some((el) => !el.closest(".sr-only") && !el.closest(".workbench-mobile-graph-view-tabs")
        && el.getClientRects().length > 0 && el.getBoundingClientRect().right > limit + 1);
    }),
  }));
}
/** The loop: what is visible at once inside the viewport. */
async function loop(page, scope) {
  const viewport = page.viewportSize();
  const inside = (b) => b !== null && b.y >= 0 && b.bottom <= viewport.height;
  const stage = await box(scope.locator(".article-reader-stage-canvas, .article-reader-workbench-graph-grid").first());
  const observation = await box(scope.locator("[data-reader-observation]").first());
  const sliders = await scope.getByRole("slider").all();
  const sliderBoxes = [];
  for (const slider of sliders) sliderBoxes.push(await box(slider));
  const observedTiles = await scope.locator("[data-reader-observation] .workbench-output-item").evaluateAll((nodes) =>
    nodes.map((node) => ({ scenario: node.getAttribute("data-output-scenario"), label: node.querySelector(".workbench-output-label")?.textContent, value: node.querySelector(".workbench-output-value")?.textContent })));
  return {
    viewport, stage, stageVisible: inside(stage), observation, observationVisible: inside(observation),
    observedCount: observedTiles.length, observedTiles,
    slidersVisible: sliderBoxes.filter(inside).length, sliderCount: sliderBoxes.length,
    outputView: await scope.locator("[data-reader-output-view]").getAttribute("data-reader-output-view").catch(() => null),
    controlPanes: await scope.locator("[data-reader-sections='controls'] .article-reader-section").evaluateAll((nodes) =>
      nodes.map((node) => `${node.getAttribute("data-reader-section")}:${node.getAttribute("data-reader-section-collapsed")}`)),
    observationScrollable: await scope.locator("[data-reader-observation]").evaluate((el) => el.scrollHeight > el.clientHeight + 1).catch(() => false),
    overflow: await overflow(page),
  };
}
async function moveFirstSlider(page, scope, from = 0.27, to = 0.45) {
  const slider = scope.getByRole("slider").first();
  const b = await slider.boundingBox();
  await page.mouse.move(b.x + b.width * from, b.y + b.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width * to, b.y + b.height / 2, { steps: 8 });
  await page.mouse.up();
  for (let i = 0; i < 120; i += 1) {
    await page.waitForTimeout(500);
    const status = await scope.locator("[data-reader-runtime-status]").first().getAttribute("data-reader-runtime-status");
    if (status === "playing" || status === "paused") return { sliderValue: await slider.inputValue(), afterMs: i * 500 };
  }
  return { sliderValue: await slider.inputValue(), afterMs: null };
}
/** Readers reveal authored values; they do not edit membership. */
async function showAllOutputs(scope) {
  const toggle = scope.locator("[data-reader-output-expand]");
  if (await toggle.count() && await toggle.getAttribute("aria-expanded") === "false") await toggle.click();
}
async function foldOutputs(scope) {
  const toggle = scope.locator("[data-reader-output-expand]");
  if (await toggle.count() && await toggle.getAttribute("aria-expanded") === "true") await toggle.click();
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
    await page.waitForTimeout(3500);
    await inline.screenshot({ path: join(outputDir, `desktop-${theme}-${id}.png`) });
    record(`desktop-${theme}-${id}`, await loop(page, inline));
  }
  const anchor = await anchorOf(page, "study-peek-heavy");
  await anchor.click();
  const panel = page.getByTestId("article-reader-experiment-peek-v3");
  await panel.waitFor();
  await waitLive(panel);
  await page.waitForTimeout(3000);
  await page.screenshot({ path: join(outputDir, `desktop-${theme}-peek.png`) });
  record(`desktop-${theme}-peek`, await loop(page, panel));
  if (theme === "light") { await context.close(); return errors; }

  // Operate while the observation stays in view, then expand the authored values.
  const before = (await loop(page, panel)).observedTiles;
  const moved = await moveFirstSlider(page, panel);
  await page.waitForTimeout(2500);
  const after = await loop(page, panel);
  await page.screenshot({ path: join(outputDir, "desktop-dark-peek-after-control.png") });
  record("desktop-dark-peek-after-control", { ...moved, observationVisible: after.observationVisible, slidersVisible: after.slidersVisible,
    valuesChanged: before.map((t, i) => t.value !== after.observedTiles[i]?.value), tiles: after.observedTiles });
  await showAllOutputs(panel);
  await page.waitForTimeout(800);
  await page.screenshot({ path: join(outputDir, "desktop-dark-peek-reselected.png") });
  const reselected = await loop(page, panel);
  record("desktop-dark-peek-reselected", { observedTiles: reselected.observedTiles, readerPicker: await panel.locator(".article-reader-output-editor, .workbench-output-toggle").count() });

  // Extent changes keep the reader's expansion, the graph tab, and the values.
  await panel.locator("[data-testid='article-reader-stage-rail-v3'] [role='tab']").nth(1).click();
  await page.waitForTimeout(600);
  await panel.getByRole("button", { name: "広く表示" }).click();
  await page.waitForTimeout(2500);
  await page.screenshot({ path: join(outputDir, "desktop-dark-full.png") });
  const full = await loop(page, panel);
  record("desktop-dark-full", { ...full, overflowSources: await overflowSources(panel),
    selectionKept: JSON.stringify(full.observedTiles.map((t) => t.label)) === JSON.stringify(reselected.observedTiles.map((t) => t.label)),
    sliderValue: await panel.getByRole("slider").first().inputValue(), outputEditorVisible: await panel.locator(".article-reader-output-editor").count() });
  await page.setViewportSize({ width: 1100, height: 700 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: join(outputDir, "desktop-dark-full-1100x700.png") });
  record("desktop-dark-full-1100x700", await loop(page, panel));
  await page.setViewportSize({ width: 1440, height: 900 });
  await panel.getByRole("button", { name: "記事と並べる" }).click();
  await page.waitForTimeout(1500);
  const back = await loop(page, panel);
  record("desktop-dark-back-to-peek", { selectionKept: JSON.stringify(back.observedTiles.map((t) => t.label)) === JSON.stringify(reselected.observedTiles.map((t) => t.label)),
    activePane: await panel.locator(".article-reader-stage").getAttribute("data-reader-stage-active-pane"), sliderValue: await panel.getByRole("slider").first().inputValue(),
    outputView: back.outputView });
  await foldOutputs(panel);
  await page.waitForTimeout(500);
  record("desktop-dark-reset", { observedTiles: (await loop(page, panel)).observedTiles.map((t) => t.label) });
  // Closing returns the Article column to the author's first screen; reopening restores the reader's deck.
  await page.keyboard.press("Escape");
  await page.waitForTimeout(800);
  const inlineCompare = placement(page, "study-inline-compare");
  await inlineCompare.scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  record("desktop-dark-inline-after-close", { ...(await loop(page, inlineCompare)), openToOperate: await inlineCompare.locator("[data-reader-open-operate]").count() });

  // Reader-focus placement: the control names its target; outputs keep their sealed Scenario.
  const focusAnchor = await anchorOf(page, "study-peek-reader-focus");
  await focusAnchor.click();
  await panel.waitFor();
  await waitLive(panel);
  await page.waitForTimeout(2500);
  await panel.locator(".article-reader-scenario-chip").nth(2).click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: join(outputDir, "desktop-dark-reader-focus.png") });
  record("desktop-dark-reader-focus", { ...(await loop(page, panel)), controlContext: await panel.locator(".workbench-control-context").allTextContents() });
  await page.keyboard.press("Escape");
  await context.close();
  return errors;
}

async function phone(name, viewport, { landscape = false } = {}) {
  const context = await browser.newContext({ viewport, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await seed(page);
  await page.goto(ARTICLE);
  if (!landscape) {
    // The Article column: the author's primary outputs and controllers at phone width, nothing folded.
    const inline = await focusPlacement(page, "study-inline-compare");
    await waitLive(inline);
    await page.waitForTimeout(3500);
    await page.screenshot({ path: join(outputDir, `${name}-inline.png`) });
    record(`${name}-inline`, { ...(await loop(page, inline)), openToOperate: await inline.locator("[data-reader-open-operate]").count() });
    // Sealed controllers without a primary mark: graph and values, and one row to open.
    const openOperate = await focusPlacement(page, "study-inline-open-operate");
    await waitLive(openOperate);
    await page.waitForTimeout(2500);
    await page.screenshot({ path: join(outputDir, `${name}-inline-open-operate.png`) });
    record(`${name}-inline-open-operate`, { ...(await loop(page, openOperate)), openToOperate: await openOperate.locator("[data-reader-open-operate]").count() });
  }
  const anchor = await anchorOf(page, "study-peek-heavy");
  await anchor.click();
  const panel = page.getByTestId("article-reader-experiment-peek-v3");
  await panel.waitFor();
  await waitLive(panel);
  await page.waitForTimeout(3500);
  await page.screenshot({ path: join(outputDir, `${name}-sheet.png`) });
  record(`${name}-sheet`, await loop(page, panel));
  const moved = await moveFirstSlider(page, panel);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: join(outputDir, `${name}-sheet-after-control.png`) });
  record(`${name}-sheet-after-control`, { ...moved, ...(await loop(page, panel)) });
  await showAllOutputs(panel);
  await page.waitForTimeout(800);
  await page.screenshot({ path: join(outputDir, `${name}-sheet-outputs.png`) });
  record(`${name}-sheet-outputs`, { ...(await loop(page, panel)), outputEditorVisible: await panel.locator(".article-reader-output-editor").count(),
    readerPicker: await panel.locator(".article-reader-output-editor, .workbench-output-toggle").count() });
  // The loop after a control change: graph, bounded observation, analysis strip
  // and the current control on one screen, with controllers remaining available.
  await panel.locator(".article-reader-deck-panel").evaluate((deck) => deck.scrollTo(0, 0));
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(outputDir, `${name}-loop.png`) });
  record(`${name}-loop`, { ...(await loop(page, panel)), status: await box(panel.locator("[data-reader-analysis-state]").first()) });
  // The full sealed set stays bounded: the strip scrolls inside its bound and never covers the controls.
  await showAllOutputs(panel);
  await panel.locator(".article-reader-deck-panel").evaluate((deck) => deck.scrollTo(0, 0));
  await page.waitForTimeout(700);
  await page.screenshot({ path: join(outputDir, `${name}-loop-long.png`) });
  const long = await loop(page, panel);
  const deckTop = (await box(panel.locator("[data-reader-deck]")))?.y ?? null;
  record(`${name}-loop-long`, { ...long, deckTop, observationBelowDeck: long.observation !== null && deckTop !== null && long.observation.bottom <= deckTop + 1 });
  // Folding the open pane and opening another keeps the deck in place.
  const otherPane = panel.locator("[data-reader-sections='controls'] .article-reader-section[data-reader-section-collapsed='true'] .article-reader-section-toggle").first();
  if (await otherPane.count()) {
    await otherPane.click();
    await page.waitForTimeout(400);
    record(`${name}-loop-other-pane`, { ...(await loop(page, panel)) });
  }
  // Closing returns the Article column to the author's first screen; reopening restores the reader's expansion.
  await page.keyboard.press("Escape");
  await page.waitForTimeout(800);
  await anchor.click();
  await panel.waitFor();
  await page.waitForTimeout(1200);
  const reopened = await loop(page, panel);
  record(`${name}-sheet-reopened`, { observedTiles: reopened.observedTiles.map((t) => t.label), outputView: reopened.outputView,
    selectionKept: JSON.stringify(reopened.observedTiles.map((t) => t.label)) === JSON.stringify(long.observedTiles.map((t) => t.label)) });
  await context.close();
  return errors;
}

async function workbench() {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await seed(page);
  await page.goto(`${origin}/ja/snapshots/snapshot%2Fdev-article-embed-study-v3`);
  const deck = page.getByTestId("workbench-mobile-stage-deck");
  await deck.waitFor({ timeout: 120_000 });
  await page.getByTestId("workbench-mobile-observation").waitFor({ timeout: 180_000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: join(outputDir, "workbench-mobile-controls.png") });
  const strip = await page.locator("[data-testid='workbench-mobile-observation'] .workbench-output-item").evaluateAll((nodes) =>
    nodes.map((node) => ({ scenario: node.getAttribute("data-output-scenario"), label: node.querySelector(".workbench-output-label")?.textContent })));
  record("workbench-mobile-controls", { strip, overflow: await overflow(page) });
  const stripIds = () => page.locator("[data-testid='workbench-mobile-observation'] [data-output-id]").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-output-id")));
  const expandOutputs = page.locator('[data-workbench-output-expand]');
  if (await expandOutputs.count()) await expandOutputs.click();
  await page.getByRole("tab", { name: "出力" }).click();
  await page.screenshot({ path: join(outputDir, "workbench-mobile-outputs.png") });
  record("workbench-mobile-outputs", { readerPicker: await page.locator('.workbench-output-toggle').count(),
    paneItems: await page.locator('[data-mobile-pane-groups="output"] [data-output-id]').count(), strip: await page.getByTestId('workbench-mobile-observation').count() });
  await page.getByRole("tab", { name: "コントロール" }).click();
  const selected = await stripIds();
  // Expansion is Session view state; composition stays in the panes across breakpoints.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(600);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(800);
  const afterResize = await stripIds();
  record("workbench-mobile-selection-across-breakpoints", { selected, afterResize, selectionPreserved: JSON.stringify(afterResize) === JSON.stringify(selected) });
  // Short phone: the plot and its axes stay inside the stage above the tabs.
  await page.setViewportSize({ width: 320, height: 568 });
  await page.getByRole("tab", { name: "コントロール" }).click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: join(outputDir, "workbench-mobile-small.png") });
  const stageBounds = await page.getByTestId("workbench-mobile-stage").evaluate((stage) => {
    const rect = (el) => { const r = el.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), height: Math.round(r.height) }; };
    const chart = stage.querySelector("[data-chart-kind]");
    const canvas = stage.querySelector("canvas");
    const rail = stage.querySelector("[data-testid='workbench-mobile-graph-view-rail']");
    return { stage: rect(stage), rail: rail ? rect(rail) : null, chart: chart ? { ...rect(chart), scrollHeight: chart.scrollHeight, clientHeight: chart.clientHeight } : null, canvas: canvas ? rect(canvas) : null };
  });
  // The plotting region itself: the grid rectangle inside the canvas, found from its painted grid lines.
  const plotRegion = await page.getByTestId("workbench-mobile-stage").locator("canvas").first().evaluate((canvas) => {
    const context = canvas.getContext("2d");
    const { width, height } = canvas;
    const data = context.getImageData(0, 0, width, height).data;
    const lum = (x, y) => { const i = (y * width + x) * 4; return data[i] + data[i + 1] + data[i + 2]; };
    const background = lum(2, 2);
    const differs = (x, y) => Math.abs(lum(x, y) - background) > 24;
    // Column and row occupancy of any non-background paint.
    const cols = Array.from({ length: width }, (_, x) => { let n = 0; for (let y = 0; y < height; y += 1) if (differs(x, y)) n += 1; return n; });
    const rows = Array.from({ length: height }, (_, y) => { let n = 0; for (let x = 0; x < width; x += 1) if (differs(x, y)) n += 1; return n; });
    const scale = canvas.width / canvas.getBoundingClientRect().width;
    // Grid frame: the leftmost/rightmost columns and top/bottom rows painted along most of their length.
    const gridCols = cols.map((n, x) => n > height * 0.4 ? x : -1).filter((x) => x >= 0);
    const gridRows = rows.map((n, y) => n > width * 0.4 ? y : -1).filter((y) => y >= 0);
    return { cssWidth: Math.round(width / scale), cssHeight: Math.round(height / scale),
      plot: gridCols.length && gridRows.length ? { left: Math.round(gridCols[0] / scale), right: Math.round(gridCols.at(-1) / scale), top: Math.round(gridRows[0] / scale), bottom: Math.round(gridRows.at(-1) / scale),
        width: Math.round((gridCols.at(-1) - gridCols[0]) / scale), height: Math.round((gridRows.at(-1) - gridRows[0]) / scale) } : null };
  });
  record("workbench-mobile-small", { ...stageBounds, plotRegion,
    plotInsideStage: stageBounds.canvas !== null && stageBounds.canvas.bottom <= stageBounds.stage.bottom && stageBounds.canvas.top >= (stageBounds.rail?.bottom ?? 0),
    firstSlider: await box(page.getByRole("slider").first()),
    observationScrollable: await page.getByTestId("workbench-mobile-observation").evaluate((el) => el.scrollHeight > el.clientHeight + 1).catch(() => null),
    overflow: await overflow(page) });
  await context.close();
  return errors;
}

/**
 * A touch phone rotated portrait → landscape → portrait keeps the phone shell,
 * its graph choice, output expansion, control values and targets, with no
 * analysis requested merely by rotating.
 */
async function rotation() {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await context.addInitScript(() => {
    window.__workerMessages = [];
    const Native = window.Worker;
    window.Worker = class extends Native {
      postMessage(message, ...rest) {
        if (message?.kind !== "advance-presentation" && message?.kind !== "advance") window.__workerMessages.push({ kind: message?.kind, scenarioId: message?.scenarioId, scenarioIds: message?.scenarioIds, controlId: message?.controlId, value: message?.value });
        return super.postMessage(message, ...rest);
      }
    };
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await seed(page);
  await page.goto(`${origin}/ja/snapshots/snapshot%2Fdev-article-embed-study-v3`);
  await page.getByTestId("workbench-mobile-observation").waitFor({ timeout: 180_000 });
  await page.waitForTimeout(2500);
  const stripIds = () => page.locator("[data-testid='workbench-mobile-observation'] [data-output-id]").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-output-id")));
  const analysisRequests = () => page.evaluate(() => window.__workerMessages.filter((m) => m.kind === "request-analysis").length);
  const state = async () => {
    const viewport = page.viewportSize();
    const inside = (b) => b !== null && b.y >= 0 && b.bottom <= viewport.height && b.x >= 0 && b.x + b.width <= viewport.width;
    const stage = page.getByTestId("workbench-mobile-stage");
    const plot = await stage.locator("canvas").first().evaluate((canvas) => {
      const r = canvas.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height), bottom: Math.round(r.bottom) };
    }).catch(() => null);
    const slider = await box(page.getByRole("slider").first());
    return {
      viewport, shell: await page.getByTestId("workbench-mobile-stage-deck").count(),
      graphTab: await stage.locator("[role='tab'][aria-selected='true']").first().textContent().catch(() => null),
      observed: await stripIds(), plot, plotInside: inside(plot), slider, sliderInside: inside(slider),
      sliderValue: await page.getByRole("slider").first().inputValue().catch(() => null),
      controlTarget: await page.locator("[data-mobile-pane-group-role='control'] [data-testid^='control-pane-binding-']").first().textContent().catch(() => null),
      settingsReachable: await page.locator("[data-mobile-pane-group-role='control'] [data-testid='pane-settings-button-v3']").count(),
      addPane: await page.locator(".workbench-mobile-pane-group-add").count(),
      analysisRequests: await analysisRequests(), overflow: await overflow(page),
    };
  };
  // Choose the second graph, reveal all outputs, and move the first control.
  await page.getByTestId("workbench-mobile-stage").locator("[role='tab']").nth(1).click();
  await page.locator('[data-workbench-output-expand]').click();
  await page.waitForTimeout(500);
  await page.locator("[data-reader-runtime-status], [data-playback]").first().waitFor().catch(() => {});
  const slider = page.getByRole("slider").first();
  await slider.evaluate((el) => { el.value = String(Number(el.min) + (Number(el.max) - Number(el.min)) * 0.45); el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true })); el.dispatchEvent(new PointerEvent("pointerup", { bubbles: true })); });
  await page.waitForTimeout(3000);
  const portrait = await state();
  await page.screenshot({ path: join(outputDir, "rotation-portrait.png") });
  record("rotation-portrait", portrait);
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForTimeout(1200);
  const landscape = await state();
  await page.screenshot({ path: join(outputDir, "rotation-landscape.png") });
  record("rotation-landscape", { ...landscape,
    kept: { graph: landscape.graphTab === portrait.graphTab, observed: JSON.stringify(landscape.observed) === JSON.stringify(portrait.observed), slider: landscape.sliderValue === portrait.sliderValue, target: landscape.controlTarget === portrait.controlTarget, noNewAnalysis: landscape.analysisRequests === portrait.analysisRequests } });
  // Open settings while sideways.
  await page.locator("[data-mobile-pane-group-role='control'] [data-testid^='control-pane-binding-']").first().click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: join(outputDir, "rotation-landscape-binding.png") });
  record("rotation-landscape-binding-sheet", { dialog: await page.getByRole("dialog").count() });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(1200);
  const back = await state();
  record("rotation-portrait-again", { ...back,
    kept: { graph: back.graphTab === portrait.graphTab, observed: JSON.stringify(back.observed) === JSON.stringify(portrait.observed), slider: back.sliderValue === portrait.sliderValue, target: back.controlTarget === portrait.controlTarget, noNewAnalysis: back.analysisRequests === portrait.analysisRequests } });
  await context.close();
  return errors;
}

/**
 * Typography and heading rules on the phone Workbench: the study Snapshot
 * (three Scenarios, three panes) and browser-local variants of it with one
 * Scenario, seeded only into this isolated context.
 */
async function typography() {
  const errors = [];
  const variants = [
    { id: "snapshot/dev-typography-single-baseline", panes: [{ paneId: "output-baseline", label: "基準" }] },
    { id: "snapshot/dev-typography-single-valves", panes: [{ paneId: "output-baseline", label: "弁関連", outputs: "valves" }] },
    { id: "snapshot/dev-typography-two-panes", panes: [{ paneId: "output-baseline", label: "基準" }, { paneId: "output-valves", label: "弁関連", outputs: "valves" }] },
  ];
  const seedVariants = (page) => page.evaluate((variants) => {
    const key = "circleheart.studio.browser-content.v10";
    const store = JSON.parse(localStorage.getItem(key));
    const source = store.snapshots.find((s) => s.snapshotId === "snapshot/dev-article-embed-study-v3");
    const valveItems = source.content.surface.outputPanes.find((p) => p.paneId === "output-valves-tbv-plus-1000").items;
    const baselineItems = source.content.surface.outputPanes.find((p) => p.paneId === "output-baseline").items;
    for (const variant of variants) {
      const snapshot = structuredClone(source);
      snapshot.snapshotId = variant.id;
      snapshot.content.scenarios = snapshot.content.scenarios.filter((s) => s.scenarioId === "scenario/baseline");
      snapshot.content.surface.outputPanes = variant.panes.map((pane, order) => ({
        paneId: pane.paneId, role: "output", label: pane.label, order, priority: 100 - order,
        binding: { mode: "fixed", scenarioId: "scenario/baseline" },
        items: (pane.outputs === "valves" ? valveItems : baselineItems).slice(0, 6),
      }));
      snapshot.content.surface.controlPanes = snapshot.content.surface.controlPanes.filter((p) => p.paneId === "control-baseline");
      store.snapshots = [...store.snapshots.filter((s) => s.snapshotId !== variant.id), snapshot];
    }
    localStorage.setItem(key, JSON.stringify(store));
  }, variants);
  const headings = (page) => page.locator("[data-testid='workbench-mobile-observation'] [data-observation-group]").evaluateAll((nodes) =>
    nodes.map((node) => ({ group: node.getAttribute("data-observation-group"), heading: node.getAttribute("data-observation-heading"), text: node.querySelector("h4")?.textContent ?? null })));
  const styles = (page) => page.evaluate(() => {
    const pick = (selector) => { const el = document.querySelector(selector); if (!el) return null; const s = getComputedStyle(el); return { fontSize: s.fontSize, fontWeight: s.fontWeight, lineHeight: s.lineHeight, color: s.color, borderBottom: s.borderBottomWidth }; };
    return {
      observationHeading: pick(".workbench-mobile-observation .experiment-observation-heading"),
      observationLabel: pick(".workbench-mobile-observation .workbench-output-label"),
      observationValue: pick(".workbench-mobile-observation .workbench-output-value"),
      observationTile: pick(".workbench-mobile-observation .workbench-output-item"),
      graphTab: pick(".workbench-mobile-graph-view-tab[aria-selected='true']"),
      taskTab: pick(".workbench-mobile-task-tab[aria-selected='true']"),
      paneTitle: pick(".workbench-mobile-pane-group-toggle"),
      controlLabel: pick(".workbench-mobile-pane-group-body .workbench-control-label"),
      controlValue: pick(".workbench-mobile-pane-group-body .workbench-control-number"),
    };
  });
  for (const theme of ["dark", "light"]) {
    for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 568 }, { width: 844, height: 390 }]) {
      const context = await browser.newContext({ viewport, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
      await context.addInitScript((value) => localStorage.setItem("circleheart.app.theme", value), theme);
      const page = await context.newPage();
      page.on("pageerror", (error) => errors.push(error.message));
      await seed(page);
      await seedVariants(page);
      const tag = `${theme}-${viewport.width}x${viewport.height}`;
      const open = async (snapshotId, name) => {
        await page.goto(`${origin}/ja/snapshots/${encodeURIComponent(snapshotId)}`);
        await page.getByTestId("workbench-mobile-observation").waitFor({ timeout: 180_000 });
        await page.waitForTimeout(2500);
        await page.screenshot({ path: join(outputDir, `typography-${name}-${tag}.png`) });
        record(`typography-${name}-${tag}`, { headings: await headings(page), styles: await styles(page), overflow: await overflow(page),
          firstSlider: await box(page.getByRole("slider").first()) });
      };
      await open("snapshot/dev-article-embed-study-v3", "multi");
      if (viewport.width === 390) {
        // The ordinary fresh Workbench: one Scenario, one pane stored as "Outputs" (following the active slot).
        await page.goto(`${origin}/ja/experiments/new`);
        await page.getByTestId("workbench-mobile-observation").waitFor({ timeout: 180_000 });
        await page.waitForTimeout(2500);
        await page.screenshot({ path: join(outputDir, `typography-fresh-default-${tag}.png`) });
        record(`typography-fresh-default-${tag}`, { headings: await headings(page), overflow: await overflow(page), firstSlider: await box(page.getByRole("slider").first()) });
      }
      if (viewport.width === 390 || theme === "light") {
        await open("snapshot/dev-typography-single-baseline", "single-baseline");
        await open("snapshot/dev-typography-single-valves", "single-valves");
        await open("snapshot/dev-typography-two-panes", "two-panes");
      }
      await context.close();
    }
  }
  return errors;
}

/** Authoring: the Briefing editor's item emphasis toggles and phone-width preview. */
async function editor() {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await seed(page);
  await page.goto(`${origin}/ja/articles/dev-article-embed-study-v3/edit`);
  const editButton = page.getByRole("button", { name: "Briefingを編集" });
  await editButton.first().waitFor({ timeout: 120_000 });
  await editButton.nth(2).scrollIntoViewIfNeeded();
  await editButton.nth(2).click();
  const panel = page.getByTestId("article-reader-experiment-peek-v3");
  await panel.waitFor({ timeout: 60_000 });
  await waitLive(panel);
  await panel.getByRole("button", { name: "その他の操作", exact: true }).click();
  await panel.getByRole("button", { name: "ExperimentSessionでBriefingを編集" }).click();
  await page.getByTestId("v3-dockview-workbench").waitFor({ timeout: 120_000 });
  const briefingButton = page.locator("button[aria-label*='Brief']:not([disabled])").first();
  await briefingButton.waitFor({ timeout: 300_000 });
  const form = page.getByTestId("article-briefing-reading-form-v3");
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await page.waitForTimeout(2000);
    await briefingButton.click();
    if (await form.waitFor({ timeout: 10_000 }).then(() => true, () => false)) break;
  }
  await form.scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  await page.screenshot({ path: join(outputDir, "editor-reading-form.png") });
  const preview = page.getByTestId("article-briefing-phone-preview-v3");
  const counts = async () => ({
    primaryOutputs: await page.locator("[data-briefing-output-primary='true']").count(),
    supportingOutputs: await page.locator("[data-briefing-output-primary='false']").count(),
    primaryControls: await page.locator("[data-briefing-control-primary='true']").count(),
    blocked: await page.locator("[data-briefing-primary-blocked='true']").count(),
    outputsCount: await page.getByTestId("article-briefing-primary-outputs-count-v3").textContent().catch(() => null),
    controlsCount: await page.getByTestId("article-briefing-primary-controls-count-v3").textContent().catch(() => null),
    previewOutputs: await preview.locator(".article-briefing-phone-frame").getAttribute("data-primary-outputs"),
    previewControls: await preview.locator(".article-briefing-phone-frame").getAttribute("data-primary-controls"),
  });
  record("editor-reading-form", { ...(await counts()), previewText: await preview.locator("p").last().textContent() });
  // A full primary set blocks a further mark; unmarking one frees a place and the preview follows.
  const blockedToggle = page.locator("[data-briefing-output-primary='false'] .article-briefing-primary-toggle").first();
  await blockedToggle.scrollIntoViewIfNeeded();
  await blockedToggle.click();
  await page.waitForTimeout(400);
  record("editor-toggle-blocked", await counts());
  const primaryToggle = page.locator("[data-briefing-output-primary='true'] .article-briefing-primary-toggle").first();
  await primaryToggle.scrollIntoViewIfNeeded();
  await primaryToggle.click();
  await page.waitForTimeout(400);
  record("editor-toggle-unmark", await counts());
  await blockedToggle.click();
  await page.waitForTimeout(400);
  record("editor-toggle-primary", await counts());
  await preview.scrollIntoViewIfNeeded();
  await page.screenshot({ path: join(outputDir, "editor-reading-form-toggled.png") });
  await context.close();
  return errors;
}

const errors = {};
const persist = () => writeFile(join(outputDir, "BROWSER-CHECKS.json"), JSON.stringify({ origin, checks, pageErrors: errors }, null, 2) + "\n");
const runners = {
  desktop: ["desktopDark", () => desktop("dark")],
  light: ["desktopLight", () => desktop("light")],
  mobile: ["mobile", () => phone("mobile-390x844", { width: 390, height: 844 })],
  small: ["small", () => phone("small-320x568", { width: 320, height: 568 })],
  landscape: ["landscape", () => phone("landscape-844x390", { width: 844, height: 390 }, { landscape: true })],
  workbench: ["workbench", () => workbench()],
  rotation: ["rotation", () => rotation()],
  typography: ["typography", () => typography()],
  editor: ["editor", () => editor()],
};
for (const [phase, [key, run]] of Object.entries(runners)) {
  if (!phases.has(phase)) continue;
  try { errors[key] = await run(); } catch (error) { errors[key] = [`phase failed: ${error.message}`]; }
  await persist();
}
await browser.close();
console.log(JSON.stringify({ pageErrors: errors }));

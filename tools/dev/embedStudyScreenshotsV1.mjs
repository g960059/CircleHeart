// Browser verification for the Article embed reading study.
// Usage: node tools/dev/embedStudyScreenshotsV1.mjs http://127.0.0.1:3037 /path/to/output-dir [phases]
// Phases: desktop, light, mobile, small, landscape, workbench, editor (comma separated).
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const [origin = "http://127.0.0.1:3037", outputDir = "/tmp/embed-study-shots", phaseList = "desktop,light,mobile,small,landscape,workbench"] = process.argv.slice(2);
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
    panelWider: [...document.querySelectorAll(".article-reader-embed")].some((embed) => {
      const limit = embed.getBoundingClientRect().right;
      return [...embed.querySelectorAll("*")].some((el) => !el.closest(".sr-only") && el.getClientRects().length > 0 && el.getBoundingClientRect().right > limit + 1);
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
    referenceSummaries: await scope.locator(".article-reader-reference-toggle").allTextContents(),
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
async function toggleOutput(scope, label) {
  const ref = scope.locator("[data-reader-reference='outputs']");
  if ((await ref.getAttribute("data-reader-reference-open")) !== "true") await ref.locator(".article-reader-reference-toggle").click();
  const tile = ref.locator(".workbench-output-item").filter({ has: scope.page().locator(`.workbench-output-label:text-is("${label}")`) }).first();
  await tile.locator(".workbench-output-toggle").click();
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

  // Operate while the observation stays in view, then re-select the observation.
  const before = (await loop(page, panel)).observedTiles;
  const moved = await moveFirstSlider(page, panel);
  await page.waitForTimeout(2500);
  const after = await loop(page, panel);
  await page.screenshot({ path: join(outputDir, "desktop-dark-peek-after-control.png") });
  record("desktop-dark-peek-after-control", { ...moved, observationVisible: after.observationVisible, slidersVisible: after.slidersVisible,
    valuesChanged: before.map((t, i) => t.value !== after.observedTiles[i]?.value), tiles: after.observedTiles });
  await toggleOutput(panel, "LVEF");
  await toggleOutput(panel, "LVEDV");
  await page.waitForTimeout(800);
  await page.screenshot({ path: join(outputDir, "desktop-dark-peek-reselected.png") });
  const reselected = await loop(page, panel);
  record("desktop-dark-peek-reselected", { observedTiles: reselected.observedTiles, reset: await panel.locator("[data-reader-observation-reset]").count() });

  // Extent changes keep the reader's selection, the graph tab, and the values.
  await panel.locator("[data-testid='article-reader-stage-rail-v3'] [role='tab']").nth(1).click();
  await page.waitForTimeout(600);
  await panel.getByRole("button", { name: "広く表示" }).click();
  await page.waitForTimeout(2500);
  await page.screenshot({ path: join(outputDir, "desktop-dark-full.png") });
  const full = await loop(page, panel);
  record("desktop-dark-full", { ...full, overflowSources: await overflowSources(panel),
    selectionKept: JSON.stringify(full.observedTiles.map((t) => t.label)) === JSON.stringify(reselected.observedTiles.map((t) => t.label)),
    sliderValue: await panel.getByRole("slider").first().inputValue(), referenceOpen: await panel.locator("[data-reader-reference='outputs']").getAttribute("data-reader-reference-open") });
  await page.setViewportSize({ width: 1100, height: 700 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: join(outputDir, "desktop-dark-full-1100x700.png") });
  record("desktop-dark-full-1100x700", await loop(page, panel));
  await page.setViewportSize({ width: 1440, height: 900 });
  await panel.getByRole("button", { name: "記事と並べる" }).click();
  await page.waitForTimeout(1500);
  const back = await loop(page, panel);
  record("desktop-dark-back-to-peek", { selectionKept: JSON.stringify(back.observedTiles.map((t) => t.label)) === JSON.stringify(reselected.observedTiles.map((t) => t.label)),
    activePane: await panel.locator(".article-reader-stage").getAttribute("data-reader-stage-active-pane"), sliderValue: await panel.getByRole("slider").first().inputValue() });
  await panel.locator("[data-reader-observation-reset]").click();
  await page.waitForTimeout(500);
  record("desktop-dark-reset", { observedTiles: (await loop(page, panel)).observedTiles.map((t) => t.label) });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(800);

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
    const inline = await focusPlacement(page, "study-inline-compare");
    await waitLive(inline);
    await page.waitForTimeout(3500);
    await page.screenshot({ path: join(outputDir, `${name}-inline.png`) });
    record(`${name}-inline`, { ...(await loop(page, inline)), openToOperate: await inline.locator("[data-reader-open-operate]").count() });
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
  await toggleOutput(panel, "LVEF");
  await page.waitForTimeout(800);
  await page.screenshot({ path: join(outputDir, `${name}-sheet-reference.png`) });
  record(`${name}-sheet-reference`, { ...(await loop(page, panel)), referenceTiles: await panel.locator("[data-reader-reference='outputs'] .workbench-output-item").count() });
  // The loop after a control change: graph, bounded observation, analysis strip
  // and the current control on one screen, with the reference collapsed.
  await panel.locator("[data-reader-reference='outputs'] .article-reader-reference-toggle").click();
  await panel.locator(".article-reader-deck").evaluate((deck) => deck.scrollTo(0, 0));
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(outputDir, `${name}-loop.png`) });
  record(`${name}-loop`, { ...(await loop(page, panel)), status: await box(panel.locator("[data-reader-analysis-state]").first()),
    observationScrollable: await panel.locator("[data-reader-observation]").evaluate((el) => el.scrollHeight > el.clientHeight + 1),
    more: await panel.locator("[data-observation-more]").count() });
  // A long reader selection stays bounded and honest: the count opens the rest in place.
  for (const label of ["LVEDP", "AV 拍出量/分", "平均AoP", "AoP max", "CVP", "mLAP"]) await toggleOutput(panel, label);
  await panel.locator("[data-reader-reference='outputs'] .article-reader-reference-toggle").click();
  await panel.locator(".article-reader-deck").evaluate((deck) => deck.scrollTo(0, 0));
  await page.waitForTimeout(700);
  await page.screenshot({ path: join(outputDir, `${name}-loop-long.png`) });
  const long = await loop(page, panel);
  record(`${name}-loop-long`, { ...long, more: await panel.locator("[data-observation-more]").allTextContents(),
    observationScrollable: await panel.locator("[data-reader-observation]").evaluate((el) => el.scrollHeight > el.clientHeight + 1) });
  if (await panel.locator("[data-observation-more]").count()) {
    await panel.locator("[data-observation-more]").click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: join(outputDir, `${name}-loop-long-expanded.png`) });
    record(`${name}-loop-long-expanded`, { ...(await loop(page, panel)), expanded: await panel.locator("[data-reader-observation]").getAttribute("data-observation-expanded"),
      observationScrollable: await panel.locator("[data-reader-observation]").evaluate((el) => el.scrollHeight > el.clientHeight + 1) });
  }
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
  await page.getByRole("tab", { name: "出力" }).click();
  await page.waitForTimeout(800);
  const toggles = page.locator("[data-mobile-pane-groups='output'] .workbench-output-toggle");
  await toggles.first().click();
  await toggles.nth(5).click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: join(outputDir, "workbench-mobile-outputs.png") });
  const selected = await stripIds();
  record("workbench-mobile-outputs", { toggles: await toggles.count(), pressed: await page.locator("[data-mobile-pane-groups='output'] .workbench-output-toggle[aria-pressed='true']").count(),
    strip: selected.length });
  // The observation is Session state: it survives the desktop breakpoint and back.
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
  record("workbench-mobile-small", { ...stageBounds,
    plotInsideStage: stageBounds.canvas !== null && stageBounds.canvas.bottom <= stageBounds.stage.bottom && stageBounds.canvas.top >= (stageBounds.rail?.bottom ?? 0),
    firstSlider: await box(page.getByRole("slider").first()), overflow: await overflow(page) });
  await context.close();
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
  record("editor-reading-form", {
    previewOutputs: await preview.locator(".article-briefing-phone-frame").getAttribute("data-primary-outputs"),
    previewControls: await preview.locator(".article-briefing-phone-frame").getAttribute("data-primary-controls"),
    previewText: await preview.locator("p").last().textContent(),
    primaryOutputs: await page.locator("[data-briefing-output-primary='true']").count(),
    supportingOutputs: await page.locator("[data-briefing-output-primary='false']").count(),
    primaryControls: await page.locator("[data-briefing-control-primary='true']").count(),
  });
  // Toggle one supporting output to primary and confirm the preview follows.
  const toggle = page.locator("[data-briefing-output-primary='false'] .article-briefing-primary-toggle").first();
  await toggle.scrollIntoViewIfNeeded();
  await toggle.click();
  await page.waitForTimeout(500);
  record("editor-toggle-primary", {
    primaryOutputs: await page.locator("[data-briefing-output-primary='true']").count(),
    previewOutputs: await preview.locator(".article-briefing-phone-frame").getAttribute("data-primary-outputs"),
  });
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
  editor: ["editor", () => editor()],
};
for (const [phase, [key, run]] of Object.entries(runners)) {
  if (!phases.has(phase)) continue;
  try { errors[key] = await run(); } catch (error) { errors[key] = [`phase failed: ${error.message}`]; }
  await persist();
}
await browser.close();
console.log(JSON.stringify({ pageErrors: errors }));

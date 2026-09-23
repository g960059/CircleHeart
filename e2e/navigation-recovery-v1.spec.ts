import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import type { ExperimentV2, ExperimentSnapshotV2, ScenarioCaptureV2 } from "../studio/contracts/v2/content";

const baseline = JSON.parse(readFileSync(new URL(
  "../data/model-baselines/standard74-baseline-v1.json", import.meta.url,
), "utf8")) as { modelId: string; surfaceReleaseId: string; capture: ScenarioCaptureV2 };
const savedId = "experiment-navigation-test";
const snapshotId = "snapshot-navigation-test";
const savedTitle = "左室圧と大動脈圧を比べる";
const content: ExperimentV2["content"] = {
  modelId: baseline.modelId,
  surfaceSeriesId: "circleheart.main-wire.surface.static-anatomy.bounded-pva-workbench",
  scenarios: [{ scenarioId: "baseline", label: "基準", capture: baseline.capture }],
  surface: {
    graphPanes: [{
      paneId: "wave", role: "graph", label: "圧波形", order: 0, priority: 1,
      graphId: "hemodynamics.pressure.waveform.comprehensive-v1",
      scenarioScope: { mode: "visible-scenarios" }, excludedTraces: [], windowSec: 2,
      series: ["LVP", "AoP"].map((seriesId, order) => ({ seriesId, label: seriesId, order })),
    }],
    outputPanes: [], controlPanes: [], note: { text: "" },
  },
};
const snapshot: ExperimentSnapshotV2 = {
  schemaId: "circleheart-studio-experiment-snapshot-v2", snapshotId,
  surfaceReleaseId: baseline.surfaceReleaseId, createdAt: "2026-09-17T00:00:00.000Z", content,
};

async function seedManagement(page: Page) {
  // Every mutation stays in this isolated browser. A configured remote build
  // must not send fixture writes to the developer's content repository.
  await page.route("**/rest/v1/rpc/**", route => route.abort("blockedbyclient"));
  await page.addInitScript((fixture: string) => {
    const { content, snapshot, savedId, savedTitle } = JSON.parse(fixture);
    if (localStorage.getItem("navigation-fixture")) return;
    localStorage.setItem("navigation-fixture", "seeded");
    localStorage.setItem("circleheart.app.theme", "light");
    const records = [
      { experimentId: savedId, title: savedTitle, publishedSnapshotId: snapshot.snapshotId },
      { experimentId: "experiment-navigation-draft", title: "前負荷の変化を比べる", publishedSnapshotId: null },
      { experimentId: "experiment-navigation-long", title: "圧と容積の関係から考える、収縮性・後負荷・前負荷の違い", publishedSnapshotId: null },
    ];
    localStorage.setItem("circleheart.studio.browser-content.v10", JSON.stringify({
      schemaId: "circleheart-studio-browser-content-v10",
      experiments: records.map(({ experimentId }) => ({ schemaId: "circleheart-studio-experiment-v2", experimentId, version: 1, content })),
      snapshots: [snapshot], articles: [],
    }));
    localStorage.setItem("circleheart.studio.browser-experiment-index.v5", JSON.stringify({
      schemaId: "circleheart-studio-browser-experiment-index-v5",
      experiments: records.map(record => ({
        schemaId: "circleheart-studio-browser-experiment-record-v5",
        createdAt: "2026-09-15T00:00:00.000Z", updatedAt: "2026-09-17T00:00:00.000Z", ...record,
      })),
    }));
  }, JSON.stringify({ content, snapshot, savedId, savedTitle }));
}

async function expectWorkbench(page: Page) {
  const workbench = page.getByTestId("v3-dockview-workbench");
  await expect(workbench).toHaveAttribute("data-model-id", baseline.modelId);
  await expect.poll(async () => Number(await workbench.getAttribute("data-accepted-revision"))).toBeGreaterThan(0);
}

test("@desktop Home publication links resolve the browser-local publication pointer", async ({ page }) => {
  await seedManagement(page);
  await page.goto("/ja");
  const link = page.getByRole("link", { name: savedTitle, exact: true }).first();
  await expect(link).toHaveAttribute("href", `/ja/experiments/published/${savedId}`);
  await link.click();
  await expectWorkbench(page);
  await page.getByTestId("workbench-back-v1").click();
  await expect(page).toHaveURL(/\/ja$/);
});

test("@desktop @mobile @webkit a failed route module offers explicit reload and recovers", async ({ page }, info) => {
  let blocked = true;
  let failures = 0;
  await page.route("**/assets/WorkbenchSelectorPage-*.js", route => {
    if (!blocked) return route.continue();
    failures++;
    // The production failure: an old module URL falls through to the SPA HTML.
    return route.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html><title>CircleHeart</title>" });
  });
  await page.goto("/ja/me/experiments");
  const failure = page.getByTestId("page-load-failure-v1");
  await expect(failure).toBeVisible();
  await expect(failure).toContainText("ページの更新や通信の中断");
  expect(failures).toBeGreaterThan(0);
  await expect(page.getByRole("button", { name: "再読み込み", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "前のページに戻る" })).toBeVisible();
  await page.screenshot({ path: info.outputPath("module-recovery.png") });
  blocked = false;
  await page.getByRole("button", { name: "再読み込み", exact: true }).click();
  await expect(page.getByTestId("workbench-selector-v3")).toBeVisible();
  await expect(failure).toHaveCount(0);
});

test("@desktop @webkit Back recovers another route after a failed lazy import without a reload", async ({ page }) => {
  let documents = 0;
  page.on("request", request => { if (request.isNavigationRequest() && request.frame() === page.mainFrame()) documents++; });
  await page.route("**/assets/WorkbenchPage-*.js", route => route.abort("failed"));
  await page.goto("/ja");
  await page.getByTestId("site-start-simulation-v3").click();
  await expect(page.getByTestId("page-load-failure-v1")).toBeVisible();
  await page.getByRole("button", { name: "前のページに戻る" }).click();
  await expect(page).toHaveURL(/\/ja$/);
  await expect(page.getByTestId("page-load-failure-v1")).toHaveCount(0);
  await expect(page.getByTestId("site-start-simulation-v3")).toBeVisible();
  expect(documents).toBe(1);
});

test("@desktop @mobile simulation management distinguishes editing from its published version", async ({ page }, info) => {
  await seedManagement(page);
  await page.goto("/ja/me/experiments");
  const list = page.getByRole("list", { name: "保存したシミュレーション" });
  await expect(list.getByRole("listitem")).toHaveCount(3);
  await expect(list.getByRole("link", { name: "編集", exact: true })).toHaveCount(3);
  await expect(list.getByRole("link", { name: "公開版を見る" })).toHaveCount(1);
  const published = list.getByRole("listitem").filter({ hasText: savedTitle });
  await expect(published.getByRole("link", { name: "編集", exact: true })).toHaveAttribute("href", `/ja/experiments/${savedId}`);
  await expect(published.getByRole("link", { name: "公開版を見る" })).toHaveAttribute("href", `/ja/snapshots/${snapshotId}`);
  for (const theme of ["light", "dark"]) {
    await expect(page.locator(".app-root")).toHaveAttribute("data-app-theme", theme);
    expect(await list.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath(`management-${theme}.png`), animations: "disabled" });
    if (theme === "light") await page.getByRole("button", { name: "テーマを切り替え" }).click();
  }
  // Cancelling deletion must keep the row and its publication; accepting removes
  // only the editable experiment, never its independent published snapshot.
  page.once("dialog", dialog => dialog.dismiss());
  await published.getByRole("button", { name: "シミュレーションを削除" }).click();
  await expect(list.getByRole("listitem")).toHaveCount(3);
  page.once("dialog", dialog => dialog.accept());
  await published.getByRole("button", { name: "シミュレーションを削除" }).click();
  await expect(list.getByRole("listitem")).toHaveCount(2);
  expect(await page.evaluate(id => JSON.parse(localStorage.getItem("circleheart.studio.browser-content.v10")!).snapshots.some((snapshot: { snapshotId: string }) => snapshot.snapshotId === id), snapshotId)).toBe(true);
});

test("@desktop @mobile Back returns from saved and published simulations to management, including after reload", async ({ page }) => {
  await seedManagement(page);
  await page.goto("/ja/me/experiments");
  const row = page.getByRole("listitem").filter({ hasText: savedTitle });
  await row.getByRole("link", { name: "編集", exact: true }).click();
  await expectWorkbench(page);
  await page.reload();
  await expectWorkbench(page);
  await page.getByTestId("workbench-back-v1").click();
  await expect(page).toHaveURL(/\/ja\/me\/experiments$/);
  await row.getByRole("link", { name: "公開版を見る" }).click();
  await expectWorkbench(page);
  // Published versions open a detached session. Protect uncommitted edits on Back.
  await page.getByTestId("workbench-experiment-title-v3").fill("未保存の比較");
  page.once("dialog", dialog => dialog.dismiss());
  await page.getByTestId("workbench-back-v1").click();
  await expect(page).toHaveURL(new RegExp(`/ja/snapshots/${snapshotId}$`));
  await expect(page.getByTestId("workbench-experiment-title-v3")).toHaveValue("未保存の比較");
  page.once("dialog", dialog => dialog.accept());
  await page.getByTestId("workbench-back-v1").click();
  await expect(page).toHaveURL(/\/ja\/me\/experiments$/);
});

test("@desktop direct saved links fall back to management; new sessions return to their entry page", async ({ page }) => {
  await seedManagement(page);
  await page.goto(`/ja/experiments/${savedId}`);
  await expectWorkbench(page);
  await page.getByTestId("workbench-back-v1").click();
  await expect(page).toHaveURL(/\/ja\/me\/experiments$/);
  await page.goto("/ja/experiments/new");
  await expectWorkbench(page);
  await page.getByTestId("workbench-back-v1").click();
  await expect(page).toHaveURL(/\/ja$/);
  await page.getByTestId("site-start-simulation-v3").click();
  await expectWorkbench(page);
  await page.getByTestId("workbench-back-v1").click();
  await expect(page).toHaveURL(/\/ja$/);
});

test("@desktop @mobile management navigation keeps lists, creation actions and header aligned", async ({ page }, info) => {
  await seedManagement(page);
  await page.goto("/ja/me/experiments");
  const nav = page.getByRole("navigation", { name: "コンテンツの管理" });
  const layouts: Record<string, { x: number; y: number; width: number; height: number }> = {};
  for (const [label, resource, title, createHref] of [
    ["記事", "articles", "記事を管理", "/ja/articles/new/edit"],
    ["コース", "courses", "コースを管理", "/ja/courses/new"],
    ["シミュレーション", "experiments", "シミュレーションを管理", "/ja/experiments/new"],
  ]) {
    await nav.getByRole("link", { name: label, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/ja/me/${resource}$`));
    await expect(nav.locator('[aria-current="page"]')).toHaveText(label);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
    await expect(page.locator(".management-create")).toHaveAttribute("href", createHref);
    await expect(page.locator(".management-create")).toHaveText("新規作成");
    await expect(page.locator(".management-create")).toHaveAccessibleName(/^新規作成:/);
    await expect(page.locator(".management-page-header p")).toHaveCount(0);
    layouts[resource] = (await page.locator(".management-create").boundingBox())!;
    await page.screenshot({ path: info.outputPath(`management-${resource}.png`), animations: "disabled" });
  }
  expect(layouts.articles).toEqual(layouts.courses);
  expect(layouts.courses).toEqual(layouts.experiments);
  const managedBrand = (await page.locator(".site-brand-link").boundingBox())!;
  const side = (await nav.boundingBox())!;
  const content = (await page.locator(".management-content").boundingBox())!;
  if (page.viewportSize()!.width >= 768) expect(side.x + side.width).toBeLessThan(content.x);
  else expect(side.y + side.height).toBeLessThan(content.y);
  await page.locator(".site-brand-link").click();
  await expect(page).toHaveURL(/\/ja$/);
  const homeBrand = (await page.locator(".site-brand-link").boundingBox())!;
  expect(managedBrand.x).toBe(homeBrand.x);
  if (info.project.name === "mobile-chromium") {
    await page.setViewportSize({ width: 320, height: 740 });
    await page.goto("/ja/me/experiments");
    for (const selector of [".management-nav", ".management-page-header", ".site-header"]) {
      expect(await page.locator(selector).evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    }
    await page.screenshot({ path: info.outputPath("management-320.png"), animations: "disabled" });
  }
});

import { expect, test, type Page } from "@playwright/test";
import { courseArticleFixtureV1 } from "../__tests__/fixtures/courseFixtureV1";
import type { StudioPublishedArticleV1 } from "../studio/application/publication/StudioPublishedArticleV1";
import { renderStudioPublicArticleBootstrapV1 } from "../studio/application/publication/StudioPublicArticleBootstrapV1";

const article: StudioPublishedArticleV1 = {
  ...courseArticleFixtureV1(),
  blocks: [
    ...courseArticleFixtureV1().blocks,
    { kind: "experiment", blockId: "experiment", placement: {
      schemaId: "circleheart-studio-experiment-placement-v2",
      placementId: "deferred", snapshotId: "33333333-3333-4333-8333-333333333333",
      caption: "本文を読みながら、あとから実験できます。", titleOverride: null,
      briefing: { defaultTitle: "圧と容積を比べる",
        scenarioScope: { visibleScenarioIds: ["baseline"], initialFocusScenarioId: "baseline" },
        graphs: [{ paneId: "wave", order: 0, emphasis: "primary" }], outputs: [], controls: [],
      },
    } },
  ],
};
function gate() {
  let release!: () => void;
  const promise = new Promise<void>(resolve => { release = resolve; });
  return { promise, release };
}
async function isolate(page: Page) {
  await page.context().route("https://public-content.test/**", route => {
    const path = new URL(route.request().url()).pathname;
    const headers = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" };
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers });
    if (path.endsWith("list_public_article_summaries_v1")) return route.fulfill({ headers, json: {
      items: [{ articleId: article.articleId, articleContentId: article.articleContentId,
        publicSlug: article.publicSlug, locale: article.locale, title: article.title,
        excerpt: "本文を先に読む", tags: article.tags, publishedAt: article.publishedAt, updatedAt: article.updatedAt }], nextCursor: null,
    } });
    if (path.endsWith("list_public_experiment_summaries_v1")) return route.fulfill({ headers, json: { items: [], nextCursor: null } });
    if (path.endsWith("list_courses_v1")) return route.fulfill({ headers, json: [] });
    return route.fulfill({ headers, json: null });
  });
}

test("@desktop @mobile @webkit navigation shows prose while simulation data and code are blocked", async ({ page }, info) => {
  await isolate(page);
  if (info.project.name === "mobile-chromium") await page.addInitScript(() => {
    localStorage.setItem("circleheart.app.theme", "light");
  });
  const content = gate(), snapshot = gate(), code = gate();
  let articleRequests = 0, snapshotRequests = 0;
  await page.route("**/api/v1/public/articles/*", async route => {
    articleRequests++;
    await content.promise;
    await route.fulfill({ json: article });
  });
  await page.route("**/rest/v1/rpc/read_experiment_snapshot_v1", async route => {
    snapshotRequests++;
    await snapshot.promise;
    await route.fulfill({ json: null });
  });
  await page.route("**/assets/ArticleReaderExperimentV3-*.js", async route => {
    await code.promise;
    await route.continue();
  });
  try {
    await page.goto("/ja/articles");
    const link = page.getByRole("link", { name: new RegExp(article.title) });
    // Focus also prefetches for keyboard navigation.
    await link.focus();
    await expect.poll(() => articleRequests).toBe(1);
    await link.click();
    const skeleton = page.getByTestId("article-loading-skeleton");
    await expect(skeleton).toBeVisible();
    await expect(skeleton).toHaveAttribute("aria-busy", "true");
    expect(await skeleton.evaluate(el => el.scrollWidth > el.clientWidth + 1)).toBe(false);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(skeleton.locator(".article-loading-skeleton")).toHaveCSS("animation-name", "none");
    await page.screenshot({ path: info.outputPath("article-skeleton.png") });
    content.release();
    await expect(page.locator(".article-title")).toHaveText(article.title);
    await expect(page.locator(".article-paragraph").first()).toBeVisible();
    await expect(skeleton).toHaveCount(0);
    await expect.poll(() => snapshotRequests).toBe(1);
    expect(articleRequests).toBe(1);
    code.release(); snapshot.release();
    await expect(page.getByRole("alert")).toContainText("固定されたシミュレーションを読み込めません。");
    await expect(page.locator(".article-title")).toHaveText(article.title);
    await page.getByRole("button", { name: "もう一度読み込む" }).click();
    await expect.poll(() => snapshotRequests).toBe(2);
  } finally { content.release(); snapshot.release(); code.release(); }
});

test("@desktop @mobile @webkit offscreen experiments load only when approached, including fragment links", async ({ page }) => {
  await isolate(page);
  const distant: StudioPublishedArticleV1 = { ...article, blocks: [
    ...Array.from({ length: 35 }, (_, index) => ({ kind: "paragraph" as const, blockId: `text-${index}`, text: "この記事の本文は、実験の初期化を待たずに読むことができます。" })),
    article.blocks[1],
  ] };
  let snapshots = 0, graphModules = 0;
  page.on("request", request => { if (/ArticleReaderExperimentV3-.*\.js/.test(request.url())) graphModules++; });
  await page.route("**/api/v1/public/articles/*", route => route.fulfill({ json: distant }));
  await page.route("**/rest/v1/rpc/read_experiment_snapshot_v1", route => { snapshots++; return route.fulfill({ json: null }); });
  await page.goto(`/ja/articles/${article.publicSlug}`);
  await expect(page.locator(".article-title")).toHaveText(article.title);
  await expect(page.locator(".article-paragraph")).toHaveCount(35);
  expect(snapshots).toBe(0);
  expect(graphModules).toBe(0);
  const placement = page.locator('[id="placement-deferred"]');
  await placement.evaluate(element => {
    const pane = element.closest<HTMLElement>('[data-public-static-scroll-host="true"]')!;
    // Still offscreen, but within the 400px preparation margin of the article pane.
    pane.scrollTop += element.getBoundingClientRect().top - pane.getBoundingClientRect().bottom - 200;
  });
  await expect(placement).not.toBeInViewport();
  await expect.poll(() => snapshots).toBe(1);
  await expect.poll(() => graphModules).toBe(1);
  await page.goto(`/ja/articles/${article.publicSlug}#placement-deferred`);
  await page.reload();
  await expect(page.locator('[id="placement-deferred"]')).toBeInViewport();
  await expect.poll(() => snapshots).toBe(2);
});

test("@desktop @mobile @webkit server article stays readable through the client handoff", async ({ page }) => {
  await isolate(page);
  const snapshot = gate();
  let articleFetches = 0;
  await page.route("**/api/v1/public/articles/*", route => { articleFetches++; return route.abort(); });
  await page.route("**/rest/v1/rpc/read_experiment_snapshot_v1", async route => {
    await snapshot.promise; await route.fulfill({ json: null });
  });
  await page.route(`**/ja/articles/${article.publicSlug}`, async route => {
    const template = await (await route.fetch()).text();
    const body = template.replace('<div id="root"></div>',
      `<div id="public-static-root"><article class="article-document"><h1 class="article-title">${article.title}</h1><p>本文を先に読む</p></article>${renderStudioPublicArticleBootstrapV1(article)}</div><div id="root" hidden></div>`);
    await route.fulfill({ contentType: "text/html", body });
  });
  try {
    await page.goto(`/ja/articles/${article.publicSlug}`);
    await expect(page.locator(".article-title:visible")).toHaveText(article.title);
    await expect(page.getByTestId("article-reader-v3")).toBeVisible();
    await expect(page.getByTestId("article-loading-skeleton")).toHaveCount(0);
    expect(articleFetches).toBe(0);
  } finally { snapshot.release(); }
});

for (const chunk of ["ArticleReaderExperimentV3", "StudioDefaultCompositionV2"]) {
  test(`@desktop @mobile @webkit a failed ${chunk} module offers a working page reload`, async ({ page }) => {
    await isolate(page);
    const snapshot = gate();
    let graphModules = 0;
    await page.route("**/api/v1/public/articles/*", route => route.fulfill({ json: article }));
    await page.route("**/rest/v1/rpc/read_experiment_snapshot_v1", async route => {
      await snapshot.promise;
      await route.fulfill({ json: null });
    });
    await page.route(`**/assets/${chunk}-*.js`, route => {
      graphModules++;
      return graphModules === 1 ? route.abort() : route.continue();
    });
    try {
      await page.goto(`/ja/articles/${article.publicSlug}`);
      const reload = page.getByRole("button", { name: "ページを再読み込み", exact: true });
      await expect(reload).toBeVisible();
      expect(graphModules).toBe(1);
      await expect(page.locator(".article-title")).toHaveText(article.title);
      snapshot.release();
      await reload.click();
      await expect.poll(() => graphModules).toBe(2);
      await expect(page.getByRole("button", { name: "もう一度読み込む", exact: true })).toBeVisible();
      await expect(reload).toHaveCount(0);
    } finally { snapshot.release(); }
  });
}

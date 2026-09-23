import { expect, test } from "@playwright/test";
import { articleReadingFixtureV1 } from "../__tests__/fixtures/articleReadingFixtureV1";

// A deterministic image fixture keeps navigation/geometry checks independent of publishers.
const pixel = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aL1sAAAAASUVORK5CYII=", "base64");

test("@desktop @mobile @webkit article references, endnotes, figure and card navigation", async ({ page }) => {
  const draft = articleReadingFixtureV1();
  await page.addInitScript(article => {
    localStorage.setItem("circleheart.studio.browser-content.v10", JSON.stringify({
      schemaId: "circleheart-studio-browser-content-v10", experiments: [], snapshots: [], articles: [article],
    }));
  }, draft);
  // Exercise the same preview reader when the build has a configured remote repository.
  await page.route("**/rest/v1/rpc/read_article_v1", route => route.fulfill({ json: draft }));
  await page.route("https://example.test/**", async route => {
    if (route.request().url().endsWith("/figure.png")) await route.fulfill({ contentType: "image/png", body: pixel });
    else await route.abort();
  });
  await page.goto(`/ja/articles/${draft.articleId}/preview`);
  const article = page.locator(".article-document");
  await expect(article.getByRole("heading", { name: draft.title, exact: true })).toBeVisible();
  await expect(article).not.toContainText("[@ref/");
  await expect(article).not.toContainText("[^note/");
  // IDs are derived from authored offsets; locate semantically for independent checks.
  const citation = article.locator('[role="doc-biblioref"][aria-label="文献1"]').first();
  await expect(citation).toHaveText("1,");
  await expect(citation.locator("..")).toHaveJSProperty("tagName", "SUP");
  await citation.click();
  const reference = page.locator('[id="article-reference-ref/b"]');
  await expect(reference).toBeInViewport();
  await expect(reference).toBeFocused();
  await page.goBack();
  await expect(citation).toBeInViewport();
  await expect(citation).toBeFocused();
  await citation.click();
  await reference.locator('[role="doc-backlink"][aria-label="引用箇所1に戻る"]').click();
  await expect(citation).toBeFocused();

  const note = article.locator('[role="doc-noteref"][aria-label="注1"]');
  await note.click();
  const endnote = page.locator('[id="article-note-note/b"]');
  await expect(endnote).toBeInViewport();
  await expect(endnote).toBeFocused();
  await endnote.locator('[role="doc-backlink"]').click();
  await expect(note).toBeFocused();

  await article.locator(".article-toc summary").click();
  await article.getByRole("navigation", { name: "記事の目次" }).getByRole("link", { name: "図から読む" }).click();
  await expect(article.getByRole("heading", { name: "図から読む", exact: true })).toBeInViewport();
  await article.getByRole("link", { name: "図1", exact: true }).click();
  await expect(page.locator('[id="article-figure-fig/one"]')).toBeFocused();
  const enlarge = article.getByRole("button", { name: "図1を拡大", exact: true });
  await enlarge.click();
  const dialog = page.getByRole("dialog", { name: "図1：同時記録した圧と容積", exact: true });
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(enlarge).toBeFocused();

  const card = article.locator(".article-resource-card").filter({ hasText: "関連する実験を読む" });
  await card.scrollIntoViewIfNeeded();
  await expect(card.locator(".article-resource-image img")).toBeVisible();
  await expect(card.locator(".article-resource-host img")).toHaveCount(0);
  const cardBox = await card.boundingBox();
  const imageBox = await card.locator(".article-resource-image").boundingBox();
  expect(imageBox!.x).toBeGreaterThan(cardBox!.x + cardBox!.width / 2);
  const broken = article.locator(".article-resource-card").filter({ hasText: "画像がない関連資料" });
  await broken.scrollIntoViewIfNeeded();
  await expect(broken.locator(".article-resource-image")).toHaveCount(0);
  await expect(broken).toBeVisible();
  await expect(article.locator(".article-resource-card")).toHaveCount(2);
  await expect(article.locator(".article-figure-credit a", { hasText: "CC BY 4.0" })).toHaveCount(1);
  await expect(article.locator(".article-references > ol > li")).toHaveCount(2);
  const overflow = await article.evaluate(el => el.scrollWidth > el.clientWidth + 1);
  expect(overflow).toBe(false);
});

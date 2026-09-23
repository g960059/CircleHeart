import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

const origin = "https://public-content.test";
const bundle = JSON.parse(readFileSync(new URL("../data/model-releases/standard74/bundle.json", import.meta.url), "utf8"));
const artifact = readFileSync(new URL("../data/model-releases/standard74/artifact.mjs.txt", import.meta.url), "utf8");
const experimentId = "40000000-0000-4000-8000-000000000001";

async function openPublicationMenu(page: Page) {
  const menu = page.getByTestId("workbench-publication-menu-v3");
  // Runtime capture can disable the trigger between Playwright's actionability
  // check and the click. Retry only opening the menu, never its publication action.
  await expect(async () => {
    if (!await menu.isVisible()) {
      await page.getByTestId("v3-publish-experiment").click({ timeout: 1000 });
    }
    await expect(menu).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 30_000 });
  return menu;
}

async function authoringFixture(page: Page) {
  const user = { id: "40000000-0000-4000-8000-000000000002", aud: "authenticated", role: "authenticated", email: "publication@example.test", is_anonymous: false, user_metadata: {}, app_metadata: {}, created_at: "2026-09-18T00:00:00Z" };
  const state = { resource: null as any, failSave: false, failPublish: false, saves: 0, publishes: 0, saveDelay: 0, lastResolvedSnapshotId: null as string | null, snapshots: new Map<string, any>() };
  await page.addInitScript(({ user }) => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    localStorage.setItem("sb-public-content-auth-token", JSON.stringify({
      access_token: `${btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }))}.${btoa(JSON.stringify({ sub: user.id, exp, aud: "authenticated", role: "authenticated" }))}.fixture`,
      refresh_token: "fixture", token_type: "bearer", expires_at: exp, expires_in: 3600, user,
    }));
  }, { user });
  // Every backend request is isolated; the real checked-in numerical Worker runs.
  await page.context().route(`${origin}/**`, async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const headers = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" };
    const reply = (json: unknown) => route.fulfill({ headers, json });
    const fail = (message: string) => route.fulfill({ status: 400, headers, json: { code: "P0001", message } });
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers });
    if (path === "/auth/v1/user") return reply(user);
    if (path.endsWith("/current.mjs")) return route.fulfill({ headers, contentType: "text/javascript", body: artifact });
    const rpc = path.split("/").at(-1);
    const model = { model_id: bundle.manifest.modelId, artifact_revision_id: bundle.artifactRevisionId, artifact_path: "test-artifacts/current.mjs", module_abi: "circleheart-exact-model-esm-v1", manifest: bundle.manifest, default_fixture: bundle.baseline.capture.fixture, stage: "stable" };
    if (rpc === "get_active_model_bundle_v2") return reply([{ ...model, bundle_version: 1, model_stage: "stable", surface_stage: "stable", surface_release_id: bundle.surface.surfaceReleaseId, surface_manifest: bundle.surface }]);
    if (rpc === "get_model_release_v2") return reply([model]);
    if (rpc === "get_model_surface_release_v1" || rpc === "get_model_surface_series_latest_v1") return reply([{ manifest: bundle.surface, stage: "stable" }]);
    if (rpc === "read_my_profile_v1" || rpc === "read_public_resource_author_v1") return reply(null);
    if (rpc === "read_my_experiment_v1") return reply(state.resource);
    const body = request.postDataJSON();
    if (rpc === "read_public_experiment_v1") {
      state.lastResolvedSnapshotId = state.resource?.publishedSnapshotId ?? null;
      return reply(state.resource?.publicSlug === body.p_public_slug ? { experimentId, title: state.resource.title, snapshot: state.snapshots.get(state.resource.publishedSnapshotId) } : null);
    }
    if (rpc === "read_public_snapshot_title_v1") return reply(state.resource?.publishedTitle ?? null);
    if (rpc === "save_experiment_v1") {
      state.saves++;
      if (state.saveDelay) await new Promise(resolve => setTimeout(resolve, state.saveDelay));
      if (state.failSave) return fail("Fixture save failed");
      const version = body.p_expected_version === null ? 0 : body.p_expected_version + 1;
      state.resource = { ...state.resource, experiment: { schemaId: "circleheart-studio-experiment-v2", experimentId, version, content: body.p_content }, title: body.p_title, createdAt: "2026-09-18T00:00:00.000Z", updatedAt: new Date().toISOString(), publishedSnapshotId: state.resource?.publishedSnapshotId ?? null, publicSlug: state.resource?.publicSlug ?? null, publishedVersion: state.resource?.publishedVersion ?? null, publishedAt: state.resource?.publishedAt ?? null };
      return reply({ experimentId, version, title: body.p_title, modelId: body.p_model_id });
    }
    if (rpc === "commit_admitted_experiment_snapshot_v1") {
      const snapshotId = `40000000-0000-4000-8000-${String(state.snapshots.size + 100).padStart(12, "0")}`;
      const snapshot = { schemaId: "circleheart-studio-experiment-snapshot-v2", snapshotId, content: body.p_content, surfaceReleaseId: body.p_surface_release_id, createdAt: new Date().toISOString() };
      state.snapshots.set(snapshotId, snapshot);
      return reply(snapshot);
    }
    if (rpc === "publish_experiment_v1") {
      state.publishes++;
      if (state.failPublish) return fail("Fixture publish failed");
      Object.assign(state.resource, { publishedSnapshotId: body.p_snapshot_id, publishedVersion: body.p_expected_version, publishedAt: new Date().toISOString(), publicSlug: body.p_public_slug, publishedTitle: state.resource.title });
      return reply({ experimentId, snapshotId: body.p_snapshot_id, publicSlug: body.p_public_slug });
    }
    if (rpc === "unpublish_experiment_v1") {
      Object.assign(state.resource, { publishedSnapshotId: null, publishedVersion: null, publishedAt: null, publicSlug: null });
      return reply({ experimentId, published: false });
    }
    if (rpc === "read_experiment_snapshot_v1") return reply(state.snapshots.get(body.p_snapshot_id) ?? null);
    return route.abort();
  });
  return state;
}

test("@desktop @mobile Workbench save and publication stay distinct through failure, reload, and unpublish", async ({ page }, testInfo) => {
  const state = await authoringFixture(page);
  await page.goto("/ja/experiments/new");
  const save = page.getByTestId("v3-save-experiment");
  const publish = page.getByTestId("v3-publish-experiment");
  const title = page.getByTestId("workbench-experiment-title-v3");
  await expect(publish).toBeVisible();
  await expect(save).toBeDisabled();
  await expect(publish).toBeDisabled();
  await title.fill("公開の操作確認");
  await expect(save).toBeEnabled();
  await expect(publish).toBeEnabled();
  const menu = await openPublicationMenu(page);
  await expect(menu).toContainText("非公開");
  state.failSave = true;
  await menu.getByRole("button", { name: "保存して公開", exact: true }).click();
  await expect(menu).toContainText("Fixture save failed");
  expect(state.publishes).toBe(0);
  state.failSave = false;
  state.failPublish = true;
  await menu.getByRole("button", { name: "保存して公開", exact: true }).click();
  await expect(page.getByTestId("workbench-snapshot-error-v3")).toContainText("Fixture publish failed", { timeout: 90_000 });
  await expect(save).toBeDisabled();
  await expect(save).toHaveText("保存済み");
  await expect(publish).toHaveText("公開");
  await expect(page).toHaveURL(new RegExp(`/experiments/${experimentId}$`));
  await page.reload();
  await expect(save).toHaveText("保存済み");
  await expect(title).toHaveValue("公開の操作確認");
  state.failPublish = false;
  await openPublicationMenu(page);
  await menu.getByRole("button", { name: "公開する", exact: true }).click();
  await expect(publish).toHaveText("公開中", { timeout: 90_000 });
  await expect(page).toHaveURL(new RegExp(`/experiments/${experimentId}$`));
  await expect(publish).toHaveAttribute("data-stale", "false");
  const sharedHref = await menu.getByRole("link", { name: "公開ページ", exact: true }).getAttribute("href");
  expect(sharedHref).toContain("/experiments/published/");
  const originalSnapshotId = state.resource.publishedSnapshotId;
  await menu.getByRole("button", { name: "閉じる", exact: true }).click();
  await title.fill("公開後の編集");
  await expect(publish).toHaveAttribute("data-stale", "true");
  await save.click();
  await expect(save).toHaveText("保存済み");
  expect(state.resource.publishedVersion).toBe(0);
  expect(state.resource.experiment.version).toBe(1);
  await page.reload();
  await expect(publish).toHaveAttribute("data-stale", "true");
  await openPublicationMenu(page);
  await expect(menu.getByRole("button", { name: "公開版を更新", exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("fable-publication-menu.png") });
  if (testInfo.project.name === "mobile-chromium") {
    await expect(page.locator(".workbench-app-header")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    const box = await menu.boundingBox();
    expect(box!.y + box!.height).toBeLessThanOrEqual(844);
    await page.setViewportSize({ width: 320, height: 740 });
    await expect(page.getByTestId("workbench-simulation-info-trigger-v3")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
    const publishBox = await publish.boundingBox();
    expect(publishBox!.x + publishBox!.width).toBeLessThanOrEqual(320);
    await page.screenshot({ path: testInfo.outputPath("fable-publication-menu-320.png") });
  }
  await menu.getByRole("button", { name: "公開版を更新", exact: true }).click();
  await expect(publish).toHaveText("公開中", { timeout: 90_000 });
  await expect(publish).toHaveAttribute("data-stale", "false", { timeout: 90_000 });
  expect(state.resource.publishedVersion).toBe(1);
  await menu.getByRole("button", { name: "閉じる", exact: true }).click();
  if (testInfo.project.name === "desktop-chromium") {
    await page.getByTestId("workbench-theme-toggle").click();
  }
  await title.fill("公開更新後の追加編集");
  await openPublicationMenu(page);
  await menu.getByRole("button", { name: "保存して公開版を更新", exact: true }).click();
  await expect(publish).toHaveText("公開中", { timeout: 90_000 });
  await expect(publish).toHaveAttribute("data-stale", "false", { timeout: 90_000 });
  await expect(save).toHaveText("保存済み");
  expect(state.resource.publishedVersion).toBe(2);
  await page.screenshot({ path: testInfo.outputPath("fable-publication-current.png") });
  expect(state.resource.publishedSnapshotId).not.toBe(originalSnapshotId);
  expect(await menu.getByRole("link", { name: "公開ページ", exact: true }).getAttribute("href")).toBe(sharedHref);
  const reader = await page.context().newPage();
  await reader.goto(sharedHref!);
  await expect(reader.getByTestId("workbench-experiment-title-v3")).toHaveValue("公開更新後の追加編集");
  expect(state.lastResolvedSnapshotId).toBe(state.resource.publishedSnapshotId);
  await reader.close();
  await menu.getByRole("button", { name: "公開を解除", exact: true }).click();
  await expect(menu).toContainText("公開中の記事");
  await menu.getByRole("button", { name: "公開を解除", exact: true }).click();
  await expect(publish).toHaveText("公開");
  await expect(menu).toContainText("非公開");
  expect(state.resource.title).toBe("公開更新後の追加編集");
  const unpublishedReader = await page.context().newPage();
  await unpublishedReader.goto(sharedHref!);
  await expect(unpublishedReader.getByTestId("publication-unavailable-v1").getByText(/非公開になったか/)).toBeVisible();
  await expect(unpublishedReader.getByRole("button", { name: "再読み込み", exact: true })).toHaveCount(0);
  await unpublishedReader.close();
});

test("@desktop edits during saving remain unsaved and prevent chained publication", async ({ page }) => {
  const state = await authoringFixture(page);
  await page.goto("/ja/experiments/new");
  const publish = page.getByTestId("v3-publish-experiment");
  await expect(publish).toBeVisible();
  const title = page.getByTestId("workbench-experiment-title-v3");
  await title.fill("保存開始時の内容");
  const menu = await openPublicationMenu(page);
  state.saveDelay = 1500;
  await menu.getByRole("button", { name: "保存して公開", exact: true }).click();
  await expect.poll(() => state.saves).toBe(1);
  await menu.getByRole("button", { name: "閉じる", exact: true }).click();
  await title.fill("保存中に追加した変更");
  await expect(page.getByTestId("workbench-snapshot-error-v3")).toContainText("新しい変更");
  await expect(page.getByTestId("v3-save-experiment")).toBeEnabled();
  await expect(title).toHaveValue("保存中に追加した変更");
  expect(state.resource.title).toBe("保存開始時の内容");
  expect(state.publishes).toBe(0);
});

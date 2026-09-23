import { renderStudioPublicArticleBootstrapV1 } from "../studio/application/publication/StudioPublicArticleBootstrapV1";
import { renderCourseBootstrapV1 } from "../studio/application/course/StudioCourseBootstrapV1";
import { renderStudioPublicHomeBootstrapV1, type StudioPublicHomeBootstrapV1 } from "../studio/application/publication/StudioPublicHomeBootstrapV1";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";
import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import {
  courseFixtureV1 as course,
  courseArticleFixtureV1,
} from "../__tests__/fixtures/courseFixtureV1";
import type { CourseDraftV1 } from "../studio/application/course/StudioCourseV1";

const supabaseUrl = "https://public-content.test";
const bundle = JSON.parse(
  readFileSync(
    new URL("../data/model-releases/standard74/bundle.json", import.meta.url),
    "utf8",
  ),
);
const artifact = readFileSync(
  new URL(
    "../data/model-releases/standard74/artifact.mjs.txt",
    import.meta.url,
  ),
  "utf8",
);

test.beforeEach(async ({ context }) => {
  // Only registry metadata is mocked: the Worker executes the committed artifact.
  // No request from this suite may fall through to a production content service.
  await context.route(`${supabaseUrl}/**`, async (route) => {
    const url = new URL(route.request().url());
    const headers = {
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "*",
      "access-control-allow-methods": "*",
    };
    if (route.request().method() === "OPTIONS")
      return route.fulfill({ status: 204, headers });
    if (url.pathname === "/rest/v1/rpc/get_model_release_v2")
      return route.fulfill({
        headers,
        json: [
          {
            model_id: bundle.manifest.modelId,
            artifact_revision_id: bundle.artifactRevisionId,
            artifact_path: "test-artifacts/current.mjs",
            module_abi: "circleheart-exact-model-esm-v1",
            manifest: bundle.manifest,
            default_fixture: bundle.baseline.capture.fixture,
            stage: "stable",
          },
        ],
      });
    if (url.pathname === "/rest/v1/rpc/get_model_surface_release_v1")
      return route.fulfill({
        headers,
        json: [{ manifest: bundle.surface, stage: "stable" }],
      });
    if (url.pathname === "/storage/v1/object/public/test-artifacts/current.mjs")
      return route.fulfill({
        headers,
        contentType: "text/javascript",
        body: artifact,
      });
    return route.abort();
  });
});

async function signInFixture(page: Page, expiresInSeconds = 3600) {
  const user = {
    id: course.ownerId,
    aud: "authenticated",
    role: "authenticated",
    email: "course@example.test",
    is_anonymous: false,
    user_metadata: { full_name: "Course editor" },
    app_metadata: {},
    created_at: "2026-09-13T00:00:00Z",
  };
  await page.route("**/auth/v1/user", (r) => r.fulfill({ json: user }));
  await page.addInitScript(
    ({ user, url, expiresInSeconds }) => {
      const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
      const jwt = `${btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }))}.${btoa(JSON.stringify({ sub: user.id, exp, aud: "authenticated", role: "authenticated" }))}.fixture`;
      localStorage.setItem(
        `sb-${new URL(url).hostname.split(".")[0]}-auth-token`,
        JSON.stringify({
          access_token: jwt,
          refresh_token: "fixture-refresh",
          token_type: "bearer",
          expires_at: exp,
          expires_in: 3600,
          user,
        }),
      );
    },
    { user, url: supabaseUrl, expiresInSeconds },
  );
  return user;
}
async function publicFixtures(page: Page) {
  await page.route("**/rest/v1/rpc/list_courses_v1", (r) =>
    r.fulfill({ json: [course] }),
  );
  await page.route("**/rest/v1/rpc/read_public_course_v1", (r) =>
    r.fulfill({ json: course }),
  );
  await page.route("**/rest/v1/rpc/read_public_article_route_v1", (r) => {
    const key = r.request().postDataJSON().p_article_route_key;
    const index = course.entries.findIndex(
      (e) => e.articleId === key || e.publicSlug === key,
    );
    return r.fulfill({
      json:
        index >= 0 && course.entries[index].available
          ? courseArticleFixtureV1(index)
          : null,
    });
  });
}
test("@desktop @mobile @webkit public course navigation, direct reload and unavailable chapters", async ({
  page,
}) => {
  await publicFixtures(page);
  await page.goto(`/ja/courses/${course.courseId}`);
  const reader = page.getByTestId("course-reader");
  await expect(
    reader.getByRole("heading", { name: course.title }),
  ).toBeVisible();
  await expect(reader).toContainText("この記事は現在公開されていません");
  await expect(reader).toContainText("Author A");
  await expect(reader).toContainText("Author B");
  await reader.getByRole("link", { name: "一拍を読む", exact: true }).click();
  await expect(page).toHaveURL(
    new RegExp(`read-a-beat\\?course=${course.courseId}`),
  );
  const navigation = page
    .getByRole("navigation", { name: "コースのナビゲーション" })
    .first();
  await expect(navigation).toBeVisible();
  await expect(navigation).toContainText("1 / 3章");
  await page
    .getByRole("navigation", { name: "コースのナビゲーション" })
    .last()
    .getByRole("link", { name: "循環をつなぐ →" })
    .click();
  await expect(
    page.getByRole("heading", { name: "循環をつなぐ", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page
      .getByRole("navigation", { name: "コースのナビゲーション" })
      .last()
      .getByRole("link", { name: "← 一拍を読む" }),
  ).toBeVisible();
  await expect(page.locator(".article-document")).not.toContainText("null");
  expect(
    await page
      .locator(".article-document")
      .evaluate((e) => e.scrollWidth > e.clientWidth + 1),
  ).toBe(false);
  await page.goto("/ja/articles/read-a-beat");
  await expect(
    page.getByRole("complementary", { name: "この記事を含むコース" }),
  ).toContainText(course.title);
});

test("@desktop @mobile Course editor saves and publishes separately; New never overwrites the previous course", async ({
  page,
}) => {
  await signInFixture(page);
  await publicFixtures(page);
  let draft: CourseDraftV1 = {
    courseId: course.courseId,
    version: 1,
    published: true,
    updatedAt: course.updatedAt,
    content: {
      title: course.title,
      description: course.description,
      audience: course.audience,
      locale: "ja",
      articleIds: [course.entries[0].articleId, course.entries[2].articleId],
    },
  };
  const saves: Record<string, unknown>[] = [];
  let publishes = 0;
  await page.route("**/rest/v1/rpc/read_my_course_v1", (r) =>
    r.fulfill({ json: draft }),
  );
  await page.route("**/rest/v1/rpc/save_course_v1", (r) => {
    const p = r.request().postDataJSON();
    saves.push(p);
    draft = {
      ...draft,
      courseId: p.p_course_id ?? "a0000000-0000-4000-8000-000000000099",
      version: p.p_expected_version === null ? 0 : p.p_expected_version + 1,
      content: p.p_content,
      published: p.p_course_id !== null,
    };
    return r.fulfill({ json: draft });
  });
  await page.route("**/rest/v1/rpc/publish_course_v1", (r) => {
    publishes++;
    draft = { ...draft, version: draft.version + 1, published: true };
    return r.fulfill({ json: draft });
  });
  await page.goto(`/ja/courses/${course.courseId}/edit`);
  await page.getByLabel("タイトル", { exact: true }).fill("編集中のコース");
  await page.getByRole("button", { name: "下へ", exact: true }).first().click();
  await page.getByRole("button", { name: "下書きを保存", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("下書きを保存しました");
  expect(publishes).toBe(0);
  expect((saves[0].p_content as { articleIds: string[] }).articleIds[0]).toBe(
    course.entries[2].articleId,
  );
  await page
    .getByRole("button", { name: "保存した内容を公開", exact: true })
    .click();
  await expect(page.getByRole("status")).toHaveText("公開しました");
  expect(publishes).toBe(1);
  // The actual shared menu keeps the same page component mounted across this route change.
  await page.getByTestId("site-create-trigger-v3").click();
  await page.getByRole("menuitem", { name: /新しいコース/ }).click();
  await expect(page.getByLabel("タイトル", { exact: true })).toHaveValue("");
  await page
    .getByLabel("タイトル", { exact: true })
    .fill("新しい独立したコース");
  await page
    .getByLabel("追加する公開記事のURL")
    .fill("https://www.circleheart.dev/ja/articles/read-a-beat");
  await page.getByRole("button", { name: "記事を追加", exact: true }).click();
  await page.getByRole("button", { name: "下書きを保存", exact: true }).click();
  await expect(page).toHaveURL(/000000000099\/edit$/);
  expect(saves[1].p_course_id).toBeNull();
  expect(saves[1].p_expected_version).toBeNull();
});

for (const operation of ["save", "delete"] as const)
  test(`@desktop @mobile @webkit Completed ${operation} from a retired Course editor preserves the new editor`, async ({
    page,
  }) => {
    await signInFixture(page);
    await publicFixtures(page);
    const first: CourseDraftV1 = {
      courseId: course.courseId,
      version: 0,
      published: false,
      updatedAt: course.updatedAt,
      content: {
        title: "最初のコース",
        description: "",
        audience: "",
        locale: "ja",
        articleIds: [],
      },
    };
    await page.route("**/rest/v1/rpc/read_my_course_v1", (r) =>
      r.fulfill({ json: first }),
    );
    await page.route("**/rest/v1/rpc/list_courses_v1", (r) =>
      r.fulfill({ json: [] }),
    );
    let release!: () => void;
    const delayed = new Promise<void>((resolve) => {
      release = resolve;
    });
    const endpoint = `**/rest/v1/rpc/${operation}_course_v1`;
    await page.route(endpoint, async (r) => {
      await delayed;
      await r.fulfill({
        json:
          operation === "save"
            ? first
            : { courseId: first.courseId, deleted: true },
      });
    });
    await page.goto(
      operation === "save"
        ? "/ja/courses/new"
        : `/ja/courses/${first.courseId}/edit`,
    );
    await expect(page.getByLabel("タイトル", { exact: true })).toBeVisible();
    if (operation === "save")
      await page
        .getByLabel("タイトル", { exact: true })
        .fill(first.content.title);
    else page.once("dialog", (dialog) => dialog.accept());
    const requested = page.waitForRequest(endpoint);
    await page
      .getByRole("button", {
        name: operation === "save" ? "下書きを保存" : "コースを削除",
        exact: true,
      })
      .click();
    await requested;
    await page
      .getByRole("link", { name: "← 自分のコース", exact: true })
      .click();
    await page.getByRole("link", { name: "新規作成: 新しいコース", exact: true }).click();
    await page
      .getByLabel("タイトル", { exact: true })
      .fill("入力を続けている新しいコース");
    const response = page.waitForResponse(endpoint);
    release();
    await (await response).finished();
    // Let fetch completion and React navigation commit before checking the new editor.
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    );
    await expect(page).toHaveURL(/\/ja\/courses\/new$/);
    await expect(page.getByLabel("タイトル", { exact: true })).toHaveValue(
      "入力を続けている新しいコース",
    );
  });

for (const signedIn of [false, true])
  test(`@desktop @mobile ${signedIn ? "owner" : "guest"} public Snapshot opens detached Workbench at1x with its public title`, async ({
    page,
  }) => {
    if (signedIn) await signInFixture(page);
    await page.route("**/rest/v1/rpc/read_public_resource_author_v1", (r) =>
      r.fulfill({
        json: {
          userId: course.ownerId,
          displayName: "CircleHeart",
          official: true,
        },
      }),
    );
    const baseline = JSON.parse(
      readFileSync(
        new URL(
          "../data/model-baselines/standard74-baseline-v1.json",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    const snapshot = {
      schemaId: "circleheart-studio-experiment-snapshot-v2",
      snapshotId: "a0000000-0000-4000-8000-000000000030",
      createdAt: "2026-09-13T00:00:00.000Z",
      surfaceReleaseId: baseline.surfaceReleaseId,
      content: {
        modelId: baseline.modelId,
        surfaceSeriesId: bundle.surface.surfaceSeriesId,
        scenarios: [
          {
            scenarioId: "baseline",
            label: "基準状態",
            capture: baseline.capture,
          },
        ],
        surface: {
          graphPanes: [
            {
              paneId: "wave",
              role: "graph",
              label: "左室圧",
              order: 0,
              priority: 1,
              graphId: "hemodynamics.pressure.waveform.comprehensive-v1",
              scenarioScope: { mode: "visible-scenarios" },
              excludedTraces: [],
              windowSec: 2,
              series: [{ seriesId: "LVP", label: "LVP", order: 0 }],
            },
          ],
          outputPanes: [],
          controlPanes: [],
          note: { text: "" },
        },
      },
    };
    let saves = 0;
    await page.route("**/rest/v1/rpc/read_experiment_snapshot_v1", (r) =>
      r.fulfill({ json: snapshot }),
    );
    await page.route("**/rest/v1/rpc/read_public_snapshot_title_v1", (r) =>
      r.fulfill({ json: "一拍を読む：PV・圧・流量の対応" }),
    );
    await page.route("**/rest/v1/rpc/save_experiment_v1", (r) => {
      saves++;
      return r.abort();
    });
    await page.goto(`/ja/snapshots/${snapshot.snapshotId}`);
    await expect(page.getByTestId("v3-dockview-workbench")).toBeVisible();
    const title = page.getByTestId("workbench-experiment-title-v3");
    await expect(title).toHaveValue("一拍を読む：PV・圧・流量の対応");
    await expect(page.locator(".public-author")).toContainText("CircleHeart");
    await expect(page.locator(".public-author-badge")).toBeVisible();
    await expect(page.getByTestId("v3-playback-rate-trigger")).toHaveText("1×");
    const canvas = page.locator("canvas").first();
    const initial = await canvas.evaluate((e: HTMLCanvasElement) =>
      e.toDataURL(),
    );
    await expect
      .poll(() => canvas.evaluate((e: HTMLCanvasElement) => e.toDataURL()))
      .not.toBe(initial);
    await title.fill("自分の探索");
    await title.press("Enter");
    expect(saves).toBe(0);
    await page.reload();
    await expect(title).toHaveValue("一拍を読む：PV・圧・流量の対応");
    expect(saves).toBe(0);
  });

test("@desktop server Course navigation survives a failed client refresh", async ({
  page,
}) => {
  await publicFixtures(page);
  await page.route("**/rest/v1/rpc/read_public_course_v1", (route) =>
    route.abort(),
  );
  await page.route("**/ja/articles/read-a-beat?course=*", async (route) => {
    const response = await route.fetch();
    const html = (await response.text()).replace(
      "</body>",
      `${renderCourseBootstrapV1(course)}</body>`,
    );
    await route.fulfill({ response, body: html });
  });
  await page.goto(`/ja/articles/read-a-beat?course=${course.courseId}`);
  await expect(
    page.getByRole("heading", { name: "一拍を読む", exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("navigation", { name: "コースのナビゲーション" })
      .last()
      .getByRole("link", { name: "循環をつなぐ →" }),
  ).toBeVisible();
});

test("@desktop @mobile @webkit public discovery stays consistent across themes and resumes a valid chapter", async ({
  page,
}, testInfo) => {
  let documentRequests = 0;
  page.on("request", (request) => {
    if (request.isNavigationRequest() && request.resourceType() === "document") documentRequests++;
  });
  await publicFixtures(page);
  const author = {
    userId: course.ownerId,
    displayName: "CircleHeart",
    official: true,
  };
  const displayedCourse = {
    ...course,
    author,
    authorName: "CircleHeart",
    entries: course.entries.map((e, i) =>
      i === 0 ? { ...e, authorName: "CircleHeart", author } : e,
    ),
  };
  await page.route("**/rest/v1/rpc/read_public_course_v1", (r) =>
    r.fulfill({ json: displayedCourse }),
  );
  await page.route("**/rest/v1/rpc/list_courses_v1", (r) =>
    r.fulfill({ json: [displayedCourse] }),
  );
  await page.route("**/rest/v1/rpc/read_public_resource_author_v1", (r) =>
    r.fulfill({ json: author }),
  );
  await page.route("**/rest/v1/rpc/list_public_article_summaries_v1", (r) =>
    r.fulfill({
      json: {
        items: course.entries
          .filter((e) => e.available)
          .map((e) => ({
            articleId: e.articleId,
            publicSlug: e.publicSlug,
            title: e.title,
            locale: "ja",
            excerpt: "圧・容積・流量を対応させ、同じ一拍から循環を読み解く。",
            tags: [],
            publishedAt: course.updatedAt,
            author,
          })),
        nextCursor: null,
      },
    }),
  );
  await page.route("**/rest/v1/rpc/list_public_experiment_summaries_v1", (r) =>
    r.fulfill({
      json: {
        items: [
          {
            experimentId: course.courseId,
            title: "一拍を読む：PV・圧・流量の対応",
            publicSlug: "pv-flow",
            publishedAt: course.updatedAt,
            snapshotId: course.courseId,
            modelId: bundle.manifest.modelId,
            scenarioCount: 3,
            author,
          },
        ],
        nextCursor: null,
      },
    }),
  );
  await page.goto("/ja");
  for (const theme of ["dark", "light"]) {
    await expect(page.locator("body")).toHaveAttribute("data-app-theme", theme);
    if (theme === "light")
      await expect(page.locator(".home-card-wide")).toHaveCSS(
        "background-color",
        "rgb(255, 255, 255)",
      );
    await expect(page.getByRole("group", { name: "コンテンツの種類" }).getByRole("button"))
      .toHaveText(["すべて", "コース", "記事", "シミュレーション"]);
    await expect(page.locator(".home-card")).toHaveCount(3);
    await page.getByRole("button", { name: "記事", exact: true }).click();
    await expect(page.locator(".home-card")).toHaveCount(2);
    await expect(page.locator(".home-card h3")).toContainText(["一拍を読む", "循環をつなぐ"]);
    await page.getByRole("button", { name: "すべて", exact: true }).click();
    await page.getByRole("combobox", { name: "並び順", exact: true }).selectOption("new");
    await expect(page.locator(".home-card")).toHaveCount(4);
    await page.getByRole("combobox", { name: "並び順", exact: true }).selectOption("recommended");
    await expect(page.locator("main .home-official")).toHaveCount(3);
    expect(
      await page
        .locator(".home-page")
        .evaluate((e) => e.scrollWidth <= e.clientWidth),
    ).toBe(true);
    if (testInfo.project.name === "mobile-chromium")
      await expect(page.locator(".home-mini-demo")).toBeHidden();
    else await expect(page.locator(".home-mini-demo")).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(`home-${theme}.png`) });
    if (theme === "dark")
      await page.getByRole("button", { name: "テーマを切り替え" }).click();
  }
  await expect(
    page.getByRole("link", { name: "シミュレーションを試す", exact: true }),
  ).toHaveAttribute("href", "/ja/experiments/new");
  await page.getByRole("button", { name: "コンテンツを検索", exact: true }).click();
  const query = page.getByRole("textbox", { name: "検索キーワード" });
  await query.fill("一拍");
  await query.press("ArrowDown");
  await expect(page.locator(".home-search-results a").first()).toBeFocused();
  await expect(page.locator(".home-search-results a").first()).toHaveCSS("outline-style", "solid");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.locator(".home-card h3").getByRole("link", { name: course.title, exact: true }).click();
  await expect(
    page.getByRole("link", { name: "読み始める", exact: true }),
  ).toBeVisible();
  expect(documentRequests).toBe(1);
  await expect(page.locator("main ol")).toContainText("Author B");
  await expect(page.locator("main ol")).not.toContainText("CircleHeart");
  await page.getByRole("link", { name: "読み始める", exact: true }).click();
  await expect(
    page.getByRole("navigation", { name: "コースのナビゲーション" }).first(),
  ).toContainText("1 / 3章");
  await page
    .getByRole("navigation", { name: "コースのナビゲーション" })
    .last()
    .getByRole("link", { name: "循環をつなぐ →" })
    .click();
  await expect(
    page.getByRole("heading", { name: "循環をつなぐ", exact: true }),
  ).toBeVisible();
  await page.goto(`/ja/courses/${course.courseId}`);
  await expect(
    page.getByRole("link", { name: "続きから読む", exact: true }),
  ).toHaveAttribute("href", new RegExp(course.entries[2].publicSlug!));
  await page.route("**/rest/v1/rpc/read_public_course_v1", (r) =>
    r.fulfill({
      json: {
        ...displayedCourse,
        entries: displayedCourse.entries.map((e, i) =>
          i === 2
            ? {
                ...e,
                available: false,
                title: null,
                publicSlug: null,
                authorName: null,
                author: null,
              }
            : e,
        ),
      },
    }),
  );
  await page.reload();
  await expect(
    page.getByRole("link", { name: "読み始める", exact: true }),
  ).toHaveAttribute("href", new RegExp(course.entries[0].publicSlug!));
});

const homeBootstrap: StudioPublicHomeBootstrapV1 = {
  schemaId: "circleheart-public-home-bootstrap-v1",
  locale: "ja",
  articles: course.entries.filter((entry) => entry.available).map((entry) => ({
    articleId: entry.articleId,
    publicSlug: entry.publicSlug!,
    title: entry.title!,
    locale: "ja",
    excerpt: null,
    tags: [],
    publishedAt: course.updatedAt,
  })),
  experiments: [],
  courses: [],
};

test("@desktop @mobile @webkit Home keeps other-tab saves and clears the account filter on sign-out", async ({ page, context }) => {
  const other = await context.newPage();
  for (const tab of [page, other]) {
    await signInFixture(tab);
    await tab.route("**/rest/v1/rpc/read_my_profile_v1", (route) => route.fulfill({ json: null }));
    await tab.route("**/auth/v1/logout*", (route) => route.fulfill({ status: 204 }));
    await tab.route("**/ja", async (route) => {
      const response = await route.fetch();
      await route.fulfill({ response, body: (await response.text()).replace("</body>",
        `${renderStudioPublicHomeBootstrapV1(homeBootstrap)}</body>`) });
    });
    await tab.goto("/ja");
    await expect(tab.locator(".home-saved-filter")).toBeVisible();
  }
  await page.getByRole("button", { name: "保存: 一拍を読む", exact: true }).click();
  await expect(other.getByRole("button", { name: "保存を解除: 一拍を読む", exact: true })).toBeVisible();
  await other.getByRole("button", { name: "保存: 循環をつなぐ", exact: true }).click();
  await expect(page.locator('.home-bookmark[aria-pressed="true"]')).toHaveCount(2);
  await page.reload();
  await expect(page.locator('.home-bookmark[aria-pressed="true"]')).toHaveCount(2);
  await other.getByRole("button", { name: "保存を解除: 一拍を読む", exact: true }).click();
  await expect(page.getByRole("button", { name: "保存: 一拍を読む", exact: true })).toBeVisible();
  await page.locator(".home-saved-filter").click();
  await expect(page.locator(".home-card")).toHaveCount(1);
  await page.getByRole("button", { name: "プロフィールメニュー" }).click();
  await page.getByRole("menuitem", { name: "ログアウト", exact: true }).click();
  await expect(page.locator(".home-saved-filter")).toHaveCount(0);
  await expect(page.locator(".home-card")).toHaveCount(2);
  await expect(page.locator(".home-catalog-note")).toHaveCount(0);
  await other.close();
});

test("@desktop @mobile @webkit static Home remains scrollable without JavaScript", async ({ browser, baseURL }, testInfo) => {
  // Load the production SSR entry through Vite, as the server build does (JSON/TSX imports).
  const root = fileURLToPath(new URL("..", import.meta.url));
  const renderer = await createServer({ configFile: false, root,
    envDir: `${root}/artifacts/no-home-test-env`,
    server: { middlewareMode: true, hmr: false, ws: false },
    resolve: { alias: { "@": root } },
    ssr: { resolve: { externalConditions: ["node", "module-sync"] } },
  });
  const { renderStudioPublicHomeV1 } = await renderer.ssrLoadModule("/server/StudioPublicHomeRendererV1.ts");
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL,
    viewport: testInfo.project.use.viewport });
  const page = await context.newPage();
  try {
    await page.route("**/ja", async (route) => {
      const response = await route.fetch();
      const rendered = renderStudioPublicHomeV1({
        bootstrap: { ...homeBootstrap, articles: Array.from({ length: 15 }, (_, index) => ({
          ...homeBootstrap.articles[0], articleId: `article-${index}`, publicSlug: `article-${index}`,
        })) },
        canonicalOrigin: "https://www.circleheart.dev",
        clientTemplate: await response.text(),
      });
      await route.fulfill({ response, body: rendered.documentHtml });
    });
    await page.goto("/ja");
    await expect(page.locator("body")).toHaveCSS("overflow-y", "auto");
    await page.mouse.move(200, 400);
    await page.mouse.wheel(0, 10000);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    await expect(page.locator(".home-footer")).toBeInViewport();
    await expect(page.locator(".home-footer").getByRole("link", { name: "数理モデル・プリセット" })).toBeVisible();
  } finally {
    await context.close();
    await renderer.close();
  }
});

test("@desktop @mobile public display name saves through the owner RPC and survives reload", async ({
  page,
}) => {
  await signInFixture(page);
  let profile = {
    userId: course.ownerId,
    displayName: "元の名前",
    official: false,
    version: 0,
  };
  await page.route("**/rest/v1/rpc/read_my_profile_v1", (r) =>
    r.fulfill({ json: profile }),
  );
  const writes: Record<string, unknown>[] = [];
  await page.route("**/rest/v1/rpc/save_my_profile_v1", (r) => {
    const body = r.request().postDataJSON();
    writes.push(body);
    profile = { ...profile, displayName: body.p_display_name, version: 1 };
    return r.fulfill({ json: profile });
  });
  await page.goto("/ja/me/settings");
  const name = page.getByLabel("表示名", { exact: true });
  await expect(name).toHaveValue("元の名前");
  await name.fill("テスト著者");
  await page.getByRole("button", { name: "保存", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("公開名を保存しました。");
  expect(writes).toHaveLength(1);
  expect(writes[0]).toMatchObject({
    p_expected_user_id: course.ownerId,
    p_expected_version: 0,
    p_display_name: "テスト著者",
  });
  expect(Object.keys(writes[0]).sort()).toEqual([
    "p_display_name",
    "p_expected_user_id",
    "p_expected_version",
    "p_operation_id",
  ]);
  await page.getByRole("button", { name: "プロフィールメニュー" }).click();
  await expect(page.getByRole("menu")).toContainText("テスト著者");
  await page.reload();
  await expect(name).toHaveValue("テスト著者");
});

test("@desktop pending account initialization preserves guest reading position", async ({
  page,
}) => {
  const user = await signInFixture(page, -60);
  await publicFixtures(page);
  let release!: () => void;
  let refreshing = false;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/auth/v1/token?*", async (route) => {
    refreshing = true;
    await pending;
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const jwt = `${Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url")}.${Buffer.from(JSON.stringify({ sub: user.id, exp, aud: "authenticated", role: "authenticated" })).toString("base64url")}.fixture`;
    await route.fulfill({
      json: {
        access_token: jwt,
        refresh_token: "fixture-refresh",
        token_type: "bearer",
        expires_at: exp,
        expires_in: 3600,
        user,
      },
    });
  });
  await page.addInitScript(
    ({ courseId, first }) =>
      localStorage.setItem(
        `circleheart.course-position.v1:guest:${courseId}`,
        first,
      ),
    { courseId: course.courseId, first: course.entries[0].articleId },
  );
  await page.route(
    `**/ja/articles/${course.entries[2].publicSlug}?course=*`,
    async (route) => {
      const response = await route.fetch();
      const html = (await response.text()).replace(
        "</body>",
        `${renderStudioPublicArticleBootstrapV1(courseArticleFixtureV1(2))}${renderCourseBootstrapV1(course)}</body>`,
      );
      await route.fulfill({ response, body: html });
    },
  );
  await page.goto(
    `/ja/articles/${course.entries[2].publicSlug}?course=${course.courseId}`,
  );
  await expect.poll(() => refreshing).toBe(true);
  await expect(
    page.getByRole("navigation", { name: "コースのナビゲーション" }).first(),
  ).toBeVisible();
  const read = (account: string) =>
    page.evaluate(
      ({ account, id }) =>
        localStorage.getItem(`circleheart.course-position.v1:${account}:${id}`),
      { account, id: course.courseId },
    );
  expect(await read(course.ownerId)).toBeNull();
  expect(await read("guest")).toBe(course.entries[0].articleId);
  release();
  await expect
    .poll(() => read(course.ownerId))
    .toBe(course.entries[2].articleId);
  expect(await read("guest")).toBe(course.entries[0].articleId);
});

test("@desktop @mobile course management shares navigation and separates editing from publication", async ({ page }, info) => {
  await signInFixture(page);
  await publicFixtures(page);
  let drafts: CourseDraftV1[] = [
    { courseId: course.courseId, version: 3, published: true, updatedAt: course.updatedAt,
      content: { title: "循環動態を、実験でつなぐ", description: "", audience: "", locale: "ja", articleIds: [] } },
    { courseId: "a0000000-0000-4000-8000-000000000099", version: 1, published: false, updatedAt: course.updatedAt,
      content: { title: "心不全の循環を考える", description: "", audience: "", locale: "ja", articleIds: [] } },
  ];
  await page.route("**/rest/v1/rpc/list_courses_v1", route => route.fulfill({
    json: route.request().postDataJSON().p_scope === "mine" ? drafts : [course],
  }));
  const deleted: unknown[] = [];
  await page.route("**/rest/v1/rpc/delete_course_v1", route => {
    const body = route.request().postDataJSON();
    deleted.push(body);
    drafts = drafts.filter(draft => draft.courseId !== body.p_course_id);
    return route.fulfill({ json: { courseId: body.p_course_id, deleted: true } });
  });
  await page.goto("/ja/me/courses");
  await expect(page.getByRole("heading", { name: "コースを管理", exact: true })).toBeVisible();
  const nav = page.getByRole("navigation", { name: "コンテンツの管理" });
  await expect(nav.locator('[aria-current="page"]')).toHaveText("コース");
  const list = page.getByRole("list", { name: "保存したコース" });
  await expect(list.getByRole("listitem")).toHaveCount(2);
  await expect(list.getByRole("link", { name: "編集", exact: true })).toHaveCount(2);
  await expect(list.getByRole("link", { name: "公開版を見る" })).toHaveCount(1);
  const published = list.getByRole("listitem").filter({ hasText: course.title });
  await expect(published.getByRole("link", { name: "編集", exact: true })).toHaveAttribute("href", `/ja/courses/${course.courseId}/edit`);
  await expect(published.getByRole("link", { name: "公開版を見る" })).toHaveAttribute("href", `/ja/courses/${course.courseId}`);
  await expect(page.locator(".management-create")).toHaveAttribute("href", "/ja/courses/new");
  await page.screenshot({ path: info.outputPath("course-management.png"), animations: "disabled" });
  page.once("dialog", dialog => dialog.dismiss());
  await published.getByRole("button", { name: "コースを削除" }).click();
  expect(deleted).toHaveLength(0);
  page.once("dialog", dialog => dialog.accept());
  await published.getByRole("button", { name: "コースを削除" }).click();
  await expect(list.getByRole("listitem")).toHaveCount(1);
  expect(deleted).toHaveLength(1);
  expect(deleted[0]).toMatchObject({ p_course_id: course.courseId, p_expected_version: 3 });
});

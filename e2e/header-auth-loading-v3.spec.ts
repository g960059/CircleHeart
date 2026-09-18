import { expect, test, type Page } from "@playwright/test";

const origin = "https://public-content.test";
const storageKey = "sb-public-content-auth-token";
const user = {
  id: "40000000-0000-4000-8000-000000000003", aud: "authenticated",
  role: "authenticated", email: "header@example.test", is_anonymous: false,
  user_metadata: { full_name: "Header Author" }, app_metadata: {},
  created_at: "2026-09-18T00:00:00Z",
};

function gate() {
  let release!: () => void;
  const promise = new Promise<void>(resolve => { release = resolve; });
  return { promise, release };
}

async function sessionFixture(page: Page, seedSession = true) {
  const state = { auth: gate(), profile: gate(), rejectRefresh: false, refreshes: 0 };
  await page.addInitScript(({ user, storageKey, seedSession }) => {
    localStorage.setItem("circleheart.app.theme", "light");
    if (seedSession) {
      // Each document starts with an expired session, exercising the real
      // Supabase restore path while its refresh response is held by the test.
      const exp = Math.floor(Date.now() / 1000) - 60;
      localStorage.setItem(storageKey, JSON.stringify({
        access_token: `${btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }))}.${btoa(JSON.stringify({ sub: user.id, exp, aud: "authenticated" }))}.fixture`,
        refresh_token: "fixture", token_type: "bearer", expires_at: exp,
        expires_in: 3600, user,
      }));
    }
    const observations = { guestWasVisible: false };
    Object.assign(window, { headerAuthObservations: observations });
    new MutationObserver(() => {
      const guest = document.querySelector('header a[href$="/login"]');
      if (guest?.getClientRects().length) observations.guestWasVisible = true;
    }).observe(document, { childList: true, subtree: true, attributes: true });
  }, { user, storageKey, seedSession });
  // Never access a real account or content repository in these tests.
  await page.context().route(`${origin}/**`, async route => {
    const path = new URL(route.request().url()).pathname;
    const headers = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" };
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers });
    if (path === "/auth/v1/token") {
      state.refreshes++;
      await state.auth.promise;
      if (state.rejectRefresh) return route.fulfill({ status: 400, headers, json: { error: "invalid_grant", error_code: "refresh_token_not_found", msg: "Session expired" } });
      const exp = Math.floor(Date.now() / 1000) + 3600;
      const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
      return route.fulfill({ headers, json: {
        access_token: `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: user.id, exp, aud: "authenticated" })}.fixture`,
        refresh_token: "fixture", token_type: "bearer", expires_at: exp, expires_in: 3600, user,
      } });
    }
    if (path === "/auth/v1/logout") return route.fulfill({ status: 204, headers });
    if (path === "/auth/v1/user") return route.fulfill({ headers, json: user });
    if (path.endsWith("read_my_profile_v1")) await state.profile.promise;
    const json = path.includes("list_public_") ? { items: [], nextCursor: null }
      : path.endsWith("list_courses_v1") ? [] : null;
    return route.fulfill({ headers, json });
  });
  return state;
}

test("@desktop @mobile @webkit session restore never flashes guest controls or shifts authenticated controls", async ({ page }, info) => {
  const state = await sessionFixture(page);
  const pending = page.getByTestId("site-account-pending-v3");
  const create = page.getByTestId("site-create-trigger-v3");
  const profile = page.getByTestId("site-profile-trigger-v3");
  const theme = page.getByTestId("site-theme-toggle-v3");
  const search = page.locator(".home-header-search");
  try {
    for (const visit of ["initial", "reload"]) {
      if (visit === "initial") await page.goto("/ja");
      else await page.reload();
      await expect(pending).toBeVisible();
      await expect(page.getByRole("link", { name: "ログイン", exact: true })).toHaveCount(0);
      await expect(page.getByTestId("anonymous-language-switch-v3")).toHaveCount(0);
      await expect.poll(() => state.refreshes).toBe(visit === "initial" ? 1 : 2);
      const positions = {
        create: await pending.boundingBox(), profile: await page.locator(".site-account-pending-avatar").boundingBox(),
        theme: await theme.boundingBox(), search: await search.boundingBox(),
      };
      await page.screenshot({ path: info.outputPath(`auth-${visit}-pending.png`) });
      state.auth.release();
      // A slow profile lookup must not delay authenticated header controls.
      await expect(profile).toBeVisible();
      await expect(create).toBeVisible();
      await expect(pending).toHaveCount(0);
      expect(await create.boundingBox()).toEqual(positions.create);
      expect(await profile.boundingBox()).toEqual(positions.profile);
      expect(await theme.boundingBox()).toEqual(positions.theme);
      expect(await search.boundingBox()).toEqual(positions.search);
      expect(await page.evaluate(() => (window as typeof window & {
        headerAuthObservations: { guestWasVisible: boolean };
      }).headerAuthObservations.guestWasVisible)).toBe(false);
      state.profile.release();
      await page.screenshot({ path: info.outputPath(`auth-${visit}-ready.png`) });
      state.auth = gate();
      state.profile = gate();
    }
    await theme.click();
    await expect(page.locator(".app-root")).toHaveAttribute("data-app-theme", "dark");
    await expect(profile).toBeVisible();
    await profile.click();
    await page.getByRole("menuitem", { name: "ログアウト" }).click();
    await expect(page.getByRole("link", { name: "ログイン", exact: true })).toBeVisible();
    await expect(page.getByTestId("anonymous-language-switch-v3")).toBeVisible();
    await expect(profile).toHaveCount(0);
    await expect(pending).toHaveCount(0);
  } finally {
    state.auth.release(); state.profile.release();
  }
});

test("@desktop @mobile an expired session resolves to guest actions after refresh fails", async ({ page }) => {
  const state = await sessionFixture(page);
  state.rejectRefresh = true;
  try {
    await page.goto("/en/articles");
    await expect(page.getByTestId("site-account-pending-v3")).toBeVisible();
    await expect(page.getByRole("link", { name: "Log in", exact: true })).toHaveCount(0);
    state.auth.release();
    await expect(page.getByRole("link", { name: "Log in", exact: true })).toBeVisible();
    await expect(page.getByTestId("site-account-pending-v3")).toHaveCount(0);
    await expect(page.getByTestId("site-profile-trigger-v3")).toHaveCount(0);
  } finally {
    state.auth.release(); state.profile.release();
  }
});

test("@desktop @mobile a visitor without a session receives working guest controls", async ({ page }) => {
  await sessionFixture(page, false);
  await page.goto("/ja/me/articles");
  await expect(page.getByRole("link", { name: "ログイン", exact: true })).toBeVisible();
  await expect(page.getByTestId("site-account-pending-v3")).toHaveCount(0);
  await expect(page.getByTestId("site-start-simulation-v3")).toHaveAttribute("href", "/ja/experiments/new");
});

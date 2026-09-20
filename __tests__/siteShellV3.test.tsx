import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import * as studioClient from "@/studio/infrastructure/supabase/StudioSupabaseClientV1";

import { routeOwnsApplicationChrome } from "@/components/Layout";
import { SiteAccountSessionProviderV3 } from "@/components/site/SiteAccountSessionV3";
import { SiteHeaderV3 } from "@/components/site/SiteHeaderV3";
import { isModuleLoadErrorV1 } from "@/components/ErrorBoundary";
import { ContentManagementLayoutV1, isContentManagementRouteV1 } from "@/components/management/ContentManagementV1";
import "@/i18n";

describe("site shell V3", () => {
  it("limits management navigation to owned lists and preserves the locale", () => {
    for (const path of ["/ja/me/articles", "/en/me/courses/", "/ja/me/experiments"]) {
      expect(isContentManagementRouteV1(path)).toBe(true);
    }
    for (const path of ["/ja/articles", "/ja/me/settings", "/ja/courses/new", "/ja/experiments/new"]) {
      expect(isContentManagementRouteV1(path)).toBe(false);
    }
    const markup = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/en/me/courses"]}>
        <ContentManagementLayoutV1>Course list</ContentManagementLayoutV1>
      </MemoryRouter>,
    );
    expect(markup.match(/aria-current="page"/g)).toHaveLength(1);
    for (const resource of ["articles", "courses", "experiments"]) expect(markup).toContain(`href="/en/me/${resource}"`);
    expect(markup).not.toContain('href="/ja/');
  });

  it("recognizes browser module failures without misclassifying application errors", () => {
    for (const message of [
      "Failed to fetch dynamically imported module: https://www.circleheart.dev/assets/WorkbenchSelectorPage-retired.js",
      "Importing a module script failed.",
      "'text/html' is not a valid JavaScript MIME type for module script 'https://www.circleheart.dev/assets/WorkbenchSelectorPage-retired.js'.",
      "error loading dynamically imported module: https://www.circleheart.dev/assets/page.js",
      "Unable to preload CSS for /assets/page.css",
    ]) expect(isModuleLoadErrorV1(new TypeError(message))).toBe(true);
    expect(isModuleLoadErrorV1(new TypeError("Cannot read properties of null"))).toBe(false);
    expect(isModuleLoadErrorV1(new Error("Could not load saved simulation"))).toBe(false);
  });

  it("uses global chrome for discovery and Reader routes only", () => {
    expect(routeOwnsApplicationChrome("/")).toBe(false);
    expect(routeOwnsApplicationChrome("/articles")).toBe(false);
    expect(routeOwnsApplicationChrome("/articles/article-one")).toBe(false);
    expect(routeOwnsApplicationChrome("/me/articles")).toBe(false);
    expect(routeOwnsApplicationChrome("/me/experiments")).toBe(false);
    expect(routeOwnsApplicationChrome("/dev")).toBe(false);
    expect(routeOwnsApplicationChrome("/docs/authoring-cli")).toBe(false);
    expect(routeOwnsApplicationChrome("/articles/new/edit")).toBe(true);
    expect(routeOwnsApplicationChrome("/articles/article-one/edit")).toBe(true);
    expect(routeOwnsApplicationChrome("/experiments/new")).toBe(true);
    expect(routeOwnsApplicationChrome("/experiments/experiment-one")).toBe(true);
    expect(routeOwnsApplicationChrome("/dev/model-lab")).toBe(true);
    expect(routeOwnsApplicationChrome("/dev/model-lab/")).toBe(true);
    expect(routeOwnsApplicationChrome("/snapshots/snapshot-one")).toBe(true);
  });

  it("shows the language switch only to anonymous visitors", () => {
    const anonymous = renderHeader(null);
    const authenticated = renderHeader({
      accountId: "account-one",
      displayName: "A. Author",
    });

    expect(anonymous).toContain('data-testid="anonymous-language-switch-v3"');
    expect(anonymous).toContain('data-testid="site-start-simulation-v3"');
    expect(anonymous).not.toContain('data-testid="site-create-trigger-v3"');
    expect(anonymous).toContain("/ja/login");
    expect(authenticated).not.toContain('data-testid="anonymous-language-switch-v3"');
    expect(authenticated).not.toContain('data-testid="site-start-simulation-v3"');
    expect(authenticated).toContain('data-testid="site-create-trigger-v3"');
    expect(authenticated).toContain('data-testid="site-profile-trigger-v3"');
  });

  it("keeps unresolved authentication distinct from a confirmed guest", () => {
    // Effects have not run yet: a configured client is still restoring its session.
    const client = vi.spyOn(studioClient, "studioSupabaseClientV1")
      .mockReturnValue({} as NonNullable<ReturnType<typeof studioClient.studioSupabaseClientV1>>);
    try {
      const pending = renderHeader();
      expect(pending).toContain('data-testid="site-account-pending-v3"');
      expect(pending).toContain('data-testid="site-theme-toggle-v3"');
      expect(pending).toContain('class="home-header-search"');
      for (const guestControl of ["anonymous-language-switch-v3", "site-start-simulation-v3", "/ja/login"])
        expect(pending).not.toContain(guestControl);
      expect(pending).not.toContain("site-profile-trigger-v3");

      client.mockReturnValue(null);
      const unconfigured = renderHeader();
      expect(unconfigured).not.toContain("site-account-pending-v3");
      expect(unconfigured).toContain("/ja/login");
    } finally {
      client.mockRestore();
    }
  });
});

function renderHeader(
  account?: Readonly<{
    accountId: string;
    displayName: string;
  }> | null,
): string {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={["/ja"]}>
      <SiteAccountSessionProviderV3 session={account === undefined ? undefined : { account }}>
        <SiteHeaderV3 />
      </SiteAccountSessionProviderV3>
    </MemoryRouter>,
  );
}

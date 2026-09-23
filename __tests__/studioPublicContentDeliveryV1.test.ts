import { createStudioPublicArticleLoaderV1 } from "@/studio/infrastructure/browser/StudioPublicArticleLoaderV1";
import { readCourseBootstrapV1, renderCourseBootstrapV1 } from "@/studio/application/course/StudioCourseBootstrapV1";
import { readFileSync } from "node:fs";

import { describe, expect, it, vi } from "vitest";

import {
  completePublicStaticContentHandoffV1,
} from "@/components/site/PublicStaticContentHandoffV1";
import {
  renderStudioPublishedArticleV1,
} from "@/studio/application/publication/StudioPublicArticleRendererV1";
import {
  formatStudioPublicArticleDateV1,
} from "@/studio/application/publication/StudioPublicArticlePresentationV1";
import {
  readStudioPublicArticleBootstrapV1,
  renderStudioPublicArticleBootstrapV1,
  STUDIO_PUBLIC_ARTICLE_BOOTSTRAP_V1_ELEMENT_ID,
} from "@/studio/application/publication/StudioPublicArticleBootstrapV1";
import {
  readStudioPublicHomeBootstrapV1,
  renderStudioPublicHomeBootstrapV1,
  STUDIO_PUBLIC_HOME_BOOTSTRAP_V1_ELEMENT_ID,
  STUDIO_PUBLIC_HOME_BOOTSTRAP_V1_SCHEMA_ID,
  type StudioPublicArticleSummaryV1,
  validateStudioPublicHomeBootstrapV1,
} from "@/studio/application/publication/StudioPublicHomeBootstrapV1";
import {
  STUDIO_PUBLISHED_ARTICLE_V1_SCHEMA_ID,
  type StudioPublishedArticleV1,
  validateStudioPublishedArticleV1,
} from "@/studio/application/publication/StudioPublishedArticleV1";
import {
  STUDIO_EXPERIMENT_PLACEMENT_V2_SCHEMA_ID,
} from "@/studio/contracts/v2/content";
import {
  handleStudioPublicContentRequestV1,
} from "@/server/StudioPublicContentHandlerV1";
import type {
  StudioPublicContentDataSourceV1,
} from "@/server/StudioPublicContentDataSourceV1";
import {
  readStudioPublicContentServerConfigurationV1,
} from "@/server/StudioPublicContentDataSourceV1";

const TEMPLATE_V1 = `<!doctype html><html lang="en"><head><title>CircleHeart</title></head><body><div id="root"></div><script type="module" src="/assets/app.js"></script></body></html>`;

describe("Studio public content delivery V1", () => {
  it("keeps the render tier on anonymous publishable authority", () => {
    expect(readStudioPublicContentServerConfigurationV1({
      CIRCLEHEART_SUPABASE_URL: "https://example.supabase.co",
      CIRCLEHEART_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_example",
      CIRCLEHEART_CANONICAL_ORIGIN: "https://www.circleheart.dev",
    })).toEqual({
      canonicalOrigin: "https://www.circleheart.dev",
      publishableKey: "sb_publishable_example",
      supabaseUrl: "https://example.supabase.co",
    });
    expect(() => readStudioPublicContentServerConfigurationV1({
      CIRCLEHEART_SUPABASE_URL: "https://example.supabase.co",
      CIRCLEHEART_SUPABASE_PUBLISHABLE_KEY: `sb_${"secret"}_forbidden`,
    })).toThrow(/only a publishable key/);
  });

  it("routes the bare origin through locale negotiation at the SSR boundary", () => {
    const firebase = JSON.parse(readFileSync(
      new URL("../firebase.json", import.meta.url),
      "utf8",
    )) as Readonly<{
      hosting: Readonly<{
        headers: readonly Readonly<{ source: string }>[];
        redirects: readonly Readonly<{
          source: string;
          destination: string;
          type: number;
        }>[];
        rewrites: readonly Readonly<{
          source: string;
          destination?: string;
          run?: Readonly<{ serviceId: string; region: string }>;
        }>[];
      }>;
    }>;
    const negotiationRewriteIndex = firebase.hosting.rewrites.findIndex(
      ({ source }) => source === "/_locale",
    );
    const catchAllIndex = firebase.hosting.rewrites.findIndex(
      ({ source }) => source === "**",
    );

    expect(firebase.hosting.redirects).toContainEqual({
      source: "/",
      destination: "/_locale",
      type: 302,
    });
    expect(negotiationRewriteIndex).toBeGreaterThanOrEqual(0);
    expect(negotiationRewriteIndex).toBeLessThan(catchAllIndex);
    expect(firebase.hosting.rewrites[negotiationRewriteIndex]).toMatchObject({
      source: "/_locale",
      run: {
        serviceId: "circleheart-public-content",
        region: "asia-northeast1",
      },
    });
    expect(firebase.hosting.headers.some(({ source }) => source === "/"))
      .toBe(false);
  });

  it.each([
    ["/model-documents/**", "/model-documents/v1/missing.json"],
    ["/assets/**", "/assets/WorkbenchSelectorPage-retired.js"],
    ["/assets/**", "/assets/WorkbenchPage-retired.css"],
    ["/assets/**", "/assets/StudioSimulationWorker-retired.js"],
  ])("returns an uncached 404 instead of SPA HTML for %s (%s)", async (source, path) => {
    const firebase = JSON.parse(readFileSync(new URL("../firebase.json", import.meta.url), "utf8"));
    const rules = firebase.hosting.rewrites;
    const index = rules.findIndex(rule => rule.source === source);
    expect(index).toBeGreaterThanOrEqual(0);
    expect(index).toBeLessThan(rules.findIndex(rule => rule.source === "**"));
    expect(rules[index].run.serviceId).toBe("circleheart-public-content");
    for (const method of ["GET", "HEAD"]) {
      const response = await handleStudioPublicContentRequestV1(new Request(`https://www.circleheart.dev${path}`, { method }), dependenciesV1());
      expect(response.status).toBe(404);
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(response.headers.get("content-type")).toContain("text/plain");
      expect(response.headers.get("x-content-type-options")).toBe("nosniff");
      if (method === "HEAD") expect(await response.text()).toBe("");
    }
  });

  it("negotiates the bare origin without loading public catalog data", async () => {
    let dataSourceCalls = 0;
    const dependencies = dependenciesV1();
    const rootDependencies = Object.freeze({
      ...dependencies,
      dataSource: Object.freeze({
        readPublicCourse: async () => null,
        listPublicCourses: async () => [],
        readPublishedArticle: async () => {
          dataSourceCalls += 1;
          return null;
        },
        listPublicArticles: async () => {
          dataSourceCalls += 1;
          return Object.freeze({ items: Object.freeze([]), nextCursor: null });
        },
        listPublicExperiments: async () => {
          dataSourceCalls += 1;
          return Object.freeze({ items: Object.freeze([]), nextCursor: null });
        },
      }),
    });
    const savedPreference = await handleStudioPublicContentRequestV1(
      requestV1("/_locale?utm_source=shared", {
        Cookie: "other=opaque; __session=circleheart-locale-v1.en",
        "Accept-Language": "ja-JP,ja;q=0.9",
      }),
      rootDependencies,
    );
    expect(savedPreference.status).toBe(302);
    expect(savedPreference.headers.get("location")).toBe(
      "https://www.circleheart.dev/en?utm_source=shared",
    );
    expect(savedPreference.headers.get("cache-control")).toBe(
      "private, no-store",
    );
    expect(savedPreference.headers.get("vary")).toBe(
      "Cookie, Accept-Language",
    );

    const weightedLanguage = await handleStudioPublicContentRequestV1(
      requestV1("/_locale", {
        Cookie: "__session=circleheart-locale-v1.unsupported",
        "Accept-Language": "fr-FR, en-US;q=0.7, ja-JP;q=0.9",
      }),
      rootDependencies,
    );
    expect(weightedLanguage.headers.get("location")).toBe(
      "https://www.circleheart.dev/ja",
    );

    const englishBrowser = await handleStudioPublicContentRequestV1(
      requestV1("/_locale", { "Accept-Language": "en-GB,en;q=0.8" }),
      rootDependencies,
    );
    expect(englishBrowser.headers.get("location")).toBe(
      "https://www.circleheart.dev/en",
    );

    const fallback = await handleStudioPublicContentRequestV1(
      requestV1("/_locale", { "Accept-Language": "fr-FR,*;q=0.8" }),
      rootDependencies,
    );
    expect(fallback.headers.get("location")).toBe(
      "https://www.circleheart.dev/ja",
    );
    expect(dataSourceCalls).toBe(0);
  });

  it("renders every public block as semantic HTML and Markdown", () => {
    const rendered = renderStudioPublishedArticleV1({
      article: publishedArticleV1(),
      canonicalOrigin: "https://www.circleheart.dev",
      clientTemplate: TEMPLATE_V1,
    });

    const titleHtml = rendered.documentHtml.match(/<h1 class="article-title">(.*?)<\/h1>/)?.[1];
    expect(titleHtml?.replace(/<[^>]+>/g, "")).toBe("血圧を考える");
    expect(titleHtml).toContain('<span class="article-heading-phrases">');
    expect(rendered.documentHtml).toContain('<div id="public-static-root">');
    expect(rendered.documentHtml).toContain('<div id="root" hidden></div>');
    expect(rendered.documentHtml).toContain('class="public-static-site-header article-site-header"');
    const header = rendered.documentHtml.match(/<header class="public-static-site-header article-site-header">(.*?)<\/header>/s)![1];
    const scriptEnabledHeader = header.replace(/<noscript>.*?<\/noscript>/gs, "");
    expect(scriptEnabledHeader).toContain('data-testid="site-account-pending-v3"');
    expect(scriptEnabledHeader).not.toContain('href="/ja/login"');
    expect(scriptEnabledHeader).not.toContain('href="/ja/experiments/new"');
    expect(scriptEnabledHeader).not.toContain('class="public-static-language"');
    // Guest navigation remains available in the readable no-JS document.
    expect(header).toContain('href="/ja/login"');
    expect(header).toContain('href="/ja/experiments/new"');
    expect(rendered.documentHtml).toContain('class="article-title"');
    expect(rendered.documentHtml).toContain('class="article-paragraph"');
    expect(rendered.documentHtml).toContain(
      `id="${STUDIO_PUBLIC_ARTICLE_BOOTSTRAP_V1_ELEMENT_ID}"`,
    );
    expect(rendered.documentHtml).toContain("血圧は何で決まるでしょうか");
    expect(rendered.documentHtml).not.toContain("article-publication-kicker");
    expect(rendered.documentHtml).toContain("katex-mathml");
    expect(rendered.documentHtml).toContain("<details class=\"article-accordion public-static-accordion\"");
    expect(rendered.documentHtml).toContain("<strong>正解:</strong> 心拍出量と血管抵抗");
    expect(rendered.documentHtml).toContain("インタラクティブ・シミュレーション");
    expect(rendered.documentHtml).toContain("平均動脈圧");
    expect(rendered.documentHtml).toContain("public-static-experiment-inflow");
    const semanticMarkup = rendered.documentHtml.slice(
      0,
      rendered.documentHtml.indexOf(
        `<script id="${STUDIO_PUBLIC_ARTICLE_BOOTSTRAP_V1_ELEMENT_ID}"`,
      ),
    );
    expect(semanticMarkup).not.toContain("pane/internal-pressure");
    expect(rendered.documentHtml).toContain(
      `<link rel="canonical" href="https://www.circleheart.dev/ja/articles/what-determines-blood-pressure" />`,
    );
    expect(rendered.documentHtml).toContain("application/ld+json");
    expect(rendered.documentHtml).toContain("type=\"text/markdown\"");
    expect(rendered.markdown).toContain("# 血圧を考える");
    expect(rendered.markdown).toContain("**正解:** 心拍出量と血管抵抗");
    expect(rendered.markdown).toContain("## インタラクティブ・シミュレーション");
    expect(JSON.parse(rendered.json)).toMatchObject({
      articleContentId: "22222222-2222-4222-8222-222222222222",
      publicSlug: "what-determines-blood-pressure",
    });
  });

  it("keeps a complex server-rendered experiment as compact as its Peek handoff", () => {
    const article = publishedArticleV1();
    const withComplexBriefing = validateStudioPublishedArticleV1({
      ...article,
      blocks: article.blocks.map((block) => {
        if (block.kind !== "experiment") return block;
        const firstGraph = block.placement.briefing.graphs[0]!;
        return {
          ...block,
          placement: {
            ...block.placement,
            briefing: {
              ...block.placement.briefing,
              graphs: [
                firstGraph,
                { ...firstGraph, paneId: "pane/second-pressure", order: 1 },
              ],
            },
          },
        };
      }),
    });
    const rendered = renderStudioPublishedArticleV1({
      article: withComplexBriefing,
      canonicalOrigin: "https://www.circleheart.dev",
      clientTemplate: TEMPLATE_V1,
    });

    expect(rendered.documentHtml).toContain(
      "article-reader-peek-surface public-static-experiment public-static-experiment-peek",
    );
    expect(rendered.documentHtml).toContain(
      'data-reader-presentation="peek"',
    );
    expect(rendered.documentHtml).toContain(
      'class="public-static-experiment-anchor-copy"',
    );
  });

  it("hands the validated public projection to the matching client route", () => {
    const article = publishedArticleV1();
    const script = renderStudioPublicArticleBootstrapV1(article);
    const json = script.slice(script.indexOf(">") + 1, script.lastIndexOf("<"));
    const documentLike = {
      getElementById: (id: string) => id === STUDIO_PUBLIC_ARTICLE_BOOTSTRAP_V1_ELEMENT_ID
        ? { textContent: json }
        : null,
    } as Pick<Document, "getElementById">;

    expect(readStudioPublicArticleBootstrapV1(article.publicSlug, documentLike))
      .toEqual(article);
    expect(readStudioPublicArticleBootstrapV1(article.articleId, documentLike))
      .toEqual(article);
    expect(readStudioPublicArticleBootstrapV1("another-article", documentLike))
      .toBeNull();
    expect(readStudioPublicArticleBootstrapV1(article.publicSlug, {
      getElementById: () => ({ textContent: "{not-json" }),
    } as unknown as Pick<Document, "getElementById">)).toBeNull();

    const authoredClosingTag = validateStudioPublishedArticleV1({
      ...article,
      title: "</script><script>alert('not executable')</script>",
    });
    const escapedScript = renderStudioPublicArticleBootstrapV1(
      authoredClosingTag,
    );
    const escapedJson = escapedScript.slice(
      escapedScript.indexOf(">") + 1,
      escapedScript.lastIndexOf("<"),
    );
    expect(escapedJson).not.toContain("<");
    expect(JSON.parse(escapedJson)).toMatchObject({
      title: authoredClosingTag.title,
    });
  });

  it("preserves reading position when the interactive Reader takes over", () => {
    const scrollHost = { scrollTop: 0 };
    const clientRoot = {
      hidden: true,
      querySelector: () => scrollHost,
    };
    let staticRemoved = false;
    const staticRoot = { remove: () => { staticRemoved = true; } };
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: {
        getElementById: (id: string) => id === "root"
          ? clientRoot
          : id === "public-static-root" ? staticRoot : null,
      },
    });
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        requestAnimationFrame: (callback: FrameRequestCallback) => {
          callback(0);
          return 1;
        },
        scrollY: 420,
      },
    });

    try {
      completePublicStaticContentHandoffV1();
      expect(clientRoot.hidden).toBe(false);
      expect(staticRemoved).toBe(true);
      expect(scrollHost.scrollTop).toBe(420);
    } finally {
      Reflect.deleteProperty(globalThis, "document");
      Reflect.deleteProperty(globalThis, "window");
    }
  });

  it("serves a semantic localized Home with one validated client bootstrap", async () => {
    const response = await handleStudioPublicContentRequestV1(
      requestV1("/ja"),
      dependenciesV1(),
    );
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("etag")).toMatch(
      /^"home-ja-html-v1-[0-9a-f]{64}"$/,
    );
    expect(html).toContain("循環動態を、動かして学ぶ。");
    expect(html).toContain("血圧を考える");
    expect(html).toContain("公開シミュレーション");
    expect(html).toContain(
      "/ja/articles/what-determines-blood-pressure",
    );
    expect(html).toContain(
      "/ja/experiments/published/public-simulation",
    );
    expect(html).toContain(`id="${STUDIO_PUBLIC_HOME_BOOTSTRAP_V1_ELEMENT_ID}"`);
    expect(html).toContain('"@type":"WebSite"');
    expect(html).toContain('"@type":"Organization"');
    expect(html).toContain('hreflang="ja"');
    expect(html).toContain('hreflang="en"');
    expect(html).toContain(
      'hreflang="x-default" href="https://www.circleheart.dev/"',
    );
    expect(html).toContain('<div id="root" hidden></div>');
    expect(html).toContain('class="home-page public-static-shell"');
    expect(html.indexOf("</main>")).toBeLessThan(html.indexOf("<footer"));
    expect(html.slice(html.indexOf("<footer"))).toContain('href="/ja/models"');
    expect(html).toContain("本体の計算結果ではありません");

    const etag = response.headers.get("etag") ?? "";
    const cached = await handleStudioPublicContentRequestV1(
      requestV1("/ja", { "If-None-Match": etag }),
      dependenciesV1(),
    );
    expect(cached.status).toBe(304);
    expect(await cached.text()).toBe("");

    const weakListMatch = await handleStudioPublicContentRequestV1(
      requestV1("/ja", {
        "If-None-Match": `"unrelated", W/${etag}`,
      }),
      dependenciesV1(),
    );
    expect(weakListMatch.status).toBe(304);

    const anyRepresentation = await handleStudioPublicContentRequestV1(
      requestV1("/ja", { "If-None-Match": "*" }),
      dependenciesV1(),
    );
    expect(anyRepresentation.status).toBe(304);
  });

  it("keeps public dates stable across server and browser time zones", () => {
    expect(formatStudioPublicArticleDateV1(
      "2026-08-13T23:30:00.000Z",
      "ja",
    )).toBe("2026/08/13");
    expect(formatStudioPublicArticleDateV1(
      "2026-08-13T23:30:00.000Z",
      "en",
    )).toBe("Aug 13, 2026");
  });

  it("rejects stale-locale or executable Home bootstrap content", () => {
    const bootstrap = validateStudioPublicHomeBootstrapV1({
      schemaId: STUDIO_PUBLIC_HOME_BOOTSTRAP_V1_SCHEMA_ID,
      locale: "ja",
      articles: [{
        articleId: "article/home",
        locale: "ja",
        title: "</script><script>alert('inert')</script>",
        excerpt: null,
        tags: [],
        publicSlug: "home-article",
        publishedAt: "2026-08-13T00:00:00.000Z",
      }],
      experiments: [],
    });
    const script = renderStudioPublicHomeBootstrapV1(bootstrap);
    const json = script.slice(script.indexOf(">") + 1, script.lastIndexOf("<"));
    expect(json).not.toContain("<");
    const documentLike = {
      getElementById: (id: string) => id === STUDIO_PUBLIC_HOME_BOOTSTRAP_V1_ELEMENT_ID
        ? { textContent: json }
        : null,
    } as Pick<Document, "getElementById">;
    expect(readStudioPublicHomeBootstrapV1("ja", documentLike)).toEqual(bootstrap);
    expect(readStudioPublicHomeBootstrapV1("en", documentLike)).toBeNull();
  });

  it("rejects extra public projection fields before rendering", () => {
    expect(() => validateStudioPublishedArticleV1({
      ...publishedArticleV1(),
      ownerId: "should-not-cross-public-boundary",
    })).toThrow(/keys must be exactly/);
    expect(() => validateStudioPublishedArticleV1({
      ...publishedArticleV1(),
      publicSlug: "11111111-1111-4111-8111-111111111111",
    })).toThrow(/canonical public slug/);
  });

  it("serves canonical HTML, Markdown and JSON with one immutable ETag", async () => {
    const dependencies = dependenciesV1();
    const html = await handleStudioPublicContentRequestV1(
      requestV1("/ja/articles/what-determines-blood-pressure"),
      dependencies,
    );
    expect(html.status).toBe(200);
    expect(html.headers.get("content-type")).toBe("text/html; charset=utf-8");
    expect(html.headers.get("etag")).toMatch(
      /^"article-22222222-2222-4222-8222-222222222222-html-v1-[0-9a-f]{64}"$/,
    );
    expect(html.headers.get("cache-control")).toBe("public, max-age=0, s-maxage=300, must-revalidate");
    expect(await html.text()).toContain("血圧は何で決まるでしょうか");

    const markdown = await handleStudioPublicContentRequestV1(
      requestV1("/ja/articles/what-determines-blood-pressure.md"),
      { ...dependencies, clientTemplate: "No HTML shell needed for Markdown" },
    );
    expect(markdown.status).toBe(200);
    expect(markdown.headers.get("etag")).toContain(
      "22222222-2222-4222-8222-222222222222-markdown-v1-",
    );
    expect(await markdown.text()).toContain("# 血圧を考える");

    const json = await handleStudioPublicContentRequestV1(
      requestV1("/api/v1/public/articles/what-determines-blood-pressure"),
      { ...dependencies, clientTemplate: "No HTML shell needed for JSON" },
    );
    expect(json.status).toBe(200);
    expect(json.headers.get("cache-control")).toBe("public, max-age=0, s-maxage=300, must-revalidate");
    expect(json.headers.get("etag")).toContain(
      "22222222-2222-4222-8222-222222222222-json-v1-",
    );
    expect(await json.json()).toMatchObject({
      schemaId: STUDIO_PUBLISHED_ARTICLE_V1_SCHEMA_ID,
      tags: [],
      articleContentId: "22222222-2222-4222-8222-222222222222",
    });
  });

  it("changes a strong ETag whenever publication bytes change", async () => {
    const originalArticle = publishedArticleV1();
    let currentArticle = originalArticle;
    const dependencies = {
      ...dependenciesV1(),
      dataSource: Object.freeze({
        readPublicCourse: async () => null,
        listPublicCourses: async () => [],
        readPublishedArticle: async () => currentArticle,
        listPublicArticles: async () => Object.freeze({
          items: Object.freeze([]),
          nextCursor: null,
        }),
        listPublicExperiments: async () => Object.freeze({
          items: Object.freeze([]),
          nextCursor: null,
        }),
      }),
    };
    const first = await handleStudioPublicContentRequestV1(
      requestV1("/ja/articles/what-determines-blood-pressure"),
      dependencies,
    );
    const firstEtag = first.headers.get("etag");
    expect(firstEtag).not.toBeNull();

    currentArticle = validateStudioPublishedArticleV1({
      ...originalArticle,
      updatedAt: "2026-08-12T02:00:00.000Z",
    });
    const republished = await handleStudioPublicContentRequestV1(
      requestV1("/ja/articles/what-determines-blood-pressure", {
        "If-None-Match": firstEtag ?? "",
      }),
      dependencies,
    );
    expect(republished.status).toBe(200);
    expect(republished.headers.get("etag")).not.toBe(firstEtag);
    expect(await republished.text()).toContain("2026-08-12T02:00:00.000Z");
  });

  it("redirects public UUID and wrong-locale aliases to the canonical slug", async () => {
    const dependencies = dependenciesV1();
    for (const pathname of [
      "/ja/articles/11111111-1111-4111-8111-111111111111",
      "/en/articles/what-determines-blood-pressure",
    ]) {
      const response = await handleStudioPublicContentRequestV1(
        requestV1(pathname),
        dependencies,
      );
      expect(response.status).toBe(308);
      expect(response.headers.get("location")).toBe(
        "https://www.circleheart.dev/ja/articles/what-determines-blood-pressure",
      );
    }
  });

  it("returns real 404, 304 and HEAD responses without leaking a SPA 200", async () => {
    const dependencies = dependenciesV1();
    const missing = await handleStudioPublicContentRequestV1(
      requestV1("/ja/articles/not-published"),
      dependencies,
    );
    expect(missing.status).toBe(404);
    expect(await missing.text()).toContain("noindex");

    const initial = await handleStudioPublicContentRequestV1(
      requestV1("/ja/articles/what-determines-blood-pressure"),
      dependencies,
    );
    const cached = await handleStudioPublicContentRequestV1(
      requestV1("/ja/articles/what-determines-blood-pressure", {
        "If-None-Match": initial.headers.get("etag") ?? "",
      }),
      dependencies,
    );
    expect(cached.status).toBe(304);
    expect(await cached.text()).toBe("");

    const head = await handleStudioPublicContentRequestV1(
      requestV1("/ja/articles/what-determines-blood-pressure", {}, "HEAD"),
      dependencies,
    );
    expect(head.status).toBe(200);
    expect(head.headers.get("etag")).not.toBeNull();
    expect(await head.text()).toBe("");
  });

  it("publishes canonical discovery documents and a semantic Article index", async () => {
    const dependencies = dependenciesV1();
    const sitemap = await handleStudioPublicContentRequestV1(
      requestV1("/sitemap.xml"),
      dependencies,
    );
    const sitemapXml = await sitemap.text();
    expect(sitemapXml).toContain(
      "https://www.circleheart.dev/ja/articles/what-determines-blood-pressure",
    );
    expect(sitemapXml).toContain("https://www.circleheart.dev/ja");
    expect(sitemapXml).toContain("https://www.circleheart.dev/en/articles");

    const robots = await handleStudioPublicContentRequestV1(
      requestV1("/robots.txt"),
      dependencies,
    );
    expect(await robots.text()).toContain(
      "Sitemap: https://www.circleheart.dev/sitemap.xml",
    );

    const directory = await handleStudioPublicContentRequestV1(
      requestV1("/ja/articles"),
      dependencies,
    );
    const directoryHtml = await directory.text();
    expect(directory.status).toBe(200);
    expect(directoryHtml).toContain("血圧を考える");
    expect(directoryHtml).toContain(
      "/ja/articles/what-determines-blood-pressure",
    );
  });
});

describe("Article tags in public delivery", () => {
  const taggedArticle = (): StudioPublishedArticleV1 =>
    validateStudioPublishedArticleV1({ ...publishedArticleV1(), tags: ["前負荷", "PV loop"] });
  const summaryV1 = (
    overrides: Partial<StudioPublicArticleSummaryV1> & Pick<StudioPublicArticleSummaryV1, "articleId" | "publicSlug">,
  ): StudioPublicArticleSummaryV1 => ({
    locale: "ja",
    title: overrides.publicSlug,
    excerpt: null,
    tags: [],
    publishedAt: "2026-08-12T00:00:00.000Z",
    ...overrides,
  });
  const taggedDependenciesV1 = () => {
    const base = dependenciesV1();
    const article = taggedArticle();
    return Object.freeze({
      ...base,
      dataSource: Object.freeze({
        ...base.dataSource,
        readPublishedArticle: async (routeKey: string) =>
          routeKey === article.publicSlug ? article : null,
        listPublicArticles: async () => Object.freeze({
          items: Object.freeze([
            summaryV1({ articleId: article.articleId, publicSlug: article.publicSlug, title: article.title, tags: article.tags }),
            summaryV1({ articleId: "55555555-5555-4555-8555-555555555555", publicSlug: "pv-loop-basics", title: "PVループ入門", tags: ["pv loop"] }),
            summaryV1({ articleId: "66666666-6666-4666-8666-666666666666", publicSlug: "untagged-note", title: "タグなしの記事" }),
            summaryV1({ articleId: "77777777-7777-4777-8777-777777777777", publicSlug: "english-pv", title: "English PV", locale: "en", tags: ["PV loop"] }),
          ]),
          nextCursor: null,
        }),
      }),
    });
  };

  it("renders published tags in HTML, metadata and Markdown from the same revision", async () => {
    const dependencies = taggedDependenciesV1();
    const html = await (await handleStudioPublicContentRequestV1(
      requestV1("/ja/articles/what-determines-blood-pressure"),
      dependencies,
    )).text();
    expect(html).toContain('<ul class="article-tags" aria-label="タグ">');
    expect(html).toContain('href="/ja/articles?tag=%E5%89%8D%E8%B2%A0%E8%8D%B7"');
    expect(html).toContain('<meta property="article:tag" content="PV loop" />');
    expect(html).toContain('"keywords":"前負荷, PV loop"');
    const markdown = await (await handleStudioPublicContentRequestV1(
      requestV1("/ja/articles/what-determines-blood-pressure.md"),
      dependencies,
    )).text();
    expect(markdown).toContain('tags: ["前負荷", "PV loop"]');
  });

  it("serves one canonical tag page per locale with case-insensitive matching", async () => {
    const response = await handleStudioPublicContentRequestV1(
      requestV1("/ja/articles?tag=pv%20LOOP"),
      taggedDependenciesV1(),
    );
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain("<title>#PV loop の記事 | CircleHeart</title>");
    expect(html).toContain('<link rel="canonical" href="https://www.circleheart.dev/ja/articles?tag=PV+loop" />');
    expect(html).toContain("血圧を考える");
    expect(html).toContain("PVループ入門");
    expect(html).not.toContain("タグなしの記事");
    expect(html).not.toContain("English PV");
    expect(html).toMatch(/<a class="article-tag" href="\/ja\/articles\?tag=PV\+loop" aria-current="page">/);
    expect(html).not.toContain('content="noindex"');
  });

  it("redirects non-canonical tag queries and marks empty tag pages noindex", async () => {
    const dependencies = taggedDependenciesV1();
    const hashed = await handleStudioPublicContentRequestV1(
      requestV1("/ja/articles?tag=%23%EF%BC%B0%EF%BC%B6%20%20loop"),
      dependencies,
    );
    expect(hashed.status).toBe(308);
    expect(hashed.headers.get("location")).toBe("https://www.circleheart.dev/ja/articles?tag=PV+loop");
    const blank = await handleStudioPublicContentRequestV1(requestV1("/ja/articles?tag=%20"), dependencies);
    expect(blank.status).toBe(308);
    expect(blank.headers.get("location")).toBe("https://www.circleheart.dev/ja/articles");
    const missing = await handleStudioPublicContentRequestV1(requestV1("/ja/articles?tag=unknown"), dependencies);
    expect(missing.status).toBe(200);
    const missingHtml = await missing.text();
    expect(missingHtml).toContain('<meta name="robots" content="noindex" />');
    expect(missingHtml).toContain("このタグの公開記事はありません。");
  });

  it("lists tag pages with published Articles in the sitemap", async () => {
    const sitemap = await (await handleStudioPublicContentRequestV1(
      requestV1("/sitemap.xml"),
      taggedDependenciesV1(),
    )).text();
    expect(sitemap).toContain("<loc>https://www.circleheart.dev/ja/articles?tag=PV+loop</loc>");
    expect(sitemap).toContain("<loc>https://www.circleheart.dev/en/articles?tag=PV+loop</loc>");
    expect(sitemap).toContain("?tag=%E5%89%8D%E8%B2%A0%E8%8D%B7</loc>");
    expect(sitemap.match(/tag=PV\+loop/g)).toHaveLength(2);
  });

  it("rejects public projections whose tags the database would not store", () => {
    expect(() => validateStudioPublishedArticleV1({ ...publishedArticleV1(), tags: ["a", "a"] }))
      .toThrow(/tags/);
    const { tags: _omitted, ...withoutTags } = publishedArticleV1();
    expect(() => validateStudioPublishedArticleV1(withoutTags)).toThrow(/keys must be exactly/);
  });
});

function publishedArticleV1(): StudioPublishedArticleV1 {
  return validateStudioPublishedArticleV1({
    schemaId: STUDIO_PUBLISHED_ARTICLE_V1_SCHEMA_ID,
    tags: [],
    articleId: "11111111-1111-4111-8111-111111111111",
    articleContentId: "22222222-2222-4222-8222-222222222222",
    publicSlug: "what-determines-blood-pressure",
    locale: "ja",
    title: "血圧を考える",
    publishedAt: "2026-08-12T00:00:00.000Z",
    updatedAt: "2026-08-12T01:00:00.000Z",
    blocks: [
      {
        blockId: "block/intro",
        kind: "paragraph",
        text: "血圧は何で決まるでしょうか。まず予測してみましょう。",
      },
      {
        blockId: "block/heading",
        kind: "heading",
        level: 2,
        text: "式で確認する",
      },
      {
        blockId: "block/equation",
        kind: "equation",
        expression: "MAP = CO \\times SVR",
      },
      {
        blockId: "block/image",
        kind: "image",
        url: "https://www.circleheart.dev/figure.png",
        altText: "血圧の模式図",
        caption: "図1",
      },
      { blockId: "block/divider", kind: "divider" },
      {
        blockId: "block/link",
        kind: "link",
        href: "/ja/articles/next-lesson",
        label: "次の記事",
        description: "出血を考えます",
      },
      {
        blockId: "block/quiz",
        kind: "quiz",
        question: "平均動脈圧を決める主な組み合わせは？",
        choices: [
          { choiceId: "choice/a", label: "心拍出量と血管抵抗" },
          { choiceId: "choice/b", label: "心拍数だけ" },
        ],
        correctChoiceId: "choice/a",
        explanation: "両方の積として考えると整理できます。",
      },
      {
        blockId: "block/accordion",
        kind: "accordion",
        title: "もう一歩",
        blocks: [{
          blockId: "block/accordion-text",
          kind: "paragraph",
          text: "後期研修医向けの補足です。",
        }],
      },
      {
        blockId: "block/experiment",
        kind: "experiment",
        placement: {
          schemaId: STUDIO_EXPERIMENT_PLACEMENT_V2_SCHEMA_ID,
          placementId: "placement/bp",
          snapshotId: "33333333-3333-4333-8333-333333333333",
          titleOverride: null,
          caption: "血管抵抗を変えて観察します。",
          briefing: {
            defaultTitle: "血圧を動かす",
            scenarioScope: {
              visibleScenarioIds: ["scenario/baseline"],
              initialFocusScenarioId: "scenario/baseline",
            },
            graphs: [{
              paneId: "pane/internal-pressure",
              order: 0,
              emphasis: "primary",
            }],
            outputs: [{
              sourcePaneId: "pane/internal-output",
              outputId: "output/map",
              scenarioId: "scenario/baseline",
              label: "平均動脈圧",
              order: 0,
            }],
            controls: [{
              sourcePaneId: "pane/internal-control",
              controlId: "control/svr",
              label: "体血管抵抗",
              order: 0,
              presentation: { kind: "slider" },
              binding: {
                mode: "fixed",
                scenarioIds: ["scenario/baseline"],
                application: "absolute",
              },
            }],
          },
        },
      },
    ],
  });
}

function dependenciesV1() {
  const article = publishedArticleV1();
  const source: StudioPublicContentDataSourceV1 = Object.freeze({
    readPublicCourse: async () => null,
    listPublicCourses: async () => [],
    readPublishedArticle: async (routeKey: string) =>
      routeKey === article.publicSlug || routeKey === article.articleId
        ? article
        : null,
    listPublicArticles: async () => Object.freeze({
      items: Object.freeze([{
        articleId: article.articleId,
        locale: article.locale,
        title: article.title,
        excerpt: "血圧は何で決まるでしょうか。",
        tags: [],
        publicSlug: article.publicSlug,
        publishedAt: article.publishedAt,
      }]),
      nextCursor: null,
    }),
    listPublicExperiments: async () => Object.freeze({
      items: Object.freeze([{
        experimentId: "experiment/public-simulation",
        title: "公開シミュレーション",
        publicSlug: "public-simulation",
        publishedAt: "2026-08-12T00:30:00.000Z",
        snapshotId: "44444444-4444-4444-8444-444444444444",
        modelId: "model/test",
        scenarioCount: 2,
      }]),
      nextCursor: null,
    }),
  });
  return Object.freeze({
    canonicalOrigin: "https://www.circleheart.dev",
    clientTemplate: TEMPLATE_V1,
    dataSource: source,
  });
}

function requestV1(
  pathname: string,
  headers: Readonly<Record<string, string>> = {},
  method = "GET",
): Request {
  return new Request(`https://www.circleheart.dev${pathname}`, {
    headers,
    method,
  });
}

import { articleReadingFixtureV1 } from "./fixtures/articleReadingFixtureV1";
import { validateStudioArticleDraftV2 } from "@/studio/application/authoring/StudioArticleDataV2";
import { buildArticleReadingIndexV1, parseArticleReadingTextV1 } from "@/studio/application/article/StudioArticleReadingV1";

describe("Article reading references across delivery surfaces", () => {
  it("numbers by first mention, preserves every backlink and separates definitions from cards", () => {
    const draft = validateStudioArticleDraftV2(articleReadingFixtureV1());
    const reading = buildArticleReadingIndexV1(draft.blocks);
    expect(reading.errors).toEqual([]);
    expect(reading.references.map(e => e.block.blockId)).toEqual(["ref/b", "ref/a"]);
    expect(reading.notes.map(e => e.block.blockId)).toEqual(["note/b", "note/a"]);
    expect(reading.references[0].backlinks).toHaveLength(3);
    expect(new Set(reading.references[0].backlinks).size).toBe(3);
    expect(reading.body.filter(b => b.kind === "link").map(b => b.blockId)).toEqual(["card", "broken-card"]);
    const reordered = [draft.blocks.find(b => b.blockId === "repeat")!, ...draft.blocks.filter(b => b.blockId !== "repeat")];
    expect(buildArticleReadingIndexV1(reordered).notes.map(e => e.block.blockId)).toEqual(["note/a", "note/b"]);
  });
  it("preserves escaped markers and ordinary brackets, with stable source offsets", () => {
    const text = String.raw`式 [a+b]、\[@ref/a]、[@ref/b]。`;
    const tokens = parseArticleReadingTextV1(text);
    expect(tokens.filter(t => t.kind !== "text")).toEqual([{ kind: "reference", targetId: "ref/b", raw: "[@ref/b]", offset: text.indexOf("[@ref/b]") }]);
    expect(tokens.filter(t => t.kind === "text").map(t => t.text).join("")).toBe("式 [a+b]、[@ref/a]、。");
  });
  it("numbers figures after moving notes to the end and keeps definitions out of excerpts", () => {
    const draft = articleReadingFixtureV1();
    const figure = draft.blocks.find(b => b.kind === "image")!;
    const blocks = [
      { blockId: "first-definition", kind: "accordion", role: "note", title: "Early definition", blocks: [{ ...figure, blockId: "note-figure", credit: undefined }] },
      ...draft.blocks,
    ];
    // Omit the optional field, rather than sending undefined over a JSON boundary.
    const portable = JSON.parse(JSON.stringify(blocks));
    const reading = buildArticleReadingIndexV1(portable);
    expect(reading.figures.get("fig/one")?.number).toBe(1);
    expect(reading.figures.get("note-figure")?.number).toBe(2);
    const article = validateStudioPublishedArticleV1({ ...publishedArticleV1(), blocks: portable });
    const result = renderStudioPublishedArticleV1({ article, clientTemplate: TEMPLATE_V1, canonicalOrigin: "https://www.circleheart.dev" });
    expect(result.metadata.description).toBe("本文から文献へ移動します。補足も確認できます。");
  });
  it("saves incomplete references as drafts and rejects them at publication", () => {
    const draft = articleReadingFixtureV1();
    const blocks = [...draft.blocks, { blockId: "unfinished", kind: "paragraph", text: "追加文献[@missing]" }];
    expect(validateStudioArticleDraftV2({ ...draft, blocks }).blocks).toEqual(blocks);
    expect(() => validateStudioPublishedArticleV1({ ...publishedArticleV1(), blocks })).toThrow(/missing reference missing/);
  });
  it("shares numbering and targets between HTML and Markdown, with compact credits and clean metadata", () => {
    const draft = articleReadingFixtureV1();
    const article = validateStudioPublishedArticleV1({ ...publishedArticleV1(), blocks: draft.blocks });
    const result = renderStudioPublishedArticleV1({ article, clientTemplate: TEMPLATE_V1, canonicalOrigin: "https://www.circleheart.dev" });
    expect(result.bodyHtml).toContain('id="article-reference-ref/b"');
    expect(result.bodyHtml).toContain('href="#article-reference-ref%2Fb"');
    expect(result.bodyHtml).toContain('role="doc-biblioref"');
    expect(result.bodyHtml).toContain('role="doc-endnotes"');
    expect(result.bodyHtml).toContain('class="article-figure-credit"');
    expect(result.bodyHtml).toContain('class="article-resource-image"');
    expect(result.bodyHtml).not.toMatch(/\[@|\[\^|\[fig:/);
    expect(result.metadata.description).toBe("本文から文献へ移動します。補足も確認できます。");
    expect(result.markdown).toContain("[^note-1]");
    expect(result.markdown).toContain("[^note-1]: **圧の基準**");
    expect(result.markdown).toContain("![表示テスト用の画像](<https://example.test/figure.png>)");
    expect(result.markdown).toContain("[1)](#article-reference-ref%2Fb)");
    expect(result.markdown).not.toContain("<section");
    expect(result.markdown).not.toContain("<figure");
    expect(result.markdown).not.toContain("[@ref/");
  });
  it("keeps image metadata portable and rejects unsafe thumbnail and license URLs", () => {
    const draft = articleReadingFixtureV1();
    const image = draft.blocks.find(b => b.kind === "image")!;
    expect(() => validateStudioArticleDraftV2({ ...draft, blocks: [{ ...image, credit: { text: "Credit", licenseLabel: "License", licenseHref: "javascript:alert(1)" } }] })).toThrow();
    expect(() => validateStudioArticleDraftV2({ ...draft, blocks: [{ blockId: "bad", kind: "link", label: "bad", href: "https://example.test", description: "", imageUrl: "javascript:alert(1)" }] })).toThrow();
  });
});

import {
  courseNeighborsV1,
  validatePublicCourseV1,
  validateCourseContentV1,
} from "@/studio/application/course/StudioCourseV1";
import { courseBodyHtmlV1 } from "@/studio/application/course/StudioCourseHtmlV1";
import {
  validateStudioAuthoringCommandV1,
  describeStudioAuthoringProtocolV1,
} from "@/studio/application/authoring/StudioAuthoringCommandV1";
import {
  courseFixtureV1 as course,
  courseArticleFixtureV1,
} from "./fixtures/courseFixtureV1";
describe("Course publication and authoring", () => {
const article = courseArticleFixtureV1();
const dependencies = {
  canonicalOrigin: "https://www.circleheart.dev",
  clientTemplate:
    '<html><head><title>CircleHeart</title></head><body><div id="root"></div></body></html>',
  dataSource: {
    readPublicCourse: async (id: string) =>
      id === course.courseId ? course : null,
    listPublicCourses: async () => [course],
    readPublishedArticle: async () => article,
    listPublicArticles: async () => ({ items: [], nextCursor: null }),
    listPublicExperiments: async () => ({ items: [], nextCursor: null }),
  },
};
describe("Courses", () => {
  it("carries validated course context and ignores unrelated or corrupt bootstrap", () => {
    const documentLike = {getElementById: () => ({textContent: JSON.stringify(course)}) as HTMLElement};
    expect(readCourseBootstrapV1(course.courseId, documentLike)).toEqual(course);
    expect(readCourseBootstrapV1("other-course", documentLike)).toBeNull();
    expect(readCourseBootstrapV1(course.courseId, {getElementById: () => ({textContent: "{}"}) as HTMLElement})).toBeNull();
    expect(renderCourseBootstrapV1({...course, title: "</script>"})).not.toContain("</script></script>");
  });
  it("includes featured courses in the Home handoff and published sitemap", async () => {
    const home = await handleStudioPublicContentRequestV1(new Request("https://www.circleheart.dev/ja"), dependencies);
    expect(home.headers.get("cache-control")).toBe("no-store");
    const html = await home.text();
    expect(html).toContain(`"courses":[`);
    const sitemap = await handleStudioPublicContentRequestV1(new Request("https://www.circleheart.dev/sitemap.xml"), dependencies);
    expect(await sitemap.text()).toContain(`/ja/courses/${course.courseId}`);
  });

  it("navigates available chapters only, within the selected course", () => {
    expect(courseNeighborsV1(course, article.articleId)?.next?.articleId).toBe(
      course.entries[2].articleId,
    );
    expect(
      courseNeighborsV1(
        { ...course, entries: [course.entries[2], course.entries[0]] },
        article.articleId,
      )?.next,
    ).toBeNull();
    expect(courseNeighborsV1(course, course.entries[1].articleId)).toBeNull();
  });
  it("rejects duplicate references and unpublished metadata", () => {
    expect(() =>
      validateCourseContentV1({
        title: "Course",
        description: "",
        audience: "",
        locale: "ja",
        articleIds: [article.articleId, article.articleId],
      }),
    ).toThrow();
    expect(() =>
      validatePublicCourseV1({
        ...course,
        entries: [{ ...course.entries[1], title: "private title" }],
      }),
    ).toThrow();
    expect(validatePublicCourseV1(course)).toEqual(course);
  });
  it("escapes authored fields and preserves unavailable slots", () => {
    const html = courseBodyHtmlV1({
      ...course,
      title: "<script>alert(1)</script>",
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("現在公開されていません");
    expect(html).not.toContain("/articles/null");
  });
  it("renders direct course HTML on anonymous authority, with no stale cache", async () => {
    const response = await handleStudioPublicContentRequestV1(
      new Request(`https://www.circleheart.dev/ja/courses/${course.courseId}`),
      dependencies,
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const html = await response.text();
    expect(html).toContain(course.title);
    expect(html).toContain(`?course=${course.courseId}`);
  });
  it("preserves course context through article UUID and locale redirects", async () => {
    const response = await handleStudioPublicContentRequestV1(
      new Request(
        `https://www.circleheart.dev/en/articles/${article.articleId}?course=${course.courseId}`,
      ),
      dependencies,
    );
    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe(
      `https://www.circleheart.dev/ja/articles/${article.publicSlug}?course=${course.courseId}`,
    );
  });
  it("includes course order in representation identity", async () => {
    const url = `https://www.circleheart.dev/ja/articles/${article.publicSlug}?course=${course.courseId}`;
    const first = await handleStudioPublicContentRequestV1(
      new Request(url),
      dependencies,
    );
    const second = await handleStudioPublicContentRequestV1(new Request(url), {
      ...dependencies,
      dataSource: {
        ...dependencies.dataSource,
        readPublicCourse: async () => ({
          ...course,
          entries: [course.entries[2], course.entries[0]],
        }),
      },
    });
    expect(first.headers.get("etag")).not.toBe(second.headers.get("etag"));
    expect(first.headers.get("cache-control")).toBe("no-store");
    expect(await first.text()).toContain('rel="next"');
    expect(await second.text()).toContain('rel="prev"');
  });
  it("does not reuse an article ETag after the selected course is unpublished", async () => {
    const url = `https://www.circleheart.dev/ja/articles/${article.publicSlug}?course=${course.courseId}`;
    const first = await handleStudioPublicContentRequestV1(
      new Request(url),
      dependencies,
    );
    const response = await handleStudioPublicContentRequestV1(
      new Request(url, {
        headers: { "If-None-Match": first.headers.get("etag")! },
      }),
      {
        ...dependencies,
        dataSource: {
          ...dependencies.dataSource,
          readPublicCourse: async () => null,
        },
      },
    );
    expect(response.status).toBe(200);
    expect(await response.text()).not.toContain('rel="next"');
  });
  it("discovers and validates the same authoring operations used by the editor", () => {
    const actions = describeStudioAuthoringProtocolV1().actions.map(
      (a) => a.action,
    );
    expect(actions).toEqual(
      expect.arrayContaining([
        "course.save",
        "course.read",
        "course.list",
        "course.publish",
        "course.delete",
      ]),
    );
    const command = {
      schemaId: "circleheart-studio-authoring-command-v1",
      commandId: "a0000000-0000-4000-8000-000000000020",
      action: "course.save",
      input: {
        courseId: null,
        expectedVersion: null,
        content: {
          title: "Test",
          description: "",
          audience: "",
          locale: "ja",
          articleIds: [article.articleId],
        },
      },
    };
    expect(validateStudioAuthoringCommandV1(command)).toEqual(command);
    expect(() =>
      validateStudioAuthoringCommandV1({
        ...command,
        input: { ...command.input, featured: true },
      }),
    ).toThrow();
  });
});

});

import { courseReadingEntryV1, rememberCourseReadingEntryV1 } from "@/studio/application/course/StudioCourseReadingPositionV1";
import { validateDisplayNameV1, publicAuthorHtmlV1 } from "@/studio/application/profile/StudioPublicProfileV1";
describe("Public profile and reading position boundaries", () => {
  it("keeps the last available chapter separate for each reader and tolerates denied storage", () => {
    const values = new Map<string,string>();
    const storage = {getItem:(k:string)=>values.get(k) ?? null,setItem:(k:string,v:string)=>{values.set(k,v);}};
    rememberCourseReadingEntryV1(course,course.entries[2].articleId,"one",storage);
    expect(courseReadingEntryV1(course,"one",storage)).toEqual({entry:course.entries[2],resume:true});
    expect(courseReadingEntryV1(course,"two",storage)).toEqual({entry:course.entries[0],resume:false});
    expect(courseReadingEntryV1({...course,entries:course.entries.slice(0,2)},"one",storage)).toEqual({entry:course.entries[0],resume:false});
    expect(courseReadingEntryV1(course,undefined,{getItem:()=>{throw Error("denied");}}).entry).toEqual(course.entries[0]);
    expect(() => rememberCourseReadingEntryV1(course,course.entries[0].articleId,undefined,{setItem:()=>{throw Error("denied");}})).not.toThrow();
  });
  it("requires short explicit names, escapes authored text and never derives official authority from a name", () => {
    expect(validateDisplayNameV1("😀".repeat(40))).toHaveLength(80);
    for (const name of ["", "😀".repeat(41)," Name", "Name\u3000","Name\nOther","Name\u202e"]) expect(() => validateDisplayNameV1(name)).toThrow();
    expect(publicAuthorHtmlV1({userId:course.ownerId,displayName:"CircleHeart",official:false})).not.toContain("公式");
    expect(publicAuthorHtmlV1({userId:course.ownerId,displayName:'<img src=x>',official:true})).toContain('&lt;img src=x&gt;');
  });
  it("accepts an optional HTTPS cover while rejecting active URLs and unpublished author metadata", () => {
    const content = {title:"A",description:"",audience:"",locale:"ja",articleIds:[]};
    expect(validateCourseContentV1({...content,coverUrl:"https://example.test/book.png"}).coverUrl).toContain("https://");
    expect(() => validateCourseContentV1({...content,coverUrl:"javascript:alert(1)"})).toThrow();
    expect(() => validatePublicCourseV1({...course,entries:course.entries.map((e,i)=>i===1?{...e,author:{userId:course.ownerId,displayName:"Secret",official:false}}:e)})).toThrow();
  });
  it("refreshes author attribution and HTML ETag without changing immutable article representations", async () => {
    const article = courseArticleFixtureV1();
    let displayName = "Before";
    const dependencies = {canonicalOrigin:"https://www.circleheart.dev",clientTemplate:'<html><head></head><body><div id="root"></div></body></html>',dataSource:{readPublishedArticle:async()=>article,readPublicCourse:async()=>null,listPublicCourses:async()=>[],listPublicArticles:async()=>({items:[],nextCursor:null}),listPublicExperiments:async()=>({items:[],nextCursor:null}),readPublicResourceAuthor:async()=>({userId:course.ownerId,displayName,official:true})}};
    const before = await handleStudioPublicContentRequestV1(new Request(`https://www.circleheart.dev/ja/articles/${article.publicSlug}`),dependencies);
    expect(await before.text()).toContain('Before');
    displayName = "After";
    const after = await handleStudioPublicContentRequestV1(new Request(`https://www.circleheart.dev/ja/articles/${article.publicSlug}`,{headers:{"If-None-Match":before.headers.get("etag")!}}),dependencies);
    expect(after.status).toBe(200);
    expect(await after.text()).toContain('After');
    const json = await handleStudioPublicContentRequestV1(new Request(`https://www.circleheart.dev/api/v1/public/articles/${article.publicSlug}`),dependencies);
    expect(await json.json()).toEqual(article);
  });
});

const loaderArticle = courseArticleFixtureV1();
describe("public article navigation", () => {
  it("uses the anonymous CDN JSON and consumes one prefetched result", async () => {
    const fetch = vi.fn(async () => Response.json(loaderArticle));
    const fallback = vi.fn(async () => null);
    const loader = createStudioPublicArticleLoaderV1({ fetch, fallback });
    loader.prefetch(loaderArticle.publicSlug);
    loader.prefetch(loaderArticle.publicSlug);
    expect(await loader.read(loaderArticle.publicSlug)).toEqual(loaderArticle);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(`/api/v1/public/articles/${loaderArticle.publicSlug}`, {
      credentials: "omit", headers: { Accept: "application/json, text/html;q=0.1" },
    });
    expect(fallback).not.toHaveBeenCalled();
    await loader.read(loaderArticle.publicSlug);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("expires unused prefetches and retries failed prefetches", async () => {
    let now = 0;
    const fetch = vi.fn(async () => Response.json(loaderArticle));
    const loader = createStudioPublicArticleLoaderV1({ fetch, fallback: async () => null, now: () => now });
    loader.prefetch(loaderArticle.publicSlug);
    await new Promise<void>(resolve => setImmediate(resolve));
    expect(fetch).toHaveBeenCalledTimes(1);
    now = 16_000;
    await loader.read(loaderArticle.publicSlug);
    expect(fetch).toHaveBeenCalledTimes(2);
    fetch.mockRejectedValueOnce(new Error("offline"));
    loader.prefetch(loaderArticle.publicSlug);
    await new Promise<void>(resolve => setImmediate(resolve));
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(await loader.read(loaderArticle.publicSlug)).toEqual(loaderArticle);
    expect(fetch).toHaveBeenCalledTimes(4);
  });

  it("uses the public RPC only when a static host returns its SPA shell", async () => {
    const fallback = vi.fn(async () => loaderArticle);
    const loader = createStudioPublicArticleLoaderV1({
      fetch: async () => new Response("<html></html>", { headers: { "Content-Type": "text/html" } }), fallback,
    });
    expect(await loader.read(loaderArticle.publicSlug)).toEqual(loaderArticle);
    expect(fallback).toHaveBeenCalledWith(loaderArticle.publicSlug);
  });

  it.each([404, 503])("does not bypass a public %s response", async status => {
    const fallback = vi.fn(async () => loaderArticle);
    const loader = createStudioPublicArticleLoaderV1({ fetch: async () => new Response("", { status }), fallback });
    if (status === 404) expect(await loader.read(loaderArticle.publicSlug)).toBeNull();
    else await expect(loader.read(loaderArticle.publicSlug)).rejects.toThrow("503");
    expect(fallback).not.toHaveBeenCalled();
  });

  it("rejects a different article or malformed publication", async () => {
    const fetch = vi.fn(async () => Response.json(courseArticleFixtureV1(2)));
    const loader = createStudioPublicArticleLoaderV1({ fetch, fallback: async () => null });
    await expect(loader.read(loaderArticle.publicSlug)).rejects.toThrow("route mismatch");
    fetch.mockResolvedValueOnce(Response.json({ ...loaderArticle, schemaId: "draft" }));
    await expect(loader.read(loaderArticle.publicSlug)).rejects.toThrow("schema");
  });
});

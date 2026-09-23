import { MODEL_READING_ENTRIES_V1 } from "@/studio/presentation/modelDocumentation/ModelReadingCatalogV1";
import { articleTagHref, modelDocumentationHref } from "@/homeLinks";
import {
  articleHasTagV1,
  articleTagKeyV1,
  countArticleTagsV1,
  normalizeArticleTagV1,
  isCanonicalArticleTagV1,
  type StudioArticleTagCountV1,
} from "@/studio/application/article/StudioArticleTagsV1";
import { handleModelDocumentRequestV1, type ModelDocumentAssetReaderV1 } from "./ModelDocumentContentV1";
import { publicAuthorHtmlV1 } from "@/studio/application/profile/StudioPublicProfileV1";
import { renderCourseBootstrapV1 } from "@/studio/application/course/StudioCourseBootstrapV1";
import {
  courseUuidV1,
  type PublicCourseV1,
} from "@/studio/application/course/StudioCourseV1";
import {
  courseBodyHtmlV1,
  courseCardsHtmlV1,
  courseNavigationHtmlV1,
} from "@/studio/application/course/StudioCourseHtmlV1";
import { createHash } from "node:crypto";

import {
  injectStudioPublicDocumentV1,
  renderStudioPublishedArticleV1,
  publicArticleMetadataV1,
  renderPublicArticleMarkdownV1,
} from "@/studio/application/publication/StudioPublicArticleRendererV1";
import {
  STUDIO_PUBLIC_HOME_BOOTSTRAP_V1_SCHEMA_ID,
  STUDIO_PUBLIC_HOME_DISCOVERY_LIMIT_V1,
  type StudioPublicArticleSummaryV1,
  validateStudioPublicHomeBootstrapV1,
} from "@/studio/application/publication/StudioPublicHomeBootstrapV1";
import { renderStudioPublicHomeV1 } from "@/server/StudioPublicHomeRendererV1";
import {
  DEFAULT_LOCALE,
  LOCALE_NEGOTIATION_PATH,
  localeFromAcceptLanguage,
  localeFromCookieHeader,
} from "@/localeRouting";
import type { StudioSummaryCursorV1 } from "@/studio/infrastructure/supabase/StudioSupabaseContentRepositoryV1";
import type { StudioPublicContentDataSourceV1 } from "@/server/StudioPublicContentDataSourceV1";

export type StudioPublicContentHandlerDependenciesV1 = Readonly<{
  readModelDocumentAsset?: ModelDocumentAssetReaderV1;
  canonicalOrigin: string;
  clientTemplate: string;
  dataSource: StudioPublicContentDataSourceV1;
}>;

const PUBLIC_SLUG_OR_UUID_V1 =
  /^(?:[a-z0-9][a-z0-9-]{2,95}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/;
const PUBLIC_CACHE_V1 =
  "public, max-age=0, s-maxage=300, stale-while-revalidate=86400";

export async function handleStudioPublicContentRequestV1(
  request: Request,
  dependencies: StudioPublicContentHandlerDependenciesV1,
): Promise<Response> {
  const url = new URL(request.url);
  if (request.method !== "GET" && request.method !== "HEAD") {
    return responseV1(
      "Method not allowed\n",
      405,
      "text/plain; charset=utf-8",
      {
        Allow: "GET, HEAD",
      },
      request.method,
    );
  }
  // Hosting serves existing files first (hashed assets remain immutable).
  // Missing chunks from an older tab must never receive/cache the SPA HTML.
  // Backend headers override Hosting's static asset cache rule.
  if (url.pathname.startsWith("/assets/") || url.pathname.startsWith("/model-documents/")) {
    return responseV1(
      "Asset not found\n",
      404,
      "text/plain; charset=utf-8",
      { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
      request.method,
    );
  }
  if (dependencies.readModelDocumentAsset) {
    const response = await handleModelDocumentRequestV1(request, {
      ...dependencies, readAsset: dependencies.readModelDocumentAsset,
    });
    if (response) return response;
  }
  if (url.pathname === "/healthz") {
    return responseV1(
      "ok\n",
      200,
      "text/plain; charset=utf-8",
      {},
      request.method,
    );
  }
  if (url.pathname === "/robots.txt") {
    return responseV1(
      robotsTextV1(dependencies.canonicalOrigin),
      200,
      "text/plain; charset=utf-8",
      publicHeadersV1(),
      request.method,
    );
  }
  if (url.pathname === "/sitemap.xml") {
    const [articles, jaCourses, enCourses] = await Promise.all([
      listAllPublicArticlesV1(dependencies.dataSource),
      listAllPublicCoursesV1(dependencies.dataSource, "ja"),
      listAllPublicCoursesV1(dependencies.dataSource, "en"),
    ]);
    return responseV1(
      sitemapXmlV1(
        articles,
        [...jaCourses, ...enCourses],
        dependencies.canonicalOrigin,
      ),
      200,
      "application/xml; charset=utf-8",
      publicHeadersV1(),
      request.method,
    );
  }
  if (url.pathname === "/" || url.pathname === LOCALE_NEGOTIATION_PATH) {
    const locale =
      localeFromCookieHeader(request.headers.get("cookie")) ??
      localeFromAcceptLanguage(request.headers.get("accept-language")) ??
      DEFAULT_LOCALE;
    const destination = new URL(`/${locale}`, dependencies.canonicalOrigin);
    destination.search = url.search;
    return responseV1(
      "",
      302,
      "text/plain; charset=utf-8",
      {
        Location: destination.toString(),
        "Cache-Control": "private, no-store",
        Vary: "Cookie, Accept-Language",
      },
      request.method,
    );
  }

  const homeMatch = /^\/(ja|en)\/?$/.exec(url.pathname);
  if (homeMatch !== null) {
    const locale = homeMatch[1] as "ja" | "en";
    const [articles, experimentPage, publicCourses, featuredCourses] = await Promise.all([
      listLocalizedHomeArticlesV1(dependencies.dataSource, locale),
      dependencies.dataSource.listPublicExperiments({
        limit: STUDIO_PUBLIC_HOME_DISCOVERY_LIMIT_V1,
      }),
      dependencies.dataSource.listPublicCourses({ locale }),
      dependencies.dataSource.listPublicCourses({ locale, featured: true }),
    ]);
    const courses = [...new Map([...featuredCourses, ...publicCourses].map(c => [c.courseId, c])).values()].slice(0, 50);
    const bootstrap = validateStudioPublicHomeBootstrapV1({
      schemaId: STUDIO_PUBLIC_HOME_BOOTSTRAP_V1_SCHEMA_ID,
      locale,
      articles,
      experiments: experimentPage.items,
      courses,
      featuredCourseIds: featuredCourses.map(c => c.courseId).filter(id => courses.some(c => c.courseId === id)),
    });
    const rendered = renderStudioPublicHomeV1({
      bootstrap,
      canonicalOrigin: dependencies.canonicalOrigin,
      clientTemplate: dependencies.clientTemplate,
    });
    const etag = `"home-${locale}-html-v1-${createHash("sha256")
      .update(rendered.documentHtml, "utf8")
      .digest("hex")}"`;
    if (requestIfNoneMatchV1(request, etag)) {
      return new Response(null, {
        status: 304,
        headers: secureHeadersV1({
          "Cache-Control": "no-store",
          ETag: etag,
        }),
      });
    }
    return responseV1(
      rendered.documentHtml,
      200,
      "text/html; charset=utf-8",
      { ...publicHeadersV1(), "Cache-Control": "no-store", ETag: etag },
      request.method,
    );
  }

  const courseRoute = /^\/(ja|en)\/courses(?:\/([0-9a-f-]+))?\/?$/.exec(
    url.pathname,
  );
  const courseApi = /^\/api\/v1\/public\/courses\/([0-9a-f-]+)$/.exec(
    url.pathname,
  );
  if (courseRoute || courseApi) {
    const id = courseApi?.[1] ?? courseRoute?.[2];
    const locale = (courseRoute?.[1] ?? "ja") as "ja" | "en";
    const course =
      id && courseUuidV1.test(id)
        ? await dependencies.dataSource.readPublicCourse(id)
        : null;
    if (id && !course) return notFoundResponseV1(request, dependencies);
    if (courseApi)
      return responseV1(
        JSON.stringify(course),
        200,
        "application/json; charset=utf-8",
        { "Cache-Control": "no-store" },
        request.method,
      );
    if (course && locale !== course.locale)
      return responseV1(
        "",
        308,
        "text/plain",
        {
          Location: `/${course.locale}/courses/${course.courseId}`,
          "Cache-Control": "no-store",
        },
        request.method,
      );
    const courses = course
      ? []
      : await listAllPublicCoursesV1(dependencies.dataSource, locale);
    const body = course
      ? courseBodyHtmlV1(course)
      : `<main class="public-static-shell"><h1>${locale === "ja" ? "コース" : "Courses"}</h1>${courseCardsHtmlV1(courses, locale)}</main>`;
    const html = injectStudioPublicDocumentV1({
      bodyHtml: body,
      clientTemplate: dependencies.clientTemplate,
      title: course
        ? `${course.title} | CircleHeart`
        : `${locale === "ja" ? "コース" : "Courses"} | CircleHeart`,
      description: course?.description ?? "CircleHeart courses",
      language: locale,
      canonicalUrl: new URL(
        url.pathname,
        dependencies.canonicalOrigin,
      ).toString(),
      additionalHeadHtml: '<meta property="og:type" content="website" />',
    });
    return responseV1(
      html,
      200,
      "text/html; charset=utf-8",
      { "Cache-Control": "no-store" },
      request.method,
    );
  }

  const apiMatch = /^\/api\/v1\/public\/articles\/([^/]+)$/.exec(url.pathname);
  if (apiMatch !== null) {
    return publishedArticleResponseV1({
      dependencies,
      format: "json",
      locale: null,
      request,
      routeKey: decodedRouteKeyV1(apiMatch[1]),
    });
  }

  const directoryMatch = /^\/(ja|en)\/articles\/?$/.exec(url.pathname);
  if (directoryMatch !== null) {
    const locale = directoryMatch[1] as "ja" | "en";
    const requestedTag = url.searchParams.get("tag");
    const tag = requestedTag === null ? null : normalizeArticleTagV1(requestedTag);
    if (
      requestedTag !== null
      && (tag !== requestedTag || !isCanonicalArticleTagV1(tag))
    ) {
      // One tag page per spelling: "#PV loop", "ＰＶ loop" and a blank tag
      // resolve to the canonical query (or the unfiltered directory).
      const location = new URL(
        tag !== null && isCanonicalArticleTagV1(tag)
          ? articleTagHref({ locale, tag })
          : `/${locale}/articles`,
        dependencies.canonicalOrigin,
      ).toString();
      return responseV1(
        "",
        308,
        "text/plain; charset=utf-8",
        { Location: location, "Cache-Control": "public, max-age=300, s-maxage=86400" },
        request.method,
      );
    }
    const localized = (
      await listAllPublicArticlesV1(dependencies.dataSource)
    ).filter((article) => article.locale === locale);
    const tagCounts = countArticleTagsV1(
      localized.map((article) => article.tags),
      locale,
    );
    const activeTag = tag === null
      ? null
      : tagCounts.find((entry) => entry.key === articleTagKeyV1(tag))?.tag ?? tag;
    const articles = activeTag === null
      ? localized
      : localized.filter((article) => articleHasTagV1(article.tags, activeTag));
    const canonicalUrl = new URL(
      activeTag === null
        ? `/${locale}/articles`
        : articleTagHref({ locale, tag: activeTag }),
      dependencies.canonicalOrigin,
    ).toString();
    const title = activeTag === null
      ? locale === "ja" ? "記事 | CircleHeart" : "Articles | CircleHeart"
      : locale === "ja"
        ? `#${activeTag} の記事 | CircleHeart`
        : `Articles tagged #${activeTag} | CircleHeart`;
    const description = activeTag === null
      ? locale === "ja"
        ? "循環動態をシミュレーションで学ぶCircleHeartの記事一覧です。"
        : "CircleHeart articles for learning hemodynamics through simulation."
      : locale === "ja"
        ? `「${activeTag}」のタグが付いたCircleHeartの記事一覧です。`
        : `CircleHeart articles tagged “${activeTag}”.`;
    const documentHtml = injectStudioPublicDocumentV1({
      additionalHeadHtml: [
        `<meta property="og:type" content="website" />`,
        ...(activeTag !== null && articles.length === 0
          ? [`<meta name="robots" content="noindex" />`]
          : []),
      ].join("\n    "),
      bodyHtml: articleDirectoryBodyV1(articles, locale, activeTag, tagCounts),
      canonicalUrl,
      clientTemplate: dependencies.clientTemplate,
      description,
      language: locale,
      title,
    });
    return responseV1(
      documentHtml,
      200,
      "text/html; charset=utf-8",
      publicHeadersV1(),
      request.method,
    );
  }

  const articleMatch = /^\/(ja|en)\/articles\/([^/]+?)(\.(?:md|json))?$/.exec(
    url.pathname,
  );
  if (articleMatch !== null) {
    const locale = articleMatch[1] as "ja" | "en";
    const format =
      articleMatch[3] === ".md"
        ? "markdown"
        : articleMatch[3] === ".json"
          ? "json"
          : "html";
    return publishedArticleResponseV1({
      dependencies,
      format,
      locale,
      request,
      routeKey: decodedRouteKeyV1(articleMatch[2]),
    });
  }

  return notFoundResponseV1(request, dependencies);
}

async function publishedArticleResponseV1(
  input: Readonly<{
    dependencies: StudioPublicContentHandlerDependenciesV1;
    format: "html" | "json" | "markdown";
    locale: "ja" | "en" | null;
    request: Request;
    routeKey: string | null;
  }>,
): Promise<Response> {
  if (input.routeKey === null || !PUBLIC_SLUG_OR_UUID_V1.test(input.routeKey)) {
    return notFoundResponseV1(input.request, input.dependencies);
  }
  const article = await input.dependencies.dataSource.readPublishedArticle(
    input.routeKey,
  );
  if (article === null) {
    return notFoundResponseV1(input.request, input.dependencies);
  }

  const requestedCourse = new URL(input.request.url).searchParams.get("course");
  const courseId =
    requestedCourse && courseUuidV1.test(requestedCourse)
      ? requestedCourse
      : null;
  if (
    input.routeKey !== article.publicSlug ||
    (input.format !== "json" && input.locale !== article.locale)
  ) {
    const location =
      input.format === "json"
        ? new URL(
            `/api/v1/public/articles/${article.publicSlug}`,
            input.dependencies.canonicalOrigin,
          ).toString()
        : new URL(
            `/${article.locale}/articles/${article.publicSlug}${input.format === "markdown" ? ".md" : ""}`,
            input.dependencies.canonicalOrigin,
          ).toString();
    return responseV1(
      "",
      308,
      "text/plain; charset=utf-8",
      {
        Location:
          location +
          (input.format === "html" && courseId ? `?course=${courseId}` : ""),
        "Cache-Control": "public, max-age=300, s-maxage=86400",
      },
      input.request.method,
    );
  }

  const [author, course] = await Promise.all([
    input.format === "html"
      ? input.dependencies.dataSource.readPublicResourceAuthor?.("article", article.articleId)
      : null,
    input.format === "html" && courseId
      ? input.dependencies.dataSource.readPublicCourse(courseId)
      : null,
  ]);
  // JSON navigation and Markdown readers do not need HTML/KaTeX rendering.
  const rendered = input.format === "html" ? renderStudioPublishedArticleV1({
    article,
    ...(author ? { author } : {}),
    canonicalOrigin: input.dependencies.canonicalOrigin,
    clientTemplate: input.dependencies.clientTemplate,
  }) : null;
  const metadata = rendered?.metadata ?? publicArticleMetadataV1(article, input.dependencies.canonicalOrigin);
  const cacheControl = courseId ? "no-store" : "public, max-age=0, s-maxage=300, must-revalidate";
  const courseNav =
    course && course.locale === article.locale
      ? courseNavigationHtmlV1(course, article.articleId)
      : "";
  const formatBody =
    input.format === "html"
      ? rendered!.documentHtml
          .replace("</article>", `${courseNav && course ? courseNavigationHtmlV1(course, article.articleId, true) : ""}</article>`)
          .replace(
            '<header class="article-document-header">',
            `${courseNav}<header class="article-document-header">`,
          )
          .replace(
            "</body>",
            `${courseNav && course ? renderCourseBootstrapV1(course) : ""}</body>`,
          )
      : input.format === "markdown"
        ? renderPublicArticleMarkdownV1(article)
        : `${JSON.stringify(article, null, 2)}\n`;
  const representationDigest = createHash("sha256")
    .update(formatBody, "utf8")
    .digest("hex");
  const etag = `"article-${article.articleContentId}-${input.format}-v1-${representationDigest}"`;
  if (requestIfNoneMatchV1(input.request, etag)) {
    return new Response(null, {
      status: 304,
      headers: secureHeadersV1({
        "Cache-Control": cacheControl,
        ETag: etag,
      }),
    });
  }
  const contentType =
    input.format === "html"
      ? "text/html; charset=utf-8"
      : input.format === "markdown"
        ? "text/markdown; charset=utf-8"
        : "application/json; charset=utf-8";
  const markdownUrl = `${metadata.canonicalUrl}.md`;
  const jsonUrl = new URL(
    `/api/v1/public/articles/${article.publicSlug}`,
    input.dependencies.canonicalOrigin,
  ).toString();
  const contentLocation =
    input.format === "html"
      ? metadata.canonicalUrl
      : input.format === "markdown"
        ? markdownUrl
        : jsonUrl;
  return responseV1(
    formatBody,
    200,
    contentType,
    {
      ...publicHeadersV1(),
      ...(input.format === "html" ? {} : { "X-Robots-Tag": "noindex" }),
      ETag: etag,
      "Content-Location": contentLocation,
      "Cache-Control": cacheControl,
      Link: [
        `<${metadata.canonicalUrl}>; rel="canonical"`,
        `<${markdownUrl}>; rel="alternate"; type="text/markdown"`,
        `<${jsonUrl}>; rel="alternate"; type="application/json"`,
      ].join(", "),
    },
    input.request.method,
  );
}

/** GET/HEAD use weak comparison and may send a list of cached validators. */
function requestIfNoneMatchV1(request: Request, currentEtag: string): boolean {
  const header = request.headers.get("if-none-match");
  if (header === null) return false;
  const currentOpaqueTag = currentEtag.replace(/^W\//, "");
  for (const match of header.matchAll(/\*|(?:W\/)?"[^"]*"/g)) {
    if (match[0] === "*") return true;
    if (match[0].replace(/^W\//, "") === currentOpaqueTag) return true;
  }
  return false;
}

async function listAllPublicArticlesV1(
  source: StudioPublicContentDataSourceV1,
): Promise<readonly StudioPublicArticleSummaryV1[]> {
  const result: StudioPublicArticleSummaryV1[] = [];
  let cursor = null;
  for (let pageIndex = 0; pageIndex < 100; pageIndex += 1) {
    const page = await source.listPublicArticles({ limit: 100, cursor });
    result.push(...page.items);
    if (page.nextCursor === null) return Object.freeze(result);
    cursor = page.nextCursor;
  }
  throw new Error("Public Article sitemap exceeded 10,000 entries");
}

async function listLocalizedHomeArticlesV1(
  source: StudioPublicContentDataSourceV1,
  locale: "ja" | "en",
): Promise<readonly StudioPublicArticleSummaryV1[]> {
  const result: StudioPublicArticleSummaryV1[] = [];
  let cursor: StudioSummaryCursorV1 | null = null;
  for (let pageIndex = 0; pageIndex < 100; pageIndex += 1) {
    const page = await source.listPublicArticles({ limit: 100, cursor });
    for (const article of page.items) {
      if (article.locale === locale) result.push(article);
      if (result.length === STUDIO_PUBLIC_HOME_DISCOVERY_LIMIT_V1) {
        return Object.freeze(result);
      }
    }
    if (page.nextCursor === null) return Object.freeze(result);
    cursor = page.nextCursor;
  }
  throw new Error("Public Home Article discovery exceeded 10,000 entries");
}

function articleDirectoryBodyV1(
  articles: readonly StudioPublicArticleSummaryV1[],
  locale: "ja" | "en",
  activeTag: string | null = null,
  tagCounts: readonly StudioArticleTagCountV1[] = [],
): string {
  const heading = activeTag === null
    ? locale === "ja" ? "記事" : "Articles"
    : `<span class="public-static-tag-mark" aria-hidden="true">#</span>${escapeHtmlTextV1(activeTag)}`;
  const empty = activeTag !== null
    ? locale === "ja"
      ? "このタグの公開記事はありません。"
      : "No public articles have this tag."
    : locale === "ja"
      ? "公開中の記事はまだありません。"
      : "No public articles yet.";
  const tagNavigation = tagCounts.length === 0
    ? ""
    : `<nav class="public-static-tag-nav" aria-label="${locale === "ja" ? "タグ" : "Tags"}"><a class="article-tag" href="/${locale}/articles"${activeTag === null ? ` aria-current="page"` : ""}>${locale === "ja" ? "すべて" : "All"}</a>${tagCounts.map((entry) =>
        `<a class="article-tag" href="${escapeHtmlAttributeV1(articleTagHref({ locale, tag: entry.tag }))}"${activeTag !== null && articleTagKeyV1(activeTag) === entry.key ? ` aria-current="page"` : ""}><span aria-hidden="true">#</span>${escapeHtmlTextV1(entry.tag)} <small>${entry.count}</small></a>`).join("")}</nav>`;
  const cards =
    articles.length === 0
      ? `<p>${empty}</p>`
      : articles
          .map((article) => {
            const href = `/${locale}/articles/${encodeURIComponent(article.publicSlug)}`;
            const excerpt =
              article.excerpt === null
                ? ""
                : `<p>${escapeHtmlTextV1(article.excerpt)}</p>`;
            const tags =
              article.tags.length === 0
                ? ""
                : `<p class="public-static-card-tags">${article.tags.map((tag) => `<span>#${escapeHtmlTextV1(tag)}</span>`).join(" ")}</p>`;
            return `<li><a href="${href}"><h2>${escapeHtmlTextV1(article.title)}</h2>${excerpt}${tags}${publicAuthorHtmlV1(article.author,locale)}<time datetime="${escapeHtmlAttributeV1(article.publishedAt)}">${escapeHtmlTextV1(article.publishedAt.slice(0, 10))}</time></a></li>`;
          })
          .join("\n");
  const kicker = activeTag === null
    ? "CircleHeart"
    : `<a class="public-static-back" href="/${locale}/articles">${locale === "ja" ? "記事" : "Articles"}</a> · ${locale === "ja" ? `タグ · ${articles.length}件` : `Tag · ${articles.length} ${articles.length === 1 ? "article" : "articles"}`}`;
  return `<main class="public-static-shell"><section class="public-static-directory"><header><p class="public-static-kicker">${kicker}</p><h1>${heading}</h1>${tagNavigation}</header>${articles.length === 0 ? `<p>${empty}</p>` : `<ul>${cards}</ul>`}</section></main>`;
}

function sitemapXmlV1(
  articles: readonly StudioPublicArticleSummaryV1[],
  courses: readonly PublicCourseV1[],
  canonicalOrigin: string,
): string {
  const staticPaths = [
    "/ja",
    "/en",
    "/ja/articles",
    "/en/articles",
    "/ja/courses",
    "/en/courses",
  ];
  const urls = [
    ...staticPaths.map(
      (path) =>
        `  <url><loc>${escapeXmlV1(new URL(path, canonicalOrigin).toString())}</loc></url>`,
    ),
    ...MODEL_READING_ENTRIES_V1.filter(entry => entry.state !== "research").flatMap(entry =>
      (["ja", "en"] as const).flatMap(locale => (["guide", "presets"] as const).map(view =>
        `  <url><loc>${escapeXmlV1(new URL(modelDocumentationHref({ locale, ...entry.identity, documentId: entry.documentId, view }), canonicalOrigin).href)}</loc></url>`))),
    ...courses.map(
      (course) =>
        `  <url><loc>${escapeXmlV1(new URL(`/${course.locale}/courses/${course.courseId}`, canonicalOrigin).toString())}</loc><lastmod>${escapeXmlV1(course.updatedAt)}</lastmod></url>`,
    ),
    ...articles.map((article) => {
      const location = new URL(
        `/${article.locale}/articles/${article.publicSlug}`,
        canonicalOrigin,
      ).toString();
      return `  <url><loc>${escapeXmlV1(location)}</loc><lastmod>${escapeXmlV1(article.publishedAt)}</lastmod></url>`;
    }),
    ...(["ja", "en"] as const).flatMap((locale) =>
      countArticleTagsV1(
        articles.filter((article) => article.locale === locale).map((article) => article.tags),
        locale,
      ).map((entry) =>
        `  <url><loc>${escapeXmlV1(new URL(articleTagHref({ locale, tag: entry.tag }), canonicalOrigin).toString())}</loc></url>`)),
  ];
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urls,
    `</urlset>`,
    "",
  ].join("\n");
}

function robotsTextV1(canonicalOrigin: string): string {
  return [
    "User-agent: *",
    "Allow: /ja/articles/",
    "Allow: /en/articles/",
    "Disallow: /ja/me/",
    "Disallow: /en/me/",
    "Disallow: /ja/dev/",
    "Disallow: /en/dev/",
    "Disallow: /ja/experiments/new",
    "Disallow: /en/experiments/new",
    "Disallow: /ja/courses/new",
    "Disallow: /en/courses/new",
    "Disallow: /*/courses/*/edit",
    `Sitemap: ${new URL("/sitemap.xml", canonicalOrigin).toString()}`,
    "",
  ].join("\n");
}

function notFoundResponseV1(
  request: Request,
  dependencies: StudioPublicContentHandlerDependenciesV1,
): Response {
  const documentHtml = injectStudioPublicDocumentV1({
    additionalHeadHtml: `<meta name="robots" content="noindex" />`,
    bodyHtml: `<main class="public-static-shell"><section class="public-static-message"><p class="public-static-kicker">404</p><h1>Page not found</h1><p>The requested public content does not exist.</p><a href="/">CircleHeart</a></section></main>`,
    canonicalUrl: new URL("/404", dependencies.canonicalOrigin).toString(),
    clientTemplate: dependencies.clientTemplate,
    description: "The requested public content does not exist.",
    language: "en",
    title: "Page not found | CircleHeart",
  });
  return responseV1(
    documentHtml,
    404,
    "text/html; charset=utf-8",
    { "Cache-Control": "public, max-age=0, s-maxage=60" },
    request.method,
  );
}

function responseV1(
  body: string,
  status: number,
  contentType: string,
  headers: Readonly<Record<string, string>>,
  requestMethod: string,
): Response {
  return new Response(requestMethod === "HEAD" ? null : body, {
    status,
    headers: secureHeadersV1({
      "Content-Type": contentType,
      ...headers,
    }),
  });
}

function publicHeadersV1(): Record<string, string> {
  return { "Cache-Control": PUBLIC_CACHE_V1 };
}

function secureHeadersV1(headers: Readonly<Record<string, string>>): Headers {
  return new Headers({
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    ...headers,
  });
}

function decodedRouteKeyV1(segment: string): string | null {
  try {
    return decodeURIComponent(segment);
  } catch {
    return null;
  }
}

function escapeHtmlTextV1(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeHtmlAttributeV1(value: string): string {
  return escapeHtmlTextV1(value)
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeXmlV1(value: string): string {
  return escapeHtmlAttributeV1(value);
}

async function listAllPublicCoursesV1(
  source: StudioPublicContentDataSourceV1,
  locale: string,
): Promise<readonly PublicCourseV1[]> {
  const courses: PublicCourseV1[] = [];
  for (let offset = 0; offset < 10000; offset += 50) {
    const page = await source.listPublicCourses({ locale, offset });
    courses.push(...page);
    if (page.length < 50) return courses;
  }
  throw new Error("Course directory exceeded 10,000 entries");
}

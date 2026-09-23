import { PublicArticleLinkV1 } from "@/components/article/PublicArticleLinkV1";
import { PublicAuthorV1 } from "./PublicAuthorV1";
import React from "react";
import { ArrowLeft, BookOpenText, ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { articleReaderHref, articleTagHref, articlesHref } from "@/homeLinks";
import { localeFromPathname } from "@/localeRouting";
import {
  readPublicArticleDirectoryAsyncV3,
  type PublicArticleCatalogItemV3,
} from "@/components/site/PublicCatalogV3";
import {
  completePublicStaticContentHandoffV1,
} from "@/components/site/PublicStaticContentHandoffV1";
import {
  articleHasTagV1,
  articleTagKeyV1,
  countArticleTagsV1,
  isCanonicalArticleTagV1,
  normalizeArticleTagV1,
} from "@/studio/application/article/StudioArticleTagsV1";

/** Tags beyond this many stay behind an explicit "more" toggle. */
const DIRECTORY_TAG_PREVIEW_LIMIT_V1 = 16;

export function PublicArticleDirectoryPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const locale = localeFromPathname(location.pathname);
  const [state, setState] = React.useState<
    | Readonly<{ kind: "loading" }>
    | Readonly<{ kind: "ready"; locale: string; articles: readonly PublicArticleCatalogItemV3[] }>
    | Readonly<{ kind: "error"; message: string }>
  >({ kind: "loading" });
  const [allTagsShown, setAllTagsShown] = React.useState(false);
  const requestedTag = new URLSearchParams(location.search).get("tag");
  const normalizedTag =
    requestedTag === null ? null : normalizeArticleTagV1(requestedTag);
  const tag =
    normalizedTag !== null && isCanonicalArticleTagV1(normalizedTag)
      ? normalizedTag
      : null;

  React.useEffect(() => {
    // Keep one address per tag page, matching the server's canonical redirect.
    if (requestedTag === null || requestedTag === tag) return;
    navigate(tag === null ? articlesHref(locale) : articleTagHref({ locale, tag }), {
      replace: true,
    });
  }, [locale, navigate, requestedTag, tag]);

  React.useEffect(() => {
    let current = true;
    setState({ kind: "loading" });
    void readPublicArticleDirectoryAsyncV3(locale).then((articles) => {
      if (current) setState({ kind: "ready", locale, articles });
    }).catch((error) => {
      if (current) {
        setState({
          kind: "error",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    });
    return () => {
      current = false;
    };
  }, [locale]);
  React.useEffect(() => {
    if (state.kind === "ready") {
      completePublicStaticContentHandoffV1();
    }
  }, [state.kind]);

  const localized = state.kind === "ready" && state.locale === locale
    ? state.articles
    : [];
  const tagCounts = React.useMemo(
    () => countArticleTagsV1(localized.map((article) => article.tags), locale),
    [localized, locale],
  );
  const activeKey = tag === null ? null : articleTagKeyV1(tag);
  // Show the most common authored spelling, whichever case the URL used.
  const activeTag = tag === null
    ? null
    : tagCounts.find((entry) => entry.key === activeKey)?.tag ?? tag;
  const articles = activeTag === null
    ? localized
    : localized.filter((article) => articleHasTagV1(article.tags, activeTag));
  const activeIndex = tagCounts.findIndex((entry) => entry.key === activeKey);
  const tagsCollapsed =
    !allTagsShown && tagCounts.length > DIRECTORY_TAG_PREVIEW_LIMIT_V1;
  const visibleTags = tagsCollapsed
    ? tagCounts.filter((_, index) =>
        index < DIRECTORY_TAG_PREVIEW_LIMIT_V1 || index === activeIndex)
    : tagCounts;

  // The server renders the same titles. Both states set one explicitly, so
  // clearing a tag never leaves the previous tag page's title behind.
  const directoryTitle = `${t("management.articles")} | CircleHeart`;
  const pageTitle = activeTag === null
    ? directoryTitle
    : `${t("articleTags.pageTitle", { tag: activeTag })} | CircleHeart`;
  const entryRef = React.useRef({ title: "", enteredOnTag: tag !== null, directoryTitle });
  entryRef.current.directoryTitle = directoryTitle;
  // Declared first so it records the title from before this page set one.
  React.useEffect(() => {
    const entry = entryRef.current;
    // Entered on a tag URL, the prior title is that tag page's own.
    entry.title = entry.enteredOnTag ? "" : document.title;
    return () => { document.title = entry.title || entry.directoryTitle; };
  }, []);
  React.useEffect(() => {
    document.title = pageTitle;
  }, [pageTitle]);

  return (
    <div
      className="h-full overflow-y-auto bg-wb-app text-wb-text"
      data-public-static-scroll-host="true"
      data-testid="public-article-directory-v3"
    >
      <main className="mx-auto w-full max-w-4xl px-5 py-12 sm:px-8 sm:py-16">
        {activeTag === null ? (
          <>
            <h1 className="text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
              {t("publicArticles.title")}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-wb-muted">
              {t("publicArticles.description")}
            </p>
          </>
        ) : (
          <>
            <Link
              to={articlesHref(locale)}
              className="inline-flex min-h-8 items-center gap-1.5 rounded-md text-xs font-medium text-wb-muted transition-colors hover:text-wb-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wb-accent"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              {t("articleTags.allArticles")}
            </Link>
            <h1
              className="mt-3 break-words text-3xl font-semibold tracking-[-0.03em] sm:text-4xl"
              data-testid="public-article-tag-heading"
            >
              <span className="mr-0.5 text-wb-subtle" aria-hidden="true">#</span>
              {activeTag}
            </h1>
            <p className="mt-4 text-sm leading-7 text-wb-muted" role="status">
              {state.kind === "ready"
                ? t("articleTags.articleCount", { count: articles.length })
                : t("articleLibrary.loading")}
            </p>
          </>
        )}

        {tagCounts.length > 0 && (
          <nav
            className="article-tag-directory-nav"
            aria-label={t("articleTags.browseLabel")}
            data-testid="public-article-tag-nav"
          >
            <Link
              className="article-tag"
              to={articlesHref(locale)}
              aria-current={activeTag === null ? "page" : undefined}
            >
              {t("articleTags.all")}
            </Link>
            {visibleTags.map((entry) => (
              <Link
                key={entry.key}
                className="article-tag"
                to={articleTagHref({ locale, tag: entry.tag })}
                aria-current={entry.key === activeKey ? "page" : undefined}
              >
                <span aria-hidden="true">#</span>
                {entry.tag}
                <small>{entry.count}</small>
              </Link>
            ))}
            {tagCounts.length > DIRECTORY_TAG_PREVIEW_LIMIT_V1 && (
              <button
                type="button"
                className="article-tag article-tag-more"
                aria-expanded={!tagsCollapsed}
                onClick={() => setAllTagsShown((shown) => !shown)}
              >
                {tagsCollapsed
                  ? t("articleTags.showMoreTags", {
                      count: tagCounts.length - visibleTags.length,
                    })
                  : t("articleTags.showFewerTags")}
                <ChevronDown
                  className={`h-3 w-3 transition-transform ${tagsCollapsed ? "" : "rotate-180"}`}
                  aria-hidden="true"
                />
              </button>
            )}
          </nav>
        )}

        {state.kind === "loading" ? (
          <p className="mt-10 text-sm text-wb-muted" role="status">
            {t("articleLibrary.loading")}
          </p>
        ) : state.kind === "error" ? (
          <p className="mt-10 rounded-xl bg-wb-danger-soft p-4 text-sm text-wb-danger" role="alert">
            {state.message}
          </p>
        ) : articles.length === 0 ? (
          activeTag === null ? (
            <EmptyDirectoryV3
              icon={<BookOpenText className="h-6 w-6" aria-hidden="true" />}
              title={t("publicArticles.emptyTitle")}
              description={t("publicArticles.emptyDescription")}
            />
          ) : (
            <EmptyDirectoryV3
              icon={<span className="text-xl font-semibold" aria-hidden="true">#</span>}
              title={t("articleTags.emptyTagTitle")}
              description={t("articleTags.emptyTagDescription")}
              action={
                <Link
                  to={articlesHref(locale)}
                  className="mt-5 inline-flex min-h-9 items-center rounded-lg px-3 text-xs font-semibold text-wb-accent hover:bg-wb-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wb-accent"
                >
                  {t("articleTags.allArticles")}
                </Link>
              }
            />
          )
        ) : (
          <ul className="mt-8 grid gap-3 sm:grid-cols-2 sm:gap-4">
            {articles.map((article) => (
              <li key={article.articleId}>
                <article className="group relative flex h-full min-w-0 flex-col rounded-2xl border border-wb-line bg-wb-panel p-5 transition-[border-color,box-shadow] duration-150 focus-within:border-wb-line-strong hover:border-wb-line-strong hover:bg-wb-hover/30 hover:shadow-sm">
                  <h2 className="line-clamp-3 break-words text-base font-bold leading-6 tracking-[-0.015em] text-wb-text">
                    <PublicArticleLinkV1
                      to={articleReaderHref({ articleId: article.publicSlug, locale })}
                      className="rounded after:absolute after:inset-0 after:rounded-2xl after:content-[''] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-wb-accent"
                    >
                      {article.title}
                    </PublicArticleLinkV1>
                  </h2>
                  <p className="mt-2 line-clamp-3 break-words text-[13px] leading-5 text-wb-muted">
                    {article.excerpt ?? t("publicArticles.articleFallback")}
                  </p>
                  {article.tags.length > 0 && (
                    <ul className="article-card-tags" aria-label={t("articleTags.label")}>
                      {article.tags.map((cardTag) => (
                        <li key={cardTag}>
                          <Link
                            className="article-tag article-tag-compact"
                            to={articleTagHref({ locale, tag: cardTag })}
                            aria-current={articleTagKeyV1(cardTag) === activeKey ? "page" : undefined}
                          >
                            <span aria-hidden="true">#</span>
                            {cardTag}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                  <span className="mt-auto pt-3"><PublicAuthorV1 author={article.author} locale={locale} /></span>
                </article>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

function EmptyDirectoryV3({
  action,
  description,
  icon,
  title,
}: Readonly<{
  action?: React.ReactNode;
  description: string;
  icon: React.ReactNode;
  title: string;
}>) {
  return (
    <section className="mt-14 py-10 text-center">
      <span className="mx-auto flex h-10 w-10 items-center justify-center text-wb-subtle">
        {icon}
      </span>
      <h2 className="mt-3 text-sm font-semibold">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-xs leading-6 text-wb-muted">
        {description}
      </p>
      {action}
    </section>
  );
}

export default PublicArticleDirectoryPage;

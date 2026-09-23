import React from "react";
import {
  ArrowRight,
  BookOpenText,
  PencilLine,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { ManagementPageHeaderV1 } from "@/components/management/ContentManagementV1";

import {
  articleEditorHref,
  articlePreviewHref,
  newArticleEditorHref,
} from "@/homeLinks";
import { localeFromPathname } from "@/localeRouting";
import {
  BrowserContentStore,
} from "@/studio/infrastructure/browser/BrowserContentStore";
import {
  createStudioSupabaseContentRepositoryV1,
  type StudioRemoteArticleSummaryV1,
  type StudioSummaryCursorV1,
  type StudioSupabaseContentRepositoryV1,
} from "@/studio/infrastructure/supabase/StudioSupabaseContentRepositoryV1";
import {
  articleHasTagV1,
  articleTagKeyV1,
  countArticleTagsV1,
  normalizeArticleTagV1,
} from "@/studio/application/article/StudioArticleTagsV1";

type ArticleLibraryItemV3 = Readonly<{
  articleId: string;
  version: number;
  visibility: "draft" | "public";
  title: string;
  tags: readonly string[];
  updatedAt: string | null;
}>;

type ArticleLibraryStatusFilterV3 = "all" | "public" | "draft";

/** Management filters live in the URL so returning from the editor keeps them. */
type ArticleLibraryFilterV3 = Readonly<{
  query: string;
  status: ArticleLibraryStatusFilterV3;
  /** A tag, or `null` for every tag. */
  tag: string | null;
  untagged: boolean;
}>;

export function readArticleLibraryFilterV3(
  params: URLSearchParams,
): ArticleLibraryFilterV3 {
  const status = params.get("status");
  const tag = normalizeArticleTagV1(params.get("tag") ?? "");
  const untagged = params.get("untagged") === "1";
  return Object.freeze({
    query: params.get("q") ?? "",
    status: status === "public" || status === "draft" ? status : "all",
    tag: untagged || tag.length === 0 ? null : tag,
    untagged,
  });
}

function articleLibraryFilterParamsV3(
  filter: ArticleLibraryFilterV3,
): URLSearchParams {
  const params = new URLSearchParams();
  if (filter.query.length > 0) params.set("q", filter.query);
  if (filter.status !== "all") params.set("status", filter.status);
  if (filter.tag !== null) params.set("tag", filter.tag);
  if (filter.untagged) params.set("untagged", "1");
  return params;
}

export function selectArticleLibraryItemsV3(
  items: readonly ArticleLibraryItemV3[],
  filter: ArticleLibraryFilterV3,
): readonly ArticleLibraryItemV3[] {
  const query = filter.query.trim().normalize("NFKC").toLowerCase();
  return items.filter((item) =>
    (filter.status === "all" || item.visibility === filter.status)
    && (filter.tag === null || articleHasTagV1(item.tags, filter.tag))
    && (!filter.untagged || item.tags.length === 0)
    && (query.length === 0 || [item.title, ...item.tags.map((tag) => "#" + tag)]
      .join(" ")
      .normalize("NFKC")
      .toLowerCase()
      .includes(query)));
}

/** Management needs every owned Article to count and filter tags honestly. */
async function listAllMyArticlesV3(
  repository: Pick<StudioSupabaseContentRepositoryV1, "listMyArticles">,
): Promise<readonly StudioRemoteArticleSummaryV1[]> {
  const items: StudioRemoteArticleSummaryV1[] = [];
  let cursor: StudioSummaryCursorV1 | null = null;
  for (let pageIndex = 0; pageIndex < 100; pageIndex += 1) {
    const page = await repository.listMyArticles({ limit: 100, cursor });
    items.push(...page.items);
    if (page.nextCursor === null) return items;
    cursor = page.nextCursor;
  }
  throw new Error("Article management exceeded 10,000 entries");
}

type ArticleLibraryStateV3 =
  | Readonly<{ kind: "loading" }>
  | Readonly<{ kind: "ready"; items: readonly ArticleLibraryItemV3[] }>
  | Readonly<{ kind: "error"; message: string }>;

export function ArticleLibraryPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const locale = localeFromPathname(location.pathname);
  const store = React.useMemo(() => new BrowserContentStore(), []);
  const remoteRepository = React.useMemo(
    createStudioSupabaseContentRepositoryV1,
    [],
  );
  const [state, setState] = React.useState<ArticleLibraryStateV3>({
    kind: "loading",
  });
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [deletingArticleId, setDeletingArticleId] = React.useState<string | null>(
    null,
  );
  const [searchParams, setSearchParams] = useSearchParams();
  const filter = readArticleLibraryFilterV3(searchParams);
  const setFilter = React.useCallback((patch: Partial<ArticleLibraryFilterV3>) => {
    setSearchParams(
      (current) => articleLibraryFilterParamsV3({
        ...readArticleLibraryFilterV3(current),
        ...patch,
      }),
      { replace: true },
    );
  }, [setSearchParams]);

  const readArticleItems = React.useCallback(async () => {
    const items: readonly ArticleLibraryItemV3[] = remoteRepository === null
      ? store.listArticles().map((article) => Object.freeze({
          articleId: article.articleId,
          version: article.draftVersion,
          visibility: article.visibility,
          title: article.title,
          tags: article.tags,
          updatedAt: null,
        }))
      : (await listAllMyArticlesV3(remoteRepository)).map((resource) =>
          Object.freeze({
            articleId: resource.articleId,
            version: resource.version,
            visibility: resource.visibility,
            title: resource.title,
            tags: resource.tags,
            updatedAt: resource.updatedAt,
          }));
    return Object.freeze([...items].sort((left, right) => {
      if (left.updatedAt !== null && right.updatedAt !== null) {
        return right.updatedAt.localeCompare(left.updatedAt);
      }
      if (left.updatedAt !== null) return -1;
      if (right.updatedAt !== null) return 1;
      return left.title.localeCompare(right.title);
    }));
  }, [remoteRepository, store]);

  React.useEffect(() => {
    let current = true;
    void readArticleItems().then((items) => {
      if (current) setState({ kind: "ready", items });
    }).catch((error) => {
      if (current) {
        setState({ kind: "error", message: errorMessageV3(error) });
      }
    });
    return () => {
      current = false;
    };
  }, [readArticleItems]);

  const deleteArticle = React.useCallback(async (article: ArticleLibraryItemV3) => {
    if (deletingArticleId !== null) return;
    if (!window.confirm(t("articleLibrary.deleteConfirm"))) return;
    setActionError(null);
    setDeletingArticleId(article.articleId);
    try {
      if (remoteRepository === null) {
        store.deleteArticle(article.articleId);
      } else {
        await remoteRepository.deleteArticle(
          article.articleId,
          article.version,
        );
      }
      setState({ kind: "ready", items: await readArticleItems() });
    } catch (error) {
      setActionError(errorMessageV3(error));
    } finally {
      setDeletingArticleId(null);
    }
  }, [deletingArticleId, readArticleItems, remoteRepository, store, t]);

  return (
    <div
      className="management-page"
      data-testid="article-library-v3"
    >
      <main>
        <ManagementPageHeaderV1
          title={t("management.manageArticles")}
          createHref={newArticleEditorHref(locale)}
          createLabel={t("articleLibrary.new")}
        />

        {actionError !== null && (
          <p
            className="mt-6 rounded-xl bg-wb-danger-soft p-4 text-sm text-wb-danger"
            role="alert"
          >
            {t("articleLibrary.deleteFailed", { message: actionError })}
          </p>
        )}

        {state.kind === "loading" ? (
          <p className="mt-8 text-sm text-wb-muted" role="status">
            {t("articleLibrary.loading")}
          </p>
        ) : state.kind === "error" ? (
          <p className="mt-8 rounded-xl bg-wb-danger-soft p-4 text-sm text-wb-danger" role="alert">
            {state.message}
          </p>
        ) : state.items.length === 0 ? (
          <section className="mt-12 py-12 text-center">
            <BookOpenText className="mx-auto h-7 w-7 text-wb-subtle" aria-hidden="true" />
            <h2 className="mt-4 text-sm font-semibold">
              {t("articleLibrary.emptyTitle")}
            </h2>
            <p className="mt-2 text-xs leading-6 text-wb-muted">
              {t("articleLibrary.emptyDescription")}
            </p>
          </section>
        ) : (
          <ArticleLibraryListV3
            items={state.items}
            filter={filter}
            locale={locale}
            deletingArticleId={deletingArticleId}
            onFilter={setFilter}
            onDelete={(article) => void deleteArticle(article)}
          />
        )}
      </main>
    </div>
  );
}

function ArticleLibraryListV3({
  items,
  filter,
  locale,
  deletingArticleId,
  onFilter,
  onDelete,
}: Readonly<{
  items: readonly ArticleLibraryItemV3[];
  filter: ArticleLibraryFilterV3;
  locale: "ja" | "en";
  deletingArticleId: string | null;
  onFilter: (patch: Partial<ArticleLibraryFilterV3>) => void;
  onDelete: (article: ArticleLibraryItemV3) => void;
}>) {
  const { t } = useTranslation();
  // The input owns its text so IME composition is never replaced mid-word by
  // the URL round-trip; the URL still receives every committed change.
  const [query, setQuery] = React.useState(filter.query);
  React.useEffect(() => {
    setQuery((current) => current === filter.query ? current : filter.query);
  }, [filter.query]);
  const tagCounts = React.useMemo(
    () => countArticleTagsV1(items.map((item) => item.tags), locale),
    [items, locale],
  );
  const untaggedCount = items.filter((item) => item.tags.length === 0).length;
  const statusCounts = {
    all: items.length,
    public: items.filter((item) => item.visibility === "public").length,
    draft: items.filter((item) => item.visibility === "draft").length,
  } as const;
  const activeTagKey = filter.tag === null ? null : articleTagKeyV1(filter.tag);
  const visible = selectArticleLibraryItemsV3(items, filter);
  const filtered = filter.query.trim().length > 0
    || filter.status !== "all"
    || filter.tag !== null
    || filter.untagged;
  const clear = () => onFilter({ query: "", status: "all", tag: null, untagged: false });
  const toggleTag = (tag: string) => onFilter(
    articleTagKeyV1(tag) === activeTagKey
      ? { tag: null, untagged: false }
      : { tag, untagged: false },
  );
  return (
    <>
      <div className="management-toolbar" data-testid="article-library-toolbar">
        <div className="management-toolbar-row">
          <label className="management-search">
            <Search aria-hidden="true" />
            <span className="sr-only">{t("articleTags.searchLabel")}</span>
            <input
              type="search"
              value={query}
              placeholder={t("articleTags.searchPlaceholder")}
              onChange={(event) => {
                const next = event.currentTarget.value;
                setQuery(next);
                if (!(event.nativeEvent as InputEvent).isComposing) onFilter({ query: next });
              }}
              onCompositionEnd={(event) => onFilter({ query: event.currentTarget.value })}
            />
          </label>
          <div
            className="management-segmented"
            role="group"
            aria-label={t("articleTags.statusFilterLabel")}
          >
            {(["all", "public", "draft"] as const).map((status) => (
              <button
                key={status}
                type="button"
                aria-pressed={filter.status === status}
                onClick={() => onFilter({ status })}
              >
                {status === "all"
                  ? t("articleTags.statusAll")
                  : status === "public"
                    ? t("articleLibrary.statusPublic")
                    : t("articleLibrary.statusDraft")}
                <small>{statusCounts[status]}</small>
              </button>
            ))}
          </div>
        </div>
        {tagCounts.length > 0 && (
          <div
            className="management-tag-filter"
            role="group"
            aria-label={t("articleTags.tagFilterLabel")}
          >
            {tagCounts.map((entry) => (
              <button
                key={entry.key}
                type="button"
                className="article-tag"
                aria-pressed={entry.key === activeTagKey}
                onClick={() => toggleTag(entry.tag)}
              >
                <span aria-hidden="true">#</span>
                {entry.tag}
                <small>{entry.count}</small>
              </button>
            ))}
            {untaggedCount > 0 && (
              <button
                type="button"
                className="article-tag article-tag-untagged"
                aria-pressed={filter.untagged}
                onClick={() => onFilter({ tag: null, untagged: !filter.untagged })}
              >
                {t("articleTags.untagged")}
                <small>{untaggedCount}</small>
              </button>
            )}
          </div>
        )}
      </div>
      {filtered && (
        <p className="management-result-count" role="status">
          {t("articleTags.resultCount", { count: visible.length })}
          <button type="button" onClick={clear}>
            <X aria-hidden="true" />
            {t("articleTags.clearFilters")}
          </button>
        </p>
      )}
      {visible.length === 0 ? (
        <section className="mt-10 py-10 text-center">
          <Search className="mx-auto h-6 w-6 text-wb-subtle" aria-hidden="true" />
          <h2 className="mt-3 text-sm font-semibold">
            {t("articleTags.noMatchTitle")}
          </h2>
          <button
            type="button"
            onClick={clear}
            className="mt-4 inline-flex min-h-9 items-center rounded-lg px-3 text-xs font-semibold text-wb-accent hover:bg-wb-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wb-accent"
          >
            {t("articleTags.clearFilters")}
          </button>
        </section>
      ) : (
        <ul className="management-list" aria-label={t("articleLibrary.saved")}>
          {visible.map((article) => {
            const { updatedAt } = article;
            return (
              <li key={article.articleId} className="management-row">
                <div className="management-row-content">
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-base font-semibold tracking-tight">
                      <Link to={articleEditorHref({ articleId: article.articleId, locale })} className="rounded hover:text-wb-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wb-accent">
                        {article.title || t("articleEditor.untitled")}
                      </Link>
                    </h2>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-5 text-wb-subtle">
                      <span className={article.visibility === "public"
                        ? "text-wb-accent"
                        : "text-wb-muted"}
                      >
                      {article.visibility === "public"
                          ? t("articleLibrary.statusPublic")
                          : t("articleLibrary.statusDraft")}
                      </span>
                      <span aria-hidden="true"> · </span>
                      {updatedAt === null ? (
                        <span>{t("articleLibrary.savedLocally")}</span>
                      ) : (
                        <time dateTime={updatedAt}>
                          {t("articleLibrary.updated", {
                            date: formatArticleUpdatedAtV3(updatedAt, locale),
                          })}
                        </time>
                      )}
                      <span aria-hidden="true">·</span>
                      <Link
                        to={articlePreviewHref({ articleId: article.articleId, locale })}
                        className="inline-flex min-h-8 items-center gap-1 rounded text-wb-muted underline-offset-4 hover:text-wb-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wb-accent"
                      >
                        {t("management.preview")}
                        <ArrowRight className="h-3 w-3" aria-hidden="true" />
                      </Link>
                    </div>
                    {article.tags.length > 0 && (
                      <ul className="management-row-tags" aria-label={t("articleTags.label")}>
                        {article.tags.map((tag) => (
                          <li key={tag}>
                            <button
                              type="button"
                              className="article-tag article-tag-compact"
                              aria-pressed={articleTagKeyV1(tag) === activeTagKey}
                              aria-label={t("articleTags.filterByTag", { tag })}
                              onClick={() => toggleTag(tag)}
                            >
                              <span aria-hidden="true">#</span>
                              {tag}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="management-row-actions">
                    <Link
                      to={articleEditorHref({ articleId: article.articleId, locale })}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-wb-muted transition-[color,background-color,transform] duration-150 hover:bg-wb-hover hover:text-wb-text active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wb-accent"
                    >
                      <PencilLine className="h-3.5 w-3.5" aria-hidden="true" />
                      {t("articleLibrary.edit")}
                    </Link>
                    <button
                      type="button"
                      onClick={() => onDelete(article)}
                      disabled={deletingArticleId !== null}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-wb-muted transition-[color,background-color,transform] duration-150 hover:bg-wb-danger-soft hover:text-wb-danger active:scale-[0.97] disabled:cursor-wait disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wb-danger"
                      aria-label={t("articleLibrary.delete")}
                      title={t("articleLibrary.delete")}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

function formatArticleUpdatedAtV3(value: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function errorMessageV3(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export default ArticleLibraryPage;

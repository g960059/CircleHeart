import type { PublicAuthorV1 } from "@/studio/application/profile/StudioPublicProfileV1";
import type { StudioArticleDraftV2 } from "@/studio/contracts/v2/article";
import {
  publicArticleExcerptV3,
} from "@/components/site/PublicCatalogPresentationV3";
import { BrowserContentStore } from "@/studio/infrastructure/browser/BrowserContentStore";
import {
  BrowserExperimentIndex,
  BROWSER_EXPERIMENT_RECORD_SCHEMA_ID,
  type BrowserExperimentRecord,
} from "@/studio/infrastructure/browser/BrowserExperimentIndex";
import {
  createStudioSupabaseContentRepositoryV1,
  type StudioSummaryCursorV1,
  type StudioSupabaseContentRepositoryV1,
} from "@/studio/infrastructure/supabase/StudioSupabaseContentRepositoryV1";
import {
  readStudioPublicHomeBootstrapV1,
  STUDIO_PUBLIC_HOME_DISCOVERY_LIMIT_V1,
  type StudioPublicArticleSummaryV1,
  type StudioPublicHomeBootstrapV1,
} from "@/studio/application/publication/StudioPublicHomeBootstrapV1";

export type PublicExperimentCatalogItemV3 = Readonly<{
  author?: PublicAuthorV1;
  record: BrowserExperimentRecord;
  snapshotId: string;
  modelId: string;
  scenarioCount: number;
}>;

export type PublicArticleCatalogItemV3 = Readonly<{
  author?: PublicAuthorV1;
  articleId: string;
  publicSlug: string;
  locale: string;
  title: string;
  tags: readonly string[];
  excerpt: string | null;
  publishedAt: string;
}>;

export type PublicCatalogV3 = Readonly<{
  articles: readonly PublicArticleCatalogItemV3[];
  experiments: readonly PublicExperimentCatalogItemV3[];
}>;

export function publicArticlesForLocaleV3(
  articles: readonly PublicArticleCatalogItemV3[],
  locale: string,
): readonly PublicArticleCatalogItemV3[] {
  return Object.freeze(articles.filter((article) => article.locale === locale));
}

type PublicCatalogContentPortV3 = Pick<
  BrowserContentStore,
  "listArticles" | "listSnapshots"
>;

type PublicCatalogExperimentIndexPortV3 = Pick<
  BrowserExperimentIndex,
  "list"
>;

/**
 * Read-only public projection of the pre-release browser repositories.
 * Backend catalog adoption replaces this adapter, not the Home/List UI.
 */
export function readPublicCatalogV3(
  store: PublicCatalogContentPortV3 = new BrowserContentStore(),
  experimentIndex: PublicCatalogExperimentIndexPortV3 =
    new BrowserExperimentIndex(),
): PublicCatalogV3 {
  const snapshotById = new Map(store.listSnapshots().map((snapshot) => [
    snapshot.snapshotId,
    snapshot,
  ]));
  const articles = Object.freeze(
    store.listArticles()
      .filter(({ visibility }) => visibility === "public")
      .map((article) => localPublicArticleSummaryV3(article))
      .sort((left, right) => left.title.localeCompare(right.title)),
  );
  const experiments = Object.freeze(
    experimentIndex.list()
      .flatMap((record) => {
        if (record.publishedSnapshotId === null) return [];
        const snapshot = snapshotById.get(record.publishedSnapshotId);
        if (snapshot === undefined) return [];
        return [Object.freeze({
          record,
          snapshotId: snapshot.snapshotId,
          modelId: snapshot.content.modelId,
          scenarioCount: snapshot.content.scenarios.length,
        })];
      })
      .sort((left, right) =>
        right.record.updatedAt.localeCompare(left.record.updatedAt)),
  );
  return Object.freeze({ articles, experiments });
}

/** Configured clients read the server publication pointers exclusively. */
export async function readPublicCatalogAsyncV3(): Promise<PublicCatalogV3> {
  const remote = createStudioSupabaseContentRepositoryV1();
  if (remote === null) return readPublicCatalogV3();
  const [articlePage, experimentPage] = await Promise.all([
    remote.listPublicArticles(),
    remote.listPublicExperiments(),
  ]);
  return publicCatalogFromPublicSummariesV3({
    articles: articlePage.items,
    experiments: experimentPage.items,
  });
}

/**
 * Every public Article of one locale, matching the server-rendered directory.
 * Tag pages filter this complete list, so they must not stop at one page.
 */
export async function readPublicArticleDirectoryAsyncV3(
  locale: string,
): Promise<readonly PublicArticleCatalogItemV3[]> {
  const remote = createStudioSupabaseContentRepositoryV1();
  if (remote === null) {
    return publicArticlesForLocaleV3(readPublicCatalogV3().articles, locale);
  }
  const articles: PublicArticleCatalogItemV3[] = [];
  let cursor: StudioSummaryCursorV1 | null = null;
  for (let pageIndex = 0; pageIndex < 100; pageIndex += 1) {
    const page = await remote.listPublicArticles({ limit: 100, cursor });
    articles.push(...page.items.filter((article) => article.locale === locale));
    if (page.nextCursor === null) return Object.freeze(articles);
    cursor = page.nextCursor;
  }
  throw new Error("Public Article directory exceeded 10,000 entries");
}

/** The SSR Home projection is authoritative for its initial client handoff. */
export function readPublicHomeCatalogBootstrapV3(
  locale: "ja" | "en",
  documentLike?: Pick<Document, "getElementById">,
): PublicCatalogV3 | null {
  const bootstrap = readStudioPublicHomeBootstrapV1(locale, documentLike);
  return bootstrap === null ? null : publicCatalogFromPublicSummariesV3(bootstrap);
}

export async function readPublicHomeCatalogAsyncV3(
  locale: "ja" | "en",
): Promise<PublicCatalogV3> {
  const bootstrap = readPublicHomeCatalogBootstrapV3(locale);
  if (bootstrap !== null) return bootstrap;
  const remote = createStudioSupabaseContentRepositoryV1();
  if (remote === null) return readPublicCatalogV3();
  return readPublicHomeCatalogFromRemoteV3(locale, remote);
}

type PublicHomeCatalogRemotePortV3 = Pick<
  StudioSupabaseContentRepositoryV1,
  "listPublicArticles" | "listPublicExperiments"
>;

/**
 * Matches the SSR Home discovery projection after an in-app locale change.
 * Public summaries are globally ordered, so finding a sparse locale must page
 * until enough matching Articles are found rather than filter one global page.
 */
export async function readPublicHomeCatalogFromRemoteV3(
  locale: "ja" | "en",
  remote: PublicHomeCatalogRemotePortV3,
): Promise<PublicCatalogV3> {
  const [articles, experimentPage] = await Promise.all([
    listLocalizedHomeArticlesV3(remote, locale),
    remote.listPublicExperiments({
      limit: STUDIO_PUBLIC_HOME_DISCOVERY_LIMIT_V1,
    }),
  ]);
  return publicCatalogFromPublicSummariesV3({
    articles,
    experiments: experimentPage.items,
  });
}

async function listLocalizedHomeArticlesV3(
  remote: Pick<StudioSupabaseContentRepositoryV1, "listPublicArticles">,
  locale: "ja" | "en",
): Promise<readonly StudioPublicArticleSummaryV1[]> {
  const articles: StudioPublicArticleSummaryV1[] = [];
  let cursor: StudioSummaryCursorV1 | null = null;
  for (let pageIndex = 0; pageIndex < 100; pageIndex += 1) {
    const page = await remote.listPublicArticles({ limit: 100, cursor });
    for (const article of page.items) {
      if (article.locale === locale) articles.push(article);
      if (articles.length === STUDIO_PUBLIC_HOME_DISCOVERY_LIMIT_V1) {
        return Object.freeze(articles);
      }
    }
    if (page.nextCursor === null) return Object.freeze(articles);
    cursor = page.nextCursor;
  }
  throw new Error("Public Home Article discovery exceeded 10,000 entries");
}

function publicCatalogFromPublicSummariesV3(input: Pick<
  StudioPublicHomeBootstrapV1,
  "articles" | "experiments"
>): PublicCatalogV3 {
  return Object.freeze({
    articles: input.articles,
    experiments: Object.freeze(input.experiments.map((resource) => Object.freeze({
      record: Object.freeze({
        schemaId: BROWSER_EXPERIMENT_RECORD_SCHEMA_ID,
        experimentId: resource.experimentId,
        title: resource.title,
        createdAt: resource.publishedAt,
        updatedAt: resource.publishedAt,
        publishedSnapshotId: resource.snapshotId,
        publicSlug: resource.publicSlug,
      }),
      ...(resource.author ? { author: resource.author } : {}),
      snapshotId: resource.snapshotId,
      modelId: resource.modelId,
      scenarioCount: resource.scenarioCount,
    }))),
  });
}

function localPublicArticleSummaryV3(
  article: StudioArticleDraftV2,
): PublicArticleCatalogItemV3 {
  return Object.freeze({
    articleId: article.articleId,
    // The browser-only fallback has no publication alias table. Its durable
    // Article identity is therefore also the only reversible Reader route.
    publicSlug: article.articleId,
    locale: article.locale,
    title: article.title,
    tags: article.tags,
    excerpt: publicArticleExcerptV3(article.blocks),
    // Browser fallback has no publication clock; keep its immutable content
    // usable without manufacturing backend provenance.
    publishedAt: new Date(0).toISOString(),
  });
}

import { describe, expect, it } from "vitest";

import {
  publicArticlesForLocaleV3,
  readPublicCatalogV3,
  readPublicHomeCatalogBootstrapV3,
  readPublicHomeCatalogFromRemoteV3,
} from "@/components/site/PublicCatalogV3";
import {
  STUDIO_PUBLIC_HOME_BOOTSTRAP_V1_ELEMENT_ID,
  STUDIO_PUBLIC_HOME_BOOTSTRAP_V1_SCHEMA_ID,
} from "@/studio/application/publication/StudioPublicHomeBootstrapV1";
import {
  publicArticleExcerptV3,
} from "@/components/site/PublicCatalogPresentationV3";
import type {
  StudioArticleBlockV2,
  StudioArticleDraftV2,
} from "@/studio/contracts/v2/article";
import type { ExperimentSnapshotV2 } from "@/studio/contracts/v2/content";
import type { BrowserExperimentRecord } from "@/studio/infrastructure/browser/BrowserExperimentIndex";

describe("public catalog V3", () => {
  it("exposes public Articles and valid published Snapshot pointers only", () => {
    const publicArticle = {
      schemaId: "circleheart-studio-article-draft-v2",
      tags: [],
      articleId: "article-public",
      draftVersion: 0,
      locale: "en",
      title: "Public",
      visibility: "public",
      blocks: [],
    } as StudioArticleDraftV2;
    const draftArticle = {
      schemaId: "circleheart-studio-article-draft-v2",
      tags: [],
      articleId: "article-draft",
      draftVersion: 0,
      locale: "en",
      title: "Draft",
      visibility: "draft",
      blocks: [],
    } as StudioArticleDraftV2;
    const publication = {
      snapshotId: "snapshot-publication",
      content: {
        modelId: "model/test",
        scenarios: [{ scenarioId: "scenario/test" }],
      },
    } as unknown as ExperimentSnapshotV2;
    const records = [
      experimentRecord("experiment-public", publication.snapshotId),
      experimentRecord("experiment-draft", null),
      experimentRecord("experiment-missing-snapshot", "snapshot/missing"),
    ];

    const catalog = readPublicCatalogV3(
      {
        listArticles: () => [draftArticle, publicArticle],
        listSnapshots: () => [publication],
      },
      { list: () => records },
    );

    expect(catalog.articles.map(({ articleId }) => articleId)).toEqual([
      "article-public",
    ]);
    expect(catalog.articles.map(({ publicSlug }) => publicSlug)).toEqual([
      "article-public",
    ]);
    expect(catalog.experiments.map(({ record }) => record.experimentId))
      .toEqual(["experiment-public"]);
  });

  it("uses authored prose for previews instead of storage identity", () => {
    const blocks: readonly StudioArticleBlockV2[] = [
      { blockId: "heading/internal", kind: "heading", level: 2, text: "Heading" },
      {
        blockId: "experiment/internal",
        kind: "experiment",
        placement: {} as never,
      },
      { blockId: "paragraph/internal", kind: "paragraph", text: "  Useful summary.  " },
    ];

    expect(publicArticleExcerptV3(blocks)).toBe("Useful summary.");
    expect(publicArticleExcerptV3(blocks.slice(0, 1))).toBe("Heading");
    expect(publicArticleExcerptV3(blocks.slice(1, 2))).toBeNull();
  });

  it("projects public Articles for the requested content locale", () => {
    const articles = [
      { articleId: "article-ja", locale: "ja" },
      { articleId: "article-en", locale: "en" },
      { articleId: "article-ja-two", locale: "ja" },
    ] as unknown as Parameters<typeof publicArticlesForLocaleV3>[0];

    expect(publicArticlesForLocaleV3(articles, "ja").map(({ articleId }) => articleId))
      .toEqual(["article-ja", "article-ja-two"]);
    expect(publicArticlesForLocaleV3(articles, "en").map(({ articleId }) => articleId))
      .toEqual(["article-en"]);
  });

  it("projects the SSR Home bootstrap without a second catalog request", () => {
    const bootstrap = JSON.stringify({
      schemaId: STUDIO_PUBLIC_HOME_BOOTSTRAP_V1_SCHEMA_ID,
      locale: "ja",
      articles: [{
        articleId: "article/bootstrap",
        locale: "ja",
        title: "SSRの記事",
        excerpt: "最初のHTMLから読めます。",
        tags: [],
        publicSlug: "ssr-article",
        publishedAt: "2026-08-14T00:00:00.000Z",
      }],
      experiments: [{
        experimentId: "experiment/bootstrap",
        title: "SSRのシミュレーション",
        publicSlug: "ssr-simulation",
        publishedAt: "2026-08-14T01:00:00.000Z",
        snapshotId: "snapshot/bootstrap",
        modelId: "model/bootstrap",
        scenarioCount: 3,
      }],
    });
    const documentLike = {
      getElementById: (id: string) =>
        id === STUDIO_PUBLIC_HOME_BOOTSTRAP_V1_ELEMENT_ID
          ? { textContent: bootstrap }
          : null,
    } as Pick<Document, "getElementById">;

    const catalog = readPublicHomeCatalogBootstrapV3("ja", documentLike);
    expect(catalog?.articles[0]).toMatchObject({
      publicSlug: "ssr-article",
      title: "SSRの記事",
    });
    expect(catalog?.experiments[0]).toMatchObject({
      snapshotId: "snapshot/bootstrap",
      scenarioCount: 3,
      record: {
        experimentId: "experiment/bootstrap",
        publishedSnapshotId: "snapshot/bootstrap",
        publicSlug: "ssr-simulation",
      },
    });
    expect(readPublicHomeCatalogBootstrapV3("en", documentLike)).toBeNull();
  });

  it("pages past other locales when an in-app locale change has no bootstrap", async () => {
    const cursor = Object.freeze({
      timestamp: "2026-08-13T00:00:00.000Z",
      id: "article-ja-100",
    });
    const articleRequests: unknown[] = [];
    const experimentRequests: unknown[] = [];
    const catalog = await readPublicHomeCatalogFromRemoteV3("en", {
      listPublicArticles: async (request = {}) => {
        articleRequests.push(request);
        if (request.cursor === null || request.cursor === undefined) {
          return Object.freeze({
            items: Object.freeze(Array.from({ length: 100 }, (_, index) =>
              publicArticleSummary(`article-ja-${index}`, "ja"))),
            nextCursor: cursor,
          });
        }
        expect(request.cursor).toEqual(cursor);
        return Object.freeze({
          items: Object.freeze([publicArticleSummary("article-en", "en")]),
          nextCursor: null,
        });
      },
      listPublicExperiments: async (request = {}) => {
        experimentRequests.push(request);
        return Object.freeze({ items: Object.freeze([]), nextCursor: null });
      },
    });

    expect(catalog.articles.map(({ articleId }) => articleId))
      .toEqual(["article-en"]);
    expect(articleRequests).toHaveLength(2);
    expect(articleRequests).toMatchObject([
      { limit: 100, cursor: null },
      { limit: 100, cursor },
    ]);
    expect(experimentRequests).toEqual([{ limit: 50 }]);
  });
});

function publicArticleSummary(articleId: string, locale: "ja" | "en") {
  return Object.freeze({
    articleId,
    locale,
    title: articleId,
    excerpt: null,
    tags: [],
    publicSlug: `${articleId}-slug`,
    publishedAt: "2026-08-13T00:00:00.000Z",
  });
}

function experimentRecord(
  experimentId: string,
  publishedSnapshotId: string | null,
): BrowserExperimentRecord {
  return {
    schemaId: "circleheart-studio-browser-experiment-record-v5",
    experimentId,
    title: experimentId,
    createdAt: "2026-08-05T00:00:00.000Z",
    updatedAt: "2026-08-05T00:00:00.000Z",
    publishedSnapshotId,
  };
}

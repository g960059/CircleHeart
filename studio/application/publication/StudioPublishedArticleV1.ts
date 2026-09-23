import { assertArticleReadingReadyV1 } from "@/studio/application/article/StudioArticleReadingV1";
import {
  validateStudioArticleDraftV2,
} from "@/studio/application/authoring/StudioArticleDataV2";
import {
  STUDIO_ARTICLE_DRAFT_V2_SCHEMA_ID,
  type StudioArticleBlockV2,
  type StudioArticleDraftV2,
} from "@/studio/contracts/v2/article";
import {
  cloneAndFreezeStudioJson,
} from "@/domain/json/CanonicalJson";

export const STUDIO_PUBLISHED_ARTICLE_V1_SCHEMA_ID =
  "circleheart-studio-published-article-v1" as const;

/**
 * Anonymous, immutable projection of one live Article publication.
 *
 * The public route never masquerades as a mutable draft. `articleContentId`
 * binds HTML, Markdown, JSON and cache validators to the same immutable body.
 */
export type StudioPublishedArticleV1 = Readonly<{
  schemaId: typeof STUDIO_PUBLISHED_ARTICLE_V1_SCHEMA_ID;
  articleId: string;
  articleContentId: string;
  publicSlug: string;
  locale: "ja" | "en";
  title: string;
  /** Tags of the published revision; never the owner's newer draft tags. */
  tags: readonly string[];
  blocks: readonly StudioArticleBlockV2[];
  publishedAt: string;
  updatedAt: string;
}>;

const UUID_V1 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const UUID_ROUTE_SHAPE_V1 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const PUBLIC_SLUG_V1 = /^[a-z0-9][a-z0-9-]{2,95}$/;
const UTC_TIMESTAMP_V1 =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?Z$/;

export function validateStudioPublishedArticleV1(
  value: unknown,
): StudioPublishedArticleV1 {
  const detached = cloneAndFreezeStudioJson<StudioPublishedArticleV1>(value);
  recordV1(detached, "$.publishedArticle");
  exactKeysV1(detached, [
    "articleContentId",
    "articleId",
    "blocks",
    "locale",
    "publicSlug",
    "publishedAt",
    "schemaId",
    "tags",
    "title",
    "updatedAt",
  ], "$.publishedArticle");
  if (detached.schemaId !== STUDIO_PUBLISHED_ARTICLE_V1_SCHEMA_ID) {
    failV1("$.publishedArticle.schemaId", "schema identity mismatch");
  }
  uuidV1(detached.articleId, "$.publishedArticle.articleId");
  uuidV1(detached.articleContentId, "$.publishedArticle.articleContentId");
  if (
    !PUBLIC_SLUG_V1.test(detached.publicSlug)
    || UUID_ROUTE_SHAPE_V1.test(detached.publicSlug)
  ) {
    failV1("$.publishedArticle.publicSlug", "must be a canonical public slug");
  }
  if (detached.locale !== "ja" && detached.locale !== "en") {
    failV1("$.publishedArticle.locale", "must be ja or en");
  }
  timestampV1(detached.publishedAt, "$.publishedArticle.publishedAt");
  timestampV1(detached.updatedAt, "$.publishedArticle.updatedAt");
  if (Date.parse(detached.updatedAt) < Date.parse(detached.publishedAt)) {
    failV1("$.publishedArticle.updatedAt", "must not precede publishedAt");
  }

  // Reuse the complete portable Article validator so every nested block and
  // Placement obeys the exact same contract as the interactive Reader.
  validateStudioArticleDraftV2({
    schemaId: STUDIO_ARTICLE_DRAFT_V2_SCHEMA_ID,
    articleId: detached.articleId,
    draftVersion: 0,
    visibility: "public",
    locale: detached.locale,
    title: detached.title,
    tags: detached.tags,
    blocks: detached.blocks,
  });
  assertArticleReadingReadyV1(detached.blocks);
  return detached;
}

/** Shared client presentation without introducing mutable publication state. */
export function publishedArticleDraftProjectionV1(
  article: StudioPublishedArticleV1,
): StudioArticleDraftV2 {
  return validateStudioArticleDraftV2({
    schemaId: STUDIO_ARTICLE_DRAFT_V2_SCHEMA_ID,
    articleId: article.articleId,
    draftVersion: 0,
    visibility: "public",
    locale: article.locale,
    title: article.title,
    tags: article.tags,
    blocks: article.blocks,
  });
}

function exactKeysV1(
  value: Record<string, unknown>,
  expected: readonly string[],
  path: string,
): void {
  const actual = Object.keys(value).sort();
  const canonical = [...expected].sort();
  if (
    actual.length !== canonical.length
    || actual.some((key, index) => key !== canonical[index])
  ) {
    failV1(path, `keys must be exactly ${canonical.join(", ")}`);
  }
}

function recordV1(
  value: unknown,
  path: string,
): asserts value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    failV1(path, "must be an object");
  }
}

function uuidV1(value: unknown, path: string): asserts value is string {
  if (typeof value !== "string" || !UUID_V1.test(value)) {
    failV1(path, "must be a lowercase UUID");
  }
}

function timestampV1(value: unknown, path: string): asserts value is string {
  if (
    typeof value !== "string"
    || !UTC_TIMESTAMP_V1.test(value)
    || !Number.isFinite(Date.parse(value))
  ) {
    failV1(path, "must be a valid ISO-8601 UTC timestamp");
  }
}

function failV1(path: string, message: string): never {
  throw new Error(`Published Article V1 rejected ${path}: ${message}`);
}

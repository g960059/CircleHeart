import {
  validatePublicAuthorV1,
  type PublicAuthorV1,
} from "@/studio/application/profile/StudioPublicProfileV1";
import {
  validatePublicCourseV1,
  type PublicCourseV1,
} from "@/studio/application/course/StudioCourseV1";
import { articleTagsV1 } from "@/studio/application/article/StudioArticleTagsV1";
export const STUDIO_PUBLIC_HOME_BOOTSTRAP_V1_SCHEMA_ID =
  "circleheart-public-home-bootstrap-v1";
export const STUDIO_PUBLIC_HOME_BOOTSTRAP_V1_ELEMENT_ID =
  "circleheart-public-home-bootstrap-v1";
export const STUDIO_PUBLIC_HOME_DISCOVERY_LIMIT_V1 = 50;

export type StudioPublicExperimentSummaryV1 = Readonly<{
  author?: PublicAuthorV1;
  experimentId: string;
  title: string;
  publicSlug: string;
  publishedAt: string;
  snapshotId: string;
  modelId: string;
  scenarioCount: number;
}>;

export type StudioPublicArticleSummaryV1 = Readonly<{
  author?: PublicAuthorV1;
  articleId: string;
  locale: string;
  title: string;
  /** Tags of the live published revision. */
  tags: readonly string[];
  excerpt: string | null;
  publicSlug: string;
  publishedAt: string;
}>;

export type StudioPublicHomeBootstrapV1 = Readonly<{
  schemaId: typeof STUDIO_PUBLIC_HOME_BOOTSTRAP_V1_SCHEMA_ID;
  locale: "ja" | "en";
  articles: readonly StudioPublicArticleSummaryV1[];
  experiments: readonly StudioPublicExperimentSummaryV1[];
  courses?: readonly PublicCourseV1[];
  featuredCourseIds?: readonly string[];
}>;

export function validateStudioPublicHomeBootstrapV1(
  value: unknown,
): StudioPublicHomeBootstrapV1 {
  const root = recordV1(value, "$home");
  exactKeysV1(
    root,
    [
      "schemaId",
      "locale",
      "articles",
      "experiments",
      ...("courses" in root ? ["courses"] : []),
      ...("featuredCourseIds" in root ? ["featuredCourseIds"] : []),
    ],
    "$home",
  );
  if (root.schemaId !== STUDIO_PUBLIC_HOME_BOOTSTRAP_V1_SCHEMA_ID) {
    failV1("$home.schemaId", "is unsupported");
  }
  const locale = localeV1(root.locale, "$home.locale");
  const articles = arrayV1(root.articles, "$home.articles");
  const experiments = arrayV1(root.experiments, "$home.experiments");
  if (
    articles.length > STUDIO_PUBLIC_HOME_DISCOVERY_LIMIT_V1 ||
    experiments.length > STUDIO_PUBLIC_HOME_DISCOVERY_LIMIT_V1
  ) {
    failV1("$home", "contains too many discovery items");
  }
  const courses =
    root.courses === undefined
      ? undefined
      : arrayV1(root.courses, "$home.courses").map(validatePublicCourseV1);
  if (
    courses &&
    (courses.length > 50 || courses.some((c) => c.locale !== locale))
  )
    failV1("$home.courses", "must fit the localized discovery list");
  const featuredCourseIds =
    root.featuredCourseIds === undefined
      ? undefined
      : arrayV1(root.featuredCourseIds, "$home.featuredCourseIds");
  if (
    featuredCourseIds &&
    (featuredCourseIds.length > 50 ||
      new Set(featuredCourseIds).size !== featuredCourseIds.length ||
      featuredCourseIds.some(
        (id) =>
          typeof id !== "string" || !courses?.some((c) => c.courseId === id),
      ))
  )
    failV1(
      "$home.featuredCourseIds",
      "must identify unique courses in this projection",
    );
  return Object.freeze({
    ...(featuredCourseIds === undefined
      ? {}
      : { featuredCourseIds: Object.freeze(featuredCourseIds as string[]) }),
    ...(courses === undefined ? {} : { courses: Object.freeze(courses) }),
    schemaId: STUDIO_PUBLIC_HOME_BOOTSTRAP_V1_SCHEMA_ID,
    locale,
    articles: Object.freeze(
      articles.map((entry, index) =>
        articleSummaryV1(entry, locale, `$home.articles[${index}]`),
      ),
    ),
    experiments: Object.freeze(
      experiments.map((entry, index) =>
        experimentSummaryV1(entry, `$home.experiments[${index}]`),
      ),
    ),
  });
}

/**
 * Carries the anonymous server projection into the client without a second
 * catalog request. Escaping '<' keeps authored text from closing the inert
 * JSON script element.
 */
export function renderStudioPublicHomeBootstrapV1(
  bootstrap: StudioPublicHomeBootstrapV1,
): string {
  const validated = validateStudioPublicHomeBootstrapV1(bootstrap);
  const json = JSON.stringify(validated).replaceAll("<", "\\u003c");
  return `<script id="${STUDIO_PUBLIC_HOME_BOOTSTRAP_V1_ELEMENT_ID}" type="application/json">${json}</script>`;
}

export function readStudioPublicHomeBootstrapV1(
  locale: "ja" | "en",
  documentLike:
    | Pick<Document, "getElementById">
    | undefined = typeof document === "undefined" ? undefined : document,
): StudioPublicHomeBootstrapV1 | null {
  if (documentLike === undefined) return null;
  const element = documentLike.getElementById(
    STUDIO_PUBLIC_HOME_BOOTSTRAP_V1_ELEMENT_ID,
  );
  if (element === null || element.textContent === null) return null;
  try {
    const bootstrap = validateStudioPublicHomeBootstrapV1(
      JSON.parse(element.textContent) as unknown,
    );
    return bootstrap.locale === locale ? bootstrap : null;
  } catch {
    return null;
  }
}

function articleSummaryV1(
  value: unknown,
  locale: "ja" | "en",
  path: string,
): StudioPublicArticleSummaryV1 {
  const entry = recordV1(value, path);
  exactKeysV1(
    entry,
    [
      "articleId",
      "locale",
      "title",
      "tags",
      "excerpt",
      "publicSlug",
      "publishedAt",
      ...(entry.author === undefined ? [] : ["author"]),
    ],
    path,
  );
  if (entry.locale !== locale) {
    failV1(`${path}.locale`, "must match the Home locale");
  }
  return Object.freeze({
    ...(entry.author === undefined
      ? {}
      : { author: validatePublicAuthorV1(entry.author) }),
    articleId: stringV1(entry.articleId, `${path}.articleId`),
    locale,
    title: stringV1(entry.title, `${path}.title`),
    tags: tagsV1(entry.tags, `${path}.tags`),
    excerpt: nullableStringV1(entry.excerpt, `${path}.excerpt`),
    publicSlug: stringV1(entry.publicSlug, `${path}.publicSlug`),
    publishedAt: timestampV1(entry.publishedAt, `${path}.publishedAt`),
  });
}

function experimentSummaryV1(
  value: unknown,
  path: string,
): StudioPublicExperimentSummaryV1 {
  const entry = recordV1(value, path);
  exactKeysV1(
    entry,
    [
      "experimentId",
      "title",
      "publicSlug",
      "publishedAt",
      "snapshotId",
      "modelId",
      "scenarioCount",
      ...(entry.author === undefined ? [] : ["author"]),
    ],
    path,
  );
  const scenarioCount = entry.scenarioCount;
  if (!Number.isInteger(scenarioCount) || (scenarioCount as number) < 0) {
    failV1(`${path}.scenarioCount`, "must be a nonnegative integer");
  }
  return Object.freeze({
    ...(entry.author === undefined
      ? {}
      : { author: validatePublicAuthorV1(entry.author) }),
    experimentId: stringV1(entry.experimentId, `${path}.experimentId`),
    title: stringV1(entry.title, `${path}.title`),
    publicSlug: stringV1(entry.publicSlug, `${path}.publicSlug`),
    publishedAt: timestampV1(entry.publishedAt, `${path}.publishedAt`),
    snapshotId: stringV1(entry.snapshotId, `${path}.snapshotId`),
    modelId: stringV1(entry.modelId, `${path}.modelId`),
    scenarioCount: scenarioCount as number,
  });
}

function tagsV1(value: unknown, path: string): readonly string[] {
  try {
    return articleTagsV1(value, path);
  } catch (error) {
    failV1(path, error instanceof Error ? error.message : String(error));
  }
}

function recordV1(value: unknown, path: string): Record<string, unknown> {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    failV1(path, "must be a plain object");
  }
  return value as Record<string, unknown>;
}

function arrayV1(value: unknown, path: string): readonly unknown[] {
  if (
    !Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Array.prototype
  ) {
    failV1(path, "must be an array");
  }
  return value;
}

function exactKeysV1(
  value: Record<string, unknown>,
  expected: readonly string[],
  path: string,
): void {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (
    actual.length !== wanted.length ||
    actual.some((key, index) => key !== wanted[index])
  ) {
    failV1(path, `keys must be exactly ${wanted.join(", ")}`);
  }
}

function localeV1(value: unknown, path: string): "ja" | "en" {
  if (value !== "ja" && value !== "en") failV1(path, "must be ja or en");
  return value;
}

function stringV1(value: unknown, path: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    failV1(path, "must be a nonempty string");
  }
  return value;
}

function nullableStringV1(value: unknown, path: string): string | null {
  if (value === null) return null;
  return stringV1(value, path);
}

function timestampV1(value: unknown, path: string): string {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) {
    failV1(path, "must be an ISO-8601 timestamp");
  }
  return value;
}

function failV1(path: string, message: string): never {
  throw new Error(`Public Home bootstrap rejected ${path}: ${message}`);
}

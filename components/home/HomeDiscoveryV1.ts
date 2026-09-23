import type { PublicAuthorV1 } from "@/studio/application/profile/StudioPublicProfileV1";
import type { PublicCourseV1 } from "@/studio/application/course/StudioCourseV1";
import type { StudioPublicHomeBootstrapV1 } from "@/studio/application/publication/StudioPublicHomeBootstrapV1";
import { publishedExperimentHref } from "@/homeLinks";
import {
  articleHasTagV1,
  countArticleTagsV1,
  type StudioArticleTagCountV1,
} from "@/studio/application/article/StudioArticleTagsV1";

export type HomeKindV1 = "course" | "article" | "experiment";
export type HomeItemV1 = Readonly<{
  key: string;
  id: string;
  kind: HomeKindV1;
  title: string;
  description: string;
  href: string;
  publishedAt: string;
  author?: PublicAuthorV1;
  authorName?: string;
  course?: PublicCourseV1;
  /** Published Article tags; other kinds carry none. */
  tags: readonly string[];
  featured: boolean;
}>;
export function homeItemsV1(
  data: StudioPublicHomeBootstrapV1,
): readonly HomeItemV1[] {
  const locale = data.locale;
  const featured = new Set(data.featuredCourseIds ?? []);
  const make = (item: HomeItemV1) => item;
  return [
    ...(data.courses ?? []).map((c) =>
      make({
        key: "course:" + c.courseId,
        id: c.courseId,
        kind: "course",
        title: c.title,
        description: c.description,
        href: `/${locale}/courses/${encodeURIComponent(c.courseId)}`,
        publishedAt: c.updatedAt,
        author: c.author,
        authorName: c.authorName,
        course: c,
        tags: [],
        featured: featured.has(c.courseId),
      }),
    ),
    ...data.articles.map((a) =>
      make({
        key: "article:" + a.articleId,
        id: a.articleId,
        kind: "article",
        title: a.title,
        description: a.excerpt ?? "",
        href: `/${locale}/articles/${encodeURIComponent(a.publicSlug)}`,
        publishedAt: a.publishedAt,
        author: a.author,
        tags: a.tags,
        featured: false,
      }),
    ),
    ...data.experiments.map((e) =>
      make({
        key: "experiment:" + e.experimentId,
        id: e.experimentId,
        kind: "experiment",
        title: e.title,
        description: "",
        href: publishedExperimentHref({ locale, publicSlug: e.publicSlug }),
        publishedAt: e.publishedAt,
        author: e.author,
        tags: [],
        featured: false,
      }),
    ),
  ];
}
export type HomeFilterV1 = Readonly<{
  kind: HomeKindV1 | "all";
  sort: "recommended" | "new";
  savedOnly: boolean;
  query: string;
  /** Narrows discovery to Articles carrying this tag (case-insensitive). */
  tag: string | null;
}>;
export const HOME_FILTER_V1: HomeFilterV1 = {
  kind: "all",
  sort: "recommended",
  savedOnly: false,
  query: "",
  tag: null,
};
export const HOME_TOPIC_LIMIT_V1 = 12;
/** Topics come from the loaded Article summaries: no extra request, no fake popularity. */
export function homeTopicsV1(
  items: readonly HomeItemV1[],
  locale: "ja" | "en",
): readonly StudioArticleTagCountV1[] {
  return countArticleTagsV1(
    items.filter((item) => item.kind === "article").map((item) => item.tags),
    locale,
  ).slice(0, HOME_TOPIC_LIMIT_V1);
}
/** Course membership does not remove an article's direct discovery entry. */
export function selectHomeItemsV1(
  items: readonly HomeItemV1[],
  filter: HomeFilterV1,
  saved: ReadonlySet<string> = new Set(),
): readonly HomeItemV1[] {
  const query = filter.query.trim().normalize("NFKC").toLocaleLowerCase();
  const found = items.filter(
    (item) =>
      (filter.kind === "all" || item.kind === filter.kind) &&
      (!filter.savedOnly || saved.has(item.key)) &&
      (filter.tag === null || articleHasTagV1(item.tags, filter.tag)) &&
      (!query ||
        [
          item.title,
          item.description,
          item.author?.displayName,
          item.authorName,
          ...item.tags.map((tag) => "#" + tag),
          ...(item.course?.entries
            .filter((e) => e.available)
            .map((e) => e.title) ?? []),
        ]
          .join(" ")
          .normalize("NFKC")
          .toLocaleLowerCase()
          .includes(query)),
  );
  const recent = (a: HomeItemV1, b: HomeItemV1) =>
    Date.parse(b.publishedAt) - Date.parse(a.publishedAt) ||
    a.key.localeCompare(b.key);
  if (filter.sort !== "recommended") return found.sort(recent);
  // Keep editorial course order, then interleave formats without fake popularity.
  const pinned = found.filter((i) => i.featured);
  const rest = found.filter((i) => !i.featured).sort(recent);
  const queues = (["experiment", "article", "course"] as const).map((k) =>
    rest.filter((i) => i.kind === k),
  );
  const result = [...pinned];
  while (queues.some((q) => q.length))
    for (const queue of queues) {
      const item = queue.shift();
      if (item) result.push(item);
    }
  return result;
}
export function readHomeBookmarksV1(
  accountId: string | null,
  storage?: Pick<Storage, "getItem">,
  fallback: ReadonlySet<string> = new Set(),
): ReadonlySet<string> {
  if (!accountId) return new Set();
  if (!storage) return fallback;
  try {
    const values: unknown = JSON.parse(
      storage.getItem("circleheart.home.saved.v1:" + accountId) ?? "[]",
    );
    return new Set(
      Array.isArray(values)
        ? values
            .filter(
              (s): s is string =>
                typeof s === "string" &&
                /^(course|article|experiment):.{1,200}$/.test(s),
            )
            .slice(0, 500)
        : [],
    );
  } catch {
    return fallback;
  }
}
export function writeHomeBookmarksV1(
  accountId: string,
  values: ReadonlySet<string>,
  storage: Pick<Storage, "setItem">,
): boolean {
  try {
    storage.setItem(
      "circleheart.home.saved.v1:" + accountId,
      JSON.stringify([...values].slice(0, 500)),
    );
    return true;
  } catch {
    return false;
  }
}

import type { PublicCourseV1 } from "../../studio/application/course/StudioCourseV1";
import type { StudioPublishedArticleV1 } from "../../studio/application/publication/StudioPublishedArticleV1";
export const courseFixtureV1: PublicCourseV1 = {
  courseId: "a0000000-0000-4000-8000-000000000001",
  ownerId: "a0000000-0000-4000-8000-000000000002",
  title: "循環動態を、実験でつなぐ",
  description: "一拍の観察から全身の循環へ。",
  audience: "循環生理の基礎を学んだ方",
  locale: "ja",
  authorName: "Course editor",
  updatedAt: "2026-09-13T00:00:00Z",
  entries: [
    {
      articleId: "a0000000-0000-4000-8000-000000000010",
      title: "一拍を読む",
      publicSlug: "read-a-beat",
      available: true,
      authorName: "Author A",
    },
    {
      articleId: "a0000000-0000-4000-8000-000000000011",
      title: null,
      publicSlug: null,
      available: false,
      authorName: null,
    },
    {
      articleId: "a0000000-0000-4000-8000-000000000012",
      title: "循環をつなぐ",
      publicSlug: "connect-the-circulation",
      available: true,
      authorName: "Author B",
    },
  ],
};
export function courseArticleFixtureV1(index = 0): StudioPublishedArticleV1 {
  const e = courseFixtureV1.entries[index];
  return {
    schemaId: "circleheart-studio-published-article-v1",
    tags: [],
    articleId: e.articleId,
    articleContentId: e.articleId,
    publicSlug: e.publicSlug!,
    locale: "ja",
    title: e.title!,
    publishedAt: "2026-09-13T00:00:00Z",
    updatedAt: "2026-09-13T00:00:00Z",
    blocks: [
      {
        kind: "paragraph",
        blockId: "p",
        text: "左室の圧と容積を、同じ一拍で観察する。",
      },
    ],
  };
}

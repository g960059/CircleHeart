export type StudioPublicArticleLocaleV1 = "ja" | "en";

export type StudioPublicArticlePresentationCopyV1 = Readonly<{
  publishedLabel: string;
  tagsLabel: string;
}>;

/**
 * Copy and date formatting shared by the first-response document and the
 * interactive Reader. Keeping this outside either renderer prevents a public
 * Article from changing its visible metadata when the client starts.
 */
export function studioPublicArticlePresentationCopyV1(
  locale: StudioPublicArticleLocaleV1,
): StudioPublicArticlePresentationCopyV1 {
  return locale === "ja"
    ? Object.freeze({ publishedLabel: "公開", tagsLabel: "タグ" })
    : Object.freeze({ publishedLabel: "Published", tagsLabel: "Tags" });
}

export function formatStudioPublicArticleDateV1(
  value: string,
  locale: StudioPublicArticleLocaleV1,
): string {
  return new Intl.DateTimeFormat(locale === "ja" ? "ja-JP" : "en-US", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(value));
}

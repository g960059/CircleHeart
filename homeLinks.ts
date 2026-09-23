import { type Locale, prefixPath } from "./localeRouting";
import {
  isOpaqueExperimentIdV3,
} from "./studio/infrastructure/browser/StudioExperimentIdentityV3";

/** Public Experiment directory. */
export const experimentsHref = (locale?: Locale) => prefixPath("/experiments", locale);

/** Account-scoped management for explicitly saved Experiments. */
export const myExperimentsHref = (locale?: Locale) =>
  prefixPath("/me/experiments", locale);

/** A disposable ExperimentSession. No durable Experiment identity exists yet. */
export const newExperimentHref = (locale?: Locale) =>
  prefixPath("/experiments/new", locale);

export const experimentDetailHref = ({
  experimentId,
  locale,
}: Readonly<{
  experimentId: string;
  locale?: Locale;
}>) => {
  if (!isOpaqueExperimentIdV3(experimentId)) {
    throw new Error("Experiment detail href requires a URL-safe opaque identity");
  }
  return prefixPath(`/experiments/${experimentId}`, locale);
};

/** Public Article directory. */
export const articlesHref = (locale?: Locale) => prefixPath("/articles", locale);

/** Tag page: the public Article directory narrowed to one tag. */
export const articleTagHref = ({
  locale,
  tag,
}: Readonly<{ locale?: Locale; tag: string }>) =>
  `${articlesHref(locale)}?${new URLSearchParams({ tag }).toString()}`;

/** Account-scoped management for authored Articles, including drafts. */
export const myArticlesHref = (locale?: Locale) =>
  prefixPath("/me/articles", locale);

export const accountSettingsHref = (locale?: Locale) =>
  prefixPath("/me/settings", locale);

export const loginHref = (locale?: Locale) => prefixPath("/login", locale);

/** Public guide for the machine-oriented local authoring seam. */
export const authoringCliDocsHref = (locale?: Locale) =>
  prefixPath("/docs/authoring-cli", locale);

export const modelLibraryHref = (locale?: Locale) => prefixPath("/models", locale);

/** Reference reader for one exact model and pinned Model Surface. */
export const modelDocumentationHref = ({
  locale,
  modelId,
  surfaceReleaseId,
  documentId,
  view,
}: Readonly<{
  locale?: Locale;
  modelId: string;
  surfaceReleaseId: string;
  documentId?: string;
  view?: "guide" | "presets";
}>) => {
  const path = prefixPath(
    `/models/${encodeURIComponent(modelId)}`,
    locale,
  );
  const search = new URLSearchParams({ surface: surfaceReleaseId });
  if (documentId) search.set("document", documentId);
  if (view === "presets") search.set("view", "presets");
  return `${path}?${search.toString()}`;
};

/** Compact inventory for development content and model releases in use. */
export const devDashboardHref = (locale?: Locale) => prefixPath("/dev", locale);

/** The single development/research Workbench. */
export const modelLabHref = (locale?: Locale) =>
  prefixPath("/dev/model-lab", locale);

export const articleEditorHref = ({
  articleId,
  locale,
}: Readonly<{
  articleId: string;
  locale?: Locale;
}>) => prefixPath(`/articles/${encodeURIComponent(articleId)}/edit`, locale);

export const newArticleEditorHref = (locale?: Locale) =>
  prefixPath("/articles/new/edit", locale);

export const articleReaderHref = ({
  articleId,
  locale,
}: Readonly<{
  articleId: string;
  locale?: Locale;
}>) => prefixPath(`/articles/${encodeURIComponent(articleId)}`, locale);

/** Account-scoped Reader preview for drafts and authored Article revisions. */
export const articlePreviewHref = ({
  articleId,
  locale,
}: Readonly<{
  articleId: string;
  locale?: Locale;
}>) => prefixPath(
  `/articles/${encodeURIComponent(articleId)}/preview`,
  locale,
);

export const articlePlacementHref = ({
  articleId,
  locale,
  placementId,
}: Readonly<{
  articleId: string;
  locale?: Locale;
  placementId: string;
}>) => `${articleReaderHref({ articleId, locale })}#${
  encodeURIComponent(`placement-${placementId}`)
}`;

export const experimentSnapshotHref = ({
  locale,
  snapshotId,
}: Readonly<{
  locale?: Locale;
  snapshotId: string;
}>) => prefixPath(
  `/snapshots/${encodeURIComponent(snapshotId)}`,
  locale,
);

export const homeHref = (locale?: Locale) => prefixPath("/", locale);

/** Stable publication URL; the backend resolves the currently published Snapshot. */
export const publishedExperimentHref = ({ locale, publicSlug }: Readonly<{
  locale?: Locale;
  publicSlug: string;
}>) => prefixPath(`/experiments/published/${encodeURIComponent(publicSlug)}`, locale);

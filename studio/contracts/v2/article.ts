import type { ExperimentPlacementV2 } from "./content";

export const STUDIO_ARTICLE_DRAFT_V2_SCHEMA_ID =
  "circleheart-studio-article-draft-v2" as const;

export type StudioArticleIdV2 = string;
export type StudioArticleBlockIdV2 = string;
export type StudioArticleVisibilityV2 = "draft" | "public";

export type StudioArticleHeadingBlockV2 = Readonly<{
  blockId: StudioArticleBlockIdV2;
  kind: "heading";
  level: 2 | 3;
  text: string;
}>;

export type StudioArticleParagraphBlockV2 = Readonly<{
  blockId: StudioArticleBlockIdV2;
  kind: "paragraph";
  text: string;
}>;

/** Display-math authored as portable TeX and rendered by the shared Reader. */
export type StudioArticleEquationBlockV2 = Readonly<{
  blockId: StudioArticleBlockIdV2;
  kind: "equation";
  expression: string;
}>;

/**
 * Durable image presentation. Uploaded assets and explicit embeds share the
 * same HTTPS URL contract so UI and AI authoring use one portable block.
 */
export type StudioArticleImageBlockV2 = Readonly<{
  blockId: StudioArticleBlockIdV2;
  kind: "image";
  url: string;
  altText: string;
  caption: string;
  title?: string;
  credit?: Readonly<{
    text: string;
    licenseLabel: string;
    licenseHref: string;
  }>;
}>;

export type StudioArticleDividerBlockV2 = Readonly<{
  blockId: StudioArticleBlockIdV2;
  kind: "divider";
}>;

/** Portable navigation to another Article, a series landing point, or HTTPS source. */
export type StudioArticleLinkBlockV2 = Readonly<{
  blockId: StudioArticleBlockIdV2;
  kind: "link";
  href: string;
  label: string;
  description: string;
  imageUrl?: string;
  iconUrl?: string;
  siteName?: string;
  /** A bibliographic entry collected in the article end matter. */
  role?: "card" | "reference";
}>;

export type StudioArticleQuizChoiceV2 = Readonly<{
  choiceId: string;
  label: string;
}>;

/** Reader-local formative question. Answers are never persisted or graded remotely. */
export type StudioArticleQuizBlockV2 = Readonly<{
  blockId: StudioArticleBlockIdV2;
  kind: "quiz";
  question: string;
  choices: readonly StudioArticleQuizChoiceV2[];
  correctChoiceId: string;
  explanation: string;
}>;

/**
 * Rich content allowed inside one progressive-disclosure block. Experiments
 * and nested accordions stay top-level so hidden live runtimes cannot start
 * accidentally and authoring never becomes recursively ambiguous.
 */
export type StudioArticleAccordionContentBlockV2 =
  | StudioArticleHeadingBlockV2
  | StudioArticleParagraphBlockV2
  | StudioArticleEquationBlockV2
  | StudioArticleImageBlockV2
  | StudioArticleDividerBlockV2
  | StudioArticleLinkBlockV2
  | StudioArticleQuizBlockV2;

export type StudioArticleAccordionBlockV2 = Readonly<{
  blockId: StudioArticleBlockIdV2;
  kind: "accordion";
  title: string;
  /** An explanatory endnote; its number follows first mention in the text. */
  role?: "disclosure" | "note";
  blocks: readonly StudioArticleAccordionContentBlockV2[];
}>;

/**
 * A Placement is nested under the article block that owns it. The same pinned
 * Snapshot may be placed more than once, in one or several articles, without
 * creating another Experiment or following a mutable Experiment head.
 */
export type StudioArticleExperimentBlockV2 = Readonly<{
  blockId: StudioArticleBlockIdV2;
  kind: "experiment";
  placement: ExperimentPlacementV2;
}>;

export type StudioArticleBlockV2 =
  | StudioArticleHeadingBlockV2
  | StudioArticleParagraphBlockV2
  | StudioArticleEquationBlockV2
  | StudioArticleImageBlockV2
  | StudioArticleDividerBlockV2
  | StudioArticleLinkBlockV2
  | StudioArticleQuizBlockV2
  | StudioArticleAccordionBlockV2
  | StudioArticleExperimentBlockV2;

/** Mutable editor document. `draftVersion` is concurrency only. */
export type StudioArticleDraftV2 = Readonly<{
  schemaId: typeof STUDIO_ARTICLE_DRAFT_V2_SCHEMA_ID;
  articleId: StudioArticleIdV2;
  draftVersion: number;
  visibility: StudioArticleVisibilityV2;
  locale: string;
  title: string;
  /**
   * Authored discovery tags, stored with this content revision. Publication
   * exposes them only through the revision its pointer references.
   */
  tags: readonly string[];
  blocks: readonly StudioArticleBlockV2[];
}>;

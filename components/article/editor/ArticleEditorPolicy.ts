import { portableArticleEditorIdV3 } from "@/components/article/editor/ArticleEditorIdentityV3";
import {
  STUDIO_ARTICLE_DRAFT_V2_SCHEMA_ID,
  type StudioArticleBlockV2,
  type StudioArticleDraftV2,
} from "@/studio/contracts/v2/article";

export interface ArticleRemoteAuthoringRepositoryV3 {
  publishArticle(input: Readonly<{
    articleId: string;
    expectedVersion: number;
    publicSlug: string;
  }>): Promise<void>;
  readArticle(articleId: string): Promise<StudioArticleDraftV2 | null>;
  unpublishArticle(articleId: string, expectedVersion: number): Promise<void>;
}

export const ARTICLE_EDITOR_PEEK_FRACTION_STORAGE_KEY_V3 =
  "circleheart.article-editor.peek-fraction.v1";
const ARTICLE_EDITOR_PEEK_DEFAULT_FRACTION_V3 = 0.46;
export const ARTICLE_EDITOR_PEEK_MIN_FRACTION_V3 = 0.3;
export const ARTICLE_EDITOR_PEEK_MAX_FRACTION_V3 = 0.64;

export function clampArticleEditorPeekFractionV3(value: number): number {
  if (!Number.isFinite(value)) return ARTICLE_EDITOR_PEEK_DEFAULT_FRACTION_V3;
  return Math.min(
    ARTICLE_EDITOR_PEEK_MAX_FRACTION_V3,
    Math.max(ARTICLE_EDITOR_PEEK_MIN_FRACTION_V3, value),
  );
}

export function articleEditorPeekFractionForPointerV3(
  shellLeft: number,
  shellWidth: number,
  pointerClientX: number,
): number {
  if (!Number.isFinite(shellWidth) || shellWidth <= 0) {
    return ARTICLE_EDITOR_PEEK_DEFAULT_FRACTION_V3;
  }
  return clampArticleEditorPeekFractionV3(
    (shellLeft + shellWidth - pointerClientX) / shellWidth,
  );
}

export function initialArticleEditorPeekFractionV3(): number {
  if (typeof window === "undefined") return ARTICLE_EDITOR_PEEK_DEFAULT_FRACTION_V3;
  try {
    const raw = window.localStorage.getItem(
      ARTICLE_EDITOR_PEEK_FRACTION_STORAGE_KEY_V3,
    );
    return raw === null
      ? ARTICLE_EDITOR_PEEK_DEFAULT_FRACTION_V3
      : clampArticleEditorPeekFractionV3(Number(raw));
  } catch {
    return ARTICLE_EDITOR_PEEK_DEFAULT_FRACTION_V3;
  }
}

export async function synchronizeRemoteArticlePublicationV3(input: Readonly<{
  repository: ArticleRemoteAuthoringRepositoryV3;
  saved: StudioArticleDraftV2;
  candidate: StudioArticleDraftV2;
  wasPublished: boolean;
}>): Promise<Readonly<{
  article: StudioArticleDraftV2;
  published: boolean;
}>> {
  if (input.candidate.visibility === "draft" && !input.wasPublished) {
    return Object.freeze({ article: input.saved, published: false });
  }
  if (input.candidate.visibility === "public") {
    await input.repository.publishArticle({
      articleId: input.saved.articleId,
      expectedVersion: input.saved.draftVersion,
      publicSlug: publicArticleSlugV3(input.saved.articleId),
    });
  } else if (input.wasPublished) {
    await input.repository.unpublishArticle(
      input.saved.articleId,
      input.saved.draftVersion,
    );
  }

  // Publication is a second authority commit. Re-read after moving (or
  // removing) the pointer so callers never replace the requested state with
  // the pre-publication draft returned by saveArticle().
  const authoritative = await input.repository.readArticle(
    input.saved.articleId,
  );
  if (authoritative === null) {
    throw new Error("Saved Article could not be read after publication update");
  }
  return Object.freeze({
    article: authoritative,
    published: authoritative.visibility === "public",
  });
}

export type ArticleEditorRouteDraftResolutionV3 = Readonly<{
  draft: StudioArticleDraftV2;
  routeChanged: boolean;
  routeKey: string;
}>;

export function articleEditorRouteKeyV3(
  routeArticleId: string | undefined,
): string {
  return routeArticleId ?? "new";
}

export function articleEditorRouteHydratedV3(
  hydratedRouteKey: string | null,
  routeArticleId: string | undefined,
): boolean {
  return hydratedRouteKey === articleEditorRouteKeyV3(routeArticleId);
}

export function resolveArticleEditorRouteDraftV3(input: Readonly<{
  currentDraft: StudioArticleDraftV2;
  hydratedRouteKey: string | null;
  locale: string;
  readArticle: (articleId: string) => StudioArticleDraftV2 | null;
  routeArticleId: string | undefined;
  untitledTitle: string;
}>): ArticleEditorRouteDraftResolutionV3 {
  const routeKey = articleEditorRouteKeyV3(input.routeArticleId);
  if (input.hydratedRouteKey === routeKey) {
    return Object.freeze({
      draft: input.currentDraft,
      routeChanged: false,
      routeKey,
    });
  }
  if (input.routeArticleId === "new" || input.routeArticleId === undefined) {
    return Object.freeze({
      draft: createEmptyArticleDraftV3(input.locale, input.untitledTitle),
      routeChanged: true,
      routeKey,
    });
  }
  const stored = input.readArticle(input.routeArticleId);
  if (stored === null) {
    throw new Error(`Article not found: ${input.routeArticleId}`);
  }
  return Object.freeze({
    draft: stored,
    routeChanged: true,
    routeKey,
  });
}

/**
 * Reconciles a durable save with the Draft as it stands when the save
 * resolves. Autosave runs while the author keeps typing, so edits made during
 * the round-trip must never be replaced by the persisted (older) content.
 * The durable identity and concurrency version are always adopted.
 */
export function adoptSavedArticleDraftV3(input: Readonly<{
  saved: StudioArticleDraftV2;
  candidate: StudioArticleDraftV2;
  current: StudioArticleDraftV2;
}>): Readonly<{ draft: StudioArticleDraftV2; clean: boolean }> {
  if (input.current === input.candidate) {
    return Object.freeze({ draft: input.saved, clean: true });
  }
  return Object.freeze({
    draft: Object.freeze({
      ...input.current,
      articleId: input.saved.articleId,
      draftVersion: input.saved.draftVersion,
    }),
    clean: false,
  });
}

/**
 * Markdown-style prefixes convert a Paragraph while typing:
 * `# ` becomes a section heading, `## ` becomes a subheading.
 * The Article title itself plays the H1 role, so levels start at 2.
 */
export function articleHeadingShortcutV3(
  text: string,
): Readonly<{ level: 2 | 3; rest: string }> | null {
  if (text.startsWith("## ")) {
    return Object.freeze({ level: 3 as const, rest: text.slice(3) });
  }
  if (text.startsWith("# ")) {
    return Object.freeze({ level: 2 as const, rest: text.slice(2) });
  }
  return null;
}

/** Maps a pointer position over a block to the boundary it targets. */
export function articleBlockDropBoundaryV3(
  index: number,
  rectTop: number,
  rectHeight: number,
  clientY: number,
): number {
  return clientY < rectTop + rectHeight / 2 ? index : index + 1;
}

/**
 * Moves a block to a document boundary (0..blocks.length), the drag-and-drop
 * insertion-line semantic. Returns the same array when nothing changes.
 */
export function moveArticleBlockToBoundaryV3(
  blocks: readonly StudioArticleBlockV2[],
  blockId: string,
  boundary: number,
): readonly StudioArticleBlockV2[] {
  const sourceIndex = blocks.findIndex((block) => block.blockId === blockId);
  if (sourceIndex < 0) return blocks;
  const clamped = Math.max(0, Math.min(boundary, blocks.length));
  const targetIndex = clamped > sourceIndex ? clamped - 1 : clamped;
  if (targetIndex === sourceIndex) return blocks;
  const next = [...blocks];
  const [moved] = next.splice(sourceIndex, 1);
  if (moved === undefined) return blocks;
  next.splice(targetIndex, 0, moved);
  return Object.freeze(next);
}

export function filterArticleInsertOptionsV3<Option extends Readonly<{
  label: string;
  keywords: readonly string[];
}>>(options: readonly Option[], query: string): readonly Option[] {
  const normalized = query.trim().toLowerCase();
  if (normalized.length === 0) return options;
  return options.filter((option) =>
    option.label.toLowerCase().includes(normalized)
    || option.keywords.some((keyword) =>
        keyword.toLowerCase().includes(normalized)));
}

/** IME confirmation keys are text input, never editor commands. */
export function articleEditorInputIsComposingV3(input: Readonly<{
  isComposing?: boolean;
  keyCode?: number;
}>): boolean {
  return input.isComposing === true || input.keyCode === 229;
}

export function articleEditorSaveScopeIsCurrentV3(input: Readonly<{
  currentGeneration: number;
  currentRouteKey: string;
  mounted: boolean;
  startedGeneration: number;
  startedRouteKey: string;
}>): boolean {
  return input.mounted
    && input.currentGeneration === input.startedGeneration
    && input.currentRouteKey === input.startedRouteKey;
}

export function articleEditorRetryActionV3(input: Readonly<{
  alreadyPersisted: boolean;
  hasUnsaved: boolean;
  routeHydrated: boolean;
}>): "dismiss-idle" | "dismiss-saved" | "reload" | "save" {
  if (!input.routeHydrated) return "reload";
  if (input.hasUnsaved) return "save";
  return input.alreadyPersisted ? "dismiss-saved" : "dismiss-idle";
}

/**
 * Splits around the complete browser selection. A selected range is replaced
 * by the block boundary, matching a conventional text editor's Enter key.
 */
export function splitArticleTextSelectionV3(input: Readonly<{
  text: string;
  selectionStart: number;
  selectionEnd: number;
}>): Readonly<{ before: string; after: string }> {
  const start = Math.max(0, Math.min(
    input.selectionStart,
    input.selectionEnd,
    input.text.length,
  ));
  const end = Math.max(start, Math.min(
    Math.max(input.selectionStart, input.selectionEnd),
    input.text.length,
  ));
  return Object.freeze({
    before: input.text.slice(0, start),
    after: input.text.slice(end),
  });
}

export function insertArticleBlockV3(
  blocks: readonly StudioArticleBlockV2[],
  index: number,
  block: StudioArticleBlockV2,
): readonly StudioArticleBlockV2[] {
  const insertionIndex = Math.max(0, Math.min(index, blocks.length));
  const next = [...blocks];
  next.splice(insertionIndex, 0, block);
  return Object.freeze(next);
}

export function prepareArticleDraftForSaveV3(
  draft: StudioArticleDraftV2,
): StudioArticleDraftV2 {
  return {
    ...draft,
    blocks: draft.blocks.map((block) => {
      if (block.kind !== "experiment") return block;
      const caption = block.placement.caption?.trim() ?? "";
      const titleOverride = block.placement.titleOverride?.trim() ?? "";
      return {
        ...block,
        placement: {
          ...block.placement,
          titleOverride: titleOverride.length === 0 ? null : titleOverride,
          caption: caption.length === 0 ? null : caption,
        },
      };
    }),
  };
}

export function createEmptyArticleDraftV3(
  locale: string,
  title: string,
): StudioArticleDraftV2 {
  return Object.freeze({
    schemaId: STUDIO_ARTICLE_DRAFT_V2_SCHEMA_ID,
    articleId: portableArticleEditorIdV3("article"),
    draftVersion: 0,
    visibility: "draft",
    locale,
    title,
    tags: Object.freeze([]),
    blocks: Object.freeze([]),
  });
}

function publicArticleSlugV3(articleId: string): string {
  return `article-${articleId.toLocaleLowerCase()}`;
}

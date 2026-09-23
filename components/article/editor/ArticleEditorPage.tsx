import { ArticleReadingProviderV1 } from "@/components/article/ArticleReadingV1";
import React from "react";
import { ArrowLeft, BookOpen } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Link,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  articleEditorHref,
  articlePreviewHref,
  articleReaderHref,
  myArticlesHref,
  newExperimentHref,
} from "@/homeLinks";
import { localeFromPathname } from "@/localeRouting";
import { ArticleExperimentPlacementV3 } from "@/components/article/ArticleExperimentPlacementV3";
import { ArticleDividerPresentationV3 } from "@/components/article/ArticleRichBlockV3";
import {
  ArticleReaderExperimentV3,
} from "@/components/article/reader/ArticleReaderExperimentV3";
import {
  ArticleSnapshotPickerDialogV3,
  type ArticleSnapshotPickerItemV3,
} from "@/components/article/editor/ArticleSnapshotPickerDialogV3";
import {
  createArticleExperimentBlockV3,
} from "@/studio/application/article/ArticleExperimentPlacementV3";
import { portableArticleEditorIdV3 } from "@/components/article/editor/ArticleEditorIdentityV3";
import {
  ArticleAccordionBlockEditorV3,
  ArticleBlockShellV3,
  ArticleTextBlockV3,
  createRichArticleBlockTemplateV3,
  snapshotPickerItemFromSnapshotV3,
  type ArticleInsertOptionKindV3,
  type ArticleTextBlockKindV3,
  type StudioArticleTextBlockV2,
} from "@/components/article/editor/ArticleEditorBlocksV3";
import {
  ArticleEditorSaveStatusV3,
  ArticlePublishMenuV3,
  type EditorSaveStatusV3,
} from "@/components/article/editor/ArticleEditorChromeV3";
import {
  ArticleEquationBlockEditorV3,
  ArticleImageBlockEditorV3,
  ArticleLinkBlockEditorV3,
  ArticleQuizBlockEditorV3,
} from "@/components/article/editor/ArticleEditorRichBlocksV3";
import { articleEditorErrorMessageV3 } from "@/components/article/editor/ArticleEditorUtilitiesV3";
import {
  ArticleEditorTagsV1,
  type ArticleEditorTagSuggestionV1,
} from "@/components/article/editor/ArticleEditorTagsV1";
import {
  articleTagKeyV1,
  countArticleTagsV1,
} from "@/studio/application/article/StudioArticleTagsV1";
import {
  ARTICLE_EDITOR_PEEK_FRACTION_STORAGE_KEY_V3,
  ARTICLE_EDITOR_PEEK_MAX_FRACTION_V3,
  ARTICLE_EDITOR_PEEK_MIN_FRACTION_V3,
  adoptSavedArticleDraftV3,
  articleEditorInputIsComposingV3,
  articleEditorPeekFractionForPointerV3,
  articleEditorRetryActionV3,
  articleEditorRouteHydratedV3,
  articleEditorRouteKeyV3,
  articleEditorSaveScopeIsCurrentV3,
  clampArticleEditorPeekFractionV3,
  createEmptyArticleDraftV3,
  initialArticleEditorPeekFractionV3,
  insertArticleBlockV3,
  moveArticleBlockToBoundaryV3,
  prepareArticleDraftForSaveV3,
  resolveArticleEditorRouteDraftV3,
  splitArticleTextSelectionV3,
  synchronizeRemoteArticlePublicationV3,
} from "@/components/article/editor/ArticleEditorPolicy";
import type {
  StudioArticleBlockV2,
  StudioArticleDraftV2,
} from "@/studio/contracts/v2/article";
import type {
  ExperimentPlacementBriefingV2,
  ExperimentSnapshotV2,
} from "@/studio/contracts/v2/content";
import {
  BrowserContentStore,
} from "@/studio/infrastructure/browser/BrowserContentStore";
import {
  createStudioSupabaseContentRepositoryV1,
} from "@/studio/infrastructure/supabase/StudioSupabaseContentRepositoryV1";
import {
  createArticleExperimentSessionTokenV3,
  StudioArticleExperimentAuthoringHandoffStoreV3,
} from "@/studio/infrastructure/browser/StudioArticleExperimentAuthoringHandoffV3";
import {
  loadStudioSnapshotClientCompositionV2,
  type StudioClientCompositionV2,
} from "@/studio/composition/StudioDefaultCompositionV2";
import { useUnsavedChangesGuardV3 } from "@/components/useUnsavedChangesGuardV3";

/** Notion-style continuous persistence: edits commit shortly after the pause. */
export const ARTICLE_EDITOR_AUTOSAVE_DELAY_MS_V3 = 1000;

function isArticleTextBlockV3(
  block: StudioArticleBlockV2,
): block is StudioArticleTextBlockV2 {
  return block.kind === "heading" || block.kind === "paragraph";
}

type ArticleInsertMenuStateV3 = Readonly<{
  anchorBlockId: string;
  insertionIndex: number;
  replaceBlockId: string | null;
}>;

type ArticleEditorFocusRequestV3 = Readonly<{
  blockId: string;
  caret: "start" | "end" | number;
}>;

export function ArticleEditorPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { articleId: routeArticleId } = useParams();
  const locale = localeFromPathname(location.pathname);
  const store = React.useMemo(() => new BrowserContentStore(), []);
  const remoteRepository = React.useMemo(
    createStudioSupabaseContentRepositoryV1,
    [],
  );
  const articleExperimentHandoff = React.useMemo(
    () => new StudioArticleExperimentAuthoringHandoffStoreV3(),
    [],
  );
  const [snapshots, setSnapshots] = React.useState<
    readonly ExperimentSnapshotV2[]
  >([]);
  const [snapshotPickerItems, setSnapshotPickerItems] = React.useState<
    readonly ArticleSnapshotPickerItemV3[]
  >([]);
  const [draft, setDraft] = React.useState<StudioArticleDraftV2>(() =>
    createEmptyArticleDraftV3(locale, t("articleEditor.untitled")));
  const draftRef = React.useRef(draft);
  const titleRef = React.useRef<HTMLTextAreaElement | null>(null);
  const routeArticleIdRef = React.useRef(routeArticleId);
  routeArticleIdRef.current = routeArticleId;
  const remoteSavedArticleIdRef = React.useRef<string | null>(null);
  const remotePublishedRef = React.useRef(false);
  const hydratedRouteKeyRef = React.useRef<string | null>(
    routeArticleId === "new" || routeArticleId === undefined
      ? articleEditorRouteKeyV3(routeArticleId)
      : null,
  );
  const [hydratedRouteKey, setHydratedRouteKey] = React.useState<string | null>(
    hydratedRouteKeyRef.current,
  );
  const [status, setStatus] = React.useState<EditorSaveStatusV3>("idle");
  const [hasUnsavedArticleChanges, setHasUnsavedArticleChanges] =
    React.useState(false);
  const hasUnsavedRef = React.useRef(false);
  const saveChainRef = React.useRef<Promise<unknown>>(Promise.resolve());
  const saveScopeRef = React.useRef({
    generation: 0,
    mounted: true,
    routeKey: articleEditorRouteKeyV3(routeArticleId),
  });
  const [error, setError] = React.useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [insertMenu, setInsertMenu] =
    React.useState<ArticleInsertMenuStateV3 | null>(null);
  const [blockMenuId, setBlockMenuId] = React.useState<string | null>(null);
  const [publishMenuOpen, setPublishMenuOpen] = React.useState(false);
  const [draggedBlockId, setDraggedBlockId] = React.useState<string | null>(null);
  const [dropBoundary, setDropBoundary] = React.useState<number | null>(null);
  const [focusRequest, setFocusRequest] =
    React.useState<ArticleEditorFocusRequestV3 | null>(null);
  const pendingExperimentInsertIndexRef = React.useRef<number | null>(null);
  const pendingExperimentReplacementBlockIdRef = React.useRef<string | null>(null);
  const pendingReturnedSnapshotIdRef = React.useRef<string | null>(null);
  const [compositionBySnapshotId, setCompositionBySnapshotId] = React.useState<
    ReadonlyMap<string, StudioClientCompositionV2>
  >(() => new Map());
  const [peekBlockId, setPeekBlockId] = React.useState<string | null>(null);
  const [peekOpen, setPeekOpen] = React.useState(false);
  const [peekPortalHost, setPeekPortalHost] =
    React.useState<HTMLDivElement | null>(null);
  const [peekFraction, setPeekFraction] = React.useState(
    initialArticleEditorPeekFractionV3,
  );
  const [peekMaximized, setPeekMaximized] = React.useState(false);
  const tagInputRef = React.useRef<HTMLInputElement | null>(null);
  const [tagSuggestions, setTagSuggestions] = React.useState<
    readonly ArticleEditorTagSuggestionV1[]
  >([]);

  const saveRouteKey = articleEditorRouteKeyV3(routeArticleId);
  React.useLayoutEffect(() => {
    const scope = saveScopeRef.current;
    scope.generation += 1;
    scope.mounted = true;
    scope.routeKey = saveRouteKey;
    return () => {
      scope.generation += 1;
      scope.mounted = false;
    };
  }, [saveRouteKey]);
  const [peekDragging, setPeekDragging] = React.useState(false);
  const splitRef = React.useRef<HTMLDivElement>(null);
  const peekCloseTimerRef = React.useRef<number | null>(null);
  const peekResizeFrameRef = React.useRef<number | null>(null);
  const peekDraggingRef = React.useRef(false);
  const pendingPeekFractionRef = React.useRef(peekFraction);

  const cancelPeekCloseTimer = React.useCallback(() => {
    if (peekCloseTimerRef.current === null) return;
    window.clearTimeout(peekCloseTimerRef.current);
    peekCloseTimerRef.current = null;
  }, []);

  const openEditorPeekV3 = React.useCallback((blockId: string) => {
    cancelPeekCloseTimer();
    setPeekMaximized(false);
    setPeekBlockId(blockId);
  }, [cancelPeekCloseTimer]);

  const closeEditorPeekV3 = React.useCallback(() => {
    setPeekMaximized(false);
    setPeekOpen(false);
    cancelPeekCloseTimer();
    peekCloseTimerRef.current = window.setTimeout(() => {
      peekCloseTimerRef.current = null;
      setPeekBlockId(null);
    }, 260);
  }, [cancelPeekCloseTimer]);

  React.useEffect(() => {
    if (peekBlockId === null) return undefined;
    const frame = window.requestAnimationFrame(() => setPeekOpen(true));
    return () => window.cancelAnimationFrame(frame);
  }, [peekBlockId]);

  React.useEffect(() => () => {
    cancelPeekCloseTimer();
    if (peekResizeFrameRef.current !== null) {
      window.cancelAnimationFrame(peekResizeFrameRef.current);
    }
  }, [cancelPeekCloseTimer]);

  const resizePeekFromPointer = React.useCallback((clientX: number) => {
    const bounds = splitRef.current?.getBoundingClientRect();
    if (bounds === undefined) return;
    setPeekMaximized(false);
    pendingPeekFractionRef.current = articleEditorPeekFractionForPointerV3(
      bounds.left,
      bounds.width,
      clientX,
    );
    if (peekResizeFrameRef.current !== null) return;
    peekResizeFrameRef.current = window.requestAnimationFrame(() => {
      peekResizeFrameRef.current = null;
      setPeekFraction(pendingPeekFractionRef.current);
    });
  }, []);

  const persistPeekFraction = React.useCallback((fraction: number) => {
    try {
      window.localStorage.setItem(
        ARTICLE_EDITOR_PEEK_FRACTION_STORAGE_KEY_V3,
        String(clampArticleEditorPeekFractionV3(fraction)),
      );
    } catch {
      // Device-local Editor geometry is optional.
    }
  }, []);

  React.useEffect(() => {
    let current = true;
    void Promise.allSettled(snapshots.map(async (snapshot) => Object.freeze({
      snapshotId: snapshot.snapshotId,
      composition: await loadStudioSnapshotClientCompositionV2(
        snapshot.content.modelId,
        snapshot.content.surfaceSeriesId,
        snapshot.surfaceReleaseId,
      ),
    }))).then((results) => {
      if (!current) return;
      setCompositionBySnapshotId(new Map(results.flatMap((result) =>
        result.status === "fulfilled"
          ? [[result.value.snapshotId, result.value.composition] as const]
          : [])));
    });
    return () => {
      current = false;
    };
  }, [snapshots]);

  React.useEffect(() => {
    let current = true;
    const load = async () => {
      const localSnapshots = remoteRepository === null
        ? store.listSnapshots()
        : Object.freeze([]);
      const nextSnapshotPickerItems = remoteRepository === null
        ? localSnapshots.map(snapshotPickerItemFromSnapshotV3)
        : (await remoteRepository.listMySnapshots()).items.map((summary) =>
            Object.freeze({
              snapshotId: summary.snapshotId,
              title: summary.title,
              createdAt: summary.createdAt,
              paneCount: summary.paneCount,
            }));
      if (!current) return;
      setSnapshotPickerItems(Object.freeze([...nextSnapshotPickerItems]
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt))));

      const routeKey = articleEditorRouteKeyV3(routeArticleId);
      if (hydratedRouteKeyRef.current === routeKey) {
        setHydratedRouteKey(routeKey);
        return;
      }
      setHydratedRouteKey(null);
      let nextDraft: StudioArticleDraftV2;
      if (routeArticleId === "new" || routeArticleId === undefined) {
        nextDraft = createEmptyArticleDraftV3(
          locale,
          t("articleEditor.untitled"),
        );
        remoteSavedArticleIdRef.current = null;
        remotePublishedRef.current = false;
      } else if (remoteRepository !== null) {
        const stored = await remoteRepository.readArticle(routeArticleId);
        if (stored === null) throw new Error(`Article not found: ${routeArticleId}`);
        nextDraft = stored;
        remoteSavedArticleIdRef.current = stored.articleId;
        remotePublishedRef.current = stored.visibility === "public";
      } else {
        const resolution = resolveArticleEditorRouteDraftV3({
          currentDraft: draftRef.current,
          hydratedRouteKey: hydratedRouteKeyRef.current,
          locale,
          readArticle: (articleId) => store.readArticle(articleId),
          routeArticleId,
          untitledTitle: t("articleEditor.untitled"),
        });
        nextDraft = resolution.draft;
      }
      const referencedSnapshotIds = [...new Set(nextDraft.blocks.flatMap(
        (block) => block.kind === "experiment"
          ? [block.placement.snapshotId]
          : [],
      ))];
      const nextSnapshots = remoteRepository === null
        ? localSnapshots.filter((snapshot) =>
            referencedSnapshotIds.includes(snapshot.snapshotId))
        : (await Promise.all(referencedSnapshotIds.map((snapshotId) =>
            remoteRepository.readSnapshot(snapshotId))))
            .filter((snapshot): snapshot is ExperimentSnapshotV2 =>
              snapshot !== null);
      if (!current) return;
      setSnapshots(Object.freeze(nextSnapshots));
      hydratedRouteKeyRef.current = routeKey;
      setHydratedRouteKey(routeKey);
      pendingReturnedSnapshotIdRef.current = null;
      draftRef.current = nextDraft;
      setDraft(nextDraft);
      setStatus("idle");
      hasUnsavedRef.current = false;
      setHasUnsavedArticleChanges(false);
      setError(null);
    };
    void load().catch((cause) => {
      if (!current) return;
      setHydratedRouteKey(null);
      setStatus("error");
      setError(articleEditorErrorMessageV3(cause));
    });
    return () => {
      current = false;
    };
  }, [locale, remoteRepository, routeArticleId, store, t]);

  const routeHydrated = articleEditorRouteHydratedV3(
    hydratedRouteKey,
    routeArticleId,
  );

  // Suggest the shared public vocabulary of the draft's language plus the
  // author's own tags, so one topic keeps one spelling across Articles.
  const draftLocale = draft.locale;
  React.useEffect(() => {
    let current = true;
    const load = async () => {
      const [publicTags, ownTagLists] = remoteRepository === null
        ? [[], store.listArticles()
            .filter((article) => article.locale === draftLocale)
            .map((article) => article.tags)]
        : await Promise.all([
            draftLocale === "ja" || draftLocale === "en"
              ? remoteRepository.listPublicArticleTags(draftLocale).catch(() => [])
              : Promise.resolve([]),
            remoteRepository.listMyArticles({ limit: 100 })
              .then((page) => page.items
                .filter((article) => article.locale === draftLocale)
                .map((article) => article.tags))
              .catch(() => []),
          ]);
      const merged = new Map<string, ArticleEditorTagSuggestionV1>();
      // Public tags arrive most used first, so the first spelling of a key wins.
      for (const entry of publicTags) {
        const key = articleTagKeyV1(entry.tag);
        const existing = merged.get(key);
        merged.set(key, existing === undefined
          ? { tag: entry.tag, key, publicCount: entry.articleCount, mine: false }
          : { ...existing, publicCount: existing.publicCount + entry.articleCount });
      }
      for (const entry of countArticleTagsV1(ownTagLists, draftLocale)) {
        const existing = merged.get(entry.key);
        merged.set(entry.key, existing === undefined
          ? { tag: entry.tag, key: entry.key, publicCount: 0, mine: true }
          : { ...existing, mine: true });
      }
      if (current) setTagSuggestions(Object.freeze([...merged.values()]));
    };
    void load();
    return () => {
      current = false;
    };
  }, [draftLocale, remoteRepository, store]);

  React.useLayoutEffect(() => {
    const element = titleRef.current;
    if (element === null) return;
    element.style.height = "0px";
    element.style.height = `${Math.max(element.scrollHeight, 64)}px`;
  }, [draft.title]);

  const updateDraft = React.useCallback((
    update: (current: StudioArticleDraftV2) => StudioArticleDraftV2,
  ) => {
    const next = update(draftRef.current);
    if (next === draftRef.current) return;
    draftRef.current = next;
    setDraft(next);
    setStatus("dirty");
    hasUnsavedRef.current = true;
    setHasUnsavedArticleChanges(true);
    setError(null);
  }, []);

  const performSaveV3 = React.useCallback(async ():
    Promise<StudioArticleDraftV2 | null> => {
    if (!articleEditorRouteHydratedV3(
      hydratedRouteKeyRef.current,
      routeArticleIdRef.current,
    )) return null;
    const startedRouteKey = articleEditorRouteKeyV3(
      routeArticleIdRef.current,
    );
    const startedGeneration = saveScopeRef.current.generation;
    const saveStillBelongsToThisRouteV3 = () => {
      const scope = saveScopeRef.current;
      return articleEditorSaveScopeIsCurrentV3({
        currentGeneration: scope.generation,
        currentRouteKey: articleEditorRouteKeyV3(routeArticleIdRef.current),
        mounted: scope.mounted,
        startedGeneration,
        startedRouteKey,
      }) && scope.routeKey === startedRouteKey;
    };
    const candidate = draftRef.current;
    const alreadyPersisted = remoteRepository !== null
      ? remoteSavedArticleIdRef.current !== null
      : store.readArticle(candidate.articleId) !== null;
    if (!hasUnsavedRef.current && alreadyPersisted) {
      setStatus("saved");
      setError(null);
      return candidate;
    }
    setStatus("saving");
    setError(null);
    let remotelySaved: StudioArticleDraftV2 | null = null;
    try {
      let saved: StudioArticleDraftV2;
      if (remoteRepository !== null) {
        const persistedArticleId = remoteSavedArticleIdRef.current;
        const normalized = prepareArticleDraftForSaveV3(candidate);
        saved = await remoteRepository.saveArticle({
          articleId: persistedArticleId,
          expectedVersion: persistedArticleId === null
            ? null
            : candidate.draftVersion,
          article: normalized,
        });
        if (!saveStillBelongsToThisRouteV3()) return null;
        // Saving Article content and moving its publication pointer are two
        // semantic commits. Retain the new durable version even when the
        // latter is rejected (for example, while the owner is anonymous), so
        // the next explicit retry cannot write against a stale version.
        remotelySaved = saved;
        remoteSavedArticleIdRef.current = saved.articleId;
        const publication = await synchronizeRemoteArticlePublicationV3({
          repository: remoteRepository,
          saved,
          candidate,
          wasPublished: remotePublishedRef.current,
        });
        if (!saveStillBelongsToThisRouteV3()) return null;
        saved = publication.article;
        remotelySaved = publication.article;
        remotePublishedRef.current = publication.published;
      } else {
        const isInitialSave = store.readArticle(candidate.articleId) === null;
        const normalized = prepareArticleDraftForSaveV3({
          ...candidate,
          draftVersion: isInitialSave ? 0 : candidate.draftVersion + 1,
        });
        saved = store.saveArticle(normalized);
      }
      if (!saveStillBelongsToThisRouteV3()) return null;
      const pendingSnapshotId = pendingReturnedSnapshotIdRef.current;
      if (pendingSnapshotId !== null) {
        const pendingHandoff = articleExperimentHandoff.read();
        if (
          pendingHandoff?.articleId === saved.articleId
          && pendingHandoff.snapshotId === pendingSnapshotId
        ) {
          articleExperimentHandoff.clear();
        }
        pendingReturnedSnapshotIdRef.current = null;
      }
      // The author may have kept typing while the save round-trip was in
      // flight. Never replace those newer edits with the persisted content.
      const adoption = adoptSavedArticleDraftV3({
        saved,
        candidate,
        current: draftRef.current,
      });
      draftRef.current = adoption.draft;
      setDraft(adoption.draft);
      setStatus(adoption.clean ? "saved" : "dirty");
      hasUnsavedRef.current = !adoption.clean;
      setHasUnsavedArticleChanges(!adoption.clean);
      if (routeArticleIdRef.current !== saved.articleId) {
        // Claim the canonical route as already hydrated so the route effect
        // keeps the in-memory Draft instead of re-reading (and replacing) it.
        hydratedRouteKeyRef.current = saved.articleId;
        setHydratedRouteKey(saved.articleId);
        navigate(articleEditorHref({ articleId: saved.articleId, locale }), {
          replace: true,
        });
      }
      return saved;
    } catch (cause) {
      if (!saveStillBelongsToThisRouteV3()) return null;
      if (remotelySaved !== null) {
        const adoption = adoptSavedArticleDraftV3({
          saved: remotelySaved,
          candidate,
          current: draftRef.current,
        });
        const adopted = Object.freeze({
          ...adoption.draft,
          // Keep the author's requested visibility visible. The error state
          // communicates that moving the publication pointer is still
          // pending; the Article body itself is already durable.
          visibility: draftRef.current.visibility,
        }) satisfies StudioArticleDraftV2;
        draftRef.current = adopted;
        setDraft(adopted);
        hasUnsavedRef.current = true;
        setHasUnsavedArticleChanges(true);
        if (routeArticleIdRef.current !== adopted.articleId) {
          hydratedRouteKeyRef.current = adopted.articleId;
          setHydratedRouteKey(adopted.articleId);
          navigate(articleEditorHref({
            articleId: adopted.articleId,
            locale,
          }), { replace: true });
        }
      }
      setStatus("error");
      setError(articleEditorErrorMessageV3(cause));
      return null;
    }
  }, [
    articleExperimentHandoff,
    locale,
    navigate,
    remoteRepository,
    store,
  ]);

  /** All saves share one serialized chain so autosave and explicit saves never interleave. */
  const saveDraft = React.useCallback((): Promise<StudioArticleDraftV2 | null> => {
    const run = saveChainRef.current.then(() => performSaveV3());
    saveChainRef.current = run;
    return run;
  }, [performSaveV3]);

  React.useEffect(() => {
    if (status !== "dirty" || !routeHydrated) return undefined;
    const timer = window.setTimeout(() => {
      void saveDraft();
    }, ARTICLE_EDITOR_AUTOSAVE_DELAY_MS_V3);
    return () => window.clearTimeout(timer);
  }, [draft, routeHydrated, saveDraft, status]);

  const insertExperimentSnapshotV3 = React.useCallback((input: Readonly<{
    insertionIndex: number;
    replacementBlockId: string | null;
    snapshot: ExperimentSnapshotV2;
    briefing?: ExperimentPlacementBriefingV2;
  }>) => {
    const block = createArticleExperimentBlockV3({
      snapshot: input.snapshot,
      createId: portableArticleEditorIdV3,
      ...(input.briefing === undefined
        ? {}
        : { briefing: input.briefing }),
    });
    updateDraft((current) => {
      const replacementIndex = input.replacementBlockId === null
        ? -1
        : current.blocks.findIndex((candidate) =>
            candidate.blockId === input.replacementBlockId);
      const replacement = current.blocks[replacementIndex];
      if (
        replacementIndex >= 0
        && replacement !== undefined
        && (
          replacement.kind === "experiment"
          || (isArticleTextBlockV3(replacement) && replacement.text.length === 0)
        )
      ) {
        const blocks = [...current.blocks];
        blocks[replacementIndex] = block;
        return { ...current, blocks };
      }
      return {
        ...current,
        blocks: insertArticleBlockV3(
          current.blocks,
          input.insertionIndex,
          block,
        ),
      };
    });
  }, [updateDraft]);

  React.useEffect(() => {
    const pending = articleExperimentHandoff.read();
    if (
      pending === null
      || pending.snapshotId === null
      || pending.articleId !== draft.articleId
      || pendingReturnedSnapshotIdRef.current === pending.snapshotId
    ) return;
    let current = true;
    const loadReturnedSnapshot = async () => {
      const snapshot = remoteRepository === null
        ? store.readSnapshot(pending.snapshotId!)
        : await remoteRepository.readSnapshot(pending.snapshotId!);
      if (!current || snapshot === null || pending.briefing === null) return;
      insertExperimentSnapshotV3({
        insertionIndex: pending.insertionIndex,
        replacementBlockId: pending.replacementBlockId,
        snapshot,
        briefing: pending.briefing,
      });
      // Keep the completed handoff until the Article itself is saved. If the
      // tab reloads before then, this exact immutable Snapshot can be inserted
      // again instead of silently losing the returned Placement.
      pendingReturnedSnapshotIdRef.current = pending.snapshotId;
      const nextSnapshotPickerItems = remoteRepository === null
        ? store.listSnapshots().map(snapshotPickerItemFromSnapshotV3)
        : (await remoteRepository.listMySnapshots()).items.map((summary) =>
            Object.freeze({
              snapshotId: summary.snapshotId,
              title: summary.title,
              createdAt: summary.createdAt,
              paneCount: summary.paneCount,
            }));
      if (current) {
        setSnapshots((existing) => Object.freeze([
          snapshot,
          ...existing.filter((candidate) =>
            candidate.snapshotId !== snapshot.snapshotId),
        ]));
        setSnapshotPickerItems(Object.freeze([...nextSnapshotPickerItems]
          .sort((left, right) => right.createdAt.localeCompare(left.createdAt))));
      }
    };
    void loadReturnedSnapshot().catch((cause) => {
      if (current) {
        setStatus("error");
        setError(articleEditorErrorMessageV3(cause));
      }
    });
    return () => {
      current = false;
    };
  }, [
    articleExperimentHandoff,
    draft.articleId,
    insertExperimentSnapshotV3,
    remoteRepository,
    store,
  ]);

  const discardPendingReturnedSnapshotV3 = React.useCallback(() => {
    if (pendingReturnedSnapshotIdRef.current === null) return;
    articleExperimentHandoff.clear();
    pendingReturnedSnapshotIdRef.current = null;
  }, [articleExperimentHandoff]);
  const discardUnsavedArticleV3 = React.useCallback(() => {
    // A save that was already in flight may still complete after the author
    // confirms navigation. Invalidate its UI scope immediately so it cannot
    // adopt the old Draft or navigate back to the canonical Article route.
    saveScopeRef.current.generation += 1;
    discardPendingReturnedSnapshotV3();
  }, [discardPendingReturnedSnapshotV3]);
  useUnsavedChangesGuardV3({
    enabled: hasUnsavedArticleChanges,
    message: t("common.unsavedChanges"),
    onConfirmedDiscard: discardUnsavedArticleV3,
  });

  const startArticleExperimentSessionV3 = React.useCallback(async (input: Readonly<{
    insertionIndex: number;
    replacementBlockId: string | null;
    snapshotId?: string;
    briefing?: ExperimentPlacementBriefingV2;
  }>) => {
    const savedArticle = await saveDraft();
    if (savedArticle === null) return;
    const sessionToken = createArticleExperimentSessionTokenV3();
    articleExperimentHandoff.begin({
      articleId: savedArticle.articleId,
      sessionToken,
      insertionIndex: input.insertionIndex,
      replacementBlockId: input.replacementBlockId,
      briefing: input.briefing ?? null,
    });
    setPickerOpen(false);
    const search = new URLSearchParams({
      articleId: savedArticle.articleId,
      sessionToken,
    });
    if (input.snapshotId !== undefined) {
      search.set("snapshotId", input.snapshotId);
    }
    navigate(`${newExperimentHref(locale)}?${
      search.toString()
    }`);
  }, [
    articleExperimentHandoff,
    locale,
    navigate,
    saveDraft,
  ]);

  const createExperimentFromArticleV3 = React.useCallback(() => {
    void startArticleExperimentSessionV3({
      insertionIndex: pendingExperimentInsertIndexRef.current
        ?? draftRef.current.blocks.length,
      replacementBlockId: pendingExperimentReplacementBlockIdRef.current,
    });
  }, [startArticleExperimentSessionV3]);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void saveDraft();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [saveDraft]);

  const closeInsertMenuV3 = React.useCallback((restoreFocus: boolean) => {
    if (insertMenu === null) return;
    if (restoreFocus && insertMenu.replaceBlockId !== null) {
      setFocusRequest({ blockId: insertMenu.replaceBlockId, caret: "end" });
    }
    setInsertMenu(null);
  }, [insertMenu]);

  React.useEffect(() => {
    if (insertMenu === null && blockMenuId === null && !publishMenuOpen) return;
    const closeMenus = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Element && target.closest("[data-article-block-menu]")) {
        return;
      }
      setInsertMenu(null);
      setBlockMenuId(null);
      setPublishMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      closeInsertMenuV3(true);
      setBlockMenuId(null);
      setPublishMenuOpen(false);
    };
    document.addEventListener("pointerdown", closeMenus);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeMenus);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [blockMenuId, closeInsertMenuV3, insertMenu, publishMenuOpen]);

  const updateBlock = (index: number, block: StudioArticleBlockV2) => {
    updateDraft((current) => ({
      ...current,
      blocks: current.blocks.map((candidate, candidateIndex) =>
        candidateIndex === index ? block : candidate),
    }));
  };

  const removeBlock = (index: number) => {
    updateDraft((current) => ({
      ...current,
      blocks: current.blocks.filter((_, candidateIndex) => candidateIndex !== index),
    }));
  };

  const moveBlock = (index: number, direction: -1 | 1) => {
    updateDraft((current) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.blocks.length) return current;
      const blocks = [...current.blocks];
      [blocks[index], blocks[nextIndex]] = [blocks[nextIndex], blocks[index]];
      return { ...current, blocks };
    });
  };

  const insertTextBlockV3 = (
    kind: ArticleTextBlockKindV3,
    insertionIndex: number,
    replaceBlockId: string | null,
  ) => {
    const blockId = portableArticleEditorIdV3("block");
    let focusTargetId = blockId;
    updateDraft((current) => {
      const template = kind === "paragraph"
        ? { blockId, kind: "paragraph" as const, text: "" }
        : {
            blockId,
            kind: "heading" as const,
            level: kind === "heading" ? 2 as const : 3 as const,
            text: "",
          };
      if (replaceBlockId !== null) {
        const replacementIndex = current.blocks.findIndex((candidate) =>
          candidate.blockId === replaceBlockId);
        const replacement = current.blocks[replacementIndex];
        if (
          replacementIndex >= 0
          && replacement !== undefined
          && isArticleTextBlockV3(replacement)
          && replacement.text.length === 0
        ) {
          focusTargetId = replacement.blockId;
          const blocks = [...current.blocks];
          blocks[replacementIndex] = { ...template, blockId: replacement.blockId };
          return { ...current, blocks };
        }
      }
      return {
        ...current,
        blocks: insertArticleBlockV3(current.blocks, insertionIndex, template),
      };
    });
    setFocusRequest({ blockId: focusTargetId, caret: "end" });
  };

  const insertRichArticleBlockV3 = (
    kind: "equation" | "image" | "divider" | "accordion" | "quiz" | "link",
    insertionIndex: number,
    replaceBlockId: string | null,
  ) => {
    const generatedBlockId = portableArticleEditorIdV3("block");
    const template = createRichArticleBlockTemplateV3(kind, generatedBlockId);
    let insertedBlockId = generatedBlockId;
    let trailingParagraphId: string | null = null;
    updateDraft((current) => {
      let blocks = [...current.blocks];
      let resolvedIndex = Math.max(0, Math.min(insertionIndex, blocks.length));
      if (replaceBlockId !== null) {
        const replacementIndex = blocks.findIndex((candidate) =>
          candidate.blockId === replaceBlockId);
        const replacement = blocks[replacementIndex];
        if (
          replacementIndex >= 0
          && replacement !== undefined
          && isArticleTextBlockV3(replacement)
          && replacement.text.length === 0
        ) {
          insertedBlockId = replacement.blockId;
          blocks[replacementIndex] = { ...template, blockId: replacement.blockId };
          resolvedIndex = replacementIndex + 1;
        } else {
          blocks.splice(resolvedIndex, 0, template);
          resolvedIndex += 1;
        }
      } else {
        blocks.splice(resolvedIndex, 0, template);
        resolvedIndex += 1;
      }
      if (kind === "divider") {
        trailingParagraphId = portableArticleEditorIdV3("block");
        blocks.splice(resolvedIndex, 0, {
          blockId: trailingParagraphId,
          kind: "paragraph",
          text: "",
        });
      }
      return { ...current, blocks: Object.freeze(blocks) };
    });
    setFocusRequest({
      blockId: trailingParagraphId ?? insertedBlockId,
      caret: "start",
    });
  };

  const convertTextBlockV3 = (blockId: string, target: ArticleTextBlockKindV3) => {
    updateDraft((current) => {
      const index = current.blocks.findIndex((candidate) =>
        candidate.blockId === blockId);
      const block = current.blocks[index];
      if (block === undefined || !isArticleTextBlockV3(block)) return current;
      const converted: StudioArticleBlockV2 = target === "paragraph"
        ? { blockId: block.blockId, kind: "paragraph", text: block.text }
        : {
            blockId: block.blockId,
            kind: "heading",
            level: target === "heading" ? 2 : 3,
            text: block.text,
          };
      if (
        converted.kind === block.kind
        && (converted.kind === "paragraph"
          || (block.kind === "heading" && converted.level === block.level))
      ) return current;
      const blocks = [...current.blocks];
      blocks[index] = converted;
      return { ...current, blocks };
    });
    setBlockMenuId(null);
    setFocusRequest({ blockId, caret: "end" });
  };

  const applyHeadingShortcutV3 = (
    index: number,
    blockId: string,
    shortcut: Readonly<{ level: 2 | 3; rest: string }>,
  ) => {
    updateDraft((current) => {
      const block = current.blocks[index];
      if (block === undefined || block.kind !== "paragraph") return current;
      const blocks = [...current.blocks];
      blocks[index] = {
        blockId: block.blockId,
        kind: "heading",
        level: shortcut.level,
        text: shortcut.rest,
      };
      return { ...current, blocks };
    });
    setFocusRequest({ blockId, caret: "end" });
  };

  const splitTextBlock = (
    index: number,
    selectionStart: number,
    selectionEnd: number,
  ) => {
    const nextBlockId = portableArticleEditorIdV3("block");
    updateDraft((current) => {
      const currentBlock = current.blocks[index];
      if (
        currentBlock === undefined
        || !isArticleTextBlockV3(currentBlock)
      ) return current;
      const { before, after } = splitArticleTextSelectionV3({
        text: currentBlock.text,
        selectionStart,
        selectionEnd,
      });
      const nextBlock = {
        blockId: nextBlockId,
        kind: "paragraph" as const,
        text: after,
      };
      const blocks = [...current.blocks];
      blocks[index] = { ...currentBlock, text: before };
      blocks.splice(index + 1, 0, nextBlock);
      return { ...current, blocks };
    });
    setFocusRequest({ blockId: nextBlockId, caret: "start" });
  };

  const removeEmptyTextBlock = (index: number) => {
    const previous = draftRef.current.blocks[index - 1];
    removeBlock(index);
    if (previous !== undefined && isArticleTextBlockV3(previous)) {
      setFocusRequest({ blockId: previous.blockId, caret: "end" });
    }
  };

  const mergeTextBlockIntoPreviousV3 = (index: number) => {
    const blocks = draftRef.current.blocks;
    const block = blocks[index];
    const previous = blocks[index - 1];
    if (
      block === undefined || !isArticleTextBlockV3(block)
      || previous === undefined || !isArticleTextBlockV3(previous)
    ) return;
    const caret = previous.text.length;
    updateDraft((current) => {
      const mergeBlock = current.blocks[index];
      const mergeTarget = current.blocks[index - 1];
      if (
        mergeBlock === undefined || !isArticleTextBlockV3(mergeBlock)
        || mergeTarget === undefined || !isArticleTextBlockV3(mergeTarget)
      ) return current;
      const merged = [...current.blocks];
      merged[index - 1] = {
        ...mergeTarget,
        text: mergeTarget.text + mergeBlock.text,
      };
      merged.splice(index, 1);
      return { ...current, blocks: merged };
    });
    setFocusRequest({ blockId: previous.blockId, caret });
  };

  const focusNearestTextBlockV3 = (fromIndex: number, direction: -1 | 1) => {
    const blocks = draftRef.current.blocks;
    for (
      let index = fromIndex + direction;
      index >= 0 && index < blocks.length;
      index += direction
    ) {
      const candidate = blocks[index];
      if (candidate !== undefined && isArticleTextBlockV3(candidate)) {
        setFocusRequest({
          blockId: candidate.blockId,
          caret: direction === -1 ? "end" : "start",
        });
        return;
      }
    }
  };

  const startWritingAtEndV3 = () => {
    const blocks = draftRef.current.blocks;
    const last = blocks[blocks.length - 1];
    if (
      last !== undefined
      && isArticleTextBlockV3(last)
      && last.text.length === 0
    ) {
      setFocusRequest({ blockId: last.blockId, caret: "end" });
      return;
    }
    insertTextBlockV3("paragraph", blocks.length, null);
  };

  const openInsertMenuFromSlashV3 = (index: number, blockId: string) => {
    setBlockMenuId(null);
    setInsertMenu({
      anchorBlockId: blockId,
      insertionIndex: index,
      replaceBlockId: blockId,
    });
  };

  const handleInsertOptionV3 = (kind: ArticleInsertOptionKindV3) => {
    if (insertMenu === null) return;
    if (kind === "experiment") {
      pendingExperimentInsertIndexRef.current = insertMenu.insertionIndex;
      pendingExperimentReplacementBlockIdRef.current = insertMenu.replaceBlockId;
      setInsertMenu(null);
      setPickerOpen(true);
      return;
    }
    if (kind === "paragraph" || kind === "heading" || kind === "subheading") {
      insertTextBlockV3(kind, insertMenu.insertionIndex, insertMenu.replaceBlockId);
    } else {
      insertRichArticleBlockV3(
        kind,
        insertMenu.insertionIndex,
        insertMenu.replaceBlockId,
      );
    }
    setInsertMenu(null);
  };

  const addExperiment = (snapshot: ExperimentSnapshotV2) => {
    insertExperimentSnapshotV3({
      insertionIndex: pendingExperimentInsertIndexRef.current
        ?? draftRef.current.blocks.length,
      replacementBlockId: pendingExperimentReplacementBlockIdRef.current,
      snapshot,
    });
    pendingExperimentInsertIndexRef.current = null;
    pendingExperimentReplacementBlockIdRef.current = null;
    setPickerOpen(false);
  };

  const selectSnapshotForArticleV3 = async (
    item: ArticleSnapshotPickerItemV3,
  ): Promise<void> => {
    try {
      const cached = snapshots.find((snapshot) =>
        snapshot.snapshotId === item.snapshotId) ?? null;
      const snapshot = cached ?? (remoteRepository === null
        ? store.readSnapshot(item.snapshotId)
        : await remoteRepository.readSnapshot(item.snapshotId));
      if (snapshot === null) {
        throw new Error(`Snapshot not found: ${item.snapshotId}`);
      }
      setSnapshots((existing) => Object.freeze([
        snapshot,
        ...existing.filter((candidate) =>
          candidate.snapshotId !== snapshot.snapshotId),
      ]));
      addExperiment(snapshot);
    } catch (cause) {
      setStatus("error");
      setError(articleEditorErrorMessageV3(cause));
      throw cause;
    }
  };

  const setArticleVisibilityV3 = (visibility: "draft" | "public") => {
    updateDraft((current) => current.visibility === visibility
      ? current
      : { ...current, visibility });
    void saveDraft();
  };

  const retryEditorErrorV3 = React.useCallback(() => {
    const alreadyPersisted = remoteRepository !== null
      ? remoteSavedArticleIdRef.current !== null
      : store.readArticle(draftRef.current.articleId) !== null;
    const action = articleEditorRetryActionV3({
      alreadyPersisted,
      hasUnsaved: hasUnsavedRef.current,
      routeHydrated,
    });
    if (action === "reload") {
      window.location.reload();
    } else if (action === "save") {
      void saveDraft();
    } else {
      // Errors from optional operations (for example reading a selected
      // Snapshot) are not save failures. Dismiss them without creating or
      // rewriting an otherwise clean Article.
      setStatus(action === "dismiss-saved" ? "saved" : "idle");
      setError(null);
    }
  }, [remoteRepository, routeHydrated, saveDraft, store]);

  const commitBlockDropV3 = () => {
    if (draggedBlockId !== null && dropBoundary !== null) {
      const blockId = draggedBlockId;
      const boundary = dropBoundary;
      updateDraft((current) => {
        const blocks = moveArticleBlockToBoundaryV3(
          current.blocks,
          blockId,
          boundary,
        );
        return blocks === current.blocks ? current : { ...current, blocks };
      });
    }
    setDraggedBlockId(null);
    setDropBoundary(null);
  };

  const articleSnapshotById = React.useMemo(
    () => new Map(snapshots.map((snapshot) => [snapshot.snapshotId, snapshot])),
    [snapshots],
  );
  const selectedPeek = React.useMemo(() => {
    if (peekBlockId === null) return null;
    const index = draft.blocks.findIndex(({ blockId }) => blockId === peekBlockId);
    if (index < 0) return null;
    const block = draft.blocks[index];
    if (block === undefined || block.kind !== "experiment") return null;
    const snapshot = articleSnapshotById.get(block.placement.snapshotId) ?? null;
    return snapshot === null ? null : Object.freeze({ block, index, snapshot });
  }, [articleSnapshotById, draft.blocks, peekBlockId]);
  React.useEffect(() => {
    if (peekBlockId !== null && selectedPeek === null) closeEditorPeekV3();
  }, [closeEditorPeekV3, peekBlockId, selectedPeek]);
  const persistedArticle = routeArticleId !== undefined
    && routeArticleId !== "new";
  const draggedBlockIndex = draggedBlockId === null
    ? -1
    : draft.blocks.findIndex((block) => block.blockId === draggedBlockId);
  const visibleDropBoundary = dropBoundary !== null
    && draggedBlockIndex >= 0
    && dropBoundary !== draggedBlockIndex
    && dropBoundary !== draggedBlockIndex + 1
    ? dropBoundary
    : null;

  return (
    <div
      className="flex h-full min-h-0 flex-col overflow-hidden bg-wb-app text-wb-text"
      data-testid="article-editor-v3"
    >
      <header className="z-30 flex h-12 shrink-0 items-center gap-1 bg-wb-header px-2.5 shadow-[inset_0_-1px_0_var(--wb-border)] sm:px-4">
        <Link
          to={myArticlesHref(locale)}
          aria-label={t("articleReader.backToArticles")}
          title={t("articleReader.backToArticles")}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-wb-muted transition-[color,background-color,transform] duration-150 hover:bg-wb-hover hover:text-wb-text active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wb-accent"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        </Link>
        <span className="min-w-0 flex-1" />
        <ArticleEditorSaveStatusV3
          persisted={persistedArticle}
          status={status}
          onRetry={retryEditorErrorV3}
        />
        {persistedArticle && (
          <a
            href={articlePreviewHref({ articleId: draft.articleId, locale })}
            target="_blank"
            rel="noreferrer"
            aria-label={t("articleEditor.preview")}
            title={t("articleEditor.preview")}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-wb-muted transition-[color,background-color,transform] duration-150 hover:bg-wb-hover hover:text-wb-text active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wb-accent"
          >
            <BookOpen className="h-4 w-4" aria-hidden="true" />
          </a>
        )}
        <ArticlePublishMenuV3
          articleHref={articleReaderHref({ articleId: draft.articleId, locale })}
          disabled={!routeHydrated}
          open={publishMenuOpen}
          saving={status === "saving"}
          visibility={draft.visibility}
          tags={draft.tags}
          onEditTags={() => {
            setPublishMenuOpen(false);
            window.requestAnimationFrame(() => {
              tagInputRef.current?.focus();
              tagInputRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
            });
          }}
          onToggleOpen={() => {
            setInsertMenu(null);
            setBlockMenuId(null);
            setPublishMenuOpen((current) => !current);
          }}
          onSetVisibility={setArticleVisibilityV3}
        />
      </header>

      <div
        ref={splitRef}
        className="article-reader-split relative flex min-h-0 flex-1 overflow-hidden"
        data-peek-mounted={peekBlockId === null ? "false" : "true"}
        data-peek-open={peekOpen ? "true" : "false"}
        data-peek-dragging={peekDragging ? "true" : "false"}
        data-peek-maximized={peekMaximized ? "true" : "false"}
        style={{
          "--article-reader-peek-width": peekMaximized
            ? "100%"
            : `${peekFraction * 100}%`,
        } as React.CSSProperties}
      >
      <main
        className="article-reader-article-pane min-w-0 flex-1 overflow-y-auto overscroll-contain"
        aria-busy={!routeHydrated}
        data-route-hydrated={routeHydrated ? "true" : "false"}
        inert={!routeHydrated}
      >
        <ArticleReadingProviderV1 blocks={draft.blocks}>
        <article className="article-document article-document-shell">
          <textarea
            ref={titleRef}
            rows={1}
            value={draft.title}
            onChange={(event) => updateDraft((current) => ({
              ...current,
              title: event.currentTarget.value,
            }))}
            onKeyDown={(event) => {
              if (articleEditorInputIsComposingV3(event.nativeEvent)) return;
              if (event.key === "Enter") {
                event.preventDefault();
                const first = draftRef.current.blocks[0];
                if (first !== undefined && isArticleTextBlockV3(first)) {
                  setFocusRequest({ blockId: first.blockId, caret: "start" });
                } else {
                  insertTextBlockV3("paragraph", 0, null);
                }
                return;
              }
              if (event.key === "ArrowDown") {
                const blocks = draftRef.current.blocks;
                if (blocks.some(isArticleTextBlockV3)) {
                  event.preventDefault();
                  focusNearestTextBlockV3(-1, 1);
                }
              }
            }}
            placeholder={t("articleEditor.titlePlaceholder")}
            aria-label={t("articleEditor.title")}
            className="article-title article-editor-title block w-full resize-none overflow-hidden bg-transparent outline-none placeholder:text-wb-subtle"
          />
          <ArticleEditorTagsV1
            ref={tagInputRef}
            tags={draft.tags}
            suggestions={tagSuggestions}
            disabled={!routeHydrated}
            onChange={(tags) => updateDraft((current) => ({ ...current, tags }))}
          />

          {error !== null && (
            <p className="mt-6 rounded-xl bg-wb-danger-soft px-4 py-3 text-xs leading-5 text-wb-danger" role="alert">
              {error}
            </p>
          )}

          {routeHydrated
            && draft.blocks.length === 0
            && snapshotPickerItems.length === 0 && (
            <div className="mt-8 rounded-xl bg-wb-soft/60 px-4 py-4 sm:flex sm:items-center sm:justify-between sm:gap-4">
              <div>
                <p className="text-sm font-medium">{t("articleEditor.emptySnapshots.title")}</p>
                <p className="mt-1 text-xs leading-5 text-wb-muted">
                  {t("articleEditor.emptySnapshots.description")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  pendingExperimentInsertIndexRef.current =
                    draftRef.current.blocks.length;
                  pendingExperimentReplacementBlockIdRef.current = null;
                  createExperimentFromArticleV3();
                }}
                className="mt-3 inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-wb-accent transition-[background-color,transform] duration-150 hover:bg-wb-hover active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wb-accent sm:mt-0"
              >
                {t("articleEditor.emptySnapshots.createExperiment")}
                <ArrowLeft className="h-3.5 w-3.5 rotate-180" />
              </button>
            </div>
          )}

          <div className="mt-6" data-testid="article-blocks-v3">
            {draft.blocks.map((block, index) => {
              const placementSnapshot = block.kind === "experiment"
                ? articleSnapshotById.get(block.placement.snapshotId) ?? null
                : null;
              const placementContract = placementSnapshot === null
                ? null
                : compositionBySnapshotId.get(placementSnapshot.snapshotId)
                    ?.modelSurface.contract ?? null;
              const previousBlock = draft.blocks[index - 1];
              const hasTextAbove = draft.blocks.slice(0, index)
                .some(isArticleTextBlockV3);
              const hasTextBelow = draft.blocks.slice(index + 1)
                .some(isArticleTextBlockV3);
              return (
                <ArticleBlockShellV3
                  key={block.blockId}
                  blockId={block.blockId}
                  blockKind={block.kind}
                  index={index}
                  total={draft.blocks.length}
                  insertMenuOpen={insertMenu?.anchorBlockId === block.blockId}
                  blockMenuOpen={blockMenuId === block.blockId}
                  dragging={draggedBlockId === block.blockId}
                  dropIndicator={visibleDropBoundary === index
                    ? "top"
                    : index === draft.blocks.length - 1
                        && visibleDropBoundary === draft.blocks.length
                      ? "bottom"
                      : null}
                  onOpenInsertMenu={() => {
                    setBlockMenuId(null);
                    setInsertMenu((current) =>
                      current?.anchorBlockId === block.blockId
                        ? null
                        : {
                            anchorBlockId: block.blockId,
                            insertionIndex: index + 1,
                            replaceBlockId: null,
                          });
                  }}
                  onSelectInsertOption={handleInsertOptionV3}
                  onCloseInsertMenu={() => closeInsertMenuV3(true)}
                  onToggleBlockMenu={() => {
                    setInsertMenu(null);
                    setBlockMenuId((current) => current === block.blockId
                      ? null
                      : block.blockId);
                  }}
                  convertTarget={!isArticleTextBlockV3(block)
                    ? null
                    : block.kind === "paragraph"
                      ? "paragraph"
                      : block.level === 2 ? "heading" : "subheading"}
                  onConvert={(target) => convertTextBlockV3(block.blockId, target)}
                  onMove={(direction) => {
                    moveBlock(index, direction);
                    setBlockMenuId(null);
                  }}
                  onRemove={() => {
                    removeBlock(index);
                    setBlockMenuId(null);
                  }}
                  onDragStart={() => {
                    setInsertMenu(null);
                    setBlockMenuId(null);
                    setDraggedBlockId(block.blockId);
                  }}
                  onDragEnd={() => {
                    setDraggedBlockId(null);
                    setDropBoundary(null);
                  }}
                  onDragOverBoundary={(boundary) => {
                    if (draggedBlockId !== null) setDropBoundary(boundary);
                  }}
                  onDrop={commitBlockDropV3}
                >
                  {block.kind === "experiment" ? (
                    <ArticleExperimentPlacementV3
                      block={block}
                      snapshot={placementSnapshot}
                      contract={placementContract}
                      index={index}
                      total={draft.blocks.length}
                      blockEditorLayout
                      showBlockActions={false}
                      onChange={(next) => updateBlock(index, next)}
                      onEdit={() => openEditorPeekV3(block.blockId)}
                      onRemove={() => removeBlock(index)}
                      onMove={(direction) => moveBlock(index, direction)}
                    />
                  ) : block.kind === "equation" ? (
                    <ArticleEquationBlockEditorV3
                      block={block}
                      focus={focusRequest?.blockId === block.blockId}
                      onFocusHandled={() => setFocusRequest(null)}
                      onChange={(next) => updateBlock(index, next)}
                    />
                  ) : block.kind === "image" ? (
                    <ArticleImageBlockEditorV3
                      block={block}
                      focus={focusRequest?.blockId === block.blockId}
                      onFocusHandled={() => setFocusRequest(null)}
                      onChange={(next) => updateBlock(index, next)}
                      onUpload={remoteRepository === null
                        ? undefined
                        : (file) => remoteRepository.uploadArticleImage(file)}
                    />
                  ) : block.kind === "divider" ? (
                    <ArticleDividerPresentationV3 block={block} className="my-5" />
                  ) : block.kind === "link" ? (
                    <ArticleLinkBlockEditorV3
                      block={block}
                      focus={focusRequest?.blockId === block.blockId}
                      onFocusHandled={() => setFocusRequest(null)}
                      onChange={(next) => updateBlock(index, next)}
                    />
                  ) : block.kind === "quiz" ? (
                    <ArticleQuizBlockEditorV3
                      block={block}
                      focus={focusRequest?.blockId === block.blockId}
                      onFocusHandled={() => setFocusRequest(null)}
                      onChange={(next) => updateBlock(index, next)}
                    />
                  ) : block.kind === "accordion" ? (
                    <ArticleAccordionBlockEditorV3
                      block={block}
                      focus={focusRequest?.blockId === block.blockId}
                      onFocusHandled={() => setFocusRequest(null)}
                      onChange={(next) => updateBlock(index, next)}
                      onUpload={remoteRepository === null
                        ? undefined
                        : (file) => remoteRepository.uploadArticleImage(file)}
                    />
                  ) : (
                    <ArticleTextBlockV3
                      block={block}
                      focusCaret={focusRequest?.blockId === block.blockId
                        ? focusRequest.caret
                        : null}
                      onFocusHandled={() => setFocusRequest(null)}
                      onChange={(next) => updateBlock(index, next)}
                      onHeadingShortcut={(shortcut) =>
                        applyHeadingShortcutV3(index, block.blockId, shortcut)}
                      onDeleteEmpty={() => removeEmptyTextBlock(index)}
                      onMergeWithPrevious={
                        previousBlock !== undefined
                          && isArticleTextBlockV3(previousBlock)
                          ? () => mergeTextBlockIntoPreviousV3(index)
                          : undefined
                      }
                      onFocusPrevious={hasTextAbove
                        ? () => focusNearestTextBlockV3(index, -1)
                        : undefined}
                      onFocusNext={hasTextBelow
                        ? () => focusNearestTextBlockV3(index, 1)
                        : undefined}
                      onOpenInsertMenu={() =>
                        openInsertMenuFromSlashV3(index, block.blockId)}
                      onSplit={(selectionStart, selectionEnd) =>
                        splitTextBlock(index, selectionStart, selectionEnd)}
                    />
                  )}
                </ArticleBlockShellV3>
              );
            })}
          </div>

          <button
            type="button"
            aria-label={t("articleEditor.slashHint")}
            data-testid="article-end-writing-area-v3"
            onClick={startWritingAtEndV3}
            onDragOver={(event) => {
              if (draggedBlockId === null) return;
              event.preventDefault();
              setDropBoundary(draft.blocks.length);
            }}
            onDrop={(event) => {
              event.preventDefault();
              commitBlockDropV3();
            }}
            className={`block w-full cursor-text rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-wb-accent ${draft.blocks.length === 0 ? "py-2" : "min-h-28 py-3"}`}
          >
            {draft.blocks.length === 0 && (
              <span className="text-[15px] leading-7 text-wb-subtle">
                {t("articleEditor.slashHint")}
              </span>
            )}
          </button>
        </article>
        </ArticleReadingProviderV1>
      </main>

      <div
        role="separator"
        aria-orientation="vertical"
        aria-label={t("articleReader.resizeExperiment")}
        aria-valuemin={Math.round(ARTICLE_EDITOR_PEEK_MIN_FRACTION_V3 * 100)}
        aria-valuemax={100}
        aria-valuenow={peekMaximized ? 100 : Math.round(peekFraction * 100)}
        tabIndex={peekOpen ? 0 : -1}
        className="article-reader-peek-divider group z-10 shrink-0 touch-none outline-none"
        data-testid="article-editor-peek-divider-v3"
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          event.preventDefault();
          setPeekMaximized(false);
          event.currentTarget.setPointerCapture(event.pointerId);
          peekDraggingRef.current = true;
          setPeekDragging(true);
          resizePeekFromPointer(event.clientX);
        }}
        onPointerMove={(event) => {
          if (peekDraggingRef.current) resizePeekFromPointer(event.clientX);
        }}
        onPointerUp={(event) => {
          if (!peekDraggingRef.current) return;
          resizePeekFromPointer(event.clientX);
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
          const next = pendingPeekFractionRef.current;
          setPeekFraction(next);
          persistPeekFraction(next);
          peekDraggingRef.current = false;
          setPeekDragging(false);
        }}
        onPointerCancel={() => {
          peekDraggingRef.current = false;
          setPeekDragging(false);
        }}
        onKeyDown={(event) => {
          if (event.key === "End") {
            event.preventDefault();
            setPeekMaximized(true);
            return;
          }
          let next: number | null = null;
          if (event.key === "ArrowLeft") {
            if (peekMaximized) return;
            next = peekFraction + 0.025;
          } else if (event.key === "ArrowRight") {
            setPeekMaximized(false);
            next = peekMaximized
              ? ARTICLE_EDITOR_PEEK_MAX_FRACTION_V3
              : peekFraction - 0.025;
          } else if (event.key === "Home") {
            setPeekMaximized(false);
            next = ARTICLE_EDITOR_PEEK_MIN_FRACTION_V3;
          }
          if (next === null) return;
          event.preventDefault();
          const clamped = clampArticleEditorPeekFractionV3(next);
          pendingPeekFractionRef.current = clamped;
          setPeekFraction(clamped);
          persistPeekFraction(clamped);
        }}
      >
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-wb-line transition-[width,background-color] duration-150 group-hover:w-0.5 group-hover:bg-wb-accent group-focus-visible:w-0.5 group-focus-visible:bg-wb-accent"
        />
      </div>

      <aside
        aria-hidden={!peekOpen}
        aria-label={t("articleReader.drawerTitle")}
        className="article-reader-peek-column min-w-0 shrink-0 overflow-hidden"
        data-testid="article-editor-peek-column-v3"
        inert={!peekOpen}
      >
        <div
          ref={setPeekPortalHost}
          className="article-reader-peek-host h-full"
          data-testid="article-editor-peek-host-v3"
        />
      </aside>

      {selectedPeek !== null && (
        <div className="pointer-events-none absolute h-0 w-0 overflow-hidden" aria-hidden="true">
          <ArticleReaderExperimentV3
            block={selectedPeek.block}
            snapshot={selectedPeek.snapshot}
            contract={compositionBySnapshotId.get(
              selectedPeek.snapshot.snapshotId,
            )?.modelSurface.contract ?? null}
            runtimeComposition={compositionBySnapshotId.get(
              selectedPeek.snapshot.snapshotId,
            ) ?? null}
            live
            expandedPresentation="peek"
            peekPortalHost={peekPortalHost}
            peekMaximized={peekMaximized}
            onActivate={() => undefined}
            onDeactivate={() => undefined}
            onClose={closeEditorPeekV3}
            onExpand={() => undefined}
            onOpenExperimentSession={() => {
              void startArticleExperimentSessionV3({
                insertionIndex: selectedPeek.index,
                replacementBlockId: selectedPeek.block.blockId,
                snapshotId: selectedPeek.block.placement.snapshotId,
                briefing: selectedPeek.block.placement.briefing,
              });
            }}
            onPeekMaximizedChange={setPeekMaximized}
            onTitleCommit={(title) => {
              const normalized = title.trim();
              const fallback = selectedPeek.block.placement.briefing.defaultTitle;
              updateBlock(selectedPeek.index, Object.freeze({
                ...selectedPeek.block,
                placement: Object.freeze({
                  ...selectedPeek.block.placement,
                  titleOverride:
                    normalized.length === 0 || normalized === fallback
                      ? null
                      : normalized,
                }),
              }));
            }}
          />
        </div>
      )}
      </div>

      <ArticleSnapshotPickerDialogV3
        open={pickerOpen}
        snapshots={snapshotPickerItems}
        onCreateExperiment={createExperimentFromArticleV3}
        onClose={() => {
          pendingExperimentInsertIndexRef.current = null;
          pendingExperimentReplacementBlockIdRef.current = null;
          setPickerOpen(false);
        }}
        onSelect={selectSnapshotForArticleV3}
      />
    </div>
  );
}

export default ArticleEditorPage;

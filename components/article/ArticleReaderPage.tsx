import { readStudioPublicArticleAsyncV1 } from "@/studio/infrastructure/browser/StudioPublicArticleLoaderV1";
import { ResourceAuthorV1 } from "@/components/site/PublicAuthorV1";
import { ArticleCourseNavigationV1 } from "@/components/course/ArticleCourseNavigationV1";
import { courseUuidV1 } from "@/studio/application/course/StudioCourseV1";
import React from "react";
import { ArticleReadingProviderV1, ArticleReadingTextV1, ArticleEndMatterV1, ArticleTableOfContentsV1, ArticleHeadingTextV1 } from "@/components/article/ArticleReadingV1";
import { articleReadingFieldV1 } from "@/studio/application/article/StudioArticleReadingV1";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import type { ArticleReaderExpandedPresentationV3 } from "@/components/article/reader/ArticleReaderExperimentV3";
import { articleReaderPlacementAfterViewportExitV3 } from "@/components/article/reader/ArticleReaderPlacementV3";
import { ArticleReaderDeferredExperimentV1 } from "@/components/article/reader/ArticleReaderDeferredExperimentV1";
import { ArticleLoadingSkeletonV1 } from "./ArticleLoadingSkeletonV1";
import {
  ArticleAccordionPresentationV3,
  ArticleAccordionContentPresentationV3,
  ArticleDividerPresentationV3,
  ArticleEquationPresentationV3,
  ArticleImagePresentationV3,
  ArticleLinkPresentationV3,
  ArticleQuizPresentationV3,
} from "@/components/article/ArticleRichBlockV3";
import {
  articleReaderHref,
  newExperimentHref,
} from "@/homeLinks";
import {
  completePublicStaticContentHandoffV1,
} from "@/components/site/PublicStaticContentHandoffV1";
import { isLocale, localeFromPathname } from "@/localeRouting";
import type {
  StudioArticleDraftV2,
} from "@/studio/contracts/v2/article";
import {
  publishedArticleDraftProjectionV1,
} from "@/studio/application/publication/StudioPublishedArticleV1";
import {
  readStudioPublicArticleBootstrapV1,
} from "@/studio/application/publication/StudioPublicArticleBootstrapV1";
import {
  formatStudioPublicArticleDateV1,
  studioPublicArticlePresentationCopyV1,
} from "@/studio/application/publication/StudioPublicArticlePresentationV1";
import type {
  ExperimentSnapshotV2,
} from "@/studio/contracts/v2/content";
import {
  BrowserContentStore,
} from "@/studio/infrastructure/browser/BrowserContentStore";
import {
  createStudioSupabaseContentRepositoryV1,
} from "@/studio/infrastructure/supabase/StudioSupabaseContentRepositoryV1";
import {
  type StudioReaderContinuationV3,
  createExperimentSessionTokenV3,
  StudioExperimentSessionHandoffStoreV3,
} from "@/studio/infrastructure/browser/StudioExperimentSessionHandoffV3";

type ArticleReaderContentStateV3 =
  | Readonly<{ kind: "loading" }>
  | Readonly<{
      kind: "ready";
      article: StudioArticleDraftV2;
      canonicalPublicSlug: string | null;
      publishedAt: string | null;
    }>
  | Readonly<{ kind: "missing" }>
  | Readonly<{ kind: "error"; message: string }>;

type ArticleReaderExpandedPlacementV3 = Readonly<{
  placementId: string;
  presentation: ArticleReaderExpandedPresentationV3;
}>;

const ARTICLE_READER_PEEK_FRACTION_STORAGE_KEY_V3 =
  "circleheart.article-reader.peek-fraction.v3";
const ARTICLE_READER_PEEK_DEFAULT_FRACTION_V3 = 0.46;
const ARTICLE_READER_PEEK_MIN_FRACTION_V3 = 0.3;
const ARTICLE_READER_PEEK_MAX_FRACTION_V3 = 0.64;

export function clampArticleReaderPeekFractionV3(value: number): number {
  if (!Number.isFinite(value)) return ARTICLE_READER_PEEK_DEFAULT_FRACTION_V3;
  return Math.min(
    ARTICLE_READER_PEEK_MAX_FRACTION_V3,
    Math.max(ARTICLE_READER_PEEK_MIN_FRACTION_V3, value),
  );
}

export function articleReaderPeekFractionForPointerV3(
  shellLeft: number,
  shellWidth: number,
  pointerClientX: number,
): number {
  if (!Number.isFinite(shellWidth) || shellWidth <= 0) {
    return ARTICLE_READER_PEEK_DEFAULT_FRACTION_V3;
  }
  return clampArticleReaderPeekFractionV3(
    (shellLeft + shellWidth - pointerClientX) / shellWidth,
  );
}

function initialArticleReaderPeekFractionV3(): number {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return ARTICLE_READER_PEEK_DEFAULT_FRACTION_V3;
  }
  try {
    const raw = window.localStorage.getItem(
      ARTICLE_READER_PEEK_FRACTION_STORAGE_KEY_V3,
    );
    return raw === null
      ? ARTICLE_READER_PEEK_DEFAULT_FRACTION_V3
      : clampArticleReaderPeekFractionV3(Number(raw));
  } catch {
    return ARTICLE_READER_PEEK_DEFAULT_FRACTION_V3;
  }
}

export function ArticleReaderPage() {
  const location = useLocation();
  const { articleId } = useParams();
  return (
    <ArticleReaderV3Resource
      key={articleId ?? "missing-article"}
      articleId={articleId}
      hash={location.hash}
      pathname={location.pathname}
      search={location.search}
    />
  );
}

function ArticleReaderV3Resource({
  articleId,
  hash,
  pathname,
  search,
}: Readonly<{
  articleId: string | undefined;
  hash: string;
  pathname: string;
  search: string;
}>) {
  const { t } = useTranslation();
  const locale = localeFromPathname(pathname);
  const authoredPreview = /\/articles\/[^/]+\/preview\/?$/.test(pathname);
  const navigate = useNavigate();
  const store = React.useMemo(() => new BrowserContentStore(), []);
  const remoteRepository = React.useMemo(
    createStudioSupabaseContentRepositoryV1,
    [],
  );
  const experimentSessionHandoff = React.useMemo(
    () => new StudioExperimentSessionHandoffStoreV3(),
    [],
  );
  const bootstrapArticle = React.useMemo(
    () => authoredPreview
      ? null
      : readStudioPublicArticleBootstrapV1(articleId),
    [articleId, authoredPreview],
  );
  const [content, setContent] = React.useState<ArticleReaderContentStateV3>({
    kind: "loading",
  });
  const loadSnapshot = React.useMemo(() => {
    const pending = new Map<string, Promise<ExperimentSnapshotV2 | null>>();
    return (snapshotId: string) => {
      const existing = pending.get(snapshotId);
      if (existing) return existing;
      const request = Promise.resolve().then(() => remoteRepository
        ? remoteRepository.readSnapshot(snapshotId) : store.readSnapshot(snapshotId));
      pending.set(snapshotId, request);
      const clear = () => { pending.delete(snapshotId); };
      void request.then(clear, clear);
      return request;
    };
  }, [remoteRepository, store]);
  const [activePlacementId, setActivePlacementId] = React.useState<string | null>(
    null,
  );
  const visibleInlinePlacementsRef = React.useRef(new Set<string>());
  const [expandedPlacement, setExpandedPlacement] =
    React.useState<ArticleReaderExpandedPlacementV3 | null>(null);
  const [peekOpen, setPeekOpen] = React.useState(false);
  const [peekPortalHost, setPeekPortalHost] =
    React.useState<HTMLDivElement | null>(null);
  const [peekFraction, setPeekFraction] = React.useState(
    initialArticleReaderPeekFractionV3,
  );
  const [peekMaximized, setPeekMaximized] = React.useState(false);
  const [peekDragging, setPeekDragging] = React.useState(false);
  const splitRef = React.useRef<HTMLDivElement>(null);
  const peekCloseTimerRef = React.useRef<number | null>(null);
  const peekResizeFrameRef = React.useRef<number | null>(null);
  const peekDraggingRef = React.useRef(false);
  const pendingPeekFractionRef = React.useRef(peekFraction);
  React.useEffect(() => {
    let current = true;
    const load = async () => {
      if (articleId === undefined) {
        setContent({ kind: "missing" });
        return;
      }
      const publishedArticle = bootstrapArticle
        ?? (authoredPreview || remoteRepository === null
          ? null
          : await readStudioPublicArticleAsyncV1(articleId));
      const article = publishedArticle === null
        ? remoteRepository === null
          ? store.readArticle(articleId)
          : await remoteRepository.readArticle(articleId)
        : publishedArticleDraftProjectionV1(publishedArticle);
      if (!current) return;
      if (article === null) {
        setContent({ kind: "missing" });
        return;
      }
      if (current) {
        setContent({
          kind: "ready",
          article,
          canonicalPublicSlug: publishedArticle?.publicSlug ?? null,
          publishedAt: publishedArticle?.publishedAt ?? null,
        });
      }
    };
    void load().catch((error) => {
      if (current) {
        setContent({
          kind: "error",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    });
    return () => {
      current = false;
    };
  }, [articleId, authoredPreview, bootstrapArticle, remoteRepository, store]);
  React.useEffect(() => {
    if (content.kind === "ready") {
      completePublicStaticContentHandoffV1();
    }
  }, [content.kind]);
  React.useEffect(() => {
    if (
      content.kind !== "ready"
      || content.canonicalPublicSlug === null
      || (articleId === content.canonicalPublicSlug && content.article.locale === locale)
    ) return;
    const course=new URLSearchParams(search).get("course");
    navigate(articleReaderHref({
      articleId: content.canonicalPublicSlug,
      locale: isLocale(content.article.locale) ? content.article.locale : locale,
    }) + (course && courseUuidV1.test(course) ? `?course=${course}` : "") + hash, { replace: true });
  }, [articleId, content, locale, navigate, search, hash]);
  const openExperimentSessionV3 = React.useCallback((snapshotId: string, placementId: string, continuation?: StudioReaderContinuationV3) => {
    const sessionToken = createExperimentSessionTokenV3();
    const returnHref = `${pathname}${search}#${encodeURIComponent(`placement-${placementId}`)}`;
    experimentSessionHandoff.begin({
      sessionToken,
      snapshotId,
      returnHref,
      ...(continuation ? { continuation } : {}),
    });
    const query = new URLSearchParams({ sessionToken, snapshotId });
    // Preserve the embedded simulation's reading position for both the header
    // arrow and browser Back, including after a reload or the first Save.
    navigate(returnHref, { replace: true });
    navigate(`${newExperimentHref(locale)}?${query.toString()}`);
  }, [experimentSessionHandoff, locale, navigate, pathname, search]);

  const scrollAnchorRef = React.useRef<{ element: Element; top: number; host: HTMLElement } | null>(null);
  const rememberReadingPosition = React.useCallback(() => {
    const host = document.querySelector<HTMLElement>(".article-reader-article-pane");
    if (!host) return;
    const top = host.getBoundingClientRect().top;
    const element = [...host.querySelectorAll(".article-document > *")].find(el => el.getBoundingClientRect().bottom > top + 8);
    if (element) scrollAnchorRef.current = { element, top: element.getBoundingClientRect().top, host };
  }, []);
  React.useLayoutEffect(() => {
    const anchor = scrollAnchorRef.current;
    if (!anchor) return;
    let frame = 0;
    const end = performance.now() + 320;
    const cancel = () => { cancelAnimationFrame(frame); scrollAnchorRef.current = null; };
    const follow = () => {
      if (scrollAnchorRef.current !== anchor || !anchor.element.isConnected) return;
      anchor.host.scrollTop += anchor.element.getBoundingClientRect().top - anchor.top;
      if (performance.now() < end) frame = requestAnimationFrame(follow);
    };
    follow();
    document.addEventListener("pointerdown", cancel, { passive: true });
    document.addEventListener("keydown", cancel);
    anchor.host.addEventListener("wheel", cancel, { passive: true });
    anchor.host.addEventListener("touchstart", cancel, { passive: true });
    return () => { cancelAnimationFrame(frame); document.removeEventListener("pointerdown", cancel); document.removeEventListener("keydown", cancel); anchor.host.removeEventListener("wheel", cancel); anchor.host.removeEventListener("touchstart", cancel); };
  }, [expandedPlacement, peekOpen, peekMaximized]);

  const cancelPeekCloseTimer = React.useCallback(() => {
    if (peekCloseTimerRef.current === null) return;
    window.clearTimeout(peekCloseTimerRef.current);
    peekCloseTimerRef.current = null;
  }, []);

  const persistPeekFraction = React.useCallback((fraction: number) => {
    try {
      window.localStorage.setItem(
        ARTICLE_READER_PEEK_FRACTION_STORAGE_KEY_V3,
        String(clampArticleReaderPeekFractionV3(fraction)),
      );
    } catch {
      // Reader geometry is optional device-local preference only.
    }
  }, []);

  const openExpandedPlacement = React.useCallback((
    placementId: string,
    presentation: ArticleReaderExpandedPresentationV3,
  ) => {
    rememberReadingPosition();
    cancelPeekCloseTimer();
    // A sealed full-width Placement is the same companion panel opened
    // maximized; there is no second modal surface to maintain.
    setPeekMaximized(presentation === "fullscreen");
    setExpandedPlacement(Object.freeze({ placementId, presentation: "peek" }));
  }, [cancelPeekCloseTimer]);

  const finishPeekClose = React.useCallback(() => {
    if (peekOpen) return;
    cancelPeekCloseTimer();
    setExpandedPlacement((current) =>
      current?.presentation === "peek" ? null : current);
  }, [cancelPeekCloseTimer, peekOpen]);

  const closeExpandedPlacement = React.useCallback(() => {
    rememberReadingPosition();
    setPeekMaximized(false);
    if (expandedPlacement?.presentation !== "peek") {
      setExpandedPlacement(null);
      return;
    }
    setPeekOpen(false);
    cancelPeekCloseTimer();
    peekCloseTimerRef.current = window.setTimeout(() => {
      peekCloseTimerRef.current = null;
      setExpandedPlacement((current) =>
        current?.presentation === "peek" ? null : current);
    }, 260);
  }, [cancelPeekCloseTimer, expandedPlacement?.presentation]);

  React.useEffect(() => {
    if (expandedPlacement?.presentation !== "peek") return undefined;
    const frame = window.requestAnimationFrame(() => setPeekOpen(true));
    return () => window.cancelAnimationFrame(frame);
  }, [expandedPlacement]);

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
    pendingPeekFractionRef.current = articleReaderPeekFractionForPointerV3(
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

  React.useEffect(() => {
    if (content.kind !== "ready" || !hash) return;
    let fragment: string;
    try {
      fragment = decodeURIComponent(hash.slice(1));
    } catch {
      return;
    }
    if (!fragment.startsWith("placement-")) {
      const frame = window.requestAnimationFrame(() => {
        const target = document.getElementById(fragment);
        if (!target || !target.closest(".article-document")) return;
        for (let parent = target.parentElement; parent; parent = parent.parentElement) {
          if (parent instanceof HTMLDetailsElement) parent.open = true;
        }
        target.scrollIntoView({ behavior: "instant", block: target.tagName === "A" ? "center" : "start" });
        target.focus({ preventScroll: true });
      });
      return () => window.cancelAnimationFrame(frame);
    }
    const placementId = fragment.slice("placement-".length);
    if (!content.article.blocks.some((block) =>
      block.kind === "experiment"
      && block.placement.placementId === placementId)) return;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(fragment)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [content, hash]);

  if (content.kind === "loading") return <ArticleLoadingSkeletonV1 />;
  if (content.kind !== "ready") {
    return (
      <div className="h-full overflow-y-auto bg-wb-app text-wb-text">
        <main className="mx-auto max-w-3xl px-6 py-20 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("articleReader.missingTitle")}
          </h1>
          <p className={`mt-3 text-sm leading-7 ${content.kind === "error" ? "text-wb-danger" : "text-wb-muted"}`}>
            {content.kind === "error"
                ? content.message
                : t("articleReader.missingDescription")}
          </p>
        </main>
      </div>
    );
  }

  const publicationCopy = studioPublicArticlePresentationCopyV1(locale);

  return (
    <div
      className="flex h-full min-h-0 flex-col overflow-hidden bg-wb-app text-wb-text"
      data-testid="article-reader-v3"
    >
      <div
        ref={splitRef}
        className="article-reader-split relative flex min-h-0 flex-1 overflow-hidden"
        data-peek-mounted={
          expandedPlacement?.presentation === "peek" ? "true" : "false"
        }
        data-peek-open={peekOpen ? "true" : "false"}
        data-peek-dragging={peekDragging ? "true" : "false"}
        data-peek-maximized={peekMaximized ? "true" : "false"}
        style={{
          "--article-reader-peek-width": peekMaximized
            ? "100%"
            : `${peekFraction * 100}%`,
        } as React.CSSProperties}
      >
        <div
          className="article-reader-article-pane min-w-0 flex-1 overflow-y-auto overscroll-contain"
          data-public-static-scroll-host="true"
          data-testid="article-reader-article-pane-v3"
        >
          <main className="article-document-shell">
            <ArticleReadingProviderV1 blocks={content.article.blocks} onNavigate={(targetHash, sourceHash) => {
              const base = `${pathname}${search}`;
              if (sourceHash) navigate(`${base}${sourceHash}`, { replace: true });
              navigate(`${base}${targetHash}`);
            }}>
            <article className="article-document">
          <header className="article-document-header">
            <h1 className="article-title">
              <ArticleHeadingTextV1 text={content.article.title || t("articleReader.untitled")} />
            </h1>
            {!authoredPreview && <ResourceAuthorV1 kind="article" resourceId={content.article.articleId} locale={locale} />}
            {content.publishedAt !== null && (
              <p className="article-publication-date">
                <span>{publicationCopy.publishedLabel}</span>{" "}
                <time dateTime={content.publishedAt}>
                  {formatStudioPublicArticleDateV1(content.publishedAt, locale)}
                </time>
              </p>
            )}
          </header>

          {!authoredPreview && <ArticleCourseNavigationV1 articleId={content.article.articleId} locale={locale} />}
          <ArticleTableOfContentsV1 blocks={content.article.blocks} />

          {content.article.blocks.length === 0 && (
            <p className="py-16 text-sm text-wb-muted">{t("articleReader.empty")}</p>
          )}

          {content.article.blocks.map((block) => {
            if ((block.kind === "link" && block.role === "reference") || (block.kind === "accordion" && block.role === "note")) return null;
            if (block.kind === "heading") {
              const Heading = block.level === 2 ? "h2" : "h3";
              return (
                <Heading
                  key={block.blockId}
                  id={`block-${block.blockId}`} tabIndex={-1}
                  className={block.level === 2
                    ? "article-heading-2"
                    : "article-heading-3"}
                >
                  <ArticleHeadingTextV1 text={block.text} />
                </Heading>
              );
            }
            if (block.kind === "paragraph") {
              return (
                <p
                  key={block.blockId}
                  id={`block-${block.blockId}`}
                  className="article-paragraph whitespace-pre-wrap"
                >
                  <ArticleReadingTextV1 text={block.text} fieldId={articleReadingFieldV1(block.blockId)} />
                </p>
              );
            }
            if (block.kind === "equation") {
              return (
                <ArticleEquationPresentationV3
                  key={block.blockId}
                  block={block}
                  className="my-8"
                />
              );
            }
            if (block.kind === "image") {
              return (
                <ArticleImagePresentationV3
                  key={block.blockId}
                  block={block}
                />
              );
            }
            if (block.kind === "divider") {
              return (
                <ArticleDividerPresentationV3
                  key={block.blockId}
                  block={block}
                />
              );
            }
            if (block.kind === "link") {
              return <ArticleLinkPresentationV3 key={block.blockId} block={block} />;
            }
            if (block.kind === "quiz") {
              return <ArticleQuizPresentationV3 key={block.blockId} block={block} />;
            }
            if (block.kind === "accordion") {
              return <ArticleAccordionPresentationV3 key={block.blockId} block={block} />;
            }
            const isLive = expandedPlacement === null
              ? activePlacementId === block.placement.placementId
              : expandedPlacement.placementId === block.placement.placementId;
            const expandedPresentation =
              expandedPlacement?.placementId === block.placement.placementId
                ? expandedPlacement.presentation
                : null;
            return (
              <ArticleReaderDeferredExperimentV1
                key={block.blockId}
                block={block}
                loadSnapshot={loadSnapshot}
                live={isLive}
                expandedPresentation={expandedPresentation}
                peekPortalHost={peekPortalHost}
                peekMaximized={peekMaximized}
                onActivate={() => {
                  visibleInlinePlacementsRef.current.add(block.placement.placementId);
                  // The placement the reader reached first stays live while it
                  // remains in view; a second placement peeking in at the edge
                  // must not steal the lanes from the one being read.
                  setActivePlacementId((current) =>
                    current !== null && visibleInlinePlacementsRef.current.has(current)
                      ? current
                      : block.placement.placementId);
                }}
                onDeactivate={() => {
                  visibleInlinePlacementsRef.current.delete(block.placement.placementId);
                  setActivePlacementId((current) => articleReaderPlacementAfterViewportExitV3(
                    current, block.placement.placementId, [...visibleInlinePlacementsRef.current],
                  ));
                }}
                onExpand={(presentation) => {
                  openExpandedPlacement(
                    block.placement.placementId,
                    presentation,
                  );
                }}
                onClose={closeExpandedPlacement}
                onOpenExperimentSession={(continuation) =>
                  openExperimentSessionV3(block.placement.snapshotId, block.placement.placementId, continuation)}
                onPeekMaximizedChange={value => { rememberReadingPosition(); setPeekMaximized(value); }}
              />
            );
          })}

          {!authoredPreview && <ArticleCourseNavigationV1 articleId={content.article.articleId} locale={locale} bottom />}
          <ArticleEndMatterV1 renderNoteBlock={(block) => <ArticleAccordionContentPresentationV3 block={block} />} />

            </article>
            </ArticleReadingProviderV1>
          </main>
        </div>

        <div
          role="separator"
          aria-orientation="vertical"
          aria-label={t("articleReader.resizeExperiment")}
          aria-valuemin={Math.round(ARTICLE_READER_PEEK_MIN_FRACTION_V3 * 100)}
          aria-valuemax={100}
          aria-valuenow={peekMaximized ? 100 : Math.round(peekFraction * 100)}
          aria-valuetext={t("articleReader.experimentWidth", {
            percent: peekMaximized ? 100 : Math.round(peekFraction * 100),
          })}
          tabIndex={peekOpen ? 0 : -1}
          className="article-reader-peek-divider group z-10 shrink-0 touch-none outline-none"
          data-testid="article-reader-peek-divider-v3"
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
            if (!peekDraggingRef.current) return;
            resizePeekFromPointer(event.clientX);
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
                ? ARTICLE_READER_PEEK_MAX_FRACTION_V3
                : peekFraction - 0.025;
            }
            else if (event.key === "Home") {
              setPeekMaximized(false);
              next = ARTICLE_READER_PEEK_MIN_FRACTION_V3;
            }
            if (next === null) return;
            event.preventDefault();
            const clamped = clampArticleReaderPeekFractionV3(next);
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
          aria-hidden={expandedPlacement?.presentation !== "peek"}
          aria-label={t("articleReader.drawerTitle")}
          className="article-reader-peek-column min-w-0 shrink-0 overflow-hidden"
          data-testid="article-reader-peek-column-v3"
          inert={expandedPlacement?.presentation !== "peek"}
          onTransitionEnd={(event) => {
            if (
              event.currentTarget !== event.target
              || event.propertyName !== "inline-size"
              || peekOpen
            ) return;
            finishPeekClose();
          }}
        >
          <div
            ref={setPeekPortalHost}
            className="article-reader-peek-host h-full"
            data-testid="article-reader-peek-host-v3"
          />
        </aside>
      </div>
    </div>
  );
}

export default ArticleReaderPage;

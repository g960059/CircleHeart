import React from "react";
import {
  articleBriefingAnalysisRecomputeV3,
  articleBriefingInflowContentV3,
  articleBriefingSplitViewsV3,
  articleBriefingViewsV3,
  defaultArticleBriefingPresentationV3,
} from "@/studio/application/authoring/StudioArticleBriefingPresentationV3";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import i18n from "@/i18n";
import {
  STUDIO_ARTICLE_TAG_LIMIT_V1,
  addArticleTagsV1,
  articleTagFromSearchV1,
  countArticleTagsV1,
  isCanonicalArticleTagV1,
  normalizeArticleTagV1,
  parseArticleTagInputV1,
} from "@/studio/application/article/StudioArticleTagsV1";
import { articleTagHref } from "@/homeLinks";
import {
  ArticleEditorTagsV1,
  mergeArticleTagSuggestionsV1,
  selectArticleTagSuggestionsV1,
} from "@/components/article/editor/ArticleEditorTagsV1";
import { ArticlePublishMenuV3 } from "@/components/article/editor/ArticleEditorChromeV3";
import {
  readArticleLibraryFilterV3,
  selectArticleLibraryItemsV3,
} from "@/components/article/ArticleLibraryPage";
import {
  createEmptyArticleDraftV3,
  adoptSavedArticleDraftV3,
  articleBlockDropBoundaryV3,
  articleEditorRouteHydratedV3,
  articleEditorRouteKeyV3,
  articleEditorInputIsComposingV3,
  articleEditorRetryActionV3,
  articleHeadingShortcutV3,
  articleEditorSaveScopeIsCurrentV3,
  filterArticleInsertOptionsV3,
  insertArticleBlockV3,
  moveArticleBlockToBoundaryV3,
  prepareArticleDraftForSaveV3,
  resolveArticleEditorRouteDraftV3,
  splitArticleTextSelectionV3,
  synchronizeRemoteArticlePublicationV3,
} from "@/components/article/editor/ArticleEditorPolicy";
import {
  ArticleBriefingEditorV3,
  articleBriefingEditorMoveGraphV3,
  ArticleExperimentPlacementV3,
} from "@/components/article/ArticleExperimentPlacementV3";
import {
  ArticleAccordionPresentationV3,
  ArticleDividerPresentationV3,
  ArticleEquationPresentationV3,
  ArticleImagePresentationV3,
  ArticleLinkPresentationV3,
  ArticleQuizPresentationV3,
} from "@/components/article/ArticleRichBlockV3";
import {
  articleBriefingPresentationV3,
  createArticleExperimentBlockV3,
  defaultArticleBriefingV3,
  resolveArticlePlacementBriefingV3,
} from "@/studio/application/article/ArticleExperimentPlacementV3";
import { portableArticleEditorIdV3 } from "@/components/article/editor/ArticleEditorIdentityV3";
import {
  STUDIO_ARTICLE_DRAFT_V2_SCHEMA_ID,
  type StudioArticleDraftV2,
} from "@/studio/contracts/v2/article";
import {
  validateStudioArticleDraftV2,
} from "@/studio/application/authoring/StudioArticleDataV2";
import {
  STUDIO_EXPERIMENT_PLACEMENT_V2_SCHEMA_ID,
  STUDIO_EXPERIMENT_SNAPSHOT_V2_SCHEMA_ID,
  type ExperimentSnapshotV2,
  type ExperimentPlacementBriefingV2,
  type ExperimentPlacementV2,
} from "@/studio/contracts/v2/content";
function snapshotV3(): ExperimentSnapshotV2 {
  return {
    schemaId: STUDIO_EXPERIMENT_SNAPSHOT_V2_SCHEMA_ID,
    snapshotId: "snapshot/article-preview",
    surfaceReleaseId: "surface/article-preview-v1",
    createdAt: "2026-08-01T00:00:00.000Z",
    content: {
      modelId: "model/exact-v3",
      surfaceSeriesId: "surface-series/article-preview",
      scenarios: [
        scenarioV3("scenario/baseline", "Baseline"),
        scenarioV3("scenario/comparison", "Comparison"),
      ],
      surface: {
        graphPanes: [{
          paneId: "pane/pressure",
          role: "graph",
          label: "Pressure",
          order: 0,
          priority: 6,
          graphId: "graph/pressure",
          scenarioScope: { mode: "visible-scenarios" },
          excludedTraces: [],
          windowSec: 2,
          series: [{
            seriesId: "series/lv-pressure",
            label: "LV",
            order: 0,
          }],
        }],
        outputPanes: [{
          paneId: "pane/outputs",
          role: "output",
          label: "Outputs",
          order: 0,
          priority: 3,
          binding: { mode: "active-slot" },
          items: [{ outputId: "output/map", label: "MAP", order: 0 }],
        }],
        controlPanes: [{
          paneId: "pane/controls",
          role: "control",
          label: "Controls",
          order: 0,
          priority: 2,
          binding: { mode: "active-slot" },
          items: [{
            controlId: "control/svr",
            label: "SVR",
            order: 0,
            presentation: { kind: "slider" },
          }],
        }],
        note: { text: "Pinned note" },
      },
    },
  };
}

function twoGraphSnapshotV3(): ExperimentSnapshotV2 {
  const snapshot = snapshotV3();
  return {
    ...snapshot,
    content: {
      ...snapshot.content,
      surface: {
        ...snapshot.content.surface,
        graphPanes: [
          ...snapshot.content.surface.graphPanes,
          {
            paneId: "pane/pv",
            role: "graph",
            label: "PV loop",
            order: 1,
            priority: 5,
            graphId: "graph/pv",
            scenarioScope: { mode: "visible-scenarios" },
            excludedTraces: [],
            historyDepth: 1,
            series: [],
          },
        ],
      },
    },
  };
}

function scenarioV3(scenarioId: string, label: string) {
  return {
    scenarioId,
    label,
    capture: {
      fixture: {},
      checkpoint: {
        acceptedRevision: 4,
        acceptedTimeSec: 0.008,
        payload: {},
      },
    },
  };
}

function focusedBriefingV3(): ExperimentPlacementBriefingV2 {
  return {
    defaultTitle: "Focused experiment",
    scenarioScope: {
      visibleScenarioIds: ["scenario/comparison"],
      initialFocusScenarioId: "scenario/comparison",
    },
    graphs: [{
      paneId: "pane/pressure",
      order: 0,
      emphasis: "primary",
      overrides: {
        label: "Focused pressure",
        legend: "compact",
        series: [{
          seriesId: "series/lv-pressure",
          label: "LV pressure",
          order: 0,
        }],
        traceColors: [{
          scenarioId: "scenario/comparison",
          seriesId: "series/lv-pressure",
          colorHex: "#dc2626",
        }],
        windowSec: 3,
      },
    }],
    outputs: [{
      sourcePaneId: "pane/outputs",
      outputId: "output/map",
      scenarioId: "scenario/comparison",
      label: "Mean pressure",
      order: 0,
    }],
    controls: [{
      sourcePaneId: "pane/controls",
      controlId: "control/svr",
      label: "Resistance",
      order: 0,
      presentation: { kind: "slider" },
      binding: {
        mode: "reader-focus",
        allowedScenarioIds: ["scenario/comparison"],
      },
    }],
  };
}

describe("Article Editor V3 briefing", () => {
  it("invalidates an in-flight save when its route scope is discarded", () => {
    expect(articleEditorSaveScopeIsCurrentV3({
      currentGeneration: 4,
      currentRouteKey: "new",
      mounted: true,
      startedGeneration: 4,
      startedRouteKey: "new",
    })).toBe(true);
    expect(articleEditorSaveScopeIsCurrentV3({
      currentGeneration: 5,
      currentRouteKey: "new",
      mounted: true,
      startedGeneration: 4,
      startedRouteKey: "new",
    })).toBe(false);
    expect(articleEditorSaveScopeIsCurrentV3({
      currentGeneration: 4,
      currentRouteKey: "article/elsewhere",
      mounted: true,
      startedGeneration: 4,
      startedRouteKey: "new",
    })).toBe(false);
  });

  it("retries only save failures and dismisses clean operation errors", () => {
    expect(articleEditorRetryActionV3({
      alreadyPersisted: true,
      hasUnsaved: true,
      routeHydrated: true,
    })).toBe("save");
    expect(articleEditorRetryActionV3({
      alreadyPersisted: true,
      hasUnsaved: false,
      routeHydrated: true,
    })).toBe("dismiss-saved");
    expect(articleEditorRetryActionV3({
      alreadyPersisted: false,
      hasUnsaved: false,
      routeHydrated: true,
    })).toBe("dismiss-idle");
    expect(articleEditorRetryActionV3({
      alreadyPersisted: false,
      hasUnsaved: false,
      routeHydrated: false,
    })).toBe("reload");
  });

  it("adopts publication authority after moving the Article pointer", async () => {
    const saved = Object.freeze({
      schemaId: STUDIO_ARTICLE_DRAFT_V2_SCHEMA_ID,
      tags: [],
      articleId: "6368328d-c852-4440-aa15-07dea45f7753",
      draftVersion: 2,
      visibility: "draft" as const,
      locale: "ja",
      title: "Publication readback",
      blocks: Object.freeze([]),
    });
    const published = Object.freeze({
      ...saved,
      visibility: "public" as const,
    });
    const repository = {
      publishArticle: vi.fn().mockResolvedValue(undefined),
      readArticle: vi.fn().mockResolvedValue(published),
      unpublishArticle: vi.fn().mockResolvedValue(undefined),
    };

    const result = await synchronizeRemoteArticlePublicationV3({
      repository,
      saved,
      candidate: { ...saved, visibility: "public" },
      wasPublished: false,
    });

    expect(repository.publishArticle).toHaveBeenCalledWith({
      articleId: saved.articleId,
      expectedVersion: saved.draftVersion,
      publicSlug: "article-6368328d-c852-4440-aa15-07dea45f7753",
    });
    expect(repository.readArticle).toHaveBeenCalledWith(saved.articleId);
    expect(result).toEqual({ article: published, published: true });
  });

  it("keeps an existing Article inert until its exact route is hydrated", () => {
    expect(articleEditorRouteHydratedV3(null, "article-existing")).toBe(false);
    expect(articleEditorRouteHydratedV3("new", "article-existing")).toBe(false);
    expect(articleEditorRouteHydratedV3(
      "article-existing",
      "article-existing",
    )).toBe(true);
    expect(articleEditorRouteHydratedV3("new", "new")).toBe(true);
  });

  it("shares a mobile-first Briefing complexity rule between Editor and Reader", () => {
    expect(articleBriefingPresentationV3({ graphs: [] })).toBe("inflow");
    expect(articleBriefingPresentationV3({ graphs: [{}] as never })).toBe("inflow");
    expect(articleBriefingPresentationV3({ graphs: [{}, {}] as never })).toBe("peek");
    expect(articleBriefingPresentationV3({
      graphs: [{}] as never,
      controls: [{}] as never,
      outputs: [{}, {}] as never,
    })).toBe("inflow");
    expect(articleBriefingPresentationV3({
      graphs: [{}] as never,
      controls: [{}] as never,
      outputs: [{}, {}, {}, {}] as never,
    })).toBe("peek");
    expect(articleBriefingPresentationV3({
      graphs: [{}] as never,
      scenarioScope: {
        initialFocusScenarioId: "scenario/a",
        visibleScenarioIds: ["scenario/a", "scenario/b", "scenario/c", "scenario/d"],
      },
    })).toBe("peek");
    expect(articleBriefingPresentationV3({
      graphs: [{}, {}, {}, {}, {}] as never,
    })).toBe("peek");
  });

  it("projects one primary graph in flow without trimming the sealed outputs", () => {
    const base = focusedBriefingV3();
    const briefing: ExperimentPlacementBriefingV2 = {
      ...base,
      controls: [],
      graphs: [...base.graphs, { paneId: "pane/flow", order: 1, emphasis: "supporting" }],
      outputs: Array.from({ length: 6 }, (_, i) => ({ ...base.outputs[0]!, outputId: `output/${i}`, order: 5 - i })),
    };
    expect(articleBriefingPresentationV3(briefing)).toBe("inflow");
    const reading = articleBriefingInflowContentV3(briefing);
    expect(reading.graphs).toEqual(base.graphs);
    // Outputs are never trimmed: the sealed observation owns their density.
    expect(reading.outputs).toBe(briefing.outputs);
    expect(briefing.graphs).toHaveLength(2);
    expect(briefing.outputs).toHaveLength(6);
    expect(articleBriefingPresentationV3({ ...briefing, controls: base.controls })).toBe("peek");
    expect(articleBriefingPresentationV3({ ...briefing, scenarioScope: {
      initialFocusScenarioId: "scenario/a", visibleScenarioIds: ["scenario/a", "scenario/b", "scenario/c"],
    } })).toBe("peek");
  });

  it("renders a two-graph Editor placement as the same compact Peek anchor", () => {
    const snapshot = twoGraphSnapshotV3();
    const block = createArticleExperimentBlockV3({
      snapshot,
      createId: (kind) => `${kind}/editor-peek`,
    });
    const html = renderToStaticMarkup(React.createElement(
      ArticleExperimentPlacementV3,
      {
        block,
        snapshot,
        index: 0,
        total: 1,
        blockEditorLayout: true,
        showBlockActions: false,
        onChange: () => undefined,
        onEdit: () => undefined,
        onRemove: () => undefined,
        onMove: () => undefined,
      },
    ));

    expect(html).toContain('data-reader-presentation="peek"');
    expect(html).toContain("Baseline");
    expect(html).not.toContain(i18n.t("articleEditor.staticDataNotice"));
  });

  it("keeps edits typed during an autosave round-trip while adopting identity", () => {
    const candidate = Object.freeze({
      schemaId: STUDIO_ARTICLE_DRAFT_V2_SCHEMA_ID,
      tags: [],
      articleId: "article-local",
      draftVersion: 0,
      visibility: "draft" as const,
      locale: "ja",
      title: "Before",
      blocks: Object.freeze([]),
    });
    const saved = Object.freeze({
      ...candidate,
      articleId: "article-durable",
      draftVersion: 4,
      title: "Before",
    });

    const clean = adoptSavedArticleDraftV3({
      saved,
      candidate,
      current: candidate,
    });
    expect(clean.clean).toBe(true);
    expect(clean.draft).toBe(saved);

    const editedDuringFlight = Object.freeze({
      ...candidate,
      title: "After more typing",
    });
    const merged = adoptSavedArticleDraftV3({
      saved,
      candidate,
      current: editedDuringFlight,
    });
    expect(merged.clean).toBe(false);
    expect(merged.draft.title).toBe("After more typing");
    expect(merged.draft.articleId).toBe("article-durable");
    expect(merged.draft.draftVersion).toBe(4);
  });

  it("preserves in-progress author whitespace through autosave validation", () => {
    const authored = {
      schemaId: STUDIO_ARTICLE_DRAFT_V2_SCHEMA_ID,
      tags: [],
      articleId: "article/autosave-whitespace",
      draftVersion: 2,
      visibility: "draft" as const,
      locale: "ja",
      title: "PV loop ",
      blocks: [{
        blockId: "block/heading",
        kind: "heading" as const,
        level: 2 as const,
        text: "前負荷 ",
      }, {
        blockId: "block/paragraph",
        kind: "paragraph" as const,
        text: "Stroke volume ",
      }, {
        blockId: "block/empty-heading",
        kind: "heading" as const,
        level: 3 as const,
        text: "",
      }],
    } satisfies StudioArticleDraftV2;

    const saved = validateStudioArticleDraftV2(
      prepareArticleDraftForSaveV3(authored),
    );

    expect(saved.title).toBe("PV loop ");
    expect(saved.blocks.map((block) =>
      block.kind === "heading" || block.kind === "paragraph"
        ? block.text
        : null)).toEqual([
      "前負荷 ",
      "Stroke volume ",
      "",
    ]);
  });

  it("validates and renders portable equation, image, and divider blocks", () => {
    const rich = validateStudioArticleDraftV2({
      schemaId: STUDIO_ARTICLE_DRAFT_V2_SCHEMA_ID,
      tags: [],
      articleId: "article/rich-blocks",
      draftVersion: 0,
      visibility: "draft",
      locale: "ja",
      title: "Rich blocks",
      blocks: [{
        blockId: "block/equation",
        kind: "equation",
        expression: "CO = HR \\times SV",
      }, {
        blockId: "block/image",
        kind: "image",
        url: "https://example.com/pv-loop.png",
        altText: "左室圧容積ループ",
        caption: "前負荷変化",
      }, {
        blockId: "block/divider",
        kind: "divider",
      }],
    });
    const [equation, image, divider] = rich.blocks;
    expect(equation?.kind).toBe("equation");
    expect(image?.kind).toBe("image");
    expect(divider?.kind).toBe("divider");
    if (equation?.kind !== "equation"
      || image?.kind !== "image"
      || divider?.kind !== "divider") throw new Error("rich block mismatch");

    const equationHtml = renderToStaticMarkup(React.createElement(
      ArticleEquationPresentationV3,
      { block: equation },
    ));
    const imageHtml = renderToStaticMarkup(React.createElement(
      ArticleImagePresentationV3,
      { block: image },
    ));
    const dividerHtml = renderToStaticMarkup(React.createElement(
      ArticleDividerPresentationV3,
      { block: divider },
    ));
    expect(equationHtml).toContain("katex");
    expect(equationHtml).toContain("MathML");
    expect(imageHtml).toContain("pv-loop.png");
    expect(imageHtml).toContain("左室圧容積ループ");
    expect(dividerHtml).toContain("<hr");
  });

  it("validates and renders progressive disclosure, quiz, and Article links", () => {
    const rich = validateStudioArticleDraftV2({
      schemaId: STUDIO_ARTICLE_DRAFT_V2_SCHEMA_ID,
      tags: [],
      articleId: "article/progressive-blocks",
      draftVersion: 0,
      visibility: "draft",
      locale: "ja",
      title: "Progressive blocks",
      blocks: [{
        blockId: "block/accordion",
        kind: "accordion",
        title: "循環器専門医向け",
        blocks: [{
          blockId: "block/accordion-text",
          kind: "paragraph",
          text: "平均循環充満圧を詳しく考えます。",
        }, {
          blockId: "block/accordion-link",
          kind: "link",
          href: "/ja/articles/venous-return",
          label: "静脈還流の記事へ",
          description: "シリーズの冒頭から読む",
        }],
      }, {
        blockId: "block/quiz",
        kind: "quiz",
        question: "輸液で最初に増えるのは？",
        choices: [{ choiceId: "choice/stressed", label: "stressed volume" }, {
          choiceId: "choice/resistance",
          label: "体血管抵抗",
        }],
        correctChoiceId: "choice/stressed",
        explanation: "静脈還流の圧較差が増えます。",
      }, {
        blockId: "block/link",
        kind: "link",
        href: "https://example.com/series",
        label: "シリーズを最初から読む",
        description: "前負荷の基礎へ戻ります",
      }],
    });
    const [accordion, quiz, link] = rich.blocks;
    if (accordion?.kind !== "accordion" || quiz?.kind !== "quiz" || link?.kind !== "link") {
      throw new Error("progressive block mismatch");
    }
    const accordionHtml = renderToStaticMarkup(React.createElement(
      ArticleAccordionPresentationV3,
      { block: accordion },
    ));
    const quizHtml = renderToStaticMarkup(React.createElement(
      ArticleQuizPresentationV3,
      { block: quiz },
    ));
    const linkHtml = renderToStaticMarkup(React.createElement(
      ArticleLinkPresentationV3,
      { block: link },
    ));
    expect(accordionHtml).toContain("<details");
    expect(accordionHtml).toContain("平均循環充満圧");
    expect(quizHtml).toContain("type=\"radio\"");
    expect(quizHtml).toContain("輸液で最初に増える");
    expect(linkHtml).toContain("https://example.com/series");
  });

  it("rejects invalid quiz answers, nested accordions, and unsafe links", () => {
    const base = {
      schemaId: STUDIO_ARTICLE_DRAFT_V2_SCHEMA_ID,
      tags: [],
      articleId: "article/invalid-progressive",
      draftVersion: 0,
      visibility: "draft",
      locale: "ja",
      title: "Invalid progressive",
    };
    expect(() => validateStudioArticleDraftV2({
      ...base,
      blocks: [{
        blockId: "block/quiz",
        kind: "quiz",
        question: "Question",
        choices: [{ choiceId: "choice/a", label: "A" }, {
          choiceId: "choice/b", label: "B",
        }],
        correctChoiceId: "choice/missing",
        explanation: "",
      }],
    })).toThrow(/must identify one of the choices/);
    expect(() => validateStudioArticleDraftV2({
      ...base,
      blocks: [{
        blockId: "block/accordion",
        kind: "accordion",
        title: "Detail",
        blocks: [{
          blockId: "block/nested",
          kind: "accordion",
          title: "Nested",
          blocks: [],
        }],
      }],
    })).toThrow(/nested accordions/);
    expect(() => validateStudioArticleDraftV2({
      ...base,
      blocks: [{
        blockId: "block/link",
        kind: "link",
        href: "javascript:alert(1)",
        label: "Unsafe",
        description: "",
      }],
    })).toThrow(/app-relative path/);
    expect(() => validateStudioArticleDraftV2({
      ...base,
      blocks: [{
        blockId: "block/link",
        kind: "link",
        href: "/\\evil.example",
        label: "Looks internal",
        description: "",
      }],
    })).toThrow(/app-relative path/);
    expect(() => validateStudioArticleDraftV2({
      ...base,
      blocks: [{
        blockId: "block/accordion",
        kind: "accordion",
        title: "Detail",
        blocks: [null],
      }],
    })).toThrow(/blocks\[0\]: must be an object/);
  });

  it("rejects unsafe image URLs and hidden rich-block fields", () => {
    const base = {
      schemaId: STUDIO_ARTICLE_DRAFT_V2_SCHEMA_ID,
      tags: [],
      articleId: "article/bad-rich-block",
      draftVersion: 0,
      visibility: "draft",
      locale: "ja",
      title: "Invalid",
    };
    expect(() => validateStudioArticleDraftV2({
      ...base,
      blocks: [{
        blockId: "block/image",
        kind: "image",
        url: "javascript:alert(1)",
        altText: "",
        caption: "",
      }],
    })).toThrow(/HTTPS URL/);
    expect(() => validateStudioArticleDraftV2({
      ...base,
      blocks: [{
        blockId: "block/divider",
        kind: "divider",
        style: "secret",
      }],
    })).toThrow(/keys must be exactly/);
  });

  it("treats IME confirmation as text input rather than an editor command", () => {
    expect(articleEditorInputIsComposingV3({ isComposing: true })).toBe(true);
    expect(articleEditorInputIsComposingV3({ keyCode: 229 })).toBe(true);
    expect(articleEditorInputIsComposingV3({
      isComposing: false,
      keyCode: 13,
    })).toBe(false);
  });

  it("replaces the complete selected range when Enter splits a text block", () => {
    expect(splitArticleTextSelectionV3({
      text: "abcdef",
      selectionStart: 2,
      selectionEnd: 4,
    })).toEqual({ before: "ab", after: "ef" });
    expect(splitArticleTextSelectionV3({
      text: "abcdef",
      selectionStart: 3,
      selectionEnd: 3,
    })).toEqual({ before: "abc", after: "def" });
  });

  it("converts Markdown heading prefixes typed into a Paragraph", () => {
    expect(articleHeadingShortcutV3("# ")).toEqual({ level: 2, rest: "" });
    expect(articleHeadingShortcutV3("# 圧波形")).toEqual({
      level: 2,
      rest: "圧波形",
    });
    expect(articleHeadingShortcutV3("## detail")).toEqual({
      level: 3,
      rest: "detail",
    });
    expect(articleHeadingShortcutV3("#no-space")).toBeNull();
    expect(articleHeadingShortcutV3("### too deep")).toBeNull();
    expect(articleHeadingShortcutV3("plain")).toBeNull();
  });

  it("moves blocks to drag-and-drop boundaries with no-op detection", () => {
    const blocks = Object.freeze([
      { blockId: "block/a", kind: "paragraph" as const, text: "A" },
      { blockId: "block/b", kind: "paragraph" as const, text: "B" },
      { blockId: "block/c", kind: "paragraph" as const, text: "C" },
    ]);

    expect(moveArticleBlockToBoundaryV3(blocks, "block/a", 3)
      .map(({ blockId }) => blockId)).toEqual([
      "block/b",
      "block/c",
      "block/a",
    ]);
    expect(moveArticleBlockToBoundaryV3(blocks, "block/c", 0)
      .map(({ blockId }) => blockId)).toEqual([
      "block/c",
      "block/a",
      "block/b",
    ]);
    // Dropping onto either boundary that surrounds the source is a no-op.
    expect(moveArticleBlockToBoundaryV3(blocks, "block/b", 1)).toBe(blocks);
    expect(moveArticleBlockToBoundaryV3(blocks, "block/b", 2)).toBe(blocks);
    expect(moveArticleBlockToBoundaryV3(blocks, "block/missing", 0)).toBe(blocks);
    expect(moveArticleBlockToBoundaryV3(blocks, "block/a", 99)
      .map(({ blockId }) => blockId)).toEqual([
      "block/b",
      "block/c",
      "block/a",
    ]);
    expect(Object.isFrozen(moveArticleBlockToBoundaryV3(blocks, "block/a", 3)))
      .toBe(true);
  });

  it("targets the boundary nearest to the pointer while dragging", () => {
    expect(articleBlockDropBoundaryV3(2, 100, 40, 110)).toBe(2);
    expect(articleBlockDropBoundaryV3(2, 100, 40, 130)).toBe(3);
  });

  it("filters insert-menu options by label and latin keywords", () => {
    const options = Object.freeze([
      { kind: "paragraph", label: "本文", keywords: ["text", "paragraph"] },
      { kind: "heading", label: "見出し", keywords: ["heading", "h2"] },
      { kind: "experiment", label: "シミュレーション", keywords: ["simulation"] },
    ]);

    expect(filterArticleInsertOptionsV3(options, "")).toEqual(options);
    expect(filterArticleInsertOptionsV3(options, "見出")
      .map(({ kind }) => kind)).toEqual(["heading"]);
    expect(filterArticleInsertOptionsV3(options, "SIM")
      .map(({ kind }) => kind)).toEqual(["experiment"]);
    expect(filterArticleInsertOptionsV3(options, "nothing")).toEqual([]);
  });

  it("inserts a Notion-style block at the requested document boundary", () => {
    const first = {
      blockId: "block/first",
      kind: "paragraph" as const,
      text: "First",
    };
    const second = {
      blockId: "block/second",
      kind: "heading" as const,
      level: 2 as const,
      text: "Second",
    };
    const inserted = {
      blockId: "block/inserted",
      kind: "paragraph" as const,
      text: "Inserted",
    };

    const result = insertArticleBlockV3([first, second], 1, inserted);
    expect(result.map(({ blockId }) => blockId)).toEqual([
      "block/first",
      "block/inserted",
      "block/second",
    ]);
    expect(Object.isFrozen(result)).toBe(true);
  });

  it("renders the shared Briefing editor from Snapshot and Briefing values only", () => {
    const html = renderToStaticMarkup(React.createElement(
      ArticleBriefingEditorV3,
      {
        snapshot: snapshotV3(),
        briefing: focusedBriefingV3(),
        onChange: () => undefined,
      },
    ));

    expect(html).toContain("data-testid=\"article-briefing-editor-v3\"");
    expect(html).toContain("Focused pressure");
    expect(html).toContain("Mean pressure");
    expect(html).toContain("Resistance");

    const embeddedHtml = renderToStaticMarkup(React.createElement(
      ArticleBriefingEditorV3,
      {
        snapshot: snapshotV3(),
        briefing: focusedBriefingV3(),
        showIntro: false,
        testId: "workbench-briefing-editor-v3",
        onChange: () => undefined,
      },
    ));
    expect(embeddedHtml).toContain(
      "data-testid=\"workbench-briefing-editor-v3\"",
    );
    expect(embeddedHtml).not.toContain(i18n.t("articleEditor.briefing.title"));
  });

  it("does not replace an authored new-Article Draft when its route effect reruns", () => {
    const snapshot = snapshotV3();
    const authored = {
      schemaId: STUDIO_ARTICLE_DRAFT_V2_SCHEMA_ID,
      tags: [],
      articleId: "article-initial-save-race",
      draftVersion: 0,
      visibility: "draft",
      locale: "ja",
      title: "AS briefing",
      blocks: [createArticleExperimentBlockV3({
        snapshot,
        createId: (kind) => `${kind}/initial-save-race`,
      })],
    } satisfies StudioArticleDraftV2;
    const resolution = resolveArticleEditorRouteDraftV3({
      currentDraft: authored,
      hydratedRouteKey: articleEditorRouteKeyV3("new"),
      locale: "ja",
      readArticle: () => {
        throw new Error("same-route initialization must not read storage");
      },
      routeArticleId: "new",
      untitledTitle: "名称未設定の記事",
    });

    expect(resolution.routeChanged).toBe(false);
    expect(resolution.draft).toBe(authored);
    expect(resolution.draft.blocks).toHaveLength(1);

    const afterUiLocaleSwitch = resolveArticleEditorRouteDraftV3({
      currentDraft: authored,
      hydratedRouteKey: articleEditorRouteKeyV3("new"),
      locale: "en",
      readArticle: () => {
        throw new Error("changing UI locale must not rehydrate an edited Draft");
      },
      routeArticleId: "new",
      untitledTitle: "Untitled article",
    });
    expect(afterUiLocaleSwitch.routeChanged).toBe(false);
    expect(afterUiLocaleSwitch.draft).toBe(authored);

    const canonical = resolveArticleEditorRouteDraftV3({
      currentDraft: authored,
      hydratedRouteKey: articleEditorRouteKeyV3("new"),
      locale: "ja",
      readArticle: (articleId) => articleId === authored.articleId
        ? authored
        : null,
      routeArticleId: authored.articleId,
      untitledTitle: "名称未設定の記事",
    });
    expect(canonical.routeChanged).toBe(true);
    expect(canonical.draft).toBe(authored);
    expect(canonical.draft.blocks).toHaveLength(1);
  });

  it("creates independent placements with a complete explicit Reader projection", () => {
    const snapshot = snapshotV3();
    let sequence = 0;
    const createId = (kind: "block" | "placement") => `${kind}/${++sequence}`;
    const first = createArticleExperimentBlockV3({ snapshot, createId });
    const second = createArticleExperimentBlockV3({ snapshot, createId });

    expect(first.placement.snapshotId).toBe(snapshot.snapshotId);
    expect(first.blockId).not.toBe(second.blockId);
    expect(first.placement.placementId).not.toBe(second.placement.placementId);
    expect(first.placement.briefing).toEqual({
      defaultTitle: "Baseline",
      scenarioScope: {
        visibleScenarioIds: ["scenario/baseline", "scenario/comparison"],
        initialFocusScenarioId: "scenario/baseline",
      },
      graphs: [{ paneId: "pane/pressure", order: 0, emphasis: "primary" }],
      outputs: [{
        sourcePaneId: "pane/outputs",
        outputId: "output/map",
        scenarioId: "scenario/baseline",
        label: "MAP",
        order: 0,
        emphasis: "primary",
      }],
      controls: [{
        sourcePaneId: "pane/controls",
        controlId: "control/svr",
        label: "SVR",
        order: 0,
        presentation: { kind: "slider" },
        binding: {
          mode: "fixed",
          scenarioIds: ["scenario/baseline"],
          application: "absolute",
        },
        emphasis: "primary",
      }],
    });
  });

  it("resolves role-specific selections and authored graph overrides", () => {
    const snapshot = snapshotV3();
    const focusedSnapshot = snapshot;
    const placement: ExperimentPlacementV2 = {
      schemaId: STUDIO_EXPERIMENT_PLACEMENT_V2_SCHEMA_ID,
      placementId: "placement/article-preview",
      snapshotId: snapshot.snapshotId,
      briefing: focusedBriefingV3(),
      titleOverride: null,
      caption: null,
    };

    expect(resolveArticlePlacementBriefingV3(placement, focusedSnapshot)).toEqual(
      focusedBriefingV3(),
    );
  });

  it("preserves explicit empty role selections without allowing empty Scenario scope", () => {
    const snapshot = snapshotV3();
    const emptyRoles: ExperimentPlacementBriefingV2 = {
      defaultTitle: "Empty experiment",
      scenarioScope: {
        visibleScenarioIds: ["scenario/baseline"],
        initialFocusScenarioId: "scenario/baseline",
      },
      graphs: [],
      outputs: [],
      controls: [],
    };
    const emptySnapshot = snapshot;
    const placement: ExperimentPlacementV2 = {
      schemaId: STUDIO_EXPERIMENT_PLACEMENT_V2_SCHEMA_ID,
      placementId: "placement/empty-preview",
      snapshotId: snapshot.snapshotId,
      briefing: emptyRoles,
      titleOverride: null,
      caption: null,
    };

    expect(resolveArticlePlacementBriefingV3(placement, emptySnapshot)).toEqual(emptyRoles);
    expect(createArticleExperimentBlockV3({
      snapshot: emptySnapshot,
      briefing: emptyRoles,
      createId: (kind) => `${kind}/empty-briefing`,
    }).placement).toEqual({
      schemaId: STUDIO_EXPERIMENT_PLACEMENT_V2_SCHEMA_ID,
      placementId: "placement/empty-briefing",
      snapshotId: emptySnapshot.snapshotId,
      briefing: emptyRoles,
      titleOverride: null,
      caption: null,
    });
  });

  it("keeps generated Article IDs URL-safe", () => {
    expect(portableArticleEditorIdV3("article"))
      .toMatch(/^article-[A-Za-z0-9-]+$/);
  });

  it("builds the same default projection through the dedicated helper", () => {
    const snapshot = snapshotV3();
    expect(createArticleExperimentBlockV3({
      snapshot,
      createId: (kind) => `${kind}/default-projection`,
    }).placement.briefing)
      .toEqual(defaultArticleBriefingV3(snapshot));
  });

  it("keeps controller-pane identity while normalizing default graph order", () => {
    const base = snapshotV3();
    const snapshot: ExperimentSnapshotV2 = {
      ...base,
      content: {
        ...base.content,
        surface: {
          ...base.content.surface,
          graphPanes: [
            { ...base.content.surface.graphPanes[0]!, order: 7 },
          ],
          outputPanes: [
            ...base.content.surface.outputPanes,
            {
              paneId: "pane/outputs-duplicate",
              role: "output",
              label: "Repeated outputs",
              order: 1,
              priority: 1,
              binding: { mode: "active-slot" },
              items: [{ outputId: "output/map", label: "MAP duplicate", order: 0 }],
            },
          ],
          controlPanes: [
            ...base.content.surface.controlPanes,
            {
              paneId: "pane/controls-duplicate",
              role: "control",
              label: "Repeated controls",
              order: 1,
              priority: 1,
              binding: { mode: "active-slot" },
              items: [{
                controlId: "control/svr",
                label: "SVR duplicate",
                order: 0,
                presentation: { kind: "slider" },
              }],
            },
          ],
        },
      },
    };

    const briefing = defaultArticleBriefingV3(snapshot);
    expect(briefing.graphs.map(({ order }) => order)).toEqual([0]);
    expect(briefing.outputs).toEqual([
      {
        sourcePaneId: "pane/outputs",
        outputId: "output/map",
        scenarioId: "scenario/baseline",
        label: "MAP",
        order: 0,
        emphasis: "primary",
      },
      {
        sourcePaneId: "pane/outputs-duplicate",
        outputId: "output/map",
        scenarioId: "scenario/baseline",
        label: "MAP duplicate",
        order: 1,
        emphasis: "primary",
      },
    ]);
    expect(briefing.controls.map(({ sourcePaneId }) => sourcePaneId)).toEqual([
      "pane/controls",
      "pane/controls-duplicate",
    ]);
    expect(createArticleExperimentBlockV3({
      snapshot,
      createId: (kind) => `${kind}/deduplicated-default`,
    }).placement.snapshotId).toEqual(snapshot.snapshotId);
  });

  it("captures a Surface custom-button presentation by value", () => {
    const base = snapshotV3();
    const snapshot: ExperimentSnapshotV2 = {
      ...base,
      content: {
        ...base.content,
        surface: {
          ...base.content.surface,
          controlPanes: base.content.surface.controlPanes.map((pane) => ({
            ...pane,
            items: pane.items.map((item) => ({
              ...item,
              presentation: {
                kind: "buttons" as const,
                options: [
                  { label: "Low", value: 0.8 },
                  { label: "High", value: 1.2 },
                ],
              },
            })),
          })),
        },
      },
    };

    const briefing = defaultArticleBriefingV3(snapshot);
    expect(briefing.controls[0]?.presentation).toEqual({
      kind: "buttons",
      options: [
        { label: "Low", value: 0.8 },
        { label: "High", value: 1.2 },
      ],
    });
    expect(briefing.controls[0]?.presentation).not.toBe(
      snapshot.content.surface.controlPanes[0]?.items[0]?.presentation,
    );
  });
});

describe("Article Briefing sealed reading form", () => {
  const graphs = [
    { paneId: "pane/pv", order: 0, emphasis: "primary" as const },
    { paneId: "pane/starling", order: 1, emphasis: "supporting" as const },
    { paneId: "pane/pressure", order: 2, emphasis: "supporting" as const },
  ];
  const scenarioScope = { visibleScenarioIds: ["a", "b"], initialFocusScenarioId: "a" };

  it("keeps the reading order in sync after an author moves a graph with sealed views", () => {
    const original = {
      ...defaultArticleBriefingV3(snapshotV3(), "scenario/baseline", "Reading"),
      graphs,
      presentation: defaultArticleBriefingPresentationV3({ graphs }),
    };
    const moved = articleBriefingEditorMoveGraphV3(original, "pane/starling", -1);
    expect(articleBriefingViewsV3(moved).flatMap((view) => view.paneIds))
      .toEqual(["pane/starling", "pane/pv", "pane/pressure"]);
    expect(moved.outputs).toBe(original.outputs);
    expect(moved.controls).toBe(original.controls);
    expect(articleBriefingViewsV3(original).flatMap((view) => view.paneIds))
      .toEqual(["pane/pv", "pane/starling", "pane/pressure"]);

    const paired = { ...original, presentation: { ...original.presentation,
      views: [{ paneIds: ["pane/pv", "pane/starling"] }, { paneIds: ["pane/pressure"] }],
    } };
    expect(articleBriefingViewsV3(articleBriefingEditorMoveGraphV3(paired, "pane/starling", -1)))
      .toEqual([{ paneIds: ["pane/starling", "pane/pv"] }, { paneIds: ["pane/pressure"] }]);
    expect(articleBriefingViewsV3(articleBriefingEditorMoveGraphV3(paired, "pane/pressure", -1)))
      .toEqual([{ paneIds: ["pane/pv"] }, { paneIds: ["pane/pressure"] }, { paneIds: ["pane/starling"] }]);
  });

  it("reads an explicit extent ahead of the complexity heuristic and defaults to on-request analyses", () => {
    expect(articleBriefingPresentationV3({ graphs, scenarioScope, presentation: { extent: "inline" } })).toBe("inflow");
    expect(articleBriefingPresentationV3({ graphs, scenarioScope, presentation: { extent: "full" } })).toBe("fullscreen");
    expect(articleBriefingPresentationV3({ graphs, scenarioScope })).toBe("inflow");
    expect(articleBriefingPresentationV3({ graphs, scenarioScope, controls: [{}, {}] as never })).toBe("peek");
    expect(articleBriefingAnalysisRecomputeV3({ graphs })).toBe("on-request");
    expect(articleBriefingAnalysisRecomputeV3({ graphs, presentation: { extent: "peek", analysisRecompute: "automatic" } })).toBe("automatic");
    expect(defaultArticleBriefingPresentationV3({ graphs, scenarioScope, controls: [{}, {}] as never })).toEqual({
      extent: "peek", views: [{ paneIds: ["pane/pv"] }, { paneIds: ["pane/starling"] }, { paneIds: ["pane/pressure"] }], analysisRecompute: "on-request",
    });
  });

  it("keeps sealed pairs first, appends unsealed graphs as single views, and splits pairs for narrow stages", () => {
    const views = articleBriefingViewsV3({
      graphs, presentation: { extent: "peek", views: [{ paneIds: ["pane/pressure", "pane/pv"] }, { paneIds: ["pane/gone"] }] },
    });
    expect(views).toEqual([{ paneIds: ["pane/pressure", "pane/pv"] }, { paneIds: ["pane/starling"] }]);
    expect(articleBriefingSplitViewsV3(views)).toEqual([
      { paneIds: ["pane/pressure"] }, { paneIds: ["pane/pv"] }, { paneIds: ["pane/starling"] },
    ]);
  });

  it("does not trim an explicitly sealed inline Briefing", () => {
    const briefing = {
      defaultTitle: "t", scenarioScope: { visibleScenarioIds: ["a"], initialFocusScenarioId: "a" },
      graphs, outputs: [], controls: [], presentation: { extent: "inline" as const },
    };
    expect(articleBriefingInflowContentV3(briefing)).toBe(briefing);
  });
});

describe("Article Reader stage selection", () => {
  it("keeps the selected graph across pair splitting and rejoining", async () => {
    const { articleReaderActiveViewIndexV3 } = await import("@/components/article/reader/ArticleReaderEmbedV3");
    const pairs = [{ paneIds: ["pv", "starling"] }, { paneIds: ["pressure", "flow"] }];
    const singles = articleBriefingSplitViewsV3(pairs);
    // Selecting the second pair keeps its first pane; narrow shows that pane, wide returns to the pair.
    expect(articleReaderActiveViewIndexV3(pairs, "pressure")).toBe(1);
    expect(articleReaderActiveViewIndexV3(singles, "pressure")).toBe(2);
    // A pane chosen while narrow still selects its pair when widened.
    expect(articleReaderActiveViewIndexV3(singles, "flow")).toBe(3);
    expect(articleReaderActiveViewIndexV3(pairs, "flow")).toBe(1);
    // No selection or an unknown pane falls back to the first view.
    expect(articleReaderActiveViewIndexV3(pairs, null)).toBe(0);
    expect(articleReaderActiveViewIndexV3(pairs, "gone")).toBe(0);
    expect(articleReaderActiveViewIndexV3([], "pv")).toBe(0);
  });
});

describe("Workbench Briefing re-capture", () => {
  it("carries the sealed reading form through re-capture and drops views of removed graphs", async () => {
    const { reconcileWorkbenchBriefingV3 } = await import("@/components/workbench/WorkbenchBriefingPolicy");
    const snapshot = twoGraphSnapshotV3();
    const sealed: ExperimentPlacementBriefingV2 = {
      ...defaultArticleBriefingV3(snapshot, "scenario/baseline", "Sealed"),
      presentation: { extent: "full", views: [{ paneIds: ["pane/pv", "pane/pressure"] }], analysisRecompute: "automatic" },
    };
    const kept = reconcileWorkbenchBriefingV3({ briefing: sealed, preferredFocusScenarioId: "scenario/baseline", snapshot });
    expect(kept.presentation).toEqual({ extent: "full", views: [{ paneIds: ["pane/pv", "pane/pressure"] }], analysisRecompute: "automatic" });
    const narrowed = reconcileWorkbenchBriefingV3({
      briefing: { ...sealed, graphs: sealed.graphs.filter(({ paneId }) => paneId === "pane/pressure") },
      preferredFocusScenarioId: "scenario/baseline", snapshot,
    });
    expect(narrowed.presentation).toEqual({ extent: "full", views: [{ paneIds: ["pane/pressure"] }], analysisRecompute: "automatic" });
    expect(reconcileWorkbenchBriefingV3({ briefing: null, preferredFocusScenarioId: "scenario/baseline", snapshot }).presentation).toBeUndefined();
  });
});

describe("Article tags", () => {
  it("normalizes typed tags to the same canonical form the database enforces", () => {
    expect(normalizeArticleTagV1("  ＃ＰＶ　 loop ")).toBe("PV loop");
    expect(normalizeArticleTagV1("#前負荷")).toBe("前負荷");
    expect(parseArticleTagInputV1("前負荷、後負荷, 収縮性\n心不全")).toEqual([
      "前負荷", "後負荷", "収縮性", "心不全",
    ]);
    expect(isCanonicalArticleTagV1("PV loop")).toBe(true);
    for (const invalid of ["", " lead", "two  spaces", "#hash", "a,b", "ＰＶ", "x".repeat(33), "zero\u200bwidth"]) {
      expect(isCanonicalArticleTagV1(invalid)).toBe(false);
    }
    expect(isCanonicalArticleTagV1("😀".repeat(32))).toBe(true);
  });

  it("adds tags without duplicates beyond the five-tag limit", () => {
    const first = addArticleTagsV1([], "PV loop, 前負荷");
    expect(first).toEqual({ tags: ["PV loop", "前負荷"], rejected: [] });
    const duplicate = addArticleTagsV1(first.tags, "pv LOOP");
    expect(duplicate.tags).toBe(first.tags);
    const full = addArticleTagsV1(first.tags, "a, b, c, d");
    expect(full.tags).toHaveLength(STUDIO_ARTICLE_TAG_LIMIT_V1);
    expect(full.rejected).toEqual(["d"]);
    expect(addArticleTagsV1([], "x".repeat(33)).rejected).toHaveLength(1);
  });

  it("counts tags case-insensitively and reads canonical tag pages", () => {
    expect(countArticleTagsV1([["PV loop"], ["pv loop", "前負荷"], ["PV loop"]], "ja")).toEqual([
      { tag: "PV loop", key: "pv loop", count: 3 },
      { tag: "前負荷", key: "前負荷", count: 1 },
    ]);
    expect(articleTagFromSearchV1("?tag=%23PV%20loop")).toBe("PV loop");
    expect(articleTagFromSearchV1("?tag=%20")).toBeNull();
    expect(articleTagHref({ locale: "ja", tag: "PV loop" })).toBe("/ja/articles?tag=PV+loop");
  });

  it("keeps tags in the exact draft contract", () => {
    const draft = createEmptyArticleDraftV3("ja", "Untitled");
    expect(draft.tags).toEqual([]);
    expect(validateStudioArticleDraftV2({ ...draft, tags: ["前負荷"] }).tags).toEqual(["前負荷"]);
    expect(() => validateStudioArticleDraftV2({ ...draft, tags: ["a", "a"] })).toThrow(/tags/);
    expect(() => validateStudioArticleDraftV2({ ...draft, tags: ["a", "b", "c", "d", "e", "f"] })).toThrow(/at most 5/);
    const { tags: _omitted, ...withoutTags } = draft;
    expect(() => validateStudioArticleDraftV2(withoutTags)).toThrow(/keys must be exactly/);
  });

  it("suggests shared spellings first, excluding tags already chosen", () => {
    const suggestions = [
      { tag: "PV loop", key: "pv loop", publicCount: 4, mine: false },
      { tag: "前負荷", key: "前負荷", publicCount: 2, mine: true },
      { tag: "後負荷", key: "後負荷", publicCount: 1, mine: false },
      { tag: "負荷試験", key: "負荷試験", publicCount: 0, mine: true },
    ];
    expect(selectArticleTagSuggestionsV1(suggestions, ["後負荷"], "").map((entry) => entry.tag))
      .toEqual(["前負荷", "負荷試験", "PV loop"]);
    expect(selectArticleTagSuggestionsV1(suggestions, [], "負荷").map((entry) => entry.tag))
      .toEqual(["負荷試験", "前負荷", "後負荷"]);
  });

  it("merges public and own tags without double-counting one Article", () => {
    const merged = mergeArticleTagSuggestionsV1(
      [{ tag: "PV loop", articleCount: 1 }, { tag: "pv loop", articleCount: 1 }, { tag: "前負荷", articleCount: 3 }],
      [["PV LOOP"], ["後負荷"]],
      "ja",
    );
    expect(merged).toEqual([
      { tag: "PV loop", key: "pv loop", publicCount: 1, mine: true },
      { tag: "前負荷", key: "前負荷", publicCount: 3, mine: false },
      { tag: "後負荷", key: "後負荷", publicCount: 0, mine: true },
    ]);
  });

  it("renders the tag field and the publication tag summary", async () => {
    await i18n.changeLanguage("ja");
    const field = renderToStaticMarkup(React.createElement(ArticleEditorTagsV1, {
      tags: ["前負荷"],
      suggestions: [],
      onChange: () => undefined,
    }));
    expect(field).toContain("article-editor-tag");
    expect(field).toContain('aria-label="タグ「前負荷」を外す"');
    expect(field).toContain('role="combobox"');
    const menu = (tags: readonly string[]) => renderToStaticMarkup(React.createElement(ArticlePublishMenuV3, {
      articleHref: "/ja/articles/example",
      disabled: false,
      open: true,
      saving: false,
      visibility: "draft",
      tags,
      onEditTags: () => undefined,
      onToggleOpen: () => undefined,
      onSetVisibility: () => undefined,
    }));
    expect(menu([])).toContain("タグが未設定です");
    expect(menu(["前負荷"])).toContain("タグを編集");
    expect(menu(["前負荷"])).toContain("前負荷");
  });

  it("filters Article management by status, tag, untagged and title or #tag search", () => {
    const items = [
      { articleId: "a", version: 1, visibility: "public" as const, title: "前負荷の基本", tags: ["前負荷"], updatedAt: null },
      { articleId: "b", version: 1, visibility: "draft" as const, title: "PVループ", tags: ["PV loop", "前負荷"], updatedAt: null },
      { articleId: "c", version: 1, visibility: "draft" as const, title: "メモ", tags: [], updatedAt: null },
    ];
    const ids = (search: string) => selectArticleLibraryItemsV3(
      items,
      readArticleLibraryFilterV3(new URLSearchParams(search)),
    ).map((item) => item.articleId);
    expect(ids("")).toEqual(["a", "b", "c"]);
    expect(ids("status=draft")).toEqual(["b", "c"]);
    expect(ids("tag=%E5%89%8D%E8%B2%A0%E8%8D%B7")).toEqual(["a", "b"]);
    expect(ids("tag=pv%20LOOP&status=draft")).toEqual(["b"]);
    expect(ids("untagged=1")).toEqual(["c"]);
    expect(ids("q=%23pv")).toEqual(["b"]);
    expect(ids("q=%E3%83%A1%E3%83%A2")).toEqual(["c"]);
  });
});

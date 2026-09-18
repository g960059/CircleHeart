import React from "react";
import { Link, Navigate, useParams, useSearchParams } from "react-router-dom";

import { articlePreviewHref, experimentSnapshotHref, homeHref } from "@/homeLinks";
import { isLocale, type Locale } from "@/localeRouting";
import { studioDevSurfacesEnabledV1 } from "@/studio/application/dev/StudioDevAccessV1";
import {
  BROWSER_CONTENT_STORE_KEY,
  BROWSER_CONTENT_STORE_SCHEMA_ID,
} from "@/studio/infrastructure/browser/BrowserContentStore";
import { BrowserPreparedAnalysisStoreV1 } from "@/studio/infrastructure/browser/BrowserPreparedAnalysisStoreV1";
import {
  STUDIO_ARTICLE_DRAFT_V2_SCHEMA_ID,
  type StudioArticleBlockV2,
  type StudioArticleDraftV2,
} from "@/studio/contracts/v2/article";
import type {
  ExperimentPlacementBriefingPresentationV2,
  ExperimentPlacementBriefingV2,
  ExperimentSnapshotV2,
} from "@/studio/contracts/v2/content";
import {
  createArticleExperimentBlockV3,
  defaultArticleBriefingV3,
} from "@/studio/application/article/ArticleExperimentPlacementV3";
import { validateExperimentSnapshotV2 } from "@/studio/application/authoring/StudioExperimentDataV2";
import {
  ARTICLE_EMBED_STUDY_SURFACE_V1,
  ARTICLE_EMBED_STUDY_OUTPUT_IDS_V1,
  ARTICLE_EMBED_STUDY_PANE_IDS_V1,
} from "./embedStudyDefinitionV1";

/**
 * Development-only entry for the Article embed reading study.
 *
 * It seeds this browser with the exact study Snapshot, its sealed-state
 * prepared analyses, and one Article whose Placements seal each reading form,
 * then links to the ordinary Reader preview route. Nothing here is published
 * or persisted outside this browser; the page never talks to a remote
 * repository.
 */
export const ARTICLE_EMBED_STUDY_ARTICLE_ID_V1 = "dev-article-embed-study-v3";

const P = ARTICLE_EMBED_STUDY_PANE_IDS_V1;
const O = ARTICLE_EMBED_STUDY_OUTPUT_IDS_V1;

type StudyPlacementV1 = Readonly<{
  placementId: string;
  title: string;
  caption: string;
  briefing: (base: ExperimentPlacementBriefingV2) => ExperimentPlacementBriefingV2;
}>;

const withPresentation = (
  briefing: ExperimentPlacementBriefingV2,
  presentation: ExperimentPlacementBriefingPresentationV2,
): ExperimentPlacementBriefingV2 => ({ ...briefing, presentation });

const onlyGraphs = (briefing: ExperimentPlacementBriefingV2, paneIds: readonly string[]) => ({
  ...briefing,
  graphs: paneIds.flatMap((paneId, order) => {
    const graph = briefing.graphs.find((candidate) => candidate.paneId === paneId);
    return graph === undefined ? [] : [{ ...graph, order, emphasis: order === 0 ? "primary" as const : "supporting" as const }];
  }),
});

const onlyOutputs = (
  briefing: ExperimentPlacementBriefingV2,
  sourcePaneIds: readonly string[],
  outputIds: readonly string[] = O,
) => ({
  ...briefing,
  outputs: [...briefing.outputs]
    .filter((output) => sourcePaneIds.includes(output.sourcePaneId) && outputIds.includes(output.outputId))
    .sort((left, right) => sourcePaneIds.indexOf(left.sourcePaneId) - sourcePaneIds.indexOf(right.sourcePaneId)
      || outputIds.indexOf(left.outputId) - outputIds.indexOf(right.outputId))
    .map((output, order) => ({ ...output, order })),
});

const onlyControls = (briefing: ExperimentPlacementBriefingV2, sourcePaneIds: readonly string[]) => ({
  ...briefing,
  controls: briefing.controls
    .filter((control) => sourcePaneIds.includes(control.sourcePaneId))
    .map((control, order) => ({ ...control, order })),
});

const KEY_OUTPUTS = [O[0], O[2], O[3], O[4]] as const;

export const STUDY_PLACEMENTS_V1: readonly StudyPlacementV1[] = [
  {
    placementId: "study-inline-light",
    title: "循環血液量とPVループ",
    caption: "本文内・軽量。PVループ1枚に3つのScenarioを重ね、基準の主要4指標だけを読む。操作は持たない。",
    briefing: (base) => withPresentation(
      onlyControls(onlyOutputs(onlyGraphs(base, [P.pv]), [P.outputsBaseline], KEY_OUTPUTS), []),
      { extent: "inline", analysisRecompute: "on-request" },
    ),
  },
  {
    placementId: "study-inline-compare",
    title: "基準とTBV +1000 を並べて読む",
    caption: "本文内・2列。PVループとGuyton/Starlingを1画面に2列で封入し、output paneを2つ（基準・TBV +1000）並べてScenario比較にする。",
    briefing: (base) => withPresentation(
      onlyControls(onlyOutputs(onlyGraphs(base, [P.pv, P.starling]), [P.outputsBaseline, P.outputsPlus1000], [O[0], O[1], O[2], O[4]]), []),
      { extent: "inline", views: [{ paneIds: [P.pv, P.starling] }], analysisRecompute: "on-request" },
    ),
  },
  {
    placementId: "study-peek-heavy",
    title: "循環血液量の段階的増加（全部入り）",
    caption: "本文の横。3 Scenario・4 graph（2画面×2列）・3 control pane・3 output pane×10 outputの負荷例。ESPVR/EDPVR・Starlingは封入時の測定済み結果を読み込み、操作後は読者が求めたときだけ再測定する。",
    briefing: (base) => withPresentation(
      base,
      { extent: "peek", views: [{ paneIds: [P.pv, P.starling] }, { paneIds: [P.pressure, P.flow] }], analysisRecompute: "on-request" },
    ),
  },
  {
    placementId: "study-full-heavy",
    title: "循環血液量の段階的増加（全幅）",
    caption: "全幅。同じ負荷例をWorkbenchと同じ区画配置（graph 4枚をタイル、下にoutput、右にcontrol）で開く。",
    briefing: (base) => withPresentation(
      base,
      { extent: "full", views: [{ paneIds: [P.pv, P.starling] }, { paneIds: [P.pressure, P.flow] }], analysisRecompute: "on-request" },
    ),
  },
  {
    placementId: "study-peek-automatic",
    title: "操作のたびに自動で再測定する場合",
    caption: "本文の横。比較用に再測定を「自動」で封入した配置。基準のcontrolを動かすたびに、基準のESPVR/EDPVR・Starlingを測り直す（数十秒）。",
    briefing: (base) => withPresentation(
      onlyControls(onlyOutputs(onlyGraphs(base, [P.pv, P.starling]), [P.outputsBaseline]), [P.controlsBaseline]),
      { extent: "peek", analysisRecompute: "automatic" },
    ),
  },
];

function paragraph(blockId: string, text: string): StudioArticleBlockV2 {
  return { blockId, kind: "paragraph", text };
}

function heading(blockId: string, text: string): StudioArticleBlockV2 {
  return { blockId, kind: "heading", level: 2, text };
}

export function buildArticleEmbedStudyArticleV1(snapshot: ExperimentSnapshotV2): StudioArticleDraftV2 {
  const base = defaultArticleBriefingV3(snapshot, snapshot.content.scenarios[0]?.scenarioId, "循環血液量の段階的増加");
  const experimentBlock = (placement: StudyPlacementV1) => {
    const block = createArticleExperimentBlockV3({
      snapshot,
      briefing: placement.briefing(base),
      createId: (kind) => `${kind}/${placement.placementId}`,
    });
    return {
      ...block,
      placement: { ...block.placement, titleOverride: placement.title, caption: placement.caption },
    };
  };
  const [inlineLight, inlineCompare, peekHeavy, fullHeavy, peekAutomatic] = STUDY_PLACEMENTS_V1.map(experimentBlock);
  return {
    schemaId: STUDIO_ARTICLE_DRAFT_V2_SCHEMA_ID,
    articleId: ARTICLE_EMBED_STUDY_ARTICLE_ID_V1,
    draftVersion: 1,
    visibility: "draft",
    locale: "ja",
    title: "循環血液量が増えると心臓は何をするか — 記事埋め込みスタディ v3",
    blocks: [
      paragraph("p-lead", "この記事は記事埋め込みの読み方スタディ用です。3つのScenario（基準、TBV +500 mL、TBV +1000 mL）は、登録済みStandard74基準captureから総血液量controlを適用し、実モデルで20拍進めた地点をcaptureしたものです。各Scenarioの封入時のESPVR/EDPVR・Starling測定は、登録済み解析executorで事前に測定してSnapshotと一緒に持ち込んでいます。qualifiedな基準でも公開Snapshotでもありません。"),
      heading("h-inline", "1. 本文内で一目で読む"),
      paragraph("p-inline-1", "静脈側に血液を足すと、まず右房圧が上がり、右室・左室の拡張末期容積が増えます。Frank–Starlingの関係により一回拍出量も増えますが、その増え方は容積が増えるほど鈍ります。下の埋め込みは、PVループ1枚に3つのScenarioを重ね、基準の4指標だけを添えた最小構成です。枠線もcontrolもありません。"),
      inlineLight!,
      paragraph("p-inline-2", "比較したい値がある場合は、Workbenchでoutput paneを比較したいScenarioごとに作り、両方を封入します。paneのラベルがそのまま節の見出しになり、2つの節は幅があれば横に並び、同じ行に同じ指標が揃います。graphは2枚を1画面に2列で封入しました。スマートフォンの幅では自動で1枚ずつのタブになります。"),
      inlineCompare!,
      heading("h-peek", "2. 本文と並べる"),
      paragraph("p-peek-1", "4枚のgraph、3つのcontrol pane、3つのoutput pane（10指標ずつ）を読む場合は本文内では長すぎます。下のアンカーから本文の横に開きます。graphは「PVループ + Guyton/Starling」「圧波形 + 弁流量」の2画面で、上に固定されます。比較する3つのScenarioは短い行に揃え、同じ指標の組を一緒に切り替えます。操作するpaneだけを下のタブで選びます。対象Scenarioは封入時のbindingのままで、グラフ・比較値・操作を同時に見られます。"),
      peekHeavy!,
      paragraph("p-peek-2", "スライダーを動かすと拍ごとの応答（ループ、波形、出力値）はすぐに変わりますが、ESPVR/EDPVR・Starling曲線は封入時の条件の測定結果のまま薄く残り、graphの下に「操作後の条件はまだ測定していません」と再測定ボタンが出ます。再測定は1 Scenarioあたり数十秒から数分かかるので、読者が求めたときだけ走らせます。"),
      heading("h-full", "3. 全幅で開く"),
      paragraph("p-full-1", "全幅は同じパネルを最大幅で開いた状態で、Workbenchと同じ区画（graphを左上にタイル、左下にoutput、右にcontrol）になります。ヘッダーの「記事と並べる」で並置に戻れます。"),
      fullHeavy!,
      heading("h-auto", "4. 比較用：自動で再測定する封入"),
      paragraph("p-auto-1", "著者が「操作のたびに自動」で封入した場合の配置です。操作のたびに対象Scenarioの測定が走り、その間はcontrolが使えません。デスクトップ向けの記事や、controlが1つだけの短い実験ではこちらが自然な場合もあります。"),
      peekAutomatic!,
      paragraph("p-tail", "ここまでの埋め込みは、どれも同じ数値lane・同じrenderer・同じBriefingデータを使っています。変わるのは封入した読み方だけです。"),
    ],
  };
}

type EnvelopeV1 = {
  schemaId: typeof BROWSER_CONTENT_STORE_SCHEMA_ID;
  experiments: unknown[];
  snapshots: ExperimentSnapshotV2[];
  articles: StudioArticleDraftV2[];
};

function seedBrowserContentV1(snapshot: ExperimentSnapshotV2, article: StudioArticleDraftV2): void {
  let envelope: EnvelopeV1 = { schemaId: BROWSER_CONTENT_STORE_SCHEMA_ID, experiments: [], snapshots: [], articles: [] };
  try {
    const raw = window.localStorage.getItem(BROWSER_CONTENT_STORE_KEY);
    const parsed = raw === null ? null : JSON.parse(raw) as Partial<EnvelopeV1> | null;
    if (parsed && parsed.schemaId === BROWSER_CONTENT_STORE_SCHEMA_ID) {
      envelope = {
        schemaId: BROWSER_CONTENT_STORE_SCHEMA_ID,
        experiments: Array.isArray(parsed.experiments) ? parsed.experiments : [],
        snapshots: Array.isArray(parsed.snapshots) ? parsed.snapshots : [],
        articles: Array.isArray(parsed.articles) ? parsed.articles : [],
      };
    }
  } catch {
    // A corrupt envelope is replaced by the study content only.
  }
  envelope.snapshots = [...envelope.snapshots.filter((s) => s.snapshotId !== snapshot.snapshotId), snapshot];
  envelope.articles = [...envelope.articles.filter((a) => a.articleId !== article.articleId), article];
  window.localStorage.setItem(BROWSER_CONTENT_STORE_KEY, JSON.stringify(envelope));
}

type StudyStateV1 =
  | { kind: "loading" }
  | { kind: "ready"; snapshot: ExperimentSnapshotV2; article: StudioArticleDraftV2; admission: string; generatedAt: string; beats: number; prepared: number; analysisWall: Readonly<Record<string, number>> }
  | { kind: "error"; message: string };

export function EmbedStudyPageV1() {
  const { locale: rawLocale } = useParams();
  const [searchParams] = useSearchParams();
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "ja";
  const enabled = studioDevSurfacesEnabledV1();
  const [state, setState] = React.useState<StudyStateV1>({ kind: "loading" });
  React.useEffect(() => {
    if (!enabled) return undefined;
    let current = true;
    void import("./embedStudySnapshotV1.json").then((module) => {
      const record = module.default as {
        snapshot: unknown; admission: { status: string; reason?: string }; generatedAt: string; beatsAdvancedPerLane: number;
        preparedAnalyses: readonly { captureSha256: string }[]; analysisWallMsByScenario: Record<string, number>;
      };
      const captured = validateExperimentSnapshotV2(record.snapshot);
      // Refine only the authored panes. Exact captures and prepared evidence
      // remain the measured fixture, so no new scientific sweep is implied.
      const snapshot = validateExperimentSnapshotV2({ ...captured, content: { ...captured.content, surface: ARTICLE_EMBED_STUDY_SURFACE_V1 } });
      const article = buildArticleEmbedStudyArticleV1(snapshot);
      seedBrowserContentV1(snapshot, article);
      new BrowserPreparedAnalysisStoreV1().writeAll(record.preparedAnalyses);
      if (current) {
        setState({
          kind: "ready", snapshot, article, generatedAt: record.generatedAt, beats: record.beatsAdvancedPerLane,
          prepared: record.preparedAnalyses.length, analysisWall: record.analysisWallMsByScenario,
          admission: record.admission.status === "passed" ? "passed" : `rejected: ${record.admission.reason ?? ""}`,
        });
      }
    }).catch((error) => {
      if (current) setState({ kind: "error", message: error instanceof Error ? error.message : String(error) });
    });
    return () => { current = false; };
  }, [enabled]);
  if (!enabled) return <Navigate to={homeHref(locale)} replace />;
  if (state.kind === "ready" && searchParams.get("open") === "reader") {
    return <Navigate to={articlePreviewHref({ articleId: state.article.articleId, locale })} replace />;
  }
  return (
    <div className="h-full overflow-y-auto bg-wb-app text-wb-text" data-testid="dev-embed-study-v1">
      <main className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-7">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-wb-accent">Development</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">記事埋め込みスタディ v3（stage・pane sections・封入時測定）</h1>
        <p className="mt-3 text-sm leading-7 text-wb-muted">
          このページを開くと、実モデルで生成した3 Scenarioの学習用Snapshot、その封入時のESPVR/EDPVR・Starling測定、
          各読み方を封入した記事がこのブラウザにだけ保存されます。リモートの記事・Snapshot・DBには触れません。
        </p>
        {state.kind === "loading" && <p className="mt-6 text-sm text-wb-subtle">fixtureを読み込んでいます…</p>}
        {state.kind === "error" && <p className="mt-6 text-sm text-wb-danger" role="alert">{state.message}</p>}
        {state.kind === "ready" && (
          <>
            <dl className="mt-6 grid gap-1 text-xs text-wb-muted sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-x-4">
              <dt>Snapshot</dt><dd className="font-mono break-all">{state.snapshot.snapshotId}</dd>
              <dt>Model</dt><dd className="font-mono break-all">{state.snapshot.content.modelId}</dd>
              <dt>Surface</dt><dd className="font-mono break-all">{state.snapshot.surfaceReleaseId}</dd>
              <dt>Scenarios</dt><dd>{state.snapshot.content.scenarios.map((s) => s.label).join(" / ")}</dd>
              <dt>Capture</dt><dd>基準captureからTBV controlを適用し、各laneを{state.beats}拍進めた受理境界。admission: {state.admission}。生成 {state.generatedAt}</dd>
              <dt>封入時測定</dt><dd>{state.prepared}件のprepared Scenario analysis（Node、1件あたり {Object.values(state.analysisWall).map((ms) => (ms / 1000).toFixed(0)).join(" / ")} 秒）</dd>
            </dl>
            <h2 className="mt-8 text-base font-semibold">開く</h2>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link className="text-wb-accent underline-offset-4 hover:underline" to={articlePreviewHref({ articleId: state.article.articleId, locale })}>
                  記事プレビュー（本文内・並置・全幅の各配置）
                </Link>
              </li>
              {STUDY_PLACEMENTS_V1.map((placement) => (
                <li key={placement.placementId} className="pl-4">
                  <Link className="text-wb-accent underline-offset-4 hover:underline"
                    to={`${articlePreviewHref({ articleId: state.article.articleId, locale })}#placement-${encodeURIComponent(`placement/${placement.placementId}`)}`}>
                    {placement.title}
                  </Link>
                </li>
              ))}
              <li>
                <Link className="text-wb-accent underline-offset-4 hover:underline" to={experimentSnapshotHref({ snapshotId: state.snapshot.snapshotId, locale })}>
                  同じSnapshotをWorkbenchで開く（比較用。ヘッダーのBriefingから「読み方」を封入できる）
                </Link>
              </li>
            </ul>
          </>
        )}
      </main>
    </div>
  );
}

export default EmbedStudyPageV1;

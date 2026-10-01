import React from "react";
import {
  ArrowUpRight,
  BookOpenText,
  Boxes,
  Camera,
  FlaskConical,
  RefreshCw,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, Navigate, useParams } from "react-router-dom";

import {
  articleEditorHref,
  experimentDetailHref,
  experimentSnapshotHref,
  homeHref,
  modelLabHref,
} from "@/homeLinks";
import { isLocale, type Locale } from "@/localeRouting";
import {
  studioDevSurfacesEnabledV1,
} from "@/studio/application/dev/StudioDevAccessV1";
import {
  loadStudioDefaultClientCompositionV2,
  loadStudioExperimentClientCompositionV2,
  loadStudioLocalCurrentClientCompositionV1,
  loadStudioSnapshotClientCompositionV2,
  invalidateStudioClientCompositionCachesV2,
  type StudioClientCompositionV2,
} from "@/studio/composition/StudioDefaultCompositionV2";
import type {
  StudioReleaseStageV1,
} from "@/studio/contracts/v2/modelSurface";
import {
  BrowserContentStore,
} from "@/studio/infrastructure/browser/BrowserContentStore";
import {
  BrowserExperimentIndex,
} from "@/studio/infrastructure/browser/BrowserExperimentIndex";
import {
  createStudioSupabaseContentRepositoryV1,
} from "@/studio/infrastructure/supabase/StudioSupabaseContentRepositoryV1";

type DevExperimentItemV3 = Readonly<{
  experimentId: string;
  modelId: string;
  surfaceSeriesId: string;
  title: string;
  scenarioCount: number;
  version: number;
  updatedAt: string;
  published: boolean;
}>;

type DevArticleItemV3 = Readonly<{
  articleId: string;
  title: string;
  visibility: "draft" | "public";
  locale: string;
  updatedAt: string | null;
}>;

type DevSnapshotItemV3 = Readonly<{
  snapshotId: string;
  modelId: string;
  surfaceSeriesId: string;
  surfaceReleaseId: string;
  title: string;
  scenarioCount: number;
  paneCount: number;
  createdAt: string;
}>;

export type DevModelSourceV3 =
  | "active"
  | "model-lab"
  | "referenced";

export type DevModelCandidateV3 = Readonly<{
  modelId: string;
  displayName: string;
  stage: StudioReleaseStageV1 | null;
  surfaceReleaseId: string | null;
  source: DevModelSourceV3;
  resolutionKey?: string;
  available: boolean;
}>;

export type DevModelResolutionV3 = Readonly<{
  source: DevModelSourceV3;
  stage: StudioReleaseStageV1 | null;
  surfaceReleaseId: string | null;
  available: boolean;
}>;

export type DevModelItemV3 = Readonly<{
  modelId: string;
  displayName: string;
  resolutions: readonly DevModelResolutionV3[];
  available: boolean;
}>;

type DevDashboardReadyV3 = Readonly<{
  kind: "ready";
  storage: "browser" | "supabase";
  experiments: readonly DevExperimentItemV3[];
  articles: readonly DevArticleItemV3[];
  snapshots: readonly DevSnapshotItemV3[];
  models: readonly DevModelItemV3[];
}>;

type DevDashboardStateV3 =
  | Readonly<{ kind: "loading" }>
  | DevDashboardReadyV3
  | Readonly<{ kind: "error"; message: string }>;

const MODEL_SOURCE_ORDER_V3: readonly DevModelSourceV3[] = Object.freeze([
  "model-lab",
  "active",
  "referenced",
]);

/** Deduplicates launch and content references without inventing another
 * durable model identity for this intentionally small development view. */
export function mergeDevModelCandidatesV3(
  candidates: readonly DevModelCandidateV3[],
): readonly DevModelItemV3[] {
  const byModelId = new Map<string, {
    modelId: string;
    displayName: string;
    resolutions: Map<string, DevModelResolutionV3>;
    available: boolean;
  }>();
  for (const candidate of candidates) {
    const resolutionKey = candidate.resolutionKey ?? candidate.source;
    const existing = byModelId.get(candidate.modelId);
    if (existing === undefined) {
      byModelId.set(candidate.modelId, {
        modelId: candidate.modelId,
        displayName: candidate.displayName,
        resolutions: new Map([[resolutionKey, Object.freeze({
          source: candidate.source,
          stage: candidate.stage,
          surfaceReleaseId: candidate.surfaceReleaseId,
          available: candidate.available,
        })]]),
        available: candidate.available,
      });
      continue;
    }
    existing.resolutions.set(resolutionKey, Object.freeze({
      source: candidate.source,
      stage: candidate.stage,
      surfaceReleaseId: candidate.surfaceReleaseId,
      available: candidate.available,
    }));
    existing.available ||= candidate.available;
    if (existing.displayName === existing.modelId) {
      existing.displayName = candidate.displayName;
    }
  }
  const merged = [...byModelId.values()].map((item) => Object.freeze({
    modelId: item.modelId,
    displayName: item.displayName,
    resolutions: Object.freeze([...item.resolutions.values()].sort(
      (left, right) => MODEL_SOURCE_ORDER_V3.indexOf(left.source)
        - MODEL_SOURCE_ORDER_V3.indexOf(right.source)
        || (left.surfaceReleaseId ?? "")
          .localeCompare(right.surfaceReleaseId ?? ""),
    )),
    available: item.available,
  })).sort((left, right) => {
    const leftRank = Math.min(...left.resolutions.map(({ source }) =>
      MODEL_SOURCE_ORDER_V3.indexOf(source)));
    const rightRank = Math.min(...right.resolutions.map(({ source }) =>
      MODEL_SOURCE_ORDER_V3.indexOf(source)));
    return leftRank - rightRank
      || left.displayName.localeCompare(right.displayName)
      || left.modelId.localeCompare(right.modelId);
  });
  return Object.freeze(merged);
}

export function DevDashboardPage() {
  const { t } = useTranslation();
  const { locale: localeParam } = useParams();
  const locale: Locale = isLocale(localeParam) ? localeParam : "ja";
  const store = React.useMemo(() => new BrowserContentStore(), []);
  const experimentIndex = React.useMemo(
    () => new BrowserExperimentIndex(),
    [],
  );
  const remoteRepository = React.useMemo(
    createStudioSupabaseContentRepositoryV1,
    [],
  );
  const [state, setState] = React.useState<DevDashboardStateV3>({
    kind: "loading",
  });
  const [reloadToken, setReloadToken] = React.useState(0);
  const enabled = studioDevSurfacesEnabledV1();

  React.useEffect(() => {
    if (!enabled) return undefined;
    let current = true;
    setState({ kind: "loading" });
    void loadDevDashboardV3({
      experimentIndex,
      remoteRepository,
      store,
      untitled: t("workbench.selector.untitled"),
    }).then((next) => {
      if (current) setState(next);
    }).catch((error) => {
      if (current) setState({ kind: "error", message: errorMessageV3(error) });
    });
    return () => {
      current = false;
    };
  }, [enabled, experimentIndex, reloadToken, remoteRepository, store, t]);

  if (!enabled) {
    return <Navigate to={homeHref(locale)} replace />;
  }

  return (
    <div
      className="h-full overflow-y-auto bg-wb-app text-wb-text"
      data-testid="dev-dashboard-v3"
    >
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-7 sm:py-12">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-wb-accent">
              {t("devDashboard.eyebrow")}
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
              {t("devDashboard.title")}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-wb-muted">
              {t("devDashboard.description")}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-wb-muted transition-colors hover:bg-wb-hover hover:text-wb-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wb-accent"
              aria-label={t("devDashboard.refresh")}
              title={t("devDashboard.refresh")}
              onClick={() => {
                invalidateStudioClientCompositionCachesV2();
                setReloadToken((value) => value + 1);
              }}
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
            </button>
            <Link
              to={modelLabHref(locale)}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-wb-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-wb-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wb-accent"
              data-testid="open-model-lab-v3"
            >
              <FlaskConical className="h-4 w-4" aria-hidden="true" />
              {t("devDashboard.openModelLab")}
            </Link>
            <Link to={`${modelLabHref(locale)}?model=cardiorespiratory`} data-testid="open-cardiorespiratory-model-lab" className="inline-flex min-h-10 items-center justify-center rounded-lg border border-wb-line px-3 text-sm text-wb-text hover:bg-wb-hover">
              {locale === "ja" ? "心肺・呼吸器 Dev" : "Cardiorespiratory Dev"}
            </Link>
          </div>
        </div>

        {state.kind === "loading" && (
          <p className="mt-12 text-sm text-wb-muted" role="status">
            {t("devDashboard.loading")}
          </p>
        )}
        {state.kind === "error" && (
          <div className="mt-10 rounded-xl bg-wb-danger-soft p-4 text-sm text-wb-danger" role="alert">
            <p className="font-semibold">{t("devDashboard.error")}</p>
            <p className="mt-1 font-mono text-xs">{state.message}</p>
          </div>
        )}
        {state.kind === "ready" && (
          <>
            <p className="mt-6 text-[11px] text-wb-subtle">
              {t("devDashboard.source", {
                source: t(`devDashboard.storage.${state.storage}`),
              })}
            </p>
            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <DevInventorySectionV3
                title={t("devDashboard.experiments")}
                count={state.experiments.length}
                icon={<FlaskConical className="h-4 w-4" aria-hidden="true" />}
                empty={t("devDashboard.empty")}
              >
                {state.experiments.map((experiment) => (
                  <DevInventoryLinkV3
                    key={experiment.experimentId}
                    href={experimentDetailHref({
                      experimentId: experiment.experimentId,
                      locale,
                    })}
                    title={experiment.title}
                    meta={[
                      experiment.published
                        ? t("devDashboard.published")
                        : t("devDashboard.draft"),
                      t("devDashboard.scenarios", {
                        count: experiment.scenarioCount,
                      }),
                      formatDevDateV3(experiment.updatedAt, locale),
                    ]}
                  />
                ))}
              </DevInventorySectionV3>

              <DevInventorySectionV3
                title={t("devDashboard.articles")}
                count={state.articles.length}
                icon={<BookOpenText className="h-4 w-4" aria-hidden="true" />}
                empty={t("devDashboard.empty")}
              >
                {state.articles.map((article) => (
                  <DevInventoryLinkV3
                    key={article.articleId}
                    href={articleEditorHref({ articleId: article.articleId, locale })}
                    title={article.title || t("articleEditor.untitled")}
                    meta={[
                      article.visibility === "public"
                        ? t("devDashboard.public")
                        : t("devDashboard.draft"),
                      article.locale.toUpperCase(),
                      article.updatedAt === null
                        ? t("devDashboard.local")
                        : formatDevDateV3(article.updatedAt, locale),
                    ]}
                  />
                ))}
              </DevInventorySectionV3>

              <DevInventorySectionV3
                title={t("devDashboard.snapshots")}
                count={state.snapshots.length}
                icon={<Camera className="h-4 w-4" aria-hidden="true" />}
                empty={t("devDashboard.empty")}
              >
                {state.snapshots.map((snapshot) => (
                  <DevInventoryLinkV3
                    key={snapshot.snapshotId}
                    href={experimentSnapshotHref({
                      locale,
                      snapshotId: snapshot.snapshotId,
                    })}
                    title={snapshot.title}
                    meta={[
                      t("devDashboard.scenarios", {
                        count: snapshot.scenarioCount,
                      }),
                      t("devDashboard.panes", { count: snapshot.paneCount }),
                      formatDevDateV3(snapshot.createdAt, locale),
                    ]}
                    technicalId={snapshot.snapshotId}
                  />
                ))}
              </DevInventorySectionV3>

              <DevInventorySectionV3
                title={t("devDashboard.models")}
                count={state.models.length}
                icon={<Boxes className="h-4 w-4" aria-hidden="true" />}
                empty={t("devDashboard.empty")}
              >
                {state.models.map((model) => (
                  <li key={model.modelId} className="px-4 py-3.5 sm:px-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold tracking-tight">
                          {model.displayName}
                        </p>
                        <p className="mt-1 truncate font-mono text-[10px] text-wb-subtle" title={model.modelId}>
                          {model.modelId}
                        </p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        model.available
                          ? "bg-wb-accent/10 text-wb-accent"
                          : "bg-wb-danger-soft text-wb-danger"
                      }`}>
                        {model.available
                          ? t("devDashboard.available")
                          : t("devDashboard.unavailable")}
                      </span>
                    </div>
                    <div className="mt-2 grid gap-1.5">
                      {model.resolutions.map((resolution, resolutionIndex) => (
                        <div
                          key={`${resolution.source}-${
                            resolution.surfaceReleaseId ?? resolutionIndex
                          }`}
                          className="flex min-w-0 flex-wrap items-center gap-1.5"
                        >
                          <span className="rounded-md bg-wb-hover px-1.5 py-0.5 text-[10px] text-wb-muted">
                            {t(`devDashboard.modelSource.${resolution.source}`)}
                          </span>
                          <span className="text-[10px] text-wb-subtle">
                            {resolution.available
                              ? t(`devDashboard.stage.${resolution.stage ?? "unknown"}`)
                              : t("devDashboard.unavailable")}
                          </span>
                          {resolution.surfaceReleaseId !== null && (
                            <span
                              className="min-w-0 max-w-full truncate font-mono text-[10px] text-wb-subtle"
                              title={resolution.surfaceReleaseId}
                            >
                              {resolution.surfaceReleaseId}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </li>
                ))}
              </DevInventorySectionV3>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function DevInventorySectionV3({
  children,
  count,
  empty,
  icon,
  title,
}: Readonly<{
  children: React.ReactNode;
  count: number;
  empty: string;
  icon: React.ReactNode;
  title: string;
}>) {
  return (
    <section className="overflow-hidden rounded-2xl bg-wb-panel shadow-sm ring-1 ring-wb-line/70">
      <header className="flex min-h-13 items-center gap-2 border-b border-wb-line/70 px-4 sm:px-5">
        <span className="text-wb-accent">{icon}</span>
        <h2 className="text-sm font-semibold">{title}</h2>
        <span className="ml-auto text-xs tabular-nums text-wb-subtle">{count}</span>
      </header>
      {count === 0 ? (
        <p className="px-5 py-8 text-center text-xs text-wb-subtle">{empty}</p>
      ) : (
        <ul className="divide-y divide-wb-line/70">{children}</ul>
      )}
    </section>
  );
}

function DevInventoryLinkV3({
  href,
  meta,
  technicalId,
  title,
}: Readonly<{
  href: string;
  meta: readonly string[];
  technicalId?: string;
  title: string;
}>) {
  return (
    <li>
      <Link
        to={href}
        className="group flex min-h-16 items-center gap-3 px-4 py-3.5 transition-colors hover:bg-wb-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-wb-accent sm:px-5"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold tracking-tight">{title}</p>
          <p className="mt-1 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-wb-subtle">
            {meta.map((item, index) => (
              <React.Fragment key={`${item}-${index}`}>
                {index > 0 && <span aria-hidden="true">·</span>}
                <span>{item}</span>
              </React.Fragment>
            ))}
          </p>
          {technicalId !== undefined && (
            <p className="mt-1 truncate font-mono text-[9px] text-wb-subtle/70" title={technicalId}>
              {technicalId}
            </p>
          )}
        </div>
        <ArrowUpRight
          className="h-3.5 w-3.5 shrink-0 text-wb-subtle transition-colors group-hover:text-wb-accent"
          aria-hidden="true"
        />
      </Link>
    </li>
  );
}

async function loadDevDashboardV3(input: Readonly<{
  experimentIndex: BrowserExperimentIndex;
  remoteRepository: ReturnType<typeof createStudioSupabaseContentRepositoryV1>;
  store: BrowserContentStore;
  untitled: string;
}>): Promise<DevDashboardReadyV3> {
  let experiments: readonly DevExperimentItemV3[];
  let articles: readonly DevArticleItemV3[];
  let snapshots: readonly DevSnapshotItemV3[];
  if (input.remoteRepository === null) {
    const storedExperiments = input.store.listExperiments();
    const nowIso = new Date().toISOString();
    experiments = storedExperiments.map((experiment) => {
      const record = input.experimentIndex.ensure({
        experimentId: experiment.experimentId,
        title: experiment.content.scenarios[0]?.label ?? input.untitled,
        nowIso,
      });
      return Object.freeze({
        experimentId: experiment.experimentId,
        modelId: experiment.content.modelId,
        surfaceSeriesId: experiment.content.surfaceSeriesId,
        title: record.title,
        scenarioCount: experiment.content.scenarios.length,
        version: experiment.version,
        updatedAt: record.updatedAt,
        published: record.publishedSnapshotId !== null,
      });
    });
    articles = input.store.listArticles().map((article) => Object.freeze({
      articleId: article.articleId,
      title: article.title,
      visibility: article.visibility,
      locale: article.locale,
      updatedAt: null,
    }));
    snapshots = input.store.listSnapshots().map((snapshot) => Object.freeze({
      snapshotId: snapshot.snapshotId,
      modelId: snapshot.content.modelId,
      surfaceSeriesId: snapshot.content.surfaceSeriesId,
      surfaceReleaseId: snapshot.surfaceReleaseId,
      title: snapshot.content.scenarios[0]?.label ?? input.untitled,
      scenarioCount: snapshot.content.scenarios.length,
      paneCount: paneCountV3(snapshot.content.surface),
      createdAt: snapshot.createdAt,
    }));
  } else {
    const [experimentPage, articlePage, snapshotPage] = await Promise.all([
      input.remoteRepository.listMyExperiments({ limit: 100 }),
      input.remoteRepository.listMyArticles({ limit: 100 }),
      input.remoteRepository.listMySnapshots({ limit: 100 }),
    ]);
    experiments = experimentPage.items.map((item) => Object.freeze({
      experimentId: item.experimentId,
      modelId: item.modelId,
      surfaceSeriesId: item.surfaceSeriesId,
      title: item.title,
      scenarioCount: item.scenarioCount,
      version: item.version,
      updatedAt: item.updatedAt,
      published: item.publishedSnapshotId !== null,
    }));
    articles = articlePage.items.map((item) => Object.freeze({
      articleId: item.articleId,
      title: item.title,
      visibility: item.visibility,
      locale: item.locale,
      updatedAt: item.updatedAt,
    }));
    snapshots = snapshotPage.items.map((item) => Object.freeze({
      snapshotId: item.snapshotId,
      modelId: item.modelId,
      surfaceSeriesId: item.surfaceSeriesId,
      surfaceReleaseId: item.surfaceReleaseId,
      title: item.title,
      scenarioCount: item.scenarioCount,
      paneCount: item.paneCount,
      createdAt: item.createdAt,
    }));
  }

  experiments = sortByNewestV3(experiments, (item) => item.updatedAt);
  articles = sortByNewestV3(articles, (item) => item.updatedAt);
  snapshots = sortByNewestV3(snapshots, (item) => item.createdAt);
  const referencedModels = Object.freeze([
    ...experiments.map((item) => Object.freeze({
      modelId: item.modelId,
      surfaceSeriesId: item.surfaceSeriesId,
      surfaceReleaseId: null,
    })),
    ...snapshots.map((item) => Object.freeze({
      modelId: item.modelId,
      surfaceSeriesId: item.surfaceSeriesId,
      surfaceReleaseId: item.surfaceReleaseId,
    })),
  ]);
  const models = await loadDevModelsV3(referencedModels);
  return Object.freeze({
    kind: "ready",
    storage: input.remoteRepository === null ? "browser" : "supabase",
    experiments,
    articles,
    snapshots,
    models,
  });
}

async function loadDevModelsV3(
  referencedModels: readonly Readonly<{
    modelId: string;
    surfaceSeriesId: string;
    surfaceReleaseId: string | null;
  }>[],
): Promise<readonly DevModelItemV3[]> {
  const launchProbes: readonly Readonly<{
    source: Exclude<DevModelSourceV3, "referenced">;
    promise: Promise<StudioClientCompositionV2>;
  }>[] = Object.freeze([
    Object.freeze({
      source: "active",
      promise: loadStudioDefaultClientCompositionV2(),
    }),
    Object.freeze({
      source: "model-lab",
      promise: loadStudioLocalCurrentClientCompositionV1(),
    }),
  ]);
  const settledLaunches = await Promise.allSettled(
    launchProbes.map(({ promise }) => promise),
  );
  const candidates: DevModelCandidateV3[] = [];
  settledLaunches.forEach((result, index) => {
    if (result.status !== "fulfilled") return;
    const composition = result.value;
    candidates.push(modelCandidateV3(
      composition,
      launchProbes[index]!.source,
    ));
  });
  const distinctReferences = [...new Map(referencedModels.map((reference) => [
    `${reference.modelId}\u0000${reference.surfaceSeriesId ?? ""}\u0000${
      reference.surfaceReleaseId ?? ""
    }`,
    reference,
  ])).entries()];
  const referenced = await Promise.all(distinctReferences.map(async (
    [resolutionKey, reference],
  ) => {
    try {
      const composition = reference.surfaceReleaseId !== null
        ? await loadStudioSnapshotClientCompositionV2(
            reference.modelId,
            reference.surfaceSeriesId,
            reference.surfaceReleaseId,
          )
        : await loadStudioExperimentClientCompositionV2(
            reference.modelId,
            reference.surfaceSeriesId,
          );
      return modelCandidateV3(composition, "referenced", resolutionKey);
    } catch {
      return Object.freeze({
        modelId: reference.modelId,
        displayName: reference.modelId,
        stage: null,
        surfaceReleaseId: reference.surfaceReleaseId ?? null,
        source: "referenced" as const,
        resolutionKey,
        available: false,
      });
    }
  }));
  candidates.push(...referenced);
  return mergeDevModelCandidatesV3(candidates);
}

function modelCandidateV3(
  composition: StudioClientCompositionV2,
  source: DevModelSourceV3,
  resolutionKey?: string,
): DevModelCandidateV3 {
  return Object.freeze({
    modelId: composition.exactModel.modelId,
    displayName: composition.modelSurface.contract.displayName,
    stage: composition.exactModel.stage,
    surfaceReleaseId: composition.modelSurface.identity.surfaceReleaseId,
    source,
    ...(resolutionKey === undefined ? {} : { resolutionKey }),
    available: true,
  });
}

function paneCountV3(surface: Readonly<{
  graphPanes: readonly unknown[];
  outputPanes: readonly unknown[];
  controlPanes: readonly unknown[];
}>): number {
  return surface.graphPanes.length
    + surface.outputPanes.length
    + surface.controlPanes.length;
}

function sortByNewestV3<TItem>(
  items: readonly TItem[],
  timestamp: (item: TItem) => string | null,
): readonly TItem[] {
  return Object.freeze([...items].sort((left, right) => {
    const leftTimestamp = timestamp(left);
    const rightTimestamp = timestamp(right);
    if (leftTimestamp === null) return rightTimestamp === null ? 0 : 1;
    if (rightTimestamp === null) return -1;
    return rightTimestamp.localeCompare(leftTimestamp);
  }));
}

function formatDevDateV3(value: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function errorMessageV3(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export default DevDashboardPage;

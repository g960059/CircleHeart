import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { canonicalJsonStringify as canonical } from "@/engine/integrity";
import { LocalTrustedAuthoringRuntimeLoaderV1 } from "@/tools/authoring/LocalTrustedAuthoringRuntimeLoaderV1";
import { validateAuthoredSuccessorLiveContinuationV1 } from "./validateAuthoredSuccessorLiveContinuationV1";
import { authoredModelSuccessorSqlV1, authoredSuccessorSingleStatementV1 } from "./AuthoredModelSuccessorSqlV1";
import { admitAndSealStudioSnapshotCommitV1 } from "@/studio/application/authoring/StudioAdmittedSnapshotCommitV1";
import { validateExperimentContentV2, validateExperimentPlacementAgainstSnapshotV2 } from "@/studio/application/authoring/StudioExperimentDataV2";
import { validateStudioArticleDraftV2 } from "@/studio/application/authoring/StudioArticleDataV2";
import { STUDIO_EXPERIMENT_SNAPSHOT_V2_SCHEMA_ID, type ExperimentSnapshotV2 } from "@/studio/contracts/v2/content";
import { validateStudioModelWorkerReleaseTicketV2 } from "@/studio/contracts/v2/release";
import type { ModelSurfaceReleaseManifestV1 } from "@/studio/contracts/v2/modelSurface";
import bundle from "@/data/model-releases/standard74/bundle.json";
import lock from "@/data/model-releases/standard74/publication.json";

type Row = Record<string, any>;
export type AuthoredModelBackupV1 = Readonly<{
  activeBundle: Row; experiments: Row[]; experimentPublications: Row[];
  snapshots: Row[]; snapshotSources: Row[]; snapshotRetention: Row[];
  contents: Row[]; articles: Row[]; articlePublications: Row[];
  articleContents: Row[]; articleSnapshotRefs: Row[]; surfaces: Row[];
}>;
const digest = (value: unknown) => createHash("sha256").update(canonical(value)).digest("hex");
function requireCondition(value: unknown, reason: string): asserts value {
  if (!value) throw new Error(`Authored successor preparation rejected: ${reason}`);
}

/** Offline only. Each historical Snapshot keeps its own capture and Surface;
 * mutable heads and draft/public Article pointers are mapped independently.
 * No registry fetch, remote execution, settlement, or database writes occur. */
export async function prepareAuthoredModelSuccessorV1(input: Readonly<{
  backup: AuthoredModelBackupV1; fromModelId: string; toModelId: string;
  admit: (snapshot: ExperimentSnapshotV2, surface: ModelSurfaceReleaseManifestV1) => Promise<void>;
  id?: () => string; now?: string;
}>) {
  const { backup: b, fromModelId, toModelId } = input;
  const id = input.id ?? randomUUID, now = input.now ?? new Date().toISOString();
  requireCondition(fromModelId !== toModelId, "successor must have a new identity");
  requireCondition(b.activeBundle.model_id === fromModelId, "unexpected active predecessor");
  const contentIds = new Map<string, string>(), snapshotIds = new Map<string, string>(), articleContentIds = new Map<string, string>();
  const contents: Row[] = [], snapshots: Row[] = [], articleContents: Row[] = [], admissions: Row[] = [];
  const portableSnapshots = new Map<string, ExperimentSnapshotV2>();
  for (const old of b.contents) {
    requireCondition(!contentIds.has(old.content_id), "duplicate source content");
    requireCondition(old.model_id === fromModelId && old.content.modelId === fromModelId, "mixed-model content scope");
    requireCondition(old.content.surfaceSeriesId === old.surface_series_id, "content Surface series mismatch");
    const content = validateExperimentContentV2({ ...old.content, modelId: toModelId });
    requireCondition(canonical({ ...content, modelId: fromModelId }) === canonical(old.content), "authored capture or layout changed");
    const pinned = b.snapshots.filter(s => s.content_id === old.content_id).map(s => s.surface_release_id);
    const surfaces = pinned.length ? b.surfaces.filter(s => pinned.includes(s.surface_release_id))
      : b.surfaces.filter(s => s.surface_series_id === old.surface_series_id);
    requireCondition(surfaces.length > 0 && (!pinned.length || pinned.every(p => surfaces.some(s => s.surface_release_id === p))), "missing historical Surface");
    // A mutable head may follow a different Surface series from its Snapshot.
    const headSurfaces = b.experiments.some(e => e.current_content_id === old.content_id)
      ? b.surfaces.filter(s => s.surface_series_id === old.surface_series_id) : [];
    const uniqueSurfaces = new Map([...surfaces, ...headSurfaces].map(s => [s.surface_release_id, s]));
    requireCondition(!b.experiments.some(e => e.current_content_id === old.content_id) || headSurfaces.length === 1,
      "mutable Surface series must resolve unambiguously");
    for (const surface of uniqueSurfaces.values()) {
      const snapshot: ExperimentSnapshotV2 = { schemaId: STUDIO_EXPERIMENT_SNAPSHOT_V2_SCHEMA_ID,
        snapshotId: id(), surfaceReleaseId: surface.surface_release_id, createdAt: now, content };
      await input.admit(snapshot, surface.manifest);
      admissions.push({ sourceContentId: old.content_id, surfaceReleaseId: surface.surface_release_id,
        authoredStateSha256: digest(old.content), successorContentSha256: digest(content), status: "passed" });
    }
    const content_id = id(); contentIds.set(old.content_id, content_id);
    contents.push({ ...old, content_id, model_id: toModelId, content, created_at: now });
  }
  for (const old of b.snapshots) {
    const content_id = contentIds.get(old.content_id);
    requireCondition(content_id && !snapshotIds.has(old.snapshot_id), "missing or duplicate Snapshot content");
    const snapshot_id = id(); snapshotIds.set(old.snapshot_id, snapshot_id);
    snapshots.push({ ...old, snapshot_id, content_id, created_at: now });
    portableSnapshots.set(snapshot_id, { schemaId: STUDIO_EXPERIMENT_SNAPSHOT_V2_SCHEMA_ID,
      snapshotId: snapshot_id, surfaceReleaseId: old.surface_release_id, createdAt: now,
      content: contents.find(c => c.content_id === content_id)!.content });
  }
  for (const old of b.articleContents) {
    let changed = false;
    const blocks = old.blocks.map((block: Row) => {
      if (block.kind !== "experiment") return block;
      const snapshotId = snapshotIds.get(block.placement.snapshotId);
      if (!snapshotId) return block;
      changed = true;
      const placement = { ...block.placement, snapshotId };
      validateExperimentPlacementAgainstSnapshotV2(placement, portableSnapshots.get(snapshotId));
      return { ...block, placement };
    });
    if (!changed) continue;
    const article_content_id = id(); articleContentIds.set(old.article_content_id, article_content_id);
    validateStudioArticleDraftV2({ schemaId: "circleheart-studio-article-draft-v2", articleId: article_content_id,
      draftVersion: 0, visibility: "draft", locale: old.locale, title: old.title, tags: old.tags, blocks });
    articleContents.push({ ...old, article_content_id, blocks, created_at: now });
  }
  const required = (map: Map<string, string>, value: string) => {
    const result = map.get(value); requireCondition(result, `missing referenced content ${value}`); return result;
  };
  const experiments = b.experiments.map(e => {
    requireCondition(e.model_id === fromModelId, "unexpected Experiment model");
    return { ...e, model_id: toModelId, current_content_id: required(contentIds, e.current_content_id), version: e.version + 1, updated_at: now };
  });
  const experimentPublications = b.experimentPublications.map(p => ({ ...p,
    current_snapshot_id: required(snapshotIds, p.current_snapshot_id), updated_at: now }));
  const articles = b.articles.filter(a => articleContentIds.has(a.current_draft_content_id)).map(a => ({ ...a,
    current_draft_content_id: required(articleContentIds, a.current_draft_content_id), version: a.version + 1, updated_at: now }));
  const articlePublications = b.articlePublications.filter(p => articleContentIds.has(p.current_content_id)).map(p => ({ ...p,
    current_content_id: required(articleContentIds, p.current_content_id), updated_at: now }));
  const snapshotSources = b.snapshotSources.map(s => ({ ...s, snapshot_id: required(snapshotIds, s.snapshot_id) }));
  return { schemaId: "circleheart-authored-model-successor-plan-v1", fromModelId, toModelId, preparedAt: now,
    backupSha256: digest(b), before: b, after: { contents, snapshots, snapshotSources,
      articleContents, experiments, experimentPublications, articles, articlePublications },
    mapping: { contents: Object.fromEntries(contentIds), snapshots: Object.fromEntries(snapshotIds), articleContents: Object.fromEntries(articleContentIds) }, admissions };
}

async function main() {
  const args = process.argv.slice(2), option = (name: string) => args[args.indexOf(name) + 1];
  requireCondition(args.includes("--backup") && args.includes("--output") && args.includes("--from-model-id"),
    "--backup, --output, and --from-model-id are required");
  const backup = JSON.parse(readFileSync(resolve(option("--backup")), "utf8"));
  const artifactBytes = readFileSync(resolve("data/model-releases/standard74/artifact.mjs.txt"));
  requireCondition(createHash("sha256").update(artifactBytes).digest("hex") === lock.artifactSha256,
    "local reviewed artifact bytes differ from the admitted pin");
  const loader = new LocalTrustedAuthoringRuntimeLoaderV1();
  const runtimes = new Map<string, Awaited<ReturnType<typeof loader.load>>>();
  const plan = await prepareAuthoredModelSuccessorV1({ backup, fromModelId: option("--from-model-id"), toModelId: lock.modelId,
    async admit(snapshot, surface) {
      let runtime = runtimes.get(surface.surfaceReleaseId);
      if (!runtime) {
        runtime = await loader.load(validateStudioModelWorkerReleaseTicketV2({
          schemaId: "circleheart-studio-model-worker-release-ticket-v2", modelId: lock.modelId,
          artifactRevisionId: lock.artifactRevisionId, manifest: bundle.manifest, surfaceRelease: surface,
          moduleAbi: "circleheart-exact-model-esm-v1", artifactUrl: "http://127.0.0.1/local-reviewed-artifact.mjs",
        }));
        runtimes.set(surface.surfaceReleaseId, runtime);
      }
      await admitAndSealStudioSnapshotCommitV1({ snapshot, runtime });
      await validateAuthoredSuccessorLiveContinuationV1(snapshot, runtime);
      console.log(JSON.stringify({ event: "capture-admission-passed", surfaceReleaseId: surface.surfaceReleaseId, scenarios: snapshot.content.scenarios.length }));
    },
  });
  const output = resolve(option("--output")); mkdirSync(output, { mode: 0o700 });
  writeFileSync(`${output}/plan.json`, JSON.stringify(plan, null, 2) + "\n", { mode: 0o600, flag: "wx" });
  const sqlFiles = Object.fromEntries(Object.entries(authoredModelSuccessorSqlV1(plan, lock.artifactRevisionId))
    .map(([name, transaction]) => [name, authoredSuccessorSingleStatementV1(transaction)]));
  const receipt = { modelId: lock.modelId, artifactRevisionId: lock.artifactRevisionId, artifactSha256: lock.artifactSha256, backupSha256: plan.backupSha256,
    planSha256: digest(plan), counts: Object.fromEntries(Object.entries(plan.after).map(([k, v]) => [k, v.length])),
    scenarioCaptures: plan.after.contents.reduce((sum, row) => sum + row.content.scenarios.length, 0),
    sqlSha256: Object.fromEntries(Object.entries(sqlFiles).map(([name, sql]) => [name, createHash("sha256").update(sql).digest("hex")])),
    admissions: plan.admissions.length, commonSnapshotGateAndLiveContinuationPassed: true,
    preservedAuthoredCapturesAndLayouts: true, remoteWrites: false };
  writeFileSync(`${output}/receipt.json`, JSON.stringify(receipt, null, 2) + "\n", { mode: 0o600, flag: "wx" });
  for (const [name, sql] of Object.entries(sqlFiles)) {
    writeFileSync(`${output}/${name}.sql`, sql, { mode: 0o600, flag: "wx" });
  }
  console.log(JSON.stringify(receipt));
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try { await main(); }
  catch (error) { console.error(error instanceof Error ? `${error.name}: ${error.message}` : String(error)); process.exitCode = 1; }
}

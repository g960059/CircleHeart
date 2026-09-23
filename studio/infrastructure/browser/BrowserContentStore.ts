import {
  validateStudioArticleDraftV2,
} from "@/studio/application/authoring/StudioArticleDataV2";
import {
  validateExperimentPlacementAgainstSnapshotV2,
  validateExperimentContentV2,
  validateExperimentSnapshotV2,
  validateExperimentV2,
} from "@/studio/application/authoring/StudioExperimentDataV2";
import type { StudioArticleDraftV2 } from "@/studio/contracts/v2/article";
import type {
  ExperimentSnapshotV2,
  ExperimentV2,
} from "@/studio/contracts/v2/content";
import {
  requireOpaqueExperimentIdV3,
} from "@/studio/infrastructure/browser/StudioExperimentIdentityV3";
import {
  studioCanonicalJsonStringify,
} from "@/domain/json/CanonicalJson";
import {
  assertStudioSimulationWorkerAdmittedSnapshotCommitV2,
  type StudioSimulationWorkerAdmittedSnapshotCommitV2,
} from "@/studio/workers/StudioSimulationWorkerClientV2";

/**
 * Current pre-release envelope. There is deliberately no compatibility
 * reader; retired keys are inert and left to browser storage maintenance.
 * Any change to a stored content contract (v10: required Article tags)
 * moves to a new key, so an older envelope can never fail the current one.
 */
export const BROWSER_CONTENT_STORE_KEY =
  "circleheart.studio.browser-content.v10";
export const BROWSER_CONTENT_STORE_SCHEMA_ID =
  "circleheart-studio-browser-content-v10" as const;

export type BrowserStoragePort = Pick<
  Storage,
  "getItem" | "setItem"
>;

type BrowserContentEnvelope = Readonly<{
  schemaId: typeof BROWSER_CONTENT_STORE_SCHEMA_ID;
  experiments: readonly ExperimentV2[];
  snapshots: readonly ExperimentSnapshotV2[];
  articles: readonly StudioArticleDraftV2[];
}>;

type StoredBrowserContentEnvelope = Readonly<{
  schemaId: typeof BROWSER_CONTENT_STORE_SCHEMA_ID;
  experiments: readonly unknown[];
  snapshots: readonly unknown[];
  articles: readonly unknown[];
}>;

export type BrowserPublicationSnapshotSource = Readonly<{
  experimentId: string;
  expectedVersion: number;
}>;

export class BrowserContentStore {
  readonly #storage: BrowserStoragePort;

  constructor(storage: BrowserStoragePort = window.localStorage) {
    this.#storage = storage;
  }

  listExperiments(): readonly ExperimentV2[] {
    return this.#read().experiments;
  }

  listSnapshots(): readonly ExperimentSnapshotV2[] {
    return this.#read().snapshots;
  }

  listArticles(): readonly StudioArticleDraftV2[] {
    return this.#read().articles;
  }

  readExperiment(experimentId: string): ExperimentV2 | null {
    requireOpaqueExperimentIdV3(experimentId);
    return this.#read().experiments.find((experiment) =>
      experiment.experimentId === experimentId) ?? null;
  }

  readSnapshot(snapshotId: string): ExperimentSnapshotV2 | null {
    const stored = selectStoredRecordV3(this.#readStored().snapshots, "snapshotId", snapshotId);
    return stored === null ? null : validateExperimentSnapshotV2(stored);
  }

  readArticle(articleId: string): StudioArticleDraftV2 | null {
    // Prose has an independent read boundary, just as in the remote repository.
    // Snapshot validation belongs to the lazy embed, never the article shell.
    const stored = selectStoredRecordV3(this.#readStored().articles, "articleId", articleId);
    return stored === null ? null : validateStudioArticleDraftV2(stored);
  }

  /**
   * Deletes only the explicitly saved Article root. Snapshots remain neutral
   * and independently valid, matching the remote repository boundary.
   */
  deleteArticle(articleId: string): boolean {
    const current = this.#read();
    if (!current.articles.some((article) =>
      article.articleId === articleId)) return false;
    this.#write({
      ...current,
      articles: Object.freeze(current.articles.filter((article) =>
        article.articleId !== articleId)),
    });
    return true;
  }

  /**
   * Deletes only the explicitly saved mutable Experiment. Immutable
   * Snapshots remain valid independently.
   */
  deleteExperiment(experimentId: string): boolean {
    requireOpaqueExperimentIdV3(experimentId);
    const current = this.#read();
    if (!current.experiments.some((experiment) =>
      experiment.experimentId === experimentId)) return false;
    this.#write({
      ...current,
      experiments: Object.freeze(current.experiments.filter((experiment) =>
        experiment.experimentId !== experimentId)),
    });
    return true;
  }

  saveExperiment(
    experimentValue: unknown,
    candidateContentValue: unknown,
  ): ExperimentV2 {
    const experiment = validateExperimentV2(experimentValue);
    const candidateContent = validateExperimentContentV2(
      candidateContentValue,
    );
    assertContentPreservesCandidateAuthoredContentV3(
      candidateContent,
      experiment.content,
      "Saved Experiment",
    );
    requireOpaqueExperimentIdV3(experiment.experimentId);
    const current = this.#read();
    const stored = current.experiments.find(({ experimentId }) =>
      experimentId === experiment.experimentId);
    if (stored === undefined) {
      assertInitialExperimentV3(experiment);
    } else {
      assertExperimentAdvanceV3(stored, experiment);
    }
    this.#write({
      ...current,
      experiments: replaceByIdV3(
        current.experiments,
        experiment,
        ({ experimentId }) => experimentId,
      ),
    });
    return experiment;
  }

  /**
   * Persists one independently admitted immutable Snapshot. Snapshot
   * creation never mutates or implicitly creates an Experiment.
   */
  saveSnapshotCommit(
    input: StudioSimulationWorkerAdmittedSnapshotCommitV2,
    candidateContentValue: unknown,
    publicationSource?: BrowserPublicationSnapshotSource,
  ): Readonly<{ snapshot: ExperimentSnapshotV2 }> {
    assertStudioSimulationWorkerAdmittedSnapshotCommitV2(input);
    const candidateContent = validateExperimentContentV2(
      candidateContentValue,
    );
    const snapshot = validateExperimentSnapshotV2(input.snapshot);
    assertContentPreservesCandidateAuthoredContentV3(
      candidateContent,
      snapshot.content,
      "Admitted Snapshot",
    );
    if (
      studioCanonicalJsonStringify(candidateContent)
      !== studioCanonicalJsonStringify(snapshot.content)
    ) {
      throw new Error(
        "Admitted Snapshot must preserve the exact captured candidate",
      );
    }
    const current = this.#read();
    if (publicationSource !== undefined) {
      assertPublicationSourceV3(
        publicationSource,
        candidateContent,
        current.experiments,
      );
    }
    assertNewSnapshotV3(snapshot, current.snapshots);
    this.#write({
      ...current,
      snapshots: Object.freeze([...current.snapshots, snapshot]),
    });
    return Object.freeze({ snapshot });
  }

  saveArticle(articleValue: unknown): StudioArticleDraftV2 {
    const article = validateStudioArticleDraftV2(articleValue);
    const current = this.#read();
    assertArticlePlacementsV3(article, current.snapshots);
    const stored = current.articles.find(({ articleId }) =>
      articleId === article.articleId);
    assertArticleDraftAdvanceV3(stored, article);
    this.#write({
      ...current,
      articles: replaceByIdV3(
        current.articles,
        article,
        ({ articleId }) => articleId,
      ),
    });
    return article;
  }

  #read(): BrowserContentEnvelope {
    const record = this.#readStored();
    const envelope: BrowserContentEnvelope = Object.freeze({
      schemaId: BROWSER_CONTENT_STORE_SCHEMA_ID,
      experiments: Object.freeze(record.experiments.map(validateExperimentV2)),
      snapshots: Object.freeze(record.snapshots.map(validateExperimentSnapshotV2)),
      articles: Object.freeze(record.articles.map(validateStudioArticleDraftV2)),
    });
    assertEnvelopeV3(envelope);
    return envelope;
  }

  #readStored(): StoredBrowserContentEnvelope {
    const raw = this.#storage.getItem(BROWSER_CONTENT_STORE_KEY);
    if (raw === null) return emptyEnvelopeV3();
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      throw new Error(
        `Stored Studio browser content is not JSON: ${errorMessageV3(error)}`,
      );
    }
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Stored Studio browser content must be an object");
    }
    const record = parsed as Record<string, unknown>;
    const keys = Object.keys(record).sort();
    const expected = ["articles", "experiments", "schemaId", "snapshots"];
    if (
      keys.length !== expected.length
      || keys.some((key, index) => key !== expected[index])
      || record.schemaId !== BROWSER_CONTENT_STORE_SCHEMA_ID
      || !Array.isArray(record.experiments)
      || !Array.isArray(record.snapshots)
      || !Array.isArray(record.articles)
    ) {
      throw new Error("Stored Studio browser content schema is invalid");
    }
    return {
      schemaId: BROWSER_CONTENT_STORE_SCHEMA_ID,
      experiments: record.experiments,
      snapshots: record.snapshots,
      articles: record.articles,
    };
  }

  #write(input: BrowserContentEnvelope): void {
    const envelope: BrowserContentEnvelope = Object.freeze({
      schemaId: BROWSER_CONTENT_STORE_SCHEMA_ID,
      experiments: Object.freeze(input.experiments.map(validateExperimentV2)),
      snapshots: Object.freeze(input.snapshots.map(validateExperimentSnapshotV2)),
      articles: Object.freeze(input.articles.map(validateStudioArticleDraftV2)),
    });
    assertEnvelopeV3(envelope);
    this.#storage.setItem(
      BROWSER_CONTENT_STORE_KEY,
      studioCanonicalJsonStringify(envelope),
    );
  }
}

function selectStoredRecordV3(records: readonly unknown[], key: string, id: string): unknown | null {
  const matches = records.filter(record => record !== null && typeof record === "object"
    && !Array.isArray(record) && (record as Record<string, unknown>)[key] === id);
  if (matches.length > 1) throw new Error(`Stored Studio browser content has duplicate ${key}: ${id}`);
  return matches[0] ?? null;
}

function assertContentPreservesCandidateAuthoredContentV3(
  candidate: ReturnType<typeof validateExperimentContentV2>,
  persisted: ReturnType<typeof validateExperimentContentV2>,
  subject: string,
): void {
  if (
    candidate.modelId !== persisted.modelId
    || studioCanonicalJsonStringify(candidate.surface)
      !== studioCanonicalJsonStringify(persisted.surface)
    || candidate.scenarios.length !== persisted.scenarios.length
  ) {
    throw new Error(
      `${subject} changed the candidate model, Surface, or Scenario count`,
    );
  }
  candidate.scenarios.forEach((scenario, index) => {
    const captured = persisted.scenarios[index];
    if (
      captured === undefined
      || scenario.scenarioId !== captured.scenarioId
      || scenario.label !== captured.label
      || studioCanonicalJsonStringify(scenario.capture.fixture)
        !== studioCanonicalJsonStringify(captured.capture.fixture)
    ) {
      throw new Error(
        `${subject} changed authored Scenario ${scenario.scenarioId}`,
      );
    }
  });
}

function assertPublicationSourceV3(
  source: BrowserPublicationSnapshotSource | undefined,
  candidate: ReturnType<typeof validateExperimentContentV2>,
  experiments: readonly ExperimentV2[],
): void {
  if (source === undefined) {
    throw new Error(
      "Publishing requires a saved Experiment source",
    );
  }
  requireOpaqueExperimentIdV3(
    source.experimentId,
    "Publication source experimentId",
  );
  if (!Number.isSafeInteger(source.expectedVersion) || source.expectedVersion < 0) {
    throw new Error("Publication source expectedVersion must be non-negative");
  }
  const experiment = experiments.find(({ experimentId }) =>
    experimentId === source.experimentId);
  if (experiment === undefined) {
    throw new Error("Publication source Experiment is not saved");
  }
  if (experiment.version !== source.expectedVersion) {
    throw new Error(
      `Publication source expected version ${source.expectedVersion}, `
        + `found ${experiment.version}`,
    );
  }
  assertContentPreservesCandidateAuthoredContentV3(
    experiment.content,
    candidate,
    "Publication candidate",
  );
}

function assertEnvelopeV3(envelope: BrowserContentEnvelope): void {
  assertUniqueV3(
    envelope.experiments.map(({ experimentId }) => experimentId),
    "Experiment",
  );
  assertUniqueV3(
    envelope.snapshots.map(({ snapshotId }) => snapshotId),
    "Snapshot",
  );
  assertUniqueV3(
    envelope.articles.map(({ articleId }) => articleId),
    "Article",
  );
  envelope.experiments.forEach((experiment) => {
    requireOpaqueExperimentIdV3(
      experiment.experimentId,
      "Browser Experiment experimentId",
    );
  });
  envelope.articles.forEach((article) =>
    assertArticlePlacementsV3(article, envelope.snapshots));
}

function assertInitialExperimentV3(experiment: ExperimentV2): void {
  if (experiment.version !== 0) {
    throw new Error(
      "Browser content store initial Experiment must start at version 0",
    );
  }
}

function assertExperimentAdvanceV3(
  current: ExperimentV2,
  next: ExperimentV2,
): void {
  if (next.version !== current.version + 1) {
    throw new Error(
      "Browser content store Experiment version must advance by exactly one",
    );
  }
  if (next.content.modelId !== current.content.modelId) {
    throw new Error("Browser content store Experiment cannot change modelId");
  }
}

function assertNewSnapshotV3(
  snapshot: ExperimentSnapshotV2,
  snapshots: readonly ExperimentSnapshotV2[],
): void {
  if (snapshots.some(({ snapshotId }) => snapshotId === snapshot.snapshotId)) {
    throw new Error(
      `Browser content store immutable snapshotId already exists: ${snapshot.snapshotId}`,
    );
  }
}

function assertArticlePlacementsV3(
  article: StudioArticleDraftV2,
  snapshots: readonly ExperimentSnapshotV2[],
): void {
  const byId = new Map(snapshots.map((snapshot) =>
    [snapshot.snapshotId, snapshot] as const));
  article.blocks.forEach((block) => {
    if (block.kind !== "experiment") return;
    const snapshot = byId.get(block.placement.snapshotId);
    if (snapshot === undefined) {
      throw new Error(
        `Browser content store Article placement Snapshot not found: ${block.placement.snapshotId}`,
      );
    }
    validateExperimentPlacementAgainstSnapshotV2(block.placement, snapshot);
  });
}

function assertArticleDraftAdvanceV3(
  current: StudioArticleDraftV2 | undefined,
  next: StudioArticleDraftV2,
): void {
  if (current === undefined) {
    if (next.draftVersion !== 0) {
      throw new Error(
        "Browser content store initial Article must start at draftVersion 0",
      );
    }
    return;
  }
  if (next.draftVersion !== current.draftVersion + 1) {
    throw new Error(
      "Browser content store Article draftVersion must advance by exactly one",
    );
  }
}

function emptyEnvelopeV3(): BrowserContentEnvelope {
  return Object.freeze({
    schemaId: BROWSER_CONTENT_STORE_SCHEMA_ID,
    experiments: Object.freeze([]),
    snapshots: Object.freeze([]),
    articles: Object.freeze([]),
  });
}

function replaceByIdV3<TValue>(
  values: readonly TValue[],
  next: TValue,
  id: (value: TValue) => string,
): readonly TValue[] {
  const nextId = id(next);
  const found = values.some((value) => id(value) === nextId);
  return Object.freeze(found
    ? values.map((value) => id(value) === nextId ? next : value)
    : [...values, next]);
}

function assertUniqueV3(ids: readonly string[], kind: string): void {
  if (new Set(ids).size !== ids.length) {
    throw new Error(`Stored Studio browser content has duplicate ${kind} identity`);
  }
}

function errorMessageV3(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

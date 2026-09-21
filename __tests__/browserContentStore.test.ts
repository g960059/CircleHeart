import { describe, expect, it } from "vitest";

import {
  STUDIO_ARTICLE_DRAFT_V2_SCHEMA_ID,
  type StudioArticleDraftV2,
} from "@/studio/contracts/v2/article";
import {
  STUDIO_EXPERIMENT_PLACEMENT_V2_SCHEMA_ID,
  STUDIO_EXPERIMENT_SNAPSHOT_V2_SCHEMA_ID,
  STUDIO_EXPERIMENT_V2_SCHEMA_ID,
  type ExperimentPlacementBriefingV2,
  type ExperimentSnapshotV2,
  type ExperimentV2,
} from "@/studio/contracts/v2/content";
import {
  BROWSER_CONTENT_STORE_KEY,
  BROWSER_CONTENT_STORE_SCHEMA_ID,
  BrowserContentStore,
} from "@/studio/infrastructure/browser/BrowserContentStore";
import type { StudioSimulationFrameV2 } from "@/studio/contracts/v2/simulation";
import {
  createStudioSimulationWorkerClientForTestV2,
  type StudioSimulationWorkerAdmittedSnapshotCommitV2,
  type StudioSimulationWorkerTransportV2,
} from "@/studio/workers/StudioSimulationWorkerClientV2";
import {
  STUDIO_SIMULATION_WORKER_PROTOCOL_V2,
} from "@/studio/workers/StudioSimulationWorkerProtocolV2";
import {
  STANDARD_TEST_RELEASE_TICKET_V1,
  STANDARD_TEST_SURFACE_RELEASE_ID_V1,
  STANDARD_TEST_SURFACE_SERIES_ID_V1,
} from "./helpers/standardReleaseTicketV1";

class MemoryStorageV3 {
  readonly values = new Map<string, string>();
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  removeItem(key: string): void { this.values.delete(key); }
  setItem(key: string, value: string): void { this.values.set(key, value); }
}

class QualifyingWorkerTransportV3 implements StudioSimulationWorkerTransportV2 {
  readonly #messageListeners = new Set<(event: MessageEvent<unknown>) => void>();
  readonly #errorListeners = new Set<(event: ErrorEvent) => void>();
  postMessage(): void {}
  terminate(): void {}
  addEventListener(type: "message", listener: (event: MessageEvent<unknown>) => void): void;
  addEventListener(type: "error", listener: (event: ErrorEvent) => void): void;
  addEventListener(
    type: "message" | "error",
    listener: ((event: MessageEvent<unknown>) => void) | ((event: ErrorEvent) => void),
  ): void {
    if (type === "message") {
      this.#messageListeners.add(listener as (event: MessageEvent<unknown>) => void);
    } else {
      this.#errorListeners.add(listener as (event: ErrorEvent) => void);
    }
  }
  removeEventListener(type: "message", listener: (event: MessageEvent<unknown>) => void): void;
  removeEventListener(type: "error", listener: (event: ErrorEvent) => void): void;
  removeEventListener(
    type: "message" | "error",
    listener: ((event: MessageEvent<unknown>) => void) | ((event: ErrorEvent) => void),
  ): void {
    if (type === "message") {
      this.#messageListeners.delete(listener as (event: MessageEvent<unknown>) => void);
    } else {
      this.#errorListeners.delete(listener as (event: ErrorEvent) => void);
    }
  }
  emit(data: unknown): void {
    this.#messageListeners.forEach((listener) => listener({ data } as MessageEvent<unknown>));
  }
}

function experimentV3(input: Readonly<{
  experimentId?: string;
  version?: number;
  modelId?: string;
}> = {}): ExperimentV2 {
  return {
    schemaId: STUDIO_EXPERIMENT_V2_SCHEMA_ID,
    experimentId: input.experimentId ?? "experiment-browser-store-a1b2c3d4",
    version: input.version ?? 0,
    content: {
      modelId: input.modelId ?? "model/exact-v3",
      surfaceSeriesId: STANDARD_TEST_SURFACE_SERIES_ID_V1,
      scenarios: [{
        scenarioId: "scenario/baseline",
        label: "Baseline",
        capture: {
          fixture: { control: 1 },
          checkpoint: {
            acceptedRevision: 4,
            acceptedTimeSec: 0.008,
            payload: { state: [1, 2, 3] },
          },
        },
      }],
      surface: {
        graphPanes: [{
          paneId: "pane/waveform",
          role: "graph",
          label: "Waveform",
          order: 0,
          priority: 10,
          graphId: "graph/waveform",
          scenarioScope: { mode: "visible-scenarios" },
          excludedTraces: [],
          windowSec: 2,
          series: [],
        }],
        outputPanes: [],
        controlPanes: [],
        note: { text: "" },
      },
    },
  };
}

function briefingV3(): ExperimentPlacementBriefingV2 {
  return {
    defaultTitle: "Stored experiment",
    scenarioScope: {
      visibleScenarioIds: ["scenario/baseline"],
      initialFocusScenarioId: "scenario/baseline",
    },
    graphs: [{
      paneId: "pane/waveform",
      order: 0,
      emphasis: "primary",
    }],
    outputs: [],
    controls: [],
  };
}

function snapshotV3(
  experiment: ExperimentV2,
  input: Readonly<{
    snapshotId?: string;
  }> = {},
): ExperimentSnapshotV2 {
  return {
    schemaId: STUDIO_EXPERIMENT_SNAPSHOT_V2_SCHEMA_ID,
    snapshotId: input.snapshotId ?? "snapshot/browser-store-1",
    surfaceReleaseId: STANDARD_TEST_SURFACE_RELEASE_ID_V1,
    content: experiment.content,
    createdAt: "2026-08-01T00:00:00.000Z",
  };
}

async function admittedCommitV3(
  experiment: ExperimentV2,
  input: Readonly<{
    snapshotId?: string;
    source?: "session" | "saved-experiment";
  }> = {},
): Promise<StudioSimulationWorkerAdmittedSnapshotCommitV2> {
  const transport = new QualifyingWorkerTransportV3();
  const client = createStudioSimulationWorkerClientForTestV2({ transport });
  const scenario = experiment.content.scenarios[0]!;
  const initialized = client.initialize({
    expectedModelId: experiment.content.modelId,
    releaseTicket: STANDARD_TEST_RELEASE_TICKET_V1,
    runtimeSessionId: "runtime/browser-store-test",
    scenarioId: scenario.scenarioId,
    scenarioLabel: scenario.label,
    fixture: scenario.capture.fixture,
    checkpoint: scenario.capture.checkpoint,
  });
  const frame: StudioSimulationFrameV2 = {
    modelId: experiment.content.modelId,
    runtimeSessionId: "runtime/browser-store-test",
    scenarioId: scenario.scenarioId,
    inputEpoch: 0,
    acceptedRevision: scenario.capture.checkpoint.acceptedRevision,
    acceptedTimeSec: scenario.capture.checkpoint.acceptedTimeSec,
    outputs: {},
  };
  transport.emit({
    protocol: STUDIO_SIMULATION_WORKER_PROTOCOL_V2,
    requestId: 1,
    status: "ok",
    kind: "initialized",
    frame,
  });
  await initialized;

  const pending = client.createSnapshot({
    runtimeSessionId: frame.runtimeSessionId,
    scenarioId: frame.scenarioId,
    surfaceSeriesId: experiment.content.surfaceSeriesId,
    surfaceReleaseId: STANDARD_TEST_SURFACE_RELEASE_ID_V1,
    surface: experiment.content.surface,
    snapshotSource: input.source ?? "session",
  });
  transport.emit({
    protocol: STUDIO_SIMULATION_WORKER_PROTOCOL_V2,
    requestId: 2,
    status: "ok",
    kind: "snapshot-created",
    snapshot: snapshotV3(experiment, {
      snapshotId: input.snapshotId,
    }),
  });
  return pending;
}

function articleV3(
  snapshot: ExperimentSnapshotV2,
  input: Readonly<{ version?: number; placementId?: string }> = {},
): StudioArticleDraftV2 {
  return {
    schemaId: STUDIO_ARTICLE_DRAFT_V2_SCHEMA_ID,
    articleId: "article/browser-store",
    draftVersion: input.version ?? 0,
    visibility: "draft",
    locale: "ja",
    title: "Article",
    blocks: [{
      blockId: "block/experiment",
      kind: "experiment",
      placement: {
        schemaId: STUDIO_EXPERIMENT_PLACEMENT_V2_SCHEMA_ID,
        placementId: input.placementId ?? "placement/browser-store",
        snapshotId: snapshot.snapshotId,
        briefing: briefingV3(),
        titleOverride: null,
        caption: null,
      },
    }],
  };
}

describe("browser content store", () => {
  it("creates only explicitly saved Experiments and advances version by one", () => {
    const store = new BrowserContentStore(new MemoryStorageV3());
    expect(store.listExperiments()).toEqual([]);

    const initial = experimentV3();
    const first = store.saveExperiment(initial, initial.content);
    const replacement = {
      ...first,
      version: 1,
      content: {
        ...first.content,
        surface: { ...first.content.surface, note: { text: "saved" } },
      },
    };
    const second = store.saveExperiment(replacement, replacement.content);

    expect(second.version).toBe(1);
    expect(store.readExperiment(first.experimentId)?.content.surface.note.text)
      .toBe("saved");
    expect(Object.isFrozen(second)).toBe(true);
  });

  it("rechecks a Worker Save against the submitted authored candidate", () => {
    const store = new BrowserContentStore(new MemoryStorageV3());
    const candidate = experimentV3();
    const changedByWorker = {
      ...candidate,
      content: {
        ...candidate.content,
        scenarios: candidate.content.scenarios.map((scenario) => ({
          ...scenario,
          label: `${scenario.label} changed by worker`,
        })),
      },
    } satisfies ExperimentV2;

    expect(() => store.saveExperiment(
      changedByWorker,
      candidate.content,
    )).toThrow(/Saved Experiment changed authored Scenario/);
    expect(store.listExperiments()).toEqual([]);
  });

  it("rejects generic IDs, skipped initial versions, stale writes, and model swaps", () => {
    const store = new BrowserContentStore(new MemoryStorageV3());
    const generic = experimentV3({ experimentId: "experiment/generic" });
    expect(() => store.saveExperiment(generic, generic.content))
      .toThrow(/opaque Experiment identity/);
    const skipped = experimentV3({ version: 1 });
    expect(() => store.saveExperiment(skipped, skipped.content))
      .toThrow(/start at version 0/);

    const initial = experimentV3();
    const current = store.saveExperiment(initial, initial.content);
    const skippedAdvance = { ...current, version: 2 };
    expect(() => store.saveExperiment(skippedAdvance, skippedAdvance.content))
      .toThrow(/advance by exactly one/);
    const modelSwap = {
      ...current,
      version: 1,
      content: { ...current.content, modelId: "model/other" },
    };
    expect(() => store.saveExperiment(modelSwap, modelSwap.content))
      .toThrow(/cannot change modelId/);
  });

  it("persists an admitted neutral Snapshot without creating an Experiment", async () => {
    const store = new BrowserContentStore(new MemoryStorageV3());
    const sessionContent = experimentV3();
    const commit = await admittedCommitV3(sessionContent);

    const saved = store.saveSnapshotCommit(commit, sessionContent.content);

    expect(Object.keys(saved.snapshot)).toEqual([
      "schemaId",
      "snapshotId",
      "surfaceReleaseId",
      "content",
      "createdAt",
    ]);
    expect(store.listExperiments()).toEqual([]);
    expect(store.listSnapshots()).toHaveLength(1);
  });

  it("validates a version-matched saved Experiment when a source is supplied", async () => {
    const store = new BrowserContentStore(new MemoryStorageV3());
    const sessionContent = experimentV3();
    const commit = await admittedCommitV3(sessionContent, {
      source: "saved-experiment",
    });
    const savedExperiment = store.saveExperiment(
      sessionContent,
      sessionContent.content,
    );
    expect(() => store.saveSnapshotCommit(
      commit,
      sessionContent.content,
      {
        experimentId: savedExperiment.experimentId,
        expectedVersion: savedExperiment.version + 1,
      },
    )).toThrow(/expected version/);
    expect(store.saveSnapshotCommit(
      commit,
      sessionContent.content,
      {
        experimentId: savedExperiment.experimentId,
        expectedVersion: savedExperiment.version,
      },
    ).snapshot.snapshotId).toBe("snapshot/browser-store-1");
  });

  it("rechecks worker-qualified labels and fixtures against the frozen candidate", async () => {
    const store = new BrowserContentStore(new MemoryStorageV3());
    const candidate = experimentV3();
    const changed = {
      ...candidate,
      content: {
        ...candidate.content,
        scenarios: candidate.content.scenarios.map((scenario) => ({
          ...scenario,
          label: `${scenario.label} changed by worker`,
        })),
      },
    } satisfies ExperimentV2;
    const commit = await admittedCommitV3(changed);

    expect(() => store.saveSnapshotCommit(commit, candidate.content))
      .toThrow(/changed authored Scenario/);
    expect(store.listSnapshots()).toEqual([]);
  });

  it("never overwrites an immutable snapshotId", async () => {
    const store = new BrowserContentStore(new MemoryStorageV3());
    const candidate = experimentV3();
    const experiment = store.saveExperiment(candidate, candidate.content);
    const source = {
      experimentId: experiment.experimentId,
      expectedVersion: experiment.version,
    };
    store.saveSnapshotCommit(
      await admittedCommitV3(experiment),
      experiment.content,
      source,
    );
    await expect(async () => store.saveSnapshotCommit(
      await admittedCommitV3(experiment),
      experiment.content,
      source,
    )).rejects.toThrow(/already exists/);
  });

  it("stores Briefing only in Placement while reusing a neutral Snapshot", async () => {
    const store = new BrowserContentStore(new MemoryStorageV3());
    const experiment = experimentV3();
    const saved = store.saveSnapshotCommit(await admittedCommitV3(
      experiment,
      { snapshotId: "snapshot/article-1" },
    ), experiment.content).snapshot;

    store.saveArticle(articleV3(saved));

    expect(store.readArticle("article/browser-store")?.blocks[0]).toEqual({
      blockId: "block/experiment",
      kind: "experiment",
      placement: {
        schemaId: STUDIO_EXPERIMENT_PLACEMENT_V2_SCHEMA_ID,
        placementId: "placement/browser-store",
        snapshotId: "snapshot/article-1",
        briefing: briefingV3(),
        titleOverride: null,
        caption: null,
      },
    });
    expect(saved).not.toHaveProperty("briefing");
  });

  it("rejects an Article Placement whose Briefing cannot resolve in its Snapshot", async () => {
    const store = new BrowserContentStore(new MemoryStorageV3());
    const candidate = experimentV3();
    const experiment = store.saveExperiment(candidate, candidate.content);
    const publication = store.saveSnapshotCommit(
      await admittedCommitV3(experiment),
      experiment.content,
      {
        experimentId: experiment.experimentId,
        expectedVersion: experiment.version,
      },
    ).snapshot;
    const forgedArticle = articleV3(publication);

    expect(() => store.saveArticle({
      ...forgedArticle,
      blocks: forgedArticle.blocks.map((block) => block.kind === "experiment"
        ? {
            ...block,
            placement: {
              ...block.placement,
              briefing: {
                ...block.placement.briefing,
                graphs: [{
                  paneId: "pane/missing",
                  order: 0,
                  emphasis: "primary",
                }],
              },
            },
          }
        : block),
    })).toThrow(/unknown graph pane pane\/missing/);
  });

  it("enforces Article compare-and-swap and rejects dangling Snapshot references", async () => {
    const store = new BrowserContentStore(new MemoryStorageV3());
    const experiment = experimentV3();
    const saved = store.saveSnapshotCommit(await admittedCommitV3(
      experiment,
      { snapshotId: "snapshot/article-2" },
    ), experiment.content).snapshot;
    store.saveArticle(articleV3(saved));
    expect(() => store.saveArticle(articleV3(saved)))
      .toThrow(/advance by exactly one/);
    expect(() => store.saveArticle({
      ...articleV3(saved, { version: 1 }),
      blocks: [{
        ...articleV3(saved).blocks[0]!,
        placement: {
          ...(articleV3(saved).blocks[0]! as Extract<StudioArticleDraftV2["blocks"][number], { kind: "experiment" }>).placement,
          snapshotId: "snapshot/missing",
        },
      }],
    })).toThrow(/Snapshot not found/);
  });

  it("deletes an Experiment without cascading to immutable Snapshots or Articles", async () => {
    const store = new BrowserContentStore(new MemoryStorageV3());
    const candidate = experimentV3();
    const experiment = store.saveExperiment(candidate, candidate.content);
    const snapshot = store.saveSnapshotCommit(await admittedCommitV3(
      experiment,
      { snapshotId: "snapshot/retained" },
    ), experiment.content).snapshot;
    store.saveArticle(articleV3(snapshot));

    expect(store.deleteExperiment(experiment.experimentId)).toBe(true);
    expect(store.readExperiment(experiment.experimentId)).toBeNull();
    expect(store.readSnapshot(snapshot.snapshotId)).toEqual(snapshot);
    expect(store.readArticle("article/browser-store")).not.toBeNull();
  });

  it("deletes an Article without cascading to its neutral Snapshot", async () => {
    const store = new BrowserContentStore(new MemoryStorageV3());
    const experiment = experimentV3();
    const snapshot = store.saveSnapshotCommit(await admittedCommitV3(
      experiment,
      { snapshotId: "snapshot/article-delete-retained" },
    ), experiment.content).snapshot;
    store.saveArticle(articleV3(snapshot));

    expect(store.deleteArticle("article/browser-store")).toBe(true);
    expect(store.deleteArticle("article/browser-store")).toBe(false);
    expect(store.readArticle("article/browser-store")).toBeNull();
    expect(store.readSnapshot(snapshot.snapshotId)).toEqual(snapshot);
  });

  it("fails closed when the single current envelope is corrupt", () => {
    const storage = new MemoryStorageV3();
    storage.setItem(BROWSER_CONTENT_STORE_KEY, JSON.stringify({
      schemaId: BROWSER_CONTENT_STORE_SCHEMA_ID,
      experiments: [],
      snapshots: [],
      articles: [],
      legacyWorkspace: {},
    }));
    const store = new BrowserContentStore(storage);

    expect(() => store.listSnapshots()).toThrow(/schema is invalid/);
    expect(() => store.readArticle("article/browser-store")).toThrow(/schema is invalid/);
  });

  it("reads prose independently of an unavailable embed but still rejects corrupt snapshots and writes", async () => {
    const storage = new MemoryStorageV3();
    const store = new BrowserContentStore(storage);
    const experiment = experimentV3();
    const snapshot = store.saveSnapshotCommit(await admittedCommitV3(experiment, { snapshotId: "snapshot/reader" }), experiment.content).snapshot;
    const article = store.saveArticle(articleV3(snapshot));
    const envelope = JSON.parse(storage.getItem(BROWSER_CONTENT_STORE_KEY)!);
    envelope.snapshots[0].content.scenarios[0].capture.checkpoint = { invalid: true };
    storage.setItem(BROWSER_CONTENT_STORE_KEY, JSON.stringify(envelope));
    expect(store.readArticle(article.articleId)).toEqual(article);
    expect(() => store.readSnapshot(snapshot.snapshotId)).toThrow();
    expect(() => store.saveArticle(article)).toThrow();
    envelope.articles.push(article);
    storage.setItem(BROWSER_CONTENT_STORE_KEY, JSON.stringify(envelope));
    expect(() => store.readArticle(article.articleId)).toThrow(/duplicate articleId/);
  });
});

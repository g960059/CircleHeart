import { describe, expect, it, vi } from "vitest";
import {
  STUDIO_EXPERIMENT_SNAPSHOT_V2_SCHEMA_ID,
  STUDIO_EXPERIMENT_V2_SCHEMA_ID,
  type ExperimentScenarioV2,
  type ExperimentSnapshotV2,
  type ExperimentSurfaceV2,
  type ExperimentV2,
} from "@/studio/contracts/v2/content";
import type {
  StudioSimulationWorkerAdmittedSnapshotCommitV2,
} from "@/studio/workers/StudioSimulationWorkerClientV2";
import {
  StudioSimulationWorkerClientV2,
} from "@/studio/workers/StudioSimulationWorkerClientV2";
import {
  WorkbenchParallelAuthoringCoordinatorV3,
  type WorkbenchParallelAuthoringInputV3,
  type WorkbenchParallelSnapshotAuthoringInputV3,
} from "@/components/workbench/runtime/WorkbenchParallelAuthoringCoordinatorV3";
import {
  STANDARD_TEST_RELEASE_TICKET_V1,
  STANDARD_TEST_SURFACE_RELEASE_ID_V1,
  STANDARD_TEST_SURFACE_SERIES_ID_V1,
} from "./helpers/standardReleaseTicketV1";
import type {
  StudioSnapshotPreparationPortV1,
  StudioSnapshotSettlementMethodV1,
} from "@/studio/application/authoring/StudioSnapshotPreparationV1";

describe("WorkbenchParallelAuthoringCoordinatorV3", () => {
  const preparationMethod: StudioSnapshotSettlementMethodV1 = {
    methodId: "test/settlement-v1", purpose: "full-system-steady", configuration: { tolerance: 0.001 },
  };

  it("prepares every Scenario before sealing and preserves the original Worker commit", async () => {
    const client = clientDoubleV3();
    const commit = Object.freeze({ snapshot: "sealed-worker-owned" });
    client.createSnapshot.mockResolvedValue(commit);
    const coordinator = new WorkbenchParallelAuthoringCoordinatorV3(() => client as unknown as StudioSimulationWorkerClientV2);
    const source = preparedInputV3();
    const prepare = vi.fn<StudioSnapshotPreparationPortV1["prepare"]>(async ({ capture }) => {
      expect(client.initialize).not.toHaveBeenCalled();
      return { status: "qualified", capture: {
        ...capture, checkpoint: { ...capture.checkpoint, acceptedRevision: 20, acceptedTimeSec: 2 },
      }, evidence: { holdoutPassed: true } };
    });
    const result = await coordinator.createPreparedSnapshot(source, { method: preparationMethod }, { supports: () => true, prepare });
    expect(prepare).toHaveBeenCalledTimes(2);
    expect(client.initialize.mock.calls[0]![0].checkpoint.acceptedRevision).toBe(20);
    expect(client.addScenarioFromPreset.mock.calls[0]![0].preset.capture.checkpoint.acceptedRevision).toBe(20);
    expect(result.commit).toBe(commit);
    expect(result.preparations.map(({ preparation }) => preparation.mode)).toEqual(["steady", "steady"]);
    expect(source.scenarios[0]!.capture.checkpoint.acceptedRevision).toBe(1);
    expect(client.terminate).toHaveBeenCalledOnce();
  });

  it("does not seal partial preparation when another Scenario fails or a method is missing", async () => {
    const factory = vi.fn(() => clientDoubleV3() as unknown as StudioSimulationWorkerClientV2);
    const coordinator = new WorkbenchParallelAuthoringCoordinatorV3(factory);
    await expect(coordinator.createPreparedSnapshot(preparedInputV3())).rejects.toThrow("compatible settlement method");
    let count = 0;
    const port: StudioSnapshotPreparationPortV1 = {
      supports: () => true,
      prepare: async ({ capture }) => ++count === 1
        ? { status: "qualified", capture, evidence: {} }
        : { status: "insufficient-evidence", reason: "independent seed coverage" },
    };
    await expect(coordinator.createPreparedSnapshot(preparedInputV3(), { method: preparationMethod }, port))
      .rejects.toThrow("insufficient-evidence");
    expect(factory).not.toHaveBeenCalled();
  });

  it("preserves transient checkpoints explicitly without a preparation method", async () => {
    const client = clientDoubleV3();
    const coordinator = new WorkbenchParallelAuthoringCoordinatorV3(() => client as unknown as StudioSimulationWorkerClientV2);
    const source = preparedInputV3();
    const result = await coordinator.createPreparedSnapshot(source, { mode: "preserve-transient" });
    expect(client.initialize.mock.calls[0]![0].checkpoint).toEqual(source.scenarios[0]!.capture.checkpoint);
    expect(client.addScenarioFromPreset.mock.calls[0]![0].preset.capture).toEqual(source.scenarios[1]!.capture);
    expect(result.preparations.every(({ preparation }) => preparation.settlement === null)).toBe(true);
  });

  it("seeds an existing Experiment with the latest ordered lane captures", async () => {
    const durableExperiment = experimentV3({
      version: 7,
      scenarios: [scenarioV3("scenario/baseline", "Baseline", 1)],
    });
    const currentScenarios = [
      scenarioV3("scenario/baseline", "Baseline", 11),
      scenarioV3("scenario/comparison", "Comparison", 23),
    ];
    const nextSurface = surfaceV3("Latest surface");
    const savedExperiment = experimentV3({
      version: 8,
      scenarios: currentScenarios,
      surface: nextSurface,
    });
    const client = clientDoubleV3();
    client.saveExperiment.mockResolvedValue(savedExperiment);
    const coordinator = new WorkbenchParallelAuthoringCoordinatorV3(
      () => client as unknown as StudioSimulationWorkerClientV2,
    );

    await expect(coordinator.saveExperiment(inputV3({
      scenarios: currentScenarios,
      activeScenarioId: "scenario/comparison",
      surface: nextSurface,
      experiment: durableExperiment,
    }))).resolves.toBe(savedExperiment);

    expect(client.initialize).toHaveBeenCalledOnce();
    const initialized = client.initialize.mock.calls[0]![0];
    expect(initialized).toMatchObject({
      expectedModelId: "model/main-wire-v3-r1",
      runtimeSessionId: "runtime/authoring-1",
      scenarioId: "scenario/comparison",
      scenarioLabel: "Comparison",
      fixture: { value: 23 },
      checkpoint: {
        acceptedRevision: 23,
        acceptedTimeSec: 2.3,
      },
    });
    expect(initialized.authoringSeed.experiment).toMatchObject({
      experimentId: "experiment/workbench",
      version: 7,
      content: {
        scenarios: currentScenarios,
        surface: nextSurface,
      },
    });
    expect(client.saveExperiment).toHaveBeenCalledWith({
      runtimeSessionId: "runtime/authoring-1",
      scenarioId: "scenario/comparison",
      experimentId: "experiment/workbench",
      surfaceSeriesId: STANDARD_TEST_SURFACE_SERIES_ID_V1,
      surface: nextSurface,
      expectedVersion: 7,
    });
    expect(client.terminate).toHaveBeenCalledOnce();
  });

  it("assembles every exact Scenario through Presets on first Save", async () => {
    const scenarios = [
      scenarioV3("scenario/baseline", "Baseline", 5),
      scenarioV3("scenario/comparison", "Comparison", 8),
      scenarioV3("scenario/device", "Device", 13),
    ];
    const savedExperiment = experimentV3({
      version: 0,
      scenarios,
    });
    const client = clientDoubleV3();
    client.saveExperiment.mockResolvedValue(savedExperiment);
    const coordinator = new WorkbenchParallelAuthoringCoordinatorV3(
      () => client as unknown as StudioSimulationWorkerClientV2,
    );

    const saved = await coordinator.saveExperiment(inputV3({
      scenarios,
      activeScenarioId: "scenario/baseline",
      experiment: null,
    }));

    expect(saved).toBe(savedExperiment);
    expect(client.initialize).toHaveBeenCalledWith({
      expectedModelId: "model/main-wire-v3-r1",
      releaseTicket: STANDARD_TEST_RELEASE_TICKET_V1,
      runtimeSessionId: "runtime/authoring-1",
      scenarioId: "scenario/baseline",
      scenarioLabel: "Baseline",
      fixture: { value: 5 },
      checkpoint: scenarios[0]!.capture.checkpoint,
    });
    expect(client.initialize.mock.calls[0]![0]).not.toHaveProperty(
      "authoringSeed",
    );
    expect(client.addScenarioFromPreset).toHaveBeenCalledTimes(2);
    expect(client.addScenarioFromPreset).toHaveBeenNthCalledWith(1, {
      runtimeSessionId: "runtime/authoring-1",
      scenarioId: "scenario/comparison",
      label: "Comparison",
      preset: expect.objectContaining({
        presetId: "transient/parallel-authoring/1",
        modelId: "model/main-wire-v3-r1",
        capture: scenarios[1]!.capture,
      }),
    });
    expect(client.addScenarioFromPreset).toHaveBeenNthCalledWith(2, {
      runtimeSessionId: "runtime/authoring-1",
      scenarioId: "scenario/device",
      label: "Device",
      preset: expect.objectContaining({
        presetId: "transient/parallel-authoring/2",
        modelId: "model/main-wire-v3-r1",
        capture: scenarios[2]!.capture,
      }),
    });
    expect(client.selectScenario).toHaveBeenCalledWith({
      runtimeSessionId: "runtime/authoring-1",
      scenarioId: "scenario/baseline",
    });
    expect(client.saveExperiment).toHaveBeenCalledWith(expect.objectContaining({
      scenarioId: "scenario/baseline",
      expectedVersion: null,
    }));
    expect(client.initialize.mock.invocationCallOrder[0]).toBeLessThan(
      client.addScenarioFromPreset.mock.invocationCallOrder[0]!,
    );
    expect(client.selectScenario.mock.invocationCallOrder[0]).toBeLessThan(
      client.saveExperiment.mock.invocationCallOrder[0]!,
    );
    expect(client.terminate).toHaveBeenCalledOnce();
  });

  it("returns the Worker's sealed admitted Snapshot commit unchanged", async () => {
    const durableScenario = scenarioV3(
      "scenario/baseline",
      "Baseline",
      3,
    );
    const laterCheckpoint = scenarioV3(
      durableScenario.scenarioId,
      durableScenario.label,
      31,
    ).capture.checkpoint;
    const liveScenario: ExperimentScenarioV2 = {
      ...durableScenario,
      capture: {
        fixture: durableScenario.capture.fixture,
        checkpoint: laterCheckpoint,
      },
    };
    const experiment = experimentV3({
      version: 9,
      scenarios: [durableScenario],
    });
    const commit = Object.freeze({
      snapshot: snapshotV3("snapshot/next", experiment),
    }) as unknown as StudioSimulationWorkerAdmittedSnapshotCommitV2;
    const client = clientDoubleV3();
    client.createSnapshot.mockResolvedValue(commit);
    const coordinator = new WorkbenchParallelAuthoringCoordinatorV3(
      () => client as unknown as StudioSimulationWorkerClientV2,
    );

    const created = await coordinator.createSnapshot(snapshotInputV3({
      scenarios: [liveScenario],
      activeScenarioId: liveScenario.scenarioId,
      experiment,
    }));

    expect(created).toBe(commit);
    expect(client.initialize).toHaveBeenCalledWith(expect.objectContaining({
      scenarioId: liveScenario.scenarioId,
      scenarioLabel: liveScenario.label,
      fixture: liveScenario.capture.fixture,
      checkpoint: liveScenario.capture.checkpoint,
      authoringSeed: {
        experiment: expect.objectContaining({
          experimentId: experiment.experimentId,
          version: experiment.version,
          content: expect.objectContaining({
            scenarios: [liveScenario],
          }),
        }),
      },
    }));
    expect(client.createSnapshot).toHaveBeenCalledWith({
      runtimeSessionId: "runtime/authoring-1",
      scenarioId: "scenario/baseline",
      surfaceSeriesId: STANDARD_TEST_SURFACE_SERIES_ID_V1,
      surfaceReleaseId: STANDARD_TEST_SURFACE_RELEASE_ID_V1,
      surface: surfaceV3("Workbench note"),
      snapshotSource: "saved-experiment",
    });
    expect(client.terminate).toHaveBeenCalledOnce();
  });

  it("rejects publication when authored content differs from the saved projection", async () => {
    const durableScenario = scenarioV3(
      "scenario/baseline",
      "Baseline",
      3,
    );
    const experiment = experimentV3({
      version: 9,
      scenarios: [durableScenario],
    });
    const changedFixture = scenarioV3(
      durableScenario.scenarioId,
      durableScenario.label,
      31,
    );
    const client = clientDoubleV3();
    const coordinator = new WorkbenchParallelAuthoringCoordinatorV3(
      () => client as unknown as StudioSimulationWorkerClientV2,
    );

    await expect(coordinator.createSnapshot(snapshotInputV3({
      scenarios: [changedFixture],
      activeScenarioId: changedFixture.scenarioId,
      experiment,
    }))).rejects.toThrow(/clean saved Experiment projection/);
    expect(client.initialize).not.toHaveBeenCalled();
  });

  it("terminates a transient client when an authoring operation rejects", async () => {
    const client = clientDoubleV3();
    client.saveExperiment.mockRejectedValue(new Error("capture failed"));
    const coordinator = new WorkbenchParallelAuthoringCoordinatorV3(
      () => client as unknown as StudioSimulationWorkerClientV2,
    );

    await expect(coordinator.saveExperiment(inputV3({
      scenarios: [scenarioV3("scenario/baseline", "Baseline", 2)],
      activeScenarioId: "scenario/baseline",
      experiment: null,
    }))).rejects.toThrow("capture failed");
    expect(client.terminate).toHaveBeenCalledOnce();
  });

  it("rejects empty or non-member Scenario inputs before allocating a Worker", async () => {
    const factory = vi.fn(() =>
      clientDoubleV3() as unknown as StudioSimulationWorkerClientV2);
    const coordinator = new WorkbenchParallelAuthoringCoordinatorV3(factory);

    await expect(coordinator.saveExperiment(inputV3({
      scenarios: [],
      activeScenarioId: "scenario/missing",
      experiment: null,
    }))).rejects.toThrow(/at least one Scenario/);
    await expect(coordinator.saveExperiment(inputV3({
      scenarios: [scenarioV3("scenario/baseline", "Baseline", 1)],
      activeScenarioId: "scenario/missing",
      experiment: null,
    }))).rejects.toThrow(/not in the gathered captures/);
    expect(factory).not.toHaveBeenCalled();
  });

  it("creates a neutral Snapshot for Article placement without a saved Experiment", async () => {
    const baseExperiment = experimentV3({
      version: 0,
      scenarios: [scenarioV3("scenario/baseline", "Baseline", 1)],
    });
    const baseSnapshot = snapshotV3("snapshot/base", baseExperiment);
    const commit = Object.freeze({
      snapshot: {
        ...baseSnapshot,
        snapshotId: "snapshot/next",
      },
    }) as unknown as StudioSimulationWorkerAdmittedSnapshotCommitV2;
    const client = clientDoubleV3();
    client.createSnapshot.mockResolvedValue(commit);
    const coordinator = new WorkbenchParallelAuthoringCoordinatorV3(
      () => client as unknown as StudioSimulationWorkerClientV2,
    );

    await expect(coordinator.createSnapshot({
      ...snapshotInputV3({ experiment: null, experimentId: null }),
      snapshotSource: "session",
    })).resolves.toBe(commit);
    expect(client.initialize.mock.calls[0]![0]).not.toHaveProperty(
      "authoringSeed",
    );
    expect(client.createSnapshot).toHaveBeenCalledWith({
      runtimeSessionId: "runtime/authoring-1",
      scenarioId: "scenario/baseline",
      surfaceSeriesId: STANDARD_TEST_SURFACE_SERIES_ID_V1,
      surfaceReleaseId: STANDARD_TEST_SURFACE_RELEASE_ID_V1,
      surface: surfaceV3("Workbench note"),
      snapshotSource: "session",
    });

    await expect(coordinator.createSnapshot(snapshotInputV3({
      experiment: null,
    }))).rejects.toThrow(/requires an explicitly saved Experiment/);
  });
});

function preparedInputV3(): WorkbenchParallelSnapshotAuthoringInputV3 {
  return {
    ...snapshotInputV3({ modelId: STANDARD_TEST_RELEASE_TICKET_V1.modelId, scenarios: [
      scenarioV3("scenario/baseline", "Baseline", 1),
      scenarioV3("scenario/comparison", "Comparison", 2),
    ] }),
    snapshotSource: "session",
  };
}

function clientDoubleV3() {
  return {
    initialize: vi.fn().mockResolvedValue(undefined),
    addScenarioFromPreset: vi.fn().mockResolvedValue(undefined),
    selectScenario: vi.fn().mockResolvedValue(undefined),
    saveExperiment: vi.fn(),
    createSnapshot: vi.fn(),
    terminate: vi.fn(),
  };
}

function inputV3(
  overrides: Partial<WorkbenchParallelAuthoringInputV3>,
): WorkbenchParallelAuthoringInputV3 {
  return {
    modelId: "model/main-wire-v3-r1",
    surfaceSeriesId: STANDARD_TEST_SURFACE_SERIES_ID_V1,
    releaseTicket: STANDARD_TEST_RELEASE_TICKET_V1,
    scenarios: [scenarioV3("scenario/baseline", "Baseline", 1)],
    activeScenarioId: "scenario/baseline",
    surface: surfaceV3("Workbench note"),
    experiment: null,
    experimentId: "experiment/workbench",
    runtimeSessionId: "runtime/authoring-1",
    ...overrides,
  };
}

function snapshotInputV3(
  overrides: Partial<WorkbenchParallelAuthoringInputV3>,
): WorkbenchParallelSnapshotAuthoringInputV3 {
  return {
    ...inputV3(overrides),
    surfaceReleaseId: STANDARD_TEST_SURFACE_RELEASE_ID_V1,
    snapshotSource: "saved-experiment",
  };
}

function scenarioV3(
  scenarioId: string,
  label: string,
  clock: number,
): ExperimentScenarioV2 {
  return {
    scenarioId,
    label,
    capture: {
      fixture: { value: clock },
      checkpoint: {
        acceptedRevision: clock,
        acceptedTimeSec: clock / 10,
        payload: { state: [clock] },
      },
    },
  };
}

function surfaceV3(note: string): ExperimentSurfaceV2 {
  return {
    graphPanes: [],
    outputPanes: [],
    controlPanes: [],
    note: { text: note },
  };
}

function experimentV3(input: Readonly<{
  version: number;
  scenarios: readonly ExperimentScenarioV2[];
  surface?: ExperimentSurfaceV2;
}>): ExperimentV2 {
  return {
    schemaId: STUDIO_EXPERIMENT_V2_SCHEMA_ID,
    experimentId: "experiment/workbench",
    version: input.version,
    content: {
      modelId: "model/main-wire-v3-r1",
      surfaceSeriesId: STANDARD_TEST_SURFACE_SERIES_ID_V1,
      scenarios: input.scenarios,
      surface: input.surface ?? surfaceV3("Workbench note"),
    },
  };
}

function snapshotV3(
  snapshotId: string,
  experiment: ExperimentV2,
): ExperimentSnapshotV2 {
  return {
    schemaId: STUDIO_EXPERIMENT_SNAPSHOT_V2_SCHEMA_ID,
    snapshotId,
    surfaceReleaseId: STANDARD_TEST_SURFACE_RELEASE_ID_V1,
    content: experiment.content,
    createdAt: "2026-08-01T00:00:00.000Z",
  };
}

import {
  STUDIO_SCENARIO_PRESET_V2_SCHEMA_ID,
  type ExperimentScenarioV2,
  type ExperimentSurfaceV2,
  type ExperimentV2,
  type ScenarioPresetV2,
} from "@/studio/contracts/v2/content";
import {
  validateExperimentContentV2,
  validateExperimentV2,
} from "@/studio/application/authoring/StudioExperimentDataV2";
import type {
  StudioModelWorkerReleaseTicketV2,
} from "@/studio/contracts/v2/release";
import {
  StudioSimulationWorkerClientV2,
  type StudioSimulationWorkerAdmittedSnapshotCommitV2,
} from "@/studio/workers/StudioSimulationWorkerClientV2";
import { cloneAndFreezeStudioJson, studioCanonicalJsonStringify } from
  "@/domain/json/CanonicalJson";
import {
  prepareStudioSnapshotCaptureV1,
  type StudioPreparedSnapshotCaptureV1,
  type StudioSnapshotPreparationPortV1,
  type StudioSnapshotPreparationRequestV1,
  type StudioSnapshotSettlementEvidenceV1,
  type StudioSnapshotSettlementMethodV1,
} from "@/studio/application/authoring/StudioSnapshotPreparationV1";
import type {
  WorkbenchBackgroundJobPriorityV3,
  WorkbenchBackgroundWorkerPoolPortV3,
} from "./WorkbenchBackgroundWorkerPoolV3";

export type WorkbenchParallelAuthoringClientFactoryV3 =
  () => StudioSimulationWorkerClientV2;

export type WorkbenchParallelAuthoringInputV3 = Readonly<{
  modelId: string;
  surfaceSeriesId: string;
  releaseTicket: StudioModelWorkerReleaseTicketV2;
  /** Exact captures gathered from the live lane Workers, in UI order. */
  scenarios: readonly ExperimentScenarioV2[];
  activeScenarioId: string;
  surface: ExperimentSurfaceV2;
  experiment: ExperimentV2 | null;
  /** Null for any disposable Session that has not been explicitly saved. */
  experimentId: string | null;
  runtimeSessionId: string;
}>;

export type WorkbenchParallelSnapshotAuthoringInputV3 =
  WorkbenchParallelAuthoringInputV3 & Readonly<{
    surfaceReleaseId: string;
    /** Transient authoring constraint, not Snapshot identity. */
    snapshotSource: "saved-experiment" | "session";
  }>;

type ValidatedAuthoringInputV3 = Readonly<{
  modelId: string;
  surfaceSeriesId: string;
  releaseTicket: StudioModelWorkerReleaseTicketV2;
  scenarios: readonly ExperimentScenarioV2[];
  activeScenario: ExperimentScenarioV2;
  surface: ExperimentSurfaceV2;
  experiment: ExperimentV2 | null;
  experimentId: string | null;
  runtimeSessionId: string;
}>;

/**
 * Reassembles parallel live lanes inside one short-lived authoring Worker.
 *
 * Live lane Workers remain the runtime authorities for their own Scenario.
 * This coordinator exists only across one explicit Save or Snapshot command;
 * it never persists runtime status, transport identity, or integrity metadata.
 */
export class WorkbenchParallelAuthoringCoordinatorV3 {
  readonly #createClient: WorkbenchParallelAuthoringClientFactoryV3;
  readonly #workerPool: WorkbenchBackgroundWorkerPoolPortV3 | undefined;

  constructor(
    createClient: WorkbenchParallelAuthoringClientFactoryV3 =
      () => new StudioSimulationWorkerClientV2(),
    workerPool?: WorkbenchBackgroundWorkerPoolPortV3,
  ) {
    this.#createClient = createClient;
    this.#workerPool = workerPool;
  }

  async saveExperiment(
    inputValue: WorkbenchParallelAuthoringInputV3,
  ): Promise<ExperimentV2> {
    const input = validateAuthoringInputV3(inputValue);
    if (input.experimentId === null) {
      throw new Error("Experiment Save requires a durable Experiment identity");
    }
    return await this.#withClient("save", async (client) => {
      if (input.experiment === null) {
        await initializeFirstSaveV3(client, input);
        return await client.saveExperiment({
          runtimeSessionId: input.runtimeSessionId,
          scenarioId: input.activeScenario.scenarioId,
          experimentId: input.experimentId,
          surface: input.surface,
          surfaceSeriesId: input.surfaceSeriesId,
          expectedVersion: null,
        });
      }

      const syntheticExperiment = validateExperimentV2({
        ...input.experiment,
        content: {
          modelId: input.modelId,
          surfaceSeriesId: input.surfaceSeriesId,
          scenarios: input.scenarios,
          surface: input.surface,
        },
      });
      await initializeFromExperimentV3(
        client,
        input,
        syntheticExperiment,
      );
      return await client.saveExperiment({
        runtimeSessionId: input.runtimeSessionId,
        scenarioId: input.activeScenario.scenarioId,
        experimentId: input.experimentId,
        surface: input.surface,
        surfaceSeriesId: input.surfaceSeriesId,
        expectedVersion: input.experiment.version,
      });
    });
  }

  async createSnapshot(
    inputValue: WorkbenchParallelSnapshotAuthoringInputV3,
  ): Promise<StudioSimulationWorkerAdmittedSnapshotCommitV2> {
    const input = validateAuthoringInputV3(inputValue);
    return await this.#withClient("snapshot", async (client) => {
      if (inputValue.snapshotSource === "saved-experiment") {
        if (input.experiment === null || input.experimentId === null) {
          throw new Error(
            "Publishing requires an explicitly saved Experiment",
          );
        }
        assertSameSavedProjectionV3(input.experiment, input);
        // Publication is authorized by the clean saved projection, but the
        // immutable Snapshot owns the detached accepted checkpoints.
        // The authoring application intentionally compares model, Surface,
        // Scenario identity/order/label, and fixture while allowing newer
        // exact checkpoints for the same saved parameter target.
        const candidateExperiment = validateExperimentV2({
          ...input.experiment,
          content: {
            modelId: input.modelId,
            surfaceSeriesId: input.surfaceSeriesId,
            scenarios: input.scenarios,
            surface: input.surface,
          },
        });
        await initializeFromExperimentV3(
          client,
          input,
          candidateExperiment,
        );
      } else {
        await initializeTransientAuthoringV3(client, input);
      }
      // Return the Worker's original sealed object. Cloning or reconstructing
      // it would intentionally invalidate browser Snapshot persistence.
      const base = {
        runtimeSessionId: input.runtimeSessionId,
        scenarioId: input.activeScenario.scenarioId,
        surface: input.surface,
        surfaceSeriesId: input.surfaceSeriesId,
        surfaceReleaseId: inputValue.surfaceReleaseId,
      };
      return await client.createSnapshot({
        ...base,
        snapshotSource: inputValue.snapshotSource,
      });
    });
  }

  /**
   * Explicit authoring preparation, before the existing numerical admission.
   * Existing neutral createSnapshot callers and Snapshot readers are unchanged.
   * No Worker is opened for sealing until every Scenario has been prepared.
   */
  async createPreparedSnapshot(
    inputValue: WorkbenchParallelSnapshotAuthoringInputV3,
    request: Omit<StudioSnapshotPreparationRequestV1, "reusableEvidence"> & Readonly<{
      reusableEvidenceByScenarioId?: Readonly<Record<string, StudioSnapshotSettlementEvidenceV1>>;
    }> = {},
    port?: StudioSnapshotPreparationPortV1,
  ): Promise<Readonly<{
    commit: StudioSimulationWorkerAdmittedSnapshotCommitV2;
    preparations: readonly Readonly<{
      scenarioId: string;
      preparation: StudioPreparedSnapshotCaptureV1;
    }>[];
  }>> {
    const input = validateAuthoringInputV3(inputValue);
    const releaseTicket = cloneAndFreezeStudioJson<StudioModelWorkerReleaseTicketV2>(input.releaseTicket);
    const surfaceReleaseId = inputValue.surfaceReleaseId;
    const snapshotSource = inputValue.snapshotSource;
    if (releaseTicket.modelId !== input.modelId
      || releaseTicket.surfaceRelease.surfaceSeriesId !== input.surfaceSeriesId
      || releaseTicket.surfaceRelease.surfaceReleaseId !== surfaceReleaseId) {
      throw new Error("Snapshot preparation release identity mismatch");
    }
    const mode = request.mode ?? "steady";
    const method = request.method === undefined ? undefined
      : cloneAndFreezeStudioJson<StudioSnapshotSettlementMethodV1>(request.method);
    const reusableEvidence = { ...request.reusableEvidenceByScenarioId };
    const preparations: { scenarioId: string; preparation: StudioPreparedSnapshotCaptureV1 }[] = [];
    for (const scenario of input.scenarios) {
      const preparation = await prepareStudioSnapshotCaptureV1({
        identity: {
          modelId: input.modelId,
          artifactRevisionId: releaseTicket.artifactRevisionId,
          surfaceReleaseId,
        },
        capture: scenario.capture,
        request: { mode, method, reusableEvidence: reusableEvidence[scenario.scenarioId] },
        port,
      });
      preparations.push(Object.freeze({ scenarioId: scenario.scenarioId, preparation }));
    }
    const commit = await this.createSnapshot({
      ...input,
      releaseTicket,
      activeScenarioId: input.activeScenario.scenarioId,
      surfaceReleaseId,
      snapshotSource,
      scenarios: input.scenarios.map((scenario, index) => Object.freeze({
        ...scenario, capture: preparations[index]!.preparation.capture,
      })),
    });
    return Object.freeze({ commit, preparations: Object.freeze(preparations) });
  }

  async #withClient<T>(
    priority: WorkbenchBackgroundJobPriorityV3,
    operation: (client: StudioSimulationWorkerClientV2) => Promise<T>,
  ): Promise<T> {
    if (this.#workerPool !== undefined) {
      return await this.#workerPool.run(priority, operation);
    }
    const client = this.#createClient();
    try {
      return await operation(client);
    } finally {
      client.terminate();
    }
  }
}

function assertSameSavedProjectionV3(
  saved: ExperimentV2,
  candidate: ValidatedAuthoringInputV3,
): void {
  if (
    saved.content.modelId !== candidate.modelId
    || saved.content.surfaceSeriesId !== candidate.surfaceSeriesId
    || studioCanonicalJsonStringify(saved.content.surface)
      !== studioCanonicalJsonStringify(candidate.surface)
    || saved.content.scenarios.length !== candidate.scenarios.length
  ) {
    throw new Error(
      "Publishing candidate differs from the clean saved Experiment projection",
    );
  }
  for (let index = 0; index < candidate.scenarios.length; index += 1) {
    const durable = saved.content.scenarios[index]!;
    const selected = candidate.scenarios[index]!;
    if (
      durable.scenarioId !== selected.scenarioId
      || durable.label !== selected.label
      || studioCanonicalJsonStringify(durable.capture.fixture)
        !== studioCanonicalJsonStringify(selected.capture.fixture)
    ) {
      throw new Error(
        "Publishing candidate differs from the clean saved Experiment projection",
      );
    }
  }
}

async function initializeFirstSaveV3(
  client: StudioSimulationWorkerClientV2,
  input: ValidatedAuthoringInputV3,
): Promise<void> {
  const firstScenario = input.scenarios[0]!;
  await client.initialize({
    expectedModelId: input.modelId,
    releaseTicket: input.releaseTicket,
    runtimeSessionId: input.runtimeSessionId,
    scenarioId: firstScenario.scenarioId,
    scenarioLabel: firstScenario.label,
    fixture: firstScenario.capture.fixture,
    checkpoint: firstScenario.capture.checkpoint,
  });

  let selectedScenarioId = firstScenario.scenarioId;
  for (let index = 1; index < input.scenarios.length; index += 1) {
    const scenario = input.scenarios[index]!;
    await client.addScenarioFromPreset({
      runtimeSessionId: input.runtimeSessionId,
      scenarioId: scenario.scenarioId,
      label: scenario.label,
      preset: transientPresetV3(input.modelId, scenario, index),
    });
    selectedScenarioId = scenario.scenarioId;
  }

  if (selectedScenarioId !== input.activeScenario.scenarioId) {
    await client.selectScenario({
      runtimeSessionId: input.runtimeSessionId,
      scenarioId: input.activeScenario.scenarioId,
    });
  }
}

async function initializeTransientAuthoringV3(
  client: StudioSimulationWorkerClientV2,
  input: ValidatedAuthoringInputV3,
): Promise<void> {
  const firstScenario = input.scenarios[0]!;
  await client.initialize({
    expectedModelId: input.modelId,
    releaseTicket: input.releaseTicket,
    runtimeSessionId: input.runtimeSessionId,
    scenarioId: firstScenario.scenarioId,
    scenarioLabel: firstScenario.label,
    fixture: firstScenario.capture.fixture,
    checkpoint: firstScenario.capture.checkpoint,
  });

  let selectedScenarioId = firstScenario.scenarioId;
  for (let index = 1; index < input.scenarios.length; index += 1) {
    const scenario = input.scenarios[index]!;
    await client.addScenarioFromPreset({
      runtimeSessionId: input.runtimeSessionId,
      scenarioId: scenario.scenarioId,
      label: scenario.label,
      preset: transientPresetV3(input.modelId, scenario, index),
    });
    selectedScenarioId = scenario.scenarioId;
  }

  if (selectedScenarioId !== input.activeScenario.scenarioId) {
    await client.selectScenario({
      runtimeSessionId: input.runtimeSessionId,
      scenarioId: input.activeScenario.scenarioId,
    });
  }
}

async function initializeFromExperimentV3(
  client: StudioSimulationWorkerClientV2,
  input: ValidatedAuthoringInputV3,
  experiment: ExperimentV2,
): Promise<void> {
  const seededActiveScenario = experiment.content.scenarios.find(
    ({ scenarioId }) => scenarioId === input.activeScenario.scenarioId,
  );
  if (seededActiveScenario === undefined) {
    throw new Error(
      "saved Experiment does not contain the active authoring Scenario",
    );
  }
  await client.initialize({
    expectedModelId: input.modelId,
    releaseTicket: input.releaseTicket,
    runtimeSessionId: input.runtimeSessionId,
    scenarioId: seededActiveScenario.scenarioId,
    scenarioLabel: seededActiveScenario.label,
    fixture: seededActiveScenario.capture.fixture,
    checkpoint: seededActiveScenario.capture.checkpoint,
    authoringSeed: {
      experiment,
    },
  });
}

function transientPresetV3(
  modelId: string,
  scenario: ExperimentScenarioV2,
  index: number,
): ScenarioPresetV2 {
  return Object.freeze({
    schemaId: STUDIO_SCENARIO_PRESET_V2_SCHEMA_ID,
    presetId: `transient/parallel-authoring/${index}`,
    modelId,
    title: scenario.label,
    description: "Transient exact capture for parallel authoring assembly.",
    capture: scenario.capture,
  });
}

function validateAuthoringInputV3(
  input: WorkbenchParallelAuthoringInputV3,
): ValidatedAuthoringInputV3 {
  if (input.scenarios.length === 0) {
    throw new Error("parallel authoring requires at least one Scenario capture");
  }
  const experiment = input.experiment === null
    ? null
    : validateExperimentV2(input.experiment);
  if (experiment !== null) {
    if (
      input.experimentId === null
      || experiment.experimentId !== input.experimentId
    ) {
      throw new Error(
        "parallel authoring experiment Experiment identity mismatch",
      );
    }
    if (experiment.content.modelId !== input.modelId) {
      throw new Error("parallel authoring experiment exact modelId mismatch");
    }
  }

  const validatedContent = validateExperimentContentV2({
    modelId: input.modelId,
    surfaceSeriesId: input.surfaceSeriesId,
    scenarios: input.scenarios,
    surface: input.surface,
  });
  const activeScenario = validatedContent.scenarios.find(
    ({ scenarioId }) => scenarioId === input.activeScenarioId,
  );
  if (activeScenario === undefined) {
    throw new Error(
      "parallel authoring active Scenario is not in the gathered captures",
    );
  }

  return Object.freeze({
    modelId: validatedContent.modelId,
    surfaceSeriesId: validatedContent.surfaceSeriesId,
    releaseTicket: input.releaseTicket,
    scenarios: validatedContent.scenarios,
    activeScenario,
    surface: validatedContent.surface,
    experiment,
    experimentId: input.experimentId,
    runtimeSessionId: input.runtimeSessionId,
  });
}

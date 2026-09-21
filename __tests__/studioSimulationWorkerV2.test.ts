import { afterEach, describe, expect, it, vi } from "vitest";
import type { ResolvePresentationAnalysisMethodsV1 } from "@/analysis/contracts/PresentationAnalysisV1";

import type {
  AnalysisExecutorV1,
} from "@/analysis/contracts/AnalysisExecutionV1";

import {
  STUDIO_EXPERIMENT_SNAPSHOT_V2_SCHEMA_ID,
  STUDIO_EXPERIMENT_V2_SCHEMA_ID,
  STUDIO_SCENARIO_PRESET_V2_SCHEMA_ID,
  type ExperimentContentV2,
  type ExperimentSurfaceV2,
  type ExperimentV2,
} from "@/studio/contracts/v2/content";
import {
  REGISTERED_MODEL_EXECUTION_PLAN_ADAPTER_V1_SCHEMA_ID,
  type RegisteredModelExecutionPlanAdapterV1,
  type ResolvedExactModelRuntimeV2,
} from "@/studio/contracts/v2/executable";
import {
  bindExecutionPlanV1,
  validateAndOwnExecutionPlanDescriptorV1,
} from "@/runtime/executionPlan/BoundExecutionPlanV1";
import generatedExecutionPlanV1 from
  "@/studio/integrations/mainWireIntegratedV3/MainWireIntegratedExecutionPlanV1.generated.json";
import type {
  ModelContractV2,
} from "@/studio/contracts/v2/model";
import type {
  RegisteredModelSimulationAdapterV2,
  StudioSimulationAnalysisV2,
  StudioSimulationFrameV2,
} from "@/studio/contracts/v2/simulation";
import {
  StudioSimulationWorkerRequestErrorV2,
  StudioSimulationWorkerClientV2,
  createStudioSimulationWorkerClientForTestV2,
  type StudioSimulationWorkerTransportV2,
} from "@/studio/workers/StudioSimulationWorkerClientV2";
import {
  STUDIO_SIMULATION_WORKER_PROTOCOL_V2,
  createStudioSimulationAddScenarioFromPresetRequestV2,
  createStudioSimulationApplyControlRequestV2,
  createStudioSimulationAdvancePresentationRequestV2,
  createStudioSimulationAdvanceRequestV2,
  createStudioSimulationCreateSnapshotRequestV2,
  createStudioSimulationDeleteScenarioRequestV2,
  createStudioSimulationDisposeRequestV2,
  createStudioSimulationDuplicateScenarioRequestV2,
  createStudioSimulationInitializeRequestV2,
  createStudioSimulationReadScenariosRequestV2,
  createStudioSimulationRenameScenarioRequestV2,
  createStudioSimulationRequestAnalysisRequestV2,
  createStudioSimulationSaveExperimentRequestV2,
  createStudioSimulationSelectScenarioRequestV2,
  validateStudioSimulationWorkerRequestV2,
  validateStudioSimulationWorkerResponseFromTrustedRuntimeV2,
  validateStudioSimulationWorkerResponseV2,
} from "@/studio/workers/StudioSimulationWorkerProtocolV2";
import {
  createStudioSimulationPresentationBatchV2,
  studioSimulationPresentationBatchTransferablesV2,
} from "@/studio/workers/StudioSimulationPresentationBatchV2";
import {
  StudioSimulationWorkerRuntimeV2,
} from "@/studio/workers/StudioSimulationWorkerRuntimeV2";
import {
  STANDARD_TEST_RELEASE_TICKET_V1,
  STANDARD_TEST_SURFACE_RELEASE_ID_V1,
  STANDARD_TEST_SURFACE_SERIES_ID_V1,
} from "./helpers/standardReleaseTicketV1";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("Studio simulation worker V2 protocol", () => {
  it("transports detached shared preparation only with analysis progress and validates both directions", () => {
    const input = { runtimeSessionId: "runtime/session-1", scenarioId: "scenario/baseline", analysisId: "analysis/shared",
      analysisPartition: "low", expectedInputEpoch: 0, expectedAcceptedRevision: 0, expectedAcceptedTimeSec: 0 };
    const preparation = { checkpoint: { digest: "test" }, curve: [1, 2] };
    const request = createStudioSimulationRequestAnalysisRequestV2(1, { ...input, preparedAnalysis: preparation });
    preparation.curve[0] = 9;
    expect(request.preparedAnalysis).toEqual({ checkpoint: { digest: "test" }, curve: [1, 2] });
    expect(() => createStudioSimulationRequestAnalysisRequestV2(1, { ...input, sharePreparation: "yes" })).toThrow(/boolean/);
    expect(() => createStudioSimulationRequestAnalysisRequestV2(1, { ...input, sharePreparation: true, preparedAnalysis: {} })).toThrow(/together/);
    const progress = { ...analysisProgressResponseV2(1, analysisV2()), preparation };
    for (const validate of [validateStudioSimulationWorkerResponseV2, validateStudioSimulationWorkerResponseFromTrustedRuntimeV2]) {
      expect(validate(progress)).toMatchObject({ preparation });
      expect(() => validate({ ...progress, preparation: { value: NaN } })).toThrow(/finite/);
      expect(() => validate({ ...progress, kind: "analysis-result" })).toThrow();
    }
  });

  it("bounds and validates optional beat-analysis requests and summaries", () => {
    const input = { runtimeSessionId: "runtime/session-1", scenarioId: "scenario/baseline", stepCount: 2,
      presentationOutputIds: [], presentationAnalysisIds: ["analysis/beat"] };
    const request = createStudioSimulationAdvancePresentationRequestV2(2, input);
    expect(validateStudioSimulationWorkerRequestV2(request)).toEqual(request);
    for (const ids of [["analysis/beat", "analysis/beat"], Array.from({ length: 9 }, (_, i) => `analysis/${i}`)]) {
      expect(() => createStudioSimulationAdvancePresentationRequestV2(2, { ...input, presentationAnalysisIds: ids })).toThrow();
    }
    const response = { protocol: STUDIO_SIMULATION_WORKER_PROTOCOL_V2, status: "ok", requestId: 2,
      kind: "presentation-advanced", batch: createStudioSimulationPresentationBatchV2([frameV2()], []),
      analyses: [analysisV2()] };
    for (const validate of [validateStudioSimulationWorkerResponseV2, validateStudioSimulationWorkerResponseFromTrustedRuntimeV2]) {
      expect(validate(response)).toMatchObject({ analyses: [analysisV2()] });
      expect(() => validate({ ...response, analyses: [analysisV2(), analysisV2()] })).toThrow();
    }
  });
  it("detaches and freezes exact portable initialize requests", () => {
    const fixture = {
      controls: { heartRateBpm: 60 },
      values: [1, 2],
    };
    const request = validateStudioSimulationWorkerRequestV2({
      protocol: STUDIO_SIMULATION_WORKER_PROTOCOL_V2,
      requestId: 1,
      kind: "initialize",
      expectedModelId: "model/main-wire-v3-r1",
      releaseTicket: STANDARD_TEST_RELEASE_TICKET_V1,
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      scenarioLabel: "Baseline",
      fixture,
      checkpoint: {
        acceptedRevision: 4,
        acceptedTimeSec: 0.4,
        payload: { state: [3, 4] },
      },
    });
    fixture.controls.heartRateBpm = 90;
    fixture.values.push(3);

    expect(request).toMatchObject({
      requestId: 1,
      expectedModelId: "model/main-wire-v3-r1",
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      scenarioLabel: "Baseline",
      fixture: {
        controls: { heartRateBpm: 60 },
        values: [1, 2],
      },
    });
    if (request.kind !== "initialize") {
      throw new Error("expected an initialize request");
    }
    expect(Object.isFrozen(request)).toBe(true);
    expect(Object.isFrozen(request.fixture)).toBe(true);
    expect(Object.isFrozen(request.checkpoint?.payload)).toBe(true);
  });

  it("rejects unknown, explicitly undefined, accessor, and poisoned request data", () => {
    const base = initializeRequestV2(1);
    const withoutReleaseTicket = { ...base } as Record<string, unknown>;
    delete withoutReleaseTicket.releaseTicket;
    expect(() => validateStudioSimulationWorkerRequestV2(withoutReleaseTicket))
      .toThrow(/releaseTicket|fields must match exactly/);
    expect(() => validateStudioSimulationWorkerRequestV2({
      ...base,
      targetGeneration: 4,
    })).toThrow(/fields must match exactly/);
    expect(() => validateStudioSimulationWorkerRequestV2({
      ...base,
      checkpoint: undefined,
    })).toThrow(/checkpoint.*plain data object/);

    const getter = vi.fn(() => ({ value: 1 }));
    const accessor = { ...base } as Record<string, unknown>;
    Object.defineProperty(accessor, "fixture", {
      enumerable: true,
      get: getter,
    });
    expect(() => validateStudioSimulationWorkerRequestV2(accessor))
      .toThrow(/enumerable data property/);
    expect(getter).not.toHaveBeenCalled();

    const customPrototype = Object.create({ poisoned: true });
    Object.defineProperties(
      customPrototype,
      Object.getOwnPropertyDescriptors(base),
    );
    expect(() => validateStudioSimulationWorkerRequestV2(customPrototype))
      .toThrow(/custom prototype/);

    const values = [1];
    const map = vi.fn(() => [Number.NaN]);
    const poisonedPrototype = Object.create(Array.prototype);
    Object.defineProperty(poisonedPrototype, "map", { value: map });
    Object.setPrototypeOf(values, poisonedPrototype);
    expect(() => validateStudioSimulationWorkerRequestV2({
      ...base,
      fixture: { values },
    })).toThrow(/array must not use a custom prototype/);
    expect(map).not.toHaveBeenCalled();
  });

  it("enforces request IDs, exact variants, and bounded step counts", () => {
    expect(() => createStudioSimulationAdvanceRequestV2(0, {
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      stepCount: 1,
    })).toThrow(/positive safe integer/);
    expect(createStudioSimulationAdvanceRequestV2(1, {
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      stepCount: 16,
    })).toMatchObject({ stepCount: 16 });
    for (const stepCount of [0, 17, 1.5, Number.NaN]) {
      expect(() => createStudioSimulationAdvanceRequestV2(1, {
        runtimeSessionId: "runtime/session-1",
        scenarioId: "scenario/baseline",
        stepCount,
      })).toThrow(/within \[1, 16\]/);
    }
    expect(() => validateStudioSimulationWorkerRequestV2({
      ...createStudioSimulationDisposeRequestV2(1, "runtime/session-1"),
      scenarioId: undefined,
    })).toThrow(/fields must match exactly/);

    expect(createStudioSimulationAdvancePresentationRequestV2(2, {
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      stepCount: 4,
      presentationOutputIds: ["pressure.lv", "phase.cycle"],
    })).toMatchObject({
      kind: "advance-presentation",
      stepCount: 4,
      presentationOutputIds: ["pressure.lv", "phase.cycle"],
    });
    expect(() => createStudioSimulationAdvancePresentationRequestV2(2, {
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      stepCount: 4,
      presentationOutputIds: ["pressure.lv", "pressure.lv"],
    })).toThrow(/must be unique/);
  });

  it("validates exact semantic control requests and finite scalar values", () => {
    const request = createStudioSimulationApplyControlRequestV2(2, {
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      controlId: "control/heart-rate",
      value: 72,
      expectedInputEpoch: 3,
    });
    expect(request).toEqual({
      protocol: STUDIO_SIMULATION_WORKER_PROTOCOL_V2,
      requestId: 2,
      kind: "apply-control",
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      controlId: "control/heart-rate",
      value: 72,
      expectedInputEpoch: 3,
    });
    expect(Object.isFrozen(request)).toBe(true);

    for (const value of [Number.NaN, Number.POSITIVE_INFINITY, "72"]) {
      expect(() => createStudioSimulationApplyControlRequestV2(2, {
        runtimeSessionId: "runtime/session-1",
        scenarioId: "scenario/baseline",
        controlId: "control/heart-rate",
        value,
        expectedInputEpoch: 3,
      })).toThrow(/finite scalar/);
    }
    expect(() => createStudioSimulationApplyControlRequestV2(2, {
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      controlId: "not portable",
      value: 72,
      expectedInputEpoch: 3,
    })).toThrow(/portable opaque ID/);
    expect(() => createStudioSimulationApplyControlRequestV2(2, {
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      controlId: "control/heart-rate",
      value: 72,
      expectedInputEpoch: -1,
    })).toThrow(/nonnegative safe integer/);
    expect(() => createStudioSimulationApplyControlRequestV2(2, {
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      controlId: "control/heart-rate",
      value: 72,
      expectedInputEpoch: 3,
      rawParameterId: "heartRateBpm",
    })).toThrow(/fields must match exactly/);
  });

  it("validates exact analysis requests and deeply owns portable results", () => {
    const request = createStudioSimulationRequestAnalysisRequestV2(3, {
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      analysisId: "analysis/guyton-starling-v1",
      expectedInputEpoch: 2,
      expectedAcceptedRevision: 45,
      expectedAcceptedTimeSec: 0.09,
    });
    expect(request).toEqual({
      protocol: STUDIO_SIMULATION_WORKER_PROTOCOL_V2,
      requestId: 3,
      kind: "request-analysis",
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      analysisId: "analysis/guyton-starling-v1",
      expectedInputEpoch: 2,
      expectedAcceptedRevision: 45,
      expectedAcceptedTimeSec: 0.09,
    });
    expect(Object.isFrozen(request)).toBe(true);

    const payload = { curve: [{ pressure: 1, flow: 2 }] };
    const response = validateStudioSimulationWorkerResponseV2({
      protocol: STUDIO_SIMULATION_WORKER_PROTOCOL_V2,
      requestId: 3,
      status: "ok",
      kind: "analysis-result",
      analysis: analysisV2({
        inputEpoch: 2,
        sourceAcceptedRevision: 45,
        sourceAcceptedTimeSec: 0.09,
        payload,
      }),
    });
    payload.curve[0]!.flow = 99;
    expect(response).toMatchObject({
      kind: "analysis-result",
      analysis: { payload: { curve: [{ pressure: 1, flow: 2 }] } },
    });
    if (response.status === "ok" && response.kind === "analysis-result") {
      expect(Object.isFrozen(response.analysis)).toBe(true);
      expect(Object.isFrozen(response.analysis.payload)).toBe(true);
      const owned = response.analysis.payload as {
        curve: readonly Readonly<{ pressure: number; flow: number }>[];
      };
      expect(Object.isFrozen(owned.curve)).toBe(true);
      expect(Object.isFrozen(owned.curve[0])).toBe(true);
    }

    for (const badClock of [-1, Number.NaN, -0]) {
      expect(() => createStudioSimulationRequestAnalysisRequestV2(3, {
        runtimeSessionId: "runtime/session-1",
        scenarioId: "scenario/baseline",
        analysisId: "analysis/guyton-starling-v1",
        expectedInputEpoch: 2,
        expectedAcceptedRevision: 45,
        expectedAcceptedTimeSec: badClock,
      })).toThrow(/finite/);
    }
    expect(() => createStudioSimulationRequestAnalysisRequestV2(3, {
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      analysisId: "not portable",
      expectedInputEpoch: 2,
      expectedAcceptedRevision: 45,
      expectedAcceptedTimeSec: 0.09,
    })).toThrow(/portable opaque ID/);
  });

  it("validates detached authoring seeds and exact Save/Snapshot commands", () => {
    const experiment = experimentV2();
    const initialize = createStudioSimulationInitializeRequestV2(1, {
      expectedModelId: "model/main-wire-v3-r1",
      releaseTicket: STANDARD_TEST_RELEASE_TICKET_V1,
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      scenarioLabel: "Baseline",
      fixture: { value: 1 },
      checkpoint: experiment.content.scenarios[0]!.capture.checkpoint,
      authoringSeed: { experiment },
    });
    (experiment.content.surface.note as { text: string }).text = "mutated";
    expect(initialize.authoringSeed?.experiment?.content.surface.note.text)
      .toBe("Saved note");
    expect(Object.isFrozen(initialize.authoringSeed?.experiment)).toBe(true);

    const surface = surfaceV2();
    const save = createStudioSimulationSaveExperimentRequestV2(2, {
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      experimentId: "experiment/main",
      surfaceSeriesId: STANDARD_TEST_SURFACE_SERIES_ID_V1,
      surface,
      expectedVersion: null,
      expectedInputEpoch: 0,
      expectedAcceptedRevision: 0,
      expectedAcceptedTimeSec: 0,
    });
    (surface.note as { text: string }).text = "mutated";
    expect(save).toMatchObject({
      kind: "save-experiment",
      expectedVersion: null,
      scenarioIds: ["scenario/baseline"],
      surface: { note: { text: "Saved note" } },
    });
    expect(Object.isFrozen(save.surface.controlPanes[0]?.items)).toBe(true);

    expect(createStudioSimulationCreateSnapshotRequestV2(3, {
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      scenarioIds: ["scenario/baseline"],
      surfaceSeriesId: STANDARD_TEST_SURFACE_SERIES_ID_V1,
      surfaceReleaseId: STANDARD_TEST_SURFACE_RELEASE_ID_V1,
      surface: surfaceV2(),
      snapshotSource: "saved-experiment",
      expectedInputEpoch: 0,
      expectedAcceptedRevision: 0,
      expectedAcceptedTimeSec: 0,
    })).toMatchObject({
      kind: "create-snapshot",
      snapshotSource: "saved-experiment",
    });

    expect(createStudioSimulationDuplicateScenarioRequestV2(4, {
      runtimeSessionId: "runtime/session-1",
      sourceScenarioId: "scenario/baseline",
      scenarioId: "scenario/copy",
      label: "Copy",
      expectedActiveScenarioId: "scenario/comparison",
      expectedInputEpoch: 0,
      expectedAcceptedRevision: 4,
      expectedAcceptedTimeSec: 0.4,
    })).toMatchObject({
      kind: "duplicate-scenario",
      sourceScenarioId: "scenario/baseline",
      scenarioId: "scenario/copy",
    });
    expect(() => createStudioSimulationDuplicateScenarioRequestV2(5, {
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/copy",
      label: "Copy",
      expectedActiveScenarioId: "scenario/comparison",
      expectedInputEpoch: 0,
      expectedAcceptedRevision: 4,
      expectedAcceptedTimeSec: 0.4,
    })).toThrow(/fields must match exactly.*sourceScenarioId/);
    expect(() => createStudioSimulationSaveExperimentRequestV2(4, {
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      experimentId: "experiment/main",
      surfaceSeriesId: STANDARD_TEST_SURFACE_SERIES_ID_V1,
      surface: surfaceV2(),
      expectedVersion: null,
      expectedInputEpoch: 0,
      expectedAcceptedRevision: 0,
      expectedAcceptedTimeSec: -1,
    })).toThrow(/nonnegative/);
  });

  it("validates and detaches exact response frames and output values", () => {
    const source = frameV2({
      outputs: {
        "pressure.lv": outputV2("pressure.lv", [80, 120]),
      },
    });
    const response = validateStudioSimulationWorkerResponseV2({
      protocol: STUDIO_SIMULATION_WORKER_PROTOCOL_V2,
      requestId: 1,
      status: "ok",
      kind: "initialized",
      frame: source,
    });
    (source.outputs["pressure.lv"].value as number[]).push(70);

    expect(response).toMatchObject({
      kind: "initialized",
      frame: {
        runtimeSessionId: "runtime/session-1",
        outputs: {
          "pressure.lv": { value: [80, 120] },
        },
      },
    });
    expect(Object.isFrozen(response)).toBe(true);
    if (response.status === "ok" && response.kind === "initialized") {
      expect(Object.isFrozen(response.frame.outputs)).toBe(true);
      expect(Object.isFrozen(
        response.frame.outputs["pressure.lv"].value,
      )).toBe(true);
    }
  });

  it("validates immutable cold-start phase timings", () => {
    const response = validateStudioSimulationWorkerResponseV2({
      protocol: STUDIO_SIMULATION_WORKER_PROTOCOL_V2,
      requestId: 1,
      status: "ok",
      kind: "initialized",
      frame: frameV2(),
      initializationTiming: {
        exactRuntimeLoad: {
          cacheHit: false,
          artifactBytes: 1_024,
          artifactFetchMs: 3,
          moduleImportAndFactoryMs: 5,
          contractValidationMs: 2,
          totalMs: 10,
        },
        authoringSetupMs: 1,
        sessionCreateMs: 4,
        initialFrameMs: 0.5,
        executionPlanBindMs: 2,
        totalWorkerInitializeMs: 15.5,
      },
    });

    expect(response).toMatchObject({
      kind: "initialized",
      initializationTiming: {
        exactRuntimeLoad: { artifactBytes: 1_024, cacheHit: false },
        executionPlanBindMs: 2,
        totalWorkerInitializeMs: 15.5,
      },
    });
    if (response.status === "ok" && response.kind === "initialized") {
      expect(Object.isFrozen(response.initializationTiming)).toBe(true);
      expect(Object.isFrozen(response.initializationTiming?.exactRuntimeLoad))
        .toBe(true);
    }
    expect(() => validateStudioSimulationWorkerResponseV2({
      protocol: STUDIO_SIMULATION_WORKER_PROTOCOL_V2,
      requestId: 1,
      status: "ok",
      kind: "initialized",
      frame: frameV2(),
      initializationTiming: {
        exactRuntimeLoad: null,
        authoringSetupMs: 1,
        sessionCreateMs: -1,
        initialFrameMs: 0,
        executionPlanBindMs: 0,
        totalWorkerInitializeMs: 1,
      },
    })).toThrow(/sessionCreateMs.*nonnegative/);
  });

  it("validates the exact control-applied response variant", () => {
    const sourceFixture = { value: 72, coupled: { value: 9 } };
    const response = validateStudioSimulationWorkerResponseV2(
      { ...controlAppliedResponseV2(4, frameV2({ inputEpoch: 1 })), fixture: sourceFixture },
    );
    sourceFixture.coupled.value = -1;
    expect(response).toMatchObject({
      requestId: 4,
      status: "ok",
      kind: "control-applied",
      frame: { inputEpoch: 1 },
      fixture: { value: 72, coupled: { value: 9 } },
    });
    expect(() => validateStudioSimulationWorkerResponseV2({
      ...controlAppliedResponseV2(4, frameV2({ inputEpoch: 1 })),
      unexpected: {},
    })).toThrow(/fields must match exactly/);
    expect(() => validateStudioSimulationWorkerResponseV2({
      ...controlAppliedResponseV2(4, frameV2({ inputEpoch: 1 })),
      fixture: undefined,
    })).toThrow();
    expect(() => validateStudioSimulationWorkerResponseV2({
      ...controlAppliedResponseV2(4, frameV2({ inputEpoch: 1 })),
      fixture: { value: NaN },
    })).toThrow();
  });

  it("trusts only the already-validated output body on advanced responses", () => {
    const nestedOutputGetter = vi.fn(() => outputV2("pressure.lv", 120));
    const outputs: Record<string, unknown> = {};
    Object.defineProperty(outputs, "pressure.lv", {
      enumerable: true,
      get: nestedOutputGetter,
    });
    const response =
      validateStudioSimulationWorkerResponseFromTrustedRuntimeV2({
        protocol: STUDIO_SIMULATION_WORKER_PROTOCOL_V2,
        requestId: 8,
        status: "ok",
        kind: "advanced",
        frames: [{
          modelId: "model/main-wire-v3-r1",
          runtimeSessionId: "runtime/session-1",
          scenarioId: "scenario/baseline",
          inputEpoch: 0,
          acceptedRevision: 8,
          acceptedTimeSec: 0.016,
          outputs,
        }],
      });

    expect(response).toMatchObject({
      requestId: 8,
      status: "ok",
      kind: "advanced",
      frames: [{ acceptedRevision: 8, acceptedTimeSec: 0.016 }],
    });
    expect(nestedOutputGetter).not.toHaveBeenCalled();
    if (response.status === "ok" && response.kind === "advanced") {
      expect(response.frames[0]?.outputs).toBe(outputs);
    }

    expect(() => validateStudioSimulationWorkerResponseV2({
      protocol: STUDIO_SIMULATION_WORKER_PROTOCOL_V2,
      requestId: 8,
      status: "ok",
      kind: "advanced",
      frames: [{
        modelId: "model/main-wire-v3-r1",
        runtimeSessionId: "runtime/session-1",
        scenarioId: "scenario/baseline",
        inputEpoch: 0,
        acceptedRevision: 8,
        acceptedTimeSec: 0.016,
        outputs,
      }],
    })).toThrow(/enumerable data property/);
    expect(nestedOutputGetter).not.toHaveBeenCalled();
  });

  it("keeps exact transport checks on trusted advanced responses", () => {
    const advanced = {
      protocol: STUDIO_SIMULATION_WORKER_PROTOCOL_V2,
      requestId: 8,
      status: "ok",
      kind: "advanced",
      frames: [frameV2({ acceptedRevision: 8, acceptedTimeSec: 0.016 })],
    } as const;

    expect(() => validateStudioSimulationWorkerResponseFromTrustedRuntimeV2({
      ...advanced,
      frames: [{ ...advanced.frames[0], unexpected: true }],
    })).toThrow(/fields must match exactly/);
    expect(() => validateStudioSimulationWorkerResponseFromTrustedRuntimeV2({
      ...advanced,
      frames: [{ ...advanced.frames[0], acceptedTimeSec: Number.NaN }],
    })).toThrow(/finite/);
    expect(() => validateStudioSimulationWorkerResponseFromTrustedRuntimeV2({
      ...advanced,
      frames: [{
        ...advanced.frames[0],
        outputs: Object.create({ inherited: true }) as Record<string, unknown>,
      }],
    })).toThrow(/custom prototype/);

    expect(() => validateStudioSimulationWorkerResponseFromTrustedRuntimeV2({
      protocol: STUDIO_SIMULATION_WORKER_PROTOCOL_V2,
      requestId: 9,
      status: "ok",
      kind: "initialized",
      frame: frameV2({ acceptedTimeSec: Number.NaN }),
    })).toThrow(/finite/);
  });

  it("validates compact presentation batches without copying trusted buffers", () => {
    const batch = createStudioSimulationPresentationBatchV2([
      frameV2({
        acceptedRevision: 1,
        acceptedTimeSec: 0.002,
        outputs: { "pressure.lv": outputV2("pressure.lv", 91) },
      }),
      frameV2({
        acceptedRevision: 2,
        acceptedTimeSec: 0.004,
        outputs: { "pressure.lv": outputV2("pressure.lv", 92) },
      }),
    ], ["pressure.lv"]);
    const trusted = validateStudioSimulationWorkerResponseFromTrustedRuntimeV2({
      protocol: STUDIO_SIMULATION_WORKER_PROTOCOL_V2,
      requestId: 9,
      status: "ok",
      kind: "presentation-advanced",
      batch,
    });
    expect(trusted).toMatchObject({
      requestId: 9,
      kind: "presentation-advanced",
      batch: {
        outputIds: ["pressure.lv"],
        workerAdvanceMs: 0,
        workerPrepareMs: 0,
        terminalFrame: { acceptedRevision: 2 },
      },
    });
    if (trusted.status !== "ok" || trusted.kind !== "presentation-advanced") {
      throw new Error("expected a compact presentation response");
    }
    expect(trusted.batch.outputValues).toBe(batch.outputValues);
    expect(trusted.batch.acceptedRevisions).toBe(batch.acceptedRevisions);

    const owned = validateStudioSimulationWorkerResponseV2({
      protocol: STUDIO_SIMULATION_WORKER_PROTOCOL_V2,
      requestId: 9,
      status: "ok",
      kind: "presentation-advanced",
      batch,
    });
    if (owned.status !== "ok" || owned.kind !== "presentation-advanced") {
      throw new Error("expected an owned compact presentation response");
    }
    expect(owned.batch.outputValues).not.toBe(batch.outputValues);
    expect([...owned.batch.outputValues]).toEqual([91, 92]);
    expect(owned.batch.workerAdvanceMs).toBe(0);
    expect(owned.batch.workerPrepareMs).toBe(0);
  });

  it("rejects shared compact transport buffers", () => {
    const batch = createStudioSimulationPresentationBatchV2([
      frameV2({
        acceptedRevision: 1,
        acceptedTimeSec: 0.002,
        outputs: { "pressure.lv": outputV2("pressure.lv", 91) },
      }),
    ], ["pressure.lv"]);
    if (typeof SharedArrayBuffer === "function") {
      const sharedValues = new Float64Array(new SharedArrayBuffer(8));
      sharedValues[0] = 91;
      expect(() => validateStudioSimulationWorkerResponseV2({
        protocol: STUDIO_SIMULATION_WORKER_PROTOCOL_V2,
        requestId: 10,
        status: "ok",
        kind: "presentation-advanced",
        batch: { ...batch, outputValues: sharedValues },
      })).toThrow(/owned ArrayBuffer/);
    }
  });

  it("transfers one shared packed-page backing store exactly once", () => {
    const terminalFrame = frameV2({
      acceptedRevision: 1,
      acceptedTimeSec: 0.002,
      outputs: { "pressure.lv": outputV2("pressure.lv", 91) },
    });
    const backing = new ArrayBuffer(32);
    const acceptedRevisions = new Float64Array(backing, 0, 1);
    const acceptedTimesSec = new Float64Array(backing, 8, 1);
    const outputStates = new Uint8Array(backing, 16, 1);
    const outputValues = new Float64Array(backing, 24, 1);
    acceptedRevisions[0] = 1;
    acceptedTimesSec[0] = 0.002;
    outputStates[0] = 0;
    outputValues[0] = 91;

    const transferables = studioSimulationPresentationBatchTransferablesV2({
      outputIds: Object.freeze(["pressure.lv"]),
      acceptedRevisions,
      acceptedTimesSec,
      outputStates,
      outputValues,
      terminalFrame,
      workerAdvanceMs: 0,
      workerPrepareMs: 0,
    });
    expect(transferables).toEqual([backing]);
    expect(() => structuredClone({ acceptedRevisions, outputValues }, {
      transfer: [...transferables],
    })).not.toThrow();
  });

  it("rejects malformed compact presentation matrix and terminal correlation", () => {
    const batch = createStudioSimulationPresentationBatchV2([
      frameV2({
        acceptedRevision: 1,
        acceptedTimeSec: 0.002,
        outputs: { "pressure.lv": outputV2("pressure.lv", 91) },
      }),
    ], ["pressure.lv"]);
    const response = {
      protocol: STUDIO_SIMULATION_WORKER_PROTOCOL_V2,
      requestId: 9,
      status: "ok",
      kind: "presentation-advanced",
      batch,
    } as const;
    expect(() => validateStudioSimulationWorkerResponseV2({
      ...response,
      batch: { ...batch, outputValues: new Float64Array() },
    })).toThrow(/matrix dimensions/);
    expect(() => validateStudioSimulationWorkerResponseV2({
      ...response,
      batch: { ...batch, outputStates: new Uint8Array([9]) },
    })).toThrow(/invalid output state/);
    expect(() => validateStudioSimulationWorkerResponseV2({
      ...response,
      batch: { ...batch, workerAdvanceMs: -1 },
    })).toThrow(/nonnegative/);
    expect(() => validateStudioSimulationWorkerResponseV2({
      ...response,
      batch: {
        ...batch,
        terminalFrame: {
          ...batch.terminalFrame,
          acceptedRevision: 2,
        },
      },
    })).toThrow(/terminal frame must match/);
  });

  it("trusts the Worker-validated body only for progressive analysis", () => {
    const nestedPayloadGetter = vi.fn(() => [{ pressure: 2, flow: 4 }]);
    const payload: Record<string, unknown> = {};
    Object.defineProperty(payload, "curve", {
      enumerable: true,
      get: nestedPayloadGetter,
    });
    const trustedPayload = payload as unknown as
      StudioSimulationAnalysisV2["payload"];
    const progress = analysisProgressResponseV2(
      9,
      analysisV2({ payload: trustedPayload }),
    );
    const response = validateStudioSimulationWorkerResponseFromTrustedRuntimeV2(
      progress,
    );

    expect(response).toMatchObject({
      requestId: 9,
      status: "ok",
      kind: "analysis-progress",
      analysis: { analysisId: "analysis/guyton-starling-v1" },
    });
    expect(nestedPayloadGetter).not.toHaveBeenCalled();
    if (response.status === "ok" && response.kind === "analysis-progress") {
      expect(response.analysis.payload).toBe(payload);
    }

    expect(() => validateStudioSimulationWorkerResponseFromTrustedRuntimeV2(
      analysisResultResponseV2(10, analysisV2({ payload: trustedPayload })),
    )).toThrow(/enumerable data property/);
    expect(nestedPayloadGetter).not.toHaveBeenCalled();
  });

  it("rejects malformed response fields without invoking accessors", () => {
    const getter = vi.fn(() => frameV2());
    const accessor: Record<string, unknown> = {
      protocol: STUDIO_SIMULATION_WORKER_PROTOCOL_V2,
      requestId: 1,
      status: "ok",
      kind: "initialized",
    };
    Object.defineProperty(accessor, "frame", {
      enumerable: true,
      get: getter,
    });
    expect(() => validateStudioSimulationWorkerResponseV2(accessor))
      .toThrow(/enumerable data property/);
    expect(getter).not.toHaveBeenCalled();

    expect(() => validateStudioSimulationWorkerResponseV2({
      protocol: STUDIO_SIMULATION_WORKER_PROTOCOL_V2,
      requestId: 1,
      status: "ok",
      kind: "initialized",
      frame: frameV2({ acceptedTimeSec: Number.NaN }),
    })).toThrow(/finite/);
    expect(() => validateStudioSimulationWorkerResponseV2({
      protocol: STUDIO_SIMULATION_WORKER_PROTOCOL_V2,
      requestId: 1,
      status: "ok",
      kind: "initialized",
      frame: frameV2({
        outputs: { wrong: outputV2("another", 1) },
      }),
    })).toThrow(/must match output map key/);
    expect(() => validateStudioSimulationWorkerResponseV2({
      protocol: STUDIO_SIMULATION_WORKER_PROTOCOL_V2,
      requestId: -0,
      status: "error",
      fatal: false,
      message: "failure",
    })).toThrow(/nonnegative safe integer/);
    expect(() => validateStudioSimulationWorkerResponseV2({
      protocol: STUDIO_SIMULATION_WORKER_PROTOCOL_V2,
      requestId: 1,
      status: "error",
      fatal: false,
      message: "failure",
      kind: undefined,
    })).toThrow(/fields must match exactly/);
    expect(() => validateStudioSimulationWorkerResponseV2({
      protocol: STUDIO_SIMULATION_WORKER_PROTOCOL_V2,
      requestId: 1,
      status: "error",
      message: "failure",
    })).toThrow(/fields must match exactly.*fatal/);
    expect(() => validateStudioSimulationWorkerResponseV2({
      protocol: STUDIO_SIMULATION_WORKER_PROTOCOL_V2,
      requestId: 1,
      status: "error",
      fatal: "yes",
      message: "failure",
    })).toThrow(/fatal.*boolean/);
  });
});

describe("Studio simulation worker V2 runtime", () => {
  it("binds one admitted execution plan exactly once at initialization", async () => {
    const descriptor = validateAndOwnExecutionPlanDescriptorV1(
      generatedExecutionPlanV1,
    );
    const bind = vi.fn(() => bindExecutionPlanV1(
      descriptor,
      mainWireExecutionPlanKernelCatalogV1(),
    ));
    const harness = runtimeHarnessV2({
      executionPlan: executionPlanAdapterV1(bind),
    });

    harness.runtime.enqueue(initializeRequestWithCheckpointV2(1));
    await harness.runtime.whenIdle();
    harness.runtime.enqueue(createStudioSimulationAdvanceRequestV2(2, {
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      stepCount: 1,
    }));
    await harness.runtime.whenIdle();

    expect(bind).toHaveBeenCalledOnce();
    expect(harness.adapter.createSession).toHaveBeenCalledWith({
      runtimeSessionId: "runtime/session-1",
      scenarios: [{
        scenarioId: "scenario/baseline",
        fixture: { value: 1 },
        checkpoint: {
          acceptedRevision: 4,
          acceptedTimeSec: 0.4,
          payload: { state: [4] },
        },
      }],
    });
    expect(harness.port.messages[0]).toMatchObject({
      status: "ok",
      kind: "initialized",
      initializationTiming: {
        executionPlanBindMs: expect.any(Number),
      },
    });
    expect(harness.port.messages.at(-1)).toMatchObject({
      status: "ok",
      kind: "advanced",
    });
  });

  it("binds and installs one isolated execution plan per seeded Scenario", async () => {
    const descriptor = validateAndOwnExecutionPlanDescriptorV1(
      generatedExecutionPlanV1,
    );
    const boundPlans: ReturnType<typeof bindExecutionPlanV1>[] = [];
    const bind = vi.fn(() => {
      const bound = bindExecutionPlanV1(
        descriptor,
        mainWireExecutionPlanKernelCatalogV1(),
      );
      boundPlans.push(bound);
      return bound;
    });
    const createPlanSession = vi.fn<
      RegisteredModelExecutionPlanAdapterV1["createSession"]
    >(async () => {});
    const harness = multiScenarioRuntimeHarnessV2({
      executionPlan: executionPlanAdapterV1(
        bind,
        createPlanSession,
      ),
    });
    const seeded = twoScenarioExperimentV2();

    harness.runtime.enqueue(createStudioSimulationInitializeRequestV2(1, {
      expectedModelId: "model/main-wire-v3-r1",
      releaseTicket: STANDARD_TEST_RELEASE_TICKET_V1,
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/comparison",
      scenarioLabel: "Comparison",
      fixture: seeded.content.scenarios[1]!.capture.fixture,
      checkpoint: seeded.content.scenarios[1]!.capture.checkpoint,
      authoringSeed: { experiment: seeded },
    }));
    await harness.runtime.whenIdle();

    expect(bind).toHaveBeenCalledTimes(2);
    expect(boundPlans[0]).not.toBe(boundPlans[1]);
    expect(createPlanSession).toHaveBeenCalledOnce();
    const initialPlans = createPlanSession.mock.calls[0]![0]
      .boundExecutionPlans;
    expect(initialPlans.get("scenario/baseline")).toBe(boundPlans[0]);
    expect(initialPlans.get("scenario/comparison")).toBe(boundPlans[1]);

    harness.runtime.enqueue(createStudioSimulationAdvanceRequestV2(2, {
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/comparison",
      stepCount: 1,
    }));
    await harness.runtime.whenIdle();
    harness.runtime.enqueue(createStudioSimulationSelectScenarioRequestV2(3, {
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      expectedActiveScenarioId: "scenario/comparison",
      expectedInputEpoch: 0,
      expectedAcceptedRevision: 5,
      expectedAcceptedTimeSec: 0.5,
    }));
    await harness.runtime.whenIdle();
    harness.runtime.enqueue(createStudioSimulationAdvanceRequestV2(4, {
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      stepCount: 1,
    }));
    await harness.runtime.whenIdle();

    expect(createPlanSession).toHaveBeenCalledOnce();
    expect(harness.port.messages.at(-1)).toMatchObject({
      status: "ok",
      kind: "advanced",
      frames: [{ scenarioId: "scenario/baseline", acceptedRevision: 1 }],
    });
  });

  it("rejects cross-Scenario execution-plan storage aliasing before session creation", async () => {
    const descriptor = validateAndOwnExecutionPlanDescriptorV1(
      generatedExecutionPlanV1,
    );
    const aliased = bindExecutionPlanV1(
      descriptor,
      mainWireExecutionPlanKernelCatalogV1(),
    );
    const bind = vi.fn(() => aliased);
    const harness = multiScenarioRuntimeHarnessV2({
      executionPlan: executionPlanAdapterV1(bind),
    });
    const seeded = twoScenarioExperimentV2();

    harness.runtime.enqueue(createStudioSimulationInitializeRequestV2(1, {
      expectedModelId: "model/main-wire-v3-r1",
      releaseTicket: STANDARD_TEST_RELEASE_TICKET_V1,
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      scenarioLabel: "Baseline",
      fixture: seeded.content.scenarios[0]!.capture.fixture,
      checkpoint: seeded.content.scenarios[0]!.capture.checkpoint,
      authoringSeed: { experiment: seeded },
    }));
    await harness.runtime.whenIdle();

    expect(bind).toHaveBeenCalledTimes(2);
    expect(harness.adapter.createSession).not.toHaveBeenCalled();
    expect(harness.port.messages.at(-1)).toMatchObject({
      status: "error",
      fatal: true,
      message: expect.stringMatching(
        /Scenario execution-plan allocations must not alias/,
      ),
    });
  });

  it("includes solve-system ordinals in cross-Scenario alias admission", async () => {
    const descriptor = validateAndOwnExecutionPlanDescriptorV1(
      generatedExecutionPlanV1,
    );
    const first = bindExecutionPlanV1(
      descriptor,
      mainWireExecutionPlanKernelCatalogV1(),
    );
    const second = bindExecutionPlanV1(
      descriptor,
      mainWireExecutionPlanKernelCatalogV1(),
    );
    const plans = [first, Object.freeze({
      ...second,
      solveSystemKernelBindingOrdinals:
        first.solveSystemKernelBindingOrdinals,
    })];
    const bind = vi.fn(() => plans.shift()!);
    const harness = multiScenarioRuntimeHarnessV2({
      executionPlan: executionPlanAdapterV1(bind),
    });
    const seeded = twoScenarioExperimentV2();

    harness.runtime.enqueue(createStudioSimulationInitializeRequestV2(1, {
      expectedModelId: "model/main-wire-v3-r1",
      releaseTicket: STANDARD_TEST_RELEASE_TICKET_V1,
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      scenarioLabel: "Baseline",
      fixture: seeded.content.scenarios[0]!.capture.fixture,
      checkpoint: seeded.content.scenarios[0]!.capture.checkpoint,
      authoringSeed: { experiment: seeded },
    }));
    await harness.runtime.whenIdle();

    expect(bind).toHaveBeenCalledTimes(2);
    expect(harness.adapter.createSession).not.toHaveBeenCalled();
    expect(harness.port.messages.at(-1)).toMatchObject({
      status: "error",
      fatal: true,
      message: expect.stringMatching(
        /Scenario execution-plan allocations must not alias/,
      ),
    });
  });

  it("fails before session creation when a plan binder returns malformed storage", async () => {
    const descriptor = validateAndOwnExecutionPlanDescriptorV1(
      generatedExecutionPlanV1,
    );
    const valid = bindExecutionPlanV1(
      descriptor,
      mainWireExecutionPlanKernelCatalogV1(),
    );
    const wrongGraph = new Int32Array(valid.graphDownstreamNodeIndices);
    wrongGraph[0] = wrongGraph[0] === 0 ? 1 : 0;
    const bind = vi.fn(() => ({
      ...valid,
      graphDownstreamNodeIndices: wrongGraph,
    }));
    const createSession = vi.fn(() => Promise.resolve());
    const harness = runtimeHarnessV2({
      createSession,
      executionPlan: executionPlanAdapterV1(bind),
    });

    harness.runtime.enqueue(initializeRequestV2(1));
    await harness.runtime.whenIdle();

    expect(bind).toHaveBeenCalledOnce();
    expect(createSession).not.toHaveBeenCalled();
    expect(harness.port.messages.at(-1)).toMatchObject({
      status: "error",
      fatal: true,
      message: expect.stringMatching(/values do not match descriptor/),
    });
  });

  it("fails before publishing an initial frame when plan installation fails", async () => {
    const descriptor = validateAndOwnExecutionPlanDescriptorV1(
      generatedExecutionPlanV1,
    );
    const bind = vi.fn(() => bindExecutionPlanV1(
      descriptor,
      mainWireExecutionPlanKernelCatalogV1(),
    ));
    const createPlanSession = vi.fn<
      RegisteredModelExecutionPlanAdapterV1["createSession"]
    >(() => Promise.reject(new Error("typed authority binding drifted")));
    const harness = runtimeHarnessV2({
      executionPlan: executionPlanAdapterV1(
        bind,
        createPlanSession,
      ),
    });

    harness.runtime.enqueue(initializeRequestV2(1));
    await harness.runtime.whenIdle();

    expect(bind).toHaveBeenCalledOnce();
    expect(createPlanSession).toHaveBeenCalledOnce();
    expect(harness.adapter.disposeSession).toHaveBeenCalledOnce();
    expect(harness.port.messages.at(-1)).toMatchObject({
      status: "error",
      fatal: true,
      message: expect.stringMatching(/typed authority binding drifted/),
    });
  });

  it("reports Worker initialization phases while plan binding remains isolated", async () => {
    const harness = runtimeHarnessV2();
    harness.runtime.enqueue(initializeRequestV2(1));
    await harness.runtime.whenIdle();

    expect(harness.port.messages.at(-1)).toMatchObject({
      status: "ok",
      kind: "initialized",
      initializationTiming: {
        exactRuntimeLoad: null,
        authoringSetupMs: expect.any(Number),
        sessionCreateMs: expect.any(Number),
        initialFrameMs: expect.any(Number),
        executionPlanBindMs: expect.any(Number),
        totalWorkerInitializeMs: expect.any(Number),
      },
    });
  });

  it("serializes one exact session and rejects wrong Scenario identity", async () => {
    const harness = runtimeHarnessV2();
    harness.runtime.enqueue(initializeRequestV2(1));
    await harness.runtime.whenIdle();

    harness.runtime.enqueue(createStudioSimulationAdvanceRequestV2(2, {
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/wrong",
      stepCount: 1,
    }));
    await harness.runtime.whenIdle();
    expect(harness.adapter.advanceOnePresentationStep).not.toHaveBeenCalled();
    expect(harness.port.messages.at(-1)).toMatchObject({
      requestId: 2,
      status: "error",
      message: expect.stringMatching(/identity mismatch/),
    });

    harness.runtime.enqueue(createStudioSimulationAdvanceRequestV2(3, {
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      stepCount: 2,
    }));
    await harness.runtime.whenIdle();
    expect(harness.adapter.advanceOnePresentationStep).toHaveBeenCalledTimes(2);
    expect(harness.port.messages.at(-1)).toMatchObject({
      requestId: 3,
      status: "ok",
      kind: "advanced",
      frames: [
        { acceptedRevision: 1 },
        { acceptedRevision: 2 },
      ],
    });
  });

  it("transfers only selected intermediate signals plus one terminal frame", async () => {
    const harness = runtimeHarnessV2();
    harness.runtime.enqueue(initializeRequestV2(1));
    await harness.runtime.whenIdle();

    harness.runtime.enqueue(createStudioSimulationAdvancePresentationRequestV2(
      2,
      {
        runtimeSessionId: "runtime/session-1",
        scenarioId: "scenario/baseline",
        stepCount: 2,
        presentationOutputIds: ["pressure.lv"],
      },
    ));
    await harness.runtime.whenIdle();

    const response = harness.port.messages.at(-1);
    expect(response).toMatchObject({
      requestId: 2,
      status: "ok",
      kind: "presentation-advanced",
      batch: {
        outputIds: ["pressure.lv"],
        terminalFrame: { acceptedRevision: 2 },
      },
    });
    if (
      response === null
      || typeof response !== "object"
      || !("batch" in response)
    ) {
      throw new Error("expected compact presentation batch");
    }
    const batch = response.batch as {
      acceptedRevisions: Float64Array;
      acceptedTimesSec: Float64Array;
      outputStates: Uint8Array;
      outputValues: Float64Array;
    };
    expect(harness.port.transfers.at(-1)).toEqual([
      batch.acceptedRevisions.buffer,
      batch.acceptedTimesSec.buffer,
      batch.outputStates.buffer,
      batch.outputValues.buffer,
    ]);
    expect([...batch.acceptedRevisions]).toEqual([1, 2]);
    expect([...batch.outputValues]).toEqual([80, 80]);
  });

  it("observes only selected pinned methods; strips private columns and sends summaries only when emitted", async () => {
    const ingest = vi.fn(batch => ingest.mock.calls.length === 1 ? analysisV2({ analysisId: "analysis/beat",
      sourceAcceptedRevision: batch.terminalFrame.acceptedRevision, sourceAcceptedTimeSec: batch.terminalFrame.acceptedTimeSec }) : undefined);
    const create = vi.fn(() => ({ ingest }));
    const resolve = vi.fn(() => [{ methodId: "analysis/beat", requiredExactOutputIds: ["pressure.lv"], create }]);
    const harness = runtimeHarnessV2({ resolvePresentationAnalysisMethods: resolve });
    harness.runtime.enqueue(initializeRequestV2(1)); await harness.runtime.whenIdle();
    const input = { runtimeSessionId: "runtime/session-1", scenarioId: "scenario/baseline", stepCount: 2, presentationOutputIds: [] };
    harness.runtime.enqueue(createStudioSimulationAdvancePresentationRequestV2(2, input)); await harness.runtime.whenIdle();
    expect(create).not.toHaveBeenCalled();
    for (const requestId of [3, 4]) {
      harness.runtime.enqueue(createStudioSimulationAdvancePresentationRequestV2(requestId, { ...input, presentationAnalysisIds: ["analysis/beat"] }));
      await harness.runtime.whenIdle();
      expect(harness.port.messages.at(-1)).toMatchObject({ status: "ok", batch: { outputIds: [], outputValues: new Float64Array(0) } });
      const response = harness.port.messages.at(-1) as { analyses?: unknown[] };
      if (requestId === 3) expect(response.analyses).toHaveLength(1);
      else expect(response.analyses).toBeUndefined();
    }
    expect(create).toHaveBeenCalledOnce();
    expect(ingest).toHaveBeenCalledTimes(2);
    expect(ingest.mock.calls[0]?.[0].outputIds).toEqual(["pressure.lv"]);
    const revision = vi.mocked(harness.adapter.advanceOnePresentationStep).mock.calls.length;
    harness.runtime.enqueue(createStudioSimulationAdvancePresentationRequestV2(5, { ...input, presentationAnalysisIds: ["analysis/unpinned"] }));
    await harness.runtime.whenIdle();
    expect(harness.port.messages.at(-1)).toMatchObject({ status: "error", fatal: false });
    expect(vi.mocked(harness.adapter.advanceOnePresentationStep).mock.calls.length).toBe(revision);
    harness.runtime.enqueue(createStudioSimulationAdvancePresentationRequestV2(6, input)); await harness.runtime.whenIdle();
    harness.runtime.enqueue(createStudioSimulationAdvancePresentationRequestV2(7, { ...input, presentationAnalysisIds: ["analysis/beat"] })); await harness.runtime.whenIdle();
    expect(create).toHaveBeenCalledTimes(2); // Deselecting discards the bounded collector.
  });

  it.each(["throw", "wrong-source"])("does not terminate numerical stepping after an observer %s", async fault => {
    const harness = runtimeHarnessV2({ resolvePresentationAnalysisMethods: () => [{ methodId: "analysis/beat",
      requiredExactOutputIds: ["pressure.lv"], create: () => ({ ingest: () => {
        if (fault === "throw") throw new Error("measurement unavailable");
        return analysisV2({ analysisId: "analysis/beat", scenarioId: "wrong" });
      } }) }] });
    harness.runtime.enqueue(initializeRequestV2(1)); await harness.runtime.whenIdle();
    for (const requestId of [2, 3]) {
      harness.runtime.enqueue(createStudioSimulationAdvancePresentationRequestV2(requestId, {
        runtimeSessionId: "runtime/session-1", scenarioId: "scenario/baseline", stepCount: 2,
        presentationOutputIds: [], presentationAnalysisIds: ["analysis/beat"],
      })); await harness.runtime.whenIdle();
      expect(harness.port.messages.at(-1)).toMatchObject({ status: "ok", kind: "presentation-advanced",
        analyses: [{ payload: { status: "unavailable", reason: "presentation-analysis-rejected" } }] });
    }
  });

  it("uses one model-owned batch projection and retains a complete terminal frame", async () => {
    const advancePresentationBatch = vi.fn(async (input: Readonly<{
      runtimeSessionId: string;
      scenarioId: string;
      stepCount: number;
      presentationOutputIds: readonly string[];
    }>) => createStudioSimulationPresentationBatchV2([
      frameV2({
        acceptedRevision: 1,
        acceptedTimeSec: 0.002,
        outputs: { "pressure.lv": outputV2("pressure.lv", 81) },
      }),
      frameV2({
        acceptedRevision: 2,
        acceptedTimeSec: 0.004,
        outputs: { "pressure.lv": outputV2("pressure.lv", 82) },
      }),
    ], input.presentationOutputIds));
    const descriptor = validateAndOwnExecutionPlanDescriptorV1(
      generatedExecutionPlanV1,
    );
    const harness = runtimeHarnessV2({
      advancePresentationBatch,
      executionPlan: executionPlanAdapterV1(
        () => bindExecutionPlanV1(
          descriptor,
          mainWireExecutionPlanKernelCatalogV1(),
        ),
      ),
    });
    harness.runtime.enqueue(initializeRequestV2(1));
    await harness.runtime.whenIdle();

    harness.runtime.enqueue(createStudioSimulationAdvancePresentationRequestV2(
      2,
      {
        runtimeSessionId: "runtime/session-1",
        scenarioId: "scenario/baseline",
        stepCount: 2,
        presentationOutputIds: ["pressure.lv"],
      },
    ));
    await harness.runtime.whenIdle();

    expect(advancePresentationBatch).toHaveBeenCalledOnce();
    expect(advancePresentationBatch).toHaveBeenCalledWith({
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      stepCount: 2,
      presentationOutputIds: ["pressure.lv"],
    });
    expect(harness.adapter.advanceOnePresentationStep).not.toHaveBeenCalled();
    expect(harness.port.messages.at(-1)).toMatchObject({
      requestId: 2,
      status: "ok",
      kind: "presentation-advanced",
      batch: {
        acceptedRevisions: new Float64Array([1, 2]),
        outputValues: new Float64Array([81, 82]),
        workerAdvanceMs: expect.any(Number),
        workerPrepareMs: expect.any(Number),
        terminalFrame: {
          acceptedRevision: 2,
          outputs: { "pressure.lv": { value: 82 } },
        },
      },
    });
  });

  it("rejects an unknown presentation output without advancing or killing the Worker", async () => {
    const harness = runtimeHarnessV2();
    harness.runtime.enqueue(initializeRequestV2(1));
    await harness.runtime.whenIdle();

    harness.runtime.enqueue(createStudioSimulationAdvancePresentationRequestV2(
      2,
      {
        runtimeSessionId: "runtime/session-1",
        scenarioId: "scenario/baseline",
        stepCount: 1,
        presentationOutputIds: ["pressure.unknown"],
      },
    ));
    await harness.runtime.whenIdle();

    expect(harness.port.messages.at(-1)).toMatchObject({
      requestId: 2,
      status: "error",
      fatal: false,
      message: expect.stringMatching(/presentation output.*unavailable/),
    });
    expect(harness.adapter.advanceOnePresentationStep).not.toHaveBeenCalled();
    expect(harness.runtime.state).toBe("active");

    harness.runtime.enqueue(createStudioSimulationAdvanceRequestV2(3, {
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      stepCount: 1,
    }));
    await harness.runtime.whenIdle();
    expect(harness.port.messages.at(-1)).toMatchObject({
      requestId: 3,
      status: "ok",
      kind: "advanced",
    });
  });

  it("rejects a vector presentation output before advancing or killing the Worker", async () => {
    const vectorFrame = frameV2({
      outputs: {
        "valid.vector": outputV2("valid.vector", [1, 2]),
      },
    });
    const advanceOnePresentationStep = vi.fn(() =>
      Promise.resolve(vectorFrame));
    const harness = runtimeHarnessV2({
      currentFrame: vi.fn(() => vectorFrame),
      advanceOnePresentationStep,
    });
    harness.runtime.enqueue(initializeRequestV2(1));
    await harness.runtime.whenIdle();

    harness.runtime.enqueue(createStudioSimulationAdvancePresentationRequestV2(
      2,
      {
        runtimeSessionId: "runtime/session-1",
        scenarioId: "scenario/baseline",
        stepCount: 1,
        presentationOutputIds: ["valid.vector"],
      },
    ));
    await harness.runtime.whenIdle();

    expect(harness.port.messages.at(-1)).toMatchObject({
      requestId: 2,
      status: "error",
      fatal: false,
      message: expect.stringMatching(/must be a scalar or null/),
    });
    expect(advanceOnePresentationStep).not.toHaveBeenCalled();
    expect(harness.runtime.state).toBe("active");
  });

  it("atomically rejects stale controls and commits one epoch on success", async () => {
    const harness = runtimeHarnessV2();
    harness.runtime.enqueue(initializeRequestV2(1));
    await harness.runtime.whenIdle();

    harness.runtime.enqueue(createStudioSimulationApplyControlRequestV2(2, {
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      controlId: "control/heart-rate",
      value: 72,
      expectedInputEpoch: 1,
    }));
    await harness.runtime.whenIdle();
    expect(harness.adapter.applyControl).not.toHaveBeenCalled();
    expect(harness.port.messages.at(-1)).toMatchObject({
      requestId: 2,
      status: "error",
      fatal: false,
      message: expect.stringMatching(/stale expected input epoch/),
    });
    expect(harness.runtime.state).toBe("active");

    harness.runtime.enqueue(createStudioSimulationApplyControlRequestV2(3, {
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      controlId: "control/heart-rate",
      value: 72,
      expectedInputEpoch: 0,
    }));
    await harness.runtime.whenIdle();
    expect(harness.adapter.applyControl).toHaveBeenCalledWith({
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      controlId: "control/heart-rate",
      value: 72,
      expectedInputEpoch: 0,
    });
    expect(harness.port.messages.at(-1)).toMatchObject({
      requestId: 3,
      status: "ok",
      kind: "control-applied",
      frame: { inputEpoch: 1 },
    });
    expect(harness.runtime.state).toBe("active");
  });

  it("returns the reducer's complete accepted fixture without capturing a checkpoint", async () => {
    const capture = vi.fn();
    const harness = runtimeHarnessV2({ captureAcceptedCandidate: capture });
    harness.runtime.enqueue(initializeRequestV2(1));
    await harness.runtime.whenIdle();
    harness.runtime.enqueue(createStudioSimulationApplyControlRequestV2(2, {
      runtimeSessionId: "runtime/session-1", scenarioId: "scenario/baseline",
      controlId: "control/heart-rate", value: 72, expectedInputEpoch: 0,
    }));
    await harness.runtime.whenIdle();
    expect(harness.port.messages.at(-1)).toMatchObject({
      kind: "control-applied", frame: { inputEpoch: 1 }, fixture: { value: 72 },
    });
    expect(capture).not.toHaveBeenCalled();
  });

  it("allows an accepted clock reset when a control starts a new input epoch", async () => {
    const harness = runtimeHarnessV2();
    harness.runtime.enqueue(initializeRequestV2(1));
    await harness.runtime.whenIdle();
    harness.runtime.enqueue(createStudioSimulationAdvanceRequestV2(2, {
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      stepCount: 1,
    }));
    await harness.runtime.whenIdle();
    expect(harness.port.messages.at(-1)).toMatchObject({
      kind: "advanced",
      frames: [{ acceptedRevision: 1, acceptedTimeSec: 0.1 }],
    });

    harness.runtime.enqueue(createStudioSimulationApplyControlRequestV2(3, {
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      controlId: "control/heart-rate",
      value: 72,
      expectedInputEpoch: 0,
    }));
    await harness.runtime.whenIdle();
    expect(harness.port.messages.at(-1)).toMatchObject({
      requestId: 3,
      status: "ok",
      kind: "control-applied",
      frame: {
        inputEpoch: 1,
        acceptedRevision: 0,
        acceptedTimeSec: 0,
      },
    });
  });

  it("keeps the accepted epoch and frame after a rejected control", async () => {
    const applyControl = vi.fn(() => Promise.reject(
      new Error("value is outside the model-owned range"),
    ));
    const harness = runtimeHarnessV2({ applyControl });
    harness.runtime.enqueue(initializeRequestV2(1));
    await harness.runtime.whenIdle();

    harness.runtime.enqueue(createStudioSimulationApplyControlRequestV2(2, {
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      controlId: "control/heart-rate",
      value: 500,
      expectedInputEpoch: 0,
    }));
    await harness.runtime.whenIdle();
    expect(harness.port.messages.at(-1)).toMatchObject({
      requestId: 2,
      status: "error",
      fatal: false,
      message: expect.stringMatching(/outside the model-owned range/),
    });
    expect(harness.runtime.state).toBe("active");
    expect(harness.adapter.currentInputEpoch({
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
    })).toBe(0);
    expect(harness.adapter.currentFrame({
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
    })).toEqual(frameV2());

    harness.runtime.enqueue(createStudioSimulationAdvanceRequestV2(3, {
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      stepCount: 1,
    }));
    await harness.runtime.whenIdle();
    expect(harness.port.messages.at(-1)).toMatchObject({
      requestId: 3,
      status: "ok",
      kind: "advanced",
      frames: [{ inputEpoch: 0 }],
    });
  });

  it("fails closed if a rejected adapter control changes its committed frame", async () => {
    let inputEpoch = 0;
    let currentFrame = frameV2();
    const harness = runtimeHarnessV2({
      currentInputEpoch: vi.fn(() => inputEpoch),
      currentFrame: vi.fn(() => currentFrame),
      applyControl: vi.fn(() => {
        inputEpoch = 1;
        currentFrame = frameV2({ inputEpoch });
        return Promise.reject(new Error("rejected after mutation"));
      }),
    });
    harness.runtime.enqueue(initializeRequestV2(1));
    await harness.runtime.whenIdle();
    harness.runtime.enqueue(createStudioSimulationApplyControlRequestV2(2, {
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      controlId: "control/heart-rate",
      value: 72,
      expectedInputEpoch: 0,
    }));
    await harness.runtime.whenIdle();

    expect(harness.port.messages.at(-1)).toMatchObject({
      requestId: 2,
      status: "error",
      fatal: true,
      message: expect.stringMatching(/violated atomicity/),
    });
    expect(harness.adapter.disposeSession).toHaveBeenCalledTimes(1);
    expect(harness.port.close).toHaveBeenCalledTimes(1);
    expect(harness.runtime.state).toBe("failed");
  });

  it("captures first and updated Experiments from the tracked exact fixture boundary", async () => {
    const harness = runtimeHarnessV2();
    harness.runtime.enqueue(initializeRequestV2(1));
    await harness.runtime.whenIdle();
    harness.runtime.enqueue(createStudioSimulationApplyControlRequestV2(2, {
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      controlId: "control/heart-rate",
      value: 72,
      expectedInputEpoch: 0,
    }));
    await harness.runtime.whenIdle();
    harness.runtime.enqueue(createStudioSimulationAdvanceRequestV2(3, {
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      stepCount: 1,
    }));
    await harness.runtime.whenIdle();

    harness.runtime.enqueue(createStudioSimulationSaveExperimentRequestV2(4, {
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      experimentId: "experiment/main",
      surfaceSeriesId: STANDARD_TEST_SURFACE_SERIES_ID_V1,
      surface: surfaceV2(),
      expectedVersion: null,
      expectedInputEpoch: 1,
      expectedAcceptedRevision: 1,
      expectedAcceptedTimeSec: 0.1,
    }));
    await harness.runtime.whenIdle();
    expect(harness.port.messages.at(-1)).toMatchObject({
      requestId: 4,
      status: "ok",
      kind: "experiment-saved",
      experiment: {
        experimentId: "experiment/main",
        version: 0,
        content: {
          scenarios: [{
            capture: {
              fixture: { value: 72 },
              checkpoint: {
                acceptedRevision: 1,
                acceptedTimeSec: 0.1,
              },
            },
          }],
        },
      },
    });

    harness.runtime.enqueue(createStudioSimulationAdvanceRequestV2(5, {
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      stepCount: 1,
    }));
    await harness.runtime.whenIdle();
    harness.runtime.enqueue(createStudioSimulationSaveExperimentRequestV2(6, {
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      experimentId: "experiment/main",
      surfaceSeriesId: STANDARD_TEST_SURFACE_SERIES_ID_V1,
      surface: surfaceV2("Updated note"),
      expectedVersion: 0,
      expectedInputEpoch: 1,
      expectedAcceptedRevision: 2,
      expectedAcceptedTimeSec: 0.2,
    }));
    await harness.runtime.whenIdle();
    const saved = harness.port.messages.at(-1);
    expect(saved).toMatchObject({
      requestId: 6,
      status: "ok",
      kind: "experiment-saved",
      experiment: {
        version: 1,
        content: {
          scenarios: [{
            label: "Baseline",
            capture: {
              fixture: { value: 72 },
              checkpoint: {
                acceptedRevision: 2,
                acceptedTimeSec: 0.2,
              },
            },
          }],
          surface: { note: { text: "Updated note" } },
        },
      },
    });
    expect(JSON.stringify(saved)).not.toMatch(
      /inputEpoch|runtimeSessionId|qualification|numericalHealth/,
    );
    expect(harness.runtime.state).toBe("active");
  });

  it("rejects stale Experiment versions and sessions without killing simulation", async () => {
    const harness = runtimeHarnessV2();
    harness.runtime.enqueue(initializeRequestV2(1));
    await harness.runtime.whenIdle();
    harness.runtime.enqueue(createStudioSimulationSaveExperimentRequestV2(2, {
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      experimentId: "experiment/main",
      surfaceSeriesId: STANDARD_TEST_SURFACE_SERIES_ID_V1,
      surface: surfaceV2(),
      expectedVersion: null,
      expectedInputEpoch: 0,
      expectedAcceptedRevision: 0,
      expectedAcceptedTimeSec: 0,
    }));
    await harness.runtime.whenIdle();
    harness.runtime.enqueue(createStudioSimulationSaveExperimentRequestV2(3, {
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      experimentId: "experiment/main",
      surfaceSeriesId: STANDARD_TEST_SURFACE_SERIES_ID_V1,
      surface: surfaceV2(),
      expectedVersion: 9,
      expectedInputEpoch: 0,
      expectedAcceptedRevision: 0,
      expectedAcceptedTimeSec: 0,
    }));
    await harness.runtime.whenIdle();
    expect(harness.port.messages.at(-1)).toMatchObject({
      requestId: 3,
      status: "error",
      fatal: false,
      message: expect.stringMatching(/expected version 9/),
    });

    harness.runtime.enqueue(createStudioSimulationSaveExperimentRequestV2(4, {
      runtimeSessionId: "runtime/forged",
      scenarioId: "scenario/baseline",
      experimentId: "experiment/main",
      surfaceSeriesId: STANDARD_TEST_SURFACE_SERIES_ID_V1,
      surface: surfaceV2(),
      expectedVersion: 0,
      expectedInputEpoch: 0,
      expectedAcceptedRevision: 0,
      expectedAcceptedTimeSec: 0,
    }));
    await harness.runtime.whenIdle();
    expect(harness.port.messages.at(-1)).toMatchObject({
      requestId: 4,
      status: "error",
      fatal: false,
      message: expect.stringMatching(/identity mismatch/),
    });
    harness.runtime.enqueue(createStudioSimulationAdvanceRequestV2(5, {
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      stepCount: 1,
    }));
    await harness.runtime.whenIdle();
    expect(harness.port.messages.at(-1)).toMatchObject({
      requestId: 5,
      status: "ok",
      kind: "advanced",
    });
    expect(harness.runtime.state).toBe("active");
  });

  it("admits an independent neutral Snapshot without changing its capture", async () => {
    const admitFrozenCandidate = vi.fn(async () => ({
      status: "passed" as const,
    }));
    const harness = runtimeHarnessV2({ admitFrozenCandidate });
    harness.runtime.enqueue(initializeRequestV2(1));
    await harness.runtime.whenIdle();
    harness.runtime.enqueue(createStudioSimulationSaveExperimentRequestV2(2, {
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      experimentId: "experiment/main",
      surfaceSeriesId: STANDARD_TEST_SURFACE_SERIES_ID_V1,
      surface: surfaceV2(),
      expectedVersion: null,
      expectedInputEpoch: 0,
      expectedAcceptedRevision: 0,
      expectedAcceptedTimeSec: 0,
    }));
    await harness.runtime.whenIdle();
    expect(harness.port.messages.at(-1)).toMatchObject({
      requestId: 2,
      status: "ok",
      kind: "experiment-saved",
      experiment: {
        content: {
          surfaceSeriesId: STANDARD_TEST_SURFACE_SERIES_ID_V1,
        },
      },
    });
    harness.runtime.enqueue(createStudioSimulationCreateSnapshotRequestV2(3, {
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      scenarioIds: ["scenario/baseline"],
      surfaceSeriesId: STANDARD_TEST_SURFACE_SERIES_ID_V1,
      surfaceReleaseId: STANDARD_TEST_SURFACE_RELEASE_ID_V1,
      surface: surfaceV2(),
      snapshotSource: "saved-experiment",
      expectedInputEpoch: 0,
      expectedAcceptedRevision: 0,
      expectedAcceptedTimeSec: 0,
    }));
    await harness.runtime.whenIdle();

    const response = harness.port.messages.at(-1);
    expect(response).toMatchObject({
      requestId: 3,
      status: "ok",
      kind: "snapshot-created",
      snapshot: {
        snapshotId: "snapshot/worker-test/1",
        surfaceReleaseId: STANDARD_TEST_SURFACE_RELEASE_ID_V1,
        content: {
          surfaceSeriesId: STANDARD_TEST_SURFACE_SERIES_ID_V1,
          scenarios: [{
            capture: {
              checkpoint: {
                acceptedRevision: 0,
                acceptedTimeSec: 0,
              },
            },
          }],
        },
        createdAt: "2026-08-01T00:00:00.000Z",
      },
    });
    expect(admitFrozenCandidate).toHaveBeenCalledTimes(1);
    expect(response).not.toHaveProperty("experiment");
    expect(JSON.stringify(response)).not.toMatch(
      /admission|qualification|numericalHealth|certification|gateResult/,
    );
    expect(harness.runtime.state).toBe("active");
  });

  it("keeps gate rejection recoverable and rejects mismatched seed state", async () => {
    const harness = runtimeHarnessV2({
      admitFrozenCandidate: vi.fn(async () => ({
        status: "rejected" as const,
        reason: "candidate failed numerical verification",
      })),
    });
    harness.runtime.enqueue(initializeRequestV2(1));
    await harness.runtime.whenIdle();
    harness.runtime.enqueue(createStudioSimulationSaveExperimentRequestV2(2, {
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      experimentId: "experiment/main",
      surfaceSeriesId: STANDARD_TEST_SURFACE_SERIES_ID_V1,
      surface: surfaceV2(),
      expectedVersion: null,
      expectedInputEpoch: 0,
      expectedAcceptedRevision: 0,
      expectedAcceptedTimeSec: 0,
    }));
    await harness.runtime.whenIdle();
    harness.runtime.enqueue(createStudioSimulationCreateSnapshotRequestV2(3, {
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      scenarioIds: ["scenario/baseline"],
      surfaceSeriesId: STANDARD_TEST_SURFACE_SERIES_ID_V1,
      surfaceReleaseId: STANDARD_TEST_SURFACE_RELEASE_ID_V1,
      surface: surfaceV2(),
      snapshotSource: "saved-experiment",
      expectedInputEpoch: 0,
      expectedAcceptedRevision: 0,
      expectedAcceptedTimeSec: 0,
    }));
    await harness.runtime.whenIdle();
    expect(harness.port.messages.at(-1)).toMatchObject({
      requestId: 3,
      status: "error",
      fatal: false,
      message: expect.stringMatching(/failed numerical verification/),
    });
    expect(harness.runtime.state).toBe("active");

    const mismatched = runtimeHarnessV2();
    const seeded = experimentV2();
    mismatched.runtime.enqueue(createStudioSimulationInitializeRequestV2(1, {
      expectedModelId: "model/main-wire-v3-r1",
      releaseTicket: STANDARD_TEST_RELEASE_TICKET_V1,
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      scenarioLabel: "Baseline",
      fixture: { value: 2 },
      checkpoint: seeded.content.scenarios[0]!.capture.checkpoint,
      authoringSeed: { experiment: seeded },
    }));
    await mismatched.runtime.whenIdle();
    expect(mismatched.port.messages.at(-1)).toMatchObject({
      status: "error",
      fatal: true,
      message: expect.stringMatching(/fixture does not match/),
    });
    expect(mismatched.adapter.createSession).not.toHaveBeenCalled();
  });

  it("resumes a validated seeded experiment at its exact Experiment version", async () => {
    const harness = runtimeHarnessV2();
    const seeded = experimentV2(4);
    harness.runtime.enqueue(createStudioSimulationInitializeRequestV2(1, {
      expectedModelId: "model/main-wire-v3-r1",
      releaseTicket: STANDARD_TEST_RELEASE_TICKET_V1,
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      scenarioLabel: "Baseline",
      fixture: seeded.content.scenarios[0]!.capture.fixture,
      checkpoint: seeded.content.scenarios[0]!.capture.checkpoint,
      authoringSeed: { experiment: seeded },
    }));
    await harness.runtime.whenIdle();
    expect(harness.port.messages.at(-1)).toMatchObject({
      requestId: 1,
      status: "ok",
      kind: "initialized",
    });

    harness.runtime.enqueue(createStudioSimulationSaveExperimentRequestV2(2, {
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      experimentId: "experiment/main",
      surfaceSeriesId: STANDARD_TEST_SURFACE_SERIES_ID_V1,
      surface: surfaceV2("Resumed note"),
      expectedVersion: 4,
      expectedInputEpoch: 0,
      expectedAcceptedRevision: 0,
      expectedAcceptedTimeSec: 0,
    }));
    await harness.runtime.whenIdle();
    expect(harness.port.messages.at(-1)).toMatchObject({
      requestId: 2,
      status: "ok",
      kind: "experiment-saved",
      experiment: {
        experimentId: "experiment/main",
        version: 5,
        content: { surface: { note: { text: "Resumed note" } } },
      },
    });
  });

  it("computes an exact-clock analysis without changing the active frame", async () => {
    const requestAnalysis = vi.fn((input) => {
      input.onProgress?.(analysisV2({
        analysisId: input.analysisId,
        inputEpoch: input.expectedInputEpoch,
        sourceAcceptedRevision: input.expectedAcceptedRevision,
        sourceAcceptedTimeSec: input.expectedAcceptedTimeSec,
        payload: { curve: [{ pressure: 1, flow: 2 }] },
      }));
      return Promise.resolve(analysisV2({
        analysisId: input.analysisId,
        inputEpoch: input.expectedInputEpoch,
        sourceAcceptedRevision: input.expectedAcceptedRevision,
        sourceAcceptedTimeSec: input.expectedAcceptedTimeSec,
        payload: { curve: [{ pressure: 2, flow: 4 }] },
      }));
    });
    const harness = runtimeHarnessV2({ requestAnalysis });
    harness.runtime.enqueue(initializeRequestV2(1));
    await harness.runtime.whenIdle();
    const before = harness.adapter.currentFrame({
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
    });

    harness.runtime.enqueue(createStudioSimulationRequestAnalysisRequestV2(2, {
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      analysisId: "analysis/guyton-starling-v1",
      analysisPartition: "hypovolemic",
      expectedInputEpoch: 0,
      expectedAcceptedRevision: 0,
      expectedAcceptedTimeSec: 0,
    }));
    await harness.runtime.whenIdle();

    expect(requestAnalysis).toHaveBeenCalledTimes(1);
    expect(requestAnalysis).toHaveBeenCalledWith(expect.objectContaining({
      analysisId: "analysis/guyton-starling-v1",
      analysisPartition: "hypovolemic",
    }));
    expect(harness.port.messages.at(-2)).toMatchObject({
      requestId: 2,
      status: "ok",
      kind: "analysis-progress",
      analysis: { payload: { curve: [{ pressure: 1, flow: 2 }] } },
    });
    expect(harness.port.messages.at(-1)).toMatchObject({
      requestId: 2,
      status: "ok",
      kind: "analysis-result",
      analysis: {
        analysisId: "analysis/guyton-starling-v1",
        sourceAcceptedRevision: 0,
        sourceAcceptedTimeSec: 0,
      },
    });
    expect(harness.adapter.currentFrame({
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
    })).toEqual(before);
    expect(harness.runtime.state).toBe("active");
  });

  it.each([false, true])("can execute analysis outside the admitted exact adapter (shared: %s)", async shared => {
    const embeddedRequestAnalysis = vi.fn(() => Promise.reject(
      new Error("embedded analysis must not run"),
    ));
    const execute = vi.fn<AnalysisExecutorV1["execute"]>(
      async ({ source, request }) => {
        expect(source.acceptedFrame).toMatchObject({
          runtimeSessionId: request.runtimeSessionId,
          acceptedRevision: request.expectedAcceptedRevision,
          acceptedTimeSec: request.expectedAcceptedTimeSec,
          inputEpoch: request.expectedInputEpoch,
        });
        const capture = await source.capture!();
        expect(capture.scenario.checkpoint).toMatchObject({
          acceptedRevision: request.expectedAcceptedRevision, acceptedTimeSec: request.expectedAcceptedTimeSec,
        });
        expect(source.surfaceRelease).toBeDefined();
        if (shared) {
          expect(request.sharePreparation).toBe(true);
          request.onProgress?.(analysisV2({ analysisId: request.analysisId }), { sourceBinding: "test", endpoint: [1, 2] });
        }
        return analysisV2({
          analysisId: request.analysisId,
          inputEpoch: request.expectedInputEpoch,
          sourceAcceptedRevision: request.expectedAcceptedRevision,
          sourceAcceptedTimeSec: request.expectedAcceptedTimeSec,
          payload: { owner: "analysis-executor" },
        });
      },
    );
    const harness = runtimeHarnessV2({
      analysisExecutor: Object.freeze({ execute }),
      requestAnalysis: embeddedRequestAnalysis,
    });
    harness.runtime.enqueue(initializeRequestV2(1));
    await harness.runtime.whenIdle();

    harness.runtime.enqueue(createStudioSimulationRequestAnalysisRequestV2(2, {
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      analysisId: "analysis/external-v1",
      ...(shared ? { sharePreparation: true } : {}),
      expectedInputEpoch: 0,
      expectedAcceptedRevision: 0,
      expectedAcceptedTimeSec: 0,
    }));
    await harness.runtime.whenIdle();

    expect(execute).toHaveBeenCalledTimes(1);
    expect(embeddedRequestAnalysis).not.toHaveBeenCalled();
    if (shared) expect(harness.port.messages.at(-2)).toMatchObject({ kind: "analysis-progress",
      preparation: { sourceBinding: "test", endpoint: [1, 2] } });
    expect(harness.port.messages.at(-1)).toMatchObject({
      requestId: 2,
      status: "ok",
      kind: "analysis-result",
      analysis: {
        analysisId: "analysis/external-v1",
        payload: { owner: "analysis-executor" },
      },
    });
  });

  it("rejects stale and unknown analyses recoverably", async () => {
    const requestAnalysis = vi.fn(() => Promise.reject(
      new Error("analysis is not registered"),
    ));
    const harness = runtimeHarnessV2({ requestAnalysis });
    harness.runtime.enqueue(initializeRequestV2(1));
    await harness.runtime.whenIdle();

    harness.runtime.enqueue(createStudioSimulationRequestAnalysisRequestV2(2, {
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      analysisId: "analysis/stale",
      expectedInputEpoch: 0,
      expectedAcceptedRevision: 1,
      expectedAcceptedTimeSec: 0,
    }));
    await harness.runtime.whenIdle();
    expect(requestAnalysis).not.toHaveBeenCalled();
    expect(harness.port.messages.at(-1)).toMatchObject({
      requestId: 2,
      status: "error",
      fatal: false,
      message: expect.stringMatching(/stale expected clocks/),
    });

    harness.runtime.enqueue(createStudioSimulationRequestAnalysisRequestV2(3, {
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      analysisId: "analysis/unknown",
      expectedInputEpoch: 0,
      expectedAcceptedRevision: 0,
      expectedAcceptedTimeSec: 0,
    }));
    await harness.runtime.whenIdle();
    expect(harness.port.messages.at(-1)).toMatchObject({
      requestId: 3,
      status: "error",
      fatal: false,
      message: expect.stringMatching(/not registered/),
    });
    expect(harness.runtime.state).toBe("active");

    harness.runtime.enqueue(createStudioSimulationAdvanceRequestV2(4, {
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      stepCount: 1,
    }));
    await harness.runtime.whenIdle();
    expect(harness.port.messages.at(-1)).toMatchObject({
      requestId: 4,
      status: "ok",
      kind: "advanced",
    });
  });

  it("fails closed if analysis computation mutates the model frame", async () => {
    let current = frameV2();
    const harness = runtimeHarnessV2({
      currentFrame: vi.fn(() => current),
      requestAnalysis: vi.fn((input) => {
        current = frameV2({
          acceptedRevision: 1,
          acceptedTimeSec: 0.1,
        });
        return Promise.resolve(analysisV2({
          analysisId: input.analysisId,
        }));
      }),
    });
    harness.runtime.enqueue(initializeRequestV2(1));
    await harness.runtime.whenIdle();
    harness.runtime.enqueue(createStudioSimulationRequestAnalysisRequestV2(2, {
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      analysisId: "analysis/mutating",
      expectedInputEpoch: 0,
      expectedAcceptedRevision: 0,
      expectedAcceptedTimeSec: 0,
    }));
    await harness.runtime.whenIdle();

    expect(harness.port.messages.at(-1)).toMatchObject({
      requestId: 2,
      status: "error",
      fatal: true,
      message: expect.stringMatching(/read-only semantics/),
    });
    expect(harness.runtime.state).toBe("failed");
    expect(harness.port.close).toHaveBeenCalledTimes(1);
  });

  it("rejects a loaded adapter for another model before creating a session", async () => {
    const harness = runtimeHarnessV2();
    harness.runtime.enqueue(initializeRequestV2(
      1,
      "model/another-release",
    ));
    await harness.runtime.whenIdle();

    expect(harness.adapter.createSession).not.toHaveBeenCalled();
    expect(harness.adapter.disposeSession).not.toHaveBeenCalled();
    expect(harness.port.messages).toEqual([
      expect.objectContaining({
        requestId: 1,
        status: "error",
        message: expect.stringMatching(/modelId.*requested model/),
      }),
    ]);
    expect(harness.port.close).toHaveBeenCalledTimes(1);
    expect(harness.runtime.state).toBe("failed");
  });

  it("decodes before loading an adapter and consumes malformed request IDs", async () => {
    const harness = runtimeHarnessV2();
    const getter = vi.fn(() => ({ value: 1 }));
    const request = {
      ...initializeRequestV2(7),
    } as unknown as Record<string, unknown>;
    Object.defineProperty(request, "fixture", {
      enumerable: true,
      get: getter,
    });

    harness.runtime.enqueue(request);
    harness.runtime.enqueue(initializeRequestV2(6));
    await harness.runtime.whenIdle();

    expect(getter).not.toHaveBeenCalled();
    expect(harness.loadAdapter).not.toHaveBeenCalled();
    expect(harness.port.messages).toEqual([
      expect.objectContaining({ requestId: 7, status: "error" }),
      expect.objectContaining({
        requestId: 6,
        status: "error",
        message: expect.stringMatching(/increase strictly/),
      }),
    ]);
  });

  it("turns uninspectable messages into uncorrelated errors", async () => {
    const harness = runtimeHarnessV2();
    const revocable = Proxy.revocable({}, {});
    revocable.revoke();

    expect(() => harness.runtime.enqueue(revocable.proxy)).not.toThrow();
    await harness.runtime.whenIdle();

    expect(harness.loadAdapter).not.toHaveBeenCalled();
    expect(harness.port.messages).toEqual([
      expect.objectContaining({ requestId: 0, status: "error" }),
    ]);
  });

  it("bounds the active-plus-queued request count", async () => {
    const createGate = deferredV2<void>();
    const harness = runtimeHarnessV2({
      createSession: vi.fn(() => createGate.promise),
    });
    harness.runtime.enqueue(initializeRequestV2(1));
    harness.runtime.enqueue(createStudioSimulationAdvanceRequestV2(2, {
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      stepCount: 1,
    }));
    harness.runtime.enqueue(createStudioSimulationAdvanceRequestV2(3, {
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      stepCount: 1,
    }));

    expect(harness.port.messages).toContainEqual(expect.objectContaining({
      requestId: 3,
      status: "error",
      message: "simulation worker queue capacity exceeded",
    }));
    createGate.resolve();
    await harness.runtime.whenIdle();
    expect(harness.adapter.advanceOnePresentationStep).toHaveBeenCalledTimes(1);
  });

  it("makes queued disposal terminal and rejects later work", async () => {
    const advanceGate = deferredV2<StudioSimulationFrameV2>();
    const harness = runtimeHarnessV2({
      advanceOnePresentationStep: vi.fn(() => advanceGate.promise),
    });
    harness.runtime.enqueue(initializeRequestV2(1));
    await harness.runtime.whenIdle();
    harness.runtime.enqueue(createStudioSimulationAdvanceRequestV2(2, {
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      stepCount: 1,
    }));
    harness.runtime.enqueue(createStudioSimulationDisposeRequestV2(
      3,
      "runtime/session-1",
    ));
    harness.runtime.enqueue(createStudioSimulationAdvanceRequestV2(4, {
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      stepCount: 1,
    }));

    expect(harness.port.messages.at(-1)).toMatchObject({
      requestId: 4,
      status: "error",
      message: expect.stringMatching(/accepts no further requests/),
    });
    advanceGate.resolve(frameV2({ acceptedRevision: 1, acceptedTimeSec: 0.1 }));
    await harness.runtime.whenIdle();
    expect(harness.adapter.disposeSession).toHaveBeenCalledTimes(1);
    expect(harness.port.close).toHaveBeenCalledTimes(1);
    expect(harness.runtime.state).toBe("closed");
  });

  it("fails closed when disposal targets another session", async () => {
    const harness = runtimeHarnessV2();
    harness.runtime.enqueue(initializeRequestV2(1));
    await harness.runtime.whenIdle();

    harness.runtime.enqueue(createStudioSimulationDisposeRequestV2(
      2,
      "runtime/forged",
    ));
    await harness.runtime.whenIdle();

    expect(harness.port.messages.at(-1)).toMatchObject({
      requestId: 2,
      status: "error",
      message: expect.stringMatching(/identity mismatch/),
    });
    expect(harness.adapter.disposeSession).toHaveBeenCalledWith(
      "runtime/session-1",
    );
    expect(harness.port.close).toHaveBeenCalledTimes(1);
    expect(harness.runtime.state).toBe("failed");
  });

  it("cleans up a session whose initialization completes after termination", async () => {
    const createGate = deferredV2<void>();
    const createSession = vi.fn(() => createGate.promise);
    const harness = runtimeHarnessV2({ createSession });
    harness.runtime.enqueue(initializeRequestV2(1));
    await vi.waitFor(() => expect(createSession).toHaveBeenCalledTimes(1));

    harness.runtime.terminate();
    createGate.resolve();
    await harness.runtime.whenIdle();

    expect(harness.adapter.disposeSession).toHaveBeenCalledWith(
      "runtime/session-1",
    );
    expect(harness.port.close).toHaveBeenCalledTimes(1);
    expect(harness.port.messages).toEqual([]);
    expect(harness.runtime.state).toBe("closed");
  });

  it("disposes and closes after initialization or frame-validation failure", async () => {
    const createFailure = runtimeHarnessV2({
      createSession: vi.fn(() => Promise.reject(new Error("create failed"))),
    });
    createFailure.runtime.enqueue(initializeRequestV2(1));
    await createFailure.runtime.whenIdle();
    expect(createFailure.adapter.disposeSession).toHaveBeenCalledWith(
      "runtime/session-1",
    );
    expect(createFailure.port.close).toHaveBeenCalledTimes(1);
    expect(createFailure.runtime.state).toBe("failed");

    const invalidFrame = runtimeHarnessV2({
      currentFrame: vi.fn(() => frameV2({
        runtimeSessionId: "runtime/forged",
      })),
    });
    invalidFrame.runtime.enqueue(initializeRequestV2(1));
    await invalidFrame.runtime.whenIdle();
    expect(invalidFrame.adapter.disposeSession).toHaveBeenCalledTimes(1);
    expect(invalidFrame.port.close).toHaveBeenCalledTimes(1);
    expect(invalidFrame.runtime.state).toBe("failed");
  });
});

describe("Studio simulation worker V2 multi-Scenario authoring", () => {
  it("allocates fresh Scenario plans for each atomic exact-session rebuild", async () => {
    const descriptor = validateAndOwnExecutionPlanDescriptorV1(
      generatedExecutionPlanV1,
    );
    const bind = vi.fn(() => bindExecutionPlanV1(
      descriptor,
      mainWireExecutionPlanKernelCatalogV1(),
    ));
    const createPlanSession = vi.fn<
      RegisteredModelExecutionPlanAdapterV1["createSession"]
    >(async () => {});
    const harness = multiScenarioRuntimeHarnessV2({
      executionPlan: executionPlanAdapterV1(
        bind,
        createPlanSession,
      ),
    });

    harness.runtime.enqueue(initializeRequestV2(1));
    await harness.runtime.whenIdle();
    const baselinePlan = createPlanSession.mock.calls[0]![0]
      .boundExecutionPlans.get("scenario/baseline")!;

    harness.runtime.enqueue(createStudioSimulationDuplicateScenarioRequestV2(2, {
      runtimeSessionId: "runtime/session-1",
      sourceScenarioId: "scenario/baseline",
      scenarioId: "scenario/copy",
      label: "Copy",
      expectedActiveScenarioId: "scenario/baseline",
      expectedInputEpoch: 0,
      expectedAcceptedRevision: 0,
      expectedAcceptedTimeSec: 0,
    }));
    await harness.runtime.whenIdle();

    expect(bind).toHaveBeenCalledTimes(3);
    const baselinePlans = createPlanSession.mock.calls
      .map(([input]) => input.boundExecutionPlans.get("scenario/baseline"))
      .filter((plan) => plan !== undefined);
    const copyPlans = createPlanSession.mock.calls
      .map(([input]) => input.boundExecutionPlans.get("scenario/copy"))
      .filter((plan) => plan !== undefined);
    expect(baselinePlans).toHaveLength(2);
    expect(baselinePlans[0]).toBe(baselinePlan);
    expect(baselinePlans[1]).not.toBe(baselinePlan);
    expect(copyPlans).toHaveLength(1);
    const copyPlan = copyPlans[0]!;
    expect(copyPlan).not.toBe(baselinePlan);
    expect(copyPlan).not.toBe(baselinePlans[1]);

    harness.runtime.enqueue(createStudioSimulationDeleteScenarioRequestV2(3, {
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      expectedActiveScenarioId: "scenario/copy",
      expectedInputEpoch: 0,
      expectedAcceptedRevision: 0,
      expectedAcceptedTimeSec: 0,
    }));
    await harness.runtime.whenIdle();

    expect(bind).toHaveBeenCalledTimes(4);
    const finalCopyPlans = createPlanSession.mock.calls
      .map(([input]) => input.boundExecutionPlans.get("scenario/copy"))
      .filter((plan) => plan !== undefined);
    expect(finalCopyPlans).toHaveLength(2);
    expect(finalCopyPlans[0]).toBe(copyPlan);
    expect(finalCopyPlans[1]).not.toBe(copyPlan);
    expect(harness.port.messages.at(-1)).toMatchObject({
      status: "ok",
      kind: "scenario-state",
      state: {
        activeScenarioId: "scenario/copy",
        scenarios: [{ scenarioId: "scenario/copy", label: "Copy" }],
      },
    });
  });

  it("restores every seeded branch while activating only the requested Scenario", async () => {
    const harness = multiScenarioRuntimeHarnessV2();
    const baseline = experimentV2();
    const seeded: ExperimentV2 = {
      ...baseline,
      content: {
        ...baseline.content,
        scenarios: [
          baseline.content.scenarios[0]!,
          {
            scenarioId: "scenario/comparison",
            label: "Comparison",
            capture: {
              fixture: { value: 2 },
              checkpoint: {
                acceptedRevision: 4,
                acceptedTimeSec: 0.4,
                payload: { state: [4] },
              },
            },
          },
        ],
      },
    };
    harness.runtime.enqueue(createStudioSimulationInitializeRequestV2(1, {
      expectedModelId: "model/main-wire-v3-r1",
      releaseTicket: STANDARD_TEST_RELEASE_TICKET_V1,
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/comparison",
      scenarioLabel: "Comparison",
      fixture: seeded.content.scenarios[1]!.capture.fixture,
      checkpoint: seeded.content.scenarios[1]!.capture.checkpoint,
      authoringSeed: { experiment: seeded },
    }));
    await harness.runtime.whenIdle();
    expect(harness.port.messages.at(-1)).toMatchObject({
      status: "ok",
      kind: "initialized",
      frame: {
        scenarioId: "scenario/comparison",
        acceptedRevision: 4,
        acceptedTimeSec: 0.4,
      },
    });
    expect(harness.adapter.createSession).toHaveBeenCalledWith({
      runtimeSessionId: "runtime/session-1",
      scenarios: [
        expect.objectContaining({ scenarioId: "scenario/baseline" }),
        expect.objectContaining({ scenarioId: "scenario/comparison" }),
      ],
    });
  });

  it("owns exact branches across preset, duplicate, select, delete, and Save", async () => {
    const harness = multiScenarioRuntimeHarnessV2();
    harness.runtime.enqueue(initializeRequestV2(1));
    await harness.runtime.whenIdle();

    harness.runtime.enqueue(createStudioSimulationReadScenariosRequestV2(2, {
      runtimeSessionId: "runtime/session-1",
      expectedActiveScenarioId: "scenario/baseline",
      expectedInputEpoch: 0,
      expectedAcceptedRevision: 0,
      expectedAcceptedTimeSec: 0,
    }));
    await harness.runtime.whenIdle();
    const captured = validateStudioSimulationWorkerResponseV2(
      harness.port.messages.at(-1),
    );
    expect(captured).toMatchObject({
      status: "ok",
      kind: "scenarios-captured",
      captures: { activeScenarioId: "scenario/baseline" },
    });
    if (captured.status !== "ok" || captured.kind !== "scenarios-captured") {
      throw new Error("expected exact Scenario captures");
    }
    const baselineCapture = captured.captures.scenarios[0]!.capture;

    harness.runtime.enqueue(createStudioSimulationAddScenarioFromPresetRequestV2(
      3,
      {
        runtimeSessionId: "runtime/session-1",
        scenarioId: "scenario/from-preset",
        label: "Preset Scenario",
        preset: {
          schemaId: STUDIO_SCENARIO_PRESET_V2_SCHEMA_ID,
          presetId: "preset/baseline",
          modelId: "model/main-wire-v3-r1",
          title: "Baseline",
          description: "Exact baseline capture",
          capture: baselineCapture,
        },
        expectedActiveScenarioId: "scenario/baseline",
        expectedInputEpoch: 0,
        expectedAcceptedRevision: 0,
        expectedAcceptedTimeSec: 0,
      },
    ));
    await harness.runtime.whenIdle();
    expect(harness.port.messages.at(-1)).toMatchObject({
      status: "ok",
      kind: "scenario-state",
      state: {
        activeScenarioId: "scenario/from-preset",
        scenarios: [
          { scenarioId: "scenario/baseline", label: "Baseline" },
          { scenarioId: "scenario/from-preset", label: "Preset Scenario" },
        ],
      },
    });

    harness.runtime.enqueue(createStudioSimulationRenameScenarioRequestV2(4, {
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/from-preset",
      label: "Renamed preset",
    }));
    await harness.runtime.whenIdle();
    const createSession = vi.mocked(harness.adapter.createSession);
    const createCountAfterRename = createSession.mock.calls.length;

    harness.runtime.enqueue(createStudioSimulationDuplicateScenarioRequestV2(5, {
      runtimeSessionId: "runtime/session-1",
      sourceScenarioId: "scenario/from-preset",
      scenarioId: "scenario/copy",
      label: "Preset copy",
      expectedActiveScenarioId: "scenario/from-preset",
      expectedInputEpoch: 0,
      expectedAcceptedRevision: 0,
      expectedAcceptedTimeSec: 0,
    }));
    await harness.runtime.whenIdle();
    expect(harness.port.messages.at(-1)).toMatchObject({
      state: { activeScenarioId: "scenario/copy" },
    });
    expect(createCountAfterRename).toBe(2);
    expect(createSession).toHaveBeenCalledTimes(3);

    harness.runtime.enqueue(createStudioSimulationSelectScenarioRequestV2(6, {
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      expectedActiveScenarioId: "scenario/copy",
      expectedInputEpoch: 0,
      expectedAcceptedRevision: 0,
      expectedAcceptedTimeSec: 0,
    }));
    await harness.runtime.whenIdle();
    expect(harness.port.messages.at(-1)).toMatchObject({
      state: { activeScenarioId: "scenario/baseline" },
    });

    harness.runtime.enqueue(createStudioSimulationDeleteScenarioRequestV2(7, {
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      expectedActiveScenarioId: "scenario/baseline",
      expectedInputEpoch: 0,
      expectedAcceptedRevision: 0,
      expectedAcceptedTimeSec: 0,
    }));
    await harness.runtime.whenIdle();
    expect(harness.port.messages.at(-1)).toMatchObject({
      state: {
        activeScenarioId: "scenario/from-preset",
        scenarios: [
          { scenarioId: "scenario/from-preset", label: "Renamed preset" },
          { scenarioId: "scenario/copy", label: "Preset copy" },
        ],
      },
    });

    harness.runtime.enqueue(createStudioSimulationSaveExperimentRequestV2(8, {
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/from-preset",
      scenarioIds: ["scenario/from-preset", "scenario/copy"],
      experimentId: "experiment/multi",
      surfaceSeriesId: STANDARD_TEST_SURFACE_SERIES_ID_V1,
      surface: { ...surfaceV2(), controlPanes: [] },
      expectedVersion: null,
      expectedInputEpoch: 0,
      expectedAcceptedRevision: 0,
      expectedAcceptedTimeSec: 0,
    }));
    await harness.runtime.whenIdle();
    expect(harness.port.messages.at(-1)).toMatchObject({
      status: "ok",
      kind: "experiment-saved",
      experiment: {
        experimentId: "experiment/multi",
        content: {
          scenarios: [
            { scenarioId: "scenario/from-preset", label: "Renamed preset" },
            { scenarioId: "scenario/copy", label: "Preset copy" },
          ],
        },
      },
    });
  });

  it("duplicates an inactive source atomically and preserves the active branch on failure", async () => {
    const harness = multiScenarioRuntimeHarnessV2();
    harness.runtime.enqueue(initializeRequestV2(1));
    await harness.runtime.whenIdle();

    harness.runtime.enqueue(createStudioSimulationAddScenarioFromPresetRequestV2(
      2,
      {
        runtimeSessionId: "runtime/session-1",
        scenarioId: "scenario/comparison",
        label: "Comparison",
        preset: {
          schemaId: STUDIO_SCENARIO_PRESET_V2_SCHEMA_ID,
          presetId: "preset/comparison",
          modelId: "model/main-wire-v3-r1",
          title: "Comparison",
          description: "Distinct exact source",
          capture: {
            fixture: { value: 9 },
            checkpoint: {
              acceptedRevision: 4,
              acceptedTimeSec: 0.4,
              payload: { state: [4] },
            },
          },
        },
        expectedActiveScenarioId: "scenario/baseline",
        expectedInputEpoch: 0,
        expectedAcceptedRevision: 0,
        expectedAcceptedTimeSec: 0,
      },
    ));
    await harness.runtime.whenIdle();

    harness.runtime.enqueue(createStudioSimulationSelectScenarioRequestV2(3, {
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      expectedActiveScenarioId: "scenario/comparison",
      expectedInputEpoch: 0,
      expectedAcceptedRevision: 4,
      expectedAcceptedTimeSec: 0.4,
    }));
    await harness.runtime.whenIdle();

    harness.runtime.enqueue(createStudioSimulationDuplicateScenarioRequestV2(4, {
      runtimeSessionId: "runtime/session-1",
      sourceScenarioId: "scenario/comparison",
      scenarioId: "scenario/comparison-copy",
      label: "Comparison copy",
      expectedActiveScenarioId: "scenario/baseline",
      expectedInputEpoch: 0,
      expectedAcceptedRevision: 0,
      expectedAcceptedTimeSec: 0,
    }));
    await harness.runtime.whenIdle();
    expect(harness.port.messages.at(-1)).toMatchObject({
      status: "ok",
      kind: "scenario-state",
      state: { activeScenarioId: "scenario/comparison-copy" },
    });
    const createSession = vi.mocked(harness.adapter.createSession);
    expect(createSession.mock.calls.at(-1)?.[0].scenarios).toContainEqual({
      scenarioId: "scenario/comparison-copy",
      fixture: { value: 9 },
      checkpoint: {
        acceptedRevision: 4,
        acceptedTimeSec: 0.4,
        payload: { state: [4] },
      },
    });

    harness.runtime.enqueue(createStudioSimulationSelectScenarioRequestV2(5, {
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      expectedActiveScenarioId: "scenario/comparison-copy",
      expectedInputEpoch: 0,
      expectedAcceptedRevision: 4,
      expectedAcceptedTimeSec: 0.4,
    }));
    await harness.runtime.whenIdle();
    createSession.mockRejectedValueOnce(new Error("replacement rejected"));
    harness.runtime.enqueue(createStudioSimulationDuplicateScenarioRequestV2(6, {
      runtimeSessionId: "runtime/session-1",
      sourceScenarioId: "scenario/comparison",
      scenarioId: "scenario/rejected-copy",
      label: "Rejected copy",
      expectedActiveScenarioId: "scenario/baseline",
      expectedInputEpoch: 0,
      expectedAcceptedRevision: 0,
      expectedAcceptedTimeSec: 0,
    }));
    await harness.runtime.whenIdle();
    expect(harness.port.messages.at(-1)).toMatchObject({
      status: "error",
      fatal: false,
      message: expect.stringMatching(/replacement rejected/),
    });
    expect(harness.adapter.disposeSession).toHaveBeenCalledTimes(2);

    harness.runtime.enqueue(createStudioSimulationAdvanceRequestV2(7, {
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      stepCount: 1,
    }));
    await harness.runtime.whenIdle();
    expect(harness.port.messages.at(-1)).toMatchObject({
      status: "ok",
      kind: "advanced",
      frames: [{ scenarioId: "scenario/baseline" }],
    });
  });

  it("adds and duplicates beyond four Scenarios while keeping each independent", async () => {
    const harness = multiScenarioRuntimeHarnessV2();
    harness.runtime.enqueue(initializeRequestV2(1));
    await harness.runtime.whenIdle();

    let activeScenarioId = "scenario/baseline";
    for (let index = 1; index < 4; index += 1) {
      const scenarioId = `scenario/copy-${index}`;
      harness.runtime.enqueue(createStudioSimulationDuplicateScenarioRequestV2(
        index + 1,
        {
          runtimeSessionId: "runtime/session-1",
          sourceScenarioId: "scenario/baseline",
          scenarioId,
          label: `Copy ${index}`,
          expectedActiveScenarioId: activeScenarioId,
          expectedInputEpoch: 0,
          expectedAcceptedRevision: 0,
          expectedAcceptedTimeSec: 0,
        },
      ));
      await harness.runtime.whenIdle();
      expect(harness.port.messages.at(-1)).toMatchObject({
        status: "ok",
        kind: "scenario-state",
        state: { activeScenarioId: scenarioId },
      });
      activeScenarioId = scenarioId;
    }

    harness.runtime.enqueue(createStudioSimulationDuplicateScenarioRequestV2(5, {
      runtimeSessionId: "runtime/session-1",
      sourceScenarioId: "scenario/baseline",
      scenarioId: "scenario/fifth-copy",
      label: "Fifth copy",
      expectedActiveScenarioId: activeScenarioId,
      expectedInputEpoch: 0,
      expectedAcceptedRevision: 0,
      expectedAcceptedTimeSec: 0,
    }));
    await harness.runtime.whenIdle();
    expect(harness.port.messages.at(-1)).toMatchObject({
      status: "ok",
      kind: "scenario-state",
      state: { activeScenarioId: "scenario/fifth-copy" },
    });
    activeScenarioId = "scenario/fifth-copy";

    harness.runtime.enqueue(createStudioSimulationAddScenarioFromPresetRequestV2(
      6,
      {
        runtimeSessionId: "runtime/session-1",
        scenarioId: "scenario/sixth-preset",
        label: "Sixth preset",
        preset: {
          schemaId: STUDIO_SCENARIO_PRESET_V2_SCHEMA_ID,
          presetId: "preset/additional",
          modelId: "model/main-wire-v3-r1",
          title: "Additional preset",
          description: "Independent additional scenario",
          capture: {
            fixture: { value: 2 },
            checkpoint: {
              acceptedRevision: 0,
              acceptedTimeSec: 0,
              payload: { state: [0] },
            },
          },
        },
        expectedActiveScenarioId: activeScenarioId,
        expectedInputEpoch: 0,
        expectedAcceptedRevision: 0,
        expectedAcceptedTimeSec: 0,
      },
    ));
    await harness.runtime.whenIdle();
    expect(harness.port.messages.at(-1)).toMatchObject({
      status: "ok",
      kind: "scenario-state",
      state: { activeScenarioId: "scenario/sixth-preset" },
    });
    activeScenarioId = "scenario/sixth-preset";
    expect(harness.adapter.createSession).toHaveBeenCalledTimes(6);

    harness.runtime.enqueue(createStudioSimulationAdvanceRequestV2(7, {
      runtimeSessionId: "runtime/session-1",
      scenarioId: activeScenarioId,
      stepCount: 1,
    }));
    await harness.runtime.whenIdle();
    expect(harness.port.messages.at(-1)).toMatchObject({
      status: "ok",
      kind: "advanced",
      frames: [{ scenarioId: activeScenarioId }],
    });
  });

  it("starts a duplicate at the source boundary and keeps fixture and checkpoint evolution independent", async () => {
    const harness = multiScenarioRuntimeHarnessV2();
    harness.runtime.enqueue(initializeRequestV2(1));
    await harness.runtime.whenIdle();

    harness.runtime.enqueue(createStudioSimulationAdvanceRequestV2(2, {
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      stepCount: 2,
    }));
    await harness.runtime.whenIdle();
    expect(harness.port.messages.at(-1)).toMatchObject({
      status: "ok",
      kind: "advanced",
      frames: [
        { acceptedRevision: 1, acceptedTimeSec: 0.1 },
        { acceptedRevision: 2, acceptedTimeSec: 0.2 },
      ],
    });

    harness.runtime.enqueue(createStudioSimulationDuplicateScenarioRequestV2(3, {
      runtimeSessionId: "runtime/session-1",
      sourceScenarioId: "scenario/baseline",
      scenarioId: "scenario/baseline-copy",
      label: "Baseline copy",
      expectedActiveScenarioId: "scenario/baseline",
      expectedInputEpoch: 0,
      expectedAcceptedRevision: 2,
      expectedAcceptedTimeSec: 0.2,
    }));
    await harness.runtime.whenIdle();
    expect(harness.port.messages.at(-1)).toMatchObject({
      status: "ok",
      kind: "scenario-state",
      state: {
        activeScenarioId: "scenario/baseline-copy",
        frame: {
          scenarioId: "scenario/baseline-copy",
          acceptedRevision: 2,
          acceptedTimeSec: 0.2,
        },
      },
    });
    expect(vi.mocked(harness.adapter.createSession).mock.calls.at(-1)?.[0]
      .scenarios).toEqual([
        {
          scenarioId: "scenario/baseline",
          fixture: { value: 1 },
          checkpoint: {
            acceptedRevision: 2,
            acceptedTimeSec: 0.2,
            payload: { state: [2] },
          },
        },
        {
          scenarioId: "scenario/baseline-copy",
          fixture: { value: 1 },
          checkpoint: {
            acceptedRevision: 2,
            acceptedTimeSec: 0.2,
            payload: { state: [2] },
          },
        },
      ]);

    harness.runtime.enqueue(createStudioSimulationAdvanceRequestV2(4, {
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline-copy",
      stepCount: 1,
    }));
    await harness.runtime.whenIdle();
    expect(harness.port.messages.at(-1)).toMatchObject({
      status: "ok",
      kind: "advanced",
      frames: [{
        scenarioId: "scenario/baseline-copy",
        acceptedRevision: 3,
        acceptedTimeSec: 0.30000000000000004,
      }],
    });

    harness.runtime.enqueue(createStudioSimulationSelectScenarioRequestV2(5, {
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      expectedActiveScenarioId: "scenario/baseline-copy",
      expectedInputEpoch: 0,
      expectedAcceptedRevision: 3,
      expectedAcceptedTimeSec: 0.30000000000000004,
    }));
    await harness.runtime.whenIdle();
    expect(harness.port.messages.at(-1)).toMatchObject({
      status: "ok",
      kind: "scenario-state",
      state: {
        activeScenarioId: "scenario/baseline",
        frame: {
          scenarioId: "scenario/baseline",
          inputEpoch: 0,
          acceptedRevision: 2,
          acceptedTimeSec: 0.2,
        },
      },
    });

    harness.runtime.enqueue(createStudioSimulationSelectScenarioRequestV2(6, {
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline-copy",
      expectedActiveScenarioId: "scenario/baseline",
      expectedInputEpoch: 0,
      expectedAcceptedRevision: 2,
      expectedAcceptedTimeSec: 0.2,
    }));
    await harness.runtime.whenIdle();
    harness.runtime.enqueue(createStudioSimulationApplyControlRequestV2(7, {
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline-copy",
      controlId: "control/heart-rate",
      value: 72,
      expectedInputEpoch: 0,
    }));
    await harness.runtime.whenIdle();
    expect(harness.port.messages.at(-1)).toMatchObject({
      status: "ok",
      kind: "control-applied",
      frame: {
        scenarioId: "scenario/baseline-copy",
        inputEpoch: 1,
        acceptedRevision: 0,
        acceptedTimeSec: 0,
      },
    });

    harness.runtime.enqueue(createStudioSimulationSelectScenarioRequestV2(8, {
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      expectedActiveScenarioId: "scenario/baseline-copy",
      expectedInputEpoch: 1,
      expectedAcceptedRevision: 0,
      expectedAcceptedTimeSec: 0,
    }));
    await harness.runtime.whenIdle();
    harness.runtime.enqueue(createStudioSimulationReadScenariosRequestV2(9, {
      runtimeSessionId: "runtime/session-1",
      expectedActiveScenarioId: "scenario/baseline",
      expectedInputEpoch: 0,
      expectedAcceptedRevision: 2,
      expectedAcceptedTimeSec: 0.2,
    }));
    await harness.runtime.whenIdle();
    expect(harness.port.messages.at(-1)).toMatchObject({
      status: "ok",
      kind: "scenarios-captured",
      captures: {
        activeScenarioId: "scenario/baseline",
        scenarios: [
          {
            scenarioId: "scenario/baseline",
            capture: {
              fixture: { value: 1 },
              checkpoint: {
                acceptedRevision: 2,
                acceptedTimeSec: 0.2,
                payload: { state: [2] },
              },
            },
          },
          {
            scenarioId: "scenario/baseline-copy",
            capture: {
              fixture: { value: 72 },
              checkpoint: {
                acceptedRevision: 0,
                acceptedTimeSec: 0,
                payload: { state: [0] },
              },
            },
          },
        ],
      },
    });
  });

  it("rejects an invalid Preset atomically before rebuilding branches", async () => {
    const harness = multiScenarioRuntimeHarnessV2();
    harness.runtime.enqueue(initializeRequestV2(1));
    await harness.runtime.whenIdle();
    harness.runtime.enqueue(createStudioSimulationAddScenarioFromPresetRequestV2(
      2,
      {
        runtimeSessionId: "runtime/session-1",
        scenarioId: "scenario/rejected",
        label: "Rejected",
        preset: {
          schemaId: STUDIO_SCENARIO_PRESET_V2_SCHEMA_ID,
          presetId: "preset/wrong-model",
          modelId: "model/wrong",
          title: "Wrong",
          description: "",
          capture: {
            fixture: { value: 1 },
            checkpoint: {
              acceptedRevision: 0,
              acceptedTimeSec: 0,
              payload: { state: [0] },
            },
          },
        },
        expectedActiveScenarioId: "scenario/baseline",
        expectedInputEpoch: 0,
        expectedAcceptedRevision: 0,
        expectedAcceptedTimeSec: 0,
      },
    ));
    await harness.runtime.whenIdle();
    expect(harness.port.messages.at(-1)).toMatchObject({
      status: "error",
      fatal: false,
    });
    expect(harness.adapter.createSession).toHaveBeenCalledTimes(1);
    expect(harness.adapter.disposeSession).not.toHaveBeenCalled();
  });

  it("keeps the prior exact branch active when a replacement session fails", async () => {
    const createSession = vi.fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("replacement rejected"));
    const harness = runtimeHarnessV2({ createSession });
    harness.runtime.enqueue(initializeRequestV2(1));
    await harness.runtime.whenIdle();
    harness.runtime.enqueue(createStudioSimulationAddScenarioFromPresetRequestV2(
      2,
      {
        runtimeSessionId: "runtime/session-1",
        scenarioId: "scenario/rejected",
        label: "Rejected",
        preset: {
          schemaId: STUDIO_SCENARIO_PRESET_V2_SCHEMA_ID,
          presetId: "preset/rejected-rebuild",
          modelId: "model/main-wire-v3-r1",
          title: "Rejected rebuild",
          description: "",
          capture: experimentV2().content.scenarios[0]!.capture,
        },
        expectedActiveScenarioId: "scenario/baseline",
        expectedInputEpoch: 0,
        expectedAcceptedRevision: 0,
        expectedAcceptedTimeSec: 0,
      },
    ));
    await harness.runtime.whenIdle();
    expect(harness.port.messages.at(-1)).toMatchObject({
      status: "error",
      fatal: false,
      message: expect.stringMatching(/replacement rejected/),
    });
    expect(harness.adapter.disposeSession).not.toHaveBeenCalled();
    harness.runtime.enqueue(createStudioSimulationAdvanceRequestV2(3, {
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      stepCount: 1,
    }));
    await harness.runtime.whenIdle();
    expect(harness.port.messages.at(-1)).toMatchObject({
      status: "ok",
      kind: "advanced",
      frames: [{ scenarioId: "scenario/baseline" }],
    });
  });
});

describe("Studio simulation worker V2 client", () => {
  it("validates prepared analysis without opening a numerical session", async () => {
    const loadExactRuntime = vi.fn();
    const prepared = { analysis: analysisV2({ modelId: STANDARD_TEST_RELEASE_TICKET_V1.modelId }), recordSha256: "a".repeat(64), captureSha256: "b".repeat(64), preparationSourceSha256: "c".repeat(64) };
    const validatePreparedAnalysis = vi.fn(async () => prepared);
    const postMessage = vi.fn();
    const runtime = new StudioSimulationWorkerRuntimeV2({ loadExactRuntime, validatePreparedAnalysis, port: { postMessage, close: vi.fn() } });
    runtime.enqueue({ protocol: STUDIO_SIMULATION_WORKER_PROTOCOL_V2, requestId: 1, kind: "validate-prepared-analysis",
      record: { sealed: true }, releaseTicket: STANDARD_TEST_RELEASE_TICKET_V1, capture: experimentV2().content.scenarios[0]!.capture });
    await runtime.whenIdle();
    expect(loadExactRuntime).not.toHaveBeenCalled();
    expect(validatePreparedAnalysis).toHaveBeenCalledOnce();
    expect(postMessage.mock.calls[0]?.[0]).toMatchObject({ requestId: 1, status: "ok", kind: "prepared-analysis-validated", prepared });
    runtime.terminate();
  });

  it.each([
    {}, { modelId: "wrong-model" }, { inputEpoch: 1 }, { sourceAcceptedRevision: 1 }, { sourceAcceptedTimeSec: 1 },
  ])("correlates the validated preparation with its sealed source %j", async (override) => {
    const transport = new FakeWorkerTransportV2();
    const client = createStudioSimulationWorkerClientForTestV2({ transport });
    const result = client.validatePreparedAnalysis({ record: {}, releaseTicket: STANDARD_TEST_RELEASE_TICKET_V1,
      capture: experimentV2().content.scenarios[0]!.capture });
    transport.emitMessage({ protocol: STUDIO_SIMULATION_WORKER_PROTOCOL_V2, requestId: 1, status: "ok", kind: "prepared-analysis-validated",
      prepared: { analysis: analysisV2({ modelId: STANDARD_TEST_RELEASE_TICKET_V1.modelId, ...override }), recordSha256: "a".repeat(64), captureSha256: "b".repeat(64), preparationSourceSha256: "c".repeat(64) } });
    if (Object.keys(override).length) await expect(result).rejects.toThrow(/source mismatch/);
    else await expect(result).resolves.toMatchObject({ analysis: analysisV2({ modelId: STANDARD_TEST_RELEASE_TICKET_V1.modelId }) });
    client.terminate();
  });

  it("constructs the production client with its own real Worker boundary", () => {
    const transport = new FakeWorkerTransportV2();
    const workerConstructor = vi.fn(function WorkerTestDouble(
      _url: URL,
      _options: WorkerOptions,
    ) {
      return transport;
    });
    vi.stubGlobal("Worker", workerConstructor);

    const client = new StudioSimulationWorkerClientV2();
    expect(workerConstructor).toHaveBeenCalledTimes(1);
    expect(workerConstructor.mock.calls[0]?.[1]).toMatchObject({
      type: "module",
      name: "circleheart-studio-v2-simulation",
    });
    client.terminate();
    expect(transport.terminate).toHaveBeenCalledTimes(1);
  });

  it("rejects transport injection without the module-private test authority", () => {
    const transport = new FakeWorkerTransportV2();
    const ForgedConstructor = StudioSimulationWorkerClientV2 as unknown as new (
      options: object,
      construction: object,
    ) => StudioSimulationWorkerClientV2;

    expect(() => new ForgedConstructor({}, {
      authority: Symbol("forged"),
      transport,
    })).toThrow(/test construction authority is invalid/);
    expect(transport.messages).toEqual([]);
  });

  it("correlates Scenario management to the active accepted boundary", async () => {
    const transport = new FakeWorkerTransportV2();
    const client = createStudioSimulationWorkerClientForTestV2({ transport });
    const initialized = client.initialize({
      expectedModelId: "model/main-wire-v3-r1",
      releaseTicket: STANDARD_TEST_RELEASE_TICKET_V1,
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      scenarioLabel: "Baseline",
      fixture: { value: 1 },
    });
    transport.emitMessage(initializedResponseV2(1));
    await initialized;

    const captures = client.readScenarios({
      runtimeSessionId: "runtime/session-1",
    });
    expect(transport.messages.at(-1)).toMatchObject({
      kind: "read-scenarios",
      expectedActiveScenarioId: "scenario/baseline",
      expectedInputEpoch: 0,
      expectedAcceptedRevision: 0,
      expectedAcceptedTimeSec: 0,
    });
    transport.emitMessage({
      protocol: STUDIO_SIMULATION_WORKER_PROTOCOL_V2,
      requestId: 2,
      status: "ok",
      kind: "scenarios-captured",
      captures: {
        activeScenarioId: "scenario/baseline",
        scenarios: experimentV2().content.scenarios,
      },
    });
    await expect(captures).resolves.toMatchObject({
      activeScenarioId: "scenario/baseline",
    });

    const selected = client.addScenarioFromPreset({
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/copy",
      label: "Copy",
      preset: {
        schemaId: STUDIO_SCENARIO_PRESET_V2_SCHEMA_ID,
        presetId: "preset/baseline",
        modelId: "model/main-wire-v3-r1",
        title: "Baseline",
        description: "",
        capture: experimentV2().content.scenarios[0]!.capture,
      },
    });
    transport.emitMessage({
      protocol: STUDIO_SIMULATION_WORKER_PROTOCOL_V2,
      requestId: 3,
      status: "ok",
      kind: "scenario-state",
      state: {
        activeScenarioId: "scenario/copy",
        scenarios: [
          { scenarioId: "scenario/baseline", label: "Baseline" },
          { scenarioId: "scenario/copy", label: "Copy" },
        ],
        frame: frameV2({ scenarioId: "scenario/copy" }),
      },
    });
    await expect(selected).resolves.toMatchObject({
      activeScenarioId: "scenario/copy",
    });
    const advanced = client.advance({
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/copy",
      stepCount: 1,
    });
    transport.emitMessage(advancedResponseV2(4, [frameV2({
      scenarioId: "scenario/copy",
      acceptedRevision: 1,
      acceptedTimeSec: 0.1,
    })]));
    await expect(advanced).resolves.toHaveLength(1);
  });

  it("posts one inactive-source duplicate command and retains active identity on rejection", async () => {
    const transport = new FakeWorkerTransportV2();
    const client = createStudioSimulationWorkerClientForTestV2({ transport });
    const initialized = client.initialize({
      expectedModelId: "model/main-wire-v3-r1",
      releaseTicket: STANDARD_TEST_RELEASE_TICKET_V1,
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      scenarioLabel: "Baseline",
      fixture: { value: 1 },
    });
    transport.emitMessage(initializedResponseV2(1));
    await initialized;

    const added = client.addScenarioFromPreset({
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/comparison",
      label: "Comparison",
      preset: {
        schemaId: STUDIO_SCENARIO_PRESET_V2_SCHEMA_ID,
        presetId: "preset/comparison",
        modelId: "model/main-wire-v3-r1",
        title: "Comparison",
        description: "",
        capture: experimentV2().content.scenarios[0]!.capture,
      },
    });
    transport.emitMessage({
      protocol: STUDIO_SIMULATION_WORKER_PROTOCOL_V2,
      requestId: 2,
      status: "ok",
      kind: "scenario-state",
      state: {
        activeScenarioId: "scenario/comparison",
        scenarios: [
          { scenarioId: "scenario/baseline", label: "Baseline" },
          { scenarioId: "scenario/comparison", label: "Comparison" },
        ],
        frame: frameV2({ scenarioId: "scenario/comparison" }),
      },
    });
    await added;

    const selected = client.selectScenario({
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
    });
    transport.emitMessage({
      protocol: STUDIO_SIMULATION_WORKER_PROTOCOL_V2,
      requestId: 3,
      status: "ok",
      kind: "scenario-state",
      state: {
        activeScenarioId: "scenario/baseline",
        scenarios: [
          { scenarioId: "scenario/baseline", label: "Baseline" },
          { scenarioId: "scenario/comparison", label: "Comparison" },
        ],
        frame: frameV2(),
      },
    });
    await selected;

    const beforeDuplicateMessageCount = transport.messages.length;
    const duplicated = client.duplicateScenario({
      runtimeSessionId: "runtime/session-1",
      sourceScenarioId: "scenario/comparison",
      scenarioId: "scenario/comparison-copy",
      label: "Comparison copy",
    });
    expect(transport.messages).toHaveLength(beforeDuplicateMessageCount + 1);
    expect(transport.messages.at(-1)).toMatchObject({
      kind: "duplicate-scenario",
      sourceScenarioId: "scenario/comparison",
      scenarioId: "scenario/comparison-copy",
      expectedActiveScenarioId: "scenario/baseline",
    });
    transport.emitMessage({
      protocol: STUDIO_SIMULATION_WORKER_PROTOCOL_V2,
      requestId: 4,
      status: "error",
      fatal: false,
      message: "replacement rejected",
    });
    await expect(duplicated).rejects.toThrow(/replacement rejected/);

    const advanced = client.advance({
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      stepCount: 1,
    });
    transport.emitMessage(advancedResponseV2(5, [frameV2({
      acceptedRevision: 1,
      acceptedTimeSec: 0.1,
    })]));
    await expect(advanced).resolves.toHaveLength(1);
    expect(transport.terminate).not.toHaveBeenCalled();
  });

  it("validates input and response identity while returning detached frames", async () => {
    const transport = new FakeWorkerTransportV2();
    const client = createStudioSimulationWorkerClientForTestV2({ transport });
    const fixture = { value: 1 };
    const initialized = client.initialize({
      expectedModelId: "model/main-wire-v3-r1",
      releaseTicket: STANDARD_TEST_RELEASE_TICKET_V1,
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      scenarioLabel: "Baseline",
      fixture,
    });
    fixture.value = 2;
    expect(transport.messages[0]).toMatchObject({
      expectedModelId: "model/main-wire-v3-r1",
      fixture: { value: 1 },
    });
    transport.emitMessage(initializedResponseV2(1));
    await expect(initialized).resolves.toMatchObject({
      runtimeSessionId: "runtime/session-1",
    });

    const advanced = client.advance({
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      stepCount: 1,
    });
    transport.emitMessage(advancedResponseV2(2, [frameV2({
      acceptedRevision: 1,
      acceptedTimeSec: 0.1,
    })]));
    await expect(advanced).resolves.toHaveLength(1);
  });

  it("materializes compact presentation rows and preserves the terminal frame", async () => {
    const transport = new FakeWorkerTransportV2();
    const client = createStudioSimulationWorkerClientForTestV2({ transport });
    const initialized = client.initialize({
      expectedModelId: "model/main-wire-v3-r1",
      releaseTicket: STANDARD_TEST_RELEASE_TICKET_V1,
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      scenarioLabel: "Baseline",
      fixture: { value: 1 },
    });
    transport.emitMessage(initializedResponseV2(1));
    await initialized;

    const advanced = client.advancePresentation({
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      stepCount: 2,
      presentationOutputIds: ["pressure.lv"],
    });
    expect(transport.messages.at(-1)).toMatchObject({
      kind: "advance-presentation",
      presentationOutputIds: ["pressure.lv"],
    });
    const terminalFrame = frameV2({
      acceptedRevision: 2,
      acceptedTimeSec: 0.004,
      outputs: {
        "pressure.lv": outputV2("pressure.lv", 92),
        "latest-only": outputV2("latest-only", 7),
      },
    });
    transport.emitMessage({
      protocol: STUDIO_SIMULATION_WORKER_PROTOCOL_V2,
      requestId: 2,
      status: "ok",
      kind: "presentation-advanced",
      batch: createStudioSimulationPresentationBatchV2([
        frameV2({
          acceptedRevision: 1,
          acceptedTimeSec: 0.002,
          outputs: { "pressure.lv": outputV2("pressure.lv", 91) },
        }),
        terminalFrame,
      ], ["pressure.lv"], {
        workerAdvanceMs: 17.5,
        workerPrepareMs: 0.75,
      }),
    });
    const frames = await advanced;
    expect(frames).toHaveLength(2);
    expect(frames[0]).toMatchObject({
      acceptedRevision: 1,
      outputs: { "pressure.lv": { value: 91 } },
    });
    expect(frames[0]?.outputs["latest-only"]).toBeUndefined();
    expect(frames[1]).toBe(terminalFrame);
    expect(frames[1]?.outputs["latest-only"]?.value).toBe(7);
    expect(client.presentationTiming()).toEqual({
      workerAdvanceMs: 17.5,
      workerPrepareMs: 0.75,
    });
  });

  it.each([{}, { inputEpoch: 1 }, { scenarioId: "wrong" }, { runtimeSessionId: "wrong" },
    { analysisId: "analysis/unrequested" }, { sourceAcceptedRevision: 3 }, { sourceAcceptedTimeSec: .006 }])(
    "correlates beat summaries separately from exact frames: %j", async override => {
      const transport = new FakeWorkerTransportV2();
      const client = createStudioSimulationWorkerClientForTestV2({ transport });
      const initialized = client.initialize({ expectedModelId: "model/main-wire-v3-r1", releaseTicket: STANDARD_TEST_RELEASE_TICKET_V1,
        runtimeSessionId: "runtime/session-1", scenarioId: "scenario/baseline", scenarioLabel: "Baseline", fixture: { value: 1 } });
      transport.emitMessage(initializedResponseV2(1)); await initialized;
      const input = { runtimeSessionId: "runtime/session-1", scenarioId: "scenario/baseline", stepCount: 2,
        presentationOutputIds: [], presentationAnalysisIds: ["analysis/beat"] };
      const advanced = client.advancePresentation(input);
      const expected = Object.keys(override).length === 0 ? expect(advanced).resolves.toHaveLength(2) : expect(advanced).rejects.toThrow();
      const analysis = analysisV2({ analysisId: "analysis/beat", sourceAcceptedRevision: 2, sourceAcceptedTimeSec: .004, ...override });
      const respond = (requestId: number, revision: number, analyses?: StudioSimulationAnalysisV2[]) => transport.emitMessage({
        protocol: STUDIO_SIMULATION_WORKER_PROTOCOL_V2, requestId, status: "ok", kind: "presentation-advanced",
        batch: createStudioSimulationPresentationBatchV2([frameV2({ acceptedRevision: revision - 1, acceptedTimeSec: (revision - 1) * .002 }),
          frameV2({ acceptedRevision: revision, acceptedTimeSec: revision * .002 })], []), ...(analyses ? { analyses } : {}),
      });
      respond(2, 2, [analysis]); await expected;
      if (Object.keys(override).length === 0) {
        expect(client.presentationAnalyses()).toEqual([analysis]);
        const again = client.advancePresentation(input); respond(3, 4); await again;
        expect(client.presentationAnalyses()).toEqual([analysis]);
        const deselect = client.advancePresentation({ ...input, presentationAnalysisIds: [] }); respond(4, 6); await deselect;
        expect(client.presentationAnalyses()).toEqual([]);
      } else expect(client.presentationAnalyses()).toEqual([]);
      client.terminate();
      expect(client.presentationAnalyses()).toEqual([]);
    });

  it("applies a semantic control and advances the client epoch exactly once", async () => {
    const transport = new FakeWorkerTransportV2();
    const client = createStudioSimulationWorkerClientForTestV2({ transport });
    const initialized = client.initialize({
      expectedModelId: "model/main-wire-v3-r1",
      releaseTicket: STANDARD_TEST_RELEASE_TICKET_V1,
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      scenarioLabel: "Baseline",
      fixture: { value: 1 },
    });
    transport.emitMessage(initializedResponseV2(1));
    await initialized;

    const beforeControl = client.advance({
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      stepCount: 1,
    });
    transport.emitMessage(advancedResponseV2(2, [frameV2({
      acceptedRevision: 4,
      acceptedTimeSec: 0.4,
    })]));
    await beforeControl;

    const applied = client.applyControl({
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      controlId: "control/heart-rate",
      value: 72,
      expectedInputEpoch: 0,
    });
    expect(transport.messages.at(-1)).toMatchObject({
      requestId: 3,
      kind: "apply-control",
      controlId: "control/heart-rate",
      value: 72,
      expectedInputEpoch: 0,
    });
    transport.emitMessage(controlAppliedResponseV2(
      3,
      frameV2({
        inputEpoch: 1,
        acceptedRevision: 0,
        acceptedTimeSec: 0,
      }),
    ));
    await expect(applied).resolves.toMatchObject({ frame: { inputEpoch: 1 }, fixture: { value: 72 } });

    const advanced = client.advance({
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      stepCount: 1,
    });
    transport.emitMessage(advancedResponseV2(4, [frameV2({
      inputEpoch: 1,
      acceptedRevision: 1,
      acceptedTimeSec: 0.1,
    })]));
    await expect(advanced).resolves.toHaveLength(1);
  });

  it("keeps the client active and its epoch unchanged after control rejection", async () => {
    const transport = new FakeWorkerTransportV2();
    const client = createStudioSimulationWorkerClientForTestV2({ transport });
    const initialized = client.initialize({
      expectedModelId: "model/main-wire-v3-r1",
      releaseTicket: STANDARD_TEST_RELEASE_TICKET_V1,
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      scenarioLabel: "Baseline",
      fixture: { value: 1 },
    });
    transport.emitMessage(initializedResponseV2(1));
    await initialized;

    const rejected = client.applyControl({
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      controlId: "control/heart-rate",
      value: 500,
      expectedInputEpoch: 0,
    });
    transport.emitMessage({
      protocol: STUDIO_SIMULATION_WORKER_PROTOCOL_V2,
      requestId: 2,
      status: "error",
      fatal: false,
      message: "control value rejected",
    });
    await expect(rejected).rejects.toThrow(/control value rejected/);
    expect(transport.terminate).not.toHaveBeenCalled();

    const retried = client.applyControl({
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      controlId: "control/heart-rate",
      value: 72,
      expectedInputEpoch: 0,
    });
    transport.emitMessage(controlAppliedResponseV2(
      3,
      frameV2({ inputEpoch: 1 }),
    ));
    await expect(retried).resolves.toMatchObject({ frame: { inputEpoch: 1 }, fixture: { value: 72 } });
    expect(transport.terminate).not.toHaveBeenCalled();
  });

  it("requests an exact-clock analysis as a recoverable single operation", async () => {
    const transport = new FakeWorkerTransportV2();
    const client = createStudioSimulationWorkerClientForTestV2({ transport });
    const initialized = client.initialize({
      expectedModelId: "model/main-wire-v3-r1",
      releaseTicket: STANDARD_TEST_RELEASE_TICKET_V1,
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      scenarioLabel: "Baseline",
      fixture: { value: 1 },
    });
    transport.emitMessage(initializedResponseV2(1));
    await initialized;
    const advanced = client.advance({
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      stepCount: 1,
    });
    transport.emitMessage(advancedResponseV2(2, [frameV2({
      acceptedRevision: 4,
      acceptedTimeSec: 0.4,
    })]));
    await advanced;

    const onProgress = vi.fn();
    const requested = client.requestAnalysis({
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      analysisId: "analysis/guyton-starling-v1",
      analysisPartition: "hypervolemic",
      expectedInputEpoch: 0,
      expectedAcceptedRevision: 4,
      expectedAcceptedTimeSec: 0.4,
      onProgress,
    });
    expect(transport.messages.at(-1)).toMatchObject({
      requestId: 3,
      kind: "request-analysis",
      analysisId: "analysis/guyton-starling-v1",
      analysisPartition: "hypervolemic",
      expectedInputEpoch: 0,
      expectedAcceptedRevision: 4,
      expectedAcceptedTimeSec: 0.4,
    });
    await expect(client.advance({
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      stepCount: 1,
    })).rejects.toThrow(/operation in flight/);
    transport.emitMessage(analysisProgressResponseV2(3, analysisV2({
      sourceAcceptedRevision: 4,
      sourceAcceptedTimeSec: 0.4,
      payload: { points: [1] },
    })));
    expect(onProgress).toHaveBeenCalledWith(expect.objectContaining({
      payload: { points: [1] },
    }));
    transport.emitMessage({ ...analysisProgressResponseV2(3, analysisV2({
      sourceAcceptedRevision: 4, sourceAcceptedTimeSec: .4, payload: { points: [1] },
    })), preparation: { sourceBinding: "prepared-source" } });
    expect(onProgress).toHaveBeenLastCalledWith(expect.objectContaining({ payload: { points: [1] } }),
      { sourceBinding: "prepared-source" });
    await expect(client.advance({
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      stepCount: 1,
    })).rejects.toThrow(/operation in flight/);
    transport.emitMessage(analysisResultResponseV2(3, analysisV2({
      sourceAcceptedRevision: 4,
      sourceAcceptedTimeSec: 0.4,
    })));
    await expect(requested).resolves.toMatchObject({
      analysisId: "analysis/guyton-starling-v1",
      sourceAcceptedRevision: 4,
      sourceAcceptedTimeSec: 0.4,
    });

    await expect(client.requestAnalysis({
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      analysisId: "analysis/guyton-starling-v1",
      expectedInputEpoch: 0,
      expectedAcceptedRevision: 3,
      expectedAcceptedTimeSec: 0.4,
    })).rejects.toThrow(/clocks are stale/);
    expect(transport.messages).toHaveLength(3);

    const unknown = client.requestAnalysis({
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      analysisId: "analysis/unknown",
      expectedInputEpoch: 0,
      expectedAcceptedRevision: 4,
      expectedAcceptedTimeSec: 0.4,
    });
    transport.emitMessage({
      protocol: STUDIO_SIMULATION_WORKER_PROTOCOL_V2,
      requestId: 5,
      status: "error",
      fatal: false,
      message: "analysis is not registered",
    });
    await expect(unknown).rejects.toThrow(/not registered/);
    expect(transport.terminate).not.toHaveBeenCalled();
  });

  it("treats validated analysis progress as activity for the idle timeout", async () => {
    vi.useFakeTimers();
    const transport = new FakeWorkerTransportV2();
    const client = createStudioSimulationWorkerClientForTestV2({
      transport,
      responseTimeoutMs: 10,
      analysisIdleTimeoutMs: 10,
    });
    const initialized = client.initialize({
      expectedModelId: "model/main-wire-v3-r1",
      releaseTicket: STANDARD_TEST_RELEASE_TICKET_V1,
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      scenarioLabel: "Baseline",
      fixture: { value: 1 },
    });
    transport.emitMessage(initializedResponseV2(1));
    await initialized;

    const requested = client.requestAnalysis({
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      analysisId: "analysis/guyton-starling-v1",
      expectedInputEpoch: 0,
      expectedAcceptedRevision: 0,
      expectedAcceptedTimeSec: 0,
    });

    await vi.advanceTimersByTimeAsync(9);
    transport.emitMessage(analysisProgressResponseV2(2, analysisV2({
      payload: { completedPointCount: 1 },
    })));
    await vi.advanceTimersByTimeAsync(9);
    transport.emitMessage(analysisProgressResponseV2(2, analysisV2({
      payload: { completedPointCount: 2 },
    })));
    await vi.advanceTimersByTimeAsync(9);
    expect(transport.terminate).not.toHaveBeenCalled();

    transport.emitMessage(analysisResultResponseV2(2, analysisV2()));
    await expect(requested).resolves.toMatchObject({
      analysisId: "analysis/guyton-starling-v1",
    });
    expect(transport.terminate).not.toHaveBeenCalled();
  });

  it("saves a Experiment, rejects stale versions locally, and accepts Snapshot lineage", async () => {
    const transport = new FakeWorkerTransportV2();
    const client = createStudioSimulationWorkerClientForTestV2({ transport });
    const initialized = client.initialize({
      expectedModelId: "model/main-wire-v3-r1",
      releaseTicket: STANDARD_TEST_RELEASE_TICKET_V1,
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      scenarioLabel: "Baseline",
      fixture: { value: 1 },
    });
    transport.emitMessage(initializedResponseV2(1));
    await initialized;

    const savedPromise = client.saveExperiment({
      surfaceSeriesId: STANDARD_TEST_SURFACE_SERIES_ID_V1,
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      experimentId: "experiment/main",
      surface: surfaceV2(),
      expectedVersion: null,
    });
    expect(transport.messages.at(-1)).toMatchObject({
      requestId: 2,
      kind: "save-experiment",
      expectedVersion: null,
    });
    const savedExperiment = experimentV2(0);
    transport.emitMessage({
      protocol: STUDIO_SIMULATION_WORKER_PROTOCOL_V2,
      requestId: 2,
      status: "ok",
      kind: "experiment-saved",
      experiment: savedExperiment,
    });
    await expect(savedPromise).resolves.toEqual(savedExperiment);

    await expect(client.saveExperiment({
      surfaceSeriesId: STANDARD_TEST_SURFACE_SERIES_ID_V1,
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      experimentId: "experiment/main",
      surface: surfaceV2(),
      expectedVersion: 7,
    })).rejects.toThrow(/version is stale/);
    expect(transport.messages).toHaveLength(2);
    expect(transport.terminate).not.toHaveBeenCalled();

    const snapshotPromise = client.createSnapshot({
      surfaceSeriesId: STANDARD_TEST_SURFACE_SERIES_ID_V1,
      surfaceReleaseId: STANDARD_TEST_SURFACE_RELEASE_ID_V1,
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      surface: surfaceV2(),
      snapshotSource: "saved-experiment",
    });
    const admittedContent = replaceCheckpointV2(
      savedExperiment.content,
      10,
      1,
    );
    const snapshot = {
      schemaId: STUDIO_EXPERIMENT_SNAPSHOT_V2_SCHEMA_ID,
      snapshotId: "snapshot/client-test/1",
      surfaceReleaseId: STANDARD_TEST_SURFACE_RELEASE_ID_V1,
      content: admittedContent,
      createdAt: "2026-08-01T00:00:00.000Z",
    };
    transport.emitMessage({
      protocol: STUDIO_SIMULATION_WORKER_PROTOCOL_V2,
      requestId: 4,
      status: "ok",
      kind: "snapshot-created",
      snapshot,
    });
    await expect(snapshotPromise).resolves.toEqual({
      snapshot,
    });
    expect(transport.terminate).not.toHaveBeenCalled();
  });

  it("keeps the client active after a recoverable authoring rejection", async () => {
    const transport = new FakeWorkerTransportV2();
    const client = createStudioSimulationWorkerClientForTestV2({ transport });
    const initialized = client.initialize({
      expectedModelId: "model/main-wire-v3-r1",
      releaseTicket: STANDARD_TEST_RELEASE_TICKET_V1,
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      scenarioLabel: "Baseline",
      fixture: { value: 1 },
    });
    transport.emitMessage(initializedResponseV2(1));
    await initialized;

    const rejected = client.saveExperiment({
      surfaceSeriesId: STANDARD_TEST_SURFACE_SERIES_ID_V1,
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      experimentId: "experiment/main",
      surface: surfaceV2(),
      expectedVersion: null,
    });
    transport.emitMessage({
      protocol: STUDIO_SIMULATION_WORKER_PROTOCOL_V2,
      requestId: 2,
      status: "error",
      fatal: false,
      message: "Experiment version conflict",
    });
    await expect(rejected).rejects.toThrow(/version conflict/);
    expect(transport.terminate).not.toHaveBeenCalled();

    const advanced = client.advance({
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      stepCount: 1,
    });
    transport.emitMessage(advancedResponseV2(3, [frameV2({
      acceptedRevision: 1,
      acceptedTimeSec: 0.1,
    })]));
    await expect(advanced).resolves.toHaveLength(1);
  });

  it("permits only one advance or control operation in flight", async () => {
    const transport = new FakeWorkerTransportV2();
    const client = createStudioSimulationWorkerClientForTestV2({ transport });
    const initialized = client.initialize({
      expectedModelId: "model/main-wire-v3-r1",
      releaseTicket: STANDARD_TEST_RELEASE_TICKET_V1,
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      scenarioLabel: "Baseline",
      fixture: { value: 1 },
    });
    transport.emitMessage(initializedResponseV2(1));
    await initialized;

    const applied = client.applyControl({
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      controlId: "control/heart-rate",
      value: 72,
      expectedInputEpoch: 0,
    });
    await expect(client.advance({
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      stepCount: 1,
    })).rejects.toThrow(/operation in flight/);
    expect(transport.messages).toHaveLength(2);
    transport.emitMessage(controlAppliedResponseV2(
      2,
      frameV2({ inputEpoch: 1 }),
    ));
    await applied;
  });

  it("rejects a stale client epoch before posting a control", async () => {
    const transport = new FakeWorkerTransportV2();
    const client = createStudioSimulationWorkerClientForTestV2({ transport });
    const initialized = client.initialize({
      expectedModelId: "model/main-wire-v3-r1",
      releaseTicket: STANDARD_TEST_RELEASE_TICKET_V1,
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      scenarioLabel: "Baseline",
      fixture: { value: 1 },
    });
    transport.emitMessage(initializedResponseV2(1));
    await initialized;

    await expect(client.applyControl({
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      controlId: "control/heart-rate",
      value: 72,
      expectedInputEpoch: 1,
    })).rejects.toThrow(/input epoch is stale/);
    expect(transport.messages).toHaveLength(1);
    expect(transport.terminate).not.toHaveBeenCalled();
  });

  it("rejects input accessors without invoking or posting them", async () => {
    const transport = new FakeWorkerTransportV2();
    const client = createStudioSimulationWorkerClientForTestV2({ transport });
    const getter = vi.fn(() => "runtime/session-1");
    const input: Record<string, unknown> = {
      expectedModelId: "model/main-wire-v3-r1",
      scenarioId: "scenario/baseline",
      scenarioLabel: "Baseline",
      fixture: { value: 1 },
    };
    Object.defineProperty(input, "runtimeSessionId", {
      enumerable: true,
      get: getter,
    });

    await expect(client.initialize(input as any)).rejects
      .toThrow(/enumerable data property/);
    expect(getter).not.toHaveBeenCalled();
    expect(transport.messages).toEqual([]);
  });

  it("terminates on malformed, unknown, or cross-session responses", async () => {
    for (const response of [
      { ...initializedResponseV2(9) },
      initializedResponseV2(1, { runtimeSessionId: "runtime/forged" }),
      initializedResponseV2(1, { modelId: "model/forged" }),
    ]) {
      const transport = new FakeWorkerTransportV2();
    const client = createStudioSimulationWorkerClientForTestV2({ transport });
      const initialized = client.initialize({
        expectedModelId: "model/main-wire-v3-r1",
      releaseTicket: STANDARD_TEST_RELEASE_TICKET_V1,
        runtimeSessionId: "runtime/session-1",
        scenarioId: "scenario/baseline",
        scenarioLabel: "Baseline",
        fixture: { value: 1 },
      });
      transport.emitMessage(response);
      await expect(initialized).rejects.toThrow(/pending request|identity mismatch/);
      expect(transport.terminate).toHaveBeenCalledTimes(1);
    }

    const transport = new FakeWorkerTransportV2();
    const client = createStudioSimulationWorkerClientForTestV2({ transport });
    const initialized = client.initialize({
      expectedModelId: "model/main-wire-v3-r1",
      releaseTicket: STANDARD_TEST_RELEASE_TICKET_V1,
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      scenarioLabel: "Baseline",
      fixture: { value: 1 },
    });
    const getter = vi.fn(() => frameV2());
    const malformed: Record<string, unknown> = {
      protocol: STUDIO_SIMULATION_WORKER_PROTOCOL_V2,
      requestId: 1,
      status: "ok",
      kind: "initialized",
    };
    Object.defineProperty(malformed, "frame", {
      enumerable: true,
      get: getter,
    });
    transport.emitMessage(malformed);
    await expect(initialized).rejects.toThrow(/enumerable data property/);
    expect(getter).not.toHaveBeenCalled();
    expect(transport.terminate).toHaveBeenCalledTimes(1);
  });

  it("makes timeout terminal for every pending request", async () => {
    vi.useFakeTimers();
    const transport = new FakeWorkerTransportV2();
    const client = createStudioSimulationWorkerClientForTestV2({
      transport,
      responseTimeoutMs: 10,
    });
    const initialized = client.initialize({
      expectedModelId: "model/main-wire-v3-r1",
      releaseTicket: STANDARD_TEST_RELEASE_TICKET_V1,
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      scenarioLabel: "Baseline",
      fixture: { value: 1 },
    });
    const assertion = expect(initialized).rejects.toThrow(/timed out/);
    await vi.advanceTimersByTimeAsync(10);
    await assertion;
    expect(transport.terminate).toHaveBeenCalledTimes(1);
    await expect(client.advance({
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      stepCount: 1,
    })).rejects.toThrow(/not active/);
  });

  it("uses a separate finite deadline for Snapshot qualification", async () => {
    vi.useFakeTimers();
    const transport = new FakeWorkerTransportV2();
    const client = createStudioSimulationWorkerClientForTestV2({
      transport,
      responseTimeoutMs: 10,
      snapshotAdmissionTimeoutMs: 40,
    });
    const initialized = client.initialize({
      expectedModelId: "model/main-wire-v3-r1",
      releaseTicket: STANDARD_TEST_RELEASE_TICKET_V1,
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      scenarioLabel: "Baseline",
      fixture: { value: 1 },
    });
    transport.emitMessage(initializedResponseV2(1));
    await initialized;

    const saved = client.saveExperiment({
      surfaceSeriesId: STANDARD_TEST_SURFACE_SERIES_ID_V1,
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      experimentId: "experiment/main",
      surface: surfaceV2(),
      expectedVersion: null,
    });
    const experiment = experimentV2(0);
    transport.emitMessage({
      protocol: STUDIO_SIMULATION_WORKER_PROTOCOL_V2,
      requestId: 2,
      status: "ok",
      kind: "experiment-saved",
      experiment,
    });
    await saved;

    const snapshot = client.createSnapshot({
      surfaceSeriesId: STANDARD_TEST_SURFACE_SERIES_ID_V1,
      surfaceReleaseId: STANDARD_TEST_SURFACE_RELEASE_ID_V1,
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      surface: surfaceV2(),
      snapshotSource: "saved-experiment",
    });
    const assertion = expect(snapshot).rejects.toThrow(/timed out/);
    await vi.advanceTimersByTimeAsync(10);
    expect(transport.terminate).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(29);
    expect(transport.terminate).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    await assertion;
    expect(transport.terminate).toHaveBeenCalledTimes(1);
  });

  it("shares one dispose operation and terminates exactly once", async () => {
    const transport = new FakeWorkerTransportV2();
    const client = createStudioSimulationWorkerClientForTestV2({ transport });
    const initialized = client.initialize({
      expectedModelId: "model/main-wire-v3-r1",
      releaseTicket: STANDARD_TEST_RELEASE_TICKET_V1,
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      scenarioLabel: "Baseline",
      fixture: { value: 1 },
    });
    transport.emitMessage(initializedResponseV2(1));
    await initialized;

    const first = client.dispose("runtime/session-1");
    const second = client.dispose("runtime/session-1");
    expect(second).toBe(first);
    expect(transport.messages).toHaveLength(2);
    transport.emitMessage({
      protocol: STUDIO_SIMULATION_WORKER_PROTOCOL_V2,
      requestId: 2,
      status: "ok",
      kind: "disposed",
    });
    await expect(Promise.all([first, second])).resolves.toEqual([
      undefined,
      undefined,
    ]);
    expect(transport.terminate).toHaveBeenCalledTimes(1);
    client.terminate();
    expect(transport.terminate).toHaveBeenCalledTimes(1);
  });
});

describe("Studio simulation worker V2 client/runtime terminal integration", () => {
  it("terminates immediately after a fatal apply-control atomicity violation", async () => {
    let inputEpoch = 0;
    let currentFrame = frameV2();
    const adapter = runtimeHarnessV2({
      currentInputEpoch: vi.fn(() => inputEpoch),
      currentFrame: vi.fn(() => currentFrame),
      applyControl: vi.fn(() => {
        inputEpoch = 1;
        currentFrame = frameV2({ inputEpoch });
        return Promise.reject(new Error("rejected after mutation"));
      }),
    }).adapter;
    const transport = new RuntimeBackedWorkerTransportV2(adapter);
    const client = createStudioSimulationWorkerClientForTestV2({ transport });
    const initialized = client.initialize({
      expectedModelId: adapter.modelId,
      releaseTicket: STANDARD_TEST_RELEASE_TICKET_V1,
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      scenarioLabel: "Baseline",
      fixture: { value: 1 },
    });
    await transport.whenIdle();
    await initialized;

    const failed = client.applyControl({
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      controlId: "control/heart-rate",
      value: 72,
      expectedInputEpoch: 0,
    });
    const failedAssertion = expect(failed).rejects.toThrow(
      /violated atomicity/,
    );
    await transport.whenIdle();
    await failedAssertion;
    expect(transport.responses.at(-1)).toMatchObject({
      status: "error",
      fatal: true,
    });
    expect(transport.terminate).toHaveBeenCalledTimes(1);
    await expect(client.advance({
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      stepCount: 1,
    })).rejects.toThrow(/not active/);
    expect(transport.messages).toHaveLength(2);
  });

  it("terminates immediately after a fatal request-analysis mutation", async () => {
    let currentFrame = frameV2();
    const adapter = runtimeHarnessV2({
      currentFrame: vi.fn(() => currentFrame),
      requestAnalysis: vi.fn((input) => {
        currentFrame = frameV2({
          acceptedRevision: 1,
          acceptedTimeSec: 0.1,
        });
        return Promise.resolve(analysisV2({
          analysisId: input.analysisId,
        }));
      }),
    }).adapter;
    const transport = new RuntimeBackedWorkerTransportV2(adapter);
    const client = createStudioSimulationWorkerClientForTestV2({ transport });
    const initialized = client.initialize({
      expectedModelId: adapter.modelId,
      releaseTicket: STANDARD_TEST_RELEASE_TICKET_V1,
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      scenarioLabel: "Baseline",
      fixture: { value: 1 },
    });
    await transport.whenIdle();
    await initialized;

    const failed = client.requestAnalysis({
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      analysisId: "analysis/mutating",
      expectedInputEpoch: 0,
      expectedAcceptedRevision: 0,
      expectedAcceptedTimeSec: 0,
    });
    const failedAssertion = expect(failed).rejects.toThrow(
      /read-only semantics/,
    );
    await transport.whenIdle();
    await failedAssertion;
    expect(transport.responses.at(-1)).toMatchObject({
      status: "error",
      fatal: true,
    });
    expect(transport.terminate).toHaveBeenCalledTimes(1);
    await expect(client.requestAnalysis({
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      analysisId: "analysis/another",
      expectedInputEpoch: 0,
      expectedAcceptedRevision: 0,
      expectedAcceptedTimeSec: 0,
    })).rejects.toThrow(/not active/);
    expect(transport.messages).toHaveLength(2);
  });

  it("keeps an unknown analysis rejection recoverable end to end", async () => {
    const adapter = runtimeHarnessV2({
      requestAnalysis: vi.fn(() => Promise.reject(
        new Error("analysis is not registered"),
      )),
    }).adapter;
    const transport = new RuntimeBackedWorkerTransportV2(adapter);
    const client = createStudioSimulationWorkerClientForTestV2({ transport });
    const initialized = client.initialize({
      expectedModelId: adapter.modelId,
      releaseTicket: STANDARD_TEST_RELEASE_TICKET_V1,
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      scenarioLabel: "Baseline",
      fixture: { value: 1 },
    });
    await transport.whenIdle();
    await initialized;

    const rejected = client.requestAnalysis({
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      analysisId: "analysis/unknown",
      expectedInputEpoch: 0,
      expectedAcceptedRevision: 0,
      expectedAcceptedTimeSec: 0,
    });
    const rejectedAssertion = expect(rejected).rejects.toThrow(
      /not registered/,
    );
    await transport.whenIdle();
    await rejectedAssertion;
    expect(transport.responses.at(-1)).toMatchObject({
      status: "error",
      fatal: false,
    });
    expect(transport.terminate).not.toHaveBeenCalled();

    const advanced = client.advance({
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      stepCount: 1,
    });
    await transport.whenIdle();
    await expect(advanced).resolves.toMatchObject([
      { acceptedRevision: 1, acceptedTimeSec: 0.1 },
    ]);
    expect(transport.terminate).not.toHaveBeenCalled();
  });

  it("retains a recoverable apply-control classification and exact authority", async () => {
    const adapter = runtimeHarnessV2({
      applyControl: vi.fn(() => Promise.reject(
        new Error("candidate preflight rejected"),
      )),
    }).adapter;
    const transport = new RuntimeBackedWorkerTransportV2(adapter);
    const client = createStudioSimulationWorkerClientForTestV2({ transport });
    const initialized = client.initialize({
      expectedModelId: adapter.modelId,
      releaseTicket: STANDARD_TEST_RELEASE_TICKET_V1,
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      scenarioLabel: "Baseline",
      fixture: { value: 1 },
    });
    await transport.whenIdle();
    await initialized;

    const rejected = client.applyControl({
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      controlId: "control/heart-rate",
      value: 72,
      expectedInputEpoch: 0,
    });
    await transport.whenIdle();
    const error = await rejected.catch((reason: unknown) => reason);
    expect(error).toBeInstanceOf(StudioSimulationWorkerRequestErrorV2);
    expect(error).toMatchObject({
      fatal: false,
      message: expect.stringMatching(/candidate preflight rejected/),
    });
    expect(transport.terminate).not.toHaveBeenCalled();

    const advanced = client.advance({
      runtimeSessionId: "runtime/session-1",
      scenarioId: "scenario/baseline",
      stepCount: 1,
    });
    await transport.whenIdle();
    await expect(advanced).resolves.toMatchObject([
      { acceptedRevision: 1, acceptedTimeSec: 0.1, inputEpoch: 0 },
    ]);
  });
});

function surfaceV2(note = "Saved note"): ExperimentSurfaceV2 {
  return {
    graphPanes: [{
      paneId: "pane/pressure",
      role: "graph",
      label: "Pressure",
      order: 0,
      priority: 0,
      graphId: "graph/pressure",
      scenarioScope: { mode: "visible-scenarios" },
      excludedTraces: [],
      windowSec: 2,
      series: [{
        seriesId: "series/pressure-lv",
        label: "LV pressure",
        order: 0,
      }],
    }],
    outputPanes: [{
      paneId: "pane/outputs",
      role: "output",
      label: "Outputs",
      order: 0,
      priority: 0,
      binding: { mode: "active-slot" },
      items: [{
        outputId: "pressure.lv",
        label: "LV pressure",
        order: 0,
      }],
    }],
    controlPanes: [{
      paneId: "pane/controls",
      role: "control",
      label: "Controls",
      order: 0,
      priority: 0,
      binding: { mode: "active-slot" },
      items: [{
        controlId: "control/heart-rate",
        label: "Heart rate",
        order: 0,
        presentation: { kind: "slider" },
      }],
    }],
    note: { text: note },
  };
}

function experimentV2(version = 4): ExperimentV2 {
  return {
    schemaId: STUDIO_EXPERIMENT_V2_SCHEMA_ID,
    experimentId: "experiment/main",
    version,
    content: {
      modelId: "model/main-wire-v3-r1",
      surfaceSeriesId: STANDARD_TEST_SURFACE_SERIES_ID_V1,
      scenarios: [{
        scenarioId: "scenario/baseline",
        label: "Baseline",
        capture: {
          fixture: { value: 1 },
          checkpoint: {
            acceptedRevision: 0,
            acceptedTimeSec: 0,
            payload: { state: [0] },
          },
        },
      }],
      surface: surfaceV2(),
    },
  };
}

function twoScenarioExperimentV2(): ExperimentV2 {
  const baseline = experimentV2();
  return {
    ...baseline,
    content: {
      ...baseline.content,
      scenarios: [
        baseline.content.scenarios[0]!,
        {
          scenarioId: "scenario/comparison",
          label: "Comparison",
          capture: {
            fixture: { value: 2 },
            checkpoint: {
              acceptedRevision: 4,
              acceptedTimeSec: 0.4,
              payload: { state: [4] },
            },
          },
        },
      ],
    },
  };
}

function replaceCheckpointV2(
  content: ExperimentContentV2,
  acceptedRevision: number,
  acceptedTimeSec: number,
): ExperimentContentV2 {
  return {
    ...content,
    scenarios: content.scenarios.map((scenario) => ({
      ...scenario,
      capture: {
        fixture: scenario.capture.fixture,
        checkpoint: {
          acceptedRevision,
          acceptedTimeSec,
          payload: { state: [acceptedRevision] },
        },
      },
    })),
  };
}

function initializeRequestV2(
  requestId: number,
  expectedModelId = "model/main-wire-v3-r1",
) {
  return createStudioSimulationInitializeRequestV2(requestId, {
    expectedModelId,
    releaseTicket: STANDARD_TEST_RELEASE_TICKET_V1,
    runtimeSessionId: "runtime/session-1",
    scenarioId: "scenario/baseline",
    scenarioLabel: "Baseline",
    fixture: { value: 1 },
  });
}

function initializeRequestWithCheckpointV2(requestId: number) {
  return createStudioSimulationInitializeRequestV2(requestId, {
    expectedModelId: "model/main-wire-v3-r1",
    releaseTicket: STANDARD_TEST_RELEASE_TICKET_V1,
    runtimeSessionId: "runtime/session-1",
    scenarioId: "scenario/baseline",
    scenarioLabel: "Baseline",
    fixture: { value: 1 },
    checkpoint: {
      acceptedRevision: 4,
      acceptedTimeSec: 0.4,
      payload: { state: [4] },
    },
  });
}

function initializedResponseV2(
  requestId: number,
  frameOverrides: Partial<StudioSimulationFrameV2> = {},
) {
  return {
    protocol: STUDIO_SIMULATION_WORKER_PROTOCOL_V2,
    requestId,
    status: "ok" as const,
    kind: "initialized" as const,
    frame: frameV2(frameOverrides),
  };
}

function advancedResponseV2(
  requestId: number,
  frames: readonly StudioSimulationFrameV2[],
) {
  return {
    protocol: STUDIO_SIMULATION_WORKER_PROTOCOL_V2,
    requestId,
    status: "ok" as const,
    kind: "advanced" as const,
    frames,
  };
}

function controlAppliedResponseV2(
  requestId: number,
  frame: StudioSimulationFrameV2,
) {
  return {
    protocol: STUDIO_SIMULATION_WORKER_PROTOCOL_V2,
    requestId,
    status: "ok" as const,
    kind: "control-applied" as const,
    frame,
    fixture: { value: 72 },
  };
}

function analysisResultResponseV2(
  requestId: number,
  analysis: StudioSimulationAnalysisV2,
) {
  return {
    protocol: STUDIO_SIMULATION_WORKER_PROTOCOL_V2,
    requestId,
    status: "ok" as const,
    kind: "analysis-result" as const,
    analysis,
  };
}

function analysisProgressResponseV2(
  requestId: number,
  analysis: StudioSimulationAnalysisV2,
) {
  return {
    protocol: STUDIO_SIMULATION_WORKER_PROTOCOL_V2,
    requestId,
    status: "ok" as const,
    kind: "analysis-progress" as const,
    analysis,
  };
}

function frameV2(
  overrides: Partial<StudioSimulationFrameV2> = {},
): StudioSimulationFrameV2 {
  return {
    modelId: "model/main-wire-v3-r1",
    runtimeSessionId: "runtime/session-1",
    scenarioId: "scenario/baseline",
    inputEpoch: 0,
    acceptedRevision: 0,
    acceptedTimeSec: 0,
    outputs: {
      "pressure.lv": outputV2("pressure.lv", 80),
    },
    ...overrides,
  };
}

function analysisV2(
  overrides: Partial<StudioSimulationAnalysisV2> = {},
): StudioSimulationAnalysisV2 {
  return {
    modelId: "model/main-wire-v3-r1",
    runtimeSessionId: "runtime/session-1",
    scenarioId: "scenario/baseline",
    inputEpoch: 0,
    sourceAcceptedRevision: 0,
    sourceAcceptedTimeSec: 0,
    analysisId: "analysis/guyton-starling-v1",
    payload: { curve: [{ pressure: 1, flow: 2 }] },
    ...overrides,
  };
}

function outputV2(outputId: string, value: number | number[]) {
  return {
    outputId,
    value,
    availability: "available" as const,
    quality: "authoritative-state" as const,
  };
}

function runtimeHarnessV2(overrides: Readonly<{
  resolvePresentationAnalysisMethods?: ResolvePresentationAnalysisMethodsV1;
  analysisExecutor?: AnalysisExecutorV1;
  createSession?: RegisteredModelSimulationAdapterV2["createSession"];
  disposeSession?: RegisteredModelSimulationAdapterV2["disposeSession"];
  currentFrame?: RegisteredModelSimulationAdapterV2["currentFrame"];
  advanceOnePresentationStep?:
    RegisteredModelSimulationAdapterV2["advanceOnePresentationStep"];
  advancePresentationBatch?:
    RegisteredModelSimulationAdapterV2["advancePresentationBatch"];
  applyControl?: RegisteredModelSimulationAdapterV2["applyControl"];
  requestAnalysis?: RegisteredModelSimulationAdapterV2["requestAnalysis"];
  currentInputEpoch?: RegisteredModelSimulationAdapterV2["currentInputEpoch"];
  captureAcceptedCandidate?:
    ResolvedExactModelRuntimeV2["experimentCapture"]["captureAcceptedCandidate"];
  admitFrozenCandidate?:
    ResolvedExactModelRuntimeV2["snapshotGate"]["admitFrozenCandidate"];
  reduceControlAction?: NonNullable<
    ResolvedExactModelRuntimeV2["fixtureAdapter"]["reduceControlAction"]
  >;
  executionPlan?: RegisteredModelExecutionPlanAdapterV1;
}> = {}) {
  let revision = 0;
  let inputEpoch = 0;
  let currentFrame = frameV2();
  const advanceOnePresentationStep = overrides.advanceOnePresentationStep
    ?? vi.fn(() => {
      revision += 1;
      currentFrame = frameV2({
        inputEpoch,
        acceptedRevision: revision,
        acceptedTimeSec: revision / 10,
      });
      return Promise.resolve(currentFrame);
    });
  const advancePresentationBatch = overrides.advancePresentationBatch
    ?? vi.fn(async (input) => {
      const frames: StudioSimulationFrameV2[] = [];
      for (let index = 0; index < input.stepCount; index += 1) {
        frames.push(await advanceOnePresentationStep(input));
      }
      return createStudioSimulationPresentationBatchV2(
        frames,
        input.presentationOutputIds,
      );
    });
  const adapter: RegisteredModelSimulationAdapterV2 = {
    modelId: "model/main-wire-v3-r1",
    fixtureSchemaId: "fixture/main-wire-v3-r1",
    checkpointCodecId: "checkpoint/main-wire-v3-r1",
    createSession: overrides.createSession ?? vi.fn(() => Promise.resolve()),
    disposeSession: overrides.disposeSession ?? vi.fn(),
    currentFrame: overrides.currentFrame ?? vi.fn(() => currentFrame),
    advanceOnePresentationStep,
    advancePresentationBatch,
    applyControl: overrides.applyControl ?? vi.fn((input) => {
      if (input.expectedInputEpoch !== inputEpoch) {
        return Promise.reject(new Error("stale input epoch"));
      }
      inputEpoch += 1;
      currentFrame = frameV2({
        inputEpoch,
      });
      return Promise.resolve(currentFrame);
    }),
    requestAnalysis: overrides.requestAnalysis ?? vi.fn((input) =>
      Promise.resolve(analysisV2({
        analysisId: input.analysisId,
        inputEpoch,
        sourceAcceptedRevision: currentFrame.acceptedRevision,
        sourceAcceptedTimeSec: currentFrame.acceptedTimeSec,
      }))),
    replaceFixture: vi.fn(() => Promise.resolve(0)),
    currentInputEpoch: overrides.currentInputEpoch
      ?? vi.fn(() => inputEpoch),
  };
  const port = {
    messages: [] as unknown[],
    transfers: [] as Transferable[][],
    postMessage: vi.fn((message: unknown, transfer?: Transferable[]) => {
      port.messages.push(message);
      port.transfers.push(transfer ?? []);
    }),
    close: vi.fn(),
  };
  const exactRuntime = exactRuntimeV2(adapter, overrides);
  const loadAdapter = vi.fn(() => Promise.resolve(exactRuntime));
  const runtime = new StudioSimulationWorkerRuntimeV2({
    loadExactRuntime: loadAdapter,
    ...(overrides.resolvePresentationAnalysisMethods === undefined ? {} : { resolvePresentationAnalysisMethods: overrides.resolvePresentationAnalysisMethods }),
    ...(overrides.analysisExecutor === undefined
      ? {}
      : { analysisExecutor: overrides.analysisExecutor }),
    port,
    snapshotIds: {
      nextSnapshotId: vi.fn(() => "snapshot/worker-test/1"),
    },
    clock: {
      nowIso: vi.fn(() => "2026-08-01T00:00:00.000Z"),
    },
  });
  return { adapter, exactRuntime, loadAdapter, port, runtime };
}

function multiScenarioRuntimeHarnessV2(overrides: Readonly<{
  executionPlan?: RegisteredModelExecutionPlanAdapterV1;
}> = {}) {
  type ScenarioState = {
    inputEpoch: number;
    acceptedRevision: number;
    acceptedTimeSec: number;
  };
  const sessions = new Map<string, Map<string, ScenarioState>>();
  const required = (runtimeSessionId: string, scenarioId: string) => {
    const scenario = sessions.get(runtimeSessionId)?.get(scenarioId);
    if (scenario === undefined) throw new Error("test Scenario not found");
    return scenario;
  };
  const createSession = vi.fn<RegisteredModelSimulationAdapterV2["createSession"]>(
    async ({ runtimeSessionId, scenarios }) => {
      if (sessions.has(runtimeSessionId)) throw new Error("duplicate test session");
      sessions.set(runtimeSessionId, new Map(scenarios.map((scenario) => [
        scenario.scenarioId,
        {
          inputEpoch: 0,
          acceptedRevision: scenario.checkpoint?.acceptedRevision ?? 0,
          acceptedTimeSec: scenario.checkpoint?.acceptedTimeSec ?? 0,
        },
      ])));
    },
  );
  const disposeSession = vi.fn((runtimeSessionId: string) => {
    if (!sessions.delete(runtimeSessionId)) throw new Error("missing test session");
  });
  const toFrame = (runtimeSessionId: string, scenarioId: string) => {
    const state = required(runtimeSessionId, scenarioId);
    return frameV2({
      runtimeSessionId,
      scenarioId,
      inputEpoch: state.inputEpoch,
      acceptedRevision: state.acceptedRevision,
      acceptedTimeSec: state.acceptedTimeSec,
    });
  };
  return runtimeHarnessV2({
    createSession,
    disposeSession,
    currentFrame: vi.fn(({ runtimeSessionId, scenarioId }) =>
      toFrame(runtimeSessionId, scenarioId)),
    currentInputEpoch: vi.fn(({ runtimeSessionId, scenarioId }) =>
      required(runtimeSessionId, scenarioId).inputEpoch),
    advanceOnePresentationStep: vi.fn(async ({
      runtimeSessionId,
      scenarioId,
    }) => {
      const state = required(runtimeSessionId, scenarioId);
      state.acceptedRevision += 1;
      state.acceptedTimeSec += 0.1;
      return toFrame(runtimeSessionId, scenarioId);
    }),
    applyControl: vi.fn(async ({
      runtimeSessionId,
      scenarioId,
      expectedInputEpoch,
    }) => {
      const state = required(runtimeSessionId, scenarioId);
      if (state.inputEpoch !== expectedInputEpoch) throw new Error("stale");
      state.inputEpoch += 1;
      state.acceptedRevision = 0;
      state.acceptedTimeSec = 0;
      return toFrame(runtimeSessionId, scenarioId);
    }),
    ...(overrides.executionPlan === undefined
      ? {}
      : { executionPlan: overrides.executionPlan }),
  });
}

function exactRuntimeV2(
  adapter: RegisteredModelSimulationAdapterV2,
  overrides: Readonly<{
    captureAcceptedCandidate?:
      ResolvedExactModelRuntimeV2["experimentCapture"]["captureAcceptedCandidate"];
    admitFrozenCandidate?:
      ResolvedExactModelRuntimeV2["snapshotGate"]["admitFrozenCandidate"];
    reduceControlAction?: NonNullable<
      ResolvedExactModelRuntimeV2["fixtureAdapter"]["reduceControlAction"]
    >;
    executionPlan?: RegisteredModelExecutionPlanAdapterV1;
  }> = {},
): ResolvedExactModelRuntimeV2 {
  const contract: ModelContractV2 = {
    modelId: adapter.modelId,
    modelFamilyId: "model/main-wire-v3",
    displayName: "Main Wire V3",
    fixtureSchemaId: adapter.fixtureSchemaId,
    checkpointCodecId: adapter.checkpointCodecId,
    snapshotGateId: "snapshot-gate/main-wire-v3-r1",
    controlCatalog: [{
      controlId: "control/heart-rate",
      valueType: "number",
      unit: "bpm",
      minimum: 30,
      maximum: 180,
      step: 1,
      defaultValue: 60,
      changeSemantics: "accepted-state-warm-start",
    }],
    outputCatalog: [{
      outputId: "pressure.lv",
      kind: "signal",
      unit: "mmHg",
      shape: "scalar",
      sampling: "accepted-step",
    }],
    graphCatalog: [{
      graphId: "graph/pressure",
      renderer: "sweep",
      seriesCatalog: [{
        kind: "scalar",
        seriesId: "series/pressure-lv",
        outputId: "pressure.lv",
      }],
      defaultSeriesIds: ["series/pressure-lv"],
    }],
  };
  const executionPlan = overrides.executionPlan
    ?? defaultExecutionPlanAdapterV1();
  const exactContract: ModelContractV2 = Object.freeze({
    ...contract,
    graphCatalog: Object.freeze([]),
  });
  return {
    contract,
    exactContract,
    captureAdapter: {
      modelId: contract.modelId,
      fixtureSchemaId: contract.fixtureSchemaId,
      checkpointCodecId: contract.checkpointCodecId,
      validateFixture() { return undefined; },
      async validateCapture() {},
    },
    experimentCapture: {
      modelId: contract.modelId,
      fixtureSchemaId: contract.fixtureSchemaId,
      checkpointCodecId: contract.checkpointCodecId,
      captureAcceptedCandidate: overrides.captureAcceptedCandidate
        ?? (async (input) => {
        const scenarios = input.desiredContent.scenarios.map((scenario) => {
          const frame = adapter.currentFrame({
            runtimeSessionId: input.correlation.runtimeSessionId,
            scenarioId: scenario.scenarioId,
          });
          const correlation = input.correlation.scenarios.find(
            ({ scenarioId }) => scenarioId === scenario.scenarioId,
          );
          if (correlation?.expectedInputEpoch !== frame.inputEpoch) {
            throw new Error("stale capture input epoch");
          }
          return {
            scenarioId: scenario.scenarioId,
            label: scenario.label,
            capture: {
              fixture: scenario.fixture,
              checkpoint: {
                acceptedRevision: frame.acceptedRevision,
                acceptedTimeSec: frame.acceptedTimeSec,
                payload: { state: [frame.acceptedRevision] },
              },
            },
          };
        });
        return {
          content: {
            modelId: input.desiredContent.modelId,
            scenarios,
            surface: input.desiredContent.surface,
          },
          confirmation: {
            experimentId: input.experimentId,
            runtimeSessionId: input.correlation.runtimeSessionId,
            scenarios: input.correlation.scenarios,
          },
        };
        }),
    },
    snapshotGate: {
      modelId: contract.modelId,
      snapshotGateId: contract.snapshotGateId,
      admitFrozenCandidate: overrides.admitFrozenCandidate
        ?? (async () => ({
          status: "passed" as const,
        })),
    },
    fixtureAdapter: {
      modelId: contract.modelId,
      fixtureSchemaId: contract.fixtureSchemaId,
      validateCompleteFixture() { return undefined; },
      reduceControlAction: overrides.reduceControlAction
        ?? (({ action }) => ({
          changes: [{ path: ["value"], value: action.value }],
        })),
    },
    simulationAdapter: adapter,
    executionPlan: Object.freeze({
      ...executionPlan,
      async createSession(input) {
        await adapter.createSession({
          runtimeSessionId: input.runtimeSessionId,
          scenarios: input.scenarios,
        });
        await executionPlan.createSession(input);
      },
    }),
  };
}

function defaultExecutionPlanAdapterV1(): RegisteredModelExecutionPlanAdapterV1 {
  const descriptor = validateAndOwnExecutionPlanDescriptorV1(
    generatedExecutionPlanV1,
  );
  return executionPlanAdapterV1(() => bindExecutionPlanV1(
    descriptor,
    mainWireExecutionPlanKernelCatalogV1(),
  ));
}

function executionPlanAdapterV1(
  bind: RegisteredModelExecutionPlanAdapterV1["bind"],
  createSession: RegisteredModelExecutionPlanAdapterV1["createSession"] =
    async () => {},
): RegisteredModelExecutionPlanAdapterV1 {
  return Object.freeze({
    schemaId: REGISTERED_MODEL_EXECUTION_PLAN_ADAPTER_V1_SCHEMA_ID,
    modelId: "model/main-wire-v3-r1",
    descriptor: generatedExecutionPlanV1,
    bind,
    createSession,
  });
}

function mainWireExecutionPlanKernelCatalogV1() {
  return Object.freeze({
    componentKernelIds: Object.freeze([
      "accepted-transaction-kernel-v1",
      "noncoronary-backward-euler-kernel-v1",
      "coronary-backward-euler-kernel-v2",
      "five-wall-land-triseg-kernel-v1",
    ]),
    hydraulicPathKernelIds: Object.freeze([
      "noncoronary-flow/resistive",
      "noncoronary-flow/valve",
      "noncoronary-flow/dynamic",
      "coronary-flow/large-arterial",
      "coronary-flow/micro-proximal-arteriolar",
      "coronary-flow/micro-intermediate-capillary",
      "coronary-flow/micro-distal-venular",
      "coronary-flow/large-venous-outlet",
    ]),
    solveSystemKernelIds: Object.freeze([
      "main-wire-five-wall-static-condensed-system-kernel-v1",
    ]),
  });
}

function deferredV2<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

class FakeWorkerTransportV2 implements StudioSimulationWorkerTransportV2 {
  readonly messages: unknown[] = [];
  readonly terminate = vi.fn();
  readonly #messageListeners = new Set<(event: MessageEvent<unknown>) => void>();
  readonly #errorListeners = new Set<(event: ErrorEvent) => void>();

  postMessage(message: unknown): void {
    this.messages.push(message);
  }

  addEventListener(
    type: "message",
    listener: (event: MessageEvent<unknown>) => void,
  ): void;
  addEventListener(
    type: "error",
    listener: (event: ErrorEvent) => void,
  ): void;
  addEventListener(
    type: "message" | "error",
    listener: ((event: MessageEvent<unknown>) => void)
      | ((event: ErrorEvent) => void),
  ): void {
    if (type === "message") {
      this.#messageListeners.add(
        listener as (event: MessageEvent<unknown>) => void,
      );
    } else {
      this.#errorListeners.add(listener as (event: ErrorEvent) => void);
    }
  }

  removeEventListener(
    type: "message",
    listener: (event: MessageEvent<unknown>) => void,
  ): void;
  removeEventListener(
    type: "error",
    listener: (event: ErrorEvent) => void,
  ): void;
  removeEventListener(
    type: "message" | "error",
    listener: ((event: MessageEvent<unknown>) => void)
      | ((event: ErrorEvent) => void),
  ): void {
    if (type === "message") {
      this.#messageListeners.delete(
        listener as (event: MessageEvent<unknown>) => void,
      );
    } else {
      this.#errorListeners.delete(listener as (event: ErrorEvent) => void);
    }
  }

  emitMessage(data: unknown): void {
    for (const listener of this.#messageListeners) {
      listener({ data } as MessageEvent<unknown>);
    }
  }
}

class RuntimeBackedWorkerTransportV2
implements StudioSimulationWorkerTransportV2 {
  readonly messages: unknown[] = [];
  readonly responses: unknown[] = [];
  readonly runtime: StudioSimulationWorkerRuntimeV2;
  readonly terminate: ReturnType<typeof vi.fn>;
  readonly close = vi.fn();
  readonly #messageListeners = new Set<(event: MessageEvent<unknown>) => void>();
  readonly #errorListeners = new Set<(event: ErrorEvent) => void>();

  constructor(adapter: RegisteredModelSimulationAdapterV2) {
    this.runtime = new StudioSimulationWorkerRuntimeV2({
      loadExactRuntime: () => Promise.resolve(exactRuntimeV2(adapter)),
      port: {
        postMessage: (message) => {
          this.responses.push(message);
          for (const listener of this.#messageListeners) {
            listener({ data: message } as MessageEvent<unknown>);
          }
        },
        close: this.close,
      },
    });
    this.terminate = vi.fn(() => this.runtime.terminate());
  }

  postMessage(message: unknown): void {
    this.messages.push(message);
    this.runtime.enqueue(message);
  }

  whenIdle(): Promise<void> {
    return this.runtime.whenIdle();
  }

  addEventListener(
    type: "message",
    listener: (event: MessageEvent<unknown>) => void,
  ): void;
  addEventListener(
    type: "error",
    listener: (event: ErrorEvent) => void,
  ): void;
  addEventListener(
    type: "message" | "error",
    listener: ((event: MessageEvent<unknown>) => void)
      | ((event: ErrorEvent) => void),
  ): void {
    if (type === "message") {
      this.#messageListeners.add(
        listener as (event: MessageEvent<unknown>) => void,
      );
    } else {
      this.#errorListeners.add(listener as (event: ErrorEvent) => void);
    }
  }

  removeEventListener(
    type: "message",
    listener: (event: MessageEvent<unknown>) => void,
  ): void;
  removeEventListener(
    type: "error",
    listener: (event: ErrorEvent) => void,
  ): void;
  removeEventListener(
    type: "message" | "error",
    listener: ((event: MessageEvent<unknown>) => void)
      | ((event: ErrorEvent) => void),
  ): void {
    if (type === "message") {
      this.#messageListeners.delete(
        listener as (event: MessageEvent<unknown>) => void,
      );
    } else {
      this.#errorListeners.delete(listener as (event: ErrorEvent) => void);
    }
  }
}

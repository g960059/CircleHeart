import { articleReaderShowAllOutputsV3 } from "@/components/article/reader/ArticleReaderOutputDisclosureV3";
import { articleReaderNeedsScenarioLabelsV3, articleReaderTitleNamesScenarioV3, articleReaderObservationGroupsV3 } from "@/components/article/reader/ArticleReaderObservationV3";
import { articleReaderPlacementAfterViewportExitV3, articleReaderPlacementInReadingAreaV3 } from "@/components/article/reader/ArticleReaderPlacementV3";
import React from "react";
import { articleReaderSampledPresentationV1, createArticleReaderPreviewPresentationV1, useArticleReaderPreviewV1 } from "@/components/article/reader/useArticleReaderPreviewV1";
import type { ExperimentReaderPreviewV1 } from "@/studio/contracts/v2/readerPreview";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { periodicPvaFromAnalysisV3 } from "@/components/workbench/presentation/WorkbenchPeriodicPvaProjectionV3";
import { structuralReturnOrientationFromPayloadV3 } from "@/components/workbench/presentation/GuytonStarlingOrientationCanvasV3";
import { buildMainWirePeriodicPvaMethodV16, MAIN_WIRE_PERIODIC_PVA_METHOD_V16_ID } from "@/analysis/methods/mainWire/MainWirePeriodicPvaV1";

import i18n from "@/i18n";
import {
  ARTICLE_OBSERVATION_DEFAULT_BUDGET_V3,
  ARTICLE_PRIMARY_CONTROL_LIMIT_V3,
  ARTICLE_PRIMARY_OUTPUT_LIMIT_V3,
  articleBriefingControlKeyV3,
  articleBriefingInitialOpenControlPaneIdsV3,
  articleBriefingOutputKeyV3,
  articleBriefingPrimaryControlKeysV3,
  articleBriefingPrimaryOutputKeysV3,
  defaultObservedItemKeysV3,
  withExplicitItemEmphasisV3,
} from "@/studio/application/article/ArticleBriefingObservationV3";
import {
  ArticleReaderObservationMemoryContextV3,
  createArticleReaderObservationMemoryV3,
  openArticleReaderToOperateV3,
  type ArticleReaderEmbedLayoutV3,
  type ArticleReaderObservationMemoryV3,
} from "@/components/article/reader/ArticleReaderEmbedV3";
import { defaultArticleBriefingV3 } from "@/studio/application/article/ArticleExperimentPlacementV3";
import {
  validateExperimentPlacementBriefingV2,
  validateExperimentSnapshotV2,
} from "@/studio/application/authoring/StudioExperimentDataV2";
import { reconcileWorkbenchBriefingV3 } from "@/components/workbench/WorkbenchBriefingPolicy";
import { ArticleBriefingEditorV3, articleBriefingEditorReferenceHandlersV3 } from "@/components/article/ArticleExperimentPlacementV3";
import { WorkbenchMobileStageDeckV3 } from "@/components/workbench/WorkbenchMobileStageDeckV3";
import { WorkbenchLastMeasuredOutputsV1 } from "@/components/workbench/presentation/WorkbenchLastMeasuredOutputsV1";
import { ExperimentObservationV3 } from "@/components/workbench/ExperimentPanePresentationV3";
import { workbenchObservedOutputKeyV3 } from "@/components/workbench/presentation/WorkbenchObservationV3";
import {
  ArticleReaderAnalysisStatusV3,
  ArticleReaderEmbedSurfaceV3,
  ArticleReaderExperimentPeekPanelV3,
  ArticleReaderExperimentV3,
  ArticleReaderControlV3,
  ArticleReaderObservationV3,
  articleReaderControlBindingSignatureV3,
  ArticleReaderStructuralReturnGraphV3,
  articleReaderAnalysisScenarioIdsV3,
  articleReaderPeriodicPvaEnabledV3,
  articleReaderBoundedHistoryV3,
  commonGraphUnitV3,
  resolveArticleReaderGraphPresentationV3,
  readerStructuralAnalysisRequestsV3,
  selectedSweepOutputIdsV3,
} from "@/components/article/reader/ArticleReaderExperimentV3";
import {
  articleReaderPeekFractionForPointerV3,
  clampArticleReaderPeekFractionV3,
} from "@/components/article/ArticleReaderPage";
import type { StudioArticleExperimentBlockV2 } from "@/studio/contracts/v2/article";
import {
  STUDIO_EXPERIMENT_PLACEMENT_V2_SCHEMA_ID,
  STUDIO_EXPERIMENT_SNAPSHOT_V2_SCHEMA_ID,
  type ExperimentPlacementBriefingV2,
  type ExperimentSnapshotV2,
} from "@/studio/contracts/v2/content";
import type {
  ControlDefinitionV2,
  ModelContractV2,
} from "@/studio/contracts/v2/model";
import type { StudioClientCompositionV2 } from "@/studio/composition/StudioDefaultCompositionV2";
import type { StudioSimulationAnalysisV2 } from "@/studio/contracts/v2/simulation";
import type { UseArticleReaderLiveRuntimeResultV3 } from "@/components/article/reader/useArticleReaderLiveRuntimeV3";
import { articleReaderAnalysisKeyV3 } from "@/components/article/reader/ArticleReaderLiveRuntimeV3";
import { articleReaderPresentationOutputSelectionV3 } from "@/components/article/reader/ArticleReaderPresentationOutputSelectionV3";
import { WorkbenchScenarioPresentationSampleStoreV3 } from "@/components/workbench/presentation/WorkbenchPresentationSampleStoreV3";
import {
  STANDARD_TEST_RELEASE_TICKET_V1,
  STANDARD_TEST_SURFACE_RELEASE_ID_V1,
  STANDARD_TEST_SURFACE_SERIES_ID_V1,
} from "@/__tests__/helpers/standardReleaseTicketV1";
import {
  MAIN_WIRE_INTEGRATED_MODEL_FORMAL_PRESSURE_VOLUME_RELATIONS_V3_ID,
} from "@/analysis/methods/mainWire/MainWireStructuralAnalysisContractV3";
import {
  MAIN_WIRE_PERIODIC_PVA_OUTPUT_IDS_V1,
} from "@/analysis/methods/mainWire/MainWireAnalysisMethodRegistryV1";
import {
  MAIN_WIRE_INTEGRATED_STUDIO_STANDARD72_MODEL_ID_V1,
} from "@/domain/model/MainWireStandardIdentityV1";
import algebraicPulmonaryRootStandard70SurfaceV1 from
  "@/studio/integrations/mainWireIntegratedV3/MainWireIntegratedStudioAlgebraicPulmonaryRootSurfaceV1";

const NOOP = () => {};

describe("Opening Snapshot figure to live drawing", () => {
  const rows = (phases: readonly number[], inputEpoch = 0) => phases.map((phase, index) => ({
    inputEpoch, acceptedRevision: index + 1, acceptedTimeSec: (index + 1) / 10,
    values: { phase, volume: 140 - index * 3, pressure: 10 + index * 10 },
  }));
  const preview = (): ExperimentReaderPreviewV1 => ({
    schemaId: "circleheart-experiment-reader-preview-v1", sourceSha256: "0".repeat(64), previewSha256: "1".repeat(64),
    scenarios: ["scenario/baseline", "scenario/comparison"].map(scenarioId => ({ scenarioId,
      acceptedRevision: 6, acceptedTimeSec: .6, analyses: [],
      outputs: { pressure: { outputId: "pressure", value: 100, availability: "available", quality: "authoritative-state" } },
      samples: rows([0, .25, .5, .9, 0, .25]).map(({ inputEpoch: _, ...row }) => row),
    })),
  });
  const liveStore = () => { const store = new WorkbenchScenarioPresentationSampleStoreV3(); store.setCyclePhaseOutputId("phase"); return store; };

  it("moves the real head before a complete live beat while preserving the saved background", () => {
    const saved = createArticleReaderPreviewPresentationV1(snapshotV3(), preview(), "phase", []).sampleStore;
    const live = liveStore();
    const original = saved.getPressureVolumeSnapshot();
    for (const count of [1, 2]) {
      live.append("scenario/baseline", rows([0, .25]).slice(0, count));
      const actual = live.getPressureVolumeSnapshot();
      const drawing = articleReaderSampledPresentationV1(actual, saved);
      if (drawing?.renderer !== "pressure-volume") throw Error("Expected PV figure");
      expect(actual.completedCyclesByScenarioId["scenario/baseline"]).toHaveLength(0);
      expect(drawing.currentCycleSamplesByScenarioId["scenario/baseline"]?.at(-1)?.acceptedRevision).toBe(count);
      expect(drawing.currentCycleSamplesByScenarioId["scenario/baseline"]).toBe(actual.currentCycleSamplesByScenarioId["scenario/baseline"]);
      expect(drawing.completedCyclesByScenarioId["scenario/baseline"]).toBe(original.completedCyclesByScenarioId["scenario/baseline"]);
      expect(live.getScenarioSnapshot("scenario/baseline")).toHaveLength(count);
    }
    expect(saved.getPressureVolumeSnapshot()).toBe(original);
  });

  it("replaces each completed background independently and drops it after an input epoch change", () => {
    const saved = createArticleReaderPreviewPresentationV1(snapshotV3(), preview(), "phase", []).sampleStore;
    const live = liveStore();
    live.append("scenario/baseline", rows([0, .25, .5, .9, 0]));
    live.append("scenario/comparison", rows([0, .25]));
    const actual = live.getPressureVolumeSnapshot();
    const drawing = articleReaderSampledPresentationV1(actual, saved);
    if (drawing?.renderer !== "pressure-volume") throw Error("Expected PV figure");
    expect(drawing.completedCyclesByScenarioId["scenario/baseline"]).toBe(actual.completedCyclesByScenarioId["scenario/baseline"]);
    expect(drawing.completedCyclesByScenarioId["scenario/comparison"]).toBe(saved.getPressureVolumeSnapshot().completedCyclesByScenarioId["scenario/comparison"]);
    live.append("scenario/comparison", rows([0, .25], 1));
    const edited = articleReaderSampledPresentationV1(live.getPressureVolumeSnapshot(), saved);
    if (edited?.renderer !== "pressure-volume") throw Error("Expected PV figure");
    expect(edited.completedCyclesByScenarioId["scenario/comparison"]).toHaveLength(0);
  });

  it("starts the live waveform immediately without concatenating two simulation clocks", () => {
    const saved = createArticleReaderPreviewPresentationV1(snapshotV3(), preview(), "phase", []).sampleStore;
    const live = liveStore();
    live.append("scenario/baseline", rows([0, .25]));
    const drawing = articleReaderSampledPresentationV1(live.getSweepSnapshot(), saved);
    if (drawing?.renderer !== "sweep") throw Error("Expected waveform");
    expect(drawing.samplesByScenarioId["scenario/baseline"]).toBe(live.getScenarioSnapshot("scenario/baseline"));
    expect(drawing.samplesByScenarioId["scenario/comparison"]).toBe(saved.getScenarioSnapshot("scenario/comparison"));
    expect(articleReaderSampledPresentationV1(live.getSweepSnapshot(), undefined)).toBe(live.getSweepSnapshot());
    expect(articleReaderSampledPresentationV1(null, saved)).toBeNull();
  });

  it("keeps live subscriptions and prefers live values; edits never fall back to sealed values", () => {
    const live = readerRuntimeStubV3();
    const outputs: UseArticleReaderLiveRuntimeResultV3[] = [];
    const actual = { outputId: "pressure", value: 42, availability: "available" as const, quality: "authoritative-state" as const };
    const render = (runtime: UseArticleReaderLiveRuntimeResultV3) => {
      function Probe() { outputs.push(useArticleReaderPreviewV1(runtime, snapshotV3(), preview(), "phase", [])); return null; }
      renderToStaticMarkup(<Probe />);
      return outputs.at(-1)!;
    };
    const opening = render(live);
    expect(opening.sampleStore).toBe(live.sampleStore);
    expect(opening.previewSampleStore).toBeDefined();
    expect(opening.presentationOutput?.("scenario/baseline", "pressure")?.value).toBe(100);
    expect(render({ ...live, presentationOutput: () => actual }).presentationOutput?.("scenario/baseline", "pressure")).toBe(actual);
    const sealedTrace = opening.presentationTrace!("scenario/baseline")!;
    const startingTrace = { ...sealedTrace, frame: { ...sealedTrace.frame, runtimeSessionId: "live" } };
    expect(render({ ...live, presentationTrace: () => startingTrace }).presentationTrace?.("scenario/baseline")?.frame.runtimeSessionId).toBe("reader-preview");
    const unavailable = { ...actual, value: null, availability: "not-evaluated-at-accepted-state" as const };
    const waitingTrace = { ...startingTrace, frame: { ...startingTrace.frame, outputs: { pressure: unavailable } } };
    expect(render({ ...live, presentationTrace: () => waitingTrace }).presentationOutput?.("scenario/baseline", "pressure")).toBe(unavailable);
    expect(render({ ...live, presentationTrace: () => ({ ...startingTrace, frame: { ...startingTrace.frame, outputs: {} } }) }).presentationOutput?.("scenario/baseline", "pressure")).toBeUndefined();
    const liveAnalysis: StudioSimulationAnalysisV2 = { ...startingTrace.frame, analysisId: "ejection",
      sourceAcceptedRevision: startingTrace.frame.acceptedRevision, sourceAcceptedTimeSec: startingTrace.frame.acceptedTimeSec, payload: {} };
    const completeTrace = { ...startingTrace, analyses: [liveAnalysis] };
    expect(render({ ...live, presentationTrace: () => completeTrace }).presentationTrace?.("scenario/baseline")).toBe(completeTrace);
    const edited = { ...live, state: { ...live.state, changedScenarioIds: ["scenario/baseline"] } };
    expect(render(edited)).toBe(edited);
  });
});

function snapshotV3(): ExperimentSnapshotV2 {
  return {
    schemaId: STUDIO_EXPERIMENT_SNAPSHOT_V2_SCHEMA_ID,
    snapshotId: "snapshot/reader",
    surfaceReleaseId: STANDARD_TEST_SURFACE_RELEASE_ID_V1,
    createdAt: "2026-08-02T00:00:00.000Z",
    content: {
      modelId: STANDARD_TEST_RELEASE_TICKET_V1.modelId,
      surfaceSeriesId: STANDARD_TEST_SURFACE_SERIES_ID_V1,
      scenarios: [
        scenarioV3("scenario/baseline", "Baseline"),
        scenarioV3("scenario/comparison", "Comparison"),
        scenarioV3("scenario/excluded", "Excluded"),
      ],
      surface: {
        graphPanes: [
          {
            paneId: "pane/return",
            role: "graph",
            label: "Systemic return",
            order: 0,
            priority: 10,
            graphId: "graph/return",
            scenarioScope: { mode: "visible-scenarios" },
            excludedTraces: [],
            historyDepth: 1,
            structuralSide: "right",
            series: [],
          },
        ],
        outputPanes: [],
        controlPanes: [],
        note: { text: "" },
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

function briefingV3(): ExperimentPlacementBriefingV2 {
  return {
    defaultTitle: "Reader experiment",
    scenarioScope: {
      visibleScenarioIds: ["scenario/comparison"],
      initialFocusScenarioId: "scenario/comparison",
    },
    graphs: [
      {
        paneId: "pane/return",
        order: 0,
        emphasis: "primary",
      },
    ],
    outputs: [],
    controls: [],
  };
}

function blockV3(): StudioArticleExperimentBlockV2 {
  return {
    blockId: "block/reader",
    kind: "experiment",
    placement: {
      schemaId: STUDIO_EXPERIMENT_PLACEMENT_V2_SCHEMA_ID,
      placementId: "placement/reader",
      snapshotId: "snapshot/reader",
      briefing: briefingV3(),
      titleOverride: null,
      caption: null,
    },
  };
}

function contractV3(): ModelContractV2 {
  return {
    modelId: STANDARD_TEST_RELEASE_TICKET_V1.modelId,
    modelFamilyId: STANDARD_TEST_RELEASE_TICKET_V1.manifest.modelFamilyId,
    displayName: "Reader exact model",
    fixtureSchemaId:
      STANDARD_TEST_RELEASE_TICKET_V1.manifest.fixtureSchema.fixtureSchemaId,
    checkpointCodecId:
      STANDARD_TEST_RELEASE_TICKET_V1.manifest.checkpointCodec
        .checkpointCodecId,
    snapshotGateId: "gate/reader-v3",
    controlCatalog: [],
    outputCatalog: [],
    graphCatalog: [
      {
        graphId: "graph/return",
        renderer: "structural-return",
        analysisId: "analysis/return",
        side: "right",
      },
    ],
  };
}

function runtimeCompositionV3(): StudioClientCompositionV2 {
  const contract = contractV3();
  return Object.freeze({
    exactModel: Object.freeze({
      modelId: contract.modelId,
      stage: "stable" as const,
      defaultFixture: Object.freeze({}),
      fixtureProjection: Object.freeze({
        controlValue: () => Object.freeze({
          status: "value" as const,
          value: 1,
        }),
      }),
      workerReleaseTicket: STANDARD_TEST_RELEASE_TICKET_V1,
    }),
    modelSurface: Object.freeze({
      identity: Object.freeze({
        modelFamilyId: contract.modelFamilyId,
        surfaceReleaseId: STANDARD_TEST_SURFACE_RELEASE_ID_V1,
        surfaceSeriesId: STANDARD_TEST_SURFACE_SERIES_ID_V1,
        stage: "stable" as const,
      }),
      contract,
      catalog: Object.freeze({
        surfaceReleaseId: STANDARD_TEST_SURFACE_RELEASE_ID_V1,
        modelFamilyId: contract.modelFamilyId,
        exposedExactOutputIds: Object.freeze([]),
        controlCatalog: Object.freeze([]),
        derivedOutputCatalog: Object.freeze([]),
        graphCatalog: Object.freeze([]),
        knobCatalog: Object.freeze([]),
        protocolCatalog: Object.freeze([]),
      }),
      analysis: Object.freeze({
        capabilities: Object.freeze([]),
        presentationMethods: Object.freeze([]),
        periodicPvaDerivation: null,
        resolveExecutionPlan: () => null,
      }),
    }),
  });
}

function renderExperimentV3(
  input: Readonly<{
    block?: StudioArticleExperimentBlockV2;
    snapshot: ExperimentSnapshotV2 | null;
    contract?: ModelContractV2 | null;
    contractAvailability?: "loading" | "ready" | "unavailable";
    live?: boolean;
    forceInline?: boolean;
  }>,
): string {
  return renderToStaticMarkup(
    <ArticleReaderExperimentV3
      block={input.block ?? blockV3()}
      snapshot={input.snapshot}
      contract={input.contract ?? null}
      contractAvailability={input.contractAvailability}
      runtimeComposition={runtimeCompositionV3()}
      live={input.live ?? false}
      expandedPresentation={null}
      forceInline={input.forceInline ?? false}
      onActivate={NOOP}
      onDeactivate={NOOP}
      onExpand={NOOP}
      onClose={NOOP}
    />,
  );
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
            label: "Pressure-volume loop",
            order: 1,
            priority: 9,
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

function twoGraphBlockV3(): StudioArticleExperimentBlockV2 {
  const block = blockV3();
  return {
    ...block,
    placement: {
      ...block.placement,
      briefing: {
        ...block.placement.briefing,
        graphs: [
          ...block.placement.briefing.graphs,
          { paneId: "pane/pv", order: 1, emphasis: "supporting" },
        ],
      },
    },
  };
}

function structuralAnalysisV3(scenarioId: string): StudioSimulationAnalysisV2 {
  return Object.freeze({
    modelId: STANDARD_TEST_RELEASE_TICKET_V1.modelId,
    runtimeSessionId: `runtime/${scenarioId}`,
    scenarioId,
    inputEpoch: 0,
    sourceAcceptedRevision: 4,
    sourceAcceptedTimeSec: 0.008,
    analysisId:
      MAIN_WIRE_INTEGRATED_MODEL_FORMAL_PRESSURE_VOLUME_RELATIONS_V3_ID,
    payload: Object.freeze({
      status: "available",
      right: Object.freeze({
        side: "right",
        semantics:
          "frozen-accepted-step-volume-constrained-structural-orientation-not-simulated-response",
        pressureBasis: "absolute",
        sourceAcceptedRevision: 4,
        sourceAcceptedTimeSec: 0.008,
        downstreamNode: "RA",
        downstreamPressureLabel: "RAP",
        fillingPressureLabel: "Pmsf orientation",
        fillingPressureMmHg: 7,
        operatingPoint: Object.freeze({
          downstreamPressureMmHg: 3,
          returnFlowLPerMin: 5,
          returnPath: "VC_RA+CS_RA",
        }),
        anchoring: Object.freeze({
          status: "accepted-step-readback",
          method: "none",
          downstreamPressureOffsetMmHg: 0,
          volumeResidualMl: null,
        }),
        curve: Object.freeze([
          Object.freeze({
            downstreamPressureMmHg: 0,
            returnFlowLPerMin: 7,
            flowLimited: false,
          }),
          Object.freeze({
            downstreamPressureMmHg: 7,
            returnFlowLPerMin: 0,
            flowLimited: false,
          }),
        ]),
        starlingLocus: Object.freeze({
          status: "requires-protocol",
          requirement:
            "persistent-fixed-tone-preload-reduction-chain-with-complete-beat-period1-settlement",
          points: Object.freeze([]),
        }),
        limitations: Object.freeze([]),
      }),
    }),
  });
}

function readerRuntimeStubV3(
  stateOverrides: Partial<UseArticleReaderLiveRuntimeResultV3["state"]> = {},
): UseArticleReaderLiveRuntimeResultV3 {
  const sampleStore = new WorkbenchScenarioPresentationSampleStoreV3();
  return Object.freeze({
    state: Object.freeze({
      status: "paused" as const,
      snapshotId: "snapshot/reader",
      scenarioIds: Object.freeze(["scenario/baseline", "scenario/comparison"]),
      activeScenarioId: "scenario/baseline",
      pendingControlInstanceId: null,
      pendingAnalysisKeys: Object.freeze([]),
      fixtureByScenario: Object.freeze({}),
      changedScenarioIds: Object.freeze([]),
      analysisByKey: Object.freeze({}),
      analysisHistoryByKey: Object.freeze({}),
      analysisErrorByKey: Object.freeze({}),
      controlErrorByInstanceId: Object.freeze({}),
      error: null,
      playbackRate: Object.freeze({
        playbackRate: 0.5,
        maximumRate: null,
        calibrating: true,
        userSelected: false,
        performanceLimited: false,
      }),
      ...stateOverrides,
    }),
    sampleStore,
    fixtureProjection: Object.freeze({
      controlValue: () => Object.freeze({
        status: "value" as const,
        value: 1,
      }),
    }),
    periodicPvaDerivation: null,
    captureContinuation: async () => ({ content: snapshotV3().content, surfaceReleaseId: snapshotV3().surfaceReleaseId, activeScenarioId: "scenario/baseline", playing: false, playbackRate: 1 }),
    play: NOOP,
    pause: async () => undefined,
    setPlaybackRate: NOOP,
    selectScenario: NOOP,
    requestAnalysis: async () => undefined,
    applyControl: async () => undefined,
  });
}

describe("Article Reader V3 experiment anchor", () => {
  it("keeps raw exact-orbit PV presentation independent from an available PVA derivation", () => {
    expect(articleReaderPeriodicPvaEnabledV3(true, "raw-exact-orbit")).toBe(
      false,
    );
    expect(articleReaderPeriodicPvaEnabledV3(true, "formal-periodic")).toBe(
      true,
    );
    expect(articleReaderPeriodicPvaEnabledV3(false, "formal-periodic")).toBe(
      false,
    );

    const snapshot = snapshotV3();
    const rawSnapshot: ExperimentSnapshotV2 = {
      ...snapshot,
      content: {
        ...snapshot.content,
        surface: {
          ...snapshot.content.surface,
          graphPanes: [
            {
              paneId: "pane/pv",
              role: "graph",
              label: "PV loop",
              order: 0,
              priority: 10,
              graphId: "graph/pv",
              scenarioScope: { mode: "visible-scenarios" },
              excludedTraces: [],
              historyDepth: 1,
              pressureVolumeAnalysisMode: "raw-exact-orbit",
              series: [{ seriesId: "LV", label: "LV", order: 0 }],
            },
          ],
        },
      },
    };
    const rawBriefing: ExperimentPlacementBriefingV2 = {
      ...briefingV3(),
      graphs: [{ paneId: "pane/pv", order: 0, emphasis: "primary" }],
      outputs: [],
    };
    const rawContract: ModelContractV2 = {
      ...contractV3(),
      graphCatalog: [
        {
          graphId: "graph/pv",
          renderer: "pressure-volume",
          defaultSeriesIds: ["LV"],
          seriesCatalog: [
            {
              kind: "pressure-volume",
              seriesId: "LV",
              volumeOutputId: "output/lv-volume",
              pressureOutputId: "output/lv-pressure",
              pressureBasis: "transmural",
              cyclePhaseOutputId: "output/phase",
            },
          ],
        },
      ],
    };
    expect(
      readerStructuralAnalysisRequestsV3(
        rawBriefing,
        rawSnapshot,
        rawContract,
      ),
    ).toEqual([]);
  });

  it("selects only graph and output-card histories for one Placement", () => {
    const snapshot = snapshotV3();
    const selectedSnapshot: ExperimentSnapshotV2 = {
      ...snapshot,
      content: {
        ...snapshot.content,
        surface: {
          ...snapshot.content.surface,
          graphPanes: [
            {
              paneId: "pane/sweep",
              role: "graph",
              label: "Pressure",
              order: 0,
              priority: 10,
              graphId: "graph/sweep",
              scenarioScope: { mode: "visible-scenarios" },
              excludedTraces: [],
              windowSec: 2,
              series: [
                {
                  seriesId: "series/pressure",
                  label: "Pressure",
                  order: 0,
                },
              ],
            },
          ],
          outputPanes: [],
          controlPanes: [],
          note: { text: "" },
        },
      },
    };
    const contract: ModelContractV2 = {
      ...contractV3(),
      outputCatalog: [
        {
          outputId: "output/pressure",
          kind: "signal",
          unit: "mmHg",
          shape: "scalar",
          sampling: "accepted-step",
        },
        {
          outputId: "output/co",
          kind: "metric",
          unit: "L/min",
          shape: "scalar",
          scope: "instant",
          dependencies: [],
        },
        {
          outputId: "output/vector",
          kind: "metric",
          unit: "1",
          shape: "vector",
          scope: "instant",
          dependencies: [],
        },
      ],
      graphCatalog: [
        {
          graphId: "graph/sweep",
          renderer: "sweep",
          defaultSeriesIds: ["series/pressure"],
          seriesCatalog: [
            {
              kind: "scalar",
              seriesId: "series/pressure",
              outputId: "output/pressure",
            },
          ],
        },
      ],
    };
    const briefing: ExperimentPlacementBriefingV2 = {
      ...briefingV3(),
      graphs: [{ paneId: "pane/sweep", order: 0, emphasis: "primary" }],
      outputs: [
        {
          sourcePaneId: "pane/outputs",
          outputId: "output/co",
          scenarioId: "scenario/comparison",
          label: "CO",
          order: 0,
        },
        {
          sourcePaneId: "pane/outputs",
          outputId: "output/vector",
          scenarioId: "scenario/comparison",
          label: "Vector",
          order: 1,
        },
      ],
    };

    expect(
      [
        ...articleReaderPresentationOutputSelectionV3(
          contract,
          selectedSnapshot,
          briefing,
        ),
      ].sort(),
    ).toEqual(["output/co", "output/pressure"]);
    // A derived output card never becomes an exact intermediate column.
    expect([...articleReaderPresentationOutputSelectionV3(contract, selectedSnapshot, briefing,
      new Set(["output/pressure"]))]).toEqual(["output/pressure"]);
  });

  it("separates in-place Peek maximization from Experiment Session navigation", () => {
    const splitHtml = renderToStaticMarkup(
      <ArticleReaderExperimentPeekPanelV3
        maximized={false}
        title="Hemodynamic comparison"
        onClose={NOOP}
        onOpenExperimentSession={NOOP}
        onToggleMaximized={NOOP}
      >
        <p>Live detail</p>
      </ArticleReaderExperimentPeekPanelV3>,
    );
    const maximizedHtml = renderToStaticMarkup(
      <ArticleReaderExperimentPeekPanelV3
        maximized
        title="Hemodynamic comparison"
        onClose={NOOP}
        onOpenExperimentSession={NOOP}
        onToggleMaximized={NOOP}
        onTitleCommit={NOOP}
      >
        <p>Live detail</p>
      </ArticleReaderExperimentPeekPanelV3>,
    );

    expect(splitHtml).toContain('data-peek-maximized="false"');
    expect(splitHtml).toContain('aria-pressed="false"');
    expect(splitHtml).toContain("その他の操作");
    expect(splitHtml).toContain("広く表示");
    expect(maximizedHtml).toContain('data-peek-maximized="true"');
    expect(maximizedHtml).toContain('aria-pressed="true"');
    expect(maximizedHtml).toContain("記事と並べる");
    expect(maximizedHtml).toContain("その他の操作");
  });

  it("keeps Peek resizing bounded while tracking the divider one-to-one", () => {
    expect(articleReaderPeekFractionForPointerV3(100, 1_000, 600)).toBe(0.5);
    expect(articleReaderPeekFractionForPointerV3(100, 1_000, -500)).toBe(0.64);
    expect(articleReaderPeekFractionForPointerV3(100, 1_000, 1_500)).toBe(0.3);
    expect(clampArticleReaderPeekFractionV3(Number.NaN)).toBe(0.46);
  });

  it("resolves one sealed graph presentation for every Reader extent", () => {
    const snapshot = snapshotV3();
    const pane = snapshot.content.surface.graphPanes[0]!;
    const resolved = resolveArticleReaderGraphPresentationV3(snapshot, {
      paneId: pane.paneId,
      order: 0,
      emphasis: "primary",
      overrides: {
        label: "Reader-facing return",
        legend: "hidden",
        historyDepth: 0,
        windowSec: 4,
        series: [{ seriesId: "series/custom", label: "Custom", order: 0 }],
      },
    });

    expect(resolved).toEqual({
      pane,
      label: "Reader-facing return",
      legend: "hidden",
      historyDepth: 0,
      windowSec: 4,
      series: [{ seriesId: "series/custom", label: "Custom", order: 0 }],
    });
    expect(resolved?.pane.structuralSide).toBe("right");
  });

  it("resolves PV trails consistently for embedded, expanded and restored article graphs", () => {
    const source = snapshotV3();
    const pane = { ...source.content.surface.graphPanes[0]!, pvTrailBeats: 3 };
    const snapshot = { ...source, content: { ...source.content, surface: { ...source.content.surface, graphPanes: [pane] } } };
    const graph = { paneId: pane.paneId, order: 0, emphasis: "primary" as const };
    expect(resolveArticleReaderGraphPresentationV3(snapshot, graph)?.pvTrailBeats).toBe(3);
    for (const pvTrailBeats of [0, 2, 5]) {
      expect(resolveArticleReaderGraphPresentationV3(snapshot, { ...graph, overrides: { pvTrailBeats } })?.pvTrailBeats).toBe(pvTrailBeats);
    }
  });

  it("selects a remaining visible Placement when the active one leaves the viewport", () => {
    expect(
      articleReaderPlacementAfterViewportExitV3("placement/a", "placement/a"),
    ).toBeNull();
    expect(
      articleReaderPlacementAfterViewportExitV3("placement/b", "placement/a"),
    ).toBe("placement/b");
    expect(articleReaderPlacementAfterViewportExitV3("placement/a", "placement/a", ["placement/b", "placement/c"])).toBe("placement/c");
  });

  it("follows the reading area even while the preceding embed remains partly visible", () => {
    const viewport = { top: 60, bottom: 900 };
    expect(articleReaderPlacementInReadingAreaV3([
      { id: "a", top: -346, bottom: 103 }, { id: "b", top: 312, bottom: 882 },
    ], viewport, "a")).toBe("b");
    expect(articleReaderPlacementInReadingAreaV3([
      { id: "a", top: 140, bottom: 670 }, { id: "b", top: 850, bottom: 1420 },
    ], viewport, "b")).toBe("a");
    // Minor scroll/layout jitter does not restart alternating owners.
    expect(articleReaderPlacementInReadingAreaV3([
      { id: "a", top: 40, bottom: 475 }, { id: "b", top: 475, bottom: 910 },
    ], viewport, "a")).toBe("a");
    expect(articleReaderPlacementInReadingAreaV3([{ id: "a", top: 950, bottom: 1300 }], viewport, "a")).toBeNull();
  });

  it("does not let a larger running plot starve a compact entry at the reading position", () => {
    const viewport = { top: 60, bottom: 900 };
    expect(articleReaderPlacementInReadingAreaV3([
      { id: "waiting", top: 180, bottom: 244 }, { id: "running", top: 400, bottom: 950 },
    ], viewport, "running")).toBe("waiting");
    // Once opened, the same placement stays selected through its height change.
    expect(articleReaderPlacementInReadingAreaV3([
      { id: "waiting", top: 180, bottom: 760 }, { id: "running", top: 920, bottom: 1470 },
    ], viewport, "waiting")).toBe("waiting");
  });

  it("prefers the next readable instrument over a thin previous tail, while preserving explicit interaction", () => {
    const viewport = { top: 0, bottom: 800 };
    const placements = [{ id: "a", top: -650, bottom: 120 }, { id: "b", top: 190, bottom: 790 }];
    expect(articleReaderPlacementInReadingAreaV3(placements, viewport, "a")).toBe("b");
    expect(articleReaderPlacementInReadingAreaV3(placements, viewport, "a", "a")).toBe("a");
    expect(articleReaderPlacementInReadingAreaV3([{ id: "b", top: 190, bottom: 790 }], viewport, "a", "a")).toBe("b");
  });

  it("treats history depth zero as no previous structural states", () => {
    const history = ["oldest", "older", "newest"];
    expect(articleReaderBoundedHistoryV3(history, 0)).toEqual([]);
    expect(articleReaderBoundedHistoryV3(history, 1)).toEqual(["newest"]);
    expect(articleReaderBoundedHistoryV3(history, 2)).toEqual([
      "older",
      "newest",
    ]);
  });

  it("derives sweep units from the selected series rather than hidden catalog entries", () => {
    const graph = {
      graphId: "graph/mixed",
      renderer: "sweep" as const,
      defaultSeriesIds: ["series/pressure"],
      seriesCatalog: [
        {
          kind: "scalar" as const,
          seriesId: "series/pressure",
          outputId: "output/pressure",
        },
        {
          kind: "scalar" as const,
          seriesId: "series/flow",
          outputId: "output/flow",
        },
      ],
    };
    const contract: ModelContractV2 = {
      ...contractV3(),
      outputCatalog: [
        {
          outputId: "output/pressure",
          kind: "signal",
          unit: "mmHg",
          shape: "scalar",
          sampling: "accepted-step",
        },
        {
          outputId: "output/flow",
          kind: "signal",
          unit: "mL/s",
          shape: "scalar",
          sampling: "accepted-step",
        },
      ],
    };
    const selectedOutputIds = selectedSweepOutputIdsV3(graph, [
      { seriesId: "series/pressure" },
    ]);

    expect(selectedOutputIds).toEqual(["output/pressure"]);
    expect(commonGraphUnitV3(contract, selectedOutputIds)).toBe("mmHg");
    expect(
      commonGraphUnitV3(
        contract,
        graph.seriesCatalog.map(({ outputId }) => outputId),
      ),
    ).toBeUndefined();
  });

  it("renders a borderless inflow anchor without a second model link", () => {
    const html = renderExperimentV3({
      snapshot: snapshotV3(),
      contract: contractV3(),
    });
    const root = html.match(/^<section[^>]+>/)?.[0];

    expect(root).toContain('data-reader-placement-id="placement/reader"');
    expect(root).toContain('id="placement-placement/reader"');
    expect(root).not.toMatch(/\bborder(?:-|\b)/);
    expect(root).not.toMatch(/\bbg-/);
    expect(html).not.toContain("Live experiment");
    expect(html).not.toContain("MW V3");
    expect(html).toMatch(/<button type="button"[^>]+aria-label="[^"]+"/);
    expect(html.match(/<button type="button"/g)?.length).toBe(1);
    const inflowButton = html.match(
      /<button type="button"[^>]*data-reader-pending="true"[^>]*>.*?<\/button>/s,
    )?.[0];
    expect(inflowButton).toBeDefined();
    expect(inflowButton).not.toMatch(/<(?:div|p)(?:\s|>)/);
  });

  it("renders an exact-model-unavailable explanation without a dead preview button", () => {
    const html = renderExperimentV3({ snapshot: snapshotV3() });

    expect(html).toContain('data-reader-model-unavailable="true"');
    expect(html).not.toContain('data-reader-presentation="peek"');
    expect(html).not.toContain('<button type="button"');
  });

  it("keeps model resolution quiet while the simulation is still loading", () => {
    const html = renderExperimentV3({
      snapshot: snapshotV3(),
      contractAvailability: "loading",
    });

    expect(html).toContain('data-reader-model-loading="true"');
    expect(html).toContain("シミュレーションを準備しています。");
    expect(html).not.toContain('data-reader-model-unavailable="true"');
    expect(html).not.toContain('<button type="button"');
  });

  it("admits one selected graph to the inline live structure", () => {
    const html = renderExperimentV3({
      snapshot: snapshotV3(),
      contract: contractV3(),
      live: true,
    });

    expect(html).toContain('data-reader-placement-live="true"');
    expect(html).toContain('<figure class="min-w-0 rounded-xl bg-wb-canvas');
    expect(html).toContain('data-experiment-graph-presentation="article"');
    expect(html).not.toContain("article-reader-experiment-drawer-v3");
    expect(html).not.toContain("min-w-0 px-4 pb-10");
  });

  it("uses the pinned Standard72 disclosure instead of generic MW V3 copy", () => {
    const baseSnapshot = snapshotV3();
    const snapshot: ExperimentSnapshotV2 = {
      ...baseSnapshot,
      surfaceReleaseId:
        algebraicPulmonaryRootStandard70SurfaceV1.surfaceReleaseId,
      content: {
        ...baseSnapshot.content,
        modelId:
          MAIN_WIRE_INTEGRATED_STUDIO_STANDARD72_MODEL_ID_V1,
        surfaceSeriesId:
          algebraicPulmonaryRootStandard70SurfaceV1.surfaceSeriesId,
      },
    };
    const contract: ModelContractV2 = {
      ...contractV3(),
      modelId:
        MAIN_WIRE_INTEGRATED_STUDIO_STANDARD72_MODEL_ID_V1,
    };
    const html = renderExperimentV3({ snapshot, contract, live: true });

    // Inline keeps only the reading instrument; model disclosure belongs to
    // the opened panel header, so neither legacy label may leak into flow.
    expect(html).not.toContain("シミュレーション情報");
    expect(html).not.toContain("MW 72");
    expect(html).not.toContain("MW V3");
    const panel = renderToStaticMarkup(
      <ArticleReaderExperimentPeekPanelV3
        maximized={false}
        title="Reader experiment"
        onClose={NOOP}
        toolbar={<span>シミュレーション情報</span>}
      >
        <div />
      </ArticleReaderExperimentPeekPanelV3>,
    );
    expect(panel).toContain("シミュレーション情報");
  });

  it("overlays every visible Scenario in one structural comparison canvas", () => {
    const snapshot = snapshotV3();
    const scenarios = snapshot.content.scenarios.slice(0, 2);
    const analysisByKey = Object.fromEntries(
      scenarios.map((scenario) => [
        articleReaderAnalysisKeyV3(
          scenario.scenarioId,
          MAIN_WIRE_INTEGRATED_MODEL_FORMAL_PRESSURE_VOLUME_RELATIONS_V3_ID,
        ),
        structuralAnalysisV3(scenario.scenarioId),
      ]),
    );
    const runtime = readerRuntimeStubV3({ analysisByKey });
    const graph = contractV3().graphCatalog[0]!;
    if (graph.renderer !== "structural-return") {
      throw new Error("expected structural graph");
    }
    const pane = snapshot.content.surface.graphPanes[0]!;

    const html = renderToStaticMarkup(
      <ArticleReaderStructuralReturnGraphV3
        authoredScenarios={snapshot.content.scenarios}
        graph={graph}
        historyDepth={1}
        pane={pane}
        runtime={runtime}
        surface={snapshot.content.surface}
        structuralSide={pane.structuralSide!}
        visibleScenarios={scenarios}
      />,
    );

    expect(
      html.match(
        /data-chart-kind="guyton-starling-structural-orientation-v3"/g,
      ),
    ).toHaveLength(1);
    expect(html).toContain('data-scenario-count="2"');
    expect(html).toContain('data-chart-legend="scenarios"');
    expect(html).toContain(
      'data-reader-structural-scenario-id="scenario/baseline"',
    );
    expect(html).toContain(
      'data-reader-structural-scenario-id="scenario/comparison"',
    );
    expect(html).toContain("Baseline");
    expect(html).toContain("Comparison");
    expect(html).not.toContain("Pmpf orientation");
    expect(html).not.toContain("Refresh analysis");
    expect(html).not.toContain("Open this experiment to start");
  });

  it("omits the structural legend when only one Scenario is visible", () => {
    const snapshot = snapshotV3();
    const scenario = snapshot.content.scenarios[0]!;
    const graph = contractV3().graphCatalog[0]!;
    if (graph.renderer !== "structural-return") {
      throw new Error("expected structural graph");
    }
    const runtime = readerRuntimeStubV3({
      analysisByKey: {
        [articleReaderAnalysisKeyV3(
          scenario.scenarioId,
          MAIN_WIRE_INTEGRATED_MODEL_FORMAL_PRESSURE_VOLUME_RELATIONS_V3_ID,
        )]: structuralAnalysisV3(scenario.scenarioId),
      },
    });
    const html = renderToStaticMarkup(
      <ArticleReaderStructuralReturnGraphV3
        authoredScenarios={snapshot.content.scenarios}
        graph={graph}
        historyDepth={1}
        pane={snapshot.content.surface.graphPanes[0]!}
        runtime={runtime}
        surface={snapshot.content.surface}
        structuralSide="right"
        visibleScenarios={[scenario]}
      />,
    );

    expect(html).toContain('data-scenario-count="1"');
    expect(html).not.toContain('data-chart-legend="scenarios"');
  });

  it.each([0, 1])("honors history depth %i while a Reader structural curve recalculates", (historyDepth) => {
    const snapshot = snapshotV3();
    const scenario = snapshot.content.scenarios[0]!;
    const graph = contractV3().graphCatalog[0]!;
    if (graph.renderer !== "structural-return") {
      throw new Error("expected structural graph");
    }
    const key = articleReaderAnalysisKeyV3(
      scenario.scenarioId,
      MAIN_WIRE_INTEGRATED_MODEL_FORMAL_PRESSURE_VOLUME_RELATIONS_V3_ID,
    );
    const runtime = readerRuntimeStubV3({
      pendingAnalysisKeys: [key],
      analysisHistoryByKey: {
        [key]: [structuralAnalysisV3(scenario.scenarioId)],
      },
    });
    const html = renderToStaticMarkup(
      <ArticleReaderStructuralReturnGraphV3
        authoredScenarios={snapshot.content.scenarios}
        graph={graph}
        historyDepth={historyDepth}
        pane={snapshot.content.surface.graphPanes[0]!}
        runtime={runtime}
        surface={snapshot.content.surface}
        structuralSide="right"
        visibleScenarios={[scenario]}
      />,
    );

    if (historyDepth === 0) {
      expect(html).not.toContain('data-chart-kind="guyton-starling-structural-orientation-v3"');
      return;
    }
    expect(html).toContain(
      'data-chart-kind="guyton-starling-structural-orientation-v3"',
    );
    expect(html).toContain('data-pending-scenario-count="1"');
    expect(html).toContain('data-starling-pending="true"');
    expect(html).toContain('data-stale-scenario-count="1"');
    expect(html).toContain("曲線を更新しています");
    expect(html).toContain('data-simulation-update="true"');
    expect(html).not.toContain('data-simulation-chart-status="true"');
    expect(html).not.toContain('data-chart-history-key="true"');
  });

  it("formats clinical fractions using output identity even when Reader row keys include a pane and Scenario", () => {
    const store = new WorkbenchScenarioPresentationSampleStoreV3();
    const ids = ["hemodynamics.ejection-fraction.LV-event-defined", "oxygen.extraction-ratio.required", "oxygen.delivery-to-consumption-ratio"];
    store.append("scenario/comparison", [{ acceptedTimeSec: 1, acceptedRevision: 1, inputEpoch: 0,
      values: Object.fromEntries(ids.map((id, i) => [id, [0.557, 0.25, 4.25][i]!])) }]);
    const briefing: ExperimentPlacementBriefingV2 = { ...briefingV3(), outputs: ids.map((outputId, order) => ({
      sourcePaneId: "pane/outputs", outputId, scenarioId: "scenario/comparison", label: outputId, order,
    })) };
    const contract: ModelContractV2 = { ...contractV3(), outputCatalog: ids.map(outputId => ({
      outputId, kind: "metric", unit: "1", shape: "scalar", scope: "instant", dependencies: [], significantDigits: 3,
    })) };
    const html = renderToStaticMarkup(<ArticleReaderObservationV3 briefing={briefing} contract={contract} sampleStore={store} />);
    expect(html).toContain("56<span");
    expect(html).toContain("25.0");
    expect(html.match(/%<\/span>/g)).toHaveLength(2);
    expect(html).toContain("4.25");
    expect(html).not.toContain("0.557");
  });

  it("identifies each comparison output by its fixed Scenario instead of the current Reader focus", () => {
    const store = new WorkbenchScenarioPresentationSampleStoreV3();
    const outputId = "hemodynamics.ejection-fraction.LV-event-defined";
    for (const [scenarioId, value] of [["baseline", 0.55], ["higher", 0.65]] as const) {
      store.append(scenarioId, [{ acceptedTimeSec: 1, acceptedRevision: 1, inputEpoch: 0, values: { [outputId]: value } }]);
    }
    const briefing: ExperimentPlacementBriefingV2 = { ...briefingV3(),
      scenarioScope: { visibleScenarioIds: ["baseline", "higher"], initialFocusScenarioId: "higher" },
      outputs: ["baseline", "higher"].map((scenarioId, order) => ({
        sourcePaneId: "pane/outputs", outputId, scenarioId, label: "EF", order,
      })),
    };
    const contract: ModelContractV2 = { ...contractV3(), outputCatalog: [{
      outputId, kind: "metric", unit: "1", shape: "scalar", scope: "instant", dependencies: [], significantDigits: 3,
    }] };
    const html = renderToStaticMarkup(<ArticleReaderObservationV3 briefing={briefing} contract={contract} sampleStore={store}
      scenarioLabels={{ baseline: "基準条件", higher: "張力増加" }} />);
    // Each section is one source pane read for its sealed Scenario; the
    // Scenario name is the section title when the pane label is unavailable.
    expect(html).toContain('class="experiment-observation-scenario">基準条件</span>');
    expect(html).toContain('class="experiment-observation-scenario">張力増加</span>');
    expect(html.match(/data-observation-group=/g)).toHaveLength(2);
    expect(html).toContain("55<span");
    expect(html).toContain("65<span");
  });

  it("uses the shared responsive measurement grid for Reader outputs", () => {
    const store = new WorkbenchScenarioPresentationSampleStoreV3();
    const briefing: ExperimentPlacementBriefingV2 = {
      ...briefingV3(),
      outputs: [
        {
          sourcePaneId: "pane/outputs",
          outputId: "output/co",
          scenarioId: "scenario/comparison",
          label: "CO",
          order: 0,
        },
      ],
    };
    const contract: ModelContractV2 = {
      ...contractV3(),
      outputCatalog: [
        {
          outputId: "output/co",
          kind: "metric",
          unit: "L/min",
          shape: "scalar",
          scope: "instant",
          dependencies: [],
        },
      ],
    };
    const html = renderToStaticMarkup(
      <ArticleReaderObservationV3
        briefing={briefing}
        contract={contract}
        sampleStore={store}
      />,
    );

    expect(html).toContain("grid article-output-grid");
    expect(html).toContain('data-experiment-output-presentation="article"');
    expect(html).toContain("workbench-output-item");
  });

  it("shares AoP progressive disclosure with Article output cards", () => {
    const store = new WorkbenchScenarioPresentationSampleStoreV3();
    const outputId =
      "hemodynamics.pressure.absolute.aortic-proximal-constitutive-port";
    const briefing: ExperimentPlacementBriefingV2 = {
      ...briefingV3(),
      outputs: [
        {
          sourcePaneId: "pane/outputs",
          outputId,
          scenarioId: "scenario/comparison",
          label: "AoP",
          order: 0,
        },
      ],
    };
    const contract: ModelContractV2 = {
      ...contractV3(),
      outputCatalog: [
        {
          outputId,
          kind: "signal",
          unit: "mmHg",
          shape: "scalar",
          sampling: "accepted-step",
        },
      ],
    };
    const html = renderToStaticMarkup(
      <ArticleReaderObservationV3
        briefing={briefing}
        contract={contract}
        sampleStore={store}
      />,
    );

    expect(html).toContain(">AoP（近位）<");
    expect(html).toContain('aria-label="AoP（近位）の説明"');
    expect(html).toContain('data-testid="output-value-context-v3"');
    expect(html).toContain('data-testid="workbench-item-description-trigger-v3"');
  });

  it("reuses the same formal projection across Reader outputs, live frames, and Workbench graphs", () => {
    const source = structuralAnalysisV3("scenario/comparison");
    const right = structuralReturnOrientationFromPayloadV3(source.payload, "right")!;
    const analysis = { ...source, payload: { status: "available", right, left: { ...right, side: "left" } } };
    const build = vi.fn(buildMainWirePeriodicPvaMethodV16);
    const derivation = { methodId: MAIN_WIRE_PERIODIC_PVA_METHOD_V16_ID, sourceAnalysisId: analysis.analysisId, build };
    const runtime = {
      ...readerRuntimeStubV3({ analysisByKey: { [articleReaderAnalysisKeyV3(analysis.scenarioId, analysis.analysisId)]: analysis } }),
      periodicPvaDerivation: derivation,
    };
    const briefing = { ...briefingV3(), outputs: Object.values(MAIN_WIRE_PERIODIC_PVA_OUTPUT_IDS_V1).map((outputId, order) => ({
      sourcePaneId: "pane/energetics", outputId, scenarioId: analysis.scenarioId, label: outputId, order,
    })) };
    const render = () => renderToStaticMarkup(<ArticleReaderObservationV3 briefing={briefing} contract={contractV3()} runtime={runtime} />);
    render();
    // Several energetics outputs consume one immutable measurement, not one
    // expensive fit per output or per new exact presentation frame.
    expect(build).toHaveBeenCalledTimes(1);
    const projected = periodicPvaFromAnalysisV3(analysis, "left", derivation);
    for (let frame = 1; frame <= 3; frame += 1) {
      runtime.sampleStore.append(analysis.scenarioId, [{ acceptedTimeSec: frame, acceptedRevision: frame, inputEpoch: 0, values: {} }]);
      render();
      expect(periodicPvaFromAnalysisV3(analysis, "left", derivation)).toBe(projected);
    }
    expect(build).toHaveBeenCalledTimes(1);

    // A new measurement/progress object, the other ventricle, or a different
    // pinned method must not reuse the prior projection.
    periodicPvaFromAnalysisV3({ ...analysis, inputEpoch: 1 }, "left", derivation);
    periodicPvaFromAnalysisV3(analysis, "right", derivation);
    periodicPvaFromAnalysisV3(analysis, "left", { ...derivation, methodId: "test/other-method" });
    expect(build).toHaveBeenCalledTimes(4);
  });

  it("does not retry an invalid formal projection on every live frame", () => {
    const analysis = structuralAnalysisV3("scenario/comparison");
    const build = vi.fn<typeof buildMainWirePeriodicPvaMethodV16>(() => { throw new Error("invalid fit"); });
    const derivation = { methodId: "test/failed-projection", build };
    expect(periodicPvaFromAnalysisV3(analysis, "right", derivation)).toBeUndefined();
    expect(periodicPvaFromAnalysisV3(analysis, "right", derivation)).toBeUndefined();
    expect(build).toHaveBeenCalledTimes(1);
    periodicPvaFromAnalysisV3({ ...analysis, inputEpoch: 1 }, "right", derivation);
    expect(build).toHaveBeenCalledTimes(2);
  });

  it("requests the shared settled relation analysis for output-only PVA briefings", () => {
    const briefing: ExperimentPlacementBriefingV2 = {
      ...briefingV3(),
      graphs: [],
      outputs: [
        {
          sourcePaneId: "pane/outputs",
          outputId:
            MAIN_WIRE_PERIODIC_PVA_OUTPUT_IDS_V1.pressureVolumeAreaMilliJoule,
          scenarioId: "scenario/comparison",
          label: "PVA",
          order: 0,
        },
      ],
    };

    expect(
      readerStructuralAnalysisRequestsV3(briefing, snapshotV3(), contractV3()),
    ).toEqual([
      {
        analysisId:
          MAIN_WIRE_INTEGRATED_MODEL_FORMAL_PRESSURE_VOLUME_RELATIONS_V3_ID,
        historyDepth: 0,
      },
    ]);
  });

  it("disables authored control buttons outside the registered step lattice", () => {
    const definition: ControlDefinitionV2 = {
      controlId: "control/svr",
      valueType: "number",
      unit: "WU",
      minimum: 0,
      maximum: 2,
      step: 1,
      defaultValue: 1,
      changeSemantics: "accepted-state-warm-start",
    };
    const briefing: ExperimentPlacementBriefingV2 = {
      ...briefingV3(),
      controls: [
        {
          sourcePaneId: "pane/controls",
          controlId: "control/svr",
          label: "SVR",
          order: 0,
          presentation: {
            kind: "buttons",
            options: [
              { label: "Valid", value: 1 },
              { label: "Invalid", value: 1.25 },
            ],
          },
          binding: {
            mode: "fixed",
            scenarioIds: ["scenario/comparison"],
            application: "absolute",
          },
        },
      ],
    };
    const html = renderToStaticMarkup(
      <ArticleReaderControlV3
        briefing={briefing}
        control={briefing.controls[0]!}
        definition={definition}
        runtime={readerRuntimeStubV3({
          activeScenarioId: "scenario/comparison",
        })}
        snapshot={snapshotV3()}
      />,
    );

    const invalidButton = html.match(/<button[^>]*>Invalid<\/button>/)?.[0];
    expect(html).toContain("workbench-control-row");
    expect(html).toContain("workbench-control-segments");
    expect(invalidButton).toContain("disabled");
    expect(invalidButton).toContain("step lattice");
  });

  it("discloses a cold-restart clock replacement in Article controls", () => {
    const definition: ControlDefinitionV2 = {
      controlId: "rhythm.heart-rate-bpm",
      valueType: "number",
      unit: "bpm",
      minimum: 30,
      maximum: 180,
      step: 1,
      defaultValue: 75,
      changeSemantics: "cold-restart",
    };
    const briefing: ExperimentPlacementBriefingV2 = {
      ...briefingV3(),
      controls: [
        {
          sourcePaneId: "pane/controls",
          controlId: definition.controlId,
          label: "Heart rate (HR)",
          order: 0,
          presentation: { kind: "slider" },
          binding: {
            mode: "fixed",
            scenarioIds: ["scenario/comparison"],
            application: "absolute",
          },
        },
      ],
    };
    const html = renderToStaticMarkup(
      <ArticleReaderControlV3
        briefing={briefing}
        control={briefing.controls[0]!}
        definition={definition}
        runtime={readerRuntimeStubV3({
          activeScenarioId: "scenario/comparison",
        })}
        snapshot={snapshotV3()}
      />,
    );

    expect(html).toContain('aria-label="HRの説明"');
    expect(html).toContain('data-testid="workbench-item-description-trigger-v3"');
  });

  it("keeps a primary observation Inflow and offers supporting graphs in Peek", () => {
    const html = renderExperimentV3({
      block: twoGraphBlockV3(),
      snapshot: twoGraphSnapshotV3(),
      contract: contractV3(),
      live: true,
    });

    expect(html).toContain('data-reader-presentation="inflow"');
    expect(html).toContain("<figure");
    expect(html).toContain("data-reader-open-details");
    expect(html).not.toContain("article-reader-peek-anchor");

  });

  it("renders the dedicated exact-Snapshot view inline instead of running behind an anchor", () => {
    const html = renderExperimentV3({
      block: twoGraphBlockV3(),
      snapshot: twoGraphSnapshotV3(),
      contract: contractV3(),
      live: true,
      forceInline: true,
    });

    expect(html).toContain("<figure");
    expect(html).not.toContain('data-reader-presentation="peek"');
    // The stage paints one sealed view at a time; the second graph is one tab away.
    expect(html.match(/data-reader-graph-render-active=/g)).toHaveLength(1);
    expect(html).toContain('data-testid="article-reader-stage-rail-v3"');
    expect(html.match(/role="tab"/g)).toHaveLength(2);
    expect(html).not.toContain("data-reader-open-details");
  });

  it("renders only the authored Briefing Scenario scope and focuses its initial Scenario", () => {
    const html = renderExperimentV3({
      snapshot: snapshotV3(),
      contract: contractV3(),
      live: true,
    });

    expect(html).not.toContain(">Comparison</button>");
    expect(html).toContain('data-reader-structural-scenario-count="1"');
    expect(html).not.toContain(">Baseline</button>");
    expect(html).not.toContain(">Excluded</button>");
  });

  it("fails closed when the pinned Snapshot cannot be resolved", () => {
    const html = renderExperimentV3({
      snapshot: null,
      contract: contractV3(),
      live: true,
    });

    expect(html).toContain('role="alert"');
    expect(html).toContain('data-reader-placement-id="placement/reader"');
    expect(html).not.toContain("data-reader-placement-live");
    expect(html).not.toContain("<figure");
    expect(html).not.toContain('<button type="button"');
  });

  it("fails only the inconsistent Placement closed instead of crashing the Article", () => {
    const block = blockV3();
    const snapshot = snapshotV3();
    const html = renderExperimentV3({
      block: {
        ...block,
        placement: {
          ...block.placement,
          briefing: {
            ...block.placement.briefing,
            graphs: [
              {
                paneId: "pane/missing",
                order: 0,
                emphasis: "primary",
              },
            ],
          },
        },
      },
      snapshot,
      contract: contractV3(),
      live: true,
    });

    expect(html).toContain('role="alert"');
    expect(html).toContain('data-reader-placement-id="placement/reader"');
    expect(html).not.toContain("data-reader-placement-live");
    expect(html).not.toContain("<figure");
  });
});

describe("Article Reader V3 sealed-state analysis policy", () => {
  it.each(["inline", "peek", "sheet", "workbench"] as const)(
    "keeps output-only analysis recovery reachable in %s",
    (layout) => {
      const briefing = { ...briefingV3(), graphs: [], outputs: [{
        sourcePaneId: "pane/outputs", outputId: MAIN_WIRE_PERIODIC_PVA_OUTPUT_IDS_V1.pressureVolumeAreaMilliJoule,
        scenarioId: "scenario/comparison", label: "PVA", order: 0,
      }] };
      const render = (runtime: UseArticleReaderLiveRuntimeResultV3) => renderToStaticMarkup(
        <ArticleReaderEmbedSurfaceV3
          analysisRecompute="on-request" briefing={briefing} contract={contractV3()}
          layout={layout} runtime={{ ...runtime, periodicPvaDerivation: {
            methodId: MAIN_WIRE_PERIODIC_PVA_METHOD_V16_ID,
            sourceAnalysisId: MAIN_WIRE_INTEGRATED_MODEL_FORMAL_PRESSURE_VOLUME_RELATIONS_V3_ID,
            build: buildMainWirePeriodicPvaMethodV16,
          } }} snapshot={snapshotV3()}
        />,
      );
      expect(render(readerRuntimeStubV3({ changedScenarioIds: ["scenario/comparison"] })))
        .toContain("data-reader-recompute-analysis");
      const key = articleReaderAnalysisKeyV3("scenario/comparison", MAIN_WIRE_INTEGRATED_MODEL_FORMAL_PRESSURE_VOLUME_RELATIONS_V3_ID);
      const failed = render(readerRuntimeStubV3({ analysisErrorByKey: { [key]: "measurement failed" } }));
      expect(failed).toContain('data-reader-analysis-state="error"');
      expect(failed).toContain(i18n.t("articleReader.retryAnalysis"));
      expect(failed).toContain("data-reader-recompute-analysis");
    },
  );

  it("lists the Scenarios whose Surface-pinned analysis the Briefing displays", () => {
    expect(articleReaderAnalysisScenarioIdsV3(briefingV3(), snapshotV3(), contractV3(), true))
      .toEqual(["scenario/comparison"]);
    expect(articleReaderAnalysisScenarioIdsV3({ ...briefingV3(), graphs: [] }, snapshotV3(), contractV3(), true))
      .toEqual([]);
    expect(articleReaderAnalysisScenarioIdsV3({ ...briefingV3(), graphs: [], outputs: [{
      sourcePaneId: "pane/outputs", outputId: MAIN_WIRE_PERIODIC_PVA_OUTPUT_IDS_V1.pressureVolumeAreaMilliJoule,
      scenarioId: "scenario/comparison", label: "PVA", order: 0,
    }] }, snapshotV3(), contractV3(), true)).toEqual(["scenario/comparison"]);
  });

  it("stays silent while the sealed state is measured automatically, then asks the reader after a control change", () => {
    const analysisId = MAIN_WIRE_INTEGRATED_MODEL_FORMAL_PRESSURE_VOLUME_RELATIONS_V3_ID;
    const key = articleReaderAnalysisKeyV3("scenario/comparison", analysisId);
    const render = (runtime: UseArticleReaderLiveRuntimeResultV3, auto: readonly string[]) => renderToStaticMarkup(
      <ArticleReaderAnalysisStatusV3
        analysisAutoScenarioIds={new Set(auto)}
        briefing={briefingV3()}
        contract={contractV3()}
        runtime={runtime}
        snapshot={snapshotV3()}
      />,
    );
    // Sealed state, not yet measured: the graph requests it itself; nothing to decide.
    expect(render(readerRuntimeStubV3(), ["scenario/comparison"])).toBe("");
    // Measuring: progress, no button.
    const pending = render(readerRuntimeStubV3({ pendingAnalysisKeys: [key] }), ["scenario/comparison"]);
    expect(pending).toContain('data-reader-analysis-state="pending"');
    expect(pending).not.toContain("data-reader-recompute-analysis");
    // Changed by a control under the on-request policy: stale, with an explicit re-measure action.
    const stale = render(readerRuntimeStubV3({ changedScenarioIds: ["scenario/comparison"] }), []);
    expect(stale).toContain('data-reader-analysis-state="stale"');
    expect(stale).toContain('data-reader-analysis-stale-scenarios="scenario/comparison"');
    expect(stale).toContain("data-reader-recompute-analysis");
    // Same change under the automatic policy: the graph re-requests; nothing to decide.
    expect(render(readerRuntimeStubV3({ changedScenarioIds: ["scenario/comparison"] }), ["scenario/comparison"])).toBe("");
    // A present result is fresh regardless of policy.
    expect(render(readerRuntimeStubV3({ changedScenarioIds: ["scenario/comparison"],
      analysisByKey: { [key]: structuralAnalysisV3("scenario/comparison") } }), [])).toBe("");
  });

  it("names the update target without describing live measurements as stale", () => {
    const base = briefingV3();
    const derived = { sourcePaneId: "pane/outputs", outputId: MAIN_WIRE_PERIODIC_PVA_OUTPUT_IDS_V1.pressureVolumeAreaMilliJoule,
      scenarioId: "scenario/comparison", label: "PVA", order: 0 };
    const render = (briefing: ExperimentPlacementBriefingV2) => renderToStaticMarkup(
      <ArticleReaderAnalysisStatusV3 analysisAutoScenarioIds={new Set()} briefing={briefing} contract={contractV3()}
        runtime={readerRuntimeStubV3({ changedScenarioIds: ["scenario/comparison"] })} snapshot={snapshotV3()} />,
    );
    expect(render({ ...base, outputs: [] })).toContain(i18n.t("articleReader.refreshCurves"));
    expect(render({ ...base, graphs: [], outputs: [derived] })).toContain(i18n.t("articleReader.refreshAnalysisValues"));
    const both = render({ ...base, outputs: [derived] });
    expect(both).toContain(i18n.t("articleReader.refreshCurvesAndValues"));
    expect(both).toContain('aria-describedby=');
    expect(both).not.toContain('<svg');
    expect(render({ ...base, graphs: [] })).toBe("");
  });

  it("titles output sections by their source pane and lays compared panes side by side", () => {
    const store = new WorkbenchScenarioPresentationSampleStoreV3();
    const outputId = "hemodynamics.stroke-volume.LV-event-defined";
    store.append("scenario/baseline", [{ acceptedTimeSec: 1, acceptedRevision: 1, inputEpoch: 0, values: { [outputId]: 70 } }]);
    store.append("scenario/comparison", [{ acceptedTimeSec: 1, acceptedRevision: 1, inputEpoch: 0, values: { [outputId]: 90 } }]);
    const snapshot: ExperimentSnapshotV2 = { ...snapshotV3(), content: { ...snapshotV3().content, surface: {
      ...snapshotV3().content.surface,
      outputPanes: [
        { paneId: "pane/valves", role: "output", label: "弁関連", order: 0, priority: 2, binding: { mode: "fixed", scenarioId: "scenario/baseline" }, items: [{ outputId, label: "SV", order: 0 }] },
        { paneId: "pane/valves-b", role: "output", label: "弁関連（比較）", order: 1, priority: 1, binding: { mode: "fixed", scenarioId: "scenario/comparison" }, items: [{ outputId, label: "SV", order: 0 }] },
      ],
    } } };
    const briefing: ExperimentPlacementBriefingV2 = { ...briefingV3(),
      scenarioScope: { visibleScenarioIds: ["scenario/baseline", "scenario/comparison"], initialFocusScenarioId: "scenario/baseline" },
      outputs: [
        { sourcePaneId: "pane/valves", outputId, scenarioId: "scenario/baseline", label: "SV", order: 0 },
        { sourcePaneId: "pane/valves-b", outputId, scenarioId: "scenario/comparison", label: "SV", order: 1 },
      ],
    };
    const contract: ModelContractV2 = { ...contractV3(), outputCatalog: [{
      outputId, kind: "metric", unit: "mL", shape: "scalar", scope: "instant", dependencies: [], significantDigits: 3,
    }] };
    const html = renderToStaticMarkup(<ArticleReaderObservationV3 briefing={briefing} contract={contract} sampleStore={store}
      snapshot={snapshot} scenarioLabels={{ "scenario/baseline": "Baseline", "scenario/comparison": "Comparison" }} />);
    expect(html.match(/data-observation-group=/g)).toHaveLength(2);
    expect(html).toContain('class="experiment-observation-title">弁関連</span>');
    expect(html).toContain('class="experiment-observation-scenario">Baseline</span>');
    expect(html).toContain("弁関連（比較）");
    expect(html).toContain("70<span");
    expect(html).toContain("90<span");
  });
});

const A_OUTPUTS = Array.from({ length: 12 }, (_, index) => `output/a${index + 1}`);
const B_OUTPUTS = Array.from({ length: 8 }, (_, index) => `output/b${index + 1}`);

/** Two output panes with different measurement sets (A: 12 at Scenario a, B: 8 at Scenario b). */
function observationSnapshotV3(): ExperimentSnapshotV2 {
  const scenario = (scenarioId: string, label: string) => ({
    scenarioId, label, capture: { fixture: {}, checkpoint: { acceptedRevision: 1, acceptedTimeSec: 0, payload: {} } },
  });
  const outputPane = (paneId: string, label: string, order: number, scenarioId: string, outputIds: readonly string[]) => ({
    paneId, role: "output" as const, label, order, priority: 10 - order,
    binding: { mode: "fixed" as const, scenarioId },
    items: outputIds.map((outputId, itemOrder) => ({ outputId, label: outputId.split("/")[1]!.toUpperCase(), order: itemOrder })),
  });
  return validateExperimentSnapshotV2({
    schemaId: STUDIO_EXPERIMENT_SNAPSHOT_V2_SCHEMA_ID,
    snapshotId: "snapshot/observation",
    surfaceReleaseId: STANDARD_TEST_SURFACE_RELEASE_ID_V1,
    createdAt: "2026-09-19T00:00:00.000Z",
    content: {
      modelId: STANDARD_TEST_RELEASE_TICKET_V1.modelId,
      surfaceSeriesId: STANDARD_TEST_SURFACE_SERIES_ID_V1,
      scenarios: [scenario("scenario/a", "基準"), scenario("scenario/b", "TBV +1000")],
      surface: {
        graphPanes: [{
          paneId: "pane/pv", role: "graph", label: "PV", order: 0, priority: 1, graphId: "graph/pv",
          scenarioScope: { mode: "visible-scenarios" }, excludedTraces: [], historyDepth: 1, series: [],
        }],
        outputPanes: [
          outputPane("pane/a", "基準", 0, "scenario/a", A_OUTPUTS),
          outputPane("pane/b", "弁", 1, "scenario/b", B_OUTPUTS),
        ],
        controlPanes: [
          {
            paneId: "pane/controls-a", role: "control", label: "基準を操作", order: 0, priority: 2,
            binding: { mode: "fixed", scenarioIds: ["scenario/a"] },
            items: [
              { controlId: "control/tbv", label: "TBV", order: 0, presentation: { kind: "slider" } },
              { controlId: "control/svr", label: "SVR", order: 1, presentation: { kind: "slider" } },
            ],
          },
          {
            paneId: "pane/controls-b", role: "control", label: "TBV +1000 を操作", order: 1, priority: 1,
            binding: { mode: "fixed", scenarioIds: ["scenario/b"] },
            items: [{ controlId: "control/tbv", label: "TBV", order: 0, presentation: { kind: "slider" } }],
          },
        ],
        note: { text: "" },
      },
    },
  });
}

function observationContractV3(): ModelContractV2 {
  return {
    modelId: STANDARD_TEST_RELEASE_TICKET_V1.modelId,
    modelFamilyId: STANDARD_TEST_RELEASE_TICKET_V1.manifest.modelFamilyId,
    displayName: "Observation model",
    fixtureSchemaId: STANDARD_TEST_RELEASE_TICKET_V1.manifest.fixtureSchema.fixtureSchemaId,
    checkpointCodecId: STANDARD_TEST_RELEASE_TICKET_V1.manifest.checkpointCodec.checkpointCodecId,
    snapshotGateId: "gate/observation",
    controlCatalog: [],
    outputCatalog: [...A_OUTPUTS, ...B_OUTPUTS].map((outputId) => ({
      outputId, kind: "metric", unit: "mL", shape: "scalar", scope: "instant", dependencies: [], significantDigits: 3,
    })),
    graphCatalog: [],
  };
}

/** A Briefing sealed before item emphasis existed: every item without a mark. */
function legacyBriefingV3(): ExperimentPlacementBriefingV2 {
  const sealed = defaultArticleBriefingV3(observationSnapshotV3(), "scenario/a", "Observation");
  return {
    ...sealed,
    outputs: sealed.outputs.map(({ emphasis: _emphasis, ...output }) => output),
    controls: sealed.controls.map(({ emphasis: _emphasis, ...control }) => control),
  };
}

const observedKey = (paneId: string, outputId: string, scenarioId: string) => articleBriefingOutputKeyV3({ sourcePaneId: paneId, outputId, scenarioId });
const keyA = (index: number) => observedKey("pane/a", `output/a${index}`, "scenario/a");
const keyB = (index: number) => observedKey("pane/b", `output/b${index}`, "scenario/b");

describe("Article Briefing observation", () => {
  it("shares one bounded default across groups instead of ranking every item", () => {
    expect(ARTICLE_OBSERVATION_DEFAULT_BUDGET_V3).toBe(6);
    expect(defaultObservedItemKeysV3([{ keys: ["a1", "a2", "a3", "a4"] }, { keys: ["b1", "b2", "b3", "b4"] }]))
      .toEqual(["a1", "a2", "a3", "b1", "b2", "b3"]);
    expect(defaultObservedItemKeysV3([{ keys: ["a1", "a2", "a3"] }, { keys: ["b1", "b2", "b3"] }, { keys: ["c1", "c2", "c3"] }]))
      .toEqual(["a1", "a2", "b1", "b2", "c1", "c2"]);
    // Every group keeps at least one item even beyond the budget; empty groups are skipped.
    expect(defaultObservedItemKeysV3(Array.from({ length: 7 }, (_, i) => ({ keys: [`g${i}`, `g${i}x`] })))).toHaveLength(7);
    expect(defaultObservedItemKeysV3([{ keys: [] }, { keys: ["b1", "b2", "b3", "b4", "b5", "b6", "b7"] }])).toEqual(["b1", "b2", "b3", "b4", "b5", "b6"]);
    expect(defaultObservedItemKeysV3([])).toEqual([]);
  });

  it("derives a legacy observation per source pane and Scenario, and reads the first controller pane", () => {
    const legacy = legacyBriefingV3();
    expect(articleBriefingPrimaryOutputKeysV3(legacy)).toEqual([keyA(1), keyA(2), keyA(3), keyB(1), keyB(2), keyB(3)]);
    expect(articleBriefingPrimaryControlKeysV3(legacy)).toEqual([
      articleBriefingControlKeyV3({ sourcePaneId: "pane/controls-a", controlId: "control/tbv" }),
      articleBriefingControlKeyV3({ sourcePaneId: "pane/controls-a", controlId: "control/svr" }),
    ]);
  });

  it("keeps an explicit observation such as A2, B2 and B3 across different measurement sets", () => {
    const legacy = legacyBriefingV3();
    const briefing: ExperimentPlacementBriefingV2 = {
      ...legacy,
      outputs: withExplicitItemEmphasisV3(legacy.outputs, new Set([keyB(3), keyA(2), keyB(2)]), (output) => articleBriefingOutputKeyV3(output)),
      controls: withExplicitItemEmphasisV3(legacy.controls, new Set(), (control) => articleBriefingControlKeyV3(control)),
    };
    expect(articleBriefingPrimaryOutputKeysV3(briefing)).toEqual([keyA(2), keyB(2), keyB(3)]);
    expect(briefing.outputs.filter((output) => output.emphasis === "supporting")).toHaveLength(17);
    // An explicit all-supporting seal is an empty observation, not the legacy default.
    expect(articleBriefingPrimaryControlKeysV3(briefing)).toEqual([]);
    expect(articleBriefingPrimaryOutputKeysV3({ outputs: briefing.outputs.map((output) => ({ ...output, emphasis: "supporting" as const })) })).toEqual([]);
  });

  it("seals explicit emphasis by default, validates it, and carries it through re-capture", () => {
    const snapshot = observationSnapshotV3();
    const sealed = defaultArticleBriefingV3(snapshot, "scenario/a", "Observation");
    expect(sealed.outputs.every((output) => output.emphasis !== undefined)).toBe(true);
    expect(sealed.outputs.filter((output) => output.emphasis === "primary").map(articleBriefingOutputKeyV3))
      .toEqual([keyA(1), keyA(2), keyA(3), keyB(1), keyB(2), keyB(3)]);
    expect(sealed.controls.map((control) => control.emphasis)).toEqual(["primary", "primary", "supporting"]);
    expect(validateExperimentPlacementBriefingV2(sealed, snapshot.content)).toEqual(sealed);
    expect(() => validateExperimentPlacementBriefingV2({
      ...sealed, outputs: [{ ...sealed.outputs[0]!, emphasis: "hero" as never }, ...sealed.outputs.slice(1)],
    }, snapshot.content)).toThrow(/emphasis.*must be primary or supporting/);
    const legacy = legacyBriefingV3();
    expect(validateExperimentPlacementBriefingV2(legacy, snapshot.content)).toEqual(legacy);
    const recaptured = reconcileWorkbenchBriefingV3({ briefing: sealed, preferredFocusScenarioId: "scenario/a", snapshot });
    expect(recaptured.outputs.map((output) => output.emphasis)).toEqual(sealed.outputs.map((output) => output.emphasis));
    expect(recaptured.controls.map((control) => control.emphasis)).toEqual(sealed.controls.map((control) => control.emphasis));
  });
});

describe("Article Reader observation rendering", () => {
  const storeV3 = () => {
    const store = new WorkbenchScenarioPresentationSampleStoreV3();
    store.append("scenario/a", [{ acceptedTimeSec: 1, acceptedRevision: 1, inputEpoch: 0,
      values: Object.fromEntries(A_OUTPUTS.map((id, index) => [id, 100 + index])) }]);
    store.append("scenario/b", [{ acceptedTimeSec: 1, acceptedRevision: 1, inputEpoch: 0,
      values: Object.fromEntries(B_OUTPUTS.map((id, index) => [id, 200 + index])) }]);
    return store;
  };

  it("shows only the observed outputs grouped by pane and Scenario, naming each once, without dashes for the rest", () => {
    const briefing = legacyBriefingV3();
    const html = renderToStaticMarkup(
      <ArticleReaderObservationV3
        briefing={briefing}
        contract={observationContractV3()}
        sampleStore={storeV3()}
        snapshot={observationSnapshotV3()}
        observedKeys={[keyA(2), keyB(2), keyB(3)]}
        scenarioLabels={{ "scenario/a": "基準", "scenario/b": "TBV +1000" }}
        scenarioColor={(scenarioId) => scenarioId === "scenario/a" ? "#aa0000" : "#0000aa"}
      />,
    );
    expect(html).toContain('data-reader-observed-count="3"');
    expect(html.match(/class="workbench-output-item/g)).toHaveLength(3);
    // Two groups: pane 基準 at Scenario 基準 (one name), pane 弁 at TBV +1000 (pane and Scenario).
    expect(html.match(/data-observation-group=/g)).toHaveLength(2);
    expect(html.match(/experiment-observation-heading"/g)).toHaveLength(2);
    expect(html.match(/基準/g)).toHaveLength(1);
    expect(html.match(/TBV \+1000/g)).toHaveLength(1);
    expect(html).toContain('<span class="experiment-observation-title">弁</span>');
    expect(html).toContain("101<span");
    expect(html).toContain("201<span");
    expect(html).toContain("202<span");
    expect(html).not.toContain("100<span");
    expect(html).not.toContain("—");
    // Observation tiles are display only; selection lives in the reference.
    expect(html).not.toContain("aria-pressed");
  });

  it("renders every sealed output once when expanded, retaining each pane and fixed Scenario", () => {
    const briefing = legacyBriefingV3();
    const html = renderToStaticMarkup(
      <ArticleReaderObservationV3
        briefing={briefing}
        contract={observationContractV3()}
        sampleStore={storeV3()}
        snapshot={observationSnapshotV3()}
        scenarioLabels={{ "scenario/a": "基準", "scenario/b": "TBV +1000" }}
      />,
    );
    expect(html.match(/data-observation-group=/g)).toHaveLength(2);
    expect(html).toContain("弁");
    expect(html.match(/class="workbench-output-item/g)).toHaveLength(20);
    expect(html).not.toContain("aria-pressed");
    // Each tile keeps its sealed Scenario in its identity; the reference never renames a value.
    expect(html).toContain(`data-output-id="${keyB(2)}"`);
  });

  it("renders editor emphasis toggles from the effective observation and a phone-width preview", () => {
    const snapshot = observationSnapshotV3();
    const legacy = legacyBriefingV3();
    const html = renderToStaticMarkup(
      <ArticleBriefingEditorV3 snapshot={snapshot} briefing={legacy} onChange={() => undefined} />,
    );
    expect(html.match(/data-briefing-output-primary="true"/g)).toHaveLength(6);
    expect(html.match(/data-briefing-output-primary="false"/g)).toHaveLength(14);
    expect(html.match(/data-briefing-control-primary="true"/g)).toHaveLength(2);
    expect(html).toContain('data-testid="article-briefing-phone-preview-v3"');
    expect(html).toContain('data-primary-outputs="6"');
    expect(html).toContain('data-primary-controls="2"');
  });

  it("keeps the same observation strip in the Workbench phone shell from shared tiles", () => {
    const pane = (paneId: string, title: string) => ({ paneId, title, role: "output" as const });
    const items = (prefix: string, count: number) => Array.from({ length: count }, (_, i) => ({
      itemId: `${prefix}${i + 1}`, outputId: `${prefix}${i + 1}`, label: `${prefix}${i + 1}`.toUpperCase(), value: i,
      unit: "mL", availability: "available", quality: "assessed",
    }));
    const reading = (paneId: string, prefix: string, count: number, scenario: string) => ({
      paneId, title: scenario === "弁" ? "弁" : "出力", bindingMode: prefix === "a" ? "active-slot" as const : "fixed" as const,
      scenarioId: `scenario/${prefix}`, measured: items(prefix, count), memory: new WorkbenchLastMeasuredOutputsV1(),
      previousValueNotice: "old", scenario: { label: prefix === "a" ? "基準" : "TBV +1000", colorHex: "#123456" },
    });
    const render = (expanded: boolean) => renderToStaticMarkup(
      <WorkbenchMobileStageDeckV3
        graphPanes={[]}
        outputPanes={[pane("pane/a", "基準"), pane("pane/b", "弁")]}
        controlPanes={[]}
        graphAddOptions={[]}
        scenarioContent={null}
        renderGraphPane={() => null}
        readOutputPane={(candidate) => candidate.paneId === "pane/a" ? reading("pane/a", "a", 12, "基準") : reading("pane/b", "b", 8, "弁")}
        renderOutputPane={() => null}
        outputsExpanded={expanded}
        onOutputsExpandedChange={() => undefined}
        renderControlPane={() => null}
        onOpenPaneSettings={() => undefined}
        onAddGraphPane={() => undefined}
        onAddOutputPane={() => undefined}
        onAddControlPane={() => undefined}
      />,
    );
    const html = render(false);
    expect(html).toContain('data-testid="workbench-mobile-observation"');
    expect(html).toContain('data-observed-count="6"');
    // One heading per pane: the following pane says so beside its Scenario; the fixed pane just names it.
    expect(html.match(/data-observation-group=/g)).toHaveLength(2);
    expect(html).toContain('<span class="experiment-observation-following" data-observation-following="true">連動</span>基準');
    expect(html).toContain('<span class="experiment-observation-title">弁</span>');
    expect(html).not.toContain("data-output-scenario");
    // The graph tabs read above the graph; the control tab is active by default and the strip stays outside the tabs.
    expect(html.indexOf('data-testid="workbench-mobile-graph-view-rail"')).toBeLessThan(html.indexOf("-graph-panel"));
    expect(html).toContain('data-mobile-pane-groups="control"');
    expect(html).not.toContain("data-output-selection");
    expect(html).not.toContain("workbench-output-toggle");
    expect(html).toContain('data-workbench-output-expand="true"');
    // Expanded values replace the compact reading; pane composition stays the source of truth.
    const expanded = render(true);
    expect(expanded).toContain('data-observed-count="20"');
    expect(expanded.match(/data-output-id=/g)).toHaveLength(20);
    expect(expanded).toContain(`data-output-id="${workbenchObservedOutputKeyV3("pane/b", "b8")}"`);
    expect(expanded).not.toContain("data-output-selection");
    expect(expanded).toContain('data-mobile-pane-groups="control"');
  });

  it("omits a lone reading heading even among graph Scenarios, retaining distinctions between multiple groups", () => {
    const item = (sourcePaneId: string, scenarioId: string, outputId: string) => ({
      itemId: `${sourcePaneId}/${outputId}/${scenarioId}`, outputId, sourcePaneId, scenarioId, label: outputId, value: 1, unit: "mL",
    });
    const naming = (multiScenario: boolean, labels: Record<string, string | undefined>) => ({
      multiScenario, paneLabel: (paneId: string) => labels[paneId], scenarioLabel: (scenarioId: string) => scenarioId === "s/a" ? "基準" : "TBV +500", scenarioColor: () => "#000",
    });
    // One pane, one Scenario, title equal to the Scenario: hidden heading, still titled.
    const lone = articleReaderObservationGroupsV3([item("pane/a", "s/a", "o1")], naming(false, { "pane/a": "基準" }));
    expect(lone[0]).toMatchObject({ title: "基準", headingHidden: true });
    expect(lone[0]?.scenario).toBeUndefined();
    // The stored default pane title names only the role: hidden like the Scenario name.
    expect(articleReaderObservationGroupsV3([item("pane/o", "s/a", "o1")], naming(false, { "pane/o": "Outputs" }))[0]).toMatchObject({ title: "Outputs", headingHidden: true });
    expect(articleReaderObservationGroupsV3([item("pane/o", "s/a", "o1")], { ...naming(false, { "pane/o": "出力" }), genericTitles: ["出力"] })[0]?.headingHidden).toBe(true);
    // A lone pane needs no heading column, including a subject title.
    expect(articleReaderObservationGroupsV3([item("pane/v", "s/a", "o1")], naming(false, { "pane/v": "弁関連" }))[0]).toMatchObject({ title: "弁関連" });
    expect(articleReaderObservationGroupsV3([item("pane/v", "s/a", "o1")], naming(false, { "pane/v": "弁関連" }))[0]?.headingHidden).toBe(true);
    // Several panes retain useful subjects, not a repeated sole Scenario.
    const two = articleReaderObservationGroupsV3([item("pane/a", "s/a", "o1"), item("pane/v", "s/a", "o2")], naming(false, { "pane/a": "基準", "pane/v": "弁関連" }));
    expect(two.map((group) => [group.title, group.headingHidden])).toEqual([["基準", true], ["弁関連", undefined]]);
    // One observed group among several graph Scenarios: the target remains accessible without a label column.
    const amid = articleReaderObservationGroupsV3([item("pane/b", "s/b", "o1")], naming(true, { "pane/b": "TBV +500" }));
    expect(amid[0]).toMatchObject({ scenario: { label: "TBV +500" } });
    expect(amid[0]?.title).toBeUndefined();
    expect(amid[0]?.headingHidden).toBe(true);
    const compared = articleReaderObservationGroupsV3([item("pane/a", "s/a", "o1"), item("pane/b", "s/b", "o2")], naming(true, { "pane/a": "基準", "pane/b": "TBV +500" }));
    expect(compared.map(group => group.headingHidden)).toEqual([undefined, undefined]);
    const rendered = renderToStaticMarkup(<ExperimentObservationV3 groups={lone} label="obs" />);
    expect(rendered).toContain('data-observation-heading="hidden"');
    expect(rendered).toContain('<h4 class="sr-only">');
    expect(rendered).not.toContain("experiment-observation-heading\"");
  });

  it("keeps the following marker whether or not the pane title already names its Scenario", () => {
    const item = { itemId: "co", outputId: "co", label: "CO", value: 5, unit: "L/min", availability: "available", quality: "assessed" };
    const render = (title: string | undefined, following: boolean, scenario = "基準") => renderToStaticMarkup(
      <ExperimentObservationV3
        groups={[{ key: "g", ...(title === undefined ? {} : { title }), scenario: { label: scenario, colorHex: "#000" }, following, items: [item] }]}
        label="observation" followingLabel="連動"
      />,
    );
    // Title equals the Scenario: the name appears once, the mode still shows.
    const same = render("基準", true);
    expect(same.match(/基準/g)).toHaveLength(1);
    expect(same).toContain('data-observation-following="true">連動</span>');
    // Title contains the Scenario name: no repetition, mode shown.
    const contains = render("弁（基準）", true);
    expect(contains.match(/基準/g)).toHaveLength(1);
    expect(contains).toContain("連動");
    // Distinct labels: both names, mode shown; a fixed pane shows no mode.
    const distinct = render("弁", true, "TBV +1000");
    expect(distinct).toContain('<span class="experiment-observation-title">弁</span>');
    expect(distinct).toContain("連動</span>TBV +1000");
    expect(render("基準", false)).not.toContain("連動");
    expect(render("弁", false, "TBV +1000")).toContain("TBV +1000");
    expect(render("MAP", false, "A")).toContain('class="experiment-observation-scenario">A</span>');
    expect(render("弁(A)", false, "A")).not.toContain('class="experiment-observation-scenario"');
  });

  it("edits one of two sealed references of the same pane item without touching its sibling", () => {
    const snapshot = observationSnapshotV3();
    const sealed = defaultArticleBriefingV3(snapshot, "scenario/a", "Observation");
    const a = { ...sealed.outputs[0]!, order: 0, emphasis: "primary" as const };
    const b = { ...sealed.outputs[0]!, scenarioId: "scenario/b", order: 1, emphasis: "supporting" as const };
    const briefing: ExperimentPlacementBriefingV2 = { ...sealed, outputs: [a, b] };
    const changes: ExperimentPlacementBriefingV2[] = [];
    const html = renderToStaticMarkup(
      <ArticleBriefingEditorV3 snapshot={snapshot} briefing={briefing} onChange={(next) => changes.push(next)} />,
    );
    // Both references render as their own rows, each named by its Scenario.
    expect(html.match(/data-briefing-output-primary="true"/g)).toHaveLength(1);
    expect(html.match(/data-briefing-output-primary="false"/g)).toHaveLength(1);
    const handlers = articleBriefingEditorReferenceHandlersV3(briefing, (next) => changes.push(next));
    handlers.relabel(b, "Custom");
    handlers.setPrimary(b, true);
    handlers.remove(b);
    handlers.move(b, -1);
    const [relabelled, promoted, removed, moved] = changes;
    expect(relabelled!.outputs).toEqual([a, { ...b, label: "Custom" }]);
    expect(promoted!.outputs.map((output) => output.emphasis)).toEqual(["primary", "primary"]);
    expect(promoted!.outputs[0]).toEqual(a);
    expect(removed!.outputs).toEqual([a]);
    expect(moved!.outputs.map((output) => `${output.scenarioId}:${output.order}`)).toEqual(["scenario/b:0", "scenario/a:1"]);
    for (const change of changes) expect(() => validateExperimentPlacementBriefingV2(change, snapshot.content)).not.toThrow();
  });

  it("can add the current pane Scenario alongside a retained sealed reference after re-capture", () => {
    const original = observationSnapshotV3();
    const briefing = defaultArticleBriefingV3(original, "scenario/a", "Observation");
    const snapshot = { ...original, content: { ...original.content, surface: { ...original.content.surface,
      outputPanes: original.content.surface.outputPanes.map((pane) => pane.paneId === "pane/a"
        ? { ...pane, binding: { mode: "fixed" as const, scenarioId: "scenario/b" } } : pane),
    } } };
    const html = renderToStaticMarkup(<ArticleBriefingEditorV3 snapshot={snapshot} briefing={briefing} onChange={() => undefined} />);
    const matches: readonly string[] = html.match(/<label\b[^>]*>[\s\S]*?<\/label>/g) ?? [];
    const labels = matches.filter((label) => label.includes(">A1</span>"));
    expect(labels).toHaveLength(2);
    expect(labels.find((label) => label.includes("基準"))).toContain('checked=""');
    expect(labels.find((label) => label.includes("TBV +1000"))).not.toContain('checked=""');
  });

  it("retains derived primary outputs when reordering a Briefing sealed without emphasis", () => {
    const briefing = legacyBriefingV3();
    const originalKeys = articleBriefingPrimaryOutputKeysV3(briefing);
    const changes: ExperimentPlacementBriefingV2[] = [];
    articleBriefingEditorReferenceHandlersV3(briefing, (next) => changes.push(next)).move(briefing.outputs[3]!, -1);
    expect(changes).toHaveLength(1);
    expect(articleBriefingPrimaryOutputKeysV3(changes[0]!).slice().sort()).toEqual([...originalKeys].sort());
    expect(changes[0]!.outputs[2]!.outputId).toBe(briefing.outputs[3]!.outputId);
    expect(changes[0]!.outputs.every((output) => output.emphasis !== undefined)).toBe(true);
  });

  it("names a shared control target once and per-row targets only when bindings differ", () => {
    const fixed = (scenarioIds: string[]) => ({ mode: "fixed" as const, scenarioIds, application: "absolute" as const });
    const visible = ["scenario/a", "scenario/b"];
    expect(articleReaderControlBindingSignatureV3({ binding: fixed(["scenario/a"]) }, visible))
      .toBe(articleReaderControlBindingSignatureV3({ binding: fixed(["scenario/a"]) }, visible));
    expect(articleReaderControlBindingSignatureV3({ binding: fixed(["scenario/a"]) }, visible))
      .not.toBe(articleReaderControlBindingSignatureV3({ binding: fixed(["scenario/b"]) }, visible));
    expect(articleReaderControlBindingSignatureV3({ binding: fixed(["scenario/b", "scenario/a"]) }, visible))
      .toBe(articleReaderControlBindingSignatureV3({ binding: fixed(["scenario/a", "scenario/b"]) }, visible));
    expect(articleReaderControlBindingSignatureV3({ binding: { mode: "reader-focus", allowedScenarioIds: ["scenario/a"] } }, visible))
      .not.toBe(articleReaderControlBindingSignatureV3({ binding: fixed(["scenario/a"]) }, visible));
    // A Scenario outside the visible scope does not separate otherwise equal bindings.
    expect(articleReaderControlBindingSignatureV3({ binding: fixed(["scenario/a", "scenario/zzz"]) }, visible))
      .toBe(articleReaderControlBindingSignatureV3({ binding: fixed(["scenario/a"]) }, visible));
  });

  it("keeps the same pane item read for two Scenarios as two references through re-capture", () => {
    const snapshot = observationSnapshotV3();
    const sealed = defaultArticleBriefingV3(snapshot, "scenario/a", "Observation");
    const eachVisible: ExperimentPlacementBriefingV2 = {
      ...sealed,
      outputs: [
        { ...sealed.outputs[0]!, scenarioId: "scenario/a", order: 0 },
        { ...sealed.outputs[0]!, scenarioId: "scenario/b", order: 1 },
      ],
    };
    const recaptured = reconcileWorkbenchBriefingV3({ briefing: eachVisible, preferredFocusScenarioId: "scenario/a", snapshot });
    expect(recaptured.outputs.map(articleBriefingOutputKeyV3)).toEqual([keyA(1), observedKey("pane/a", "output/a1", "scenario/b")]);
    // A true duplicate reference collapses; a Scenario that left the scope drops out.
    expect(reconcileWorkbenchBriefingV3({
      briefing: { ...eachVisible, outputs: [...eachVisible.outputs, { ...eachVisible.outputs[0]!, order: 2 }] },
      preferredFocusScenarioId: "scenario/a", snapshot,
    }).outputs).toHaveLength(2);
    expect(reconcileWorkbenchBriefingV3({
      briefing: { ...eachVisible, scenarioScope: { visibleScenarioIds: ["scenario/a"], initialFocusScenarioId: "scenario/a" } },
      preferredFocusScenarioId: "scenario/a", snapshot,
    }).outputs.map(articleBriefingOutputKeyV3)).toEqual([keyA(1)]);
  });
});

describe("Article Briefing primary limits", () => {
  it("bounds the primary sets at six output references and two controllers, never the sealed content", () => {
    expect(ARTICLE_PRIMARY_OUTPUT_LIMIT_V3).toBe(6);
    expect(ARTICLE_PRIMARY_CONTROL_LIMIT_V3).toBe(2);
    const snapshot = observationSnapshotV3();
    const sealed = defaultArticleBriefingV3(snapshot, "scenario/a", "Observation");
    // Twenty sealed outputs and three sealed controls are fine; only the primary marks are bounded.
    expect(validateExperimentPlacementBriefingV2(sealed, snapshot.content).outputs).toHaveLength(20);
    const seven = { ...sealed, outputs: withExplicitItemEmphasisV3(sealed.outputs,
      new Set(sealed.outputs.slice(0, 7).map(articleBriefingOutputKeyV3)), (output) => articleBriefingOutputKeyV3(output)) };
    expect(() => validateExperimentPlacementBriefingV2(seven, snapshot.content)).toThrow(/outputs.*at most 6 primary items \(found 7\)/);
    const three = { ...sealed, controls: withExplicitItemEmphasisV3(sealed.controls,
      new Set(sealed.controls.map(articleBriefingControlKeyV3)), (control) => articleBriefingControlKeyV3(control)) };
    expect(() => validateExperimentPlacementBriefingV2(three, snapshot.content)).toThrow(/controls.*at most 2 primary items \(found 3\)/);
    // A reference counts with its Scenario: the same pane item at two Scenarios is two primary references.
    const paired = { ...sealed, outputs: withExplicitItemEmphasisV3([
      ...sealed.outputs.slice(0, 6).map((output, order) => ({ ...output, order })),
      ...sealed.outputs.slice(0, 1).map((output) => ({ ...output, scenarioId: "scenario/b", order: 6 })),
    ], new Set([...sealed.outputs.slice(0, 5).map(articleBriefingOutputKeyV3), observedKey("pane/a", "output/a1", "scenario/b")]),
    (output) => articleBriefingOutputKeyV3(output)) };
    expect(validateExperimentPlacementBriefingV2(paired, snapshot.content).outputs.filter((output) => output.emphasis === "primary")).toHaveLength(6);
  });

  it("derives a bounded legacy first screen when many groups or controls compete", () => {
    const outputs = Array.from({ length: 7 }, (_, index) => ({
      sourcePaneId: `pane/${index}`, outputId: "output/x", scenarioId: "scenario/a", label: "X", order: index,
    }));
    expect(defaultObservedItemKeysV3(outputs.map((output) => ({ keys: [articleBriefingOutputKeyV3(output)] })))).toHaveLength(7);
    expect(articleBriefingPrimaryOutputKeysV3({ outputs })).toHaveLength(6);
    const controls = Array.from({ length: 3 }, (_, index) => ({
      sourcePaneId: "pane/c", controlId: `control/${index}`, label: "C", order: index,
      presentation: { kind: "slider" as const },
      binding: { mode: "fixed" as const, scenarioIds: ["scenario/a"], application: "absolute" as const },
    }));
    expect(articleBriefingPrimaryControlKeysV3({ controls })).toEqual([
      articleBriefingControlKeyV3(controls[0]!), articleBriefingControlKeyV3(controls[1]!),
    ]);
  });

  it("keeps the editor from marking beyond the limit while the sealed item stays", () => {
    const snapshot = observationSnapshotV3();
    const sealed = defaultArticleBriefingV3(snapshot, "scenario/a", "Observation");
    const changes: ExperimentPlacementBriefingV2[] = [];
    const handlers = articleBriefingEditorReferenceHandlersV3(sealed, (next) => changes.push(next));
    handlers.setPrimary(sealed.outputs[6]!, true);
    expect(changes).toHaveLength(0);
    handlers.setPrimary(sealed.outputs[0]!, false);
    expect(changes).toHaveLength(1);
    articleBriefingEditorReferenceHandlersV3(changes[0]!, (next) => changes.push(next)).setPrimary(sealed.outputs[6]!, true);
    expect(changes).toHaveLength(2);
    expect(changes[1]!.outputs.filter((output) => output.emphasis === "primary").map(articleBriefingOutputKeyV3))
      .toEqual([keyA(2), keyA(3), keyA(7), keyB(1), keyB(2), keyB(3)]);
    expect(changes[1]!.outputs).toHaveLength(20);
    // Every change re-seals within the limit; binding and Scenario never move.
    for (const change of changes) {
      expect(() => validateExperimentPlacementBriefingV2(change, snapshot.content)).not.toThrow();
      expect(change.outputs.map((output) => output.scenarioId)).toEqual(sealed.outputs.map((output) => output.scenarioId));
    }
    const html = renderToStaticMarkup(
      <ArticleBriefingEditorV3 snapshot={snapshot} briefing={sealed} onChange={() => undefined} />,
    );
    // Fourteen supporting outputs and one supporting control are blocked while the sets are full.
    expect(html.match(/data-briefing-primary-blocked="true"/g)).toHaveLength(15);
    expect(html).toContain('data-testid="article-briefing-primary-outputs-count-v3">主要 6/6<');
    expect(html).toContain('data-testid="article-briefing-primary-controls-count-v3">主要 2/2<');
  });

  it("opens the controller panes holding a primary controller first", () => {
    const sealed = defaultArticleBriefingV3(observationSnapshotV3(), "scenario/a", "Observation");
    expect(articleBriefingInitialOpenControlPaneIdsV3(sealed)).toEqual(["pane/controls-a"]);
    const onlyB = withExplicitItemEmphasisV3(sealed.controls,
      new Set([articleBriefingControlKeyV3({ sourcePaneId: "pane/controls-b", controlId: "control/tbv" })]), (control) => articleBriefingControlKeyV3(control));
    expect(articleBriefingInitialOpenControlPaneIdsV3({ controls: onlyB })).toEqual(["pane/controls-b"]);
    // No primary controller: the first sealed pane opens so the deck is never empty.
    const none = withExplicitItemEmphasisV3(sealed.controls, new Set(), (control) => articleBriefingControlKeyV3(control));
    expect(articleBriefingInitialOpenControlPaneIdsV3({ controls: none })).toEqual(["pane/controls-a"]);
    expect(articleBriefingInitialOpenControlPaneIdsV3({ controls: [] })).toEqual([]);
  });
});

describe("Article Reader first screen and opened forms", () => {
  const sliderDefinition = (controlId: string): ControlDefinitionV2 => ({
    controlId, valueType: "number", unit: "mL", minimum: 0, maximum: 10, step: 1, defaultValue: 5,
    changeSemantics: "accepted-state-warm-start",
  });
  const contract = (): ModelContractV2 => ({
    ...observationContractV3(),
    controlCatalog: [sliderDefinition("control/tbv"), sliderDefinition("control/svr")],
  });
  const runtime = () => readerRuntimeStubV3({
    snapshotId: "snapshot/observation",
    scenarioIds: Object.freeze(["scenario/a", "scenario/b"]),
    activeScenarioId: "scenario/a",
  });
  const render = (
    layout: ArticleReaderEmbedLayoutV3,
    briefing: ExperimentPlacementBriefingV2,
    memory: ArticleReaderObservationMemoryV3 = createArticleReaderObservationMemoryV3(),
    onOpen: (() => void) | null = () => undefined,
  ) => renderToStaticMarkup(
    <ArticleReaderObservationMemoryContextV3.Provider value={memory}>
      <ArticleReaderEmbedSurfaceV3
        analysisRecompute="on-request"
        briefing={briefing}
        contract={contract()}
        layout={layout}
        onOpen={onOpen ?? undefined}
        runtime={runtime()}
        snapshot={observationSnapshotV3()}
      />
    </ArticleReaderObservationMemoryContextV3.Provider>,
  );
  const sliders = (html: string) => (html.match(/type="range"/g) ?? []).length;
  const sealedBriefing = () => defaultArticleBriefingV3(observationSnapshotV3(), "scenario/a", "Observation");

  it("keeps every controller's reader-focus target reachable, including a singleton outside the current focus", () => {
    const sealed = sealedBriefing();
    const singleton = { ...sealed, controls: [{ ...sealed.controls[0]!,
      binding: { mode: "reader-focus" as const, allowedScenarioIds: ["scenario/b"] },
    }] };
    expect(validateExperimentPlacementBriefingV2(singleton, observationSnapshotV3().content)).toEqual(singleton);
    for (const layout of ["inline", "peek", "sheet"] as const) {
      expect(render(layout, singleton).match(/article-reader-scenario-chip/g)).toHaveLength(1);
    }
    const differing = { ...singleton, controls: [...singleton.controls, { ...sealed.controls[1]!,
      binding: { mode: "reader-focus" as const, allowedScenarioIds: ["scenario/a"] },
    }] };
    expect(render("peek", differing).match(/article-reader-scenario-chip/g)).toHaveLength(2);
    // Fixed bindings still need no selector and retain their original targets.
    expect(render("peek", sealed)).not.toContain("article-reader-scenario-chip");
    expect(sealed.controls[0]!.binding).toEqual({ mode: "fixed", scenarioIds: ["scenario/a"], application: "absolute" });
  });

  it("names a shared reader-focus target once in the accessible selector, but identifies mixed fixed targets", () => {
    const sealed = sealedBriefing();
    const focus = { ...sealed, controls: sealed.controls.filter(c => c.sourcePaneId === sealed.controls[0]!.sourcePaneId).map(c =>
      ({ ...c, binding: { mode: "reader-focus" as const, allowedScenarioIds: ["scenario/a", "scenario/b"] } })) };
    const html = render("peek", focus);
    expect(html).toContain('role="group" aria-label="操作するScenario"');
    expect(html).not.toContain('article-reader-scenario-selector-label');
    expect(html).not.toContain('対象:');
    expect(html).not.toContain('対象：');
    const mixed = { ...focus, controls: focus.controls.map((c, i) => i === 0 ? c
      : { ...c, binding: { mode: "fixed" as const, scenarioIds: ["scenario/b"], application: "absolute" as const } }) };
    expect(render("peek", mixed)).toContain('対象:');
  });

  it("reads the author's primary outputs and controls inline at every width, with nothing to unfold", () => {
    const html = render("inline", sealedBriefing());
    expect(html).toContain('data-reader-layout="inline"');
    expect(html).toContain('data-reader-observed-count="6"');
    expect(sliders(html)).toBe(2);
    expect(html).not.toContain("data-reader-deck");
    expect(html).not.toContain("data-reader-open-operate");
    expect(html).not.toContain("data-reader-observation-reset");
    expect(html).not.toContain("aria-pressed");
    // The third sealed controller (pane b) is not in flow; it waits in the opened form.
    expect(html).not.toContain("TBV +1000 を操作");
  });

  it("offers to open only when controllers are sealed but none is primary", () => {
    const sealed = sealedBriefing();
    const noPrimaryControls = { ...sealed, controls: withExplicitItemEmphasisV3(sealed.controls, new Set(), (control) => articleBriefingControlKeyV3(control)) };
    const html = render("inline", noPrimaryControls);
    expect(sliders(html)).toBe(0);
    expect(html).toContain("data-reader-open-operate");
    expect(html).toContain("開いて操作");
    // Nothing sealed to operate, or no way to open: no row.
    expect(render("inline", { ...sealed, controls: [] })).not.toContain("data-reader-open-operate");
    expect(render("inline", noPrimaryControls, createArticleReaderObservationMemoryV3(), null)).not.toContain("data-reader-open-operate");
  });

  it("keeps authored sets unchanged when readers expand or change extent", () => {
    const sealed = sealedBriefing();
    const before = JSON.stringify(sealed);
    const memory: ArticleReaderObservationMemoryV3 = { ...createArticleReaderObservationMemoryV3(), outputView: "all" };
    for (const layout of ["sheet", "peek", "workbench"] as const) {
      const html = render(layout, sealed, memory);
      expect(html.match(/data-output-id=/g)).toHaveLength(20);
      expect(html).not.toContain("data-reader-output-choose");
      expect(html).not.toContain("data-reader-observation-reset");
      expect(html).not.toContain("workbench-output-toggle");
      expect(html).not.toContain('type="checkbox"');
    }
    const inline = render("inline", sealed, memory);
    expect(inline.match(/data-output-id=/g)).toHaveLength(6);
    expect(inline).not.toContain(`data-output-id="${keyA(12)}"`);
    expect(JSON.stringify(sealed)).toBe(before);
    expect(createArticleReaderObservationMemoryV3()).not.toHaveProperty("observedOutputKeys");
  });

  it("omits redundant target headings for a lone exposed scenario while preserving comparison context", () => {
    const sealed = sealedBriefing();
    const single = { ...sealed, graphs: [],
      outputs: sealed.outputs.filter(item => item.scenarioId === "scenario/a"),
      controls: sealed.controls.filter(item => item.sourcePaneId === "pane/controls-a"),
    };
    expect(articleReaderNeedsScenarioLabelsV3(single)).toBe(false);
    for (const layout of ["inline", "sheet", "peek", "workbench"] as const) {
      const html = render(layout, single);
      expect(html).not.toContain('class="article-reader-section-title"');
      expect(html).not.toContain('class="experiment-observation-heading"');
    }
    expect(articleReaderNeedsScenarioLabelsV3(sealed)).toBe(true);
    const compared = render("sheet", sealed);
    expect(compared).toContain('class="article-reader-section-title"');
    expect(compared).toContain('class="experiment-observation-heading"');
    // Pane titles can identify targets once; semantic titles cannot be discarded.
    expect(articleReaderTitleNamesScenarioV3("基準を操作", "基準")).toBe(true);
    expect(articleReaderTitleNamesScenarioV3("TBV +1000 を操作", "TBV +1000")).toBe(true);
    expect(articleReaderTitleNamesScenarioV3("弁の指標", "基準")).toBe(false);
  });

  it("keeps one output area and the controllers present without a permanent picker", () => {
    const sealed = sealedBriefing();
    const html = render("sheet", sealed);
    expect(html.indexOf("article-reader-stage")).toBeLessThan(html.indexOf("data-reader-observation"));
    expect(html.indexOf("data-reader-observation")).toBeLessThan(html.indexOf("data-reader-deck"));
    expect(html).not.toContain("data-reader-deck-tab");
    expect(html).not.toContain("aria-pressed");
    expect(html).toContain('data-reader-section="pane/controls-a" data-reader-section-collapsed="false"');
    expect(html).toContain('data-reader-section="pane/controls-b" data-reader-section-collapsed="true"');
    expect(sliders(html)).toBe(2);
    expect(html.match(/data-output-id=/g)).toHaveLength(6);
    const expanded = render("sheet", sealed, { ...createArticleReaderObservationMemoryV3(), outputView: "all" });
    expect(expanded.match(/data-output-id=/g)).toHaveLength(20);
    expect(sliders(expanded)).toBe(2);
    expect(expanded).not.toContain("aria-pressed");
    expect(expanded).not.toContain("data-reader-output-choose");
    expect(expanded).not.toContain("workbench-output-toggle");
  });

  it("opens to operate with the author's primary values", () => {
    const sealed = sealedBriefing();
    const noPrimaryControls = { ...sealed, controls: withExplicitItemEmphasisV3(sealed.controls, new Set(), control => articleBriefingControlKeyV3(control)) };
    const memory: ArticleReaderObservationMemoryV3 = { ...createArticleReaderObservationMemoryV3(), outputView: "all" };
    let opened = 0;
    openArticleReaderToOperateV3(memory, () => { opened += 1; });
    expect(opened).toBe(1);
    expect(memory.outputView).toBe("primary");
    const reopened = render("sheet", noPrimaryControls, memory);
    expect(reopened).toContain('data-reader-observed-count="6"');
    expect(sliders(reopened)).toBe(2);
  });

  it("shows a read-only primary-only seal once without redundant disclosure controls", () => {
    const sealed = sealedBriefing();
    const primary = new Set(articleBriefingPrimaryOutputKeysV3(sealed));
    const readOnly = { ...sealed, controls: [], outputs: sealed.outputs.filter(item => primary.has(articleBriefingOutputKeyV3(item))) };
    for (const layout of ["peek", "sheet", "workbench"] as const) {
      const html = render(layout, readOnly);
      expect(html.match(/data-output-id=/g)).toHaveLength(6);
      expect(html).not.toContain("data-reader-deck");
      expect(html).not.toContain("data-reader-output-choose");
      expect(html).not.toContain("data-reader-output-expand");
      expect(html).not.toContain('type="checkbox"');
    }
  });

  it("uses space for defaults and preserves explicit expansion across extents", () => {
    expect(articleReaderShowAllOutputsV3("peek", null, true)).toBe(true);
    expect(articleReaderShowAllOutputsV3("peek", null, false)).toBe(false);
    expect(articleReaderShowAllOutputsV3("sheet", null, true)).toBe(false);
    expect(articleReaderShowAllOutputsV3("workbench", null, false)).toBe(true);
    for (const layout of ["peek", "sheet", "workbench"] as const) {
      expect(articleReaderShowAllOutputsV3(layout, "primary", true)).toBe(false);
      expect(articleReaderShowAllOutputsV3(layout, "all", false)).toBe(true);
    }
  });

  it("previews the open-to-operate row for authors when controllers are sealed without a primary mark", () => {
    const snapshot = observationSnapshotV3();
    const sealed = defaultArticleBriefingV3(snapshot, "scenario/a", "Observation");
    const noPrimaryControls = { ...sealed, controls: withExplicitItemEmphasisV3(sealed.controls, new Set(), (control) => articleBriefingControlKeyV3(control)) };
    const html = renderToStaticMarkup(<ArticleBriefingEditorV3 snapshot={snapshot} briefing={noPrimaryControls} onChange={() => undefined} />);
    expect(html).toContain('data-primary-controls="0"');
    expect(html).toContain('data-open-operate="true"');
    expect(html).toContain("data-briefing-phone-open-operate");
    expect(html).toContain('data-testid="article-briefing-primary-controls-count-v3">主要 0/2<');
    const withPrimary = renderToStaticMarkup(<ArticleBriefingEditorV3 snapshot={snapshot} briefing={sealed} onChange={() => undefined} />);
    expect(withPrimary).not.toContain("data-briefing-phone-open-operate");
    const noControls = renderToStaticMarkup(<ArticleBriefingEditorV3 snapshot={snapshot} briefing={{ ...sealed, controls: [] }} onChange={() => undefined} />);
    expect(noControls).not.toContain("data-briefing-phone-open-operate");
  });

  it("preserves folded controls while outputs expand in place", () => {
    const sealed = sealedBriefing();
    const memory: ArticleReaderObservationMemoryV3 = { ...createArticleReaderObservationMemoryV3(), outputView: "all", collapsedControlPaneIds: ["pane/controls-a"] };
    const html = render("peek", sealed, memory);
    expect(html).toContain('data-reader-section="pane/controls-a" data-reader-section-collapsed="true"');
    expect(html).toContain('data-reader-section="pane/controls-b" data-reader-section-collapsed="false"');
    expect(sliders(html)).toBe(1);
    expect(html.match(/data-output-id=/g)).toHaveLength(20);
    expect(html).not.toContain('type="checkbox"');
  });

  it("uses the maximized output area for all sealed values without a second selected strip", () => {
    const html = render("workbench", sealedBriefing());
    const outputsArea = html.slice(html.indexOf("article-reader-workbench-outputs"), html.indexOf("article-reader-workbench-controls"));
    expect(outputsArea.match(/data-output-id=/g)).toHaveLength(20);
    expect(outputsArea).not.toContain("aria-pressed");
    expect(sliders(html)).toBe(3);
    expect(html).not.toContain("data-reader-deck-tab");
  });

});

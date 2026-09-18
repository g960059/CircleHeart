import { articleReaderPlacementAfterViewportExitV3 } from "@/components/article/reader/ArticleReaderPlacementV3";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import "@/i18n";
import {
  ArticleReaderAnalysisStatusV3,
  ArticleReaderExperimentPeekPanelV3,
  ArticleReaderExperimentV3,
  ArticleReaderControlV3,
  ArticleReaderOutputsV3,
  ArticleReaderStructuralReturnGraphV3,
  articleReaderAnalysisScenarioIdsV3,
  articleReaderPeriodicPvaEnabledV3,
  resolveArticleReaderStaticGraphSeriesLabelV3,
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

  it("migrates historical systemic-arterial labels in the static inflow preview", () => {
    const outputId = "hemodynamics.pressure.absolute.SA";
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
      graphCatalog: [
        {
          graphId: "graph/pressure",
          renderer: "sweep",
          defaultSeriesIds: ["SAP"],
          seriesCatalog: [
            {
              kind: "scalar",
              seriesId: "SAP",
              outputId,
            },
          ],
        },
      ],
    };
    const pane: ExperimentSnapshotV2["content"]["surface"]["graphPanes"][number] = {
      paneId: "pane/pressure",
      role: "graph",
      label: "Pressure",
      order: 0,
      priority: 10,
      graphId: "graph/pressure",
      scenarioScope: { mode: "visible-scenarios" },
      excludedTraces: [],
      historyDepth: 1,
      series: [
        {
          seriesId: "SAP",
          label: "Systemic arterial pressure",
          order: 0,
        },
      ],
    };

    expect(
      resolveArticleReaderStaticGraphSeriesLabelV3({
        contract,
        locale: "ja",
        pane,
        series: pane.series[0]!,
      }),
    ).toBe("SAP");
    expect(
      resolveArticleReaderStaticGraphSeriesLabelV3({
        contract,
        locale: "ja",
        pane,
        series: {
          seriesId: "SAP",
          label: "My arterial trace",
          order: 0,
        },
      }),
    ).toBe("My arterial trace");
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
      /<button type="button"[^>]*class="block w-full[^>]*>.*?<\/button>/s,
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
    const html = renderToStaticMarkup(<ArticleReaderOutputsV3 briefing={briefing} contract={contract} sampleStore={store} />);
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
    const html = renderToStaticMarkup(<ArticleReaderOutputsV3 briefing={briefing} contract={contract} sampleStore={store}
      scenarioLabels={{ baseline: "基準条件", higher: "張力増加" }} />);
    // Each section is one source pane read for its sealed Scenario; the
    // Scenario name is the section title when the pane label is unavailable.
    expect(html).toMatch(/<h3[^>]*>.*基準条件<\/span><\/h3>/);
    expect(html).toMatch(/<h3[^>]*>.*張力増加<\/span><\/h3>/);
    expect(html).toContain('data-reader-section-count="2"');
    expect(html).toContain("55<span");
    expect(html).toContain("65<span");
  });

  it("keeps Reader outputs vertical on the mobile base breakpoint", () => {
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
      <ArticleReaderOutputsV3
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
      <ArticleReaderOutputsV3
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
    const html = renderToStaticMarkup(<ArticleReaderOutputsV3 briefing={briefing} contract={contract} sampleStore={store}
      snapshot={snapshot} scenarioLabels={{ "scenario/baseline": "Baseline", "scenario/comparison": "Comparison" }} />);
    expect(html).toContain('data-reader-section-count="2"');
    expect(html).toMatch(/<h3[^>]*>.*弁関連<\/span><span class="article-reader-section-scenario">Baseline<\/span><\/h3>/);
    expect(html).toContain("弁関連（比較）");
    expect(html).toContain("70<span");
    expect(html).toContain("90<span");
  });
});

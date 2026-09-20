import React from "react";
import { useTranslation } from "react-i18next";
import { SimulationLegendPlaceholderV1, SimulationPanePlaceholderV1 } from "@/components/simulation/SimulationPreparationV1";

import { useAppTheme } from "@/appTheme";
import { ExperimentGraphPresentationV3 } from "@/components/workbench/ExperimentPanePresentationV3";
import {
  WORKBENCH_SWEEP_WINDOW_DEFAULT_SEC_V3,
  isWorkbenchGraphTraceExcludedV3,
  resolveWorkbenchGraphScenarioIdsV3,
} from "@/components/workbench/WorkbenchSurfaceV3";
import {
  resolveWorkbenchGraphSeriesPresentationV3,
} from "@/components/workbench/WorkbenchItemPresentation";
import {
  GuytonStarlingComparisonCanvasV3,
  PressureVolumeLoopCanvasV3,
  SweepingWaveformCanvasV3,
  WorkbenchScenarioPresentationSampleStoreV3,
  resolveWorkbenchGraphTraceStyleV3,
  structuralReturnOrientationFromPayloadV3,
  useWorkbenchSampledGraphPresentationSamplesV3,
  workbenchModelCyclePhaseOutputIdV3,
  type WorkbenchScenarioOrbitHistoryV3,
  type WorkbenchScenarioPresentationSamplesV3,
} from "@/components/workbench/presentation";
import {
  shouldAutoRequestStructuralReturnComparisonV3,
  structuralReturnComparisonRequestKeyV3,
  workbenchAnalysisHistoryKeyV3,
  workbenchBoundedGraphHistoryV3,
} from "@/components/workbench/WorkbenchAnalysisState";
import { workbenchScenarioRuntimeStatusV3 } from "@/components/workbench/WorkbenchSessionPolicy";
import { mainWireFormalPvAnalysisIdV1 } from "@/analysis/methods/mainWire/MainWireStructuralAnalysisContractV3";
import { periodicPvaFromAnalysisV3 } from "./presentation/WorkbenchPeriodicPvaProjectionV3";
import { CompletedEjectionWaveformV1 } from "./presentation/CompletedEjectionWaveformV1";
import { WorkbenchChartLegendRowV3 } from "./presentation/WorkbenchChartTraceStyleV3";
import type { MainWirePeriodicPvaDerivationV1 } from "@/analysis/methods/mainWire/MainWireAnalysisMethodRegistryV1";
import type {
  ExperimentSurfaceGraphPaneV2,
  ExperimentSurfaceV2,
} from "@/studio/contracts/v2/content";
import type {
  ModelContractV2,
  StructuralReturnGraphDefinitionV2,
} from "@/studio/contracts/v2/model";
import type {
  StudioSimulationAnalysisV2,
  StudioSimulationFrameV2,
} from "@/studio/contracts/v2/simulation";
import type { StudioSimulationWorkerScenarioDescriptorV2 } from "@/studio/workers/StudioSimulationWorkerProtocolV2";
const EMPTY_WORKBENCH_SCENARIO_PRESENTATION_SAMPLES_V3 = Object.freeze(
  Object.create(null),
) as WorkbenchScenarioPresentationSamplesV3;
const EMPTY_WORKBENCH_SCENARIO_ORBIT_HISTORY_V3 = Object.freeze(
  Object.create(null),
) as WorkbenchScenarioOrbitHistoryV3;

export function workbenchPvGraphUsesPeriodicPvaAnalysisV3(
  renderer: ModelContractV2["graphCatalog"][number]["renderer"],
  displayedSeriesIds: readonly string[],
  periodicPvaDerivation: MainWirePeriodicPvaDerivationV1 | null,
  pressureVolumeAnalysisMode?:
    ExperimentSurfaceGraphPaneV2["pressureVolumeAnalysisMode"],
): boolean {
  return (
    renderer === "pressure-volume" &&
    periodicPvaDerivation !== null &&
    pressureVolumeAnalysisMode !== "raw-exact-orbit" &&
    displayedSeriesIds.some((seriesId) => seriesId === "LV" || seriesId === "RV")
  );
}

export function GraphPaneBodyV3({
  activeScenarioId,
  playbackRunning,
  analysisByKey,
  analysisHistoryByKey,
  analysisErrorByKey,
  contract,
  frame,
  onRequestAnalysis,
  operationPending,
  pane,
  pendingAnalysisKeys,
  periodicPvaDerivation,
  sampleStore,
  scenarios,
  surface,
  visibleScenarioIds,
  readPresentation,
  legendActions,
}: Readonly<{
  activeScenarioId: string | null;
  playbackRunning: boolean;
  analysisByKey: Readonly<Record<string, StudioSimulationAnalysisV2>>;
  analysisHistoryByKey: Readonly<
    Record<string, readonly StudioSimulationAnalysisV2[]>
  >;
  analysisErrorByKey: Readonly<Record<string, string>>;
  contract: ModelContractV2;
  frame: StudioSimulationFrameV2 | null;
  onRequestAnalysis: (
    analysisId: string,
    scenarioIds: readonly string[],
  ) => boolean;
  operationPending: boolean;
  pane: ExperimentSurfaceGraphPaneV2;
  pendingAnalysisKeys: readonly string[];
  periodicPvaDerivation: MainWirePeriodicPvaDerivationV1 | null;
  sampleStore: WorkbenchScenarioPresentationSampleStoreV3;
  scenarios: readonly StudioSimulationWorkerScenarioDescriptorV2[];
  surface: ExperimentSurfaceV2;
  visibleScenarioIds: readonly string[];
  readPresentation?: (scenarioId: string) => { analyses: readonly StudioSimulationAnalysisV2[]; frame?: StudioSimulationFrameV2 };
  legendActions?: React.ReactNode;
}>) {
  const { t } = useTranslation();
  const { appTheme } = useAppTheme();
  const graph = contract.graphCatalog.find(
    ({ graphId }) => graphId === pane.graphId,
  );
  if (graph === undefined) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        {legendActions != null && <WorkbenchChartLegendRowV3 actions={legendActions} />}
        <p className="p-4 text-xs text-wb-danger">{t("workbench.live.unknownGraph")}</p>
      </div>
    );
  }
  const scopedVisibleScenarioIds = resolveWorkbenchGraphScenarioIdsV3(
    pane,
    visibleScenarioIds,
  );
  if (graph.renderer === "cycle-waveform") return <CompletedEjectionWaveformV1 legendActions={legendActions} traces={scenarios.flatMap((scenario, index) => {
    if (!scopedVisibleScenarioIds.includes(scenario.scenarioId) || isWorkbenchGraphTraceExcludedV3(pane, scenario.scenarioId, null)) return [];
    const source = readPresentation?.(scenario.scenarioId);
    return [{ scenarioId: scenario.scenarioId, label: scenario.label, frame: source?.frame,
      analysis: source?.analyses.find(a => a.analysisId === graph.derivationId),
      color: resolveWorkbenchGraphTraceStyleV3({ pane, surface, renderer: graph.renderer, authoredScenarioCount: scenarios.length,
        scenarioId: scenario.scenarioId, scenarioIndex: index, seriesId: null, seriesIndex: 0, appTheme }).color }];
  })} />;
  if (graph.renderer === "structural-return") {
    const structuralAnalysisId =
      mainWireFormalPvAnalysisIdV1(periodicPvaDerivation);
    const pending = new Set(pendingAnalysisKeys);
    const traces = Object.freeze(
      scenarios.flatMap((scenario, scenarioIndex) => {
        if (
          !scopedVisibleScenarioIds.includes(scenario.scenarioId) ||
          isWorkbenchGraphTraceExcludedV3(pane, scenario.scenarioId, null)
        )
          return [];
        const key = workbenchAnalysisHistoryKeyV3(
          scenario.scenarioId,
          structuralAnalysisId,
        );
        const traceStyle = resolveWorkbenchGraphTraceStyleV3({
          pane,
          surface,
          renderer: graph.renderer,
          authoredScenarioCount: scenarios.length,
          scenarioId: scenario.scenarioId,
          scenarioIndex,
          seriesId: null,
          appTheme,
        });
        const analysisPending = pending.has(key);
        const configuredHistoryDepth = pane.historyDepth ?? 1;
        return [
          Object.freeze({
            scenarioId: scenario.scenarioId,
            scenarioLabel: scenario.label,
            color: traceStyle.color,
            analysis: analysisByKey[key],
            history: workbenchBoundedGraphHistoryV3(
              analysisHistoryByKey[key] ?? [],
              configuredHistoryDepth,
            ),
            error: analysisErrorByKey[key] ?? null,
            pending: analysisPending,
          }),
        ];
      }),
    );
    return (
      <StructuralReturnGraphPaneV3
        paneId={pane.paneId}
        axisRanges={pane.axisRanges}
        legendActions={legendActions}
        acceptedStepAvailable={(frame?.acceptedRevision ?? 0) > 0}
        analysisId={structuralAnalysisId}
        structuralSide={
          pane.structuralSide ?? (graph.side === "left" ? "left" : "right")
        }
        onRequestAnalysis={onRequestAnalysis}
        operationPending={operationPending}
        traces={traces}
      />
    );
  }
  return (
    <SampledGraphPaneBodyV3
      legendActions={legendActions}
      activeScenarioId={activeScenarioId}
      analysisByKey={analysisByKey}
      analysisHistoryByKey={analysisHistoryByKey}
      analysisErrorByKey={analysisErrorByKey}
      playbackRunning={playbackRunning}
      contract={contract}
      frame={frame}
      graph={graph}
      onRequestAnalysis={onRequestAnalysis}
      operationPending={operationPending}
      pane={pane}
      pendingAnalysisKeys={pendingAnalysisKeys}
      periodicPvaDerivation={periodicPvaDerivation}
      sampleStore={sampleStore}
      scenarios={scenarios}
      surface={surface}
      visibleScenarioIds={scopedVisibleScenarioIds}
    />
  );
}

function SampledGraphPaneBodyV3({
  legendActions,
  activeScenarioId,
  analysisByKey,
  analysisHistoryByKey,
  analysisErrorByKey,
  playbackRunning,
  contract,
  frame,
  graph,
  onRequestAnalysis,
  operationPending,
  pane,
  pendingAnalysisKeys,
  periodicPvaDerivation,
  sampleStore,
  scenarios,
  surface,
  visibleScenarioIds,
}: Readonly<{
  activeScenarioId: string | null;
  analysisByKey: Readonly<Record<string, StudioSimulationAnalysisV2>>;
  analysisErrorByKey: Readonly<Record<string, string>>;
  playbackRunning: boolean;
  contract: ModelContractV2;
  frame: StudioSimulationFrameV2 | null;
  graph: Exclude<
    ModelContractV2["graphCatalog"][number],
    StructuralReturnGraphDefinitionV2 | { renderer: "cycle-waveform" }
  >;
  legendActions?: React.ReactNode;
  analysisHistoryByKey: Readonly<Record<string, readonly StudioSimulationAnalysisV2[]>>;
  onRequestAnalysis: (
    analysisId: string,
    scenarioIds: readonly string[],
  ) => boolean;
  operationPending: boolean;
  pane: ExperimentSurfaceGraphPaneV2;
  pendingAnalysisKeys: readonly string[];
  periodicPvaDerivation: MainWirePeriodicPvaDerivationV1 | null;
  sampleStore: WorkbenchScenarioPresentationSampleStoreV3;
  scenarios: readonly StudioSimulationWorkerScenarioDescriptorV2[];
  surface: ExperimentSurfaceV2;
  visibleScenarioIds: readonly string[];
}>) {
  const { i18n } = useTranslation();
  const { appTheme } = useAppTheme();
  const graphPresentation = useWorkbenchSampledGraphPresentationSamplesV3(
    sampleStore,
    graph.renderer,
  );
  const samplesByScenarioId =
    graphPresentation.renderer === "sweep"
      ? graphPresentation.samplesByScenarioId
      : EMPTY_WORKBENCH_SCENARIO_PRESENTATION_SAMPLES_V3;
  const exactOrbitSamplesByScenarioId =
    graphPresentation.renderer === "pressure-volume"
      ? graphPresentation.exactOrbitSamplesByScenarioId
      : EMPTY_WORKBENCH_SCENARIO_PRESENTATION_SAMPLES_V3;
  const orbitHistoryByScenarioId =
    graphPresentation.renderer === "pressure-volume"
      ? graphPresentation.orbitHistoryByScenarioId
      : EMPTY_WORKBENCH_SCENARIO_ORBIT_HISTORY_V3;
  const displayedSeries = React.useMemo(
    () =>
      Object.freeze(
        [...pane.series].sort((left, right) => left.order - right.order),
      ),
    [pane.series],
  );
  const authoredScenarioCount = scenarios.length;
  const cyclePhaseOutputId = workbenchModelCyclePhaseOutputIdV3(contract);
  const pendingAnalysisSet = new Set(pendingAnalysisKeys);
  // Workbench exposes one physiological PV relation owner. Legacy authored
  // `responsive-preview` values remain readable in portable content, but no
  // longer select the retired multi-load support envelope.
  const pressureVolumeAnalysisId =
    mainWireFormalPvAnalysisIdV1(periodicPvaDerivation);
  const periodicPvaEnabled = workbenchPvGraphUsesPeriodicPvaAnalysisV3(
    graph.renderer,
    displayedSeries.map(({ seriesId }) => seriesId),
    periodicPvaDerivation,
    pane.pressureVolumeAnalysisMode,
  );
  const pvaAnalysisScenarioIds = periodicPvaEnabled
    ? scenarios
        .filter(({ scenarioId }) => visibleScenarioIds.includes(scenarioId))
        .map(({ scenarioId }) => scenarioId)
    : [];
  const missingPvaAnalysisScenarioIds = pvaAnalysisScenarioIds.filter(
    (scenarioId) => {
      const key = workbenchAnalysisHistoryKeyV3(
        scenarioId,
        pressureVolumeAnalysisId,
      );
      return (
        analysisByKey[key] === undefined &&
        analysisErrorByKey[key] === undefined &&
        !pendingAnalysisSet.has(key)
      );
    },
  );
  const pvaAnalysisRequestKey = JSON.stringify([
    pressureVolumeAnalysisId,
    ...missingPvaAnalysisScenarioIds,
  ]);
  const lastPvaAnalysisRequestKeyRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (missingPvaAnalysisScenarioIds.length === 0) {
      lastPvaAnalysisRequestKeyRef.current = null;
      return;
    }
    if (
      graph.renderer !== "pressure-volume" ||
      (frame?.acceptedRevision ?? 0) <= 0 ||
      operationPending ||
      lastPvaAnalysisRequestKeyRef.current === pvaAnalysisRequestKey
    )
      return;
    if (
      onRequestAnalysis(pressureVolumeAnalysisId, missingPvaAnalysisScenarioIds)
    ) {
      lastPvaAnalysisRequestKeyRef.current = pvaAnalysisRequestKey;
    }
  }, [
    frame?.acceptedRevision,
    graph.renderer,
    missingPvaAnalysisScenarioIds,
    onRequestAnalysis,
    operationPending,
    periodicPvaDerivation,
    pressureVolumeAnalysisId,
    pvaAnalysisRequestKey,
  ]);
  if (graph.renderer === "pressure-volume") {
    const bindings = displayedSeries.flatMap((series) => {
      const binding = graph.seriesCatalog.find(
        (candidate) => candidate.seriesId === series.seriesId,
      );
      return binding === undefined ? [] : [{ binding, series }];
    });
    const tracesForBindings = (selectedBindings: typeof bindings) =>
      scenarios.flatMap((scenario, scenarioStyleIndex) => {
        if (!visibleScenarioIds.includes(scenario.scenarioId)) return [];
        const samples =
          exactOrbitSamplesByScenarioId[scenario.scenarioId] ?? [];
        return selectedBindings.flatMap(({ binding, series }) => {
          if (
            isWorkbenchGraphTraceExcludedV3(
              pane,
              scenario.scenarioId,
              series.seriesId,
            )
          )
            return [];
          const analysisKey = workbenchAnalysisHistoryKeyV3(
            scenario.scenarioId,
            pressureVolumeAnalysisId,
          );
          const relationSide = pressureVolumeRelationSideV3(binding.seriesId);
          const periodicPva =
            relationSide === null
              ? undefined
              : periodicPvaFromAnalysisV3(
                  analysisByKey[analysisKey],
                  relationSide,
                  periodicPvaDerivation,
                );
          const style = resolveWorkbenchGraphTraceStyleV3({
            pane,
            surface,
            renderer: graph.renderer,
            authoredScenarioCount,
            scenarioId: scenario.scenarioId,
            scenarioIndex: scenarioStyleIndex,
            seriesId: series.seriesId,
            seriesIndex: displayedSeries.findIndex(
              ({ seriesId }) => seriesId === series.seriesId,
            ),
            appTheme,
          });
          return [
            {
              scenarioId: scenario.scenarioId,
              scenarioLabel: scenario.label,
              scenarioStatus: workbenchScenarioRuntimeStatusV3(playbackRunning),
              scenarioStyleIndex,
              samples,
              currentCycleSamples: graphPresentation.renderer === "pressure-volume" ? graphPresentation.currentCycleSamplesByScenarioId[scenario.scenarioId] : undefined,
              cyclePosition: graphPresentation.renderer === "pressure-volume" ? graphPresentation.cyclePositionByScenarioId[scenario.scenarioId] : undefined,
              completedCycleSampleSets: graphPresentation.renderer === "pressure-volume" ? graphPresentation.completedCyclesByScenarioId[scenario.scenarioId] : undefined,
              historyEpochs: workbenchBoundedGraphHistoryV3(
                orbitHistoryByScenarioId[scenario.scenarioId] ?? [],
                pane.historyDepth ?? 1,
              ),
              volumeOutputId: binding.volumeOutputId,
              pressureOutputId: binding.pressureOutputId,
              pressureBasis: binding.pressureBasis,
              cyclePhaseOutputId: binding.cyclePhaseOutputId,
              chamberId: binding.seriesId,
              chamberLabel: series.label,
              chamberColor: style.color,
              ...(periodicPva === undefined ? {} : { periodicPva }),
              periodicPvaHistory: relationSide === null ? [] : workbenchBoundedGraphHistoryV3(
                analysisHistoryByKey[analysisKey] ?? [], pane.historyDepth ?? 1,
              ).flatMap(analysis => {
                const historical = periodicPvaFromAnalysisV3(analysis, relationSide, periodicPvaDerivation);
                return historical === undefined ? [] : [{ value: historical, inputEpoch: analysis.inputEpoch }];
              }),
              ...(analysisErrorByKey[analysisKey] === undefined
                ? {}
                : {
                    periodicPvaAnalysisError: analysisErrorByKey[analysisKey],
                  }),
              periodicPvaAnalysisPending: pendingAnalysisSet.has(analysisKey),
            },
          ];
        });
      });
    const traces = tracesForBindings(bindings);
    const retryScenarioIds = pvaAnalysisScenarioIds.filter((scenarioId) => {
      const key = workbenchAnalysisHistoryKeyV3(scenarioId, pressureVolumeAnalysisId);
      return analysisErrorByKey[key] !== undefined && !pendingAnalysisSet.has(key);
    });
    return (
      <ExperimentGraphPresentationV3
        variant="pane"
        data-workbench-graph-pane={pane.paneId}
        canvasClassName="h-full min-h-0"
      >
        <PressureVolumeLoopCanvasV3
          axisRanges={pane.axisRanges}
          pvTrailBeats={pane.pvTrailBeats}
          playbackRunning={playbackRunning}
          legendActions={legendActions}
          periodicPvaSupported={periodicPvaEnabled}
          traces={traces}
          onRetryAnalysis={retryScenarioIds.length === 0 || operationPending
            ? undefined
            : () => onRequestAnalysis(pressureVolumeAnalysisId, retryScenarioIds)}
          showPressureEnvelope={
            periodicPvaEnabled ? pane.showPressureEnvelope : false
          }
          showPvaBoundary={periodicPvaEnabled ? pane.showPvaBoundary : false}
        />
      </ExperimentGraphPresentationV3>
    );
  }
  const bindings = displayedSeries.flatMap((series) => {
    const binding = graph.seriesCatalog.find(
      (candidate) => candidate.seriesId === series.seriesId,
    );
    return binding === undefined ? [] : [{ binding, series }];
  });
  const outputs = bindings.flatMap(({ binding }) => {
    const definition = contract.outputCatalog.find(
      (candidate) => candidate.outputId === binding.outputId,
    );
    return definition === undefined ? [] : [definition];
  });
  const commonUnit =
    outputs.length > 0 && outputs.every(({ unit }) => unit === outputs[0]!.unit)
      ? outputs[0]!.unit
      : undefined;
  const locale = i18n.language.startsWith("ja") ? "ja" : "en";
  const signalPresentationBySeriesId = new Map(
    bindings.map(({ binding, series }) => {
      const definition = contract.outputCatalog.find(
        ({ outputId }) => outputId === binding.outputId,
      );
      return [
        series.seriesId,
        resolveWorkbenchGraphSeriesPresentationV3({
          definition,
          locale,
          outputId: binding.outputId,
          seriesId: series.seriesId,
          storedLabel: series.label,
        }),
      ] as const;
    }),
  );
  const tracesForScenarios = (
    selectedScenarios: readonly StudioSimulationWorkerScenarioDescriptorV2[],
  ) =>
    selectedScenarios.flatMap((scenario) => {
      const scenarioStyleIndex = scenarios.findIndex(
        ({ scenarioId }) => scenarioId === scenario.scenarioId,
      );
      if (
        scenarioStyleIndex < 0 ||
        !visibleScenarioIds.includes(scenario.scenarioId)
      )
        return [];
      const samples = samplesByScenarioId[scenario.scenarioId] ?? [];
      if (samples.length === 0) return [];
      return bindings.flatMap(({ binding, series }) => {
        if (
          isWorkbenchGraphTraceExcludedV3(
            pane,
            scenario.scenarioId,
            series.seriesId,
          )
        )
          return [];
        const style = resolveWorkbenchGraphTraceStyleV3({
          pane,
          surface,
          renderer: graph.renderer,
          authoredScenarioCount,
          scenarioId: scenario.scenarioId,
          scenarioIndex: scenarioStyleIndex,
          seriesId: series.seriesId,
          seriesIndex: displayedSeries.findIndex(
            ({ seriesId }) => seriesId === series.seriesId,
          ),
          appTheme,
        });
        const presentation = signalPresentationBySeriesId.get(series.seriesId);
        const signalLabel = presentation?.label ?? series.label;
        return [
          {
            scenarioId: scenario.scenarioId,
            scenarioLabel: scenario.label,
            scenarioStatus: workbenchScenarioRuntimeStatusV3(playbackRunning),
            scenarioStyleIndex,
            samples,
            outputId: binding.outputId,
            signalLabel,
            ...(!presentation?.description
              ? {}
              : {
                  signalDescription: presentation.description,
                  signalDescriptionLabel:
                    locale === "ja"
                      ? `${signalLabel}の説明`
                      : `About ${signalLabel}`,
                }),
            signalColor: style.color,
            ...(cyclePhaseOutputId === undefined ? {} : { cyclePhaseOutputId }),
          },
        ];
      });
    });
  const traces = tracesForScenarios(scenarios);
  return (
    <ExperimentGraphPresentationV3
      variant="pane"
      data-workbench-graph-pane={pane.paneId}
      canvasClassName="h-full min-h-0"
    >
      <SweepingWaveformCanvasV3
        axisRanges={pane.axisRanges}
        legendActions={legendActions}
        activeScenarioId={activeScenarioId}
        includeZero={outputs.every(
          ({ outputId }) =>
            outputId.includes(".flow.") || outputId.endsWith(".flow"),
        )}
        traces={traces}
        unitLabel={commonUnit}
        windowSec={pane.windowSec ?? WORKBENCH_SWEEP_WINDOW_DEFAULT_SEC_V3}
      />
    </ExperimentGraphPresentationV3>
  );
}

function pressureVolumeRelationSideV3(
  seriesId: string,
): "left" | "right" | null {
  if (seriesId === "LV") return "left";
  if (seriesId === "RV") return "right";
  return null;
}

type StructuralReturnScenarioTraceV3 = Readonly<{
  scenarioId: string;
  scenarioLabel: string;
  color: string;
  analysis: StudioSimulationAnalysisV2 | undefined;
  history: readonly StudioSimulationAnalysisV2[];
  error: string | null;
  pending: boolean;
}>;

function StructuralReturnGraphPaneV3({
  paneId,
  axisRanges,
  legendActions,
  acceptedStepAvailable,
  analysisId,
  onRequestAnalysis,
  operationPending,
  structuralSide,
  traces,
}: Readonly<{
  acceptedStepAvailable: boolean;
  paneId: string;
  axisRanges?: ExperimentSurfaceGraphPaneV2["axisRanges"];
  analysisId: string;
  onRequestAnalysis: (
    analysisId: string,
    scenarioIds: readonly string[],
  ) => boolean;
  operationPending: boolean;
  structuralSide: "left" | "right";
  traces: readonly StructuralReturnScenarioTraceV3[];
  legendActions?: React.ReactNode;
}>) {
  const { t } = useTranslation();
  const lastAutoRequestedKeyRef = React.useRef<string | null>(null);
  const missingScenarioIds = React.useMemo(
    () =>
      Object.freeze(
        traces
          .filter(
            ({ analysis, error, pending }) =>
              analysis === undefined && error === null && !pending,
          )
          .map(({ scenarioId }) => scenarioId),
      ),
    [traces],
  );
  const currentRequestKey = structuralReturnComparisonRequestKeyV3(
    analysisId,
    missingScenarioIds,
  );
  React.useEffect(() => {
    if (currentRequestKey === null) lastAutoRequestedKeyRef.current = null;
  }, [currentRequestKey]);
  React.useEffect(() => {
    if (
      shouldAutoRequestStructuralReturnComparisonV3({
        acceptedStepAvailable,
        currentRequestKey,
        lastAutoRequestedKey: lastAutoRequestedKeyRef.current,
        operationPending,
      })
    ) {
      if (onRequestAnalysis(analysisId, missingScenarioIds)) {
        lastAutoRequestedKeyRef.current = currentRequestKey;
      }
    }
  }, [
    acceptedStepAvailable,
    currentRequestKey,
    analysisId,
    missingScenarioIds,
    onRequestAnalysis,
    operationPending,
  ]);
  const comparisonTraces = React.useMemo(
    () =>
      Object.freeze(
        traces.flatMap((trace) => {
          const currentOrientation = structuralReturnOrientationFromPayloadV3(
            trace.analysis?.payload,
            structuralSide,
          );
          const historyOrientations = Object.freeze(
            trace.history.flatMap((historical) => {
              const candidate = structuralReturnOrientationFromPayloadV3(
                historical.payload,
                structuralSide,
              );
              return candidate === null ? [] : [candidate];
            }),
          );
          const historyFallbackOrientation =
            currentOrientation === null
              ? (historyOrientations.at(-1) ?? null)
              : null;
          const orientation =
            currentOrientation ??
            historyFallbackOrientation;
          if (orientation === null) return [];
          return [
            Object.freeze({
              scenarioId: trace.scenarioId,
              scenarioLabel: trace.scenarioLabel,
              color: trace.color,
              orientation,
              orientationAlpha: historyFallbackOrientation === null ? 1 : 0.34,
              stale: historyFallbackOrientation !== null,
              error: trace.error,
              pending: trace.pending,
              historyOrientations:
                historyFallbackOrientation === null
                  ? historyOrientations
                  : Object.freeze(historyOrientations.slice(0, -1)),
            }),
          ];
        }),
      ),
    [structuralSide, traces],
  );
  const pending = traces.some((trace) => trace.pending);
  const error = traces.find((trace) => trace.error !== null)?.error ?? null;
  return (
    <ExperimentGraphPresentationV3
      variant="pane"
      canvasClassName="relative flex h-full min-h-0 flex-col overflow-auto"
      data-workbench-graph-pane={paneId}
      data-analysis-error={error ?? undefined}
      data-analysis-pending={pending ? "true" : "false"}
    >
      <>
        {comparisonTraces.length === 0 && <WorkbenchChartLegendRowV3 actions={legendActions}
          updatingLabel={traces.length > 0 && (pending || error === null) ? t("workbench.live.analysisRunning") : undefined}>
          {traces.length > 0 && <SimulationLegendPlaceholderV1 />}
        </WorkbenchChartLegendRowV3>}
        {traces.length === 0 ? (
          <div className="flex min-h-52 flex-1 items-center justify-center text-xs text-wb-subtle">
            {t("workbench.live.scenarioHidden")}
          </div>
        ) : comparisonTraces.length === 0 ? (
          <div className="relative min-h-52 flex-1">
            <SimulationPanePlaceholderV1 showLegend={false} />
            {error !== null && !pending ? <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-5 text-center text-xs text-wb-muted">
              <span role="status">{t("workbench.live.analysisUnavailable")}</span>
              <button type="button" className="rounded px-2 py-1 text-wb-accent hover:bg-wb-accent/10"
                disabled={operationPending || !acceptedStepAvailable}
                onClick={() => onRequestAnalysis(analysisId, traces.filter(trace => trace.error).map(trace => trace.scenarioId))}>
                {t("workbench.live.refreshAnalysis")}
              </button>
            </div> : null}
          </div>
        ) : (
          <GuytonStarlingComparisonCanvasV3
            axisRanges={axisRanges}
            legendActions={legendActions}
            onRetryAnalysis={operationPending || !traces.some(trace => trace.error && !trace.pending)
              ? undefined : () => onRequestAnalysis(analysisId, traces.filter(trace => trace.error && !trace.pending).map(trace => trace.scenarioId))}
            recalculatingLabel={t("workbench.live.analysisRecalculating")}
            traces={comparisonTraces}
          />
        )}
        {traces.map(({ analysis, scenarioId }) =>
          analysis === undefined ? null : (
            <span
              key={scenarioId}
              className="sr-only"
              data-analysis-scenario-id={scenarioId}
              data-circulation-side={structuralSide}
              data-analysis-input-epoch={analysis.inputEpoch}
              data-analysis-boundary-status="current-input-epoch"
            >
              {analysis.sourceAcceptedRevision}@
              {analysis.sourceAcceptedTimeSec.toFixed(3)}
            </span>
          ),
        )}
      </>
    </ExperimentGraphPresentationV3>
  );
}

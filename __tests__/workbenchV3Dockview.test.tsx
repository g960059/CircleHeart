import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { DockviewApi } from "dockview";
import { describe, expect, it, vi } from "vitest";
import "@/i18n";
import { SimulationPanePlaceholderV1, SimulationPreparationV1 } from "@/components/simulation/SimulationPreparationV1";
import { studioPresetMatchesSearchV1, studioPresetPresentationV1 } from "@/studio/presentation/StudioPresetPresentationV1";
import type { ScenarioPresetV2 } from "@/studio/contracts/v2/content";

import {
  materializeWorkbenchOutputPresentationItemsV3,
  resolveWorkbenchControlPresentationV3,
  resolveWorkbenchGraphSeriesPresentationV3,
  scalarAvailableOutputV3,
} from "@/components/workbench/WorkbenchItemPresentation";
import {
  workbenchPvGraphUsesPeriodicPvaAnalysisV3,
} from "@/components/workbench/WorkbenchGraphPaneBodyV3";
import {
  PressureVolumeLoopCanvasV3,
  WorkbenchChartLegendV3,
  buildWorkbenchTraceLegendModelV3,
} from "@/components/workbench/presentation";
import {
  archiveWorkbenchAnalysesV3,
  cloneWorkbenchAnalysisForScenarioV3,
  cloneWorkbenchScenarioAnalysesV3,
  invalidateWorkbenchScenarioAnalysisEquivalenceV3,
  shouldAutoRequestStructuralReturnComparisonV3,
  structuralReturnComparisonRequestKeyV3,
  withoutWorkbenchScenarioAnalysisHistoryV3,
  workbenchAnalysisHistoryKeyV3,
  workbenchAnalysisMatchesFrameEpochV3,
  workbenchBoundedGraphHistoryV3,
  workbenchStructuralHistoryAnalysisIdsV3,
} from "@/components/workbench/WorkbenchAnalysisState";
import {
  createWorkbenchBriefingSnapshotV3,
  reconcileWorkbenchBriefingV3,
  resolveWorkbenchBriefingEditorChangeV3,
  resolveWorkbenchInitialBriefingV3,
  workbenchBriefingSourceScenariosMatchV3,
} from "@/components/workbench/WorkbenchBriefingPolicy";
import {
  cloneWorkbenchControlValuesV3,
  modelLabEnabledV3,
  resolveWorkbenchInitialSaveStateV3,
  workbenchSaveAvailableV3,
  workbenchPublicationIsStaleV3,
  resolveWorkbenchSurfaceAfterCommitV3,
  shouldConfirmWorkbenchDiscardV3,
  shouldPublishWorkbenchRootFrameV3,
  workbenchInputMutationReplacedAcceptedClockV3,
  workbenchRejectedControlCanResumeRuntimeV3,
  workbenchDurableContentAvailableV3,
  workbenchPublicationAvailableV3,
  workbenchScenarioRuntimeStatusV3,
} from "@/components/workbench/WorkbenchSessionPolicy";
import {
  createDefaultExperimentSurfaceV3,
  isWorkbenchGraphTraceExcludedV3,
  reconcileWorkbenchSurfaceScenariosV3,
  outputLabelV3,
  reconcileWorkbenchPressureVolumeCapabilityV3,
  resolveWorkbenchControlPaneScenarioIdsV3,
  resolveWorkbenchGraphScenarioIdsV3,
  resolveWorkbenchOutputPaneScenarioIdV3,
  WORKBENCH_GRAPH_PANE_OPTIONS_V3,
  workbenchGraphPaneOptionsForContractV3,
} from "@/components/workbench/WorkbenchSurfaceV3";
import {
  DEFAULT_WORKBENCH_PANE_EDITOR_STRINGS_V3,
  updateWorkbenchGraphTraceCustomColorV3,
  workbenchGraphDisplaySettingsAvailableV3,
} from "@/components/workbench/WorkbenchPaneEditorV3";
import {
  addWorkbenchSurfacePaneV3,
  compareWorkbenchOutputPaneByScenarioV3,
  deleteWorkbenchSurfacePaneV3,
  duplicateWorkbenchSurfacePaneV3,
  updateWorkbenchSurfacePaneV3,
} from "@/components/workbench/WorkbenchSurfacePaneOperationsV3";
import { canCommitWorkbenchPaneV3, changeWorkbenchOutputMethodV3, finalizeWorkbenchPaneSelectionV3, rememberWorkbenchPaneItemsV3, rememberWorkbenchOutputMethodsV3, toggleWorkbenchPaneSelectionV3, workbenchPaneSelectionEntriesV3, workbenchPaneCatalogEntriesV3 } from "@/components/workbench/WorkbenchPaneSelectionV3";
import { STUDIO_OUTPUT_MEASUREMENT_FAMILIES_V1, studioOutputComparisonMethodLabelsV1 } from "@/studio/presentation/StudioOutputMeasurementMethodsV1";
import { renameWorkbenchPaneItemV3, reorderWorkbenchPaneItemsV3, WorkbenchTraceRowsV3 } from "@/components/workbench/WorkbenchPaneItemRowsV3";
import { WorkbenchPaneCatalogV3, workbenchPaneCatalogGroupsV3 } from "@/components/workbench/WorkbenchPaneCatalogV3";
import { resolveWorkbenchDialogPositionV3 } from "@/components/workbench/WorkbenchAnchoredDialogV3";
import {
  WorkbenchPaneBindingButtonV3,
  WorkbenchPaneBindingModeSelectorV3,
} from "@/components/workbench/WorkbenchPaneBindingV3";
import {
  ExperimentNumericControlV3,
  ExperimentOutputGridV3,
  formatExperimentOutputValueV3,
  formatExperimentPressureSummaryV3,
  resolveControlDraftCommitV3,
  resolveExperimentOutputDisplayV3,
} from "@/components/workbench/ExperimentPanePresentationV3";
import { WorkbenchMobileStageDeckV3 } from "@/components/workbench/WorkbenchMobileStageDeckV3";
import { WorkbenchSimulationInfoPanelV3, workbenchAnalysisLimitationsV3 } from "@/components/workbench/WorkbenchSimulationInfoV3";
import {
  DEFAULT_WORKBENCH_SCENARIO_MANAGER_STRINGS_V3,
  WorkbenchScenarioManagerV3,
  suggestWorkbenchScenarioIdV3,
  suggestWorkbenchScenarioLabelV3,
} from "@/components/workbench/WorkbenchScenarioManagerV3";
import { MAIN_WIRE_INTEGRATED_MODEL_FORMAL_PRESSURE_VOLUME_RELATIONS_V3_ID } from "@/analysis/methods/mainWire/MainWireStructuralAnalysisContractV3";
import type {
  StudioSimulationAnalysisV2,
  StudioSimulationFrameV2,
} from "@/studio/contracts/v2/simulation";
import {
  WorkbenchDockview,
  applyWorkbenchPanesV3,
  workbenchDockDropPositionAllowedForRoleV3,
  workbenchDockLayoutModeForRoleV3,
  reconcileWorkbenchPaneMembershipV3,
  reconcileWorkbenchPaneTitlesV3,
  reconcileWorkbenchPanesV3,
  resetWorkbenchDockviewTrackingV3,
  shouldRenderWorkbenchDockPanelV3,
  workbenchAddPaneAnchorForGroupV3,
  workbenchPanePlacementV3,
  workbenchPaneSplitDirectionsForRoleV3,
  type WorkbenchPaneDefinitionV3,
} from "@/components/workbench/WorkbenchDockview";
import {
  DEFAULT_WORKBENCH_AREA_LAYOUT_V3,
  WORKBENCH_AREA_LAYOUT_STORAGE_KEY_V3,
  loadWorkbenchAreaLayoutPreferenceV3,
  normalizeWorkbenchAreaLayoutPreferenceV3,
  saveWorkbenchAreaLayoutPreferenceV3,
} from "@/components/workbench/WorkbenchAreaLayoutV3";
import {
  loadStudioDefaultClientCompositionV2,
  loadStudioLocalCurrentClientCompositionV1,
} from "@/studio/composition/StudioDefaultCompositionV2";
import { modelLimitationsAcknowledgementKey } from "@/components/ModelLimitations";
import {
  STUDIO_OUTPUT_PRESSURE_SUMMARIES_V1,
  resolveStudioItemPresentationV1,
  resolveStudioSurfaceItemLabelV1,
  studioItemPresentationCategoryV1,
  studioItemPresentationMatchesQueryV1,
} from "@/studio/presentation/StudioItemPresentationCatalogV1";
import {
  STANDARD_TEST_SURFACE_RELEASE_ID_V1,
  STANDARD_TEST_SURFACE_SERIES_ID_V1,
} from "./helpers/standardReleaseTicketV1";

describe("V3 Dockview Workbench", () => {
  it("uses quiet, non-numerical placeholders and one clinical preparation status", () => {
    for (const kind of ["graph", "output", "control"] as const) {
      const html = renderToStaticMarkup(<SimulationPanePlaceholderV1 kind={kind} itemCount={3} />);
      expect(html).toContain('aria-hidden="true"');
      expect(html).not.toMatch(/animate-|role="status"|<canvas|<svg/);
    }
    const html = renderToStaticMarkup(<SimulationPreparationV1 />);
    expect(html.match(/role="status"/g)).toHaveLength(1);
    expect(html).not.toMatch(/V3|Worker|registry|Loading Workbench|accepted step/);
  });

  it("keeps PV collection distinct from relation readiness and never treats an empty selection as loading", () => {
    const trace = {
      scenarioId: "baseline", scenarioLabel: "Baseline", scenarioStyleIndex: 0,
      chamberId: "LV", chamberLabel: "LV", chamberColor: "#cc2244",
      pressureBasis: "transmural" as const, volumeOutputId: "volume", pressureOutputId: "pressure", cyclePhaseOutputId: "phase",
      samples: [], periodicPvaAnalysisPending: true,
    };
    const playing = renderToStaticMarkup(<PressureVolumeLoopCanvasV3 traces={[trace]} playbackRunning />);
    const paused = renderToStaticMarkup(<PressureVolumeLoopCanvasV3 traces={[trace]} playbackRunning={false} />);
    expect(playing).toContain('data-pv-cycle-pending="true"');
    expect(playing).toContain('data-simulation-chart-status="true"');
    expect(paused).toMatch(/再生すると|Play to start/);
    expect(playing).not.toContain("Settling source");
    const empty = renderToStaticMarkup(<PressureVolumeLoopCanvasV3 traces={[]} />);
    expect(empty).toContain('data-pv-cycle-pending="false"');
    expect(empty).not.toContain('data-simulation-chart-status="true"');
    const samples = [0, 0.25, 0.5, 0.9, 1, 1.2].map((time, index) => ({
      inputEpoch: 0, acceptedRevision: index, acceptedTimeSec: time, presentationTimeSec: time,
      values: { phase: time % 1, volume: 100, pressure: 10 },
    }));
    const historyEpochs = [{ inputEpoch: 0, sourceAcceptedRevision: 5, sourceAcceptedTimeSec: 1.2, samples }];
    const complete = renderToStaticMarkup(<PressureVolumeLoopCanvasV3 traces={[{ ...trace, samples, periodicPvaAnalysisPending: false }]} />);
    expect(complete).toContain('data-pv-ready-trace-count="1"');
    expect(complete).not.toContain('data-simulation-chart-status="true"');
    const changed = renderToStaticMarkup(<PressureVolumeLoopCanvasV3 traces={[{ ...trace, historyEpochs }]} />);
    expect(changed).toMatch(/データを取得しています|Waiting for data/);
    expect(changed).toContain('data-pv-history-loop-count="1"');
    for (const playbackRunning of [true, false]) {
      for (const count of [1, 3]) {
        const partial = renderToStaticMarkup(<PressureVolumeLoopCanvasV3 playbackRunning={playbackRunning}
          traces={[{ ...trace, samples: samples.slice(0, count), periodicPvaAnalysisPending: false }]} />);
        expect(partial).toContain('data-pv-drawn-trace-count="1"');
        expect(partial).toContain('data-pv-ready-trace-count="0"');
        expect(partial).not.toContain('data-simulation-chart-status="true"');
        const pending = renderToStaticMarkup(<PressureVolumeLoopCanvasV3
          traces={[{ ...trace, samples: samples.slice(0, count), historyEpochs }]} />);
        expect(pending).toContain('data-chart-legend-actions="true"');
        expect(pending).toContain('data-simulation-update="true"');
        expect(pending).not.toContain('data-simulation-chart-status="true"');
        expect(pending).not.toContain('data-chart-history-key="true"');
        expect(pending).toContain('data-pv-history-loop-count="1"');
      }
    }
  });

  it("keeps a popup's opening corner and constrains growing content instead of flipping above its anchor", () => {
    const input = { anchor: {left: 1400, top: 398, bottom: 434}, viewport: {left: 0, top: 0, width: 1440, height: 900, layoutHeight: 900}, preferredWidth: 440, contentHeight: 375 };
    const opening = resolveWorkbenchDialogPositionV3(input);
    expect(opening).toEqual({left: 992, top: 439, width: 440, maxHeight: 453});
    const origin = {left: Number(opening.left), top: Number(opening.top)};
    for (const contentHeight of [509, 1200, 100, 375]) {
      expect(resolveWorkbenchDialogPositionV3({...input, contentHeight, origin})).toEqual(opening);
    }
  });

  it("retains a popup opened above a low trigger when search results shrink", () => {
    const input = { anchor: {left: 1000, top: 760, bottom: 796}, viewport: {left: 0, top: 0, width: 1440, height: 900, layoutHeight: 900}, preferredWidth: 440, contentHeight: 600 };
    const opening = resolveWorkbenchDialogPositionV3(input);
    expect(opening.top).toBe(155);
    const origin = {left: Number(opening.left), top: Number(opening.top)};
    expect(resolveWorkbenchDialogPositionV3({...input, origin, contentHeight: 150})).toEqual(opening);
  });

  it("clamps an open desktop popup to a resized viewport without leaving its footer offscreen", () => {
    const position = resolveWorkbenchDialogPositionV3({anchor: {left: 1400, top: 398, bottom: 434}, origin: {left: 992, top: 439}, viewport: {left: 0, top: 0, width: 900, height: 480, layoutHeight: 480}, preferredWidth: 440, contentHeight: 900});
    expect(position).toEqual({left: 452, top: 232, width: 440, maxHeight: 240});
  });

  it("uses the visible viewport bottom for mobile sheets including keyboard offsets", () => {
    const input = {anchor: {left: 1400, top: 398, bottom: 434}, viewport: {left: 20, top: 200, width: 390, height: 360, layoutHeight: 844}, preferredWidth: 440, contentHeight: 300};
    const position = resolveWorkbenchDialogPositionV3(input);
    expect(position).toEqual({left: 28, bottom: 292, width: 374, maxHeight: 336});
    expect(resolveWorkbenchDialogPositionV3({...input, contentHeight: 900})).toEqual(position);
    expect(resolveWorkbenchDialogPositionV3({...input, viewport: {...input.viewport, left: 0, top: 0, height: 844}}).bottom).toBe(8);
  });

  it("reorders graph items without reallocating colors or changing per-scenario exclusions", async () => {
    const { modelSurface: { contract } } = await loadStudioLocalCurrentClientCompositionV1();
    const base = createDefaultExperimentSurfaceV3(contract).graphPanes.find(p => p.graphId === "hemodynamics.pressure-volume")!;
    const original = { ...base, series: [{ seriesId: "LV", label: "LV", order: 0 }, { seriesId: "LA", label: "LA", order: 1 }],
      traceColors: [{ scenarioId: "a", seriesId: "LV", automaticColorHex: "#cc2244", customColorHex: "#008877" }],
      excludedTraces: [{ scenarioId: "b", seriesId: "LA" }] };
    const changed = renameWorkbenchPaneItemV3(reorderWorkbenchPaneItemsV3(original, ["LA", "LV"]), "LV", "Left ventricle");
    expect(changed).toMatchObject({ series: [{ seriesId: "LA", order: 0 }, { seriesId: "LV", order: 1, label: "Left ventricle" }], traceColors: original.traceColors, excludedTraces: original.excludedTraces });
    expect(original.series[0]!.label).toBe("LV");
  });
  it("renames and moves grouped pressure outputs atomically while retaining control presentations", async () => {
    const { modelSurface: { contract } } = await loadStudioLocalCurrentClientCompositionV1();
    const surface = createDefaultExperimentSurfaceV3(contract);
    const summary = STUDIO_OUTPUT_PRESSURE_SUMMARIES_V1.find(s => s.presentationId === "presentation.pressure-summary.Ao")!;
    const base = { ...surface.outputPanes[0]!, items: [...summary.memberOutputIds.map((outputId, order) => ({ outputId, label: "AoP", order })), { outputId: "test", label: "Test", order: 2 }] };
    const changed = renameWorkbenchPaneItemV3(reorderWorkbenchPaneItemsV3(base, ["test", summary.presentationId]), summary.presentationId, "Arterial pressure");
    expect(changed.role === "output" && changed.items.map(i => [i.outputId, i.label, i.order])).toEqual([
      ["test", "Test", 0], ...summary.memberOutputIds.map((id, index) => [id, "Arterial pressure", index + 1]),
    ]);
    const control = surface.controlPanes[0]!;
    const ids = [...control.items].reverse().map(i => i.controlId);
    const reordered = reorderWorkbenchPaneItemsV3(control, ids);
    expect(reordered.role === "control" && reordered.items.map(i => i.presentation)).toEqual([...control.items].reverse().map(i => i.presentation));
    expect(reordered).toMatchObject({ binding: control.binding });
  });
  it("starts new selection drafts empty and requires a selection only at commit", async () => {
    const { modelSurface: { contract } } = await loadStudioLocalCurrentClientCompositionV1();
    const surface = createDefaultExperimentSurfaceV3(contract);
    for (const kind of ["graph", "output", "control"] as const) {
      const result = addWorkbenchSurfacePaneV3(surface, kind, contract, "hemodynamics.pressure-volume", undefined, { emptyItems: true });
      const pane = kind === "graph" ? result.surface.graphPanes.at(-1)! : kind === "output" ? result.surface.outputPanes.at(-1)! : result.surface.controlPanes.at(-1)!;
      expect(canCommitWorkbenchPaneV3(pane, contract, true)).toBe(false);
      const entries = workbenchPaneSelectionEntriesV3(pane, contract, "ja");
      expect(entries.some(entry => entry.selected)).toBe(false);
      const id = kind === "graph" ? "LA" : entries[0]!.id;
      const selected = toggleWorkbenchPaneSelectionV3(pane, id, pane);
      expect(canCommitWorkbenchPaneV3(selected, contract, true)).toBe(true);
      const removed = toggleWorkbenchPaneSelectionV3(selected, id, selected);
      expect(canCommitWorkbenchPaneV3(removed, contract, true)).toBe(false);
      expect(canCommitWorkbenchPaneV3(removed, contract, false)).toBe(kind !== "graph");
      expect(surface).not.toBe(result.surface);
    }
  });

  it("retains graph labels, colors, visibility and display settings through transient empty selection", async () => {
    const { modelSurface: { contract } } = await loadStudioLocalCurrentClientCompositionV1();
    const surface = createDefaultExperimentSurfaceV3(contract);
    const base = surface.graphPanes.find(pane => pane.graphId === "hemodynamics.pressure-volume")!;
    const original = { ...base, label: "My PV", historyDepth: 3, showPvaBoundary: true, showPressureEnvelope: false,
      series: [{ seriesId: "LV", label: "Custom LV", order: 0 }],
      excludedTraces: [{ scenarioId: "comparison", seriesId: "LV" }],
      traceColors: [{ scenarioId: "comparison", seriesId: "LV", automaticColorHex: "#cc2244", customColorHex: "#008877" }] };
    const empty = toggleWorkbenchPaneSelectionV3(original, "LV", original);
    expect(empty.role === "graph" && empty.series).toEqual([]);
    const restored = toggleWorkbenchPaneSelectionV3(empty, "LV", original);
    expect(finalizeWorkbenchPaneSelectionV3(restored)).toEqual(original);
    const replaced = finalizeWorkbenchPaneSelectionV3(toggleWorkbenchPaneSelectionV3(empty, "LA", original));
    expect(replaced).toMatchObject({ label: "My PV", historyDepth: 3, showPvaBoundary: true, showPressureEnvelope: false, series: [{ seriesId: "LA" }], traceColors: [], excludedTraces: [] });
  });

  it("preserves custom controller buttons and binding when toggling items", async () => {
    const { modelSurface: { contract } } = await loadStudioLocalCurrentClientCompositionV1();
    const base = createDefaultExperimentSurfaceV3(contract).controlPanes[0]!;
    const original = { ...base, binding: { mode: "fixed" as const, scenarioIds: ["a", "b"] }, items: [{ controlId: "rhythm.heart-rate-bpm", label: "Pacing", order: 0, presentation: { kind: "buttons" as const, options: [{ label: "Rest", value: 60 }, { label: "Stress", value: 100 }] } }] };
    const empty = toggleWorkbenchPaneSelectionV3(original, "rhythm.heart-rate-bpm", original);
    const restored = toggleWorkbenchPaneSelectionV3(empty, "rhythm.heart-rate-bpm", original);
    expect(restored).toEqual(original);
  });

  it("selects grouped pressure outputs once and keeps existing labels and bindings", async () => {
    const { modelSurface: { contract } } = await loadStudioLocalCurrentClientCompositionV1();
    const surface = createDefaultExperimentSurfaceV3(contract);
    const result = addWorkbenchSurfacePaneV3(surface, "output", contract, undefined, undefined, { emptyItems: true });
    const base = result.surface.outputPanes.at(-1)!;
    const summary = STUDIO_OUTPUT_PRESSURE_SUMMARIES_V1.find(summary => summary.memberOutputIds.every(id => contract.outputCatalog.some(item => item.outputId === id)))!;
    const selected = toggleWorkbenchPaneSelectionV3(base, summary.presentationId, base);
    expect(selected.role === "output" && selected.items.map(item => item.outputId)).toEqual(summary.memberOutputIds);
    const options = workbenchPaneSelectionEntriesV3(selected, contract, "ja");
    expect(options.filter(entry => entry.selected).map(entry => entry.id)).toEqual([summary.presentationId]);
    const removed = toggleWorkbenchPaneSelectionV3(selected, summary.presentationId, selected);
    expect(removed.role === "output" && removed.items).toEqual([]);
  });

  it("remembers the latest advanced edits and restores hidden trace metadata after returning to selection", async () => {
    const { modelSurface: { contract } } = await loadStudioLocalCurrentClientCompositionV1();
    const base = createDefaultExperimentSurfaceV3(contract).graphPanes.find(pane => pane.graphId === "hemodynamics.pressure-volume")!;
    const scenarioId = base.traceColors![0]!.scenarioId;
    const advanced = { ...base, series: [{ seriesId: "LV", label: "Latest LV", order: 0 }],
      traceColors: [{ scenarioId, seriesId: "LV", automaticColorHex: "#123456", customColorHex: "#008877" }], excludedTraces: [{ scenarioId, seriesId: "LV" }] };
    const memory = rememberWorkbenchPaneItemsV3(base, advanced);
    const off = toggleWorkbenchPaneSelectionV3(advanced, "LV", memory);
    const prunedInSettings = finalizeWorkbenchPaneSelectionV3(off);
    const memoryAfterSettings = rememberWorkbenchPaneItemsV3(memory, prunedInSettings);
    const restored = toggleWorkbenchPaneSelectionV3(prunedInSettings, "LV", memoryAfterSettings);
    expect(restored).toEqual(advanced);
  });

  it("shows reset only for an explicit trace override, including a custom color equal to automatic", async () => {
    const { modelSurface: { contract } } = await loadStudioLocalCurrentClientCompositionV1();
    const surface = createDefaultExperimentSurfaceV3(contract, "scenario/a");
    const pane = surface.graphPanes.find(pane => pane.graphId === "hemodynamics.pressure-volume")!;
    const graph = contract.graphCatalog.find(graph => graph.graphId === pane.graphId)!;
    const trace = pane.traceColors!.find(trace => trace.seriesId === "LV")!;
    const render = (candidate: typeof pane) => renderToStaticMarkup(<WorkbenchTraceRowsV3 pane={candidate} graph={graph} seriesId="LV" scenarios={[{scenarioId: trace.scenarioId, label: "Baseline", visible: false}]} surface={surface} strings={DEFAULT_WORKBENCH_PANE_EDITOR_STRINGS_V3} locale="en" onChange={vi.fn()} />);
    expect(render(pane)).not.toContain('lucide-rotate-ccw');
    expect(render(pane)).not.toContain('type="checkbox"');
    expect(render(pane)).toContain('aria-pressed="true"');
    expect(render(pane)).toContain("Hidden in all graphs");
    const custom = updateWorkbenchGraphTraceCustomColorV3(pane, {scenarioId: trace.scenarioId, seriesId: "LV", colorHex: trace.automaticColorHex});
    expect(render(custom)).toContain('lucide-rotate-ccw');
    const reset = updateWorkbenchGraphTraceCustomColorV3(custom, {scenarioId: trace.scenarioId, seriesId: "LV", colorHex: null});
    expect(render(reset)).not.toContain('lucide-rotate-ccw');
  });
  it("exposes only assessed finite scalar outputs", () => {
    const output = {
      outputId: "test.output",
      availability: "available" as const,
      quality: "accepted-derived" as const,
      value: 12.5,
    };

    expect(scalarAvailableOutputV3(output)).toBe(12.5);
    expect(
      scalarAvailableOutputV3({ ...output, quality: "not-assessed" }),
    ).toBeNull();
    expect(scalarAvailableOutputV3({ ...output, value: Number.NaN })).toBeNull();
    expect(
      scalarAvailableOutputV3({ ...output, value: Number.POSITIVE_INFINITY }),
    ).toBeNull();
    expect(
      scalarAvailableOutputV3({
        ...output,
        availability: "not-evaluated-at-accepted-state",
      }),
    ).toBeNull();
  });

  it("shares localized presentation metadata across output and control item paths", () => {
    const presentation = resolveStudioItemPresentationV1({
      kind: "control",
      itemId: "rhythm.heart-rate-bpm",
      fallbackEnglishLabel: "Heart rate (HR)",
      locale: "ja",
    });

    expect(presentation.label).toBe("HR");
    expect(presentation.description).toContain("心拍数");
    expect(presentation.description.endsWith("。")).toBe(false);
    expect(studioItemPresentationMatchesQueryV1(presentation, "脈拍")).toBe(
      true,
    );
    expect(
      resolveStudioSurfaceItemLabelV1({
        storedLabel: "Heart rate (HR)",
        legacyDefaultLabel: "Heart rate (HR)",
        presentation,
      }),
    ).toBe("HR");
    expect(
      resolveStudioSurfaceItemLabelV1({
        storedLabel: "Custom chronotropy",
        legacyDefaultLabel: "Heart rate (HR)",
        presentation,
      }),
    ).toBe("Custom chronotropy");
  });

  it("keeps the historical Standard 65 SAP series label station-specific", () => {
    const currentDefaultLabel = outputLabelV3(
      "hemodynamics.pressure.absolute.SA",
    );
    const presentation = resolveStudioItemPresentationV1({
      kind: "output",
      itemId: "hemodynamics.pressure.absolute.SA",
      fallbackEnglishLabel: currentDefaultLabel,
      locale: "ja",
      catalogFacts: { outputKind: "signal" },
    });

    expect(currentDefaultLabel).toBe("Arterial blood pressure (ABP)");
    expect(
      resolveStudioSurfaceItemLabelV1({
        storedLabel: "Systemic arterial pressure",
        legacyDefaultLabel: currentDefaultLabel,
        presentation,
      }),
    ).toBe("ABP");
    expect(
      resolveStudioSurfaceItemLabelV1({
        storedLabel: "My arterial trace",
        legacyDefaultLabel: currentDefaultLabel,
        presentation,
      }),
    ).toBe("My arterial trace");

    expect(
      resolveWorkbenchGraphSeriesPresentationV3({
        definition: undefined,
        locale: "en",
        outputId: "hemodynamics.pressure.absolute.SA",
        seriesId: "SAP",
        storedLabel: "Systemic arterial pressure",
      }).label,
    ).toBe("SAP");
    expect(
      resolveWorkbenchGraphSeriesPresentationV3({
        definition: undefined,
        locale: "en",
        outputId: "hemodynamics.pressure.absolute.SA",
        seriesId: "SAP",
        storedLabel: "My arterial trace",
      }).label,
    ).toBe("My arterial trace");
    expect(
      resolveWorkbenchGraphSeriesPresentationV3({
        definition: undefined,
        locale: "ja",
        outputId:
          "hemodynamics.pressure.absolute.aortic-proximal-constitutive-port",
        seriesId: "AoP",
        storedLabel: "AoP",
      }).label,
    ).toBe("AoP");
  });

  it("discloses cold-restart clock replacement without changing warm controls", () => {
    const baseControl = {
      controlId: "rhythm.heart-rate-bpm",
      valueType: "number" as const,
      unit: "bpm",
      minimum: 30,
      maximum: 180,
      step: 1,
      defaultValue: 75,
    };
    const coldControl = {
      ...baseControl,
      changeSemantics: "cold-restart" as const,
    };
    const warmControl = {
      ...baseControl,
      changeSemantics: "accepted-state-warm-start" as const,
    };
    const cold = resolveWorkbenchControlPresentationV3({
      definition: coldControl,
      storedLabel: "Heart rate (HR)",
      locale: "en",
    });
    const warm = resolveWorkbenchControlPresentationV3({
      definition: warmControl,
      storedLabel: "Heart rate (HR)",
      locale: "en",
    });
    const coldJa = resolveWorkbenchControlPresentationV3({
      definition: coldControl,
      storedLabel: "Heart rate (HR)",
      locale: "ja",
    });

    expect(cold.description).toContain("resets elapsed time to zero");
    expect(cold.description).toContain("restarts the simulation");
    expect(warm.description).toBe("Heart rate: the number of heartbeats per minute");
    expect(coldJa.description).toContain("経過時間を0に戻して");
    expect(coldJa.description).toContain("最初からやり直す");

    const coldMarkup = renderToStaticMarkup(
      <ExperimentNumericControlV3
        control={coldControl}
        description={cold.description}
        descriptionAriaLabel={`About ${cold.label}`}
        disabled={false}
        label={cold.label}
        mixed={false}
        pending={false}
        presentation={{ kind: "slider" }}
        value={75}
        onCommit={async () => true}
      />,
    );
    const warmMarkup = renderToStaticMarkup(
      <ExperimentNumericControlV3
        control={warmControl}
        disabled={false}
        label={warm.label}
        mixed={false}
        pending={false}
        presentation={{ kind: "slider" }}
        value={75}
        onCommit={async () => true}
      />,
    );
    expect(coldMarkup).toContain(
      'data-testid="workbench-item-description-trigger-v3"',
    );
    expect(coldMarkup).toContain(`aria-label="About ${cold.label}"`);
    expect(warmMarkup).not.toContain(
      "workbench-item-description-trigger-v3",
    );
  });

  it("uses the waveform label as the description trigger and retains its visibility action", () => {
    const model = buildWorkbenchTraceLegendModelV3([
      {
        traceKey: "baseline:aop",
        scenarioId: "baseline",
        scenarioLabel: "Baseline",
        itemId: "aop",
        itemLabel: "AoP",
        itemDescription:
          "Proximal constitutive-port pressure without wave reflection",
        itemDescriptionLabel: "About AoP",
        color: "#167db8",
      },
    ]);
    const markup = renderToStaticMarkup(
      <WorkbenchChartLegendV3
        model={model}
        selection={null}
        onHoverSelection={() => undefined}
        onToggleVisibility={() => undefined}
      />,
    );

    expect(markup).toContain("AoP");
    expect(markup).toContain('aria-label="AoP"');
    expect(markup).toContain('aria-pressed="false"');
    expect(markup).not.toContain("lucide-info");
    expect(markup).toContain(
      'data-testid="workbench-item-description-trigger-v3"',
    );
    expect(markup).not.toContain("without wave reflection");
  });

  it("attaches descriptions to each existing grouped label without adding extra buttons", () => {
    const model = buildWorkbenchTraceLegendModelV3([
      ...["baseline", "comparison"].flatMap((scenarioId) => [
        {
          traceKey: `${scenarioId}:aop`,
          scenarioId,
          scenarioLabel: scenarioId,
          itemId: "aop",
          itemLabel: "AoP",
          itemDescription: "AoP limitation",
          itemDescriptionLabel: "About AoP",
          color: "#167db8",
        },
        {
          traceKey: `${scenarioId}:abp`,
          scenarioId,
          scenarioLabel: scenarioId,
          itemId: "abp",
          itemLabel: "ABP",
          itemDescription: "ABP limitation",
          itemDescriptionLabel: "About ABP",
          color: "#c084fc",
        },
      ]),
    ]);
    const markup = renderToStaticMarkup(
      <WorkbenchChartLegendV3
        model={model}
        selection={null}
        onHoverSelection={() => undefined}
        onToggleVisibility={() => undefined}
      />,
    );

    expect(
      markup.match(/data-testid="workbench-item-description-trigger-v3"/g),
    ).toHaveLength(4);
    expect(markup.match(/<button /g)).toHaveLength(6);
  });

  it.each(["items", "scenarios", "groups", "empty"])("keeps the graph action in the legend row for %s legends", (mode) => {
    const model = buildWorkbenchTraceLegendModelV3(mode === "empty" ? [] :
      (mode === "items" ? ["baseline"] : ["baseline", "comparison"]).flatMap(scenarioId =>
        (mode === "scenarios" ? ["LV"] : ["LV", "RV"]).map(itemId => ({
          traceKey: `${scenarioId}:${itemId}`, scenarioId, scenarioLabel: scenarioId,
          itemId, itemLabel: itemId, color: "#cc2244",
        }))));
    const props = { model, selection: null, onHoverSelection: () => undefined, onToggleVisibility: () => undefined };
    const markup = renderToStaticMarkup(<WorkbenchChartLegendV3 {...props}
      actions={<button aria-label="表示項目を編集"><svg aria-hidden="true" /></button>} />);
    expect(markup.match(/data-chart-legend-row="true"/g)).toHaveLength(1);
    expect(markup.match(/data-chart-legend-actions="true"/g)).toHaveLength(1);
    expect(markup).toContain('<button aria-label="表示項目を編集"><svg aria-hidden="true"></svg></button>');
    if (mode !== "empty") expect(markup).toContain(`data-chart-legend="${mode}"`);
    const readOnlyMarkup = renderToStaticMarkup(<WorkbenchChartLegendV3 {...props} />);
    expect(readOnlyMarkup).not.toContain("data-chart-legend-actions");
    if (mode === "empty") expect(readOnlyMarkup).toBe("");
  });

  it("normalizes kana when searching shared item aliases", () => {
    const presentation = resolveStudioItemPresentationV1({
      kind: "control",
      itemId: "hemodynamics.venous-tone",
      fallbackEnglishLabel: "Venous tone",
      locale: "ja",
    });

    expect(studioItemPresentationMatchesQueryV1(presentation, "とーん")).toBe(
      true,
    );
  });

  it("classifies valve gradients with valve outputs and presents accepted PV work as SW", () => {
    expect(
      studioItemPresentationCategoryV1(
        "hemodynamics.pressure-gradient.valve.mean-hydraulic-forward.AoV",
      ),
    ).toBe("valves");

    const work = resolveStudioItemPresentationV1({
      kind: "output",
      itemId: "myocardium.work.external.LV-transmural-pressure-volume-path",
      fallbackEnglishLabel: "LV stroke work (SW)",
      locale: "en",
    });
    expect(work.description).toContain("line integral");
    expect(work.description).toContain("stroke work");
    expect(work.aliases).toContain("stroke work");
  });

  it("resolves picker metadata without generating tautological output descriptions", async () => {
    const { contract } = (await loadStudioDefaultClientCompositionV2())
      .modelSurface;
    for (const locale of ["en", "ja"] as const) {
      for (const output of contract.outputCatalog) {
        const presentation = resolveStudioItemPresentationV1({
          kind: "output",
          itemId: output.outputId,
          fallbackEnglishLabel: output.outputId,
          locale,
          catalogFacts: {
            outputKind: output.kind,
          },
        });
        expect(presentation.label.length).toBeGreaterThan(0);
        expect(presentation.label, output.outputId).not.toBe(output.outputId);
        expect(presentation.description, output.outputId).not.toBe("");
        expect(presentation.description).not.toMatch(/時系列信号|accepted solver step|observer|Time-varying signal/);
        expect(presentation.description).not.toMatch(/[。.!]$/u);
      }
      for (const control of contract.controlCatalog) {
        const presentation = resolveStudioItemPresentationV1({
          kind: "control",
          itemId: control.controlId,
          fallbackEnglishLabel: control.controlId,
          locale,
        });
        expect(presentation.label.length).toBeGreaterThan(0);
        expect(presentation.description.length).toBeGreaterThan(0);
        expect(presentation.description).not.toMatch(/parameter|accepted|solver|compartment|Land Tref|ではなく|ではありません|Not EF/);
        expect(presentation.description).not.toMatch(/[。.!]$/u);
      }
    }
  });

  it("leaves unknown descriptions empty and preserves custom labels when clinical defaults change", () => {
    for (const kind of ["control", "output"] as const) {
      const presentation = resolveStudioItemPresentationV1({ kind, itemId: "unknown.item", fallbackEnglishLabel: "Future item", locale: "ja" });
      expect(presentation.description).toBe("");
    }
    const presentation = resolveStudioItemPresentationV1({ kind: "control", itemId: "valve.maximum-forward-eoa-cm2.AoV", fallbackEnglishLabel: "AoV maximum forward EOA", locale: "ja" });
    expect(presentation.label).toBe("AV 弁口面積");
    expect(presentation.description).toContain("大動脈弁");
    expect(resolveStudioSurfaceItemLabelV1({ presentation, legacyDefaultLabel: "AoV maximum forward EOA", storedLabel: "大動脈弁 (AoV) 最大EOA" })).toBe("AV 弁口面積");
    expect(resolveStudioSurfaceItemLabelV1({ presentation, legacyDefaultLabel: "AoV maximum forward EOA", storedLabel: "My valve" })).toBe("My valve");
  });

  it("provides physiological meanings for every exposed waveform series in both languages", async () => {
    const { contract } = (await loadStudioDefaultClientCompositionV2()).modelSurface;
    for (const graph of contract.graphCatalog) {
      if (graph.renderer !== "sweep") continue;
      for (const series of graph.seriesCatalog) for (const locale of ["ja", "en"] as const) {
        const presentation = resolveWorkbenchGraphSeriesPresentationV3({ definition: undefined, locale, outputId: series.outputId, seriesId: series.seriesId, storedLabel: undefined });
        expect(presentation.description, series.outputId).not.toBe("");
        expect(presentation.description).not.toMatch(/時系列信号|accepted|solver|Time-varying signal|ではありません/);
      }
    }
    const resolve = (seriesId: string, outputId: string) => resolveWorkbenchGraphSeriesPresentationV3({ definition: undefined, locale: "ja", outputId, seriesId, storedLabel: undefined });
    expect(resolve("AoV", "hemodynamics.flow.valve.AoV").label).toBe("AV");
    expect(resolve("PVeinP", "hemodynamics.pressure.absolute.PVein").label).toBe("肺静脈圧");
    expect(resolve("LADQmEndo", "coronary.flow.layer-qm-internal.LAD.subendocardial").description).toContain("左前下行枝（LAD）領域の心内膜側");
  });

  it("keeps clinical pressure summaries separate from atomic output identity", () => {
    expect(STUDIO_OUTPUT_PRESSURE_SUMMARIES_V1).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          presentationId: "presentation.pressure-summary.Ao",
          memberOutputIds: [
            "hemodynamics.pressure.systolic.Ao",
            "hemodynamics.pressure.diastolic.Ao",
          ],
        }),
        expect.objectContaining({
          presentationId: "presentation.pressure-summary.PA",
        }),
      ]),
    );
  });

  it("formats output values from catalog-owned significant digits", () => {
    expect(formatExperimentOutputValueV3(87.1, 3)).toBe("87.1");
    expect(formatExperimentOutputValueV3(5, 3)).toBe("5.00");
    expect(formatExperimentOutputValueV3(0.004321, 3)).toBe("0.00432");
    expect(formatExperimentOutputValueV3(1_234, 3)).toBe("1230");
    expect(
      formatExperimentPressureSummaryV3({
        maximum: 94.6,
        minimum: 63.8,
      }),
    ).toBe("94.6/63.8");
  });

  it("renders clinical fractions as percentages and keeps dimensionless ratios unscaled", () => {
    expect(
      resolveExperimentOutputDisplayV3({
        itemId: "hemodynamics.ejection-fraction.LV-event-defined", outputId: "hemodynamics.ejection-fraction.LV-event-defined",
        label: "LVEF",
        value: 0.604,
        unit: "1",
        significantDigits: 3,
      }),
    ).toEqual({ value: "60", unit: "%" });
    expect(
      resolveExperimentOutputDisplayV3({
        itemId: "oxygen.delivery-to-consumption-ratio", outputId: "oxygen.delivery-to-consumption-ratio",
        label: "DO₂/VO₂",
        value: 4.25,
        unit: "1",
        significantDigits: 3,
      }),
    ).toEqual({ value: "4.25", unit: "" });
    expect(resolveExperimentOutputDisplayV3({
      itemId: "hemodynamics.index.myocardial-performance.flow-event.LV", outputId: "hemodynamics.index.myocardial-performance.flow-event.LV",
      label: "LV Tei", value: .702, unit: "1", significantDigits: 3,
    })).toEqual({ value: "0.70", unit: "" });
  });

  it("keeps pressure resolution stable across magnitudes and preserves small research quantities", () => {
    const display = (value: number, unit: string) => resolveExperimentOutputDisplayV3({
      itemId: "measurement", outputId: "measurement", label: "Measurement", value, unit, significantDigits: 3,
    }).value;
    expect([3.08, 30.8, 99.99, 111, -0.001].map(value => display(value, "mmHg")))
      .toEqual(["3.1", "30.8", "100.0", "111.0", "0.0"]);
    expect(display(5.037, "L/min")).toBe("5.04");
    expect(display(0.2034, "mL O2/beat/100g")).toBe("0.203");
  });

  it("uses clinical output units in the picker without exposing the dimensionless contract unit", async () => {
    const { contract } = (await loadStudioDefaultClientCompositionV2()).modelSurface;
    const surface = createDefaultExperimentSurfaceV3(contract, "scenario/a");
    const outputs = workbenchPaneSelectionEntriesV3(surface.outputPanes[0]!, contract, "ja");
    expect(outputs.find(entry => entry.id === "hemodynamics.ejection-fraction.LV-event-defined")?.unit).toBe("%");
    expect(outputs.find(entry => entry.id === "hemodynamics.index.myocardial-performance.flow-event.LV")?.unit).toBe("");
    const duration = outputs.find(entry => entry.id.startsWith("hemodynamics.duration."));
    expect(duration?.unit).toBe("ms");
    expect(outputs.find(entry => entry.id === "presentation.pressure-summary.Ao")?.unit).toBe("mmHg");
    expect(outputs.some(entry => entry.unit === "1")).toBe(false);
    const controls = workbenchPaneSelectionEntriesV3(surface.controlPanes[0]!, contract, "ja");
    expect(controls.find(entry => entry.id === "oxygen.respiratory-exchange-ratio")).toMatchObject({ label: "呼吸交換比", unit: undefined });
    expect(controls.find(entry => entry.id === "rhythm.heart-rate-bpm")?.unit).toBe("bpm");
    expect(controls.some(entry => entry.unit === "1")).toBe(false);
    expect(contract.controlCatalog.find(control => control.controlId === "oxygen.respiratory-exchange-ratio")?.unit).toBe("1");
  });

  it("groups large catalogs without losing entries or hiding search matches in collapsed sections", async () => {
    const { contract } = (await loadStudioDefaultClientCompositionV2()).modelSurface;
    const surface = createDefaultExperimentSurfaceV3(contract, "scenario/a");
    const entries = workbenchPaneSelectionEntriesV3(surface.outputPanes[0]!, contract, "ja");
    const groups = workbenchPaneCatalogGroupsV3(entries, "");
    expect(groups[0]!.category).toBe("hemodynamics");
    expect(workbenchPaneCatalogGroupsV3([...entries].reverse(), "").map(group => group.category)).toEqual(groups.map(group => group.category));
    expect(groups.flatMap(group => group.entries).map(entry => entry.id).sort()).toEqual(entries.map(entry => entry.id).sort());
    expect(groups.reduce((count, group) => count + group.selectedCount, 0)).toBe(entries.filter(entry => entry.selected).length);
    expect(workbenchPaneCatalogGroupsV3(entries, "中心静脈圧").flatMap(group => group.entries).some(entry => entry.label === "CVP")).toBe(true);
    expect(workbenchPaneCatalogGroupsV3(entries, "does-not-exist-123")).toEqual([]);
    const render = (query: string) => renderToStaticMarkup(<WorkbenchPaneCatalogV3 entries={entries} query={query} expandedCategories={new Set()} onExpandedCategoriesChange={vi.fn()} strings={DEFAULT_WORKBENCH_PANE_EDITOR_STRINGS_V3} locale="en" onToggle={vi.fn()} />);
    expect(render("")).not.toContain('type="checkbox"');
    expect(render("LVEF")).toContain('type="checkbox"');
    expect(render("LVEF")).toContain('pane-catalog-unit-v3">%</span>');
  });

  it("explains chamber signals and preserves clinical search terms behind short labels", () => {
    const resolve = (itemId: string) => resolveStudioItemPresentationV1({
      kind: "output", itemId, fallbackEnglishLabel: outputLabelV3(itemId), locale: "ja",
    });
    const cvp = resolve("hemodynamics.pressure.mean.RA");
    expect(cvp.label).toBe("CVP");
    expect(studioItemPresentationMatchesQueryV1(cvp, "中心静脈圧")).toBe(true);
    expect(resolve("hemodynamics.volume.LA").description).toContain("左房内の血液量");
    expect(resolve("unknown.output").description).toBe("");
  });

  it("uses clinical Japanese valve terms without changing quantities or losing English search", async () => {
    const { contract } = (await loadStudioDefaultClientCompositionV2()).modelSurface;
    const surface = createDefaultExperimentSurfaceV3(contract, "scenario/a");
    const entries = workbenchPaneSelectionEntriesV3(surface.outputPanes[0]!, contract, "ja");
    const cases = [
      ["hemodynamics.valve-volume.forward.MV", "MV 流入量", "mL", "forward volume"],
      ["hemodynamics.valve-volume.reverse.MV", "MV 逆流量", "mL", "reverse volume"],
      ["hemodynamics.valve-volume.net.MV", "MV 実効流入量", "mL", "net volume"],
      ["hemodynamics.valve-regurgitant-fraction.same-valve.MV", "MV 逆流率", "%", "regurgitant fraction"],
      ["hemodynamics.valve-volume.forward.AoV", "AV 拍出量", "mL", "AoV forward"],
      ["hemodynamics.valve-volume.net.AoV", "実効SV", "mL", "AV net"],
    ];
    for (const [id, label, unit, query] of cases) {
      const entry = entries.find(entry => entry.id === id)!;
      expect(entry, id).toMatchObject({ label, unit });
      expect(entry.presentation.description).toContain("1心拍");
      expect(entry.reading).toBeUndefined();
      expect(studioItemPresentationMatchesQueryV1(entry.presentation, query!)).toBe(true);
    }
    expect(entries.find(entry => entry.id === "hemodynamics.pressure-gradient.valve.mean-hydraulic-forward.AoV")?.label).toBe("AV 平均圧較差");
    expect(entries.find(entry => entry.id === "hemodynamics.pressure-gradient.mean-bernoulli-jet.AoV")?.label).toBe("AV 平均圧較差");
    expect(entries.find(entry => entry.id === "oxygen.saturation.arterial")?.label).toBe("SaO₂");
  });

  it("separates pulsatile readings from useful current values and searches folded waveforms", async () => {
    const { contract } = (await loadStudioDefaultClientCompositionV2()).modelSurface;
    const surface = createDefaultExperimentSurfaceV3(contract, "scenario/a");
    const entries = workbenchPaneSelectionEntriesV3(surface.outputPanes[0]!, contract, "ja");
    for (const definition of contract.outputCatalog.filter(output => output.kind === "signal")) {
      expect(entries.find(entry => entry.id === definition.outputId)?.reading, definition.outputId).toBeDefined();
    }
    for (const id of ["rhythm.heart-rate.instantaneous", "respiration.pressure.pleural", "pericardium.volume.fluid", "coronary.tone-resistance-scale.LAD.subendocardial"]) {
      expect(entries.find(entry => entry.id === id)?.reading, id).toBe("current");
    }
    expect(entries.find(entry => entry.id === "hemodynamics.flow.mean-ejection.AoV")?.reading).toBeUndefined();
    const groups = workbenchPaneCatalogGroupsV3(entries, "");
    for (const group of groups) {
      const firstWave = group.entries.findIndex(entry => entry.reading === "waveform");
      if (firstWave >= 0) expect(group.entries.slice(firstWave).every(entry => entry.reading === "waveform")).toBe(true);
    }
    const render = (query: string) => renderToStaticMarkup(<WorkbenchPaneCatalogV3 entries={entries} query={query} expandedCategories={new Set(["valves", "rhythm", "pericardium"])} onExpandedCategoriesChange={vi.fn()} strings={DEFAULT_WORKBENCH_PANE_EDITOR_STRINGS_V3} locale="ja" onToggle={vi.fn()} />);
    expect(render("")).toContain("MV 流入量");
    expect(render("")).not.toContain('data-item-id="hemodynamics.flow.valve.MV"');
    expect(render("")).toContain('data-item-id="rhythm.heart-rate.instantaneous"');
    expect(render("")).toContain('data-item-id="pericardium.volume.fluid"');
    expect(render("MV 瞬時値")).toContain('data-item-id="hemodynamics.flow.valve.MV"');
    const controls = workbenchPaneSelectionEntriesV3(surface.controlPanes[0]!, contract, "ja");
    expect(controls.every(entry => entry.reading === undefined)).toBe(true);
    expect(controls.find(entry => entry.id === "myocardium.lv-contractility")?.label).toBe("LV 収縮性");
    expect(controls.find(entry => entry.id === "coronary.structural-rm-resistance-scale.LAD.subendocardial")?.label).toBe("LAD 微小血管抵抗（心内膜側）");
  });

  it("updates previous generated clinical labels while keeping authored names intact", () => {
    for (const [kind, id, old, expected] of [
      ["control", "myocardium.lv-contractility", "左室収縮性", "LV 収縮性"],
      ["control", "myocardium.active-tension-scale.LVFW", "左室自由壁収縮性", "LV自由壁 収縮性"],
      ["control", "valve.maximum-forward-eoa-cm2.AoV", "AV弁口面積", "AV 弁口面積"],
      ["output", "hemodynamics.flow.valve.MV", "僧帽弁流量", "MV 流量"],
      ["output", "hemodynamics.pressure-gradient.valve.mean-hydraulic-forward.AoV", "AV 平均圧較差（LV−Ao）", "AV 平均圧較差"],
      ["output", "hemodynamics.pressure-gradient.mean-bernoulli-jet.AoV", "AV 平均圧較差（4v²）", "AV 平均圧較差"],
      ["output", "hemodynamics.valve-volume.net.MV", "MV 流入量（逆流差引）", "MV 実効流入量"],
      ["output", "hemodynamics.valve-volume.net.TV", "TV 流入量（逆流差引）", "TV 実効流入量"],
      ["output", "hemodynamics.stroke-volume.LV-extrema", "LVSV（最大−最小）", "LVSV"],
      ["output", "hemodynamics.ejection-fraction.LV-extrema", "LVEF (volume range)", "LVEF"],
      ["output", "hemodynamics.pressure-rate.maximum-windowed-10ms.absolute.LV", "LV +dP/dt (10 ms)", "LV +dP/dt"],
      ["output", "hemodynamics.stroke-volume-index.forward.AoV-reference-bsa1p9", "前方SVI", "SVI"],
      ["output", "hemodynamics.ratio.peak-E-to-A.volumetric.MV", "MV E/A", "MV E/A（流量）"],
    ] as const) {
      const presentation = resolveStudioItemPresentationV1({ kind, itemId: id, fallbackEnglishLabel: id, locale: "ja" });
      expect(resolveStudioSurfaceItemLabelV1({ presentation, legacyDefaultLabel: id, storedLabel: old })).toBe(expected);
      expect(resolveStudioSurfaceItemLabelV1({ presentation, legacyDefaultLabel: id, storedLabel: "著者のラベル" })).toBe("著者のラベル");
      expect(studioItemPresentationMatchesQueryV1(presentation, old)).toBe(true);
    }
  });

  it("presents one catalog concept per method family without changing saved numerical identities", async () => {
    const { contract } = (await loadStudioDefaultClientCompositionV2()).modelSurface;
    const empty = { ...createDefaultExperimentSurfaceV3(contract, "scenario/a").outputPanes[0]!, items: [] };
    const entries = workbenchPaneSelectionEntriesV3(empty, contract, "ja");
    const catalog = workbenchPaneCatalogEntriesV3(entries);
    expect(catalog).toHaveLength(entries.length - STUDIO_OUTPUT_MEASUREMENT_FAMILIES_V1.length);
    for (const family of STUDIO_OUTPUT_MEASUREMENT_FAMILIES_V1) {
      const [primary, alternative] = family.methods;
      expect(family.methods.every(method => contract.outputCatalog.some(output => output.outputId === method.outputId))).toBe(true);
      const concept = catalog.find(entry => entry.id === family.id)!;
      expect(concept.selected).toBe(false);
      expect(catalog.some(entry => family.methods.some(method => method.outputId === entry.id))).toBe(false);
      expect(studioItemPresentationMatchesQueryV1(concept.presentation, alternative!.outputId)).toBe(true);
      const added = toggleWorkbenchPaneSelectionV3(empty, family.id, empty);
      expect(added.role === "output" && added.items.map(item => item.outputId)).toEqual([primary!.outputId]);
      const existing = { ...empty, items: [{ outputId: alternative!.outputId, label: "研究用の名前", order: 4 }] };
      const existingEntries = workbenchPaneSelectionEntriesV3(existing, contract, "ja");
      expect(existingEntries.filter(entry => entry.selected).map(entry => entry.id)).toEqual([alternative!.outputId]);
      expect(workbenchPaneCatalogEntriesV3(existingEntries).find(entry => entry.id === family.id)?.selected).toBe(true);
      expect(finalizeWorkbenchPaneSelectionV3(existing)).toBe(existing);
      const removed = toggleWorkbenchPaneSelectionV3(existing, family.id, existing);
      const restored = toggleWorkbenchPaneSelectionV3(removed, family.id, existing);
      expect(restored.role === "output" && restored.items).toEqual([{ ...existing.items[0], order: 0 }]);
      // A Surface exposing only one variant retains the atomic, supported item.
      expect(workbenchPaneCatalogEntriesV3(existingEntries.filter(entry => entry.id !== primary!.outputId)).some(entry => entry.id === alternative!.outputId)).toBe(true);
    }
  });

  it("switches methods in place, preserves custom names, and remembers only the selected variants", async () => {
    const { contract } = (await loadStudioDefaultClientCompositionV2()).modelSurface;
    const base = createDefaultExperimentSurfaceV3(contract, "scenario/a").outputPanes[0]!;
    for (const family of STUDIO_OUTPUT_MEASUREMENT_FAMILIES_V1) {
      const [primary, alternative] = family.methods;
      const pane = { ...base, items: [{ outputId: primary!.outputId, label: "独自ラベル", order: 3 }, { outputId: "oxygen.saturation.arterial", label: "SaO₂", order: 4 }] };
      const changed = changeWorkbenchOutputMethodV3(pane, primary!.outputId, alternative!.outputId);
      expect(changed.role === "output" && changed.items).toEqual([{ ...pane.items[0], outputId: alternative!.outputId }, pane.items[1]]);
      expect(pane.items[0]!.outputId).toBe(primary!.outputId);
      expect(changeWorkbenchOutputMethodV3(pane, primary!.outputId, "oxygen.saturation.arterial")).toBe(pane);
      const memory = rememberWorkbenchPaneItemsV3(pane, changed);
      const removed = toggleWorkbenchPaneSelectionV3(changed, family.id, memory);
      const methodMemory = rememberWorkbenchOutputMethodsV3(rememberWorkbenchOutputMethodsV3(new Map(), pane), changed);
      const afterRemoval = rememberWorkbenchOutputMethodsV3(methodMemory, removed);
      const restored = toggleWorkbenchPaneSelectionV3(removed, family.id, memory, afterRemoval.get(family.id));
      expect(restored.role === "output" && restored.items.map(item => item.outputId)).toEqual(["oxygen.saturation.arterial", alternative!.outputId]);
      const both = toggleWorkbenchPaneSelectionV3(changed, primary!.outputId, memory);
      const bothMemory = rememberWorkbenchPaneItemsV3(pane, both);
      const primaryRemoved = toggleWorkbenchPaneSelectionV3(both, primary!.outputId, bothMemory);
      const primaryRestored = toggleWorkbenchPaneSelectionV3(primaryRemoved, primary!.outputId, bothMemory);
      expect(primaryRestored.role === "output" && primaryRestored.items.find(item => item.outputId === primary!.outputId)?.label).toBe("独自ラベル");
      expect(changeWorkbenchOutputMethodV3(both, alternative!.outputId, primary!.outputId)).toBe(both);
      const bothRemoved = toggleWorkbenchPaneSelectionV3(both, family.id, both);
      const bothRestored = toggleWorkbenchPaneSelectionV3(bothRemoved, family.id, both);
      expect(bothRestored.role === "output" && bothRestored.items.map(item => item.outputId)).toEqual(["oxygen.saturation.arterial", alternative!.outputId, primary!.outputId]);
      const defaultName = workbenchPaneSelectionEntriesV3({ ...pane, items: [] }, contract, "ja").find(entry => entry.id === primary!.outputId)!.label;
      const renamed = changeWorkbenchOutputMethodV3({ ...pane, items: [{ ...pane.items[0]!, label: defaultName }] }, primary!.outputId, alternative!.outputId);
      expect(workbenchPaneSelectionEntriesV3(renamed, contract, "ja").find(entry => entry.selected)?.label).toBe(defaultName);
    }
  });

  it("disambiguates simultaneous methods in pane and article outputs, not scenario copies", () => {
    for (const family of STUDIO_OUTPUT_MEASUREMENT_FAMILIES_V1) {
      const ids = family.methods.map(method => method.outputId);
      expect(studioOutputComparisonMethodLabelsV1([ids[0]!, ids[0]!, null], "ja").size).toBe(0);
      const labels = studioOutputComparisonMethodLabelsV1(ids, "ja");
      expect(labels.size).toBe(2);
      for (const variant of ["pane", "article"] as const) {
        const items = ids.map((outputId, index) => ({ itemId: outputId, outputId, label: "Clinical label", value: 12 + index, unit: "mmHg" }));
        const html = renderToStaticMarkup(<ExperimentOutputGridV3 variant={variant} items={items} />);
        expect(html.match(/data-testid="output-method-context-v3"/g)).toHaveLength(2);
        expect(renderToStaticMarkup(<ExperimentOutputGridV3 variant={variant} items={[items[0]!]} />)).not.toContain('data-testid="output-method-context-v3"');
        expect(html).toContain("12.0");
        expect(html).toContain("13.0");
      }
    }
  });

  it("marks instantaneous and previously measured tiles without averaging their values", () => {
    const item = { itemId: "sample", outputId: "hemodynamics.flow.valve.MV", label: "MV 流量", value: 123.4, unit: "mL/s", quality: "valid", availability: "available" };
    const current = renderToStaticMarkup(<ExperimentOutputGridV3 variant="article" items={[item]} />);
    expect(current).toContain('data-testid="output-value-context-v3"');
    expect(current).toContain("123.4");
    const stale = renderToStaticMarkup(<ExperimentOutputGridV3 variant="pane" items={[{ ...item, staleNotice: "前回の測定値を表示" }]} />);
    expect(stale).toContain('data-output-stale="true"');
    expect(stale).toMatch(/前回値|Previous/);
    expect(stale).toContain("123.4");
  });

  it("places the output add action after the final output tile", () => {
    const markup = renderToStaticMarkup(
      <ExperimentOutputGridV3
        addItemAction={{ label: "項目を追加", onClick: vi.fn() }}
        items={[
          {
            itemId: "hemodynamics.ejection-fraction.LV-event-defined", outputId: "hemodynamics.ejection-fraction.LV-event-defined",
            label: "LVEF",
            value: 0.604,
            unit: "1",
            significantDigits: 3,
          },
        ]}
        variant="pane"
      />,
    );

    expect(markup.indexOf("LVEF")).toBeLessThan(markup.indexOf("項目を追加"));
    expect(markup).toContain("60");
    expect(markup).toContain("%</span>");
  });

  it("renders the Ao pressure pair without depending on a mean observation", async () => {
    const { contract } = (await loadStudioDefaultClientCompositionV2())
      .modelSurface;
    const pane = createDefaultExperimentSurfaceV3(contract, "scenario/a")
      .outputPanes[0]!;
    const available = (outputId: string, value: number) => ({
      outputId,
      value,
      availability: "available" as const,
      quality: "accepted-derived" as const,
    });
    const frame: StudioSimulationFrameV2 = {
      modelId: contract.modelId,
      runtimeSessionId: "runtime/test",
      scenarioId: "scenario/a",
      inputEpoch: 0,
      acceptedRevision: 1,
      acceptedTimeSec: 1,
      outputs: {
        "hemodynamics.pressure.systolic.Ao": available(
          "hemodynamics.pressure.systolic.Ao",
          94.6,
        ),
        "hemodynamics.pressure.diastolic.Ao": available(
          "hemodynamics.pressure.diastolic.Ao",
          63.8,
        ),
      },
    };

    const items = materializeWorkbenchOutputPresentationItemsV3({
      contract,
      frame,
      locale: "ja",
      notAssessedNotice: "未評価",
      pane,
    });
    const arterialPressure = items.find(
      ({ itemId }) =>
        itemId === "presentation.pressure-summary.Ao",
    );

    expect(arterialPressure).toMatchObject({
      label: "AoP",
      displayValue: "94.6/63.8",
      unit: "mmHg",
      availability: "available",
      quality: "accepted-derived",
    });
    expect(arterialPressure?.description).toContain("大動脈基部圧");
    const outputMarkup = renderToStaticMarkup(
      <ExperimentOutputGridV3 items={[arterialPressure!]} variant="pane" />,
    );
    expect(outputMarkup).toContain(
      'data-testid="workbench-item-description-trigger-v3"',
    );
    expect(outputMarkup).not.toContain(arterialPressure!.description!);
    expect(outputMarkup).not.toContain("lucide-info");
    expect(
      items.some(
        ({ itemId }) =>
          itemId === "hemodynamics.pressure.systolic.Ao",
      ),
    ).toBe(false);

    const withMean = materializeWorkbenchOutputPresentationItemsV3({
      contract, frame, locale: "ja", notAssessedNotice: "未評価",
      pane: { ...pane, items: [
        { outputId: "hemodynamics.pressure.systolic.Ao", label: "大動脈圧 (AoP max)", order: 0 },
        { outputId: "hemodynamics.pressure.diastolic.Ao", label: "Aortic pressure (AoP min)", order: 1 },
        { outputId: "hemodynamics.pressure.mean.Ao", label: "Mean aortic-root pressure", order: 2 },
      ] },
    });
    expect(withMean.map(item => item.label)).toEqual(["AoP", "平均AoP"]);
    expect(withMean[0]?.availability).toBe("available");
    expect(withMean[1]?.value).toBeNull();
  });

  it("keeps expected unresolved beat measurements in the tooltip without changing quality or inventing an initial value", async () => {
    const { contract } = (await loadStudioLocalCurrentClientCompositionV1()).modelSurface;
    const defaultPane = createDefaultExperimentSurfaceV3(contract, "scenario/a").outputPanes[0]!;
    for (const locale of ["ja", "en"] as const) {
      const items = materializeWorkbenchOutputPresentationItemsV3({ contract, frame: null, locale,
        notAssessedNotice: "internal-quality-warning", pane: { ...defaultPane, items: [
          { outputId: "hemodynamics.duration.A-zero-crossing.volumetric.MV", label: "MV A dur", order: 0 },
          { outputId: "hemodynamics.duration.isovolumic-contraction.flow-event.LV", label: "LV ICT", order: 1 },
        ] } });
      for (const item of items) {
        expect(item).toMatchObject({ value: null, quality: "not-assessed", availability: "not-evaluated-at-accepted-state" });
        expect(item.qualityNotice).toBeUndefined();
        expect(item.description).toContain(locale === "ja" ? "新しい測定値を得られていません" : "No new measurement");
      }
      const markup = renderToStaticMarkup(<ExperimentOutputGridV3 items={items} variant="pane" />);
      expect(markup).toContain("—");
      expect(markup).toContain('data-output-stale="false"');
      expect(markup).toContain('data-testid="workbench-item-description-trigger-v3"');
      expect(markup).not.toContain("text-wb-warning");
      expect(markup).not.toContain("internal-quality-warning");
    }
  });

  it("preserves an atomic pressure item when a pane does not select the pair", async () => {
    const { contract } = (await loadStudioDefaultClientCompositionV2())
      .modelSurface;
    const defaultPane = createDefaultExperimentSurfaceV3(contract, "scenario/a")
      .outputPanes[0]!;
    const pane = {
      ...defaultPane,
      items: [
        {
          outputId:
            "hemodynamics.pressure.systolic.SA",
          label: "Systolic arterial pressure",
          order: 0,
        },
      ],
    };
    const outputId =
      "hemodynamics.pressure.systolic.SA";
    const frame: StudioSimulationFrameV2 = {
      modelId: contract.modelId,
      runtimeSessionId: "runtime/test",
      scenarioId: "scenario/a",
      inputEpoch: 0,
      acceptedRevision: 1,
      acceptedTimeSec: 1,
      outputs: {
        [outputId]: {
          outputId,
          value: 94.6,
          availability: "available",
          quality: "accepted-derived",
        },
      },
    };

    const items = materializeWorkbenchOutputPresentationItemsV3({
      contract,
      frame,
      locale: "en",
      notAssessedNotice: "Not assessed",
      pane,
    });

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      itemId: outputId,
      value: 94.6,
      unit: "mmHg",
    });
    expect(items[0]?.description).toContain("Systolic arterial pressure");
    const outputMarkup = renderToStaticMarkup(
      <ExperimentOutputGridV3 items={items} variant="pane" />,
    );
    expect(outputMarkup).toContain(
      'data-testid="workbench-item-description-trigger-v3"',
    );
    expect(outputMarkup).not.toContain(items[0]!.description!);
    expect(
      items.some(
        ({ itemId }) =>
          itemId === "presentation.pressure-summary.SA",
      ),
    ).toBe(false);
  });

  it("keeps the single Model Lab development-only unless explicitly enabled", () => {
    expect(modelLabEnabledV3({ PROD: false })).toBe(true);
    expect(modelLabEnabledV3({ PROD: true })).toBe(false);
    expect(
      modelLabEnabledV3({
        PROD: true,
        VITE_MODEL_LAB_ENABLED: "1",
      }),
    ).toBe(true);
  });

  it("keeps ordinary dev Sessions private and Model Lab ephemeral", () => {
    expect(workbenchDurableContentAvailableV3({ modelLab: false })).toBe(true);
    expect(workbenchDurableContentAvailableV3({ modelLab: true })).toBe(false);
    expect(
      workbenchPublicationAvailableV3({
        modelLab: false,
        releaseStage: "stable",
      }),
    ).toBe(true);
    expect(
      workbenchPublicationAvailableV3({
        modelLab: false,
        releaseStage: "dev",
      }),
    ).toBe(false);
    expect(
      workbenchPublicationAvailableV3({
        modelLab: true,
        releaseStage: "stable",
      }),
    ).toBe(false);
  });

  it("discloses pressure-crossing measurements from the pinned Surface, not a development route", async () => {
    const { resolveMainWireAnalysisMethodsForSurfaceV1 } = await import("@/analysis/methods/mainWire/MainWireAnalysisMethodRegistryV1");
    const { mainWireFormalPvAnalysisIdV1 } = await import("@/analysis/methods/mainWire/MainWireStructuralAnalysisContractV3");
    const current = (await import("@/studio/integrations/mainWireIntegratedV3/MainWireIntegratedStudioStaticCaseSurfaceV4")).default;
    const previous = (await import("@/studio/integrations/mainWireIntegratedV3/MainWireIntegratedStudioStaticCaseSurfaceV2")).default;
    const currentId = mainWireFormalPvAnalysisIdV1(resolveMainWireAnalysisMethodsForSurfaceV1(current).periodicPvaDerivation);
    const previousId = mainWireFormalPvAnalysisIdV1(resolveMainWireAnalysisMethodsForSurfaceV1(previous).periodicPvaDerivation);
    expect(workbenchAnalysisLimitationsV3(currentId, "ja")[0]).toContain("弁尖の接触時刻を測るものではありません");
    expect(workbenchAnalysisLimitationsV3(currentId, "en")[0]).toContain("not a measurement of physical leaflet contact");
    expect(workbenchAnalysisLimitationsV3(previousId, "ja")).toEqual([]);
  });

  it("discloses human model information without implementation identities", async () => {
    const composition = await loadStudioDefaultClientCompositionV2();
    const contract = composition.modelSurface.contract;
    const markup = renderToStaticMarkup(
      <WorkbenchSimulationInfoPanelV3
        activeTab="model"
        currentModelId={contract.modelId}
        limitations={["Research and education only"]}
        models={[
          {
            contract,
            publicName: "Integrated haemodynamic model",
            shortLabel: "Main Wire V3",
            description: "Human-readable model description",
          },
        ]}
        onClose={() => undefined}
        onTabChange={() => undefined}
        scenarios={[]}
      />,
    );

    expect(markup).toContain("Integrated haemodynamic model");
    expect(markup).toContain("Human-readable model description");
    expect(markup).not.toContain(contract.modelId);
    expect(markup).not.toContain(contract.fixtureSchemaId);
    expect(markup).not.toContain(contract.checkpointCodecId);
    expect(markup).not.toContain(contract.snapshotGateId);
  });

  it("links third-layer documentation only when the caller supplies a pinned model-Surface URL", async () => {
    const composition = await loadStudioDefaultClientCompositionV2();
    const contract = composition.modelSurface.contract;
    const documentationHref = "/ja/models/model%2Fstandard66?surface=surface%2Frelease";
    const markup = renderToStaticMarkup(
      <WorkbenchSimulationInfoPanelV3
        activeTab="model"
        currentModelId={contract.modelId}
        limitations={["Pinned Surface limitation"]}
        models={[{
          contract,
          publicName: "Integrated haemodynamic model",
          shortLabel: "Main Wire V3",
          description: "Human-readable model description",
          documentationHref,
        }]}
        onClose={() => undefined}
        onTabChange={() => undefined}
        scenarios={[]}
      />,
    );

    expect(markup).toContain('data-testid="workbench-model-documentation-link-v3"');
    expect(markup).toContain(`href="${documentationHref}"`);
    expect(markup).toContain('target="_blank"');
    expect(markup).toMatch(
      /(?:View model documentation|数理モデルの詳細を見る)/,
    );
  });

  it("shows a compact model-ID baseline gate summary only when supplied", async () => {
    const composition = await loadStudioDefaultClientCompositionV2();
    const contract = composition.modelSurface.contract;
    const markup = renderToStaticMarkup(
      <WorkbenchSimulationInfoPanelV3
        activeTab="model"
        currentModelId={contract.modelId}
        limitations={[]}
        models={[{
          contract,
          publicName: "Integrated haemodynamic model",
          shortLabel: "Main Wire Standard 68",
          description: "Human-readable model description",
          baselineValidation: {
            summary: "Period-1 convergence confirmed",
            items: [{
              itemId: "tei-index",
              label: "Tei index",
              value: "0.60",
              detail: "Required range: 0.29–0.65",
            }, {
              itemId: "pulmonary-morphology",
              label: "PAP / PV flow morphology",
              value: "1 peak · 1 episode / 1 peak · rebound 0.0 mmHg",
              detail: "Native waveform morphology",
              status: "reference",
            }, {
              itemId: "lv-dpdt",
              label: "LV ±dP/dt",
              value: "+2587 / −1306",
              detail: "Reference warning, not numerical failure",
              status: "warning",
            }],
          },
        }]}
        onClose={() => undefined}
        onTabChange={() => undefined}
        scenarios={[]}
      />,
    );

    expect(markup).toContain(
      'data-testid="workbench-baseline-validation-v3"',
    );
    expect(markup).toContain("Tei index");
    expect(markup).toContain("0.60");
    expect(markup).toContain("Required range: 0.29–0.65");
    expect(markup).toContain('class="min-w-0 break-words">1 peak · 1 episode / 1 peak · rebound 0.0 mmHg</span>');
    expect(markup).toContain("max-w-[65%]");
    expect(markup).toContain("text-amber-400");
    expect(markup).toContain("Reference warning, not numerical failure");
  });

  it("keeps pane binding quiet for one Scenario and content-sized for comparison", () => {
    const common = {
      label: "連動：Baseline",
      modeLabel: "連動",
      onClick: () => undefined,
      targetLabel: "Baseline",
      testId: "binding-test",
    } as const;
    expect(
      renderToStaticMarkup(
        <WorkbenchPaneBindingButtonV3 {...common} visible={false} />,
      ),
    ).toBe("");

    const visible = renderToStaticMarkup(
      <WorkbenchPaneBindingButtonV3 {...common} visible />,
    );
    expect(visible).toContain('aria-label="連動：Baseline"');
    expect(visible).toContain("inline-flex");
    expect(visible).not.toContain(" w-full min-w-0");
    expect(visible).toContain("連動");
    expect(visible).toContain("Baseline");
  });

  it("uses one segmented linked-or-fixed selector across pane settings", () => {
    const markup = renderToStaticMarkup(
      <WorkbenchPaneBindingModeSelectorV3
        activeLabel="選択scenarioと連動"
        fixedLabel="Scenarioを固定"
        groupLabel="Scenario"
        mode="active-slot"
        onChange={() => undefined}
      />,
    );

    expect(markup).toContain('role="radiogroup"');
    expect(markup).toContain('aria-label="Scenario"');
    expect(markup).toContain("選択scenarioと連動");
    expect(markup).toContain("Scenarioを固定");
    expect(markup).toContain('aria-checked="true"');
    expect(markup).toContain('data-active="true"');
    expect(markup).toContain("workbench-control-segments");
  });

  it("preloads Placement Briefing independently from its neutral Snapshot", () => {
    const snapshot = createWorkbenchBriefingSnapshotV3({
      surfaceSeriesId: STANDARD_TEST_SURFACE_SERIES_ID_V1,
      surfaceReleaseId: STANDARD_TEST_SURFACE_RELEASE_ID_V1,
      modelId: "model/main-wire-v3",
      scenarios: [{ scenarioId: "scenario/a", label: "A" }],
      surface: {
        graphPanes: [],
        outputPanes: [],
        controlPanes: [],
        note: { text: "" },
      },
    });
    const sourceBriefing = reconcileWorkbenchBriefingV3({
      briefing: null,
      preferredFocusScenarioId: "scenario/a",
      defaultTitle: "A",
      snapshot,
    });
    expect(
      resolveWorkbenchInitialBriefingV3({
        current: null,
        sourceBriefing,
      }),
    ).toEqual(sourceBriefing);
    expect(
      resolveWorkbenchInitialBriefingV3({
        current: sourceBriefing,
        sourceBriefing: null,
      }),
    ).toBe(sourceBriefing);
    expect(
      resolveWorkbenchInitialBriefingV3({
        current: null,
        sourceBriefing: null,
      }),
    ).toBeNull();
  });

  it("treats a changed Scenario collection as a stale frozen Briefing source", () => {
    const snapshot = createWorkbenchBriefingSnapshotV3({
      surfaceSeriesId: STANDARD_TEST_SURFACE_SERIES_ID_V1,
      surfaceReleaseId: STANDARD_TEST_SURFACE_RELEASE_ID_V1,
      modelId: "model/main-wire-v3",
      scenarios: [
        { scenarioId: "scenario/a", label: "A" },
        { scenarioId: "scenario/b", label: "B" },
      ],
      surface: {
        graphPanes: [],
        outputPanes: [],
        controlPanes: [],
        note: { text: "" },
      },
    });
    const captured = snapshot.content.scenarios;

    expect(workbenchBriefingSourceScenariosMatchV3(snapshot, captured)).toBe(
      true,
    );
    expect(
      workbenchBriefingSourceScenariosMatchV3(snapshot, [captured[0]!]),
    ).toBe(false);
    expect(
      workbenchBriefingSourceScenariosMatchV3(snapshot, [
        captured[0]!,
        { ...captured[1]!, label: "Renamed" },
      ]),
    ).toBe(false);
  });

  it("owns duplicate control values independently from their source", () => {
    const source = Object.freeze({
      "control/systemic-resistance": Object.freeze({
        status: "value" as const,
        value: 1,
      }),
      "control/venous-tone": Object.freeze({
        status: "value" as const,
        value: 0.14,
      }),
    });
    const duplicate = cloneWorkbenchControlValuesV3(source);

    expect(duplicate).toEqual(source);
    expect(duplicate).not.toBe(source);
    expect(Object.isFrozen(duplicate)).toBe(true);
  });

  it("resolves one pane-level Scenario context and reconciles deleted targets", async () => {
    const composition = await loadStudioDefaultClientCompositionV2();
    const scenarios = [
      { scenarioId: "scenario/a" },
      { scenarioId: "scenario/b" },
    ] as const;
    const original = createDefaultExperimentSurfaceV3(
      composition.modelSurface.contract,
      "scenario/a",
    );
    const graph = original.graphPanes[0]!;
    const seriesId = graph.series[0]!.seriesId;
    const surface = {
      ...original,
      graphPanes: [
        {
          ...graph,
          scenarioScope: {
            mode: "fixed" as const,
            scenarioIds: ["scenario/a"],
          },
          excludedTraces: [{ scenarioId: "scenario/b", seriesId }],
        },
        ...original.graphPanes.slice(1),
      ],
      controlPanes: [
        {
          ...original.controlPanes[0]!,
          binding: {
            mode: "fixed" as const,
            scenarioIds: ["scenario/a", "scenario/b"],
          },
        },
      ],
      outputPanes: [
        {
          ...original.outputPanes[0]!,
          binding: {
            mode: "fixed" as const,
            scenarioId: "scenario/b",
          },
        },
      ],
    };

    expect(
      resolveWorkbenchGraphScenarioIdsV3(surface.graphPanes[0]!, [
        "scenario/b",
        "scenario/a",
      ]),
    ).toEqual(["scenario/b", "scenario/a"]);
    expect(
      resolveWorkbenchGraphScenarioIdsV3(surface.graphPanes[0]!, [
        "scenario/a",
      ]),
    ).toEqual(["scenario/a"]);
    expect(
      isWorkbenchGraphTraceExcludedV3(
        surface.graphPanes[0]!,
        "scenario/b",
        seriesId,
      ),
    ).toBe(true);
    expect(
      resolveWorkbenchControlPaneScenarioIdsV3(
        surface.controlPanes[0]!,
        "scenario/b",
        scenarios,
      ),
    ).toEqual(["scenario/a", "scenario/b"]);
    expect(
      resolveWorkbenchOutputPaneScenarioIdV3(
        surface.outputPanes[0]!,
        "scenario/a",
        scenarios,
      ),
    ).toBe("scenario/b");

    const migratedGraphScope = reconcileWorkbenchSurfaceScenariosV3(
      surface,
      scenarios,
    );
    expect(migratedGraphScope.graphPanes[0]?.scenarioScope).toEqual({
      mode: "visible-scenarios",
    });
    expect(
      isWorkbenchGraphTraceExcludedV3(
        migratedGraphScope.graphPanes[0]!,
        "scenario/b",
        seriesId,
      ),
    ).toBe(true);

    const afterDelete = reconcileWorkbenchSurfaceScenariosV3(surface, [
      { scenarioId: "scenario/a" },
    ]);
    expect(afterDelete.graphPanes[0]?.scenarioScope).toEqual({
      mode: "visible-scenarios",
    });
    expect(afterDelete.graphPanes[0]?.excludedTraces).toEqual([]);
    expect(afterDelete.controlPanes[0]?.binding).toEqual({
      mode: "fixed",
      scenarioIds: ["scenario/a"],
    });
    expect(afterDelete.outputPanes[0]?.binding).toEqual({
      mode: "active-slot",
    });

    const afterAllFixedTargetsDisappear = reconcileWorkbenchSurfaceScenariosV3(
      surface,
      [{ scenarioId: "scenario/c" }],
    );
    expect(afterAllFixedTargetsDisappear.graphPanes[0]?.scenarioScope).toEqual({
      mode: "visible-scenarios",
    });
    expect(afterAllFixedTargetsDisappear.controlPanes[0]?.binding).toEqual({
      mode: "active-slot",
    });
    expect(afterAllFixedTargetsDisappear.outputPanes[0]?.binding).toEqual({
      mode: "active-slot",
    });
  });

  it("materializes only the current Output pane contract before persistence", async () => {
    const composition = await loadStudioDefaultClientCompositionV2();
    const original = createDefaultExperimentSurfaceV3(
      composition.modelSurface.contract,
      "scenario/a",
    );
    const outputPane = original.outputPanes[0]!;
    const { binding: _retiredBinding, ...preBindingPane } = outputPane;
    const staleSurface = {
      ...original,
      outputPanes: [
        {
          ...preBindingPane,
          transientScenarioLabel: "must not persist",
        },
      ],
    } as unknown as typeof original;

    const materialized = reconcileWorkbenchSurfaceScenariosV3(staleSurface, [
      { scenarioId: "scenario/a" },
    ]);

    expect(materialized.outputPanes[0]?.binding).toEqual({
      mode: "active-slot",
    });
    expect(Object.keys(materialized.outputPanes[0]!).sort()).toEqual([
      "binding",
      "items",
      "label",
      "order",
      "paneId",
      "priority",
      "role",
    ]);
  });

  it("keeps an untouched launch pristine while allowing authored Snapshot copies", () => {
    expect(
      resolveWorkbenchInitialSaveStateV3({
        hasStoredExperiment: false,
        hasPendingSurface: false,
        pendingSaveState: null,
      }),
    ).toBe("pristine");
    expect(resolveWorkbenchInitialSaveStateV3({
      hasStoredExperiment: false, hasSourceSnapshot: true, hasPendingSurface: false, pendingSaveState: null,
    })).toBe("dirty");
    expect(
      resolveWorkbenchInitialSaveStateV3({
        hasStoredExperiment: true,
        hasPendingSurface: false,
        pendingSaveState: null,
      }),
    ).toBe("clean");
    expect(
      resolveWorkbenchInitialSaveStateV3({
        hasStoredExperiment: true,
        hasPendingSurface: true,
        pendingSaveState: null,
      }),
    ).toBe("dirty");
    expect(
      resolveWorkbenchInitialSaveStateV3({
        hasStoredExperiment: true,
        hasPendingSurface: false,
        pendingSaveState: "error",
      }),
    ).toBe("error");
  });

  it("enables save for authored changes and keeps publication freshness independent of saving", () => {
    expect(workbenchSaveAvailableV3("pristine", false)).toBe(false);
    expect(workbenchSaveAvailableV3("pristine", true)).toBe(true);
    expect(workbenchSaveAvailableV3("clean", false)).toBe(false);
    expect(workbenchSaveAvailableV3("clean", true)).toBe(true);
    expect(workbenchSaveAvailableV3("saving", true)).toBe(false);
    expect(workbenchSaveAvailableV3("error", false)).toBe(true);
    const current = { publishedSnapshotId: "snapshot/example", publishedVersion: 3, savedVersion: 3, hasChanges: false };
    expect(workbenchPublicationIsStaleV3(current)).toBe(false);
    expect(workbenchPublicationIsStaleV3({ ...current, hasChanges: true })).toBe(true);
    expect(workbenchPublicationIsStaleV3({ ...current, savedVersion: 4 })).toBe(true);
    expect(workbenchPublicationIsStaleV3({ ...current, publishedVersion: null })).toBe(true);
    expect(workbenchPublicationIsStaleV3({ ...current, publishedSnapshotId: null, hasChanges: true })).toBe(false);
  });

  it("prompts only for authored Session, title, or Briefing changes", () => {
    expect(
      shouldConfirmWorkbenchDiscardV3({
        hasUnsavedContentChanges: false,
        hasUncommittedTitleChanges: false,
        hasUncapturedBriefingChanges: false,
      }),
    ).toBe(false);
    expect(
      shouldConfirmWorkbenchDiscardV3({
        hasUnsavedContentChanges: true,
        hasUncommittedTitleChanges: false,
        hasUncapturedBriefingChanges: false,
      }),
    ).toBe(true);
    expect(
      shouldConfirmWorkbenchDiscardV3({
        hasUnsavedContentChanges: false,
        hasUncommittedTitleChanges: true,
        hasUncapturedBriefingChanges: false,
      }),
    ).toBe(true);
    expect(
      shouldConfirmWorkbenchDiscardV3({
        hasUnsavedContentChanges: false,
        hasUncommittedTitleChanges: false,
        hasUncapturedBriefingChanges: true,
      }),
    ).toBe(true);
  });

  it("treats a graph history depth of zero as no history", () => {
    const history = Object.freeze(["oldest", "older", "newer", "newest"]);
    expect(workbenchBoundedGraphHistoryV3(history, 0)).toEqual([]);
    expect(workbenchBoundedGraphHistoryV3(history, 1)).toEqual(["newest"]);
    expect(workbenchBoundedGraphHistoryV3(history, 3)).toEqual([
      "older",
      "newer",
      "newest",
    ]);
  });

  it("archives, deduplicates, caps, and prunes analysis epochs", () => {
    const analysis = (
      scenarioId: string,
      analysisId: string,
      inputEpoch: number,
      sourceAcceptedRevision = inputEpoch,
    ): StudioSimulationAnalysisV2 =>
      Object.freeze({
        modelId: "model/exact",
        runtimeSessionId: "runtime/1",
        scenarioId,
        inputEpoch,
        sourceAcceptedRevision,
        sourceAcceptedTimeSec: sourceAcceptedRevision * 0.002,
        analysisId,
        payload: { sourceAcceptedRevision },
      });
    let history: Readonly<
      Record<string, readonly StudioSimulationAnalysisV2[]>
    > = {};
    for (let epoch = 0; epoch <= 4; epoch += 1) {
      history = archiveWorkbenchAnalysesV3(history, [
        analysis("scenario/a", "analysis/systemic", epoch),
      ]);
    }
    const keyA = workbenchAnalysisHistoryKeyV3(
      "scenario/a",
      "analysis/systemic",
    );
    expect(history[keyA]?.map(({ inputEpoch }) => inputEpoch)).toEqual([
      2, 3, 4,
    ]);

    history = archiveWorkbenchAnalysesV3(history, [
      analysis("scenario/a", "analysis/systemic", 4, 99),
      analysis("scenario/b", "analysis/pulmonary", 4, 100),
    ]);
    expect(history[keyA]).toHaveLength(3);
    expect(history[keyA]?.at(-1)?.sourceAcceptedRevision).toBe(99);

    const pruned = withoutWorkbenchScenarioAnalysisHistoryV3(
      history,
      "scenario/a",
    );
    expect(pruned).not.toHaveProperty(keyA);
    expect(
      Object.values(pruned)
        .flat()
        .every(({ scenarioId }) => scenarioId === "scenario/b"),
    ).toBe(true);
    expect(withoutWorkbenchScenarioAnalysisHistoryV3(pruned, "missing")).toBe(
      pruned,
    );

    const current = analysis("scenario/a", "analysis/systemic", 4, 99);
    const frame = {
      modelId: current.modelId,
      runtimeSessionId: current.runtimeSessionId,
      scenarioId: current.scenarioId,
      inputEpoch: current.inputEpoch,
      acceptedRevision: 200,
      acceptedTimeSec: 0.4,
      outputs: {},
    } as StudioSimulationFrameV2;
    expect(workbenchAnalysisMatchesFrameEpochV3(current, frame)).toBe(true);
    expect(
      workbenchAnalysisMatchesFrameEpochV3(current, {
        ...frame,
        inputEpoch: 5,
      }),
    ).toBe(false);

    const duplicateFrame = {
      ...frame,
      runtimeSessionId: "runtime/duplicate",
      scenarioId: "scenario/duplicate",
      acceptedRevision: 201,
      acceptedTimeSec: 0.402,
    } as StudioSimulationFrameV2;
    const cloned = cloneWorkbenchScenarioAnalysesV3(
      { [keyA]: current },
      "scenario/a",
      duplicateFrame,
    );
    const duplicate =
      cloned[
        workbenchAnalysisHistoryKeyV3("scenario/duplicate", "analysis/systemic")
      ]!;
    expect(
      workbenchAnalysisMatchesFrameEpochV3(duplicate, duplicateFrame),
    ).toBe(true);
    expect(duplicate.payload).toBe(current.payload);
    expect(cloned[keyA]).toBe(current);

    const lateDuplicate = cloneWorkbenchAnalysisForScenarioV3(
      current,
      duplicateFrame,
    );
    expect(lateDuplicate).toEqual(duplicate);
    const equivalence = new Map([
      ["scenario/duplicate", "scenario/a"],
      ["scenario/other-copy", "scenario/a"],
    ]);
    invalidateWorkbenchScenarioAnalysisEquivalenceV3(
      equivalence,
      new Set(["scenario/duplicate"]),
    );
    expect(equivalence).toEqual(
      new Map([["scenario/other-copy", "scenario/a"]]),
    );
    invalidateWorkbenchScenarioAnalysisEquivalenceV3(
      equivalence,
      new Set(["scenario/a"]),
    );
    expect(equivalence.size).toBe(0);
  });

  it("selects every analysis-backed pane that retains visual history", async () => {
    const composition =
      await loadStudioLocalCurrentClientCompositionV1();
    const original = createDefaultExperimentSurfaceV3(composition.modelSurface.contract);
    const structural = composition.modelSurface.contract.graphCatalog.find(
      ({ renderer }) => renderer === "structural-return",
    )!;
    if (structural.renderer !== "structural-return") {
      throw new Error("expected a structural-return graph");
    }
    const configuredResult = addWorkbenchSurfacePaneV3(
      original,
      "graph",
      composition.modelSurface.contract,
      structural.graphId,
      "right",
    );
    const configured = configuredResult.surface;
    const targetPaneId = configuredResult.selectedPane!.paneId;
    expect(
      workbenchStructuralHistoryAnalysisIdsV3(configured, composition.modelSurface.contract),
    ).toEqual([
      MAIN_WIRE_INTEGRATED_MODEL_FORMAL_PRESSURE_VOLUME_RELATIONS_V3_ID,
    ]);
    expect(
      workbenchStructuralHistoryAnalysisIdsV3(
        {
          ...configured,
          graphPanes: configured.graphPanes.map((pane) =>
            pane.paneId === targetPaneId ? { ...pane, historyDepth: 0 } : pane,
          ),
        },
        composition.modelSurface.contract,
      ),
    ).toEqual([
      MAIN_WIRE_INTEGRATED_MODEL_FORMAL_PRESSURE_VOLUME_RELATIONS_V3_ID,
    ]);
  });

  it("renders a visible panel even when it is not globally active", () => {
    // Dockview can expose one visible panel in each split group even though
    // only one panel across the whole Dockview is globally active.
    const panel = { isActive: false, isVisible: true } as const;
    expect(
      shouldRenderWorkbenchDockPanelV3(panel.isActive, panel.isVisible),
    ).toBe(true);
  });

  it.each([true, false])(
    "never renders an invisible panel when global active is %s",
    (isActive) => {
      const panel = { isActive, isVisible: false } as const;
      expect(
        shouldRenderWorkbenchDockPanelV3(panel.isActive, panel.isVisible),
      ).toBe(false);
    },
  );

  it("renders an active visible panel", () => {
    expect(shouldRenderWorkbenchDockPanelV3(true, true)).toBe(true);
  });

  it("scopes limitations acknowledgement to the exact model disclosure", () => {
    expect(
      modelLimitationsAcknowledgementKey("model/dev-3:disclosure-v1"),
    ).toBe("circleheart.modelLimitations.ack.model%2Fdev-3%3Adisclosure-v1");
    expect(
      modelLimitationsAcknowledgementKey("model/dev-4:disclosure-v1"),
    ).not.toBe(modelLimitationsAcknowledgementKey("model/dev-3:disclosure-v1"));
  });

  it("starts the production Workbench with raw LV PV, Starling, and a four-second pressure sweep", async () => {
    const composition = await loadStudioDefaultClientCompositionV2();
    const surface = createDefaultExperimentSurfaceV3(
      composition.modelSurface.contract,
      undefined,
      { periodicPvaSupported: false },
    );
    const graphPanes = surface.graphPanes;
    const outputPane = surface.outputPanes[0]!;
    const controlPane = surface.controlPanes[0]!;

    expect(
      graphPanes.map(({ graphId, series }) => ({
        graphId,
        seriesIds: series.map(({ seriesId }) => seriesId),
      })),
    ).toEqual([
      {
        graphId: "hemodynamics.pressure-volume",
        seriesIds: ["LV"],
      },
      {
        graphId: "hemodynamics.guyton-starling",
        seriesIds: [],
      },
      {
        graphId: "hemodynamics.pressure.waveform.comprehensive-v1",
        seriesIds: ["AoP", "LVP", "LAP"],
      },
    ]);
    expect(outputPane.items.map(({ outputId }) => outputId)).toEqual([
      "hemodynamics.pressure.systolic.Ao",
      "hemodynamics.pressure.diastolic.Ao",
      "hemodynamics.pressure.systolic.PA",
      "hemodynamics.pressure.diastolic.PA",
      "hemodynamics.pressure.mean.LA",
      "hemodynamics.pressure.mean.RA",
      "hemodynamics.volume.end-diastolic.LV-at-MV-closure",
      "hemodynamics.pressure.absolute.end-diastolic.LV-at-MV-closure",
      "hemodynamics.volume.end-systolic.LV-at-AoV-closure",
      "hemodynamics.pressure.absolute.end-systolic.LV-at-AoV-closure",
      "hemodynamics.stroke-volume.LV-event-defined",
      "hemodynamics.ejection-fraction.LV-event-defined",
      "hemodynamics.output.effective-native-left",
      "myocardium.work.stroke.LV",
      "oxygen.delivery.systemic",
    ]);
    expect(outputPane.binding).toEqual({ mode: "active-slot" });
    expect(controlPane.items.map(({ controlId }) => controlId)).toEqual([
      "rhythm.heart-rate-bpm",
      "hemodynamics.total-blood-volume-ml",
      "hemodynamics.systemic-resistance",
      "hemodynamics.pulmonary-resistance",
      "hemodynamics.venous-tone",
      "myocardium.lv-contractility",
      "myocardium.passive-stiffness-scale.LVFW",
    ]);
    expect(controlPane.items.length).toBeGreaterThan(0);
    expect(graphPanes).toHaveLength(3);
    expect(graphPanes[0]?.pressureVolumeAnalysisMode).toBe("raw-exact-orbit");
    expect("showPressureEnvelope" in graphPanes[0]!).toBe(false);
    expect(Object.isFrozen(graphPanes)).toBe(true);
    expect(Object.isFrozen(outputPane.items)).toBe(true);
    expect("colorHex" in outputPane).toBe(false);
    expect("colorHex" in controlPane).toBe(false);
    expect(outputPane.items.every((item) => !("colorHex" in item))).toBe(true);
    expect(
      controlPane.items.every(
        (item) => !("colorHex" in item) && !("targetScenarioIds" in item),
      ),
    ).toBe(true);
    for (const pane of graphPanes) {
      const graph = composition.modelSurface.contract.graphCatalog.find(
        ({ graphId }) => graphId === pane.graphId,
      )!;
      expect("windowSec" in pane).toBe(graph.renderer === "sweep");
      expect("historyDepth" in pane).toBe(graph.renderer === "pressure-volume" || graph.renderer === "structural-return");
      if (graph.renderer !== "structural-return" && graph.renderer !== "cycle-waveform") {
        expect(
          pane.series.every(({ seriesId }) =>
            graph.seriesCatalog.some(
              (candidate) => candidate.seriesId === seriesId,
            ),
          ),
        ).toBe(true);
      }
      if (graph.renderer === "sweep") {
        expect(pane.windowSec).toBe(4);
      } else {
        expect(pane.historyDepth).toBe(1);
      }
    }
  });

  it("resolves authored sweep series only through the graph-owned catalog", async () => {
    const composition = await loadStudioDefaultClientCompositionV2();
    const surface = createDefaultExperimentSurfaceV3(composition.modelSurface.contract);
    const pressurePane = surface.graphPanes.find(
      ({ graphId }) =>
        graphId === "hemodynamics.pressure.waveform.comprehensive-v1",
    )!;
    const pressureGraph = composition.modelSurface.contract.graphCatalog.find(
      ({ graphId }) => graphId === pressurePane.graphId,
    )!;
    if (pressureGraph.renderer !== "sweep") {
      throw new Error("expected the pressure waveform graph");
    }
    const selectedBindings = pressurePane.series.map(({ seriesId }) =>
      pressureGraph.seriesCatalog.find(
        (series) => series.seriesId === seriesId,
      )!,
    );
    const selectedOutputs = selectedBindings.map(({ outputId }) =>
      composition.modelSurface.contract.outputCatalog.find(
        (output) => output.outputId === outputId,
      )!,
    );

    expect(selectedBindings.map(({ seriesId }) => seriesId)).toEqual([
      "AoP",
      "LVP",
      "LAP",
    ]);
    expect(
      selectedOutputs.every(
        (output) =>
          output.kind === "signal" &&
          output.shape === "scalar" &&
          output.unit === "mmHg",
      ),
    ).toBe(true);
  });

  it("keeps the raw PV pane free of formal semantics while Starling retains its analysis", async () => {
    const composition = await loadStudioDefaultClientCompositionV2();
    const contract = composition.modelSurface.contract;
    const rawSurface = createDefaultExperimentSurfaceV3(
      contract,
      "scenario/a",
      { periodicPvaSupported: false },
    );
    const rawPv = rawSurface.graphPanes.find(
      ({ graphId }) => graphId === "hemodynamics.pressure-volume",
    )!;

    expect(rawPv.pressureVolumeAnalysisMode).toBe("raw-exact-orbit");
    expect("showPressureEnvelope" in rawPv).toBe(false);
    expect(
      workbenchStructuralHistoryAnalysisIdsV3(rawSurface, contract),
    ).toEqual([
      MAIN_WIRE_INTEGRATED_MODEL_FORMAL_PRESSURE_VOLUME_RELATIONS_V3_ID,
    ]);

    const legacyFormalSurface = {
      ...rawSurface,
      graphPanes: rawSurface.graphPanes.map((pane) =>
        pane.paneId === rawPv.paneId
          ? {
              ...pane,
              pressureVolumeAnalysisMode: "formal-periodic" as const,
              showPressureEnvelope: true,
              showPvaBoundary: true,
            }
          : pane,
      ),
    };
    const canonicalRawSurface =
      reconcileWorkbenchPressureVolumeCapabilityV3(
        legacyFormalSurface,
        contract,
        false,
      );
    const canonicalRawPv = canonicalRawSurface.graphPanes.find(
      ({ paneId }) => paneId === rawPv.paneId,
    )!;
    expect(canonicalRawPv.pressureVolumeAnalysisMode).toBe("raw-exact-orbit");
    expect("showPressureEnvelope" in canonicalRawPv).toBe(false);
    expect("showPvaBoundary" in canonicalRawPv).toBe(false);
    expect(
      reconcileWorkbenchPressureVolumeCapabilityV3(
        canonicalRawSurface,
        contract,
        false,
      ),
    ).toBe(canonicalRawSurface);
    expect(
      workbenchGraphDisplaySettingsAvailableV3("pressure-volume"),
    ).toBe(true); // Raw loops still have visual-history settings.
    expect(workbenchGraphDisplaySettingsAvailableV3("structural-return")).toBe(true);
    expect(workbenchGraphDisplaySettingsAvailableV3("sweep")).toBe(
      true,
    );

    const added = addWorkbenchSurfacePaneV3(
      rawSurface,
      "graph",
      contract,
      "hemodynamics.pressure-volume",
      undefined,
      { periodicPvaSupported: false },
    );
    const addedPane = added.selectedPane === null
      ? undefined
      : added.surface.graphPanes.find(
          ({ paneId }) => paneId === added.selectedPane?.paneId,
        );
    expect(addedPane).toBeDefined();
    expect(addedPane?.pressureVolumeAnalysisMode).toBe("raw-exact-orbit");
    expect("showPressureEnvelope" in addedPane!).toBe(false);
  });

  it("keeps custom pane presentation in the Experiment Surface", async () => {
    const composition = await loadStudioDefaultClientCompositionV2();
    const original = createDefaultExperimentSurfaceV3(composition.modelSurface.contract);
    const added = addWorkbenchSurfacePaneV3(
      original,
      "output",
      composition.modelSurface.contract,
    );
    expect(added.selectedPane).not.toBeNull();
    const selectedPane = added.selectedPane!;
    const customized = updateWorkbenchSurfacePaneV3(
      added.surface,
      selectedPane,
      (pane) => ({
        ...pane,
        label: "Primary readouts",
      }),
    );
    const customPane = customized.outputPanes.find(
      ({ paneId }) => paneId === selectedPane.paneId,
    );
    expect(customPane).toMatchObject({
      label: "Primary readouts",
      role: "output",
    });
    expect(customPane?.items).toHaveLength(1);
    expect(customPane === undefined ? true : "colorHex" in customPane).toBe(
      false,
    );
    const deleted = deleteWorkbenchSurfacePaneV3(customized, selectedPane);
    expect(deleted.deleted).toBe(true);
    expect(deleted.surface.outputPanes).toHaveLength(1);
    const deleteLast = deleteWorkbenchSurfacePaneV3(deleted.surface, {
      kind: "output",
      paneId: deleted.surface.outputPanes[0]!.paneId,
    });
    expect(deleteLast.deleted).toBe(true);
    expect(deleteLast.surface.outputPanes).toEqual([]);
    expect(deleteLast.nextSelectedPane).toBeNull();
  });

  it("duplicates a split pane with independent authored items", async () => {
    const composition = await loadStudioDefaultClientCompositionV2();
    const surface = createDefaultExperimentSurfaceV3(composition.modelSurface.contract);
    const source = surface.graphPanes[0]!;
    const duplicated = duplicateWorkbenchSurfacePaneV3(surface, {
      kind: "graph",
      paneId: source.paneId,
    });
    const copy = duplicated.surface.graphPanes.at(-1)!;
    expect(copy.paneId).not.toBe(source.paneId);
    expect(copy.graphId).toBe(source.graphId);
    expect(copy.series).toEqual(source.series);
    expect(copy.series).not.toBe(source.series);
    expect(copy.series[0]).not.toBe(source.series[0]);
    expect(copy.traceColors).toEqual(source.traceColors);
    expect(copy.traceColors).not.toBe(source.traceColors);
    expect(copy.traceColors?.[0]).not.toBe(source.traceColors?.[0]);
  });

  it("compares Output panes by fixing one whole pane per Scenario", async () => {
    const composition = await loadStudioDefaultClientCompositionV2();
    const surface = createDefaultExperimentSurfaceV3(
      composition.modelSurface.contract,
      "scenario/a",
    );
    const source = surface.outputPanes[0]!;
    const scenarios = [
      { scenarioId: "scenario/a" },
      { scenarioId: "scenario/b" },
      { scenarioId: "scenario/c" },
    ] as const;

    const firstComparison = compareWorkbenchOutputPaneByScenarioV3(surface, {
      paneId: source.paneId,
      activeScenarioId: "scenario/a",
      scenarios,
    });
    expect(firstComparison.paneId).not.toBeNull();
    expect(firstComparison.surface.outputPanes).toHaveLength(2);
    expect(firstComparison.surface.outputPanes[0]?.binding).toEqual({
      mode: "fixed",
      scenarioId: "scenario/a",
    });
    expect(firstComparison.surface.outputPanes[1]?.binding).toEqual({
      mode: "fixed",
      scenarioId: "scenario/b",
    });
    expect(firstComparison.surface.outputPanes[1]?.items).toEqual(source.items);
    expect(firstComparison.surface.outputPanes[1]?.items).not.toBe(
      source.items,
    );

    const secondComparison = compareWorkbenchOutputPaneByScenarioV3(
      firstComparison.surface,
      {
        paneId: source.paneId,
        activeScenarioId: "scenario/b",
        scenarios,
      },
    );
    expect(secondComparison.surface.outputPanes).toHaveLength(3);
    expect(secondComparison.surface.outputPanes[2]?.binding).toEqual({
      mode: "fixed",
      scenarioId: "scenario/c",
    });

    const exhausted = compareWorkbenchOutputPaneByScenarioV3(
      secondComparison.surface,
      {
        paneId: source.paneId,
        activeScenarioId: "scenario/c",
        scenarios,
      },
    );
    expect(exhausted.paneId).toBeNull();
    expect(exhausted.surface).toBe(secondComparison.surface);
  });

  it("updates and resets one exact Scenario/item color without touching siblings", async () => {
    const composition = await loadStudioDefaultClientCompositionV2();
    const pane = createDefaultExperimentSurfaceV3(
      composition.modelSurface.contract,
    ).graphPanes.find(
      ({ graphId }) =>
        graphId === "hemodynamics.pressure.waveform.comprehensive-v1",
    )!;
    const first = pane.traceColors![0]!;
    const sibling = pane.traceColors![1]!;
    const customized = updateWorkbenchGraphTraceCustomColorV3(pane, {
      scenarioId: first.scenarioId,
      seriesId: first.seriesId,
      colorHex: "#db2777",
    });
    const withSibling = updateWorkbenchGraphTraceCustomColorV3(customized, {
      scenarioId: sibling.scenarioId,
      seriesId: sibling.seriesId,
      colorHex: "#167db8",
    });

    expect(
      withSibling.traceColors?.find(
        (trace) =>
          trace.scenarioId === first.scenarioId &&
          trace.seriesId === first.seriesId,
      )?.customColorHex,
    ).toBe("#db2777");
    expect(
      withSibling.traceColors?.find(
        (trace) =>
          trace.scenarioId === sibling.scenarioId &&
          trace.seriesId === sibling.seriesId,
      )?.customColorHex,
    ).toBe("#167db8");
    const reset = updateWorkbenchGraphTraceCustomColorV3(withSibling, {
      scenarioId: first.scenarioId,
      seriesId: first.seriesId,
      colorHex: null,
    });
    expect(
      reset.traceColors?.find(
        (trace) =>
          trace.scenarioId === first.scenarioId &&
          trace.seriesId === first.seriesId,
      ),
    ).toEqual(first);
    expect(
      reset.traceColors?.find(
        (trace) =>
          trace.scenarioId === sibling.scenarioId &&
          trace.seriesId === sibling.seriesId,
      )?.customColorHex,
    ).toBe("#167db8");
  });

  it("preserves role-specific and explicitly empty Briefings across Worker restart", async () => {
    const composition = await loadStudioDefaultClientCompositionV2();
    const surface = createDefaultExperimentSurfaceV3(composition.modelSurface.contract);
    const snapshot = createWorkbenchBriefingSnapshotV3({
      defaultTitle: "Workbench experiment",
      surfaceSeriesId: composition.modelSurface.identity.surfaceSeriesId,
      surfaceReleaseId: composition.modelSurface.identity.surfaceReleaseId,
      modelId: composition.modelSurface.contract.modelId,
      scenarios: [
        { scenarioId: "scenario/default", label: "Baseline" },
        { scenarioId: "scenario/comparison", label: "Comparison" },
      ],
      surface,
    });
    const defaultBriefing = reconcileWorkbenchBriefingV3({
      briefing: null,
      preferredFocusScenarioId: "scenario/comparison",
      snapshot,
    });
    expect(defaultBriefing.scenarioScope.initialFocusScenarioId).toBe(
      "scenario/comparison",
    );
    expect(
      defaultBriefing.controls.every(
        (control) =>
          control.binding.mode === "fixed" &&
          control.binding.scenarioIds[0] === "scenario/comparison",
      ),
    ).toBe(true);

    const explicitEmpty = {
      defaultTitle: "Workbench experiment",
      scenarioScope: {
        visibleScenarioIds: ["scenario/default"],
        initialFocusScenarioId: "scenario/default",
      },
      graphs: [],
      outputs: [],
      controls: [],
    } as const;
    expect(
      reconcileWorkbenchBriefingV3({
        briefing: explicitEmpty,
        preferredFocusScenarioId: "scenario/comparison",
        snapshot,
      }),
    ).toEqual(explicitEmpty);
    expect(
      reconcileWorkbenchBriefingV3({
        briefing: { ...explicitEmpty, defaultTitle: "Stale title" },
        preferredFocusScenarioId: "scenario/default",
        defaultTitle: "Workbench experiment",
        snapshot,
      }).defaultTitle,
    ).toBe("Workbench experiment");

    const graph = surface.graphPanes[0]!;
    const partial = {
      ...explicitEmpty,
      graphs: [
        {
          paneId: graph.paneId,
          order: 0,
          emphasis: "primary" as const,
          overrides: {
            label: "Article pressure",
            legend: "compact" as const,
            series: graph.series.slice(0, 1).map((series) => ({
              ...series,
              label: "Focused series",
              order: 0,
            })),
            traceColors: graph.series.slice(0, 1).map((series) => ({
              scenarioId: "scenario/default",
              seriesId: series.seriesId,
              colorHex: "#3ea8ff",
            })),
            ...(graph.windowSec === undefined
              ? {}
              : { windowSec: graph.windowSec }),
            ...(graph.historyDepth === undefined
              ? {}
              : { historyDepth: graph.historyDepth }),
            ...(graph.pressureVolumeAnalysisMode === undefined ? {} : { pvTrailBeats: 4 }),
          },
        },
      ],
    };
    const reconciled = reconcileWorkbenchBriefingV3({
      briefing: partial,
      preferredFocusScenarioId: "scenario/default",
      snapshot,
    });
    expect(reconciled.graphs).toEqual(partial.graphs);
    expect(reconciled.outputs).toEqual([]);
    expect(reconciled.controls).toEqual([]);
  });

  it("materializes the active slot only for a newly picked control", async () => {
    const composition = await loadStudioDefaultClientCompositionV2();
    const surface = createDefaultExperimentSurfaceV3(composition.modelSurface.contract);
    const snapshot = createWorkbenchBriefingSnapshotV3({
      surfaceSeriesId: STANDARD_TEST_SURFACE_SERIES_ID_V1,
      surfaceReleaseId: STANDARD_TEST_SURFACE_RELEASE_ID_V1,
      modelId: composition.modelSurface.contract.modelId,
      scenarios: [
        { scenarioId: "scenario/default", label: "Baseline" },
        { scenarioId: "scenario/comparison", label: "Comparison" },
      ],
      surface,
    });
    const defaults = reconcileWorkbenchBriefingV3({
      briefing: null,
      preferredFocusScenarioId: "scenario/default",
      snapshot,
    });
    const control = defaults.controls[0]!;
    const current = {
      ...defaults,
      scenarioScope: {
        visibleScenarioIds: ["scenario/default"],
        initialFocusScenarioId: "scenario/default",
      },
      controls: [],
    };
    const picked = resolveWorkbenchBriefingEditorChangeV3({
      activeScenarioId: "scenario/comparison",
      current,
      next: { ...current, controls: [control] },
      snapshot,
    });
    expect(picked.scenarioScope.visibleScenarioIds).toEqual([
      "scenario/default",
      "scenario/comparison",
    ]);
    expect(picked.controls[0]?.binding).toEqual({
      mode: "fixed",
      scenarioIds: ["scenario/comparison"],
      application: "absolute",
    });

    const refocused = resolveWorkbenchBriefingEditorChangeV3({
      activeScenarioId: "scenario/default",
      current: picked,
      next: picked,
      snapshot,
    });
    expect(refocused.controls[0]?.binding).toEqual(picked.controls[0]?.binding);
  });

  it("copies a fixed source-pane binding instead of the active capture slot", async () => {
    const composition = await loadStudioDefaultClientCompositionV2();
    const original = createDefaultExperimentSurfaceV3(composition.modelSurface.contract);
    const surface = {
      ...original,
      controlPanes: [
        {
          ...original.controlPanes[0]!,
          binding: {
            mode: "fixed" as const,
            scenarioIds: ["scenario/default"],
          },
        },
      ],
    };
    const snapshot = createWorkbenchBriefingSnapshotV3({
      surfaceSeriesId: STANDARD_TEST_SURFACE_SERIES_ID_V1,
      surfaceReleaseId: STANDARD_TEST_SURFACE_RELEASE_ID_V1,
      modelId: composition.modelSurface.contract.modelId,
      scenarios: [
        { scenarioId: "scenario/default", label: "Baseline" },
        { scenarioId: "scenario/comparison", label: "Comparison" },
      ],
      surface,
    });

    const briefing = reconcileWorkbenchBriefingV3({
      briefing: null,
      preferredFocusScenarioId: "scenario/comparison",
      snapshot,
    });
    expect(briefing.controls[0]?.binding).toEqual({
      mode: "fixed",
      scenarioIds: ["scenario/default"],
      application: "absolute",
    });
  });

  it.each(["graph", "output", "control"] as const)(
    "adds and deletes every %s pane, including the final pane",
    async (kind) => {
      const composition = await loadStudioDefaultClientCompositionV2();
      const original = createDefaultExperimentSurfaceV3(
        composition.modelSurface.contract,
        "scenario/default",
      );
      const panes = (surface: typeof original) =>
        kind === "graph"
          ? surface.graphPanes
          : kind === "output"
            ? surface.outputPanes
            : surface.controlPanes;
      const added = addWorkbenchSurfacePaneV3(
        original,
        kind,
        composition.modelSurface.contract,
        kind === "graph"
          ? "hemodynamics.flow.waveform.comprehensive-v1"
          : undefined,
      );
      expect(added.selectedPane?.kind).toBe(kind);
      expect(panes(added.surface)).toHaveLength(panes(original).length + 1);

      let emptied = added.surface;
      for (const pane of [...panes(emptied)]) {
        const deleted = deleteWorkbenchSurfacePaneV3(emptied, {
          kind,
          paneId: pane.paneId,
        });
        expect(deleted.deleted).toBe(true);
        emptied = deleted.surface;
      }
      expect(panes(emptied)).toEqual([]);
    },
  );

  it("offers only supported graph constructors and one circulation per structural pane", async () => {
    const composition =
      await loadStudioLocalCurrentClientCompositionV1();
    const original = createDefaultExperimentSurfaceV3(composition.modelSurface.contract);
    const constructorGraphIds = [
      ...new Set(WORKBENCH_GRAPH_PANE_OPTIONS_V3.map(({ graphId }) => graphId)),
    ];
    expect(constructorGraphIds).toEqual([
      "hemodynamics.pressure-volume",
      "hemodynamics.pressure.waveform.comprehensive-v1",
      "hemodynamics.flow.waveform.comprehensive-v1",
      "hemodynamics.guyton-starling",
    ]);
    expect(
      composition.modelSurface.contract.graphCatalog.map(({ graphId }) => graphId),
    ).toEqual(
      expect.arrayContaining([
        ...constructorGraphIds,
        "hemodynamics.pressure.waveform",
        "hemodynamics.flow.waveform",
      ]),
    );
    for (const option of WORKBENCH_GRAPH_PANE_OPTIONS_V3.filter(o => composition.modelSurface.contract.graphCatalog.some(g => g.graphId === o.graphId))) {
      const added = addWorkbenchSurfacePaneV3(
        original,
        "graph",
        composition.modelSurface.contract,
        option.graphId,
        "structuralSide" in option ? option.structuralSide : undefined,
      );
      const pane = added.surface.graphPanes.at(-1)!;
      const graph = composition.modelSurface.contract.graphCatalog.find(
        ({ graphId }) => graphId === option.graphId,
      )!;
      expect(pane.graphId).toBe(option.graphId);
      expect("windowSec" in pane).toBe(graph.renderer === "sweep");
      expect("historyDepth" in pane).toBe(graph.renderer === "pressure-volume" || graph.renderer === "structural-return");
      if (graph.renderer === "structural-return") {
        if (!("structuralSide" in option)) {
          throw new Error("structural pane option must select one circulation");
        }
        expect(pane.structuralSide).toBe(option.structuralSide);
        expect(pane.label).toContain(
          option.structuralSide === "right" ? "Systemic" : "Pulmonary",
        );
      }
      expect(pane.series).toEqual(
        graph.renderer === "structural-return" || graph.renderer === "cycle-waveform"
          ? []
          : expect.arrayContaining(
              graph.defaultSeriesIds.map((seriesId) =>
                expect.objectContaining({ seriesId }),
              ),
            ),
      );
    }

    const pulmonary = addWorkbenchSurfacePaneV3(
      original,
      "graph",
      composition.modelSurface.contract,
      "hemodynamics.guyton-starling",
      "left",
    );
    const structuralPanes = pulmonary.surface.graphPanes.filter(
      ({ graphId }) => graphId === "hemodynamics.guyton-starling",
    );
    expect(structuralPanes).toHaveLength(2);
    expect(new Set(structuralPanes.map(({ paneId }) => paneId)).size).toBe(2);
    expect(structuralPanes.map(({ structuralSide }) => structuralSide)).toEqual(
      ["right", "left"],
    );
  });

  it("keeps an empty role area recoverable through an explicit add action", () => {
    const html = renderToStaticMarkup(
      <WorkbenchDockview
        ariaLabel="Output area"
        panes={[]}
        role="output"
        renderPane={() => null}
        addPaneLabel="Add output pane"
        emptyPaneLabel="No output panes"
        onAddPane={() => undefined}
      />,
    );

    expect(html).toContain("No output panes");
    expect(html).toContain("Add output pane");
  });

  it("projects the same panes into a Dockview-free mobile Stage and task deck", () => {
    const html = renderToStaticMarkup(
      <WorkbenchMobileStageDeckV3
        graphPanes={[
          { paneId: "graph/pv", role: "graph", title: "PV loop" },
          { paneId: "graph/wave", role: "graph", title: "Waveform" },
        ]}
        outputPanes={[
          { paneId: "output/main", role: "output", title: "Outputs" },
        ]}
        controlPanes={[
          { paneId: "control/main", role: "control", title: "Controls" },
        ]}
        graphAddOptions={[{ id: "waveform", label: "Waveform" }]}
        scenarioContent={<div>Scenario manager content</div>}
        renderGraphPane={() => <div>Live graph content</div>}
        renderOutputPane={() => <div>Output content</div>}
        renderControlPane={() => <div>Control content</div>}
        onOpenPaneSettings={() => {}}
        onAddGraphPane={() => undefined}
        onAddOutputPane={() => undefined}
        onAddControlPane={() => undefined}
      />,
    );

    expect(html).toContain('data-testid="workbench-mobile-stage-deck"');
    expect(html).toContain('data-testid="workbench-mobile-stage"');
    expect(html).toContain('data-testid="workbench-mobile-task-scroll"');
    expect(html).toContain("Live graph content");
    expect(html).toContain("Control content");
    expect(html).not.toContain("Output content");
    expect(html).not.toContain("Scenario manager content");
    expect(html).not.toContain("dv-groupview");
    expect(html).not.toContain("<select");
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).toContain('aria-label="グラフビュー"');
    expect(html).toContain('data-mobile-pane-groups="control"');
    expect(html).toContain('data-mobile-pane-group-role="control"');
    expect(html).not.toContain("1/2");
    expect(html.match(/role="tab"/g)).toHaveLength(5);
  });

  it("keeps output and control pane composition Scenario-neutral", async () => {
    const composition = await loadStudioDefaultClientCompositionV2();
    const baselineSurface = createDefaultExperimentSurfaceV3(
      composition.modelSurface.contract,
      "scenario/baseline",
    );
    const alternateSurface = createDefaultExperimentSurfaceV3(
      composition.modelSurface.contract,
      "scenario/as",
    );
    expect(alternateSurface.outputPanes).toEqual(baselineSurface.outputPanes);
    expect(alternateSurface.controlPanes).toEqual(baselineSurface.controlPanes);
    expect(JSON.stringify(baselineSurface.outputPanes)).not.toMatch(
      /colorHex|targetScenarioIds/,
    );
    expect(JSON.stringify(baselineSurface.controlPanes)).not.toMatch(
      /colorHex|targetScenarioIds/,
    );
  });

  it("suggests portable collision-free Scenario identities and labels", () => {
    expect(
      suggestWorkbenchScenarioIdV3(
        "preset/healthy",
        new Set(["scenario/healthy", "scenario/healthy-2"]),
      ),
    ).toBe("scenario/healthy-3");
    expect(
      suggestWorkbenchScenarioLabelV3(
        "Healthy",
        new Set(["Healthy", "Healthy 2"]),
      ),
    ).toBe("Healthy 3");
  });

  it("keeps the Scenario Manager independent from controller pane content", () => {
    const html = renderToStaticMarkup(
      <WorkbenchScenarioManagerV3
        variant="embedded"
        modelId="model/main-wire-v3"
        scenarios={[{ scenarioId: "scenario/healthy", label: "Healthy" }]}
        activeScenarioId="scenario/healthy"
        pendingScenarioIds={["scenario/healthy"]}
        scenarioBaseColors={[
          {
            scenarioId: "scenario/healthy",
            colorHex: "#8b76d1",
          },
        ]}
        presets={[]}
        strings={DEFAULT_WORKBENCH_SCENARIO_MANAGER_STRINGS_V3}
        onSelectScenario={() => {}}
        onChangeScenarioBaseColor={() => {}}
        onAddFromPreset={() => {}}
        onDuplicateScenario={() => {}}
        onRenameScenario={() => {}}
        onDeleteScenario={() => {}}
      />,
    );
    expect(html).toContain('data-scenario-manager-variant="embedded"');
    expect(html).not.toContain("controller-scenario-id");
    expect(html).not.toContain("controller-for");
    expect(html).not.toContain('role="dialog"');
    expect(html).toContain('aria-label="Base color for new traces: Healthy"');
    expect(html).toContain('value="#8b76d1"');
    expect(html).toContain('data-scenario-analysis-pending="true"');
    expect(html).toContain("Recalculating Guyton / Starling: Healthy");
  });

  it("lets the mobile task deck own Scenario scrolling", () => {
    const html = renderToStaticMarkup(
      <WorkbenchScenarioManagerV3
        variant="embedded-mobile"
        modelId="model/main-wire-v3"
        scenarios={[{ scenarioId: "scenario/healthy", label: "Healthy" }]}
        activeScenarioId="scenario/healthy"
        presets={[]}
        strings={DEFAULT_WORKBENCH_SCENARIO_MANAGER_STRINGS_V3}
        onSelectScenario={() => {}}
        onAddFromPreset={() => {}}
        onDuplicateScenario={() => {}}
        onRenameScenario={() => {}}
        onDeleteScenario={() => {}}
      />,
    );

    expect(html).toContain('data-scenario-manager-variant="embedded-mobile"');
    expect(html).not.toContain("overflow-y-auto");
    expect(html).not.toContain("max-h-[280px]");
  });

  it("keeps preset browsing copy separate from capture and supports bilingual search", () => {
    const preset: ScenarioPresetV2 = {
      schemaId: "circleheart-studio-scenario-preset-v2", presetId: "standard74-as-low-flow-reduced-ef-v1",
      modelId: "model/test", title: "AS · 低EF・低流量・低勾配", description: "Original scientific description",
      capture: { fixture: {}, checkpoint: { acceptedRevision: 0, acceptedTimeSec: 0, payload: {} } },
    };
    const before = JSON.stringify(preset);
    const ja = studioPresetPresentationV1(preset, "ja");
    expect(ja.group).toBe("valves");
    expect(ja.summary).toContain("左室拡大");
    for (const query of ["大動脈弁狭窄", "ＡＳ low", "低流量", "HFrEF", "LFLG"]) {
      expect(studioPresetMatchesSearchV1(ja.searchTerms, query)).toBe(true);
    }
    expect(studioPresetMatchesSearchV1(ja.searchTerms, "high gradient")).toBe(false);
    expect(studioPresetPresentationV1(preset, "en").label).toBe("AS · Low EF, low flow, low gradient");
    expect(JSON.stringify(preset)).toBe(before);
    const unknown = { ...preset, presetId: "custom", title: "Custom", description: "Custom" };
    expect(studioPresetPresentationV1(unknown, "ja")).toMatchObject({ label: "Custom", group: "other", summary: "" });
    expect(studioPresetPresentationV1({ ...unknown, presetId: "constructor" }, "ja").summary).toBe("");
    expect(studioPresetPresentationV1({ ...preset, presetId: "preset/workbench-loaded-state" }, "ja").group).toBe("loaded");
    const thirty = Array.from({ length: 30 }, (_, index) => studioPresetPresentationV1({ ...unknown, title: `Case ${index + 1}` }, "en"));
    expect(thirty.filter(item => studioPresetMatchesSearchV1(item.searchTerms, "Case 30"))).toHaveLength(1);
  });

  it("keeps the existing Scenario list and preset browser available with five Scenarios", () => {
    const html = renderToStaticMarkup(
      <WorkbenchScenarioManagerV3
        variant="embedded"
        modelId="model/main-wire-v3"
        scenarios={Array.from({ length: 5 }, (_, index) => ({
          scenarioId: `scenario/${index + 1}`,
          label: `Scenario ${index + 1}`,
        }))}
        activeScenarioId="scenario/1"
        presets={[
          {
            schemaId: "circleheart-studio-scenario-preset-v2",
            presetId: "preset/healthy",
            modelId: "model/main-wire-v3",
            title: "Healthy",
            description: "Baseline",
            capture: {
              fixture: {},
              checkpoint: {
                acceptedRevision: 0,
                acceptedTimeSec: 0,
                payload: {},
              },
            },
          },
        ]}
        strings={DEFAULT_WORKBENCH_SCENARIO_MANAGER_STRINGS_V3}
        onSelectScenario={() => {}}
        onAddFromPreset={() => {}}
        onDuplicateScenario={() => {}}
        onRenameScenario={() => {}}
        onDeleteScenario={() => {}}
      />,
    );

    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).not.toContain('disabled=""');
    expect(html.match(/class="workbench-scenario-row/g)).toHaveLength(5);
    expect(html).not.toContain("5/4");
  });

  it("keys structural auto-analysis by the missing Scenario set and retries after busy", () => {
    const analysisId = "analysis/structural-return";
    const scenarioAKey = structuralReturnComparisonRequestKeyV3(analysisId, [
      "scenario/a",
    ]);
    const scenarioBKey = structuralReturnComparisonRequestKeyV3(analysisId, [
      "scenario/b",
    ]);
    expect(scenarioAKey).not.toBe(scenarioBKey);
    expect(structuralReturnComparisonRequestKeyV3(analysisId, [])).toBeNull();

    expect(
      shouldAutoRequestStructuralReturnComparisonV3({
        acceptedStepAvailable: true,
        currentRequestKey: scenarioAKey,
        lastAutoRequestedKey: null,
        operationPending: false,
      }),
    ).toBe(true);
    expect(
      shouldAutoRequestStructuralReturnComparisonV3({
        acceptedStepAvailable: true,
        currentRequestKey: scenarioBKey,
        lastAutoRequestedKey: scenarioAKey,
        operationPending: false,
      }),
    ).toBe(true);
    // A competing pane waits while the global operation is occupied, then
    // becomes admissible when the busy state returns to false.
    expect(
      shouldAutoRequestStructuralReturnComparisonV3({
        acceptedStepAvailable: true,
        currentRequestKey: scenarioBKey,
        lastAutoRequestedKey: scenarioAKey,
        operationPending: true,
      }),
    ).toBe(false);
    expect(
      shouldAutoRequestStructuralReturnComparisonV3({
        acceptedStepAvailable: true,
        currentRequestKey: scenarioBKey,
        lastAutoRequestedKey: scenarioAKey,
        operationPending: false,
      }),
    ).toBe(true);
    expect(
      shouldAutoRequestStructuralReturnComparisonV3({
        acceptedStepAvailable: true,
        currentRequestKey: scenarioBKey,
        lastAutoRequestedKey: scenarioBKey,
        operationPending: false,
      }),
    ).toBe(false);
  });

  it("preserves Surface edits submitted after an asynchronous durable operation", async () => {
    const composition = await loadStudioDefaultClientCompositionV2();
    const durableSurface = createDefaultExperimentSurfaceV3(
      composition.modelSurface.contract,
    );
    const editedSurface = {
      ...durableSurface,
      note: { text: "written while snapshot qualification was running" },
    };
    const unchanged = resolveWorkbenchSurfaceAfterCommitV3({
      submittedMutationRevision: 4,
      currentMutationRevision: 4,
      currentSurface: durableSurface,
      durableSurface,
    });
    expect(unchanged).toEqual({
      surface: durableSurface,
      hasNewerMutations: false,
    });

    const changed = resolveWorkbenchSurfaceAfterCommitV3({
      submittedMutationRevision: 4,
      currentMutationRevision: 5,
      currentSurface: editedSurface,
      durableSurface,
    });
    expect(changed.surface).toBe(editedSurface);
    expect(changed.hasNewerMutations).toBe(true);
  });

  it("publishes the exact final root frame when playback pauses", () => {
    expect(
      shouldPublishWorkbenchRootFrameV3({
        acceptedTimeSec: 1.052,
        lastPublishedTimeSec: 1,
        schedulerRunning: true,
      }),
    ).toBe(false);
    expect(
      shouldPublishWorkbenchRootFrameV3({
        acceptedTimeSec: 1.052,
        lastPublishedTimeSec: 1,
        schedulerRunning: false,
      }),
    ).toBe(true);
  });

  it("keeps a raw PV loop independent from an unavailable PVA analysis", () => {
    expect(
      workbenchPvGraphUsesPeriodicPvaAnalysisV3(
        "pressure-volume",
        ["LV"],
        null,
      ),
    ).toBe(false);
    expect(
      workbenchPvGraphUsesPeriodicPvaAnalysisV3(
        "pressure-volume",
        ["LV"],
        {} as never,
      ),
    ).toBe(true);
    expect(
      workbenchPvGraphUsesPeriodicPvaAnalysisV3(
        "pressure-volume",
        ["LV"],
        {} as never,
        "raw-exact-orbit",
      ),
    ).toBe(false);
    expect(
      workbenchPvGraphUsesPeriodicPvaAnalysisV3(
        "sweep",
        ["LV"],
        {} as never,
      ),
    ).toBe(false);

    const rawMarkup = renderToStaticMarkup(
      <PressureVolumeLoopCanvasV3
        periodicPvaSupported={false}
        showPressureEnvelope
        traces={[]}
      />,
    );
    expect(rawMarkup).toContain('data-pv-analysis-mode="raw-exact-orbit"');
    expect(rawMarkup).not.toContain("formal-periodic");
    expect(rawMarkup).not.toContain("preload-reduction analysis selected");
    expect(rawMarkup).toContain('data-pv-pressure-envelope-visible="false"');
  });

  it("distinguishes a cold-restarted accepted clock from a warm input epoch", () => {
    const previous = {
      inputEpoch: 3,
      acceptedRevision: 500,
      acceptedTimeSec: 1,
    };
    expect(
      workbenchInputMutationReplacedAcceptedClockV3(previous, {
        inputEpoch: 4,
        acceptedRevision: 0,
        acceptedTimeSec: 0,
      }),
    ).toBe(true);
    expect(
      workbenchInputMutationReplacedAcceptedClockV3(previous, {
        inputEpoch: 4,
        acceptedRevision: 500,
        acceptedTimeSec: 1,
      }, "accepted-state-warm-start"),
    ).toBe(false);
    expect(
      workbenchInputMutationReplacedAcceptedClockV3(previous, {
        inputEpoch: 4,
        acceptedRevision: 500,
        acceptedTimeSec: 1,
      }, "cold-restart"),
    ).toBe(true);
    expect(
      workbenchInputMutationReplacedAcceptedClockV3(previous, {
        inputEpoch: 3,
        acceptedRevision: 499,
        acceptedTimeSec: 0.998,
      }),
    ).toBe(false);
  });

  it("labels every concurrently simulated Scenario from global playback", () => {
    expect(workbenchScenarioRuntimeStatusV3(true)).toBe("Live");
    expect(workbenchScenarioRuntimeStatusV3(false)).toBe("Paused");
  });

  it("keeps only wholly rejected recoverable control transactions live", () => {
    expect(workbenchRejectedControlCanResumeRuntimeV3({
      dispatchedCount: 1,
      acceptedCount: 0,
      everyRejectionRecoverable: true,
    })).toBe(true);
    expect(workbenchRejectedControlCanResumeRuntimeV3({
      dispatchedCount: 2,
      acceptedCount: 1,
      everyRejectionRecoverable: true,
    })).toBe(false);
    expect(workbenchRejectedControlCanResumeRuntimeV3({
      dispatchedCount: 1,
      acceptedCount: 0,
      everyRejectionRecoverable: false,
    })).toBe(false);
  });

  it("restores the accepted control value after a rejected commit", async () => {
    const control = {
      controlId: "hemodynamics.systemic-resistance",
      valueType: "number" as const,
      unit: "1",
      minimum: 0.75,
      maximum: 1.25,
      step: 0.01,
      defaultValue: 1,
      changeSemantics: "accepted-state-warm-start" as const,
    };
    const reject = vi.fn(async () => false);
    const accept = vi.fn(async () => true);

    await expect(
      resolveControlDraftCommitV3({
        acceptedValue: 1,
        candidate: 1.2,
        control,
        onCommit: reject,
      }),
    ).resolves.toEqual({ accepted: false, displayValue: 1 });
    await expect(
      resolveControlDraftCommitV3({
        acceptedValue: 1,
        candidate: 1.2,
        control,
        onCommit: accept,
      }),
    ).resolves.toEqual({ accepted: true, displayValue: 1.2 });
    await expect(
      resolveControlDraftCommitV3({
        acceptedValue: 1,
        candidate: 1,
        control,
        forceCommit: true,
        onCommit: accept,
      }),
    ).resolves.toEqual({ accepted: true, displayValue: 1 });
    expect(reject).toHaveBeenCalledWith(1.2);
    expect(accept.mock.calls).toEqual([[1.2], [1]]);
  });

  it("keeps role areas exact in the server fallback", () => {
    const pane: WorkbenchPaneDefinitionV3 = Object.freeze({
      paneId: "graph-1",
      role: "graph",
      title: "Graph",
    });
    const html = renderToStaticMarkup(
      <WorkbenchDockview
        ariaLabel="Graph area"
        panes={[pane]}
        role="graph"
        renderPane={() => <div>V3 graph</div>}
      />,
    );

    expect(html).toContain('aria-label="Graph area"');
    expect(html).toContain('data-workbench-role-area="graph"');
    expect(html).toContain("V3 graph");
  });

  it("uses one tab group for narrow graphs and a desktop teaching dashboard", () => {
    expect(
      [0, 1, 2, 3].map((index) => workbenchPanePlacementV3(index, "tabs")),
    ).toEqual(["first", "within", "within", "within"]);
    // Desktop stays at two columns: pane 2 starts the right-hand group and
    // panes 3+ join its tab strip.
    expect(
      [0, 1, 2, 3].map((index) => workbenchPanePlacementV3(index, "split")),
    ).toEqual(["first", "right", "within", "within"]);
    expect(
      [0, 1, 2, 3].map((index) => workbenchPanePlacementV3(index, "dashboard")),
    ).toEqual(["first", "right", "within", "within"]);
  });

  it("keeps PV full-height beside stacked structural and waveform groups", () => {
    const setSize = vi.fn();
    const upperLeftGroup = { id: "upper-left", api: { setSize } };
    const upperRightGroup = { id: "upper-right" };
    const lowerGroup = { id: "lower" };
    const panels: Array<{
      id: string;
      group: { id: string };
      api: { setActive: ReturnType<typeof vi.fn> };
    }> = [];
    const addPanel = vi.fn(
      (options: { id: string; position?: { direction: string } }) => {
        const group =
          options.position?.direction === "below"
            ? lowerGroup
            : options.position?.direction === "right"
              ? upperRightGroup
              : upperLeftGroup;
        panels.push({ id: options.id, group, api: { setActive: vi.fn() } });
      },
    );
    const api = {
      width: 1000,
      activePanel: undefined,
      addPanel,
      clear: vi.fn(() => panels.splice(0)),
      get panels() {
        return panels;
      },
      getPanel: vi.fn((paneId: string) =>
        panels.find(({ id }) => id === paneId),
      ),
    } as unknown as DockviewApi;
    const panes: readonly WorkbenchPaneDefinitionV3[] = [
      { paneId: "graph/pv", role: "graph", title: "PV loop" },
      {
        paneId: "graph/systemic",
        role: "graph",
        title: "Systemic Guyton / Starling",
      },
      { paneId: "graph/pressure", role: "graph", title: "Pressure" },
    ];

    applyWorkbenchPanesV3(api, panes, "dashboard");

    expect(addPanel.mock.calls.map(([options]) => options.id)).toEqual([
      "graph/pv",
      "graph/systemic",
      "graph/pressure",
    ]);
    expect(addPanel.mock.calls[1]?.[0]).toEqual(
      expect.objectContaining({
        position: expect.objectContaining({ direction: "right", referenceGroup: upperLeftGroup }),
      }),
    );
    expect(addPanel.mock.calls[2]?.[0]).toEqual(
      expect.objectContaining({
        position: expect.objectContaining({ direction: "below", referenceGroup: upperRightGroup }),
      }),
    );
    expect(setSize).toHaveBeenCalledWith({ width: 580 });
  });

  it("constrains split axes by role and adds controller panes as tabs", () => {
    expect(workbenchPaneSplitDirectionsForRoleV3("graph")).toEqual([
      "right",
      "below",
    ]);
    expect(workbenchPaneSplitDirectionsForRoleV3("output")).toEqual(["right"]);
    expect(workbenchPaneSplitDirectionsForRoleV3("control")).toEqual(["below"]);
    expect(workbenchDockLayoutModeForRoleV3("output", false)).toBe("split");
    expect(workbenchDockLayoutModeForRoleV3("graph", false)).toBe("dashboard");
    expect(workbenchDockLayoutModeForRoleV3("graph", true)).toBe("tabs");
    expect(workbenchDockLayoutModeForRoleV3("control", false)).toBe("tabs");
    expect(workbenchDockLayoutModeForRoleV3("control", true)).toBe("tabs");
    expect(workbenchDockDropPositionAllowedForRoleV3("output", "right")).toBe(
      true,
    );
    expect(workbenchDockDropPositionAllowedForRoleV3("output", "bottom")).toBe(
      false,
    );
    expect(workbenchDockDropPositionAllowedForRoleV3("control", "bottom")).toBe(
      true,
    );
    expect(workbenchDockDropPositionAllowedForRoleV3("control", "right")).toBe(
      false,
    );
    expect(workbenchDockDropPositionAllowedForRoleV3("control", "center")).toBe(
      true,
    );
  });

  it("anchors an add action inside every Dockview tab group", () => {
    expect(workbenchAddPaneAnchorForGroupV3(["pane/one"])).toBe("pane/one");
    expect(workbenchAddPaneAnchorForGroupV3(["pane/two", "pane/three"])).toBe(
      "pane/three",
    );
    expect(workbenchAddPaneAnchorForGroupV3([])).toBeUndefined();
    expect("addPane" in DEFAULT_WORKBENCH_PANE_EDITOR_STRINGS_V3).toBe(false);
  });

  it("adds a pane to the exact group whose adjacent add action was used", () => {
    const leftGroup = { id: "left-group" };
    const rightGroup = { id: "right-group" };
    const setActive = vi.fn();
    let paneAdded = false;
    const addPanel = vi.fn(() => {
      paneAdded = true;
    });
    const clear = vi.fn();
    const api = {
      activePanel: { id: "graph/right" },
      addPanel,
      clear,
      panels: [
        { id: "graph/pressure", group: leftGroup },
        { id: "graph/pv", group: rightGroup },
        { id: "graph/flow", group: leftGroup },
      ],
      getPanel: vi.fn((paneId: string) => {
        if (paneId === "graph/pressure" || paneId === "graph/flow") {
          return { group: leftGroup, api: { setActive: vi.fn() } };
        }
        if (paneId === "graph/pv") {
          return { group: rightGroup, api: { setActive: vi.fn() } };
        }
        if (paneId === "graph/starling" && paneAdded) {
          return { group: leftGroup, api: { setActive } };
        }
        return undefined;
      }),
    } as unknown as DockviewApi;
    const panes: readonly WorkbenchPaneDefinitionV3[] = [
      { paneId: "graph/pressure", role: "graph", title: "Pressure" },
      { paneId: "graph/pv", role: "graph", title: "PV loop" },
      { paneId: "graph/flow", role: "graph", title: "Flow" },
      {
        paneId: "graph/starling",
        role: "graph",
        title: "Systemic Guyton / Starling",
      },
    ];

    applyWorkbenchPanesV3(api, panes, "split", null, {
      paneId: "graph/starling",
      anchorPaneId: "graph/flow",
    });

    expect(clear).not.toHaveBeenCalled();
    expect(addPanel).toHaveBeenCalledOnce();
    expect(addPanel).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "graph/starling",
        position: {
          referenceGroup: leftGroup,
          direction: "within",
        },
      }),
    );
    expect(setActive).toHaveBeenCalledOnce();
  });

  it("rejects a pane placed into a different role area", () => {
    const pane: WorkbenchPaneDefinitionV3 = Object.freeze({
      paneId: "output-1",
      role: "output",
      title: "Outputs",
    });

    expect(() =>
      renderToStaticMarkup(
        <WorkbenchDockview
          ariaLabel="Graph area"
          panes={[pane]}
          role="graph"
          renderPane={() => null}
        />,
      ),
    ).toThrow(/graph area cannot host output pane output-1/);
  });

  it("does not rebuild Dockview for title or content-only pane changes", () => {
    const clear = vi.fn();
    const addPanel = vi.fn();
    const api = {
      addPanel,
      clear,
      panels: [],
    } as unknown as DockviewApi;
    const pane: WorkbenchPaneDefinitionV3 = Object.freeze({
      paneId: "graph-1",
      role: "graph",
      title: "Pressure",
    });

    let signature = reconcileWorkbenchPanesV3(api, [pane], null);
    signature = reconcileWorkbenchPanesV3(
      api,
      [{ ...pane, title: "Flow" }],
      signature,
    );
    const changedContent = {
      ...pane,
      graphId: "graph-definition/flow",
      title: "Flow",
    };
    signature = reconcileWorkbenchPanesV3(api, [changedContent], signature);

    expect(clear).toHaveBeenCalledTimes(1);
    expect(addPanel).toHaveBeenCalledTimes(1);
  });

  it("removes the rightmost output pane without rebuilding or splitting survivors", () => {
    const leftGroup = { id: "left" };
    const rightGroup = { id: "right" };
    const panels = [
      { id: "output-1", group: leftGroup },
      { id: "output-2", group: leftGroup },
      { id: "output-3", group: rightGroup },
    ];
    const clear = vi.fn();
    const removePanel = vi.fn((panel: (typeof panels)[number]) => {
      const index = panels.indexOf(panel);
      if (index >= 0) panels.splice(index, 1);
    });
    const api = {
      activePanel: panels[2],
      addPanel: vi.fn(),
      clear,
      get panels() {
        return panels;
      },
      getPanel: vi.fn((paneId: string) =>
        panels.find(({ id }) => id === paneId),
      ),
      removePanel,
    } as unknown as DockviewApi;

    reconcileWorkbenchPaneMembershipV3(
      api,
      [
        { paneId: "output-1", role: "output", title: "Outputs 1" },
        { paneId: "output-2", role: "output", title: "Outputs 2" },
      ],
      "split",
    );

    expect(clear).not.toHaveBeenCalled();
    expect(removePanel).toHaveBeenCalledOnce();
    expect(panels.map(({ id }) => id)).toEqual(["output-1", "output-2"]);
    expect(panels.every(({ group }) => group === leftGroup)).toBe(true);
  });

  it("rebuilds only when responsive layout changes between split and tabs", () => {
    const panel = { id: "graph-1", group: { id: "group-1" } };
    const clear = vi.fn();
    const api = {
      activePanel: panel,
      addPanel: vi.fn(),
      clear,
      getPanel: vi.fn(() => panel),
      panels: [panel],
      removePanel: vi.fn(),
    } as unknown as DockviewApi;
    const panes: readonly WorkbenchPaneDefinitionV3[] = [
      { paneId: "graph-1", role: "graph", title: "Pressure" },
    ];

    const splitSignature = reconcileWorkbenchPanesV3(api, panes, null, "split");
    expect(clear).not.toHaveBeenCalled();
    reconcileWorkbenchPanesV3(api, panes, splitSignature, "tabs");
    expect(clear).toHaveBeenCalledOnce();
  });

  it("keeps Workbench area proportions as a defensive device-local preference", () => {
    expect(DEFAULT_WORKBENCH_AREA_LAYOUT_V3.outputHeightRatio).toBe(0.18);
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    };
    const preference = normalizeWorkbenchAreaLayoutPreferenceV3({
      inspectorWidthRatio: 0.31,
      outputHeightRatio: 0.34,
    });
    saveWorkbenchAreaLayoutPreferenceV3(storage, preference);

    expect(values.has(WORKBENCH_AREA_LAYOUT_STORAGE_KEY_V3)).toBe(true);
    expect(loadWorkbenchAreaLayoutPreferenceV3(storage)).toEqual(preference);
    values.set(WORKBENCH_AREA_LAYOUT_STORAGE_KEY_V3, "not-json");
    expect(loadWorkbenchAreaLayoutPreferenceV3(storage)).toBe(
      DEFAULT_WORKBENCH_AREA_LAYOUT_V3,
    );
    expect(
      normalizeWorkbenchAreaLayoutPreferenceV3({
        inspectorWidthRatio: 8,
        outputHeightRatio: -2,
      }),
    ).toEqual({ inspectorWidthRatio: 0.42, outputHeightRatio: 0.18 });
  });

  it("isolates Reader proportions from Workbench and recovers its own defaults", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    };
    const readerKey = "circleheart.reader.area-layout.v1";
    const readerDefault = { inspectorWidthRatio: 0.24, outputHeightRatio: 0.28 };
    const readerPreference = { inspectorWidthRatio: 0.3, outputHeightRatio: 0.4 };
    expect(loadWorkbenchAreaLayoutPreferenceV3(storage, readerKey, readerDefault)).toEqual(readerDefault);
    saveWorkbenchAreaLayoutPreferenceV3(storage, readerPreference, readerKey);
    expect(loadWorkbenchAreaLayoutPreferenceV3(storage, readerKey, readerDefault)).toEqual(readerPreference);
    expect(loadWorkbenchAreaLayoutPreferenceV3(storage)).toEqual(DEFAULT_WORKBENCH_AREA_LAYOUT_V3);
    for (const invalid of ["not-json", "null", "{}"]) {
      values.set(readerKey, invalid);
      expect(loadWorkbenchAreaLayoutPreferenceV3(storage, readerKey, readerDefault)).toEqual(readerDefault);
    }
  });

  it("updates Dockview's internal title without rebuilding pane structure", () => {
    const clear = vi.fn();
    const addPanel = vi.fn();
    const setTitle = vi.fn();
    const setActive = vi.fn();
    const getPanel = vi.fn(() => ({ api: { setActive }, setTitle }));
    const api = {
      addPanel,
      clear,
      getPanel,
      panels: [],
    } as unknown as DockviewApi;
    const pane: WorkbenchPaneDefinitionV3 = Object.freeze({
      paneId: "graph-1",
      role: "graph",
      title: "Pressure",
    });

    const structureSignature = reconcileWorkbenchPanesV3(api, [pane], null);
    let titleSignature = reconcileWorkbenchPaneTitlesV3(api, [pane], null);
    const renamed = { ...pane, title: "Flow" };
    reconcileWorkbenchPanesV3(api, [renamed], structureSignature);
    titleSignature = reconcileWorkbenchPaneTitlesV3(
      api,
      [renamed],
      titleSignature,
    );
    const changedContent = {
      ...renamed,
      graphId: "graph-definition/flow",
    };
    reconcileWorkbenchPaneTitlesV3(api, [changedContent], titleSignature);

    expect(clear).toHaveBeenCalledTimes(1);
    expect(addPanel).toHaveBeenCalledTimes(1);
    expect(getPanel).toHaveBeenCalledTimes(3);
    expect(setActive).toHaveBeenCalledTimes(1);
    expect(setTitle.mock.calls).toEqual([["Pressure"], ["Flow"]]);
  });

  it("rebuilds Dockview when pane ID, role, or order changes", () => {
    const clear = vi.fn();
    const addPanel = vi.fn();
    const api = {
      addPanel,
      clear,
      panels: [],
    } as unknown as DockviewApi;
    const first: WorkbenchPaneDefinitionV3 = Object.freeze({
      paneId: "graph-1",
      role: "graph",
      title: "Pressure",
    });
    const second: WorkbenchPaneDefinitionV3 = Object.freeze({
      paneId: "graph-2",
      role: "graph",
      title: "Flow",
    });

    let signature = reconcileWorkbenchPanesV3(api, [first, second], null);
    signature = reconcileWorkbenchPanesV3(api, [second, first], signature);
    signature = reconcileWorkbenchPanesV3(
      api,
      [second, { ...first, paneId: "graph-3" }],
      signature,
    );
    reconcileWorkbenchPanesV3(
      api,
      [second, { ...first, paneId: "graph-3", role: "output" }],
      signature,
    );

    expect(clear).toHaveBeenCalledTimes(4);
    expect(addPanel).toHaveBeenCalledTimes(8);
  });

  it("preserves the active pane across rebuilds until that pane is removed", () => {
    const firstSetActive = vi.fn();
    const secondSetActive = vi.fn();
    const thirdSetActive = vi.fn();
    const panelById = new Map([
      ["graph-1", { api: { setActive: firstSetActive } }],
      ["graph-2", { api: { setActive: secondSetActive } }],
      ["graph-3", { api: { setActive: thirdSetActive } }],
    ]);
    let activePanel: Readonly<{ id: string }> | undefined;
    const api = {
      get activePanel() {
        return activePanel;
      },
      addPanel: vi.fn(),
      clear: vi.fn(),
      getPanel: vi.fn((paneId: string) => panelById.get(paneId)),
      panels: [],
    } as unknown as DockviewApi;
    const first: WorkbenchPaneDefinitionV3 = Object.freeze({
      paneId: "graph-1",
      role: "graph",
      title: "Pressure",
    });
    const second: WorkbenchPaneDefinitionV3 = Object.freeze({
      paneId: "graph-2",
      role: "graph",
      title: "Flow",
    });
    const third: WorkbenchPaneDefinitionV3 = Object.freeze({
      paneId: "graph-3",
      role: "graph",
      title: "Volume",
    });

    let signature = reconcileWorkbenchPanesV3(api, [first, second], null);
    expect(firstSetActive).toHaveBeenCalledTimes(1);

    activePanel = { id: second.paneId };
    signature = reconcileWorkbenchPanesV3(
      api,
      [first, second, third],
      signature,
    );
    expect(secondSetActive).toHaveBeenCalledTimes(1);
    expect(firstSetActive).toHaveBeenCalledTimes(1);

    signature = reconcileWorkbenchPanesV3(api, [first, third], signature);
    expect(firstSetActive).toHaveBeenCalledTimes(2);
    expect(secondSetActive).toHaveBeenCalledTimes(1);
    expect(thirdSetActive).not.toHaveBeenCalled();
  });

  it("drops stale Dockview tracking when its framework element unmounts", () => {
    const apiRef: { current: DockviewApi | null } = {
      current: { clear: vi.fn() } as unknown as DockviewApi,
    };
    const appliedSignatureRef: { current: string | null } = {
      current: '[["graph-1","graph"]]',
    };
    const appliedTitleSignatureRef: { current: string | null } = {
      current: '[["graph-1","Pressure"]]',
    };

    resetWorkbenchDockviewTrackingV3(
      apiRef,
      appliedSignatureRef,
      appliedTitleSignatureRef,
    );

    expect(apiRef.current).toBeNull();
    expect(appliedSignatureRef.current).toBeNull();
    expect(appliedTitleSignatureRef.current).toBeNull();
  });
});

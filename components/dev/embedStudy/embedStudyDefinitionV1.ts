import type { ExperimentSurfaceV2 } from "@/studio/contracts/v2/content";
import { controlLabelV3, outputLabelV3 } from "@/components/workbench/WorkbenchSurfaceV3";

/**
 * Authored intent shared by the development-only Article embed study.
 *
 * The Snapshot fixture built from this definition (see
 * tools/dev/buildArticleEmbedStudySnapshotV1.ts) contains real exact captures
 * and real Surface-pinned analyses. The Surface below is ordinary Workbench
 * composition: four graph panes, output panes with different measurement
 * sets (a twelve-item haemodynamic pane per compared Scenario and an
 * eight-item valve pane), and three Scenario-bound control panes. Reading
 * emphasis is not part of the Surface; the study Placements seal it.
 */
export const ARTICLE_EMBED_STUDY_SNAPSHOT_ID_V1 = "snapshot/dev-article-embed-study-v3";
export const ARTICLE_EMBED_STUDY_TBV_CONTROL_ID_V1 = "hemodynamics.total-blood-volume-ml";

export const ARTICLE_EMBED_STUDY_SCENARIOS_V1 = Object.freeze([
  Object.freeze({ scenarioId: "scenario/baseline", label: "基準", tbvDeltaMl: 0 }),
  Object.freeze({ scenarioId: "scenario/tbv-plus-500", label: "TBV +500", tbvDeltaMl: 500 }),
  Object.freeze({ scenarioId: "scenario/tbv-plus-1000", label: "TBV +1000", tbvDeltaMl: 1000 }),
] as const);

export const ARTICLE_EMBED_STUDY_PANE_IDS_V1 = Object.freeze({
  pv: "graph-pv",
  pressure: "graph-pressure",
  flow: "graph-flow",
  starling: "graph-starling",
  outputsBaseline: "output-baseline",
  outputsPlus500: "output-tbv-plus-500",
  outputsValvesPlus1000: "output-valves-tbv-plus-1000",
  controlsBaseline: "control-baseline",
  controlsPlus500: "control-tbv-plus-500",
  controlsPlus1000: "control-tbv-plus-1000",
});

/** Twelve haemodynamic measurements read for one compared Scenario. */
export const ARTICLE_EMBED_STUDY_OUTPUT_IDS_V1 = Object.freeze([
  "hemodynamics.volume.end-diastolic.LV-at-MV-closure",
  "hemodynamics.pressure.absolute.end-diastolic.LV-at-MV-closure",
  "hemodynamics.stroke-volume.LV-event-defined",
  "hemodynamics.ejection-fraction.LV-event-defined",
  "hemodynamics.output.native-left",
  "hemodynamics.pressure.mean.Ao",
  "hemodynamics.pressure.systolic.Ao",
  "hemodynamics.pressure.mean.RA",
  "hemodynamics.pressure.mean.LA",
  "hemodynamics.pressure.mean.PA",
  "hemodynamics.volume.end-systolic.LV-at-AoV-closure",
  "myocardium.work.stroke.LV",
] as const);

/** Eight valve measurements: a different set, read at the largest volume. */
export const ARTICLE_EMBED_STUDY_VALVE_OUTPUT_IDS_V1 = Object.freeze([
  "hemodynamics.pressure-gradient.valve.mean-hydraulic-forward.AoV",
  "hemodynamics.pressure-gradient.valve.peak-hydraulic-forward.AoV",
  "hemodynamics.pressure-gradient.valve.mean-hydraulic-forward.MV",
  "hemodynamics.pressure-gradient.valve.peak-hydraulic-forward.MV",
  "hemodynamics.valve-volume.forward.AoV",
  "hemodynamics.valve-volume.forward.MV",
  "hemodynamics.valve-volume.net.AoV",
  "hemodynamics.stroke-volume.RV-event-defined",
] as const);

export const ARTICLE_EMBED_STUDY_CONTROL_IDS_V1 = Object.freeze([
  "hemodynamics.total-blood-volume-ml",
  "hemodynamics.systemic-resistance",
  "myocardium.contractility",
] as const);

const visibleScope = () => Object.freeze({ mode: "visible-scenarios" as const });

const outputPane = (paneId: string, label: string, order: number, scenarioId: string, outputIds: readonly string[]) => Object.freeze({
  paneId, role: "output" as const, label, order, priority: 100 - order,
  binding: Object.freeze({ mode: "fixed" as const, scenarioId }),
  items: Object.freeze(outputIds.map((outputId, itemOrder) =>
    Object.freeze({ outputId, label: outputLabelV3(outputId), order: itemOrder }))),
});

const slider = (controlId: string, order: number) => Object.freeze({
  controlId, label: controlLabelV3(controlId), order, presentation: Object.freeze({ kind: "slider" as const }),
});

export const ARTICLE_EMBED_STUDY_SURFACE_V1: ExperimentSurfaceV2 = Object.freeze({
  graphPanes: Object.freeze([
    Object.freeze({
      paneId: ARTICLE_EMBED_STUDY_PANE_IDS_V1.pv, role: "graph" as const, label: "PVループ", order: 0, priority: 100,
      graphId: "hemodynamics.pressure-volume",
      scenarioScope: visibleScope(), excludedTraces: Object.freeze([]),
      historyDepth: 1, pressureVolumeAnalysisMode: "formal-periodic" as const,
      series: Object.freeze([Object.freeze({ seriesId: "LV", label: "LV", order: 0 })]),
    }),
    Object.freeze({
      paneId: ARTICLE_EMBED_STUDY_PANE_IDS_V1.starling, role: "graph" as const, label: "Guyton / Starling", order: 1, priority: 99,
      graphId: "hemodynamics.guyton-starling",
      scenarioScope: visibleScope(), excludedTraces: Object.freeze([]),
      historyDepth: 1, structuralSide: "right" as const, series: Object.freeze([]),
    }),
    Object.freeze({
      paneId: ARTICLE_EMBED_STUDY_PANE_IDS_V1.pressure, role: "graph" as const, label: "圧波形", order: 2, priority: 98,
      graphId: "hemodynamics.pressure.waveform.comprehensive-v1",
      scenarioScope: visibleScope(), excludedTraces: Object.freeze([]),
      windowSec: 3,
      series: Object.freeze([
        Object.freeze({ seriesId: "LVP", label: "LVP", order: 0 }),
        Object.freeze({ seriesId: "AoP", label: "AoP", order: 1 }),
        Object.freeze({ seriesId: "LAP", label: "LAP", order: 2 }),
      ]),
    }),
    Object.freeze({
      paneId: ARTICLE_EMBED_STUDY_PANE_IDS_V1.flow, role: "graph" as const, label: "弁流量", order: 3, priority: 97,
      graphId: "hemodynamics.flow.waveform.comprehensive-v1",
      scenarioScope: visibleScope(), excludedTraces: Object.freeze([]),
      windowSec: 3,
      series: Object.freeze([
        Object.freeze({ seriesId: "AoV", label: "AoV", order: 0 }),
        Object.freeze({ seriesId: "MV", label: "MV", order: 1 }),
      ]),
    }),
  ]),
  outputPanes: Object.freeze([
    outputPane(ARTICLE_EMBED_STUDY_PANE_IDS_V1.outputsBaseline, "基準", 0, ARTICLE_EMBED_STUDY_SCENARIOS_V1[0].scenarioId, ARTICLE_EMBED_STUDY_OUTPUT_IDS_V1),
    outputPane(ARTICLE_EMBED_STUDY_PANE_IDS_V1.outputsPlus500, "TBV +500", 1, ARTICLE_EMBED_STUDY_SCENARIOS_V1[1].scenarioId, ARTICLE_EMBED_STUDY_OUTPUT_IDS_V1),
    outputPane(ARTICLE_EMBED_STUDY_PANE_IDS_V1.outputsValvesPlus1000, "弁（TBV +1000）", 2, ARTICLE_EMBED_STUDY_SCENARIOS_V1[2].scenarioId, ARTICLE_EMBED_STUDY_VALVE_OUTPUT_IDS_V1),
  ]),
  controlPanes: Object.freeze([
    Object.freeze({
      paneId: ARTICLE_EMBED_STUDY_PANE_IDS_V1.controlsBaseline, role: "control" as const, label: "基準を操作", order: 0, priority: 100,
      binding: Object.freeze({ mode: "fixed" as const, scenarioIds: Object.freeze([ARTICLE_EMBED_STUDY_SCENARIOS_V1[0].scenarioId]) }),
      items: Object.freeze(ARTICLE_EMBED_STUDY_CONTROL_IDS_V1.map((controlId, order) => slider(controlId, order))),
    }),
    Object.freeze({
      paneId: ARTICLE_EMBED_STUDY_PANE_IDS_V1.controlsPlus500, role: "control" as const, label: "TBV +500 を操作", order: 1, priority: 99,
      binding: Object.freeze({ mode: "fixed" as const, scenarioIds: Object.freeze([ARTICLE_EMBED_STUDY_SCENARIOS_V1[1].scenarioId]) }),
      items: Object.freeze([
        slider("hemodynamics.total-blood-volume-ml", 0),
        slider("hemodynamics.systemic-resistance", 1),
        slider("rhythm.heart-rate-bpm", 2),
      ]),
    }),
    Object.freeze({
      paneId: ARTICLE_EMBED_STUDY_PANE_IDS_V1.controlsPlus1000, role: "control" as const, label: "TBV +1000 を操作", order: 2, priority: 98,
      binding: Object.freeze({ mode: "fixed" as const, scenarioIds: Object.freeze([ARTICLE_EMBED_STUDY_SCENARIOS_V1[2].scenarioId]) }),
      items: Object.freeze([
        Object.freeze({
          controlId: "myocardium.contractility", label: controlLabelV3("myocardium.contractility"), order: 0,
          presentation: Object.freeze({ kind: "buttons" as const, options: Object.freeze([
            Object.freeze({ label: "低下", value: 0.8 }),
            Object.freeze({ label: "基準", value: 1 }),
            Object.freeze({ label: "亢進", value: 1.2 }),
          ]) }),
        }),
        slider("hemodynamics.venous-tone", 1),
      ]),
    }),
  ]),
  note: Object.freeze({ text: "" }),
});

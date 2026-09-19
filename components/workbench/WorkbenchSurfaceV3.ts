import type {
  ExperimentSurfaceControlPaneV2,
  ExperimentSurfaceGraphPaneV2,
  ExperimentSurfaceOutputPaneV2,
  ExperimentSurfaceV2,
} from "@/studio/contracts/v2/content";
import { reconcileWorkbenchGraphColorsV3 } from "./presentation/WorkbenchGraphColorV3";
import {
  STUDIO_GRAPH_HISTORY_DEFAULT_DEPTH_V2,
  STUDIO_GRAPH_HISTORY_MAX_DEPTH_V2,
  STUDIO_GRAPH_HISTORY_MIN_DEPTH_V2,
  STUDIO_SWEEP_WINDOW_MAX_SEC_V2,
  STUDIO_SWEEP_WINDOW_MIN_SEC_V2,
  STUDIO_SWEEP_WINDOW_STEP_SEC_V2,
} from "@/studio/contracts/v2/content";
import type {
  GraphDefinitionV2,
  ModelContractV2,
} from "@/studio/contracts/v2/model";

export const WORKBENCH_SCENARIO_ID_V3 = "workbench-live-default";
// A four-second sweep keeps several complete beats visible in the right column.
// Portable Article authoring retains its own shorter Studio default.
export const WORKBENCH_SWEEP_WINDOW_DEFAULT_SEC_V3 = 4;
export const WORKBENCH_SWEEP_WINDOW_MIN_SEC_V3 = STUDIO_SWEEP_WINDOW_MIN_SEC_V2;
export const WORKBENCH_SWEEP_WINDOW_MAX_SEC_V3 = STUDIO_SWEEP_WINDOW_MAX_SEC_V2;
export const WORKBENCH_SWEEP_WINDOW_STEP_SEC_V3 =
  STUDIO_SWEEP_WINDOW_STEP_SEC_V2;
export const WORKBENCH_GRAPH_HISTORY_DEFAULT_DEPTH_V3 =
  STUDIO_GRAPH_HISTORY_DEFAULT_DEPTH_V2;
export const WORKBENCH_GRAPH_HISTORY_MIN_DEPTH_V3 =
  STUDIO_GRAPH_HISTORY_MIN_DEPTH_V2;
export const WORKBENCH_GRAPH_HISTORY_MAX_DEPTH_V3 =
  STUDIO_GRAPH_HISTORY_MAX_DEPTH_V2;
export const WORKBENCH_PRESSURE_VOLUME_ANALYSIS_DEFAULT_MODE_V3 =
  "formal-periodic" as const;
export const WORKBENCH_PRESSURE_VOLUME_ENVELOPE_DEFAULT_VISIBLE_V3 = false;
const WORKBENCH_LEGACY_AORTIC_PRESSURE_SUMMARY_OUTPUT_IDS_V3 = Object.freeze([
  "hemodynamics.pressure.systolic.Ao",
  "hemodynamics.pressure.diastolic.Ao",
]);
const WORKBENCH_SYSTEMIC_ARTERIAL_PRESSURE_SUMMARY_OUTPUT_IDS_V3 =
  Object.freeze([
    "hemodynamics.pressure.systolic.SA",
    "hemodynamics.pressure.diastolic.SA",
  ]);
const WORKBENCH_PROXIMAL_AORTIC_PRESSURE_SIGNAL_OUTPUT_ID_V3 =
  "hemodynamics.pressure.absolute.aortic-proximal-constitutive-port";

/**
 * The Workbench exposes graph constructors, not registry graph presets. Each
 * constructor owns one axis-unit family so any compatible series can be mixed
 * without asking the author to choose a left/right catalog fragment first.
 */
export const WORKBENCH_GRAPH_PANE_OPTIONS_V3 = Object.freeze([
  Object.freeze({
    optionId: "hemodynamics.pressure-volume",
    graphId: "hemodynamics.pressure-volume",
    kind: "pressure-volume" as const,
  }),
  Object.freeze({
    optionId: "hemodynamics.pressure.waveform",
    graphId: "hemodynamics.pressure.waveform.comprehensive-v1",
    fallbackGraphId: "hemodynamics.pressure.waveform",
    kind: "pressure-waveform" as const,
  }),
  Object.freeze({
    optionId: "hemodynamics.flow.waveform",
    graphId: "hemodynamics.flow.waveform.comprehensive-v1",
    fallbackGraphId: "hemodynamics.flow.waveform",
    kind: "flow-waveform" as const,
  }),
  Object.freeze({
    optionId: "hemodynamics.guyton-starling/systemic",
    graphId: "hemodynamics.guyton-starling",
    kind: "guyton-starling-systemic" as const,
    structuralSide: "right" as const,
  }),
  Object.freeze({
    optionId: "hemodynamics.guyton-starling/pulmonary",
    graphId: "hemodynamics.guyton-starling",
    kind: "guyton-starling-pulmonary" as const,
    structuralSide: "left" as const,
  }),
] as const);

export type WorkbenchGraphPaneKindV3 =
  (typeof WORKBENCH_GRAPH_PANE_OPTIONS_V3)[number]["kind"];

export type WorkbenchResolvedGraphPaneOptionV3 = Readonly<{
  optionId: string;
  graphId: string;
  kind: WorkbenchGraphPaneKindV3;
  structuralSide?: "left" | "right";
}>;

export function resolveWorkbenchGraphPaneOptionV3(
  contract: ModelContractV2,
  optionId: string,
): WorkbenchResolvedGraphPaneOptionV3 | undefined {
  const option = WORKBENCH_GRAPH_PANE_OPTIONS_V3.find(
    (candidate) => candidate.optionId === optionId,
  );
  if (option === undefined) return undefined;
  const fallbackGraphId =
    "fallbackGraphId" in option ? option.fallbackGraphId : undefined;
  const candidateGraphIds: readonly string[] =
    fallbackGraphId === undefined
      ? [option.graphId]
      : [option.graphId, fallbackGraphId];
  const graphId = candidateGraphIds.find((candidate) =>
    contract.graphCatalog.some((graph) => graph.graphId === candidate),
  );
  if (graphId === undefined) return undefined;
  return Object.freeze({
    optionId: option.optionId,
    graphId,
    kind: option.kind,
    ...("structuralSide" in option
      ? { structuralSide: option.structuralSide }
      : {}),
  });
}

export function workbenchGraphPaneOptionsForContractV3(
  contract: ModelContractV2,
): readonly WorkbenchResolvedGraphPaneOptionV3[] {
  return Object.freeze(
    WORKBENCH_GRAPH_PANE_OPTIONS_V3.flatMap((option) => {
      const resolved = resolveWorkbenchGraphPaneOptionV3(
        contract,
        option.optionId,
      );
      return resolved === undefined ? [] : [resolved];
    }),
  );
}

export function workbenchGraphIdForPaneKindV3(
  kind: WorkbenchGraphPaneKindV3,
): string {
  const option = WORKBENCH_GRAPH_PANE_OPTIONS_V3.find(
    (candidate) => candidate.kind === kind,
  );
  if (option === undefined) {
    throw new Error(`Unknown Workbench graph pane kind: ${kind}`);
  }
  return option.graphId;
}

export function workbenchDefaultGraphSeriesIdsV3(
  graph: GraphDefinitionV2,
): readonly string[] {
  return graph.renderer === "structural-return" || graph.renderer === "cycle-waveform"
    ? Object.freeze([])
    : graph.defaultSeriesIds;
}

const OUTPUT_COLOR_BY_ID_V3: Readonly<Record<string, string>> = Object.freeze({
  // Chamber hue stays stable while quantity/measurement uses a tonal step.
  "hemodynamics.volume.LA": "#b34b82",
  "hemodynamics.volume.LV": "#b64b65",
  "hemodynamics.volume.RA": "#277f85",
  "hemodynamics.volume.RV": "#3f6fc1",
  "hemodynamics.pressure.absolute.LA": "#c43f7c",
  "hemodynamics.pressure.absolute.LV": "#cf405a",
  "hemodynamics.pressure.absolute.RA": "#16858b",
  "hemodynamics.pressure.absolute.RV": "#3472c4",
  "hemodynamics.pressure.transmural.LA": "#b23c75",
  "hemodynamics.pressure.transmural.LV": "#c13a53",
  "hemodynamics.pressure.transmural.RA": "#167a82",
  "hemodynamics.pressure.transmural.RV": "#346fc0",
  "hemodynamics.pressure.absolute.Ao": "#167db8",
  "hemodynamics.pressure.absolute.aortic-proximal-constitutive-port":
    "#167db8",
  "hemodynamics.pressure.absolute.SA": "#2d70ac",
  "hemodynamics.pressure.absolute.PA": "#6a61b6",
  "hemodynamics.pressure.absolute.PVein": "#8d52a7",
  "hemodynamics.pressure.absolute.VC": "#247c71",
  "hemodynamics.flow.valve.MV": "#b23e78",
  "hemodynamics.flow.valve.AoV": "#1d7cad",
  "hemodynamics.flow.valve.TV": "#26806f",
  "hemodynamics.flow.valve.PV": "#6d64bd",
  "hemodynamics.flow.systemic.SA_Art": "#167db8",
  "hemodynamics.flow.pulmonary.PA_PArt": "#6a61b6",
  "hemodynamics.flow.venous.VC_RA": "#247c71",
  "hemodynamics.flow.venous.PVein_LA": "#8d52a7",
  "pericardium.pressure.excess": "#a96c08",
  "respiration.pressure.pleural": "#66717b",
  "respiration.pressure.alveolar": "#23818a",
  // A mid-slate total remains visible on both paper and near-black canvases.
  "coronary.flow.total": "#66717b",
  "coronary.flow.inlet.LAD": "#c43f55",
  "coronary.flow.inlet.LCx": "#247d59",
  "coronary.flow.inlet.RCA": "#3472c4",
  "coronary.flow.venous-outlet": "#247c71",
  "device.LVAD.flow": "#a96c08",
  "rhythm.phase.regular-sinus": "#66717b",
});

const OUTPUT_LABEL_BY_ID_V3: Readonly<Record<string, string>> = Object.freeze({
  "hemodynamics.volume.LA": "LA volume",
  "hemodynamics.volume.LV": "LV volume",
  "hemodynamics.volume.RA": "RA volume",
  "hemodynamics.volume.RV": "RV volume",
  "hemodynamics.pressure.absolute.LA": "LA pressure",
  "hemodynamics.pressure.absolute.LV": "LV pressure",
  "hemodynamics.pressure.absolute.RA": "RA pressure",
  "hemodynamics.pressure.absolute.RV": "RV pressure",
  "hemodynamics.pressure.transmural.LA": "LA transmural pressure",
  "hemodynamics.pressure.transmural.LV": "LV transmural pressure",
  "hemodynamics.pressure.transmural.RA": "RA transmural pressure",
  "hemodynamics.pressure.transmural.RV": "RV transmural pressure",
  "hemodynamics.pressure.absolute.Ao": "Aortic-root pressure",
  "hemodynamics.pressure.absolute.aortic-proximal-constitutive-port":
    "Aortic pressure (AoP)",
  "hemodynamics.pressure.absolute.SA": "Arterial blood pressure (ABP)",
  "hemodynamics.pressure.absolute.PA": "Pulmonary arterial pressure",
  "hemodynamics.pressure.absolute.PVein": "Pulmonary venous pressure",
  "hemodynamics.pressure.absolute.VC": "Vena cava pressure",
  "hemodynamics.flow.valve.MV": "Mitral flow",
  "hemodynamics.flow.valve.AoV": "Aortic valve flow",
  "hemodynamics.flow.valve.TV": "Tricuspid flow",
  "hemodynamics.flow.valve.PV": "Pulmonary valve flow",
  "hemodynamics.flow.systemic.SA_Art": "Systemic tissue flow",
  "hemodynamics.flow.pulmonary.PA_PArt": "Pulmonary arterial flow",
  "hemodynamics.flow.venous.VC_RA": "Systemic venous return",
  "hemodynamics.flow.venous.PVein_LA": "Pulmonary venous return",
  "pericardium.pressure.excess": "Pericardial pressure",
  "pericardium.volume.heart": "Intrapericardial heart volume",
  "pericardium.volume.fluid": "Pericardial fluid volume",
  "pericardium.volume.total-occupied": "Total occupied pericardial volume",
  "pericardium.energy.stored": "Stored pericardial elastic energy",
  "respiration.pressure.pleural": "Pleural pressure",
  "respiration.pressure.alveolar": "Alveolar pressure",
  "rhythm.heart-rate.instantaneous": "Heart rate",
  "coronary.flow.total": "Total coronary flow",
  "coronary.flow.inlet.LAD": "LAD flow",
  "coronary.flow.inlet.LCx": "LCx flow",
  "coronary.flow.inlet.RCA": "RCA flow",
  "coronary.flow.venous-outlet": "Common coronary venous outlet flow",
  ...Object.fromEntries(
    (["LAD", "LCx", "RCA"] as const).flatMap((territory) => [
      [
        `coronary.flow.large-arterial-outflow.${territory}`,
        `${territory} post-lesion arterial outflow`,
      ],
      [
        `coronary.flow.large-arterial-storage-rate.${territory}`,
        `${territory} large-arterial storage rate`,
      ],
      [
        `coronary.pressure.post-focal.${territory}`,
        `${territory} post-focal-lesion pressure`,
      ],
      [
        `coronary.pressure-loss.focal.${territory}`,
        `${territory} focal-lesion pressure loss`,
      ],
      ...(["subepicardial", "subendocardial"] as const).flatMap((layer) => [
        [
          `coronary.flow.layer-r1.${territory}.${layer}`,
          `${territory} ${layer} R1 flow`,
        ],
        [
          `coronary.flow.layer-qm-internal.${territory}.${layer}`,
          `${territory} ${layer} internal Qm flow`,
        ],
        [
          `coronary.flow.layer-r2.${territory}.${layer}`,
          `${territory} ${layer} R2 flow`,
        ],
        [
          `coronary.tone-resistance-scale.${territory}.${layer}`,
          `${territory} ${layer} effective tone resistance scale`,
        ],
      ]),
    ]),
  ),
  "coronary.power.dissipated.total": "Total coronary dissipated power",
  "device.LVAD.flow": "LVAD flow",
  "rhythm.phase.regular-sinus": "Sinus cycle phase",
  "hemodynamics.pressure.mean.Ao": "Mean aortic-root pressure",
  "hemodynamics.pressure.systolic.Ao": "Systolic aortic-root pressure",
  "hemodynamics.pressure.diastolic.Ao": "Diastolic aortic-root pressure",
  "hemodynamics.pressure.pulse.Ao": "Aortic-root pulse pressure",
  "hemodynamics.pressure.mean.SA": "Mean systemic arterial pressure (MAP)",
  "hemodynamics.pressure.systolic.SA":
    "Systemic arterial systolic pressure (SBP)",
  "hemodynamics.pressure.diastolic.SA":
    "Systemic arterial diastolic pressure (DBP)",
  "hemodynamics.pressure.pulse.SA": "Systemic arterial pulse pressure",
  "hemodynamics.pressure.mean.PA": "Mean pulmonary arterial pressure",
  "hemodynamics.pressure.systolic.PA":
    "Pulmonary arterial systolic pressure (sPAP)",
  "hemodynamics.pressure.diastolic.PA":
    "Pulmonary arterial diastolic pressure (dPAP)",
  "hemodynamics.pressure.pulse.PA": "Pulmonary arterial pulse pressure",
  "hemodynamics.pressure.mean.PVein":
    "Mean pulmonary venous pressure (model PVein node)",
  "hemodynamics.pressure.mean.VC": "Mean vena cava pressure",
  "hemodynamics.pressure.mean.LA": "Mean left atrial pressure",
  "hemodynamics.pressure.mean.RA":
    "Central venous pressure (mean right atrial pressure)",
  "hemodynamics.pressure.systolic.LV": "Peak LV systolic pressure",
  "hemodynamics.pressure.systolic.RV": "Peak RV systolic pressure",
  "hemodynamics.pressure-gradient.mean.systemic-circuit":
    "Mean systemic circuit pressure difference (SA − RA)",
  "hemodynamics.pressure-gradient.mean.pulmonary-circuit":
    "Mean pulmonary circuit pressure difference (PA − PVein)",
  "hemodynamics.pressure-gradient.valve.local-hydraulic.AoV":
    "AV local pressure gradient",
  "hemodynamics.pressure-gradient.valve.vena-contracta-bernoulli.AoV":
    "AV vena-contracta Bernoulli gradient",
  "hemodynamics.volume.maximum.LV": "Maximum LV volume",
  "hemodynamics.volume.minimum.LV": "Minimum LV volume",
  "hemodynamics.stroke-volume.LV-extrema": "LV stroke volume (extrema)",
  "hemodynamics.ejection-fraction.LV-extrema": "LV ejection fraction (extrema)",
  "hemodynamics.volume.end-diastolic.LV-at-MV-closure": "LV EDV (MV closure)",
  "hemodynamics.pressure.absolute.end-diastolic.LV-at-MV-closure":
    "LV EDP (MV closure, absolute)",
  "hemodynamics.pressure.transmural.end-diastolic.LV-at-MV-closure":
    "LV EDP (MV closure, transmural)",
  "hemodynamics.volume.end-systolic.LV-at-AoV-closure": "LV ESV (AoV closure)",
  "hemodynamics.pressure.absolute.end-systolic.LV-at-AoV-closure":
    "LV ESP (AoV closure, absolute)",
  "hemodynamics.pressure.transmural.end-systolic.LV-at-AoV-closure":
    "LV ESP (AoV closure, transmural)",
  "hemodynamics.stroke-volume.LV-event-defined":
    "LV stroke volume (valve events)",
  "hemodynamics.ejection-fraction.LV-event-defined":
    "LV ejection fraction (valve events)",
  "hemodynamics.volume.end-diastolic.RV-at-TV-closure": "RV EDV (TV closure)",
  "hemodynamics.pressure.absolute.end-diastolic.RV-at-TV-closure":
    "RV EDP (TV closure, absolute)",
  "hemodynamics.pressure.transmural.end-diastolic.RV-at-TV-closure":
    "RV EDP (TV closure, transmural)",
  "hemodynamics.volume.end-systolic.RV-at-PV-closure": "RV ESV (PV closure)",
  "hemodynamics.pressure.absolute.end-systolic.RV-at-PV-closure":
    "RV ESP (PV closure, absolute)",
  "hemodynamics.pressure.transmural.end-systolic.RV-at-PV-closure":
    "RV ESP (PV closure, transmural)",
  "hemodynamics.stroke-volume.RV-event-defined":
    "RV stroke volume (valve events)",
  "hemodynamics.ejection-fraction.RV-event-defined":
    "RV ejection fraction (valve events)",
  ...Object.fromEntries(
    (["MV", "AoV", "TV", "PV"] as const).flatMap((valve) => [
      [`hemodynamics.valve-volume.forward.${valve}`, `${valve} forward volume`],
      [`hemodynamics.valve-volume.reverse.${valve}`, `${valve} reverse volume`],
      [`hemodynamics.valve-volume.net.${valve}`, `${valve} net volume`],
      [
        `hemodynamics.valve-regurgitant-fraction.same-valve.${valve}`,
        `${valve} same-valve regurgitant fraction`,
      ],
    ]),
  ),
  ...Object.fromEntries(
    (["MV", "AoV", "TV", "PV"] as const).flatMap((valve) => [
      [
        `hemodynamics.pressure-gradient.valve.mean-hydraulic-forward.${valve}`,
        `${valve} mean forward hydraulic pressure difference`,
      ],
      [
        `hemodynamics.pressure-gradient.valve.peak-hydraulic-forward.${valve}`,
        `${valve} peak forward hydraulic pressure difference`,
      ],
    ]),
  ),
  "hemodynamics.valve-volume.net.AoV":
    "Effective LV forward stroke volume (AoV net)",
  "hemodynamics.valve-volume.net.PV":
    "Effective RV forward stroke volume (PV net)",
  "myocardium.work.external.LV-transmural-pressure-volume-path":
    "LV stroke work (SW)",
  "myocardium.work.external.RV-transmural-pressure-volume-path":
    "RV stroke work (SW)",
  "myocardium.work.stroke.LV": "LV stroke work (SW)",
  "myocardium.energy.potential.LV-pressure-volume-area":
    "LV potential energy (PE)",
  "myocardium.energy.pressure-volume-area.LV": "LV pressure–volume area (PVA)",
  "oxygen.consumption.estimated-myocardial.LV-per-beat-per-100g":
    "Estimated LV MVO₂ per beat",
  "oxygen.consumption.estimated-myocardial.LV-per-min-per-100g":
    "Estimated LV MVO₂ per minute",
  "hemodynamics.pressure-rate.maximum-accepted-step.absolute.LV":
    "LV dP/dt max (accepted-step)",
  "hemodynamics.pressure-rate.minimum-accepted-step.absolute.LV":
    "LV dP/dt min (accepted-step)",
  "hemodynamics.pressure-rate.maximum-accepted-step.absolute.RV":
    "RV dP/dt max (accepted-step)",
  "hemodynamics.pressure-rate.minimum-accepted-step.absolute.RV":
    "RV dP/dt min (accepted-step)",
  "hemodynamics.output.native-left":
    "Native left forward-flow output (AoV forward)",
  "hemodynamics.output.native-right":
    "Native right forward-flow output (PV forward)",
  "hemodynamics.output.effective-native-left":
    "Effective native left output (AoV net)",
  "hemodynamics.output.effective-native-right":
    "Effective native right output (PV net)",
  "hemodynamics.return.systemic-venous": "Total systemic venous return",
  "hemodynamics.return.pulmonary-venous": "Pulmonary venous return",
  "hemodynamics.output.systemic-tissue": "Systemic tissue output",
  "hemodynamics.output.pulmonary": "Pulmonary output",
  "hemodynamics.resistance.systemic-effective":
    "Effective systemic vascular resistance",
  "hemodynamics.resistance.pulmonary-effective":
    "Effective pulmonary vascular resistance",
  "hemodynamics.compliance.pulmonary-arterial-effective":
    "Effective pulmonary arterial compliance",
  "coronary.pressure-perfusion.surrogate.Ao-diastolic-minus-LVEDP":
    "Coronary perfusion pressure surrogate (Ao DBP − LVEDP)",
  "oxygen.pressure.alveolar": "Alveolar PO₂",
  "oxygen.pressure.arterial": "Arterial PO₂",
  "oxygen.pressure.gradient.alveolar-arterial": "Alveolar–arterial O₂ gradient",
  "oxygen.saturation.end-capillary": "End-capillary O₂ saturation",
  "oxygen.saturation.arterial": "Arterial O₂ saturation",
  "oxygen.content.end-capillary": "End-capillary O₂ content",
  "oxygen.content.arterial": "Arterial O₂ content",
  "oxygen.content.required-mixed-venous": "Required mixed-venous O₂ content",
  "oxygen.saturation.required-mixed-venous":
    "Required mixed-venous O₂ saturation",
  "oxygen.pressure.required-mixed-venous": "Required mixed-venous PO₂",
  "oxygen.delivery.systemic": "Systemic O₂ delivery",
  "oxygen.consumption.target": "Target O₂ consumption",
  "oxygen.extraction-ratio.required": "Required O₂ extraction ratio",
  "oxygen.delivery-to-consumption-ratio": "O₂ delivery / consumption",
});

/** Stored label of an output pane the Workbench creates; it names the role, not a target. */
export const WORKBENCH_DEFAULT_OUTPUT_PANE_LABEL_V3 = "Outputs";

export function createDefaultExperimentSurfaceV3(
  contract: ModelContractV2,
  initialScenarioId: string = WORKBENCH_SCENARIO_ID_V3,
  options: Readonly<{
    periodicPvaSupported?: boolean;
  }> = Object.freeze({}),
): ExperimentSurfaceV2 {
  const defaultGraphs = Object.freeze([
    Object.freeze({
      graphId: "hemodynamics.pressure-volume",
    }),
    Object.freeze({
      graphId: "hemodynamics.guyton-starling",
      structuralSide: "right" as const,
    }),
    Object.freeze({
      graphId:
        resolveWorkbenchGraphPaneOptionV3(
          contract,
          "hemodynamics.pressure.waveform",
        )?.graphId ?? workbenchGraphIdForPaneKindV3("pressure-waveform"),
      seriesIds: Object.freeze(["AoP", "LVP", "LAP"]),
    }),
  ]);
  const graphPanes = defaultGraphs.flatMap((defaultGraph, index) => {
    const graph = contract.graphCatalog.find(
      (candidate) => candidate.graphId === defaultGraph.graphId,
    );
    return graph === undefined
      ? []
      : [
          createDefaultGraphPaneV3(graph, index, {
            periodicPvaSupported: options.periodicPvaSupported ?? true,
            ...("structuralSide" in defaultGraph
              ? { structuralSide: defaultGraph.structuralSide }
              : {}),
            ...("seriesIds" in defaultGraph
              ? { seriesIds: defaultGraph.seriesIds }
              : {}),
          }),
        ];
  });
  const contractOutputIds = new Set(
    contract.outputCatalog.map(({ outputId }) => outputId),
  );
  const defaultAorticPressureSummaryOutputIds =
    contractOutputIds.has(
          WORKBENCH_PROXIMAL_AORTIC_PRESSURE_SIGNAL_OUTPUT_ID_V3,
        )
      ? WORKBENCH_SYSTEMIC_ARTERIAL_PRESSURE_SUMMARY_OUTPUT_IDS_V3
      : WORKBENCH_LEGACY_AORTIC_PRESSURE_SUMMARY_OUTPUT_IDS_V3;
  const defaultOutputIds = Object.freeze([
    ...defaultAorticPressureSummaryOutputIds,
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
  const defaultOutputs = defaultOutputIds.flatMap((outputId) => {
    const output = contract.outputCatalog.find(
      (candidate) => candidate.outputId === outputId,
    );
    return output === undefined ? [] : [output];
  });
  const outputPane: ExperimentSurfaceOutputPaneV2 = Object.freeze({
    paneId: "outputs-primary",
    role: "output",
    label: WORKBENCH_DEFAULT_OUTPUT_PANE_LABEL_V3,
    order: 0,
    priority: 40,
    binding: Object.freeze({ mode: "active-slot" as const }),
    items: Object.freeze(
      defaultOutputs.map((output, index) =>
        Object.freeze({
          outputId: output.outputId,
          label: outputLabelV3(output.outputId),
          order: index,
        }),
      ),
    ),
  });
  const defaultControlIds = Object.freeze([
    "rhythm.heart-rate-bpm",
    "hemodynamics.total-blood-volume-ml",
    "hemodynamics.systemic-resistance",
    "hemodynamics.pulmonary-resistance",
    "hemodynamics.venous-tone",
    contract.controlCatalog.some(c => c.controlId === "myocardium.lv-contractility")
      ? "myocardium.lv-contractility" : "myocardium.active-tension-scale.LVFW",
    "myocardium.calcium-decay-time-scale.LVFW",
    "myocardium.passive-stiffness-scale.LVFW",
  ]);
  const defaultControls = defaultControlIds.flatMap((controlId) => {
    const control = contract.controlCatalog.find(
      (candidate) => candidate.controlId === controlId,
    );
    return control === undefined ? [] : [control];
  });
  const controlPane: ExperimentSurfaceControlPaneV2 = Object.freeze({
    paneId: "controls-primary",
    role: "control",
    label: "Parameters",
    order: 0,
    priority: 30,
    binding: Object.freeze({ mode: "active-slot" as const }),
    items: Object.freeze(
      defaultControls.map((control, index) =>
        Object.freeze({
          controlId: control.controlId,
          label: controlLabelV3(control.controlId),
          order: index,
          presentation: Object.freeze({ kind: "slider" as const }),
        }),
      ),
    ),
  });
  const surface: ExperimentSurfaceV2 = Object.freeze({
    graphPanes: Object.freeze(graphPanes),
    outputPanes: Object.freeze([outputPane]),
    controlPanes: Object.freeze([controlPane]),
    note: Object.freeze({ text: "" }),
  });
  // Waveforms start with familiar item semantics. One-item panes keep Scenario
  // identity as their primary visual distinction; additional multi-item
  // Scenarios receive perceptually separated solid-line colors.
  return reconcileWorkbenchGraphColorsV3(
    surface,
    Object.freeze([Object.freeze({ scenarioId: initialScenarioId })]),
  );
}

/**
 * Canonicalize PV presentation against the analysis method pinned by the
 * current Model Surface. This prevents a saved analysis-backed pane from
 * retaining hidden formal/envelope claims when reopened on a raw-only pair.
 */
export function reconcileWorkbenchPressureVolumeCapabilityV3(
  surface: ExperimentSurfaceV2,
  contract: ModelContractV2,
  periodicPvaSupported: boolean,
): ExperimentSurfaceV2 {
  if (periodicPvaSupported) return surface;
  let changed = false;
  const graphPanes = surface.graphPanes.map((pane) => {
    const graph = contract.graphCatalog.find(
      ({ graphId }) => graphId === pane.graphId,
    );
    if (
      graph?.renderer !== "pressure-volume" ||
      (pane.pressureVolumeAnalysisMode === "raw-exact-orbit" &&
        pane.showPressureEnvelope === undefined && pane.showPvaBoundary === undefined)
    )
      return pane;
    changed = true;
    const {
      showPressureEnvelope: _showPressureEnvelope,
      showPvaBoundary: _showPvaBoundary,
      ...withoutEnvelope
    } = pane;
    return Object.freeze({
      ...withoutEnvelope,
      pressureVolumeAnalysisMode: "raw-exact-orbit" as const,
    });
  });
  if (!changed) return surface;
  return Object.freeze({
    ...surface,
    graphPanes: Object.freeze(graphPanes),
  });
}

function createDefaultGraphPaneV3(
  graph: GraphDefinitionV2,
  index: number,
  options: Readonly<{
    periodicPvaSupported?: boolean;
    structuralSide?: "left" | "right";
    seriesIds?: readonly string[];
  }> = Object.freeze({}),
): ExperimentSurfaceGraphPaneV2 {
  const structuralSide =
    graph.renderer === "structural-return"
      ? (options.structuralSide ??
        (graph.side === "both" ? "right" : graph.side))
      : undefined;
  const selectedSeriesIds =
    graph.renderer === "structural-return" || graph.renderer === "cycle-waveform"
      ? []
      : (options.seriesIds ?? graph.defaultSeriesIds).filter((seriesId) =>
          graph.seriesCatalog.some((series) => series.seriesId === seriesId),
        );
  return Object.freeze({
    paneId: `graph-${index + 1}`,
    role: "graph",
    label: graphTitleV3(graph.graphId, structuralSide),
    order: index,
    priority: Math.max(50, 100 - index),
    graphId: graph.graphId,
    scenarioScope: Object.freeze({ mode: "visible-scenarios" as const }),
    excludedTraces: Object.freeze([]),
    ...(graph.renderer === "sweep"
      ? { windowSec: WORKBENCH_SWEEP_WINDOW_DEFAULT_SEC_V3 }
      : {
          ...(graph.renderer === "cycle-waveform" ? {} : { historyDepth: WORKBENCH_GRAPH_HISTORY_DEFAULT_DEPTH_V3 }),
          ...(graph.renderer === "pressure-volume"
            ? options.periodicPvaSupported === false
              ? {
                  pressureVolumeAnalysisMode: "raw-exact-orbit" as const,
                }
              : {
                  pressureVolumeAnalysisMode:
                    WORKBENCH_PRESSURE_VOLUME_ANALYSIS_DEFAULT_MODE_V3,
                  showPressureEnvelope:
                    WORKBENCH_PRESSURE_VOLUME_ENVELOPE_DEFAULT_VISIBLE_V3,
                }
            : {}),
          ...(graph.renderer === "structural-return" ? { structuralSide } : {}),
        }),
    traceColors: Object.freeze([]),
    series: Object.freeze(
      graph.renderer === "structural-return" || graph.renderer === "cycle-waveform"
        ? []
        : selectedSeriesIds.map((seriesId, seriesIndex) =>
            Object.freeze({
              seriesId,
              label: graphSeriesLabelV3(seriesId),
              order: seriesIndex,
            }),
          ),
    ),
  });
}

/**
 * Reconciles pane-level Scenario policies after add/delete/restore.
 *
 * Graph panes now always follow the Workbench's visible Scenario set. A legacy
 * fixed graph scope is migrated to per-trace exclusions when at least one of
 * its targets survives, preserving its presentation without retaining a
 * second Scenario-selection concept. Controller and Output bindings remain
 * explicit because those panes act on or report one binding context.
 */
export function reconcileWorkbenchSurfaceScenariosV3(
  surface: ExperimentSurfaceV2,
  scenarios: readonly Readonly<{ scenarioId: string }>[],
): ExperimentSurfaceV2 {
  const scenarioIds = new Set(scenarios.map(({ scenarioId }) => scenarioId));
  const graphPanes = surface.graphPanes.map((pane) => {
    const survivingLegacyFixedScenarioIds =
      pane.scenarioScope.mode === "fixed"
        ? pane.scenarioScope.scenarioIds.filter((scenarioId) =>
            scenarioIds.has(scenarioId),
          )
        : [];
    const selectedSeriesIds = new Set(
      pane.series.map(({ seriesId }) => seriesId),
    );
    const retainedExclusions = pane.excludedTraces.filter(
      (trace) =>
        scenarioIds.has(trace.scenarioId) &&
        (trace.seriesId === null || selectedSeriesIds.has(trace.seriesId)),
    );
    if (
      pane.scenarioScope.mode === "fixed" &&
      survivingLegacyFixedScenarioIds.length > 0
    ) {
      const legacyTargets = new Set(survivingLegacyFixedScenarioIds);
      const seriesIds: readonly (string | null)[] =
        pane.series.length === 0
          ? Object.freeze([null])
          : Object.freeze(pane.series.map(({ seriesId }) => seriesId));
      for (const { scenarioId } of scenarios) {
        if (legacyTargets.has(scenarioId)) continue;
        for (const seriesId of seriesIds) {
          if (
            !retainedExclusions.some(
              (trace) =>
                trace.scenarioId === scenarioId && trace.seriesId === seriesId,
            )
          ) {
            retainedExclusions.push({ scenarioId, seriesId });
          }
        }
      }
    }
    return Object.freeze({
      ...pane,
      scenarioScope: Object.freeze({ mode: "visible-scenarios" as const }),
      excludedTraces: Object.freeze(retainedExclusions),
    });
  });
  const controlPanes = surface.controlPanes.map((pane) => {
    const fixedScenarioIds =
      pane.binding.mode === "fixed"
        ? pane.binding.scenarioIds.filter((scenarioId) =>
            scenarioIds.has(scenarioId),
          )
        : [];
    return Object.freeze({
      ...pane,
      binding:
        pane.binding.mode === "fixed" && fixedScenarioIds.length > 0
          ? Object.freeze({
              mode: "fixed" as const,
              scenarioIds: Object.freeze(fixedScenarioIds),
            })
          : Object.freeze({ mode: "active-slot" as const }),
    });
  });
  const outputPanes = surface.outputPanes.map((pane) => {
    // Re-materialize the durable pane instead of spreading the live UI value.
    // This keeps transient/Fast Refresh fields out of persistence and gives a
    // pre-save Session created before the binding cutover the current default.
    const candidateBinding = (
      pane as ExperimentSurfaceOutputPaneV2 &
        Readonly<{
          binding?: ExperimentSurfaceOutputPaneV2["binding"];
        }>
    ).binding;
    const binding =
      candidateBinding?.mode === "fixed" &&
      scenarioIds.has(candidateBinding.scenarioId)
        ? Object.freeze({
            mode: "fixed" as const,
            scenarioId: candidateBinding.scenarioId,
          })
        : Object.freeze({ mode: "active-slot" as const });
    return Object.freeze({
      paneId: pane.paneId,
      role: "output" as const,
      label: pane.label,
      order: pane.order,
      priority: pane.priority,
      binding,
      items: Object.freeze(
        pane.items.map((item) =>
          Object.freeze({
            outputId: item.outputId,
            label: item.label,
            order: item.order,
          }),
        ),
      ),
    });
  });
  return reconcileWorkbenchGraphColorsV3(
    Object.freeze({ ...surface, graphPanes, outputPanes, controlPanes }),
    scenarios,
  );
}

/** Graph panes compare every Scenario currently visible in Scenario Manager. */
export function resolveWorkbenchGraphScenarioIdsV3(
  _pane: ExperimentSurfaceGraphPaneV2,
  visibleScenarioIds: readonly string[],
): readonly string[] {
  return visibleScenarioIds;
}

/** Exact trace exclusions are durable Pane Settings, not transient legend state. */
export function isWorkbenchGraphTraceExcludedV3(
  pane: ExperimentSurfaceGraphPaneV2,
  scenarioId: string,
  seriesId: string | null,
): boolean {
  return pane.excludedTraces.some(
    (trace) => trace.scenarioId === scenarioId && trace.seriesId === seriesId,
  );
}

/** Resolve one controller pane's single binding context. */
export function resolveWorkbenchControlPaneScenarioIdsV3(
  pane: ExperimentSurfaceControlPaneV2,
  activeScenarioId: string | null,
  scenarios: readonly Readonly<{ scenarioId: string }>[],
): readonly string[] {
  const available = new Set(scenarios.map(({ scenarioId }) => scenarioId));
  if (pane.binding.mode === "active-slot") {
    return activeScenarioId !== null && available.has(activeScenarioId)
      ? Object.freeze([activeScenarioId])
      : Object.freeze([]);
  }
  return Object.freeze(
    pane.binding.scenarioIds.filter((scenarioId) => available.has(scenarioId)),
  );
}

/** Resolve one output pane's single Scenario binding context. */
export function resolveWorkbenchOutputPaneScenarioIdV3(
  pane: ExperimentSurfaceOutputPaneV2,
  activeScenarioId: string | null,
  scenarios: readonly Readonly<{ scenarioId: string }>[],
): string | null {
  const available = new Set(scenarios.map(({ scenarioId }) => scenarioId));
  if (pane.binding.mode === "active-slot") {
    return activeScenarioId !== null && available.has(activeScenarioId)
      ? activeScenarioId
      : null;
  }
  return available.has(pane.binding.scenarioId)
    ? pane.binding.scenarioId
    : null;
}

export function allSurfacePanesV3(
  surface: ExperimentSurfaceV2,
): readonly (
  | ExperimentSurfaceGraphPaneV2
  | ExperimentSurfaceOutputPaneV2
  | ExperimentSurfaceControlPaneV2
)[] {
  return Object.freeze([
    ...surface.graphPanes,
    ...surface.outputPanes,
    ...surface.controlPanes,
  ]);
}

export function graphTitleV3(
  graphId: string,
  structuralSide?: "left" | "right",
): string {
  if (graphId === "hemodynamics.aortic-jet.cycle") return "AV velocity / AT–ET";
  if (
    graphId === "hemodynamics.pressure.waveform" ||
    graphId === "hemodynamics.pressure.waveform.comprehensive-v1"
  )
    return "Pressure waveforms";
  if (
    graphId === "hemodynamics.flow.waveform" ||
    graphId === "hemodynamics.flow.waveform.comprehensive-v1"
  )
    return "Flow waveforms";
  if (graphId === "hemodynamics.guyton-starling") {
    if (structuralSide === "right") return "Systemic Guyton / Starling";
    if (structuralSide === "left") return "Pulmonary Guyton / Starling";
    return "Guyton / Starling";
  }
  if (graphId === "hemodynamics.pressure-volume") return "PV loop";
  return humanizeCatalogIdV3(graphId);
}

export function graphSeriesLabelV3(seriesId: string): string {
  const labels: Readonly<Record<string, string>> = {
    LVP: "LVP",
    LAP: "LAP",
    AoP: "AoP",
    ABP: "ABP",
    SAP: "SAP",
    RAP: "RAP",
    RVP: "RVP",
    PAP: "PAP",
    PVeinP: "Pulmonary vein pressure",
    VCP: "Vena cava pressure",
    Pperi: "Pericardial pressure",
    Ppl: "Pleural pressure",
    Palv: "Alveolar pressure",
    MV: "MV",
    AoV: "AoV",
    TV: "TV",
    PV: "PV",
    LAD: "LAD",
    LCx: "LCx",
    RCA: "RCA",
    Coronary: "Coronary",
    CoronaryVenous: "Common coronary venous outlet",
    LADPostP: "LAD post-lesion pressure",
    LCxPostP: "LCx post-lesion pressure",
    RCAPostP: "RCA post-lesion pressure",
    LADLesionLoss: "LAD focal pressure loss",
    LCxLesionLoss: "LCx focal pressure loss",
    RCALesionLoss: "RCA focal pressure loss",
    ...Object.fromEntries(
      (["LAD", "LCx", "RCA"] as const).flatMap((territory) => [
        [`${territory}ArtOut`, `${territory} post-lesion arterial outflow`],
        [`${territory}ArtStorage`, `${territory} arterial storage rate`],
        [`${territory}R1Epi`, `${territory} subepicardial R1 flow`],
        [`${territory}QmEpi`, `${territory} subepicardial Qm flow`],
        [`${territory}R2Epi`, `${territory} subepicardial R2 flow`],
        [`${territory}R1Endo`, `${territory} subendocardial R1 flow`],
        [`${territory}QmEndo`, `${territory} subendocardial Qm flow`],
        [`${territory}R2Endo`, `${territory} subendocardial R2 flow`],
      ]),
    ),
    LVAD: "LVAD",
    SA_Art: "Systemic tissue flow",
    PA_PArt: "Pulmonary arterial flow",
    VC_RA: "Systemic venous return",
    PVein_LA: "Pulmonary venous return",
    LV: "LV",
    RV: "RV",
    RA: "RA",
    LA: "LA",
  };
  return labels[seriesId] ?? humanizeCatalogIdV3(seriesId);
}

export function outputLabelV3(outputId: string): string {
  return OUTPUT_LABEL_BY_ID_V3[outputId] ?? humanizeCatalogIdV3(outputId);
}

export function controlLabelV3(controlId: string): string {
  const labels: Readonly<Record<string, string>> = {
    "hemodynamics.systemic-resistance": "Systemic resistance",
    "hemodynamics.pulmonary-resistance": "Pulmonary resistance",
    "hemodynamics.venous-tone": "Venous tone",
    "hemodynamics.arterial-stiffness": "Arterial stiffness",
    "rhythm.heart-rate-bpm": "Heart rate",
    "hemodynamics.total-blood-volume-ml": "Total blood volume",
    "ventilation.peep-cm-h2o": "PEEP",
    "myocardium.contractility": "Common ventricular active tension",
    ...Object.fromEntries(
      (["LA", "LVFW", "SEP", "RVFW", "RA"] as const).flatMap((wall) => [
        [`myocardium.active-tension-scale.${wall}`, `${wall} active tension`],
        [
          `myocardium.passive-stiffness-scale.${wall}`,
          `${wall} passive stiffness`,
        ],
        [
          `myocardium.calcium-decay-time-scale.${wall}`,
          `${wall} calcium decay time`,
        ],
      ]),
    ),
    ...Object.fromEntries(
      (["MV", "AoV", "TV", "PV"] as const).flatMap((valve) => [
        [
          `valve.maximum-forward-eoa-cm2.${valve}`,
          `${valve} maximum forward EOA`,
        ],
        [
          `valve.closed-reverse-eroa-cm2.${valve}`,
          `${valve} closed reverse EROA`,
        ],
      ]),
    ),
    "oxygen.hemoglobin-g-per-dl": "Hemoglobin",
    "oxygen.inspired-oxygen-fraction": "Inspired O₂ fraction",
    "oxygen.arterial-carbon-dioxide-pressure-mm-hg": "Arterial PCO₂",
    "oxygen.respiratory-exchange-ratio": "Respiratory exchange ratio",
    "oxygen.barometric-pressure-mm-hg": "Barometric pressure",
    "oxygen.true-shunt-fraction": "True shunt fraction",
    "oxygen.target-consumption-ml-per-min": "Target O₂ consumption",
    "pericardium.reference-capacity-scale": "Pericardial reference capacity",
    "pericardium.pressure-scale": "Pericardial pressure scale",
    "pericardium.exponential-stiffness-scale":
      "Pericardial exponential stiffness",
    "pericardium.prescribed-fluid-volume-ml": "Pericardial fluid volume",
    ...Object.fromEntries(
      (["LAD", "LCx", "RCA"] as const).flatMap((territory) => [
        [
          `coronary.focal-diameter-loss-fraction.${territory}`,
          `${territory} focal diameter loss`,
        ],
        ...(["subepicardial", "subendocardial"] as const).flatMap((layer) => [
          [
            `coronary.structural-r1-resistance-scale.${territory}.${layer}`,
            `${territory} ${layer} structural R1 resistance`,
          ],
          [
            `coronary.structural-rm-resistance-scale.${territory}.${layer}`,
            `${territory} ${layer} structural Rm resistance`,
          ],
        ]),
      ]),
    ),
  };
  return labels[controlId] ?? humanizeCatalogIdV3(controlId);
}

export function outputColorV3(outputId: string): string {
  if (OUTPUT_COLOR_BY_ID_V3[outputId] !== undefined) {
    return OUTPUT_COLOR_BY_ID_V3[outputId]!;
  }
  // All fallback colors keep at least 3:1 contrast against both application
  // canvases. The authored Surface stores the chosen hex, so a later theme
  // switch never remaps or overrides a user's custom color.
  const palette = [
    "#167db8",
    "#c43f7c",
    "#6a61b6",
    "#247d59",
    "#a96c08",
    "#c43f55",
  ];
  let hash = 0;
  for (let index = 0; index < outputId.length; index += 1) {
    hash = ((hash << 5) - hash + outputId.charCodeAt(index)) | 0;
  }
  return palette[Math.abs(hash) % palette.length]!;
}

function humanizeCatalogIdV3(value: string): string {
  const token = value.split(".").at(-1) ?? value;
  return token
    .replaceAll("-", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

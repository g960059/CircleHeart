import { CARDIORESPIRATORY_BREATH_OUTPUT_IDS_V1 as breath } from "@/analysis/methods/cardiorespiratory/CardiorespiratoryBreathMetricsV1";
import type { ModelContractV2 } from "@/studio/contracts/v2/model";
import type { ExperimentSurfaceV2, ExperimentSurfaceGraphPaneV2, ExperimentSurfaceControlPaneV2, ExperimentSurfaceOutputPaneV2 } from "@/studio/contracts/v2/content";
import { createDefaultExperimentSurfaceV3 } from "./WorkbenchSurfaceV3";
import { CARDIORESPIRATORY_OUTPUT_IDS_V1 as ids } from "@/studio/integrations/cardiorespiratoryV1/CardiorespiratoryCatalogV1";
import { CARDIORESPIRATORY_VARIATION_OUTPUT_IDS_V1 as variation } from "@/analysis/methods/cardiorespiratory/CardiorespiratoryVariationV1";
import { resolveStudioItemPresentationV1 } from "@/studio/presentation/StudioItemPresentationCatalogV1";

export function cardiorespiratoryDevLimitationsV1(locale: string): readonly string[] {
  return locale.startsWith("ja") ? [
    "心肺連成モデルの開発版です。定量的な臨床妥当性は未検証です。",
    "初期状態は周期的定常状態ではありません。開始直後には血行動態・血液ガスの過渡応答が生じます。",
    "2つの機能的肺領域、固定容量・完全混合の気道死腔、簡略化した血液ガス化学を用います。EtCO₂・呼吸中枢・虚血による収縮性低下は扱いません。",
    "既存の oxygen.* 項目とコントローラは独立した定常Fick推定です。動的ガス状態は cardiorespiratory.* の項目で確認してください。PEEPの新旧コントローラは同期します。",
    "酸素運搬波形は瞬時大動脈酸素流束です。心筋酸素需要は設定値であり、PVA推定からのフィードバックではありません。",
    "呼吸中の周期的PVA・静的前負荷解析は未対応です。PPV/SVVは連続する完全な受動的調節呼吸3回を要し、輸液反応性の判定には用いません。",
  ] : [
    "Development cardiorespiratory model; quantitative clinical validity has not been established.",
    "The initial state is not periodic steady state. Early hemodynamic and blood gas transients are expected.",
    "Two functional lung units, a fixed mixed conducting deadspace, and reduced blood gas chemistry. No distributed anatomical dead space, EtCO₂, respiratory controller, or ischemic contractility feedback.",
    "Inherited oxygen.* outputs and controls remain an independent steady Fick estimate. Dynamic gas state uses cardiorespiratory.* outputs. Both PEEP controls are synchronized.",
    "Oxygen delivery waveform is instantaneous aortic oxygen flux. Myocardial oxygen demand is prescribed and does not receive feedback from PVA estimates.",
    "Periodic PVA and static preload analysis are unavailable under breathing. PPV/SVV require three complete passive controlled breaths and do not classify fluid responsiveness.",
  ];
}
export function createCardiorespiratoryDefaultSurfaceV1(contract: ModelContractV2, scenarioId: string, locale = "ja"): ExperimentSurfaceV2 {
  const ja = locale.startsWith("ja"), base = createDefaultExperimentSurfaceV3(contract, scenarioId, { periodicPvaSupported: false });
  const label = (kind: "control" | "output", itemId: string) => resolveStudioItemPresentationV1({ kind, itemId, locale, fallbackEnglishLabel: itemId }).label;
  const graphs: readonly [string, string, string][] = [
    ["pressures", "Respiratory pressures", "呼吸圧"], ["lung-pressure-volume", "Lung pressure–volume", "呼吸圧・肺気量ループ"],
    ["flow-volume", "Flow–volume", "フローボリュームループ"], ["blood-gas-pressures", "Blood gas pressures", "血液ガス分圧"],
    ["oxygen-supply-demand", "Oxygen flux and demand", "酸素流束と需要"],
  ];
  const graphPanes: ExperimentSurfaceGraphPaneV2[] = graphs.map(([id, en, jp], index) => {
    const graph = contract.graphCatalog.find(g => g.graphId === `cardiorespiratory.${id}`)!;
    if (graph.renderer !== "sweep" && graph.renderer !== "xy") throw new Error("Invalid default respiratory graph");
    return { paneId: `respiratory-graph-${index}`, role: "graph", label: ja ? jp : en, order: index + 1, priority: 95 - index,
      graphId: graph.graphId, scenarioScope: { mode: "visible-scenarios" }, excludedTraces: [], traceColors: [],
      ...(graph.renderer === "sweep" ? { windowSec: 10 } : {}), series: graph.defaultSeriesIds.map((seriesId, order) => ({ seriesId, label: seriesId, order })) };
  });
  const hemoGraph = base.graphPanes.find(p => contract.graphCatalog.find(g => g.graphId === p.graphId)?.renderer === "sweep");
  const outputPane: ExperimentSurfaceOutputPaneV2 = { paneId: "respiratory-outputs", role: "output", label: ja ? "ガス交換・呼吸性変動" : "Gas exchange and respiratory variation", order: 1, priority: 70,
    binding: { mode: "active-slot" }, items: [breath.oxygenDelivery, breath.oxygenConsumption, breath.cardiacOutput, breath.inspiredTidalVolume, breath.minuteVentilation, ids.arterialO2, ids.arterialCo2, ids.arterialSaturation, ids.venousSaturation, ids.arterialPh, ids.oxygenDemand, ids.oxygenConsumption, ids.demandMetFraction, variation.ppv, variation.svv].map((outputId, order) => ({ outputId, order, label: label("output", outputId) })) };
  const controls = (paneId: string, title: string, suffixes: string[], order: number): ExperimentSurfaceControlPaneV2 => ({ paneId, role: "control", label: title, order, priority: 80 - order,
    binding: { mode: "active-slot" }, items: suffixes.map((suffix, i) => {
      const controlId = `cardiorespiratory.${suffix}`;
      const choices = suffix === "ventilator.mode" ? [[0, ja ? "自発" : "Spontaneous"], [1, "PCV"], [2, "VCV"]] : suffix.endsWith("recruitment-preset") ? [[0, ja ? "開通" : "Open"], [1, "10/3"], [2, "15/5"]] : null;
      return { controlId, label: label("control", controlId), order: i, presentation: choices ? { kind: "buttons" as const, options: choices.map(([value, title]) => ({ value: value as number, label: title as string })) } : { kind: "slider" as const } };
    }) });
  return { ...base, graphPanes: [...(hemoGraph ? [{ ...hemoGraph, order: 0 }] : []), ...graphPanes],
    outputPanes: [...base.outputPanes.map(p => ({ ...p, items: p.items.map(i => i.outputId.startsWith("oxygen.") ? { ...i, label: `${ja ? "定常推定" : "Steady estimate"} · ${i.label}` } : i) })), outputPane],
    controlPanes: [...base.controlPanes.map(p => ({ ...p, items: p.items.map(i => i.controlId.startsWith("oxygen.") ? { ...i, label: `${ja ? "定常Fick推定のみ" : "Steady Fick only"} · ${i.label}` } : i) })), controls("respiratory-controls", ja ? "人工呼吸・自発努力" : "Ventilation and effort", ["ventilator.mode", "ventilator.rate", "ventilator.peep", "ventilator.inspiratory-time", "ventilator.pressure-control", "ventilator.tidal-volume", "ventilator.pressure-limit", "gas.inspired-o2", "airway.deadspace", "muscle.pressure"], 1),
      controls("lung-gas-controls", ja ? "肺領域・酸素需要" : "Lung units and oxygen demand", ["lung.1.elastance", "lung.2.elastance", "lung.1.recruitment-preset", "lung.2.recruitment-preset", "lung.1.equilibration", "lung.2.equilibration", "gas.hemoglobin", "oxygen.systemic-demand", "oxygen.myocardial-demand", "gas.respiratory-quotient"], 2)],
    note: { text: cardiorespiratoryDevLimitationsV1(locale).join("\n\n") } };
}

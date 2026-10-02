import { CARDIORESPIRATORY_BREATH_OUTPUT_IDS_V1 as breathIds } from "@/analysis/methods/cardiorespiratory/CardiorespiratoryBreathMetricsV1";
import { CARDIORESPIRATORY_OUTPUT_IDS_V1 as ids } from "./CardiorespiratoryCatalogV1";
import type { StudioItemPresentationCategoryV1 } from "@/studio/presentation/StudioItemPresentationCatalogV1";
type Entry = Readonly<{ category: StudioItemPresentationCategoryV1; label: Readonly<{ en: string; ja: string }>; description: Readonly<{ en: string; ja: string }>; inlineDisclosure?: true; aliases?: readonly string[]; historicalDefaultLabels?: readonly string[] }>;
const entry = (en: string, ja: string, category: StudioItemPresentationCategoryV1 = "ventilation", descriptionEn = "", descriptionJa = ""): Entry => ({ category, label: { en, ja }, description: { en: descriptionEn, ja: descriptionJa } });
const signalLabels: Readonly<Partial<Record<keyof typeof ids, readonly [string, string]>>> = {
  phase: ["Respiratory phase", "呼吸位相"], breathIndex: ["Ventilator cycle index", "人工呼吸器サイクル回数"],
  airwayPressure: ["Airway pressure (Paw)", "気道内圧 (Paw)"], pleuralPressure: ["Pleural pressure (Ppl)", "胸腔内圧 (Ppl)"], musclePressure: ["Respiratory muscle pressure", "呼吸筋圧"],
  alveolarPressure1: ["Alveolar pressure · unit 1", "肺胞内圧・領域1"], alveolarPressure2: ["Alveolar pressure · unit 2", "肺胞内圧・領域2"],
  transpulmonaryPressure1: ["Transpulmonary pressure · unit 1", "経肺圧・領域1"], transpulmonaryPressure2: ["Transpulmonary pressure · unit 2", "経肺圧・領域2"],
  lungVolume: ["Lung volume", "肺気量"], unitVolume1: ["Lung volume · unit 1", "肺気量・領域1"], unitVolume2: ["Lung volume · unit 2", "肺気量・領域2"],
  airwayFlow: ["Airway flow", "気道流量"], unitFlow1: ["Airway flow · unit 1", "気道流量・領域1"], unitFlow2: ["Airway flow · unit 2", "気道流量・領域2"],
  alveolarO21: ["Alveolar PO₂ · unit 1", "肺胞酸素分圧・領域1"], alveolarO22: ["Alveolar PO₂ · unit 2", "肺胞酸素分圧・領域2"], alveolarCo21: ["Alveolar PCO₂ · unit 1", "肺胞二酸化炭素分圧・領域1"], alveolarCo22: ["Alveolar PCO₂ · unit 2", "肺胞二酸化炭素分圧・領域2"],
  arterialO2: ["Arterial PO₂", "動脈血酸素分圧"], arterialCo2: ["Arterial PCO₂", "動脈血二酸化炭素分圧"], venousO2: ["Mixed venous PO₂", "混合静脈血酸素分圧"], venousCo2: ["Mixed venous PCO₂", "混合静脈血二酸化炭素分圧"],
  arterialSaturation: ["Dynamic SaO₂", "動脈血酸素飽和度・動的モデル"], venousSaturation: ["Dynamic SvO₂", "混合静脈血酸素飽和度・動的モデル"], arterialPh: ["Arterial pH", "動脈血pH"], venousPh: ["Mixed venous pH", "混合静脈血pH"],
  oxygenDelivery: ["Instantaneous aortic oxygen flux", "瞬時大動脈酸素流束"], oxygenDemand: ["Total oxygen demand", "総酸素需要量"], oxygenConsumption: ["Actual oxygen consumption", "実酸素消費量"], demandMetFraction: ["Oxygen demand met", "酸素需要充足率"], myocardialDemand: ["Myocardial oxygen demand", "心筋酸素需要量"], myocardialConsumption: ["Myocardial oxygen consumption", "心筋酸素消費量"],
  pulmonaryFlow1: ["Pulmonary perfusion · unit 1", "肺血流・領域1"], pulmonaryFlow2: ["Pulmonary perfusion · unit 2", "肺血流・領域2"],
  recruitmentOpen1: ["Lung open · unit 1", "肺開通状態・領域1"], recruitmentOpen2: ["Lung open · unit 2", "肺開通状態・領域2"],
  systemicTissueO2: ["Systemic tissue PO₂", "全身組織酸素分圧"], myocardialTissueO2: ["Myocardial tissue PO₂", "心筋組織酸素分圧"],
  totalO2Store: ["Total oxygen inventory", "総酸素貯蔵量"], totalCo2Store: ["Total carbon dioxide inventory", "総二酸化炭素貯蔵量"], oxygenBalanceResidual: ["Oxygen balance residual", "酸素保存残差"], co2BalanceResidual: ["Carbon dioxide balance residual", "二酸化炭素保存残差"],
  arterialContent: ["Arterial oxygen content", "動脈血酸素含量"], venousContent: ["Mixed venous oxygen content", "混合静脈血酸素含量"],
  pressureLimited: ["Pressure limit active", "気道圧上限作動"], controlledVentilation: ["Controlled ventilation", "調節換気"], muscleActive: ["Spontaneous effort active", "自発呼吸努力あり"],
};
const outputs: Record<string, Entry> = Object.fromEntries(Object.entries(signalLabels).map(([key, pair]) => [ids[key as keyof typeof ids], entry(pair[0], pair[1], ids[key as keyof typeof ids].includes(".gas.") || ids[key as keyof typeof ids].includes(".oxygen.") ? "oxygen" : "ventilation")]));
const controls: Record<string, Entry> = Object.fromEntries([
  ["ventilator.mode", "Ventilation mode", "換気モード"], ["ventilator.rate", "Ventilator rate", "人工呼吸回数"], ["ventilator.inspiratory-time", "Inspiratory time", "吸気時間"], ["ventilator.peep", "PEEP", "PEEP"], ["ventilator.pressure-control", "Pressure above PEEP", "PEEP上の吸気圧"], ["ventilator.tidal-volume", "Target tidal volume", "目標一回換気量"], ["ventilator.pressure-limit", "Airway pressure limit", "気道圧上限"], ["ventilator.inspiratory-hold", "Inspiratory hold", "吸気ホールド時間"], ["muscle.pressure", "Inspiratory muscle amplitude", "吸気筋圧振幅"], ["muscle.rate", "Spontaneous respiratory rate", "自発呼吸回数"], ["chest-wall.elastance", "Chest wall elastance", "胸壁エラスタンス"], ["lung.1.elastance", "Lung elastance · unit 1", "肺エラスタンス・領域1"], ["lung.2.elastance", "Lung elastance · unit 2", "肺エラスタンス・領域2"], ["lung.1.resistance", "Airway resistance · unit 1", "気道抵抗・領域1"], ["lung.2.resistance", "Airway resistance · unit 2", "気道抵抗・領域2"], ["gas.inspired-o2", "Inspired oxygen fraction", "吸入酸素濃度"], ["gas.hemoglobin", "Hemoglobin", "ヘモグロビン"], ["oxygen.systemic-demand", "Systemic oxygen demand", "全身組織酸素需要量"], ["oxygen.myocardial-demand", "Myocardial oxygen demand", "心筋酸素需要量"],
].map(([id, en, ja]) => [`cardiorespiratory.${id}`, entry(en!, ja!, id!.startsWith("gas.") || id!.startsWith("oxygen.") ? "oxygen" : "ventilation")]));
for (const n of [1, 2]) {
  controls[`cardiorespiratory.lung.${n}.overdistension`] = entry(`Overdistension recoil · unit ${n}`, `過膨張時反跳圧・領域${n}`);
  controls[`cardiorespiratory.lung.${n}.perfusion-resistance`] = entry(`Reference perfusion resistance · unit ${n}`, `基準肺血管抵抗・領域${n}`);
  controls[`cardiorespiratory.lung.${n}.equilibration`] = entry(`Gas equilibration fraction · unit ${n}`, `ガス平衡化率・領域${n}`, "oxygen", "0 routes perfusion through without alveolar exchange; 1 permits full equilibration subject to available gas.", "0では肺胞交換を行わず灌流し、1ではガス在庫の制約下で平衡化する。");
  controls[`cardiorespiratory.lung.${n}.recruitment-preset`] = entry(`Airway opening thresholds · unit ${n}`, `開通・閉鎖閾値・領域${n}`, "ventilation", "0: always open; 1: opening/closing at transpulmonary 10/3 cmH2O; 2: 15/5 cmH2O. A threshold must persist for 0.3 seconds.", "0: 常時開通、1: 経肺圧10/3 cmH2Oで開通/閉鎖、2: 15/5 cmH2O。閾値を0.3秒間満たすと切り替わる。");
}
controls["cardiorespiratory.airway.deadspace"] = entry("Effective conducting deadspace", "有効気道死腔", "ventilation", "Fixed reference capacity, perfectly mixed. Airway-pressure compression and EtCO₂ are not modeled.", "固定基準容量・完全混合。気道圧による圧縮とEtCO₂は扱いません。");
controls["cardiorespiratory.lung.volume-resistance-gain"] = entry("Lung volume–vascular resistance gain", "肺気量による肺血管抵抗変化係数");
controls["cardiorespiratory.gas.respiratory-quotient"] = entry("Metabolic respiratory quotient", "代謝呼吸商", "oxygen");
controls["cardiorespiratory.ventilator.mode"] = entry("Ventilation mode", "換気モード", "ventilation", "0: spontaneous; 1: pressure controlled; 2: volume controlled. In spontaneous mode, zero muscle pressure means no breathing effort; increase the muscle amplitude to prescribe effort.", "0: 自発呼吸、1: 従圧式、2: 従量式。自発モードでは筋圧振幅0は無呼吸努力です。呼吸筋圧を増やすと自発努力が加わります。");
for (const [id, en, ja] of [["pulse-pressure", "Respiratory PPV", "呼吸性脈圧変動 (PPV)"], ["stroke-volume", "Respiratory SVV", "呼吸性一回拍出量変動 (SVV)"]]) outputs[`cardiorespiratory.variation.${id}`] = entry(en!, ja!, "hemodynamics", "Mean variation over three complete continuous controlled breaths. Unavailable with spontaneous effort, irregular beats, insufficient beats, or interrupted observations; not a fluid responsiveness classification.", "連続する完全な調節呼吸3回での変動率。自発努力、不整脈、拍数不足、観測中断では算出不可。輸液反応性の判定ではありません。");
for (const [key, en, ja] of [
  ["inspiredTidalVolume", "Inspired tidal volume · complete breath", "実吸気一回換気量・1呼吸"],
  ["expiredTidalVolume", "Expired tidal volume · complete breath", "実呼気一回換気量・1呼吸"],
  ["minuteVentilation", "Expired minute ventilation · complete breath", "呼出分時換気量・1呼吸"],
  ["cardiacOutput", "Mean cardiac output · complete breath", "平均心拍出量・1呼吸"],
  ["oxygenDelivery", "Mean oxygen delivery · complete breath", "平均酸素供給量・1呼吸"],
  ["oxygenConsumption", "Mean actual oxygen consumption · complete breath", "平均実酸素消費量・1呼吸"],
  ["consumptionDeliveryRatio", "Consumption / delivery · complete breath", "酸素消費／供給比・1呼吸"],
] as const) outputs[breathIds[key]] = entry(en, ja, key.includes("Volume") || key === "minuteVentilation" ? "ventilation" : "oxygen",
  "Last complete continuously observed controlled breath. Gas storage can change; consumption/delivery is not a steady Fick extraction fraction.",
  "連続観測できた直近の完全な調節呼吸1回の値。ガス貯蔵量は変化しうるため、消費／供給比を定常Fick酸素摂取率と同一視しません。");
export function cardiorespiratoryItemPresentationV1(kind: "control" | "output", id: string): Entry | undefined { return (kind === "control" ? controls : outputs)[id]; }

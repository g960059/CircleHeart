/**
 * Localized presentation metadata for model controls and outputs.
 *
 * Numerical contracts own identity, units, ranges, and sampling semantics.
 * This catalog owns human-facing copy and browsing taxonomy so changing a
 * Japanese label never changes model identity.
 */

import { cardiorespiratoryItemPresentationV1 } from "@/studio/integrations/cardiorespiratoryV1/CardiorespiratoryPresentationV1";
import type { ControlDefinitionV2 } from "@/studio/contracts/v2/model";

export type StudioItemPresentationLocaleV1 = "en" | "ja";

export type StudioItemPresentationCategoryV1 =
  | "hemodynamics"
  | "myocardium"
  | "valves"
  | "coronary"
  | "oxygen"
  | "pericardium"
  | "rhythm"
  | "ventilation"
  | "mechanicalSupport"
  | "advanced";

/** Stable browsing order, independent of numerical contract registration order. */
export const STUDIO_ITEM_PRESENTATION_CATEGORY_ORDER_V1 = Object.freeze([
  "hemodynamics", "valves", "myocardium", "rhythm", "coronary",
  "ventilation", "oxygen", "pericardium", "mechanicalSupport", "advanced",
] as const satisfies readonly StudioItemPresentationCategoryV1[]);

export type ResolvedStudioItemPresentationV1 = Readonly<{
  itemId: string;
  kind: "control" | "output";
  category: StudioItemPresentationCategoryV1;
  /** Localized canonical label. */
  label: string;
  /** English canonical label used to recognize legacy default labels. */
  canonicalEnglishLabel: string;
  /** Compact dictionary-style copy for hover, focus, and touch disclosure. */
  description: string;
  /** Show the compact copy beside live clinical labels, not only in pickers. */
  inlineDisclosure: boolean;
  /** Search-only vocabulary. Never render this list as user-facing copy. */
  aliases: readonly string[];
  /** Both locales and all hidden aliases, normalized lazily by search. */
  searchTerms: readonly string[];
}>;

export type StudioItemPresentationCatalogFactsV1 = Readonly<{
  controlChangeSemantics?: ControlDefinitionV2["changeSemantics"];
  outputKind?: string;
}>;

type LocalizedTextV1 = Readonly<{ en: string; ja: string }>;

type StudioItemPresentationDraftV1 = Readonly<{
  category: StudioItemPresentationCategoryV1;
  label?: LocalizedTextV1;
  description?: LocalizedTextV1;
  inlineDisclosure?: true;
  aliases?: readonly string[];
  /** Historical generated labels that must remain auto-localizable. */
  historicalDefaultLabels?: readonly string[];
}>;

const textV1 = (en: string, ja: string): LocalizedTextV1 =>
  Object.freeze({ en, ja });

const CONTROL_PRESENTATION_V1: Readonly<
  Record<string, StudioItemPresentationDraftV1>
> = Object.freeze({
  "rhythm.heart-rate-bpm": {
    category: "rhythm",
    label: textV1("HR", "HR"),
    description: textV1("Heart rate: the number of heartbeats per minute.", "心拍数。1分間あたりの心拍の頻度。"),
    historicalDefaultLabels: ["Heart rate (HR)", "心拍数 (HR)"],
    aliases: ["HR", "heart rate", "心拍", "心拍数", "脈拍"],
  },
  "hemodynamics.total-blood-volume-ml": {
    category: "hemodynamics",
    label: textV1("Blood volume", "総血液量"),
    description: textV1(
      "Total blood volume (TBV): the amount of blood in the entire circulation.",
      "総血液量（TBV）。心臓と体循環・肺循環を合わせた、循環系全体の血液量。",
    ),
    historicalDefaultLabels: ["Total blood volume (TBV)", "総血液量 (TBV)"],
    aliases: ["TBV", "blood volume", "循環血液量", "総血液量"],
  },
  "hemodynamics.systemic-resistance": {
    category: "hemodynamics",
    label: textV1("SVR", "SVR"),
    description: textV1(
      "Systemic vascular resistance. Adjusts resistance to blood flow through the body as a multiplier of the reference setting.",
      "体血管抵抗。体循環で血液の流れを妨げる抵抗を、基準に対する倍率で調整する。",
    ),
    historicalDefaultLabels: ["Systemic vascular resistance (SVR)", "体血管抵抗 (SVR)"],
    aliases: ["SVR", "systemic resistance", "体血管抵抗", "後負荷"],
  },
  "hemodynamics.pulmonary-resistance": {
    category: "hemodynamics",
    label: textV1("PVR", "PVR"),
    description: textV1(
      "Pulmonary vascular resistance. Adjusts resistance to blood flow through the lungs as a multiplier of the reference setting.",
      "肺血管抵抗。肺循環で血液の流れを妨げる抵抗を、基準に対する倍率で調整する。",
    ),
    historicalDefaultLabels: ["Pulmonary vascular resistance (PVR)", "肺血管抵抗 (PVR)"],
    aliases: ["PVR", "pulmonary resistance", "肺血管抵抗", "右室後負荷"],
  },
  "hemodynamics.venous-tone": {
    category: "hemodynamics",
    label: textV1("Venous tone", "静脈収縮"),
    historicalDefaultLabels: ["静脈トーン"],
    description: textV1(
      "Venous constriction. Increasing this setting shifts blood into the volume that generates venous pressure, supporting venous return.",
      "静脈の収縮の強さ。大きくすると、静脈内の血液のうち圧を生み出す部分が増え、静脈還流を促す。",
    ),
    aliases: ["venous tone", "venoconstriction", "静脈収縮", "静脈還流"],
  },
  "hemodynamics.arterial-stiffness": {
    category: "hemodynamics",
    label: textV1("Arterial stiffness", "動脈の硬さ"),
    historicalDefaultLabels: ["動脈スティフネス"],
    description: textV1(
      "Systemic arterial stiffness relative to the reference setting. Larger values make the arteries less distensible.",
      "体動脈の硬さを基準に対する倍率で調整する。大きいほど動脈が広がりにくくなる。",
    ),
    aliases: ["arterial stiffness", "動脈硬化", "arterial compliance"],
  },
  "myocardium.contractility": {
    category: "myocardium",
    label: textV1("Biventricular contractility", "両心室収縮性"),
    description: textV1(
      "Contractile strength of both ventricles. Scales the active tension generated by the left and right ventricular free walls and the ventricular septum together.",
      "左右心室の収縮の強さ。左室・右室の自由壁と心室中隔が生み出す能動張力を、共通の倍率で調整する。",
    ),
    historicalDefaultLabels: ["Common ventricular active tension", "共通心室能動張力"],
    aliases: ["contractility", "inotropy", "収縮性", "心収縮力"],
  },
  "myocardium.lv-contractility": {
    category: "myocardium",
    label: textV1("LV contractility", "LV 収縮性"),
    description: textV1(
      "Left ventricular contractile strength. Scales the active tension of the LV free wall and ventricular septum together. Ventricular interaction can also affect right ventricular function.",
      "左室の収縮の強さ。左室自由壁と心室中隔が生み出す能動張力を、共通の倍率で調整する。心室間の相互作用を通じて右室機能にも影響する。",
    ),
    historicalDefaultLabels: ["LV収縮性", "左室収縮性"],
    aliases: ["LV", "left ventricular contractility", "左室収縮性", "左室収縮力"],
  },
  "ventilation.peep-cm-h2o": {
    category: "ventilation",
    label: textV1("PEEP", "PEEP"),
    description: textV1(
      "Positive end-expiratory pressure. The airway pressure maintained at the end of expiration, influencing pressures around the heart and pulmonary vessels.",
      "呼気終末陽圧。呼気の終わりに保つ気道内の陽圧で、心臓や肺血管の周囲圧に影響する。",
    ),
    aliases: ["PEEP", "positive end expiratory pressure", "呼気終末陽圧"],
  },
});

const OUTPUT_PRESENTATION_V1: Readonly<
  Record<string, StudioItemPresentationDraftV1>
> = Object.freeze({
  "presentation.pressure-summary.Ao": {
    category: "hemodynamics",
    label: textV1("AoP", "AoP"),
    description: textV1(
      "Aortic pressure: maximum/minimum aortic-root pressure during one heartbeat.",
      "大動脈圧。1心拍における大動脈基部圧の最大値／最小値。",
    ),
    aliases: [
      "AoP",
      "central blood pressure",
      "central SBP",
      "central DBP",
      "central MAP",
      "大動脈圧",
      "中心血圧",
    ],
    historicalDefaultLabels: ["Aortic pressure (AoP)","大動脈圧 (AoP)"],
  },
  "presentation.pressure-summary.SA": {
    category: "hemodynamics",
    label: textV1("ABP", "ABP"),
    description: textV1(
      "Arterial blood pressure: maximum/minimum pressure in the systemic arterial compartment during one heartbeat.",
      "体動脈圧。1心拍における体動脈全体を代表する圧の最大値／最小値。",
    ),
    aliases: [
      "ABP",
      "SBP",
      "DBP",
      "MAP",
      "blood pressure",
      "arterial pressure",
      "血圧",
      "体動脈圧",
    ],
    historicalDefaultLabels: ["Arterial blood pressure (ABP)","体動脈圧 (ABP)"],
  },
  "presentation.pressure-summary.PA": {
    category: "hemodynamics",
    label: textV1("PAP", "PAP"),
    description: textV1(
      "Pulmonary artery pressure: maximum/minimum during one heartbeat.",
      "肺動脈圧。1心拍における最大値／最小値。",
    ),
    aliases: ["PAP", "sPAP", "dPAP", "mPAP", "肺動脈圧"],
    historicalDefaultLabels: ["Pulmonary artery pressure (PAP)","肺動脈圧 (PAP)"],
  },
  "rhythm.heart-rate.instantaneous": {
    category: "rhythm",
    label: textV1("HR", "HR"),
    description: textV1(
      "Heart rate: the number of heartbeats per minute.",
      "心拍数。1分間あたりの心拍の頻度。",
    ),
    aliases: ["HR", "heart rate", "心拍", "脈拍"],
    historicalDefaultLabels: ["Heart rate (HR)","心拍数 (HR)"],
  },
  "hemodynamics.pressure.absolute.Ao": {
    category: "hemodynamics",
    label: textV1("AoP", "AoP"),
    description: textV1(
      "Aortic pressure at the model's aortic-root compartment, immediately beyond the aortic valve.",
      "大動脈圧。大動脈弁直後の大動脈基部を代表する圧。",
    ),
    aliases: [
      "AoP",
      "aortic pressure",
      "aortic root pressure",
      "Ao node",
      "大動脈圧",
      "大動脈基部圧",
    ],
    historicalDefaultLabels: ["Aortic pressure (AoP)","大動脈圧 (AoP)"],
  },
  "hemodynamics.pressure.absolute.aortic-proximal-constitutive-port": {
    category: "hemodynamics",
    label: textV1("AoP (proximal)", "AoP（近位）"),
    description: textV1(
      "Proximal aortic pressure, including local pressure recovery as flow expands into the ascending aorta.",
      "近位大動脈圧。大動脈弁を通過した血流が上行大動脈へ広がる際の、局所的な圧回復を反映した値。",
    ),
    aliases: [
      "AoP",
      "aortic pressure",
      "proximal aortic pressure",
      "aortic port pressure",
      "Pprox",
      "大動脈圧",
      "近位大動脈圧",
    ],
    historicalDefaultLabels: ["AoP", "Aortic pressure (AoP)","大動脈圧 (AoP)"],
  },
  "hemodynamics.pressure.absolute.SA": {
    category: "hemodynamics",
    inlineDisclosure: true,
    label: textV1("ABP", "ABP"),
    description: textV1(
      "Arterial blood pressure representing the systemic arterial compartment.",
      "体動脈圧。体動脈全体をひとつの区画として表した圧。",
    ),
    aliases: [
      "ABP",
      "arterial blood pressure",
      "systemic arterial pressure",
      "SA pressure",
      "血圧",
      "体動脈圧",
    ],
    historicalDefaultLabels: ["Arterial blood pressure (ABP)", "体動脈圧 (ABP)", "Systemic arterial pressure"],
  },
  "hemodynamics.pressure-gradient.valve.local-hydraulic.AoV": {
    category: "valves",
    inlineDisclosure: true,
    label: textV1("AV pressure gradient", "大動脈弁圧較差"),
    description: textV1(
      "Instantaneous pressure difference between the left ventricle and proximal aorta. Positive values favor forward flow.",
      "左室圧と近位大動脈圧の瞬時差。正の値は左室から大動脈へ向かう圧較差を表す。",
    ),
    aliases: [
      "AV gradient",
      "aortic valve gradient",
      "LV Ao gradient",
      "local hydraulic gradient",
      "大動脈弁圧較差",
    ],
    historicalDefaultLabels: ["AV local pressure gradient","大動脈弁局所圧較差"],
  },
  "hemodynamics.pressure-gradient.valve.vena-contracta-bernoulli.AoV": {
    category: "valves",
    inlineDisclosure: true,
    label: textV1("AV Bernoulli gradient", "大動脈弁Bernoulli圧較差"),
    description: textV1(
      "Instantaneous Bernoulli pressure gradient at the narrowest part of the aortic jet, calculated from flow and effective valve area.",
      "大動脈弁噴流が最も細くなる部分の瞬時圧較差。流量と有効弁口面積からBernoulli式で推定する。",
    ),
    aliases: [
      "AV Bernoulli gradient",
      "vena contracta gradient",
      "Doppler gradient",
      "大動脈弁圧較差",
      "ベルヌーイ圧較差",
    ],
    historicalDefaultLabels: ["AV vena-contracta Bernoulli gradient","大動脈弁vena contracta Bernoulli圧較差"],
  },
  "hemodynamics.pressure.systolic.Ao": {
    category: "hemodynamics",
    label: textV1("AoP max", "AoP max"),
    description: textV1(
      "Maximum aortic-root pressure during one heartbeat.",
      "1心拍における大動脈基部圧の最大値。",
    ),
    aliases: ["AoP", "AoP max", "central SBP", "大動脈圧", "収縮期圧"],
    historicalDefaultLabels: ["Aortic pressure (AoP max)","大動脈圧 (AoP max)"],
  },
  "hemodynamics.pressure.diastolic.Ao": {
    category: "hemodynamics",
    label: textV1("AoP min", "AoP min"),
    description: textV1(
      "Minimum aortic-root pressure during one heartbeat.",
      "1心拍における大動脈基部圧の最小値。",
    ),
    aliases: ["AoP", "AoP min", "central DBP", "大動脈圧", "拡張期圧"],
    historicalDefaultLabels: ["Aortic pressure (AoP min)","大動脈圧 (AoP min)"],
  },
  "hemodynamics.pressure.mean.Ao": {
    category: "hemodynamics",
    label: textV1("Mean AoP", "平均AoP"),
    description: textV1(
      "Aortic-root pressure averaged over one heartbeat.",
      "1心拍にわたる大動脈基部圧の時間平均。",
    ),
    aliases: ["AoP", "AoP mean", "central MAP", "大動脈圧", "平均圧"],
    historicalDefaultLabels: ["Mean aortic pressure (AoP mean)","平均大動脈圧 (AoP mean)"],
  },
  "hemodynamics.pressure.systolic.SA": {
    category: "hemodynamics",
    inlineDisclosure: true,
    label: textV1("SBP", "SBP"),
    description: textV1(
      "Systolic arterial pressure: the maximum systemic arterial pressure during one heartbeat.",
      "収縮期血圧。1心拍における体動脈圧の最大値。",
    ),
    aliases: ["SBP", "systolic blood pressure", "収縮期血圧", "血圧"],
    historicalDefaultLabels: ["Systolic arterial pressure (SBP)","収縮期体動脈圧 (SBP)"],
  },
  "hemodynamics.pressure.diastolic.SA": {
    category: "hemodynamics",
    inlineDisclosure: true,
    label: textV1("DBP", "DBP"),
    description: textV1(
      "Diastolic arterial pressure: the minimum systemic arterial pressure during one heartbeat.",
      "拡張期血圧。1心拍における体動脈圧の最小値。",
    ),
    aliases: ["DBP", "diastolic blood pressure", "拡張期血圧", "血圧"],
    historicalDefaultLabels: ["Diastolic arterial pressure (DBP)","拡張期体動脈圧 (DBP)"],
  },
  "hemodynamics.pressure.mean.SA": {
    category: "hemodynamics",
    inlineDisclosure: true,
    label: textV1("MAP", "MAP"),
    description: textV1(
      "Mean arterial pressure: systemic arterial pressure averaged over one heartbeat.",
      "平均血圧。1心拍にわたる体動脈圧の時間平均。",
    ),
    aliases: ["MAP", "mean arterial pressure", "平均血圧", "血圧"],
    historicalDefaultLabels: ["Mean arterial pressure (MAP)","平均体動脈圧 (MAP)"],
  },
  "hemodynamics.pressure.mean.PA": {
    category: "hemodynamics",
    label: textV1("mPAP", "mPAP"),
    description: textV1(
      "Mean pulmonary artery pressure, averaged over one heartbeat.",
      "平均肺動脈圧。1心拍にわたる肺動脈圧の時間平均。",
    ),
    aliases: ["mPAP", "PAP", "mean pulmonary artery pressure", "平均肺動脈圧"],
    historicalDefaultLabels: ["Mean pulmonary arterial pressure (mPAP)","平均肺動脈圧 (mPAP)"],
  },
  "hemodynamics.pressure.systolic.PA": {
    category: "hemodynamics",
    label: textV1("sPAP", "sPAP"),
    description: textV1(
      "Systolic pulmonary artery pressure: the maximum during one heartbeat.",
      "収縮期肺動脈圧。1心拍における肺動脈圧の最大値。",
    ),
    aliases: ["sPAP", "PAP", "pulmonary artery pressure", "肺動脈圧"],
    historicalDefaultLabels: ["Systolic pulmonary arterial pressure (sPAP)","収縮期肺動脈圧 (sPAP)"],
  },
  "hemodynamics.pressure.diastolic.PA": {
    category: "hemodynamics",
    label: textV1("dPAP", "dPAP"),
    description: textV1(
      "Diastolic pulmonary artery pressure: the minimum during one heartbeat.",
      "拡張期肺動脈圧。1心拍における肺動脈圧の最小値。",
    ),
    aliases: ["dPAP", "PAP", "pulmonary artery pressure", "肺動脈圧"],
    historicalDefaultLabels: ["Diastolic pulmonary arterial pressure (dPAP)","拡張期肺動脈圧 (dPAP)"],
  },
  "hemodynamics.pressure.mean.LA": {
    category: "hemodynamics",
    label: textV1("mLAP", "mLAP"),
    description: textV1(
      "Mean left atrial pressure, averaged over one heartbeat.",
      "平均左房圧。1心拍にわたる左房圧の時間平均。",
    ),
    aliases: ["LAP", "mLAP", "left atrial pressure", "左房圧"],
    historicalDefaultLabels: ["Mean left atrial pressure (mLAP)","平均左房圧 (mLAP)"],
  },
  "hemodynamics.pressure.mean.RA": {
    category: "hemodynamics",
    label: textV1("CVP", "CVP"),
    description: textV1(
      "Central venous pressure, represented by right atrial pressure averaged over one heartbeat.",
      "中心静脈圧。1心拍にわたる右房圧の平均値を表示する。",
    ),
    aliases: [
      "CVP",
      "RAP",
      "mRAP",
      "central venous pressure",
      "右房圧",
      "中心静脈圧",
    ],
    historicalDefaultLabels: ["Central venous pressure (CVP / mRAP)","中心静脈圧 (CVP / mRAP)"],
  },
  "hemodynamics.volume.end-diastolic.LV-at-MV-closure": {
    category: "hemodynamics",
    label: textV1("LVEDV", "LVEDV"),
    description: textV1(
      "Left ventricular end-diastolic volume, measured at mitral-valve closure.",
      "左室拡張末期容積。僧帽弁閉鎖時の左室内の血液量。",
    ),
    aliases: ["LVEDV", "EDV", "end diastolic volume", "拡張末期容積"],
    historicalDefaultLabels: ["LV end-diastolic volume (LVEDV)","左室拡張末期容積 (LVEDV)"],
  },
  "hemodynamics.pressure.absolute.end-diastolic.LV-at-MV-closure": {
    category: "hemodynamics",
    label: textV1("LVEDP", "LVEDP"),
    description: textV1(
      "Left ventricular end-diastolic pressure: cavity pressure at mitral-valve closure.",
      "左室拡張末期圧。僧帽弁閉鎖時の左室内圧。",
    ),
    aliases: ["LVEDP", "EDP", "end diastolic pressure", "拡張末期圧"],
    historicalDefaultLabels: ["LV end-diastolic pressure (LVEDP)","左室拡張末期圧 (LVEDP)"],
  },
  "hemodynamics.volume.end-systolic.LV-at-AoV-closure": {
    category: "hemodynamics",
    label: textV1("LVESV", "LVESV"),
    description: textV1(
      "Left ventricular end-systolic volume, measured at aortic-valve closure.",
      "左室収縮末期容積。大動脈弁閉鎖時に左室内に残る血液量。",
    ),
    aliases: ["LVESV", "ESV", "end systolic volume", "収縮末期容積"],
    historicalDefaultLabels: ["LV end-systolic volume (LVESV)","左室収縮末期容積 (LVESV)"],
  },
  "hemodynamics.pressure.absolute.end-systolic.LV-at-AoV-closure": {
    category: "hemodynamics",
    label: textV1("LVESP", "LVESP"),
    description: textV1(
      "Left ventricular end-systolic pressure: cavity pressure at aortic-valve closure.",
      "左室収縮末期圧。大動脈弁閉鎖時の左室内圧。",
    ),
    aliases: ["LVESP", "ESP", "end systolic pressure", "収縮末期圧"],
    historicalDefaultLabels: ["LV end-systolic pressure (LVESP)","左室収縮末期圧 (LVESP)"],
  },
  "hemodynamics.stroke-volume.LV-event-defined": {
    category: "hemodynamics",
    label: textV1("LVSV", "LVSV"),
    description: textV1(
      "Left ventricular stroke volume: LVEDV minus LVESV, using valve closure to define end diastole and end systole.",
      "左室一回拍出量。僧帽弁閉鎖時のLVEDVから、大動脈弁閉鎖時のLVESVを引いた値。",
    ),
    aliases: ["LVSV", "SV", "stroke volume", "一回拍出量"],
    historicalDefaultLabels: ["LV stroke volume (LVSV)","左室一回拍出量 (LVSV)"],
  },
  "hemodynamics.ejection-fraction.LV-event-defined": {
    category: "hemodynamics",
    label: textV1("LVEF", "LVEF"),
    description: textV1(
      "Left ventricular ejection fraction: LVEDV at mitral closure minus LVESV at aortic closure, divided by LVEDV and expressed as a percentage.",
      "左室駆出率。僧帽弁閉鎖時のLVEDVから大動脈弁閉鎖時のLVESVを引き、LVEDVで割った割合。",
    ),
    aliases: ["LVEF", "EF", "ejection fraction", "駆出率"],
    historicalDefaultLabels: ["LV ejection fraction (LVEF)","左室駆出率 (LVEF)"],
  },
  "hemodynamics.valve-volume.net.AoV": {
    category: "valves",
    label: textV1("Effective SV", "実効SV"),
    description: textV1(
      "Net stroke volume through the aortic valve: forward volume minus regurgitant volume during one heartbeat.",
      "実効一回拍出量。1心拍で左室から大動脈へ拍出された量から、大動脈弁の逆流量を差し引いた値。",
    ),
    aliases: ["effective SV", "AoV net", "AV", "net volume", "実効拍出量", "逆流差引", "正味"],
    historicalDefaultLabels: ["Effective LV forward stroke volume","実効左室前方一回拍出量"],
  },
  "hemodynamics.pressure-gradient.valve.mean-hydraulic-forward.AoV": {
    category: "valves",
    label: textV1("AV mean PG", "AV 平均圧較差"),
    description: textV1(
      "Mean pressure difference between the left ventricle and aortic root during forward aortic-valve flow.",
      "大動脈弁平均圧較差。順行性血流がある期間の、左室圧と大動脈基部圧の差の時間平均。",
    ),
    aliases: [
      "mean PG",
      "mPG",
      "AV mean gradient",
      "aortic valve mean gradient",
      "大動脈弁平均圧較差",
    ],
    historicalDefaultLabels: ["AV mean PG (LV−Ao)", "AV 平均圧較差（LV−Ao）", "AV mean pressure gradient (mean PG)","大動脈弁平均圧較差 (mean PG)"],
  },
  "hemodynamics.pressure-gradient.valve.peak-hydraulic-forward.AoV": {
    category: "valves",
    label: textV1("AV peak PG", "AV 最大圧較差"),
    description: textV1(
      "Maximum simultaneous pressure difference between the left ventricle and aortic root during forward flow.",
      "大動脈弁最大圧較差。順行性血流がある期間に、同時点の左室圧と大動脈基部圧の差が最大となる値。",
    ),
    aliases: [
      "peak PG",
      "max PG",
      "AV peak gradient",
      "aortic valve peak gradient",
      "大動脈弁最大圧較差",
    ],
    historicalDefaultLabels: ["AV peak PG (LV−Ao)", "AV 最大圧較差（LV−Ao）", "AV peak pressure gradient (peak PG)","大動脈弁最大圧較差 (peak PG)"],
  },
  "hemodynamics.duration.valve-forward-flow.AoV": {
    category: "valves",
    label: textV1("LVET", "LVET"),
    description: textV1(
      "Left ventricular ejection time: total duration of forward aortic-valve flow during one heartbeat.",
      "左室駆出時間。1心拍中に大動脈弁を通って順行性血流が流れる時間の合計。",
    ),
    aliases: ["ET", "ejection time", "LVET", "駆出時間"],
    historicalDefaultLabels: ["Aortic ejection time (ET)","大動脈駆出時間 (ET)"],
  },
  "hemodynamics.duration.isovolumic-contraction.flow-event.LV": {
    category: "myocardium",
    label: textV1("LV ICT", "LV ICT"),
    description: textV1(
      "Left ventricular isovolumic contraction time: from cessation of forward mitral flow to onset of aortic flow.",
      "左室等容性収縮時間。僧帽弁の順行性血流が止まってから、大動脈弁の順行性血流が始まるまでの時間。",
    ),
    inlineDisclosure: true,
    aliases: ["ICT", "IVCT", "isovolumic contraction time", "等容性収縮時間"],
  },
  "hemodynamics.velocity.peak-quasi-steady-jet.AoV": {
    category: "valves", label: textV1("AV Vmax", "AV Vmax"), inlineDisclosure: true,
    description: textV1(
      "Peak aortic jet velocity, estimated from the model's valve flow and opening during one heartbeat.",
      "大動脈弁最大流速。1心拍の弁通過血流と弁の開口状態から推定した噴流速度の最大値。",
    ),
    aliases: ["aortic velocity", "AS", "最大流速"],
  },
  "hemodynamics.pressure-gradient.mean-bernoulli-jet.AoV": {
    category: "valves", label: textV1("AV mean PG", "AV 平均圧較差"), inlineDisclosure: true,
    historicalDefaultLabels: ["AV mean PG (4v²)", "AV 平均圧較差（4v²）"],
    description: textV1(
      "Mean aortic jet pressure gradient, calculated by averaging 4v² over forward ejection.",
      "大動脈弁の平均噴流圧較差。推定流速vから求めた4v²を、順行性駆出の期間で時間平均する。",
    ),
    aliases: ["AS", "Bernoulli", "ベルヌーイ", "平均圧較差"],
  },
  "hemodynamics.pressure-gradient.peak-bernoulli-jet.AoV": {
    category: "valves", label: textV1("AV peak PG", "AV 最大圧較差"), inlineDisclosure: true,
    historicalDefaultLabels: ["AV peak PG (4v²)", "AV 最大圧較差（4v²）"],
    description: textV1(
      "Peak aortic jet pressure gradient, calculated as 4 × AV Vmax² from the estimated peak velocity.",
      "大動脈弁の最大噴流圧較差。推定最大流速AV Vmaxを使い、4 × Vmax²で求める。",
    ), aliases: ["AS", "最大圧較差"],
  },
  "hemodynamics.duration.jet-acceleration.AoV": {
    category: "valves", label: textV1("AV AT", "AV AT"), inlineDisclosure: true,
    description: textV1(
      "Aortic jet acceleration time: from onset of forward ejection to the first peak in estimated jet velocity.",
      "大動脈弁血流の加速時間。駆出開始から、推定噴流速度が最初の最大値に達するまでの時間。",
    ), aliases: ["acceleration time", "加速時間"],
  },
  "hemodynamics.ratio.jet-AT-to-ET.AoV": {
    category: "valves", label: textV1("AV AT/ET", "AV AT/ET"), inlineDisclosure: true,
    description: textV1(
      "Aortic jet acceleration time divided by ejection time. The ratio changes with valve narrowing, flow and contraction.",
      "大動脈弁血流の加速時間ATを駆出時間ETで割った値。弁の狭窄、流量、心収縮の影響を受ける。",
    ), aliases: ["AT/ET", "AS"],
  },
  "hemodynamics.area.forward-SV-over-jet-VTI.AoV": {
    category: "valves", label: textV1("AVA (SV/VTI)", "AVA (SV/VTI)"), inlineDisclosure: true,
    description: textV1(
      "Effective aortic valve area: forward stroke volume divided by estimated jet velocity-time integral. Reflects valve opening throughout ejection.",
      "有効大動脈弁口面積。順行性一回拍出量を推定流速時間積分VTIで割った値。駆出中の弁の開き方を反映する。",
    ), aliases: ["EOA", "有効弁口面積"],
  },
  "hemodynamics.flow.mean-ejection.AoV": {
    category: "valves", label: textV1("AV mean flow", "AV駆出中平均流量"), inlineDisclosure: true,
    description: textV1(
      "Mean flow during aortic ejection: forward stroke volume divided by ejection time (SV/ET).",
      "大動脈弁の駆出中平均流量。順行性一回拍出量を駆出時間で割った値（SV/ET）。",
    ), aliases: ["SV/ET", "flow rate", "駆出中平均流量"],
  },
  "hemodynamics.stroke-volume-index.forward.AoV-reference-bsa1p9": {
    category: "valves", label: textV1("SVI", "SVI"), inlineDisclosure: true,
    historicalDefaultLabels: ["Forward SVI", "前方SVI", "順行SVI"],
    description: textV1(
      "Forward aortic stroke volume indexed to the reference body surface area of 1.9 m².",
      "前方一回拍出量係数。大動脈弁を通って左室から拍出された1心拍の血液量を、参照体表面積1.9 m²で割った値。",
    ),
    aliases: ["AS", "low flow", "低流量", "stroke volume index"],
  },
  "hemodynamics.ratio.peak-E-to-A.volumetric.MV": {
    category: "valves", label: textV1("MV E/A (flow)", "MV E/A（流量）"), inlineDisclosure: true,
    historicalDefaultLabels: ["MV E/A"],
    description: textV1(
      "Ratio of early-filling (E) to atrial-contraction (A) peak mitral volume flow, measured when both waves can be separated.",
      "僧帽弁の拡張早期E波と心房収縮期A波のピーク流量比。両波を分離して捉えられる場合に測定する。",
    ),
    aliases: ["E/A", "mitral inflow", "僧帽弁流入", "拡張能"],
  },
  "hemodynamics.duration.E-deceleration-80-40.volumetric.MV": {
    category: "valves", label: textV1("MV DT (flow)", "MV DT（流量）"), inlineDisclosure: true,
    historicalDefaultLabels: ["MV DT"],
    description: textV1(
      "Mitral E-wave deceleration time, estimated by extending the 80%–40% descending flow segment to zero.",
      "僧帽弁E波の減速時間。流量波形の下降部80〜40%を直線でゼロまで延長し、E波ピークからの時間を求める。",
    ),
    aliases: ["DT", "DCT", "deceleration time", "E波減速時間"],
  },
  "hemodynamics.duration.A-zero-crossing.volumetric.MV": {
    category: "valves", label: textV1("MV A duration", "MV A波持続時間"), inlineDisclosure: true,
    historicalDefaultLabels: ["MV A dur"],
    description: textV1(
      "Duration of a distinct mitral A-flow wave, from onset to return to zero flow.",
      "僧帽弁A波の持続時間。独立したA波の順行性血流が始まってから、ゼロに戻るまでの時間。",
    ),
    aliases: ["A duration", "mitral A duration", "A波持続時間"],
  },
  "hemodynamics.flow.peak-systolic-ejection.PVein_LA": {
    category: "hemodynamics", label: textV1("Pulmonary vein S flow", "肺静脈S波流量"), inlineDisclosure: true,
    historicalDefaultLabels: ["PV S"],
    description: textV1(
      "Peak total pulmonary venous flow into the left atrium during aortic ejection, representing the systolic S2 wave.",
      "肺静脈S波のピーク流量。大動脈駆出中に肺静脈全体から左房へ流入する流量の最大値（S2相当）。",
    ),
    aliases: ["pulmonary vein S", "肺静脈S波", "systolic pulmonary venous flow"],
  },
  "hemodynamics.flow.peak-early-diastolic.PVein_LA": {
    category: "hemodynamics", label: textV1("Pulmonary vein D flow", "肺静脈D波流量"), inlineDisclosure: true,
    historicalDefaultLabels: ["PV D"],
    description: textV1(
      "Peak total pulmonary venous flow into the left atrium during early diastolic filling, before atrial contraction.",
      "肺静脈D波のピーク流量。心房収縮前の拡張早期に、肺静脈全体から左房へ流入する流量の最大値。",
    ),
    aliases: ["pulmonary vein D", "肺静脈D波", "diastolic pulmonary venous flow"],
  },
  "hemodynamics.ratio.peak-S-to-D.volumetric.PVein_LA": {
    category: "hemodynamics", label: textV1("Pulmonary vein S/D (flow)", "肺静脈S/D（流量）"), inlineDisclosure: true,
    historicalDefaultLabels: ["PV S/D"],
    description: textV1(
      "Ratio of systolic S2 to early-diastolic D peak pulmonary venous flow in the same heartbeat.",
      "肺静脈S/D比。同じ心拍のS波（S2相当）とD波のピーク流量比。両ピークを捉えられる場合に測定する。",
    ),
    aliases: ["S/D", "肺静脈S/D", "pulmonary venous ratio"],
  },
  "hemodynamics.flow.peak-atrial-reversal-magnitude.PVein_LA": {
    category: "hemodynamics", label: textV1("Pulmonary vein Ar flow", "肺静脈Ar波流量"), inlineDisclosure: true,
    historicalDefaultLabels: ["PV Ar"],
    description: textV1(
      "Peak magnitude of a distinct pulmonary venous reverse-flow wave following atrial contraction, shown as a positive value.",
      "肺静脈Ar波のピーク流量。心房収縮に伴う左房から肺静脈への独立した逆流波の大きさを、正の値で示す。",
    ),
    aliases: ["Ar", "atrial reversal", "PVA", "肺静脈逆流波"],
  },
  "hemodynamics.duration.atrial-reversal-zero-crossing.PVein_LA": {
    category: "hemodynamics", label: textV1("Pulmonary vein Ar duration", "肺静脈Ar波持続時間"), inlineDisclosure: true,
    historicalDefaultLabels: ["PV Ar dur"],
    description: textV1(
      "Duration of a distinct pulmonary venous atrial-reversal wave, from departure from zero flow to return to zero.",
      "肺静脈Ar波の持続時間。心房収縮に伴う独立した逆流波がゼロから始まり、ゼロへ戻るまでの時間。",
    ),
    aliases: ["Ar duration", "PVAd", "肺静脈逆流持続時間"],
  },
  "hemodynamics.duration.Ar-minus-A.volumetric.PVein_LA-MV": {
    category: "hemodynamics", label: textV1("Ar−A duration difference", "Ar−A時間差"), inlineDisclosure: true,
    historicalDefaultLabels: ["PV Ar−A dur"],
    description: textV1(
      "Pulmonary venous Ar duration minus mitral A duration for the same atrial contraction, measured from distinct flow waves.",
      "肺静脈Ar波と僧帽弁A波の持続時間差。同じ心房収縮で分離できる両流量波形から、Arの持続時間 − Aの持続時間を求める。",
    ),
    aliases: ["Ar-A", "Ar minus A", "Ar−A時間差"],
  },
  "hemodynamics.duration.isovolumic-relaxation.flow-event.LV": {
    category: "myocardium",
    label: textV1("LV IRT", "LV IRT"),
    description: textV1(
      "Left ventricular isovolumic relaxation time: from cessation of aortic flow to onset of forward mitral flow.",
      "左室等容性弛緩時間。大動脈弁血流が止まってから、僧帽弁の順行性血流が始まるまでの時間。",
    ),
    inlineDisclosure: true,
    aliases: ["IRT", "IVRT", "isovolumic relaxation time", "等容性弛緩時間"],
  },
  "hemodynamics.index.myocardial-performance.flow-event.LV": {
    category: "myocardium",
    label: textV1("LV Tei", "LV Tei"),
    description: textV1(
      "Left ventricular myocardial performance index: (ICT + IRT) / ejection time, using flow timings from one heartbeat.",
      "左室Tei index。（等容性収縮時間＋等容性弛緩時間）÷ 駆出時間。同じ心拍の弁通過血流から各時間を求める。",
    ),
    inlineDisclosure: true,
    aliases: ["Tei index", "MPI", "myocardial performance index", "心筋パフォーマンス指標"],
  },
  "hemodynamics.pressure-rate.maximum-windowed-10ms.absolute.LV": {
    category: "myocardium",
    label: textV1("LV +dP/dt", "LV +dP/dt"),
    historicalDefaultLabels: ["LV +dP/dt (10 ms)"],
    description: textV1(
      "Maximum 10-ms average rate of LV cavity-pressure change in one heartbeat.",
      "1心拍の左室内圧波形で、10 ms間の圧変化量を時間で割った値の最大値。",
    ),
    inlineDisclosure: true,
    aliases: ["LV dP/dt max", "pressure rise", "左室圧上昇速度"],
  },
  "hemodynamics.pressure-rate.minimum-windowed-10ms.absolute.LV": {
    category: "myocardium",
    label: textV1("LV −dP/dt", "LV −dP/dt"),
    historicalDefaultLabels: ["LV −dP/dt (10 ms)"],
    description: textV1(
      "Most negative 10-ms average rate of LV cavity-pressure change in one heartbeat.",
      "1心拍の左室内圧波形で、10 ms間の圧変化量を時間で割った値の最小値（負の値）。",
    ),
    inlineDisclosure: true,
    aliases: ["LV dP/dt min", "pressure fall", "左室圧下降速度"],
  },
  "hemodynamics.pressure-rate.maximum-windowed-10ms.absolute.RV": {
    category: "myocardium",
    label: textV1("RV +dP/dt", "RV +dP/dt"),
    historicalDefaultLabels: ["RV +dP/dt (10 ms)"],
    description: textV1(
      "Maximum 10-ms average rate of RV cavity-pressure change in one heartbeat.",
      "1心拍の右室内圧波形で、10 ms間の圧変化量を時間で割った値の最大値。",
    ),
    inlineDisclosure: true,
    aliases: ["RV dP/dt max", "右室圧上昇速度"],
  },
  "hemodynamics.pressure-rate.minimum-windowed-10ms.absolute.RV": {
    category: "myocardium",
    label: textV1("RV −dP/dt", "RV −dP/dt"),
    historicalDefaultLabels: ["RV −dP/dt (10 ms)"],
    description: textV1(
      "Most negative 10-ms average rate of RV cavity-pressure change in one heartbeat.",
      "1心拍の右室内圧波形で、10 ms間の圧変化量を時間で割った値の最小値（負の値）。",
    ),
    inlineDisclosure: true,
    aliases: ["RV dP/dt min", "右室圧下降速度"],
  },
  "hemodynamics.pressure-gradient.valve.mean-hydraulic-forward.PV": {
    category: "valves",
    label: textV1("PV mean PG", "PV 平均圧較差"),
    description: textV1(
      "Mean right ventricular minus pulmonary artery pressure during forward pulmonary-valve flow.",
      "肺動脈弁平均圧較差。順行性血流がある期間の、右室圧と肺動脈圧の差の時間平均。",
    ),
    aliases: ["PV mean PG", "pulmonary valve gradient", "肺動脈弁圧較差"],
    historicalDefaultLabels: ["PV mean pressure gradient (mean PG)","肺動脈弁平均圧較差 (mean PG)"],
  },
  "hemodynamics.pressure-gradient.valve.peak-hydraulic-forward.PV": {
    category: "valves",
    label: textV1("PV peak PG", "PV 最大圧較差"),
    description: textV1(
      "Maximum simultaneous right ventricular minus pulmonary artery pressure during forward flow.",
      "肺動脈弁最大圧較差。順行性血流がある期間に、同時点の右室圧と肺動脈圧の差が最大となる値。",
    ),
    aliases: ["PV peak PG", "pulmonary valve gradient", "肺動脈弁圧較差"],
    historicalDefaultLabels: ["PV peak pressure gradient (peak PG)","肺動脈弁最大圧較差 (peak PG)"],
  },
  "hemodynamics.duration.valve-forward-flow.PV": {
    category: "valves",
    label: textV1("RVET", "RVET"),
    description: textV1(
      "Right ventricular ejection time: total duration of forward pulmonary-valve flow during one heartbeat.",
      "右室駆出時間。1心拍中に肺動脈弁を通って順行性血流が流れる時間の合計。",
    ),
    aliases: ["RVET", "pulmonary ejection time", "右室駆出時間"],
    historicalDefaultLabels: ["Pulmonary ejection time (RVET)","肺動脈駆出時間 (RVET)"],
  },
  "hemodynamics.pressure-rate.maximum-accepted-step.absolute.LV": {
    category: "myocardium",
    label: textV1("LV +dP/dt", "LV +dP/dt"),
    description: textV1(
      "Maximum rate of LV cavity-pressure change in one heartbeat, calculated from consecutive points on the pressure waveform.",
      "1心拍の左室内圧波形で、圧の上昇速度が最大となる値。隣り合う時点の圧変化から求める。",
    ),
    aliases: ["LV dP/dt max", "+dP/dt", "contractility", "左室収縮能"],
    historicalDefaultLabels: ["LV +dP/dt (accepted-step)","左室 +dP/dt (accepted-step)"],
  },
  "hemodynamics.pressure-rate.minimum-accepted-step.absolute.LV": {
    category: "myocardium",
    label: textV1("LV −dP/dt", "LV −dP/dt"),
    description: textV1(
      "Most negative rate of LV cavity-pressure change in one heartbeat, calculated from consecutive points on the pressure waveform.",
      "1心拍の左室内圧波形で、圧の下降速度が最大となる値。隣り合う時点の圧変化から求める（負の値）。",
    ),
    aliases: ["LV dP/dt min", "-dP/dt", "relaxation", "左室弛緩"],
    historicalDefaultLabels: ["LV −dP/dt (accepted-step)","左室 −dP/dt (accepted-step)"],
  },
  "hemodynamics.pressure-rate.maximum-accepted-step.absolute.RV": {
    category: "myocardium",
    label: textV1("RV +dP/dt", "RV +dP/dt"),
    description: textV1(
      "Maximum rate of RV cavity-pressure change in one heartbeat, calculated from consecutive points on the pressure waveform.",
      "1心拍の右室内圧波形で、圧の上昇速度が最大となる値。隣り合う時点の圧変化から求める。",
    ),
    aliases: ["RV dP/dt max", "RV contractility", "右室収縮能"],
    historicalDefaultLabels: ["RV +dP/dt (accepted-step)","右室 +dP/dt (accepted-step)"],
  },
  "hemodynamics.pressure-rate.minimum-accepted-step.absolute.RV": {
    category: "myocardium",
    label: textV1("RV −dP/dt", "RV −dP/dt"),
    description: textV1(
      "Most negative rate of RV cavity-pressure change in one heartbeat, calculated from consecutive points on the pressure waveform.",
      "1心拍の右室内圧波形で、圧の下降速度が最大となる値。隣り合う時点の圧変化から求める（負の値）。",
    ),
    aliases: ["RV dP/dt min", "RV relaxation", "右室弛緩"],
    historicalDefaultLabels: ["RV −dP/dt (accepted-step)","右室 −dP/dt (accepted-step)"],
  },
  "hemodynamics.output.effective-native-left": {
    category: "hemodynamics",
    label: textV1("CO", "CO"),
    description: textV1(
      "Effective cardiac output: net aortic-valve volume per heartbeat multiplied by heart rate, including the effect of regurgitation.",
      "実効心拍出量。大動脈弁を通って左室から拍出された量から逆流量を差し引き、1分あたりに換算した値。",
    ),
    aliases: ["CO", "cardiac output", "effective CO", "心拍出量"],
    historicalDefaultLabels: ["Effective systemic cardiac output","実効体循環心拍出量"],
  },
  "myocardium.work.external.LV-transmural-pressure-volume-path": {
    category: "myocardium",
    label: textV1("LV SW", "LV SW"),
    description: textV1(
      "Left ventricular stroke work: the negative line integral of transmural pressure along the volume path for one heartbeat.",
      "左室一回仕事量。1心拍の経壁圧と容積変化から求める、左室が血液に行う仕事。",
    ),
    aliases: [
      "SW",
      "stroke work",
      "PV loop area",
      "PV path work",
      "LV path work",
      "一回仕事量",
      "圧容積経路仕事",
    ],
    historicalDefaultLabels: ["LV stroke work (SW)","左室一回仕事量 (SW)"],
  },
  "myocardium.work.stroke.LV": {
    category: "myocardium",
    label: textV1("LV SW", "LV SW"),
    description: textV1(
      "Left ventricular stroke work during one heartbeat, expressed in millijoules.",
      "左室一回仕事量。1心拍で左室が血液に行う仕事をミリジュールで示す。",
    ),
    aliases: ["SW", "stroke work", "PV loop area", "一回仕事量"],
    historicalDefaultLabels: ["LV stroke work (SW)","左室一回仕事量 (SW)"],
  },
  "myocardium.energy.potential.LV-pressure-volume-area": {
    category: "myocardium",
    label: textV1("LV PE", "LV PE"),
    description: textV1(
      "Left ventricular potential energy, estimated from pressure–volume relationships after circulation settles at each reduced preload.",
      "左室ポテンシャルエネルギー。前負荷を段階的に下げ、循環が落ち着いた時点の圧容積関係から推定する。",
    ),
    aliases: ["PE", "potential energy", "PVA PE", "ポテンシャルエネルギー"],
    historicalDefaultLabels: ["LV potential energy (PE)","左室ポテンシャルエネルギー (PE)"],
  },
  "myocardium.energy.pressure-volume-area.LV": {
    category: "myocardium",
    label: textV1("LV PVA", "LV PVA"),
    description: textV1(
      "Left ventricular pressure–volume area: stroke work plus estimated potential energy.",
      "左室圧容積面積。一回仕事量SWと推定ポテンシャルエネルギーPEの和。",
    ),
    aliases: ["PVA", "pressure volume area", "圧容積面積"],
    historicalDefaultLabels: ["LV pressure–volume area (PVA)","左室圧容積面積 (PVA)"],
  },
  "oxygen.consumption.estimated-myocardial.LV-per-beat-per-100g": {
    category: "oxygen",
    label: textV1("Estimated LV MVO₂/beat", "推定LV MVO₂/拍"),
    description: textV1(
      "Estimated left ventricular myocardial oxygen consumption per heartbeat and per 100 g of myocardium, using a published relation with PVA and modeled LV mass.",
      "1心拍・心筋100 gあたりの左室心筋酸素消費量。PVAと左室心筋量から、文献の関係式を用いて推定する。",
    ),
    aliases: ["MVO2", "MVO₂", "oxygen consumption", "心筋酸素消費量"],
    historicalDefaultLabels: ["Estimated LV MVO₂ per beat","推定左室MVO₂（1心拍・100 gあたり）"],
  },
  "oxygen.consumption.estimated-myocardial.LV-per-min-per-100g": {
    category: "oxygen",
    label: textV1("Estimated LV MVO₂/min", "推定LV MVO₂/分"),
    description: textV1(
      "Estimated left ventricular myocardial oxygen consumption per minute and per 100 g, obtained from the per-beat estimate and heart rate.",
      "1分・心筋100 gあたりの左室心筋酸素消費量。1心拍あたりの推定値に心拍数を乗じて求める。",
    ),
    aliases: ["MVO2", "MVO₂", "oxygen consumption", "心筋酸素消費量"],
    historicalDefaultLabels: ["Estimated LV MVO₂ per minute","推定左室MVO₂（1分・100 gあたり）"],
  },
  "oxygen.delivery.systemic": {
    category: "oxygen",
    label: textV1("DO₂", "DO₂"),
    description: textV1(
      "Systemic oxygen delivery: the amount of oxygen supplied to the systemic circulation per minute.",
      "全身酸素供給量。1分間に体循環へ供給される酸素量。",
    ),
    aliases: ["DO2", "DO₂", "oxygen delivery", "酸素供給量"],
    historicalDefaultLabels: ["Systemic oxygen delivery (DO₂)","全身酸素供給量 (DO₂)"],
  },
});

export type StudioOutputPressureSummaryV1 = Readonly<{
  presentationId: string;
  maximumOutputId: string;
  minimumOutputId: string;
  memberOutputIds: readonly [string, string];
}>;

const pressureSummaryV1 = (
  presentationId: string,
  maximumOutputId: string,
  minimumOutputId: string,
): StudioOutputPressureSummaryV1 =>
  Object.freeze({
    presentationId,
    maximumOutputId,
    minimumOutputId,
    memberOutputIds: Object.freeze([
      maximumOutputId,
      minimumOutputId,
    ] as const),
  });

/**
 * Clinical display recipes over atomic outputs. The numerical output registry
 * remains unchanged so refs, claims, fitting, and validation retain scalar IDs.
 */
export const STUDIO_OUTPUT_PRESSURE_SUMMARIES_V1: readonly StudioOutputPressureSummaryV1[] =
  Object.freeze([
    pressureSummaryV1(
      "presentation.pressure-summary.Ao",
      "hemodynamics.pressure.systolic.Ao",
      "hemodynamics.pressure.diastolic.Ao",
    ),
    pressureSummaryV1(
      "presentation.pressure-summary.SA",
      "hemodynamics.pressure.systolic.SA",
      "hemodynamics.pressure.diastolic.SA",
    ),
    pressureSummaryV1(
      "presentation.pressure-summary.PA",
      "hemodynamics.pressure.systolic.PA",
      "hemodynamics.pressure.diastolic.PA",
    ),
  ]);

export function studioOutputPressureSummaryForOutputIdV1(
  outputId: string,
): StudioOutputPressureSummaryV1 | undefined {
  return STUDIO_OUTPUT_PRESSURE_SUMMARIES_V1.find(({ memberOutputIds }) =>
    memberOutputIds.includes(outputId),
  );
}

export function resolveStudioOutputPressureSummaryStoredLabelV1(
  input: Readonly<{
    summary: StudioOutputPressureSummaryV1;
    items: readonly Readonly<{ outputId: string; label: string }>[];
    locale: "en" | "ja";
    fallbackEnglishLabel: (outputId: string) => string;
  }>,
): string | undefined {
  for (const item of input.items) {
    const legacyDefaultLabel = input.fallbackEnglishLabel(item.outputId);
    const atomicPresentation = resolveStudioItemPresentationV1({
      kind: "output",
      itemId: item.outputId,
      fallbackEnglishLabel: legacyDefaultLabel,
      locale: input.locale,
    });
    if (
      resolveStudioSurfaceItemLabelV1({
        storedLabel: item.label,
        legacyDefaultLabel,
        presentation: atomicPresentation,
      }) !== atomicPresentation.label
    ) {
      return item.label;
    }
  }
  return undefined;
}

const WALL_LABEL_V1: Readonly<Record<string, LocalizedTextV1>> = Object.freeze({
  LA: textV1("LA", "左房"),
  LVFW: textV1("LV free wall", "左室自由壁"),
  SEP: textV1("Ventricular septum", "心室中隔"),
  RVFW: textV1("RV free wall", "右室自由壁"),
  RA: textV1("RA", "右房"),
});

const VALVE_LABEL_V1: Readonly<Record<string, LocalizedTextV1>> = Object.freeze(
  {
    MV: textV1("Mitral valve (MV)", "僧帽弁 (MV)"),
    AoV: textV1("Aortic valve (AV)", "大動脈弁 (AV)"),
    TV: textV1("Tricuspid valve (TV)", "三尖弁 (TV)"),
    PV: textV1("Pulmonary valve (PV)", "肺動脈弁 (PV)"),
  },
);

const CORONARY_TERRITORY_V1: Readonly<Record<string, LocalizedTextV1>> = Object.freeze({
  LAD: textV1("left anterior descending artery", "左前下行枝"),
  LCx: textV1("left circumflex artery", "左回旋枝"),
  RCA: textV1("right coronary artery", "右冠動脈"),
});

function patternedControlPresentationV1(
  itemId: string,
): StudioItemPresentationDraftV1 | undefined {
  const wallMatch =
    /^myocardium\.(active-tension|passive-stiffness|calcium-decay-time)-scale\.(LA|LVFW|SEP|RVFW|RA)$/.exec(
      itemId,
    );
  if (wallMatch !== null) {
    const mechanism = wallMatch[1]!;
    const wall = WALL_LABEL_V1[wallMatch[2]!]!;
    const short = ({ LA: "LA", LVFW: "LV自由壁", SEP: "心室中隔", RVFW: "RV自由壁", RA: "RA" })[wallMatch[2] as "LA" | "LVFW" | "SEP" | "RVFW" | "RA"];
    if (mechanism === "active-tension") {
      return {
        category: "myocardium",
        label: textV1(`${wall.en} contractility`, `${short} 収縮性`),
        description: textV1(
          `Contractile strength of the ${wall.en}. Scales the active tension generated by this part of the heart.`,
          `${wall.ja}の収縮の強さ。この部位が生み出す能動張力を、基準に対する倍率で調整する。`,
        ),
        historicalDefaultLabels: [`${wall.ja}収縮性`, `${wall.en} active tension`, `${wallMatch[2] === "SEP" ? "心室中隔" : wall.en.replace(" free wall", "自由壁")} 能動張力`],
        aliases: ["contractility", "active tension", "収縮性", wallMatch[2]!],
      };
    }
    if (mechanism === "passive-stiffness") {
      return {
        category: "myocardium",
        label: textV1(
          `${wall.en} passive stiffness`,
          `${short}の硬さ`,
        ),
        description: textV1(
          `Passive stiffness of the ${wall.en}, relative to the reference setting. Larger values make this part of the heart harder to stretch during filling.`,
          `${wall.ja}の受動的な硬さを、基準に対する倍率で調整する。大きいほど拡張時に心筋が伸びにくくなる。`,
        ),
        historicalDefaultLabels: [`${wall.ja}の硬さ`, `${wallMatch[2] === "SEP" ? "心室中隔" : wall.en.replace(" free wall", "自由壁")} 受動スティフネス`],
        aliases: [
          "stiffness",
          "compliance",
          "受動特性",
          "スティフネス",
          wallMatch[2]!,
        ],
      };
    }
    return {
      category: "myocardium",
      label: textV1(`${wall.en} relaxation time`, `${short} 弛緩時間`),
      historicalDefaultLabels: [`${wall.ja}弛緩時間`],
      description: textV1(
        `Time scale of calcium decline in the ${wall.en}, relative to the reference setting. Larger values prolong muscle activation and slow relaxation.`,
        `${wall.ja}のカルシウム濃度が低下する時間を、基準に対する倍率で調整する。大きいほど心筋の活動が長く続き、弛緩が遅くなる。`,
      ),
      aliases: [
        "relaxation",
        "lusitropy",
        "calcium decay",
        "弛緩",
        wallMatch[2]!,
      ],
    };
  }

  const valveMatch =
    /^valve\.(maximum-forward-eoa-cm2|closed-reverse-eroa-cm2)\.(MV|AoV|TV|PV)$/.exec(
      itemId,
    );
  if (valveMatch !== null) {
    const valve = VALVE_LABEL_V1[valveMatch[2]!]!;
    const short = valveMatch[2] === "AoV" ? "AV" : valveMatch[2]!;
    const forward = valveMatch[1] === "maximum-forward-eoa-cm2";
    return {
      category: "valves",
      label: forward
        ? textV1(`${short} area`, `${short} 弁口面積`)
        : textV1(`${short} EROA`, `${short} EROA`),
      description: forward
        ? textV1(
            `Maximum effective orifice area (EOA) of the ${valve.en}. The opening available for forward blood flow when the valve is fully open. Smaller values represent greater stenosis.`,
            `${valve.ja}の最大有効弁口面積（EOA）。弁が十分に開いたときに順行性の血流が通る有効な面積で、小さいほど狭窄が強くなる。`,
          )
        : textV1(
            `Effective regurgitant orifice area of the ${valve.en}. The opening that remains for backward flow when the valve is closed; larger values allow more regurgitation.`,
            `${valve.ja}の有効逆流弁口面積。弁が閉じたときに逆流が通る面積で、大きいほど逆流が起こりやすくなる。`,
          ),
      historicalDefaultLabels: forward
        ? [`${short}弁口面積`, `${valve.en} maximum EOA`, `${valve.ja} 最大EOA`, ...(short === "AV" ? ["大動脈弁 (AoV) 最大EOA", "Aortic valve (AoV) maximum EOA"] : [])]
        : [`${valve.en} reverse EROA`, `${valve.ja} 逆流EROA`, ...(short === "AV" ? ["大動脈弁 (AoV) 逆流EROA", "Aortic valve (AoV) reverse EROA"] : [])],
      aliases: forward
        ? [valveMatch[2]!, "EOA", "valve area", "弁口面積", "狭窄"]
        : [valveMatch[2]!, "EROA", "regurgitation", "逆流", "逆流弁口面積"],
    };
  }

  if (itemId.startsWith("oxygen.")) {
    const oxygenCopy: Readonly<
      Record<
        string,
        readonly [LocalizedTextV1, LocalizedTextV1, readonly string[]]
      >
    > = {
      "oxygen.hemoglobin-g-per-dl": [
        textV1("Hb", "Hb"),
        textV1("Blood hemoglobin concentration", "血中ヘモグロビン濃度"),
        ["Hb", "hemoglobin", "ヘモグロビン", "Hemoglobin (Hb)", "ヘモグロビン (Hb)"],
      ],
      "oxygen.inspired-oxygen-fraction": [
        textV1("FiO₂", "FiO₂"),
        textV1("Inspired oxygen fraction. The proportion of oxygen in inhaled gas; 0.21 corresponds to room air.", "吸入酸素濃度。吸入気に占める酸素の割合で、0.21が室内気に相当する。"),
        ["FiO2", "FiO₂", "inspired oxygen", "吸入酸素", "Inspired oxygen fraction (FiO₂)", "吸入酸素濃度 (FiO₂)"],
      ],
      "oxygen.arterial-carbon-dioxide-pressure-mm-hg": [
        textV1("PaCO₂", "PaCO₂"),
        textV1(
          "Arterial carbon-dioxide partial pressure. Together with inspired oxygen, it determines alveolar oxygen pressure.",
          "動脈血二酸化炭素分圧。吸入酸素濃度とともに肺胞内の酸素分圧を決める。",
        ),
        ["PaCO2", "PaCO₂", "PCO2", "二酸化炭素分圧", "Arterial PCO₂ (PaCO₂)", "動脈血二酸化炭素分圧 (PaCO₂)"],
      ],
      "oxygen.respiratory-exchange-ratio": [
        textV1("Respiratory exchange ratio", "呼吸交換比"),
        textV1(
          "Respiratory exchange ratio (RER): carbon-dioxide production divided by oxygen consumption. It affects alveolar oxygen pressure.",
          "呼吸交換比（RER）。酸素消費量に対する二酸化炭素排出量の比で、肺胞内の酸素分圧に影響する。",
        ),
        ["RER", "respiratory quotient", "呼吸交換比", "Respiratory exchange ratio (RER)", "呼吸交換比 (RER)"],
      ],
      "oxygen.barometric-pressure-mm-hg": [
        textV1("Barometric pressure", "大気圧"),
        textV1(
          "Ambient atmospheric pressure. Lower pressure, as at high altitude, reduces the oxygen pressure in inspired gas.",
          "周囲の大気の圧力。高地などで大気圧が低くなると、吸入気の酸素分圧も低下する。",
        ),
        ["PB", "barometric pressure", "大気圧"],
      ],
      "oxygen.true-shunt-fraction": [
        textV1("True shunt fraction", "真性シャント率"),
        textV1(
          "Fraction of blood flow that bypasses oxygenation",
          "酸素化を受けずに通過する血流の割合",
        ),
        ["shunt", "Qs/Qt", "シャント"],
      ],
      "oxygen.target-consumption-ml-per-min": [
        textV1("Target VO₂", "目標VO₂"),
        textV1(
          "Target whole-body oxygen consumption per minute. Sets the oxygen demand of the tissues.",
          "全身の1分あたり目標酸素消費量。組織が必要とする酸素の量を設定する。",
        ),
        ["VO2", "VO₂", "oxygen consumption", "酸素消費量", "Target oxygen consumption (VO₂)", "目標酸素消費量 (VO₂)"],
      ],
    };
    const copy = oxygenCopy[itemId];
    if (copy !== undefined) {
      return {
        category: "oxygen",
        label: copy[0],
        description: copy[1],
        aliases: copy[2],
        historicalDefaultLabels: copy[2].filter(label => label.includes("(")),
      };
    }
  }

  const pericardiumCopy: Readonly<Record<string, readonly [LocalizedTextV1, LocalizedTextV1]>> = {
    "pericardium.reference-capacity-scale": [
      textV1("Pericardial capacity", "心膜の基準容量"),
      textV1("Reference capacity of the pericardial sac, relative to the reference setting. Larger values allow the heart to expand further before pericardial restraint increases.", "心膜が心臓を包む基準容量を倍率で調整する。大きいほど心臓が拡大できる余地が増え、心膜による圧迫が強くなるまでの余裕が大きくなる。"),
    ],
    "pericardium.pressure-scale": [
      textV1("Pericardial restraint", "心膜の圧迫の強さ"),
      textV1("Strength of the pressure generated as the pericardial sac stretches. Scales pericardial restraint at a given volume.", "心膜が伸ばされたときに生じる圧の強さ。同じ容積における心膜の圧迫を倍率で調整する。"),
    ],
    "pericardium.exponential-stiffness-scale": [
      textV1("Pericardial stiffening", "心膜圧の上がりやすさ"),
      textV1("Steepness of the rise in pericardial pressure as the heart and pericardial fluid occupy more volume. Larger values make pressure rise more sharply.", "心臓や心嚢液が占める容積の増加に対して、心膜による圧がどれだけ急に上がるかを調整する。大きいほど圧の上昇が急になる。"),
    ],
    "pericardium.prescribed-fluid-volume-ml": [
      textV1("Pericardial fluid", "心嚢液量"),
      textV1("Volume of fluid in the pericardial sac. Increasing it reduces the space available for the heart and increases pericardial restraint.", "心膜腔内の液体の量。増えるほど心臓が広がる余地が減り、心膜による圧迫が強くなる。"),
    ],
  };
  const pericardium = pericardiumCopy[itemId];
  if (pericardium) {
    return {
      category: "pericardium",
      label: pericardium[0],
      description: pericardium[1],
      aliases: ["pericardium", "pericardial", "心膜"],
    };
  }

  const focal = /^coronary\.focal-diameter-loss-fraction\.(LAD|LCx|RCA)$/.exec(itemId);
  if (focal) {
    const artery = CORONARY_TERRITORY_V1[focal[1]!]!;
    return {
      category: "coronary",
      label: textV1(`${focal[1]} stenosis`, `${focal[1]} 狭窄率`),
      historicalDefaultLabels: [`${focal[1]}狭窄率`],
      description: textV1(`Diameter stenosis of the ${artery.en} (${focal[1]}). The fractional reduction in diameter at a focal narrowing; 0.5 represents 50% diameter stenosis.`, `${artery.ja}（${focal[1]}）の径狭窄率。局所的な狭窄による内径の減少割合で、0.5が50%の径狭窄に相当する。`),
      aliases: [focal[1]!, artery.en, artery.ja, "coronary", "stenosis", "冠動脈", "狭窄"],
    };
  }
  const resistance = /^coronary\.structural-(r1|rm)-resistance-scale\.(LAD|LCx|RCA)\.(subepicardial|subendocardial)$/.exec(itemId);
  if (resistance) {
    const artery = CORONARY_TERRITORY_V1[resistance[2]!]!;
    const layer = resistance[3] === "subepicardial" ? textV1("outer myocardium", "心外膜側") : textV1("inner myocardium", "心内膜側");
    const inlet = resistance[1] === "r1";
    const segment = inlet ? textV1("arterial resistance", "動脈側抵抗") : textV1("microvascular resistance", "微小血管抵抗");
    return {
      category: "coronary",
      label: textV1(`${resistance[2]} ${segment.en} (${resistance[3] === "subepicardial" ? "outer" : "inner"})`, `${resistance[2]} ${segment.ja}（${layer.ja}）`),
      historicalDefaultLabels: [`${resistance[2]} ${layer.ja}${segment.ja}`],
      description: textV1(`${artery.en} (${resistance[2]}) territory, ${layer.en}: ${segment.en} relative to the reference setting. Larger values increase resistance to blood flow in this region.`, `${artery.ja}（${resistance[2]}）領域の${layer.ja}における${segment.ja}を、基準に対する倍率で調整する。大きいほどこの部位を血液が流れにくくなる。`),
      aliases: [resistance[2]!, resistance[3]!, artery.en, artery.ja, inlet ? "R1" : "Rm", "coronary resistance", "冠血管抵抗"],
    };
  }

  return undefined;
}

function patternedOutputPresentationV1(
  itemId: string,
): StudioItemPresentationDraftV1 | undefined {
  const clinical = clinicalOutputPresentationV1(itemId);
  if (clinical) return clinical;
  const signal = graphSignalPresentationV1(itemId);
  if (signal) return signal;
  const chambers: Readonly<Record<string, readonly [string, string]>> = {
    LA: ["left atrium", "左房"], LV: ["left ventricle", "左室"],
    RA: ["right atrium", "右房"], RV: ["right ventricle", "右室"],
  };
  const chamberSignal = /^hemodynamics\.(volume|pressure\.(absolute|transmural))\.(LA|LV|RA|RV)$/.exec(itemId);
  if (chamberSignal) {
    const id = chamberSignal[3]!, [en, ja] = chambers[id]!;
    const volume = chamberSignal[1] === "volume", transmural = chamberSignal[2] === "transmural";
    return {
      category: "hemodynamics",
      label: volume ? textV1(`${id} volume`, `${id} 容積`)
        : transmural ? textV1(`${id} transmural pressure`, `${id}P（経壁圧）`)
        : textV1(`${id}P`, `${id}P`),
      historicalDefaultLabels: volume ? [`${ja}容積`] : transmural ? [`${ja}経壁圧`] : [],
      description: volume
        ? textV1(`Blood volume inside the ${en} throughout the cardiac cycle.`, `心周期に伴って変化する、${ja}内の血液量。`)
        : transmural
          ? textV1(`Pressure inside the ${en} minus the surrounding pressure from the thorax and pericardium.`, `${ja}内圧から心臓の周囲圧（胸腔内圧と心膜による圧）を引いた、心壁を内側から広げる圧。`)
          : textV1(`Pressure inside the ${en} throughout the cardiac cycle.`, `心周期に伴って変化する${ja}内圧。`),
      aliases: [id, en, ja, volume ? "volume" : "pressure"],
    };
  }
  const event = /^hemodynamics\.(volume|pressure\.(absolute|transmural))\.end-(diastolic|systolic)\.(LV|RV)-at-(MV|AoV|TV|PV)-closure$/.exec(itemId);
  if (event) {
    const chamber = event[4]!, [en, ja] = chambers[chamber]!;
    const diastolic = event[3] === "diastolic", volume = event[1] === "volume", transmural = event[2] === "transmural";
    const valves: Readonly<Record<string, readonly [string, string]>> = {
      MV: ["mitral", "僧帽弁"], AoV: ["aortic", "大動脈弁"],
      TV: ["tricuspid", "三尖弁"], PV: ["pulmonary", "肺動脈弁"],
    };
    const valve = valves[event[5]!]!;
    const short = `${chamber}E${diastolic ? "D" : "S"}${volume ? "V" : "P"}`;
    return {
      category: "hemodynamics",
      label: textV1(`${short}${transmural ? " (transmural)" : ""}`, `${short}${transmural ? "（経壁圧）" : ""}`),
      description: textV1(
        `End-${diastolic ? "diastolic" : "systolic"} ${volume ? "volume" : "pressure"} of the ${en} at ${valve[0]}-valve closure.${transmural ? " The surrounding pressure from the thorax and pericardium is subtracted from cavity pressure." : ""}`,
        `${ja}${diastolic ? "拡張" : "収縮"}末期${volume ? "容積" : "圧"}。${valve[1]}閉鎖時の${ja}${volume ? "内の血液量" : "内圧"}${transmural ? "から心臓の周囲圧（胸腔内圧と心膜による圧）を引いた値" : ""}。`,
      ),
      aliases: [chamber, ja, short],
    };
  }
  const valveFlow = /^hemodynamics\.flow\.valve\.(MV|AoV|TV|PV)$/.exec(itemId);
  if (valveFlow) {
    const valves: Readonly<Record<string, readonly [string, string, string, string]>> = {
      MV: ["Mitral valve", "僧帽弁", "left atrium to left ventricle", "左房から左室"],
      AoV: ["Aortic valve", "大動脈弁", "left ventricle to aorta", "左室から大動脈"],
      TV: ["Tricuspid valve", "三尖弁", "right atrium to right ventricle", "右房から右室"],
      PV: ["Pulmonary valve", "肺動脈弁", "right ventricle to pulmonary artery", "右室から肺動脈"],
    };
    const valve = valves[valveFlow[1]!]!;
    return {
      category: "valves",
      label: textV1(`${valveFlow[1] === "AoV" ? "AV" : valveFlow[1]} flow`, `${valveFlow[1] === "AoV" ? "AV" : valveFlow[1]} 流量`),
      description: textV1(`${valve[0]} volume flow. Positive flow is from ${valve[2]}; negative flow indicates regurgitation.`,
        `${valve[1]}を通過する血液の体積流量。${valve[3]}への順行流を正、逆流を負で示す。`),
      aliases: [valveFlow[1]!, valve[0], valve[1]],
      historicalDefaultLabels: [`${valve[1]}流量`],
    };
  }
  if (itemId.startsWith("oxygen.")) {
    return {
      category: "oxygen",
      aliases: ["oxygen", "O2", "O₂", "酸素"],
    };
  }
  if (itemId.startsWith("pericardium.")) {
    return {
      category: "pericardium",
      aliases: ["pericardium", "pericardial", "心膜"],
    };
  }
  if (itemId.startsWith("myocardium.")) {
    return {
      category: "myocardium",
      aliases: ["myocardium", "myocardial", "心筋", "PV"],
    };
  }
  if (itemId.startsWith("coronary.")) {
    return {
      category: "coronary",
      aliases: ["coronary", "冠動脈", "冠血流"],
    };
  }
  return undefined;
}

/** Authored definitions, not descriptions inferred from an identifier or label. */
function clinicalOutputPresentationV1(itemId: string): StudioItemPresentationDraftV1 | undefined {
  const valveVolume = /^hemodynamics\.(valve-volume\.(forward|reverse|net)|valve-regurgitant-fraction\.same-valve)\.(MV|AoV|TV|PV)$/.exec(itemId);
  if (valveVolume) {
    const valveId = valveVolume[3]!;
    const short = valveId === "AoV" ? "AV" : valveId;
    const valve = VALVE_LABEL_V1[valveId]!;
    const directions: Record<string, readonly [string, string, string, string]> = {
      MV: ["left atrium", "left ventricle", "左房", "左室"],
      AoV: ["left ventricle", "aorta", "左室", "大動脈"],
      TV: ["right atrium", "right ventricle", "右房", "右室"],
      PV: ["right ventricle", "pulmonary artery", "右室", "肺動脈"],
    };
    const [from, to, fromJa, toJa] = directions[valveId]!;
    const inflow = valveId === "MV" || valveId === "TV";
    const quantity = inflow ? "流入量" : "拍出量";
    const type = valveVolume[2] ?? "fraction";
    const label = type === "forward" ? textV1(`${short} forward volume`, `${short} ${quantity}`)
      : type === "reverse" ? textV1(`${short} regurgitant volume`, `${short} 逆流量`)
      : type === "net" ? (valveId === "PV" ? textV1("Effective RV SV", "右室実効SV") : textV1(`${short} net volume`, `${short} 実効${quantity}`))
      : textV1(`${short} regurgitant fraction`, `${short} 逆流率`);
    const description = type === "forward"
      ? textV1(`${valve.en}: blood passing from the ${from} to the ${to} during the last completed heartbeat.`, `${valve.ja}を通って、${fromJa}から${toJa}へ流れた血液量。直前に完了した1心拍について求める。`)
      : type === "reverse"
        ? textV1(`${valve.en}: blood returning from the ${to} to the ${from} during the last completed heartbeat, expressed as a positive volume.`, `${valve.ja}を通って、${toJa}から${fromJa}へ逆流した血液量。直前に完了した1心拍の逆流の大きさを正の値で示す。`)
        : type === "net"
          ? textV1(`${valve.en}: forward volume minus regurgitant volume over the last completed heartbeat.`, `${valve.ja}を通る1心拍の${quantity}から、同じ心拍の逆流量を差し引いた血液量。`)
          : textV1(`${valve.en}: regurgitant volume divided by forward volume in the same completed heartbeat, expressed as a percentage.`, `${valve.ja}の逆流率。同じ1心拍の逆流量を、この弁の${quantity}で割った割合。`);
    return { category: "valves", label, description,
      historicalDefaultLabels: type === "net" && inflow ? [`${short} ${quantity}（逆流差引）`] : [],
      aliases: [valveId, short, valve.en, valve.ja, "1拍", "1心拍", "per beat", type === "fraction" ? "RF" : type, type === "forward" ? "順行量 前方血流量 forward volume" : type === "net" ? "正味 net volume" : type === "reverse" ? "reverse volume regurgitant volume" : "逆流率 regurgitant fraction"] };
  }
  const gradient = /^hemodynamics\.pressure-gradient\.valve\.(mean|peak)-hydraulic-forward\.(MV|TV)$/.exec(itemId);
  if (gradient) {
    const valveId = gradient[2]!, valve = VALVE_LABEL_V1[valveId]!;
    const mean = gradient[1] === "mean", side = valveId === "MV" ? "左" : "右";
    return { category: "valves", label: textV1(`${valveId} ${mean ? "mean" : "peak"} PG`, `${valveId} ${mean ? "平均" : "最大"}圧較差`),
      description: textV1(`${valve.en}: ${mean ? "time-averaged" : "maximum simultaneous"} atrial minus ventricular pressure during forward flow in one heartbeat.`, `${valve.ja}の${mean ? "平均" : "最大"}圧較差。1心拍の${side}房から${side}室へ血液が流れる期間について、同時点の${side}房圧と${side}室圧の差の${mean ? "時間平均" : "最大値"}を求める。`), aliases: [valve.ja, "PG", "pressure gradient"] };
  }
  const pulse = /^hemodynamics\.pressure\.pulse\.(Ao|SA|PA)$/.exec(itemId);
  if (pulse) {
    const name = ({ Ao: textV1("Aortic", "大動脈"), SA: textV1("Arterial", "体動脈"), PA: textV1("Pulmonary arterial", "肺動脈") })[pulse[1] as "Ao" | "SA" | "PA"];
    return { category: "hemodynamics", label: textV1(`${name.en} pulse pressure`, `${name.ja}脈圧`), description: textV1(`${name.en} maximum pressure minus minimum pressure in the same completed heartbeat.`, `${name.ja}圧の最大値と最小値の差。同じ1心拍について求める。`), aliases: ["PP", "pulse pressure", "脈圧"] };
  }
  const peak = /^hemodynamics\.pressure\.systolic\.(LV|RV)$/.exec(itemId);
  if (peak) return { category: "hemodynamics", label: textV1(`${peak[1]}SP`, `${peak[1]}SP`), description: textV1(`Peak ${peak[1] === "LV" ? "left" : "right"} ventricular pressure in one heartbeat.`, `${peak[1] === "LV" ? "左" : "右"}室収縮期圧。1心拍における心室内圧の最大値。`) };
  const tone = /^coronary\.tone-resistance-scale\.(LAD|LCx|RCA)\.(subepicardial|subendocardial)$/.exec(itemId);
  if (tone) {
    const artery = CORONARY_TERRITORY_V1[tone[1]!]!, outer = tone[2] === "subepicardial";
    return { category: "coronary", label: textV1(`${tone[1]} vascular tone (${outer ? "outer" : "inner"})`, `${tone[1]} 血管トーン（${outer ? "心外膜側" : "心内膜側"}）`), description: textV1(`Current resistance multiplier from autoregulation in the ${outer ? "outer" : "inner"} myocardium of the ${artery.en} territory.`, `${artery.ja}領域の${outer ? "心外膜側" : "心内膜側"}で、血流の自動調節によって変わる血管抵抗の倍率。大きいほど血管が収縮した状態を示す。`), aliases: [artery.ja, artery.en, "autoregulation", "自動調節", "現在値"] };
  }
  const copy: Readonly<Record<string, readonly [string, string, string, string]>> = {
    "hemodynamics.pressure.mean.PVein": ["Mean pulmonary vein pressure", "平均肺静脈圧", "Pulmonary venous pressure averaged over the last completed heartbeat.", "肺静脈内の圧を、直前に完了した1心拍にわたって時間平均した値。"],
    "hemodynamics.pressure.mean.VC": ["Mean vena cava pressure", "平均大静脈圧", "Pressure in the vena cava upstream of the right atrium, averaged over one heartbeat.", "右房へ流入する直前の大静脈内圧を、1心拍にわたって時間平均した値。"],
    "hemodynamics.pressure-gradient.mean.systemic-circuit": ["Systemic pressure gradient", "体循環平均圧較差", "Mean systemic arterial pressure minus mean right atrial pressure in the same heartbeat.", "同じ1心拍の平均体動脈圧から平均右房圧を引いた値。体循環を流れる血液を駆動する圧差。"],
    "hemodynamics.pressure-gradient.mean.pulmonary-circuit": ["Pulmonary pressure gradient", "肺循環平均圧較差", "Mean pulmonary artery pressure minus mean pulmonary venous pressure in the same heartbeat.", "同じ1心拍の平均肺動脈圧から平均肺静脈圧を引いた値。肺循環を流れる血液を駆動する圧差。"],
    "hemodynamics.volume.maximum.LV": ["LV maximum volume", "LV 最大容積", "Largest left ventricular blood volume during one heartbeat.", "1心拍の左室内血液量の最大値。"],
    "hemodynamics.volume.minimum.LV": ["LV minimum volume", "LV 最小容積", "Smallest left ventricular blood volume during one heartbeat.", "1心拍の左室内血液量の最小値。"],
    "hemodynamics.stroke-volume.LV-extrema": ["LVSV", "LVSV", "Maximum minus minimum LV volume within one heartbeat.", "1心拍の左室最大容積から最小容積を引いた一回拍出量。"],
    "hemodynamics.ejection-fraction.LV-extrema": ["LVEF", "LVEF", "Maximum minus minimum LV volume, divided by maximum volume, expressed as a percentage.", "左室最大容積と最小容積の差を最大容積で割った割合。1心拍内の容積変化から求める。"],
    "hemodynamics.stroke-volume.RV-event-defined": ["RVSV", "RVSV", "Right ventricular stroke volume: RVEDV at tricuspid closure minus RVESV at pulmonary-valve closure.", "右室一回拍出量。三尖弁閉鎖時のRVEDVから肺動脈弁閉鎖時のRVESVを引いた値。"],
    "hemodynamics.ejection-fraction.RV-event-defined": ["RVEF", "RVEF", "Right ventricular ejection fraction: RVSV divided by RVEDV, expressed as a percentage.", "右室駆出率。RVEDVに対する右室一回拍出量RVSVの割合。"],
    "myocardium.work.external.RV-transmural-pressure-volume-path": ["RV SW", "RV SW", "Right ventricular stroke work from transmural pressure and volume changes over one heartbeat.", "右室一回仕事量。1心拍の経壁圧と容積変化から求める、右室が血液に行う仕事。"],
    "hemodynamics.output.native-left": ["AV forward output", "AV 拍出量/分", "Forward blood volume through the aortic valve per heartbeat, converted to litres per minute.", "1心拍で左室から大動脈へ拍出された血液量を、1分あたりに換算した値。逆流は別に集計する。"],
    "hemodynamics.output.native-right": ["PV forward output", "PV 拍出量/分", "Forward blood volume through the pulmonary valve per heartbeat, converted to litres per minute.", "1心拍で右室から肺動脈へ拍出された血液量を、1分あたりに換算した値。逆流は別に集計する。"],
    "hemodynamics.output.effective-native-right": ["Effective RV CO", "右室実効CO", "Pulmonary-valve forward volume minus regurgitant volume per heartbeat, converted to litres per minute.", "肺動脈弁の1心拍の拍出量から逆流量を引き、1分あたりに換算した値。"],
    "hemodynamics.return.systemic-venous": ["Systemic venous return", "体静脈還流量/分", "Mean total flow returning to the right atrium from the vena cava and coronary veins, expressed in litres per minute.", "大静脈と冠静脈から右房へ戻る血流量の合計。1心拍の平均流量を1分あたりに換算する。"],
    "hemodynamics.return.pulmonary-venous": ["Pulmonary venous return", "肺静脈還流量/分", "Mean pulmonary venous flow into the left atrium, expressed in litres per minute.", "肺静脈から左房へ戻る1心拍の平均流量を、1分あたりに換算した値。"],
    "hemodynamics.output.systemic-tissue": ["Systemic tissue flow", "体循環血流量/分", "Mean blood flow from systemic arteries into peripheral tissues over one heartbeat, expressed in litres per minute.", "体動脈から末梢組織へ流れる1心拍の平均血流量を、1分あたりに換算した値。"],
    "hemodynamics.output.pulmonary": ["Pulmonary blood flow", "肺血流量/分", "Mean blood flow from the pulmonary artery into the lungs over one heartbeat, expressed in litres per minute.", "肺動脈から肺内の血管へ流れる1心拍の平均血流量を、1分あたりに換算した値。"],
    "hemodynamics.resistance.systemic-effective": ["SVR", "SVR", "Systemic vascular resistance: mean systemic arterial minus right atrial pressure divided by systemic tissue blood flow.", "体血管抵抗。平均体動脈圧と平均右房圧の差を、体循環の組織血流量で割った値。"],
    "hemodynamics.resistance.pulmonary-effective": ["PVR", "PVR", "Pulmonary vascular resistance: mean pulmonary arterial minus pulmonary venous pressure divided by pulmonary blood flow.", "肺血管抵抗。平均肺動脈圧と平均肺静脈圧の差を、肺血流量で割った値。"],
    "hemodynamics.compliance.pulmonary-arterial-effective": ["Pulmonary arterial compliance", "肺動脈コンプライアンス", "Pulmonary-valve net volume per heartbeat divided by pulmonary arterial pulse pressure.", "肺動脈の広がりやすさの指標。肺動脈弁の逆流を差し引いた1心拍の拍出量を、肺動脈脈圧で割った値。"],
    "coronary.pressure-perfusion.surrogate.Ao-diastolic-minus-LVEDP": ["Estimated coronary perfusion pressure", "推定冠灌流圧", "Aortic diastolic pressure minus LVEDP, used as an estimate of coronary perfusion pressure.", "冠血流を駆動する圧の目安。大動脈拡張期圧からLVEDPを引いて求める。"],
    "oxygen.pressure.alveolar": ["PAO₂", "PAO₂", "Alveolar oxygen partial pressure calculated from inspired oxygen, atmospheric pressure and carbon dioxide.", "肺胞気酸素分圧。吸入酸素濃度・大気圧・二酸化炭素分圧などから求める。"],
    "oxygen.pressure.arterial": ["PaO₂", "PaO₂", "Arterial oxygen partial pressure estimated with the effects of oxygenation and shunt.", "動脈血酸素分圧。肺での酸素化とシャントの影響を反映して求める。"],
    "oxygen.pressure.gradient.alveolar-arterial": ["A–aDO₂", "A–aDO₂", "Alveolar oxygen partial pressure minus arterial oxygen partial pressure.", "肺胞気動脈血酸素分圧較差。肺胞気酸素分圧PAO₂から動脈血酸素分圧PaO₂を引いた値。"],
    "oxygen.saturation.end-capillary": ["End-capillary O₂ saturation", "肺毛細血管血O₂飽和度", "Oxygen saturation of blood at the end of the pulmonary capillary (Sc′O₂), before shunt mixing.", "肺毛細血管終末血の酸素飽和度（Sc′O₂）。シャント血と混ざる前の、肺で酸素化された血液について求める。"],
    "oxygen.saturation.arterial": ["SaO₂", "SaO₂", "Arterial oxygen saturation after mixing oxygenated pulmonary blood with shunted blood.", "動脈血酸素飽和度。肺で酸素化された血液とシャント血が混ざった後の値。"],
    "oxygen.content.end-capillary": ["End-capillary O₂ content", "肺毛細血管血O₂含量", "Oxygen carried in 100 mL of end-pulmonary-capillary blood (Cc′O₂), including haemoglobin-bound and dissolved oxygen.", "肺毛細血管終末血100 mLに含まれる酸素量（Cc′O₂）。ヘモグロビンに結合した酸素と溶存酸素を含む。"],
    "oxygen.content.arterial": ["CaO₂", "CaO₂", "Oxygen carried in 100 mL of arterial blood, including haemoglobin-bound and dissolved oxygen.", "動脈血100 mLに含まれる酸素量。ヘモグロビンに結合した酸素と溶存酸素を含む。"],
    "oxygen.content.required-mixed-venous": ["Estimated CvO₂", "推定CvO₂", "Mixed-venous oxygen content needed to meet the target oxygen consumption at the current systemic tissue flow.", "推定混合静脈血酸素含量。現在の体循環血流で目標酸素消費量を満たしたとき、静脈血に残る酸素量。"],
    "oxygen.saturation.required-mixed-venous": ["Estimated SvO₂", "推定SvO₂", "Mixed-venous oxygen saturation corresponding to the oxygen content needed to meet target oxygen consumption.", "推定混合静脈血酸素飽和度。目標酸素消費量を満たすために必要な酸素抽出後の静脈血について求める。"],
    "oxygen.pressure.required-mixed-venous": ["Estimated PvO₂", "推定PvO₂", "Mixed-venous oxygen partial pressure corresponding to the oxygen content needed to meet target oxygen consumption.", "推定混合静脈血酸素分圧。目標酸素消費量を満たすために必要な酸素抽出後の静脈血について求める。"],
    "oxygen.consumption.target": ["Target VO₂", "目標VO₂", "Target whole-body oxygen consumption per minute, representing tissue oxygen demand.", "全身の1分あたり目標酸素消費量。組織が必要とする酸素の量。"],
    "oxygen.extraction-ratio.required": ["Required O₂ER", "必要酸素摂取率", "Target oxygen consumption divided by oxygen delivery: the fraction of supplied oxygen needed by tissues.", "目標酸素消費量を酸素供給量DO₂で割った割合。供給された酸素のうち、組織が必要とする割合を示す。"],
    "oxygen.delivery-to-consumption-ratio": ["DO₂/VO₂", "DO₂/VO₂", "Oxygen delivery divided by target oxygen consumption.", "酸素供給量DO₂を目標酸素消費量VO₂で割った比。酸素需要に対して何倍の供給があるかを示す。"],
    "pericardium.volume.heart": ["Heart volume", "心臓容積", "Total volume occupied by the heart within the pericardial sac, including chamber blood and myocardium.", "心膜内で心臓が占める容積。心腔内の血液と心筋を含む。"],
    "pericardium.volume.fluid": ["Pericardial fluid", "心嚢液量", "Volume of fluid within the pericardial sac.", "心膜腔内にある液体の量。心臓が広がる余地に影響する。"],
    "pericardium.volume.total-occupied": ["Total pericardial volume", "心膜内総容積", "Combined volume of the heart and fluid within the pericardial sac.", "心膜内で心臓と心嚢液が占める容積の合計。"],
    "pericardium.energy.stored": ["Pericardial elastic energy", "心膜の弾性エネルギー", "Elastic energy stored as the pericardial sac is stretched by its contents.", "心臓や心嚢液によって心膜が伸ばされることで蓄えられる弾性エネルギー。"],
    "coronary.power.dissipated.total": ["Coronary energy loss rate", "冠循環のエネルギー損失率", "Rate of energy dissipation caused by resistance to blood flow in the coronary circulation.", "冠循環の血管抵抗によって、単位時間あたりに失われる血流のエネルギー。"],
    "rhythm.phase.regular-sinus": ["Cardiac cycle phase", "心周期の位相", "Position within the sinus cycle, from 0 at cycle onset toward 1 at the next cycle.", "洞調律の1心拍の中での位置。周期の開始を0、次の周期の直前を1として表す。"],
  };
  const entry = copy[itemId];
  return entry ? { category: studioItemPresentationCategoryV1(itemId), label: textV1(entry[0], entry[1]), description: textV1(entry[2], entry[3]),
    ...(itemId === "hemodynamics.stroke-volume.LV-extrema" || itemId === "hemodynamics.ejection-fraction.LV-extrema"
      ? { historicalDefaultLabels: [`${entry[0]} (volume range)`, `${entry[0]}（最大−最小）`] } : {}) } : undefined;
}

/** Authored physiological meanings shared by waveform pickers and legends. */
function graphSignalPresentationV1(itemId: string): StudioItemPresentationDraftV1 | undefined {
  const signals: Readonly<Record<string, readonly [LocalizedTextV1, LocalizedTextV1]>> = {
    "hemodynamics.pressure.absolute.PA": [textV1("PAP", "PAP"), textV1("Pulmonary artery pressure throughout the cardiac cycle.", "肺動脈圧。心周期に伴って変化する肺動脈内の圧。")],
    "hemodynamics.pressure.absolute.PVein": [textV1("Pulmonary vein pressure", "肺静脈圧"), textV1("Pressure in the pulmonary veins, which carry blood from the lungs to the left atrium.", "肺から左房へ血液を戻す肺静脈内の圧。")],
    "hemodynamics.pressure.absolute.VC": [textV1("Vena cava pressure", "大静脈圧"), textV1("Pressure in the vena cava immediately upstream of the right atrium.", "右房へ流入する直前の大静脈内の圧。")],
    "pericardium.pressure.excess": [textV1("Pericardial pressure", "心膜圧"), textV1("Additional pressure around the heart generated by pericardial restraint, above the surrounding thoracic pressure.", "心膜の張りによって心臓に加わる圧。周囲の胸腔内圧からの上乗せ分を示す。")],
    "respiration.pressure.pleural": [textV1("Pleural pressure", "胸腔内圧"), textV1("Pressure in the pleural space surrounding the lungs. It contributes to the external pressure around the heart and thoracic vessels.", "肺を囲む胸膜腔内の圧。心臓や胸腔内の血管に外側から加わる圧に影響する。")],
    "respiration.pressure.alveolar": [textV1("Alveolar pressure", "肺胞内圧"), textV1("Pressure of gas within the alveoli, influencing the pressure around pulmonary vessels.", "肺胞内の気体の圧。肺血管の周囲に加わる圧に影響する。")],
    "coronary.flow.total": [textV1("Total coronary flow", "総冠血流"), textV1("Total blood flow entering the LAD, LCx and RCA territories from the aorta.", "大動脈から左前下行枝・左回旋枝・右冠動脈へ流入する血流量の合計。")],
    "coronary.flow.venous-outlet": [textV1("Coronary venous return", "冠静脈還流"), textV1("Combined coronary venous blood flow returning from the myocardium to the right atrium.", "心筋から集まった冠静脈血が右房へ戻る流量。")],
    "device.LVAD.flow": [textV1("LVAD flow", "LVAD流量"), textV1("Left ventricular assist device flow: blood transported from the left ventricle to the aorta by the pump.", "左室補助人工心臓の流量。ポンプが左室から大動脈へ送る血液量。")],
    "hemodynamics.flow.systemic.SA_Art": [textV1("Systemic tissue flow", "体循環組織血流"), textV1("Blood flow from the systemic arteries toward the body's peripheral tissues.", "体動脈から全身の末梢組織へ向かう血流量。")],
    "hemodynamics.flow.pulmonary.PA_PArt": [textV1("Pulmonary arterial flow", "肺動脈血流"), textV1("Blood flow from the pulmonary artery toward the vessels within the lungs.", "肺動脈から肺内の血管へ向かう血流量。")],
    "hemodynamics.flow.venous.VC_RA": [textV1("Systemic venous return", "体静脈還流"), textV1("Blood flow returning from the vena cava to the right atrium.", "大静脈から右房へ戻る血流量。")],
    "hemodynamics.flow.venous.PVein_LA": [textV1("Pulmonary venous return", "肺静脈還流"), textV1("Blood flow from the pulmonary veins into the left atrium. Positive values indicate flow toward the atrium; negative values indicate reversal.", "肺静脈から左房へ戻る血流量。左房へ向かう流れを正、逆向きの流れを負で示す。")],
  };
  const signal = signals[itemId];
  if (signal) return { category: studioItemPresentationCategoryV1(itemId), label: signal[0], description: signal[1] };

  const coronary = /^coronary\.(flow\.(inlet|large-arterial-outflow|large-arterial-storage-rate|layer-r1|layer-qm-internal|layer-r2)|pressure\.post-focal|pressure-loss\.focal)\.(LAD|LCx|RCA)(?:\.(subepicardial|subendocardial))?$/.exec(itemId);
  if (!coronary) return undefined;
  const kind = coronary[2] ?? coronary[1]!;
  const territory = coronary[3]!, artery = CORONARY_TERRITORY_V1[territory]!;
  const names = {
    inlet: [textV1(`${territory} flow`, `${territory}血流`), textV1(`Blood flow entering the ${artery.en} (${territory}) territory from the aorta.`, `大動脈から${artery.ja}（${territory}）領域へ流入する血流量。`)],
    "large-arterial-outflow": [textV1(`${territory} distal flow`, `${territory}末梢流入量`), textV1(`Blood flow leaving the large artery in the ${artery.en} (${territory}) territory and entering the myocardial circulation.`, `${artery.ja}（${territory}）領域の太い冠動脈から、心筋内の血管へ入る流量。`)],
    "large-arterial-storage-rate": [textV1(`${territory} arterial volume change`, `${territory}動脈血液量変化`), textV1(`Rate of change of blood volume stored in the large artery of the ${artery.en} (${territory}) territory. Positive values indicate filling; negative values indicate emptying.`, `${artery.ja}（${territory}）領域の太い冠動脈に蓄えられる血液量の変化速度。増加を正、減少を負で示す。`)],
    "pressure.post-focal": [textV1(`${territory} distal pressure`, `${territory}狭窄後圧`), textV1(`Coronary pressure immediately downstream of the focal narrowing in the ${artery.en} (${territory}).`, `${artery.ja}（${territory}）の局所的な狭窄を通過した直後の冠動脈圧。`)],
    "pressure-loss.focal": [textV1(`${territory} stenosis ΔP`, `${territory}狭窄部圧較差`), textV1(`Pressure drop across the focal narrowing in the ${artery.en} (${territory}), from upstream to downstream.`, `${artery.ja}（${territory}）の狭窄部前後の圧較差。狭窄を通過する際に失われる圧を示す。`)],
  } as const;
  const named = names[kind as keyof typeof names];
  if (named) return { category: "coronary", label: named[0], description: named[1], aliases: [territory, artery.en, artery.ja] };
  if (!coronary[4]) return undefined;
  const outer = coronary[4] === "subepicardial";
  const layer = textV1(outer ? "outer myocardium" : "inner myocardium", outer ? "心外膜側" : "心内膜側");
  const segment = kind === "layer-r1" ? textV1("arterial inflow", "動脈側流入")
    : kind === "layer-r2" ? textV1("venous outflow", "静脈側流出") : textV1("microvascular flow", "微小血管内血流");
  return {
    category: "coronary",
    label: textV1(`${territory} ${segment.en} (${outer ? "outer" : "inner"})`, `${territory} ${layer.ja}${segment.ja}`),
    description: textV1(`${artery.en} (${territory}) territory, ${layer.en}: ${kind === "layer-r1" ? "blood entering from the arterial side" : kind === "layer-r2" ? "blood leaving toward the coronary veins" : "blood passing through the resistance vessels within the myocardium"}.`, `${artery.ja}（${territory}）領域の${layer.ja}で、${kind === "layer-r1" ? "動脈側から心筋内へ入る" : kind === "layer-r2" ? "心筋内から冠静脈側へ出る" : "心筋内の抵抗血管を通過する"}血流量。`),
    aliases: [territory, artery.en, artery.ja, coronary[4], kind === "layer-r1" ? "R1" : kind === "layer-r2" ? "R2" : "Qm"],
  };
}

export function studioGraphSeriesLabelV1(seriesId: string, presentation: ResolvedStudioItemPresentationV1): string {
  // Keep the familiar chamber/valve abbreviations in the context of a graph.
  if (["LV", "RV", "LA", "RA", "LVP", "RVP", "LAP", "RAP", "AoP", "PAP", "ABP", "SAP", "MV", "TV", "PV", "LAD", "LCx", "RCA", "LVAD"].includes(seriesId)) return seriesId;
  if (seriesId === "AoV") return "AV";
  return presentation.label;
}

/** Reading context is a presentation decision, independent of numerical signal/metric kind. */
export function studioOutputReadingV1(itemId: string): "waveform" | "current" | undefined {
  if (itemId === "rhythm.heart-rate.instantaneous" || itemId === "pericardium.volume.fluid" ||
      /^respiration\.pressure\.(pleural|alveolar)$/.test(itemId) ||
      /^coronary\.tone-resistance-scale\.(LAD|LCx|RCA)\.(subepicardial|subendocardial)$/.test(itemId)) return "current";
  if (/^hemodynamics\.volume\.(LA|LV|RA|RV)$/.test(itemId) ||
      /^hemodynamics\.pressure\.(absolute|transmural)\.(LA|LV|RA|RV|Ao|SA|PA|PVein|VC|aortic-proximal-constitutive-port)$/.test(itemId) ||
      /^hemodynamics\.flow\.(valve|systemic|pulmonary|venous)\./.test(itemId) ||
      /^hemodynamics\.pressure-gradient\.valve\.(local-hydraulic|vena-contracta-bernoulli)\./.test(itemId) ||
      /^coronary\.(flow\.|pressure\.post-focal\.|pressure-loss\.focal\.|power\.)/.test(itemId) ||
      /^pericardium\.(pressure\.excess|volume\.(heart|total-occupied)|energy\.stored)$/.test(itemId) ||
      itemId === "device.LVAD.flow" || itemId === "rhythm.phase.regular-sinus") return "waveform";
  return undefined;
}

export function studioPressureVolumeDescriptionV1(volumeOutputId: string, pressureOutputId: string, locale: string): string {
  const resolve = (itemId: string) => resolveStudioItemPresentationV1({ kind: "output", itemId, fallbackEnglishLabel: itemId, locale });
  const volume = resolve(volumeOutputId), pressure = resolve(pressureOutputId);
  if (!volume.description || !pressure.description) return "";
  return locale.startsWith("ja")
    ? `圧容積ループ。横軸は${volume.label}、縦軸は${pressure.label}。${pressure.description}。`
    : `Pressure–volume loop: ${volume.label} on the horizontal axis and ${pressure.label} on the vertical axis. ${pressure.description}.`;
}

export function studioItemPresentationCategoryV1(
  itemId: string,
): StudioItemPresentationCategoryV1 {
  const normalized = itemId.toLocaleLowerCase();
  if (normalized.startsWith("rhythm.") || normalized.includes("heart-rate")) {
    return "rhythm";
  }
  if (
    normalized.startsWith("ventilation.") ||
    normalized.startsWith("respiration.") ||
    normalized.includes("pleural") ||
    normalized.includes("alveolar")
  )
    return "ventilation";
  if (normalized.startsWith("oxygen.")) return "oxygen";
  if (normalized.startsWith("myocardium.")) return "myocardium";
  if (normalized.startsWith("pericardium.")) return "pericardium";
  if (
    normalized.startsWith("valve.") ||
    normalized.includes(".valve-") ||
    normalized.includes(".valve.") ||
    normalized.includes("regurgitant")
  )
    return "valves";
  if (normalized.startsWith("coronary.")) return "coronary";
  if (
    normalized.startsWith("mcs.") ||
    normalized.startsWith("device.") ||
    normalized.includes("mechanical-support") ||
    normalized.includes("impella") ||
    normalized.includes("ecmo")
  )
    return "mechanicalSupport";
  if (normalized.startsWith("hemodynamics.")) return "hemodynamics";
  return "advanced";
}

export function resolveStudioItemPresentationV1(
  input: Readonly<{
    kind: "control" | "output";
    itemId: string;
    fallbackEnglishLabel: string;
    locale: string;
    catalogFacts?: StudioItemPresentationCatalogFactsV1;
  }>,
): ResolvedStudioItemPresentationV1 {
  const authored = cardiorespiratoryItemPresentationV1(input.kind, input.itemId) ?? (
    input.kind === "control"
      ? (CONTROL_PRESENTATION_V1[input.itemId] ??
        patternedControlPresentationV1(input.itemId))
      : (OUTPUT_PRESENTATION_V1[input.itemId] ??
        patternedOutputPresentationV1(input.itemId)));
  const locale: StudioItemPresentationLocaleV1 = input.locale.startsWith("ja")
    ? "ja"
    : "en";
  const canonicalEnglishLabel =
    authored?.label?.en ?? input.fallbackEnglishLabel;
  const label = authored?.label?.[locale] ?? canonicalEnglishLabel;
  const baseDescription = dictionaryDescriptionV1(
    authored?.description?.[locale] ?? "",
  );
  const description = dictionaryDescriptionV1(
    input.kind === "control" &&
        input.catalogFacts?.controlChangeSemantics === "cold-restart"
      ? locale === "ja"
        ? [baseDescription, "変更すると、経過時間を0に戻してシミュレーションを最初からやり直す"].filter(Boolean).join("。")
        : [baseDescription, "Changing this setting resets elapsed time to zero and restarts the simulation"].filter(Boolean).join(". ")
      : baseDescription,
  );
  const aliases = Object.freeze([...(authored?.aliases ?? [])]);
  const searchTerms = Object.freeze(
    [
      input.itemId,
      input.fallbackEnglishLabel,
      canonicalEnglishLabel,
      authored?.label?.ja,
      authored?.description?.en,
      authored?.description?.ja,
      description,
      ...aliases,
      ...(authored?.historicalDefaultLabels ?? []),
      ...(input.kind === "output" && studioOutputReadingV1(input.itemId) === "waveform" ? ["波形", "瞬時値", "現在値", "waveform", "instantaneous"] : []),
      ...(input.kind === "output" && studioOutputReadingV1(input.itemId) === "current" ? ["現在値", "current value"] : []),
    ].filter((term): term is string => term !== undefined),
  );
  return Object.freeze({
    itemId: input.itemId,
    kind: input.kind,
    category:
      authored?.category ?? studioItemPresentationCategoryV1(input.itemId),
    label,
    canonicalEnglishLabel,
    description,
    inlineDisclosure: authored?.inlineDisclosure === true,
    aliases,
    searchTerms,
  });
}

function dictionaryDescriptionV1(value: string): string {
  return value.trim().replace(/[。.!]+$/u, "");
}

export function resolveStudioSurfaceItemLabelV1(
  input: Readonly<{
    storedLabel: string | undefined;
    legacyDefaultLabel: string;
    presentation: ResolvedStudioItemPresentationV1;
  }>,
): string {
  if (
    input.storedLabel === undefined ||
    input.storedLabel === input.legacyDefaultLabel ||
    input.storedLabel === input.presentation.canonicalEnglishLabel ||
    historicalStudioItemDefaultLabelsV1(input.presentation).includes(
      input.storedLabel,
    )
  )
    return input.presentation.label;
  return input.storedLabel;
}

function historicalStudioItemDefaultLabelsV1(
  presentation: ResolvedStudioItemPresentationV1,
): readonly string[] {
  const authored = presentation.kind === "control"
    ? CONTROL_PRESENTATION_V1[presentation.itemId] ?? patternedControlPresentationV1(presentation.itemId)
    : OUTPUT_PRESENTATION_V1[presentation.itemId] ?? patternedOutputPresentationV1(presentation.itemId);
  return authored?.historicalDefaultLabels ?? Object.freeze([]);
}

export function normalizeStudioItemSearchTextV1(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[ァ-ヶ]/g, (character) =>
      String.fromCharCode(character.charCodeAt(0) - 0x60),
    )
    .replace(/\s+/g, " ")
    .trim();
}

export function studioItemPresentationMatchesQueryV1(
  presentation: ResolvedStudioItemPresentationV1,
  query: string,
  extraTerms: readonly (string | undefined)[] = [],
): boolean {
  const tokens = normalizeStudioItemSearchTextV1(query)
    .split(" ")
    .filter(Boolean);
  if (tokens.length === 0) return true;
  const haystack = normalizeStudioItemSearchTextV1(
    [
      ...presentation.searchTerms,
      ...extraTerms.filter((term): term is string => term !== undefined),
    ].join(" "),
  );
  return tokens.every((token) => haystack.includes(token));
}

import React from "react";
import { SimulationIconButtonV3 } from "@/components/ui/SimulationIconButtonV3";
import { ModelReferenceLinksV1 } from "@/components/model/ModelReferenceLinksV1";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  FileText,
  Info,
  LoaderCircle,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import type { ModelContractV2 } from "@/studio/contracts/v2/model";
import { MAIN_WIRE_PRESSURE_CROSSING_PV_ANALYSIS_V1_ID } from "@/analysis/methods/mainWire/MainWireStructuralAnalysisContractV3";
import { CARDIORESPIRATORY_MECHANICAL_ANALYSIS_V1_ID } from "@/analysis/methods/cardiorespiratory/CardiorespiratoryMechanicalAnalysisV1";

/** Disclosure follows the pinned measurement, including on public routes. */
export function workbenchAnalysisLimitationsV3(analysisId: string, locale: string): readonly string[] {
  if (analysisId === CARDIORESPIRATORY_MECHANICAL_ANALYSIS_V1_ID) return [locale === "ja"
    ? "このPV解析は、取得時点の胸膜圧、2領域の肺胞圧と肺血管抵抗、および血管トーンを固定した条件で計算します。呼吸周期の平均応答や、ガス交換を含む全身の定常状態を表すものではありません。独立した解析用の計算で測定し、元の保存状態やライブ計算は変更しません。"
    : "This PV analysis holds the captured pleural pressure, both regional alveolar pressures and pulmonary vascular resistances, and vascular tone fixed. It does not represent a breath-averaged response or whole-system gas-exchange settlement. Measurements use isolated analysis sessions without changing the source capture or live calculation."];
  if (analysisId !== MAIN_WIRE_PRESSURE_CROSSING_PV_ANALYSIS_V1_ID) return [];
  return [locale === "ja"
    ? "PV解析では、準定常弁の前向き駆出が終わる位置を、弁前後の圧差のゼロ交差から補間します。実際の弁尖の接触時刻を測るものではありません。ライブ計算や保存状態は変更せず、独立した解析用の計算で測定します。"
    : "PV analysis interpolates the end of forward ejection at the quasi-steady valve's signed pressure-difference zero crossing. This is not a measurement of physical leaflet contact. Measurements use isolated analysis sessions without changing the live calculation or saved state."];
}

export type WorkbenchSimulationInfoModelV3 = Readonly<{
  contract: ModelContractV2;
  publicName: string;
  shortLabel: string;
  description: string;
  documentationHref?: string;
  documentationNote?: string;
  baselineValidation?: Readonly<{
    summary: string;
    items: readonly Readonly<{
      itemId: string;
      label: string;
      value: string;
      detail: string;
      status?: "reference" | "warning";
    }>[];
  }>;
}>;

export type WorkbenchSimulationInfoScenarioV3 = Readonly<{
  scenarioId: string;
  label: string;
  colorHex: string;
  active: boolean;
  runtime: "live" | "paused";
  settlement: "not-assessed" | "checking" | "settled";
  numericalSafety: "not-checked" | "checking" | "passed" | "unavailable";
  analysis: "idle" | "checking" | "unavailable";
}>;

/** Snapshot admission proves executable consistency, never settlement. */
export function workbenchSnapshotChecksV3(
  state: "idle" | "creating" | "created" | "error" | null,
): Pick<WorkbenchSimulationInfoScenarioV3, "settlement" | "numericalSafety"> {
  return Object.freeze({
    settlement: "not-assessed",
    numericalSafety: state === "created" ? "passed"
      : state === "creating" ? "checking"
        : state === "error" ? "unavailable" : "not-checked",
  });
}

export type WorkbenchSimulationInfoTabV3 = "status" | "model" | "note";

type WorkbenchSimulationInfoNoteV3 = Readonly<{
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}>;

type WorkbenchSimulationInfoPanelPropsV3 = Readonly<{
  activeTab: WorkbenchSimulationInfoTabV3;
  showStatus?: boolean;
  currentModelId: string;
  limitations: readonly string[];
  models: readonly WorkbenchSimulationInfoModelV3[];
  note?: WorkbenchSimulationInfoNoteV3;
  onClose: () => void;
  onSelectModel?: (modelId: string) => void;
  onTabChange: (tab: WorkbenchSimulationInfoTabV3) => void;
  scenarios: readonly WorkbenchSimulationInfoScenarioV3[];
}>;

const FOCUSABLE_SELECTOR_V3 = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export function WorkbenchSimulationInfoV3({
  currentModelId,
  limitations,
  models,
  note,
  onSelectModel,
  scenarios,
  initialTab = "status",
  showStatus = true,
}: Readonly<{
  initialTab?: WorkbenchSimulationInfoTabV3;
  showStatus?: boolean;
  currentModelId: string;
  limitations: readonly string[];
  models: readonly WorkbenchSimulationInfoModelV3[];
  note?: WorkbenchSimulationInfoNoteV3;
  onSelectModel?: (modelId: string) => void;
  scenarios: readonly WorkbenchSimulationInfoScenarioV3[];
}>) {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const [activeTab, setActiveTab] =
    React.useState<WorkbenchSimulationInfoTabV3>(initialTab);
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  const dialogRef = React.useRef<HTMLElement | null>(null);
  const requiresAttention = scenarios.some(
    ({ analysis, numericalSafety }) =>
      analysis === "unavailable" || numericalSafety === "unavailable",
  );

  React.useEffect(() => {
    if (!open || typeof document === "undefined") return undefined;
    const previous = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = window.requestAnimationFrame(() => {
      dialogRef.current
        ?.querySelector<HTMLElement>("[data-simulation-info-initial-focus]")
        ?.focus();
    });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const dialog = dialogRef.current;
      if (dialog === null) return;
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR_V3),
      ).filter((element) => !element.hidden && element.tabIndex !== -1);
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown, true);
      document.body.style.overflow = previousBodyOverflow;
      (previous?.isConnected ? previous : triggerRef.current)?.focus();
    };
  }, [open]);

  if (models.length === 0) return null;

  const dialog = open && typeof document !== "undefined"
    ? createPortal(
      <div
        className="model-disclosure-backdrop fixed inset-0 z-[100] flex items-end justify-center bg-black/45 sm:items-center sm:p-4"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) setOpen(false);
        }}
      >
        <section
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label={t("workbench.editor.simulationInfo.title")}
          tabIndex={-1}
          className="model-disclosure-panel flex max-h-[min(88dvh,48rem)] w-full flex-col overflow-hidden rounded-t-2xl border border-wb-line-strong bg-wb-panel shadow-2xl outline-none sm:max-w-2xl sm:rounded-xl"
          onMouseDown={(event) => event.stopPropagation()}
        >
          <WorkbenchSimulationInfoPanelV3
            activeTab={activeTab}
            showStatus={showStatus}
            currentModelId={currentModelId}
            limitations={limitations}
            models={models}
            note={note}
            onClose={() => setOpen(false)}
            onSelectModel={onSelectModel === undefined
              ? undefined
              : (modelId) => {
                  setOpen(false);
                  onSelectModel(modelId);
                }}
            onTabChange={setActiveTab}
            scenarios={scenarios}
          />
        </section>
      </div>,
      document.body,
    )
    : null;

  return (
    <>
      <SimulationIconButtonV3
        buttonRef={triggerRef}
        label={t("workbench.editor.simulationInfo.title")}
        type="button"
        className={`workbench-header-action relative inline-flex h-9 w-9 shrink-0 items-center justify-center ${
          requiresAttention ? "text-wb-warning" : ""
        }`}
        aria-label={t("workbench.editor.simulationInfo.title")}
        aria-haspopup="dialog"
        aria-expanded={open}
        data-testid="workbench-simulation-info-trigger-v3"
        onClick={() => {
          setActiveTab(initialTab);
          setOpen(true);
        }}
      >
        {requiresAttention ? (
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
        ) : (
          <Info className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        {requiresAttention && (
          <span
            className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-wb-warning ring-2 ring-[var(--wb-header-bg)]"
            aria-hidden="true"
          />
        )}
      </SimulationIconButtonV3>
      {dialog}
    </>
  );
}

export function WorkbenchSimulationInfoPanelV3({
  activeTab,
  showStatus = true,
  currentModelId,
  limitations,
  models,
  note,
  onClose,
  onSelectModel,
  onTabChange,
  scenarios,
}: WorkbenchSimulationInfoPanelPropsV3) {
  const { t } = useTranslation();
  const current = models.find(({ contract }) =>
    contract.modelId === currentModelId) ?? models[0]!;
  const titleId = React.useId();
  const statusTabId = React.useId();
  const modelTabId = React.useId();
  const noteTabId = React.useId();
  const statusPanelId = React.useId();
  const modelPanelId = React.useId();
  const notePanelId = React.useId();

  const selectAdjacentTab = (
    event: React.KeyboardEvent<HTMLButtonElement>,
  ) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const tabs: WorkbenchSimulationInfoTabV3[] = note === undefined
      ? (showStatus ? ["status", "model"] : ["model"])
      : (showStatus ? ["status", "model", "note"] : ["model", "note"]);
    const direction = event.key === "ArrowRight" ? 1 : -1;
    const currentIndex = tabs.indexOf(activeTab);
    const next = tabs[(currentIndex + direction + tabs.length) % tabs.length]!;
    onTabChange(next);
    window.requestAnimationFrame(() => {
      document.querySelector<HTMLButtonElement>(
        `[data-simulation-info-tab="${next}"]`,
      )?.focus();
    });
  };

  return (
    <>
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-wb-line px-5 py-3.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <Info className="h-4 w-4 shrink-0 text-wb-subtle" aria-hidden="true" />
          <h2 id={titleId} className="truncate text-sm font-semibold text-wb-text">
            {t("workbench.editor.simulationInfo.title")}
          </h2>
        </div>
        <button
          type="button"
          data-simulation-info-initial-focus
          onClick={onClose}
          aria-label={t("common.close")}
          title={t("common.close")}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-wb-subtle transition-[color,background-color,transform] duration-150 hover:bg-wb-hover hover:text-wb-text active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wb-accent"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </header>

      <div
        hidden={!showStatus && note === undefined}
        className={`${!showStatus && note === undefined ? "hidden" : "flex"} shrink-0 gap-5 border-b border-wb-line px-5`}
        role="tablist"
        aria-label={t("workbench.editor.simulationInfo.title")}
      >
        {showStatus && <SimulationInfoTabV3
          active={activeTab === "status"}
          controls={statusPanelId}
          id={statusTabId}
          label={t("workbench.editor.simulationInfo.statusTab")}
          onClick={() => onTabChange("status")}
          onKeyDown={selectAdjacentTab}
          tab="status"
        />}
        <SimulationInfoTabV3
          active={activeTab === "model"}
          controls={modelPanelId}
          id={modelTabId}
          label={t("workbench.editor.simulationInfo.modelTab")}
          onClick={() => onTabChange("model")}
          onKeyDown={selectAdjacentTab}
          tab="model"
        />
        {note !== undefined && (
          <SimulationInfoTabV3
            active={activeTab === "note"}
            controls={notePanelId}
            id={noteTabId}
            label={t("workbench.editor.note")}
            onClick={() => onTabChange("note")}
            onKeyDown={selectAdjacentTab}
            tab="note"
          />
        )}
      </div>

      <div className="min-h-0 overflow-y-auto px-5 py-5">
        {activeTab === "status" ? (
          <div
            id={statusPanelId}
            role="tabpanel"
            aria-labelledby={statusTabId}
            className="grid gap-4"
            data-testid="workbench-simulation-status-panel-v3"
          >
            <div>
              <h3 className="text-xs font-semibold text-wb-text">
                {t("workbench.editor.simulationInfo.scenarioStatus", {
                  count: scenarios.length,
                })}
              </h3>
              <p className="mt-1 text-[11px] leading-5 text-wb-muted">
                {t("workbench.editor.simulationInfo.statusDescription")}
              </p>
            </div>

            <div className="overflow-hidden rounded-xl bg-wb-soft">
              {scenarios.map((scenario, index) => (
                <ScenarioStatusRowV3
                  key={scenario.scenarioId}
                  scenario={scenario}
                  showActive={scenarios.length > 1}
                  separated={index > 0}
                />
              ))}
            </div>

            <p className="rounded-lg bg-wb-active px-3 py-2.5 text-[11px] leading-5 text-wb-muted">
              {t("workbench.editor.simulationInfo.statusNotice")}
            </p>
          </div>
        ) : activeTab === "model" ? (
          <div
            id={modelPanelId}
            role="tabpanel"
            aria-labelledby={modelTabId}
            className="grid gap-5"
            data-testid="workbench-simulation-model-panel-v3"
          >
            <section className="rounded-xl bg-wb-soft p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-wb-text">
                    {current.publicName}
                  </h3>
                  <p className="mt-0.5 text-[10px] font-medium text-wb-subtle">
                    {current.shortLabel}
                  </p>
                </div>
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-wb-accent" aria-hidden="true" />
              </div>
              <p className="mt-3 text-xs leading-5 text-wb-muted">
                {current.description}
              </p>
              {current.documentationHref !== undefined && (
                <ModelReferenceLinksV1
                  href={current.documentationHref}
                  label={t("workbench.editor.simulationInfo.modelDocumentation")}
                  testId="workbench-model-documentation-link-v3"
                />
              )}
            </section>

            {current.documentationNote !== undefined && (
              <p className="text-[11px] leading-5 text-wb-muted">{current.documentationNote}</p>
            )}
            {current.baselineValidation !== undefined && (
              <section
                data-testid="workbench-baseline-validation-v3"
                className="overflow-hidden rounded-xl border border-wb-line bg-wb-soft"
              >
                <div className="flex items-start gap-2.5 border-b border-wb-line px-4 py-3">
                  <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-wb-accent/15 text-wb-accent">
                    <Check className="h-3 w-3" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-xs font-semibold text-wb-text">
                      {t("workbench.editor.simulationInfo.baselineValidationTitle")}
                    </h3>
                    <p className="mt-0.5 text-[10px] leading-4 text-wb-subtle">
                      {current.baselineValidation.summary}
                    </p>
                  </div>
                </div>
                <dl className="grid grid-cols-1 sm:grid-cols-2">
                  {current.baselineValidation.items.map((item, index) => (
                    <div
                      key={item.itemId}
                      title={item.detail}
                      className={`flex min-h-9 min-w-0 items-center justify-between gap-3 px-4 py-2 text-[11px] ${
                        index > 0 ? "border-t border-wb-line" : ""
                      } ${
                        index === 1
                          ? "sm:border-t-0"
                          : ""
                      } ${index % 2 === 1 ? "sm:border-l sm:border-wb-line" : ""}`}
                    >
                      <dt className="min-w-0 text-wb-muted">{item.label}</dt>
                      <dd className="flex min-w-0 max-w-[65%] items-center justify-end gap-1.5 text-right font-medium tabular-nums text-wb-text">
                        {item.status === "warning"
                          ? <AlertTriangle className="h-3 w-3 shrink-0 text-amber-400" aria-hidden="true" />
                          : item.status === "reference"
                            ? <Info className="h-3 w-3 shrink-0 text-wb-subtle" aria-hidden="true" />
                            : <Check className="h-3 w-3 shrink-0 text-wb-accent" aria-hidden="true" />}
                        <span className="min-w-0 break-words">{item.value}</span>
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}

            <section>
              <h3 className="text-xs font-semibold text-wb-text">
                {t("workbench.editor.simulationInfo.validationTitle")}
              </h3>
              <p className="mt-2 text-xs leading-5 text-wb-muted">
                {t("workbench.editor.simulationInfo.validationDescription")}
              </p>
            </section>

            <details className="group border-t border-wb-line pt-4">
              <summary className="flex min-h-9 cursor-pointer list-none items-center justify-between gap-3 rounded-md text-xs font-semibold text-wb-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wb-accent">
                <span>
                  {t("workbench.editor.simulationInfo.limitationsTitle")}
                  <span className="ml-1.5 font-normal text-wb-subtle">
                    ({limitations.length})
                  </span>
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-wb-subtle transition-transform duration-150 group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true" />
              </summary>
              <ul className="mt-2 grid gap-2.5 pb-1 text-xs leading-5 text-wb-muted">
                {limitations.map((limitation, index) => (
                  <li key={`${index}:${limitation}`} className="flex gap-2.5">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-wb-subtle" aria-hidden="true" />
                    <span>{limitation}</span>
                  </li>
                ))}
              </ul>
            </details>

            {models.length > 1 && onSelectModel !== undefined && (
              <section className="border-t border-wb-line pt-4">
                <h3 className="text-xs font-semibold text-wb-text">
                  {t("workbench.editor.simulationInfo.chooseModel")}
                </h3>
                <div className="mt-2 grid gap-1">
                  {models.map((model) => {
                    const selected = model.contract.modelId === currentModelId;
                    return (
                      <button
                        key={model.contract.modelId}
                        type="button"
                        disabled={selected}
                        className="flex min-h-11 items-center justify-between gap-3 rounded-lg px-3 text-left transition-[color,background-color,transform] duration-150 hover:bg-wb-hover active:scale-[0.99] disabled:cursor-default disabled:bg-wb-active focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wb-accent"
                        onClick={() => onSelectModel(model.contract.modelId)}
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-xs font-semibold text-wb-text">
                            {model.publicName}
                          </span>
                          <span className="block text-[10px] text-wb-subtle">
                            {model.shortLabel}
                          </span>
                        </span>
                        {selected && (
                          <Check className="h-3.5 w-3.5 shrink-0 text-wb-accent" aria-hidden="true" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        ) : note !== undefined ? (
          <div
            id={notePanelId}
            role="tabpanel"
            aria-labelledby={noteTabId}
            className="grid gap-5"
            data-testid="workbench-simulation-note-panel-v3"
          >
            <section>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-wb-accent" aria-hidden="true" />
                <h3 className="text-xs font-semibold text-wb-text">
                  {t("workbench.editor.note")}
                </h3>
              </div>
              <textarea
                value={note.value}
                placeholder={note.placeholder}
                className="mt-3 min-h-52 w-full resize-y rounded-xl bg-wb-soft px-4 py-3 text-sm leading-7 text-wb-text outline-none placeholder:text-wb-subtle focus:ring-2 focus:ring-wb-accent"
                onChange={(event) => note.onChange(event.currentTarget.value)}
              />
            </section>
            <details className="group border-t border-wb-line pt-4">
              <summary className="flex min-h-9 cursor-pointer list-none items-center justify-between gap-3 rounded-md text-xs font-semibold text-wb-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wb-accent">
                <span>
                  {t("workbench.editor.simulationInfo.limitationsTitle")}
                  <span className="ml-1.5 font-normal text-wb-subtle">
                    ({limitations.length})
                  </span>
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-wb-subtle transition-transform duration-150 group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true" />
              </summary>
              <ul className="mt-2 grid gap-2.5 pb-1 text-xs leading-5 text-wb-muted">
                {limitations.map((limitation, index) => (
                  <li key={`${index}:${limitation}`} className="flex gap-2.5">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-wb-subtle" aria-hidden="true" />
                    <span>{limitation}</span>
                  </li>
                ))}
              </ul>
            </details>
          </div>
        ) : null}
      </div>
    </>
  );
}

function SimulationInfoTabV3({
  active,
  controls,
  id,
  label,
  onClick,
  onKeyDown,
  tab,
}: Readonly<{
  active: boolean;
  controls: string;
  id: string;
  label: string;
  onClick: () => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLButtonElement>) => void;
  tab: WorkbenchSimulationInfoTabV3;
}>) {
  return (
    <button
      type="button"
      role="tab"
      id={id}
      aria-selected={active}
      aria-controls={controls}
      tabIndex={active ? 0 : -1}
      data-simulation-info-tab={tab}
      className={`relative min-h-11 text-xs font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-wb-accent ${
        active ? "text-wb-text" : "text-wb-muted hover:text-wb-text"
      }`}
      onClick={onClick}
      onKeyDown={onKeyDown}
    >
      {label}
      {active && (
        <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-wb-accent" aria-hidden="true" />
      )}
    </button>
  );
}

function ScenarioStatusRowV3({
  scenario,
  separated,
  showActive,
}: Readonly<{
  scenario: WorkbenchSimulationInfoScenarioV3;
  separated: boolean;
  showActive: boolean;
}>) {
  const { t } = useTranslation();
  return (
    <article
      className={`px-3.5 py-3.5 ${separated ? "border-t border-wb-line" : ""}`}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/10"
          style={{ backgroundColor: scenario.colorHex }}
          aria-hidden="true"
        />
        <h4 className="min-w-0 flex-1 truncate text-xs font-semibold text-wb-text">
          {scenario.label}
        </h4>
        {showActive && scenario.active && (
          <span className="text-[9px] font-medium text-wb-subtle">
            {t("workbench.editor.simulationInfo.activeScenario")}
          </span>
        )}
      </div>
      <dl className="mt-3 grid grid-cols-1 gap-2 text-[10px] sm:grid-cols-3 sm:gap-3">
        <StatusDatumV3
          label={t("workbench.editor.simulationInfo.sessionStatus")}
          tone={scenario.runtime === "live" ? "accent" : "muted"}
          value={t(
            scenario.runtime === "live"
              ? "workbench.editor.simulationInfo.live"
              : "workbench.editor.simulationInfo.paused",
          )}
        />
        <StatusDatumV3
          label={t("workbench.editor.simulationInfo.settlementStatus")}
          pending={scenario.settlement === "checking"}
          tone={scenario.settlement === "settled" ? "success" : "muted"}
          value={t(
            scenario.settlement === "settled"
              ? "workbench.editor.simulationInfo.settled"
              : scenario.settlement === "checking"
                ? "workbench.editor.simulationInfo.checking"
                : "workbench.editor.simulationInfo.notAssessed",
          )}
        />
        <StatusDatumV3
          label={t("workbench.editor.simulationInfo.numericalStatus")}
          pending={scenario.numericalSafety === "checking"}
          tone={
            scenario.numericalSafety === "passed"
              ? "success"
              : scenario.numericalSafety === "unavailable"
                ? "warning"
                : "muted"
          }
          value={t(
            scenario.numericalSafety === "passed"
              ? "workbench.editor.simulationInfo.passed"
              : scenario.numericalSafety === "checking"
                ? "workbench.editor.simulationInfo.checking"
                : scenario.numericalSafety === "unavailable"
                  ? "workbench.editor.simulationInfo.couldNotConfirm"
                  : "workbench.editor.simulationInfo.notChecked",
          )}
        />
      </dl>
      {scenario.analysis !== "idle" && (
        <p
          className={`mt-2.5 flex items-center gap-1.5 text-[10px] ${
            scenario.analysis === "unavailable"
              ? "text-wb-warning"
              : "text-wb-muted"
          }`}
          role="status"
        >
          {scenario.analysis === "checking" && (
            <LoaderCircle className="h-3 w-3 animate-spin motion-reduce:animate-none" aria-hidden="true" />
          )}
          {t(
            scenario.analysis === "checking"
              ? "workbench.editor.simulationInfo.analysisRunning"
              : "workbench.editor.simulationInfo.analysisUnavailable",
          )}
        </p>
      )}
    </article>
  );
}

function StatusDatumV3({
  label,
  pending = false,
  tone,
  value,
}: Readonly<{
  label: string;
  pending?: boolean;
  tone: "accent" | "muted" | "success" | "warning";
  value: string;
}>) {
  const toneClass = tone === "success"
    ? "bg-emerald-500"
    : tone === "warning"
      ? "bg-wb-warning"
      : tone === "accent"
        ? "bg-wb-accent"
        : "bg-wb-subtle";
  return (
    <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-center gap-2 sm:grid-cols-1 sm:gap-1">
      <dt className="text-wb-subtle">{label}</dt>
      <dd className="flex min-w-0 items-center gap-1.5 font-medium text-wb-text">
        {pending ? (
          <LoaderCircle className="h-2.5 w-2.5 shrink-0 animate-spin text-wb-accent motion-reduce:animate-none" aria-hidden="true" />
        ) : (
          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${toneClass}`} aria-hidden="true" />
        )}
        <span className="truncate">{value}</span>
      </dd>
    </div>
  );
}

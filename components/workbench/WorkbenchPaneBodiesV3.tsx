import React from "react";
import { SimulationPanePlaceholderV1, SimulationPreparationV1 } from "@/components/simulation/SimulationPreparationV1";
import { WorkbenchLastMeasuredOutputsV1 } from "./presentation/WorkbenchLastMeasuredOutputsV1";
import { incrementWorkbenchPerformanceCounterV3 } from "./runtime/WorkbenchPerformanceDiagnosticsV3";
import { useTranslation } from "react-i18next";

import {
  ExperimentNumericControlV3,
  ExperimentOutputGridV3,
  ExperimentPaneAddItemButtonV3,
} from "@/components/workbench/ExperimentPanePresentationV3";
import { WorkbenchPaneBindingButtonV3, WorkbenchPaneContextRowV3 } from "@/components/workbench/WorkbenchPaneBindingV3";
import {
  resolveWorkbenchControlPaneScenarioIdsV3,
} from "@/components/workbench/WorkbenchSurfaceV3";
import {
  materializeWorkbenchOutputPresentationItemsV3,
  resolveWorkbenchControlPresentationV3,
} from "@/components/workbench/WorkbenchItemPresentation";
import type { MainWirePeriodicPvaV1 } from "@/analysis/methods/mainWire/MainWirePeriodicPvaV1";
import type {
  ExperimentSurfaceControlPaneV2,
  ExperimentSurfaceOutputPaneV2,
} from "@/studio/contracts/v2/content";
import type { ModelContractV2 } from "@/studio/contracts/v2/model";
import type { ExactModelControlValuesV1 } from
  "@/studio/application/model/ExactModelControlValuesV1";
import type { StudioSimulationFrameV2, StudioSimulationAnalysisV2 } from "@/studio/contracts/v2/simulation";
import type { StudioSimulationWorkerScenarioDescriptorV2 } from "@/studio/workers/StudioSimulationWorkerProtocolV2";

export type WorkbenchStatusV3 =
  | Readonly<{ kind: "loading" }>
  | Readonly<{
      kind: "live";
      contract: ModelContractV2;
      frame: StudioSimulationFrameV2;
      /** Frozen presentation remains visible; this is not a live authority. */
      halted?: string;
    }>
  | Readonly<{
      kind: "unavailable-model";
      savedModelId: string;
    }>
  | Readonly<{ kind: "error"; message: string }>;

export function RuntimeStatusV3({
  status,
  onRetry,
}: Readonly<{ status: WorkbenchStatusV3; onRetry?: () => void }>) {
  if (status.kind === "loading") {
    return (
      <div className="pointer-events-none absolute inset-x-3 top-1/2 z-20 flex -translate-y-1/2 justify-center">
        <div className="pointer-events-auto overflow-hidden rounded-lg border border-wb-line">
          <SimulationPreparationV1 onRetry={onRetry} />
        </div>
      </div>
    );
  }
  return null;
}

export function OutputPaneBodyV3({
  contract,
  frame,
  locale,
  onAddItem,
  onOpenBindingSettings,
  pane,
  periodicPva,
  presentationAnalyses,
  periodicPvaAnalysisError,
  scrollMode = "contained",
  showBinding,
  settingsAction,
  scenarioLabel,
  lastMeasurements,
}: Readonly<{
  contract: ModelContractV2;
  frame: StudioSimulationFrameV2 | null;
  locale: "en" | "ja";
  onAddItem: () => void;
  onOpenBindingSettings: () => void;
  pane: ExperimentSurfaceOutputPaneV2;
  periodicPva?: MainWirePeriodicPvaV1;
  presentationAnalyses?: readonly StudioSimulationAnalysisV2[];
  periodicPvaAnalysisError?: string;
  scrollMode?: "contained" | "parent" | "section";
  showBinding: boolean;
  settingsAction?: React.ReactNode;
  scenarioLabel: string;
  lastMeasurements: WorkbenchLastMeasuredOutputsV1;
}>) {
  const { t } = useTranslation();
  const bindingModeLabel =
    pane.binding.mode === "active-slot"
      ? t("workbench.live.paneBindingModeActive")
      : t("workbench.live.paneBindingModeFixed");
  const bindingLabel =
    pane.binding.mode === "active-slot"
      ? t("workbench.live.paneBindingActive", { scenario: scenarioLabel })
      : t("workbench.live.paneBindingFixed", { scenarios: scenarioLabel });
  const selected = materializeWorkbenchOutputPresentationItemsV3({
    contract,
    frame,
    locale,
    notAssessedNotice: t("workbench.live.outputNotAssessed"),
    pane,
    periodicPva,
    presentationAnalyses,
    periodicPvaAnalysisError,
  });
  React.useLayoutEffect(() => { lastMeasurements.remember(selected); }, [lastMeasurements, selected]);
  const displayed = lastMeasurements.project(selected, workbenchPreviousMeasurementNoticeV3(locale));
  return (
    <div
      className={`workbench-output-pane flex min-h-0 flex-col bg-wb-aux ${
        scrollMode === "section" ? "" : "h-full"
      }`}
    >
      <WorkbenchPaneContextRowV3
        addItem={selected.length > 0 ? { label: t("workbench.editor.addCatalogItem"), onClick: onAddItem } : undefined}
        settings={settingsAction}
      >
        <WorkbenchPaneBindingButtonV3
          label={bindingLabel}
          modeLabel={bindingModeLabel}
          onClick={onOpenBindingSettings}
          targetLabel={scenarioLabel}
          testId={`output-pane-binding-${pane.paneId}`}
          visible={showBinding}
        />
      </WorkbenchPaneContextRowV3>
      <ExperimentOutputGridV3
        addItemAction={selected.length === 0 ? {
          label: t("workbench.editor.addCatalogItem"),
          onClick: onAddItem,
          prominent: true,
        } : undefined}
        variant="pane"
        scrollMode={scrollMode === "contained" ? "contained" : "parent"}
        emptyMessage={t("workbench.live.noSelectedOutputs")}
        items={displayed}
      />
    </div>
  );
}

/** Notice carried by a retained previous value; shared with the phone observation strip. */
export function workbenchPreviousMeasurementNoticeV3(locale: "en" | "ja"): string {
  return locale === "ja"
    ? "前回の測定値です。新しい有効な測定値が得られるまで表示しています。"
    : "Previous measurement, retained until a new valid measurement is available.";
}

export const ControlPaneBodyV3 = React.memo(function ControlPaneBodyV3({
  activeScenarioId,
  contract,
  controlError,
  controlValuesByScenario,
  disabledByAnalysis,
  locale,
  onApplyControl,
  onOpenSettings,
  pane,
  pendingControlId,
  scenarios,
  scrollMode = "contained",
  settingsAction,
}: Readonly<{
  activeScenarioId: string | null;
  contract: ModelContractV2;
  controlError: string | null;
  controlValuesByScenario: Readonly<
    Record<string, ExactModelControlValuesV1>
  >;
  disabledByAnalysis: boolean;
  locale: "en" | "ja";
  onApplyControl: (
    scenarioIds: readonly string[],
    controlId: string,
    value: number,
  ) => Promise<boolean>;
  onOpenSettings: (paneId: string, section: "items" | "binding", intent?: "add") => void;
  pane: ExperimentSurfaceControlPaneV2;
  pendingControlId: string | null;
  scenarios: readonly StudioSimulationWorkerScenarioDescriptorV2[];
  scrollMode?: "contained" | "parent" | "section";
  settingsAction?: React.ReactNode;
}>) {
  const { t } = useTranslation();
  incrementWorkbenchPerformanceCounterV3("react.control-pane.render");
  const targetScenarioIds = resolveWorkbenchControlPaneScenarioIdsV3(
    pane,
    activeScenarioId,
    scenarios,
  );
  const targetLabels = targetScenarioIds.map(
    (scenarioId) =>
      scenarios.find((scenario) => scenario.scenarioId === scenarioId)?.label ??
      scenarioId,
  );
  const bindingLabel =
    pane.binding.mode === "active-slot"
      ? t("workbench.live.paneBindingActive", {
          scenario: targetLabels[0] ?? "—",
        })
      : t("workbench.live.paneBindingFixed", {
          scenarios: targetLabels.join(" + "),
        });
  const bindingModeLabel =
    pane.binding.mode === "active-slot"
      ? t("workbench.live.paneBindingModeActive")
      : t("workbench.live.paneBindingModeFixed");
  const bindingTargetLabel = targetLabels.join(" + ") || "—";
  const selectedControls = [...pane.items]
    .sort((left, right) => left.order - right.order)
    .flatMap((item) => {
      const definition = contract.controlCatalog.find(
        (control) => control.controlId === item.controlId,
      );
      return definition === undefined ? [] : [{ definition, item }];
    });
  const presentedControls = selectedControls.map(({ definition, item }) => {
    const projectedValues = targetScenarioIds.map(
      (scenarioId) =>
        controlValuesByScenario[scenarioId]?.[definition.controlId] ??
        Object.freeze({
          status: "mixed" as const,
        }),
    );
    const first = projectedValues[0];
    const value = first?.status === "value"
      ? first.value
      : definition.defaultValue;
    const mixed = projectedValues.some((candidate) =>
      candidate.status === "mixed" ||
      (candidate.status === "value" && candidate.value !== value));
    return { definition, item, value, mixed };
  });
  return (
    <section
      className={`workbench-control-pane flex min-w-0 flex-col bg-wb-aux ${
        scrollMode === "parent"
          ? "min-h-full"
          : scrollMode === "section"
            ? "min-h-0"
            : "h-full min-h-0"
      }`}
    >
      <WorkbenchPaneContextRowV3
        addItem={selectedControls.length > 0 ? { label: t("workbench.editor.addCatalogItem"), onClick: () => onOpenSettings(pane.paneId, "items", "add") } : undefined}
        settings={settingsAction}
      >
        <WorkbenchPaneBindingButtonV3
          label={bindingLabel}
          modeLabel={bindingModeLabel}
          onClick={() => onOpenSettings(pane.paneId, "binding")}
          targetLabel={bindingTargetLabel}
          testId={`control-pane-binding-${pane.paneId}`}
          visible={scenarios.length > 1}
        />
      </WorkbenchPaneContextRowV3>
      <div
        className={`min-h-0 flex-1 px-2 pb-2 ${
          scrollMode === "contained" ? "overflow-y-auto" : "overflow-visible"
        }`}
      >
        {contract.controlCatalog.length === 0 ? (
          <p className="p-3 text-xs leading-5 text-wb-muted">
            {t("workbench.live.noRegisteredControls")}
          </p>
        ) : selectedControls.length === 0 ? (
          <p className="p-3 text-xs text-wb-subtle">
            {t("workbench.live.noSelectedControls")}
          </p>
        ) : (
          <div className="workbench-control-list">
            {presentedControls.map(
              ({ definition: control, item, value, mixed }) => {
                const presentation = resolveWorkbenchControlPresentationV3({
                  definition: control,
                  storedLabel: item.label,
                  locale,
                });
                return (
                  <ExperimentNumericControlV3
                    key={control.controlId}
                    control={control}
                    disabled={
                      targetScenarioIds.length === 0 ||
                      pendingControlId !== null ||
                      disabledByAnalysis
                    }
                    label={presentation.label}
                    {...(presentation.description
                      ? {
                          description: presentation.description,
                          descriptionAriaLabel:
                            locale === "ja"
                              ? `${presentation.label}の説明`
                              : `About ${presentation.label}`,
                        }
                      : {})}
                    mixed={mixed}
                    pending={pendingControlId === control.controlId}
                    presentation={item.presentation}
                    value={value}
                    onCommit={(nextValue) =>
                      onApplyControl(
                        targetScenarioIds,
                        control.controlId,
                        nextValue,
                      )
                    }
                  />
                );
              },
            )}
          </div>
        )}
        {controlError !== null && (
          <p
            className="mt-3 rounded-lg bg-wb-danger-soft p-2 text-[10px] text-wb-danger"
            role="alert"
          >
            {controlError}
          </p>
        )}
        {selectedControls.length === 0 && <ExperimentPaneAddItemButtonV3
          label={t("workbench.editor.addCatalogItem")}
          onClick={() => onOpenSettings(pane.paneId, "items", "add")}
          prominent
        />}
      </div>
    </section>
  );
});

export function PaneLoadingV3(props: React.ComponentProps<typeof SimulationPanePlaceholderV1>) {
  return <SimulationPanePlaceholderV1 {...props} />;
}

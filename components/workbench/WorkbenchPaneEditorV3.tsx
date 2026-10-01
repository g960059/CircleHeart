import React from "react";
import { useTranslation } from "react-i18next";
import { WorkbenchGraphAxisSettingsV3 } from "./WorkbenchGraphAxisSettingsV3";
import { X } from "lucide-react";
import type {
  ExperimentSurfaceControlItemV2,
  ExperimentSurfaceGraphPaneV2,
  ExperimentSurfaceOutputPaneV2,
} from "@/studio/contracts/v2/content";
import { STUDIO_GRAPH_HISTORY_MAX_DEPTH_V2, STUDIO_PV_TRAIL_DEFAULT_BEATS_V2, STUDIO_PV_TRAIL_MAX_BEATS_V2 } from "@/studio/contracts/v2/content";
import type {
  GraphDefinitionV2,
  ModelContractV2,
} from "@/studio/contracts/v2/model";
import {
  STUDIO_OUTPUT_PRESSURE_SUMMARIES_V1,
  resolveStudioItemPresentationV1,
  resolveStudioOutputPressureSummaryStoredLabelV1,
  resolveStudioSurfaceItemLabelV1,
  studioPressureVolumeDescriptionV1,
  type ResolvedStudioItemPresentationV1,
  type StudioItemPresentationCatalogFactsV1,
  type StudioItemPresentationCategoryV1,
} from "@/studio/presentation/StudioItemPresentationCatalogV1";
import {
  controlLabelV3,
  outputLabelV3,
  WORKBENCH_PRESSURE_VOLUME_ENVELOPE_DEFAULT_VISIBLE_V3,
  WORKBENCH_SWEEP_WINDOW_DEFAULT_SEC_V3,
  WORKBENCH_SWEEP_WINDOW_MAX_SEC_V3,
  WORKBENCH_SWEEP_WINDOW_MIN_SEC_V3,
  WORKBENCH_SWEEP_WINDOW_STEP_SEC_V3,
} from "./WorkbenchSurfaceV3";
import { resolveWorkbenchGraphSeriesPresentationV3 } from "./WorkbenchItemPresentation";
import type { WorkbenchPaneIdentityV3 } from "./WorkbenchSurfacePaneOperationsV3";
const CANONICAL_COLOR_HEX_V3 = /^#[0-9a-f]{6}$/;
export type WorkbenchPaneEditorSectionV3 = "binding" | "items";
export type WorkbenchPaneEditorItemIntentV3 = "add" | "manage";

type PaneItemCatalogCategoryV3 = StudioItemPresentationCategoryV1;

export type WorkbenchPaneEditorStringsV3 = Readonly<{
  addCatalogItem: string;
  backToCatalog: string;
  availableItems: string;
  cancel: string;
  close: string;
  chooseItem: string;
  bindingSection: string;
  activeSlotBinding: string;
  activeSlotBindingHint: string;
  outputActiveSlotBindingHint: string;
  fixedBinding: string;
  fixedBindingHint: string;
  outputFixedBindingHint: string;
  controlPresentation: string;
  sliderPresentation: string;
  buttonsPresentation: string;
  buttonLabel: string;
  buttonValue: string;
  addButtonOption: string;
  removeButtonOption: string;
  controlCatalog: string;
  catalogAdded: string;
  catalogCategories: Readonly<Record<PaneItemCatalogCategoryV3, string>>;
  catalogDrawerTitle: string;
  closeDrawer: string;
  dataSection: string;
  displaySection: string;
  done: string;
  emptyCatalog: string;
  editItem: string;
  generalSection: string;
  pressureEnvelopeOverlay: string;
  pressureEnvelopeOverlayHint: string;
  pvaBoundaryView: string;
  pvaBoundaryViewHint: string;
  previousResults: string;
  previousResultsHint: string;
  noPreviousResults: string;
  label: string;
  itemsSection: string;
  moveDown: string;
  moveUp: string;
  manageItems: string;
  noCatalogMatches: string;
  noConfigurableSeries: string;
  outputCatalog: string;
  paneKinds: Readonly<Record<WorkbenchPaneIdentityV3["kind"], string>>;
  seriesCatalog: string;
  scenarioColors: string;
  scenarioColorsHint: string;
  traceVisibility: string;
  traceVisibilityHint: string;
  resetColor: string;
  removeItem: string;
  preview: string;
  reorderItem: string;
  searchCatalog: string;
  selectedItems: string;
  title: string;
  windowSec: string;
  windowSecHint: string;
}>;

export const DEFAULT_WORKBENCH_PANE_EDITOR_STRINGS_V3: WorkbenchPaneEditorStringsV3 =
  Object.freeze({
    addCatalogItem: "Add item",
    backToCatalog: "Back to catalog",
    availableItems: "Available",
    cancel: "Cancel",
    close: "Close pane settings",
    chooseItem: "Choose an item to edit its presentation.",
    bindingSection: "Scenario",
    activeSlotBinding: "Follow selected scenario",
    activeSlotBindingHint:
      "This pane controls whichever Scenario is selected in Scenario Manager.",
    outputActiveSlotBindingHint:
      "This pane displays the Scenario selected in Scenario Manager.",
    fixedBinding: "Fix Scenario",
    fixedBindingHint:
      "Every parameter in this pane applies the same absolute value to the selected Scenarios.",
    outputFixedBindingHint: "This pane always displays one selected Scenario.",
    controlPresentation: "Control presentation",
    sliderPresentation: "Slider",
    buttonsPresentation: "Custom buttons",
    buttonLabel: "Button label",
    buttonValue: "Value",
    addButtonOption: "Add button",
    removeButtonOption: "Remove button",
    controlCatalog: "Parameters",
    catalogAdded: "In pane",
    catalogCategories: Object.freeze({
      advanced: "Advanced / raw parameters",
      coronary: "Coronary",
      hemodynamics: "Hemodynamics",
      mechanicalSupport: "Mechanical support",
      myocardium: "Myocardium",
      oxygen: "Oxygen transport",
      pericardium: "Pericardium",
      rhythm: "Rhythm",
      valves: "Valves",
      ventilation: "Ventilation",
    }),
    catalogDrawerTitle: "Add items",
    closeDrawer: "Close panel",
    dataSection: "Data",
    displaySection: "Display",
    done: "Done",
    emptyCatalog: "No registered items are available.",
    editItem: "Edit item",
    generalSection: "General",
    pressureEnvelopeOverlay: "Envelope",
    pressureEnvelopeOverlayHint:
      "Overlay the normal pressure envelope for comparison. It interpolates this simulated load family; it is neither the PVA integration boundary nor a physiological pressure limit.",
    pvaBoundaryView: "PVA",
    pvaBoundaryViewHint:
      "Show the common-time PVA boundary instead of ESPVR. SW and PE are illustrated separately when available; these are not measurements of stored elastic energy.",
    previousResults: "Previous inputs",
    previousResultsHint:
      "Keep up to three earlier loops and available analysis results as faded comparisons, including while an update is pending or fails. 0 hides them.",
    noPreviousResults: "Off",
    label: "Label",
    itemsSection: "Items",
    moveDown: "Move down",
    moveUp: "Move up",
    manageItems: "Manage items",
    noCatalogMatches: "No matching registered items.",
    noConfigurableSeries:
      "This graph owns its structural axes and has no configurable series.",
    outputCatalog: "Outputs",
    paneKinds: Object.freeze({
      control: "Controller pane",
      graph: "Graph pane",
      output: "Output pane",
    }),
    seriesCatalog: "Waveform series",
    scenarioColors: "Scenario colors",
    scenarioColorsHint:
      "Each existing trace keeps its allocated color. Change only the exact Scenario/item you need.",
    traceVisibility: "Trace visibility",
    traceVisibilityHint:
      "All visible Scenarios are shown by default. Adjust individual Scenario/item traces only when needed.",
    resetColor: "Use automatic color",
    removeItem: "Remove from pane",
    preview: "Preview",
    reorderItem: "Reorder item",
    searchCatalog: "Search by name or abbreviation",
    selectedItems: "In this pane",
    title: "Pane settings",
    windowSec: "Waveform window",
    windowSecHint: "1–12 seconds in 0.5 second steps",
  });

export function canonicalWorkbenchColorHexV3(
  value: string,
  fallback = "#64748b",
): string {
  const candidate = value.toLowerCase();
  return CANONICAL_COLOR_HEX_V3.test(candidate)
    ? candidate
    : fallback.toLowerCase();
}

export function workbenchGraphDisplaySettingsAvailableV3(
  renderer: GraphDefinitionV2["renderer"] | undefined,
): boolean {
  return (
    renderer === "sweep" ||
    renderer === "xy" ||
    renderer === "pressure-volume" ||
    renderer === "structural-return"
  );
}

export function GraphDisplaySettingsV3({
  graph,
  pane,
  waveformUnit,
  automaticRanges,
  onValidityChange,
  periodicPvaSupported,
  strings,
  onChange,
}: Readonly<{
  graph: GraphDefinitionV2 | undefined;
  pane: ExperimentSurfaceGraphPaneV2;
  waveformUnit?: string;
  automaticRanges?: ExperimentSurfaceGraphPaneV2["axisRanges"];
  onValidityChange?: (valid: boolean) => void;
  periodicPvaSupported: boolean;
  strings: WorkbenchPaneEditorStringsV3;
  onChange: (pane: ExperimentSurfaceGraphPaneV2) => void;
}>) {
  const { i18n } = useTranslation();
  const ja = (i18n.resolvedLanguage ?? i18n.language).startsWith("ja");
  return (
    <>
      {" "}
      {workbenchGraphDisplaySettingsAvailableV3(
        graph?.renderer,
      ) && (
        <section id="pane-settings-display-v3" className="space-y-4">
          {graph && <WorkbenchGraphAxisSettingsV3 graph={graph} pane={pane} waveformUnit={waveformUnit} automaticRanges={automaticRanges} onValidityChange={onValidityChange} onChange={onChange} />}
          {graph?.renderer === "pressure-volume" && <fieldset className="space-y-2">
            <legend className="text-xs font-medium text-wb-text">{ja ? "最近の拍" : "Recent beats"}</legend>
            <div className="flex gap-1 rounded-lg bg-wb-soft/55 p-1">
              {Array.from({ length: STUDIO_PV_TRAIL_MAX_BEATS_V2 + 1 }, (_, count) => <label key={count}
                className={`relative flex min-h-9 flex-1 cursor-pointer items-center justify-center rounded-md text-xs ${(pane.pvTrailBeats ?? STUDIO_PV_TRAIL_DEFAULT_BEATS_V2) === count ? "bg-wb-selected text-wb-text" : "text-wb-muted hover:bg-wb-hover"}`}>
                <input type="radio" name={`pv-trail-${pane.paneId}`} className="peer sr-only" value={count}
                  checked={(pane.pvTrailBeats ?? STUDIO_PV_TRAIL_DEFAULT_BEATS_V2) === count}
                  onChange={() => onChange({ ...pane, pvTrailBeats: count })} />
                <span className="pointer-events-none absolute inset-0 rounded-md peer-focus-visible:ring-2 peer-focus-visible:ring-wb-accent" aria-hidden="true" />
                {count === 0 ? (ja ? "なし" : "None") : count}
              </label>)}
            </div>
            <p className="text-[10px] leading-4 text-wb-subtle">{ja ? "現在の軌跡に追加する拍数。古い拍ほど薄く表示します。" : "Completed beats behind the current trace. Older beats gradually fade."}</p>
          </fieldset>}
          {(graph?.renderer === "pressure-volume" ||
            graph?.renderer === "structural-return") && (
            <fieldset className="space-y-2">
              <legend className="text-xs font-medium text-wb-text">
                {strings.previousResults}
              </legend>
              <div className="flex gap-1 rounded-lg bg-wb-soft/55 p-1">
                {Array.from(
                  { length: STUDIO_GRAPH_HISTORY_MAX_DEPTH_V2 + 1 },
                  (_, depth) => (
                    <label
                      key={depth}
                      className={`relative flex min-h-9 flex-1 cursor-pointer items-center justify-center rounded-md text-xs ${
                        (pane.historyDepth ?? 1) === depth
                          ? "bg-wb-selected text-wb-text"
                          : "text-wb-muted hover:bg-wb-hover"
                      }`}
                    >
                      <input
                        type="radio"
                        name={`previous-inputs-${pane.paneId}`}
                        value={depth}
                        checked={(pane.historyDepth ?? 1) === depth}
                        className="peer sr-only"
                        onChange={() =>
                          onChange({ ...pane, historyDepth: depth })
                        }
                      />
                      <span
                        className="absolute inset-0 rounded-md peer-focus-visible:ring-2 peer-focus-visible:ring-wb-accent"
                        aria-hidden="true"
                      />
                      {depth === 0 ? strings.noPreviousResults : String(depth)}
                    </label>
                  ),
                )}
              </div>
              <p className="text-[10px] leading-4 text-wb-subtle">
                {strings.previousResultsHint}
              </p>
            </fieldset>
          )}
          {graph?.renderer === "sweep" && (
            <div className="grid gap-1.5">
              <PaneRangeInputV3
                label={strings.windowSec}
                value={pane.windowSec ?? WORKBENCH_SWEEP_WINDOW_DEFAULT_SEC_V3}
                minimum={WORKBENCH_SWEEP_WINDOW_MIN_SEC_V3}
                maximum={WORKBENCH_SWEEP_WINDOW_MAX_SEC_V3}
                step={WORKBENCH_SWEEP_WINDOW_STEP_SEC_V3}
                unit="s"
                onCommit={(windowSec) => onChange({ ...pane, windowSec })}
              />
              <p className="text-[10px] text-wb-subtle">
                {strings.windowSecHint}
              </p>
            </div>
          )}
          {graph?.renderer === "pressure-volume" &&
            periodicPvaSupported &&
            pane.pressureVolumeAnalysisMode !== "raw-exact-orbit" && (
              <>
                <button
                  type="button"
                  aria-pressed={pane.showPvaBoundary ?? false}
                  className={`block w-full rounded-xl px-3 py-3 text-left transition-colors ${
                    pane.showPvaBoundary
                      ? "bg-wb-selected text-wb-text"
                      : "bg-wb-soft/55 text-wb-muted hover:bg-wb-hover hover:text-wb-text"
                  }`}
                  onClick={() =>
                    onChange({
                      ...pane,
                      showPvaBoundary: !(pane.showPvaBoundary ?? false),
                    })
                  }
                >
                  <span className="text-xs font-medium">
                    {strings.pvaBoundaryView}
                  </span>
                  <span className="mt-1 block text-[10px] leading-4 text-wb-subtle">
                    {strings.pvaBoundaryViewHint}
                  </span>
                </button>
                {pane.showPvaBoundary && (
                  <button
                    type="button"
                    aria-pressed={
                      pane.showPressureEnvelope ??
                      WORKBENCH_PRESSURE_VOLUME_ENVELOPE_DEFAULT_VISIBLE_V3
                    }
                    className={`block w-full rounded-xl px-3 py-3 text-left transition-colors ${
                      (pane.showPressureEnvelope ??
                      WORKBENCH_PRESSURE_VOLUME_ENVELOPE_DEFAULT_VISIBLE_V3)
                        ? "bg-wb-selected text-wb-text"
                        : "bg-wb-soft/55 text-wb-muted hover:bg-wb-hover hover:text-wb-text"
                    }`}
                    onClick={() =>
                      onChange({
                        ...pane,
                        showPressureEnvelope: !(
                          pane.showPressureEnvelope ??
                          WORKBENCH_PRESSURE_VOLUME_ENVELOPE_DEFAULT_VISIBLE_V3
                        ),
                      })
                    }
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className="text-xs font-medium">
                        {strings.pressureEnvelopeOverlay}
                      </span>
                      <span
                        aria-hidden="true"
                        className={`relative h-4 w-7 rounded-full transition-colors ${
                          (pane.showPressureEnvelope ??
                          WORKBENCH_PRESSURE_VOLUME_ENVELOPE_DEFAULT_VISIBLE_V3)
                            ? "bg-wb-accent"
                            : "bg-wb-border"
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-transform ${
                            (pane.showPressureEnvelope ??
                            WORKBENCH_PRESSURE_VOLUME_ENVELOPE_DEFAULT_VISIBLE_V3)
                              ? "translate-x-3.5"
                              : "translate-x-0.5"
                          }`}
                        />
                      </span>
                    </span>
                    <span className="mt-1 block text-[10px] leading-4 text-wb-subtle">
                      {strings.pressureEnvelopeOverlayHint}
                    </span>
                  </button>
                )}
              </>
            )}
        </section>
      )}
    </>
  );
}

export function resolveGraphSeriesPresentationV3(
  input: Readonly<{
    contract: ModelContractV2;
    graph: GraphDefinitionV2;
    locale: "en" | "ja";
    seriesId: string;
    storedLabel: string | undefined;
  }>,
): ResolvedStudioItemPresentationV1 | undefined {
  if (!("seriesCatalog" in input.graph)) return undefined;
  const binding = input.graph.seriesCatalog.find(
    ({ seriesId }) => seriesId === input.seriesId,
  );
  if (binding === undefined) return undefined;
  const outputId =
    "outputId" in binding ? binding.outputId : binding.kind === "xy" ? binding.yOutputId : binding.pressureOutputId;
  const presentation = resolveWorkbenchGraphSeriesPresentationV3({
    definition: input.contract.outputCatalog.find(
      (output) => output.outputId === outputId,
    ),
    locale: input.locale,
    outputId,
    seriesId: binding.seriesId,
    storedLabel: input.storedLabel,
  });
  return "volumeOutputId" in binding
    ? {
        ...presentation,
        description: studioPressureVolumeDescriptionV1(
          binding.volumeOutputId,
          binding.pressureOutputId,
          input.locale,
        ),
      }
    : presentation;
}

export function updateWorkbenchGraphTraceCustomColorV3(
  pane: ExperimentSurfaceGraphPaneV2,
  input: Readonly<{
    scenarioId: string;
    seriesId: string | null;
    colorHex: string | null;
  }>,
): ExperimentSurfaceGraphPaneV2 {
  let found = false;
  const next = (pane.traceColors ?? []).map((trace) => {
    if (
      trace.scenarioId !== input.scenarioId ||
      trace.seriesId !== input.seriesId
    )
      return trace;
    found = true;
    if (input.colorHex === null) {
      if (trace.customColorHex === undefined) return trace;
      const { customColorHex: _customColorHex, ...automatic } = trace;
      return Object.freeze(automatic);
    }
    return Object.freeze({
      ...trace,
      customColorHex: canonicalWorkbenchColorHexV3(input.colorHex),
    });
  });
  // Workbench surfaces are reconciled before editing. Failing closed here
  // prevents a color interaction from inventing an unreviewed automatic color.
  if (!found) return pane;
  return {
    ...pane,
    traceColors: next,
  };
}

export function outputPaneItemManagerEntriesV3(
  input: Readonly<{
    contract: ModelContractV2;
    locale: "en" | "ja";
    pane: ExperimentSurfaceOutputPaneV2;
  }>,
): readonly PaneItemManagerEntryV3[] {
  const outputById = new Map(
    input.contract.outputCatalog.map((output) => [output.outputId, output]),
  );
  const selectedById = new Map(
    input.pane.items.map((item) => [item.outputId, item]),
  );
  const summaryStates = STUDIO_OUTPUT_PRESSURE_SUMMARIES_V1.map((summary) => {
    const definitions = summary.memberOutputIds.flatMap((outputId) => {
      const definition = outputById.get(outputId);
      return definition === undefined ? [] : [definition];
    });
    const selectedItems = summary.memberOutputIds.flatMap((outputId) => {
      const item = selectedById.get(outputId);
      return item === undefined ? [] : [item];
    });
    return { summary, definitions, selectedItems };
  });
  const groupedOutputIds = new Set(
    summaryStates.flatMap(({ summary, definitions, selectedItems }) => {
      const isPartialSelection =
        selectedItems.length > 0 &&
        selectedItems.length < summary.memberOutputIds.length;
      return definitions.length === summary.memberOutputIds.length &&
        !isPartialSelection
        ? summary.memberOutputIds
        : [];
    }),
  );
  const summaries = summaryStates.flatMap(
    ({ summary, definitions, selectedItems }) => {
      const isPartialSelection =
        selectedItems.length > 0 &&
        selectedItems.length < summary.memberOutputIds.length;
      if (
        definitions.length !== summary.memberOutputIds.length ||
        isPartialSelection
      )
        return [];
      return [
        {
          ...resolvePaneItemManagerPresentationV3({
            kind: "output",
            id: summary.presentationId,
            storedLabel: resolveStudioOutputPressureSummaryStoredLabelV1({
              summary,
              items: selectedItems,
              locale: input.locale,
              fallbackEnglishLabel: outputLabelV3,
            }),
            locale: input.locale,
            catalogFacts: {
              outputKind: "metric",
            },
          }),
          selected: selectedItems.length === summary.memberOutputIds.length,
          disableDeselect: false,
          order:
            selectedItems.length === 0
              ? undefined
              : Math.min(...selectedItems.map(({ order }) => order)),
        },
      ];
    },
  );
  const scalars = input.contract.outputCatalog
    .filter(({ outputId }) => !groupedOutputIds.has(outputId))
    .map((output): PaneItemManagerEntryV3 => {
      const selectedItem = selectedById.get(output.outputId);
      return {
        ...resolvePaneItemManagerPresentationV3({
          kind: "output",
          id: output.outputId,
          storedLabel: selectedItem?.label,
          locale: input.locale,
          catalogFacts: {
            outputKind: output.kind,
          },
        }),
        selected: selectedItem !== undefined,
        disableDeselect: false,
        order: selectedItem?.order,
      };
    });
  return [...summaries, ...scalars];
}

export function resolvePaneItemManagerPresentationV3(
  input: Readonly<{
    kind: "control" | "output";
    id: string;
    storedLabel: string | undefined;
    locale: "en" | "ja";
    catalogFacts?: StudioItemPresentationCatalogFactsV1;
  }>,
): Pick<
  PaneItemManagerEntryV3,
  "id" | "defaultLabel" | "label" | "presentation"
> {
  const legacyDefaultLabel =
    input.kind === "output"
      ? outputLabelV3(input.id)
      : controlLabelV3(input.id);
  const presentation = resolveStudioItemPresentationV1({
    kind: input.kind,
    itemId: input.id,
    fallbackEnglishLabel: legacyDefaultLabel,
    locale: input.locale,
    catalogFacts: input.catalogFacts,
  });
  return {
    id: input.id,
    defaultLabel: presentation.label,
    label: resolveStudioSurfaceItemLabelV1({
      storedLabel: input.storedLabel,
      legacyDefaultLabel,
      presentation,
    }),
    presentation,
  };
}

export function ControlItemPresentationEditorV3({
  definition,
  item,
  strings,
  onChange,
}: Readonly<{
  definition: ModelContractV2["controlCatalog"][number];
  item: ExperimentSurfaceControlItemV2;
  strings: WorkbenchPaneEditorStringsV3;
  onChange: (item: ExperimentSurfaceControlItemV2) => void;
}>) {
  const buttonPresentation =
    item.presentation.kind === "buttons" ? item.presentation : null;
  return (
    <div className="grid gap-3">
      <fieldset className="grid gap-1.5">
        <legend className="text-[10px] font-medium text-wb-subtle">
          {strings.controlPresentation}
        </legend>
        <div
          className="grid grid-cols-2 gap-1 rounded-lg bg-wb-input p-1"
          role="radiogroup"
        >
          {(["slider", "buttons"] as const).map((kind) => {
            const selected = item.presentation.kind === kind;
            const label =
              kind === "slider"
                ? strings.sliderPresentation
                : strings.buttonsPresentation;
            return (
              <button
                key={kind}
                type="button"
                role="radio"
                aria-checked={selected}
                className="workbench-selection-button min-h-8 rounded-md px-2.5 text-[10px] font-medium transition-[color,background-color,box-shadow,transform] duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wb-accent"
                onClick={() =>
                  onChange({
                    ...item,
                    presentation:
                      kind === "buttons"
                        ? {
                            kind: "buttons",
                            options:
                              item.presentation.kind === "buttons"
                                ? item.presentation.options
                                : defaultWorkbenchControlButtonOptionsV3(
                                    definition,
                                  ),
                          }
                        : { kind: "slider" },
                  })
                }
              >
                {label}
              </button>
            );
          })}
        </div>
      </fieldset>
      {buttonPresentation !== null && (
        <div className="grid gap-2">
          {buttonPresentation.options.map((option, optionIndex) => (
            <ControlButtonOptionEditorV3
              key={optionIndex}
              definition={definition}
              labelLabel={strings.buttonLabel}
              option={option}
              removeLabel={strings.removeButtonOption}
              valueLabel={definition.unit === "1" ? strings.buttonValue : `${strings.buttonValue} (${definition.unit})`}
              canRemove={buttonPresentation.options.length > 2}
              siblingOptions={buttonPresentation.options.filter(
                (_, index) => index !== optionIndex,
              )}
              onChange={(nextOption) =>
                onChange({
                  ...item,
                  presentation: {
                    kind: "buttons",
                    options: buttonPresentation.options.map(
                      (candidate, index) =>
                        index === optionIndex ? nextOption : candidate,
                    ),
                  },
                })
              }
              onRemove={() =>
                onChange({
                  ...item,
                  presentation: {
                    kind: "buttons",
                    options: buttonPresentation.options.filter(
                      (_, index) => index !== optionIndex,
                    ),
                  },
                })
              }
            />
          ))}
          <button
            type="button"
            disabled={buttonPresentation.options.length >= 6}
            className="inline-flex min-h-9 items-center justify-center rounded-md bg-wb-soft px-3 text-[10px] font-medium text-wb-muted transition-[color,background-color,transform] duration-150 hover:bg-wb-hover hover:text-wb-text active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wb-accent disabled:cursor-not-allowed disabled:opacity-40"
            onClick={() => {
              const next = nextWorkbenchControlButtonOptionV3(
                definition,
                buttonPresentation.options,
              );
              if (next === null) return;
              onChange({
                ...item,
                presentation: {
                  kind: "buttons",
                  options: [...buttonPresentation.options, next],
                },
              });
            }}
          >
            {strings.addButtonOption}
          </button>
        </div>
      )}
    </div>
  );
}

export function ControlItemPreviewV3({
  definition,
  item,
  label,
}: Readonly<{
  definition: ModelContractV2["controlCatalog"][number];
  item: ExperimentSurfaceControlItemV2;
  label: string;
}>) {
  const value = definition.defaultValue;
  const progress =
    definition.maximum === definition.minimum
      ? 0
      : ((value - definition.minimum) /
          (definition.maximum - definition.minimum)) *
        100;
  return (
    <div className="workbench-control-inspector-preview">
      <div className="flex min-w-0 items-baseline justify-between gap-3">
        <p className="truncate text-xs font-medium text-wb-text">{label}</p>
        <output
          className="shrink-0 font-mono text-xs text-wb-text"
          aria-label={definition.unit === "1" ? String(value) : `${value} ${definition.unit}`}
        >
          {value}
          {definition.unit !== "1" && <span className="ml-1 font-sans text-[10px] text-wb-subtle">
            {definition.unit}
          </span>}
        </output>
      </div>
      {item.presentation.kind === "buttons" ? (
        <div className="workbench-control-segments mt-3" aria-hidden="true">
          {item.presentation.options.map((option) => (
            <span
              key={`${option.label}:${option.value}`}
              className="workbench-control-segment inline-flex items-center justify-center"
              data-active={option.value === value ? "true" : "false"}
            >
              {option.label}
            </span>
          ))}
        </div>
      ) : (
        <div className="mt-3 flex h-7 items-center" aria-hidden="true">
          <span className="relative h-1 w-full rounded-full bg-wb-line-strong">
            <span
              className="absolute inset-y-0 left-0 rounded-full bg-wb-accent"
              style={{ width: `${progress}%` }}
            />
            <span
              className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-wb-accent bg-wb-panel"
              style={{ left: `${progress}%` }}
            />
          </span>
        </div>
      )}
    </div>
  );
}

function ControlButtonOptionEditorV3({
  canRemove,
  definition,
  labelLabel,
  option,
  removeLabel,
  siblingOptions,
  valueLabel,
  onChange,
  onRemove,
}: Readonly<{
  canRemove: boolean;
  definition: ModelContractV2["controlCatalog"][number];
  labelLabel: string;
  option: Readonly<{ label: string; value: number }>;
  removeLabel: string;
  siblingOptions: readonly Readonly<{ label: string; value: number }>[];
  valueLabel: string;
  onChange: (option: Readonly<{ label: string; value: number }>) => void;
  onRemove: () => void;
}>) {
  const [labelDraft, setLabelDraft] = React.useState(option.label);
  const [valueDraft, setValueDraft] = React.useState(String(option.value));
  React.useEffect(() => setLabelDraft(option.label), [option.label]);
  React.useEffect(() => setValueDraft(String(option.value)), [option.value]);

  const commitLabel = () => {
    const label = labelDraft.trim();
    if (
      label.length === 0 ||
      siblingOptions.some((candidate) => candidate.label === label)
    ) {
      setLabelDraft(option.label);
      return;
    }
    setLabelDraft(label);
    if (label !== option.label) onChange({ ...option, label });
  };
  const commitValue = () => {
    const parsed = Number(valueDraft);
    if (!Number.isFinite(parsed)) {
      setValueDraft(String(option.value));
      return;
    }
    const value = normalizeWorkbenchControlOptionValueV3(parsed, definition);
    if (siblingOptions.some((candidate) => candidate.value === value)) {
      setValueDraft(String(option.value));
      return;
    }
    setValueDraft(String(value));
    if (value !== option.value) onChange({ ...option, value });
  };

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(7rem,0.72fr)_2rem] items-end gap-2">
      <label className="grid min-w-0 gap-1 text-[10px] font-medium text-wb-subtle">
        <span>{labelLabel}</span>
        <input
          type="text"
          value={labelDraft}
          className="min-h-9 min-w-0 rounded-md bg-wb-input px-2.5 text-base sm:text-xs text-wb-text outline-none focus:ring-2 focus:ring-wb-accent"
          onChange={(event) => setLabelDraft(event.currentTarget.value)}
          onBlur={commitLabel}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
            if (event.key === "Escape") {
              setLabelDraft(option.label);
              event.currentTarget.blur();
            }
          }}
        />
      </label>
      <label className="grid min-w-0 gap-1 text-[10px] font-medium text-wb-subtle">
        <span>{valueLabel}</span>
        <input
          type="number"
          min={definition.minimum}
          max={definition.maximum}
          step={definition.step}
          value={valueDraft}
          className="min-h-9 min-w-0 rounded-md bg-wb-input px-2.5 font-mono text-base sm:text-xs text-wb-text outline-none focus:ring-2 focus:ring-wb-accent"
          onChange={(event) => setValueDraft(event.currentTarget.value)}
          onBlur={commitValue}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
            if (event.key === "Escape") {
              setValueDraft(String(option.value));
              event.currentTarget.blur();
            }
          }}
        />
      </label>
      <button
        type="button"
        disabled={!canRemove}
        aria-label={removeLabel}
        title={removeLabel}
        className="inline-flex h-9 w-8 items-center justify-center rounded-md text-wb-subtle transition-[color,background-color,transform] duration-150 hover:bg-wb-hover hover:text-wb-text active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wb-accent disabled:invisible"
        onClick={onRemove}
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}

function defaultWorkbenchControlButtonOptionsV3(
  definition: ModelContractV2["controlCatalog"][number],
): readonly Readonly<{ label: string; value: number }>[] {
  const candidates = [
    definition.defaultValue - definition.step,
    definition.defaultValue,
    definition.defaultValue + definition.step,
    definition.minimum,
    definition.maximum,
  ].map((value) => normalizeWorkbenchControlOptionValueV3(value, definition));
  const values = [...new Set(candidates)].slice(0, 3);
  if (values.length < 2) values.push(definition.maximum);
  return values.map((value) =>
    Object.freeze({
      label: String(value),
      value,
    }),
  );
}

function nextWorkbenchControlButtonOptionV3(
  definition: ModelContractV2["controlCatalog"][number],
  options: readonly Readonly<{ label: string; value: number }>[],
): Readonly<{ label: string; value: number }> | null {
  const values = new Set(options.map(({ value }) => value));
  const labels = new Set(options.map(({ label }) => label));
  const anchor = options.at(-1)?.value ?? definition.defaultValue;
  const maximumSteps = Math.ceil(
    (definition.maximum - definition.minimum) / definition.step,
  );
  for (let distance = 1; distance <= maximumSteps; distance += 1) {
    for (const candidate of [
      anchor + distance * definition.step,
      anchor - distance * definition.step,
    ]) {
      const value = normalizeWorkbenchControlOptionValueV3(
        candidate,
        definition,
      );
      if (values.has(value)) continue;
      let label = String(value);
      let suffix = 2;
      while (labels.has(label)) {
        label = `${String(value)} ${suffix}`;
        suffix += 1;
      }
      return Object.freeze({ label, value });
    }
  }
  return null;
}

function normalizeWorkbenchControlOptionValueV3(
  value: number,
  definition: ModelContractV2["controlCatalog"][number],
): number {
  const clamped = Math.min(
    definition.maximum,
    Math.max(definition.minimum, value),
  );
  const steps = Math.round((clamped - definition.minimum) / definition.step);
  const normalized = definition.minimum + steps * definition.step;
  return Number(
    Math.min(
      definition.maximum,
      Math.max(definition.minimum, normalized),
    ).toPrecision(12),
  );
}

type PaneItemManagerEntryV3 = Readonly<{
  id: string;
  defaultLabel: string;
  label: string | undefined;
  presentation: ResolvedStudioItemPresentationV1;
  selected: boolean;
  disableDeselect: boolean;
  order: number | undefined;
}>;

export function CommitTextInputV3({
  label,
  value,
  onCommit,
}: Readonly<{
  label: string;
  value: string;
  onCommit: (value: string) => void;
}>) {
  const [draft, setDraft] = React.useState(value);
  React.useEffect(() => setDraft(value), [value]);
  const commit = () => {
    const nextValue = draft.trim();
    if (nextValue.length === 0) {
      setDraft(value);
      return;
    }
    setDraft(nextValue);
    if (nextValue !== value) onCommit(nextValue);
  };
  return (
    <label className="grid min-w-0 gap-1 text-[10px] font-medium text-wb-subtle">
      <span>{label}</span>
      <input
        type="text"
        value={draft}
        className="min-h-9 min-w-0 rounded-md bg-wb-soft px-2.5 text-base sm:text-xs text-wb-text outline-none ring-1 ring-transparent focus:ring-wb-accent"
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
          if (event.key === "Escape") {
            event.stopPropagation();
            setDraft(value);
            event.currentTarget.blur();
          }
        }}
      />
    </label>
  );
}

function PaneRangeInputV3({
  label,
  value,
  minimum,
  maximum,
  step,
  unit,
  onCommit,
}: Readonly<{
  label: string;
  value: number;
  minimum: number;
  maximum: number;
  step: number;
  unit: string;
  onCommit: (value: number) => void;
}>) {
  const inputId = React.useId();
  const span = maximum - minimum;
  const progress =
    span > 0 ? Math.max(0, Math.min(100, ((value - minimum) / span) * 100)) : 0;
  return (
    <div className="workbench-pane-range-field">
      <div className="workbench-pane-range-heading">
        <label htmlFor={inputId}>{label}</label>
        <output htmlFor={inputId} className="workbench-pane-range-value">
          <span>{value}</span>
          <span className="workbench-pane-range-unit">{unit}</span>
        </output>
      </div>
      <input
        id={inputId}
        className="workbench-control-range"
        style={
          {
            "--workbench-control-progress": `${progress}%`,
          } as React.CSSProperties
        }
        type="range"
        min={minimum}
        max={maximum}
        step={step}
        value={value}
        aria-valuetext={`${value} ${unit}`}
        onChange={(event) => onCommit(Number(event.currentTarget.value))}
      />
    </div>
  );
}

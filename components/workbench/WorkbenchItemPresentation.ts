import { cardiorespiratoryBreathOutputValueV1 } from "@/analysis/methods/cardiorespiratory/CardiorespiratoryBreathMetricsV1";
import { cardiorespiratoryVariationOutputValueV1 } from "@/analysis/methods/cardiorespiratory/CardiorespiratoryVariationV1";
import {
  formatExperimentPressureSummaryV3,
  type ExperimentOutputPresentationItemV3,
} from "@/components/workbench/ExperimentPanePresentationV3";
import {
  controlLabelV3,
  graphSeriesLabelV3,
  outputLabelV3,
} from "@/components/workbench/WorkbenchSurfaceV3";
import type { MainWirePeriodicPvaV1 } from "@/analysis/methods/mainWire/MainWirePeriodicPvaV1";
import { mainWireCardiacCycleOutputValueV1, mainWireFillingFlowOutputValueV1, mainWireAorticJetOutputValueV1 } from "@/analysis/methods/mainWire/MainWireCardiacCyclePresentationV1";
import {
  MAIN_WIRE_PERIODIC_PVA_ANALYSIS_OUTPUT_IDS_V1,
  MAIN_WIRE_PERIODIC_PVA_OUTPUT_IDS_V1,
} from "@/analysis/methods/mainWire/MainWireAnalysisMethodRegistryV1";
import type { ExperimentSurfaceOutputPaneV2 } from "@/studio/contracts/v2/content";
import type {
  ControlDefinitionV2,
  ModelContractV2,
} from "@/studio/contracts/v2/model";
import type {
  StudioSimulationFrameV2,
  StudioSimulationAnalysisV2,
  StudioSimulationOutputValueV2,
} from "@/studio/contracts/v2/simulation";
import {
  resolveStudioItemPresentationV1,
  resolveStudioOutputPressureSummaryStoredLabelV1,
  resolveStudioSurfaceItemLabelV1,
  studioOutputPressureSummaryForOutputIdV1,
  studioGraphSeriesLabelV1,
  type ResolvedStudioItemPresentationV1,
} from "@/studio/presentation/StudioItemPresentationCatalogV1";

const WORKBENCH_PERIODIC_PVA_ANALYSIS_OUTPUT_ID_SET_V1 = new Set<string>(
  MAIN_WIRE_PERIODIC_PVA_ANALYSIS_OUTPUT_IDS_V1,
);

export function resolveWorkbenchPaneItemLabelV3(
  input: Readonly<{
    kind: "control" | "output";
    itemId: string;
    storedLabel: string | undefined;
    locale: "en" | "ja";
  }>,
): string {
  const legacyDefaultLabel = input.kind === "output"
    ? outputLabelV3(input.itemId)
    : controlLabelV3(input.itemId);
  const presentation = resolveStudioItemPresentationV1({
    kind: input.kind,
    itemId: input.itemId,
    fallbackEnglishLabel: legacyDefaultLabel,
    locale: input.locale,
  });
  return resolveStudioSurfaceItemLabelV1({
    storedLabel: input.storedLabel,
    legacyDefaultLabel,
    presentation,
  });
}

export function resolveWorkbenchControlPresentationV3(
  input: Readonly<{
    definition: ControlDefinitionV2;
    storedLabel: string | undefined;
    locale: "en" | "ja";
  }>,
): ResolvedStudioItemPresentationV1 {
  const legacyDefaultLabel = controlLabelV3(input.definition.controlId);
  const presentation = resolveStudioItemPresentationV1({
    kind: "control",
    itemId: input.definition.controlId,
    fallbackEnglishLabel: legacyDefaultLabel,
    locale: input.locale,
    catalogFacts: {
      controlChangeSemantics: input.definition.changeSemantics,
    },
  });
  return Object.freeze({
    ...presentation,
    label: resolveStudioSurfaceItemLabelV1({
      storedLabel: input.storedLabel,
      legacyDefaultLabel,
      presentation,
    }),
  });
}

export function resolveWorkbenchOutputPresentationV3(
  input: Readonly<{
    locale: "en" | "ja";
    outputId: string;
    outputKind?: string;
    storedLabel: string | undefined;
  }>,
): ResolvedStudioItemPresentationV1 {
  const legacyDefaultLabel = outputLabelV3(input.outputId);
  const presentation = resolveStudioItemPresentationV1({
    kind: "output",
    itemId: input.outputId,
    fallbackEnglishLabel: legacyDefaultLabel,
    locale: input.locale,
    ...(input.outputKind === undefined
      ? {}
      : { catalogFacts: { outputKind: input.outputKind } }),
  });
  return Object.freeze({
    ...presentation,
    label: resolveStudioSurfaceItemLabelV1({
      storedLabel: input.storedLabel,
      legacyDefaultLabel,
      presentation,
    }),
  });
}

/**
 * Resolves a graph series through its output identity while retaining the
 * compact clinical legend label owned by the graph catalog. Historical
 * generated labels localize/migrate; an authored custom label remains exact.
 */
export function resolveWorkbenchGraphSeriesPresentationV3(
  input: Readonly<{
    definition: ModelContractV2["outputCatalog"][number] | undefined;
    locale: "en" | "ja";
    outputId: string;
    seriesId: string;
    storedLabel: string | undefined;
  }>,
): ResolvedStudioItemPresentationV1 {
  const compactDefaultLabel = graphSeriesLabelV3(input.seriesId);
  const presentation = resolveStudioItemPresentationV1({
    kind: "output",
    itemId: input.outputId,
    fallbackEnglishLabel: outputLabelV3(input.outputId),
    locale: input.locale,
    ...(input.definition === undefined
      ? {}
      : { catalogFacts: { outputKind: input.definition.kind } }),
  });
  const resolvedLabel = resolveStudioSurfaceItemLabelV1({
    storedLabel: input.storedLabel,
    legacyDefaultLabel: compactDefaultLabel,
    presentation,
  });
  return Object.freeze({
    ...presentation,
    label:
      resolvedLabel === presentation.label
        ? presentation.description ? studioGraphSeriesLabelV1(input.seriesId, presentation) : compactDefaultLabel
        : resolvedLabel,
  });
}

export function workbenchPeriodicPvaOutputValueV3(
  periodicPva: MainWirePeriodicPvaV1 | undefined,
  outputId: string,
): StudioSimulationOutputValueV2 | undefined {
  const projection = periodicPva?.status === "available"
    ? periodicPva
    : periodicPva?.status === "collecting"
      ? periodicPva.preview
      : null;
  if (projection === null || projection === undefined) return undefined;
  let value: number | null;
  switch (outputId) {
    case MAIN_WIRE_PERIODIC_PVA_OUTPUT_IDS_V1.potentialEnergyMilliJoule:
      if (projection.potentialEnergy === null) return undefined;
      value = projection.potentialEnergy.joule * 1e3;
      break;
    case MAIN_WIRE_PERIODIC_PVA_OUTPUT_IDS_V1.pressureVolumeAreaMilliJoule:
      if (projection.pva === null) return undefined;
      value = projection.pva.joule * 1e3;
      break;
    case MAIN_WIRE_PERIODIC_PVA_OUTPUT_IDS_V1.estimatedMvo2PerBeatPer100G:
      value = projection.estimatedMvo2?.status === "available"
        ? projection.estimatedMvo2.oxygenDemand.totalMlO2PerBeatPer100G
        : null;
      break;
    case MAIN_WIRE_PERIODIC_PVA_OUTPUT_IDS_V1.estimatedMvo2PerMinPer100G:
      value = projection.estimatedMvo2?.status === "available"
        ? projection.estimatedMvo2.oxygenDemand.totalMlO2PerMinPer100G
        : null;
      break;
    default:
      return undefined;
  }
  return Object.freeze({
    outputId,
    value,
    availability:
      value === null ? "not-evaluated-at-accepted-state" : "available",
    quality: value === null ? "not-assessed" : "accepted-derived",
  });
}

export function materializeWorkbenchOutputPresentationItemsV3(
  input: Readonly<{
    contract: ModelContractV2;
    frame: StudioSimulationFrameV2 | null;
    locale: "en" | "ja";
    notAssessedNotice: string;
    pane: ExperimentSurfaceOutputPaneV2;
    periodicPva?: MainWirePeriodicPvaV1;
    presentationAnalyses?: readonly StudioSimulationAnalysisV2[];
    periodicPvaAnalysisError?: string;
  }>,
): readonly ExperimentOutputPresentationItemV3[] {
  const outputById = new Map(
    input.contract.outputCatalog.map((output) => [output.outputId, output]),
  );
  const sortedItems = [...input.pane.items].sort(
    (left, right) => left.order - right.order,
  );
  const selectedById = new Map(
    sortedItems.map((item) => [item.outputId, item]),
  );
  const consumedOutputIds = new Set<string>();
  const result: ExperimentOutputPresentationItemV3[] = [];

  for (const item of sortedItems) {
    if (consumedOutputIds.has(item.outputId)) continue;
    const summary = studioOutputPressureSummaryForOutputIdV1(item.outputId);
    const summaryDefinitions = summary?.memberOutputIds.flatMap((outputId) => {
      const definition = outputById.get(outputId);
      return definition === undefined ? [] : [definition];
    });
    const hasCompleteSummarySelection =
      summary?.memberOutputIds.every((outputId) => selectedById.has(outputId))
      ?? false;
    if (
      summary !== undefined &&
      summaryDefinitions?.length === summary.memberOutputIds.length &&
      hasCompleteSummarySelection
    ) {
      summary.memberOutputIds.forEach((outputId) =>
        consumedOutputIds.add(outputId),
      );
      const selectedMembers = summary.memberOutputIds.flatMap((outputId) => {
        const selectedItem = selectedById.get(outputId);
        return selectedItem === undefined ? [] : [selectedItem];
      });
      const outputValues = summary.memberOutputIds.map(
        (outputId) => input.frame?.outputs[outputId],
      );
      const maximum = scalarAvailableOutputV3(
        input.frame?.outputs[summary.maximumOutputId],
      );
      const minimum = scalarAvailableOutputV3(
        input.frame?.outputs[summary.minimumOutputId],
      );
      const quality = outputValues.some(
        (output) => output === undefined || output.quality === "not-assessed",
      )
        ? "not-assessed"
        : outputValues.some((output) => output?.quality === "accepted-derived")
          ? "accepted-derived"
          : "authoritative-state";
      const storedLabel = resolveStudioOutputPressureSummaryStoredLabelV1({
        summary,
        items: selectedMembers,
        locale: input.locale,
        fallbackEnglishLabel: outputLabelV3,
      });
      const presentation = resolveWorkbenchOutputPresentationV3({
        locale: input.locale,
        outputId: summary.presentationId,
        outputKind: "metric",
        storedLabel,
      });
      result.push({
        itemId: summary.presentationId,
        outputId: null,
        label: presentation.label,
        ...(presentation.description
          ? {
              description: presentation.description,
              descriptionAriaLabel:
                input.locale === "ja"
                  ? `${presentation.label}の説明`
                  : `About ${presentation.label}`,
            }
          : {}),
        value: null,
        displayValue: formatExperimentPressureSummaryV3({
          maximum,
          minimum,
        }),
        unit: summaryDefinitions[0]!.unit,
        availability: outputValues.every(
          (output) => output?.availability === "available",
        )
          ? "available"
          : "unavailable",
        quality,
        ...(quality === "not-assessed"
          ? { qualityNotice: input.notAssessedNotice }
          : {}),
      });
      continue;
    }

    const definition = outputById.get(item.outputId);
    if (definition === undefined) continue;
    const observation = mainWireCardiacCycleOutputValueV1(input.presentationAnalyses, input.frame, item.outputId)
      ?? mainWireFillingFlowOutputValueV1(input.presentationAnalyses, input.frame, item.outputId)
      ?? mainWireAorticJetOutputValueV1(input.presentationAnalyses, input.frame, item.outputId)
      ?? cardiorespiratoryVariationOutputValueV1(input.presentationAnalyses, input.frame, item.outputId)
      ?? cardiorespiratoryBreathOutputValueV1(input.presentationAnalyses, input.frame, item.outputId);
    const outputValue =
      workbenchPeriodicPvaOutputValueV3(input.periodicPva, item.outputId)
      ?? observation
      ?? input.frame?.outputs[item.outputId];
    const pvaNotice = WORKBENCH_PERIODIC_PVA_ANALYSIS_OUTPUT_ID_SET_V1.has(
      item.outputId,
    )
      ? periodicPvaOutputNoticeV3(
          input.periodicPva,
          input.periodicPvaAnalysisError,
          input.locale,
        )
      : undefined;
    const presentation = resolveWorkbenchOutputPresentationV3({
      locale: input.locale,
      outputId: item.outputId,
      outputKind: definition.kind,
      storedLabel: item.label,
    });
    // An unresolved waveform is an expected measurement state, not a runtime
    // error. Keep raw availability/quality, disclose the reason on demand.
    const description = observation?.quality === "not-assessed"
      ? `${input.locale === "ja" ? "現在の波形から新しい測定値を得られていません。" : "No new measurement is resolved from the current waveform."}\n\n${presentation.description}`
      : presentation.description;
    result.push({
      itemId: item.outputId,
      outputId: item.outputId,
      label: presentation.label,
      ...(description
        ? {
            description,
            descriptionAriaLabel:
              input.locale === "ja"
                ? `${presentation.label}の説明`
                : `About ${presentation.label}`,
          }
        : {}),
      value: scalarAvailableOutputV3(outputValue),
      unit: definition.unit,
      significantDigits: definition.significantDigits,
      availability: outputValue?.availability ?? "unavailable",
      quality: outputValue?.quality ?? "not-assessed",
      ...(pvaNotice !== undefined
        ? { qualityNotice: pvaNotice }
        : observation === undefined && outputValue?.quality === "not-assessed"
          ? { qualityNotice: input.notAssessedNotice }
          : {}),
    });
  }
  return result;
}

export function scalarAvailableOutputV3(
  output: StudioSimulationOutputValueV2 | undefined,
): number | null {
  return output?.availability === "available" &&
    output.quality !== "not-assessed" &&
    typeof output.value === "number" &&
    Number.isFinite(output.value)
    ? output.value
    : null;
}

function periodicPvaOutputNoticeV3(
  periodicPva: MainWirePeriodicPvaV1 | undefined,
  analysisError: string | undefined,
  locale: "en" | "ja",
): string | undefined {
  const ja = locale === "ja";
  if (analysisError !== undefined) {
    return ja ? "圧容積関係から推定値を求められませんでした。" : "The pressure–volume estimate could not be completed.";
  }
  if (periodicPva === undefined) return ja ? "圧容積関係の推定を待っています。" : "Waiting for the pressure–volume estimate.";
  if (periodicPva.status === "available") {
    return periodicPva.edpvr.parameterBoundaryHit
      ? ja
        ? "拡張期圧容積関係の外挿範囲に制約があり、PE・PVAと酸素消費量の推定に影響します。"
        : "The diastolic pressure–volume relation has a limited extrapolation range, affecting estimates of PE, PVA and oxygen consumption."
      : undefined;
  }
  if (periodicPva.status === "collecting") {
    return ja ? "圧容積関係を推定中です。値は計算の進行に伴い更新されます。"
      : "The pressure–volume estimate is in progress. Values update as the calculation proceeds.";
  }
  return ja ? "現在の条件では圧容積関係から推定値を求められません。"
    : "The pressure–volume estimate is unavailable under the current conditions.";
}

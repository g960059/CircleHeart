import React from "react";
import type { WorkbenchScalarSampleV3 } from "./WorkbenchScalarSampleV3";
import type { WorkbenchGraphSampleSourceV3 } from "./WorkbenchGraphSampleSourceV3";
import { sweepTraceIdentityV1 } from "./sweep/SweepRenderProtocolV1";
import { useSweepCanvasRendererV1 } from "./sweep/useSweepCanvasRendererV1";
import {
  WorkbenchChartLegendV3, buildWorkbenchTraceLegendModelV3,
  workbenchLegendTraceAlphaV3, workbenchLegendTraceHiddenV3, workbenchTraceLegendKeyV3,
  type WorkbenchChartLegendSelectionV3, type WorkbenchScenarioTraceIdentityV3,
} from "./WorkbenchChartTraceStyleV3";

export type WorkbenchWaveformTraceV3 = WorkbenchScenarioTraceIdentityV3 &
  Readonly<{
    samples: readonly WorkbenchScalarSampleV3[];
    outputId: string;
    signalLabel: string;
    signalDescription?: string;
    signalDescriptionLabel?: string;
    /** Final resolved trace color from the automatic comparison strategy. */
    signalColor: string;
    /** Optional catalog-owned cycle source used to commit stable axes. */
    cyclePhaseOutputId?: string;
  }>;

type SweepingWaveformCanvasCommonPropsV3 = Readonly<{
  axisRanges?: import("@/studio/contracts/v2/content").ExperimentGraphAxisRangesV2;
  legendActions?: React.ReactNode;
  windowSec?: number;
  unitLabel?: string;
  axisLabel?: string;
  includeZero?: boolean;
  className?: string;
}>;

export type SweepingWaveformCanvasPropsV3 = SweepingWaveformCanvasCommonPropsV3 & Readonly<{
  traces: readonly WorkbenchWaveformTraceV3[];
  activeScenarioId: string | null;
  sampleSource?: WorkbenchGraphSampleSourceV3;
}>;

export function SweepingWaveformCanvasV3(
  props: SweepingWaveformCanvasPropsV3,
) {
  const {
    windowSec = 6,
    unitLabel,
    axisLabel,
    includeZero = false,
    className,
  } = props;
  const containerRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [hoveredLegendSelection, setHoveredLegendSelection] =
    React.useState<WorkbenchChartLegendSelectionV3 | null>(null);
  const [hiddenLegendSelections, setHiddenLegendSelections] =
    React.useState<readonly WorkbenchChartLegendSelectionV3[]>([]);
  const legendSelection = hoveredLegendSelection;
  const traces = useStableWorkbenchWaveformTracesV3(props.traces);
  const activeScenarioId = props.activeScenarioId;
  const legendModel = React.useMemo(
    () => buildWorkbenchTraceLegendModelV3(traces.map((trace) => ({
      traceKey: workbenchTraceLegendKeyV3(trace.scenarioId, trace.outputId),
      scenarioId: trace.scenarioId,
      scenarioLabel: trace.scenarioLabel,
      itemId: trace.outputId,
      itemLabel: trace.signalLabel,
      ...(trace.signalDescription === undefined
        ? {}
        : { itemDescription: trace.signalDescription }),
      ...(trace.signalDescriptionLabel === undefined
        ? {}
        : { itemDescriptionLabel: trace.signalDescriptionLabel }),
      color: trace.signalColor,
    }))),
    [traces],
  );
  const domainIdentity = traces
    .map(({ outputId, scenarioId }) => `${scenarioId}:${outputId}`)
    .join("\u001f")
    + `\u001e${unitLabel ?? ""}\u001e${includeZero}\u001e${windowSec}`;

  React.useEffect(() => {
    setHoveredLegendSelection(null);
    setHiddenLegendSelections([]);
  }, [domainIdentity]);

  const renderInput = React.useMemo(() => ({ identity: domainIdentity,
    sampleSource: props.sampleSource, windowSec, includeZero, pressureAxis: unitLabel?.trim().toLowerCase() === "mmhg",
    axisTitle: waveformAxisTitleV3(axisLabel, unitLabel),
    manualDomain: props.axisRanges?.y && Number.isFinite(props.axisRanges.y.minimum) && Number.isFinite(props.axisRanges.y.maximum)
      && props.axisRanges.y.maximum > props.axisRanges.y.minimum
      ? [props.axisRanges.y.minimum, props.axisRanges.y.maximum] as const : undefined,
    traces: traces.map((trace, ordinal) => ({ id: sweepTraceIdentityV1(trace.scenarioId, trace.outputId, ordinal),
      scenarioId: trace.scenarioId, samples: trace.samples, outputId: trace.outputId, cyclePhaseOutputId: trace.cyclePhaseOutputId,
      color: trace.signalColor, alpha: workbenchLegendTraceAlphaV3(legendSelection, waveformLegendDescriptorV3(trace)),
      hidden: workbenchLegendTraceHiddenV3(hiddenLegendSelections, waveformLegendDescriptorV3(trace)) })),
  }), [domainIdentity, props.sampleSource, windowSec, includeZero, unitLabel, axisLabel, props.axisRanges, traces, legendSelection, hiddenLegendSelections]);
  const renderer = useSweepCanvasRendererV1(containerRef, canvasRef, renderInput);

  return (
    <div
      className={`flex min-h-48 h-full w-full flex-col overflow-hidden ${className ?? ""}`}
      data-chart-kind="sweeping-waveform-v3"
      data-render-pane-id={renderer.paneId}
      data-render-backend={renderer.backend}
      data-active-scenario-id={activeScenarioId}
      data-time-window-sec={windowSec}
    >
      <WorkbenchChartLegendV3
        actions={props.legendActions}
        hiddenSelections={hiddenLegendSelections}
        model={legendModel}
        selection={legendSelection}
        onHoverSelection={setHoveredLegendSelection}
        onToggleVisibility={(selection) =>
          setHiddenLegendSelections((current) =>
            current.some((candidate) =>
              legendSelectionKeyV3(candidate) === legendSelectionKeyV3(selection))
              ? current.filter((candidate) =>
                  legendSelectionKeyV3(candidate) !== legendSelectionKeyV3(selection))
              : Object.freeze([...current, selection]))}
      />
      <div ref={containerRef} className="relative min-h-0 flex-1 overflow-hidden">
        <canvas key={renderer.canvasKey}
          ref={canvasRef}
          className="block h-full w-full"
          role="img"
          aria-label={`Sweeping waveform, ${windowSec} second window`}
        />
      </div>
    </div>
  );
}

/** Retains descriptor identity across unrelated Workbench root renders. */
function useStableWorkbenchWaveformTracesV3(
  next: readonly WorkbenchWaveformTraceV3[],
): readonly WorkbenchWaveformTraceV3[] {
  const currentRef = React.useRef<readonly WorkbenchWaveformTraceV3[]>(next);
  const current = currentRef.current;
  if (
    current.length !== next.length
    || current.some((trace, index) =>
      !sameWorkbenchWaveformTraceV3(trace, next[index]!))
  ) {
    currentRef.current = next;
  }
  return currentRef.current;
}

function sameWorkbenchWaveformTraceV3(
  left: WorkbenchWaveformTraceV3,
  right: WorkbenchWaveformTraceV3,
): boolean {
  return left.scenarioId === right.scenarioId
    && left.scenarioLabel === right.scenarioLabel
    && left.scenarioStatus === right.scenarioStatus
    && left.scenarioColor === right.scenarioColor
    && left.scenarioStyleIndex === right.scenarioStyleIndex
    && left.samples === right.samples
    && left.outputId === right.outputId
    && left.signalLabel === right.signalLabel
    && left.signalDescription === right.signalDescription
    && left.signalDescriptionLabel === right.signalDescriptionLabel
    && left.signalColor === right.signalColor
    && left.cyclePhaseOutputId === right.cyclePhaseOutputId;
}

function waveformLegendDescriptorV3(trace: WorkbenchWaveformTraceV3) {
  return Object.freeze({
    traceKey: workbenchTraceLegendKeyV3(trace.scenarioId, trace.outputId),
    scenarioId: trace.scenarioId,
    scenarioLabel: trace.scenarioLabel,
    itemId: trace.outputId,
    itemLabel: trace.signalLabel,
    ...(trace.signalDescription === undefined
      ? {}
      : { itemDescription: trace.signalDescription }),
    ...(trace.signalDescriptionLabel === undefined
      ? {}
      : { itemDescriptionLabel: trace.signalDescriptionLabel }),
    color: trace.signalColor,
  });
}

function legendSelectionKeyV3(
  selection: WorkbenchChartLegendSelectionV3 | null,
): string | null {
  if (selection === null) return null;
  if (selection.kind === "scenario") return `scenario:${selection.scenarioId}`;
  if (selection.kind === "item") return `item:${selection.itemId}`;
  return `trace:${selection.traceKey}`;
}

function waveformAxisTitleV3(
  axisLabel: string | undefined,
  unitLabel: string | undefined,
): string | undefined {
  const explicit = axisLabel?.trim();
  const unit = unitLabel?.trim();
  if (explicit) return unit ? `${explicit} (${unit})` : explicit;
  if (!unit) return undefined;
  const normalized = unit.toLowerCase();
  if (normalized === "mmhg") return `Pressure (${unit})`;
  if (normalized === "ml" || normalized === "l") return `Volume (${unit})`;
  if (normalized.includes("/s") || normalized.includes("/min")) {
    return `Flow (${unit})`;
  }
  return unit;
}

import React from "react";
import { workbenchManualChartDomainV3 } from "./WorkbenchManualChartDomainV3";
import { useAppTheme } from "@/appTheme";
import { useTranslation } from "react-i18next";
import { workbenchLoadRelationDescriptionV1 } from "./WorkbenchLoadRelationDescriptionV1";
import { WorkbenchAnalysisErrorPopoverV3 } from "./WorkbenchAnalysisErrorPopoverV3";

import type {
  MainWireIntegratedModelGuytonSideV3,
  MainWireIntegratedModelStructuralReturnOrientationV3,
} from "@/analysis/methods/mainWire/MainWireGuytonStarlingOrientationV3";
import { mainWireIntegratedModelStarlingDescendingLimbV3 } from "@/analysis/methods/mainWire/MainWirePressureVolumeProtocolsV3";
import {
  scaleLinearV3,
  readWorkbenchCanvasThemeVariablesV3,
  useResponsiveCanvasFrameV3,
} from "./WorkbenchCanvasRuntimeV3";
import {
  WorkbenchChartLegendV3, buildWorkbenchTraceLegendModelV3,
  drawWorkbenchMeasuredPointV3,
  workbenchHistoryAlphaV3, workbenchLegendTraceAlphaV3, workbenchLegendTraceHiddenV3,
  workbenchLegendSelectionMatchesTraceV3,
  workbenchTraceLegendKeyV3, type WorkbenchChartLegendSelectionV3,
} from "./WorkbenchChartTraceStyleV3";

export type GuytonStarlingPlotDomainV3 = Readonly<{
  pressureMinimumMmHg: number;
  pressureMaximumMmHg: number;
  flowMinimumLPerMin: number;
  flowMaximumLPerMin: number;
}>;

export type GuytonStarlingAxisLabelsV3 = Readonly<{
  horizontal: string;
  vertical: string;
}>;

export function guytonStarlingAxisLabelsV3(
  side: MainWireIntegratedModelGuytonSideV3,
): GuytonStarlingAxisLabelsV3 {
  return Object.freeze({
    horizontal:
      side === "right"
        ? "CVP / mean RAP (mmHg)"
        : "Mean LAP (PCWP surrogate) (mmHg)",
    vertical: "CO / venous return (L/min)",
  });
}

export { structuralReturnOrientationFromPayloadV3 } from "@/analysis/methods/mainWire/MainWireStructuralReturnPayloadV3";

export function guytonStarlingPlotDomainV3(
  orientation: MainWireIntegratedModelStructuralReturnOrientationV3,
  historyOrientations: readonly MainWireIntegratedModelStructuralReturnOrientationV3[] = [],
): GuytonStarlingPlotDomainV3 {
  if (historyOrientations.length > 0) return unionGuytonStarlingDomainsV3([
    guytonStarlingPlotDomainV3(orientation),
    ...historyOrientations.filter(previous => previous.side === orientation.side).map(previous => guytonStarlingPlotDomainV3(previous)),
  ]);
  const starling =
    orientation.starlingLocus.status === "requires-protocol"
      ? []
      : orientation.starlingLocus.points
          .filter((point) => !("curveEligible" in point) || point.curveEligible)
          .map((point) => ({
            pressureMmHg: point.fillingPressureMmHg,
            flowLPerMin: point.cardiacOutputLPerMin,
          }));
  const anchors = [
    {
      pressureMmHg: orientation.operatingPoint.downstreamPressureMmHg,
      flowLPerMin: orientation.operatingPoint.returnFlowLPerMin,
    },
    {
      pressureMmHg: orientation.fillingPressureMmHg,
      flowLPerMin: 0,
    },
  ];
  const structuralReturn = orientation.curve.map((point) => ({
    pressureMmHg: point.downstreamPressureMmHg,
    flowLPerMin: point.returnFlowLPerMin,
  }));
  const visibleCandidates =
    starling.length === 0
      ? [...structuralReturn, ...anchors]
      : [...starling, ...anchors];
  const minimumPressure = Math.min(
    ...visibleCandidates
      .map(({ pressureMmHg }) => pressureMmHg)
      .filter(Number.isFinite),
  );
  const flows = visibleCandidates
    .map(({ flowLPerMin }) => flowLPerMin)
    .filter(Number.isFinite);
  const maximumPressure = guytonZeroFlowPresentationMaximumV3(orientation);
  const maximumFlow = Math.max(1, ...flows);
  const pressureSpan = Math.max(4, maximumPressure - minimumPressure);
  const pressurePaddingMmHg = Math.max(1, pressureSpan * 0.06);
  const clinicalMinimumMmHg = orientation.side === "right" ? -3 : -2;
  return Object.freeze({
    pressureMinimumMmHg:
      starling.length === 0
        ? minimumPressure - pressurePaddingMmHg
        : Math.min(
            clinicalMinimumMmHg,
            minimumPressure - pressurePaddingMmHg,
          ),
    // The Pmsf/Pmpf orientation is the exact zero-return pressure in this
    // frozen structural map. Ten percent of headroom keeps that meaningful
    // endpoint visible without allowing unfinished high-TBV Starling samples
    // to push the operating intersection into the left edge of the chart.
    pressureMaximumMmHg: maximumPressure,
    flowMinimumLPerMin: 0,
    // Extreme frozen-ledger Guyton plateaus are intentionally clipped. Once a
    // Starling locus exists, its measured outputs and operating intersection
    // own the vertical viewport rather than a structurally flow-limited tail.
    flowMaximumLPerMin: niceHalfUnitCeilingV3(maximumFlow * 1.22),
  });
}

/**
 * Stable right-hand presentation boundary for the Guyton / Starling view.
 * `fillingPressureMmHg` is the model's exact uniform filling pressure and thus
 * the zero-flow intercept of the structural venous-return orientation.
 */
export function guytonZeroFlowPresentationMaximumV3(
  orientation: MainWireIntegratedModelStructuralReturnOrientationV3,
): number {
  const zeroFlowPressureMmHg = orientation.fillingPressureMmHg;
  const headroomMmHg = Math.max(0.5, Math.abs(zeroFlowPressureMmHg) * 0.1);
  return Math.max(
    zeroFlowPressureMmHg + headroomMmHg,
    orientation.operatingPoint.downstreamPressureMmHg + 0.5,
  );
}

export type StarlingPresentationFocusV3 = Readonly<{
  peakPressureMmHg: number;
  firstDecliningPressureMmHg: number;
  confirmedDecliningPressureMmHg: number;
  pressureMaximumMmHg: number;
}>;

/**
 * Finds a sustained descending limb without allowing one noisy plateau point
 * to own the viewport. The absolute high-volume samples remain in the payload;
 * this result controls presentation focus only.
 */
export function starlingPresentationFocusV3(
  orientation: MainWireIntegratedModelStructuralReturnOrientationV3,
): StarlingPresentationFocusV3 | null {
  if (orientation.starlingLocus.status === "requires-protocol") return null;
  const descendingLimb = mainWireIntegratedModelStarlingDescendingLimbV3(
    orientation.starlingLocus.points.map((point) =>
      Object.freeze({
        cardiacOutputLPerMin: point.cardiacOutputLPerMin,
        curveEligible: !("curveEligible" in point) || point.curveEligible,
        fillingPressureMmHg: point.fillingPressureMmHg,
      }),
    ),
  );
  if (descendingLimb === null) return null;
  const pressureMarginMmHg = Math.max(
    1,
    0.2 *
      Math.max(
        Math.abs(descendingLimb.firstDecliningPressureMmHg),
        Math.abs(
          descendingLimb.firstDecliningPressureMmHg -
            orientation.operatingPoint.downstreamPressureMmHg,
        ),
      ),
  );
  return Object.freeze({
    ...descendingLimb,
    // The confirmation sample remains in the raw locus but does not expand
    // the default viewport. Show the first sustained decline and roughly 20%
    // more pressure so the overload turn is legible without letting a coarse
    // confirmatory high-volume point dominate the chart.
    pressureMaximumMmHg:
      descendingLimb.firstDecliningPressureMmHg + pressureMarginMmHg,
  });
}

function niceHalfUnitCeilingV3(value: number): number {
  return Math.max(1, Math.ceil(value * 2) / 2);
}

export type GuytonStarlingComparisonTraceV3 = Readonly<{
  scenarioId: string;
  scenarioLabel: string;
  color: string;
  orientation: MainWireIntegratedModelStructuralReturnOrientationV3;
  orientationAlpha?: number;
  stale?: boolean;
  error?: string | null;
  pending?: boolean;
  historyOrientations?: readonly MainWireIntegratedModelStructuralReturnOrientationV3[];
}>;

export function guytonStarlingComparisonPlotDomainV3(
  traces: readonly GuytonStarlingComparisonTraceV3[],
): GuytonStarlingPlotDomainV3 {
  if (traces.length === 0) {
    throw new Error("Guyton / Starling comparison requires one Scenario");
  }
  const side = traces[0]!.orientation.side;
  if (traces.some(({ orientation }) => orientation.side !== side)) {
    throw new Error(
      "Guyton / Starling comparison cannot mix circulation sides",
    );
  }
  // Only the pane's selected (bounded) history participates in comparison.
  return unionGuytonStarlingDomainsV3(traces.map(({ orientation, historyOrientations }) =>
    guytonStarlingPlotDomainV3(orientation, historyOrientations),
  ));
}

function unionGuytonStarlingDomainsV3(domains: readonly GuytonStarlingPlotDomainV3[]): GuytonStarlingPlotDomainV3 {
  return Object.freeze({
    pressureMinimumMmHg: Math.min(
      ...domains.map((domain) => domain.pressureMinimumMmHg),
    ),
    pressureMaximumMmHg: Math.max(
      ...domains.map((domain) => domain.pressureMaximumMmHg),
    ),
    flowMinimumLPerMin: Math.min(
      ...domains.map((domain) => domain.flowMinimumLPerMin),
    ),
    flowMaximumLPerMin: Math.max(
      ...domains.map((domain) => domain.flowMaximumLPerMin),
    ),
  });
}

export function GuytonStarlingOrientationCanvasV3({
  color = "#167db8",
  orientation,
  historyOrientations = [],
  scenarioLabel = "Scenario",
  className,
}: Readonly<{
  color?: string;
  orientation: MainWireIntegratedModelStructuralReturnOrientationV3;
  historyOrientations?: readonly MainWireIntegratedModelStructuralReturnOrientationV3[];
  scenarioLabel?: string;
  className?: string;
}>) {
  return (
    <GuytonStarlingComparisonCanvasV3
      className={className}
      traces={Object.freeze([
        Object.freeze({
          scenarioId: "scenario",
          scenarioLabel,
          color,
          orientation,
          historyOrientations,
        }),
      ])}
    />
  );
}

export function GuytonStarlingComparisonCanvasV3({
  axisRanges,
  traces,
  className,
  legendActions,
  onRetryAnalysis,
  recalculatingLabel = "Recalculating Guyton / Starling",
}: Readonly<{
  traces: readonly GuytonStarlingComparisonTraceV3[];
  axisRanges?: import("@/studio/contracts/v2/content").ExperimentGraphAxisRangesV2;
  className?: string;
  legendActions?: React.ReactNode;
  onRetryAnalysis?: () => boolean;
  recalculatingLabel?: string;
}>) {
  if (traces.length === 0) {
    throw new Error("Guyton / Starling comparison requires one Scenario");
  }
  const firstTrace = traces[0]!;
  const { appTheme } = useAppTheme();
  const { i18n } = useTranslation();
  const side = firstTrace.orientation.side;
  if (traces.some(({ orientation }) => orientation.side !== side)) {
    throw new Error(
      "Guyton / Starling comparison cannot mix circulation sides",
    );
  }
  const containerRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [hoveredSelection, setSelection] = React.useState<WorkbenchChartLegendSelectionV3 | null>(null);
  const [hiddenSelections, setHiddenSelections] = React.useState<readonly WorkbenchChartLegendSelectionV3[]>([]);
  const descriptor = (trace: GuytonStarlingComparisonTraceV3) => ({
    traceKey: workbenchTraceLegendKeyV3(trace.scenarioId, side),
    scenarioId: trace.scenarioId, scenarioLabel: trace.scenarioLabel,
    itemId: side, itemLabel: "Guyton / Starling", color: trace.color,
    itemDescription: workbenchLoadRelationDescriptionV1("starling", i18n.resolvedLanguage ?? i18n.language),
  });
  const legend = buildWorkbenchTraceLegendModelV3(traces.map(descriptor));
  const visibleTraces = traces.filter((trace) => !workbenchLegendTraceHiddenV3(hiddenSelections, descriptor(trace)));
  const selection = visibleTraces.some((trace) =>
    workbenchLegendSelectionMatchesTraceV3(hoveredSelection, descriptor(trace))) ? hoveredSelection : null;
  const domain = React.useMemo(
    () => {
      const automatic = guytonStarlingComparisonPlotDomainV3(visibleTraces.length === 0 ? traces : visibleTraces);
      const [pressureMinimumMmHg, pressureMaximumMmHg] = workbenchManualChartDomainV3(
        [automatic.pressureMinimumMmHg, automatic.pressureMaximumMmHg], axisRanges?.x);
      const [flowMinimumLPerMin, flowMaximumLPerMin] = workbenchManualChartDomainV3(
        [automatic.flowMinimumLPerMin, automatic.flowMaximumLPerMin], axisRanges?.y);
      return { ...automatic, pressureMinimumMmHg, pressureMaximumMmHg, flowMinimumLPerMin, flowMaximumLPerMin };
    },
    [traces, hiddenSelections, axisRanges],
  );
  const draw = React.useCallback(
    (context: CanvasRenderingContext2D, width: number, height: number) => {
      const plot = plotRectV3(width, height);
      const theme = readThemeV3(containerRef.current);
      const x = (pressureMmHg: number) =>
        scaleLinearV3(
          pressureMmHg,
          domain.pressureMinimumMmHg,
          domain.pressureMaximumMmHg,
          plot.left,
          plot.right,
        );
      const y = (flowLPerMin: number) =>
        scaleLinearV3(
          flowLPerMin,
          domain.flowMinimumLPerMin,
          domain.flowMaximumLPerMin,
          plot.bottom,
          plot.top,
        );
      drawAxesV3(
        context,
        plot,
        domain,
        theme,
        guytonStarlingAxisLabelsV3(side),
      );
      context.save();
      context.beginPath();
      context.rect(
        plot.left,
        plot.top,
        plot.right - plot.left,
        plot.bottom - plot.top,
      );
      context.clip();
      visibleTraces.forEach((trace) => {
        const { color, historyOrientations = [] } = trace;
        historyOrientations.forEach((historical, historyIndex) => {
          drawOrientationV3(
            context,
            historical,
            x,
            y,
            plot,
            color,
            theme.background,
            guytonHistoryAlphaV3(historyIndex, historyOrientations.length)
              * workbenchLegendTraceAlphaV3(selection, descriptor(trace)),
            2.5,
          );
        });
      });
      [...visibleTraces].sort((a, b) =>
        workbenchLegendTraceAlphaV3(selection, descriptor(a)) - workbenchLegendTraceAlphaV3(selection, descriptor(b)))
        .forEach((trace) => {
        const { color, orientation, orientationAlpha = 1 } = trace;
        drawOrientationV3(
          context,
          orientation,
          x,
          y,
          plot,
          color,
          theme.background,
          orientationAlpha * workbenchLegendTraceAlphaV3(selection, descriptor(trace)),
          3,
        );
      });
      context.restore();
    },
    [appTheme, domain, side, traces, selection, hiddenSelections],
  );
  useResponsiveCanvasFrameV3(
    containerRef,
    canvasRef,
    draw,
    "guyton-starling",
  );

  const sideLabel =
    side === "right" ? "Systemic venous return" : "Pulmonary venous return";
  const singleProgress =
    traces.length === 1 ? starlingProgressV3(firstTrace.orientation) : null;
  const pendingTraces = traces.filter(({ pending }) => pending === true);
  const staleLabels = visibleTraces.filter(trace => trace.stale).map(trace => trace.scenarioLabel);
  const analysisError = visibleTraces.filter(trace => trace.error).map(trace => `${trace.scenarioLabel}: ${trace.error}`).join("\n");
  return (
    <div
      className={`flex min-h-56 h-full w-full flex-col overflow-hidden ${className ?? ""}`}
      data-chart-kind="guyton-starling-structural-orientation-v3"
      data-circulation-side={side}
      data-structural-semantics={firstTrace.orientation.semantics}
      data-scenario-count={traces.length}
      data-history-count={traces.reduce(
        (total, trace) => total + (trace.historyOrientations?.length ?? 0) + Number(trace.stale === true),
        0,
      )}
      data-starling-status={singleProgress?.status}
      data-starling-completed-points={singleProgress?.completed}
      data-starling-total-points={singleProgress?.total}
      data-starling-boundary-point-count={singleProgress?.boundary}
      data-starling-hypovolemic-point-count={singleProgress?.hypovolemic}
      data-starling-hypervolemic-point-count={singleProgress?.hypervolemic}
      data-pending-scenario-count={pendingTraces.length}
      data-stale-scenario-count={visibleTraces.filter(trace => trace.stale).length}
      data-visible-scenario-count={visibleTraces.length}
      data-starling-display-extrapolation="none"
      data-pressure-minimum-mmhg={domain.pressureMinimumMmHg}
      data-pressure-maximum-mmhg={domain.pressureMaximumMmHg}
      data-flow-minimum-l-per-min={domain.flowMinimumLPerMin}
      data-flow-maximum-l-per-min={domain.flowMaximumLPerMin}
    >
      <WorkbenchChartLegendV3 actions={legendActions} model={legend} selection={selection} hiddenSelections={hiddenSelections}
        updatingLabel={pendingTraces.length > 0
          ? `${recalculatingLabel} ${pendingTraces.map(trace => trace.scenarioLabel).join(", ")}` : undefined}
        onHoverSelection={setSelection}
        onToggleVisibility={(candidate) => setHiddenSelections((current) =>
          current.some((item) => JSON.stringify(item) === JSON.stringify(candidate))
            ? current.filter((item) => JSON.stringify(item) !== JSON.stringify(candidate))
            : [...current, candidate])} />
      <div ref={containerRef} className="relative min-h-0 flex-1 overflow-hidden">
      <canvas
        ref={canvasRef}
        className="block h-full w-full"
        role="img"
        aria-label={`${sideLabel}; ${traces.length} Scenario comparison${staleLabels.length === 0 ? "" : `; previous input conditions: ${staleLabels.join(", ")}`}`}
      />
      {analysisError && <WorkbenchAnalysisErrorPopoverV3 error={analysisError} onRetry={onRetryAnalysis}
        label={i18n.language?.startsWith("ja") ? "解析を更新できませんでした" : "Analysis update unavailable"}
        testId="workbench-structural-analysis-error" />}
      <div className="sr-only">
        {traces.map((trace) => (
          <span
            key={trace.scenarioId}
            data-starling-scenario-id={trace.scenarioId}
            data-starling-history-count={(trace.historyOrientations?.length ?? 0) + Number(trace.stale === true)}
            data-starling-pending={trace.pending === true ? "true" : "false"}
            data-starling-stale={trace.stale ? "true" : "false"}
          >
            {trace.scenarioLabel}: {starlingStatusTextV3(trace.orientation, i18n.language?.startsWith("ja") === true)}
          </span>
        ))}
      </div>
      </div>
    </div>
  );
}


function drawOrientationV3(
  context: CanvasRenderingContext2D,
  orientation: MainWireIntegratedModelStructuralReturnOrientationV3,
  x: (value: number) => number,
  y: (value: number) => number,
  plot: PlotRectV3,
  color: string,
  pointBorderColor: string,
  alpha: number,
  pointRadius: number,
): void {
  drawCurveV3(
    context,
    orientation.curve.map((point) => ({
      pressureMmHg: point.downstreamPressureMmHg,
      flowLPerMin: point.returnFlowLPerMin,
    })),
    x,
    y,
    color,
    [],
    alpha * 0.58,
  );
  if (orientation.starlingLocus.status !== "requires-protocol") {
    for (const segment of starlingCurveSegmentsV3(orientation.starlingLocus.points)) drawCurveV3(
      context,
      segment,
      x,
      y,
      color,
      [],
      alpha,
    );
    orientation.starlingLocus.points.forEach((point) => {
      if ("curveEligible" in point && !point.curveEligible) {
        drawHollowPointV3(
          context,
          x(point.fillingPressureMmHg),
          y(point.cardiacOutputLPerMin),
          color,
          alpha,
          pointRadius,
        );
      } else {
        drawWorkbenchMeasuredPointV3(
          context,
          x(point.fillingPressureMmHg),
          y(point.cardiacOutputLPerMin),
          color,
          pointBorderColor,
          alpha,
          pointRadius,
        );
      }
    });
  }
  drawWorkbenchMeasuredPointV3(
    context,
    x(orientation.operatingPoint.downstreamPressureMmHg),
    y(orientation.operatingPoint.returnFlowLPerMin),
    color,
    pointBorderColor,
    alpha,
  );
  drawFillingPressureMarkerV3(
    context,
    x(orientation.fillingPressureMmHg),
    plot,
    color,
    alpha * 0.35,
  );
}

function guytonHistoryAlphaV3(
  historyIndex: number,
  historyCount: number,
): number {
  return workbenchHistoryAlphaV3(historyIndex, historyCount);
}

function starlingProgressV3(
  orientation: MainWireIntegratedModelStructuralReturnOrientationV3,
): Readonly<{
  status: string;
  completed?: number;
  total?: number;
  boundary: number;
  hypovolemic: number;
  hypervolemic: number;
}> {
  const locus = orientation.starlingLocus;
  if (
    locus.status !== "responsive-fixed-tbv-preview" &&
    locus.status !== "measured-fixed-tbv-protocol"
  ) {
    return Object.freeze({
      status: locus.status,
      boundary: 0,
      hypovolemic: 0,
      hypervolemic: 0,
    });
  }
  const anchor = locus.points.find(({ role }) => role === "operating-anchor");
  return Object.freeze({
    status: locus.status,
    completed: locus.completedPointCount,
    total: locus.totalPointCount,
    boundary: locus.points.filter(({ curveEligible }) => !curveEligible).length,
    hypovolemic:
      anchor === undefined
        ? 0
        : locus.points.filter(
            (point) => point.totalBloodVolumeMl < anchor.totalBloodVolumeMl,
          ).length,
    hypervolemic:
      anchor === undefined
        ? 0
        : locus.points.filter(
            (point) => point.totalBloodVolumeMl > anchor.totalBloodVolumeMl,
          ).length,
  });
}

function starlingStatusTextV3(
  orientation: MainWireIntegratedModelStructuralReturnOrientationV3,
  japanese: boolean,
): string {
  const locus = orientation.starlingLocus;
  if (locus.status === "measured-fixed-tbv-protocol") {
    return japanese
      ? `Starling曲線：${locus.completedPointCount}条件の計算結果`
      : `Starling curve: results from ${locus.completedPointCount} conditions`;
  }
  if (locus.status === "responsive-fixed-tbv-preview") {
    return japanese ? "Starling曲線：概形を表示中" : "Starling curve: preliminary outline";
  }
  return japanese ? "Starling曲線の計算結果はありません" : "Starling curve results are unavailable";
}

type PlotPointV3 = Readonly<{
  pressureMmHg: number;
  flowLPerMin: number;
}>;

type StarlingRenderablePointV3 = Readonly<{
  fillingPressureMmHg: number;
  cardiacOutputLPerMin: number;
  curveEligible?: boolean;
  totalBloodVolumeMl?: number;
}>;

/** Preserve load order and unsupported gaps. PCHIP is only a within-support
 * guide on strictly monotone pressure runs; duplicate pressures remain a
 * vertical segment, never an averaged observation or an invented extra dot. */
export function starlingCurveSegmentsV3(
  points: readonly StarlingRenderablePointV3[],
): readonly (readonly PlotPointV3[])[] {
  const ordered = points.every((p) => Number.isFinite(p.totalBloodVolumeMl))
    ? [...points].sort((a, b) => a.totalBloodVolumeMl! - b.totalBloodVolumeMl!) : points;
  const result: (readonly PlotPointV3[])[] = [];
  let run: StarlingRenderablePointV3[] = [];
  let direction = 0;
  const flush = () => {
    if (run.length) result.push(interpolateStarlingRunV3(run));
    run = []; direction = 0;
  };
  for (const [index, point] of ordered.entries()) {
    const duplicateLoad = Number.isFinite(point.totalBloodVolumeMl)
      && (ordered[index - 1]?.totalBloodVolumeMl === point.totalBloodVolumeMl
        || ordered[index + 1]?.totalBloodVolumeMl === point.totalBloodVolumeMl);
    if (point.curveEligible === false || duplicateLoad
      || !Number.isFinite(point.fillingPressureMmHg) || !Number.isFinite(point.cardiacOutputLPerMin)) {
      flush(); continue;
    }
    const previous = run.at(-1);
    if (previous) {
      const sign = Math.sign(point.fillingPressureMmHg - previous.fillingPressureMmHg);
      if (sign === 0) {
        flush();
        result.push([previous, point].map((p) => ({pressureMmHg:p.fillingPressureMmHg, flowLPerMin:p.cardiacOutputLPerMin})));
      } else if (direction && sign !== direction) {
        flush(); run = [previous];
      }
      direction = sign;
    }
    run.push(point);
  }
  flush();
  return result;
}

/**
 * PCHIP inside one validated strictly monotone pressure run. Never average
 * duplicate observations; the caller preserves them as vertical segments.
 */
function interpolateStarlingRunV3(
  points: readonly StarlingRenderablePointV3[],
): readonly PlotPointV3[] {
  const unique = points
    .map((point) => ({
      pressureMmHg: point.fillingPressureMmHg,
      flowLPerMin: point.cardiacOutputLPerMin,
    }))
    .sort((left, right) => left.pressureMmHg - right.pressureMmHg);
  if (unique.length < 3) return Object.freeze(unique);

  const interval = unique
    .slice(0, -1)
    .map(
      (point, index) => unique[index + 1]!.pressureMmHg - point.pressureMmHg,
    );
  const secant = interval.map(
    (width, index) =>
      (unique[index + 1]!.flowLPerMin - unique[index]!.flowLPerMin) / width,
  );
  const slopes = Array.from({ length: unique.length }, () => 0);
  slopes[0] = pchipEndpointSlopeV3(
    interval[0]!,
    interval[1]!,
    secant[0]!,
    secant[1]!,
  );
  slopes[slopes.length - 1] = pchipEndpointSlopeV3(
    interval.at(-1)!,
    interval.at(-2)!,
    secant.at(-1)!,
    secant.at(-2)!,
  );
  for (let index = 1; index < unique.length - 1; index += 1) {
    const previousSecant = secant[index - 1]!;
    const nextSecant = secant[index]!;
    if (
      previousSecant === 0 ||
      nextSecant === 0 ||
      Math.sign(previousSecant) !== Math.sign(nextSecant)
    ) {
      slopes[index] = 0;
      continue;
    }
    const previousWidth = interval[index - 1]!;
    const nextWidth = interval[index]!;
    const firstWeight = 2 * nextWidth + previousWidth;
    const secondWeight = nextWidth + 2 * previousWidth;
    slopes[index] =
      (firstWeight + secondWeight) /
      (firstWeight / previousSecant + secondWeight / nextSecant);
  }

  const sampled: PlotPointV3[] = [];
  for (let index = 0; index < unique.length - 1; index += 1) {
    const left = unique[index]!;
    const right = unique[index + 1]!;
    const width = interval[index]!;
    const sampleCount = Math.max(4, Math.min(18, Math.ceil(width * 3)));
    for (let ordinal = 0; ordinal < sampleCount; ordinal += 1) {
      if (index > 0 && ordinal === 0) continue;
      const ratio = ordinal / (sampleCount - 1);
      const ratio2 = ratio * ratio;
      const ratio3 = ratio2 * ratio;
      sampled.push(
        Object.freeze({
          pressureMmHg: left.pressureMmHg + ratio * width,
          flowLPerMin:
            (2 * ratio3 - 3 * ratio2 + 1) * left.flowLPerMin +
            (ratio3 - 2 * ratio2 + ratio) * width * slopes[index]! +
            (-2 * ratio3 + 3 * ratio2) * right.flowLPerMin +
            (ratio3 - ratio2) * width * slopes[index + 1]!,
        }),
      );
    }
  }
  return Object.freeze(sampled);
}

function pchipEndpointSlopeV3(
  firstWidth: number,
  secondWidth: number,
  firstSecant: number,
  secondSecant: number,
): number {
  let slope =
    ((2 * firstWidth + secondWidth) * firstSecant - firstWidth * secondSecant) /
    (firstWidth + secondWidth);
  if (Math.sign(slope) !== Math.sign(firstSecant)) return 0;
  if (
    Math.sign(firstSecant) !== Math.sign(secondSecant) &&
    Math.abs(slope) > Math.abs(3 * firstSecant)
  )
    slope = 3 * firstSecant;
  return slope;
}

type PlotRectV3 = Readonly<{
  left: number;
  right: number;
  top: number;
  bottom: number;
}>;

type CanvasThemeV3 = Readonly<{
  grid: string;
  axis: string;
  text: string;
  background: string;
  font: string;
}>;

function plotRectV3(width: number, height: number): PlotRectV3 {
  return Object.freeze({
    left: Math.min(48, Math.max(34, width * 0.13)),
    right: Math.max(56, width - 12),
    top: 25,
    bottom: Math.max(50, height - 44),
  });
}

function drawAxesV3(
  context: CanvasRenderingContext2D,
  plot: PlotRectV3,
  domain: GuytonStarlingPlotDomainV3,
  theme: CanvasThemeV3,
  labels: GuytonStarlingAxisLabelsV3,
): void {
  context.save();
  context.lineWidth = 1;
  context.font = theme.font;
  context.textBaseline = "middle";
  for (let index = 0; index <= 4; index += 1) {
    const ratio = index / 4;
    const x = plot.left + ratio * (plot.right - plot.left);
    const pressure =
      domain.pressureMinimumMmHg +
      ratio * (domain.pressureMaximumMmHg - domain.pressureMinimumMmHg);
    context.strokeStyle = theme.grid;
    context.beginPath();
    context.moveTo(x, plot.top);
    context.lineTo(x, plot.bottom);
    context.stroke();
    context.fillStyle = theme.text;
    context.textAlign = "center";
    context.fillText(formatNumberV3(pressure), x, plot.bottom + 12);
  }
  for (let index = 0; index <= 4; index += 1) {
    const ratio = index / 4;
    const y = plot.bottom - ratio * (plot.bottom - plot.top);
    const flow =
      domain.flowMinimumLPerMin +
      ratio * (domain.flowMaximumLPerMin - domain.flowMinimumLPerMin);
    context.strokeStyle = theme.grid;
    context.beginPath();
    context.moveTo(plot.left, y);
    context.lineTo(plot.right, y);
    context.stroke();
    context.fillStyle = theme.text;
    context.textAlign = "right";
    context.fillText(formatNumberV3(flow), plot.left - 5, y);
  }
  context.strokeStyle = theme.axis;
  context.beginPath();
  context.moveTo(plot.left, plot.top);
  context.lineTo(plot.left, plot.bottom);
  context.lineTo(plot.right, plot.bottom);
  context.stroke();
  context.fillStyle = theme.text;
  context.textAlign = "center";
  context.fillText(
    labels.horizontal,
    (plot.left + plot.right) / 2,
    plot.bottom + 35,
  );
  context.save();
  context.translate(10, (plot.top + plot.bottom) / 2);
  context.rotate(-Math.PI / 2);
  context.fillText(labels.vertical, 0, 0);
  context.restore();
  context.restore();
}

function drawCurveV3(
  context: CanvasRenderingContext2D,
  points: readonly PlotPointV3[],
  x: (value: number) => number,
  y: (value: number) => number,
  color: string,
  dash: readonly number[],
  alpha = 1,
): void {
  const finite = points.filter(
    (point) =>
      Number.isFinite(point.pressureMmHg) && Number.isFinite(point.flowLPerMin),
  );
  if (finite.length < 2) return;
  context.save();
  context.globalAlpha = alpha;
  context.strokeStyle = color;
  context.lineWidth = 1.8;
  context.setLineDash([...dash]);
  context.beginPath();
  finite.forEach((point, index) => {
    const px = x(point.pressureMmHg);
    const py = y(point.flowLPerMin);
    if (index === 0) context.moveTo(px, py);
    else context.lineTo(px, py);
  });
  context.stroke();
  context.restore();
}

function drawHollowPointV3(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  alpha = 1,
  radius = 4,
): void {
  context.save();
  context.globalAlpha = alpha;
  context.strokeStyle = color;
  context.lineWidth = 1.5;
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.stroke();
  context.restore();
}

function drawFillingPressureMarkerV3(
  context: CanvasRenderingContext2D,
  x: number,
  plot: PlotRectV3,
  color: string,
  alpha = 1,
): void {
  context.save();
  context.globalAlpha = alpha;
  context.strokeStyle = color;
  context.lineWidth = 1;
  context.setLineDash([2, 4]);
  context.beginPath();
  context.moveTo(x, plot.top);
  context.lineTo(x, plot.bottom);
  context.stroke();
  context.restore();
}

function readThemeV3(element: HTMLElement | null): CanvasThemeV3 {
  const [grid, axis, text, background, font] = readWorkbenchCanvasThemeVariablesV3(element, [
    ["--wb-grid", "rgba(165, 185, 200, 0.10)"],
    ["--wb-axis", "rgba(165, 185, 200, 0.32)"],
    ["--wb-muted", "rgba(203, 213, 225, 0.72)"],
    ["--wb-zone-main-bg", "#0a141d"],
    ["--wb-chart-small-font", "9px ui-monospace, SFMono-Regular, Menlo, monospace"],
  ]);
  return Object.freeze({
    grid: grid!,
    axis: axis!,
    text: text!,
    background: background!,
    font: font!,
  });
}

function formatNumberV3(value: number): string {
  if (!Number.isFinite(value)) return "—";
  if (value === 0) return "0";
  return Math.abs(value) >= 10 ? value.toFixed(0) : value.toFixed(1);
}

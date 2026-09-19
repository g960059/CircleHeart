import React from "react";
import { STUDIO_PV_TRAIL_DEFAULT_BEATS_V2, STUDIO_PV_TRAIL_MAX_BEATS_V2 } from "@/studio/contracts/v2/content";
import type { WorkbenchOrbitHistoryEpochV3 } from "./WorkbenchPresentationSampleStoreV3";
import { workbenchManualChartDomainV3 } from "./WorkbenchManualChartDomainV3";
import { useAppTheme } from "@/appTheme";
import { useTranslation } from "react-i18next";
import { SimulationChartStatusV1 } from "@/components/simulation/SimulationPreparationV1";
import { WorkbenchAnalysisErrorPopoverV3 } from "./WorkbenchAnalysisErrorPopoverV3";
import { workbenchLoadRelationDescriptionV1 } from "./WorkbenchLoadRelationDescriptionV1";
import { studioPressureVolumeDescriptionV1 } from "@/studio/presentation/StudioItemPresentationCatalogV1";

import type {
  PressureVolumePressureBasisV2,
} from "@/studio/contracts/v2/model";
import type {
  MainWireIntegratedModelPeriodicPvaCurvePointV1,
  MainWireIntegratedModelPeriodicPvaEdpvrV1,
  MainWireIntegratedModelPeriodicPvaEspvrV1,
  MainWirePeriodicPvaV1,
  MainWireSystolicPressureEnvelopeV1,
  MainWireDiastolicLoadRelationV1,
  MainWirePvaAreaDisplayV1,
} from "@/analysis/methods/mainWire/MainWirePeriodicPvaV1";

import {
  finiteWorkbenchScalarValueV3,
  orderedFiniteWorkbenchSamplesV3,
  type WorkbenchScalarSampleV3,
} from "./WorkbenchScalarSampleV3";
import {
  positiveModuloV3,
} from "./SweepingWaveformCanvasV3";
import {
  scaleLinearV3,
  readWorkbenchCanvasThemeVariablesV3,
  useResponsiveCanvasFrameV3,
} from "./WorkbenchCanvasRuntimeV3";
import {
  WorkbenchChartLegendV3,
  buildWorkbenchTraceLegendModelV3,
  drawWorkbenchLeadingCapV3,
  drawWorkbenchMeasuredPointV3,
  workbenchHistoryAlphaV3,
  workbenchLegendSelectionMatchesTraceV3,
  workbenchLegendTraceAlphaV3,
  workbenchLegendTraceHiddenV3,
  workbenchTraceLegendKeyV3,
  type WorkbenchChartLegendSelectionV3,
  type WorkbenchScenarioTraceIdentityV3,
} from "./WorkbenchChartTraceStyleV3";
import {
  nextStableNumericDomainStateV3,
  numericTicksV3,
  type WorkbenchNumericDomainV3,
  type WorkbenchStableNumericDomainStateV3,
} from "./WorkbenchStableChartDomainV3";

export type WorkbenchPvPressureBasisV3 = PressureVolumePressureBasisV2;

export type WorkbenchPressureVolumeTraceV3 =
  WorkbenchScenarioTraceIdentityV3 & Readonly<{
    samples: readonly WorkbenchScalarSampleV3[];
    currentCycleSamples?: readonly WorkbenchScalarSampleV3[];
    cyclePosition?: number;
    completedCycleSampleSets?: readonly (readonly WorkbenchScalarSampleV3[])[];
    historyEpochs?: readonly WorkbenchOrbitHistoryEpochV3[];
    volumeOutputId: string;
    pressureOutputId: string;
    pressureBasis: WorkbenchPvPressureBasisV3;
    cyclePhaseOutputId: string;
    chamberId: string;
    chamberLabel: string;
    /** Final resolved trace color from the automatic comparison strategy. */
    chamberColor: string;
    periodicPva?: MainWirePeriodicPvaV1;
    /** Prior input epochs, oldest first; never interpreted as current results. */
    periodicPvaHistory?: readonly Readonly<{ inputEpoch: number; value: MainWirePeriodicPvaV1 }>[];
    periodicPvaAnalysisError?: string;
    periodicPvaAnalysisPending?: boolean;
  }>;

export type WorkbenchPvPointV3 = Readonly<{
  acceptedTimeSec: number;
  cyclePhase01: number;
  volumeMl: number;
  pressureMmHg: number;
}>;

export type WorkbenchLivePvTrajectoryV3 = Readonly<{
  /** Most recent full model-emitted cycle, retained as spatial context. */
  completedBeat: readonly WorkbenchPvPointV3[];
  /** Recorded startup segment, then the current cycle, including its leading point. */
  liveSegment: readonly WorkbenchPvPointV3[];
}>;

export type WorkbenchPvRelationPointV3 = Readonly<{
  volumeMl: number;
  pressureMmHg: number;
}>;

export type WorkbenchHistoricalPvProjectionV3 = Readonly<{
  completedBeat: readonly WorkbenchPvPointV3[];
  liveSegment?: readonly WorkbenchPvPointV3[];
  backBufferRemainder?: readonly WorkbenchPvPointV3[];
  layers?: readonly Readonly<{ points: readonly WorkbenchPvPointV3[]; alpha: number; width: number }>[];
}>;

export type CompleteCycleRangeV3 = Readonly<{
  startIndex: number;
  endIndexInclusive: number;
}>;

const CYCLE_PHASE_EPSILON_V3 = 1e-6;
const CYCLE_START_TOLERANCE_V3 = 0.03;
const MINIMUM_COMPLETE_CYCLE_PHASE_SPAN_V3 = 0.8;
const HISTORICAL_PV_PROJECTION_CACHE_V3 = new WeakMap<
  readonly WorkbenchScalarSampleV3[],
  Map<string, WorkbenchHistoricalPvProjectionV3>
>();

/**
 * Locates the newest complete model-emitted cycle. The true next-cycle
 * boundary sample is included; renderers must not add a synthetic closing
 * segment when a transient beat's two boundary states differ.
 */
export function lastCompleteCycleRangeV3(
  samples: readonly WorkbenchScalarSampleV3[],
  cyclePhaseOutputId: string,
): CompleteCycleRangeV3 | null {
  if (samples.length < 3) return null;
  const firstPhase = normalizedModelCyclePhaseV3(
    samples[0] === undefined
      ? null
      : finiteWorkbenchScalarValueV3(samples[0], cyclePhaseOutputId),
  );
  let previousBoundary: number | null = null;
  let latestBoundary: number | null = firstPhase !== null
      && firstPhase <= CYCLE_START_TOLERANCE_V3
    ? 0
    : null;

  let previousPhase = firstPhase;
  for (let index = 1; index < samples.length; index += 1) {
    const phase = normalizedModelCyclePhaseV3(
      finiteWorkbenchScalarValueV3(samples[index]!, cyclePhaseOutputId),
    );
    if (phase === null) {
      previousBoundary = null;
      latestBoundary = null;
      previousPhase = null;
      continue;
    }
    if (previousPhase === null && phase <= CYCLE_START_TOLERANCE_V3) {
      previousBoundary = latestBoundary;
      latestBoundary = index;
    }
    if (
      previousPhase !== null
      && phase + CYCLE_PHASE_EPSILON_V3 < previousPhase
    ) {
      previousBoundary = latestBoundary;
      latestBoundary = index;
    }
    previousPhase = phase;
  }
  if (previousBoundary === null || latestBoundary === null) return null;
  const startIndex = previousBoundary;
  const endIndexInclusive = latestBoundary;
  if (endIndexInclusive - startIndex < 3) return null;
  let phaseCount = 0;
  let minimumPhase = Number.POSITIVE_INFINITY;
  let maximumPhase = Number.NEGATIVE_INFINITY;
  for (let index = startIndex; index < endIndexInclusive; index += 1) {
    const phase = normalizedModelCyclePhaseV3(
      finiteWorkbenchScalarValueV3(samples[index]!, cyclePhaseOutputId),
    );
    if (phase === null) continue;
    phaseCount += 1;
    minimumPhase = Math.min(minimumPhase, phase);
    maximumPhase = Math.max(maximumPhase, phase);
  }
  if (
    phaseCount < 3
    || maximumPhase - minimumPhase
      < MINIMUM_COMPLETE_CYCLE_PHASE_SPAN_V3
  ) return null;
  return Object.freeze({ startIndex, endIndexInclusive });
}

/**
 * Projects an immutable, completed input epoch once. Current-epoch samples are
 * intentionally excluded because their live segment changes on every Worker
 * delivery.
 */
export function projectHistoricalPvEpochV3(
  samples: readonly WorkbenchScalarSampleV3[],
  volumeOutputId: string,
  pressureOutputId: string,
  cyclePhaseOutputId: string,
): WorkbenchHistoricalPvProjectionV3 {
  const cacheKey = JSON.stringify([
    volumeOutputId,
    pressureOutputId,
    cyclePhaseOutputId,
  ]);
  if (Object.isFrozen(samples)) {
    const cached = HISTORICAL_PV_PROJECTION_CACHE_V3
      .get(samples)
      ?.get(cacheKey);
    if (cached !== undefined) return cached;
  }
  const trajectory = extractLivePvTrajectoryV3(
    samples,
    volumeOutputId,
    pressureOutputId,
    cyclePhaseOutputId,
  );
  const projection = Object.freeze({ ...trajectory,
    backBufferRemainder: buildPvBackBufferRemainderV3(trajectory.completedBeat, trajectory.liveSegment) });
  if (Object.isFrozen(samples)) {
    let cache = HISTORICAL_PV_PROJECTION_CACHE_V3.get(samples);
    if (cache === undefined) {
      cache = new Map();
      HISTORICAL_PV_PROJECTION_CACHE_V3.set(samples, cache);
    }
    cache.set(cacheKey, projection);
  }
  return projection;
}

/** Age is counted in model cycles, so paused simulations also pause fading. */
export function workbenchPvTrailAlphaV3(age: number, phase: number, retainedBeats: number): number {
  return retainedBeats > 0 ? Math.max(0, 1 - (age + Math.max(0, Math.min(1, phase))) / retainedBeats) : 0;
}

/** Fade previous inputs over the first newly recorded cycle, never on a timer. */
export function workbenchPvInputTransitionV3(samples: readonly WorkbenchScalarSampleV3[], phaseOutputId: string): number {
  let previous: number | null = null;
  let progress = 0;
  for (const sample of samples) {
    const phase = normalizedModelCyclePhaseV3(finiteWorkbenchScalarValueV3(sample, phaseOutputId));
    if (phase === null) { previous = null; continue; }
    if (previous !== null) progress += phase >= previous ? phase - previous : phase - previous + 1;
    previous = phase;
    if (progress >= 1) return 1;
  }
  return Math.min(1, progress);
}

export function workbenchPvHistoryLayersV3(
  projection: WorkbenchHistoricalPvProjectionV3,
  previousBeats: readonly (readonly WorkbenchPvPointV3[])[],
  retainedBeats: number,
  transition: number,
  referenceAlpha: number,
): readonly Readonly<{ points: readonly WorkbenchPvPointV3[]; alpha: number; width: number }>[] {
  const live = projection.liveSegment ?? [];
  const phase = live.at(-1)?.cyclePhase01 ?? 0;
  const recent = retainedBeats === 0 ? [] : previousBeats.slice(-retainedBeats);
  // Start with exactly the prior live/trail layers. Over one recorded cycle,
  // retain only the prior loop's last visible shape as a quiet reference.
  return [
    ...recent.map((points, index) => ({ points, width: 1.5,
      alpha: workbenchPvTrailAlphaV3(recent.length - index - 1, phase, retainedBeats) * (1 - transition) })),
    { points: projection.backBufferRemainder ?? projection.completedBeat, width: 1.5,
      alpha: recent.length > 0 ? referenceAlpha * transition : 1 - transition * (1 - referenceAlpha) },
    { points: live, width: 2, alpha: 1 - transition * (1 - referenceAlpha) },
  ].filter(layer => layer.alpha > 0);
}

const PV_HISTORY_EPOCH_CACHE_V3 = new WeakMap<WorkbenchOrbitHistoryEpochV3, Map<string, WorkbenchHistoricalPvProjectionV3>>();
const PV_COMPLETED_BEAT_CACHE_V3 = new WeakMap<readonly WorkbenchScalarSampleV3[], Map<string, readonly WorkbenchPvPointV3[]>>();
/** The shared cycle buffer already observed both boundaries. A first recorded
 * post-wrap phase need not be near zero, so do not rediscover that boundary. */
function projectCompletedPvBeatV3(samples: readonly WorkbenchScalarSampleV3[],
  volumeId: string, pressureId: string, phaseId: string): readonly WorkbenchPvPointV3[] {
  const key = JSON.stringify([volumeId, pressureId, phaseId]);
  const cached = PV_COMPLETED_BEAT_CACHE_V3.get(samples)?.get(key);
  if (cached) return cached;
  const points = extractPvPointsV3(samples, 0, samples.length - 1, volumeId, pressureId, phaseId);
  if (Object.isFrozen(samples)) {
    const entries = PV_COMPLETED_BEAT_CACHE_V3.get(samples) ?? new Map();
    entries.set(key, points); PV_COMPLETED_BEAT_CACHE_V3.set(samples, entries);
  }
  return points;
}

/** Preserve completed and active cycles separately; never bridge a missing phase. */
export function projectWorkbenchPvHistoryV3(entry: WorkbenchOrbitHistoryEpochV3,
  volumeId: string, pressureId: string, phaseId: string): WorkbenchHistoricalPvProjectionV3 {
  const key = JSON.stringify([volumeId, pressureId, phaseId]);
  const cached = PV_HISTORY_EPOCH_CACHE_V3.get(entry)?.get(key);
  if (cached) return cached;
  const latestCycle = entry.completedCycles?.at(-1);
  const projection = latestCycle !== undefined && entry.currentCycleSamples !== undefined
    ? (() => {
      const completedBeat = projectCompletedPvBeatV3(latestCycle, volumeId, pressureId, phaseId);
      const liveSegment = projectHistoricalPvEpochV3(entry.currentCycleSamples, volumeId, pressureId, phaseId).liveSegment ?? [];
      return Object.freeze({ completedBeat, liveSegment, backBufferRemainder: buildPvBackBufferRemainderV3(completedBeat, liveSegment) });
    })()
    : projectHistoricalPvEpochV3(entry.samples, volumeId, pressureId, phaseId);
  if (Object.isFrozen(entry)) {
    const entries = PV_HISTORY_EPOCH_CACHE_V3.get(entry) ?? new Map();
    entries.set(key, projection); PV_HISTORY_EPOCH_CACHE_V3.set(entry, entries);
  }
  return projection;
}

export function extractLivePvTrajectoryV3(
  samples: readonly WorkbenchScalarSampleV3[],
  volumeOutputId: string,
  pressureOutputId: string,
  cyclePhaseOutputId: string,
): WorkbenchLivePvTrajectoryV3 {
  const ordered = orderedFiniteWorkbenchSamplesV3(samples);
  const range = lastCompleteCycleRangeV3(ordered, cyclePhaseOutputId);
  const completedCandidate = range === null
    ? Object.freeze([])
    : extractPvPointsV3(
        ordered,
        range.startIndex,
        range.endIndexInclusive,
        volumeOutputId,
        pressureOutputId,
        cyclePhaseOutputId,
      );
  const completedBeat = completedCandidate.length >= 3
    ? completedCandidate
    : Object.freeze([]);
  const liveStartIndex = range?.endIndexInclusive
    ?? initialPvSegmentStartIndexV3(ordered, cyclePhaseOutputId);
  const liveSegment = liveStartIndex === null
    ? Object.freeze([])
    : extractPvPointsV3(
        ordered,
        liveStartIndex,
        ordered.length - 1,
        volumeOutputId,
        pressureOutputId,
        cyclePhaseOutputId,
      );
  return Object.freeze({ completedBeat, liveSegment });
}

/**
 * Uses the previous completed orbit as a phase-aware back buffer. The live
 * prefix replaces only the phase it has already traversed, leaving one
 * continuous, full-opacity loop without an arbitrary alpha seam at its head.
 */
export function buildPvBackBufferRemainderV3(
  completedBeat: readonly WorkbenchPvPointV3[],
  liveSegment: readonly WorkbenchPvPointV3[],
): readonly WorkbenchPvPointV3[] {
  if (completedBeat.length === 0) return Object.freeze([]);
  if (liveSegment.length === 0) return completedBeat;
  const liveStart = liveSegment[0]!;
  const liveHead = liveSegment.at(-1)!;
  const headProgress = positiveModuloV3(
    liveHead.cyclePhase01 - liveStart.cyclePhase01,
    1,
  );
  if (headProgress <= CYCLE_PHASE_EPSILON_V3) return completedBeat;

  const progress = unwrappedPvCycleProgressV3(completedBeat);
  const lastProgress = progress.at(-1) ?? 0;
  if (headProgress >= lastProgress - CYCLE_PHASE_EPSILON_V3) {
    return Object.freeze([]);
  }
  let nextIndex = progress.findIndex((value) =>
    value + CYCLE_PHASE_EPSILON_V3 >= headProgress);
  if (nextIndex < 0) return Object.freeze([]);
  if (
    Math.abs(progress[nextIndex]! - headProgress) <= CYCLE_PHASE_EPSILON_V3
  ) {
    return Object.freeze(completedBeat.slice(nextIndex));
  }
  const previousIndex = Math.max(0, nextIndex - 1);
  const previousProgress = progress[previousIndex]!;
  const nextProgress = progress[nextIndex]!;
  const span = Math.max(CYCLE_PHASE_EPSILON_V3, nextProgress - previousProgress);
  const ratio = clampV3((headProgress - previousProgress) / span, 0, 1);
  const previousPoint = completedBeat[previousIndex]!;
  const nextPoint = completedBeat[nextIndex]!;
  const interpolated = Object.freeze({
    acceptedTimeSec: previousPoint.acceptedTimeSec
      + ratio * (nextPoint.acceptedTimeSec - previousPoint.acceptedTimeSec),
    cyclePhase01: liveHead.cyclePhase01,
    volumeMl: previousPoint.volumeMl
      + ratio * (nextPoint.volumeMl - previousPoint.volumeMl),
    pressureMmHg: previousPoint.pressureMmHg
      + ratio * (nextPoint.pressureMmHg - previousPoint.pressureMmHg),
  });
  return Object.freeze([interpolated, ...completedBeat.slice(nextIndex)]);
}

function unwrappedPvCycleProgressV3(
  points: readonly WorkbenchPvPointV3[],
): readonly number[] {
  if (points.length === 0) return Object.freeze([]);
  const firstPhase = points[0]!.cyclePhase01;
  let previousPhase = firstPhase;
  let wraps = 0;
  return Object.freeze(points.map((point, index) => {
    if (
      index > 0
      && point.cyclePhase01 + CYCLE_PHASE_EPSILON_V3 < previousPhase
    ) {
      wraps += 1;
    }
    previousPhase = point.cyclePhase01;
    return point.cyclePhase01 - firstPhase + wraps;
  }));
}

/** Keep the initial fragment through the first wrap until a full beat exists. */
function initialPvSegmentStartIndexV3(
  samples: readonly WorkbenchScalarSampleV3[],
  cyclePhaseOutputId: string,
): number | null {
  let startIndex: number | null = null;
  for (let index = 0; index < samples.length; index += 1) {
    const phase = normalizedModelCyclePhaseV3(
      finiteWorkbenchScalarValueV3(samples[index]!, cyclePhaseOutputId),
    );
    if (phase === null) {
      startIndex = null;
      continue;
    }
    if (startIndex === null) startIndex = index;
  }
  return startIndex;
}

function extractPvPointsV3(
  samples: readonly WorkbenchScalarSampleV3[],
  startIndex: number,
  endIndexInclusive: number,
  volumeOutputId: string,
  pressureOutputId: string,
  cyclePhaseOutputId: string,
): readonly WorkbenchPvPointV3[] {
  const points: WorkbenchPvPointV3[] = [];
  for (
    let index = startIndex;
    index <= endIndexInclusive;
    index += 1
  ) {
    const sample = samples[index]!;
    const cyclePhase01 = normalizedModelCyclePhaseV3(
      finiteWorkbenchScalarValueV3(sample, cyclePhaseOutputId),
    );
    const volumeMl = finiteWorkbenchScalarValueV3(sample, volumeOutputId);
    const pressureMmHg = finiteWorkbenchScalarValueV3(
      sample,
      pressureOutputId,
    );
    if (
      cyclePhase01 === null
      || volumeMl === null
      || pressureMmHg === null
    ) continue;
    points.push(Object.freeze({
      acceptedTimeSec: sample.acceptedTimeSec,
      cyclePhase01,
      volumeMl,
      pressureMmHg,
    }));
  }
  return Object.freeze(points);
}

type PressureVolumeLoopCanvasCommonPropsV3 = Readonly<{
  axisRanges?: import("@/studio/contracts/v2/content").ExperimentGraphAxisRangesV2;
  playbackRunning?: boolean;
  className?: string;
  legendActions?: React.ReactNode;
  periodicPvaSupported?: boolean;
  showPressureEnvelope?: boolean;
  showPvaBoundary?: boolean;
  onRetryAnalysis?: () => boolean;
}>;

export type PressureVolumeLoopCanvasPropsV3 = PressureVolumeLoopCanvasCommonPropsV3 & Readonly<{
  traces: readonly WorkbenchPressureVolumeTraceV3[];
  pvTrailBeats?: number;
}>;

export function PressureVolumeLoopCanvasV3(
  props: PressureVolumeLoopCanvasPropsV3,
) {
  const { className } = props;
  const { appTheme } = useAppTheme();
  const { i18n, t } = useTranslation();
  const language = i18n.resolvedLanguage ?? i18n.language;
  const periodicPvaSupported = props.periodicPvaSupported ?? true;
  const showPressureEnvelope =
    periodicPvaSupported && (props.showPressureEnvelope ?? false);
  const showPvaBoundary = periodicPvaSupported && (props.showPvaBoundary ?? false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const volumeDomainStateRef = React.useRef<
    WorkbenchStableNumericDomainStateV3 | null
  >(null);
  const pressureDomainStateRef = React.useRef<
    WorkbenchStableNumericDomainStateV3 | null
  >(null);
  const [hoveredLegendSelection, setHoveredLegendSelection] =
    React.useState<WorkbenchChartLegendSelectionV3 | null>(null);
  const [hiddenLegendSelections, setHiddenLegendSelections] =
    React.useState<readonly WorkbenchChartLegendSelectionV3[]>([]);
  const traces = useStableWorkbenchPressureVolumeTracesV3(props.traces);
  const trailBeats = Math.max(0, Math.min(STUDIO_PV_TRAIL_MAX_BEATS_V2,
    Math.round(props.pvTrailBeats ?? STUDIO_PV_TRAIL_DEFAULT_BEATS_V2)));
  const legendModel = React.useMemo(
    () => buildWorkbenchTraceLegendModelV3(traces.map((trace) => ({
      traceKey: workbenchTraceLegendKeyV3(trace.scenarioId, trace.chamberId),
      scenarioId: trace.scenarioId,
      scenarioLabel: trace.scenarioLabel,
      itemId: trace.chamberId,
      itemLabel: trace.chamberLabel,
      itemDescription: [studioPressureVolumeDescriptionV1(trace.volumeOutputId, trace.pressureOutputId, language ?? "en"),
        periodicPvaSupported && (trace.periodicPva !== undefined || trace.periodicPvaHistory?.length) ? workbenchLoadRelationDescriptionV1(showPvaBoundary ? "pva"
          : (trace.periodicPva ?? trace.periodicPvaHistory?.at(-1)?.value)?.loadRelations !== undefined ? "pv" : "pv-isochrone", language)
          : ""].filter(Boolean).join("\n\n") + workbenchPvHistoryDescriptionV3(trace, language?.startsWith("ja") === true),
      color: trace.chamberColor,
    }))),
    [traces, periodicPvaSupported, showPvaBoundary, language],
  );
  const renderedTraces = React.useMemo(() => traces.map((trace) => {
    const historyEpochs = workbenchPvHistoryEpochsV3(trace);
    const completed = (trace.completedCycleSampleSets ?? []).map(samples => projectCompletedPvBeatV3(
      samples, trace.volumeOutputId, trace.pressureOutputId, trace.cyclePhaseOutputId)).filter(points => points.length >= 3);
    const trajectory = completed.length > 0 && trace.currentCycleSamples !== undefined ? {
      completedBeat: completed.at(-1)!,
      liveSegment: extractPvPointsV3(trace.currentCycleSamples, 0, trace.currentCycleSamples.length - 1,
        trace.volumeOutputId, trace.pressureOutputId, trace.cyclePhaseOutputId),
    } : extractLivePvTrajectoryV3(trace.samples, trace.volumeOutputId, trace.pressureOutputId, trace.cyclePhaseOutputId);
    const phase = trajectory.liveSegment.at(-1)?.cyclePhase01 ?? 0;
    const recentBeats = Object.freeze((trailBeats === 0 ? [] : completed.slice(-trailBeats)).map((points, index, selected) => Object.freeze({
      points, alpha: workbenchPvTrailAlphaV3(selected.length - index - 1, phase, trailBeats),
    })).filter(({ alpha }) => alpha > 0));
    const transition = completed.length > 0 ? 1 : workbenchPvInputTransitionV3(trace.samples, trace.cyclePhaseOutputId);
    const history = Object.freeze((trace.historyEpochs ?? []).map(
      (entry) => {
        const projection = projectWorkbenchPvHistoryV3(
          entry,
          trace.volumeOutputId,
          trace.pressureOutputId,
          trace.cyclePhaseOutputId,
        );
        const age = trace.cyclePosition !== undefined && entry.sourceCyclePosition !== undefined
          ? Math.max(0, trace.cyclePosition - entry.sourceCyclePosition)
          : entry === trace.historyEpochs?.at(-1) ? transition : 1;
        // Aging depends on actual traversed cycles, not the number of later
        // edits. Rapid parameter changes cannot finish another epoch's fade.
        const referenceAlpha = Math.max(.15, .35 - Math.max(0, age - 1) * .1);
        const progress = Math.min(1, age);
        const priorBeats = (entry.completedCycles ?? []).map(cycle => projectCompletedPvBeatV3(cycle,
          trace.volumeOutputId, trace.pressureOutputId, trace.cyclePhaseOutputId)).filter(points => points.length >= 3);
        return Object.freeze({
          ...projection,
          layers: workbenchPvHistoryLayersV3(projection, priorBeats, trailBeats, progress, referenceAlpha),
          alpha: 1 - progress * (1 - referenceAlpha),
        });
      },
    ));
    return Object.freeze({
      trace,
      ...trajectory,
      recentBeats,
      backBufferRemainder: recentBeats.length > 0 ? [] : buildPvBackBufferRemainderV3(
        trajectory.completedBeat,
        trajectory.liveSegment,
      ),
      periodicPva: trace.periodicPva ?? null,
      periodicPvaDrawing: periodicPvaDrawingV1(trace.periodicPva, showPvaBoundary),
      periodicPvaHistoryDrawings: (trace.periodicPvaHistory ?? []).flatMap(({ value, inputEpoch }) => {
        const drawing = periodicPvaDrawingV1(value, showPvaBoundary);
        return drawing === null ? [] : [{
          drawing: { ...drawing, retainedFromPriorUpdate: true },
          alpha: Math.min(0.48, workbenchHistoryAlphaV3(historyEpochs.indexOf(inputEpoch), historyEpochs.length) * 2.2),
        }];
      }),
      history,
    });
  }), [showPvaBoundary, traces, trailBeats]);
  const visibleRenderedTraces = React.useMemo(
    () => renderedTraces.filter(({ trace }) =>
      !workbenchLegendTraceHiddenV3(
        hiddenLegendSelections,
        pvLegendDescriptorV3(trace),
      )),
    [hiddenLegendSelections, renderedTraces],
  );
  // A hidden or removed trace must not dim every remaining visible scenario.
  const legendSelection = visibleRenderedTraces.some(({ trace }) =>
    workbenchLegendSelectionMatchesTraceV3(hoveredLegendSelection, pvLegendDescriptorV3(trace)))
    ? hoveredLegendSelection : null;
  const domainIdentity = traces.map((trace) => [
    trace.scenarioId,
    trace.chamberId,
    trace.volumeOutputId,
    trace.pressureOutputId,
    trace.pressureBasis,
  ].join(":"))
    .join("\u001f");

  React.useEffect(() => {
    volumeDomainStateRef.current = null;
    pressureDomainStateRef.current = null;
    setHoveredLegendSelection(null);
    setHiddenLegendSelections([]);
  }, [domainIdentity]);

  const domainCommitKey = React.useMemo(
    () => pvStableDomainCommitKeyV3(visibleRenderedTraces),
    [visibleRenderedTraces],
  );
  const pressureAxisTitle = React.useMemo(
    () => pvPressureAxisTitleV3(traces),
    [traces],
  );

  const draw = React.useCallback((
    context: CanvasRenderingContext2D,
    width: number,
    height: number,
  ) => {
    const theme = readPvCanvasThemeV3(containerRef.current);
    context.font = theme.font;
    // A short canvas (phone stage) cannot afford a wrapped multi-column title
    // beside the plot; it reads the compact title on one line instead.
    const pressureAxisLines = height < PV_COMPACT_AXIS_TITLE_HEIGHT_PX_V3
      ? [pvCompactPressureAxisTitleV3(traces)]
      : wrapPvAxisTitleV3(context, pressureAxisTitle, Math.max(40, height - 56));
    const plot = pvPlotRectV3(width, height, pressureAxisLines.length);
    const domainPoints = workbenchPvLoopDomainPointsV3(visibleRenderedTraces);
    volumeDomainStateRef.current = nextZeroBasedPvDomainV3(
      volumeDomainStateRef.current,
      domainPoints.map(({ volumeMl }) => volumeMl),
      {
        upperPaddingFraction: 0.08,
        minimumUpperPadding: 4,
        commitKey: domainCommitKey,
      },
    );
    pressureDomainStateRef.current = nextZeroBasedPvDomainV3(
      pressureDomainStateRef.current,
      domainPoints.map(({ pressureMmHg }) => pressureMmHg),
      {
        upperPaddingFraction: 0.12,
        minimumUpperPadding: 5,
        commitKey: domainCommitKey,
      },
    );
    const volumeDomain = workbenchManualChartDomainV3(volumeDomainStateRef.current.domain, props.axisRanges?.x);
    const pressureDomain = workbenchManualChartDomainV3(pressureDomainStateRef.current.domain, props.axisRanges?.y);
    if (canvasRef.current !== null) {
      canvasRef.current.dataset.volumeMinimumMl = String(volumeDomain[0]);
      canvasRef.current.dataset.pressureMinimumMmhg = String(pressureDomain[0]);
      canvasRef.current.dataset.volumeMaximumMl = String(volumeDomain[1]);
      canvasRef.current.dataset.pressureMaximumMmhg = String(pressureDomain[1]);
    }
    drawPvAxesV3(
      context,
      plot,
      volumeDomain,
      pressureDomain,
      pressureAxisLines,
      theme,
      domainPoints.length > 0,
    );
    const x = (value: number) => scaleLinearV3(
      value,
      volumeDomain[0],
      volumeDomain[1],
      plot.left,
      plot.right,
    );
    const y = (value: number) => scaleLinearV3(
      value,
      pressureDomain[0],
      pressureDomain[1],
      plot.bottom,
      plot.top,
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
    // Focus the whole trajectory, including its completed beats and prior inputs.
    const drawingOrder = [...visibleRenderedTraces].sort((a, b) =>
      workbenchLegendTraceAlphaV3(legendSelection, pvLegendDescriptorV3(a.trace))
      - workbenchLegendTraceAlphaV3(legendSelection, pvLegendDescriptorV3(b.trace)));
    // All auxiliary lines go behind all loop geometry.
    for (const { periodicPvaHistoryDrawings, trace } of drawingOrder) {
      if (!periodicPvaSupported) continue;
      for (const { drawing, alpha } of periodicPvaHistoryDrawings) drawPeriodicPvaV1(
        context, drawing, x, y, trace.chamberColor,
        alpha * workbenchLegendTraceAlphaV3(legendSelection, pvLegendDescriptorV3(trace)),
        showPressureEnvelope, theme.canvas,
      );
    }
    for (const { periodicPvaDrawing, trace } of drawingOrder) {
      if (periodicPvaSupported && periodicPvaDrawing !== null) drawPeriodicPvaV1(
        context, periodicPvaDrawing, x, y, trace.chamberColor,
        0.92 * workbenchLegendTraceAlphaV3(legendSelection, pvLegendDescriptorV3(trace)),
        showPressureEnvelope,
        theme.canvas,
      );
    }
    for (const {
      history,
      recentBeats,
      backBufferRemainder,
      liveSegment,
      trace,
    } of drawingOrder) {
      const traceAlpha = workbenchLegendTraceAlphaV3(
        legendSelection,
        pvLegendDescriptorV3(trace),
      );
      for (const historical of history) {
        for (const { points, alpha, width } of historical.layers) drawPvCurveV3(context, points, x, y, {
          color: trace.chamberColor,
          width,
          dash: Object.freeze([]),
          alpha: alpha * traceAlpha,
        });
      }
      for (const { points, alpha } of recentBeats) drawPvCurveV3(context, points, x, y, {
        color: trace.chamberColor, width: 1.5, dash: Object.freeze([]), alpha: alpha * traceAlpha,
      });
      drawPvCurveV3(context, backBufferRemainder, x, y, {
        color: trace.chamberColor,
        width: 1.5,
        dash: Object.freeze([]),
        alpha: traceAlpha,
      });
      drawPvCurveV3(context, liveSegment, x, y, {
        color: trace.chamberColor,
        width: 2,
        dash: Object.freeze([]),
        alpha: traceAlpha,
      });
      const head = liveSegment.at(-1);
      if (head !== undefined) {
        drawWorkbenchLeadingCapV3(
          context,
          x(head.volumeMl),
          y(head.pressureMmHg),
          trace.chamberColor,
          theme.canvas,
          traceAlpha,
        );
      }
    }
    context.restore();

  }, [
    appTheme,
    props.axisRanges,
    domainCommitKey,
    legendSelection,
    periodicPvaSupported,
    pressureAxisTitle,
    showPressureEnvelope,
    visibleRenderedTraces,
  ]);

  useResponsiveCanvasFrameV3(
    containerRef,
    canvasRef,
    draw,
    "pressure-volume-loop",
  );

  const availablePva = periodicPvaSupported ? visibleRenderedTraces.flatMap(
    ({ periodicPva, trace }) => periodicPva?.status === "available"
      ? [Object.freeze({ periodicPva, trace })]
      : [],
  ) : [];
  const drawablePva = periodicPvaSupported ? visibleRenderedTraces.flatMap(({
    periodicPvaDrawing,
    periodicPvaHistoryDrawings,
    trace,
  }) => [
    ...(periodicPvaDrawing === null ? [] : [{ periodicPvaDrawing, trace }]),
    ...periodicPvaHistoryDrawings.map(({ drawing }) => ({ periodicPvaDrawing: drawing, trace })),
  ]) : [];
  const retainedPvaDrawingCount = drawablePva.filter(
    ({ periodicPvaDrawing }) =>
      periodicPvaDrawing.retainedFromPriorUpdate,
  ).length;
  const loadResponseDisplay = !showPvaBoundary && drawablePva.some(
    ({ periodicPvaDrawing }) => periodicPvaDrawing.loadRelation !== null || periodicPvaDrawing.diastolicRelation !== null);
  const envelopeVisible = drawablePva.some(({ periodicPvaDrawing }) =>
    periodicPvaDrawing.loadRelation !== null
      || (showPressureEnvelope && periodicPvaDrawing.pressureEnvelope !== null));
  const chamberAriaLabel = legendModel.items.length === 0
    ? "Pressure-volume"
    : legendModel.items.map(({ label }) => label).join(", ");
  const pvaAnalysisPending = periodicPvaSupported && traces.some(
    ({ periodicPvaAnalysisPending }) => periodicPvaAnalysisPending === true,
  );
  const awaitingCycle = visibleRenderedTraces.some(({ completedBeat }) => completedBeat.length === 0);
  const awaitingSamples = visibleRenderedTraces.some(({ completedBeat, liveSegment }) =>
    completedBeat.length === 0 && liveSegment.length === 0);
  const dataStatus = t(props.playbackRunning === false ? "workbench.pvDataPaused" : "workbench.waitingForPvData");
  const pvaAnalysisError = periodicPvaSupported
    ? visibleRenderedTraces
        .map(({ trace, periodicPva }) => trace.periodicPvaAnalysisError
          ?? (showPvaBoundary && periodicPva?.status === "unavailable"
            ? `${trace.scenarioLabel} · ${trace.chamberLabel}: ${periodicPva.reason}` : undefined))
        .find((message): message is string =>
          typeof message === "string" && message.length > 0)
    : undefined;

  return (
    <div
      className={`flex min-h-52 h-full w-full flex-col overflow-hidden ${className ?? ""}`}
      data-chart-kind="pressure-volume-loop-v3"
      data-pv-analysis-mode={
        periodicPvaSupported ? "formal-periodic" : "raw-exact-orbit"
      }
      data-cycle-source="model-emitted-cycle-phase"
      data-pv-relation-model={
        periodicPvaSupported
          ? loadResponseDisplay ? "settled-full-load-phasewise-pressure-envelope" : "all-settled-shape-preserving-locus"
          : undefined
      }
      data-pv-pressure-envelope-visible={
        envelopeVisible ? "true" : "false"
      }
      data-pv-pva-boundary-visible={showPvaBoundary ? "true" : "false"}
      data-pv-relation-semantics={
        periodicPvaSupported
          ? loadResponseDisplay
            ? "full-load-pressure-envelope-measured-diastolic-locus"
            : "area-max-common-isochrone-espvr-exponential-edpvr"
          : undefined
      }
      data-pv-loop-trace-count={visibleRenderedTraces.length}
      data-pv-cycle-pending={awaitingCycle ? "true" : "false"}
      data-pv-drawn-trace-count={visibleRenderedTraces.filter(
        ({ completedBeat, liveSegment }) => completedBeat.length > 0 || liveSegment.length > 0,
      ).length}
      data-pv-live-point-count={visibleRenderedTraces.reduce((sum, { liveSegment }) => sum + liveSegment.length, 0)}
      data-pv-trail-beats={trailBeats}
      data-pv-trail-count={visibleRenderedTraces.reduce((sum, { recentBeats }) => sum + recentBeats.length, 0)}
      data-pv-history-alpha={visibleRenderedTraces.map(({ history }) => history.at(-1)?.alpha ?? 0).join(",")}
      data-volume-minimum-ml={props.axisRanges?.x?.minimum ?? 0}
      data-pressure-minimum-mmhg={props.axisRanges?.y?.minimum ?? 0}
      data-pv-history-loop-count={visibleRenderedTraces.reduce((sum, { history }) => sum + history.filter(({ completedBeat }) => completedBeat.length > 0).length, 0)}
      data-pv-ready-trace-count={visibleRenderedTraces.filter(
        ({ completedBeat }) => completedBeat.length > 0,
      ).length}
      data-pva-analysis-pending={pvaAnalysisPending ? "true" : "false"}
      data-pva-result-count={availablePva.length}
      data-pva-drawing-count={drawablePva.length}
      data-pva-retained-drawing-count={retainedPvaDrawingCount}
      data-pva-history-input-epochs={visibleRenderedTraces.flatMap(({ trace }) => (trace.periodicPvaHistory ?? []).map(previous => previous.inputEpoch)).join(",")}
      data-pva-measured-high-load-point-count={drawablePva.reduce((sum, { periodicPvaDrawing }) =>
        sum + Math.max(0, (periodicPvaDrawing.espvr === null ? 0 : workbenchPvMeasuredHighLoadPointsV1(periodicPvaDrawing.espvr).length) - 1), 0)}
      data-pv-envelope-source-point-count={drawablePva.reduce((sum, { periodicPvaDrawing }) =>
        sum + (periodicPvaDrawing.loadRelation?.sourcePointCount ?? 0), 0)}
      data-pv-diastolic-source-point-count={drawablePva.reduce((sum, { periodicPvaDrawing }) =>
        sum + (periodicPvaDrawing.diastolicRelation?.sourcePointCount ?? 0), 0)}
      data-pv-display-extrapolation={showPvaBoundary ? "energy-construction-only" : "none"}
      data-pv-energy-area-count={drawablePva.filter(({ periodicPvaDrawing }) => periodicPvaDrawing.areaDisplay !== null && !periodicPvaDrawing.retainedFromPriorUpdate).length}
      data-pva-selected-times-sec={availablePva.map(({ periodicPva }) =>
        periodicPva.espvr.selectedTimeSinceAtrialCaptureSec).join(",")}
    >
      <WorkbenchChartLegendV3
        actions={props.legendActions}
        updatingLabel={!awaitingSamples && pvaAnalysisPending && visibleRenderedTraces.length > 0
          ? t(showPvaBoundary ? "workbench.live.preparingPva" : "workbench.live.preparingRelations") : undefined}
        hiddenSelections={hiddenLegendSelections}
        model={legendModel}
        selection={legendSelection}
        onHoverSelection={setHoveredLegendSelection}
        onToggleVisibility={(selection) =>
          setHiddenLegendSelections((current) =>
            current.some((candidate) =>
              pvLegendSelectionKeyV3(candidate) ===
                pvLegendSelectionKeyV3(selection))
              ? current.filter((candidate) =>
                  pvLegendSelectionKeyV3(candidate) !==
                    pvLegendSelectionKeyV3(selection))
              : Object.freeze([...current, selection]))}
      />
      <div ref={containerRef} className="relative min-h-0 flex-1 overflow-hidden">
        <canvas
          ref={canvasRef}
          className="block h-full w-full"
          role="img"
          aria-label={`${chamberAriaLabel} ${language?.startsWith("ja") ? "圧容積ループ" : "pressure-volume loop"}: ${pressureAxisTitle} / Volume (mL)`}
          data-pv-pressure-axis={pressureAxisTitle}
          data-pv-pressure-basis={pvPressureAxisBasisV3(traces) ?? "mixed"}
        />
        {showPvaBoundary && drawablePva.some(({ periodicPvaDrawing }) => periodicPvaDrawing.areaDisplay !== null && !periodicPvaDrawing.retainedFromPriorUpdate) && (
          <div className={`pointer-events-none absolute ${pvaAnalysisError ? "right-10" : "right-3"} top-1 flex items-center gap-2 text-[10px] text-wb-subtle`}
            aria-label="PVA view: solid SW, hatched PE; separate illustrations">
            <span>PVA</span><span>■ SW</span><span>▧ PE</span>
          </div>
        )}
        {awaitingSamples && <SimulationChartStatusV1>{dataStatus}</SimulationChartStatusV1>}
        {pvaAnalysisError !== undefined && (
          <WorkbenchAnalysisErrorPopoverV3 error={pvaAnalysisError} onRetry={props.onRetryAnalysis} />
        )}
      </div>
    </div>
  );
}

/**
 * Upstream pane composition is intentionally declarative and may allocate
 * wrappers during unrelated status renders. Preserve the last semantically
 * identical descriptor graph so PV projection memoization remains effective.
 */
function useStableWorkbenchPressureVolumeTracesV3(
  next: readonly WorkbenchPressureVolumeTraceV3[],
): readonly WorkbenchPressureVolumeTraceV3[] {
  const currentRef = React.useRef<readonly WorkbenchPressureVolumeTraceV3[]>(
    next,
  );
  const current = currentRef.current;
  if (
    current.length !== next.length
    || current.some((trace, index) =>
      !sameWorkbenchPressureVolumeTraceV3(trace, next[index]!))
  ) {
    currentRef.current = next;
  }
  return currentRef.current;
}

function sameWorkbenchPressureVolumeTraceV3(
  left: WorkbenchPressureVolumeTraceV3,
  right: WorkbenchPressureVolumeTraceV3,
): boolean {
  return left.scenarioId === right.scenarioId
    && left.scenarioLabel === right.scenarioLabel
    && left.scenarioStatus === right.scenarioStatus
    && left.scenarioColor === right.scenarioColor
    && left.scenarioStyleIndex === right.scenarioStyleIndex
    && left.samples === right.samples
    && left.currentCycleSamples === right.currentCycleSamples
    && left.cyclePosition === right.cyclePosition
    && left.completedCycleSampleSets === right.completedCycleSampleSets
    && shallowIdentityArrayEqualV3(
      left.historyEpochs ?? [],
      right.historyEpochs ?? [],
    )
    && left.volumeOutputId === right.volumeOutputId
    && left.pressureOutputId === right.pressureOutputId
    && left.pressureBasis === right.pressureBasis
    && left.cyclePhaseOutputId === right.cyclePhaseOutputId
    && left.chamberId === right.chamberId
    && left.chamberLabel === right.chamberLabel
    && left.chamberColor === right.chamberColor
    && left.periodicPva === right.periodicPva
    && shallowIdentityArrayEqualV3(left.periodicPvaHistory ?? [], right.periodicPvaHistory ?? [],
      (a, b) => a.inputEpoch === b.inputEpoch && a.value === b.value)
    && left.periodicPvaAnalysisError === right.periodicPvaAnalysisError
    && left.periodicPvaAnalysisPending
      === right.periodicPvaAnalysisPending;
}

function shallowIdentityArrayEqualV3<T>(
  left: readonly T[],
  right: readonly T[],
  equal: (a: T, b: T) => boolean = Object.is,
): boolean {
  return left.length === right.length
    && left.every((value, index) => equal(value, right[index]!));
}

function workbenchPvHistoryEpochsV3(trace: WorkbenchPressureVolumeTraceV3): readonly number[] {
  return [...new Set([
    ...(trace.historyEpochs ?? []).map(entry => entry.inputEpoch),
    ...(trace.periodicPvaHistory ?? []).map(previous => previous.inputEpoch),
  ])].sort((a, b) => a - b);
}

/** Never imply that the last completed analysis belongs to a newer old loop. */
export function workbenchPvHistoryDescriptionV3(trace: WorkbenchPressureVolumeTraceV3, japanese: boolean): string {
  const currentEpoch = trace.samples.at(-1)?.inputEpoch;
  const epochs = workbenchPvHistoryEpochsV3(trace);
  if (epochs.length === 0) return "";
  const records = epochs.map(epoch => {
    const loop = trace.historyEpochs?.some(entry => entry.inputEpoch === epoch);
    const relation = trace.periodicPvaHistory?.some(previous => previous.inputEpoch === epoch);
    const age = currentEpoch === undefined ? null : currentEpoch - epoch;
    const label = age !== null && age > 0
      ? japanese ? `${age}回前の設定` : `${age} input change(s) earlier`
      : japanese ? "以前の設定" : "Earlier inputs";
    return `${label}: ${[...(loop ? ["PV loop"] : []), ...(relation ? [japanese ? "解析曲線" : "analysis curves"] : [])].join(" / ")}`;
  });
  return `\n\n${japanese ? "変更前の表示（曲線は解析結果が得られた設定を表示）" : "Previous inputs (curves are shown for settings with completed analysis)"}\n${records.join("\n")}`;
}

/** Only visible loops own the viewport. Load relations and PVA geometry are
 * auxiliary, including historical ones, and may be clipped at the plot edge. */
export function workbenchPvLoopDomainPointsV3(
  traces: readonly (WorkbenchLivePvTrajectoryV3 & Readonly<{
    history: readonly WorkbenchHistoricalPvProjectionV3[];
    recentBeats?: readonly Readonly<{ points: readonly WorkbenchPvPointV3[] }>[];
  }>)[],
): readonly WorkbenchPvPointV3[] {
  return traces.flatMap(({ completedBeat, liveSegment, history, recentBeats }) => [
    ...completedBeat,
    ...liveSegment,
    ...history.flatMap(previous => previous.completedBeat),
    ...history.flatMap(previous => previous.liveSegment ?? []),
    ...history.flatMap(previous => (previous.layers ?? []).flatMap(layer => pvExtremaPointsV3(layer.points))),
    ...(recentBeats ?? []).flatMap(beat => pvExtremaPointsV3(beat.points)),
  ]);
}

const PV_EXTREMA_CACHE_V3 = new WeakMap<readonly WorkbenchPvPointV3[], readonly WorkbenchPvPointV3[]>();
function pvExtremaPointsV3(points: readonly WorkbenchPvPointV3[]): readonly WorkbenchPvPointV3[] {
  const cached = PV_EXTREMA_CACHE_V3.get(points);
  if (cached) return cached;
  if (points.length === 0) return points;
  const extrema = [points[0]!, points[0]!, points[0]!, points[0]!];
  for (const point of points) {
    if (point.volumeMl < extrema[0]!.volumeMl) extrema[0] = point;
    if (point.volumeMl > extrema[1]!.volumeMl) extrema[1] = point;
    if (point.pressureMmHg < extrema[2]!.pressureMmHg) extrema[2] = point;
    if (point.pressureMmHg > extrema[3]!.pressureMmHg) extrema[3] = point;
  }
  PV_EXTREMA_CACHE_V3.set(points, extrema);
  return extrema;
}

/** Display only: negative observations remain in the data, clipped below zero. */
export function nextZeroBasedPvDomainV3(
  previous: WorkbenchStableNumericDomainStateV3 | null,
  values: readonly number[],
  options: Readonly<{ commitKey: string | null; upperPaddingFraction?: number; minimumUpperPadding?: number }>,
): WorkbenchStableNumericDomainStateV3 {
  const positiveValues = values.filter(value => Number.isFinite(value) && value > 0);
  return nextStableNumericDomainStateV3(previous?.domain[0] === 0 ? previous : null,
    positiveValues.length === 0 ? [0, 1] : [0, ...positiveValues], {
    ...options, includeZero: true, lowerPaddingFraction: 0,
  });
}

function pvLegendDescriptorV3(trace: WorkbenchPressureVolumeTraceV3) {
  return Object.freeze({
    traceKey: workbenchTraceLegendKeyV3(trace.scenarioId, trace.chamberId),
    scenarioId: trace.scenarioId,
    scenarioLabel: trace.scenarioLabel,
    itemId: trace.chamberId,
    itemLabel: trace.chamberLabel,
    color: trace.chamberColor,
  });
}

/** The pressure basis shared by every trace, or `null` when traces mix bases. */
function pvPressureAxisBasisV3(
  traces: readonly WorkbenchPressureVolumeTraceV3[],
): WorkbenchPressureVolumeTraceV3["pressureBasis"] | null {
  const bases = new Set(traces.map(({ pressureBasis }) => pressureBasis));
  return bases.size === 1 ? traces[0]!.pressureBasis : null;
}

function pvPressureAxisChamberV3(
  traces: readonly WorkbenchPressureVolumeTraceV3[],
): string | undefined {
  const chambers = new Set(traces.map(({ chamberLabel }) => chamberLabel));
  return chambers.size === 1 ? traces[0]?.chamberLabel : undefined;
}

/** Full pressure axis title; mixed bases claim no single basis. */
export function pvPressureAxisTitleV3(
  traces: readonly WorkbenchPressureVolumeTraceV3[],
): string {
  const basis = pvPressureAxisBasisV3(traces);
  if (basis === null) return "Pressure (mmHg)";
  const chamber = pvPressureAxisChamberV3(traces);
  return `${chamber === undefined ? "" : `${chamber} `}${basis === "transmural" ? "transmural pressure" : "intracavitary pressure"} (mmHg)`;
}

/** Below this canvas height the pressure axis title is one compact line. */
const PV_COMPACT_AXIS_TITLE_HEIGHT_PX_V3 = 200;

/**
 * Compact title for short canvases. The basis stays identifiable through
 * the subscript convention Ptm (transmural) / Pic (intracavitary); mixed
 * bases fall back to the neutral P. The full wording remains in the canvas
 * description for assistive technology.
 */
export function pvCompactPressureAxisTitleV3(
  traces: readonly WorkbenchPressureVolumeTraceV3[],
): string {
  const basis = pvPressureAxisBasisV3(traces);
  const chamber = pvPressureAxisChamberV3(traces);
  const symbol = basis === "transmural" ? "Ptm" : basis === "intracavitary" ? "Pic" : "P";
  return `${chamber === undefined ? "" : `${chamber} `}${symbol} (mmHg)`;
}

function pvStableDomainCommitKeyV3(
  traces: readonly Readonly<{
    completedBeat: readonly WorkbenchPvPointV3[];
    liveSegment: readonly WorkbenchPvPointV3[];
    history: readonly unknown[];
    trace: WorkbenchPressureVolumeTraceV3;
  }>[],
): string | null {
  const keys = traces.flatMap(({ completedBeat, liveSegment, history, trace }) => {
    const completed = completedBeat.at(-1);
    if (completed !== undefined) {
      return [
        `${trace.scenarioId}:${trace.chamberId}:beat:${completed.acceptedTimeSec.toFixed(6)}:history:${history.length}`,
      ];
    }
    const live = liveSegment.at(-1);
    return live === undefined
      ? []
      : [
          // Partial acquisition can expand the axes, but cannot commit a contraction.
          `${trace.scenarioId}:${trace.chamberId}:initial:${trace.samples.at(-1)?.inputEpoch}:history:${history.length}`,
        ];
  });
  return keys.length === 0 ? null : keys.join("\u001f");
}

function pvLegendSelectionKeyV3(
  selection: WorkbenchChartLegendSelectionV3 | null,
): string | null {
  if (selection === null) return null;
  if (selection.kind === "scenario") return `scenario:${selection.scenarioId}`;
  if (selection.kind === "item") return `item:${selection.itemId}`;
  return `trace:${selection.traceKey}`;
}

type PeriodicPvaDrawingV1 = Readonly<{
  espvr: MainWireIntegratedModelPeriodicPvaEspvrV1 | null;
  edpvr: MainWireIntegratedModelPeriodicPvaEdpvrV1 | null;
  loadRelation: MainWireSystolicPressureEnvelopeV1 | null;
  diastolicRelation: MainWireDiastolicLoadRelationV1 | null;
  areaDisplay: MainWirePvaAreaDisplayV1 | null;
  pressureEnvelope: readonly (readonly MainWireIntegratedModelPeriodicPvaCurvePointV1[])[] | null;
  preview: boolean;
  retainedFromPriorUpdate: boolean;
}>;

function periodicPvaDrawingV1(
  pva: MainWirePeriodicPvaV1 | null | undefined,
  showPvaBoundary: boolean,
): PeriodicPvaDrawingV1 | null {
  if (!showPvaBoundary && pva?.loadRelations !== undefined) {
    const { systolic, diastolic } = pva.loadRelations;
    if (systolic === null && diastolic === null) return null;
    return Object.freeze({ espvr: null, edpvr: null, loadRelation: systolic, diastolicRelation: diastolic, areaDisplay: null,
      pressureEnvelope: null,
      preview: systolic?.completionStatus === "progressive" || diastolic?.completionStatus === "progressive", retainedFromPriorUpdate: false });
  }
  if (pva?.status === "available") {
    return Object.freeze({
      espvr: pva.espvr,
      edpvr: pva.edpvr,
      loadRelation: null,
      diastolicRelation: null,
      areaDisplay: showPvaBoundary ? pva.areaDisplay ?? null : null,
      pressureEnvelope: pva.loadRelations === undefined ? [pva.espvr.pressureEnvelopeDiagnostic.curve]
        : pva.loadRelations.systolic?.segments ?? null,
      preview: false,
      retainedFromPriorUpdate: false,
    });
  }
  if (
    (pva?.status !== "collecting" && !(showPvaBoundary && pva?.status === "unavailable"))
    || pva.preview?.espvr === null
    || pva.preview?.espvr === undefined
    || pva.preview.edpvr === null
  ) return null;
  return Object.freeze({
    espvr: pva.preview.espvr,
    edpvr: pva.preview.edpvr,
    loadRelation: null,
    diastolicRelation: null,
    areaDisplay: null,
    pressureEnvelope: pva.loadRelations === undefined ? [pva.preview.espvr.pressureEnvelopeDiagnostic.curve]
      : pva.loadRelations.systolic?.segments ?? null,
    preview: true,
    retainedFromPriorUpdate: false,
  });
}

function drawPeriodicPvaV1(
  context: CanvasRenderingContext2D,
  pva: PeriodicPvaDrawingV1,
  x: (volumeMl: number) => number,
  y: (pressureMmHg: number) => number,
  color: string,
  alpha: number,
  showPressureEnvelope: boolean,
  pointBorderColor: string,
): void {
  const relationAlpha = pva.preview ? alpha * 0.58 : alpha;
  // Historical boundaries remain comparable without mixing old SW/PE fills
  // with the current operating loop.
  if (pva.areaDisplay !== null && !pva.retainedFromPriorUpdate) drawWorkbenchPvaAreasV1(context, pva.areaDisplay, x, y, color, relationAlpha);
  if (showPressureEnvelope && pva.pressureEnvelope !== null) {
    for (const segment of pva.pressureEnvelope) drawPvCurveV3(
      context,
      segment,
      x,
      y,
      {
        color,
        width: 1.1,
        dash: Object.freeze([4, 3]),
        alpha: relationAlpha * 0.34,
      },
    );
  }
  if (pva.loadRelation !== null) {
    drawWorkbenchSystolicLoadRelationV1(context, pva.loadRelation, x, y, color, relationAlpha, pointBorderColor);
  } else if (pva.espvr !== null) {
    drawPvCurveV3(context, pva.espvr.curve, x, y, {
      color, width: 1.5, dash: [4, 3], alpha: relationAlpha * 0.62,
    });
    drawWorkbenchPvHighLoadIsochroneV1(context, pva.espvr, x, y, color, relationAlpha);
    for (const point of pva.espvr.fitPoints) drawPvRelationMarkerV3(context, x(point.volumeMl), y(point.pressureMmHg),
      color, 1.7, relationAlpha * 0.4, true);
  }
  if (pva.diastolicRelation !== null) {
    drawWorkbenchDiastolicLoadRelationV1(context, pva.diastolicRelation, x, y, color, relationAlpha, pointBorderColor);
  }
  const edpvr = pva.edpvr;
  if (edpvr === null) return;
  const edpvrPressure = (volumeMl: number) =>
    volumeMl <= edpvr.zeroPressureVolumeMl
      ? 0
      : edpvr.scaleMmHg
        * Math.expm1(
          edpvr.exponentPerMl
            * (volumeMl - edpvr.zeroPressureVolumeMl),
        );
  drawPvCurveV3(
    context,
    sampleDisplayedPvaCurveV1(
      edpvr.measuredVolumeRangeMl[0],
      edpvr.measuredVolumeRangeMl[1],
      edpvrPressure,
    ),
    x,
    y,
    {
      color,
      width: 1.6,
      dash: Object.freeze([4, 3]),
      alpha: relationAlpha * 0.72,
    },
  );
  for (const point of edpvr.fitPoints) {
    drawWorkbenchMeasuredPointV3(context, x(point.volumeMl), y(point.pressureMmHg),
      color, pointBorderColor, relationAlpha * 0.55, 2.5);
  }
}

export function drawWorkbenchSystolicLoadRelationV1(
  context: CanvasRenderingContext2D, relation: MainWireSystolicPressureEnvelopeV1,
  x: (volumeMl: number) => number, y: (pressureMmHg: number) => number,
  color: string, alpha: number, pointBorderColor: string,
): void {
  for (const segment of relation.segments) {
    drawPvCurveV3(context, segment, x, y, { color, width: 1.3, dash: [4, 3], alpha: alpha * 0.48 });
  }
  // Sparse load support on the envelope, not its dense interpolation vertices.
  for (const point of relation.loadSupportPoints) drawWorkbenchMeasuredPointV3(context,
    x(point.volumeMl), y(point.pressureMmHg), color, pointBorderColor, alpha * 0.55, 2.5);
}

export function drawWorkbenchDiastolicLoadRelationV1(
  context: CanvasRenderingContext2D, relation: MainWireDiastolicLoadRelationV1,
  x: (volumeMl: number) => number, y: (pressureMmHg: number) => number,
  color: string, alpha: number, pointBorderColor: string,
): void {
  for (const segment of relation.segments) {
    drawPvCurveV3(context, segment, x, y, { color, width: 1.3, dash: [4, 3], alpha: alpha * 0.52 });
    for (const point of segment) drawWorkbenchMeasuredPointV3(context,
      x(point.volumeMl), y(point.pressureMmHg), color, pointBorderColor, alpha * 0.55, 2.5);
  }
}

/** Distinct fills intentionally preserve overlaps. Their union is not PVA:
 * the numerical owner defines PVA as accepted-step SW plus geometric PE. */
export function drawWorkbenchPvaAreasV1(
  context: CanvasRenderingContext2D, area: MainWirePvaAreaDisplayV1,
  x: (volumeMl: number) => number, y: (pressureMmHg: number) => number,
  color: string, alpha: number,
): void {
  const polygon = (points: readonly MainWireIntegratedModelPeriodicPvaCurvePointV1[]) => {
    context.beginPath();
    points.forEach((point, index) => index === 0
      ? context.moveTo(x(point.volumeMl), y(point.pressureMmHg))
      : context.lineTo(x(point.volumeMl), y(point.pressureMmHg)));
    context.closePath();
  };
  context.save();
  context.fillStyle = color;
  context.globalAlpha = alpha * 0.08;
  polygon(area.strokeWorkLoop);
  context.fill();
  const strip = area.potentialEnergyStrip;
  if (strip.length > 1) {
    const upper = strip.map((point) => ({ volumeMl: point.volumeMl, pressureMmHg: point.upperPressureMmHg }));
    const lower = strip.map((point) => ({ volumeMl: point.volumeMl, pressureMmHg: point.lowerPressureMmHg }));
    polygon([...upper, ...[...lower].reverse()]);
    context.save();
    context.clip();
    context.globalAlpha = alpha * 0.28;
    context.strokeStyle = color;
    context.lineWidth = 0.65;
    const left = x(strip[0]!.volumeMl), right = x(strip.at(-1)!.volumeMl);
    const ys = [...upper, ...lower].map((point) => y(point.pressureMmHg));
    const top = Math.min(...ys), bottom = Math.max(...ys), height = bottom - top;
    context.beginPath();
    for (let start = left - height; start < right; start += 7) {
      context.moveTo(start, bottom); context.lineTo(start + height, top);
    }
    context.stroke();
    context.restore();
    drawPvCurveV3(context, upper, x, y, { color, width: 1, dash: [3, 3], alpha: alpha * 0.7 });
    // Mark the adopted isochrone anchor, not the semilunar-closure landmark.
    const end = upper.at(-1)!;
    drawPvRelationMarkerV3(context, x(end.volumeMl), y(end.pressureMmHg), color, 2.8, alpha * 0.8, false);
  }
  context.restore();
}

/** Shared by viewport and drawing so measured high loads cannot be clipped
 * merely because only the operating beat supplied the old axis limits. */
export function workbenchPvMeasuredHighLoadPointsV1(espvr: MainWireIntegratedModelPeriodicPvaEspvrV1) {
  return espvr.highLoadIsochroneDisplay?.points ?? [];
}

export function drawWorkbenchPvHighLoadIsochroneV1(
  context: CanvasRenderingContext2D,
  espvr: MainWireIntegratedModelPeriodicPvaEspvrV1,
  x: (volumeMl: number) => number,
  y: (pressureMmHg: number) => number,
  color: string,
  relationAlpha: number,
): void {
  const points = workbenchPvMeasuredHighLoadPointsV1(espvr);
  // These are ordered measured loads, not a globally monotone pressure law.
  drawPvCurveV3(context, points, x, y, {
    color, width: 1.3, dash: Object.freeze([4, 3]), alpha: relationAlpha * 0.48,
  });
  for (const point of points.slice(1)) {
    drawPvRelationMarkerV3(context, x(point.volumeMl), y(point.pressureMmHg),
      color, 1.7, relationAlpha * 0.4, true);
  }
}

function sampleDisplayedPvaCurveV1(
  startVolumeMl: number,
  endVolumeMl: number,
  pressure: (volumeMl: number) => number,
): readonly MainWireIntegratedModelPeriodicPvaCurvePointV1[] {
  if (
    !Number.isFinite(startVolumeMl)
    || !Number.isFinite(endVolumeMl)
    || !(endVolumeMl > startVolumeMl)
  ) return Object.freeze([]);
  return Object.freeze(
    Array.from({ length: 65 }, (_, index) => {
      const volumeMl =
        startVolumeMl + (index / 64) * (endVolumeMl - startVolumeMl);
      return Object.freeze({ volumeMl, pressureMmHg: pressure(volumeMl) });
    }),
  );
}

function drawPvRelationMarkerV3(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  radius: number,
  alpha: number,
  filled: boolean,
): void {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return;
  context.save();
  context.globalAlpha = alpha;
  context.strokeStyle = color;
  context.fillStyle = color;
  context.lineWidth = 1;
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  if (filled) context.fill();
  else context.stroke();
  context.restore();
}

type PvPlotRectV3 = Readonly<{
  left: number;
  right: number;
  top: number;
  bottom: number;
}>;

type PvCanvasThemeV3 = Readonly<{
  canvas: string;
  grid: string;
  axis: string;
  text: string;
  font: string;
  messageFont: string;
}>;

function normalizedModelCyclePhaseV3(value: number | null | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return positiveModuloV3(value, 1);
}

function pvPlotRectV3(
  width: number,
  height: number,
  pressureAxisLineCount: number,
): PvPlotRectV3 {
  const left = Math.min(58 + (pressureAxisLineCount - 1) * 14, width * 0.3);
  const top = Math.min(12, height * 0.08);
  return Object.freeze({
    left,
    right: Math.max(left + 1, width - 16),
    top,
    bottom: Math.max(top + 1, height - 44),
  });
}

function wrapPvAxisTitleV3(context: CanvasRenderingContext2D, title: string, available: number): string[] {
  const lines: string[] = [];
  for (const word of title.split(" ")) {
    const last = lines.at(-1);
    if (last !== undefined && context.measureText(`${last} ${word}`).width <= available) {
      lines[lines.length - 1] = `${last} ${word}`;
    } else lines.push(word);
  }
  return lines;
}

function drawPvAxesV3(
  context: CanvasRenderingContext2D,
  plot: PvPlotRectV3,
  volumeDomain: WorkbenchNumericDomainV3,
  pressureDomain: WorkbenchNumericDomainV3,
  pressureAxisLines: readonly string[],
  theme: PvCanvasThemeV3,
  hasData: boolean,
): void {
  context.save();
  context.font = theme.font;
  context.fillStyle = theme.text;
  context.strokeStyle = theme.grid;
  context.lineWidth = 1;
  for (const value of hasData ? numericTicksV3(volumeDomain, 4) : []) {
    const x = scaleLinearV3(
      value,
      volumeDomain[0],
      volumeDomain[1],
      plot.left,
      plot.right,
    );
    context.beginPath();
    context.moveTo(x, plot.top);
    context.lineTo(x, plot.bottom);
    context.stroke();
    context.textAlign = "center";
    context.textBaseline = "top";
    context.fillText(
      formatPvAxisNumberV3(value),
      x,
      plot.bottom + 7,
    );
  }
  for (const value of hasData ? numericTicksV3(pressureDomain, 4) : []) {
    const y = scaleLinearV3(
      value,
      pressureDomain[0],
      pressureDomain[1],
      plot.bottom,
      plot.top,
    );
    context.beginPath();
    context.moveTo(plot.left, y);
    context.lineTo(plot.right, y);
    context.stroke();
    context.textAlign = "right";
    context.textBaseline = "middle";
    context.fillText(
      formatPvAxisNumberV3(value),
      plot.left - 6,
      y,
    );
  }
  context.strokeStyle = theme.axis;
  context.strokeRect(
    plot.left,
    plot.top,
    plot.right - plot.left,
    plot.bottom - plot.top,
  );
  context.textAlign = "center";
  context.textBaseline = "bottom";
  context.fillText(
    "Volume (mL)",
    (plot.left + plot.right) / 2,
    plot.bottom + 40,
  );
  context.save();
  context.translate(12, (plot.top + plot.bottom) / 2);
  context.rotate(-Math.PI / 2);
  context.textBaseline = "middle";
  pressureAxisLines.forEach((line, index) => context.fillText(line, 0, index * 14, plot.bottom - plot.top));
  context.restore();
  context.restore();
}

function drawPvCurveV3<T extends Readonly<{
  volumeMl: number;
  pressureMmHg: number;
}>>(
  context: CanvasRenderingContext2D,
  points: readonly T[],
  x: (value: number) => number,
  y: (value: number) => number,
  style: Readonly<{
    color: string;
    width: number;
    dash: readonly number[];
    alpha?: number;
  }>,
): void {
  if (points.length === 0) return;
  context.save();
  context.strokeStyle = style.color;
  context.lineWidth = style.width;
  context.lineJoin = "round";
  context.lineCap = "round";
  context.setLineDash([...style.dash]);
  context.globalAlpha = style.alpha ?? 1;
  context.beginPath();
  points.forEach((point, index) => {
    if (index === 0) context.moveTo(x(point.volumeMl), y(point.pressureMmHg));
    else context.lineTo(x(point.volumeMl), y(point.pressureMmHg));
  });
  context.stroke();
  context.restore();
}

function readPvCanvasThemeV3(element: HTMLElement | null): PvCanvasThemeV3 {
  const [canvas, grid, axis, text, font, messageFont] =
    readWorkbenchCanvasThemeVariablesV3(element, [
      ["--wb-canvas-bg", "#0a141d"],
      ["--wb-grid", "rgba(165, 185, 200, 0.10)"],
      ["--wb-axis", "rgba(165, 185, 200, 0.32)"],
      ["--wb-text-muted", "#94a3b8"],
      ["--wb-chart-font", "10px ui-monospace, SFMono-Regular, Menlo, monospace"],
      ["--wb-chart-message-font", "12px system-ui, sans-serif"],
    ]);
  return Object.freeze({
    canvas: canvas!,
    grid: grid!,
    axis: axis!,
    text: text!,
    font: font!,
    messageFont: messageFont!,
  });
}

function formatPvAxisNumberV3(value: number): string {
  if (value === 0) return "0";
  return Math.abs(value) >= 10 ? value.toFixed(0) : value.toFixed(1);
}

function clampV3(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

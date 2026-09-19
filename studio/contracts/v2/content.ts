import type {
  ExperimentIdV2,
  ExperimentPlacementIdV2,
  ExperimentSnapshotIdV2,
  ExperimentVersionV2,
  ModelIdV2,
  ScenarioIdV2,
} from "./ids";
import type { StudioJsonValueV2 } from "./json";

export const STUDIO_EXPERIMENT_V2_SCHEMA_ID =
  "circleheart-studio-experiment-v2" as const;
export const STUDIO_EXPERIMENT_SNAPSHOT_V2_SCHEMA_ID =
  "circleheart-studio-experiment-snapshot-v2" as const;
export const STUDIO_EXPERIMENT_PLACEMENT_V2_SCHEMA_ID =
  "circleheart-studio-experiment-placement-v2" as const;
export const STUDIO_SCENARIO_PRESET_V2_SCHEMA_ID =
  "circleheart-studio-scenario-preset-v2" as const;
export const STUDIO_SWEEP_WINDOW_DEFAULT_SEC_V2 = 2;
export const STUDIO_SWEEP_WINDOW_MIN_SEC_V2 = 1;
export const STUDIO_SWEEP_WINDOW_MAX_SEC_V2 = 12;
export const STUDIO_SWEEP_WINDOW_STEP_SEC_V2 = 0.5;
export const STUDIO_GRAPH_HISTORY_DEFAULT_DEPTH_V2 = 1;
export const STUDIO_GRAPH_HISTORY_MIN_DEPTH_V2 = 0;
export const STUDIO_GRAPH_HISTORY_MAX_DEPTH_V2 = 3;
export const STUDIO_PV_TRAIL_DEFAULT_BEATS_V2 = 2;
export const STUDIO_PV_TRAIL_MAX_BEATS_V2 = 5;

export type SurfacePaneIdV2 = string;
export type ScenarioPresetIdV2 = string;

/**
 * The model-owned fixture and its exact checkpoint are captured together.
 *
 * Studio deliberately does not interpret either opaque JSON value. A model
 * adapter is responsible for validating the fixture and checkpoint payload
 * against `modelId` before executing them. The registered model already pins
 * the checkpoint codec, so content does not repeat a second codec identity.
 */
export type ScenarioCheckpointV2 = Readonly<{
  acceptedRevision: number;
  acceptedTimeSec: number;
  payload: StudioJsonValueV2;
}>;

export type ScenarioCaptureV2 = Readonly<{
  fixture: StudioJsonValueV2;
  checkpoint: ScenarioCheckpointV2;
}>;

export type ExperimentScenarioV2 = Readonly<{
  scenarioId: ScenarioIdV2;
  label: string;
  capture: ScenarioCaptureV2;
}>;

/**
 * One reusable, named input/state object.
 *
 * Applying a preset copies `capture`; it never creates a live link and makes no
 * qualification, certification, or publication claim.
 */
export type ScenarioPresetV2 = Readonly<{
  schemaId: typeof STUDIO_SCENARIO_PRESET_V2_SCHEMA_ID;
  presetId: ScenarioPresetIdV2;
  modelId: ModelIdV2;
  title: string;
  description: string;
  capture: ScenarioCaptureV2;
}>;

export type ExperimentSurfaceGraphSeriesV2 = Readonly<{
  /** Registered graph-owned series binding. */
  seriesId: string;
  /** Shared display label for this item across every Scenario trace. */
  label: string;
  order: number;
}>;

/**
 * One materialized graph-trace color. Automatic allocation is frozen at trace
 * creation; changing the Scenario base color never recolors existing traces.
 * `customColorHex` is the optional Pane-Settings override, so reset can return
 * to the original automatic color without recomputing it.
 */
export type ExperimentSurfaceGraphTraceColorV2 = Readonly<{
  scenarioId: ScenarioIdV2;
  seriesId: string | null;
  automaticColorHex: string;
  customColorHex?: string;
}>;

/**
 * Scenario membership for one graph pane.
 *
 * `visible-scenarios` follows the Workbench's ephemeral Scenario Manager
 * visibility. `fixed` narrows the pane to an authored, nonempty Scenario set;
 * the Scenario Manager eye can still temporarily hide one of those traces.
 */
export type ExperimentSurfaceGraphScenarioScopeV2 =
  | Readonly<{ mode: "visible-scenarios" }>
  | Readonly<{
      mode: "fixed";
      scenarioIds: readonly ScenarioIdV2[];
    }>;

/** One durable exclusion from the pane's Scenario x series trace product. */
export type ExperimentSurfaceGraphTraceRefV2 = Readonly<{
  scenarioId: ScenarioIdV2;
  /** Structural graph panes use `null` because they have no series catalog. */
  seriesId: string | null;
}>;

/**
 * Presentation/analysis policy owned by one pressure-volume pane.
 *
 * `raw-exact-orbit` renders only samples emitted by the exact model. The two
 * analysis-backed modes remain readable for Surfaces that pin the required
 * method; formal periodic analysis can take substantially longer to complete.
 */
export type ExperimentSurfacePressureVolumeAnalysisModeV2 =
  "raw-exact-orbit" | "responsive-preview" | "formal-periodic";

/** Display bounds only; omitting an axis retains automatic scaling. */
export type ExperimentGraphAxisRangeV2 = Readonly<{ minimum: number; maximum: number }>;
export type ExperimentGraphAxisRangesV2 = Readonly<{
  x?: ExperimentGraphAxisRangeV2;
  y?: ExperimentGraphAxisRangeV2;
}>;

export type ExperimentSurfaceGraphPaneV2 = Readonly<{
  paneId: SurfacePaneIdV2;
  role: "graph";
  label: string;
  order: number;
  priority: number;
  graphId: string;
  /** Pane-level Scenario policy; item-level bindings are intentionally absent. */
  scenarioScope: ExperimentSurfaceGraphScenarioScopeV2;
  /** Durable exact trace omissions authored in Pane Settings. */
  excludedTraces: readonly ExperimentSurfaceGraphTraceRefV2[];
  /**
   * Durable author-selected sweep extent in model seconds. Required only when
   * the registered graph renderer is `sweep`; structural renderers must omit
   * it because they do not own a time window.
   */
  windowSec?: number;
  /** Waveform x extent is owned by windowSec; only y may be fixed there. */
  axisRanges?: ExperimentGraphAxisRangesV2;
  /**
   * Number of completed input epochs shown behind the current graph. Required
   * for PV and structural renderers; sweep renderers carry prior epochs out in
   * their monotonic presentation window and therefore omit this field.
   */
  historyDepth?: number;
  /** Additional completed beats of the current inputs, PV panes only. Omitted = 2. */
  pvTrailBeats?: number;
  /** Required only for `pressure-volume`; every other renderer must omit it. */
  pressureVolumeAnalysisMode?: ExperimentSurfacePressureVolumeAnalysisModeV2;
  /**
   * Optional upper projection of the sampled pressure-time-volume family.
   * Diagnostic only, never the nonlinear PE/PVA owner. PV panes only.
   */
  showPressureEnvelope?: boolean;
  /** Opt-in energy view instead of the Surface's default ESPVR display.
   * Shows the PVA boundary and separate SW/PE illustrations where supported.
   * Must be omitted for raw-only and non-PV panes. */
  showPvaBoundary?: boolean;
  /**
   * Author-selected circulation side for a structural Guyton/Starling pane.
   * Required for `structural-return`; every other renderer must omit it.
   */
  structuralSide?: "left" | "right";
  /** Workbench materializes one entry for every Scenario/item trace. */
  traceColors?: readonly ExperimentSurfaceGraphTraceColorV2[];
  /**
   * The pane selects bindings from its registered graph's series catalog.
   * Structural renderers without a series catalog require an empty list.
   */
  series: readonly ExperimentSurfaceGraphSeriesV2[];
}>;

/** Seed used only when allocating new trace colors for one Scenario. */
export type ExperimentSurfaceScenarioColorSeedV2 = Readonly<{
  scenarioId: ScenarioIdV2;
  colorHex: string;
}>;

export type ExperimentSurfaceOutputItemV2 = Readonly<{
  outputId: string;
  label: string;
  order: number;
}>;

/**
 * One output pane resolves exactly one Scenario context.
 *
 * `active-slot` follows the Scenario Manager in a mutable Session. `fixed`
 * names one Scenario explicitly. Multi-Scenario comparison is composed from
 * multiple panes rather than item-level bindings or a value matrix.
 */
export type ExperimentSurfaceOutputPaneBindingV2 =
  | Readonly<{ mode: "active-slot" }>
  | Readonly<{
      mode: "fixed";
      scenarioId: ScenarioIdV2;
    }>;

export type ExperimentSurfaceOutputPaneV2 = Readonly<{
  paneId: SurfacePaneIdV2;
  role: "output";
  label: string;
  order: number;
  priority: number;
  binding: ExperimentSurfaceOutputPaneBindingV2;
  items: readonly ExperimentSurfaceOutputItemV2[];
}>;

export type ExperimentControlButtonOptionV2 = Readonly<{
  label: string;
  value: number;
}>;

/**
 * Authored control presentation. This does not create a reusable ParameterSet:
 * every interaction remains one ordinary absolute control assignment.
 */
export type ExperimentControlPresentationV2 =
  | Readonly<{ kind: "slider" }>
  | Readonly<{
      kind: "buttons";
      options: readonly ExperimentControlButtonOptionV2[];
    }>;

export type ExperimentSurfaceControlItemV2 = Readonly<{
  controlId: string;
  label: string;
  order: number;
  presentation: ExperimentControlPresentationV2;
}>;

/**
 * One controller pane owns exactly one Scenario binding context.
 *
 * `active-slot` follows the Scenario Manager only in the mutable Workbench.
 * A Briefing always materializes it to a fixed Scenario set at pickup time.
 */
export type ExperimentSurfaceControlPaneBindingV2 =
  | Readonly<{ mode: "active-slot" }>
  | Readonly<{
      mode: "fixed";
      scenarioIds: readonly ScenarioIdV2[];
    }>;

export type ExperimentSurfaceControlPaneV2 = Readonly<{
  paneId: SurfacePaneIdV2;
  role: "control";
  label: string;
  order: number;
  priority: number;
  binding: ExperimentSurfaceControlPaneBindingV2;
  items: readonly ExperimentSurfaceControlItemV2[];
}>;

/** One Experiment-owned, Markdown-compatible note. */
export type ExperimentSurfaceNoteV2 = Readonly<{
  text: string;
}>;

/**
 * Durable semantic pane composition only. Screen extent, Dockview geometry,
 * fullscreen state, active focus, and renderer layout remain derived UI state.
 */
export type ExperimentSurfaceV2 = Readonly<{
  /** Optional for generic producers; Workbench-authored Surfaces persist it. */
  scenarioColorSeeds?: readonly ExperimentSurfaceScenarioColorSeedV2[];
  graphPanes: readonly ExperimentSurfaceGraphPaneV2[];
  outputPanes: readonly ExperimentSurfaceOutputPaneV2[];
  controlPanes: readonly ExperimentSurfaceControlPaneV2[];
  note: ExperimentSurfaceNoteV2;
}>;

export type ExperimentContentV2 = Readonly<{
  modelId: ModelIdV2;
  /** Mutable authoring follows additive releases in this Surface series. */
  surfaceSeriesId: string;
  scenarios: readonly ExperimentScenarioV2[];
  surface: ExperimentSurfaceV2;
}>;

/**
 * One explicitly saved, mutable Experiment.
 *
 * A Workbench session is not an Experiment until the user saves it. The
 * `version` is only an optimistic-concurrency token; immutable identity
 * remains the opaque `snapshotId` carried by a Snapshot.
 */
export type ExperimentV2 = Readonly<{
  schemaId: typeof STUDIO_EXPERIMENT_V2_SCHEMA_ID;
  experimentId: ExperimentIdV2;
  version: ExperimentVersionV2;
  content: ExperimentContentV2;
}>;

/**
 * One immutable, publicly executable Experiment state.
 *
 * A Snapshot has no Article/Publication kind. Those are mutable references to
 * the same admitted artifact: an Experiment Publication points at a Snapshot,
 * while an Article Placement owns its resolved Reader projection and points
 * at a Snapshot. The admission contract is therefore identical for every
 * Snapshot and never rewrites the captured checkpoint through settlement.
 */
export type ExperimentSnapshotV2 = Readonly<{
  schemaId: typeof STUDIO_EXPERIMENT_SNAPSHOT_V2_SCHEMA_ID;
  snapshotId: ExperimentSnapshotIdV2;
  /** Exact authoring/analysis Surface sealed with this immutable capture. */
  surfaceReleaseId: string;
  content: ExperimentContentV2;
  createdAt: string;
  createdBy?: string;
}>;

export type ExperimentPlacementBriefingScenarioScopeV2 = Readonly<{
  /** Scenarios that the Reader is allowed to display and interact with. */
  visibleScenarioIds: readonly ScenarioIdV2[];
  /** Initial neutral output/controller context. Must be visible. */
  initialFocusScenarioId: ScenarioIdV2;
}>;

export type ExperimentPlacementBriefingGraphSeriesV2 = Readonly<{
  /** Must select a series already authored by the source Surface graph pane. */
  seriesId: string;
  label: string;
  order: number;
}>;

/** Exact Article-local color override captured for one Scenario/item trace. */
export type ExperimentPlacementBriefingGraphTraceColorV2 = Readonly<{
  scenarioId: ScenarioIdV2;
  seriesId: string | null;
  colorHex: string;
}>;

export type ExperimentPlacementBriefingGraphOverridesV2 = Readonly<{
  label?: string;
  legend?: "auto" | "hidden" | "compact" | "full";
  series?: readonly ExperimentPlacementBriefingGraphSeriesV2[];
  traceColors?: readonly ExperimentPlacementBriefingGraphTraceColorV2[];
  windowSec?: number;
  historyDepth?: number;
  pvTrailBeats?: number;
}>;

export type ExperimentPlacementBriefingGraphV2 = Readonly<{
  /** Selects one immutable graph pane from the pinned Snapshot Surface. */
  paneId: SurfacePaneIdV2;
  order: number;
  emphasis: "primary" | "supporting";
  overrides?: ExperimentPlacementBriefingGraphOverridesV2;
}>;

/**
 * Item-level reading emphasis shared by outputs and controls.
 *
 * `primary` items form the observation the reader keeps in view while
 * operating: they sit beside the graph in every extent. `supporting` items
 * remain sealed content that the reader opens from the same Placement and may
 * bring into the observation. Emphasis never changes an item's Scenario
 * binding, its value, or whether it can be operated. Placements sealed before
 * item emphasis carry no value; the Reader then derives an initial
 * observation from the sealed order.
 */
export type ExperimentPlacementBriefingItemEmphasisV2 = "primary" | "supporting";

export type ExperimentPlacementBriefingOutputV2 = Readonly<{
  /** Source identity is provenance inside the pinned immutable Snapshot. */
  sourcePaneId: SurfacePaneIdV2;
  /** Must select an output item present in that exact source pane. */
  outputId: string;
  /** Concrete Scenario materialized from the source pane at pickup time. */
  scenarioId: ScenarioIdV2;
  label: string;
  order: number;
  emphasis?: ExperimentPlacementBriefingItemEmphasisV2;
}>;

export type ExperimentPlacementBriefingControlButtonOptionV2 =
  ExperimentControlButtonOptionV2;

export type ExperimentPlacementBriefingControlPresentationV2 =
  ExperimentControlPresentationV2;

export type ExperimentPlacementBriefingControlBindingV2 =
  | Readonly<{
      mode: "reader-focus";
      allowedScenarioIds: readonly ScenarioIdV2[];
    }>
  | Readonly<{
      mode: "fixed";
      scenarioIds: readonly ScenarioIdV2[];
      application: "absolute";
    }>;

export type ExperimentPlacementBriefingControlV2 = Readonly<{
  /** Source identity is provenance inside the pinned immutable Snapshot. */
  sourcePaneId: SurfacePaneIdV2;
  /** Must select a control item present in that exact source pane. */
  controlId: string;
  label: string;
  order: number;
  presentation: ExperimentPlacementBriefingControlPresentationV2;
  binding: ExperimentPlacementBriefingControlBindingV2;
  emphasis?: ExperimentPlacementBriefingItemEmphasisV2;
}>;

/**
 * One reading view of the graph stage: one selected graph pane, or two shown
 * side by side when the stage is wide enough. Narrow stages split a pair into
 * consecutive single views; the pairing is a density hint, never a renderer
 * or numerical change.
 */
export type ExperimentPlacementBriefingViewV2 = Readonly<{
  paneIds: readonly SurfacePaneIdV2[];
}>;

/**
 * Author-sealed reading form of one Placement.
 *
 * `extent` is the resting form in the Article column: `inline` renders live
 * in flow, `peek` rests as an anchor and opens beside the text, `full` rests
 * as an anchor and opens over the page in the Workbench area arrangement.
 * `views` groups the selected graphs into stage views (1–2 panes each);
 * graphs absent from every view follow as single views.
 * `analysisRecompute` decides whether Surface-pinned analyses (settled PV
 * relations, Starling families, PVA outputs) are re-measured automatically
 * after every reader control change, or only when the reader asks. The
 * analysis identity, method, and result are unchanged either way; only the
 * moment of the expensive measurement moves.
 */
export type ExperimentPlacementBriefingPresentationV2 = Readonly<{
  extent: "inline" | "peek" | "full";
  views?: readonly ExperimentPlacementBriefingViewV2[];
  analysisRecompute?: "on-request" | "automatic";
}>;

/**
 * Article-local Reader projection of one pinned immutable Snapshot Surface.
 *
 * The role-specific selections are deliberately explicit. Graphs may carry a
 * small allowlisted presentation override, while outputs and controls remain
 * item selections. Scenario scope and output/control targets are resolved when
 * the Placement is authored; no mutable Workbench active-slot identity leaks
 * into durable Article content.
 */
export type ExperimentPlacementBriefingV2 = Readonly<{
  /** Immutable title captured from the source Experiment at seal time. */
  defaultTitle: string;
  scenarioScope: ExperimentPlacementBriefingScenarioScopeV2;
  graphs: readonly ExperimentPlacementBriefingGraphV2[];
  outputs: readonly ExperimentPlacementBriefingOutputV2[];
  controls: readonly ExperimentPlacementBriefingControlV2[];
  /** Absent on Placements sealed before explicit reading forms; a heuristic applies. */
  presentation?: ExperimentPlacementBriefingPresentationV2;
}>;

export type ExperimentPlacementV2 = Readonly<{
  schemaId: typeof STUDIO_EXPERIMENT_PLACEMENT_V2_SCHEMA_ID;
  placementId: ExperimentPlacementIdV2;
  snapshotId: ExperimentSnapshotIdV2;
  /** Immutable Article-local projection of the pinned Snapshot. */
  briefing: ExperimentPlacementBriefingV2;
  /** Article-local copy edit. Null resolves to briefing.defaultTitle. */
  titleOverride: string | null;
  caption: string | null;
}>;

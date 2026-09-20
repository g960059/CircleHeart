import {
  STUDIO_EXPERIMENT_PLACEMENT_V2_SCHEMA_ID,
  type ExperimentPlacementBriefingV2,
  type ExperimentPlacementV2,
  type ExperimentSnapshotV2,
  type ExperimentSurfaceControlPaneV2,
  type ExperimentSurfaceControlPaneBindingV2,
  type ExperimentSurfaceGraphPaneV2,
  type ExperimentSurfaceOutputPaneBindingV2,
  type ExperimentSurfaceOutputPaneV2,
  type ExperimentSurfaceV2,
} from "@/studio/contracts/v2/content";
import {
  validateExperimentPlacementAgainstSnapshotV2,
} from "@/studio/application/authoring/StudioExperimentDataV2";
import {
  articleBriefingControlKeyV3,
  articleBriefingOutputKeyV3,
  articleBriefingPrimaryControlKeysV3,
  articleBriefingPrimaryOutputKeysV3,
  withExplicitItemEmphasisV3,
} from "@/studio/application/article/ArticleBriefingObservationV3";
import type {
  StudioArticleExperimentBlockV2,
} from "@/studio/contracts/v2/article";
export {
  articleBriefingPresentationV3,
} from "@/studio/application/authoring/StudioArticleBriefingPresentationV3";
export type {
  ArticleBriefingPresentationV3,
} from "@/studio/application/authoring/StudioArticleBriefingPresentationV3";

export type ArticleSurfacePaneV3 =
  | ExperimentSurfaceGraphPaneV2
  | ExperimentSurfaceOutputPaneV2
  | ExperimentSurfaceControlPaneV2;

const ROLE_ORDER_V3: Readonly<Record<ArticleSurfacePaneV3["role"], number>> = {
  graph: 0,
  output: 1,
  control: 2,
};

export function articleSurfacePanesV3(
  surface: ExperimentSurfaceV2,
): readonly ArticleSurfacePaneV3[] {
  return Object.freeze([
    ...surface.graphPanes,
    ...surface.outputPanes,
    ...surface.controlPanes,
  ].sort((left, right) => (
    ROLE_ORDER_V3[left.role] - ROLE_ORDER_V3[right.role]
    || left.order - right.order
    || left.paneId.localeCompare(right.paneId)
  )));
}

/**
 * Resolves the role-specific Reader Briefing owned by one Article Placement.
 * The pinned Snapshot remains a neutral immutable executable value.
 */
export function resolveArticlePlacementBriefingV3(
  placement: ExperimentPlacementV2,
  snapshot: ExperimentSnapshotV2,
): ExperimentPlacementBriefingV2 {
  validateExperimentPlacementAgainstSnapshotV2(placement, snapshot);
  return placement.briefing;
}

/** Creates the explicit Reader projection used for a newly placed Snapshot. */
export function defaultArticleBriefingV3(
  snapshot: Pick<ExperimentSnapshotV2, "content">,
  preferredFocusScenarioId?: string,
  defaultTitle?: string,
): ExperimentPlacementBriefingV2 {
  const visibleScenarioIds = Object.freeze(snapshot.content.scenarios.map(
    ({ scenarioId }) => scenarioId,
  ));
  const initialFocusScenarioId = preferredFocusScenarioId !== undefined &&
    visibleScenarioIds.includes(preferredFocusScenarioId)
    ? preferredFocusScenarioId
    : visibleScenarioIds[0];
  if (initialFocusScenarioId === undefined) {
    throw new Error("Article Briefing requires at least one Snapshot Scenario");
  }
  const surface = snapshot.content.surface;
  const highestGraphPriority = surface.graphPanes.reduce(
    (highest, pane) => Math.max(highest, pane.priority),
    Number.NEGATIVE_INFINITY,
  );
  const graphs = Object.freeze([...surface.graphPanes]
    .sort(compareSurfacePaneOrderV3)
    .map((pane, order) => Object.freeze({
      paneId: pane.paneId,
      order,
      emphasis: pane.priority === highestGraphPriority
        ? "primary" as const
        : "supporting" as const,
    })));
  const unmarkedOutputs = [...surface.outputPanes]
    .sort(compareSurfacePaneOrderV3)
    .flatMap((pane) => [...pane.items]
      .sort(compareItemOrderV3)
      .map((item) => ({ pane, item })))
    .map(({ pane, item }, order) => Object.freeze({
      sourcePaneId: pane.paneId,
      outputId: item.outputId,
      scenarioId: materializeSurfaceOutputPaneBindingV3(
        pane.binding,
        initialFocusScenarioId,
        visibleScenarioIds,
      ),
      label: item.label,
      order,
    }));
  const unmarkedControls = [...surface.controlPanes]
    .sort(compareSurfacePaneOrderV3)
    .flatMap((pane) => [...pane.items]
      .sort(compareItemOrderV3)
      .map((item) => ({ pane, item })))
    .map(({ pane, item }, order) => Object.freeze({
      sourcePaneId: pane.paneId,
      controlId: item.controlId,
      label: item.label,
      order,
      presentation: item.presentation.kind === "buttons"
        ? Object.freeze({
            kind: "buttons" as const,
            options: Object.freeze(item.presentation.options.map((option) =>
              Object.freeze({ ...option }))),
          })
        : Object.freeze({ kind: "slider" as const }),
      binding: materializeSurfaceControlPaneBindingV3(
        pane.binding,
        initialFocusScenarioId,
        visibleScenarioIds,
      ),
    }));
  // The initial observation is sealed explicitly so the author sees and can
  // change exactly what the Reader keeps beside the graph.
  const outputs = withExplicitItemEmphasisV3(
    unmarkedOutputs,
    new Set(articleBriefingPrimaryOutputKeysV3({ outputs: unmarkedOutputs })),
    (output) => articleBriefingOutputKeyV3(output),
  );
  const controls = withExplicitItemEmphasisV3(
    unmarkedControls,
    new Set(articleBriefingPrimaryControlKeysV3({ controls: unmarkedControls })),
    (control) => articleBriefingControlKeyV3(control),
  );
  return Object.freeze({
    defaultTitle: normalizedBriefingTitleV3(
      defaultTitle,
      snapshot.content.scenarios[0]?.label,
    ),
    scenarioScope: Object.freeze({
      visibleScenarioIds,
      initialFocusScenarioId,
    }),
    graphs,
    outputs,
    controls,
  });
}

/** Materializes one Output pane's active slot to one concrete Scenario. */
export function materializeSurfaceOutputPaneBindingV3(
  binding: ExperimentSurfaceOutputPaneBindingV2,
  captureScenarioId: string,
  availableScenarioIds: readonly string[],
): string {
  const available = new Set(availableScenarioIds);
  if (binding.mode === "fixed" && available.has(binding.scenarioId)) {
    return binding.scenarioId;
  }
  if (available.has(captureScenarioId)) return captureScenarioId;
  const fallbackScenarioId = availableScenarioIds[0];
  if (fallbackScenarioId === undefined) {
    throw new Error("Briefing output binding requires at least one Scenario");
  }
  return fallbackScenarioId;
}

/**
 * Converts mutable Workbench pane semantics to portable Reader semantics.
 * The returned binding never contains `active-slot`.
 */
export function materializeSurfaceControlPaneBindingV3(
  binding: ExperimentSurfaceControlPaneBindingV2,
  captureScenarioId: string,
  availableScenarioIds: readonly string[],
): ExperimentPlacementBriefingV2["controls"][number]["binding"] {
  const available = new Set(availableScenarioIds);
  const fixedScenarioIds = binding.mode === "fixed"
    ? binding.scenarioIds.filter((scenarioId) => available.has(scenarioId))
    : [];
  const fallbackScenarioId = available.has(captureScenarioId)
    ? captureScenarioId
    : availableScenarioIds[0];
  if (fallbackScenarioId === undefined) {
    throw new Error("Briefing control binding requires at least one Scenario");
  }
  return Object.freeze({
    mode: "fixed" as const,
    scenarioIds: Object.freeze(
      fixedScenarioIds.length > 0 ? fixedScenarioIds : [fallbackScenarioId],
    ),
    application: "absolute" as const,
  });
}

export function createArticleExperimentBlockV3(
  input: Readonly<{
    snapshot: ExperimentSnapshotV2;
    briefing?: ExperimentPlacementBriefingV2;
    createId: (kind: "block" | "placement") => string;
  }>,
): StudioArticleExperimentBlockV2 {
  const briefing = input.briefing ?? defaultArticleBriefingV3(input.snapshot);
  const blockId = input.createId("block");
  const placementId = input.createId("placement");
  const placement = validateExperimentPlacementAgainstSnapshotV2({
    schemaId: STUDIO_EXPERIMENT_PLACEMENT_V2_SCHEMA_ID,
    placementId,
    snapshotId: input.snapshot.snapshotId,
    briefing,
    titleOverride: null,
    caption: null,
  }, input.snapshot);
  return Object.freeze({
    blockId,
    kind: "experiment",
    placement,
  });
}

/** Article copy may rename a Placement without mutating its immutable Snapshot. */
export function resolveArticlePlacementTitleV3(
  placement: Pick<ExperimentPlacementV2, "titleOverride">,
  briefing: Pick<ExperimentPlacementBriefingV2, "defaultTitle">,
): string {
  return placement.titleOverride ?? briefing.defaultTitle;
}

function normalizedBriefingTitleV3(
  requested: string | undefined,
  scenarioFallback: string | undefined,
): string {
  const normalized = requested?.trim() ?? "";
  if (normalized.length > 0) return normalized;
  const fallback = scenarioFallback?.trim() ?? "";
  return fallback.length > 0 ? fallback : "Simulation";
}

function compareSurfacePaneOrderV3(
  left: Readonly<{ order: number; paneId: string }>,
  right: Readonly<{ order: number; paneId: string }>,
): number {
  return left.order - right.order || left.paneId.localeCompare(right.paneId);
}

function compareItemOrderV3(
  left: Readonly<{ order: number }>,
  right: Readonly<{ order: number }>,
): number {
  return left.order - right.order;
}

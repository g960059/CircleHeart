import React from "react";
import { WorkbenchPaneSettingsButtonV3 } from "./WorkbenchPaneSettingsButtonV3";
import {
  ChevronDown,
  Plus,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import type {
  WorkbenchAddPaneOptionV3,
  WorkbenchPaneAddRequestV3,
  WorkbenchPaneDefinitionV3,
} from "@/components/workbench/WorkbenchDockview";
import {
  ExperimentObservationV3,
  type ExperimentOutputSelectionV3,
} from "@/components/workbench/ExperimentPanePresentationV3";
import {
  projectWorkbenchObservationV3,
  resolveWorkbenchObservedKeysV3,
  useWorkbenchRememberedReadingsV3,
  workbenchObservedOutputKeyV3,
  type WorkbenchOutputPaneReadingV3,
} from "@/components/workbench/presentation/WorkbenchObservationV3";

export type WorkbenchMobileTaskV3 = "control" | "output" | "scenarios";

type WorkbenchMobileStageDeckPropsV3 = Readonly<{
  graphPanes: readonly WorkbenchPaneDefinitionV3[];
  outputPanes: readonly WorkbenchPaneDefinitionV3[];
  controlPanes: readonly WorkbenchPaneDefinitionV3[];
  graphAddOptions: readonly WorkbenchAddPaneOptionV3[];
  scenarioContent: React.ReactNode;
  scenarioError?: React.ReactNode;
  renderGraphPane: (pane: WorkbenchPaneDefinitionV3) => React.ReactNode;
  renderOutputPane: (pane: WorkbenchPaneDefinitionV3, selection?: ExperimentOutputSelectionV3) => React.ReactNode;
  /** Live reading of one output pane, for the observation beneath the graph. */
  readOutputPane?: (pane: WorkbenchPaneDefinitionV3) => WorkbenchOutputPaneReadingV3 | null;
  /** Session-owned observation: `null` until the user changes the initial choice. */
  observedSelection?: readonly string[] | null;
  onObservedSelectionChange?: (selection: readonly string[]) => void;
  renderControlPane: (pane: WorkbenchPaneDefinitionV3) => React.ReactNode;
  onOpenPaneSettings: (paneId: string, section?: "items" | "binding", intent?: "add" | "manage", anchor?: HTMLElement) => void;
  onAddGraphPane: WorkbenchPaneAddRequestV3;
  onAddOutputPane: WorkbenchPaneAddRequestV3;
  onAddControlPane: WorkbenchPaneAddRequestV3;
}>;

const firstPaneIdV3 = (
  panes: readonly WorkbenchPaneDefinitionV3[],
): string | null => panes[0]?.paneId ?? null;

function useReconciledPaneSelectionV3(
  panes: readonly WorkbenchPaneDefinitionV3[],
): readonly [string | null, React.Dispatch<React.SetStateAction<string | null>>] {
  const paneIdSignature = JSON.stringify(panes.map(({ paneId }) => paneId));
  const [paneId, setPaneId] = React.useState<string | null>(() =>
    firstPaneIdV3(panes));
  React.useEffect(() => {
    setPaneId((current) =>
      current !== null && panes.some((pane) => pane.paneId === current)
        ? current
        : firstPaneIdV3(panes));
  }, [paneIdSignature]);
  return [paneId, setPaneId] as const;
}

/** Collapsed pane ids; a newly added pane always opens. */
function useCollapsedPanesV3(
  panes: readonly WorkbenchPaneDefinitionV3[],
  initiallyCollapsed: (pane: WorkbenchPaneDefinitionV3, index: number) => boolean,
): readonly [ReadonlySet<string>, (paneId: string) => void, (paneId: string) => void] {
  const paneIdSignature = JSON.stringify(panes.map(({ paneId }) => paneId));
  const knownPaneIdsRef = React.useRef<ReadonlySet<string>>(new Set(panes.map(({ paneId }) => paneId)));
  const [collapsed, setCollapsed] = React.useState<ReadonlySet<string>>(
    () => new Set(panes.filter(initiallyCollapsed).map(({ paneId }) => paneId)),
  );
  React.useEffect(() => {
    const currentPaneIds = new Set(panes.map(({ paneId }) => paneId));
    knownPaneIdsRef.current = currentPaneIds;
    setCollapsed((current) => new Set([...current].filter((paneId) => currentPaneIds.has(paneId))));
  }, [paneIdSignature]);
  const toggle = React.useCallback((paneId: string) => {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(paneId)) next.delete(paneId); else next.add(paneId);
      return next;
    });
  }, []);
  const open = React.useCallback((paneId: string) => {
    setCollapsed((current) => {
      if (!current.has(paneId)) return current;
      const next = new Set(current);
      next.delete(paneId);
      return next;
    });
  }, []);
  return [collapsed, toggle, open] as const;
}

/**
 * Smartphone Workbench shell: graph tabs above the plot, the observation
 * (measurements the user keeps in view) directly beneath it, then one deck
 * that switches between the controllers, every output pane, and Scenarios.
 * It owns no numerical or durable Experiment state: it projects the same
 * panes and callbacks the desktop Workbench uses. Editing, adding panes and
 * Scenario management stay reachable from the deck.
 */
export function WorkbenchMobileStageDeckV3({
  graphPanes,
  outputPanes,
  controlPanes,
  graphAddOptions,
  scenarioContent,
  scenarioError,
  renderGraphPane,
  renderOutputPane,
  readOutputPane,
  observedSelection = null,
  onObservedSelectionChange,
  renderControlPane,
  onOpenPaneSettings,
  onAddGraphPane,
  onAddOutputPane,
  onAddControlPane,
}: WorkbenchMobileStageDeckPropsV3) {
  const { t } = useTranslation();
  const [activeTask, setActiveTask] = React.useState<WorkbenchMobileTaskV3>("control");
  const [graphPaneId, setGraphPaneId] = useReconciledPaneSelectionV3(graphPanes);
  // The first controller pane opens; the rest wait one tap away. Output panes
  // open so every measurement is a toggle for the observation.
  const [collapsedControlPaneIds, toggleControlPane, openControlPane] =
    useCollapsedPanesV3(controlPanes, (_pane, index) => index > 0);
  const [collapsedOutputPaneIds, toggleOutputPane, openOutputPane] =
    useCollapsedPanesV3(outputPanes, () => false);
  const activeGraphPane = graphPanes.find(({ paneId }) => paneId === graphPaneId) ?? null;
  const tabId = React.useId();
  // The observation reads every output pane, remembers valid measurements
  // after commit (pane bodies are unmounted behind the control task), and
  // shows the Session's observed tiles grouped by pane.
  const readings = React.useMemo(
    () => outputPanes.flatMap((pane) => { const reading = readOutputPane?.(pane); return reading == null ? [] : [reading]; }),
    [outputPanes, readOutputPane],
  );
  useWorkbenchRememberedReadingsV3(readings);
  const observedKeys = resolveWorkbenchObservedKeysV3(observedSelection, readings);
  const observedSet = new Set(observedKeys);
  const observedGroups = projectWorkbenchObservationV3(readings, observedKeys, {
    genericTitles: [t("workbench.live.mobilePaneAreas.output"), t("workbench.live.outputArea")],
  });
  const observedCount = observedGroups.reduce((total, group) => total + group.items.length, 0);
  const outputSelectionFor = (pane: WorkbenchPaneDefinitionV3): ExperimentOutputSelectionV3 | undefined =>
    readOutputPane === undefined || onObservedSelectionChange === undefined ? undefined : {
      selectedItemIds: new Set(readings.find((reading) => reading.paneId === pane.paneId)?.measured
        .map((item) => item.itemId)
        .filter((itemId) => observedSet.has(workbenchObservedOutputKeyV3(pane.paneId, itemId)))),
      onToggle: (itemId) => {
        const key = workbenchObservedOutputKeyV3(pane.paneId, itemId);
        onObservedSelectionChange(observedSet.has(key) ? observedKeys.filter((candidate) => candidate !== key) : [...observedKeys, key]);
      },
      toggleLabel: (label, selected) => t(selected ? "workbench.live.unobserveOutput" : "workbench.live.observeOutput", { label }),
    };

  const addPane = (area: "control" | "output", anchor: HTMLElement) => {
    const request = area === "control" ? onAddControlPane : onAddOutputPane;
    request(anchor, (paneId) => (area === "control" ? openControlPane : openOutputPane)(paneId));
  };

  return (
    <main
      className="workbench-mobile-stage-deck"
      data-testid="workbench-mobile-stage-deck"
    >
      <section
        className="workbench-mobile-stage"
        aria-label={t("workbench.live.graphArea")}
        data-testid="workbench-mobile-stage"
      >
        <MobileGraphViewRailV3
          tabId={tabId}
          panes={graphPanes}
          selectedPaneId={graphPaneId}
          addOptions={graphAddOptions}
          onSelectPane={setGraphPaneId}
          onAddOption={(anchor) => onAddGraphPane(anchor, setGraphPaneId)}
        />
        <div
          id={`${tabId}-graph-panel`}
          role="tabpanel"
          aria-labelledby={graphPaneId === null ? undefined : `${tabId}-graph-${graphPaneId}`}
          className="workbench-mobile-stage-plot"
        >
          {activeGraphPane === null
            ? <MobileEmptyPaneV3 message={t("workbench.editor.emptyPaneArea")} />
            : renderGraphPane(activeGraphPane)}
        </div>
      </section>

      {observedCount > 0 && (
        <ExperimentObservationV3
          className="workbench-mobile-observation"
          groups={observedGroups}
          label={t("workbench.live.observation")}
          followingLabel={t("workbench.live.paneBindingModeActive")}
          data-testid="workbench-mobile-observation"
          data-observed-count={observedCount}
        />
      )}

      <section
        className="workbench-mobile-task-deck"
        aria-label={t("workbench.live.mobileTaskDeck")}
        data-testid="workbench-mobile-task-deck"
      >
        <div className="workbench-mobile-task-tabs" role="tablist" aria-label={t("workbench.live.mobileTaskDeck")}>
          {(["control", "output", "scenarios"] as const).map((task) => (
            <button
              key={task}
              id={`${tabId}-${task}-tab`}
              type="button"
              role="tab"
              aria-controls={`${tabId}-${task}-panel`}
              aria-selected={activeTask === task}
              className="workbench-mobile-task-tab"
              onClick={() => setActiveTask(task)}
            >
              {t(`workbench.live.mobileTaskTabs.${task}`)}
            </button>
          ))}
        </div>

        <div
          id={`${tabId}-${activeTask}-panel`}
          role="tabpanel"
          aria-labelledby={`${tabId}-${activeTask}-tab`}
          className="workbench-mobile-task-scroll"
          data-testid="workbench-mobile-task-scroll"
        >
          {activeTask === "control" ? (
            <MobilePaneListV3
              area="control"
              panes={controlPanes}
              collapsedPaneIds={collapsedControlPaneIds}
              renderPane={renderControlPane}
              onTogglePane={toggleControlPane}
              onOpenPaneSettings={onOpenPaneSettings}
              onAddPane={(anchor) => addPane("control", anchor)}
            />
          ) : activeTask === "output" ? (
            <MobilePaneListV3
              area="output"
              panes={outputPanes}
              collapsedPaneIds={collapsedOutputPaneIds}
              renderPane={(pane) => renderOutputPane(pane, outputSelectionFor(pane))}
              onTogglePane={toggleOutputPane}
              onOpenPaneSettings={onOpenPaneSettings}
              onAddPane={(anchor) => addPane("output", anchor)}
            />
          ) : (
            <div className="min-h-full">
              {scenarioError}
              {scenarioContent}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function MobileGraphViewRailV3({
  tabId,
  panes,
  selectedPaneId,
  addOptions,
  onSelectPane,
  onAddOption,
}: Readonly<{
  tabId: string;
  panes: readonly WorkbenchPaneDefinitionV3[];
  selectedPaneId: string | null;
  addOptions: readonly WorkbenchAddPaneOptionV3[];
  onSelectPane: (paneId: string) => void;
  onAddOption: (anchor: HTMLElement) => void;
}>) {
  const { t } = useTranslation();
  const tabRefs = React.useRef(new Map<string, HTMLButtonElement>());

  React.useEffect(() => {
    if (selectedPaneId === null) return;
    tabRefs.current.get(selectedPaneId)?.scrollIntoView({ behavior: "auto", block: "nearest", inline: "nearest" });
  }, [selectedPaneId]);

  const moveSelection = (event: React.KeyboardEvent<HTMLButtonElement>, paneIndex: number) => {
    if (panes.length === 0) return;
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight") nextIndex = (paneIndex + 1) % panes.length;
    else if (event.key === "ArrowLeft") nextIndex = (paneIndex - 1 + panes.length) % panes.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = panes.length - 1;
    if (nextIndex === null) return;
    event.preventDefault();
    const paneId = panes[nextIndex]!.paneId;
    onSelectPane(paneId);
    tabRefs.current.get(paneId)?.focus();
  };

  return (
    <div className="workbench-mobile-graph-view-rail" data-testid="workbench-mobile-graph-view-rail">
      <div className="workbench-mobile-graph-view-tabs" role="tablist" aria-label={t("workbench.live.mobileGraphViews")}>
        {panes.map((pane, paneIndex) => {
          const selected = pane.paneId === selectedPaneId;
          return (
            <button
              key={pane.paneId}
              ref={(element) => {
                if (element === null) tabRefs.current.delete(pane.paneId);
                else tabRefs.current.set(pane.paneId, element);
              }}
              id={`${tabId}-graph-${pane.paneId}`}
              type="button"
              role="tab"
              aria-controls={`${tabId}-graph-panel`}
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              className="workbench-mobile-graph-view-tab"
              onClick={() => onSelectPane(pane.paneId)}
              onKeyDown={(event) => moveSelection(event, paneIndex)}
            >
              <span className="truncate">{pane.title}</span>
            </button>
          );
        })}
      </div>
      {addOptions.length > 0 && (
        <div className="workbench-mobile-graph-view-actions">
          <button
            type="button"
            className="workbench-mobile-graph-view-action"
            aria-label={t("workbench.live.mobileAddGraphView")}
            aria-haspopup="dialog"
            onClick={(event) => onAddOption(event.currentTarget)}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Panes of one role as flat sections: the pane title is the heading, the
 * pane body (binding, items, settings) follows. No cards; whitespace and
 * the heading weight separate panes.
 */
function MobilePaneListV3({
  area,
  panes,
  collapsedPaneIds,
  renderPane,
  onTogglePane,
  onOpenPaneSettings,
  onAddPane,
}: Readonly<{
  area: "control" | "output";
  panes: readonly WorkbenchPaneDefinitionV3[];
  collapsedPaneIds: ReadonlySet<string>;
  renderPane: (pane: WorkbenchPaneDefinitionV3) => React.ReactNode;
  onTogglePane: (paneId: string) => void;
  onOpenPaneSettings: (paneId: string, section?: "items" | "binding", intent?: "add" | "manage", anchor?: HTMLElement) => void;
  onAddPane: (anchor: HTMLElement) => void;
}>) {
  const { t } = useTranslation();
  return (
    <div
      className="workbench-mobile-pane-groups"
      data-mobile-pane-groups={area}
      role="group"
      aria-label={t(area === "control" ? "workbench.live.mobileControlGroups" : "workbench.live.mobileMetricGroups")}
    >
      {panes.length === 0 && <MobileEmptyPaneV3 message={t("workbench.editor.emptyPaneArea")} />}
      {panes.map((pane) => {
        const expanded = !collapsedPaneIds.has(pane.paneId);
        const headingId = `mobile-pane-${pane.paneId}-heading`;
        const bodyId = `mobile-pane-${pane.paneId}-body`;
        return (
          <section
            key={pane.paneId}
            className="workbench-mobile-pane-group"
            data-mobile-pane-group-role={area}
            data-expanded={expanded ? "true" : "false"}
            aria-labelledby={headingId}
          >
            <header className="workbench-mobile-pane-group-header">
              <button
                id={headingId}
                type="button"
                className="workbench-mobile-pane-group-toggle"
                aria-controls={bodyId}
                aria-expanded={expanded}
                onClick={() => onTogglePane(pane.paneId)}
              >
                <span className="min-w-0 flex-1 truncate text-start">{pane.title}</span>
                <ChevronDown className="workbench-mobile-pane-group-chevron h-4 w-4" aria-hidden="true" />
              </button>
              {!expanded && <WorkbenchPaneSettingsButtonV3 title={pane.title} onOpen={(anchor) => onOpenPaneSettings(pane.paneId, "items", "manage", anchor)} />}
            </header>
            <div id={bodyId} className="workbench-mobile-pane-group-body" hidden={!expanded}>
              {expanded && renderPane(pane)}
            </div>
          </section>
        );
      })}
      <button
        type="button"
        className="workbench-mobile-pane-group-add"
        aria-haspopup="dialog"
        onClick={(event) => onAddPane(event.currentTarget)}
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        <span>{t(area === "control" ? "workbench.live.mobileAddControlGroup" : "workbench.live.mobileAddMetricGroup")}</span>
      </button>
    </div>
  );
}

function MobileEmptyPaneV3({ message }: Readonly<{ message: string }>) {
  return (
    <div className="grid min-h-full place-items-center p-6 text-xs text-wb-subtle">
      {message}
    </div>
  );
}

/**
 * The phone shell serves phone-width viewports and touch devices held in
 * landscape (wide but short). A mouse-driven desktop window of the same
 * short height keeps the Dockview arrangement.
 */
export const MOBILE_WORKBENCH_SHELL_QUERY_V3 =
  "(max-width: 767px), ((pointer: coarse) and (max-width: 1023px) and (max-height: 520px))";

export function useMobileWorkbenchShellV3(): boolean {
  const query = MOBILE_WORKBENCH_SHELL_QUERY_V3;
  const [matches, setMatches] = React.useState(() =>
    typeof window !== "undefined" && window.matchMedia(query).matches);
  React.useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return matches;
}

import React from "react";
import { Check, ChevronRight, Plus, Undo2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { studioNumericControlValueIssueV2 } from "@/studio/contracts/v2/control";
import type { ExperimentControlPresentationV2 } from "@/studio/contracts/v2/content";
import type { ControlDefinitionV2 } from "@/studio/contracts/v2/model";
import {
  WorkbenchItemDescriptionPopoverV3,
} from "./presentation/WorkbenchItemDescriptionPopoverV3";
import { incrementWorkbenchPerformanceCounterV3 } from "./runtime/WorkbenchPerformanceDiagnosticsV3";
import { studioOutputReadingV1 } from "@/studio/presentation/StudioItemPresentationCatalogV1";
import { studioOutputComparisonMethodLabelsV1 } from "@/studio/presentation/StudioOutputMeasurementMethodsV1";

export type ExperimentOutputPresentationItemV3 = Readonly<{
  itemId: string;
  /** Numerical identity, independent of the row key and Scenario binding. */
  outputId: string | null;
  label: string;
  description?: string;
  descriptionAriaLabel?: string;
  value: number | null;
  /** Presentation-only composition over one or more atomic numerical outputs. */
  displayValue?: string;
  unit: string;
  significantDigits?: number;
  availability?: string;
  quality?: string;
  qualityNotice?: string;
  /** Previous display value only; availability/quality still describe the current result. */
  staleNotice?: string;
}>;

/**
 * One group of observed measurements: a source pane read for one Scenario.
 * The heading names the pane once (and its Scenario when several are open),
 * so tiles keep to label and value. `following` marks a pane whose Scenario
 * follows the Workbench active slot; sealed Article references never follow.
 */
export type ExperimentObservationGroupV3 = Readonly<{
  key: string;
  /** Pane label; omitted when the Scenario alone names the group. */
  title?: string;
  scenario?: Readonly<{ label: string; colorHex: string }>;
  following?: boolean;
  /**
   * The heading adds nothing on screen (one group, one Scenario, a title
   * that only repeats it): it is kept for assistive technology only.
   */
  headingHidden?: boolean;
  items: readonly ExperimentOutputPresentationItemV3[];
}>;

/**
 * Ephemeral observation selection shared by Article Reader and Workbench:
 * a measurement tile toggles its membership in the observation kept beside
 * the graph. Selection is presentation state only; it never changes the
 * sealed pane, the Scenario binding, or the value.
 */
export type ExperimentOutputSelectionV3 = Readonly<{
  selectedItemIds: ReadonlySet<string>;
  onToggle: (itemId: string) => void;
  toggleLabel: (label: string, selected: boolean) => string;
}>;

export type ExperimentPaneAddItemActionV3 = Readonly<{
  label: string;
  onClick: () => void;
  prominent?: boolean;
}>;

/**
 * Shared graph chrome for the full Experiment Session and Article projections.
 * Runtime-specific adapters own trace materialization; this component owns the
 * visual surface so both contexts retain identical theme and spacing rules.
 */
export function ExperimentGraphPresentationV3({
  canvasClassName = "",
  children,
  className = "",
  label,
  variant,
  ...figureProps
}: Readonly<{
  canvasClassName?: string;
  children: React.ReactNode;
  label?: string;
  variant: "pane" | "article";
}> &
  Omit<React.HTMLAttributes<HTMLElement>, "children">) {
  const figureClassName =
    variant === "pane"
      ? "h-full min-h-0 min-w-0 bg-wb-canvas p-3"
      : "min-w-0 rounded-xl bg-wb-canvas p-3 sm:p-4";
  return (
    <figure
      className={`${figureClassName} ${className}`.trim()}
      {...figureProps}
      data-experiment-graph-presentation={variant}
    >
      {label !== undefined && (
        <figcaption className="mb-2 text-sm font-semibold tracking-tight text-wb-text">
          {label}
        </figcaption>
      )}
      <div className={canvasClassName}>{children}</div>
    </figure>
  );
}

/** One output vocabulary shared by docked panes and Article Briefings. */
export function ExperimentOutputGridV3({
  addItemAction,
  className = "",
  emptyMessage,
  items,
  scrollMode = "contained",
  selection,
  variant,
}: Readonly<{
  addItemAction?: ExperimentPaneAddItemActionV3;
  className?: string;
  emptyMessage?: string;
  items: readonly ExperimentOutputPresentationItemV3[];
  scrollMode?: "contained" | "parent";
  /** When present every tile is a toggle for the observation. */
  selection?: ExperimentOutputSelectionV3;
  variant: "pane" | "article";
}>) {
  const { i18n } = useTranslation();
  const japanese = i18n.language?.startsWith("ja");
  const methodLabels = studioOutputComparisonMethodLabelsV1(items.map(item => item.outputId), japanese ? "ja" : "en");
  const layoutClassName =
    variant === "pane"
      ? `min-h-0 flex-1 px-2 pb-2 ${
          scrollMode === "contained" ? "overflow-auto" : "overflow-visible"
        }`
      : "article-output-grid";
  return (
    <div
      className={`workbench-output-grid grid ${layoutClassName} ${className}`.trim()}
      data-experiment-output-presentation={variant}
      data-output-selection={selection === undefined ? undefined : "true"}
    >
      {items.length === 0 && emptyMessage !== undefined && (
        <p className="col-span-full p-4 text-xs text-wb-subtle">
          {emptyMessage}
        </p>
      )}
      {items.map((item) => {
        const display = resolveExperimentOutputDisplayV3(item);
        const selected = selection?.selectedItemIds.has(item.itemId);
        return (
          <ExperimentOutputTileV3
            key={item.itemId}
            itemId={item.itemId} label={item.label}
            value={display.value} unit={display.unit}
            availability={item.availability ?? "unavailable"}
            quality={item.quality ?? "not-assessed"}
            description={item.description} descriptionAriaLabel={item.descriptionAriaLabel}
            qualityNotice={item.qualityNotice} staleNotice={item.staleNotice}
            methodLabel={item.outputId ? methodLabels.get(item.outputId) : undefined}
            contextLabel={item.staleNotice ? (japanese ? "前回値" : "Previous")
              : item.outputId && studioOutputReadingV1(item.outputId) === "waveform" ? (japanese ? "現在値" : "Current") : undefined}
            selected={selected}
            toggleLabel={selection === undefined ? undefined : selection.toggleLabel(item.label, selected === true)}
            onToggle={selection?.onToggle}
          />
        );
      })}
      {addItemAction !== undefined && (
        <ExperimentPaneAddItemButtonV3
          label={addItemAction.label}
          layout="output-tile"
          onClick={addItemAction.onClick}
          prominent={addItemAction.prominent}
        />
      )}
    </div>
  );
}

/** Compare displayed primitives, not high-rate frame objects or unrounded values. */
const ExperimentOutputTileV3 = React.memo(function ExperimentOutputTileV3({
  itemId, label, value, unit, availability, quality,
  description, descriptionAriaLabel, qualityNotice, staleNotice, contextLabel, methodLabel,
  selected, toggleLabel, onToggle,
}: Readonly<{
  itemId: string; label: string; value: string; unit: string;
  availability: string; quality: string; description?: string;
  descriptionAriaLabel?: string; qualityNotice?: string; staleNotice?: string;
  contextLabel?: string;
  methodLabel?: string;
  selected?: boolean;
  toggleLabel?: string;
  onToggle?: (itemId: string) => void;
}>) {
  incrementWorkbenchPerformanceCounterV3("react.output-tile.render");
  const disclosure = [staleNotice ?? qualityNotice, description].filter(Boolean).join("\n\n");
  const selectable = onToggle !== undefined && toggleLabel !== undefined;
  return <div className="workbench-output-item min-w-0"
    data-output-id={itemId} data-output-availability={availability}
    data-output-quality={quality} data-output-stale={staleNotice !== undefined ? "true" : "false"}
    data-output-selected={selectable ? (selected ? "true" : "false") : undefined}>
    <div className="flex min-w-0 items-center gap-1">
      {disclosure ? <WorkbenchItemDescriptionPopoverV3
        ariaLabel={descriptionAriaLabel ?? label} description={disclosure}>
        <span className="workbench-output-label block truncate">{label}</span>
      </WorkbenchItemDescriptionPopoverV3>
        : <p className="workbench-output-label min-w-0 truncate">{label}</p>}
      {contextLabel && <span data-testid="output-value-context-v3" className="shrink-0 text-[10px] text-wb-subtle">{contextLabel}</span>}
      {selectable && (
        // The tile itself is the target: the button stretches over the tile
        // while the description trigger stays above it.
        <button type="button" className="workbench-output-toggle" aria-pressed={selected === true}
          aria-label={toggleLabel} title={toggleLabel} onClick={() => onToggle(itemId)}>
          <Check className="h-2.5 w-2.5" aria-hidden="true" strokeWidth={3} />
        </button>
      )}
    </div>
    {methodLabel && <p data-testid="output-method-context-v3" className="text-[10px] leading-tight text-wb-subtle">{methodLabel}</p>}
    <p className="workbench-output-value mt-0.5 tabular-nums"
      title={staleNotice}>
      {value}{unit && <span className="workbench-output-unit">{unit}</span>}
      {staleNotice && <span className="sr-only">{staleNotice}</span>}
    </p>
  </div>;
});

/**
 * The observation kept beside the graph: grouped measurement tiles in a
 * bounded strip. When the strip cannot show every observed value, the count
 * says so and opens the whole selection in place; nothing is dropped. The
 * caller bounds the strip (Article Peek/sheet, phone Workbench); unbounded
 * containers never overflow, so no affordance appears.
 */
export function ExperimentObservationV3({
  groups,
  label,
  moreLabel,
  className = "",
  followingLabel,
  ...sectionProps
}: Readonly<{
  groups: readonly ExperimentObservationGroupV3[];
  label: string;
  /** Count affordance text, e.g. "7 observed". */
  moreLabel: (count: number) => string;
  className?: string;
  /** Word shown beside a Scenario that follows the active slot. */
  followingLabel?: string;
}> & Omit<React.HTMLAttributes<HTMLElement>, "children" | "className">) {
  const rootRef = React.useRef<HTMLElement>(null);
  const [overflowing, setOverflowing] = React.useState(false);
  const [expanded, setExpanded] = React.useState(false);
  const count = groups.reduce((total, group) => total + group.items.length, 0);
  React.useLayoutEffect(() => {
    const element = rootRef.current;
    if (element === null || typeof ResizeObserver === "undefined") return undefined;
    const measure = () => setOverflowing(element.scrollHeight > element.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [count, expanded]);
  if (count === 0) return null;
  return (
    <section
      ref={rootRef}
      {...sectionProps}
      className={`experiment-observation ${className}`.trim()}
      aria-label={label}
      data-observation-count={count}
      data-observation-expanded={expanded ? "true" : undefined}
      data-observation-overflow={overflowing ? "true" : undefined}
    >
      <div className="experiment-observation-groups">
        {groups.filter((group) => group.items.length > 0).map((group) => {
          const heading = group.title !== undefined || group.scenario !== undefined;
          const hidden = group.headingHidden === true;
          return (
            <div key={group.key} className="experiment-observation-group" data-observation-group={group.key} data-observation-heading={heading ? (hidden ? "hidden" : "visible") : "none"}>
              {heading && (
                <h4 className={hidden ? "sr-only" : "experiment-observation-heading"}>
                  {group.scenario && <span className="workbench-output-scenario-swatch" style={{ backgroundColor: group.scenario.colorHex }} aria-hidden="true" />}
                  <span className="experiment-observation-heading-text">
                    {group.title !== undefined && <span className="experiment-observation-title">{group.title}</span>}
                    {(() => {
                      // The Scenario name is not repeated when the pane title already carries
                      // it; the binding mode is shown regardless, so a following pane never
                      // reads as fixed.
                      const scenarioLabel = group.scenario !== undefined && !(group.title ?? "").includes(group.scenario.label)
                        ? group.scenario.label : undefined;
                      const following = group.following === true && followingLabel !== undefined ? followingLabel : undefined;
                      if (scenarioLabel === undefined && following === undefined) return null;
                      return (
                        <span className="experiment-observation-scenario">
                          {following !== undefined && <span className="experiment-observation-following" data-observation-following>{following}</span>}
                          {scenarioLabel}
                        </span>
                      );
                    })()}
                  </span>
                </h4>
              )}
              <ExperimentOutputGridV3 variant="article" className="workbench-observation-grid" items={group.items} />
            </div>
          );
        })}
      </div>
      {(overflowing || expanded) && (
        // A bar at the strip's bottom edge, never over a tile: the groups
        // reserve its height, so the last row scrolls fully into view.
        <div className="experiment-observation-bar">
          <button
            type="button"
            className="experiment-observation-more"
            aria-expanded={expanded}
            onClick={() => setExpanded((current) => !current)}
            data-observation-more
          >
            {moreLabel(count)}
            <ChevronRight className="h-3 w-3" aria-hidden="true" />
          </button>
        </div>
      )}
    </section>
  );
}

/** Shared low-emphasis path from a live output/control pane to its item catalog. */
export function ExperimentPaneAddItemButtonV3({
  label,
  layout = "row",
  onClick,
  prominent = false,
}: Readonly<{
  label: string;
  layout?: "row" | "output-tile";
  onClick: () => void;
  prominent?: boolean;
}>) {
  return (
    <div
      className={
        layout === "output-tile"
          ? "workbench-pane-add-item-shell min-w-0"
          : "workbench-pane-add-item-shell shrink-0 px-2 pb-2"
      }
      data-prominent={prominent ? "true" : "false"}
    >
      <button
        type="button"
        className={`workbench-pane-add-item inline-flex w-full items-center justify-start gap-1.5 rounded-md text-left text-[11px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wb-accent ${
          layout === "output-tile"
            ? "min-h-12 px-2 py-1.5"
            : "min-h-9 px-3"
        }`}
        onClick={onClick}
      >
        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        {label}
      </button>
    </div>
  );
}

const EXPERIMENT_CLINICAL_PERCENT_OUTPUT_PREFIXES_V3 = Object.freeze([
  "hemodynamics.ejection-fraction.",
  "hemodynamics.valve-regurgitant-fraction.",
  "oxygen.saturation.",
] as const);

const EXPERIMENT_OUTPUT_DECIMALS_BY_UNIT_V3: Readonly<Record<string, number>> = Object.freeze({
  mmHg: 1, "mmHg/s": 0, bpm: 0, mL: 0, "mL/m²": 0,
  "L/min": 2, "mL/s": 1, "m/s": 2, "cm²": 2,
  ms: 0, s: 3, "1": 2, mJ: 0,
  "mL O2/beat/100g": 3, "mL O2/min/100g": 2,
});

/** Clinical display units shared by live values and the item catalog. */
export function resolveExperimentOutputDisplayUnitV3(outputId: string | undefined, unit: string): string {
  if (unit === "1") {
    return EXPERIMENT_CLINICAL_PERCENT_OUTPUT_PREFIXES_V3.some(prefix => outputId?.startsWith(prefix)) || outputId === "oxygen.extraction-ratio.required" ? "%" : "";
  }
  return unit === "s" && outputId?.startsWith("hemodynamics.duration.") ? "ms" : unit;
}

export function resolveExperimentOutputDisplayV3(
  item: ExperimentOutputPresentationItemV3,
): Readonly<{ value: string; unit: string }> {
  if (item.displayValue !== undefined) {
    return Object.freeze({ value: item.displayValue, unit: item.unit });
  }
  const displayUnit = resolveExperimentOutputDisplayUnitV3(item.outputId, item.unit);
  const clinicalPercent = item.unit === "1" && displayUnit === "%";
  const clinicalMilliseconds = item.unit === "s" && displayUnit === "ms";
  const value =
    item.value === null
      ? "—"
      : formatExperimentOutputValueV3(
          item.value * (clinicalPercent ? 100 : clinicalMilliseconds ? 1000 : 1),
          item.significantDigits,
          clinicalPercent ? item.outputId?.startsWith("oxygen.") ? 1 : 0
            : EXPERIMENT_OUTPUT_DECIMALS_BY_UNIT_V3[displayUnit || item.unit],
        );
  return Object.freeze({
    value,
    unit: displayUnit,
  });
}

export function ExperimentNumericControlV3({
  contextColorHex,
  contextLabel,
  control,
  description,
  descriptionAriaLabel,
  disabled,
  error = null,
  label,
  mixed,
  onCommit,
  pending,
  presentation,
  value,
}: Readonly<{
  /** Scenario colour beside the context label, matching graph traces. */
  contextColorHex?: string;
  contextLabel?: string;
  control: ControlDefinitionV2;
  description?: string;
  descriptionAriaLabel?: string;
  disabled: boolean;
  error?: string | null;
  label: string;
  mixed: boolean;
  onCommit: (value: number) => Promise<boolean>;
  pending: boolean;
  presentation: ExperimentControlPresentationV2;
  value: number;
}>) {
  const { t } = useTranslation();
  const precision = controlStepPrecisionV3(control.step);
  const formatValue = React.useCallback(
    (candidate: number) => candidate.toFixed(precision),
    [precision],
  );
  const [draft, setDraft] = React.useState(value);
  const [draftText, setDraftText] = React.useState(() => formatValue(value));
  React.useEffect(() => {
    setDraft(value);
    setDraftText(formatValue(value));
  }, [formatValue, value]);
  const commit = async (candidate: number) => {
    const result = await resolveControlDraftCommitV3({
      acceptedValue: value,
      candidate,
      control,
      forceCommit: mixed,
      onCommit,
    });
    setDraft(result.displayValue);
    setDraftText(formatValue(result.displayValue));
  };
  const changed = mixed || workbenchControlValueChangedV3(value, control);
  const displayUnit = workbenchControlDisplayUnitV3(control.unit);
  const valueInputCharacters = workbenchControlInputCharactersV3(
    control,
    draftText,
    precision,
  );
  const progress = workbenchControlRangeProgressV3(draft, control);
  return (
    <div
      className="workbench-control-row"
      data-control-presentation={presentation.kind}
      aria-busy={pending}
    >
      <div className="workbench-control-label">
        <span className="flex min-w-0 items-center gap-1">
          {description ? (
            <WorkbenchItemDescriptionPopoverV3
              ariaLabel={descriptionAriaLabel ?? label}
              description={description}
            ><span className="block truncate">{label}</span></WorkbenchItemDescriptionPopoverV3>
          ) : <span className="min-w-0 truncate" title={label}>{label}</span>}
        </span>
        {contextLabel !== undefined && (
          <span className="workbench-control-context flex min-w-0 items-center gap-1">
            {contextColorHex !== undefined && (
              <span className="workbench-output-scenario-swatch" style={{ backgroundColor: contextColorHex }} aria-hidden="true" />
            )}
            <span className="truncate">{contextLabel}</span>
          </span>
        )}
      </div>

      <div className="workbench-control-widget">
        {presentation.kind === "buttons" ? (
          <div
            className="workbench-control-segments"
            role="group"
            aria-label={label}
          >
            {presentation.options.map((option) => {
              const active = !mixed && option.value === value;
              const optionIssue = studioNumericControlValueIssueV2(
                option.value,
                control,
              );
              return (
                <button
                  key={`${option.label}:${option.value}`}
                  type="button"
                  aria-pressed={active}
                  data-active={active ? "true" : "false"}
                  disabled={disabled || optionIssue !== undefined}
                  title={
                    optionIssue ??
                    `${option.value.toFixed(precision)} ${displayUnit}`
                  }
                  className="workbench-control-segment"
                  onClick={() => void commit(option.value)}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        ) : (
          <input
            className="workbench-control-range"
            style={
              {
                "--workbench-control-progress": `${progress}%`,
              } as React.CSSProperties
            }
            type="range"
            min={control.minimum}
            max={control.maximum}
            step={control.step}
            value={draft}
            disabled={disabled}
            aria-label={label}
            title={`${control.minimum}–${control.maximum} ${displayUnit}`}
            onChange={(event) => {
              const nextValue = Number(event.currentTarget.value);
              setDraft(nextValue);
              setDraftText(formatValue(nextValue));
            }}
            onPointerUp={(event) =>
              void commit(Number(event.currentTarget.value))
            }
            onKeyUp={(event) => {
              if (
                [
                  "ArrowDown",
                  "ArrowLeft",
                  "ArrowRight",
                  "ArrowUp",
                  "End",
                  "Home",
                  "PageDown",
                  "PageUp",
                ].includes(event.key)
              ) {
                void commit(Number(event.currentTarget.value));
              }
            }}
          />
        )}
      </div>

      <div className="workbench-control-value">
        <span className="workbench-control-pending-slot" aria-hidden="true">
          {pending && <span className="workbench-control-pending-dot" />}
        </span>
        {pending && (
          <span className="sr-only" role="status">
            {t("workbench.live.applying")}
          </span>
        )}
        {mixed ? (
          <span className="workbench-control-mixed">
            {t("workbench.live.mixedValue")}
          </span>
        ) : presentation.kind === "buttons" ? (
          <output className="workbench-control-output">
            <span>{formatValue(value)}</span>
            <span className="workbench-control-unit">{displayUnit}</span>
          </output>
        ) : (
          <label className="workbench-control-number-group">
            <span className="sr-only">
              {t("workbench.live.exactControlValue", { label })}
            </span>
            <input
              type="text"
              inputMode="decimal"
              autoComplete="off"
              spellCheck={false}
              value={draftText}
              disabled={disabled}
              style={{ width: `${valueInputCharacters}ch` }}
              className="workbench-control-number"
              aria-label={`${t("workbench.live.exactControlValue", { label })} ${displayUnit}`}
              onChange={(event) => {
                const nextText = event.currentTarget.value;
                setDraftText(nextText);
                const parsed = Number(nextText);
                if (nextText.length > 0 && Number.isFinite(parsed)) {
                  setDraft(parsed);
                }
              }}
              onBlur={() => {
                const parsed = Number(draftText);
                if (!Number.isFinite(parsed)) {
                  setDraft(value);
                  setDraftText(formatValue(value));
                  return;
                }
                void commit(parsed);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.currentTarget.blur();
                if (event.key === "Escape") {
                  setDraft(value);
                  setDraftText(formatValue(value));
                  event.currentTarget.blur();
                }
              }}
            />
            <span className="workbench-control-unit">{displayUnit}</span>
          </label>
        )}
        <button
          type="button"
          className="workbench-control-reset"
          aria-label={`${t("workbench.live.resetControl")}: ${label}`}
          title={t("workbench.live.resetControl")}
          disabled={disabled || !changed}
          onClick={() => {
            setDraft(control.defaultValue);
            setDraftText(formatValue(control.defaultValue));
            void commit(control.defaultValue);
          }}
        >
          <Undo2 className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
      {error !== null && (
        <p
          className="workbench-control-error text-[11px] text-wb-danger"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}

export type ControlDraftCommitResultV3 = Readonly<{
  accepted: boolean;
  displayValue: number;
}>;

export async function resolveControlDraftCommitV3({
  acceptedValue,
  candidate,
  control,
  forceCommit = false,
  onCommit,
}: Readonly<{
  acceptedValue: number;
  candidate: number;
  control: ControlDefinitionV2;
  forceCommit?: boolean;
  onCommit: (value: number) => Promise<boolean>;
}>): Promise<ControlDraftCommitResultV3> {
  const normalized = normalizeControlValueV3(candidate, control);
  if (!forceCommit && normalized === acceptedValue) {
    return Object.freeze({ accepted: true, displayValue: acceptedValue });
  }
  const accepted = await onCommit(normalized);
  return Object.freeze({
    accepted,
    displayValue: accepted ? normalized : acceptedValue,
  });
}

export function formatExperimentOutputValueV3(
  value: number,
  significantDigits?: number,
  decimalPlaces?: number,
): string {
  if (!Number.isFinite(value)) return "—";
  if (decimalPlaces !== undefined) {
    const rounded = value.toFixed(decimalPlaces);
    return Number(rounded) === 0 ? (0).toFixed(decimalPlaces) : rounded;
  }
  if (significantDigits !== undefined) {
    const absolute = Math.abs(value);
    const decimalPlaces =
      absolute === 0
        ? significantDigits - 1
        : significantDigits - 1 - Math.floor(Math.log10(absolute));
    if (decimalPlaces > 12) {
      return value.toExponential(significantDigits - 1);
    }
    if (decimalPlaces >= 0) return value.toFixed(decimalPlaces);
    const scale = 10 ** -decimalPlaces;
    return (Math.round(value / scale) * scale).toFixed(0);
  }
  const absolute = Math.abs(value);
  if (absolute >= 100) return value.toFixed(1);
  if (absolute >= 10) return value.toFixed(2);
  return value.toFixed(3);
}

export function formatExperimentPressureSummaryV3(
  values: Readonly<{
    maximum: number | null;
    minimum: number | null;
  }>,
): string {
  const format = (value: number | null) =>
    value === null
      ? "—"
      : formatExperimentOutputValueV3(value, undefined, 1);
  return `${format(values.maximum)}/${format(values.minimum)}`;
}

function workbenchControlDisplayUnitV3(unit: string): string {
  return unit === "1" ? "×" : unit;
}

function workbenchControlInputCharactersV3(
  control: ControlDefinitionV2,
  draftText: string,
  precision: number,
): number {
  const longest = Math.max(
    draftText.length,
    control.minimum.toFixed(precision).length,
    control.maximum.toFixed(precision).length,
    control.defaultValue.toFixed(precision).length,
  );
  return Math.max(3, Math.min(10, longest));
}

function workbenchControlRangeProgressV3(
  value: number,
  control: ControlDefinitionV2,
): number {
  const span = control.maximum - control.minimum;
  if (!(span > 0)) return 0;
  return Math.max(0, Math.min(100, ((value - control.minimum) / span) * 100));
}

function workbenchControlValueChangedV3(
  value: number,
  control: ControlDefinitionV2,
): boolean {
  return (
    Math.abs(value - control.defaultValue) >
    Math.max(Math.abs(control.step) * 1e-6, 1e-12)
  );
}

function normalizeControlValueV3(
  value: number,
  control: ControlDefinitionV2,
): number {
  const clamped = Math.min(control.maximum, Math.max(control.minimum, value));
  const steps = Math.round((clamped - control.minimum) / control.step);
  const snapped = control.minimum + steps * control.step;
  return Number(
    snapped.toFixed(Math.min(12, controlStepPrecisionV3(control.step) + 2)),
  );
}

function controlStepPrecisionV3(step: number): number {
  const text = step.toString();
  if (text.includes("e-")) return Math.min(6, Number(text.split("e-")[1]));
  return Math.min(6, text.split(".")[1]?.length ?? 0);
}

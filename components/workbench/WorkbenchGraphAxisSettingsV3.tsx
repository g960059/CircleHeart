import React from "react";
import { useTranslation } from "react-i18next";
import type { ExperimentGraphAxisRangeV2, ExperimentGraphAxisRangesV2, ExperimentSurfaceGraphPaneV2 } from "@/studio/contracts/v2/content";
import type { GraphDefinitionV2 } from "@/studio/contracts/v2/model";

/** Read once on opening settings; automatic viewport bounds are never persisted. */
export function readWorkbenchGraphAxisRangesV3(root: Element | null): ExperimentGraphAxisRangesV2 {
  const range = (minimum: string, maximum: string) => {
    const element = root?.querySelector(`[${minimum}][${maximum}]`);
    const low = element?.getAttribute(minimum), high = element?.getAttribute(maximum);
    if (low == null || high == null) return undefined;
    const value = { minimum: Number(low), maximum: Number(high) };
    return validRangeV3(String(value.minimum), String(value.maximum)) ? value : undefined;
  };
  return {
    x: range("data-x-minimum", "data-x-maximum")
      ?? range("data-volume-minimum-ml", "data-volume-maximum-ml")
      ?? range("data-pressure-minimum-mmhg", "data-pressure-maximum-mmhg"),
    y: range("data-flow-minimum-l-per-min", "data-flow-maximum-l-per-min")
      ?? range("data-y-minimum", "data-y-maximum")
      ?? range("data-pressure-minimum-mmhg", "data-pressure-maximum-mmhg"),
  };
}

export function WorkbenchGraphAxisSettingsV3({ graph, pane, waveformUnit, automaticRanges, onChange, onValidityChange }: Readonly<{
  graph: GraphDefinitionV2;
  pane: ExperimentSurfaceGraphPaneV2;
  waveformUnit?: string;
  automaticRanges?: ExperimentGraphAxisRangesV2;
  onChange: (pane: ExperimentSurfaceGraphPaneV2) => void;
  onValidityChange?: (valid: boolean) => void;
}>) {
  const { i18n } = useTranslation();
  const ja = (i18n.resolvedLanguage ?? i18n.language ?? "en").startsWith("ja");
  const [validity, setValidity] = React.useState({ x: true, y: true });
  React.useEffect(() => { onValidityChange?.(validity.x && validity.y); }, [validity, onValidityChange]);
  React.useEffect(() => () => onValidityChange?.(true), [onValidityChange]);
  const setXValid = React.useCallback((x: boolean) => setValidity(previous => previous.x === x ? previous : { ...previous, x }), []);
  const setYValid = React.useCallback((y: boolean) => setValidity(previous => previous.y === y ? previous : { ...previous, y }), []);
  if (graph.renderer === "cycle-waveform") return null;
  const update = (axis: "x" | "y", range: ExperimentGraphAxisRangeV2 | undefined) => {
    const axisRanges = { ...pane.axisRanges };
    if (range === undefined) delete axisRanges[axis]; else axisRanges[axis] = range;
    const next = { ...pane };
    if (Object.keys(axisRanges).length === 0) delete next.axisRanges; else next.axisRanges = axisRanges;
    onChange(next);
  };
  const structural = graph.renderer === "structural-return";
  return <fieldset className="space-y-2.5" data-testid="graph-axis-settings">
    <legend className="mb-2 text-xs font-medium text-wb-text">{ja ? "表示範囲" : "Axis ranges"}</legend>
    {graph.renderer !== "sweep" && <AxisRangeV3 ja={ja} axis="x" range={pane.axisRanges?.x}
      label={graph.renderer === "xy" ? (ja ? "横軸" : "X axis") : structural ? (ja ? "横軸 · 圧" : "X · pressure") : (ja ? "横軸 · 容積" : "X · volume")}
      unit={graph.renderer === "xy" ? undefined : structural ? "mmHg" : "mL"} automatic={automaticRanges?.x}
      initial={structural ? { minimum: -3, maximum: 18 } : { minimum: 0, maximum: 200 }}
      onValidityChange={setXValid} onChange={range => update("x", range)} />}
    <AxisRangeV3 ja={ja} axis="y" range={pane.axisRanges?.y}
      label={structural ? (ja ? "縦軸 · 流量" : "Y · flow")
        : graph.renderer === "pressure-volume" ? (ja ? "縦軸 · 圧" : "Y · pressure") : (ja ? "縦軸" : "Y axis")}
      unit={structural ? "L/min" : graph.renderer === "pressure-volume" ? "mmHg" : waveformUnit === "1" ? undefined : waveformUnit}
      automatic={automaticRanges?.y} initial={{ minimum: 0, maximum: structural ? 10 : 150 }}
      onValidityChange={setYValid} onChange={range => update("y", range)} />
  </fieldset>;
}

function validRangeV3(minimum: string, maximum: string): boolean {
  return minimum.trim() !== "" && maximum.trim() !== "" && Number.isFinite(Number(minimum))
    && Number.isFinite(Number(maximum)) && Number(maximum) > Number(minimum)
    && Number.isFinite(Number(maximum) - Number(minimum));
}

function AxisRangeV3({ ja, axis, label, unit, range, automatic, initial, onChange, onValidityChange }: Readonly<{
  ja: boolean; axis: "x" | "y"; label: string; unit?: string; range?: ExperimentGraphAxisRangeV2;
  automatic?: ExperimentGraphAxisRangeV2; initial: ExperimentGraphAxisRangeV2;
  onChange: (range: ExperimentGraphAxisRangeV2 | undefined) => void; onValidityChange: (valid: boolean) => void;
}>) {
  const id = React.useId();
  const [draft, setDraft] = React.useState(() => {
    const seed = range ?? automatic ?? initial;
    return { minimum: String(seed.minimum), maximum: String(seed.maximum) };
  });
  const manual = range !== undefined;
  const valid = !manual || validRangeV3(draft.minimum, draft.maximum);
  React.useEffect(() => { onValidityChange(valid); }, [valid, onValidityChange]);
  const commitDraft = (next: typeof draft) => {
    setDraft(next);
    if (validRangeV3(next.minimum, next.maximum)) onChange({ minimum: Number(next.minimum), maximum: Number(next.maximum) });
  };
  const enableFixed = () => {
    const next = validRangeV3(draft.minimum, draft.maximum)
      ? { minimum: Number(draft.minimum), maximum: Number(draft.maximum) } : automatic ?? initial;
    setDraft({ minimum: String(next.minimum), maximum: String(next.maximum) });
    onChange(next);
  };
  return <div className="rounded-xl bg-wb-soft/55 px-3 py-2.5" data-axis-range={axis}>
    <div className="flex min-h-9 items-center justify-between gap-3">
      <span id={id} className="text-xs font-medium text-wb-text">{label}<span className="ml-1.5 text-[10px] font-normal text-wb-subtle">{unit}</span></span>
      <div className="flex shrink-0 rounded-lg bg-wb-panel p-0.5" role="radiogroup" aria-labelledby={id}>
        {[false, true].map(fixed => <label key={String(fixed)} className={`relative flex min-h-8 min-w-12 cursor-pointer items-center justify-center rounded-md px-2 text-[11px] transition-colors ${manual === fixed ? "bg-wb-selected text-wb-text" : "text-wb-muted hover:text-wb-text"}`}>
          <input type="radio" className="peer sr-only" name={`${id}-mode`} checked={manual === fixed}
            onChange={() => fixed ? enableFixed() : onChange(undefined)} />
          <span className="pointer-events-none absolute inset-0 rounded-md peer-focus-visible:ring-2 peer-focus-visible:ring-wb-accent" aria-hidden="true" />
          {fixed ? (ja ? "固定" : "Fixed") : (ja ? "自動" : "Auto")}
        </label>)}
      </div>
    </div>
    {manual ? <>
      <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        {(["minimum", "maximum"] as const).map((key, index) => <React.Fragment key={key}>
          {index === 1 && <span aria-hidden="true" className="mt-3 text-wb-subtle">–</span>}
          <label className="min-w-0 text-[10px] text-wb-subtle">
            {key === "minimum" ? (ja ? "最小" : "Min") : (ja ? "最大" : "Max")}
            <input type="text" inputMode="decimal" value={draft[key]} aria-invalid={!valid}
              aria-describedby={!valid ? `${id}-error` : undefined}
              aria-label={`${label} ${key === "minimum" ? (ja ? "最小値" : "minimum") : (ja ? "最大値" : "maximum")}`}
              onChange={event => commitDraft({ ...draft, [key]: event.target.value })}
              onKeyDown={event => {
                if (event.key !== "Escape") return;
                event.stopPropagation();
                const previous = range ?? automatic ?? initial;
                setDraft({ minimum: String(previous.minimum), maximum: String(previous.maximum) });
              }}
              className="mt-1 block min-h-10 w-full rounded-lg bg-wb-panel px-3 font-mono text-xs tabular-nums text-wb-text ring-1 ring-inset ring-wb-line transition-shadow focus:outline-none focus:ring-2 focus:ring-wb-accent aria-invalid:ring-wb-danger" />
          </label>
        </React.Fragment>)}
      </div>
      {!valid && <p id={`${id}-error`} role="alert" className="mt-2 text-[10px] text-wb-danger">{ja ? "数値を入力し、最小値を最大値より小さくしてください。" : "Enter numbers with the minimum below the maximum."}</p>}
    </> : null}
  </div>;
}

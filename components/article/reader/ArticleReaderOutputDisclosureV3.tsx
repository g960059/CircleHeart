import React from "react";
import { ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ExperimentObservationGroupV3 } from "@/components/workbench/ExperimentPanePresentationV3";
import type { ArticleReaderEmbedLayoutV3 } from "./ArticleReaderEmbedV3";

export type ArticleReaderOutputViewV3 = "selected" | "all";

/** Explicit reader choices win over available space. Full-width has its own output area. */
export function articleReaderShowAllOutputsV3(
  layout: ArticleReaderEmbedLayoutV3,
  view: ArticleReaderOutputViewV3 | null,
  hasReaderSelection: boolean,
  fits: boolean,
): boolean {
  if (view !== null) return view === "all";
  if (hasReaderSelection) return false;
  return layout === "workbench" || (layout === "peek" && fits);
}

/**
 * One live measurement area. Reading all values extends that area; changing
 * the observation temporarily replaces it with labels and checkboxes. The
 * controllers remain mounted in both cases, including while selecting.
 */
export function ArticleReaderOutputDisclosureV3({
  groups, layout, selectedKeys, primaryKeys, hasReaderSelection, view,
  onViewChange, onSelectionChange, renderOutputs, fullControlsHeight, onSpaceForAllControls,
}: Readonly<{
  /** Static labels/bindings only. Live values belong to renderOutputs. */
  groups: readonly ExperimentObservationGroupV3[];
  layout: ArticleReaderEmbedLayoutV3;
  selectedKeys: readonly string[];
  primaryKeys: readonly string[];
  hasReaderSelection: boolean;
  view: ArticleReaderOutputViewV3 | null;
  onViewChange: (view: ArticleReaderOutputViewV3 | null) => void;
  onSelectionChange: (keys: readonly string[] | null) => void;
  renderOutputs: (keys: readonly string[]) => React.ReactNode;
  fullControlsHeight: number;
  onSpaceForAllControls: (fits: boolean) => void;
}>) {
  const { t } = useTranslation();
  const root = React.useRef<HTMLDivElement>(null);
  const ruler = React.useRef<HTMLDivElement>(null);
  const chooseButton = React.useRef<HTMLButtonElement>(null);
  const expandButton = React.useRef<HTMLButtonElement>(null);
  const editor = React.useRef<HTMLDivElement>(null);
  const restoreFocus = React.useRef(false);
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState<readonly string[]>([]);
  const [space, setSpace] = React.useState({ maxHeight: 0, fits: false });
  const id = React.useId();
  const keys = groups.flatMap(group => group.items.map(item => item.itemId));

  React.useLayoutEffect(() => {
    if (layout === "workbench" || typeof ResizeObserver === "undefined") return;
    const container = root.current?.closest<HTMLElement>(".article-reader-embed");
    const stage = container?.querySelector<HTMLElement>(".article-reader-stage");
    const controls = container?.querySelector<HTMLElement>(".article-reader-controls-content");
    const measure = ruler.current;
    if (!container) return;
    // A static ruler uses the same tile widths/labels without subscribing to
    // simulation frames. Numerical updates never reflow the chosen set.
    const update = () => {
      const rect = container.getBoundingClientRect();
      const beside = layout === "sheet" && rect.width >= 640 && window.innerHeight <= 520;
      const remaining = Math.max(0, rect.height - (beside ? 0 : stage?.getBoundingClientRect().height ?? 0));
      const reserve = controls ? Math.min(controls.scrollHeight + 12, Math.max(144, remaining * 0.48)) : 0;
      const maxHeight = Math.floor(Math.max(64, remaining - reserve - 36));
      const fits = layout === "peek" && rect.width >= 640 && measure !== null && measure.getBoundingClientRect().height <= maxHeight;
      onSpaceForAllControls(layout === "peek" && rect.width >= 640 && measure !== null
        && measure.getBoundingClientRect().height + fullControlsHeight + 36 <= remaining);
      setSpace(previous => previous.maxHeight === maxHeight && previous.fits === fits ? previous : { maxHeight, fits });
    };
    update();
    const observer = new ResizeObserver(update);
    [container, measure, stage, controls].forEach(element => { if (element) observer.observe(element); });
    window.addEventListener("resize", update);
    return () => { observer.disconnect(); window.removeEventListener("resize", update); };
  }, [layout, fullControlsHeight, onSpaceForAllControls]);

  React.useLayoutEffect(() => {
    if (editing) editor.current?.querySelector<HTMLInputElement>('input[type="checkbox"]')?.focus();
    else if (restoreFocus.current) { (chooseButton.current ?? expandButton.current)?.focus(); restoreFocus.current = false; }
  }, [editing]);

  if (keys.length === 0) return null;
  const all = articleReaderShowAllOutputsV3(layout, view, hasReaderSelection, space.fits);
  const canExpand = selectedKeys.length < keys.length;
  const canChoose = keys.length > primaryKeys.length || hasReaderSelection;
  // Reading is the first task. Offer configuration only after the reader
  // opens all values (or already displays every value).
  const showChoose = canChoose && (all || !canExpand);
  const closeEditor = (apply: boolean) => {
    if (apply) { onSelectionChange(draft); onViewChange("selected"); }
    restoreFocus.current = true;
    setEditing(false);
  };
  return (
    <div ref={root} className="article-reader-output-disclosure"
      data-reader-output-view={all ? "all" : "selected"}
      data-reader-output-editing={editing ? "true" : "false"}
      style={space.maxHeight > 0 ? { "--reader-output-budget": `${space.maxHeight}px` } as React.CSSProperties : undefined}
      onKeyDown={event => { if (editing && event.key === "Escape") { event.preventDefault(); event.stopPropagation(); closeEditor(false); } }}>
      {(editing || canExpand || canChoose) && (
        <div className="article-reader-output-toolbar">
          {editing ? <>
            {hasReaderSelection ? <button type="button" className="article-reader-deck-action article-reader-output-editor-label" data-reader-observation-reset
              onClick={() => { onSelectionChange(null); onViewChange(null); closeEditor(false); }}>{t("articleReader.resetObservation")}</button>
              : <span className="article-reader-output-editor-label">{t("articleReader.adjustOutputs")}</span>}
            <button type="button" className="article-reader-deck-action" onClick={() => closeEditor(false)}>{t("articleReader.cancelOutputSelection")}</button>
            <button type="button" className="article-reader-deck-action" onClick={() => closeEditor(true)}>{t("articleReader.finishOutputSelection")}</button>
          </> : <>
            {canExpand && <button ref={expandButton} type="button" className="article-reader-deck-action" aria-expanded={all} aria-controls={id}
              data-reader-output-expand onClick={() => onViewChange(all ? "selected" : "all")}>
              {t(all ? (hasReaderSelection ? "articleReader.selectedOutputs" : "articleReader.primaryOutputs") : "articleReader.allOutputs", { count: keys.length })}
              <ChevronDown className={`h-3.5 w-3.5 ${all ? "rotate-180" : ""}`} aria-hidden="true" />
            </button>}
            {showChoose && <button ref={chooseButton} type="button" className="article-reader-deck-action" aria-label={t("articleReader.chooseOutputs")}
              title={t("articleReader.chooseOutputs")} data-reader-output-choose onClick={() => { setDraft([...selectedKeys]); setEditing(true); }}>
              {t("articleReader.adjustOutputs")}
            </button>}
          </>}
        </div>
      )}
      <div id={id} className="article-reader-output-body">
        {editing ? <div ref={editor} className="article-reader-output-editor" role="group" aria-label={t("articleReader.chooseOutputs")}>
          {groups.map(group => <fieldset key={group.key}>
            {(group.title || group.scenario) && <legend>{[group.title, group.scenario?.label].filter((label, index, labels) => label && labels.indexOf(label) === index).join(" · ")}</legend>}
            <div className="article-reader-output-options">{group.items.map(item => <label key={item.itemId}>
              <input type="checkbox" checked={draft.includes(item.itemId)} onChange={() => setDraft(previous => previous.includes(item.itemId)
                ? previous.filter(key => key !== item.itemId) : [...previous, item.itemId])} />
              <span>{item.label}</span>
            </label>)}</div>
          </fieldset>)}
        </div> : renderOutputs(all ? keys : selectedKeys)}
      </div>
      {layout === "peek" && <div ref={ruler} className="article-reader-output-ruler" aria-hidden="true">
        <div className="experiment-observation-groups">{groups.map(group => <div key={group.key} className="experiment-observation-group">
          {(group.title || group.scenario) && !group.headingHidden && <div className="experiment-observation-heading"><span>{group.title} {group.scenario?.label !== group.title ? group.scenario?.label : ""}</span></div>}
          <div className="workbench-observation-grid">{group.items.map(item => <div key={item.itemId} className="workbench-output-item">
            <span className="workbench-output-label">{item.label}</span>
            <p className="workbench-output-value">000.0<span className="workbench-output-unit">{item.unit}</span></p>
          </div>)}</div>
        </div>)}</div>
      </div>}
    </div>
  );
}

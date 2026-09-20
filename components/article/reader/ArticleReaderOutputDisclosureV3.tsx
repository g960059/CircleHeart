import React from "react";
import { ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ExperimentObservationGroupV3 } from "@/components/workbench/ExperimentPanePresentationV3";
import type { ArticleReaderEmbedLayoutV3 } from "./ArticleReaderEmbedV3";

export type ArticleReaderOutputViewV3 = "primary" | "all";

/** Explicit reader choices win over available space. Full-width has its own output area. */
export function articleReaderShowAllOutputsV3(
  layout: ArticleReaderEmbedLayoutV3,
  view: ArticleReaderOutputViewV3 | null,
  fits: boolean,
): boolean {
  if (view !== null) return view === "all";
  return layout === "workbench" || (layout === "peek" && fits);
}

/**
 * One live measurement area. The author owns both the primary and sealed
 * sets. Readers may reveal all sealed values without changing either set;
 * unrestricted configuration belongs in the Workbench.
 */
export function ArticleReaderOutputDisclosureV3({
  groups, layout, primaryKeys, view,
  onViewChange, renderOutputs, fullControlsHeight, onSpaceForAllControls,
}: Readonly<{
  /** Static labels/bindings only. Live values belong to renderOutputs. */
  groups: readonly ExperimentObservationGroupV3[];
  layout: ArticleReaderEmbedLayoutV3;
  primaryKeys: readonly string[];
  view: ArticleReaderOutputViewV3 | null;
  onViewChange: (view: ArticleReaderOutputViewV3 | null) => void;
  renderOutputs: (keys: readonly string[]) => React.ReactNode;
  fullControlsHeight: number;
  onSpaceForAllControls: (fits: boolean) => void;
}>) {
  const { t } = useTranslation();
  const root = React.useRef<HTMLDivElement>(null);
  const ruler = React.useRef<HTMLDivElement>(null);
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

  if (keys.length === 0) return null;
  const all = articleReaderShowAllOutputsV3(layout, view, space.fits);
  const canExpand = primaryKeys.length < keys.length;
  return (
    <div ref={root} className="article-reader-output-disclosure"
      data-reader-output-view={all ? "all" : "primary"}
      style={space.maxHeight > 0 ? { "--reader-output-budget": `${space.maxHeight}px` } as React.CSSProperties : undefined}>
      {canExpand && <div className="article-reader-output-toolbar">
        <button type="button" className="article-reader-deck-action" aria-expanded={all} aria-controls={id}
          data-reader-output-expand onClick={() => onViewChange(all ? "primary" : "all")}>
          {t(all ? "articleReader.foldOutputs" : "articleReader.allOutputs", { count: keys.length })}
          <ChevronDown className={`h-3.5 w-3.5 ${all ? "rotate-180" : ""}`} aria-hidden="true" />
        </button>
      </div>}
      <div id={id} className="article-reader-output-body">{renderOutputs(all ? keys : primaryKeys)}</div>
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

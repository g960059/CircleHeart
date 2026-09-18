import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ExperimentOutputGridV3, type ExperimentOutputPresentationItemV3 } from "@/components/workbench/ExperimentPanePresentationV3";
import { useArticleReaderElementWidthV3 } from "./ArticleReaderEmbedV3";

export type ArticleReaderOutputSectionV3 = Readonly<{
  key: string;
  title: string;
  scenarioId: string;
  scenarioLabel: string;
  color: string;
  items: readonly ExperimentOutputPresentationItemV3[];
}>;

/** Ephemeral selection follows one placement through inline/peek/full. */
export const ArticleReaderOutputSelectionV3 = React.createContext<{ current: number } | null>(null);

/** Only align real Scenario comparisons. Unrelated valve/myocardial sections
 * retain their authored grouping instead of being padded into a fake matrix. */
export function articleReaderComparableOutputIdsV3(
  sections: readonly Readonly<{ scenarioId: string; outputIds: readonly string[] }>[],
): readonly string[] | null {
  const first = sections[0]?.outputIds;
  if (sections.length < 2 || !first || first.length * sections.length <= 8
    || new Set(sections.map(s => s.scenarioId)).size !== sections.length
    || sections.some(s => s.outputIds.length !== first.length || first.some(id => !s.outputIds.includes(id)))) return null;
  return first;
}

/** All compared sections change measurement group together. Nothing scrolls
 * out of Scenario alignment, and the graph/control remain visible. */
export function ArticleReaderOutputComparisonV3({ sections, outputIds }: Readonly<{
  sections: readonly ArticleReaderOutputSectionV3[];
  outputIds: readonly string[];
}>) {
  const { t } = useTranslation();
  const ref = React.useRef<HTMLElement>(null);
  const width = useArticleReaderElementWidthV3(ref);
  const labelWidth = width < 416 ? 68 : 88;
  const pageSize = Math.max(1, Math.min(10, outputIds.length, Math.floor((width - labelWidth - 6) / 92)));
  // Keep the selected measurement, not a page number, on viewport changes.
  const selection = React.useContext(ArticleReaderOutputSelectionV3);
  const [anchor, updateAnchor] = React.useState(selection?.current ?? 0);
  const setAnchor = (next: number) => { if (selection) selection.current = next; updateAnchor(next); };
  const start = Math.floor(Math.min(anchor, outputIds.length - 1) / pageSize) * pageSize;
  const end = Math.min(outputIds.length, start + pageSize);
  const selected = outputIds.slice(start, end);
  return (
    <section ref={ref} className="article-reader-comparison" aria-label={t("articleReader.outputs")}
      data-reader-output-comparison data-reader-comparison-start={start} data-reader-comparison-total={outputIds.length}
      style={{ "--reader-comparison-columns": selected.length } as React.CSSProperties}>
      {outputIds.length > pageSize && <div className="article-reader-comparison-toolbar">
        <span role="status">{t("articleReader.measurementRange", { start: start + 1, end, total: outputIds.length })}</span>
        <div className="article-reader-comparison-pagination">
          <button type="button" aria-label={t("articleReader.previousMeasurements")} disabled={start === 0}
            onClick={() => setAnchor(Math.max(0, start - pageSize))}><ChevronLeft aria-hidden="true" /></button>
          <button type="button" aria-label={t("articleReader.nextMeasurements")} disabled={end === outputIds.length}
            onClick={() => setAnchor(end)}><ChevronRight aria-hidden="true" /></button>
        </div>
      </div>}
      <div className="article-reader-comparison-rows">
        {sections.map(section => (
          <div key={section.key} className="article-reader-comparison-row" data-reader-comparison-section={section.key}>
            <h3 title={section.title} className="article-reader-comparison-title">
              <span className="article-reader-scenario-swatch" style={{ backgroundColor: section.color }} aria-hidden="true" />
              <span>{section.title}{section.title !== section.scenarioLabel && <small>{section.scenarioLabel}</small>}</span>
            </h3>
            <ExperimentOutputGridV3 variant="article" className="article-reader-comparison-values"
              items={selected.flatMap(id => section.items.filter(item => item.outputId === id))} />
          </div>
        ))}
      </div>
    </section>
  );
}

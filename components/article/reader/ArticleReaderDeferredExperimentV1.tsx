import React from "react";
import { useTranslation } from "react-i18next";
import { articleBriefingPresentationV3 } from "@/studio/application/authoring/StudioArticleBriefingPresentationV3";
import { ArticleReaderPendingExperimentV1 } from "./ArticleReaderPendingExperimentV1";
import type { ExperimentSnapshotV2 } from "@/studio/contracts/v2/content";
import type { StudioClientCompositionV2 } from "@/studio/composition/StudioDefaultCompositionV2";
import type { ArticleReaderExperimentV3Props } from "./ArticleReaderExperimentV3";

type Props = Omit<ArticleReaderExperimentV3Props, "snapshot" | "contract" | "contractAvailability" | "runtimeComposition"> & {
  loadSnapshot(snapshotId: string): Promise<ExperimentSnapshotV2 | null>;
};
type Prepared = {
  Component: React.ComponentType<ArticleReaderExperimentV3Props>;
  snapshot: ExperimentSnapshotV2;
  composition: StudioClientCompositionV2;
};

class ReaderCodeLoadErrorV1 extends Error {}

/** Prose never waits for Snapshot reads, model admission or graph JavaScript. */
export function ArticleReaderDeferredExperimentV1({ loadSnapshot, ...props }: Props) {
  const { t } = useTranslation();
  const root = React.useRef<HTMLDivElement>(null);
  const [near, setNear] = React.useState(false);
  const [attempt, setAttempt] = React.useState(0);
  const [prepared, setPrepared] = React.useState<Prepared | null>(null);
  const [error, setError] = React.useState<"snapshot" | "code" | null>(null);
  const { placement } = props.block;
  React.useEffect(() => {
    if (typeof IntersectionObserver === "undefined") { setNear(true); return; }
    // The document pane clips the window viewport; apply the preload margin to
    // that scrolling pane so preparation starts before the placement is visible.
    const scrollHost = root.current?.closest<HTMLElement>('[data-public-static-scroll-host="true"]') ?? null;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { setNear(true); observer.disconnect(); }
    }, { root: scrollHost, rootMargin: "400px 0px" });
    if (root.current) observer.observe(root.current);
    return () => observer.disconnect();
  }, []);
  React.useEffect(() => {
    if (!near) return;
    let current = true;
    setError(null);
    const prepare = async () => {
      // Start the independent code and data reads together, only near this placement.
      const code = Promise.all([
        import("./ArticleReaderExperimentV3"),
        import("@/studio/composition/StudioDefaultCompositionV2"),
      ]).catch(() => { throw new ReaderCodeLoadErrorV1(); });
      const [snapshot, [module, compositionModule]] = await Promise.all([
        loadSnapshot(placement.snapshotId), code,
      ]);
      if (!current) return;
      if (!snapshot) throw new Error("Unavailable snapshot");
      const composition = await compositionModule.loadStudioSnapshotClientCompositionV2(
        snapshot.content.modelId, snapshot.content.surfaceSeriesId, snapshot.surfaceReleaseId,
      );
      if (current) setPrepared({ Component: module.ArticleReaderExperimentV3, snapshot, composition });
    };
    void prepare().catch(error => { if (current) setError(error instanceof ReaderCodeLoadErrorV1 ? "code" : "snapshot"); });
    return () => { current = false; };
  }, [near, attempt, placement.snapshotId, loadSnapshot]);
  const title = placement.titleOverride?.trim() || placement.briefing.defaultTitle;
  return <div ref={root}>
    {prepared ? <prepared.Component {...props} snapshot={prepared.snapshot}
      contract={prepared.composition.modelSurface.contract} contractAvailability="ready"
      runtimeComposition={prepared.composition} /> :
      <section id={`placement-${placement.placementId}`} className="article-reader-placement min-w-0 scroll-mt-24"
        data-reader-placement-id={placement.placementId}>
        {error ? <div className="mt-3 text-sm text-wb-muted">
          <p className="reader-experiment-title mb-2">{title}</p>
          <p role="alert">{t(error === "code" ? "articleReader.unavailableReader" : "articleReader.unavailableSnapshot")}</p>
          <button className="mt-2 rounded text-wb-accent focus-visible:outline focus-visible:outline-2"
            onClick={() => error === "code" ? window.location.reload() : setAttempt(value => value + 1)}>{t(error === "code" ? "articleReader.reloadPage" : "articleReader.retryLoading")}</button>
        </div> : <ArticleReaderPendingExperimentV1 title={title} preparing={near} onShow={() => {
          setNear(true);
          const presentation = props.forceInline ? "inflow" : articleBriefingPresentationV3(placement.briefing);
          if (presentation === "inflow") props.onActivate();
          else props.onExpand(presentation);
        }} />}
        {placement.caption && <p className="article-experiment-caption">{placement.caption}</p>}
      </section>}
  </div>;
}

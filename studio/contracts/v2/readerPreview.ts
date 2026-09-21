import type { StudioJsonValueV2 } from "./json";
import type { StudioSimulationOutputValueV2 } from "./simulation";

/** Disposable display data, never an input to restore, admission or analysis. */
export type ExperimentReaderPreviewV1 = Readonly<{
  schemaId: "circleheart-experiment-reader-preview-v1";
  /** Covers the exact content and the pinned Surface release, not a runtime ID. */
  sourceSha256: string;
  previewSha256: string;
  scenarios: readonly Readonly<{
    scenarioId: string;
    acceptedRevision: number;
    acceptedTimeSec: number;
    outputs: Readonly<Record<string, StudioSimulationOutputValueV2>>;
    samples: readonly Readonly<{
      acceptedRevision: number;
      acceptedTimeSec: number;
      values: Readonly<Record<string, number | null>>;
    }>[];
    analyses: readonly Readonly<{
      analysisId: string;
      sourceAcceptedRevision: number;
      sourceAcceptedTimeSec: number;
      payload: StudioJsonValueV2;
    }>[];
  }>[];
}>;

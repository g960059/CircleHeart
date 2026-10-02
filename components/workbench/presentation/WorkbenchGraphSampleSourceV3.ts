import type { WorkbenchScalarSampleV3 } from "./WorkbenchScalarSampleV3";

/** Mounted graphs observe an already released, group-aligned visual history.
 * High-frequency samples invalidate the renderer directly, not its React UI. */
export type WorkbenchGraphSampleSourceV3 = Readonly<{
  subscribe(listener: () => void): () => void;
  getSamples(scenarioId: string): readonly WorkbenchScalarSampleV3[];
}>;

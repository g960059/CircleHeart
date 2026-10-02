import type {
  StudioSimulationAnalysisV2,
  StudioSimulationFrameV2,
} from "@/studio/contracts/v2/simulation";
import type { ScenarioCaptureV2 } from "@/studio/contracts/v2/content";
import type { ModelSurfaceReleaseManifestV1 } from "@/studio/contracts/v2/modelSurface";
import type { StudioJsonValueV2 } from "@/studio/contracts/v2/json";

export type AnalysisExecutionRequestV1 = Readonly<{
  runtimeSessionId: string;
  scenarioId: string;
  analysisId: string;
  expectedInputEpoch: number;
  expectedAcceptedRevision: number;
  expectedAcceptedTimeSec: number;
  analysisPartition?: string;
  sharePreparation?: boolean;
  preparedAnalysis?: StudioJsonValueV2;
  onProgress?: (analysis: StudioSimulationAnalysisV2, preparation?: StudioJsonValueV2) => void;
}>;

/**
 * Compatibility capability retained for already-admitted exact artifacts.
 * New analysis executors must not assume it is the permanent analysis API.
 */
export type LegacyExactAnalysisExecutionPortV1 = Readonly<{
  request(
    input: AnalysisExecutionRequestV1,
  ): Promise<StudioSimulationAnalysisV2>;
}>;

/** Read-only accepted boundary made available to one analysis executor. */
export type AnalysisExecutionSourceV1 = Readonly<{
  acceptedFrame: StudioSimulationFrameV2;
  legacyExact: LegacyExactAnalysisExecutionPortV1 | null;
  surfaceRelease?: ModelSurfaceReleaseManifestV1;
  /** Numerical exports of the admitted artifact that owns this capture.
   * Analysis must never restore it using the client's current engine source. */
  exactNumericalExports?: Readonly<Record<string, unknown>>;
  /** Detached exact-owned capture, created lazily on the accepted boundary.
   * Capturing never advances, resets, or lends the live numerical session. */
  capture?: () => Promise<Readonly<{ artifactRevisionId: string; scenario: ScenarioCaptureV2 }>>;
}>;

/** Analysis-owned execution boundary selected independently of an exact model. */
export type AnalysisExecutorV1 = Readonly<{
  execute(input: Readonly<{
    source: AnalysisExecutionSourceV1;
    request: AnalysisExecutionRequestV1;
  }>): Promise<StudioSimulationAnalysisV2>;
}>;

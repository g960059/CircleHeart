import {
  DynamicExactModelRuntimeLoaderV2,
} from "@/studio/infrastructure/model/DynamicExactModelRuntimeLoaderV2";
import { resolveRegisteredPresentationAnalysisMethodsV1 } from "@/analysis/registry/RegisteredAnalysisMethodsV1";
import { REGISTERED_ANALYSIS_EXECUTOR_V1 } from "@/analysis/runtime/RegisteredAnalysisExecutorV1";
import {
  type StudioSimulationWorkerResponseV2,
} from "@/studio/workers/StudioSimulationWorkerProtocolV2";
import {
  StudioSimulationWorkerRuntimeV2,
} from "@/studio/workers/StudioSimulationWorkerRuntimeV2";

type WorkerPortV2 = Readonly<{
  postMessage(
    message: StudioSimulationWorkerResponseV2,
    transfer?: Transferable[],
  ): void;
  close(): void;
}>;

const workerPort = globalThis as unknown as WorkerPortV2;
const dynamicRuntimeLoader = new DynamicExactModelRuntimeLoaderV2();
let lastRuntimeLoadTiming: Readonly<{
  modelId: string;
  timing: Awaited<ReturnType<
    DynamicExactModelRuntimeLoaderV2["loadMeasured"]
  >>["timing"];
}> | undefined;
const workerRuntime = new StudioSimulationWorkerRuntimeV2({
  port: workerPort,
  analysisExecutor: REGISTERED_ANALYSIS_EXECUTOR_V1,
  resolvePresentationAnalysisMethods: resolveRegisteredPresentationAnalysisMethodsV1,
  readerPreviewEnabled: true,
  async validatePreparedAnalysis({ record, releaseTicket, capture }) {
    const { readPreparedScenarioAnalysisV1 } = await import("@/studio/application/authoring/PreparedModelAnalysisV1");
    const { analysis, recordSha256, captureSha256, preparationSourceSha256 } = await readPreparedScenarioAnalysisV1(record, {
      modelId: releaseTicket.modelId, artifactRevisionId: releaseTicket.artifactRevisionId,
      surface: releaseTicket.surfaceRelease, capture,
    });
    return { analysis, recordSha256, captureSha256, preparationSourceSha256 };
  },
  async loadExactRuntime(input) {
    if (input.releaseTicket.modelId !== input.expectedModelId) {
      throw new Error("Worker release ticket does not match the requested model");
    }
    const measured = await dynamicRuntimeLoader.loadMeasured(
      input.releaseTicket,
    );
    lastRuntimeLoadTiming = Object.freeze({
      modelId: input.expectedModelId,
      timing: measured.timing,
    });
    return measured.runtime;
  },
  takeExactRuntimeLoadTiming(modelId) {
    if (lastRuntimeLoadTiming?.modelId !== modelId) return undefined;
    const timing = lastRuntimeLoadTiming.timing;
    lastRuntimeLoadTiming = undefined;
    return timing;
  },
});

globalThis.addEventListener("message", (event: MessageEvent<unknown>) => {
  workerRuntime.enqueue(event.data);
});

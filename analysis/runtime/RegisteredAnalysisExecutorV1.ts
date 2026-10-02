import type { AnalysisExecutorV1 } from "@/analysis/contracts/AnalysisExecutionV1";
import { LEGACY_EXACT_ANALYSIS_EXECUTOR_V1 } from "./LegacyExactAnalysisExecutorV1";
import { MAIN_WIRE_PRESSURE_CROSSING_PV_ANALYSIS_V1_ID } from "@/analysis/methods/mainWire/MainWireStructuralAnalysisContractV3";
import { resolveRegisteredAnalysisMethodsV1 } from "@/analysis/registry/RegisteredAnalysisMethodsV1";
import { analysisCapabilityV1 } from "@/studio/contracts/v2/modelSurface";
import { CARDIORESPIRATORY_DEV_MODEL_ID_V1 } from "@/domain/model/CardiorespiratoryIdentityV1";
import { CARDIORESPIRATORY_MECHANICAL_ANALYSIS_V1_ID } from "../methods/cardiorespiratory/CardiorespiratoryMechanicalAnalysisV1";

/** Numerical imports are lazy. Browser callers use dedicated analysis Workers;
 * local CLI callers execute sequentially in their numerical process. */
export const REGISTERED_ANALYSIS_EXECUTOR_V1: AnalysisExecutorV1 = Object.freeze({
  async execute(input) {
    if (input.request.analysisId === CARDIORESPIRATORY_MECHANICAL_ANALYSIS_V1_ID) {
      if (input.source.acceptedFrame.modelId !== CARDIORESPIRATORY_DEV_MODEL_ID_V1
        || !input.source.surfaceRelease || !resolveRegisteredAnalysisMethodsV1(input.source.surfaceRelease).capabilities
          .includes(analysisCapabilityV1(input.request.analysisId))) throw new Error("Fixed respiratory method is not pinned by this Model Surface");
      const { executeCardiorespiratoryMechanicalV1 } = await import("../methods/cardiorespiratory/CardiorespiratoryMechanicalExecutionV1");
      return executeCardiorespiratoryMechanicalV1(input);
    }
    if (input.source.acceptedFrame.modelId === CARDIORESPIRATORY_DEV_MODEL_ID_V1) return LEGACY_EXACT_ANALYSIS_EXECUTOR_V1.execute(input);
    if (input.request.analysisId !== MAIN_WIRE_PRESSURE_CROSSING_PV_ANALYSIS_V1_ID)
      return LEGACY_EXACT_ANALYSIS_EXECUTOR_V1.execute(input);
    if (!input.source.surfaceRelease || !resolveRegisteredAnalysisMethodsV1(input.source.surfaceRelease).capabilities
      .includes(analysisCapabilityV1(input.request.analysisId))) throw new Error("Analysis method is not pinned by the selected Surface");
    const { executeMainWirePressureCrossingPvV1 } = await import("@/analysis/methods/mainWire/MainWirePressureCrossingExecutionV1");
    return executeMainWirePressureCrossingPvV1(input);
  },
});

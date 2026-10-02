import type { AnalysisExecutorV1 } from "@/analysis/contracts/AnalysisExecutionV1";
import { CARDIORESPIRATORY_DEV_MODEL_ID_V1 } from "@/domain/model/CardiorespiratoryIdentityV1";
import type { CardiorespiratorySessionV1 } from "@/engine/cardiorespiratory/CardiorespiratorySessionV1";
import type { CardiorespiratoryFixedRespiratoryMechanicalSessionV1 } from "@/engine/cardiorespiratory/CardiorespiratoryFixedRespiratoryMechanicalSessionV1";
import type { CardiorespiratoryFixtureV1 } from "@/engine/cardiorespiratory/CardiorespiratoryFixtureV1";
import { executeFixedBoundaryPressureVolumeV1 } from "../mainWire/FixedBoundaryPressureVolumeExecutionV1";
import { buildMainWireIntegratedModelGuytonStarlingOrientationV3 as orientation } from "../mainWire/MainWireGuytonStarlingOrientationV3";
import { CARDIORESPIRATORY_MECHANICAL_ANALYSIS_V1_ID as analysisId, CARDIORESPIRATORY_MECHANICAL_PROTOCOL_V1_ID as protocolId } from "./CardiorespiratoryMechanicalAnalysisV1";
import { studioCanonicalJsonStringify } from "@/domain/json/CanonicalJson";

/** No client engine constructor is imported at runtime. Every detached fork
 * continues the numerical artifact that supplied the captured live state. */
export const executeCardiorespiratoryMechanicalV1: AnalysisExecutorV1["execute"] = async ({ source, request }) => {
  const frame = source.acceptedFrame;
  if (frame.modelId !== CARDIORESPIRATORY_DEV_MODEL_ID_V1 || request.analysisId !== analysisId || !source.capture)
    throw new Error("Fixed respiratory analysis requires its cardiorespiratory capture");
  if (request.scenarioId !== frame.scenarioId || request.runtimeSessionId !== frame.runtimeSessionId
    || request.expectedInputEpoch !== frame.inputEpoch || request.expectedAcceptedRevision !== frame.acceptedRevision
    || request.expectedAcceptedTimeSec !== frame.acceptedTimeSec) throw new Error("Fixed respiratory analysis source clocks differ");
  if (request.analysisPartition !== undefined && request.analysisPartition !== "hypovolemic" && request.analysisPartition !== "hypervolemic")
    throw new Error("Unknown pressure-volume analysis partition");
  if ((request.sharePreparation || request.preparedAnalysis !== undefined) && request.analysisPartition === undefined)
    throw new Error("Shared pressure-volume preparation requires a directional partition");
  if (request.sharePreparation && request.preparedAnalysis !== undefined)
    throw new Error("Cannot prepare and consume the same pressure-volume anchor");
  const captured = await source.capture(), checkpoint = captured.scenario.checkpoint;
  if (!checkpoint || checkpoint.acceptedRevision !== frame.acceptedRevision || checkpoint.acceptedTimeSec !== frame.acceptedTimeSec)
    throw new Error("Fixed respiratory checkpoint clocks differ");
  const exact = source.exactNumericalExports?.ExactSessionV1 as typeof CardiorespiratorySessionV1 | undefined;
  const mechanical = source.exactNumericalExports?.FixedRespiratoryMechanicalSessionV1 as typeof CardiorespiratoryFixedRespiratoryMechanicalSessionV1 | undefined;
  if (typeof exact?.restore !== "function" || typeof mechanical?.restore !== "function")
    throw new Error("Fixed respiratory analysis requires its admitted exact artifact exports");
  const fixture = captured.scenario.fixture as unknown as CardiorespiratoryFixtureV1;
  const coupled = exact.restore(fixture, checkpoint.payload);
  const accepted = coupled.currentAcceptedClock();
  if (accepted.revision !== frame.acceptedRevision || accepted.acceptedTimeSec !== frame.acceptedTimeSec)
    throw new Error("Restored fixed respiratory source clocks differ");
  const session = coupled.forkFixedRespiratoryMechanicsV1();
  return executeFixedBoundaryPressureVolumeV1({ source, request, captured, session, analysisId, protocolId,
    requireReservoirClosure: true,
    restore: async payload => {
      const restored = await mechanical.restore(fixture, payload);
      if (studioCanonicalJsonStringify(restored.respiratoryBoundary)
        !== studioCanonicalJsonStringify(session.respiratoryBoundary)) {
        throw new Error("Prepared mechanical respiratory boundary differs from the captured source");
      }
      return restored;
    },
    buildOrientation: (observation, inputs, loci) => orientation(observation, inputs, loci, session.respiratoryBoundary.pulmonaryPaths),
    measurement: { respiratoryCondition: "captured-boundary-held-fixed", respiratoryBoundary: session.respiratoryBoundary,
      settlementScope: "fixed-respiratory-circulatory-mechanics", wholeSystemGasSettlement: "not-required",
      breathingAverage: false },
  });
};

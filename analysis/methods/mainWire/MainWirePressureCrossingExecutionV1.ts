import type { AnalysisExecutorV1 } from "@/analysis/contracts/AnalysisExecutionV1";
import type { MainWireStaticCaseSessionV1 as Session } from "@/engine/vnext/MainWireStaticCaseSessionV1";
import { MAIN_WIRE_STATIC_CASE_MODEL_ID_V1, MAIN_WIRE_STATIC_CASE_FIXTURE_SCHEMA_ID_V1 } from "@/domain/model/MainWireStaticCaseIdentityV1";
import { hotPathIntegrityTierV1, selectHotPathIntegrityTierV1 } from "@/engine/hotPathIntegrityTierV1";
import { studioCanonicalJsonStringify as canonical } from "@/domain/json/CanonicalJson";
import { MAIN_WIRE_PRESSURE_CROSSING_PV_ANALYSIS_V1_ID as analysisId,
  MAIN_WIRE_PRESSURE_CROSSING_PV_PROTOCOL_V1_ID as protocolId } from "./MainWireStructuralAnalysisContractV3";
import { executeFixedBoundaryPressureVolumeV1 } from "./FixedBoundaryPressureVolumeExecutionV1";

// Exact-owner source compatibility is deliberately narrow. Changing this pin
// requires source/compiled continuation tests, not merely a matching modelId.
export const MAIN_WIRE_PRESSURE_CROSSING_SOURCE_ARTIFACT_V1 = "53aa4536ad570101ab24f834c3cf78597a76b062e03149f9ffc391a907c520a2";

// Read-only capture projection. The exact owner's restore signature determines
// the numerical input types; analysis does not depend on a Studio adapter.
type Restore = Parameters<typeof Session.restore>;
type Fixture = Readonly<{ schemaId: string; anatomyId: Restore[1];
  hemodynamicResearchInputs: Restore[2]; mechanismResearchInputs: Restore[4];
  rhythm: unknown; coronary: unknown; dynamicMechanicalSupport: unknown }>;

// Browser partitions already run in separate Workers. Headless callers share
// this module: serialize re-entry before borrowing its process-owned tier so a
// finishing analysis cannot change another analysis's numerical path.
let executionTail: Promise<void> = Promise.resolve();
async function acquireExecution(): Promise<() => void> {
  const previous = executionTail;
  let release!: () => void;
  executionTail = new Promise<void>(resolve => { release = resolve; });
  await previous;
  return release;
}

export const executeMainWirePressureCrossingPvV1: AnalysisExecutorV1["execute"] = async ({ source, request }) => {
  const frame = source.acceptedFrame;
  if (frame.modelId !== MAIN_WIRE_STATIC_CASE_MODEL_ID_V1 || request.analysisId !== analysisId || !source.capture)
    throw new Error("Pressure-crossing analysis requires the supported static exact capture");
  if (request.scenarioId !== frame.scenarioId || request.runtimeSessionId !== frame.runtimeSessionId
    || request.expectedInputEpoch !== frame.inputEpoch || request.expectedAcceptedRevision !== frame.acceptedRevision
    || request.expectedAcceptedTimeSec !== frame.acceptedTimeSec) throw new Error("Pressure-crossing analysis source clocks differ");
  if (request.analysisPartition !== undefined && request.analysisPartition !== "hypovolemic" && request.analysisPartition !== "hypervolemic")
    throw new Error("Unknown pressure-volume analysis partition");
  if ((request.sharePreparation || request.preparedAnalysis !== undefined) && request.analysisPartition === undefined)
    throw new Error("Shared pressure-volume preparation requires a directional partition");
  if (request.sharePreparation && request.preparedAnalysis !== undefined)
    throw new Error("Cannot prepare and consume the same pressure-volume anchor");
  const captured = await source.capture();
  if (captured.artifactRevisionId !== MAIN_WIRE_PRESSURE_CROSSING_SOURCE_ARTIFACT_V1)
    throw new Error("Pressure-crossing exact source artifact requires compatibility validation");
  const { checkpoint } = captured.scenario;
  if (!checkpoint || checkpoint.acceptedRevision !== frame.acceptedRevision || checkpoint.acceptedTimeSec !== frame.acceptedTimeSec)
    throw new Error("Pressure-crossing checkpoint clocks differ");
  const fixture = captured.scenario.fixture as unknown as Fixture;
  if (fixture.schemaId !== MAIN_WIRE_STATIC_CASE_FIXTURE_SCHEMA_ID_V1 || fixture.anatomyId === undefined
    || canonical(fixture.rhythm) !== canonical({ mode: "regular-sinus-v3" })
    || canonical(fixture.coronary) !== canonical({ topologyProfile: "coronary-network-v2" })
    || canonical(fixture.dynamicMechanicalSupport) !== canonical({ mode: "all-off-zero-inertance-v3" }))
    throw new Error("Unsupported pressure-crossing fixture construction");
  const releaseExecution = await acquireExecution();
  const previousTier = hotPathIntegrityTierV1();
  try {
    selectHotPathIntegrityTierV1("hot-path-lean");
    // Restore/checkpoint semantics remain in the exact owner, not the analysis.
    const exactOwner = source.exactNumericalExports?.ExactSessionV1 as typeof Session | undefined;
    if (typeof exactOwner?.restore !== "function") throw new Error("Pressure-crossing analysis requires its admitted exact artifact exports");
    const restore = exactOwner.restore;
    const session = await restore(checkpoint.payload, fixture.anatomyId,
      fixture.hemodynamicResearchInputs, 1, fixture.mechanismResearchInputs);
    const accepted = session.currentAcceptedState();
    if (accepted.revision !== frame.acceptedRevision || accepted.acceptedTimeSec !== frame.acceptedTimeSec)
      throw new Error("Restored pressure-crossing source clocks differ");
    return await executeFixedBoundaryPressureVolumeV1({ source, request, captured, session, analysisId, protocolId,
      restore: payload => restore(payload, fixture.anatomyId, fixture.hemodynamicResearchInputs, 1, fixture.mechanismResearchInputs) });
  } finally {
    try { selectHotPathIntegrityTierV1(previousTier); }
    finally { releaseExecution(); }
  }
};

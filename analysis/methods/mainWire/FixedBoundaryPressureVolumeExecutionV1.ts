import type { AnalysisExecutionRequestV1, AnalysisExecutionSourceV1 } from "@/analysis/contracts/AnalysisExecutionV1";
import type { ScenarioCaptureV2 } from "@/studio/contracts/v2/content";
import type { MainWireStaticCaseSessionV1 as Session } from "@/engine/vnext/MainWireStaticCaseSessionV1";
import { validateStudioSimulationAnalysisV2 } from "@/studio/contracts/v2/simulation";
import { runMainWireIntegratedModelFormalPressureVolumeProtocolV3 as protocol } from "./MainWirePressureVolumeProtocolsV3";
import { buildMainWireIntegratedModelGuytonStarlingOrientationV3 as orientation } from "./MainWireGuytonStarlingOrientationV3";
import { wrapMainWirePressureCrossingSessionV1 as wrap, MAIN_WIRE_SEMILUNAR_PRESSURE_CROSSING_V1_ID as measurementId, type PressureCrossingExactSessionV1 } from "./MainWirePressureCrossingSessionV1";
import { sha256StudioCanonicalJsonHex as digest } from "@/domain/json/CanonicalJsonSha256";
import { prepareMainWirePressureVolumeAnchorV1 as prepare, runMainWirePressureVolumeFromAnchorV1 as runPrepared,
  mainWirePressureVolumeAnchorLociV1 as anchorLoci } from "./MainWireSharedPressureVolumeAnchorV1";
import { captureMainWirePressureVolumeContinuationV1 as captureContinuation, restoreMainWirePressureVolumeContinuationV1 as restoreContinuation } from "./MainWirePressureVolumeContinuationV1";
import type { MainWireIntegratedModelResponsiveStarlingPartitionV3 } from "./MainWireStructuralAnalysisContractV3";
import { validMainWireFixedTonePointSettlementV2 } from "./MainWireFixedToneSettlementV2";

type Owner = PressureCrossingExactSessionV1 & Pick<Session, "anatomy">;
/** Shared derived protocol. Its caller supplies the admitted artifact's exact
 * numerical owner and a versioned experimental boundary. */
export async function executeFixedBoundaryPressureVolumeV1(input: {
  source: AnalysisExecutionSourceV1; request: AnalysisExecutionRequestV1;
  captured: Readonly<{ artifactRevisionId: string; scenario: ScenarioCaptureV2 }>;
  session: Owner; restore: (payload: unknown) => Promise<Owner>;
  analysisId: string; protocolId: string;
  buildOrientation?: typeof orientation;
  measurement?: Readonly<Record<string, unknown>>;
  requireReservoirClosure?: boolean;
}) {
  const { source, request, captured, session, restore, analysisId, protocolId,
    buildOrientation = orientation, measurement = {}, requireReservoirClosure = false } = input;
  const frame = source.acceptedFrame;
  const { fixture: rawFixture, checkpoint } = captured.scenario;
  const fixture = rawFixture as unknown as { hemodynamicResearchInputs: Parameters<typeof orientation>[1] };
    const toLoci = (result: Pick<Awaited<ReturnType<typeof protocol>>, "right" | "left">) => {
      if (requireReservoirClosure && ![...result.left.points, ...result.right.points].every(validMainWireFixedTonePointSettlementV2))
        throw new Error("Fixed respiratory family requires measured reservoir-closure evidence");
      return Object.freeze({
        right: Object.freeze({ ...result.right, protocolId, exactAnatomy: session.anatomy }),
        left: Object.freeze({ ...result.left, protocolId, exactAnatomy: session.anatomy }),
      });
    };
    const withEnvelope = (payload: ReturnType<typeof orientation>) => {
      if (payload.status !== "available") throw new Error("Pressure-volume anchor has no accepted readback");
      return validateStudioSimulationAnalysisV2({ modelId: frame.modelId, runtimeSessionId: request.runtimeSessionId,
        scenarioId: frame.scenarioId, inputEpoch: frame.inputEpoch, sourceAcceptedRevision: frame.acceptedRevision,
        sourceAcceptedTimeSec: frame.acceptedTimeSec, analysisId,
        payload: { ...payload, measurement: { methodId: measurementId, protocolId, ...measurement,
          maximumStepSec: .002, interpolation: "signed-pressure-linear-bracket", pressureBasis: "transmural",
          exactNativeMetricsUnchanged: true } } });
    };
    const toAnalysis = (result: Awaited<ReturnType<typeof protocol>>) =>
      withEnvelope(buildOrientation(result.anchorObservation, fixture.hemodynamicResearchInputs, toLoci(result)));
    if (request.sharePreparation || request.preparedAnalysis !== undefined) {
      const sourceBinding = await digest({ modelId: frame.modelId, artifactRevisionId: captured.artifactRevisionId,
        scenarioId: frame.scenarioId, analysisId, measurementId, fixture, checkpoint });
      const partition = request.analysisPartition as MainWireIntegratedModelResponsiveStarlingPartitionV3;
      const center = await (async () => {
        if (request.preparedAnalysis !== undefined) return restoreContinuation(request.preparedAnalysis, sourceBinding,
          restore, requireReservoirClosure);
        const prepared = await prepare(wrap(session, .002, requireReservoirClosure), fixture.hemodynamicResearchInputs!);
        const base = buildOrientation(prepared.observation, fixture.hemodynamicResearchInputs, toLoci(anchorLoci(prepared, partition)));
        if (base.status !== "available") throw new Error("Pressure-volume anchor has no accepted readback");
        return { ...prepared, orientation: base };
      })();
      // The fixed Guyton orientation depends only on the common anchor. Keep
      // it once; only the measured Starling/PV locus changes during each sweep.
      const toPreparedAnalysis = (result: Awaited<ReturnType<typeof runPrepared>>) => {
        const loci = toLoci(result);
        return withEnvelope({ ...center.orientation,
          right: { ...center.orientation.right, starlingLocus: loci.right },
          left: { ...center.orientation.left, starlingLocus: loci.left } });
      };
      let preparation = request.sharePreparation ? await captureContinuation(center, sourceBinding, center.orientation) : undefined;
      const result = await runPrepared(center, fixture.hemodynamicResearchInputs!,
        partition, progress => {
          request.onProgress?.(toPreparedAnalysis(progress), preparation);
          preparation = undefined;
        });
      return toPreparedAnalysis(result);
    }
    const result = await protocol(wrap(session, .002, requireReservoirClosure), fixture.hemodynamicResearchInputs,
      progress => request.onProgress?.(toAnalysis(progress)),
      request.analysisPartition as MainWireIntegratedModelResponsiveStarlingPartitionV3 | undefined);
    return toAnalysis(result);
}

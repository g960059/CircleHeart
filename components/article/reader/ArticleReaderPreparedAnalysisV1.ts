import { sha256CanonicalJsonHex as hash } from "@/engine/integrity";
import type { ScenarioCaptureV2 } from "@/studio/contracts/v2/content";
import type { StudioModelWorkerReleaseTicketV2 } from "@/studio/contracts/v2/release";
import type { StudioJsonObjectV2 } from "@/studio/contracts/v2/json";
import type { StudioSimulationAnalysisV2 } from "@/studio/contracts/v2/simulation";
import { loadPreparedScenarioAnalysisV1, validatePreparedAnalysisForDisplayV1 } from "@/components/workbench/runtime/PreparedModelAnalysisRegistryV1";
import type { WorkbenchBackgroundWorkerPoolPortV3 } from "@/components/workbench/runtime/WorkbenchBackgroundWorkerPoolV3";
import { BrowserPreparedAnalysisStoreV1 } from "@/studio/infrastructure/browser/BrowserPreparedAnalysisStoreV1";

/**
 * Sealed-state analysis source for the Article Reader.
 *
 * Order: the registry's content-addressed preparations first (registered
 * launch presets), then preparations that travelled with the Snapshot into
 * this browser. Both paths validate the record against the pinned model,
 * artifact revision, Surface method, and exact capture hash; a mismatch is
 * simply "no preparation", never a substitute result. The live lane then
 * measures on demand as before.
 */
export async function loadArticleReaderPreparedAnalysisV1(
  ticket: StudioModelWorkerReleaseTicketV2,
  capture: ScenarioCaptureV2,
  store: BrowserPreparedAnalysisStoreV1 = new BrowserPreparedAnalysisStoreV1(),
  pool?: WorkbenchBackgroundWorkerPoolPortV3,
): Promise<StudioSimulationAnalysisV2 | null> {
  const registered = await loadPreparedScenarioAnalysisV1(ticket, capture, pool);
  if (registered !== null) return registered;
  try {
    const record = store.read(await hash(capture));
    if (record === null) return null;
    const saved = await validatePreparedAnalysisForDisplayV1(record, ticket, capture, pool);
    return {
      ...saved.analysis,
      payload: {
        ...saved.analysis.payload as StudioJsonObjectV2,
        preparedOrigin: {
          recordSha256: saved.recordSha256,
          captureSha256: saved.captureSha256,
          preparationSourceSha256: saved.preparationSourceSha256,
          use: "sealed-scenario-analysis",
        },
      },
    };
  } catch {
    return null;
  }
}

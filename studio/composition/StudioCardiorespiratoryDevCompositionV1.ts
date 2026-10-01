import type { StudioClientCompositionV2 } from "./StudioDefaultCompositionV2";
import type { StudioJsonValueV2 } from "@/studio/contracts/v2/json";
import { STUDIO_MODEL_WORKER_RELEASE_TICKET_V2_SCHEMA_ID, validateStudioModelWorkerReleaseTicketV2 } from "@/studio/contracts/v2/release";
import { assertExactModelKernelManifestV3 } from "@/studio/contracts/v2/modelSurface";
import { composeModelSurfacePresentationBundleV1 } from "@/studio/application/modelSurface/ModelSurfacePresentationBundleV1";
import { resolveRegisteredAnalysisMethodsV1 } from "@/analysis/registry/RegisteredAnalysisMethodsV1";
import { mainWireIntegratedStudioFixtureProjectionV3 } from "@/studio/integrations/mainWireIntegratedV3/MainWireIntegratedStudioFixtureControlProjectionV3";
import { readCardiorespiratoryControlValueV1 } from "@/studio/integrations/cardiorespiratoryV1/CardiorespiratoryCatalogV1";
import { CARDIORESPIRATORY_DEV_MODEL_ID_V1 } from "@/domain/model/CardiorespiratoryIdentityV1";
import surfaceRelease from "@/studio/integrations/cardiorespiratoryV1/CardiorespiratorySurfaceV1";
import bundle from "@/data/model-releases/cardiorespiratory-dev-v1/bundle.json";
import { adaptCardiorespiratoryDefaultSurfaceV1, cardiorespiratoryDevLimitationsV1 } from "@/studio/integrations/cardiorespiratoryV1/CardiorespiratoryDefaultSurfaceV1";
import type { ExperimentSurfaceV2 } from "@/studio/contracts/v2/content";

export const CARDIORESPIRATORY_DEV_FIXTURE_PROJECTION_V1 = Object.freeze({
  controlValue(fixture: unknown, controlId: string) {
    if (!controlId.startsWith("cardiorespiratory.")) return mainWireIntegratedStudioFixtureProjectionV3.controlValue(fixture, controlId);
    const config = fixture && typeof fixture === "object" && "cardiorespiratory" in fixture ? fixture.cardiorespiratory : undefined;
    const value = readCardiorespiratoryControlValueV1(config, controlId);
    return value === undefined ? { status: "unsupported" as const } : { status: "value" as const, value };
  },
});
let pending: Promise<StudioClientCompositionV2> | undefined;
/** Local ephemeral development bundle. It never enters the production registry
 * resolver and must be selected explicitly through Model Lab. */
export function loadCardiorespiratoryDevClientCompositionV1(): Promise<StudioClientCompositionV2> {
  return pending ??= Promise.resolve().then(() => {
    if (bundle.schemaId !== "circleheart-local-dev-model-bundle-v1" || bundle.stage !== "dev" || !bundle.ephemeral || bundle.manifest.modelId !== CARDIORESPIRATORY_DEV_MODEL_ID_V1) throw new Error("Invalid cardiorespiratory local development bundle");
    assertExactModelKernelManifestV3(bundle.manifest);
    const resolved = new URL("../../data/model-releases/cardiorespiratory-dev-v1/artifact.mjs.txt", import.meta.url);
    const artifactUrl = resolved.protocol === "file:" ? new URL("__circleheart_local_cardiorespiratory_dev_artifact__.mjs", "http://127.0.0.1/") : resolved;
    artifactUrl.searchParams.set("revision", bundle.artifactRevisionId);
    const workerReleaseTicket = validateStudioModelWorkerReleaseTicketV2({ schemaId: STUDIO_MODEL_WORKER_RELEASE_TICKET_V2_SCHEMA_ID,
      modelId: bundle.manifest.modelId, artifactRevisionId: bundle.artifactRevisionId, manifest: bundle.manifest, surfaceRelease,
      moduleAbi: "circleheart-exact-model-esm-v1", artifactUrl: artifactUrl.href });
    const analysis = resolveRegisteredAnalysisMethodsV1(surfaceRelease);
    const modelSurface = composeModelSurfacePresentationBundleV1({ kernel: bundle.manifest, surfaceRelease, stage: "dev", analysis });
    return Object.freeze({ exactModel: Object.freeze({ modelId: bundle.manifest.modelId, stage: "dev" as const,
      defaultFixture: bundle.defaultFixture as StudioJsonValueV2, fixtureProjection: CARDIORESPIRATORY_DEV_FIXTURE_PROJECTION_V1, workerReleaseTicket }),
      modelSurface,
      presentation: Object.freeze({
        adaptDefaultSurface: (base: ExperimentSurfaceV2, locale: string) => adaptCardiorespiratoryDefaultSurfaceV1(base, modelSurface.contract, locale),
        limitations: cardiorespiratoryDevLimitationsV1,
      }) });
  }).catch(error => { pending = undefined; throw error; });
}

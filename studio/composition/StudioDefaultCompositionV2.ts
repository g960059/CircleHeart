import type { StudioJsonValueV2 } from "@/studio/contracts/v2/json";
import { REGISTERED_CURRENT_MODEL_BASELINE_V1 } from "@/studio/registry/RegisteredCurrentModelBaselineV1";
import type { ExperimentSurfaceV2, ScenarioCheckpointV2, ScenarioPresetV2 } from "@/studio/contracts/v2/content";
import { resolveRegisteredModelLaunchDefaultsV1 } from
  "@/studio/registry/RegisteredModelLaunchBaselineV1";
import type {
  StudioModelWorkerReleaseTicketV2,
} from "@/studio/contracts/v2/release";
import {
  STUDIO_MODEL_WORKER_RELEASE_TICKET_V2_SCHEMA_ID,
  validateStudioModelWorkerReleaseTicketV2,
} from "@/studio/contracts/v2/release";
import {
  assertExactModelKernelManifestV3,
  assertModelSurfaceReleaseManifestV1,
} from "@/studio/contracts/v2/modelSurface";
import {
  StudioExactModelUnavailableErrorV1,
  invalidateStudioSupabaseModelReleaseResolverCacheV1,
  studioSupabaseModelReleaseResolverV1,
} from "@/studio/infrastructure/model/StudioSupabaseModelReleaseResolverV1";
import type {
  StudioModelSurfacePinV1,
  StudioResolvedModelReleaseV1,
} from "@/studio/infrastructure/model/StudioSupabaseModelReleaseResolverV1";
import {
  composeModelSurfacePresentationBundleV1,
  type ModelSurfacePresentationBundleV1,
} from "@/studio/application/modelSurface/ModelSurfacePresentationBundleV1";
import {
  resolveRegisteredAnalysisMethodsV1,
  type RegisteredAnalysisMethodsV1,
} from "@/analysis/registry/RegisteredAnalysisMethodsV1";
import type { ExactModelFixtureProjectionV1 } from
  "@/studio/application/model/ExactModelFixtureProjectionV1";
import { resolveRegisteredExactModelFixtureProjectionV1 } from
  "@/studio/registry/RegisteredExactModelFixtureProjectionV1";
import {
  MAIN_WIRE_STATIC_CASE_MODEL_ID_V1,
} from
  "@/domain/model/MainWireStaticCaseIdentityV1";
import currentClientDescriptorV1, { CURRENT_MODEL_PRESETS_V1 } from
  "@/data/model-releases/CurrentModelReleaseV1";
import currentSurfaceReleaseV1 from
  "@/studio/integrations/mainWireIntegratedV3/MainWireIntegratedStudioStaticCaseSurfaceV5";
import crossingSurfaceReleaseV1 from "@/studio/integrations/mainWireIntegratedV3/MainWireIntegratedStudioStaticCaseSurfaceV4";
import previousSurfaceReleaseV1 from
  "@/studio/integrations/mainWireIntegratedV3/MainWireIntegratedStudioStaticCaseSurfaceV2";
import originalSurfaceReleaseV1 from "@/studio/integrations/mainWireIntegratedV3/MainWireIntegratedStudioStaticCaseSurfaceV1";
import currentRegistryAdmissionLockV1 from
  "@/data/model-releases/standard74/publication.json";

export const DEFAULT_STUDIO_MODEL_ID_V2:
typeof MAIN_WIRE_STATIC_CASE_MODEL_ID_V1 = MAIN_WIRE_STATIC_CASE_MODEL_ID_V1;

export type StudioClientCompositionV2 = Readonly<{
  exactModel: Readonly<{
    modelId: string;
    stage: "dev" | "stable" | "retired";
    defaultFixture: StudioJsonValueV2;
    defaultCheckpoint?: ScenarioCheckpointV2;
    fixtureProjection: ExactModelFixtureProjectionV1;
    workerReleaseTicket: StudioModelWorkerReleaseTicketV2;
  }>;
  modelSurface: ModelSurfacePresentationBundleV1<RegisteredAnalysisMethodsV1>;
  /** Model-specific initial presentation, resolved alongside its Surface.
   * The Workbench supplies its generic base; model code never imports UI. */
  presentation?: Readonly<{
    adaptDefaultSurface: (base: ExperimentSurfaceV2, locale: string) => ExperimentSurfaceV2;
    limitations: (locale: string) => readonly string[];
  }>;
  activeBundleVersion?: number;
  /** Same-model, source-bound local examples; not an additional execution identity. */
  presets?: readonly ScenarioPresetV2[];
}>;

export type StudioDefaultClientCompositionV2 = StudioClientCompositionV2;

let browserCompositionPromiseV2:
  Promise<StudioDefaultClientCompositionV2> | undefined;
const browserExperimentCompositionPromisesV2 = new Map<
  string,
  Promise<StudioClientCompositionV2>
>();
const browserSnapshotCompositionPromisesV2 = new Map<
  string,
  Promise<StudioClientCompositionV2>
>();
const browserLocalCurrentCompositionPromisesV1 = new Map<
  string,
  Promise<StudioClientCompositionV2>
>();

/**
 * Development inventory refreshes must observe active-bundle and lifecycle
 * moves made after the SPA first resolved them. Ordinary Sessions keep their
 * pinned composition; clearing these Promises cannot mutate a running Worker.
 */
export function invalidateStudioClientCompositionCachesV2(): void {
  invalidateStudioSupabaseModelReleaseResolverCacheV1();
  browserCompositionPromiseV2 = undefined;
  browserExperimentCompositionPromisesV2.clear();
  browserSnapshotCompositionPromisesV2.clear();
}

async function createRegistryClientCompositionV2(
  modelId?: string,
  surfacePin?: StudioModelSurfacePinV1,
): Promise<StudioClientCompositionV2> {
  if (modelId !== undefined && surfacePin === undefined) {
    throw new Error("Exact model resolution requires a Surface pin");
  }
  if (modelId !== undefined) assertCurrentBrowserModelV1(modelId);
  const resolver = studioSupabaseModelReleaseResolverV1();
  if (resolver === null) {
    if (modelId === undefined) {
      return loadStudioLocalCurrentClientCompositionV1();
    }
    const localSurface = surfacePin === undefined ? undefined
      : [currentSurfaceReleaseV1, crossingSurfaceReleaseV1, previousSurfaceReleaseV1, originalSurfaceReleaseV1]
        .find(surface => localSurfacePinMatchesV1(surface, surfacePin));
    if (
      modelId === currentClientDescriptorV1.manifest.modelId
      && localSurface !== undefined
    ) {
      return loadStudioLocalCurrentClientCompositionForSurfaceV1(localSurface);
    }
    throw new Error(
      "Unconfigured local registry cannot resolve the requested exact model and Surface pin",
    );
  }
  const release = modelId === undefined
    ? await resolver.resolveActiveBundle()
    : await resolver.resolveExactModel(modelId, surfacePin!);
  return composeStudioClientCompositionV2(release);
}

/** Local current-model composition; the inherited Surface keeps its identity. */
export function loadStudioLocalCurrentClientCompositionV1():
Promise<StudioClientCompositionV2> {
  return loadStudioLocalCurrentClientCompositionForSurfaceV1(
    currentSurfaceReleaseV1,
  );
}

function loadStudioLocalCurrentClientCompositionForSurfaceV1(
  surfaceRelease: unknown,
): Promise<StudioClientCompositionV2> {
  assertModelSurfaceReleaseManifestV1(surfaceRelease);
  const key = surfaceRelease.surfaceReleaseId;
  const cached = browserLocalCurrentCompositionPromisesV1.get(key);
  if (cached !== undefined) return cached;
  const pending = Promise.resolve().then(() => {
    if (
      currentClientDescriptorV1.schemaId
      !== "circleheart-standard-exact-model-client-descriptor-v1"
    ) {
      throw new Error("Current client descriptor identity mismatch");
    }
    assertExactModelKernelManifestV3(
      currentClientDescriptorV1.manifest,
    );
    const workerReleaseTicket = validateStudioModelWorkerReleaseTicketV2({
      schemaId: STUDIO_MODEL_WORKER_RELEASE_TICKET_V2_SCHEMA_ID,
      modelId: currentClientDescriptorV1.manifest.modelId,
      artifactRevisionId:
        currentRegistryAdmissionLockV1.artifactRevisionId,
      manifest: currentClientDescriptorV1.manifest,
      surfaceRelease,
      moduleAbi: "circleheart-exact-model-esm-v1",
      artifactUrl: localCurrentArtifactUrlV1(),
    });
    return composeStudioClientCompositionV2(Object.freeze({
      defaultFixture: REGISTERED_CURRENT_MODEL_BASELINE_V1.fixture,
      stage: "dev" as const,
      ticket: workerReleaseTicket,
      surfaceStage: "dev" as const,
    }));
  });
  browserLocalCurrentCompositionPromisesV1.set(key, pending);
  void pending.catch(() => {
    if (browserLocalCurrentCompositionPromisesV1.get(key) === pending) {
      browserLocalCurrentCompositionPromisesV1.delete(key);
    }
  });
  return pending;
}

function localCurrentArtifactUrlV1(): string {
  const loopbackBase = "http://127.0.0.1/";
  const resolved = new URL(
    "../../data/model-releases/standard74/artifact.mjs.txt",
    import.meta.url,
  );
  return resolved.protocol === "file:"
    ? new URL(
        "__circleheart_local_standard74_artifact__.mjs",
        loopbackBase,
      ).href
    : localCurrentArtifactRevisionUrlV1(resolved).href;
}

export function localCurrentArtifactRevisionUrlV1(
  resolved: URL,
): URL {
  const revisioned = new URL(resolved);
  revisioned.searchParams.set(
    "revision",
    currentRegistryAdmissionLockV1.artifactRevisionId,
  );
  return revisioned;
}

/** One active-bundle composition shared across StrictMode remounts. */
export function loadStudioDefaultClientCompositionV2():
Promise<StudioDefaultClientCompositionV2> {
  if (browserCompositionPromiseV2 !== undefined) {
    return browserCompositionPromiseV2;
  }
  const pending = createRegistryClientCompositionV2();
  browserCompositionPromiseV2 = pending;
  void pending.catch(() => {
    // A transient fetch/evaluation failure must not poison the browser
    // composition for the rest of the page lifetime. Only clear the Promise
    // that actually failed so a later successful load cannot be displaced.
    if (browserCompositionPromiseV2 === pending) {
      browserCompositionPromiseV2 = undefined;
    }
  });
  return pending;
}

/** Mutable content follows additive releases in its pinned Surface series. */
export function loadStudioExperimentClientCompositionV2(
  modelId: string,
  surfaceSeriesId: string,
): Promise<StudioClientCompositionV2> {
  const key = `${modelId}\u0000${surfaceSeriesId}`;
  const cached = browserExperimentCompositionPromisesV2.get(key);
  if (cached !== undefined) return cached;
  const pending = createRegistryClientCompositionV2(modelId, {
    kind: "series",
    surfaceSeriesId,
  }).then((composition) => {
    if (
      composition.exactModel.modelId !== modelId
      || composition.modelSurface.identity.surfaceSeriesId !== surfaceSeriesId
    ) {
      throw new Error("Experiment Surface series resolution changed identity");
    }
    return composition;
  });
  browserExperimentCompositionPromisesV2.set(key, pending);
  void pending.catch(() => {
    if (browserExperimentCompositionPromisesV2.get(key) === pending) {
      browserExperimentCompositionPromisesV2.delete(key);
    }
  });
  return pending;
}

/** Immutable content always reloads the exact Surface sealed by its Snapshot. */
export function loadStudioSnapshotClientCompositionV2(
  modelId: string,
  surfaceSeriesId: string,
  surfaceReleaseId: string,
): Promise<StudioClientCompositionV2> {
  const key = `${modelId}\u0000${surfaceSeriesId}\u0000${surfaceReleaseId}`;
  const cached = browserSnapshotCompositionPromisesV2.get(key);
  if (cached !== undefined) return cached;
  const pending = createRegistryClientCompositionV2(modelId, {
    kind: "release",
    surfaceSeriesId,
    surfaceReleaseId,
  }).then((composition) => {
    if (
      composition.exactModel.modelId !== modelId
      || composition.modelSurface.identity.surfaceSeriesId !== surfaceSeriesId
      || composition.modelSurface.identity.surfaceReleaseId !== surfaceReleaseId
    ) {
      throw new Error("Snapshot exact Surface resolution changed identity");
    }
    return composition;
  });
  browserSnapshotCompositionPromisesV2.set(key, pending);
  void pending.catch(() => {
    if (browserSnapshotCompositionPromisesV2.get(key) === pending) {
      browserSnapshotCompositionPromisesV2.delete(key);
    }
  });
  return pending;
}

/** Retired pre-release identities never alias the current model. */
function assertCurrentBrowserModelV1(modelId: string): void {
  if (modelId !== DEFAULT_STUDIO_MODEL_ID_V2) {
    throw new StudioExactModelUnavailableErrorV1(
      modelId,
      "not-registered-or-loadable",
      "This browser build supports only the current exact model",
    );
  }
}

function composeStudioClientCompositionV2(
  release: StudioResolvedModelReleaseV1,
): StudioClientCompositionV2 {
  assertCurrentBrowserModelV1(release.ticket.modelId);
  const analysis = resolveRegisteredAnalysisMethodsV1(
    release.ticket.surfaceRelease,
  );
  const modelSurface = composeModelSurfacePresentationBundleV1({
    kernel: release.ticket.manifest,
    surfaceRelease: release.ticket.surfaceRelease,
    stage: release.surfaceStage,
    analysis,
  });
  if (modelSurface.contract.modelId !== release.ticket.modelId) {
    throw new Error("Client exact model and Model Surface identities differ");
  }
  const launchDefaults = resolveRegisteredModelLaunchDefaultsV1(release);
  return Object.freeze({
    exactModel: Object.freeze({
      modelId: release.ticket.modelId,
      stage: release.stage,
      ...launchDefaults,
      fixtureProjection: resolveRegisteredExactModelFixtureProjectionV1(
        {
          modelId: release.ticket.modelId,
          fixtureSchemaId:
            release.ticket.manifest.fixtureSchema.fixtureSchemaId,
        },
      ),
      workerReleaseTicket: release.ticket,
    }),
    modelSurface,
    presets: CURRENT_MODEL_PRESETS_V1,
    ...(release.activeBundleVersion === undefined
      ? {}
      : { activeBundleVersion: release.activeBundleVersion }),
  });
}

function localSurfacePinMatchesV1(
  surfaceRelease: Readonly<{
    surfaceSeriesId: string;
    surfaceReleaseId: string;
  }>,
  surfacePin: StudioModelSurfacePinV1,
): boolean {
  return surfacePin.surfaceSeriesId === surfaceRelease.surfaceSeriesId
    && (
      surfacePin.kind !== "release"
      || surfacePin.surfaceReleaseId === surfaceRelease.surfaceReleaseId
    );
}

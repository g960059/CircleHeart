import type {
  ExactModelRuntimeLoadTimingV2,
  RegisteredModelExecutableBundleV2,
  ResolvedExactModelRuntimeV2,
} from "@/studio/contracts/v2/executable";
import type {
  ExactModelKernelManifestV3,
} from "@/studio/contracts/v2/modelSurface";
import {
  STUDIO_EXACT_PRESENTATION_BATCH_CAPABILITY_V1,
} from "@/studio/contracts/v2/simulation";
import {
  EXECUTION_PLAN_TYPED_AUTHORITY_BINDING_V1_CAPABILITY,
} from "@/runtime/executionPlan/BoundExecutionPlanV1";
import type {
  StudioModelWorkerReleaseTicketV2,
} from "@/studio/contracts/v2/release";
import {
  validateStudioModelWorkerReleaseTicketV2,
} from "@/studio/contracts/v2/release";
import {
  importExactExecutableArtifactModuleV2,
} from "@/runtime/ExactExecutableArtifactModuleLoaderV2";
import {
  admitExactModelExecutableRuntimeV2,
} from "@/studio/infrastructure/model/ExactModelExecutableValidationV1";
import {
  materializeModelSurfaceV1,
} from "@/studio/application/modelSurface/ModelSurfacePresentationBundleV1";
import {
  resolveRegisteredAnalysisMethodsV1,
} from "@/analysis/registry/RegisteredAnalysisMethodsV1";
import {
  studioCanonicalJsonStringify,
} from "@/domain/json/CanonicalJson";

const MAXIMUM_EXACT_MODEL_ARTIFACT_BYTES_V2 = 32 * 1024 * 1024;

type ArtifactFetchResponseV2 = Readonly<{
  ok: boolean;
  status: number;
  arrayBuffer(): Promise<ArrayBuffer>;
}>;

export type ExactModelArtifactFetchPortV2 = (
  url: string,
) => Promise<ArtifactFetchResponseV2>;

export type MeasuredExactModelRuntimeLoadV2 = Readonly<{
  runtime: ResolvedExactModelRuntimeV2;
  timing: ExactModelRuntimeLoadTimingV2;
}>;

/**
 * Worker-side exact runtime loader. Registry identity and ABI choose the
 * artifact and export. The client performs schema/binding checks but never
 * computes or compares a release digest.
 */
export class DynamicExactModelRuntimeLoaderV2 {
  readonly #fetchArtifact: ExactModelArtifactFetchPortV2;
  readonly #runtimePromises = new Map<
    string,
    Promise<ResolvedExactModelRuntimeV2>
  >();
  readonly #artifactIdentityByRevision = new Map<string, string>();
  readonly #coldTimingByTicket = new Map<
    string,
    ExactModelRuntimeLoadTimingV2
  >();

  constructor(
    fetchArtifact: ExactModelArtifactFetchPortV2 = defaultArtifactFetchV2,
  ) {
    this.#fetchArtifact = fetchArtifact;
  }

  load(ticketValue: unknown): Promise<ResolvedExactModelRuntimeV2> {
    const ticket = validateStudioModelWorkerReleaseTicketV2(ticketValue);
    const canonicalTicket = studioCanonicalJsonStringify(ticket);
    const artifactIdentity = studioCanonicalJsonStringify({
      artifactRevisionId: ticket.artifactRevisionId,
      artifactUrl: ticket.artifactUrl,
      manifest: ticket.manifest,
      modelId: ticket.modelId,
      moduleAbi: ticket.moduleAbi,
    });
    const registeredIdentity = this.#artifactIdentityByRevision.get(
      ticket.artifactRevisionId,
    );
    if (
      registeredIdentity !== undefined
      && registeredIdentity !== artifactIdentity
    ) {
      return Promise.reject(new Error(
        "Exact artifact revision was requested with another immutable release ticket",
      ));
    }
    const cached = this.#runtimePromises.get(canonicalTicket);
    if (cached !== undefined) return cached;
    this.#artifactIdentityByRevision.set(
      ticket.artifactRevisionId,
      artifactIdentity,
    );
    const pending = this.#loadUncached(ticket, canonicalTicket);
    this.#runtimePromises.set(canonicalTicket, pending);
    void pending.catch(() => {
      if (this.#runtimePromises.get(canonicalTicket) === pending) {
        this.#runtimePromises.delete(canonicalTicket);
      }
    });
    return pending;
  }

  async loadMeasured(
    ticketValue: unknown,
  ): Promise<MeasuredExactModelRuntimeLoadV2> {
    const ticket = validateStudioModelWorkerReleaseTicketV2(ticketValue);
    const canonicalTicket = studioCanonicalJsonStringify(ticket);
    const cacheHit = this.#runtimePromises.has(canonicalTicket);
    const startedAtMs = monotonicNowV2();
    const runtime = await this.load(ticket);
    const cold = this.#coldTimingByTicket.get(canonicalTicket);
    if (cold === undefined) {
      throw new Error("Exact model runtime load timing is unavailable");
    }
    return Object.freeze({
      runtime,
      timing: cacheHit
        ? Object.freeze({
            cacheHit: true,
            artifactBytes: cold.artifactBytes,
            artifactFetchMs: 0,
            moduleImportAndFactoryMs: 0,
            contractValidationMs: 0,
            totalMs: nonnegativeDurationV2(startedAtMs),
          })
        : cold,
    });
  }

  async #loadUncached(
    ticket: StudioModelWorkerReleaseTicketV2,
    canonicalTicket: string,
  ): Promise<ResolvedExactModelRuntimeV2> {
    const totalStartedAtMs = monotonicNowV2();
    const fetchStartedAtMs = monotonicNowV2();
    const response = await this.#fetchArtifact(ticket.artifactUrl);
    if (!response.ok) {
      throw new Error(`Exact model artifact fetch failed (${response.status})`);
    }
    const buffer = await response.arrayBuffer();
    const artifactFetchMs = nonnegativeDurationV2(fetchStartedAtMs);
    if (buffer.byteLength === 0 || buffer.byteLength > MAXIMUM_EXACT_MODEL_ARTIFACT_BYTES_V2) {
      throw new Error("Exact model artifact size is outside the supported range");
    }
    const importStartedAtMs = monotonicNowV2();
    const namespace = await importExactExecutableArtifactModuleV2(
      new Uint8Array(buffer),
    );
    const exportName = "createCircleHeartExactModelReleaseV1";
    const factory = namespace[exportName];
    if (typeof factory !== "function") {
      throw new Error(`Exact model artifact does not export ${exportName}`);
    }
    const produced = await factory();
    const moduleImportAndFactoryMs = nonnegativeDurationV2(importStartedAtMs);
    const validationStartedAtMs = monotonicNowV2();
    const release = exactExecutableReleaseRecordV2(produced);
    if (
      studioCanonicalJsonStringify(release.manifest)
      !== studioCanonicalJsonStringify(ticket.manifest)
    ) {
      throw new Error("Exact model artifact manifest does not match the registry");
    }
    const analysis = resolveRegisteredAnalysisMethodsV1(
      ticket.surfaceRelease,
    );
    const modelSurface = materializeModelSurfaceV1({
      kernel: ticket.manifest,
      surfaceRelease: ticket.surfaceRelease,
      analysis,
    });
    for (const requiredCapability of [
      STUDIO_EXACT_PRESENTATION_BATCH_CAPABILITY_V1,
      EXECUTION_PLAN_TYPED_AUTHORITY_BINDING_V1_CAPABILITY,
    ]) {
      if (!ticket.manifest.capabilities.includes(requiredCapability)) {
        throw new Error(
          `Exact model manifest omits required runtime capability ${requiredCapability}`,
        );
      }
    }
    const runtime = admitExactModelExecutableRuntimeV2(
      release.executables,
      modelSurface.exactContract,
      modelSurface.contract,
    );
    const contractValidationMs = nonnegativeDurationV2(validationStartedAtMs);
    this.#coldTimingByTicket.set(canonicalTicket, Object.freeze({
      cacheHit: false,
      artifactBytes: buffer.byteLength,
      artifactFetchMs,
      moduleImportAndFactoryMs,
      contractValidationMs,
      totalMs: nonnegativeDurationV2(totalStartedAtMs),
    }));
    return Object.freeze({ ...runtime, exactNumericalExports: namespace });
  }
}

function monotonicNowV2(): number {
  return globalThis.performance?.now() ?? Date.now();
}

function nonnegativeDurationV2(startedAtMs: number): number {
  return Math.max(0, monotonicNowV2() - startedAtMs);
}

function exactExecutableReleaseRecordV2(
  value: unknown,
): Readonly<{
  manifest: ExactModelKernelManifestV3;
  executables: RegisteredModelExecutableBundleV2;
}> {
  if (
    value === null
    || typeof value !== "object"
    || Array.isArray(value)
    || (Object.getPrototypeOf(value) !== Object.prototype
      && Object.getPrototypeOf(value) !== null)
  ) {
    throw new Error("Exact model artifact factory must return a plain object");
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  const expected = ["executables", "manifest"];
  if (
    keys.length !== expected.length
    || keys.some((key, index) => key !== expected[index])
  ) {
    throw new Error(
      `Exact model artifact release must contain exactly ${expected.join(", ")}`,
    );
  }
  for (const key of expected) {
    const descriptor = Object.getOwnPropertyDescriptor(record, key);
    if (
      descriptor === undefined
      || !("value" in descriptor)
      || !descriptor.enumerable
    ) {
      throw new Error(`Exact model artifact release ${key} must be data`);
    }
  }
  return Object.freeze({
    manifest: record.manifest as ExactModelKernelManifestV3,
    executables: record.executables as RegisteredModelExecutableBundleV2,
  });
}

export async function fetchImmutableExactModelArtifactV2(
  url: string,
): Promise<ArtifactFetchResponseV2> {
  return fetch(url, {
    // Exact artifact URLs are immutable model-release identities. `force-cache`
    // also lets historical objects uploaded before the one-year metadata policy
    // reuse a stored response instead of revalidating the same 2 MB bytes for
    // every dedicated Scenario Worker.
    cache: "force-cache",
    credentials: "omit",
    redirect: "error",
  });
}

const defaultArtifactFetchV2 = fetchImmutableExactModelArtifactV2;

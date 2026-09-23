import { describeStudioAuthoringProtocolV1 } from "@/studio/application/authoring/StudioAuthoringCommandV1";
import type { SupabaseClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ExperimentContentV2 } from "@/studio/contracts/v2/content";
import { STUDIO_ARTICLE_DRAFT_V2_SCHEMA_ID } from
  "@/studio/contracts/v2/article";
import {
  ensureStudioAuthenticatedForSaveV1,
  studioAuthIdentityForUserV1,
} from "@/studio/infrastructure/supabase/StudioSupabaseAuthV1";
import {
  readStudioSupabaseConfigurationV1,
} from "@/studio/infrastructure/supabase/StudioSupabaseClientV1";
import {
  StudioSupabaseContentRepositoryV1,
  StudioSupabaseMutationAcknowledgedErrorV1,
} from "@/studio/infrastructure/supabase/StudioSupabaseContentRepositoryV1";
import {
  StudioExactModelUnavailableErrorV1,
  StudioSupabaseModelReleaseResolverV1,
} from "@/studio/infrastructure/model/StudioSupabaseModelReleaseResolverV1";
import {
  StudioSupabaseModelSurfaceResolverV1,
} from "@/studio/infrastructure/model/StudioSupabaseModelSurfaceResolverV1";
import {
  STUDIO_MODEL_SURFACE_RELEASE_V1_SCHEMA_ID,
} from "@/studio/contracts/v2/modelSurface";
import standardClientDescriptorV1 from
  "@/data/model-releases/CurrentModelReleaseV1";
import standardSurfaceReleaseV1 from
  "@/studio/integrations/mainWireIntegratedV3/MainWireIntegratedStudioStaticCaseSurfaceV1";
import {
  uploadImmutableExactModelArtifactV1,
} from "@/tools/registry/ImmutableExactModelArtifactStorageV1";
import {
  parseMainWireModelPublishArgumentsV3,
  prepareMainWireModelPublicationV1,
} from "@/tools/registry/publishMainWireIntegratedStudioModelV3";
import {
  loadModelSurfacePublicationManifestV1,
  parseModelSurfacePublishArgumentsV1,
} from "@/tools/registry/publishModelSurfaceReleaseV1";
import currentClient from
  "@/data/model-releases/CurrentModelReleaseV1";
import currentSurface from
  "@/studio/integrations/mainWireIntegratedV3/MainWireIntegratedStudioStaticCaseSurfaceV5";

const TEST_ARTIFACT_REVISION_ID_V1 = "a".repeat(64);

describe("Studio Supabase boundary V1", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("binds publication to the current exact model, fixture, lock, artifact and Surface", async () => {
    const fetchV1 = vi.fn();
    vi.stubGlobal("fetch", fetchV1);
    const directory = "data/model-releases/standard74/";
    const input = {
      artifact: readFileSync(directory
        + "artifact.mjs.txt"),
      lockJson: readFileSync(directory
        + "publication.json", "utf8"),
      expectedModelId: currentClient.manifest.modelId,
    };
    const prepared = await prepareMainWireModelPublicationV1(input);
    expect(prepared.manifest).toEqual(currentClient.manifest);
    expect(prepared.defaultFixture).toEqual(currentClient.defaultFixture);
    expect(prepared.artifactSha256).toBe(prepared.lock.artifactSha256);
    await expect(prepareMainWireModelPublicationV1({
      ...input, expectedModelId: "model/retired",
    })).rejects.toThrow(/modelId/);
    await expect(prepareMainWireModelPublicationV1({
      ...input,
      lockJson: JSON.stringify({ ...JSON.parse(input.lockJson), modelId: "wrong" }),
    })).rejects.toThrow(/complete qualification/);
    await expect(prepareMainWireModelPublicationV1({
      ...input, artifact: new Uint8Array([1, 2, 3]),
    })).rejects.toThrow(/artifact differs/);
    await expect(prepareMainWireModelPublicationV1({
      ...input, lockJson: "null",
    })).rejects.toThrow(/complete qualification/);
    expect(fetchV1).not.toHaveBeenCalled();
  });

  it("requires an explicit current model and supports a credential-free dry run", () => {
    const args = ["--project-ref", "a".repeat(20), "--stage", "stable",
      "--model-id", currentClient.manifest.modelId];
    expect(parseMainWireModelPublishArgumentsV3([...args, "--dry-run"]))
      .toEqual({ projectRef: "a".repeat(20), stage: "stable",
        modelId: currentClient.manifest.modelId, dryRun: true });
    expect(parseMainWireModelPublishArgumentsV3(args).dryRun).toBe(false);
    expect(() => parseMainWireModelPublishArgumentsV3(args.slice(0, 4)))
      .toThrow(/explicit current/);
    expect(() => parseMainWireModelPublishArgumentsV3([
      ...args.slice(0, 5), "model/retired",
    ])).toThrow(/explicit current/);
    for (const extra of [["--dry-run", "--dry-run"], ["--stage", "dev"], ["--unknown"]]) {
      expect(() => parseMainWireModelPublishArgumentsV3([...args, ...extra]))
        .toThrow(/Usage/);
    }
  });

  it("publishes the committed TypeScript Surface without a duplicate JSON manifest", async () => {
    const fetchV1 = vi.fn();
    vi.stubGlobal("fetch", fetchV1);
    const directory = "studio/integrations/mainWireIntegratedV3/";
    expect(await loadModelSurfacePublicationManifestV1(directory
      + "MainWireIntegratedStudioStaticCaseSurfaceV5.ts"))
      .toEqual(currentSurface);
    await expect(loadModelSurfacePublicationManifestV1("../outside.json"))
      .rejects.toThrow(/inside the repository/);
    await expect(loadModelSurfacePublicationManifestV1("AGENTS.md"))
      .rejects.toThrow(/JSON or TypeScript/);
    await expect(loadModelSurfacePublicationManifestV1("package.json"))
      .rejects.toThrow();
    await expect(loadModelSurfacePublicationManifestV1(
      "studio/integrations/mainWireIntegratedV3/MainWireIntegratedStudioStaticCaseSurfaceV1.ts",
    )).rejects.toThrow(/Only the current Model Surface/);
    expect(fetchV1).not.toHaveBeenCalled();
  });

  it("parses the Surface dry run without accepting duplicate or unknown switches", () => {
    const args = ["--project-ref", "a".repeat(20), "--manifest", "surface.ts"];
    expect(parseModelSurfacePublishArgumentsV1([...args, "--dry-run"]))
      .toEqual({ projectRef: "a".repeat(20), manifestPath: "surface.ts",
        stage: "dev", dryRun: true });
    expect(parseModelSurfacePublishArgumentsV1(args).dryRun).toBe(false);
    for (const extra of [["--dry-run", "--dry-run"], ["--manifest", "other.ts"], ["--unknown"]]) {
      expect(() => parseModelSurfacePublishArgumentsV1([...args, ...extra]))
        .toThrow(/Usage/);
    }
    expect(() => parseModelSurfacePublishArgumentsV1([...args, "--stage", "retired"]))
      .toThrow(/retired/);
  });

  it("accepts only a complete public browser configuration", () => {
    expect(readStudioSupabaseConfigurationV1({})).toBeNull();
    expect(() => readStudioSupabaseConfigurationV1({
      VITE_SUPABASE_URL: "https://project.supabase.co",
    })).toThrow(/both URL and publishable key/);
    expect(() => readStudioSupabaseConfigurationV1({
      VITE_SUPABASE_URL: "https://project.supabase.co",
      VITE_SUPABASE_PUBLISHABLE_KEY: "sb_secret_never-in-browser",
    })).toThrow(/publishable key/);
    expect(readStudioSupabaseConfigurationV1({
      VITE_SUPABASE_URL: "https://project.supabase.co/path",
      VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_browser",
    })).toEqual({
      url: "https://project.supabase.co",
      publishableKey: "sb_publishable_browser",
    });
  });

  it("uploads exact artifacts with one-year cache metadata", async () => {
    const fetchV1 = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 404 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    await uploadImmutableExactModelArtifactV1({
      artifact: new Uint8Array([1, 2, 3]),
      artifactSha256:
        "039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81",
      baseUrl: "https://project.supabase.co",
      objectName: "model/standard.mjs",
      secret: "service-role",
    }, fetchV1);

    expect(fetchV1).toHaveBeenNthCalledWith(
      2,
      "https://project.supabase.co/storage/v1/object/model-releases/model/standard.mjs",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "cache-control": "max-age=31536000",
          "content-type": "text/javascript",
          "x-upsert": "false",
        }),
        body: expect.any(Blob),
      }),
    );
  });

  it("rejects a local artifact whose declared digest is wrong", async () => {
    const fetchV1 = vi.fn();
    await expect(uploadImmutableExactModelArtifactV1({
      artifact: new Uint8Array([1, 2, 3]),
      artifactSha256: "0".repeat(64),
      baseUrl: "https://project.supabase.co",
      objectName: "model/standard.mjs",
      secret: "service-role",
    }, fetchV1)).rejects.toThrow(/local exact model artifact digest/i);
    expect(fetchV1).not.toHaveBeenCalled();
  });

  it("repairs only byte-identical exact artifact cache metadata", async () => {
    const artifact = new Uint8Array([1, 2, 3]);
    const input = {
      artifact,
      artifactSha256:
        "039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81",
      baseUrl: "https://project.supabase.co",
      objectName: "model/standard.mjs",
      secret: "service-role",
    } as const;
    const repairFetch = vi.fn()
      .mockResolvedValueOnce(new Response(artifact, {
        status: 200,
        headers: { "cache-control": "no-cache" },
      }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    await uploadImmutableExactModelArtifactV1(input, repairFetch);
    expect(repairFetch).toHaveBeenNthCalledWith(
      2,
      "https://project.supabase.co/storage/v1/object/copy",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "content-type": "application/json",
          "x-upsert": "true",
        }),
      }),
    );
    const repairBody = JSON.parse(
      String(repairFetch.mock.calls[1]?.[1]?.body),
    ) as Record<string, unknown>;
    expect(repairBody).toEqual({
      bucketId: "model-releases",
      sourceKey: "model/standard.mjs",
      destinationKey: "model/standard.mjs",
      metadata: {
        cacheControl: "max-age=31536000",
        mimetype: "text/javascript",
      },
      copyMetadata: false,
    });

    const mismatchFetch = vi.fn().mockResolvedValueOnce(new Response(
      new Uint8Array([9, 9, 9]),
      { status: 200 },
    ));
    await expect(uploadImmutableExactModelArtifactV1(input, mismatchFetch))
      .rejects.toThrow(/different bytes/);
    expect(mismatchFetch).toHaveBeenCalledOnce();
  });

  it("does not rewrite a byte-identical artifact whose one-year TTL is already set", async () => {
    const artifact = new Uint8Array([1, 2, 3]);
    const fetchV1 = vi.fn().mockResolvedValueOnce(new Response(artifact, {
      status: 200,
      headers: { "cache-control": "public, max-age=31536000" },
    }));
    await uploadImmutableExactModelArtifactV1({
      artifact,
      artifactSha256:
        "039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81",
      baseUrl: "https://project.supabase.co",
      objectName: "model/standard.mjs",
      secret: "service-role",
    }, fetchV1);
    expect(fetchV1).toHaveBeenCalledOnce();
  });

  it("resolves a hash-free exact model ticket and owns its launch fixture", async () => {
    const call = vi.fn().mockResolvedValue({
      data: [{
        model_id: standardClientDescriptorV1.manifest.modelId,
        model_family_id: standardClientDescriptorV1.manifest.modelFamilyId,
        display_name: "Main Wire Standard",
        manifest: standardClientDescriptorV1.manifest,
        artifact_revision_id: TEST_ARTIFACT_REVISION_ID_V1,
        artifact_path: "model-releases/exact/model.mjs",
        module_abi: "circleheart-exact-model-esm-v1",
        default_fixture: standardClientDescriptorV1.defaultFixture,
        stage: "stable",
      }],
      error: null,
    });
    const surfaceCall = vi.fn().mockResolvedValue({
      data: [{ manifest: standardSurfaceReleaseV1, stage: "stable" }],
      error: null,
    });
    const resolver = new StudioSupabaseModelReleaseResolverV1({
      rpc: { call },
      supabaseOrigin: "https://project.supabase.co/path-is-ignored",
      surfaceResolver: new StudioSupabaseModelSurfaceResolverV1({
        rpc: { call: surfaceCall },
      }),
    });
    const surfacePin = {
      kind: "release" as const,
      surfaceSeriesId: standardSurfaceReleaseV1.surfaceSeriesId,
      surfaceReleaseId: standardSurfaceReleaseV1.surfaceReleaseId,
    };

    const first = resolver.resolveExactModel(
      standardClientDescriptorV1.manifest.modelId,
      surfacePin,
    );
    expect(resolver.resolveExactModel(
      standardClientDescriptorV1.manifest.modelId,
      surfacePin,
    )).toBe(first);
    const resolved = await first;
    expect(resolved).toMatchObject({
      defaultFixture: standardClientDescriptorV1.defaultFixture,
      stage: "stable",
      ticket: {
        modelId: standardClientDescriptorV1.manifest.modelId,
        artifactRevisionId: TEST_ARTIFACT_REVISION_ID_V1,
        moduleAbi: "circleheart-exact-model-esm-v1",
        surfaceRelease: {
          surfaceReleaseId: standardSurfaceReleaseV1.surfaceReleaseId,
        },
        artifactUrl:
          "https://project.supabase.co/storage/v1/object/public/model-releases/exact/model.mjs",
      },
    });
    expect(resolved.ticket).not.toHaveProperty("artifactSha256");
    expect(resolved.ticket).not.toHaveProperty("registryFingerprint");
    expect(Object.isFrozen(resolved.defaultFixture)).toBe(true);
    expect(call).toHaveBeenCalledOnce();

    resolver.invalidate();
    await resolver.resolveExactModel(
      standardClientDescriptorV1.manifest.modelId,
      surfacePin,
    );
    expect(call).toHaveBeenCalledTimes(2);
  });

  it("resolves one atomic Standard ABI model and Surface bundle", async () => {
    const call = vi.fn().mockResolvedValue({
      data: [{
        bundle_version: 7,
        model_id: standardClientDescriptorV1.manifest.modelId,
        model_family_id: standardClientDescriptorV1.manifest.modelFamilyId,
        display_name: "Main Wire Standard",
        manifest: standardClientDescriptorV1.manifest,
        artifact_revision_id: TEST_ARTIFACT_REVISION_ID_V1,
        artifact_path: "model-releases/exact/standard.mjs",
        module_abi: "circleheart-exact-model-esm-v1",
        default_fixture: standardClientDescriptorV1.defaultFixture,
        model_stage: "stable",
        surface_release_id: standardSurfaceReleaseV1.surfaceReleaseId,
        surface_manifest: standardSurfaceReleaseV1,
        surface_stage: "stable",
      }],
      error: null,
    });
    const resolver = new StudioSupabaseModelReleaseResolverV1({
      rpc: { call },
      supabaseOrigin: "https://project.supabase.co",
    });

    const resolved = await resolver.resolveActiveBundle();

    expect(resolved).toMatchObject({
      activeBundleVersion: 7,
      stage: "stable",
      surfaceStage: "stable",
      ticket: {
        modelId: standardClientDescriptorV1.manifest.modelId,
        manifest: {
          modelFamilyId: standardClientDescriptorV1.manifest.modelFamilyId,
        },
        surfaceRelease: {
          surfaceReleaseId: standardSurfaceReleaseV1.surfaceReleaseId,
        },
      },
    });
    expect(call).toHaveBeenCalledWith("get_active_model_bundle_v2", {});
  });

  it("refreshes an implementation revision without changing modelId", async () => {
    let artifactRevisionId = "a".repeat(64);
    const call = vi.fn(async () => ({
      data: [{
        model_id: standardClientDescriptorV1.manifest.modelId,
        model_family_id: standardClientDescriptorV1.manifest.modelFamilyId,
        display_name: "Main Wire Standard",
        manifest: standardClientDescriptorV1.manifest,
        artifact_revision_id: artifactRevisionId,
        artifact_path:
          `model-releases/exact/${artifactRevisionId}/standard.mjs`,
        module_abi: "circleheart-exact-model-esm-v1",
        default_fixture: standardClientDescriptorV1.defaultFixture,
        stage: "stable",
      }],
      error: null,
    }));
    const surfaceCall = vi.fn().mockResolvedValue({
      data: [{ manifest: standardSurfaceReleaseV1, stage: "stable" }],
      error: null,
    });
    const resolver = new StudioSupabaseModelReleaseResolverV1({
      rpc: { call },
      supabaseOrigin: "https://project.supabase.co",
      surfaceResolver: new StudioSupabaseModelSurfaceResolverV1({
        rpc: { call: surfaceCall },
      }),
    });
    const pin = {
      kind: "release" as const,
      surfaceSeriesId: standardSurfaceReleaseV1.surfaceSeriesId,
      surfaceReleaseId: standardSurfaceReleaseV1.surfaceReleaseId,
    };

    const first = await resolver.resolveExactModel(
      standardClientDescriptorV1.manifest.modelId,
      pin,
    );
    artifactRevisionId = "b".repeat(64);
    resolver.invalidate();
    const next = await resolver.resolveExactModel(
      standardClientDescriptorV1.manifest.modelId,
      pin,
    );

    expect(first.ticket.modelId).toBe(next.ticket.modelId);
    expect(first.ticket.artifactRevisionId).toBe("a".repeat(64));
    expect(next.ticket.artifactRevisionId).toBe("b".repeat(64));
    expect(next.ticket.artifactUrl).toContain("b".repeat(64));
  });

  it("keeps an old exact release pinned after the active bundle moves", async () => {
    const modelA = standardClientDescriptorV1.manifest.modelId;
    const modelB = `${modelA}-successor-b`;
    const modelC = `${modelB}-successor-test`;
    const manifestA = {
      ...JSON.parse(JSON.stringify(standardClientDescriptorV1.manifest)),
      modelId: modelA,
    };
    const manifestB = { ...manifestA, modelId: modelB };
    const manifestC = { ...manifestB, modelId: modelC };
    const row = (
      modelId: string,
      manifest: unknown,
      moduleAbi: string,
    ) => ({
      model_id: modelId,
      model_family_id: standardClientDescriptorV1.manifest.modelFamilyId,
      display_name: "Main Wire",
      manifest,
      artifact_revision_id: TEST_ARTIFACT_REVISION_ID_V1,
      artifact_path: `model-releases/exact/${encodeURIComponent(modelId)}.mjs`,
      module_abi: moduleAbi,
      default_fixture: standardClientDescriptorV1.defaultFixture,
      stage: "stable",
    });
    const activeRow = (releaseRow: ReturnType<typeof row>, version: number) => ({
      ...releaseRow,
      bundle_version: version,
      model_stage: "stable",
      surface_release_id: standardSurfaceReleaseV1.surfaceReleaseId,
      surface_manifest: standardSurfaceReleaseV1,
      surface_stage: "stable",
    });
    let bundleRow = activeRow(row(
      modelB,
      manifestB,
      "circleheart-exact-model-esm-v1",
    ), 0);
    const call = vi.fn(async (
      functionName: "get_model_release_v2" | "get_active_model_bundle_v2",
      parameters: Readonly<Record<string, string>>,
    ) => ({
      data: [functionName === "get_active_model_bundle_v2"
        ? bundleRow
          : parameters.p_model_id === modelA
          ? row(modelA, manifestA, "circleheart-exact-model-esm-v1")
          : parameters.p_model_id === modelB
            ? row(modelB, manifestB, "circleheart-exact-model-esm-v1")
            : row(modelC, manifestC, "circleheart-exact-model-esm-v1")],
      error: null,
    }));
    const resolver = new StudioSupabaseModelReleaseResolverV1({
      rpc: { call },
      supabaseOrigin: "https://project.supabase.co",
      surfaceResolver: new StudioSupabaseModelSurfaceResolverV1({
        rpc: {
          call: vi.fn().mockResolvedValue({
            data: [{ manifest: standardSurfaceReleaseV1, stage: "stable" }],
            error: null,
          }),
        },
      }),
    });

    const exactA = await resolver.resolveExactModel(modelA, {
      kind: "release",
      surfaceSeriesId: standardSurfaceReleaseV1.surfaceSeriesId,
      surfaceReleaseId: standardSurfaceReleaseV1.surfaceReleaseId,
    });
    expect((await resolver.resolveActiveBundle()).ticket.modelId)
      .toBe(modelB);
    bundleRow = activeRow(row(
      modelC,
      manifestC,
      "circleheart-exact-model-esm-v1",
    ), 1);
    expect((await resolver.resolveActiveBundle()).ticket.modelId)
      .toBe(modelC);
    await expect(resolver.resolveExactModel(modelA, {
      kind: "release",
      surfaceSeriesId: standardSurfaceReleaseV1.surfaceSeriesId,
      surfaceReleaseId: standardSurfaceReleaseV1.surfaceReleaseId,
    })).resolves.toBe(exactA);
    expect(exactA.ticket.modelId).toBe(modelA);
  });

  it("reports an unavailable exact release without substituting the active model", async () => {
    const call = vi.fn().mockResolvedValue({ data: [], error: null });
    const resolver = new StudioSupabaseModelReleaseResolverV1({
      rpc: { call },
      supabaseOrigin: "https://project.supabase.co",
    });

    const failure = await resolver.resolveExactModel("model/historical-a", {
      kind: "series",
      surfaceSeriesId: standardSurfaceReleaseV1.surfaceSeriesId,
    })
      .catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(StudioExactModelUnavailableErrorV1);
    expect(failure).toMatchObject({
      modelId: "model/historical-a",
      reason: "not-registered-or-loadable",
    });
    expect(call).toHaveBeenCalledOnce();
    expect(call).toHaveBeenCalledWith(
      "get_model_release_v2",
      { p_model_id: "model/historical-a" },
    );
  });

  it("resolves a Surface manifest separately and rejects a family mismatch", async () => {
    const modelFamilyId = standardClientDescriptorV1.manifest.modelFamilyId;
    const manifest = {
      schemaId: STUDIO_MODEL_SURFACE_RELEASE_V1_SCHEMA_ID,
      surfaceReleaseId: "surface/main-wire-v1",
      surfaceSeriesId: "surface-series/main-wire",
      predecessorSurfaceReleaseId: null,
      modelFamilyId,
      displayName: "Main Wire Surface",
      exposedExactOutputIds: [],
      controlCatalog: [],
      derivedOutputCatalog: [],
      graphCatalog: [],
      knobCatalog: [],
      protocolCatalog: [],
    } as const;
    const call = vi.fn().mockResolvedValue({
      data: [{ manifest, stage: "dev" }],
      error: null,
    });
    const resolver = new StudioSupabaseModelSurfaceResolverV1({ rpc: { call } });

    await expect(
      resolver.resolveExactSurfaceManifest(
        manifest.surfaceReleaseId,
        modelFamilyId,
      ),
    ).resolves.toEqual({
      manifest,
      stage: "dev",
    });
    const resolvedSurface = await resolver.resolveExactSurfaceManifest(
      manifest.surfaceReleaseId,
      modelFamilyId,
    );
    expect(Object.isFrozen(resolvedSurface.manifest)).toBe(true);
    expect(Object.isFrozen(resolvedSurface.manifest.controlCatalog)).toBe(true);
    expect(call).toHaveBeenCalledWith(
      "get_model_surface_release_v1",
      {
        p_surface_release_id: manifest.surfaceReleaseId,
      },
    );

    const wrongFamily = {
      ...manifest,
      surfaceReleaseId: "surface/other-v1",
      modelFamilyId: "model/other-family",
    };
    call.mockResolvedValueOnce({
      data: [{ manifest: wrongFamily, stage: "stable" }],
      error: null,
    });
    await expect(resolver.resolveExactSurfaceManifest(
      wrongFamily.surfaceReleaseId,
      modelFamilyId,
    ))
      .rejects.toThrow(/another model family/);
  });

  it("reopens a mutable Standard Experiment on the latest additive Surface while a Snapshot stays exact", async () => {
    const surfaceV1 = structuredClone(standardSurfaceReleaseV1) as any;
    const surfaceV2 = {
      ...structuredClone(surfaceV1),
      surfaceReleaseId: "circleheart.main-wire.surface.workbench-v2-test",
      predecessorSurfaceReleaseId: surfaceV1.surfaceReleaseId,
      graphCatalog: [...surfaceV1.graphCatalog, {
        graphId: "hemodynamics.pressure.aortic-focus",
        renderer: "sweep",
        seriesCatalog: [{
          kind: "scalar",
          seriesId: "AoP",
          outputId: "hemodynamics.pressure.absolute.Ao",
        }],
        defaultSeriesIds: ["AoP"],
        requiredCapabilities: [
          "output/hemodynamics.pressure.absolute.Ao",
        ],
      }],
    };
    let latestSurface = surfaceV1;
    const surfaceCall = vi.fn(async (
      functionName: string,
      parameters: Readonly<Record<string, string>>,
    ) => ({
      data: [{
        manifest: functionName === "get_model_surface_release_v1"
          ? parameters.p_surface_release_id === surfaceV1.surfaceReleaseId
            ? surfaceV1
            : surfaceV2
          : latestSurface,
        stage: "stable",
      }],
      error: null,
    }));
    const exactCall = vi.fn().mockResolvedValue({
      data: [{
        model_id: standardClientDescriptorV1.manifest.modelId,
        model_family_id: standardClientDescriptorV1.manifest.modelFamilyId,
        display_name: "Main Wire Standard",
        manifest: standardClientDescriptorV1.manifest,
        artifact_revision_id: TEST_ARTIFACT_REVISION_ID_V1,
        artifact_path: "model-releases/exact/standard.mjs",
        module_abi: "circleheart-exact-model-esm-v1",
        default_fixture: standardClientDescriptorV1.defaultFixture,
        stage: "dev",
      }],
      error: null,
    });
    const createResolver = () => new StudioSupabaseModelReleaseResolverV1({
      rpc: { call: exactCall },
      supabaseOrigin: "https://project.supabase.co",
      surfaceResolver: new StudioSupabaseModelSurfaceResolverV1({
        rpc: { call: surfaceCall as any },
      }),
    });
    const seriesPin = {
      kind: "series" as const,
      surfaceSeriesId: surfaceV1.surfaceSeriesId,
    };

    const firstOpen = await createResolver().resolveExactModel(
      standardClientDescriptorV1.manifest.modelId,
      seriesPin,
    );
    expect(firstOpen.ticket.surfaceRelease.surfaceReleaseId)
      .toBe(surfaceV1.surfaceReleaseId);

    latestSurface = surfaceV2;
    const reopened = await createResolver().resolveExactModel(
      standardClientDescriptorV1.manifest.modelId,
      seriesPin,
    );
    expect(reopened.ticket.surfaceRelease.surfaceReleaseId)
      .toBe(surfaceV2.surfaceReleaseId);
    expect(reopened.ticket.surfaceRelease.graphCatalog.some((graph) =>
      graph.graphId === "hemodynamics.pressure.aortic-focus"))
      .toBe(true);
    expect(surfaceCall).toHaveBeenCalledWith(
      "get_model_surface_series_latest_v1",
      {
        p_surface_series_id: surfaceV1.surfaceSeriesId,
        p_model_id: standardClientDescriptorV1.manifest.modelId,
      },
    );

    const frozenSnapshot = await createResolver().resolveExactModel(
      standardClientDescriptorV1.manifest.modelId,
      {
        kind: "release",
        surfaceSeriesId: surfaceV1.surfaceSeriesId,
        surfaceReleaseId: surfaceV1.surfaceReleaseId,
      },
    );
    expect(frozenSnapshot.ticket.surfaceRelease.surfaceReleaseId)
      .toBe(surfaceV1.surfaceReleaseId);
    expect(frozenSnapshot.ticket.surfaceRelease.graphCatalog.some((graph) =>
      graph.graphId === "hemodynamics.pressure.aortic-focus"))
      .toBe(false);
  });

  it("creates an anonymous account only when a Save asks for authentication", async () => {
    const session = { access_token: "token" };
    const getSession = vi.fn().mockResolvedValue({
      data: { session: null },
      error: null,
    });
    const signInAnonymously = vi.fn().mockResolvedValue({
      data: { session },
      error: null,
    });
    const client = {
      auth: { getSession, signInAnonymously },
    } as unknown as SupabaseClient;

    await expect(ensureStudioAuthenticatedForSaveV1(client))
      .resolves.toBe(session);
    expect(getSession).toHaveBeenCalledOnce();
    expect(signInAnonymously).toHaveBeenCalledOnce();
  });

  it("keeps anonymous backend identity out of the visible profile", () => {
    expect(studioAuthIdentityForUserV1({
      id: "anonymous-user",
      is_anonymous: true,
    } as never)).toEqual({ kind: "anonymous", userId: "anonymous-user" });
    expect(studioAuthIdentityForUserV1({
      id: "account-user",
      is_anonymous: false,
      email: "author@example.com",
      user_metadata: { full_name: "Circle Author" },
    } as never)).toMatchObject({
      kind: "account",
      userId: "account-user",
      displayName: "Circle Author",
      email: "author@example.com",
    });
  });

  it("keeps publication metadata in the advertised closed Experiment read contract", async () => {
    const raw = { experiment: { schemaId: "circleheart-studio-experiment-v2", experimentId: "test-experiment", version: 2, content: experimentContentV1() }, title: "Saved",
      createdAt: "2026-09-18T00:00:00.000Z", updatedAt: "2026-09-18T00:00:00.000Z", publishedSnapshotId: "test-snapshot", publicSlug: "test-publication", publishedVersion: 1, publishedAt: "2026-09-18T00:00:00.000Z" };
    const rpc = vi.fn().mockResolvedValue({ data: raw, error: null });
    const repository = new StudioSupabaseContentRepositoryV1({ rpc, auth: { getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: "test-owner" } } }, error: null }) } } as unknown as SupabaseClient);
    const result = await repository.readMyExperiment("test-experiment");
    const schema = (describeStudioAuthoringProtocolV1("experiment.read").actions[0]!.resultSchema as any).oneOf.find((entry: any) => entry.type === "object");
    expect(schema.additionalProperties).toBe(false);
    for (const key of Object.keys(result!)) expect(schema.properties).toHaveProperty(key);
    expect(result).toMatchObject({ publishedVersion: 1, publishedAt: raw.publishedAt });
    expect(schema.properties.publishedVersion.type).toContain("null");
    expect(schema.properties.publishedAt.type).toContain("null");
  });

  it("lets the backend issue the durable Experiment identity on first Save", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        experimentId: "8d8f9f03-e81d-4dc7-8320-7f71367a63c4",
        version: 0,
        title: "Baseline",
        modelId: "model/exact-v3",
        content: experimentContentV1(),
      },
      error: null,
    });
    const client = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: { user: { id: "author" } } },
          error: null,
        }),
      },
      rpc,
    } as unknown as SupabaseClient;
    const repository = new StudioSupabaseContentRepositoryV1(client);

    const saved = await repository.saveExperiment({
      experimentId: null,
      expectedVersion: null,
      title: "Baseline",
      content: experimentContentV1(),
    });

    expect(saved.experimentId).toBe("8d8f9f03-e81d-4dc7-8320-7f71367a63c4");
    expect(rpc).toHaveBeenCalledWith("save_experiment_v1", expect.objectContaining({
      p_experiment_id: null,
      p_expected_version: null,
      p_model_id: "model/exact-v3",
    }));
  });

  it("reads Article visibility back from publication authority after Save", async () => {
    const articleId = "8d8f9f03-e81d-4dc7-8320-7f71367a63c4";
    const rpc = vi.fn()
      .mockResolvedValueOnce({
        data: { articleId, version: 0 },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          schemaId: STUDIO_ARTICLE_DRAFT_V2_SCHEMA_ID,
          tags: [],
          articleId,
          draftVersion: 0,
          visibility: "draft",
          locale: "ja",
          title: "PV loop",
          blocks: [],
        },
        error: null,
      });
    const client = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: { user: { id: "author" } } },
          error: null,
        }),
      },
      rpc,
    } as unknown as SupabaseClient;

    const saved = await new StudioSupabaseContentRepositoryV1(client)
      .saveArticle({
        articleId: null,
        expectedVersion: null,
        article: {
          schemaId: STUDIO_ARTICLE_DRAFT_V2_SCHEMA_ID,
          tags: [],
          articleId: "article/local-command-placeholder",
          draftVersion: 0,
          visibility: "public",
          locale: "ja",
          title: "PV loop",
          blocks: [],
        },
      });

    expect(saved.visibility).toBe("draft");
    expect(rpc).toHaveBeenNthCalledWith(
      2,
      "read_article_v1",
      { p_article_id: articleId },
    );
  });

  it("saves tags with the Article revision and validates tag projections", async () => {
    const articleId = "8d8f9f03-e81d-4dc7-8320-7f71367a63c4";
    const draft = {
      schemaId: STUDIO_ARTICLE_DRAFT_V2_SCHEMA_ID,
      tags: ["前負荷", "PV loop"],
      articleId,
      draftVersion: 3,
      visibility: "draft" as const,
      locale: "ja",
      title: "PV loop",
      blocks: [],
    };
    const rpc = vi.fn()
      .mockResolvedValueOnce({ data: { articleId, version: 4 }, error: null })
      .mockResolvedValueOnce({ data: { ...draft, draftVersion: 4 }, error: null })
      .mockResolvedValueOnce({
        data: [{ tag: "PV loop", articleCount: 3 }, { tag: "前負荷", articleCount: 1 }],
        error: null,
      })
      .mockResolvedValueOnce({ data: [{ tag: "#bad", articleCount: 1 }], error: null })
      .mockResolvedValueOnce({
        data: {
          items: [{
            articleId,
            version: 4,
            visibility: "public",
            locale: "ja",
            title: "PV loop",
            tags: ["PV loop", "PV loop"],
            createdAt: "2026-08-12T00:00:00.000Z",
            updatedAt: "2026-08-12T00:00:00.000Z",
            publicSlug: "article-8d8f",
          }],
          nextCursor: null,
        },
        error: null,
      });
    const client = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: { user: { id: "author" } } },
          error: null,
        }),
      },
      rpc,
    } as unknown as SupabaseClient;
    const repository = new StudioSupabaseContentRepositoryV1(client);

    const saved = await repository.saveArticle({ articleId, expectedVersion: 3, article: draft });
    expect(saved.tags).toEqual(["前負荷", "PV loop"]);
    expect(rpc).toHaveBeenNthCalledWith(1, "save_article_v1", expect.objectContaining({
      p_article_id: articleId,
      p_expected_version: 3,
      p_tags: ["前負荷", "PV loop"],
    }));
    await expect(repository.listPublicArticleTags("ja")).resolves.toEqual([
      { tag: "PV loop", articleCount: 3 },
      { tag: "前負荷", articleCount: 1 },
    ]);
    expect(rpc).toHaveBeenNthCalledWith(3, "list_public_article_tags_v1", { p_locale: "ja", p_limit: 100 });
    await expect(repository.listPublicArticleTags("ja")).rejects.toThrow(/canonical/);
    await expect(repository.listMyArticles()).rejects.toThrow(/repeat a tag/);
    await expect(repository.saveArticle({
      articleId,
      expectedVersion: 4,
      article: { ...draft, tags: ["#前負荷"] },
    })).rejects.toThrow(/tags/);
  });

  it("uploads immutable Article images below the signed-in owner's folder", async () => {
    const upload = vi.fn().mockResolvedValue({ data: {}, error: null });
    const getPublicUrl = vi.fn((path: string) => ({
      data: {
        publicUrl: `https://project.supabase.co/storage/v1/object/public/article-images/${path}`,
      },
    }));
    const from = vi.fn().mockReturnValue({ upload, getPublicUrl });
    const client = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: {
            session: {
              user: { id: "author-id", is_anonymous: false },
            },
          },
          error: null,
        }),
      },
      storage: { from },
    } as unknown as SupabaseClient;
    const file = new File([new Uint8Array([1, 2, 3])], "loop.png", {
      type: "image/png",
    });

    const url = await new StudioSupabaseContentRepositoryV1(client)
      .uploadArticleImage(file);

    expect(from).toHaveBeenCalledWith("article-images");
    expect(upload).toHaveBeenCalledWith(
      expect.stringMatching(/^author-id\/[0-9a-f-]+\.png$/),
      file,
      {
        cacheControl: "31536000",
        contentType: "image/png",
        upsert: false,
      },
    );
    expect(url).toMatch(/\/article-images\/author-id\/.+\.png$/);
  });

  it("reuses the same operation ID when an acknowledged response may have been lost", async () => {
    const stored = new Map<string, string>();
    vi.stubGlobal("sessionStorage", {
      getItem: (key: string) => stored.get(key) ?? null,
      setItem: (key: string, value: string) => stored.set(key, value),
      removeItem: (key: string) => stored.delete(key),
    });
    const rpc = vi.fn()
      .mockResolvedValueOnce({
        data: null,
        error: new Error("network response lost"),
      })
      .mockResolvedValueOnce({
        data: {
          experimentId: "8d8f9f03-e81d-4dc7-8320-7f71367a63c4",
          version: 0,
        },
        error: null,
      });
    const client = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: { user: { id: "author" } } },
          error: null,
        }),
      },
      rpc,
    } as unknown as SupabaseClient;
    const command = {
      experimentId: null,
      expectedVersion: null,
      title: "Baseline",
      content: experimentContentV1(),
    } as const;

    await expect(
      new StudioSupabaseContentRepositoryV1(client).saveExperiment(command),
    ).rejects.toThrow(
      /network response lost/,
    );
    // A fresh repository instance represents a reload in the same browser
    // tab; session storage must carry the unacknowledged operation UUID.
    await expect(
      new StudioSupabaseContentRepositoryV1(client).saveExperiment(command),
    ).resolves.toMatchObject({
      experimentId: "8d8f9f03-e81d-4dc7-8320-7f71367a63c4",
      version: 0,
      content: command.content,
    });

    const firstOperationId = rpc.mock.calls[0]?.[1]?.p_operation_id;
    const retriedOperationId = rpc.mock.calls[1]?.[1]?.p_operation_id;
    expect(firstOperationId).toEqual(expect.any(String));
    expect(retriedOperationId).toBe(firstOperationId);
    expect(stored.size).toBe(0);
  });

  it("lets a restarted AI command replay one fixed semantic operation UUID", async () => {
    const operationId = "44444444-4444-4444-8444-444444444444";
    const rpc = vi.fn()
      .mockResolvedValueOnce({ data: null, error: new Error("response lost") })
      .mockResolvedValueOnce({
        data: {
          experimentId: "8d8f9f03-e81d-4dc7-8320-7f71367a63c4",
          version: 0,
        },
        error: null,
      });
    const client = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: { user: { id: "author" } } },
          error: null,
        }),
      },
      rpc,
    } as unknown as SupabaseClient;
    const command = {
      experimentId: null,
      expectedVersion: null,
      title: "Baseline",
      content: experimentContentV1(),
    } as const;

    await expect(new StudioSupabaseContentRepositoryV1(client, {
      fixedMutationOperationId: operationId,
    }).saveExperiment(command)).rejects.toThrow(/response lost/);
    await expect(new StudioSupabaseContentRepositoryV1(client, {
      fixedMutationOperationId: operationId,
    }).saveExperiment(command)).resolves.toMatchObject({ version: 0 });

    expect(rpc.mock.calls.map((call) => call[1]?.p_operation_id))
      .toEqual([operationId, operationId]);
  });

  it("marks an invalid acknowledged mutation response as durably committed", async () => {
    const client = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: { user: { id: "author" } } },
          error: null,
        }),
      },
      rpc: vi.fn().mockResolvedValue({
        data: { experimentId: null, version: 0 },
        error: null,
      }),
    } as unknown as SupabaseClient;

    const result = new StudioSupabaseContentRepositoryV1(client)
      .saveExperiment({
        experimentId: null,
        expectedVersion: null,
        title: "Baseline",
        content: experimentContentV1(),
      });
    await expect(result).rejects.toBeInstanceOf(
      StudioSupabaseMutationAcknowledgedErrorV1,
    );
    await expect(result).rejects.toMatchObject({
      authoringCommitState: "confirmed",
    });
  });

  it("reads one actor-scoped authoring operation receipt", async () => {
    const operationId = "44444444-4444-4444-8444-444444444444";
    const rpc = vi.fn().mockResolvedValue({
      data: {
        operationId,
        operationKind: "save-experiment-v1",
        status: "committed",
        result: {
          experimentId: "8d8f9f03-e81d-4dc7-8320-7f71367a63c4",
          version: 0,
        },
        createdAt: "2026-08-11T00:00:00.000Z",
        completedAt: "2026-08-11T00:00:01.000Z",
      },
      error: null,
    });
    const client = { rpc } as unknown as SupabaseClient;

    await expect(new StudioSupabaseContentRepositoryV1(client)
      .readMyAuthoringOperationReceipt(operationId)).resolves.toEqual({
        operationId,
        operationKind: "save-experiment-v1",
        status: "committed",
        result: {
          experimentId: "8d8f9f03-e81d-4dc7-8320-7f71367a63c4",
          version: 0,
        },
        createdAt: "2026-08-11T00:00:00.000Z",
        completedAt: "2026-08-11T00:00:01.000Z",
      });
    expect(rpc).toHaveBeenCalledWith(
      "read_my_authoring_operation_receipt_v1",
      { p_operation_id: operationId },
    );
  });

});

function experimentContentV1(): ExperimentContentV2 {
  return {
    modelId: "model/exact-v3",
    surfaceSeriesId: standardSurfaceReleaseV1.surfaceSeriesId,
    scenarios: [{
      scenarioId: "scenario/baseline",
      label: "Baseline",
      capture: {
        fixture: { control: 1 },
        checkpoint: {
          acceptedRevision: 4,
          acceptedTimeSec: 0.008,
          payload: { state: [1, 2, 3] },
        },
      },
    }],
    surface: {
      graphPanes: [{
        paneId: "pane/waveform",
        role: "graph",
        label: "Waveform",
        order: 0,
        priority: 10,
        graphId: "graph/waveform",
        scenarioScope: { mode: "visible-scenarios" },
        excludedTraces: [],
        windowSec: 2,
        series: [],
      }],
      outputPanes: [],
      controlPanes: [],
      note: { text: "" },
    },
  };
}

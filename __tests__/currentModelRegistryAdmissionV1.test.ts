import { afterEach, describe, expect, it, vi } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { build } from "vite";
import * as artifactLoader from "@/runtime/ExactExecutableArtifactModuleLoaderV2";
import type { RegisteredModelExecutableBundleV2 } from "@/studio/contracts/v2/executable";
import type { ExactModelKernelManifestV3 } from "@/studio/contracts/v2/modelSurface";
import {
  CURRENT_MODEL_PUBLICATION_FILES_V1 as files,
  prepareCurrentModelPublicationV1,
} from "@/tools/registry/CurrentModelRegistryAdmissionV1";
import {
  CURRENT_MODEL_REVIEWED_SOURCE_COMMIT_V1 as sourceCommit,
  rebuildReviewedCurrentModelArtifactV1,
} from "@/tools/registry/verifyCurrentModelPublicationV1";

vi.mock("vite", () => ({ build: vi.fn() }));
const root = process.cwd();
const artifact = readFileSync(resolve(root, files.artifact));
const lockJson = readFileSync(resolve(root, files.lock), "utf8");
const modelId = JSON.parse(lockJson).modelId as string;
afterEach(() => vi.restoreAllMocks());

describe("frozen production model admission", () => {
  it("validates all own captures using the authenticated artifact factory", async () => {
    const namespace = await artifactLoader.importExactExecutableArtifactModuleV2(artifact);
    const factory = namespace.createCircleHeartExactModelReleaseV1 as () => {
      manifest: ExactModelKernelManifestV3; executables: RegisteredModelExecutableBundleV2;
    };
    const exact = factory();
    const validateCapture = vi.fn(exact.executables.captureAdapter.validateCapture.bind(exact.executables.captureAdapter));
    const frozenFactory = vi.fn(() => ({ ...exact, executables: {
      ...exact.executables, captureAdapter: { ...exact.executables.captureAdapter, validateCapture },
    } }));
    vi.spyOn(artifactLoader, "importExactExecutableArtifactModuleV2")
      .mockResolvedValue({ ...namespace, createCircleHeartExactModelReleaseV1: frozenFactory });
    const admitted = await prepareCurrentModelPublicationV1(root, { artifact, lockJson, expectedModelId: modelId });
    expect(frozenFactory).toHaveBeenCalledOnce();
    expect(validateCapture).toHaveBeenCalledTimes(4);
    expect(admitted.manifest).toBe(exact.manifest);
    expect(admitted.lock.artifactRevisionId).toBe(JSON.parse(lockJson).artifactRevisionId);
  });

  it("rejects modified bytes and lock evidence before executing an artifact", async () => {
    const load = vi.spyOn(artifactLoader, "importExactExecutableArtifactModuleV2");
    const changed = Buffer.from(artifact);
    changed[0] ^= 1;
    await expect(prepareCurrentModelPublicationV1(root, { artifact: changed, lockJson, expectedModelId: modelId }))
      .rejects.toThrow("artifact differs from qualification");
    await expect(prepareCurrentModelPublicationV1(root, { artifact, expectedModelId: modelId,
      lockJson: JSON.stringify({ ...JSON.parse(lockJson), artifactSha256: "0".repeat(64) }) }))
      .rejects.toThrow("admission lock differs");
    expect(load).not.toHaveBeenCalled();
  });

  it("builds from the pinned source and cleans its archive after success and mismatched output", async () => {
    const archivedRoots: string[] = [];
    const sourcePath = "engine/vnext/MainWireStaticCaseSessionV1.ts";
    const expectedSource = execFileSync("git", ["show", `${sourceCommit}:${sourcePath}`], { cwd: root }).toString();
    let matches = true;
    vi.mocked(build).mockImplementation(async (options) => {
      const archivedRoot = options!.root!;
      archivedRoots.push(archivedRoot);
      expect(archivedRoot).not.toBe(root);
      expect(readFileSync(resolve(archivedRoot, sourcePath), "utf8")).toBe(expectedSource);
      expect(readFileSync(resolve(archivedRoot, files.artifact))).toEqual(artifact);
      expect(options!.resolve!.alias).toEqual({ "@": archivedRoot });
      return { output: [{ type: "chunk", code: matches ? artifact.toString() : "mismatched", imports: [], dynamicImports: [] }] } as never;
    });
    expect(await rebuildReviewedCurrentModelArtifactV1(root)).toEqual(artifact);
    matches = false;
    await expect(rebuildReviewedCurrentModelArtifactV1(root)).rejects.toThrow("Reviewed source differs");
    expect(archivedRoots).toHaveLength(2);
    for (const archivedRoot of archivedRoots) expect(existsSync(dirname(archivedRoot))).toBe(false);
  });
});

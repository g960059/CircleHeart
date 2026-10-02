import { build } from "vite";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { prepareCurrentModelPublicationV1, CURRENT_MODEL_PUBLICATION_FILES_V1 as files } from "./CurrentModelRegistryAdmissionV1";
import { MAIN_WIRE_STATIC_CASE_MODEL_ID_V1 } from "@/domain/model/MainWireStaticCaseIdentityV1";

/** Reviewed Standard74 source, including the artifact it produced. HEAD is free
 * to develop successors; changing this pin still requires exact reproduction. */
export const CURRENT_MODEL_REVIEWED_SOURCE_COMMIT_V1 = "1e2d2774ab54e801883dadcdbb7b726bdc0bd850";

export async function rebuildReviewedCurrentModelArtifactV1(root: string): Promise<Buffer> {
  const sourceCommit = CURRENT_MODEL_REVIEWED_SOURCE_COMMIT_V1;
  try {
    execFileSync("git", ["cat-file", "-e", `${sourceCommit}^{commit}`], { cwd: root, stdio: "pipe" });
  } catch {
    throw new Error(`Reviewed model source commit ${sourceCommit} is unavailable; registry verification requires full Git history`);
  }
  const artifact = readFileSync(resolve(root, files.artifact));
  const pinnedArtifact = execFileSync("git", ["show", `${sourceCommit}:${files.artifact}`],
    { cwd: root, maxBuffer: 16 * 1024 * 1024 });
  if (!artifact.equals(pinnedArtifact)) throw new Error("Reviewed source commit does not bind the current exact artifact");
  const temporary = mkdtempSync(resolve(tmpdir(), "circleheart-reviewed-model-"));
  try {
    const sourceRoot = resolve(temporary, "source");
    mkdirSync(sourceRoot);
    const archive = resolve(temporary, "source.tar");
    // All numerical source areas are taken from the same verified commit. A
    // missing dependency fails the build, never falls back to current HEAD.
    execFileSync("git", ["archive", "--format=tar", `--output=${archive}`, sourceCommit,
      "analysis", "domain", "engine", "runtime", "studio", "data", "package.json", "package-lock.json", "tsconfig.json"], { cwd: root });
    execFileSync("tar", ["-xf", archive, "-C", sourceRoot]);
    symlinkSync(resolve(root, "node_modules"), resolve(sourceRoot, "node_modules"), "dir");
    const built = await build({ root: sourceRoot, configFile: false, logLevel: "silent", resolve: { alias: { "@": sourceRoot } },
      define: { "import.meta.env.VITE_CIRCLEHEART_HOT_PATH_INTEGRITY": JSON.stringify("hot-path-lean") },
      build: { target: "es2022", minify: false, sourcemap: false, write: false,
        lib: { entry: resolve(sourceRoot, "studio/integrations/mainWireIntegratedV3/MainWireIntegratedStudioStaticCaseExactModelV1.entry.ts"), formats: ["es"] },
        rollupOptions: { output: { inlineDynamicImports: true } } } });
    const result = Array.isArray(built) ? built[0]! : built;
    const chunks = "output" in result ? result.output.filter(o => o.type === "chunk") : [];
    if (chunks.length !== 1 || chunks[0]!.imports.length || chunks[0]!.dynamicImports.length) throw new Error("Self-contained current artifact required");
    const rebuilt = Buffer.from(chunks[0]!.code);
    if (!rebuilt.equals(artifact)) throw new Error("Reviewed source differs from the reviewed exact artifact");
    return rebuilt;
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
}

export async function verifyCurrentModelPublicationV1(root: string) {
  const artifact = await rebuildReviewedCurrentModelArtifactV1(root);
  const admitted = await prepareCurrentModelPublicationV1(root, { artifact,
    lockJson: readFileSync(resolve(root, files.lock), "utf8"), expectedModelId: MAIN_WIRE_STATIC_CASE_MODEL_ID_V1 });
  return { status: "admitted", modelId: admitted.manifest.modelId,
    artifactRevisionId: admitted.lock.artifactRevisionId, sourceCommit: CURRENT_MODEL_REVIEWED_SOURCE_COMMIT_V1,
    sourceArtifactEqual: true, ownCapturesValidated: admitted.lock.cases.length, writesPerformed: false };
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
  console.log(JSON.stringify(await verifyCurrentModelPublicationV1(root)));
}

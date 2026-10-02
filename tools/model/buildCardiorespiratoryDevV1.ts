import { build } from "esbuild";
import { createHash } from "node:crypto";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createCardiorespiratoryDevReleaseV1, CARDIORESPIRATORY_HOT_PATH_INTEGRITY_TIER_V1 } from "@/studio/integrations/cardiorespiratoryV1/CardiorespiratoryExactModelV1";
import { DEFAULT_CARDIORESPIRATORY_FIXTURE_V1 } from "@/engine/cardiorespiratory/CardiorespiratoryFixtureV1";
import { fingerprintCardiorespiratoryPreparationSourceV1 } from "../scientific/CardiorespiratoryPreparationSourceV1";
import { readCardiorespiratoryPreparedDevInputsV1 } from "./CardiorespiratoryPreparedDevInputsV1";
import { studioCanonicalJsonStringify } from "@/domain/json/CanonicalJson";

// Local ephemeral Model Lab bundle only. No registry credentials, upload,
// production identity, activation pointer, or durable content is involved.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const out = path.join(root, "data/model-releases/cardiorespiratory-dev-v1");
const args = process.argv.slice(2);
if (args.length !== 0 && (args.length !== 2 || args[0] !== "--prepared-directory" || !args[1])) {
  throw new Error("Usage: buildCardiorespiratoryDevV1.ts [--prepared-directory <local archive directory>]");
}
const preparationSource = args.length ? await fingerprintCardiorespiratoryPreparationSourceV1(root) : undefined;
const prepared = preparationSource ? await readCardiorespiratoryPreparedDevInputsV1({
  root, directory: path.resolve(args[1]!), source: preparationSource,
}) : undefined;
const result = await build({ absWorkingDir: root,
  entryPoints: ["studio/integrations/cardiorespiratoryV1/CardiorespiratoryExactModelV1.entry.ts"],
  bundle: true, write: false, platform: "browser", format: "esm", target: "es2022",
  define: { "import.meta.env.VITE_CIRCLEHEART_HOT_PATH_INTEGRITY": JSON.stringify(CARDIORESPIRATORY_HOT_PATH_INTEGRITY_TIER_V1) },
  alias: { "@": root }, metafile: true, legalComments: "none", logLevel: "warning" });
const artifact = result.outputFiles[0].contents;
const artifactRevisionId = createHash("sha256").update(artifact).digest("hex");
const sourceHash = createHash("sha256");
const sourceInputs: { path: string; sha256: string }[] = [];
for (const file of Object.keys(result.metafile!.inputs).sort()) {
  const source = await readFile(path.resolve(root, file));
  sourceHash.update(file).update("\0").update(source).update("\0");
  sourceInputs.push({ path: file, sha256: createHash("sha256").update(source).digest("hex") });
}
const { manifest } = createCardiorespiratoryDevReleaseV1();
if (preparationSource && studioCanonicalJsonStringify(await fingerprintCardiorespiratoryPreparationSourceV1(root))
  !== studioCanonicalJsonStringify(preparationSource)) {
  throw new Error("Preparation source changed during the dev build; prepared evidence cannot be attached");
}
await mkdir(out, { recursive: true });
await writeFile(path.join(out, "artifact.mjs.txt"), artifact);
await writeFile(path.join(out, "bundle.json"), JSON.stringify({
  schemaId: "circleheart-local-dev-model-bundle-v1", stage: "dev", ephemeral: true,
  sourceTreeHash: sourceHash.digest("hex"), sourceInputs, artifactRevisionId, manifest,
  defaultFixture: DEFAULT_CARDIORESPIRATORY_FIXTURE_V1,
  ...(prepared ? { prepared } : {}),
}, null, 2) + "\n");
process.stdout.write(`Local dev bundle ${manifest.modelId}: ${artifactRevisionId}, ${artifact.length} bytes\n`);

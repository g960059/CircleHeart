import { build } from "esbuild";
import { createHash } from "node:crypto";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createCardiorespiratoryDevReleaseV1 } from "@/studio/integrations/cardiorespiratoryV1/CardiorespiratoryExactModelV1";
import { DEFAULT_CARDIORESPIRATORY_FIXTURE_V1 } from "@/engine/cardiorespiratory/CardiorespiratoryFixtureV1";

// Local ephemeral Model Lab bundle only. No registry credentials, upload,
// production identity, activation pointer, or durable content is involved.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const out = path.join(root, "data/model-releases/cardiorespiratory-dev-v1");
const result = await build({ absWorkingDir: root,
  entryPoints: ["studio/integrations/cardiorespiratoryV1/CardiorespiratoryExactModelV1.entry.ts"],
  bundle: true, write: false, platform: "browser", format: "esm", target: "es2022",
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
await mkdir(out, { recursive: true });
await writeFile(path.join(out, "artifact.mjs.txt"), artifact);
await writeFile(path.join(out, "bundle.json"), JSON.stringify({
  schemaId: "circleheart-local-dev-model-bundle-v1", stage: "dev", ephemeral: true,
  sourceTreeHash: sourceHash.digest("hex"), sourceInputs, artifactRevisionId, manifest,
  defaultFixture: DEFAULT_CARDIORESPIRATORY_FIXTURE_V1,
}, null, 2) + "\n");
process.stdout.write(`Local dev bundle ${manifest.modelId}: ${artifactRevisionId}, ${artifact.length} bytes\n`);

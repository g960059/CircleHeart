import { build } from "esbuild";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { studioCanonicalJsonStringify as canonical } from "@/domain/json/CanonicalJson";

export type CardiorespiratoryStartupSourceV1 = Readonly<{
  sha256: string; files: readonly Readonly<{ path: string; sha256: string }>[];
}>;
const sha = (value: string | Uint8Array) => createHash("sha256").update(value).digest("hex");
/** Exact numerical closure and complete startup preparation policy. */
export async function fingerprintCardiorespiratoryStartupSourceV1(root: string): Promise<CardiorespiratoryStartupSourceV1> {
  const result = await build({ absWorkingDir: root, entryPoints: ["engine/cardiorespiratory/CardiorespiratorySessionV1.ts"],
    bundle: true, write: false, metafile: true, platform: "node", format: "esm", target: "es2022", alias: { "@": root },
    logLevel: "silent", define: { "import.meta.env.VITE_CIRCLEHEART_HOT_PATH_INTEGRITY": '"hot-path-lean"' } });
  const paths = [...new Set([...Object.keys(result.metafile!.inputs),
    "analysis/methods/cardiorespiratory/CardiorespiratoryStartupReadinessV1.ts",
    "tools/scientific/prepareCardiorespiratoryStartupPresetsV1.ts",
    "tools/scientific/CardiorespiratoryStartupSourceV1.ts",
    "tools/scientific/CardiorespiratoryStartupCasesV1.ts",
    "data/model-releases/standard74/bundle.json"])].sort();
  const files = await Promise.all(paths.map(async file => ({ path: file, sha256: sha(await readFile(path.join(root, file))) })));
  return { sha256: sha(canonical(files)), files };
}

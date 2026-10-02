import { build } from "esbuild";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { studioCanonicalJsonStringify as canonical } from "@/domain/json/CanonicalJson";

export type CardiorespiratoryPreparationSourceV1 = Readonly<{
  sha256: string; files: readonly Readonly<{ path: string; sha256: string }>[];
}>;
const sha = (value: string | Uint8Array) => createHash("sha256").update(value).digest("hex");
/** Numeric closure plus the complete observer/preparation policy. A caller
 * cannot omit files from an archive and thereby declare it current. */
export async function fingerprintCardiorespiratoryPreparationSourceV1(root: string): Promise<CardiorespiratoryPreparationSourceV1> {
  const result = await build({ absWorkingDir: root, entryPoints: ["engine/cardiorespiratory/CardiorespiratorySessionV1.ts"],
    bundle: true, write: false, metafile: true, platform: "node", format: "esm", target: "es2022", alias: { "@": root },
    logLevel: "silent", define: { "import.meta.env.VITE_CIRCLEHEART_HOT_PATH_INTEGRITY": '"hot-path-lean"' } });
  const paths = [...new Set([...Object.keys(result.metafile!.inputs),
    "analysis/methods/cardiorespiratory/CardiorespiratorySettlementV1.ts",
    "tools/scientific/prepareCardiorespiratoryDevPresetsV1.ts",
    "tools/scientific/CardiorespiratoryPreparationWorkerV1.ts",
    "tools/scientific/CardiorespiratoryPreparationWorkersV1.ts",
    "tools/scientific/CardiorespiratoryPreparationSourceV1.ts"])].sort();
  const files = await Promise.all(paths.map(async file => ({ path: file, sha256: sha(await readFile(path.join(root, file))) })));
  return { sha256: sha(canonical(files)), files };
}

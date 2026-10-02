/** Local, single-history startup preparation. No publication or mint path. */
import { createHash } from "node:crypto";
import { readFile, mkdir, writeFile, rename } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CardiorespiratorySessionV1 } from "@/engine/cardiorespiratory/CardiorespiratorySessionV1";
import { CARDIORESPIRATORY_DEV_MODEL_ID_V1 } from "@/domain/model/CardiorespiratoryIdentityV1";
import { selectHotPathIntegrityTierV1 } from "@/engine/hotPathIntegrityTierV1";
import { studioCanonicalJsonStringify as canonical } from "@/domain/json/CanonicalJson";
import { prepareCardiorespiratoryStartupV1, type CardiorespiratoryStartupPreparationV1 } from "@/analysis/methods/cardiorespiratory/CardiorespiratoryStartupReadinessV1";
import { cardiorespiratoryStartupPresetCasesV1, type CardiorespiratoryStartupPresetCaseV1 } from "./CardiorespiratoryStartupCasesV1";
import { fingerprintCardiorespiratoryStartupSourceV1, type CardiorespiratoryStartupSourceV1 } from "./CardiorespiratoryStartupSourceV1";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const sha = (value: unknown) => createHash("sha256").update(canonical(value)).digest("hex");
export type CardiorespiratoryStartupArchiveV1 = CardiorespiratoryStartupPresetCaseV1 & Readonly<{
  schemaId: "cardiorespiratory-dev-startup-preparation-v1"; scope: "local-development-no-publication";
  source: CardiorespiratoryStartupSourceV1; preparation: CardiorespiratoryStartupPreparationV1; recordSha256: string;
}>;
export function parseCardiorespiratoryStartupPreparationArgumentsV1(args: readonly string[], cwd = root) {
  let caseId = "all", output = path.join(cwd, "artifacts/cardiorespiratory-startup-presets-v1"), wallBudgetSec = 180, fresh = false;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--fresh") { fresh = true; continue; }
    const value = args[++i];
    if (!value || value.startsWith("--")) throw new Error(`Missing value for ${arg}`);
    if (arg === "--case") caseId = value;
    else if (arg === "--output") output = path.resolve(cwd, value);
    else if (arg === "--wall-budget") wallBudgetSec = Number(value);
    else throw new Error(`Unknown startup preparation argument: ${arg}`);
  }
  if (!caseId || !Number.isFinite(wallBudgetSec) || wallBudgetSec < 1 || wallBudgetSec > 600) throw new Error("Invalid startup preparation budget");
  const relative = path.relative(cwd, output);
  if (!relative.startsWith("artifacts/") && !relative.startsWith("../")) throw new Error("Preparation output must be under artifacts/ or outside the repository");
  return { caseId, output, wallBudgetSec, fresh };
}
async function main() {
  const args = parseCardiorespiratoryStartupPreparationArgumentsV1(process.argv.slice(2));
  selectHotPathIntegrityTierV1("hot-path-lean");
  const all = await cardiorespiratoryStartupPresetCasesV1(root);
  const cases = args.caseId === "all" ? all : all.filter(c => c.caseId === args.caseId || c.sourcePresetId === args.caseId);
  if (!cases.length) throw new Error(`Unknown case ${args.caseId}`);
  const source = await fingerprintCardiorespiratoryStartupSourceV1(root);
  await mkdir(args.output, { recursive: true });
  const emit = (value: unknown) => process.stdout.write(JSON.stringify(value) + "\n");
  for (const c of cases) {
    const file = path.join(args.output, `${c.caseId}.json`);
    let prior: CardiorespiratoryStartupArchiveV1 | undefined;
    if (!args.fresh) {
      try { prior = JSON.parse(await readFile(file, "utf8")); }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
    }
    if (prior) {
      const { recordSha256, ...body } = prior;
      if (sha(body) !== recordSha256 || prior.schemaId !== "cardiorespiratory-dev-startup-preparation-v1"
        || prior.scope !== "local-development-no-publication" || canonical(prior.source) !== canonical(source)
        || prior.caseId !== c.caseId || prior.sourcePresetId !== c.sourcePresetId || canonical(prior.fixture) !== canonical(c.fixture)) {
        throw new Error(`Incompatible startup archive ${file}; use a new directory or --fresh`);
      }
    }
    const session = prior ? CardiorespiratorySessionV1.restore(c.fixture, prior.preparation.checkpoint) : CardiorespiratorySessionV1.create(c.fixture);
    const preparation = await prepareCardiorespiratoryStartupV1({ session,
      identity: { modelId: CARDIORESPIRATORY_DEV_MODEL_ID_V1, sourceSha256: source.sha256 },
      ...(prior ? { resume: prior.preparation } : {}), wallTimeBudgetSec: args.wallBudgetSec,
      onProgress: evidence => { emit({ kind: "startup-progress", caseId: c.caseId, elapsedSec: evidence.elapsedSec,
        status: evidence.status, worstComparison: evidence.worstComparison }); } });
    if (canonical(await fingerprintCardiorespiratoryStartupSourceV1(root)) !== canonical(source)) throw new Error("Source changed during preparation; no archive admitted");
    const body = { schemaId: "cardiorespiratory-dev-startup-preparation-v1", scope: "local-development-no-publication", ...c, source, preparation } as const;
    const archive: CardiorespiratoryStartupArchiveV1 = { ...body, recordSha256: sha(body) };
    await writeFile(file + ".tmp", JSON.stringify(archive, null, 2) + "\n"); await rename(file + ".tmp", file);
    emit({ kind: "startup-preparation-complete", caseId: c.caseId, status: preparation.status,
      elapsedSec: preparation.evidence.elapsedSec, wallTimeSec: preparation.wallTimeSec, reason: preparation.reason, output: file });
    if (preparation.status !== "ready") process.exitCode = 1;
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { process.stderr.write(String(error?.stack ?? error) + "\n"); process.exitCode = 1; });
}

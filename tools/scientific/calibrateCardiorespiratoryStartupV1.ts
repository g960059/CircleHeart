/** Empirical LOCAL startup calibration. Each case owns one trajectory; the
 * worker pool parallelizes different cases, never shadow histories in a case.
 * Example: vite-node --script tools/scientific/calibrateCardiorespiratoryStartupV1.ts --cases all --workers 3
 * No registry, publication, physiological fitting, or qualification writes. */
import { build } from "esbuild";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Worker } from "node:worker_threads";
import { studioCanonicalJsonStringify as canonical } from "@/domain/json/CanonicalJson";
import { cardiorespiratoryStartupCalibrationCasesV1 } from "./CardiorespiratoryStartupCalibrationCasesV1";
import type { CardiorespiratoryStartupCalibrationResultV1 as Result } from "./CardiorespiratoryStartupCalibrationWorkerV1";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const sha = (value: string | Uint8Array) => createHash("sha256").update(value).digest("hex");
const emit = (value: unknown) => process.stdout.write(JSON.stringify(value) + "\n");
export function parseCardiorespiratoryStartupCalibrationArgumentsV1(args: readonly string[], cwd = root) {
  let cases = "dev-baseline", workers = 3, maximumTimeSec = 180, holdoutSec = 15, wallBudgetSec = 180;
  let output = path.join(cwd, "artifacts/cardiorespiratory-startup-calibration-v1"), budgets = [60, 90, 120];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i], value = args[++i];
    if (value === undefined || value.startsWith("--")) throw new Error(`Missing value for ${arg}`);
    if (arg === "--cases") cases = value;
    else if (arg === "--workers") workers = Number(value);
    else if (arg === "--maximum-time") maximumTimeSec = Number(value);
    else if (arg === "--holdout") holdoutSec = Number(value);
    else if (arg === "--wall-budget") wallBudgetSec = Number(value);
    else if (arg === "--budgets") budgets = value.split(",").map(Number);
    else if (arg === "--output") output = path.resolve(cwd, value);
    else throw new Error(`Unknown calibration argument ${arg}`);
  }
  if (!cases || !Number.isInteger(workers) || workers < 1 || workers > 4
    || !Number.isFinite(maximumTimeSec) || maximumTimeSec < 30 || maximumTimeSec > 300
    || !Number.isFinite(holdoutSec) || holdoutSec < 10 || holdoutSec > 30
    || !Number.isFinite(wallBudgetSec) || wallBudgetSec < 10 || wallBudgetSec > 600
    || budgets.length < 1 || budgets.length > 5 || new Set(budgets).size !== budgets.length
    || budgets.some(b => !Number.isInteger(b) || b < 30 || b > maximumTimeSec)
    || !Number.isInteger(maximumTimeSec) || !Number.isInteger(holdoutSec)) throw new Error("Invalid bounded calibration arguments");
  const relative = path.relative(cwd, output);
  if (!relative.startsWith("artifacts/") && !relative.startsWith("../")) throw new Error("Calibration output must be under artifacts/ or outside the repository");
  return { cases, workers, maximumTimeSec, holdoutSec, wallBudgetSec, output, budgets: budgets.sort((a, b) => a - b) };
}

async function main() {
  const args = parseCardiorespiratoryStartupCalibrationArgumentsV1(process.argv.slice(2));
  const all = await cardiorespiratoryStartupCalibrationCasesV1(root);
  const requested = args.cases.split(",");
  const cases = args.cases === "all" ? all : args.cases === "core" ? all.slice(0, 5) : all.filter(c => requested.includes(c.caseId));
  if (!cases.length || (args.cases !== "all" && args.cases !== "core" && requested.some(id => !cases.some(c => c.caseId === id))))
    throw new Error(`Unknown case; choose all, core, or ${all.map(c => c.caseId).join(",")}`);
  await mkdir(args.output, { recursive: true });
  // Refuse accidental result replacement. An interrupted run leaves its own
  // immutable bundle and per-case files available for inspection.
  const manifestPath = path.join(args.output, "run.json");
  const built = await build({ absWorkingDir: root, entryPoints: ["tools/scientific/CardiorespiratoryStartupCalibrationWorkerV1.ts"],
    bundle: true, write: false, metafile: true, platform: "node", format: "esm", target: "es2022", alias: { "@": root }, logLevel: "silent",
    define: { "import.meta.env.VITE_CIRCLEHEART_HOT_PATH_INTEGRITY": '"hot-path-lean"' } });
  const filePaths = [...new Set([...Object.keys(built.metafile!.inputs),
    "tools/scientific/calibrateCardiorespiratoryStartupV1.ts", "tools/scientific/CardiorespiratoryStartupCalibrationCasesV1.ts",
    "data/model-releases/standard74/bundle.json"])].sort();
  const sourceFiles = await Promise.all(filePaths.map(async p => ({ path: p, sha256: sha(await readFile(path.join(root, p))) })));
  const bundle = built.outputFiles[0]!.contents, bundleSha256 = sha(bundle);
  const manifest = { schemaId: "cardiorespiratory-startup-calibration-v1", scope: "local-development-single-history-empirical-coverage",
    createdAt: new Date().toISOString(), sourceSha256: sha(canonical(sourceFiles)), sourceFiles, bundleSha256,
    arguments: args, cases, interpretation: "Coverage is the fraction of this declared test matrix, not population coverage or full-system settlement. No physiology parameters are fitted." };
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n", { flag: "wx" });
  const workerFile = path.join(args.output, "calibration-worker.mjs");
  await writeFile(workerFile, bundle, { flag: "wx" });
  const started = performance.now(), results: Result[] = [];
  emit({ kind: "calibration-start", sourceSha256: manifest.sourceSha256, bundleSha256, ...args, caseIds: cases.map(c => c.caseId) });
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(args.workers, cases.length) }, async () => {
    while (cursor < cases.length) {
      const c = cases[cursor++]!;
      const caseStarted = performance.now();
      const result = await new Promise<Result>((resolve, reject) => {
        const worker = new Worker(workerFile, { workerData: { kind: "cardiorespiratory-startup-calibration-job-v1", case: c, budgets: args.budgets,
          maximumTimeSec: args.maximumTimeSec, holdoutSec: args.holdoutSec, wallBudgetSec: args.wallBudgetSec } });
        let replied = false;
        const timeout = setTimeout(() => { void worker.terminate(); reject(new Error(`Worker timeout: ${c.caseId}`)); }, (args.wallBudgetSec + 20) * 1000);
        worker.on("message", (message: Result) => { replied = true; clearTimeout(timeout); resolve(message); });
        worker.once("error", error => { clearTimeout(timeout); reject(error); });
        worker.once("exit", code => { clearTimeout(timeout); if (!replied) reject(new Error(`Worker exited without a result: ${c.caseId} (${code})`)); });
      }).catch((error): Result => ({ caseId: c.caseId, status: "failed", error: error instanceof Error ? error.message : String(error),
        elapsedSec: null, wallTimeSec: (performance.now() - caseStarted) / 1000, integrationWallSec: null, observerWallSec: null,
        earliestReadySec: null, earliestReadyHoldout: null, earliestReadyWindow: null, budgetChecks: [],
        firstReadyAfterLastBudgetSec: null, windows: [], maximumGasResidualMol: null, finalAssessment: null }));
      results.push(result);
      await writeFile(path.join(args.output, `${c.caseId}.json`), JSON.stringify(result, null, 2) + "\n", { flag: "wx" });
      emit({ kind: "case-complete", caseId: c.caseId, status: result.status, elapsedSec: result.elapsedSec,
        wallTimeSec: result.wallTimeSec, earliestReadySec: result.earliestReadySec, error: result.error });
    }
  }));
  results.sort((a, b) => cases.findIndex(c => c.caseId === a.caseId) - cases.findIndex(c => c.caseId === b.caseId));
  const coverage = args.budgets.map(budgetSec => ({ budgetSec, denominator: results.length,
    readyCount: results.filter(r => r.budgetChecks.find(b => b.budgetSec === budgetSec)?.ready).length,
    holdoutPassedCount: results.filter(r => r.budgetChecks.find(b => b.budgetSec === budgetSec)?.holdoutPassed).length,
    extensionCaseIds: results.filter(r => !r.budgetChecks.find(b => b.budgetSec === budgetSec)?.ready).map(r => r.caseId) }));
  // Reuse the frozen observer implementation that ran in this worker bundle,
  // even if the developer edits source while a bounded calibration runs.
  const { evaluateCardiorespiratoryStartupHoldoutV1: compareHoldout } = await import(pathToFileURL(workerFile).href) as
    Pick<typeof import("./CardiorespiratoryStartupCalibrationWorkerV1"), "evaluateCardiorespiratoryStartupHoldoutV1">;
  const adaptiveCoverage = args.budgets.map(budgetSec => {
    const cases = results.map(result => {
      const index = result.windows.findIndex(w => w.assessment.elapsedSec >= budgetSec - 1e-7
        && w.assessment.elapsedSec <= args.maximumTimeSec + 1e-7 && w.assessment.status === "ready");
      if (index < 0) return { caseId: result.caseId, candidateTimeSec: null, holdout: null };
      const candidate = result.windows[index]!, future = [];
      for (const next of result.windows.slice(index + 1)) {
        future.push(next.window);
        if (next.window.endTimeSec - candidate.window.endTimeSec >= args.holdoutSec - 1e-7) break;
      }
      return { caseId: result.caseId, candidateTimeSec: candidate.assessment.elapsedSec,
        holdout: compareHoldout(candidate.window, future, args.holdoutSec) };
    });
    return { budgetSec, denominator: cases.length, readyCount: cases.filter(c => c.candidateTimeSec !== null).length,
      holdoutPassedCount: cases.filter(c => c.holdout?.passed).length, cases };
  });
  const report = { ...manifest, wallTimeSec: (performance.now() - started) / 1000, coverage, adaptiveCoverage, results };
  await writeFile(path.join(args.output, "report.json.tmp"), JSON.stringify(report, null, 2) + "\n");
  await rename(path.join(args.output, "report.json.tmp"), path.join(args.output, "report.json"));
  emit({ kind: "calibration-complete", output: path.join(args.output, "report.json"), wallTimeSec: report.wallTimeSec, coverage });
  if (results.some(r => r.status === "failed")) process.exitCode = 1;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();

/** Bounded, resumable LOCAL preparation diagnostics. Full-system qualification
 * currently remains fail closed: physical-age probes and dense matched-time
 * holdout are not implemented. This command has no registry write,
 * publication, activation or production-model mint path. Checkpoints remain
 * accepted model states; evidence is stored separately and owned by analysis.
 *
 * vite-node --script tools/scientific/prepareCardiorespiratoryDevPresetsV1.ts
 *   --case dev-baseline --simulation-budget 1200 --wall-budget 180
 * Repeat the same command to resume. --case all preserves the four production
 * case parameter sets in the new dev model, including each case's PEEP.
 */
import { createHash } from "node:crypto";
import { readFile, mkdir, writeFile, rename } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CardiorespiratorySessionV1, type CardiorespiratoryCheckpointV2 } from "@/engine/cardiorespiratory/CardiorespiratorySessionV1";
import { DEFAULT_CARDIORESPIRATORY_FIXTURE_V1, validateAndOwnCardiorespiratoryFixtureV1,
  type CardiorespiratoryFixtureV1 } from "@/engine/cardiorespiratory/CardiorespiratoryFixtureV1";
import { selectHotPathIntegrityTierV1 } from "@/engine/hotPathIntegrityTierV1";
import { studioCanonicalJsonStringify as canonical } from "@/domain/json/CanonicalJson";
import { CardiorespiratorySettlementMonitorV1, DEFAULT_CARDIORESPIRATORY_SETTLEMENT_CONFIG_V1,
  type CardiorespiratorySettlementConfigV1, type CardiorespiratorySettlementMonitorCheckpointV1,
  type CardiorespiratorySettlementEvidenceV1 } from "@/analysis/methods/cardiorespiratory/CardiorespiratorySettlementV1";
import { createCardiorespiratoryPreparationWorkersV1 } from "./CardiorespiratoryPreparationWorkersV1";
import { fingerprintCardiorespiratoryPreparationSourceV1, type CardiorespiratoryPreparationSourceV1 as Source } from "./CardiorespiratoryPreparationSourceV1";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const sha = (value: string | Uint8Array) => createHash("sha256").update(value).digest("hex");
const emit = (x: unknown) => process.stdout.write(JSON.stringify(x) + "\n");
type Archive = Readonly<{
  schemaId: "cardiorespiratory-dev-preparation-v1"; scope: "local-development-no-publication";
  source: Source; caseId: string; sourcePresetId: string | null;
  fixture: CardiorespiratoryFixtureV1; config: CardiorespiratorySettlementConfigV1;
  histories: readonly CardiorespiratoryCheckpointV2[];
  monitor: CardiorespiratorySettlementMonitorCheckpointV1;
  evidence: CardiorespiratorySettlementEvidenceV1;
  qualifiedCheckpoint: CardiorespiratoryCheckpointV2 | null;
  requalificationOrigin?: Readonly<{ recordSha256: string; sourceSha256: string; acceptedTimeSec: number }>;
  recordSha256: string;
}>;
type Case = Readonly<{ caseId: string; sourcePresetId: string | null; fixture: CardiorespiratoryFixtureV1 }>;
function argumentsV1() {
  const args = process.argv.slice(2);
  let caseId = "dev-baseline", simulationBudgetSec = 1200, wallBudgetSec = 180, workerCount = 3;
  let output = path.join(root, "artifacts/cardiorespiratory-prepared-presets-v1"), fresh = false;
  let reseedFrom: string | null = null;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg === "--fresh") fresh = true;
    else if (arg === "--case") caseId = args[++i] ?? "";
    else if (arg === "--output") output = path.resolve(args[++i] ?? "");
    else if (arg === "--simulation-budget") simulationBudgetSec = Number(args[++i]);
    else if (arg === "--wall-budget") wallBudgetSec = Number(args[++i]);
    else if (arg === "--workers") workerCount = Number(args[++i]);
    else if (arg === "--reseed-from") reseedFrom = path.resolve(args[++i] ?? "");
    else throw new Error(`Unknown preparation argument: ${arg}`);
  }
  if (!caseId || !Number.isFinite(simulationBudgetSec) || simulationBudgetSec < 1 || simulationBudgetSec > 7200
    || !Number.isFinite(wallBudgetSec) || wallBudgetSec < 1 || wallBudgetSec > 3600
    || ![1, 3].includes(workerCount)) throw new Error("Invalid bounded preparation budget");
  // Avoid accidental writes into authoritative production or source material.
  const relative = path.relative(root, output);
  if (!relative.startsWith("artifacts/") && !relative.startsWith("../")) throw new Error("Preparation output must be under artifacts/ or outside the repository");
  return { caseId, simulationBudgetSec, wallBudgetSec, output, fresh, workerCount, reseedFrom };
}
async function sourceUnchanged(source: Source) {
  const files = await Promise.all(source.files.map(async f => ({ path: f.path, sha256: sha(await readFile(path.join(root, f.path))) })));
  return sha(canonical(files)) === source.sha256;
}
async function casesV1(selected: string): Promise<Case[]> {
  if (selected === "dev-baseline") return [{ caseId: selected, sourcePresetId: null, fixture: DEFAULT_CARDIORESPIRATORY_FIXTURE_V1 }];
  const release = JSON.parse(await readFile(path.join(root, "data/model-releases/standard74/bundle.json"), "utf8"));
  const cases = [release.baseline, ...release.presets].map((p): Case => {
    const inherited = p.capture.fixture, peep = inherited.hemodynamicResearchInputs.peepCmH2O;
    const d = DEFAULT_CARDIORESPIRATORY_FIXTURE_V1;
    return { caseId: p.presetId.replace(/^standard74-/, ""), sourcePresetId: p.presetId,
      fixture: validateAndOwnCardiorespiratoryFixtureV1({ ...d, anatomyId: inherited.anatomyId,
        hemodynamicResearchInputs: inherited.hemodynamicResearchInputs, mechanismResearchInputs: inherited.mechanismResearchInputs,
        cardiorespiratory: { ...d.cardiorespiratory, respiratory: { ...d.cardiorespiratory.respiratory,
          ventilator: { ...d.cardiorespiratory.respiratory.ventilator, peepCmH2O: peep } } } }) };
  });
  const result = selected === "all" ? cases : cases.filter(c => c.caseId === selected || c.sourcePresetId === selected);
  if (!result.length) throw new Error(`Unknown case ${selected}; available: dev-baseline, all, ${cases.map(c => c.caseId).join(", ")}`);
  return result;
}
async function readArchive(file: string): Promise<Archive | null> {
  try {
    const archive = JSON.parse(await readFile(file, "utf8")) as Archive;
    const { recordSha256, ...body } = archive;
    if (sha(canonical(body)) !== recordSha256) throw new Error("Preparation archive digest mismatch");
    return archive;
  } catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return null; throw error; }
}
async function prepare(c: Case, source: Source, args: ReturnType<typeof argumentsV1>) {
  const file = path.join(args.output, `${c.caseId}.json`), config = DEFAULT_CARDIORESPIRATORY_SETTLEMENT_CONFIG_V1;
  const archive = args.fresh ? null : await readArchive(file);
  if (archive && (archive.schemaId !== "cardiorespiratory-dev-preparation-v1" || archive.source.sha256 !== source.sha256
    || archive.caseId !== c.caseId || canonical(archive.fixture) !== canonical(c.fixture) || canonical(archive.config) !== canonical(config))) {
    throw new Error(`Incompatible preparation archive ${file}; keep it for inspection and choose a fresh output directory or --fresh`);
  }
  let histories: CardiorespiratorySessionV1[], monitor: CardiorespiratorySettlementMonitorV1;
  let requalificationOrigin = archive?.requalificationOrigin;
  if (archive) {
    histories = archive.histories.map(checkpoint => CardiorespiratorySessionV1.restore(c.fixture, checkpoint));
    monitor = CardiorespiratorySettlementMonitorV1.restore(archive.monitor);
    if (histories.some(h => Math.abs(h.currentAcceptedClock().acceptedTimeSec - archive.monitor.lastTimeSec) > 1e-9)) throw new Error("Preparation state/monitor clock mismatch");
  } else {
    const previous = args.reseedFrom ? await readArchive(args.reseedFrom) : null;
    if (args.reseedFrom && !previous) throw new Error("Requalification source archive not found");
    if (previous) {
      // Explicit observer-only upgrade. No numerical source change is silently
      // declared compatible; all old qualification and drift windows are lost.
      const numerical = (s: Source) => s.files.filter(f => !f.path.startsWith("analysis/") && !f.path.startsWith("tools/")
        && f.path !== "engine/cardiorespiratory/CardiorespiratorySettlementStateV1.ts");
      if (canonical(numerical(previous.source)) !== canonical(numerical(source))
        || canonical(previous.fixture) !== canonical(c.fixture) || previous.histories.length !== 3) {
        throw new Error("Requalification requires identical numerical source and fixture");
      }
      requalificationOrigin = { recordSha256: previous.recordSha256, sourceSha256: previous.source.sha256,
        acceptedTimeSec: previous.evidence.acceptedTimeSec };
    }
    const reference = previous ? CardiorespiratorySessionV1.restore(c.fixture, previous.histories[0]) : CardiorespiratorySessionV1.create(c.fixture);
    histories = [reference, ...[-1, 1].map((sign, i) => (previous
      ? CardiorespiratorySessionV1.restore(c.fixture, previous.histories[i + 1]) : reference).forkSettlementSeedV1({
      // Retain independently evolved gas histories on explicit requalification,
      // renew fast mechanical probes, and measure coverage again from states.
      ...(!previous ? { systemicGasPressureOffsetMmHg: { o2: sign * 5, co2: sign * 10 },
        myocardialGasPressureOffsetMmHg: { o2: sign * 5, co2: sign * 10 },
        bloodGasPressureOffsetMmHg: { o2: sign * 2, co2: sign * 2 } } : {}),
      venousRedistributionMl: sign * 20, coronaryToneScale: 1 + sign * .03,
      lungGasScaleByUnit: [1 + sign * .02, 1 - sign * .02],
    }))];
    monitor = new CardiorespiratorySettlementMonitorV1(["reference", "lower-gas-mixed-mechanics", "upper-gas-mixed-mechanics"],
      histories.map(s => s.physicalSettlementProjectionV1()), config);
  }
  let evidence = monitor.evidence();
  let checkpoints = histories.map(s => s.checkpoint());
  const pool = args.workerCount === 3 ? await createCardiorespiratoryPreparationWorkersV1({ root, outputDirectory: args.output,
    fixture: c.fixture, checkpoints }) : null;
  const start = evidence.acceptedTimeSec, wallStart = performance.now();
  let nextSaveSec = start + config.windowSec;
  const save = async () => {
    if (!await sourceUnchanged(source)) throw new Error("Numerical/settlement source changed during preparation; no qualified output was written");
    const body = { schemaId: "cardiorespiratory-dev-preparation-v1", scope: "local-development-no-publication", source,
      caseId: c.caseId, sourcePresetId: c.sourcePresetId, fixture: c.fixture, config, histories: checkpoints,
      monitor: monitor.checkpoint(), evidence, qualifiedCheckpoint: evidence.status === "qualified" ? checkpoints[0] : null };
    const completeBody = { ...body, ...(requalificationOrigin ? { requalificationOrigin } : {}) };
    const bytes = JSON.stringify({ ...completeBody, recordSha256: sha(canonical(completeBody)) }) + "\n";
    await writeFile(file + ".tmp", bytes); await rename(file + ".tmp", file);
  };
  emit({ kind: "preparation-start", caseId: c.caseId, file, sourceSha256: source.sha256, resumeTimeSec: start,
    simulationBudgetSec: args.simulationBudgetSec, wallBudgetSec: args.wallBudgetSec, config,
    workers: args.workerCount,
    interpretation: "Bounded trajectory diagnostics only: full qualification awaits physical-age comparison and dense matched-time holdout. Original case teaching targets require separate assessment." });
  try {
    while (evidence.status !== "qualified" && evidence.acceptedTimeSec - start + config.observationIntervalSec <= args.simulationBudgetSec
      && (performance.now() - wallStart) / 1000 < args.wallBudgetSec) {
      const elapsed = evidence.acceptedTimeSec - evidence.startTimeSec;
      const untilWindow = config.windowSec - elapsed % config.windowSec;
      const count = pool ? Math.max(1, Math.floor(Math.min(20, untilWindow,
        args.simulationBudgetSec - evidence.acceptedTimeSec + start) / config.observationIntervalSec)) : 1;
      const batches = pool ? await pool.advance(count, config.observationIntervalSec) : histories.map(s => {
        s.advanceToPresentationTime(evidence.acceptedTimeSec + config.observationIntervalSec);
        return { samples: [s.physicalSettlementProjectionV1()], checkpoint: s.checkpoint() };
      });
      checkpoints = batches.map(b => b.checkpoint);
      for (let i = 0; i < count; i++) {
        const completed = monitor.observe(batches.map(b => b.samples[i]!));
        evidence = monitor.evidence();
        if (completed) {
          emit({ kind: "preparation-window", caseId: c.caseId, acceptedTimeSec: evidence.acceptedTimeSec, status: evidence.status, issues: evidence.issues,
            missingSeedDomains: evidence.missingSeedDomains, ...evidence.windows.at(-1), slowMeans: undefined,
            wallTimeSec: (performance.now() - wallStart) / 1000 });
        }
      }
      if (evidence.acceptedTimeSec >= nextSaveSec || evidence.status === "qualified") { await save(); nextSaveSec += config.windowSec; }
    }
    await save();
    emit({ kind: "preparation-result", caseId: c.caseId, file, status: evidence.status, acceptedTimeSec: evidence.acceptedTimeSec,
      issues: evidence.issues, missingSeedDomains: evidence.missingSeedDomains, wallTimeSec: (performance.now() - wallStart) / 1000,
      qualifiedCheckpointWritten: evidence.status === "qualified", productionPublicationAuthorized: false });
  } catch (error) {
    // A numerical failure never produces a qualified checkpoint. The last
    // atomic periodic archive is still resumable/inspectable if source agrees.
    emit({ kind: "preparation-failure", caseId: c.caseId, acceptedTimeSec: evidence.acceptedTimeSec,
      error: error instanceof Error ? error.message : String(error), productionPublicationAuthorized: false });
    process.exitCode = 1;
  } finally { await pool?.close(); }
}
async function main() {
  const args = argumentsV1();
  selectHotPathIntegrityTierV1("hot-path-lean");
  const source = await fingerprintCardiorespiratoryPreparationSourceV1(root);
  await mkdir(args.output, { recursive: true });
  for (const c of await casesV1(args.caseId)) await prepare(c, source, args);
}
await main();

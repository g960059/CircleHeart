import { mkdir, readFile } from "node:fs/promises";
import { join, resolve, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { canonicalJsonStringify as canonical, sha256CanonicalJsonHex as hash } from "@/engine/integrity";
import { selectHotPathIntegrityTierV1 } from "@/engine/hotPathIntegrityTierV1";
import { MAIN_WIRE_STATIC_CASE_MODEL_ID_V1 as modelId } from "@/domain/model/MainWireStaticCaseIdentityV1";
import { resolveMainWireStaticCaseDefinitionV1 as definition, type MainWireCaseReferenceIdV1 as Reference,
  ownMainWireCaseInputsV1 as ownInputs, ownMainWireCaseBackgroundV1 as ownBackground,
  mainWireStaticCaseContextV1 as context, type MainWireCaseBackgroundV1 as Background,
  type MainWireStaticCaseCandidateV1 as Candidate } from "@/analysis/registry/MainWireStaticCaseDefinitionsV1";
import { bindMainWireCaseInputRecordV1 as bind, readMainWireHistoricalFittingEvidenceV1 as history,
  readMainWireCaseInputRecordV1 as readInput, unwrapMainWireFittingEvidenceV1 as unwrap } from "@/analysis/registry/MainWireCaseInputRecordV1";
import { readMainWireStaticCaseFittingResultV1 as readResult, type MainWireStaticCaseFittingResultV1 as Result } from "@/analysis/methods/mainWire/MainWireStaticCaseFittingWorkflowV1";
import { compareMainWireCaseEvidenceV1 as compare } from "@/analysis/methods/mainWire/MainWireCaseComparisonV1";
import { assessMainWireCaseInitializationAgreementV1 as initializationAgreement,
  withMainWireInitializationAssessmentV1 as withInitialization } from "@/analysis/methods/mainWire/MainWireCaseInitializationAgreementV1";
import fittingSurface from "@/studio/integrations/mainWireIntegratedV3/MainWireIntegratedStudioStaticCaseSurfaceV5";
import surface from "@/studio/integrations/mainWireIntegratedV3/MainWireIntegratedStudioStaticCaseSurfaceV5";
import { prepareMainWireSurfaceAnalysisV1 as prepareAnalysis, PreparedSurfaceAnalysisErrorV1 } from "../registry/PrepareMainWireSurfaceAnalysisV1";
import { readPreparedModelAnalysisV1, type PreparedModelAnalysisV1 } from "@/studio/application/authoring/PreparedModelAnalysisV1";
import { resolveMainWireRegistryCaseProtocolV1 as protocol, prepareRegistryCaseAssessmentV1 as assess } from "./MainWireRegistryCaseProtocolsV1";
import { ownMainWireRegistryProposalsV1 as ownProposals, mainWireInitialCandidatePrefixV1 as prefix,
  assessMainWireInitialCandidateV1 as assessInitial, mainWireInitialCandidateComparisonV1 as initialComparison,
  type MainWireRegistryProposalV1 as Proposal } from "./MainWireRegistryInitialCandidatesV1";
import { readSealedFittingRunV1 as sealedRun } from "./SealedFittingRunV1";
import { beginFittingSourceSnapshotV1 } from "./FittingSourceSnapshotV1";
import { writeFittingRunJsonV1 as writeJson, writeFittingRunTextV1 as writeText } from "./FittingRunFilesV1";
import { loadRegisteredMainWireReviewArtifactV1, buildMainWireRegistryReviewArtifactV1, assertMainWireReviewNumericalSourceV1 as assertSource,
  mainWireReviewPresetV1 as presetFor, verifyMainWireReviewContinuationV1 as continuation } from "../registry/MainWireRegistryReviewArtifactV1";
import { composeRegistryCaseReviewDocumentV1 as documentFor, registryCaseReviewHtmlV1 as htmlFor,
  registryCaseReviewIndexV1 as indexFor } from "../modelDocumentation/authoring/RegistryCaseReviewDocumentV1";
import { compileRegistryCaseDocumentV1 as archiveFor } from "../modelDocumentation/compileRegistryCaseDocumentV1";
import { savedDocumentOfflineHtmlV1 } from "@/studio/presentation/modelDocumentation/SavedModelDocumentV1";

const same = (a: unknown, b: unknown, label: string) => { if (canonical(a) !== canonical(b)) throw new Error(`Case review binding differs: ${label}`); };
const message = (e: unknown) => e instanceof Error ? e.message : String(e);
// Successor qualification must use its newly compiled numerical owner, never
// relabel the registered predecessor's executable as a new exact identity.
async function buildArtifact() {
  if (!process.argv.includes("--build-current")) return loadRegisteredMainWireReviewArtifactV1();
  const artifact = await buildMainWireRegistryReviewArtifactV1();
  return { ...artifact, sourceBuildArtifactRevisionId: artifact.artifactRevisionId, usesAdmittedArtifact: false };
}
// A sealed job includes its execution receipt. That transport metadata is not
// a grid observation, including when the job failed before producing a grid.
const gridEvidence = (saved: unknown) => {
  const { fittingRunReceiptV1: _receipt, ...outcome } = saved as { status: string; grid?: unknown; fittingRunReceiptV1?: unknown };
  return outcome.status === "completed" ? outcome.grid : outcome;
};
class ReviewFileWriteError extends Error {}
type CandidateRecord = {
  schemaId: string; modelId: string; sourceSha256: string; surface: unknown; referenceId: Reference; recordSha256: string;
  inputRecord: unknown; binding: { interpretation: string }; candidateInputs: Candidate; executionFiles: string[];
  evidence: { resultSha256: string; checkpoint: unknown; rest: unknown; referenceContext: unknown } | null;
  previousEvidenceFile?: string | null; publicPromotionAuthorized: boolean;
  adjustment?: { searchFile?: string | null; selectedFinalId?: string | null; finalEvaluationId?: string };
  initialCandidatesFile?: string; selectedStartId?: string;
  background?: Background; parentRun?: string;
};

type ReviewRun = Pick<Awaited<ReturnType<typeof sealedRun>>, "readJson" | "seal"> & Partial<Pick<Awaited<ReturnType<typeof sealedRun>>, "directory">>;
let comparisonArtifact: ReturnType<typeof buildArtifact> | undefined;
export async function assertMainWireRegistryParentNumericalSourceV1(run: Pick<ReviewRun, "seal">): Promise<void> {
  comparisonArtifact ??= buildArtifact();
  assertSource((await comparisonArtifact).sourceFiles, run.seal.files);
}
async function assertComparisonParent(background: Background, parentRun: string | undefined, directory?: string): Promise<void> {
  if (!parentRun) throw new Error("Comparison background has no sealed parent run");
  if (!isAbsolute(parentRun) && !directory) throw new Error("Relative parent proof requires its child run directory");
  const run = await sealedRun(isAbsolute(parentRun) ? parentRun : resolve(directory!, parentRun));
  // A model name or a rest reassessment alone cannot certify old numerical
  // evidence after code changes. Reuse the existing actual artifact source
  // graph; documentation-only differences need not invalidate the parent.
  await assertMainWireRegistryParentNumericalSourceV1(run);
  const parent = await readRegistryReviewCandidateV1(await run.readJson(`${background.referenceId}-candidate.json`), run);
  if (parent.candidate.background || parent.assessment.status !== "review-pending"
    || parent.candidate.referenceId !== background.referenceId
    || parent.candidate.recordSha256 !== background.sourceCandidateRecordSha256 || run.seal.sourceSha256 !== background.sourceRunSha256)
    throw new Error("Comparison background is not its independently qualified parent candidate");
  same(parent.candidate.candidateInputs, background.candidateInputs, "selected parent inputs");
}

/** Rebuild every initial assessment in declared order from its sealed cold pair.
 * The run plan, not the winning summary, owns the set of attempted starts. */
export async function readRegistryInitialCandidatesV1(referenceId: Reference, file: string,
  run: ReviewRun) {
  const plan = await run.readJson("plan.json") as { modelId: string; sourceSha256: string; maximumEvaluations: number;
    prepared: { proposal: Proposal; issue: string | null; inputs: { record: unknown;
      binding: { candidateInputs: Candidate; interpretation: string }; previousEvidenceFile: string | null;
      background?: Background; parentRun?: string } | null }[] };
  if (plan.modelId !== modelId || plan.sourceSha256 !== run.seal.sourceSha256 || !Array.isArray(plan.prepared))
    throw new Error("Initial candidate plan identity differs");
  ownProposals(plan.prepared.map(p => p.proposal), plan.maximumEvaluations);
  const starts = [];
  for (const p of plan.prepared.filter(p => p.proposal.referenceId === referenceId)) {
    const executionFiles = p.inputs ? [`${prefix(p.proposal)}-2ms.json`, `${prefix(p.proposal)}-1ms.json`] : [];
    const grids: unknown[] = [], results: Result[] = [];
    if (p.inputs) {
      if (p.inputs.background) {
        ownBackground(referenceId, p.inputs.background);
        await assertComparisonParent(p.inputs.background, p.inputs.parentRun, run.directory);
      }
      const bound = await bind({ record: p.inputs.record, targetModelId: modelId, referenceId,
        mappedInputs: p.inputs.binding.candidateInputs, interpretation: p.inputs.binding.interpretation,
        validate: v => ownInputs(referenceId, v as Candidate, p.inputs!.background) });
      same(bound, p.inputs.binding, "initial input mapping");
      if (p.inputs.previousEvidenceFile) same((await history(await run.readJson(p.inputs.previousEvidenceFile))).record,
        p.inputs.record, "initial historical evidence/input origin");
    }
    for (const [index, name] of executionFiles.entries()) {
      const grid = gridEvidence(await run.readJson(name));
      grids.push(grid);
      const raw = (grid as { result?: unknown } | null)?.result;
      if (!raw) continue;
      const result = await readResult(raw);
      same(result.candidateInputs, p.inputs!.binding.candidateInputs, "initial full inputs");
      same(result.referenceContext.background ?? null, p.inputs!.background ?? null, "initial comparison background");
      if (result.sourceSha256 !== run.seal.sourceSha256 || result.rest.referenceId !== referenceId
        || result.nominalDtSec !== [.002, .001][index] || result.initialization.kind !== "cold")
        throw new Error("Initial candidate source, case, grid or initialization differs");
      results.push(result);
    }
    const evaluated = await assessInitial(referenceId, p.inputs ? { coarse: grids[0], fine: grids[1] } : null);
    starts.push({ startId: p.proposal.startId, inputIssue: p.issue, candidateInputs: p.inputs?.binding.candidateInputs ?? null,
      inputRecord: p.inputs?.record ?? null, binding: p.inputs?.binding ?? null,
      previousEvidenceFile: p.inputs?.previousEvidenceFile ?? null, executionFiles,
      score: evaluated.score, assessment: evaluated.assessment, results });
  }
  const comparison = initialComparison(referenceId, plan.maximumEvaluations, starts.map(({ results: _results, ...s }) => s));
  same(comparison, await run.readJson(file), "initial candidates/selection from raw evidence");
  return { comparison, starts };
}
/** Revalidate the files behind one candidate. A summary's status is never used
 * as a vote, and edited inputs cannot borrow another case's successful result. */
export async function readRegistryReviewCandidateV1(raw: unknown, run: ReviewRun) {
  const candidate = raw as CandidateRecord;
  if (!candidate || candidate.schemaId !== "main-wire-registry-research-candidate-v1"
    || candidate.modelId !== modelId || candidate.sourceSha256 !== run.seal.sourceSha256 || candidate.publicPromotionAuthorized !== false
    || !Array.isArray(candidate.executionFiles) || candidate.executionFiles.length !== 2
    || new Set(candidate.executionFiles).size !== 2) throw new Error("Unexpected registry candidate");
  const { recordSha256, ...body } = candidate;
  if (recordSha256 !== await hash(body)) throw new Error("Candidate digest differs");
  same(candidate.surface, fittingSurface, "numerical run Surface/analysis pins");
  if (candidate.background) {
    ownBackground(candidate.referenceId, candidate.background);
    await assertComparisonParent(candidate.background, candidate.parentRun, run.directory);
  } else if (candidate.parentRun) throw new Error("Parent run without comparison background");
  const d = definition(candidate.referenceId);
  const binding = await bind({ record: candidate.inputRecord, targetModelId: modelId, referenceId: candidate.referenceId,
    mappedInputs: candidate.candidateInputs, interpretation: candidate.binding.interpretation,
    validate: v => ownInputs(candidate.referenceId, v as Candidate, candidate.background) });
  same(binding, candidate.binding, "input mapping");
  const results: Result[] = [], grids: unknown[] = [];
  for (const [index, file] of candidate.executionFiles.entries()) {
    const grid = gridEvidence(await run.readJson(file));
    grids.push(grid);
    const rawResult = (grid as { result?: unknown } | null)?.result;
    if (!rawResult) continue;
    const r = await readResult(rawResult);
    same(r.candidateInputs, candidate.candidateInputs, "full case inputs");
    same(r.referenceContext.background ?? null, candidate.background ?? null, "candidate comparison background");
    if (r.rest.referenceId !== candidate.referenceId || r.sourceSha256 !== candidate.sourceSha256 || r.nominalDtSec !== [.002, .001][index])
      throw new Error("Wrong case, numerical source or grid in candidate");
    results.push(r);
  }
  const coarse = results.find(r => r.nominalDtSec === .002);
  if (candidate.evidence) {
    if (!coarse) throw new Error("Claimed candidate evidence has no raw coarse result");
    same(candidate.evidence.resultSha256, coarse.resultSha256, "coarse result digest");
    same(candidate.evidence.checkpoint, coarse.execution.checkpoint, "coarse checkpoint");
    same(candidate.evidence.rest, coarse.rest, "coarse observations");
    same(candidate.evidence.referenceContext, coarse.referenceContext, "case evidence context");
  }
  const previous = candidate.previousEvidenceFile ? await run.readJson(candidate.previousEvidenceFile) : null;
  if (previous) same((await history(previous)).record, candidate.inputRecord, "previous raw evidence/input origin");
  const initialCandidates = candidate.initialCandidatesFile
    ? await readRegistryInitialCandidatesV1(candidate.referenceId, candidate.initialCandidatesFile, run) : null;
  const selectedInitial = initialCandidates?.starts.find(s => s.startId === initialCandidates.comparison.selectedStartId);
  if (initialCandidates) {
    if (!selectedInitial || candidate.selectedStartId !== selectedInitial.startId) throw new Error("Candidate/initial selection differs");
    same(selectedInitial.inputRecord, candidate.inputRecord, "selected initial input origin");
    same(selectedInitial.previousEvidenceFile, candidate.previousEvidenceFile ?? null, "selected initial history");
    if (!candidate.adjustment?.searchFile) {
      same(selectedInitial.candidateInputs, candidate.candidateInputs, "unchanged selected initial inputs");
      same(selectedInitial.executionFiles, candidate.executionFiles, "unchanged selected initial cold pair");
    }
  }
  let initial: Result | null = null;
  let initializationCheck: Awaited<ReturnType<typeof initializationAgreement>> | null = null;
  let initializationWarm: Result | null = null;
  if (candidate.adjustment?.searchFile) {
    const search = await run.readJson(candidate.adjustment.searchFile) as { referenceId: string; selectedFinalId: string | null;
      finalChecks: { evaluationId: string; decision: { initializationCheck?: unknown } }[];
      evaluations: { id: string; candidateInputs: Candidate; outcome: { file: string; resultSha256?: string } }[] };
    if (search.referenceId !== candidate.referenceId || search.selectedFinalId !== candidate.adjustment.selectedFinalId)
      throw new Error("Search/candidate selection differs");
    if (search.selectedFinalId) same(search.evaluations.find(e => e.id === search.selectedFinalId)?.candidateInputs,
      candidate.candidateInputs, "selected finalist inputs");
    const first = search.evaluations.find(e => e.id === "evaluation-001");
    if (!first) throw new Error("Search has no initial evidence");
    initial = await readResult(unwrap(await run.readJson(first.outcome.file)));
    same(initial.candidateInputs, first.candidateInputs, "initial search inputs");
    same(initial.referenceContext.background ?? null, candidate.background ?? null, "search comparison background");
    if (initial.resultSha256 !== first.outcome.resultSha256 || initial.sourceSha256 !== candidate.sourceSha256
      || initial.rest.referenceId !== candidate.referenceId || initial.nominalDtSec !== .002 || initial.initialization.kind !== "cold")
      throw new Error("Initial search evidence source or identity differs");
    if (selectedInitial) {
      same(first.candidateInputs, selectedInitial.candidateInputs, "search seed/selected initial inputs");
      same(first.outcome.file, selectedInitial.executionFiles[0], "search seed/selected initial evidence");
    }
    const evaluatedId = candidate.adjustment.finalEvaluationId ?? search.selectedFinalId;
    if (evaluatedId && evaluatedId !== "evaluation-001") {
      const evaluated = search.evaluations.find(e => e.id === evaluatedId);
      if (!evaluated || !coarse) throw new Error("Selected final lacks initialization comparison evidence");
      same(evaluated.candidateInputs, candidate.candidateInputs, "initialization comparison inputs");
      const warm = await readResult(unwrap(await run.readJson(evaluated.outcome.file)));
      same(warm.resultSha256, evaluated.outcome.resultSha256, "initialization comparison raw digest");
      initializationCheck = await initializationAgreement({ warm, cold: coarse });
      initializationWarm = warm;
      const recorded = search.finalChecks.find(c => c.evaluationId === evaluatedId)?.decision.initializationCheck;
      if (!recorded) throw new Error("Initialization comparison evidence missing from search record");
      same(initializationCheck, recorded,
        "initialization comparison from raw evidence");
    }
  }
  const paired = await assess(protocol(candidate.referenceId), { coarse: grids[0], fine: grids[1] });
  const assessment = initializationCheck ? withInitialization(paired, initializationCheck) : paired;
  return { candidate, definition: d, grids, results, coarse, previous, initial, assessment, initialCandidates, initializationWarm };
}

async function main() {
  selectHotPathIntegrityTierV1("hot-path-lean");
  const { values } = parseArgs({ options: { input: { type: "string" }, output: { type: "string" },
    cases: { type: "string" }, "prepared-cache": { type: "string" }, "build-current": { type: "boolean" }, help: { type: "boolean" } } });
  if (values.help) {
    process.stdout.write("Usage: npm run fit:registry:prepare -- --input SEALED_RUN --output NEW_DIRECTORY [--cases baseline,hfref-chronic-dilated-v1]\n"
      + "Rechecks each case independently; writes held/review-pending dossiers, same-method comparisons and validated local ScenarioPreset captures.\n"
      + "Finalists get source/artifact continuation and Surface-pinned settled TBV/PV/Starling/PVA completion. --prepared-cache DIRECTORY reuses exact-capture/method-matched JSON by capture hash.\n"
      + "--build-current builds a successor from qualified current sources instead of using already registered bytes. It does not admit or publish that artifact.\n"
      + "No refitting, mint, publication or automatic review approval. Held cases remain in the report without a registration proposal.\n"); return;
  }
  if (!values.input || !values.output) throw new Error("Require --input SEALED_RUN --output NEW_DIRECTORY");
  const run = await sealedRun(values.input), report = await run.readJson("report.json") as {
    modelId: string; sourceSha256: string; rows: { referenceId: Reference; title: string; status: string; issues: string[];
      candidateFile: string | null; initialCandidatesFile?: string }[] };
  if (report.modelId !== modelId || report.sourceSha256 !== run.seal.sourceSha256 || !Array.isArray(report.rows)
    || new Set(report.rows.map(r => r.referenceId)).size !== report.rows.length) throw new Error("Invalid registry run report");
  const selected = values.cases?.split(",");
  if (selected && (new Set(selected).size !== selected.length || selected.some(id => !report.rows.some(r => r.referenceId === id))))
    throw new Error("Selected cases must occur once in the run report");
  const rows = report.rows.filter(r => !selected || selected.includes(r.referenceId));
  const output = resolve(values.output); await mkdir(output);
  const snapshot = await beginFittingSourceSnapshotV1(join(output, "execution")), files: string[] = [];
  const save = async (name: string, value: unknown) => {
    try { files.push(await writeJson(output, name, value)); }
    catch (error) { throw new ReviewFileWriteError(message(error)); }
  };
  const saveText = async (name: string, value: string) => {
    try { files.push(await writeText(output, name, value)); }
    catch (error) { throw new ReviewFileWriteError(message(error)); }
  };
  const started = performance.now(), cases = [];
  let artifact: Awaited<ReturnType<typeof buildArtifact>> | null = null;
  try {
    for (const row of rows) {
      if (!row.candidateFile) {
        try {
          if (row.initialCandidatesFile) {
            const initial = await readRegistryInitialCandidatesV1(row.referenceId, row.initialCandidatesFile, run);
            await save(row.initialCandidatesFile, initial.comparison);
          }
          cases.push({ ...row, runStatus: row.status, status: row.status, preset: null, documentFile: null });
        } catch (error) {
          if (error instanceof ReviewFileWriteError) throw error;
          cases.push({ ...row, status: "material-held", issues: [...row.issues, message(error)],
            initialCandidatesFile: null, preset: null, documentFile: null });
        }
        continue;
      }
      try {
        const loaded = await readRegistryReviewCandidateV1(await run.readJson(row.candidateFile), run);
        if (loaded.candidate.referenceId !== row.referenceId) throw new Error("Report/candidate case differs");
        const { candidate, definition: d, results, assessment, coarse, previous, initial, initialCandidates, initializationWarm } = loaded;
        const description = candidate.background
          ? `今回のfittingで選択した${candidate.background.referenceId === "baseline" ? "baseline" : "HFrEF"}を背景に、大動脈弁口面積だけを変更した研究上の比較例です。親症例・この症例とも正式採択を意味しません。`
          : d.description;
        const historicalComparison = await compare({ referenceId: candidate.referenceId, previous, current: coarse ?? null, analysisSourceSha256: snapshot.sourceSha256 });
        const comparison = initial ? await compare({ referenceId: candidate.referenceId, previous: initial,
          current: coarse ?? null, analysisSourceSha256: snapshot.sourceSha256 }) : historicalComparison;
        const inputRecord = await readInput(candidate.inputRecord);
        const comparisonOrigin = initial ? "initial-construction" as const
          : !previous && inputRecord.provenance.kind === "new-construction" ? "new-construction" as const : "historical-input" as const;
        let status: string = assessment.status, launch = null, checked = null;
        let preparedAnalysis: PreparedModelAnalysisV1 | null = null;
        let preparedCacheMiss: string | null = null;
        const issues = [...assessment.qualification.issues, ...assessment.caseTargetIssues];
        if (status === "review-pending" && coarse) {
          try {
            comparisonArtifact ??= buildArtifact();
            artifact ??= await comparisonArtifact;
            assertSource(artifact.sourceFiles, run.seal.files);
            launch = await presetFor(coarse, { presetId: `research/${candidate.referenceId}/${coarse.resultSha256.slice(0, 12)}`,
              title: d.title, description });
            checked = await continuation(artifact, launch.preset);
            const analysisInput = { preset: launch.preset, surface, artifactRevisionId: artifact.artifactRevisionId,
              preparationSourceSha256: snapshot.sourceSha256 };
            if (values["prepared-cache"]) {
              const path = join(resolve(values["prepared-cache"]), `${await hash(launch.preset.capture)}.json`);
              try { preparedAnalysis = await readPreparedModelAnalysisV1(JSON.parse(await readFile(path, "utf8")),
                { ...analysisInput, modelId, capture: launch.preset.capture }); }
              catch (error) { preparedCacheMiss = message(error); }
            }
            preparedAnalysis ??= await prepareAnalysis(analysisInput);
          } catch (error) {
            if (error instanceof PreparedSurfaceAnalysisErrorV1) await save(`${row.referenceId}-surface-analysis-held.json`,
              { analysis: error.analysis, reason: error.message, preparationSourceSha256: snapshot.sourceSha256 });
            status = "held"; issues.push(message(error)); launch = null;
          }
        } else if (!coarse) { status = "held"; issues.push("coarse-raw-evidence-unavailable"); }
        // Copy raw results, not a recomputed claim under the preparation source.
        const executionFiles: string[] = [];
        for (const r of results) { const name = `${row.referenceId}-${r.nominalDtSec === .002 ? "2ms" : "1ms"}.json`;
          await save(name, r); executionFiles.push(name); }
        if (initial) { const name = `${row.referenceId}-initial-2ms.json`; await save(name, initial); executionFiles.push(name); }
        if (initializationWarm) { const name = `${row.referenceId}-initialization-warm-2ms.json`; await save(name, initializationWarm); executionFiles.push(name); }
        if (candidate.adjustment?.searchFile) await save(`${row.referenceId}-search.json`, await run.readJson(candidate.adjustment.searchFile));
        const initialSourceFiles: string[] = [];
        if (initialCandidates) {
          const sourceFileMapping = [];
          for (const start of initialCandidates.starts) for (const original of [...start.executionFiles,
            ...(start.previousEvidenceFile ? [start.previousEvidenceFile] : [])]) {
            const name = `initial-${original}`;
            await save(name, await run.readJson(original)); initialSourceFiles.push(name);
            sourceFileMapping.push({ original, copied: name });
          }
          await save(`${row.referenceId}-initial-candidates.json`, { ...initialCandidates.comparison,
            numericalRunSourceSha256: run.seal.sourceSha256, sourceFileMapping });
        }
        const assessmentSummary = { ...assessment, runStatus: row.status,
          qualification: Object.fromEntries(Object.entries(assessment.qualification).filter(([key]) => key !== "grids")) };
        const document = await documentFor({ referenceId: row.referenceId, title: d.title, description, kind: d.kind,
          context: context(row.referenceId, candidate.background), modelId, surface, assessment: assessmentSummary, status, issues, comparison,
          results, previousDiagnostics: initial?.execution.diagnostics ?? (previous ? (await history(previous)).diagnostics : null),
          comparisonOrigin, historicalComparison: initial && previous ? historicalComparison : null,
          candidateInputs: candidate.candidateInputs, inputBinding: candidate.binding, sourceFiles: [...executionFiles, ...initialSourceFiles],
          initialCandidates: initialCandidates?.comparison,
          initialResults: initialCandidates?.starts.flatMap(s => s.results.filter(r => r.nominalDtSec === .002).map(result => ({ startId: s.startId, result }))) });
        const documentFile = `${row.referenceId}-document.json`, htmlFile = `${row.referenceId}.html`;
        await save(documentFile, document.document);
        await save(`${row.referenceId}-render-input.json`, document.renderInput);
        await save(`${row.referenceId}-comparison.json`, comparison);
        if (initial && previous) await save(`${row.referenceId}-historical-comparison.json`, historicalComparison);
        await saveText(htmlFile, await htmlFor(document.html));
        let registrationProposalFile: string | null = null;
        let archiveFiles: { ja: string; en: string } | null = null;
        if (status === "review-pending" && launch && checked && preparedAnalysis) {
          const documentId = `registry-${row.referenceId}-${document.document.contentSha256.slice(0, 12)}`;
          const { archive, reading } = await archiveFor({ documentId, dossier: document.document,
            results, grids: loaded.grids, launch, continuation: checked, preparationSourceSha256: snapshot.sourceSha256 });
          await save(`${documentId}.json`, archive);
          await save(`${documentId}.index.json`, { schemaId: archive.schemaId, documentId, identity: archive.identity, contentSha256: archive.contentSha256 });
          await save(`${documentId}.reading-v1.json`, reading);
          archiveFiles = { ja: `${documentId}-ja.html`, en: `${documentId}-en.html` };
          for (const locale of ["ja", "en"] as const) {
            await saveText(archiveFiles[locale], savedDocumentOfflineHtmlV1(archive, locale));
            await saveText(`${documentId}-${locale}.csv`, archive.views[locale].tablesCsv);
          }
          await save(archive.filenames.measurements, archive.scientificRecord.measurements);
          const presetFile = `${row.referenceId}-preset.json`;
          await save(presetFile, launch.preset);
          const analysisFile = `${preparedAnalysis.captureSha256}.json`;
          await save(analysisFile, preparedAnalysis);
          const proposal = { schemaId: "main-wire-registry-registration-proposal-v1", status: "review-pending", modelId, surface,
            referenceId: row.referenceId, sourceCandidateSha256: candidate.recordSha256, numericalSourceSha256: candidate.sourceSha256,
            preparationSourceSha256: snapshot.sourceSha256, candidateInputs: candidate.candidateInputs, inputBinding: candidate.binding,
            evidenceFiles: executionFiles, dossier: { file: documentFile, contentSha256: document.document.contentSha256 },
            preset: { file: presetFile, presetId: launch.preset.presetId, contentSha256: await hash(launch.preset), binding: launch.binding },
            preparedAnalysis: { file: analysisFile, recordSha256: preparedAnalysis.recordSha256,
              assessment: preparedAnalysis.assessment, preparationSourceSha256: preparedAnalysis.preparationSourceSha256 },
            document: { documentId, file: `${documentId}.json`, contentSha256: archive.contentSha256,
              readingFile: `${documentId}.reading-v1.json`, readingSha256: reading.contentSha256 },
            artifactSha256: artifact!.artifactSha256, artifactRevisionId: artifact!.artifactRevisionId, continuation: checked,
            reviewItems: assessment.reviewItems, formalReview: { gate: "1-of-2", status: "pending", reviews: [] },
            historicalSupportingExperiments: "not-revalidated", publicPromotionAuthorized: false };
          registrationProposalFile = `${row.referenceId}-registration-proposal.json`;
          await save(registrationProposalFile, { ...proposal, recordSha256: await hash(proposal) });
        }
        cases.push({ referenceId: row.referenceId, kind: d.kind, title: d.title, runStatus: row.status, status, issues,
          sourceCandidateSha256: candidate.recordSha256, numericalSourceSha256: candidate.sourceSha256,
          assessment: assessmentSummary, comparisonSha256: comparison.comparisonSha256,
          comparisonOrigin,
          historicalComparisonSha256: initial && previous ? historicalComparison.comparisonSha256 : null,
          initialCandidatesFile: initialCandidates ? `${row.referenceId}-initial-candidates.json` : null,
          documentFile, documentSha256: document.document.contentSha256, registrationProposalFile, archiveFiles,
          preset: launch?.preset ?? null, launchBinding: launch?.binding ?? null, continuation: checked, preparedCacheMiss });
        process.stdout.write(JSON.stringify({ referenceId: row.referenceId, status, capturePrepared: launch !== null }) + "\n");
      } catch (error) {
        if (error instanceof ReviewFileWriteError) throw error;
        cases.push({ ...row, status: "material-held", issues: [...row.issues, message(error)], preset: null, documentFile: null });
      }
    }
    if (artifact) await saveText("artifact.mjs", new TextDecoder().decode(artifact.bytes));
    const body = { schemaId: "main-wire-registry-local-review-bundle-v1", modelId, surface,
      manifest: artifact?.source.manifest ?? null, analysisMethods: artifact?.analysisMethods ?? null,
      artifactSha256: artifact?.artifactSha256 ?? null, artifactRevisionId: artifact?.artifactRevisionId ?? null,
      sourceBuildArtifactRevisionId: artifact?.sourceBuildArtifactRevisionId ?? null, usesAdmittedArtifact: artifact?.usesAdmittedArtifact ?? false,
      deterministicBuilds: artifact?.deterministicBuilds ?? 0, numericalArtifactFiles: artifact?.sourceFiles ?? [],
      numericalRun: { sourceSha256: run.seal.sourceSha256, archive: run.seal.archive },
      preparationSourceSha256: snapshot.sourceSha256, cases, allRequestedCasesReported: cases.length === rows.length,
      formalReview: "pending", publicPromotionAuthorized: false, status: "research-review-material-not-release-admission" };
    await save("bundle.json", { ...body, recordSha256: await hash(body) });
    await save("report.json", { status: body.status, wallTimeMs: performance.now() - started,
      cases: cases.map(c => ({ referenceId: c.referenceId, status: c.status, issues: c.issues, documentFile: c.documentFile })),
      publicPromotionAuthorized: false });
    await saveText("index.html", await htmlFor(indexFor(cases)));
    process.stdout.write(JSON.stringify({ output, cases: cases.map(c => ({ referenceId: c.referenceId, status: c.status })), wallTimeMs: performance.now() - started }) + "\n");
  } catch (error) { await save("failure.json", { status: "preparation-incomplete", message: message(error) }); throw error; }
  finally { await snapshot.finish(files); }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();

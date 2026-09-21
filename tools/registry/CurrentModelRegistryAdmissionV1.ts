import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { canonicalJsonStringify as canonical } from "@/engine/integrity";
import { createMainWireIntegratedStudioStaticCaseCoreReleaseV1 as release } from "@/studio/integrations/mainWireIntegratedV3/MainWireIntegratedStudioSelectedAorticOutflowExactModelV1";
import surface from "@/studio/integrations/mainWireIntegratedV3/MainWireIntegratedStudioStaticCaseSurfaceV5";
import { composeStandardModelContractV1 } from "@/studio/contracts/v2/modelSurface";
import { resolveRegisteredAnalysisMethodsV1 } from "@/analysis/registry/RegisteredAnalysisMethodsV1";
import type lockShape from "@/data/model-releases/standard74/publication.json";
import { validateScenarioPresetV2 } from "@/studio/application/authoring/StudioExperimentDataV2";
import { readPreparedModelAnalysisV1 } from "@/studio/application/authoring/PreparedModelAnalysisV1";

export const CURRENT_MODEL_PUBLICATION_FILES_V1 = {
  artifact: "data/model-releases/standard74/artifact.mjs.txt",
  lock: "data/model-releases/standard74/publication.json",
} as const;
const sha = (bytes: Uint8Array | string) => createHash("sha256").update(bytes).digest("hex");
const same = (a: unknown, b: unknown, label: string) => {
  if (canonical(a) !== canonical(b)) throw new Error(`Current model admission rejected: ${label}`);
};
function requireProof(condition: unknown, issue: string): asserts condition {
  if (!condition) throw new Error(`Current model admission rejected: ${issue}`);
}

/** A fixed reviewed package, not a hash-generated scientific approval. A new
 * exact identity requalifies its own launches and inherits the current Surface.
 * Registry publication/activation remain explicit, separate operations. */
export async function prepareCurrentModelPublicationV1(root: string, input: Readonly<{
  artifact: Uint8Array; lockJson: string; expectedModelId: string;
}>) {
  const artifact = Uint8Array.from(input.artifact), lockJson = input.lockJson;
  const read = (p: string) => readFileSync(resolve(root, p), "utf8");
  const lock = JSON.parse(read(CURRENT_MODEL_PUBLICATION_FILES_V1.lock)) as typeof lockShape;
  same(JSON.parse(lockJson), lock, "admission lock differs from complete qualification");
  const rawPackage = read("data/model-releases/standard74/package.json");
  requireProof(sha(rawPackage) === "28dfc475c562cce5871934c465e142aa27c1209d04c2a4e54b015e6351213061"
    && sha(rawPackage) === lock.reviewedLocalPackageSha256, "reviewed local package changed");
  const reviewed = JSON.parse(rawPackage);
  const evidencePath = resolve(root, reviewed.workerEvidence.path);
  const evidenceSha = sha(readFileSync(evidencePath));
  requireProof(evidenceSha === "013a304bdde48a0e6607cbab27bec07ad67a5defaa30d373035a731dee502406"
    && evidenceSha === lock.reviewedEvidenceArchiveSha256, "reviewed evidence archive changed");
  const worker = execFileSync("tar", ["-xOzf", evidencePath, "./" + reviewed.workerEvidence.entry]);
  requireProof(sha(worker) === reviewed.workerEvidence.sha256, "Worker evidence binding");
  const workerReport = JSON.parse(worker.toString("utf8"));
  requireProof(workerReport.modelId === lock.modelId && workerReport.artifactRevisionId === lock.artifactRevisionId
    && workerReport.artifactSha256 === lock.artifactSha256, "Worker exact artifact identity");
  same(workerReport.projects.map((p: { project: string }) => p.project).sort(),
    ["desktop-chromium", "desktop-webkit"], "independent browser Worker coverage");
  for (const project of workerReport.projects) {
    requireProof(project.artifactSha256 === lock.artifactSha256 && project.artifactRevisionId === lock.artifactRevisionId,
      "per-browser Worker artifact binding");
    same(project.cases.map((c: { presetId: string }) => c.presetId).sort(), lock.cases.map(c => c.presetId).sort(), "Worker case coverage");
    requireProof(project.cases.every((c: { status: string; comparedSteps: number }) => c.status === "passed" && c.comparedSteps >= 640),
      "restored Worker continuation coverage");
  }
  const bundle = JSON.parse(read("data/model-releases/standard74/bundle.json"));
  const { recordSha256, ...body } = bundle;
  requireProof(sha(canonical(body)) === recordSha256 && recordSha256 === reviewed.bundleSha256
    && recordSha256 === lock.bundleSha256, "qualified bundle changed");
  const exact = release(), manifest = exact.manifest;
  requireProof(input.expectedModelId === manifest.modelId && manifest.modelId === lock.modelId
    && manifest.modelId === reviewed.modelId, "unsupported modelId");
  same(manifest, bundle.manifest, "exact manifest changed");
  same(surface, bundle.surface, "Surface/analysis pins changed");
  requireProof(surface.surfaceReleaseId === lock.surfaceReleaseId, "Surface identity");
  const methods = resolveRegisteredAnalysisMethodsV1(surface);
  const model = composeStandardModelContractV1(manifest, surface, methods.capabilities).contract;
  const artifactSha256 = sha(artifact);
  requireProof(artifactSha256 === reviewed.artifactSha256 && artifactSha256 === lock.artifactSha256, "artifact differs from qualification");
  const manifestBytes = Buffer.from(canonical(manifest)), lengths = Buffer.alloc(8);
  lengths.writeUInt32BE(manifestBytes.length, 0); lengths.writeUInt32BE(artifact.length, 4);
  requireProof(sha(Buffer.concat([lengths, manifestBytes, artifact])) === lock.artifactRevisionId
    && lock.artifactRevisionId === reviewed.artifactRevisionId, "artifact revision binding");
  // This is a new model, not a same-model bit-equivalent artifact replacement.
  requireProof(lock.predecessorArtifactRevisionId === null && lock.equivalenceReportSha256 === null, "new exact identity admission");
  const baseline = JSON.parse(read("data/model-baselines/standard74-baseline-v1.json"));
  const { recordSha256: baselineSha, ...baselineBody } = baseline;
  requireProof(sha(canonical(baselineBody)) === baselineSha && baselineSha === lock.baselineRecordSha256, "baseline record");
  same(baseline.capture, bundle.baseline.capture, "baseline launch capture");
  same(baseline.evidence, { kind: "own-static-baseline-qualification", ...bundle.baselineQualification }, "own baseline evidence");
  same(JSON.parse(read("data/model-baselines/current-baseline-selection-v1.json")), {
    baselineId: baseline.baselineId, modelId: baseline.modelId, surfaceReleaseId: baseline.surfaceReleaseId,
    recordSha256: baselineSha, document: baseline.document,
  }, "default selection");
  requireProof(baseline.modelId === lock.modelId && baseline.surfaceReleaseId === lock.surfaceReleaseId
    && baseline.artifactSha256 === artifactSha256 && baseline.artifactRevisionId === lock.artifactRevisionId, "baseline release identity");
  const presets = [bundle.baseline, ...bundle.presets].map(validateScenarioPresetV2);
  requireProof(lock.cases.length === presets.length && presets.length === reviewed.cases.length
    && presets.length === 4, "case inventory");
  for (const [i, preset] of presets.entries()) {
    const c = lock.cases[i]!, approved = reviewed.cases[i]!;
    same(c, approved, "reviewed case binding");
    const doc = JSON.parse(read(`studio/presentation/modelDocumentation/packages/${c.documentId}.json`));
    const { contentSha256, ...documentBody } = doc;
    requireProof(sha(JSON.stringify(documentBody)) === contentSha256 && contentSha256 === c.documentSha256
      && doc.documentId === c.documentId && doc.identity.modelId === model.modelId
      && doc.identity.surfaceReleaseId === surface.surfaceReleaseId
      && doc.identity.baselineId === preset.presetId && preset.presetId === c.presetId, "case document identity/digest");
    const m = doc.scientificRecord.measurements;
    same(m.launch.preset, preset, "case document capture");
    requireProof(preset.capture.checkpoint !== undefined
      && (preset.capture.checkpoint.payload as { checkpointSha256?: string }).checkpointSha256 === c.checkpointSha256,
    "case checkpoint");
    requireProof(m.launch.binding.priorCheckpointImported === false
      && m.launch.continuation.completeFramesAndTerminalCaptureEqual === true, "own cold launch continuation");
    const receipt = m.formalReview;
    requireProof(receipt.gate === "1-of-2" && receipt.status === "accepted"
      && receipt.sourceDossierSha256 === c.sourceDossierSha256
      && receipt.decisions.length === 2 && new Set(receipt.decisions.map((r: { reviewer: string }) => r.reviewer)).size === 2
      && receipt.decisions.some((r: { vote: string }) => r.vote === "accept"), "scientific adoption reviews");
    same(receipt.decisions, c.reviews, "document review decisions");
    const prepared = JSON.parse(read(`data/model-analysis/prepared/${methods.periodicPvaDerivation!.sourceAnalysisId}/${methods.periodicPvaDerivation!.methodId}/${c.preparedAnalysis.file}`));
    requireProof(prepared.recordSha256 === c.preparedAnalysis.recordSha256, "prepared analysis digest");
    await readPreparedModelAnalysisV1(prepared, { modelId: model.modelId, artifactRevisionId: lock.artifactRevisionId, capture: preset.capture, surface });
    if (i === 0) same(baseline.document, { documentId: c.documentId, contentSha256 }, "baseline document");
    await exact.executables.captureAdapter.validateCapture({ model, capture: preset.capture });
  }
  return { artifact, manifest, defaultFixture: bundle.baseline.capture.fixture, lock, artifactSha256 };
}

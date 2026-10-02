import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { studioCanonicalJsonStringify as canonical } from "@/domain/json/CanonicalJson";
import { CardiorespiratorySessionV1 } from "@/engine/cardiorespiratory/CardiorespiratorySessionV1";
import { validateAndOwnCardiorespiratoryFixtureV1 } from "@/engine/cardiorespiratory/CardiorespiratoryFixtureV1";
import { CARDIORESPIRATORY_DEV_MODEL_ID_V1 } from "@/domain/model/CardiorespiratoryIdentityV1";
import { CardiorespiratoryStartupMonitorV1, DEFAULT_CARDIORESPIRATORY_STARTUP_POLICY_V1,
  cardiorespiratoryStartupRatesV1, readCardiorespiratoryStartupSampleV1,
} from "@/analysis/methods/cardiorespiratory/CardiorespiratoryStartupReadinessV1";
import { STUDIO_SCENARIO_PRESET_V2_SCHEMA_ID, type ScenarioCaptureV2, type ScenarioPresetV2 } from "@/studio/contracts/v2/content";
import type { StudioJsonValueV2 } from "@/studio/contracts/v2/json";
import { cardiorespiratoryStartupPresetCasesV1 } from "../scientific/CardiorespiratoryStartupCasesV1";
import type { CardiorespiratoryStartupSourceV1 } from "../scientific/CardiorespiratoryStartupSourceV1";

const sha = (value: unknown) => createHash("sha256").update(canonical(value)).digest("hex");
export type CardiorespiratoryPreparedDevInputsV1 = Readonly<{
  defaultCheckpoint: ScenarioCaptureV2["checkpoint"];
  presets: readonly ScenarioPresetV2[];
  preparation: Readonly<{
    sourceSha256: string;
    interpretation: "startup-readiness-not-full-settlement";
    cases: readonly Readonly<{ caseId: string; recordSha256: string; evidence: StudioJsonValueV2 }>[];
  }>;
}>;

/** Explicit, all-or-nothing LOCAL input. Re-evaluate the startup observer and
 * bind it to the restored exact state; a ready flag or a digest alone is not
 * evidence. The build recomputes the source closure before and after bundling.
 * These single-trajectory observations never assert full-system settlement. */
export async function readCardiorespiratoryPreparedDevInputsV1(input: Readonly<{
  root: string; directory: string; source: CardiorespiratoryStartupSourceV1;
  artifactRevisionId?: string;
}>): Promise<CardiorespiratoryPreparedDevInputsV1> {
  const release = JSON.parse(await readFile(path.join(input.root, "data/model-releases/standard74/bundle.json"), "utf8"));
  const productionInputs = [release.baseline, ...release.presets] as ScenarioPresetV2[];
  const cases = await cardiorespiratoryStartupPresetCasesV1(input.root);
  const captures: ScenarioCaptureV2[] = [], evidenceRecords: { caseId: string; recordSha256: string; evidence: StudioJsonValueV2 }[] = [];
  for (const c of cases) {
    const archive = JSON.parse(await readFile(path.join(input.directory, `${c.caseId}.json`), "utf8"));
    const { recordSha256, ...body } = archive;
    if (typeof recordSha256 !== "string" || sha(body) !== recordSha256) throw new Error(`Invalid prepared archive digest: ${c.caseId}`);
    if (archive.schemaId !== "cardiorespiratory-dev-startup-preparation-v1" || archive.scope !== "local-development-no-publication"
      || archive.caseId !== c.caseId || archive.sourcePresetId !== c.sourcePresetId
      || canonical(archive.source) !== canonical(input.source)) throw new Error(`Incompatible prepared archive: ${c.caseId}`);
    const fixture = validateAndOwnCardiorespiratoryFixtureV1(archive.fixture);
    if (canonical(fixture) !== canonical(c.fixture)) throw new Error(`Prepared case changed its fixture: ${c.caseId}`);
    const preparation = archive.preparation;
    const monitor = CardiorespiratoryStartupMonitorV1.restore(preparation.observer), evidence = monitor.assessment();
    if (preparation.status !== "ready" || preparation.reason !== null || evidence.status !== "ready"
      || canonical(evidence.policy) !== canonical(DEFAULT_CARDIORESPIRATORY_STARTUP_POLICY_V1)
      || canonical(evidence) !== canonical(preparation.evidence)
      || canonical(evidence.rates) !== canonical(cardiorespiratoryStartupRatesV1(fixture))
      || monitor.contextKey !== canonical(fixture)) throw new Error(`Prepared case has no current startup readiness evidence: ${c.caseId}`);
    const restored = CardiorespiratorySessionV1.restore(fixture, preparation.checkpoint);
    const terminal = readCardiorespiratoryStartupSampleV1(restored);
    const proof = preparation.proof;
    if (!proof || proof.identity.modelId !== CARDIORESPIRATORY_DEV_MODEL_ID_V1 || proof.identity.sourceSha256 !== input.source.sha256
      || (proof.identity.artifactRevisionId !== undefined && proof.identity.artifactRevisionId !== input.artifactRevisionId)
      || proof.fixtureSha256 !== sha(fixture) || proof.policySha256 !== sha(evidence.policy)
      || proof.checkpointSha256 !== sha(preparation.checkpoint) || proof.terminalSampleSha256 !== sha(terminal)
      || proof.evidenceSha256 !== sha(evidence)
      || canonical(terminal) !== canonical(preparation.observer.terminalSample)
      || terminal.timeSec !== evidence.acceptedTimeSec
      || canonical(restored.checkpoint()) !== canonical(preparation.checkpoint)) {
      throw new Error(`Prepared checkpoint and startup evidence binding differ: ${c.caseId}`);
    }
    const clock = restored.currentAcceptedClock();
    captures.push({ fixture: fixture as unknown as StudioJsonValueV2, checkpoint: {
      acceptedRevision: clock.revision, acceptedTimeSec: clock.acceptedTimeSec, payload: preparation.checkpoint,
    } });
    evidenceRecords.push({ caseId: c.caseId, recordSha256, evidence: evidence as unknown as StudioJsonValueV2 });
  }
  return { defaultCheckpoint: captures[0]!.checkpoint,
    presets: productionInputs.map((source, index) => ({ schemaId: STUDIO_SCENARIO_PRESET_V2_SCHEMA_ID,
      presetId: `cardiorespiratory-dev-${cases[index + 1]!.caseId}`, modelId: CARDIORESPIRATORY_DEV_MODEL_ID_V1,
      title: `${source.title} · Dev`, description: "Warmed up offline for startup. Respiratory variation and gradual gas drift may continue; full-system settlement and physiological teaching targets have not been qualified.",
      capture: captures[index + 1]!,
    })),
    preparation: { sourceSha256: input.source.sha256, interpretation: "startup-readiness-not-full-settlement", cases: evidenceRecords },
  };
}

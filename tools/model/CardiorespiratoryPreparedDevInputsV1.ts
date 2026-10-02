import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { studioCanonicalJsonStringify as canonical } from "@/domain/json/CanonicalJson";
import { CardiorespiratorySessionV1, type CardiorespiratoryCheckpointV2 } from "@/engine/cardiorespiratory/CardiorespiratorySessionV1";
import { DEFAULT_CARDIORESPIRATORY_FIXTURE_V1, validateAndOwnCardiorespiratoryFixtureV1 } from "@/engine/cardiorespiratory/CardiorespiratoryFixtureV1";
import { CARDIORESPIRATORY_DEV_MODEL_ID_V1 } from "@/domain/model/CardiorespiratoryIdentityV1";
import { CardiorespiratorySettlementMonitorV1, DEFAULT_CARDIORESPIRATORY_SETTLEMENT_CONFIG_V1 } from "@/analysis/methods/cardiorespiratory/CardiorespiratorySettlementV1";
import { STUDIO_SCENARIO_PRESET_V2_SCHEMA_ID, type ScenarioCaptureV2, type ScenarioPresetV2 } from "@/studio/contracts/v2/content";
import type { StudioJsonValueV2 } from "@/studio/contracts/v2/json";
import type { CardiorespiratoryPreparationSourceV1 } from "../scientific/CardiorespiratoryPreparationSourceV1";

const sha = (value: string) => createHash("sha256").update(value).digest("hex");
export type CardiorespiratoryPreparedDevInputsV1 = Readonly<{
  defaultCheckpoint: ScenarioCaptureV2["checkpoint"];
  presets: readonly ScenarioPresetV2[];
  preparation: Readonly<{
    sourceSha256: string;
    interpretation: "numerical-settlement-only-teaching-targets-not-qualified";
    cases: readonly Readonly<{ caseId: string; recordSha256: string; evidence: StudioJsonValueV2 }>[];
  }>;
}>;

/** Explicit, all-or-nothing LOCAL build input. Evidence is re-evaluated from
 * its method checkpoint and never promoted from a caller-provided status flag.
 * The build caller independently recomputes the complete preparation source
 * fingerprint; the artifact and this source are checked against one checkout.
 */
export async function readCardiorespiratoryPreparedDevInputsV1(input: Readonly<{
  root: string; directory: string; source: CardiorespiratoryPreparationSourceV1;
}>): Promise<CardiorespiratoryPreparedDevInputsV1> {
  const release = JSON.parse(await readFile(path.join(input.root, "data/model-releases/standard74/bundle.json"), "utf8"));
  const productionInputs = [release.baseline, ...release.presets] as ScenarioPresetV2[];
  const cases = [{ caseId: "dev-baseline", source: null }, ...productionInputs.map(source => ({
    caseId: source.presetId.replace(/^standard74-/, ""), source,
  }))];
  const captures: ScenarioCaptureV2[] = [], evidenceRecords: { caseId: string; recordSha256: string; evidence: StudioJsonValueV2 }[] = [];
  for (const c of cases) {
    const archive = JSON.parse(await readFile(path.join(input.directory, `${c.caseId}.json`), "utf8"));
    const { recordSha256, ...body } = archive;
    if (typeof recordSha256 !== "string" || sha(canonical(body)) !== recordSha256) throw new Error(`Invalid prepared archive digest: ${c.caseId}`);
    if (archive.schemaId !== "cardiorespiratory-dev-preparation-v1" || archive.scope !== "local-development-no-publication"
      || archive.caseId !== c.caseId || archive.sourcePresetId !== (c.source?.presetId ?? null)
      || canonical(archive.source) !== canonical(input.source)
      || canonical(archive.config) !== canonical(DEFAULT_CARDIORESPIRATORY_SETTLEMENT_CONFIG_V1)) {
      throw new Error(`Incompatible prepared archive: ${c.caseId}`);
    }
    const d = DEFAULT_CARDIORESPIRATORY_FIXTURE_V1;
    const inherited = c.source?.capture.fixture as unknown as typeof d | undefined;
    const expectedFixture = inherited ? { ...d, anatomyId: inherited.anatomyId,
      hemodynamicResearchInputs: inherited.hemodynamicResearchInputs, mechanismResearchInputs: inherited.mechanismResearchInputs,
      cardiorespiratory: { ...d.cardiorespiratory, respiratory: { ...d.cardiorespiratory.respiratory,
        ventilator: { ...d.cardiorespiratory.respiratory.ventilator, peepCmH2O: inherited.hemodynamicResearchInputs.peepCmH2O } } } } : d;
    const fixture = validateAndOwnCardiorespiratoryFixtureV1(archive.fixture);
    if (canonical(fixture) !== canonical(expectedFixture)) throw new Error(`Prepared case changed its fixture: ${c.caseId}`);
    const monitor = CardiorespiratorySettlementMonitorV1.restore(archive.monitor), evidence = monitor.evidence();
    if (evidence.status !== "qualified" || canonical(evidence.config) !== canonical(archive.config)
      || canonical(evidence) !== canonical(archive.evidence) || !Array.isArray(archive.histories)
      || archive.histories.length !== evidence.seedIds.length || !archive.qualifiedCheckpoint
      || canonical(archive.qualifiedCheckpoint) !== canonical(archive.histories[0])) {
      throw new Error(`Prepared case has no current full-system qualification: ${c.caseId}`);
    }
    const restored = (archive.histories as CardiorespiratoryCheckpointV2[]).map(checkpoint => CardiorespiratorySessionV1.restore(fixture, checkpoint));
    if (restored.some(session => session.currentAcceptedClock().acceptedTimeSec !== evidence.acceptedTimeSec)) {
      throw new Error(`Prepared physical state and evidence clocks differ: ${c.caseId}`);
    }
    if (restored.some((session, index) => canonical(session.physicalSettlementProjectionV1())
      !== canonical(archive.monitor.terminalProjections[index]))) {
      throw new Error(`Prepared physical state differs from the last observed history: ${c.caseId}`);
    }
    const reference = restored[0]!;
    const projection = reference.physicalSettlementProjectionV1();
    const template = archive.monitor.template;
    const optional = (id: string) => projection.optionalCoordinatePrefixes.some(prefix => id === prefix || id.startsWith(prefix + "."));
    const mandatoryPolicy = (value: typeof projection) => ({
      continuous: Object.fromEntries(Object.entries(value.continuous).filter(([id]) => !optional(id)).sort(([a], [b]) => a.localeCompare(b))
        .map(([id, { value: _value, ...policy }]) => [id, policy])),
      discrete: Object.keys(value.discrete).filter(id => !optional(id)).sort(),
    });
    if (canonical(template.optionalCoordinatePrefixes) !== canonical(projection.optionalCoordinatePrefixes)
      || canonical(template.invariants) !== canonical(projection.invariants)
      || canonical(mandatoryPolicy(template)) !== canonical(mandatoryPolicy(projection))) {
      throw new Error(`Prepared observer differs from exact physical-state policy: ${c.caseId}`);
    }
    if (canonical(reference.checkpoint()) !== canonical(archive.qualifiedCheckpoint)) throw new Error(`Prepared checkpoint round trip failed: ${c.caseId}`);
    const clock = reference.currentAcceptedClock();
    captures.push({ fixture: fixture as unknown as StudioJsonValueV2, checkpoint: {
      acceptedRevision: clock.revision, acceptedTimeSec: clock.acceptedTimeSec, payload: archive.qualifiedCheckpoint,
    } });
    evidenceRecords.push({ caseId: c.caseId, recordSha256, evidence: evidence as unknown as StudioJsonValueV2 });
  }
  return { defaultCheckpoint: captures[0]!.checkpoint,
    presets: productionInputs.map((source, index) => ({ schemaId: STUDIO_SCENARIO_PRESET_V2_SCHEMA_ID,
      presetId: `cardiorespiratory-dev-${cases[index + 1]!.caseId}`, modelId: CARDIORESPIRATORY_DEV_MODEL_ID_V1,
      title: `${source.title} · Dev`, description: "Numerically settled cardiorespiratory development case. Physiological teaching targets have not been qualified.",
      capture: captures[index + 1]!,
    })),
    preparation: { sourceSha256: input.source.sha256, interpretation: "numerical-settlement-only-teaching-targets-not-qualified", cases: evidenceRecords },
  };
}

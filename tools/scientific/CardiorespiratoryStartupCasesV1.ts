import { readFile } from "node:fs/promises";
import path from "node:path";
import { DEFAULT_CARDIORESPIRATORY_FIXTURE_V1 as baseline, validateAndOwnCardiorespiratoryFixtureV1 as own,
  type CardiorespiratoryFixtureV1 } from "@/engine/cardiorespiratory/CardiorespiratoryFixtureV1";

export type CardiorespiratoryStartupPresetCaseV1 = Readonly<{
  caseId: string; sourcePresetId: string | null; fixture: CardiorespiratoryFixtureV1;
}>;
/** Inherit production parameters, not their checkpoints or scientific claims. */
export async function cardiorespiratoryStartupPresetCasesV1(root: string): Promise<readonly CardiorespiratoryStartupPresetCaseV1[]> {
  const release = JSON.parse(await readFile(path.join(root, "data/model-releases/standard74/bundle.json"), "utf8"));
  return [{ caseId: "dev-baseline", sourcePresetId: null, fixture: own(baseline) },
    ...[release.baseline, ...release.presets].map((preset): CardiorespiratoryStartupPresetCaseV1 => {
      const inherited = preset.capture.fixture;
      return { caseId: preset.presetId.replace(/^standard74-/, ""), sourcePresetId: preset.presetId,
        fixture: own({ ...baseline, anatomyId: inherited.anatomyId,
          hemodynamicResearchInputs: inherited.hemodynamicResearchInputs, mechanismResearchInputs: inherited.mechanismResearchInputs,
          cardiorespiratory: { ...baseline.cardiorespiratory, respiratory: { ...baseline.cardiorespiratory.respiratory,
            ventilator: { ...baseline.cardiorespiratory.respiratory.ventilator, peepCmH2O: inherited.hemodynamicResearchInputs.peepCmH2O } } } }) };
    })];
}

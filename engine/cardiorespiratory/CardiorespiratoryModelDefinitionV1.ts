import { createMainWireModelDefinitionV1, createMainWireNumericalPolicyV1 } from "@/engine/executionPlan/MainWireModelDefinitionV1";
import type { ModelDefinitionV1, ModelStateDefinitionV1, NumericalPolicyV1 } from "@/engine/executionPlan/ModelDefinitionV1";
import { MAIN_WIRE_FIVE_WALL_ACCEPTED_NUMERICAL_READBACK_LAYOUT_V1 } from "@/engine/myocardium/MainWireFiveWallCoronaryTransactionV2";
import { CARDIORESPIRATORY_MODEL_DEFINITION_V1_ID, CARDIORESPIRATORY_NUMERICAL_POLICY_V1_ID,
  CARDIORESPIRATORY_UPDATE_GROUP_V1_ID, CARDIORESPIRATORY_PULMONARY_PATH_KERNEL_V1_ID,
  CARDIORESPIRATORY_PULMONARY_PATH_IDS_V1, CARDIORESPIRATORY_STATE_OWNERS_V1 } from "./CardiorespiratoryExecutionPlanContractV1";

/** Build input only. Runtime consumes the checked-in compiled descriptor. */
export function createCardiorespiratoryModelDefinitionV1(template: Readonly<Record<string, unknown>>): ModelDefinitionV1 {
  const base = createMainWireModelDefinitionV1();
  const expectedRoots = CARDIORESPIRATORY_STATE_OWNERS_V1.map(({ root }) => root).sort();
  if (JSON.stringify(Object.keys(template).sort()) !== JSON.stringify(expectedRoots)) {
    throw new Error("Cardiorespiratory definition accepted-owner roots drifted");
  }
  const components = CARDIORESPIRATORY_STATE_OWNERS_V1.map((owner, index) => {
    const states: ModelStateDefinitionV1[] = [];
    collectStates(template[owner.root], ["cardiorespiratory", owner.root], states);
    if (states.length === 0) throw new Error(`Empty cardiorespiratory owner ${owner.root}`);
    return Object.freeze({ componentId: owner.componentId, ordinal: base.components.length + index,
      kernelId: owner.kernelId, states: Object.freeze(states) });
  });
  const paths = base.hydraulicTopology.paths.flatMap((path) => path.pathId === "PCap_PVen"
    ? CARDIORESPIRATORY_PULMONARY_PATH_IDS_V1.map((pathId) => ({ ...path, pathId, kernelId: CARDIORESPIRATORY_PULMONARY_PATH_KERNEL_V1_ID }))
    : [path]).map((path, ordinal) => Object.freeze({ ...path, ordinal }));
  if (paths.length !== base.hydraulicTopology.paths.length + 1) throw new Error("Pulmonary parent path is missing");
  return Object.freeze({ ...base, definitionId: CARDIORESPIRATORY_MODEL_DEFINITION_V1_ID,
    components: Object.freeze([...base.components, ...components]),
    hydraulicTopology: Object.freeze({ ...base.hydraulicTopology, paths: Object.freeze(paths) }) });
}

export function createCardiorespiratoryNumericalPolicyV1(): NumericalPolicyV1 {
  const base = createMainWireNumericalPolicyV1();
  return Object.freeze({ ...base, policyId: CARDIORESPIRATORY_NUMERICAL_POLICY_V1_ID,
    updateGroups: Object.freeze(base.updateGroups.map((group) => Object.freeze({ ...group,
      updateGroupId: CARDIORESPIRATORY_UPDATE_GROUP_V1_ID,
      integration: "fixed-step-conservative-partitioned" as const }))) });
}

function collectStates(value: unknown, segments: readonly string[], result: ModelStateDefinitionV1[]): void {
  if (segments.length === 3 && segments[2] === "id"
    && ((segments[1] === "systemic" && value === "systemic")
      || (segments[1] === "myocardium" && value === "myocardium"))) return;
  if (typeof value === "number" || typeof value === "boolean") {
    if (typeof value === "number" && !Number.isFinite(value)) throw new Error(`Nonfinite state ${segments.join("/")}`);
    result.push(Object.freeze({ stateId: segments.join("/"), ordinal: result.length,
      storageKind: typeof value === "boolean" ? "boolean-u8" : "continuous-f64",
      authorityPointer: "/" + segments.map((segment) => segment.replace(/~/g, "~0").replace(/\//g, "~1")).join("/"),
      unit: stateUnit(segments) }));
    return;
  }
  if (value === null || typeof value !== "object") throw new Error(`Unsupported numerical state ${segments.join("/")}`);
  if (Array.isArray(value)) value.forEach((entry, index) => collectStates(entry, [...segments, String(index)], result));
  else for (const key of Object.keys(value).sort()) collectStates((value as Record<string, unknown>)[key], [...segments, key], result);
}

function stateUnit(segments: readonly string[]): string {
  let name = segments.at(-1)!;
  if (segments[1] === "hemodynamicReadback" && segments[2] === "values") {
    name = Object.entries(MAIN_WIRE_FIVE_WALL_ACCEPTED_NUMERICAL_READBACK_LAYOUT_V1)
      .filter(([, offset]) => offset <= Number(name)).sort((a, b) => b[1] - a[1])[0]![0];
  }
  if (name.endsWith("MmHgMlPerSec")) return "mmHg*mL/s";
  if (name.endsWith("MlPerSec")) return "mL/s";
  if (name.endsWith("MilliJ")) return "mJ";
  if (name.endsWith("Ml")) return "mL";
  if (name.endsWith("MolPerSec")) return "mol/s";
  if (name.endsWith("Mol")) return "mol";
  if (name.endsWith("MmHg")) return "mmHg";
  if (name.endsWith("MlMin")) return "mL/min";
  if (name.endsWith("MlSec")) return "mL/s";
  if (name.endsWith("Sec")) return "s";
  if (name.endsWith("L") && name.includes("Volume")) return "L";
  return "1";
}

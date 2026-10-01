import type { ControlDefinitionV2 } from "@/studio/contracts/v2/model";
import type { ExactModelProjectedControlValueV1 } from "@/studio/application/model/ExactModelFixtureProjectionV1";

/** Display-only intersection across selected Scenarios. Exact mutation still
 * validates the complete fixture at its accepted boundary. Null means selected
 * Scenarios have no common valid setting, so the control must be disabled. */
export function boundCardiorespiratoryControlV1(control: ControlDefinitionV2,
  scenarioValues: readonly Readonly<Record<string, ExactModelProjectedControlValueV1>>[]): ControlDefinitionV2 | null {
  if (!control.controlId.startsWith("cardiorespiratory.") && control.controlId !== "ventilation.peep-cm-h2o") return control;
  let minimum = control.minimum, maximum = control.maximum;
  for (const values of scenarioValues) {
    const read = (suffix: string) => { const v = values[`cardiorespiratory.ventilator.${suffix}`]; return v?.status === "value" ? v.value : undefined; };
    const rate = read("rate"), inspiration = read("inspiratory-time"), hold = read("inspiratory-hold"), peep = read("peep"), limit = read("pressure-limit");
    const belowOnGrid = (v: number) => Number(((Math.ceil(v / control.step - 1e-9) - 1) * control.step).toPrecision(12));
    const aboveOnGrid = (v: number) => Number(((Math.floor(v / control.step + 1e-9) + 1) * control.step).toPrecision(12));
    if (control.controlId.endsWith("ventilator.rate") && inspiration !== undefined) maximum = Math.min(maximum, belowOnGrid(60 / inspiration));
    if (control.controlId.endsWith("ventilator.inspiratory-time")) {
      if (rate !== undefined) maximum = Math.min(maximum, belowOnGrid(60 / rate));
      if (hold !== undefined) minimum = Math.max(minimum, aboveOnGrid(hold));
    }
    if (control.controlId.endsWith("ventilator.inspiratory-hold") && inspiration !== undefined) maximum = Math.min(maximum, belowOnGrid(inspiration));
    if ((control.controlId.endsWith("ventilator.peep") || control.controlId === "ventilation.peep-cm-h2o") && limit !== undefined) maximum = Math.min(maximum, limit);
    if (control.controlId.endsWith("ventilator.pressure-limit") && peep !== undefined) minimum = Math.max(minimum, peep);
  }
  if (minimum > maximum) return null;
  return minimum !== control.minimum || maximum !== control.maximum ? { ...control, minimum, maximum } : control;
}

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { WorkbenchLastMeasuredOutputsV1 } from "@/components/workbench/presentation/WorkbenchLastMeasuredOutputsV1";
import { ExperimentOutputGridV3, type ExperimentOutputPresentationItemV3 as Item } from "@/components/workbench/ExperimentPanePresentationV3";
import {
  projectWorkbenchObservationV3,
  workbenchMobileOutputKeysV3,
  workbenchMeasurementScopeKeyV3,
  workbenchObservedOutputKeyV3,
  type WorkbenchOutputPaneReadingV3,
} from "@/components/workbench/presentation/WorkbenchObservationV3";

const current: Item = { itemId: "co", outputId: "co", label: "CO", unit: "L/min", value: 5,
  availability: "available", quality: "accepted-derived" };
const missing: Item = { ...current, value: null, availability: "unavailable", quality: "not-assessed" };

describe("last measured outputs are presentation only", () => {
  it("retains the previous value while preserving current unavailability", () => {
    const memory = new WorkbenchLastMeasuredOutputsV1();
    memory.remember([current]);
    const item = memory.project([missing], "Previous measurement")[0]!;
    expect(item).toMatchObject({ value: 5, availability: "unavailable", quality: "not-assessed", staleNotice: "Previous measurement" });
    expect(missing.value).toBeNull();
    const html = renderToStaticMarkup(<ExperimentOutputGridV3 items={[item]} variant="pane" />);
    expect(html).toContain('data-output-stale="true"');
    expect(html).toContain('title="Previous measurement"');
    expect(html).toContain("Previous measurement");
    expect(html).not.toContain("—");
  });
  it("never invents the first measurement or borrows another scope's memory", () => {
    const memory = new WorkbenchLastMeasuredOutputsV1();
    expect(memory.project([missing], "old")[0]).toBe(missing);
    memory.remember([current]);
    expect(new WorkbenchLastMeasuredOutputsV1().project([missing], "old")[0]).toBe(missing);
  });
  it("replaces stale values immediately with new measured values, including zero", () => {
    const memory = new WorkbenchLastMeasuredOutputsV1();
    memory.remember([current]);
    const zero = { ...current, value: 0 };
    expect(memory.project([zero], "old")[0]).toBe(zero);
    memory.remember([zero]);
    expect(memory.project([missing], "old")[0]?.value).toBe(0);
  });
  it("does not overwrite memory with missing, NaN or stale data", () => {
    const memory = new WorkbenchLastMeasuredOutputsV1();
    memory.remember([current]);
    memory.remember([missing]);
    memory.remember([{ ...current, value: NaN }]);
    memory.remember([{ ...current, value: 9, quality: "not-assessed" }]);
    memory.remember([{ ...current, value: 9, staleNotice: "old" }]);
    expect(memory.project([missing], "old")[0]?.value).toBe(5);
  });
  it("retains a whole pressure summary instead of mixing old and new members", () => {
    const memory = new WorkbenchLastMeasuredOutputsV1();
    const pressure = { ...current, itemId: "aop", unit: "mmHg", value: null, displayValue: "120/80 (93)" };
    memory.remember([pressure]);
    const incomplete = { ...missing, itemId: "aop", unit: "mmHg", displayValue: "125/— (—)" };
    expect(memory.project([incomplete], "old")[0]).toMatchObject({ displayValue: "120/80 (93)", staleNotice: "old", availability: "unavailable" });
    memory.remember([{ ...pressure, value: 125, displayValue: "125/— (—)" }]);
    expect(memory.project([incomplete], "old")[0]?.displayValue).toBe("120/80 (93)");
  });
  it("keeps memory bounded to selected items and refuses a changed unit", () => {
    const memory = new WorkbenchLastMeasuredOutputsV1();
    memory.remember([current]);
    const changedUnit = { ...missing, unit: "mL/s" };
    expect(memory.project([changedUnit], "old")[0]).toBe(changedUnit);
    memory.remember([]);
    expect(memory.project([missing], "old")[0]).toBe(missing);
  });
  it("does not commit measurements from a render that was never committed", () => {
    const memory = new WorkbenchLastMeasuredOutputsV1();
    memory.project([current], "old");
    expect(memory.project([missing], "old")[0]).toBe(missing);
  });
});

describe("phone Workbench observation over pane readings", () => {
  const reading = (measured: readonly Item[], memory: WorkbenchLastMeasuredOutputsV1, scenarioId = "scenario/a"): WorkbenchOutputPaneReadingV3 => ({
    paneId: "pane/a", title: "Haemodynamics", bindingMode: "fixed", scenarioId, measured, memory, previousValueNotice: "Previous measurement",
    scenario: { label: scenarioId, colorHex: "#123456" },
  });
  const key = workbenchObservedOutputKeyV3("pane/a", "co");
  const first = (groups: ReturnType<typeof projectWorkbenchObservationV3>) => groups[0]?.items[0];

  it("projects without writing, then keeps a valid value after commit once it becomes unavailable", () => {
    const memory = new WorkbenchLastMeasuredOutputsV1();
    // Render phase: projection alone never remembers a speculative value.
    const groups = projectWorkbenchObservationV3([reading([current], memory)], [key]);
    expect(groups[0]).toMatchObject({ key: "pane/a", title: "Haemodynamics", following: false, scenario: { label: "scenario/a" } });
    expect(first(groups)).toMatchObject({ itemId: key, value: 5 });
    expect(memory.project([missing], "old")[0]).toBe(missing);
    // Commit phase (what the layout effect does): the pane's complete measured set is remembered.
    memory.remember([current]);
    expect(first(projectWorkbenchObservationV3([reading([missing], memory)], [key]))).toMatchObject({ value: 5, availability: "unavailable", staleNotice: "Previous measurement" });
    // A pane without observed items contributes no group.
    expect(projectWorkbenchObservationV3([reading([current], memory)], [])).toEqual([]);
    // Remembering the full set keeps unobserved siblings; an observation-only subset would have dropped them.
    const sibling = { ...current, itemId: "sv", outputId: "sv", value: 70 };
    memory.remember([current, sibling]);
    expect(memory.project([{ ...missing, itemId: "sv", outputId: "sv" }], "old")[0]?.value).toBe(70);
  });

  it("scopes memory by pane and resolved Scenario so rebinding never carries a value across", () => {
    const scopes = new Map<string, WorkbenchLastMeasuredOutputsV1>();
    const scope = (scenarioId: string) => {
      const scopeKey = workbenchMeasurementScopeKeyV3("pane/a", scenarioId);
      const memory = scopes.get(scopeKey) ?? new WorkbenchLastMeasuredOutputsV1();
      scopes.set(scopeKey, memory);
      return memory;
    };
    scope("scenario/a").remember([current]);
    expect(first(projectWorkbenchObservationV3([reading([missing], scope("scenario/a"))], [key]))?.value).toBe(5);
    const rebound = first(projectWorkbenchObservationV3([reading([missing], scope("scenario/b"), "scenario/b")], [key]));
    expect(rebound?.value).toBeNull();
    expect(rebound?.staleNotice).toBeUndefined();
    expect(workbenchMeasurementScopeKeyV3("pane/a", null)).not.toBe(workbenchMeasurementScopeKeyV3("pane/a", "scenario/a"));
    expect(workbenchObservedOutputKeyV3("pane/a", "b")).not.toBe(workbenchObservedOutputKeyV3("pane/ab", ""));
  });

  it("hides a heading on screen only when one group, one Scenario and a title that only repeats the target", () => {
    const memory = new WorkbenchLastMeasuredOutputsV1();
    const single = (title: string, extra: Partial<WorkbenchOutputPaneReadingV3> = {}): WorkbenchOutputPaneReadingV3 => ({
      ...reading([current], memory), title, scenarioLabel: "基準", scenario: undefined, ...extra,
    });
    const options = { genericTitles: ["出力"] };
    // Title repeats the only Scenario, or is the generic role word: hidden, still titled for assistive technology.
    expect(projectWorkbenchObservationV3([single("基準")], [key], options)[0]).toMatchObject({ title: "基準", headingHidden: true });
    expect(projectWorkbenchObservationV3([single("出力")], [key], options)[0]).toMatchObject({ headingHidden: true });
    // The stored default title of a Workbench output pane is generic in every locale.
    expect(projectWorkbenchObservationV3([single("Outputs")], [key])[0]).toMatchObject({ headingHidden: true });
    expect(projectWorkbenchObservationV3([single(" outputs ")], [key])[0]).toMatchObject({ headingHidden: true });
    expect(projectWorkbenchObservationV3([single("  ")], [key], options)[0]).toMatchObject({ headingHidden: true });
    // A semantic title stays visible even alone.
    expect(projectWorkbenchObservationV3([single("弁関連")], [key], options)[0]?.headingHidden).toBeUndefined();
    // Several open Scenarios: the pane's Scenario identifies the values, so the heading stays.
    expect(projectWorkbenchObservationV3([single("基準", { scenario: { label: "基準", colorHex: "#000" } })], [key], options)[0]?.headingHidden).toBeUndefined();
    // Two groups: both headings stay even when titles only name the Scenario.
    const second: WorkbenchOutputPaneReadingV3 = { ...single("基準"), paneId: "pane/b" };
    const two = projectWorkbenchObservationV3([single("基準"), second], [key, workbenchObservedOutputKeyV3("pane/b", "co")], options);
    expect(two.map((group) => group.headingHidden)).toEqual([undefined, undefined]);
  });

  it("derives compact and expanded views from the currently configured pane items", () => {
    const items = Array.from({ length: 12 }, (_, index) => ({ ...current, itemId: `item/${index}` }));
    const readings = [reading(items, new WorkbenchLastMeasuredOutputsV1())];
    expect(workbenchMobileOutputKeysV3(readings, false)).toHaveLength(6);
    expect(workbenchMobileOutputKeysV3(readings, true)).toEqual(items.map(item => workbenchObservedOutputKeyV3("pane/a", item.itemId)));
    const edited = [{ ...readings[0]!, measured: items.slice(3, 5) }];
    expect(workbenchMobileOutputKeysV3(edited, false)).toEqual(workbenchMobileOutputKeysV3(edited, true));
    expect(workbenchMobileOutputKeysV3([], true)).toEqual([]);
  });
});

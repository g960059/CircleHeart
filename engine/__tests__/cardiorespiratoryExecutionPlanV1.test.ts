import { describe, expect, it } from "vitest";
import { compileExecutionPlanV1 } from "@/engine/executionPlan/ExecutionPlanCompilerV1";
import { createCardiorespiratoryModelDefinitionV1, createCardiorespiratoryNumericalPolicyV1 }
  from "@/engine/cardiorespiratory/CardiorespiratoryModelDefinitionV1";
import { createCardiorespiratoryColdStateV1 } from "@/engine/cardiorespiratory/CardiorespiratorySessionV1";
import { CARDIORESPIRATORY_EXECUTION_PLAN_DESCRIPTOR_V1 as descriptor,
  CARDIORESPIRATORY_EXECUTION_PLAN_KERNEL_BINDINGS_V1 as catalog,
  bindCardiorespiratoryExecutionPlanV1, prepareCardiorespiratoryExecutionPlanV1 }
  from "@/engine/cardiorespiratory/CardiorespiratoryExecutionPlanV1";
import { bindExecutionPlanV1 } from "@/runtime/executionPlan/BoundExecutionPlanV1";
import { resolveMainWireHydraulicExecutionPlanDispatchV1 } from "@/engine/vnext/coupled/MainWireFiveWallCoupledNewtonShadowV1";
import { createMainWireExtendedAcceptedTypedStateManifestV1 } from "@/engine/vnext/MainWireAcceptedTypedStateV1";
import { TransactionalTypedStateImageV1 } from "@/engine/vnext/TransactionalTypedStateImageV1";
import { bindExecutionPlanAcceptedTypedStateV1, readExecutionPlanAcceptedTypedStateIntoLogicalV1 }
  from "@/engine/vnext/ExecutionPlanAcceptedTypedStateBindingV1";
import { bindMainWireAcceptedTypedExtensionV1 } from "@/engine/vnext/MainWireAcceptedTypedExtensionBindingV1";
import { createMainWireAcceptedTypedBoundaryBindingV1, createMainWireExtendedAcceptedTypedBoundaryBindingV1,
  readMainWireAcceptedTypedClockV1 } from "@/engine/vnext/MainWireAcceptedTypedBoundaryV1";
import { createMainWireExtendedAcceptedTypedHemodynamicBindingV1 } from "@/engine/vnext/MainWireAcceptedTypedHemodynamicV1";

describe("cardiorespiratory development execution plan", () => {
  it("reproduces the checked-in descriptor with the pure build compiler", () => {
    const template = createCardiorespiratoryColdStateV1().cardiorespiratory;
    const before = JSON.stringify(template);
    expect(compileExecutionPlanV1(createCardiorespiratoryModelDefinitionV1(template), createCardiorespiratoryNumericalPolicyV1())).toEqual(descriptor);
    expect(JSON.stringify(template)).toBe(before);
    const reversed = Object.fromEntries(Object.entries(template).reverse());
    expect(compileExecutionPlanV1(createCardiorespiratoryModelDefinitionV1(reversed), createCardiorespiratoryNumericalPolicyV1())).toEqual(descriptor);
  });

  it("has two zero-storage perfusion paths with the original 31 pools and 30 active Newton unknowns", () => {
    const graph = descriptor.hydraulicGraph;
    expect(graph.nodeIds).toHaveLength(31);
    expect(graph.pathIds).not.toContain("PCap_PVen");
    for (const name of ["PCap_PVen.unit1", "PCap_PVen.unit2"]) {
      const i = graph.pathIds.indexOf(name);
      expect(i).toBeGreaterThanOrEqual(0);
      expect(graph.nodeIds[graph.upstreamNodeIndices[i]!]).toBe("PCap");
      expect(graph.nodeIds[graph.downstreamNodeIndices[i]!]).toBe("PVen");
      expect(graph.pathKernelIds[i]).toBe("pulmonary-flow/regional-waterfall-v1");
    }
    expect(descriptor.solveGroups[0]?.activeUnknownCount).toBe(30);
    expect(graph.conservationPools[0]?.memberStateLogicalIndices).toHaveLength(31);
    expect(descriptor.updateSchedule.groups[0]?.integration).toBe("fixed-step-conservative-partitioned");
    const readbackUnit = (index: number) => descriptor.stateLayout.slots.find(slot =>
      slot.authorityPointer === `/cardiorespiratory/hemodynamicReadback/values/${index}`)?.unit;
    expect([0, 1, 5, 18, 62, 63, 72].map(readbackUnit)).toEqual(["s", "mL", "mmHg", "mL/s", "mmHg*mL/s", "1", "mJ"]);
  });

  it("binds every new numerical leaf to the accepted typed image without analysis placeholders", () => {
    const initial = createCardiorespiratoryColdStateV1();
    const { cardiorespiratory, ...hemo } = initial;
    const arrays: string[] = [], numericalPointers: string[] = [];
    const visit = (value: unknown, pointer: string) => {
      if (typeof value === "number" || typeof value === "boolean") numericalPointers.push(pointer);
      if (Array.isArray(value)) arrays.push(pointer);
      if (value && typeof value === "object") for (const [key, child] of Object.entries(value)) visit(child, `${pointer}/${key}`);
    };
    visit(cardiorespiratory, "/cardiorespiratory");
    const manifest = createMainWireExtendedAcceptedTypedStateManifestV1(hemo, {
      layoutId: "cardiorespiratory-accepted-typed-state-v1", state: { cardiorespiratory }, fixedArrayPointers: arrays,
    });
    const bound = bindCardiorespiratoryExecutionPlanV1();
    const binding = bindExecutionPlanAcceptedTypedStateV1(bound, manifest);
    const image = new TransactionalTypedStateImageV1(manifest, initial);
    const extension = bindMainWireAcceptedTypedExtensionV1(hemo, manifest, ["cardiorespiratory"]);
    expect(() => createMainWireAcceptedTypedBoundaryBindingV1(manifest)).toThrow(/identity is unsupported/);
    expect(readMainWireAcceptedTypedClockV1(image.currentCursor(), createMainWireExtendedAcceptedTypedBoundaryBindingV1(manifest, extension)))
      .toEqual({ acceptedTimeSec: initial.acceptedTimeSec, revision: initial.revision });
    expect(createMainWireExtendedAcceptedTypedHemodynamicBindingV1(manifest, extension, binding).canonicalContinuousSlots).toHaveLength(100);
    expect(() => createMainWireExtendedAcceptedTypedBoundaryBindingV1(manifest, { ...extension })).toThrow(/foreign or unproved/);
    const values = new Float64Array(binding.logicalSlotCount);
    readExecutionPlanAcceptedTypedStateIntoLogicalV1(binding, image.currentCursor(), values);
    const newSlots = descriptor.stateLayout.slots.filter((slot) => slot.authorityPointer.startsWith("/cardiorespiratory/"));
    expect(newSlots.map((slot) => slot.authorityPointer).sort()).toEqual(numericalPointers.sort());
    for (const slot of newSlots) {
      const value = slot.authorityPointer.slice(1).split("/").reduce((v, key) => (v as Record<string, unknown>)[key], initial as unknown);
      expect(values[slot.logicalIndex]).toBe(typeof value === "boolean" ? Number(value) : value);
    }
  });

  it("admits only factory-issued fixed extensions that preserve every base owner and immutable binding", () => {
    const { cardiorespiratory: _cr, ...base } = createCardiorespiratoryColdStateV1();
    const make = (hemo = base) => createMainWireExtendedAcceptedTypedStateManifestV1(hemo, {
      layoutId: "test-cardiorespiratory-extension", state: { extra: { value: 1 } },
    });
    const manifest = make(), extension = bindMainWireAcceptedTypedExtensionV1(base, manifest, ["extra"]);
    expect(() => createMainWireExtendedAcceptedTypedBoundaryBindingV1(make(), extension)).toThrow(/foreign or unproved/);
    for (const forged of [
      { ...manifest },
      { ...manifest, imageLayout: { ...manifest.imageLayout, continuousByteOffset: 8 } },
      { ...manifest, boundedArrayNodes: [] },
      { ...manifest, stringArenaCapacityBytes: manifest.stringArenaCapacityBytes + 1 },
    ]) expect(() => bindMainWireAcceptedTypedExtensionV1(base, Object.freeze(forged), ["extra"])).toThrow(/not factory-issued/);
    expect(() => bindMainWireAcceptedTypedExtensionV1(base, manifest, ["coronary"])).toThrow(/shadows or omits/);
    const changed = { ...base, coronary: { ...base.coronary, mvcReferenceState: { ...base.coronary.mvcReferenceState, hiddenValue: 1 } } };
    expect(() => bindMainWireAcceptedTypedExtensionV1(base, make(changed), ["extra"])).toThrow(/changed base/);
    const changedKind = { ...base, coronary: { ...base.coronary, circulation: { ...base.coronary.circulation,
      nodeVolumesMl: { ...base.coronary.circulation.nodeVolumesMl, Ao: true } } } } as unknown as typeof base;
    expect(() => bindMainWireAcceptedTypedExtensionV1(base, make(changedKind), ["extra"])).toThrow(/changed base/);
    const immutableChanged = { ...base, dynamicMechanicalSupport: { ...base.dynamicMechanicalSupport,
      inertanceProfileSnapshot: Object.freeze({ ...base.dynamicMechanicalSupport.inertanceProfileSnapshot, profileId: "altered-profile" }) } };
    expect(() => bindMainWireAcceptedTypedExtensionV1(base, make(immutableChanged), ["extra"])).toThrow(/immutable bindings|immutable binding contents/);
  });

  it("prepares an admitted dev topology on the compiler-owned coupled workspace", () => {
    const bound = bindCardiorespiratoryExecutionPlanV1();
    const prepared = prepareCardiorespiratoryExecutionPlanV1(bound);
    expect(prepared.updateSchedule.presentationStepSec).toBe(.002);
    const hydraulic = resolveMainWireHydraulicExecutionPlanDispatchV1(prepared.workspace);
    expect(hydraulic.definitionId).toBe(descriptor.definitionId);
    expect(hydraulic.paths.map(({ pathId }) => pathId)).toEqual(descriptor.hydraulicGraph.pathIds);
  });

  it("rejects unknown kernels, topology drift, pointer drift, and unbound lookalikes", () => {
    const unknown = structuredClone(descriptor);
    (unknown.stateLayout.blocks[4] as { kernelId: string }).kernelId = "unimplemented-respiratory-kernel";
    expect(() => bindCardiorespiratoryExecutionPlanV1(unknown)).toThrow(/bindings must match exactly/);
    const graph = structuredClone(descriptor);
    (graph.hydraulicGraph.pathIds as string[])[0] = "renamed-edge";
    expect(() => bindCardiorespiratoryExecutionPlanV1(graph)).toThrow(/descriptor drifted/);
    expect(() => prepareCardiorespiratoryExecutionPlanV1(bindExecutionPlanV1(graph, catalog))).toThrow(/hydraulic path/);
    const pointers = structuredClone(descriptor);
    (pointers.stateLayout.slots[100] as { authorityPointer: string }).authorityPointer = "/cardiorespiratory/unknown";
    expect(() => prepareCardiorespiratoryExecutionPlanV1(bindExecutionPlanV1(pointers, catalog))).toThrow(/accepted-state binding/);
    const bound = bindCardiorespiratoryExecutionPlanV1();
    expect(() => prepareCardiorespiratoryExecutionPlanV1({ ...bound })).toThrow(/requires a bound plan/);
  });
});

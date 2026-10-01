import { describe, expect, it } from "vitest";
import { createCardiorespiratoryDevReleaseV1, applyCardiorespiratoryFixtureControlV1 } from "@/studio/integrations/cardiorespiratoryV1/CardiorespiratoryExactModelV1";
import { DEFAULT_CARDIORESPIRATORY_FIXTURE_V1 as fixture } from "@/engine/cardiorespiratory/CardiorespiratoryFixtureV1";
import surface from "@/studio/integrations/cardiorespiratoryV1/CardiorespiratorySurfaceV1";
import { composeStandardModelContractV1 } from "@/studio/contracts/v2/modelSurface";
import { resolveMainWireAnalysisMethodsForSurfaceV1 } from "@/analysis/methods/mainWire/MainWireAnalysisMethodRegistryV1";
import { CARDIORESPIRATORY_VARIATION_METHOD_V1_ID } from "@/analysis/methods/cardiorespiratory/CardiorespiratoryVariationV1";
import { CARDIORESPIRATORY_PRIMITIVE_CONTROLS_V1, readCardiorespiratoryControlValueV1 } from "@/studio/integrations/cardiorespiratoryV1/CardiorespiratoryCatalogV1";
import { CardiorespiratorySessionV1 } from "@/engine/cardiorespiratory/CardiorespiratorySessionV1";
import type { StudioJsonValueV2 } from "@/studio/contracts/v2/json";
const json = (x: unknown) => x as StudioJsonValueV2;
const context = { runtimeSessionId: "cr-adapter", scenarioId: "case" };
describe("cardiorespiratory independent exact adapter", () => {
  it("composes every inherited catalog and pins the respiratory analysis outside exact outputs", () => {
    const release = createCardiorespiratoryDevReleaseV1(), methods = resolveMainWireAnalysisMethodsForSurfaceV1(surface);
    const composed = composeStandardModelContractV1(release.manifest, surface, methods.capabilities);
    expect(composed.contract.graphCatalog).toHaveLength(surface.graphCatalog.length);
    expect(composed.contract.controlCatalog).toHaveLength(surface.controlCatalog.length);
    expect(methods.presentationMethods.some(m => m.methodId === CARDIORESPIRATORY_VARIATION_METHOD_V1_ID)).toBe(true);
    expect(release.manifest.primitiveSignalCatalog.some(o => o.outputId.includes(".variation."))).toBe(false);
    expect(release.executables.snapshotGateId).toBe(composed.contract.snapshotGateId);
  });
  it("keeps both PEEP aliases synchronized and validates coupled settings before publication", () => {
    for (const id of ["ventilation.peep-cm-h2o", "cardiorespiratory.ventilator.peep"]) {
      const next = applyCardiorespiratoryFixtureControlV1(fixture, id, 8);
      expect(next.hemodynamicResearchInputs.peepCmH2O).toBe(8); expect(next.cardiorespiratory.respiratory.ventilator.peepCmH2O).toBe(8);
    }
    expect(() => applyCardiorespiratoryFixtureControlV1(fixture, "cardiorespiratory.ventilator.inspiratory-time", 8)).toThrow();
    const highRate = applyCardiorespiratoryFixtureControlV1(fixture, "cardiorespiratory.ventilator.rate", 40);
    expect(() => applyCardiorespiratoryFixtureControlV1(highRate, "cardiorespiratory.ventilator.inspiratory-time", 2)).toThrow();
    expect(fixture.hemodynamicResearchInputs.peepCmH2O).toBe(5);
  });
  it("projects every new default control and applies finite recruitment presets atomically", () => {
    for (const c of CARDIORESPIRATORY_PRIMITIVE_CONTROLS_V1) expect(readCardiorespiratoryControlValueV1(fixture.cardiorespiratory, c.controlId), c.controlId).toBe(c.defaultValue);
    const enabled = applyCardiorespiratoryFixtureControlV1(fixture, "cardiorespiratory.lung.2.recruitment-preset", 1);
    expect(enabled.cardiorespiratory.respiratory.units[0].recruitment).toBeNull();
    expect(enabled.cardiorespiratory.respiratory.units[1].recruitment).toEqual({ openingTranspulmonaryPressureCmH2O: 10, closingTranspulmonaryPressureCmH2O: 3, openingTimeSec: .3, closingTimeSec: .3 });
    expect(readCardiorespiratoryControlValueV1(enabled.cardiorespiratory, "cardiorespiratory.lung.2.recruitment-preset")).toBe(1);
    const disabled = applyCardiorespiratoryFixtureControlV1(enabled, "cardiorespiratory.lung.2.recruitment-preset", 0);
    expect(disabled.cardiorespiratory.respiratory.units[1].recruitment).toBeNull();
  });
  it("cold launch, packed/repeated accepted samples and stale edits are deterministic", async () => {
    const a = createCardiorespiratoryDevReleaseV1().executables.simulationAdapter;
    const b = createCardiorespiratoryDevReleaseV1().executables.simulationAdapter;
    for (const adapter of [a, b]) await adapter.createSession({ runtimeSessionId: context.runtimeSessionId, scenarios: [{ scenarioId: context.scenarioId, fixture: json(fixture) }] });
    const before = a.currentFrame(context);
    const batch = await a.advancePresentationBatch({ ...context, stepCount: 4, presentationOutputIds: ["cardiorespiratory.pressure.airway", "cardiorespiratory.inventory.oxygen"] });
    for (let i = 0; i < 4; i++) { const sample = await b.advanceOnePresentationStep(context); expect(batch.acceptedTimesSec[i]).toBe(sample.acceptedTimeSec); expect(batch.acceptedRevisions[i]).toBe(sample.acceptedRevision); expect(batch.outputValues[i * 2]).toBe(sample.outputs[batch.outputIds[0]!]!.value); }
    expect(a.currentFrame(context)).toEqual(b.currentFrame(context));
    expect(batch.terminalFrame.acceptedTimeSec).toBeGreaterThan(before.acceptedTimeSec);
    const current = a.currentFrame(context);
    await expect(a.applyControl({ ...context, controlId: "cardiorespiratory.ventilator.peep", value: 6, expectedInputEpoch: 4 })).rejects.toThrow("Stale");
    expect(a.currentFrame(context)).toEqual(current);
    const warm = await a.applyControl({ ...context, controlId: "cardiorespiratory.ventilator.peep", value: 6, expectedInputEpoch: 0 });
    expect(warm.inputEpoch).toBe(1); expect(warm.acceptedTimeSec).toBe(current.acceptedTimeSec);
    const cold = await a.applyControl({ ...context, controlId: "cardiorespiratory.gas.hemoglobin", value: 12, expectedInputEpoch: 1 });
    expect(cold.inputEpoch).toBe(2); expect(cold.acceptedTimeSec).toBe(0);
  });
  it("validates the composite checkpoint clock and refuses durable authoring", async () => {
    const release = createCardiorespiratoryDevReleaseV1(), methods = resolveMainWireAnalysisMethodsForSurfaceV1(surface);
    const model = composeStandardModelContractV1(release.manifest, surface, methods.capabilities).contract;
    const session = CardiorespiratorySessionV1.create(fixture), checkpoint = { acceptedRevision: 0, acceptedTimeSec: 0, payload: json(session.checkpoint()) };
    await expect(release.executables.captureAdapter.validateCapture({ model, capture: { fixture: json(fixture), checkpoint } })).resolves.toBeUndefined();
    await expect(release.executables.captureAdapter.validateCapture({ model, capture: { fixture: json(fixture), checkpoint: { ...checkpoint, acceptedTimeSec: 1 } } })).rejects.toThrow();
  });
  it("uses canonical integer presentation targets after an aligned warm edit", async () => {
    const adapter = createCardiorespiratoryDevReleaseV1().executables.simulationAdapter;
    await adapter.createSession({ runtimeSessionId: context.runtimeSessionId, scenarios: [{ scenarioId: context.scenarioId, fixture: json(fixture) }] });
    await adapter.advancePresentationBatch({ ...context, stepCount: 13, presentationOutputIds: [] });
    const source = CardiorespiratorySessionV1.create(fixture);
    source.advanceToPresentationTime(13 * .002);
    const changed = applyCardiorespiratoryFixtureControlV1(fixture, "cardiorespiratory.ventilator.peep", 6);
    const canonical = source.reconfigure(changed);
    await adapter.applyControl({ ...context, controlId: "cardiorespiratory.ventilator.peep", value: 6, expectedInputEpoch: 0 });
    for (let ordinal = 1; ordinal <= 4; ordinal++) {
      const target = (13 + ordinal) * .002;
      canonical.advanceToPresentationTime(target);
      const frame = await adapter.advanceOnePresentationStep(context);
      expect(frame.acceptedTimeSec).toBe(target);
      // Compare the numerical owner, whose genuine cardiac events may subdivide.
      expect(frame.acceptedRevision).toBe(canonical.currentAcceptedState().revision);
    }
  });
  it.each([13 * .002, .0133])("preserves canonical aligned or off-grid restored presentation origin %s", async origin => {
    const source = CardiorespiratorySessionV1.create(fixture);
    source.advanceToPresentationTime(origin);
    const checkpoint = source.checkpoint(), accepted = source.currentAcceptedState();
    const canonical = CardiorespiratorySessionV1.restore(fixture, checkpoint);
    const adapter = createCardiorespiratoryDevReleaseV1().executables.simulationAdapter;
    await adapter.createSession({ runtimeSessionId: context.runtimeSessionId, scenarios: [{ scenarioId: context.scenarioId, fixture: json(fixture),
      checkpoint: { acceptedRevision: accepted.revision, acceptedTimeSec: accepted.acceptedTimeSec, payload: json(checkpoint) } }] });
    expect(adapter.currentFrame(context).acceptedTimeSec).toBe(origin);
    const frames = await adapter.advancePresentationBatch({ ...context, stepCount: 4, presentationOutputIds: [] });
    for (let ordinal = 1; ordinal <= 4; ordinal++) {
      const target = origin === 13 * .002 ? (13 + ordinal) * .002 : origin + ordinal * .002;
      canonical.advanceToPresentationTime(target);
      expect(frames.acceptedTimesSec[ordinal - 1]).toBe(target);
      expect(frames.acceptedRevisions[ordinal - 1]).toBe(canonical.currentAcceptedState().revision);
    }
  });
  it("does not expose previous-epoch uptake divided by newly edited demand in a paused frame", async () => {
    const adapter = createCardiorespiratoryDevReleaseV1().executables.simulationAdapter;
    await adapter.createSession({ runtimeSessionId: context.runtimeSessionId,
      scenarios: [{ scenarioId: context.scenarioId, fixture: json(fixture) }] });
    const previous = await adapter.advanceOnePresentationStep(context);
    expect(previous.outputs['cardiorespiratory.oxygen.consumption'].value).toBe(250);
    const edited = await adapter.applyControl({ ...context,
      controlId: 'cardiorespiratory.oxygen.systemic-demand', value: 25, expectedInputEpoch: 0 });
    expect(edited.inputEpoch).toBe(1);
    expect(edited.acceptedTimeSec).toBe(previous.acceptedTimeSec);
    const paused = adapter.currentFrame(context);
    expect(paused.outputs['cardiorespiratory.oxygen.demand'].value).toBe(50);
    expect(paused.outputs['cardiorespiratory.oxygen.demand-met-fraction']).toMatchObject({
      value: null, availability: 'not-evaluated-at-accepted-state', quality: 'not-assessed' });
    expect(paused.outputs['cardiorespiratory.oxygen.consumption'].value).toBeNull();
    expect(paused.outputs['cardiorespiratory.inventory.oxygen'].value)
      .toBe(previous.outputs['cardiorespiratory.inventory.oxygen'].value);
    const advanced = await adapter.advanceOnePresentationStep(context);
    expect(advanced.inputEpoch).toBe(1);
    expect(advanced.outputs['cardiorespiratory.oxygen.consumption'].value).toBe(50);
    expect(advanced.outputs['cardiorespiratory.oxygen.demand-met-fraction'].value).toBe(1);
  });
});

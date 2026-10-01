import { CardiorespiratorySessionV1 } from "@/engine/cardiorespiratory/CardiorespiratorySessionV1";
import { validateAndOwnCardiorespiratoryFixtureV1, CARDIORESPIRATORY_DEV_MODEL_ID_V1 as modelId, CARDIORESPIRATORY_FIXTURE_SCHEMA_ID_V1 as fixtureSchemaId, type CardiorespiratoryFixtureV1 } from "@/engine/cardiorespiratory/CardiorespiratoryFixtureV1";
import { CARDIORESPIRATORY_EXECUTION_PLAN_DESCRIPTOR_V1, bindCardiorespiratoryExecutionPlanV1 } from "@/engine/cardiorespiratory/CardiorespiratoryExecutionPlanV1";
import { createMainWireIntegratedStudioStaticCaseCoreReleaseV1 } from "@/studio/integrations/mainWireIntegratedV3/MainWireIntegratedStudioSelectedAorticOutflowExactModelV1";
import { applyMainWireIntegratedStudioRoundedEjectionControlV1 } from "@/studio/integrations/mainWireIntegratedV3/MainWireIntegratedStudioRoundedEjectionControlsV1";
import { MAIN_WIRE_STATIC_CASE_CONTROL_BY_ID_V1 } from "@/studio/integrations/mainWireIntegratedV3/MainWireIntegratedStudioStaticCaseControlsV1";
import { CARDIORESPIRATORY_PRIMITIVE_SIGNALS_V1, CARDIORESPIRATORY_PRIMITIVE_CONTROLS_V1, patchCardiorespiratoryControlV1 } from "./CardiorespiratoryCatalogV1";
import { STUDIO_COMMON_SNAPSHOT_ADMISSION_ID_V1, assertExactModelKernelManifestV3, type ExactModelKernelManifestV3 } from "@/studio/contracts/v2/modelSurface";
import { REGISTERED_MODEL_EXECUTION_PLAN_ADAPTER_V1_SCHEMA_ID, type RegisteredModelExecutableBundleV2 } from "@/studio/contracts/v2/executable";
import type { StudioJsonValueV2 } from "@/studio/contracts/v2/json";
import type { ModelContractV2 } from "@/studio/contracts/v2/model";
import type { StudioModelFixtureAdapterV2 } from "@/studio/contracts/v2/runtime";
import type { RegisteredModelSimulationAdapterV2, StudioSimulationFrameV2, StudioSimulationScenarioInputV2, RegisteredModelPresentationBatchV2 } from "@/studio/contracts/v2/simulation";
import type { BoundExecutionPlanV1 } from "@/runtime/executionPlan/BoundExecutionPlanV1";
import { studioCanonicalJsonStringify } from "@/domain/json/CanonicalJson";

export const CARDIORESPIRATORY_CHECKPOINT_CODEC_ID_V1 = "circleheart-cardiorespiratory-checkpoint-codec-v1";
const checkpointCodecId = CARDIORESPIRATORY_CHECKPOINT_CODEC_ID_V1;
const snapshotGateId = STUDIO_COMMON_SNAPSHOT_ADMISSION_ID_V1;
const dt = .002;
const json = (value: unknown) => value as StudioJsonValueV2;
function assertModel(model: Pick<ModelContractV2, "modelId">) { if (model.modelId !== modelId) throw new Error("Cardiorespiratory model identity mismatch"); }
/** One semantic control yields one fully validated fixture. The old and new
 * PEEP names are aliases, while old oxygen controls retain their Fick estimator. */
export function applyCardiorespiratoryFixtureControlV1(fixtureValue: unknown, controlId: string, value: number): CardiorespiratoryFixtureV1 {
  const fixture = validateAndOwnCardiorespiratoryFixtureV1(fixtureValue);
  let next: CardiorespiratoryFixtureV1;
  if (controlId.startsWith("cardiorespiratory.")) {
    const cardiorespiratory = patchCardiorespiratoryControlV1(fixture.cardiorespiratory, controlId, value);
    next = { ...fixture, cardiorespiratory, hemodynamicResearchInputs: { ...fixture.hemodynamicResearchInputs, peepCmH2O: cardiorespiratory.respiratory.ventilator.peepCmH2O } };
  } else {
    next = applyMainWireIntegratedStudioRoundedEjectionControlV1(fixture, controlId, value, MAIN_WIRE_STATIC_CASE_CONTROL_BY_ID_V1);
    if (controlId === "ventilation.peep-cm-h2o") next = { ...next, cardiorespiratory: { ...next.cardiorespiratory, respiratory: { ...next.cardiorespiratory.respiratory, ventilator: { ...next.cardiorespiratory.respiratory.ventilator, peepCmH2O: value } } } };
  }
  return validateAndOwnCardiorespiratoryFixtureV1(next);
}
type Scenario = { session: CardiorespiratorySessionV1; inputEpoch: number; presentationAnchor: number; presentationOrdinal: number };
class CardiorespiratoryRuntimeHostV1 {
  readonly sessions = new Map<string, Map<string, Scenario>>();
  constructor(readonly outputIds: readonly string[]) {}
  get(runtimeSessionId: string, scenarioId: string): Scenario {
    const result = this.sessions.get(runtimeSessionId)?.get(scenarioId);
    if (!result) throw new Error("Unknown cardiorespiratory runtime or scenario"); return result;
  }
  async create(runtimeSessionId: string, scenarios: readonly StudioSimulationScenarioInputV2[], plans?: ReadonlyMap<string, BoundExecutionPlanV1>) {
    if (!runtimeSessionId || this.sessions.has(runtimeSessionId) || scenarios.length === 0) throw new Error("Invalid or duplicate cardiorespiratory session");
    const owned = new Map<string, Scenario>();
    for (const input of scenarios) {
      if (!input.scenarioId || owned.has(input.scenarioId)) throw new Error("Invalid or duplicate cardiorespiratory scenario");
      const fixture = validateAndOwnCardiorespiratoryFixtureV1(input.fixture);
      const plan = plans?.get(input.scenarioId);
      if (plans && !plan) throw new Error("Missing scenario execution plan");
      const session = input.checkpoint ? CardiorespiratorySessionV1.restore(fixture, input.checkpoint.payload, plan) : CardiorespiratorySessionV1.create(fixture, plan);
      const state = session.currentAcceptedState();
      if (input.checkpoint && (state.revision !== input.checkpoint.acceptedRevision || state.acceptedTimeSec !== input.checkpoint.acceptedTimeSec)) throw new Error("Checkpoint accepted clock mismatch");
      owned.set(input.scenarioId, { session, inputEpoch: 0, presentationAnchor: state.acceptedTimeSec, presentationOrdinal: 0 });
    }
    this.sessions.set(runtimeSessionId, owned);
  }
  frame(runtimeSessionId: string, scenarioId: string): StudioSimulationFrameV2 {
    const scenario = this.get(runtimeSessionId, scenarioId), state = scenario.session.currentAcceptedState();
    return Object.freeze({ modelId, runtimeSessionId, scenarioId, inputEpoch: scenario.inputEpoch,
      acceptedRevision: state.revision, acceptedTimeSec: state.acceptedTimeSec, outputs: Object.freeze(scenario.session.projectValues(this.outputIds)) });
  }
  advanceAccepted(runtimeSessionId: string, scenarioId: string): void {
    const scenario = this.get(runtimeSessionId, scenarioId), ordinal = scenario.presentationOrdinal + 1;
    scenario.session.advanceToPresentationTime(scenario.presentationAnchor + ordinal * dt);
    scenario.presentationOrdinal = ordinal;
  }
  advance(runtimeSessionId: string, scenarioId: string): StudioSimulationFrameV2 {
    this.advanceAccepted(runtimeSessionId, scenarioId); return this.frame(runtimeSessionId, scenarioId);
  }
  batch(runtimeSessionId: string, scenarioId: string, stepCount: number, selectedIds: readonly string[]): RegisteredModelPresentationBatchV2 {
    if (!Number.isSafeInteger(stepCount) || stepCount < 1 || stepCount > 4096 || new Set(selectedIds).size !== selectedIds.length || selectedIds.some(id => !this.outputIds.includes(id))) throw new Error("Invalid cardiorespiratory presentation batch");
    const acceptedRevisions = new Float64Array(stepCount), acceptedTimesSec = new Float64Array(stepCount), outputStates = new Uint8Array(stepCount * selectedIds.length), outputValues = new Float64Array(stepCount * selectedIds.length);
    const scenario = this.get(runtimeSessionId, scenarioId);
    for (let row = 0; row < stepCount; row++) {
      this.advanceAccepted(runtimeSessionId, scenarioId);
      const state = scenario.session.currentAcceptedState(), values = scenario.session.projectValues(selectedIds);
      acceptedRevisions[row] = state.revision; acceptedTimesSec[row] = state.acceptedTimeSec;
      selectedIds.forEach((id, column) => { const output = values[id]!, offset = row * selectedIds.length + column;
        outputStates[offset] = output.availability !== "available" || typeof output.value !== "number" ? 2 : output.quality === "authoritative-state" ? 0 : 1;
        outputValues[offset] = typeof output.value === "number" ? output.value : Number.NaN; });
    }
    return Object.freeze({ outputIds: Object.freeze([...selectedIds]), acceptedRevisions, acceptedTimesSec, outputStates, outputValues, terminalFrame: this.frame(runtimeSessionId, scenarioId) });
  }
  replace(runtimeSessionId: string, scenarioId: string, fixture: unknown) {
    const current = this.get(runtimeSessionId, scenarioId), next = current.session.reconfigure(validateAndOwnCardiorespiratoryFixtureV1(fixture));
    current.session = next; current.inputEpoch++; current.presentationAnchor = next.currentAcceptedState().acceptedTimeSec; current.presentationOrdinal = 0; return current.inputEpoch;
  }
}

/** Ephemeral executable factory; no immutable registry publication or durable
 * authoring is admitted before numerical and model qualification. */
export function createCardiorespiratoryDevReleaseV1(): Readonly<{ manifest: ExactModelKernelManifestV3; executables: RegisteredModelExecutableBundleV2 }> {
  const inherited = createMainWireIntegratedStudioStaticCaseCoreReleaseV1().manifest;
  const controls = Object.freeze([...inherited.primitiveControlCatalog, ...CARDIORESPIRATORY_PRIMITIVE_CONTROLS_V1]);
  const signals = Object.freeze([...inherited.primitiveSignalCatalog, ...CARDIORESPIRATORY_PRIMITIVE_SIGNALS_V1]);
  const manifest: ExactModelKernelManifestV3 = Object.freeze({ ...inherited, modelId,
    equations: Object.freeze({ ...inherited.equations, respiratoryOwner: "two-unit-respiratory-mechanics-v1", gasOwner: "conservative-cardiorespiratory-gas-v1", transactionId: "cardiorespiratory-atomic-composite-v1" }),
    runtime: Object.freeze({ numericalSessionId: "cardiorespiratory-session-v1", presentationDtSec: dt, acceptedBoundaryCapture: true, scope: "local-development-no-publication", fixtureChangeSemantics: "atomic-warm-edit-anatomy-blood-chemistry-or-respiratory-capacity-cold-restart" }),
    solver: Object.freeze({ candidateSemantics: "atomic-composite-hemodynamics-respiratory-gas-tissue", acceptedStateMutation: false, failureRollback: "previous-accepted-composite" }),
    fixtureSchema: Object.freeze({ fixtureSchemaId, definition: Object.freeze({ schemaId: fixtureSchemaId, validationOwner: "CardiorespiratoryFixtureV1" }) }),
    checkpointCodec: Object.freeze({ checkpointCodecId, definition: Object.freeze({ checkpointId: "circleheart-cardiorespiratory-checkpoint-v1", schemaVersion: 1, restoreSemantics: "exact-composite-including-gas-inventory-ledgers-and-breath-clock" }) }),
    primitiveControlCatalog: controls, primitiveSignalCatalog: signals,
    capabilities: Object.freeze([...new Set([...inherited.capabilities, ...CARDIORESPIRATORY_PRIMITIVE_SIGNALS_V1.map(x => `output/${x.outputId}`), ...CARDIORESPIRATORY_PRIMITIVE_CONTROLS_V1.map(x => `control/${x.controlId}`)])]),
  });
  assertExactModelKernelManifestV3(manifest);
  const host = new CardiorespiratoryRuntimeHostV1([...signals, ...manifest.modelMetricCatalog].map(x => x.outputId));
  const fixtureAdapter: StudioModelFixtureAdapterV2 = Object.freeze({ modelId, fixtureSchemaId,
    validateCompleteFixture({ context, fixture }) { assertModel(context); validateAndOwnCardiorespiratoryFixtureV1(fixture); return undefined; },
    reduceControlAction({ context, fixture, action }) { assertModel(context); const next = applyCardiorespiratoryFixtureControlV1(fixture, action.controlId, action.value);
      return Object.freeze({ changes: Object.freeze((["hemodynamicResearchInputs", "mechanismResearchInputs", "cardiorespiratory"] as const).map(key => Object.freeze({ path: Object.freeze([key] as const), value: json(next[key]) }))) }); },
  });
  const simulationAdapter: RegisteredModelSimulationAdapterV2 = Object.freeze({ modelId, fixtureSchemaId, checkpointCodecId,
    createSession: input => host.create(input.runtimeSessionId, input.scenarios), disposeSession: id => { host.sessions.delete(id); },
    currentFrame: input => host.frame(input.runtimeSessionId, input.scenarioId),
    advanceOnePresentationStep: async input => host.advance(input.runtimeSessionId, input.scenarioId),
    advancePresentationBatch: async input => host.batch(input.runtimeSessionId, input.scenarioId, input.stepCount, input.presentationOutputIds),
    currentInputEpoch: input => host.get(input.runtimeSessionId, input.scenarioId).inputEpoch,
    replaceFixture: async input => host.replace(input.runtimeSessionId, input.scenarioId, input.fixture),
    applyControl: async input => { const current = host.get(input.runtimeSessionId, input.scenarioId); if (current.inputEpoch !== input.expectedInputEpoch) throw new Error("Stale cardiorespiratory control input epoch");
      const next = applyCardiorespiratoryFixtureControlV1(current.session.fixture, input.controlId, input.value); host.replace(input.runtimeSessionId, input.scenarioId, next); return host.frame(input.runtimeSessionId, input.scenarioId); },
    requestAnalysis: async input => { const frame = host.frame(input.runtimeSessionId, input.scenarioId);
      if (frame.inputEpoch !== input.expectedInputEpoch || frame.acceptedRevision !== input.expectedAcceptedRevision || frame.acceptedTimeSec !== input.expectedAcceptedTimeSec) throw new Error("Stale cardiorespiratory analysis boundary");
      return Object.freeze({ modelId, runtimeSessionId: frame.runtimeSessionId, scenarioId: frame.scenarioId, inputEpoch: frame.inputEpoch,
        sourceAcceptedRevision: frame.acceptedRevision, sourceAcceptedTimeSec: frame.acceptedTimeSec, analysisId: input.analysisId,
        payload: Object.freeze({ status: "unavailable", reason: "periodic-cardiac-reference-analysis-unsupported-under-breathing", analysisId: input.analysisId }) }); },
  });
  const captureAdapter: RegisteredModelExecutableBundleV2["captureAdapter"] = Object.freeze({ modelId, fixtureSchemaId, checkpointCodecId,
    validateFixture({ model, fixture }) { assertModel(model); validateAndOwnCardiorespiratoryFixtureV1(fixture); return undefined; },
    async validateCapture({ model, capture }) { assertModel(model); const fixture = validateAndOwnCardiorespiratoryFixtureV1(capture.fixture);
      const restored = CardiorespiratorySessionV1.restore(fixture, capture.checkpoint.payload); const state = restored.currentAcceptedState();
      if (state.revision !== capture.checkpoint.acceptedRevision || state.acceptedTimeSec !== capture.checkpoint.acceptedTimeSec || studioCanonicalJsonStringify(json(restored.checkpoint())) !== studioCanonicalJsonStringify(capture.checkpoint.payload)) throw new Error("Cardiorespiratory checkpoint round trip mismatch"); },
  });
  const executables: RegisteredModelExecutableBundleV2 = Object.freeze({ modelId, fixtureSchemaId, checkpointCodecId, snapshotGateId, fixtureAdapter, simulationAdapter, captureAdapter,
    experimentCapture: Object.freeze({ modelId, fixtureSchemaId, checkpointCodecId, async captureAcceptedCandidate(input) {
      assertModel(input.model); assertModel(input.desiredContent);
      if (input.desiredContent.scenarios.length !== input.correlation.scenarios.length) throw new Error("Cardiorespiratory capture correlation mismatch");
      const scenarios = input.desiredContent.scenarios.map((desired, index) => {
        const correlation = input.correlation.scenarios[index], current = host.get(input.correlation.runtimeSessionId, desired.scenarioId);
        if (correlation?.scenarioId !== desired.scenarioId || correlation.expectedInputEpoch !== current.inputEpoch
          || studioCanonicalJsonStringify(desired.fixture) !== studioCanonicalJsonStringify(json(current.session.fixture))) throw new Error("Stale cardiorespiratory capture");
        const state = current.session.currentAcceptedState();
        return { scenarioId: desired.scenarioId, label: desired.label, capture: { fixture: json(current.session.fixture), checkpoint: {
          acceptedRevision: state.revision, acceptedTimeSec: state.acceptedTimeSec, payload: json(current.session.checkpoint()) } } };
      });
      return { content: { modelId, scenarios, surface: input.desiredContent.surface }, confirmation: {
        experimentId: input.experimentId, runtimeSessionId: input.correlation.runtimeSessionId, scenarios: input.correlation.scenarios } };
    } }),
    snapshotGate: Object.freeze({ modelId, snapshotGateId, async admitFrozenCandidate() { return { status: "rejected" as const, reason: "Cardiorespiratory development model is not qualified for publication" }; } }),
    executionPlan: Object.freeze({ schemaId: REGISTERED_MODEL_EXECUTION_PLAN_ADAPTER_V1_SCHEMA_ID, modelId,
      descriptor: CARDIORESPIRATORY_EXECUTION_PLAN_DESCRIPTOR_V1, bind: () => bindCardiorespiratoryExecutionPlanV1(),
      createSession: input => host.create(input.runtimeSessionId, input.scenarios, input.boundExecutionPlans),
    }),
  });
  return Object.freeze({ manifest, executables });
}

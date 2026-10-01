import { createMainWireIntegratedModelStaticCaseFixtureV1 } from "@/engine/myocardium/experiments/MainWireIntegratedModelStaticCaseFixtureV1";
import { limitMainWireIntegratedModelCandidateTimeV3, wrapMainWireIntegratedModelAcceptedStateV3,
  type MainWireIntegratedModelAcceptedStateV3 }
  from "@/engine/myocardium/MainWireIntegratedModelTransactionV3";
import { restoreDynamicMechanicalSupportAcceptedStateV1 } from "@/engine/devices/dynamicNetworkV1";
import type { MainWireNormalAdultFiveWallMechanicsStateV1 } from "@/engine/myocardium/experiments/MainWireNormalAdultFiveWallClosedLoopV1";
import type { MainWireIntegratedModelRuntimeV3 } from "@/engine/myocardium/MainWireIntegratedModelRuntimeV3";
import { stepMainWireIntegratedModelCoupledV1 } from "@/engine/vnext/coupled/MainWireIntegratedCoupledStepV1";
import { createMainWireFiveWallCoupledNewtonShadowWorkspaceV1 } from "@/engine/vnext/coupled/MainWireFiveWallCoupledNewtonShadowV1";
import { createMainWireFiveWallCoupledResidualWorkspaceV1,
  MAIN_WIRE_FIVE_WALL_ACCEPTED_NUMERICAL_READBACK_COUNT_V1 as numericalReadbackCount,
  MAIN_WIRE_FIVE_WALL_ACCEPTED_NUMERICAL_READBACK_LAYOUT_V1 as numericalReadbackLayout,
  MAIN_WIRE_FIVE_WALL_ACCEPTED_READBACK_CHAMBER_ORDER_V1 as numericalReadbackChambers }
  from "@/engine/myocardium/MainWireFiveWallCoronaryTransactionV2";
import { TransactionalTypedStateImageV1 } from "@/engine/vnext/TransactionalTypedStateImageV1";
import { createMainWireExtendedAcceptedTypedStateManifestV1 } from "@/engine/vnext/MainWireAcceptedTypedStateV1";
import { MainWireIntegratedModelBeatAccumulatorV3, validateAndOwnMainWireIntegratedModelCompletedBeatMetricsV3, type MainWireIntegratedModelCompletedBeatMetricsV3 }
  from "@/engine/myocardium/MainWireIntegratedModelBeatMetricsV3";
import { projectMainWireIntegratedModelSelectedValuesV3, projectMainWireIntegratedModelSelectedValuesFromNumericalReadbackV1 }
  from "@/engine/myocardium/MainWireIntegratedModelOutputRegistryV3";
import { partitionMainWireIntegratedModelStandard68OutputIdsV1 as partition68, mergeMainWireIntegratedModelStandard68SelectedValuesV1 as merge68 }
  from "@/engine/myocardium/MainWireIntegratedModelStandard68OutputRegistryV1";
import { partitionMainWireIntegratedModelStandard70OutputIdsV1 as partition70, mergeMainWireIntegratedModelStandard70SelectedValuesV1 as merge70,
  type MainWireIntegratedModelStandard70OutputIdV1 } from "@/engine/myocardium/MainWireIntegratedModelStandard70OutputRegistryV1";
import { warmStartMainWireIntegratedModelV3 } from "@/engine/myocardium/MainWireIntegratedModelWarmStartV3";
import { evaluateParallelPulmonaryPathsV1, type ParallelPulmonaryPathsV1 } from "@/engine/core/ParallelPulmonaryPathsV1";
import { createRespiratoryMechanicsStateV1, evaluateRespiratoryMechanicsV1, stepRespiratoryMechanicsV1, respiratoryMuscleCycleTimeSecV1,
  validateRespiratoryMechanicsStateV1, type RespiratoryMechanicsStateV1, type RespiratoryGasAmountV1, type RespiratoryMechanicsOutputV1 } from "./RespiratoryMechanicsV1";
import { bloodGasAmountsFromPressuresV1, bloodGasPressuresFromAmountsV1, validateBloodGasContentsV1, MOLAR_GAS_VOLUME_STPD_L_PER_MOL_V1,
  type BloodGasAmountV1 } from "./BloodGasChemistryV1";
import { advanceConservativeGasTransportV1 } from "./ConservativeGasTransportV1";
import { exchangePerfusedBloodWithAlveolarGasV1 } from "./PulmonaryGasExchangeV1";
import { DEFAULT_TISSUE_GAS_PARAMETERS_V1, initializeTissueGasStateV1, advanceTissueGasExchangeV1,
  oxygenDemandMolPerSecFromMlPerMinV1, type TissueGasStateV1 } from "./TissueGasExchangeV1";
import { cardiorespiratoryPhysicalBloodVolumesV1, cardiorespiratoryAcceptedBloodTransfersV1 } from "./CardiorespiratoryBloodNetworkV1";
import { DEFAULT_CARDIORESPIRATORY_FIXTURE_V1, CARDIORESPIRATORY_DEMAND_LIMITS_ML_MIN_V1, validateAndOwnCardiorespiratoryFixtureV1, type CardiorespiratoryFixtureV1 }
  from "./CardiorespiratoryFixtureV1";
import { studioCanonicalJsonStringify } from "@/domain/json/CanonicalJson";
import { bindCardiorespiratoryExecutionPlanV1, prepareCardiorespiratoryExecutionPlanV1 } from "./CardiorespiratoryExecutionPlanV1";
import { bindExecutionPlanAcceptedTypedStateV1, resolveExecutionPlanAcceptedTypedStateSlotV1 } from "@/engine/vnext/ExecutionPlanAcceptedTypedStateBindingV1";
import type { BoundExecutionPlanV1 } from "@/runtime/executionPlan/BoundExecutionPlanV1";

type Hemo = MainWireIntegratedModelAcceptedStateV3<MainWireNormalAdultFiveWallMechanicsStateV1>;
type FixtureRuntime = ReturnType<typeof createMainWireIntegratedModelStaticCaseFixtureV1>;
type HemodynamicReadback = Readonly<{ available: boolean; acceptedRevision: number; values: readonly number[] }>;
export type CardiorespiratoryStateV1 = Readonly<{
  respiratory: RespiratoryMechanicsStateV1;
  blood: Readonly<Record<string, BloodGasAmountV1>>;
  systemic: TissueGasStateV1;
  myocardium: TissueGasStateV1;
  /** The existing numerical kernel's 73 accepted signal scalars, never a trial
   * graph or analysis result. Unavailable after cold start or fixture edits. */
  hemodynamicReadback: HemodynamicReadback;
  ledger: Readonly<{ initialO2Mol: number; initialCo2Mol: number; boundaryO2Mol: number; boundaryCo2Mol: number;
    consumedO2Mol: number; producedCo2Mol: number; interventionO2Mol: number; interventionCo2Mol: number }>;
  readback: Readonly<{ systemicConsumptionMlMin: number; myocardialConsumptionMlMin: number;
    pulmonaryFlow1MlSec: number; pulmonaryFlow2MlSec: number; cardiacFlowMlSec: number;
    aorticOxygenFluxMolPerSec: number;
    appliedPleuralPressureMmHg: number; appliedAlveolarPressureMmHg: number;
    oxygenBalanceResidualMol: number; co2BalanceResidualMol: number }>;
}>;
type Composite = Hemo & Readonly<{ cardiorespiratory: CardiorespiratoryStateV1 }>;
export type CardiorespiratoryCheckpointV1 = Readonly<{
  schemaId: "circleheart-cardiorespiratory-checkpoint-v1";
  fixture: CardiorespiratoryFixtureV1; state: Composite;
  beatAccumulator: ReturnType<MainWireIntegratedModelBeatAccumulatorV3["checkpoint"]>;
  completedBeatMetrics: MainWireIntegratedModelCompletedBeatMetricsV3 | null;
}>;
const mlMinPerMolSec = 1000 * MOLAR_GAS_VOLUME_STPD_L_PER_MOL_V1 * 60;
const hemoOnly = ({ cardiorespiratory: _cr, ...hemo }: Composite): Hemo => hemo;
const runtimeCast = (r: FixtureRuntime) => r as unknown as MainWireIntegratedModelRuntimeV3;
const usedExecutionPlans = new WeakSet<object>();
const unavailableHemodynamicReadback = (): HemodynamicReadback => ({ available: false, acceptedRevision: 0,
  values: Array.from({ length: numericalReadbackCount }, () => 0) });

/** Development exact owner. One fixed typed current/candidate image owns all
 * physical stores; rejected coupled trials leave every accepted owner unchanged.
 * Ventilation -> BE blood flow/advection -> paired exchange is a first-order
 * conservative partitioned method. There is no multirate hidden gas clock. */
export class CardiorespiratorySessionV1 {
  readonly fixture: CardiorespiratoryFixtureV1;
  readonly #runtime: FixtureRuntime;
  readonly #image: TransactionalTypedStateImageV1<Composite>;
  readonly #workspace: ReturnType<typeof createMainWireFiveWallCoupledNewtonShadowWorkspaceV1>;
  readonly #baseTickSec: number;
  readonly #acceptedTimeSlot: number;
  readonly #revisionSlot: number;
  readonly #residualWorkspace = createMainWireFiveWallCoupledResidualWorkspaceV1();
  #beats = new MainWireIntegratedModelBeatAccumulatorV3();
  #completedBeat: MainWireIntegratedModelCompletedBeatMetricsV3 | null = null;

  private constructor(fixture: CardiorespiratoryFixtureV1, restored?: CardiorespiratoryCheckpointV1, suppliedPlan?: BoundExecutionPlanV1) {
    this.fixture = validateAndOwnCardiorespiratoryFixtureV1(fixture);
    this.#runtime = createMainWireIntegratedModelStaticCaseFixtureV1(fixture.anatomyId,
      fixture.hemodynamicResearchInputs, 1, fixture.mechanismResearchInputs);
    const cold = this.#coldState();
    if (restored) assertFixedShape(restored.state.cardiorespiratory, cold.cardiorespiratory, "cardiorespiratory checkpoint");
    const restoredState = restored ? restoreNumericalArrays(restored.state, cold) as Composite : null;
    // Admit serialized device bindings before choosing the manifest's immutable
    // roots. Later live candidates reuse these runtime-owned roots; retaining
    // checkpoint clones here would force a canonical comparison at every step.
    const initial = deepFreeze(restoredState === null ? cold : { ...restoredState,
      dynamicMechanicalSupport: restoreDynamicMechanicalSupportAcceptedStateV1(restoredState.dynamicMechanicalSupport,
        this.#runtime.cold.acceptedState.dynamicMechanicalSupport) });
    const arrays: string[] = [];
    const visit = (v: unknown, path: string) => {
      if (Array.isArray(v)) arrays.push(path);
      if (v && typeof v === "object") for (const [key, child] of Object.entries(v)) visit(child, `${path}/${key}`);
    };
    visit(initial.cardiorespiratory, "/cardiorespiratory");
    const manifest = createMainWireExtendedAcceptedTypedStateManifestV1(hemoOnly(initial), {
      layoutId: "cardiorespiratory-accepted-typed-state-v1", state: { cardiorespiratory: initial.cardiorespiratory }, fixedArrayPointers: arrays,
    });
    const plan = suppliedPlan ?? bindCardiorespiratoryExecutionPlanV1();
    if (usedExecutionPlans.has(plan)) throw new Error("Execution plan workspace already belongs to another exact session");
    const prepared = prepareCardiorespiratoryExecutionPlanV1(plan);
    const stateBinding = bindExecutionPlanAcceptedTypedStateV1(plan, manifest);
    this.#acceptedTimeSlot = resolveExecutionPlanAcceptedTypedStateSlotV1(stateBinding, "accepted.timeSec").authoritySlotIndex;
    this.#revisionSlot = resolveExecutionPlanAcceptedTypedStateSlotV1(stateBinding, "accepted.revision").authoritySlotIndex;
    this.#workspace = prepared.workspace;
    this.#baseTickSec = prepared.updateSchedule.baseTickSec;
    this.#validate(initial);
    this.#image = new TransactionalTypedStateImageV1(manifest, initial, s => { this.#validate(s as Composite); return s as Composite; });
    if (restored) {
      this.#beats = MainWireIntegratedModelBeatAccumulatorV3.restore(restored.beatAccumulator);
      this.#completedBeat = restored.completedBeatMetrics === null ? null
        : validateAndOwnMainWireIntegratedModelCompletedBeatMetricsV3(restored.completedBeatMetrics);
      if (this.#completedBeat && this.#completedBeat.endTimeSec > initial.acceptedTimeSec + 1e-10) {
        throw new Error("Checkpoint completed beat lies after its accepted clock");
      }
    }
    usedExecutionPlans.add(plan);
  }
  static create(fixture: CardiorespiratoryFixtureV1 = DEFAULT_CARDIORESPIRATORY_FIXTURE_V1, plan?: BoundExecutionPlanV1) {
    return new CardiorespiratorySessionV1(fixture, undefined, plan);
  }
  static restore(fixture: CardiorespiratoryFixtureV1, checkpoint: unknown, plan?: BoundExecutionPlanV1) {
    const c = structuredClone(checkpoint) as CardiorespiratoryCheckpointV1;
    if (!c || typeof c !== "object" || Array.isArray(c)
      || Object.keys(c).sort().join("|") !== "beatAccumulator|completedBeatMetrics|fixture|schemaId|state") {
      throw new Error("Cardiorespiratory checkpoint shape differs");
    }
    if (c?.schemaId !== "circleheart-cardiorespiratory-checkpoint-v1" || studioCanonicalJsonStringify(c.fixture) !== studioCanonicalJsonStringify(fixture)) {
      throw new Error("Cardiorespiratory checkpoint fixture/codec mismatch");
    }
    return new CardiorespiratorySessionV1(fixture, c, plan);
  }
  #ownHemo(state: Hemo): Hemo {
    deepFreeze(state.composedRhythm);
    const dynamic = restoreDynamicMechanicalSupportAcceptedStateV1(state.dynamicMechanicalSupport,
      this.#runtime.cold.acceptedState.dynamicMechanicalSupport);
    return wrapMainWireIntegratedModelAcceptedStateV3(state.coronary, state.composedRhythm, dynamic,
      { configuration: this.#runtime.rhythm.configuration }, this.#runtime.profile, this.#runtime.config);
  }
  currentAcceptedState(): Hemo { return this.#ownHemo(this.#image.rehydrateCurrent()); }
  /** Scalar clock reads do not reconstruct or expose the accepted object graph. */
  currentAcceptedClock() {
    const cursor = this.#image.currentCursor();
    return { acceptedTimeSec: cursor.readContinuous(this.#acceptedTimeSlot), revision: cursor.readContinuous(this.#revisionSlot) };
  }
  cardiorespiratoryState() { return this.#image.rehydrateCurrent().cardiorespiratory; }
  respiratoryOutput() { return evaluateRespiratoryMechanicsV1(this.fixture.cardiorespiratory.respiratory, this.cardiorespiratoryState().respiratory); }
  checkpoint(): CardiorespiratoryCheckpointV1 {
    return structuredClone({ schemaId: "circleheart-cardiorespiratory-checkpoint-v1" as const,
      fixture: this.fixture, state: portableNumericalArrays(this.#image.rehydrateCurrent()) as Composite,
      beatAccumulator: this.#beats.checkpoint(), completedBeatMetrics: this.#completedBeat });
  }
  snapshotAcceptedStateBytes() { return this.#image.snapshot(); }

  advanceToPresentationTime(targetTimeSec: number) {
    let current = this.currentAcceptedClock();
    if (!Number.isFinite(targetTimeSec) || targetTimeSec < current.acceptedTimeSec) throw new Error("Invalid cardiorespiratory target time");
    const previousRevision = current.revision;
    while (current.acceptedTimeSec < targetTimeSec) {
      // Integer-indexed 2-ms boundaries prevent accumulated clock drift.
      const nextGrid = (Math.floor(current.acceptedTimeSec / this.#baseTickSec + 1e-9) + 1) * this.#baseTickSec;
      this.#advanceWithRecovery(Math.min(targetTimeSec, nextGrid), 0);
      current = this.currentAcceptedClock();
    }
    return { status: current.revision === previousRevision ? "already-at-target" as const : "advanced" as const,
      acceptedTimeSec: current.acceptedTimeSec, acceptedRevision: current.revision,
      internalAcceptedSubstepCount: current.revision - previousRevision };
  }
  #advanceWithRecovery(target: number, depth: number): void {
    const accepted = this.#image.rehydrateCurrent(), before = this.#ownHemo(accepted);
    const limit = limitMainWireIntegratedModelCandidateTimeV3(before, target,
      { configuration: this.#runtime.rhythm.configuration, externalAfNextBoundaryTimeSec: null }, this.#runtime.profile, this.#runtime.config);
    try { this.#step(limit.candidateTimeSec, accepted, before); }
    catch (error) {
      if (depth >= 5 || limit.candidateTimeSec - before.acceptedTimeSec < 0.0000625) throw error;
      this.#advanceWithRecovery((before.acceptedTimeSec + limit.candidateTimeSec) / 2, depth + 1);
      this.#advanceWithRecovery(limit.candidateTimeSec, depth + 1);
    }
    if (limit.candidateTimeSec < target) this.#advanceWithRecovery(target, depth);
  }
  #step(target: number, accepted: Composite, before: Hemo) {
    const old = accepted.cardiorespiratory;
    const c = this.fixture.cardiorespiratory, dt = target - before.acceptedTimeSec;
    const ventilation = stepRespiratoryMechanicsV1(c.respiratory, old.respiratory, dt);
    const ro = ventilation.output;
    const paths = this.#pulmonaryPaths(ro);
    const pth = ro.pleuralPressureMmHg;
    const palv = (ro.alveolarPressureMmHgByUnit[0] + ro.alveolarPressureMmHgByUnit[1]) / 2;
    const runtime = { ...this.#runtime.coronaryStepInput.runtime,
      respiratory: { ...this.#runtime.coronaryStepInput.runtime.respiratory, coupledPressures: { pthMmHg: pth, palvMmHg: palv } },
      parallelPulmonaryPaths: paths };
    const numerical: { value: HemodynamicReadback | null } = { value: null };
    const solved = stepMainWireIntegratedModelCoupledV1(this.#runtime.provider, before, {
      candidateTimeSec: target, coronary: { ...this.#runtime.coronaryStepInput, runtime },
      rhythm: { configuration: this.#runtime.rhythm.configuration, externalAfNextBoundaryTimeSec: null, externalAtrialSourceBatch: null },
      dynamicMechanicalSupport: { config: this.#runtime.config, profile: this.#runtime.profile },
    }, this.#workspace, { residualWorkspace: this.#residualWorkspace,
      onConvergedCandidate: candidate => {
        // The borrow is invalidated by the next residual evaluation. Copy its
        // admitted scalars now; publish them only with the whole accepted step.
        numerical.value = { available: true, acceptedRevision: candidate.candidateRevision,
          values: Array.from(candidate.acceptedNumericalReadback) };
      } });
    if (solved.converged === false) throw new Error(`Cardiorespiratory hemodynamics rejected: ${solved.message}`);
    if (numerical.value === null) throw new Error("Cardiorespiratory accepted numerical readback is missing");
    const next = solved.acceptedState;
    const beforeV = cardiorespiratoryPhysicalBloodVolumesV1(before), afterV = cardiorespiratoryPhysicalBloodVolumesV1(next);
    const bloodTransfers = cardiorespiratoryAcceptedBloodTransfersV1(solved);
    const advected = advanceConservativeGasTransportV1(Object.keys(beforeV).map(id => ({ id,
      volumeBeforeMl: beforeV[id], volumeAfterMl: afterV[id], amount: old.blood[id] })),
      bloodTransfers, { volumeBalanceToleranceMl: 2e-5 });
    const aorticTransferIndex = bloodTransfers.findIndex(edge => edge.from === "LV" && edge.to === "Ao");
    if (aorticTransferIndex < 0) throw new Error("Aortic gas transport path absent");
    const blood = { ...advected.amountsById };
    const trial = solved.coronaryStep.baseStep.circulationTrial;
    const perfusion = evaluateParallelPulmonaryPathsV1(paths, trial.nodeAbsolutePressuresMmHg.PCap, trial.nodeAbsolutePressuresMmHg.PVen);
    const exchange: [RespiratoryGasAmountV1, RespiratoryGasAmountV1] = [{ o2Mol: 0, co2Mol: 0, inertMol: 0 }, { o2Mol: 0, co2Mol: 0, inertMol: 0 }];
    for (const i of [0, 1] as const) {
      const q = perfusion.flowMlPerSecByUnit[i], upstream = q >= 0 ? "PCap" : "PVen", receiver = q >= 0 ? "PVen" : "PCap";
      const a = advected.amountsById[upstream];
      const x = exchangePerfusedBloodWithAlveolarGasV1({ throughVolumeMl: Math.abs(q) * dt,
        upstreamContent: { o2MolPerL: a.o2Mol * 1000 / afterV[upstream], co2MolPerL: a.co2Mol * 1000 / afterV[upstream] },
        alveolarPressures: { o2MmHg: ro.oxygenPartialPressureMmHgByUnit[i], co2MmHg: ro.co2PartialPressureMmHgByUnit[i] },
        alveolarAvailable: ventilation.state.unitGasMol[i], receivingBloodAvailable: blood[receiver],
        equilibrationFraction01: c.pulmonaryEquilibrationFraction01[i], chemistry: c.bloodGas });
      blood[receiver] = add(blood[receiver], x.bloodDeltaMol);
      exchange[i] = { ...x.alveolarDeltaMol, inertMol: 0 };
    }
    const respiratory = stepRespiratoryMechanicsV1(c.respiratory, ventilation.state, 0, { exchangeMolByUnit: exchange }).state;
    const tissue = (id: "systemic" | "myocardium", bloodId: string, demand: number) => {
      const result = advanceTissueGasExchangeV1({ parameters: { ...DEFAULT_TISSUE_GAS_PARAMETERS_V1[id], respiratoryQuotient: c.respiratoryQuotient },
        state: old[id], bloodAmount: blood[bloodId], bloodVolumeMl: afterV[bloodId], chemistry: c.bloodGas,
        demandO2MolPerSec: oxygenDemandMolPerSecFromMlPerMinV1(demand), dtSec: dt });
      blood[bloodId] = result.bloodAmount;
      return result;
    };
    const systemic = tissue("systemic", "Cap", c.systemicDemandMlMin), myocardium = tissue("myocardium", "CV", c.myocardialDemandMlMin);
    const ledger = { ...old.ledger,
      boundaryO2Mol: old.ledger.boundaryO2Mol + ventilation.ledger.boundaryGasTransferMol.o2Mol,
      boundaryCo2Mol: old.ledger.boundaryCo2Mol + ventilation.ledger.boundaryGasTransferMol.co2Mol,
      consumedO2Mol: old.ledger.consumedO2Mol + systemic.consumedO2Mol + myocardium.consumedO2Mol,
      producedCo2Mol: old.ledger.producedCo2Mol + systemic.producedCo2Mol + myocardium.producedCo2Mol };
    const cr: CardiorespiratoryStateV1 = { respiratory, blood, systemic: systemic.state, myocardium: myocardium.state, ledger,
      hemodynamicReadback: numerical.value,
      readback: { systemicConsumptionMlMin: systemic.consumedO2Mol / dt * mlMinPerMolSec,
        myocardialConsumptionMlMin: myocardium.consumedO2Mol / dt * mlMinPerMolSec,
        pulmonaryFlow1MlSec: perfusion.flowMlPerSecByUnit[0], pulmonaryFlow2MlSec: perfusion.flowMlPerSecByUnit[1],
        cardiacFlowMlSec: trial.edgeFlowsMlPerSec.AoV,
        aorticOxygenFluxMolPerSec: advected.transfersByEdge[aorticTransferIndex].o2Mol / dt, appliedPleuralPressureMmHg: pth, appliedAlveolarPressureMmHg: palv,
        oxygenBalanceResidualMol: 0, co2BalanceResidualMol: 0 } };
    const residual = gasResidual(cr);
    const candidate = { ...next, cardiorespiratory: { ...cr, readback: { ...cr.readback,
      oxygenBalanceResidualMol: residual.o2Mol, co2BalanceResidualMol: residual.co2Mol } } };
    const candidateBeats = MainWireIntegratedModelBeatAccumulatorV3.restore(this.#beats.checkpoint());
    const completed = candidateBeats.accept(solved);
    this.#validate(candidate);
    try { this.#image.stage(candidate); this.#image.promote(); }
    catch (e) { this.#image.abort(); throw e; }
    this.#beats = candidateBeats;
    this.#completedBeat = completed ?? this.#completedBeat;
  }
  #pulmonaryPaths(output: RespiratoryMechanicsOutputV1): ParallelPulmonaryPathsV1 {
    const c = this.fixture.cardiorespiratory;
    return [0, 1].map(i => {
      const ratio = output.volumeLByUnit[i] / c.respiratory.units[i].referenceVolumeL;
      const scale = 1 + c.pulmonaryVolumeResistanceGain * ((ratio - 1) ** 2 + (1 / ratio - 1) ** 2);
      return { resistanceMmHgSecPerMl: c.pulmonaryReferenceResistanceMmHgSecPerMl[i] * scale
        * this.fixture.hemodynamicResearchInputs.pulmonaryResistance / MAIN_WIRE_BASELINE_PULMONARY_RESISTANCE,
        externalPressureMmHg: output.alveolarPressureMmHgByUnit[i] };
    }) as unknown as ParallelPulmonaryPathsV1;
  }
  #coldState(): Composite {
    return createCardiorespiratoryColdStateV1(this.fixture, this.#runtime);
  }

  #validate(state: Composite) {
    this.#ownHemo(state);
    const c = state.cardiorespiratory;
    const readback = c.hemodynamicReadback;
    if (typeof readback.available !== "boolean" || !Number.isSafeInteger(readback.acceptedRevision)
      || readback.acceptedRevision < 0 || !Array.isArray(readback.values)
      || readback.values.length !== numericalReadbackCount || !readback.values.every(Number.isFinite)) {
      throw new Error("Invalid accepted hemodynamic numerical readback");
    }
    if (readback.available) {
      if (readback.acceptedRevision !== state.revision || readback.values[numericalReadbackLayout.timeSec] !== state.acceptedTimeSec) {
        throw new Error("Hemodynamic readback clock/revision differs from accepted state");
      }
      for (const [i, name] of numericalReadbackChambers.entries()) {
        if (Math.abs(readback.values[numericalReadbackLayout.chamberVolumeMl + i]! - state.coronary.circulation.nodeVolumesMl[name]) > 1e-9) {
          throw new Error("Hemodynamic readback chamber volume differs from accepted state");
        }
      }
    } else if (readback.acceptedRevision !== 0 || readback.values.some(value => value !== 0)) {
      throw new Error("Unavailable hemodynamic readback must have an empty numerical image");
    }
    validateRespiratoryMechanicsStateV1(this.fixture.cardiorespiratory.respiratory, c.respiratory);
    if (Math.abs(c.respiratory.timeSec - state.acceptedTimeSec) > 1e-10) throw new Error("Respiratory and hemodynamic clocks disagree");
    const volumes = cardiorespiratoryPhysicalBloodVolumesV1(state);
    if (Object.keys(c.blood).length !== Object.keys(volumes).length || Object.keys(volumes).some(id => !c.blood[id])) throw new Error("Blood gas storage coverage differs");
    for (const [id, amount] of Object.entries(c.blood)) {
      if (![amount.o2Mol, amount.co2Mol].every(x => Number.isFinite(x) && x >= 0)) throw new Error("Invalid blood gas inventory");
      validateBloodGasContentsV1({ o2MolPerL: amount.o2Mol * 1000 / volumes[id], co2MolPerL: amount.co2Mol * 1000 / volumes[id] }, this.fixture.cardiorespiratory.bloodGas);
    }
    for (const id of ["systemic", "myocardium"] as const) {
      const tissue = c[id];
      if (tissue.id !== id || ![tissue.amount.o2Mol, tissue.amount.co2Mol, tissue.cumulativeUnmetO2Mol]
        .every(x => Number.isFinite(x) && x >= 0)) throw new Error("Invalid tissue gas state");
    }
    if (!Object.values(c.ledger).every(Number.isFinite) || !Object.values(c.readback).every(Number.isFinite)) {
      throw new Error("Nonfinite gas ledger/readback");
    }
    for (const key of ["initialO2Mol", "initialCo2Mol", "consumedO2Mol", "producedCo2Mol"] as const) {
      if (c.ledger[key] < 0) throw new Error("Negative cumulative gas ledger");
    }
    if (c.readback.systemicConsumptionMlMin < 0 || c.readback.myocardialConsumptionMlMin < 0) {
      throw new Error("Negative actual oxygen consumption");
    }
    // Readback belongs to the last accepted interval, which may precede a warm
    // demand edit. Bound it by the model domain, not the newly edited demand.
    if (c.readback.systemicConsumptionMlMin > CARDIORESPIRATORY_DEMAND_LIMITS_ML_MIN_V1.systemic + 1e-9
      || c.readback.myocardialConsumptionMlMin > CARDIORESPIRATORY_DEMAND_LIMITS_ML_MIN_V1.myocardium + 1e-9) {
      throw new Error("Actual oxygen consumption exceeds the admitted demand domain");
    }

    const r = gasResidual(c);
    if (Math.abs(r.o2Mol) > 1e-10 || Math.abs(r.co2Mol) > 1e-10) throw new Error("Global gas conservation gate rejected candidate");
    if (Math.abs(c.readback.oxygenBalanceResidualMol - r.o2Mol) > 1e-12
      || Math.abs(c.readback.co2BalanceResidualMol - r.co2Mol) > 1e-12) {
      throw new Error("Gas residual readback disagrees with the exact inventory ledger");
    }
  }
  reconfigure(fixture: CardiorespiratoryFixtureV1) {
    const target = validateAndOwnCardiorespiratoryFixtureV1(fixture);
    if (target.anatomyId !== this.fixture.anatomyId || JSON.stringify(target.cardiorespiratory.bloodGas) !== JSON.stringify(this.fixture.cardiorespiratory.bloodGas)
      || target.cardiorespiratory.respiratory.conductingDeadspaceVolumeL !== this.fixture.cardiorespiratory.respiratory.conductingDeadspaceVolumeL
      || JSON.stringify(target.cardiorespiratory.respiratory.environment) !== JSON.stringify(this.fixture.cardiorespiratory.respiratory.environment)) {
      return CardiorespiratorySessionV1.create(target);
    }
    const targetRuntime = createMainWireIntegratedModelStaticCaseFixtureV1(target.anatomyId, target.hemodynamicResearchInputs, 1, target.mechanismResearchInputs);
    const cp = this.checkpoint(), oldV = cardiorespiratoryPhysicalBloodVolumesV1(cp.state);
    const hemo = warmStartMainWireIntegratedModelV3({ source: this.currentAcceptedState(), sourceRuntime: runtimeCast(this.#runtime), targetRuntime: runtimeCast(targetRuntime) });
    const newV = cardiorespiratoryPhysicalBloodVolumesV1(hemo), blood = { ...cp.state.cardiorespiratory.blood };
    let o2 = 0, co2 = 0;
    for (const id of Object.keys(blood)) {
      // The virtual volume intervention adds/removes blood at that reservoir's
      // current concentration. Both material transfers are explicitly ledgered.
      const before = blood[id], ratio = newV[id] / oldV[id];
      blood[id] = { o2Mol: before.o2Mol * ratio, co2Mol: before.co2Mol * ratio };
      o2 += blood[id].o2Mol - before.o2Mol; co2 += blood[id].co2Mol - before.co2Mol;
    }
    const cr = cp.state.cardiorespiratory;
    const oldPeriod = 60 / this.fixture.cardiorespiratory.respiratory.ventilator.respiratoryRatePerMin;
    const newPeriod = 60 / target.cardiorespiratory.respiratory.ventilator.respiratoryRatePerMin;
    // Removing an enabled closure law restores a conducting airway. Keep its
    // trapped gas inventory; reopening is a connectivity intervention, not a
    // reset to fresh inspired gas or a new lung volume.
    const reopened = ([0, 1] as const).map(i => this.fixture.cardiorespiratory.respiratory.units[i].recruitment !== null
      && target.cardiorespiratory.respiratory.units[i].recruitment === null);
    const respiratory = { ...cr.respiratory,
      airwayOpenByUnit: [0, 1].map(i => reopened[i] || cr.respiratory.airwayOpenByUnit[i]) as [boolean, boolean],
      recruitmentProgress01ByUnit: [0, 1].map(i => reopened[i] ? 1 : cr.respiratory.recruitmentProgress01ByUnit[i]) as [number, number],
      ventilatorCycleTimeSec: cr.respiratory.ventilatorCycleTimeSec / oldPeriod * newPeriod };
    const state = { ...hemo, cardiorespiratory: { ...cr, respiratory, blood,
      hemodynamicReadback: unavailableHemodynamicReadback(), ledger: { ...cr.ledger,
      interventionO2Mol: cr.ledger.interventionO2Mol + o2, interventionCo2Mol: cr.ledger.interventionCo2Mol + co2 } } };
    return new CardiorespiratorySessionV1(target, { ...cp, fixture: target, state, completedBeatMetrics: null,
      beatAccumulator: new MainWireIntegratedModelBeatAccumulatorV3().checkpoint() });
  }
  projectValues(outputIds: readonly string[]) {
    const accepted = this.#image.rehydrateCurrent(), cr = accepted.cardiorespiratory;
    // Available readback was admitted atomically with this private typed image.
    // Projection only reads its detached scalars; admission remains mandatory
    // in #validate, and the cold/warm unavailable fallback still owns its graph.
    const hemo = cr.hemodynamicReadback.available ? accepted : this.#ownHemo(accepted);
    const inherited = outputIds.filter(id => !id.startsWith("cardiorespiratory.")) as MainWireIntegratedModelStandard70OutputIdV1[];
    const values: Record<string, { outputId: string; value: number | null; availability: "available" | "not-evaluated-at-accepted-state"; quality: "authoritative-state" | "accepted-derived" | "not-assessed" }> = {};
    if (inherited.length > 0) {
      const p70 = partition70(inherited), p68 = partition68(p70.standard68OutputIds);
      const common = { completedBeatMetrics: this.#completedBeat, mechanismResearchInputs: this.fixture.mechanismResearchInputs,
        runtimeSignals: { pleuralPressureMmHg: cr.readback.appliedPleuralPressureMmHg, alveolarPressureMmHg: cr.readback.appliedAlveolarPressureMmHg } };
      const rhythm = hemo.composedRhythm.regularAtrialSourceState;
      if (rhythm === null) throw new Error("Cardiorespiratory regular sinus projection is unavailable");
      const base = cr.hemodynamicReadback.available
        ? projectMainWireIntegratedModelSelectedValuesFromNumericalReadbackV1({ ...common, acceptedTimeSec: hemo.acceptedTimeSec,
          regularSinusCycleLengthSec: rhythm.configuration.cycleLengthSec,
          regularSinusNextActivationTimeSec: rhythm.nextActivationTimeSec,
          dynamicMechanicalSupportLvadFlowMlPerSec: hemo.dynamicMechanicalSupport.acceptedFlowMlPerSec.LVAD,
          acceptedNumericalReadback: Float64Array.from(cr.hemodynamicReadback.values) }, p68.baseOutputIds)
        : projectMainWireIntegratedModelSelectedValuesV3({ ...common, source: "standard-exact-checkpoint-restore", acceptedState: hemo,
          lastAcceptedStep: null }, p68.baseOutputIds);
      Object.assign(values, merge70({ outputIds: inherited, completedBeatMetrics: this.#completedBeat,
        standard68Values: merge68({ outputIds: p70.standard68OutputIds, baseValues: base, completedBeatMetrics: this.#completedBeat }) }));
    }
    const selected = outputIds.filter(id => id.startsWith("cardiorespiratory.")).map(id => id.slice("cardiorespiratory.".length));
    if (selected.length === 0) return values;
    const needsRespiratory = selected.some(key => key.startsWith("pressure.") || key.startsWith("volume.")
      || key.startsWith("flow.unit.") || key.startsWith("lung.open.") || key.startsWith("gas.pressure.alveolar-")
      || key === "flow.airway" || key === "ventilator.pressure-limited");
    const ro = needsRespiratory ? evaluateRespiratoryMechanicsV1(this.fixture.cardiorespiratory.respiratory, cr.respiratory) : null;
    const needsArterial = selected.some(key => key.startsWith("gas.") && key.includes("arterial"));
    const needsVenous = selected.some(key => key.startsWith("gas.") && key.includes("mixed-venous"));
    const art = needsArterial ? bloodGasPressuresFromAmountsV1(cr.blood.Ao, hemo.coronary.circulation.nodeVolumesMl.Ao, this.fixture.cardiorespiratory.bloodGas) : null;
    const ven = needsVenous ? bloodGasPressuresFromAmountsV1(cr.blood.PA, hemo.coronary.circulation.nodeVolumesMl.PA, this.fixture.cardiorespiratory.bloodGas) : null;
    const inventory = selected.some(key => key.startsWith("inventory.")) ? totalGas(cr) : null;
    const c = this.fixture.cardiorespiratory, demand = c.systemicDemandMlMin + c.myocardialDemandMlMin;
    const consumption = cr.readback.systemicConsumptionMlMin + cr.readback.myocardialConsumptionMlMin;
    // Warm edits preserve the previous interval's numerical record, but it was
    // not evaluated under the new fixture. Share the coupled readback boundary
    // until the next accepted step; inventories and current chemistry remain valid.
    const intervalValue = (value: number): number | null => cr.hemodynamicReadback.available ? value : null;
    const signals: Record<string, number | null> = {
      phase: c.respiratory.ventilator.mode === "spontaneous"
        ? respiratoryMuscleCycleTimeSecV1(c.respiratory, hemo.acceptedTimeSec) / (60 / c.respiratory.muscle.respiratoryRatePerMin)
        : cr.respiratory.ventilatorCycleTimeSec / (60 / c.respiratory.ventilator.respiratoryRatePerMin),
      "breath-index": cr.respiratory.completedBreaths,
      "pressure.airway": ro?.airwayPressureCmH2O ?? null, "pressure.pleural": ro?.pleuralPressureCmH2O ?? null, "pressure.muscle": ro?.musclePressureCmH2O ?? null,
      "volume.lung": ro?.totalLungVolumeL ?? null, "flow.airway": ro?.airwayFlowLPerSec ?? null,
      "gas.pressure.arterial-o2": art?.o2MmHg ?? null, "gas.pressure.arterial-co2": art?.co2MmHg ?? null,
      "gas.pressure.mixed-venous-o2": ven?.o2MmHg ?? null, "gas.pressure.mixed-venous-co2": ven?.co2MmHg ?? null,
      "gas.saturation.arterial-o2": art?.saturation01 ?? null, "gas.saturation.mixed-venous-o2": ven?.saturation01 ?? null,
      "gas.ph.arterial": art?.pH ?? null, "gas.ph.mixed-venous": ven?.pH ?? null,
      "gas.content.arterial-o2": art === null ? null : art.o2MolPerL * MOLAR_GAS_VOLUME_STPD_L_PER_MOL_V1 * 100,
      "gas.content.mixed-venous-o2": ven === null ? null : ven.o2MolPerL * MOLAR_GAS_VOLUME_STPD_L_PER_MOL_V1 * 100,
      "flow.perfusion.1": intervalValue(cr.readback.pulmonaryFlow1MlSec), "flow.perfusion.2": intervalValue(cr.readback.pulmonaryFlow2MlSec),
      "lung.open.1": Number(cr.respiratory.airwayOpenByUnit[0]), "lung.open.2": Number(cr.respiratory.airwayOpenByUnit[1]),
      "tissue.oxygen-pressure.systemic": cr.systemic.amount.o2Mol / DEFAULT_TISSUE_GAS_PARAMETERS_V1.systemic.o2CapacityMolPerMmHg,
      "tissue.oxygen-pressure.myocardium": cr.myocardium.amount.o2Mol / DEFAULT_TISSUE_GAS_PARAMETERS_V1.myocardium.o2CapacityMolPerMmHg,
      "inventory.oxygen": inventory?.o2Mol ?? null, "inventory.carbon-dioxide": inventory?.co2Mol ?? null,
      "balance.oxygen": cr.readback.oxygenBalanceResidualMol, "balance.carbon-dioxide": cr.readback.co2BalanceResidualMol,
      "oxygen.delivery": intervalValue(cr.readback.aorticOxygenFluxMolPerSec * mlMinPerMolSec),
      "oxygen.demand": demand, "oxygen.consumption": intervalValue(consumption),
      "oxygen.demand-met-fraction": demand === 0 ? null : intervalValue(consumption / demand),
      "oxygen.myocardial-demand": c.myocardialDemandMlMin, "oxygen.myocardial-consumption": intervalValue(cr.readback.myocardialConsumptionMlMin),
      "ventilator.pressure-limited": ro === null ? null : Number(ro.pressureLimited), "ventilator.controlled": Number(c.respiratory.ventilator.mode !== "spontaneous"), "muscle.active": Number(c.respiratory.muscle.amplitudeCmH2O > 0),
    };
    // The delivery signal is the accepted signed upwind O2 transfer at AoV,
    // using the actual donor concentration on reversal. Window means belong
    // to the Surface's analysis methods.
    if (ro !== null) for (const i of [0, 1] as const) {
      const n = i + 1;
      signals[`pressure.alveolar.${n}`] = ro.alveolarPressureCmH2OByUnit[i];
      signals[`pressure.transpulmonary.${n}`] = ro.transpulmonaryPressureCmH2OByUnit[i];
      signals[`volume.unit.${n}`] = ro.volumeLByUnit[i]; signals[`flow.unit.${n}`] = ro.flowLPerSecByUnit[i];
      signals[`gas.pressure.alveolar-o2.${n}`] = ro.oxygenPartialPressureMmHgByUnit[i];
      signals[`gas.pressure.alveolar-co2.${n}`] = ro.co2PartialPressureMmHgByUnit[i];
    }
    for (const key of selected) {
      const outputId = `cardiorespiratory.${key}`;
      if (!(key in signals)) throw new Error(`Unknown cardiorespiratory output ${outputId}`);
      const value = signals[key];
      values[outputId] = { outputId, value, availability: value === null ? "not-evaluated-at-accepted-state" : "available",
        quality: value === null ? "not-assessed" : "accepted-derived" };
    }
    return values;
  }
}
/** Creates the complete numerical cold seed without starting a session or compiling a plan. */
export function createCardiorespiratoryColdStateV1(
  requestedFixture: CardiorespiratoryFixtureV1 = DEFAULT_CARDIORESPIRATORY_FIXTURE_V1,
  runtime?: FixtureRuntime,
): Composite {
    const fixture = validateAndOwnCardiorespiratoryFixtureV1(requestedFixture);
    const owner = runtime ?? createMainWireIntegratedModelStaticCaseFixtureV1(fixture.anatomyId,
      fixture.hemodynamicResearchInputs, 1, fixture.mechanismResearchInputs);
    const c = fixture.cardiorespiratory, hemo = owner.cold.acceptedState;
    const dry = c.respiratory.environment.barometricPressureMmHg - c.respiratory.environment.waterVaporPressureMmHg;
    const fraction = { o2: Math.min(100, dry * .2) / dry, co2: 40 / dry, inert: 1 - (Math.min(100, dry * .2) + 40) / dry };
    const respiratory = createRespiratoryMechanicsStateV1(c.respiratory, { initialGasFractionsByUnit: [fraction, fraction] });
    const respiratoryOutput = evaluateRespiratoryMechanicsV1(c.respiratory, respiratory);
    const volumes = cardiorespiratoryPhysicalBloodVolumesV1(hemo), blood: Record<string, BloodGasAmountV1> = {};
    const arterial = new Set(["PVen", "PVein", "LA", "LV", "Ao", "SA", "Art", "LAD.Art", "LCx.Art", "RCA.Art"]);
    for (const [id, volume] of Object.entries(volumes)) blood[id] = bloodGasAmountsFromPressuresV1(volume,
      (arterial.has(id) || id.includes(".IM.Art.")) ? { o2MmHg: 95, co2MmHg: 40 } : { o2MmHg: 40, co2MmHg: 46 }, c.bloodGas);
    const cr: CardiorespiratoryStateV1 = { respiratory, blood, hemodynamicReadback: unavailableHemodynamicReadback(),
      systemic: initializeTissueGasStateV1(DEFAULT_TISSUE_GAS_PARAMETERS_V1.systemic, 20, 48),
      myocardium: initializeTissueGasStateV1(DEFAULT_TISSUE_GAS_PARAMETERS_V1.myocardium, 15, 48),
      ledger: { initialO2Mol: 0, initialCo2Mol: 0, boundaryO2Mol: 0, boundaryCo2Mol: 0, consumedO2Mol: 0, producedCo2Mol: 0, interventionO2Mol: 0, interventionCo2Mol: 0 },
      readback: { systemicConsumptionMlMin: 0, myocardialConsumptionMlMin: 0, pulmonaryFlow1MlSec: 0, pulmonaryFlow2MlSec: 0,
        cardiacFlowMlSec: 0, aorticOxygenFluxMolPerSec: 0,
        appliedPleuralPressureMmHg: respiratoryOutput.pleuralPressureMmHg,
        appliedAlveolarPressureMmHg: (respiratoryOutput.alveolarPressureMmHgByUnit[0] + respiratoryOutput.alveolarPressureMmHgByUnit[1]) / 2,
        oxygenBalanceResidualMol: 0, co2BalanceResidualMol: 0 } };
    const total = totalGas(cr);
    return { ...hemo, cardiorespiratory: { ...cr, ledger: { ...cr.ledger, initialO2Mol: total.o2Mol, initialCo2Mol: total.co2Mol } } };
  }

const MAIN_WIRE_BASELINE_PULMONARY_RESISTANCE = DEFAULT_CARDIORESPIRATORY_FIXTURE_V1.hemodynamicResearchInputs.pulmonaryResistance;
function add(a: BloodGasAmountV1, b: BloodGasAmountV1): BloodGasAmountV1 { return { o2Mol: a.o2Mol + b.o2Mol, co2Mol: a.co2Mol + b.co2Mol }; }
function totalGas(c: CardiorespiratoryStateV1): BloodGasAmountV1 {
  return [...Object.values(c.blood), ...c.respiratory.unitGasMol, c.respiratory.conductingGasMol, c.systemic.amount, c.myocardium.amount]
    .reduce(add, { o2Mol: 0, co2Mol: 0 });
}
function gasResidual(c: CardiorespiratoryStateV1): BloodGasAmountV1 {
  const t = totalGas(c), l = c.ledger;
  return { o2Mol: t.o2Mol - l.initialO2Mol - l.boundaryO2Mol + l.consumedO2Mol - l.interventionO2Mol,
    co2Mol: t.co2Mol - l.initialCo2Mol - l.boundaryCo2Mol - l.producedCo2Mol - l.interventionCo2Mol };
}
function deepFreeze<T>(value: T): T {
  if (ArrayBuffer.isView(value)) return value;
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze); Object.freeze(value);
  }
  return value;
}
/** JSON checkpoint representation keeps numeric vectors as arrays. The exact
 * cold schema, rather than user-provided constructor names, restores types. */
function portableNumericalArrays(value: unknown): unknown {
  if (ArrayBuffer.isView(value)) return Array.from(value as unknown as ArrayLike<number>);
  if (Array.isArray(value)) return value.map(portableNumericalArrays);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, portableNumericalArrays(v)]));
  return value;
}
function restoreNumericalArrays(value: unknown, template: unknown): unknown {
  if (template instanceof Float64Array) {
    if ((!Array.isArray(value) && !(value instanceof Float64Array)) || value.length !== template.length
      || !Array.from(value).every(x => typeof x === "number" && Number.isFinite(x))) throw new Error("Checkpoint numerical vector shape differs");
    return Float64Array.from(value);
  }
  if (ArrayBuffer.isView(template)) throw new Error("Unsupported exact checkpoint numeric vector");
  if (Array.isArray(value)) return value.map((v, i) => restoreNumericalArrays(v, Array.isArray(template) ? template[i] : undefined));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) =>
    [k, restoreNumericalArrays(v, template && typeof template === "object" ? (template as Record<string, unknown>)[k] : undefined)]));
  return value;
}

/** Extension states are a fixed numerical schema, never an extensible bag of
 * checkpoint fields. Reject omissions/additions before deriving a typed layout. */
function assertFixedShape(value: unknown, template: unknown, path: string): void {
  if (Array.isArray(template)) {
    if (!Array.isArray(value) || value.length !== template.length) throw new Error(`${path}: checkpoint array shape differs`);
    template.forEach((v, i) => assertFixedShape(value[i], v, `${path}/${i}`));
  } else if (template !== null && typeof template === "object") {
    if (value === null || typeof value !== "object" || Array.isArray(value)
      || Object.keys(value).sort().join("|") !== Object.keys(template).sort().join("|")) {
      throw new Error(`${path}: checkpoint object shape differs`);
    }
    Object.entries(template).forEach(([key, child]) => assertFixedShape((value as Record<string, unknown>)[key], child, `${path}/${key}`));
  } else if (typeof template === "number") {
    if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`${path}: checkpoint value is not finite`);
  } else if (typeof template === "boolean") {
    if (typeof value !== "boolean") throw new Error(`${path}: checkpoint value is not boolean`);
  } else if (value !== template) {
    throw new Error(`${path}: checkpoint literal differs`);
  }
}

import { MainWireIntegratedTypedAuthoritySessionV1 as BaseOwner } from "@/engine/vnext/MainWireIntegratedTypedAuthoritySessionV1";
import { advanceMainWireProjectionWithRecoveryV1 } from "@/engine/vnext/MainWireProjectionStepRecoveryV1";
import { checkpointMainWireStaticCaseV1, restoreMainWireStaticCaseV1,
  type MainWireStaticCaseCheckpointV1 } from "@/engine/myocardium/MainWireStaticCaseCheckpointV1";
import { createMainWireIntegratedModelStaticCaseFixtureV1,
  type MainWireIntegratedModelStaticCaseFixtureV1 as Runtime } from "@/engine/myocardium/experiments/MainWireIntegratedModelStaticCaseFixtureV1";
import { forkMainWireIntegratedModelAtFixedTbvV3 as fixedTbv,
  forkMainWireIntegratedModelResponsiveStarlingV3 as fixedToneTbv } from "@/engine/myocardium/MainWireIntegratedModelFixedTbvForkV3";
import type { MainWireIntegratedModelRuntimeV3 } from "@/engine/myocardium/MainWireIntegratedModelRuntimeV3";
import { checkpointMainWireFiveWallCoupledPredictorV1, createMainWireFiveWallCoupledPredictorWorkspaceV1 }
  from "@/engine/vnext/coupled/MainWireFiveWallCoupledPredictorV1";
import { canonicalJsonStringify, sha256CanonicalJsonHex } from "@/engine/integrity";
import type { ParallelPulmonaryPathsV1 } from "@/engine/core/ParallelPulmonaryPathsV1";
import { validateAndOwnCardiorespiratoryFixtureV1, type CardiorespiratoryFixtureV1 } from "./CardiorespiratoryFixtureV1";

export const CARDIORESPIRATORY_FIXED_RESPIRATORY_MECHANICAL_BOUNDARY_V1 = "cardiorespiratory-fixed-respiratory-mechanical-boundary-v1" as const;
const checkpointId = "cardiorespiratory-fixed-respiratory-mechanical-checkpoint-v1" as const;
type State = ReturnType<BaseOwner["currentAcceptedState"]>;
type Restored = Awaited<ReturnType<typeof restoreMainWireStaticCaseV1>>;
const sourceRuntime = (runtime: Runtime) => runtime as unknown as MainWireIntegratedModelRuntimeV3;
const emptyPredictor = checkpointMainWireFiveWallCoupledPredictorV1(createMainWireFiveWallCoupledPredictorWorkspaceV1());

export type CardiorespiratoryFixedRespiratoryMechanicalBoundaryV1 = Readonly<{
  boundaryId: typeof CARDIORESPIRATORY_FIXED_RESPIRATORY_MECHANICAL_BOUNDARY_V1;
  sourceAcceptedTimeSec: number;
  sourceAcceptedRevision: number;
  pleuralPressureMmHg: number;
  alveolarPressureMmHgByUnit: readonly [number, number];
  volumeLByUnit: readonly [number, number];
  pulmonaryPaths: ParallelPulmonaryPathsV1;
}>;
export type CardiorespiratoryFixedRespiratoryMechanicalCheckpointV1 = Readonly<{
  checkpointId: typeof checkpointId;
  fixture: CardiorespiratoryFixtureV1;
  respiratoryBoundary: CardiorespiratoryFixedRespiratoryMechanicalBoundaryV1;
  cardiovascular: MainWireStaticCaseCheckpointV1;
  checkpointSha256: string;
}>;

class FixedMechanicalOwner extends BaseOwner {
  constructor(runtime: Runtime, state: State, restored?: Restored) {
    super(sourceRuntime(runtime), state, "fixed-tbv-protocol-fork", null, restored, undefined, null, state);
    if (restored) this.restoreCoupledPredictorContinuationV1(restored.coupledPredictor);
  }
  capture(runtime: Runtime) {
    const predictor = this.checkpointCoupledPredictorContinuationV1();
    const base = super.checkpointStandardExact();
    return base.then(checkpoint => checkpointMainWireStaticCaseV1(runtime, checkpoint, predictor));
  }
  resetPredictor() { this.restoreCoupledPredictorContinuationV1(emptyPredictor); }
}

/**
 * Ephemeral numerical intervention, not an airway hold or a live CR checkpoint.
 * It keeps the captured cardiovascular state and prescribed Ppl plus BOTH
 * pulmonary branch laws fixed. With oxygen-dependent cardiovascular feedback
 * absent, gas stores have no remaining input to this clamped subsystem; no gas
 * equations or gas settlement are performed in a preload-family branch.
 * Coronary regulation remains active until the explicit fixed-tone TBV fork.
 */
export class CardiorespiratoryFixedRespiratoryMechanicalSessionV1 {
  readonly #runtime: Runtime;
  readonly #owner: FixedMechanicalOwner;
  private constructor(
    readonly fixture: CardiorespiratoryFixtureV1,
    readonly respiratoryBoundary: CardiorespiratoryFixedRespiratoryMechanicalBoundaryV1,
    runtime: Runtime, state: State, restored?: Restored,
  ) {
    if (state.acceptedTimeSec < respiratoryBoundary.sourceAcceptedTimeSec
      || state.revision < respiratoryBoundary.sourceAcceptedRevision) throw new Error("Fixed respiratory source lies after cardiovascular state");
    this.#runtime = runtime;
    this.#owner = new FixedMechanicalOwner(runtime, state, restored);
  }

  /** Called by the CR exact owner with its admitted, detached cardiovascular state. */
  static fromAcceptedState(fixtureInput: CardiorespiratoryFixtureV1, state: State,
    boundaryInput: CardiorespiratoryFixedRespiratoryMechanicalBoundaryV1) {
    const fixture = validateAndOwnCardiorespiratoryFixtureV1(fixtureInput), boundary = ownBoundary(boundaryInput);
    if (state.acceptedTimeSec !== boundary.sourceAcceptedTimeSec || state.revision !== boundary.sourceAcceptedRevision)
      throw new Error("Fixed respiratory boundary and source clocks differ");
    return new CardiorespiratoryFixedRespiratoryMechanicalSessionV1(fixture, boundary, createRuntime(fixture, boundary), state);
  }

  static async restore(fixtureInput: CardiorespiratoryFixtureV1, input: unknown) {
    canonicalJsonStringify(input);
    const saved = structuredClone(input) as CardiorespiratoryFixedRespiratoryMechanicalCheckpointV1;
    exactKeys(saved, ["checkpointId", "fixture", "respiratoryBoundary", "cardiovascular", "checkpointSha256"]);
    const fixture = validateAndOwnCardiorespiratoryFixtureV1(fixtureInput);
    if (saved.checkpointId !== checkpointId || canonicalJsonStringify(saved.fixture) !== canonicalJsonStringify(fixture))
      throw new Error("Fixed respiratory checkpoint fixture/schema mismatch");
    const { checkpointSha256, ...payload } = saved;
    if (typeof checkpointSha256 !== "string" || await sha256CanonicalJsonHex(payload) !== checkpointSha256)
      throw new Error("Fixed respiratory checkpoint SHA-256 mismatch");
    const boundary = ownBoundary(saved.respiratoryBoundary), runtime = createRuntime(fixture, boundary);
    const restored = await restoreMainWireStaticCaseV1(runtime, saved.cardiovascular);
    return new CardiorespiratoryFixedRespiratoryMechanicalSessionV1(fixture, boundary, runtime, restored.acceptedState, restored);
  }

  async checkpoint(): Promise<CardiorespiratoryFixedRespiratoryMechanicalCheckpointV1> {
    // Owner snapshots synchronously before its first digest can yield.
    const cardiovascular = this.#owner.capture(this.#runtime);
    const payload = { checkpointId, fixture: this.fixture, respiratoryBoundary: this.respiratoryBoundary,
      cardiovascular: await cardiovascular };
    return freeze({ ...payload, checkpointSha256: await sha256CanonicalJsonHex(payload) });
  }
  get anatomy() { return this.#runtime.staticAnatomy; }
  get coronaryConstruction() { return this.#runtime.coronaryConstruction; }
  currentAcceptedState() { return this.#owner.currentAcceptedState(); }
  currentAcceptedClock() {
    const state = this.#owner.observe().acceptedState;
    return { acceptedTimeSec: state.acceptedTimeSec, revision: state.revision };
  }
  snapshotAcceptedStateBytes() { return this.#owner.snapshotAcceptedStateBytes(); }
  observe() { return this.#owner.observe(); }
  projectCurrentAcceptedValuesV1(...args: Parameters<BaseOwner["projectCurrentAcceptedValuesV1"]>) {
    return this.#owner.projectCurrentAcceptedValuesV1(...args);
  }
  advanceToPresentationTime(...args: Parameters<BaseOwner["advanceToPresentationTime"]>) {
    return this.#owner.advanceToPresentationTime(...args);
  }
  advanceStructuralAnalysisToPresentationTimeV1(...args: Parameters<BaseOwner["advanceStructuralAnalysisToPresentationTimeV1"]>) {
    return this.#owner.advanceStructuralAnalysisToPresentationTimeV1(...args);
  }
  advanceToPresentationTimeWithSelectedOutputProjectionV1(...args: Parameters<BaseOwner["advanceToPresentationTimeWithSelectedOutputProjectionV1"]>) {
    return advanceMainWireProjectionWithRecoveryV1(
      target => this.#owner.advanceToPresentationTimeWithSelectedOutputProjectionV1(target, args[1]),
      () => this.#owner.currentAcceptedState(), args[0], () => this.#owner.resetPredictor());
  }
  advancePressureCrossingPresentationV1(targetTimeSec: number): ReturnType<BaseOwner["advanceToPresentationTime"]> {
    this.#owner.resetPredictor();
    try {
      const { advance } = this.#owner.advanceToPresentationTimeWithSelectedOutputProjectionV1(targetTimeSec, []);
      return Object.freeze({ ...advance, observation: this.#owner.observe() });
    } finally { this.#owner.resetPredictor(); }
  }
  forkAtFixedGlobalTotalBloodVolume(totalBloodVolumeMl: number) {
    return new CardiorespiratoryFixedRespiratoryMechanicalSessionV1(this.fixture, this.respiratoryBoundary, this.#runtime,
      fixedTbv({ source: this.currentAcceptedState(), runtime: this.#runtime, targetGlobalTotalBloodVolumeMl: totalBloodVolumeMl }));
  }
  forkResponsiveStarlingAtFixedGlobalTotalBloodVolume(totalBloodVolumeMl: number) {
    return new CardiorespiratoryFixedRespiratoryMechanicalSessionV1(this.fixture, this.respiratoryBoundary, this.#runtime,
      fixedToneTbv({ source: this.currentAcceptedState(), runtime: this.#runtime, targetGlobalTotalBloodVolumeMl: totalBloodVolumeMl }));
  }
}

function createRuntime(fixture: CardiorespiratoryFixtureV1, boundary: CardiorespiratoryFixedRespiratoryMechanicalBoundaryV1): Runtime {
  const base = createMainWireIntegratedModelStaticCaseFixtureV1(fixture.anatomyId,
    fixture.hemodynamicResearchInputs, 1, fixture.mechanismResearchInputs);
  const runtime = Object.freeze({ ...base.runtime,
    respiratory: Object.freeze({ ...base.runtime.respiratory, coupledPressures: Object.freeze({
      pthMmHg: boundary.pleuralPressureMmHg,
      // The shared storage's external pressure matches the CR numerical owner.
      // Hydraulic branch pressures are NEVER collapsed to this legacy scalar.
      palvMmHg: (boundary.alveolarPressureMmHgByUnit[0] + boundary.alveolarPressureMmHgByUnit[1]) / 2,
    }) }), parallelPulmonaryPaths: boundary.pulmonaryPaths });
  return Object.freeze({ ...base, runtime, coronaryStepInput: Object.freeze({ ...base.coronaryStepInput, runtime }) });
}

function ownBoundary(input: CardiorespiratoryFixedRespiratoryMechanicalBoundaryV1) {
  const b = structuredClone(input);
  exactKeys(b, ["boundaryId", "sourceAcceptedTimeSec", "sourceAcceptedRevision", "pleuralPressureMmHg",
    "alveolarPressureMmHgByUnit", "volumeLByUnit", "pulmonaryPaths"]);
  if (b.boundaryId !== CARDIORESPIRATORY_FIXED_RESPIRATORY_MECHANICAL_BOUNDARY_V1
    || !Number.isFinite(b.sourceAcceptedTimeSec) || b.sourceAcceptedTimeSec < 0
    || !Number.isSafeInteger(b.sourceAcceptedRevision) || b.sourceAcceptedRevision < 0
    || !Number.isFinite(b.pleuralPressureMmHg)
    || !Array.isArray(b.alveolarPressureMmHgByUnit) || b.alveolarPressureMmHgByUnit.length !== 2
    || !Array.isArray(b.volumeLByUnit) || b.volumeLByUnit.length !== 2
    || !Array.isArray(b.pulmonaryPaths) || b.pulmonaryPaths.length !== 2) throw new Error("Invalid fixed respiratory boundary");
  for (const i of [0, 1] as const) {
    const path = b.pulmonaryPaths[i];
    exactKeys(path, ["resistanceMmHgSecPerMl", "externalPressureMmHg"]);
    if (!Number.isFinite(b.alveolarPressureMmHgByUnit[i]) || !Number.isFinite(b.volumeLByUnit[i]) || b.volumeLByUnit[i] <= 0
      || !Number.isFinite(path.resistanceMmHgSecPerMl) || path.resistanceMmHgSecPerMl <= 0
      || path.externalPressureMmHg !== b.alveolarPressureMmHgByUnit[i]) throw new Error("Invalid fixed pulmonary branch");
  }
  return freeze(b);
}
function exactKeys(value: unknown, keys: readonly string[]) {
  if (value === null || typeof value !== "object" || Array.isArray(value)
    || Object.keys(value).sort().join("|") !== [...keys].sort().join("|")) throw new Error("Fixed respiratory checkpoint shape differs");
}
function freeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}

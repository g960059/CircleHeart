import type { ExperimentScenarioV2 } from "@/studio/contracts/v2/content";
import type {
  StudioModelWorkerReleaseTicketV2,
} from "@/studio/contracts/v2/release";
import type {
  StudioSimulationFrameV2,
  StudioSimulationOutputValueV2,
} from "@/studio/contracts/v2/simulation";
import { studioCanonicalJsonStringify } from
  "@/domain/json/CanonicalJson";
import type { StudioSimulationWorkerClientV2 } from
  "@/studio/workers/StudioSimulationWorkerClientV2";

import type {
  WorkbenchBackgroundJobHandleV3,
  WorkbenchBackgroundJobPriorityV3,
  WorkbenchBackgroundWorkerPoolPortV3,
} from "./WorkbenchBackgroundWorkerPoolV3";
import { randomPortableTokenV3 } from "./randomPortableTokenV3";

const CYCLE_PHASE_OUTPUT_ID_V3 = "rhythm.phase.regular-sinus";
const ADVANCE_BATCH_STEPS_V3 = 16;
const WARM_START_CANDIDATE_CYCLES_V3 = 3;
const MINIMUM_OBSERVED_CYCLES_V3 = 4;
const REQUIRED_STABLE_TRANSITIONS_V3 = 3;
const MAXIMUM_OBSERVED_CYCLES_V3 = 20;
const MAXIMUM_ADVANCE_BATCHES_V3 = 1_600;
const MAXIMUM_UNWRAPPED_ADVANCE_SEC_V3 = 25;
const STABLE_NORMALIZED_DELTA_V3 = 1e-3;

export type WorkbenchSteadyCandidateSourceV3 = Readonly<{
  modelId: string;
  releaseTicket: StudioModelWorkerReleaseTicketV2;
  inputEpoch: number;
  scenario: ExperimentScenarioV2;
}>;

export type WorkbenchSteadyCandidateV3 = Readonly<{
  modelId: string;
  inputEpoch: number;
  scenario: ExperimentScenarioV2;
  completedCycleCount: number;
  consecutiveStableTransitionCount: number;
  maximumNormalizedDelta: number | null;
  /** Beat summaries alone do not establish full-state periodic settlement. */
  convergence: "bounded-warm-start" | "observed-beat-summary-closure" | "cycle-cap";
}>;

type CandidateRecordV3 = {
  key: string;
  priority: Extract<WorkbenchBackgroundJobPriorityV3, "prewarm" | "analysis" | "snapshot">;
  handle: WorkbenchBackgroundJobHandleV3<WorkbenchSteadyCandidateV3>;
  promise: Promise<WorkbenchSteadyCandidateV3>;
  latest: WorkbenchSteadyCandidateV3 | null;
};

/**
 * Runtime-only single-flight cache for a Scenario's current parameter target.
 *
 * It advances a detached exact checkpoint, observes beat-to-beat output
 * closure, and returns another exact fixture + checkpoint tuple. The result is
 * deliberately a *steady candidate*, not formal settlement or scientific
 * certification. Snapshot admission remains the final finite/conservation/
 * event/round-trip authority, while model-owned PV and Starling protocols may
 * still perform their stricter convergence checks from this warmer start.
 */
export class WorkbenchScenarioSteadyCandidateCoordinatorV3 {
  readonly #pool: WorkbenchBackgroundWorkerPoolPortV3;
  readonly #records = new Map<string, CandidateRecordV3>();
  #disposed = false;

  constructor(pool: WorkbenchBackgroundWorkerPoolPortV3) {
    this.#pool = pool;
  }

  prewarm(source: WorkbenchSteadyCandidateSourceV3): void {
    if (this.#disposed) return;
    void this.#ensure(source, "prewarm").catch(() => {
      // Prewarming is speculative. Explicit analysis/Snapshot requests retry
      // from their own accepted capture and surface any authoritative failure.
    });
  }

  /**
   * Returns the newest exact cycle-boundary candidate already produced for
   * this input target. It never queues, promotes, or waits for numerical work.
   * Analysis and Snapshot capture use this opportunistic read so speculative
   * convergence cannot become part of an interactive critical path.
   */
  bestAvailable(
    source: WorkbenchSteadyCandidateSourceV3,
  ): WorkbenchSteadyCandidateV3 | null {
    if (this.#disposed) return null;
    const record = this.#records.get(source.scenario.scenarioId);
    return record?.key === candidateKeyV3(source) ? record.latest : null;
  }

  async resolve(
    source: WorkbenchSteadyCandidateSourceV3,
    priority: Extract<WorkbenchBackgroundJobPriorityV3, "analysis" | "snapshot">,
  ): Promise<WorkbenchSteadyCandidateV3> {
    if (this.#disposed) {
      throw new Error("Workbench steady candidate coordinator is disposed");
    }
    return await this.#ensure(source, priority);
  }

  invalidateScenario(scenarioId: string): void {
    const previous = this.#records.get(scenarioId);
    if (previous === undefined) return;
    this.#records.delete(scenarioId);
    previous.handle.cancel();
  }

  /** Yield CPU for an interactive edit without cancelling explicit requests. */
  yieldPrewarm(scenarioId: string): void {
    const record = this.#records.get(scenarioId);
    if (record?.priority !== "prewarm") return;
    if (record.handle.cancel()) this.#records.delete(scenarioId);
  }

  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    for (const record of this.#records.values()) record.handle.cancel();
    this.#records.clear();
  }

  async #ensure(
    source: WorkbenchSteadyCandidateSourceV3,
    priority: Extract<
      WorkbenchBackgroundJobPriorityV3,
      "analysis" | "prewarm" | "snapshot"
    >,
  ): Promise<WorkbenchSteadyCandidateV3> {
    const key = candidateKeyV3(source);
    const previous = this.#records.get(source.scenario.scenarioId);
    if (previous !== undefined && previous.key === key) {
      if (priority === "snapshot" || previous.priority === "prewarm") {
        previous.priority = priority;
      }
      previous.handle.promote(priority);
      return await previous.promise;
    }
    if (previous !== undefined) {
      this.#records.delete(source.scenario.scenarioId);
      previous.handle.cancel();
    }

    let record!: CandidateRecordV3;
    const handle = this.#pool.schedule(priority, (client) =>
      computeSteadyCandidateV3(client, source, (candidate) => {
        if (this.#records.get(source.scenario.scenarioId) === record) {
          record.latest = candidate;
        }
      }));
    record = {
      key,
      priority,
      handle,
      promise: Promise.resolve(undefined as never),
      latest: null,
    };
    record.promise = handle.promise
      .then((candidate) => {
        if (this.#records.get(source.scenario.scenarioId) === record) {
          record.latest = candidate;
        }
        return candidate;
      })
      .catch((error) => {
        if (this.#records.get(source.scenario.scenarioId) === record) {
          this.#records.delete(source.scenario.scenarioId);
        }
        throw error;
      });
    this.#records.set(source.scenario.scenarioId, record);
    return await record.promise;
  }
}

async function computeSteadyCandidateV3(
  client: StudioSimulationWorkerClientV2,
  source: WorkbenchSteadyCandidateSourceV3,
  publish: (candidate: WorkbenchSteadyCandidateV3) => void,
): Promise<WorkbenchSteadyCandidateV3> {
  const runtimeSessionId = `workbench-steady-${randomPortableTokenV3()}`;
  const initialFrame = await client.initialize({
    expectedModelId: source.modelId,
    releaseTicket: source.releaseTicket,
    runtimeSessionId,
    scenarioId: source.scenario.scenarioId,
    scenarioLabel: source.scenario.label,
    fixture: source.scenario.capture.fixture,
    checkpoint: source.scenario.capture.checkpoint,
  });
  let previousPhase = cyclePhaseV3(initialFrame);
  if (previousPhase === null) {
    return await captureAndPublishCandidateV3(client, source, publish, {
      runtimeSessionId,
      completedCycleCount: 0,
      consecutiveStableTransitionCount: 0,
      maximumNormalizedDelta: null,
      convergence: "cycle-cap",
    });
  }
  let previousSignature: readonly number[] | null = null;
  let completedCycleCount = 0;
  let consecutiveStableTransitionCount = 0;
  let maximumNormalizedDelta: number | null = null;

  for (
    let batchIndex = 0;
    batchIndex < MAXIMUM_ADVANCE_BATCHES_V3;
    batchIndex += 1
  ) {
    const frames = await client.advance({
      runtimeSessionId,
      scenarioId: source.scenario.scenarioId,
      stepCount: ADVANCE_BATCH_STEPS_V3,
    });
    for (const frame of frames) {
      const phase = cyclePhaseV3(frame);
      if (
        phase !== null
        && previousPhase !== null
        && phase + 0.5 < previousPhase
      ) {
        completedCycleCount += 1;
        const signature = steadySignatureV3(frame);
        const delta = previousSignature === null
          ? null
          : maximumNormalizedDeltaV3(previousSignature, signature);
        maximumNormalizedDelta = delta;
        if (delta !== null && delta <= STABLE_NORMALIZED_DELTA_V3) {
          consecutiveStableTransitionCount += 1;
        } else {
          consecutiveStableTransitionCount = 0;
        }
        previousSignature = signature;
        if (completedCycleCount === WARM_START_CANDIDATE_CYCLES_V3) {
          await captureAndPublishCandidateV3(client, source, publish, {
            runtimeSessionId,
            completedCycleCount,
            consecutiveStableTransitionCount,
            maximumNormalizedDelta,
            convergence: "bounded-warm-start",
          });
        }
        const observedBeatSummaryClosure =
          completedCycleCount >= MINIMUM_OBSERVED_CYCLES_V3
          && consecutiveStableTransitionCount
            >= REQUIRED_STABLE_TRANSITIONS_V3;
        const reachedCap = completedCycleCount >= MAXIMUM_OBSERVED_CYCLES_V3;
        if (observedBeatSummaryClosure || reachedCap) {
          return await captureAndPublishCandidateV3(
            client,
            source,
            publish,
            {
              runtimeSessionId,
              completedCycleCount,
              consecutiveStableTransitionCount,
              maximumNormalizedDelta,
              convergence: observedBeatSummaryClosure
                ? "observed-beat-summary-closure"
                : "cycle-cap",
            },
          );
        }
      }
      previousPhase = phase;
    }
    const terminalFrame = frames.at(-1);
    if (
      terminalFrame !== undefined
      && completedCycleCount === 0
      && terminalFrame.acceptedTimeSec - initialFrame.acceptedTimeSec
        >= MAXIMUM_UNWRAPPED_ADVANCE_SEC_V3
    ) {
      return await captureAndPublishCandidateV3(client, source, publish, {
        runtimeSessionId,
        completedCycleCount,
        consecutiveStableTransitionCount,
        maximumNormalizedDelta,
        convergence: "cycle-cap",
      });
    }
  }
  return await captureAndPublishCandidateV3(client, source, publish, {
    runtimeSessionId,
    completedCycleCount,
    consecutiveStableTransitionCount,
    maximumNormalizedDelta,
    convergence: "cycle-cap",
  });
}

async function captureAndPublishCandidateV3(
  client: StudioSimulationWorkerClientV2,
  source: WorkbenchSteadyCandidateSourceV3,
  publish: (candidate: WorkbenchSteadyCandidateV3) => void,
  diagnostics: Parameters<typeof captureCandidateV3>[2],
): Promise<WorkbenchSteadyCandidateV3> {
  const candidate = await captureCandidateV3(client, source, diagnostics);
  publish(candidate);
  return candidate;
}

async function captureCandidateV3(
  client: StudioSimulationWorkerClientV2,
  source: WorkbenchSteadyCandidateSourceV3,
  diagnostics: Readonly<{
    runtimeSessionId: string;
    completedCycleCount: number;
    consecutiveStableTransitionCount: number;
    maximumNormalizedDelta: number | null;
    convergence: WorkbenchSteadyCandidateV3["convergence"];
  }>,
): Promise<WorkbenchSteadyCandidateV3> {
  const captures = await client.readScenarios({
    runtimeSessionId: diagnostics.runtimeSessionId,
  });
  const captured = captures.scenarios.find(({ scenarioId }) =>
    scenarioId === source.scenario.scenarioId);
  if (captures.scenarios.length !== 1 || captured === undefined) {
    throw new Error("steady candidate Worker returned another Scenario");
  }
  return Object.freeze({
    modelId: source.modelId,
    inputEpoch: source.inputEpoch,
    scenario: Object.freeze({
      scenarioId: source.scenario.scenarioId,
      label: source.scenario.label,
      capture: captured.capture,
    }),
    completedCycleCount: diagnostics.completedCycleCount,
    consecutiveStableTransitionCount:
      diagnostics.consecutiveStableTransitionCount,
    maximumNormalizedDelta: diagnostics.maximumNormalizedDelta,
    convergence: diagnostics.convergence,
  });
}

function candidateKeyV3(source: WorkbenchSteadyCandidateSourceV3): string {
  return studioCanonicalJsonStringify({
    modelId: source.modelId,
    scenarioId: source.scenario.scenarioId,
    inputEpoch: source.inputEpoch,
    fixture: source.scenario.capture.fixture,
  });
}

function cyclePhaseV3(frame: StudioSimulationFrameV2): number | null {
  const value = frame.outputs[CYCLE_PHASE_OUTPUT_ID_V3];
  return scalarAvailableValueV3(value);
}

function steadySignatureV3(frame: StudioSimulationFrameV2): readonly number[] {
  const preferred = Object.entries(frame.outputs)
    .filter(([outputId, value]) =>
      isBeatSummaryOutputV3(outputId) && scalarAvailableValueV3(value) !== null)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, value]) => scalarAvailableValueV3(value)!);
  if (preferred.length > 0) return Object.freeze(preferred);
  return Object.freeze(Object.entries(frame.outputs)
    .filter(([outputId, value]) =>
      outputId !== CYCLE_PHASE_OUTPUT_ID_V3
      && scalarAvailableValueV3(value) !== null)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, value]) => scalarAvailableValueV3(value)!));
}

function isBeatSummaryOutputV3(outputId: string): boolean {
  return outputId.includes(".mean.")
    || outputId.includes(".systolic.")
    || outputId.includes(".diastolic.")
    || outputId.includes(".pulse.")
    || outputId.includes(".maximum.")
    || outputId.includes(".minimum.")
    || outputId.includes("stroke-volume")
    || outputId.includes("ejection-fraction")
    || outputId.includes("cardiac-output");
}

function scalarAvailableValueV3(
  output: StudioSimulationOutputValueV2 | undefined,
): number | null {
  return output?.availability === "available"
    && typeof output.value === "number"
    && Number.isFinite(output.value)
    ? output.value
    : null;
}

function maximumNormalizedDeltaV3(
  previous: readonly number[],
  current: readonly number[],
): number | null {
  if (previous.length === 0 || previous.length !== current.length) return null;
  let maximum = 0;
  for (let index = 0; index < previous.length; index += 1) {
    const before = previous[index]!;
    const after = current[index]!;
    maximum = Math.max(
      maximum,
      Math.abs(after - before) / Math.max(1, Math.abs(before), Math.abs(after)),
    );
  }
  return maximum;
}

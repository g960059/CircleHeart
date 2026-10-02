import type { MainWireStaticCaseSessionV1 as Session } from "@/engine/vnext/MainWireStaticCaseSessionV1";
import type { MainWireIntegratedModelCompletedBeatMetricsV3 as Beat,
  MainWireIntegratedModelPressureVolumeLandmarkV3 as Landmark } from "@/engine/myocardium/MainWireIntegratedModelBeatMetricsV3";
import type { MainWireIntegratedModelOutputIdV3 as Id,
  MainWireIntegratedModelOutputValueV3 as Value } from "@/engine/myocardium/MainWireIntegratedModelOutputRegistryV3";
import type { MainWireIntegratedModelStructuralAnalysisSessionV3 as StructuralSession } from "./MainWirePressureVolumeProtocolsV3";
import { wrapMainWirePreloadReserveSessionV1 } from "./MainWirePreloadReserveSessionV1";

export const MAIN_WIRE_SEMILUNAR_PRESSURE_CROSSING_V1_ID = "main-wire-quasi-steady-semilunar-pressure-crossing-v1";
const sides = [
  { side: "left", ventricle: "LV", valve: "AoV", downstream: "Ao" },
  { side: "right", ventricle: "RV", valve: "PV", downstream: "PA" },
] as const;
const ids = Object.freeze(sides.flatMap(({ ventricle, valve, downstream }) => [
  `hemodynamics.volume.${ventricle}`, `hemodynamics.pressure.transmural.${ventricle}`,
  `hemodynamics.pressure.absolute.${ventricle}`, `hemodynamics.pressure.absolute.${downstream}`,
  `hemodynamics.flow.valve.${valve}`,
]) as Id[]);
type Sample = Readonly<{ timeSec: number; values: Readonly<Record<string, Value>> }>;
type Crossing = Readonly<{ timeSec: number; bracketEndSec: number; landmark: Landmark & { event: "semilunar-valve-closure" } }>;
/** The analysis borrows only this exact-owned continuation interface. A
 * respiratory intervention may supply another numerical owner with the same
 * hemodynamic projection, without claiming to be a production session. */
export type PressureCrossingExactSessionV1 = Pick<Session, "currentAcceptedState" | "observe"
  | "projectCurrentAcceptedValuesV1" | "advanceToPresentationTime"
  | "advanceToPresentationTimeWithSelectedOutputProjectionV1"> & {
    checkpoint(): unknown | Promise<unknown>;
    advancePressureCrossingPresentationV1?: Session["advancePressureCrossingPresentationV1"];
    forkAtFixedGlobalTotalBloodVolume(tbv: number): PressureCrossingExactSessionV1;
    forkResponsiveStarlingAtFixedGlobalTotalBloodVolume(tbv: number): PressureCrossingExactSessionV1;
  };
const owners = new WeakMap<StructuralSession, PressureCrossingExactSessionV1>();

/** Exact continuation remains owned by the model; event collectors are not
 * serialized into its checkpoint. Every subsequent load forks a new collector. */
export function captureMainWirePressureCrossingSessionV1(session: StructuralSession) {
  const owner = owners.get(session);
  if (!owner) throw new Error("Pressure-crossing continuation requires its exact owner");
  return owner.checkpoint();
}

/** Only for a quasi-steady valve: Q changes sign at ΔP=0. Interpolating the
 * signed pressure difference avoids treating a diode's first zero-flow sample
 * as the closing instant. Do not use this for inertial valves or infer Ees here. */
export function interpolateMainWireSemilunarClosureV1(
  before: Readonly<{ timeSec: number; pressureDifferenceMmHg: number; volumeMl: number; transmuralPressureMmHg: number }>,
  after: typeof before,
): Crossing {
  if (![...Object.values(before), ...Object.values(after)].every(Number.isFinite)
    || !(after.timeSec > before.timeSec) || !(before.pressureDifferenceMmHg > 0)
    || after.pressureDifferenceMmHg > 0) throw new Error("Semilunar closure requires a finite signed-pressure bracket");
  const alpha = before.pressureDifferenceMmHg / (before.pressureDifferenceMmHg - after.pressureDifferenceMmHg);
  const interpolate = (a: number, b: number) => a + alpha * (b - a);
  return Object.freeze({ timeSec: interpolate(before.timeSec, after.timeSec), bracketEndSec: after.timeSec,
    landmark: Object.freeze({ event: "semilunar-valve-closure" as const,
      volumeMl: interpolate(before.volumeMl, after.volumeMl),
      pressureMmHg: interpolate(before.transmuralPressureMmHg, after.transmuralPressureMmHg) }) });
}

/** Ephemeral analysis view; it does not mutate or relabel native beat metrics.
 * Each fixed-TBV fork owns its own event collector and the same requested dt. */
export function wrapMainWirePressureCrossingSessionV1(source: PressureCrossingExactSessionV1, dt: .002 | .001 = .002,
  requireReservoirClosure = false): StructuralSession {
  return wrapPressureCrossingSession(source, dt, true, requireReservoirClosure);
}

function wrapPressureCrossingSession(source: PressureCrossingExactSessionV1, dt: .002 | .001, retainDiagnosticReadback: boolean,
  requireReservoirClosure: boolean): StructuralSession {
  let previous: Sample | null = null;
  const initial = source.currentAcceptedState();
  const origin = initial.acceptedTimeSec;
  const sourceTbv = initial.coronary.fixedGlobalTotalBloodVolumeMl;
  const crossings: Record<"left" | "right", Crossing[]> = { left: [], right: [] };
  const value = (sample: Sample, id: string): number => {
    const v = sample.values[id];
    if (v?.availability !== "available" || typeof v.value !== "number" || !Number.isFinite(v.value))
      throw new Error(`Semilunar closure missing primitive ${id}`);
    return v.value;
  };
  const collect = (next: Sample) => {
    if (previous !== null) for (const { side, ventricle, valve, downstream } of sides) {
      const q = `hemodynamics.flow.valve.${valve}`;
      if (value(previous, q) > 0 && value(next, q) <= 0) {
        const point = (sample: Sample) => ({ timeSec: sample.timeSec,
          pressureDifferenceMmHg: value(sample, `hemodynamics.pressure.absolute.${ventricle}`) - value(sample, `hemodynamics.pressure.absolute.${downstream}`),
          volumeMl: value(sample, `hemodynamics.volume.${ventricle}`),
          transmuralPressureMmHg: value(sample, `hemodynamics.pressure.transmural.${ventricle}`) });
        crossings[side].push(interpolateMainWireSemilunarClosureV1(point(previous), point(next)));
      }
    }
    previous = next;
  };
  // Event detection needs only projected primitives at each numerical step.
  // Pruning needs the completed beat only at the presentation boundary, where
  // the ordinary detached observation already exists.
  let prunedThrough: number | undefined;
  const observe = () => {
    const observation = source.observe();
    const completed = observation.completedBeatMetrics;
    if (completed && completed.startTimeSec !== prunedThrough) {
      for (const { side } of sides) crossings[side] = crossings[side].filter(e => e.timeSec >= completed.startTimeSec);
      prunedThrough = completed.startTimeSec;
    }
    return observation;
  };
  const numerical = wrapMainWirePreloadReserveSessionV1({
    currentAcceptedState: () => source.currentAcceptedState(), observe,
    projectCurrentAcceptedValuesV1: outputIds => source.projectCurrentAcceptedValuesV1(outputIds),
    advanceToPresentationTime: target => {
      const result = !retainDiagnosticReadback && source.advancePressureCrossingPresentationV1
        ? source.advancePressureCrossingPresentationV1(target)
        : source.advanceToPresentationTime(target);
      if (result.status === "advanced") collect({ timeSec: result.acceptedTimeSec, values: source.projectCurrentAcceptedValuesV1(ids) });
      return result;
    },
    advanceToPresentationTimeWithSelectedOutputProjectionV1: (target, selected) => {
      const result = source.advanceToPresentationTimeWithSelectedOutputProjectionV1(target,
        selected.length === 0 ? ids : [...new Set([...ids, ...selected])]);
      if (result.advance.status === "advanced" && result.projectedValues !== null)
        collect({ timeSec: result.advance.acceptedTimeSec, values: result.projectedValues });
      return result;
    },
    forkAtFixedGlobalTotalBloodVolume: tbv => source.forkAtFixedGlobalTotalBloodVolume(tbv),
    forkResponsiveStarlingAtFixedGlobalTotalBloodVolume: tbv => source.forkResponsiveStarlingAtFixedGlobalTotalBloodVolume(tbv),
  }, dt, undefined, true);
  const landmarksForBeat = (beat: Beat) => {
      if (beat.startTimeSec < origin) return null;
      const forSide = (side: "left" | "right") => {
        const native = side === "left" ? beat.leftVentricularPressureVolumeLandmarks : beat.rightVentricularPressureVolumeLandmarks;
        const closure = (side === "left" ? beat.leftVentricularValveEventMetrics : beat.rightVentricularValveEventMetrics).endSystolic;
        if (native.endSystolic.event !== "semilunar-valve-closure" || closure === null) return native;
        // Bind to the native closing episode, not an arbitrary last crossing.
        const event = crossings[side].find(e => e.timeSec >= beat.startTimeSec && e.timeSec <= beat.endTimeSec
          && Math.abs(e.bracketEndSec - closure.timeSec) <= dt + 1e-9);
        if (!event) throw new Error(`Unobserved ${side} semilunar closure in complete analysis beat`);
        return Object.freeze({ ...native, endSystolic: event.landmark });
      };
      return Object.freeze({ left: forSide("left"), right: forSide("right") });
  };
  const structuralAdvance = (session: StructuralSession, target: number) => {
      const result = session.advanceToPresentationTime(target);
      if (result.status === "failed" || result.observation.completedBeatMetrics === null) return result;
      const native = result.observation.completedBeatMetrics;
      const landmarks = landmarksForBeat(native);
      return Object.freeze({ ...result, observation: Object.freeze({ ...result.observation,
        completedBeatMetrics: landmarks === null ? null : Object.freeze({ ...native,
          leftVentricularPressureVolumeLandmarks: landmarks.left,
          rightVentricularPressureVolumeLandmarks: landmarks.right,
        }),
      }) });
  };
  const wrapped: StructuralSession = Object.freeze({ ...numerical,
    ...(requireReservoirClosure ? { requireReservoirClosureV1: true } : {}),
    pressureVolumeLandmarksForBeatV1: landmarksForBeat,
    // Only analysis advances see measured landmarks; native metrics are intact.
    advanceStructuralAnalysisToPresentationTimeV1: target => structuralAdvance(numerical, target),
    // Same-load forks settle/measure an operating anchor and need the complete
    // step for vascular-return construction. Changed-load forks only sample PV
    // primitives and beats. Re-entering at the same load restores diagnostics,
    // including when a caller starts a new protocol from an existing branch.
    forkAtFixedGlobalTotalBloodVolume: tbv => wrapPressureCrossingSession(source.forkAtFixedGlobalTotalBloodVolume(tbv), dt, tbv === sourceTbv, requireReservoirClosure),
    forkResponsiveStarlingAtFixedGlobalTotalBloodVolume: tbv => wrapPressureCrossingSession(source.forkResponsiveStarlingAtFixedGlobalTotalBloodVolume(tbv), dt, tbv === sourceTbv, requireReservoirClosure),
  });
  owners.set(wrapped, source);
  return wrapped;
}

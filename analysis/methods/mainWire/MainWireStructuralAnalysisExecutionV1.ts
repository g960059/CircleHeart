import { CARDIORESPIRATORY_MECHANICAL_ANALYSIS_V1_ID } from "../cardiorespiratory/CardiorespiratoryMechanicalAnalysisV1";
import {
  MAIN_WIRE_INTEGRATED_MODEL_FORMAL_PRESSURE_VOLUME_RELATIONS_V3_ID,
  MAIN_WIRE_INTEGRATED_MODEL_GUYTON_STARLING_ORIENTATION_V3_ID,
  MAIN_WIRE_INTEGRATED_MODEL_RESPONSIVE_STARLING_HYPERVOLEMIC_PARTITION_V3,
  MAIN_WIRE_INTEGRATED_MODEL_RESPONSIVE_STARLING_HYPOVOLEMIC_PARTITION_V3,
  MAIN_WIRE_PRESSURE_CROSSING_PV_ANALYSIS_V1_ID,
} from "@/analysis/methods/mainWire/MainWireStructuralAnalysisContractV3";
export {
  MAIN_WIRE_INTEGRATED_MODEL_FORMAL_PRESSURE_VOLUME_RELATIONS_V3_ID,
  MAIN_WIRE_INTEGRATED_MODEL_GUYTON_STARLING_ORIENTATION_V3_ID,
} from "@/analysis/methods/mainWire/MainWireStructuralAnalysisContractV3";
export {
  buildMainWirePeriodicPvaMethodV8,
  buildMainWirePeriodicPvaMethodV9,
  buildMainWirePeriodicPvaMethodV10,
  buildMainWirePeriodicPvaMethodV13,
  MAIN_WIRE_PERIODIC_PVA_METHOD_V8_ID,
  MAIN_WIRE_PERIODIC_PVA_METHOD_V9_ID,
  MAIN_WIRE_PERIODIC_PVA_METHOD_V10_ID,
  MAIN_WIRE_PERIODIC_PVA_METHOD_V13_ID,
  type MainWirePeriodicPvaV1,
} from "@/analysis/methods/mainWire/MainWirePeriodicPvaV1";
import {
  validateStudioSimulationAnalysisV2,
  type StudioSimulationAnalysisExecutionPlanResolverV2,
  type StudioSimulationAnalysisExecutionPlanV2,
  type StudioSimulationAnalysisV2,
} from "@/studio/contracts/v2/simulation";
import {
  studioCanonicalJsonStringify,
} from "@/domain/json/CanonicalJson";

const MAIN_WIRE_BIDIRECTIONAL_STARLING_PLAN_V1:
StudioSimulationAnalysisExecutionPlanV2 = Object.freeze({
  partitions: Object.freeze([
    // A one-worker device must finish the short high-volume branch before the
    // long low-volume sweep so the first low-volume point can already form a
    // bilateral PV/Starling preview. The final merged locus remains sorted and
    // therefore independent of this time-to-first-result scheduling order.
    MAIN_WIRE_INTEGRATED_MODEL_RESPONSIVE_STARLING_HYPERVOLEMIC_PARTITION_V3,
    MAIN_WIRE_INTEGRATED_MODEL_RESPONSIVE_STARLING_HYPOVOLEMIC_PARTITION_V3,
  ]),
  merge: mergeMainWireStructuralAnalysesV1,
});

const MAIN_WIRE_FORMAL_PRESSURE_VOLUME_PLAN_V1:
StudioSimulationAnalysisExecutionPlanV2 = Object.freeze({
  partitions: Object.freeze([
    // The coverage-first low limb now reaches its low-flow boundary with fewer
    // retained points than the broad high extension. On a one-slot device,
    // finish low first; the next high point then admits the bilateral preview
    // and PVA without waiting for the entire high frontier. Two or more leases
    // still run both chains in parallel.
    MAIN_WIRE_INTEGRATED_MODEL_RESPONSIVE_STARLING_HYPOVOLEMIC_PARTITION_V3,
    MAIN_WIRE_INTEGRATED_MODEL_RESPONSIVE_STARLING_HYPERVOLEMIC_PARTITION_V3,
  ]),
  merge: mergeMainWireStructuralAnalysesV1,
});

export const resolveMainWireStructuralAnalysisExecutionPlanV1:
StudioSimulationAnalysisExecutionPlanResolverV2 = (analysisId) =>
  analysisId === MAIN_WIRE_INTEGRATED_MODEL_GUYTON_STARLING_ORIENTATION_V3_ID
    ? MAIN_WIRE_BIDIRECTIONAL_STARLING_PLAN_V1
    : analysisId === MAIN_WIRE_PRESSURE_CROSSING_PV_ANALYSIS_V1_ID || analysisId === CARDIORESPIRATORY_MECHANICAL_ANALYSIS_V1_ID
      ? MAIN_WIRE_SHARED_PRESSURE_VOLUME_PLAN_V1
      : analysisId ===
        MAIN_WIRE_INTEGRATED_MODEL_FORMAL_PRESSURE_VOLUME_RELATIONS_V3_ID
      ? MAIN_WIRE_FORMAL_PRESSURE_VOLUME_PLAN_V1
      : null;

const MAIN_WIRE_SHARED_PRESSURE_VOLUME_PLAN_V1: StudioSimulationAnalysisExecutionPlanV2 = Object.freeze({
  ...MAIN_WIRE_FORMAL_PRESSURE_VOLUME_PLAN_V1,
  sharedPreparation: true,
});

/**
 * Combines independently progressing preload directions without inventing
 * samples. Exact duplicate center points collapse by TBV/role identity; every
 * other measured or boundary point remains model-owned.
 */
export function mergeMainWireStructuralAnalysesV1(
  analyses: readonly StudioSimulationAnalysisV2[],
): StudioSimulationAnalysisV2 {
  if (analyses.length === 0) {
    throw new Error("bidirectional Starling merge requires a partial result");
  }
  if (analyses.length === 1) return analyses[0]!;
  const first = analyses[0]!;
  for (const analysis of analyses.slice(1)) {
    assertSameAnalysisEnvelopeV1(first, analysis);
  }
  const payloads = analyses.map(({ payload }, index) =>
    requiredRecordV1(payload, `analysis[${index}].payload`));
  const progressedPayloads = payloads.filter((payload, index) =>
    structuralPayloadHasSettledLocusV1(payload, index));
  const mergeablePayloads = progressedPayloads.length === 0
    ? payloads
    : progressedPayloads;
  assertCanonicalEqualV1(
    mergeablePayloads.map((payload) =>
      withoutKeysV1(payload, ["left", "right"])),
    "bidirectional analysis envelope payloads",
  );
  const payload = Object.freeze({
    ...mergeablePayloads[0],
    right: mergeStructuralSideV1(mergeablePayloads, "right"),
    left: mergeStructuralSideV1(mergeablePayloads, "left"),
  });
  return validateStudioSimulationAnalysisV2({
    ...first,
    payload,
  }, "$.bidirectionalStarlingAnalysis");
}

function structuralPayloadHasSettledLocusV1(
  payload: Readonly<Record<string, unknown>>,
  index: number,
): boolean {
  const settledBySide = (["right", "left"] as const).map((side) => {
    const orientation = requiredRecordV1(
      payload[side],
      `analysis[${index}].payload.${side}`,
    );
    const locus = requiredRecordV1(
      orientation.starlingLocus,
      `analysis[${index}].payload.${side}.starlingLocus`,
    );
    if (locus.status === "requires-protocol") return false;
    if (
      locus.status !== "responsive-fixed-tbv-preview" &&
      locus.status !== "measured-fixed-tbv-protocol"
    ) {
      throw new Error(`bidirectional ${side} result has an unknown locus`);
    }
    return true;
  });
  if (settledBySide[0] !== settledBySide[1]) {
    throw new Error("bidirectional payload mixes structural locus stages");
  }
  return settledBySide[0]!;
}

function mergeStructuralSideV1(
  payloads: readonly Readonly<Record<string, unknown>>[],
  side: "right" | "left",
): Readonly<Record<string, unknown>> {
  const sides = payloads.map((payload, index) =>
    requiredRecordV1(payload[side], `analysis[${index}].payload.${side}`));
  const settledSides = sides.filter((candidate, index) => {
    const locus = requiredRecordV1(
      candidate.starlingLocus,
      `analysis[${index}].payload.${side}.starlingLocus`,
    );
    if (locus.status === "requires-protocol") return false;
    if (
      locus.status !== "responsive-fixed-tbv-preview" &&
      locus.status !== "measured-fixed-tbv-protocol"
    ) {
      throw new Error(`bidirectional ${side} result has an unknown locus`);
    }
    return true;
  });
  if (settledSides.length === 0) {
    assertCanonicalEqualV1(
      sides,
      `bidirectional ${side} initial structural payloads`,
    );
    return sides[0]!;
  }
  assertCanonicalEqualV1(
    settledSides.map((candidate) =>
      withoutKeysV1(candidate, ["starlingLocus"])),
    `bidirectional ${side} structural payloads`,
  );
  const loci = settledSides.map((candidate, index) => {
    const locus = requiredRecordV1(
      candidate.starlingLocus,
      `analysis[${index}].payload.${side}.starlingLocus`,
    );
    if (
      (
        locus.status !== "responsive-fixed-tbv-preview" &&
        locus.status !== "measured-fixed-tbv-protocol"
      ) || !Array.isArray(locus.points)
    ) {
      throw new Error(
        `bidirectional ${side} result is not a fixed-TBV locus`,
      );
    }
    return locus;
  });
  assertCanonicalEqualV1(
    loci.map((locus) => withoutKeysV1(
      locus,
      ["completedPointCount", "points", "totalPointCount"],
    )),
    `bidirectional ${side} Starling contracts`,
  );
  const pointByIdentity = new Map<string, unknown>();
  for (const [locusIndex, locus] of loci.entries()) {
    const points = locus.points as readonly unknown[];
    for (const [pointIndex, value] of points.entries()) {
      const point = requiredRecordV1(
        value,
        `analysis[${locusIndex}].payload.${side}.starlingLocus.points[${pointIndex}]`,
      );
      const tbv = point.totalBloodVolumeMl;
      const role = point.role;
      if (
        typeof tbv !== "number"
        || !Number.isFinite(tbv)
        || (role !== "operating-anchor" && role !== "continuation")
      ) throw new Error(`bidirectional ${side} Starling point identity is invalid`);
      const identity = `${role}:${tbv}`;
      const prior = pointByIdentity.get(identity);
      if (prior !== undefined) {
        assertCanonicalEqualV1(
          [prior, point],
          `bidirectional ${side} duplicate Starling point ${identity}`,
        );
      } else pointByIdentity.set(identity, point);
    }
  }
  const points = Object.freeze([...pointByIdentity.values()].sort((left, right) => {
    const leftPressure = requiredFiniteFieldV1(left, "fillingPressureMmHg");
    const rightPressure = requiredFiniteFieldV1(right, "fillingPressureMmHg");
    return leftPressure - rightPressure;
  }));
  const allPartitionsComplete = loci.every((locus) =>
    requiredSafeIntegerFieldV1(locus, "completedPointCount")
      === requiredSafeIntegerFieldV1(locus, "totalPointCount"));
  const totalPointCount = allPartitionsComplete
    ? points.length
    : Math.max(
        points.length + 1,
        ...loci.map((locus) => requiredSafeIntegerFieldV1(
          locus,
          "totalPointCount",
        )),
      );
  return Object.freeze({
    ...settledSides[0],
    starlingLocus: Object.freeze({
      ...loci[0],
      completedPointCount: points.length,
      totalPointCount,
      points,
    }),
  });
}

function assertSameAnalysisEnvelopeV1(
  expected: StudioSimulationAnalysisV2,
  candidate: StudioSimulationAnalysisV2,
): void {
  for (const key of [
    "analysisId",
    "inputEpoch",
    "modelId",
    "runtimeSessionId",
    "scenarioId",
    "sourceAcceptedRevision",
    "sourceAcceptedTimeSec",
  ] as const) {
    if (candidate[key] !== expected[key]) {
      throw new Error(`bidirectional Starling analysis ${key} differs`);
    }
  }
}

function assertCanonicalEqualV1(
  values: readonly unknown[],
  label: string,
): void {
  const expected = studioCanonicalJsonStringify(values[0]);
  if (values.slice(1).some((value) =>
    studioCanonicalJsonStringify(value) !== expected)) {
    throw new Error(`${label} differ`);
  }
}

function withoutKeysV1(
  value: Readonly<Record<string, unknown>>,
  omitted: readonly string[],
): Readonly<Record<string, unknown>> {
  return Object.freeze(Object.fromEntries(Object.entries(value).filter(([key]) =>
    !omitted.includes(key))));
}

function requiredRecordV1(
  value: unknown,
  path: string,
): Readonly<Record<string, unknown>> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${path} must be an object`);
  }
  return value as Readonly<Record<string, unknown>>;
}

function requiredFiniteFieldV1(value: unknown, field: string): number {
  const candidate = requiredRecordV1(value, "Starling point")[field];
  if (typeof candidate !== "number" || !Number.isFinite(candidate)) {
    throw new Error(`Starling point ${field} must be finite`);
  }
  return candidate;
}

function requiredSafeIntegerFieldV1(
  value: Readonly<Record<string, unknown>>,
  field: string,
): number {
  const candidate = value[field];
  if (!Number.isSafeInteger(candidate) || (candidate as number) < 0) {
    throw new Error(`Starling locus ${field} must be a nonnegative integer`);
  }
  return candidate as number;
}

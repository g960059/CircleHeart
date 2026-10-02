import { describe, expect, it } from "vitest";

import {
  advanceCoronaryAcceptedAutoregulationV3,
  createCoronaryAcceptedAutoregulationStateV3,
  createCoronaryAutoregulationWindowBindingV3,
  createDefaultCoronaryAutoregulationWindowControlV3,
  maximumCoronaryAutoregulationStepDurationV3,
  validateCoronaryAcceptedAutoregulationStateV3,
  validateCoronaryAutoregulationWindowBindingV3,
  type CoronaryAutoregulationWindowControlV3,
} from "@/engine/coronary/acceptedAutoregulationWindowV3";
import {
  initialCoronaryToneStateV2,
  NORMAL_ADULT_CORONARY_TOPOLOGY_PRIOR_V2,
} from "@/engine/coronary/topologyPriorV2";
import {
  CORONARY_LAYER_IDS_V2,
  CORONARY_TERRITORY_IDS_V2,
  type CoronaryTerritoryLayerRecordV2,
  type CoronaryTerritoryRecordV2,
  type CoronaryToneStateV2,
} from "@/engine/coronary/typesV2";
import {
  selectValidationStampModeV1,
  validationStampModeV1,
  type ValidationStampModeV1,
} from "@/engine/validationStampModeV1";
import { withHotPathIntegrityTierV1 } from "@/engine/hotPathIntegrityTierV1";

const binding = createCoronaryAutoregulationWindowBindingV3({
  originAcceptedTimeSec: 0,
  durationSec: 1,
  interpretation: "periodic-sinus-cycle-aligned",
});

describe("accepted physical-time coronary autoregulation window V3", () => {
  it("uses BE duration weights and updates tone once at the exact boundary", () => {
    let state = createCoronaryAcceptedAutoregulationStateV3(binding, {
      acceptedTimeSec: 0,
      revision: 0,
    });
    let tone = initialCoronaryToneStateV2();
    const samples = [
      { end: 0.1, q: 1, post: 50 },
      { end: 0.3, q: 2, post: 60 },
      { end: 1, q: 3, post: 80 },
    ] as const;
    let start = 0;
    let completion: ReturnType<
      typeof advanceCoronaryAcceptedAutoregulationV3
    >["completedWindow"] = null;
    samples.forEach((sample, index) => {
      const advanced = advanceCoronaryAcceptedAutoregulationV3(
        binding,
        state,
        tone,
        {
          previousAcceptedTimeSec: start,
          candidateAcceptedTimeSec: sample.end,
          candidateRevision: index + 1,
          finalQmInternalFlowMlPerSecByTerritoryLayer:
            layerRecord(sample.q),
          finalPostFocalLesionPressureMmHgByTerritory:
            territoryRecord(sample.post),
          finalCommonCoronaryVenousPressureMmHg: 10,
        },
      );
      if (index < samples.length - 1) {
        expect(advanced.completedWindow).toBeNull();
        expect(advanced.nextToneResistanceScaleByTerritoryLayer).toBe(tone);
      }
      state = advanced.nextState;
      tone = advanced.nextToneResistanceScaleByTerritoryLayer;
      completion = advanced.completedWindow;
      start = sample.end;
    });

    expect(completion).not.toBeNull();
    expect(completion!.acceptedStepCount).toBe(3);
    expect(completion!.aggregate.acceptedWindowDurationSec).toBeCloseTo(1, 15);
    expect(completion!.aggregate
      .meanTissueFlowMlPerSecByTerritoryLayer.LAD.subendocardial)
      .toBeCloseTo(2.6, 14);
    expect(completion!.aggregate.meanPerfusionPressureMmHgByTerritory.LAD)
      .toBeCloseTo(63, 14);
    expect(state.windowIndex).toBe(1);
    expect(state.acceptedDurationSec).toBe(0);
    expect(state.acceptedStepCount).toBe(0);
    expect(state.windowControl).toBeNull();
    expect(state.desiredControl?.controlId)
      .toBe(createDefaultCoronaryAutoregulationWindowControlV3().controlId);
    expect(tone.LAD.subendocardial).toBeGreaterThan(1);
  });

  it("is pure under retry and rejects a step that crosses a window boundary", () => {
    const state = createCoronaryAcceptedAutoregulationStateV3(binding, {
      acceptedTimeSec: 0,
      revision: 0,
    });
    const tone = initialCoronaryToneStateV2();
    const input = {
      previousAcceptedTimeSec: 0,
      candidateAcceptedTimeSec: 0.4,
      candidateRevision: 1,
      finalQmInternalFlowMlPerSecByTerritoryLayer: layerRecord(1),
      finalPostFocalLesionPressureMmHgByTerritory: territoryRecord(80),
      finalCommonCoronaryVenousPressureMmHg: 5,
    } as const;
    const before = JSON.stringify({ state, tone });
    const first = advanceCoronaryAcceptedAutoregulationV3(
      binding,
      state,
      tone,
      input,
    );
    const retry = advanceCoronaryAcceptedAutoregulationV3(
      binding,
      state,
      tone,
      input,
    );
    expect(retry).toEqual(first);
    expect(JSON.stringify({ state, tone })).toBe(before);
    expect(maximumCoronaryAutoregulationStepDurationV3(
      binding,
      first.nextState,
      0.4,
    )).toBeCloseTo(0.6, 15);
    expect(() => advanceCoronaryAcceptedAutoregulationV3(
      binding,
      first.nextState,
      tone,
      {
        ...input,
        previousAcceptedTimeSec: 0.4,
        candidateAcceptedTimeSec: 1.01,
        candidateRevision: 2,
      },
    )).toThrow(/crosses.*window boundary/);
  });

  it("queues an exact mid-window control change and applies it at the next boundary", () => {
    const initial = createCoronaryAcceptedAutoregulationStateV3(binding, {
      acceptedTimeSec: 0,
      revision: 0,
    });
    const tone = initialCoronaryToneStateV2();
    const baseline = createDefaultCoronaryAutoregulationWindowControlV3();
    const changed = Object.freeze({
      ...baseline,
      controlId: "hyperemia-test-control",
      hyperemia01ByTerritoryLayer: layerRecord(1),
    }) satisfies CoronaryAutoregulationWindowControlV3;
    const future = Object.freeze({
      ...baseline,
      controlId: "future-demand-test-control",
      demandScaleByTerritoryLayer: layerRecord(1.2),
    }) satisfies CoronaryAutoregulationWindowControlV3;
    const partial = advanceCoronaryAcceptedAutoregulationV3(
      binding,
      initial,
      tone,
      sampleInput(0, 0.5, 1, baseline),
    );
    const changedMidWindow = advanceCoronaryAcceptedAutoregulationV3(
      binding,
      partial.nextState,
      tone,
      sampleInput(0.5, 0.75, 2, changed),
    );
    const retry = advanceCoronaryAcceptedAutoregulationV3(
      binding,
      partial.nextState,
      tone,
      sampleInput(0.5, 0.75, 2, changed),
    );
    expect(retry).toEqual(changedMidWindow);
    expect(changedMidWindow.nextState.windowControl).toEqual(baseline);
    expect(changedMidWindow.nextState.desiredControl).toEqual(changed);
    const completed = advanceCoronaryAcceptedAutoregulationV3(
      binding,
      changedMidWindow.nextState,
      tone,
      sampleInput(0.75, 1, 3, changed),
    );
    expect(completed.completedWindow).not.toBeNull();
    expect(completed.completedWindow?.control).toEqual(baseline);
    expect(completed.nextState.windowControl).toBeNull();
    expect(completed.nextState.desiredControl).toEqual(changed);
    const next = advanceCoronaryAcceptedAutoregulationV3(
      binding,
      completed.nextState,
      completed.nextToneResistanceScaleByTerritoryLayer,
      sampleInput(1, 1.25, 4, future),
    );
    expect(next.nextState.windowControl).toEqual(changed);
    expect(next.nextState.desiredControl).toEqual(future);
  });

  it("allows instantaneous reverse Qm but fails closed on a negative window mean", () => {
    const initial = createCoronaryAcceptedAutoregulationStateV3(binding, {
      acceptedTimeSec: 0,
      revision: 0,
    });
    const tone = initialCoronaryToneStateV2();
    const reverse = advanceCoronaryAcceptedAutoregulationV3(
      binding,
      initial,
      tone,
      {
        ...sampleInput(0, 0.2, 1),
        finalQmInternalFlowMlPerSecByTerritoryLayer: layerRecord(-1),
      },
    );
    const recovered = advanceCoronaryAcceptedAutoregulationV3(
      binding,
      reverse.nextState,
      tone,
      {
        ...sampleInput(0.2, 1, 2),
        finalQmInternalFlowMlPerSecByTerritoryLayer: layerRecord(1),
      },
    );
    expect(recovered.completedWindow!.aggregate
      .meanTissueFlowMlPerSecByTerritoryLayer.LAD.subepicardial)
      .toBeCloseTo(0.6, 14);

    expect(() => advanceCoronaryAcceptedAutoregulationV3(
      binding,
      initial,
      tone,
      {
        ...sampleInput(0, 1, 1),
        finalQmInternalFlowMlPerSecByTerritoryLayer: layerRecord(-1),
      },
    )).toThrow(/flow and perfusion pressure must be non-negative/);
  });

  it("uses the disease floor as anti-windup during sustained hyperemia", () => {
    let state = createCoronaryAcceptedAutoregulationStateV3(binding, {
      acceptedTimeSec: 0,
      revision: 0,
    });
    let tone: CoronaryToneStateV2 = initialCoronaryToneStateV2();
    const floor = 0.5;
    const control = Object.freeze({
      controlId: "cmd-floor-hyperemia-test",
      demandScaleByTerritoryLayer: layerRecord(1),
      hyperemia01ByTerritoryLayer: layerRecord(1),
      effectiveMinimumToneScaleByTerritoryLayer: layerRecord(floor),
    }) satisfies CoronaryAutoregulationWindowControlV3;
    for (let window = 0; window < 250; window += 1) {
      const advanced = advanceCoronaryAcceptedAutoregulationV3(
        binding,
        state,
        tone,
        sampleInput(window, window + 1, window + 1, control),
      );
      state = advanced.nextState;
      tone = advanced.nextToneResistanceScaleByTerritoryLayer;
    }
    expect(tone.LAD.subendocardial).toBeGreaterThanOrEqual(floor);
    expect(tone.LAD.subendocardial).toBeCloseTo(floor, 4);
  });

  it("gives the same constant-signal tone update at 2 ms and 1 ms", () => {
    const coarse = completeConstantWindow(0.002, 2);
    const fine = completeConstantWindow(0.001, 2);
    expect(coarse.state).toMatchObject({
      windowIndex: 1,
      acceptedDurationSec: 0,
      acceptedStepCount: 0,
      windowControl: null,
      desiredControl:
        createDefaultCoronaryAutoregulationWindowControlV3(),
    });
    expect(fine.state).toMatchObject({
      windowIndex: 1,
      acceptedDurationSec: 0,
      acceptedStepCount: 0,
      windowControl: null,
      desiredControl:
        createDefaultCoronaryAutoregulationWindowControlV3(),
    });
    for (const territoryId of CORONARY_TERRITORY_IDS_V2) {
      for (const layerId of CORONARY_LAYER_IDS_V2) {
        expect(coarse.tone[territoryId][layerId])
          .toBeCloseTo(fine.tone[territoryId][layerId], 13);
      }
    }
  });

  it("rejects hidden fields in binding, state, and fixed-dimension records", () => {
    const bindingWithHiddenField = Object.freeze({
      ...binding,
      hiddenLawState: 1,
    }) as typeof binding;
    expect(() => validateCoronaryAutoregulationWindowBindingV3(
      bindingWithHiddenField,
    )).toThrow(/binding keys mismatch/);

    const state = createCoronaryAcceptedAutoregulationStateV3(binding, {
      acceptedTimeSec: 0,
      revision: 0,
    });
    const stateWithHiddenRecord = Object.freeze({
      ...state,
      qmTimeIntegralMlByTerritoryLayer: Object.freeze({
        ...state.qmTimeIntegralMlByTerritoryLayer,
        hiddenTerritory: Object.freeze({
          subepicardial: 0,
          subendocardial: 0,
        }),
      }),
    }) as typeof state;
    expect(() => validateCoronaryAcceptedAutoregulationStateV3(
      binding,
      stateWithHiddenRecord,
      { acceptedTimeSec: 0, maximumRevision: 0 },
    )).toThrow(/Qm time integral keys mismatch/);
  });

  it("never stamps an outer-frozen state that retains a mutable descendant", () => {
    const initial = createCoronaryAcceptedAutoregulationStateV3(binding, {
      acceptedTimeSec: 0,
      revision: 0,
    });
    const mutableQm = structuredClone(
      initial.qmTimeIntegralMlByTerritoryLayer,
    ) as Record<string, Record<string, number>>;
    const outerFrozen = Object.freeze({
      ...initial,
      qmTimeIntegralMlByTerritoryLayer: mutableQm,
    }) as typeof initial;

    validateCoronaryAcceptedAutoregulationStateV3(binding, outerFrozen, {
      acceptedTimeSec: 0,
      maximumRevision: 0,
    });
    mutableQm.LAD!.subepicardial = Number.NaN;

    expect(() => validateCoronaryAcceptedAutoregulationStateV3(
      binding,
      outerFrozen,
      { acceptedTimeSec: 0, maximumRevision: 0 },
    )).toThrow(/Qm time integral.*finite/);
  });

  it("binds accepted step count exactly to the enclosing revision", () => {
    const initial = createCoronaryAcceptedAutoregulationStateV3(binding, {
      acceptedTimeSec: 0,
      revision: 7,
    });
    expect(() => advanceCoronaryAcceptedAutoregulationV3(
      binding,
      initial,
      initialCoronaryToneStateV2(),
      sampleInput(0, 0.1, 9),
    )).toThrow(/revision.*exactly one step/);

    const partial = advanceCoronaryAcceptedAutoregulationV3(
      binding,
      initial,
      initialCoronaryToneStateV2(),
      sampleInput(0, 0.1, 8),
    );
    expect(() => validateCoronaryAcceptedAutoregulationStateV3(
      binding,
      partial.nextState,
      { acceptedTimeSec: 0.1, maximumRevision: 9 },
    )).toThrow(/step count differs from accepted revision/);
  });

  it("retains exact accepted traces with reuse disabled across controls, restore, and window closure", () => {
    const originalMode = validationStampModeV1();
    const run = (mode: ValidationStampModeV1) => {
      selectValidationStampModeV1(mode);
      let state = createCoronaryAcceptedAutoregulationStateV3(binding, {
        acceptedTimeSec: 0, revision: 0,
      });
      let tone = initialCoronaryToneStateV2();
      const baseline = createDefaultCoronaryAutoregulationWindowControlV3();
      const changed = Object.freeze({ ...baseline, controlId: "changed",
        demandScaleByTerritoryLayer: layerRecord(1.2),
        hyperemia01ByTerritoryLayer: layerRecord(0.1) });
      const trace = [];
      for (let step = 1; step <= 12; step++) {
        if (step === 3 || step === 7) state = JSON.parse(JSON.stringify(state));
        const advanced = advanceCoronaryAcceptedAutoregulationV3(binding, state, tone, {
          ...sampleInput((step - 1) / 4, step / 4, step, step >= 3 ? changed : baseline),
          finalQmInternalFlowMlPerSecByTerritoryLayer: layerRecord(step === 2 ? -0.1 : 1 + step / 10),
        });
        trace.push(advanced);
        state = advanced.nextState;
        tone = advanced.nextToneResistanceScaleByTerritoryLayer;
      }
      return trace;
    };
    try {
      const uncached = run("validation-stamps-disabled");
      const cached = run("validation-stamps-enabled");
      expect(cached).toStrictEqual(uncached);
      expect(cached.filter(step => step.completedWindow !== null)).toHaveLength(3);
    } finally { selectValidationStampModeV1(originalMode); }
  });

  it("rechecks an accessor-backed outer clock even when the previous state is immutable", () => {
    const originalMode = validationStampModeV1();
    try {
      for (const tier of ["full-invariant", "hot-path-lean"] as const) {
        withHotPathIntegrityTierV1(tier, () => {
          for (const mode of ["validation-stamps-enabled", "validation-stamps-disabled"] as const) {
            selectValidationStampModeV1(mode);
            const initial = createCoronaryAcceptedAutoregulationStateV3(binding, { acceptedTimeSec: 0, revision: 0 });
            const before = JSON.stringify(initial);
            let reads = 0;
            const input = { ...sampleInput(0, 0.1, 1),
              get previousAcceptedTimeSec() { return reads++ === 0 ? 0 : 0.05; } };
            expect(() => advanceCoronaryAcceptedAutoregulationV3(binding, initial, initialCoronaryToneStateV2(), input))
              .toThrow(/window clock differs from accepted tuple/);
            expect(JSON.stringify(initial)).toBe(before);
          }
        });
      }
    } finally { selectValidationStampModeV1(originalMode); }
  });

  it("never reuses mutable or getter-backed controls and keeps accepted snapshots detached", () => {
    const originalMode = validationStampModeV1();
    try {
      for (const mode of ["validation-stamps-enabled", "validation-stamps-disabled"] as const) {
        selectValidationStampModeV1(mode);
        const initial = createCoronaryAcceptedAutoregulationStateV3(binding, { acceptedTimeSec: 0, revision: 0 });
        const tone = initialCoronaryToneStateV2();
        const mutable = structuredClone(createDefaultCoronaryAutoregulationWindowControlV3()) as {
          controlId: string;
          demandScaleByTerritoryLayer: Record<string, Record<string, number>>;
          hyperemia01ByTerritoryLayer: Record<string, Record<string, number>>;
          effectiveMinimumToneScaleByTerritoryLayer: Record<string, Record<string, number>>;
        };
        const outerFrozen = Object.freeze(mutable) as CoronaryAutoregulationWindowControlV3;
        const first = advanceCoronaryAcceptedAutoregulationV3(binding, initial, tone, sampleInput(0, 0.1, 1, outerFrozen));
        mutable.hyperemia01ByTerritoryLayer.LAD!.subendocardial = 0.5;
        const changed = advanceCoronaryAcceptedAutoregulationV3(binding, initial, tone, sampleInput(0, 0.1, 1, outerFrozen));
        expect(first.nextState.desiredControl?.hyperemia01ByTerritoryLayer.LAD.subendocardial).toBe(0);
        expect(changed.nextState.desiredControl?.hyperemia01ByTerritoryLayer.LAD.subendocardial).toBe(0.5);
        mutable.hyperemia01ByTerritoryLayer.LAD!.subendocardial = 2;
        expect(() => advanceCoronaryAcceptedAutoregulationV3(binding, initial, tone, sampleInput(0, 0.1, 1, outerFrozen)))
          .toThrow(/hyperemia must lie/);

        let demand = layerRecord(1);
        const getterControl = Object.freeze({ ...createDefaultCoronaryAutoregulationWindowControlV3(),
          get demandScaleByTerritoryLayer() { return demand; } });
        advanceCoronaryAcceptedAutoregulationV3(binding, initial, tone, sampleInput(0, 0.1, 1, getterControl));
        demand = layerRecord(-1);
        expect(() => advanceCoronaryAcceptedAutoregulationV3(binding, initial, tone, sampleInput(0, 0.1, 1, getterControl)))
          .toThrow(/demand scale must be positive/);

        // A hostile accessor changes between semantic validation (one record
        // read plus six bound checks) and copying. Freezing that copy must not
        // itself bless the unvalidated negative values.
        let reads = 0;
        const changesDuringCopy = Object.freeze({ ...createDefaultCoronaryAutoregulationWindowControlV3(),
          get demandScaleByTerritoryLayer() { return layerRecord(++reads <= 7 ? 1 : -1); } });
        expect(() => advanceCoronaryAcceptedAutoregulationV3(binding, initial, tone, sampleInput(0, 0.1, 1, changesDuringCopy)))
          .toThrow(/demand scale must be positive/);
        const forgedCopy = Object.freeze({ ...first.nextState.desiredControl!, hiddenControl: 1 });
        expect(() => advanceCoronaryAcceptedAutoregulationV3(binding, initial, tone, sampleInput(0, 0.1, 1, forgedCopy)))
          .toThrow(/control keys mismatch/);
      }
    } finally { selectValidationStampModeV1(originalMode); }
  });
});

function completeConstantWindow(
  dtSec: number,
  targetMultiple: number,
): Readonly<{
  state: ReturnType<typeof createCoronaryAcceptedAutoregulationStateV3>;
  tone: CoronaryToneStateV2;
}> {
  const stepCount = Math.round(1 / dtSec);
  const target = targetFlowRecord();
  let state = createCoronaryAcceptedAutoregulationStateV3(binding, {
    acceptedTimeSec: 0,
    revision: 0,
  });
  let tone: CoronaryToneStateV2 = initialCoronaryToneStateV2();
  for (let index = 1; index <= stepCount; index += 1) {
    const previousAcceptedTimeSec = (index - 1) * dtSec;
    const candidateAcceptedTimeSec = index === stepCount ? 1 : index * dtSec;
    const advanced = advanceCoronaryAcceptedAutoregulationV3(
      binding,
      state,
      tone,
      {
        ...sampleInput(
          previousAcceptedTimeSec,
          candidateAcceptedTimeSec,
          index,
        ),
        finalQmInternalFlowMlPerSecByTerritoryLayer: layerRecord(
          (territoryId, layerId) => targetMultiple
            * target[territoryId][layerId],
        ),
      },
    );
    state = advanced.nextState;
    tone = advanced.nextToneResistanceScaleByTerritoryLayer;
  }
  return Object.freeze({ state, tone });
}

function sampleInput(
  start: number,
  end: number,
  revision: number,
  control = createDefaultCoronaryAutoregulationWindowControlV3(),
) {
  return {
    previousAcceptedTimeSec: start,
    candidateAcceptedTimeSec: end,
    candidateRevision: revision,
    finalQmInternalFlowMlPerSecByTerritoryLayer: targetFlowRecord(),
    finalPostFocalLesionPressureMmHgByTerritory: territoryRecord(80),
    finalCommonCoronaryVenousPressureMmHg: 5,
    control,
  } as const;
}

function targetFlowRecord(): CoronaryTerritoryLayerRecordV2<number> {
  return layerRecord((territoryId, layerId) => {
    const territory = NORMAL_ADULT_CORONARY_TOPOLOGY_PRIOR_V2
      .territories[territoryId];
    return territory.targetRestingFlowMlPerMin / 60
      * territory.layers[layerId].restingFlowFractionWithinTerritory01;
  });
}

function layerRecord(
  value: number | ((
    territoryId: (typeof CORONARY_TERRITORY_IDS_V2)[number],
    layerId: (typeof CORONARY_LAYER_IDS_V2)[number],
  ) => number),
): CoronaryTerritoryLayerRecordV2<number> {
  const resolve = typeof value === "number" ? () => value : value;
  return Object.freeze(Object.fromEntries(CORONARY_TERRITORY_IDS_V2.map(
    (territoryId) => [territoryId, Object.freeze(Object.fromEntries(
      CORONARY_LAYER_IDS_V2.map((layerId) => [
        layerId,
        resolve(territoryId, layerId),
      ]),
    ))],
  ))) as CoronaryTerritoryLayerRecordV2<number>;
}

function territoryRecord(value: number): CoronaryTerritoryRecordV2<number> {
  return Object.freeze(Object.fromEntries(CORONARY_TERRITORY_IDS_V2.map(
    (territoryId) => [territoryId, value],
  ))) as CoronaryTerritoryRecordV2<number>;
}

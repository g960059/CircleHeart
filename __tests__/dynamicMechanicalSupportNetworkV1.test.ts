import { describe, expect, it, vi } from "vitest";
import { selectValidationStampModeV1, validationStampModeV1 } from "@/engine/validationStampModeV1";

import { createMechanicalSupportConfigV1 } from
  "@/engine/devices/defaultsV1";
import {
  DYNAMIC_MECHANICAL_SUPPORT_ACCEPTED_STATE_V1_ID,
  DYNAMIC_MECHANICAL_SUPPORT_NETWORK_V1_ID,
  createDynamicMechanicalSupportAcceptedStateV1,
  createDynamicMechanicalSupportDeviceProfileBindingV1,
  createDynamicMechanicalSupportInertanceProfileV1,
  evaluateDynamicMechanicalSupportHydraulicsV1,
  restoreDynamicMechanicalSupportAcceptedStateV1,
  validateDynamicMechanicalSupportAcceptedStateV1,
  type DynamicMechanicalSupportAcceptedStateV1,
  type DynamicMechanicalSupportHydraulicInputV1,
  type DynamicMechanicalSupportInertanceProfileV1,
} from "@/engine/devices/dynamicNetworkV1";
import {
  DYNAMIC_ROTARY_PUMP_UNIT_SYSTEM_V1_ID,
  type DynamicRotaryPumpCircuitInertanceV1,
} from "@/engine/devices/dynamicRotaryPumpV1";
import {
  compensatedMechanicalSupportNodeSumV1,
  mechanicalSupportConservationToleranceMlPerSecV1,
  mechanicalSupportNodeRatesAreConservativeV1,
} from "@/engine/devices/mechanicalSupportConservationV1";
import { evaluateMechanicalSupportHydraulicsV1 } from
  "@/engine/devices/networkV1";
import {
  MECHANICAL_SUPPORT_NODE_NAMES_V1,
  ROTARY_SUPPORT_DEVICE_IDS_V1,
  type MechanicalSupportConfigV1,
  type MechanicalSupportNodeNameV1,
  type RotaryPumpEvaluationV1,
  type RotarySupportDeviceIdV1,
} from "@/engine/devices/typesV1";

const BINDING_SHA = "a".repeat(64);
const ZERO_INERTANCE = inertance();

const HYDRAULIC_INPUT = Object.freeze({
  dtSec: 0.01,
  timeSec: 1,
  cyclePhase01: 0.5,
  beatIndex: 1,
  heartRateBpm: 60,
  nodeAbsolutePressureMmHg: Object.freeze({
    LV: 10,
    Ao: 80,
    SA: 75,
    RA: 4,
    VC: 6,
  }),
  nodeVolumeMl: Object.freeze({
    LV: 100,
    Ao: 100,
    SA: 800,
    RA: 100,
    VC: 600,
  }),
}) satisfies DynamicMechanicalSupportHydraulicInputV1;

describe("dynamic four-device mechanical-support network V1", () => {
  it("reuses admitted immutable binding shapes while stamp-disabled restores retain full checks", () => {
    const mode = validationStampModeV1();
    const config = createMechanicalSupportConfigV1();
    const profile = profileWith(inertance());
    const expected = createDynamicMechanicalSupportAcceptedStateV1(profile, config);
    const detached = Object.freeze({ ...expected, acceptedFlowMlPerSec: Object.freeze({
      LVAD: 1, IMPELLA: 2, VA_ECMO: 3, VV_ECMO: 4,
    }) });
    let keys: ReturnType<typeof vi.spyOn> | undefined;
    try {
      selectValidationStampModeV1("validation-stamps-enabled");
      const first = restoreDynamicMechanicalSupportAcceptedStateV1(detached, expected);
      keys = vi.spyOn(Reflect, "ownKeys");
      const second = restoreDynamicMechanicalSupportAcceptedStateV1(detached, expected);
      expect(second).toEqual(first);
      expect(keys.mock.calls.some(([value]) => value === expected.structuralHydraulicProjection)).toBe(false);
      selectValidationStampModeV1("validation-stamps-disabled");
      expect(restoreDynamicMechanicalSupportAcceptedStateV1(detached, expected)).toEqual(first);
      expect(keys.mock.calls.some(([value]) => value === expected.structuralHydraulicProjection)).toBe(true);
      expect(() => validateDynamicMechanicalSupportAcceptedStateV1(detached, profile, config))
        .toThrow(/live factory provenance/);
    } finally { keys?.mockRestore(); selectValidationStampModeV1(mode); }
  });

  it("does not reuse a shallow-frozen mutable structural binding after nested edits", () => {
    const mode = validationStampModeV1();
    try {
      selectValidationStampModeV1("validation-stamps-enabled");
      const expected = createDynamicMechanicalSupportAcceptedStateV1(profileWith(inertance()), createMechanicalSupportConfigV1());
      const structural = Object.freeze(JSON.parse(JSON.stringify(expected.structuralHydraulicProjection)));
      const candidate = Object.freeze({ ...expected, structuralHydraulicProjection: structural });
      expect(restoreDynamicMechanicalSupportAcceptedStateV1(candidate, expected)).toEqual(expected);
      structural.byDevice.LVAD.maximumReverseFlowLMin += 1;
      expect(() => restoreDynamicMechanicalSupportAcceptedStateV1(candidate, expected))
        .toThrow(/structural hydraulic content mismatch/);
      structural.byDevice.LVAD.maximumReverseFlowLMin = NaN;
      expect(() => restoreDynamicMechanicalSupportAcceptedStateV1(candidate, expected)).toThrow(/finite/);
    } finally { selectValidationStampModeV1(mode); }
  });

  it("rejects a copied state with mutable flow descendants before proof issuance", () => {
    const config = createMechanicalSupportConfigV1();
    const profile = profileWith(inertance({
      pumpInternalMmHgSec2PerMl: 0.1,
    }));
    const accepted = acceptedWith(config, profile, {
      LVAD: 0,
      IMPELLA: 0,
      VA_ECMO: 0,
      VV_ECMO: 0,
    });
    const mutableFlows = { ...accepted.acceptedFlowMlPerSec };
    const copied = Object.freeze({
      ...accepted,
      acceptedFlowMlPerSec: mutableFlows,
    }) as DynamicMechanicalSupportAcceptedStateV1;

    expect(() => validateDynamicMechanicalSupportAcceptedStateV1(
      copied,
      profile,
      config,
    )).toThrow(/lacks live factory provenance/);
  });

  it("matches the legacy all-off network exactly and canonicalizes disabled flow", () => {
    const config = createMechanicalSupportConfigV1();
    const profile = profileWith(inertance({ pumpInternalMmHgSec2PerMl: 0.1 }));
    const previous = acceptedWith(config, profile, {
      LVAD: 11,
      IMPELLA: -2,
      VA_ECMO: 17,
      VV_ECMO: 23,
    });
    const previousSnapshot = JSON.parse(JSON.stringify(previous));
    const dynamic = evaluateDynamicMechanicalSupportHydraulicsV1(
      config,
      profile,
      previous,
      HYDRAULIC_INPUT,
    );
    const legacy = evaluateMechanicalSupportHydraulicsV1(
      config,
      legacyInput(HYDRAULIC_INPUT),
    );

    expect(dynamic.networkId).toBe(DYNAMIC_MECHANICAL_SUPPORT_NETWORK_V1_ID);
    expect(dynamic.nodeNetVolumeRateMlPerSec)
      .toEqual(legacy.nodeNetVolumeRateMlPerSec);
    expect(dynamic.iabp).toEqual(legacy.iabp);
    expect(dynamic.totalLeftHeartBypassFlowLMin)
      .toBe(legacy.totalLeftHeartBypassFlowLMin);
    expect(dynamic.totalExtracorporealFlowLMin)
      .toBe(legacy.totalExtracorporealFlowLMin);
    expect(dynamic.conservationResidualMlPerSec)
      .toBe(legacy.conservationResidualMlPerSec);
    expect(dynamic.candidateAcceptedState.acceptedFlowMlPerSec).toEqual({
      LVAD: 0,
      IMPELLA: 0,
      VA_ECMO: 0,
      VV_ECMO: 0,
    });
    for (const deviceId of ROTARY_SUPPORT_DEVICE_IDS_V1) {
      expect(dynamic.pump[deviceId].constraintOwner).toBe("disabled");
      expect(dynamic.pump[deviceId].previousAcceptedFlowMlPerSec)
        .toBe(previous.acceptedFlowMlPerSec[deviceId]);
    }
    expect(previous).toEqual(previousSnapshot);
  });

  it("reuses immutable zero network storage after all disabled flows settle", () => {
    const config = createMechanicalSupportConfigV1();
    const profile = profileWith(inertance({ pumpInternalMmHgSec2PerMl: 0.1 }));
    const previous = acceptedWith(config, profile, {
      LVAD: 0,
      IMPELLA: 0,
      VA_ECMO: 0,
      VV_ECMO: 0,
    });
    const first = evaluateDynamicMechanicalSupportHydraulicsV1(
      config,
      profile,
      previous,
      HYDRAULIC_INPUT,
    );
    const second = evaluateDynamicMechanicalSupportHydraulicsV1(
      config,
      profile,
      previous,
      withNodePressure(HYDRAULIC_INPUT, "Ao", 20),
    );

    expect(first.candidateAcceptedState).toBe(previous);
    expect(second.candidateAcceptedState).toBe(previous);
    expect(second.nodeNetVolumeRateMlPerSec)
      .toBe(first.nodeNetVolumeRateMlPerSec);
    expect(second.dNodeNetVolumeRateDNodePressureMlPerSecPerMmHg)
      .toBe(first.dNodeNetVolumeRateDNodePressureMlPerSecPerMmHg);
    expect(second.dNodeNetVolumeRateDPreviousDeviceFlow)
      .toBe(first.dNodeNetVolumeRateDPreviousDeviceFlow);
    expect(second.pump.LVAD.outletPressureMmHg).toBe(100);
    expect(second.pump.LVAD.pressureRiseRequiredMmHg)
      .not.toBe(first.pump.LVAD.pressureRiseRequiredMmHg);
  });

  it("routes a mixed dynamic network conservatively from one immutable q_n record", () => {
    const config = mixedConfig();
    const profile = profileWith(inertance({
      pumpInternalMmHgSec2PerMl: 0.04,
      drainageMmHgSec2PerMl: 0.02,
      oxygenatorMmHgSec2PerMl: 0.01,
      returnPathMmHgSec2PerMl: 0.03,
    }));
    const previousFlows = Object.freeze({
      LVAD: 40,
      IMPELLA: 20,
      VA_ECMO: 60,
      VV_ECMO: 30,
    });
    const previous = acceptedWith(config, profile, previousFlows);
    const input = Object.freeze({
      ...HYDRAULIC_INPUT,
      nodeVolumeMl: Object.freeze({
        ...HYDRAULIC_INPUT.nodeVolumeMl,
        LV: 35,
      }),
    });
    const result = evaluateDynamicMechanicalSupportHydraulicsV1(
      config,
      profile,
      previous,
      input,
    );
    const routed = (deviceId: RotarySupportDeviceIdV1) =>
      result.pump[deviceId].flowLMin * 1000 / 60;

    for (const deviceId of ROTARY_SUPPORT_DEVICE_IDS_V1) {
      expect(result.pump[deviceId].previousAcceptedFlowMlPerSec)
        .toBe(previousFlows[deviceId]);
      expect(result.candidateAcceptedState.acceptedFlowMlPerSec[deviceId])
        .toBe(result.pump[deviceId].flowMlPerSec);
      expect(result.constraintReactionMmHgByDevice[deviceId])
        .toBe(result.pump[deviceId].constraintReactionMmHg);
      expect(result.constraintImpulseMmHgSecByDevice[deviceId])
        .toBe(result.pump[deviceId].constraintReactionMmHg * input.dtSec);
      expect(result.deviceProfileBindingByDevice[deviceId].deviceId)
        .toBe(deviceId);
    }
    expect(new Set(ROTARY_SUPPORT_DEVICE_IDS_V1.map((deviceId) =>
      result.deviceProfileBindingByDevice[deviceId]
        .circuitProfileBindingSha256)).size).toBe(4);
    expect(Object.values(result.constraintImpulseMmHgSecByDevice)
      .some((impulse) => Math.abs(impulse) > 0)).toBe(true);
    expect(result.nodeNetVolumeRateMlPerSec.LV)
      .toBeCloseTo(-routed("LVAD") - routed("IMPELLA"), 12);
    expect(result.nodeNetVolumeRateMlPerSec.Ao)
      .toBeCloseTo(
        routed("LVAD") + routed("IMPELLA") + routed("VA_ECMO"),
        12,
      );
    expect(result.nodeNetVolumeRateMlPerSec.RA)
      .toBeCloseTo(routed("VV_ECMO") - routed("VA_ECMO"), 12);
    expect(result.nodeNetVolumeRateMlPerSec.VC)
      .toBeCloseTo(-routed("VV_ECMO"), 12);
    expect(result.nodeNetVolumeRateMlPerSec.SA).toBe(0);
    expect(result.conservationResidualMlPerSec).toBeCloseTo(0, 12);
    expect(mechanicalSupportNodeRatesAreConservativeV1(
      result.nodeNetVolumeRateMlPerSec,
      result.conservationResidualMlPerSec,
    )).toBe(true);
    const toleranceMlPerSec =
      mechanicalSupportConservationToleranceMlPerSecV1(
        result.nodeNetVolumeRateMlPerSec,
      );
    const deliberatelyImbalancedNodeRates = Object.freeze({
      ...result.nodeNetVolumeRateMlPerSec,
      SA: result.nodeNetVolumeRateMlPerSec.SA + 2 * toleranceMlPerSec,
    });
    expect(mechanicalSupportNodeRatesAreConservativeV1(
      deliberatelyImbalancedNodeRates,
      compensatedMechanicalSupportNodeSumV1(
        deliberatelyImbalancedNodeRates,
      ),
    )).toBe(false);
    expectConservativeJacobians(result);

    const pressureDerivative = centralDifference(
      (delta) => evaluateDynamicMechanicalSupportHydraulicsV1(
        config,
        profile,
        previous,
        withNodePressure(input, "LV", delta),
      ).nodeNetVolumeRateMlPerSec,
      1e-5,
    );
    const volumeDerivative = centralDifference(
      (delta) => evaluateDynamicMechanicalSupportHydraulicsV1(
        config,
        profile,
        previous,
        withNodeVolume(input, "LV", delta),
      ).nodeNetVolumeRateMlPerSec,
      1e-5,
    );
    for (const node of MECHANICAL_SUPPORT_NODE_NAMES_V1) {
      expect(pressureDerivative[node])
        .toBeCloseTo(
          result.dNodeNetVolumeRateDNodePressureMlPerSecPerMmHg[node].LV,
          7,
        );
      expect(volumeDerivative[node])
        .toBeCloseTo(
          result.dNodeNetVolumeRateDNodeVolumePerSec[node].LV,
          7,
        );
    }
  });

  it("recovers the complete legacy algebraic network when every inertance is zero", () => {
    const config = mixedConfig();
    const profile = profileWith(ZERO_INERTANCE);
    const previous = acceptedWith(config, profile, {
      LVAD: -100,
      IMPELLA: 250,
      VA_ECMO: 10,
      VV_ECMO: -7,
    });
    const dynamic = evaluateDynamicMechanicalSupportHydraulicsV1(
      config,
      profile,
      previous,
      HYDRAULIC_INPUT,
    );
    const legacy = evaluateMechanicalSupportHydraulicsV1(
      config,
      legacyInput(HYDRAULIC_INPUT),
    );

    expect(dynamic.nodeNetVolumeRateMlPerSec)
      .toEqual(legacy.nodeNetVolumeRateMlPerSec);
    expect(dynamic.iabp).toEqual(legacy.iabp);
    expect(dynamic.totalLeftHeartBypassFlowLMin)
      .toBe(legacy.totalLeftHeartBypassFlowLMin);
    expect(dynamic.totalExtracorporealFlowLMin)
      .toBe(legacy.totalExtracorporealFlowLMin);
    expect(dynamic.conservationResidualMlPerSec)
      .toBe(legacy.conservationResidualMlPerSec);
    for (const deviceId of ROTARY_SUPPORT_DEVICE_IDS_V1) {
      expectLegacyPumpParity(dynamic.pump[deviceId], legacy.pump[deviceId]);
    }
  });

  it("is retry-pure and does not promote any per-device candidate on trial", () => {
    const config = mixedConfig();
    const profile = profileWith(inertance({
      pumpInternalMmHgSec2PerMl: 0.08,
    }));
    const previous = acceptedWith(config, profile, {
      LVAD: 11,
      IMPELLA: 12,
      VA_ECMO: 13,
      VV_ECMO: 14,
    });
    const snapshot = JSON.parse(JSON.stringify(previous));
    const first = evaluateDynamicMechanicalSupportHydraulicsV1(
      config,
      profile,
      previous,
      HYDRAULIC_INPUT,
    );
    evaluateDynamicMechanicalSupportHydraulicsV1(
      config,
      profile,
      previous,
      withNodePressure(HYDRAULIC_INPUT, "Ao", 20),
    );
    const retry = evaluateDynamicMechanicalSupportHydraulicsV1(
      config,
      profile,
      previous,
      HYDRAULIC_INPUT,
    );

    expect(retry).toEqual(first);
    expect(previous).toEqual(snapshot);
    expect(Object.isFrozen(previous)).toBe(true);
    expect(Object.isFrozen(previous.acceptedFlowMlPerSec)).toBe(true);
    expect(Object.isFrozen(previous.inertanceProfileSnapshot)).toBe(true);
    expect(Object.isFrozen(
      previous.inertanceProfileSnapshot.inertanceByDevice.LVAD,
    )).toBe(true);
    expect(Object.isFrozen(previous.structuralHydraulicProjection)).toBe(true);
    expect(Object.isFrozen(
      previous.structuralHydraulicProjection.byDevice.LVAD.curve,
    )).toBe(true);
    expect(previous.inertanceProfileSnapshot).not.toBe(profile);
    expect(previous.structuralHydraulicProjection.byDevice.LVAD.curve)
      .not.toBe(config.lvad.curve);
    expect(Object.isFrozen(first.candidateAcceptedState)).toBe(true);
    expect(first.candidateAcceptedState).not.toBe(previous);
    expect(first.candidateAcceptedState.stateSchemaId)
      .toBe(DYNAMIC_MECHANICAL_SUPPORT_ACCEPTED_STATE_V1_ID);
  });

  it("binds structural hydraulics while permitting only declared runtime commands", () => {
    const config = mixedConfig();
    const profile = profileWith(inertance({
      pumpInternalMmHgSec2PerMl: 0.04,
      drainageMmHgSec2PerMl: 0.02,
    }));
    const previous = acceptedWith(config, profile, {
      LVAD: 20,
      IMPELLA: 0,
      VA_ECMO: 0,
      VV_ECMO: 0,
    });
    const evaluate = (trialConfig: MechanicalSupportConfigV1) =>
      evaluateDynamicMechanicalSupportHydraulicsV1(
        trialConfig,
        profile,
        previous,
        HYDRAULIC_INPUT,
      );
    const lvadInletSuction = config.lvad.inletSuction;
    if (lvadInletSuction.kind !== "legacy-smooth-availability") {
      throw new Error("mixed test config must use legacy LVAD inlet suction");
    }
    const structuralSubstitutions: MechanicalSupportConfigV1[] = [
      Object.freeze({
        ...config,
        lvad: Object.freeze({
          ...config.lvad,
          curve: Object.freeze({
            ...config.lvad.curve,
            shutoffHeadMmHg: config.lvad.curve.shutoffHeadMmHg + 1,
          }),
        }),
      }),
      Object.freeze({
        ...config,
        lvad: Object.freeze({
          ...config.lvad,
          drainage: Object.freeze({
            ...config.lvad.drainage,
            linearResistanceMmHgSecPerMl:
              config.lvad.drainage.linearResistanceMmHgSecPerMl + 0.001,
          }),
        }),
      }),
      Object.freeze({
        ...config,
        vaEcmo: Object.freeze({
          ...config.vaEcmo,
          cannulation: "peripheral" as const,
          inletNode: "VC" as const,
          outletNode: "SA" as const,
        }),
      }),
      Object.freeze({
        ...config,
        lvad: Object.freeze({
          ...config.lvad,
          inletSuction: Object.freeze({
            ...lvadInletSuction,
            collapsePressureMmHg:
              lvadInletSuction.collapsePressureMmHg - 1,
          }),
        }),
      }),
      Object.freeze({
        ...config,
        lvad: Object.freeze({
          ...config.lvad,
          maximumForwardFlowLMin:
            (config.lvad.maximumForwardFlowLMin ?? 0) + 1,
        }),
      }),
      Object.freeze({
        ...config,
        lvad: Object.freeze({
          ...config.lvad,
          forwardFlowEvidenceDomain: Object.freeze({
            publishedExperimentalTraversalUpperLMin: 9,
            advertisedCapacityLMin: 10,
          }),
        }),
      }),
    ];
    for (const substituted of structuralSubstitutions) {
      expect(() => evaluate(substituted)).toThrow(/structural hydraulic config mismatch/);
    }

    const baseline = evaluate(config);
    const speedCommand = Object.freeze({
      ...config,
      lvad: Object.freeze({ ...config.lvad, speedRpm: 6_500 }),
      impella: Object.freeze({ ...config.impella, performanceLevel: 3 as const }),
    });
    const faster = evaluate(speedCommand);
    expect(faster.pump.LVAD.speedRpm).toBe(6_500);
    expect(faster.pump.LVAD.flowMlPerSec).not.toBe(baseline.pump.LVAD.flowMlPerSec);

    const disabledCommand = Object.freeze({
      ...config,
      lvad: Object.freeze({
        ...config.lvad,
        enabled: false,
        circuitClamped: true,
        speedRpm: 0,
      }),
    });
    const disabled = evaluate(disabledCommand);
    expect(disabled.pump.LVAD.constraintOwner).toBe("disabled");
    expect(disabled.pump.LVAD.flowMlPerSec).toBe(0);
  });

  it("fails closed on malformed state, profile, units, dt, and node records", () => {
    const config = mixedConfig();
    const profile = profileWith(inertance({
      pumpInternalMmHgSec2PerMl: 0.08,
    }));
    const previous = acceptedWith(config, profile, {
      LVAD: 11,
      IMPELLA: 12,
      VA_ECMO: 13,
      VV_ECMO: 14,
    });
    const snapshot = JSON.parse(JSON.stringify(previous));
    const evaluate = (
      state: DynamicMechanicalSupportAcceptedStateV1,
      trialProfile = profile,
      input: DynamicMechanicalSupportHydraulicInputV1 = HYDRAULIC_INPUT,
    ) => evaluateDynamicMechanicalSupportHydraulicsV1(
      config,
      trialProfile,
      state,
      input,
    );

    const sameClaimAlteredProfile = createDynamicMechanicalSupportInertanceProfileV1({
      profileId: profile.profileId,
      profileBindingSha256: profile.profileBindingSha256,
      deviceProfileBindingByDevice: profile.deviceProfileBindingByDevice,
      inertanceByDevice: Object.freeze({
        ...profile.inertanceByDevice,
        LVAD: inertance({ pumpInternalMmHgSec2PerMl: 0.8 }),
      }),
    });
    expect(() => evaluate(previous, sameClaimAlteredProfile))
      .toThrow(/profile content mismatch/);
    expect(() => evaluate({
      ...previous,
      acceptedFlowMlPerSec: {
        LVAD: 1,
        IMPELLA: 2,
        VA_ECMO: 3,
      },
    } as unknown as DynamicMechanicalSupportAcceptedStateV1))
      .toThrow(/exact expected key set/);
    expect(() => evaluate({
      ...previous,
      unexpected: true,
    } as unknown as DynamicMechanicalSupportAcceptedStateV1))
      .toThrow(/exact expected key set/);
    expect(() => evaluate(previous, {
      ...profile,
      unitSystemId: "wrong-unit",
    } as unknown as DynamicMechanicalSupportInertanceProfileV1))
      .toThrow(/identity mismatch/);
    expect(() => evaluate(previous, profile, {
      ...HYDRAULIC_INPUT,
      dtSec: 0,
    })).toThrow(/dtSec must be positive/);
    expect(() => evaluate(previous, profile, {
      ...HYDRAULIC_INPUT,
      nodeAbsolutePressureMmHg: {
        ...HYDRAULIC_INPUT.nodeAbsolutePressureMmHg,
        LV: Number.NaN,
      },
    })).toThrow(/LV pressure must be finite/);
    expect(() => evaluate(previous, profile, {
      ...HYDRAULIC_INPUT,
      nodeAbsolutePressureMmHg: {
        ...HYDRAULIC_INPUT.nodeAbsolutePressureMmHg,
        unexpected: 1,
      },
    } as unknown as DynamicMechanicalSupportHydraulicInputV1))
      .toThrow(/exact expected key set/);
    const mismatchedBindings = deviceBindings();
    expect(() => createDynamicMechanicalSupportInertanceProfileV1({
      profileId: "wrong-device-binding",
      profileBindingSha256: BINDING_SHA,
      deviceProfileBindingByDevice: {
        ...mismatchedBindings,
        IMPELLA: mismatchedBindings.LVAD,
      },
      inertanceByDevice: {
        LVAD: ZERO_INERTANCE,
        IMPELLA: ZERO_INERTANCE,
        VA_ECMO: ZERO_INERTANCE,
        VV_ECMO: ZERO_INERTANCE,
      },
    })).toThrow(/IMPELLA belongs to LVAD/);
    expect(() => createDynamicMechanicalSupportInertanceProfileV1({
      profileId: "extra-profile-key",
      profileBindingSha256: BINDING_SHA,
      deviceProfileBindingByDevice: deviceBindings(),
      inertanceByDevice: {
        LVAD: ZERO_INERTANCE,
        IMPELLA: ZERO_INERTANCE,
        VA_ECMO: ZERO_INERTANCE,
        VV_ECMO: ZERO_INERTANCE,
      },
      unexpected: true,
    } as unknown as Parameters<
      typeof createDynamicMechanicalSupportInertanceProfileV1
    >[0])).toThrow(/exact expected key set/);
    expect(() => createDynamicMechanicalSupportInertanceProfileV1({
      profileId: "extra-inertance-key",
      profileBindingSha256: BINDING_SHA,
      deviceProfileBindingByDevice: deviceBindings(),
      inertanceByDevice: {
        LVAD: {
          ...ZERO_INERTANCE,
          unexpected: 0,
        },
        IMPELLA: ZERO_INERTANCE,
        VA_ECMO: ZERO_INERTANCE,
        VV_ECMO: ZERO_INERTANCE,
      },
    } as unknown as Parameters<
      typeof createDynamicMechanicalSupportInertanceProfileV1
    >[0])).toThrow(/exact expected key set/);
    expect(() => createDynamicMechanicalSupportInertanceProfileV1({
      profileId: "malformed",
      profileBindingSha256: BINDING_SHA,
      deviceProfileBindingByDevice: deviceBindings(),
      inertanceByDevice: {
        LVAD: ZERO_INERTANCE,
        IMPELLA: ZERO_INERTANCE,
        VA_ECMO: ZERO_INERTANCE,
        VV_ECMO: {
          ...ZERO_INERTANCE,
          pumpInternalMmHgSec2PerMl: Number.NaN,
        },
      },
    })).toThrow(/must be finite/);
    expect(previous).toEqual(snapshot);
  });
});

function mixedConfig(): MechanicalSupportConfigV1 {
  return createMechanicalSupportConfigV1({
    lvad: { enabled: true, speedRpm: 5_200 },
    impella: { enabled: true, performanceLevel: 7 },
    vaEcmo: { enabled: true, speedRpm: 3_500, cannulation: "central" },
    vvEcmo: {
      enabled: true,
      speedRpm: 3_500,
      hemodynamicCoupling: "bicaval-pressure-resolved",
    },
    iabp: { enabled: true },
  });
}

function profileWith(
  sameInertance: DynamicRotaryPumpCircuitInertanceV1,
): DynamicMechanicalSupportInertanceProfileV1 {
  return createDynamicMechanicalSupportInertanceProfileV1({
    profileId: "network-test-profile-v1",
    profileBindingSha256: BINDING_SHA,
    deviceProfileBindingByDevice: deviceBindings(),
    inertanceByDevice: {
      LVAD: sameInertance,
      IMPELLA: sameInertance,
      VA_ECMO: sameInertance,
      VV_ECMO: sameInertance,
    },
  });
}

function deviceBindings() {
  return Object.freeze({
    LVAD: createDynamicMechanicalSupportDeviceProfileBindingV1({
      deviceId: "LVAD",
      circuitProfileId: "synthetic-test-lvad-v1-not-release-approved",
      circuitProfileBindingSha256: "1".repeat(64),
    }),
    IMPELLA: createDynamicMechanicalSupportDeviceProfileBindingV1({
      deviceId: "IMPELLA",
      circuitProfileId: "synthetic-test-impella-v1-not-release-approved",
      circuitProfileBindingSha256: "2".repeat(64),
    }),
    VA_ECMO: createDynamicMechanicalSupportDeviceProfileBindingV1({
      deviceId: "VA_ECMO",
      circuitProfileId: "synthetic-test-va-ecmo-v1-not-release-approved",
      circuitProfileBindingSha256: "3".repeat(64),
    }),
    VV_ECMO: createDynamicMechanicalSupportDeviceProfileBindingV1({
      deviceId: "VV_ECMO",
      circuitProfileId: "synthetic-test-vv-ecmo-v1-not-release-approved",
      circuitProfileBindingSha256: "4".repeat(64),
    }),
  });
}

function acceptedWith(
  config: MechanicalSupportConfigV1,
  profile: DynamicMechanicalSupportInertanceProfileV1,
  acceptedFlowMlPerSec: Readonly<Record<RotarySupportDeviceIdV1, number>>,
): DynamicMechanicalSupportAcceptedStateV1 {
  return createDynamicMechanicalSupportAcceptedStateV1(
    profile,
    config,
    acceptedFlowMlPerSec,
  );
}

function inertance(
  overrides: Partial<DynamicRotaryPumpCircuitInertanceV1> = {},
): DynamicRotaryPumpCircuitInertanceV1 {
  return Object.freeze({
    unitSystemId: DYNAMIC_ROTARY_PUMP_UNIT_SYSTEM_V1_ID,
    pumpInternalMmHgSec2PerMl: 0,
    drainageMmHgSec2PerMl: 0,
    oxygenatorMmHgSec2PerMl: 0,
    returnPathMmHgSec2PerMl: 0,
    ...overrides,
  });
}

function legacyInput(input: DynamicMechanicalSupportHydraulicInputV1) {
  const { dtSec: _dtSec, ...legacy } = input;
  return legacy;
}

function withNodePressure(
  input: DynamicMechanicalSupportHydraulicInputV1,
  node: MechanicalSupportNodeNameV1,
  delta: number,
): DynamicMechanicalSupportHydraulicInputV1 {
  return Object.freeze({
    ...input,
    nodeAbsolutePressureMmHg: Object.freeze({
      ...input.nodeAbsolutePressureMmHg,
      [node]: input.nodeAbsolutePressureMmHg[node] + delta,
    }),
  });
}

function withNodeVolume(
  input: DynamicMechanicalSupportHydraulicInputV1,
  node: MechanicalSupportNodeNameV1,
  delta: number,
): DynamicMechanicalSupportHydraulicInputV1 {
  if (input.nodeVolumeMl?.[node] === undefined) {
    throw new Error(`test input has no ${node} volume`);
  }
  return Object.freeze({
    ...input,
    nodeVolumeMl: Object.freeze({
      ...input.nodeVolumeMl,
      [node]: input.nodeVolumeMl[node]! + delta,
    }),
  });
}

function centralDifference(
  evaluate: (delta: number) => Readonly<Record<
    MechanicalSupportNodeNameV1,
    number
  >>,
  epsilon: number,
): Readonly<Record<MechanicalSupportNodeNameV1, number>> {
  const plus = evaluate(epsilon);
  const minus = evaluate(-epsilon);
  return Object.freeze(Object.fromEntries(
    MECHANICAL_SUPPORT_NODE_NAMES_V1.map((node) => [
      node,
      (plus[node] - minus[node]) / (2 * epsilon),
    ]),
  )) as Readonly<Record<MechanicalSupportNodeNameV1, number>>;
}

function expectConservativeJacobians(
  result: ReturnType<typeof evaluateDynamicMechanicalSupportHydraulicsV1>,
): void {
  for (const node of MECHANICAL_SUPPORT_NODE_NAMES_V1) {
    expect(result.pressureJacobianConservationResidualMlPerSecPerMmHg[node])
      .toBeCloseTo(0, 14);
    expect(result.volumeJacobianConservationResidualPerSec[node])
      .toBeCloseTo(0, 14);
  }
  for (const deviceId of ROTARY_SUPPORT_DEVICE_IDS_V1) {
    expect(result.previousFlowJacobianConservationResidual[deviceId])
      .toBeCloseTo(0, 14);
  }
}

function expectLegacyPumpParity(
  dynamic: ReturnType<
    typeof evaluateDynamicMechanicalSupportHydraulicsV1
  >["pump"][RotarySupportDeviceIdV1],
  legacy: RotaryPumpEvaluationV1,
): void {
  expect(dynamic.enabled).toBe(legacy.enabled);
  expect(dynamic.circuitClamped).toBe(legacy.circuitClamped);
  expect(dynamic.inletCollapseActive).toBe(legacy.inletCollapseActive);
  const numericFields = [
    "speedRpm",
    "inletPressureMmHg",
    "outletPressureMmHg",
    "pressureRiseRequiredMmHg",
    "idealPumpHeadMmHg",
    "flowLMin",
    "unrestrictedFlowLMin",
    "dFlowMlPerSecDInletPressureMlPerSecPerMmHg",
    "dFlowMlPerSecDOutletPressureMlPerSecPerMmHg",
    "dFlowMlPerSecDInletVolumePerSec",
    "inletAvailability01",
    "drainagePressureDropMmHg",
    "oxygenatorPressureDropMmHg",
    "returnPathPressureDropMmHg",
    "prePumpPressureMmHg",
    "postPumpPressureMmHg",
    "postOxygenatorPressureMmHg",
    "flowLimitPressureReactionMmHg",
    "hydraulicResidualMmHg",
  ] as const;
  for (const field of numericFields) {
    expect(dynamic[field], field).toBe(legacy[field]);
  }
}
